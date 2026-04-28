# SmartReview

SmartReview is a lightweight study tool for course-based multiple-choice self-review. It supports both a **CLI mode** (V1) and a **Web UI** (V2).

## Project Structure

```text
SmartReview/
├── smartreview.py              # V1 CLI tool
├── questions/                   # V1 course data (shared with V2)
│   ├── COMP3251 - Algorithm Design/
│   │   └── questions.json
│   └── Machine Learning/
│       └── questions.json
├── web/                         # V2 Web UI (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/          # UI components
│   │   ├── hooks/               # Quiz state hook
│   │   ├── data/                # Course loader + copied JSON files
│   │   └── App.tsx              # Root layout
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── README.md
```

## Data Format

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

- **Course navigation** — sidebar lists all available courses with question counts.
- **Focus mode** — hide the sidebar for a distraction-free experience.
- **Progress bar** — visual indicator of completion within the current course.
- **Animated quiz card** — centered question display with smooth transitions between questions.
- **Interactive options** — hover and selection effects, plus correctness feedback:
  - Correct → green background + subtle bounce
  - Incorrect → red background + horizontal shake
- **Explanation panel** — slides in after submission, showing the correct answer and explanation.
- **Stats summary** — animated score ring, accuracy, duration, and correct count after completing a course.

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
```

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

- Add fill-in-the-blank question types with normalized answer checking.
- Render Markdown in questions and explanations for formulas, code blocks, and links.
- Import / export question sets via the Web UI.
