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
  region: string | null;
  is_active: boolean;
};

type PlaceRelation = {
  id: number;
  relation_type: string;
  verification_status: string;
  verified_fact: string | null;
  places: Place;
};

type SceneActor = {
  scene_id: number;
};

type Scene = {
  id: number;
};

type ScenePlace = {
  scene_id: number;
  place_id: number;
};

const SERVICE_REGION = "서울";

function parseActorIds(actorIdsParam: string | null): number[] {
  if (!actorIdsParam) {
    return [];
  }

  return Array.from(
    new Set(
      actorIdsParam
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  );
}

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

    const actorIdsParam = request.nextUrl.searchParams.get("actorIds");

    const actorIds = parseActorIds(actorIdsParam);

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("place_relations")
      .select(
        `
        id,
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
          region,
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

    const activeRelations = relations.filter(
      (relation) =>
        relation.places.is_active !== false &&
        relation.places.region === SERVICE_REGION,
    );

    /**
     * 배우를 선택하지 않은 경우
     * 작품 전체 촬영지를 반환한다.
     */
    if (actorIds.length === 0) {
      const uniquePlaces = Array.from(
        new Map(
          activeRelations.map((relation) => [relation.places.id, relation]),
        ).values(),
      );

      return NextResponse.json({
        data: uniquePlaces.map((relation) => ({
          ...relation,
          isActorScenePlace: false,
        })),
      });
    }

    /**
     * 선택 배우 중 한 명 이상이 등장한 Scene 조회.
     *
     * OR 조건:
     * actor A OR actor B OR actor C
     */
    const { data: sceneActorData, error: sceneActorError } = await supabase
      .from("scene_actors")
      .select("scene_id")
      .in("actor_id", actorIds);

    if (sceneActorError) {
      console.error("Failed to fetch actor scenes:", sceneActorError);

      return NextResponse.json(
        {
          message: "배우의 장면 정보를 불러오지 못했습니다.",
        },
        { status: 500 },
      );
    }

    const actorSceneIds = Array.from(
      new Set(
        ((sceneActorData ?? []) as SceneActor[]).map((row) => row.scene_id),
      ),
    );

    if (actorSceneIds.length === 0) {
      return NextResponse.json({
        data: [],
      });
    }

    /**
     * 배우가 등장한 Scene 중
     * 현재 작품에 속하는 Scene만 남긴다.
     */
    const { data: sceneData, error: sceneError } = await supabase
      .from("scenes")
      .select("id")
      .eq("content_id", parsedContentId)
      .in("id", actorSceneIds);

    if (sceneError) {
      console.error("Failed to fetch content scenes:", sceneError);

      return NextResponse.json(
        {
          message: "작품의 장면 정보를 불러오지 못했습니다.",
        },
        { status: 500 },
      );
    }

    const contentActorSceneIds = ((sceneData ?? []) as Scene[]).map(
      (scene) => scene.id,
    );

    if (contentActorSceneIds.length === 0) {
      return NextResponse.json({
        data: [],
      });
    }

    /**
     * 해당 Scene이 촬영된 Place 조회.
     */
    const { data: scenePlaceData, error: scenePlaceError } = await supabase
      .from("scene_places")
      .select(
        `
        scene_id,
        place_id
      `,
      )
      .in("scene_id", contentActorSceneIds);

    if (scenePlaceError) {
      console.error("Failed to fetch scene places:", scenePlaceError);

      return NextResponse.json(
        {
          message: "장면의 촬영지 정보를 불러오지 못했습니다.",
        },
        { status: 500 },
      );
    }

    const scenePlaces = (scenePlaceData ?? []) as ScenePlace[];

    const actorPlaceIds = new Set(scenePlaces.map((row) => row.place_id));

    const actorSceneRelations = activeRelations.filter((relation) =>
      actorPlaceIds.has(relation.places.id),
    );

    const uniqueActorPlaces = Array.from(
      new Map(
        actorSceneRelations.map((relation) => [relation.places.id, relation]),
      ).values(),
    );

    return NextResponse.json({
      data: uniqueActorPlaces.map((relation) => ({
        ...relation,
        isActorScenePlace: true,
      })),
    });
  } catch (error) {
    console.error("Unexpected content places error:", error);

    return NextResponse.json(
      {
        message: "서버 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
