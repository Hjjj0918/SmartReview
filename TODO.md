# TODO

### P0 — Reliability & DX (short-term)

- [x] Add `.env.example` listing required env vars (e.g., `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, size limits).
- [x] Add backend unit tests (pytest): course validation, bootstrap import, JSON extraction.
- [x] Add frontend linting (ESLint) + formatting (Prettier) and scripts.
- [x] Add Python linting (ruff) and scripts.
- [x] Add CI (GitHub Actions): Python lint/tests + `npm run build`.
- [x] Make `data/` writes concurrency-safe (file lock or transactional storage).
- [x] Validate uploads in `/api/lecture/extract` (reject non-PDF) and improve error messages.
- [x] Standardize API error payloads and frontend error rendering.

### P1 — Maintainability (mid-term)

- [ ] Refactor backend into a package (`routers/`, `services/`, `storage/`, `llm/`) and keep `smartreview_api.py` thin.
- [ ] Add Pydantic request/response models for all endpoints.
- [ ] Generate TypeScript types from FastAPI OpenAPI and reduce manual drift.
- [ ] Add library export/import (backup) tooling.
- [ ] Add a dev convenience command to run API + web together.
- [ ] Clean up unused `web/src/data/questions` if not referenced.

### P2 — Scalability (long-term)

- [ ] Replace JSON file storage with SQLite (e.g., SQLModel) to support indexing, migrations, and concurrent writes.
- [ ] Add Dockerfiles / deployment docs for API + web.
- [ ] Add basic observability: structured logs + request IDs.
