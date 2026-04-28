from __future__ import annotations

import argparse
import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any

VALID_ANSWERS = ("A", "B", "C", "D")


class QuestionFormatError(ValueError):
    pass


@dataclass(frozen=True)
class Question:
    id: int
    type: str
    question: str
    options: dict[str, str]
    answer: str
    explanation: str


@dataclass(frozen=True)
class Course:
    course_name: str
    questions: list[Question]
    source_path: Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="SmartReview - course-based MCQ self-review")
    parser.add_argument(
        "--data",
        default="questions",
        help="Root questions directory, a course directory, or a questions.json file",
    )
    parser.add_argument(
        "--course",
        default=None,
        help="Course name to load when multiple courses are available",
    )
    parser.add_argument(
        "--order",
        choices=("random", "sequential"),
        default="random",
        help="Question order",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit the number of questions shown after ordering",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducible random order",
    )
    return parser.parse_args()


def load_json(path: Path) -> Any:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError as exc:
        raise FileNotFoundError(f"Questions file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise QuestionFormatError(f"Invalid JSON in {path}: {exc}") from exc


def validate_question(raw: dict[str, Any], source_path: Path) -> Question:
    required_keys = {"id", "type", "question", "options", "answer", "explanation"}
    missing = required_keys - raw.keys()
    if missing:
        raise QuestionFormatError(f"{source_path}: question is missing fields: {sorted(missing)}")

    if raw["type"] != "MCQ":
        raise QuestionFormatError(f"{source_path}: only MCQ is supported in V1")

    options = raw["options"]
    if not isinstance(options, dict):
        raise QuestionFormatError(f"{source_path}: question.options must be an object")

    option_keys = set(options.keys())
    if option_keys != set(VALID_ANSWERS):
        raise QuestionFormatError(
            f"{source_path}: question.options must contain exactly A, B, C, D"
        )

    answer = str(raw["answer"]).upper().strip()
    if answer not in VALID_ANSWERS:
        raise QuestionFormatError(f"{source_path}: answer must be one of A, B, C, D")

    for field_name in ("id", "question", "explanation"):
        if not isinstance(raw[field_name], (int if field_name == "id" else str)):
            raise QuestionFormatError(f"{source_path}: field '{field_name}' has an invalid type")

    return Question(
        id=int(raw["id"]),
        type=str(raw["type"]),
        question=str(raw["question"]),
        options={key: str(options[key]) for key in VALID_ANSWERS},
        answer=answer,
        explanation=str(raw["explanation"]),
    )


def load_course_from_payload(payload: Any, source_path: Path) -> list[Course]:
    if not isinstance(payload, dict):
        raise QuestionFormatError(f"{source_path}: top-level JSON must be an object")

    if "courses" in payload:
        courses = payload["courses"]
        if not isinstance(courses, list) or not courses:
            raise QuestionFormatError(f"{source_path}: courses must be a non-empty array")
        loaded_courses: list[Course] = []
        for index, raw_course in enumerate(courses, start=1):
            course_source = source_path
            if not isinstance(raw_course, dict):
                raise QuestionFormatError(f"{source_path}: course #{index} must be an object")
            loaded_courses.append(validate_course(raw_course, course_source))
        return loaded_courses

    return [validate_course(payload, source_path)]


def validate_course(raw: dict[str, Any], source_path: Path) -> Course:
    if "course_name" not in raw or "questions" not in raw:
        raise QuestionFormatError(f"{source_path}: course object must contain course_name and questions")

    course_name = raw["course_name"]
    questions = raw["questions"]

    if not isinstance(course_name, str) or not course_name.strip():
        raise QuestionFormatError(f"{source_path}: course_name must be a non-empty string")
    if not isinstance(questions, list) or not questions:
        raise QuestionFormatError(f"{source_path}: questions must be a non-empty array")

    parsed_questions = [validate_question(question, source_path) for question in questions]
    return Course(course_name=course_name.strip(), questions=parsed_questions, source_path=source_path)


def discover_question_files(root: Path) -> list[Path]:
    if root.is_file():
        return [root]

    direct_questions_file = root / "questions.json"
    if direct_questions_file.exists():
        return [direct_questions_file]

    files = sorted(root.glob("*/questions.json"))
    if files:
        return files

    raise FileNotFoundError(
        f"No questions.json found under {root}. Expected a course folder structure like root/<course>/questions.json"
    )


def load_courses(data_path: Path) -> list[Course]:
    files = discover_question_files(data_path)
    courses: list[Course] = []
    for file_path in files:
        payload = load_json(file_path)
        courses.extend(load_course_from_payload(payload, file_path))
    if not courses:
        raise QuestionFormatError(f"{data_path}: no valid courses found")
    return courses


def select_course(courses: list[Course], course_name: str | None) -> Course:
    if course_name is None:
        if len(courses) == 1:
            return courses[0]

        print("Available courses:")
        for index, course in enumerate(courses, start=1):
            print(f"  {index}. {course.course_name}")

        while True:
            raw = input("Select a course by number: ").strip()
            if raw.isdigit():
                selected_index = int(raw)
                if 1 <= selected_index <= len(courses):
                    return courses[selected_index - 1]
            print("Invalid selection. Try again.")

    normalized = course_name.casefold().strip()
    exact_matches = [course for course in courses if course.course_name.casefold() == normalized]
    if exact_matches:
        return exact_matches[0]

    partial_matches = [course for course in courses if normalized in course.course_name.casefold()]
    if len(partial_matches) == 1:
        return partial_matches[0]
    if len(partial_matches) > 1:
        options = ", ".join(course.course_name for course in partial_matches)
        raise QuestionFormatError(f"Multiple courses match '{course_name}': {options}")

    available = ", ".join(course.course_name for course in courses)
    raise QuestionFormatError(f"Course '{course_name}' not found. Available courses: {available}")


def order_questions(questions: list[Question], order: str, seed: int | None) -> list[Question]:
    ordered = list(questions)
    if order == "random":
        rng = random.Random(seed)
        rng.shuffle(ordered)
    return ordered


def apply_limit(questions: list[Question], limit: int | None) -> list[Question]:
    if limit is None:
        return questions
    if limit <= 0:
        raise QuestionFormatError("limit must be a positive integer")
    return questions[:limit]


def ask_question(question: Question, position: int, total: int) -> bool:
    print()
    print(f"Question {position}/{total} | ID {question.id}")
    print(question.question)
    for key in VALID_ANSWERS:
        print(f"  {key}. {question.options[key]}")

    while True:
        raw = input("Your answer (A/B/C/D, q to quit): ").strip().upper()
        if raw in {"Q", "QUIT", "EXIT"}:
            raise KeyboardInterrupt
        if raw in VALID_ANSWERS:
            break
        print("Please enter A, B, C, or D.")

    is_correct = raw == question.answer
    if is_correct:
        print("Correct")
    else:
        print(f"Incorrect. Correct answer: {question.answer}")
    print(f"Explanation: {question.explanation}")
    return is_correct


def run_quiz(course: Course, order: str, limit: int | None, seed: int | None) -> None:
    questions = apply_limit(order_questions(course.questions, order, seed), limit)
    if not questions:
        raise QuestionFormatError(f"{course.course_name}: no questions available after applying limit")

    print(f"Course: {course.course_name}")
    print(f"Questions: {len(questions)}")

    correct_count = 0
    try:
        for position, question in enumerate(questions, start=1):
            if ask_question(question, position, len(questions)):
                correct_count += 1
    except KeyboardInterrupt:
        print()
        print("Quiz stopped early.")

    print()
    print(f"Score: {correct_count}/{len(questions)}")


def main() -> int:
    args = parse_args()
    data_path = Path(args.data).expanduser().resolve()

    courses = load_courses(data_path)
    selected_course = select_course(courses, args.course)
    run_quiz(selected_course, args.order, args.limit, args.seed)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
