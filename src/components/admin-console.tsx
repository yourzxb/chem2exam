"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { AuditStatus, Difficulty, Grade, KnowledgePoint, KnowledgeRelation, QuestionType, RelationType } from "@/domain/types";
import { grades } from "@/data/chemistry-seed";
import { OperationNotice } from "@/components/operation-notice";
import { Badge, ProgressRing, StatCard } from "@/components/ui";
import { BeakerIcon, KnowledgePathIllustration, MoleculePath, RewardBadge } from "@/components/visuals";

const demoAdminAccount = {
  username: "demo_admin",
  password: "Chem2Exam@2026"
};

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  role: "student" | "teacher" | "admin";
}

interface AdminDirectoryUser extends AdminUser {
  schoolId?: string | null;
  schoolName?: string | null;
  classId?: string | null;
  className?: string | null;
  status: string;
}

interface AdminQuestionListItem {
  id: string;
  grade: Grade;
  stem: string;
  answer: string;
  analysis: string;
  auditStatus: AuditStatus;
  questionType: QuestionType;
  difficulty: Difficulty;
  medianTimeSeconds: number;
  primaryKnowledgePointId: string;
  coreLiteracy: string[];
}

interface AiModelConfigItem {
  id: string;
  provider: string;
  apiBaseUrl: string;
  apiKeyMasked: string;
  modelName: string;
  maxContextTokens?: number;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutSeconds?: number;
  enabled: boolean;
  createdAt: string;
}

interface AiTaskItem {
  id: string;
  taskType: string;
  status: string;
  modelConfigId: string;
  fallbackModelConfigId?: string;
  errorMessage?: string;
  attemptCount?: number;
  usedModelConfigId?: string;
  createdAt: string;
  completedAt?: string;
}

interface ImportPaperResult {
  paperId: string;
  taskId?: string;
  createdQuestionIds: string[];
  reviewStatus: "pending_review";
}

interface QuestionFilterState {
  status: AuditStatus | "all";
  grade: Grade | "all";
  questionType: QuestionType | "all";
  knowledgePointId: string;
}

type QuestionFilterSchemeScope = "personal" | "role" | "shared";

interface SavedQuestionFilterScheme {
  id: string;
  name: string;
  description?: string;
  scopeType: QuestionFilterSchemeScope;
  role?: string;
  filters: QuestionFilterState;
  createdAt: string;
  updatedAt?: string;
}

interface BatchQuestionPreview {
  previewToken: string;
  selectedCount: number;
  affectedCount: number;
  filterSchemeId?: string;
  filtersSnapshot?: QuestionFilterState;
  changes: string[];
  items: Array<{
    id: string;
    stem: string;
    diffSummary: string[];
    current: {
      auditStatus: AuditStatus;
      difficulty: Difficulty;
      primaryKnowledgePointId: string;
      coreLiteracy: string[];
    };
    next: {
      auditStatus: AuditStatus;
      difficulty: Difficulty;
      primaryKnowledgePointId: string;
      coreLiteracy: string[];
    };
  }>;
}

interface AdminAuditRecordItem {
  id: string;
  targetType: string;
  targetId: string;
  reviewerId: string;
  action: string;
  batchId?: string;
  comment?: string;
  diffSummary: string[];
  createdAt: string;
}

interface OrganizationSchoolItem {
  id: string;
  name: string;
  region?: string;
  status: string;
  classCount: number;
}

interface OrganizationClassItem {
  id: string;
  schoolId: string;
  schoolName: string;
  name: string;
  grade?: Grade;
  status: string;
  studentCount: number;
  teacherCount: number;
}

interface ClassTeacherAssignmentItem {
  id: string;
  assignmentId: string;
  teacherId: string;
  teacherName: string;
  teacherEmail?: string | null;
  schoolName?: string;
  classId: string;
  className: string;
  grade?: Grade;
  role: "teacher" | "head_teacher" | string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

interface SchoolWeakCoreLiteracySummary {
  literacyTag: string;
  label: string;
  answerCount: number;
  wrongCount: number;
  wrongRate: number;
  suggestion: string;
}

interface SchoolClassSummary {
  classId: string;
  schoolId: string;
  schoolName: string;
  className: string;
  grade?: Grade;
  studentCount: number;
  teacherCount: number;
  answerCount: number;
  correctCount: number;
  accuracy: number;
  remediationCount: number;
}

interface SchoolSummaryItem {
  schoolId: string;
  schoolName: string;
  region?: string;
  classCount: number;
  studentCount: number;
  teacherCount: number;
  answerCount: number;
  correctCount: number;
  accuracy: number;
  remediationCount: number;
  weakCoreLiteracy: SchoolWeakCoreLiteracySummary[];
  classes: SchoolClassSummary[];
}

interface SchoolSummaryReport {
  generatedAt: string;
  scope: {
    schoolId?: string;
  };
  totals: Omit<SchoolSummaryItem, "schoolId" | "schoolName" | "region" | "classes">;
  schools: SchoolSummaryItem[];
}

interface BatchStudentAssignmentResult {
  requestedCount: number;
  assignedCount: number;
  skippedCount: number;
  notFound: string[];
  notStudent: Array<{ identifier: string; role: string }>;
}

const relationTypes: RelationType[] = ["parent", "prerequisite", "confused_with", "similar_practice", "integrated_application"];
const auditStatuses: AuditStatus[] = ["ai_processing", "pending_review", "needs_edit", "approved", "rejected", "published"];
const batchAuditStatuses: AuditStatus[] = auditStatuses.filter((status) => status !== "published");
const questionTypes: QuestionType[] = ["single_choice", "multiple_choice", "fill_blank", "short_answer", "calculation", "experiment", "inference"];
const difficulties: Difficulty[] = ["basic", "medium", "advanced", "integrated"];
const adminQuestionFilterStorageKey = "chem2exam.admin.questionFilters";
const adminBatchConfirmText = "确认批量更新";
const aiTaskTypes = [
  "paper_parse",
  "answer_alignment",
  "knowledge_linking",
  "literacy_tagging",
  "encouraging_evaluation",
  "learning_path_recommendation"
];

export function AdminConsole() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("管理员登录后可维护题库、知识点和知识图谱关系。");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AdminQuestionListItem[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [batchQuestionIds, setBatchQuestionIds] = useState<string[]>([]);
  const [questionStatusFilter, setQuestionStatusFilter] = useState<AuditStatus | "all">("all");
  const [questionGradeFilter, setQuestionGradeFilter] = useState<Grade | "all">("all");
  const [questionTypeFilter, setQuestionTypeFilter] = useState<QuestionType | "all">("all");
  const [questionKnowledgeFilter, setQuestionKnowledgeFilter] = useState("");
  const [filterSchemeName, setFilterSchemeName] = useState("");
  const [filterSchemeScope, setFilterSchemeScope] = useState<QuestionFilterSchemeScope>("personal");
  const [filterSchemeImportText, setFilterSchemeImportText] = useState("");
  const [savedQuestionFilterSchemes, setSavedQuestionFilterSchemes] = useState<SavedQuestionFilterScheme[]>([]);
  const [selectedFilterSchemeId, setSelectedFilterSchemeId] = useState("");
  const [editQuestionStem, setEditQuestionStem] = useState("");
  const [editQuestionAnswer, setEditQuestionAnswer] = useState("");
  const [editQuestionAnalysis, setEditQuestionAnalysis] = useState("");
  const [editQuestionStatus, setEditQuestionStatus] = useState<AuditStatus>("pending_review");
  const [editQuestionType, setEditQuestionType] = useState<QuestionType>("single_choice");
  const [editQuestionDifficulty, setEditQuestionDifficulty] = useState<Difficulty>("basic");
  const [editQuestionMedianTime, setEditQuestionMedianTime] = useState("60");
  const [editQuestionKnowledgePointId, setEditQuestionKnowledgePointId] = useState("");
  const [editQuestionCoreLiteracy, setEditQuestionCoreLiteracy] = useState("");
  const [batchAuditStatus, setBatchAuditStatus] = useState<AuditStatus>("needs_edit");
  const [batchDifficulty, setBatchDifficulty] = useState<Difficulty>("medium");
  const [batchKnowledgePointId, setBatchKnowledgePointId] = useState("");
  const [batchCoreLiteracy, setBatchCoreLiteracy] = useState("");
  const [batchConfirmChecked, setBatchConfirmChecked] = useState(false);
  const [batchPreview, setBatchPreview] = useState<BatchQuestionPreview | null>(null);
  const [batchReason, setBatchReason] = useState("批量维护题目元数据");
  const [batchConfirmText, setBatchConfirmText] = useState("");
  const [lastBatchOperationId, setLastBatchOperationId] = useState("");
  const [auditRecords, setAuditRecords] = useState<AdminAuditRecordItem[]>([]);
  const [auditBatchIdFilter, setAuditBatchIdFilter] = useState("");
  const [auditTargetIdFilter, setAuditTargetIdFilter] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [schools, setSchools] = useState<OrganizationSchoolItem[]>([]);
  const [classes, setClasses] = useState<OrganizationClassItem[]>([]);
  const [schoolSummaryFilter, setSchoolSummaryFilter] = useState("all");
  const [schoolSummary, setSchoolSummary] = useState<SchoolSummaryReport | null>(null);
  const [schoolName, setSchoolName] = useState("化学诊断示范学校");
  const [schoolRegion, setSchoolRegion] = useState("");
  const [classSchoolId, setClassSchoolId] = useState("");
  const [className, setClassName] = useState("初三化学诊断班");
  const [classGrade, setClassGrade] = useState<Grade>("初三");
  const [assignTeacherClassId, setAssignTeacherClassId] = useState("");
  const [assignTeacherId, setAssignTeacherId] = useState("");
  const [assignTeacherRole, setAssignTeacherRole] = useState<"teacher" | "head_teacher">("teacher");
  const [teacherRoleClassId, setTeacherRoleClassId] = useState("");
  const [classTeacherAssignments, setClassTeacherAssignments] = useState<ClassTeacherAssignmentItem[]>([]);
  const [assignStudentClassId, setAssignStudentClassId] = useState("");
  const [assignStudentId, setAssignStudentId] = useState("");
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [teacherSearchResults, setTeacherSearchResults] = useState<AdminDirectoryUser[]>([]);
  const [studentSearchResults, setStudentSearchResults] = useState<AdminDirectoryUser[]>([]);
  const [batchStudentClassId, setBatchStudentClassId] = useState("");
  const [batchStudentText, setBatchStudentText] = useState("");
  const [batchStudentResult, setBatchStudentResult] = useState<BatchStudentAssignmentResult | null>(null);
  const [points, setPoints] = useState<KnowledgePoint[]>([]);
  const [relations, setRelations] = useState<KnowledgeRelation[]>([]);
  const [pointGrade, setPointGrade] = useState<Grade>("初三");
  const [pointName, setPointName] = useState("");
  const [pointDescription, setPointDescription] = useState("");
  const [fromPointId, setFromPointId] = useState("");
  const [toPointId, setToPointId] = useState("");
  const [relationType, setRelationType] = useState<RelationType>("prerequisite");
  const [aiModels, setAiModels] = useState<AiModelConfigItem[]>([]);
  const [aiTasks, setAiTasks] = useState<AiTaskItem[]>([]);
  const [provider, setProvider] = useState("DeepSeek");
  const [apiBaseUrl, setApiBaseUrl] = useState("https://api.deepseek.com");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("deepseek-chat");
  const [maxContextTokens, setMaxContextTokens] = useState("64000");
  const [maxOutputTokens, setMaxOutputTokens] = useState("4096");
  const [temperature, setTemperature] = useState("0.2");
  const [timeoutSeconds, setTimeoutSeconds] = useState("60");
  const [taskType, setTaskType] = useState("paper_parse");
  const [taskModelId, setTaskModelId] = useState("");
  const [fallbackTaskModelId, setFallbackTaskModelId] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("2");
  const [paperTitle, setPaperTitle] = useState("2025 化学真题导入样例");
  const [paperExamType, setPaperExamType] = useState("中高考真题");
  const [paperYear, setPaperYear] = useState("2025");
  const [paperRegion, setPaperRegion] = useState("");
  const [paperGrade, setPaperGrade] = useState<Grade>("初三");
  const [paperText, setPaperText] = useState(
    "1. 下列变化中，属于化学变化的是哪一项？ A. 冰雪融化 B. 纸张燃烧 C. 酒精挥发 D. 玻璃破碎"
  );
  const [answerAnalysisText, setAnswerAnalysisText] = useState("1. 答案 B 解析：纸张燃烧生成新物质，属于化学变化。");
  const [lastImport, setLastImport] = useState<ImportPaperResult | null>(null);
  const selectedQuestion = questions.find((question) => question.id === selectedQuestionId) ?? questions[0] ?? null;
  const selectedBatchQuestions = questions.filter((question) => batchQuestionIds.includes(question.id));
  const batchCoreLiteracyTags = parseCoreLiteracyInput(batchCoreLiteracy);
  const selectedFilterScheme = savedQuestionFilterSchemes.find((scheme) => scheme.id === selectedFilterSchemeId);
  const batchTargetCount = batchPreview?.selectedCount ?? batchQuestionIds.length;
  const isBusy = Boolean(pendingAction);
  const organizationTotals = {
    schoolCount: schoolSummary?.schools.length ?? schools.length,
    classCount: schoolSummary?.totals.classCount ?? classes.length,
    studentCount: schoolSummary?.totals.studentCount ?? classes.reduce((total, item) => total + item.studentCount, 0),
    teacherCount: schoolSummary?.totals.teacherCount ?? classes.reduce((total, item) => total + item.teacherCount, 0)
  };
  const selectedSchoolLabel =
    schoolSummaryFilter === "all" ? "全部学校" : schools.find((school) => school.id === schoolSummaryFilter)?.name ?? "已选学校";
  const publishedQuestionCount = questions.filter((question) => question.auditStatus === "published").length;
  const reviewQueueQuestionCount = questions.filter((question) => question.auditStatus !== "published" && question.auditStatus !== "rejected").length;
  const enabledAiModelCount = aiModels.filter((model) => model.enabled).length;
  const organizationReadinessScore = Math.min(
    100,
    Math.round(
      (organizationTotals.schoolCount > 0 ? 25 : 0) +
        (organizationTotals.classCount > 0 ? 25 : 0) +
        (organizationTotals.teacherCount > 0 ? 25 : 0) +
        (organizationTotals.studentCount > 0 ? 25 : 0)
    )
  );
  const batchPreviewChanges = [
    `审核状态：${batchAuditStatus}`,
    `难度：${batchDifficulty}`,
    batchKnowledgePointId.trim() ? `主知识点：${batchKnowledgePointId.trim()}` : "主知识点：保持原挂接",
    batchCoreLiteracyTags.length ? `核心素养：${batchCoreLiteracyTags.join("、")}` : "核心素养：清空人工标签"
  ];

  useEffect(() => {
    const saved = window.localStorage.getItem(adminQuestionFilterStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          status?: AuditStatus | "all";
          grade?: Grade | "all";
          questionType?: QuestionType | "all";
          knowledgePointId?: string;
        };
        setQuestionStatusFilter(parsed.status ?? "all");
        setQuestionGradeFilter(parsed.grade ?? "all");
        setQuestionTypeFilter(parsed.questionType ?? "all");
        setQuestionKnowledgeFilter(parsed.knowledgePointId ?? "");
      } catch {
        window.localStorage.removeItem(adminQuestionFilterStorageKey);
      }
    }
    void fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { user?: AdminUser } | null) => {
        if (data?.user?.role === "admin") {
          setAdmin(data.user);
          void loadAdminData();
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      adminQuestionFilterStorageKey,
      JSON.stringify({
        status: questionStatusFilter,
        grade: questionGradeFilter,
        questionType: questionTypeFilter,
        knowledgePointId: questionKnowledgeFilter
      })
    );
  }, [questionStatusFilter, questionGradeFilter, questionTypeFilter, questionKnowledgeFilter]);

  useEffect(() => {
    if (!selectedQuestion) return;
    setSelectedQuestionId(selectedQuestion.id);
    setEditQuestionStem(selectedQuestion.stem);
    setEditQuestionAnswer(selectedQuestion.answer);
    setEditQuestionAnalysis(selectedQuestion.analysis);
    setEditQuestionStatus(selectedQuestion.auditStatus);
    setEditQuestionType(selectedQuestion.questionType);
    setEditQuestionDifficulty(selectedQuestion.difficulty);
    setEditQuestionMedianTime(String(selectedQuestion.medianTimeSeconds));
    setEditQuestionKnowledgePointId(selectedQuestion.primaryKnowledgePointId);
    setEditQuestionCoreLiteracy(selectedQuestion.coreLiteracy.join(", "));
  }, [selectedQuestion?.id]);

  useEffect(() => {
    setBatchConfirmChecked(false);
    setBatchConfirmText("");
    setBatchPreview(null);
  }, [batchAuditStatus, batchDifficulty, batchKnowledgePointId, batchCoreLiteracy, batchQuestionIds.join("|"), selectedFilterSchemeId]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role: "admin" })
    });

    if (!response.ok) {
      setMessage(authMode === "login" ? "管理员账号或密码不匹配。" : "管理员注册失败，请换一个用户名。");
      return;
    }

    const data = (await response.json()) as { user: AdminUser };
    if (data.user.role !== "admin") {
      setMessage("当前账号没有管理员权限。");
      return;
    }
    setAdmin(data.user);
    setUsername("");
    setPassword("");
    setMessage(`已进入 ${data.user.displayName} 的管理工作台。`);
    await loadAdminData();
  }

  function getCurrentQuestionFilters(): QuestionFilterState {
    return {
      status: questionStatusFilter,
      grade: questionGradeFilter,
      questionType: questionTypeFilter,
      knowledgePointId: questionKnowledgeFilter
    };
  }

  function persistQuestionFilterSchemes(schemes: SavedQuestionFilterScheme[]) {
    setSavedQuestionFilterSchemes(schemes);
  }

  function getBatchPayloadBase() {
    return {
      questionIds: batchQuestionIds.length ? batchQuestionIds : undefined,
      filterSchemeId: batchQuestionIds.length ? undefined : selectedFilterSchemeId || undefined,
      auditStatus: batchAuditStatus,
      difficulty: batchDifficulty,
      primaryKnowledgePointId: batchKnowledgePointId.trim() || undefined,
      coreLiteracy: batchCoreLiteracyTags
    };
  }

  async function withAdminPending(action: string, workingMessage: string, run: () => Promise<void>) {
    setPendingAction(action);
    setMessage(workingMessage);
    try {
      await run();
    } finally {
      setPendingAction((current) => (current === action ? null : current));
    }
  }

  async function saveQuestionFilterScheme() {
    const name = filterSchemeName.trim();
    if (!name) {
      setMessage("请先给筛选方案起一个名称。");
      return;
    }
    await withAdminPending("filter-scheme-save", `正在保存筛选方案“${name}”...`, async () => {
      const response = await fetch("/api/admin/question-filter-schemes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          scopeType: filterSchemeScope,
          filters: getCurrentQuestionFilters()
        })
      });
      if (!response.ok) {
        setMessage("筛选方案保存失败，请检查登录状态和筛选条件。");
        return;
      }
      const data = (await response.json()) as { scheme: SavedQuestionFilterScheme };
      const nextSchemes = [data.scheme, ...savedQuestionFilterSchemes.filter((scheme) => scheme.id !== data.scheme.id)];
      persistQuestionFilterSchemes(nextSchemes);
      setSelectedFilterSchemeId(data.scheme.id);
      setFilterSchemeName("");
      setMessage(`筛选方案“${name}”已保存到服务端，可用于预览和批量审计。`);
    });
  }

  async function updateQuestionFilterScheme() {
    const scheme = selectedFilterScheme;
    if (!scheme) {
      setMessage("请先选择一个要更新的筛选方案。");
      return;
    }
    const nextName = filterSchemeName.trim() || scheme.name;
    await withAdminPending("filter-scheme-update", `正在更新筛选方案“${nextName}”...`, async () => {
      const response = await fetch(`/api/admin/question-filter-schemes/${scheme.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nextName,
          description: scheme.description,
          scopeType: scheme.scopeType,
          role: scheme.role,
          filters: getCurrentQuestionFilters()
        })
      });
      if (!response.ok) {
        setMessage("筛选方案更新失败，可能没有权限或方案已不存在。");
        return;
      }
      const data = (await response.json()) as { scheme: SavedQuestionFilterScheme };
      persistQuestionFilterSchemes(savedQuestionFilterSchemes.map((item) => (item.id === data.scheme.id ? data.scheme : item)));
      setFilterSchemeName("");
      setMessage(`筛选方案“${data.scheme.name}”已更新为当前筛选口径。`);
    });
  }

  async function applyQuestionFilterScheme(schemeId: string) {
    const scheme = savedQuestionFilterSchemes.find((item) => item.id === schemeId);
    if (!scheme) return;
    setSelectedFilterSchemeId(scheme.id);
    setQuestionStatusFilter(scheme.filters.status);
    setQuestionGradeFilter(scheme.filters.grade);
    setQuestionTypeFilter(scheme.filters.questionType);
    setQuestionKnowledgeFilter(scheme.filters.knowledgePointId);
    setBatchQuestionIds([]);
    setBatchPreview(null);
    setMessage(`已应用筛选方案“${scheme.name}”。`);
    await loadAdminData(scheme.filters);
  }

  async function deleteQuestionFilterScheme(schemeId: string) {
    const response = await fetch(`/api/admin/question-filter-schemes/${schemeId}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage("筛选方案删除失败，可能没有权限或方案已不存在。");
      return;
    }
    const nextSchemes = savedQuestionFilterSchemes.filter((scheme) => scheme.id !== schemeId);
    persistQuestionFilterSchemes(nextSchemes);
    if (selectedFilterSchemeId === schemeId) {
      setSelectedFilterSchemeId("");
    }
    setMessage("筛选方案已删除。");
  }

  function exportQuestionFilterSchemes() {
    if (!savedQuestionFilterSchemes.length) {
      setMessage("当前还没有可导出的筛选方案。");
      return;
    }
    const exportText = JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        source: "chem2exam.admin.questionFilterSchemes.server",
        schemes: savedQuestionFilterSchemes
      },
      null,
      2
    );
    setFilterSchemeImportText(exportText);
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(exportText).catch(() => undefined);
    }
    setMessage("筛选方案已生成 JSON，并已尝试复制到剪贴板。");
  }

  function importQuestionFilterSchemes() {
    if (!filterSchemeImportText.trim()) {
      setMessage("请先粘贴筛选方案 JSON。");
      return;
    }
    try {
      const parsed = JSON.parse(filterSchemeImportText) as unknown;
      const importedSchemes = normalizeQuestionFilterSchemes(parsed);
      if (!importedSchemes.length) {
        setMessage("没有找到可导入的筛选方案，请检查 JSON 内容。");
        return;
      }
      const existingIds = new Set(savedQuestionFilterSchemes.map((scheme) => scheme.id));
      const merged = [
        ...importedSchemes.map((scheme) =>
          existingIds.has(scheme.id)
            ? { ...scheme, id: `filter_scheme_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` }
            : scheme
        ),
        ...savedQuestionFilterSchemes
      ].slice(0, 12);
      persistQuestionFilterSchemes(merged);
      setSelectedFilterSchemeId(importedSchemes[0]?.id ?? "");
      setMessage(`已导入 ${importedSchemes.length} 个筛选方案到当前页面；需要服务端复用时请重新保存。`);
    } catch {
      setMessage("筛选方案 JSON 解析失败，请确认内容完整。");
    }
  }

  async function loadAdminData(filters = getCurrentQuestionFilters()) {
    const questionParams = new URLSearchParams();
    if (filters.status !== "all") questionParams.set("status", filters.status);
    if (filters.grade !== "all") questionParams.set("grade", filters.grade);
    if (filters.questionType !== "all") questionParams.set("questionType", filters.questionType);
    if (filters.knowledgePointId.trim()) questionParams.set("knowledgePointId", filters.knowledgePointId.trim());
    const questionPath = questionParams.size ? `/api/admin/questions?${questionParams.toString()}` : "/api/admin/questions";
    const [
      questionResponse,
      pointResponse,
      relationResponse,
      modelResponse,
      taskResponse,
      schemeResponse,
      auditResponse,
      schoolResponse,
      classResponse,
      schoolSummaryResponse
    ] = await Promise.all([
      fetch(questionPath),
      fetch("/api/admin/knowledge-points"),
      fetch("/api/admin/knowledge-relations"),
      fetch("/api/admin/ai/models"),
      fetch("/api/admin/ai/tasks"),
      fetch("/api/admin/question-filter-schemes"),
      fetch(buildAuditRecordPath()),
      fetch("/api/admin/schools"),
      fetch("/api/admin/classes"),
      fetch(buildSchoolSummaryPath())
    ]);
    if (questionResponse.status === 403 || pointResponse.status === 403 || modelResponse.status === 403) {
      setMessage("请先使用管理员账号登录。");
      return;
    }
    const questionData = (await questionResponse.json()) as { questions: AdminQuestionListItem[] };
    const pointData = (await pointResponse.json()) as { points: KnowledgePoint[] };
    const relationData = (await relationResponse.json()) as { relations: KnowledgeRelation[] };
    const modelData = (await modelResponse.json()) as { models: AiModelConfigItem[] };
    const taskData = (await taskResponse.json()) as { tasks: AiTaskItem[] };
    const schemeData = schemeResponse.ok ? ((await schemeResponse.json()) as { schemes: SavedQuestionFilterScheme[] }) : { schemes: [] };
    const auditData = auditResponse.ok ? ((await auditResponse.json()) as { records: AdminAuditRecordItem[] }) : { records: [] };
    const schoolData = schoolResponse.ok ? ((await schoolResponse.json()) as { schools: OrganizationSchoolItem[] }) : { schools: [] };
    const classData = classResponse.ok ? ((await classResponse.json()) as { classes: OrganizationClassItem[] }) : { classes: [] };
    const summaryData = schoolSummaryResponse.ok
      ? ((await schoolSummaryResponse.json()) as { report: SchoolSummaryReport })
      : { report: null };
    setQuestions(questionData.questions);
    setSelectedQuestionId((current) => (questionData.questions.some((question) => question.id === current) ? current : questionData.questions[0]?.id || ""));
    setBatchQuestionIds((current) => current.filter((id) => questionData.questions.some((question) => question.id === id)));
    setPoints(pointData.points);
    setRelations(relationData.relations);
    setAiModels(modelData.models);
    setAiTasks(taskData.tasks);
    setSavedQuestionFilterSchemes(schemeData.schemes);
    setAuditRecords(auditData.records);
    setSchools(schoolData.schools);
    setClasses(classData.classes);
    setSchoolSummary(summaryData.report);
    setClassSchoolId((current) => current || schoolData.schools[0]?.id || "");
    setAssignTeacherClassId((current) => current || classData.classes[0]?.id || "");
    const nextTeacherRoleClassId = teacherRoleClassId || classData.classes[0]?.id || "";
    setTeacherRoleClassId(nextTeacherRoleClassId);
    setAssignStudentClassId((current) => current || classData.classes[0]?.id || "");
    setBatchStudentClassId((current) => current || classData.classes[0]?.id || "");
    setTaskModelId((current) => current || modelData.models[0]?.id || "");
    if (nextTeacherRoleClassId) {
      await loadClassTeachersForClass(nextTeacherRoleClassId);
    } else {
      setClassTeacherAssignments([]);
    }
  }

  async function updateQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedQuestion) return;
    await withAdminPending("question-save", "正在保存题目维护内容，并写入审计记录...", async () => {
      const response = await fetch(`/api/admin/questions/${selectedQuestion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditStatus: editQuestionStatus,
          difficulty: editQuestionDifficulty,
          medianTimeSeconds: toOptionalNumber(editQuestionMedianTime),
          primaryKnowledgePointId: editQuestionKnowledgePointId,
          questionType: editQuestionType,
          stem: editQuestionStem,
          answer: editQuestionAnswer,
          analysis: editQuestionAnalysis,
          coreLiteracy: parseCoreLiteracyInput(editQuestionCoreLiteracy)
        })
      });
      if (!response.ok) {
        setMessage("题目维护失败，请检查题目字段和知识点 ID。");
        return;
      }
      setMessage("题目内容、答案解析、核心素养、审核状态和知识点挂接已更新，并写入审核记录。");
      await loadAdminData();
    });
  }

  async function batchUpdateQuestions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!batchQuestionIds.length && !selectedFilterSchemeId) {
      setMessage("请先勾选题目，或选择一个筛选方案作为批量目标。");
      return;
    }
    if (!batchPreview?.previewToken) {
      setMessage("请先生成服务端批量预览，再提交更新。");
      return;
    }
    if (!batchConfirmChecked) {
      setMessage("请先核对服务端批量操作预览，并勾选确认。");
      return;
    }
    if (!batchReason.trim()) {
      setMessage("请填写本次批量维护原因，便于审计追溯。");
      return;
    }
    if (batchConfirmText !== adminBatchConfirmText) {
      setMessage(`请输入确认文本“${adminBatchConfirmText}”。`);
      return;
    }
    await withAdminPending("batch-update", `正在提交 ${batchTargetCount} 道题的批量维护...`, async () => {
      const response = await fetch("/api/admin/questions/batch-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...getBatchPayloadBase(),
          previewToken: batchPreview.previewToken,
          reason: batchReason,
          confirmText: batchConfirmText
        })
      });
      if (!response.ok) {
        setMessage("批量维护失败，请重新生成预览并确认原因、确认文本和目标范围。");
        return;
      }
      const data = (await response.json()) as { result: { updatedCount: number; batchOperationId: string } };
      setBatchQuestionIds([]);
      setBatchConfirmChecked(false);
      setBatchPreview(null);
      setBatchConfirmText("");
      setLastBatchOperationId(data.result.batchOperationId);
      setAuditBatchIdFilter(data.result.batchOperationId);
      setMessage(`已批量维护 ${data.result.updatedCount} 道题，批次 ${data.result.batchOperationId} 已写入审计记录。`);
      await loadAdminData();
    });
  }

  async function previewBatchUpdate() {
    if (!batchQuestionIds.length && !selectedFilterSchemeId) {
      setMessage("请先勾选题目，或选择一个筛选方案作为批量目标。");
      return;
    }
    await withAdminPending("batch-preview", "正在生成服务端批量预览...", async () => {
      const response = await fetch("/api/admin/questions/batch-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getBatchPayloadBase())
      });
      if (!response.ok) {
        setMessage("批量预览生成失败，请确认目标题目或筛选方案仍可访问。");
        return;
      }
      const data = (await response.json()) as { preview: BatchQuestionPreview };
      setBatchPreview(data.preview);
      setBatchConfirmChecked(false);
      setBatchConfirmText("");
      setMessage(`已生成服务端预览：选中 ${data.preview.selectedCount} 题，预计影响 ${data.preview.affectedCount} 题。`);
    });
  }

  async function loadAuditRecords() {
    const response = await fetch(buildAuditRecordPath());
    if (!response.ok) {
      setMessage("审计记录读取失败，请确认管理员登录状态。");
      return;
    }
    const data = (await response.json()) as { records: AdminAuditRecordItem[] };
    setAuditRecords(data.records);
    setMessage(`已读取 ${data.records.length} 条审计记录。`);
  }

  async function jumpToBatchAudit(batchId: string) {
    setAuditBatchIdFilter(batchId);
    setAuditTargetIdFilter("");
    setAuditActionFilter("");
    const response = await fetch(`/api/admin/audit-records?batchId=${encodeURIComponent(batchId)}`);
    if (!response.ok) {
      setMessage("批次审计记录读取失败。");
      return;
    }
    const data = (await response.json()) as { records: AdminAuditRecordItem[] };
    setAuditRecords(data.records);
    setMessage(`已定位批次 ${batchId} 的审计记录。`);
  }

  async function createSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = schoolName.trim();
    if (!name) {
      setMessage("请填写学校名称。");
      return;
    }
    await withAdminPending("school-create", `正在创建学校“${name}”...`, async () => {
      const response = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          region: schoolRegion.trim() || undefined
        })
      });
      if (!response.ok) {
        setMessage("学校创建失败，请确认管理员登录状态。");
        return;
      }
      const data = (await response.json()) as { school: OrganizationSchoolItem };
      setSchoolName("");
      setSchoolRegion("");
      setClassSchoolId(data.school.id);
      setMessage(`学校“${data.school.name}”已创建，可继续建立班级。`);
      await loadAdminData();
    });
  }

  async function createClassGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!classSchoolId || !className.trim()) {
      setMessage("请先选择学校并填写班级名称。");
      return;
    }
    await withAdminPending("class-create", "正在创建班级并准备授权入口...", async () => {
      const response = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: classSchoolId,
          name: className.trim(),
          grade: classGrade
        })
      });
      if (!response.ok) {
        setMessage("班级创建失败，请确认学校仍然存在。");
        return;
      }
      const data = (await response.json()) as { classGroup: OrganizationClassItem };
      setClassName("");
      setAssignTeacherClassId(data.classGroup.id);
      setAssignStudentClassId(data.classGroup.id);
      setBatchStudentClassId(data.classGroup.id);
      setMessage(`班级“${data.classGroup.name}”已创建，接下来可以绑定教师和学生。`);
      await loadAdminData();
    });
  }

  async function assignTeacherToClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignTeacherClassId || !assignTeacherId.trim()) {
      setMessage("请填写教师用户 ID，并选择要绑定的班级。");
      return;
    }
    await withAdminPending("teacher-assign", "正在绑定教师授权，并写入班级访问范围...", async () => {
      const response = await fetch(`/api/admin/classes/${assignTeacherClassId}/teachers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: assignTeacherId.trim(), role: assignTeacherRole })
      });
      if (!response.ok) {
        setMessage("教师绑定失败，请确认该用户是教师账号。");
        return;
      }
      setAssignTeacherId("");
      setTeacherRoleClassId(assignTeacherClassId);
      setMessage(`${teacherClassRoleLabel(assignTeacherRole)}已绑定到班级；教师访问该班级报告会通过授权校验。`);
      await loadAdminData();
    });
  }

  async function loadClassTeachersForClass(classId: string, showMessage = false) {
    if (!classId) {
      setClassTeacherAssignments([]);
      return;
    }
    const response = await fetch(`/api/admin/classes/${classId}/teachers`);
    if (!response.ok) {
      setClassTeacherAssignments([]);
      if (showMessage) setMessage("班级教师列表读取失败，请确认管理员登录状态。");
      return;
    }
    const data = (await response.json()) as { assignments: ClassTeacherAssignmentItem[] };
    setClassTeacherAssignments(data.assignments);
    if (showMessage) setMessage(`已读取 ${data.assignments.length} 条班级教师授权。`);
  }

  async function changeTeacherRoleClass(classId: string) {
    setTeacherRoleClassId(classId);
    await withAdminPending("class-teachers-load", "正在读取班级教师授权...", async () => loadClassTeachersForClass(classId, true));
  }

  async function updateClassTeacherRole(assignment: ClassTeacherAssignmentItem, role: "teacher" | "head_teacher") {
    await withAdminPending(`teacher-role-${assignment.assignmentId}`, `正在把 ${assignment.teacherName} 更新为${teacherClassRoleLabel(role)}...`, async () => {
      const response = await fetch(`/api/admin/classes/${assignment.classId}/teachers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: assignment.teacherId, role })
      });
      if (!response.ok) {
        setMessage("教师角色更新失败，请确认该授权仍然有效。");
        return;
      }
      await loadClassTeachersForClass(assignment.classId);
      await loadAuditRecords();
      setMessage(`${assignment.teacherName} 已更新为${teacherClassRoleLabel(role)}，变更已写入审计。`);
    });
  }

  async function assignStudentToClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignStudentClassId || !assignStudentId.trim()) {
      setMessage("请填写学生用户 ID，并选择要加入的班级。");
      return;
    }
    await withAdminPending("student-assign", "正在把学生加入班级统计范围...", async () => {
      const response = await fetch(`/api/admin/classes/${assignStudentClassId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: assignStudentId.trim() })
      });
      if (!response.ok) {
        setMessage("学生加入班级失败，请确认该用户是学生账号。");
        return;
      }
      setAssignStudentId("");
      setMessage("学生已加入班级；老师端按该班级查看时会纳入统计。");
      await loadAdminData();
    });
  }

  async function searchAdminUsers(role: "teacher" | "student") {
    const query = role === "teacher" ? teacherSearchQuery.trim() : studentSearchQuery.trim();
    if (!query) {
      setMessage(role === "teacher" ? "请输入教师姓名、用户名或 ID 片段。" : "请输入学生姓名、用户名或 ID 片段。");
      return;
    }
    await withAdminPending(`${role}-search`, `正在检索${role === "teacher" ? "教师" : "学生"}账号...`, async () => {
      const response = await fetch(`/api/admin/users?role=${role}&q=${encodeURIComponent(query)}&limit=8`);
      if (!response.ok) {
        setMessage("账号检索失败，请确认管理员登录状态。");
        return;
      }
      const data = (await response.json()) as { users: AdminDirectoryUser[] };
      if (role === "teacher") {
        setTeacherSearchResults(data.users);
      } else {
        setStudentSearchResults(data.users);
      }
      setMessage(`检索到 ${data.users.length} 个${role === "teacher" ? "教师" : "学生"}账号，可点击结果填入授权表单。`);
    });
  }

  async function batchAssignStudentsToClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const identifiers = parseBatchStudentIdentifiers(batchStudentText);
    if (!batchStudentClassId || !identifiers.length) {
      setMessage("请选择班级，并粘贴至少一个学生用户名或 ID。");
      return;
    }
    await withAdminPending("batch-student-assign", `正在处理 ${identifiers.length} 条学生入班名单...`, async () => {
      const response = await fetch(`/api/admin/classes/${batchStudentClassId}/students/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers })
      });
      if (!response.ok) {
        setMessage("批量入班失败，请确认班级和学生账号有效。");
        return;
      }
      const data = (await response.json()) as { result: BatchStudentAssignmentResult };
      setBatchStudentResult(data.result);
      setMessage(`批量入班完成：已加入 ${data.result.assignedCount} 名学生，跳过 ${data.result.skippedCount} 条。`);
      await loadAdminData();
    });
  }

  async function loadSchoolSummary() {
    await withAdminPending("school-summary-load", `正在更新${selectedSchoolLabel}的学校汇总...`, async () => {
      const response = await fetch(buildSchoolSummaryPath());
      if (!response.ok) {
        setMessage("学校汇总读取失败，请确认管理员登录状态。");
        return;
      }
      const data = (await response.json()) as { report: SchoolSummaryReport };
      setSchoolSummary(data.report);
      setMessage("学校级汇总已更新。");
    });
  }

  function buildSchoolSummaryPath() {
    return schoolSummaryFilter === "all"
      ? "/api/admin/schools/summary"
      : `/api/admin/schools/summary?schoolId=${encodeURIComponent(schoolSummaryFilter)}`;
  }

  function exportSchoolSummaryCsv() {
    setMessage(`正在导出${selectedSchoolLabel}的学校汇总 CSV，导出文件不包含 API Key、Cookie 或密码。`);
    window.location.href =
      schoolSummaryFilter === "all"
        ? "/api/admin/schools/summary/export"
        : `/api/admin/schools/summary/export?schoolId=${encodeURIComponent(schoolSummaryFilter)}`;
  }

  function buildAuditRecordPath() {
    const params = new URLSearchParams();
    if (auditBatchIdFilter.trim()) params.set("batchId", auditBatchIdFilter.trim());
    if (auditTargetIdFilter.trim()) params.set("targetId", auditTargetIdFilter.trim());
    if (auditActionFilter.trim()) params.set("action", auditActionFilter.trim());
    return params.size ? `/api/admin/audit-records?${params.toString()}` : "/api/admin/audit-records";
  }

  function toggleBatchQuestion(questionId: string) {
    setBatchQuestionIds((current) =>
      current.includes(questionId) ? current.filter((id) => id !== questionId) : [...current, questionId]
    );
  }

  async function createPoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withAdminPending("point-create", "正在新增知识点...", async () => {
      const response = await fetch("/api/admin/knowledge-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: pointGrade,
          name: pointName,
          description: pointDescription,
          x: 50,
          y: 50
        })
      });
      if (!response.ok) {
        setMessage("新增知识点失败，请检查字段。");
        return;
      }
      setPointName("");
      setPointDescription("");
      setMessage("知识点已新增，可继续建立前置关系。");
      await loadAdminData();
    });
  }

  async function createRelation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withAdminPending("relation-create", "正在新增知识图谱关系...", async () => {
      const response = await fetch("/api/admin/knowledge-relations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPointId, toPointId, relationType })
      });
      if (!response.ok) {
        setMessage("新增知识关系失败，请确认两个知识点都存在。");
        return;
      }
      setFromPointId("");
      setToPointId("");
      setRelationType("prerequisite");
      setMessage("知识关系已新增。");
      await loadAdminData();
    });
  }

  async function createAiModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedApiBaseUrl = normalizeAiBaseUrlInput(apiBaseUrl);
    await withAdminPending("ai-model-create", "正在安全保存 AI 模型配置，API Key 只会加密落库...", async () => {
      const response = await fetch("/api/admin/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiBaseUrl: normalizedApiBaseUrl,
          apiKey,
          modelName,
          maxContextTokens: toOptionalNumber(maxContextTokens),
          maxOutputTokens: toOptionalNumber(maxOutputTokens),
          temperature: toOptionalNumber(temperature),
          timeoutSeconds: toOptionalNumber(timeoutSeconds)
        })
      });
      if (!response.ok) {
        const error = await readApiError(response);
        setMessage(aiModelConfigErrorMessage(response.status, error));
        return;
      }
      setApiBaseUrl(normalizedApiBaseUrl);
      setApiKey("");
      setMessage("AI 模型已加入配置中心，页面只显示密钥掩码。下一步可创建后台任务测试连通性。");
      await loadAdminData();
    });
  }

  async function createAiTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withAdminPending("ai-task-create", "正在创建 AI 后台任务...", async () => {
      const response = await fetch("/api/admin/ai/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          modelConfigId: taskModelId || undefined,
          fallbackModelConfigId: fallbackTaskModelId || undefined,
          input: {
            source: "admin-console",
            reviewPolicy: "AI 结果进入人工一审，通过后才发布。"
          }
        })
      });
      if (!response.ok) {
        setMessage("创建 AI 后台任务失败，请先配置至少一个可用模型。");
        return;
      }
      setMessage("AI 后台任务已进入队列，后续结果将进入人工审核。");
      await loadAdminData();
    });
  }

  async function runAiTask(taskId: string) {
    await withAdminPending(`ai-task-run-${taskId}`, "正在执行 AI 后台任务，结果不会直接发布...", async () => {
      const response = await fetch(`/api/admin/ai/tasks/${taskId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxAttempts: toOptionalNumber(maxAttempts) ?? 2 })
      });
      if (!response.ok) {
        setMessage("AI 任务执行失败，请查看任务状态或模型配置。");
        return;
      }
      const data = (await response.json()) as { result: { status: string; warnings: string[]; attemptCount: number } };
      setMessage(
        data.result.status === "needs_review"
          ? `AI 任务已完成，尝试 ${data.result.attemptCount} 次，结果进入人工审核状态。`
          : "AI 任务执行失败，已记录错误，可调整模型后重跑。"
      );
      await loadAdminData();
    });
  }

  async function importExamPaper(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withAdminPending("paper-import", "正在拆解整卷并送入人工一审队列...", async () => {
      const response = await fetch("/api/admin/exam-papers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: paperTitle,
          examType: paperExamType,
          year: toOptionalNumber(paperYear),
          region: paperRegion,
          grade: paperGrade,
          paperText,
          answerAnalysisText,
          modelConfigId: taskModelId || undefined
        })
      });
      if (!response.ok) {
        setMessage("试卷拆题导入失败，请确认试卷正文和答案解析都已填写。");
        return;
      }
      const data = (await response.json()) as { result: ImportPaperResult };
      setLastImport(data.result);
      setMessage(`整卷已拆出 ${data.result.createdQuestionIds.length} 道待审核题，已送入审核端“整卷导入”队列，学生端暂不可见。`);
      await loadAdminData();
    });
  }

  return (
    <main className="page-shell admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">管理端</p>
          <h1>题库与知识图谱维护</h1>
          <p className="admin-header-copy">把学校组织、题库审核、AI 后台任务和批量审计放在同一个安全工作台里。</p>
        </div>
        <div className="admin-hero-visual" aria-hidden="true">
          <BeakerIcon level={organizationReadinessScore / 100} size="md" />
          <MoleculePath activeIndex={3} size="sm" />
          <RewardBadge variant="mastery" size="sm" />
        </div>
        <button
          className="secondary-button"
          disabled={isBusy}
          type="button"
          onClick={() => void withAdminPending("admin-refresh", "正在刷新管理端数据...", async () => loadAdminData())}
        >
          {pendingAction === "admin-refresh" ? "刷新中" : "刷新数据"}
        </button>
      </header>

      <section className="admin-auth">
        {admin ? (
          <div>
            <p className="eyebrow">当前管理员</p>
            <strong>{admin.displayName}</strong>
            <OperationNotice message={message} busy={isBusy} />
          </div>
        ) : (
          <form onSubmit={submitAuth}>
            <div>
              <p className="eyebrow">管理员账号</p>
              <OperationNotice message={message} busy={isBusy} />
            </div>
            <input aria-label="管理员用户名" placeholder="用户名" value={username} onChange={(event) => setUsername(event.target.value)} />
            <input
              aria-label="管理员密码"
              placeholder="密码"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button className="secondary-button" type="button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
              {authMode === "login" ? "注册管理员账号" : "去登录"}
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setAuthMode("login");
                setUsername(demoAdminAccount.username);
                setPassword(demoAdminAccount.password);
                setMessage("已填入演示管理员账号，点击登录即可查看组织、题库和学校汇总。");
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

      <nav aria-label="管理端功能导航" className="admin-section-nav">
        <a href="#school-workbench">学校工作台</a>
        <a href="#question-bank">题库维护</a>
        <a href="#knowledge-graph">知识图谱</a>
        <a href="#ai-center">AI 配置</a>
        <a href="#paper-import">整卷导入</a>
        <a href="#audit-log">审计记录</a>
      </nav>

      <section className="admin-command-board" aria-label="管理端总览">
        <div className="admin-readiness-card">
          <ProgressRing value={organizationReadinessScore} label="组织就绪度" tone={organizationReadinessScore >= 75 ? "green" : "orange"} />
          <div>
            <p className="eyebrow">学校试点准备</p>
            <h2>{organizationReadinessScore}%</h2>
            <p>学校、班级、教师授权和学生入班都准备好后，老师端才能稳定使用授权班级。</p>
            <div className="admin-readiness-badges">
              <Badge tone={organizationTotals.schoolCount ? "green" : "orange"}>学校 {organizationTotals.schoolCount}</Badge>
              <Badge tone={organizationTotals.classCount ? "green" : "orange"}>班级 {organizationTotals.classCount}</Badge>
              <Badge tone={organizationTotals.teacherCount ? "green" : "orange"}>教师 {organizationTotals.teacherCount}</Badge>
              <Badge tone={organizationTotals.studentCount ? "green" : "orange"}>学生 {organizationTotals.studentCount}</Badge>
            </div>
          </div>
        </div>
        <div className="admin-command-stats">
          <StatCard label="已发布题" value={publishedQuestionCount} helper="学生端可见" tone="green" />
          <StatCard label="审核队列" value={reviewQueueQuestionCount} helper="需一审后发布" tone="orange" />
          <StatCard label="AI 模型" value={enabledAiModelCount} helper="页面只显示掩码" tone="blue" />
          <StatCard label="审计记录" value={auditRecords.length} helper="批量操作可追溯" tone="teal" />
        </div>
      </section>

      <section className="admin-workbench school-workbench" id="school-workbench">
        <div className="workbench-hero">
          <div>
            <p className="eyebrow">学校工作台</p>
            <h2>组织、授权、汇总都在这里完成</h2>
            <p>
              先建学校和班级，再绑定教师与学生，最后用学校汇总查看试点运行情况。学校能力并入管理端，不新增独立学校入口。
            </p>
          </div>
          <div className="workbench-steps" aria-label="学校工作台操作顺序">
            <span>1 建学校</span>
            <span>2 配班级</span>
            <span>3 授权教师</span>
            <span>4 看汇总</span>
          </div>
          <KnowledgePathIllustration activeStep={2} size="md" />
        </div>
        <div className="school-kpi-strip" aria-label="学校工作台总览">
          <div>
            <span>学校</span>
            <strong>{organizationTotals.schoolCount}</strong>
          </div>
          <div>
            <span>班级</span>
            <strong>{organizationTotals.classCount}</strong>
          </div>
          <div>
            <span>学生</span>
            <strong>{organizationTotals.studentCount}</strong>
          </div>
          <div>
            <span>教师</span>
            <strong>{organizationTotals.teacherCount}</strong>
          </div>
        </div>

      <section className="card admin-panel organization-panel">
        <p className="eyebrow">学校组织</p>
        <h2>学校、班级与任课授权</h2>
        <div className="organization-grid">
          <form className="admin-form" onSubmit={createSchool}>
            <input placeholder="学校名称" value={schoolName} onChange={(event) => setSchoolName(event.target.value)} />
            <input placeholder="地区" value={schoolRegion} onChange={(event) => setSchoolRegion(event.target.value)} />
            <button className="primary-button" disabled={!schoolName.trim() || pendingAction === "school-create"} type="submit">
              {pendingAction === "school-create" ? "创建中" : "新建学校"}
            </button>
          </form>

          <form className="admin-form" onSubmit={createClassGroup}>
            <select value={classSchoolId} onChange={(event) => setClassSchoolId(event.target.value)}>
              <option value="">选择学校</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            <select value={classGrade} onChange={(event) => setClassGrade(event.target.value as Grade)}>
              {grades.map((grade) => (
                <option key={grade}>{grade}</option>
              ))}
            </select>
            <input placeholder="班级名称" value={className} onChange={(event) => setClassName(event.target.value)} />
            <button className="primary-button" disabled={!classSchoolId || !className.trim() || pendingAction === "class-create"} type="submit">
              {pendingAction === "class-create" ? "创建中" : "新建班级"}
            </button>
          </form>

          <form className="admin-form" onSubmit={assignTeacherToClass}>
            <select value={assignTeacherClassId} onChange={(event) => setAssignTeacherClassId(event.target.value)}>
              <option value="">选择班级</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.schoolName} / {item.name}
                </option>
              ))}
            </select>
            <input placeholder="教师用户 ID" value={assignTeacherId} onChange={(event) => setAssignTeacherId(event.target.value)} />
            <select value={assignTeacherRole} onChange={(event) => setAssignTeacherRole(event.target.value as "teacher" | "head_teacher")}>
              <option value="teacher">任课教师</option>
              <option value="head_teacher">班主任</option>
            </select>
            <button
              className="secondary-button"
              disabled={!assignTeacherClassId || !assignTeacherId.trim() || pendingAction === "teacher-assign"}
              type="submit"
            >
              {pendingAction === "teacher-assign" ? "绑定中" : "绑定教师"}
            </button>
          </form>

          <form className="admin-form" onSubmit={assignStudentToClass}>
            <select value={assignStudentClassId} onChange={(event) => setAssignStudentClassId(event.target.value)}>
              <option value="">选择班级</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.schoolName} / {item.name}
                </option>
              ))}
            </select>
            <input placeholder="学生用户 ID" value={assignStudentId} onChange={(event) => setAssignStudentId(event.target.value)} />
            <button
              className="secondary-button"
              disabled={!assignStudentClassId || !assignStudentId.trim() || pendingAction === "student-assign"}
              type="submit"
            >
              {pendingAction === "student-assign" ? "加入中" : "加入班级"}
            </button>
          </form>

          <section className="directory-search-panel">
            <div>
              <h3>查找教师账号</h3>
              <p className="muted-copy">按姓名、用户名或 ID 片段检索，点击结果后自动填入绑定表单。</p>
            </div>
            <div className="directory-search-row">
              <input
                placeholder="教师姓名 / 用户名 / ID"
                value={teacherSearchQuery}
                onChange={(event) => setTeacherSearchQuery(event.target.value)}
              />
              <button
                className="secondary-button compact"
                disabled={!teacherSearchQuery.trim() || pendingAction === "teacher-search"}
                type="button"
                onClick={() => void searchAdminUsers("teacher")}
              >
                {pendingAction === "teacher-search" ? "查找中" : "查找教师"}
              </button>
            </div>
            <div className="directory-result-list">
              {teacherSearchResults.map((user) => (
                <button
                  className="directory-result-button"
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setAssignTeacherId(user.id);
                    setMessage(`已选择教师 ${user.displayName}，可继续选择班级和角色。`);
                  }}
                >
                  <strong>{user.displayName}</strong>
                  <span>{user.username} · {user.id}</span>
                  <small>{user.schoolName || "暂未绑定学校"}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="directory-search-panel">
            <div>
              <h3>查找学生账号</h3>
              <p className="muted-copy">可单独选中加入班级，也可把多个用户名或 ID 放入批量入班。</p>
            </div>
            <div className="directory-search-row">
              <input
                placeholder="学生姓名 / 用户名 / ID"
                value={studentSearchQuery}
                onChange={(event) => setStudentSearchQuery(event.target.value)}
              />
              <button
                className="secondary-button compact"
                disabled={!studentSearchQuery.trim() || pendingAction === "student-search"}
                type="button"
                onClick={() => void searchAdminUsers("student")}
              >
                {pendingAction === "student-search" ? "查找中" : "查找学生"}
              </button>
            </div>
            <div className="directory-result-list">
              {studentSearchResults.map((user) => (
                <button
                  className="directory-result-button"
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setAssignStudentId(user.id);
                    setBatchStudentText((current) => (current.includes(user.username) ? current : `${current}\n${user.username}`.trim()));
                    setMessage(`已选择学生 ${user.displayName}，可单独加入或保留在批量入班名单中。`);
                  }}
                >
                  <strong>{user.displayName}</strong>
                  <span>{user.username} · {user.id}</span>
                  <small>{user.className ? `当前班级：${user.className}` : "暂未入班"}</small>
                </button>
              ))}
            </div>
          </section>
        </div>

        <form className="batch-student-form" onSubmit={batchAssignStudentsToClass}>
          <div>
            <h3>批量学生入班</h3>
            <p className="muted-copy">支持粘贴学生用户名或 ID，用空格、换行、逗号或分号分隔；有效入班会逐条写入审计。</p>
          </div>
          <select value={batchStudentClassId} onChange={(event) => setBatchStudentClassId(event.target.value)}>
            <option value="">选择班级</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.schoolName} / {item.name}
              </option>
            ))}
          </select>
          <textarea
            aria-label="批量学生用户名或 ID"
            placeholder="例如：student001 student002 或每行一个学生 ID"
            value={batchStudentText}
            onChange={(event) => setBatchStudentText(event.target.value)}
          />
          <button
            className="secondary-button"
            disabled={!batchStudentClassId || !batchStudentText.trim() || pendingAction === "batch-student-assign"}
            type="submit"
          >
            {pendingAction === "batch-student-assign" ? "处理中" : "批量加入班级"}
          </button>
          {batchStudentResult ? (
            <div className="batch-student-result">
              <strong>最近批量入班</strong>
              <span>请求 {batchStudentResult.requestedCount} 条，成功 {batchStudentResult.assignedCount} 条，跳过 {batchStudentResult.skippedCount} 条。</span>
              {batchStudentResult.notFound.length ? <small>未找到：{batchStudentResult.notFound.join("、")}</small> : null}
              {batchStudentResult.notStudent.length ? (
                <small>非学生账号：{batchStudentResult.notStudent.map((item) => `${item.identifier}(${item.role})`).join("、")}</small>
              ) : null}
            </div>
          ) : null}
        </form>

        <div className="organization-lists">
          <section>
            <h3>学校</h3>
            {schools.length ? (
              schools.map((school) => (
                <div className="admin-row organization-row" key={school.id}>
                  <strong>{school.name}</strong>
                  <span>{school.region || "未填地区"}</span>
                  <span>{school.classCount} 个班级</span>
                </div>
              ))
            ) : (
              <p className="muted-copy">还没有学校。</p>
            )}
          </section>
          <section>
            <h3>班级</h3>
            {classes.length ? (
              classes.map((item) => (
                <div className="admin-row organization-row" key={item.id}>
                  <strong>{item.name}</strong>
                  <span>{item.schoolName}</span>
                  <span>{item.grade || "未设年级"}</span>
                  <span>{item.teacherCount} 位教师 · {item.studentCount} 名学生</span>
                </div>
              ))
            ) : (
              <p className="muted-copy">还没有班级。</p>
            )}
          </section>
        </div>

        <section className="class-teacher-management">
          <div className="class-teacher-management-title">
            <div>
              <h3>班级教师角色</h3>
              <p className="muted-copy">查看某个班级的教师绑定，并在任课教师与班主任之间切换；每次变更都会进入审计记录。</p>
            </div>
            <div className="class-teacher-tools">
              <select
                disabled={pendingAction === "class-teachers-load"}
                value={teacherRoleClassId}
                onChange={(event) => void changeTeacherRoleClass(event.target.value)}
              >
                <option value="">选择班级</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.schoolName} / {item.name}
                  </option>
                ))}
              </select>
              <button
                className="secondary-button compact"
                disabled={!teacherRoleClassId || pendingAction === "class-teachers-load"}
                type="button"
                onClick={() => void withAdminPending("class-teachers-load", "正在刷新班级教师授权...", async () => loadClassTeachersForClass(teacherRoleClassId, true))}
              >
                {pendingAction === "class-teachers-load" ? "刷新中" : "刷新角色"}
              </button>
            </div>
          </div>
          {classTeacherAssignments.length ? (
            <div className="class-teacher-list">
              {classTeacherAssignments.map((assignment) => (
                <article className="class-teacher-row" key={assignment.assignmentId}>
                  <div>
                    <strong>{assignment.teacherName}</strong>
                    <span>{assignment.teacherId}</span>
                  </div>
                  <span>{teacherClassRoleLabel(assignment.role)}</span>
                  <span>{assignment.status === "active" ? "已启用" : assignment.status}</span>
                  <select
                    disabled={pendingAction === `teacher-role-${assignment.assignmentId}`}
                    value={assignment.role === "head_teacher" ? "head_teacher" : "teacher"}
                    onChange={(event) => void updateClassTeacherRole(assignment, event.target.value as "teacher" | "head_teacher")}
                  >
                    <option value="teacher">任课教师</option>
                    <option value="head_teacher">班主任</option>
                  </select>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted-copy">选择班级后可查看教师绑定；还没有绑定时可先在上方填写教师用户 ID。</p>
          )}
        </section>
      </section>

      <section className="card admin-panel school-summary-panel">
        <div className="school-summary-header">
          <div>
            <p className="eyebrow">学校汇总</p>
            <h2>学校试点概览</h2>
          </div>
          <div className="school-summary-actions">
            <select value={schoolSummaryFilter} onChange={(event) => setSchoolSummaryFilter(event.target.value)}>
              <option value="all">全部学校</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            <button className="secondary-button compact" disabled={pendingAction === "school-summary-load"} type="button" onClick={loadSchoolSummary}>
              {pendingAction === "school-summary-load" ? "更新中" : "查看汇总"}
            </button>
            <button className="secondary-button compact" type="button" onClick={exportSchoolSummaryCsv}>
              导出 CSV
            </button>
          </div>
        </div>

        {schoolSummary ? (
          <>
            <div className="school-summary-cards">
              <div>
                <span>学校</span>
                <strong>{schoolSummary.schools.length}</strong>
              </div>
              <div>
                <span>班级</span>
                <strong>{schoolSummary.totals.classCount}</strong>
              </div>
              <div>
                <span>学生</span>
                <strong>{schoolSummary.totals.studentCount}</strong>
              </div>
              <div>
                <span>教师</span>
                <strong>{schoolSummary.totals.teacherCount}</strong>
              </div>
              <div>
                <span>作答</span>
                <strong>{schoolSummary.totals.answerCount}</strong>
              </div>
              <div>
                <span>正确率</span>
                <strong>{schoolSummary.totals.accuracy}%</strong>
              </div>
              <div>
                <span>补救任务</span>
                <strong>{schoolSummary.totals.remediationCount}</strong>
              </div>
            </div>

            <div className="school-summary-content">
              <section>
                <div className="summary-section-title">
                  <h3>班级明细</h3>
                  <span>{formatGeneratedAt(schoolSummary.generatedAt)}</span>
                </div>
                <div className="school-class-summary-list">
                  {schoolSummary.schools.flatMap((school) =>
                    school.classes.map((classGroup) => (
                      <div className="school-class-summary-row" key={classGroup.classId}>
                        <strong>{classGroup.className}</strong>
                        <span>{school.schoolName}</span>
                        <span>{classGroup.grade || "未设年级"}</span>
                        <span>{classGroup.studentCount} 名学生</span>
                        <span>{classGroup.teacherCount} 位教师</span>
                        <span>{classGroup.answerCount} 次作答</span>
                        <span>{classGroup.accuracy}% 正确率</span>
                        <span>{classGroup.remediationCount} 个补救任务</span>
                      </div>
                    ))
                  )}
                  {schoolSummary.schools.every((school) => school.classes.length === 0) ? (
                    <p className="muted-copy">暂无班级统计。</p>
                  ) : null}
                </div>
              </section>

              <section>
                <div className="summary-section-title">
                  <h3>核心素养薄弱维度</h3>
                  <span>学校级统计</span>
                </div>
                <div className="school-literacy-list">
                  {schoolSummary.totals.weakCoreLiteracy.length ? (
                    schoolSummary.totals.weakCoreLiteracy.map((literacy) => (
                      <div className="school-literacy-row" key={literacy.literacyTag}>
                        <strong>{literacy.label}</strong>
                        <span>{literacy.answerCount} 次关联作答 · {literacy.wrongCount} 次需讲评 · {literacy.wrongRate}%</span>
                        <small>{literacy.suggestion}</small>
                      </div>
                    ))
                  ) : (
                    <p className="muted-copy">暂无需要汇总的核心素养薄弱维度。</p>
                  )}
                </div>
              </section>
            </div>
          </>
        ) : (
          <p className="muted-copy">登录后显示学校级统计。</p>
        )}
      </section>
      </section>

      <section className="admin-grid admin-question-workbench" id="question-bank">
        <section className="card admin-panel question-bank-panel">
          <p className="eyebrow">题库状态</p>
          <h2>题目列表</h2>
          <p className="admin-section-hint">先用筛选或方案圈定题目，再进入单题维护或服务端批量预览；批量操作不会直接绕过一审发布边界。</p>
          <form className="admin-question-filters" onSubmit={(event) => {
            event.preventDefault();
            void loadAdminData();
          }}>
            <select value={questionStatusFilter} onChange={(event) => setQuestionStatusFilter(event.target.value as AuditStatus | "all")}>
              <option value="all">全部状态</option>
              {auditStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <select value={questionGradeFilter} onChange={(event) => setQuestionGradeFilter(event.target.value as Grade | "all")}>
              <option value="all">全部年级</option>
              {grades.map((grade) => (
                <option key={grade}>{grade}</option>
              ))}
            </select>
            <select value={questionTypeFilter} onChange={(event) => setQuestionTypeFilter(event.target.value as QuestionType | "all")}>
              <option value="all">全部题型</option>
              {questionTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            <input
              placeholder="主知识点 ID"
              value={questionKnowledgeFilter}
              onChange={(event) => setQuestionKnowledgeFilter(event.target.value)}
            />
            <button className="secondary-button compact" type="submit">
              筛选题库
            </button>
          </form>
          <div className="admin-filter-schemes">
            <div className="filter-save-row">
              <input
                aria-label="筛选方案名称"
                placeholder="筛选方案名称"
                value={filterSchemeName}
                onChange={(event) => setFilterSchemeName(event.target.value)}
              />
              <select value={filterSchemeScope} onChange={(event) => setFilterSchemeScope(event.target.value as QuestionFilterSchemeScope)}>
                <option value="personal">我的方案</option>
                <option value="role">角色模板</option>
                <option value="shared">共享方案</option>
              </select>
              <button
                className="secondary-button compact"
                disabled={pendingAction === "filter-scheme-save"}
                type="button"
                onClick={saveQuestionFilterScheme}
              >
                {pendingAction === "filter-scheme-save" ? "保存中" : "保存筛选方案"}
              </button>
              <button
                className="secondary-button compact"
                disabled={!selectedFilterSchemeId || pendingAction === "filter-scheme-update"}
                type="button"
                onClick={updateQuestionFilterScheme}
              >
                {pendingAction === "filter-scheme-update" ? "更新中" : "更新当前"}
              </button>
            </div>
            <div className="filter-scheme-tools">
              <button className="secondary-button compact" type="button" onClick={exportQuestionFilterSchemes}>
                导出筛选方案
              </button>
              <button
                className="secondary-button compact"
                disabled={!filterSchemeImportText.trim()}
                type="button"
                onClick={importQuestionFilterSchemes}
              >
                导入筛选方案
              </button>
            </div>
            <textarea
              aria-label="筛选方案 JSON"
              className="filter-scheme-import"
              placeholder="粘贴筛选方案 JSON，可用于跨浏览器导入常用筛选口径。"
              value={filterSchemeImportText}
              onChange={(event) => setFilterSchemeImportText(event.target.value)}
            />
            {savedQuestionFilterSchemes.length ? (
              <div className="filter-scheme-list">
                {(["personal", "role", "shared"] as QuestionFilterSchemeScope[]).map((scope) => {
                  const scopedSchemes = savedQuestionFilterSchemes.filter((scheme) => scheme.scopeType === scope);
                  return scopedSchemes.length ? (
                    <section className="filter-scheme-group" key={scope}>
                      <p>{questionFilterSchemeScopeLabel(scope)}</p>
                      {scopedSchemes.map((scheme) => (
                        <div className={scheme.id === selectedFilterSchemeId ? "filter-scheme active" : "filter-scheme"} key={scheme.id}>
                          <button type="button" onClick={() => void applyQuestionFilterScheme(scheme.id)}>
                            <strong>{scheme.name}</strong>
                            <span>{formatQuestionFilters(scheme.filters)}</span>
                          </button>
                          <button className="text-button" type="button" onClick={() => deleteQuestionFilterScheme(scheme.id)}>
                            删除
                          </button>
                        </div>
                      ))}
                    </section>
                  ) : null;
                })}
              </div>
            ) : (
              <p className="muted-copy">可把常用筛选口径命名保存，例如“高一待审实验题”。</p>
            )}
          </div>
          {questions.length ? (
            <>
              <div className="admin-question-list">
                {questions.map((question) => (
                  <div className={question.id === selectedQuestion?.id ? "admin-question-item active" : "admin-question-item"} key={question.id}>
                    <label className="admin-question-check">
                      <input
                        checked={batchQuestionIds.includes(question.id)}
                        type="checkbox"
                        onChange={() => toggleBatchQuestion(question.id)}
                      />
                      <span>批量</span>
                    </label>
                    <button type="button" onClick={() => setSelectedQuestionId(question.id)}>
                      <strong>{question.stem}</strong>
                      <span>{question.grade} · {question.auditStatus} · {question.questionType}</span>
                      <small>{question.primaryKnowledgePointId || "未挂接"} · {question.medianTimeSeconds}s</small>
                    </button>
                  </div>
                ))}
              </div>
              <form className="admin-batch-edit" onSubmit={batchUpdateQuestions}>
                <p className="eyebrow">批量维护</p>
                <p className="admin-form-note">必须先生成服务端预览，再填写原因和确认文本，提交后会生成批次审计记录。</p>
                <select value={batchAuditStatus} onChange={(event) => setBatchAuditStatus(event.target.value as AuditStatus)}>
                  {batchAuditStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
                <select value={batchDifficulty} onChange={(event) => setBatchDifficulty(event.target.value as Difficulty)}>
                  {difficulties.map((difficulty) => (
                    <option key={difficulty}>{difficulty}</option>
                  ))}
                </select>
                <input
                  placeholder="批量主知识点 ID"
                  value={batchKnowledgePointId}
                  onChange={(event) => setBatchKnowledgePointId(event.target.value)}
                />
                <input
                  placeholder="批量核心素养标签"
                  value={batchCoreLiteracy}
                  onChange={(event) => setBatchCoreLiteracy(event.target.value)}
                />
                <input
                  placeholder="批量原因"
                  value={batchReason}
                  onChange={(event) => setBatchReason(event.target.value)}
                />
                <input
                  placeholder={`输入：${adminBatchConfirmText}`}
                  value={batchConfirmText}
                  onChange={(event) => setBatchConfirmText(event.target.value)}
                />
                <button
                  className="secondary-button compact"
                  disabled={pendingAction === "batch-preview"}
                  type="button"
                  onClick={previewBatchUpdate}
                >
                  {pendingAction === "batch-preview" ? "生成中" : "生成服务端预览"}
                </button>
                <button
                  className="secondary-button compact"
                  disabled={
                    !batchPreview ||
                    !batchConfirmChecked ||
                    !batchReason.trim() ||
                    batchConfirmText !== adminBatchConfirmText ||
                    pendingAction === "batch-update"
                  }
                  type="submit"
                >
                  {pendingAction === "batch-update" ? "提交中" : `确认更新 ${batchTargetCount} 题`}
                </button>
              </form>
              {selectedBatchQuestions.length || batchPreview ? (
                <div className="admin-batch-preview">
                  <p className="eyebrow">批量操作预览</p>
                  <div className="batch-preview-summary">
                    {(batchPreview?.changes.length ? batchPreview.changes : batchPreviewChanges).map((change) => (
                      <span key={change}>{change}</span>
                    ))}
                    {selectedFilterScheme && !batchQuestionIds.length ? <span>筛选方案：{selectedFilterScheme.name}</span> : null}
                    {batchPreview ? <span>预览令牌：{batchPreview.previewToken}</span> : null}
                  </div>
                  <div className="batch-preview-list">
                    {(batchPreview?.items ?? selectedBatchQuestions).map((question) =>
                      "diffSummary" in question ? (
                        <div className="batch-preview-item" key={question.id}>
                          <strong>{question.stem}</strong>
                          {question.diffSummary.map((summary) => (
                            <span key={summary}>{summary}</span>
                          ))}
                        </div>
                      ) : (
                        <div className="batch-preview-item" key={question.id}>
                          <strong>{question.stem}</strong>
                          <span>
                            当前：{question.auditStatus} · {question.difficulty} · {question.primaryKnowledgePointId || "未挂接"} ·{" "}
                            {question.coreLiteracy.length ? question.coreLiteracy.join("、") : "未标注核心素养"}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                  <label className="batch-confirm-row">
                    <input
                      checked={batchConfirmChecked}
                      type="checkbox"
                      onChange={(event) => setBatchConfirmChecked(event.target.checked)}
                    />
                    <span>我已核对批量操作预览；提交前还需填写原因并输入确认文本。</span>
                  </label>
                  {lastBatchOperationId ? (
                    <button className="text-button" type="button" onClick={() => jumpToBatchAudit(lastBatchOperationId)}>
                      查看最近批次审计：{lastBatchOperationId}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {selectedQuestion ? (
                <form className="admin-question-edit" onSubmit={updateQuestion}>
                  <p className="eyebrow">题目维护</p>
                  <label>
                    题干
                    <textarea value={editQuestionStem} onChange={(event) => setEditQuestionStem(event.target.value)} />
                  </label>
                  <label>
                    答案
                    <textarea value={editQuestionAnswer} onChange={(event) => setEditQuestionAnswer(event.target.value)} />
                  </label>
                  <label>
                    解析
                    <textarea value={editQuestionAnalysis} onChange={(event) => setEditQuestionAnalysis(event.target.value)} />
                  </label>
                  <div className="admin-edit-grid">
                    <label>
                      审核状态
                      <select value={editQuestionStatus} onChange={(event) => setEditQuestionStatus(event.target.value as AuditStatus)}>
                        {auditStatuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      题型
                      <select value={editQuestionType} onChange={(event) => setEditQuestionType(event.target.value as QuestionType)}>
                        {questionTypes.map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      难度
                      <select value={editQuestionDifficulty} onChange={(event) => setEditQuestionDifficulty(event.target.value as Difficulty)}>
                        {difficulties.map((difficulty) => (
                          <option key={difficulty}>{difficulty}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      中位用时
                      <input value={editQuestionMedianTime} onChange={(event) => setEditQuestionMedianTime(event.target.value)} />
                    </label>
                  </div>
                  <label>
                    主知识点 ID
                    <input value={editQuestionKnowledgePointId} onChange={(event) => setEditQuestionKnowledgePointId(event.target.value)} />
                  </label>
                  <label>
                    核心素养标签
                    <input value={editQuestionCoreLiteracy} onChange={(event) => setEditQuestionCoreLiteracy(event.target.value)} />
                  </label>
                  <button
                    className="primary-button"
                    disabled={!editQuestionStem || !editQuestionAnswer || !editQuestionKnowledgePointId || pendingAction === "question-save"}
                    type="submit"
                  >
                    {pendingAction === "question-save" ? "保存中" : "保存题目维护"}
                  </button>
                </form>
              ) : null}
            </>
          ) : (
            <p className="muted-copy">登录后显示题库。</p>
          )}
        </section>

        <section className="card admin-panel">
          <p className="eyebrow">知识点</p>
          <h2>新增知识点</h2>
          <p className="admin-section-hint">知识点用于诊断断点和前置补救，请按年级维护清晰、可追溯的节点。</p>
          <form className="admin-form" onSubmit={createPoint}>
            <select value={pointGrade} onChange={(event) => setPointGrade(event.target.value as Grade)}>
              {grades.map((grade) => (
                <option key={grade}>{grade}</option>
              ))}
            </select>
            <input placeholder="知识点名称" value={pointName} onChange={(event) => setPointName(event.target.value)} />
            <input placeholder="简要说明" value={pointDescription} onChange={(event) => setPointDescription(event.target.value)} />
            <button className="primary-button" disabled={!pointName || pendingAction === "point-create"} type="submit">
              {pendingAction === "point-create" ? "新增中" : "新增知识点"}
            </button>
          </form>
          <div className="admin-list">
            {points.slice(0, 12).map((point) => (
              <div className="admin-row" key={point.id}>
                <strong>{point.name}</strong>
                <span>{point.grade}</span>
                <span>{point.id}</span>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="card admin-panel relation-panel" id="knowledge-graph">
        <p className="eyebrow">知识图谱关系</p>
        <h2>前置依赖与上下级关系</h2>
        <p className="admin-section-hint">优先维护 prerequisite 前置依赖，学生答错后才能沿知识图谱找到要补的基础。</p>
        <form className="admin-form relation-form" onSubmit={createRelation}>
          <input placeholder="起点知识点 ID" value={fromPointId} onChange={(event) => setFromPointId(event.target.value)} />
          <input placeholder="目标知识点 ID" value={toPointId} onChange={(event) => setToPointId(event.target.value)} />
          <select value={relationType} onChange={(event) => setRelationType(event.target.value as RelationType)}>
            {relationTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <button className="primary-button" disabled={!fromPointId || !toPointId || pendingAction === "relation-create"} type="submit">
            {pendingAction === "relation-create" ? "新增中" : "新增关系"}
          </button>
        </form>
        <div className="relation-list">
          {relations.map((relation, index) => (
            <div className="admin-row relation-row" key={`${relation.fromPointId}-${relation.relationType}-${relation.toPointId}-${index}`}>
              <strong>{relation.fromPointId}</strong>
              <span>{relation.relationType}</span>
              <strong>{relation.toPointId}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="card admin-panel ai-panel" id="ai-center">
        <p className="eyebrow">AI 配置中心</p>
        <h2>国内大模型与后台任务队列</h2>
        <div className="admin-safety-strip" aria-label="AI 配置安全规则">
          <span>API Key 后端加密</span>
          <span>页面只显示掩码</span>
          <span>AI 结果进入一审</span>
        </div>
        <div className="ai-status-cards" aria-label="AI 配置状态">
          <StatCard label="可用模型" value={enabledAiModelCount} helper="管理员维护" tone="blue" />
          <StatCard label="后台任务" value={aiTasks.length} helper="结果不直接发布" tone="teal" />
          <StatCard label="待重跑任务" value={aiTasks.filter((task) => task.status === "failed").length} helper="可调整后执行" tone="orange" />
        </div>
        <div className="ai-grid">
          <form className="admin-form ai-model-form" onSubmit={createAiModel}>
            <p className="ai-form-hint" id="ai-model-help">
              服务地址可填官方 Base URL 或完整 chat/completions 地址；保存时只做格式检查和加密入库，真正连通性在“执行”任务时验证。
            </p>
            <select value={provider} onChange={(event) => setProvider(event.target.value)}>
              <option>DeepSeek</option>
              <option>智谱 GLM</option>
              <option>通义千问</option>
              <option>自定义</option>
            </select>
            <input
              aria-describedby="ai-model-help"
              placeholder="API 服务地址，例如 https://api.deepseek.com"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
            />
            <input placeholder="模型名称" value={modelName} onChange={(event) => setModelName(event.target.value)} />
            <input
              autoComplete="off"
              placeholder="API Key，仅后端加密保存"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
            <input placeholder="上下文 tokens" value={maxContextTokens} onChange={(event) => setMaxContextTokens(event.target.value)} />
            <input placeholder="输出 tokens" value={maxOutputTokens} onChange={(event) => setMaxOutputTokens(event.target.value)} />
            <input placeholder="温度" value={temperature} onChange={(event) => setTemperature(event.target.value)} />
            <input placeholder="超时秒数" value={timeoutSeconds} onChange={(event) => setTimeoutSeconds(event.target.value)} />
            <button
              className="primary-button"
              disabled={!provider || !apiBaseUrl || !apiKey || !modelName || pendingAction === "ai-model-create"}
              type="submit"
            >
              {pendingAction === "ai-model-create" ? "保存中" : "保存模型"}
            </button>
          </form>

          <form className="admin-form ai-task-form" onSubmit={createAiTask}>
            <select value={taskType} onChange={(event) => setTaskType(event.target.value)}>
              {aiTaskTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            <select value={taskModelId} onChange={(event) => setTaskModelId(event.target.value)}>
              <option value="">自动选择默认模型</option>
              {aiModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.provider} / {model.modelName}
                </option>
              ))}
            </select>
            <select value={fallbackTaskModelId} onChange={(event) => setFallbackTaskModelId(event.target.value)}>
              <option value="">无备用模型</option>
              {aiModels.map((model) => (
                <option key={model.id} value={model.id}>
                  备用：{model.provider} / {model.modelName}
                </option>
              ))}
            </select>
            <input placeholder="重试次数" value={maxAttempts} onChange={(event) => setMaxAttempts(event.target.value)} />
            <button className="secondary-button" disabled={!aiModels.length || pendingAction === "ai-task-create"} type="submit">
              {pendingAction === "ai-task-create" ? "创建中" : "创建后台任务"}
            </button>
          </form>
        </div>

        <div className="ai-lists">
          <section>
            <h3>模型配置</h3>
            {aiModels.length ? (
              aiModels.map((model) => (
                <div className="admin-row ai-row" key={model.id}>
                  <strong>{model.provider}</strong>
                  <span>{model.modelName}</span>
                  <span>{formatMaskedSecret(model.apiKeyMasked)}</span>
                  <span>{model.enabled ? "启用" : "停用"}</span>
                </div>
              ))
            ) : (
              <p className="muted-copy">还没有配置模型。</p>
            )}
          </section>
          <section>
            <h3>任务队列</h3>
            {aiTasks.length ? (
              aiTasks.map((task) => (
                <div className="admin-row task-row" key={task.id}>
                  <strong>{task.taskType}</strong>
                  <span>{task.status}</span>
                  <span>{task.modelConfigId}</span>
                  <span>{task.attemptCount ? `${task.attemptCount} 次` : "未执行"}</span>
                  <span>{task.usedModelConfigId || task.fallbackModelConfigId || "无备用"}</span>
                  <button
                    className="secondary-button compact"
                    disabled={pendingAction === `ai-task-run-${task.id}`}
                    type="button"
                    onClick={() => runAiTask(task.id)}
                  >
                    {pendingAction === `ai-task-run-${task.id}` ? "执行中" : task.status === "failed" ? "重跑" : "执行"}
                  </button>
                  {task.errorMessage ? <small>{task.errorMessage}</small> : null}
                </div>
              ))
            ) : (
              <p className="muted-copy">还没有后台任务。</p>
            )}
          </section>
        </div>
      </section>

      <section className="card admin-panel paper-panel" id="paper-import">
        <p className="eyebrow">整卷拆题</p>
        <h2>真题导入并进入一审队列</h2>
        <p className="admin-section-hint">导入整卷后只生成待审核题，审核通过前学生端不可见。</p>
        <form className="paper-form" onSubmit={importExamPaper}>
          <div className="paper-meta-grid">
            <input placeholder="试卷标题" value={paperTitle} onChange={(event) => setPaperTitle(event.target.value)} />
            <select value={paperGrade} onChange={(event) => setPaperGrade(event.target.value as Grade)}>
              {grades.map((grade) => (
                <option key={grade}>{grade}</option>
              ))}
            </select>
            <input placeholder="考试类型" value={paperExamType} onChange={(event) => setPaperExamType(event.target.value)} />
            <input placeholder="年份" value={paperYear} onChange={(event) => setPaperYear(event.target.value)} />
            <input placeholder="地区" value={paperRegion} onChange={(event) => setPaperRegion(event.target.value)} />
            <select value={taskModelId} onChange={(event) => setTaskModelId(event.target.value)}>
              <option value="">不指定模型</option>
              {aiModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.provider} / {model.modelName}
                </option>
              ))}
            </select>
          </div>
          <div className="paper-text-grid">
            <label>
              <span>试卷正文</span>
              <textarea value={paperText} onChange={(event) => setPaperText(event.target.value)} />
            </label>
            <label>
              <span>答案与解析</span>
              <textarea value={answerAnalysisText} onChange={(event) => setAnswerAnalysisText(event.target.value)} />
            </label>
          </div>
          <button
            className="primary-button"
            disabled={!paperTitle || !paperText || !answerAnalysisText || pendingAction === "paper-import"}
            type="submit"
          >
            {pendingAction === "paper-import" ? "生成中" : "生成待审核题"}
          </button>
        </form>
        {lastImport ? (
          <div className="import-result">
            <strong>最近导入</strong>
            <span>试卷：{lastImport.paperId}</span>
            <span>题目：{lastImport.createdQuestionIds.length} 道</span>
            <span>状态：{lastImport.reviewStatus}</span>
            <a className="secondary-button compact" href="/review?status=pending_review&source=exam_paper">
              去审核端查看
            </a>
          </div>
        ) : null}
      </section>

      <section className="card admin-panel audit-panel" id="audit-log">
        <p className="eyebrow">审计检索</p>
        <h2>批量操作与题目维护记录</h2>
        <p className="admin-section-hint">可按批次、题目或动作检索，方便回看每次维护原因和变更摘要。</p>
        <form
          className="admin-form audit-filter-form"
          onSubmit={(event) => {
            event.preventDefault();
            void loadAuditRecords();
          }}
        >
          <input placeholder="batchId" value={auditBatchIdFilter} onChange={(event) => setAuditBatchIdFilter(event.target.value)} />
          <input placeholder="targetId" value={auditTargetIdFilter} onChange={(event) => setAuditTargetIdFilter(event.target.value)} />
          <select value={auditActionFilter} onChange={(event) => setAuditActionFilter(event.target.value)}>
            <option value="">全部动作</option>
            <option value="admin_update_question">admin_update_question</option>
            <option value="admin_batch_update_question">admin_batch_update_question</option>
          </select>
          <button className="secondary-button compact" type="submit">
            检索审计
          </button>
        </form>
        {lastBatchOperationId ? (
          <button className="text-button audit-jump" type="button" onClick={() => jumpToBatchAudit(lastBatchOperationId)}>
            跳到最近批次：{lastBatchOperationId}
          </button>
        ) : null}
        <div className="audit-record-list">
          {auditRecords.length ? (
            auditRecords.map((record) => (
              <div className="audit-record-item" key={record.id}>
                <strong>{record.action}</strong>
                <span>{record.targetType} / {record.targetId}</span>
                <span>{record.batchId || "单题操作"}</span>
                <small>{record.diffSummary.length ? record.diffSummary.join("；") : record.comment || record.createdAt}</small>
              </div>
            ))
          ) : (
            <p className="muted-copy">暂无匹配的审计记录。</p>
          )}
        </div>
      </section>
    </main>
  );
}

function toOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeAiBaseUrlInput(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function formatMaskedSecret(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "已加密保存";
  if (trimmed.includes("****")) return trimmed;
  if (trimmed.length <= 8) return "****";
  return `${trimmed.slice(0, 3)}****${trimmed.slice(-4)}`;
}

async function readApiError(response: Response) {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  return data.error ?? "";
}

function aiModelConfigErrorMessage(status: number, error: string) {
  if (status === 401 || status === 403) return "AI 模型配置没有保存：请先确认当前账号是管理员。";
  if (error === "INVALID_API_BASE_URL") {
    return "AI 模型配置没有保存：服务地址需要是 https 开头的官方 Base URL，或本机测试地址。";
  }
  if (error === "INVALID_INPUT") return "AI 模型配置没有保存：服务地址、模型名和 API Key 都需要填写。";
  if (error === "MODEL_CONFIG_CREATE_FAILED") {
    return "AI 模型配置没有保存：后端加密或数据库写入失败，请检查服务器环境变量和数据库状态。";
  }
  return "AI 模型配置没有保存：请检查服务地址、模型名和 API Key。";
}

function parseCoreLiteracyInput(value: string) {
  return value
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseBatchStudentIdentifiers(value: string) {
  return value
    .split(/[\s,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatQuestionFilters(filters: QuestionFilterState) {
  return [
    filters.status === "all" ? "全部状态" : filters.status,
    filters.grade === "all" ? "全部年级" : filters.grade,
    filters.questionType === "all" ? "全部题型" : filters.questionType,
    filters.knowledgePointId.trim() ? filters.knowledgePointId.trim() : "全部知识点"
  ].join(" / ");
}

function formatGeneratedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function teacherClassRoleLabel(role: string) {
  return role === "head_teacher" ? "班主任" : "任课教师";
}

function questionFilterSchemeScopeLabel(scope: QuestionFilterSchemeScope) {
  if (scope === "role") return "角色模板";
  if (scope === "shared") return "共享方案";
  return "我的方案";
}

function normalizeQuestionFilterSchemes(value: unknown): SavedQuestionFilterScheme[] {
  const rawSchemes = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.schemes)
      ? value.schemes
      : [];

  return rawSchemes
    .map((item, index) => normalizeQuestionFilterScheme(item, index))
    .filter((scheme): scheme is SavedQuestionFilterScheme => Boolean(scheme))
    .slice(0, 12);
}

function normalizeQuestionFilterScheme(value: unknown, index: number): SavedQuestionFilterScheme | null {
  if (!isRecord(value) || !isRecord(value.filters)) return null;
  const filters = value.filters;
  const status = typeof filters.status === "string" && isAuditStatusOrAll(filters.status) ? filters.status : "all";
  const grade = typeof filters.grade === "string" && isGradeOrAll(filters.grade) ? filters.grade : "all";
  const questionType =
    typeof filters.questionType === "string" && isQuestionTypeOrAll(filters.questionType) ? filters.questionType : "all";
  const knowledgePointId = typeof filters.knowledgePointId === "string" ? filters.knowledgePointId : "";
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim().slice(0, 40) : `导入筛选方案 ${index + 1}`;
  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim().slice(0, 80)
      : `filter_scheme_import_${Date.now()}_${index}`;
  const createdAt =
    typeof value.createdAt === "string" && value.createdAt.trim() ? value.createdAt : new Date().toISOString();
  const scopeType: QuestionFilterSchemeScope =
    typeof value.scopeType === "string" && isQuestionFilterSchemeScope(value.scopeType) ? value.scopeType : "personal";

  return {
    id,
    name,
    description: typeof value.description === "string" && value.description.trim() ? value.description.trim() : undefined,
    scopeType,
    role: typeof value.role === "string" && value.role.trim() ? value.role.trim() : undefined,
    filters: {
      status,
      grade,
      questionType,
      knowledgePointId
    },
    createdAt
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAuditStatusOrAll(value: string): value is AuditStatus | "all" {
  return value === "all" || auditStatuses.includes(value as AuditStatus);
}

function isGradeOrAll(value: string): value is Grade | "all" {
  return value === "all" || grades.includes(value as Grade);
}

function isQuestionTypeOrAll(value: string): value is QuestionType | "all" {
  return value === "all" || questionTypes.includes(value as QuestionType);
}

function isQuestionFilterSchemeScope(value: string): value is QuestionFilterSchemeScope {
  return value === "personal" || value === "role" || value === "shared";
}
