# 测试报告入口

最新整体测试报告：

- [2026-06-06 Vercel 部署报告](./test-reports/2026-06-06-vercel-deployment-report.md)
- [2026-05-25 整体进度检查与验收报告](./test-reports/2026-05-25-overall-test-report.md)
- [2026-05-19 视觉升级第二波 E2 演示数据与测试报告](./test-reports/2026-05-19-visual-upgrade-test-report.md)
- [2026-05-19 前端四端优化测试报告](./test-reports/2026-05-19-frontend-overall-test-report.md)
- [2026-05-19 整体测试报告](./test-reports/2026-05-19-overall-test-report.md)

> 说明：2026-06-06 报告记录 Vercel Production 部署、线上访问地址、部署验证和当前云数据库限制；2026-05-25 报告记录最新进度检查、完整本地 `verify:all`、Ubuntu 测试机页面冒烟与演示账号验证，以及本机 PostgreSQL 端口收紧结果；学校端能力已收纳在管理端“学校工作台”，不新增独立 `/school` 路由。

历史报告：

- [2026-05-18 整体测试报告](./test-reports/2026-05-18-overall-test-report.md)

## 结果矩阵概览

| 模块 / 检查项 | 主要验证方式 | 当前状态 |
| --- | --- | --- |
| 数据库客户端 | `npm run db:generate` | 通过 |
| 数据库结构与种子 | `npm run db:push`、`npm run db:seed` | 通过 |
| 数据库端口安全 | 本机 Docker 端口检查 | 通过，已收紧为 `127.0.0.1:5432` |
| 类型检查 | `npm run typecheck` | 通过 |
| 单元 / 规则测试 | `npm test` | 通过，22 条测试全部通过 |
| 生产构建 | `npm run build` | 通过 |
| 一键整体验证 | `npm run verify:all` | 通过 |
| 页面冒烟验证 | `npm run verify:smoke` | 通过 |
| 演示账号登录验证 | `npm run verify:demo-login` | 通过 |
| 学生学习闭环 | `npm run verify:db-flow` | 通过 |
| 审核与 AI 人工发布边界 | `npm run verify:review-flow` | 通过 |
| 老师端跨班级工作台 | `npm run verify:teacher-flow` | 通过 |
| 管理端组织授权、账号目录与学校汇总 | `npm run verify:admin-flow` | 通过 |
| 核心页面抽查 | 浏览器检查 `/admin`、`/teacher`、`/student`、`/review` | 通过 |
| 核心业务红线 | 测试脚本、接口检查、文本扫描 | 通过 |
| MVP 验收 | 汇总全量测试结果 | 通过 |
| Vercel Production 部署 | Vercel CLI、Vercel 部署检查、线上接口抓取 | 通过，当前为无数据库在线演示版 |

## 最新结论

2026-06-06 Vercel Production 部署已完成，生产访问地址为 https://chem2exam.vercel.app 。当前 Vercel 版本可访问首页和动态知识图谱接口，并已配置加密 `AUTH_SECRET`；由于尚未配置云 PostgreSQL，线上暂为无数据库在线演示版，正式保存学生学习记录和审核/管理数据前需要补充 `DATABASE_URL`。

2026-05-25 进度检查已完成。当前 MVP 和学校试点主链路已通过完整本地 `verify:all`，Ubuntu 测试机 `172.53.63.166:4174` 已通过页面冒烟和演示账号登录验证。本机 PostgreSQL 容器端口已确认收紧为 `127.0.0.1:5432`，避免数据库端口暴露到局域网。

当前已新增 Chem Buddy 学习伙伴、化学视觉资产、奖励反馈、统一轻量组件库、学生/老师/审核/管理四端视觉工作台，以及更完整的数据库演示内容。种子数据覆盖多学校、多班级、多教师、多学生、四个年级题库、审核队列、错题复盘、奖励和核心素养目标；学生学习记录只关联 `published` 题，AI 候选题仍留在审核端和管理端。

本轮本地已通过 `db:generate`、`db:push`、`db:seed`、`typecheck`、`test`、`build`、`verify:smoke`、`verify:demo-login`、`verify:db-flow`、`verify:review-flow`、`verify:teacher-flow`、`verify:admin-flow` 和四端浏览器抽查。当前已具备学生端大题面与沉浸做题、老师端授权班级工作台、审核端大题面一审、管理端学校工作台、四端演示账号入口、页面冒烟验证和演示账号登录验证；学生端发布边界、人工审核边界、激励性表达和后端密钥保存规则均保持有效。

后续报告只记录测试结果、失败处理和业务结论，不写明文凭据、模型密钥、登录口令或环境变量。
