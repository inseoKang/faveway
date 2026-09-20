# FAVEWAY

> 좋아하는 작품과 배우의 실제 촬영지를 따라 나만의 서울 여행 코스를 만드는 콘텐츠 여행 서비스

FAVEWAY는 드라마·영화·배우를 기준으로 실제 촬영지를 탐색하고,
사용자의 여행 가능 시간과 도보 조건에 맞춰 방문 가능한 코스를 구성하는 개인 프로젝트입니다.

일반적인 AI 여행 추천처럼 장소를 임의로 생성하지 않고,
**DB에 저장된 실제 촬영지와 Actor → Scene → Place 관계를 기준으로 후보를 검증**합니다.

초기 Course는 후보 Route를 빠르게 비교하기 위해
Haversine 기반 거리와 예상 도보 시간을 사용하고,
Course 화면에서는 TMAP 실제 보행 경로를 다시 조회해 거리와 시간을 갱신합니다.

사용자는 완성된 Course에서 장소를 추가·삭제하거나 순서를 변경할 수 있습니다.

AI Docent는 DB의 검증 정보를 기반으로 설명을 생성하도록
서버 Context / Prompt / API 구조를 구현했으며,
현재 Course 화면에서는 실제 OpenAI 호출 전에 Mock 기반 사용자 경험을 먼저 검증하고 있습니다.

---

## 핵심 기능

### 코스 만들기

```text
HOME
↓
코스 만들기
↓
작품으로 찾기 / 배우로 찾기
↓
여행 조건 선택
↓
Course 생성
```

- 작품 선택 후 배우 0명~여러 명 선택
- 배우 선택 후 출연 작품 0개~여러 개 선택
- 작품 미선택 시 해당 배우의 전체 출연 작품 사용
- 여행 가능 시간: 3시간 / 4시간 / 5시간
- 한 구간 최대 도보 시간: 10분 / 20분 / 30분 / 상관없음
- Haversine 기반 초기 Route 비교
- Course 진입 후 TMAP 실제 보행 경로로 거리·시간 갱신
- Course 장소 추가 / 삭제 / 순서 변경
- `localStorage` 저장 / 복원
- 1개 장소 Course 이유 안내
- 사용자 선택 기반 배우 조건 해제

---

### 촬영지 둘러보기

- 작품 → 촬영지 조회
- 작품 + 배우 → 관련 Scene 촬영지만 필터링
- 배우 → 실제 등장 Scene의 촬영지 조회
- 배우 + 작품 → 선택 작품 범위로 필터링
- 동일 `content_id + place_id` 중복 제거
- 촬영지 목록과 Kakao Map 동기화
- Marker ↔ 장소 카드 동기화
- 장소 상세에서 작품 / 장면 / 배우 / 주소 / 검증 정보 / 출처 확인

---

### AI Docent

Course 화면에서 두 가지 Docent 경험을 제공합니다.

```text
Course Docent
→ 전체 촬영지를 순서대로 연결한 이야기

Place Docent
→ 특정 촬영지의 장면 중심 이야기
```

현재 UI:

```text
[이 코스 이야기 듣기]

[현장에서 도슨트 듣기]
```

현재 구현:

- Course Docent 진입 UX
- Place Docent 진입 UX
- 공통 Docent Dialog
- Loading
- Success
- Empty
- Error
- Retry
- 모바일 Bottom Sheet
- 실제 AI 연결용 Place / Course API
- DB 기반 Docent Context
- Prompt Guardrail
- Structured Output
- 최소 근거 부족 시 생성 제한

현재 Course UI는 실제 OpenAI API 대신 Mock 데이터를 사용합니다.

```env
ENABLE_OPENAI_DOCENT=false
```

상태로 실제 호출을 비활성화할 수 있습니다.

---

## 핵심 데이터 관계

```text
Actor
↓
Scene
↓
Place
```

실제 조회 구조:

```text
actors
↓
scene_actors
↓
scenes
↓
scene_places
↓
places
```

복수 배우 선택 시
선택 배우 중 한 명 이상이 등장한 Scene의 합집합을 사용합니다.

핵심 원칙:

- 촬영지는 DB에 저장된 실제 데이터만 사용
- AI가 촬영지를 임의 생성하지 않음
- 장면 정보가 없으면 만들어내지 않음
- 동일 작품 + 동일 장소 중복 제거
- Actor → Scene → Place 관계를 추천 근거로 사용
- 데이터 부족 시 일반 관광지를 자동 추가하지 않음
- 배우 조건 확장은 사용자가 직접 선택한 경우에만 수행
- AI 입력은 Client 문자열이 아니라 Server DB Context를 사용

---

## Course 생성 방식

```text
Content / Actor Selection
↓
DB Candidate
↓
Actor → Scene → Place Filtering
↓
Active Place Filter
↓
Place Deduplication
↓
Coordinate Filter
↓
Route Combination
↓
Haversine Distance / Walking Estimate
↓
Walking Constraint
↓
Duration Constraint
↓
Distance Optimization
↓
Course 생성
↓
TMAP Actual Walking Route
↓
Course Summary / Kakao Polyline 갱신
```

최대 방문 장소 수:

- 3시간 → 최대 2곳
- 4시간 → 최대 3곳
- 5시간 → 최대 4곳

TMAP 실패 구간은
Haversine 기반 거리와 예상 도보 시간으로 fallback 합니다.

---

## AI Docent 데이터 흐름

```text
Frontend
↓
contentId / placeId / order
↓
Next.js Route Handler
↓
Supabase
↓
Content
Place
Scene
Actor
Verified Evidence
↓
Prompt
↓
OpenAI
↓
Structured Docent Response
```

AI에 사용하는 verified_fact는
검증 상태를 통과한 데이터로 제한합니다.

현재 허용 상태:

```text
verified
approved
confirmed
complete
completed
```

Place Docent는:

```text
Scene Description
또는
Verified Fact
```

중 하나 이상이 있어야 생성 가능합니다.

---

## AI Docent Guardrail

AI가 생성하지 않도록 제한하는 정보:

- DB에 없는 촬영지
- DB에 없는 Scene
- Episode 추측
- Actor 추측
- 실제 대사
- 촬영 상황
- 시설
- 내부 공간
- 촬영 구도
- 출입 가능 여부
- 운영 시간
- 촬영 허가

실제 배우가 직접 말하는 것처럼
1인칭으로 사칭하는 표현도 제한합니다.

---

## 데이터 부족 Fallback

```text
촬영지 0개
→ Empty

촬영지 1개
→ 1개 장소 Course 허용

촬영지 2개 이상
→ 정상 Route 탐색
```

1개 장소 Course 이유:

```text
ONLY_ONE_CANDIDATE
WALKING_LIMIT
DURATION_LIMIT
MULTIPLE_CONSTRAINTS
```

배우 조건으로 후보가 부족해도
자동으로 작품 전체 범위로 확장하지 않습니다.

사용자가 직접 선택한 경우에만:

```text
actorIds
→ []
```

로 다시 Course를 생성합니다.

자세한 정책은 [`docs/data-fallback-policy.md`](docs/data-fallback-policy.md)를 참고하세요.

---

## 주요 API

### Content / Actor

- `GET /api/contents`
- `GET /api/actors/:actorId/places`
- `GET /api/contents/:contentId/places`
- `GET /api/contents/:contentId/places/:placeId`

### Course

- `POST /api/trips`
- `POST /api/routes/walking`

### AI Docent

- `POST /api/docents/place`
- `POST /api/docents/course`

자세한 API는 [`docs/api.md`](docs/api.md)를 참고하세요.

---

## Tech Stack

### Frontend

- Next.js 16
- React
- TypeScript
- Tailwind CSS
- Kakao Maps JavaScript SDK

### Backend / Database

- Next.js Route Handler
- Supabase
- PostgreSQL

### Route

- TMAP Pedestrian API
- Haversine Distance Fallback

### AI

- OpenAI SDK
- OpenAI Responses API
- Structured Output
- DB Grounded Docent Context
- Mock-first AI Docent UX

### Recommendation

- Actor → Scene → Place Filtering
- Multi Content / Multi Actor Filtering
- Route Combination
- Walking Constraint Validation
- Duration Validation
- Distance Optimization
- Data Fallback Reason Classification

### Persistence

- `localStorage`
- Course 장소 추가 / 삭제 / 순서 저장
- 외부 Route 및 AI 결과는 저장하지 않고 필요 시 재생성

---

## Project Structure

```text
src/
├─ app/
│  ├─ page.tsx
│  ├─ plan/
│  ├─ explore/
│  ├─ planning/
│  ├─ course/
│  └─ api/
│     ├─ contents/
│     ├─ actors/
│     ├─ trips/
│     ├─ routes/
│     │  └─ walking/
│     └─ docents/
│        ├─ place/
│        └─ course/
│
├─ components/
│  ├─ common/
│  ├─ map/
│  ├─ docent/
│  │  └─ DocentDialog.tsx
│  └─ PlaceDetailDialog.tsx
│
└─ lib/
   ├─ supabase/
   ├─ recommendation/
   └─ ai/
      ├─ openai.ts
      ├─ docent-context.ts
      ├─ docent-types.ts
      ├─ docent-prompts.ts
      ├─ generate-docent.ts
      └─ docent-mock.ts
```

---

## 현재 구현 상태

- [x] 작품 / 배우 기반 촬영지 탐색
- [x] Actor → Scene → Place 관계 기반 필터링
- [x] 여행 시간 / 최대 도보 시간 기반 Course 생성
- [x] 1개 장소 Course 및 이유 안내
- [x] 사용자 선택 기반 배우 조건 해제
- [x] Kakao Map Marker / Polyline 동기화
- [x] TMAP 실제 도보 경로
- [x] TMAP 실패 구간 Haversine fallback
- [x] Course 장소 추가 / 삭제 / 순서 변경
- [x] Course `localStorage` 저장 / 복원
- [x] 장소 상세 Scene / Episode / Actor / 검증 정보
- [x] Explore / Planning / Course Loading / Empty / Error / Retry
- [x] AI Docent 서버 기반 구조
- [x] Place / Course Docent API
- [x] AI Docent Prompt / Context / Structured Output
- [x] Course / Place Docent Mock UX
- [x] AI Docent Mock Loading / Empty / Error / Retry
- [ ] 실제 OpenAI API와 Course UI 연결
- [ ] TTS
- [ ] 데이터 확장 및 정제
- [ ] AI Course Ranking
- [ ] 사용자 계정 / 서버 기반 코스 저장

---

## Getting Started

### Requirements

- Node.js 22 이상
- npm

설치:

```bash
git clone https://github.com/inseoKang/faveway.git
cd faveway
npm ci
```

프로젝트 루트에 `.env.local`을 생성합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

NEXT_PUBLIC_KAKAO_MAP_APP_KEY=
TMAP_APP_KEY=

OPENAI_API_KEY=
OPENAI_DOCENT_MODEL=gpt-5.6-luna
ENABLE_OPENAI_DOCENT=false
```

현재 AI Docent UI는 Mock 데이터를 사용하므로
`ENABLE_OPENAI_DOCENT=false` 상태에서도 개발할 수 있습니다.

실행:

```bash
npm run dev
```

검사:

```bash
npm run lint
npm run build
```

---

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — 서비스 구조와 사용자 흐름
- [`docs/database.md`](docs/database.md) — 데이터 모델 및 관계
- [`docs/api.md`](docs/api.md) — API 정리
- [`docs/recommendation.md`](docs/recommendation.md) — Course 생성 및 추천 로직
- [`docs/data-fallback-policy.md`](docs/data-fallback-policy.md) — 데이터 부족 및 범위 확장 정책
- [`docs/roadmap.md`](docs/roadmap.md) — 현재 상태와 향후 개발 계획
- [`docs/dev-log.md`](docs/dev-log.md) — 개발 과정과 주요 설계 판단 기록

---

## Project Principle

FAVEWAY의 핵심은 AI가 많은 장소를 만들어내는 것이 아니라,

> **검증된 콘텐츠 데이터를 실제 여행 가능한 경험으로 정확하게 연결하고 개인화하는 것**

입니다.

AI는 검증된 데이터 위에서 설명과 개인화를 제공하며,
촬영지와 장면 자체를 사실 데이터로 생성하지 않습니다.