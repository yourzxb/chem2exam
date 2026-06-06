import type { AuditStatus, CoreLiteracy, Question, QuestionType } from "@/domain/types";
import { questions } from "@/data/chemistry-seed";
import { getPrismaClient, hasDatabaseUrl } from "@/server/db/prisma";

export interface ReviewQuestion extends Question {
  source: "ai" | "human" | "seed" | "exam_paper";
  aiConfidence?: number;
  questionType?: QuestionType;
  reviewRisk?: "normal" | "low_confidence" | "needs_structure_check";
  reviewWarnings?: string[];
}

export interface ReviewQuestionPatch {
  stem?: string;
  answer?: string;
  analysis?: string;
  primaryKnowledgePointId?: string;
  coreLiteracy?: string[];
  abilityTarget?: string;
}

export interface ReviewAuditRecord {
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
    auditStatus?: AuditStatus;
    knowledgePointId?: string;
    questionType?: QuestionType;
  };
  createdAt: string;
}

const allowedCoreLiteracy: CoreLiteracy[] = [
  "macro_micro",
  "change_balance",
  "evidence_model",
  "inquiry_innovation",
  "attitude_responsibility"
];

export interface ReviewRepository {
  listReviewQuestions(status?: AuditStatus, filters?: ReviewQuestionFilters): Promise<ReviewQuestion[]>;
  approveQuestion(questionId: string, reviewerId: string, comment?: string): Promise<ReviewQuestion | null>;
  updateAndApproveQuestion(
    questionId: string,
    reviewerId: string,
    patch: ReviewQuestionPatch,
    comment?: string
  ): Promise<ReviewQuestion | null>;
  rejectQuestion(questionId: string, reviewerId: string, comment?: string): Promise<ReviewQuestion | null>;
  batchApproveQuestions(questionIds: string[], reviewerId: string, comment?: string): Promise<ReviewQuestion[]>;
  batchRequestEdits(questionIds: string[], reviewerId: string, comment?: string): Promise<ReviewQuestion[]>;
  recordAiRetryRequest(questionId: string, reviewerId: string, taskId: string, comment?: string): Promise<void>;
  listAuditRecords(limit?: number): Promise<ReviewAuditRecord[]>;
}

export interface ReviewQuestionFilters {
  questionId?: string;
  source?: "ai" | "human" | "seed" | "exam_paper";
  confidence?: "low" | "normal" | "all";
  questionType?: QuestionType;
  knowledgePointId?: string;
}

const memoryReviewQuestions = new Map<string, ReviewQuestion>(
  questions.map((question) => [
    question.id,
    {
      ...question,
      source: question.auditStatus === "pending_review" ? "ai" : "seed",
      aiConfidence: question.auditStatus === "pending_review" ? 0.86 : undefined
    }
  ])
);

class MemoryReviewRepository implements ReviewRepository {
  async listReviewQuestions(status: AuditStatus = "pending_review", filters: ReviewQuestionFilters = {}) {
    return Array.from(memoryReviewQuestions.values())
      .filter((question) => question.auditStatus === status)
      .filter((question) => matchesReviewFilters(question, filters));
  }

  async approveQuestion(questionId: string) {
    return updateMemoryQuestion(questionId, "published");
  }

  async updateAndApproveQuestion(questionId: string, _reviewerId: string, patch: ReviewQuestionPatch) {
    const question = memoryReviewQuestions.get(questionId);
    if (!question) return null;
    const updated: ReviewQuestion = {
      ...question,
      ...patch,
      coreLiteracy: patch.coreLiteracy ? normalizeCoreLiteracy(patch.coreLiteracy) : question.coreLiteracy,
      auditStatus: "published" as const
    };
    memoryReviewQuestions.set(questionId, updated);
    const seedQuestion = questions.find((item) => item.id === questionId);
    if (seedQuestion) {
      Object.assign(seedQuestion, updated);
    }
    return updated;
  }

  async rejectQuestion(questionId: string) {
    return updateMemoryQuestion(questionId, "rejected");
  }

  async batchApproveQuestions(questionIds: string[]) {
    const approved: ReviewQuestion[] = [];
    for (const questionId of questionIds) {
      const question = await this.approveQuestion(questionId);
      if (question) approved.push(question);
    }
    return approved;
  }

  async batchRequestEdits(questionIds: string[]) {
    const updated: ReviewQuestion[] = [];
    for (const questionId of questionIds) {
      const question = updateMemoryQuestion(questionId, "needs_edit");
      if (question) updated.push(question);
    }
    return updated;
  }

  async listAuditRecords() {
    return [];
  }

  async recordAiRetryRequest() {
    return undefined;
  }
}

class PrismaReviewRepository implements ReviewRepository {
  async listReviewQuestions(status: AuditStatus = "pending_review", filters: ReviewQuestionFilters = {}) {
    const prisma = getPrismaClient();
    const sourceFilter = filters.source === "seed" ? "admin" : filters.source === "exam_paper" ? undefined : filters.source;
    const rows = await prisma.question.findMany({
      where: {
        id: filters.questionId,
        auditStatus: status,
        questionType: filters.questionType,
        knowledgeLinks: filters.knowledgePointId
          ? { some: { knowledgePointId: filters.knowledgePointId } }
          : sourceFilter
            ? { some: { source: sourceFilter } }
            : undefined
      },
      include: { knowledgeLinks: true, literacyLinks: true },
      orderBy: { createdAt: "asc" }
    });
    return rows.map((row: any) => toReviewQuestion(row)).filter((question) => matchesReviewFilters(question, filters));
  }

  async approveQuestion(questionId: string, reviewerId: string, comment?: string) {
    return this.updateStatus(questionId, "published", reviewerId, comment, "approve_and_publish");
  }

  async updateAndApproveQuestion(
    questionId: string,
    reviewerId: string,
    patch: ReviewQuestionPatch,
    comment?: string
  ) {
    const prisma = getPrismaClient();
    const before = await prisma.question.findUnique({
      where: { id: questionId },
      include: { knowledgeLinks: true, literacyLinks: true }
    });
    if (!before) return null;

    const updated = await prisma.$transaction(async (tx) => {
      const question = await tx.question.update({
        where: { id: questionId },
        data: {
          stem: patch.stem,
          answer: patch.answer,
          analysis: patch.analysis,
          auditStatus: "published"
        }
      });

      if (patch.primaryKnowledgePointId) {
        const primary = before.knowledgeLinks.find((link: any) => link.linkType === "primary");
        if (primary) {
          await tx.questionKnowledgeLink.update({
            where: { id: primary.id },
            data: {
              knowledgePointId: patch.primaryKnowledgePointId,
              source: "human",
              reviewedBy: reviewerId
            }
          });
        } else {
          await tx.questionKnowledgeLink.create({
            data: {
              questionId,
              knowledgePointId: patch.primaryKnowledgePointId,
              linkType: "primary",
              source: "human",
              reviewedBy: reviewerId
            }
          });
        }
      }

      if (patch.coreLiteracy) {
        const normalizedTags = normalizeCoreLiteracy(patch.coreLiteracy);
        await tx.questionLiteracyLink.deleteMany({ where: { questionId } });
        for (const literacyTag of normalizedTags) {
          await tx.questionLiteracyLink.create({
            data: {
              questionId,
              literacyTag,
              abilityTarget: patch.abilityTarget,
              source: "human"
            }
          });
        }
      } else if (patch.abilityTarget) {
        await tx.questionLiteracyLink.updateMany({
          where: { questionId },
          data: { abilityTarget: patch.abilityTarget, source: "human" }
        });
      }

      return tx.question.findUniqueOrThrow({
        where: { id: question.id },
        include: { knowledgeLinks: true, literacyLinks: true }
      });
    });

    await prisma.auditRecord.create({
      data: {
        targetType: "question",
        targetId: questionId,
        reviewerId,
        action: "edit_and_publish",
        beforeSnapshot: before as any,
        afterSnapshot: updated as any,
        comment
      }
    });

    return toReviewQuestion(updated);
  }

  async rejectQuestion(questionId: string, reviewerId: string, comment?: string) {
    return this.updateStatus(questionId, "rejected", reviewerId, comment, "reject");
  }

  async batchApproveQuestions(questionIds: string[], reviewerId: string, comment?: string) {
    const approved: ReviewQuestion[] = [];
    for (const questionId of questionIds) {
      const question = await this.approveQuestion(questionId, reviewerId, comment);
      if (question) approved.push(question);
    }
    return approved;
  }

  async batchRequestEdits(questionIds: string[], reviewerId: string, comment?: string) {
    const requested: ReviewQuestion[] = [];
    for (const questionId of questionIds) {
      const question = await this.updateStatus(questionId, "needs_edit", reviewerId, comment, "request_edit");
      if (question) requested.push(question);
    }
    return requested;
  }

  async listAuditRecords(limit = 30) {
    const prisma = getPrismaClient();
    const rows = await prisma.auditRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: limit
    });
    const taskIds = rows.map((row: any) => extractAiTaskId(row.afterSnapshot)).filter((id): id is string => Boolean(id));
    const tasks = taskIds.length
      ? await prisma.aiTask.findMany({ where: { id: { in: taskIds } } })
      : [];
    const taskMap = new Map(tasks.map((task: any) => [task.id, task]));

    return rows.map((row: any) => ({
      id: row.id,
      targetType: row.targetType,
      targetId: row.targetId,
      reviewerId: row.reviewerId,
      action: row.action,
      comment: row.comment ?? undefined,
      changeSummary: summarizeAuditChange(row.action, row.beforeSnapshot, row.afterSnapshot),
      aiTask: toAuditAiTask(taskMap.get(extractAiTaskId(row.afterSnapshot) ?? "")),
      filterHints: buildAuditFilterHints(row.targetId, row.beforeSnapshot, row.afterSnapshot),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt
    }));
  }

  async recordAiRetryRequest(questionId: string, reviewerId: string, taskId: string, comment?: string) {
    const prisma = getPrismaClient();
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { knowledgeLinks: true, literacyLinks: true }
    });
    if (!question) return;

    await prisma.auditRecord.create({
      data: {
        targetType: "question",
        targetId: questionId,
        reviewerId,
        action: "request_ai_retry",
        beforeSnapshot: question as any,
        afterSnapshot: {
          aiTaskId: taskId,
          status: "pending",
          reviewPolicy: "AI 重新分析结果必须进入人工一审，通过后才发布。"
        },
        comment
      }
    });
  }

  private async updateStatus(
    questionId: string,
    status: AuditStatus,
    reviewerId: string,
    comment: string | undefined,
    action: string
  ) {
    const prisma = getPrismaClient();
    const before = await prisma.question.findUnique({
      where: { id: questionId },
      include: { knowledgeLinks: true, literacyLinks: true }
    });
    if (!before) return null;

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: { auditStatus: status },
      include: { knowledgeLinks: true, literacyLinks: true }
    });

    await prisma.auditRecord.create({
      data: {
        targetType: "question",
        targetId: questionId,
        reviewerId,
        action,
        beforeSnapshot: before as any,
        afterSnapshot: updated as any,
        comment
      }
    });

    return toReviewQuestion(updated);
  }
}

function updateMemoryQuestion(questionId: string, status: AuditStatus) {
  const question = memoryReviewQuestions.get(questionId);
  if (!question) return null;
  const updated = { ...question, auditStatus: status };
  memoryReviewQuestions.set(questionId, updated);
  const seedQuestion = questions.find((item) => item.id === questionId);
  if (seedQuestion) {
    seedQuestion.auditStatus = status;
  }
  return updated;
}

function toReviewQuestion(row: any): ReviewQuestion {
  const primary = row.knowledgeLinks.find((link: any) => link.linkType === "primary");
  const prerequisites = row.knowledgeLinks
    .filter((link: any) => link.linkType === "prerequisite")
    .map((link: any) => link.knowledgePointId);
  const literacyLinks = normalizeCoreLiteracy(row.literacyLinks.map((link: any) => link.literacyTag));
  const sourceMeta = parseRecord(row.sourceMeta);
  const warnings = Array.isArray(sourceMeta.warnings) ? sourceMeta.warnings.map(String) : [];
  const reviewRisk = normalizeReviewRisk(sourceMeta.reviewRisk, primary?.confidence);

  return {
    id: row.id,
    grade: fromDbGrade(row.grade),
    stem: row.stem,
    options: Array.isArray(row.options) ? row.options : [],
    answer: String(row.answer),
    analysis: row.analysis ?? "",
    difficulty: row.reviewedDifficulty ?? row.aiDifficulty ?? "basic",
    medianTimeSeconds: row.medianTimeSeconds ?? 30,
    auditStatus: row.auditStatus,
    primaryKnowledgePointId: primary?.knowledgePointId ?? "",
    prerequisiteKnowledgePointIds: prerequisites,
    coreLiteracy: literacyLinks,
    abilityTarget: row.literacyLinks[0]?.abilityTarget ?? "能运用化学知识解决问题。",
    positiveFeedback: "你能抓住题目中的关键证据，化学思维正在变清楚。",
    wrongFeedback: "这题需要先找到题干里的关键条件，再回到对应知识点判断。",
    source:
      sourceMeta.source === "exam_paper_import"
        ? "exam_paper"
        : primary?.source === "human"
          ? "human"
          : primary?.source === "admin"
            ? "seed"
            : "ai",
    aiConfidence: primary?.confidence ?? undefined,
    questionType: row.questionType,
    reviewRisk,
    reviewWarnings: warnings
  };
}

function matchesReviewFilters(question: ReviewQuestion, filters: ReviewQuestionFilters) {
  if (filters.source && question.source !== filters.source) return false;
  if (filters.questionType && question.questionType !== filters.questionType) return false;
  if (filters.knowledgePointId && question.primaryKnowledgePointId !== filters.knowledgePointId && !question.prerequisiteKnowledgePointIds.includes(filters.knowledgePointId)) {
    return false;
  }
  if (filters.confidence === "low" && (question.aiConfidence ?? 1) >= 0.7 && question.reviewRisk !== "low_confidence") return false;
  if (filters.confidence === "normal" && ((question.aiConfidence ?? 1) < 0.7 || question.reviewRisk === "low_confidence")) return false;
  return true;
}

function parseRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function buildAuditFilterHints(targetId: string, beforeSnapshot: unknown, afterSnapshot: unknown) {
  const before = parseRecord(beforeSnapshot);
  const after = parseRecord(afterSnapshot);
  return {
    questionId: targetId,
    auditStatus: normalizeAuditStatus(stringValue(after.auditStatus) ?? stringValue(before.auditStatus)),
    knowledgePointId: primaryKnowledgePointId(after) ?? primaryKnowledgePointId(before),
    questionType: normalizeQuestionType(stringValue(after.questionType) ?? stringValue(before.questionType))
  };
}

function summarizeAuditChange(action: string, beforeSnapshot: unknown, afterSnapshot: unknown) {
  const before = parseRecord(beforeSnapshot);
  const after = parseRecord(afterSnapshot);
  const summary: string[] = [];

  const beforeStatus = stringValue(before.auditStatus);
  const afterStatus = stringValue(after.auditStatus);
  if (beforeStatus && afterStatus && beforeStatus !== afterStatus) {
    summary.push(`审核状态：${statusText(beforeStatus)} -> ${statusText(afterStatus)}`);
  }

  appendFieldChange(summary, "题干", before.stem, after.stem);
  appendFieldChange(summary, "答案", before.answer, after.answer);
  appendFieldChange(summary, "解析", before.analysis, after.analysis);

  const beforeKnowledgePoint = primaryKnowledgePointId(before);
  const afterKnowledgePoint = primaryKnowledgePointId(after);
  if (beforeKnowledgePoint && afterKnowledgePoint && beforeKnowledgePoint !== afterKnowledgePoint) {
    summary.push(`主知识点：${beforeKnowledgePoint} -> ${afterKnowledgePoint}`);
  }

  const beforeLiteracy = literacyTags(before);
  const afterLiteracy = literacyTags(after);
  if (beforeLiteracy && afterLiteracy && beforeLiteracy !== afterLiteracy) {
    summary.push(`核心素养：${beforeLiteracy} -> ${afterLiteracy}`);
  }

  const aiTaskId = extractAiTaskId(afterSnapshot);
  if (action === "request_ai_retry" && aiTaskId) {
    summary.push(`已创建 AI 重析任务：${aiTaskId}`);
  }

  if (!summary.length) {
    summary.push(defaultAuditSummary(action));
  }
  return summary;
}

function appendFieldChange(summary: string[], label: string, beforeValue: unknown, afterValue: unknown) {
  const beforeText = stringValue(beforeValue);
  const afterText = stringValue(afterValue);
  if (beforeText && afterText && beforeText !== afterText) {
    summary.push(`${label}已人工修正`);
  }
}

function extractAiTaskId(snapshot: unknown) {
  const record = parseRecord(snapshot);
  return stringValue(record.aiTaskId);
}

function toAuditAiTask(task: any) {
  if (!task) return undefined;
  return {
    id: task.id,
    status: task.status,
    taskType: task.taskType,
    errorMessage: task.errorMessage ?? undefined
  };
}

function primaryKnowledgePointId(snapshot: Record<string, unknown>) {
  const links = Array.isArray(snapshot.knowledgeLinks) ? snapshot.knowledgeLinks : [];
  const primary = links.find((link) => parseRecord(link).linkType === "primary");
  return primary ? stringValue(parseRecord(primary).knowledgePointId) : undefined;
}

function literacyTags(snapshot: Record<string, unknown>) {
  const links = Array.isArray(snapshot.literacyLinks) ? snapshot.literacyLinks : [];
  const tags = links.map((link) => stringValue(parseRecord(link).literacyTag)).filter(Boolean);
  return tags.length ? tags.join("、") : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeAuditStatus(value?: string): AuditStatus | undefined {
  const statuses: AuditStatus[] = ["ai_processing", "pending_review", "needs_edit", "approved", "rejected", "published"];
  return value && statuses.includes(value as AuditStatus) ? (value as AuditStatus) : undefined;
}

function normalizeQuestionType(value?: string): QuestionType | undefined {
  const types: QuestionType[] = ["single_choice", "multiple_choice", "fill_blank", "short_answer", "calculation", "experiment", "inference"];
  return value && types.includes(value as QuestionType) ? (value as QuestionType) : undefined;
}

function defaultAuditSummary(action: string) {
  const map: Record<string, string> = {
    approve_and_publish: "一审通过并发布",
    edit_and_publish: "人工修正后发布",
    reject: "已驳回题目",
    request_edit: "已转为需修改",
    request_ai_retry: "已请求 AI 重新分析"
  };
  return map[action] ?? "已记录审核操作";
}

function statusText(status: string) {
  const map: Record<string, string> = {
    ai_processing: "AI 处理中",
    pending_review: "待一审",
    needs_edit: "需修改",
    approved: "已通过",
    rejected: "已驳回",
    published: "已发布"
  };
  return map[status] ?? status;
}

function normalizeReviewRisk(value: unknown, confidence?: number) {
  if (value === "low_confidence" || value === "needs_structure_check" || value === "normal") return value;
  if (typeof confidence === "number" && confidence < 0.7) return "low_confidence";
  return "normal";
}

function fromDbGrade(grade: string) {
  const map = {
    junior_three: "初三",
    senior_one: "高一",
    senior_two: "高二",
    senior_three: "高三"
  } as const;
  return map[grade as keyof typeof map] ?? "初三";
}

function normalizeCoreLiteracy(tags: string[]): CoreLiteracy[] {
  const filtered = tags.filter((tag): tag is CoreLiteracy => allowedCoreLiteracy.includes(tag as CoreLiteracy));
  return filtered.length ? filtered : ["evidence_model"];
}

export const reviewRepository: ReviewRepository = hasDatabaseUrl()
  ? new PrismaReviewRepository()
  : new MemoryReviewRepository();
