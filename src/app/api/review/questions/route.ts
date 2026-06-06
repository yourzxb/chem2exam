import { NextResponse } from "next/server";
import type { AuditStatus, QuestionType } from "@/domain/types";
import { requireReviewer } from "@/server/auth/roles";
import { reviewRepository } from "@/server/repositories/review-repository";

const allowedStatuses: AuditStatus[] = ["ai_processing", "pending_review", "needs_edit", "approved", "rejected", "published"];
const allowedQuestionTypes: QuestionType[] = ["single_choice", "multiple_choice", "fill_blank", "short_answer", "calculation", "experiment", "inference"];

export async function GET(request: Request) {
  const reviewer = await requireReviewer(request);
  if (!reviewer.ok) return reviewer.response;

  const url = new URL(request.url);
  const status = (url.searchParams.get("status") ?? "pending_review") as AuditStatus;
  const source = url.searchParams.get("source");
  const confidence = url.searchParams.get("confidence");
  const questionType = url.searchParams.get("questionType") as QuestionType | null;
  const knowledgePointId = url.searchParams.get("knowledgePointId") ?? undefined;
  const questionId = url.searchParams.get("questionId") ?? undefined;

  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: "Unsupported status" }, { status: 400 });
  }
  if (questionType && !allowedQuestionTypes.includes(questionType)) {
    return NextResponse.json({ error: "Unsupported question type" }, { status: 400 });
  }

  const questions = await reviewRepository.listReviewQuestions(status, {
    questionId,
    source: source === "ai" || source === "human" || source === "seed" || source === "exam_paper" ? source : undefined,
    confidence: confidence === "low" || confidence === "normal" || confidence === "all" ? confidence : undefined,
    questionType: questionType ?? undefined,
    knowledgePointId
  });
  return NextResponse.json({ questions });
}
