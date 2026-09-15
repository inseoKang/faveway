"use client";

import { Suspense } from "react";
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
  relationType: string;
  verificationStatus: string;
  verifiedFact: string | null;
  place: Place;
};

type CourseData = {
  contentId: number;
  durationMinutes: number;
  stops: CourseStop[];
};

function CourseContent() {
  const searchParams = useSearchParams();

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
          총 여행 시간 {course.durationMinutes / 60}시간
        </p>
      </header>

      <section className="space-y-4">
        {course.stops.map((stop) => (
          <article
            key={stop.placeId}
            className="rounded-2xl border border-gray-200 p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">
                {stop.order.toString().padStart(2, "0")}
              </span>

              <span className="text-sm text-gray-500">
                약 {stop.stayMinutes}분
              </span>
            </div>

            <h2 className="text-lg font-bold">{stop.place.name}</h2>

            {stop.place.address && (
              <p className="mt-1 text-sm text-gray-500">{stop.place.address}</p>
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
              <p className="mt-4 text-sm leading-6 text-gray-700">
                {stop.verifiedFact}
              </p>
            )}
          </article>
        ))}
      </section>
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
