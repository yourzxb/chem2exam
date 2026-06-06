import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/roles";
import { schoolSummaryRepository } from "@/server/repositories/school-summary-repository";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const url = new URL(request.url);
  const schoolId = url.searchParams.get("schoolId")?.trim() || undefined;
  const report = await schoolSummaryRepository.getSummary({ schoolId });
  return NextResponse.json({ report });
}
