# FAVEWAY Data Fallback Policy

## 1. 목적

FAVEWAY는 데이터가 부족한 경우에도 존재하지 않는 촬영지나 장면 정보를 임의로 생성하지 않습니다.

이 문서는 다음 상황에서 서비스가 어떤 기준으로 동작할지 정의합니다.

- 촬영지가 없는 경우
- 촬영지는 있지만 좌표가 없는 경우
- 촬영지는 있지만 Scene 정보가 없는 경우
- 여행 조건에 맞는 Route를 만들 수 없는 경우
- AI Docent에 필요한 정보가 부족한 경우

핵심 원칙:

```text
데이터 부족
≠
AI로 사실 생성
```

FAVEWAY는 부족한 정보를 임의로 채우기보다
현재 확인 가능한 데이터 범위 안에서 기능을 제공하거나
사용자에게 부족한 상태를 명확하게 안내합니다.

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

API 실패
=
Error
```

사용자에게도 두 상태를 다르게 보여줍니다.

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
사용자에게 조건 변경 안내
```

예:

- 선택한 배우와 연결된 촬영지가 없음
- 선택한 작품에 활성 촬영지가 없음
- 작품/배우 조건 조합 결과가 없음

안내 예시:

```text
현재 선택한 작품과 배우 조건에 맞는 촬영지가 없어요.
배우 선택을 줄이거나 다른 작품을 선택해 보세요.
```

### 3.2 촬영지 후보가 1개인 경우

FAVEWAY는 1개 장소 Course를 허용합니다.

이유:

- 사용자가 선택한 조건을 유지할 수 있음
- 데이터가 적다는 이유로 존재하지 않는 장소를 추가할 필요가 없음
- 현재 Trip 생성 로직과도 일치함

처리:

```text
Candidate Place = 1
↓
1개 장소 Course 생성 가능
```

단:

```text
이동 경로 없음
→ 도보 시간 0분
→ 체류 시간 중심 Course
```

사용자에게 장소가 1곳뿐이라는 사실은 숨기지 않습니다.

안내 예시:

```text
현재 조건에서 확인된 촬영지는 1곳이에요.
해당 장소를 중심으로 코스를 만들었어요.
```

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

---

## 4. 좌표 부족 정책

### 4.1 Place는 있지만 좌표가 없는 경우

조건:

```text
Place 존재
latitude / longitude 없음
```

기능별 처리:

#### Explore

사용 가능:

- 장소명
- 주소
- 작품 정보
- Scene 정보
- 배우 정보
- 검증 정보

제한:

- 지도 Marker 표시 불가

#### Place Detail

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

#### Course

좌표가 없는 장소는 Route 계산이 불가능하므로
Course Candidate에서 제외합니다.

```text
Place 존재
+
좌표 없음
↓
Course Candidate 제외
```

중요:

```text
DB에서 삭제하지 않음
```

장소 자체가 잘못된 데이터가 아니라
Route 계산에 필요한 정보가 부족한 상태이기 때문입니다.

---

## 5. Scene 정보 부족 정책

### 5.1 Place + Scene이 모두 있는 경우

정상 표시:

```text
Content
↓
Scene
↓
Actor
↓
Place
```

표시 가능:

- Scene 설명
- Episode
- 배우
- verified_fact
- source

### 5.2 Place는 있지만 Scene이 없는 경우

장소는 촬영지로 사용할 수 있습니다.

단:

```text
Scene 설명 없음
Episode 없음
Scene Actor 없음
```

UI에서는 Empty 상태로 표시합니다.

예:

```text
이 장소의 구체적인 장면 정보는 아직 등록되지 않았어요.
```

하지 않는 것:

```text
LLM으로 Scene 생성
Episode 추측
배우 등장 여부 추측
```

---

## 6. Actor 기반 데이터 부족 정책

배우 기준 탐색은 반드시 다음 관계를 사용합니다.

```text
Actor
↓
Scene
↓
Place
```

### Actor → Scene 관계가 없는 경우

```text
배우는 작품에 출연
하지만 Scene 연결 없음
```

이라고 해서 해당 작품의 전체 촬영지를 배우 관련 장소로 사용하지 않습니다.

결과:

```text
Actor Scene Candidate = 0
↓
Empty
```

안내 예시:

```text
현재 등록된 데이터에서는 이 배우와 장면으로 연결된 촬영지를 찾지 못했어요.
```

---

## 7. 여행 조건으로 Route를 만들 수 없는 경우

촬영지는 존재하지만
여행 조건 때문에 Route 생성이 불가능할 수 있습니다.

예:

```text
최대 도보 10분
+
후보 장소 간 이동 20분 이상
```

또는:

```text
여행 가능 시간
<
이동 시간 + 최소 체류 시간
```

처리:

```text
API Error 아님
↓
조건 불충족 Empty 상태
```

사용자에게 조건 완화를 안내합니다.

예:

```text
현재 조건에 맞는 코스를 찾지 못했어요.
여행 시간을 늘리거나 최대 도보 시간을 조정해 보세요.
```

---

## 8. Course 생성 시 장소 수 감소

FAVEWAY는 가능한 최대 장소 수부터 Route를 탐색합니다.

예:

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
더 적은 장소 수로 Course를 생성할 수 있습니다.

핵심:

```text
장소 수를 줄이는 것
>
존재하지 않는 장소를 추가하는 것
```

---

## 9. 일반 장소 추천 정책

현재 FAVEWAY에서는
촬영지가 부족하다는 이유로 일반 관광지를 자동으로 Course에 추가하지 않습니다.

현재 정책:

```text
촬영지 부족
↓
자동 일반 장소 추가 X
```

이유:

- FAVEWAY의 핵심은 콘텐츠 촬영지 여행
- 일반 장소와 촬영지를 섞으면 추천 근거가 흐려질 수 있음
- 사용자가 촬영지라고 오해할 가능성이 있음

향후 일반 장소 추천을 추가한다면
반드시 별도 타입으로 구분해야 합니다.

예:

```text
VERIFIED_FILMING_LOCATION

GENERAL_PLACE
```

UI에서도 명확히 구분합니다.

예:

```text
촬영지
주변 추천 장소
```

일반 장소를 촬영지처럼 표시하지 않습니다.

---

## 10. 범위 확장 정책

촬영지가 부족한 경우
자동으로 조건을 변경하지 않습니다.

예:

```text
배우 + 작품 조건
↓
Candidate 부족
```

가능한 UX:

```text
현재 조건 유지

또는

배우 조건 해제
작품 범위 확대
```

사용자의 선택 없이
애플리케이션이 임의로 범위를 확대하지 않습니다.

---

## 11. AI Recommendation 데이터 부족 정책

향후 AI Recommendation에서도
AI는 새로운 장소를 생성하지 않습니다.

```text
Validated Candidate IDs
↓
LLM
↓
Candidate Ranking
```

LLM 결과에 DB에 없는 Place ID가 포함되면:

```text
Invalid Result
```

로 처리합니다.

AI가 반환한 후보는 반드시
기존 Candidate 목록과 다시 검증합니다.

---

## 12. AI Docent 데이터 부족 정책

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

### Scene 정보가 충분한 경우

```text
DB Fact
+
Scene
+
Place
↓
Docent
```

### Scene 정보가 없는 경우

AI에게 없는 장면을 만들어달라고 요청하지 않습니다.

입력:

```text
Place
Content
verified_fact
```

등 현재 존재하는 정보만 사용합니다.

Docent도 해당 범위 안에서 설명합니다.

예:

```text
이 장소는 작품의 촬영지로 확인되어 있습니다.
다만 현재 등록된 데이터에는 구체적인 장면 정보가 없습니다.
```

### verified_fact가 없는 경우

verified_fact를 임의 생성하지 않습니다.

가능한 정보만 이용합니다.

```text
Place
Content
Scene
Episode
Source
```

정보가 너무 적다면
Docent 생성 자체를 제한할 수 있습니다.

---

## 13. AI Docent 생성 불가 기준

다음과 같이 설명에 필요한 최소 근거가 부족한 경우
Docent 생성을 하지 않는 방향을 우선 검토합니다.

예:

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

안내 예시:

```text
현재 확인된 정보가 충분하지 않아 AI 도슨트 설명을 제공하지 않아요.
```

---

## 14. Source 부족 정책

촬영지 데이터는 존재하지만
출처가 불완전할 수 있습니다.

이 경우:

```text
source_url 없음
```

이면 출처 링크를 표시하지 않습니다.

```text
verification_status
```

를 이용해 검증 상태를 표시합니다.

출처가 없다는 이유로
가짜 출처나 참고 링크를 생성하지 않습니다.

---

## 15. 상태 분류

데이터 부족 관련 상태는 다음과 같이 구분합니다.

### Empty

```text
촬영지 없음
Actor → Scene → Place 결과 없음
조건에 맞는 Route 없음
```

### Partial

```text
Scene 없음
Episode 없음
source 없음
좌표 없음
```

일부 정보는 사용할 수 있습니다.

### Error

```text
Supabase 요청 실패
Trip API 실패
네트워크 오류
```

데이터 자체가 없는 상태와 구분합니다.

---

## 16. 현재 정책 요약

| 상황 | 처리 |
| --- | --- |
| 촬영지 0개 | Course 생성 안 함 + Empty |
| 촬영지 1개 | 1개 장소 Course 허용 |
| 촬영지 2개 이상 | 정상 Route 생성 |
| Place 좌표 없음 | Explore/Detail 가능, Course 제외 |
| Scene 없음 | Place 사용 가능, Scene Empty |
| Episode 없음 | 표시하지 않음 |
| Actor Scene 관계 없음 | 배우 관련 장소로 추측하지 않음 |
| 조건에 맞는 Route 없음 | 조건 변경 안내 |
| TMAP 실패 | Haversine fallback |
| 일반 장소 | 자동 추가하지 않음 |
| AI Recommendation | DB Candidate 안에서만 선택 |
| AI Docent | 존재하는 DB 정보만 설명 |
| AI 입력 근거 부족 | Docent 제한 또는 정보 부족 안내 |
| source 없음 | 가짜 출처 생성하지 않음 |

---

## 17. 핵심 원칙

### 1. 없는 장소를 만들지 않는다

```text
Place 없음
→ 생성하지 않음
```

### 2. 없는 장면을 만들지 않는다

```text
Scene 없음
→ Empty
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