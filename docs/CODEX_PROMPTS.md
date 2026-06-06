# Codex 分步开发提示词

本文档提供后续开发时可直接复制给 Codex 的任务提示词。每次只执行一个小任务，避免大项目跑偏。

## 1. 搭建正式项目骨架

```text
请先阅读 AGENTS.md、docs/TECH_STACK.md、docs/PROJECT_STRUCTURE.md、docs/MVP_SPEC.md。

任务：基于文档搭建正式 Next.js + TypeScript 项目骨架，但不要实现复杂业务。

要求：
1. 保留当前静态原型，可移动到 prototype/。
2. 创建正式 src/app 结构。
3. 创建 student、teacher、admin、review 的页面占位。
4. 创建 server 模块目录。
5. 不接入真实 AI。
6. 不把 API Key 放到前端。
7. 完成后更新 README。
```

## 2. 实现认证模块

```text
请阅读 AGENTS.md、docs/DATA_MODEL.md、docs/API_SPEC.md、docs/SECURITY_COMPLIANCE.md。

任务：实现学生注册、登录、退出和基础会话。

验收：
1. 密码必须哈希存储。
2. 不同学生数据隔离。
3. 未登录用户不能访问学生学习页。
4. 不实现老师端复杂权限，只保留角色字段。
5. 补充测试。
```

## 3. 实现知识图谱基础

```text
请阅读 docs/MVP_SPEC.md、docs/DATA_MODEL.md、docs/USER_FLOWS.md。

任务：实现知识点、知识点关系和学生端知识图谱展示。

要求：
1. 支持初三、高一、高二、高三。
2. 支持 parent 和 prerequisite 关系。
3. 图谱节点展示未测试、待巩固、已掌握。
4. 答错追溯时优先使用 prerequisite。
```

## 4. 实现题库和发布状态

```text
请阅读 docs/DATA_MODEL.md、docs/API_SPEC.md、docs/ACCEPTANCE_CRITERIA.md。

任务：实现题目数据模型、题目列表和学生端获取下一题。

硬性规则：
1. 学生端只能获取 auditStatus=published 的题目。
2. 未审核、需修改、已驳回题目不得返回给学生。
3. 每道题至少有主知识点。
4. 补充测试覆盖未发布题目不可见。
```

## 5. 实现作答和时间统计

```text
请阅读 docs/MVP_SPEC.md、docs/API_SPEC.md、docs/TEST_STRATEGY.md。

任务：实现题目开始作答和提交答案。

要求：
1. 记录 startedAt、submittedAt、durationSeconds。
2. 判断答案正确性。
3. 保存学生难度反馈 easy/medium/hard。
4. 用中位数规则生成 timeAssessment。
5. 学生端不得显示负面行为标签。
```

## 6. 实现错后学习导航

```text
请阅读 docs/USER_FLOWS.md、docs/MVP_SPEC.md、docs/GLOSSARY.md。

任务：实现答错后的错后学习导航和补救路径。

要求：
1. 答错后显示错因、前置知识、学习路径、关键提示、鼓励语。
2. 创建 RemediationPath。
3. 学生可进入前置知识点补救。
4. 补救完成后回到原知识点复测。
5. 文案不能出现“乱做”“低投入”“不认真”。
```

## 7. 实现成长型奖励

```text
请阅读 docs/PRD.md、docs/CODING_GUIDE.md、docs/ACCEPTANCE_CRITERIA.md。

任务：实现 XP、宝石、徽章、连续学习和生命值基础规则。

奖励原则：
1. 补救完成奖励高于答对普通题。
2. 错题复盘有奖励。
3. 从“难”到“会”有高价值奖励。
4. 不能鼓励刷简单题。
```

## 8. 实现学生报告

```text
请阅读 docs/USER_FLOWS.md、docs/MVP_SPEC.md、docs/DATA_MODEL.md。

任务：实现学生本次学习报告。

报告包含：
1. 做题数量。
2. 正确率。
3. 薄弱知识点。
4. 已补救知识点。
5. 核心素养表现。
6. 下一步建议。
```

## 9. 实现审核模块

```text
请阅读 docs/PRD.md、docs/API_SPEC.md、docs/AI_TASKS.md、docs/SECURITY_COMPLIANCE.md。

任务：实现题目审核最小流程。

要求：
1. 待审核题目列表。
2. 一审通过即发布。
3. 修改后通过。
4. 驳回。
5. 审核记录。
6. 学生端只看到已发布题目。
```

## 10. 实现 AI 模型配置中心

```text
请阅读 docs/AI_TASKS.md、docs/SECURITY_COMPLIANCE.md、docs/DATABASE_SCHEMA.md。

任务：实现 AI 模型配置中心。

要求：
1. 管理员可新增 DeepSeek、智谱 GLM 等模型配置。
2. API Key 加密存储。
3. 前端只显示脱敏 Key。
4. 支持测试连接。
5. 支持按任务类型配置默认模型和备用模型。
6. 不实现真实拆题业务，先完成配置和安全边界。
```

