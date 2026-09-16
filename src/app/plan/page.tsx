"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BackButton from "@/components/common/BackButton";

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

export default function PlanPage() {
  const router = useRouter();

  const [mode, setMode] = useState<SearchMode>("CONTENT");

  const [contents, setContents] = useState<Content[]>([]);

  const [contentQuery, setContentQuery] = useState("");

  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  const [actors, setActors] = useState<Actor[]>([]);

  const [actorQuery, setActorQuery] = useState("");

  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);

  const [recommendedActors, setRecommendedActors] = useState<Actor[]>([]);

  const [contentActors, setContentActors] = useState<Actor[]>([]);

  const [selectedActors, setSelectedActors] = useState<Actor[]>([]);

  /**
   * 배우 기준으로 코스를 만들 때
   * 사용자가 선택한 작품 ID.
   *
   * 빈 배열이면 해당 배우의 전체 출연 작품 사용.
   */
  const [selectedActorContentIds, setSelectedActorContentIds] = useState<
    number[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [actorLoading, setActorLoading] = useState(false);

  const [error, setError] = useState("");

  /**
   * 작품 전체 목록 조회
   *
   * 사용자 액션(changeMode)에서도 필요하므로 유지.
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
   * 첫 화면 진입 시
   * 작품 목록 + 추천 배우 조회
   */
  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const [contentsResponse, recommendationsResponse] = await Promise.all([
          fetch("/api/contents"),

          fetch("/api/actors/recommendations"),
        ]);

        const contentsResult = await contentsResponse.json();

        const recommendationsResult = await recommendationsResponse.json();

        if (!contentsResponse.ok) {
          throw new Error(
            contentsResult.message ?? "작품을 불러오지 못했습니다.",
          );
        }

        if (!cancelled) {
          setContents(contentsResult.data ?? []);

          setRecommendedActors(
            recommendationsResponse.ok
              ? (recommendationsResult.data ?? [])
              : [],
          );
        }
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "정보를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 배우 이름 검색
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
    try {
      setError("");

      const response = await fetch(`/api/contents/${contentId}/actors`);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "출연 배우를 불러오지 못했습니다.");
      }

      setContentActors(result.data ?? []);
    } catch (reason) {
      setContentActors([]);

      setError(
        reason instanceof Error
          ? reason.message
          : "출연 배우를 불러오지 못했습니다.",
      );
    }
  }

  async function selectContent(content: Content) {
    setSelectedContent(content);

    setSelectedActors([]);

    await fetchContentActors(content.id);
  }

  async function selectActor(actor: Actor) {
    try {
      setSelectedActor(actor);

      setSelectedActorContentIds([]);

      setContents([]);

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
    } catch (reason) {
      setContents([]);

      setError(
        reason instanceof Error
          ? reason.message
          : "배우의 출연 작품을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleContentActor(actor: Actor) {
    setSelectedActors((current) => {
      const exists = current.some((item) => item.id === actor.id);

      if (exists) {
        return current.filter((item) => item.id !== actor.id);
      }

      return [...current, actor];
    });
  }

  function toggleActorContent(contentId: number) {
    setSelectedActorContentIds((current) => {
      if (current.includes(contentId)) {
        return current.filter((id) => id !== contentId);
      }

      return [...current, contentId];
    });
  }

  async function changeMode(nextMode: SearchMode) {
    setMode(nextMode);

    setSelectedContent(null);
    setSelectedActor(null);

    setSelectedActors([]);

    setSelectedActorContentIds([]);

    setContentActors([]);

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

  function goToPlanning() {
    const params = new URLSearchParams();

    if (mode === "CONTENT") {
      if (!selectedContent) {
        return;
      }

      params.set("contentIds", selectedContent.id.toString());

      params.set("title", selectedContent.title);

      if (selectedActors.length > 0) {
        params.set(
          "actorIds",
          selectedActors.map((actor) => actor.id).join(","),
        );

        params.set(
          "actorNames",
          selectedActors.map((actor) => actor.name).join(","),
        );
      }
    }

    if (mode === "ACTOR") {
      if (!selectedActor || contents.length === 0) {
        return;
      }

      /**
       * 작품을 선택하지 않으면
       * 배우의 전체 작품을 사용한다.
       */
      const effectiveContents =
        selectedActorContentIds.length > 0
          ? contents.filter((content) =>
              selectedActorContentIds.includes(content.id),
            )
          : contents;

      params.set(
        "contentIds",
        effectiveContents.map((content) => content.id).join(","),
      );

      params.set(
        "title",
        effectiveContents.length === 1
          ? effectiveContents[0].title
          : `${selectedActor.name}의 촬영지 코스`,
      );

      params.set("actorIds", selectedActor.id.toString());

      params.set("actorNames", selectedActor.name);
    }

    router.push(`/planning?${params.toString()}`);
  }

  const canContinue =
    mode === "CONTENT"
      ? selectedContent !== null
      : selectedActor !== null && contents.length > 0;

  return (
    <main className="mx-auto min-h-screen max-w-md p-6">
      <header className="mb-8">
        <BackButton className="mb-5" />

        <p className="text-sm font-medium text-gray-500">FAVEWAY</p>

        <h1 className="mt-2 text-2xl font-bold">여행 코스를 만들어볼까요?</h1>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          먼저 좋아하는 작품이나 배우를 선택해주세요.
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
          <section className="mb-6">
            <label
              htmlFor="content-search"
              className="mb-2 block font-semibold"
            >
              작품 검색
            </label>

            <input
              id="content-search"
              type="search"
              value={contentQuery}
              onChange={(event) => setContentQuery(event.target.value)}
              placeholder="예: 도깨비"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
            />
          </section>

          {!loading && (
            <section className="space-y-3">
              {filteredContents.map((content) => {
                const selected = selectedContent?.id === content.id;

                return (
                  <button
                    key={content.id}
                    type="button"
                    onClick={() => void selectContent(content)}
                    className={`w-full rounded-2xl border p-4 text-left ${
                      selected
                        ? "border-black bg-gray-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <p className="font-semibold">{content.title}</p>

                    <p className="mt-1 text-sm text-gray-500">
                      {content.media_type}

                      {content.release_year ? ` · ${content.release_year}` : ""}
                    </p>
                  </button>
                );
              })}
            </section>
          )}

          {selectedContent && (
            <section className="mt-8">
              <h2 className="font-semibold">원하는 배우 선택</h2>

              <p className="mt-1 text-sm text-gray-500">
                선택하지 않으면 작품 전체 촬영지를 기준으로 코스를 만듭니다.
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
                          : "border-gray-200 bg-white"
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
          <section>
            <label htmlFor="actor-search" className="mb-2 block font-semibold">
              배우 검색
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
                }
              }}
              placeholder="예: 공유"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
            />

            {actorLoading && (
              <p className="mt-3 text-sm text-gray-500">
                배우를 검색하는 중...
              </p>
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
                    <p className="font-semibold">{actor.name}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {!actorQuery.trim() && recommendedActors.length > 0 && (
            <section className="mt-8">
              <h2 className="font-semibold">이 배우는 어때요?</h2>

              <p className="mt-1 text-sm text-gray-500">
                등록된 배우 중 무작위로 추천해드려요.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {recommendedActors.map((actor) => (
                  <button
                    key={actor.id}
                    type="button"
                    onClick={() => void selectActor(actor)}
                    className="rounded-2xl border border-gray-200 px-3 py-4 text-sm font-semibold"
                  >
                    {actor.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {selectedActor && (
            <section className="mt-8">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">선택한 배우</p>

                <p className="mt-1 font-semibold">{selectedActor.name}</p>
              </div>

              <h2 className="mt-8 font-semibold">작품 선택</h2>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                원하는 작품만 선택할 수 있어요. 아무것도 선택하지 않으면 아래
                작품 전체가 자동으로 선택됩니다.
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
                        selected
                          ? "border-black bg-gray-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <p className="font-semibold">{content.title}</p>

                      {content.character_name && (
                        <p className="mt-1 text-sm text-gray-500">
                          배역: {content.character_name}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedActorContentIds.length === 0 && contents.length > 0 && (
                <p className="mt-3 text-xs text-gray-500">
                  현재 전체 {contents.length}개 작품을 대상으로 합니다.
                </p>
              )}
            </section>
          )}
        </>
      )}

      {error && (
        <p className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!canContinue || loading}
        onClick={goToPlanning}
        className="mt-10 w-full rounded-2xl bg-black py-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        여행 조건 선택하기
      </button>
    </main>
  );
}
