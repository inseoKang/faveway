# FAVEWAY

> 좋아하는 작품과 배우의 실제 촬영지를 따라 나만의 서울 여행 코스를 만들어주는 콘텐츠 여행 서비스

FAVEWAY는 사용자가 좋아하는 **드라마·영화·배우**를 선택하면, 검증된 콘텐츠 촬영지 데이터를 기반으로 실제 방문 가능한 여행 코스를 구성하고, 이후 각 장소에서 작품과 장면에 대한 **AI 도슨트 경험**까지 제공하는 것을 목표로 하는 콘텐츠 여행 서비스입니다.

일반적인 AI 여행 추천처럼 LLM이 장소를 직접 생성하는 방식이 아니라, **데이터베이스에서 실제 촬영지 Candidate를 먼저 조회한 뒤 검증된 후보 안에서 추천·정렬·개인화**하도록 설계했습니다.

현재 MVP에서는 AI 추천에 앞서 전체 서비스 흐름을 검증하기 위해 **DB Candidate + 배우 관계 + 여행 시간 + 도보 제약 + 거리 계산을 이용한 규칙 기반 Course 생성**을 먼저 구현하고 있습니다.

---

## 서비스 소개

좋아하는 드라마나 영화의 촬영지를 직접 찾아 여행하려면 여러 검색 결과를 비교하고, 장소를 정리한 뒤 다시 이동 동선을 구성해야 합니다.

특히 특정 배우를 중심으로 여행하고 싶다면 단순히 해당 배우의 출연작 촬영지라는 이유만으로 **실제로 그 배우와 직접 관련 없는 장소까지 섞일 수 있습니다.**

FAVEWAY는 이를 해결하기 위해 다음 흐름을 하나의 서비스로 연결합니다.

```text
콘텐츠 / 배우 탐색
→ 작품 선택
→ 관련 촬영지 조회
→ 여행 조건 입력
→ 방문 가능한 Course 생성
→ 지도에서 코스 확인
→ 장소 상세 확인
→ AI Docent
```

현재 MVP는 **서울 지역의 드라마·영화·배우 기반 콘텐츠 여행**에 집중합니다.

---

## 해결하려는 문제

### 1. 촬영지를 직접 찾아야 하는 문제

좋아하는 콘텐츠의 실제 촬영지를 방문하려면 사용자가 여러 사이트에서 장소 정보를 직접 검색하고 비교해야 합니다.

### 2. 촬영지 목록을 실제 여행 동선으로 다시 만들어야 하는 문제

촬영지 목록을 찾더라도 제한된 여행 시간 안에서 어떤 장소를 방문할지, 어떤 순서로 이동할지 다시 계획해야 합니다.

### 3. 작품·배우·장소의 관계가 불명확한 문제

특정 배우가 출연한 작품의 촬영지라고 해서 모든 장소가 해당 배우의 장면과 직접 연결되는 것은 아닙니다.

FAVEWAY는 작품 관계와 배우 관계를 구분하여, 배우를 선택한 경우 **해당 배우와 직접 연결된 촬영지를 우선적으로 추천**합니다.

### 4. 실제 여행 가능성이 고려되지 않는 문제

장소 자체가 좋아도 장소 사이를 지나치게 오래 걸어야 한다면 실제 여행 코스로 사용하기 어렵습니다.

FAVEWAY는 사용자가 설정한:

- 전체 여행 가능 시간
- 한 구간 최대 도보 시간

을 함께 고려하여 실제 방문 가능한 코스를 구성합니다.

### 5. AI 추천의 신뢰성 문제

LLM이 장소나 촬영 정보를 직접 생성하게 하면 실제 존재하지 않거나 검증되지 않은 정보를 사실처럼 제공할 수 있습니다.

FAVEWAY에서는 AI가 새로운 촬영지를 만들어내는 것이 아니라 **DB에 존재하는 검증된 Candidate 안에서만 추천하도록 제한**합니다.

---

# FAVEWAY의 설계 원칙

역할을 다음과 같이 분리합니다.

```text
DB        = 사실과 관계
Backend   = 데이터와 서비스 흐름
AI        = 선택·정렬·설명·개인화
Frontend  = 사용자 경험
```

AI에게 촬영지 자체를 생성하도록 하지 않습니다.

목표 Recommendation Pipeline은 다음과 같습니다.

```text
User Preference
+
Database Candidate
↓
Filtering
↓
Route Validation
↓
AI Ranking
↓
Validation
↓
Course
```

현재 구현 단계에서는 AI Ranking 이전의 핵심 흐름을 먼저 검증하고 있습니다.

```text
Database Candidate
↓
Actor Relation Priority
↓
Route Combination
↓
Walking Constraint
↓
Duration Constraint
↓
Distance Optimization
↓
Course
```

---

# 핵심 기능

## 1. 콘텐츠 탐색

현재 다음 두 가지 방식으로 여행할 콘텐츠를 탐색할 수 있습니다.

```text
작품으로 찾기
또는
배우로 찾기
```

### 작품 기준

```text
작품 선택
↓
관련 촬영지 조회
```

### 배우 기준

```text
배우 이름 검색
↓
배우 선택
↓
출연 작품 조회
↓
작품 선택
↓
배우 관련 촬영지 우선 조회
```

배우 검색은 전체 이름뿐만 아니라 **이름 일부를 입력해도 검색**할 수 있도록 구성했습니다.

---

## 2. 배우 관계 기반 촬영지 우선순위

사용자가 배우를 선택하면 작품에 속한 모든 촬영지를 동일하게 취급하지 않습니다.

예를 들어:

```text
Actor   : 공유
Content : 도깨비
```

를 선택했다면 다음과 같이 처리합니다.

```text
도깨비 촬영지 Candidate
↓
공유와 직접 연결된 relation 확인
↓
공유 관련 촬영지 우선
↓
나머지 작품 촬영지
```

동일한 장소에 여러 개의 `place_relations`가 존재할 경우에도 선택한 배우와 직접 연결된 relation을 우선 유지합니다.

---

## 3. 여행 조건 설정

사용자는 Course를 생성하기 전에 다음 조건을 설정합니다.

### 여행 가능 시간

현재 MVP에서는:

```text
3시간
4시간
5시간
```

중 하나를 선택합니다.

여행 시간에 따라 최대 방문 장소 수도 달라집니다.

```text
3시간 → 최대 2곳
4시간 → 최대 3곳
5시간 → 최대 4곳
```

### 한 구간 최대 도보 시간

```text
10분 이내
20분 이내
30분 이내
제한 없음
```

여기서 최대 도보 시간은 **전체 여행의 총 도보 시간이 아니라 한 장소에서 다음 장소까지 이동하는 한 구간의 최대 도보 시간**을 의미합니다.

예:

```text
A → B : 8분   ✅

B → C : 17분  ❌
사용자 최대 도보 시간이 10분인 경우
```

---

## 4. 촬영지 Candidate 조회

선택한 작품과 연결된 실제 장소를 DB에서 조회합니다.

기본 조건:

```text
작품 관계 존재
+
is_active = true
+
좌표 존재
```

배우까지 선택한 경우:

```text
작품 관계 존재
+
선택 배우와 직접 연결된 장소 우선
+
is_active = true
+
좌표 존재
```

Course 생성에 사용되는 장소는 **DB에서 조회된 Candidate로 제한**됩니다.

---

## 5. Course 생성

현재 MVP에서는 AI Course Recommendation을 연결하기 전에 **규칙 기반 Course 생성 로직**을 구현했습니다.

현재 Course 생성 과정:

```text
1. 작품과 연결된 DB Candidate 조회
2. 비활성 장소 제외
3. 동일 장소 중복 제거
4. 배우 선택 시 배우 relation 우선 보존
5. 좌표가 존재하는 장소만 Route Candidate로 사용
6. 여행 시간에 따라 최대 방문 장소 수 결정
7. 가능한 장소 조합 및 방문 순서 생성
8. 장소 간 거리 및 예상 도보 시간 계산
9. 최대 도보 시간 조건을 초과하는 Course 제외
10. 전체 여행 시간을 초과하는 Course 제외
11. 배우 관련 장소가 많이 포함된 Course 우선
12. 배우 관련 장소 수가 같다면 이동거리가 짧은 Course 선택
13. 이동 시간을 제외한 시간을 장소별 체류 시간으로 분배
14. Course 반환
```

### Course 우선순위

배우가 선택된 경우:

```text
1순위
선택 배우 관련 촬영지가 많이 포함된 Course

↓

2순위
배우 관련 장소 수가 같다면
총 이동거리가 더 짧은 Course
```

작품만 선택한 경우에는 배우 우선순위를 적용하지 않고 **여행 조건을 만족하는 Course 중 이동거리가 짧은 Course**를 선택합니다.

---

## 6. 이동 거리와 도보 시간

현재는 장소의 위도·경도를 이용해 **Haversine Formula 기반 직선거리**를 계산합니다.

```text
Place A
(latitude, longitude)

↓

Haversine Distance

↓

Place B
(latitude, longitude)
```

실제 도보 경로는 직선거리보다 길어질 수 있기 때문에 현재 MVP에서는 보정값을 적용해 예상 도보 시간을 계산합니다.

```text
직선거리
×
경로 보정값
÷
평균 도보 속도
=
예상 도보 시간
```

> 현재 값은 실제 지도 도보 경로가 아닌 추정치입니다. 이후 Kakao Map 기반 실제 이동 경로 계산으로 개선할 예정입니다.

---

## 7. 체류 시간

Course의 `stayMinutes`는 장소 사이의 이동 시간이 아니라 **해당 장소에서 사용자가 머무를 수 있는 예상 시간**입니다.

```text
전체 여행 가능 시간
-
전체 이동 시간
=
전체 체류 가능 시간
```

현재는 장소별 권장 체류시간 데이터가 없기 때문에 남은 시간을 장소 수로 균등 분배합니다.

예:

```text
01 운현궁 양관
예상 체류 70분

↓ 도보 12분

02 촬영지 B
예상 체류 70분
```

향후 장소 유형이나 콘텐츠 정보에 따라 체류 시간을 다르게 배분할 수 있도록 확장할 예정입니다.

---

# 향후 AI Course Recommendation

현재의 규칙 기반 Course Pipeline을 검증한 뒤 AI를 추천 계층에 추가할 예정입니다.

AI는 장소를 새로 생성하는 것이 아니라 **DB Candidate 안에서 선택과 정렬을 수행**합니다.

## Candidate Retrieval

예:

```text
Actor   : 공유
Content : 도깨비
```

Candidate:

```text
도깨비와 연결된 장소
+
공유 relation이 있는 장소 우선
+
is_active = true
+
좌표 존재
```

## AI Input 예시

```json
{
  "preference": {
    "content": "도깨비",
    "actor": "공유"
  },
  "durationMinutes": 240,
  "maxWalkingMinutes": 20,
  "candidates": [
    {
      "id": 1,
      "name": "운현궁 양관",
      "relation": "SCENE_ACTOR",
      "scene": "...",
      "latitude": 37.0,
      "longitude": 127.0
    }
  ]
}
```

## Structured Output

AI 결과는 자유 텍스트가 아닌 Structured JSON으로 제한할 예정입니다.

```json
{
  "stops": [
    {
      "placeId": 1,
      "order": 1,
      "stayMinutes": 45,
      "reason": "..."
    }
  ]
}
```

## Validation

```text
LLM Output
↓
Zod Schema Validation
↓
Candidate ID Validation
↓
Route Validation
↓
Valid Course
```

AI가 DB Candidate에 존재하지 않는 `placeId`를 반환하면 유효하지 않은 결과로 처리합니다.

---

# 추천 근거

향후 AI Course에서는 장소만 보여주는 것이 아니라 **왜 이 장소가 Course에 포함되었는지**를 함께 제공합니다.

예:

```text
선택한 작품의 실제 촬영 장소이며,
선택한 배우와 직접 연결되어 있고,
다른 촬영지와의 이동 동선과 여행 가능 시간을 고려해
Course에 포함했습니다.
```

---

# 코스 지도

Kakao Map을 이용해 생성된 Course를 지도에서 확인하는 기능을 추가할 예정입니다.

계획 기능:

- 다중 Marker
- 방문 순서 표시
- 장소 선택
- Course Path 표시
- 장소 상세 연결

---

# 장소 상세

장소마다 다음 관계를 확인할 수 있도록 확장할 예정입니다.

```text
Place
↓
Content
↓
Scene
↓
Actor
↓
Evidence
```

표시 예정 정보:

- 장소명
- 주소
- 관련 작품
- 회차
- 장면 설명
- 관련 배우
- 작품 / 배우 관계
- 데이터 검증 상태
- 출처

---

# AI Docent

현장에서 작품과 장면 정보를 개인화해서 설명하는 AI Docent를 제공할 예정입니다.

AI Docent에는 DB에서 검증된 정보만 전달합니다.

```text
작품
배우
회차
장면
장소
verified_fact
사용자 콘텐츠 취향
```

Pipeline:

```text
Verified DB Data
+
User Preference
↓
Prompt
↓
LLM
↓
Personalized Docent
```

Prompt에는 다음과 같은 제한을 포함합니다.

```text
제공하지 않은 작품의 사실이나
촬영 정보를 추가하지 마세요.
```

LLM 호출에 실패할 경우 DB에 저장된 기본 설명을 제공하는 Fallback도 추가할 예정입니다.

---

# 데이터 신뢰성

FAVEWAY에서는 모든 장소 데이터를 동일하게 취급하지 않습니다.

## `PUBLIC_DATA`

공공기관 데이터에서 작품과 장소 관계를 확인한 데이터입니다.

## `FAVEWAY_VERIFIED`

공식 자료나 신뢰 가능한 출처를 추가로 확인하여 작품·장면·배우 관계 등을 검증한 데이터입니다.

## `DISCOVERY`

콘텐츠 촬영지는 아니지만 이동 경로나 여행 경험을 보완하기 위해 추천할 수 있는 일반 장소입니다.

> 현재 MVP에서는 검증된 콘텐츠 촬영지를 우선하며 `DISCOVERY`는 이후 버전에서 확장할 예정입니다.

---

# 데이터 소스

## Primary Data

**한국문화정보원 미디어콘텐츠 영상 촬영지 데이터**

주요 활용 정보:

- 작품명
- 장소명
- 주소
- 위도 / 경도
- 장소 설명
- 미디어 유형

## Secondary Data

- 한국영상자료원 KMDb
- Wikidata
- 한국관광공사 TourAPI
- 방송사 공식 콘텐츠
- 공식 기사
- 지자체 관광 페이지

공공데이터만으로 확인하기 어려운 배우·장면 관계는 추가 검증 후 별도로 저장합니다.

---

# 핵심 데이터 모델

FAVEWAY가 최종적으로 표현하려는 핵심 관계는 다음과 같습니다.

```text
Actor
↓
Content
↓
Scene
↓
Place
```

현재 MVP에서는 먼저:

```text
Actor
↓
Content
↓
Place
```

관계를 실제 사용자 흐름에 연결하고 있으며, 이후 Scene / Evidence 데이터를 확장합니다.

사용자는 배우나 작품을 기준으로 여행을 시작하지만 최종 추천 Entity는 `Place`입니다.

주요 데이터 구조:

```text
contents
actors
content_actors
places
place_relations
```

향후 확장:

```text
scenes
scene_actors
scene_places
trips
trip_stops
```

특히 `place_relations`는 작품·배우·장소의 관계와 검증 정보를 Course 생성에서 활용하는 핵심 데이터입니다.

예:

```text
place_relations

content_id
actor_id
place_id
relation_type
verification_status
verified_fact
```

`actor_id = null`인 경우 작품과의 관계는 확인되지만 특정 배우와의 직접 관계는 없는 장소로 처리할 수 있습니다.

---

# 시스템 아키텍처

```text
                    User
                      │
                      ▼
                 Next.js App
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
      Frontend                API Routes
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
                Supabase                 Recommendation
               PostgreSQL                    Logic
                                                │
                                      ┌─────────┴─────────┐
                                      │                   │
                                   OpenAI             Kakao Map
                                   (planned)           (planned)
```

개인 프로젝트의 개발 복잡도를 줄이기 위해 별도의 Backend 서버를 분리하지 않고 **Next.js Route Handler**를 이용해 API를 구성합니다.

---

# Tech Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

## Backend

- Next.js Route Handler
- REST API

## Database

- Supabase
- PostgreSQL

## Recommendation

현재:

- DB Candidate Retrieval
- Actor Relation Priority
- Haversine Distance
- Walking Time Estimation
- Route Combination
- Constraint Validation

예정:

- OpenAI API
- Structured Output
- Zod Validation

## Map

예정:

- Kakao Maps JavaScript SDK

## Data Processing

예정:

- Python
- Pandas

## Deployment

예정:

- Vercel
- Supabase Production

---

# 현재 구현 API

```text
GET    /api/contents
GET    /api/actors/search?q=
GET    /api/actors/:actorId/contents
GET    /api/contents/:contentId/places
GET    /api/contents/:contentId/places?actorId=

POST   /api/trips
```

---

## `GET /api/actors/search?q=`

배우 이름 일부를 이용해 배우를 조회합니다.

예:

```text
/api/actors/search?q=공
```

```text
공유
```

---

## `GET /api/actors/:actorId/contents`

선택한 배우가 출연한 작품을 조회합니다.

```text
배우 선택
↓
content_actors
↓
출연 작품
```

---

## `GET /api/contents/:contentId/places`

선택 작품과 연결된 촬영지를 조회합니다.

배우가 함께 선택된 경우:

```text
/api/contents/1/places?actorId=3
```

해당 배우와 직접 연결된 relation을 우선하여 반환합니다.

---

## `POST /api/trips`

현재 MVP의 규칙 기반 Course를 생성합니다.

### Request

```json
{
  "contentId": 1,
  "actorId": 3,
  "durationMinutes": 240,
  "maxWalkingMinutes": 20
}
```

`actorId`는 작품만 선택한 경우 `null`입니다.

```json
{
  "contentId": 1,
  "actorId": null,
  "durationMinutes": 240,
  "maxWalkingMinutes": null
}
```

`maxWalkingMinutes = null`은 한 구간 최대 도보 시간에 제한을 두지 않는다는 의미입니다.

### Course 생성 과정

```text
DB Candidate
↓
Active Place Filter
↓
Actor Relation Priority
↓
Deduplication
↓
Coordinate Filter
↓
Route Combination
↓
Distance Calculation
↓
Walking Constraint
↓
Duration Constraint
↓
Actor Match Priority
↓
Distance Optimization
↓
Stay Time Calculation
↓
Course
```

### Response 주요 정보

```json
{
  "contentId": 1,
  "actorId": 3,
  "durationMinutes": 240,
  "maxWalkingMinutes": 20,
  "actorMatchedPlaceCount": 2,
  "totalDistanceKm": 2.4,
  "totalWalkingMinutes": 45,
  "stops": [
    {
      "placeId": 10,
      "order": 1,
      "stayMinutes": 65,
      "distanceFromPreviousKm": 0,
      "walkingMinutesFromPrevious": 0,
      "actorId": 3,
      "isActorRelated": true
    }
  ]
}
```

---

# 현재 Course 선택 기준

배우가 선택된 경우:

```text
1. 최대 도보 시간 만족
2. 전체 여행 시간 만족
3. 가능한 최대 장소 수 확보
4. 선택 배우 관련 촬영지 수 최대화
5. 배우 관련 장소 수가 같으면 이동거리 최소화
```

작품만 선택한 경우:

```text
1. 최대 도보 시간 만족
2. 전체 여행 시간 만족
3. 가능한 최대 장소 수 확보
4. 이동거리 최소화
```

---

# Data Pipeline

공공데이터 원본은 직접 수정하지 않고 별도로 관리하는 구조를 목표로 합니다.

```text
Raw Public Data
↓
Normalization
↓
Entity Extraction
↓
Relation Mapping
↓
Verification
↓
Database Insert
↓
Candidate Retrieval
↓
Recommendation
```

예정 폴더 구조:

```text
data/
├── raw/
│   └── filming_locations.csv
│
└── processed/
    ├── contents.csv
    ├── actors.csv
    ├── scenes.csv
    └── places.csv
```

ETL 과정은 Python과 Pandas를 이용해 자동화할 예정입니다.

---

# Project Structure

현재 주요 구조:

```text
faveway/
│
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   │
│   │   ├── explore/
│   │   │   └── page.tsx
│   │   │
│   │   ├── planning/
│   │   │   └── page.tsx
│   │   │
│   │   ├── course/
│   │   │   └── page.tsx
│   │   │
│   │   └── api/
│   │       ├── contents/
│   │       ├── actors/
│   │       └── trips/
│   │
│   └── lib/
│       ├── supabase/
│       └── recommendation/
│           └── distance.ts
│
├── public/
├── README.md
├── package.json
└── .env.local
```

향후 다음 구조를 추가할 예정입니다.

```text
src/
├── app/
│   ├── place/
│   └── guide/
│
├── components/
│   ├── common/
│   ├── content/
│   ├── planning/
│   ├── course/
│   ├── map/
│   └── guide/
│
└── lib/
    ├── openai/
    └── kakao/
```

---

# Getting Started

## 1. Repository Clone

```bash
git clone https://github.com/inseoKang/faveway.git
cd faveway
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Environment Variables

프로젝트 루트에 `.env.local` 파일을 생성합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

> API Key 및 환경 변수 파일은 GitHub에 업로드하지 않습니다.

## 4. Run Development Server

```bash
npm run dev
```

브라우저에서:

```text
http://localhost:3000
```

으로 접속합니다.

---

# Current User Flow

현재 구현된 흐름:

```text
EXPLORE
↓
작품으로 찾기 / 배우로 찾기
↓
배우 선택 시 출연 작품 조회
↓
작품 선택
↓
촬영지 Candidate 조회
↓
배우 관련 장소 우선 표시
↓
PLANNING
↓
여행 가능 시간 선택
↓
한 구간 최대 도보 시간 선택
↓
Rule-based Course 생성
↓
COURSE
↓
체류 시간 / 이동 시간 확인
```

---

# Target MVP User Flow

최종 MVP 목표:

```text
HOME
↓
EXPLORE
↓
Actor / Content 선택
↓
배우 선택 시 Work 선택
↓
PLANNING
↓
Candidate Retrieval
↓
Course Recommendation
↓
COURSE
↓
KAKAO MAP
↓
PLACE DETAIL
↓
AI DOCENT
```

완료 기준:

```text
드라마 또는 배우 선택
↓
관련 작품 선택
↓
여행 조건 선택
↓
DB에서 실제 촬영지 Candidate 조회
↓
여행 가능한 Course 구성
↓
추천 근거 확인
↓
Kakao Map에서 Course 확인
↓
작품·장면·배우 관계 확인
↓
AI Docent 생성
```

---

# Development Status

> 실제 구현 상태를 기준으로 업데이트합니다.

## Core

- [x] 콘텐츠 목록 조회
- [ ] 콘텐츠 이름 검색
- [x] 배우 이름 부분 검색
- [x] 배우 출연 작품 조회
- [x] 작품별 촬영지 조회
- [x] 배우 관련 촬영지 우선 표시
- [x] 여행 가능 시간 입력
- [x] 한 구간 최대 도보 시간 입력
- [x] 촬영지 좌표 기반 거리 계산
- [x] 예상 도보 시간 계산
- [x] 여행 시간별 최대 방문 장소 수 적용
- [x] 최대 도보 시간 기반 Course Filter
- [x] 배우 관계 기반 Course Priority
- [x] 규칙 기반 Course 생성
- [x] Course UI
- [ ] Course 장소 직접 삭제 / 수정
- [ ] Place Detail

## Actor / Content Relation

- [x] Actor 검색
- [x] Actor → Content 조회
- [x] Content → Place 조회
- [x] Actor → Content → Place 흐름
- [ ] Actor → Content → Scene → Place 흐름
- [ ] Evidence 표시

## AI

- [ ] Candidate 기반 Course Recommendation
- [ ] Structured Output
- [ ] Zod Validation
- [ ] Unknown Place ID 차단
- [ ] Recommendation Reason
- [ ] AI Docent
- [ ] AI 실패 Fallback

## Map

- [ ] Kakao Map 연동
- [ ] 단일 Marker
- [ ] 다중 Marker
- [ ] 방문 순서 표시
- [ ] 실제 도보 경로 계산

## Data

- [ ] 공공데이터 Raw Import 자동화
- [ ] 콘텐츠 정규화 자동화
- [ ] 장소 정규화 자동화
- [ ] 배우 관계 데이터 확대
- [ ] Scene 관계 데이터 구성
- [ ] Verification 정보 확대
- [ ] ETL 자동화

## Deployment

- [ ] Vercel 배포
- [ ] Supabase Production 연결
- [ ] Production Environment Variables 설정

---

# MVP 이후 확장

## Version 2

- 회원가입 / 로그인
- 여행 코스 저장
- 여행 기록
- 실시간 GPS
- 현재 위치 → 첫 장소 이동 안내
- TTS
- Discovery Spot
- 주변 관광지 자동 보완

## Version 3

- 아티스트 기반 여행
- 팬 장소
- 최신 작품 자동 확장
- 사용자 장소 제보
- 검증 / 신고 시스템
- 영어 지원
- 전국 지역 확장

---

# Technical Highlights

## 1. 공공데이터를 서비스용 관계 데이터로 확장

단순히 촬영지 CSV를 화면에 표시하는 것이 아니라 작품·배우·장소 사이의 관계를 분리하여 서비스 로직에 활용합니다.

```text
Raw Data
↓
Normalize
↓
Entity
↓
Relation
↓
Course Candidate
```

---

## 2. 배우 선택이 실제 Recommendation 결과에 영향을 주는 구조

배우 선택을 UI Filter로만 사용하지 않습니다.

```text
Actor Selection
↓
actorId
↓
place_relations.actor_id
↓
Actor-related Candidate
↓
Course Priority
```

선택한 배우와 직접 연결된 촬영지가 많을수록 Course 우선순위가 높아집니다.

---

## 3. 실제 여행 조건을 고려한 Route 생성

단순 장소 추천이 아니라:

```text
여행 가능 시간
+
한 구간 최대 도보 시간
+
장소 간 거리
+
최소 체류 시간
```

을 이용해 Course의 실제 방문 가능성을 검증합니다.

---

## 4. DB Candidate 기반 Recommendation Pipeline

현재:

```text
DB Candidate
→ Actor Priority
→ Route Combination
→ Distance Calculation
→ Walking Validation
→ Duration Validation
→ Course
```

향후:

```text
DB Candidate
→ Actor / Scene Relation
→ Route Calculation
→ AI Personalization
→ Schema Validation
→ Candidate Validation
→ Course
```

---

## 5. AI Hallucination을 구조적으로 제한

향후 LLM 결과를 Zod Schema로 검증하고, Candidate에 존재하지 않는 `placeId`는 거부합니다.

```text
DB Candidate
↓
LLM
↓
Structured Output
↓
Schema Validation
↓
Candidate ID Validation
```

AI가 실제 촬영지를 새로 만들어내지 못하도록 데이터 계층과 AI 계층을 분리합니다.

---

## 6. 추천 근거를 사용자에게 보여주는 구조

결과만 보여주는 추천이 아니라:

```text
작품 관계
배우 관계
장면 관계
검증 상태
추천 이유
```

를 함께 제공하여 사용자가 **왜 이 장소가 추천됐는지 이해할 수 있는 서비스**를 목표로 합니다.

---

## 7. 여행 계획에서 현장 콘텐츠 경험까지 연결

FAVEWAY의 목표는 Course Recommendation에서 끝나지 않습니다.

```text
콘텐츠 선택
↓
촬영지 탐색
↓
Course 생성
↓
지도 이동
↓
장소 도착
↓
Place Detail
↓
AI Docent
```

여행 계획부터 실제 장소에서 콘텐츠를 다시 경험하는 과정까지 연결합니다.

---

# 현재 Routing의 한계

현재 Route 계산은 MVP 검증을 위한 규칙 기반 구현입니다.

### 직선거리 기반

실제 도로가 아닌 위·경도 사이의 직선거리를 사용합니다.

### 예상 도보 시간

직선거리에 임시 보정값을 적용해 계산합니다.

### 체류시간 균등 분배

장소별 권장 체류시간 데이터가 없기 때문에 현재는 이동시간을 제외한 시간을 균등하게 배분합니다.

### Course 조합 탐색

현재는 적은 수의 Candidate를 전제로 가능한 방문 순서를 비교합니다.

Candidate 규모가 커지면 향후:

- Candidate 사전 필터링
- 지역 Cluster
- Heuristic Routing
- 실제 지도 경로 API

등을 적용해 개선할 예정입니다.

---

# 프로젝트 핵심 원칙

FAVEWAY의 핵심은 **AI가 얼마나 많은 것을 생성하는가**가 아니라,

> **검증된 콘텐츠 데이터를 실제 여행 가능한 경험으로 얼마나 잘 연결하고 개인화하는가**

에 있습니다.

```text
콘텐츠 / 배우 선택
↓
실제 촬영지 Candidate 조회
↓
관계 기반 우선순위
↓
여행 가능한 Course 구성
↓
추천 근거 설명
↓
현장에서 콘텐츠 경험
```

새로운 기능을 추가할 때에도 이 핵심 흐름을 강화하는 기능인지 먼저 판단하고, 그렇지 않은 기능은 MVP 이후로 분리합니다.
