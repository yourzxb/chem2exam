import { NextResponse } from "next/server";
import type { AuditStatus, Grade, QuestionType } from "@/domain/types";
import { requireAdmin } from "@/server/auth/roles";
import { adminContentRepository } from "@/server/repositories/admin-content-repository";

const allowedStatuses: AuditStatus[] = ["ai_processing", "pending_review", "needs_edit", "approved", "rejected", "published"];
const allowedGrades: Grade[] = ["初三", "高一", "高二", "高三"];
const allowedQuestionTypes: QuestionType[] = ["single_choice", "multiple_choice", "fill_blank", "short_answer", "calculation", "experiment", "inference"];

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status") as AuditStatus | null;
  const gradeParam = url.searchParams.get("grade") as Grade | null;
  const questionTypeParam = url.searchParams.get("questionType") as QuestionType | null;
  const knowledgePointId = url.searchParams.get("knowledgePointId")?.trim() || undefined;
  if (statusParam && !allowedStatuses.includes(statusParam)) {
    return NextResponse.json({ error: "Unsupported status" }, { status: 400 });
  }
  if (gradeParam && !allowedGrades.includes(gradeParam)) {
    return NextResponse.json({ error: "Unsupported grade" }, { status: 400 });
  }
  if (questionTypeParam && !allowedQuestionTypes.includes(questionTypeParam)) {
    return NextResponse.json({ error: "Unsupported question type" }, { status: 400 });
  }

  const questions = await adminContentRepository.listQuestions({
    status: statusParam ?? undefined,
    grade: gradeParam ?? undefined,
    questionType: questionTypeParam ?? undefined,
    knowledgePointId
  });
  return NextResponse.json({ questions });
}
