import { createHash, randomUUID } from "node:crypto";
import type { AuditStatus, CoreLiteracy, Difficulty, Grade, KnowledgePoint, KnowledgeRelation, QuestionType, RelationType } from "@/domain/types";
import { knowledgePoints, knowledgeRelations, questions } from "@/data/chemistry-seed";
import { getPrismaClient, hasDatabaseUrl } from "@/server/db/prisma";

export const adminBatchConfirmText = "确认批量更新";

export type QuestionFilterSchemeScope = "personal" | "role" | "shared";

export interface AdminQuestionListItem {
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

export interface CreateKnowledgePointInput {
  grade: Grade;
  name: string;
  description?: string;
  x?: number;
  y?: number;
}

export interface CreateKnowledgeRelationInput {
  fromPointId: string;
  toPointId: string;
  relationType: RelationType;
}

export interface UpdateQuestionInput {
  auditStatus?: AuditStatus;
  difficulty?: Difficulty;
  medianTimeSeconds?: number;
  primaryKnowledgePointId?: string;
  questionType?: QuestionType;
  stem?: string;
  answer?: string;
  analysis?: string;
  coreLiteracy?: CoreLiteracy[];
}

export interface BatchQuestionPatch {
  auditStatus?: AuditStatus;
  difficulty?: Difficulty;
  primaryKnowledgePointId?: string;
  coreLiteracy?: CoreLiteracy[];
}

export interface BatchPreviewQuestionsInput {
  questionIds?: string[];
  filterSchemeId?: string;
  patch: BatchQuestionPatch;
}

export interface BatchUpdateQuestionsInput extends BatchPreviewQuestionsInput {
  previewToken: string;
  reason: string;
  confirmText: string;
}

export interface BatchQuestionPreviewItem {
  id: string;
  stem: string;
  current: BatchQuestionState;
  next: BatchQuestionState;
  diffSummary: string[];
}

export interface BatchQuestionState {
  auditStatus: AuditStatus;
  difficulty: Difficulty;
  primaryKnowledgePointId: string;
  coreLiteracy: string[];
}

export interface BatchQuestionPreview {
  previewToken: string;
  selectedCount: number;
  affectedCount: number;
  filterSchemeId?: string;
  filtersSnapshot?: QuestionFilterState;
  changes: string[];
  items: BatchQuestionPreviewItem[];
}

export interface BatchUpdateQuestionsResult {
  updatedCount: number;
  affectedCount: number;
  batchOperationId: string;
  previewToken: string;
}

export interface ListQuestionFilters {
  status?: AuditStatus;
  grade?: Grade;
  questionType?: QuestionType;
  knowledgePointId?: string;
}

export interface QuestionFilterState {
  status: AuditStatus | "all";
  grade: Grade | "all";
  questionType: QuestionType | "all";
  knowledgePointId: string;
}

export interface QuestionFilterSchemeInput {
  name: string;
  description?: string;
  scopeType: QuestionFilterSchemeScope;
  role?: string;
  filters: QuestionFilterState;
  sort?: Record<string, unknown> | null;
  columns?: string[] | null;
  isDefault?: boolean;
}

export interface AdminQuestionFilterScheme extends QuestionFilterSchemeInput {
  id: string;
  ownerUserId?: string;
  createdBy: string;
  updatedBy?: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListAdminAuditRecordFilters {
  batchId?: string;
  targetId?: string;
  action?: string;
  limit?: number;
}

export interface AdminAuditRecordItem {
  id: string;
  targetType: string;
  targetId: string;
  reviewerId: string;
  action: string;
  batchId?: string;
  comment?: string;
  metadata?: Record<string, unknown>;
  diffSummary: string[];
  createdAt: string;
}

export interface AdminContentRepository {
  listQuestions(filters?: ListQuestionFilters): Promise<AdminQuestionListItem[]>;
  updateQuestion(questionId: string, input: UpdateQuestionInput, adminUserId: string): Promise<AdminQuestionListItem | null>;
  previewBatchUpdate(input: BatchPreviewQuestionsInput, adminUserId: string, adminRole?: string): Promise<BatchQuestionPreview>;
  batchUpdateQuestions(input: BatchUpdateQuestionsInput, adminUserId: string, adminRole?: string): Promise<BatchUpdateQuestionsResult>;
  listQuestionFilterSchemes(adminUserId: string, adminRole?: string): Promise<AdminQuestionFilterScheme[]>;
  createQuestionFilterScheme(input: QuestionFilterSchemeInput, adminUserId: string, adminRole?: string): Promise<AdminQuestionFilterScheme>;
  updateQuestionFilterScheme(
    schemeId: string,
    input: QuestionFilterSchemeInput,
    adminUserId: string,
    adminRole?: string
  ): Promise<AdminQuestionFilterScheme | null>;
  deleteQuestionFilterScheme(schemeId: string, adminUserId: string, adminRole?: string): Promise<boolean>;
  listAdminAuditRecords(filters?: ListAdminAuditRecordFilters): Promise<AdminAuditRecordItem[]>;
  listKnowledgePoints(grade?: Grade): Promise<KnowledgePoint[]>;
  createKnowledgePoint(input: CreateKnowledgePointInput): Promise<KnowledgePoint>;
  listKnowledgeRelations(): Promise<KnowledgeRelation[]>;
  createKnowledgeRelation(input: CreateKnowledgeRelationInput): Promise<KnowledgeRelation>;
}

const memoryQuestionFilterSchemes: AdminQuestionFilterScheme[] = [];
const memoryAuditRecords: AdminAuditRecordItem[] = [];

class MemoryAdminContentRepository implements AdminContentRepository {
  async listQuestions(filters: ListQuestionFilters = {}) {
    return questions
      .filter((question) => !filters.status || question.auditStatus === filters.status)
      .filter((question) => !filters.grade || question.grade === filters.grade)
      .filter((question) => !filters.questionType || filters.questionType === "single_choice")
      .filter((question) => !filters.knowledgePointId || question.primaryKnowledgePointId === filters.knowledgePointId)
      .map((question) => ({
        id: question.id,
        grade: question.grade,
        stem: question.stem,
        answer: question.answer,
        analysis: question.analysis,
        auditStatus: question.auditStatus,
        questionType: "single_choice" as const,
        difficulty: question.difficulty,
        medianTimeSeconds: question.medianTimeSeconds,
        primaryKnowledgePointId: question.primaryKnowledgePointId,
        coreLiteracy: question.coreLiteracy
      }));
  }

  async updateQuestion(questionId: string, input: UpdateQuestionInput, adminUserId: string) {
    const question = questions.find((item) => item.id === questionId);
    if (!question) return null;
    const before = { ...question };
    Object.assign(question, {
      auditStatus: input.auditStatus ?? question.auditStatus,
      difficulty: input.difficulty ?? question.difficulty,
      medianTimeSeconds: input.medianTimeSeconds ?? question.medianTimeSeconds,
      primaryKnowledgePointId: input.primaryKnowledgePointId ?? question.primaryKnowledgePointId,
      stem: input.stem ?? question.stem,
      answer: input.answer ?? question.answer,
      analysis: input.analysis ?? question.analysis,
      coreLiteracy: input.coreLiteracy ?? question.coreLiteracy
    });
    memoryAuditRecords.unshift({
      id: createRepositoryId("audit"),
      targetType: "question",
      targetId: questionId,
      reviewerId: adminUserId,
      action: "admin_update_question",
      comment: "管理员维护题目元数据、审核状态或知识点挂接。",
      diffSummary: summarizeBatchDiff(toBatchQuestionStateFromMemory(before), toBatchQuestionStateFromMemory(question)),
      createdAt: new Date().toISOString()
    });
    return {
      id: question.id,
      grade: question.grade,
      stem: question.stem,
      answer: question.answer,
      analysis: question.analysis,
      auditStatus: question.auditStatus,
      questionType: input.questionType ?? "single_choice",
      difficulty: question.difficulty,
      medianTimeSeconds: question.medianTimeSeconds,
      primaryKnowledgePointId: question.primaryKnowledgePointId,
      coreLiteracy: question.coreLiteracy
    };
  }

  async previewBatchUpdate(input: BatchPreviewQuestionsInput, adminUserId: string, adminRole = "admin") {
    const { rows, scheme, filtersSnapshot } = await this.resolveMemoryBatchRows(input, adminUserId, adminRole);
    return buildBatchPreview(rows, input.patch, adminUserId, scheme?.id, filtersSnapshot, toBatchQuestionStateFromAdminItem);
  }

  async batchUpdateQuestions(input: BatchUpdateQuestionsInput, adminUserId: string, adminRole = "admin") {
    if (input.confirmText !== adminBatchConfirmText) {
      throw new Error("INVALID_BATCH_CONFIRM_TEXT");
    }
    const preview = await this.previewBatchUpdate(input, adminUserId, adminRole);
    if (preview.previewToken !== input.previewToken) {
      throw new Error("PREVIEW_TOKEN_MISMATCH");
    }

    const batchOperationId = createRepositoryId("batch");
    for (const question of questions) {
      if (!preview.items.some((item) => item.id === question.id)) continue;
      question.auditStatus = input.patch.auditStatus ?? question.auditStatus;
      question.difficulty = input.patch.difficulty ?? question.difficulty;
      question.primaryKnowledgePointId = input.patch.primaryKnowledgePointId ?? question.primaryKnowledgePointId;
      question.coreLiteracy = input.patch.coreLiteracy ?? question.coreLiteracy;
      const item = preview.items.find((previewItem) => previewItem.id === question.id);
      memoryAuditRecords.unshift({
        id: createRepositoryId("audit"),
        targetType: "question",
        targetId: question.id,
        reviewerId: adminUserId,
        action: "admin_batch_update_question",
        batchId: batchOperationId,
        comment: input.reason,
        metadata: {
          reason: input.reason,
          filterSchemeId: input.filterSchemeId,
          previewToken: input.previewToken,
          selectedCount: preview.selectedCount,
          affectedCount: preview.affectedCount
        },
        diffSummary: item?.diffSummary ?? ["已纳入批量维护。"],
        createdAt: new Date().toISOString()
      });
    }

    return {
      updatedCount: preview.selectedCount,
      affectedCount: preview.affectedCount,
      batchOperationId,
      previewToken: preview.previewToken
    };
  }

  async listQuestionFilterSchemes(adminUserId: string, adminRole = "admin") {
    return memoryQuestionFilterSchemes.filter((scheme) => canAccessQuestionFilterScheme(scheme, adminUserId, adminRole));
  }

  async createQuestionFilterScheme(input: QuestionFilterSchemeInput, adminUserId: string, adminRole = "admin") {
    const scopeType = normalizeQuestionFilterSchemeScope(input.scopeType);
    const now = new Date().toISOString();
    const scheme: AdminQuestionFilterScheme = {
      id: createRepositoryId("qfs"),
      name: input.name,
      description: input.description,
      scopeType,
      role: scopeType === "role" ? input.role || adminRole : undefined,
      ownerUserId: scopeType === "personal" ? adminUserId : undefined,
      filters: normalizeQuestionFilterState(input.filters),
      sort: input.sort ?? null,
      columns: input.columns ?? null,
      isDefault: Boolean(input.isDefault),
      schemaVersion: 1,
      createdBy: adminUserId,
      updatedBy: adminUserId,
      createdAt: now,
      updatedAt: now
    };
    memoryQuestionFilterSchemes.unshift(scheme);
    return scheme;
  }

  async updateQuestionFilterScheme(schemeId: string, input: QuestionFilterSchemeInput, adminUserId: string, adminRole = "admin") {
    const index = memoryQuestionFilterSchemes.findIndex(
      (scheme) => scheme.id === schemeId && canAccessQuestionFilterScheme(scheme, adminUserId, adminRole)
    );
    if (index < 0) return null;
    const scopeType = normalizeQuestionFilterSchemeScope(input.scopeType);
    memoryQuestionFilterSchemes[index] = {
      ...memoryQuestionFilterSchemes[index],
      name: input.name,
      description: input.description,
      scopeType,
      role: scopeType === "role" ? input.role || adminRole : undefined,
      ownerUserId: scopeType === "personal" ? adminUserId : undefined,
      filters: normalizeQuestionFilterState(input.filters),
      sort: input.sort ?? null,
      columns: input.columns ?? null,
      isDefault: Boolean(input.isDefault),
      updatedBy: adminUserId,
      updatedAt: new Date().toISOString()
    };
    return memoryQuestionFilterSchemes[index];
  }

  async deleteQuestionFilterScheme(schemeId: string, adminUserId: string, adminRole = "admin") {
    const index = memoryQuestionFilterSchemes.findIndex(
      (scheme) => scheme.id === schemeId && canAccessQuestionFilterScheme(scheme, adminUserId, adminRole)
    );
    if (index < 0) return false;
    memoryQuestionFilterSchemes.splice(index, 1);
    return true;
  }

  async listAdminAuditRecords(filters: ListAdminAuditRecordFilters = {}) {
    const limit = normalizeAuditLimit(filters.limit);
    return memoryAuditRecords
      .filter((record) => !filters.batchId || record.batchId === filters.batchId)
      .filter((record) => !filters.targetId || record.targetId === filters.targetId)
      .filter((record) => !filters.action || record.action === filters.action)
      .slice(0, limit);
  }

  async listKnowledgePoints(grade?: Grade) {
    return knowledgePoints.filter((point) => !grade || point.grade === grade);
  }

  async createKnowledgePoint(input: CreateKnowledgePointInput) {
    const point = {
      id: `kp_${Date.now()}`,
      grade: input.grade,
      name: input.name,
      description: input.description ?? "",
      x: input.x ?? 50,
      y: input.y ?? 50
    };
    knowledgePoints.push(point);
    return point;
  }

  async listKnowledgeRelations() {
    return knowledgeRelations;
  }

  async createKnowledgeRelation(input: CreateKnowledgeRelationInput) {
    const relation = { ...input };
    knowledgeRelations.push(relation);
    return relation;
  }

  private async resolveMemoryBatchRows(input: BatchPreviewQuestionsInput, adminUserId: string, adminRole: string) {
    const questionIds = normalizeIdList(input.questionIds);
    const scheme = input.filterSchemeId
      ? memoryQuestionFilterSchemes.find(
          (item) => item.id === input.filterSchemeId && canAccessQuestionFilterScheme(item, adminUserId, adminRole)
        )
      : undefined;
    if (input.filterSchemeId && !scheme) {
      throw new Error("FILTER_SCHEME_NOT_FOUND");
    }
    const filtersSnapshot = scheme?.filters;
    const rows = questionIds.length
      ? (await this.listQuestions()).filter((question) => questionIds.includes(question.id))
      : filtersSnapshot
        ? await this.listQuestions(toListQuestionFilters(filtersSnapshot))
        : [];
    if (!rows.length) {
      throw new Error("BATCH_TARGETS_REQUIRED");
    }
    return { rows, scheme, filtersSnapshot };
  }
}

class PrismaAdminContentRepository implements AdminContentRepository {
  async listQuestions(filters: ListQuestionFilters = {}) {
    const prisma = getPrismaClient();
    const rows = await prisma.question.findMany({
      where: buildQuestionWhere(filters),
      include: { knowledgeLinks: true, literacyLinks: true },
      orderBy: { updatedAt: "desc" },
      take: 100
    });

    return rows.map((row: any) => toAdminQuestionListItem(row));
  }

  async updateQuestion(questionId: string, input: UpdateQuestionInput, adminUserId: string) {
    const prisma = getPrismaClient();
    const before = await prisma.question.findUnique({
      where: { id: questionId },
      include: { knowledgeLinks: true, literacyLinks: true }
    });
    if (!before) return null;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: { id: questionId },
        data: {
          auditStatus: input.auditStatus,
          medianTimeSeconds: input.medianTimeSeconds,
          questionType: input.questionType,
          reviewedDifficulty: input.difficulty,
          stem: input.stem,
          answer: input.answer,
          analysis: input.analysis
        }
      });

      if (input.primaryKnowledgePointId) {
        await tx.knowledgePoint.findUniqueOrThrow({ where: { id: input.primaryKnowledgePointId } });
        const primary = before.knowledgeLinks.find((link: any) => link.linkType === "primary");
        if (primary) {
          await tx.questionKnowledgeLink.update({
            where: { id: primary.id },
            data: {
              knowledgePointId: input.primaryKnowledgePointId,
              source: "human",
              reviewedBy: adminUserId
            }
          });
        } else {
          await tx.questionKnowledgeLink.create({
            data: {
              questionId,
              knowledgePointId: input.primaryKnowledgePointId,
              linkType: "primary",
              source: "human",
              reviewedBy: adminUserId
            }
          });
        }
      }

      if (input.coreLiteracy) {
        await tx.questionLiteracyLink.deleteMany({ where: { questionId } });
        if (input.coreLiteracy.length) {
          await tx.questionLiteracyLink.createMany({
            data: input.coreLiteracy.map((tag) => ({
              questionId,
              literacyTag: tag,
              source: "human",
              confidence: 1
            }))
          });
        }
      }

      return tx.question.findUniqueOrThrow({
        where: { id: questionId },
        include: { knowledgeLinks: true, literacyLinks: true }
      });
    });

    await prisma.auditRecord.create({
      data: {
        targetType: "question",
        targetId: questionId,
        reviewerId: adminUserId,
        action: "admin_update_question",
        beforeSnapshot: before as any,
        afterSnapshot: updated as any,
        comment: "管理员维护题目元数据、审核状态或知识点挂接。"
      }
    });

    return toAdminQuestionListItem(updated);
  }

  async previewBatchUpdate(input: BatchPreviewQuestionsInput, adminUserId: string, adminRole = "admin") {
    const { rows, scheme, filtersSnapshot } = await this.resolveBatchRows(input, adminUserId, adminRole);
    return buildBatchPreview(rows, input.patch, adminUserId, scheme?.id, filtersSnapshot, toBatchQuestionStateFromPrismaRow);
  }

  async batchUpdateQuestions(input: BatchUpdateQuestionsInput, adminUserId: string, adminRole = "admin") {
    if (input.confirmText !== adminBatchConfirmText) {
      throw new Error("INVALID_BATCH_CONFIRM_TEXT");
    }

    const { rows: beforeRows, scheme, filtersSnapshot } = await this.resolveBatchRows(input, adminUserId, adminRole);
    const preview = buildBatchPreview(beforeRows, input.patch, adminUserId, scheme?.id, filtersSnapshot, toBatchQuestionStateFromPrismaRow);
    if (preview.previewToken !== input.previewToken) {
      throw new Error("PREVIEW_TOKEN_MISMATCH");
    }

    const prisma = getPrismaClient();
    const questionIds = beforeRows.map((row: any) => row.id);
    const transactionResult = await prisma.$transaction(async (tx: any) => {
      if (input.patch.primaryKnowledgePointId) {
        await tx.knowledgePoint.findUniqueOrThrow({ where: { id: input.patch.primaryKnowledgePointId } });
      }

      const questionData: Record<string, unknown> = {};
      if (input.patch.auditStatus) questionData.auditStatus = input.patch.auditStatus;
      if (input.patch.difficulty) questionData.reviewedDifficulty = input.patch.difficulty;
      if (Object.keys(questionData).length) {
        await tx.question.updateMany({
          where: { id: { in: questionIds } },
          data: questionData
        });
      }

      if (input.patch.primaryKnowledgePointId) {
        for (const before of beforeRows) {
          const primary = before.knowledgeLinks.find((link: any) => link.linkType === "primary");
          if (primary) {
            await tx.questionKnowledgeLink.update({
              where: { id: primary.id },
              data: {
                knowledgePointId: input.patch.primaryKnowledgePointId,
                source: "human",
                reviewedBy: adminUserId
              }
            });
          } else {
            await tx.questionKnowledgeLink.create({
              data: {
                questionId: before.id,
                knowledgePointId: input.patch.primaryKnowledgePointId,
                linkType: "primary",
                source: "human",
                reviewedBy: adminUserId
              }
            });
          }
        }
      }

      if (input.patch.coreLiteracy) {
        for (const before of beforeRows) {
          await tx.questionLiteracyLink.deleteMany({ where: { questionId: before.id } });
          if (input.patch.coreLiteracy.length) {
            await tx.questionLiteracyLink.createMany({
              data: input.patch.coreLiteracy.map((tag) => ({
                questionId: before.id,
                literacyTag: tag,
                source: "human",
                confidence: 1
              }))
            });
          }
        }
      }

      const updatedRows = await tx.question.findMany({
        where: { id: { in: questionIds } },
        include: { knowledgeLinks: true, literacyLinks: true }
      });
      const updatedById = new Map(updatedRows.map((row: any) => [row.id, row]));
      const batchOperationId = createRepositoryId("batch");
      const operationMetadata = {
        filterSchemeId: scheme?.id,
        filtersSnapshot,
        questionIds,
        previewToken: preview.previewToken
      };
      await tx.$executeRaw`
        INSERT INTO "AdminBatchOperation"
          ("id", "actorId", "action", "targetType", "selectedCount", "affectedCount", "filtersSnapshot", "selectionSnapshot", "patchSnapshot", "previewHash", "reason", "status", "completedAt")
        VALUES
          (${batchOperationId}, ${adminUserId}, ${"admin_batch_update_question"}, ${"question"}, ${preview.selectedCount}, ${preview.affectedCount},
           ${jsonString(filtersSnapshot ?? null)}::jsonb, ${jsonString({ questionIds, previewItems: preview.items })}::jsonb,
           ${jsonString(input.patch)}::jsonb, ${preview.previewToken}, ${input.reason}, ${"completed"}, ${new Date()})
      `;

      for (const before of beforeRows) {
        const itemPreview = preview.items.find((item) => item.id === before.id);
        await tx.$executeRaw`
          INSERT INTO "AuditRecord"
            ("id", "targetType", "targetId", "reviewerId", "action", "batchId", "beforeSnapshot", "afterSnapshot", "metadata", "diffSummary", "comment")
          VALUES
            (${createRepositoryId("audit")}, ${"question"}, ${before.id}, ${adminUserId}, ${"admin_batch_update_question"}, ${batchOperationId},
             ${jsonString(before)}::jsonb, ${jsonString(updatedById.get(before.id) ?? null)}::jsonb,
             ${jsonString({ ...operationMetadata, batchOperationId, reason: input.reason })}::jsonb,
             ${jsonString(itemPreview?.diffSummary ?? ["已纳入批量维护。"])}::jsonb, ${input.reason})
        `;
      }

      return { batchOperationId };
    });

    return {
      updatedCount: beforeRows.length,
      affectedCount: preview.affectedCount,
      batchOperationId: transactionResult.batchOperationId,
      previewToken: preview.previewToken
    };
  }

  async listQuestionFilterSchemes(adminUserId: string, adminRole = "admin") {
    const prisma = getPrismaClient();
    const rows = await prisma.$queryRaw<any[]>`
      SELECT "id", "name", "description", "ownerUserId", "scopeType", "role", "filters", "sort", "columns", "isDefault",
             "schemaVersion", "createdBy", "updatedBy", "createdAt", "updatedAt"
      FROM "QuestionFilterScheme"
      WHERE "archivedAt" IS NULL
        AND (
          ("scopeType" = 'personal' AND "ownerUserId" = ${adminUserId})
          OR ("scopeType" = 'role' AND "role" = ${adminRole})
          OR "scopeType" = 'shared'
        )
      ORDER BY "scopeType" ASC, "updatedAt" DESC
    `;
    return rows.map(toQuestionFilterScheme);
  }

  async createQuestionFilterScheme(input: QuestionFilterSchemeInput, adminUserId: string, adminRole = "admin") {
    const prisma = getPrismaClient();
    const scopeType = normalizeQuestionFilterSchemeScope(input.scopeType);
    const role = scopeType === "role" ? input.role || adminRole : null;
    const ownerUserId = scopeType === "personal" ? adminUserId : null;
    const id = createRepositoryId("qfs");
    const now = new Date();
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO "QuestionFilterScheme"
        ("id", "name", "description", "ownerUserId", "scopeType", "role", "filters", "sort", "columns", "isDefault", "schemaVersion", "createdBy", "updatedBy", "createdAt", "updatedAt")
      VALUES
        (${id}, ${input.name}, ${input.description ?? null}, ${ownerUserId}, ${scopeType}, ${role},
         ${jsonString(normalizeQuestionFilterState(input.filters))}::jsonb, ${jsonString(input.sort ?? null)}::jsonb,
         ${jsonString(input.columns ?? null)}::jsonb, ${Boolean(input.isDefault)}, ${1}, ${adminUserId}, ${adminUserId}, ${now}, ${now})
      RETURNING "id", "name", "description", "ownerUserId", "scopeType", "role", "filters", "sort", "columns", "isDefault",
                "schemaVersion", "createdBy", "updatedBy", "createdAt", "updatedAt"
    `;
    return toQuestionFilterScheme(rows[0]);
  }

  async updateQuestionFilterScheme(schemeId: string, input: QuestionFilterSchemeInput, adminUserId: string, adminRole = "admin") {
    const existing = await this.getQuestionFilterScheme(schemeId, adminUserId, adminRole);
    if (!existing) return null;
    const prisma = getPrismaClient();
    const scopeType = normalizeQuestionFilterSchemeScope(input.scopeType);
    const role = scopeType === "role" ? input.role || adminRole : null;
    const ownerUserId = scopeType === "personal" ? adminUserId : null;
    const rows = await prisma.$queryRaw<any[]>`
      UPDATE "QuestionFilterScheme"
      SET "name" = ${input.name},
          "description" = ${input.description ?? null},
          "ownerUserId" = ${ownerUserId},
          "scopeType" = ${scopeType},
          "role" = ${role},
          "filters" = ${jsonString(normalizeQuestionFilterState(input.filters))}::jsonb,
          "sort" = ${jsonString(input.sort ?? null)}::jsonb,
          "columns" = ${jsonString(input.columns ?? null)}::jsonb,
          "isDefault" = ${Boolean(input.isDefault)},
          "updatedBy" = ${adminUserId},
          "updatedAt" = ${new Date()}
      WHERE "id" = ${schemeId}
      RETURNING "id", "name", "description", "ownerUserId", "scopeType", "role", "filters", "sort", "columns", "isDefault",
                "schemaVersion", "createdBy", "updatedBy", "createdAt", "updatedAt"
    `;
    return rows[0] ? toQuestionFilterScheme(rows[0]) : null;
  }

  async deleteQuestionFilterScheme(schemeId: string, adminUserId: string, adminRole = "admin") {
    const existing = await this.getQuestionFilterScheme(schemeId, adminUserId, adminRole);
    if (!existing) return false;
    const prisma = getPrismaClient();
    const rows = await prisma.$queryRaw<any[]>`
      UPDATE "QuestionFilterScheme"
      SET "archivedAt" = ${new Date()},
          "updatedBy" = ${adminUserId},
          "updatedAt" = ${new Date()}
      WHERE "id" = ${schemeId}
      RETURNING "id"
    `;
    return Boolean(rows[0]);
  }

  async listAdminAuditRecords(filters: ListAdminAuditRecordFilters = {}) {
    const prisma = getPrismaClient();
    const limit = normalizeAuditLimit(filters.limit);
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (filters.batchId) {
      values.push(filters.batchId);
      conditions.push(`"batchId" = $${values.length}`);
    }
    if (filters.targetId) {
      values.push(filters.targetId);
      conditions.push(`"targetId" = $${values.length}`);
    }
    if (filters.action) {
      values.push(filters.action);
      conditions.push(`"action" = $${values.length}`);
    }
    values.push(limit);
    const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id", "targetType", "targetId", "reviewerId", "action", "batchId", "metadata", "diffSummary", "comment", "createdAt"
       FROM "AuditRecord"
       ${whereSql}
       ORDER BY "createdAt" DESC
       LIMIT $${values.length}`,
      ...values
    );
    return rows.map(toAdminAuditRecordItem);
  }

  async listKnowledgePoints(grade?: Grade) {
    const prisma = getPrismaClient();
    const rows = await prisma.knowledgePoint.findMany({
      where: grade ? { grade: toDbGrade(grade) } : {},
      orderBy: [{ grade: "asc" }, { name: "asc" }]
    });

    return rows.map((point: any) => ({
      id: point.id,
      grade: fromDbGrade(point.grade),
      name: point.name,
      description: point.description ?? "",
      x: point.x ?? 50,
      y: point.y ?? 50
    }));
  }

  async createKnowledgePoint(input: CreateKnowledgePointInput) {
    const prisma = getPrismaClient();
    const version = await ensureGraphVersion(input.grade);
    const point = await prisma.knowledgePoint.create({
      data: {
        grade: toDbGrade(input.grade),
        name: input.name,
        description: input.description,
        x: input.x ?? 50,
        y: input.y ?? 50,
        status: "published",
        graphVersionId: version.id
      }
    });

    return {
      id: point.id,
      grade: input.grade,
      name: point.name,
      description: point.description ?? "",
      x: point.x ?? 50,
      y: point.y ?? 50
    };
  }

  async listKnowledgeRelations() {
    const prisma = getPrismaClient();
    const rows = await prisma.knowledgeRelation.findMany({
      orderBy: { id: "asc" }
    });

    return rows.map((relation: any) => ({
      fromPointId: relation.fromPointId,
      toPointId: relation.toPointId,
      relationType: relation.relationType,
      weight: relation.weight ?? undefined
    }));
  }

  async createKnowledgeRelation(input: CreateKnowledgeRelationInput) {
    const prisma = getPrismaClient();
    const fromPoint = await prisma.knowledgePoint.findUnique({ where: { id: input.fromPointId } });
    if (!fromPoint) throw new Error("FROM_POINT_NOT_FOUND");
    await prisma.knowledgePoint.findUniqueOrThrow({ where: { id: input.toPointId } });
    await prisma.knowledgeRelation.create({
      data: {
        fromPointId: input.fromPointId,
        toPointId: input.toPointId,
        relationType: input.relationType,
        graphVersionId: fromPoint.graphVersionId
      }
    });
    return input;
  }

  private async getQuestionFilterScheme(schemeId: string, adminUserId: string, adminRole: string) {
    const prisma = getPrismaClient();
    const rows = await prisma.$queryRaw<any[]>`
      SELECT "id", "name", "description", "ownerUserId", "scopeType", "role", "filters", "sort", "columns", "isDefault",
             "schemaVersion", "createdBy", "updatedBy", "createdAt", "updatedAt"
      FROM "QuestionFilterScheme"
      WHERE "id" = ${schemeId}
        AND "archivedAt" IS NULL
        AND (
          ("scopeType" = 'personal' AND "ownerUserId" = ${adminUserId})
          OR ("scopeType" = 'role' AND "role" = ${adminRole})
          OR "scopeType" = 'shared'
        )
      LIMIT 1
    `;
    return rows[0] ? toQuestionFilterScheme(rows[0]) : null;
  }

  private async resolveBatchRows(input: BatchPreviewQuestionsInput, adminUserId: string, adminRole: string) {
    const prisma = getPrismaClient();
    const questionIds = normalizeIdList(input.questionIds);
    const scheme = input.filterSchemeId ? await this.getQuestionFilterScheme(input.filterSchemeId, adminUserId, adminRole) : null;
    if (input.filterSchemeId && !scheme) {
      throw new Error("FILTER_SCHEME_NOT_FOUND");
    }
    const filtersSnapshot = scheme?.filters;
    const where = questionIds.length
      ? { id: { in: questionIds } }
      : filtersSnapshot
        ? buildQuestionWhere(toListQuestionFilters(filtersSnapshot))
        : null;
    if (!where) {
      throw new Error("BATCH_TARGETS_REQUIRED");
    }
    const rows = await prisma.question.findMany({
      where,
      include: { knowledgeLinks: true, literacyLinks: true },
      orderBy: { updatedAt: "desc" },
      take: 200
    });
    if (!rows.length) {
      throw new Error("BATCH_TARGETS_REQUIRED");
    }
    if (input.patch.primaryKnowledgePointId) {
      const point = await prisma.knowledgePoint.findUnique({ where: { id: input.patch.primaryKnowledgePointId } });
      if (!point) throw new Error("KNOWLEDGE_POINT_NOT_FOUND");
    }
    return { rows, scheme: scheme ?? undefined, filtersSnapshot };
  }
}

async function ensureGraphVersion(grade: Grade) {
  const prisma = getPrismaClient();
  const dbGrade = toDbGrade(grade);
  const existing = await prisma.knowledgeGraphVersion.findFirst({
    where: { grade: dbGrade, status: "published" },
    orderBy: { publishedAt: "desc" }
  });
  if (existing) return existing;
  return prisma.knowledgeGraphVersion.create({
    data: {
      grade: dbGrade,
      name: `${grade} 管理端知识图谱`,
      status: "published",
      publishedAt: new Date()
    }
  });
}

function buildQuestionWhere(filters: ListQuestionFilters = {}) {
  return {
    ...(filters.status ? { auditStatus: filters.status } : {}),
    ...(filters.grade ? { grade: toDbGrade(filters.grade) } : {}),
    ...(filters.questionType ? { questionType: filters.questionType } : {}),
    ...(filters.knowledgePointId
      ? {
          knowledgeLinks: {
            some: {
              knowledgePointId: filters.knowledgePointId,
              linkType: "primary"
            }
          }
        }
      : {})
  };
}

function toAdminQuestionListItem(row: any): AdminQuestionListItem {
  return {
    id: row.id,
    grade: fromDbGrade(row.grade),
    stem: row.stem,
    answer: displayJson(row.answer),
    analysis: row.analysis ?? "",
    auditStatus: row.auditStatus,
    questionType: row.questionType,
    difficulty: row.reviewedDifficulty ?? row.aiDifficulty ?? "basic",
    medianTimeSeconds: row.medianTimeSeconds ?? 30,
    primaryKnowledgePointId: row.knowledgeLinks.find((link: any) => link.linkType === "primary")?.knowledgePointId ?? "",
    coreLiteracy: Array.from(new Set<string>(row.literacyLinks.map((link: any) => String(link.literacyTag))))
  };
}

function buildBatchPreview<Row>(
  rows: Row[],
  patch: BatchQuestionPatch,
  adminUserId: string,
  filterSchemeId: string | undefined,
  filtersSnapshot: QuestionFilterState | undefined,
  toState: (row: Row) => BatchQuestionState,
  getId: (row: Row) => string = (row) => String((row as any).id),
  getStem: (row: Row) => string = (row) => String((row as any).stem ?? "")
): BatchQuestionPreview {
  const items = rows.map((row) => {
    const current = toState(row);
    const next = applyBatchPatch(current, patch);
    return {
      id: getId(row),
      stem: getStem(row),
      current,
      next,
      diffSummary: summarizeBatchDiff(current, next)
    };
  });
  const affectedCount = items.filter((item) => item.diffSummary.some((summary) => !summary.startsWith("无字段变化"))).length;
  const tokenPayload = {
    action: "admin_batch_update_question",
    actorId: adminUserId,
    filterSchemeId,
    filtersSnapshot,
    patch: normalizeBatchPatchForToken(patch),
    questions: items
      .map((item) => ({
        id: item.id,
        current: item.current
      }))
      .sort((left, right) => left.id.localeCompare(right.id))
  };
  return {
    previewToken: createPreviewToken(tokenPayload),
    selectedCount: items.length,
    affectedCount,
    filterSchemeId,
    filtersSnapshot,
    changes: summarizePatch(patch),
    items
  };
}

function applyBatchPatch(current: BatchQuestionState, patch: BatchQuestionPatch): BatchQuestionState {
  return {
    auditStatus: patch.auditStatus ?? current.auditStatus,
    difficulty: patch.difficulty ?? current.difficulty,
    primaryKnowledgePointId: patch.primaryKnowledgePointId ?? current.primaryKnowledgePointId,
    coreLiteracy: patch.coreLiteracy ?? current.coreLiteracy
  };
}

function summarizePatch(patch: BatchQuestionPatch) {
  const changes: string[] = [];
  if (patch.auditStatus) changes.push(`审核状态：${patch.auditStatus}`);
  if (patch.difficulty) changes.push(`难度：${patch.difficulty}`);
  if (patch.primaryKnowledgePointId) changes.push(`主知识点：${patch.primaryKnowledgePointId}`);
  if (patch.coreLiteracy) {
    changes.push(patch.coreLiteracy.length ? `核心素养：${patch.coreLiteracy.join("、")}` : "核心素养：清空人工标签");
  }
  return changes.length ? changes : ["未选择可批量写入的字段"];
}

function summarizeBatchDiff(current: BatchQuestionState, next: BatchQuestionState) {
  const summary: string[] = [];
  if (current.auditStatus !== next.auditStatus) summary.push(`审核状态：${current.auditStatus} -> ${next.auditStatus}`);
  if (current.difficulty !== next.difficulty) summary.push(`难度：${current.difficulty} -> ${next.difficulty}`);
  if (current.primaryKnowledgePointId !== next.primaryKnowledgePointId) {
    summary.push(`主知识点：${current.primaryKnowledgePointId || "未挂接"} -> ${next.primaryKnowledgePointId || "未挂接"}`);
  }
  const currentLiteracy = current.coreLiteracy.join("、");
  const nextLiteracy = next.coreLiteracy.join("、");
  if (currentLiteracy !== nextLiteracy) {
    summary.push(`核心素养：${currentLiteracy || "未标注"} -> ${nextLiteracy || "未标注"}`);
  }
  return summary.length ? summary : ["无字段变化，将保留当前值。"];
}

function toBatchQuestionStateFromAdminItem(row: AdminQuestionListItem): BatchQuestionState {
  return {
    auditStatus: row.auditStatus,
    difficulty: row.difficulty,
    primaryKnowledgePointId: row.primaryKnowledgePointId,
    coreLiteracy: [...row.coreLiteracy].sort()
  };
}

function toBatchQuestionStateFromMemory(row: (typeof questions)[number]): BatchQuestionState {
  return {
    auditStatus: row.auditStatus,
    difficulty: row.difficulty,
    primaryKnowledgePointId: row.primaryKnowledgePointId,
    coreLiteracy: [...row.coreLiteracy].sort()
  };
}

function toBatchQuestionStateFromPrismaRow(row: any): BatchQuestionState {
  return {
    auditStatus: row.auditStatus,
    difficulty: row.reviewedDifficulty ?? row.aiDifficulty ?? "basic",
    primaryKnowledgePointId: row.knowledgeLinks.find((link: any) => link.linkType === "primary")?.knowledgePointId ?? "",
    coreLiteracy: Array.from(new Set<string>(row.literacyLinks.map((link: any) => String(link.literacyTag)))).sort()
  };
}

function normalizeBatchPatchForToken(patch: BatchQuestionPatch) {
  return {
    auditStatus: patch.auditStatus,
    difficulty: patch.difficulty,
    primaryKnowledgePointId: patch.primaryKnowledgePointId,
    coreLiteracy: patch.coreLiteracy ? [...patch.coreLiteracy].sort() : undefined
  };
}

function toQuestionFilterScheme(row: any): AdminQuestionFilterScheme {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    ownerUserId: row.ownerUserId ?? undefined,
    scopeType: normalizeQuestionFilterSchemeScope(row.scopeType),
    role: row.role ?? undefined,
    filters: normalizeQuestionFilterState(row.filters),
    sort: parseRecord(row.sort),
    columns: Array.isArray(row.columns) ? row.columns.map(String) : null,
    isDefault: Boolean(row.isDefault),
    schemaVersion: Number(row.schemaVersion ?? 1),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy ?? undefined,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt)
  };
}

function normalizeQuestionFilterState(value: unknown): QuestionFilterState {
  const record = parseRecord(value);
  return {
    status: isAuditStatusOrAll(record.status) ? record.status : "all",
    grade: isGradeOrAll(record.grade) ? record.grade : "all",
    questionType: isQuestionTypeOrAll(record.questionType) ? record.questionType : "all",
    knowledgePointId: typeof record.knowledgePointId === "string" ? record.knowledgePointId.trim() : ""
  };
}

function normalizeQuestionFilterSchemeScope(value: unknown): QuestionFilterSchemeScope {
  return value === "role" || value === "shared" || value === "personal" ? value : "personal";
}

function canAccessQuestionFilterScheme(scheme: AdminQuestionFilterScheme, adminUserId: string, adminRole: string) {
  if (scheme.scopeType === "shared") return true;
  if (scheme.scopeType === "role") return scheme.role === adminRole;
  return scheme.ownerUserId === adminUserId || scheme.createdBy === adminUserId;
}

function toListQuestionFilters(filters: QuestionFilterState): ListQuestionFilters {
  return {
    status: filters.status === "all" ? undefined : filters.status,
    grade: filters.grade === "all" ? undefined : filters.grade,
    questionType: filters.questionType === "all" ? undefined : filters.questionType,
    knowledgePointId: filters.knowledgePointId.trim() || undefined
  };
}

function toAdminAuditRecordItem(row: any): AdminAuditRecordItem {
  return {
    id: row.id,
    targetType: row.targetType,
    targetId: row.targetId,
    reviewerId: row.reviewerId,
    action: row.action,
    batchId: row.batchId ?? undefined,
    comment: row.comment ?? undefined,
    metadata: parseRecord(row.metadata),
    diffSummary: Array.isArray(row.diffSummary) ? row.diffSummary.map(String) : [],
    createdAt: toIsoString(row.createdAt)
  };
}

function normalizeIdList(ids: unknown) {
  return Array.from(
    new Set(Array.isArray(ids) ? ids.map((id) => (typeof id === "string" ? id.trim() : "")).filter(Boolean) : [])
  );
}

function normalizeAuditLimit(limit?: number) {
  if (!Number.isFinite(limit)) return 30;
  return Math.min(Math.max(Number(limit), 1), 100);
}

function createPreviewToken(payload: unknown) {
  return createHash("sha256").update(stableStringify(payload)).digest("hex").slice(0, 40);
}

function createRepositoryId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function jsonString(value: unknown) {
  return JSON.stringify(value ?? null);
}

function parseRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {};
}

function isAuditStatusOrAll(value: unknown): value is AuditStatus | "all" {
  const statuses: Array<AuditStatus | "all"> = ["all", "ai_processing", "pending_review", "needs_edit", "approved", "rejected", "published"];
  return typeof value === "string" && statuses.includes(value as AuditStatus | "all");
}

function isGradeOrAll(value: unknown): value is Grade | "all" {
  const grades: Array<Grade | "all"> = ["all", "初三", "高一", "高二", "高三"];
  return typeof value === "string" && grades.includes(value as Grade | "all");
}

function isQuestionTypeOrAll(value: unknown): value is QuestionType | "all" {
  const types: Array<QuestionType | "all"> = [
    "all",
    "single_choice",
    "multiple_choice",
    "fill_blank",
    "short_answer",
    "calculation",
    "experiment",
    "inference"
  ];
  return typeof value === "string" && types.includes(value as QuestionType | "all");
}

function toDbGrade(grade: Grade) {
  const map = {
    初三: "junior_three",
    高一: "senior_one",
    高二: "senior_two",
    高三: "senior_three"
  } as const;
  return map[grade];
}

function fromDbGrade(grade: string): Grade {
  const map: Record<string, Grade> = {
    junior_three: "初三",
    senior_one: "高一",
    senior_two: "高二",
    senior_three: "高三"
  };
  return map[grade] ?? "初三";
}

function displayJson(value: unknown) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

function toIsoString(value: unknown) {
  return value instanceof Date ? value.toISOString() : typeof value === "string" ? value : new Date().toISOString();
}

export const adminContentRepository: AdminContentRepository = hasDatabaseUrl()
  ? new PrismaAdminContentRepository()
  : new MemoryAdminContentRepository();
