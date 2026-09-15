import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    contentId: string;
  }>;
};

type Place = {
  id: number;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  place_type: string | null;
  is_active: boolean;
};

type PlaceRelation = {
  id: number;
  actor_id: number | null;
  relation_type: string;
  verification_status: string;
  verified_fact: string | null;
  places: Place;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { contentId } = await context.params;

    const parsedContentId = Number(contentId);

    if (!Number.isInteger(parsedContentId) || parsedContentId <= 0) {
      return NextResponse.json(
        {
          message: "잘못된 콘텐츠 ID입니다.",
        },
        { status: 400 },
      );
    }

    const actorIdParam = request.nextUrl.searchParams.get("actorId");

    const actorId = actorIdParam ? Number(actorIdParam) : null;

    if (actorId !== null && (!Number.isInteger(actorId) || actorId <= 0)) {
      return NextResponse.json(
        {
          message: "잘못된 배우 ID입니다.",
        },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("place_relations")
      .select(
        `
        id,
        actor_id,
        relation_type,
        verification_status,
        verified_fact,
        places (
          id,
          name,
          address,
          latitude,
          longitude,
          place_type,
          is_active
        )
      `,
      )
      .eq("content_id", parsedContentId);

    if (error) {
      console.error("Failed to fetch content places:", error);

      return NextResponse.json(
        {
          message: "촬영지를 불러오지 못했습니다.",
        },
        { status: 500 },
      );
    }

    const relations = (data ?? []) as unknown as PlaceRelation[];

    const activePlaces = relations.filter(
      (relation) => relation.places.is_active !== false,
    );

    /**
     * 같은 장소에 여러 relation이 존재할 경우:
     *
     * 배우가 선택되어 있다면
     * 해당 배우와 직접 연결된 relation을 우선해서 남긴다.
     */
    const placeMap = new Map<number, PlaceRelation>();

    for (const relation of activePlaces) {
      const placeId = relation.places.id;
      const existing = placeMap.get(placeId);

      if (!existing) {
        placeMap.set(placeId, relation);
        continue;
      }

      const currentActorMatch =
        actorId !== null && relation.actor_id === actorId;

      const existingActorMatch =
        actorId !== null && existing.actor_id === actorId;

      if (currentActorMatch && !existingActorMatch) {
        placeMap.set(placeId, relation);
      }
    }

    const uniquePlaces = Array.from(placeMap.values());

    /**
     * 배우가 선택된 경우:
     * 배우와 직접 연결된 촬영지를 먼저 표시한다.
     */
    if (actorId !== null) {
      uniquePlaces.sort((a, b) => {
        const aActorMatch = a.actor_id === actorId ? 1 : 0;

        const bActorMatch = b.actor_id === actorId ? 1 : 0;

        return bActorMatch - aActorMatch;
      });
    }

    return NextResponse.json({
      data: uniquePlaces,
    });
  } catch (error) {
    console.error("Unexpected server error:", error);

    return NextResponse.json(
      {
        message: "서버 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
