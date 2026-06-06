import { NextResponse } from "next/server";
import { requireReviewer } from "@/server/auth/roles";
import { aiAdminRepository } from "@/server/repositories/ai-admin-repository";
import { reviewRepository } from "@/server/repositories/review-repository";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const reviewer = await requireReviewer(request);
  if (!reviewer.ok) return reviewer.response;

  const pendingQuestion = (await reviewRepository.listReviewQuestions("pending_review")).find((question) => question.id === id);
  if (!pendingQuestion) {
    return NextResponse.json({ error: "QUESTION_NOT_FOUND_OR_NOT_PENDING_REVIEW" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    comment?: string;
    fallbackModelConfigId?: string;
    modelConfigId?: string;
    taskType?: string;
  };

  try {
    const task = await aiAdminRepository.createTask({
      taskType: body.taskType || "knowledge_linking",
      modelConfigId: body.modelConfigId || undefined,
      fallbackModelConfigId: body.fallbackModelConfigId || undefined,
      input: {
        questionId: id,
        requestedBy: reviewer.user.id,
        reviewPolicy: "AI retry output must enter review before publication."
      }
    });

    await reviewRepository.recordAiRetryRequest(
      id,
      reviewer.user.id,
      task.id,
      body.comment || "请求 AI 重新分析，结果进入人工一审。"
    );

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "AI_MODEL_NOT_CONFIGURED") {
      return NextResponse.json({ error: "AI_MODEL_NOT_CONFIGURED" }, { status: 400 });
    }
    return NextResponse.json({ error: "AI_RETRY_REQUEST_FAILED" }, { status: 500 });
  }
}
