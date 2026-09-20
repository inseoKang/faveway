export type DocentMockState = "success" | "empty" | "error";

export type DocentMockStop = {
  contentId: number;
  contentTitle: string;
  placeId: number;
  order: number;
  verifiedFact: string | null;
  place: {
    name: string;
    address: string | null;
  };
};

export type MockDocentResult = {
  title: string;
  narration: string;
};

/**
 * Mock 상태 테스트용
 *
 * success → 정상 도슨트
 * empty   → 생성 가능한 정보 부족
 * error   → 생성 실패
 */
export const DOCENT_MOCK_STATE: DocentMockState = "success";

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function createMockPlaceDocent(
  stop: DocentMockStop,
): Promise<MockDocentResult | null> {
  await wait(700);

  if (DOCENT_MOCK_STATE === "error") {
    throw new Error(
      "AI 도슨트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  if (DOCENT_MOCK_STATE === "empty") {
    return null;
  }

  const sceneText = stop.verifiedFact?.trim();

  const narration = sceneText
    ? `${stop.place.name}은(는) ${stop.contentTitle}과 연결된 촬영지예요. ${sceneText} 작품 속 장면을 떠올리며 주변을 천천히 둘러보세요. 현장에서 직접 장면의 분위기를 느껴보는 것도 좋아요.`
    : `${stop.place.name}은(는) ${stop.contentTitle}과 연결된 촬영지예요. 아직 자세한 장면 설명은 준비 중이지만, 작품 속 공간을 떠올리며 주변을 천천히 둘러보세요.`;

  return {
    title: `${stop.place.name}의 이야기를 들어볼까요?`,
    narration,
  };
}

export async function createMockCourseDocent(
  stops: DocentMockStop[],
  courseTitle: string,
): Promise<MockDocentResult | null> {
  await wait(900);

  if (DOCENT_MOCK_STATE === "error") {
    throw new Error(
      "코스 AI 도슨트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  if (DOCENT_MOCK_STATE === "empty") {
    return null;
  }

  if (stops.length === 0) {
    return null;
  }

  const stopNarrations = stops.map((stop, index) => {
    const position =
      index === 0
        ? "첫 번째로"
        : index === stops.length - 1
          ? "마지막으로"
          : "다음으로";

    const fact = stop.verifiedFact?.trim();

    if (fact) {
      return `${position} ${stop.place.name}을(를) 만나볼게요. ${stop.contentTitle}의 촬영지로, ${fact}`;
    }

    return `${position} ${stop.place.name}을(를) 만나볼게요. ${stop.contentTitle}과 연결된 촬영지예요.`;
  });

  return {
    title: `${courseTitle} 이야기를 시작해볼까요?`,
    narration: [
      `오늘은 좋아하는 작품의 장면을 따라 촬영지 ${stops.length}곳을 걸어볼 거예요.`,
      ...stopNarrations,
      "각 장소에서는 현장 도슨트를 따로 열어 조금 더 자세한 이야기를 들어볼 수 있어요. 좋아하는 장면을 떠올리며 천천히 걸어볼까요?",
    ].join(" "),
  };
}