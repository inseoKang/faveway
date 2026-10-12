import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  findAvailableRoute,
  getRouteSelectionReason,
  type PlaceRelation,
  type CoordinatePlaceRelation,
} from "@/lib/recommendation/route-selection";

type TripRequest = {
  contentIds: number[];
  actorIds: number[];
  durationMinutes: number;
  maxWalkingMinutes: number | null;
};

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

const COURSE_REGION = "서울";

function normalizeIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter(
        (id): id is number =>
          typeof id === "number" && Number.isInteger(id) && id > 0,
      ),
    ),
  );
}

function hasCoordinates(
  relation: PlaceRelation,
): relation is CoordinatePlaceRelation {
  return (
    relation.places.latitude !== null &&
    relation.places.longitude !== null &&
    Number.isFinite(relation.places.latitude) &&
    Number.isFinite(relation.places.longitude)
  );
}

/**
 * 같은 실제 장소가 여러 작품에 연결되어 있어도
 * 한 코스 안에서는 한 번만 방문한다.
 */
function deduplicatePlaces(relations: PlaceRelation[]): PlaceRelation[] {
  return Array.from(
    new Map(
      relations.map((relation) => [relation.places.id, relation]),
    ).values(),
  );
}

/**
 * 선택 배우 중 한 명 이상이 등장한 장면의
 * contentId + placeId 조합을 반환한다.
 */
async function findActorScenePlaceKeys(
  actorIds: number[],
  contentIds: number[],
): Promise<Set<string>> {
  if (actorIds.length === 0) {
    return new Set();
  }

  const supabase = createServerSupabaseClient();

  const { data: sceneActorData, error: sceneActorError } = await supabase
    .from("scene_actors")
    .select("scene_id")
    .in("actor_id", actorIds);

  if (sceneActorError) {
    throw new Error(sceneActorError.message);
  }

  const actorSceneIds = Array.from(
    new Set(
      ((sceneActorData ?? []) as SceneActor[]).map((row) => row.scene_id),
    ),
  );

  if (actorSceneIds.length === 0) {
    return new Set();
  }

  const { data: sceneData, error: sceneError } = await supabase
    .from("scenes")
    .select("id,content_id")
    .in("content_id", contentIds)
    .in("id", actorSceneIds);

  if (sceneError) {
    throw new Error(sceneError.message);
  }

  const scenes = (sceneData ?? []) as Scene[];

  if (scenes.length === 0) {
    return new Set();
  }

  const sceneContentMap = new Map(
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

  const keys = new Set<string>();

  ((scenePlaceData ?? []) as ScenePlace[]).forEach((row) => {
    const contentId = sceneContentMap.get(row.scene_id);

    if (contentId) {
      keys.add(`${contentId}:${row.place_id}`);
    }
  });

  return keys;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TripRequest;

    const contentIds = normalizeIds(body.contentIds);
    const actorIds = normalizeIds(body.actorIds);

    const { durationMinutes, maxWalkingMinutes } = body;

    const invalidWalkingMinutes =
      maxWalkingMinutes !== null &&
      (!Number.isInteger(maxWalkingMinutes) || maxWalkingMinutes <= 0);

    if (
      contentIds.length === 0 ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0 ||
      invalidWalkingMinutes
    ) {
      return NextResponse.json(
        {
          code: "INVALID_TRIP_CONDITIONS",
          message: "잘못된 여행 조건입니다.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase = createServerSupabaseClient();

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
            region,
            is_active
          )
        `,
        )
        .in("content_id", contentIds),

      supabase.from("contents").select("id,title").in("id", contentIds),
    ]);

    if (relationError || contentError) {
      console.error(
        "Failed to fetch trip candidates:",
        relationError ?? contentError,
      );

      return NextResponse.json(
        {
          code: "TRIP_CANDIDATES_FETCH_FAILED",
          message: "촬영지 후보를 불러오지 못했습니다.",
        },
        {
          status: 500,
        },
      );
    }

    const contents = (contentData ?? []) as Content[];

    const titleMap = new Map(
      contents.map((content) => [content.id, content.title]),
    );

    const relations = (relationData ?? []) as unknown as PlaceRelation[];

    /**
     * 현재 FAVEWAY의 Course 범위는 서울이다.
     *
     * is_active = true
     * → 현재 Course 후보로 사용할 수 있는 장소
     *
     * region = 서울
     * → 현재 서비스 지역 범위에 포함되는 장소
     */
    let candidateRelations = relations.filter(
      (relation) =>
        relation.places.is_active !== false &&
        relation.places.region === COURSE_REGION,
    );

    if (actorIds.length > 0) {
      const actorScenePlaceKeys = await findActorScenePlaceKeys(
        actorIds,
        contentIds,
      );

      candidateRelations = candidateRelations.filter((relation) =>
        actorScenePlaceKeys.has(`${relation.content_id}:${relation.places.id}`),
      );
    }

    candidateRelations = deduplicatePlaces(candidateRelations);

    if (candidateRelations.length === 0) {
      return NextResponse.json(
        {
          code: "NO_FILMING_LOCATIONS",
          message:
            actorIds.length > 0
              ? "선택한 배우가 등장한 장면과 연결된 서울 촬영지가 없습니다."
              : "등록된 서울 촬영지가 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    const coordinatePlaces = candidateRelations.filter(hasCoordinates);

    if (coordinatePlaces.length === 0) {
      return NextResponse.json(
        {
          code: "NO_COORDINATED_FILMING_LOCATIONS",
          message:
            "좌표가 등록된 서울 촬영지가 없어 코스를 생성할 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    const route = findAvailableRoute(
      coordinatePlaces,
      durationMinutes,
      maxWalkingMinutes,
    );

    if (!route) {
      return NextResponse.json(
        {
          code: "NO_AVAILABLE_ROUTE",
          message:
            maxWalkingMinutes !== null
              ? `한 번에 ${maxWalkingMinutes}분 이내로 이동할 수 있는 코스를 찾지 못했습니다.`
              : "선택한 시간 안에 방문 가능한 코스를 만들 수 없습니다.",
        },
        {
          status: 422,
        },
      );
    }

    const routeSelectionReason = getRouteSelectionReason(
      coordinatePlaces,
      route,
      durationMinutes,
      maxWalkingMinutes,
    );

    const totalWalkingMinutes = route.reduce(
      (sum, stop) => sum + stop.walkingMinutesFromPrevious,
      0,
    );

    const totalDistanceKm = route.reduce(
      (sum, stop) => sum + stop.distanceFromPreviousKm,
      0,
    );

    const availableStayMinutes = durationMinutes - totalWalkingMinutes;

    const stayMinutes = Math.floor(availableStayMinutes / route.length);

    const stops = route.map((routeStop, index) => ({
      contentId: routeStop.relation.content_id,

      contentTitle:
        titleMap.get(routeStop.relation.content_id) ?? "작품 정보 없음",

      placeId: routeStop.relation.places.id,

      order: index + 1,

      stayMinutes,

      distanceFromPreviousKm: Number(
        routeStop.distanceFromPreviousKm.toFixed(2),
      ),

      walkingMinutesFromPrevious: routeStop.walkingMinutesFromPrevious,

      isActorScenePlace: actorIds.length > 0,

      relationType: routeStop.relation.relation_type,

      verificationStatus: routeStop.relation.verification_status,

      verifiedFact: routeStop.relation.verified_fact,

      place: routeStop.relation.places,
    }));

    return NextResponse.json({
      data: {
        contentIds,
        actorIds,
        durationMinutes,
        maxWalkingMinutes,

        candidateSource: actorIds.length > 0 ? "ACTOR_SCENE" : "CONTENT",

        /**
         * 현재 작품/배우 조건,
         * 서울 지역,
         * 활성 상태,
         * 좌표 검증까지 통과한 실제 Course 후보 수.
         */
        candidateCount: coordinatePlaces.length,

        /**
         * 최종 Route가 왜 현재 장소 수로 선택되었는지 설명하기 위한 값.
         *
         * NORMAL
         * → 2곳 이상 정상 Course
         *
         * ONLY_ONE_CANDIDATE
         * → Course 후보 자체가 1곳
         *
         * WALKING_LIMIT
         * → 여러 후보는 있지만 최대 도보 시간 때문에 1곳
         *
         * DURATION_LIMIT
         * → 여러 후보는 있지만 여행 가능 시간 때문에 1곳
         *
         * MULTIPLE_CONSTRAINTS
         * → 여행 시간과 도보 조건이 함께 영향을 줌
         */
        routeSelectionReason,

        totalDistanceKm: Number(totalDistanceKm.toFixed(2)),

        totalWalkingMinutes,

        stops,
      },
    });
  } catch (error) {
    console.error("Unexpected trip creation error:", error);

    return NextResponse.json(
      {
        code: "TRIP_CREATION_FAILED",
        message: "코스를 생성하는 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
