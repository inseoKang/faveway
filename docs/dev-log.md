# FAVEWAY Dev Log

FAVEWAY 개발 과정에서 발생한 문제, 설계 판단, 구현 변경,
예외 처리 기준을 기록합니다.

완성된 기능을 나열하기보다

**왜 이런 구조를 선택했고 어떤 문제를 어떻게 해결했는지**

남기는 것을 목표로 합니다.

---

# 2026-09-14 | 촬영지 데이터 구조 및 초기 API 연결

## 문제

AI가 촬영지를 임의 생성하는 구조에서는
촬영 장소 정보의 신뢰성을 보장하기 어렵다.

또한 작품과 장소만 연결하면
특정 배우가 실제 어떤 장면과 장소에 연결되는지 설명하기 어렵다.

## 판단

촬영지는 AI가 생성하지 않고
DB에 저장된 검증된 장소만 사용하기로 했다.

핵심 관계:

```text
Actor
→ Scene
→ Place
```

## 구현

도깨비 데이터를 기준으로:

- Content
- Actor
- Scene
- Place
- Scene ↔ Place
- Scene ↔ Actor
- Content ↔ Place

관계를 구성했다.

초기 API:

```text
Supabase
↓
GET /api/contents
↓
콘텐츠 선택
↓
GET /api/contents/[contentId]/places
↓
촬영지 표시
```

## 이슈

`place_relations` 조회 시
permission denied 오류가 발생했다.

## 해결

Supabase 권한 설정을 수정했다.

## 포트폴리오 포인트

추천 기능을 구현하기 전에
서비스가 어떤 데이터를 신뢰할 것인지
데이터 구조에서 먼저 정의한 경험으로 설명할 수 있다.

---

# 2026-09-15 | Planning Flow 및 Trip API 초안

## 문제

콘텐츠 선택 직후 바로 Course를 생성하면
여행 가능 시간이나 이동 조건을 반영하기 어렵다.

## 판단

별도의 Planning 단계를 두었다.

```text
콘텐츠 선택
↓
Planning
↓
여행 조건
↓
Trip 생성
↓
Course
```

## 구현

Trip 생성 조건:

- 활성 장소
- 좌표 존재
- 중복 제거
- 여행 가능 시간
- 최대 도보 시간

초기 거리 계산은 Haversine을 사용했다.

## 이유

실제 Route API가 없어도
Course 구조와 UI 개발을 먼저 진행하기 위해서였다.

## 포트폴리오 포인트

외부 API 구현을 기다리지 않고
최종 데이터 계약과 Frontend 흐름을 먼저 정의했다.

---

# 2026-09-16 | 작품 / 배우 기준 탐색 확장

## 문제

작품만 기준으로 탐색하면
사용자가 좋아하는 배우 중심으로 장소를 찾기 어렵다.

## 판단

탐색 진입점을 분리했다.

```text
작품 기준
배우 기준
```

## 구현

- 작품 검색
- 배우 검색
- 추천 배우
- 작품 → 배우
- 배우 → 작품
- 복수 작품
- 복수 배우
- 작품 미선택 시 배우 전체 작품
- 작품 + 배우 촬영지
- 배우 + 작품 촬영지

## 중복 처리

```text
content_id + place_id
```

기준으로 중복을 제거했다.

## 포트폴리오 포인트

탐색 기준과 추천 근거가
실제 데이터 관계와 연결되도록 정보 구조를 설계했다.

---

# 2026-09-16 | Navigation 구조 정리

## 문제

코스를 만들고 싶은 사용자와
촬영지만 둘러보고 싶은 사용자의 목적이 섞였다.

## 판단

HOME 진입 흐름을 분리했다.

```text
HOME
├─ 코스 만들기
└─ 촬영지 둘러보기
```

## 구현

- Home 진입 분리
- 공통 BackButton

## 포트폴리오 포인트

사용 목적을 기준으로
전체 Navigation 구조를 재설계했다.

---

# 2026-09-16 | Course Map 1차 구현

## 문제

텍스트 목록만으로는
장소 위치 관계와 이동 순서를 이해하기 어렵다.

## 판단

Course 상태와 Kakao Map을 연결했다.

## 구현

- Course Marker
- 방문 순서
- 장소 연결선
- 목록 / 지도 동기화

초기 이동값은 Haversine을 사용했다.

## 포트폴리오 포인트

Course 상태 하나를 기준으로
목록과 지도 UI를 동기화했다.

---

# 2026-09-16 | Course 편집 기능

## 문제

자동 생성 Course가
사용자의 최종 선택과 항상 일치하지 않는다.

## 판단

Course를 고정 결과가 아니라
편집 가능한 상태로 구성했다.

## 구현

- 장소 삭제
- 순서 변경
- 거리 재계산
- 도보 시간 재계산
- 체류 시간 재계산
- Summary 갱신

상태 흐름:

```text
Course Stops
↓
Route
↓
Distance
↓
Walking Time
↓
Summary
↓
Map
```

## 포트폴리오 포인트

사용자 액션 하나가
여러 파생 상태를 연쇄적으로 변경하는 구조를 관리했다.

---

# 2026-09-17 | Course 상태 저장

## 문제

페이지 새로고침 시
사용자가 편집한 Course가 초기화됐다.

## 판단

서버 저장 전 단계에서는
localStorage를 사용하기로 했다.

## 구현

- 장소 추가 저장
- 장소 삭제 저장
- 순서 저장
- 새로고침 복원
- 초기화

## 저장 책임 분리

저장:

```text
사용자가 변경한 Course Stops
```

재조회:

```text
TMAP Route
```

## 포트폴리오 포인트

사용자 선택 상태와
재계산 가능한 외부 데이터를 구분했다.

---

# 2026-09-17 | TMAP 보행 경로 API 연동

## 문제

Haversine은 직선거리이므로
실제 도보 경로와 차이가 있다.

## 판단

```text
Kakao Map
=
지도 UI

TMAP
=
실제 Route
```

로 역할을 분리했다.

## 구현

```text
Client
↓
POST /api/routes/walking
↓
Next.js Route Handler
↓
TMAP
↓
distance / duration / path
↓
Course Summary
↓
Kakao Polyline
```

API Key는 Route Handler 내부에서 사용했다.

## Fallback

```text
TMAP 실패
↓
Haversine
```

Course 전체 기능은 유지한다.

## 포트폴리오 포인트

외부 API 연결뿐 아니라
API Key 보호와 fallback까지 설계했다.

---

# 2026-09-17 | TMAP 요청 구조 개선

## 문제

Client에서 구간별 요청을 보내면
요청 로직이 화면 코드에 분산된다.

## 변경 전

```text
Client
→ A-B
→ B-C
→ C-D
```

## 변경 후

```text
Client
→ Course Stops 1회

Server
→ A-B
→ B-C
→ C-D
```

## 결과

Frontend의 외부 Route 처리 책임을 줄이고
Course 단위 인터페이스로 단순화했다.

## 포트폴리오 포인트

Client / Server 사이의 책임과 인터페이스를
기능 단위로 재설계한 사례다.

---

# 2026-09-17 | 공통 UI 구조 정리

## 문제

페이지별 스타일이 개별적으로 증가하면서
서비스 전체의 시각적 일관성이 떨어졌다.

## 판단

공통 UI 기준을 만들었다.

## 구현

- globals.css
- BackButton
- PageHeader
- 공통 색상
- 버튼
- 카드
- 여백
- 모바일 레이아웃
- Map UI

## 이슈

모바일에서 Course chip이
한글 단위로 줄바꿈되거나 잘렸다.

## 해결

텍스트 줄바꿈과 버튼 배치를 조정했다.

## 포트폴리오 포인트

기능 구현 이후
공통 UI 패턴을 추출해 유지보수성을 개선했다.

---

# 2026-09-18 | Explore / Map 상태 처리 1차

## 문제

Explore 화면은 다음 데이터와 외부 기능을 함께 사용한다.

```text
Supabase
Actor Search
Filming Location
Kakao Map
```

이 중 하나가 실패했을 때
페이지 전체 실패처럼 처리하면
사용자가 정상적으로 사용할 수 있는 기능까지 막히게 된다.

특히:

```text
지도 실패
≠
촬영지 목록 실패
```

이다.

## 판단

상태를 다음 기준으로 분리하기로 했다.

```text
Loading
Empty
Error
Retry
Partial Failure
```

공통 표현을 위해
`StateFeedback`을 만들었다.

## 구현

`StateFeedback` 지원:

```text
neutral
error
warning
title
description
action
```

Explore:

- 기본 데이터 Error
- 배우 검색 Error
- 검색 결과 Empty
- 촬영지 Loading
- 촬영지 Error
- Retry
- 촬영지 Empty

ExploreMap / CourseMap:

- SDK Loading
- SDK Error
- 좌표 없음
- 지도 실패 시 목록 / Course 계속 사용

## 판단 기준

```text
Kakao Map 실패
↓
지도 사용 불가

하지만

촬영지 목록 / Course
↓
계속 사용 가능
```

## 포트폴리오 포인트

단순 Error UI 추가가 아니라
여러 데이터 소스가 있는 화면에서
전체 실패와 부분 실패를 구분했다.

---

# 2026-09-19 | Course 상태 처리 2차

## 문제

Course 화면에는 다음 상태가 동시에 존재한다.

```text
Course Query Data
localStorage
Candidate API
TMAP
Kakao Map
```

이 중 일부 실패가
Course 전체 실패처럼 보이면
사용자가 이미 생성한 Course를 사용할 수 없게 된다.

특히:

```text
TMAP 실패
≠
Course 실패
```

라는 구분이 필요했다.

## 판단

Course 상태를 다음 기준으로 분류했다.

```text
Blocking
Recoverable
Non-blocking
Empty
Validation
```

## 구현 1. Course 데이터 검증

기존에는 query string의 JSON이 파싱되기만 하면
`CourseData`라고 가정했다.

```text
JSON.parse(...)
as CourseData
```

하지만 TypeScript의 `as`는
런타임 데이터 구조를 검증하지 않는다.

따라서:

```text
missing
invalid
ready
```

상태를 분리하고
런타임 구조 검증을 추가했다.

## 구현 2. 후보 촬영지 상태

Course 장소 추가 영역에:

```text
Loading
Error
Retry
Empty
```

상태를 `StateFeedback` 기준으로 정리했다.

중복 요청 방지 로직은 유지했다.

## 구현 3. InlineWarning

전체 화면을 막지 않는 상태는
큰 Error 카드보다 작은 Warning이 적절하다고 판단했다.

새 컴포넌트:

```text
InlineWarning
```

주요 사용:

```text
TMAP 일부 실패
TMAP 전체 fallback
localStorage 실패
```

## 구현 4. TMAP 부분 실패

상태:

```text
real
partial
fallback
```

### real

```text
모든 구간 TMAP 성공
```

### partial

```text
일부 구간 TMAP
+
일부 구간 Haversine
```

### fallback

```text
전체 Haversine
```

어떤 상태에서도
Course 목록과 편집 기능은 유지한다.

## 구현 5. Route API 구간 단위 실패

기존에는 요청 Stops 중 하나라도 좌표가 유효하지 않으면
전체 `/api/routes/walking` 요청이 실패할 수 있었다.

변경 전:

```text
A 정상
B 정상
C 좌표 없음
D 정상

↓
전체 요청 실패 가능
```

변경 후:

```text
A → B
TMAP

B → C
segment failure

C → D
segment failure 또는 정상 좌표 기준 처리
```

문제가 있는 구간만 실패 상태로 반환한다.

정상 구간의 TMAP 요청은 계속 수행한다.

## 구현 6. localStorage 실패

기존에는 localStorage 오류가
사용자에게 명확하게 전달되지 않았다.

변경 후:

```text
저장 실패
↓
Course 화면은 유지
↓
InlineWarning
```

사용자는 현재 화면에서 Course를 계속 편집할 수 있다.

다만 새로고침 시 변경 내용이 유지되지 않을 수 있음을 알려준다.

복원 실패도:

```text
저장 Course 복원 실패
↓
초기 Course 사용
↓
Warning
```

으로 처리한다.

## 결과

Course 상태가 다음과 같이 정리됐다.

```text
Blocking
→ 잘못된 Course

Recoverable
→ Candidate API 실패 + Retry

Non-blocking
→ TMAP fallback
→ localStorage 실패

Empty
→ Course 없음
→ 추가 Candidate 없음

Validation
→ 여행 시간 / 최대 도보 조건 초과
```

## 포트폴리오 포인트

외부 API, localStorage, query data가 함께 존재하는 복합 화면에서
실패를 하나의 Error 상태로 처리하지 않고
사용 가능 범위에 따라 상태를 분류했다.

특히:

```text
외부 API 장애가
서비스의 핵심 기능 장애로 전파되지 않도록 설계
```

한 사례로 설명할 수 있다.

---

# 2026-09-19 | Planning 상태 처리 및 Trip Error 분리

## 문제

Planning에서는 사용자의 조건 입력과 Trip 생성 API가 직접 연결되기 때문에
잘못된 진입, 후보 부족, 네트워크 실패, 조건 불충족을 하나의 오류로 처리하면
사용자가 무엇을 바꿔야 하는지 알기 어렵다.

## 판단

다음 상태를 구분했다.

```text
잘못된 진입
Loading
Empty
Error
Retry
조건 불충족
```

또한 Trip API가 사용자에게 의미 있는 오류 코드를 반환하도록 정리했다.

## 구현

`POST /api/trips`에서 다음 오류 코드를 사용한다.

```text
INVALID_TRIP_CONDITIONS
TRIP_CANDIDATES_FETCH_FAILED
NO_FILMING_LOCATIONS
NO_COORDINATED_FILMING_LOCATIONS
NO_AVAILABLE_ROUTE
TRIP_CREATION_FAILED
```

Frontend에서는 서버 오류 코드와 HTTP 상태를 이용해
Empty와 Error를 분리한다.

추가로:

- 중복 요청 방지
- `상관없음` 선택 시 `maxWalkingMinutes = null` 허용
- Retry
- 네트워크 오류 처리
- 비정상 JSON 응답 처리
- 입력 변경 시 이전 오류 상태 정리

를 적용했다.

## 포트폴리오 포인트

API 오류를 단순 문자열이 아니라
Frontend가 사용자 행동으로 연결할 수 있는 상태 계약으로 설계했다.

---

# 2026-09-19 | 데이터 부족 Fallback 및 1개 장소 Course UX

## 문제

최종 Course가 1곳으로 생성됐을 때
사용자는 왜 1곳만 선택됐는지 알 수 없었다.

가능한 원인은 서로 다르다.

```text
후보 자체가 1곳
도보 조건 때문에 1곳
여행 시간 때문에 1곳
여행 시간 + 도보 조건 때문에 1곳
```

이 이유를 구분하지 않고
단순히 "촬영지가 1곳이에요"라고 안내하면
사용자가 다음에 어떤 행동을 해야 하는지 판단하기 어렵다.

또한 배우 기준 후보가 부족할 때
애플리케이션이 자동으로 작품 전체 촬영지까지 포함하면
사용자가 선택한 배우 조건을 암묵적으로 변경하게 된다.

## 판단

1개 장소 Course는 실패가 아니라 정상 결과로 허용한다.

대신 서버가 Course가 1곳이 된 이유를 계산해
Frontend에 metadata로 전달한다.

범위 확장은 자동으로 수행하지 않고
사용자가 직접 선택한 경우에만 배우 필터를 제거한다.

핵심 원칙:

```text
데이터 부족
≠
없는 장소 생성

데이터 부족
≠
자동 조건 변경

데이터 부족
=
현재 결과의 이유 설명
+
사용자에게 다음 행동 제공
```

## 구현 1. Route Selection Reason

`POST /api/trips` 응답에
`candidateCount`와 `routeSelectionReason`을 추가했다.

지원 상태:

```text
NORMAL
ONLY_ONE_CANDIDATE
WALKING_LIMIT
DURATION_LIMIT
MULTIPLE_CONSTRAINTS
```

### `NORMAL`

2곳 이상의 유효한 Course가 생성된 경우.

### `ONLY_ONE_CANDIDATE`

현재 작품 / 배우 조건과 좌표 검증을 통과한
Course 후보 자체가 1곳인 경우.

### `WALKING_LIMIT`

후보는 여러 곳이지만
최대 도보 시간 조건 때문에 2곳 이상의 Route를 만들 수 없는 경우.

### `DURATION_LIMIT`

후보는 여러 곳이지만
이동 시간과 장소별 최소 체류 시간을 포함하면
여행 가능 시간 안에 2곳 이상 방문할 수 없는 경우.

### `MULTIPLE_CONSTRAINTS`

도보 조건과 여행 시간 조건을 함께 적용했을 때
2곳 이상의 유효 Route를 만들 수 없는 경우.

## 구현 2. 1개 장소 Course 설명 UI

기존의 단순 Warning 대신
`routeSelectionReason`에 따라 설명 문구를 다르게 표시한다.

예:

```text
이 코스가 1곳으로 구성된 이유

선택한 배우가 등장한 장면과 연결된 촬영지 중
현재 코스에 사용할 수 있는 장소가 1곳 확인됐어요.
```

도보 조건 때문인 경우:

```text
도보 조건을 기준으로 1곳을 선택했어요.

촬영지 후보는 여러 곳이지만,
현재 최대 도보 시간 조건으로 함께 방문할 수 있는
2곳 이상의 조합을 찾지 못했어요.
```

## 구현 3. 이유별 다음 행동

배우 조건으로 후보가 1곳인 경우:

```text
[배우 조건 없이 작품 전체로 넓혀보기]
[작품 / 배우 다시 선택하기]
```

도보 또는 여행 시간 조건 때문인 경우:

```text
[여행 조건 다시 설정하기]
[작품 / 배우 다시 선택하기]
```

사용자가 결과의 원인과
다음에 바꿀 수 있는 조건을 연결해서 이해하도록 했다.

## 구현 4. 사용자 선택 기반 범위 확장

`배우 조건 없이 작품 전체로 넓혀보기`를 선택하면
동일한 `POST /api/trips`를 다시 호출한다.

변경 전:

```json
{
  "contentIds": [1],
  "actorIds": [3],
  "durationMinutes": 180,
  "maxWalkingMinutes": 10
}
```

변경 후:

```json
{
  "contentIds": [1],
  "actorIds": [],
  "durationMinutes": 180,
  "maxWalkingMinutes": 10
}
```

유지:

```text
contentIds
durationMinutes
maxWalkingMinutes
```

변경:

```text
actorIds
→ []
```

즉 작품, 여행 시간, 도보 조건은 그대로 유지하고
배우 필터만 제거한다.

## 구현 5. Course 상태 및 URL 갱신

범위 확장 API가 성공하면
새 Course를 현재 React state에 반영하고
Next.js `router.replace()`로 URL의 Course 데이터도 갱신한다.

내부 페이지 이동에는
`window.location.assign()` 대신 Next Router를 사용하도록 정리해
Next.js lint warning도 제거했다.

새 Course 반영 시:

- 선택 장소 초기화
- 상세 Dialog 초기화
- 장소 추가 UI 초기화
- Candidate Error 초기화
- 범위 확장 Error 초기화
- Walking Route 상태 초기화

를 함께 수행한다.

## 결과

데이터가 적은 상황을
단순 실패 화면으로 끝내지 않고
현재 결과가 나온 이유와 다음 행동을 연결했다.

또한 사용자 동의 없이
배우 조건이나 작품 범위를 변경하지 않는다.

## 포트폴리오 포인트

추천 결과의 개수만 보여주는 것이 아니라
왜 그런 결과가 나왔는지를 API 계약으로 전달하고
Frontend가 그 이유에 맞는 액션을 제공하도록 설계했다.

설명 가능한 추천 결과,
데이터 부족 UX,
사용자 선택권을 보존하는 fallback,
API와 UI 사이의 상태 계약 설계 사례로 설명할 수 있다.

---

# 2026-09-20 | AI Docent 서버 기반 및 Mock UX 구현

## 문제

FAVEWAY의 핵심 AI 기능으로
촬영지를 방문한 사용자에게 작품과 장면을 설명하는
AI Docent가 필요했다.

하지만 처음부터 실제 LLM을 화면에 연결하면
다음 문제가 동시에 발생한다.

```text
DB Context 문제
+
Prompt 문제
+
OpenAI API 문제
+
비용 문제
+
Frontend UX 문제
```

또한 AI가 DB에 없는 장면이나 장소 정보를 생성하면
FAVEWAY의 핵심 원칙과 충돌한다.

## 판단

AI Docent의 입력은
Client가 전달한 설명 문자열을 그대로 사용하지 않는다.

Frontend에서는 식별 정보만 전달하고,
서버가 DB에서 검증 데이터를 다시 조회하도록 설계했다.

```text
Client
↓
contentId
placeId
order

Server
↓
Supabase
↓
Content
Place
Scene
Actor
Verified Evidence
↓
LLM
```

또한 실제 OpenAI API를 UI에 바로 연결하지 않고,
Mock 데이터로 사용자 경험을 먼저 완성하기로 했다.

## 구현 1. OpenAI 서버 기반

```text
src/lib/ai/openai.ts
```

OpenAI API Key는
Client에 노출하지 않고 서버에서만 사용한다.

## 구현 2. Docent Context Layer

```text
src/lib/ai/docent-context.ts
```

Place 기준으로:

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

관계를 조회한다.

Scene은 요청한 `contentId` 범위로 다시 제한한다.

## 구현 3. 검증된 evidence만 사용

당시 구현에서는 다음 상태값을
AI evidence 허용 기준으로 사용했다.

```text
verified
approved
confirmed
complete
completed
```

이후 실제 DB를 점검한 결과
DB의 `verification_status` 값은:

```text
PUBLIC_DATA
UNVERIFIED
```

로 확인되었다.

따라서 이 부분은
실제 OpenAI 연결 전에 다시 정리해야 한다.

## 구현 4. 최소 생성 근거

Place Docent는 다음 중 하나 이상이 있어야 한다.

```text
Scene description
또는
Verified Fact
```

둘 다 없으면:

```text
DOCENT_CONTEXT_INSUFFICIENT
```

으로 처리한다.

## 구현 5. Place / Course Docent API

```text
POST /api/docents/place
POST /api/docents/course
```

### Place Docent

한 장소의 작품 / Scene / Actor / 검증 근거를 설명한다.

### Course Docent

Course Stops 순서를 유지하면서
여러 장소를 하나의 이야기 흐름으로 연결한다.

## 구현 6. Prompt 안전 규칙

다음 생성을 금지했다.

```text
촬영지 생성
Scene 생성
Episode 추측
Actor 추측
대사 생성
촬영 사실 생성
시설 생성
내부 공간 추측
촬영 구도 추측
출입 가능 여부 추측
운영 시간 추측
```

또한 실제 배우가 직접 설명하는 것처럼
1인칭으로 사칭하지 않도록 제한했다.

## 구현 7. Structured Output

LLM 응답은 다음 구조로 제한한다.

```text
title
narration
```

필수 필드가 없거나 비어 있으면
정상 결과로 사용하지 않는다.

## 구현 8. 실제 API 호출 잠금

```env
ENABLE_OPENAI_DOCENT=false
```

비활성 상태에서는:

```text
POST /api/docents/place
POST /api/docents/course
↓
DOCENT_NOT_ENABLED
```

로 종료한다.

이를 통해 개발 중 의도하지 않은
OpenAI API 비용 발생을 방지한다.

## 구현 9. Course Docent Mock UX

Course 상단:

```text
[이 코스 이야기 듣기]
```

를 추가했다.

## 구현 10. Place Docent Mock UX

각 Course Stop:

```text
[현장에서 도슨트 듣기]
```

버튼을 추가했다.

## 구현 11. 공통 DocentDialog

```text
DocentDialog
↓
mode = course | place
```

지원 상태:

```text
Loading
Success
Empty
Error
Retry
```

모바일에서는 Bottom Sheet,
넓은 화면에서는 Dialog 형태로 표시한다.

## 구현 12. Course 상태와 Docent 상태 연결

```text
장소 추가
장소 삭제
순서 변경
Course 초기화
배우 조건 제거 후 Course 재생성
↓
최신 Docent Stop 목록
```

`useMemo`를 사용해
불필요한 배열 재생성을 줄였다.

## 이슈

DocentDialog의 Effect 내부에서
`loadDocent()`를 즉시 호출하면서 React lint에서:

```text
Calling setState synchronously within an effect can trigger cascading renders
```

오류가 발생했다.

## 해결

```text
useEffect
↓
setTimeout(..., 0)
↓
loadDocent
```

형태로 변경해
Effect 내부의 동기 state update를 피했다.

## TTS 판단

이번 단계에서는 TTS를 연결하지 않았다.

```text
DB Context 정확성
↓
AI Text 품질
↓
Docent UX
↓
TTS
```

순서로 진행한다.

현재 UI에는:

```text
음성으로 듣기 · 준비 중
```

상태만 표시한다.

## 결과

현재 구조:

```text
UI
→ Mock

실제 API
→ 구현되어 있으나 비활성
```

향후:

```text
createMockPlaceDocent
createMockCourseDocent
```

부분만 실제 API 호출로 교체할 수 있다.

## 포트폴리오 포인트

AI 기능을 단순한 LLM 호출로 붙이지 않고:

```text
DB 검증
↓
Server Context
↓
Prompt Guardrail
↓
Structured Output
↓
Frontend 상태 처리
```

로 책임을 분리했다.

또한 실제 AI 비용을 사용하기 전에
Mock을 이용해 사용자 경험과 상태 처리를 먼저 구현했다.

---

# 2026-09-21 | 촬영지 데이터 보강 및 서울 Course 범위 적용

## 문제

FAVEWAY의 초기 서비스 범위는 서울이지만,
기존 DB에는 서울 외 촬영지도 함께 저장되어 있었다.

예:

```text
강원
인천
전남
```

기존 Trip API는:

```text
is_active
+
좌표 존재
```

만 확인했기 때문에
서울 외 촬영지가 Course 후보에 포함될 수 있었다.

또한 도깨비 촬영지 데이터는
Scene / Actor / Place 관계는 잘 구성되어 있었지만,
다음 검증 정보가 부족했다.

```text
verified_fact
source_url
verified_at
place_description
```

## 판단 1. 서울 외 데이터는 삭제하지 않는다

서울 외 촬영지는
잘못된 데이터가 아니라
현재 서비스 범위 밖의 데이터다.

따라서:

```text
서울 외 Place
→ DB 유지
→ Course에서만 제외
```

하기로 했다.

이를 위해 `places`에:

```text
region
```

을 추가했다.

## 판단 2. is_active와 region을 분리한다

```text
is_active
→ 현재 방문 가능한 장소인가

region
→ 현재 서비스 지역 범위에 포함되는가
```

예:

```text
월정사
is_active = true
region = 강원
↓
서울 Course 제외
```

폐점한 촬영지는:

```text
촬영지 기록 유지
+
is_active = false
```

로 관리한다.

달콤커피 종로종각점은
현재 Course 후보에서 제외하기 위해
`is_active = false`로 변경했다.

## 구현 1. places 컬럼 확장

추가:

```text
region
place_description
```

### region

주소 데이터를 기준으로 기존 Place에:

```text
서울
인천
강원
전남
```

지역 정보를 보강했다.

### place_description

Scene 설명과 실제 장소 설명을 분리하기 위해 추가했다.

```text
scene.description
→ 작품 속 장면

place_description
→ 실제 장소 자체 설명

verified_fact
→ 작품과 장소의 촬영 관계 검증
```

## 구현 2. place_description 1차 보강

출처가 충분히 확인된 장소부터
실제 장소 설명을 보강했다.

1차 반영:

```text
운현궁 양관
그랜드 워커힐 서울
세빛섬
덕수궁 돌담길
```

근거가 부족한 장소는
AI나 추측으로 설명을 채우지 않았다.

## 구현 3. verification 데이터 점검

도깨비:

```text
Scene 32개
Scene description 누락 0
raw_description 누락 0
Episode 누락 1
Scene Actor 없는 Scene 0
Scene Place 없는 Scene 0
```

서울 도깨비 촬영지:

```text
총 19곳
활성 18곳
비활성 1곳
```

검증정보:

```text
verified_fact
source_url
verified_at
```

이 모두 존재하는 서울 촬영지는
현재 14곳이다.

확인할 수 없는 Episode는
추측해서 채우지 않고 `NULL`을 유지했다.

## 구현 4. verification_status 실제값 확인

실제 DB에 존재하는 값:

```text
PUBLIC_DATA
UNVERIFIED
```

기존 문서와 AI Context 코드에 존재하던
임시 상태값과 실제 DB 값이 다르다는 점을 확인했다.

따라서 실제 AI 연결 전에
Evidence 허용 정책을 실제 DB 상태값 기준으로 다시 정리해야 한다.

## 구현 5. source_type 기준 정리

현재 사용:

```text
KCCF_PUBLIC_DATA
OFFICIAL
SECONDARY
USER_PROVIDED_CSV
```

역할:

```text
KCCF_PUBLIC_DATA
→ 기존 공공데이터

OFFICIAL
→ 공공기관 / 공식 홈페이지

SECONDARY
→ 언론 / 촬영지 DB / 2차 자료

USER_PROVIDED_CSV
→ 기존 CSV 기반, 추가 검증 전
```

## 구현 6. Trip 서울 필터

기존:

```text
Active Place
↓
Actor → Scene → Place
↓
Coordinate
```

변경:

```text
Active Place
↓
region = 서울
↓
Actor → Scene → Place
↓
Coordinate
```

`POST /api/trips`에서
`places.region`을 조회하고
서울 지역만 Course 후보로 사용하도록 수정했다.

## 구현 7. Course 장소 추가 후보 서울 필터

초기 Course만 서울로 제한하면
Course 편집 화면에서 서울 외 촬영지를 다시 추가할 수 있었다.

따라서:

```text
GET /api/contents/[contentId]/places
```

에도 동일하게:

```text
is_active != false
+
region = 서울
```

조건을 적용했다.

Course Frontend에서도
`region === "서울"` 조건을 한 번 더 확인한다.

## 검증

작품별 현재 서울 활성 촬영지:

```text
도깨비
→ 18곳

여신강림
→ 10곳
```

확인:

```text
서울 외 촬영지 Course 후보 제외
비활성 촬영지 Course 후보 제외
Course 최초 생성 정상
Course 장소 추가 정상
npm run lint 통과
npm run build 통과
```

## 포트폴리오 포인트

서비스 범위를 단순히 주소 문자열로 처리하지 않고
DB에 `region`을 명시적으로 추가해
데이터와 서비스 정책을 분리했다.

또한:

```text
촬영지 기록
현재 방문 가능 여부
서비스 지역 범위
검증 상태
```

를 서로 다른 데이터 책임으로 관리했다.

데이터 정제 과정에서
존재하지 않는 정보를 채우는 대신
확인 가능한 근거만 보강하고
불확실한 정보는 그대로 남기는 정책을 적용했다.

---

# 현재 핵심 Frontend 상태 흐름

```text
사용자 탐색 기준
↓
작품 / 배우 조회
↓
촬영지 후보
↓
여행 조건
↓
Trip
↓
Course Stops
↓
TMAP
↓
Distance / Walking Time
↓
Summary
↓
Kakao Map
↓
localStorage
```

AI Docent는 현재 Course Stops를 기반으로
별도의 Mock UX를 구성한다.

```text
Course Stops
↓
Docent Stop Order
↓
Course / Place Docent Mock
```

---

# 현재 상태 관리 기준

핵심 상태:

```text
Course Stops
```

사용자 변경:

```text
추가
삭제
순서 변경
```

파생 상태:

```text
Course Stops
↓
order
↓
Route
↓
Marker
↓
Polyline
↓
distance
↓
walking time
↓
stay time
↓
Summary
↓
Docent Stop Order
```

---

# 외부 서비스 역할

## Supabase

```text
기준 데이터
```

## Kakao Map

```text
지도 UI
```

## TMAP

```text
실제 보행 경로 계산
```

## Haversine

```text
초기 Route 계산
+
TMAP fallback
```

## AI

현재:

```text
검증된 정보 기반 Docent Context
+
Mock Docent UX
+
실제 OpenAI 연결용 Route Handler
```

향후:

```text
실제 OpenAI UI 연결
개인화
Ranking
TTS
```

AI가 촬영지나 장면 사실을 생성하지 않는다.

---

# 아직 정리해야 할 항목

## 촬영지 상세 UX

현재 구현:

```text
Scene
Episode
Scene Actor
Verification
Source
실제 위치
Kakao Map 이동 링크
```

남은 작업:

```text
장소 자체 설명 데이터 보강
장소 이미지 데이터 검토
장소 이미지 표시
```

PlaceDetailDialog 내부에
AI Docent CTA를 추가하지 않습니다.

```text
PlaceDetailDialog
→ 사실 / 상세 정보

DocentDialog
→ 도슨트 경험
```

---

## AI Docent

현재 구현:

```text
Course / Place Mock UX
+
DB Context Layer
+
Prompt
+
OpenAI Route Handler
+
Structured Output
```

현재 실제 OpenAI 호출:

```text
비활성
```

다음 작업:

```text
데이터 보강
↓
Evidence 상태 정책 정리
↓
실제 OpenAI 연결
↓
Prompt 품질 검증
↓
TTS
```

---

## 실제 배포

배포 후 기록:

- Production URL
- 주요 화면
- 모바일 화면
- TMAP Route
- Course Editing
- AI Docent
- Demo 영상

---

# 앞으로 Dev Log 작성 규칙

다음과 같은 작업일 때 자세히 기록한다.

- 상태 구조 변경
- API 구조 변경
- 사용자 흐름 변경
- 예외 처리 설계
- 외부 API 연결
- 요청 구조 개선
- 데이터 구조 판단
- fallback 설계
- 면접에서 설명할 가치가 있는 기술적 결정

형식:

```text
## YYYY-MM-DD | 기능명

### 문제
왜 필요한가?

### 판단
어떤 구조를 선택했는가?

### 구현
무엇을 변경했는가?

### 이슈
어떤 문제가 있었는가?

### 해결
어떻게 해결했는가?

### 포트폴리오 포인트
Frontend Engineer 관점에서 무엇을 증명하는가?
```

단순 CSS나 문구 변경은
설계 판단이 없다면 짧게 기록하거나 생략한다.
