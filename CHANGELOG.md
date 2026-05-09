# Changelog

## [2.2.0] — 2026-05-09

### Added — Question Types + Quiz Session

- **Multi-type question support**: MCQ, FILL (fill-in-the-blank), ESSAY, PROOF.
  - FILL: text + numeric tolerance matching, multi-answer support.
  - ESSAY / PROOF: reference answer only, no auto-grading.
- **Quiz Setup card** (`QuizSetupCard`): before starting a quiz, users choose course track (Auto/Humanities/STEM) and question counts per type.
- **`POST /api/quiz/session`** endpoint: auto-determines course track, fills missing questions from uploaded materials via DeepSeek, returns daily-deterministic shuffled question set.
- **Schema v3**: `course.json` now includes `course_track`, `course_track_source`, and `materials[]` per chapter.
- **Material recording**: PDF imports now store clipped text as chapter materials for later gap-filling generation.
- **`_classify_course_track`**: LLM-based course classification (humanities vs stem).
- **`_generate_questions_from_material`**: LLM-based mixed-type question generation.
- **Union question validation** (`_validate_questions_v3`): validates all 4 question types.

### Changed

- `Question` type is now a discriminated union (MCQQuestion | FillQuestion | EssayQuestion | ProofQuestion).
- `useQuiz` hook supports FILL input, ESSAY/PROOF reveal-only flow, and per-type scoring.
- `QuizCard` / `ExplanationCard` render by question type.
- `StatsPanel` shows `correct/scoredTotal` with "(MCQ+FILL)" label.
- `SCHEMA_VERSION` bumped from 2 to 3.

### Fixed

- Focus mode now supports `Esc` key exit and uses React Portal for bulletproof rendering.

## [2.1.1] — 2026-05-02

### Fixed

- Delete confirm dialog: clicking "删除" had no effect; now handles loading state and shows error messages on failure.
- Create course/chapter: silently failed on API errors; now shows inline error messages.
- ConfirmDialog message now supports multi-line text (`whitespace-pre-line`).

### Added (Backend)

- `POST /api/library/courses` — create a new course.
- `DELETE /api/library/course/{id}` — delete a course and all its chapters/questions.
- `POST /api/library/course/{id}/chapters` — create a new chapter under a course.
- `DELETE /api/library/course/{id}/chapter/{chapterId}` — delete a chapter and all its questions.
- Duplicate name detection for both courses and chapters (returns 409).

## [2.1.0] — 2026-05-02

### Added

- **Course & chapter CRUD** — sidebar now supports full directory management:
  - Create new courses via `+ New Course` button at the bottom of the course list.
  - Create new chapters via `+ New Chapter` button inside each course's accordion.
  - Rename courses and chapters by hovering and clicking the ✏️ pencil icon, or double-clicking the name.
  - Delete courses and chapters via the ··· context menu, with a confirmation dialog to prevent accidental deletion.
- **Context menu** — `···` button appears on hover for each course/chapter, providing Rename / Delete (and New Chapter for courses).
- **Confirm dialog** — modal confirmation before any delete operation.
- **`createCourse` / `deleteCourse` / `createChapter` / `deleteChapter`** API functions in `web/src/api/library.ts`.

### Changed

- Focus mode exit button now renders via React Portal to `document.body`, avoiding CSS stacking context issues.
- Focus mode can be exited with the `Esc` key.
- Sidebar structure refactored to support hover-reveal action buttons and inline creation inputs.

### Fixed

- Focus mode could not be exited on the welcome screen (no exit button was rendered).
- Focus mode exit button was trapped inside the header's `backdrop-blur` stacking context, causing potential click blocking.

## [2.0.0] — 2026-04-29

### Added

- V2 Web UI built with React 18, TypeScript, Vite 6, Tailwind CSS 3, Framer Motion 11, and Lucide React.
- Animated quiz card with option hover effects, correct/incorrect feedback (bounce/shake), and explanation slide-in.
- Sidebar course navigation with Radix UI accordion.
- Focus mode with animated sidebar collapse.
- Progress bar with gradient fill.
- Statistics panel with SVG score ring, accuracy, duration, and retry/change-course actions.
- Lecture upload + AI MCQ generation + AI chat integration (DeepSeek / Gemini).
- API proxy configuration for `/api/*` → `http://127.0.0.1:8000`.

## [1.0.0] — Initial

- CLI tool (`smartreview.py`) for MCQ self-review.
- JSON-based course/question format with course folder discovery.
- Random/sequential question ordering with configurable seed and limit.
