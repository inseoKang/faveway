import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  calculateDistanceKm,
  estimateWalkingMinutes,
} from "@/lib/recommendation/distance";

type TripRequest = {
  contentId: number;
  actorId: number | null;
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
  actor_id: number | null;
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

type RouteSegment = {
  relation: CoordinatePlaceRelation;
  distanceFromPreviousKm: number;
  walkingMinutesFromPrevious: number;
};

const MIN_STAY_MINUTES = 45;

/**
 * 여행 가능 시간에 따라 최대 방문 장소 수를 결정한다.
 *
 * 3시간 → 최대 2곳
 * 4시간 → 최대 3곳
 * 5시간 이상 → 최대 4곳
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
 * 위도와 경도가 모두 존재하는 장소인지 확인한다.
 */
function hasCoordinates(
  relation: PlaceRelation,
): relation is CoordinatePlaceRelation {
  return (
    relation.places.latitude !== null && relation.places.longitude !== null
  );
}

/**
 * 지정된 개수만큼 장소를 선택하면서
 * 방문 순서까지 고려한 모든 경우의 수를 생성한다.
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
 * 하나의 방문 순서에 대해
 * 각 장소 사이 거리와 예상 도보 시간을 계산한다.
 *
 * 첫 번째 장소는 코스 시작점이므로
 * 이전 장소에서 오는 이동시간을 계산하지 않는다.
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
 * 동일 장소에 여러 relation이 존재할 경우
 * 장소 하나당 하나의 relation만 남긴다.
 *
 * 배우가 선택된 경우에는
 * 해당 배우와 직접 연결된 relation을 우선적으로 보존한다.
 */
function deduplicatePlaces(
  relations: PlaceRelation[],
  actorId: number | null,
): PlaceRelation[] {
  const placeMap = new Map<number, PlaceRelation>();

  for (const relation of relations) {
    const placeId = relation.places.id;
    const existing = placeMap.get(placeId);

    if (!existing) {
      placeMap.set(placeId, relation);
      continue;
    }

    if (actorId === null) {
      continue;
    }

    const existingMatchesActor = existing.actor_id === actorId;

    const currentMatchesActor = relation.actor_id === actorId;

    if (currentMatchesActor && !existingMatchesActor) {
      placeMap.set(placeId, relation);
    }
  }

  return Array.from(placeMap.values());
}

/**
 * 특정 방문 장소 수에 대해 가능한 모든 코스를 검사한다.
 *
 * 우선순위:
 *
 * 1. 사용자의 최대 도보 시간 조건 만족
 * 2. 전체 여행 가능 시간 조건 만족
 * 3. 선택 배우 관련 장소가 많이 포함된 코스
 * 4. 배우 관련 장소 수가 같다면 총 이동거리가 짧은 코스
 */
function findBestRouteForStopCount(
  candidates: CoordinatePlaceRelation[],
  stopCount: number,
  durationMinutes: number,
  maxWalkingMinutes: number | null,
  actorId: number | null,
): RouteSegment[] | null {
  const orderedRoutes = createOrderedRoutes(candidates, stopCount);

  let bestRoute: RouteSegment[] | null = null;

  let bestActorMatchCount = -1;

  let shortestDistance = Number.POSITIVE_INFINITY;

  for (const orderedRoute of orderedRoutes) {
    const route = calculateRoute(orderedRoute);

    /**
     * 한 구간이라도 사용자가 설정한
     * 최대 도보 시간을 초과하면 제외한다.
     */
    const exceedsWalkingLimit =
      maxWalkingMinutes !== null &&
      route.some((stop) => stop.walkingMinutesFromPrevious > maxWalkingMinutes);

    if (exceedsWalkingLimit) {
      continue;
    }

    /**
     * 코스 전체 도보 이동시간
     */
    const totalWalkingMinutes = route.reduce(
      (sum, stop) => sum + stop.walkingMinutesFromPrevious,
      0,
    );

    /**
     * 각 장소에서 최소 45분씩 체류한다고 가정한다.
     */
    const minimumRequiredMinutes =
      totalWalkingMinutes + stopCount * MIN_STAY_MINUTES;

    if (minimumRequiredMinutes > durationMinutes) {
      continue;
    }

    /**
     * 전체 이동 거리 계산
     */
    const totalDistance = route.reduce(
      (sum, stop) => sum + stop.distanceFromPreviousKm,
      0,
    );

    /**
     * 선택 배우와 직접 연결된 촬영지 개수 계산
     *
     * 작품만 선택한 경우 actorId가 null이므로
     * 배우 관련 우선순위를 적용하지 않는다.
     */
    const actorMatchCount =
      actorId === null
        ? 0
        : route.filter((stop) => stop.relation.actor_id === actorId).length;

    const hasMoreActorMatches = actorMatchCount > bestActorMatchCount;

    const hasSameActorMatchesButShorter =
      actorMatchCount === bestActorMatchCount &&
      totalDistance < shortestDistance;

    if (hasMoreActorMatches || hasSameActorMatchesButShorter) {
      bestActorMatchCount = actorMatchCount;

      shortestDistance = totalDistance;

      bestRoute = route;
    }
  }

  return bestRoute;
}

/**
 * 여행 가능 시간에 따른 최대 장소 수부터 탐색한다.
 *
 * 최대 장소 수로 코스를 만들 수 없다면
 * 장소 수를 하나씩 줄여 다시 검사한다.
 */
function findAvailableRoute(
  candidates: CoordinatePlaceRelation[],
  durationMinutes: number,
  maxWalkingMinutes: number | null,
  actorId: number | null,
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
      actorId,
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

    const { contentId, actorId, durationMinutes, maxWalkingMinutes } = body;

    /**
     * 여행 조건 검증
     */
    const invalidActorId =
      actorId !== null && (!Number.isInteger(actorId) || actorId <= 0);

    const invalidWalkingMinutes =
      maxWalkingMinutes !== null &&
      (!Number.isInteger(maxWalkingMinutes) || maxWalkingMinutes <= 0);

    if (
      !Number.isInteger(contentId) ||
      contentId <= 0 ||
      invalidActorId ||
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
     * 선택한 작품과 연결된 촬영지 후보 조회
     *
     * actor_id도 함께 조회하여
     * 선택 배우와 직접 연결된 장소인지 판단한다.
     */
    const { data, error } = await supabase
      .from("place_relations")
      .select(
        `
          id,
          actor_id,
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
     * 서비스에서 비활성 처리된 장소 제외
     */
    const activePlaces = relations.filter(
      (relation) => relation.places.is_active !== false,
    );

    /**
     * 동일 장소 중복 제거
     *
     * 배우가 선택된 경우 해당 배우와 연결된
     * relation을 우선적으로 남긴다.
     */
    const uniquePlaces = deduplicatePlaces(activePlaces, actorId);

    /**
     * 좌표가 있는 장소만
     * 경로 계산 Candidate로 사용
     */
    const coordinatePlaces = uniquePlaces.filter(hasCoordinates);

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
     * 사용자 여행 조건에 맞는 최적 코스 탐색
     */
    const route = findAvailableRoute(
      coordinatePlaces,
      durationMinutes,
      maxWalkingMinutes,
      actorId,
    );

    if (!route) {
      return NextResponse.json(
        {
          message:
            maxWalkingMinutes !== null
              ? `한 번에 ${maxWalkingMinutes}분 이내로 걸을 수 있는 코스를 찾지 못했습니다. 도보 시간을 늘려 다시 시도해주세요.`
              : "선택한 시간 안에 방문 가능한 코스를 만들 수 없습니다.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * 전체 도보 이동시간
     */
    const totalWalkingMinutes = route.reduce(
      (sum, stop) => sum + stop.walkingMinutesFromPrevious,
      0,
    );

    /**
     * 전체 이동거리
     */
    const totalDistanceKm = route.reduce(
      (sum, stop) => sum + stop.distanceFromPreviousKm,
      0,
    );

    /**
     * 전체 여행시간에서 이동시간을 제외한다.
     */
    const availableStayMinutes = durationMinutes - totalWalkingMinutes;

    /**
     * 아직 장소별 권장 체류시간 데이터가 없기 때문에
     * 남은 시간을 장소 수에 맞게 균등하게 분배한다.
     */
    const stayMinutes = Math.floor(availableStayMinutes / route.length);

    /**
     * 선택 배우와 직접 연결된 장소 개수
     */
    const actorMatchedPlaceCount =
      actorId === null
        ? 0
        : route.filter((stop) => stop.relation.actor_id === actorId).length;

    const stops = route.map((routeStop, index) => ({
      placeId: routeStop.relation.places.id,

      order: index + 1,

      stayMinutes,

      distanceFromPreviousKm: Number(
        routeStop.distanceFromPreviousKm.toFixed(2),
      ),

      walkingMinutesFromPrevious: routeStop.walkingMinutesFromPrevious,

      actorId: routeStop.relation.actor_id,

      isActorRelated:
        actorId !== null && routeStop.relation.actor_id === actorId,

      relationType: routeStop.relation.relation_type,

      verificationStatus: routeStop.relation.verification_status,

      verifiedFact: routeStop.relation.verified_fact,

      place: routeStop.relation.places,
    }));

    return NextResponse.json({
      data: {
        contentId,
        actorId,
        durationMinutes,
        maxWalkingMinutes,

        actorMatchedPlaceCount,

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
