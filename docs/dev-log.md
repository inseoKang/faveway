# FAVEWAY Dev Log

FAVEWAY 개발 과정에서 발생한 문제, 설계 판단, 구현 변경,
예외 처리 기준을 기록합니다.

완성된 기능을 나열하기보다

**왜 이런 구조를 선택했고 어떤 문제를 어떻게 해결했는지**

남기는 것을 목표로 합니다.

---

# 2026-09-14 | 촬영지 데이터 구조 및 초기 API 연결

## 문제

AI가 촬영지를 임의 생성하는 구조에서는
촬영 장소 정보의 신뢰성을 보장하기 어렵다.

또한 작품과 장소만 연결하면
특정 배우가 실제 어떤 장면과 장소에 연결되는지 설명하기 어렵다.

## 판단

촬영지는 AI가 생성하지 않고
DB에 저장된 검증된 장소만 사용하기로 했다.

핵심 관계:

```text
Actor
→ Scene
→ Place
```

## 구현

도깨비 데이터를 기준으로:

- Content
- Actor
- Scene
- Place
- Scene ↔ Place
- Scene ↔ Actor
- Content ↔ Place

관계를 구성했다.

초기 API:

```text
Supabase
↓
GET /api/contents
↓
콘텐츠 선택
↓
GET /api/contents/[contentId]/places
↓
촬영지 표시
```

## 이슈

`place_relations` 조회 시
permission denied 오류가 발생했다.

## 해결

Supabase 권한 설정을 수정했다.

## 포트폴리오 포인트

추천 기능을 구현하기 전에
서비스가 어떤 데이터를 신뢰할 것인지
데이터 구조에서 먼저 정의한 경험으로 설명할 수 있다.

---

# 2026-09-15 | Planning Flow 및 Trip API 초안

## 문제

콘텐츠 선택 직후 바로 Course를 생성하면
여행 가능 시간이나 이동 조건을 반영하기 어렵다.

## 판단

별도의 Planning 단계를 두었다.

```text
콘텐츠 선택
↓
Planning
↓
여행 조건
↓
Trip 생성
↓
Course
```

## 구현

Trip 생성 조건:

- 활성 장소
- 좌표 존재
- 중복 제거
- 여행 가능 시간
- 최대 도보 시간

초기 거리 계산은 Haversine을 사용했다.

## 이유

실제 Route API가 없어도
Course 구조와 UI 개발을 먼저 진행하기 위해서였다.

## 포트폴리오 포인트

외부 API 구현을 기다리지 않고
최종 데이터 계약과 Frontend 흐름을 먼저 정의했다.

---

# 2026-09-16 | 작품 / 배우 기준 탐색 확장

## 문제

작품만 기준으로 탐색하면
사용자가 좋아하는 배우 중심으로 장소를 찾기 어렵다.

## 판단

탐색 진입점을 분리했다.

```text
작품 기준
배우 기준
```

## 구현

- 작품 검색
- 배우 검색
- 추천 배우
- 작품 → 배우
- 배우 → 작품
- 복수 작품
- 복수 배우
- 작품 미선택 시 배우 전체 작품
- 작품 + 배우 촬영지
- 배우 + 작품 촬영지

## 중복 처리

```text
content_id + place_id
```

기준으로 중복을 제거했다.

## 포트폴리오 포인트

탐색 기준과 추천 근거가
실제 데이터 관계와 연결되도록 정보 구조를 설계했다.

---

# 2026-09-16 | Navigation 구조 정리

## 문제

코스를 만들고 싶은 사용자와
촬영지만 둘러보고 싶은 사용자의 목적이 섞였다.

## 판단

HOME 진입 흐름을 분리했다.

```text
HOME
├─ 코스 만들기
└─ 촬영지 둘러보기
```

## 구현

- Home 진입 분리
- 공통 BackButton

## 포트폴리오 포인트

사용 목적을 기준으로
전체 Navigation 구조를 재설계했다.

---

# 2026-09-16 | Course Map 1차 구현

## 문제

텍스트 목록만으로는
장소 위치 관계와 이동 순서를 이해하기 어렵다.

## 판단

Course 상태와 Kakao Map을 연결했다.

## 구현

- Course Marker
- 방문 순서
- 장소 연결선
- 목록 / 지도 동기화

초기 이동값은 Haversine을 사용했다.

## 포트폴리오 포인트

Course 상태 하나를 기준으로
목록과 지도 UI를 동기화했다.

---

# 2026-09-16 | Course 편집 기능

## 문제

자동 생성 Course가
사용자의 최종 선택과 항상 일치하지 않는다.

## 판단

Course를 고정 결과가 아니라
편집 가능한 상태로 구성했다.

## 구현

- 장소 삭제
- 순서 변경
- 거리 재계산
- 도보 시간 재계산
- 체류 시간 재계산
- Summary 갱신

상태 흐름:

```text
Course Stops
↓
Route
↓
Distance
↓
Walking Time
↓
Summary
↓
Map
```

## 포트폴리오 포인트

사용자 액션 하나가
여러 파생 상태를 연쇄적으로 변경하는 구조를 관리했다.

---

# 2026-09-17 | Course 상태 저장

## 문제

페이지 새로고침 시
사용자가 편집한 Course가 초기화됐다.

## 판단

서버 저장 전 단계에서는
localStorage를 사용하기로 했다.

## 구현

- 장소 추가 저장
- 장소 삭제 저장
- 순서 저장
- 새로고침 복원
- 초기화

## 저장 책임 분리

저장:

```text
사용자가 변경한 Course Stops
```

재조회:

```text
TMAP Route
```

## 포트폴리오 포인트

사용자 선택 상태와
재계산 가능한 외부 데이터를 구분했다.

---

# 2026-09-17 | TMAP 보행 경로 API 연동

## 문제

Haversine은 직선거리이므로
실제 도보 경로와 차이가 있다.

## 판단

```text
Kakao Map
=
지도 UI

TMAP
=
실제 Route
```

로 역할을 분리했다.

## 구현

```text
Client
↓
POST /api/routes/walking
↓
Next.js Route Handler
↓
TMAP
↓
distance / duration / path
↓
Course Summary
↓
Kakao Polyline
```

API Key는 Route Handler 내부에서 사용했다.

## Fallback

```text
TMAP 실패
↓
Haversine
```

Course 전체 기능은 유지한다.

## 포트폴리오 포인트

외부 API 연결뿐 아니라
API Key 보호와 fallback까지 설계했다.

---

# 2026-09-17 | TMAP 요청 구조 개선

## 문제

Client에서 구간별 요청을 보내면
요청 로직이 화면 코드에 분산된다.

## 변경 전

```text
Client
→ A-B
→ B-C
→ C-D
```

## 변경 후

```text
Client
→ Course Stops 1회

Server
→ A-B
→ B-C
→ C-D
```

## 결과

Frontend의 외부 Route 처리 책임을 줄이고
Course 단위 인터페이스로 단순화했다.

## 포트폴리오 포인트

Client / Server 사이의 책임과 인터페이스를
기능 단위로 재설계한 사례다.

---

# 2026-09-17 | 공통 UI 구조 정리

## 문제

페이지별 스타일이 개별적으로 증가하면서
서비스 전체의 시각적 일관성이 떨어졌다.

## 판단

공통 UI 기준을 만들었다.

## 구현

- globals.css
- BackButton
- PageHeader
- 공통 색상
- 버튼
- 카드
- 여백
- 모바일 레이아웃
- Map UI

## 이슈

모바일에서 Course chip이
한글 단위로 줄바꿈되거나 잘렸다.

## 해결

텍스트 줄바꿈과 버튼 배치를 조정했다.

## 포트폴리오 포인트

기능 구현 이후
공통 UI 패턴을 추출해 유지보수성을 개선했다.

---

# 2026-09-18 | Explore / Map 상태 처리 1차

## 문제

Explore 화면은 다음 데이터와 외부 기능을 함께 사용한다.

```text
Supabase
Actor Search
Filming Location
Kakao Map
```

이 중 하나가 실패했을 때
페이지 전체 실패처럼 처리하면
사용자가 정상적으로 사용할 수 있는 기능까지 막히게 된다.

특히:

```text
지도 실패
≠
촬영지 목록 실패
```

이다.

## 판단

상태를 다음 기준으로 분리하기로 했다.

```text
Loading
Empty
Error
Retry
Partial Failure
```

공통 표현을 위해
`StateFeedback`을 만들었다.

## 구현

`StateFeedback` 지원:

```text
neutral
error
warning
title
description
action
```

Explore:

- 기본 데이터 Error
- 배우 검색 Error
- 검색 결과 Empty
- 촬영지 Loading
- 촬영지 Error
- Retry
- 촬영지 Empty

ExploreMap / CourseMap:

- SDK Loading
- SDK Error
- 좌표 없음
- 지도 실패 시 목록 / Course 계속 사용

## 판단 기준

```text
Kakao Map 실패
↓
지도 사용 불가

하지만

촬영지 목록 / Course
↓
계속 사용 가능
```

## 포트폴리오 포인트

단순 Error UI 추가가 아니라
여러 데이터 소스가 있는 화면에서
전체 실패와 부분 실패를 구분했다.

---

# 2026-09-19 | Course 상태 처리 2차

## 문제

Course 화면에는 다음 상태가 동시에 존재한다.

```text
Course Query Data
localStorage
Candidate API
TMAP
Kakao Map
```

이 중 일부 실패가
Course 전체 실패처럼 보이면
사용자가 이미 생성한 Course를 사용할 수 없게 된다.

특히:

```text
TMAP 실패
≠
Course 실패
```

라는 구분이 필요했다.

## 판단

Course 상태를 다음 기준으로 분류했다.

```text
Blocking
Recoverable
Non-blocking
Empty
Validation
```

---

## 구현 1. Course 데이터 검증

기존에는 query string의 JSON이 파싱되기만 하면
`CourseData`라고 가정했다.

```text
JSON.parse(...)
as CourseData
```

하지만 TypeScript의 `as`는
런타임 데이터 구조를 검증하지 않는다.

따라서:

```text
missing
invalid
ready
```

상태를 분리하고
런타임 구조 검증을 추가했다.

---

## 구현 2. 후보 촬영지 상태

Course 장소 추가 영역에:

```text
Loading
Error
Retry
Empty
```

상태를 `StateFeedback` 기준으로 정리했다.

중복 요청 방지 로직은 유지했다.

---

## 구현 3. InlineWarning

전체 화면을 막지 않는 상태는
큰 Error 카드보다 작은 Warning이 적절하다고 판단했다.

새 컴포넌트:

```text
InlineWarning
```

주요 사용:

```text
TMAP 일부 실패
TMAP 전체 fallback
localStorage 실패
```

---

## 구현 4. TMAP 부분 실패

상태:

```text
real
partial
fallback
```

### real

```text
모든 구간 TMAP 성공
```

### partial

```text
일부 구간 TMAP
+
일부 구간 Haversine
```

### fallback

```text
전체 Haversine
```

어떤 상태에서도
Course 목록과 편집 기능은 유지한다.

---

## 구현 5. Route API 구간 단위 실패

기존에는 요청 Stops 중 하나라도 좌표가 유효하지 않으면
전체 `/api/routes/walking` 요청이 실패할 수 있었다.

변경 전:

```text
A 정상
B 정상
C 좌표 없음
D 정상

↓
전체 요청 실패 가능
```

변경 후:

```text
A → B
TMAP

B → C
segment failure

C → D
segment failure 또는 정상 좌표 기준 처리
```

문제가 있는 구간만 실패 상태로 반환한다.

정상 구간의 TMAP 요청은 계속 수행한다.

---

## 구현 6. localStorage 실패

기존에는 localStorage 오류가
사용자에게 명확하게 전달되지 않았다.

변경 후:

```text
저장 실패
↓
Course 화면은 유지
↓
InlineWarning
```

사용자는 현재 화면에서 Course를 계속 편집할 수 있다.

다만 새로고침 시 변경 내용이 유지되지 않을 수 있음을 알려준다.

복원 실패도:

```text
저장 Course 복원 실패
↓
초기 Course 사용
↓
Warning
```

으로 처리한다.

---

## 결과

Course 상태가 다음과 같이 정리됐다.

```text
Blocking
→ 잘못된 Course

Recoverable
→ Candidate API 실패 + Retry

Non-blocking
→ TMAP fallback
→ localStorage 실패

Empty
→ Course 없음
→ 추가 Candidate 없음

Validation
→ 여행 시간 / 최대 도보 조건 초과
```

## 포트폴리오 포인트

외부 API, localStorage, query data가 함께 존재하는 복합 화면에서
실패를 하나의 Error 상태로 처리하지 않고
사용 가능 범위에 따라 상태를 분류했다.

특히:

```text
외부 API 장애가
서비스의 핵심 기능 장애로 전파되지 않도록 설계
```

한 사례로 설명할 수 있다.

---

# 현재 핵심 Frontend 상태 흐름

```text
사용자 탐색 기준
↓
작품 / 배우 조회
↓
촬영지 후보
↓
여행 조건
↓
Trip
↓
Course Stops
↓
TMAP
↓
Distance / Walking Time
↓
Summary
↓
Kakao Map
↓
localStorage
```

---

# 현재 상태 관리 기준

핵심 상태:

```text
Course Stops
```

사용자 변경:

```text
추가
삭제
순서 변경
```

파생 상태:

```text
Course Stops
↓
order
↓
Route
↓
Marker
↓
Polyline
↓
distance
↓
walking time
↓
stay time
↓
Summary
```

---

# 외부 서비스 역할

## Supabase

```text
기준 데이터
```

## Kakao Map

```text
지도 UI
```

## TMAP

```text
실제 보행 경로 계산
```

## Haversine

```text
초기 Route 계산
+
TMAP fallback
```

## AI

향후:

```text
검증된 정보 기반 설명
개인화
Ranking
Docent
```

AI가 촬영지를 생성하지 않는다.

---

# 아직 정리해야 할 항목

## Planning 상태 처리

다음 작업:

- 초기 데이터 Loading
- API Error
- Empty
- Trip 생성 Loading
- Trip 생성 Error
- Course 없음
- Retry
- disabled 조건
- 중복 요청 방지

---

## 데이터 부족 정책

촬영지가 부족할 때
없는 장소를 생성하지 않는다.

검토:

```text
범위 확장
일반 장소 추천 여부
사용자 안내
```

---

## AI Docent

예상 입력:

```text
사용자 취향
+
여행 분위기
+
Place
+
Content
+
Scene
+
Actor
+
Episode
+
verified_fact
+
source_url
```

AI는 사실을 새로 만드는 것이 아니라
검증된 정보를 설명하는 역할을 맡는다.

---

## 실제 배포

배포 후 기록:

- Production URL
- 주요 화면
- 모바일 화면
- TMAP Route
- Course Editing
- AI Docent
- Demo 영상

---

# 앞으로 Dev Log 작성 규칙

다음과 같은 작업일 때 자세히 기록한다.

- 상태 구조 변경
- API 구조 변경
- 사용자 흐름 변경
- 예외 처리 설계
- 외부 API 연결
- 요청 구조 개선
- 데이터 구조 판단
- fallback 설계
- 면접에서 설명할 가치가 있는 기술적 결정

형식:

```text
## YYYY-MM-DD | 기능명

### 문제
왜 필요한가?

### 판단
어떤 구조를 선택했는가?

### 구현
무엇을 변경했는가?

### 이슈
어떤 문제가 있었는가?

### 해결
어떻게 해결했는가?

### 포트폴리오 포인트
Frontend Engineer 관점에서 무엇을 증명하는가?
```

단순 CSS나 문구 변경은
설계 판단이 없다면 짧게 기록하거나 생략한다.