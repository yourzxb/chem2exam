"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { OperationNotice } from "@/components/operation-notice";
import { Badge, ProgressRing, StatCard } from "@/components/ui";
import { BeakerIcon, MoleculePath, RewardBadge } from "@/components/visuals";

const demoTeacherAccount = {
  username: "demo_teacher",
  password: "Chem2Exam@2026"
};

interface TeacherUser {
  id: string;
  username: string;
  displayName: string;
  role: "student" | "teacher" | "admin";
}

interface TeacherClassScope {
  classId: string;
  scope: "global" | "class";
  label: string;
  schoolId?: string;
  schoolName?: string;
  className?: string;
  grade?: string;
  role: "admin" | "teacher" | "head_teacher";
  status: string;
  studentCount?: number;
  teacherCount?: number;
}

interface NextRoundTaskStudent {
  studentId: string;
  displayName: string;
  taskCount: number;
  latestTaskAt?: string;
}

interface TeacherClassReport {
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
  weakKnowledgePoints: Array<{ knowledgePointId: string; name: string; wrongCount: number }>;
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

interface TeacherTeachingMaterials {
  classId: string;
  filters: {
    grade?: string;
    startDate?: string;
    endDate?: string;
    reviewTaskType?: string;
    feedbackStatus?: string;
    knowledgePointId?: string;
    groupBy: "knowledge_point" | "task_type" | "student" | "feedback_status";
  };
  materials: Array<{
    materialId: string;
    studentId: string;
    displayName: string;
    taskTypeLabel: string;
    status: "assigned" | "completed";
    feedbackStatus: "noted" | "pending_feedback" | "not_ready";
    knowledgePointName: string;
    teacherFeedbackNote?: string;
    studentReviewNote?: string;
    completionFeedback: string;
    teachingSuggestion: string;
    priority: "high" | "medium" | "low";
    priorityReason: string;
    question: {
      questionType: string;
      isPublished: boolean;
      stem?: string;
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
  }>;
  template: {
    title: string;
    scopeSummary: string;
    opening: string;
    boardPlan: string[];
    teachingSteps: string[];
    studentActivities: string[];
    afterClassActions: string[];
  };
}

interface KnowledgePointBreakdown {
  knowledgePointId: string;
  knowledgePointName: string;
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

interface StudentDetail {
  studentId: string;
  displayName: string;
  answerCount: number;
  wrongCount: number;
  accuracy: number;
  remediationCount: number;
  weakKnowledgePoints: Array<{ knowledgePointId: string; name: string; wrongCount: number; suggestion: string }>;
  wrongQuestions: Array<{
    answerRecordId: string;
    questionId: string;
    stem: string;
    selectedAnswer: string;
    correctAnswer: string;
    analysis: string;
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
    reviewNote?: string;
    reminderCount: number;
    lastReminderAt?: string;
    retestQuestionId?: string;
    retestIsCorrect?: boolean;
    retestCompletedAt?: string;
    taskType: "review" | "variant_challenge" | "prerequisite_consolidation";
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

export function TeacherDashboard() {
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);
  const [report, setReport] = useState<TeacherClassReport | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [classScopes, setClassScopes] = useState<TeacherClassScope[]>([]);
  const [classIdFilter, setClassIdFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
  const [reminderStatusFilter, setReminderStatusFilter] = useState("all");
  const [retestStatusFilter, setRetestStatusFilter] = useState("all");
  const [reviewGroupFilter, setReviewGroupFilter] = useState("all");
  const [reviewTaskTypeFilter, setReviewTaskTypeFilter] = useState("all");
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState("all");
  const [materialGroupBy, setMaterialGroupBy] = useState<"knowledge_point" | "task_type" | "student" | "feedback_status">("knowledge_point");
  const [materialKnowledgePointId, setMaterialKnowledgePointId] = useState("all");
  const [teachingMaterials, setTeachingMaterials] = useState<TeacherTeachingMaterials | null>(null);
  const [reminderCooldownHours, setReminderCooldownHours] = useState("24");
  const [selectedReminderStudentIds, setSelectedReminderStudentIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [knowledgePointBreakdown, setKnowledgePointBreakdown] = useState<KnowledgePointBreakdown | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("老师登录后可查看班级知识断点、学生表现和讲评建议。");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const isBusy = Boolean(pendingAction);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { user?: TeacherUser } | null) => {
        if (data?.user && (data.user.role === "teacher" || data.user.role === "admin")) {
          setTeacher(data.user);
          void withTeacherPending("initial-classes", "正在读取老师授权班级...", async () => loadTeacherClasses());
        }
      })
      .catch(() => undefined);
  }, []);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role: "teacher" })
    });

    if (!response.ok) {
      setMessage(authMode === "login" ? "老师账号或密码不匹配。" : "老师账号注册失败，请换一个用户名。");
      return;
    }

    const data = (await response.json()) as { user: TeacherUser };
    if (data.user.role !== "teacher" && data.user.role !== "admin") {
      setMessage("当前账号没有老师端权限。");
      return;
    }
    setTeacher(data.user);
    setUsername("");
    setPassword("");
    setMessage(`已进入 ${data.user.displayName} 的班级看板。`);
    await withTeacherPending("auth-classes", "正在读取老师授权班级...", async () => loadTeacherClasses());
  }

  async function withTeacherPending(action: string, workingMessage: string, run: () => Promise<void>) {
    setPendingAction(action);
    setMessage(workingMessage);
    try {
      await run();
    } finally {
      setPendingAction((current) => (current === action ? null : current));
    }
  }

  async function loadTeacherClasses() {
    const response = await fetch("/api/teacher/classes");
    if (response.status === 403) {
      setMessage("当前账号没有读取老师班级的权限。");
      setClassScopes([]);
      setReport(null);
      return;
    }
    if (!response.ok) {
      setMessage("我的班级暂时没有读取成功，请稍后刷新。");
      return;
    }
    const data = (await response.json()) as {
      classes: TeacherClassScope[];
      defaultClassId: string | null;
      canUseGlobalScope: boolean;
    };
    setClassScopes(data.classes);

    const currentClassId = classIdFilter.trim();
    const nextClassId = data.classes.some((item) => item.classId === currentClassId)
      ? currentClassId
      : data.defaultClassId ?? data.classes[0]?.classId ?? "";
    setClassIdFilter(nextClassId);

    if (!nextClassId) {
      setReport(null);
      setKnowledgePointBreakdown(null);
      setStudentDetail(null);
      setTeachingMaterials(null);
      setMessage("当前老师还没有绑定班级，请联系管理员完成任教授权。");
      return;
    }

    const selectedScope = data.classes.find((item) => item.classId === nextClassId);
    setMessage(selectedScope ? `已选择 ${selectedScope.label}。` : "已读取老师班级。");
    await loadReport({}, nextClassId);
  }

  async function changeClassScope(nextClassId: string) {
    await withTeacherPending("class-change", "正在切换班级并读取报告...", async () => {
      setClassIdFilter(nextClassId);
      setSelectedReminderStudentIds([]);
      const selectedScope = classScopes.find((item) => item.classId === nextClassId);
      setMessage(selectedScope ? `已切换到 ${selectedScope.label}。` : "已切换班级口径。");
      await loadReport({}, nextClassId);
    });
  }

  async function loadReport(overrides: Partial<{ reviewGroupFilter: string }> = {}, classIdOverride?: string) {
    setKnowledgePointBreakdown(null);
    setStudentDetail(null);
    setTeachingMaterials(null);
    const params = buildReportParams(overrides, classIdOverride);
    const response = await fetch(`/api/teacher/classes/overview?${params.toString()}`);
    if (response.status === 403) {
      setMessage("请确认已登录，并且当前老师已绑定到这个班级。");
      return;
    }
    if (!response.ok) return;
    const data = (await response.json()) as { report: TeacherClassReport };
    setReport(data.report);
    setSelectedReminderStudentIds((current) => current.filter((id) => data.report.students.some((student) => student.studentId === id)));
    await loadTeachingMaterials(params);
  }

  function buildReportParams(overrides: Partial<{ reviewGroupFilter: string }> = {}, classIdOverride?: string) {
    const params = new URLSearchParams({ classId: (classIdOverride ?? classIdFilter.trim()) || "all" });
    const activeReviewGroupFilter = overrides.reviewGroupFilter ?? reviewGroupFilter;
    if (gradeFilter !== "all") params.set("grade", gradeFilter);
    if (reviewStatusFilter !== "all") params.set("reviewStatus", reviewStatusFilter);
    if (reminderStatusFilter !== "all") params.set("reminderStatus", reminderStatusFilter);
    if (retestStatusFilter !== "all") params.set("retestStatus", retestStatusFilter);
    if (activeReviewGroupFilter !== "all") params.set("reviewGroup", activeReviewGroupFilter);
    if (reviewTaskTypeFilter !== "all") params.set("reviewTaskType", reviewTaskTypeFilter);
    if (feedbackStatusFilter !== "all") params.set("feedbackStatus", feedbackStatusFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return params;
  }

  function buildTeachingMaterialParams(baseParams = buildReportParams()) {
    const params = new URLSearchParams(baseParams);
    params.set("groupBy", materialGroupBy);
    if (materialKnowledgePointId !== "all") params.set("knowledgePointId", materialKnowledgePointId);
    return params;
  }

  async function loadTeachingMaterials(baseParams?: URLSearchParams) {
    const params = buildTeachingMaterialParams(baseParams);
    const response = await fetch(`/api/teacher/classes/teaching-materials?${params.toString()}`);
    if (response.status === 403) {
      setMessage("请确认已登录，并且当前老师已绑定到这个班级。");
      return;
    }
    if (!response.ok) return;
    const data = (await response.json()) as TeacherTeachingMaterials;
    setTeachingMaterials(data);
  }

  async function loadKnowledgePointStudents(knowledgePointId: string) {
    setStudentDetail(null);
    const response = await fetch(`/api/teacher/classes/knowledge-points/${knowledgePointId}/students?${buildReportParams().toString()}`);
    if (!response.ok) return;
    const data = (await response.json()) as { breakdown: KnowledgePointBreakdown };
    setKnowledgePointBreakdown(data.breakdown);
  }

  async function loadStudentDetail(studentId: string) {
    setKnowledgePointBreakdown(null);
    const response = await fetch(`/api/teacher/classes/students/${studentId}/detail?${buildReportParams().toString()}`);
    if (!response.ok) return;
    const data = (await response.json()) as { detail: StudentDetail };
    setStudentDetail(data.detail);
    setFeedbackDrafts(Object.fromEntries(data.detail.reviewTasks.map((task) => [task.id, task.teacherFeedbackNote ?? ""])));
  }

  function exportReport() {
    setMessage("正在导出当前筛选口径的班级报告。");
    window.location.href = `/api/teacher/classes/overview/export?${buildReportParams().toString()}`;
  }

  function exportReviewFollowups() {
    setMessage("正在导出当前筛选口径的复盘跟进名单。");
    window.location.href = `/api/teacher/classes/review-followups/export?${buildReportParams().toString()}`;
  }

  function exportTeachingMaterials(format: "csv" | "markdown") {
    const params = buildTeachingMaterialParams();
    params.set("format", format);
    setMessage(format === "csv" ? "正在导出课堂讲评 CSV 素材。" : "正在导出课堂讲评 Markdown 素材。");
    window.location.href = `/api/teacher/classes/teaching-materials/export?${params.toString()}`;
  }

  function exportStudentWrongQuestions() {
    if (!studentDetail) return;
    setMessage(`正在导出 ${studentDetail.displayName} 的错题清单。`);
    window.location.href = `/api/teacher/classes/students/${studentDetail.studentId}/wrong-questions/export?${buildReportParams().toString()}`;
  }

  async function assignStudentReviewTasks() {
    if (!studentDetail?.wrongQuestions.length) return;
    await withTeacherPending("review-task-assign", "正在分配错题复盘任务...", async () => {
      const response = await fetch(`/api/teacher/classes/students/${studentDetail.studentId}/review-tasks?${buildReportParams().toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIds: studentDetail.wrongQuestions.map((question) => question.questionId)
        })
      });
      if (!response.ok) {
        setMessage("复盘任务分配失败，请稍后再试。");
        return;
      }
      const data = (await response.json()) as { result: { assignedCount: number } };
      setMessage(`已为 ${studentDetail.displayName} 分配 ${data.result.assignedCount} 个错题复盘任务。`);
      await loadStudentDetail(studentDetail.studentId);
    });
  }

  async function remindStudentReviewTasks() {
    if (!studentDetail?.reviewTaskSummary.assignedCount) return;
    await withTeacherPending("review-task-remind", "正在生成温和复盘提醒...", async () => {
      const response = await fetch(`/api/teacher/classes/students/${studentDetail.studentId}/review-tasks/remind?${buildReportParams().toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cooldownHours: toCooldownHours(reminderCooldownHours) })
      });
      if (!response.ok) {
        setMessage("复盘提醒暂时没有发送成功，请稍后再试。");
        return;
      }
      const data = (await response.json()) as { result: { remindedCount: number; skippedDueToCooldown: number } };
      setMessage(`已为 ${studentDetail.displayName} 生成 ${data.result.remindedCount} 条温和复盘提醒，${data.result.skippedDueToCooldown} 条处于冷却中。`);
      await loadStudentDetail(studentDetail.studentId);
    });
  }

  async function batchRemindSelectedStudents() {
    if (!selectedReminderStudentIds.length) return;
    await withTeacherPending("batch-remind", "正在批量生成温和复盘提醒...", async () => {
      const response = await fetch(`/api/teacher/classes/review-tasks/remind?${buildReportParams().toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedReminderStudentIds,
          cooldownHours: toCooldownHours(reminderCooldownHours)
        })
      });
      if (!response.ok) {
        setMessage("批量复盘提醒暂时没有发送成功，请稍后再试。");
        return;
      }
      const data = (await response.json()) as { result: { studentCount: number; remindedCount: number; skippedDueToCooldown: number } };
      setMessage(
        `已为 ${data.result.studentCount} 名学生生成 ${data.result.remindedCount} 条温和复盘提醒，${data.result.skippedDueToCooldown} 条处于冷却中。`
      );
      setSelectedReminderStudentIds([]);
      await loadReport();
    });
  }

  async function batchAssignNextRoundTasks(taskType: "variant_challenge" | "prerequisite_consolidation") {
    if (!selectedReminderStudentIds.length) return;
    const label = taskType === "variant_challenge" ? "变式题挑战" : "前置知识巩固";
    await withTeacherPending(`batch-next-${taskType}`, `正在批量分配${label}任务...`, async () => {
      const response = await fetch(`/api/teacher/classes/review-tasks/next-round?${buildReportParams().toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedReminderStudentIds,
          taskType
        })
      });
      if (!response.ok) {
        setMessage("下一轮复盘任务暂时没有分配成功，请稍后再试。");
        return;
      }
      const data = (await response.json()) as { result: { studentCount: number; assignedCount: number; skippedCount: number } };
      setMessage(
        `已为 ${data.result.studentCount} 名学生检查${label}条件，成功分配 ${data.result.assignedCount} 个任务，${data.result.skippedCount} 名学生暂不满足条件。`
      );
      setSelectedReminderStudentIds([]);
      await loadReport();
    });
  }

  async function saveReviewTaskFeedback(task: StudentDetail["reviewTasks"][number]) {
    if (!studentDetail) return;
    const feedbackNote = (feedbackDrafts[task.id] ?? "").trim();
    if (!feedbackNote) {
      setMessage("请先写一句老师备注，再保存。");
      return;
    }
    await withTeacherPending(`feedback-${task.id}`, "正在保存老师备注...", async () => {
      const response = await fetch(
        `/api/teacher/classes/students/${studentDetail.studentId}/review-tasks/${task.id}/feedback?${buildReportParams().toString()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedbackNote })
        }
      );
      if (!response.ok) {
        setMessage("老师备注暂时没有保存成功，请稍后再试。");
        return;
      }
      setMessage(`已保存 ${studentDetail.displayName} 的${task.taskTypeLabel}反馈。`);
      await loadReport();
      await loadStudentDetail(studentDetail.studentId);
    });
  }

  function toggleReminderStudent(studentId: string) {
    setSelectedReminderStudentIds((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]
    );
  }

  async function applyReviewGroupFilter(groupKey: string) {
    setReviewGroupFilter(groupKey);
    setMessage(`已按「${reviewGroupLabel(groupKey)}」筛出复盘跟进名单。`);
    await withTeacherPending("review-group-filter", "正在刷新分层复盘名单...", async () => loadReport({ reviewGroupFilter: groupKey }));
  }

  const selectedClassScope = classScopes.find((item) => item.classId === classIdFilter);
  const classScopePlaceholder = classScopes.length ? "请选择班级" : "暂无授权班级";
  const activeFilterCount = [
    gradeFilter !== "all",
    reviewStatusFilter !== "all",
    reminderStatusFilter !== "all",
    retestStatusFilter !== "all",
    reviewGroupFilter !== "all",
    reviewTaskTypeFilter !== "all",
    feedbackStatusFilter !== "all",
    Boolean(startDate),
    Boolean(endDate)
  ].filter(Boolean).length;
  const classHealthScore = report
    ? Math.round(report.accuracy * 0.45 + report.retestSummary.successRate * 0.3 + report.nextRoundSummary.completionRate * 0.25)
    : 0;
  const reviewCompletionRate = report?.reviewTrend.assignedCount
    ? Math.round((report.reviewTrend.completedCount / report.reviewTrend.assignedCount) * 100)
    : 0;
  const topWeakKnowledgePoints = report?.weakKnowledgePoints.slice(0, 4) ?? [];

  async function openKnowledgePointStudents(knowledgePointId: string, knowledgePointName: string) {
    await withTeacherPending(`knowledge-point-${knowledgePointId}`, `正在打开「${knowledgePointName}」相关学生名单...`, async () =>
      loadKnowledgePointStudents(knowledgePointId)
    );
  }

  async function openStudentDetail(studentId: string, displayName?: string) {
    await withTeacherPending(`student-${studentId}`, `正在打开${displayName ? `「${displayName}」` : "学生"}的个人下钻...`, async () =>
      loadStudentDetail(studentId)
    );
  }

  return (
    <main className="page-shell teacher-page">
      <header className="teacher-header">
        <div>
          <p className="eyebrow">老师端</p>
          <h1>班级诊断看板</h1>
          <p className="teacher-header-copy">从班级概况进入薄弱知识点、学生错题、复盘跟进和课堂讲评素材。</p>
        </div>
        <div className="teacher-hero-visual" aria-hidden="true">
          <BeakerIcon level={report ? Math.min(0.92, Math.max(0.24, report.accuracy / 100)) : 0.56} size="md" />
          <MoleculePath activeIndex={report ? Math.min(5, Math.max(1, Math.round(report.retestSummary.successRate / 20))) : 2} size="sm" />
        </div>
        <div className="teacher-header-actions">
          <button className="secondary-button" disabled={!report} type="button" onClick={exportReport}>
            导出报告
          </button>
          <button className="secondary-button" disabled={!report} type="button" onClick={exportReviewFollowups}>
            导出复盘跟进
          </button>
          <button
            className="secondary-button"
            disabled={isBusy}
            type="button"
            onClick={() => void withTeacherPending("report-refresh", "正在刷新班级报告...", async () => loadReport())}
          >
            {pendingAction === "report-refresh" ? "刷新中" : "刷新报告"}
          </button>
        </div>
      </header>

      <section className="teacher-auth">
        {teacher ? (
          <div className="teacher-account-card">
            <div className="teacher-account-title">
              <div>
                <p className="eyebrow">当前老师</p>
                <strong>{teacher.displayName}</strong>
              </div>
              {selectedClassScope ? (
                <span className="teacher-role-pill">{teacherClassRoleLabel(selectedClassScope.role)}</span>
              ) : null}
            </div>
            <OperationNotice message={message} busy={isBusy} />
            <div className="teacher-class-workspace">
              <label className="teacher-class-picker">
                <span>我的班级</span>
                <select
                  disabled={!classScopes.length}
                  value={classScopes.some((item) => item.classId === classIdFilter) ? classIdFilter : ""}
                  onChange={(event) => void changeClassScope(event.target.value)}
                >
                  <option value="" disabled>
                    {classScopePlaceholder}
                  </option>
                  {classScopes.map((scope) => (
                    <option key={scope.classId} value={scope.classId}>
                      {scope.label}{scope.grade ? ` · ${scope.grade}` : ""}{scope.role === "head_teacher" ? " · 班主任" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="secondary-button compact"
                disabled={isBusy}
                type="button"
                onClick={() => void withTeacherPending("class-refresh", "正在刷新老师授权班级...", async () => loadTeacherClasses())}
              >
                {pendingAction === "class-refresh" ? "刷新中" : "刷新班级"}
              </button>
              {selectedClassScope ? (
                <div className="teacher-class-current" aria-label="当前班级概况">
                  <span>当前班级</span>
                  <strong>{selectedClassScope.label}</strong>
                  <small>
                    {selectedClassScope.schoolName ? `${selectedClassScope.schoolName} · ` : ""}
                    {selectedClassScope.grade ? `${selectedClassScope.grade} · ` : ""}
                    {selectedClassScope.studentCount !== undefined ? `${selectedClassScope.studentCount} 名学生` : "学生数待同步"}
                  </small>
                </div>
              ) : null}
              <details className="teacher-class-advanced">
                <summary>高级：输入班级 ID</summary>
                <label className="teacher-class-scope">
                  <span>班级 ID</span>
                  <input value={classIdFilter} onChange={(event) => setClassIdFilter(event.target.value)} />
                  <button
                    className="secondary-button compact"
                    disabled={isBusy}
                    type="button"
                    onClick={() => void withTeacherPending("class-read", "正在读取班级报告...", async () => loadReport())}
                  >
                    {pendingAction === "class-read" ? "读取中" : "读取班级"}
                  </button>
                </label>
              </details>
            </div>
          </div>
        ) : (
          <form onSubmit={submitAuth}>
            <div>
              <p className="eyebrow">老师账号</p>
              <OperationNotice message={message} busy={isBusy} />
            </div>
            <input aria-label="老师用户名" placeholder="用户名" value={username} onChange={(event) => setUsername(event.target.value)} />
            <input
              aria-label="老师密码"
              placeholder="密码"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button className="secondary-button" type="button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
              {authMode === "login" ? "注册老师账号" : "去登录"}
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setAuthMode("login");
                setUsername(demoTeacherAccount.username);
                setPassword(demoTeacherAccount.password);
                setMessage("已填入演示老师账号，点击登录即可查看示范班级报告。");
              }}
            >
              演示账号
            </button>
            <button className="primary-button compact" disabled={!username || !password} type="submit">
              {authMode === "login" ? "登录" : "注册并进入"}
            </button>
          </form>
        )}
      </section>

      {report ? (
        <>
          <section className="teacher-filter-shell" aria-label="班级报告筛选">
            <div className="teacher-filter-header">
              <div>
                <p className="eyebrow">报告筛选</p>
                <h2>先选班级，再看复盘与讲评重点</h2>
              </div>
              <span className={activeFilterCount ? "filter-chip active" : "filter-chip"}>
                {activeFilterCount ? `已启用 ${activeFilterCount} 项筛选` : "当前为全量视图"}
              </span>
            </div>
            <div className="teacher-filters">
              <label>
                <span>班级</span>
                <select
                  disabled={!classScopes.length}
                  value={classScopes.some((item) => item.classId === classIdFilter) ? classIdFilter : ""}
                  onChange={(event) => void changeClassScope(event.target.value)}
                >
                  <option value="" disabled>
                    {classScopePlaceholder}
                  </option>
                  {classScopes.map((scope) => (
                    <option key={scope.classId} value={scope.classId}>
                      {scope.label}{scope.grade ? ` · ${scope.grade}` : ""}{scope.role === "head_teacher" ? " · 班主任" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>年级</span>
                <select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}>
                  <option value="all">全部年级</option>
                  <option value="初三">初三</option>
                  <option value="高一">高一</option>
                  <option value="高二">高二</option>
                  <option value="高三">高三</option>
                </select>
              </label>
              <label>
                <span>复盘状态</span>
                <select value={reviewStatusFilter} onChange={(event) => setReviewStatusFilter(event.target.value)}>
                  <option value="all">全部学生</option>
                  <option value="assigned">有待完成复盘</option>
                  <option value="completed">有已完成复盘</option>
                  <option value="none">暂无复盘任务</option>
                </select>
              </label>
              <label>
                <span>提醒状态</span>
                <select value={reminderStatusFilter} onChange={(event) => setReminderStatusFilter(event.target.value)}>
                  <option value="all">全部提醒状态</option>
                  <option value="not_reminded">待提醒</option>
                  <option value="reminded">已提醒</option>
                  <option value="cooldown">提醒冷却中</option>
                </select>
              </label>
              <label>
                <span>复测结果</span>
                <select value={retestStatusFilter} onChange={(event) => setRetestStatusFilter(event.target.value)}>
                  <option value="all">全部复测结果</option>
                  <option value="success">已迁移成功</option>
                  <option value="needs_consolidation">继续巩固中</option>
                  <option value="pending">待复测</option>
                  <option value="none">暂无复测任务</option>
                </select>
              </label>
              <label>
                <span>复盘分层</span>
                <select value={reviewGroupFilter} onChange={(event) => setReviewGroupFilter(event.target.value)}>
                  <option value="all">全部分层</option>
                  <option value="needs_consolidation">继续巩固中</option>
                  <option value="pending_retest">待复测</option>
                  <option value="ready_for_challenge">可挑战变式</option>
                  <option value="needs_assignment">需要分配复盘</option>
                </select>
              </label>
              <label>
                <span>任务类型</span>
                <select value={reviewTaskTypeFilter} onChange={(event) => setReviewTaskTypeFilter(event.target.value)}>
                  <option value="all">全部任务</option>
                  <option value="review">错题复盘</option>
                  <option value="variant_challenge">变式题挑战</option>
                  <option value="prerequisite_consolidation">前置知识巩固</option>
                </select>
              </label>
              <label>
                <span>备注状态</span>
                <select value={feedbackStatusFilter} onChange={(event) => setFeedbackStatusFilter(event.target.value)}>
                  <option value="all">全部备注状态</option>
                  <option value="noted">已有老师备注</option>
                  <option value="pending_feedback">待写老师备注</option>
                </select>
              </label>
              <label>
                <span>开始日期</span>
                <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </label>
              <label>
                <span>结束日期</span>
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </label>
              <label>
                <span>冷却小时</span>
                <input value={reminderCooldownHours} onChange={(event) => setReminderCooldownHours(event.target.value)} />
              </label>
              <button
                className="primary-button compact"
                disabled={isBusy}
                type="button"
                onClick={() => void withTeacherPending("filter-apply", "正在按当前条件刷新报告...", async () => loadReport())}
              >
                {pendingAction === "filter-apply" ? "筛选中" : "应用筛选"}
              </button>
            </div>
          </section>

          <section className="teacher-metrics">
            <Metric label="学生数" value={report.studentCount} />
            <Metric label="作答数" value={report.answerCount} />
            <Metric label="正确率" value={`${report.accuracy}%`} />
            <Metric label="补救路径" value={report.remediationCount} />
            <Metric label="平均用时" value={`${report.averageDurationSeconds}s`} />
          </section>

          <section className="teacher-health-board" aria-label="班级健康度">
            <div className="teacher-health-card">
              <ProgressRing value={classHealthScore} label="班级健康度" tone={classHealthScore >= 70 ? "green" : "orange"} />
              <div>
                <p className="eyebrow">班级健康度</p>
                <h2>{classHealthScore} 分</h2>
                <p>
                  综合正确率、复测迁移和下一轮任务完成度。建议先处理薄弱知识点和待复测学生。
                </p>
                <div className="teacher-health-badges">
                  <Badge tone="teal">正确率 {report.accuracy}%</Badge>
                  <Badge tone="green">复测 {report.retestSummary.successRate}%</Badge>
                  <Badge tone="orange">任务 {report.nextRoundSummary.completionRate}%</Badge>
                </div>
              </div>
            </div>
            <div className="teacher-health-stats">
              <StatCard label="复盘完成率" value={`${reviewCompletionRate}%`} helper={`${report.reviewTrend.completedCount}/${report.reviewTrend.assignedCount || 0} 条`} tone="teal" />
              <StatCard label="待提醒" value={report.students.reduce((sum, student) => sum + student.remindableReviewCount, 0)} helper="可批量跟进" tone="orange" />
              <StatCard label="老师备注" value={report.teacherFeedbackSummary.notedCount} helper="可生成讲评素材" tone="blue" />
            </div>
            <div className="teacher-weak-chart">
              <div className="teacher-weak-chart-head">
                <div>
                  <p className="eyebrow">薄弱知识点</p>
                  <strong>优先讲评顺序</strong>
                </div>
                <RewardBadge size="sm" variant="review" />
              </div>
              {topWeakKnowledgePoints.length ? (
                topWeakKnowledgePoints.map((point) => {
                  const maxWrong = Math.max(...topWeakKnowledgePoints.map((item) => item.wrongCount), 1);
                  return (
                    <button
                      className="teacher-weak-bar"
                      key={point.knowledgePointId}
                      type="button"
                      onClick={() => void openKnowledgePointStudents(point.knowledgePointId, point.name)}
                    >
                      <span>{point.name}</span>
                      <strong>{point.wrongCount} 次</strong>
                      <em style={{ width: `${Math.max(12, Math.round((point.wrongCount / maxWrong) * 100))}%` }} />
                    </button>
                  );
                })
              ) : (
                <p className="muted-copy">当前筛选范围内暂无明显薄弱知识点。</p>
              )}
            </div>
          </section>

          <section className="card teacher-panel retest-summary-panel">
            <div>
              <p className="eyebrow">复测迁移汇总</p>
              <h2>从“会复盘”到“会迁移”</h2>
              <p>{report.retestSummary.suggestion}</p>
            </div>
            <div className="retest-summary-metrics">
              <span>已迁移成功 <strong>{report.retestSummary.successfulCount}</strong></span>
              <span>继续巩固中 <strong>{report.retestSummary.needsConsolidationCount}</strong></span>
              <span>待复测 <strong>{report.retestSummary.pendingCount}</strong></span>
              <span>复测成功率 <strong>{report.retestSummary.successRate}%</strong></span>
            </div>
          </section>

          <section className="teacher-grid review-management-grid">
            <section className="card teacher-panel">
              <p className="eyebrow">复盘趋势</p>
              <h2>近 {report.reviewTrend.windowDays} 天推进</h2>
              <div className="review-trend-metrics">
                <span>分配 <strong>{report.reviewTrend.assignedCount}</strong></span>
                <span>完成 <strong>{report.reviewTrend.completedCount}</strong></span>
                <span>提醒 <strong>{report.reviewTrend.remindedCount}</strong></span>
                <span>复测 <strong>{report.reviewTrend.retestedCount}</strong></span>
              </div>
              <p>{report.reviewTrend.suggestion}</p>
            </section>

            <section className="card teacher-panel">
              <p className="eyebrow">分层复盘建议</p>
              <h2>先抓关键组</h2>
              {report.reviewGroups.length ? (
                report.reviewGroups.map((group) => (
                  <div className="review-group-row" key={group.groupKey}>
                    <strong>{group.label}</strong>
                    <span>{group.studentCount} 人</span>
                    <p>{group.suggestion}</p>
                    <button className="text-button" disabled={isBusy} type="button" onClick={() => void applyReviewGroupFilter(group.groupKey)}>
                      {pendingAction === "review-group-filter" ? "筛选中" : "筛选此组"}
                    </button>
                  </div>
                ))
              ) : (
                <p className="muted-copy">当前筛选范围内暂无可分层复盘的学生。</p>
              )}
            </section>

            <section className="card teacher-panel next-round-panel">
              <p className="eyebrow">下一轮任务</p>
              <h2>跟踪变式与前置巩固</h2>
              <div className="next-round-metrics">
                <span>变式待完成 <strong>{report.nextRoundSummary.variantAssignedCount}</strong></span>
                <span>变式已完成 <strong>{report.nextRoundSummary.variantCompletedCount}</strong></span>
                <span>前置待完成 <strong>{report.nextRoundSummary.prerequisiteAssignedCount}</strong></span>
                <span>前置已完成 <strong>{report.nextRoundSummary.prerequisiteCompletedCount}</strong></span>
                <span>完成率 <strong>{report.nextRoundSummary.completionRate}%</strong></span>
              </div>
              <p>{report.nextRoundSummary.suggestion}</p>
              <div className="next-round-breakdown-list">
                {report.nextRoundSummary.taskBreakdown.map((item) => (
                  <article className="next-round-breakdown" key={item.taskType}>
                    <div className="next-round-breakdown-title">
                      <strong>{item.label}</strong>
                      <span>完成率 {item.completionRate}%</span>
                    </div>
                    <div className="next-round-feedback">
                      <p>{item.completionFeedback}</p>
                      <p>{item.teachingSuggestion}</p>
                      <span>老师备注 {item.teacherFeedbackCount} 条</span>
                    </div>
                    <div className="next-round-student-columns">
                      <NextRoundStudentList label="待完成学生" students={item.assignedStudents} onSelect={(studentId) => void openStudentDetail(studentId)} />
                      <NextRoundStudentList label="已完成学生" students={item.completedStudents} onSelect={(studentId) => void openStudentDetail(studentId)} />
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="card teacher-panel teacher-feedback-summary">
              <p className="eyebrow">老师备注讲评清单</p>
              <h2>把复盘观察变成课堂素材</h2>
              <div className="teacher-feedback-metrics">
                <span>已有备注 <strong>{report.teacherFeedbackSummary.notedCount}</strong></span>
                <span>待写备注 <strong>{report.teacherFeedbackSummary.pendingFeedbackCount}</strong></span>
              </div>
              <p>{report.teacherFeedbackSummary.suggestion}</p>
              <div className="teacher-feedback-checklist">
                {report.teacherFeedbackSummary.teachingChecklist.length ? (
                  report.teacherFeedbackSummary.teachingChecklist.map((item) => (
                    <article className="teacher-feedback-item" key={`${item.studentId}-${item.feedbackAt ?? item.feedbackNote}`}>
                      <div>
                        <button className="text-button" disabled={isBusy} type="button" onClick={() => void openStudentDetail(item.studentId, item.displayName)}>
                          {item.displayName}
                        </button>
                        <span>{item.taskTypeLabel} · {item.knowledgePointName}</span>
                      </div>
                      <p>{item.feedbackNote}</p>
                      <em>{item.teachingSuggestion}</em>
                      {item.feedbackAt ? <small>{new Date(item.feedbackAt).toLocaleString("zh-CN")}</small> : null}
                    </article>
                  ))
                ) : (
                  <p className="muted-copy">保存学生复盘后的老师备注后，这里会自动汇总可讲评素材。</p>
                )}
              </div>
            </section>

            <section className="card teacher-panel teaching-materials-panel">
              <div className="teaching-materials-title">
                <div>
                  <p className="eyebrow">课堂讲评素材</p>
                  <h2>模板与导出</h2>
                </div>
                <div className="teaching-material-actions">
                  <button className="secondary-button compact" disabled={!teachingMaterials} type="button" onClick={() => exportTeachingMaterials("csv")}>
                    导出 CSV
                  </button>
                  <button className="secondary-button compact" disabled={!teachingMaterials} type="button" onClick={() => exportTeachingMaterials("markdown")}>
                    导出 Markdown
                  </button>
                </div>
              </div>
              <div className="teaching-material-controls">
                <label>
                  <span>知识点</span>
                  <select value={materialKnowledgePointId} onChange={(event) => setMaterialKnowledgePointId(event.target.value)}>
                    <option value="all">全部知识点</option>
                    {report.weakKnowledgePoints.map((point) => (
                      <option key={point.knowledgePointId} value={point.knowledgePointId}>
                        {point.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>分组</span>
                  <select value={materialGroupBy} onChange={(event) => setMaterialGroupBy(event.target.value as typeof materialGroupBy)}>
                    <option value="knowledge_point">按知识点</option>
                    <option value="task_type">按任务类型</option>
                    <option value="student">按学生</option>
                    <option value="feedback_status">按备注状态</option>
                  </select>
                </label>
                <button
                  className="primary-button compact"
                  disabled={isBusy}
                  type="button"
                  onClick={() => void withTeacherPending("materials-refresh", "正在更新课堂讲评素材...", async () => loadTeachingMaterials())}
                >
                  {pendingAction === "materials-refresh" ? "更新中" : "更新素材"}
                </button>
              </div>
              {teachingMaterials ? (
                <>
                  <div className="teaching-template-box">
                    <strong>{teachingMaterials.template.title}</strong>
                    <p>{teachingMaterials.template.scopeSummary}</p>
                    <p>{teachingMaterials.template.opening}</p>
                    <div className="teaching-template-columns">
                      <TemplateList title="板书" items={teachingMaterials.template.boardPlan} />
                      <TemplateList title="步骤" items={teachingMaterials.template.teachingSteps} />
                      <TemplateList title="活动" items={teachingMaterials.template.studentActivities} />
                      <TemplateList title="跟进" items={teachingMaterials.template.afterClassActions} />
                    </div>
                  </div>
                  <div className="teaching-material-groups">
                    {teachingMaterials.groups.length ? (
                      teachingMaterials.groups.map((group) => (
                        <article className="teaching-material-group" key={group.groupKey}>
                          <div>
                            <strong>{group.label}</strong>
                            <span>{group.materialCount} 条 · {group.studentCount} 人</span>
                          </div>
                          <p>{group.suggestion}</p>
                        </article>
                      ))
                    ) : (
                      <p className="muted-copy">当前筛选范围内暂无素材分组。</p>
                    )}
                  </div>
                  <div className="teaching-material-list">
                    {teachingMaterials.materials.slice(0, 6).map((material) => (
                      <article className="teaching-material-item" key={material.materialId}>
                        <div>
                          <strong>{material.displayName}</strong>
                          <span>{material.taskTypeLabel} · {material.knowledgePointName} · {feedbackStatusLabel(material.feedbackStatus)}</span>
                        </div>
                        <p>{material.teacherFeedbackNote ?? material.studentReviewNote ?? material.completionFeedback}</p>
                        <em>{material.teachingSuggestion}</em>
                        <small>{material.question.isPublished ? material.question.stem : material.question.contentNotice}</small>
                      </article>
                    ))}
                    {!teachingMaterials.materials.length ? <p className="muted-copy">学生完成复盘或二次任务后，这里会生成可导出的讲评素材。</p> : null}
                  </div>
                </>
              ) : (
                <p className="muted-copy">刷新报告后会生成课堂讲评素材。</p>
              )}
            </section>
          </section>

          <section className="teacher-grid">
            <section className="card teacher-panel">
              <p className="eyebrow">班级薄弱知识点</p>
              <h2>优先讲评</h2>
              {report.weakKnowledgePoints.length ? (
                report.weakKnowledgePoints.map((point) => (
                  <div className="teacher-row" key={point.knowledgePointId}>
                    <div>
                      <strong>{point.name}</strong>
                      <button
                        className="text-button"
                        disabled={isBusy}
                        type="button"
                        onClick={() => void openKnowledgePointStudents(point.knowledgePointId, point.name)}
                      >
                        {pendingAction === `knowledge-point-${point.knowledgePointId}` ? "打开中" : "查看学生"}
                      </button>
                    </div>
                    <span>{point.wrongCount} 次出错</span>
                  </div>
                ))
              ) : (
                <p className="muted-copy">暂未形成集中薄弱点。</p>
              )}
            </section>

            <section className="card teacher-panel">
              <p className="eyebrow">讲评建议</p>
              <h2>下一步</h2>
              {report.teachingSuggestions.map((suggestion) => (
                <p key={suggestion}>{suggestion}</p>
              ))}
            </section>
          </section>

          {knowledgePointBreakdown ? (
            <section className="card teacher-panel teacher-breakdown">
              <p className="eyebrow">知识点下钻</p>
              <h2>{knowledgePointBreakdown.knowledgePointName}</h2>
              {knowledgePointBreakdown.students.length ? (
                knowledgePointBreakdown.students.map((student) => (
                  <div className="student-breakdown-row" key={student.studentId}>
                    <strong>{student.displayName}</strong>
                    <span>{student.answerCount} 次作答</span>
                    <span>{student.wrongCount} 次需巩固</span>
                    <span>正确率 {student.accuracy}%</span>
                    <span>补救 {student.remediationCount}</span>
                    <p>{student.suggestion}</p>
                  </div>
                ))
              ) : (
                <p className="muted-copy">当前筛选范围内暂无相关学生记录。</p>
              )}
            </section>
          ) : null}

          {studentDetail ? (
            <section className="card teacher-panel teacher-breakdown">
              <p className="eyebrow">学生个人下钻</p>
              <div className="student-detail-title">
                <h2>{studentDetail.displayName}</h2>
                <div>
                  <button className="secondary-button compact" type="button" onClick={exportStudentWrongQuestions}>
                    导出错题
                  </button>
                  <button
                    className="primary-button compact"
                    disabled={!studentDetail.wrongQuestions.length || pendingAction === "review-task-assign"}
                    type="button"
                    onClick={assignStudentReviewTasks}
                  >
                    {pendingAction === "review-task-assign" ? "分配中" : "分配复盘"}
                  </button>
                  <button
                    className="secondary-button compact"
                    disabled={!studentDetail.reviewTaskSummary.assignedCount || pendingAction === "review-task-remind"}
                    type="button"
                    onClick={remindStudentReviewTasks}
                  >
                    {pendingAction === "review-task-remind" ? "提醒中" : "提醒复盘"}
                  </button>
                </div>
              </div>
              <div className="student-detail-metrics">
                <span>{studentDetail.answerCount} 次作答</span>
                <span>{studentDetail.wrongCount} 次需巩固</span>
                <span>正确率 {studentDetail.accuracy}%</span>
                <span>补救 {studentDetail.remediationCount}</span>
                <span>复盘待完成 {studentDetail.reviewTaskSummary.assignedCount}</span>
                <span>已完成复盘 {studentDetail.reviewTaskSummary.completedCount}</span>
                <span>变式待完成 {studentDetail.reviewTaskSummary.variantChallengeAssignedCount}</span>
                <span>前置待完成 {studentDetail.reviewTaskSummary.prerequisiteConsolidationAssignedCount}</span>
              </div>
              <div className="student-detail-section">
                <strong>下一步建议</strong>
                {studentDetail.suggestions.map((suggestion) => (
                  <p key={suggestion}>{suggestion}</p>
                ))}
              </div>
              {studentDetail.weakKnowledgePoints.length ? (
                <div className="student-detail-section">
                  <strong>个人薄弱知识点</strong>
                  {studentDetail.weakKnowledgePoints.map((point) => (
                    <p key={point.knowledgePointId}>{point.name}：{point.wrongCount} 次需巩固。{point.suggestion}</p>
                  ))}
                </div>
              ) : null}
              <div className="student-detail-section">
                <strong>复盘任务反馈</strong>
                {studentDetail.reviewTasks.length ? (
                  studentDetail.reviewTasks.map((task) => (
                    <div className={task.status === "completed" ? "review-task-row completed" : "review-task-row"} key={task.id}>
                      <span>{task.taskTypeLabel} · {task.knowledgePointName} · {task.status === "completed" ? "已完成" : "待完成"}</span>
                      <strong>{task.stem}</strong>
                      {task.reviewNote ? <p>学生复盘笔记：{task.reviewNote}</p> : null}
                      {task.reminderCount > 0 ? (
                        <p>
                          已提醒 {task.reminderCount} 次{task.lastReminderAt ? `，最近提醒：${new Date(task.lastReminderAt).toLocaleString("zh-CN")}` : ""}
                        </p>
                      ) : null}
                      {task.retestCompletedAt ? (
                        <p>
                          复测结果：{task.retestIsCorrect ? "迁移成功" : "继续巩固中"}，时间：
                          {new Date(task.retestCompletedAt).toLocaleString("zh-CN")}
                        </p>
                      ) : null}
                      {task.status === "completed" ? (
                        <div className="teacher-feedback-box">
                          <p>{task.completionFeedback}</p>
                          <p>{task.teachingSuggestion}</p>
                          {task.teacherFeedbackNote ? (
                            <p>
                              老师备注：{task.teacherFeedbackNote}
                              {task.teacherFeedbackAt ? `（${new Date(task.teacherFeedbackAt).toLocaleString("zh-CN")}）` : ""}
                            </p>
                          ) : null}
                          <textarea
                            aria-label={`${task.taskTypeLabel}老师备注`}
                            maxLength={500}
                            placeholder="写一句给后续讲评用的观察或建议"
                            value={feedbackDrafts[task.id] ?? ""}
                            onChange={(event) => setFeedbackDrafts((current) => ({ ...current, [task.id]: event.target.value }))}
                          />
                          <button
                            className="secondary-button compact"
                            disabled={pendingAction === `feedback-${task.id}`}
                            type="button"
                            onClick={() => saveReviewTaskFeedback(task)}
                          >
                            {pendingAction === `feedback-${task.id}` ? "保存中" : "保存备注"}
                          </button>
                        </div>
                      ) : null}
                      {task.completedAt ? <p>完成时间：{new Date(task.completedAt).toLocaleString("zh-CN")}</p> : <p>学生完成后这里会自动更新。</p>}
                    </div>
                  ))
                ) : (
                  <p className="muted-copy">还没有分配复盘任务。</p>
                )}
              </div>
              <div className="student-detail-section">
                <strong>错题清单</strong>
                {studentDetail.wrongQuestions.length ? (
                  studentDetail.wrongQuestions.map((question) => (
                    <div className="wrong-question-row" key={question.answerRecordId}>
                      <span>{question.knowledgePointName} · {question.questionType} · {question.durationSeconds}s</span>
                      <strong>{question.stem}</strong>
                      <p>学生答案：{question.selectedAnswer || "空"}；参考答案：{question.correctAnswer}</p>
                      <p>{question.analysis}</p>
                      <em>{question.suggestion}</em>
                    </div>
                  ))
                ) : (
                  <p className="muted-copy">当前筛选范围内暂无错题记录。</p>
                )}
              </div>
            </section>
          ) : null}

          <section className="teacher-grid teacher-review-grid">
            <section className="card teacher-panel">
              <p className="eyebrow">题型错题讲评</p>
              <h2>审题方法</h2>
              {report.weakQuestionTypes.length ? (
                report.weakQuestionTypes.map((item) => (
                  <div className="teacher-insight-row" key={item.questionType}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.wrongCount}/{item.answerCount} 次出错 · 错误率 {item.wrongRate}%</span>
                    </div>
                    <p>{item.suggestion}</p>
                  </div>
                ))
              ) : (
                <p className="muted-copy">暂未形成集中题型问题。</p>
              )}
            </section>

            <section className="card teacher-panel">
              <p className="eyebrow">核心素养讲评</p>
              <h2>能力落点</h2>
              {report.weakCoreLiteracy.length ? (
                report.weakCoreLiteracy.map((item) => (
                  <div className="teacher-insight-row" key={item.literacyTag}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.wrongCount}/{item.answerCount} 次出错 · 错误率 {item.wrongRate}%</span>
                    </div>
                    <p>{item.suggestion}</p>
                  </div>
                ))
              ) : (
                <p className="muted-copy">暂未形成集中核心素养问题。</p>
              )}
            </section>
          </section>

          <section className="card teacher-panel teacher-students">
            <div className="teacher-section-title">
              <div>
                <p className="eyebrow">学生表现</p>
                <h2>个人诊断摘要</h2>
              </div>
              <span>{report.students.length} 名学生 · 已选 {selectedReminderStudentIds.length} 人</span>
            </div>
            <div className="teacher-batch-actions">
              <button
                className="secondary-button compact"
                disabled={!selectedReminderStudentIds.length || pendingAction === "batch-remind"}
                type="button"
                onClick={batchRemindSelectedStudents}
              >
                {pendingAction === "batch-remind" ? "提醒中" : `批量提醒 ${selectedReminderStudentIds.length} 人`}
              </button>
              <button
                className="secondary-button compact"
                disabled={!selectedReminderStudentIds.length || pendingAction === "batch-next-variant_challenge"}
                type="button"
                onClick={() => batchAssignNextRoundTasks("variant_challenge")}
              >
                {pendingAction === "batch-next-variant_challenge" ? "分配中" : `批量分配变式 ${selectedReminderStudentIds.length} 人`}
              </button>
              <button
                className="secondary-button compact"
                disabled={!selectedReminderStudentIds.length || pendingAction === "batch-next-prerequisite_consolidation"}
                type="button"
                onClick={() => batchAssignNextRoundTasks("prerequisite_consolidation")}
              >
                {pendingAction === "batch-next-prerequisite_consolidation" ? "分配中" : `批量分配前置巩固 ${selectedReminderStudentIds.length} 人`}
              </button>
            </div>
            {report.students.length ? (
              <div className="teacher-table-scroll" role="region" aria-label="学生个人诊断摘要横向表格">
                {report.students.map((student) => (
                  <div className="student-report-row" key={student.studentId}>
                    <label className="student-reminder-check">
                      <input
                        checked={selectedReminderStudentIds.includes(student.studentId)}
                        type="checkbox"
                        onChange={() => toggleReminderStudent(student.studentId)}
                      />
                      <span>跟进</span>
                    </label>
                    <strong>{student.displayName}</strong>
                    <span>{student.answerCount} 次作答</span>
                    <span>正确率 {student.accuracy}%</span>
                    <span>补救 {student.remediationCount}</span>
                    <span>待复盘 {student.assignedReviewCount}</span>
                    <span>已复盘 {student.completedReviewCount}</span>
                    <span>可提醒 {student.remindableReviewCount}</span>
                    <span>提醒 {student.reviewReminderCount}</span>
                    <span>迁移成功 {student.successfulRetestCount}</span>
                    <span>继续巩固 {student.needsConsolidationRetestCount}</span>
                    <span>待复测 {student.pendingRetestCount}</span>
                    <span>变式 {student.variantChallengeTaskCount}</span>
                    <span>前置巩固 {student.prerequisiteConsolidationTaskCount}</span>
                    <span>老师备注 {student.teacherFeedbackCount}</span>
                    <span>待写备注 {student.pendingTeacherFeedbackCount}</span>
                    <em>{student.totalXp} XP</em>
                    <small>{student.retestSuggestion}</small>
                    <button className="text-button" disabled={isBusy} type="button" onClick={() => void openStudentDetail(student.studentId, student.displayName)}>
                      {pendingAction === `student-${student.studentId}` ? "打开中" : "查看错题"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-copy">暂无学生学习记录。</p>
            )}
          </section>
        </>
      ) : isBusy ? (
        <TeacherReportSkeleton />
      ) : (
        <EmptyTeacherState
          title={teacher ? "还没有可展示的班级报告" : "登录后会显示班级报告"}
          description={teacher ? "如果当前老师尚未绑定班级，请联系管理员完成授权；绑定后这里会显示班级诊断、复盘和讲评素材。" : "可以使用演示账号先查看老师端工作台。"}
        />
      )}
    </main>
  );
}

function EmptyTeacherState({ title, description }: { title: string; description: string }) {
  return (
    <section className="teacher-empty-state" role="status">
      <strong>{title}</strong>
      <p>{description}</p>
    </section>
  );
}

function TeacherReportSkeleton() {
  return (
    <section className="teacher-skeleton" aria-label="正在加载老师端报告">
      <div className="teacher-skeleton-bar wide" />
      <div className="teacher-skeleton-grid">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="teacher-skeleton-card" key={index}>
            <span />
            <strong />
          </div>
        ))}
      </div>
      <div className="teacher-skeleton-columns">
        <div />
        <div />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <section className="card teacher-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function TemplateList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="template-list">
      <strong>{title}</strong>
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function NextRoundStudentList({
  label,
  students,
  onSelect
}: {
  label: string;
  students: NextRoundTaskStudent[];
  onSelect: (studentId: string) => void;
}) {
  return (
    <div className="next-round-student-list">
      <strong>{label}</strong>
      {students.length ? (
        students.map((student) => (
          <button className="text-button next-round-student" key={student.studentId} type="button" onClick={() => onSelect(student.studentId)}>
            <span>{student.displayName}</span>
            <em>{student.taskCount} 个任务</em>
          </button>
        ))
      ) : (
        <p className="muted-copy">暂无学生</p>
      )}
    </div>
  );
}

function toCooldownHours(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(168, Math.max(1, parsed)) : 24;
}

function reviewGroupLabel(groupKey: string) {
  const map: Record<string, string> = {
    needs_consolidation: "继续巩固中",
    pending_retest: "待复测",
    ready_for_challenge: "可挑战变式",
    needs_assignment: "需要分配复盘"
  };
  return map[groupKey] ?? "全部分层";
}

function feedbackStatusLabel(status: string) {
  const map: Record<string, string> = {
    noted: "已有备注",
    pending_feedback: "待写备注",
    not_ready: "待完成"
  };
  return map[status] ?? status;
}

function teacherClassRoleLabel(role: TeacherClassScope["role"]) {
  const map: Record<TeacherClassScope["role"], string> = {
    admin: "管理员视图",
    teacher: "任课教师",
    head_teacher: "班主任"
  };
  return map[role];
}
