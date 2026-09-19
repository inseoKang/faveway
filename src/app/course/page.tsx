"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./course.module.css";

import BackButton from "@/components/common/BackButton";
import InlineWarning from "@/components/common/InlineWarning";
import StateFeedback from "@/components/common/StateFeedback";
import CourseMap from "@/components/map/CourseMap";
import PlaceDetailDialog from "@/components/PlaceDetailDialog";

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
  is_active: boolean;
};

type CourseStop = {
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

type CourseData = {
  contentIds: number[];
  actorIds: number[];
  durationMinutes: number;
  maxWalkingMinutes: number | null;
  totalDistanceKm: number;
  totalWalkingMinutes: number;
  stops: CourseStop[];
};

type DetailTarget = {
  contentId: number;
  place: Place;
};

type WalkingViolation = {
  fromOrder: number;
  toOrder: number;
  fromPlaceName: string;
  toPlaceName: string;
  walkingMinutes: number;
  maxWalkingMinutes: number;
};

type CourseValidation = {
  isValid: boolean;
  walkingViolations: WalkingViolation[];
  exceedsDuration: boolean;
  durationOverMinutes: number;
};

type ContentSummary = {
  id: number;
  title: string;
};

type CandidateRelation = {
  relation_type: string;
  verification_status: string;
  verified_fact: string | null;
  places: Place;
};

type AddPlaceCandidate = {
  contentId: number;
  contentTitle: string;
  relationType: string;
  verificationStatus: string;
  verifiedFact: string | null;
  place: Place;
};

type WalkingRoutePoint = {
  latitude: number;
  longitude: number;
};

type WalkingRouteSegment = {
  fromPlaceId: number;
  toPlaceId: number;
  distanceMeters: number;
  durationSeconds: number;
  path: WalkingRoutePoint[];
  isFallback: boolean;
};

type WalkingRouteApiSegment = {
  fromPlaceId: number;
  toPlaceId: number;
  distanceMeters: number | null;
  durationSeconds: number | null;
  path: WalkingRoutePoint[];
  success: boolean;
};

type WalkingRouteApiResponse = {
  data?: {
    segments: WalkingRouteApiSegment[];
  };
  message?: string;
};

type WalkingRouteStatus =
  | "idle"
  | "loading"
  | "real"
  | "partial"
  | "fallback";

const COURSE_STORAGE_PREFIX = "faveway:course";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isIntegerArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === "number" && Number.isInteger(item),
    )
  );
}

function isValidCourseStop(value: unknown): value is CourseStop {
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
    !(
      stop.verifiedFact === null ||
      typeof stop.verifiedFact === "string"
    ) ||
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

function isValidCourseData(value: unknown): value is CourseData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const course = value as Partial<CourseData>;

  return (
    isIntegerArray(course.contentIds) &&
    isIntegerArray(course.actorIds) &&
    isFiniteNumber(course.durationMinutes) &&
    course.durationMinutes > 0 &&
    (course.maxWalkingMinutes === null ||
      (isFiniteNumber(course.maxWalkingMinutes) &&
        course.maxWalkingMinutes > 0)) &&
    isFiniteNumber(course.totalDistanceKm) &&
    course.totalDistanceKm >= 0 &&
    isFiniteNumber(course.totalWalkingMinutes) &&
    course.totalWalkingMinutes >= 0 &&
    Array.isArray(course.stops) &&
    course.stops.length > 0 &&
    course.stops.every(isValidCourseStop)
  );
}

function createCourseStorageKey(course: CourseData) {
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

function rebuildCourse(course: CourseData, stops: CourseStop[]): CourseData {
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

function validateCourse(course: CourseData): CourseValidation {
  const walkingViolations: WalkingViolation[] = [];

  if (course.maxWalkingMinutes !== null) {
    course.stops.forEach((stop, index) => {
      if (index === 0) {
        return;
      }

      if (stop.walkingMinutesFromPrevious <= course.maxWalkingMinutes!) {
        return;
      }

      const previousStop = course.stops[index - 1];

      walkingViolations.push({
        fromOrder: previousStop.order,
        toOrder: stop.order,
        fromPlaceName: previousStop.place.name,
        toPlaceName: stop.place.name,
        walkingMinutes: stop.walkingMinutesFromPrevious,
        maxWalkingMinutes: course.maxWalkingMinutes!,
      });
    });
  }

  const exceedsDuration = course.totalWalkingMinutes > course.durationMinutes;

  const durationOverMinutes = exceedsDuration
    ? course.totalWalkingMinutes - course.durationMinutes
    : 0;

  return {
    isValid: walkingViolations.length === 0 && !exceedsDuration,
    walkingViolations,
    exceedsDuration,
    durationOverMinutes,
  };
}

function CourseContent() {
  const searchParams = useSearchParams();

  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);

  const [isAddPlaceOpen, setIsAddPlaceOpen] = useState(false);
  const [addPlaceCandidates, setAddPlaceCandidates] = useState<
    AddPlaceCandidate[] | null
  >(null);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  const [walkingRouteSegments, setWalkingRouteSegments] = useState<
    WalkingRouteSegment[]
  >([]);
  const [walkingRouteStatus, setWalkingRouteStatus] =
    useState<WalkingRouteStatus>("idle");

  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const stopRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const rawData = searchParams.get("data");
  const title = searchParams.get("title");

  const initialCourseResult = useMemo(() => {
    if (!rawData) {
      return {
        status: "missing" as const,
        course: null,
      };
    }

    try {
      const parsed = JSON.parse(decodeURIComponent(rawData)) as unknown;

      if (!isValidCourseData(parsed)) {
        return {
          status: "invalid" as const,
          course: null,
        };
      }

      return {
        status: "ready" as const,
        course: parsed,
      };
    } catch {
      return {
        status: "invalid" as const,
        course: null,
      };
    }
  }, [rawData]);

  const initialCourse = initialCourseResult.course;

  const storageKey = useMemo(() => {
    if (!initialCourse) {
      return null;
    }

    return createCourseStorageKey(initialCourse);
  }, [initialCourse]);

  const [course, setCourse] = useState<CourseData | null>(initialCourse);

  const walkingRouteKey = useMemo(() => {
    if (!course) {
      return "";
    }

    return JSON.stringify(
      course.stops.map((stop) => ({
        placeId: stop.placeId,
        name: stop.place.name,
        latitude: stop.place.latitude,
        longitude: stop.place.longitude,
      })),
    );
  }, [course]);

  useEffect(() => {
    if (!initialCourse || !storageKey) {
      return;
    }

    const restoreTimer = window.setTimeout(() => {
      try {
        const storedCourse = window.localStorage.getItem(storageKey);

        if (!storedCourse) {
          return;
        }

        const parsedCourse = JSON.parse(storedCourse) as Partial<CourseData>;

        if (
          !Array.isArray(parsedCourse.stops) ||
          parsedCourse.stops.length === 0 ||
          !parsedCourse.stops.every(isValidCourseStop)
        ) {
          try {
            window.localStorage.removeItem(storageKey);
          } catch {
            // 저장소 접근 실패는 warning으로만 안내한다.
          }

          setStorageWarning(
            "저장된 수정 내용을 복원하지 못해 처음 생성된 코스를 사용하고 있어요.",
          );

          return;
        }

        setCourse(
          rebuildCourse(initialCourse, parsedCourse.stops as CourseStop[]),
        );
        setStorageWarning(null);
      } catch {
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          // 저장소 자체에 접근하지 못해도 Course 사용은 유지한다.
        }

        setStorageWarning(
          "저장된 수정 내용을 복원하지 못해 처음 생성된 코스를 사용하고 있어요.",
        );
      }
    }, 0);

    return () => {
      window.clearTimeout(restoreTimer);
    };
  }, [initialCourse, storageKey]);

  useEffect(() => {
    if (!walkingRouteKey) {
      return;
    }

    const routeStops = JSON.parse(walkingRouteKey) as Array<{
      placeId: number;
      name: string;
      latitude: number | null;
      longitude: number | null;
    }>;

    const controller = new AbortController();

    const statusTimer = window.setTimeout(() => {
      setWalkingRouteSegments([]);
      setWalkingRouteStatus(routeStops.length >= 2 ? "loading" : "idle");
    }, 0);

    if (routeStops.length < 2) {
      return () => {
        window.clearTimeout(statusTimer);
        controller.abort();
      };
    }

    const createFallbackSegment = (
      previousStop: (typeof routeStops)[number],
      currentStop: (typeof routeStops)[number],
    ): WalkingRouteSegment => {
      const hasValidCoordinates =
        previousStop.latitude != null &&
        previousStop.longitude != null &&
        currentStop.latitude != null &&
        currentStop.longitude != null &&
        Number.isFinite(previousStop.latitude) &&
        Number.isFinite(previousStop.longitude) &&
        Number.isFinite(currentStop.latitude) &&
        Number.isFinite(currentStop.longitude);

      if (!hasValidCoordinates) {
        return {
          fromPlaceId: previousStop.placeId,
          toPlaceId: currentStop.placeId,
          distanceMeters: 0,
          durationSeconds: 0,
          path: [],
          isFallback: true,
        };
      }

      const distanceKm = calculateDistanceKm(
        {
          latitude: previousStop.latitude!,
          longitude: previousStop.longitude!,
        },
        {
          latitude: currentStop.latitude!,
          longitude: currentStop.longitude!,
        },
      );

      return {
        fromPlaceId: previousStop.placeId,
        toPlaceId: currentStop.placeId,
        distanceMeters: Math.round(distanceKm * 1000),
        durationSeconds: estimateWalkingMinutes(distanceKm) * 60,
        path: [
          {
            latitude: previousStop.latitude!,
            longitude: previousStop.longitude!,
          },
          {
            latitude: currentStop.latitude!,
            longitude: currentStop.longitude!,
          },
        ],
        isFallback: true,
      };
    };

    void fetch("/api/routes/walking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stops: routeStops.map((stop) => ({
          placeId: stop.placeId,
          name: stop.name,
          latitude: stop.latitude,
          longitude: stop.longitude,
        })),
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as WalkingRouteApiResponse;

        if (!response.ok || !body.data?.segments) {
          throw new Error(
            body.message ?? "실제 도보 경로를 불러오지 못했습니다.",
          );
        }

        return body.data.segments;
      })
      .then((apiSegments) => {
        if (controller.signal.aborted) {
          return;
        }

        const segments = routeStops.slice(1).map((currentStop, index) => {
          const previousStop = routeStops[index];

          const apiSegment = apiSegments.find(
            (segment) =>
              segment.fromPlaceId === previousStop.placeId &&
              segment.toPlaceId === currentStop.placeId,
          );

          if (
            apiSegment?.success &&
            apiSegment.distanceMeters != null &&
            apiSegment.durationSeconds != null &&
            Number.isFinite(apiSegment.distanceMeters) &&
            Number.isFinite(apiSegment.durationSeconds) &&
            Array.isArray(apiSegment.path) &&
            apiSegment.path.length >= 2
          ) {
            return {
              fromPlaceId: previousStop.placeId,
              toPlaceId: currentStop.placeId,
              distanceMeters: apiSegment.distanceMeters,
              durationSeconds: apiSegment.durationSeconds,
              path: apiSegment.path,
              isFallback: false,
            } satisfies WalkingRouteSegment;
          }

          return createFallbackSegment(previousStop, currentStop);
        });

        setWalkingRouteSegments(segments);

        const fallbackCount = segments.filter(
          (segment) => segment.isFallback,
        ).length;

        if (fallbackCount === 0) {
          setWalkingRouteStatus("real");
        } else if (fallbackCount === segments.length) {
          setWalkingRouteStatus("fallback");
        } else {
          setWalkingRouteStatus("partial");
        }

        setCourse((currentCourse) => {
          if (!currentCourse) {
            return currentCourse;
          }

          const currentRouteKey = JSON.stringify(
            currentCourse.stops.map((stop) => ({
              placeId: stop.placeId,
              name: stop.place.name,
              latitude: stop.place.latitude,
              longitude: stop.place.longitude,
            })),
          );

          if (currentRouteKey !== walkingRouteKey) {
            return currentCourse;
          }

          const recalculatedStops = currentCourse.stops.map((stop, index) => {
            if (index === 0) {
              return {
                ...stop,
                order: 1,
                distanceFromPreviousKm: 0,
                walkingMinutesFromPrevious: 0,
              };
            }

            const segment = segments[index - 1];

            return {
              ...stop,
              order: index + 1,
              distanceFromPreviousKm: Number(
                (segment.distanceMeters / 1000).toFixed(2),
              ),
              walkingMinutesFromPrevious: Math.ceil(
                segment.durationSeconds / 60,
              ),
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
            currentCourse.durationMinutes - totalWalkingMinutes,
            0,
          );

          const stayMinutes =
            recalculatedStops.length > 0
              ? Math.floor(availableStayMinutes / recalculatedStops.length)
              : 0;

          return {
            ...currentCourse,
            totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
            totalWalkingMinutes,
            stops: recalculatedStops.map((stop) => ({
              ...stop,
              stayMinutes,
            })),
          };
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        const fallbackSegments = routeStops
          .slice(1)
          .map((currentStop, index) =>
            createFallbackSegment(routeStops[index], currentStop),
          );

        setWalkingRouteSegments(fallbackSegments);
        setWalkingRouteStatus("fallback");

        setCourse((currentCourse) => {
          if (!currentCourse) {
            return currentCourse;
          }

          const currentRouteKey = JSON.stringify(
            currentCourse.stops.map((stop) => ({
              placeId: stop.placeId,
              name: stop.place.name,
              latitude: stop.place.latitude,
              longitude: stop.place.longitude,
            })),
          );

          if (currentRouteKey !== walkingRouteKey) {
            return currentCourse;
          }

          const recalculatedStops = currentCourse.stops.map((stop, index) => {
            if (index === 0) {
              return {
                ...stop,
                order: 1,
                distanceFromPreviousKm: 0,
                walkingMinutesFromPrevious: 0,
              };
            }

            const segment = fallbackSegments[index - 1];

            return {
              ...stop,
              order: index + 1,
              distanceFromPreviousKm: Number(
                (segment.distanceMeters / 1000).toFixed(2),
              ),
              walkingMinutesFromPrevious: Math.ceil(
                segment.durationSeconds / 60,
              ),
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
            currentCourse.durationMinutes - totalWalkingMinutes,
            0,
          );

          const stayMinutes =
            recalculatedStops.length > 0
              ? Math.floor(availableStayMinutes / recalculatedStops.length)
              : 0;

          return {
            ...currentCourse,
            totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
            totalWalkingMinutes,
            stops: recalculatedStops.map((stop) => ({
              ...stop,
              stayMinutes,
            })),
          };
        });
      });

    return () => {
      window.clearTimeout(statusTimer);
      controller.abort();
    };
  }, [walkingRouteKey]);

  const mapStops = useMemo(() => {
    if (!course) {
      return [];
    }

    return course.stops.flatMap((stop) => {
      const { latitude, longitude } = stop.place;

      if (
        latitude == null ||
        longitude == null ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return [];
      }

      return [
        {
          placeId: stop.placeId,
          order: stop.order,
          name: stop.place.name,
          latitude,
          longitude,
        },
      ];
    });
  }, [course]);

  const validation = useMemo(() => {
    if (!course) {
      return null;
    }

    return validateCourse(course);
  }, [course]);

  function persistCourse(nextCourse: CourseData) {
    if (!storageKey) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextCourse));
      setStorageWarning(null);
    } catch {
      setStorageWarning(
        "변경 내용을 브라우저에 저장하지 못했어요. 현재 화면에서는 계속 사용할 수 있지만 새로고침하면 수정 내용이 사라질 수 있어요.",
      );
    }
  }

  function selectCourseStop(placeId: number) {
    setSelectedPlaceId(placeId);

    window.setTimeout(() => {
      stopRefs.current[placeId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  }

  function removeCourseStop(placeId: number) {
    if (!course) {
      return;
    }

    if (course.stops.length <= 1) {
      window.alert("코스에는 최소 한 개의 장소가 필요합니다.");
      return;
    }

    const target = course.stops.find((stop) => stop.placeId === placeId);

    if (!target) {
      return;
    }

    const confirmed = window.confirm(
      `${target.place.name}을(를) 코스에서 삭제할까요?`,
    );

    if (!confirmed) {
      return;
    }

    const nextStops = course.stops.filter((stop) => stop.placeId !== placeId);
    const nextCourse = rebuildCourse(course, nextStops);

    persistCourse(nextCourse);
    setCourse(nextCourse);

    if (selectedPlaceId === placeId) {
      setSelectedPlaceId(null);
    }

    if (detailTarget?.place.id === placeId) {
      setDetailTarget(null);
    }
  }

  function moveCourseStop(placeId: number, direction: "UP" | "DOWN") {
    if (!course) {
      return;
    }

    const currentIndex = course.stops.findIndex(
      (stop) => stop.placeId === placeId,
    );

    if (currentIndex === -1) {
      return;
    }

    const targetIndex =
      direction === "UP" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= course.stops.length) {
      return;
    }

    const nextStops = [...course.stops];

    [nextStops[currentIndex], nextStops[targetIndex]] = [
      nextStops[targetIndex],
      nextStops[currentIndex],
    ];

    const nextCourse = rebuildCourse(course, nextStops);

    persistCourse(nextCourse);
    setCourse(nextCourse);
    setSelectedPlaceId(placeId);

    window.setTimeout(() => {
      stopRefs.current[placeId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  }

  function resetCourseChanges() {
    if (!initialCourse || !storageKey) {
      return;
    }

    const confirmed = window.confirm(
      "추가·삭제·순서 변경 내용을 모두 지우고 처음 생성된 코스로 돌아갈까요?",
    );

    if (!confirmed) {
      return;
    }

    try {
      window.localStorage.removeItem(storageKey);
      setStorageWarning(null);
    } catch {
      setStorageWarning(
        "브라우저에 저장된 수정 내용을 삭제하지 못했어요. 현재 화면은 초기 코스로 되돌렸지만 새로고침하면 저장된 내용이 다시 나타날 수 있어요.",
      );
    }

    setCourse(initialCourse);
    setSelectedPlaceId(null);
    setDetailTarget(null);
    setIsAddPlaceOpen(false);
    setAddPlaceCandidates(null);
    setCandidateError(null);
  }

  async function loadAddPlaceCandidates() {
    if (!course) {
      return;
    }

    setIsAddPlaceOpen(true);

    if (addPlaceCandidates !== null || isLoadingCandidates) {
      return;
    }

    setIsLoadingCandidates(true);
    setCandidateError(null);

    try {
      const contentsResponse = await fetch("/api/contents");

      if (!contentsResponse.ok) {
        throw new Error("작품 정보를 불러오지 못했습니다.");
      }

      const contentsBody = (await contentsResponse.json()) as {
        data?: ContentSummary[];
        message?: string;
      };

      const titleMap = new Map(
        (contentsBody.data ?? []).map((content) => [content.id, content.title]),
      );

      const actorQuery =
        course.actorIds.length > 0
          ? `?actorIds=${course.actorIds.join(",")}`
          : "";

      const responses = await Promise.all(
        course.contentIds.map(async (contentId) => {
          const response = await fetch(
            `/api/contents/${contentId}/places${actorQuery}`,
          );

          const body = (await response.json()) as {
            data?: CandidateRelation[];
            message?: string;
          };

          if (!response.ok) {
            throw new Error(
              body.message ?? "추가 가능한 촬영지를 불러오지 못했습니다.",
            );
          }

          return (body.data ?? []).map(
            (relation): AddPlaceCandidate => ({
              contentId,
              contentTitle: titleMap.get(contentId) ?? "작품 정보 없음",
              relationType: relation.relation_type,
              verificationStatus: relation.verification_status,
              verifiedFact: relation.verified_fact,
              place: relation.places,
            }),
          );
        }),
      );

      const currentPlaceIds = new Set(course.stops.map((stop) => stop.placeId));
      const uniqueCandidates = new Map<number, AddPlaceCandidate>();

      responses.flat().forEach((candidate) => {
        const { latitude, longitude } = candidate.place;

        if (
          currentPlaceIds.has(candidate.place.id) ||
          candidate.place.is_active === false ||
          latitude == null ||
          longitude == null ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          uniqueCandidates.has(candidate.place.id)
        ) {
          return;
        }

        uniqueCandidates.set(candidate.place.id, candidate);
      });

      setAddPlaceCandidates(
        Array.from(uniqueCandidates.values()).sort((a, b) =>
          a.place.name.localeCompare(b.place.name, "ko"),
        ),
      );
    } catch (error) {
      setCandidateError(
        error instanceof Error
          ? error.message
          : "추가 가능한 촬영지를 불러오지 못했습니다.",
      );
    } finally {
      setIsLoadingCandidates(false);
    }
  }

  function addCourseStop(candidate: AddPlaceCandidate) {
    if (!course) {
      return;
    }

    if (course.stops.some((stop) => stop.placeId === candidate.place.id)) {
      window.alert("이미 코스에 포함된 장소입니다.");
      return;
    }

    const newStop: CourseStop = {
      contentId: candidate.contentId,
      contentTitle: candidate.contentTitle,
      placeId: candidate.place.id,
      order: course.stops.length + 1,
      stayMinutes: 0,
      distanceFromPreviousKm: 0,
      walkingMinutesFromPrevious: 0,
      relationType: candidate.relationType,
      verificationStatus: candidate.verificationStatus,
      verifiedFact: candidate.verifiedFact,
      place: candidate.place,
    };

    const nextCourse = rebuildCourse(course, [...course.stops, newStop]);

    persistCourse(nextCourse);
    setCourse(nextCourse);
    setSelectedPlaceId(candidate.place.id);

    setAddPlaceCandidates(
      (current) =>
        current?.filter((item) => item.place.id !== candidate.place.id) ?? null,
    );

    window.setTimeout(() => {
      stopRefs.current[candidate.place.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  }

  if (initialCourseResult.status === "missing") {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <BackButton className={styles.back} />

          <StateFeedback
            title="코스 정보가 없어요."
            description="이전 화면에서 작품과 여행 조건을 선택해 코스를 만들어 주세요."
          />
        </div>
      </main>
    );
  }

  if (initialCourseResult.status === "invalid") {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <BackButton className={styles.back} />

          <StateFeedback
            tone="error"
            title="코스 정보를 확인할 수 없어요."
            description="전달된 코스 정보가 올바르지 않습니다. 이전 화면에서 코스를 다시 만들어 주세요."
          />
        </div>
      </main>
    );
  }

  if (!course || !validation) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <BackButton className={styles.back} />

          <StateFeedback
            tone="error"
            title="코스를 불러오지 못했어요."
            description="이전 화면에서 코스를 다시 만들어 주세요."
          />
        </div>
      </main>
    );
  }

  const totalStayMinutes = course.stops.reduce(
    (sum, stop) => sum + stop.stayMinutes,
    0,
  );

  const totalMinutes = course.totalWalkingMinutes + totalStayMinutes;

  const routeStatusText =
    walkingRouteStatus === "idle"
      ? "장소가 2곳 이상이면 도보 경로를 안내해요."
      : walkingRouteStatus === "loading"
        ? "실제 도보 경로를 확인하고 있어요. 현재 수치는 임시 예상치예요."
        : walkingRouteStatus === "real"
          ? "실제 도보 경로 기준 · 소요 시간은 예상치예요."
          : null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav} aria-label="코스 탐색">
          <BackButton className={styles.back} />

          <span className={styles.wordmark}>
            FAVEWAY<span aria-hidden="true">.</span>
          </span>
        </nav>

        <header className={styles.header}>
          <p className={styles.eyebrow}>MY FAVORITE WAY</p>
          <h1>{title || "나의 여행 코스"}</h1>
          <p className={styles.intro}>
            좋아하는 장면을 따라, 촬영지 {course.stops.length}곳을 걸어요.
          </p>
        </header>

        <section className={styles.summary} aria-label="코스 요약">
          <div className={styles.summaryTop}>
            <div>
              <p className={styles.caption}>이동과 체류를 포함한 예상 시간</p>

              <p className={styles.total}>
                <strong>{totalMinutes}</strong>
                <span>분</span>
              </p>
            </div>

            <span className={styles.locationCount}>
              촬영지 {course.stops.length}곳
            </span>
          </div>

          <dl className={styles.metrics}>
            <div>
              <dt>도보 시간</dt>
              <dd>
                {course.totalWalkingMinutes}
                <span>분</span>
              </dd>
            </div>

            <div>
              <dt>이동 거리</dt>
              <dd>
                {course.totalDistanceKm}
                <span>km</span>
              </dd>
            </div>

            <div>
              <dt>체류 시간</dt>
              <dd>
                {totalStayMinutes}
                <span>분</span>
              </dd>
            </div>
          </dl>

          <div className={styles.conditions}>
            <span>여행 가능 {course.durationMinutes}분</span>

            <span>
              한 구간 도보{" "}
              {course.maxWalkingMinutes === null
                ? "제한 없음"
                : `${course.maxWalkingMinutes}분 이내`}
            </span>
          </div>
        </section>

        {storageWarning && (
          <InlineWarning
            title="코스 저장 상태를 확인해 주세요."
            description={storageWarning}
          />
        )}

        {routeStatusText && (
          <p className={styles.routeStatus} role="status">
            <span className={styles.statusDot} aria-hidden="true" />
            {routeStatusText}
          </p>
        )}

        {walkingRouteStatus === "partial" && (
          <InlineWarning
            title="일부 구간은 예상 경로를 사용하고 있어요."
            description="실제 도보 경로를 불러오지 못한 구간만 직선거리 기반 예상치로 계산했어요. 코스는 계속 이용할 수 있습니다."
          />
        )}

        {walkingRouteStatus === "fallback" && (
          <InlineWarning
            title="현재 예상 경로를 사용하고 있어요."
            description="실제 도보 경로를 불러오지 못해 직선거리 기반 예상치로 안내하고 있어요. 실제 거리와 시간은 다를 수 있습니다."
          />
        )}

        {!validation.isValid && (
          <section className={styles.warning} aria-label="여행 조건 초과 안내">
            <h2>여행 조건을 조금 벗어났어요</h2>
            <p>방문 순서를 바꾸거나 장소를 줄여보세요.</p>

            {validation.walkingViolations.map((violation) => (
              <div
                key={`${violation.fromOrder}-${violation.toOrder}-${violation.toPlaceName}`}
                className={styles.warningDetail}
              >
                <strong>
                  {violation.fromOrder} → {violation.toOrder} ·{" "}
                  {violation.fromPlaceName} → {violation.toPlaceName}
                </strong>

                <p>
                  예상 도보 {violation.walkingMinutes}분 · 구간 제한{" "}
                  {violation.maxWalkingMinutes}분보다{" "}
                  {violation.walkingMinutes - violation.maxWalkingMinutes}분
                  길어요.
                </p>
              </div>
            ))}

            {validation.exceedsDuration && (
              <div className={styles.warningDetail}>
                <strong>
                  여행 가능 시간 {validation.durationOverMinutes}분 초과
                </strong>

                <p>
                  이동에만 약 {course.totalWalkingMinutes}분이 필요해요. 여행
                  가능 시간은 {course.durationMinutes}분이에요.
                </p>
              </div>
            )}
          </section>
        )}

        <section
          className={styles.mapSection}
          aria-labelledby="course-map-title"
        >
          <div className={styles.sectionHeading}>
            <h2 id="course-map-title">한눈에 보는 코스</h2>
            <span className={styles.caption}>번호는 방문 순서예요</span>
          </div>

          {mapStops.length > 0 ? (
            <>
              <CourseMap
                stops={mapStops}
                routeSegments={walkingRouteSegments}
                selectedPlaceId={selectedPlaceId}
                onSelectPlace={selectCourseStop}
              />

              <div className={styles.mapLegend}>
                <span>
                  <i aria-hidden="true" />
                  도보 경로
                </span>

                <span>
                  <i className={styles.estimatedLine} aria-hidden="true" />
                  직선거리 예상 구간
                </span>
              </div>

              <div className={styles.stopChips} aria-label="방문 장소 바로가기">
                {course.stops.map((stop) => (
                  <button
                    key={`${stop.contentId}-${stop.placeId}`}
                    type="button"
                    className={styles.stopChip}
                    aria-pressed={selectedPlaceId === stop.placeId}
                    onClick={() => selectCourseStop(stop.placeId)}
                  >
                    <span className={styles.chipNumber}>{stop.order}</span>
                    <span className={styles.chipName}>{stop.place.name}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <StateFeedback
              title="지도에 표시할 촬영지 좌표가 없어요."
              description="아래 방문 목록에서 장소 정보를 계속 확인할 수 있습니다."
            />
          )}
        </section>

        <section
          className={styles.stopsSection}
          aria-labelledby="course-stops-title"
        >
          <div className={styles.sectionHeading}>
            <h2 id="course-stops-title">이 순서로 만나보세요</h2>

            <span className={styles.caption}>
              {course.stops.length}곳의 장면
            </span>
          </div>

          <p className={styles.sectionDescription}>
            장소를 눌러 장면을 살펴보고, 나만의 순서로 바꿔보세요.
          </p>

          {course.stops.map((stop, index) => {
            const nextStop = course.stops[index + 1];

            const selected = selectedPlaceId === stop.placeId;
            const isFirst = index === 0;
            const isLast = index === course.stops.length - 1;

            const nextStopExceedsWalkingLimit =
              nextStop != null &&
              course.maxWalkingMinutes !== null &&
              nextStop.walkingMinutesFromPrevious > course.maxWalkingMinutes;

            const nextSegment = nextStop
              ? walkingRouteSegments.find(
                  (segment) =>
                    segment.fromPlaceId === stop.placeId &&
                    segment.toPlaceId === nextStop.placeId,
                )
              : undefined;

            return (
              <div
                key={`${stop.contentId}-${stop.placeId}`}
                ref={(element) => {
                  stopRefs.current[stop.placeId] = element;
                }}
                className={styles.stopAnchor}
              >
                <article className={styles.stopCard} data-selected={selected}>
                  <button
                    type="button"
                    className={styles.stopDetails}
                    aria-label={`${stop.order}. ${stop.place.name} 상세 보기`}
                    aria-haspopup="dialog"
                    onClick={() => {
                      setSelectedPlaceId(stop.placeId);

                      setDetailTarget({
                        contentId: stop.contentId,
                        place: stop.place,
                      });
                    }}
                  >
                    <div className={styles.stopTop}>
                      <span className={styles.stopNumber}>{stop.order}</span>

                      <div className={styles.stopTitle}>
                        <span className={styles.contentBadge}>
                          {stop.contentTitle}
                        </span>

                        <h3>{stop.place.name}</h3>
                      </div>

                      <span className={styles.stay}>
                        체류<strong>{stop.stayMinutes}분</strong>
                      </span>
                    </div>

                    {stop.place.address && (
                      <p className={styles.address}>{stop.place.address}</p>
                    )}

                    {(stop.place.latitude == null ||
                      stop.place.longitude == null ||
                      !Number.isFinite(stop.place.latitude) ||
                      !Number.isFinite(stop.place.longitude)) && (
                      <p className={styles.caption}>지도 위치 미등록</p>
                    )}

                    {stop.verifiedFact && (
                      <div className={styles.scene}>
                        <span>이 장소의 이야기</span>
                        <p>{stop.verifiedFact}</p>
                      </div>
                    )}

                    <span className={styles.detailLink}>
                      장면과 장소 살펴보기 <span aria-hidden="true">↗</span>
                    </span>
                  </button>

                  <div className={styles.editControls}>
                    <div>
                      <button
                        type="button"
                        onClick={() => moveCourseStop(stop.placeId, "UP")}
                        disabled={isFirst}
                        aria-label={`${stop.place.name}을 이전 순서로 이동`}
                      >
                        ↑ 위로
                      </button>

                      <button
                        type="button"
                        onClick={() => moveCourseStop(stop.placeId, "DOWN")}
                        disabled={isLast}
                        aria-label={`${stop.place.name}을 다음 순서로 이동`}
                      >
                        ↓ 아래로
                      </button>
                    </div>

                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => removeCourseStop(stop.placeId)}
                      disabled={course.stops.length <= 1}
                      aria-label={`${stop.place.name} 코스에서 삭제`}
                    >
                      삭제
                    </button>
                  </div>
                </article>

                {nextStop && (
                  <div
                    className={styles.connector}
                    data-warning={nextStopExceedsWalkingLimit}
                  >
                    <p>
                      {stop.order} → {nextStop.order}{" "}
                      <span>다음 장면까지</span>
                    </p>

                    <strong>
                      도보 약 {nextStop.walkingMinutesFromPrevious}분{" "}
                      <span>· {nextStop.distanceFromPreviousKm}km</span>
                    </strong>

                    <p className={styles.caption}>
                      {walkingRouteStatus === "loading"
                        ? "경로 확인 중 · 임시 예상치"
                        : nextSegment && !nextSegment.isFallback
                          ? "실제 도보 경로 기준"
                          : "직선거리 기반 예상치"}
                    </p>

                    {nextStopExceedsWalkingLimit && (
                      <p className={styles.segmentWarning}>
                        한 구간 최대 도보 {course.maxWalkingMinutes}분을
                        초과해요.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <section
          className={styles.addSection}
          aria-labelledby="add-place-title"
        >
          <div className={styles.sectionHeading}>
            <h2 id="add-place-title">다음 장면을 더해볼까요?</h2>
          </div>

          <p className={styles.sectionDescription}>
            선택한 작품과 배우에 연결된 촬영지를 코스 마지막에 추가해요.
          </p>

          <button
            type="button"
            className={styles.primaryButton}
            aria-expanded={isAddPlaceOpen}
            aria-controls="course-place-candidates"
            onClick={() => {
              if (isAddPlaceOpen) {
                setIsAddPlaceOpen(false);
                return;
              }

              void loadAddPlaceCandidates();
            }}
          >
            {isAddPlaceOpen ? "추가 목록 닫기" : "+ 촬영지 추가하기"}
          </button>

          {isAddPlaceOpen && (
            <div
              id="course-place-candidates"
              className={styles.candidates}
              aria-busy={isLoadingCandidates}
            >
              {isLoadingCandidates && (
                <StateFeedback
                  title="추가 가능한 촬영지를 찾고 있어요."
                  description="선택한 작품과 배우에 연결된 장소를 확인하고 있습니다."
                />
              )}

              {candidateError && (
                <StateFeedback
                  tone="error"
                  title="촬영지를 불러오지 못했어요."
                  description={candidateError}
                  actionLabel="다시 시도"
                  onAction={() => {
                    setAddPlaceCandidates(null);
                    void loadAddPlaceCandidates();
                  }}
                />
              )}

              {!isLoadingCandidates &&
                !candidateError &&
                addPlaceCandidates?.length === 0 && (
                  <StateFeedback
                    title="더 추가할 수 있는 촬영지가 없어요."
                    description="현재 선택한 작품과 배우 조건에서 추가 가능한 다른 촬영지를 찾지 못했습니다."
                  />
                )}

              {!isLoadingCandidates &&
                !candidateError &&
                addPlaceCandidates &&
                addPlaceCandidates.length > 0 &&
                addPlaceCandidates.map((candidate) => (
                  <div key={candidate.place.id} className={styles.candidate}>
                    <div>
                      <span className={styles.contentBadge}>
                        {candidate.contentTitle}
                      </span>

                      <h3>{candidate.place.name}</h3>

                      {candidate.place.address && (
                        <p className={styles.address}>
                          {candidate.place.address}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => addCourseStop(candidate)}
                      aria-label={`${candidate.place.name} 코스에 추가`}
                    >
                      + 추가
                    </button>
                  </div>
                ))}
            </div>
          )}
        </section>

        <footer className={styles.footer}>
          <p>수정한 코스는 이 브라우저에 자동 저장돼요.</p>

          <button type="button" onClick={resetCourseChanges}>
            수정 내용 초기화
          </button>

          <p className={styles.footnote}>
            체류 시간은 여행 가능 시간에서 도보 시간을 제외한 뒤 장소마다 나눈
            예상치예요. 실제 체류 시간은 자유롭게 조절해 주세요.
          </p>
        </footer>
      </div>

      {detailTarget && (
        <PlaceDetailDialog
          key={`${detailTarget.contentId}-${detailTarget.place.id}`}
          contentId={detailTarget.contentId}
          placeId={detailTarget.place.id}
          placeName={detailTarget.place.name}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </main>
  );
}

export default function CoursePage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <div className={styles.shell}>
            <StateFeedback
              title="나만의 코스를 불러오고 있어요."
              description="선택한 촬영지와 여행 조건을 확인하고 있습니다."
            />
          </div>
        </main>
      }
    >
      <CourseContent />
    </Suspense>
  );
}