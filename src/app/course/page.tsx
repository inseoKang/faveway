"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import BackButton from "@/components/common/BackButton";
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

type WalkingRouteStatus = "idle" | "loading" | "real" | "partial" | "fallback";

const COURSE_STORAGE_PREFIX = "faveway:course";

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

  const stopRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const rawData = searchParams.get("data");
  const title = searchParams.get("title");

  const initialCourse = useMemo(() => {
    if (!rawData) {
      return null;
    }

    try {
      return JSON.parse(decodeURIComponent(rawData)) as CourseData;
    } catch {
      return null;
    }
  }, [rawData]);

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
          parsedCourse.stops.length === 0
        ) {
          window.localStorage.removeItem(storageKey);
          return;
        }

        setCourse(
          rebuildCourse(initialCourse, parsedCourse.stops as CourseStop[]),
        );
      } catch {
        window.localStorage.removeItem(storageKey);
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

    window.localStorage.setItem(storageKey, JSON.stringify(nextCourse));
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

    window.localStorage.removeItem(storageKey);
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

  if (!rawData) {
    return (
      <main className="mx-auto min-h-screen max-w-md p-6">
        <p className="text-sm text-red-600">코스 정보가 없습니다.</p>
      </main>
    );
  }

  if (!course || !validation) {
    return (
      <main className="mx-auto min-h-screen max-w-md p-6">
        <p className="text-sm text-red-600">코스 정보를 불러오지 못했습니다.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md p-6">
      <header className="mb-8">
        <BackButton className="mb-5" />

        <p className="text-sm font-medium text-gray-500">FAVEWAY COURSE</p>

        <h1 className="mt-2 text-2xl font-bold">{title || "나의 여행 코스"}</h1>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          촬영지 {course.stops.length}곳으로 구성된 코스입니다.
        </p>

        <div className="mt-5 space-y-3 rounded-2xl bg-gray-50 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">여행 가능 시간</span>

            <span className="font-medium">
              {course.durationMinutes / 60}시간
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">한 구간 최대 도보</span>

            <span className="font-medium">
              {course.maxWalkingMinutes === null
                ? "제한 없음"
                : `${course.maxWalkingMinutes}분`}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">예상 총 이동 거리</span>

            <span className="font-medium">약 {course.totalDistanceKm}km</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">예상 총 도보 시간</span>

            <span className="font-medium">
              약 {course.totalWalkingMinutes}분
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs leading-5 text-gray-400">
            코스 수정 내용은 이 브라우저에 자동 저장됩니다.
          </p>

          <button
            type="button"
            onClick={resetCourseChanges}
            className="shrink-0 text-xs font-semibold text-gray-500 underline underline-offset-4 transition hover:text-black"
          >
            수정 내용 초기화
          </button>
        </div>
      </header>

      {!validation.isValid && (
        <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700"
            >
              !
            </span>

            <div>
              <h2 className="font-bold text-amber-900">
                현재 코스가 선택한 여행 조건을 벗어났어요.
              </h2>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                방문 순서를 다시 조정하거나 장소를 삭제해 조건에 맞는 코스로
                변경해 주세요.
              </p>
            </div>
          </div>

          {validation.walkingViolations.length > 0 && (
            <div className="mt-5 space-y-3">
              {validation.walkingViolations.map((violation) => (
                <div
                  key={`${violation.fromOrder}-${violation.toOrder}-${violation.toPlaceName}`}
                  className="rounded-xl bg-white/70 p-4"
                >
                  <p className="text-xs font-semibold text-amber-700">
                    {violation.fromOrder} → {violation.toOrder} 구간
                  </p>

                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {violation.fromPlaceName} → {violation.toPlaceName}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    예상 도보 {violation.walkingMinutes}분 · 설정한 최대 도보{" "}
                    {violation.maxWalkingMinutes}분
                  </p>
                </div>
              ))}
            </div>
          )}

          {validation.exceedsDuration && (
            <div className="mt-3 rounded-xl bg-white/70 p-4">
              <p className="text-xs font-semibold text-amber-700">
                여행 가능 시간 초과
              </p>

              <p className="mt-1 text-sm text-gray-700">
                이동에만 약 {course.totalWalkingMinutes}분이 필요해 여행 가능
                시간 {course.durationMinutes}분을{" "}
                {validation.durationOverMinutes}분 초과합니다.
              </p>
            </div>
          )}
        </section>
      )}

      <section className="mb-10">
        <div className="mb-4">
          <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">
            YOUR FAVEWAY ROUTE
          </p>

          <h2 className="mt-2 text-xl font-bold">지도에서 보는 나의 코스</h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            숫자는 실제 방문 순서를 나타냅니다.
          </p>
        </div>

        {mapStops.length > 0 ? (
          <>
            <CourseMap
              stops={mapStops}
              routeSegments={walkingRouteSegments}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={selectCourseStop}
            />

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {course.stops.map((stop) => {
                const selected = selectedPlaceId === stop.placeId;

                return (
                  <button
                    key={`${stop.contentId}-${stop.placeId}`}
                    type="button"
                    onClick={() => selectCourseStop(stop.placeId)}
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 transition ${
                      selected
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                      {stop.order}
                    </span>

                    <span className="max-w-40 truncate text-xs font-medium">
                      {stop.place.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-xs leading-5 text-gray-400">
              {walkingRouteStatus === "loading" &&
                "실제 도보 경로와 이동 시간을 불러오는 중입니다."}

              {walkingRouteStatus === "real" &&
                "실제 도보 경로를 기준으로 이동 거리와 예상 시간을 표시합니다."}

              {walkingRouteStatus === "partial" &&
                "일부 구간은 실제 도보 경로를 사용하고, 조회에 실패한 구간은 기존 직선거리 기반 예상값을 사용합니다."}

              {walkingRouteStatus === "fallback" &&
                "실제 도보 경로를 불러오지 못해 기존 직선거리 기반 예상값을 사용합니다."}

              {walkingRouteStatus === "idle" &&
                "장소가 2개 이상이면 실제 도보 경로를 표시합니다."}
            </p>
          </>
        ) : (
          <div className="rounded-2xl bg-gray-50 p-5 text-sm leading-6 text-gray-500">
            지도에 표시할 촬영지 좌표가 없습니다.
          </div>
        )}
      </section>

      <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">
              ADD PLACE
            </p>

            <h2 className="mt-2 text-xl font-bold">촬영지 추가하기</h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              선택했던 작품과 배우 조건에 맞는 촬영지를 코스 마지막에 추가할 수
              있어요.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isAddPlaceOpen) {
                setIsAddPlaceOpen(false);
                return;
              }

              void loadAddPlaceCandidates();
            }}
            className="shrink-0 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            {isAddPlaceOpen ? "닫기" : "+ 장소 추가"}
          </button>
        </div>

        {isAddPlaceOpen && (
          <div className="mt-5 border-t border-gray-100 pt-5">
            {isLoadingCandidates && (
              <p className="text-sm text-gray-500">
                추가 가능한 촬영지를 불러오는 중...
              </p>
            )}

            {candidateError && (
              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-sm text-red-600">{candidateError}</p>

                <button
                  type="button"
                  onClick={() => {
                    setAddPlaceCandidates(null);
                    void loadAddPlaceCandidates();
                  }}
                  className="mt-3 text-xs font-semibold text-red-700 underline"
                >
                  다시 시도
                </button>
              </div>
            )}

            {!isLoadingCandidates &&
              !candidateError &&
              addPlaceCandidates?.length === 0 && (
                <p className="rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-500">
                  현재 조건에서 더 추가할 수 있는 촬영지가 없습니다.
                </p>
              )}

            {!isLoadingCandidates &&
              !candidateError &&
              addPlaceCandidates &&
              addPlaceCandidates.length > 0 && (
                <div className="space-y-3">
                  {addPlaceCandidates.map((candidate) => (
                    <div
                      key={candidate.place.id}
                      className="rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="font-bold">{candidate.place.name}</h3>

                          <p className="mt-1 text-xs text-gray-500">
                            {candidate.contentTitle}
                          </p>

                          {candidate.place.address && (
                            <p className="mt-2 text-sm leading-6 text-gray-500">
                              {candidate.place.address}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => addCourseStop(candidate)}
                          className="shrink-0 rounded-lg border border-indigo-600 px-3 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                        >
                          코스에 추가
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">
            COURSE STOPS
          </p>

          <h2 className="mt-2 text-xl font-bold">이 순서로 만나보세요</h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            방문 순서를 조정하거나 필요하지 않은 장소를 삭제할 수 있어요.
          </p>
        </div>

        {course.stops.map((stop, index) => {
          const nextStop = course.stops[index + 1];

          const selected = selectedPlaceId === stop.placeId;

          const isFirst = index === 0;
          const isLast = index === course.stops.length - 1;

          const nextStopExceedsWalkingLimit =
            nextStop != null &&
            course.maxWalkingMinutes !== null &&
            nextStop.walkingMinutesFromPrevious > course.maxWalkingMinutes;

          return (
            <div
              key={`${stop.contentId}-${stop.placeId}`}
              ref={(element) => {
                stopRefs.current[stop.placeId] = element;
              }}
            >
              <div
                className={`rounded-2xl border transition ${
                  selected
                    ? "border-indigo-600 bg-indigo-50 shadow-sm"
                    : "border-gray-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlaceId(stop.placeId);

                    setDetailTarget({
                      contentId: stop.contentId,
                      place: stop.place,
                    });
                  }}
                  className="w-full p-5 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          selected ? "text-indigo-600" : "text-gray-400"
                        }`}
                      >
                        {stop.order.toString().padStart(2, "0")}
                      </p>

                      <h3 className="mt-1 text-lg font-bold">
                        {stop.place.name}
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        {stop.contentTitle}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/80 px-3 py-2 text-right">
                      <p className="text-xs text-gray-500">예상 체류</p>

                      <p className="mt-1 text-sm font-semibold">
                        약 {stop.stayMinutes}분
                      </p>
                    </div>
                  </div>

                  {stop.place.address && (
                    <p className="mt-4 text-sm leading-6 text-gray-500">
                      {stop.place.address}
                    </p>
                  )}

                  {stop.verifiedFact && (
                    <div className="mt-4 rounded-xl bg-white/70 p-3">
                      <p className="text-xs font-medium text-gray-500">
                        촬영지 정보
                      </p>

                      <p className="mt-1 text-sm leading-6">
                        {stop.verifiedFact}
                      </p>
                    </div>
                  )}

                  <p className="mt-4 text-xs font-semibold">상세 보기 →</p>
                </button>

                <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveCourseStop(stop.placeId, "UP")}
                      disabled={isFirst}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold transition hover:border-black disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
                      aria-label={`${stop.place.name}을 이전 순서로 이동`}
                    >
                      ↑ 위로
                    </button>

                    <button
                      type="button"
                      onClick={() => moveCourseStop(stop.placeId, "DOWN")}
                      disabled={isLast}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold transition hover:border-black disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
                      aria-label={`${stop.place.name}을 다음 순서로 이동`}
                    >
                      ↓ 아래로
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCourseStop(stop.placeId)}
                    disabled={course.stops.length <= 1}
                    className="text-xs font-semibold text-red-500 transition hover:text-red-700 disabled:cursor-not-allowed disabled:text-gray-300"
                  >
                    코스에서 삭제
                  </button>
                </div>
              </div>

              {nextStop && (
                <div className="px-5 py-5">
                  <div
                    className={`border-l-2 border-dashed pl-4 ${
                      nextStopExceedsWalkingLimit
                        ? "border-amber-400"
                        : "border-gray-200"
                    }`}
                  >
                    <p
                      className={`text-xs ${
                        nextStopExceedsWalkingLimit
                          ? "font-semibold text-amber-700"
                          : "text-gray-500"
                      }`}
                    >
                      {stop.order} → {nextStop.order} · 다음 장소까지
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      예상 도보 {nextStop.walkingMinutesFromPrevious}분
                      <span className="mx-2 text-gray-300">·</span>
                      {nextStop.distanceFromPreviousKm}km
                    </p>

                    {nextStopExceedsWalkingLimit && (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        설정한 최대 도보 {course.maxWalkingMinutes}분을 초과하는
                        구간입니다.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="mt-8 rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-500">
        체류 시간은 전체 여행 시간에서 예상 이동 시간을 제외한 뒤 각 장소에
        분배한 값입니다. 현재 이동 거리와 도보 시간은 좌표 기반 추정값입니다.
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
    <Suspense fallback={<main className="p-6">코스를 불러오는 중...</main>}>
      <CourseContent />
    </Suspense>
  );
}
