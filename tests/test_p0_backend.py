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
