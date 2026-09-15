import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  calculateDistanceKm,
  estimateWalkingMinutes,
} from "@/lib/recommendation/distance";

type TripRequest = {
  contentId: number;
  actorIds: number[];
  durationMinutes: number;
  maxWalkingMinutes: number | null;
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

type CoordinatePlaceRelation = PlaceRelation & {
  places: Place & {
    latitude: number;
    longitude: number;
  };
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

type RouteSegment = {
  relation: CoordinatePlaceRelation;
  distanceFromPreviousKm: number;
  walkingMinutesFromPrevious: number;
};

const MIN_STAY_MINUTES = 45;

/**
 * 여행 가능 시간별 최대 장소 수
 */
function getMaxStopsByDuration(durationMinutes: number): number {
  if (durationMinutes <= 180) {
    return 2;
  }

  if (durationMinutes <= 240) {
    return 3;
  }

  return 4;
}

/**
 * 좌표 존재 여부 확인
 */
function hasCoordinates(
  relation: PlaceRelation,
): relation is CoordinatePlaceRelation {
  return (
    relation.places.latitude !== null && relation.places.longitude !== null
  );
}

/**
 * 가능한 장소 조합 + 방문 순서 생성
 */
function createOrderedRoutes<T>(items: T[], count: number): T[][] {
  if (count === 0) {
    return [[]];
  }

  const routes: T[][] = [];

  items.forEach((item, index) => {
    const remaining = items.filter((_, currentIndex) => currentIndex !== index);

    const subRoutes = createOrderedRoutes(remaining, count - 1);

    subRoutes.forEach((subRoute) => {
      routes.push([item, ...subRoute]);
    });
  });

  return routes;
}

/**
 * 하나의 Route에서
 * 장소 간 거리와 도보 시간 계산
 */
function calculateRoute(relations: CoordinatePlaceRelation[]): RouteSegment[] {
  return relations.map((relation, index) => {
    if (index === 0) {
      return {
        relation,
        distanceFromPreviousKm: 0,
        walkingMinutesFromPrevious: 0,
      };
    }

    const previous = relations[index - 1];

    const distanceKm = calculateDistanceKm(
      {
        latitude: previous.places.latitude,

        longitude: previous.places.longitude,
      },
      {
        latitude: relation.places.latitude,

        longitude: relation.places.longitude,
      },
    );

    return {
      relation,

      distanceFromPreviousKm: distanceKm,

      walkingMinutesFromPrevious: estimateWalkingMinutes(distanceKm),
    };
  });
}

/**
 * 동일 Place 중복 제거
 */
function deduplicatePlaces(relations: PlaceRelation[]): PlaceRelation[] {
  return Array.from(
    new Map(
      relations.map((relation) => [relation.places.id, relation]),
    ).values(),
  );
}

/**
 * 선택 배우 중 한 명 이상이 실제 등장한
 * Scene의 촬영지 ID를 반환한다.
 *
 * 여러 배우는 OR 조건이다.
 *
 * 육성재 + 이동욱:
 *
 * 육성재 Scene
 * UNION
 * 이동욱 Scene
 * ↓
 * Scene Place
 */
async function findActorScenePlaceIds(
  actorIds: number[],
  contentId: number,
): Promise<Set<number>> {
  if (actorIds.length === 0) {
    return new Set<number>();
  }

  const supabase = createServerSupabaseClient();

  /**
   * 1. 선택 배우 중 한 명 이상이 등장한 Scene
   */
  const { data: sceneActorData, error: sceneActorError } = await supabase
    .from("scene_actors")
    .select("scene_id")
    .in("actor_id", actorIds);

  if (sceneActorError) {
    throw new Error(`Failed to fetch actor scenes: ${sceneActorError.message}`);
  }

  const actorSceneIds = Array.from(
    new Set(
      ((sceneActorData ?? []) as SceneActor[]).map((row) => row.scene_id),
    ),
  );

  if (actorSceneIds.length === 0) {
    return new Set<number>();
  }

  /**
   * 2. 위 Scene 중 현재 선택 작품에 속한 Scene만
   */
  const { data: sceneData, error: sceneError } = await supabase
    .from("scenes")
    .select("id")
    .eq("content_id", contentId)
    .in("id", actorSceneIds);

  if (sceneError) {
    throw new Error(`Failed to fetch content scenes: ${sceneError.message}`);
  }

  const validSceneIds = ((sceneData ?? []) as Scene[]).map((scene) => scene.id);

  if (validSceneIds.length === 0) {
    return new Set<number>();
  }

  /**
   * 3. 해당 Scene과 연결된 촬영지 조회
   */
  const { data: scenePlaceData, error: scenePlaceError } = await supabase
    .from("scene_places")
    .select(
      `
      scene_id,
      place_id
    `,
    )
    .in("scene_id", validSceneIds);

  if (scenePlaceError) {
    throw new Error(`Failed to fetch scene places: ${scenePlaceError.message}`);
  }

  const scenePlaces = (scenePlaceData ?? []) as ScenePlace[];

  return new Set(scenePlaces.map((row) => row.place_id));
}

/**
 * 특정 장소 수에서
 * 여행 조건을 만족하는 Route 중
 * 이동거리가 가장 짧은 Route 선택
 */
function findBestRouteForStopCount(
  candidates: CoordinatePlaceRelation[],
  stopCount: number,
  durationMinutes: number,
  maxWalkingMinutes: number | null,
): RouteSegment[] | null {
  const orderedRoutes = createOrderedRoutes(candidates, stopCount);

  let bestRoute: RouteSegment[] | null = null;

  let shortestDistance = Number.POSITIVE_INFINITY;

  for (const orderedRoute of orderedRoutes) {
    const route = calculateRoute(orderedRoute);

    /**
     * 한 구간 최대 도보 시간 검증
     */
    const exceedsWalkingLimit =
      maxWalkingMinutes !== null &&
      route.some((stop) => stop.walkingMinutesFromPrevious > maxWalkingMinutes);

    if (exceedsWalkingLimit) {
      continue;
    }

    const totalWalkingMinutes = route.reduce(
      (sum, stop) => sum + stop.walkingMinutesFromPrevious,
      0,
    );

    /**
     * 각 장소 최소 45분 체류
     */
    const minimumRequiredMinutes =
      totalWalkingMinutes + stopCount * MIN_STAY_MINUTES;

    if (minimumRequiredMinutes > durationMinutes) {
      continue;
    }

    const totalDistance = route.reduce(
      (sum, stop) => sum + stop.distanceFromPreviousKm,
      0,
    );

    if (totalDistance < shortestDistance) {
      shortestDistance = totalDistance;

      bestRoute = route;
    }
  }

  return bestRoute;
}

/**
 * 최대 방문 장소 수부터
 * 하나씩 줄이며 가능한 Route 탐색
 */
function findAvailableRoute(
  candidates: CoordinatePlaceRelation[],
  durationMinutes: number,
  maxWalkingMinutes: number | null,
): RouteSegment[] | null {
  const maximumStopCount = Math.min(
    getMaxStopsByDuration(durationMinutes),
    candidates.length,
  );

  for (let stopCount = maximumStopCount; stopCount >= 1; stopCount -= 1) {
    const route = findBestRouteForStopCount(
      candidates,
      stopCount,
      durationMinutes,
      maxWalkingMinutes,
    );

    if (route) {
      return route;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TripRequest;

    const { contentId, actorIds, durationMinutes, maxWalkingMinutes } = body;

    /**
     * actorIds 정규화
     */
    const normalizedActorIds = Array.isArray(actorIds)
      ? Array.from(new Set(actorIds))
      : [];

    const invalidActorIds = normalizedActorIds.some(
      (actorId) => !Number.isInteger(actorId) || actorId <= 0,
    );

    const invalidWalkingMinutes =
      maxWalkingMinutes !== null &&
      (!Number.isInteger(maxWalkingMinutes) || maxWalkingMinutes <= 0);

    if (
      !Number.isInteger(contentId) ||
      contentId <= 0 ||
      invalidActorIds ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0 ||
      invalidWalkingMinutes
    ) {
      return NextResponse.json(
        {
          message: "잘못된 여행 조건입니다.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase = createServerSupabaseClient();

    /**
     * 작품 전체 촬영지 Candidate 조회
     */
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
        {
          status: 500,
        },
      );
    }

    const relations = (data ?? []) as unknown as PlaceRelation[];

    /**
     * 비활성 장소 제외
     */
    const activeRelations = relations.filter(
      (relation) => relation.places.is_active !== false,
    );

    /**
     * 동일 장소 중복 제거
     */
    let candidateRelations = deduplicatePlaces(activeRelations);

    /**
     * 배우가 1명 이상 선택된 경우
     * 반드시 Actor → Scene → Place 기준으로
     * Candidate를 다시 제한한다.
     */
    if (normalizedActorIds.length > 0) {
      const actorScenePlaceIds = await findActorScenePlaceIds(
        normalizedActorIds,
        contentId,
      );

      candidateRelations = candidateRelations.filter((relation) =>
        actorScenePlaceIds.has(relation.places.id),
      );
    }

    /**
     * 배우를 선택했는데
     * Scene 기반 촬영지가 하나도 없는 경우
     *
     * 작품 전체 장소로 자동 확장하지 않는다.
     */
    if (candidateRelations.length === 0) {
      return NextResponse.json(
        {
          message:
            normalizedActorIds.length > 0
              ? "선택한 배우가 등장한 장면과 연결된 촬영지가 없습니다."
              : "등록된 촬영지가 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    /**
     * 좌표 존재 장소만 Route Candidate로 사용
     */
    const coordinatePlaces = candidateRelations.filter(hasCoordinates);

    if (coordinatePlaces.length === 0) {
      return NextResponse.json(
        {
          message: "좌표가 등록된 촬영지가 없어 코스를 생성할 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    /**
     * Route 생성
     */
    const route = findAvailableRoute(
      coordinatePlaces,
      durationMinutes,
      maxWalkingMinutes,
    );

    if (!route) {
      return NextResponse.json(
        {
          message:
            maxWalkingMinutes !== null
              ? `한 번에 ${maxWalkingMinutes}분 이내로 이동할 수 있는 코스를 찾지 못했습니다. 도보 조건을 변경해 다시 시도해주세요.`
              : "선택한 시간 안에 방문 가능한 코스를 만들 수 없습니다.",
        },
        {
          status: 400,
        },
      );
    }

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
      placeId: routeStop.relation.places.id,

      order: index + 1,

      stayMinutes,

      distanceFromPreviousKm: Number(
        routeStop.distanceFromPreviousKm.toFixed(2),
      ),

      walkingMinutesFromPrevious: routeStop.walkingMinutesFromPrevious,

      /**
       * actorIds가 존재하면
       * 이미 Actor Scene 기반으로 Filter된 장소
       */
      isActorScenePlace: normalizedActorIds.length > 0,

      relationType: routeStop.relation.relation_type,

      verificationStatus: routeStop.relation.verification_status,

      verifiedFact: routeStop.relation.verified_fact,

      place: routeStop.relation.places,
    }));

    return NextResponse.json({
      data: {
        contentId,

        actorIds: normalizedActorIds,

        durationMinutes,

        maxWalkingMinutes,

        candidateSource:
          normalizedActorIds.length > 0 ? "ACTOR_SCENE" : "CONTENT",

        candidateCount: coordinatePlaces.length,

        totalDistanceKm: Number(totalDistanceKm.toFixed(2)),

        totalWalkingMinutes,

        stops,
      },
    });
  } catch (error) {
    console.error("Unexpected trip creation error:", error);

    return NextResponse.json(
      {
        message: "코스를 생성하는 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
