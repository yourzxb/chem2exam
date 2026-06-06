import { Prisma } from "@prisma/client";
import { decryptSecret } from "@/server/security/crypto";
import { getPrismaClient, hasDatabaseUrl } from "@/server/db/prisma";
import { validateStructuredOutput } from "@/server/ai/structured-output";

export interface AiTaskRunResult {
  taskId: string;
  status: "needs_review" | "failed";
  usedModelConfigId: string;
  warnings: string[];
  attemptCount: number;
}

interface RunnableTask {
  id: string;
  taskType: string;
  modelConfigId: string;
  fallbackModelConfigId?: string | null;
  input: unknown;
}

interface RunnableModel {
  id: string;
  provider: string;
  apiBaseUrl: string;
  apiKeyEncrypted: string;
  modelName: string;
  maxOutputTokens?: number | null;
  temperature?: number | null;
  timeoutSeconds?: number | null;
}

export async function runAiTask(taskId: string): Promise<AiTaskRunResult | null> {
  return runAiTaskWithOptions(taskId, { maxAttempts: 2 });
}

export async function rerunAiTask(taskId: string, maxAttempts = 2): Promise<AiTaskRunResult | null> {
  return runAiTaskWithOptions(taskId, { maxAttempts });
}

async function runAiTaskWithOptions(taskId: string, options: { maxAttempts: number }): Promise<AiTaskRunResult | null> {
  if (!hasDatabaseUrl()) {
    return {
      taskId,
      status: "needs_review",
      usedModelConfigId: "memory",
      warnings: ["内存模式已完成模拟执行，正式结果仍需人工审核。"],
      attemptCount: 1
    };
  }

  const prisma = getPrismaClient();
  const task = await prisma.aiTask.findUnique({ where: { id: taskId } });
  if (!task) return null;

  await prisma.aiTask.update({
    where: { id: taskId },
    data: {
      status: "running",
      errorMessage: null
    }
  });

  const primaryModel = await prisma.aiModelConfig.findUnique({ where: { id: task.modelConfigId } });
  if (!primaryModel || !primaryModel.enabled) {
    return markFailed(task, task.modelConfigId, "默认模型不存在或未启用。", []);
  }

  const models: RunnableModel[] = [primaryModel];
  if (task.fallbackModelConfigId) {
    const fallback = await prisma.aiModelConfig.findUnique({ where: { id: task.fallbackModelConfigId } });
    if (fallback?.enabled) models.push(fallback);
  }

  let lastError = "";
  const attempts: Array<{ modelConfigId: string; status: "failed" | "needs_review"; message: string; at: string }> = [];
  const maxAttempts = Math.max(1, Math.min(options.maxAttempts, 5));
  for (const model of models) {
    for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
      try {
        const output = await callModelOrDryRun(task, model);
        const validation = validateStructuredOutput(task.taskType, output);
        if (!validation.ok) {
          lastError = validation.warnings.join("；");
          attempts.push({ modelConfigId: model.id, status: "failed", message: lastError, at: new Date().toISOString() });
          continue;
        }
        attempts.push({ modelConfigId: model.id, status: "needs_review", message: "结构化输出校验通过，等待人工审核。", at: new Date().toISOString() });
        await prisma.aiTask.update({
          where: { id: task.id },
          data: {
            status: "needs_review",
            output: {
              ...toJsonObject(output),
              validationWarnings: validation.warnings,
              usedModelConfigId: model.id,
              reviewPolicy: "AI 输出必须进入人工一审，通过后才发布。"
            } as Prisma.InputJsonValue,
            errorMessage: null,
            tokenUsage: {
              estimatedInputLength: JSON.stringify(task.input).length,
              mode: shouldUseLiveModel() ? "live" : "dry_run",
              usedModelConfigId: model.id,
              attemptCount: attempts.length,
              attempts
            } as Prisma.InputJsonValue,
            completedAt: new Date()
          }
        });
        return {
          taskId: task.id,
          status: "needs_review",
          usedModelConfigId: model.id,
          warnings: validation.warnings,
          attemptCount: attempts.length
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "AI_TASK_FAILED";
        attempts.push({ modelConfigId: model.id, status: "failed", message: lastError, at: new Date().toISOString() });
      }
    }
  }

  return markFailed(task, primaryModel.id, lastError || "AI_TASK_FAILED", attempts);
}

async function callModelOrDryRun(task: RunnableTask, model: RunnableModel) {
  if (!shouldUseLiveModel()) {
    return buildDryRunOutput(task);
  }

  const apiKey = decryptSecret(model.apiKeyEncrypted);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), (model.timeoutSeconds ?? 60) * 1000);
  try {
    const response = await fetch(normalizeChatEndpoint(model.apiBaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model.modelName,
        temperature: model.temperature ?? 0.2,
        max_tokens: model.maxOutputTokens ?? 4096,
        messages: [
          {
            role: "system",
            content: "你是化学教育诊断系统的后台助手。只输出 JSON，不要输出 Markdown。所有结果都必须等待人工审核。"
          },
          {
            role: "user",
            content: JSON.stringify({ taskType: task.taskType, input: task.input })
          }
        ]
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`MODEL_HTTP_${response.status}`);
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("MODEL_EMPTY_OUTPUT");
    return JSON.parse(content) as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

function buildDryRunOutput(task: RunnableTask) {
  const common = {
    dryRun: true,
    confidence: 0.76,
    warnings: ["当前为本地安全模拟执行，正式调用需开启 AI_WORKER_MODE=live。"]
  };

  if (task.taskType === "paper_parse" || task.taskType === "paper_split") {
    return {
      ...common,
      questions: [],
      reviewPolicy: "AI 拆题结果必须进入人工一审，通过后才发布。"
    };
  }
  if (task.taskType === "knowledge_linking" || task.taskType === "knowledge_link") {
    return {
      ...common,
      primaryKnowledgePointId: "change",
      prerequisiteKnowledgePointIds: [],
      reason: "模拟执行已完成，等待人工确认知识点挂接。"
    };
  }
  if (task.taskType === "literacy_tagging" || task.taskType === "literacy_tag") {
    return {
      ...common,
      literacyTags: [{ tag: "evidence_model", confidence: 0.76 }]
    };
  }
  if (task.taskType === "encouraging_evaluation" || task.taskType === "feedback_generate") {
    return {
      ...common,
      studentFeedback: "先抓住题干中的关键证据，再回到对应知识点判断。",
      encouragement: "你已经定位到可以进步的一环，补上它会更稳。"
    };
  }
  return {
    ...common,
    nextSteps: ["进入人工审核", "确认知识点挂接", "发布后再进入学生端"]
  };
}

async function markFailed(
  task: RunnableTask,
  modelConfigId: string,
  errorMessage: string,
  attempts: Array<{ modelConfigId: string; status: "failed" | "needs_review"; message: string; at: string }>
): Promise<AiTaskRunResult> {
  const prisma = getPrismaClient();
  await prisma.aiTask.update({
    where: { id: task.id },
    data: {
      status: "failed",
      errorMessage,
      tokenUsage: {
        mode: shouldUseLiveModel() ? "live" : "dry_run",
        usedModelConfigId: modelConfigId,
        attemptCount: attempts.length,
        attempts
      } as Prisma.InputJsonValue,
      completedAt: new Date()
    }
  });
  return {
    taskId: task.id,
    status: "failed",
    usedModelConfigId: modelConfigId,
    warnings: [errorMessage],
    attemptCount: attempts.length
  };
}

function shouldUseLiveModel() {
  return process.env.AI_WORKER_MODE === "live";
}

function normalizeChatEndpoint(apiBaseUrl: string) {
  const trimmed = apiBaseUrl.replace(/\/$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  if (trimmed.endsWith("/v1") || trimmed.endsWith("/v4")) return `${trimmed}/chat/completions`;
  if (trimmed.includes("open.bigmodel.cn/api/paas")) return `${trimmed}/chat/completions`;
  if (trimmed.includes("api.deepseek.com")) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

function toJsonObject(output: unknown) {
  if (output && typeof output === "object" && !Array.isArray(output)) {
    return output as Record<string, unknown>;
  }
  return { value: output };
}
