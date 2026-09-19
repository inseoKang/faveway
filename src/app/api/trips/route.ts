import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  calculateDistanceKm,
  estimateWalkingMinutes,
} from "@/lib/recommendation/distance";

type TripRequest = {
  contentIds: number[];
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
  content_id: number;
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

type RouteSegment = {
  relation: CoordinatePlaceRelation;
  distanceFromPreviousKm: number;
  walkingMinutesFromPrevious: number;
};

const MIN_STAY_MINUTES = 45;

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
    relation.places.latitude !== null &&
    relation.places.longitude !== null &&
    Number.isFinite(relation.places.latitude) &&
    Number.isFinite(relation.places.longitude)
  );
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

    let candidateRelations = relations.filter(
      (relation) => relation.places.is_active !== false,
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
              ? "선택한 배우가 등장한 장면과 연결된 촬영지가 없습니다."
              : "등록된 촬영지가 없습니다.",
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
          message: "좌표가 등록된 촬영지가 없어 코스를 생성할 수 없습니다.",
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
        code: "TRIP_CREATION_FAILED",
        message: "코스를 생성하는 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}