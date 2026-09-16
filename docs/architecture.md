# FAVEWAY Architecture

## 1. 목적

FAVEWAY는 콘텐츠와 배우를 기준으로 실제 촬영지를 탐색하고, 여행 조건에 맞는 코스를 생성하는 Next.js 기반 웹 서비스입니다.

핵심 구조는 다음과 같습니다.

```text
User
↓
Next.js Frontend
↓
Next.js Route Handler
↓
Supabase PostgreSQL
↓
Filtering / Recommendation Logic
↓
Course / Filming Location Result
```

별도의 Backend 서버를 두지 않고 Next.js Route Handler를 API 계층으로 사용합니다.

---

## 2. 사용자 흐름

### 코스 만들기

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
```

### 촬영지 둘러보기

```text
HOME
↓
/explore
↓
작품으로 찾기 / 배우로 찾기
↓
촬영지 목록
↓
PlaceDetailDialog
```

---

## 3. 작품 기준 흐름

```text
Content
↓
content_actors
↓
Actors
```

배우를 선택하지 않으면 작품 전체 촬영지를 사용합니다.

배우를 선택하면:

```text
Selected Actors
↓
scene_actors
↓
scenes
↓
scene_places
↓
places
```

관계를 사용해 실제 등장 Scene과 연결된 장소만 남깁니다.

---

## 4. 배우 기준 흐름

```text
Actor
↓
content_actors
↓
Contents
```

사용자가 작품을 선택하지 않으면 해당 배우의 전체 관련 작품을 사용합니다.

촬영지 조회는:

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

관계를 사용합니다.

---

## 5. Recommendation Layer

현재 추천은 규칙 기반입니다.

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
Walking Constraint
↓
Duration Constraint
↓
Distance Optimization
```

향후 AI는 후보 생성이 아니라 **유효한 Candidate와 Route 후보의 개인화·정렬·설명**에 사용합니다.

---

## 6. Frontend 책임

Frontend는 다음 역할을 담당합니다.

- 작품 / 배우 탐색
- 사용자 선택 상태 관리
- 작품 / 배우 복수 선택
- 여행 조건 입력
- API 요청
- Course 결과 표시
- 장소 상세 Dialog
- 이전 페이지 Navigation

---

## 7. Backend 책임

Route Handler는 다음 역할을 담당합니다.

- DB 조회
- Actor → Scene → Place 관계 검증
- 작품 범위 필터링
- 중복 관계 제거
- 여행 코스 후보 구성
- Route Validation
- 응답 데이터 가공

---

## 8. 향후 구조

```text
Validated DB Candidate
↓
Route Candidate Generator
↓
LLM Ranking
↓
Structured Output Validation
↓
Candidate ID Validation
↓
Final Course
```

지도 연동 이후 거리 계산은 Haversine 추정에서 Kakao Map 기반 실제 도보 경로로 변경할 예정입니다.
