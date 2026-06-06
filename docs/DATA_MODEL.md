# 数据模型文档

本文档描述核心数据对象。正式数据库表结构可在此基础上细化。

## 1. User 用户

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 用户 ID |
| username | string | 是 | 登录名 |
| passwordHash | string | 是 | 密码哈希 |
| displayName | string | 否 | 显示名称 |
| role | enum | 是 | student、teacher、admin |
| schoolId | string | 否 | 学校 ID |
| classId | string | 否 | 班级 ID |
| status | enum | 是 | active、disabled |
| createdAt | datetime | 是 | 创建时间 |
| updatedAt | datetime | 是 | 更新时间 |

## 1.1 School / ClassGroup / TeacherClassAssignment 学校组织

School：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 学校 ID |
| name | string | 是 | 学校名称 |
| region | string | 否 | 地区 |
| status | string | 是 | active、disabled |
| createdAt | datetime | 是 | 创建时间 |
| updatedAt | datetime | 是 | 更新时间 |

ClassGroup：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 班级 ID |
| schoolId | string | 是 | 所属学校 ID |
| name | string | 是 | 班级名称 |
| grade | enum | 否 | 初三、高一、高二、高三 |
| status | string | 是 | active、disabled |
| createdAt | datetime | 是 | 创建时间 |
| updatedAt | datetime | 是 | 更新时间 |

TeacherClassAssignment：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 任教关系 ID |
| teacherId | string | 是 | 教师用户 ID |
| schoolId | string | 是 | 学校 ID |
| classId | string | 是 | 班级 ID |
| role | string | 是 | teacher、head_teacher 两类班级内角色 |
| status | string | 是 | active、disabled |
| createdBy | string | 否 | 绑定该任教关系的管理员 |
| createdAt | datetime | 是 | 创建时间 |
| updatedAt | datetime | 是 | 更新时间 |

规则：

- 管理员创建学校和班级，并将教师绑定到班级、将学生加入班级。
- 管理员可通过安全用户目录按用户名、显示名或 ID 检索教师和学生；目录只返回授权运营所需字段，不返回密码哈希、会话凭证或模型密钥。
- 管理员可以查看某班级教师绑定列表，并在 `teacher` 与 `head_teacher` 之间调整班级内角色。
- 管理员可批量将学生加入班级，服务端按用户名或 ID 解析学生账号；非学生账号和未找到标识会被跳过并回显，已加入的学生逐条写入组织审计记录。
- 教师访问显式 `classId` 的班级报告、错题清单、复盘任务和讲评素材时，必须存在有效 `TeacherClassAssignment`。
- 老师端“我的班级”列表来自有效 `TeacherClassAssignment`；普通老师不能获取未授权班级。
- 学校级汇总按 `School`、`ClassGroup`、`User`、`TeacherClassAssignment`、`AnswerRecord` 和 `RemediationPath` 聚合，只面向管理员返回安全统计字段。
- 学生归属班级通过 `User.schoolId` 和 `User.classId` 保存，便于老师端按班级聚合。
- 组织维护操作写入 `AuditRecord`，便于学校管理员追踪。

## 2. KnowledgePoint 知识点

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 知识点 ID |
| grade | enum | 是 | 初三、高一、高二、高三 |
| name | string | 是 | 知识点名称 |
| description | text | 否 | 知识点说明 |
| chapter | string | 否 | 章节 |
| difficultyLevel | enum | 否 | 基础、中等、提高、综合 |
| graphVersionId | string | 是 | 图谱版本 |
| status | enum | 是 | draft、published、archived |
| createdAt | datetime | 是 | 创建时间 |
| updatedAt | datetime | 是 | 更新时间 |

## 3. KnowledgeRelation 知识点关系

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 关系 ID |
| fromPointId | string | 是 | 起点知识点 |
| toPointId | string | 是 | 目标知识点 |
| relationType | enum | 是 | parent、prerequisite、confused_with、similar_practice、integrated_application |
| weight | number | 否 | 关系权重 |
| graphVersionId | string | 是 | 图谱版本 |

## 4. ExamPaper 试卷

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 试卷 ID |
| title | string | 是 | 试卷名称 |
| examType | enum | 是 | 中考、高考、模拟、校本 |
| year | number | 否 | 年份 |
| region | string | 否 | 地区 |
| grade | enum | 是 | 初三、高一、高二、高三 |
| sourceFileId | string | 否 | 原始试卷文件 |
| answerFileId | string | 否 | 答案文件 |
| analysisFileId | string | 否 | 解析文件 |
| copyrightStatus | enum | 是 | unknown、authorized、public_exam、restricted |
| uploadUserId | string | 是 | 上传人 |
| status | enum | 是 | uploaded、processing、reviewing、published、rejected |
| createdAt | datetime | 是 | 创建时间 |

## 5. Question 题目

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 题目 ID |
| examPaperId | string | 否 | 来源试卷 |
| questionNumber | string | 否 | 题号 |
| grade | enum | 是 | 年级 |
| examType | enum | 否 | 中考、高考等 |
| questionType | enum | 是 | single_choice、multiple_choice、fill_blank、short_answer、calculation、experiment、inference |
| stem | text | 是 | 题干 |
| options | json | 否 | 选项 |
| answer | text/json | 是 | 标准答案 |
| analysis | text | 否 | 解析 |
| score | number | 否 | 分值 |
| reviewedDifficulty | enum | 否 | 老师审核难度 |
| aiDifficulty | enum | 否 | AI 初判难度 |
| dynamicDifficultyScore | number | 否 | 动态难度分 0-100 |
| medianTimeSeconds | number | 否 | 群体中位用时 |
| sourceMeta | json | 否 | 年份、地区、来源等 |
| auditStatus | enum | 是 | ai_processing、pending_review、needs_edit、approved、rejected、published |
| createdAt | datetime | 是 | 创建时间 |
| updatedAt | datetime | 是 | 更新时间 |

## 6. QuestionKnowledgeLink 题目知识点挂接

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 挂接 ID |
| questionId | string | 是 | 题目 ID |
| knowledgePointId | string | 是 | 知识点 ID |
| linkType | enum | 是 | primary、secondary、prerequisite |
| confidence | number | 否 | AI 置信度 |
| reason | text | 否 | 挂接理由 |
| source | enum | 是 | ai、teacher、admin |
| reviewedBy | string | 否 | 审核人 |

## 7. CoreLiteracyTag 核心素养标签

可选值：

- macro_micro：宏观辨识与微观探析。
- change_balance：变化观念与平衡思想。
- evidence_model：证据推理与模型认知。
- inquiry_innovation：科学探究与创新意识。
- attitude_responsibility：科学态度与社会责任。

## 8. QuestionLiteracyLink 题目核心素养挂接

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | ID |
| questionId | string | 是 | 题目 ID |
| literacyTag | enum | 是 | 核心素养标签 |
| abilityTarget | text | 否 | 能力目标 |
| evaluationFocus | text | 否 | 评价重点 |
| confidence | number | 否 | AI 置信度 |
| source | enum | 是 | ai、teacher、admin |

## 9. AnswerRecord 答题记录

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 记录 ID |
| studentId | string | 是 | 学生 ID |
| questionId | string | 是 | 题目 ID |
| knowledgePointId | string | 否 | 当前测试知识点 |
| startedAt | datetime | 是 | 开始作答时间 |
| submittedAt | datetime | 是 | 提交时间 |
| durationSeconds | number | 是 | 作答用时 |
| selectedAnswer | text/json | 否 | 学生答案 |
| isCorrect | boolean | 是 | 是否正确 |
| difficultyFeedback | enum | 否 | easy、medium、hard |
| timeAssessment | enum | 否 | too_fast、fast、normal、slow、stuck |
| behaviorSignal | enum | 否 | fluent、thoughtful、review_needed、possible_guessing |
| triggeredRemediation | boolean | 是 | 是否触发补救 |
| createdAt | datetime | 是 | 创建时间 |

## 10. RemediationPath 补救路径

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 路径 ID |
| studentId | string | 是 | 学生 ID |
| sourceQuestionId | string | 是 | 原错题 |
| sourceKnowledgePointId | string | 是 | 原知识点 |
| targetKnowledgePointId | string | 是 | 推荐补救知识点 |
| reason | text | 是 | 推荐原因 |
| studentReviewNote | text | 否 | 学生完成错题复盘时填写的复盘笔记 |
| teacherFeedbackNote | text | 否 | 老师对已完成复盘或下一轮任务的评价备注 |
| teacherFeedbackAt | datetime | 否 | 老师保存评价备注的时间 |
| teacherFeedbackBy | string | 否 | 保存评价备注的老师 ID |
| reviewReminderCount | int | 是 | 老师温和提醒复盘的次数 |
| lastReviewReminderAt | datetime | 否 | 最近一次提醒时间 |
| retestQuestionId | string | 否 | 复盘后同类题复测题目 ID |
| retestAnswerRecordId | string | 否 | 复盘后同类题复测作答记录 ID |
| retestIsCorrect | boolean | 否 | 复盘后同类题复测是否正确 |
| retestCompletedAt | datetime | 否 | 复盘后同类题复测完成时间 |
| status | enum | 是 | active、completed、abandoned、assigned_review、completed_review |
| completedAt | datetime | 否 | 完成时间 |

## 11. RewardEvent 奖励事件

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 奖励事件 ID |
| studentId | string | 是 | 学生 ID |
| eventType | enum | 是 | streak、remediation_completed、review_completed、breakthrough、literacy_progress、question_correct |
| xp | number | 是 | XP 变化 |
| gems | number | 是 | 宝石变化 |
| badgeId | string | 否 | 解锁徽章 |
| reason | text | 是 | 奖励原因 |
| createdAt | datetime | 是 | 创建时间 |

## 11.1 LeaderboardEntry 排行榜记录

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 排行记录 ID |
| studentId | string | 是 | 学生 ID |
| scopeType | enum | 是 | class、grade、school、personal |
| scopeId | string | 是 | 班级、年级或学校 ID |
| leaderboardType | enum | 是 | growth_xp、streak、remediation、review、breakthrough、literacy_progress |
| periodType | enum | 是 | daily、weekly、monthly、term |
| periodKey | string | 是 | 周期标识，如 2026-W19 |
| score | number | 是 | 排行分 |
| rank | number | 否 | 当前排名 |
| metadata | json | 否 | 排名说明，如补救次数、突破次数 |
| updatedAt | datetime | 是 | 更新时间 |

## 11.2 StudentLearningGoal 学生学习目标

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 目标记录 ID |
| studentId | string | 是 | 学生 ID |
| goalType | string | 是 | 目标类型，如 core_literacy |
| targetKey | string | 是 | 目标键，如 evidence_model |
| periodType | string | 是 | 目标周期类型，当前支持 weekly |
| periodKey | string | 是 | 周期标识，如 2026-W20 |
| status | string | 是 | active、paused、completed |
| startedAt | datetime | 是 | 目标开始统计时间 |
| dueAt | datetime | 否 | 周期目标截止时间 |
| reopenedFromGoalId | string | 否 | 下周期重开时关联的历史目标 |
| completionSnapshot | json | 否 | 完成时的证据快照，如题目 ID、稳定作答数 |
| rewardEventId | string | 否 | 本周期目标对应的奖励事件 ID |
| completedAt | datetime | 否 | 完成时间 |
| createdAt | datetime | 是 | 创建时间 |
| updatedAt | datetime | 是 | 更新时间 |

规则：

- `core_literacy` 目标同一时间只允许一个 `active`。
- 唯一键为 `studentId + goalType + targetKey + periodType + periodKey`，便于同一目标跨周期重开。
- 目标选择后，系统只统计 `AnswerRecord.startedAt` 晚于 `StudentLearningGoal.startedAt` 的相关作答证据。
- 完成证据必须来自已发布题目；过快或疑似猜测的内部信号不计入完成证据，学生端不展示负面标签。
- 完成至少需要 2 道不同已发布题目，且至少 1 次稳定正确作答。
- 完成核心素养目标会写入 `literacy_progress` 奖励事件，同一目标周期只发一次奖。

## 11.3 QuestionFilterScheme 题库筛选方案

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 筛选方案 ID |
| name | string | 是 | 方案名称 |
| description | string | 否 | 方案说明 |
| ownerUserId | string | 否 | 个人方案归属管理员 |
| scopeType | string | 是 | personal、role、shared |
| role | string | 否 | 角色模板适用角色 |
| filters | json | 是 | 题库筛选条件 |
| sort | json | 否 | 排序偏好 |
| columns | json | 否 | 列偏好 |
| isDefault | boolean | 是 | 是否默认方案 |
| schemaVersion | number | 是 | 方案结构版本 |
| createdBy / updatedBy | string | 是/否 | 创建人与最近维护人 |
| archivedAt | datetime | 否 | 归档时间 |

规则：

- 个人方案只归属创建者。
- 角色模板和共享方案只允许管理员维护。
- 方案不保存 API Key、Cookie、密码或学生作答明细。

## 11.4 AdminBatchOperation 管理端批量操作

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 批量操作 ID |
| actorId | string | 是 | 操作者 ID |
| action | string | 是 | 操作类型，如 admin_batch_update_question |
| targetType | string | 是 | 目标类型，如 question |
| selectedCount | number | 是 | 预览命中数量 |
| affectedCount | number | 是 | 实际影响数量 |
| filtersSnapshot | json | 否 | 筛选方案或筛选条件快照 |
| selectionSnapshot | json | 否 | 题目选择快照 |
| patchSnapshot | json | 否 | 变更内容快照 |
| previewHash | string | 否 | 服务端预览 token 对应摘要 |
| reason | string | 否 | 管理员填写的批量维护原因 |
| status | string | 是 | completed、failed 等 |
| completedAt | datetime | 否 | 完成时间 |

## 12. AiModelConfig AI 模型配置

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 配置 ID |
| provider | string | 是 | DeepSeek、智谱 GLM 等 |
| apiBaseUrl | string | 是 | API Base URL |
| apiKeyEncrypted | string | 是 | 加密后的 API Key |
| modelName | string | 是 | 模型名 |
| maxContextTokens | number | 否 | 最大上下文 |
| maxOutputTokens | number | 否 | 最大输出 |
| temperature | number | 否 | 温度参数 |
| timeoutSeconds | number | 否 | 超时 |
| enabled | boolean | 是 | 是否启用 |
| createdBy | string | 是 | 创建人 |

## 13. AiTask AI 任务

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 任务 ID |
| taskType | enum | 是 | paper_split、answer_align、knowledge_link、literacy_tag、feedback_generate、path_recommend |
| status | enum | 是 | pending、running、succeeded、failed、needs_review |
| modelConfigId | string | 是 | 使用模型 |
| fallbackModelConfigId | string | 否 | 备用模型 |
| input | json | 是 | 输入 |
| output | json | 否 | 输出 |
| errorMessage | text | 否 | 错误 |
| tokenUsage | json | 否 | token 消耗 |
| createdAt | datetime | 是 | 创建时间 |
| completedAt | datetime | 否 | 完成时间 |

## 14. AuditRecord 审核记录

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 审核记录 ID |
| targetType | enum | 是 | question、knowledge_link、literacy_link、paper |
| targetId | string | 是 | 被审核对象 |
| reviewerId | string | 是 | 审核人 |
| action | enum/string | 是 | approve、edit_approve、reject、request_ai_retry、admin_batch_update_question 等 |
| batchId | string | 否 | 管理端批量操作 ID |
| beforeSnapshot | json | 否 | 修改前 |
| afterSnapshot | json | 否 | 修改后 |
| metadata | json | 否 | 批量操作、筛选方案、AI 任务等补充信息 |
| diffSummary | json | 否 | 可展示的变更摘要 |
| comment | text | 否 | 审核说明 |
| createdAt | datetime | 是 | 审核时间 |

规则：

- 管理端批量维护必须关联 `batchId`，便于按批次检索。
- 审计记录可以保存面向管理员的变更摘要，但不得保存 API Key、Cookie、密码或明文环境变量。
