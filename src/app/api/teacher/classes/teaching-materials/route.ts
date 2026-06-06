import { NextResponse } from "next/server";
import { ensureTeacherClassAccess, requireReviewer } from "@/server/auth/roles";
import { teacherReportRepository } from "@/server/repositories/teacher-report-repository";

export async function GET(request: Request) {
  const reviewer = await requireReviewer(request);
  if (!reviewer.ok) return reviewer.response;

  const url = new URL(request.url);
  const classId = url.searchParams.get("classId") ?? "default";
  const accessError = await ensureTeacherClassAccess(reviewer.user, classId);
  if (accessError) return accessError;

  const grade = url.searchParams.get("grade") ?? undefined;
  const reviewTaskType = parseReviewTaskType(url.searchParams.get("reviewTaskType"));
  const feedbackStatus = parseFeedbackStatus(url.searchParams.get("feedbackStatus"));
  const groupBy = parseGroupBy(url.searchParams.get("groupBy"));
  const knowledgePointId = url.searchParams.get("knowledgePointId") ?? undefined;
  const startDate = parseDateParam(url.searchParams.get("startDate"), "start");
  const endDate = parseDateParam(url.searchParams.get("endDate"), "end");

  if (
    startDate === "invalid" ||
    endDate === "invalid" ||
    reviewTaskType === "invalid" ||
    feedbackStatus === "invalid" ||
    groupBy === "invalid"
  ) {
    return NextResponse.json({ error: "Invalid teaching materials filter" }, { status: 400 });
  }

  const materials = await teacherReportRepository.getTeachingMaterials(classId, {
    grade,
    startDate,
    endDate,
    reviewTaskType,
    feedbackStatus,
    knowledgePointId,
    groupBy
  });

  return NextResponse.json(materials);
}

function parseReviewTaskType(value: string | null): "all" | "review" | "variant_challenge" | "prerequisite_consolidation" | "invalid" {
  if (!value || value === "all") return "all";
  if (value === "review" || value === "variant_challenge" || value === "prerequisite_consolidation") return value;
  return "invalid";
}

function parseFeedbackStatus(value: string | null): "all" | "noted" | "pending_feedback" | "invalid" {
  if (!value || value === "all") return "all";
  if (value === "noted" || value === "pending_feedback") return value;
  return "invalid";
}

function parseGroupBy(value: string | null): "knowledge_point" | "task_type" | "student" | "feedback_status" | "invalid" {
  if (!value || value === "knowledge_point" || value === "knowledgePoint") return "knowledge_point";
  if (value === "task_type" || value === "taskType") return "task_type";
  if (value === "student") return "student";
  if (value === "feedback_status" || value === "feedbackStatus") return "feedback_status";
  return "invalid";
}

function parseDateParam(value: string | null, boundary: "start" | "end") {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "invalid";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (boundary === "start") date.setHours(0, 0, 0, 0);
    if (boundary === "end") date.setHours(23, 59, 59, 999);
  }
  return date;
}
