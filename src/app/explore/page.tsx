"use client";

import { useEffect, useMemo, useState } from "react";

import BackButton from "@/components/common/BackButton";
import PlaceDetailDialog from "@/components/PlaceDetailDialog";

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
  content_id?: number;
  relation_type: string;
  verification_status: string;
  verified_fact: string | null;
  isActorScenePlace: boolean;

  places: Place;

  content?: {
    id: number;
    title: string;
  };
};

type DetailTarget = {
  contentId: number;
  place: Place;
};

export default function ExplorePage() {
  const [mode, setMode] = useState<SearchMode>("CONTENT");

  const [contents, setContents] = useState<Content[]>([]);
  const [contentQuery, setContentQuery] = useState("");

  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  const [actors, setActors] = useState<Actor[]>([]);
  const [actorQuery, setActorQuery] = useState("");

  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);

  const [contentActors, setContentActors] = useState<Actor[]>([]);

  const [selectedActors, setSelectedActors] = useState<Actor[]>([]);

  const [selectedActorContentIds, setSelectedActorContentIds] = useState<
    number[]
  >([]);

  const [places, setPlaces] = useState<PlaceRelation[]>([]);

  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);

  const [loading, setLoading] = useState(true);

  const [actorLoading, setActorLoading] = useState(false);

  const [placesLoading, setPlacesLoading] = useState(false);

  const [error, setError] = useState("");

  /**
   * 작품 전체 목록 조회
   *
   * 사용자 액션(changeMode)에서도 다시 호출해야 하므로
   * 별도 함수로 유지한다.
   */
  async function fetchAllContents() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/contents");

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "작품을 불러오지 못했습니다.");
      }

      setContents(result.data ?? []);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "작품을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * 첫 화면 진입 시 작품 목록 조회
   *
   * effect 안에서 fetchAllContents()를 호출하면
   * 해당 함수 내부의 동기적인 setState 때문에
   * react-hooks/set-state-in-effect 규칙에 걸릴 수 있으므로
   * 비동기 fetch 완료 후 상태를 변경한다.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadInitialContents() {
      try {
        const response = await fetch("/api/contents");

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "작품을 불러오지 못했습니다.");
        }

        if (!cancelled) {
          setContents(result.data ?? []);
        }
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "작품을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialContents();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 배우 이름 검색
   *
   * actorQuery가 비었을 때 actors를 비우는 작업은
   * effect 안이 아니라 input onChange에서 처리한다.
   */
  useEffect(() => {
    if (mode !== "ACTOR") {
      return;
    }

    const query = actorQuery.trim();

    if (!query) {
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setActorLoading(true);
        setError("");

        const response = await fetch(
          `/api/actors/search?q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "배우를 검색하지 못했습니다.");
        }

        if (!controller.signal.aborted) {
          setActors(result.data ?? []);
        }
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") {
          return;
        }

        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "배우를 검색하지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setActorLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [actorQuery, mode]);

  async function fetchContentActors(contentId: number) {
    const response = await fetch(`/api/contents/${contentId}/actors`);

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message ?? "출연 배우를 불러오지 못했습니다.");
    }

    setContentActors(result.data ?? []);
  }

  async function fetchContentPlaces(contentId: number, actorIds: number[]) {
    try {
      setPlacesLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (actorIds.length > 0) {
        params.set("actorIds", actorIds.join(","));
      }

      const query = params.toString();

      const response = await fetch(
        query
          ? `/api/contents/${contentId}/places?${query}`
          : `/api/contents/${contentId}/places`,
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "촬영지를 불러오지 못했습니다.");
      }

      setPlaces(result.data ?? []);
    } catch (reason) {
      setPlaces([]);

      setError(
        reason instanceof Error
          ? reason.message
          : "촬영지를 불러오지 못했습니다.",
      );
    } finally {
      setPlacesLoading(false);
    }
  }

  async function fetchActorPlaces(actorId: number, contentIds: number[]) {
    try {
      setPlacesLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (contentIds.length > 0) {
        params.set("contentIds", contentIds.join(","));
      }

      const query = params.toString();

      const response = await fetch(
        query
          ? `/api/actors/${actorId}/places?${query}`
          : `/api/actors/${actorId}/places`,
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "촬영지를 불러오지 못했습니다.");
      }

      setPlaces(result.data ?? []);
    } catch (reason) {
      setPlaces([]);

      setError(
        reason instanceof Error
          ? reason.message
          : "촬영지를 불러오지 못했습니다.",
      );
    } finally {
      setPlacesLoading(false);
    }
  }

  async function selectContent(content: Content) {
    try {
      setSelectedContent(content);
      setSelectedActors([]);
      setPlaces([]);

      await Promise.all([
        fetchContentActors(content.id),

        fetchContentPlaces(content.id, []),
      ]);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "정보를 불러오지 못했습니다.",
      );
    }
  }

  function toggleContentActor(actor: Actor) {
    if (!selectedContent) {
      return;
    }

    const exists = selectedActors.some((item) => item.id === actor.id);

    const nextActors = exists
      ? selectedActors.filter((item) => item.id !== actor.id)
      : [...selectedActors, actor];

    setSelectedActors(nextActors);

    void fetchContentPlaces(
      selectedContent.id,
      nextActors.map((item) => item.id),
    );
  }

  async function selectActor(actor: Actor) {
    try {
      setSelectedActor(actor);
      setSelectedActorContentIds([]);

      setContents([]);
      setPlaces([]);

      setLoading(true);
      setError("");

      const response = await fetch(`/api/actors/${actor.id}/contents`);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ?? "배우의 출연 작품을 불러오지 못했습니다.",
        );
      }

      setContents(result.data ?? []);

      await fetchActorPlaces(actor.id, []);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "정보를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleActorContent(contentId: number) {
    if (!selectedActor) {
      return;
    }

    const nextIds = selectedActorContentIds.includes(contentId)
      ? selectedActorContentIds.filter((id) => id !== contentId)
      : [...selectedActorContentIds, contentId];

    setSelectedActorContentIds(nextIds);

    void fetchActorPlaces(selectedActor.id, nextIds);
  }

  async function changeMode(nextMode: SearchMode) {
    setMode(nextMode);

    setSelectedContent(null);
    setSelectedActor(null);

    setSelectedActors([]);
    setSelectedActorContentIds([]);

    setContentActors([]);
    setPlaces([]);

    setActorQuery("");
    setActors([]);

    setContentQuery("");
    setError("");

    if (nextMode === "CONTENT") {
      await fetchAllContents();
    } else {
      setContents([]);
    }
  }

  const filteredContents = useMemo(() => {
    const query = contentQuery.trim().toLowerCase();

    if (!query) {
      return contents;
    }

    return contents.filter((content) =>
      content.title.toLowerCase().includes(query),
    );
  }, [contents, contentQuery]);

  function placeContentId(relation: PlaceRelation): number | null {
    if (relation.content?.id) {
      return relation.content.id;
    }

    if (relation.content_id) {
      return relation.content_id;
    }

    if (selectedContent) {
      return selectedContent.id;
    }

    return null;
  }

  return (
    <main className="mx-auto min-h-screen max-w-md p-6">
      <header className="mb-8">
        <BackButton className="mb-5" />

        <p className="text-sm font-medium text-gray-500">FAVEWAY</p>

        <h1 className="mt-2 text-2xl font-bold">촬영지를 둘러보세요</h1>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          작품이나 배우를 기준으로 실제 촬영지를 확인할 수 있어요.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => void changeMode("CONTENT")}
          className={`rounded-2xl border py-3 text-sm font-semibold ${
            mode === "CONTENT"
              ? "border-black bg-black text-white"
              : "border-gray-200 bg-white"
          }`}
        >
          작품으로 찾기
        </button>

        <button
          type="button"
          onClick={() => void changeMode("ACTOR")}
          className={`rounded-2xl border py-3 text-sm font-semibold ${
            mode === "ACTOR"
              ? "border-black bg-black text-white"
              : "border-gray-200 bg-white"
          }`}
        >
          배우로 찾기
        </button>
      </section>

      {loading && (
        <p className="mb-5 text-sm text-gray-500">정보를 불러오는 중...</p>
      )}

      {mode === "CONTENT" && (
        <>
          <input
            type="search"
            value={contentQuery}
            onChange={(event) => setContentQuery(event.target.value)}
            placeholder="작품 검색"
            className="mb-5 w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
          />

          {!loading && (
            <div className="space-y-2">
              {filteredContents.map((content) => (
                <button
                  key={content.id}
                  type="button"
                  onClick={() => void selectContent(content)}
                  className={`w-full rounded-2xl border p-4 text-left ${
                    selectedContent?.id === content.id
                      ? "border-black bg-gray-50"
                      : "border-gray-200"
                  }`}
                >
                  <p className="font-semibold">{content.title}</p>

                  <p className="mt-1 text-sm text-gray-500">
                    {content.media_type}
                  </p>
                </button>
              ))}
            </div>
          )}

          {selectedContent && (
            <section className="mt-8">
              <h2 className="font-semibold">배우로 좁혀보기</h2>

              <p className="mt-1 text-sm text-gray-500">
                선택하지 않으면 작품의 모든 촬영지를 보여줍니다.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {contentActors.map((actor) => {
                  const selected = selectedActors.some(
                    (item) => item.id === actor.id,
                  );

                  return (
                    <button
                      key={actor.id}
                      type="button"
                      onClick={() => toggleContentActor(actor)}
                      className={`rounded-full border px-4 py-2 text-sm ${
                        selected
                          ? "border-black bg-black text-white"
                          : "border-gray-200"
                      }`}
                    >
                      {actor.name}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {mode === "ACTOR" && (
        <>
          <input
            type="search"
            value={actorQuery}
            onChange={(event) => {
              const value = event.target.value;

              setActorQuery(value);

              if (!value.trim()) {
                setActors([]);
              }
            }}
            placeholder="배우 검색"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
          />

          {actorLoading && (
            <p className="mt-3 text-sm text-gray-500">검색 중...</p>
          )}

          {actors.length > 0 && (
            <div className="mt-3 space-y-2">
              {actors.map((actor) => (
                <button
                  key={actor.id}
                  type="button"
                  onClick={() => void selectActor(actor)}
                  className="w-full rounded-2xl border border-gray-200 p-4 text-left"
                >
                  {actor.name}
                </button>
              ))}
            </div>
          )}

          {selectedActor && (
            <section className="mt-8">
              <h2 className="font-semibold">작품으로 좁혀보기</h2>

              <p className="mt-1 text-sm text-gray-500">
                아무 작품도 선택하지 않으면 {selectedActor.name}의 전체 작품
                촬영지를 보여줍니다.
              </p>

              <div className="mt-4 space-y-2">
                {contents.map((content) => {
                  const selected = selectedActorContentIds.includes(content.id);

                  return (
                    <button
                      key={content.id}
                      type="button"
                      onClick={() => toggleActorContent(content.id)}
                      className={`w-full rounded-2xl border p-4 text-left ${
                        selected ? "border-black bg-gray-50" : "border-gray-200"
                      }`}
                    >
                      <p className="font-semibold">{content.title}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {error && (
        <p className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {placesLoading && (
        <p className="mt-8 text-sm text-gray-500">촬영지를 불러오는 중...</p>
      )}

      {!placesLoading && places.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-500">FILMING LOCATIONS</p>

              <h2 className="mt-1 text-xl font-bold">
                촬영지 {places.length}곳
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            {places.map((relation) => {
              const contentId = placeContentId(relation);

              return (
                <button
                  key={`${contentId}-${relation.id}`}
                  type="button"
                  disabled={!contentId}
                  onClick={() => {
                    if (!contentId) {
                      return;
                    }

                    setDetailTarget({
                      contentId,
                      place: relation.places,
                    });
                  }}
                  className="w-full rounded-2xl border border-gray-200 p-5 text-left transition hover:border-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {relation.content && (
                    <p className="mb-2 text-xs font-semibold text-gray-400">
                      {relation.content.title}
                    </p>
                  )}

                  <h3 className="font-bold">{relation.places.name}</h3>

                  {relation.places.address && (
                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      {relation.places.address}
                    </p>
                  )}

                  {relation.verified_fact && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                      {relation.verified_fact}
                    </p>
                  )}

                  <p className="mt-4 text-xs font-semibold">상세 보기 →</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!placesLoading &&
        (selectedContent || selectedActor) &&
        places.length === 0 &&
        !error && (
          <p className="mt-8 text-sm text-gray-500">
            조건에 맞는 촬영지가 없습니다.
          </p>
        )}

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
