import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type SceneActor = {
  scene_id: number;
};

type Scene = {
  id: number;
  content_id: number;
};

type ScenePlace = {
  scene_id: number;
  place_id: number;
};

type Content = {
  id: number;
  title: string;
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
  content_id: number;
  relation_type: string;
  verification_status: string;
  verified_fact: string | null;
  places: Place;
};

function parseIds(value: string | null): number[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  );
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      actorId: string;
    }>;
  },
) {
  try {
    const { actorId } = await context.params;

    const parsedActorId = Number(actorId);

    if (!Number.isInteger(parsedActorId) || parsedActorId <= 0) {
      return NextResponse.json(
        {
          message: "잘못된 배우 ID입니다.",
        },
        {
          status: 400,
        },
      );
    }

    const selectedContentIds = parseIds(
      request.nextUrl.searchParams.get("contentIds"),
    );

    const supabase = createServerSupabaseClient();

    /**
     * 1.
     * 선택 배우가 등장한 Scene 조회
     *
     * Actor
     * ↓
     * scene_actors
     * ↓
     * Scene
     */
    const { data: sceneActorData, error: sceneActorError } = await supabase
      .from("scene_actors")
      .select("scene_id")
      .eq("actor_id", parsedActorId);

    if (sceneActorError) {
      throw new Error(sceneActorError.message);
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
     * 2.
     * 배우가 등장한 Scene의 작품 확인
     *
     * contentIds가 전달된 경우에는
     * 선택한 작품에 속한 Scene만 사용한다.
     */
    let sceneQuery = supabase
      .from("scenes")
      .select("id,content_id")
      .in("id", actorSceneIds);

    if (selectedContentIds.length > 0) {
      sceneQuery = sceneQuery.in("content_id", selectedContentIds);
    }

    const { data: sceneData, error: sceneError } = await sceneQuery;

    if (sceneError) {
      throw new Error(sceneError.message);
    }

    const scenes = (sceneData ?? []) as Scene[];

    if (scenes.length === 0) {
      return NextResponse.json({
        data: [],
      });
    }

    const sceneContentMap = new Map(
      scenes.map((scene) => [scene.id, scene.content_id]),
    );

    /**
     * 3.
     * Scene과 연결된 실제 촬영 장소 조회
     *
     * Scene
     * ↓
     * scene_places
     * ↓
     * Place
     */
    const { data: scenePlaceData, error: scenePlaceError } = await supabase
      .from("scene_places")
      .select("scene_id,place_id")
      .in(
        "scene_id",
        scenes.map((scene) => scene.id),
      );

    if (scenePlaceError) {
      throw new Error(scenePlaceError.message);
    }

    const scenePlaces = (scenePlaceData ?? []) as ScenePlace[];

    if (scenePlaces.length === 0) {
      return NextResponse.json({
        data: [],
      });
    }

    /**
     * 배우가 실제 등장한 Scene의
     * contentId + placeId 조합을 저장한다.
     *
     * 예:
     * 1:10
     * 1:15
     * 3:20
     */
    const relationKeys = new Set<string>();

    for (const row of scenePlaces) {
      const contentId = sceneContentMap.get(row.scene_id);

      if (!contentId) {
        continue;
      }

      relationKeys.add(`${contentId}:${row.place_id}`);
    }

    const contentIds = Array.from(
      new Set(scenes.map((scene) => scene.content_id)),
    );

    const placeIds = Array.from(
      new Set(scenePlaces.map((row) => row.place_id)),
    );

    if (contentIds.length === 0 || placeIds.length === 0) {
      return NextResponse.json({
        data: [],
      });
    }

    /**
     * 4.
     * 작품-장소 관계와 작품명을 조회한다.
     */
    const [relationResult, contentResult] = await Promise.all([
      supabase
        .from("place_relations")
        .select(
          `
          id,
          content_id,
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
        .in("content_id", contentIds)
        .in("place_id", placeIds),

      supabase.from("contents").select("id,title").in("id", contentIds),
    ]);

    if (relationResult.error) {
      throw new Error(relationResult.error.message);
    }

    if (contentResult.error) {
      throw new Error(contentResult.error.message);
    }

    const titleMap = new Map(
      ((contentResult.data ?? []) as Content[]).map((content) => [
        content.id,
        content.title,
      ]),
    );

    /**
     * 5.
     * 실제 배우 Scene과 연결된 관계만 남긴다.
     */
    const validRelations = (
      (relationResult.data ?? []) as unknown as PlaceRelation[]
    ).filter(
      (relation) =>
        relation.places.is_active !== false &&
        relationKeys.has(`${relation.content_id}:${relation.places.id}`),
    );

    /**
     * 6.
     * 완전히 동일한 작품 + 장소 관계 중복 제거
     *
     * 핵심 수정 부분.
     *
     * 예:
     *
     * 도깨비 + 여의도 금호 리첸시아
     * 도깨비 + 여의도 금호 리첸시아
     * 도깨비 + 여의도 금호 리첸시아
     * 도깨비 + 여의도 금호 리첸시아
     *
     * ↓
     *
     * 도깨비 + 여의도 금호 리첸시아
     *
     * 한 건만 유지한다.
     */
    const uniqueRelations = Array.from(
      new Map(
        validRelations.map((relation) => [
          `${relation.content_id}:${relation.places.id}`,
          relation,
        ]),
      ).values(),
    );

    /**
     * 7.
     * 프론트에서 사용할 형태로 변환
     */
    const result = uniqueRelations.map((relation) => ({
      ...relation,

      isActorScenePlace: true,

      content: {
        id: relation.content_id,

        title: titleMap.get(relation.content_id) ?? "작품 정보 없음",
      },
    }));

    return NextResponse.json({
      data: result,
    });
  } catch (error) {
    console.error("Failed to fetch actor places:", error);

    return NextResponse.json(
      {
        message: "배우의 촬영지를 불러오지 못했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
