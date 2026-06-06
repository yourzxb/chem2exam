import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { learningStatsRepository } from "@/server/repositories/learning-stats-repository";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const history = await learningStatsRepository.listCoreLiteracyGoalHistory(user.id, {
    status: parseGoalStatus(searchParams.get("status")),
    literacyTag: sanitizeOptional(searchParams.get("literacyTag")),
    periodType: sanitizeOptional(searchParams.get("periodType")),
    from: parseDate(searchParams.get("from")),
    to: parseDate(searchParams.get("to")),
    limit: parseLimit(searchParams.get("limit"))
  });

  return NextResponse.json({ history });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    literacyTag?: string;
    periodType?: "weekly";
    action?: "start" | "reopen";
  };
  const literacyTag = typeof payload.literacyTag === "string" ? payload.literacyTag.trim() : "";
  if (!literacyTag) {
    return NextResponse.json({ error: "LITERACY_TAG_REQUIRED" }, { status: 400 });
  }

  const goal = await learningStatsRepository.selectCoreLiteracyGoal(user.id, literacyTag, {
    periodType: payload.periodType === "weekly" ? "weekly" : "weekly",
    action: payload.action === "reopen" ? "reopen" : "start"
  });
  if (!goal) {
    return NextResponse.json({ error: "LITERACY_TAG_INVALID" }, { status: 400 });
  }

  return NextResponse.json({ goal });
}

function sanitizeOptional(value: string | null) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function parseGoalStatus(value: string | null) {
  if (value === "active" || value === "paused" || value === "completed" || value === "all") return value;
  return undefined;
}

function parseDate(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseLimit(value: string | null) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
