import { knowledgePoints } from "@/data/chemistry-seed";
import { getPrismaClient, hasDatabaseUrl } from "@/server/db/prisma";

export interface TeacherReportFilters {
  grade?: string;
  startDate?: Date;
  endDate?: Date;
  reviewStatus?: "all" | "assigned" | "completed" | "none";
  reminderStatus?: "all" | "reminded" | "not_reminded" | "cooldown";
  retestStatus?: "all" | "success" | "needs_consolidation" | "pending" | "none";
  reviewGroup?: "all" | "needs_consolidation" | "pending_retest" | "ready_for_challenge" | "needs_assignment";
  reviewTaskType?: "all" | "review" | "variant_challenge" | "prerequisite_consolidation";
  feedbackStatus?: "all" | "noted" | "pending_feedback";
}

type ReviewTaskType = "review" | "variant_challenge" | "prerequisite_consolidation";

interface NextRoundTaskStudent {
  studentId: string;
  displayName: string;
  taskCount: number;
  latestTaskAt?: string;
}

export interface TeacherClassReport {
  classId: string;
  filters: {
    grade?: string;
    startDate?: string;
    endDate?: string;
    reviewStatus?: string;
    reminderStatus?: string;
    retestStatus?: string;
    reviewGroup?: string;
    reviewTaskType?: string;
    feedbackStatus?: string;
  };
  studentCount: number;
  answerCount: number;
  accuracy: number;
  remediationCount: number;
  averageDurationSeconds: number;
  weakKnowledgePoints: Array<{
    knowledgePointId: string;
    name: string;
    wrongCount: number;
    suggestion: string;
  }>;
  weakQuestionTypes: Array<{
    questionType: string;
    label: string;
    answerCount: number;
    wrongCount: number;
    wrongRate: number;
    suggestion: string;
  }>;
  weakCoreLiteracy: Array<{
    literacyTag: string;
    label: string;
    answerCount: number;
    wrongCount: number;
    wrongRate: number;
    suggestion: string;
  }>;
  retestSummary: {
    completedCount: number;
    successfulCount: number;
    needsConsolidationCount: number;
    pendingCount: number;
    successRate: number;
    suggestion: string;
  };
  reviewTrend: {
    windowDays: number;
    assignedCount: number;
    completedCount: number;
    remindedCount: number;
    retestedCount: number;
    suggestion: string;
  };
  reviewGroups: Array<{
    groupKey: string;
    label: string;
    studentCount: number;
    suggestion: string;
  }>;
  nextRoundSummary: {
    variantAssignedCount: number;
    variantCompletedCount: number;
    prerequisiteAssignedCount: number;
    prerequisiteCompletedCount: number;
    totalAssignedCount: number;
    totalCompletedCount: number;
    completionRate: number;
    suggestion: string;
    taskBreakdown: Array<{
      taskType: "variant_challenge" | "prerequisite_consolidation";
      label: string;
      assignedCount: number;
      completedCount: number;
      completionRate: number;
      teacherFeedbackCount: number;
      completionFeedback: string;
      teachingSuggestion: string;
      assignedStudents: NextRoundTaskStudent[];
      completedStudents: NextRoundTaskStudent[];
    }>;
  };
  teacherFeedbackSummary: {
    notedCount: number;
    pendingFeedbackCount: number;
    suggestion: string;
    teachingChecklist: Array<{
      studentId: string;
      displayName: string;
      taskTypeLabel: string;
      knowledgePointName: string;
      feedbackNote: string;
      teachingSuggestion: string;
      feedbackAt?: string;
    }>;
  };
  students: Array<{
    studentId: string;
    displayName: string;
    answerCount: number;
    accuracy: number;
    remediationCount: number;
    totalXp: number;
    assignedReviewCount: number;
    completedReviewCount: number;
    reviewReminderCount: number;
    remindableReviewCount: number;
    lastReviewReminderAt?: string;
    successfulRetestCount: number;
    needsConsolidationRetestCount: number;
    pendingRetestCount: number;
    standardReviewTaskCount: number;
    variantChallengeTaskCount: number;
    prerequisiteConsolidationTaskCount: number;
    teacherFeedbackCount: number;
    pendingTeacherFeedbackCount: number;
    latestTeacherFeedbackAt?: string;
    retestSuggestion: string;
  }>;
  teachingSuggestions: string[];
}

export type TeachingMaterialGroupBy = "knowledge_point" | "task_type" | "student" | "feedback_status";

export interface TeacherTeachingMaterialFilters extends TeacherReportFilters {
  knowledgePointId?: string;
  groupBy?: TeachingMaterialGroupBy;
}

export interface TeacherTeachingMaterials {
  classId: string;
  filters: {
    grade?: string;
    startDate?: string;
    endDate?: string;
    reviewTaskType?: string;
    feedbackStatus?: string;
    knowledgePointId?: string;
    groupBy: TeachingMaterialGroupBy;
  };
  materials: Array<{
    materialId: string;
    studentId: string;
    displayName: string;
    taskId: string;
    taskType: ReviewTaskType;
    taskTypeLabel: string;
    status: "assigned" | "completed";
    feedbackStatus: "noted" | "pending_feedback" | "not_ready";
    knowledgePointId: string;
    knowledgePointName: string;
    studentReviewNote?: string;
    teacherFeedbackNote?: string;
    assignedAt: string;
    completedAt?: string;
    feedbackAt?: string;
    retestStatus: "success" | "needs_consolidation" | "pending";
    completionFeedback: string;
    teachingSuggestion: string;
    priority: "high" | "medium" | "low";
    priorityReason: string;
    question: {
      questionId: string;
      questionType: string;
      grade?: string;
      isPublished: boolean;
      stem?: string;
      analysis?: string;
      contentNotice?: string;
    };
  }>;
  groups: Array<{
    groupKey: string;
    label: string;
    materialCount: number;
    studentCount: number;
    completedCount: number;
    notedCount: number;
    suggestion: string;
    materialIds: string[];
  }>;
  template: {
    title: string;
    scopeSummary: string;
    opening: string;
    boardPlan: string[];
    teachingSteps: string[];
    studentActivities: string[];
    afterClassActions: string[];
    materialCount: number;
    groupCount: number;
  };
}

export interface KnowledgePointStudentBreakdown {
  classId: string;
  knowledgePointId: string;
  knowledgePointName: string;
  filters: TeacherClassReport["filters"];
  students: Array<{
    studentId: string;
    displayName: string;
    answerCount: number;
    wrongCount: number;
    accuracy: number;
    remediationCount: number;
    suggestion: string;
  }>;
}

export interface TeacherStudentDetail {
  classId: string;
  studentId: string;
  displayName: string;
  filters: TeacherClassReport["filters"];
  answerCount: number;
  wrongCount: number;
  accuracy: number;
  remediationCount: number;
  weakKnowledgePoints: Array<{
    knowledgePointId: string;
    name: string;
    wrongCount: number;
    suggestion: string;
  }>;
  wrongQuestions: Array<{
    answerRecordId: string;
    questionId: string;
    stem: string;
    selectedAnswer: string;
    correctAnswer: string;
    analysis: string;
    knowledgePointId: string;
    knowledgePointName: string;
    questionType: string;
    durationSeconds: number;
    submittedAt: string;
    suggestion: string;
  }>;
  reviewTasks: Array<{
    id: string;
    questionId: string;
    stem: string;
    knowledgePointName: string;
    status: "assigned" | "completed";
    assignedAt: string;
    completedAt?: string;
    teacherId?: string;
    reviewNote?: string;
    reminderCount: number;
    lastReminderAt?: string;
    retestQuestionId?: string;
    retestIsCorrect?: boolean;
    retestCompletedAt?: string;
    taskType: ReviewTaskType;
    taskTypeLabel: string;
    completionFeedback: string;
    teachingSuggestion: string;
    teacherFeedbackNote?: string;
    teacherFeedbackAt?: string;
    teacherFeedbackBy?: string;
  }>;
  reviewTaskSummary: {
    assignedCount: number;
    completedCount: number;
    variantChallengeAssignedCount: number;
    variantChallengeCompletedCount: number;
    prerequisiteConsolidationAssignedCount: number;
    prerequisiteConsolidationCompletedCount: number;
  };
  suggestions: string[];
}

export interface TeacherReportRepository {
  getClassReport(classId?: string, filters?: TeacherReportFilters): Promise<TeacherClassReport>;
  getTeachingMaterials(classId?: string, filters?: TeacherTeachingMaterialFilters): Promise<TeacherTeachingMaterials>;
  getKnowledgePointStudents(classId: string, knowledgePointId: string, filters?: TeacherReportFilters): Promise<KnowledgePointStudentBreakdown>;
  getStudentDetail(classId: string, studentId: string, filters?: TeacherReportFilters): Promise<TeacherStudentDetail | null>;
  assignStudentReviewTasks(
    classId: string,
    studentId: string,
    questionIds: string[],
    teacherId: string,
    filters?: TeacherReportFilters
  ): Promise<{ assignedCount: number; questionIds: string[] } | null>;
  remindStudentReviewTasks(
    classId: string,
    studentId: string,
    teacherId: string,
    options?: { cooldownHours?: number }
  ): Promise<{ remindedCount: number; skippedDueToCooldown: number } | null>;
  batchRemindStudentReviewTasks(
    classId: string,
    studentIds: string[],
    teacherId: string,
    options?: { cooldownHours?: number }
  ): Promise<{ studentCount: number; remindedCount: number; skippedDueToCooldown: number }>;
  batchAssignNextRoundReviewTasks(
    classId: string,
    studentIds: string[],
    teacherId: string,
    taskType: "variant_challenge" | "prerequisite_consolidation",
    filters?: TeacherReportFilters
  ): Promise<{ studentCount: number; assignedCount: number; skippedCount: number; taskType: "variant_challenge" | "prerequisite_consolidation" }>;
  recordReviewTaskFeedback(
    classId: string,
    studentId: string,
    taskId: string,
    teacherId: string,
    feedbackNote: string
  ): Promise<{
    taskId: string;
    teacherFeedbackNote: string;
    teacherFeedbackAt: string;
    completionFeedback: string;
    teachingSuggestion: string;
  } | null>;
}

class MemoryTeacherReportRepository implements TeacherReportRepository {
  async getClassReport(classId = "demo-class", filters: TeacherReportFilters = {}) {
    return {
      classId,
      filters: serializeFilters(filters),
      studentCount: 0,
      answerCount: 0,
      accuracy: 0,
      remediationCount: 0,
        averageDurationSeconds: 0,
        weakKnowledgePoints: [],
        weakQuestionTypes: [],
        weakCoreLiteracy: [],
        retestSummary: buildRetestSummary([]),
        reviewTrend: buildReviewTrend([]),
        reviewGroups: buildReviewGroups([]),
        nextRoundSummary: buildNextRoundSummary([]),
        teacherFeedbackSummary: buildTeacherFeedbackSummary([]),
        students: [],
        teachingSuggestions: ["学生开始作答后，班级诊断报告会自动生成。"]
    };
  }

  async getTeachingMaterials(classId = "demo-class", filters: TeacherTeachingMaterialFilters = {}) {
    const emptyMaterials: TeacherTeachingMaterials["materials"] = [];
    const groupBy = filters.groupBy ?? "knowledge_point";
    return {
      classId,
      filters: serializeTeachingMaterialFilters(filters, groupBy),
      materials: emptyMaterials,
      groups: buildTeachingMaterialGroups(emptyMaterials, groupBy),
      template: buildTeachingMaterialTemplate(emptyMaterials, [], filters)
    };
  }

  async getKnowledgePointStudents(classId = "demo-class", knowledgePointId: string, filters: TeacherReportFilters = {}) {
    return {
      classId,
      knowledgePointId,
      knowledgePointName: knowledgePoints.find((point) => point.id === knowledgePointId)?.name ?? knowledgePointId,
      filters: serializeFilters(filters),
      students: []
    };
  }

  async getStudentDetail(classId = "demo-class", studentId: string, filters: TeacherReportFilters = {}) {
    return {
      classId,
      studentId,
      displayName: studentId,
      filters: serializeFilters(filters),
      answerCount: 0,
      wrongCount: 0,
      accuracy: 0,
      remediationCount: 0,
      weakKnowledgePoints: [],
      wrongQuestions: [],
      reviewTasks: [],
      reviewTaskSummary: {
        assignedCount: 0,
        completedCount: 0,
        variantChallengeAssignedCount: 0,
        variantChallengeCompletedCount: 0,
        prerequisiteConsolidationAssignedCount: 0,
        prerequisiteConsolidationCompletedCount: 0
      },
      suggestions: ["学生开始作答后，会生成个人错题清单。"]
    };
  }

  async assignStudentReviewTasks(_classId: string, _studentId: string, questionIds: string[]) {
    return { assignedCount: questionIds.length, questionIds };
  }

  async remindStudentReviewTasks() {
    return { remindedCount: 0, skippedDueToCooldown: 0 };
  }

  async batchRemindStudentReviewTasks() {
    return { studentCount: 0, remindedCount: 0, skippedDueToCooldown: 0 };
  }

  async batchAssignNextRoundReviewTasks(
    _classId: string,
    studentIds: string[],
    _teacherId: string,
    taskType: "variant_challenge" | "prerequisite_consolidation"
  ) {
    return { studentCount: studentIds.length, assignedCount: 0, skippedCount: studentIds.length, taskType };
  }

  async recordReviewTaskFeedback() {
    return null;
  }
}

class PrismaTeacherReportRepository implements TeacherReportRepository {
  async getClassReport(classId = "default", filters: TeacherReportFilters = {}) {
    const prisma = getPrismaClient();
    const students = await prisma.user.findMany({
      where: {
        role: "student",
        ...(classId === "all" || classId === "default" ? {} : { classId })
      },
      select: { id: true, displayName: true, username: true }
    });
    const studentIds = students.map((student) => student.id);
    const createdAtFilter = buildCreatedAtFilter(filters);
    const prismaGrade = toPrismaGrade(filters.grade);

    if (studentIds.length === 0) {
      return {
        classId,
        filters: serializeFilters(filters),
        studentCount: 0,
        answerCount: 0,
        accuracy: 0,
        remediationCount: 0,
        averageDurationSeconds: 0,
        weakKnowledgePoints: [],
        weakQuestionTypes: [],
        weakCoreLiteracy: [],
        retestSummary: buildRetestSummary([]),
        reviewTrend: buildReviewTrend([]),
        reviewGroups: buildReviewGroups([]),
        nextRoundSummary: buildNextRoundSummary([]),
        teacherFeedbackSummary: buildTeacherFeedbackSummary([]),
        students: [],
        teachingSuggestions: ["当前班级还没有学生作答记录。"]
      };
    }

    const answers = await prisma.answerRecord.findMany({
      where: {
        studentId: { in: studentIds },
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
        ...(prismaGrade ? { question: { grade: prismaGrade } } : {})
      },
      include: {
        question: {
          include: { literacyLinks: true }
        }
      }
    });

    const sourceQuestionIds = Array.from(new Set(answers.map((answer) => answer.questionId)));
    const remediationWhere =
      prismaGrade && sourceQuestionIds.length === 0
        ? { studentId: { in: [] } }
        : {
            studentId: { in: studentIds },
            ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
            ...(prismaGrade ? { sourceQuestionId: { in: sourceQuestionIds } } : {})
          };

    const [remediations, rewards] = await Promise.all([
      prisma.remediationPath.findMany({
        where: remediationWhere
      }),
      prisma.rewardEvent.groupBy({
        by: ["studentId"],
        where: {
          studentId: { in: studentIds },
          ...(createdAtFilter ? { createdAt: createdAtFilter } : {})
        },
        _sum: { xp: true }
      })
    ]);

    const rewardMap = new Map(rewards.map((reward) => [reward.studentId, reward._sum.xp ?? 0]));
    const answersByStudent = groupBy(answers, (answer) => answer.studentId);
    const remediationsByStudent = groupBy(remediations, (path) => path.studentId);
    const studentNameMap = new Map(students.map((student) => [student.id, student.displayName ?? student.username]));
    const reviewTasksByStudent = groupBy(
      remediations.filter((path) => path.status.startsWith("assigned_review:") || path.status.startsWith("completed_review:")),
      (path) => path.studentId
    );
    const wrongAnswers = answers.filter((answer) => !answer.isCorrect && answer.knowledgePointId);
    const weakKnowledgePoints = summarizeWeakKnowledgePoints(wrongAnswers);
    const weakQuestionTypes = summarizeWeakQuestionTypes(answers);
    const weakCoreLiteracy = summarizeWeakCoreLiteracy(answers);
    const retestSummary = buildRetestSummary(reviewTasksByStudent);
    const reviewTrend = buildReviewTrend(Array.from(reviewTasksByStudent.values()).flat());
    const allReviewTasks = Array.from(reviewTasksByStudent.values()).flat();
    const nextRoundSummary = buildNextRoundSummary(allReviewTasks, studentNameMap);
    const teacherFeedbackSummary = buildTeacherFeedbackSummary(allReviewTasks, studentNameMap);
    const correctCount = answers.filter((answer) => answer.isCorrect).length;
    const totalDuration = answers.reduce((total, answer) => total + answer.durationSeconds, 0);
    const studentSummaries = students.map((student) => {
      const studentAnswers = answersByStudent.get(student.id) ?? [];
      const studentCorrect = studentAnswers.filter((answer) => answer.isCorrect).length;
      const studentReviewTasks = reviewTasksByStudent.get(student.id) ?? [];
      const assignedReviewCount = studentReviewTasks.filter((path) => path.status.startsWith("assigned_review:")).length;
      const completedReviewCount = studentReviewTasks.filter((path) => path.status.startsWith("completed_review:")).length;
      const assignedReviewTasks = studentReviewTasks.filter((path) => path.status.startsWith("assigned_review:"));
      const successfulRetestCount = studentReviewTasks.filter((path) => path.retestCompletedAt && path.retestIsCorrect === true).length;
      const needsConsolidationRetestCount = studentReviewTasks.filter((path) => path.retestCompletedAt && path.retestIsCorrect === false).length;
      const pendingRetestCount = studentReviewTasks.filter((path) => !path.retestCompletedAt).length;
      const standardReviewTaskCount = studentReviewTasks.filter((path) => getReviewTaskType(path.reason) === "review").length;
      const variantChallengeTaskCount = studentReviewTasks.filter((path) => getReviewTaskType(path.reason) === "variant_challenge").length;
      const prerequisiteConsolidationTaskCount = studentReviewTasks.filter(
        (path) => getReviewTaskType(path.reason) === "prerequisite_consolidation"
      ).length;
      const lastReviewReminderAt = latestDate(assignedReviewTasks.map((path) => path.lastReviewReminderAt));
      const reviewReminderCount = assignedReviewTasks.reduce((total, path) => total + path.reviewReminderCount, 0);
      const remindableReviewCount = assignedReviewTasks.filter((path) => isReminderReady(path.lastReviewReminderAt)).length;
      const completedReviewTasks = studentReviewTasks.filter((path) => path.status.startsWith("completed_review:"));
      const teacherFeedbackCount = completedReviewTasks.filter((path) => path.teacherFeedbackNote).length;
      const pendingTeacherFeedbackCount = completedReviewTasks.filter((path) => !path.teacherFeedbackNote).length;
      const latestTeacherFeedbackAt = latestDate(completedReviewTasks.map((path) => path.teacherFeedbackAt));
      return {
        studentId: student.id,
        displayName: student.displayName ?? student.username,
        answerCount: studentAnswers.length,
        accuracy: studentAnswers.length ? Math.round((studentCorrect / studentAnswers.length) * 100) : 0,
        remediationCount: remediationsByStudent.get(student.id)?.length ?? 0,
        totalXp: rewardMap.get(student.id) ?? 0,
        assignedReviewCount,
        completedReviewCount,
        reviewReminderCount,
        remindableReviewCount,
        lastReviewReminderAt: lastReviewReminderAt?.toISOString(),
        successfulRetestCount,
        needsConsolidationRetestCount,
        pendingRetestCount,
        standardReviewTaskCount,
        variantChallengeTaskCount,
        prerequisiteConsolidationTaskCount,
        teacherFeedbackCount,
        pendingTeacherFeedbackCount,
        latestTeacherFeedbackAt: latestTeacherFeedbackAt?.toISOString(),
        retestSuggestion: buildStudentRetestSuggestion(successfulRetestCount, needsConsolidationRetestCount, pendingRetestCount)
      };
    });

    return {
      classId,
      filters: serializeFilters(filters),
      studentCount: students.length,
      answerCount: answers.length,
      accuracy: answers.length ? Math.round((correctCount / answers.length) * 100) : 0,
      remediationCount: remediations.length,
      averageDurationSeconds: answers.length ? Math.round(totalDuration / answers.length) : 0,
      weakKnowledgePoints,
      weakQuestionTypes,
      weakCoreLiteracy,
      retestSummary,
      reviewTrend,
      reviewGroups: buildReviewGroups(studentSummaries),
      nextRoundSummary,
      teacherFeedbackSummary,
      students: studentSummaries
        .filter((student) => matchesReviewStatus(student, filters.reviewStatus))
        .filter((student) => matchesReminderStatus(student, filters.reminderStatus))
        .filter((student) => matchesRetestStatus(student, filters.retestStatus))
        .filter((student) => matchesReviewGroup(student, filters.reviewGroup))
        .filter((student) => matchesReviewTaskType(student, filters.reviewTaskType))
        .filter((student) => matchesTeacherFeedbackStatus(student, filters.feedbackStatus)),
      teachingSuggestions: buildTeachingSuggestions(weakKnowledgePoints, weakQuestionTypes, weakCoreLiteracy, retestSummary, remediations.length, answers.length)
    };
  }

  async getTeachingMaterials(classId = "default", filters: TeacherTeachingMaterialFilters = {}) {
    const prisma = getPrismaClient();
    const groupBy = filters.groupBy ?? "knowledge_point";
    const students = await prisma.user.findMany({
      where: {
        role: "student",
        ...(classId === "all" || classId === "default" ? {} : { classId })
      },
      select: { id: true, displayName: true, username: true }
    });
    const studentIds = students.map((student) => student.id);
    const studentNameMap = new Map(students.map((student) => [student.id, student.displayName ?? student.username]));
    const createdAtFilter = buildCreatedAtFilter(filters);
    const prismaGrade = toPrismaGrade(filters.grade);

    if (!studentIds.length) {
      const emptyMaterials: TeacherTeachingMaterials["materials"] = [];
      return {
        classId,
        filters: serializeTeachingMaterialFilters(filters, groupBy),
        materials: emptyMaterials,
        groups: buildTeachingMaterialGroups(emptyMaterials, groupBy),
        template: buildTeachingMaterialTemplate(emptyMaterials, [], filters)
      };
    }

    const tasks = await prisma.remediationPath.findMany({
      where: {
        studentId: { in: studentIds },
        OR: [{ status: { startsWith: "assigned_review:" } }, { status: { startsWith: "completed_review:" } }],
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });
    const sourceQuestionIds = Array.from(new Set(tasks.map((task) => task.sourceQuestionId)));
    const questions = sourceQuestionIds.length
      ? await prisma.question.findMany({
          where: { id: { in: sourceQuestionIds } },
          include: { knowledgeLinks: true, literacyLinks: true }
        })
      : [];
    const questionMap = new Map(questions.map((question) => [question.id, question]));

    const materials = tasks
      .map((task): TeacherTeachingMaterials["materials"][number] | null => {
        const question = questionMap.get(task.sourceQuestionId);
        if (prismaGrade && question?.grade !== prismaGrade) return null;
        if (prismaGrade && !question) return null;

        const taskType = getReviewTaskType(task.reason);
        const primaryKnowledgePointId = question?.knowledgeLinks.find((link: any) => link.linkType === "primary")?.knowledgePointId;
        const knowledgePointId =
          task.targetKnowledgePointId && task.targetKnowledgePointId !== "unlinked"
            ? task.targetKnowledgePointId
            : task.sourceKnowledgePointId && task.sourceKnowledgePointId !== "unlinked"
              ? task.sourceKnowledgePointId
              : primaryKnowledgePointId ?? "unlinked";
        const linkedKnowledgePointIds = new Set([
          knowledgePointId,
          task.sourceKnowledgePointId,
          task.targetKnowledgePointId,
          ...(question?.knowledgeLinks.map((link: any) => link.knowledgePointId) ?? [])
        ]);
        if (filters.knowledgePointId && filters.knowledgePointId !== "all" && !linkedKnowledgePointIds.has(filters.knowledgePointId)) {
          return null;
        }
        if (filters.reviewTaskType && filters.reviewTaskType !== "all" && taskType !== filters.reviewTaskType) return null;

        const completed = task.status.startsWith("completed_review:");
        const feedbackStatus = task.teacherFeedbackNote ? "noted" : completed ? "pending_feedback" : "not_ready";
        if (filters.feedbackStatus === "noted" && feedbackStatus !== "noted") return null;
        if (filters.feedbackStatus === "pending_feedback" && feedbackStatus !== "pending_feedback") return null;

        const isPublished = question?.auditStatus === "published";
        const knowledgePointName = knowledgePointId !== "unlinked" ? getKnowledgePointName(knowledgePointId) : "未挂接知识点";
        const questionType = question?.questionType ? questionTypeText(question.questionType) : "未识别题型";
        const retestStatus = task.retestCompletedAt ? (task.retestIsCorrect ? "success" : "needs_consolidation") : "pending";
        const priority = getTeachingMaterialPriority(feedbackStatus, retestStatus);

        return {
          materialId: task.id,
          studentId: task.studentId,
          displayName: studentNameMap.get(task.studentId) ?? "学生",
          taskId: task.id,
          taskType,
          taskTypeLabel: reviewTaskTypeText(taskType),
          status: completed ? "completed" : "assigned",
          feedbackStatus,
          knowledgePointId,
          knowledgePointName,
          studentReviewNote: task.studentReviewNote ?? undefined,
          teacherFeedbackNote: task.teacherFeedbackNote ?? undefined,
          assignedAt: task.createdAt.toISOString(),
          completedAt: task.completedAt?.toISOString(),
          feedbackAt: task.teacherFeedbackAt?.toISOString(),
          retestStatus,
          completionFeedback: buildReviewTaskCompletionFeedback(taskType, task.retestIsCorrect, completed),
          teachingSuggestion: buildReviewTaskTeachingSuggestion(taskType, knowledgePointName, task.retestIsCorrect, completed),
          priority: priority.priority,
          priorityReason: priority.reason,
          question: {
            questionId: task.sourceQuestionId,
            questionType,
            grade: question?.grade ? gradeText(question.grade) : undefined,
            isPublished,
            stem: isPublished ? question?.stem : undefined,
            analysis: isPublished ? question?.analysis ?? undefined : undefined,
            contentNotice: isPublished ? undefined : "题目未发布或已下架，题干和解析不进入讲评导出。"
          }
        };
      })
      .filter((material): material is TeacherTeachingMaterials["materials"][number] => Boolean(material))
      .sort((a, b) => teachingMaterialPriorityRank(a.priority) - teachingMaterialPriorityRank(b.priority) || b.assignedAt.localeCompare(a.assignedAt))
      .slice(0, 80);

    const groups = buildTeachingMaterialGroups(materials, groupBy);
    return {
      classId,
      filters: serializeTeachingMaterialFilters(filters, groupBy),
      materials,
      groups,
      template: buildTeachingMaterialTemplate(materials, groups, filters)
    };
  }

  async getKnowledgePointStudents(classId = "default", knowledgePointId: string, filters: TeacherReportFilters = {}) {
    const prisma = getPrismaClient();
    const students = await prisma.user.findMany({
      where: {
        role: "student",
        ...(classId === "all" || classId === "default" ? {} : { classId })
      },
      select: { id: true, displayName: true, username: true }
    });
    const studentIds = students.map((student) => student.id);
    const createdAtFilter = buildCreatedAtFilter(filters);
    const prismaGrade = toPrismaGrade(filters.grade);

    if (!studentIds.length) {
      return {
        classId,
        knowledgePointId,
        knowledgePointName: getKnowledgePointName(knowledgePointId),
        filters: serializeFilters(filters),
        students: []
      };
    }

    const answers = await prisma.answerRecord.findMany({
      where: {
        studentId: { in: studentIds },
        knowledgePointId,
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
        ...(prismaGrade ? { question: { grade: prismaGrade } } : {})
      }
    });
    const answersByStudent = groupBy(answers, (answer) => answer.studentId);
    const remediations = await prisma.remediationPath.findMany({
      where: {
        studentId: { in: studentIds },
        targetKnowledgePointId: knowledgePointId,
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {})
      }
    });
    const remediationsByStudent = groupBy(remediations, (path) => path.studentId);

    return {
      classId,
      knowledgePointId,
      knowledgePointName: getKnowledgePointName(knowledgePointId),
      filters: serializeFilters(filters),
      students: students
        .map((student) => {
          const studentAnswers = answersByStudent.get(student.id) ?? [];
          const correctCount = studentAnswers.filter((answer) => answer.isCorrect).length;
          const wrongCount = studentAnswers.length - correctCount;
          return {
            studentId: student.id,
            displayName: student.displayName ?? student.username,
            answerCount: studentAnswers.length,
            wrongCount,
            accuracy: studentAnswers.length ? Math.round((correctCount / studentAnswers.length) * 100) : 0,
            remediationCount: remediationsByStudent.get(student.id)?.length ?? 0,
            suggestion: buildStudentKnowledgePointSuggestion(wrongCount, remediationsByStudent.get(student.id)?.length ?? 0)
          };
        })
        .filter((student) => student.answerCount > 0 || student.remediationCount > 0)
        .sort((a, b) => b.wrongCount - a.wrongCount || b.answerCount - a.answerCount)
    };
  }

  async getStudentDetail(classId = "default", studentId: string, filters: TeacherReportFilters = {}) {
    const prisma = getPrismaClient();
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: "student",
        ...(classId === "all" || classId === "default" ? {} : { classId })
      },
      select: { id: true, displayName: true, username: true }
    });
    if (!student) return null;

    const createdAtFilter = buildCreatedAtFilter(filters);
    const prismaGrade = toPrismaGrade(filters.grade);
    const answers = await prisma.answerRecord.findMany({
      where: {
        studentId,
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
        ...(prismaGrade ? { question: { grade: prismaGrade } } : {})
      },
      include: {
        question: true
      },
      orderBy: { submittedAt: "desc" },
      take: 50
    });
    const remediations = await prisma.remediationPath.findMany({
      where: {
        studentId,
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {})
      }
    });
    const reviewTaskPaths = remediations.filter(
      (path) => path.status.startsWith("assigned_review:") || path.status.startsWith("completed_review:")
    );
    const reviewQuestionIds = Array.from(new Set(reviewTaskPaths.map((path) => path.sourceQuestionId)));
    const reviewQuestions = reviewQuestionIds.length
      ? await prisma.question.findMany({
          where: { id: { in: reviewQuestionIds } },
          include: { knowledgeLinks: true }
        })
      : [];
    const reviewQuestionMap = new Map(reviewQuestions.map((question) => [question.id, question]));
    const wrongAnswers = answers.filter((answer) => !answer.isCorrect);
    const correctCount = answers.length - wrongAnswers.length;
    const weakKnowledgePoints = summarizeWeakKnowledgePoints(
      wrongAnswers.map((answer) => ({ knowledgePointId: answer.knowledgePointId }))
    );

    return {
      classId,
      studentId,
      displayName: student.displayName ?? student.username,
      filters: serializeFilters(filters),
      answerCount: answers.length,
      wrongCount: wrongAnswers.length,
      accuracy: answers.length ? Math.round((correctCount / answers.length) * 100) : 0,
      remediationCount: remediations.length,
      weakKnowledgePoints,
      wrongQuestions: wrongAnswers.slice(0, 20).map((answer: any) => ({
        answerRecordId: answer.id,
        questionId: answer.questionId,
        stem: answer.question?.stem ?? "题干暂不可用",
        selectedAnswer: displayJson(answer.selectedAnswer),
        correctAnswer: displayJson(answer.question?.answer),
        analysis: answer.question?.analysis ?? "",
        knowledgePointId: answer.knowledgePointId ?? "",
        knowledgePointName: answer.knowledgePointId ? getKnowledgePointName(answer.knowledgePointId) : "未挂接知识点",
        questionType: answer.question?.questionType ?? "",
        durationSeconds: answer.durationSeconds,
        submittedAt: answer.submittedAt.toISOString(),
        suggestion: buildWrongQuestionSuggestion(answer.knowledgePointId ?? "", answer.question?.questionType ?? "")
      })),
      reviewTasks: reviewTaskPaths.map((path): TeacherStudentDetail["reviewTasks"][number] => {
        const question = reviewQuestionMap.get(path.sourceQuestionId);
        const knowledgePointId =
          path.targetKnowledgePointId !== "unlinked"
            ? path.targetKnowledgePointId
            : question?.knowledgeLinks.find((link: any) => link.linkType === "primary")?.knowledgePointId ?? "";
        const taskType = getReviewTaskType(path.reason);
        const knowledgePointName = knowledgePointId ? getKnowledgePointName(knowledgePointId) : "相关知识点";
        return {
          id: path.id,
          questionId: path.sourceQuestionId,
          stem: question?.stem ?? path.reason.replace(/^老师布置(错题复盘|变式题挑战|前置知识巩固)任务：/, ""),
          knowledgePointName,
          status: path.status.startsWith("completed_review:") ? "completed" : "assigned",
          assignedAt: path.createdAt.toISOString(),
          completedAt: path.completedAt?.toISOString(),
          teacherId: path.status.split(":")[1],
          reviewNote: path.studentReviewNote ?? undefined,
          reminderCount: path.reviewReminderCount,
          lastReminderAt: path.lastReviewReminderAt?.toISOString(),
          retestQuestionId: path.retestQuestionId ?? undefined,
          retestIsCorrect: path.retestIsCorrect ?? undefined,
          retestCompletedAt: path.retestCompletedAt?.toISOString(),
          taskType,
          taskTypeLabel: reviewTaskTypeText(taskType),
          completionFeedback: buildReviewTaskCompletionFeedback(taskType, path.retestIsCorrect, Boolean(path.completedAt)),
          teachingSuggestion: buildReviewTaskTeachingSuggestion(taskType, knowledgePointName, path.retestIsCorrect, Boolean(path.completedAt)),
          teacherFeedbackNote: path.teacherFeedbackNote ?? undefined,
          teacherFeedbackAt: path.teacherFeedbackAt?.toISOString(),
          teacherFeedbackBy: path.teacherFeedbackBy ?? undefined
        };
      }),
      reviewTaskSummary: {
        assignedCount: reviewTaskPaths.filter((path) => path.status.startsWith("assigned_review:")).length,
        completedCount: reviewTaskPaths.filter((path) => path.status.startsWith("completed_review:")).length,
        variantChallengeAssignedCount: reviewTaskPaths.filter(
          (path) => path.status.startsWith("assigned_review:") && getReviewTaskType(path.reason) === "variant_challenge"
        ).length,
        variantChallengeCompletedCount: reviewTaskPaths.filter(
          (path) => path.status.startsWith("completed_review:") && getReviewTaskType(path.reason) === "variant_challenge"
        ).length,
        prerequisiteConsolidationAssignedCount: reviewTaskPaths.filter(
          (path) => path.status.startsWith("assigned_review:") && getReviewTaskType(path.reason) === "prerequisite_consolidation"
        ).length,
        prerequisiteConsolidationCompletedCount: reviewTaskPaths.filter(
          (path) => path.status.startsWith("completed_review:") && getReviewTaskType(path.reason) === "prerequisite_consolidation"
        ).length
      },
      suggestions: buildStudentDetailSuggestions(weakKnowledgePoints, wrongAnswers.length, remediations.length)
    };
  }

  async assignStudentReviewTasks(
    classId = "default",
    studentId: string,
    questionIds: string[],
    teacherId: string,
    filters: TeacherReportFilters = {}
  ) {
    const prisma = getPrismaClient();
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: "student",
        ...(classId === "all" || classId === "default" ? {} : { classId })
      },
      select: { id: true }
    });
    if (!student) return null;

    const createdAtFilter = buildCreatedAtFilter(filters);
    const prismaGrade = toPrismaGrade(filters.grade);
    const wrongAnswers = await prisma.answerRecord.findMany({
      where: {
        studentId,
        questionId: { in: questionIds },
        isCorrect: false,
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
        ...(prismaGrade ? { question: { grade: prismaGrade } } : {})
      },
      include: { question: true }
    });

    if (!wrongAnswers.length) return { assignedCount: 0, questionIds: [] };
    await prisma.remediationPath.createMany({
      data: wrongAnswers.map((answer) => ({
        studentId,
        sourceQuestionId: answer.questionId,
        sourceKnowledgePointId: answer.knowledgePointId ?? "unlinked",
        targetKnowledgePointId: answer.knowledgePointId ?? "unlinked",
        reason: `老师布置错题复盘任务：${answer.question?.stem ?? answer.questionId}`,
        status: `assigned_review:${teacherId}`
      }))
    });

    return {
      assignedCount: wrongAnswers.length,
      questionIds: wrongAnswers.map((answer) => answer.questionId)
    };
  }

  async remindStudentReviewTasks(classId = "default", studentId: string, teacherId: string, options: { cooldownHours?: number } = {}) {
    const prisma = getPrismaClient();
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: "student",
        ...(classId === "all" || classId === "default" ? {} : { classId })
      },
      select: { id: true }
    });
    if (!student) return null;

    const assignedCount = await prisma.remediationPath.count({ where: { studentId, status: { startsWith: "assigned_review:" } } });
    const result = await prisma.remediationPath.updateMany({
      where: buildReminderWhere([studentId], options.cooldownHours),
      data: buildReminderData()
    });

    return { remindedCount: result.count, skippedDueToCooldown: Math.max(0, assignedCount - result.count) };
  }

  async batchRemindStudentReviewTasks(classId = "default", studentIds: string[], teacherId: string, options: { cooldownHours?: number } = {}) {
    const prisma = getPrismaClient();
    const uniqueStudentIds = Array.from(new Set(studentIds.filter(Boolean)));
    if (!uniqueStudentIds.length) return { studentCount: 0, remindedCount: 0, skippedDueToCooldown: 0 };
    const students = await prisma.user.findMany({
      where: {
        id: { in: uniqueStudentIds },
        role: "student",
        ...(classId === "all" || classId === "default" ? {} : { classId })
      },
      select: { id: true }
    });
    const validStudentIds = students.map((student) => student.id);
    const assignedCount = await prisma.remediationPath.count({
      where: { studentId: { in: validStudentIds }, status: { startsWith: "assigned_review:" } }
    });
    const result = await prisma.remediationPath.updateMany({
      where: buildReminderWhere(validStudentIds, options.cooldownHours),
      data: buildReminderData()
    });

    return {
      studentCount: validStudentIds.length,
      remindedCount: result.count,
      skippedDueToCooldown: Math.max(0, assignedCount - result.count)
    };
  }

  async batchAssignNextRoundReviewTasks(
    classId = "default",
    studentIds: string[],
    teacherId: string,
    taskType: "variant_challenge" | "prerequisite_consolidation",
    filters: TeacherReportFilters = {}
  ) {
    const prisma = getPrismaClient();
    const uniqueStudentIds = Array.from(new Set(studentIds.filter(Boolean)));
    if (!uniqueStudentIds.length) return { studentCount: 0, assignedCount: 0, skippedCount: 0, taskType };
    const students = await prisma.user.findMany({
      where: {
        id: { in: uniqueStudentIds },
        role: "student",
        ...(classId === "all" || classId === "default" ? {} : { classId })
      },
      select: { id: true }
    });
    const validStudentIds = students.map((student) => student.id);
    if (!validStudentIds.length) return { studentCount: 0, assignedCount: 0, skippedCount: uniqueStudentIds.length, taskType };

    const createdAtFilter = buildCreatedAtFilter(filters);
    const candidates = await prisma.remediationPath.findMany({
      where: {
        studentId: { in: validStudentIds },
        status: { startsWith: "completed_review:" },
        retestCompletedAt: { not: null },
        retestIsCorrect: taskType === "variant_challenge",
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {})
      },
      orderBy: { retestCompletedAt: "desc" }
    });
    const latestByStudent = new Map<string, (typeof candidates)[number]>();
    for (const candidate of candidates) {
      if (!latestByStudent.has(candidate.studentId)) latestByStudent.set(candidate.studentId, candidate);
    }
    const sourceQuestionIds = Array.from(new Set(Array.from(latestByStudent.values()).map((path) => path.sourceQuestionId)));
    const publishedQuestions = sourceQuestionIds.length
      ? await prisma.question.findMany({
          where: {
            id: { in: sourceQuestionIds },
            auditStatus: "published"
          },
          select: { id: true, stem: true }
        })
      : [];
    const questionMap = new Map(publishedQuestions.map((question) => [question.id, question]));
    const taskRows = Array.from(latestByStudent.values())
      .filter((path) => questionMap.has(path.sourceQuestionId))
      .map((path) => {
        const question = questionMap.get(path.sourceQuestionId);
        const label = taskType === "variant_challenge" ? "变式题挑战" : "前置知识巩固";
        return {
          studentId: path.studentId,
          sourceQuestionId: path.sourceQuestionId,
          sourceKnowledgePointId: path.sourceKnowledgePointId,
          targetKnowledgePointId: path.targetKnowledgePointId,
          reason: `老师布置${label}任务：${question?.stem ?? path.sourceQuestionId}`,
          status: `assigned_review:${teacherId}`
        };
      });

    if (taskRows.length) {
      await prisma.remediationPath.createMany({ data: taskRows });
    }

    return {
      studentCount: validStudentIds.length,
      assignedCount: taskRows.length,
      skippedCount: Math.max(0, validStudentIds.length - taskRows.length),
      taskType
    };
  }

  async recordReviewTaskFeedback(classId = "default", studentId: string, taskId: string, teacherId: string, feedbackNote: string) {
    const prisma = getPrismaClient();
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: "student",
        ...(classId === "all" || classId === "default" ? {} : { classId })
      },
      select: { id: true }
    });
    if (!student) return null;

    const task = await prisma.remediationPath.findFirst({
      where: {
        id: taskId,
        studentId,
        status: { startsWith: "completed_review:" }
      }
    });
    if (!task) return null;

    const teacherFeedbackAt = new Date();
    const updated = await prisma.remediationPath.update({
      where: { id: taskId },
      data: {
        teacherFeedbackNote: feedbackNote,
        teacherFeedbackAt,
        teacherFeedbackBy: teacherId
      }
    });
    const taskType = getReviewTaskType(updated.reason);
    const knowledgePointName =
      updated.targetKnowledgePointId && updated.targetKnowledgePointId !== "unlinked"
        ? getKnowledgePointName(updated.targetKnowledgePointId)
        : "相关知识点";

    return {
      taskId,
      teacherFeedbackNote: updated.teacherFeedbackNote ?? "",
      teacherFeedbackAt: teacherFeedbackAt.toISOString(),
      completionFeedback: buildReviewTaskCompletionFeedback(taskType, updated.retestIsCorrect, Boolean(updated.completedAt)),
      teachingSuggestion: buildReviewTaskTeachingSuggestion(taskType, knowledgePointName, updated.retestIsCorrect, Boolean(updated.completedAt))
    };
  }
}

const defaultReminderCooldownHours = 24;

function buildReminderWhere(studentIds: string[], cooldownHours = defaultReminderCooldownHours) {
  const cutoff = new Date(Date.now() - Math.max(1, cooldownHours) * 60 * 60 * 1000);
  return {
    studentId: { in: studentIds },
    status: { startsWith: "assigned_review:" },
    OR: [{ lastReviewReminderAt: null }, { lastReviewReminderAt: { lte: cutoff } }]
  };
}

function buildReminderData() {
  return {
    reviewReminderCount: { increment: 1 },
    lastReviewReminderAt: new Date()
  };
}

function buildCreatedAtFilter(filters: TeacherReportFilters) {
  if (!filters.startDate && !filters.endDate) return undefined;
  return {
    ...(filters.startDate ? { gte: filters.startDate } : {}),
    ...(filters.endDate ? { lte: filters.endDate } : {})
  };
}

function serializeFilters(filters: TeacherReportFilters) {
  return {
    ...(filters.grade ? { grade: filters.grade } : {}),
    ...(filters.startDate ? { startDate: filters.startDate.toISOString() } : {}),
    ...(filters.endDate ? { endDate: filters.endDate.toISOString() } : {}),
    ...(filters.reviewStatus && filters.reviewStatus !== "all" ? { reviewStatus: filters.reviewStatus } : {}),
    ...(filters.reminderStatus && filters.reminderStatus !== "all" ? { reminderStatus: filters.reminderStatus } : {}),
    ...(filters.retestStatus && filters.retestStatus !== "all" ? { retestStatus: filters.retestStatus } : {}),
    ...(filters.reviewGroup && filters.reviewGroup !== "all" ? { reviewGroup: filters.reviewGroup } : {}),
    ...(filters.reviewTaskType && filters.reviewTaskType !== "all" ? { reviewTaskType: filters.reviewTaskType } : {}),
    ...(filters.feedbackStatus && filters.feedbackStatus !== "all" ? { feedbackStatus: filters.feedbackStatus } : {})
  };
}

function serializeTeachingMaterialFilters(filters: TeacherTeachingMaterialFilters, groupBy: TeachingMaterialGroupBy) {
  return {
    ...(filters.grade ? { grade: filters.grade } : {}),
    ...(filters.startDate ? { startDate: filters.startDate.toISOString() } : {}),
    ...(filters.endDate ? { endDate: filters.endDate.toISOString() } : {}),
    ...(filters.reviewTaskType && filters.reviewTaskType !== "all" ? { reviewTaskType: filters.reviewTaskType } : {}),
    ...(filters.feedbackStatus && filters.feedbackStatus !== "all" ? { feedbackStatus: filters.feedbackStatus } : {}),
    ...(filters.knowledgePointId && filters.knowledgePointId !== "all" ? { knowledgePointId: filters.knowledgePointId } : {}),
    groupBy
  };
}

function matchesReviewStatus(
  student: { assignedReviewCount: number; completedReviewCount: number },
  reviewStatus: TeacherReportFilters["reviewStatus"] = "all"
) {
  if (reviewStatus === "assigned") return student.assignedReviewCount > 0;
  if (reviewStatus === "completed") return student.completedReviewCount > 0;
  if (reviewStatus === "none") return student.assignedReviewCount + student.completedReviewCount === 0;
  return true;
}

function matchesReminderStatus(
  student: { assignedReviewCount: number; reviewReminderCount: number; remindableReviewCount: number },
  reminderStatus: TeacherReportFilters["reminderStatus"] = "all"
) {
  if (reminderStatus === "reminded") return student.reviewReminderCount > 0;
  if (reminderStatus === "not_reminded") return student.assignedReviewCount > 0 && student.reviewReminderCount === 0;
  if (reminderStatus === "cooldown") return student.assignedReviewCount > 0 && student.remindableReviewCount === 0;
  return true;
}

function matchesRetestStatus(
  student: { successfulRetestCount: number; needsConsolidationRetestCount: number; pendingRetestCount: number },
  retestStatus: TeacherReportFilters["retestStatus"] = "all"
) {
  if (retestStatus === "success") return student.successfulRetestCount > 0;
  if (retestStatus === "needs_consolidation") return student.needsConsolidationRetestCount > 0;
  if (retestStatus === "pending") return student.pendingRetestCount > 0;
  if (retestStatus === "none") {
    return student.successfulRetestCount + student.needsConsolidationRetestCount + student.pendingRetestCount === 0;
  }
  return true;
}

function matchesReviewGroup(
  student: {
    answerCount: number;
    assignedReviewCount: number;
    completedReviewCount: number;
    successfulRetestCount: number;
    needsConsolidationRetestCount: number;
    pendingRetestCount: number;
  },
  reviewGroup: TeacherReportFilters["reviewGroup"] = "all"
) {
  if (reviewGroup === "needs_consolidation") return student.needsConsolidationRetestCount > 0;
  if (reviewGroup === "pending_retest") return student.pendingRetestCount > 0;
  if (reviewGroup === "ready_for_challenge") {
    return student.successfulRetestCount > 0 && student.needsConsolidationRetestCount === 0;
  }
  if (reviewGroup === "needs_assignment") {
    return student.answerCount > 0 && student.assignedReviewCount + student.completedReviewCount + student.successfulRetestCount === 0;
  }
  return true;
}

function matchesReviewTaskType(
  student: {
    standardReviewTaskCount: number;
    variantChallengeTaskCount: number;
    prerequisiteConsolidationTaskCount: number;
  },
  reviewTaskType: TeacherReportFilters["reviewTaskType"] = "all"
) {
  if (reviewTaskType === "review") return student.standardReviewTaskCount > 0;
  if (reviewTaskType === "variant_challenge") return student.variantChallengeTaskCount > 0;
  if (reviewTaskType === "prerequisite_consolidation") return student.prerequisiteConsolidationTaskCount > 0;
  return true;
}

function matchesTeacherFeedbackStatus(
  student: { teacherFeedbackCount: number; pendingTeacherFeedbackCount: number },
  feedbackStatus: TeacherReportFilters["feedbackStatus"] = "all"
) {
  if (feedbackStatus === "noted") return student.teacherFeedbackCount > 0;
  if (feedbackStatus === "pending_feedback") return student.pendingTeacherFeedbackCount > 0;
  return true;
}

function isReminderReady(lastReminderAt: Date | null, cooldownHours = defaultReminderCooldownHours) {
  if (!lastReminderAt) return true;
  return lastReminderAt.getTime() <= Date.now() - cooldownHours * 60 * 60 * 1000;
}

function latestDate(values: Array<Date | null>) {
  const dates = values.filter((value): value is Date => Boolean(value));
  if (!dates.length) return undefined;
  return dates.reduce((latest, value) => (value > latest ? value : latest), dates[0]);
}

function toPrismaGrade(grade?: string) {
  const map: Record<string, "junior_three" | "senior_one" | "senior_two" | "senior_three"> = {
    初三: "junior_three",
    高一: "senior_one",
    高二: "senior_two",
    高三: "senior_three",
    junior_three: "junior_three",
    senior_one: "senior_one",
    senior_two: "senior_two",
    senior_three: "senior_three"
  };
  return grade && grade !== "all" ? map[grade] : undefined;
}

function summarizeWeakKnowledgePoints(answers: Array<{ knowledgePointId: string | null }>) {
  const counts = new Map<string, number>();
  for (const answer of answers) {
    if (!answer.knowledgePointId) continue;
    counts.set(answer.knowledgePointId, (counts.get(answer.knowledgePointId) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([knowledgePointId, wrongCount]) => ({
      knowledgePointId,
      name: getKnowledgePointName(knowledgePointId),
      wrongCount,
      suggestion: `先用 1 道典型错题回到「${getKnowledgePointName(knowledgePointId)}」的核心概念，再安排同类题复测。`
    }));
}

export function buildTeacherReportCsv(report: TeacherClassReport) {
  const rows = [
    ["班级", report.classId],
    ["年级筛选", report.filters.grade ?? "全部"],
    ["开始时间", report.filters.startDate ?? ""],
    ["结束时间", report.filters.endDate ?? ""],
    ["学生数", String(report.studentCount)],
    ["作答数", String(report.answerCount)],
    ["正确率", `${report.accuracy}%`],
    ["补救路径", String(report.remediationCount)],
    ["平均用时", `${report.averageDurationSeconds}s`],
    ["复测迁移成功", String(report.retestSummary.successfulCount)],
    ["复测继续巩固", String(report.retestSummary.needsConsolidationCount)],
    ["复测待完成", String(report.retestSummary.pendingCount)],
    ["复测成功率", `${report.retestSummary.successRate}%`],
    ["复测建议", report.retestSummary.suggestion],
    ["下一轮变式待完成", String(report.nextRoundSummary.variantAssignedCount)],
    ["下一轮变式已完成", String(report.nextRoundSummary.variantCompletedCount)],
    ["下一轮前置巩固待完成", String(report.nextRoundSummary.prerequisiteAssignedCount)],
    ["下一轮前置巩固已完成", String(report.nextRoundSummary.prerequisiteCompletedCount)],
    ["下一轮完成率", `${report.nextRoundSummary.completionRate}%`],
    ["下一轮建议", report.nextRoundSummary.suggestion],
    ["老师备注数", String(report.teacherFeedbackSummary.notedCount)],
    ["待写备注", String(report.teacherFeedbackSummary.pendingFeedbackCount)],
    ["备注讲评建议", report.teacherFeedbackSummary.suggestion],
    ["近 7 天分配复盘", String(report.reviewTrend.assignedCount)],
    ["近 7 天完成复盘", String(report.reviewTrend.completedCount)],
    ["近 7 天提醒复盘", String(report.reviewTrend.remindedCount)],
    ["近 7 天完成复测", String(report.reviewTrend.retestedCount)],
    ["复盘趋势建议", report.reviewTrend.suggestion],
    [],
    ["下一轮任务类型明细", "状态", "学生", "任务数", "最近时间", "完成反馈", "课堂讲评建议", "老师备注数"],
    ...buildNextRoundTaskCsvRows(report),
    [],
    ["老师备注讲评清单", "任务类型", "知识点", "备注", "课堂讲评建议", "备注时间"],
    ...report.teacherFeedbackSummary.teachingChecklist.map((item) => [
      item.displayName,
      item.taskTypeLabel,
      item.knowledgePointName,
      item.feedbackNote,
      item.teachingSuggestion,
      item.feedbackAt ?? ""
    ]),
    [],
    ["分层复盘", "学生数", "建议"],
    ...report.reviewGroups.map((group) => [group.label, String(group.studentCount), group.suggestion]),
    [],
    ["薄弱知识点", "出错次数", "建议"],
    ...report.weakKnowledgePoints.map((point) => [point.name, String(point.wrongCount), point.suggestion]),
    [],
    ["题型", "作答数", "出错数", "错误率", "建议"],
    ...report.weakQuestionTypes.map((item) => [item.label, String(item.answerCount), String(item.wrongCount), `${item.wrongRate}%`, item.suggestion]),
    [],
    ["核心素养", "作答数", "出错数", "错误率", "建议"],
    ...report.weakCoreLiteracy.map((item) => [item.label, String(item.answerCount), String(item.wrongCount), `${item.wrongRate}%`, item.suggestion]),
    [],
    ["学生", "作答数", "正确率", "补救路径", "迁移成功", "继续巩固", "待复测", "变式任务", "前置巩固任务", "老师备注", "待写备注", "复测建议", "XP"],
    ...report.students.map((student) => [
      student.displayName,
      String(student.answerCount),
      `${student.accuracy}%`,
      String(student.remediationCount),
      String(student.successfulRetestCount),
      String(student.needsConsolidationRetestCount),
      String(student.pendingRetestCount),
      String(student.variantChallengeTaskCount),
      String(student.prerequisiteConsolidationTaskCount),
      String(student.teacherFeedbackCount),
      String(student.pendingTeacherFeedbackCount),
      student.retestSuggestion,
      String(student.totalXp)
    ])
  ];
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function buildTeacherReviewFollowupCsv(report: TeacherClassReport) {
  const rows = [
    ["复盘跟进名单"],
    ["班级", report.classId],
    ["年级筛选", report.filters.grade ?? "全部"],
    ["复盘分层", reviewGroupText(report.filters.reviewGroup)],
    ["任务类型", reviewTaskTypeText(report.filters.reviewTaskType)],
    ["备注状态", teacherFeedbackStatusText(report.filters.feedbackStatus)],
    ["复盘状态", report.filters.reviewStatus ?? "全部"],
    ["提醒状态", report.filters.reminderStatus ?? "全部"],
    ["复测结果", report.filters.retestStatus ?? "全部"],
    ["开始时间", report.filters.startDate ?? ""],
    ["结束时间", report.filters.endDate ?? ""],
    [],
    ["下一轮任务类型明细", "状态", "学生", "任务数", "最近时间", "完成反馈", "课堂讲评建议", "老师备注数"],
    ...buildNextRoundTaskCsvRows(report),
    [],
    ["老师备注讲评清单", "任务类型", "知识点", "备注", "课堂讲评建议", "备注时间"],
    ...report.teacherFeedbackSummary.teachingChecklist.map((item) => [
      item.displayName,
      item.taskTypeLabel,
      item.knowledgePointName,
      item.feedbackNote,
      item.teachingSuggestion,
      item.feedbackAt ?? ""
    ]),
    [],
    [
      "学生",
      "作答数",
      "正确率",
      "待复盘",
      "已复盘",
      "迁移成功",
      "继续巩固",
      "待复测",
      "错题复盘任务",
      "变式任务",
      "前置巩固任务",
      "老师备注",
      "待写备注",
      "可提醒",
      "提醒次数",
      "分层建议",
      "复测建议",
      "XP"
    ],
    ...report.students.map((student) => [
      student.displayName,
      String(student.answerCount),
      `${student.accuracy}%`,
      String(student.assignedReviewCount),
      String(student.completedReviewCount),
      String(student.successfulRetestCount),
      String(student.needsConsolidationRetestCount),
      String(student.pendingRetestCount),
      String(student.standardReviewTaskCount),
      String(student.variantChallengeTaskCount),
      String(student.prerequisiteConsolidationTaskCount),
      String(student.teacherFeedbackCount),
      String(student.pendingTeacherFeedbackCount),
      String(student.remindableReviewCount),
      String(student.reviewReminderCount),
      buildStudentReviewGroupLabel(student),
      student.retestSuggestion,
      String(student.totalXp)
    ])
  ];
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function buildTeacherTeachingMaterialsCsv(materials: TeacherTeachingMaterials) {
  const rows = [
    ["课堂讲评素材"],
    ["班级", materials.classId],
    ["年级筛选", materials.filters.grade ?? "全部"],
    ["知识点筛选", materials.filters.knowledgePointId ? getKnowledgePointName(materials.filters.knowledgePointId) : "全部"],
    ["任务类型", reviewTaskTypeText(materials.filters.reviewTaskType)],
    ["备注状态", teacherFeedbackStatusText(materials.filters.feedbackStatus)],
    ["分组方式", teachingMaterialGroupByText(materials.filters.groupBy)],
    ["素材数", String(materials.materials.length)],
    ["模板标题", materials.template.title],
    ["模板口径", materials.template.scopeSummary],
    [],
    ["课堂模板"],
    ["导入语", materials.template.opening],
    ["板书", materials.template.boardPlan.join(" / ")],
    ["讲评步骤", materials.template.teachingSteps.join(" / ")],
    ["学生活动", materials.template.studentActivities.join(" / ")],
    ["课后跟进", materials.template.afterClassActions.join(" / ")],
    [],
    ["素材分组", "素材数", "学生数", "已完成", "已有备注", "建议"],
    ...materials.groups.map((group) => [
      group.label,
      String(group.materialCount),
      String(group.studentCount),
      String(group.completedCount),
      String(group.notedCount),
      group.suggestion
    ]),
    [],
    [
      "学生",
      "任务类型",
      "状态",
      "备注状态",
      "知识点",
      "优先级",
      "优先原因",
      "题目状态",
      "题型",
      "题干",
      "解析",
      "学生复盘笔记",
      "老师备注",
      "完成反馈",
      "课堂讲评建议"
    ],
    ...materials.materials.map((material) => [
      material.displayName,
      material.taskTypeLabel,
      material.status === "completed" ? "已完成" : "待完成",
      teacherFeedbackStatusText(material.feedbackStatus),
      material.knowledgePointName,
      teachingMaterialPriorityText(material.priority),
      material.priorityReason,
      material.question.isPublished ? "已发布" : "未发布或已下架",
      material.question.questionType,
      material.question.stem ?? material.question.contentNotice ?? "",
      material.question.analysis ?? material.question.contentNotice ?? "",
      material.studentReviewNote ?? "",
      material.teacherFeedbackNote ?? "",
      material.completionFeedback,
      material.teachingSuggestion
    ])
  ];
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function buildTeacherTeachingMaterialsMarkdown(materials: TeacherTeachingMaterials) {
  const lines = [
    `# ${materials.template.title}`,
    "",
    `- 班级：${materials.classId}`,
    `- 年级筛选：${materials.filters.grade ?? "全部"}`,
    `- 知识点筛选：${materials.filters.knowledgePointId ? getKnowledgePointName(materials.filters.knowledgePointId) : "全部"}`,
    `- 任务类型：${reviewTaskTypeText(materials.filters.reviewTaskType)}`,
    `- 备注状态：${teacherFeedbackStatusText(materials.filters.feedbackStatus)}`,
    `- 分组方式：${teachingMaterialGroupByText(materials.filters.groupBy)}`,
    `- 素材数：${materials.materials.length}`,
    "",
    "## 课堂模板",
    "",
    materials.template.scopeSummary,
    "",
    `**导入语**：${materials.template.opening}`,
    "",
    "### 板书",
    ...materials.template.boardPlan.map((item) => `- ${item}`),
    "",
    "### 讲评步骤",
    ...materials.template.teachingSteps.map((item, index) => `${index + 1}. ${item}`),
    "",
    "### 学生活动",
    ...materials.template.studentActivities.map((item) => `- ${item}`),
    "",
    "### 课后跟进",
    ...materials.template.afterClassActions.map((item) => `- ${item}`),
    "",
    "## 素材分组",
    "",
    ...(materials.groups.length
      ? materials.groups.flatMap((group) => [
          `### ${group.label}`,
          "",
          `素材 ${group.materialCount} 条，涉及 ${group.studentCount} 名学生，已完成 ${group.completedCount} 条，已有备注 ${group.notedCount} 条。`,
          "",
          group.suggestion,
          ""
        ])
      : ["当前筛选条件下暂无素材分组。", ""]),
    "## 素材清单",
    "",
    ...(materials.materials.length
      ? materials.materials.flatMap((material, index) => [
          `### ${index + 1}. ${material.displayName} · ${material.taskTypeLabel} · ${material.knowledgePointName}`,
          "",
          `- 状态：${material.status === "completed" ? "已完成" : "待完成"}`,
          `- 备注状态：${teacherFeedbackStatusText(material.feedbackStatus)}`,
          `- 优先级：${teachingMaterialPriorityText(material.priority)}，${material.priorityReason}`,
          `- 题目状态：${material.question.isPublished ? "已发布" : "未发布或已下架"}`,
          `- 题型：${material.question.questionType}`,
          "",
          `**题干**：${material.question.stem ?? material.question.contentNotice ?? ""}`,
          "",
          `**解析**：${material.question.analysis ?? material.question.contentNotice ?? ""}`,
          "",
          material.studentReviewNote ? `**学生复盘笔记**：${material.studentReviewNote}` : "**学生复盘笔记**：暂无",
          "",
          material.teacherFeedbackNote ? `**老师备注**：${material.teacherFeedbackNote}` : "**老师备注**：暂无",
          "",
          `**完成反馈**：${material.completionFeedback}`,
          "",
          `**课堂讲评建议**：${material.teachingSuggestion}`,
          ""
        ])
      : ["当前筛选条件下暂无可导出的素材。", ""])
  ];
  return lines.join("\n");
}

function buildNextRoundTaskCsvRows(report: TeacherClassReport) {
  return report.nextRoundSummary.taskBreakdown.flatMap((item) => {
    const assignedRows = item.assignedStudents.length
      ? item.assignedStudents.map((student) => [
          item.label,
          "待完成",
          student.displayName,
          String(student.taskCount),
          student.latestTaskAt ?? "",
          item.completionFeedback,
          item.teachingSuggestion,
          String(item.teacherFeedbackCount)
        ])
      : [[item.label, "待完成", "暂无学生", "0", "", item.completionFeedback, item.teachingSuggestion, String(item.teacherFeedbackCount)]];
    const completedRows = item.completedStudents.length
      ? item.completedStudents.map((student) => [
          item.label,
          "已完成",
          student.displayName,
          String(student.taskCount),
          student.latestTaskAt ?? "",
          item.completionFeedback,
          item.teachingSuggestion,
          String(item.teacherFeedbackCount)
        ])
      : [[item.label, "已完成", "暂无学生", "0", "", item.completionFeedback, item.teachingSuggestion, String(item.teacherFeedbackCount)]];
    return [...assignedRows, ...completedRows];
  });
}

export function buildStudentWrongQuestionsCsv(detail: TeacherStudentDetail) {
  const rows = [
    ["学生", detail.displayName],
    ["作答数", String(detail.answerCount)],
    ["需巩固次数", String(detail.wrongCount)],
    ["正确率", `${detail.accuracy}%`],
    ["补救路径", String(detail.remediationCount)],
    [],
    ["个人薄弱知识点", "需巩固次数", "建议"],
    ...detail.weakKnowledgePoints.map((point) => [point.name, String(point.wrongCount), point.suggestion]),
    [],
    ["题干", "学生答案", "参考答案", "知识点", "题型", "用时", "解析", "复盘建议"],
    ...detail.wrongQuestions.map((question) => [
      question.stem,
      question.selectedAnswer,
      question.correctAnswer,
      question.knowledgePointName,
      question.questionType,
      `${question.durationSeconds}s`,
      question.analysis,
      question.suggestion
    ])
  ];
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function buildStudentReviewGroupLabel(student: TeacherClassReport["students"][number]) {
  if (student.needsConsolidationRetestCount > 0) return "继续巩固中";
  if (student.pendingRetestCount > 0) return "待复测";
  if (student.successfulRetestCount > 0 && student.needsConsolidationRetestCount === 0) return "可挑战变式";
  if (student.answerCount > 0 && student.assignedReviewCount + student.completedReviewCount + student.successfulRetestCount === 0) {
    return "需要分配复盘";
  }
  return "保持观察";
}

function reviewGroupText(reviewGroup?: string) {
  const map: Record<string, string> = {
    needs_consolidation: "继续巩固中",
    pending_retest: "待复测",
    ready_for_challenge: "可挑战变式",
    needs_assignment: "需要分配复盘"
  };
  return reviewGroup ? map[reviewGroup] ?? reviewGroup : "全部";
}

function getReviewTaskType(reason: string): ReviewTaskType {
  if (reason.startsWith("老师布置变式题挑战任务：")) return "variant_challenge";
  if (reason.startsWith("老师布置前置知识巩固任务：")) return "prerequisite_consolidation";
  return "review";
}

function reviewTaskTypeText(reviewTaskType?: string) {
  const map: Record<string, string> = {
    all: "全部任务",
    review: "错题复盘",
    variant_challenge: "变式题挑战",
    prerequisite_consolidation: "前置知识巩固"
  };
  return reviewTaskType ? map[reviewTaskType] ?? reviewTaskType : "全部任务";
}

function teacherFeedbackStatusText(feedbackStatus?: string) {
  const map: Record<string, string> = {
    all: "全部备注状态",
    noted: "已有老师备注",
    pending_feedback: "待写老师备注",
    not_ready: "任务待完成"
  };
  return feedbackStatus ? map[feedbackStatus] ?? feedbackStatus : "全部备注状态";
}

function teachingMaterialGroupByText(groupBy?: string) {
  const map: Record<string, string> = {
    knowledge_point: "按知识点",
    task_type: "按任务类型",
    student: "按学生",
    feedback_status: "按备注状态"
  };
  return groupBy ? map[groupBy] ?? groupBy : "按知识点";
}

function teachingMaterialPriorityText(priority: string) {
  const map: Record<string, string> = {
    high: "优先讲评",
    medium: "课前补充",
    low: "后续跟进"
  };
  return map[priority] ?? priority;
}

function buildTeachingMaterialGroups(materials: TeacherTeachingMaterials["materials"], groupBy: TeachingMaterialGroupBy) {
  const grouped = new Map<string, TeacherTeachingMaterials["materials"]>();
  for (const material of materials) {
    const key = getTeachingMaterialGroupKey(material, groupBy);
    grouped.set(key, [...(grouped.get(key) ?? []), material]);
  }

  return Array.from(grouped.entries())
    .map(([groupKey, groupMaterials]) => {
      const studentCount = new Set(groupMaterials.map((material) => material.studentId)).size;
      const completedCount = groupMaterials.filter((material) => material.status === "completed").length;
      const notedCount = groupMaterials.filter((material) => material.feedbackStatus === "noted").length;
      return {
        groupKey,
        label: getTeachingMaterialGroupLabel(groupMaterials[0], groupBy),
        materialCount: groupMaterials.length,
        studentCount,
        completedCount,
        notedCount,
        suggestion: buildTeachingMaterialGroupSuggestion(groupMaterials, groupBy),
        materialIds: groupMaterials.slice(0, 12).map((material) => material.materialId)
      };
    })
    .sort((a, b) => b.notedCount - a.notedCount || b.completedCount - a.completedCount || b.materialCount - a.materialCount)
    .slice(0, 12);
}

function getTeachingMaterialGroupKey(material: TeacherTeachingMaterials["materials"][number], groupBy: TeachingMaterialGroupBy) {
  if (groupBy === "task_type") return material.taskType;
  if (groupBy === "student") return material.studentId;
  if (groupBy === "feedback_status") return material.feedbackStatus;
  return material.knowledgePointId;
}

function getTeachingMaterialGroupLabel(material: TeacherTeachingMaterials["materials"][number], groupBy: TeachingMaterialGroupBy) {
  if (groupBy === "task_type") return material.taskTypeLabel;
  if (groupBy === "student") return material.displayName;
  if (groupBy === "feedback_status") return teacherFeedbackStatusText(material.feedbackStatus);
  return material.knowledgePointName;
}

function buildTeachingMaterialGroupSuggestion(materials: TeacherTeachingMaterials["materials"], groupBy: TeachingMaterialGroupBy) {
  const first = materials[0];
  const notedCount = materials.filter((material) => material.feedbackStatus === "noted").length;
  const pendingFeedbackCount = materials.filter((material) => material.feedbackStatus === "pending_feedback").length;
  if (!first) return "当前分组暂无课堂讲评素材。";
  if (groupBy === "student") {
    return `${first.displayName} 有 ${materials.length} 条复盘相关记录，适合抽取一条代表性笔记做个别化反馈。`;
  }
  if (groupBy === "task_type") {
    return `${first.taskTypeLabel} 素材中已有 ${notedCount} 条老师备注，可先讲共性方法，再安排短题确认。`;
  }
  if (groupBy === "feedback_status") {
    if (first.feedbackStatus === "noted") return "这些素材已具备老师观察，可直接进入课堂讲评清单。";
    if (first.feedbackStatus === "pending_feedback") return `还有 ${pendingFeedbackCount} 条已完成任务待补备注，建议课前先选 2 条写成观察。`;
    return "这些任务尚未完成，适合作为课后跟进名单。";
  }
  return `围绕「${first.knowledgePointName}」整理 ${materials.length} 条素材，先讲关键概念，再用同类题确认迁移。`;
}

function buildTeachingMaterialTemplate(
  materials: TeacherTeachingMaterials["materials"],
  groups: TeacherTeachingMaterials["groups"],
  filters: TeacherTeachingMaterialFilters
) {
  const topGroup = groups[0];
  const topMaterial = materials[0];
  const focusName = topGroup?.label ?? (filters.knowledgePointId ? getKnowledgePointName(filters.knowledgePointId) : "本次班级复盘");
  const taskTypeFocus = topMaterial ? topMaterial.taskTypeLabel : reviewTaskTypeText(filters.reviewTaskType);
  const materialCount = materials.length;
  const groupCount = groups.length;

  if (!materialCount) {
    return {
      title: "课堂讲评模板",
      scopeSummary: "当前筛选条件下暂未形成可导出的讲评素材。",
      opening: "先用 3-5 分钟收集学生复盘或同类题表现，再生成课堂讲评清单。",
      boardPlan: ["知识点", "典型证据", "下一题入口"],
      teachingSteps: ["先补充一条老师备注。", "再选择一个已发布题目作为示范。", "最后安排一题短练确认学生是否能迁移。"],
      studentActivities: ["学生补写复盘笔记。", "同桌互说题干证据和关键概念。"],
      afterClassActions: ["把完成复盘的学生推进到同类题复测。"],
      materialCount,
      groupCount
    };
  }

  const notedCount = materials.filter((material) => material.feedbackStatus === "noted").length;
  const pendingFeedbackCount = materials.filter((material) => material.feedbackStatus === "pending_feedback").length;
  const redactedCount = materials.filter((material) => !material.question.isPublished).length;

  return {
    title: `课堂讲评模板：${focusName}`,
    scopeSummary: `本次筛选得到 ${materialCount} 条素材，覆盖 ${groupCount} 个分组，已有老师备注 ${notedCount} 条，待补备注 ${pendingFeedbackCount} 条。`,
    opening: `先从「${focusName}」切入，请学生说清题干证据、关键概念和下一步复盘动作。`,
    boardPlan: [
      `共性断点：${focusName}`,
      `任务类型：${taskTypeFocus}`,
      "三栏板书：题干证据 / 化学概念 / 下一题入口",
      redactedCount > 0 ? "未发布或已下架题目只保留跟进线索，课堂题干使用已发布替代题。" : "题干与解析仅来自已发布题目。"
    ],
    teachingSteps: [
      "展示一条代表性复盘或老师备注，先还原学生的思路入口。",
      "追问题干中的证据来自哪里，再把证据对应到化学概念。",
      "用同类题或变式题做 3 分钟迁移检查，观察是否真正从“懂”走到“会”。",
      "把继续巩固的学生安排到前置知识短练，把迁移成功的学生推进到变式挑战。"
    ],
    studentActivities: [
      "圈出题干限定词和关键证据。",
      "用一句话说明本题对应的化学概念。",
      "对照复盘笔记写出下一题先做什么。"
    ],
    afterClassActions: [
      "给待补备注的已完成任务补一条老师观察。",
      "对待完成任务做温和提醒。",
      "导出本清单作为下次分层讲评依据。"
    ],
    materialCount,
    groupCount
  };
}

function getTeachingMaterialPriority(
  feedbackStatus: TeacherTeachingMaterials["materials"][number]["feedbackStatus"],
  retestStatus: TeacherTeachingMaterials["materials"][number]["retestStatus"]
) {
  if (feedbackStatus === "noted") return { priority: "high" as const, reason: "已有老师备注，可直接转化为课堂讲评素材。" };
  if (feedbackStatus === "pending_feedback" && retestStatus === "needs_consolidation") {
    return { priority: "high" as const, reason: "学生已完成任务但仍需巩固，建议优先补写观察并安排短讲。" };
  }
  if (feedbackStatus === "pending_feedback") return { priority: "medium" as const, reason: "学生已完成任务，课前补一条备注即可用于讲评。" };
  return { priority: "low" as const, reason: "任务尚未完成，先作为课后跟进名单。" };
}

function teachingMaterialPriorityRank(priority: TeacherTeachingMaterials["materials"][number]["priority"]) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function buildNextRoundSummary(tasks: any[], studentNameMap: Map<string, string> = new Map()) {
  const variantTasks = tasks.filter((task) => getReviewTaskType(task.reason) === "variant_challenge");
  const prerequisiteTasks = tasks.filter((task) => getReviewTaskType(task.reason) === "prerequisite_consolidation");
  const variantAssignedCount = variantTasks.filter((task) => task.status.startsWith("assigned_review:")).length;
  const variantCompletedCount = variantTasks.filter((task) => task.status.startsWith("completed_review:")).length;
  const prerequisiteAssignedCount = prerequisiteTasks.filter((task) => task.status.startsWith("assigned_review:")).length;
  const prerequisiteCompletedCount = prerequisiteTasks.filter((task) => task.status.startsWith("completed_review:")).length;
  const totalAssignedCount = variantAssignedCount + prerequisiteAssignedCount;
  const totalCompletedCount = variantCompletedCount + prerequisiteCompletedCount;
  const totalNextRoundCount = totalAssignedCount + totalCompletedCount;
  const taskBreakdown = [
    buildNextRoundTaskBreakdown("variant_challenge", "变式题挑战", variantTasks, studentNameMap),
    buildNextRoundTaskBreakdown("prerequisite_consolidation", "前置知识巩固", prerequisiteTasks, studentNameMap)
  ];

  return {
    variantAssignedCount,
    variantCompletedCount,
    prerequisiteAssignedCount,
    prerequisiteCompletedCount,
    totalAssignedCount,
    totalCompletedCount,
    completionRate: totalNextRoundCount ? Math.round((totalCompletedCount / totalNextRoundCount) * 100) : 0,
    suggestion: buildNextRoundSuggestion(variantAssignedCount, variantCompletedCount, prerequisiteAssignedCount, prerequisiteCompletedCount),
    taskBreakdown
  };
}

function buildNextRoundTaskBreakdown(
  taskType: "variant_challenge" | "prerequisite_consolidation",
  label: string,
  tasks: any[],
  studentNameMap: Map<string, string>
) {
  const assignedTasks = tasks.filter((task) => task.status.startsWith("assigned_review:"));
  const completedTasks = tasks.filter((task) => task.status.startsWith("completed_review:"));
  const total = assignedTasks.length + completedTasks.length;
  return {
    taskType,
    label,
    assignedCount: assignedTasks.length,
    completedCount: completedTasks.length,
    completionRate: total ? Math.round((completedTasks.length / total) * 100) : 0,
    teacherFeedbackCount: completedTasks.filter((task) => task.teacherFeedbackNote).length,
    completionFeedback: buildNextRoundCompletionFeedback(taskType, assignedTasks.length, completedTasks.length),
    teachingSuggestion: buildNextRoundTeachingSuggestion(taskType, completedTasks),
    assignedStudents: buildNextRoundTaskStudents(assignedTasks, studentNameMap, "createdAt"),
    completedStudents: buildNextRoundTaskStudents(completedTasks, studentNameMap, "completedAt")
  };
}

function buildNextRoundTaskStudents(tasks: any[], studentNameMap: Map<string, string>, dateField: "createdAt" | "completedAt"): NextRoundTaskStudent[] {
  const grouped = new Map<string, { taskCount: number; latestTaskAt?: Date }>();
  for (const task of tasks) {
    const current = grouped.get(task.studentId) ?? { taskCount: 0, latestTaskAt: undefined };
    const taskDate = task[dateField] instanceof Date ? task[dateField] : task.createdAt instanceof Date ? task.createdAt : undefined;
    grouped.set(task.studentId, {
      taskCount: current.taskCount + 1,
      latestTaskAt: latestDate([current.latestTaskAt ?? null, taskDate ?? null])
    });
  }

  return Array.from(grouped.entries())
    .map(([studentId, stats]) => ({
      studentId,
      displayName: studentNameMap.get(studentId) ?? "学生",
      taskCount: stats.taskCount,
      latestTaskAt: stats.latestTaskAt?.toISOString()
    }))
    .sort((a, b) => b.taskCount - a.taskCount || (b.latestTaskAt ?? "").localeCompare(a.latestTaskAt ?? ""))
    .slice(0, 8);
}

function buildTeacherFeedbackSummary(tasks: any[], studentNameMap: Map<string, string> = new Map()) {
  const completedTasks = tasks.filter((task) => task.status?.startsWith("completed_review:"));
  const notedTasks = completedTasks.filter((task) => task.teacherFeedbackNote);
  const pendingFeedbackCount = completedTasks.length - notedTasks.length;
  const teachingChecklist = notedTasks
    .map((task) => {
      const taskType = getReviewTaskType(task.reason ?? "");
      const knowledgePointName =
        task.targetKnowledgePointId && task.targetKnowledgePointId !== "unlinked" ? getKnowledgePointName(task.targetKnowledgePointId) : "相关知识点";
      return {
        studentId: task.studentId,
        displayName: studentNameMap.get(task.studentId) ?? "学生",
        taskTypeLabel: reviewTaskTypeText(taskType),
        knowledgePointName,
        feedbackNote: task.teacherFeedbackNote,
        teachingSuggestion: buildReviewTaskTeachingSuggestion(taskType, knowledgePointName, task.retestIsCorrect, Boolean(task.completedAt)),
        feedbackAt: task.teacherFeedbackAt?.toISOString()
      };
    })
    .sort((a, b) => (b.feedbackAt ?? "").localeCompare(a.feedbackAt ?? ""))
    .slice(0, 8);

  return {
    notedCount: notedTasks.length,
    pendingFeedbackCount,
    suggestion: buildTeacherFeedbackSummarySuggestion(notedTasks.length, pendingFeedbackCount),
    teachingChecklist
  };
}

function buildTeacherFeedbackSummarySuggestion(notedCount: number, pendingFeedbackCount: number) {
  if (notedCount + pendingFeedbackCount === 0) return "学生完成复盘或二次任务后，可以在个人下钻中保存老师备注，形成讲评素材。";
  if (pendingFeedbackCount > notedCount) return `还有 ${pendingFeedbackCount} 个已完成任务未写备注，建议先补 2-3 条代表性观察。`;
  if (notedCount > 0) return "已有老师备注可用于课堂讲评，建议按任务类型挑选共性方法进行短讲。";
  return "继续观察已完成任务，把代表性复盘写成讲评备注。";
}

function buildNextRoundSuggestion(
  variantAssignedCount: number,
  variantCompletedCount: number,
  prerequisiteAssignedCount: number,
  prerequisiteCompletedCount: number
) {
  const assignedCount = variantAssignedCount + prerequisiteAssignedCount;
  const completedCount = variantCompletedCount + prerequisiteCompletedCount;
  if (assignedCount + completedCount === 0) {
    return "可先从分层复盘建议中选择迁移成功或继续巩固的学生，再批量分配下一轮任务。";
  }
  if (assignedCount > completedCount) {
    return `还有 ${assignedCount} 个下一轮任务待完成，建议先按任务类型筛选学生，集中提醒和跟进。`;
  }
  if (variantCompletedCount > 0 && prerequisiteCompletedCount > 0) {
    return "变式挑战和前置巩固都有完成记录，可以对照学生表现安排小组讲评。";
  }
  if (variantCompletedCount > 0) {
    return "已有学生完成变式挑战，适合继续推进到综合情境或实验推理题。";
  }
  return "已有学生完成前置巩固，建议用一道同类题确认关键条件是否补稳。";
}

function buildNextRoundCompletionFeedback(
  taskType: "variant_challenge" | "prerequisite_consolidation",
  assignedCount: number,
  completedCount: number
) {
  const label = taskType === "variant_challenge" ? "变式挑战" : "前置巩固";
  if (assignedCount + completedCount === 0) return `当前还没有${label}任务，可以先从分层复盘名单中选择合适学生。`;
  if (completedCount === 0) return `${label}任务已分配，下一步先看学生是否完成，再判断是否进入讲评。`;
  if (assignedCount > 0) return `${completedCount} 个${label}任务已经完成，仍有 ${assignedCount} 个待完成，可先形成一组示范反馈。`;
  return `${label}任务已形成完成记录，适合提炼共性方法并安排后续迁移。`;
}

function buildNextRoundTeachingSuggestion(taskType: "variant_challenge" | "prerequisite_consolidation", completedTasks: any[]) {
  if (!completedTasks.length) {
    return taskType === "variant_challenge"
      ? "等学生完成变式挑战后，可对比原题和变式题的条件变化组织讲评。"
      : "等学生完成前置巩固后，可用一题短练检查关键概念是否补稳。";
  }
  return taskType === "variant_challenge"
    ? "优先请完成变式挑战的学生说明题干证据如何迁移，再补充一个新情境追问。"
    : "优先围绕完成前置巩固的学生笔记，讲清概念、条件和同类题入口。";
}

function buildReviewTaskCompletionFeedback(taskType: ReviewTaskType, retestIsCorrect?: boolean | null, completed = false) {
  if (!completed) return "任务完成后会在这里生成可用于跟进的反馈。";
  if (taskType === "variant_challenge") return "学生已完成变式题挑战，可以重点观察方法是否能迁移到新情境。";
  if (taskType === "prerequisite_consolidation") return "学生已完成前置知识巩固，可以用一道短同类题确认基础是否补稳。";
  if (retestIsCorrect === true) return "学生已完成错题复盘并在复测中迁移成功，适合进入变式题挑战。";
  if (retestIsCorrect === false) return "学生已完成错题复盘，复测显示还需要继续巩固前置概念。";
  return "学生已完成错题复盘，建议继续安排同类题复测确认迁移情况。";
}

function buildReviewTaskTeachingSuggestion(taskType: ReviewTaskType, knowledgePointName: string, retestIsCorrect?: boolean | null, completed = false) {
  if (!completed) return `待学生完成后，可围绕「${knowledgePointName}」整理一条简短跟进建议。`;
  if (taskType === "variant_challenge") return `讲评时可让学生对比原题和变式题，说明「${knowledgePointName}」中的条件变化和证据链。`;
  if (taskType === "prerequisite_consolidation") return `讲评时先回到「${knowledgePointName}」的关键概念，再安排一题更基础的同类题。`;
  if (retestIsCorrect === true) return `讲评时可强化「${knowledgePointName}」的迁移方法，并把学生推进到变式情境。`;
  if (retestIsCorrect === false) return `讲评时先补「${knowledgePointName}」的前置条件，再用短题检查是否补稳。`;
  return `讲评时围绕「${knowledgePointName}」复盘错因、证据和下一题入口。`;
}

function summarizeWeakQuestionTypes(answers: any[]) {
  const grouped = new Map<string, { answerCount: number; wrongCount: number }>();
  for (const answer of answers) {
    const questionType = answer.question?.questionType;
    if (!questionType) continue;
    const current = grouped.get(questionType) ?? { answerCount: 0, wrongCount: 0 };
    current.answerCount += 1;
    if (!answer.isCorrect) current.wrongCount += 1;
    grouped.set(questionType, current);
  }

  return Array.from(grouped.entries())
    .filter(([, stats]) => stats.wrongCount > 0)
    .map(([questionType, stats]) => ({
      questionType,
      label: questionTypeText(questionType),
      answerCount: stats.answerCount,
      wrongCount: stats.wrongCount,
      wrongRate: Math.round((stats.wrongCount / stats.answerCount) * 100),
      suggestion: buildQuestionTypeSuggestion(questionType)
    }))
    .sort((a, b) => b.wrongRate - a.wrongRate || b.wrongCount - a.wrongCount)
    .slice(0, 5);
}

function summarizeWeakCoreLiteracy(answers: any[]) {
  const grouped = new Map<string, { answerCount: number; wrongCount: number }>();
  for (const answer of answers) {
    const tags = answer.question?.literacyLinks?.map((link: any) => link.literacyTag).filter(Boolean) ?? [];
    for (const tag of tags.length ? tags : ["evidence_model"]) {
      const current = grouped.get(tag) ?? { answerCount: 0, wrongCount: 0 };
      current.answerCount += 1;
      if (!answer.isCorrect) current.wrongCount += 1;
      grouped.set(tag, current);
    }
  }

  return Array.from(grouped.entries())
    .filter(([, stats]) => stats.wrongCount > 0)
    .map(([literacyTag, stats]) => ({
      literacyTag,
      label: literacyText(literacyTag),
      answerCount: stats.answerCount,
      wrongCount: stats.wrongCount,
      wrongRate: Math.round((stats.wrongCount / stats.answerCount) * 100),
      suggestion: buildLiteracySuggestion(literacyTag)
    }))
    .sort((a, b) => b.wrongRate - a.wrongRate || b.wrongCount - a.wrongCount)
    .slice(0, 5);
}

function buildRetestSummary(reviewTasksByStudent: Map<string, any[]> | any[]) {
  const tasks = Array.isArray(reviewTasksByStudent) ? reviewTasksByStudent : Array.from(reviewTasksByStudent.values()).flat();
  const completedTasks = tasks.filter((task) => task.retestCompletedAt);
  const successfulCount = completedTasks.filter((task) => task.retestIsCorrect === true).length;
  const needsConsolidationCount = completedTasks.filter((task) => task.retestIsCorrect === false).length;
  const pendingCount = tasks.length - completedTasks.length;
  return {
    completedCount: completedTasks.length,
    successfulCount,
    needsConsolidationCount,
    pendingCount,
    successRate: completedTasks.length ? Math.round((successfulCount / completedTasks.length) * 100) : 0,
    suggestion: buildClassRetestSuggestion(successfulCount, needsConsolidationCount, pendingCount)
  };
}

function buildReviewTrend(tasks: any[], windowDays = 7) {
  const since = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const inWindow = (value?: Date | null) => Boolean(value && value.getTime() >= since);
  const assignedCount = tasks.filter((task) => inWindow(task.createdAt)).length;
  const completedCount = tasks.filter((task) => inWindow(task.completedAt)).length;
  const remindedCount = tasks.filter((task) => inWindow(task.lastReviewReminderAt)).length;
  const retestedCount = tasks.filter((task) => inWindow(task.retestCompletedAt)).length;
  return {
    windowDays,
    assignedCount,
    completedCount,
    remindedCount,
    retestedCount,
    suggestion: buildReviewTrendSuggestion(assignedCount, completedCount, remindedCount, retestedCount)
  };
}

function buildReviewTrendSuggestion(assignedCount: number, completedCount: number, remindedCount: number, retestedCount: number) {
  if (assignedCount + completedCount + remindedCount + retestedCount === 0) {
    return "最近还没有复盘推进记录，建议先从 3 名代表性学生开始分配错题复盘。";
  }
  if (assignedCount > completedCount && remindedCount === 0) {
    return "近期已分配复盘但提醒较少，建议先温和提醒待复盘学生完成笔记和同类题。";
  }
  if (completedCount > retestedCount) {
    return "近期复盘完成数高于复测数，建议把已完成复盘的学生推进到同类题迁移检查。";
  }
  return "近期复盘推进较顺畅，建议把迁移成功学生转入变式题，把继续巩固学生安排短讲短练。";
}

function buildReviewGroups(students: TeacherClassReport["students"]) {
  const groups = [
    {
      groupKey: "needs_consolidation",
      label: "继续巩固中",
      studentCount: students.filter((student) => student.needsConsolidationRetestCount > 0).length,
      suggestion: "先讲关键概念和题干证据，再安排一道更基础的同类题。"
    },
    {
      groupKey: "pending_retest",
      label: "待复测",
      studentCount: students.filter((student) => student.pendingRetestCount > 0).length,
      suggestion: "优先完成一题同类题迁移检查，确认复盘是否真正转化为会做。"
    },
    {
      groupKey: "ready_for_challenge",
      label: "可挑战变式",
      studentCount: students.filter((student) => student.successfulRetestCount > 0 && student.needsConsolidationRetestCount === 0).length,
      suggestion: "安排变式题或综合情境题，巩固从方法到迁移的能力。"
    },
    {
      groupKey: "needs_assignment",
      label: "需要分配复盘",
      studentCount: students.filter(
        (student) => student.answerCount > 0 && student.assignedReviewCount + student.completedReviewCount + student.successfulRetestCount === 0
      ).length,
      suggestion: "从最近错题中挑一题做短复盘，先建立错因和前置知识路径。"
    }
  ];
  return groups.filter((group) => group.studentCount > 0);
}

function buildClassRetestSuggestion(successfulCount: number, needsConsolidationCount: number, pendingCount: number) {
  if (successfulCount + needsConsolidationCount + pendingCount === 0) {
    return "先从错题清单分配复盘任务，再用同类题观察学生是否能迁移应用。";
  }
  if (needsConsolidationCount > 0) {
    return "优先跟进“继续巩固中”的学生，先补关键概念，再安排一道更短的同类题复测。";
  }
  if (pendingCount > 0) {
    return "已有复盘任务待复测，建议课堂末尾留出 3 分钟完成同类题迁移检查。";
  }
  return "已完成复测的学生整体迁移良好，可以进入变式题或综合情境训练。";
}

function buildStudentRetestSuggestion(successfulCount: number, needsConsolidationCount: number, pendingCount: number) {
  if (needsConsolidationCount > 0) {
    return "继续巩固中：先回看复盘笔记，补清关键条件，再做一道更基础的同类题。";
  }
  if (successfulCount > 0) {
    return "已迁移成功：可以安排一道变式题，帮助学生把方法迁移到新情境。";
  }
  if (pendingCount > 0) {
    return "待复测：复盘后需要补一题同类题，确认是否真正从“懂”走到“会”。";
  }
  return "暂无复测任务：可先从最近错题中分配一条短复盘。";
}

function buildTeachingSuggestions(
  weakKnowledgePoints: TeacherClassReport["weakKnowledgePoints"],
  weakQuestionTypes: TeacherClassReport["weakQuestionTypes"],
  weakCoreLiteracy: TeacherClassReport["weakCoreLiteracy"],
  retestSummary: TeacherClassReport["retestSummary"],
  remediationCount: number,
  answerCount: number
) {
  if (answerCount === 0) return ["先安排一次 5 分钟诊断，让系统形成班级画像。"];
  const suggestions = [];
  if (weakKnowledgePoints[0]) {
    suggestions.push(`优先讲评「${weakKnowledgePoints[0].name}」，这是当前班级最集中的知识断点。`);
  }
  if (weakQuestionTypes[0]) {
    suggestions.push(`题型上优先处理「${weakQuestionTypes[0].label}」，建议先示范审题路径，再让学生复述解题依据。`);
  }
  if (weakCoreLiteracy[0]) {
    suggestions.push(`核心素养上重点强化「${weakCoreLiteracy[0].label}」，讲评时要让学生说清证据、模型和推理过程。`);
  }
  if (remediationCount > 0) {
    suggestions.push("保留前置知识补救路径，讲评后安排同类题复测。");
  }
  if (retestSummary.needsConsolidationCount > 0) {
    suggestions.push(`复测中有 ${retestSummary.needsConsolidationCount} 个任务仍需巩固，建议先做短讲短练，再安排二次迁移检查。`);
  } else if (retestSummary.successfulCount > 0) {
    suggestions.push(`已有 ${retestSummary.successfulCount} 个复盘任务完成迁移，可进入变式题或综合情境训练。`);
  }
  suggestions.push("分层作业应优先奖励补清前置知识和错题复盘，而不是单纯刷题数量。");
  return suggestions;
}

function questionTypeText(type: string) {
  const map: Record<string, string> = {
    single_choice: "单选题",
    multiple_choice: "多选题",
    fill_blank: "填空题",
    short_answer: "简答题",
    calculation: "计算题",
    experiment: "实验题",
    inference: "推断题"
  };
  return map[type] ?? type;
}

function gradeText(grade: string) {
  const map: Record<string, string> = {
    junior_three: "初三",
    senior_one: "高一",
    senior_two: "高二",
    senior_three: "高三"
  };
  return map[grade] ?? grade;
}

function literacyText(tag: string) {
  const map: Record<string, string> = {
    macro_micro: "宏观辨识与微观探析",
    change_balance: "变化观念与平衡思想",
    evidence_model: "证据推理与模型认知",
    inquiry_innovation: "科学探究与创新意识",
    attitude_responsibility: "科学态度与社会责任"
  };
  return map[tag] ?? tag;
}

function buildQuestionTypeSuggestion(type: string) {
  const map: Record<string, string> = {
    single_choice: "讲评时先训练学生划出限定词，再逐项排除干扰项。",
    multiple_choice: "重点训练学生逐项判断证据，避免只凭熟悉选项作答。",
    fill_blank: "先回到概念关键词和规范表达，再做短句填空训练。",
    short_answer: "示范答案结构：现象、依据、结论，减少只写结论。",
    calculation: "先统一量的关系和单位，再拆成已知、所求、公式三步。",
    experiment: "围绕变量控制、现象记录、证据解释组织讲评。",
    inference: "训练学生把题干信息转成流程图，再逐步锁定物质。"
  };
  return map[type] ?? "先提炼该题型的审题步骤，再安排同类题复测。";
}

function buildLiteracySuggestion(tag: string) {
  const map: Record<string, string> = {
    macro_micro: "让学生把宏观现象和微观粒子变化一一对应。",
    change_balance: "引导学生用变化、守恒和平衡移动解释解题过程。",
    evidence_model: "要求学生先说证据，再说模型，最后给结论。",
    inquiry_innovation: "把实验讲评拆成目的、变量、现象、结论四步。",
    attitude_responsibility: "补充真实情境中的安全、环保和社会责任判断。"
  };
  return map[tag] ?? "围绕证据提取和化学表达进行短讲短练。";
}

function buildStudentKnowledgePointSuggestion(wrongCount: number, remediationCount: number) {
  if (wrongCount === 0 && remediationCount > 0) return "已进入补救路径，建议安排一道同类题复测。";
  if (wrongCount >= 2) return "建议课后先补概念，再做同类题复盘。";
  if (wrongCount === 1) return "建议用一道典型题核对概念和证据。";
  return "可作为稳定样本，后续关注迁移应用。";
}

function buildWrongQuestionSuggestion(knowledgePointId: string, questionType: string) {
  const pointName = knowledgePointId ? getKnowledgePointName(knowledgePointId) : "对应知识点";
  const typeSuggestion = questionType ? buildQuestionTypeSuggestion(questionType) : "先复述题干证据，再说明解题依据。";
  return `先回到「${pointName}」的关键概念，再完成一题同类复盘。${typeSuggestion}`;
}

function buildStudentDetailSuggestions(
  weakKnowledgePoints: TeacherStudentDetail["weakKnowledgePoints"],
  wrongCount: number,
  remediationCount: number
) {
  if (wrongCount === 0) return ["当前筛选范围内表现稳定，可以安排迁移应用题保持手感。"];
  const suggestions = [];
  if (weakKnowledgePoints[0]) {
    suggestions.push(`优先补「${weakKnowledgePoints[0].name}」，先讲关键概念，再做同类复盘。`);
  }
  if (remediationCount > 0) {
    suggestions.push("该学生已有补救记录，建议用一道短题确认是否真正补清。");
  } else {
    suggestions.push("建议先建立一条前置知识补救路径，再回到原错题复测。");
  }
  return suggestions;
}

function getKnowledgePointName(knowledgePointId: string) {
  return knowledgePoints.find((point) => point.id === knowledgePointId)?.name ?? knowledgePointId;
}

function displayJson(value: unknown) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

function escapeCsvCell(value: string) {
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
}

export const teacherReportRepository: TeacherReportRepository = hasDatabaseUrl()
  ? new PrismaTeacherReportRepository()
  : new MemoryTeacherReportRepository();
