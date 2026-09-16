# FAVEWAY

> 좋아하는 작품과 배우의 실제 촬영지를 따라 나만의 서울 여행 코스를 만들어주는 콘텐츠 여행 서비스

FAVEWAY는 드라마·영화·배우를 기준으로 실제 촬영지를 탐색하고, 사용자의 여행 가능 시간과 도보 조건에 맞춰 방문 코스를 구성하는 개인 프로젝트입니다.

일반적인 AI 여행 추천처럼 장소를 임의로 생성하지 않고, **DB에 저장된 실제 촬영지와 Actor → Scene → Place 관계를 기준으로 후보를 검증한 뒤 코스를 구성**하는 것을 핵심 원칙으로 삼고 있습니다.

---

## 핵심 기능

### 코스 만들기

작품 또는 배우를 기준으로 여행 코스를 만들 수 있습니다.

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
- 복수 작품(`contentIds`)과 복수 배우(`actorIds`) 지원
- 좌표 기반 거리 계산 및 규칙 기반 Route 생성

### 촬영지 둘러보기

코스를 만들지 않고 작품 또는 배우 기준으로 실제 촬영지를 탐색할 수 있습니다.

- 작품 → 촬영지 조회
- 작품 + 배우 → 관련 Scene 촬영지만 필터링
- 배우 → 실제 등장 Scene의 촬영지 조회
- 배우 + 작품 → 선택 작품 범위로 필터링
- 동일한 `content_id + place_id` 관계는 한 번만 표시
- 장소 상세에서 작품, 장면, 등장 배우, 주소, 검증 정보 확인

---

## 핵심 데이터 관계

배우가 작품에 출연했다는 사실만으로 작품의 모든 촬영지를 배우 관련 장소로 판단하지 않습니다.

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

복수 배우 선택 시 **선택 배우 중 한 명 이상이 등장한 Scene의 합집합**을 사용합니다.

---

## Course 생성 방식

현재는 AI가 아닌 규칙 기반 Recommendation을 사용합니다.

```text
Content / Actor Selection
↓
DB Candidate
↓
Actor → Scene → Place Filtering
↓
Active Place Filter
↓
Deduplication
↓
Coordinate Filter
↓
Route Combination
↓
Walking Constraint
↓
Duration Constraint
↓
Distance Optimization
↓
Course
```

이동 거리는 현재 위도·경도를 이용한 Haversine 기반 직선거리와 보정값으로 추정합니다.

향후 Kakao Map 기반 실제 도보 경로로 교체할 예정입니다.

---

## 주요 API

```text
GET    /api/contents
GET    /api/actors/search?q=
GET    /api/actors/recommendations
GET    /api/actors/:actorId/contents
GET    /api/actors/:actorId/places
GET    /api/actors/:actorId/places?contentIds=1,2
GET    /api/contents/:contentId/actors
GET    /api/contents/:contentId/places
GET    /api/contents/:contentId/places?actorIds=3,5
GET    /api/contents/:contentId/places/:placeId
POST   /api/trips
```

자세한 내용은 [`docs/api.md`](docs/api.md)를 참고하세요.

---

## Tech Stack

**Frontend**

- Next.js
- React
- TypeScript
- Tailwind CSS

**Backend / Database**

- Next.js Route Handler
- Supabase
- PostgreSQL

**Recommendation**

- Actor → Scene → Place Filtering
- Multi Content / Multi Actor Filtering
- Haversine Distance
- Walking Time Estimation
- Route Combination
- Duration Validation

**Planned**

- Kakao Maps
- OpenAI API
- AI Course Ranking
- AI Docent
- TTS

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
│     └─ trips/
├─ components/
│  ├─ common/
│  └─ PlaceDetailDialog.tsx
└─ lib/
   ├─ supabase/
   └─ recommendation/
```

세부 구조와 설계는 [`docs/architecture.md`](docs/architecture.md)를 참고하세요.

---

## 현재 구현 상태

- [x] HOME → 코스 만들기 / 촬영지 둘러보기 분리
- [x] 작품 검색
- [x] 배우 부분 검색
- [x] 추천 배우 3명
- [x] 작품 → 배우 조회
- [x] 배우 → 작품 조회
- [x] 작품 기준 촬영지 탐색
- [x] 배우 기준 촬영지 탐색
- [x] 동일 작품 + 동일 장소 중복 제거
- [x] 복수 작품 / 복수 배우 기반 Course 생성
- [x] 여행 시간 / 최대 도보 시간 조건
- [x] 장소 상세 Dialog
- [ ] Kakao Map 연동
- [ ] Course 장소 직접 수정
- [ ] AI Course Ranking
- [ ] AI Docent
- [ ] 사용자 계정 / 코스 저장

전체 로드맵은 [`docs/roadmap.md`](docs/roadmap.md)를 참고하세요.

---

## Getting Started

```bash
git clone https://github.com/inseoKang/faveway.git
cd faveway
npm install
```

프로젝트 루트에 `.env.local`을 생성합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

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
- [`docs/roadmap.md`](docs/roadmap.md) — 현재 상태와 향후 개발 계획

---

## Project Principle

FAVEWAY의 핵심은 AI가 많은 장소를 만들어내는 것이 아니라,

> **검증된 콘텐츠 데이터를 실제 여행 가능한 경험으로 정확하게 연결하고 개인화하는 것**

입니다.

```text
작품 / 배우 선택
↓
실제 Scene 관계 확인
↓
실제 촬영지 Candidate
↓
여행 조건 검증
↓
Course
↓
장소 상세
↓
현장 콘텐츠 경험
```
