import {
  createOpenAIClient,
  getDocentModel,
} from "@/lib/ai/openai";

import {
  createCourseDocentInput,
  createPlaceDocentInput,
  getCourseDocentInstructions,
  getPlaceDocentInstructions,
} from "@/lib/ai/docent-prompts";

import type {
  DocentLanguage,
  GeneratedDocent,
  PlaceDocentContext,
} from "@/lib/ai/docent-types";

const DOCENT_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
    },
    narration: {
      type: "string",
    },
  },
  required: ["title", "narration"],
  additionalProperties: false,
} as const;

function parseGeneratedDocent(value: string): GeneratedDocent {
  const parsed = JSON.parse(value) as Partial<GeneratedDocent>;

  if (
    typeof parsed.title !== "string" ||
    !parsed.title.trim() ||
    typeof parsed.narration !== "string" ||
    !parsed.narration.trim()
  ) {
    throw new Error("Invalid docent response.");
  }

  return {
    title: parsed.title.trim(),
    narration: parsed.narration.trim(),
  };
}

export async function generatePlaceDocent(
  context: PlaceDocentContext,
  language: DocentLanguage,
): Promise<GeneratedDocent> {
  const openai = createOpenAIClient();

  const response = await openai.responses.create({
    model: getDocentModel(),
    reasoning: {
      effort: "low",
    },
    instructions: getPlaceDocentInstructions(language),
    input: createPlaceDocentInput(context),
    max_output_tokens: 700,
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "faveway_place_docent",
        strict: true,
        schema: DOCENT_OUTPUT_SCHEMA,
      },
    },
  });

  if (!response.output_text?.trim()) {
    throw new Error("OpenAI returned an empty place docent.");
  }

  return parseGeneratedDocent(response.output_text);
}

export async function generateCourseDocent(
  stops: Array<{
    order: number;
    context: PlaceDocentContext;
  }>,
  language: DocentLanguage,
): Promise<GeneratedDocent> {
  const openai = createOpenAIClient();

  const response = await openai.responses.create({
    model: getDocentModel(),
    reasoning: {
      effort: "low",
    },
    instructions: getCourseDocentInstructions(language),
    input: createCourseDocentInput(stops),
    max_output_tokens: 1200,
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "faveway_course_docent",
        strict: true,
        schema: DOCENT_OUTPUT_SCHEMA,
      },
    },
  });

  if (!response.output_text?.trim()) {
    throw new Error("OpenAI returned an empty course docent.");
  }

  return parseGeneratedDocent(response.output_text);
}