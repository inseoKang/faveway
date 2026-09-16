"use client";

import { Suspense, useState } from "react";
import PlaceDetailDialog from "@/components/PlaceDetailDialog";
import { useSearchParams } from "next/navigation";

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
  contentId: number;
  durationMinutes: number;
  maxWalkingMinutes: number | null;
  totalDistanceKm: number;
  totalWalkingMinutes: number;
  stops: CourseStop[];
};

function CourseContent() {
  const searchParams = useSearchParams();
  const [detailPlace, setDetailPlace] = useState<Place | null>(null);

  const rawData = searchParams.get("data");
  const contentTitle = searchParams.get("title");

  if (!rawData) {
    return (
      <main className="mx-auto min-h-screen max-w-md p-6">
        <p className="text-sm text-red-600">코스 정보가 없습니다.</p>
      </main>
    );
  }

  let course: CourseData;

  try {
    course = JSON.parse(decodeURIComponent(rawData)) as CourseData;
  } catch {
    return (
      <main className="mx-auto min-h-screen max-w-md p-6">
        <p className="text-sm text-red-600">코스 정보를 불러오지 못했습니다.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md p-6">
      <header className="mb-8">
        <p className="text-sm font-medium text-gray-500">FAVEWAY COURSE</p>

        <h1 className="mt-2 text-2xl font-bold">
          {contentTitle || "나의 여행 코스"}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          촬영지 {course.stops.length}곳으로 구성된 코스입니다.
        </p>

        <div className="mt-5 space-y-3 rounded-2xl bg-gray-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">여행 가능 시간</span>

            <span className="font-medium">
              {course.durationMinutes / 60}시간
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">한 구간 최대 도보</span>

            <span className="font-medium">
              {course.maxWalkingMinutes === null
                ? "제한 없음"
                : `${course.maxWalkingMinutes}분`}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">예상 총 이동 거리</span>

            <span className="font-medium">약 {course.totalDistanceKm}km</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">예상 총 도보 시간</span>

            <span className="font-medium">
              약 {course.totalWalkingMinutes}분
            </span>
          </div>
        </div>
      </header>

      <section>
        {course.stops.map((stop, index) => {
          const nextStop = course.stops[index + 1];

          return (
            <div key={stop.placeId}>
              <button
                type="button"
                onClick={() => setDetailPlace(stop.place)}
                aria-label={`${stop.place.name} 장소 설명 보기`}
                className="w-full rounded-2xl border border-gray-200 p-5 text-left transition hover:border-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500">
                      {stop.order.toString().padStart(2, "0")}
                    </p>

                    <h2 className="mt-1 text-lg font-bold">
                      {stop.place.name}
                    </h2>
                  </div>

                  <div className="shrink-0 rounded-xl bg-gray-50 px-3 py-2 text-right">
                    <p className="text-xs text-gray-500">예상 체류</p>

                    <p className="mt-1 text-sm font-semibold">
                      약 {stop.stayMinutes}분
                    </p>
                  </div>
                </div>

                {stop.place.address && (
                  <p className="text-sm leading-6 text-gray-500">
                    {stop.place.address}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-gray-100 px-2 py-1">
                    {stop.relationType}
                  </span>

                  <span className="rounded-full bg-gray-100 px-2 py-1">
                    {stop.verificationStatus}
                  </span>
                </div>

                {stop.verifiedFact && (
                  <div className="mt-4 rounded-xl bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">
                      촬영지 정보
                    </p>

                    <p className="mt-1 text-sm leading-6 text-gray-700">
                      {stop.verifiedFact}
                    </p>
                  </div>
                )}
                <span className="mt-4 block text-xs font-semibold text-stone-600">
                  장면·장소 이야기 보기 ↗
                </span>
              </button>

              {nextStop && (
                <div className="flex items-stretch px-5 py-3">
                  <div className="mr-4 flex flex-col items-center">
                    <div className="h-full min-h-12 border-l border-dashed border-gray-300" />
                  </div>

                  <div className="flex flex-1 items-center">
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        다음 장소까지 이동
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        도보 약 {nextStop.walkingMinutesFromPrevious}분
                        <span className="mx-2 text-gray-300">·</span>
                        {nextStop.distanceFromPreviousKm}km
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="mt-8 rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-500">
        체류 시간은 전체 여행 가능 시간에서 예상 이동 시간을 제외한 뒤 각 장소에
        분배한 값입니다. 이동 시간은 장소와 장소 사이의 예상 도보 시간입니다.
      </div>
      {detailPlace && (
        <PlaceDetailDialog
          key={`${course.contentId}/${detailPlace.id}`}
          contentId={course.contentId}
          placeId={detailPlace.id}
          placeName={detailPlace.name}
          onClose={() => setDetailPlace(null)}
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
