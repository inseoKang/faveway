import {
  calculateDistanceKm,
  estimateWalkingMinutes,
} from "@/lib/recommendation/distance";

type Place = {
  id: number;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  place_type: string | null;
  region: string | null;
  is_active: boolean;
};

export type PlaceRelation = {
  id: number;
  content_id: number;
  relation_type: string;
  verification_status: string;
  verified_fact: string | null;
  places: Place;
};

export type CoordinatePlaceRelation = PlaceRelation & {
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

type RouteSelectionReason =
  | "NORMAL"
  | "ONLY_ONE_CANDIDATE"
  | "WALKING_LIMIT"
  | "DURATION_LIMIT"
  | "MULTIPLE_CONSTRAINTS";

const MIN_STAY_MINUTES = 45;

export function getMaxStopsByDuration(durationMinutes: number): number {
  if (durationMinutes <= 180) {
    return 2;
  }

  if (durationMinutes <= 240) {
    return 3;
  }

  return 4;
}

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

export function findAvailableRoute(
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

/**
 * 2곳 이상의 Route가 가능한지 확인한다.
 *
 * 실제 Course를 선택하는 함수와 달리
 * 1곳 Route는 성공으로 보지 않는다.
 *
 * 이 함수는 "왜 최종 Course가 1곳이 되었는지"를
 * 설명하기 위한 분석 용도로 사용한다.
 */
function hasMultiStopRoute(
  candidates: CoordinatePlaceRelation[],
  durationMinutes: number,
  maxWalkingMinutes: number | null,
): boolean {
  if (candidates.length < 2) {
    return false;
  }

  const maximumStopCount = Math.min(
    getMaxStopsByDuration(durationMinutes),
    candidates.length,
  );

  for (let stopCount = maximumStopCount; stopCount >= 2; stopCount -= 1) {
    const route = findBestRouteForStopCount(
      candidates,
      stopCount,
      durationMinutes,
      maxWalkingMinutes,
    );

    if (route) {
      return true;
    }
  }

  return false;
}

/**
 * 최종 Course가 1곳일 때 그 이유를 분류한다.
 *
 * - 후보 자체가 1곳
 * - 최대 도보 시간 때문에 여러 장소를 묶을 수 없음
 * - 여행 가능 시간 때문에 여러 장소를 묶을 수 없음
 * - 두 조건이 함께 영향을 줌
 *
 * 실제 Route 생성 결과는 변경하지 않고
 * 사용자에게 설명할 메타데이터만 계산한다.
 */
export function getRouteSelectionReason(
  candidates: CoordinatePlaceRelation[],
  route: RouteSegment[],
  durationMinutes: number,
  maxWalkingMinutes: number | null,
): RouteSelectionReason {
  if (route.length > 1) {
    return "NORMAL";
  }

  if (candidates.length === 1) {
    return "ONLY_ONE_CANDIDATE";
  }

  /**
   * 도보 제한이 없다면 후보가 여러 개인데 1곳만 선택된 이유는
   * 여행 가능 시간 제약으로 볼 수 있다.
   */
  if (maxWalkingMinutes === null) {
    return "DURATION_LIMIT";
  }

  /**
   * 여행 시간 제약을 사실상 제거한 상태에서
   * 현재 도보 제한만 적용했을 때
   * 2곳 이상 Route가 가능한지 확인한다.
   */
  const hasRouteWithWalkingLimitOnly = hasMultiStopRoute(
    candidates,
    Number.MAX_SAFE_INTEGER,
    maxWalkingMinutes,
  );

  /**
   * 도보 제한을 제거하고
   * 현재 여행 시간만 적용했을 때
   * 2곳 이상 Route가 가능한지 확인한다.
   */
  const hasRouteWithDurationLimitOnly = hasMultiStopRoute(
    candidates,
    durationMinutes,
    null,
  );

  if (!hasRouteWithWalkingLimitOnly && hasRouteWithDurationLimitOnly) {
    return "WALKING_LIMIT";
  }

  if (hasRouteWithWalkingLimitOnly && !hasRouteWithDurationLimitOnly) {
    return "DURATION_LIMIT";
  }

  return "MULTIPLE_CONSTRAINTS";
}

