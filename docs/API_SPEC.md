# API 草案

本文档是后续正式后端的接口草案。当前静态原型不需要全部实现，但后续开发应尽量保持这些资源边界。

## 1. 通用规则

- 所有接口默认返回 JSON。
- 学生端接口只返回已发布内容。
- 管理端和老师端接口需要权限校验。
- API Key 配置接口不得返回明文 API Key。
- 所有时间使用 ISO 8601 格式。

## 2. 认证 Auth

### POST /api/auth/register

注册学生或用户。

请求：

```json
{
  "username": "student001",
  "password": "password",
  "role": "student"
}
```

响应：

```json
{
  "user": {
    "id": "u_1",
    "username": "student001",
    "role": "student",
    "displayName": "student001"
  }
}
```

注册成功后，后端写入签名的 httpOnly Cookie，用于后续识别当前学生。

### POST /api/auth/login

请求：

```json
{
  "username": "student001",
  "password": "password"
}
```

响应：

```json
{
  "user": {
    "id": "u_1",
    "username": "student001",
    "role": "student",
    "displayName": "student001"
  }
}
```

登录成功后，后端写入签名的 httpOnly Cookie。学生端不应把 token 存入 localStorage。

### GET /api/auth/me

读取当前登录用户。

响应：

```json
{
  "user": {
    "id": "u_1",
    "username": "student001",
    "role": "student",
    "displayName": "student001"
  }
}
```

### POST /api/auth/logout

清除当前登录 Cookie。

响应：

```json
{
  "ok": true
}
```

## 2.1 学校组织 Organization

### GET /api/admin/users

管理员检索安全用户目录，用于学校试点时快速绑定教师或学生。

查询参数：

- role：可选，`student`、`teacher`、`admin`。
- q：可选，按用户 ID、用户名或显示名模糊检索。
- limit：可选，默认 20，最大 50。

规则：

- 需要管理员登录。
- 只返回用户 ID、用户名、显示名、角色、学校/班级归属、状态等安全字段。
- 不返回密码哈希、会话凭证、模型密钥或其他敏感配置。

### GET /api/admin/schools

管理员读取学校列表。

规则：

- 需要管理员登录。
- 返回学校 ID、名称、地区、状态和班级数量。

### POST /api/admin/schools

管理员创建学校。

请求：

```json
{
  "name": "化学诊断示范学校",
  "region": "本地测试"
}
```

规则：

- 需要管理员登录。
- 创建后写入 `AuditRecord`，动作为 `admin_create_school`。

### GET /api/admin/classes

管理员读取班级列表。

查询参数：

- schoolId：可选，按学校筛选。

### POST /api/admin/classes

管理员创建班级。

请求：

```json
{
  "schoolId": "school_1",
  "name": "初三化学诊断班",
  "grade": "初三"
}
```

规则：

- 需要管理员登录。
- 创建后写入 `AuditRecord`，动作为 `admin_create_class`。

### GET /api/admin/classes/:id/teachers

管理员查看某班级已绑定教师。

规则：

- 需要管理员登录。
- 返回 `assignmentId`、`teacherId`、`teacherName`、`role`、`status`、`classId`、`className` 等安全字段。
- 用于管理端“班级教师角色”面板，不返回密码、会话凭证或模型密钥。

### POST /api/admin/classes/:id/teachers

管理员将教师绑定到班级。

请求：

```json
{
  "teacherId": "teacher_1",
  "role": "teacher"
}
```

规则：

- 需要管理员登录。
- `teacherId` 必须指向教师账号。
- `role` 只能是 `teacher` 或 `head_teacher`，默认 `teacher`。
- 同一教师和班级只保留一个有效任教关系。
- 写入 `TeacherClassAssignment`，并写入 `AuditRecord`，动作为 `admin_assign_teacher_class`。

### PATCH /api/admin/classes/:id/teachers

管理员更新教师在某班级内的角色。

请求：

```json
{
  "teacherId": "teacher_1",
  "role": "head_teacher"
}
```

规则：

- 需要管理员登录。
- `role` 只能是 `teacher` 或 `head_teacher`。
- 任教关系不存在时返回 404。
- 角色变更写入 `AuditRecord`，动作为 `admin_update_teacher_class_role`。

### POST /api/admin/classes/:id/students

管理员将学生加入班级。

请求：

```json
{
  "studentId": "student_1"
}
```

规则：

- 需要管理员登录。
- `studentId` 必须指向学生账号。
- 更新学生 `schoolId` 和 `classId`。
- 写入 `AuditRecord`，动作为 `admin_assign_student_class`。

### POST /api/admin/classes/:id/students/batch

管理员批量将学生加入班级。

请求：

```json
{
  "identifiers": ["student001", "student002"],
  "studentIds": ["student_1"]
}
```

规则：

- 需要管理员登录。
- `identifiers` 可为学生用户名或用户 ID，服务端会去重并限制单次最多 100 条。
- 只有学生账号会被加入班级；教师或管理员账号会被跳过并在结果中说明。
- 有效学生逐个复用单个入班流程，更新 `schoolId/classId`，并写入 `admin_assign_student_class` 审计记录。
- 返回成功数量、跳过数量、未找到标识和非学生账号列表。

### GET /api/admin/schools/summary

管理员查看学校级汇总。

查询参数：

- schoolId：可选，按学校筛选；不传时汇总全部学校。

返回：

- `totals`：学校数、班级数、学生数、教师数、作答量、正确率、补救任务数和核心素养薄弱维度。
- `schools`：每所学校的班级明细、学生数、教师数、作答量、正确率、补救任务数和核心素养薄弱维度。

规则：

- 只允许管理员访问。
- 仅返回安全统计字段，不返回题干、解析或敏感配置。

### GET /api/admin/schools/summary/export

管理员导出学校级汇总 CSV。

规则：

- 与 `/api/admin/schools/summary` 使用相同权限和筛选口径。
- 导出内容只包含学校、班级和核心素养统计字段。

## 3. 知识图谱 Knowledge Graph

### GET /api/grades/:grade/knowledge-graph

获取某年级已发布知识图谱。

响应：

```json
{
  "grade": "初三",
  "versionId": "kg_v1",
  "nodes": [
    {
      "id": "acid_base",
      "name": "酸碱盐基础",
      "status": "published"
    }
  ],
  "relations": [
    {
      "fromPointId": "indicator",
      "toPointId": "acid_base",
      "relationType": "prerequisite"
    }
  ]
}
```

### POST /api/admin/knowledge-points

管理员新增知识点。

### PATCH /api/admin/knowledge-points/:id

管理员修改知识点。

### POST /api/admin/knowledge-relations

管理员新增知识点关系。

## 4. 题目 Questions

### GET /api/student/questions/next

获取学生下一道诊断题。

查询参数：

- grade
- knowledgePointId
- mode：diagnosis、remediation、review

响应：

```json
{
  "question": {
    "id": "q_1",
    "stem": "题干",
    "options": [
      {"label": "A", "text": "选项 A"}
    ],
    "questionType": "single_choice",
    "difficulty": "基础",
    "medianTimeSeconds": 25,
    "primaryKnowledgePointId": "G10-001",
    "prerequisiteKnowledgePointIds": ["G10-002"],
    "coreLiteracy": ["evidence_model"],
    "abilityTarget": "能提取题干证据并建立解题模型。"
  }
}
```

规则：

- 只返回 auditStatus=published 的题目。
- 不返回未审核题目。

### GET /api/admin/questions

管理员查询题库。

支持筛选：

- status：审核状态。
- grade：年级，支持 `初三`、`高一`、`高二`、`高三`。
- questionType：题型，支持 single_choice、multiple_choice、fill_blank、short_answer、calculation、experiment、inference。
- knowledgePointId：按人工确认或当前主知识点筛选。

规则：

- 需要管理员登录。
- 返回题目审核状态、题型、难度、中位用时、主知识点和核心素养标签。
- 管理端筛选方案可保存到服务端，支持个人方案、角色模板和共享方案。
- 管理端页面仍可导出/导入筛选方案 JSON，用于跨浏览器迁移常用筛选口径；导入后需走服务端保存才可用于批量预览。

### GET /api/admin/question-filter-schemes

管理员读取题库筛选方案。

规则：

- 需要管理员登录。
- 返回当前管理员自己的 `personal` 方案、当前角色可用的 `role` 模板和所有 `shared` 方案。
- 不返回 API Key、学生作答记录或未发布题目的敏感审核内容。

### POST /api/admin/question-filter-schemes

管理员保存题库筛选方案。

请求：

```json
{
  "name": "高一待维护选择题",
  "scopeType": "personal",
  "filters": {
    "status": "needs_edit",
    "grade": "高一",
    "questionType": "single_choice",
    "knowledgePointId": "acid_base"
  }
}
```

规则：

- `scopeType` 支持 `personal`、`role`、`shared`。
- `role` 模板只能由管理员维护，供同角色管理员复用。
- `filters` 只保存筛选口径，不保存学生 Cookie、密码、API Key 或明文环境变量。

### PATCH /api/admin/question-filter-schemes/:id

管理员更新可访问的筛选方案。

### DELETE /api/admin/question-filter-schemes/:id

管理员归档可访问的筛选方案。

### GET /api/admin/knowledge-points

管理员查询知识点。

查询参数：

- grade：可选。

### POST /api/admin/knowledge-points

管理员新增知识点。

请求：

```json
{
  "grade": "初三",
  "name": "金属活动性",
  "description": "判断金属与酸、盐溶液反应的规律。",
  "x": 64,
  "y": 68
}
```

### GET /api/admin/knowledge-relations

管理员查询知识图谱关系。

### POST /api/admin/knowledge-relations

管理员新增知识图谱关系。

请求：

```json
{
  "fromPointId": "acid_base",
  "toPointId": "metal_activity",
  "relationType": "prerequisite"
}
```

### PATCH /api/admin/questions/:id

修改题目。

权限：

- 需要管理员登录。

请求：

```json
{
  "stem": "题干文本",
  "answer": "参考答案",
  "analysis": "解析文本",
  "auditStatus": "needs_edit",
  "questionType": "short_answer",
  "difficulty": "advanced",
  "medianTimeSeconds": 88,
  "primaryKnowledgePointId": "indicator",
  "coreLiteracy": ["evidence_model", "inquiry_innovation"]
}
```

规则：

- 可维护题干、答案、解析、审核状态、题型、人工难度、中位用时、主知识点挂接和核心素养标签。
- 修改主知识点时，挂接来源记为 `human`，人工挂接优先于 AI 挂接。
- 修改核心素养标签时，旧标签会被人工确认结果替换，来源记为 `human`。
- 每次修改必须写入 `AuditRecord`，动作为 `admin_update_question`。
- 如果管理员把题目改为 `pending_review`、`needs_edit` 或 `rejected`，学生端仍不可见；学生练习接口只读取 `published` 题目。
- 该接口不修改 API Key、AI 模型配置或学生作答记录。

响应：

```json
{
  "question": {
    "id": "q_1",
    "stem": "题干文本",
    "answer": "参考答案",
    "analysis": "解析文本",
    "auditStatus": "needs_edit",
    "questionType": "short_answer",
    "difficulty": "advanced",
    "medianTimeSeconds": 88,
    "primaryKnowledgePointId": "indicator",
    "coreLiteracy": ["evidence_model", "inquiry_innovation"]
  }
}
```

### POST /api/admin/questions/batch-preview

管理员批量维护前生成服务端预览。

请求：

```json
{
  "questionIds": ["q_1", "q_2"],
  "filterSchemeId": "qfs_1",
  "patch": {
    "auditStatus": "needs_edit",
    "difficulty": "medium",
    "primaryKnowledgePointId": "acid_base",
    "coreLiteracy": ["macro_micro", "attitude_responsibility"]
  }
}
```

规则：

- 需要管理员登录。
- 可用 `questionIds` 或服务端 `filterSchemeId` 命中题目。
- 响应返回 `previewToken`、命中数量、变更摘要和逐题差异。
- 预览阶段不写入题目、不发布题目、不写入学生记录。
- 批量维护不允许把题目直接改为 `published`，避免绕过一审审核。

### POST /api/admin/questions/batch-update

管理员批量维护题目审核状态、难度和主知识点挂接。

权限：

- 需要管理员登录。

请求：

```json
{
  "questionIds": ["q_1", "q_2"],
  "filterSchemeId": "qfs_1",
  "patch": {
    "auditStatus": "needs_edit",
    "difficulty": "medium",
    "primaryKnowledgePointId": "acid_base",
    "coreLiteracy": ["macro_micro", "attitude_responsibility"]
  },
  "previewToken": "preview_xxx",
  "reason": "批量维护题目元数据",
  "confirmText": "确认批量更新"
}
```

规则：

- 支持管理员批量维护审核状态、人工难度、主知识点挂接和核心素养标签。
- 必须先调用 `/api/admin/questions/batch-preview` 生成 `previewToken`。
- 提交时必须填写原因和确认文本 `确认批量更新`。
- 管理端页面提交前应展示服务端批量操作预览，列出命中题目和即将写入的状态、难度、知识点与核心素养变更。
- 批量修改主知识点时，挂接来源记为 `human`，人工结果优先于 AI 结果。
- 批量修改核心素养标签时，旧标签会被人工确认结果替换，来源记为 `human`。
- 每道被修改的题目都必须写入 `AuditRecord`，动作为 `admin_batch_update_question`，并关联批量操作 ID。
- 批量改为非 `published` 后，学生端仍不可见。
- 批量维护不得把题目直接改为 `published`。

响应：

```json
{
  "result": {
    "updatedCount": 2,
    "affectedCount": 2,
    "batchOperationId": "batch_xxx",
    "previewToken": "preview_xxx"
  }
}
```

### GET /api/admin/audit-records

管理员检索审计记录。

查询参数：

- batchId：批量操作 ID。
- targetId：题目或其他目标 ID。
- action：审计动作。
- limit：返回数量，默认受服务端限制。

规则：

- 仅管理员可访问完整审计检索。
- 响应可用于从批量操作结果跳转查看同批次审计记录。

### POST /api/admin/questions/:id/publish

发布题目。必须有审核权限。

## 4.1 审核 Review

### GET /api/review/questions

查询待审核题目。

权限：

- 需要老师或管理员登录。

查询参数：

- status：默认 pending_review。
- source：ai、human、seed、exam_paper，可选；`exam_paper` 表示整卷导入生成的待审核题。
- confidence：all、low、normal，可选。
- questionType：single_choice、multiple_choice、fill_blank、short_answer、calculation、experiment、inference，可选。
- knowledgePointId：按主知识点或前置知识点筛选，可选。
- questionId：按题目 ID 精确定位，可选，主要用于审核历史联动定位。

响应：

```json
{
  "questions": [
    {
      "id": "q_1",
      "auditStatus": "pending_review",
      "stem": "题干",
      "primaryKnowledgePointId": "acid_base",
      "coreLiteracy": ["change_balance"]
    }
  ]
}
```

### POST /api/review/questions/:id/approve

一审通过并发布题目。

规则：

- 需要老师或管理员登录。
- 通过后题目状态变为 published。
- 必须写入审核记录。
- 学生端只会读取 published 题目。

### POST /api/review/questions/:id/edit-and-approve

人工修正后通过并发布题目。

请求：

```json
{
  "comment": "修正题干表述后发布",
  "patch": {
    "stem": "修正后的题干",
    "answer": "B",
    "analysis": "修正后的解析",
    "primaryKnowledgePointId": "change",
    "coreLiteracy": ["change_balance"],
    "abilityTarget": "能从是否生成新物质判断变化类型。"
  }
}
```

规则：

- 需要老师或管理员登录。
- 保存人工修正内容。
- 写入审核记录。
- 发布后学生端可见。

### POST /api/review/questions/batch-approve

批量一审通过。

请求：

```json
{
  "ids": ["q_1", "q_2"],
  "comment": "批量一审通过"
}
```

规则：

- 需要老师或管理员登录。
- 仅用于审核员确认无误的候选题。
- 每道题仍需写入审核记录。

### POST /api/review/questions/batch-needs-edit

将一批题目转为需修改，适用于低置信度或结构待核对题。

请求：

```json
{
  "ids": ["q_1", "q_2"],
  "comment": "低置信度题目批量转为需修改"
}
```

规则：

- 需要老师或管理员登录。
- 状态变为 `needs_edit`。
- 不会发布到学生端。
- 每道题仍需写入审核记录。

### GET /api/review/audit-records

获取最近审核历史。

查询参数：

- limit：默认 30。

规则：

- 需要老师或管理员登录。
- 返回审核动作摘要、变更摘要和可公开的关联 AI 任务状态，不返回敏感配置。
- `changeSummary` 用于展示题目状态、题干、答案、解析、知识点和核心素养的关键变化。
- `aiTask` 仅在审核记录关联 AI 重析任务时返回。
- `filterHints` 用于审核台快速筛选同题、同知识点或同题型待审题。

响应示例：

```json
{
  "records": [
    {
      "id": "aud_xxx",
      "targetType": "question",
      "targetId": "q_xxx",
      "reviewerId": "user_xxx",
      "action": "request_ai_retry",
      "changeSummary": ["已创建 AI 重析任务：ait_xxx"],
      "filterHints": {
        "questionId": "q_xxx",
        "auditStatus": "pending_review",
        "knowledgePointId": "change",
        "questionType": "single_choice"
      },
      "aiTask": {
        "id": "ait_xxx",
        "taskType": "knowledge_linking",
        "status": "pending"
      }
    }
  ]
}
```

### POST /api/review/questions/:id/reject

驳回题目。

规则：

- 需要老师或管理员登录。
- 驳回后题目状态变为 rejected。
- 驳回题不会进入学生端。

## 5. 作答 Answers

### POST /api/student/answers/start

记录题目开始作答。

请求：

```json
{
  "questionId": "q_1",
  "knowledgePointId": "acid_base"
}
```

响应：

```json
{
  "answerSessionId": "as_1",
  "startedAt": "2026-05-09T12:00:00.000Z"
}
```

### POST /api/student/answers/submit

提交答案。

请求：

```json
{
  "questionId": "q_1",
  "selectedAnswer": "B",
  "durationSeconds": 42,
  "difficultyFeedback": "hard",
  "startedAt": "2026-05-09T12:00:00.000Z",
  "reviewTaskId": "rp_1"
}
```

规则：

- 已登录学生优先使用服务端 Cookie 中的学生 ID。
- 未登录体验模式可临时作答，但正式持久化需要登录。
- 前端不得用传入 studentId 覆盖已登录学生身份。
- 如果请求包含 `reviewTaskId`，系统会把本次作答作为该复盘任务的同类题复测结果回写到 `RemediationPath`。
- 复测回写只能写入当前登录学生自己的复盘任务，且题目仍必须是 `published`。
- 如果本次作答是同类题复测，响应会返回 `retest.nextAction`，用于告诉学生下一步进入变式题、再补前置知识或先做基础巩固。
- 如果学生完成了复测后的下一步行动，响应可返回 `retest.nextActionReward`，用于奖励变式题挑战或前置知识巩固；同类奖励会防止重复刷取。

响应：

```json
{
  "isCorrect": false,
  "answer": "A",
  "analysis": "解析",
  "durationSeconds": 8,
  "timeAssessment": "too_fast",
  "studentFeedback": "这题提交得有点快，建议先抓关键词。",
  "remediation": {
    "needed": true,
    "targetKnowledgePointId": "indicator",
    "pathText": "先复习「酸碱指示剂」→ 做 2 道基础题 → 回到「酸碱盐基础」复测。"
  },
  "reward": {
    "xp": 0,
    "gems": 0,
    "reason": "完成复盘后可获得成长奖励"
  },
  "retest": {
    "reviewTaskId": "rp_1",
    "recorded": true,
    "isCorrect": false,
    "nextAction": {
      "actionType": "revisit_prerequisite",
      "title": "再补一个前置知识点",
      "detail": "这次复测提示还有一个关键条件值得再补清。先回到前置知识点，再做短题确认。",
      "targetKnowledgePointId": "indicator",
      "status": "available",
      "rewardText": "巩固成功可获得补救奖励"
    },
    "nextActionReward": {
      "eventType": "remediation_completed",
      "xp": 20,
      "gems": 3,
      "reason": "完成前置知识巩固，把关键条件补得更稳"
    }
  }
}
```

## 6. 补救路径 Remediation

### POST /api/student/remediation/start

开始补救路径。

请求：

```json
{
  "sourceQuestionId": "q_1",
  "sourceKnowledgePointId": "acid_base",
  "targetKnowledgePointId": "indicator"
}
```

### POST /api/student/remediation/:id/complete

完成补救路径。

响应：

```json
{
  "status": "completed",
  "returnToKnowledgePointId": "acid_base",
  "reward": {
    "xp": 20,
    "gems": 3,
    "reason": "补清前置知识"
  }
}
```

## 7. 学习报告 Reports

### GET /api/student/reports/latest

获取学生最近一次学习报告。

响应包含：

- 学生作答统计、奖励统计、薄弱知识点和下一步建议。
- `reviewTasks`：老师分配的错题复盘任务。学生端只展示源题仍为 `published` 的任务。
- 已完成复盘任务可返回 `reviewNote`，用于学生回看自己的复盘笔记和老师端查看复盘质量。
- 已完成同类题复测的任务可返回 `nextAction`，用于学生端展示“进入变式题挑战”或“再补一个前置知识点”，并标记下一步任务 `available` 或 `completed`。
- `todayTasks`：从复盘任务和下一步行动中整理出的今日待办任务，便于学生直接开始复盘、复测、变式挑战或前置巩固。
- `completedTasks`：已完成的复盘任务和下一步行动，用于学生回看自己的进步。
- `growthTimeline`：最近奖励事件形成的累计成长轨迹，展示 XP、宝石和成长原因。
- `weeklyGrowthSummary`：最近 7 天成长摘要，统计 XP、宝石、复盘、补救、突破和核心素养进步事件，并给出下一步建议。
- `weeklyReviewCards`：按复盘推进、前置补清、从难到会生成周成长回顾卡片。
- `coreLiteracyGrowth`：按化学核心素养维度生成的成长摘要，展示作答次数、正确次数、当前积累状态、鼓励语和下一步行动。
- `coreLiteracyGoals`：可选择的核心素养目标，学生可把其中一个设为本周目标；支持多周期、完成后下周期重开，达成后状态变为 `completed`。
- `coreLiteracyGoalRecommendation`：推荐下一核心素养目标，给出推荐理由和行动按钮文案。
- `coreLiteracyGoalHistory`：核心素养目标历史记录，支持展示进行中、已切换、已完成目标，包含周期和奖励说明。
- `milestoneBadges`：阶段性鼓励徽章，围绕复盘启动、本周成长、变式突破和诊断起步生成。

响应示例节选：

```json
{
  "report": {
    "todayTasks": [
      {
        "taskId": "rp_1",
        "title": "进入变式题挑战",
        "detail": "同类题已经迁移成功，可以尝试一道变式题，把方法用到新情境。",
        "knowledgePointName": "酸碱盐基础",
        "actionType": "challenge_variant",
        "status": "todo",
        "ctaLabel": "开始任务"
      }
    ],
    "completedTasks": [
      {
        "taskId": "rp_1",
        "title": "完成错题复盘",
        "detail": "复盘笔记：我会先找题干条件。",
        "status": "done"
      }
    ],
    "growthTimeline": [
      {
        "eventType": "breakthrough",
        "label": "从难到会突破",
        "xp": 30,
        "gems": 5,
        "reason": "完成变式题挑战，把方法迁移到新情境"
      }
    ],
    "weeklyGrowthSummary": {
      "windowDays": 7,
      "xp": 45,
      "gems": 7,
      "rewardCount": 2,
      "completedReviewCount": 1,
      "remediationCount": 0,
      "breakthroughCount": 1,
      "literacyProgressCount": 0,
      "consistencyText": "本周已经出现“从难到会”的突破记录。",
      "suggestion": "可以挑一道相近情境的题再练一次，把这次突破固定下来。"
    },
    "weeklyReviewCards": [
      {
        "cardId": "breakthrough",
        "title": "从难到会",
        "focus": "用变式题确认方法能迁移",
        "evidenceText": "本周已经有 1 次突破记录。",
        "ctaLabel": "巩固突破"
      }
    ],
    "coreLiteracyGrowth": [
      {
        "literacyTag": "evidence_model",
        "label": "证据推理与模型认知",
        "answerCount": 3,
        "correctCount": 2,
        "accuracy": 67,
        "growthLevel": "building",
        "encouragement": "「证据推理与模型认知」正在积累，多说清证据和步骤，进步会更明显。",
        "nextAction": "先圈出题干证据，再说模型和结论。"
      }
    ],
    "coreLiteracyGoals": [
      {
        "literacyTag": "evidence_model",
        "label": "证据推理与模型认知",
        "selected": true,
        "status": "selected",
        "periodType": "weekly",
        "periodKey": "2026-W20",
        "targetText": "本周目标：围绕「证据推理与模型认知」完成 2 次有证据的表达。",
        "progressText": "已有 3 次相关作答，稳定作答 2 次。",
        "nextAction": "先圈出题干证据，再说模型和结论。"
      }
    ],
    "coreLiteracyGoalRecommendation": {
      "literacyTag": "evidence_model",
      "label": "证据推理与模型认知",
      "reason": "建议继续完成「证据推理与模型认知」目标，系统会优先看你开始目标后的稳定作答证据。",
      "ctaLabel": "继续当前目标"
    },
    "coreLiteracyGoalHistory": [
      {
        "goalId": "goal_1",
        "literacyTag": "evidence_model",
        "label": "证据推理与模型认知",
        "status": "completed",
        "periodType": "weekly",
        "periodKey": "2026-W20",
        "startedAt": "2026-05-17T10:00:00.000Z",
        "dueAt": "2026-05-17T15:59:59.999Z",
        "completedAt": "2026-05-17T10:30:00.000Z",
        "rewardText": "完成「证据推理与模型认知」目标，获得核心素养进步奖励。"
      }
    ],
    "milestoneBadges": [
      {
        "badgeId": "breakthrough",
        "title": "变式突破",
        "description": "完成一次从同类题到变式题的迁移。",
        "unlocked": true,
        "progressText": "已经完成变式挑战。"
      }
    ]
  }
}
```

### POST /api/student/core-literacy-goals

学生选择或重新开启核心素养目标。

权限：

- 需要学生登录。

请求：

```json
{
  "literacyTag": "evidence_model",
  "periodType": "weekly",
  "action": "start"
}
```

响应：

```json
{
  "goal": {
    "literacyTag": "evidence_model",
    "label": "证据推理与模型认知",
    "selected": true,
    "status": "selected",
    "periodType": "weekly",
    "periodKey": "2026-W20",
    "targetText": "本周目标：围绕「证据推理与模型认知」完成 2 次有证据的表达。",
    "progressText": "已有 3 次相关作答，稳定作答 2 次。",
    "nextAction": "先圈出题干证据，再说模型和结论。"
  }
}
```

规则：

- 只能设置当前登录学生自己的目标。
- 同一时间只保留一个 active 的核心素养目标。
- `action=start` 选择当前周目标，`action=reopen` 为已完成目标开启下一周期。
- 目标完成只统计 `AnswerRecord.startedAt` 晚于目标 `startedAt` 的作答。
- 完成证据必须来自 `published` 题目，过快或疑似猜测的内部信号不计入完成证据；学生端不展示负面标签。
- 完成至少需要 2 道不同已发布题目，且至少 1 次稳定正确作答。
- 同一目标周期只发放一次 `literacy_progress` 奖励。
- 学生端文案保持鼓励和行动建议，不展示负面行为标签。

### GET /api/student/core-literacy-goals

学生筛选核心素养目标历史。

查询参数：

- status：`active`、`paused`、`completed`、`all`。
- literacyTag：核心素养标签。
- periodType：当前支持 `weekly`。
- from / to：按目标开始时间筛选。
- limit：返回数量。

响应：

```json
{
  "history": [
    {
      "goalId": "goal_1",
      "literacyTag": "evidence_model",
      "label": "证据推理与模型认知",
      "status": "completed",
      "periodType": "weekly",
      "periodKey": "2026-W20",
      "rewardText": "完成「证据推理与模型认知」目标，获得核心素养进步奖励。"
    }
  ]
}
```

### GET /api/student/leaderboard

学生成长排行榜。

查询参数：

- limit：可选，1 到 100，默认由服务端决定。

规则：

- 排行榜按成长 XP 聚合，重点反映补救、复盘、突破和核心素养进步，不以答题数量为主要依据。
- 学生端不展示负面排名文案。

### GET /api/student/review-tasks

获取当前学生的错题复盘任务。

权限：

- 需要学生登录。

响应：

```json
{
  "tasks": [
    {
      "id": "rp_1",
      "questionId": "q_1",
      "stem": "题干",
      "knowledgePointName": "酸碱盐基础",
      "status": "assigned",
      "reviewNote": "我会先找题干条件，再判断对应知识点。",
      "nextAction": {
        "actionType": "same_type_retest",
        "title": "做一题同类题复测",
        "detail": "复盘已经完成，接下来用一题同类题确认是否真正会迁移。",
        "status": "available",
        "rewardText": "先完成同类题复测，再进入下一步任务"
      },
      "encouragement": "先回看错因和知识点，再用自己的话说出关键步骤。"
    }
  ]
}
```

规则：

- 只返回当前登录学生自己的任务。
- 只返回源题仍为 `published` 的任务。
- 学生端展示必须使用激励性表达，不出现“乱做”“低投入”等负面标签。

### POST /api/student/review-tasks/:id/complete

学生标记完成错题复盘任务。

权限：

- 需要学生登录。

请求：

```json
{
  "reviewNote": "我会先找题干条件，再判断对应知识点。"
}
```

响应：

```json
{
  "result": {
    "task": {
      "id": "rp_1",
      "status": "completed"
    },
    "reward": {
      "xp": 15,
      "gems": 2,
      "reason": "完成错题复盘"
    }
  }
}
```

规则：

- 只能完成当前登录学生自己的 `assigned_review:<teacherId>` 任务。
- 完成后任务状态改为 `completed_review:<teacherId>`，写入 `completedAt`，并保存学生复盘笔记。
- 完成错题复盘写入 `review_completed` 奖励事件。
- 同一任务不能重复领取复盘奖励。
- 学生端可从复盘任务进入同知识点/同类题复测入口，但仍只能读取 `published` 题目；提交后会回写 `retestQuestionId`、`retestAnswerRecordId`、`retestIsCorrect` 和 `retestCompletedAt`。
- 学生端会根据同类题复测结果展示下一步行动：做对后进入变式题挑战；还需巩固时回到前置知识或基础同类题。
- 学生端应对复盘笔记给出方法性提示，例如引导学生写清错因、证据、条件和下次步骤，不使用负面评价。

## 老师端 Teacher

老师端所有带 `classId` 的接口适用同一权限规则：管理员可查看全部；教师访问显式班级 ID 时必须已绑定到该班级。`all/default` 仅允许管理员用于全局统计，教师账号必须使用明确班级 ID。

### GET /api/teacher/classes

老师端读取“我的班级”列表。

规则：

- 需要老师或管理员登录。
- 普通老师只返回自己有效任教关系绑定的班级，包含 `classId`、学校、班级、年级、班级内角色和基础人数统计。
- 管理员返回 `all` 全局口径和全部班级列表，用于管理侧排查和全局统计。
- 该接口只提供授权入口；具体报告、下钻、导出、复盘任务和讲评素材仍由各业务接口再次校验 `classId`。

### GET /api/teacher/classes/overview

老师获取班级报告。

权限：

- 需要老师或管理员登录。
- 教师访问显式班级 ID 时，必须已通过 `TeacherClassAssignment` 绑定到该班级；管理员可查看全部班级。
- `all/default` 仅允许管理员用于全局统计，教师账号必须使用明确班级 ID 做数据隔离。

查询参数：

- classId：班级 ID；管理员可传 `all` 查看全部学生汇总。
- grade：可选，支持 `初三`、`高一`、`高二`、`高三`，用于按题目年级筛选班级作答表现。
- reviewStatus：可选，支持 `assigned`、`completed`、`none`，用于按复盘任务状态筛选学生列表。
- reminderStatus：可选，支持 `reminded`、`not_reminded`、`cooldown`，用于按复盘提醒记录筛选学生列表。
- retestStatus：可选，支持 `success`、`needs_consolidation`、`pending`、`none`，用于按同类题复测结果筛选学生列表。
- reviewGroup：可选，支持 `needs_consolidation`、`pending_retest`、`ready_for_challenge`、`needs_assignment`，用于按分层复盘建议一键筛选学生列表。
- reviewTaskType：可选，支持 `review`、`variant_challenge`、`prerequisite_consolidation`，用于按错题复盘、变式题挑战或前置知识巩固任务筛选学生列表。
- feedbackStatus：可选，支持 `noted`、`pending_feedback`，用于按已有老师备注或待写老师备注筛选学生列表。
- startDate：可选，ISO 日期或 `YYYY-MM-DD`，用于筛选该日期之后的作答、补救和奖励记录。
- endDate：可选，ISO 日期或 `YYYY-MM-DD`，用于筛选该日期之前的作答、补救和奖励记录。

响应包含：

- `filters`：本次报告实际使用的年级、时间范围、复盘状态、提醒状态、复测结果、复盘分层、任务类型和备注状态筛选。
- 班级学生数、作答数、正确率、补救路径数、平均用时。
- `weakKnowledgePoints`：薄弱知识点排行和讲评建议。
- `weakQuestionTypes`：题型维度错题讲评，包括错误率和审题建议。
- `weakCoreLiteracy`：化学核心素养维度讲评，包括错误率和能力落点建议。
- `retestSummary`：同类题复测迁移汇总，包含已迁移成功、继续巩固中、待复测、复测成功率和班级建议。
- `reviewTrend`：最近 7 天复盘推进趋势，包含分配、完成、提醒和复测数量。
- `reviewGroups`：分层复盘建议，帮助老师定位继续巩固、待复测、可挑战变式和需要分配复盘的学生群体。
- `nextRoundSummary`：下一轮复盘任务汇总，按变式题挑战和前置知识巩固统计待完成、已完成、完成率、待完成学生名单、已完成学生名单、老师备注数、完成反馈和课堂讲评建议。
- `teacherFeedbackSummary`：老师备注讲评清单，包含已有备注数、待写备注数、讲评建议和最近可用于课堂讲评的备注素材。
- `students`：学生个人摘要，包含待复盘数量、已复盘数量、提醒次数、可提醒任务数、最近提醒时间、复测迁移结果、下一轮任务类型数量、老师备注数量、待写备注数量和个人建议。
- `teachingSuggestions`：综合讲评建议。

响应示例：

```json
{
  "report": {
    "filters": {
      "grade": "高一",
      "startDate": "2026-05-01T00:00:00.000Z",
      "endDate": "2026-05-13T15:59:59.999Z"
    },
    "studentCount": 32,
    "answerCount": 180,
    "accuracy": 68,
    "weakQuestionTypes": [
      {
        "questionType": "experiment",
        "label": "实验题",
        "wrongRate": 42,
        "suggestion": "围绕变量控制、现象记录、证据解释组织讲评。"
      }
    ],
    "weakCoreLiteracy": [
      {
        "literacyTag": "evidence_model",
        "label": "证据推理与模型认知",
        "wrongRate": 37,
        "suggestion": "要求学生先说证据，再说模型，最后给结论。"
      }
    ],
    "retestSummary": {
      "completedCount": 12,
      "successfulCount": 8,
      "needsConsolidationCount": 4,
      "pendingCount": 9,
      "successRate": 67,
      "suggestion": "优先跟进“继续巩固中”的学生，先补关键概念，再安排一道更短的同类题复测。"
    },
    "reviewTrend": {
      "windowDays": 7,
      "assignedCount": 18,
      "completedCount": 9,
      "remindedCount": 7,
      "retestedCount": 6,
      "suggestion": "近期复盘完成数高于复测数，建议把已完成复盘的学生推进到同类题迁移检查。"
    },
    "reviewGroups": [
      {
        "groupKey": "pending_retest",
        "label": "待复测",
        "studentCount": 9,
        "suggestion": "优先完成一题同类题迁移检查，确认复盘是否真正转化为会做。"
      }
    ],
    "nextRoundSummary": {
      "variantAssignedCount": 4,
      "variantCompletedCount": 2,
      "prerequisiteAssignedCount": 3,
      "prerequisiteCompletedCount": 1,
      "totalAssignedCount": 7,
      "totalCompletedCount": 3,
      "completionRate": 30,
      "suggestion": "还有 7 个下一轮任务待完成，建议先按任务类型筛选学生，集中提醒和跟进。",
      "taskBreakdown": [
        {
          "taskType": "variant_challenge",
          "label": "变式题挑战",
          "assignedCount": 4,
          "completedCount": 2,
          "completionRate": 33,
          "teacherFeedbackCount": 1,
          "completionFeedback": "2 个变式挑战任务已经完成，仍有 4 个待完成，可先形成一组示范反馈。",
          "teachingSuggestion": "优先请完成变式挑战的学生说明题干证据如何迁移，再补充一个新情境追问。",
          "assignedStudents": [
            {
              "studentId": "u_1",
              "displayName": "小明",
              "taskCount": 1,
              "latestTaskAt": "2026-05-17T08:00:00.000Z"
            }
          ],
          "completedStudents": [
            {
              "studentId": "u_2",
              "displayName": "小红",
              "taskCount": 1,
              "latestTaskAt": "2026-05-17T09:00:00.000Z"
            }
          ]
        }
      ]
    },
    "teacherFeedbackSummary": {
      "notedCount": 1,
      "pendingFeedbackCount": 3,
      "suggestion": "已有老师备注可用于课堂讲评，建议按任务类型挑选共性方法进行短讲。",
      "teachingChecklist": [
        {
          "studentId": "u_2",
          "displayName": "小红",
          "taskTypeLabel": "变式题挑战",
          "knowledgePointName": "氧化还原反应",
          "feedbackNote": "后续讲评可请学生说明题干证据如何迁移。",
          "teachingSuggestion": "优先请完成变式挑战的学生说明题干证据如何迁移，再补充一个新情境追问。",
          "feedbackAt": "2026-05-17T09:20:00.000Z"
        }
      ]
    }
  }
}
```

### GET /api/teacher/classes/overview/export

老师导出当前筛选口径下的班级报告 CSV。

权限：

- 需要老师或管理员登录。

查询参数：

- 与 `/api/teacher/classes/overview` 相同，支持 `classId`、`grade`、`reviewStatus`、`reminderStatus`、`retestStatus`、`reviewGroup`、`reviewTaskType`、`feedbackStatus`、`startDate`、`endDate`。

规则：

- 导出内容包含班级概览、薄弱知识点、题型讲评、核心素养讲评、下一轮任务汇总、下一轮任务类型明细、老师备注讲评清单、完成反馈、课堂讲评建议、老师备注数、待写备注数和学生摘要。
- 导出接口只返回老师端可见汇总与建议，不包含 API Key 或未发布题目的审核内容。

### GET /api/teacher/classes/review-followups/export

老师导出当前筛选口径下的复盘跟进名单 CSV。

权限：

- 需要老师或管理员登录。

查询参数：

- 与 `/api/teacher/classes/overview` 相同，支持 `classId`、`grade`、`reviewStatus`、`reminderStatus`、`retestStatus`、`reviewGroup`、`reviewTaskType`、`feedbackStatus`、`startDate`、`endDate`。

规则：

- 导出内容聚焦学生跟进，包括作答数、正确率、待复盘、已复盘、迁移成功、继续巩固、待复测、错题复盘任务、变式任务、前置巩固任务、下一轮任务类型明细、老师备注讲评清单、完成反馈、课堂讲评建议、老师备注数、待写备注数、可提醒、提醒次数、分层建议、复测建议和 XP。
- 可配合 `reviewGroup` 导出某个分层学生名单，例如 `reviewGroup=pending_retest` 导出待复测名单。
- 可配合 `reviewTaskType` 导出某类任务学生名单，例如 `reviewTaskType=variant_challenge` 导出变式题挑战跟进名单。
- 可配合 `feedbackStatus` 导出备注跟进名单，例如 `feedbackStatus=noted` 导出已有老师备注的讲评素材，`feedbackStatus=pending_feedback` 导出需要补写备注的完成任务名单。
- 导出内容不包含 API Key、不包含未发布题目的审核内容，也不展示“乱做”“低投入”等负面标签。

### GET /api/teacher/classes/teaching-materials

老师读取课堂讲评模板素材。

权限：

- 需要老师或管理员登录。

查询参数：

- classId：班级 ID，当前 MVP 支持 `all`。
- grade：可选年级筛选。
- startDate / endDate：可选时间范围。
- feedbackStatus：老师备注状态。
- reviewTaskType：错题复盘、变式挑战或前置巩固等任务类型。
- knowledgePointId：按知识点筛选。
- groupBy：`knowledge_point` 或 `task_type`。

响应包含：

- `materials`：任务、学生、知识点、任务类型、老师备注、学生复盘笔记、复测状态和讲评建议。
- `groups`：按知识点或任务类型分组后的讲评素材。
- `template`：规则生成的课堂讲评模板。

规则：

- 模板只由规则生成，不接 AI，不落库，不进入审核链路。
- 学生端不展示课堂讲评模板。
- 如果关联题目不是 `published`，导出时不返回题干和解析，只保留老师端安全素材和脱敏说明。

### GET /api/teacher/classes/teaching-materials/export

老师导出课堂讲评模板素材。

查询参数：

- 与 `/api/teacher/classes/teaching-materials` 相同。
- format：`csv` 或 `markdown`。

规则：

- CSV 用于整理讲评清单，Markdown 用于课堂讲评模板。
- 导出内容不包含 API Key，不把未发布或下架题目的题干/解析暴露给学生端。

### GET /api/teacher/classes/knowledge-points/:id/students

老师按知识点下钻查看学生名单。

权限：

- 需要老师或管理员登录。

查询参数：

- classId：班级 ID，当前 MVP 支持 `all`。
- grade：可选，用于保持与班级报告一致的年级筛选口径。
- startDate：可选，用于保持与班级报告一致的时间筛选口径。
- endDate：可选，用于保持与班级报告一致的时间筛选口径。

响应包含：

- 知识点 ID 和名称。
- 当前筛选条件。
- 相关学生作答数、需巩固次数、正确率、补救路径数和讲评建议。

### GET /api/teacher/classes/students/:id/detail

老师按学生下钻查看个人错题清单。

权限：

- 需要老师或管理员登录。

查询参数：

- classId：班级 ID，当前 MVP 支持 `all`。
- grade：可选，用于保持与班级报告一致的年级筛选口径。
- startDate：可选，用于保持与班级报告一致的时间筛选口径。
- endDate：可选，用于保持与班级报告一致的时间筛选口径。

响应包含：

- 学生作答数、需巩固次数、正确率和补救路径数。
- 个人薄弱知识点和讲评建议。
- 错题清单：题干、学生答案、参考答案、解析、知识点、题型、用时和下一步复盘建议。
- 复盘任务列表和完成汇总：待完成数量、已完成数量、任务状态、完成时间、学生复盘笔记、老师评价备注、二次任务完成反馈和课堂讲评建议。
- 不展示“乱做”“低投入”等负面标签。

### GET /api/teacher/classes/students/:id/wrong-questions/export

老师导出单个学生的错题清单 CSV。

权限：

- 需要老师或管理员登录。

查询参数：

- classId：班级 ID，当前 MVP 支持 `all`。
- grade：可选，用于保持与班级报告一致的年级筛选口径。
- startDate：可选，用于保持与班级报告一致的时间筛选口径。
- endDate：可选，用于保持与班级报告一致的时间筛选口径。

响应：

- `text/csv; charset=utf-8`。
- CSV 包含学生摘要、个人薄弱知识点、错题题干、学生答案、参考答案、解析、知识点、题型、用时和复盘建议。
- 导出内容不得包含“乱做”“低投入”等负面标签。

### POST /api/teacher/classes/students/:id/review-tasks

老师为单个学生分配错题复盘任务。

权限：

- 需要老师或管理员登录。

查询参数：

- classId：班级 ID，当前 MVP 支持 `all`。
- grade：可选，用于保持与班级报告一致的年级筛选口径。
- startDate：可选，用于保持与班级报告一致的时间筛选口径。
- endDate：可选，用于保持与班级报告一致的时间筛选口径。

请求：

```json
{
  "questionIds": ["q_1", "q_2"]
}
```

响应：

```json
{
  "result": {
    "assignedCount": 2,
    "questionIds": ["q_1", "q_2"]
  }
}
```

规则：

- 只允许基于该学生真实错题创建复盘任务。
- 当前 MVP 将复盘任务记录到补救路径表中，状态为 `assigned_review:<teacherId>`。
- 后续学生端展示任务时仍必须使用激励性表达，不展示负面行为标签。
- 学生完成复盘后，老师端学生详情可看到学生复盘笔记。

### POST /api/teacher/classes/students/:id/review-tasks/:taskId/feedback

老师为已完成的复盘任务、变式题挑战或前置知识巩固任务保存评价备注。

权限：

- 需要老师或管理员登录。

查询参数：

- classId：班级 ID，当前 MVP 支持 `all`。

请求：

```json
{
  "feedbackNote": "变式挑战已完成，后续讲评可请学生说明题干证据如何迁移。"
}
```

响应：

```json
{
  "result": {
    "taskId": "rp_1",
    "teacherFeedbackNote": "变式挑战已完成，后续讲评可请学生说明题干证据如何迁移。",
    "teacherFeedbackAt": "2026-05-17T10:00:00.000Z",
    "completionFeedback": "学生已完成变式题挑战，可以重点观察方法是否能迁移到新情境。",
    "teachingSuggestion": "讲评时可让学生对比原题和变式题，说明相关知识点中的条件变化和证据链。"
  }
}
```

规则：

- 只能为当前老师可访问学生的已完成任务保存备注。
- 备注只在老师端展示，不进入学生端。
- 后端自动生成完成反馈和课堂讲评建议，文案不得包含学生端负面标签。
- 备注长度不超过 500 字。

### POST /api/teacher/classes/students/:id/review-tasks/remind

老师对学生待完成的复盘任务生成温和提醒记录。

权限：

- 需要老师或管理员登录。

规则：

- 只提醒当前仍处于 `assigned_review:<teacherId>` 的复盘任务。
- 每次提醒增加 `reviewReminderCount`，并写入 `lastReviewReminderAt`。
- 默认 24 小时冷却期内不会重复增加提醒次数，可通过 `cooldownHours` 设置 1 到 168 小时。
- 学生端看到的是激励性提醒，不展示催促、责备或负面标签。

### POST /api/teacher/classes/review-tasks/remind

老师批量提醒多名学生完成待复盘任务。

权限：

- 需要老师或管理员登录。

请求：

```json
{
  "studentIds": ["student_1", "student_2"],
  "cooldownHours": 24
}
```

规则：

- 只处理老师当前可访问班级内的学生。
- 只提醒仍处于 `assigned_review:<teacherId>` 的任务。
- 默认 24 小时冷却期内不会重复增加提醒次数。

### POST /api/teacher/classes/review-tasks/next-round

老师基于复盘跟进名单批量分配下一轮任务。

权限：

- 需要老师或管理员登录。

查询参数：

- classId：班级 ID，当前 MVP 支持 `all`。
- grade：可选，用于保持与班级报告一致的年级筛选口径。
- startDate：可选，用于保持与班级报告一致的时间筛选口径。
- endDate：可选，用于保持与班级报告一致的时间筛选口径。

请求：

```json
{
  "studentIds": ["student_1", "student_2"],
  "taskType": "variant_challenge"
}
```

`taskType` 支持：

- `variant_challenge`：给已迁移成功的学生分配变式题挑战任务。
- `prerequisite_consolidation`：给继续巩固中的学生分配前置知识巩固任务。

规则：

- 只处理老师当前可访问班级内的学生。
- 只基于已有复盘和复测记录生成下一轮任务。
- 变式挑战只基于已完成复测且 `retestIsCorrect=true` 的记录生成。
- 前置巩固只基于已完成复测且 `retestIsCorrect=false` 的记录生成。
- 新任务仍记录到 `RemediationPath`，状态为 `assigned_review:<teacherId>`，学生端继续使用激励性表达。
- 源题必须仍为 `published`，未发布题不会进入学生练习或下一轮任务。

响应：

```json
{
  "result": {
    "studentCount": 2,
    "assignedCount": 1,
    "skippedCount": 1,
    "taskType": "variant_challenge"
  }
}
```
- 响应返回命中的学生数、实际提醒任务数和因冷却跳过的任务数。

## 8. 试卷 Exams

### POST /api/admin/exam-papers/import

管理员以文本方式导入整套试卷、答案和解析，并生成待审核题目候选。

请求：

```json
{
  "title": "2025 年某地中考化学试题",
  "examType": "中考",
  "year": 2025,
  "region": "某地",
  "grade": "初三",
  "paperText": "1. 题干 A. 选项 ...",
  "answerAnalysisText": "1. 答案 B 解析：...",
  "modelConfigId": "aim_1"
}
```

响应：

```json
{
  "result": {
    "paperId": "paper_1",
    "taskId": "task_1",
    "createdQuestionIds": ["q_1"],
    "reviewStatus": "pending_review"
  }
}
```

规则：

- 需要管理员登录。
- 系统创建 `ExamPaper` 记录，保留试卷来源元信息。
- 系统将整卷拆成题目候选，并自动生成知识点挂接、前置知识和核心素养标签。
- 新题目一律写入 `pending_review`，不得直接发布。
- AI 或自动拆解结果必须进入 `/review` 一审队列，通过后学生端才可见。

### POST /api/teacher/exam-papers

上传试卷元信息并创建处理任务。

### POST /api/teacher/exam-papers/:id/files

上传试卷、答案或解析文件。

### POST /api/teacher/exam-papers/:id/ai-tasks

创建 AI 拆题任务。

请求：

```json
{
  "taskTypes": ["paper_split", "answer_align", "knowledge_link", "literacy_tag"]
}
```

## 9. 审核 Review

### GET /api/review/questions

获取待审核题目。

### POST /api/review/questions/:id/approve

审核通过并发布。

### POST /api/review/questions/:id/edit-approve

修改后通过并发布。

### POST /api/review/questions/:id/reject

驳回题目。

### POST /api/review/questions/:id/retry-ai

重新 AI 分析。

规则：

- 仅老师或管理员可调用。
- 后端创建 `knowledge_linking` 等 AI 任务，任务结果仍必须进入人工审核。
- 不修改题目发布状态，不允许绕过一审直接进入学生端。
- 审核历史记录 `request_ai_retry`，用于追踪是谁发起了重析。

请求：

```json
{
  "taskType": "knowledge_linking",
  "comment": "低置信度，要求重新挂接知识点"
}
```

响应：

```json
{
  "task": {
    "id": "ait_xxx",
    "taskType": "knowledge_linking",
    "status": "pending"
  }
}
```

## 10. AI 模型配置与后台任务

### GET /api/admin/ai/models

返回模型配置列表，但不返回 API Key 明文。

响应：

```json
{
  "models": [
    {
      "id": "aim_1",
      "provider": "DeepSeek",
      "apiBaseUrl": "https://api.deepseek.com",
      "apiKeyMasked": "****3456",
      "modelName": "deepseek-chat",
      "enabled": true
    }
  ]
}
```

规则：

- 需要管理员登录。
- 只返回 `apiKeyMasked`，不得返回 `apiKey` 或可解密密文。
- API Key 只允许后端加密保存。

### POST /api/admin/ai/models

新增模型配置。

请求：

```json
{
  "provider": "DeepSeek",
  "apiBaseUrl": "https://api.deepseek.com",
  "apiKey": "sk-***",
  "modelName": "deepseek-chat",
  "maxContextTokens": 64000,
  "maxOutputTokens": 4096,
  "temperature": 0.2,
  "timeoutSeconds": 60,
  "enabled": true
}
```

规则：

- 需要管理员登录。
- 前端提交的 API Key 只用于一次性写入后端加密配置。
- 响应体仍只返回掩码，不返回明文。

### GET /api/admin/ai/tasks

获取后台 AI 任务队列。

响应：

```json
{
  "tasks": [
    {
      "id": "ait_1",
      "taskType": "paper_parse",
      "status": "pending",
      "modelConfigId": "aim_1"
    }
  ]
}
```

### POST /api/admin/ai/tasks

创建后台 AI 任务。

请求：

```json
{
  "taskType": "knowledge_linking",
  "modelConfigId": "aim_1",
  "fallbackModelConfigId": "aim_2",
  "input": {
    "paperId": "paper_1"
  }
}
```

规则：

- 需要管理员登录。
- `modelConfigId` 可省略；省略时后端按任务类型从已启用模型中选择默认模型。
- 可传入 `fallbackModelConfigId` 作为备用模型。
- AI 任务输出必须进入人工审核流程，通过后才能发布到学生端。

### POST /api/admin/ai/tasks/:id/run

管理员触发执行单个 AI 后台任务。

响应：

```json
{
  "result": {
    "taskId": "ait_1",
    "status": "needs_review",
    "usedModelConfigId": "aim_1",
    "attemptCount": 1,
    "warnings": []
  }
}
```

规则：

- 需要管理员登录。
- 执行时任务先变为 `running`。
- 结构化输出校验通过后，任务状态变为 `needs_review`。
- 调用失败或结构化校验失败时，任务状态变为 `failed` 并保存错误信息。
- 支持 `maxAttempts` 控制单模型最大尝试次数，最大限制为 5。
- 默认模型失败后会尝试备用模型。
- 调用尝试会记录到 `AiTask.tokenUsage.attempts`，管理员端以任务日志摘要展示。
- 默认本地模式不真实调用外部模型；设置后端 `AI_WORKER_MODE=live` 后才调用配置的大模型 API。
- 任务输出不得直接发布为学生端内容。

### POST /api/admin/ai/models/:id/test

测试连接。

### POST /api/admin/ai/task-routing

配置任务级默认模型和备用模型。

## 11. 错误码建议

- AUTH_REQUIRED：未登录。
- PERMISSION_DENIED：无权限。
- QUESTION_NOT_PUBLISHED：题目未发布，学生端不可访问。
- AI_TASK_FAILED：AI 任务失败。
- REVIEW_REQUIRED：内容需要审核。
- INVALID_KNOWLEDGE_RELATION：知识点关系非法。
- API_KEY_NOT_RETURNED：API Key 不允许明文返回。
