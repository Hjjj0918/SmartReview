from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
import shutil
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any
from uuid import uuid4

import fitz  # PyMuPDF
import requests
from fastapi import Body, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from filelock import FileLock, Timeout

DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
DEFAULT_DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")
DEFAULT_DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")

MAX_PDF_MB = int(os.getenv("SMARTREVIEW_MAX_PDF_MB", "25"))
MAX_IMAGE_MB = int(os.getenv("SMARTREVIEW_MAX_IMAGE_MB", "10"))
MAX_CONTEXT_CHARS = int(os.getenv("SMARTREVIEW_MAX_CONTEXT_CHARS", "120000"))

MAX_GENERATED_QUESTIONS = int(os.getenv("SMARTREVIEW_MAX_GENERATED_QUESTIONS", "50"))


SCHEMA_VERSION = 2
COURSE_FILE_NAME = "course.json"
DEFAULT_CHAPTER_TITLE = os.getenv("SMARTREVIEW_DEFAULT_CHAPTER_TITLE", "General")
DATA_DIR = Path(__file__).resolve().parent / "data"

_WRITE_LOCK_FILENAME = ".smartreview.lock"
_WRITE_LOCK_TIMEOUT_SEC = 1.0


def _error_payload(
    message: str,
    *,
    status_code: int,
    details: Any | None = None,
) -> dict[str, Any]:
    error: dict[str, Any] = {"message": message, "status_code": status_code}
    if details is not None:
        error["details"] = details
    return {"error": error}


def _coerce_error_message(detail: Any) -> str:
    if isinstance(detail, str) and detail.strip():
        return detail.strip()
    if isinstance(detail, dict):
        message = detail.get("message")
        if isinstance(message, str) and message.strip():
            return message.strip()
        try:
            return json.dumps(detail, ensure_ascii=False)
        except Exception:
            return str(detail)
    return str(detail)


@contextmanager
def _data_write_lock(*, timeout_sec: float = _WRITE_LOCK_TIMEOUT_SEC) -> Iterator[None]:
    """Serialize writes under DATA_DIR to avoid lost updates across requests/workers."""

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    lock_path = DATA_DIR / _WRITE_LOCK_FILENAME
    lock = FileLock(str(lock_path))
    try:
        lock.acquire(timeout=timeout_sec)
    except Timeout as exc:
        raise HTTPException(status_code=503, detail="Library is busy, please retry.") from exc

    try:
        yield
    finally:
        lock.release()


def _atomic_write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    tmp_path.replace(path)


def _normalize_key(value: str) -> str:
    return re.sub(r"[\s\-–—_]+", "", (value or "").strip()).casefold()


def _course_dir(course_id: str) -> Path:
    return DATA_DIR / course_id


def _course_file_path(course_id: str) -> Path:
    return _course_dir(course_id) / COURSE_FILE_NAME


def _iter_course_files() -> list[Path]:
    if not DATA_DIR.exists():
        return []
    return sorted(DATA_DIR.glob(f"*/{COURSE_FILE_NAME}"))


def _load_json_file(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _save_course(course: dict[str, Any]) -> None:
    course_id = str(course.get("course_id") or "").strip()
    if not course_id:
        raise ValueError("course_id is required")
    _atomic_write_json(_course_file_path(course_id), course)


def _new_chapter(*, chapter_title: str) -> dict[str, Any]:
    return {
        "chapter_id": str(uuid4()),
        "chapter_title": chapter_title.strip(),
        "questions": [],
    }


def _new_course(*, course_name: str) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "course_id": str(uuid4()),
        "course_name": course_name.strip(),
        "chapters": [],
    }


def _course_question_count(course: dict[str, Any]) -> int:
    chapters = course.get("chapters") or []
    if not isinstance(chapters, list):
        return 0
    total = 0
    for ch in chapters:
        if not isinstance(ch, dict):
            continue
        questions = ch.get("questions") or []
        if isinstance(questions, list):
            total += len(questions)
    return total


def _find_course_by_name(course_name: str) -> tuple[Path, dict[str, Any]] | None:
    target = _normalize_key(course_name)
    if not target:
        return None

    best: tuple[tuple[int, int], Path, dict[str, Any]] | None = None
    for path in _iter_course_files():
        try:
            course = _load_json_file(path)
        except Exception:
            continue
        if not isinstance(course, dict):
            continue
        existing_name = str(course.get("course_name") or "")
        existing_key = _normalize_key(existing_name)
        if not existing_key:
            continue

        # Score (smaller is better):
        #  0) exact match
        #  1) candidate key is substring of existing
        #  2) existing key is substring of candidate
        #  9) no match
        if existing_key == target:
            score = (0, 0)
        elif target in existing_key:
            score = (1, len(existing_key) - len(target))
        elif existing_key in target:
            score = (2, len(target) - len(existing_key))
        else:
            continue

        if best is None or score < best[0]:
            best = (score, path, course)

    if best is None:
        return None
    return best[1], best[2]


def _find_or_create_course(*, course_name: str) -> tuple[Path, dict[str, Any], bool]:
    existing = _find_course_by_name(course_name)
    if existing:
        path, course = existing
        return path, course, False

    course = _new_course(course_name=course_name)
    path = _course_file_path(course["course_id"])
    _save_course(course)
    return path, course, True


def _find_or_create_chapter(
    course: dict[str, Any],
    *,
    chapter_title: str,
) -> tuple[dict[str, Any], bool]:
    chapters = course.get("chapters")
    if not isinstance(chapters, list):
        chapters = []
        course["chapters"] = chapters

    target = _normalize_key(chapter_title)
    for ch in chapters:
        if not isinstance(ch, dict):
            continue
        if _normalize_key(str(ch.get("chapter_title") or "")) == target and target:
            return ch, False

    created = _new_chapter(chapter_title=chapter_title)
    chapters.append(created)
    return created, True


def _max_question_id(course: dict[str, Any]) -> int:
    max_id = 0
    for ch in course.get("chapters") or []:
        if not isinstance(ch, dict):
            continue
        for q in ch.get("questions") or []:
            if not isinstance(q, dict):
                continue
            try:
                max_id = max(max_id, int(q.get("id") or 0))
            except Exception:
                continue
    return max_id


_GENERIC_COURSE_CODE = re.compile(r"\b([A-Za-z]{3,6})\s*[-–—]?\s*(\d{4})\b")


def _detect_generic_course_code(text: str) -> str | None:
    if not isinstance(text, str):
        return None
    header = text.strip()[:8000]
    if not header:
        return None
    m = _GENERIC_COURSE_CODE.search(header)
    if not m:
        return None
    return f"{m.group(1).upper()}{m.group(2)}"


def _classify_course_and_chapter(*, file_content: str) -> tuple[str, str]:
    clipped = (file_content or "").strip()[:MAX_CONTEXT_CHARS]
    if not clipped:
        raise HTTPException(status_code=400, detail="file_content is empty")

    api_key = os.getenv("DEEPSEEK_API_KEY")
    base_url = os.getenv("DEEPSEEK_BASE_URL", DEFAULT_DEEPSEEK_BASE_URL)
    model = os.getenv("DEEPSEEK_MODEL", DEFAULT_DEEPSEEK_MODEL)

    hint_code = _detect_generic_course_code(clipped) or _detect_course_code_from_text(clipped)

    system = (
        "You are a librarian for course materials. "
        "Given lecture notes or study material text, extract: "
        "(1) course_name: the most likely official course code/name; "
        "(2) chapter_title: a concise chapter/topic title. "
        "Return ONLY a single JSON object with keys course_name and chapter_title."
    )
    user = (
        (f"Course code hint (if any): {hint_code}\n" if hint_code else "")
        + "Text:\n"
        + clipped
    )

    raw = _deepseek_chat_completions(
        api_key=api_key or "",
        base_url=base_url,
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.0,
    )

    try:
        parsed = _extract_json_object(raw)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Failed to parse classifier JSON: {exc}") from exc

    if not isinstance(parsed, dict):
        raise HTTPException(status_code=502, detail="Classifier output must be a JSON object")

    course_name = parsed.get("course_name")
    chapter_title = parsed.get("chapter_title")
    if not isinstance(course_name, str) or not course_name.strip():
        # Use hint as a fallback if model returned nothing.
        if hint_code:
            course_name = hint_code
        else:
            raise HTTPException(status_code=502, detail="Classifier returned empty course_name")
    if not isinstance(chapter_title, str) or not chapter_title.strip():
        raise HTTPException(status_code=502, detail="Classifier returned empty chapter_title")

    return course_name.strip(), chapter_title.strip()


def process_new_file(file_content: str) -> dict[str, str]:
    """Smart sort a new file into Course -> Chapter.

    - Calls LLM to extract course_name and chapter_title
    - Finds/creates the course folder under data/
    - Finds/creates the chapter entry under that course
    """

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    course_name, chapter_title = _classify_course_and_chapter(file_content=file_content)

    with _data_write_lock():
        course_path, course, _ = _find_or_create_course(course_name=course_name)
        chapter, chapter_created = _find_or_create_chapter(course, chapter_title=chapter_title)
        if chapter_created:
            _atomic_write_json(course_path, course)

    return {
        "course_id": str(course.get("course_id")),
        "course_name": str(course.get("course_name")),
        "chapter_id": str(chapter.get("chapter_id")),
        "chapter_title": str(chapter.get("chapter_title")),
    }


def _bootstrap_data_dir_from_v1_questions(*, legacy_root: Path | None = None) -> None:
    """One-time import of legacy questions/<course>/questions.json into data/.

    Creates one default chapter per course so V2 can show a tree.
    """

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if _iter_course_files():
        return

    if legacy_root is None:
        legacy_root = Path(__file__).resolve().parent / "questions"
    if not legacy_root.exists():
        return

    for file_path in sorted(legacy_root.glob("*/questions.json")):
        try:
            payload = _load_json_file(file_path)
            v1 = _validate_course_data(payload)
        except Exception:
            continue

        course = _new_course(course_name=str(v1["course_name"]))
        chapter = _new_chapter(chapter_title=DEFAULT_CHAPTER_TITLE)
        chapter["questions"] = v1["questions"]
        course["chapters"].append(chapter)
        _save_course(course)


COURSE_CODE_CANDIDATES: tuple[str, ...] = (
    "ACCT1101",
    "ECON1280",
    "COMP3278",
    "COMP3314",
    "COMP3251",
    "COMP3329",
)


def _build_course_code_pattern(code: str) -> re.Pattern[str]:
    m = re.fullmatch(r"([A-Za-z]+)(\d+)", (code or "").strip())
    if not m:
        raise ValueError(f"Invalid course code: {code!r}")
    prefix, digits = m.group(1), m.group(2)

    # Allow common separators between prefix and digits in extracted PDF text.
    # Examples: COMP3251, COMP 3251, COMP-3251, COMP–3251.
    sep = r"(?:\s|[-–—])*"
    return re.compile(rf"\b{re.escape(prefix)}{sep}{re.escape(digits)}\b", flags=re.IGNORECASE)


COURSE_CODE_PATTERNS: dict[str, re.Pattern[str]] = {
    code: _build_course_code_pattern(code) for code in COURSE_CODE_CANDIDATES
}


def _detect_course_code_from_text(text: str) -> str | None:
    if not isinstance(text, str):
        return None

    haystack = text.strip()
    if not haystack:
        return None

    # PDFs often repeat headers/footers; course code usually appears in the title area.
    header = haystack[:8000]
    body = haystack[:50000]

    best_code: str | None = None
    best_key: tuple[int, int, int, int] | None = None
    # Sort key (smaller is better):
    #   1) -header_count (more matches in header is better)
    #   2) header_first_pos (earlier in header is better; large if none)
    #   3) -body_count
    #   4) body_first_pos
    for code, pattern in COURSE_CODE_PATTERNS.items():
        header_iter = list(pattern.finditer(header))
        body_iter = list(pattern.finditer(body))
        header_count = len(header_iter)
        body_count = len(body_iter)

        if header_count == 0 and body_count == 0:
            continue

        header_first = header_iter[0].start() if header_iter else 10**9
        body_first = body_iter[0].start() if body_iter else 10**9

        key = (-header_count, header_first, -body_count, body_first)
        if best_key is None or key < best_key:
            best_key = key
            best_code = code

    return best_code


app = FastAPI(title="SmartReview API", version="0.1.0")

# Dev-friendly CORS. If you use Vite proxy, CORS is not required, but keeping it helps.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def _http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:  # noqa: ARG001
    message = _coerce_error_message(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_payload(message, status_code=exc.status_code),
    )


@app.exception_handler(RequestValidationError)
async def _validation_exception_handler(
    request: Request, exc: RequestValidationError  # noqa: ARG001
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=_error_payload(
            "Invalid request.",
            status_code=422,
            details=exc.errors(),
        ),
    )


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:  # noqa: ARG001
    return JSONResponse(
        status_code=500,
        content=_error_payload("Internal server error.", status_code=500),
    )


@app.get("/api/health")
def health() -> dict[str, bool]:
    return {"ok": True}


_LIBRARY_BOOTSTRAPPED = False


def _ensure_library_bootstrapped() -> None:
    global _LIBRARY_BOOTSTRAPPED
    if _LIBRARY_BOOTSTRAPPED:
        return
    with _data_write_lock():
        if _LIBRARY_BOOTSTRAPPED:
            return
        _bootstrap_data_dir_from_v1_questions()
        _LIBRARY_BOOTSTRAPPED = True


def _build_course_summary(course: dict[str, Any]) -> dict[str, Any]:
    chapters_raw = course.get("chapters") or []
    chapters: list[dict[str, Any]] = []
    if isinstance(chapters_raw, list):
        for ch in chapters_raw:
            if not isinstance(ch, dict):
                continue
            questions = ch.get("questions") or []
            chapters.append(
                {
                    "chapter_id": str(ch.get("chapter_id") or ""),
                    "chapter_title": str(ch.get("chapter_title") or ""),
                    "question_count": len(questions) if isinstance(questions, list) else 0,
                }
            )

    return {
        "course_id": str(course.get("course_id") or ""),
        "course_name": str(course.get("course_name") or ""),
        "question_count": _course_question_count(course),
        "chapters": chapters,
    }


@app.get("/api/library/courses")
def list_courses() -> dict[str, Any]:
    _ensure_library_bootstrapped()

    courses: list[dict[str, Any]] = []
    for path in _iter_course_files():
        try:
            course = _load_json_file(path)
        except Exception:
            continue
        if not isinstance(course, dict):
            continue
        courses.append(_build_course_summary(course))

    courses.sort(key=lambda c: str(c.get("course_name") or "").casefold())
    return {"courses": courses}


@app.get("/api/library/course/{course_id}")
def get_course(course_id: str) -> dict[str, Any]:
    _ensure_library_bootstrapped()
    course_file = _course_file_path(course_id)
    if not course_file.exists():
        raise HTTPException(status_code=404, detail="Course not found")
    try:
        course = _load_json_file(course_file)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Failed to load course: {exc}") from exc
    if not isinstance(course, dict):
        raise HTTPException(status_code=500, detail="Invalid course data")
    return course


@app.post("/api/library/import-text")
def import_text(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    _ensure_library_bootstrapped()

    file_content = payload.get("fileContent")
    question_count = payload.get("questionCount", 20)

    if not isinstance(file_content, str) or not file_content.strip():
        raise HTTPException(status_code=400, detail="fileContent must be a non-empty string")

    try:
        question_count_int = int(question_count)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="questionCount must be an integer") from exc
    if question_count_int <= 0:
        raise HTTPException(status_code=400, detail="questionCount must be a positive integer")
    if question_count_int > MAX_GENERATED_QUESTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"questionCount too large (max {MAX_GENERATED_QUESTIONS})",
        )

    # LLM calls can be slow; do them outside the write lock.
    course_name, chapter_title = _classify_course_and_chapter(file_content=file_content)

    with _data_write_lock():
        course_path, course, _ = _find_or_create_course(course_name=course_name)
        chapter, chapter_created = _find_or_create_chapter(course, chapter_title=chapter_title)
        if chapter_created:
            _atomic_write_json(course_path, course)

        course_id = str(course.get("course_id") or "").strip()
        chapter_id = str(chapter.get("chapter_id") or "").strip()
        course_name_for_generation = str(course.get("course_name") or course_name or "Imported Lecture")

    if not course_id or not chapter_id:
        raise HTTPException(status_code=500, detail="Failed to route lecture into a course/chapter")

    generated = _generate_mcq_course_from_lecture(
        lecture_text=file_content,
        course_name=course_name_for_generation,
        question_count=question_count_int,
    )
    incoming_questions = generated.get("questions") or []
    if not isinstance(incoming_questions, list) or not incoming_questions:
        raise HTTPException(status_code=502, detail="MCQ generation returned no questions")

    validated = _validate_course_data(
        {
            "course_name": course_name_for_generation,
            "questions": incoming_questions,
        }
    )
    normalized_questions = validated["questions"]

    with _data_write_lock():
        course_file = _course_file_path(course_id)
        if not course_file.exists():
            raise HTTPException(status_code=404, detail="Course not found")
        try:
            course_latest = _load_json_file(course_file)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"Failed to load course after routing: {exc}") from exc
        if not isinstance(course_latest, dict):
            raise HTTPException(status_code=500, detail="Invalid course data after routing")

        start_id = _max_question_id(course_latest) + 1
        for idx, q in enumerate(normalized_questions, start=0):
            q["id"] = start_id + idx

        chapters = course_latest.get("chapters") or []
        if not isinstance(chapters, list):
            raise HTTPException(status_code=500, detail="Invalid course chapters")

        target_chapter: dict[str, Any] | None = None
        for ch in chapters:
            if not isinstance(ch, dict):
                continue
            if str(ch.get("chapter_id") or "") == chapter_id:
                target_chapter = ch
                break

        if target_chapter is None:
            # Recover if chapter was deleted/renamed between steps.
            target_chapter, _ = _find_or_create_chapter(course_latest, chapter_title=chapter_title)
            chapter_id = str(target_chapter.get("chapter_id") or chapter_id)

        existing_qs = target_chapter.get("questions")
        if not isinstance(existing_qs, list):
            existing_qs = []
            target_chapter["questions"] = existing_qs
        existing_qs.extend(normalized_questions)

        _atomic_write_json(course_file, course_latest)

        course_name_response = str(course_latest.get("course_name") or course_name_for_generation)
        chapter_title_response = str(target_chapter.get("chapter_title") or chapter_title)
        course_question_count = _course_question_count(course_latest)
        chapter_question_count = len(existing_qs)

    return {
        "course_id": course_id,
        "course_name": course_name_response,
        "chapter_id": chapter_id,
        "chapter_title": chapter_title_response,
        "added_question_count": len(normalized_questions),
        "course_question_count": course_question_count,
        "chapter_question_count": chapter_question_count,
        "library": list_courses(),
    }


@app.patch("/api/library/course/{course_id}")
def rename_course(course_id: str, payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    _ensure_library_bootstrapped()

    new_name = payload.get("course_name")
    if not isinstance(new_name, str) or not new_name.strip():
        raise HTTPException(status_code=400, detail="course_name must be a non-empty string")
    new_name = new_name.strip()

    with _data_write_lock():
        course_file = _course_file_path(course_id)
        if not course_file.exists():
            raise HTTPException(status_code=404, detail="Course not found")

        course = _load_json_file(course_file)
        if not isinstance(course, dict):
            raise HTTPException(status_code=500, detail="Invalid course data")

        new_key = _normalize_key(new_name)
        for path in _iter_course_files():
            if path == course_file:
                continue
            try:
                other = _load_json_file(path)
            except Exception:
                continue
            if not isinstance(other, dict):
                continue
            if _normalize_key(str(other.get("course_name") or "")) == new_key:
                raise HTTPException(status_code=409, detail="Another course already has this name")

        course["course_name"] = new_name
        _atomic_write_json(course_file, course)
        return {"course": _build_course_summary(course), "library": list_courses()}


@app.patch("/api/library/course/{course_id}/chapter/{chapter_id}")
def rename_chapter(
    course_id: str,
    chapter_id: str,
    payload: dict[str, Any] = Body(...),
) -> dict[str, Any]:
    _ensure_library_bootstrapped()

    new_title = payload.get("chapter_title")
    if not isinstance(new_title, str) or not new_title.strip():
        raise HTTPException(status_code=400, detail="chapter_title must be a non-empty string")
    new_title = new_title.strip()

    with _data_write_lock():
        course_file = _course_file_path(course_id)
        if not course_file.exists():
            raise HTTPException(status_code=404, detail="Course not found")

        course = _load_json_file(course_file)
        if not isinstance(course, dict):
            raise HTTPException(status_code=500, detail="Invalid course data")

        chapters = course.get("chapters") or []
        if not isinstance(chapters, list):
            raise HTTPException(status_code=500, detail="Invalid course chapters")

        target: dict[str, Any] | None = None
        for ch in chapters:
            if not isinstance(ch, dict):
                continue
            if str(ch.get("chapter_id") or "") == chapter_id:
                target = ch
                break
        if target is None:
            raise HTTPException(status_code=404, detail="Chapter not found")

        new_key = _normalize_key(new_title)
        for ch in chapters:
            if not isinstance(ch, dict):
                continue
            if str(ch.get("chapter_id") or "") == chapter_id:
                continue
            if _normalize_key(str(ch.get("chapter_title") or "")) == new_key:
                raise HTTPException(status_code=409, detail="Another chapter already has this title")

        target["chapter_title"] = new_title
        _atomic_write_json(course_file, course)
        return {"course": _build_course_summary(course), "library": list_courses()}


@app.post("/api/library/courses")
def create_course(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    _ensure_library_bootstrapped()

    course_name = payload.get("course_name")
    if not isinstance(course_name, str) or not course_name.strip():
        raise HTTPException(status_code=400, detail="course_name must be a non-empty string")
    course_name = course_name.strip()

    with _data_write_lock():
        new_key = _normalize_key(course_name)
        for path in _iter_course_files():
            try:
                existing = _load_json_file(path)
            except Exception:
                continue
            if not isinstance(existing, dict):
                continue
            if _normalize_key(str(existing.get("course_name") or "")) == new_key:
                raise HTTPException(status_code=409, detail="Another course already has this name")

        course = _new_course(course_name=course_name)
        _save_course(course)
        return {"course": _build_course_summary(course), "library": list_courses()}


@app.delete("/api/library/course/{course_id}")
def delete_course(course_id: str) -> dict[str, Any]:
    _ensure_library_bootstrapped()

    with _data_write_lock():
        course_file = _course_file_path(course_id)
        if not course_file.exists():
            raise HTTPException(status_code=404, detail="Course not found")

        course_dir = _course_dir(course_id)
        if course_dir.exists():
            shutil.rmtree(course_dir)

        return {"library": list_courses()}


@app.post("/api/library/course/{course_id}/chapters")
def create_chapter(course_id: str, payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    _ensure_library_bootstrapped()

    chapter_title = payload.get("chapter_title")
    if not isinstance(chapter_title, str) or not chapter_title.strip():
        raise HTTPException(status_code=400, detail="chapter_title must be a non-empty string")
    chapter_title = chapter_title.strip()

    with _data_write_lock():
        course_file = _course_file_path(course_id)
        if not course_file.exists():
            raise HTTPException(status_code=404, detail="Course not found")

        course = _load_json_file(course_file)
        if not isinstance(course, dict):
            raise HTTPException(status_code=500, detail="Invalid course data")

        new_key = _normalize_key(chapter_title)
        chapters = course.get("chapters") or []
        if not isinstance(chapters, list):
            chapters = []
            course["chapters"] = chapters
        for ch in chapters:
            if not isinstance(ch, dict):
                continue
            if _normalize_key(str(ch.get("chapter_title") or "")) == new_key:
                raise HTTPException(status_code=409, detail="Another chapter already has this title")

        chapter = _new_chapter(chapter_title=chapter_title)
        chapters.append(chapter)
        _atomic_write_json(course_file, course)
        return {"course": _build_course_summary(course), "library": list_courses()}


@app.delete("/api/library/course/{course_id}/chapter/{chapter_id}")
def delete_chapter(course_id: str, chapter_id: str) -> dict[str, Any]:
    _ensure_library_bootstrapped()

    with _data_write_lock():
        course_file = _course_file_path(course_id)
        if not course_file.exists():
            raise HTTPException(status_code=404, detail="Course not found")

        course = _load_json_file(course_file)
        if not isinstance(course, dict):
            raise HTTPException(status_code=500, detail="Invalid course data")

        chapters = course.get("chapters") or []
        if not isinstance(chapters, list):
            raise HTTPException(status_code=500, detail="Invalid course chapters")

        target_idx: int | None = None
        for idx, ch in enumerate(chapters):
            if not isinstance(ch, dict):
                continue
            if str(ch.get("chapter_id") or "") == chapter_id:
                target_idx = idx
                break
        if target_idx is None:
            raise HTTPException(status_code=404, detail="Chapter not found")

        chapters.pop(target_idx)
        _atomic_write_json(course_file, course)
        return {"course": _build_course_summary(course), "library": list_courses()}


def _extract_pdf_text(pdf_bytes: bytes) -> tuple[str, int]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        page_count = doc.page_count
        chunks: list[str] = []
        for page in doc:
            extracted = page.get_text("text")
            if isinstance(extracted, str) and extracted:
                chunks.append(extracted)
        full_text = "\n\n".join(chunks).strip()
        return full_text, page_count
    finally:
        doc.close()


@app.post("/api/lecture/extract")
async def extract_lecture_pdf(file: UploadFile = File(...)) -> dict[str, Any]:
    filename = file.filename or "lecture.pdf"

    declared_type = (file.content_type or "").strip().casefold()
    if declared_type and declared_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Only PDF files are supported. Please upload a .pdf file.")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    # Validate by signature to reject non-PDFs even if the client lies.
    sniff = raw[:1024].lstrip()
    if not sniff.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported. Please upload a valid PDF.")

    if len(raw) > MAX_PDF_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"PDF too large (max {MAX_PDF_MB}MB)")

    try:
        text, page_count = _extract_pdf_text(raw)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=400,
            detail=(
                "Failed to parse PDF. "
                "Make sure the file is a valid (non-encrypted) PDF and try again."
            ),
        ) from exc

    detected_course = _detect_course_code_from_text(text)

    return {
        "filename": filename,
        "page_count": page_count,
        "char_count": len(text),
        "text": text,
        "detected_course": detected_course,
    }


def _guess_mime(filename: str | None, content_type: str | None) -> str:
    if content_type and content_type != "application/octet-stream":
        return content_type
    if filename:
        guessed, _ = mimetypes.guess_type(filename)
        if guessed:
            return guessed
    return "application/octet-stream"


def _gemini_generate_content(*, api_key: str, model: str, contents: list[dict[str, Any]]) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    headers = {
        "x-goog-api-key": api_key,
        "Content-Type": "application/json",
    }
    body = {"contents": contents}

    try:
        resp = requests.post(url, headers=headers, json=body, timeout=60)
    except requests.RequestException as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}") from exc

    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Gemini error {resp.status_code}: {resp.text}")

    data = resp.json()
    candidates = data.get("candidates") or []
    if not candidates:
        raise HTTPException(status_code=502, detail="Gemini returned no candidates")

    parts = (((candidates[0] or {}).get("content") or {}).get("parts")) or []
    text_parts: list[str] = []
    for part in parts:
        if not isinstance(part, dict):
            continue
        value = part.get("text")
        if isinstance(value, str) and value:
            text_parts.append(value)
    if not text_parts:
        raise HTTPException(status_code=502, detail="Gemini returned no text parts")
    return "".join(text_parts).strip()


def _deepseek_candidate_urls(base_url: str) -> list[str]:
    base = (base_url or "").strip().rstrip("/")
    if not base:
        base = "https://api.deepseek.com"

    # Most OpenAI-compatible providers expose /v1/chat/completions.
    # Some expose /chat/completions when base_url already includes /v1.
    if base.endswith("/v1"):
        return [f"{base}/chat/completions"]
    return [f"{base}/v1/chat/completions", f"{base}/chat/completions"]


def _deepseek_chat_completions(
    *,
    api_key: str,
    base_url: str,
    model: str,
    messages: list[dict[str, str]],
    temperature: float = 0.2,
    max_tokens: int | None = None,
) -> str:
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="DEEPSEEK_API_KEY is not set. Set DEEPSEEK_API_KEY env var to use deepseek-v4-flash.",
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if max_tokens is not None:
        body["max_tokens"] = max_tokens

    last_404: str | None = None
    for url in _deepseek_candidate_urls(base_url):
        try:
            resp = requests.post(url, headers=headers, json=body, timeout=60)
        except requests.RequestException as exc:  # noqa: BLE001
            raise HTTPException(status_code=502, detail=f"DeepSeek request failed: {exc}") from exc

        if resp.status_code == 404:
            last_404 = resp.text
            continue

        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"DeepSeek error {resp.status_code}: {resp.text}")

        data = resp.json()
        choices = data.get("choices") or []
        if not choices:
            raise HTTPException(status_code=502, detail="DeepSeek returned no choices")

        message = (choices[0] or {}).get("message") or {}
        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise HTTPException(status_code=502, detail="DeepSeek returned empty content")
        return content.strip()

    raise HTTPException(
        status_code=502,
        detail=(
            "DeepSeek endpoint not found (got 404). "
            "Check DEEPSEEK_BASE_URL (e.g., include or exclude /v1). "
            f"Last 404 response: {last_404}"
        ),
    )


def _extract_json_object(text: str) -> Any:
    # Accept fenced JSON blocks or raw JSON. Then fall back to first {...} span.
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Empty model output")

    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.DOTALL | re.IGNORECASE)
    candidate = fenced.group(1) if fenced else text

    start = candidate.find("{")
    end = candidate.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in model output")

    return json.loads(candidate[start : end + 1])


def _normalize_answer_key(value: Any) -> str:
    raw = str(value).strip().upper()
    if raw in {"A", "B", "C", "D"}:
        return raw
    raise ValueError("answer must be one of A, B, C, D")


def _validate_course_data(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError("course payload must be a JSON object")

    course_name = raw.get("course_name")
    if not isinstance(course_name, str) or not course_name.strip():
        raise ValueError("course_name must be a non-empty string")

    questions = raw.get("questions")
    if not isinstance(questions, list) or not questions:
        raise ValueError("questions must be a non-empty array")

    normalized_questions: list[dict[str, Any]] = []
    seen_ids: set[int] = set()

    for index, q in enumerate(questions, start=1):
        if not isinstance(q, dict):
            raise ValueError(f"questions[{index}] must be an object")

        q_type = q.get("type", "MCQ")
        if q_type != "MCQ":
            raise ValueError(f"questions[{index}].type must be 'MCQ'")

        question_text = q.get("question")
        if not isinstance(question_text, str) or not question_text.strip():
            raise ValueError(f"questions[{index}].question must be a non-empty string")

        options = q.get("options")
        if not isinstance(options, dict):
            raise ValueError(f"questions[{index}].options must be an object")

        option_keys = set(options.keys())
        if option_keys != {"A", "B", "C", "D"}:
            raise ValueError(f"questions[{index}].options must contain exactly A, B, C, D")

        answer = _normalize_answer_key(q.get("answer"))

        explanation = q.get("explanation")
        if not isinstance(explanation, str) or not explanation.strip():
            raise ValueError(f"questions[{index}].explanation must be a non-empty string")

        q_id_raw = q.get("id", index)
        try:
            q_id = int(q_id_raw)
        except Exception as exc:  # noqa: BLE001
            raise ValueError(f"questions[{index}].id must be an integer") from exc
        if q_id in seen_ids:
            raise ValueError(f"Duplicate question id: {q_id}")
        seen_ids.add(q_id)

        normalized_questions.append(
            {
                "id": q_id,
                "type": "MCQ",
                "question": question_text.strip(),
                "options": {
                    "A": str(options["A"]),
                    "B": str(options["B"]),
                    "C": str(options["C"]),
                    "D": str(options["D"]),
                },
                "answer": answer,
                "explanation": explanation.strip(),
            }
        )

    normalized_questions.sort(key=lambda item: item["id"])
    return {"course_name": course_name.strip(), "questions": normalized_questions}


def _generate_mcq_course_from_lecture(
    *,
    lecture_text: str,
    course_name: str,
    question_count: int,
) -> dict[str, Any]:
    clipped = (lecture_text or "").strip()[:MAX_CONTEXT_CHARS]
    if not clipped:
        raise HTTPException(status_code=400, detail="lectureText is empty")

    if question_count <= 0:
        raise HTTPException(status_code=400, detail="questionCount must be a positive integer")
    if question_count > MAX_GENERATED_QUESTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"questionCount too large (max {MAX_GENERATED_QUESTIONS})",
        )

    api_key = os.getenv("DEEPSEEK_API_KEY")
    base_url = os.getenv("DEEPSEEK_BASE_URL", DEFAULT_DEEPSEEK_BASE_URL)
    model = os.getenv("DEEPSEEK_MODEL", DEFAULT_DEEPSEEK_MODEL)

    system = (
        "You are an expert instructor and exam writer. "
        "Create high-quality multiple-choice questions strictly grounded in the provided lecture notes. "
        "If a fact is not in the notes, avoid using it. "
        "Return ONLY a single JSON object (no markdown, no extra text)."
    )

    user = (
        f"Course name: {course_name}\n"
        f"Number of questions: {question_count}\n\n"
        "Output JSON schema:\n"
        "{\n"
        "  \"course_name\": string,\n"
        "  \"questions\": [\n"
        "    {\n"
        "      \"id\": integer (start at 1),\n"
        "      \"type\": \"MCQ\",\n"
        "      \"question\": string,\n"
        "      \"options\": {\"A\": string, \"B\": string, \"C\": string, \"D\": string},\n"
        "      \"answer\": \"A\"|\"B\"|\"C\"|\"D\",\n"
        "      \"explanation\": string\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Constraints:\n"
        "- Exactly 4 options A-D per question\n"
        "- Exactly one correct answer\n"
        "- Explanations should reference the lecture notes\n"
        "- Avoid trick wording; test understanding of key points\n\n"
        "LECTURE NOTES:\n"
        f"{clipped}"
    )

    raw = _deepseek_chat_completions(
        api_key=api_key or "",
        base_url=base_url,
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
    )

    try:
        parsed = _extract_json_object(raw)
        course = _validate_course_data(parsed)
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail=f"Failed to parse/validate MCQ JSON: {exc}") from exc

    # Ensure sequential IDs if model didn't follow.
    for idx, q in enumerate(course["questions"], start=1):
        q["id"] = idx

    course["course_name"] = course_name.strip() or course["course_name"]
    return course


@app.post("/api/chat")
async def chat(
    payload: str = Form(...),
    images: list[UploadFile] = File(default=[]),
) -> dict[str, str]:
    """Chat with DeepSeek (text) and optionally Gemini (images).

    payload JSON shape:
      {
        "messages": [{"role": "user"|"assistant", "content": "..."}, ...],
        "contextText": "..."  // optional, e.g., extracted PDF text
                "model": "deepseek-v4-flash" // optional (text)
      }

    images: optional slide images (export PPT slides to PNG/JPG, then attach). Images require GEMINI_API_KEY.
    """

    try:
        data = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"payload must be valid JSON: {exc}") from exc

    messages = data.get("messages")
    if not isinstance(messages, list) or not messages:
        raise HTTPException(status_code=400, detail="payload.messages must be a non-empty array")

    context_text = data.get("contextText")
    if context_text is None:
        context_text = ""
    if not isinstance(context_text, str):
        raise HTTPException(status_code=400, detail="payload.contextText must be a string")

    model = data.get("model") or DEFAULT_DEEPSEEK_MODEL
    if not isinstance(model, str) or not model.strip():
        raise HTTPException(status_code=400, detail="payload.model must be a string")

    if images:
        # Multimodal path: use Gemini.
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="GEMINI_API_KEY is not set. Images require Gemini. Set GEMINI_API_KEY env var.",
            )

        gemini_model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)

        contents: list[dict[str, Any]] = []
        if context_text.strip():
            clipped = context_text[:MAX_CONTEXT_CHARS]
            contents.append(
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": "You are a study assistant. Use the following lecture notes as reference. "
                            "If the notes do not contain the answer, say you are unsure.\n\n"
                            f"LECTURE NOTES START\n{clipped}\nLECTURE NOTES END",
                        }
                    ],
                }
            )

        for idx, message in enumerate(messages, start=1):
            if not isinstance(message, dict):
                raise HTTPException(status_code=400, detail=f"payload.messages[{idx}] must be an object")
            role = message.get("role")
            content = message.get("content")
            if role not in {"user", "assistant"}:
                raise HTTPException(
                    status_code=400,
                    detail=f"payload.messages[{idx}].role must be user|assistant",
                )
            if not isinstance(content, str) or not content.strip():
                raise HTTPException(
                    status_code=400,
                    detail=f"payload.messages[{idx}].content must be a non-empty string",
                )

            contents.append(
                {
                    "role": "user" if role == "user" else "model",
                    "parts": [{"text": content.strip()}],
                }
            )

        # Attach images to the last user turn.
        for content in reversed(contents):
            if content.get("role") == "user":
                target = content
                break
        else:
            raise HTTPException(status_code=400, detail="No user message to attach images to")

        parts = target.setdefault("parts", [])
        if not isinstance(parts, list):
            raise HTTPException(status_code=500, detail="Internal error: parts is not a list")

        for image in images:
            image_bytes = await image.read()
            if not image_bytes:
                continue
            if len(image_bytes) > MAX_IMAGE_MB * 1024 * 1024:
                raise HTTPException(
                    status_code=413,
                    detail=f"Image '{image.filename}' too large (max {MAX_IMAGE_MB}MB each)",
                )

            mime = _guess_mime(image.filename, image.content_type)
            if not mime.startswith("image/"):
                raise HTTPException(status_code=400, detail=f"Unsupported image type: {mime}")

            parts.append(
                {
                    "inline_data": {
                        "mime_type": mime,
                        "data": base64.b64encode(image_bytes).decode("ascii"),
                    }
                }
            )

        reply = _gemini_generate_content(api_key=api_key, model=gemini_model.strip(), contents=contents)
        return {"reply": reply}

    # Text-only path: use DeepSeek.
    api_key = os.getenv("DEEPSEEK_API_KEY")
    base_url = os.getenv("DEEPSEEK_BASE_URL", DEFAULT_DEEPSEEK_BASE_URL)

    deepseek_messages: list[dict[str, str]] = []
    if context_text.strip():
        clipped = context_text[:MAX_CONTEXT_CHARS]
        system_content = (
            "You are a study assistant. Use the lecture notes provided by the user as reference. "
            "If the notes do not contain the answer, say you are unsure.\n\n"
            f"LECTURE NOTES START\n{clipped}\nLECTURE NOTES END"
        )
    else:
        system_content = "You are a concise study assistant."

    deepseek_messages.append({"role": "system", "content": system_content})

    for idx, message in enumerate(messages, start=1):
        if not isinstance(message, dict):
            raise HTTPException(status_code=400, detail=f"payload.messages[{idx}] must be an object")
        role = message.get("role")
        content = message.get("content")
        if role not in {"user", "assistant"}:
            raise HTTPException(status_code=400, detail=f"payload.messages[{idx}].role must be user|assistant")
        if not isinstance(content, str) or not content.strip():
            raise HTTPException(status_code=400, detail=f"payload.messages[{idx}].content must be a non-empty string")

        deepseek_messages.append(
            {
                "role": "user" if role == "user" else "assistant",
                "content": content.strip(),
            }
        )

    reply = _deepseek_chat_completions(
        api_key=api_key or "",
        base_url=base_url,
        model=model.strip(),
        messages=deepseek_messages,
        temperature=0.2,
    )
    return {"reply": reply}


@app.post("/api/lecture/generate-mcq")
async def generate_mcq(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    course_name = payload.get("courseName")
    lecture_text = payload.get("lectureText")
    question_count = payload.get("questionCount", 20)

    if not isinstance(course_name, str) or not course_name.strip():
        course_name = "Imported Lecture"
    if not isinstance(lecture_text, str):
        raise HTTPException(status_code=400, detail="lectureText must be a string")
    try:
        question_count_int = int(question_count)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="questionCount must be an integer") from exc

    return _generate_mcq_course_from_lecture(
        lecture_text=lecture_text,
        course_name=course_name.strip(),
        question_count=question_count_int,
    )
