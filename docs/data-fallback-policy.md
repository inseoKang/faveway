# FAVEWAY Data Fallback Policy

## 1. 목적

FAVEWAY는 데이터가 부족한 경우에도
존재하지 않는 촬영지나 장면 정보를 임의로 생성하지 않습니다.

핵심 원칙:

```text
데이터 부족
≠
AI로 사실 생성
```

---

## 2. 기본 원칙

### 2.1 촬영지는 DB에 존재하는 실제 장소만 사용한다

```text
AI 생성 Place
→ 사용하지 않음

DB Place
→ 사용 가능
```

### 2.2 Scene 정보가 없으면 없는 상태를 유지한다

```text
Place 존재
Scene 없음
```

하지 않는 것:

- 장면 설명 임의 생성
- Episode 추측
- 배우 등장 장면 추측
- 검증되지 않은 장면을 사실처럼 표시

### 2.3 데이터 부족은 Error와 구분한다

```text
정상 조회 + 결과 없음
→ Empty

API / Network 실패
→ Error
```

### 2.4 자동 범위 확장보다 사용자 선택을 우선한다

```text
Candidate 부족
↓
자동 조건 변경 X
↓
사용자가 다음 행동 선택
```

---

## 3. 촬영지 후보 수 기준

### 3.1 촬영지 후보가 0개

```text
Candidate Place = 0
↓
Course 생성하지 않음
↓
Empty
```

### 3.2 촬영지 후보가 1개

```text
Candidate Place = 1
↓
1개 장소 Course
```

이동 구간이 없으므로:

```text
도보 시간 0분
이동 거리 0km
체류 시간 중심 Course
```

로 표시합니다.

### 3.3 촬영지 후보가 2개 이상

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

## 4. 1개 장소 Course 이유 분류

```text
NORMAL
ONLY_ONE_CANDIDATE
WALKING_LIMIT
DURATION_LIMIT
MULTIPLE_CONSTRAINTS
```

Frontend는 이 값을 이용해
왜 현재 Course가 1곳인지 설명합니다.

---

## 5. 좌표 부족 정책

### Explore

좌표가 없어도 장소 정보는 사용할 수 있습니다.

### Place Detail

주소 기반 Kakao 검색 fallback을 사용할 수 있습니다.

### Course

```text
Place 존재
+
좌표 없음
↓
Course Candidate 제외
```

---

## 6. Scene 정보 부족 정책

```text
Place 존재
Scene 없음
↓
Place 사용 가능
Scene 정보 없음 표시
```

하지 않는 것:

```text
LLM으로 Scene 생성
Episode 추측
배우 등장 여부 추측
```

---

## 7. Actor 기반 데이터 부족 정책

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

관계를 사용합니다.

```text
Actor Scene Candidate = 0
↓
Empty
```

---

## 8. 사용자 선택 기반 범위 확장

사용자에게:

```text
[배우 조건 없이 작품 전체로 넓혀보기]

[작품 / 배우 다시 선택하기]
```

를 제공합니다.

사용자가 선택한 경우에만:

```text
actorIds
→ []
```

로 변경합니다.

---

## 9. 여행 조건으로 여러 장소를 묶을 수 없는 경우

```text
3곳 실패
↓
2곳 시도
↓
1곳 시도
```

유효한 1개 장소 후보가 있다면
1개 장소 Course를 정상 생성할 수 있습니다.

---

## 10. 일반 장소 추천 정책

```text
촬영지 부족
↓
자동 일반 장소 추가 X
```

---

## 11. AI Recommendation 데이터 부족 정책

```text
Validated Candidate IDs
↓
LLM
↓
Candidate Ranking
```

DB에 없는 Place ID는 유효하지 않은 결과로 처리합니다.

현재:

```text
정책 정의 완료
AI Recommendation 구현 예정
```

---

## 12. AI Docent 기본 정책

AI Docent는 서버가 DB에서 다시 조회한 검증 Context를 사용합니다.

```text
Client
↓
contentId / placeId / order
↓
Server
↓
DB Context
↓
AI Docent
```

---

## 13. AI Docent 입력 데이터

현재 서버 Context:

```text
Content
Place
Scene
Episode
Scene Actor
Verified Evidence
```

향후 추가 예정:

```text
Place Description
User Preference
Travel Mood
```

---

## 14. verified_fact 검증 정책

현재 허용 상태:

```text
verified
approved
confirmed
complete
completed
```

검증되지 않은 `verified_fact`는
AI evidence로 사용하지 않습니다.

---

## 15. AI Docent 생성 가능 기준

```text
Scene description
또는
Verified verified_fact
```

둘 다 없다면:

```text
AI 생성 X
↓
DOCENT_CONTEXT_INSUFFICIENT
↓
정보 부족 안내
```

---

## 16. Scene 없는 AI Docent

Scene이 없어도
검증된 `verified_fact`가 있다면
그 사실 범위 안에서 생성 가능합니다.

```text
Scene 없음
+
verified_fact 없음
↓
생성하지 않음
```

---

## 17. Episode 없는 경우

```text
Episode 없음
→ 입력에서 null
→ 설명에서 생략
```

---

## 18. Actor 정보 부족

```text
Scene Actor 없음
→ 배우 이름 생성 X
```

---

## 19. Source 부족 정책

`source_url`이 없다는 이유로
가짜 출처를 생성하지 않습니다.

---

## 20. AI Docent 실제 호출 비활성화

```env
ENABLE_OPENAI_DOCENT=false
```

이 상태에서는:

```text
POST /api/docents/place
POST /api/docents/course
↓
DOCENT_NOT_ENABLED
```

로 종료합니다.

---

## 21. AI Docent Mock UX

현재 Course 화면에서는 Mock 데이터를 사용합니다.

지원 상태:

```text
Loading
Success
Empty
Error
Retry
```

---

## 22. Course Docent와 Place Docent

### Course Docent

```text
이 코스 이야기 듣기
```

### Place Docent

```text
현장에서 도슨트 듣기
```

---

## 23. AI Docent Prompt 금지 사항

```text
DB에 없는 촬영지
DB에 없는 Scene
Episode 추측
Actor 추측
실제 대사
촬영 상황 추측
시설
내부 공간
촬영 구도
출입 가능 여부
운영 시간
촬영 허가 정보
```

실제 배우처럼 1인칭으로 사칭하지 않습니다.

---

## 24. AI Docent 오류 분류

### `DOCENT_CONTEXT_NOT_FOUND`

```text
→ Empty 또는 잘못된 요청 상태
```

### `DOCENT_CONTEXT_INSUFFICIENT`

```text
→ Empty
```

### `DOCENT_GENERATION_FAILED`

```text
→ Error + Retry
```

### `DOCENT_NOT_ENABLED`

실제 OpenAI 호출이 비활성화된 상태입니다.

---

## 25. TTS 정책

현재 TTS는 구현하지 않았습니다.

```text
DB Context 정확성
↓
AI Text 품질
↓
Docent UX
↓
TTS
```

순서로 진행합니다.

---

## 26. TMAP 실패 정책

```text
TMAP 성공 구간
→ 실제 보행 경로

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

## 27. 상태 분류

### Empty

```text
촬영지 없음
Actor → Scene → Place 결과 없음
좌표가 있는 Course 후보 없음
조건에 맞는 Route 없음
AI Docent 최소 근거 없음
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
Trip API 실패
AI 생성 실패
Network Error
```

### 1개 장소 Course

```text
정상 결과
```

---

## 28. 현재 정책 및 구현 상태 요약

| 상황 | 처리 | 구현 |
| --- | --- | --- |
| 촬영지 0개 | Course 생성 안 함 + Empty | 완료 |
| 촬영지 1개 | 1개 장소 Course 허용 | 완료 |
| 1개 장소 이유 안내 | `routeSelectionReason` | 완료 |
| 촬영지 2개 이상 | Route 탐색 | 완료 |
| 좌표 없음 | Explore/Detail 가능, Course 제외 | 완료 |
| Scene 없음 | 추측하지 않음 | 완료 |
| Episode 없음 | 표시하지 않음 | 완료 |
| Actor Scene 관계 없음 | 배우 장소로 추측하지 않음 | 완료 |
| 배우 후보 부족 | 사용자 선택 시 배우 조건 제거 | 완료 |
| 자동 범위 확장 | 수행하지 않음 | 완료 |
| TMAP 실패 | Haversine fallback | 완료 |
| 일반 장소 자동 추가 | 하지 않음 | 완료 |
| AI Recommendation | DB Candidate 안에서만 선택 | 구현 예정 |
| AI Docent 서버 기반 | DB Context → LLM 구조 | 완료 |
| Place / Course Docent API | Route Handler | 완료 |
| AI Prompt 정책 | 사실 생성 및 배우 사칭 제한 | 완료 |
| AI 입력 근거 부족 | Docent 생성 제한 | 완료 |
| AI Docent Mock UX | Loading / Success / Empty / Error / Retry | 완료 |
| 실제 OpenAI UI 연결 | Mock → 실제 API 교체 | 예정 |
| TTS | 텍스트 검증 후 연결 | 예정 |

---

## 29. 핵심 원칙

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

### 4. AI는 검증된 정보를 설명한다

```text
DB Fact
↓
AI Explanation
```