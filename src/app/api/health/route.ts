import { connection } from "next/server";
import { getPublicEnv, getServerEnv, isGeminiConfigured } from "@/config/env";

export async function GET() {
  await connection();
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  return Response.json({
    status: "ok",
    app: publicEnv.NEXT_PUBLIC_APP_NAME,
    geminiConfigured: isGeminiConfigured(),
    aiEnabled: serverEnv.GEMINI_AI_ENABLED,
    geminiModel: serverEnv.GEMINI_MODEL,
    release: "release-candidate",
    timestamp: new Date().toISOString(),
  });
}
