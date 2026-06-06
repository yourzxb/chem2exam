import { Prisma } from "@prisma/client";
import { decryptSecret, encryptSecret, maskSecret } from "@/server/security/crypto";
import { getPrismaClient, hasDatabaseUrl } from "@/server/db/prisma";

export interface AiModelConfigPublic {
  id: string;
  provider: string;
  apiBaseUrl: string;
  apiKeyMasked: string;
  modelName: string;
  maxContextTokens?: number;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutSeconds?: number;
  enabled: boolean;
  createdAt: string;
}

export interface CreateAiModelConfigInput {
  provider: string;
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  maxContextTokens?: number;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutSeconds?: number;
  createdBy: string;
}

export interface AiTaskPublic {
  id: string;
  taskType: string;
  status: string;
  modelConfigId: string;
  fallbackModelConfigId?: string;
  errorMessage?: string;
  attemptCount?: number;
  usedModelConfigId?: string;
  mode?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CreateAiTaskInput {
  taskType: string;
  modelConfigId?: string;
  fallbackModelConfigId?: string;
  input: Record<string, unknown>;
}

export interface AiAdminRepository {
  listModelConfigs(): Promise<AiModelConfigPublic[]>;
  createModelConfig(input: CreateAiModelConfigInput): Promise<AiModelConfigPublic>;
  listTasks(): Promise<AiTaskPublic[]>;
  createTask(input: CreateAiTaskInput): Promise<AiTaskPublic>;
  resolveDefaultModelConfigId(taskType: string): Promise<string | null>;
}

const memoryModels: Array<AiModelConfigPublic & { apiKeyEncrypted: string }> = [];
const memoryTasks: AiTaskPublic[] = [];

class MemoryAiAdminRepository implements AiAdminRepository {
  async listModelConfigs() {
    return memoryModels.map(publicMemoryModel);
  }

  async createModelConfig(input: CreateAiModelConfigInput) {
    const encrypted = encryptSecret(input.apiKey);
    const model = {
      id: `aim_${memoryModels.length + 1}`,
      provider: input.provider,
      apiBaseUrl: input.apiBaseUrl,
      apiKeyEncrypted: encrypted,
      apiKeyMasked: maskSecret(input.apiKey),
      modelName: input.modelName,
      maxContextTokens: input.maxContextTokens,
      maxOutputTokens: input.maxOutputTokens,
      temperature: input.temperature,
      timeoutSeconds: input.timeoutSeconds,
      enabled: true,
      createdAt: new Date().toISOString()
    };
    memoryModels.push(model);
    return publicMemoryModel(model);
  }

  async listTasks() {
    return memoryTasks;
  }

  async createTask(input: CreateAiTaskInput) {
    const modelConfigId = input.modelConfigId ?? (await this.resolveDefaultModelConfigId(input.taskType));
    if (!modelConfigId) {
      throw new Error("AI_MODEL_NOT_CONFIGURED");
    }
    const task = {
      id: `ait_${memoryTasks.length + 1}`,
      taskType: input.taskType,
      status: "pending",
      modelConfigId,
      fallbackModelConfigId: input.fallbackModelConfigId,
      createdAt: new Date().toISOString()
    };
    memoryTasks.unshift(task);
    return task;
  }

  async resolveDefaultModelConfigId(_taskType?: string) {
    return memoryModels.find((model) => model.enabled)?.id ?? null;
  }
}

class PrismaAiAdminRepository implements AiAdminRepository {
  async listModelConfigs() {
    const prisma = getPrismaClient();
    const rows = await prisma.aiModelConfig.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row: any) => toPublicModel(row));
  }

  async createModelConfig(input: CreateAiModelConfigInput) {
    const prisma = getPrismaClient();
    const row = await prisma.aiModelConfig.create({
      data: {
        provider: input.provider,
        apiBaseUrl: input.apiBaseUrl,
        apiKeyEncrypted: encryptSecret(input.apiKey),
        modelName: input.modelName,
        maxContextTokens: input.maxContextTokens,
        maxOutputTokens: input.maxOutputTokens,
        temperature: input.temperature,
        timeoutSeconds: input.timeoutSeconds,
        createdBy: input.createdBy
      }
    });
    return toPublicModel(row);
  }

  async listTasks() {
    const prisma = getPrismaClient();
    const rows = await prisma.aiTask.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return rows.map((row: any) => toPublicTask(row));
  }

  async createTask(input: CreateAiTaskInput) {
    const prisma = getPrismaClient();
    const modelConfigId = input.modelConfigId ?? (await this.resolveDefaultModelConfigId(input.taskType));
    if (!modelConfigId) {
      throw new Error("AI_MODEL_NOT_CONFIGURED");
    }
    const row = await prisma.aiTask.create({
      data: {
        taskType: input.taskType,
        status: "pending",
        modelConfigId,
        fallbackModelConfigId: input.fallbackModelConfigId,
        input: input.input as Prisma.InputJsonValue
      }
    });
    return toPublicTask(row);
  }

  async resolveDefaultModelConfigId(taskType: string) {
    const prisma = getPrismaClient();
    const preferredProvider = preferredProvidersByTask[taskType];
    const preferred = preferredProvider
      ? await prisma.aiModelConfig.findFirst({
          where: { enabled: true, provider: preferredProvider },
          orderBy: { createdAt: "desc" }
        })
      : null;
    if (preferred) return preferred.id;

    const fallback = await prisma.aiModelConfig.findFirst({
      where: { enabled: true },
      orderBy: { createdAt: "desc" }
    });
    return fallback?.id ?? null;
  }
}

const preferredProvidersByTask: Record<string, string> = {
  paper_parse: "DeepSeek",
  paper_split: "DeepSeek",
  answer_alignment: "DeepSeek",
  answer_align: "DeepSeek",
  knowledge_linking: "DeepSeek",
  knowledge_link: "DeepSeek",
  literacy_tagging: "智谱 GLM",
  literacy_tag: "智谱 GLM",
  encouraging_evaluation: "智谱 GLM",
  feedback_generate: "智谱 GLM",
  learning_path_recommendation: "智谱 GLM",
  path_recommend: "智谱 GLM"
};

function toPublicModel(row: any): AiModelConfigPublic {
  let masked = "****";
  try {
    masked = maskSecret(decryptSecret(row.apiKeyEncrypted));
  } catch {
    masked = "****";
  }
  return {
    id: row.id,
    provider: row.provider,
    apiBaseUrl: row.apiBaseUrl,
    apiKeyMasked: masked,
    modelName: row.modelName,
    maxContextTokens: row.maxContextTokens ?? undefined,
    maxOutputTokens: row.maxOutputTokens ?? undefined,
    temperature: row.temperature ?? undefined,
    timeoutSeconds: row.timeoutSeconds ?? undefined,
    enabled: row.enabled,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt
  };
}

function toPublicTask(row: any): AiTaskPublic {
  const tokenUsage = parseJsonRecord(row.tokenUsage);
  return {
    id: row.id,
    taskType: row.taskType,
    status: row.status,
    modelConfigId: row.modelConfigId,
    fallbackModelConfigId: row.fallbackModelConfigId ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    attemptCount: typeof tokenUsage.attemptCount === "number" ? tokenUsage.attemptCount : undefined,
    usedModelConfigId: typeof tokenUsage.usedModelConfigId === "string" ? tokenUsage.usedModelConfigId : undefined,
    mode: typeof tokenUsage.mode === "string" ? tokenUsage.mode : undefined,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    completedAt: row.completedAt instanceof Date ? row.completedAt.toISOString() : row.completedAt ?? undefined
  };
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function publicMemoryModel(model: AiModelConfigPublic & { apiKeyEncrypted: string }) {
  return {
    id: model.id,
    provider: model.provider,
    apiBaseUrl: model.apiBaseUrl,
    apiKeyMasked: model.apiKeyMasked,
    modelName: model.modelName,
    maxContextTokens: model.maxContextTokens,
    maxOutputTokens: model.maxOutputTokens,
    temperature: model.temperature,
    timeoutSeconds: model.timeoutSeconds,
    enabled: model.enabled,
    createdAt: model.createdAt
  };
}

export const aiAdminRepository: AiAdminRepository = hasDatabaseUrl()
  ? new PrismaAiAdminRepository()
  : new MemoryAiAdminRepository();
