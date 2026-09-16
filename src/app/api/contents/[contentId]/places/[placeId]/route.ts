import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type Scene = {
  id: number;
  episode: string | null;
  description: string | null;
};

type SceneActorRow = {
  scene_id: number;
  actor_id: number;
};

type Actor = {
  id: number;
  name: string;
};

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{
      contentId: string;
      placeId: string;
    }>;
  },
) {
  const params = await context.params;

  const contentId = Number(params.contentId);
  const placeId = Number(params.placeId);

  if (![contentId, placeId].every((id) => Number.isSafeInteger(id) && id > 0)) {
    return NextResponse.json(
      {
        message: "잘못된 장소 정보입니다.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const db = createServerSupabaseClient();

    const [placeResult, contentResult, scenePlaceResult, evidenceResult] =
      await Promise.all([
        db
          .from("places")
          .select("id,name,address,latitude,longitude,is_active")
          .eq("id", placeId)
          .maybeSingle(),

        db
          .from("contents")
          .select("id,title")
          .eq("id", contentId)
          .maybeSingle(),

        db.from("scene_places").select("scene_id").eq("place_id", placeId),

        db
          .from("place_relations")
          .select(
            "verification_status,source_type,source_url,verified_fact,verified_at",
          )
          .eq("content_id", contentId)
          .eq("place_id", placeId),
      ]);

    if (
      placeResult.error ||
      contentResult.error ||
      scenePlaceResult.error ||
      evidenceResult.error
    ) {
      throw new Error("Place detail query failed");
    }

    if (
      !placeResult.data ||
      placeResult.data.is_active === false ||
      !contentResult.data
    ) {
      return NextResponse.json(
        {
          message: "이 장소를 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    const linkedSceneIds = Array.from(
      new Set((scenePlaceResult.data ?? []).map((row) => row.scene_id)),
    );

    let scenes: Scene[] = [];

    if (linkedSceneIds.length > 0) {
      const { data, error } = await db
        .from("scenes")
        .select("id,episode,description")
        .eq("content_id", contentId)
        .in("id", linkedSceneIds);

      if (error) {
        throw new Error("Scene query failed");
      }

      scenes = (data ?? []) as Scene[];
    }

    if (scenes.length === 0 && (evidenceResult.data ?? []).length === 0) {
      return NextResponse.json(
        {
          message: "이 작품과 연결된 장소가 아닙니다.",
        },
        {
          status: 404,
        },
      );
    }

    const sceneIds = scenes.map((scene) => scene.id);

    const actorMap = new Map<number, Actor>();

    const sceneActorMap = new Map<number, Actor[]>();

    if (sceneIds.length > 0) {
      const { data: sceneActorData, error: sceneActorError } = await db
        .from("scene_actors")
        .select("scene_id,actor_id")
        .in("scene_id", sceneIds);

      if (sceneActorError) {
        throw new Error("Scene actor query failed");
      }

      const sceneActorRows = (sceneActorData ?? []) as SceneActorRow[];

      const actorIds = Array.from(
        new Set(sceneActorRows.map((row) => row.actor_id)),
      );

      if (actorIds.length > 0) {
        const { data: actorData, error: actorError } = await db
          .from("actors")
          .select("id,name")
          .in("id", actorIds);

        if (actorError) {
          throw new Error("Actor query failed");
        }

        ((actorData ?? []) as Actor[]).forEach((actor) => {
          actorMap.set(actor.id, actor);
        });
      }

      sceneActorRows.forEach((row) => {
        const actor = actorMap.get(row.actor_id);

        if (!actor) {
          return;
        }

        const current = sceneActorMap.get(row.scene_id) ?? [];

        current.push(actor);

        sceneActorMap.set(row.scene_id, current);
      });
    }

    const enrichedScenes = scenes
      .sort((a, b) => {
        const episodeNumber = (value: string | null) => {
          if (!value?.trim() || !Number.isFinite(Number(value))) {
            return Infinity;
          }

          return Number(value);
        };

        return (
          episodeNumber(a.episode) - episodeNumber(b.episode) || a.id - b.id
        );
      })
      .map((scene) => ({
        ...scene,
        actors: sceneActorMap.get(scene.id) ?? [],
      }));

    const actors = Array.from(actorMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "ko"),
    );

    const sources = Array.from(
      new Map(
        (evidenceResult.data ?? []).map((row) => [JSON.stringify(row), row]),
      ).values(),
    );

    return NextResponse.json({
      data: {
        place: placeResult.data,
        content: contentResult.data,
        scenes: enrichedScenes,
        actors,
        sources,
      },
    });
  } catch (error) {
    console.error("Failed to fetch place details", error);

    return NextResponse.json(
      {
        message: "장소 설명을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      {
        status: 500,
      },
    );
  }
}
