# SmartReview

SmartReview is a lightweight study tool for course-based self-review with AI-generated questions. Supports **MCQ**, **fill-in-the-blank**, **essay**, and **proof** question types. Runs in both **CLI mode** (V1) and **Web UI** (V2).

## Project Structure

```text
SmartReview/
├── smartreview.py              # V1 CLI tool
├── smartreview_api.py          # V2 FastAPI backend (library, quiz, lecture tools, AI)
├── questions/                  # V1 course data (used to bootstrap V2 on first run)
├── data/                       # V2 library storage (generated at runtime; gitignored)
├── tests/
│   └── test_p0_backend.py      # Backend tests (pytest, 12 tests)
├── web/                        # V2 Web UI (React + Vite + Tailwind)
│   ├── src/
│   │   ├── api/                # API client (library, quiz)
│   │   ├── components/         # UI components
│   │   │   └── ui/             # Radix primitives
│   │   ├── hooks/              # Quiz state hook (useQuiz)
│   │   ├── lib/                # Utilities (cn)
│   │   └── App.tsx             # Root layout + routing
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── .env.example                # API key template → copy to .env
├── requirements.txt
├── TODO.md
├── CHANGELOG.md
└── README.md
```

## Data Format

V1 (CLI) reads `questions/<course>/questions.json`.

V2 (Web UI + API) persists the library to `data/` (one `course.json` per course). This directory is generated at runtime and intentionally not tracked by Git.

On API startup, if `data/` is empty, it will import legacy `questions/*/questions.json` once. Delete `data/` to re-bootstrap.

Use one `questions.json` file per course directory. The file follows this structure:

```json
{
  "course_name": "COMP3251 - Algorithm Design",
  "questions": [
    {
      "id": 1,
      "type": "MCQ",
      "question": "What is the time complexity of Prim's Algorithm using a Binary Heap?",
      "options": {
        "A": "O(V^2)",
        "B": "O(E log V)",
        "C": "O(E + V log V)",
        "D": "O(V log E)"
      },
      "answer": "B",
      "explanation": "Using a binary heap, each edge relaxation takes O(log V) time, and there are E relaxations."
    }
  ]
}
```

Recommended folder layout:

```text
questions/
    COMP3251 - Algorithm Design/
        questions.json
    Machine Learning/
        questions.json
```

---

## V2 — Web UI

A modern, responsive single-page app built with **React**, **Tailwind CSS**, and **Framer Motion**.

### Features

- **Course & chapter management** — create, rename, and delete courses and chapters directly from the sidebar.
  - Hover over any course or chapter to reveal the ✏️ rename button and ··· context menu.
  - Double-click a name to inline-edit.
  - Use the `+ New Course` / `+ New Chapter` buttons to add content.
  - Delete operations show a confirmation dialog to prevent accidents.
- **Course navigation** — sidebar accordion lists all courses and their chapters with question counts.
- **Focus mode** — hide the sidebar for a distraction-free experience. Press `Esc` or click the floating button to exit.
- **Progress bar** — visual indicator of completion within the current course.
- **Animated quiz card** — centered question display with smooth transitions between questions.
- **Interactive options** — hover and selection effects, plus correctness feedback:
  - Correct → green background + subtle bounce
  - Incorrect → red background + horizontal shake
- **Explanation panel** — slides in after submission, showing the correct answer and explanation.
- **Multi-type questions** — supports MCQ, Fill-in-the-blank (FILL), Essay (ESSAY), and Proof (PROOF).
  - FILL: numeric tolerance matching + text normalization.
  - ESSAY/PROOF: reference answer reveal only (no auto-grading).
- **Quiz setup** — before starting, choose course track (Auto / Humanities / STEM) and question counts per type.
  - Auto-detection of course track via LLM based on uploaded materials.
  - Daily-deterministic question sampling (same config → same questions on the same day).
  - Auto gap-filling: if the question bank runs short, DeepSeek generates new questions from materials.
- **Stats summary** — animated score ring, accuracy (MCQ+FILL only), duration, and correct count after completing a course.

### Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Framework   | React 18 + TypeScript               |
| Build       | Vite 6                              |
| Styling     | Tailwind CSS 3                      |
| Animations  | Framer Motion 11                    |
| Icons       | Lucide React                        |

### Color Scheme

A soft indigo / slate palette designed for long study sessions with low eye strain:

- Background: `slate-50`, cards: white with soft shadows
- Primary: indigo-600 with violet gradients
- Success: emerald, Error: rose
- Custom `study` color scale in `tailwind.config.js`

### Getting Started

```bash
cd web
npm install
npm run dev      # starts dev server at http://localhost:5173
npm run build    # production build to web/dist/

# Quality checks
npm run lint
npm run format:check
npm run format
```

### Lecture Upload + MCQ + AI Chat (optional)

The Web UI includes a **Lecture notes** upload button (PDF → text via PyMuPDF) that automatically generates **MCQ questions** and imports them into the sidebar. If the lecture text contains a recognized course code, the questions are merged into that course; otherwise a new course is created.

The AI chat box uses **DeepSeek** by default for text chat (`deepseek-v4-flash`). If you attach images (PPT slides), the backend will use **Gemini** for the multimodal request.

1) Start the Python API server (in the repo root):

```bash
python -m pip install -r requirements.txt
python -m uvicorn smartreview_api:app --reload --port 8000

# Quality checks
python -m ruff check .
python -m pytest -q
```

2) Set your API keys (one-time setup):

```bash
cp .env.example .env
# Edit .env and fill in your keys:
#   DEEPSEEK_API_KEY=sk-xxxxxxxx
#   (optional) GEMINI_API_KEY=...
```

The backend auto-loads `.env` via `python-dotenv` — no need to set env vars manually every session. `.env` is in `.gitignore`.

3) Run the web dev server:

```bash
cd web
npm run dev
```

Vite is configured to proxy `/api/*` to `http://127.0.0.1:8000` during development.

---

## V1 — CLI

Run the quiz from a course root directory:

```bash
python smartreview.py --data questions
```

Useful options:

- `--course` to jump to a specific course.
- `--order random` or `--order sequential` to control question order.
- `--limit N` to review only the first N questions after ordering.
- `--seed N` to make random order reproducible.

---

## Future Extensions

- Render Markdown in questions and explanations for formulas, code blocks, and links.
- Import / export question sets via the Web UI.
- Refactor backend into a package (`routers/`, `services/`, `storage/`, `llm/`).

Full roadmap: see [TODO.md](TODO.md). Changelog: see [CHANGELOG.md](CHANGELOG.md).
