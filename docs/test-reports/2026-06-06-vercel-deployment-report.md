# 2026-06-06 Vercel 部署报告

## 1. 部署结论

Chem2Exam 已成功部署到 Vercel Production。

- 生产访问地址：https://chem2exam.vercel.app
- Vercel 项目：`keikei-s-projects/chem2exam`
- 项目 ID：`prj_RrCrIdb09YL0VDp6owTDLiC0k7kU`
- 最新生产部署 ID：`dpl_BuVNxsfF5MEvmAPTuaehLepjSUp5`
- 最新生产部署状态：Ready

## 2. 本次处理

- 通过 Vercel CLI 完成首次生产部署。
- 项目已绑定到 `.vercel/project.json`。
- 新增 `.vercelignore`，避免上传本机 `.env`、本地构建缓存、依赖目录和日志。
- 已在 Vercel Production 环境中添加 `AUTH_SECRET`，值由 Vercel 加密保存，本报告不记录明文。
- 无数据库环境下新增内存演示账号初始化，便于 Vercel 临时演示版登录。

## 3. 验证结果

| 验证项 | 结果 |
| --- | --- |
| 本机 `npm run typecheck` | 通过 |
| 本机 `npm test` | 通过，22 条测试全部通过 |
| 本机 `npm run build` | 通过 |
| Vercel 云端构建 | 通过 |
| Vercel Production 状态 | Ready |
| 首页抓取 | 200 OK |
| 知识图谱动态接口 | 200 OK |
| 本地 `.env` 上传风险 | 已通过 `.vercelignore` 处理 |
| Vercel `AUTH_SECRET` | 已加密配置 |

已验证动态接口：

```text
GET https://chem2exam.vercel.app/api/grades/%E5%88%9D%E4%B8%89/knowledge-graph
```

返回 `200 OK`，当前在 Vercel 无数据库模式下读取种子知识图谱。

## 4. 当前限制

当前 Vercel 版本是“可访问的在线演示版”，还不是完整持久化正式版。

原因：

- Vercel 生产环境尚未配置 `DATABASE_URL`。
- 因此线上会走内存/种子数据回退模式。
- 内存模式适合展示页面和轻量试用，不适合正式保存学生学习记录、审核记录、题库维护结果或 AI 模型配置。

## 5. 正式上线前必须补充

正式上线需要增加云 PostgreSQL，例如：

- Vercel Postgres / Neon。
- Supabase PostgreSQL。
- 阿里云 RDS PostgreSQL。

配置完成后，需要在 Vercel Production 环境添加：

```text
DATABASE_URL
```

然后执行：

```bash
npm run db:push
npm run db:seed
npm run db:import-junior-kg
npm run db:import-high-school-kg
npx vercel deploy --prod --scope keikei-s-projects
```

注意：正式已有真实学生数据后，不要随意重新执行 `db:seed`。

## 6. 安全确认

- 本报告不记录 API Key、Cookie、密码、会话令牌或环境变量明文。
- Vercel 环境变量只确认名称和状态，不记录值。
- 学生端发布边界、AI 人工审核边界、API Key 后端保存规则在代码中保持不变。
