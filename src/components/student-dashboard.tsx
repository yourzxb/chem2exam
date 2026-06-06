"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { assessTime } from "@/domain/assessment";
import { recommendRemediation } from "@/domain/remediation";
import { createRemediationReward } from "@/domain/rewards";
import type {
  CoreLiteracy,
  Difficulty,
  DifficultyFeedback,
  Grade,
  KnowledgePoint,
  KnowledgeRelation,
  KnowledgeStatus,
  LeaderboardEntry,
  Question,
  RewardEvent
} from "@/domain/types";
import {
  grades,
  knowledgePoints as seedKnowledgePoints,
  knowledgeRelations as seedKnowledgeRelations
} from "@/data/chemistry-seed";
import { Badge, Card, ProgressRing, StatCard } from "@/components/ui";
import { ChemBuddy, KnowledgePathIllustration, MoleculePath, RewardBadge, RewardBurst } from "@/components/visuals";

const demoStudentAccount = {
  username: "demo_student_01",
  password: "Chem2Exam@2026"
};

interface ProgressState {
  [knowledgePointId: string]: KnowledgeStatus;
}

interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  role: "student" | "teacher" | "admin";
}

type AvatarMood = "idle" | "correct" | "wrong" | "review" | "goal";

interface AnswerSubmitResponse {
  isCorrect: boolean;
  answer: string;
  analysis: string;
  durationSeconds: number;
  timeAssessment: ReturnType<typeof assessTime>;
  studentFeedback: string;
  encouragement: string;
  remediation: {
    needed: boolean;
    targetKnowledgePointId?: string;
    pathText?: string;
    reason?: string;
    keyHint?: string;
  };
  reward: RewardEvent | null;
  retest?: {
    reviewTaskId: string;
    recorded: boolean;
    isCorrect: boolean;
    nextAction: ReviewNextAction;
    nextActionReward?: RewardEvent | null;
  };
}

interface ReviewNextAction {
  actionType: "challenge_variant" | "revisit_prerequisite" | "retry_foundation" | "same_type_retest";
  title: string;
  detail: string;
  targetKnowledgePointId?: string;
  status: "available" | "completed";
  rewardText?: string;
}

interface StudentLearningReport {
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  totalXp: number;
  totalGems: number;
  remediationCount: number;
  thoughtfulCount: number;
  weakKnowledgePointIds: string[];
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

interface StudentTaskCard {
  taskId: string;
  title: string;
  detail: string;
  knowledgePointName: string;
  actionType: "complete_review" | "same_type_retest" | "challenge_variant" | "revisit_prerequisite" | "retry_foundation";
  status: "todo" | "done";
  ctaLabel: string;
}

interface StudentGrowthTimelineItem {
  eventType: string;
  label: string;
  xp: number;
  gems: number;
  reason: string;
  createdAt: string;
}

interface StudentWeeklyGrowthSummary {
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

interface StudentWeeklyReviewCard {
  cardId: string;
  title: string;
  focus: string;
  evidenceText: string;
  ctaLabel: string;
}

interface StudentCoreLiteracyGrowthItem {
  literacyTag: string;
  label: string;
  answerCount: number;
  correctCount: number;
  accuracy: number;
  growthLevel: "starting" | "building" | "steady";
  encouragement: string;
  nextAction: string;
}

interface StudentCoreLiteracyGoal {
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

interface StudentCoreLiteracyGoalHistoryItem {
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

interface StudentCoreLiteracyGoalRecommendation {
  literacyTag: string;
  label: string;
  reason: string;
  ctaLabel: string;
}

interface StudentMilestoneBadge {
  badgeId: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressText: string;
  unlockedAt?: string;
}

interface StudentReviewTask {
  id: string;
  questionId: string;
  stem: string;
  knowledgePointId: string;
  knowledgePointName: string;
  status: "assigned" | "completed";
  assignedAt: string;
  completedAt?: string;
  reviewNote?: string;
  reminderCount: number;
  lastReminderAt?: string;
  retestQuestionId?: string;
  retestIsCorrect?: boolean;
  retestCompletedAt?: string;
  nextAction?: ReviewNextAction;
  encouragement: string;
}

interface KnowledgeGraphResponse {
  grade: Grade;
  versionId: string;
  nodes: KnowledgePoint[];
  relations: KnowledgeRelation[];
}

interface StudentPracticeQuestion {
  id: string;
  grade?: Grade;
  stem: string;
  options: Question["options"];
  difficulty: Difficulty;
  medianTimeSeconds: number;
  primaryKnowledgePointId?: string;
  prerequisiteKnowledgePointIds?: string[];
  coreLiteracy?: CoreLiteracy[];
  abilityTarget?: string;
}

export function StudentDashboard() {
  const [grade, setGrade] = useState<Grade>("初三");
  const [graphPoints, setGraphPoints] = useState<KnowledgePoint[]>([]);
  const [graphRelations, setGraphRelations] = useState<KnowledgeRelation[]>([]);
  const [graphVersionId, setGraphVersionId] = useState("");
  const [isGraphLoading, setIsGraphLoading] = useState(true);
  const gradePoints = useMemo(
    () => (graphPoints.length ? graphPoints : seedKnowledgePoints.filter((point) => point.grade === grade)),
    [graphPoints, grade]
  );
  const gradeRelations = graphRelations.length ? graphRelations : seedKnowledgeRelations;
  const [currentPointId, setCurrentPointId] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [difficultyFeedback, setDifficultyFeedback] = useState<DifficultyFeedback>("medium");
  const [feedback, setFeedback] = useState("选择一个知识点开始真题诊断。");
  const [remediationText, setRemediationText] = useState("");
  const [canStartRemediation, setCanStartRemediation] = useState(false);
  const [returnPointId, setReturnPointId] = useState<string | null>(null);
  const [rewardEvents, setRewardEvents] = useState<RewardEvent[]>([]);
  const [progress, setProgress] = useState<ProgressState>({});
  const [reportLines, setReportLines] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("登录后，系统会把答题记录、补救路径和奖励保存在你的学习档案里。");
  const [avatarMood, setAvatarMood] = useState<AvatarMood>("idle");
  const [avatarPulseKey, setAvatarPulseKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [learningReport, setLearningReport] = useState<StudentLearningReport | null>(null);
  const [reviewTaskMessage, setReviewTaskMessage] = useState("老师布置错题复盘后，会在这里显示。");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [activeRetestTaskId, setActiveRetestTaskId] = useState<string | null>(null);
  const [goalHistoryItems, setGoalHistoryItems] = useState<StudentCoreLiteracyGoalHistoryItem[]>([]);
  const [goalHistoryStatusFilter, setGoalHistoryStatusFilter] = useState("all");
  const [goalHistoryLiteracyFilter, setGoalHistoryLiteracyFilter] = useState("all");
  const [goalHistoryPeriodFilter, setGoalHistoryPeriodFilter] = useState("weekly");
  const [isFocusMode, setIsFocusMode] = useState(false);

  const currentPoint = gradePoints.find((point) => point.id === currentPointId) ?? gradePoints[0];
  const totalXp = learningReport?.totalXp ?? rewardEvents.reduce((total, event) => total + event.xp, 0);
  const totalGems = learningReport?.totalGems ?? rewardEvents.reduce((total, event) => total + event.gems, 0);
  const latestReward = rewardEvents[rewardEvents.length - 1] ?? null;
  const activeGrowthGoal =
    learningReport?.coreLiteracyGoals.find((goal) => goal.selected) ??
    learningReport?.coreLiteracyGoals.find((goal) => goal.status === "completed") ??
    null;
  const todayTaskTotal = (learningReport?.todayTasks.length ?? 0) + (learningReport?.completedTasks.length ?? 0);
  const todayTaskDone = learningReport?.completedTasks.length ?? 0;
  const todayTaskCompletion = todayTaskTotal > 0 ? Math.round((todayTaskDone / todayTaskTotal) * 100) : 0;
  const reportAccuracy = learningReport?.accuracy ?? 0;
  const remediationActiveStep = remediationText ? (returnPointId ? 2 : 1) : avatarMood === "correct" ? 2 : 0;

  useEffect(() => {
    void loadKnowledgeGraph(grade);
  }, [grade]);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { user?: CurrentUser } | null) => {
        if (data?.user) {
          setCurrentUser(data.user);
          setAuthMessage(`欢迎回来，${data.user.displayName}。`);
          void refreshStudentStats();
        }
      })
      .catch(() => {
        setAuthMessage("现在可以先体验诊断；登录后会保存个人学习记录。");
      });
    void refreshLeaderboard();
  }, []);

  useEffect(() => {
    if (!isFocusMode) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFocusMode(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocusMode]);

  async function loadKnowledgeGraph(nextGrade: Grade, preferredPointId?: string) {
    setIsGraphLoading(true);
    try {
      const response = await fetch(`/api/grades/${encodeURIComponent(nextGrade)}/knowledge-graph`);
      if (!response.ok) {
        throw new Error("GRAPH_LOAD_FAILED");
      }
      const graph = (await response.json()) as KnowledgeGraphResponse;
      const points = graph.nodes ?? [];
      setGraphPoints(points);
      setGraphRelations(graph.relations ?? []);
      setGraphVersionId(graph.versionId);
      const nextPointId = preferredPointId && points.some((point) => point.id === preferredPointId)
        ? preferredPointId
        : points[0]?.id ?? "";
      setCurrentPointId(nextPointId);
      await loadQuestionForPoint(nextGrade, nextPointId, points);
    } catch {
      const fallbackPoints = seedKnowledgePoints.filter((point) => point.grade === nextGrade);
      setGraphPoints(fallbackPoints);
      setGraphRelations(seedKnowledgeRelations);
      setGraphVersionId(`${nextGrade}-seed-fallback`);
      const nextPointId = preferredPointId && fallbackPoints.some((point) => point.id === preferredPointId)
        ? preferredPointId
        : fallbackPoints[0]?.id ?? "";
      setCurrentPointId(nextPointId);
      await loadQuestionForPoint(nextGrade, nextPointId, fallbackPoints);
      setFeedback("知识图谱接口暂时没有刷新成功，已先显示本地示例图谱。");
    } finally {
      setIsGraphLoading(false);
    }
  }

  async function loadQuestionForPoint(nextGrade: Grade, pointId: string, availablePoints = gradePoints) {
    if (!pointId) {
      setCurrentQuestion(null);
      return null;
    }

    const pointName = availablePoints.find((point) => point.id === pointId)?.name ?? "当前知识点";
    const response = await fetch(
      `/api/student/questions/next?grade=${encodeURIComponent(nextGrade)}&knowledgePointId=${encodeURIComponent(pointId)}`
    );
    if (!response.ok) {
      setCurrentQuestion(null);
      setFeedback(`「${pointName}」图谱节点已载入，但诊断题暂时没有读取成功。`);
      return null;
    }

    const data = (await response.json()) as { question: StudentPracticeQuestion | null };
    if (!data.question) {
      setCurrentQuestion(null);
      setFeedback(`「${pointName}」已在知识图谱中。当前还没有已发布诊断题，真题需要在审核端一审发布后才会出现在学生端。`);
      return null;
    }

    const question = toClientPracticeQuestion(data.question, nextGrade, pointId);
    setCurrentQuestion(question);
    return question;
  }

  function selectGrade(nextGrade: Grade) {
    setGrade(nextGrade);
    setGraphPoints([]);
    setGraphRelations([]);
    setGraphVersionId("");
    setCurrentPointId("");
    setCurrentQuestion(null);
    setFeedback("正在读取该年级的最新知识图谱。");
    setRemediationText("");
    setCanStartRemediation(false);
    setReturnPointId(null);
    setSelectedAnswer("");
    setStartedAt(Date.now());
    updateAvatarMood("idle");
  }

  async function selectPoint(pointId: string) {
    setCurrentPointId(pointId);
    setCurrentQuestion(null);
    setSelectedAnswer("");
    setRemediationText("");
    setCanStartRemediation(false);
    setReturnPointId(null);
    setFeedback(`正在准备「${gradePoints.find((point) => point.id === pointId)?.name ?? "知识点"}」的诊断题。`);
    setStartedAt(Date.now());
    updateAvatarMood("idle");
    await loadQuestionForPoint(grade, pointId);
  }

  function updateAvatarMood(mood: AvatarMood) {
    setAvatarMood(mood);
    setAvatarPulseKey((key) => key + 1);
  }

  async function submitAnswer() {
    if (!currentQuestion || !selectedAnswer || isSubmitting) return;

    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/student/answers/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedAnswer,
          durationSeconds,
          difficultyFeedback,
          startedAt: new Date(startedAt).toISOString(),
          reviewTaskId: activeRetestTaskId ?? undefined
        })
      });

      if (!response.ok) {
        throw new Error("SUBMIT_FAILED");
      }

      const result = (await response.json()) as AnswerSubmitResponse;

      if (result.isCorrect) {
        if (result.reward) {
          setRewardEvents((events) => [...events, result.reward as RewardEvent]);
        }
        updateAvatarMood("correct");
        setProgress((state) => ({ ...state, [currentQuestion.primaryKnowledgePointId]: "mastered" }));
        setFeedback(
          `${result.studentFeedback} ${result.encouragement}${
            result.reward ? ` 奖励：+${result.reward.xp} XP。` : ""
          }`
        );
        setRemediationText("");
        setCanStartRemediation(false);
        setReturnPointId(null);
        setReportLines((lines) => [
          ...lines,
          `你完成了「${currentPoint?.name ?? "当前知识点"}」诊断，用时 ${durationSeconds} 秒，时间表现为 ${assessmentText(
            result.timeAssessment
          )}。`
        ]);
        if (activeRetestTaskId) {
          if (result.retest?.nextActionReward) {
            setRewardEvents((events) => [...events, result.retest?.nextActionReward as RewardEvent]);
          }
          setReviewTaskMessage(
            result.retest?.nextAction
              ? `同类题复测已记录：${result.retest.nextAction.title}。${result.retest.nextAction.detail}${
                  result.retest.nextActionReward ? ` ${result.retest.nextActionReward.reason}，奖励 +${result.retest.nextActionReward.xp} XP。` : ""
                }`
              : "同类题复测已记录：这次迁移成功，老师端也能看到结果。"
          );
          setActiveRetestTaskId(null);
        }
        void refreshStudentStats();
        void refreshLeaderboard();
        return;
      }

      updateAvatarMood("wrong");
      setProgress((state) => ({ ...state, [currentQuestion.primaryKnowledgePointId]: "weak" }));
      setFeedback(`${result.studentFeedback} ${result.encouragement}`);
      setRemediationText(
        result.remediation.needed
          ? `${result.remediation.reason}\n${result.remediation.pathText}\n关键提示：${result.remediation.keyHint}`
          : "这个知识点已经是当前路径的基础节点，我们先做一组基础巩固题。"
      );
      setCanStartRemediation(result.remediation.needed);
      setReportLines((lines) => [...lines, `发现知识断点：${currentPoint?.name ?? "当前知识点"}。`]);
      if (activeRetestTaskId) {
        setReviewTaskMessage(
          result.retest?.nextAction
            ? `同类题复测已记录：${result.retest.nextAction.title}。${result.retest.nextAction.detail}`
            : "同类题复测已记录：这次还需要再稳一稳，先回到复盘笔记里的关键条件。"
        );
        if (result.retest?.nextAction.targetKnowledgePointId) {
          setCurrentPointId(result.retest.nextAction.targetKnowledgePointId);
        }
        setActiveRetestTaskId(null);
      }
      void refreshStudentStats();
      void refreshLeaderboard();
    } catch {
      setFeedback("这次提交没有成功。请稍后再试，已选择的答案还在。");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitAuthForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: authUsername, password: authPassword })
    });

    if (!response.ok) {
      setAuthMessage(authMode === "login" ? "账号或密码不匹配。" : "注册没有成功，请换一个用户名或检查密码长度。");
      return;
    }

    const data = (await response.json()) as { user: CurrentUser };
    setCurrentUser(data.user);
    setAuthUsername("");
    setAuthPassword("");
    setAuthMessage(`已进入 ${data.user.displayName} 的学习档案。`);
    await refreshStudentStats();
    await refreshLeaderboard();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setLearningReport(null);
    setGoalHistoryItems([]);
    setAuthMessage("已退出。再次登录后可继续保存个人学习记录。");
  }

  async function refreshLeaderboard() {
    const response = await fetch("/api/student/leaderboard");
    if (!response.ok) return;
    const data = (await response.json()) as { entries: LeaderboardEntry[] };
    setLeaderboardEntries(data.entries);
  }

  async function refreshStudentStats() {
    const response = await fetch("/api/student/reports/latest");
    if (!response.ok) return;
    const data = (await response.json()) as { report: StudentLearningReport };
    setLearningReport(data.report);
    setGoalHistoryItems(data.report.coreLiteracyGoalHistory ?? []);
  }

  async function completeReviewTask(taskId: string) {
    const response = await fetch(`/api/student/review-tasks/${taskId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewNote: reviewNotes[taskId] ?? "" })
    });
    if (!response.ok) {
      setReviewTaskMessage("这条复盘任务暂时没有更新成功，请稍后再试。");
      return;
    }
    const data = (await response.json()) as { result: { reward: { xp: number; gems: number; reason: string } } };
    setReviewNotes((current) => {
      const next = { ...current };
      delete next[taskId];
      return next;
    });
    updateAvatarMood("review");
    setReviewTaskMessage(`${data.result.reward.reason} 奖励 +${data.result.reward.xp} XP、+${data.result.reward.gems} 宝石。`);
    await refreshStudentStats();
    await refreshLeaderboard();
  }

  async function selectCoreLiteracyGoal(literacyTag: string, action: "start" | "reopen" = "start") {
    const response = await fetch("/api/student/core-literacy-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ literacyTag, periodType: "weekly", action })
    });
    if (!response.ok) {
      setReviewTaskMessage("核心素养目标暂时没有保存成功，请稍后再试。");
      return;
    }
    const data = (await response.json()) as { goal: StudentCoreLiteracyGoal };
    setReviewTaskMessage(
      action === "reopen"
        ? `已为下周期重新开启「${data.goal.label}」目标。`
        : `已把「${data.goal.label}」设为本周核心素养目标。`
    );
    updateAvatarMood("goal");
    await refreshStudentStats();
  }

  async function fetchCoreLiteracyGoalHistory() {
    const params = new URLSearchParams();
    if (goalHistoryStatusFilter !== "all") params.set("status", goalHistoryStatusFilter);
    if (goalHistoryLiteracyFilter !== "all") params.set("literacyTag", goalHistoryLiteracyFilter);
    if (goalHistoryPeriodFilter !== "all") params.set("periodType", goalHistoryPeriodFilter);
    params.set("limit", "20");
    const response = await fetch(`/api/student/core-literacy-goals?${params.toString()}`);
    if (!response.ok) {
      setReviewTaskMessage("目标历史暂时没有刷新成功，请稍后再试。");
      return;
    }
    const data = (await response.json()) as { history: StudentCoreLiteracyGoalHistoryItem[] };
    setGoalHistoryItems(data.history);
  }

  async function startSameTypeRetest(task: StudentReviewTask) {
    const targetPoint = findKnownPoint(task.knowledgePointId, gradePoints, grade);
    const nextGrade = targetPoint?.grade ?? grade;

    setGrade(nextGrade);
    setCurrentPointId(task.knowledgePointId);
    const retestQuestion = await loadQuestionForPoint(nextGrade, task.knowledgePointId);
    setSelectedAnswer("");
    setRemediationText("");
    setCanStartRemediation(false);
    setReturnPointId(null);
    setStartedAt(Date.now());
    setActiveRetestTaskId(retestQuestion ? task.id : null);
    setIsFocusMode(Boolean(retestQuestion));
    setFeedback(
      retestQuestion
        ? `已进入「${task.knowledgePointName}」同类题复测。先回忆你的复盘笔记，再完成这道题。`
        : `已定位到「${task.knowledgePointName}」，当前还没有可用的已发布同类题。`
    );
  }

  function followReviewNextAction(task: StudentReviewTask) {
    if (!task.nextAction) return;
    if (task.nextAction.actionType === "challenge_variant" || task.nextAction.actionType === "same_type_retest") {
      void startSameTypeRetest(task);
      setFeedback(`${task.nextAction.title}：${task.nextAction.detail}${task.nextAction.rewardText ? ` ${task.nextAction.rewardText}。` : ""}`);
      return;
    }

    const targetPointId = task.nextAction.targetKnowledgePointId ?? task.knowledgePointId;
    const targetPoint = findKnownPoint(targetPointId, gradePoints, grade);
    const nextGrade = targetPoint?.grade ?? grade;

    setGrade(nextGrade);
    setCurrentPointId(targetPointId);
    void loadQuestionForPoint(nextGrade, targetPointId).then((foundationQuestion) => {
      setActiveRetestTaskId(foundationQuestion ? task.id : null);
      setIsFocusMode(Boolean(foundationQuestion));
    });
    setSelectedAnswer("");
    setRemediationText(task.nextAction.detail);
    setCanStartRemediation(false);
    setReturnPointId(task.knowledgePointId);
    setStartedAt(Date.now());
    setFeedback(`${task.nextAction.title}：先补清这个关键点，再回到原复盘题。${task.nextAction.rewardText ? ` ${task.nextAction.rewardText}。` : ""}`);
  }

  function startRemediation() {
    if (!currentQuestion) return;
    const remediation = recommendRemediation(currentQuestion, gradePoints, gradeRelations);
    if (!remediation) return;
    const reward = createRemediationReward();
    setRewardEvents((events) => [...events, reward]);
    setCurrentPointId(remediation.targetKnowledgePointId);
    void loadQuestionForPoint(grade, remediation.targetKnowledgePointId);
    setProgress((state) => ({ ...state, [remediation.targetKnowledgePointId]: "mastered" }));
    setSelectedAnswer("");
    setStartedAt(Date.now());
    setFeedback(`已进入前置知识补救。${reward.reason}，奖励 +${reward.xp} XP、+${reward.gems} 宝石。`);
    setRemediationText(`补救完成后，系统会带你回到「${currentPoint?.name ?? "原知识点"}」复测。`);
    setCanStartRemediation(false);
    setReturnPointId(remediation.sourceKnowledgePointId);
    setReportLines((lines) => [
      ...lines,
      `已补清前置知识：${
        gradePoints.find((point) => point.id === remediation.targetKnowledgePointId)?.name ??
        remediation.targetKnowledgePointId
      }。`
    ]);
  }

  function returnToSourcePoint() {
    if (!returnPointId) return;
    void selectPoint(returnPointId);
    setFeedback("已经回到原知识点，现在做一道同类题复测。");
    setReturnPointId(null);
  }

  function startTodayTask(taskCard: StudentTaskCard) {
    const task = learningReport?.reviewTasks.find((item) => item.id === taskCard.taskId);
    if (!task) return;
    if (taskCard.actionType === "complete_review") {
      setReviewTaskMessage("今日任务已定位：先写一句复盘笔记，再标记完成复盘。");
      return;
    }
    if (task.nextAction) {
      followReviewNextAction(task);
      return;
    }
    startSameTypeRetest(task);
  }

  function renderLearningCompanion(className = "") {
    const rewardTone = avatarMood === "goal" ? "goal" : avatarMood === "review" ? "review" : "success";

    return (
      <div
        className={`learning-companion companion-${avatarMood}${className ? ` ${className}` : ""}`}
        key={`${avatarMood}-${avatarPulseKey}`}
        aria-label="学习伙伴"
      >
        <ChemBuddy state={avatarMood} size="sm" title={`学习伙伴：${avatarStatusText(avatarMood)}`} />
        <span className="avatar-status">{avatarStatusText(avatarMood)}</span>
        {avatarMood === "correct" || avatarMood === "review" || avatarMood === "goal" ? (
          <RewardBurst className="companion-reward-burst" size="sm" tone={rewardTone} title="成长奖励反馈" />
        ) : null}
      </div>
    );
  }

  function renderPracticeWorkspace(mode: "page" | "focus") {
    return (
      <div className={`practice-workspace practice-workspace-${mode}`}>
        <div className="diagnosis-guide" aria-label="诊断步骤">
          <span>真题诊断</span>
          <span>定位断点</span>
          <span>前置补救</span>
          <span>同类复测</span>
        </div>

        {currentQuestion ? (
          <>
            <article className="question-box">
              <div className="question-meta-row">
                <p className="eyebrow">中高考真题式诊断</p>
                <span>{activeRetestTaskId ? "同类题复测中" : "当前知识点诊断"}</span>
              </div>
              <h3>{currentQuestion.stem}</h3>
              <div className="question-reading-tools" aria-label="阅读辅助">
                <Badge tone="teal">主知识点：{currentPoint?.name ?? "当前知识点"}</Badge>
                <Badge tone="orange">建议用时 {currentQuestion.medianTimeSeconds}s</Badge>
                <Badge tone="blue">先圈条件，再选答案</Badge>
              </div>
              <div className="option-list">
                {currentQuestion.options.map((option) => (
                  <label className={selectedAnswer === option.label ? "selected" : ""} key={option.label}>
                    <input
                      checked={selectedAnswer === option.label}
                      name={mode === "focus" ? "answer-focus" : "answer"}
                      type="radio"
                      value={option.label}
                      onChange={() => setSelectedAnswer(option.label)}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      {option.text}
                    </span>
                  </label>
                ))}
              </div>
            </article>

            <div className="practice-control-panel">
              <div>
                <strong>这道题的主观感受</strong>
                <span>你的反馈会帮助系统调整后续练习节奏。</span>
              </div>
              <div className="difficulty-row" aria-label="题目难度反馈">
                {(["easy", "medium", "hard"] as DifficultyFeedback[]).map((item) => (
                  <button
                    className={difficultyFeedback === item ? "active" : ""}
                    key={item}
                    type="button"
                    onClick={() => setDifficultyFeedback(item)}
                  >
                    {difficultyText(item)}
                  </button>
                ))}
              </div>
              <button className="primary-button" disabled={!selectedAnswer || isSubmitting} type="button" onClick={submitAnswer}>
                {isSubmitting ? "正在记录" : selectedAnswer ? "提交答案" : "先选择一个选项"}
              </button>
            </div>
          </>
        ) : (
          <p className="empty-practice">当前年级暂无已发布题目。可以先切换年级，或等待老师发布新题。</p>
        )}

        <div className={`feedback-panel feedback-${avatarMood}`}>
          <div className="feedback-heading">
            <strong>学习反馈</strong>
            <span>{remediationText ? "下一步已经整理好" : "完成作答后会生成解析与建议"}</span>
          </div>
          {avatarMood === "correct" || avatarMood === "review" || avatarMood === "goal" ? (
            <div className="feedback-reward-strip" aria-label="奖励反馈">
              <RewardBurst size="sm" tone={avatarMood === "goal" ? "goal" : avatarMood === "review" ? "review" : "success"} />
              <span>{latestReward ? `刚获得 +${latestReward.xp} XP、+${latestReward.gems} 宝石` : "这一步已经被记录到成长档案"}</span>
            </div>
          ) : null}
          <p>{feedback}</p>
          {remediationText ? (
            <>
              <div className="remediation-visual-row">
                <KnowledgePathIllustration activeStep={remediationActiveStep as 0 | 1 | 2} size="sm" />
                <span>先补前置，再回原知识点复测，系统会保留你的学习路径。</span>
              </div>
              <pre>{remediationText}</pre>
              <div className="feedback-actions">
                {canStartRemediation ? (
                  <button className="secondary-button" type="button" onClick={startRemediation}>
                    先补前置知识
                  </button>
                ) : null}
                {returnPointId ? (
                  <button className="secondary-button" type="button" onClick={returnToSourcePoint}>
                    回到原知识点复测
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <main className="page-shell">
      <header className="student-header">
        <div>
          <p className="eyebrow">学生端</p>
          <h1>真题诊断与知识图谱补救</h1>
          <p className="student-header-copy">用已发布真题定位断点，补清前置知识，再回到同类题确认迁移。</p>
        </div>
        <div className="student-hero-visual" aria-hidden="true">
          <ChemBuddy state={avatarMood} size="md" />
          <MoleculePath activeIndex={avatarMood === "correct" ? 4 : avatarMood === "wrong" ? 1 : 2} size="sm" />
        </div>
        <div className="reward-bar" aria-label="成长奖励">
          <span>XP {totalXp}</span>
          <span>宝石 {totalGems}</span>
          <span>本周成长榜 {leaderboardRankText(leaderboardEntries, currentUser?.displayName)}</span>
        </div>
      </header>

      <section className="auth-strip" aria-label="账号状态">
        {currentUser ? (
          <>
            <div>
              <p className="eyebrow">学习档案</p>
              <strong>{currentUser.displayName}</strong>
              <span>{authMessage}</span>
            </div>
            <button className="secondary-button" type="button" onClick={logout}>
              退出
            </button>
          </>
        ) : (
          <form onSubmit={submitAuthForm}>
            <div>
              <p className="eyebrow">账号</p>
              <span>{authMessage}</span>
            </div>
            <input
              aria-label="用户名"
              placeholder="用户名"
              value={authUsername}
              onChange={(event) => setAuthUsername(event.target.value)}
            />
            <input
              aria-label="密码"
              placeholder="密码"
              type="password"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
            />
            <button
              className="secondary-button"
              type="button"
              onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
            >
              {authMode === "login" ? "去注册" : "去登录"}
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthUsername(demoStudentAccount.username);
                setAuthPassword(demoStudentAccount.password);
                setAuthMessage("已填入演示学生账号，点击登录即可查看学习报告和复盘任务。");
              }}
            >
              演示账号
            </button>
            <button className="primary-button compact" disabled={!authUsername || !authPassword} type="submit">
              {authMode === "login" ? "登录" : "注册"}
            </button>
          </form>
        )}
      </section>

      <section className="student-home-panel" aria-label="今日学习概览">
        <Card
          className="student-buddy-card"
          eyebrow="今日学习伙伴"
          title={avatarStatusText(avatarMood)}
          description={activeGrowthGoal ? `当前目标：${activeGrowthGoal.label}` : "完成一次诊断后，我会帮你整理下一步。"}
          variant="soft"
        >
          <div className="student-buddy-card-body">
            <ChemBuddy state={avatarMood} size="lg" />
            <div>
              <strong>{learningReport?.encouragement ?? "从一道真题开始，找到最值得补的一步。"}</strong>
              <p>{activeGrowthGoal?.nextAction ?? learningReport?.weeklyGrowthSummary.suggestion ?? "先选择年级和知识点，再进入沉浸做题。"}</p>
            </div>
          </div>
        </Card>
        <div className="student-home-stats">
          <StatCard label="今日任务" value={`${todayTaskDone}/${todayTaskTotal || 0}`} helper="复盘、复测和前置巩固" tone="teal" />
          <StatCard label="正确率" value={`${reportAccuracy}%`} helper="只统计已发布题作答" tone="green" />
          <StatCard label="补救路径" value={learningReport?.remediationCount ?? reportLines.length} helper="补清前置更重要" tone="orange" />
        </div>
        <div className="student-progress-card">
          <ProgressRing value={todayTaskCompletion} label="今日完成" tone="teal" />
          <div>
            <strong>{todayTaskCompletion ? `已完成 ${todayTaskCompletion}%` : "准备开始今日诊断"}</strong>
            <p>{learningReport?.weeklyGrowthSummary.consistencyText ?? "连续学习、错题复盘和核心素养进步都会获得奖励。"}</p>
          </div>
        </div>
      </section>

      <section className="grade-tabs" aria-label="选择年级">
        {grades.map((item) => (
          <button className={item === grade ? "active" : ""} key={item} type="button" onClick={() => selectGrade(item)}>
            {item}
          </button>
        ))}
      </section>

      <section className="student-grid">
        <section className="card graph-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">知识图谱</p>
              <h2>{grade}</h2>
            </div>
            <div className="graph-heading-visual">
              <p>
                {isGraphLoading
                  ? "正在读取最新知识图谱..."
                  : `已载入 ${gradePoints.length} 个知识点、${gradeRelations.length} 条关系。`}
                {graphVersionId ? ` 版本：${graphVersionId}` : ""}
              </p>
              <MoleculePath activeIndex={2} size="sm" />
            </div>
          </div>
          <div className="graph-legend" aria-label="知识点状态说明">
            <span className="legend-current">当前</span>
            <span className="legend-mastered">已掌握</span>
            <span className="legend-weak">待巩固</span>
          </div>
          <div className="graph-area">
            {gradePoints.map((point) => {
              const status = progress[point.id] ?? "untested";
              const isCurrent = point.id === currentPointId;
              return (
                <button
                  className={`graph-node ${statusClass(status)} ${isCurrent ? "status-current" : ""}`}
                  key={point.id}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  type="button"
                  onClick={() => void selectPoint(point.id)}
                >
                  <strong>{point.name}</strong>
                  <span>{statusText(status)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card practice-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">当前诊断</p>
              <h2>{currentPoint?.name ?? "暂无知识点"}</h2>
              <p>题面已放大，适合长题干阅读；需要专注时可进入沉浸做题。</p>
            </div>
            <div className="practice-heading-actions">
              {renderLearningCompanion()}
              <button className="secondary-button compact focus-launch-button" type="button" onClick={() => setIsFocusMode(true)}>
                沉浸做题
              </button>
            </div>
          </div>
          {renderPracticeWorkspace("page")}
        </section>
      </section>

      {isFocusMode ? (
        <section className="focus-practice-overlay" role="dialog" aria-modal="true" aria-label="沉浸做题模式">
          <div className="focus-practice-shell">
            <div className="focus-practice-top">
              <div>
                <p className="eyebrow">沉浸做题</p>
                <h2>{currentPoint?.name ?? "当前知识点"}</h2>
                <span>按 Esc 或点击退出，当前选择和反馈会保留。</span>
              </div>
              <div className="focus-practice-actions">
                {renderLearningCompanion("focus-companion")}
                <button className="secondary-button" type="button" onClick={() => setIsFocusMode(false)}>
                  退出沉浸
                </button>
              </div>
            </div>
            {renderPracticeWorkspace("focus")}
          </div>
        </section>
      ) : null}

      <section className="bottom-grid">
        <section className="card leaderboard-card">
          <p className="eyebrow">本周成长榜</p>
          <h2>排行榜</h2>
          {leaderboardEntries.length ? leaderboardEntries.map((entry) => (
            <div className="leaderboard-row" key={entry.rank}>
              <span>#{entry.rank}</span>
              <strong>{entry.studentName}</strong>
              <em>{entry.score} XP</em>
              <p>{entry.description}</p>
            </div>
          )) : <p>完成一次学习后，这里会显示真实成长榜。</p>}
        </section>

        <section className="card report-card">
          <p className="eyebrow">学习报告</p>
          <h2>{learningReport ? "个人统计" : "本次记录"}</h2>
          {learningReport ? (
            <>
              <p>
                已完成 {learningReport.totalAnswers} 次作答，正确 {learningReport.correctAnswers} 次，正确率{" "}
                {learningReport.accuracy}%。
              </p>
              <p>
                补救路径 {learningReport.remediationCount} 条，认真思考记录 {learningReport.thoughtfulCount} 次。
              </p>
              <p>{learningReport.encouragement}</p>
              {learningReport.nextStepHints.map((hint) => (
                <p key={hint}>下一步：{hint}</p>
              ))}
            </>
          ) : reportLines.length ? (
            reportLines.map((line) => <p key={line}>{line}</p>)
          ) : (
            <p>完成一次诊断后，这里会生成薄弱点、补救和下一步建议。</p>
          )}
        </section>

        <section className="card review-task-card">
          <p className="eyebrow">错题复盘</p>
          <h2>老师任务</h2>
          <p>{reviewTaskMessage}</p>
          {learningReport?.todayTasks.length ? (
            <div className="review-task-list">
              <strong>今日任务</strong>
              {learningReport.todayTasks.map((task) => (
                <article className="review-task" key={`${task.taskId}-${task.actionType}`}>
                  <span>{task.knowledgePointName} · 待完成</span>
                  <strong>{task.title}</strong>
                  <p>{task.detail}</p>
                  <button className="secondary-button compact" type="button" onClick={() => startTodayTask(task)}>
                    {task.ctaLabel}
                  </button>
                </article>
              ))}
            </div>
          ) : null}
          {learningReport?.completedTasks.length ? (
            <div className="review-task-list">
              <strong>已完成任务</strong>
              {learningReport.completedTasks.map((task) => (
                <article className="review-task completed" key={`${task.taskId}-${task.actionType}`}>
                  <span>{task.knowledgePointName} · 已完成</span>
                  <strong>{task.title}</strong>
                  <p>{task.detail}</p>
                </article>
              ))}
            </div>
          ) : null}
          {learningReport?.reviewTasks.length ? (
            <div className="review-task-list">
              <strong>全部复盘任务</strong>
              {learningReport.reviewTasks.map((task) => (
                <article className={task.status === "completed" ? "review-task completed" : "review-task"} key={task.id}>
                  <span>{task.knowledgePointName} · {task.status === "completed" ? "已完成" : "待复盘"}</span>
                  <strong>{task.stem}</strong>
                  <p>{task.encouragement}</p>
                  {task.retestCompletedAt ? (
                    <>
                      <p>
                        复测结果：{task.retestIsCorrect ? "已迁移成功" : "继续巩固中"}，
                        {new Date(task.retestCompletedAt).toLocaleString("zh-CN")}
                      </p>
                      {task.nextAction ? (
                        <p>
                          下一步任务：{task.nextAction.status === "completed" ? "已完成" : "待完成"}。{task.nextAction.title}。
                          {task.nextAction.detail}
                          {task.nextAction.rewardText ? ` ${task.nextAction.rewardText}。` : ""}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  {task.status === "assigned" ? (
                    <>
                      <textarea
                        aria-label="复盘笔记"
                        placeholder="写一句复盘笔记：这题错在哪里？下次先看哪个条件？"
                        value={reviewNotes[task.id] ?? ""}
                        onChange={(event) => setReviewNotes((current) => ({ ...current, [task.id]: event.target.value }))}
                      />
                      <p className="review-note-hint">{reviewNoteHint(reviewNotes[task.id] ?? "")}</p>
                      {task.reminderCount > 0 ? <p>老师提醒你优先完成这条复盘任务，先把错因写清楚。</p> : null}
                      <div className="review-task-actions">
                        <button className="secondary-button compact" type="button" onClick={() => startSameTypeRetest(task)}>
                          同类题复测
                        </button>
                        <button className="secondary-button compact" type="button" onClick={() => completeReviewTask(task.id)}>
                          标记完成复盘
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {task.reviewNote ? <p>我的复盘笔记：{task.reviewNote}</p> : null}
                      <button className="secondary-button compact" type="button" onClick={() => startSameTypeRetest(task)}>
                        同类题复测
                      </button>
                      {task.nextAction ? (
                        <button className="secondary-button compact" type="button" onClick={() => followReviewNextAction(task)}>
                          {task.nextAction.status === "completed" ? "再练一次" : task.nextAction.title}
                        </button>
                      ) : null}
                    </>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p>暂时没有待完成的老师复盘任务。</p>
          )}
        </section>

        <section className="card report-card">
          <p className="eyebrow">成长轨迹</p>
          <h2>累计成长</h2>
          {learningReport ? (
            <>
              <div className="growth-summary">
                <strong>本周成长</strong>
                <div className="growth-summary-metrics">
                  <span>{learningReport.weeklyGrowthSummary.xp} XP</span>
                  <span>{learningReport.weeklyGrowthSummary.gems} 宝石</span>
                  <span>{learningReport.weeklyGrowthSummary.completedReviewCount} 次复盘</span>
                  <span>{learningReport.weeklyGrowthSummary.breakthroughCount} 次突破</span>
                </div>
                <p>{learningReport.weeklyGrowthSummary.consistencyText}</p>
                <p>下一步：{learningReport.weeklyGrowthSummary.suggestion}</p>
                <div className="weekly-review-card-list">
                  {learningReport.weeklyReviewCards.map((card) => (
                    <article className="weekly-review-card" key={card.cardId}>
                      <span>{card.title}</span>
                      <strong>{card.focus}</strong>
                      <p>{card.evidenceText}</p>
                      <em>{card.ctaLabel}</em>
                    </article>
                  ))}
                </div>
              </div>
              <div className="core-literacy-summary">
                <strong>核心素养成长</strong>
                {learningReport.coreLiteracyGoalRecommendation ? (
                  <div className="core-literacy-goal-recommendation">
                    <span>推荐下一目标</span>
                    <strong>{learningReport.coreLiteracyGoalRecommendation.label}</strong>
                    <p>{learningReport.coreLiteracyGoalRecommendation.reason}</p>
                    <button
                      className="secondary-button compact"
                      type="button"
                      onClick={() => selectCoreLiteracyGoal(learningReport.coreLiteracyGoalRecommendation!.literacyTag)}
                    >
                      {learningReport.coreLiteracyGoalRecommendation.ctaLabel}
                    </button>
                  </div>
                ) : null}
                {learningReport.coreLiteracyGoals.length ? (
                  <div className="core-literacy-goals">
                    {learningReport.coreLiteracyGoals.map((goal) => (
                      <article
                        className={goal.status === "completed" ? "core-literacy-goal completed" : goal.selected ? "core-literacy-goal selected" : "core-literacy-goal"}
                        key={goal.literacyTag}
                      >
                        <div>
                          <strong>{goal.label}</strong>
                          <span>{coreLiteracyGoalStatusText(goal.status)}</span>
                        </div>
                        <p>{goal.targetText}</p>
                        <p>{goal.progressText}</p>
                        {goal.periodKey ? <em>{goal.periodType === "weekly" ? "周目标" : "阶段目标"} · {goal.periodKey}</em> : null}
                        {goal.rewardText ? <em>{goal.rewardText}</em> : null}
                        <button
                          className="secondary-button compact"
                          disabled={goal.selected}
                          type="button"
                          onClick={() => selectCoreLiteracyGoal(goal.literacyTag, goal.status === "completed" ? "reopen" : "start")}
                        >
                          {goal.status === "completed" ? "下周期重新开启" : goal.selected ? "已选择" : "设为目标"}
                        </button>
                      </article>
                    ))}
                  </div>
                ) : null}
                <div className="core-literacy-goal-history-controls">
                  <select value={goalHistoryStatusFilter} onChange={(event) => setGoalHistoryStatusFilter(event.target.value)} aria-label="目标状态筛选">
                    <option value="all">全部状态</option>
                    <option value="active">进行中</option>
                    <option value="paused">已切换</option>
                    <option value="completed">已完成</option>
                  </select>
                  <select value={goalHistoryLiteracyFilter} onChange={(event) => setGoalHistoryLiteracyFilter(event.target.value)} aria-label="核心素养筛选">
                    <option value="all">全部维度</option>
                    {learningReport.coreLiteracyGoals.map((goal) => (
                      <option key={goal.literacyTag} value={goal.literacyTag}>
                        {goal.label}
                      </option>
                    ))}
                  </select>
                  <select value={goalHistoryPeriodFilter} onChange={(event) => setGoalHistoryPeriodFilter(event.target.value)} aria-label="目标周期筛选">
                    <option value="weekly">周目标</option>
                    <option value="all">全部周期</option>
                  </select>
                  <button className="secondary-button compact" type="button" onClick={fetchCoreLiteracyGoalHistory}>
                    筛选历史
                  </button>
                </div>
                {goalHistoryItems.length ? (
                  <div className="core-literacy-goal-history">
                    <strong>目标完成记录与历史</strong>
                    {goalHistoryItems.map((goal) => (
                      <article className="core-literacy-goal-history-item" key={goal.goalId ?? `${goal.literacyTag}-${goal.periodKey}-${goal.completedAt ?? goal.startedAt}`}>
                        <span>{goal.label}</span>
                        <strong>{coreLiteracyGoalHistoryStatusText(goal.status)} · {goal.periodKey ?? "当前周期"}</strong>
                        <p>{goal.rewardText}</p>
                        <em>{goal.completedAt ? new Date(goal.completedAt).toLocaleString("zh-CN") : goal.startedAt ? new Date(goal.startedAt).toLocaleDateString("zh-CN") : "持续记录中"}</em>
                      </article>
                    ))}
                  </div>
                ) : null}
                {learningReport.coreLiteracyGrowth.length ? (
                  learningReport.coreLiteracyGrowth.map((item) => (
                    <article className="core-literacy-row" key={item.literacyTag}>
                      <div>
                        <strong>{item.label}</strong>
                        <span>{coreLiteracyLevelText(item.growthLevel)} · {item.correctCount}/{item.answerCount} 次稳定作答</span>
                      </div>
                      <p>{item.encouragement}</p>
                      <p>建议：{item.nextAction}</p>
                    </article>
                  ))
                ) : (
                  <p>完成带有核心素养标签的诊断题后，这里会出现能力成长摘要。</p>
                )}
              </div>
              <div className="milestone-badge-summary">
                <strong>阶段徽章</strong>
                <div className="milestone-badge-list">
                  {learningReport.milestoneBadges.map((badge) => (
                    <article className={badge.unlocked ? "milestone-badge unlocked" : "milestone-badge"} key={badge.badgeId}>
                      <RewardBadge
                        size="sm"
                        unlocked={badge.unlocked}
                        variant={badge.badgeId.includes("review") ? "review" : badge.badgeId.includes("streak") ? "streak" : badge.badgeId.includes("master") ? "mastery" : "goal"}
                      />
                      <span>{badge.unlocked ? "已点亮" : "进行中"}</span>
                      <strong>{badge.title}</strong>
                      <p>{badge.description}</p>
                      <em>{badge.progressText}</em>
                    </article>
                  ))}
                </div>
              </div>
            </>
          ) : null}
          {learningReport?.growthTimeline.length ? (
            learningReport.growthTimeline.map((event) => (
              <div className="leaderboard-row" key={`${event.createdAt}-${event.reason}`}>
                <span>{event.label}</span>
                <strong>+{event.xp} XP</strong>
                <em>+{event.gems} 宝石</em>
                <p>{event.reason}</p>
              </div>
            ))
          ) : (
            <p>完成补救、复盘或突破任务后，这里会留下你的成长记录。</p>
          )}
        </section>
      </section>
    </main>
  );
}

function leaderboardRankText(entries: LeaderboardEntry[], displayName?: string) {
  if (!displayName) return "#--";
  const entry = entries.find((item) => item.studentName === displayName);
  return entry ? `#${entry.rank}` : "#--";
}

function toClientPracticeQuestion(question: StudentPracticeQuestion, grade: Grade, pointId: string): Question {
  return {
    id: question.id,
    grade: question.grade ?? grade,
    stem: question.stem,
    options: question.options,
    answer: "",
    analysis: "",
    difficulty: question.difficulty,
    medianTimeSeconds: question.medianTimeSeconds,
    auditStatus: "published",
    primaryKnowledgePointId: question.primaryKnowledgePointId ?? pointId,
    prerequisiteKnowledgePointIds: question.prerequisiteKnowledgePointIds ?? [],
    coreLiteracy: question.coreLiteracy ?? ["evidence_model"],
    abilityTarget: question.abilityTarget ?? "能运用化学知识解决问题。",
    positiveFeedback: "你能抓住题目中的关键证据，化学思维正在变清楚。",
    wrongFeedback: "这题需要先找到题干里的关键条件，再回到对应知识点判断。"
  };
}

function findKnownPoint(pointId: string, currentGradePoints: KnowledgePoint[], currentGrade: Grade) {
  return (
    currentGradePoints.find((point) => point.id === pointId) ??
    seedKnowledgePoints.find((point) => point.id === pointId) ??
    currentGradePoints.find((point) => point.grade === currentGrade) ??
    seedKnowledgePoints.find((point) => point.grade === currentGrade)
  );
}

function statusClass(status: KnowledgeStatus) {
  if (status === "mastered") return "status-mastered";
  if (status === "weak") return "status-weak";
  return "";
}

function statusText(status: KnowledgeStatus) {
  if (status === "mastered") return "已掌握";
  if (status === "weak") return "待巩固";
  return "未测试";
}

function difficultyText(feedback: DifficultyFeedback) {
  if (feedback === "easy") return "容易";
  if (feedback === "hard") return "难";
  return "中等";
}

function avatarStatusText(mood: AvatarMood) {
  if (mood === "correct") return "证据链打通了";
  if (mood === "wrong") return "先补关键前置";
  if (mood === "review") return "复盘完成";
  if (mood === "goal") return "目标点亮";
  return "等你开题";
}

function reviewNoteHint(note: string) {
  const trimmed = note.trim();
  if (!trimmed) return "可以按“错因 + 下次先看什么条件”写一句。";
  if (trimmed.length < 10) return "再补充一点点会更清楚：写出错因或下一步检查动作。";
  if (/因为|条件|先|所以|下次|步骤|证据/.test(trimmed)) return "这条复盘笔记已经有方法感了，完成后可以做同类题确认。";
  return "可以再加一个关键词：错因、证据、条件或下次步骤。";
}

function coreLiteracyLevelText(level: StudentCoreLiteracyGrowthItem["growthLevel"]) {
  if (level === "steady") return "表现稳定";
  if (level === "building") return "正在积累";
  return "开始记录";
}

function coreLiteracyGoalStatusText(status: StudentCoreLiteracyGoal["status"]) {
  if (status === "completed") return "已完成";
  if (status === "selected") return "本周目标";
  return "可选目标";
}

function coreLiteracyGoalHistoryStatusText(status: StudentCoreLiteracyGoalHistoryItem["status"]) {
  if (status === "completed") return "已完成";
  if (status === "active") return "进行中";
  return "已切换";
}

function assessmentText(assessment: ReturnType<typeof assessTime>) {
  const textMap = {
    too_fast: "过快",
    fast: "较快",
    normal: "正常",
    slow: "较慢",
    stuck: "卡顿"
  };
  return textMap[assessment];
}
