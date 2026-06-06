import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

test("student-facing code avoids negative behavior labels", () => {
  const files = [
    "src/components/student-dashboard.tsx",
    "src/app/api/student/answers/submit/route.ts",
    "src/app/api/student/reports/latest/route.ts",
    "src/app/api/student/core-literacy-goals/route.ts"
  ];
  const forbidden = ["你在乱做", "乱做", "你不认真", "不认真", "低投入作答", "低投入", "偷懒"];

  for (const file of files) {
    const source = read(file);
    for (const phrase of forbidden) {
      assert.equal(source.includes(phrase), false, `${file} contains forbidden student-facing phrase: ${phrase}`);
    }
  }
});

test("growth rewards value remediation more than a normal correct answer", () => {
  const source = read("src/domain/rewards.ts");
  const correctXp = Number(source.match(/questionCorrect: \{ xp: (\d+)/)?.[1]);
  const remediationXp = Number(source.match(/remediationCompleted: \{ xp: (\d+)/)?.[1]);

  assert.ok(Number.isFinite(correctXp), "question correct XP should be declared");
  assert.ok(Number.isFinite(remediationXp), "remediation XP should be declared");
  assert.ok(remediationXp > correctXp, "remediation reward should be higher than normal correct answer reward");
});

test("student question API only returns published questions", () => {
  const source = read("src/server/repositories/learning-repository.ts");
  assert.match(source, /auditStatus === "published"/);
});

test("AI and review constraints remain documented for Codex", () => {
  const agents = read("AGENTS.md");
  assert.match(agents, /AI 输出必须进入人工审核/);
  assert.match(agents, /学生端只使用已审核并发布的题目/);
});

test("auth repository hashes passwords and never exposes password hashes in public responses", () => {
  const passwordSource = read("src/server/auth/password.ts");
  const repositorySource = read("src/server/repositories/user-repository.ts");

  assert.match(passwordSource, /pbkdf2Sync/);
  assert.match(repositorySource, /passwordHash: hashPassword\(password\)/);
  assert.doesNotMatch(repositorySource, /return\s+\{[^}]*passwordHash/s);
});

test("auth session uses signed httpOnly cookies and exposes a current-user endpoint", () => {
  const sessionSource = read("src/server/auth/session.ts");
  const loginSource = read("src/app/api/auth/login/route.ts");
  const registerSource = read("src/app/api/auth/register/route.ts");
  const meSource = read("src/app/api/auth/me/route.ts");

  assert.match(sessionSource, /createHmac\("sha256"/);
  assert.match(sessionSource, /timingSafeEqual/);
  assert.match(sessionSource, /httpOnly: true/);
  assert.match(loginSource, /setSessionCookie/);
  assert.match(registerSource, /setSessionCookie/);
  assert.match(meSource, /getCurrentUser/);
});

test("Prisma schema preserves review and publication boundaries", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /enum AuditStatus/);
  assert.match(schema, /pending_review/);
  assert.match(schema, /published/);
  assert.match(schema, /model AuditRecord/);
});

test("review workflow can publish only through the one-review API", () => {
  const repositorySource = read("src/server/repositories/review-repository.ts");
  const approveRoute = read("src/app/api/review/questions/[id]/approve/route.ts");
  const studentSource = read("src/components/student-dashboard.tsx");

  assert.match(repositorySource, /approveQuestion/);
  assert.match(repositorySource, /auditRecord\.create/);
  assert.match(repositorySource, /auditStatus: status/);
  assert.match(approveRoute, /approveQuestion/);
  assert.match(studentSource, /\/api\/student\/questions\/next/);
});

test("review operations require reviewer role and support edited or batch approval", () => {
  const rolesSource = read("src/server/auth/roles.ts");
  const editRoute = read("src/app/api/review/questions/[id]/edit-and-approve/route.ts");
  const batchRoute = read("src/app/api/review/questions/batch-approve/route.ts");
  const batchNeedsEditRoute = read("src/app/api/review/questions/batch-needs-edit/route.ts");
  const retryAiRoute = read("src/app/api/review/questions/[id]/retry-ai/route.ts");
  const auditRoute = read("src/app/api/review/audit-records/route.ts");
  const repositorySource = read("src/server/repositories/review-repository.ts");
  const reviewConsoleSource = read("src/components/review-console.tsx");

  assert.match(rolesSource, /role === "teacher" \|\| user\.role === "admin"/);
  assert.match(editRoute, /requireReviewer/);
  assert.match(batchRoute, /requireReviewer/);
  assert.match(batchNeedsEditRoute, /requireReviewer/);
  assert.match(retryAiRoute, /requireReviewer/);
  assert.match(retryAiRoute, /AI retry output must enter review before publication/);
  assert.match(auditRoute, /requireReviewer/);
  assert.match(repositorySource, /updateAndApproveQuestion/);
  assert.match(repositorySource, /batchApproveQuestions/);
  assert.match(repositorySource, /batchRequestEdits/);
  assert.match(repositorySource, /recordAiRetryRequest/);
  assert.match(repositorySource, /listAuditRecords/);
  assert.match(repositorySource, /changeSummary/);
  assert.match(repositorySource, /extractAiTaskId/);
  assert.match(repositorySource, /filterHints/);
  assert.match(reviewConsoleSource, /保存修改并发布/);
  assert.match(reviewConsoleSource, /批量通过/);
  assert.match(reviewConsoleSource, /低置信度转需修改/);
  assert.match(reviewConsoleSource, /重新 AI 分析/);
  assert.match(reviewConsoleSource, /审核历史/);
  assert.match(reviewConsoleSource, /查看详情/);
  assert.match(reviewConsoleSource, /关联 AI 任务/);
  assert.match(reviewConsoleSource, /定位该题/);
  assert.match(reviewConsoleSource, /同知识点/);
  assert.match(reviewConsoleSource, /同题型/);
});

test("answer submission records learning events for future persistence", () => {
  const source = read("src/app/api/student/answers/submit/route.ts");
  assert.match(source, /saveAnswerRecord/);
  assert.match(source, /createRemediationPath/);
  assert.match(source, /createRewardEvent/);
  assert.match(source, /reviewTaskId/);
  assert.match(source, /recordReviewTaskRetest/);
  assert.match(source, /buildRetestNextAction/);
  assert.match(source, /challenge_variant/);
  assert.match(source, /maybeCreateRetestNextActionReward/);
  assert.match(source, /createVariantChallengeReward/);
  assert.match(source, /createPrerequisiteConsolidationReward/);
  assert.match(source, /getCurrentUser/);
  assert.match(source, /currentUser\?\.role === "student" \? currentUser\.id : payload\.studentId/);
});

test("learning event repository can persist answers remediation paths and rewards", () => {
  const source = read("src/server/repositories/learning-event-repository.ts");
  assert.match(source, /model|answerRecord\.create/);
  assert.match(source, /remediationPath\.create/);
  assert.match(source, /rewardEvent\.create/);
  assert.match(source, /retestQuestionId/);
  assert.match(source, /retestAnswerRecordId/);
  assert.match(source, /retestIsCorrect/);
  assert.match(source, /MemoryLearningEventRepository/);
});

test("database verification script checks the full student learning write flow", () => {
  const source = read("scripts/verify-db-flow.mjs");
  const packageJson = read("package.json");

  assert.match(packageJson, /verify:db-flow/);
  assert.match(source, /api\/auth\/register/);
  assert.match(source, /api\/student\/answers\/submit/);
  assert.match(source, /answerRecord\.count/);
  assert.match(source, /remediationPath\.count/);
  assert.match(source, /rewardEvent\.count/);
  assert.match(source, /api\/student\/reports\/latest/);
  assert.match(source, /api\/student\/leaderboard/);
});

test("review verification script checks database-backed review operations", () => {
  const source = read("scripts/verify-review-flow.mjs");
  const packageJson = read("package.json");

  assert.match(packageJson, /verify:review-flow/);
  assert.match(source, /api\/admin\/exam-papers\/import/);
  assert.match(source, /api\/review\/questions/);
  assert.match(source, /batch-needs-edit/);
  assert.match(source, /retry-ai/);
  assert.match(source, /api\/review\/audit-records/);
  assert.match(source, /changeSummary/);
  assert.match(source, /aiTask/);
  assert.match(source, /filterHints/);
  assert.match(source, /questionId/);
});

test("leaderboard and student reports use persisted learning data", () => {
  const repositorySource = read("src/server/repositories/learning-stats-repository.ts");
  const eventRepositorySource = read("src/server/repositories/learning-event-repository.ts");
  const rewardsSource = read("src/domain/rewards.ts");
  const leaderboardRoute = read("src/app/api/student/leaderboard/route.ts");
  const reportRoute = read("src/app/api/student/reports/latest/route.ts");
  const coreLiteracyGoalRoute = read("src/app/api/student/core-literacy-goals/route.ts");
  const reviewTasksRoute = read("src/app/api/student/review-tasks/route.ts");
  const completeReviewTaskRoute = read("src/app/api/student/review-tasks/[id]/complete/route.ts");
  const studentDashboardSource = read("src/components/student-dashboard.tsx");

  assert.match(repositorySource, /rewardEvent\.groupBy/);
  assert.match(repositorySource, /answerRecord\.findMany/);
  assert.match(repositorySource, /remediationPath\.count/);
  assert.match(repositorySource, /getStudentReviewTasks/);
  assert.match(repositorySource, /completeStudentReviewTask/);
  assert.match(repositorySource, /completed_review/);
  assert.match(repositorySource, /studentReviewNote/);
  assert.match(repositorySource, /retestQuestionId/);
  assert.match(repositorySource, /retestIsCorrect/);
  assert.match(repositorySource, /buildReviewTaskNextAction/);
  assert.match(repositorySource, /buildTodayTasks/);
  assert.match(repositorySource, /buildCompletedTasks/);
  assert.match(repositorySource, /buildGrowthTimeline/);
  assert.match(repositorySource, /buildWeeklyGrowthSummary/);
  assert.match(repositorySource, /buildWeeklyReviewCards/);
  assert.match(repositorySource, /buildCoreLiteracyGrowth/);
  assert.match(repositorySource, /buildCoreLiteracyGoals/);
  assert.match(repositorySource, /buildCoreLiteracyGoalHistory/);
  assert.match(repositorySource, /completeEligibleCoreLiteracyGoals/);
  assert.match(repositorySource, /buildMilestoneBadges/);
  assert.match(repositorySource, /selectCoreLiteracyGoal/);
  assert.match(repositorySource, /studentLearningGoal/);
  assert.match(repositorySource, /literacy_progress/);
  assert.match(repositorySource, /coreLiteracyText/);
  assert.match(repositorySource, /challenge_variant/);
  assert.match(repositorySource, /revisit_prerequisite/);
  assert.match(repositorySource, /rewardText/);
  assert.match(repositorySource, /variantChallengeRewardReason/);
  assert.match(repositorySource, /createReviewCompletedReward/);
  assert.match(eventRepositorySource, /previousRetestIsCorrect/);
  assert.match(eventRepositorySource, /hasRewardReason/);
  assert.match(rewardsSource, /review_completed/);
  assert.match(rewardsSource, /createVariantChallengeReward/);
  assert.match(rewardsSource, /createPrerequisiteConsolidationReward/);
  assert.match(rewardsSource, /createCoreLiteracyGoalReward/);
  assert.match(leaderboardRoute, /learningStatsRepository/);
  assert.match(reportRoute, /getCurrentUser/);
  assert.match(reportRoute, /getStudentReport/);
  assert.match(coreLiteracyGoalRoute, /getCurrentUser/);
  assert.match(coreLiteracyGoalRoute, /selectCoreLiteracyGoal/);
  assert.match(coreLiteracyGoalRoute, /LITERACY_TAG_REQUIRED/);
  assert.match(reviewTasksRoute, /getCurrentUser/);
  assert.match(reviewTasksRoute, /getStudentReviewTasks/);
  assert.match(completeReviewTaskRoute, /getCurrentUser/);
  assert.match(completeReviewTaskRoute, /completeStudentReviewTask/);
  assert.match(completeReviewTaskRoute, /reviewNote/);
  assert.match(studentDashboardSource, /老师任务/);
  assert.match(studentDashboardSource, /今日任务/);
  assert.match(studentDashboardSource, /已完成任务/);
  assert.match(studentDashboardSource, /成长轨迹/);
  assert.match(studentDashboardSource, /本周成长/);
  assert.match(studentDashboardSource, /weeklyReviewCards/);
  assert.match(repositorySource, /复盘推进/);
  assert.match(studentDashboardSource, /weekly-review-card/);
  assert.match(studentDashboardSource, /核心素养成长/);
  assert.match(studentDashboardSource, /coreLiteracyGoals/);
  assert.match(studentDashboardSource, /coreLiteracyGoalHistory/);
  assert.match(studentDashboardSource, /selectCoreLiteracyGoal/);
  assert.match(studentDashboardSource, /设为目标/);
  assert.match(studentDashboardSource, /目标完成记录/);
  assert.match(studentDashboardSource, /阶段徽章/);
  assert.match(studentDashboardSource, /milestoneBadges/);
  assert.match(studentDashboardSource, /coreLiteracyLevelText/);
  assert.match(studentDashboardSource, /startTodayTask/);
  assert.match(studentDashboardSource, /标记完成复盘/);
  assert.match(studentDashboardSource, /复盘笔记/);
  assert.match(studentDashboardSource, /同类题复测/);
  assert.match(studentDashboardSource, /activeRetestTaskId/);
  assert.match(studentDashboardSource, /复测结果/);
  assert.match(studentDashboardSource, /followReviewNextAction/);
  assert.match(studentDashboardSource, /challenge_variant/);
  assert.match(studentDashboardSource, /nextActionReward/);
  assert.match(studentDashboardSource, /待完成/);
  assert.match(studentDashboardSource, /已完成/);
  assert.match(studentDashboardSource, /reviewNoteHint/);
  assert.match(studentDashboardSource, /错因 \+ 下次先看什么条件/);
});

test("teacher class reports require teacher access and aggregate persisted learning data", () => {
  const routeSource = read("src/app/api/teacher/classes/overview/route.ts");
  const exportRouteSource = read("src/app/api/teacher/classes/overview/export/route.ts");
  const reviewFollowupExportRouteSource = read("src/app/api/teacher/classes/review-followups/export/route.ts");
  const drilldownRouteSource = read("src/app/api/teacher/classes/knowledge-points/[id]/students/route.ts");
  const studentDetailRouteSource = read("src/app/api/teacher/classes/students/[id]/detail/route.ts");
  const wrongQuestionExportRouteSource = read("src/app/api/teacher/classes/students/[id]/wrong-questions/export/route.ts");
  const reviewTaskRouteSource = read("src/app/api/teacher/classes/students/[id]/review-tasks/route.ts");
  const reviewTaskReminderRouteSource = read("src/app/api/teacher/classes/students/[id]/review-tasks/remind/route.ts");
  const reviewTaskFeedbackRouteSource = read("src/app/api/teacher/classes/students/[id]/review-tasks/[taskId]/feedback/route.ts");
  const batchReviewTaskReminderRouteSource = read("src/app/api/teacher/classes/review-tasks/remind/route.ts");
  const nextRoundReviewTaskRouteSource = read("src/app/api/teacher/classes/review-tasks/next-round/route.ts");
  const repositorySource = read("src/server/repositories/teacher-report-repository.ts");
  const pageSource = read("src/components/teacher-dashboard.tsx");
  const verifySource = read("scripts/verify-teacher-flow.mjs");
  const packageJson = read("package.json");

  assert.match(routeSource, /requireReviewer/);
  assert.match(exportRouteSource, /requireReviewer/);
  assert.match(exportRouteSource, /text\/csv/);
  assert.match(reviewFollowupExportRouteSource, /requireReviewer/);
  assert.match(reviewFollowupExportRouteSource, /buildTeacherReviewFollowupCsv/);
  assert.match(reviewFollowupExportRouteSource, /text\/csv/);
  assert.match(drilldownRouteSource, /requireReviewer/);
  assert.match(drilldownRouteSource, /getKnowledgePointStudents/);
  assert.match(studentDetailRouteSource, /requireReviewer/);
  assert.match(studentDetailRouteSource, /getStudentDetail/);
  assert.match(wrongQuestionExportRouteSource, /requireReviewer/);
  assert.match(wrongQuestionExportRouteSource, /buildStudentWrongQuestionsCsv/);
  assert.match(reviewTaskRouteSource, /requireReviewer/);
  assert.match(reviewTaskRouteSource, /assignStudentReviewTasks/);
  assert.match(reviewTaskFeedbackRouteSource, /requireReviewer/);
  assert.match(reviewTaskFeedbackRouteSource, /recordReviewTaskFeedback/);
  assert.match(reviewTaskFeedbackRouteSource, /FEEDBACK_NOTE_REQUIRED/);
  assert.match(routeSource, /startDate/);
  assert.match(routeSource, /endDate/);
  assert.match(routeSource, /grade/);
  assert.match(routeSource, /reviewStatus/);
  assert.match(routeSource, /reminderStatus/);
  assert.match(routeSource, /retestStatus/);
  assert.match(routeSource, /reviewGroup/);
  assert.match(routeSource, /reviewTaskType/);
  assert.match(routeSource, /feedbackStatus/);
  assert.match(exportRouteSource, /feedbackStatus/);
  assert.match(reviewFollowupExportRouteSource, /feedbackStatus/);
  assert.match(routeSource, /parseFeedbackStatus/);
  assert.match(repositorySource, /answerRecord\.findMany/);
  assert.match(repositorySource, /remediationPath\.findMany/);
  assert.match(repositorySource, /rewardEvent\.groupBy/);
  assert.match(repositorySource, /toPrismaGrade/);
  assert.match(repositorySource, /buildCreatedAtFilter/);
  assert.match(repositorySource, /summarizeWeakQuestionTypes/);
  assert.match(repositorySource, /summarizeWeakCoreLiteracy/);
  assert.match(repositorySource, /buildTeacherReportCsv/);
  assert.match(repositorySource, /buildTeacherReviewFollowupCsv/);
  assert.match(repositorySource, /KnowledgePointStudentBreakdown/);
  assert.match(repositorySource, /TeacherStudentDetail/);
  assert.match(repositorySource, /wrongQuestions/);
  assert.match(repositorySource, /buildStudentWrongQuestionsCsv/);
  assert.match(repositorySource, /assigned_review/);
  assert.match(repositorySource, /completed_review/);
  assert.match(repositorySource, /reviewTaskSummary/);
  assert.match(repositorySource, /matchesReviewStatus/);
  assert.match(repositorySource, /studentReviewNote/);
  assert.match(repositorySource, /remindStudentReviewTasks/);
  assert.match(repositorySource, /reviewReminderCount/);
  assert.match(repositorySource, /lastReviewReminderAt/);
  assert.match(repositorySource, /batchRemindStudentReviewTasks/);
  assert.match(repositorySource, /batchAssignNextRoundReviewTasks/);
  assert.match(repositorySource, /skippedDueToCooldown/);
  assert.match(repositorySource, /variant_challenge/);
  assert.match(repositorySource, /prerequisite_consolidation/);
  assert.match(repositorySource, /matchesReminderStatus/);
  assert.match(repositorySource, /retestCompletedAt/);
  assert.match(repositorySource, /retestIsCorrect/);
  assert.match(repositorySource, /buildRetestSummary/);
  assert.match(repositorySource, /buildStudentRetestSuggestion/);
  assert.match(repositorySource, /matchesRetestStatus/);
  assert.match(repositorySource, /matchesReviewGroup/);
  assert.match(repositorySource, /buildReviewTrend/);
  assert.match(repositorySource, /buildReviewGroups/);
  assert.match(repositorySource, /buildNextRoundSummary/);
  assert.match(repositorySource, /buildNextRoundTaskBreakdown/);
  assert.match(repositorySource, /buildNextRoundTaskCsvRows/);
  assert.match(repositorySource, /matchesReviewTaskType/);
  assert.match(repositorySource, /getReviewTaskType/);
  assert.match(repositorySource, /nextRoundSummary/);
  assert.match(repositorySource, /assignedStudents/);
  assert.match(repositorySource, /completedStudents/);
  assert.match(repositorySource, /teacherFeedbackNote/);
  assert.match(repositorySource, /teacherFeedbackCount/);
  assert.match(repositorySource, /teacherFeedbackSummary/);
  assert.match(repositorySource, /pendingTeacherFeedbackCount/);
  assert.match(repositorySource, /latestTeacherFeedbackAt/);
  assert.match(repositorySource, /matchesTeacherFeedbackStatus/);
  assert.match(repositorySource, /buildTeacherFeedbackSummary/);
  assert.match(repositorySource, /teacherFeedbackStatusText/);
  assert.match(repositorySource, /recordReviewTaskFeedback/);
  assert.match(repositorySource, /buildReviewTaskCompletionFeedback/);
  assert.match(repositorySource, /buildReviewTaskTeachingSuggestion/);
  assert.match(repositorySource, /buildNextRoundTeachingSuggestion/);
  assert.match(repositorySource, /variantChallengeTaskCount/);
  assert.match(repositorySource, /prerequisiteConsolidationTaskCount/);
  assert.match(pageSource, /班级薄弱知识点/);
  assert.match(pageSource, /讲评建议/);
  assert.match(pageSource, /复测迁移汇总/);
  assert.match(pageSource, /复盘趋势/);
  assert.match(pageSource, /分层复盘建议/);
  assert.match(pageSource, /下一轮任务/);
  assert.match(pageSource, /待完成学生/);
  assert.match(pageSource, /已完成学生/);
  assert.match(pageSource, /老师备注/);
  assert.match(pageSource, /待写备注/);
  assert.match(pageSource, /老师备注讲评清单/);
  assert.match(pageSource, /teacherFeedbackSummary/);
  assert.match(pageSource, /feedbackStatusFilter/);
  assert.match(pageSource, /保存备注/);
  assert.match(pageSource, /saveReviewTaskFeedback/);
  assert.match(pageSource, /completionFeedback/);
  assert.match(pageSource, /teachingSuggestion/);
  assert.match(pageSource, /NextRoundStudentList/);
  assert.match(pageSource, /reviewTaskTypeFilter/);
  assert.match(pageSource, /变式题挑战/);
  assert.match(pageSource, /前置知识巩固/);
  assert.match(pageSource, /题型错题讲评/);
  assert.match(pageSource, /核心素养讲评/);
  assert.match(pageSource, /应用筛选/);
  assert.match(pageSource, /导出报告/);
  assert.match(pageSource, /查看学生/);
  assert.match(pageSource, /查看错题/);
  assert.match(pageSource, /错题清单/);
  assert.match(pageSource, /导出错题/);
  assert.match(pageSource, /分配复盘/);
  assert.match(pageSource, /复盘任务反馈/);
  assert.match(pageSource, /已完成复盘/);
  assert.match(pageSource, /复盘状态/);
  assert.match(pageSource, /学生复盘笔记/);
  assert.match(pageSource, /提醒复盘/);
  assert.match(pageSource, /remindStudentReviewTasks/);
  assert.match(pageSource, /批量提醒/);
  assert.match(pageSource, /批量分配变式/);
  assert.match(pageSource, /批量分配前置巩固/);
  assert.match(pageSource, /batchAssignNextRoundTasks/);
  assert.match(pageSource, /reminderStatusFilter/);
  assert.match(pageSource, /reminderCooldownHours/);
  assert.match(pageSource, /retestStatusFilter/);
  assert.match(pageSource, /reviewGroupFilter/);
  assert.match(pageSource, /复测结果/);
  assert.match(pageSource, /复盘分层/);
  assert.match(pageSource, /筛选此组/);
  assert.match(pageSource, /导出复盘跟进/);
  assert.match(pageSource, /retestSuggestion/);
  assert.match(packageJson, /verify:teacher-flow/);
  assert.match(verifySource, /weakQuestionTypes/);
  assert.match(verifySource, /weakCoreLiteracy/);
  assert.match(verifySource, /grade=高一/);
  assert.match(verifySource, /startDate=2999-01-01/);
  assert.match(verifySource, /fetchKnowledgePointBreakdown/);
  assert.match(verifySource, /fetchTeacherReportCsv/);
  assert.match(verifySource, /fetchStudentDetail/);
  assert.match(verifySource, /wrongQuestions/);
  assert.match(verifySource, /fetchStudentWrongQuestionCsv/);
  assert.match(verifySource, /assignStudentReviewTasks/);
  assert.match(verifySource, /completeStudentReviewTask/);
  assert.match(verifySource, /review_completed/);
  assert.match(verifySource, /reviewStatus=assigned/);
  assert.match(verifySource, /reminderStatus=reminded/);
  assert.match(verifySource, /reviewNote/);
  assert.match(verifySource, /coreLiteracyGoalHistory/);
  assert.match(verifySource, /literacyProgressRewardCount/);
  assert.match(verifySource, /remindStudentReviewTasks/);
  assert.match(verifySource, /batchRemindStudentReviewTasks/);
  assert.match(verifySource, /batchAssignNextRoundTasks/);
  assert.match(verifySource, /skippedDueToCooldown/);
  assert.match(verifySource, /reminderCount/);
  assert.match(verifySource, /reviewTaskId/);
  assert.match(verifySource, /retestRecorded/);
  assert.match(verifySource, /retestSummary/);
  assert.match(verifySource, /successfulRetestCount/);
  assert.match(verifySource, /retestStatus=success/);
  assert.match(verifySource, /reviewTrend/);
  assert.match(verifySource, /reviewGroups/);
  assert.match(verifySource, /reviewGroup=pending_retest/);
  assert.match(verifySource, /nextRoundSummary/);
  assert.match(verifySource, /completedNextRoundTask/);
  assert.match(verifySource, /saveTeacherReviewTaskFeedback/);
  assert.match(verifySource, /teacherFeedbackNote/);
  assert.match(verifySource, /feedbackStatus=noted/);
  assert.match(verifySource, /feedbackStatus=pending_feedback/);
  assert.match(verifySource, /老师备注讲评清单/);
  assert.match(verifySource, /课堂讲评建议/);
  assert.match(verifySource, /下一轮任务类型明细/);
  assert.match(verifySource, /reviewTaskType=variant_challenge/);
  assert.match(verifySource, /fetchTeacherReviewFollowupCsv/);
  assert.match(reviewTaskReminderRouteSource, /requireReviewer/);
  assert.match(reviewTaskReminderRouteSource, /remindStudentReviewTasks/);
  assert.match(batchReviewTaskReminderRouteSource, /requireReviewer/);
  assert.match(batchReviewTaskReminderRouteSource, /batchRemindStudentReviewTasks/);
  assert.match(nextRoundReviewTaskRouteSource, /requireReviewer/);
  assert.match(nextRoundReviewTaskRouteSource, /batchAssignNextRoundReviewTasks/);
  assert.match(nextRoundReviewTaskRouteSource, /variant_challenge/);
  assert.match(nextRoundReviewTaskRouteSource, /prerequisite_consolidation/);
});

test("admin content management requires admin access and preserves graph and audit boundaries", () => {
  const rolesSource = read("src/server/auth/roles.ts");
  const repositorySource = read("src/server/repositories/admin-content-repository.ts");
  const questionRoute = read("src/app/api/admin/questions/route.ts");
  const questionUpdateRoute = read("src/app/api/admin/questions/[id]/route.ts");
  const questionBatchRoute = read("src/app/api/admin/questions/batch-update/route.ts");
  const pointsRoute = read("src/app/api/admin/knowledge-points/route.ts");
  const relationsRoute = read("src/app/api/admin/knowledge-relations/route.ts");
  const adminConsoleSource = read("src/components/admin-console.tsx");
  const verifySource = read("scripts/verify-admin-flow.mjs");
  const packageJson = read("package.json");

  assert.match(rolesSource, /requireAdmin/);
  assert.match(questionRoute, /requireAdmin/);
  assert.match(questionRoute, /questionType/);
  assert.match(questionRoute, /knowledgePointId/);
  assert.match(questionRoute, /grade/);
  assert.match(questionUpdateRoute, /requireAdmin/);
  assert.match(questionUpdateRoute, /PATCH/);
  assert.match(questionUpdateRoute, /coreLiteracy/);
  assert.match(questionBatchRoute, /requireAdmin/);
  assert.match(questionBatchRoute, /batchUpdateQuestions/);
  assert.match(questionBatchRoute, /primaryKnowledgePointId/);
  assert.match(questionBatchRoute, /coreLiteracy/);
  assert.match(pointsRoute, /requireAdmin/);
  assert.match(relationsRoute, /requireAdmin/);
  assert.match(repositorySource, /auditStatus/);
  assert.match(repositorySource, /updateQuestion/);
  assert.match(repositorySource, /batchUpdateQuestions/);
  assert.match(repositorySource, /ListQuestionFilters/);
  assert.match(repositorySource, /admin_update_question/);
  assert.match(repositorySource, /admin_batch_update_question/);
  assert.match(repositorySource, /questionKnowledgeLink\.update/);
  assert.match(repositorySource, /questionLiteracyLink\.deleteMany/);
  assert.match(repositorySource, /questionLiteracyLink\.deleteMany/);
  assert.match(repositorySource, /createKnowledgePoint/);
  assert.match(repositorySource, /createKnowledgeRelation/);
  assert.match(adminConsoleSource, /题库与知识图谱维护/);
  assert.match(adminConsoleSource, /题目维护/);
  assert.match(adminConsoleSource, /保存题目维护/);
  assert.match(adminConsoleSource, /批量维护/);
  assert.match(adminConsoleSource, /筛选题库/);
  assert.match(adminConsoleSource, /保存筛选方案/);
  assert.match(adminConsoleSource, /筛选方案名称/);
  assert.match(adminConsoleSource, /导出筛选方案/);
  assert.match(adminConsoleSource, /导入筛选方案/);
  assert.match(adminConsoleSource, /filterSchemeImportText/);
  assert.match(adminConsoleSource, /navigator\.clipboard/);
  assert.match(adminConsoleSource, /批量操作预览/);
  assert.match(adminConsoleSource, /batchPreviewChanges/);
  assert.match(adminConsoleSource, /batchConfirmChecked/);
  assert.match(adminConsoleSource, /我已核对批量操作预览/);
  assert.match(adminConsoleSource, /批量主知识点 ID/);
  assert.match(adminConsoleSource, /批量核心素养标签/);
  assert.match(adminConsoleSource, /localStorage/);
  assert.match(adminConsoleSource, /questionFilterSchemes/);
  assert.match(adminConsoleSource, /核心素养标签/);
  assert.match(adminConsoleSource, /答案/);
  assert.match(adminConsoleSource, /解析/);
  assert.match(packageJson, /verify:admin-flow/);
  assert.match(verifySource, /admin_update_question/);
  assert.match(verifySource, /admin_batch_update_question/);
  assert.match(verifySource, /inquiry_innovation/);
  assert.match(verifySource, /questionType=single_choice/);
  assert.match(verifySource, /batchPrimaryKnowledgePointId/);
  assert.match(verifySource, /attitude_responsibility/);
  assert.match(verifySource, /needs_edit question must not appear in student practice/);
});

test("school organization keeps class data behind teacher authorization", () => {
  const schema = read("prisma/schema.prisma");
  const rolesSource = read("src/server/auth/roles.ts");
  const organizationRepositorySource = read("src/server/repositories/organization-repository.ts");
  const schoolRoute = read("src/app/api/admin/schools/route.ts");
  const classRoute = read("src/app/api/admin/classes/route.ts");
  const adminUsersRoute = read("src/app/api/admin/users/route.ts");
  const adminUserRepositorySource = read("src/server/repositories/admin-user-repository.ts");
  const teacherAssignmentRoute = read("src/app/api/admin/classes/[id]/teachers/route.ts");
  const studentAssignmentRoute = read("src/app/api/admin/classes/[id]/students/route.ts");
  const batchStudentAssignmentRoute = read("src/app/api/admin/classes/[id]/students/batch/route.ts");
  const teacherOverviewRoute = read("src/app/api/teacher/classes/overview/route.ts");
  const adminConsoleSource = read("src/components/admin-console.tsx");
  const verifySource = read("scripts/verify-admin-flow.mjs");

  assert.match(schema, /model School/);
  assert.match(schema, /model ClassGroup/);
  assert.match(schema, /model TeacherClassAssignment/);
  assert.match(schema, /@@unique\(\[teacherId, classId\]\)/);
  assert.match(rolesSource, /ensureTeacherClassAccess/);
  assert.match(organizationRepositorySource, /canAccessClass/);
  assert.match(organizationRepositorySource, /teacherClassAssignment\.count/);
  assert.match(organizationRepositorySource, /isLegacyClassScope\(classId\)\) return false/);
  assert.match(organizationRepositorySource, /admin_assign_teacher_class/);
  assert.match(organizationRepositorySource, /admin_assign_student_class/);
  assert.match(schoolRoute, /requireAdmin/);
  assert.match(classRoute, /requireAdmin/);
  assert.match(adminUsersRoute, /requireAdmin/);
  assert.match(adminUsersRoute, /adminUserRepository\.searchUsers/);
  assert.match(adminUserRepositorySource, /safeUserSelect/);
  assert.doesNotMatch(adminUserRepositorySource, /passwordHash: true/);
  assert.match(teacherAssignmentRoute, /assignTeacherToClass/);
  assert.match(studentAssignmentRoute, /assignStudentToClass/);
  assert.match(batchStudentAssignmentRoute, /requireAdmin/);
  assert.match(batchStudentAssignmentRoute, /resolveUsersByIdentifiers/);
  assert.match(batchStudentAssignmentRoute, /assignStudentToClass/);
  assert.match(teacherOverviewRoute, /ensureTeacherClassAccess/);
  assert.match(adminConsoleSource, /学校、班级与任课授权/);
  assert.match(adminConsoleSource, /查找教师账号/);
  assert.match(adminConsoleSource, /查找学生账号/);
  assert.match(adminConsoleSource, /批量学生入班/);
  assert.match(adminConsoleSource, /batchAssignStudentsToClass/);
  assert.match(adminConsoleSource, /绑定教师/);
  assert.match(adminConsoleSource, /班级教师角色/);
  assert.match(adminConsoleSource, /updateClassTeacherRole/);
  assert.match(adminConsoleSource, /班主任/);
  assert.match(adminConsoleSource, /加入班级/);
  assert.match(verifySource, /unassigned teacher must not read explicit class report/);
  assert.match(verifySource, /api\/admin\/users/);
  assert.match(verifySource, /students\/batch/);
  assert.match(verifySource, /teacherClassAssignment\.findUnique/);
});

test("school pilot checks cover teacher roles class lists and school summaries", () => {
  const organizationRepositorySource = read("src/server/repositories/organization-repository.ts");
  const teacherAssignmentRoutePath = "src/app/api/admin/classes/[id]/teachers/route.ts";
  const teacherClassesRoutePath = "src/app/api/teacher/classes/route.ts";
  const schoolSummaryRoutePath = "src/app/api/admin/schools/summary/route.ts";
  const schoolSummaryExportRoutePath = "src/app/api/admin/schools/summary/export/route.ts";
  const schoolSummaryRepositoryPath = "src/server/repositories/school-summary-repository.ts";
  const teacherDashboardSource = read("src/components/teacher-dashboard.tsx");
  const adminConsoleSource = read("src/components/admin-console.tsx");
  const verifyAdminSource = read("scripts/verify-admin-flow.mjs");
  const verifyTeacherSource = read("scripts/verify-teacher-flow.mjs");

  assert.match(organizationRepositorySource, /VALID_TEACHER_CLASS_ROLES = \["teacher", "head_teacher"\]/);
  assert.match(organizationRepositorySource, /normalizeTeacherClassRole/);
  assert.match(organizationRepositorySource, /listClassTeacherAssignments/);
  assert.match(organizationRepositorySource, /listTeacherClassAssignments/);
  assert.match(organizationRepositorySource, /updateTeacherClassRole/);
  assert.match(organizationRepositorySource, /admin_update_teacher_class_role/);

  assert.ok(exists(teacherAssignmentRoutePath), "admin class teacher assignment route should exist");
  const teacherAssignmentRoute = read(teacherAssignmentRoutePath);
  assert.match(teacherAssignmentRoute, /requireAdmin/);
  assert.match(teacherAssignmentRoute, /export async function GET/);
  assert.match(teacherAssignmentRoute, /export async function PATCH/);
  assert.match(teacherAssignmentRoute, /listClassTeacherAssignments/);
  assert.match(teacherAssignmentRoute, /updateTeacherClassRole/);

  assert.ok(exists(teacherClassesRoutePath), "teacher class list route should exist");
  const teacherClassesRoute = read(teacherClassesRoutePath);
  assert.match(teacherClassesRoute, /requireReviewer/);
  assert.match(teacherClassesRoute, /listTeacherClassAssignments|teacherClassAssignment\.findMany/);
  assert.match(teacherClassesRoute, /classId/);
  assert.match(teacherClassesRoute, /role/);

  assert.ok(exists(schoolSummaryRoutePath), "admin school summary route should exist");
  assert.ok(exists(schoolSummaryRepositoryPath), "admin school summary repository should exist");
  const schoolSummaryRoute = read(schoolSummaryRoutePath);
  const schoolSummaryRepository = read(schoolSummaryRepositoryPath);
  assert.match(schoolSummaryRoute, /requireAdmin/);
  assert.match(schoolSummaryRoute, /schoolSummaryRepository/);
  assert.match(schoolSummaryRepository, /SchoolSummaryReport/);
  assert.match(schoolSummaryRoute, /schoolId/);
  assert.match(schoolSummaryRepository, /classCount/);
  assert.match(schoolSummaryRepository, /studentCount/);
  assert.match(schoolSummaryRepository, /teacherCount/);
  assert.match(schoolSummaryRepository, /weakCoreLiteracy/);

  assert.ok(exists(schoolSummaryExportRoutePath), "admin school summary export route should exist");
  const schoolSummaryExportRoute = read(schoolSummaryExportRoutePath);
  assert.match(schoolSummaryExportRoute, /requireAdmin/);
  assert.match(schoolSummaryExportRoute, /text\/csv/);
  assert.doesNotMatch(schoolSummaryExportRoute, /apiKey|password|set-cookie/i);

  assert.match(teacherDashboardSource, /我的班级/);
  assert.match(teacherDashboardSource, /\/api\/teacher\/classes/);
  assert.match(adminConsoleSource, /学校汇总/);
  assert.match(adminConsoleSource, /\/api\/admin\/schools\/summary/);
  assert.match(adminConsoleSource, /班级教师角色/);
  assert.match(adminConsoleSource, /head_teacher/);
  assert.match(verifyAdminSource, /admin_update_teacher_class_role/);
  assert.match(verifyAdminSource, /head_teacher/);
  assert.match(verifyAdminSource, /api\/admin\/schools\/summary/);
  assert.match(verifyAdminSource, /school summary must be admin-only/);
  assert.match(verifyAdminSource, /schoolSummaryItem/);
  assert.match(verifyTeacherSource, /api\/teacher\/classes/);
  assert.match(verifyTeacherSource, /unassigned teacher class list must not include another teacher's class/);
});

test("latest test report draft keeps sensitive values out of documentation", () => {
  const reportSource = read("docs/test-reports/2026-05-19-overall-test-report.md");
  const reportIndexSource = read("docs/TEST_REPORT.md");

  assert.match(reportIndexSource, /2026-05-19/);
  assert.match(reportSource, /学校试点/);
  assert.match(reportSource, /浏览器抽查/);
  assert.match(reportSource, /MVP 验收/);
  assert.doesNotMatch(reportSource, /Cookie/i);
  assert.doesNotMatch(reportSource, /API\s*Key/i);
  assert.doesNotMatch(reportSource, /password/i);
  assert.doesNotMatch(reportSource, /set-cookie/i);
  assert.doesNotMatch(reportSource, /Bearer\s+[A-Za-z0-9._-]+/);
  assert.doesNotMatch(reportSource, /DATABASE_URL=/);
});

test("AI model center keeps API keys server-side and routes outputs through review", () => {
  const cryptoSource = read("src/server/security/crypto.ts");
  const repositorySource = read("src/server/repositories/ai-admin-repository.ts");
  const modelRoute = read("src/app/api/admin/ai/models/route.ts");
  const taskRoute = read("src/app/api/admin/ai/tasks/route.ts");
  const adminConsoleSource = read("src/components/admin-console.tsx");

  assert.match(cryptoSource, /aes-256-gcm/);
  assert.match(repositorySource, /apiKeyEncrypted: encryptSecret\(input\.apiKey\)/);
  assert.match(repositorySource, /apiKeyMasked/);
  assert.doesNotMatch(repositorySource, /apiKey:\s*row\.apiKeyEncrypted/);
  assert.match(modelRoute, /requireAdmin/);
  assert.match(taskRoute, /requireAdmin/);
  assert.match(taskRoute, /AI task output must enter review before publication/);
  assert.match(taskRoute, /AI_MODEL_NOT_CONFIGURED/);
  assert.match(repositorySource, /resolveDefaultModelConfigId/);
  assert.match(repositorySource, /preferredProvidersByTask/);
  assert.match(adminConsoleSource, /API Key，仅后端加密保存/);
  assert.match(adminConsoleSource, /model\.apiKeyMasked/);
});

test("exam paper import creates review-only AI question candidates", () => {
  const repositorySource = read("src/server/repositories/exam-paper-repository.ts");
  const routeSource = read("src/app/api/admin/exam-papers/import/route.ts");
  const adminConsoleSource = read("src/components/admin-console.tsx");
  const reviewRoute = read("src/app/api/review/questions/route.ts");
  const reviewConsoleSource = read("src/components/review-console.tsx");

  assert.match(routeSource, /requireAdmin/);
  assert.match(repositorySource, /examPaper\.create/);
  assert.match(repositorySource, /auditStatus: "pending_review"/);
  assert.match(repositorySource, /inferQuestionType/);
  assert.match(repositorySource, /parseSubQuestions/);
  assert.match(repositorySource, /reviewRisk/);
  assert.match(repositorySource, /source: "ai"/);
  assert.match(repositorySource, /reviewPolicy: "AI 拆题结果必须进入人工一审，通过后才发布。"/);
  assert.doesNotMatch(repositorySource, /auditStatus: "published"/);
  assert.match(adminConsoleSource, /生成待审核题/);
  assert.match(adminConsoleSource, /学生端暂不可见/);
  assert.match(reviewRoute, /questionType/);
  assert.match(reviewRoute, /knowledgePointId/);
  assert.match(reviewRoute, /confidence/);
  assert.match(reviewRoute, /exam_paper/);
  assert.match(reviewConsoleSource, /review-filters/);
  assert.match(reviewConsoleSource, /整卷导入/);
  assert.match(reviewConsoleSource, /低置信度/);
  assert.match(reviewConsoleSource, /结构需核对/);
});

test("AI task worker records execution without publishing AI output", () => {
  const workerSource = read("src/server/ai/task-worker.ts");
  const validatorSource = read("src/server/ai/structured-output.ts");
  const runRoute = read("src/app/api/admin/ai/tasks/[id]/run/route.ts");
  const adminConsoleSource = read("src/components/admin-console.tsx");

  assert.match(runRoute, /requireAdmin/);
  assert.match(runRoute, /runAiTask/);
  assert.match(workerSource, /status: "running"/);
  assert.match(workerSource, /status: "needs_review"/);
  assert.match(workerSource, /status: "failed"/);
  assert.match(workerSource, /maxAttempts/);
  assert.match(workerSource, /attemptCount/);
  assert.match(workerSource, /attempts/);
  assert.match(workerSource, /decryptSecret\(model\.apiKeyEncrypted\)/);
  assert.match(workerSource, /AI 输出必须进入人工一审，通过后才发布。/);
  assert.doesNotMatch(workerSource, /auditStatus: "published"/);
  assert.match(validatorSource, /validateStructuredOutput/);
  assert.match(validatorSource, /置信度必须在 0 到 1 之间/);
  assert.match(adminConsoleSource, /runAiTask/);
  assert.match(adminConsoleSource, /备用/);
  assert.match(adminConsoleSource, /重跑/);
});
