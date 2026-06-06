"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Question } from "@/domain/types";
import { OperationNotice } from "@/components/operation-notice";
import { Badge, ProgressRing, StatCard } from "@/components/ui";
import { KnowledgePathIllustration, MoleculePath } from "@/components/visuals";

const demoReviewerAccount = {
  username: "demo_admin",
  password: "Chem2Exam@2026"
};

interface ReviewQuestion extends Question {
  source: "ai" | "human" | "seed" | "exam_paper";
  aiConfidence?: number;
  questionType?: string;
  reviewRisk?: "normal" | "low_confidence" | "needs_structure_check";
  reviewWarnings?: string[];
}

interface ReviewerUser {
  id: string;
  username: string;
  displayName: string;
  role: "student" | "teacher" | "admin";
}

interface ReviewAuditRecord {
  id: string;
  targetType: string;
  targetId: string;
  reviewerId: string;
  action: string;
  comment?: string;
  changeSummary: string[];
  aiTask?: {
    id: string;
    status: string;
    taskType: string;
    errorMessage?: string;
  };
  filterHints: {
    questionId?: string;
    auditStatus?: Question["auditStatus"];
    knowledgePointId?: string;
    questionType?: string;
  };
  createdAt: string;
}

export function ReviewConsole() {
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("待审核题目只是一审工作台，学生端看不到这些内容。");
  const [reviewer, setReviewer] = useState<ReviewerUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [editStem, setEditStem] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [editAnalysis, setEditAnalysis] = useState("");
  const [editKnowledgePointId, setEditKnowledgePointId] = useState("");
  const [editCoreLiteracy, setEditCoreLiteracy] = useState("");
  const [editAbilityTarget, setEditAbilityTarget] = useState("");
  const [statusFilter, setStatusFilter] = useState<Question["auditStatus"]>(() => getInitialReviewStatusFilter());
  const [sourceFilter, setSourceFilter] = useState(() => getInitialReviewSourceFilter());
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [questionTypeFilter, setQuestionTypeFilter] = useState("");
  const [knowledgePointFilter, setKnowledgePointFilter] = useState("");
  const [questionIdFilter, setQuestionIdFilter] = useState("");
  const [auditRecords, setAuditRecords] = useState<ReviewAuditRecord[]>([]);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const selected = questions.find((question) => question.id === selectedId) ?? questions[0] ?? null;
  const isBusy = Boolean(pendingAction);
  const lowConfidenceCount = questions.filter(
    (question) => (question.aiConfidence ?? 1) < 0.7 || question.reviewRisk === "low_confidence"
  ).length;
  const structureCheckCount = questions.filter((question) => question.reviewRisk === "needs_structure_check").length;
  const selectedConfidence = Math.round((selected?.aiConfidence ?? 0.86) * 100);
  const selectedNeedsCare =
    selected ? (selected.aiConfidence ?? 1) < 0.7 || selected.reviewRisk === "low_confidence" || selected.reviewRisk === "needs_structure_check" : false;

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { user?: ReviewerUser } | null) => {
        if (data?.user && (data.user.role === "teacher" || data.user.role === "admin")) {
          setReviewer(data.user);
          void loadQuestions();
          void loadAuditRecords();
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setEditStem(selected.stem);
    setEditAnswer(selected.answer);
    setEditAnalysis(selected.analysis);
    setEditKnowledgePointId(selected.primaryKnowledgePointId);
    setEditCoreLiteracy(selected.coreLiteracy.join(","));
    setEditAbilityTarget(selected.abilityTarget);
  }, [selected?.id]);

  async function loadQuestions() {
    await loadQuestionsWithFilters({
      status: statusFilter,
      source: sourceFilter,
      confidence: confidenceFilter,
      questionType: questionTypeFilter,
      knowledgePointId: knowledgePointFilter,
      questionId: questionIdFilter
    });
  }

  async function loadQuestionsWithFilters(filters: {
    confidence: string;
    knowledgePointId: string;
    questionId: string;
    questionType: string;
    source: string;
    status: Question["auditStatus"];
  }) {
    const params = new URLSearchParams({ status: filters.status });
    if (filters.source) params.set("source", filters.source);
    if (filters.confidence) params.set("confidence", filters.confidence);
    if (filters.questionType) params.set("questionType", filters.questionType);
    if (filters.knowledgePointId.trim()) params.set("knowledgePointId", filters.knowledgePointId.trim());
    if (filters.questionId.trim()) params.set("questionId", filters.questionId.trim());
    const response = await fetch(`/api/review/questions?${params.toString()}`);
    if (response.status === 403) {
      setMessage("请先使用老师或管理员账号登录，再进入一审审核。");
      return;
    }
    const data = (await response.json()) as { questions: ReviewQuestion[] };
    setQuestions(data.questions);
    setSelectedId(data.questions[0]?.id ?? null);
  }

  async function applyHistoryFilter(
    label: string,
    nextFilters: Partial<{
      knowledgePointId: string;
      questionId: string;
      questionType: string;
      status: Question["auditStatus"];
    }>
  ) {
    const filters = {
      status: nextFilters.status ?? "pending_review",
      source: "",
      confidence: "all",
      questionType: nextFilters.questionType ?? "",
      knowledgePointId: nextFilters.knowledgePointId ?? "",
      questionId: nextFilters.questionId ?? ""
    };
    setStatusFilter(filters.status);
    setSourceFilter(filters.source);
    setConfidenceFilter(filters.confidence);
    setQuestionTypeFilter(filters.questionType);
    setKnowledgePointFilter(filters.knowledgePointId);
    setQuestionIdFilter(filters.questionId);
    await loadQuestionsWithFilters(filters);
    setMessage(`已按审核历史筛选：${label}。`);
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authMode === "login" ? { username, password } : { username, password, role: "teacher" })
    });
    if (!response.ok) {
      setMessage(authMode === "login" ? "审核员账号或密码不匹配。" : "审核员注册失败，请换一个用户名。");
      return;
    }
    const data = (await response.json()) as { user: ReviewerUser };
    if (data.user.role !== "teacher" && data.user.role !== "admin") {
      setMessage("当前账号没有审核权限。");
      return;
    }
    setReviewer(data.user);
    setUsername("");
    setPassword("");
    setMessage(`已进入审核员 ${data.user.displayName} 的一审工作台。`);
    await loadQuestions();
    await loadAuditRecords();
  }

  async function loadAuditRecords() {
    const response = await fetch("/api/review/audit-records?limit=12");
    if (!response.ok) return;
    const data = (await response.json()) as { records: ReviewAuditRecord[] };
    setAuditRecords(data.records);
  }

  async function withReviewPending(action: string, workingMessage: string, run: () => Promise<void>) {
    setPendingAction(action);
    setMessage(workingMessage);
    try {
      await run();
    } finally {
      setPendingAction((current) => (current === action ? null : current));
    }
  }

  async function submitReview(action: "approve" | "reject") {
    if (!selected) return;
    await withReviewPending(action === "approve" ? "review-approve" : "review-reject", "正在提交一审结果...", async () => {
      const response = await fetch(`/api/review/questions/${selected.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment })
      });

      if (!response.ok) {
        setMessage("审核提交失败，请稍后重试。");
        return;
      }

      setMessage(action === "approve" ? "一审通过，题目已发布给学生端。" : "已驳回，题目不会进入学生端。");
      setComment("");
      await loadQuestions();
      await loadAuditRecords();
    });
  }

  async function editAndApprove() {
    if (!selected) return;
    await withReviewPending("review-edit-approve", "正在保存人工修改并发布...", async () => {
      const response = await fetch(`/api/review/questions/${selected.id}/edit-and-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment,
          patch: {
            stem: editStem,
            answer: editAnswer,
            analysis: editAnalysis,
            primaryKnowledgePointId: editKnowledgePointId,
            coreLiteracy: editCoreLiteracy.split(",").map((item) => item.trim()).filter(Boolean),
            abilityTarget: editAbilityTarget
          }
        })
      });

      if (!response.ok) {
        setMessage("修改后通过失败，请检查字段后重试。");
        return;
      }

      setMessage("已保存人工修改，并一审发布给学生端。");
      setComment("");
      await loadQuestions();
      await loadAuditRecords();
    });
  }

  async function batchApprove() {
    const ids = questions.map((question) => question.id);
    if (ids.length === 0) return;
    await withReviewPending("review-batch-approve", `正在批量通过 ${ids.length} 道题...`, async () => {
      const response = await fetch("/api/review/questions/batch-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, comment: comment || "批量一审通过" })
      });

      if (!response.ok) {
        setMessage("批量通过失败，请稍后重试。");
        return;
      }

      const data = (await response.json()) as { approvedCount: number };
      setMessage(`已批量通过 ${data.approvedCount} 道题。`);
      setComment("");
      await loadQuestions();
      await loadAuditRecords();
    });
  }

  async function batchRequestEditForLowConfidence() {
    const ids = questions.filter((question) => (question.aiConfidence ?? 1) < 0.7 || question.reviewRisk === "low_confidence").map((question) => question.id);
    if (ids.length === 0) {
      setMessage("当前筛选结果中没有低置信度题目。");
      return;
    }
    await withReviewPending("review-batch-edit", `正在批量标记 ${ids.length} 道题为需修改...`, async () => {
      const response = await fetch("/api/review/questions/batch-needs-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, comment: comment || "低置信度题目批量转为需修改" })
      });
      if (!response.ok) {
        setMessage("低置信度批处理失败，请稍后重试。");
        return;
      }
      const data = (await response.json()) as { requestedCount: number };
      setMessage(`已将 ${data.requestedCount} 道低置信度题转为需修改。`);
      setComment("");
      await loadQuestions();
      await loadAuditRecords();
    });
  }

  async function retryAiAnalysis() {
    if (!selected) return;
    await withReviewPending("review-retry-ai", "正在创建 AI 重新分析任务...", async () => {
      const response = await fetch(`/api/review/questions/${selected.id}/retry-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment || "审核员请求 AI 重新分析该题。" })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setMessage(
          data.error === "AI_MODEL_NOT_CONFIGURED"
            ? "重新 AI 分析失败：请先在管理端配置可用 AI 模型。"
            : "重新 AI 分析请求失败，请稍后重试。"
        );
        return;
      }

      setMessage("已创建 AI 重新分析任务；结果仍需进入人工一审后才能发布。");
      setComment("");
      await loadAuditRecords();
    });
  }

  return (
    <main className="page-shell review-page">
      <header className="review-header">
        <div>
          <p className="eyebrow">一审审核</p>
          <h1>AI 结果审核队列</h1>
          <p className="review-header-copy">左侧筛选待审题，右侧核对题干、答案、解析和知识点挂接；一审通过后才会进入学生端。</p>
        </div>
        <div className="review-hero-visual" aria-hidden="true">
          <KnowledgePathIllustration activeStep={1} size="md" />
          <MoleculePath activeIndex={selectedNeedsCare ? 1 : 3} size="sm" tone={selectedNeedsCare ? "orange" : "teal"} />
        </div>
        <div className="review-status">
          <strong>{questions.length}</strong>
          <span>待审核</span>
        </div>
      </header>

      <section className="review-auth">
        {reviewer ? (
          <div>
            <p className="eyebrow">审核员</p>
            <strong>{reviewer.displayName}</strong>
            <span>{reviewer.role === "admin" ? "管理员权限" : "老师审核权限"}</span>
            <OperationNotice message={message} busy={isBusy} />
          </div>
        ) : (
          <form onSubmit={submitAuth}>
            <div>
              <p className="eyebrow">审核员登录</p>
              <span>老师或管理员账号才能处理 AI 候选题。</span>
            </div>
            <input aria-label="审核员用户名" placeholder="用户名" value={username} onChange={(event) => setUsername(event.target.value)} />
            <input
              aria-label="审核员密码"
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
                setUsername(demoReviewerAccount.username);
                setPassword(demoReviewerAccount.password);
                setMessage("已填入演示审核账号，点击登录即可查看待审题。");
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

      <section className="review-risk-board" aria-label="审核队列风险概览">
        <div className="review-risk-score">
          <ProgressRing value={selectedConfidence} label="当前题置信度" tone={selectedNeedsCare ? "orange" : "green"} />
          <div>
            <p className="eyebrow">当前题风险</p>
            <h2>{selected ? riskText(selected.reviewRisk) : "等待选题"}</h2>
            <p>AI 置信度只作为审核线索，发布仍以人工一审为准。</p>
            <div className="review-risk-badges">
              <Badge tone={selected?.source === "ai" || selected?.source === "exam_paper" ? "orange" : "teal"}>
                来源：{selected ? reviewSourceText(selected.source) : "待选择"}
              </Badge>
              <Badge tone={selectedNeedsCare ? "orange" : "green"}>风险：{selected ? riskText(selected.reviewRisk) : "待选择"}</Badge>
              <Badge tone="blue">状态：{selected ? statusText(selected.auditStatus) : "未选择"}</Badge>
            </div>
          </div>
        </div>
        <div className="review-risk-stats">
          <StatCard label="筛选结果" value={questions.length} helper="当前队列" tone="teal" />
          <StatCard label="低置信度" value={lowConfidenceCount} helper="建议先核对" tone={lowConfidenceCount ? "orange" : "green"} />
          <StatCard label="结构核对" value={structureCheckCount} helper="大题小问优先看" tone={structureCheckCount ? "orange" : "blue"} />
        </div>
      </section>

      <section className="review-grid">
        <aside className="card review-list" aria-label="待审核题目列表">
          <div className="review-list-head">
            <div>
              <p className="eyebrow">待处理队列</p>
              <strong>{questions.length} 道匹配筛选</strong>
            </div>
            <div className="review-batch-actions">
              <button className="secondary-button" disabled={!questions.length || pendingAction === "review-batch-approve"} type="button" onClick={batchApprove}>
                {pendingAction === "review-batch-approve" ? "通过中" : "批量通过"}
              </button>
              <button className="secondary-button" disabled={!questions.length || pendingAction === "review-batch-edit"} type="button" onClick={batchRequestEditForLowConfidence}>
                {pendingAction === "review-batch-edit" ? "处理中" : "低置信度转需修改"}
              </button>
            </div>
          </div>
          <div className="review-queue-summary" aria-label="审核队列概览">
            <span>
              <strong>{questions.length}</strong>
              筛选结果
            </span>
            <span className={lowConfidenceCount > 0 ? "attention" : ""}>
              <strong>{lowConfidenceCount}</strong>
              低置信度
            </span>
            <span className={structureCheckCount > 0 ? "attention" : ""}>
              <strong>{structureCheckCount}</strong>
              结构核对
            </span>
          </div>
          <div className="review-filters">
            <label>
              <span>审核状态</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as Question["auditStatus"])}>
                <option value="pending_review">待一审</option>
                <option value="needs_edit">需修改</option>
                <option value="published">已发布</option>
                <option value="rejected">已驳回</option>
                <option value="ai_processing">AI 处理中</option>
                <option value="approved">已通过</option>
              </select>
            </label>
            <label>
              <span>来源</span>
              <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                <option value="">全部来源</option>
                <option value="exam_paper">整卷导入</option>
                <option value="ai">AI 候选</option>
                <option value="human">人工修正</option>
                <option value="seed">种子题</option>
              </select>
            </label>
            <label>
              <span>置信度</span>
              <select value={confidenceFilter} onChange={(event) => setConfidenceFilter(event.target.value)}>
                <option value="all">全部置信度</option>
                <option value="low">低置信度</option>
                <option value="normal">正常置信度</option>
              </select>
            </label>
            <label>
              <span>题型</span>
              <select value={questionTypeFilter} onChange={(event) => setQuestionTypeFilter(event.target.value)}>
                <option value="">全部题型</option>
                <option value="single_choice">单选题</option>
                <option value="multiple_choice">多选题</option>
                <option value="fill_blank">填空题</option>
                <option value="short_answer">简答题</option>
                <option value="calculation">计算题</option>
                <option value="experiment">实验题</option>
                <option value="inference">推断题</option>
              </select>
            </label>
            <label>
              <span>知识点 ID</span>
              <input
                placeholder="例如 kp-001"
                value={knowledgePointFilter}
                onChange={(event) => setKnowledgePointFilter(event.target.value)}
              />
            </label>
            <label>
              <span>题目 ID</span>
              <input
                placeholder="精确定位题目"
                value={questionIdFilter}
                onChange={(event) => setQuestionIdFilter(event.target.value)}
              />
            </label>
            <button className="secondary-button compact" type="button" onClick={loadQuestions}>
              筛选
            </button>
          </div>
          {questions.length ? (
            questions.map((question) => (
              <button
                className={question.id === selected?.id ? "active" : ""}
                key={question.id}
                type="button"
                onClick={() => setSelectedId(question.id)}
              >
                <strong>{question.grade}</strong>
                <span>{question.stem}</span>
                <small>{questionTypeText(question.questionType)} · {riskText(question.reviewRisk)}</small>
              </button>
            ))
          ) : (
            <p className="empty-copy">当前没有待审核题目。</p>
          )}
        </aside>

        <section className="card review-detail">
          {selected ? (
            <>
              <div className="review-detail-topbar">
                <div>
                  <p className="eyebrow">大题面审核</p>
                  <strong>{questionTypeText(selected.questionType)} · {selected.grade}</strong>
                </div>
                <span>{selected.id}</span>
              </div>
              <div className="review-meta">
                <Badge tone="teal">{selected.grade}</Badge>
                <Badge tone="neutral">{difficultyText(selected.difficulty)}</Badge>
                <Badge tone="blue">{questionTypeText(selected.questionType)}</Badge>
                <Badge tone={selectedConfidence < 70 ? "orange" : "green"}>AI 置信度 {selectedConfidence}%</Badge>
                <Badge tone={selectedNeedsCare ? "orange" : "green"}>{riskText(selected.reviewRisk)}</Badge>
                <Badge tone="teal">{statusText(selected.auditStatus)}</Badge>
              </div>

              <div className="review-safety-banner">
                <strong>发布边界</strong>
                <span>当前内容属于审核台材料；只有点击“一审通过并发布”或“保存修改并发布”后，题目才可能进入学生练习。</span>
              </div>

              {selected.reviewWarnings?.length ? (
                <div className="review-warning-panel">
                  <strong>审核提示</strong>
                  {selected.reviewWarnings.map((warning) => (
                    <span key={warning}>{warning}</span>
                  ))}
                </div>
              ) : null}

              {selectedNeedsCare ? (
                <div className="review-ai-guidance">
                  <strong>建议重点核对</strong>
                  <span>请优先检查题干结构、答案选项、解析步骤和知识点挂接；必要时可先请求 AI 重析，重析结果仍需人工一审。</span>
                </div>
              ) : null}

              <article className="review-question">
                <div className="review-question-head">
                  <p className="eyebrow">题目正文</p>
                  <span>{reviewSourceText(selected.source)}</span>
                </div>
                <h2>{selected.stem}</h2>
                <div className="review-options">
                  {selected.options.map((option) => (
                    <p className={option.label === selected.answer ? "answer" : ""} key={option.label}>
                      {option.label}. {option.text}
                    </p>
                  ))}
                </div>
              </article>

              <div className="review-panels">
                <section>
                  <p className="eyebrow">答案与解析</p>
                  <strong>答案：{selected.answer}</strong>
                  <p>{selected.analysis}</p>
                </section>
                <section>
                  <p className="eyebrow">AI 挂接结果</p>
                  <p>主知识点：{selected.primaryKnowledgePointId}</p>
                  <p>前置知识：{selected.prerequisiteKnowledgePointIds.join("、") || "无"}</p>
                  <p>核心素养：{selected.coreLiteracy.join("、")}</p>
                  <p>能力目标：{selected.abilityTarget}</p>
                </section>
              </div>

              <div className="review-edit-panel">
                <p className="eyebrow">人工修正后通过</p>
                <label>
                  题干
                  <textarea value={editStem} onChange={(event) => setEditStem(event.target.value)} />
                </label>
                <div className="review-edit-row">
                  <label>
                    答案
                    <input value={editAnswer} onChange={(event) => setEditAnswer(event.target.value)} />
                  </label>
                  <label>
                    主知识点 ID
                    <input value={editKnowledgePointId} onChange={(event) => setEditKnowledgePointId(event.target.value)} />
                  </label>
                </div>
                <label>
                  解析
                  <textarea value={editAnalysis} onChange={(event) => setEditAnalysis(event.target.value)} />
                </label>
                <div className="review-edit-row">
                  <label>
                    核心素养标签
                    <input value={editCoreLiteracy} onChange={(event) => setEditCoreLiteracy(event.target.value)} />
                  </label>
                  <label>
                    能力目标
                    <input value={editAbilityTarget} onChange={(event) => setEditAbilityTarget(event.target.value)} />
                  </label>
                </div>
              </div>

              <label className="review-comment">
                审核意见
                <textarea
                  placeholder="例如：题干清晰，答案和知识点挂接准确。"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
              </label>

              <div className="review-actions">
                <div className="review-actions-copy">
                  <strong>审核动作</strong>
                  <span>所有发布动作都会写入审核记录；重新 AI 分析不会直接发布。</span>
                </div>
                <div className="review-action-buttons">
                  <button className="secondary-button" disabled={pendingAction === "review-reject"} type="button" onClick={() => submitReview("reject")}>
                    {pendingAction === "review-reject" ? "提交中" : "驳回"}
                  </button>
                  <button className="secondary-button" disabled={pendingAction === "review-retry-ai"} type="button" onClick={retryAiAnalysis}>
                    {pendingAction === "review-retry-ai" ? "创建中" : "重新 AI 分析"}
                  </button>
                  <button className="secondary-button" disabled={pendingAction === "review-edit-approve"} type="button" onClick={editAndApprove}>
                    {pendingAction === "review-edit-approve" ? "保存中" : "保存修改并发布"}
                  </button>
                  <button className="primary-button" disabled={pendingAction === "review-approve"} type="button" onClick={() => submitReview("approve")}>
                    {pendingAction === "review-approve" ? "发布中" : "一审通过并发布"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="empty-copy">待 AI 拆题或管理员上传新的试卷后，这里会出现待审核题。</p>
          )}
        </section>
      </section>

      <section className="card review-history">
        <div className="review-list-head">
          <p className="eyebrow">审核历史</p>
          <button
            className="secondary-button compact"
            disabled={pendingAction === "audit-refresh"}
            type="button"
            onClick={() => void withReviewPending("audit-refresh", "正在刷新审核历史...", async () => loadAuditRecords())}
          >
            {pendingAction === "audit-refresh" ? "刷新中" : "刷新"}
          </button>
        </div>
        {auditRecords.length ? (
          auditRecords.map((record) => (
            <div className="history-row" key={record.id}>
              <button
                className="history-toggle"
                type="button"
                onClick={() => setExpandedAuditId(expandedAuditId === record.id ? null : record.id)}
              >
                <strong>{auditActionText(record.action)}</strong>
                <span>{expandedAuditId === record.id ? "收起详情" : "查看详情"}</span>
              </button>
              <span>{record.targetType}：{record.targetId}</span>
              <small>审核员：{record.reviewerId}</small>
              <small>{record.comment || "无备注"} · {new Date(record.createdAt).toLocaleString("zh-CN")}</small>
              {expandedAuditId === record.id ? (
                <div className="history-detail">
                  <p className="eyebrow">变更摘要</p>
                  <ul>
                    {(record.changeSummary.length ? record.changeSummary : ["已记录审核操作"]).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {record.aiTask ? (
                    <div className="history-task">
                      <strong>关联 AI 任务</strong>
                      <span>{record.aiTask.taskType} · {aiTaskStatusText(record.aiTask.status)} · {record.aiTask.id}</span>
                      {record.aiTask.errorMessage ? <small>{record.aiTask.errorMessage}</small> : null}
                    </div>
                  ) : null}
                  <div className="history-filter-actions">
                    {record.filterHints.questionId && record.filterHints.auditStatus ? (
                      <button
                        className="secondary-button compact"
                        type="button"
                        onClick={() => applyHistoryFilter("定位该题", {
                          questionId: record.filterHints.questionId,
                          status: record.filterHints.auditStatus
                        })}
                      >
                        定位该题
                      </button>
                    ) : null}
                    {record.filterHints.knowledgePointId ? (
                      <button
                        className="secondary-button compact"
                        type="button"
                        onClick={() => applyHistoryFilter("同知识点待审题", {
                          knowledgePointId: record.filterHints.knowledgePointId,
                          status: "pending_review"
                        })}
                      >
                        同知识点
                      </button>
                    ) : null}
                    {record.filterHints.questionType ? (
                      <button
                        className="secondary-button compact"
                        type="button"
                        onClick={() => applyHistoryFilter("同题型待审题", {
                          questionType: record.filterHints.questionType,
                          status: "pending_review"
                        })}
                      >
                        同题型
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="empty-copy">暂无审核历史。</p>
        )}
      </section>

      <section className="review-note">
        <OperationNotice message={message} busy={isBusy} />
      </section>
    </main>
  );
}

function difficultyText(value: Question["difficulty"]) {
  const map = {
    basic: "基础",
    medium: "中等",
    advanced: "较难",
    integrated: "综合"
  };
  return map[value];
}

function questionTypeText(type?: string) {
  const map: Record<string, string> = {
    single_choice: "单选题",
    multiple_choice: "多选题",
    fill_blank: "填空题",
    short_answer: "简答题",
    calculation: "计算题",
    experiment: "实验题",
    inference: "推断题"
  };
  return type ? map[type] ?? type : "题型待确认";
}

function riskText(risk?: string) {
  const map: Record<string, string> = {
    normal: "常规审核",
    low_confidence: "低置信度",
    needs_structure_check: "结构需核对"
  };
  return risk ? map[risk] ?? risk : "常规审核";
}

function reviewSourceText(source: ReviewQuestion["source"]) {
  const map: Record<ReviewQuestion["source"], string> = {
    exam_paper: "整卷导入",
    ai: "AI 候选",
    human: "人工修正",
    seed: "种子题"
  };
  return map[source];
}

function auditActionText(action: string) {
  const map: Record<string, string> = {
    approve_and_publish: "一审发布",
    edit_and_publish: "修改后发布",
    reject: "驳回",
    request_edit: "转需修改",
    request_ai_retry: "请求 AI 重析"
  };
  return map[action] ?? action;
}

function statusText(value: Question["auditStatus"]) {
  const map = {
    ai_processing: "AI 处理中",
    pending_review: "待一审",
    needs_edit: "需修改",
    approved: "已通过",
    rejected: "已驳回",
    published: "已发布"
  };
  return map[value];
}

function aiTaskStatusText(status: string) {
  const map: Record<string, string> = {
    pending: "待执行",
    running: "执行中",
    needs_review: "待人工审核",
    failed: "执行失败",
    completed: "已完成"
  };
  return map[status] ?? status;
}

function getInitialReviewSourceFilter() {
  if (typeof window === "undefined") return "";
  const source = new URLSearchParams(window.location.search).get("source");
  return source === "ai" || source === "human" || source === "seed" || source === "exam_paper" ? source : "";
}

function getInitialReviewStatusFilter(): Question["auditStatus"] {
  if (typeof window === "undefined") return "pending_review";
  const status = new URLSearchParams(window.location.search).get("status");
  if (
    status === "ai_processing" ||
    status === "pending_review" ||
    status === "needs_edit" ||
    status === "approved" ||
    status === "rejected" ||
    status === "published"
  ) {
    return status;
  }
  return "pending_review";
}
