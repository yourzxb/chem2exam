import type { Grade, KnowledgePoint, KnowledgeRelation, Question } from "@/domain/types";
import { knowledgePoints, knowledgeRelations, questions } from "@/data/chemistry-seed";
import { getPrismaClient, hasDatabaseUrl } from "@/server/db/prisma";

export interface LearningRepository {
  getKnowledgeGraph(grade: Grade): Promise<{
    nodes: KnowledgePoint[];
    relations: KnowledgeRelation[];
    versionId: string;
  }>;
  getNextPublishedQuestion(grade: Grade, knowledgePointId?: string | null): Promise<Question | null>;
  getPublishedQuestion(questionId: string): Promise<Question | null>;
  getGradeKnowledgePoints(grade: Grade): Promise<KnowledgePoint[]>;
  getKnowledgeRelations(): Promise<KnowledgeRelation[]>;
}

class SeedLearningRepository implements LearningRepository {
  async getKnowledgeGraph(grade: Grade) {
    const nodes = knowledgePoints.filter((point) => point.grade === grade);
    const nodeIds = new Set(nodes.map((point: any) => point.id));
    const relations = knowledgeRelations.filter(
      (relation) => nodeIds.has(relation.fromPointId) && nodeIds.has(relation.toPointId)
    );
    return { nodes, relations, versionId: `${grade}-seed-v1` };
  }

  async getNextPublishedQuestion(grade: Grade, knowledgePointId?: string | null) {
    return (
      questions.find(
        (question) =>
          question.auditStatus === "published" &&
          question.grade === grade &&
          (!knowledgePointId || question.primaryKnowledgePointId === knowledgePointId)
      ) ?? null
    );
  }

  async getPublishedQuestion(questionId: string) {
    return questions.find((question) => question.id === questionId && question.auditStatus === "published") ?? null;
  }

  async getGradeKnowledgePoints(grade: Grade) {
    return knowledgePoints.filter((point) => point.grade === grade);
  }

  async getKnowledgeRelations() {
    return knowledgeRelations;
  }
}

class PrismaLearningRepository implements LearningRepository {
  async getKnowledgeGraph(grade: Grade) {
    const prisma = getPrismaClient();
    const dbGrade = toDbGrade(grade);
    const version = await prisma.knowledgeGraphVersion.findFirst({
      where: { grade: dbGrade, status: "published" },
      orderBy: { publishedAt: "desc" }
    });
    const nodes = await prisma.knowledgePoint.findMany({
      where: { grade: dbGrade, status: "published", ...(version ? { graphVersionId: version.id } : {}) },
      orderBy: { name: "asc" }
    });
    const nodeIds = new Set(nodes.map((point) => point.id));
    const relations = await prisma.knowledgeRelation.findMany({
      where: version ? { graphVersionId: version.id } : {}
    });

    return {
      versionId: version?.id ?? `${grade}-db`,
      nodes: nodes.map((point: any) => ({
        id: point.id,
        grade,
        name: point.name,
        description: point.description ?? "",
        x: point.x ?? 50,
        y: point.y ?? 50
      })),
      relations: relations
        .filter((relation: any) => nodeIds.has(relation.fromPointId) && nodeIds.has(relation.toPointId))
        .map((relation: any) => ({
          fromPointId: relation.fromPointId,
          toPointId: relation.toPointId,
          relationType: relation.relationType,
          weight: relation.weight ?? undefined
        }))
    };
  }

  async getNextPublishedQuestion(grade: Grade, knowledgePointId?: string | null) {
    const prisma = getPrismaClient();
    const row = await prisma.question.findFirst({
      where: {
        auditStatus: "published",
        grade: toDbGrade(grade),
        ...(knowledgePointId
          ? {
              knowledgeLinks: {
                some: {
                  knowledgePointId,
                  linkType: "primary"
                }
              }
            }
          : {})
      },
      include: { knowledgeLinks: true, literacyLinks: true },
      orderBy: { createdAt: "asc" }
    });
    return row ? toDomainQuestion(row) : null;
  }

  async getPublishedQuestion(questionId: string) {
    const prisma = getPrismaClient();
    const row = await prisma.question.findFirst({
      where: { id: questionId, auditStatus: "published" },
      include: { knowledgeLinks: true, literacyLinks: true }
    });
    return row ? toDomainQuestion(row) : null;
  }

  async getGradeKnowledgePoints(grade: Grade) {
    const prisma = getPrismaClient();
    const rows = await prisma.knowledgePoint.findMany({
      where: { grade: toDbGrade(grade), status: "published" }
    });
    return rows.map((point: any) => ({
      id: point.id,
      grade,
      name: point.name,
      description: point.description ?? "",
      x: point.x ?? 50,
      y: point.y ?? 50
    }));
  }

  async getKnowledgeRelations() {
    const prisma = getPrismaClient();
    const rows = await prisma.knowledgeRelation.findMany();
    return rows.map((relation: any) => ({
      fromPointId: relation.fromPointId,
      toPointId: relation.toPointId,
      relationType: relation.relationType,
      weight: relation.weight ?? undefined
    }));
  }
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

function toDomainQuestion(row: any): Question {
  const primary = row.knowledgeLinks.find((link: any) => link.linkType === "primary");
  const prerequisites = row.knowledgeLinks
    .filter((link: any) => link.linkType === "prerequisite")
    .map((link: any) => link.knowledgePointId);
  const literacyLinks = row.literacyLinks.map((link: any) => link.literacyTag);

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
    wrongFeedback: "这题需要先找到题干里的关键条件，再回到对应知识点判断。"
  };
}

export const learningRepository: LearningRepository = hasDatabaseUrl()
  ? new PrismaLearningRepository()
  : new SeedLearningRepository();
