"use client";

import { useEffect, useState } from "react";

type Content = {
  id: number;
  title: string;
  media_type: string;
  release_year: number | null;
  description: string | null;
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
  relation_type: string;
  verification_status: string;
  verified_fact: string | null;
  places: Place;
};

export default function ExplorePage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  const [places, setPlaces] = useState<PlaceRelation[]>([]);

  const [contentsLoading, setContentsLoading] = useState(true);
  const [placesLoading, setPlacesLoading] = useState(false);

  const [contentsError, setContentsError] = useState("");
  const [placesError, setPlacesError] = useState("");

  useEffect(() => {
    async function fetchContents() {
      try {
        setContentsError("");

        const response = await fetch("/api/contents");

        if (!response.ok) {
          throw new Error("콘텐츠를 불러오지 못했습니다.");
        }

        const result = await response.json();

        setContents(result.data ?? []);
      } catch (error) {
        setContentsError(
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
        );
      } finally {
        setContentsLoading(false);
      }
    }

    fetchContents();
  }, []);

  async function handleSelectContent(content: Content) {
    setSelectedContent(content);

    setPlaces([]);
    setPlacesError("");
    setPlacesLoading(true);

    try {
      const response = await fetch(`/api/contents/${content.id}/places`);

      if (!response.ok) {
        throw new Error("촬영지를 불러오지 못했습니다.");
      }

      const result = await response.json();

      setPlaces(result.data ?? []);
    } catch (error) {
      setPlacesError(
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setPlacesLoading(false);
    }
  }

  if (contentsLoading) {
    return <main className="p-6">콘텐츠를 불러오는 중...</main>;
  }

  return (
    <main className="mx-auto min-h-screen max-w-md p-6">
      <header className="mb-8">
        <p className="text-sm font-medium text-gray-500">FAVEWAY</p>

        <h1 className="mt-2 text-2xl font-bold">
          어떤 작품을 따라
          <br />
          여행하고 싶나요?
        </h1>
      </header>

      {/* 콘텐츠 조회 오류 */}
      {contentsError && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {contentsError}
        </p>
      )}

      {/* 콘텐츠가 하나도 없는 경우 */}
      {!contentsError && contents.length === 0 && (
        <p className="text-sm text-gray-500">등록된 콘텐츠가 없습니다.</p>
      )}

      {/* 콘텐츠 목록 */}
      <section className="space-y-3">
        {contents.map((content) => {
          const selected = selectedContent?.id === content.id;

          return (
            <button
              key={content.id}
              type="button"
              onClick={() => handleSelectContent(content)}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                selected ? "border-black" : "border-gray-200"
              }`}
            >
              <p className="font-semibold">{content.title}</p>

              <div className="mt-1 flex gap-2 text-sm text-gray-500">
                <span>{content.media_type}</span>

                {content.release_year && <span>{content.release_year}</span>}
              </div>
            </button>
          );
        })}
      </section>

      {/* 선택한 작품의 촬영지 */}
      {selectedContent && (
        <section className="mt-10">
          <div className="mb-4">
            <p className="text-sm text-gray-500">선택한 작품</p>

            <h2 className="mt-1 text-xl font-bold">
              {selectedContent.title} 촬영지
            </h2>
          </div>

          {/* 촬영지 로딩 */}
          {placesLoading && (
            <p className="text-sm text-gray-500">촬영지를 불러오는 중...</p>
          )}

          {/* 촬영지 오류 */}
          {!placesLoading && placesError && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {placesError}
            </p>
          )}

          {/* 촬영지 없음 */}
          {!placesLoading && !placesError && places.length === 0 && (
            <p className="text-sm text-gray-500">등록된 촬영지가 없습니다.</p>
          )}

          {/* 촬영지 목록 */}
          {!placesLoading && !placesError && places.length > 0 && (
            <div className="space-y-3">
              {places.map((relation) => (
                <article
                  key={relation.id}
                  className="rounded-2xl border border-gray-200 p-4"
                >
                  <p className="font-semibold">{relation.places.name}</p>

                  {relation.places.address && (
                    <p className="mt-1 text-sm text-gray-500">
                      {relation.places.address}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-gray-100 px-2 py-1">
                      {relation.relation_type}
                    </span>

                    <span className="rounded-full bg-gray-100 px-2 py-1">
                      {relation.verification_status}
                    </span>
                  </div>

                  {relation.verified_fact && (
                    <p className="mt-3 text-sm leading-6 text-gray-700">
                      {relation.verified_fact}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
