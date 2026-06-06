import { NextResponse } from "next/server";
import { requireReviewer } from "@/server/auth/roles";
import { reviewRepository } from "@/server/repositories/review-repository";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const reviewer = await requireReviewer(request);
  if (!reviewer.ok) return reviewer.response;
  const body = (await request.json().catch(() => ({}))) as { comment?: string };
  const question = await reviewRepository.approveQuestion(id, reviewer.user.id, body.comment);

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json({ question });
}
