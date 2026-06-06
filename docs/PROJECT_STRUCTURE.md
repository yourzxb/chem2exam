# 正式项目结构建议

本文档描述后续正式工程目录结构。当前静态原型可保留为 prototype，但正式系统应按模块重建。

## 1. 推荐目录

```text
chem2exam/
  AGENTS.md
  README.md
  docs/
  prototype/
    index.html
    styles.css
    app.js
  apps/
    web/
      app/
        student/
        teacher/
        admin/
        review/
      components/
      lib/
      styles/
      tests/
  packages/
    domain/
      src/
        knowledge-graph/
        questions/
        learning/
        rewards/
        ai/
    database/
      prisma/
        schema.prisma
        migrations/
    config/
  workers/
    ai-worker/
  scripts/
```

如果采用单体 Next.js，也可以先简化为：

```text
chem2exam/
  docs/
  prisma/
  src/
    app/
      student/
      teacher/
      admin/
      review/
      api/
    components/
    server/
      auth/
      knowledge-graph/
      questions/
      answers/
      remediation/
      rewards/
      reports/
      ai/
      review/
    lib/
    tests/
```

## 2. 模块边界

### auth

负责：

- 注册。
- 登录。
- 权限。
- 会话。

不得负责：

- 学习报告。
- 题目推荐。

### knowledge-graph

负责：

- 知识点。
- 知识点关系。
- 图谱版本。
- 补救前置关系查询。

不得负责：

- 直接判题。
- 奖励计算。

### questions

负责：

- 题库。
- 题目状态。
- 题目知识点挂接。
- 学生端题目查询。

必须保证：

- 学生端只返回 published 题目。

### answers

负责：

- 作答开始。
- 作答提交。
- 判分。
- 用时统计。
- 难度反馈。

不得负责：

- 修改题目内容。

### remediation

负责：

- 错后学习导航。
- 补救路径。
- 前置知识推荐。
- 完成补救后返回原知识点。

### rewards

负责：

- XP。
- 宝石。
- 徽章。
- 生命值。
- 连续学习。

必须遵守：

- 奖励成长行为，不鼓励刷简单题。

### reports

负责：

- 学生报告。
- 老师班级报告。
- 核心素养表现汇总。

### ai

负责：

- AI 模型配置。
- AI Gateway。
- AI 任务。
- 结构化输出校验。
- 调用日志。

必须保证：

- AI 结果进入审核，不直接发布。

### review

负责：

- 待审核列表。
- 一审通过。
- 修改后通过。
- 驳回。
- 审核记录。
- 发布。

## 3. 命名约定

建议：

- 数据模型使用 PascalCase：`KnowledgePoint`。
- 服务文件使用 kebab-case：`knowledge-graph.service.ts`。
- API 路径使用 kebab-case：`/api/knowledge-points`。
- 枚举值使用 snake_case：`pending_review`。

## 4. 原型迁移建议

当前根目录静态文件：

- `index.html`
- `styles.css`
- `app.js`

后续建议移动到：

```text
prototype/
```

正式开发时不要继续在原型文件上堆复杂后端逻辑。

## 5. 文档同步

新增模块时必须更新：

- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `API_SPEC.md`
- `ACCEPTANCE_CRITERIA.md`

