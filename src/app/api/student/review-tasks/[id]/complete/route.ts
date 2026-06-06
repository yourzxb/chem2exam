import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { learningStatsRepository } from "@/server/repositories/learning-stats-repository";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = await request.json().catch(() => ({})) as { reviewNote?: string };
  const result = await learningStatsRepository.completeStudentReviewTask(user.id, id, payload.reviewNote);
  if (!result) {
    return NextResponse.json({ error: "REVIEW_TASK_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ result });
}
