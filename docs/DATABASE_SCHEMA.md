# 数据库 Schema 草案

本文档是 Prisma/PostgreSQL 落地草案。正式实施时可转为 `schema.prisma`。

## 1. 枚举

```prisma
enum Role {
  student
  teacher
  admin
}

enum Grade {
  junior_three
  senior_one
  senior_two
  senior_three
}

enum AuditStatus {
  ai_processing
  pending_review
  needs_edit
  approved
  rejected
  published
}

enum RelationType {
  parent
  prerequisite
  confused_with
  similar_practice
  integrated_application
}

enum QuestionType {
  single_choice
  multiple_choice
  fill_blank
  short_answer
  calculation
  experiment
  inference
}

enum Difficulty {
  basic
  medium
  advanced
  integrated
}

enum DifficultyFeedback {
  easy
  medium
  hard
}

enum TimeAssessment {
  too_fast
  fast
  normal
  slow
  stuck
}

enum BehaviorSignal {
  fluent
  thoughtful
  review_needed
  possible_guessing
}

enum AiTaskStatus {
  pending
  running
  succeeded
  failed
  needs_review
}

enum LeaderboardType {
  growth_xp
  streak
  remediation
  review
  breakthrough
  literacy_progress
}

enum PeriodType {
  daily
  weekly
  monthly
  term
}

enum ScopeType {
  class
  grade
  school
  personal
}
```

## 2. 核心表草案

```prisma
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  displayName  String?
  role         Role
  schoolId     String?
  classId      String?
  status       String   @default("active")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  school              School?                  @relation(fields: [schoolId], references: [id])
  classGroup          ClassGroup?              @relation(fields: [classId], references: [id])
  teachingAssignments TeacherClassAssignment[]
  answerRecords       AnswerRecord[]
  rewardEvents        RewardEvent[]
  learningGoals       StudentLearningGoal[]
}

model School {
  id        String   @id @default(cuid())
  name      String
  region    String?
  status    String   @default("active")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users              User[]
  classes            ClassGroup[]
  teacherAssignments TeacherClassAssignment[]

  @@index([status])
}

model ClassGroup {
  id        String   @id @default(cuid())
  schoolId  String
  name      String
  grade     Grade?
  status    String   @default("active")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  school             School                   @relation(fields: [schoolId], references: [id])
  users              User[]
  teacherAssignments TeacherClassAssignment[]

  @@index([schoolId, grade])
  @@index([status])
}

model TeacherClassAssignment {
  id        String   @id @default(cuid())
  teacherId String
  schoolId  String
  classId   String
  role      String   @default("teacher")
  status    String   @default("active")
  createdBy String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  teacher    User       @relation(fields: [teacherId], references: [id])
  school     School     @relation(fields: [schoolId], references: [id])
  classGroup ClassGroup @relation(fields: [classId], references: [id])

  @@unique([teacherId, classId])
  @@index([schoolId, classId])
  @@index([status])
}

model KnowledgeGraphVersion {
  id          String   @id @default(cuid())
  grade       Grade
  name        String
  status      String   @default("draft")
  createdAt   DateTime @default(now())
  publishedAt DateTime?

  points    KnowledgePoint[]
  relations KnowledgeRelation[]
}

model KnowledgePoint {
  id             String   @id @default(cuid())
  grade          Grade
  name           String
  description    String?
  chapter        String?
  difficulty     Difficulty?
  graphVersionId String
  status         String   @default("draft")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  graphVersion KnowledgeGraphVersion @relation(fields: [graphVersionId], references: [id])
}

model KnowledgeRelation {
  id             String       @id @default(cuid())
  fromPointId    String
  toPointId      String
  relationType   RelationType
  weight         Float?
  graphVersionId String

  graphVersion KnowledgeGraphVersion @relation(fields: [graphVersionId], references: [id])
}

model ExamPaper {
  id              String   @id @default(cuid())
  title           String
  examType        String
  year            Int?
  region          String?
  grade           Grade
  sourceFileId    String?
  answerFileId    String?
  analysisFileId  String?
  copyrightStatus String   @default("unknown")
  uploadUserId    String
  status          String   @default("uploaded")
  createdAt       DateTime @default(now())

  questions Question[]
}

model Question {
  id                     String       @id @default(cuid())
  examPaperId            String?
  questionNumber         String?
  grade                  Grade
  examType               String?
  questionType           QuestionType
  stem                   String
  options                Json?
  answer                 Json
  analysis               String?
  score                  Float?
  reviewedDifficulty     Difficulty?
  aiDifficulty           Difficulty?
  dynamicDifficultyScore Float?
  medianTimeSeconds      Int?
  sourceMeta             Json?
  auditStatus            AuditStatus  @default(pending_review)
  createdAt              DateTime     @default(now())
  updatedAt              DateTime     @updatedAt

  examPaper      ExamPaper?              @relation(fields: [examPaperId], references: [id])
  knowledgeLinks QuestionKnowledgeLink[]
  literacyLinks  QuestionLiteracyLink[]
  answerRecords  AnswerRecord[]
}

model QuestionKnowledgeLink {
  id               String  @id @default(cuid())
  questionId       String
  knowledgePointId String
  linkType         String
  confidence       Float?
  reason           String?
  source           String
  reviewedBy       String?

  question Question @relation(fields: [questionId], references: [id])
}

model QuestionLiteracyLink {
  id              String  @id @default(cuid())
  questionId      String
  literacyTag     String
  abilityTarget   String?
  evaluationFocus String?
  confidence      Float?
  source          String

  question Question @relation(fields: [questionId], references: [id])
}

model AnswerRecord {
  id                    String              @id @default(cuid())
  studentId             String
  questionId            String
  knowledgePointId      String?
  startedAt             DateTime
  submittedAt           DateTime
  durationSeconds       Int
  selectedAnswer        Json?
  isCorrect             Boolean
  difficultyFeedback    DifficultyFeedback?
  timeAssessment        TimeAssessment?
  behaviorSignal        BehaviorSignal?
  triggeredRemediation  Boolean             @default(false)
  createdAt             DateTime            @default(now())

  student User     @relation(fields: [studentId], references: [id])
  question Question @relation(fields: [questionId], references: [id])
}

model RemediationPath {
  id                     String    @id @default(cuid())
  studentId              String
  sourceQuestionId       String
  sourceKnowledgePointId String
  targetKnowledgePointId String
  reason                 String
  studentReviewNote      String?
  teacherFeedbackNote    String?
  teacherFeedbackAt      DateTime?
  teacherFeedbackBy      String?
  reviewReminderCount    Int       @default(0)
  lastReviewReminderAt   DateTime?
  retestQuestionId       String?
  retestAnswerRecordId   String?
  retestIsCorrect        Boolean?
  retestCompletedAt      DateTime?
  status                 String    @default("active")
  completedAt            DateTime?
  createdAt              DateTime  @default(now())
}

model RewardEvent {
  id        String   @id @default(cuid())
  studentId String
  eventType String
  xp        Int      @default(0)
  gems      Int      @default(0)
  badgeId   String?
  reason    String
  createdAt DateTime @default(now())

  student User @relation(fields: [studentId], references: [id])
}

model StudentLearningGoal {
  id                   String    @id @default(cuid())
  studentId            String
  goalType             String
  targetKey            String
  periodType           String    @default("weekly")
  periodKey            String    @default("legacy")
  status               String    @default("active")
  startedAt            DateTime  @default(now())
  dueAt                DateTime?
  reopenedFromGoalId   String?
  completionSnapshot   Json?
  rewardEventId        String?
  completedAt          DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  student User @relation(fields: [studentId], references: [id])

  @@unique([studentId, goalType, targetKey, periodType, periodKey])
  @@index([studentId, goalType, status])
  @@index([studentId, goalType, periodType, periodKey])
}

model LeaderboardEntry {
  id              String          @id @default(cuid())
  studentId       String
  scopeType       ScopeType
  scopeId         String
  leaderboardType LeaderboardType
  periodType      PeriodType
  periodKey       String
  score           Int             @default(0)
  rank            Int?
  metadata        Json?
  updatedAt       DateTime        @updatedAt

  @@index([scopeType, scopeId, leaderboardType, periodType, periodKey])
  @@index([studentId, leaderboardType, periodType, periodKey])
}

model AiModelConfig {
  id               String   @id @default(cuid())
  provider         String
  apiBaseUrl       String
  apiKeyEncrypted  String
  modelName        String
  maxContextTokens Int?
  maxOutputTokens  Int?
  temperature      Float?
  timeoutSeconds   Int?
  enabled          Boolean  @default(true)
  createdBy        String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model AiTask {
  id                    String       @id @default(cuid())
  taskType              String
  status                AiTaskStatus @default(pending)
  modelConfigId         String
  fallbackModelConfigId String?
  input                 Json
  output                Json?
  errorMessage          String?
  tokenUsage            Json?
  createdAt             DateTime     @default(now())
  completedAt           DateTime?
}

model AuditRecord {
  id             String   @id @default(cuid())
  targetType     String
  targetId       String
  reviewerId     String
  action         String
  batchId        String?
  beforeSnapshot Json?
  afterSnapshot  Json?
  metadata       Json?
  diffSummary    Json?
  comment        String?
  createdAt      DateTime @default(now())

  @@index([batchId])
  @@index([action, createdAt])
  @@index([targetType, targetId])
}

model QuestionFilterScheme {
  id            String    @id @default(cuid())
  name          String
  description   String?
  ownerUserId   String?
  scopeType     String    @default("personal")
  role          String?
  filters       Json
  sort          Json?
  columns       Json?
  isDefault     Boolean   @default(false)
  schemaVersion Int       @default(1)
  createdBy     String
  updatedBy     String?
  archivedAt    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([ownerUserId, scopeType])
  @@index([scopeType, role])
  @@index([createdBy])
}

model AdminBatchOperation {
  id                String    @id @default(cuid())
  actorId           String
  action            String
  targetType        String
  selectedCount     Int       @default(0)
  affectedCount     Int       @default(0)
  filtersSnapshot   Json?
  selectionSnapshot Json?
  patchSnapshot     Json?
  previewHash       String?
  reason            String?
  status            String    @default("completed")
  createdAt         DateTime  @default(now())
  completedAt       DateTime?

  @@index([actorId, createdAt])
  @@index([action, createdAt])
  @@index([status, createdAt])
}
```

`TeacherClassAssignment.role` 当前约束为 `teacher` 或 `head_teacher`，由后端仓库层校验。创建、角色变更、学生入班和学校/班级维护均写入 `AuditRecord`。学校级汇总不新增表，按 `School`、`ClassGroup`、`User`、`TeacherClassAssignment`、`AnswerRecord`、`RemediationPath` 和题目核心素养挂接聚合生成。

## 3. 关键索引建议

正式数据库应增加索引：

- `Question.auditStatus`
- `Question.grade`
- `Question.examPaperId`
- `AnswerRecord.studentId`
- `AnswerRecord.questionId`
- `AnswerRecord.knowledgePointId`
- `KnowledgePoint.grade`
- `KnowledgeRelation.fromPointId`
- `KnowledgeRelation.toPointId`
- `AiTask.status`
- `AuditRecord.targetId`
- `AuditRecord.batchId`
- `QuestionFilterScheme.scopeType`
- `AdminBatchOperation.actorId`

## 4. 必须保留的安全约束

- `apiKeyEncrypted` 不得返回给前端。
- `passwordHash` 不得返回给前端。
- 学生查询题目时必须过滤 `auditStatus = published`。
- AI 任务输出不得直接修改 `Question.auditStatus` 为 published。
