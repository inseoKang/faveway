# FAVEWAY

> 좋아하는 작품과 배우의 실제 촬영지를 따라 나만의 서울 여행 코스를 만드는 콘텐츠 여행 서비스

FAVEWAY는 드라마·영화·배우를 기준으로 실제 촬영지를 탐색하고,
사용자의 여행 가능 시간과 도보 조건에 맞춰 방문 가능한 코스를 구성하는 개인 프로젝트입니다.

일반적인 AI 여행 추천처럼 장소를 임의로 생성하지 않고,
**DB에 저장된 실제 촬영지와 Actor → Scene → Place 관계를 기준으로 후보를 검증**합니다.

선택된 장소는 TMAP 실제 보행 경로를 기준으로 이동 거리와 시간을 계산하고,
사용자는 완성된 Course에서 장소를 추가·삭제하거나 순서를 변경할 수 있습니다.

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
- TMAP 실제 보행 경로를 기준으로 거리·시간 계산
- Course에서 장소 추가 / 삭제 / 순서 변경 가능
- 변경된 Course를 `localStorage`에 저장하고 복원

### 촬영지 둘러보기

코스를 만들지 않고 작품 또는 배우 기준으로 실제 촬영지를 탐색할 수 있습니다.

- 작품 → 촬영지 조회
- 작품 + 배우 → 관련 Scene 촬영지만 필터링
- 배우 → 실제 등장 Scene의 촬영지 조회
- 배우 + 작품 → 선택 작품 범위로 필터링
- 동일한 `content_id + place_id` 관계는 한 번만 표시
- 촬영지 목록과 Kakao Map 동기화
- Marker ↔ 장소 카드 선택 상태 동기화
- 장소 상세에서 작품, 장면, 등장 배우, 주소, 검증 정보, 출처 확인

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

FAVEWAY의 핵심 원칙은 다음과 같습니다.

- 촬영지는 DB에 저장된 검증 데이터만 사용
- AI가 촬영지를 임의로 생성하지 않음
- 장면 정보가 없는 경우 없는 사실을 만들어내지 않음
- 동일 작품 + 동일 장소는 중복 제거
- Actor → Scene → Place 관계를 추천 근거로 사용

---

## Course 생성 방식

현재 Course 후보 생성과 기본 경로 선택은 규칙 기반 Recommendation을 사용합니다.

```text
Content / Actor Selection
↓
DB Candidate
↓
Actor → Scene → Place Filtering
↓
Active Place Filter
↓
Content + Place Deduplication
↓
Coordinate Filter
↓
Route Combination
↓
TMAP Walking Route
↓
Walking Constraint
↓
Duration Constraint
↓
Distance Optimization
↓
Course
```

기본 체류 시간은 장소당 45분으로 계산합니다.

여행 가능 시간에 따라 최대 방문 장소 수를 제한합니다.

- 3시간 → 최대 2곳
- 4시간 → 최대 3곳
- 5시간 → 최대 4곳

실제 이동 거리와 도보 시간은 TMAP 보행자 경로 API를 사용합니다.

Course 전체 장소를 서버에 한 번 전달하면,
서버 Route Handler에서 인접 장소별 TMAP 경로를 순차 조회한 뒤
거리·시간·geometry를 통합합니다.

TMAP 조회에 실패한 구간은 Haversine 기반 거리와 예상 도보 시간을 사용해 fallback 처리합니다.

Kakao Map은 지도 Marker / Polyline UI를 담당하고,
실제 경로 거리와 이동 시간 계산은 TMAP이 담당합니다.

---

## 주요 API

- `GET /api/contents`
- `GET /api/actors/:actorId/places`
- `GET /api/contents/:contentId/places`
- `POST /api/trips`
- `POST /api/routes/walking`

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

### Recommendation

- Actor → Scene → Place Filtering
- Multi Content / Multi Actor Filtering
- Route Combination
- Walking Constraint Validation
- Duration Validation
- Distance Optimization

### Persistence

- `localStorage`
- Course 장소 추가 / 삭제 / 순서 저장
- 외부 경로 데이터는 저장하지 않고 필요 시 재조회

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
│     └─ routes/
│        └─ walking/
├─ components/
│  ├─ common/
│  ├─ map/
│  └─ PlaceDetailDialog.tsx
└─ lib/
   ├─ supabase/
   └─ recommendation/
```

세부 구조와 설계는 [`docs/architecture.md`](docs/architecture.md)를 참고하세요.

---

## 현재 구현 상태

- [x] 작품 / 배우 기반 촬영지 탐색
- [x] Actor → Scene → Place 관계 기반 필터링
- [x] 여행 시간 / 최대 도보 시간 조건 기반 Course 생성
- [x] Kakao Map 지도 및 Marker / Polyline 동기화
- [x] TMAP 실제 도보 경로 연동
- [x] Course 장소 추가 / 삭제 / 순서 변경
- [x] Course 상태 `localStorage` 저장 / 복원
- [x] 장소 상세의 Scene / Episode / Actor / 검증 정보 표시
- [x] Explore / Map 상태 처리 1차 정리
- [ ] 데이터 확장 및 정제
- [ ] AI Course Ranking
- [ ] AI Docent
- [ ] 사용자 계정 / 서버 기반 코스 저장

전체 로드맵은 [`docs/roadmap.md`](docs/roadmap.md)를 참고하세요.

---

## Getting Started

### Requirements

- Node.js 22 이상
- npm

프로젝트 설치:

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

다른 PC에서 작업을 이어갈 때는 `package-lock.json`을 기준으로 설치하기 위해
가능하면 `npm install`보다 `npm ci` 사용을 권장합니다.

---

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — 서비스 구조와 사용자 흐름
- [`docs/database.md`](docs/database.md) — 데이터 모델 및 관계
- [`docs/api.md`](docs/api.md) — API 정리
- [`docs/recommendation.md`](docs/recommendation.md) — Course 생성 및 추천 로직
- [`docs/roadmap.md`](docs/roadmap.md) — 현재 상태와 향후 개발 계획
- [`docs/dev-log.md`](docs/dev-log.md) — 개발 과정과 주요 설계 판단 기록

---

## Project Principle

FAVEWAY의 핵심은 AI가 많은 장소를 만들어내는 것이 아니라,

> **검증된 콘텐츠 데이터를 실제 여행 가능한 경험으로 정확하게 연결하고 개인화하는 것**

입니다.

AI 기능은 이 검증된 데이터와 사용자 흐름 위에서 동작하며,
촬영지 자체를 임의로 생성하지 않습니다.
