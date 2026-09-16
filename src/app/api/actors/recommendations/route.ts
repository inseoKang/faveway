import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SceneActorRow = {
  actor_id: number;
};

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { data: sceneActorData, error: sceneActorError } = await supabase
      .from("scene_actors")
      .select("actor_id");

    if (sceneActorError) {
      console.error(
        "Failed to fetch actors for recommendations:",
        sceneActorError,
      );

      return NextResponse.json(
        {
          message: "추천 배우를 불러오지 못했습니다.",
        },
        {
          status: 500,
        },
      );
    }

    const actorIds = Array.from(
      new Set(
        ((sceneActorData ?? []) as SceneActorRow[]).map((row) => row.actor_id),
      ),
    );

    if (actorIds.length === 0) {
      return NextResponse.json({
        data: [],
      });
    }

    const { data, error } = await supabase
      .from("actors")
      .select("id,name")
      .in("id", actorIds);

    if (error) {
      console.error("Failed to fetch recommended actors:", error);

      return NextResponse.json(
        {
          message: "추천 배우를 불러오지 못했습니다.",
        },
        {
          status: 500,
        },
      );
    }

    const shuffled = [...(data ?? [])].sort(() => Math.random() - 0.5);

    return NextResponse.json({
      data: shuffled.slice(0, 3),
    });
  } catch (error) {
    console.error("Unexpected actor recommendation error:", error);

    return NextResponse.json(
      {
        message: "서버 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
