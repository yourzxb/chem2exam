import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/roles";
import { aiAdminRepository } from "@/server/repositories/ai-admin-repository";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const models = await aiAdminRepository.listModelConfigs();
  return NextResponse.json({ models });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = (await request.json()) as {
    provider?: string;
    apiBaseUrl?: string;
    apiKey?: string;
    modelName?: string;
    maxContextTokens?: number;
    maxOutputTokens?: number;
    temperature?: number;
    timeoutSeconds?: number;
  };
  if (!body.provider || !body.apiBaseUrl || !body.apiKey || !body.modelName) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const apiBaseUrl = normalizeBaseUrl(body.apiBaseUrl);
  if (!apiBaseUrl) {
    return NextResponse.json({ error: "INVALID_API_BASE_URL" }, { status: 400 });
  }

  try {
    const model = await aiAdminRepository.createModelConfig({
      provider: body.provider.trim(),
      apiBaseUrl,
      apiKey: body.apiKey.trim(),
      modelName: body.modelName.trim(),
      maxContextTokens: body.maxContextTokens,
      maxOutputTokens: body.maxOutputTokens,
      temperature: body.temperature,
      timeoutSeconds: body.timeoutSeconds,
      createdBy: admin.user.id
    });

    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    console.error("AI model config create failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "MODEL_CONFIG_CREATE_FAILED" }, { status: 500 });
  }
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      return "";
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}
