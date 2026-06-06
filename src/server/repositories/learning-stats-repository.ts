import { buildDemoLeaderboard } from "@/domain/leaderboard";
import { createCoreLiteracyGoalReward, createReviewCompletedReward } from "@/domain/rewards";
import type { LeaderboardEntry, TimeAssessment } from "@/domain/types";
import { getPrismaClient, hasDatabaseUrl } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";

export interface StudentLearningReport {
  studentId: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  totalXp: number;
  totalGems: number;
  remediationCount: number;
  thoughtfulCount: number;
  weakKnowledgePointIds: string[];
  recentTimeAssessment?: TimeAssessment;
  encouragement: string;
  nextStepHints: string[];
  reviewTasks: StudentReviewTask[];
  todayTasks: StudentTaskCard[];
  completedTasks: StudentTaskCard[];
  growthTimeline: StudentGrowthTimelineItem[];
  weeklyGrowthSummary: StudentWeeklyGrowthSummary;
  weeklyReviewCards: StudentWeeklyReviewCard[];
  coreLiteracyGrowth: StudentCoreLiteracyGrowthItem[];
  coreLiteracyGoals: StudentCoreLiteracyGoal[];
  coreLiteracyGoalRecommendation?: StudentCoreLiteracyGoalRecommendation;
  coreLiteracyGoalHistory: StudentCoreLiteracyGoalHistoryItem[];
  milestoneBadges: StudentMilestoneBadge[];
}

export interface StudentTaskCard {
  taskId: string;
  title: string;
  detail: string;
  knowledgePointName: string;
  actionType: "complete_review" | "same_type_retest" | "challenge_variant" | "revisit_prerequisite" | "retry_foundation";
  status: "todo" | "done";
  ctaLabel: string;
}

export interface StudentGrowthTimelineItem {
  eventType: string;
  label: string;
  xp: number;
  gems: number;
  reason: string;
  createdAt: string;
}

export interface StudentWeeklyGrowthSummary {
  windowDays: number;
  xp: number;
  gems: number;
  rewardCount: number;
  completedReviewCount: number;
  remediationCount: number;
  breakthroughCount: number;
  literacyProgressCount: number;
  consistencyText: string;
  suggestion: string;
}

export interface StudentWeeklyReviewCard {
  cardId: string;
  title: string;
  focus: string;
  evidenceText: string;
  ctaLabel: string;
}

export interface StudentCoreLiteracyGrowthItem {
  literacyTag: string;
  label: string;
  answerCount: number;
  correctCount: number;
  accuracy: number;
  growthLevel: "starting" | "building" | "steady";
  encouragement: string;
  nextAction: string;
}

export interface StudentCoreLiteracyGoal {
  literacyTag: string;
  label: string;
  selected: boolean;
  status: "available" | "selected" | "completed";
  periodType: string;
  periodKey: string;
  targetText: string;
  progressText: string;
  nextAction: string;
  completedAt?: string;
  rewardText?: string;
}

export interface StudentCoreLiteracyGoalHistoryItem {
  goalId?: string;
  literacyTag: string;
  label: string;
  status: "active" | "paused" | "completed";
  periodType?: string;
  periodKey?: string;
  startedAt?: string;
  dueAt?: string;
  completedAt?: string;
  rewardText: string;
}

export interface StudentCoreLiteracyGoalRecommendation {
  literacyTag: string;
  label: string;
  reason: string;
  ctaLabel: string;
}

export interface CoreLiteracyGoalHistoryFilters {
  status?: "active" | "paused" | "completed" | "all";
  literacyTag?: string;
  periodType?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

export interface StudentMilestoneBadge {
  badgeId: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressText: string;
  unlockedAt?: string;
}

export interface StudentReviewTask {
  id: string;
  questionId: string;
  stem: string;
  knowledgePointId: string;
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
  nextAction?: {
    actionType: "challenge_variant" | "revisit_prerequisite" | "retry_foundation" | "same_type_retest";
    title: string;
    detail: string;
    targetKnowledgePointId?: string;
    status: "available" | "completed";
    rewardText?: string;
  };
  encouragement: string;
}

export interface LearningStatsRepository {
  getGrowthLeaderboard(limit?: number): Promise<LeaderboardEntry[]>;
  getStudentReport(studentId: string): Promise<StudentLearningReport>;
  getStudentReviewTasks(studentId: string): Promise<StudentReviewTask[]>;
  completeStudentReviewTask(
    studentId: string,
    taskId: string,
    reviewNote?: string
  ): Promise<{ task: StudentReviewTask; reward: { xp: number; gems: number; reason: string } } | null>;
  selectCoreLiteracyGoal(
    studentId: string,
    literacyTag: string,
    options?: { periodType?: "weekly"; action?: "start" | "reopen" }
  ): Promise<StudentCoreLiteracyGoal | null>;
  listCoreLiteracyGoalHistory(studentId: string, filters?: CoreLiteracyGoalHistoryFilters): Promise<StudentCoreLiteracyGoalHistoryItem[]>;
}

class MemoryLearningStatsRepository implements LearningStatsRepository {
  async getGrowthLeaderboard() {
    return buildDemoLeaderboard();
  }

  async getStudentReport(studentId: string) {
    return {
      studentId,
      totalAnswers: 0,
      correctAnswers: 0,
      accuracy: 0,
      totalXp: 0,
      totalGems: 0,
      remediationCount: 0,
      thoughtfulCount: 0,
      weakKnowledgePointIds: [],
      encouragement: "登录后完成几道诊断题，这里会生成你的真实学习报告。",
      nextStepHints: ["先从当前年级的基础节点开始诊断。"],
      reviewTasks: [],
      todayTasks: [],
      completedTasks: [],
      growthTimeline: [],
      weeklyGrowthSummary: buildWeeklyGrowthSummary([]),
      weeklyReviewCards: buildWeeklyReviewCards(buildWeeklyGrowthSummary([]), []),
      coreLiteracyGrowth: [],
      coreLiteracyGoals: buildCoreLiteracyGoals([], []),
      coreLiteracyGoalRecommendation: buildCoreLiteracyGoalRecommendation([], []),
      coreLiteracyGoalHistory: buildCoreLiteracyGoalHistory([]),
      milestoneBadges: buildMilestoneBadges(buildWeeklyGrowthSummary([]), [], 0)
    };
  }

  async getStudentReviewTasks() {
    return [];
  }

  async completeStudentReviewTask() {
    return null;
  }

  async selectCoreLiteracyGoal() {
    return null;
  }

  async listCoreLiteracyGoalHistory() {
    return [];
  }
}

class PrismaLearningStatsRepository implements LearningStatsRepository {
  async getGrowthLeaderboard(limit = 10) {
    const prisma = getPrismaClient();
    const rows = await prisma.rewardEvent.groupBy({
      by: ["studentId"],
      _sum: { xp: true },
      orderBy: { _sum: { xp: "desc" } },
      take: limit
    });
    const users = await prisma.user.findMany({
      where: { id: { in: rows.map((row) => row.studentId) } },
      select: { id: true, displayName: true, username: true }
    });
    const userMap = new Map(users.map((user) => [user.id, user]));

    return rows.map((row, index): LeaderboardEntry => {
      const user = userMap.get(row.studentId);
      const score = row._sum.xp ?? 0;
      return {
        studentName: user?.displayName ?? user?.username ?? "学生",
        leaderboardType: "growth_xp",
        score,
        rank: index + 1,
        description: describeGrowth(score)
      };
    });
  }

  async getStudentReport(studentId: string) {
    const prisma = getPrismaClient();
    const answers = await prisma.answerRecord.findMany({
      where: { studentId },
      include: { question: { include: { literacyLinks: true } } },
      orderBy: { submittedAt: "desc" },
      take: 100
    });
    const coreLiteracyGrowth = buildCoreLiteracyGrowth(answers);
    let coreLiteracyGoals = await prisma.studentLearningGoal.findMany({
      where: { studentId, goalType: coreLiteracyGoalType, status: { in: ["active", "completed"] } },
      orderBy: { updatedAt: "desc" }
    });
    const completedGoalCount = await completeEligibleCoreLiteracyGoals(studentId, coreLiteracyGoals, answers);
    if (completedGoalCount > 0) {
      coreLiteracyGoals = await prisma.studentLearningGoal.findMany({
        where: { studentId, goalType: coreLiteracyGoalType, status: { in: ["active", "completed"] } },
        orderBy: { updatedAt: "desc" }
      });
    }
    const [rewardSum, rewardEvents, remediationCount, reviewTasks] = await Promise.all([
      prisma.rewardEvent.aggregate({
        where: { studentId },
        _sum: { xp: true, gems: true }
      }),
      prisma.rewardEvent.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" },
        take: 12
      }),
      prisma.remediationPath.count({ where: { studentId } }),
      this.getStudentReviewTasks(studentId)
    ]);

    const totalAnswers = answers.length;
    const correctAnswers = answers.filter((answer) => answer.isCorrect).length;
    const weakKnowledgePointIds = Array.from(
      new Set(
        answers
          .filter((answer: any) => !answer.isCorrect && answer.knowledgePointId)
          .map((answer: any) => String(answer.knowledgePointId))
      )
    ).slice(0, 5);
    const thoughtfulCount = answers.filter((answer: any) => answer.behaviorSignal === "thoughtful").length;
    const recentTimeAssessment = answers[0]?.timeAssessment ?? undefined;
    const weeklyGrowthSummary = buildWeeklyGrowthSummary(rewardEvents);

    return {
      studentId,
      totalAnswers,
      correctAnswers,
      accuracy: totalAnswers ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
      totalXp: rewardSum._sum.xp ?? 0,
      totalGems: rewardSum._sum.gems ?? 0,
      remediationCount,
      thoughtfulCount,
      weakKnowledgePointIds,
      recentTimeAssessment,
      encouragement: buildEncouragement(totalAnswers, correctAnswers, remediationCount),
      nextStepHints: buildNextStepHints(totalAnswers, weakKnowledgePointIds, remediationCount, reviewTasks),
      reviewTasks,
      todayTasks: buildTodayTasks(reviewTasks),
      completedTasks: buildCompletedTasks(reviewTasks),
      growthTimeline: buildGrowthTimeline(rewardEvents),
      weeklyGrowthSummary,
      weeklyReviewCards: buildWeeklyReviewCards(weeklyGrowthSummary, reviewTasks),
      coreLiteracyGrowth,
      coreLiteracyGoals: buildCoreLiteracyGoals(coreLiteracyGrowth, coreLiteracyGoals),
      coreLiteracyGoalRecommendation: buildCoreLiteracyGoalRecommendation(coreLiteracyGrowth, coreLiteracyGoals),
      coreLiteracyGoalHistory: buildCoreLiteracyGoalHistory(coreLiteracyGoals),
      milestoneBadges: buildMilestoneBadges(weeklyGrowthSummary, rewardEvents, totalAnswers)
    };
  }

  async getStudentReviewTasks(studentId: string) {
    const prisma = getPrismaClient();
    const [paths, nextActionRewards] = await Promise.all([
      prisma.remediationPath.findMany({
        where: {
          studentId,
          OR: [{ status: { startsWith: "assigned_review:" } }, { status: { startsWith: "completed_review:" } }]
        },
        orderBy: { createdAt: "desc" },
        take: 20
      }),
      prisma.rewardEvent.findMany({
        where: {
          studentId,
          OR: [{ reason: variantChallengeRewardReason }, { reason: prerequisiteConsolidationRewardReason }]
        },
        select: { reason: true }
      })
    ]);
    if (!paths.length) return [];
    const completedRewardReasons = new Set(nextActionRewards.map((reward) => reward.reason));

    const questionIds = Array.from(new Set(paths.map((path) => path.sourceQuestionId)));
    const questions = await prisma.question.findMany({
      where: {
        id: { in: questionIds },
        auditStatus: "published"
      },
      include: { knowledgeLinks: true }
    });
    const questionMap = new Map(questions.map((question) => [question.id, question]));

    return paths
      .map((path): StudentReviewTask | null => {
        const question = questionMap.get(path.sourceQuestionId);
        if (!question) return null;
        const status = path.status.startsWith("completed_review:") ? "completed" : "assigned";
        const teacherId = path.status.split(":")[1];
        const knowledgePointId =
          path.targetKnowledgePointId !== "unlinked"
            ? path.targetKnowledgePointId
            : question.knowledgeLinks.find((link) => link.linkType === "primary")?.knowledgePointId ?? "";
        return {
          id: path.id,
          questionId: question.id,
          stem: question.stem,
          knowledgePointId,
          knowledgePointName: knowledgePointId ? getKnowledgePointName(knowledgePointId) : "相关知识点",
          status,
          assignedAt: path.createdAt.toISOString(),
          completedAt: path.completedAt?.toISOString(),
          teacherId,
          reviewNote: path.studentReviewNote ?? undefined,
          reminderCount: path.reviewReminderCount,
          lastReminderAt: path.lastReviewReminderAt?.toISOString(),
          retestQuestionId: path.retestQuestionId ?? undefined,
          retestIsCorrect: path.retestIsCorrect ?? undefined,
          retestCompletedAt: path.retestCompletedAt?.toISOString(),
          nextAction: buildReviewTaskNextAction(status, path.retestCompletedAt, path.retestIsCorrect, knowledgePointId, completedRewardReasons),
          encouragement:
            status === "completed"
              ? path.retestCompletedAt
                ? path.retestIsCorrect
                  ? "复盘后的同类题已经做对，说明这个知识点正在迁移成功。"
                  : "复盘后的同类题还需要再稳一稳，先回看笔记里的关键条件。"
                : "这道错题已经完成复盘，可以找一道同类题确认迁移能力。"
              : path.reviewReminderCount > 0
                ? "老师提醒你优先完成这道错题复盘。先写出错因，再做同类题确认。"
              : "先回看错因和知识点，再用自己的话说出关键步骤。"
        };
      })
      .filter((task): task is StudentReviewTask => Boolean(task));
  }

  async completeStudentReviewTask(studentId: string, taskId: string, reviewNote?: string) {
    const prisma = getPrismaClient();
    const task = await prisma.remediationPath.findFirst({
      where: {
        id: taskId,
        studentId,
        status: { startsWith: "assigned_review:" }
      }
    });
    if (!task) return null;

    const teacherId = task.status.split(":")[1] ?? "teacher";
    await prisma.remediationPath.update({
      where: { id: task.id },
      data: {
        status: `completed_review:${teacherId}`,
        studentReviewNote: sanitizeReviewNote(reviewNote),
        completedAt: new Date()
      }
    });

    const reward = createReviewCompletedReward();
    await prisma.rewardEvent.create({
      data: {
        studentId,
        eventType: reward.eventType,
        xp: reward.xp,
        gems: reward.gems,
        reason: reward.reason
      }
    });

    const tasks = await this.getStudentReviewTasks(studentId);
    const matchedTask = tasks.find((item) => item.id === taskId);
    if (!matchedTask) return null;
    return {
      task: matchedTask,
      reward: { xp: reward.xp, gems: reward.gems, reason: reward.reason }
    };
  }

  async selectCoreLiteracyGoal(
    studentId: string,
    literacyTag: string,
    options: { periodType?: "weekly"; action?: "start" | "reopen" } = {}
  ) {
    if (!coreLiteracyTagKeys.includes(literacyTag)) return null;
    const prisma = getPrismaClient();
    const period = buildGoalPeriod(options.action === "reopen" ? "next" : "current");
    const existingGoal = await prisma.studentLearningGoal.findUnique({
      where: {
        studentId_goalType_targetKey_periodType_periodKey: {
          studentId,
          goalType: coreLiteracyGoalType,
          targetKey: literacyTag,
          periodType: period.periodType,
          periodKey: period.periodKey
        }
      }
    });
    if (existingGoal?.status === "completed" && options.action !== "reopen") {
      const report = await this.getStudentReport(studentId);
      return report.coreLiteracyGoals.find((goal) => goal.literacyTag === literacyTag) ?? null;
    }
    const reopenedFromGoal =
      options.action === "reopen"
        ? await prisma.studentLearningGoal.findFirst({
            where: { studentId, goalType: coreLiteracyGoalType, targetKey: literacyTag, status: "completed" },
            orderBy: { completedAt: "desc" }
          })
        : null;
    await prisma.studentLearningGoal.updateMany({
      where: { studentId, goalType: coreLiteracyGoalType, status: "active" },
      data: { status: "paused" }
    });
    await prisma.studentLearningGoal.upsert({
      where: {
        studentId_goalType_targetKey_periodType_periodKey: {
          studentId,
          goalType: coreLiteracyGoalType,
          targetKey: literacyTag,
          periodType: period.periodType,
          periodKey: period.periodKey
        }
      },
      create: {
        studentId,
        goalType: coreLiteracyGoalType,
        targetKey: literacyTag,
        periodType: period.periodType,
        periodKey: period.periodKey,
        startedAt: period.startedAt,
        dueAt: period.dueAt,
        reopenedFromGoalId: reopenedFromGoal?.id,
        status: "active"
      },
      update: {
        status: "active",
        startedAt: period.startedAt,
        dueAt: period.dueAt,
        completedAt: null,
        completionSnapshot: Prisma.JsonNull,
        rewardEventId: null
      }
    });
    const report = await this.getStudentReport(studentId);
    return report.coreLiteracyGoals.find((goal) => goal.literacyTag === literacyTag) ?? null;
  }

  async listCoreLiteracyGoalHistory(studentId: string, filters: CoreLiteracyGoalHistoryFilters = {}) {
    const prisma = getPrismaClient();
    const statusFilter = filters.status && filters.status !== "all" ? filters.status : undefined;
    const rows = await prisma.studentLearningGoal.findMany({
      where: {
        studentId,
        goalType: coreLiteracyGoalType,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(filters.literacyTag ? { targetKey: filters.literacyTag } : {}),
        ...(filters.periodType ? { periodType: filters.periodType } : {}),
        ...(filters.from || filters.to
          ? {
              startedAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {})
              }
            }
          : {})
      },
      orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
      take: Math.min(Math.max(filters.limit ?? 20, 1), 50)
    });
    return buildCoreLiteracyGoalHistory(rows);
  }
}

function describeGrowth(score: number) {
  if (score >= 80) return "本周持续完成补救和复盘，成长很稳。";
  if (score >= 30) return "已经有明显学习积累，继续补清断点。";
  return "刚开始建立学习节奏。";
}

function buildEncouragement(totalAnswers: number, correctAnswers: number, remediationCount: number) {
  if (totalAnswers === 0) return "完成第一道诊断题后，系统会开始形成你的学习画像。";
  if (remediationCount > 0) return "你已经开始补清前置知识，这比单纯刷对题更有价值。";
  if (correctAnswers === totalAnswers) return "目前正确率很亮眼，下一步可以挑战更综合的题。";
  return "每一次定位断点，都是把知识网补牢的一步。";
}

function buildNextStepHints(totalAnswers: number, weakKnowledgePointIds: string[], remediationCount: number, reviewTasks: StudentReviewTask[] = []) {
  const assignedTasks = reviewTasks.filter((task) => task.status === "assigned");
  const needsConsolidationTasks = reviewTasks.filter((task) => task.nextAction?.actionType === "revisit_prerequisite");
  const challengeTasks = reviewTasks.filter((task) => task.nextAction?.actionType === "challenge_variant");
  if (assignedTasks.length > 0) return [`先完成老师布置的 ${assignedTasks.length} 个错题复盘任务。`, "复盘后再做同知识点题目确认迁移。"];
  if (needsConsolidationTasks.length > 0) return ["先回到复测提示的前置知识点，补清关键条件后再做短题确认。"];
  if (challengeTasks.length > 0) return ["选择一条已迁移成功的复盘记录，继续挑战一道变式题。"];
  if (totalAnswers === 0) return ["先完成 1 道当前知识点诊断题。"];
  if (weakKnowledgePointIds.length > 0) {
    return [
      `优先回看薄弱知识点：${weakKnowledgePointIds.join("、")}。`,
      "先补前置知识，再回到原题型复测。"
    ];
  }
  if (remediationCount > 0) return ["完成补救后，做 1 道同类题确认已经从“难”到“会”。"];
  return ["保持当前节奏，尝试一道综合应用题。"];
}

function buildTodayTasks(reviewTasks: StudentReviewTask[]) {
  return reviewTasks
    .flatMap((task): StudentTaskCard[] => {
      if (task.status === "assigned") {
        return [
          {
            taskId: task.id,
            title: "完成错题复盘",
            detail: task.encouragement,
            knowledgePointName: task.knowledgePointName,
            actionType: "complete_review",
            status: "todo",
            ctaLabel: "写复盘笔记"
          }
        ];
      }
      if (task.nextAction?.status === "available") {
        return [
          {
            taskId: task.id,
            title: task.nextAction.title,
            detail: task.nextAction.detail,
            knowledgePointName: task.knowledgePointName,
            actionType: task.nextAction.actionType,
            status: "todo",
            ctaLabel: task.nextAction.actionType === "same_type_retest" ? "开始复测" : "开始任务"
          }
        ];
      }
      return [];
    })
    .slice(0, 5);
}

function buildCompletedTasks(reviewTasks: StudentReviewTask[]) {
  return reviewTasks
    .flatMap((task): StudentTaskCard[] => {
      if (task.nextAction?.status === "completed") {
        return [
          {
            taskId: task.id,
            title: task.nextAction.title,
            detail: task.nextAction.rewardText ?? task.nextAction.detail,
            knowledgePointName: task.knowledgePointName,
            actionType: task.nextAction.actionType,
            status: "done",
            ctaLabel: "已完成"
          }
        ];
      }
      if (task.status === "completed") {
        return [
          {
            taskId: task.id,
            title: "完成错题复盘",
            detail: task.reviewNote ? `复盘笔记：${task.reviewNote}` : "已经完成错题复盘，可以继续做同类题确认。",
            knowledgePointName: task.knowledgePointName,
            actionType: "complete_review",
            status: "done",
            ctaLabel: "已完成"
          }
        ];
      }
      return [];
    })
    .slice(0, 5);
}

function buildGrowthTimeline(
  rewardEvents: Array<{ eventType: string; xp: number; gems: number; reason: string; createdAt: Date }>
): StudentGrowthTimelineItem[] {
  return rewardEvents.map((event) => ({
    eventType: event.eventType,
    label: rewardEventText(event.eventType),
    xp: event.xp,
    gems: event.gems,
    reason: event.reason,
    createdAt: event.createdAt.toISOString()
  }));
}

function buildWeeklyGrowthSummary(
  rewardEvents: Array<{ eventType: string; xp: number; gems: number; reason: string; createdAt: Date }>,
  windowDays = 7
): StudentWeeklyGrowthSummary {
  const since = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const weeklyEvents = rewardEvents.filter((event) => event.createdAt.getTime() >= since);
  const xp = weeklyEvents.reduce((total, event) => total + event.xp, 0);
  const gems = weeklyEvents.reduce((total, event) => total + event.gems, 0);
  const completedReviewCount = weeklyEvents.filter((event) => event.eventType === "review_completed").length;
  const remediationCount = weeklyEvents.filter((event) => event.eventType === "remediation_completed").length;
  const breakthroughCount = weeklyEvents.filter((event) => event.eventType === "breakthrough").length;
  const literacyProgressCount = weeklyEvents.filter((event) => event.eventType === "literacy_progress").length;

  return {
    windowDays,
    xp,
    gems,
    rewardCount: weeklyEvents.length,
    completedReviewCount,
    remediationCount,
    breakthroughCount,
    literacyProgressCount,
    consistencyText: buildWeeklyConsistencyText(weeklyEvents.length, completedReviewCount, remediationCount, breakthroughCount),
    suggestion: buildWeeklyGrowthSuggestion(weeklyEvents.length, completedReviewCount, remediationCount, breakthroughCount)
  };
}

function buildWeeklyConsistencyText(rewardCount: number, reviewCount: number, remediationCount: number, breakthroughCount: number) {
  if (rewardCount === 0) return "本周完成一次补救或复盘后，这里会出现成长摘要。";
  if (breakthroughCount > 0) return "本周已经出现“从难到会”的突破记录。";
  if (reviewCount > 0 && remediationCount > 0) return "本周既有错题复盘，也有前置知识巩固。";
  if (reviewCount > 0) return "本周复盘节奏已经启动。";
  if (remediationCount > 0) return "本周正在把前置知识补得更稳。";
  return "本周已经开始积累成长积分。";
}

function buildWeeklyGrowthSuggestion(rewardCount: number, reviewCount: number, remediationCount: number, breakthroughCount: number) {
  if (rewardCount === 0) return "先完成一条老师任务或一条错后补救，让系统记录你的本周成长。";
  if (breakthroughCount > 0) return "可以挑一道相近情境的题再练一次，把这次突破固定下来。";
  if (reviewCount > 0) return "复盘后记得做同类题复测，确认自己能把方法迁移出来。";
  if (remediationCount > 0) return "补清前置知识后，回到原知识点做一道短题确认。";
  return "保持当前节奏，再补一条复盘或前置知识，成长会更清楚。";
}

function buildCoreLiteracyGrowth(answers: any[]): StudentCoreLiteracyGrowthItem[] {
  const grouped = new Map<string, { answerCount: number; correctCount: number }>();
  for (const answer of answers) {
    const tags = answer.question?.literacyLinks?.map((link: any) => String(link.literacyTag)).filter(Boolean) ?? [];
    for (const tag of tags.length ? tags : ["evidence_model"]) {
      const current = grouped.get(tag) ?? { answerCount: 0, correctCount: 0 };
      current.answerCount += 1;
      if (answer.isCorrect) current.correctCount += 1;
      grouped.set(tag, current);
    }
  }

  return Array.from(grouped.entries())
    .map(([literacyTag, stats]) => {
      const accuracy = stats.answerCount ? Math.round((stats.correctCount / stats.answerCount) * 100) : 0;
      const growthLevel = buildCoreLiteracyLevel(stats.answerCount, accuracy);
      return {
        literacyTag,
        label: coreLiteracyText(literacyTag),
        answerCount: stats.answerCount,
        correctCount: stats.correctCount,
        accuracy,
        growthLevel,
        encouragement: buildCoreLiteracyEncouragement(literacyTag, growthLevel),
        nextAction: buildCoreLiteracyNextAction(literacyTag, growthLevel)
      };
    })
    .sort((a, b) => b.answerCount - a.answerCount || b.accuracy - a.accuracy)
    .slice(0, 5);
}

function buildCoreLiteracyLevel(answerCount: number, accuracy: number): StudentCoreLiteracyGrowthItem["growthLevel"] {
  if (answerCount >= 3 && accuracy >= 75) return "steady";
  if (answerCount >= 2 || accuracy >= 50) return "building";
  return "starting";
}

function buildCoreLiteracyEncouragement(literacyTag: string, level: StudentCoreLiteracyGrowthItem["growthLevel"]) {
  const label = coreLiteracyText(literacyTag);
  if (level === "steady") return `「${label}」已经有稳定表现，可以尝试更综合的真实情境题。`;
  if (level === "building") return `「${label}」正在积累，多说清证据和步骤，进步会更明显。`;
  return `「${label}」刚开始留下记录，先用一道典型题把方法走完整。`;
}

function buildCoreLiteracyNextAction(literacyTag: string, level: StudentCoreLiteracyGrowthItem["growthLevel"]) {
  if (level === "steady") return "挑战一道变式题，练习把已有方法迁移到新情境。";
  const map: Record<string, string> = {
    macro_micro: "做题时先写宏观现象，再补一句微观粒子变化。",
    change_balance: "先标出变化前后，再检查守恒或平衡条件。",
    evidence_model: "先圈出题干证据，再说模型和结论。",
    inquiry_innovation: "按目的、变量、现象、结论四步整理实验题。",
    attitude_responsibility: "把安全、环保或社会责任判断写成一句理由。"
  };
  return map[literacyTag] ?? "先说清题干证据，再写出你的判断依据。";
}

function coreLiteracyText(tag: string) {
  const map: Record<string, string> = {
    macro_micro: "宏观辨识与微观探析",
    change_balance: "变化观念与平衡思想",
    evidence_model: "证据推理与模型认知",
    inquiry_innovation: "科学探究与创新意识",
    attitude_responsibility: "科学态度与社会责任"
  };
  return map[tag] ?? tag;
}

function rewardEventText(eventType: string) {
  const map: Record<string, string> = {
    question_correct: "基础作答",
    remediation_completed: "补清前置知识",
    review_completed: "完成错题复盘",
    breakthrough: "从难到会突破",
    literacy_progress: "核心素养进步",
    streak: "连续学习"
  };
  return map[eventType] ?? "成长记录";
}

function buildWeeklyReviewCards(weeklySummary: StudentWeeklyGrowthSummary, reviewTasks: StudentReviewTask[]): StudentWeeklyReviewCard[] {
  return [
    {
      cardId: "review",
      title: "复盘推进",
      focus: "把错题变成下一次会做的路径",
      evidenceText:
        weeklySummary.completedReviewCount > 0
          ? `本周完成 ${weeklySummary.completedReviewCount} 次错题复盘。`
          : "本周先完成 1 条错题复盘，成长轨迹会更清楚。",
      ctaLabel: reviewTasks.some((task) => task.status === "assigned") ? "去写复盘笔记" : "保持复盘节奏"
    },
    {
      cardId: "remediation",
      title: "前置补清",
      focus: "先补关键概念，再回到原题型",
      evidenceText:
        weeklySummary.remediationCount > 0
          ? `本周完成 ${weeklySummary.remediationCount} 次前置知识巩固。`
          : "遇到卡点时，先补前置知识会比硬刷更稳。",
      ctaLabel: "查看今日任务"
    },
    {
      cardId: "breakthrough",
      title: "从难到会",
      focus: "用变式题确认方法能迁移",
      evidenceText:
        weeklySummary.breakthroughCount > 0
          ? `本周已经有 ${weeklySummary.breakthroughCount} 次突破记录。`
          : "完成同类题复测后，可以挑战一题变式题。",
      ctaLabel: weeklySummary.breakthroughCount > 0 ? "巩固突破" : "准备挑战"
    }
  ];
}

function buildCoreLiteracyGoals(
  growthItems: StudentCoreLiteracyGrowthItem[],
  storedGoals: Array<{ targetKey: string; status: string; periodType?: string; periodKey?: string; completedAt?: Date | null }>
): StudentCoreLiteracyGoal[] {
  const selectedKeys = new Set(storedGoals.filter((goal) => goal.status === "active").map((goal) => goal.targetKey));
  const activeGoalMap = new Map(storedGoals.filter((goal) => goal.status === "active").map((goal) => [goal.targetKey, goal]));
  const completedGoalMap = new Map(storedGoals.filter((goal) => goal.status === "completed").map((goal) => [goal.targetKey, goal]));
  const growthMap = new Map(growthItems.map((item) => [item.literacyTag, item]));
  const orderedKeys = [
    ...growthItems.map((item) => item.literacyTag),
    ...coreLiteracyTagKeys.filter((key) => !growthItems.some((item) => item.literacyTag === key))
  ];

  return orderedKeys.slice(0, 5).map((literacyTag) => {
    const growth = growthMap.get(literacyTag);
    const label = coreLiteracyText(literacyTag);
    const selected = selectedKeys.has(literacyTag);
    const activeGoal = activeGoalMap.get(literacyTag);
    const completedGoal = completedGoalMap.get(literacyTag);
    const completed = !selected && Boolean(completedGoal);
    return {
      literacyTag,
      label,
      selected,
      status: completed ? "completed" : selected ? "selected" : "available",
      periodType: activeGoal?.periodType ?? completedGoal?.periodType ?? "weekly",
      periodKey: activeGoal?.periodKey ?? completedGoal?.periodKey ?? "",
      targetText: completed ? `已完成目标：围绕「${label}」留下了清晰的作答证据。` : `本周目标：围绕「${label}」完成 2 次有证据的表达。`,
      progressText: completed
        ? `目标已完成${completedGoal?.completedAt ? `，完成时间：${completedGoal.completedAt.toLocaleString("zh-CN")}` : "。"}`
        : growth
          ? `已有 ${growth.answerCount} 次相关作答，稳定作答 ${growth.correctCount} 次。`
          : "选择后，系统会从后续作答中记录这个能力维度。",
      nextAction: growth?.nextAction ?? buildCoreLiteracyNextAction(literacyTag, "starting"),
      completedAt: completedGoal?.completedAt?.toISOString(),
      rewardText: completed ? "已获得核心素养进步奖励" : undefined
    };
  });
}

function buildCoreLiteracyGoalRecommendation(
  growthItems: StudentCoreLiteracyGrowthItem[],
  storedGoals: Array<{ targetKey: string; status: string }>
): StudentCoreLiteracyGoalRecommendation | undefined {
  const activeGoal = storedGoals.find((goal) => goal.status === "active");
  if (activeGoal) {
    const label = coreLiteracyText(activeGoal.targetKey);
    return {
      literacyTag: activeGoal.targetKey,
      label,
      reason: `建议继续完成「${label}」目标，系统会优先看你开始目标后的稳定作答证据。`,
      ctaLabel: "继续当前目标"
    };
  }

  const completedKeys = new Set(storedGoals.filter((goal) => goal.status === "completed").map((goal) => goal.targetKey));
  const growthCandidate = growthItems.find((item) => item.growthLevel !== "steady" && !completedKeys.has(item.literacyTag));
  const literacyTag = growthCandidate?.literacyTag ?? coreLiteracyTagKeys.find((key) => !completedKeys.has(key)) ?? coreLiteracyTagKeys[0];
  const label = coreLiteracyText(literacyTag);
  const reason = growthCandidate
    ? `「${label}」已有作答记录，适合把零散表现推进成一个阶段目标。`
    : `可以先从「${label}」开始，练习把题干证据和结论说清楚。`;
  return {
    literacyTag,
    label,
    reason,
    ctaLabel: "设为推荐目标"
  };
}

function buildGoalPeriod(offset: "current" | "next" = "current") {
  const today = new Date();
  const start = startOfIsoWeek(today);
  if (offset === "next") {
    start.setDate(start.getDate() + 7);
  }
  start.setHours(0, 0, 0, 0);
  const dueAt = new Date(start);
  dueAt.setDate(dueAt.getDate() + 6);
  dueAt.setHours(23, 59, 59, 999);
  return {
    periodType: "weekly",
    periodKey: `${start.getFullYear()}-W${String(getIsoWeek(start)).padStart(2, "0")}`,
    startedAt: offset === "current" ? today : start,
    dueAt
  };
}

function startOfIsoWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function getIsoWeek(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

async function completeEligibleCoreLiteracyGoals(
  studentId: string,
  storedGoals: Array<{ id: string; targetKey: string; status: string; startedAt: Date; periodType: string; periodKey: string; rewardEventId?: string | null }>,
  answers: Array<{
    questionId: string;
    isCorrect: boolean;
    startedAt: Date;
    submittedAt: Date;
    timeAssessment?: string | null;
    behaviorSignal?: string | null;
    question?: { auditStatus?: string; literacyLinks?: Array<{ literacyTag: string }> } | null;
  }>
) {
  const activeGoals = storedGoals.filter((goal) => goal.status === "active");
  if (!activeGoals.length) return 0;

  const prisma = getPrismaClient();
  let completedCount = 0;
  for (const goal of activeGoals) {
    const progress = summarizeCoreLiteracyGoalProgress(goal.targetKey, goal.startedAt, answers);
    if (!isCoreLiteracyGoalReady(progress)) continue;
    const label = coreLiteracyText(goal.targetKey);
    const reward = createCoreLiteracyGoalReward(label);
    const completedAt = new Date();
    await prisma.$transaction(async (tx) => {
      const updated = await tx.studentLearningGoal.updateMany({
        where: { id: goal.id, status: "active", rewardEventId: null },
        data: {
          status: "completed",
          completedAt,
          completionSnapshot: {
            periodType: goal.periodType,
            periodKey: goal.periodKey,
            evidenceQuestionIds: progress.evidenceQuestionIds,
            answerCount: progress.answerCount,
            correctCount: progress.correctCount,
            stableAnswerCount: progress.stableAnswerCount,
            distinctQuestionCount: progress.distinctQuestionCount
          }
        }
      });
      if (updated.count === 0) return;
      const rewardRecord = await tx.rewardEvent.create({
        data: {
          studentId,
          eventType: reward.eventType,
          xp: reward.xp,
          gems: reward.gems,
          reason: reward.reason
        }
      });
      await tx.studentLearningGoal.update({
        where: { id: goal.id },
        data: { rewardEventId: rewardRecord.id }
      });
      completedCount += 1;
    });
  }
  return completedCount;
}

function summarizeCoreLiteracyGoalProgress(
  literacyTag: string,
  selectedAt: Date,
  answers: Array<{
    questionId: string;
    isCorrect: boolean;
    startedAt: Date;
    submittedAt: Date;
    timeAssessment?: string | null;
    behaviorSignal?: string | null;
    question?: { auditStatus?: string; literacyLinks?: Array<{ literacyTag: string }> } | null;
  }>
) {
  const evidenceQuestionIds = new Set<string>();
  let answerCount = 0;
  let correctCount = 0;
  let stableAnswerCount = 0;
  for (const answer of answers) {
    const tags = answer.question?.literacyLinks?.map((link) => String(link.literacyTag)).filter(Boolean) ?? [];
    const usesPublishedQuestion = answer.question?.auditStatus === "published";
    const isStableEvidence = answer.timeAssessment !== "too_fast" && answer.behaviorSignal !== "possible_guessing";
    if (answer.startedAt < selectedAt || !usesPublishedQuestion || !tags.includes(literacyTag) || !isStableEvidence) continue;
    answerCount += 1;
    stableAnswerCount += 1;
    if (answer.isCorrect) correctCount += 1;
    evidenceQuestionIds.add(answer.questionId);
  }
  return {
    answerCount,
    correctCount,
    stableAnswerCount,
    distinctQuestionCount: evidenceQuestionIds.size,
    evidenceQuestionIds: Array.from(evidenceQuestionIds)
  };
}

function isCoreLiteracyGoalReady(progress: { correctCount: number; stableAnswerCount: number; distinctQuestionCount: number }) {
  return progress.distinctQuestionCount >= 2 && progress.stableAnswerCount >= 1 && progress.correctCount >= 1;
}

function buildCoreLiteracyGoalHistory(
  storedGoals: Array<{
    id?: string;
    targetKey: string;
    status: string;
    periodType?: string;
    periodKey?: string;
    startedAt?: Date | null;
    dueAt?: Date | null;
    completedAt?: Date | null;
  }>
): StudentCoreLiteracyGoalHistoryItem[] {
  return storedGoals
    .sort((a, b) => (b.completedAt?.getTime() ?? b.startedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? a.startedAt?.getTime() ?? 0))
    .map((goal) => {
      const label = coreLiteracyText(goal.targetKey);
      const status: StudentCoreLiteracyGoalHistoryItem["status"] =
        goal.status === "active" || goal.status === "paused" || goal.status === "completed" ? goal.status : "paused";
      return {
        goalId: goal.id,
        literacyTag: goal.targetKey,
        label,
        status,
        periodType: goal.periodType ?? "weekly",
        periodKey: goal.periodKey ?? "legacy",
        startedAt: goal.startedAt?.toISOString(),
        dueAt: goal.dueAt?.toISOString(),
        completedAt: goal.completedAt?.toISOString(),
        rewardText:
          status === "completed"
            ? `完成「${label}」目标，获得核心素养进步奖励。`
            : status === "active"
              ? `「${label}」目标正在进行。`
              : `「${label}」目标已保存到历史，可在后续周期重新开启。`
      };
    })
    .slice(0, 5);
}

function buildMilestoneBadges(
  weeklySummary: StudentWeeklyGrowthSummary,
  rewardEvents: Array<{ eventType: string; createdAt: Date }>,
  totalAnswers: number
): StudentMilestoneBadge[] {
  const firstReviewAt = rewardEvents.find((event) => event.eventType === "review_completed")?.createdAt;
  const firstBreakthroughAt = rewardEvents.find((event) => event.eventType === "breakthrough")?.createdAt;
  const latestGrowthAt = rewardEvents[0]?.createdAt;
  return [
    {
      badgeId: "first_review",
      title: "复盘启动",
      description: "完成第一条错题复盘，开始把错因变成方法。",
      unlocked: weeklySummary.completedReviewCount > 0,
      progressText: weeklySummary.completedReviewCount > 0 ? "已完成错题复盘。" : "完成 1 条老师复盘任务即可点亮。",
      unlockedAt: firstReviewAt?.toISOString()
    },
    {
      badgeId: "weekly_growth",
      title: "本周成长",
      description: "本周通过复盘、补救或突破留下成长记录。",
      unlocked: weeklySummary.rewardCount >= 3 || weeklySummary.xp >= 30,
      progressText:
        weeklySummary.rewardCount >= 3 || weeklySummary.xp >= 30
          ? `本周已积累 ${weeklySummary.xp} XP。`
          : `本周已有 ${weeklySummary.rewardCount} 条成长记录，继续补一条会更完整。`,
      unlockedAt: latestGrowthAt?.toISOString()
    },
    {
      badgeId: "breakthrough",
      title: "变式突破",
      description: "完成一次从同类题到变式题的迁移。",
      unlocked: weeklySummary.breakthroughCount > 0,
      progressText: weeklySummary.breakthroughCount > 0 ? "已经完成变式挑战。" : "同类题复测成功后，挑战变式题即可点亮。",
      unlockedAt: firstBreakthroughAt?.toISOString()
    },
    {
      badgeId: "steady_start",
      title: "诊断起步",
      description: "完成多次真题式诊断，让系统更了解你的知识图谱。",
      unlocked: totalAnswers >= 5,
      progressText: totalAnswers >= 5 ? `已完成 ${totalAnswers} 次作答。` : `已完成 ${totalAnswers}/5 次作答。`,
      unlockedAt: totalAnswers >= 5 ? latestGrowthAt?.toISOString() : undefined
    }
  ];
}

function buildReviewTaskNextAction(
  status: "assigned" | "completed",
  retestCompletedAt: Date | null,
  retestIsCorrect: boolean | null,
  knowledgePointId: string,
  completedRewardReasons: Set<string> = new Set()
): StudentReviewTask["nextAction"] {
  if (retestCompletedAt && retestIsCorrect === true) {
    const completed = completedRewardReasons.has(variantChallengeRewardReason);
    return {
      actionType: "challenge_variant",
      title: "进入变式题挑战",
      detail: "同类题已经迁移成功，可以尝试一道变式题，把方法用到新情境。",
      targetKnowledgePointId: knowledgePointId,
      status: completed ? "completed" : "available",
      rewardText: completed ? "变式挑战奖励已领取" : "挑战成功可获得突破奖励"
    };
  }
  if (retestCompletedAt && retestIsCorrect === false) {
    const completed = completedRewardReasons.has(prerequisiteConsolidationRewardReason);
    return {
      actionType: "revisit_prerequisite",
      title: "再补一个前置知识点",
      detail: "先回看复盘笔记里的关键条件，再补一道基础题巩固。",
      targetKnowledgePointId: knowledgePointId,
      status: completed ? "completed" : "available",
      rewardText: completed ? "前置巩固奖励已领取" : "巩固成功可获得补救奖励"
    };
  }
  if (status === "completed") {
    return {
      actionType: "same_type_retest",
      title: "做一题同类题复测",
      detail: "复盘已经完成，接下来用一题同类题确认是否真正会迁移。",
      targetKnowledgePointId: knowledgePointId,
      status: "available",
      rewardText: "先完成同类题复测，再进入下一步任务"
    };
  }
  return undefined;
}

const variantChallengeRewardReason = "完成变式题挑战，把方法迁移到新情境";
const prerequisiteConsolidationRewardReason = "完成前置知识巩固，把关键条件补得更稳";
const coreLiteracyGoalType = "core_literacy";
const coreLiteracyTagKeys = ["macro_micro", "change_balance", "evidence_model", "inquiry_innovation", "attitude_responsibility"];

function sanitizeReviewNote(value?: string) {
  const note = value?.trim();
  if (!note) return undefined;
  return note.slice(0, 240);
}

function getKnowledgePointName(knowledgePointId: string) {
  return knowledgePointId || "相关知识点";
}

export const learningStatsRepository: LearningStatsRepository = hasDatabaseUrl()
  ? new PrismaLearningStatsRepository()
  : new MemoryLearningStatsRepository();
