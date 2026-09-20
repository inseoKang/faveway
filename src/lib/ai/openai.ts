import OpenAI from "openai";

const DEFAULT_DOCENT_MODEL = "gpt-5.6-luna";

export function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey,
  });
}

export function getDocentModel() {
  return (
    process.env.OPENAI_DOCENT_MODEL?.trim() || DEFAULT_DOCENT_MODEL
  );
}