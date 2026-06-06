import { NextResponse } from "next/server";
import { learningStatsRepository } from "@/server/repositories/learning-stats-repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"));
  const entries = await learningStatsRepository.getGrowthLeaderboard(limit);

  return NextResponse.json({
    periodType: "weekly",
    leaderboardType: "growth_xp",
    entries
  });
}

function parseLimit(value: string | null) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(Math.max(parsed, 1), 100);
}
