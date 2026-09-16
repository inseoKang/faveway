# FAVEWAY Recommendation

## 1. 목표

FAVEWAY의 추천 로직은 DB에 없는 촬영지를 생성하는 것이 아니라, **검증된 촬영지 Candidate 안에서 실제 여행 가능한 Route를 구성하는 것**을 목표로 합니다.

---

## 2. 입력

현재 주요 입력:

```text
contentIds
actorIds
durationMinutes
maxWalkingMinutes
```

---

## 3. Candidate 생성

### 배우 미선택

```text
Contents
↓
place_relations
↓
Places
```

작품 전체 촬영지를 사용합니다.

### 배우 선택

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

복수 배우는 OR 조건입니다.

---

## 4. 필터링

Candidate 생성 후:

```text
Active Place Filter
↓
Duplicate Filter
↓
Coordinate Filter
```

를 적용합니다.

배우 기준 장소 조회에서는 동일한:

```text
content_id + place_id
```

관계를 한 번만 사용합니다.

---

## 5. 거리 계산

현재 위도·경도를 이용한 Haversine Formula 기반 직선거리를 사용합니다.

```text
Place A
↓
Haversine
↓
Place B
```

실제 도보 거리와 차이가 있으므로 보정값을 이용해 예상 도보 시간을 계산합니다.

---

## 6. Route Constraint

현재 주요 제약:

### 전체 여행 시간

```text
3시간
4시간
5시간
```

### 한 구간 최대 도보 시간

```text
10분
20분
30분
상관없음
```

`maxWalkingMinutes = null`은 도보 제한이 없다는 의미입니다.

---

## 7. Route 선택

현재 기준:

```text
1. 조건을 만족하는 Route인지 확인
2. 가능한 최대 장소 수 확보
3. 총 이동거리 최소화
```

현재 최대 장소 수:

```text
3시간 → 최대 2곳
4시간 → 최대 3곳
5시간 → 최대 4곳
```

Candidate가 더 적으면 Candidate 수를 초과하지 않습니다.

---

## 8. 체류 시간

```text
전체 여행 시간
-
예상 총 이동 시간
=
전체 체류 가능 시간
```

현재는 남은 체류 가능 시간을 장소 수로 균등 분배합니다.

---

## 9. 현재 한계

- 실제 도로가 아닌 직선거리 기반
- 교통 신호 / 경사 / 출입구 미반영
- 장소별 권장 체류시간 미반영
- Candidate가 많아지면 Route 조합 비용 증가

---

## 10. 향후 AI 적용

AI는 Candidate 생성자가 아니라 Ranking / Personalization Layer로 사용합니다.

```text
Validated Candidate
↓
Valid Route Candidates
↓
LLM Ranking
↓
Structured Output
↓
Candidate ID Validation
↓
Final Course
```

AI가 DB에 없는 Place ID를 반환하면 유효하지 않은 결과로 처리하도록 설계할 예정입니다.

---

## 11. AI Docent

향후 장소에 도착했을 때:

```text
Verified DB Data
+
User Preference
+
Content
+
Scene
+
Actor
+
Place
↓
LLM
↓
Personalized Docent
```

구조로 설명을 생성할 예정입니다.

핵심 제한:

```text
DB에 없는 촬영 사실을 임의 생성하지 않는다.
```
