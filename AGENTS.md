# Codex 项目规则

本项目是“基于中高考真题、知识图谱和化学核心素养评价的个性化学习诊断系统”。

核心定位：

> 用中高考真题诊断学生化学知识断点，并通过知识图谱给出补救路径。

## 开发前必须阅读

在实现或修改核心功能前，先阅读：

- docs/PRD.md
- docs/MVP_SPEC.md
- docs/USER_FLOWS.md
- docs/TECH_STACK.md
- docs/PROJECT_STRUCTURE.md
- docs/ARCHITECTURE.md
- docs/DATA_MODEL.md
- docs/DATABASE_SCHEMA.md
- docs/LOCAL_DATABASE.md
- docs/API_SPEC.md
- docs/AI_TASKS.md
- docs/CODING_GUIDE.md
- docs/CODEX_PROMPTS.md
- docs/LEADERBOARD.md
- docs/ACCEPTANCE_CRITERIA.md
- docs/IMPLEMENTATION_PLAN.md
- docs/TEST_STRATEGY.md
- docs/SECURITY_COMPLIANCE.md
- docs/GLOSSARY.md
- docs/DECISIONS.md

## 绝对不能违反的规则

1. 学生端只使用已审核并发布的题目。
2. AI 输出必须进入人工审核，不得直接发布。
3. 答错后必须提供错后学习导航。
4. 奖励机制奖励成长行为，不鼓励刷简单题。
5. API Key 只能保存在后端加密配置中，不能进入前端。
6. 学生端不得展示“乱做”“低投入”等负面标签。
7. 题目必须保留来源、审核状态和发布状态。
8. 知识图谱必须支持前置依赖关系。
9. 人工审核结果优先级高于 AI 结果。
10. 修改核心业务规则时必须同步更新 docs 文档。

## 当前原型说明

当前仓库中的 index.html、styles.css、app.js 是静态前端原型，用于演示：

- 注册登录。
- 年级选择。
- 知识图谱测试。
- 答错追溯。
- 奖励机制。

后续正式系统应基于 docs 文档重新规划前后端架构，不应把静态原型当成最终后端架构。

## 开发工作方式

- 每次只实现一个明确模块。
- 修改前先确认相关文档。
- 完成后说明改了哪些文件、满足哪些验收标准。
- 涉及数据字段、AI 任务或审核流程时，同步更新 docs。
- 涉及学生端反馈时，检查是否符合激励性和非负面表达原则。
