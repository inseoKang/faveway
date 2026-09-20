import { NextRequest, NextResponse } from "next/server";

import {
  hasEnoughPlaceDocentContext,
  loadPlaceDocentContext,
} from "@/lib/ai/docent-context";

import { generateCourseDocent } from "@/lib/ai/generate-docent";

import type {
  CourseDocentRequest,
  CourseDocentResponse,
  CourseDocentStopRequest,
  DocentLanguage,
} from "@/lib/ai/docent-types";

function isDocentLanguage(value: unknown): value is DocentLanguage {
  return value === "ko" || value === "en";
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isValidStop(value: unknown): value is CourseDocentStopRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const stop = value as Partial<CourseDocentStopRequest>;

  return (
    isPositiveInteger(stop.contentId) &&
    isPositiveInteger(stop.placeId) &&
    isPositiveInteger(stop.order)
  );
}

export async function POST(request: NextRequest) {
  if (process.env.ENABLE_OPENAI_DOCENT !== "true") {
    return NextResponse.json(
      {
        code: "DOCENT_NOT_ENABLED",
        message: "AI 도슨트 실제 생성 기능은 아직 활성화되지 않았습니다.",
      },
      {
        status: 503,
      },
    );
  }

  try {
    let body: Partial<CourseDocentRequest>;

    try {
      body = (await request.json()) as Partial<CourseDocentRequest>;
    } catch {
      return NextResponse.json(
        {
          code: "INVALID_DOCENT_REQUEST",
          message: "도슨트 요청 정보를 확인해 주세요.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Array.isArray(body.stops) ||
      body.stops.length === 0 ||
      body.stops.length > 10 ||
      !body.stops.every(isValidStop) ||
      !isDocentLanguage(body.language)
    ) {
      return NextResponse.json(
        {
          code: "INVALID_DOCENT_REQUEST",
          message: "코스 도슨트 요청 정보가 올바르지 않습니다.",
        },
        {
          status: 400,
        },
      );
    }

    const language = body.language;

    const orderedStops = [...body.stops].sort((a, b) => a.order - b.order);

    const stopContexts = await Promise.all(
      orderedStops.map(async (stop) => ({
        stop,
        context: await loadPlaceDocentContext(stop.contentId, stop.placeId),
      })),
    );

    const missingStop = stopContexts.find(({ context }) => context === null);

    if (missingStop) {
      return NextResponse.json(
        {
          code: "DOCENT_CONTEXT_NOT_FOUND",
          message:
            "코스에 포함된 일부 촬영지의 검증 정보를 찾지 못했습니다.",
        },
        {
          status: 404,
        },
      );
    }

    const resolvedStops = stopContexts.map(({ stop, context }) => ({
      order: stop.order,
      context: context!,
    }));

    const hasAnyNarrativeContext = resolvedStops.some(({ context }) =>
      hasEnoughPlaceDocentContext(context),
    );

    if (!hasAnyNarrativeContext) {
      return NextResponse.json(
        {
          code: "DOCENT_CONTEXT_INSUFFICIENT",
          message:
            "아직 코스 도슨트를 만들 만큼 충분한 장면 정보가 준비되지 않았어요.",
        },
        {
          status: 422,
        },
      );
    }

    const generated = await generateCourseDocent(resolvedStops, language);

    const response: CourseDocentResponse = {
      type: "course",
      language,
      title: generated.title,
      narration: generated.narration,
      generatedFrom: {
        stops: resolvedStops.map(({ order, context }) => ({
          contentId: context.content.id,
          placeId: context.place.id,
          order,
          sceneIds: context.scenes.map((scene) => scene.id),
          hasVerifiedFact: context.evidence.some((item) =>
            Boolean(item.verifiedFact?.trim()),
          ),
        })),
      },
    };

    return NextResponse.json({
      data: response,
    });
  } catch (error) {
    console.error("Failed to generate course docent", error);

    return NextResponse.json(
      {
        code: "DOCENT_GENERATION_FAILED",
        message:
          "코스 AI 도슨트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      {
        status: 500,
      },
    );
  }
}