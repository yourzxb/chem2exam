import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/roles";
import { aiAdminRepository } from "@/server/repositories/ai-admin-repository";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const tasks = await aiAdminRepository.listTasks();
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = (await request.json()) as {
    taskType?: string;
    modelConfigId?: string;
    fallbackModelConfigId?: string;
    input?: Record<string, unknown>;
  };
  if (!body.taskType) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    const task = await aiAdminRepository.createTask({
      taskType: body.taskType,
      modelConfigId: body.modelConfigId || undefined,
      fallbackModelConfigId: body.fallbackModelConfigId || undefined,
      input: body.input ?? { note: "AI task output must enter review before publication." }
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "AI_MODEL_NOT_CONFIGURED") {
      return NextResponse.json({ error: "AI_MODEL_NOT_CONFIGURED" }, { status: 400 });
    }
    return NextResponse.json({ error: "AI_TASK_CREATE_FAILED" }, { status: 500 });
  }
}
