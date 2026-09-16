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

    const sceneMap = new Map(
      scenes.map((scene) => [scene.id, scene.content_id]),
    );

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

    const relationKeys = new Set<string>();

    scenePlaces.forEach((row) => {
      const contentId = sceneMap.get(row.scene_id);

      if (contentId) {
        relationKeys.add(`${contentId}:${row.place_id}`);
      }
    });

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

    const [
      { data: relationData, error: relationError },
      { data: contentData, error: contentError },
    ] = await Promise.all([
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

    if (relationError || contentError) {
      throw new Error(
        relationError?.message ?? contentError?.message ?? "Query failed",
      );
    }

    const titleMap = new Map(
      ((contentData ?? []) as Content[]).map((content) => [
        content.id,
        content.title,
      ]),
    );

    const result = (
      (relationData ?? []) as unknown as Array<{
        id: number;
        content_id: number;
        relation_type: string;
        verification_status: string;
        verified_fact: string | null;
        places: {
          id: number;
          name: string;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          place_type: string | null;
          is_active: boolean;
        };
      }>
    )
      .filter(
        (relation) =>
          relation.places.is_active !== false &&
          relationKeys.has(`${relation.content_id}:${relation.places.id}`),
      )
      .map((relation) => ({
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
