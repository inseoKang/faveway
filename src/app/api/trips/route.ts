import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  calculateDistanceKm,
  estimateWalkingMinutes,
} from "@/lib/recommendation/distance";

type TripRequest = {
  contentId: number;
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

type RouteSegment = {
  relation: CoordinatePlaceRelation;
  distanceFromPreviousKm: number;
  walkingMinutesFromPrevious: number;
};

const MIN_STAY_MINUTES = 45;

function getMaxStopsByDuration(durationMinutes: number): number {
  if (durationMinutes <= 180) {
    return 2;
  }

  if (durationMinutes <= 240) {
    return 3;
  }

  return 4;
}

function hasCoordinates(
  relation: PlaceRelation,
): relation is CoordinatePlaceRelation {
  return (
    relation.places.latitude !== null && relation.places.longitude !== null
  );
}

/**
 * 지정된 개수만큼 장소를 선택하되
 * 방문 순서까지 고려한 모든 경우의 수를 만든다.
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
 * 장소 간 이동 거리와 예상 도보 시간을 계산한다.
 */
function calculateRoute(relations: CoordinatePlaceRelation[]): RouteSegment[] {
  return relations.map((relation, index) => {
    // 첫 장소는 코스의 시작점
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
 * 특정 방문 장소 수에 대해
 * 여행 조건을 만족하는 코스 중
 * 총 이동거리가 가장 짧은 코스를 찾는다.
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
     * 사용자가 최대 도보 시간을 설정했다면
     * 하나의 이동 구간이라도 제한을 초과하는 코스는 제외한다.
     *
     * 첫 번째 장소는 이동 시간이 0이므로 자동 통과한다.
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
     * 각 장소에서 최소 45분은 머물 수 있어야 한다.
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
 * 여행 가능 시간에 따른 최대 장소 수부터 시도한다.
 *
 * 3시간 → 최대 2곳
 * 4시간 → 최대 3곳
 * 5시간 → 최대 4곳
 *
 * 조건을 만족하는 코스가 없다면 장소 수를 줄여 다시 시도한다.
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

    const { contentId, durationMinutes, maxWalkingMinutes } = body;

    const invalidWalkingMinutes =
      maxWalkingMinutes !== null &&
      (!Number.isInteger(maxWalkingMinutes) || maxWalkingMinutes <= 0);

    if (
      !Number.isInteger(contentId) ||
      contentId <= 0 ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0 ||
      invalidWalkingMinutes
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

    // 비활성 장소 제외
    const activePlaces = relations.filter(
      (relation) => relation.places.is_active !== false,
    );

    // 동일 장소 중복 제거
    const uniquePlaces = Array.from(
      new Map(
        activePlaces.map((relation) => [relation.places.id, relation]),
      ).values(),
    );

    // 좌표가 있는 장소만 경로 계산 후보로 사용
    const coordinatePlaces = uniquePlaces.filter(hasCoordinates);

    if (coordinatePlaces.length === 0) {
      return NextResponse.json(
        {
          message: "좌표가 등록된 촬영지가 없어 코스를 생성할 수 없습니다.",
        },
        { status: 404 },
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
          message:
            maxWalkingMinutes !== null
              ? `한 번에 ${maxWalkingMinutes}분 이내로 걸을 수 있는 코스를 찾지 못했습니다. 도보 시간을 늘려 다시 시도해주세요.`
              : "선택한 시간 안에 방문 가능한 코스를 만들 수 없습니다.",
        },
        { status: 400 },
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

    /**
     * 전체 여행시간에서 이동시간을 제외한 시간을
     * 장소 체류시간으로 사용한다.
     */
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

      relationType: routeStop.relation.relation_type,

      verificationStatus: routeStop.relation.verification_status,

      verifiedFact: routeStop.relation.verified_fact,

      place: routeStop.relation.places,
    }));

    return NextResponse.json({
      data: {
        contentId,
        durationMinutes,
        maxWalkingMinutes,

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
      { status: 500 },
    );
  }
}
