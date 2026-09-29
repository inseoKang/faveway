# FAVEWAY Data Fallback Policy

최종 업데이트: 2026-09-29.

## 1. 목적

FAVEWAY는 데이터가 부족한 경우에도
존재하지 않는 촬영지나 장면 정보를 임의로 생성하지 않습니다.

핵심 원칙:

```text
데이터 부족
≠
AI로 사실 생성
```

---

## 2. 기본 원칙

### 2.1 촬영지는 DB에 존재하는 실제 장소만 사용한다

```text
AI 생성 Place
→ 사용하지 않음

DB Place
→ 사용 가능
```

### 2.2 Scene 정보가 없으면 없는 상태를 유지한다

```text
Place 존재
Scene 없음
```

하지 않는 것:

- 장면 설명 임의 생성
- Episode 추측
- 배우 등장 장면 추측
- 검증되지 않은 장면을 사실처럼 표시

### 2.3 데이터 부족은 Error와 구분한다

```text
정상 조회 + 결과 없음
→ Empty

API / Network 실패
→ Error
```

### 2.4 자동 범위 확장보다 사용자 선택을 우선한다

```text
Candidate 부족
↓
자동 조건 변경 X
↓
사용자가 다음 행동 선택
```

---

## 3. 촬영지 후보 수 기준

### 3.1 촬영지 후보가 0개

```text
Candidate Place = 0
↓
Course 생성하지 않음
↓
Empty
```

### 3.2 촬영지 후보가 1개

```text
Candidate Place = 1
↓
1개 장소 Course
```

이동 구간이 없으므로:

```text
도보 시간 0분
이동 거리 0km
체류 시간 중심 Course
```

로 표시합니다.

### 3.3 촬영지 후보가 2개 이상

```text
Candidate ≥ 2
↓
Route 조합
↓
여행 조건 검증
↓
Course 생성
```

---

## 4. 1개 장소 Course 이유 분류

```text
NORMAL
ONLY_ONE_CANDIDATE
WALKING_LIMIT
DURATION_LIMIT
MULTIPLE_CONSTRAINTS
```

Frontend는 이 값을 이용해
왜 현재 Course가 1곳인지 설명합니다.

---

## 5. 서비스 지역 범위 정책

현재 FAVEWAY의 Course 범위는 서울입니다.

```text
region = 서울
+
is_active !== false
```

인 촬영지만 Course Candidate로 사용합니다.

서울 외 촬영지는:

```text
DB에서 삭제하지 않음
↓
현재 Course에서만 제외
```

합니다.

서비스 지역 밖의 데이터가 있다는 이유로
장소를 비활성화하지 않습니다.

```text
is_active
→ 현재 방문 가능한 장소 여부

region
→ 현재 서비스 범위 여부
```

를 분리해서 관리합니다.

예:

```text
월정사
is_active = true
region = 강원
↓
데이터는 유효
서울 Course에서는 제외
```

폐점 장소는 별도로:

```text
is_active = false
```

처리합니다.

---

## 6. 좌표 부족 정책

### Explore

좌표가 없어도 장소 정보는 사용할 수 있습니다.

### Place Detail

주소 기반 Kakao 검색 fallback을 사용할 수 있습니다.

### Course

```text
Place 존재
+
좌표 없음
↓
Course Candidate 제외
```

---

## 7. Scene 정보 부족 정책

```text
Place 존재
Scene 없음
↓
Place 사용 가능
Scene 정보 없음 표시
```

하지 않는 것:

```text
LLM으로 Scene 생성
Episode 추측
배우 등장 여부 추측
```

---

## 8. Actor 기반 데이터 부족 정책

```text
Actor
↓
scene_actors
↓
Scene
↓
scene_places
↓
Place
```

관계를 사용합니다.

```text
Actor Scene Candidate = 0
↓
Empty
```

---

## 9. 사용자 선택 기반 범위 확장

사용자에게:

```text
[배우 조건 없이 작품 전체로 넓혀보기]

[작품 / 배우 다시 선택하기]
```

를 제공합니다.

사용자가 선택한 경우에만:

```text
actorIds
→ []
```

로 변경합니다.

서울 지역 제한은 그대로 유지합니다.

---

## 10. 여행 조건으로 여러 장소를 묶을 수 없는 경우

```text
3곳 실패
↓
2곳 시도
↓
1곳 시도
```

유효한 1개 장소 후보가 있다면
1개 장소 Course를 정상 생성할 수 있습니다.

---

## 11. 일반 장소 추천 정책

```text
촬영지 부족
↓
자동 일반 장소 추가 X
```

---

## 12. AI Recommendation 데이터 부족 정책

```text
Validated Candidate IDs
↓
LLM
↓
Candidate Ranking
```

DB에 없는 Place ID는 유효하지 않은 결과로 처리합니다.

현재:

```text
정책 정의 완료
AI Recommendation 구현 예정
```

---

## 13. AI Docent 기본 정책

AI Docent는 서버가 DB에서 다시 조회한 Scene 기록과
허용 조건을 만족하는 evidence를 사용합니다.

```text
Client
↓
contentId / placeId / order
↓
Server
↓
DB Context
↓
AI Docent
```

---

## 14. AI Docent 입력 데이터

현재 서버 Context:

```text
Content
Place
Scene
Episode
Scene Actor
Verified Evidence
```

향후 추가 예정:

```text
Place Description
User Preference
Travel Mood
```

---

## 15. verified_fact 검증 정책

현재 narration evidence 허용 조건:

```text
verification_status === "PUBLIC_DATA"
+
verified_fact가 문자열
+
verified_fact.trim().length > 0
```

`UNVERIFIED`의 `verified_fact`는 생성 Context의 evidence에서 제외합니다.
`source_type`이나 출처 개수만으로 evidence를 허용하지 않습니다.
현재 필터는 `source_url` / `verified_at` 존재 여부를 검사하지 않습니다.

Scene description은 evidence와 별도로 전달합니다.
`PUBLIC_DATA`는 개별 촬영 관계 사실의 사용 조건이며,
Scene / Episode / Actor 정보까지 독립 검증됐다는 의미는 아닙니다.
Prompt는 Scene 기록에 명시된 범위에서만 설명하도록 제한합니다.

이 구조는 생성 근거를 제한하는 구현이며,
생성 문장의 사실 정확성을 자동으로 보증하는 검증기는 아닙니다.

---

## 16. AI Docent 생성 가능 기준

Place Docent 기준:

```text
Scene description
또는
검증된 verified_fact
```

둘 다 없다면:

```text
AI 생성 X
↓
DOCENT_CONTEXT_INSUFFICIENT
↓
정보 부족 안내
```

Course Docent는 모든 Stop의 Context가 존재해야 하며,
최소 한 Stop에 위 생성 근거가 있으면 생성합니다.
모든 Stop에 근거가 없으면 `422`, Context가 하나라도 없으면 `404`입니다.
근거가 없는 Stop은 이름과 선택 작품만 언급하도록 Prompt로 제한합니다.

---

## 17. Scene 없는 AI Docent

Scene이 없어도
검증된 `verified_fact`가 있다면
그 사실 범위 안에서 생성 가능합니다.

```text
Scene description 없음
+
허용 조건을 만족하는 verified_fact 없음
↓
Place Docent 생성하지 않음
```

---

## 18. Episode 없는 경우

```text
Episode 없음
→ 입력에서 null
→ 설명에서 생략
```

---

## 19. Actor 정보 부족

```text
Scene Actor 없음
→ 배우 이름 생성 X
```

---

## 20. Source 부족 정책

`source_url`이 없다는 이유로
가짜 출처를 생성하지 않습니다.

---

## 21. AI Docent 실제 호출 제어

로컬 환경에서 Course Docent 생성과 화면 표시까지 성공했습니다.
호출 활성화 여부는 환경변수로 제어합니다.
`ENABLE_OPENAI_DOCENT`가 정확히 `true`가 아닌 모든 경우에 차단합니다.

```env
ENABLE_OPENAI_DOCENT=false
```

이 상태에서는:

```text
POST /api/docents/place
POST /api/docents/course
↓
DOCENT_NOT_ENABLED
```

로 종료합니다.

---

## 22. AI Docent 실제 API UX

현재 상태:

```text
Place / Course UI → 실제 API 요청 연결
Course Docent → 실제 생성 및 DocentDialog 표시 성공
Place Docent → 최종 생성 성공 검증 대기
```

`DocentDialog`는 Mock 생성 함수를 호출하지 않습니다.
다만 `DocentMockStop`, `MockDocentResult` 타입을 `docent-mock.ts`에서 가져오며,
Course 페이지도 `DocentMockStop` 타입에 의존합니다.
Mock 파일과 타입 의존성 제거는 다음 작업입니다.

API는 `ko` / `en`을 허용하지만,
현재 UI 요청은 `language: "ko"`로 고정되어 있습니다.
언어 선택 UI와 영어 출력 품질 검증은 아직 남아 있습니다.

지원 상태:

```text
Loading
Success
Empty
Error
Retry
```

---

## 23. Course Docent와 Place Docent

### Course Docent

```text
이 코스 이야기 듣기
```

### Place Docent

```text
현장에서 도슨트 듣기
```

PlaceDetailDialog 내부에는
중복된 Docent CTA를 추가하지 않습니다.

```text
PlaceDetailDialog
→ 사실 / 상세 정보

DocentDialog
→ 도슨트 경험
```

---

## 24. AI Docent Prompt 금지 사항

```text
DB에 없는 촬영지
DB에 없는 Scene
Episode 추측
Actor 추측
실제 대사
촬영 상황 추측
시설
내부 공간
촬영 구도
출입 가능 여부
운영 시간
촬영 허가 정보
```

실제 배우처럼 1인칭으로 사칭하지 않습니다.

---

## 25. AI Docent 오류 분류

### `DOCENT_CONTEXT_NOT_FOUND`

```text
→ 현재 DocentDialog에서는 Error + Retry
```

### `DOCENT_CONTEXT_INSUFFICIENT`

```text
→ Empty
```

### `DOCENT_GENERATION_FAILED`

```text
→ Error + Retry
```

### `DOCENT_NOT_ENABLED`

HTTP 503이며 현재 UI는 Error + Retry로 표시합니다.
재시도만으로 활성화되지 않으므로 서버 환경설정 확인이 필요합니다.

### OpenAI 429

OpenAI 측 429는 현재 Route Handler에서 `500 DOCENT_GENERATION_FAILED`로 변환합니다.
2026-09-29의 `credit_balance_exhausted`는 기존 shell API Key 충돌을 해결한 뒤 해소됐습니다.
모든 429가 같은 원인이라는 뜻은 아닙니다.
실제 오류 코드와 서버 실행 환경을 확인해야 합니다.

---

## 26. TTS 정책

현재 TTS는 구현하지 않았습니다.

```text
DB Context 정확성
↓
AI Text 품질
↓
Docent UX
↓
TTS
```

순서로 진행합니다.

---

## 27. TMAP 실패 정책

```text
TMAP 성공 구간
→ 실제 보행 경로

TMAP 실패 구간
→ Haversine fallback
```

상태:

```text
real
partial
fallback
```

---

## 28. 상태 분류

### Empty

```text
촬영지 없음
Actor → Scene → Place 결과 없음
좌표가 있는 Course 후보 없음
조건에 맞는 Route 없음
AI Docent 최소 근거 없음
```

### Partial

```text
Scene 없음
Episode 없음
source 없음
좌표 없음
TMAP 일부 실패
```

### Error

```text
Supabase 요청 실패
Trip API 실패
AI 생성 실패
Network Error
```

### 1개 장소 Course

```text
정상 결과
```

---

## 29. 현재 정책 및 구현 상태 요약

| 상황                      | 처리                                       | 구현      |
| ------------------------- | ------------------------------------------ | --------- |
| 촬영지 0개                | Course 생성 안 함 + Empty                  | 완료      |
| 촬영지 1개                | 1개 장소 Course 허용                       | 완료      |
| 1개 장소 이유 안내        | `routeSelectionReason`                     | 완료      |
| 촬영지 2개 이상           | Route 탐색                                 | 완료      |
| 서울 외 장소              | DB 유지, Course 제외                       | 완료      |
| 비활성 장소               | Course 제외                                | 완료      |
| 좌표 없음                 | Explore/Detail 가능, Course 제외           | 완료      |
| Scene 없음                | 추측하지 않음                              | 완료      |
| Episode 없음              | 표시하지 않음                              | 완료      |
| Actor Scene 관계 없음     | 배우 장소로 추측하지 않음                  | 완료      |
| 배우 후보 부족            | 사용자 선택 시 배우 조건 제거              | 완료      |
| 자동 범위 확장            | 수행하지 않음                              | 완료      |
| TMAP 실패                 | Haversine fallback                         | 완료      |
| 일반 장소 자동 추가       | 하지 않음                                  | 완료      |
| AI Recommendation         | DB Candidate 안에서만 선택                 | 구현 예정 |
| AI Docent 서버 기반       | DB Context → LLM 구조                      | 완료      |
| Place / Course Docent API | Route Handler                              | 완료      |
| AI Prompt 정책            | 사실 생성 및 배우 사칭 제한                | 완료      |
| AI 입력 근거 부족         | Docent 생성 제한                           | 완료      |
| AI Docent 실제 API UX     | Loading / Success / Empty / Error / Retry  | 구현 완료 |
| 실제 DB Evidence 필터     | PUBLIC_DATA + 비어 있지 않은 verified_fact | 구현 완료 |
| 실제 OpenAI UI 연결       | Place / Course 실제 요청                   | 구현 완료 |
| Course Docent 실제 생성   | 생성 및 화면 표시                          | 성공 확인 |
| Place Docent 실제 생성    | 최종 생성·표시 검증                        | 검증 대기 |
| Mock 파일 / 타입 정리     | 남은 Mock 타입 의존성 제거                 | 예정      |
| TTS                       | 텍스트 검증 후 연결                        | 예정      |

---

## 30. 핵심 원칙

### 1. 없는 장소를 만들지 않는다

```text
Place 없음
→ 생성하지 않음
```

### 2. 없는 장면을 만들지 않는다

```text
Scene 없음
→ 추측하지 않음
```

### 3. 서비스 범위 밖 데이터는 삭제하지 않는다

```text
서울 외 Place
→ DB 유지
→ 현재 Course에서 제외
```

### 4. 데이터 부족과 시스템 오류를 구분한다

```text
No Data
≠
Error
```

### 5. AI는 검증된 정보를 설명한다

```text
DB Fact
↓
AI Explanation
```

---

## 31. 현재 코드와 정책의 경계

- AI의 추측을 금지하는 Prompt와 실제 출력의 정확성 보증은 구분합니다. Prompt 품질 검증은 남아 있습니다.
- Course 후보 선정은 PUBLIC_DATA 상태만 허용하는 구조가 아닙니다. Docent의 narration evidence 필터와 별개입니다.
- 현재 활성 필터는 `is_active !== false`입니다. null을 false로 취급하는 구현은 아닙니다.
- 배우별 장소 조회에는 서울 필터가 없고, Trip / 작품별 장소 조회에는 서울 필터가 있습니다.
- 좌표 `null`이 포함된 Walking Route 구간은 실패 처리하지만, 요청 필드 자체가 잘못된 경우에는 요청 전체를 거절합니다.
- 서버의 설명 근거 부족 422는 Empty이고, Context 없음 404는 현재 UI에서 Error입니다.
- API Error / Retry 분기는 구현되어 있지만 모든 실패 시나리오의 실제 재현 검증 완료를 뜻하지 않습니다.
