# FAVEWAY API

최종 업데이트: 2026-09-29.

FAVEWAY의 Frontend에서 사용하는 Next.js Route Handler API를 정리합니다.

FAVEWAY는 별도의 Backend 서버를 두지 않고
Next.js App Router의 Route Handler를 API 계층으로 사용합니다.

---

# 1. Contents

## `GET /api/contents`

등록된 작품 목록을 조회합니다.

주요 사용 위치:

- 작품 기준 탐색
- Planning
- Course 장소 추가 후보 조회

---

## `GET /api/contents/:contentId/actors`

특정 작품에 출연한 배우를 조회합니다.

```text
Content
↓
content_actors
↓
Actors
```

주요 사용 위치:

- 작품 기준 탐색
- 작품 선택 후 배우 필터

---

## `GET /api/contents/:contentId/places`

특정 작품과 연결된 촬영지를 조회합니다.

현재 Course 서비스 범위에 맞춰
다음 조건을 만족하는 장소만 반환합니다.

```text
is_active !== false
+
region = 서울
```

배우 필터가 없는 경우
작품 기준 서울 활성 촬영지를 사용합니다.

```text
Content
↓
Place Relation
↓
Place
↓
Active
↓
서울
```

Course의 장소 추가 후보도
이 API를 사용합니다.

---

## `GET /api/contents/:contentId/places?actorIds=3,5`

특정 작품의 서울 활성 촬영지 중
선택한 배우가 실제 등장한 Scene과 연결된 장소만 조회합니다.

복수 배우는 현재 OR 조건입니다.

```text
Actor A Scene
UNION
Actor B Scene
↓
Place
↓
Active
↓
서울
```

배우가 작품에 출연했다는 사실만으로
해당 작품의 모든 촬영지를 배우 관련 장소로 취급하지 않습니다.

핵심 관계:

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

---

## `GET /api/contents/:contentId/places/:placeId`

특정 작품과 장소에 대한 상세 정보를 조회합니다.

주요 응답 정보:

- 작품
- 장소
- Scene
- Episode
- Scene 등장 배우
- verified_fact
- verification_status
- source_type
- source_url
- verified_at

장면 정보나 출처 정보가 없는 경우
존재하지 않는 정보를 생성하지 않고 빈 상태로 전달합니다.

---

# 2. Actors

## `GET /api/actors/search?q=`

배우 이름을 부분 검색합니다.

예:

```text
/api/actors/search?q=공
```

주요 사용 위치:

- 배우 기준 탐색
- Planning

---

## `GET /api/actors/recommendations`

촬영 Scene 데이터가 존재하는 배우 중 일부를 추천합니다.

API는 Scene Actor 관계가 있는 배우를 조회하고 무작위 정렬 후 최대 3명을 반환합니다.
AI 추천이나 개인화 점수 기반 선정은 아닙니다.

---

## `GET /api/actors/:actorId/contents`

특정 배우가 출연한 작품을 조회합니다.

```text
Actor
↓
content_actors
↓
Contents
```

배우 기준 탐색에서 작품 필터 후보를 구성할 때 사용합니다.

---

## `GET /api/actors/:actorId/places`

특정 배우가 실제 등장한 Scene과 연결된 촬영지를 조회합니다.

현재 이 API는 `is_active !== false`를 확인하지만 서울 `region` 필터는 적용하지 않습니다.
작품별 촬영지 API 및 Trip API의 서울 제한과 구분합니다.

```text
Actor
↓
scene_actors
↓
Scenes
↓
scene_places
↓
Places
```

동일한 장소가 여러 Scene을 통해 조회될 수 있으므로
현재 다음 조합을 기준으로 중복을 제거합니다.

```text
content_id + place_id
```

---

## `GET /api/actors/:actorId/places?contentIds=1,2`

배우 촬영지를 선택한 작품 범위로 제한합니다.

복수 작품을 지원합니다.

작품을 선택하지 않은 경우
해당 배우의 전체 관련 작품을 대상으로 조회할 수 있습니다.

---

# 3. Trips

## `POST /api/trips`

DB에 저장된 실제 촬영지 후보를 이용해
규칙 기반 Course를 생성합니다.

AI가 촬영지를 생성하지 않습니다.

현재 Course 대상 지역:

```text
서울
```

---

## Request

```json
{
  "contentIds": [1, 4],
  "actorIds": [3, 5],
  "durationMinutes": 240,
  "maxWalkingMinutes": 20
}
```

---

## Request Fields

### `contentIds`

- 필수
- 1개 이상
- 복수 작품 지원

### `actorIds`

- 빈 배열 가능
- 빈 배열이면 선택 작품 전체 촬영지 사용
- 값이 있으면 `Actor → Scene → Place` 관계로 후보 제한
- 복수 배우 선택 시 현재 OR 조건

### `durationMinutes`

현재 UI 지원 값:

```text
180
240
300
```

각각:

```text
3시간
4시간
5시간
```

### `maxWalkingMinutes`

현재 UI 지원 값:

```text
10
20
30
null
```

`null`은 한 구간 최대 도보 시간 제한을 적용하지 않는다는 의미입니다.

---

# 4. Trip 처리 흐름

```text
contentIds
+
actorIds
↓
Candidate 조회
↓
활성 장소 확인
↓
서울 지역 필터
↓
Actor → Scene → Place Filtering
↓
place_id 기준 중복 제거
↓
좌표 확인
↓
Route 조합 생성
↓
Haversine 기반 초기 거리 계산
↓
예상 도보 시간 계산
↓
구간별 최대 도보 시간 검증
↓
전체 여행 시간 검증
↓
조건을 만족하는 Route 중 총 이동거리 최소 Route 선택
↓
Course 반환
```

장소별 최소 체류 시간:

```text
45분
```

여행 시간별 최대 기본 방문 장소 수:

```text
180분 → 최대 2곳
240분 → 최대 3곳
300분 → 최대 4곳
```

최대 장소 수의 Route가 조건을 만족하지 않으면
장소 수를 하나씩 줄여 다시 탐색합니다.

```text
3곳 실패
↓
2곳 시도
↓
1곳 시도
```

1개 장소 Course도 정상 결과로 허용합니다.

초기 Course 선택은 빠른 Route 조합 비교를 위해
Haversine 기반 거리와 예상 도보 시간을 사용합니다.

Course 화면에 진입한 뒤에는
`POST /api/routes/walking`을 통해
TMAP 실제 보행 경로를 다시 조회합니다.

---

# 5. Course 지역 필터

현재 초기 서비스 범위는 서울입니다.

Course 후보 조건:

```text
places.is_active !== false
+
places.region = 서울
+
좌표 존재
```

서울 외 장소는 DB에서 삭제하지 않습니다.

예:

```text
월정사
포스코타워송도
나주영상테마파크
```

등의 촬영지 데이터는 DB에 유지하지만
현재 Course 후보에서는 제외합니다.

Course 장소 추가 후보 조회에도
같은 지역 조건을 적용합니다.

---

# 6. Trip Success Response

예:

```json
{
  "data": {
    "contentIds": [1],
    "actorIds": [3],
    "durationMinutes": 180,
    "maxWalkingMinutes": 10,
    "candidateSource": "ACTOR_SCENE",
    "candidateCount": 1,
    "routeSelectionReason": "ONLY_ONE_CANDIDATE",
    "totalDistanceKm": 0,
    "totalWalkingMinutes": 0,
    "stops": [
      {
        "contentId": 1,
        "contentTitle": "작품명",
        "placeId": 10,
        "order": 1,
        "stayMinutes": 180,
        "distanceFromPreviousKm": 0,
        "walkingMinutesFromPrevious": 0,
        "relationType": "SCENE_ACTOR",
        "verificationStatus": "UNVERIFIED",
        "verifiedFact": null,
        "place": {}
      }
    ]
  }
}
```

---

## `candidateSource`

```text
ACTOR_SCENE
→ 배우가 등장한 Scene과 연결된 촬영지 기준

CONTENT
→ 선택 작품 전체 촬영지 기준
```

---

## `candidateCount`

```text
작품 / 배우 조건
↓
활성 장소
↓
서울 지역
↓
중복 제거
↓
좌표 검증
↓
candidateCount
```

---

## `routeSelectionReason`

### `NORMAL`

```text
2곳 이상의 유효한 Course 생성
```

### `ONLY_ONE_CANDIDATE`

```text
현재 조건에서
Course에 사용할 수 있는 후보 자체가 1곳
```

### `WALKING_LIMIT`

```text
후보는 여러 곳
+
최대 도보 시간 조건
↓
2곳 이상의 Route 불가
```

### `DURATION_LIMIT`

```text
후보는 여러 곳
+
여행 가능 시간 조건
↓
2곳 이상의 Route 불가
```

### `MULTIPLE_CONSTRAINTS`

```text
여행 시간
+
최대 도보 시간
↓
두 조건을 함께 적용하면
2곳 이상의 유효 Route 불가
```

Frontend는 1개 장소 Course를 Error로 처리하지 않고
이 값을 이용해 결과 이유와 다음 행동을 안내합니다.

---

# 7. 배우 조건 제거 재요청

배우 기준 후보가 부족한 경우
애플리케이션이 자동으로 작품 전체 범위로 확장하지 않습니다.

사용자가 직접:

```text
배우 조건 없이 작품 전체로 넓혀보기
```

를 선택한 경우에만 재요청합니다.

```json
{
  "contentIds": [1],
  "actorIds": [],
  "durationMinutes": 180,
  "maxWalkingMinutes": 10
}
```

작품, 여행 가능 시간, 최대 도보 시간은 유지하고
배우 필터만 제거합니다.

서울 지역 제한은 그대로 유지됩니다.

---

# 8. Trip Error Handling

Trip API는 가능한 경우 다음 형태로 오류를 반환합니다.

```json
{
  "code": "ERROR_CODE",
  "message": "오류 설명"
}
```

## `INVALID_TRIP_CONDITIONS`

HTTP `400`

잘못된 작품 조건, 여행 시간 또는 최대 도보 시간이 전달된 경우입니다.

## `NO_FILMING_LOCATIONS`

HTTP `404`

선택 조건과 연결된 서울 활성 촬영지가 없는 경우입니다.

## `NO_COORDINATED_FILMING_LOCATIONS`

HTTP `404`

서울 활성 촬영지는 존재하지만
Course 계산에 필요한 좌표가 없는 경우입니다.

## `NO_AVAILABLE_ROUTE`

HTTP `422`

현재 여행 조건을 만족하는 Route를 만들 수 없는 경우입니다.

## `TRIP_CANDIDATES_FETCH_FAILED`

HTTP `500`

Supabase에서 Course 후보를 조회하지 못한 경우입니다.

## `TRIP_CREATION_FAILED`

HTTP `500`

예상하지 못한 Course 생성 오류입니다.

---

# 9. Walking Route

## `POST /api/routes/walking`

Course 전체 장소 목록을 한 번에 전달하면
서버에서 인접 장소별 TMAP 보행 경로를 조회합니다.

```json
{
  "stops": [
    {
      "placeId": 1,
      "name": "장소 A",
      "latitude": 37.123,
      "longitude": 126.123
    },
    {
      "placeId": 2,
      "name": "장소 B",
      "latitude": 37.456,
      "longitude": 126.456
    }
  ]
}
```

처리:

```text
Client
↓
POST /api/routes/walking 1회

Server
↓
A → B
B → C
C → D
↓
TMAP 조회
↓
결과 통합
```

---

# 10. Walking Route 부분 실패

한 구간의 TMAP 요청 실패가
Course 전체 실패로 이어지지 않도록 구성합니다.

```text
TMAP 성공 구간
→ 실제 경로

TMAP 실패 구간
→ success: false
→ Frontend Haversine fallback
```

좌표가 없는 구간도 해당 segment만 실패 처리합니다.

---

# 11. AI Docent

AI Docent는
DB에 존재하는 작품·장면·배우·장소·검증 정보를 기반으로
현장 안내용 텍스트를 생성하는 기능입니다.
현재 음성 재생은 구현하지 않았습니다.

AI가 촬영지나 장면 자체를 생성하지 않습니다.

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

실제 OpenAI 호출은 환경변수로 비활성화할 수 있습니다.

---

## `POST /api/docents/place`

특정 작품과 장소에 대한 Place Docent를 생성합니다.

### Request

```json
{
  "contentId": 1,
  "placeId": 10,
  "language": "ko"
}
```

지원 언어:

```text
ko
en
```

Client는 Scene 설명이나 verified_fact를 직접 전달하지 않습니다.

```text
Client
↓
contentId + placeId
↓
Server
↓
Supabase 재조회
↓
Content
Place
Scene
Actor
verified_fact
↓
LLM
```

---

## `POST /api/docents/course`

Course 전체 장소를 순서대로 연결한 Course Docent를 생성합니다.

### Request

```json
{
  "stops": [
    { "contentId": 1, "placeId": 10, "order": 1 },
    { "contentId": 1, "placeId": 15, "order": 2 }
  ],
  "language": "ko"
}
```

ID는 설명용 예시입니다.
`stops`는 1~10개이며 각 ID와 `order`는 양의 안전한 정수여야 합니다.
서버는 `order` 오름차순으로 정렬합니다.
중복 ID / 중복 order / 연속 순번 여부를 별도로 검사하지는 않습니다.

Client가 전달하는 정보는 식별자, 방문 순서, 언어입니다.

각 장소의 장면과 검증 정보는
서버가 다시 DB에서 조회합니다.

---

# 12. AI Docent Context

AI Docent Context는 다음 데이터를 기준으로 구성합니다.

```text
Content
+
Place
+
Scene
+
Scene Actor
+
Verified Evidence
```

Scene과 Actor는 다음 관계를 사용합니다.

```text
Place
↓
scene_places
↓
Scene
↓
scene_actors
↓
Actor
```

Scene은 요청된 `contentId` 범위로 다시 제한합니다.

---

# 13. verification_status와 Evidence 정책

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

# 14. AI Docent 최소 근거

Place Docent는 다음 중 하나 이상이 있어야 생성 가능합니다.

```text
Scene description
또는
검증된 verified_fact
```

둘 다 없다면 `422 DOCENT_CONTEXT_INSUFFICIENT`를 반환합니다.

Course Docent는 각 Stop의 작품·장소 Context가 모두 존재해야 합니다.
하나라도 조회되지 않으면 `404 DOCENT_CONTEXT_NOT_FOUND`입니다.
Context가 모두 존재할 때, 최소 한 Stop에 Scene description 또는 허용된 evidence가 있으면 생성합니다.
모든 Stop에 설명 근거가 없으면 `422`입니다.
근거가 없는 Stop은 Prompt에서 장소명과 선택 작품만 언급하도록 제한합니다.

```json
{
  "code": "DOCENT_CONTEXT_INSUFFICIENT",
  "message": "아직 도슨트를 만들 만큼 충분한 장면 정보가 준비되지 않았어요."
}
```

---

# 15. AI Docent Error Handling

## `DOCENT_NOT_ENABLED`

HTTP `503`

실제 OpenAI 호출이 비활성화된 상태입니다.

```env
ENABLE_OPENAI_DOCENT=false
```

## `INVALID_DOCENT_REQUEST`

HTTP `400`

잘못된 ID, 언어 또는 Course Stop이 전달된 경우입니다.

## `DOCENT_CONTEXT_NOT_FOUND`

HTTP `404`

요청한 작품 또는 장소가 없거나, 장소가 `is_active === false`이거나,
해당 작품의 Scene 연결과 `place_relations` 행이 모두 없는 경우입니다.
Docent Context 조회 자체에는 서울 지역 필터가 없습니다.

## `DOCENT_CONTEXT_INSUFFICIENT`

HTTP `422`

도슨트를 생성할 최소 근거가 부족한 경우입니다.

## `DOCENT_GENERATION_FAILED`

HTTP `500`

DB Context 조회 예외, API Key 미설정, LLM 요청 실패,
빈 출력, JSON 파싱 실패 또는 예상하지 못한 생성 오류입니다.
OpenAI 측 `429 credit_balance_exhausted`도 현재 앱에서는 이 `500` 오류로 반환됩니다.
OpenAI의 상태 코드를 Frontend에 그대로 전달하지 않습니다.

---

# 16. AI Docent 생성 제한

Prompt에서는 다음 생성을 금지합니다.

- DB에 없는 촬영지
- DB에 없는 Scene
- Episode 추측
- 배우 등장 여부 추측
- 실제 대사 생성
- 시설 및 내부 공간 추측
- 촬영 구도 추측
- 출입 가능 여부 추측
- 운영 시간 추측
- 촬영 허가 여부 추측
- 실제 배우가 직접 말하는 것처럼 사칭

---

# 17. AI Docent 활성화

현재 Route Handler는 다음 조건에서만 실제 생성을 허용합니다.

```text
ENABLE_OPENAI_DOCENT === "true"
```

미설정 또는 다른 값이면 `503 DOCENT_NOT_ENABLED`로 종료합니다.
`.env.example`은 안전한 예시값으로 `ENABLE_OPENAI_DOCENT=false`를 유지합니다.
로컬에서는 호출을 활성화해 Course 생성과 화면 표시까지 확인했습니다.
배포 환경 설정은 다음 작업입니다.

관련 서버 환경변수:

```env
ENABLE_OPENAI_DOCENT=true
OPENAI_API_KEY=
OPENAI_DOCENT_MODEL=
```

실제 API Key는 서버 환경변수로 관리합니다.
현재 코드의 기본 모델은 `gpt-5-mini`이며,
`OPENAI_DOCENT_MODEL` 값이 있으면 해당 값으로 대체합니다.

API Key는 Route Handler에서 사용하는 OpenAI Client가 읽습니다.
현재 Client는 요청 시 생성되며 API Key가 없으면 오류를 발생시킵니다.

2026-09-29에는 기존 shell의 `OPENAI_API_KEY`가
프로젝트 `.env.local`의 키보다 우선 적용되어 다른 환경으로 요청된 문제가 있었습니다.
기존 환경변수를 해제하고 개발 서버를 다시 시작한 뒤 Course 생성에 성공했습니다.
새 shell에서도 같은 문제가 재발하는지와 영구 설정 정리는 후속 확인 대상입니다.

---

# 18. Frontend 상태 처리 기준

Frontend에서는 API 결과를 모두 같은 실패 상태로 처리하지 않습니다.

```text
Loading
Empty
Error
Partial / Fallback
Validation
```

AI Docent 실제 API UX에서는:

```text
Loading
Success
Empty
Error
Retry
```

상태를 분리합니다.

현재 `422`이면서 `DOCENT_CONTEXT_INSUFFICIENT`인 응답만 Empty로 처리합니다.
`404`, `503`, `500` 등 그 밖의 실패는 Error와 다시 시도 버튼으로 표시합니다.
요청 대상이 없거나 Course Stops가 비어 있는 경우도 Empty로 처리합니다.
Docent 오류가 Course 페이지 전체 오류로 전파되지는 않습니다.

---

# 19. API 설계 원칙

## 1. 촬영지 사실은 DB에서 가져온다

```text
DB Place
→ 사용

AI Generated Place
→ 사용하지 않음
```

## 2. 배우 촬영지는 Scene 관계를 기준으로 한다

```text
Actor
↓
Scene
↓
Place
```

## 3. Course는 현재 서울 활성 장소만 사용한다

```text
is_active
+
region = 서울
```

## 4. Empty와 Error를 구분한다

```text
정상 조회 + 결과 없음
→ Empty

API / DB / Network 실패
→ Error
```

## 5. 부분 실패가 전체 기능 실패로 전파되지 않게 한다

```text
TMAP 실패
→ 해당 구간 Haversine fallback
```

## 6. 데이터 부족 시 조건을 자동 변경하지 않는다

사용자가 직접 선택한 경우에만
배우 조건을 제거해 Course를 다시 생성합니다.

## 7. AI 입력은 서버에서 다시 구성한다

```text
Client ID
↓
Server DB Query
↓
Verified Context
↓
LLM
```

Client가 전달한 설명 문자열을
AI의 사실 근거로 직접 신뢰하지 않습니다.

## 8. 실제 AI 호출은 환경변수로 제어한다

개발 중 의도하지 않은 비용 발생을 막기 위해
실제 OpenAI 호출 여부를 별도로 제어합니다.

---

# 20. AI Docent 성공 응답

응답 구조 예시:

## Place

```json
{
  "data": {
    "type": "place",
    "contentId": 1,
    "placeId": 10,
    "language": "ko",
    "title": "생성된 제목",
    "narration": "생성된 설명",
    "generatedFrom": {
      "sceneIds": [1],
      "hasVerifiedFact": true
    }
  }
}
```

## Course

```json
{
  "data": {
    "type": "course",
    "language": "ko",
    "title": "생성된 제목",
    "narration": "생성된 설명",
    "generatedFrom": {
      "stops": [
        {
          "contentId": 1,
          "placeId": 10,
          "order": 1,
          "sceneIds": [1],
          "hasVerifiedFact": true
        }
      ]
    }
  }
}
```

`generatedFrom`은 입력 Context의 메타데이터이며 문장별 사실 검증 결과는 아닙니다.
UI는 현재 `title`과 `narration`을 표시합니다.

생성 요청은 OpenAI Responses API의 strict JSON Schema를 사용합니다.
`title` / `narration` 문자열 두 필드만 허용하며,
서버에서 JSON 파싱 후 공백이 아닌 문자열인지 다시 확인합니다.
현재 `reasoning.effort`는 `low`, `store`는 `false`입니다.
`max_output_tokens`는 Place 700, Course 1200입니다.
이는 요청 설정이며 목표 글자 수나 사실 정확성을 보증하지 않습니다.

---

# 21. 현재 입력 검증 범위

- Trip API의 시간 값은 양의 정수를 허용합니다. UI의 180 / 240 / 300분 목록으로만 제한하지 않습니다.
- 최대 도보 시간도 `null` 또는 양의 정수를 허용합니다.
- Trip의 JSON 파싱 예외는 현재 외부 catch에서 `500 TRIP_CREATION_FAILED`로 처리합니다.
- Trip 후보의 좌표 검사는 null 여부와 유한 숫자 여부입니다. 위경도 범위나 실제 도로 접근성을 검증하지는 않습니다.
- Walking Route는 좌표에 `null`을 허용하고 해당 구간을 실패 처리합니다. 필드 누락·문자열 등 요청 형식 오류는 요청 전체 `400`입니다.
- Docent / Walking Route의 잘못된 JSON 문법은 400으로 처리하지만, 파싱된 본문 전체가 null인 경우 등은 별도 방어가 완전하지 않습니다. 모든 입력 오류를 400으로 처리한다고 보장하지 않습니다.
- Walking Route는 최소 2개 Stop을 요구합니다. 1개 장소 Course에서는 Frontend가 경로 호출을 생략합니다.
- Walking Route의 TMAP Key 미설정은 `500`, 정상 처리 응답은 `{ "data": { "segments": [...] } }`입니다.
- Course 후보는 `is_active !== false`로 필터링합니다. `true`만 허용하는 검사와는 다릅니다.
- 현재 Course 화면의 입력 구조 검증은 `is_active`에 boolean을 요구합니다. DB의 null 허용 여부는 별도 확인 대상입니다.
- Trip 후보 선정은 `verification_status === "PUBLIC_DATA"`를 필수 조건으로 적용하지 않습니다. Docent evidence 필터와 별개입니다.
