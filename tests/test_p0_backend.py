from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from filelock import FileLock

import smartreview_api


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    # Isolate tests from the real repo data/ directory.
    monkeypatch.setattr(smartreview_api, "DATA_DIR", tmp_path / "data", raising=False)
    monkeypatch.setattr(smartreview_api, "_LIBRARY_BOOTSTRAPPED", True, raising=False)
    return TestClient(smartreview_api.app)


def test_extract_json_object_parses_fenced_json() -> None:
    raw = """Here is the answer:
```json
{"a": 1, "b": {"c": 2}}
```
"""

    parsed = smartreview_api._extract_json_object(raw)
    assert parsed == {"a": 1, "b": {"c": 2}}


def test_extract_json_object_finds_first_object_span() -> None:
    raw = "prefix text {\"ok\": true, \"n\": 3} suffix"
    parsed = smartreview_api._extract_json_object(raw)
    assert parsed == {"ok": True, "n": 3}


def test_validate_course_data_normalizes_questions() -> None:
    raw = {
        "course_name": "  COMP3251  ",
        "questions": [
            {
                "id": 2,
                "type": "MCQ",
                "question": "  Q2?  ",
                "options": {"A": 1, "B": 2, "C": 3, "D": 4},
                "answer": "b",
                "explanation": "  exp  ",
            },
            {
                "id": 1,
                "type": "MCQ",
                "question": "Q1?",
                "options": {"A": "a", "B": "b", "C": "c", "D": "d"},
                "answer": "A",
                "explanation": "exp",
            },
        ],
    }

    validated = smartreview_api._validate_course_data(raw)
    assert validated["course_name"] == "COMP3251"
    assert [q["id"] for q in validated["questions"]] == [1, 2]
    assert validated["questions"][1]["answer"] == "B"
    assert validated["questions"][1]["question"] == "Q2?"
    assert validated["questions"][1]["explanation"] == "exp"


def test_bootstrap_import_supports_custom_legacy_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(smartreview_api, "DATA_DIR", tmp_path / "data", raising=False)

    legacy_root = tmp_path / "questions"
    (legacy_root / "Demo Course").mkdir(parents=True)
    (legacy_root / "Demo Course" / "questions.json").write_text(
        json.dumps(
            {
                "course_name": "Demo Course",
                "questions": [
                    {
                        "id": 1,
                        "type": "MCQ",
                        "question": "Q?",
                        "options": {"A": "a", "B": "b", "C": "c", "D": "d"},
                        "answer": "A",
                        "explanation": "because",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    smartreview_api._bootstrap_data_dir_from_v1_questions(legacy_root=legacy_root)

    course_files = sorted((tmp_path / "data").glob("*/course.json"))
    assert len(course_files) == 1

    data = json.loads(course_files[0].read_text(encoding="utf-8"))
    assert data["schema_version"] == smartreview_api.SCHEMA_VERSION
    assert data["course_name"] == "Demo Course"
    assert len(data["chapters"]) == 1
    assert data["chapters"][0]["chapter_title"] == smartreview_api.DEFAULT_CHAPTER_TITLE
    assert len(data["chapters"][0]["questions"]) == 1


def test_http_errors_are_standardized(client: TestClient) -> None:
    resp = client.get("/api/library/course/does-not-exist")
    assert resp.status_code == 404

    payload = resp.json()
    assert "error" in payload
    assert payload["error"]["message"] == "Course not found"


def test_extract_rejects_non_pdf_uploads(client: TestClient) -> None:
    resp = client.post(
        "/api/lecture/extract",
        files={"file": ("note.txt", b"hello", "text/plain")},
    )
    assert resp.status_code == 400

    payload = resp.json()
    assert "error" in payload
    assert "pdf" in payload["error"]["message"].casefold()


def test_validate_questions_v3_accepts_mixed_types() -> None:
    raw_questions = [
        {
            "id": 2,
            "type": "FILL",
            "question": "2 + 2 = ____",
            "answers": ["4", "4.0"],
            "tolerance": 0.0,
        },
        {
            "id": 1,
            "type": "ESSAY",
            "question": "Explain gradient descent.",
            "answer": "It is an iterative optimization method ...",
        },
        {
            "id": 3,
            "type": "PROOF",
            "question": "Prove that ...",
            "answer": "Proof sketch ...",
        },
        {
            "id": 4,
            "type": "MCQ",
            "question": "Pick A",
            "options": {"A": "A", "B": "B", "C": "C", "D": "D"},
            "answer": "A",
            "explanation": "Because ...",
        },
    ]

    normalized = smartreview_api._validate_questions_v3(raw_questions)
    assert [q["id"] for q in normalized] == [1, 2, 3, 4]
    assert [q["type"] for q in normalized] == ["ESSAY", "FILL", "PROOF", "MCQ"]
    assert normalized[1]["answers"] == ["4", "4.0"]


def test_validate_questions_v3_rejects_invalid_fill() -> None:
    with pytest.raises(ValueError, match="answers"):
        smartreview_api._validate_questions_v3(
            [{"id": 1, "type": "FILL", "question": "x=____", "answers": []}]
        )


def test_import_text_records_materials(monkeypatch: pytest.MonkeyPatch, client: TestClient) -> None:
    monkeypatch.setattr(
        smartreview_api,
        "_classify_course_and_chapter",
        lambda *, file_content: ("Demo Course", "Week 1"),
        raising=True,
    )

    def fake_generate(
        *, lecture_text: str, course_name: str, question_count: int
    ) -> dict[str, object]:
        return {
            "course_name": course_name,
            "questions": [
                {
                    "id": 1,
                    "type": "MCQ",
                    "question": "Q?",
                    "options": {"A": "a", "B": "b", "C": "c", "D": "d"},
                    "answer": "A",
                    "explanation": "because",
                }
            ],
        }

    monkeypatch.setattr(smartreview_api, "_generate_mcq_course_from_lecture", fake_generate, raising=True)

    resp = client.post(
        "/api/library/import-text",
        json={
            "fileContent": "hello world",
            "questionCount": 1,
            "filename": "lecture.pdf",
            "pageCount": 3,
        },
    )
    assert resp.status_code == 200

    course_files = sorted(smartreview_api.DATA_DIR.glob("*/course.json"))
    assert len(course_files) == 1
    course = json.loads(course_files[0].read_text(encoding="utf-8"))

    assert course["schema_version"] >= 3
    assert course.get("course_track") is None

    chapters = course["chapters"]
    assert len(chapters) == 1
    materials = chapters[0].get("materials")
    assert isinstance(materials, list)
    assert len(materials) == 1
    assert materials[0]["filename"] == "lecture.pdf"
    assert materials[0]["page_count"] == 3
    assert materials[0]["char_count"] == len("hello world")
    assert "text" in materials[0]


def test_classify_course_track_parses_json(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_chat(**kwargs: object) -> str:
        return '{"course_track": "stem"}'

    monkeypatch.setattr(smartreview_api, "_deepseek_chat_completions", fake_chat, raising=True)
    track = smartreview_api._classify_course_track(text="math and proofs")
    assert track == "stem"


def test_quiz_session_fills_missing_and_is_daily_deterministic(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    client: TestClient,
) -> None:
    course = smartreview_api._new_course(course_name="Demo")
    ch = smartreview_api._new_chapter(chapter_title="Week 1")
    smartreview_api._append_material(ch, filename="lecture.pdf", page_count=1, text="material text")
    course["chapters"].append(ch)
    smartreview_api._save_course(course)

    monkeypatch.setattr(smartreview_api, "_classify_course_track", lambda *, text: "stem", raising=True)

    def fake_gen(
        *,
        material_text: str,
        course_name: str,
        course_track: str,
        missing_counts: dict[str, int],
    ) -> list[dict[str, object]]:
        out: list[dict[str, object]] = []
        next_id = 1
        for _ in range(missing_counts.get("MCQ", 0)):
            out.append(
                {
                    "id": next_id,
                    "type": "MCQ",
                    "question": f"MCQ {next_id}?",
                    "options": {"A": "a", "B": "b", "C": "c", "D": "d"},
                    "answer": "A",
                    "explanation": "exp",
                }
            )
            next_id += 1
        for _ in range(missing_counts.get("FILL", 0)):
            out.append(
                {
                    "id": next_id,
                    "type": "FILL",
                    "question": f"FILL {next_id} = ____",
                    "answers": ["1"],
                    "tolerance": 0.0,
                }
            )
            next_id += 1
        for _ in range(missing_counts.get("PROOF", 0)):
            out.append(
                {
                    "id": next_id,
                    "type": "PROOF",
                    "question": f"PROOF {next_id}",
                    "answer": "proof",
                }
            )
            next_id += 1
        return smartreview_api._validate_questions_v3(out)

    monkeypatch.setattr(
        smartreview_api, "_generate_questions_from_material", fake_gen, raising=True
    )

    payload = {
        "courseId": course["course_id"],
        "chapterId": ch["chapter_id"],
        "courseTrack": "auto",
        "counts": {"MCQ": 2, "FILL": 1, "ESSAY": 0, "PROOF": 1},
    }

    r1 = client.post("/api/quiz/session", json=payload)
    assert r1.status_code == 200
    s1 = r1.json()
    assert s1["course_track"] == "stem"
    assert len(s1["questions"]) == 4

    r2 = client.post("/api/quiz/session", json=payload)
    assert r2.status_code == 200
    s2 = r2.json()

    assert [q["id"] for q in s2["questions"]] == [q["id"] for q in s1["questions"]]


def test_write_lock_busy_returns_503(client: TestClient, tmp_path: Path) -> None:
    # The API should serialize writes under a file lock in DATA_DIR.
    lock_path = tmp_path / "data" / ".smartreview.lock"
    lock_path.parent.mkdir(parents=True, exist_ok=True)

    lock = FileLock(str(lock_path))
    lock.acquire(timeout=1)
    try:
        resp = client.post("/api/library/courses", json={"course_name": "Locked"})
        assert resp.status_code == 503
        payload = resp.json()
        assert "error" in payload
        assert "busy" in payload["error"]["message"].casefold()
    finally:
        lock.release()
