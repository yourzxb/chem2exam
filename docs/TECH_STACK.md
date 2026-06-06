# 技术栈决策

本文档给出正式系统推荐技术栈。后续如果更换技术栈，需要同步更新 `ARCHITECTURE.md`、`IMPLEMENTATION_PLAN.md` 和本文件。

## 1. 推荐结论

第一版正式系统建议采用：

- 前端：Next.js + React + TypeScript。
- UI：Tailwind CSS + shadcn/ui 风格组件。
- 后端：Next.js API Routes 或独立 NestJS。
- 数据库：PostgreSQL。
- ORM：Prisma。
- 任务队列：BullMQ + Redis。
- 文件存储：本地存储起步，后续切换 MinIO 或云对象存储。
- AI 调用：后端 AI Gateway，兼容 DeepSeek、智谱 GLM 等 OpenAI-compatible 或自定义 API。
- 测试：Vitest + Playwright。

如果希望第一版更快落地，可以先使用单体 Next.js：

```text
Next.js 前端
Next.js API Routes 后端
PostgreSQL + Prisma
Redis + BullMQ
```

等老师端、AI 队列和学校部署复杂度上来后，再拆为独立后端服务。

## 2. 为什么推荐 Next.js

优点：

- 前后端可在一个仓库内快速开发。
- 适合学生端、老师端、管理端这种多页面系统。
- TypeScript 能减少大型项目字段不一致问题。
- 后续可以逐步拆分后端，而不影响产品验证。

注意：

- API Key 不能进入前端组件。
- AI 调用必须在服务端执行。
- 后台长任务不要直接放在普通页面请求里，应使用队列。

## 3. 为什么推荐 PostgreSQL

本系统数据关系复杂：

- 用户和角色。
- 题目和知识点。
- 知识图谱关系。
- 作答记录。
- 审核记录。
- AI 任务和模型配置。

PostgreSQL 适合这种结构化关系数据，也支持 JSON 字段保存 AI 输出和题目选项。

## 4. 为什么推荐 Prisma

优点：

- 数据模型清晰。
- 迁移可追踪。
- TypeScript 类型自动生成。
- 方便 Codex 读取 schema 后理解业务对象。

要求：

- 新增字段必须同步更新 `DATABASE_SCHEMA.md` 和 `DATA_MODEL.md`。
- 数据库迁移需要可回滚或有备份策略。

## 5. AI Gateway 设计原则

AI Gateway 是后端内部服务，统一负责：

- 读取模型配置。
- 解密 API Key。
- 按任务类型选择默认模型。
- 调用模型。
- 失败重试。
- 切换备用模型。
- 校验结构化输出。
- 写入 AI 调用日志。

业务模块不得直接散落调用 DeepSeek 或智谱 GLM。

## 6. 任务队列选择

整卷拆题、答案对齐、知识点挂接等任务可能耗时较长，必须异步执行。

建议：

- MVP 可先同步模拟任务结果。
- 正式 AI 阶段使用 BullMQ + Redis。
- 任务状态写入数据库。
- 前端轮询或 WebSocket 查看进度。

## 7. 前端页面组织

建议按角色分区：

```text
/student
/teacher
/admin
/review
```

学生端优先完成：

- `/student/dashboard`
- `/student/graph`
- `/student/practice`
- `/student/report`

## 8. 不推荐方案

不推荐第一版直接做微服务。

原因：

- 当前最重要是验证学习闭环。
- 微服务会增加部署、鉴权、日志和联调复杂度。

不推荐只做纯前端长期维护。

原因：

- AI API Key 需要后端安全保存。
- 学生数据、审核状态、题库和报告都需要可靠持久化。

## 9. 技术债边界

允许 MVP 临时简化：

- 使用预设题库。
- 使用预设中位数。
- 使用简单报告。
- AI 任务先做接口占位。

不允许简化：

- 学生端访问未发布题目。
- API Key 放前端。
- AI 结果绕过审核。
- 学生端显示负面标签。

