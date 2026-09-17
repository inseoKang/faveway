import { NextResponse } from "next/server";

type RouteStop = {
  placeId: number;
  latitude: number;
  longitude: number;
  name: string;
};

type WalkingRouteRequest = {
  stops: RouteStop[];
};

type TmapGeometry =
  | {
      type: "Point";
      coordinates: [number, number];
    }
  | {
      type: "LineString";
      coordinates: [number, number][];
    };

type TmapFeature = {
  type: "Feature";
  geometry: TmapGeometry;
  properties?: {
    pointType?: string;
    totalDistance?: number;
    totalTime?: number;
  };
};

type TmapPedestrianResponse = {
  type?: string;
  features?: TmapFeature[];
};

type RouteSegmentResponse = {
  fromPlaceId: number;
  toPlaceId: number;
  distanceMeters: number | null;
  durationSeconds: number | null;
  path: {
    latitude: number;
    longitude: number;
  }[];
  success: boolean;
};

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidRouteStop(value: unknown): value is RouteStop {
  if (!value || typeof value !== "object") {
    return false;
  }

  const stop = value as Partial<RouteStop>;

  return (
    typeof stop.placeId === "number" &&
    Number.isInteger(stop.placeId) &&
    isFiniteCoordinate(stop.latitude) &&
    isFiniteCoordinate(stop.longitude) &&
    typeof stop.name === "string" &&
    stop.name.trim().length > 0
  );
}

async function fetchTmapSegment(
  appKey: string,
  start: RouteStop,
  end: RouteStop,
): Promise<RouteSegmentResponse> {
  try {
    const response = await fetch(
      "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          appKey,
        },
        body: JSON.stringify({
          startX: start.longitude,
          startY: start.latitude,
          endX: end.longitude,
          endY: end.latitude,
          startName: encodeURIComponent(start.name),
          endName: encodeURIComponent(end.name),
          reqCoordType: "WGS84GEO",
          resCoordType: "WGS84GEO",
          searchOption: "0",
          sort: "index",
        }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("TMAP pedestrian route failed", {
        fromPlaceId: start.placeId,
        toPlaceId: end.placeId,
        status: response.status,
        body: errorText,
      });

      return {
        fromPlaceId: start.placeId,
        toPlaceId: end.placeId,
        distanceMeters: null,
        durationSeconds: null,
        path: [],
        success: false,
      };
    }

    const data = (await response.json()) as TmapPedestrianResponse;
    const features = data.features ?? [];

    const startFeature = features.find(
      (feature) =>
        feature.geometry?.type === "Point" &&
        feature.properties?.pointType === "SP",
    );

    const distanceMeters = startFeature?.properties?.totalDistance;
    const durationSeconds = startFeature?.properties?.totalTime;

    const path = features.flatMap((feature) => {
      if (feature.geometry?.type !== "LineString") {
        return [];
      }

      return feature.geometry.coordinates.flatMap(([longitude, latitude]) => {
        if (!isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) {
          return [];
        }

        return [
          {
            latitude,
            longitude,
          },
        ];
      });
    });

    if (
      !isFiniteCoordinate(distanceMeters) ||
      !isFiniteCoordinate(durationSeconds) ||
      path.length < 2
    ) {
      console.error("TMAP pedestrian route response is incomplete", {
        fromPlaceId: start.placeId,
        toPlaceId: end.placeId,
      });

      return {
        fromPlaceId: start.placeId,
        toPlaceId: end.placeId,
        distanceMeters: null,
        durationSeconds: null,
        path: [],
        success: false,
      };
    }

    return {
      fromPlaceId: start.placeId,
      toPlaceId: end.placeId,
      distanceMeters,
      durationSeconds,
      path,
      success: true,
    };
  } catch (error) {
    console.error("TMAP pedestrian route request failed", {
      fromPlaceId: start.placeId,
      toPlaceId: end.placeId,
      error,
    });

    return {
      fromPlaceId: start.placeId,
      toPlaceId: end.placeId,
      distanceMeters: null,
      durationSeconds: null,
      path: [],
      success: false,
    };
  }
}

export async function POST(request: Request) {
  const appKey = process.env.TMAP_APP_KEY;

  if (!appKey) {
    return NextResponse.json(
      {
        message: "TMAP_APP_KEY가 설정되지 않았습니다.",
      },
      { status: 500 },
    );
  }

  let body: WalkingRouteRequest;

  try {
    body = (await request.json()) as WalkingRouteRequest;
  } catch {
    return NextResponse.json(
      {
        message: "요청 본문을 확인해 주세요.",
      },
      { status: 400 },
    );
  }

  if (
    !Array.isArray(body.stops) ||
    body.stops.length < 2 ||
    !body.stops.every(isValidRouteStop)
  ) {
    return NextResponse.json(
      {
        message: "2개 이상의 유효한 Course 장소가 필요합니다.",
      },
      { status: 400 },
    );
  }

  const segments: RouteSegmentResponse[] = [];

  for (let index = 1; index < body.stops.length; index += 1) {
    const start = body.stops[index - 1];
    const end = body.stops[index];

    const segment = await fetchTmapSegment(appKey, start, end);
    segments.push(segment);
  }

  return NextResponse.json({
    data: {
      segments,
    },
  });
}
