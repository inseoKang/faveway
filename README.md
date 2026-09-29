# FAVEWAY

> 좋아하는 작품과 배우의 실제 촬영지를 따라 나만의 서울 여행 코스를 만드는 콘텐츠 여행 서비스

FAVEWAY는 드라마·영화·배우를 기준으로 실제 촬영지를 탐색하고,
사용자의 여행 가능 시간과 도보 조건에 맞춰 방문 가능한 코스를 구성하는 개인 프로젝트입니다.

일반적인 AI 여행 추천처럼 장소를 임의로 생성하지 않고,
**DB에 저장된 촬영지와 Actor → Scene → Place 관계를 기준으로 후보를 구성**합니다.

초기 Course는 후보 Route를 빠르게 비교하기 위해
Haversine 기반 거리와 예상 도보 시간을 사용하고,
Course 화면에서는 TMAP 실제 보행 경로를 다시 조회해 거리와 시간을 갱신합니다.

사용자는 완성된 Course에서 장소를 추가·삭제하거나 순서를 변경할 수 있습니다.

AI Docent는 서버에서 DB Context를 조회하고 OpenAI Responses API로 설명을 생성합니다.
Course Docent는 실제 생성과 화면 표시까지 성공했으며,
Place Docent는 실제 API 연결을 마치고 최종 검증을 남겨두고 있습니다.

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
- 배우 기준 조회는 동일 `content_id + place_id`, 작품 기준 조회는 동일 장소 중복 제거
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
- Place / Course 실제 API 요청 연결
- OpenAI Responses API 호출
- Course Docent 실제 생성 및 화면 표시 성공
- DB 기반 Docent Context
- Prompt Guardrail
- Structured Output
- 최소 근거 부족 시 생성 제한

현재 UI는 실제 API를 호출합니다.
`docent-mock.ts`의 생성 함수는 사용하지 않지만,
`DocentMockStop` / `MockDocentResult` 타입 의존성은 남아 있어 정리할 예정입니다.

API는 `ko` / `en`을 지원하고, 현재 UI는 `ko`로 요청합니다.
언어 선택 UI와 영어 출력 품질 검증은 다음 작업입니다.

현재 제공하는 결과는 텍스트입니다.
음성 재생 버튼은 준비 중 상태이며 TTS는 아직 연결하지 않았습니다.

실제 생성은 `ENABLE_OPENAI_DOCENT=true`일 때만 허용합니다.
비활성 상태에서는 Mock으로 전환하지 않고 `503 DOCENT_NOT_ENABLED`를 반환합니다.

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
Active Place Filter
↓
Seoul Region Filter
↓
Actor → Scene → Place Filtering
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

현재 Course는:

```text
region = 서울
+
is_active !== false
```

조건과 유효한 좌표를 만족하는 촬영지만 후보로 사용합니다.
`is_active !== false`는 명시적으로 비활성화된 장소를 제외하는 현재 코드 조건입니다.
`PUBLIC_DATA` 여부는 Course 후보 선정의 필수 조건이 아니며,
아래 Docent evidence 사용 정책과 구분합니다.

서울 외 촬영지 데이터는 삭제하지 않고
DB에 유지합니다.

작품별 촬영지 API와 Course 추가 후보에는 서울 필터를 적용합니다.
배우별 촬영지 API에는 현재 서울 필터가 없어 Explore의 조회 범위는 진입 방식에 따라 다를 수 있습니다.

최대 방문 장소 수:

- 3시간 → 최대 2곳
- 4시간 → 최대 3곳
- 5시간 → 최대 4곳

TMAP 실패 구간은
Haversine 기반 거리와 예상 도보 시간으로 fallback 합니다.
초기 추정값은 실제 도보 가능성을 보증하지 않으며,
TMAP 조회 후 여행 조건을 초과하면 Course 화면에서 안내합니다.

---

## AI Docent 데이터 흐름

```text
Frontend
↓
contentId / placeId / order / language
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
OpenAI Responses API
↓
Structured Output
↓
title + narration
↓
DocentDialog
```

Narration evidence는 다음 조건을 모두 만족하는 데이터만 사용합니다.

```text
verification_status === "PUBLIC_DATA"
+
비어 있지 않은 verified_fact
```

`UNVERIFIED`의 `verified_fact`는 evidence에서 제외합니다.
Scene description은 별도 입력이며,
`PUBLIC_DATA` 상태가 Scene / Episode / Actor까지 독립 검증한다는 의미는 아닙니다.
`place_description`과 사용자 취향은 현재 생성 Context에 포함하지 않습니다.

Place Docent는 Scene description 또는 허용된 evidence가 하나 이상 있어야 생성합니다.
Course Docent는 모든 Stop의 Context가 존재하고,
최소 한 Stop에 설명 근거가 있으면 생성합니다.
근거가 없는 Stop은 이름과 선택 작품만 언급하도록 Prompt로 제한합니다.

현재 UI 상태 처리:

```text
422 DOCENT_CONTEXT_INSUFFICIENT → Empty
그 밖의 실패 응답 → Error + Retry
정상 응답 → title + narration 표시
```

Docent 오류가 발생해도 Course 화면은 유지합니다.
Structured Output은 응답 형식을 제한하며,
생성 문장의 사실 정확성과 표현 품질은 별도로 검증합니다.

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

## 촬영지 데이터 검수 파이프라인

원천 촬영지 데이터를 서비스 DB에 바로 넣지 않고,
정규화와 비교를 거쳐 검수 후보를 만듭니다.

```text
KCCF / Blog CSV
↓
작품명 / 주소 정규화
↓
대상 작품 및 서울 주소 필터
↓
작품 + 주소 기준 후보 병합
↓
출처 / 장소명 / 좌표 비교
↓
검수 후보 및 검수 이유 생성
↓
수동 검수
↓
승인 데이터 DB 반영
```

현재 자동화 범위는 검수 CSV 생성까지입니다.
수동 검수와 Supabase Import는 별도 단계입니다.

출력 CSV 집계 (2026-09-29 기준):

- 대상 작품: 10개
- 전체 후보: 443개
- 우선 검수 후보: 167개
- 검수 상태: 모두 `PENDING`

위 수치는 검수용 CSV의 행 수이며 서비스 DB의 장소 수가 아닙니다.
현재 같은 작품과 정규화 주소가 같으면 장소명이 달라도 병합하므로,
같은 주소의 서로 다른 촬영 포인트 보존 기준은 보완할 예정입니다.

자세한 내용은 [`docs/data-pipeline.md`](docs/data-pipeline.md)를 참고하세요.

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
- 실제 API 기반 Docent UX

### Data Pipeline

- Python
- pandas
- CSV 정규화 / 후보 병합 / 검수 컨텍스트 생성

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

데이터 파이프라인:

```text
scripts/data-pipeline/build_candidates.py
data/raw/
outputs/data-expansion/content_place_candidates.csv
outputs/data-expansion/content_place_review.csv
```

애플리케이션:

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
- [x] Course / Place Docent 실제 API 연결
- [x] AI Docent Loading / Success / Empty / Error / Retry 구현
- [x] PUBLIC_DATA 기반 evidence 필터
- [x] Course Docent 실제 생성 및 표시
- [x] shell 환경변수 충돌 해결 후 OpenAI 호출 성공
- [x] KCCF / Blog 촬영지 검수 후보 파이프라인
- [x] 서울 지역 Course 후보 필터
- [x] Course 장소 추가 후보 서울 필터
- [x] `places.region` 데이터 보강
- [x] `places.place_description` 도입
- [x] 도깨비 촬영지 1차 검증 데이터 보강
- [ ] Place Docent 실제 생성 및 표시 최종 검증
- [ ] FAVEWAY Local API Key 사용 기록 확인
- [ ] 새 shell의 API Key 설정 재발 여부 확인
- [ ] 남은 Mock 함수 / 타입 의존성 정리
- [ ] KR / EN 언어 선택과 출력 품질 검증
- [ ] 실제 API Empty / Error / Retry 시나리오 검증
- [ ] TTS
- [ ] 추가 작품 데이터 확장 및 남은 촬영지 정제
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

NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY=
TMAP_APP_KEY=

OPENAI_API_KEY=
OPENAI_DOCENT_MODEL=
ENABLE_OPENAI_DOCENT=false
```

`OPENAI_DOCENT_MODEL`을 비워 두면 코드 기본값인 `gpt-5-mini`를 사용합니다.
실제 Docent를 사용하려면 유효한 API Key를 설정하고 다음 값을 적용합니다.

```env
ENABLE_OPENAI_DOCENT=true
```

`false` 상태에서도 탐색과 Course 기능은 개발할 수 있지만,
Docent 요청은 비활성 오류로 처리됩니다.

Supabase에는 프로젝트의 테이블과 작품 / 장소 / Scene 관계 데이터가 필요합니다.
의존성 설치만으로 서비스 데이터가 자동 생성되지는 않습니다.

기존 shell에 다른 `OPENAI_API_KEY`가 설정되어 있으면
프로젝트 `.env.local`의 키보다 우선 적용될 수 있습니다.
2026-09-29에는 이 충돌로 OpenAI의 `429 credit_balance_exhausted`가 발생했고,
기존 변수를 해제한 뒤 개발 서버를 다시 실행해 해결했습니다.

프로젝트 키를 사용하려는 경우 기존 shell 설정을 확인하고,
현재 세션의 충돌하는 값을 해제한 뒤 서버를 다시 시작합니다.
API Key 원문은 로그나 문서에 남기지 않습니다.

```bash
unset OPENAI_API_KEY
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
- [`docs/data-fallback-policy.md`](docs/data-fallback-policy.md) — 데이터 부족 및 범위 확장 정책
- [`docs/data-pipeline.md`](docs/data-pipeline.md) — 촬영지 후보 생성 및 수동 검수 흐름
- [`docs/roadmap.md`](docs/roadmap.md) — 현재 상태와 향후 개발 계획
- [`docs/dev-log.md`](docs/dev-log.md) — 개발 과정과 주요 설계 판단 기록

---

## Project Principle

FAVEWAY의 핵심은 AI가 많은 장소를 만들어내는 것이 아니라,

> **검증된 콘텐츠 데이터를 실제 여행 가능한 경험으로 정확하게 연결하고 개인화하는 것**

입니다.

현재 AI는 DB Context를 바탕으로 도슨트 설명을 생성합니다.
개인화와 AI Ranking은 다음 확장 단계이며,
촬영지와 장면 사실을 임의로 생성하지 않도록 입력과 Prompt를 제한합니다.
