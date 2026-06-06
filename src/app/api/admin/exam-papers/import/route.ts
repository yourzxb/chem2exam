import { NextResponse } from "next/server";
import type { Grade } from "@/domain/types";
import { requireAdmin } from "@/server/auth/roles";
import { examPaperRepository } from "@/server/repositories/exam-paper-repository";

const allowedGrades: Grade[] = ["初三", "高一", "高二", "高三"];

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = (await request.json()) as {
    title?: string;
    examType?: string;
    year?: number;
    region?: string;
    grade?: Grade;
    paperText?: string;
    answerAnalysisText?: string;
    modelConfigId?: string;
  };

  if (!body.title || !body.grade || !allowedGrades.includes(body.grade) || !body.paperText || !body.answerAnalysisText) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const result = await examPaperRepository.importPaper({
    title: body.title,
    examType: body.examType ?? "中高考真题",
    year: body.year,
    region: body.region,
    grade: body.grade,
    paperText: body.paperText,
    answerAnalysisText: body.answerAnalysisText,
    modelConfigId: body.modelConfigId || undefined,
    uploadUserId: admin.user.id
  });

  return NextResponse.json({ result }, { status: 201 });
}
