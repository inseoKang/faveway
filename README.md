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

- Node.js 24.21.0 LTS (`.nvmrc`와 `package.json`의 `engines.node` 기준)
- npm

설치:

```bash
git clone https://github.com/inseoKang/faveway.git
cd faveway
nvm install
nvm use
node --version # v24.21.0
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
npm run test
npm run build
```

---

## Tests

Vitest를 Node 환경에서 실행합니다. `npm run test`는 한 번 실행한 뒤 종료하고,
`npm run test:watch`는 파일 변경 시 다시 실행합니다.

현재 테스트 범위:

- `distance.test.ts`: Haversine 거리와 예상 도보 시간 계산
- `route-selection.test.ts`: 시간별 장소 수 상한, 최소 체류 45분, 총시간·구간 도보 제한, 후보 부족 시 장소 수 감소, 최단 경로·동률 선택, 1곳 선정 이유

- `course-state.test.ts`: 편집된 목록 재계산, 저장 키, 저장 JSON 복원·검증, 경로 재조회 키 (35개)

기존 44개와 합쳐 총 79개이며 기존 CI의 `npm run test`에 자동 포함됩니다.
Course 화면의 순수 함수는 `src/lib/course/course-state.ts`로 분리했습니다.
LocalStorage 접근, 확인창, React 상태·Effect, 경로 요청은 화면에 유지합니다.
잘못된 저장 JSON은 기존 화면의 catch에서 삭제 시도와 경고로 처리합니다.

편집 테스트는 추가·삭제·재정렬된 목록의 계산 결과를 검증합니다.
버튼의 중복 추가 차단·최소 1곳 유지, 실제 저장소 쓰기·접근 오류 경고,
복원 후 fetch 실행·취소 및 화면 유지까지 검증한 것은 아닙니다.
저장 JSON 왕복과 재조회 키 검증은 브라우저 저장·재조회 통합 테스트와 구분합니다.

테스트는 대상 함수 옆에 있으며 작은 가상 좌표를 사용합니다.
Course 생성의 순수 계산 함수는 `src/lib/recommendation/route-selection.ts`에,
입력 검증·DB 조회·후보 필터링·응답 구성은 기존 Trip API에 유지합니다.
실제 DB, 외부 API, 환경변수 설정, 촬영지 CSV가 필요하지 않습니다.
입력 검증을 새로 추가하지 않고 기존 계산 동작을 검증합니다.
React 화면, DB 후보 필터링, TMAP 연동은 후속 테스트 범위입니다.
최소 체류 45분은 최초 Course 생성 기준이며 편집·TMAP 재계산 정책은 변경하지 않습니다.

기존 `@types/node` 20과 호환되는 Vitest 4.1.11을 사용합니다.
로컬·CI 기준 버전은 Node.js 24.21.0 LTS이며, 함께 제공되는 npm 11.19.0으로 검증합니다.
기존 Node.js 22.11.0은 현재 Vite의 Node.js 요구사항(22.12 이상)을 충족하지 않습니다.
`nvm`을 사용하지 않는 경우에도 버전 관리 도구에서 `.nvmrc`와 같은 버전을 선택하세요.
`engines.node`는 요구 버전을 명시하며 Node.js를 자동으로 전환하지 않습니다.

---

## Continuous Integration

GitHub Actions의 `CI` workflow는 `main` 대상 PR과 `main` push에서 자동 실행됩니다.
`main`에 병합한 뒤에는 Actions 탭에서 수동 실행도 가능합니다.

Ubuntu에서 `.nvmrc`의 Node.js 버전(현재 24.21.0)을 읽어 다음 순서로 검사합니다.

```text
npm ci → npm run lint → npm run test → npm run build
→ npx playwright install --with-deps chromium → npm run test:e2e
```

`npm ci`는 lockfile 기준으로 의존성을 설치하고, npm 다운로드 캐시를 사용합니다.
단계가 실패하면 뒤 검사 단계는 실행하지 않지만 실패 artifact 업로드는 시도합니다. 같은 브랜치의 새 실행이 시작되면
이전 실행을 취소하며 실행 제한 시간은 15분입니다.

현재 CI에는 `.env.local`이나 API Key를 등록할 필요가 없습니다.
DB·TMAP·OpenAI 실제 연동을 호출하는 테스트는 포함하지 않고 Docent 생성은 비활성화합니다.
패키지·Chromium·시스템 의존성 설치와 `next/font/google` 폰트 다운로드를 위한 네트워크 연결은 필요합니다.
CI의 build 산출물은 배포용으로 사용하지 않습니다.

PR의 Checks에서 `Lint, test, build` 결과를 확인하고,
실패하면 Actions 로그에서 Install dependencies / Lint / Test / Build / Install Chromium / Playwright E2E 중 실패한 단계를 확인하세요.
E2E는 키 없는 자체 build를 다시 수행합니다. 실패 artifact 구성은 아래 GitHub Actions CI 절을 참고하세요.
첫 GitHub 실행 결과는 이 workflow를 푸시하고 PR을 만든 뒤 확인해야 합니다.
자동 배포와 병합 차단 규칙은 이번 설정에 포함하지 않습니다.
필수 검사로 병합을 차단하려면 첫 실행 후 저장소 Ruleset에서 별도로 지정해야 합니다.

---

## Docker 도입 시 Node.js 버전 기준

Docker 도입 시에도 `.nvmrc`와 같은 Node.js 24.21.0을 사용합니다.
공식 이미지의 해당 버전 태그 제공 여부를 확인한 뒤 `node:24.21.0-bookworm-slim`을
우선 검토하고, 빌드 단계와 실행 단계에 동일한 버전·배포판을 사용하세요.
`node:latest`나 `node:24`처럼 버전이 이동하는 태그는 사용하지 않습니다.
최종 Dockerfile에서는 이미지 digest까지 고정하면 재현성을 더 높일 수 있습니다.

Node 업데이트 시 `.nvmrc`, `package.json`의 `engines.node`, lockfile 루트 메타데이터,
Docker 이미지 버전과 digest를 함께 갱신하고 설치·lint·test·build를 다시 확인합니다.
CI는 `.nvmrc`를 읽으므로 별도 Node 버전 숫자를 수정할 필요가 없습니다.
호스트의 `node_modules`를 이미지에 복사하지 않고 컨테이너 안에서 `npm ci`로 설치하세요.
실제 Dockerfile과 Linux 컨테이너 검증은 Docker 도입 단계에서 진행합니다.

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

## Course 브라우저 Mock 테스트

Node.js 24.21.0에서 Playwright의 Chromium으로 실행합니다. 기존 `npm run test`는
Vitest 단위 테스트만 실행합니다. GitHub Actions workflow에는 Chromium E2E 단계도 포함되어 있습니다.
실제 GitHub runner 통과 여부는 푸시 후 PR Checks에서 확인해야 합니다.

```bash
nvm use
npm ci
npx playwright install chromium
npm run test:e2e
# 실행 과정을 살펴보려면
npm run test:e2e:ui
# 마지막 HTML 결과
npx playwright show-report
```

- 테스트가 키 없는 환경에서 `npm run build` 후 전용 서버(127.0.0.1:43100)를 시작합니다.
  실행 중인 서버를 재사용하지 않으며, 같은 프로젝트의 dev/build와 동시에 실행하지 마세요
  (Next.js 빌드 디렉터리를 공유합니다).
- 각 테스트는 새 브라우저 저장소에서 가짜 Course URL로 시작합니다.
  테스트 데이터는 `tests/e2e/fixtures/course.ts`에만 있습니다.
- 작품·후보·도보 경로 API는 서버로 전달하지 않고 Mock 응답을 제공합니다.
  그 외 API 및 외부 도메인 요청은 차단하고 테스트 실패로 기록합니다.
- 서버도 Supabase·TMAP·OpenAI·Kakao 키를 비우고 Docent를 끕니다.
  테스트 전용 preload가 서버의 fetch 및 Node HTTP(S) 외부 요청을 차단합니다.
  빌드 시 기존 next/font를 위한 Google Fonts 다운로드만 허용하며 실행 시에는 허용하지 않습니다.
  이 장치는 HTTP 차단이며 OS 전체 네트워크 방화벽은 아닙니다.
- Service Worker는 차단합니다. 테스트 보고서의 `network-audit` 첨부와
  `.e2e-network.jsonl`에서 예상하지 않은 요청을 확인할 수 있습니다.
  빈 기록은 해당 차단 장치에서 외부 서비스 요청 시도를 발견하지 않았다는 뜻입니다.
- 일부 경합 테스트는 브라우저 안에서 경로 fetch만 대체해 AbortSignal을 무시하고
  이전 응답을 의도적으로 늦게 전달합니다. 네이티브 fetch 취소 테스트와 구분됩니다.
- 실패 시 스크린샷·trace·HTML 보고서가 생성됩니다. 결과물은 Git에서 제외됩니다.
  실패 테스트를 skip하거나 기대 결과를 완화하지 않습니다.

검증 항목은 장소 추가·기존 장소 및 중복 후보 제외·저장·새 경로 요청,
네이티브 요청 취소, 이전 성공/HTTP 오류/네트워크 오류의 늦은 도착입니다.
지도 SDK와 실제 지도 렌더링, 외부 서비스의 응답 계약 자체는 이 테스트의 검증 범위가 아닙니다.

### GitHub Actions CI

PR의 대상 브랜치가 main일 때, main push 및 수동 실행에서 기존 quality job을 실행합니다.
기존 Check 이름 `Lint, test, build`는 브랜치 보호 설정과의 호환성을 위해 유지합니다.

1. `npm ci`
2. `npm run lint`
3. `npm run test` (Vitest 79개)
4. 키 없는 환경과 서버 HTTP 차단 장치를 적용한 `npm run build`
5. `npx playwright install --with-deps chromium` (Chromium 및 Ubuntu 시스템 의존성)
6. `npm run test:e2e` (Playwright 8개, worker 1, 자동 재시도 없음)

Node 버전은 `.nvmrc`의 24.21.0을 사용하고 Playwright 버전은 lockfile로 고정합니다.
서비스 secrets는 참조하지 않습니다. Supabase URL·서비스 키·TMAP·OpenAI·Kakao 키는 빈 값이며,
Docent는 비활성화합니다. 빌드 중 Google Fonts만 예외로 허용하고 외부 서비스 요청은 차단합니다.

이번에는 E2E 서버의 검증된 실행 방식을 유지하므로 **build를 두 번** 실행합니다.
E2E는 기존 `.next`를 그대로 시작하지 않고 키 없는 환경에서 다시 빌드합니다.
빌드 공유와 출처 검증 로직은 추가하지 않았습니다. 추후 시간이 문제가 될 때 최적화할 수 있습니다.

실패 시 `playwright-failure-<run id>-<attempt>` artifact를 7일간 보관합니다.
HTML 보고서(`playwright-report/`), screenshot·trace(`test-results/`),
E2E 감사 로그(`.e2e-network.jsonl`)와 첫 build의 별도 감사 로그를 포함합니다.
숨김 감사 파일을 포함하도록 설정하되 명시된 경로만 업로드하며 `.env`는 포함하지 않습니다.
브라우저 시작 전 실패하면 screenshot·trace가 없을 수 있고, job 강제 취소/시간 초과 시 업로드는 보장되지 않습니다.

GitHub PR의 Checks에서 quality job 전체 통과, Vitest 79개와 Playwright 8개 결과를 확인하세요.
실패 artifact는 Actions의 해당 실행 상세 페이지에서 내려받습니다.
CI 성공 여부와 artifact 업로드는 실제 GitHub runner 실행 전에는 검증 완료로 기록하지 않습니다.

### 경로 응답 회귀 검증 상태 (2026-10-12)

일반 Mac 터미널의 수정 전 실행은 5개 중 3개 통과, 2개 실패(약 17.5초)였습니다.
HTTP 오류·네트워크 오류 Trace에서 최신 경로의 real 상태가 이전 요청의 fallback으로
바뀌는 것을 확인했습니다. Course의 순서·거리·시간 검사 이후 경로 상태 검사에서 실패했습니다.

`src/app/course/page.tsx`의 catch 진입 시 `controller.signal.aborted`도 확인하도록 수정했습니다.
기존 cleanup이 이전 요청을 abort하므로, 취소된 요청의 일반 오류도 상태 갱신 전에 무시됩니다.
현재 요청의 일반 오류는 기존 Haversine fallback을 그대로 사용합니다.

기존 5개 테스트를 유지하고 최신 HTTP 오류·최신 네트워크 오류·연속 편집을 추가하여 총 8개입니다.
실제 경로의 각 인접 장소 쌍에 맞는 선분이 유지되는지도 화면의 구간 안내로 확인합니다.
실제 Kakao 지도 SDK의 폴리라인 렌더링은 검증하지 않습니다.

사용자가 일반 Mac 터미널의 Node.js 24.21.0에서 lint, Vitest 79개,
키 없는 build를 포함한 Playwright 8개 전체 통과를 확인했습니다.
이는 Mac 로컬 검증 결과이며 GitHub Actions 실행 결과와 구분합니다.
Codex 실행 환경에서는 Turbopack 내부 포트 또는 Chromium 생성 제한이 있을 수 있습니다.

```bash
nvm use
npm run lint
npm run test
# 키 없는 build 후 Playwright 8개 실행
npm run test:e2e
npx playwright show-report
```

Chromium 설치와 중복 build를 포함한 CI 추가 시간은 약 1~3분으로 예상하되,
runner 다운로드·빌드 속도에 따라 달라지므로 첫 Actions 실행에서 측정해야 합니다.
