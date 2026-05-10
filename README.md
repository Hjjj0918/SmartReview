<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/SmartReview-v2.2-indigo?style=for-the-badge&logo=readthedocs&logoColor=white">
    <img src="https://img.shields.io/badge/SmartReview-v2.2-indigo?style=for-the-badge&logo=readthedocs&logoColor=white" alt="SmartReview">
  </picture>
</p>

<p align="center">
  <a href="README.zh-CN.md"><b>🇨🇳 中文</b></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/your-username/smartreview"><b>GitHub</b></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.11+-3776AB?logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/react-18-61DAFB?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/typescript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/fastapi-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/vite-6-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/tailwind-3-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-AGPL_v3-blue" alt="License AGPLv3">
  <img src="https://img.shields.io/badge/tests-12%20passed-brightgreen" alt="Tests">
  <img src="https://img.shields.io/badge/status-active-success" alt="Status">
  <img src="https://img.shields.io/badge/PRs-welcome-blue" alt="PRs Welcome">
</p>

<br>

> AI-powered self-review. Upload your lecture notes, generate MCQs & proofs, and study smarter — on the web or in your terminal.

<br>

## ✨ Features

<table>
<tr>
<td width="50%">

### 🧠 AI Question Generation
Upload lecture PDFs and let **DeepSeek** generate high-quality questions grounded in your materials. Auto-detects course type (STEM vs Humanities) and fills gaps on demand.

</td>
<td width="50%">

### 📝 Four Question Types
- **MCQ** — multiple-choice with explanation
- **FILL** — fill-in-the-blank with numeric tolerance
- **ESSAY** — reference answer reveal
- **PROOF** — proof sketch for STEM courses

</td>
</tr>
<tr>
<td>

### 🎨 Modern Web UI
React + Tailwind + Framer Motion. Animated quiz cards, focus mode, progress tracking, sidebar course management — all with smooth transitions.

</td>
<td>

### 🗂️ Course & Chapter CRUD
Create, rename, delete courses and chapters from the sidebar. Hover for quick actions, double-click to rename, context menu for more.

</td>
</tr>
<tr>
<td>

### 📊 Smart Statistics
Animated score ring, accuracy (MCQ+FILL only), duration tracking. Daily-deterministic question sampling — same config, same questions.

</td>
<td>

### 🖥️ CLI + Web
Originally a Python CLI tool. Now ships with a full FastAPI backend + React frontend. Use whichever fits your workflow.

</td>
</tr>
</table>

<br>

## 🚀 Quick Start

> **Prerequisites:** Python 3.11+, Node.js 18+, [DeepSeek API key](https://platform.deepseek.com/)

```bash
# 1. Clone & install
git clone https://github.com/your-username/smartreview.git
cd smartreview

# 2. Backend
python -m pip install -r requirements.txt
cp .env.example .env          # edit .env → paste your DEEPSEEK_API_KEY
python -m uvicorn smartreview_api:app --reload --port 8000

# 3. Frontend
cd web
npm install
npm run dev                   # http://localhost:5173
```

That's it. The backend auto-loads `.env` via `python-dotenv` — no manual `export` every session.

<br>

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS 3 |
| Animations | Framer Motion 11, Lucide React icons |
| Backend | FastAPI, PyMuPDF, DeepSeek API |
| Storage | JSON files (`data/`) — migrating to SQLite soon |
| Linting | ESLint, Prettier (frontend) · Ruff (backend) |
| Testing | pytest (12 tests), `npm run build` pass |

<br>

## 📁 Project Structure

```text
SmartReview/
├── smartreview.py                # V1 CLI tool
├── smartreview_api.py            # V2 FastAPI backend
├── data/                         # Course storage (runtime, gitignored)
├── tests/test_p0_backend.py       # 12 pytest tests
├── web/                          # V2 React frontend
│   ├── src/
│   │   ├── api/                   # API clients (library, quiz)
│   │   ├── components/            # UI components + Radix primitives
│   │   ├── hooks/useQuiz.ts       # Quiz state machine
│   │   └── App.tsx                # Root layout
│   └── package.json
├── .env.example                  # API key template
├── CHANGELOG.md
├── TODO.md
└── README.md
```

<br>

## Config

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `DEEPSEEK_API_KEY` | — | **Required** for AI generation |
| `DEEPSEEK_MODEL` | `deepseek-v4-flash` | Model name |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | API endpoint |
| `GEMINI_API_KEY` | — | Optional, for image chat |
| `SMARTREVIEW_MAX_GENERATED_QUESTIONS` | `50` | Max per session |

See `.env.example` for the full list.

<br>

## 🧪 Quality

```bash
# Backend
python -m ruff check .                   # Lint
python -m pytest tests/ -q               # Test (12 passed)

# Frontend
cd web
npm run lint                              # ESLint
npm run format:check                      # Prettier
npm run build                             # TypeScript + Vite build
```

<br>

## 🗺️ Roadmap

| Priority | Item | Status |
|----------|------|--------|
| P0 | Multi-type questions (MCQ/FILL/ESSAY/PROOF) | done |
| P0 | Quiz session with daily-deterministic sampling | done |
| P0 | Course/chapter CRUD (sidebar management) | done |
| P0 | Focus mode + keyboard shortcuts | done |
| P0 | Deploy to production (Vercel + Railway) | next |
| P1 | SQLite migration (replace JSON files) | planned |
| P1 | Markdown rendering in questions | planned |
| P1 | User authentication (simple token gate) | planned |

Full roadmap: [TODO.md](TODO.md) · Changelog: [CHANGELOG.md](CHANGELOG.md)

<br>

## 📄 License

[AGPL v3](LICENSE) — free to use and modify; if you deploy it publicly you must share your changes.
