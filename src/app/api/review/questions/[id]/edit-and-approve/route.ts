import { NextResponse } from "next/server";
import { requireReviewer } from "@/server/auth/roles";
import { reviewRepository, type ReviewQuestionPatch } from "@/server/repositories/review-repository";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const reviewer = await requireReviewer(request);
  if (!reviewer.ok) return reviewer.response;
  const body = (await request.json()) as { patch?: ReviewQuestionPatch; comment?: string };
  const question = await reviewRepository.updateAndApproveQuestion(id, reviewer.user.id, body.patch ?? {}, body.comment);

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json({ question });
}
