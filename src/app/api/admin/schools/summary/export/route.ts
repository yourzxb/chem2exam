import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/roles";
import { schoolSummaryRepository } from "@/server/repositories/school-summary-repository";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const url = new URL(request.url);
  const schoolId = url.searchParams.get("schoolId")?.trim() || undefined;
  const csv = await schoolSummaryRepository.exportCsv({ schoolId });
  const filename = schoolId ? `school-summary-${schoolId}.csv` : "school-summary-all.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
