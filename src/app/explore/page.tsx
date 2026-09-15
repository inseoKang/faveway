"use client";

import { useEffect, useState } from "react";

type Content = {
  id: number;
  title: string;
  media_type: string;
  release_year: number | null;
  description: string | null;
};

type PlaceRelation = {
  id: number;
  relation_type: string;
  verification_status: string;
  verified_fact: string | null;
  places: {
    id: number;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    place_type: string | null;
  };
};

export default function ExplorePage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [places, setPlaces] = useState<PlaceRelation[]>([]);

  const [loading, setLoading] = useState(true);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchContents() {
      try {
        const response = await fetch("/api/contents");

        if (!response.ok) {
          throw new Error("콘텐츠를 불러오지 못했습니다.");
        }

        const result = await response.json();
        setContents(result.data ?? []);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchContents();
  }, []);

  async function handleSelectContent(content: Content) {
    setSelectedContent(content);
    setPlaces([]);
    setPlacesLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/contents/${content.id}/places`);

      if (!response.ok) {
        throw new Error("촬영지를 불러오지 못했습니다.");
      }

      const result = await response.json();

      setPlaces(result.data ?? []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setPlacesLoading(false);
    }
  }

  if (loading) {
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

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <section className="space-y-3">
        {contents.map((content) => (
          <button
            key={content.id}
            onClick={() => handleSelectContent(content)}
            className={`w-full rounded-2xl border p-4 text-left ${
              selectedContent?.id === content.id
                ? "border-black"
                : "border-gray-200"
            }`}
          >
            <p className="font-semibold">{content.title}</p>

            <p className="mt-1 text-sm text-gray-500">{content.media_type}</p>
          </button>
        ))}
      </section>

      {selectedContent && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">{selectedContent.title} 촬영지</h2>

          {placesLoading && (
            <p className="mt-4 text-sm text-gray-500">
              촬영지를 불러오는 중...
            </p>
          )}

          {!placesLoading && places.length === 0 && (
            <p className="mt-4 text-sm text-gray-500">
              등록된 촬영지가 없습니다.
            </p>
          )}

          <div className="mt-4 space-y-3">
            {places.map((relation) => (
              <article
                key={relation.id}
                className="rounded-2xl border border-gray-200 p-4"
              >
                <p className="font-semibold">{relation.places.name}</p>

                <p className="mt-1 text-sm text-gray-500">
                  {relation.places.address}
                </p>

                <div className="mt-3 flex gap-2 text-xs">
                  <span className="rounded-full bg-gray-100 px-2 py-1">
                    {relation.relation_type}
                  </span>

                  <span className="rounded-full bg-gray-100 px-2 py-1">
                    {relation.verification_status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
