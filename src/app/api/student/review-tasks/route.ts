import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { learningStatsRepository } from "@/server/repositories/learning-stats-repository";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const tasks = await learningStatsRepository.getStudentReviewTasks(user.id);
  return NextResponse.json({ tasks });
}
