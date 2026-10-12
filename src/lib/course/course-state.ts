import { calculateDistanceKm, estimateWalkingMinutes } from "@/lib/recommendation/distance";

export type Place = {
  id: number;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  place_type: string | null;
  region: string | null;
  is_active: boolean;
};

export type CourseStop = {
  contentId: number;
  contentTitle: string;
  placeId: number;
  order: number;
  stayMinutes: number;
  distanceFromPreviousKm: number;
  walkingMinutesFromPrevious: number;
  relationType: string;
  verificationStatus: string;
  verifiedFact: string | null;
  place: Place;
};

type RouteSelectionReason =
  | "NORMAL"
  | "ONLY_ONE_CANDIDATE"
  | "WALKING_LIMIT"
  | "DURATION_LIMIT"
  | "MULTIPLE_CONSTRAINTS";

export type CourseData = {
  contentIds: number[];
  actorIds: number[];
  durationMinutes: number;
  maxWalkingMinutes: number | null;
  candidateCount?: number;
  routeSelectionReason?: RouteSelectionReason;
  totalDistanceKm: number;
  totalWalkingMinutes: number;
  stops: CourseStop[];
};

const COURSE_STORAGE_PREFIX = "faveway:course";

const ROUTE_SELECTION_REASONS: RouteSelectionReason[] = [
  "NORMAL",
  "ONLY_ONE_CANDIDATE",
  "WALKING_LIMIT",
  "DURATION_LIMIT",
  "MULTIPLE_CONSTRAINTS",
];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isIntegerArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "number" && Number.isInteger(item))
  );
}

function isRouteSelectionReason(value: unknown): value is RouteSelectionReason {
  return (
    typeof value === "string" &&
    ROUTE_SELECTION_REASONS.includes(value as RouteSelectionReason)
  );
}

export function isValidCourseStop(value: unknown): value is CourseStop {
  if (!value || typeof value !== "object") {
    return false;
  }

  const stop = value as Partial<CourseStop>;

  if (
    !Number.isInteger(stop.contentId) ||
    typeof stop.contentTitle !== "string" ||
    !Number.isInteger(stop.placeId) ||
    !isFiniteNumber(stop.order) ||
    !isFiniteNumber(stop.stayMinutes) ||
    !isFiniteNumber(stop.distanceFromPreviousKm) ||
    !isFiniteNumber(stop.walkingMinutesFromPrevious) ||
    typeof stop.relationType !== "string" ||
    typeof stop.verificationStatus !== "string" ||
    !(stop.verifiedFact === null || typeof stop.verifiedFact === "string") ||
    !stop.place ||
    typeof stop.place !== "object"
  ) {
    return false;
  }

  const place = stop.place as Partial<Place>;

  return (
    Number.isInteger(place.id) &&
    typeof place.name === "string" &&
    (place.address === null || typeof place.address === "string") &&
    (place.place_type === null || typeof place.place_type === "string") &&
    typeof place.is_active === "boolean" &&
    (place.latitude === null || isFiniteNumber(place.latitude)) &&
    (place.longitude === null || isFiniteNumber(place.longitude))
  );
}

export function isValidCourseData(value: unknown): value is CourseData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const course = value as Partial<CourseData>;

  const candidateCountIsValid =
    course.candidateCount === undefined ||
    (Number.isInteger(course.candidateCount) && course.candidateCount >= 1);

  const routeSelectionReasonIsValid =
    course.routeSelectionReason === undefined ||
    isRouteSelectionReason(course.routeSelectionReason);

  return (
    isIntegerArray(course.contentIds) &&
    isIntegerArray(course.actorIds) &&
    isFiniteNumber(course.durationMinutes) &&
    course.durationMinutes > 0 &&
    (course.maxWalkingMinutes === null ||
      (isFiniteNumber(course.maxWalkingMinutes) &&
        course.maxWalkingMinutes > 0)) &&
    candidateCountIsValid &&
    routeSelectionReasonIsValid &&
    isFiniteNumber(course.totalDistanceKm) &&
    course.totalDistanceKm >= 0 &&
    isFiniteNumber(course.totalWalkingMinutes) &&
    course.totalWalkingMinutes >= 0 &&
    Array.isArray(course.stops) &&
    course.stops.length > 0 &&
    course.stops.every(isValidCourseStop)
  );
}

export function createCourseStorageKey(course: CourseData) {
  const contentKey = [...course.contentIds].sort((a, b) => a - b).join(",");
  const actorKey = [...course.actorIds].sort((a, b) => a - b).join(",");
  const initialRouteKey = course.stops.map((stop) => stop.placeId).join("-");

  return [
    COURSE_STORAGE_PREFIX,
    `contents=${contentKey || "none"}`,
    `actors=${actorKey || "none"}`,
    `duration=${course.durationMinutes}`,
    `walking=${course.maxWalkingMinutes ?? "none"}`,
    `route=${initialRouteKey || "empty"}`,
  ].join(":");
}

export function rebuildCourse(course: CourseData, stops: CourseStop[]): CourseData {
  const recalculatedStops = stops.map((stop, index) => {
    if (index === 0) {
      return {
        ...stop,
        order: 1,
        distanceFromPreviousKm: 0,
        walkingMinutesFromPrevious: 0,
      };
    }

    const previous = stops[index - 1];

    const previousLatitude = previous.place.latitude;
    const previousLongitude = previous.place.longitude;

    const currentLatitude = stop.place.latitude;
    const currentLongitude = stop.place.longitude;

    if (
      previousLatitude == null ||
      previousLongitude == null ||
      currentLatitude == null ||
      currentLongitude == null
    ) {
      return {
        ...stop,
        order: index + 1,
        distanceFromPreviousKm: 0,
        walkingMinutesFromPrevious: 0,
      };
    }

    const distanceKm = calculateDistanceKm(
      {
        latitude: previousLatitude,
        longitude: previousLongitude,
      },
      {
        latitude: currentLatitude,
        longitude: currentLongitude,
      },
    );

    return {
      ...stop,
      order: index + 1,
      distanceFromPreviousKm: Number(distanceKm.toFixed(2)),
      walkingMinutesFromPrevious: estimateWalkingMinutes(distanceKm),
    };
  });

  const totalWalkingMinutes = recalculatedStops.reduce(
    (sum, stop) => sum + stop.walkingMinutesFromPrevious,
    0,
  );

  const totalDistanceKm = recalculatedStops.reduce(
    (sum, stop) => sum + stop.distanceFromPreviousKm,
    0,
  );

  const availableStayMinutes = Math.max(
    course.durationMinutes - totalWalkingMinutes,
    0,
  );

  const stayMinutes =
    recalculatedStops.length > 0
      ? Math.floor(availableStayMinutes / recalculatedStops.length)
      : 0;

  return {
    ...course,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    totalWalkingMinutes,
    stops: recalculatedStops.map((stop) => ({
      ...stop,
      stayMinutes,
    })),
  };
}

// Storage access and warning UI stay in the page; this function only decodes data.
export function restoreStoredCourse(initialCourse: CourseData, storedCourse: string): CourseData {
  const parsedCourse = JSON.parse(storedCourse) as Partial<CourseData>;

  if (
    !Array.isArray(parsedCourse.stops) ||
    parsedCourse.stops.length === 0 ||
    !parsedCourse.stops.every(isValidCourseStop)
  ) {
    throw new Error("Invalid stored course stops.");
  }

  return rebuildCourse(initialCourse, parsedCourse.stops as CourseStop[]);
}

export function createWalkingRouteKey(course: CourseData): string {
  return JSON.stringify(
    course.stops.map((stop) => ({
      placeId: stop.placeId,
      name: stop.place.name,
      latitude: stop.place.latitude,
      longitude: stop.place.longitude,
    })),
  );
}
