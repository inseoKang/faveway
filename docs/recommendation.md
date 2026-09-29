# FAVEWAY Recommendation

최종 업데이트: 2026-09-29.

## 1. 목표

FAVEWAY의 추천 로직은
DB에 없는 촬영지를 생성하는 것이 아니라,

**DB에 등록된 촬영지 Candidate 안에서 여행 조건에 맞는 서울 도보 Route를 구성하는 것**

현재 후보 선정은 PUBLIC_DATA 상태를 필수 조건으로 검사하지 않습니다.
초기 거리·시간은 Haversine 추정치이며 실제 보행 가능성을 보증하지 않습니다.

을 목표로 합니다.

```text
AI
≠
촬영지 생성
```

---

# 2. 입력

현재 주요 입력:

```text
contentIds
actorIds
durationMinutes
maxWalkingMinutes
```

현재 Course 서비스 지역:

```text
서울
```

---

# 3. Candidate 생성

## 배우 미선택

```text
Contents
↓
place_relations
↓
Places
```

선택한 작품의 촬영지 중
현재 서비스 범위에 맞는 서울 활성 장소를 사용합니다.

---

## 배우 선택

```text
Actors
↓
scene_actors
↓
Scenes
↓
scene_places
↓
Places
```

선택 배우가 실제 등장한 Scene의 촬영지만 사용합니다.

복수 배우는 현재 OR 조건입니다.

예:

```text
공유 OR 김고은
```

---

# 4. Candidate 필터링

Candidate 생성 후:

```text
Active Place Filter
↓
Region Filter
↓
Actor → Scene → Place Filter
↓
Duplicate Filter
↓
Coordinate Filter
```

를 적용합니다.

현재 지역 필터:

```text
region = 서울
```

현재 Course 후보 기본 조건:

```text
is_active !== false
+
region = 서울
+
좌표 존재
```

배우 기준 장소 조회에서는 동일한:

```text
content_id + place_id
```

관계를 한 번만 사용합니다.

서울 외 촬영지는
DB에서 삭제하지 않고 현재 Course 후보에서만 제외합니다.

---

# 5. Course 장소 추가 후보

Course 화면에서 장소를 추가할 때도
초기 Course 생성과 동일한 서비스 범위 조건을 적용합니다.

```text
GET /api/contents/:contentId/places
↓
Active
↓
서울
↓
현재 Course에 없는 장소
↓
좌표 존재
↓
추가 Candidate
```

Frontend에서도:

```text
is_active
region
coordinate
duplicate
```

조건을 한 번 더 확인합니다.

---

# 6. 초기 거리 계산

Course 생성 단계에서는
위도·경도를 이용한 Haversine Formula를 사용합니다.

```text
Place A
↓
Haversine
↓
Place B
```

이 단계의 목적은
다수의 Route 조합을 빠르게 비교하는 것입니다.

Haversine은 실제 도로 구조가 아닌
두 좌표 사이 직선거리를 계산합니다.

예상 도보 시간은 거리 보정 1.25배와 시속 4km를 적용합니다.

```text
ceil(distanceKm × 1.25 ÷ 4 × 60)
```

거리 값 자체는 직선거리이며 1.25배 보정은 시간 추정에 적용합니다.

따라서 초기 Course 생성 이후
실제 Course 화면에서 TMAP을 통해 실제 도보 경로를 다시 조회합니다.

---

# 7. Route Combination

후보 장소들을 이용해
가능한 방문 순서를 생성합니다.

현재 방식:

```text
Candidate
↓
Route Combination
↓
각 Route 조건 검사
```

Candidate 수가 증가할수록
Route 조합 수가 빠르게 증가합니다.

현재 코드는 방문 순서를 포함한 순열을 배열로 생성해 비교합니다.
후보 수가 늘면 계산 시간과 메모리 사용량을 측정해 최적화 여부를 판단합니다.

---

# 8. Route Constraint

## 전체 여행 시간

현재:

```text
180분
240분
300분
```

즉:

```text
3시간
4시간
5시간
```

---

## 한 구간 최대 도보 시간

현재:

```text
10분
20분
30분
제한 없음
```

`maxWalkingMinutes = null`은
도보 제한 없음이라는 의미입니다.

---

# 9. 최대 방문 장소 수

현재:

```text
3시간 → 최대 2곳
4시간 → 최대 3곳
5시간 → 최대 4곳
```

Candidate가 더 적은 경우
Candidate 수를 초과하지 않습니다.

---

# 10. Route 선택 기준

현재 주요 기준:

```text
1. 서울 활성 촬영지 후보인지 확인
2. 여행 조건을 만족하는 Route인지 확인
3. 가능한 최대 방문 장소 수 확보
4. 총 이동거리 최소화
```

초기 Route 비교에서 사용하는 이동거리는
Haversine 기반입니다.

---

# 11. 체류 시간

현재 체류 시간은:

```text
전체 여행 시간
-
예상 총 이동 시간
=
전체 체류 가능 시간
```

이후:

```text
전체 체류 가능 시간
÷
장소 수
```

방식으로 균등 분배하며 `Math.floor`로 분 단위 소수점을 버립니다.

최소 체류 기준:

```text
MIN_STAY_MINUTES = 45
```

을 Course 생성 조건에 사용합니다.

---

# 12. 데이터 범위 점검 기록 (2026-09-21)

점검일: 2026-09-21.

도깨비:

```text
서울 활성 촬영지 18곳
```

여신강림:

```text
서울 활성 촬영지 10곳
```

서울 후보 필터를 적용했고, 위 작품의 후보 수를 확인했습니다.

이 숫자는 데이터 정제에 따라 변경될 수 있습니다.

---

# 13. Course 화면 실제 경로

초기 Course 생성 후
Course 화면에서는 실제 보행 경로를 다시 조회합니다.

```text
Initial Course
↓
POST /api/routes/walking
↓
TMAP Pedestrian API
↓
Actual Distance
+
Actual Walking Time
+
Actual Path
↓
Course Summary 갱신
↓
Kakao Map Polyline 갱신
```

---

# 14. TMAP 요청 구조

Client:

```text
Course 전체 Stops
↓
POST /api/routes/walking 1회
```

Server:

```text
A → B
B → C
C → D
```

형태로 인접 구간을 순차 조회합니다.

---

# 15. TMAP Fallback

TMAP 요청 실패가
Course 전체 실패로 이어지지 않도록 합니다.

## 일부 구간 실패

```text
A → B
TMAP

B → C
실패
→ Haversine

C → D
TMAP
```

상태:

```text
partial
```

---

## 전체 구간 실패

```text
A → B
Haversine

B → C
Haversine

C → D
Haversine
```

상태:

```text
fallback
```

Course 자체는 계속 사용할 수 있습니다.

---

# 16. 좌표 오류

하나의 장소에 좌표가 없다고 해서
Walking Route 요청 전체를 실패시키지 않습니다.

문제가 있는 구간만 실패 상태로 반환하고
다른 정상 구간은 TMAP을 계속 조회합니다.

초기 Course Candidate 단계에서는
좌표가 없는 장소를 제외합니다.

---

# 17. Course 편집 후 재계산

다음 액션이 발생하면 Route를 다시 계산합니다.

```text
장소 추가
장소 삭제
순서 변경
Course 초기화
localStorage 복원
```

흐름:

```text
Course Stops 변경
↓
Haversine 임시 계산
↓
TMAP Route 재조회
↓
실제 거리 / 시간 반영
↓
Summary 갱신
↓
Map 갱신
```

---

# 18. is_active와 region 책임

두 값은 서로 다른 역할을 가집니다.

```text
is_active
→ 현재 방문 가능한 Course 후보인가

region
→ 현재 서비스 지역 범위에 포함되는가
```

예:

```text
월정사
is_active = true
region = 강원
↓
DB 유지
서울 Course 제외
```

```text
달콤커피 종로종각점
region = 서울
is_active = false
↓
촬영지 기록 유지
Course 제외
```

---

# 19. 현재 한계

- 초기 Route 조합 평가는 Haversine 기반
- TMAP 외부 API 장애 가능
- TMAP 실패 구간은 직선거리 예상값 사용
- 장소별 실제 권장 체류시간 미반영
- 신호 대기 / 혼잡도 등은 직접 반영하지 않음
- Candidate 증가 시 Route 조합 비용 증가
- 서버에서는 장소 수 - 1 만큼 TMAP 요청 발생
- 서비스 지역이 현재 서울로 고정됨
- `place_type` 데이터 품질이 아직 불균일함

---

# 20. 향후 최적화

실제 호출량 문제가 확인되는 경우 다음을 검토합니다.

```text
동일 구간 캐시
변경된 구간만 재조회
TMAP 호출량 모니터링
Route 탐색 알고리즘 최적화
지역 조건 사용자 선택화
```

현재 규모에서는
불필요한 선행 최적화보다
기존 구조의 안정성을 우선합니다.

---

# 21. 향후 AI Recommendation

AI는 Candidate 생성자가 아니라
Ranking / Personalization Layer로 사용합니다.

```text
Validated Candidate
↓
Valid Route Candidates
↓
User Preference
↓
AI Ranking
↓
Structured Output
↓
Candidate ID Validation
↓
Final Course
```

AI가 DB에 없는 Place ID를 반환하면
유효하지 않은 결과로 처리합니다.

---

# 22. 현재 AI Docent와 향후 개인화

현재:

```text
Course Stops의 작품 / 장소 ID와 순서
↓
서버 DB Context 조회
↓
Scene 기록 + 허용된 PUBLIC_DATA evidence
↓
OpenAI Responses API
↓
title + narration
↓
DocentDialog
```

Course Docent는 실제 생성과 화면 표시까지 성공했습니다.
Place Docent는 실제 API 호출 구조가 연결됐으며 최종 검증은 남아 있습니다.
API는 ko / en을 지원하지만 현재 UI는 ko로 요청합니다.

현재 AI는 이미 선택된 Course를 설명합니다.
Course 후보 선정이나 Route 순서를 AI가 결정하지 않습니다.

향후:

```text
현재 DB Context
+
검증된 Place Description
+
User Preference
+
Travel Mood
↓
Personalized Docent
```

`place_description`, 사용자 취향, 여행 분위기는 현재 Docent Context에 포함되지 않습니다.
AI Ranking / Personalization / TTS는 구현 예정입니다.

핵심 제한:

```text
DB에 없는 촬영 사실을 임의 생성하지 않도록 입력과 Prompt를 제한한다.
```

---

# 23. 현재 후보 정책과 한계

- Trip은 동일 `place_id`를 한 번만 방문하도록 중복 제거합니다.
- 여러 작품이 같은 Place를 가리키면 현재 Map에 마지막으로 저장된 관계가 선택됩니다. 대표 작품 우선순위 정책은 없습니다.
- 배우별 장소 API는 작품 + 장소 단위 중복 제거이며 서울 필터는 없습니다.
- Trip / Course 추가 후보에는 서울 필터가 적용됩니다.
- 활성 후보 필터는 `is_active !== false`입니다. DB null 처리와 Frontend boolean 검증의 정합성은 별도 점검 대상입니다.
- 좌표 검사는 유한 숫자 여부이며 실제 접근 가능성이나 위경도 범위 검증을 대신하지 않습니다.
- TMAP 조회 후 조건 초과를 표시하는 구조이며, 실제 경로 기준으로 서버가 Course를 자동 재추천하는 것은 아닙니다.
- 443개 파이프라인 후보는 검수용 CSV의 행 수이며 현재 추천 DB 규모가 아닙니다.
