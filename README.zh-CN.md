<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/SmartReview-v2.2-indigo?style=for-the-badge&logo=readthedocs&logoColor=white">
    <img src="https://img.shields.io/badge/SmartReview-v2.2-indigo?style=for-the-badge&logo=readthedocs&logoColor=white" alt="SmartReview">
  </picture>
</p>

<p align="center">
  <a href="README.md"><b>🇬🇧 English</b></a>
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

> AI 驱动的刷题工具。上传讲义，自动出题，网页或终端都能用。

<br>

## ✨ 功能特性

<table>
<tr>
<td width="50%">

### 🧠 AI 生成题目
上传课件 PDF，由 **DeepSeek** 基于材料内容生成高质量题目。自动识别课程类型（理科/文科），题库不足时按需补齐。

</td>
<td width="50%">

### 📝 四种题型
- **MCQ** — 选择题（带解析）
- **FILL** — 填空题（数值容差匹配）
- **ESSAY** — 论述题（查看参考答案）
- **PROOF** — 证明题（理科专属，查看证明思路）

</td>
</tr>
<tr>
<td>

### 🎨 现代 Web 界面
React + Tailwind + Framer Motion。动画答题卡、专注模式、进度追踪、侧边栏课程管理——全程流畅动画。

</td>
<td>

### 🗂️ 课程与章节管理
在侧边栏创建、重命名、删除课程和章节。悬停显示快捷操作按钮，双击重命名，右键菜单更多选项。

</td>
</tr>
<tr>
<td>

### 📊 智能统计
动画分数环、正确率（仅 MCQ+FILL 计分）、答题耗时。同日同配置抽题结果一致，方便每日轮换练习。

</td>
<td>

### 🖥️ CLI + Web 双模式
最初是 Python 命令行工具。现已升级为 FastAPI 后端 + React 前端，命令行和网页任你选。

</td>
</tr>
</table>

<br>

## 🚀 快速开始

> **前提:** Python 3.11+, Node.js 18+, [DeepSeek API key](https://platform.deepseek.com/)

```bash
# 1. 克隆仓库 & 安装
git clone https://github.com/your-username/smartreview.git
cd smartreview

# 2. 启动后端
python -m pip install -r requirements.txt
cp .env.example .env          # 编辑 .env → 填入 DEEPSEEK_API_KEY
python -m uvicorn smartreview_api:app --reload --port 8000

# 3. 启动前端
cd web
npm install
npm run dev                   # http://localhost:5173
```

搞定。后端通过 `python-dotenv` 自动加载 `.env`，无需每次手动设置环境变量。

<br>

## 🛠️ 技术栈

| 层级 | 技术 |
|-------|-----------|
| 前端 | React 18, TypeScript, Vite 6, Tailwind CSS 3 |
| 动画 | Framer Motion 11, Lucide React 图标 |
| 后端 | FastAPI, PyMuPDF（PDF 解析）, DeepSeek API |
| 存储 | JSON 文件（`data/`）—— 即将迁移至 SQLite |
| 代码质量 | ESLint, Prettier（前端）· Ruff（后端） |
| 测试 | pytest（12 个测试），`npm run build` 通过 |

<br>

## 📁 项目结构

```text
SmartReview/
├── smartreview.py                # V1 命令行工具
├── smartreview_api.py            # V2 FastAPI 后端
├── data/                         # 课程数据存储（运行时生成，已 gitignore）
├── tests/test_p0_backend.py       # 12 个 pytest 测试
├── web/                          # V2 React 前端
│   ├── src/
│   │   ├── api/                   # API 客户端（library, quiz）
│   │   ├── components/            # UI 组件 + Radix 基础组件
│   │   ├── hooks/useQuiz.ts       # 答题状态机
│   │   └── App.tsx                # 根布局
│   └── package.json
├── .env.example                  # API 密钥模板
├── CHANGELOG.md                  # 变更日志
├── TODO.md                       # 开发路线图
└── README.md                     # 项目说明（英文版）
```

<br>

## ⚙️ 配置

| 环境变量 | 默认值 | 说明 |
|-------------|---------|-------------|
| `DEEPSEEK_API_KEY` | — | **必填**，AI 生成题目所用 |
| `DEEPSEEK_MODEL` | `deepseek-v4-flash` | 模型名称 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | API 地址 |
| `GEMINI_API_KEY` | — | 可选，图片聊天功能需要 |
| `SMARTREVIEW_MAX_GENERATED_QUESTIONS` | `50` | 每次练习题目上限 |

完整配置见 `.env.example`。

<br>

## 🧪 质量检查

```bash
# 后端
python -m ruff check .                   # 代码风格
python -m pytest tests/ -q               # 运行测试（12 passed）

# 前端
cd web
npm run lint                              # ESLint
npm run format:check                      # Prettier
npm run build                             # TypeScript + Vite 构建
```

<br>

## 🗺️ 路线图

| 优先级 | 项目 | 状态 |
|----------|------|--------|
| P0 | 多题型支持（MCQ/FILL/ESSAY/PROOF） | 已完成 |
| P0 | 练习题单 + 每日可复现抽题 | 已完成 |
| P0 | 课程/章节 CRUD（侧边栏管理） | 已完成 |
| P0 | 专注模式 + 键盘快捷键 | 已完成 |
| P0 | 部署上线（Vercel + Railway） | 下一步 |
| P1 | SQLite 迁移（替代 JSON 文件） | 计划中 |
| P1 | 题目中渲染 Markdown（公式/代码） | 计划中 |
| P1 | 用户认证（简单访问口令） | 计划中 |

完整路线图：[TODO.md](TODO.md) · 变更日志：[CHANGELOG.md](CHANGELOG.md)

<br>

## 📄 许可证

[AGPL v3](LICENSE) — 自由使用和修改；公开部署必须开源你的改动。
