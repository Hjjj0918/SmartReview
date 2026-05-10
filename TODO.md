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

## P0 — 部署上线 (Deployment to Production)

> 目标：将 SmartReview 从 localhost 部署到公网，采用 PaaS 路线（Vercel + Railway），低成本、免运维。

### D1: 域名 + 环境准备

- [ ] D1.1 **购买域名**（Namecheap / Cloudflare / 阿里云万网，约 ¥50-80/年）
  - 建议用 `.com` / `.app` / `.dev`，简短好记
  - **为什么**：公网访问必须有一个域名；Vercel + Railway 都支持免费绑定自定义域名 + 自动 HTTPS
- [ ] D1.2 **注册 Railway 账号**（[railway.app](https://railway.app)），绑定 GitHub
- [ ] D1.3 **注册 Vercel 账号**（[vercel.com](https://vercel.com)），绑定 GitHub
- [ ] D1.4 **将域名 DNS 托管到 Cloudflare**（免费、CDN 加速、DDoS 防护）
  - **为什么**：无论域名在哪买，DNS 用 Cloudflare 可以获得免费 CDN + SSL + 安全防护

### D2: 后端部署（Railway）

- [ ] D2.1 **创建 `Dockerfile`**（后端容器化）
  - **为什么**：Railway 用 Docker 部署 Python 应用；Dockerfile 保证环境一致性
- [ ] D2.2 **添加 `Procfile` 或 `railway.toml`**（Railway 配置）
  - 指定启动命令 `uvicorn smartreview_api:app --host 0.0.0.0 --port $PORT`
  - 声明持久化 Volume 挂载 `data/` 目录
  - **为什么**：Railway 需要知道怎么启动 + 哪些目录需要持久化（Volume 防止重启丢数据）
- [ ] D2.3 **在 Railway 设置环境变量**：`DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL` 等
  - **为什么**：密钥绝不放入 Git；Railway 的环境变量管理比 `.env` 更适合生产环境
- [ ] D2.4 **Railway 项目创建 + GitHub 自动部署**
  - Push 到 GitHub → Railway 自动构建 Docker → 自动上线
  - **为什么**：CI/CD 自动化，之后每次 `git push` 就自动更新
- [ ] D2.5 **绑定自定义域名**（如 `api.smartreview.app`）
  - 在 Railway Dashboard → Settings → Custom Domain 添加
  - Cloudflare DNS 添加 CNAME 记录指向 Railway 提供的域名
  - **为什么**：`api.yourdomain.com` 比 `xxx.railway.app` 更专业，且方便前后端分离

### D3: 前端部署（Vercel）

- [ ] D3.1 **创建 `web/vercel.json`**（Vercel 部署配置）
  - 指定 build 命令和 output 目录
  - 配置 SPA fallback（所有路由 → index.html）
  - 配置 API proxy（开发时用 Vite proxy，生产时需单独处理跨域）
  - **为什么**：Vercel 需要知道这是一个 SPA；SPA fallback 让前端路由正常工作
- [ ] D3.2 **更新前端 API 请求地址**（区分开发/生产环境）
  - 开发环境：`/api/` → Vite proxy → `localhost:8000`
  - 生产环境：`https://api.smartreview.app/` → 直接请求 Railway
  - **为什么**：开发和生产环境需要不同 API 地址；硬编码会导致部署后 API 请求失败
- [ ] D3.3 **Vercel 项目创建 + GitHub 自动部署**
  - Import GitHub 仓库 → 设置 Root Directory 为 `web/` → 自动部署
  - **为什么**：与 Railway 一样，push 即部署
- [ ] D3.4 **绑定主域名**（如 `smartreview.app`）
  - Vercel Dashboard → Domains → 添加自定义域名
  - Cloudflare DNS 添加 CNAME 指向 `cname.vercel-dns.com`

### D4: 前后端连通 + 跨域

- [ ] D4.1 **后端添加 CORS 白名单**（生产域名）
  - 当前 CORS 只允许 `localhost:5173`；需添加 `https://smartreview.app`
  - **为什么**：浏览器同源策略会拦截不同域名之间的 API 请求
- [ ] D4.2 **端到端验证**：浏览器访问 `https://smartreview.app` → 选择课程 → 生成题目 → 做题 → 查看统计
  - **为什么**：确保部署后一切正常工作

### D5: 生产加固

- [ ] D5.1 **后端添加 Token 保护**（简单口令或 GitHub OAuth）
  - 不需要完整用户系统，但加一个简单密码防止路人消耗你的 DeepSeek API 额度
  - **为什么**：你的 DeepSeek API key 按量计费，公开后任何人都能调用 → 费用失控
- [ ] D5.2 **Railway 设置月度费用告警**（如 $10/月上限）
  - **为什么**：防止意外的高额账单
- [ ] D5.3 **设置 `robots.txt`**（禁止搜索引擎爬取）
  - 如果不想被搜索引擎索引
- [ ] D5.4 **添加 Uptime 监控**（Railway 自带或免费 UptimeRobot）
  - **为什么**：服务挂了你能第一时间知道

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
