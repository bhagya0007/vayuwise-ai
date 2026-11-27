import { z } from "zod";

const serverEnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().optional(),
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-3.1-flash-lite"),
  GEMINI_AI_ENABLED: z.boolean().default(true),
  AI_RATE_LIMIT_PER_MIN: z.coerce.number().int().min(1).max(120).default(15),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().trim().min(1).default("VayuWise AI"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .trim()
    .url()
    .default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Reads and validates server-only environment variables.
 * Never import this helper inside a `'use client'` module.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "Security violation: getServerEnv() must only be called on the server."
    );
  }

  const rawEnabled = process.env.GEMINI_AI_ENABLED;
  const aiEnabled =
    rawEnabled === undefined
      ? true
      : rawEnabled.trim().toLowerCase() !== "false" &&
        rawEnabled.trim() !== "0";

  return serverEnvSchema.parse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    GEMINI_AI_ENABLED: aiEnabled,
    AI_RATE_LIMIT_PER_MIN: process.env.AI_RATE_LIMIT_PER_MIN || 15,
  });
}

export function isGeminiConfigured(): boolean {
  const { GEMINI_API_KEY, GEMINI_AI_ENABLED } = getServerEnv();
  return Boolean(
    GEMINI_AI_ENABLED &&
      GEMINI_API_KEY &&
      GEMINI_API_KEY.length > 0 &&
      GEMINI_API_KEY !== "your_gemini_api_key_here"
  );
}

export function resolveAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim();
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`;
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  return "http://localhost:3000";
}

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "VayuWise AI",
    NEXT_PUBLIC_APP_URL: resolveAppBaseUrl(),
  });
}
