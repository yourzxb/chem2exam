# AI 任务规范

## 1. 总原则

AI 是后台助手，不是最终裁判。

AI 可以生成候选结果，但正式题库、知识点挂接、核心素养标签、解析和反馈必须经过人工审核后才能发布到学生端。

严禁：

- AI 结果未经审核直接进入学生端。
- AI 自动覆盖人工审核结果。
- 前端直接保存或调用 API Key。
- 学生端使用未发布题目。

## 2. AI 能力中心

系统应支持管理员配置 DeepSeek、智谱 GLM、通义千问、豆包、Moonshot 等国内大模型 API。

配置项：

- provider：供应商。
- apiBaseUrl：接口地址。
- apiKeyEncrypted：加密后的 API Key。
- modelName：模型名。
- maxContextTokens。
- maxOutputTokens。
- temperature。
- timeoutSeconds。
- enabled。

API Key 必须加密存储，只能由后端使用。

## 3. 任务级模型路由

每类 AI 任务可以配置：

- 默认模型。
- 备用模型。
- 最大重试次数。
- 超时时间。
- 失败策略。

任务类型：

- paper_split：整卷拆题。
- answer_align：答案解析对齐。
- knowledge_link：知识点挂接。
- literacy_tag：核心素养标签生成。
- feedback_generate：激励性评价生成。
- mistake_diagnose：错因诊断。
- path_recommend：学习路径推荐。
- difficulty_assess：难度评估。
- analysis_generate：解析生成。

## 4. 任务状态

- pending：等待中。
- running：处理中。
- succeeded：已完成。
- failed：失败。
- needs_review：需要人工处理。

所有长任务必须异步执行。

当前 MVP 已实现单任务 worker 入口 `/api/admin/ai/tasks/:id/run`：

- 管理员可从后台任务队列触发执行。
- 任务会记录 `running`、`needs_review` 或 `failed` 状态。
- 创建任务时可以手动选择默认模型和备用模型。
- 未手动选择模型时，后端会按任务类型从已启用模型中选择默认模型。
- 执行时支持 `maxAttempts`，单模型最大尝试次数限制为 5。
- 默认模型失败后会尝试备用模型。
- 每次尝试会记录模型、状态、消息和时间，保存到 `AiTask.tokenUsage.attempts`。
- 默认使用本地 dry-run，完成结构化校验和状态流转，不调用外部模型。
- 后端设置 `AI_WORKER_MODE=live` 后，worker 会读取加密 API Key 并调用模型接口。
- 任务输出保存到 `AiTask.output`，状态为 `needs_review`，不得直接发布。

## 5. 结构化输出要求

所有 AI 任务输出必须是可解析 JSON。

后端必须做：

- JSON 解析校验。
- 必填字段校验。
- 枚举值校验。
- 置信度范围校验。
- 错误记录。
- 失败重试或切备用模型。

## 6. 整卷拆题 paper_split

当前 MVP 已实现管理员文本导入入口 `/api/admin/exam-papers/import`：

- 管理员粘贴试卷正文、答案与解析。
- 系统创建 `ExamPaper`。
- 系统生成待审核题目、知识点挂接、前置知识和核心素养标签。
- 系统会初步识别单选题、多选题、填空题、简答题、计算题、实验题和推断题。
- 系统会识别大题小问并写入结构核对提示。
- 低置信度知识点挂接会标记为 `low_confidence`。
- 若指定模型配置，会创建 `paper_parse` 类型 AI 任务并标记为 `needs_review`。
- 所有生成题目均为 `pending_review`，只能进入一审队列，不会直接进入学生端。

### 输入

```json
{
  "paperText": "试卷 OCR 或文本内容",
  "examMeta": {
    "title": "2024 年某地中考化学试题",
    "examType": "中考",
    "year": 2024,
    "region": "某地",
    "grade": "初三"
  }
}
```

### 输出

```json
{
  "questions": [
    {
      "questionNumber": "12",
      "questionType": "single_choice",
      "stem": "题干",
      "options": [
        {"label": "A", "text": "选项 A"},
        {"label": "B", "text": "选项 B"}
      ],
      "subQuestions": [],
      "images": [],
      "score": 2,
      "confidence": 0.92,
      "warnings": []
    }
  ],
  "warnings": []
}
```

### 审核规则

- 题号缺失、选项不完整、图片无法归属时必须人工处理。
- 大题小问不清晰时必须人工处理。

## 7. 答案解析对齐 answer_align

### 输入

```json
{
  "questions": [],
  "answerText": "答案文本",
  "analysisText": "解析文本"
}
```

### 输出

```json
{
  "aligned": [
    {
      "questionNumber": "12",
      "answer": "B",
      "analysis": "解析内容",
      "confidence": 0.88,
      "warnings": []
    }
  ],
  "unmatchedAnswers": [],
  "warnings": []
}
```

### 审核规则

- 答案缺失必须人工处理。
- 解析与题号不匹配必须人工处理。
- 置信度低于 0.7 必须人工处理。

## 8. 知识点挂接 knowledge_link

### 输入

```json
{
  "question": {
    "stem": "题干",
    "options": [],
    "answer": "B",
    "analysis": "解析"
  },
  "knowledgeGraph": [
    {
      "id": "acid_base",
      "name": "酸碱盐基础",
      "description": "..."
    }
  ]
}
```

### 输出

```json
{
  "primaryKnowledgePointId": "acid_base",
  "secondaryKnowledgePointIds": ["indicator"],
  "prerequisiteKnowledgePointIds": ["solution"],
  "difficulty": "中等",
  "abilityTarget": "能根据指示剂颜色变化判断溶液酸碱性",
  "confidence": 0.86,
  "reason": "题目考查紫色石蕊遇酸变红，属于酸碱指示剂知识。"
}
```

### 分流规则

- confidence >= 0.90：可进入低风险待审，允许批量通过。
- 0.70 <= confidence < 0.90：普通待审，逐题确认。
- confidence < 0.70：高风险，必须人工处理。

## 9. 核心素养标签 literacy_tag

### 输出

```json
{
  "literacyTags": [
    {
      "tag": "evidence_model",
      "abilityTarget": "能根据实验现象推断物质性质",
      "evaluationFocus": "能否从浑浊现象推断生成沉淀",
      "confidence": 0.84,
      "reason": "题目要求根据实验现象进行推理。"
    }
  ]
}
```

允许标签：

- macro_micro。
- change_balance。
- evidence_model。
- inquiry_innovation。
- attitude_responsibility。

## 10. 激励性评价 feedback_generate

### 输入

```json
{
  "question": {},
  "answerResult": {
    "isCorrect": false,
    "durationSeconds": 8,
    "medianTimeSeconds": 25,
    "difficultyFeedback": "hard"
  },
  "knowledgePoint": {},
  "literacyTags": []
}
```

### 输出

```json
{
  "studentFeedback": "这题提交得有点快，建议先抓住关键词，再判断溶液性质。",
  "encouragement": "错题已经帮你定位到了问题，补上这一环会更稳。",
  "teacherSignal": "possible_guessing",
  "tone": "supportive"
}
```

### 内容规则

- 学生端不得出现“乱做”“偷懒”“低投入”等负面定性。
- 应给出具体学习动作。
- 鼓励语不能空泛，要指向化学能力或学习策略。

## 11. 学习路径推荐 path_recommend

### 输出

```json
{
  "sourceKnowledgePointId": "acid_base",
  "recommendedPath": [
    {
      "type": "knowledge_card",
      "knowledgePointId": "indicator",
      "title": "酸碱指示剂变色规律"
    },
    {
      "type": "practice",
      "knowledgePointId": "indicator",
      "count": 2,
      "difficulty": "基础"
    },
    {
      "type": "return_review",
      "knowledgePointId": "acid_base",
      "count": 1
    }
  ],
  "reason": "学生在酸碱指示剂变色规律上出现错误，应先补前置知识再回到原知识点复测。",
  "confidence": 0.88
}
```

## 12. AI 调用日志

每次调用必须记录：

- taskId。
- taskType。
- provider。
- modelName。
- startedAt。
- completedAt。
- success。
- errorMessage。
- tokenUsage。
- latencyMs。

日志不得记录 API Key 明文。

当前 MVP 的调用日志先复用 `AiTask.tokenUsage`：

- mode：dry_run 或 live。
- usedModelConfigId：实际使用的模型配置。
- attemptCount：尝试次数。
- attempts：每次尝试的模型、状态、消息和时间。

管理员端任务队列会展示尝试次数、使用模型和错误信息。后续可再拆出独立 `AiTaskLog` 表。
