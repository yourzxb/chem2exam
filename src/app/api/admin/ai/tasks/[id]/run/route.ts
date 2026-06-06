import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/roles";
import { rerunAiTask } from "@/server/ai/task-worker";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { maxAttempts?: number };
  const result = await rerunAiTask(id, body.maxAttempts);
  if (!result) {
    return NextResponse.json({ error: "AI_TASK_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ result });
}
