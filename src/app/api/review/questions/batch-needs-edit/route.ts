import { NextResponse } from "next/server";
import { requireReviewer } from "@/server/auth/roles";
import { reviewRepository } from "@/server/repositories/review-repository";

export async function POST(request: Request) {
  const reviewer = await requireReviewer(request);
  if (!reviewer.ok) return reviewer.response;

  const body = (await request.json()) as { ids?: string[]; comment?: string };
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "NO_QUESTION_IDS" }, { status: 400 });
  }

  const questions = await reviewRepository.batchRequestEdits(ids, reviewer.user.id, body.comment || "低置信度题目批量转为需修改");
  return NextResponse.json({ questions, requestedCount: questions.length });
}
