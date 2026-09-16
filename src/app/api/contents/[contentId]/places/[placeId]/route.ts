import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ contentId: string; placeId: string }>;
  },
) {
  const params = await context.params;
  const contentId = Number(params.contentId);
  const placeId = Number(params.placeId);
  if (![contentId, placeId].every((id) => Number.isSafeInteger(id) && id > 0)) {
    return NextResponse.json(
      { message: "잘못된 장소 정보입니다." },
      { status: 400 },
    );
  }
  try {
    const db = createServerSupabaseClient();
    const [place, content, links, evidence] = await Promise.all([
      db
        .from("places")
        .select("id,name,address,latitude,longitude,is_active")
        .eq("id", placeId)
        .maybeSingle(),
      db.from("contents").select("id,title").eq("id", contentId).maybeSingle(),
      db.from("scene_places").select("scene_id").eq("place_id", placeId),
      db
        .from("place_relations")
        .select(
          "verification_status,source_type,source_url,verified_fact,verified_at",
        )
        .eq("content_id", contentId)
        .eq("place_id", placeId),
    ]);
    if ([place, content, links, evidence].some((result) => result.error))
      throw new Error("Detail query failed");
    if (!place.data || place.data.is_active === false || !content.data) {
      return NextResponse.json(
        { message: "이 장소를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    const ids = [...new Set((links.data ?? []).map((row) => row.scene_id))];
    const sceneResult = ids.length
      ? await db
          .from("scenes")
          .select("id,episode,description")
          .eq("content_id", contentId)
          .in("id", ids)
          .order("id")
      : { data: [], error: null };
    if (sceneResult.error) throw new Error("Scene query failed");
    if (!sceneResult.data?.length && !evidence.data?.length) {
      return NextResponse.json(
        { message: "이 작품과 연결된 장소가 아닙니다." },
        { status: 404 },
      );
    }
    // 원문 전체에는 보류 구절이 포함될 수 있어 공개 설명으로 반환하지 않는다.
    const scenes = [...(sceneResult.data ?? [])].sort((a, b) => {
      const episode = (value: string | null) =>
        value?.trim() && Number.isFinite(Number(value))
          ? Number(value)
          : Infinity;
      return episode(a.episode) - episode(b.episode) || a.id - b.id;
    });
    const sources = Array.from(
      new Map(
        (evidence.data ?? []).map((row) => [JSON.stringify(row), row]),
      ).values(),
    );
    return NextResponse.json({
      data: { place: place.data, content: content.data, scenes, sources },
    });
  } catch (error) {
    console.error("Failed to fetch place details", error);
    return NextResponse.json(
      {
        message: "장소 설명을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 },
    );
  }
}
