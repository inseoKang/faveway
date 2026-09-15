import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type TripRequest = {
  contentId: number;
  durationMinutes: number;
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TripRequest;

    const { contentId, durationMinutes } = body;

    if (
      !contentId ||
      !Number.isInteger(contentId) ||
      !durationMinutes ||
      !Number.isInteger(durationMinutes)
    ) {
      return NextResponse.json(
        {
          message: "잘못된 여행 조건입니다.",
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
      .eq("content_id", contentId);

    if (error) {
      console.error("Failed to fetch trip candidates:", error);

      return NextResponse.json(
        {
          message: "촬영지 후보를 불러오지 못했습니다.",
        },
        { status: 500 },
      );
    }

    const relations = (data ?? []) as unknown as PlaceRelation[];

    const activePlaces = relations.filter(
      (relation) => relation.places.is_active !== false,
    );

    const uniquePlaces = Array.from(
      new Map(
        activePlaces.map((relation) => [relation.places.id, relation]),
      ).values(),
    );

    if (uniquePlaces.length === 0) {
      return NextResponse.json(
        {
          message: "코스를 생성할 수 있는 촬영지가 없습니다.",
        },
        { status: 404 },
      );
    }

    // MVP 임시 규칙:
    // 촬영지 후보 중 앞에서부터 최대 3개 선택
    const selectedPlaces = uniquePlaces.slice(0, 3);

    const defaultStayMinutes = Math.floor(
      durationMinutes / selectedPlaces.length,
    );

    const stops = selectedPlaces.map((relation, index) => ({
      placeId: relation.places.id,
      order: index + 1,
      stayMinutes: defaultStayMinutes,
      relationType: relation.relation_type,
      verificationStatus: relation.verification_status,
      verifiedFact: relation.verified_fact,
      place: relation.places,
    }));

    return NextResponse.json({
      data: {
        contentId,
        durationMinutes,
        stops,
      },
    });
  } catch (error) {
    console.error("Unexpected trip creation error:", error);

    return NextResponse.json(
      {
        message: "코스를 생성하는 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
