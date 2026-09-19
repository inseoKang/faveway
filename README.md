# FAVEWAY

> 좋아하는 작품과 배우의 실제 촬영지를 따라 나만의 서울 여행 코스를 만드는 콘텐츠 여행 서비스

FAVEWAY는 드라마·영화·배우를 기준으로 실제 촬영지를 탐색하고,
사용자의 여행 가능 시간과 도보 조건에 맞춰 방문 가능한 코스를 구성하는 개인 프로젝트입니다.

일반적인 AI 여행 추천처럼 장소를 임의로 생성하지 않고,
**DB에 저장된 실제 촬영지와 Actor → Scene → Place 관계를 기준으로 후보를 검증**합니다.

초기 Course는 후보 Route를 빠르게 비교하기 위해 Haversine 기반 거리와 예상 도보 시간을 사용하고,
Course 화면에서는 TMAP 실제 보행 경로를 다시 조회해 거리와 시간을 갱신합니다.

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
- Haversine 기반 초기 Route 비교
- Course 진입 후 TMAP 실제 보행 경로로 거리·시간 갱신
- Course에서 장소 추가 / 삭제 / 순서 변경 가능
- 변경된 Course를 `localStorage`에 저장하고 복원
- 데이터가 부족해 1개 장소 Course가 생성된 경우 이유 안내
- 사용자가 선택한 경우에만 배우 조건을 해제해 작품 전체 촬영지로 범위 확장

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
- 데이터 부족 시 일반 관광지를 자동으로 추가하지 않음
- 배우 조건 확장은 사용자가 직접 선택한 경우에만 수행

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

기본 체류 시간은 장소당 최소 45분을 기준으로 계산합니다.

여행 가능 시간에 따라 최대 방문 장소 수를 제한합니다.

- 3시간 → 최대 2곳
- 4시간 → 최대 3곳
- 5시간 → 최대 4곳

초기 Course 생성 단계에서는
여러 Route 조합을 빠르게 비교하기 위해 Haversine 기반 거리를 사용합니다.

Course 화면에 진입한 뒤에는
Course 전체 장소를 서버에 한 번 전달하고,
Next.js Route Handler가 인접 장소별 TMAP 보행 경로를 조회합니다.

TMAP 조회 결과의 실제 거리·시간·path는
Course Summary와 Kakao Polyline에 반영됩니다.

TMAP 조회에 실패한 구간은
Haversine 기반 거리와 예상 도보 시간을 사용해 fallback 처리합니다.

Kakao Map은 지도 Marker / Polyline UI를 담당하고,
TMAP은 실제 보행 경로를 담당합니다.

---

## 데이터 부족 Fallback

FAVEWAY는 촬영지가 부족하다는 이유로
없는 장소나 장면을 만들어내지 않습니다.

```text
촬영지 0개
→ Empty

촬영지 1개
→ 1개 장소 Course 허용

촬영지 2개 이상
→ 정상 Route 탐색
```

1개 장소 Course가 생성되면
서버가 다음과 같은 이유를 구분해 반환합니다.

```text
ONLY_ONE_CANDIDATE
WALKING_LIMIT
DURATION_LIMIT
MULTIPLE_CONSTRAINTS
```

Course 화면에서는 이 값을 기준으로
왜 현재 결과가 1곳인지 설명합니다.

배우 조건으로 후보가 부족한 경우에는
자동으로 작품 전체 촬영지까지 확장하지 않습니다.

사용자가:

```text
배우 조건 없이 작품 전체로 넓혀보기
```

를 직접 선택한 경우에만
작품, 여행 시간, 도보 조건은 유지하고
`actorIds`만 빈 배열로 바꿔 Course를 다시 생성합니다.

자세한 정책은 [`docs/data-fallback-policy.md`](docs/data-fallback-policy.md)를 참고하세요.

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
- Data Fallback Reason Classification

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
- [x] 1개 장소 Course 및 이유 안내
- [x] 사용자 선택 기반 배우 조건 해제 / 작품 범위 확장
- [x] Kakao Map 지도 및 Marker / Polyline 동기화
- [x] TMAP 실제 도보 경로 연동
- [x] TMAP 실패 구간 Haversine fallback
- [x] Course 장소 추가 / 삭제 / 순서 변경
- [x] Course 상태 `localStorage` 저장 / 복원
- [x] 장소 상세의 Scene / Episode / Actor / 검증 정보 표시
- [x] Explore / Planning / Course Loading / Empty / Error / Retry 정리
- [ ] 촬영지 상세 UX 고도화
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
- [`docs/data-fallback-policy.md`](docs/data-fallback-policy.md) — 데이터 부족 및 범위 확장 정책
- [`docs/roadmap.md`](docs/roadmap.md) — 현재 상태와 향후 개발 계획
- [`docs/dev-log.md`](docs/dev-log.md) — 개발 과정과 주요 설계 판단 기록

---

## Project Principle

FAVEWAY의 핵심은 AI가 많은 장소를 만들어내는 것이 아니라,

> **검증된 콘텐츠 데이터를 실제 여행 가능한 경험으로 정확하게 연결하고 개인화하는 것**

입니다.

AI 기능은 이 검증된 데이터와 사용자 흐름 위에서 동작하며,
촬영지 자체를 임의로 생성하지 않습니다.