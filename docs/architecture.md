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

AI는 향후 검증된 장소를 기반으로
개인화와 설명을 제공하는 역할로 제한합니다.

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
└─ TMAP Proxy
↓
External Services
├─ Supabase PostgreSQL
├─ Kakao Maps JavaScript SDK
└─ TMAP Pedestrian API
```

별도의 Backend 서버를 두지 않고
Next.js Route Handler를 API 계층으로 사용합니다.

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

Kakao Map은 실제 보행 거리 계산을 담당하지 않습니다.

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

Haversine은 현재 실제 Course 화면의 최종 경로 계산 수단이 아니라
빠른 초기 계산과 외부 API 실패 대응용으로 사용합니다.

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
```

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

작품과 배우의 기본 관계:

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

관계를 사용해
선택 배우가 실제 등장한 Scene과 연결된 장소만 남깁니다.

---

# 6. 배우 기준 데이터 흐름

```text
Actor
↓
content_actors
↓
Contents
```

작품을 선택하지 않으면
해당 배우의 전체 관련 작품을 사용합니다.

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

초기 Route 조합 탐색에서는
다수의 Route를 비교해야 하므로 Haversine을 사용합니다.

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

구조로 실제 이동 데이터를 다시 반영합니다.

---

# 8. Walking Route Layer

Client에서는 Course 전체 장소를 한 번만 전달합니다.

```text
Course Stops
↓
POST /api/routes/walking
```

Server에서는:

```text
A → B
B → C
C → D
```

형태로 인접 구간을 분리한 뒤
각 구간별로 TMAP을 호출합니다.

결과:

```text
distance
duration
path
success
```

을 segment 단위로 통합해 반환합니다.

---

# 9. Route Partial Failure

TMAP 실패를 Course 전체 실패로 취급하지 않습니다.

```text
TMAP 성공 구간
→ 실제 Route

TMAP 실패 구간
→ Haversine fallback
```

상태는:

```text
real
partial
fallback
```

으로 구분합니다.

### real

모든 구간이 TMAP 실제 경로입니다.

### partial

일부 구간만 Haversine fallback입니다.

### fallback

전체 구간이 Haversine fallback입니다.

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
- Course 장소 추가
- Course 장소 삭제
- Course 장소 순서 변경
- Course Summary 갱신
- localStorage 저장 / 복원
- TMAP Route 재조회
- Kakao Marker / Polyline 동기화
- Loading / Empty / Error / Retry 상태 처리
- 부분 실패 Warning 처리
- 이전 페이지 Navigation

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

---

# 12. Course 상태 구조

Course의 장소 목록을 핵심 상태로 사용합니다.

```text
Course Stops
```

사용자가 직접 변경하는 대상:

```text
장소 추가
장소 삭제
장소 순서 변경
```

이 상태가 변경되면 다음 데이터가 다시 계산됩니다.

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
```

---

# 13. Persistence

사용자가 직접 변경한 Course 상태는
브라우저 localStorage에 저장합니다.

저장 대상:

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
```

외부 API에서 다시 얻을 수 있는 데이터는
Course 복원 후 재조회합니다.

---

# 14. 상태 처리 구조

현재 공통 상태 처리 기준:

```text
StateFeedback
InlineWarning
```

## StateFeedback

주로 다음 상태에 사용합니다.

- Loading
- Empty
- Error
- Retry

## InlineWarning

핵심 기능을 막지 않는 부분 실패에 사용합니다.

예:

```text
TMAP 일부 실패
TMAP 전체 fallback
localStorage 저장 실패
```

---

# 15. 현재 상태 처리 범위

완료:

```text
Explore
ExploreMap
CourseMap
Course
```

다음 정리 대상:

```text
Planning
```

---

# 16. AI 적용 방향

AI는 Candidate 생성자가 아닙니다.

향후 구조:

```text
Validated DB Candidate
↓
User Preference
↓
Ranking / Explanation
↓
Structured Output
↓
Candidate ID Validation
↓
Final Result
```

AI가 DB에 존재하지 않는 촬영지를 반환하더라도
실제 Candidate로 사용하지 않습니다.

---

# 17. AI Docent 구조

향후 AI Docent:

```text
Verified DB Data
+
Content
+
Scene
+
Actor
+
Place
+
User Preference
↓
LLM
↓
Docent
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