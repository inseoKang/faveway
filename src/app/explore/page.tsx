"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SearchMode = "CONTENT" | "ACTOR";

type Content = {
  id: number;
  title: string;
  media_type: string;
  release_year: number | null;
  description: string | null;
  character_name?: string | null;
};

type Actor = {
  id: number;
  name: string;
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
  actor_id: number | null;
  relation_type: string;
  verification_status: string;
  verified_fact: string | null;
  places: Place;
};

export default function ExplorePage() {
  const router = useRouter();

  const [mode, setMode] = useState<SearchMode>("CONTENT");

  const [contents, setContents] = useState<Content[]>([]);

  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  const [actors, setActors] = useState<Actor[]>([]);

  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);

  const [actorQuery, setActorQuery] = useState("");

  const [places, setPlaces] = useState<PlaceRelation[]>([]);

  const [contentsLoading, setContentsLoading] = useState(true);

  const [actorLoading, setActorLoading] = useState(false);

  const [placesLoading, setPlacesLoading] = useState(false);

  const [contentsError, setContentsError] = useState("");

  const [actorError, setActorError] = useState("");

  const [placesError, setPlacesError] = useState("");

  async function fetchAllContents() {
    try {
      setContentsLoading(true);
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

  useEffect(() => {
    let cancelled = false;

    async function loadContents() {
      try {
        const response = await fetch("/api/contents");

        if (!response.ok) {
          throw new Error("콘텐츠를 불러오지 못했습니다.");
        }

        const result = await response.json();

        if (!cancelled) {
          setContents(result.data ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setContentsError(
            error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setContentsLoading(false);
        }
      }
    }

    void loadContents();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 배우 이름 부분 검색
   *
   * 입력 후 300ms가 지나면 자동 검색한다.
   */
  useEffect(() => {
    if (mode !== "ACTOR") {
      return;
    }

    const query = actorQuery.trim();

    if (!query) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setActorLoading(true);
        setActorError("");

        const response = await fetch(
          `/api/actors/search?q=${encodeURIComponent(query)}`,
        );

        if (!response.ok) {
          throw new Error("배우를 검색하지 못했습니다.");
        }

        const result = await response.json();

        setActors(result.data ?? []);
      } catch (error) {
        setActorError(
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
        );
      } finally {
        setActorLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [actorQuery, mode]);

  function resetSelection() {
    setSelectedActor(null);
    setSelectedContent(null);
    setPlaces([]);
    setPlacesError("");
  }

  async function handleChangeMode(nextMode: SearchMode) {
    setMode(nextMode);
    resetSelection();

    if (nextMode === "CONTENT") {
      await fetchAllContents();
    } else {
      setContents([]);
    }
  }

  async function handleSelectActor(actor: Actor) {
    setSelectedActor(actor);
    setSelectedContent(null);
    setPlaces([]);
    setContents([]);
    setContentsError("");

    try {
      setContentsLoading(true);

      const response = await fetch(`/api/actors/${actor.id}/contents`);

      if (!response.ok) {
        throw new Error("배우의 출연 작품을 불러오지 못했습니다.");
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

  async function handleSelectContent(content: Content) {
    setSelectedContent(content);

    setPlaces([]);
    setPlacesError("");
    setPlacesLoading(true);

    try {
      const actorQueryString = selectedActor
        ? `?actorId=${selectedActor.id}`
        : "";

      const response = await fetch(
        `/api/contents/${content.id}/places${actorQueryString}`,
      );

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

  function handleStartPlanning() {
    if (!selectedContent) {
      return;
    }

    const params = new URLSearchParams({
      contentId: selectedContent.id.toString(),
      title: selectedContent.title,
    });

    if (selectedActor) {
      params.set("actorId", selectedActor.id.toString());

      params.set("actorName", selectedActor.name);
    }

    router.push(`/planning?${params.toString()}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md p-6">
      <header className="mb-8">
        <p className="text-sm font-medium text-gray-500">FAVEWAY</p>

        <h1 className="mt-2 text-2xl font-bold">
          어떤 콘텐츠를 따라
          <br />
          여행하고 싶나요?
        </h1>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleChangeMode("CONTENT")}
          className={`rounded-2xl border py-3 text-sm font-semibold ${
            mode === "CONTENT"
              ? "border-black bg-black text-white"
              : "border-gray-200"
          }`}
        >
          작품으로 찾기
        </button>

        <button
          type="button"
          onClick={() => handleChangeMode("ACTOR")}
          className={`rounded-2xl border py-3 text-sm font-semibold ${
            mode === "ACTOR"
              ? "border-black bg-black text-white"
              : "border-gray-200"
          }`}
        >
          배우로 찾기
        </button>
      </section>

      {mode === "ACTOR" && (
        <section className="mb-8">
          <label htmlFor="actor-search" className="mb-2 block font-semibold">
            좋아하는 배우를 검색해보세요
          </label>

          <input
            id="actor-search"
            type="search"
            value={actorQuery}
            onChange={(event) => {
              const value = event.target.value;

              setActorQuery(value);

              if (!value.trim()) {
                setActors([]);
                setActorError("");
              }
            }}
            placeholder="예: 공유"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
          />

          {actorLoading && (
            <p className="mt-3 text-sm text-gray-500">배우를 검색하는 중...</p>
          )}

          {actorError && (
            <p className="mt-3 text-sm text-red-600">{actorError}</p>
          )}

          {!actorLoading &&
            actorQuery.trim() &&
            actors.length === 0 &&
            !actorError && (
              <p className="mt-3 text-sm text-gray-500">
                검색 결과가 없습니다.
              </p>
            )}

          {actors.length > 0 && (
            <div className="mt-4 space-y-2">
              {actors.map((actor) => {
                const selected = selectedActor?.id === actor.id;

                return (
                  <button
                    key={actor.id}
                    type="button"
                    onClick={() => handleSelectActor(actor)}
                    className={`w-full rounded-2xl border p-4 text-left ${
                      selected ? "border-black" : "border-gray-200"
                    }`}
                  >
                    <p className="font-semibold">{actor.name}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {selectedActor && (
        <div className="mb-5 rounded-2xl bg-gray-50 p-4">
          <p className="text-xs text-gray-500">선택한 배우</p>

          <p className="mt-1 font-semibold">{selectedActor.name}</p>

          <p className="mt-1 text-sm text-gray-500">
            어떤 작품 속 {selectedActor.name}을 따라가 볼까요?
          </p>
        </div>
      )}

      {contentsLoading && (
        <p className="text-sm text-gray-500">작품을 불러오는 중...</p>
      )}

      {contentsError && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {contentsError}
        </p>
      )}

      {!contentsLoading &&
        !contentsError &&
        contents.length === 0 &&
        (mode === "CONTENT" || selectedActor) && (
          <p className="text-sm text-gray-500">등록된 작품이 없습니다.</p>
        )}

      {!contentsLoading && contents.length > 0 && (
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

                <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-500">
                  <span>{content.media_type}</span>

                  {content.release_year && <span>{content.release_year}</span>}

                  {content.character_name && (
                    <span>배역: {content.character_name}</span>
                  )}
                </div>
              </button>
            );
          })}
        </section>
      )}

      {selectedContent && (
        <section className="mt-10">
          <div className="mb-4">
            <p className="text-sm text-gray-500">선택한 작품</p>

            <h2 className="mt-1 text-xl font-bold">
              {selectedContent.title} 촬영지
            </h2>

            {selectedActor && (
              <p className="mt-1 text-sm text-gray-500">
                {selectedActor.name} 관련 촬영지를 우선 표시합니다.
              </p>
            )}
          </div>

          {placesLoading && (
            <p className="text-sm text-gray-500">촬영지를 불러오는 중...</p>
          )}

          {!placesLoading && placesError && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {placesError}
            </p>
          )}

          {!placesLoading && !placesError && places.length === 0 && (
            <p className="text-sm text-gray-500">등록된 촬영지가 없습니다.</p>
          )}

          {!placesLoading && !placesError && places.length > 0 && (
            <div className="space-y-3">
              {places.map((relation) => {
                const actorMatch =
                  selectedActor && relation.actor_id === selectedActor.id;

                return (
                  <article
                    key={relation.id}
                    className="rounded-2xl border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{relation.places.name}</p>

                      {actorMatch && (
                        <span className="shrink-0 rounded-full bg-black px-2 py-1 text-xs text-white">
                          배우 관련
                        </span>
                      )}
                    </div>

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
                );
              })}
            </div>
          )}

          {!placesLoading && !placesError && places.length > 0 && (
            <button
              type="button"
              onClick={handleStartPlanning}
              className="mt-6 w-full rounded-2xl bg-black py-4 font-semibold text-white"
            >
              이 작품으로 여행하기
            </button>
          )}
        </section>
      )}
    </main>
  );
}
