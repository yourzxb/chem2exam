import { NextResponse } from "next/server";
import { requireReviewer } from "@/server/auth/roles";
import { reviewRepository } from "@/server/repositories/review-repository";

export async function GET(request: Request) {
  const reviewer = await requireReviewer(request);
  if (!reviewer.ok) return reviewer.response;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 30);
  const records = await reviewRepository.listAuditRecords(Number.isFinite(limit) ? limit : 30);
  return NextResponse.json({ records });
}
