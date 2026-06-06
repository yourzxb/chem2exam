import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:4174";
const username = `review_verify_${Date.now()}`;
const password = "123456";

async function main() {
  const { cookie, user } = await registerAdmin();
  const model = await createModel(cookie);
  const imported = await importPaper(cookie, model.id);
  assert(imported.createdQuestionIds.length >= 4, "expected import to create at least 4 questions");

  const pendingImported = await fetchReviewQuestions(cookie, { status: "pending_review", source: "exam_paper" });
  for (const questionId of imported.createdQuestionIds) {
    assert(pendingImported.questions.some((question) => question.id === questionId), `expected exam-paper review queue to include ${questionId}`);
  }

  const experiment = await fetchReviewQuestions(cookie, { status: "pending_review", questionType: "experiment" });
  assert(experiment.questions.some((question) => imported.createdQuestionIds.includes(question.id)), "expected experiment filter to include imported question");

  const calculation = await fetchReviewQuestions(cookie, { status: "pending_review", questionType: "calculation" });
  assert(calculation.questions.some((question) => imported.createdQuestionIds.includes(question.id)), "expected calculation filter to include imported question");

  const importedPending = pendingImported.questions.filter((question) => imported.createdQuestionIds.includes(question.id));
  const linkedKnowledgePointId = importedPending.find((question) => question.primaryKnowledgePointId)?.primaryKnowledgePointId;
  assert(linkedKnowledgePointId, "expected imported questions to include a primary knowledge point");
  const byKnowledgePoint = await fetchReviewQuestions(cookie, { status: "pending_review", knowledgePointId: linkedKnowledgePointId });
  assert(
    byKnowledgePoint.questions.some((question) => imported.createdQuestionIds.includes(question.id)),
    "expected knowledge point filter to include imported question"
  );

  const lowConfidence = await fetchReviewQuestions(cookie, { status: "pending_review", confidence: "low" });
  const lowIds = lowConfidence.questions.filter((question) => imported.createdQuestionIds.includes(question.id)).map((question) => question.id);
  assert(lowIds.length >= 1, "expected at least one imported low-confidence question");

  const batchEdit = await postJson(cookie, "/api/review/questions/batch-needs-edit", {
    ids: lowIds,
    comment: "数据库验证：低置信度批量转需修改"
  });
  assert(batchEdit.requestedCount === lowIds.length, `expected ${lowIds.length} low-confidence questions to move to needs_edit`);

  const needsEdit = await fetchReviewQuestions(cookie, { status: "needs_edit", confidence: "low" });
  assert(lowIds.every((id) => needsEdit.questions.some((question) => question.id === id)), "expected low-confidence questions in needs_edit queue");

  const retryTarget = pendingImported.questions.find((question) => imported.createdQuestionIds.includes(question.id) && !lowIds.includes(question.id));
  assert(retryTarget, "expected one imported pending question for AI retry");
  const retry = await postJson(cookie, `/api/review/questions/${retryTarget.id}/retry-ai`, {
    comment: "数据库验证：请求 AI 重新分析"
  });
  assert(retry.task?.status === "pending", "expected retry task to be pending");

  const auditResponse = await fetch(`${baseUrl}/api/review/audit-records?limit=30`, {
    headers: { Cookie: cookie }
  });
  if (!auditResponse.ok) {
    throw new Error(`audit records failed: ${auditResponse.status} ${await auditResponse.text()}`);
  }
  const audit = await auditResponse.json();
  const retryAudit = audit.records.find((record) => record.action === "request_ai_retry" && record.targetId === retryTarget.id);
  assert(retryAudit, "expected audit history to include AI retry request");
  assert(Array.isArray(retryAudit.changeSummary) && retryAudit.changeSummary.length > 0, "expected audit change summary");
  assert(retryAudit.aiTask?.id === retry.task.id, "expected audit history to include linked AI task");
  assert(retryAudit.filterHints?.questionId === retryTarget.id, "expected audit history to include question filter hint");
  assert(retryAudit.filterHints?.knowledgePointId, "expected audit history to include knowledge point filter hint");
  assert(retryAudit.filterHints?.questionType, "expected audit history to include question type filter hint");

  const locatedRetryTarget = await fetchReviewQuestions(cookie, {
    status: retryAudit.filterHints.auditStatus ?? "pending_review",
    questionId: retryAudit.filterHints.questionId
  });
  assert(
    locatedRetryTarget.questions.length === 1 && locatedRetryTarget.questions[0].id === retryTarget.id,
    "expected questionId filter to locate the audited question"
  );

  const published = await postJson(cookie, `/api/review/questions/${retryTarget.id}/approve`, {
    comment: "数据库验证：一审发布"
  });
  assert(published.question?.auditStatus === "published", "expected approved question to be published");

  const studentQuestion = await prisma.question.findUnique({ where: { id: retryTarget.id } });
  assert(studentQuestion?.auditStatus === "published", "expected database question status to be published");

  console.log(
    JSON.stringify(
      {
        ok: true,
        adminUserId: user.id,
        importedQuestions: imported.createdQuestionIds.length,
        lowConfidenceMoved: lowIds.length,
        retryTaskId: retry.task.id,
        publishedQuestionId: retryTarget.id,
        auditRecordsChecked: audit.records.length
      },
      null,
      2
    )
  );
}

async function registerAdmin() {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role: "admin" })
  });
  if (!response.ok) {
    throw new Error(`admin register failed: ${response.status} ${await response.text()}`);
  }
  const cookie = response.headers.get("set-cookie");
  assert(cookie, "admin register response did not set a session cookie");
  const { user } = await response.json();
  return { cookie, user };
}

async function createModel(cookie) {
  const { model } = await postJson(cookie, "/api/admin/ai/models", {
    provider: "DeepSeek",
    apiBaseUrl: "https://api.deepseek.example",
    apiKey: `verify-key-${Date.now()}`,
    modelName: "deepseek-chat",
    temperature: 0.2,
    timeoutSeconds: 30
  });
  assert(model?.id, "expected model config to be created");
  assert(!JSON.stringify(model).includes("verify-key-"), "model response must not expose raw API key");
  return model;
}

async function importPaper(cookie, modelConfigId) {
  const { result } = await postJson(cookie, "/api/admin/exam-papers/import", {
    title: `数据库验证整卷 ${Date.now()}`,
    examType: "中高考真题",
    year: 2026,
    region: "本地验证",
    grade: "初三",
    modelConfigId,
    paperText: [
      "1. 下列关于酸碱盐和 pH 的说法正确的是 A. 酸一定能使酚酞变红 B. 碱性溶液 pH 大于 7 C. 盐溶液一定显中性 D. 中和反应一定无现象",
      "2. 实验探究题：某同学向未知溶液中滴加紫色石蕊试液。（1）观察颜色变化。（2）说明判断依据。",
      "3. 计算题：某溶液质量分数为 10%，取 50g 溶液，求其中溶质质量。",
      "4. 下列说法正确的是 A. 甲 B. 乙 C. 丙 D. 丁"
    ].join("\n"),
    answerAnalysisText: [
      "1. 答案B 解析：碱性溶液 pH 大于 7，需结合酸碱盐基础判断。",
      "2. 答案A 解析：根据实验现象和证据进行判断。",
      "3. 答案A 解析：溶质质量等于溶液质量乘以质量分数。",
      "4. 答案A 解析：题干未命中强知识点关键词，应进入低置信度人工审核。"
    ].join("\n")
  });
  assert(result?.reviewStatus === "pending_review", "imported questions must enter review");
  return result;
}

async function fetchReviewQuestions(cookie, params) {
  const query = new URLSearchParams(params);
  const response = await fetch(`${baseUrl}/api/review/questions?${query.toString()}`, {
    headers: { Cookie: cookie }
  });
  if (!response.ok) {
    throw new Error(`review query failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
