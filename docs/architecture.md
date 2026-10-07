# FAVEWAY Architecture

최종 업데이트: 2026-10-07.

## 1. 목적

FAVEWAY는 영화·드라마·배우를 기준으로
DB에 저장된 실제 촬영지를 탐색하고,
사용자의 여행 조건에 맞는 서울 도보 Course를 구성하는
Next.js 기반 웹 서비스입니다.

핵심 원칙:

```text
촬영지 생성
≠
AI

촬영지 후보
=
DB의 실제 장소
```

현재 AI는 DB Context를 바탕으로 Docent 설명을 생성합니다.
개인화는 향후 확장 대상이며, 촬영지 사실을 임의 생성하지 않도록 제한합니다.

---

# 2. 전체 구조

```text
User
↓
Next.js Frontend
↓
Next.js Route Handler
├─ Supabase Query
├─ Trip Recommendation
├─ TMAP Proxy
└─ AI Docent
   ├─ DB Context 구성
   └─ OpenAI 호출
↓
External Services
├─ Supabase PostgreSQL
├─ Kakao Maps JavaScript SDK
├─ TMAP Pedestrian API
└─ OpenAI API
```

별도의 Backend 서버를 두지 않고
Next.js Route Handler를 API 계층으로 사용합니다.

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

---

# 3. 외부 서비스 역할

## Supabase

역할:

```text
Content
Actor
Scene
Place
Relation
Verification Data
```

핵심 역할:

**서비스의 기준 데이터 저장**

---

## Kakao Map

역할:

- 촬영지 Marker 표시
- 장소 위치 시각화
- Course Polyline 표시
- Marker와 장소 카드 상태 동기화

핵심 역할:

**지도 UI**

---

## TMAP

역할:

- 실제 보행 경로 계산
- 실제 이동 거리 계산
- 예상 도보 시간 계산
- 실제 보행 Path 반환

핵심 역할:

**Route 계산**

---

## Haversine

역할:

- 초기 Course 후보 Route 비교
- TMAP 실패 구간 fallback

---

## OpenAI

역할:

```text
Verified DB Context
↓
LLM
↓
AI Docent narration
```

OpenAI는 다음을 담당하지 않습니다.

```text
촬영지 생성
Scene 생성
Episode 추측
출처 생성
```

실제 호출은 `ENABLE_OPENAI_DOCENT === "true"`에서 허용합니다.
로컬 환경에서 Course 생성에 성공했습니다. 환경별 활성화 설정은 별도로 관리합니다.

---

# 4. 사용자 흐름

## 코스 만들기

```text
HOME
↓
/plan
↓
작품으로 찾기 / 배우로 찾기
↓
/planning
↓
여행 시간 / 최대 도보 시간 선택
↓
POST /api/trips
↓
/course
↓
POST /api/routes/walking
↓
실제 TMAP Route
↓
Course 확인 / 편집
↓
AI Docent 실제 API UX
```

Course 화면에서는:

```text
이 코스 이야기 듣기
+
현장에서 도슨트 듣기
```

두 가지 Docent 진입점을 제공합니다.

---

## 촬영지 둘러보기

```text
HOME
↓
/explore
↓
작품으로 찾기 / 배우로 찾기
↓
촬영지 조회
↓
촬영지 목록 + Kakao Map
↓
PlaceDetailDialog
```

---

# 5. 작품 기준 데이터 흐름

```text
Content
↓
content_actors
↓
Actors
```

배우를 선택하지 않으면
작품 전체 촬영지를 사용합니다.

배우를 선택하면:

```text
Selected Actors
↓
scene_actors
↓
Scenes
↓
scene_places
↓
Places
```

---

# 6. 배우 기준 데이터 흐름

```text
Actor
↓
content_actors
↓
Contents
```

촬영지 조회:

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

핵심 원칙:

```text
배우가 작품에 출연함
≠
그 작품의 모든 촬영지가 배우 관련 장소
```

---

# 7. Recommendation Layer

현재 Course 생성은 규칙 기반입니다.

```text
DB Candidate
↓
Active Place Filter
↓
Region Filter
↓
Actor / Scene Filter
↓
Deduplication
↓
Coordinate Validation
↓
Route Combination
↓
Haversine Distance
↓
Walking Constraint
↓
Duration Constraint
↓
Distance Optimization
↓
Initial Course
```

현재 Region Filter:

```text
region = 서울
```

서울 외 촬영지는 DB에서 삭제하지 않고
현재 Course Candidate에서만 제외합니다.

Course 화면에서는:

```text
Initial Course
↓
POST /api/routes/walking
↓
TMAP
↓
Actual Walking Route
↓
Course Summary 갱신
```

---

# 8. Walking Route Layer

Client에서는 Course 전체 장소를 한 번만 전달합니다.

```text
Course Stops
↓
POST /api/routes/walking
```

Server:

```text
A → B
B → C
C → D
```

형태로 인접 구간을 분리해 TMAP을 호출합니다.

---

# 9. Route Partial Failure

```text
TMAP 성공 구간
→ 실제 Route

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

# 10. Frontend 책임

Frontend는 다음 역할을 담당합니다.

- 작품 / 배우 탐색
- 검색 상태 관리
- 작품 / 배우 복수 선택
- 여행 조건 입력
- API 요청
- Course 결과 표시
- 장소 상세 Dialog
- Course 장소 추가 / 삭제 / 순서 변경
- Course Summary 갱신
- localStorage 저장 / 복원
- TMAP Route 재조회
- Kakao Marker / Polyline 동기화
- Loading / Empty / Error / Retry 상태 처리
- 부분 실패 Warning 처리
- AI Docent 실제 API UX
- Course Docent Dialog
- Place Docent Dialog
- AI Docent Loading / Success / Empty / Error / Retry 상태

---

# 11. Route Handler 책임

Next.js Route Handler는 다음 역할을 담당합니다.

- Supabase 데이터 조회
- Actor → Scene → Place 관계 검증
- 작품 범위 필터링
- 중복 관계 제거
- Trip 후보 구성
- Route 조건 검증
- TMAP appKey 보호
- TMAP 보행 경로 요청
- 인접 구간 Route 처리
- segment 결과 통합
- 구간별 실패 상태 반환
- AI Docent Context 조회
- 검증된 evidence 필터링
- OpenAI API Key 보호
- OpenAI 호출 여부 제어
- 활성 장소 필터링
- 서울 서비스 지역 필터링

---

# 12. Course 상태 구조

핵심 상태:

```text
Course Stops
```

사용자 변경:

```text
장소 추가
장소 삭제
장소 순서 변경
```

변경 시:

```text
Course Stops
↓
order
↓
Walking Route
↓
distance
↓
walking time
↓
stay time
↓
Course Summary
↓
Kakao Marker / Polyline
↓
Docent Stop Order
```

까지 갱신됩니다.

---

# 13. Persistence

localStorage 저장 대상:

```text
Course Stops
장소 추가
장소 삭제
장소 순서
```

저장하지 않는 데이터:

```text
TMAP Route
TMAP Path
AI Docent 결과
```

---

# 14. 상태 처리 구조

공통 상태 처리:

```text
StateFeedback
InlineWarning
```

AI Docent 실제 API UX:

```text
Loading
Success
Empty
Error
Retry
```

---

# 15. AI Docent Context Layer

Client는 설명 문자열이 아니라 식별자만 전달합니다.

```text
Client
↓
contentId
placeId
order
```

Server:

```text
IDs
↓
Supabase 재조회
↓
Content
Place
Scene
Scene Actor
Verified Evidence
↓
Docent Context
```

---

# 16. AI Docent Evidence

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

# 17. AI Docent 최소 근거

Place Docent를 생성하려면 다음 중 하나 이상이 필요합니다.

```text
Scene Description
또는
Verified Fact
```

둘 다 없다면:

```text
DOCENT_CONTEXT_INSUFFICIENT
```

를 `422`로 반환합니다.

Course는 모든 Stop의 Context가 존재하고,
그중 최소 한 Stop에 위 설명 근거가 있으면 생성합니다.
한 Stop이라도 Context가 없으면 `404`, 전체 Stop에 설명 근거가 없으면 `422`입니다.
근거 없는 Stop에 촬영 사실이나 장면 내용을 추가하지 않도록 Prompt로 제한합니다.

Docent Context 조회는 비활성 장소를 제외하지만 서울 region 필터를 다시 적용하지 않습니다.
Scene은 요청 작품 범위로 제한합니다.
`place_description`, 사용자 취향, 여행 분위기는 현재 생성 Context에 포함하지 않습니다.

---

# 18. AI Docent 생성 구조

```text
Frontend
↓
POST /api/docents/place
또는
POST /api/docents/course
↓
Next.js Route Handler
↓
Supabase
↓
Docent Context
↓
Prompt
↓
OpenAI Responses API
↓
Structured Output
↓
Docent Response
```

---

# 19. AI Docent Prompt 정책

AI는 다음을 임의 생성하지 않습니다.

```text
촬영지
Scene
Episode
Actor
대사
촬영 사실
시설
내부 공간
촬영 구도
출입 가능 여부
운영 시간
촬영 허가
```

실제 배우처럼 1인칭으로 사칭하지 않습니다.

---

# 20. 실제 OpenAI 호출 제어

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

# 21. 현재 AI Docent UI 구조

```text
Course
├─ 이 코스 이야기 듣기
│  └─ Course Docent
│
└─ 각 Stop
   └─ 현장에서 도슨트 듣기
      └─ Place Docent
```

현재 데이터 흐름:

```text
DocentDialog
↓
POST /api/docents/place 또는 /api/docents/course
↓
서버 DB Context 재조회
↓
OpenAI Responses API
↓
Structured Output
↓
title + narration 표시
```

Course는 실제 생성과 화면 표시까지 성공했습니다. Place 최종 검증은 남아 있습니다.
Mock 생성 호출은 사용하지 않지만 Mock 파일의 타입 의존성은 남아 있습니다.
API는 ko / en을 지원하고 UI는 ko로 고정되어 있습니다.

현재 `422 DOCENT_CONTEXT_INSUFFICIENT`는 Empty,
나머지 비정상 응답은 Error + Retry로 처리합니다.

---

# 22. TTS

현재 TTS는 구현하지 않았습니다.

```text
음성으로 듣기 · 준비 중
```

상태만 표시합니다.

---

# 23. AI 적용 원칙

Recommendation:

```text
Validated DB Candidate
↓
AI Ranking
```

Docent:

```text
Verified DB Context
↓
AI Explanation
```

AI가 맡는 역할:

```text
설명
개인화
문장 생성
```

AI가 맡지 않는 역할:

```text
촬영지 생성
장면 사실 생성
출처 생성
```

---

# 24. 데이터 파이프라인과 서비스 DB

```text
KCCF / Blog CSV
↓
대상 작품 및 서울 주소 필터
↓
작품명 / 주소 정규화
↓
작품 + 주소 기준 후보 병합
↓
좌표 / 장소명 / 출처 비교
↓
전체 후보 CSV + 우선 검수 CSV
```

현재 파이프라인 코드의 자동 처리는 CSV 생성까지입니다.
수동 검수와 승인 데이터의 Supabase 반영은 별도 단계이며,
이 코드가 DB import까지 수행하는 것은 아닙니다.

자동 생성 출력 CSV는 후보 443개, 우선 검수 167개이며 모두 PENDING입니다.
수동 검수는 별도 기준 파일 `data/manual/content_place_decisions.csv`에 누적합니다.
2026-10-07 기준 REVIEWED 96 / PENDING 71이며 서비스 DB 등록 수를 의미하지 않습니다.
원본 출처 존재 플래그는 유입 이력으로 보존하고, 채택·제외한 근거 및 사용자 확인은 검수 메모에서 구분합니다.
MERGE 기록만으로 장면·배우·근거가 이전되거나 Supabase에 반영되지는 않습니다.
현재 CSV 이력과 후속 작업은 [데이터 파이프라인](data-pipeline.md#manual-review-csv-history)을 참고합니다.

# 25. 적용 범위와 현재 한계

- Trip과 작품별 장소 API는 `is_active !== false` 및 서울 조건을 적용합니다.
- 배우별 장소 API에는 서울 필터가 없습니다. Explore의 두 탐색 경로가 같은 지역 범위를 반환한다고 단정하지 않습니다.
- Trip은 `place_id`, 배우별 조회는 `content_id + place_id`로 중복을 제거합니다.
- Course 생성은 규칙 기반이며 AI Ranking / 개인화는 아직 구현 예정입니다.
- `PUBLIC_DATA` 필터는 Docent의 `verified_fact` 사용 조건입니다. 모든 Course 후보의 필수 검증 상태가 아닙니다.
- Structured Output은 응답 형식을 제한합니다. 생성 내용의 사실 검증은 별도 품질 확인이 필요합니다.
