# FAVEWAY Architecture

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

AI는 검증된 DB 정보를 바탕으로
설명과 개인화를 제공하는 역할로 제한합니다.

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

현재 Course 화면의 AI Docent UX는
실제 OpenAI API가 아닌 Mock 데이터를 사용합니다.

실제 OpenAI 호출 구조는 구현되어 있으나
환경변수로 비활성화할 수 있습니다.

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

현재 실제 OpenAI 호출은:

```env
ENABLE_OPENAI_DOCENT=false
```

상태로 비활성화할 수 있습니다.

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
AI Docent Mock UX
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
Actor / Scene Filter
↓
Active Place Filter
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
- AI Docent Mock UX
- Course Docent Dialog
- Place Docent Dialog
- AI Docent Loading / Empty / Error / Retry Mock 상태

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

AI Docent Mock UX:

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

AI에 전달하는 verified_fact는
검증 상태를 통과한 데이터로 제한합니다.

현재 허용 상태:

```text
verified
approved
confirmed
complete
completed
```

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

를 반환합니다.

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

```env
ENABLE_OPENAI_DOCENT=false
```

비활성 상태에서는:

```text
POST /api/docents/place
POST /api/docents/course
```

요청이 OpenAI까지 전달되지 않습니다.

실제 연결 시:

```env
ENABLE_OPENAI_DOCENT=true
```

로 변경합니다.

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

현재 데이터 소스:

```text
DocentDialog
↓
docent-mock.ts
```

실제 연결 시:

```text
Mock
↓
POST /api/docents/place
POST /api/docents/course
```

로 교체할 예정입니다.

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