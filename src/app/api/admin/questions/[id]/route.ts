import { NextResponse } from "next/server";
import type { AuditStatus, CoreLiteracy, Difficulty, QuestionType } from "@/domain/types";
import { requireAdmin } from "@/server/auth/roles";
import { adminContentRepository } from "@/server/repositories/admin-content-repository";

const allowedStatuses: AuditStatus[] = ["ai_processing", "pending_review", "needs_edit", "approved", "rejected", "published"];
const allowedQuestionTypes: QuestionType[] = ["single_choice", "multiple_choice", "fill_blank", "short_answer", "calculation", "experiment", "inference"];
const allowedDifficulties: Difficulty[] = ["basic", "medium", "advanced", "integrated"];
const allowedCoreLiteracy: CoreLiteracy[] = [
  "macro_micro",
  "change_balance",
  "evidence_model",
  "inquiry_innovation",
  "attitude_responsibility"
];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { id } = await context.params;
  const body = (await request.json()) as {
    auditStatus?: AuditStatus;
    difficulty?: Difficulty;
    medianTimeSeconds?: number;
    primaryKnowledgePointId?: string;
    questionType?: QuestionType;
    stem?: string;
    answer?: string;
    analysis?: string;
    coreLiteracy?: CoreLiteracy[];
  };

  if (body.auditStatus && !allowedStatuses.includes(body.auditStatus)) {
    return NextResponse.json({ error: "UNSUPPORTED_AUDIT_STATUS" }, { status: 400 });
  }
  if (body.questionType && !allowedQuestionTypes.includes(body.questionType)) {
    return NextResponse.json({ error: "UNSUPPORTED_QUESTION_TYPE" }, { status: 400 });
  }
  if (body.difficulty && !allowedDifficulties.includes(body.difficulty)) {
    return NextResponse.json({ error: "UNSUPPORTED_DIFFICULTY" }, { status: 400 });
  }
  if (body.medianTimeSeconds !== undefined && (!Number.isFinite(body.medianTimeSeconds) || body.medianTimeSeconds <= 0)) {
    return NextResponse.json({ error: "INVALID_MEDIAN_TIME" }, { status: 400 });
  }
  if (body.coreLiteracy && (!Array.isArray(body.coreLiteracy) || body.coreLiteracy.some((tag) => typeof tag !== "string"))) {
    return NextResponse.json({ error: "INVALID_CORE_LITERACY" }, { status: 400 });
  }
  const coreLiteracy = body.coreLiteracy?.map((tag) => tag.trim()).filter(Boolean) as CoreLiteracy[] | undefined;
  if (coreLiteracy?.some((tag) => !allowedCoreLiteracy.includes(tag))) {
    return NextResponse.json({ error: "UNSUPPORTED_CORE_LITERACY" }, { status: 400 });
  }

  try {
    const question = await adminContentRepository.updateQuestion(
      id,
      {
        auditStatus: body.auditStatus,
        difficulty: body.difficulty,
        medianTimeSeconds: body.medianTimeSeconds,
        primaryKnowledgePointId: body.primaryKnowledgePointId?.trim() || undefined,
        questionType: body.questionType,
        stem: body.stem?.trim() || undefined,
        answer: body.answer?.trim() || undefined,
        analysis: body.analysis?.trim() || undefined,
        coreLiteracy
      },
      admin.user.id
    );
    if (!question) {
      return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ question });
  } catch (error) {
    return NextResponse.json({ error: "QUESTION_UPDATE_FAILED" }, { status: 400 });
  }
}
