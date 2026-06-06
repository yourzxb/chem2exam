import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/roles";
import { adminContentRepository } from "@/server/repositories/admin-content-repository";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 30);
  const records = await adminContentRepository.listAdminAuditRecords({
    batchId: url.searchParams.get("batchId")?.trim() || undefined,
    targetId: url.searchParams.get("targetId")?.trim() || undefined,
    action: url.searchParams.get("action")?.trim() || undefined,
    limit: Number.isFinite(limit) ? limit : 30
  });
  return NextResponse.json({ records });
}
