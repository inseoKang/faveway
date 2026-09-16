"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import BackButton from "@/components/common/BackButton";
import CourseMap from "@/components/map/CourseMap";
import PlaceDetailDialog from "@/components/PlaceDetailDialog";

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

function CourseContent() {
  const searchParams = useSearchParams();

  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);

  const rawData = searchParams.get("data");
  const title = searchParams.get("title");

  let course: CourseData | null = null;

  if (rawData) {
    try {
      course = JSON.parse(decodeURIComponent(rawData)) as CourseData;
    } catch {
      course = null;
    }
  }

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

  if (!rawData) {
    return (
      <main className="mx-auto min-h-screen max-w-md p-6">
        <p className="text-sm text-red-600">코스 정보가 없습니다.</p>
      </main>
    );
  }

  if (!course) {
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
            <CourseMap stops={mapStops} />

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {course.stops.map((stop) => (
                <div
                  key={`${stop.contentId}-${stop.placeId}`}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {stop.order}
                  </span>

                  <span className="max-w-40 truncate text-xs font-medium">
                    {stop.place.name}
                  </span>
                </div>
              ))}
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
        </div>

        {course.stops.map((stop, index) => {
          const nextStop = course.stops[index + 1];

          return (
            <div key={`${stop.contentId}-${stop.placeId}`}>
              <button
                type="button"
                onClick={() =>
                  setDetailTarget({
                    contentId: stop.contentId,
                    place: stop.place,
                  })
                }
                className="w-full rounded-2xl border border-gray-200 p-5 text-left transition hover:border-black"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-400">
                      {stop.order.toString().padStart(2, "0")}
                    </p>

                    <h3 className="mt-1 text-lg font-bold">
                      {stop.place.name}
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      {stop.contentTitle}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-right">
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
                  <div className="mt-4 rounded-xl bg-gray-50 p-3">
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

              {nextStop && (
                <div className="px-5 py-5">
                  <div className="border-l-2 border-dashed border-gray-200 pl-4">
                    <p className="text-xs text-gray-500">
                      {stop.order} → {nextStop.order} · 다음 장소까지
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      예상 도보 {nextStop.walkingMinutesFromPrevious}분
                      <span className="mx-2 text-gray-300">·</span>
                      {nextStop.distanceFromPreviousKm}km
                    </p>
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
