# FAVEWAY Data Fallback Policy

## 1. 목적

FAVEWAY는 데이터가 부족한 경우에도
존재하지 않는 촬영지나 장면 정보를 임의로 생성하지 않습니다.

이 문서는 다음 상황에서 서비스가 어떤 기준으로 동작할지 정의합니다.

- 촬영지가 없는 경우
- 촬영지가 1곳뿐인 경우
- 촬영지는 있지만 좌표가 없는 경우
- 촬영지는 있지만 Scene 정보가 없는 경우
- 배우와 Scene 관계가 부족한 경우
- 여행 조건 때문에 여러 장소를 묶을 수 없는 경우
- AI Docent에 필요한 정보가 부족한 경우

핵심 원칙:

```text
데이터 부족
≠
AI로 사실 생성
```

FAVEWAY는 부족한 정보를 임의로 채우기보다
현재 확인 가능한 데이터 범위 안에서 기능을 제공하고,
현재 결과가 나온 이유와 사용자가 선택할 수 있는 다음 행동을 안내합니다.

---

## 2. 기본 원칙

### 2.1 촬영지는 DB에 존재하는 실제 장소만 사용한다

Course와 촬영지 탐색에 사용하는 Place는
반드시 FAVEWAY DB에 존재해야 합니다.

```text
AI 생성 Place
→ 사용하지 않음

DB Place
→ 사용 가능
```

### 2.2 Scene 정보가 없으면 없는 상태를 유지한다

촬영 장소라는 사실은 확인됐지만
구체적인 장면 설명이나 Episode가 확인되지 않을 수 있습니다.

이 경우:

```text
Place 존재
Scene 없음
```

상태를 그대로 유지합니다.

하지 않는 것:

- 장면 설명 임의 생성
- Episode 추측
- 배우 등장 장면 추측
- 검증되지 않은 장면을 사실처럼 표시

### 2.3 데이터 부족은 Error와 구분한다

데이터가 없는 것은 API 장애와 다릅니다.

```text
정상 조회
+
결과 없음
=
Empty

API / Network 실패
=
Error
```

사용자에게도 두 상태를 다르게 보여줍니다.

### 2.4 자동 범위 확장보다 사용자 선택을 우선한다

사용자가 선택한 배우, 작품, 여행 조건을
애플리케이션이 임의로 변경하지 않습니다.

```text
Candidate 부족
↓
자동 조건 변경 X
↓
현재 상태 설명
↓
사용자가 다음 행동 선택
```

---

## 3. 촬영지 후보 수 기준

### 3.1 촬영지 후보가 0개인 경우

조건:

```text
Candidate Place = 0
```

처리:

```text
Course 생성하지 않음
↓
Empty 상태 표시
↓
사용자에게 다음 행동 안내
```

예:

- 선택한 배우와 연결된 촬영지가 없음
- 선택한 작품에 활성 촬영지가 없음
- 작품 / 배우 조건 조합 결과가 없음

배우 조건이 있는 경우에는
사용자가 직접 작품 전체 범위로 확장할 수 있는 액션을 제공합니다.

### 3.2 촬영지 후보가 1개인 경우

FAVEWAY는 1개 장소 Course를 허용합니다.

이유:

- 사용자가 선택한 조건을 유지할 수 있음
- 데이터가 적다는 이유로 존재하지 않는 장소를 추가할 필요가 없음
- 1개 장소도 실제 방문 가능한 유효한 결과임

처리:

```text
Candidate Place = 1
↓
1개 장소 Course 생성
↓
이유 안내
↓
다음 행동 제공
```

1개 장소 Course에서는 이동 구간이 없으므로:

```text
도보 시간 0분
이동 거리 0km
체류 시간 중심 Course
```

로 표시합니다.

### 3.3 촬영지 후보가 2개 이상인 경우

정상 Course 생성 대상으로 사용합니다.

```text
Candidate ≥ 2
↓
Route 조합
↓
여행 조건 검증
↓
Course 생성
```

조건을 만족하는 다중 장소 Route가 없다면
장소 수를 줄여 다시 탐색합니다.

---

## 4. 1개 장소 Course 이유 분류

최종 Course가 1곳인 이유는 서로 다를 수 있습니다.

`POST /api/trips`는
`routeSelectionReason`을 반환해 이유를 구분합니다.

### `NORMAL`

```text
2곳 이상의 유효 Course 생성
```

### `ONLY_ONE_CANDIDATE`

```text
현재 작품 / 배우 조건
+
좌표 검증
↓
Course 후보 자체가 1곳
```

### `WALKING_LIMIT`

```text
후보는 여러 곳
+
최대 도보 시간 제한
↓
2곳 이상의 유효 Route 없음
```

### `DURATION_LIMIT`

```text
후보는 여러 곳
+
여행 가능 시간 제한
↓
2곳 이상의 유효 Route 없음
```

### `MULTIPLE_CONSTRAINTS`

```text
후보는 여러 곳
+
여행 시간
+
최대 도보 시간
↓
두 조건을 함께 적용하면
2곳 이상의 유효 Route 없음
```

Frontend는 이 값을 이용해
1개 장소 Course가 나온 이유를 설명합니다.

---

## 5. 좌표 부족 정책

### Explore

좌표가 없어도 다음 정보는 사용할 수 있습니다.

- 장소명
- 주소
- 작품 정보
- Scene 정보
- 배우 정보
- 검증 정보

다만 지도 Marker는 표시할 수 없습니다.

### Place Detail

사용 가능:

- 장소 상세 정보
- 검증 정보
- 출처
- 주소

가능한 경우:

```text
좌표 없음
↓
주소 기반 Kakao 검색 fallback
```

### Course

좌표가 없는 장소는 Route 계산이 불가능하므로
Course Candidate에서 제외합니다.

```text
Place 존재
+
좌표 없음
↓
Course Candidate 제외
```

장소 자체는 DB에서 삭제하지 않습니다.

---

## 6. Scene 정보 부족 정책

Place는 촬영지로 확인됐지만
Scene 정보가 없는 경우에도 Place 자체는 사용할 수 있습니다.

```text
Place 존재
Scene 없음
↓
Place 사용 가능
Scene 정보 없음으로 표시
```

하지 않는 것:

```text
LLM으로 Scene 생성
Episode 추측
배우 등장 여부 추측
```

---

## 7. Actor 기반 데이터 부족 정책

배우 기준 탐색과 Course 후보 필터는
반드시 다음 관계를 사용합니다.

```text
Actor
↓
scene_actors
↓
Scene
↓
scene_places
↓
Place
```

배우가 작품에 출연했다는 사실만으로
해당 작품의 전체 촬영지를 배우 관련 장소로 사용하지 않습니다.

```text
Actor Scene Candidate = 0
↓
Empty
```

---

## 8. 사용자 선택 기반 범위 확장

배우 조건으로 촬영지 후보가 부족한 경우
자동으로 작품 전체 촬영지까지 확대하지 않습니다.

사용자에게 다음 선택을 제공합니다.

```text
[배우 조건 없이 작품 전체로 넓혀보기]

[작품 / 배우 다시 선택하기]
```

사용자가 작품 전체로 넓히기를 선택한 경우에만
`POST /api/trips`를 다시 호출합니다.

변경 전:

```json
{
  "contentIds": [1],
  "actorIds": [3],
  "durationMinutes": 180,
  "maxWalkingMinutes": 10
}
```

변경 후:

```json
{
  "contentIds": [1],
  "actorIds": [],
  "durationMinutes": 180,
  "maxWalkingMinutes": 10
}
```

유지:

```text
contentIds
durationMinutes
maxWalkingMinutes
```

변경:

```text
actorIds
→ []
```

즉 사용자에게 알리지 않은 채
작품, 여행 시간, 도보 조건을 변경하지 않습니다.

---

## 9. 여행 조건으로 여러 장소를 묶을 수 없는 경우

촬영지는 여러 곳 존재하지만
여행 조건 때문에 2곳 이상의 Route를 만들 수 없을 수 있습니다.

예:

```text
최대 도보 10분
+
후보 장소 간 예상 이동 20분 이상
```

또는:

```text
여행 가능 시간
<
이동 시간 + 최소 체류 시간
```

현재 Trip 로직은 가능한 최대 장소 수부터
장소 수를 줄여가며 Route를 찾습니다.

```text
3곳 실패
↓
2곳 시도
↓
1곳 시도
```

여러 장소 Route가 불가능하더라도
유효한 1개 장소 후보가 있으면
1개 장소 Course로 정상 생성될 수 있습니다.

이 경우 `routeSelectionReason`을 이용해
왜 1곳이 되었는지 안내합니다.

조건 자체로 유효한 Course를 만들 수 없는 경우에는:

```text
NO_AVAILABLE_ROUTE
↓
Empty
↓
조건 재설정 안내
```

로 처리합니다.

---

## 10. Course 생성 시 장소 수 감소

FAVEWAY는 가능한 최대 장소 수부터 Route를 탐색합니다.

```text
4시간
→ 최대 3곳
```

3곳 Route가 조건을 만족하지 않으면:

```text
3곳 실패
↓
2곳 시도
↓
1곳 시도
```

조건을 만족하는 Route가 존재하면
더 적은 장소 수로 Course를 생성합니다.

핵심:

```text
장소 수를 줄이는 것
>
존재하지 않는 장소를 추가하는 것
```

---

## 11. 일반 장소 추천 정책

현재 FAVEWAY에서는
촬영지가 부족하다는 이유로 일반 관광지를 자동으로 Course에 추가하지 않습니다.

```text
촬영지 부족
↓
자동 일반 장소 추가 X
```

향후 일반 장소 추천을 추가한다면
반드시 촬영지와 별도 타입으로 구분합니다.

```text
VERIFIED_FILMING_LOCATION
GENERAL_PLACE
```

일반 장소를 촬영지처럼 표시하지 않습니다.

---

## 12. AI Recommendation 데이터 부족 정책

향후 AI Recommendation에서도
AI는 새로운 장소를 생성하지 않습니다.

```text
Validated Candidate IDs
↓
LLM
↓
Candidate Ranking
```

LLM 결과에 DB에 없는 Place ID가 포함되면
Invalid Result로 처리합니다.

AI가 반환한 후보는 반드시
기존 Candidate 목록과 다시 검증합니다.

현재 구현 상태:

```text
정책 정의 완료
Candidate 검증 구현 예정
```

---

## 13. AI Docent 데이터 부족 정책

AI Docent는
DB에 존재하는 검증 정보를 입력으로 사용합니다.

예상 입력:

```text
Content
Actor
Scene
Episode
Place
verified_fact
source
User Preference
```

Scene 정보가 없는 경우
AI에게 없는 장면을 만들어달라고 요청하지 않습니다.

현재 존재하는 정보만 입력으로 사용합니다.

정보가 너무 적다면
Docent 생성 자체를 제한할 수 있습니다.

현재 구현 상태:

```text
정책 정의 완료
AI Docent 구현 예정
```

---

## 14. AI Docent 생성 불가 기준

설명에 필요한 최소 근거가 부족한 경우
Docent를 생성하지 않는 방향을 우선합니다.

```text
Place만 존재
+
Content 관계 불명확
+
Scene 없음
+
verified_fact 없음
```

처리:

```text
AI 생성 X
↓
정보 부족 안내
```

---

## 15. Source 부족 정책

`source_url`이 없다면 출처 링크를 표시하지 않습니다.

`verification_status`를 이용해
현재 검증 상태를 표시합니다.

출처가 없다는 이유로
가짜 출처나 참고 링크를 생성하지 않습니다.

---

## 16. TMAP 실패 정책

TMAP 실패는 Course 전체 실패로 처리하지 않습니다.

```text
TMAP 성공 구간
→ 실제 보행 경로 사용

TMAP 실패 구간
→ Haversine fallback
```

상태:

```text
real
partial
fallback
```

외부 Route API 문제 때문에
이미 생성된 Course와 편집 기능을 사용할 수 없게 만들지 않습니다.

---

## 17. 상태 분류

### Empty

```text
촬영지 없음
Actor → Scene → Place 결과 없음
좌표가 있는 Course 후보 없음
조건에 맞는 Route 없음
```

### Partial

```text
Scene 없음
Episode 없음
source 없음
좌표 없음
TMAP 일부 실패
```

### Error

```text
Supabase 요청 실패
예상하지 못한 Trip API 실패
네트워크 오류
```

### 1개 장소 Course

```text
정상 결과
```

Error나 Empty가 아닙니다.

이유를 설명하고
가능한 다음 행동을 제공합니다.

---

## 18. 현재 정책 및 구현 상태 요약

| 상황 | 처리 | 구현 |
| --- | --- | --- |
| 촬영지 0개 | Course 생성 안 함 + Empty | 완료 |
| 촬영지 1개 | 1개 장소 Course 허용 | 완료 |
| 1개 장소 이유 안내 | `routeSelectionReason` 기반 안내 | 완료 |
| 촬영지 2개 이상 | 정상 Route 탐색 | 완료 |
| Place 좌표 없음 | Explore/Detail 가능, Course 제외 | 완료 |
| Scene 없음 | Place 사용 가능, Scene Empty | 완료 |
| Episode 없음 | 표시하지 않음 | 완료 |
| Actor Scene 관계 없음 | 배우 관련 장소로 추측하지 않음 | 완료 |
| 배우 후보 부족 | 사용자 선택 시 배우 조건 제거 | 완료 |
| 자동 범위 확장 | 수행하지 않음 | 완료 |
| 조건에 맞는 Route 없음 | 조건 변경 안내 | 완료 |
| TMAP 실패 | Haversine fallback | 완료 |
| 일반 장소 | 자동 추가하지 않음 | 완료 |
| AI Recommendation | DB Candidate 안에서만 선택 | 구현 예정 |
| AI Docent | 존재하는 DB 정보만 설명 | 구현 예정 |
| AI 입력 근거 부족 | Docent 제한 또는 정보 부족 안내 | 구현 예정 |
| source 없음 | 가짜 출처 생성하지 않음 | 정책 완료 |

---

## 19. 핵심 원칙

### 1. 없는 장소를 만들지 않는다

```text
Place 없음
→ 생성하지 않음
```

### 2. 없는 장면을 만들지 않는다

```text
Scene 없음
→ 추측하지 않음
```

### 3. 데이터 부족과 시스템 오류를 구분한다

```text
No Data
≠
Error
```

### 4. 사용할 수 있는 정보는 계속 제공한다

```text
Scene 없음
≠
Place 사용 불가
```

### 5. 외부 API 실패가 핵심 데이터 손실로 이어지지 않게 한다

```text
TMAP 실패
→ Haversine
```

### 6. 자동 범위 확장보다 사용자 선택을 우선한다

```text
Candidate 부족
→ 사용자에게 선택권 제공
```

### 7. AI는 검증된 정보를 설명한다

```text
DB Fact
↓
AI Explanation
```

AI가 FAVEWAY의 사실 데이터 원천이 되지 않도록 합니다.