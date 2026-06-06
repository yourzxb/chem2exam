# Chem2Exam

基于中高考真题、知识图谱和化学核心素养评价的个性化学习诊断系统。

核心定位：

> 用中高考真题诊断学生化学知识断点，并通过知识图谱给出补救路径。

## 当前状态

当前仓库已经从静态原型推进到可本地跑通的 Next.js + PostgreSQL MVP：

- 学生端：真题式诊断、错后学习导航、复盘任务、成长奖励、学习报告。
- 老师端：授权班级工作台、班级报告、学生下钻、错题复盘跟进、课堂讲评素材。
- 管理端：学校/班级/教师/学生组织管理、账号检索、批量入班、题库维护、知识图谱维护、AI 模型配置、学校汇总。
- 审核端：AI 候选题一审、修改后发布、驳回、批量处理和审核历史。

当前进度详见 `STATUS.md`，最新测试报告见 `docs/TEST_REPORT.md`。

早期静态原型已保存在 `prototype/`，正式系统以 `src/`、`prisma/`、`scripts/` 为主。

## 本地跑通

### 1. 准备环境

确保已经安装：

- Node.js。
- npm。
- Docker Desktop。

首次运行：

```bash
npm install
cp .env.example .env
docker compose up -d postgres
```

### 2. 初始化数据库

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 3. 启动应用

开发模式：

```bash
npm run dev -- -p 4174
```

浏览器访问：

- 学生端：http://localhost:4174/student
- 老师端：http://localhost:4174/teacher
- 管理端：http://localhost:4174/admin
- 审核端：http://localhost:4174/review

导入种子数据后，四端登录区都有“演示账号”按钮，也可手动输入：

| 端口 | 用户名 | 登录口令 | 用途 |
| --- | --- | --- | --- |
| 学生端 | `demo_student_01` | `Chem2Exam@2026` | 查看学习报告、复盘任务、奖励和知识图谱诊断 |
| 老师端 | `demo_teacher` | `Chem2Exam@2026` | 查看示范班级报告、学生下钻、复盘跟进和讲评素材 |
| 管理端 | `demo_admin` | `Chem2Exam@2026` | 查看学校组织、题库、知识图谱、学校汇总和 AI 配置 |
| 审核端 | `demo_admin` | `Chem2Exam@2026` | 查看待审题和一审发布流程 |

也可以先构建再以生产模式运行：

```bash
npm run build
npm run start -- -p 4174
```

### 4. 一键健康验证

确认 Docker 中的 PostgreSQL 已运行后，可以执行：

```bash
npm run verify:all
```

该命令会依次完成：

- 数据库客户端生成。
- 数据库结构同步。
- 种子数据导入。
- 类型检查。
- 业务红线测试。
- 生产构建。
- 启动或复用 4174 端口服务。
- 四端页面入口冒烟检查。
- 四端演示账号登录验证。
- 学生学习流、审核流、老师端流、管理端流验证。

如果只想单独验证某一块：

```bash
npm run verify:db-flow
npm run verify:demo-login
npm run verify:review-flow
npm run verify:teacher-flow
npm run verify:admin-flow
```

常见卡点：

- Docker Desktop 没启动时，数据库连接会失败。
- `.env` 不存在时，数据库模式无法启用；请先复制 `.env.example`。
- 4174 端口被占用时，可先关闭旧服务，或通过 `VERIFY_BASE_URL` 指向已有服务。

## 文档索引

- `AGENTS.md`：Codex 项目规则，开发前必须阅读。
- `docs/PRD.md`：产品需求文档。
- `docs/MVP_SPEC.md`：MVP 详细规格。
- `docs/USER_FLOWS.md`：用户流程与页面规格。
- `docs/TECH_STACK.md`：正式技术栈建议。
- `docs/PROJECT_STRUCTURE.md`：正式项目结构建议。
- `docs/ARCHITECTURE.md`：技术架构文档。
- `docs/DATA_MODEL.md`：数据模型文档。
- `docs/DATABASE_SCHEMA.md`：Prisma/PostgreSQL 数据库 Schema 草案。
- `docs/LOCAL_DATABASE.md`：本地 PostgreSQL 启动、推送和 seed 说明。
- `docs/OPENCLAW_DEPLOYMENT.md`：给 OpenClaw 或部署代理使用的 Ubuntu 内网试点部署说明。
- `docs/API_SPEC.md`：后端 API 草案。
- `docs/AI_TASKS.md`：AI 任务规范。
- `docs/CODING_GUIDE.md`：开发约束与编码指南。
- `docs/CODEX_PROMPTS.md`：可直接给 Codex 使用的分步开发提示词。
- `docs/LEADERBOARD.md`：成长型排行榜机制。
- `docs/ACCEPTANCE_CRITERIA.md`：验收清单。
- `docs/IMPLEMENTATION_PLAN.md`：分模块实现计划。
- `docs/TEST_STRATEGY.md`：测试策略和关键测试用例。
- `docs/SECURITY_COMPLIANCE.md`：安全与合规要求。
- `docs/GLOSSARY.md`：项目术语表。
- `docs/DECISIONS.md`：关键产品和技术决策记录。
- `docs/ROADMAP.md`：项目路线图。

## 不可违反原则

1. 学生端只使用已审核并发布的题目。
2. AI 输出必须进入人工审核，不得直接发布。
3. 答错后必须提供错后学习导航。
4. 奖励机制奖励成长行为，不鼓励刷简单题。
5. API Key 只能保存在后端加密配置中，不能进入前端。
6. 学生端不得展示“乱做”“低投入”等负面标签。
7. 知识图谱必须支持前置依赖关系。

## 推荐开发顺序

1. 对齐 `docs/MVP_SPEC.md`。
2. 搭建正式前后端项目结构。
3. 实现学生诊断闭环。
4. 实现题库、知识图谱和审核状态。
5. 实现老师端和管理端。
6. 接入 AI 能力中心。
