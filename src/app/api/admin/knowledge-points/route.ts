import { NextResponse } from "next/server";
import type { Grade } from "@/domain/types";
import { grades } from "@/data/chemistry-seed";
import { requireAdmin } from "@/server/auth/roles";
import { adminContentRepository } from "@/server/repositories/admin-content-repository";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const url = new URL(request.url);
  const grade = url.searchParams.get("grade") as Grade | null;
  if (grade && !grades.includes(grade)) {
    return NextResponse.json({ error: "Unsupported grade" }, { status: 400 });
  }
  const points = await adminContentRepository.listKnowledgePoints(grade ?? undefined);
  return NextResponse.json({ points });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = (await request.json()) as { grade?: Grade; name?: string; description?: string; x?: number; y?: number };
  if (!body.grade || !grades.includes(body.grade) || !body.name) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const point = await adminContentRepository.createKnowledgePoint({
    grade: body.grade,
    name: body.name,
    description: body.description,
    x: body.x,
    y: body.y
  });
  return NextResponse.json({ point }, { status: 201 });
}
