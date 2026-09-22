import { NextRequest, NextResponse } from "next/server";

import {
  hasEnoughPlaceDocentContext,
  loadPlaceDocentContext,
} from "@/lib/ai/docent-context";

import { generatePlaceDocent } from "@/lib/ai/generate-docent";

import type {
  DocentLanguage,
  PlaceDocentRequest,
  PlaceDocentResponse,
} from "@/lib/ai/docent-types";

function isDocentLanguage(value: unknown): value is DocentLanguage {
  return value === "ko" || value === "en";
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
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
    let body: Partial<PlaceDocentRequest>;

    try {
      body = (await request.json()) as Partial<PlaceDocentRequest>;
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
      !isPositiveInteger(body.contentId) ||
      !isPositiveInteger(body.placeId) ||
      !isDocentLanguage(body.language)
    ) {
      return NextResponse.json(
        {
          code: "INVALID_DOCENT_REQUEST",
          message: "도슨트 요청 정보가 올바르지 않습니다.",
        },
        {
          status: 400,
        },
      );
    }

    const contentId = body.contentId;
    const placeId = body.placeId;
    const language = body.language;

    const context = await loadPlaceDocentContext(contentId, placeId);

    if (!context) {
      return NextResponse.json(
        {
          code: "DOCENT_CONTEXT_NOT_FOUND",
          message: "이 작품과 장소에 연결된 촬영지 정보를 찾지 못했습니다.",
        },
        {
          status: 404,
        },
      );
    }

    if (!hasEnoughPlaceDocentContext(context)) {
      return NextResponse.json(
        {
          code: "DOCENT_CONTEXT_INSUFFICIENT",
          message:
            "아직 도슨트를 만들 만큼 충분한 장면 정보나 촬영 관계 근거가 준비되지 않았어요.",
        },
        {
          status: 422,
        },
      );
    }

    const generated = await generatePlaceDocent(context, language);

    const response: PlaceDocentResponse = {
      type: "place",
      contentId,
      placeId,
      language,
      title: generated.title,
      narration: generated.narration,
      generatedFrom: {
        sceneIds: context.scenes.map((scene) => scene.id),
        hasVerifiedFact: context.evidence.some((item) =>
          Boolean(item.verifiedFact?.trim()),
        ),
      },
    };

    return NextResponse.json({
      data: response,
    });
  } catch (error) {
    console.error("Failed to generate place docent", error);

    return NextResponse.json(
      {
        code: "DOCENT_GENERATION_FAILED",
        message: "AI 도슨트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      {
        status: 500,
      },
    );
  }
}
