# TODO

## P0 — 多题型支持 (Question Types + Quiz Session)

> 来源：`docs/superpowers/specs/2026-05-09-question-types-quiz-session-design.md`
> 分支：`feat/Qtypes`

### B1: 后端 — 联合题型校验

- [x] B1.1 添加 `_normalize_question_type()` 辅助函数（MCQ/FILL/ESSAY/PROOF）
- [x] B1.2 添加 `_optional_float()` 辅助函数
- [x] B1.3 实现 `_validate_question_v3()` 单题校验（分类型：MCQ / FILL / ESSAY / PROOF）
- [x] B1.4 实现 `_validate_questions_v3()` 批量校验（去重 + 排序）
- [x] B1.5 编写测试 `test_validate_questions_v3_accepts_mixed_types`
- [x] B1.6 编写测试 `test_validate_questions_v3_rejects_invalid_fill`
- [x] B1.7 运行 `python -m pytest -q` 确认通过

### B2: 后端 — Schema v3 + 材料记录

- [x] B2.1 升级 `SCHEMA_VERSION` 从 2 → 3
- [x] B2.2 `_new_course()` 新增 `course_track` / `course_track_source` 字段
- [x] B2.3 `_new_chapter()` 新增 `materials: []` 字段
- [x] B2.4 添加 `_append_material()` 函数（截断文本、记录元数据）
- [x] B2.5 `POST /api/library/import-text` 接收可选 `filename` / `pageCount` 并记录 material
- [x] B2.6 编写测试 `test_import_text_records_materials`
- [x] B2.7 运行 `python -m pytest -q` 确认通过

### B3: 后端 — 课程类型判定 + 混合题型生成

- [x] B3.1 实现 `_classify_course_track()` — 调用 DeepSeek 判定 humanities/stem
- [x] B3.2 实现 `_generate_questions_from_material()` — 调用 DeepSeek 按缺口生成混合题型
- [x] B3.3 编写测试 `test_classify_course_track_parses_json`
- [x] B3.4 运行 `python -m pytest -q` 确认通过

### B4: 后端 — POST /api/quiz/session 端点

- [x] B4.1 添加 `_collect_material_text()` — 收集章节/课程材料文本（含 fallback）
- [x] B4.2 添加 `_daily_seed_hash()` — 生成当天可复现 seed
- [x] B4.3 实现 `POST /api/quiz/session` 端点（判定 track → 补齐缺口 → 抽样返回）
- [x] B4.4 添加 `_data_write_lock`（现有锁机制已存在）
- [x] B4.5 编写集成测试 `test_quiz_session_fills_missing_and_is_daily_deterministic`
- [x] B4.6 运行 `python -m pytest -q` 确认通过

### F1: 前端 — 类型系统升级

- [x] F1.1 将 `Question` 改为联合类型（MCQQuestion / FillQuestion / EssayQuestion / ProofQuestion）
- [x] F1.2 更新 `AnswerRecord`（新增 `scored` / `correct: boolean | null` / `questionType`）
- [x] F1.3 更新 `QuizStats`（`scoredTotal` + `correct`）
- [x] F1.4 新增 `QuizSessionRequest` / `QuizSessionResponse` 类型
- [x] F1.5 `CourseData` / `ChapterData` 适配新字段
- [x] F1.6 创建 `web/src/api/quiz.ts`（`createQuizSession` 函数）
- [x] F1.7 `npm run build` 确认通过

### F2: 前端 — Quiz Setup 卡片

- [x] F2.1 创建 `web/src/components/QuizSetupCard.tsx`
- [x] F2.2 集成到 `App.tsx`：选课后先显示 Setup 卡片，Start 后进入做题

### F3: 前端 — 多题型做题交互

- [x] F3.1 更新 `useQuiz.ts`（fillDraft + 多题型提交 + 填空判对）
- [x] F3.2 更新 `QuizCard.tsx`（MCQ/FILL/ESSAY/PROOF 按类型渲染）
- [x] F3.3 更新 `ExplanationCard.tsx`（MCQ/FILL/ESSAY/PROOF 差异化展示）
- [x] F3.4 更新 `StatsPanel.tsx`（scoredTotal + MCQ+FILL 提示）

### F4: 端到端验证

- [x] F4.1 后端 `python -m pytest -q` → 12 passed
- [x] F4.2 前端 `npm run build` → PASS
- [x] F4.3 更新 README 说明新题型 + Quiz Setup 功能
- [x] F4.4 更新 CHANGELOG

---

### P0 — Reliability & DX (short-term)

- [x] Add `.env.example` listing required env vars
- [x] Add backend unit tests (pytest)
- [x] Add frontend linting (ESLint) + formatting (Prettier)
- [x] Add Python linting (ruff)
- [x] Add CI (GitHub Actions)
- [x] Make `data/` writes concurrency-safe
- [x] Validate uploads and improve error messages
- [x] Standardize API error payloads and frontend error rendering

### P1 — Maintainability (mid-term)

- [ ] Refactor backend into a package
- [ ] Add Pydantic request/response models
- [ ] Generate TypeScript types from FastAPI OpenAPI
- [ ] Add library export/import tooling
- [ ] Add dev convenience command (API + web together)
- [ ] Clean up unused `web/src/data/questions`

### P2 — Scalability (long-term)

- [ ] Replace JSON file storage with SQLite
- [ ] Add Dockerfiles / deployment docs
- [ ] Add structured logs + request IDs
