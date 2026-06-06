# 测试策略

## 1. 测试目标

测试不只是检查页面能打开，更要确保核心教育规则不被破坏：

- 学生端不能看到未审核题目。
- AI 结果不能绕过人工审核。
- 答错后必须有错后学习导航。
- 奖励机制不能鼓励刷简单题。
- 学生端不能显示负面行为标签。
- API Key 不得泄漏到前端。

## 2. 测试层级

### 单元测试

适合测试：

- 时间评估规则。
- 奖励计算规则。
- 知识点推荐规则。
- 答案判分规则。
- 权限判断。
- 审核状态判断。

### 集成测试

适合测试：

- 登录后获取知识图谱。
- 获取下一题。
- 提交答案并保存记录。
- 答错后创建补救路径。
- 补救完成后回到原知识点。
- 审核通过后学生端可见。

### 端到端测试

适合测试完整流程：

```text
学生登录
→ 选择年级
→ 做题答错
→ 查看错后学习导航
→ 补前置知识
→ 回到原知识点复测
→ 查看报告
```

当前项目提供两个本地数据库端到端验证脚本：

- `npm run verify:all`：一键执行数据库准备、类型检查、业务测试、生产构建，并启动或复用 `4174` 端口服务，连续跑四端页面冒烟检查、演示账号登录检查、学生学习流、审核流、老师端流和管理端流。
- `npm run verify:smoke`：检查首页和 `/student`、`/teacher`、`/admin`、`/review` 四端页面可访问，并确认演示账号入口和关键页面文案存在。
- `npm run verify:demo-login`：验证学生、老师、管理员和审核员演示账号可登录，并能访问各自权限范围内的基础接口。
- `npm run verify:db-flow`：验证学生注册、作答、补救、奖励、报告和排行榜；排行榜验证使用扩大 `limit`，避免本地历史测试数据影响新学生断言。
- `npm run verify:review-flow`：验证管理员模型配置、整卷拆题、审核筛选、低置信度批处理、AI 重析、审核历史详情和一审发布。
- `npm run verify:teacher-flow`：验证老师端“我的班级”列表、显式班级授权、未绑定教师拒绝访问、老师端班级报告、题型错题讲评、核心素养讲评、年级筛选、时间范围筛选、报告导出、知识点下钻、学生个人下钻、错题清单、错题 CSV 导出、个人复盘任务分配、学生完成复盘、老师端完成反馈、课堂讲评模板和 CSV/Markdown 素材导出。
- `npm run verify:admin-flow`：验证管理端学校/班级/任课授权、教师班级角色 `teacher/head_teacher`、角色变更审计、学校级汇总和 CSV 导出、题目元数据、答案解析、核心素养标签、审核状态、知识点挂接、题库筛选、服务端筛选方案、批量预览、批量确认、批次审计检索，并确认未发布题目不进入学生端。

### 整体测试报告

每次主代理执行全量验证后，应更新 `docs/TEST_REPORT.md` 指向的最新报告。报告正文存放在 `docs/test-reports/`，文件名使用 `YYYY-MM-DD-overall-test-report.md`。

整体测试报告至少记录：

- 测试环境和代码状态。
- 数据库状态。
- 命令矩阵和最终结果。
- 核心业务红线确认。
- 失败记录与后续处理。
- 当前是否满足 MVP 验收。

报告不得记录 Cookie、API Key、密码或明文环境变量。若涉及数据库写入或种子数据导入，应在命令矩阵备注中说明测试数据库口径。

## 3. 必测业务规则

### 3.1 题目发布规则

- 未审核题目不得出现在学生端。
- 已驳回题目不得出现在学生端。
- 只有 published 题目可用于学生练习。

### 3.2 AI 审核规则

- AI 生成结果状态应为 pending_review 或 needs_review。
- AI 结果不能直接变为 published。
- 人工审核通过后才能发布。
- 人工修改后应保留 AuditRecord。
- 请求 AI 重新分析时只能创建 AI 任务和审核记录，不能发布题目。
- 审核历史应能展示变更摘要和关联 AI 任务状态。

### 3.2.1 学校与班级授权

- 管理员可以创建学校、班级，并绑定教师与学生。
- 管理员可通过安全账号目录检索教师和学生，结果不得包含密码哈希、会话凭证或模型密钥。
- 管理员可批量将多个学生加入班级；非学生账号和未找到标识应被跳过并回显。
- 管理员可以查看班级教师列表，并将教师班级角色更新为任课教师或班主任。
- 普通老师应能从 `/api/teacher/classes` 读取自己的授权班级，不能读取他人班级。
- 教师访问显式 `classId` 的班级报告、学生下钻、复盘任务和讲评素材时，必须已绑定到该班级。
- 未绑定教师访问显式班级时应返回 403。
- 学校级汇总只允许管理员访问，导出只包含安全统计字段。
- 组织维护操作应写入 `AuditRecord`。

### 3.3 错后学习导航

答错后必须包含：

- 错因。
- 推荐前置知识。
- 学习路径。
- 关键提示。
- 鼓励语。

### 3.4 学生端表达

学生端禁止出现：

- 乱做。
- 低投入。
- 偷懒。
- 不认真。

测试时可用文本扫描防止这些词出现在学生端反馈。

### 3.5 奖励规则

- 补救完成奖励高于答对普通基础题。
- 错题复盘应有奖励。
- 过快猜测不应获得高奖励。
- 难题突破应获得成长奖励。

## 4. 建议测试用例

### 用例 1：学生答错后触发补救

前置条件：

- 学生已登录。
- 当前题目已发布。
- 当前题目有 prerequisite 知识点。

步骤：

1. 学生开始作答。
2. 学生提交错误答案。
3. 系统返回反馈。

期望：

- isCorrect=false。
- 返回错后学习导航。
- 创建 RemediationPath。
- 学生端没有负面标签。

### 用例 2：补救完成后回到原知识点

步骤：

1. 学生进入补救知识点。
2. 完成补救题。
3. 标记补救路径完成。

期望：

- RemediationPath.status=completed。
- 返回原知识点 ID。
- 生成补救奖励。

### 用例 3：未审核题目不可见

前置条件：

- 数据库存在 pending_review 题目。

步骤：

1. 学生请求下一题。

期望：

- 不返回 pending_review 题目。

### 用例 4：AI 结果不能直接发布

步骤：

1. 创建 AI 知识点挂接任务。
2. AI 任务完成。

期望：

- 输出保存为候选结果。
- 题目状态进入待审核。
- 学生端不可见。

### 用例 5：API Key 不泄漏

步骤：

1. 管理员获取模型配置列表。

期望：

- 返回 provider、modelName、enabled 等信息。
- 不返回 apiKey 明文。

### 用例 6：审核筛选和 AI 重析闭环

前置条件：

- PostgreSQL 已启动。
- 已导入一套包含多题型的试卷。

步骤：

1. 管理员查看待审核题。
2. 按题型、知识点和低置信度筛选。
3. 将低置信度题批量转为需修改。
4. 对一条待审题请求 AI 重新分析。
5. 查看审核历史详情。

期望：

- 低置信度题状态变为 needs_edit。
- AI 重析生成 pending 任务。
- 审核历史包含 request_ai_retry。
- 审核历史包含 changeSummary 和关联 aiTask。
- 学生端仍不能看到未发布题目。

### 用例 7：老师端班级讲评建议

前置条件：

- PostgreSQL 已启动。
- 班级中已有学生作答记录。

步骤：

1. 老师登录。
2. 请求 `/api/teacher/classes/overview?classId=all`。
3. 查看班级诊断看板。

期望：

- 报告包含薄弱知识点。
- 报告包含 `weakQuestionTypes` 题型错题讲评。
- 报告包含 `weakCoreLiteracy` 核心素养讲评。
- 综合讲评建议能提示老师下一步讲什么、为什么讲、怎么讲。

扩展步骤：

1. 请求 `/api/teacher/classes/overview?classId=all&grade=高一`。
2. 请求未来时间范围 `/api/teacher/classes/overview?classId=all&startDate=2999-01-01&endDate=2999-01-02`。
3. 请求 `/api/teacher/classes/overview/export?classId=all`。
4. 请求 `/api/teacher/classes/knowledge-points/:id/students?classId=all`。
5. 请求 `/api/teacher/classes/students/:id/detail?classId=all`。
6. 请求 `/api/teacher/classes/students/:id/wrong-questions/export?classId=all`。
7. 向 `/api/teacher/classes/students/:id/review-tasks?classId=all` 提交错题 ID。
8. 学生请求 `/api/student/reports/latest` 查看复盘任务。
9. 学生填写复盘笔记，并请求 `/api/student/review-tasks/:id/complete` 完成复盘任务。
10. 学生从复盘任务进入同类题复测入口。
11. 学生提交带 `reviewTaskId` 的同类题复测答案。
12. 检查复测响应和学生报告中的 `nextAction`，确认学生能看到变式题或前置知识下一步行动。
13. 学生继续完成变式题挑战，检查 `nextActionReward` 和学习报告中的下一步任务完成状态。
14. 检查学生报告中的 `todayTasks`、`completedTasks` 和 `growthTimeline`，确认今日任务、已完成任务和成长轨迹正常生成。
15. 检查学生报告中的 `weeklyGrowthSummary` 和 `coreLiteracyGrowth`，确认本周成长摘要和核心素养成长摘要正常生成。
16. 检查学生报告中的 `weeklyReviewCards` 和 `milestoneBadges`，确认按周成长回顾卡片和阶段徽章正常生成。
17. 学生请求 `/api/student/core-literacy-goals` 选择一个核心素养目标，随后再次请求报告，确认 `coreLiteracyGoals` 回显已选择目标。
18. 学生在选择目标后继续完成 2 道不同已发布题目，检查只统计目标 `startedAt` 之后且非过快/非疑似猜测的作答证据，目标状态变为 `completed`，并生成 `coreLiteracyGoalHistory` 和 `literacy_progress` 奖励。
19. 学生重新开启已完成核心素养目标，检查下周期目标为 active，报告返回推荐目标和历史筛选数据。
20. 老师请求 `/api/teacher/classes/overview?classId=all&reviewStatus=assigned` 按待复盘状态筛选学生。
21. 老师请求 `/api/teacher/classes/overview?classId=all&reminderStatus=reminded` 按提醒记录筛选学生。
22. 老师批量提醒多名学生的待完成复盘任务。
23. 老师对同一学生再次调用提醒接口，验证冷却时间会跳过重复提醒。
24. 老师再次请求学生详情查看复盘完成反馈和复测结果。
25. 老师再次请求班级报告，验证 `retestSummary` 和学生个人复测建议。
26. 老师请求 `/api/teacher/classes/overview?classId=all&retestStatus=success` 按复测迁移结果筛选学生。
27. 老师再次请求班级报告，验证 `reviewTrend` 和 `reviewGroups`。
28. 老师请求 `/api/teacher/classes/overview?classId=all&reviewGroup=pending_retest`，验证可按分层复盘建议筛出待复测学生。
28. 老师请求 `/api/teacher/classes/review-followups/export?classId=all&reviewGroup=pending_retest`，验证可导出复盘跟进名单 CSV。
29. 老师向 `/api/teacher/classes/review-tasks/next-round?classId=all` 提交学生 ID 和 `taskType=variant_challenge`，验证能基于复盘跟进名单分配下一轮任务。
30. 老师再次请求 `/api/teacher/classes/overview?classId=all`，验证 `nextRoundSummary` 能统计变式题挑战和前置知识巩固任务的待完成、已完成和完成率。
31. 老师请求 `/api/teacher/classes/overview?classId=all&reviewTaskType=variant_challenge`，验证可按下一轮变式题挑战任务筛选学生。
32. 学生完成一条下一轮变式挑战任务后，老师再次请求班级报告，验证 `nextRoundSummary.taskBreakdown.completedStudents` 包含该学生。
33. 老师请求 `/api/teacher/classes/review-followups/export?classId=all&reviewTaskType=variant_challenge`，验证 CSV 包含“下一轮任务类型明细”和变式题挑战明细。
34. 老师向 `/api/teacher/classes/students/:id/review-tasks/:taskId/feedback?classId=all` 保存已完成二次任务的评价备注，验证学生详情、班级报告和导出 CSV 能显示老师备注数、完成反馈和课堂讲评建议。
35. 老师请求 `/api/teacher/classes/overview?classId=all&feedbackStatus=noted`，验证可筛出已有老师备注的学生，并返回 `teacherFeedbackSummary.teachingChecklist`。
36. 老师请求 `/api/teacher/classes/overview?classId=all&feedbackStatus=pending_feedback`，验证可筛出已完成但待写老师备注的学生。
37. 老师请求 `/api/teacher/classes/review-followups/export?classId=all&feedbackStatus=noted`，验证 CSV 包含“老师备注讲评清单”和已保存备注内容。

扩展期望：

- 年级筛选只统计对应年级题目的作答表现。
- 时间范围筛选会排除范围外的作答记录。
- 响应中的 `filters` 回显本次筛选条件，便于老师确认看板口径。
- 导出接口返回 CSV，并包含薄弱知识点、核心素养和学生摘要。
- 知识点下钻返回相关学生名单和温和的讲评建议。
- 学生个人下钻返回错题清单、个人薄弱知识点和温和的复盘建议。
- 学生错题导出返回 CSV，并包含题干和复盘建议。
- 复盘任务分配会写入补救路径记录，供后续学生端任务提醒使用。
- 学生完成复盘后写入 `completed_review:<teacherId>`、复盘笔记和 `review_completed` 奖励事件。
- 老师端班级报告可按待复盘、已复盘和暂无任务筛选学生。
- 老师端学生详情能看到待完成和已完成复盘任务数量，以及学生复盘笔记。
- 同类题复测入口仍只进入已发布题目范围。
- 同类题复测作答会回写到复盘任务，老师端能看到复测是否正确。
- 学生端会根据同类题复测结果展示下一步行动，做对后进入变式题挑战，还需巩固时回到前置知识或基础同类题。
- 学生端下一步行动会展示待完成/已完成状态，完成变式挑战或前置巩固后会写入成长型奖励，且不鼓励重复刷取。
- 学生端学习报告会返回今日任务、已完成任务和成长轨迹，页面使用激励性表达，不出现负面标签。
- 学生端学习报告会返回本周成长摘要和核心素养成长摘要，帮助学生看到成长行为和化学能力维度的积累。
- 学生端学习报告会返回按周成长回顾卡片和阶段徽章，鼓励复盘、补清和突破行为。
- 学生端可以选择一个核心素养目标，目标只保存到当前登录学生自己的学习目标记录。
- 学生端核心素养目标只统计选择之后的相关作答证据，完成后会显示完成历史并写入 `literacy_progress` 奖励。
- 老师端提醒接口会记录提醒次数和最近提醒时间，学生端提醒文案保持激励性。
- 老师端可批量提醒多名学生，且冷却期内不会重复增加提醒次数。
- 老师端可按已提醒、待提醒和提醒冷却中筛选学生。
- 老师端班级报告会汇总“已迁移成功 / 继续巩固中 / 待复测”，并给出个人复测建议。
- 老师端可按已迁移成功、继续巩固中、待复测和暂无复测任务筛选学生。
- 老师端班级报告会展示最近 7 天复盘推进趋势和分层复盘建议。
- 老师端可按继续巩固中、待复测、可挑战变式和需要分配复盘一键筛出学生名单。
- 老师端复盘跟进导出返回 CSV，并包含分层建议、复测建议、提醒次数和待复测状态。
- 老师端可基于复盘跟进名单批量分配变式挑战或前置知识巩固任务，新任务仍只使用已发布题目边界。
- 老师端班级报告会返回下一轮任务汇总，按变式题挑战和前置知识巩固展示待完成、已完成和完成率。
- 老师端可按任务类型筛选学生，定位错题复盘、变式题挑战或前置知识巩固的跟进对象。
- 老师端下一轮任务汇总会列出待完成学生和已完成学生，完成下一轮任务后名单会更新。
- 老师端复盘跟进导出会包含下一轮任务类型明细，便于线下跟进。
- 老师端可为已完成任务保存评价备注，备注只在老师端展示。
- 老师端可按任务类型生成二次任务完成反馈和课堂讲评建议，CSV 导出包含这些跟进信息。
- 老师端可按老师备注状态筛选学生，定位可讲评素材和待补备注任务。
- 老师端班级报告和复盘跟进导出会包含老师备注讲评清单，用于课堂讲评准备。
- 复盘笔记质量提示只提供方法建议，不出现负面标签。

### 用例 8：管理端题目维护

前置条件：

- PostgreSQL 已启动。
- 管理员已登录。
- 数据库中存在待审或需修改题目。

步骤：

1. 管理员进入 `/admin`。
2. 选择一条题目。
3. 修改题干、审核状态、题型、难度、中位用时和主知识点。
4. 修改答案、解析和核心素养标签。
5. 保存维护结果。
6. 按年级、题型和知识点筛选题库。
7. 命名保存当前筛选方案，并从保存方案中恢复筛选口径。
8. 导出筛选方案 JSON，再从 JSON 导入筛选方案。
9. 选择多道题，查看批量操作预览。
10. 未勾选二次确认时尝试批量提交。
11. 勾选二次确认后批量修改多道题的审核状态、难度、主知识点挂接和核心素养标签。
12. 学生端请求下一题。

期望：

- 题目元数据被更新。
- 答案、解析和核心素养标签被更新。
- 主知识点挂接来源为 `human`。
- 写入 `admin_update_question` 审核记录。
- 筛选结果符合年级、题型和主知识点条件。
- 管理端可以保存多个命名筛选方案，恢复后能继续按该口径查看题库。
- 筛选方案导入/导出只使用本地 JSON，不写入后端敏感配置。
- 批量提交前展示选中题目和目标变更预览。
- 批量提交必须完成二次确认。
- 批量维护逐题写入 `admin_batch_update_question` 审核记录，批量主知识点挂接和核心素养标签来源为 `human`。
- 管理端筛选条件刷新后仍保留。
- 非 `published` 题目不会出现在学生端。

## 5. 回归测试清单

每次改动以下模块后必须跑回归：

- 题目查询。
- 审核发布。
- AI 任务。
- 学生反馈。
- 奖励规则。
- 权限。
- 知识点关系。

## 6. 手工验收建议

每个版本发布前，至少手工走一遍：

```text
注册新学生
→ 选择初三
→ 点击知识点
→ 答错一题
→ 查看错后学习导航
→ 补救前置知识
→ 回到原知识点复测
→ 查看奖励和报告
```
