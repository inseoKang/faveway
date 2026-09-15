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
  relation_type: string;
  verification_status: string;
  verified_fact: string | null;
  places: Place;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { contentId } = await context.params;

    const parsedContentId = Number(contentId);

    if (Number.isNaN(parsedContentId)) {
      return NextResponse.json(
        {
          message: "잘못된 콘텐츠 ID입니다.",
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

    // 활성화된 장소만 남기기
    const activePlaces = relations.filter(
      (relation) => relation.places.is_active !== false,
    );

    // 같은 place.id를 가진 장소 중복 제거
    const uniquePlaces = Array.from(
      new Map(
        activePlaces.map((relation) => [relation.places.id, relation]),
      ).values(),
    );

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
