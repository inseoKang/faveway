"use client";

import { Suspense, useMemo, useRef, useState } from "react";
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

  const [course, setCourse] = useState<CourseData | null>(initialCourse);

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

    setCourse(nextCourse);
    setSelectedPlaceId(placeId);

    window.setTimeout(() => {
      stopRefs.current[placeId]?.scrollIntoView({
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
              지도 위 연결선은 현재 방문 순서를 보여주는 선이며 실제 도보 경로는
              아닙니다.
            </p>
          </>
        ) : (
          <div className="rounded-2xl bg-gray-50 p-5 text-sm leading-6 text-gray-500">
            지도에 표시할 촬영지 좌표가 없습니다.
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
