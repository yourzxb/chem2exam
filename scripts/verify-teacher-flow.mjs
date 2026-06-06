import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:4174";
const suffix = Date.now();
const studentUsername = `teacher_flow_student_${suffix}`;
const teacherUsername = `teacher_flow_teacher_${suffix}`;
const otherTeacherUsername = `teacher_flow_other_teacher_${suffix}`;
const adminUsername = `teacher_flow_admin_${suffix}`;
const password = "123456";

async function main() {
  const student = await registerUser(studentUsername, "student");
  await submitAnswer(student.cookie, {
    questionId: "q_acid_base_1",
    selectedAnswer: "A",
    durationSeconds: 18,
    difficultyFeedback: "hard"
  });
  await submitAnswer(student.cookie, {
    questionId: "q_indicator_1",
    selectedAnswer: "B",
    durationSeconds: 26,
    difficultyFeedback: "medium"
  });
  await submitAnswer(student.cookie, {
    questionId: "q_redox_1",
    selectedAnswer: "A",
    durationSeconds: 34,
    difficultyFeedback: "hard"
  });

  const teacher = await registerUser(teacherUsername, "teacher");
  const otherTeacher = await registerUser(otherTeacherUsername, "teacher");
  const admin = await registerUser(adminUsername, "admin");
  const classScope = await createAuthorizedClassScope(admin.cookie, teacher.user.id, student.user.id);
  const classQuery = `classId=${encodeURIComponent(classScope.classId)}`;
  const teacherClasses = await fetchTeacherClasses(teacher.cookie);
  assert(
    teacherClasses.classes.some((item) => item.classId === classScope.classId && item.role === "teacher"),
    "expected assigned teacher class list to include authorized class"
  );
  assert(teacherClasses.defaultClassId === classScope.classId, "expected teacher classes endpoint to select the authorized class by default");
  assert(teacherClasses.canUseGlobalScope === false, "expected teacher classes endpoint to deny global scope to ordinary teachers");
  const adminClasses = await fetchTeacherClasses(admin.cookie);
  assert(adminClasses.canUseGlobalScope === true, "expected admin teacher classes endpoint to allow global scope");
  assert(adminClasses.classes.some((item) => item.classId === "all"), "expected admin teacher classes endpoint to include global scope");
  const otherTeacherClasses = await fetchTeacherClasses(otherTeacher.cookie);
  assert(
    otherTeacherClasses.classes.every((item) => item.classId !== classScope.classId),
    "unassigned teacher class list must not include another teacher's class"
  );
  const deniedReport = await fetch(`${baseUrl}/api/teacher/classes/overview?${classQuery}`, {
    headers: { Cookie: otherTeacher.cookie }
  });
  assert(deniedReport.status === 403, "expected unassigned teacher to be denied explicit class report");

  const report = await fetchTeacherReport(teacher.cookie, `${classQuery}`);
  assert(report.answerCount >= 3, "expected teacher report to include answer records");
  assert(Array.isArray(report.weakKnowledgePoints), "expected weak knowledge point summary");
  assert(Array.isArray(report.weakQuestionTypes), "expected weak question type summary");
  assert(Array.isArray(report.weakCoreLiteracy), "expected weak core literacy summary");
  assert(report.weakQuestionTypes.length > 0, "expected at least one weak question type");
  assert(report.weakCoreLiteracy.length > 0, "expected at least one weak core literacy item");
  assert(report.teachingSuggestions.some((item) => item.includes("核心素养")), "expected core literacy teaching suggestion");

  const gradeReport = await fetchTeacherReport(teacher.cookie, `${classQuery}&grade=高一`);
  assert(gradeReport.filters.grade === "高一", "expected grade filter echo in report");
  assert(gradeReport.answerCount >= 1, "expected grade-filtered report to include senior one answers");
  assert(
    gradeReport.weakKnowledgePoints.some((point) => point.knowledgePointId === "redox"),
    "expected grade-filtered report to focus on senior one knowledge points"
  );

  const futureReport = await fetchTeacherReport(teacher.cookie, `${classQuery}&startDate=2999-01-01&endDate=2999-01-02`);
  assert(futureReport.answerCount === 0, "expected future date range to exclude existing answers");

  const breakdown = await fetchKnowledgePointBreakdown(teacher.cookie, "acid_base", `${classQuery}`);
  assert(breakdown.knowledgePointId === "acid_base", "expected knowledge point breakdown id");
  assert(breakdown.students.some((item) => item.studentId === student.user.id), "expected breakdown to include verification student");
  assert(
    breakdown.students.some((item) => item.wrongCount >= 1 && item.suggestion.includes("建议")),
    "expected breakdown to include student teaching suggestion"
  );

  const exported = await fetchTeacherReportCsv(teacher.cookie, `${classQuery}`);
  assert(exported.includes("班级"), "expected exported CSV header");
  assert(exported.includes("薄弱知识点"), "expected exported CSV weak knowledge section");
  assert(exported.includes("学生"), "expected exported CSV student section");

  const studentDetail = await fetchStudentDetail(teacher.cookie, student.user.id, `${classQuery}`);
  assert(studentDetail.studentId === student.user.id, "expected student detail id");
  assert(studentDetail.wrongQuestions.length >= 1, "expected student wrong question list");
  assert(studentDetail.weakKnowledgePoints.length >= 1, "expected student weak knowledge summary");
  assert(studentDetail.suggestions.some((item) => item.includes("建议")), "expected student detail teaching suggestion");

  const wrongQuestionCsv = await fetchStudentWrongQuestionCsv(teacher.cookie, student.user.id, `${classQuery}`);
  assert(wrongQuestionCsv.includes("错题") || wrongQuestionCsv.includes("题干"), "expected wrong question CSV content");
  assert(wrongQuestionCsv.includes("复盘建议"), "expected wrong question CSV review suggestion");

  const assigned = await assignStudentReviewTasks(
    teacher.cookie,
    student.user.id,
    `${classQuery}`,
    studentDetail.wrongQuestions.map((question) => question.questionId)
  );
  assert(assigned.assignedCount >= 1, "expected assigned review tasks");
  const assignedTaskCount = await prisma.remediationPath.count({
    where: {
      studentId: student.user.id,
      status: { startsWith: "assigned_review:" }
    }
  });
  assert(assignedTaskCount >= assigned.assignedCount, "expected assigned review tasks in database");

  const studentReportWithTasks = await fetchStudentReport(student.cookie);
  assert(studentReportWithTasks.reviewTasks.length >= assigned.assignedCount, "expected student report to include assigned review tasks");
  assert(
    studentReportWithTasks.todayTasks.some((task) => task.actionType === "complete_review"),
    "expected student report to include today's review task"
  );
  assert(
    studentReportWithTasks.reviewTasks.some((task) => task.status === "assigned" && task.encouragement),
    "expected assigned review task with encouragement"
  );

  const assignedTask = studentReportWithTasks.reviewTasks.find((task) => task.status === "assigned");
  assert(assignedTask, "expected an assigned review task to complete");
  const batchReminderResult = await batchRemindStudentReviewTasks(teacher.cookie, `${classQuery}`, [student.user.id]);
  assert(batchReminderResult.studentCount >= 1, "expected batch reminder to include selected student");
  assert(batchReminderResult.remindedCount >= 1, "expected batch reminder to update assigned review tasks");
  const reminderResult = await remindStudentReviewTasks(teacher.cookie, student.user.id, `${classQuery}`);
  assert(reminderResult.skippedDueToCooldown >= 1, "expected immediate reminder to respect cooldown");
  const completedTask = await completeStudentReviewTask(student.cookie, assignedTask.id, "我会先找题干条件，再判断对应知识点。");
  assert(completedTask.task.status === "completed", "expected completed review task status");
  assert(completedTask.task.reviewNote?.includes("题干条件"), "expected completed task to keep student review note");
  assert(completedTask.task.reminderCount >= 1, "expected completed task to keep reminder count");
  assert(completedTask.reward.xp >= 15, "expected review completion growth reward");
  const retestAnswer = await submitAnswer(student.cookie, {
    questionId: assignedTask.questionId,
    selectedAnswer: correctAnswerForQuestion(assignedTask.questionId),
    durationSeconds: 24,
    difficultyFeedback: "medium",
    reviewTaskId: assignedTask.id
  });
  assert(retestAnswer.retest?.recorded === true, "expected retest answer to be linked to review task");
  assert(retestAnswer.retest?.isCorrect === true, "expected linked retest answer to be correct");
  assert(
    retestAnswer.retest?.nextAction?.actionType === "challenge_variant",
    "expected successful retest to return challenge next action"
  );
  assert(retestAnswer.retest?.nextAction?.status === "available", "expected challenge next action to be available first");
  const challengeAnswer = await submitAnswer(student.cookie, {
    questionId: assignedTask.questionId,
    selectedAnswer: correctAnswerForQuestion(assignedTask.questionId),
    durationSeconds: 27,
    difficultyFeedback: "medium",
    reviewTaskId: assignedTask.id
  });
  assert(
    challengeAnswer.retest?.nextActionReward?.reason.includes("变式题挑战"),
    "expected successful challenge action to create breakthrough reward"
  );
  const studentReportAfterRetest = await fetchStudentReport(student.cookie);
  assert(
    studentReportAfterRetest.reviewTasks.some((task) => task.nextAction?.actionType === "challenge_variant" && task.nextAction.status === "completed"),
    "expected student report to show completed challenge next action"
  );
  assert(
    studentReportAfterRetest.completedTasks.some((task) => task.actionType === "challenge_variant"),
    "expected student report completed tasks to include challenge next action"
  );
  assert(
    studentReportAfterRetest.growthTimeline.some((event) => event.eventType === "breakthrough"),
    "expected student growth timeline to include breakthrough reward"
  );
  assert(studentReportAfterRetest.weeklyGrowthSummary.xp >= 1, "expected weekly growth summary to include XP");
  assert(
    studentReportAfterRetest.weeklyGrowthSummary.breakthroughCount >= 1,
    "expected weekly growth summary to count breakthrough rewards"
  );
  assert(
    studentReportAfterRetest.coreLiteracyGrowth.some((item) => item.answerCount >= 1 && item.encouragement),
    "expected student report to include core literacy growth summary"
  );
  assert(studentReportAfterRetest.weeklyReviewCards.length >= 1, "expected student report to include weekly review cards");
  assert(studentReportAfterRetest.milestoneBadges.some((badge) => badge.unlocked), "expected student report to include unlocked milestone badge");
  const selectedGoal = await selectCoreLiteracyGoal(student.cookie, "evidence_model");
  assert(selectedGoal.selected === true, "expected selected core literacy goal");
  const studentReportAfterGoal = await fetchStudentReport(student.cookie);
  assert(
    studentReportAfterGoal.coreLiteracyGoals.some((goal) => goal.literacyTag === "evidence_model" && goal.selected),
    "expected student report to keep selected core literacy goal"
  );
  await submitAnswer(student.cookie, {
    questionId: "q_indicator_1",
    selectedAnswer: "A",
    durationSeconds: 21,
    difficultyFeedback: "medium",
    startedAt: new Date().toISOString()
  });
  await submitAnswer(student.cookie, {
    questionId: "q_indicator_2",
    selectedAnswer: "B",
    durationSeconds: 23,
    difficultyFeedback: "medium",
    startedAt: new Date().toISOString()
  });
  const studentReportAfterGoalCompletion = await fetchStudentReport(student.cookie);
  assert(
    studentReportAfterGoalCompletion.coreLiteracyGoals.some((goal) => goal.literacyTag === "evidence_model" && goal.status === "completed"),
    "expected selected core literacy goal to complete after follow-up evidence"
  );
  assert(
    studentReportAfterGoalCompletion.coreLiteracyGoalHistory.some((goal) => goal.literacyTag === "evidence_model"),
    "expected completed core literacy goal history"
  );

  const completedTaskCount = await prisma.remediationPath.count({
    where: {
      studentId: student.user.id,
      status: { startsWith: "completed_review:" }
    }
  });
  assert(completedTaskCount >= 1, "expected completed review task in database");
  const reviewRewardCount = await prisma.rewardEvent.count({
    where: {
      studentId: student.user.id,
      eventType: "review_completed"
    }
  });
  assert(reviewRewardCount >= 1, "expected review completion reward in database");
  const challengeRewardCount = await prisma.rewardEvent.count({
    where: {
      studentId: student.user.id,
      eventType: "breakthrough",
      reason: "完成变式题挑战，把方法迁移到新情境"
    }
  });
  assert(challengeRewardCount >= 1, "expected variant challenge reward in database");
  const literacyProgressRewardCount = await prisma.rewardEvent.count({
    where: {
      studentId: student.user.id,
      eventType: "literacy_progress",
      reason: "完成核心素养目标：证据推理与模型认知"
    }
  });
  assert(literacyProgressRewardCount >= 1, "expected core literacy goal completion reward in database");
  const nextRoundResult = await batchAssignNextRoundTasks(teacher.cookie, `${classQuery}`, [student.user.id], "variant_challenge");
  assert(nextRoundResult.assignedCount >= 1, "expected teacher to assign next-round variant challenge task");
  const nextRoundTaskCount = await prisma.remediationPath.count({
    where: {
      studentId: student.user.id,
      status: { startsWith: "assigned_review:" },
      reason: { contains: "变式题挑战" }
    }
  });
  assert(nextRoundTaskCount >= 1, "expected next-round variant challenge task in database");
  const variantTaskTypeReport = await fetchTeacherReport(teacher.cookie, `${classQuery}&reviewTaskType=variant_challenge`);
  assert(
    variantTaskTypeReport.filters.reviewTaskType === "variant_challenge",
    "expected review task type filter echo in report"
  );
  assert(
    variantTaskTypeReport.students.some((item) => item.studentId === student.user.id && item.variantChallengeTaskCount >= 1),
    "expected variant challenge task type filter to include selected student"
  );
  assert(
    variantTaskTypeReport.nextRoundSummary.taskBreakdown.some((item) =>
      item.taskType === "variant_challenge" && item.assignedStudents.some((candidate) => candidate.studentId === student.user.id)
    ),
    "expected next-round summary to list assigned variant challenge students"
  );
  const nextRoundTask = await prisma.remediationPath.findFirst({
    where: {
      studentId: student.user.id,
      status: { startsWith: "assigned_review:" },
      reason: { contains: "变式题挑战" }
    },
    orderBy: { createdAt: "desc" }
  });
  assert(nextRoundTask, "expected assigned next-round task to complete");
  const completedNextRoundTask = await completeStudentReviewTask(student.cookie, nextRoundTask.id, "我完成了变式题挑战，会继续检查题干证据。");
  assert(completedNextRoundTask.task.status === "completed", "expected student to complete next-round task");
  const teacherFeedback = await saveTeacherReviewTaskFeedback(
    teacher.cookie,
    student.user.id,
    nextRoundTask.id,
    "变式挑战已完成，后续讲评可请学生说明题干证据如何迁移。",
    classQuery
  );
  assert(teacherFeedback.teacherFeedbackNote.includes("题干证据"), "expected teacher feedback note to be saved");
  assert(teacherFeedback.completionFeedback.includes("变式题挑战"), "expected teacher feedback to include task completion feedback");
  const nextRoundCompletionReport = await fetchTeacherReport(teacher.cookie, `${classQuery}&reviewTaskType=variant_challenge`);
  assert(
    nextRoundCompletionReport.nextRoundSummary.taskBreakdown.some((item) =>
      item.taskType === "variant_challenge" && item.completedStudents.some((candidate) => candidate.studentId === student.user.id)
    ),
    "expected next-round summary to list completed variant challenge students"
  );
  assert(
    nextRoundCompletionReport.nextRoundSummary.taskBreakdown.some((item) =>
      item.taskType === "variant_challenge" && item.teacherFeedbackCount >= 1 && item.teachingSuggestion.includes("变式挑战")
    ),
    "expected next-round summary to include teacher feedback count and teaching suggestion"
  );
  const reviewFollowupTypeCsv = await fetchTeacherReviewFollowupCsv(teacher.cookie, `${classQuery}&reviewTaskType=variant_challenge`);
  assert(reviewFollowupTypeCsv.includes("下一轮任务类型明细"), "expected review followup CSV to include next-round task details");
  assert(reviewFollowupTypeCsv.includes("变式题挑战"), "expected review followup CSV to include variant challenge detail");
  assert(reviewFollowupTypeCsv.includes("课堂讲评建议"), "expected review followup CSV to include classroom teaching suggestion");
  const feedbackNotedReport = await fetchTeacherReport(teacher.cookie, `${classQuery}&feedbackStatus=noted`);
  assert(feedbackNotedReport.filters.feedbackStatus === "noted", "expected teacher feedback status filter echo in report");
  assert(
    feedbackNotedReport.students.some((item) => item.studentId === student.user.id && item.teacherFeedbackCount >= 1),
    "expected noted feedback filter to include student with teacher feedback"
  );
  assert(
    feedbackNotedReport.teacherFeedbackSummary.teachingChecklist.some((item) => item.feedbackNote.includes("题干证据")),
    "expected teacher feedback checklist to include saved classroom note"
  );
  const feedbackPendingReport = await fetchTeacherReport(teacher.cookie, `${classQuery}&feedbackStatus=pending_feedback`);
  assert(
    feedbackPendingReport.filters.feedbackStatus === "pending_feedback",
    "expected pending teacher feedback filter echo in report"
  );
  assert(
    feedbackPendingReport.students.every((item) => item.pendingTeacherFeedbackCount > 0),
    "expected pending teacher feedback filter to only include students with completed tasks awaiting notes"
  );
  const feedbackFollowupCsv = await fetchTeacherReviewFollowupCsv(teacher.cookie, `${classQuery}&feedbackStatus=noted`);
  assert(feedbackFollowupCsv.includes("老师备注讲评清单"), "expected feedback followup CSV to include teacher feedback checklist");
  assert(feedbackFollowupCsv.includes("题干证据"), "expected feedback followup CSV to include saved teacher note");

  const studentDetailAfterReview = await fetchStudentDetail(teacher.cookie, student.user.id, `${classQuery}`);
  assert(studentDetailAfterReview.reviewTaskSummary.completedCount >= 1, "expected teacher detail to show completed review task");
  assert(
    studentDetailAfterReview.reviewTasks.some((task) => task.status === "completed"),
    "expected teacher detail to include completed review task"
  );
  assert(
    studentDetailAfterReview.reviewTasks.some((task) => task.reviewNote?.includes("题干条件")),
    "expected teacher detail to show student review note"
  );
  assert(
    studentDetailAfterReview.reviewTasks.some((task) => task.teacherFeedbackNote?.includes("题干证据") && task.teachingSuggestion.includes("变式")),
    "expected teacher detail to show teacher feedback and teaching suggestion"
  );
  assert(
    studentDetailAfterReview.reviewTasks.some((task) => task.reminderCount >= 1 && task.lastReminderAt),
    "expected teacher detail to show review reminder count"
  );
  assert(
    studentDetailAfterReview.reviewTasks.some((task) => task.retestIsCorrect === true && task.retestCompletedAt),
    "expected teacher detail to show successful retest result"
  );

  await prisma.remediationPath.create({
    data: {
      studentId: student.user.id,
      sourceQuestionId: "q_ai_pending_1",
      sourceKnowledgePointId: "change",
      targetKnowledgePointId: "change",
      reason: "老师布置错题复盘任务：未发布题只作为跟进线索",
      status: `completed_review:${teacher.user.id}`,
      completedAt: new Date(),
      teacherFeedbackNote: "用已发布替代题讲清变化判断的证据入口。",
      teacherFeedbackAt: new Date(),
      teacherFeedbackBy: teacher.user.id
    }
  });
  const teachingMaterials = await fetchTeacherTeachingMaterials(
    teacher.cookie,
    `${classQuery}&groupBy=task_type&reviewTaskType=variant_challenge&feedbackStatus=noted`
  );
  assert(teachingMaterials.materials.length >= 1, "expected teacher materials endpoint to return noted classroom materials");
  assert(teachingMaterials.groups.length >= 1, "expected teacher materials endpoint to return grouped materials");
  assert(teachingMaterials.template.teachingSteps.length >= 1, "expected teacher materials endpoint to return a rule-generated template");
  assert(
    teachingMaterials.materials.some((material) => material.teacherFeedbackNote?.includes("题干证据")),
    "expected teacher materials to include saved teacher feedback"
  );
  const redactedMaterials = await fetchTeacherTeachingMaterials(
    teacher.cookie,
    `${classQuery}&knowledgePointId=change&feedbackStatus=noted&groupBy=feedback_status`
  );
  assert(
    redactedMaterials.materials.some((material) => material.question.isPublished === false && !material.question.stem),
    "expected unpublished questions to hide stem in teacher materials"
  );
  const teachingMaterialsCsv = await fetchTeacherTeachingMaterialsExport(
    teacher.cookie,
    `${classQuery}&groupBy=task_type&reviewTaskType=variant_challenge&feedbackStatus=noted&format=csv`,
    "text/csv"
  );
  assert(teachingMaterialsCsv.includes("课堂讲评素材"), "expected teacher materials CSV title");
  assert(teachingMaterialsCsv.includes("变式题挑战"), "expected teacher materials CSV to include task type");
  assert(teachingMaterialsCsv.includes("题干证据"), "expected teacher materials CSV to include teacher feedback note");
  const teachingMaterialsMarkdown = await fetchTeacherTeachingMaterialsExport(
    teacher.cookie,
    `${classQuery}&knowledgePointId=change&feedbackStatus=noted&groupBy=feedback_status&format=markdown`,
    "text/markdown"
  );
  assert(teachingMaterialsMarkdown.includes("# 课堂讲评模板"), "expected teacher materials markdown template");
  assert(teachingMaterialsMarkdown.includes("题目未发布或已下架"), "expected markdown export to explain redacted unpublished content");
  assert(!teachingMaterialsMarkdown.includes("下列变化中，属于化学变化的是哪一项"), "expected markdown export to hide unpublished stem");
  assert(!teachingMaterialsMarkdown.includes("纸张燃烧生成了新物质"), "expected markdown export to hide unpublished analysis");

  const assignedReviewReport = await fetchTeacherReport(teacher.cookie, `${classQuery}&reviewStatus=assigned`);
  assert(
    assignedReviewReport.filters.reviewStatus === "assigned",
    "expected assigned review status filter echo in report"
  );
  assert(
    assignedReviewReport.students.every((item) => item.assignedReviewCount > 0),
    "expected assigned review status filter to only include students with assigned review tasks"
  );
  const remindedReviewReport = await fetchTeacherReport(teacher.cookie, `${classQuery}&reminderStatus=reminded`);
  assert(
    remindedReviewReport.filters.reminderStatus === "reminded",
    "expected reminder status filter echo in report"
  );
  assert(
    remindedReviewReport.students.some((item) => item.reviewReminderCount > 0),
    "expected reminder status filter to include students with reminder records"
  );
  const retestReport = await fetchTeacherReport(teacher.cookie, `${classQuery}`);
  assert(retestReport.retestSummary.successfulCount >= 1, "expected class report to summarize successful retests");
  assert(retestReport.retestSummary.completedCount >= 1, "expected class report to count completed retests");
  assert(
    retestReport.nextRoundSummary.variantAssignedCount + retestReport.nextRoundSummary.variantCompletedCount >= 1,
    "expected next-round summary to count variant tasks"
  );
  assert(retestReport.nextRoundSummary.variantCompletedCount >= 1, "expected next-round summary to count completed variant tasks");
  assert(
    retestReport.nextRoundSummary.totalAssignedCount + retestReport.nextRoundSummary.totalCompletedCount >= 1,
    "expected next-round summary to count next-round tasks"
  );
  assert(retestReport.reviewTrend.windowDays === 7, "expected review trend window");
  assert(retestReport.reviewTrend.assignedCount >= 1, "expected review trend to count assigned tasks");
  assert(retestReport.reviewTrend.completedCount >= 1, "expected review trend to count completed tasks");
  assert(retestReport.reviewTrend.retestedCount >= 1, "expected review trend to count retests");
  assert(retestReport.reviewGroups.some((group) => group.groupKey === "pending_retest"), "expected stratified review groups");
  assert(
    retestReport.students.some((item) => item.successfulRetestCount >= 1 && item.retestSuggestion.includes("迁移成功")),
    "expected student summary to include retest migration suggestion"
  );
  const successfulRetestReport = await fetchTeacherReport(teacher.cookie, `${classQuery}&retestStatus=success`);
  assert(
    successfulRetestReport.filters.retestStatus === "success",
    "expected retest status filter echo in report"
  );
  assert(
    successfulRetestReport.students.some((item) => item.successfulRetestCount >= 1),
    "expected retest success filter to include students with successful retests"
  );
  const pendingReviewGroupReport = await fetchTeacherReport(teacher.cookie, `${classQuery}&reviewGroup=pending_retest`);
  assert(
    pendingReviewGroupReport.filters.reviewGroup === "pending_retest",
    "expected review group filter echo in report"
  );
  assert(
    pendingReviewGroupReport.students.every((item) => item.pendingRetestCount > 0),
    "expected pending retest group filter to only include students waiting for retest"
  );
  const reviewFollowupCsv = await fetchTeacherReviewFollowupCsv(teacher.cookie, `${classQuery}&reviewGroup=pending_retest`);
  assert(reviewFollowupCsv.includes("复盘跟进名单"), "expected review followup CSV title");
  assert(reviewFollowupCsv.includes("待复测"), "expected review followup CSV to include pending retest status");

  const studentRecord = await prisma.user.findUnique({ where: { id: student.user.id } });
  assert(studentRecord?.role === "student", "expected verification student in database");

  console.log(
    JSON.stringify(
      {
        ok: true,
        studentId: student.user.id,
        teacherId: teacher.user.id,
        classId: classScope.classId,
        teacherClassListCount: teacherClasses.classes.length,
        otherTeacherClassListCount: otherTeacherClasses.classes.length,
        deniedUnassignedTeacher: deniedReport.status,
        answerCount: report.answerCount,
        seniorOneAnswerCount: gradeReport.answerCount,
        futureAnswerCount: futureReport.answerCount,
        drilldownStudents: breakdown.students.length,
        exportedCsvBytes: exported.length,
        studentWrongQuestions: studentDetail.wrongQuestions.length,
        wrongQuestionCsvBytes: wrongQuestionCsv.length,
        assignedReviewTasks: assigned.assignedCount,
        completedReviewTasks: completedTaskCount,
        remindedReviewTasks: batchReminderResult.remindedCount,
        cooldownSkippedTasks: reminderResult.skippedDueToCooldown,
        retestRecorded: Boolean(retestAnswer.retest?.recorded),
        retestSuccessCount: retestReport.retestSummary.successfulCount,
        retestPendingCount: retestReport.retestSummary.pendingCount,
        retestFilteredStudents: successfulRetestReport.students.length,
        reviewGroupFilteredStudents: pendingReviewGroupReport.students.length,
        reviewFollowupCsvBytes: reviewFollowupCsv.length,
        reviewTrendRetests: retestReport.reviewTrend.retestedCount,
        reviewGroupCount: retestReport.reviewGroups.length,
        reviewRewardCount,
        challengeRewardCount,
        literacyProgressRewardCount,
        nextRoundAssignedTasks: nextRoundResult.assignedCount,
        nextRoundVariantAssignedTasks: retestReport.nextRoundSummary.variantAssignedCount,
        nextRoundVariantCompletedTasks: retestReport.nextRoundSummary.variantCompletedCount,
        nextRoundCompletionRate: retestReport.nextRoundSummary.completionRate,
        reviewTaskTypeFilteredStudents: variantTaskTypeReport.students.length,
        reviewTaskTypeCsvBytes: reviewFollowupTypeCsv.length,
        teacherFeedbackChecklistCount: feedbackNotedReport.teacherFeedbackSummary.teachingChecklist.length,
        teacherFeedbackFilteredStudents: feedbackNotedReport.students.length,
        pendingTeacherFeedbackStudents: feedbackPendingReport.students.length,
        teacherFeedbackCsvBytes: feedbackFollowupCsv.length,
        teachingMaterialCount: teachingMaterials.materials.length,
        teachingMaterialGroupCount: teachingMaterials.groups.length,
        redactedTeachingMaterialCount: redactedMaterials.materials.filter((material) => !material.question.isPublished).length,
        teachingMaterialsCsvBytes: teachingMaterialsCsv.length,
        teachingMaterialsMarkdownBytes: teachingMaterialsMarkdown.length,
        todayTaskCount: studentReportAfterRetest.todayTasks.length,
        completedTaskCount: studentReportAfterRetest.completedTasks.length,
        growthTimelineCount: studentReportAfterRetest.growthTimeline.length,
        weeklyReviewCardCount: studentReportAfterRetest.weeklyReviewCards.length,
        weeklyGrowthXp: studentReportAfterRetest.weeklyGrowthSummary.xp,
        weeklyBreakthroughCount: studentReportAfterRetest.weeklyGrowthSummary.breakthroughCount,
        coreLiteracyGrowthCount: studentReportAfterRetest.coreLiteracyGrowth.length,
        coreLiteracyGoalCount: studentReportAfterGoalCompletion.coreLiteracyGoals.length,
        coreLiteracyGoalHistoryCount: studentReportAfterGoalCompletion.coreLiteracyGoalHistory.length,
        milestoneBadgeCount: studentReportAfterRetest.milestoneBadges.length,
        weakQuestionTypes: report.weakQuestionTypes.length,
        weakCoreLiteracy: report.weakCoreLiteracy.length,
        teachingSuggestions: report.teachingSuggestions.length
      },
      null,
      2
    )
  );
}

async function fetchStudentReport(cookie) {
  const response = await fetch(`${baseUrl}/api/student/reports/latest`, {
    headers: { Cookie: cookie }
  });
  if (!response.ok) {
    throw new Error(`student report failed: ${response.status} ${await response.text()}`);
  }
  const { report } = await response.json();
  return report;
}

async function fetchTeacherClasses(cookie) {
  const response = await fetch(`${baseUrl}/api/teacher/classes`, {
    headers: { Cookie: cookie }
  });
  if (!response.ok) {
    throw new Error(`teacher classes failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function selectCoreLiteracyGoal(cookie, literacyTag) {
  const response = await fetch(`${baseUrl}/api/student/core-literacy-goals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify({ literacyTag })
  });
  if (!response.ok) {
    throw new Error(`select core literacy goal failed: ${response.status} ${await response.text()}`);
  }
  const { goal } = await response.json();
  return goal;
}

async function completeStudentReviewTask(cookie, taskId, reviewNote) {
  const response = await fetch(`${baseUrl}/api/student/review-tasks/${taskId}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify({ reviewNote })
  });
  if (!response.ok) {
    throw new Error(`complete review task failed: ${response.status} ${await response.text()}`);
  }
  const { result } = await response.json();
  return result;
}

async function saveTeacherReviewTaskFeedback(cookie, studentId, taskId, feedbackNote, query) {
  const response = await fetch(`${baseUrl}/api/teacher/classes/students/${studentId}/review-tasks/${taskId}/feedback?${query}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify({ feedbackNote })
  });
  if (!response.ok) {
    throw new Error(`save teacher review task feedback failed: ${response.status} ${await response.text()}`);
  }
  const { result } = await response.json();
  return result;
}

async function remindStudentReviewTasks(cookie, studentId, query) {
  const response = await fetch(`${baseUrl}/api/teacher/classes/students/${studentId}/review-tasks/remind?${query}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify({ cooldownHours: 24 })
  });
  if (!response.ok) {
    throw new Error(`remind review tasks failed: ${response.status} ${await response.text()}`);
  }
  const { result } = await response.json();
  return result;
}

async function batchRemindStudentReviewTasks(cookie, query, studentIds) {
  const response = await fetch(`${baseUrl}/api/teacher/classes/review-tasks/remind?${query}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify({ studentIds, cooldownHours: 24 })
  });
  if (!response.ok) {
    throw new Error(`batch remind review tasks failed: ${response.status} ${await response.text()}`);
  }
  const { result } = await response.json();
  return result;
}

async function batchAssignNextRoundTasks(cookie, query, studentIds, taskType) {
  const response = await fetch(`${baseUrl}/api/teacher/classes/review-tasks/next-round?${query}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify({ studentIds, taskType })
  });
  if (!response.ok) {
    throw new Error(`batch assign next round tasks failed: ${response.status} ${await response.text()}`);
  }
  const { result } = await response.json();
  return result;
}

async function fetchStudentWrongQuestionCsv(cookie, studentId, query) {
  const response = await fetch(`${baseUrl}/api/teacher/classes/students/${studentId}/wrong-questions/export?${query}`, {
    headers: { Cookie: cookie }
  });
  if (!response.ok) {
    throw new Error(`student wrong question export failed: ${response.status} ${await response.text()}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes("text/csv"), "expected wrong question CSV content type");
  return response.text();
}

async function assignStudentReviewTasks(cookie, studentId, query, questionIds) {
  const response = await fetch(`${baseUrl}/api/teacher/classes/students/${studentId}/review-tasks?${query}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify({ questionIds })
  });
  if (!response.ok) {
    throw new Error(`assign review tasks failed: ${response.status} ${await response.text()}`);
  }
  const { result } = await response.json();
  return result;
}

async function fetchStudentDetail(cookie, studentId, query) {
  const response = await fetch(`${baseUrl}/api/teacher/classes/students/${studentId}/detail?${query}`, {
    headers: { Cookie: cookie }
  });
  if (!response.ok) {
    throw new Error(`student detail failed: ${response.status} ${await response.text()}`);
  }
  const { detail } = await response.json();
  return detail;
}

async function fetchKnowledgePointBreakdown(cookie, knowledgePointId, query) {
  const response = await fetch(`${baseUrl}/api/teacher/classes/knowledge-points/${knowledgePointId}/students?${query}`, {
    headers: { Cookie: cookie }
  });
  if (!response.ok) {
    throw new Error(`knowledge point breakdown failed: ${response.status} ${await response.text()}`);
  }
  const { breakdown } = await response.json();
  return breakdown;
}

async function fetchTeacherReportCsv(cookie, query) {
  const response = await fetch(`${baseUrl}/api/teacher/classes/overview/export?${query}`, {
    headers: { Cookie: cookie }
  });
  if (!response.ok) {
    throw new Error(`teacher report export failed: ${response.status} ${await response.text()}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes("text/csv"), "expected CSV content type");
  return response.text();
}

async function fetchTeacherReviewFollowupCsv(cookie, query) {
  const response = await fetch(`${baseUrl}/api/teacher/classes/review-followups/export?${query}`, {
    headers: { Cookie: cookie }
  });
  if (!response.ok) {
    throw new Error(`teacher review followup export failed: ${response.status} ${await response.text()}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes("text/csv"), "expected review followup CSV content type");
  return response.text();
}

async function fetchTeacherTeachingMaterials(cookie, query) {
  const response = await fetch(`${baseUrl}/api/teacher/classes/teaching-materials?${query}`, {
    headers: { Cookie: cookie }
  });
  if (!response.ok) {
    throw new Error(`teacher materials failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function fetchTeacherTeachingMaterialsExport(cookie, query, expectedContentType) {
  const response = await fetch(`${baseUrl}/api/teacher/classes/teaching-materials/export?${query}`, {
    headers: { Cookie: cookie }
  });
  if (!response.ok) {
    throw new Error(`teacher materials export failed: ${response.status} ${await response.text()}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes(expectedContentType), `expected teacher materials export content type ${expectedContentType}`);
  return response.text();
}

async function fetchTeacherReport(cookie, query) {
  const response = await fetch(`${baseUrl}/api/teacher/classes/overview?${query}`, {
    headers: { Cookie: cookie }
  });
  if (!response.ok) {
    throw new Error(`teacher report failed: ${response.status} ${await response.text()}`);
  }
  const { report } = await response.json();
  return report;
}

async function createAuthorizedClassScope(adminCookie, teacherId, studentId) {
  const school = await postJson(adminCookie, "/api/admin/schools", {
    name: `老师端验收学校 ${suffix}`,
    region: "本地验收"
  });
  const classResult = await postJson(adminCookie, "/api/admin/classes", {
    schoolId: school.school.id,
    name: `老师端验收班 ${suffix}`,
    grade: "初三"
  });
  await postJson(adminCookie, `/api/admin/classes/${classResult.classGroup.id}/teachers`, { teacherId });
  await postJson(adminCookie, `/api/admin/classes/${classResult.classGroup.id}/students`, { studentId });
  return {
    schoolId: school.school.id,
    classId: classResult.classGroup.id
  };
}

async function postJson(cookie, path, payload) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function registerUser(username, role) {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role })
  });
  if (!response.ok) {
    throw new Error(`${role} register failed: ${response.status} ${await response.text()}`);
  }
  const cookie = response.headers.get("set-cookie");
  assert(cookie, `${role} register response did not set a session cookie`);
  const { user } = await response.json();
  return { cookie, user };
}

async function submitAnswer(cookie, payload) {
  const response = await fetch(`${baseUrl}/api/student/answers/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify({
      ...payload,
      startedAt: payload.startedAt ?? new Date(Date.now() - payload.durationSeconds * 1000).toISOString()
    })
  });
  if (!response.ok) {
    throw new Error(`answer submit failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function correctAnswerForQuestion(questionId) {
  const map = {
    q_acid_base_1: "B",
    q_indicator_1: "A",
    q_indicator_2: "B",
    q_redox_1: "B"
  };
  return map[questionId] ?? "A";
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
