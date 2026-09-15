# FAVEWAY

> 좋아하는 작품과 배우의 실제 촬영지를 따라 나만의 서울 여행 코스를 만들어주는 콘텐츠 여행 서비스

FAVEWAY는 사용자가 좋아하는 **드라마·영화·배우**를 선택하면, 검증된 콘텐츠 촬영지 데이터를 기반으로 실제 방문 가능한 여행 코스를 구성하고, 이후 각 장소에서 작품과 장면에 대한 **AI 도슨트 경험**까지 제공하는 것을 목표로 하는 콘텐츠 여행 서비스입니다.

일반적인 AI 여행 추천처럼 LLM이 장소를 직접 생성하는 방식이 아니라, **데이터베이스에서 실제 촬영지 Candidate를 먼저 조회한 뒤 검증된 후보 안에서 추천·정렬·개인화**하도록 설계했습니다.

현재 MVP에서는 AI Recommendation을 연결하기 전에 **DB Candidate + Actor → Scene → Place 관계 + 여행 시간 + 도보 제약 + 거리 계산을 이용한 규칙 기반 Course 생성**을 먼저 구현하고 있습니다.

---

# 서비스 소개

좋아하는 드라마나 영화의 촬영지를 직접 찾아 여행하려면 여러 검색 결과를 비교하고, 장소를 정리한 뒤 다시 이동 동선을 구성해야 합니다.

특히 특정 배우를 중심으로 여행하고 싶다면 단순히 해당 배우가 출연한 작품의 촬영지를 모두 보여주는 것만으로는 충분하지 않습니다.

같은 작품 안에서도 배우가 등장하지 않은 장면의 촬영지가 많기 때문입니다.

FAVEWAY는 이를 해결하기 위해 단순한:

```text
Actor
→ Content
→ Place
```

관계가 아니라:

```text
Actor
→ Scene
→ Place
```

관계를 이용합니다.

작품까지 포함하면:

```text
Actor + Content
↓
선택 작품의 Scene
↓
선택 Actor가 등장한 Scene
↓
Scene과 연결된 Place
```

의 흐름으로 실제 배우가 등장한 장면의 촬영지를 찾습니다.

전체 서비스 흐름은 다음과 같습니다.

```text
콘텐츠 / 배우 탐색
→ 배우 선택 시 출연 작품 조회
→ 작품 선택
→ Actor → Scene → Place 기반 촬영지 조회
→ 여행 조건 입력
→ 방문 가능한 Course 생성
→ 지도에서 코스 확인
→ 장소 상세 확인
→ AI Docent
```

현재 MVP는 **서울 지역의 드라마·영화·배우 기반 콘텐츠 여행**에 집중합니다.

---

# 해결하려는 문제

## 1. 촬영지를 직접 찾아야 하는 문제

좋아하는 콘텐츠의 실제 촬영지를 방문하려면 사용자가 여러 사이트에서 장소 정보를 직접 검색하고 비교해야 합니다.

---

## 2. 촬영지 목록을 실제 여행 동선으로 다시 만들어야 하는 문제

촬영지 목록을 찾더라도 제한된 여행 시간 안에서 어떤 장소를 방문할지, 어떤 순서로 이동할지 다시 계획해야 합니다.

---

## 3. 배우와 실제 촬영지의 관계가 불명확한 문제

특정 배우가 작품에 출연했다는 이유만으로 작품의 모든 촬영지가 해당 배우와 관련 있는 것은 아닙니다.

예:

```text
도깨비

Scene A
→ 공유 등장
→ 촬영지 A

Scene B
→ 김고은 등장
→ 촬영지 B

Scene C
→ 공유 + 김고은 등장
→ 촬영지 C
```

사용자가 `공유`를 선택했다면 FAVEWAY에서는:

```text
촬영지 A
촬영지 C
```

처럼 **공유가 실제 등장한 Scene과 연결된 Place만 Candidate로 사용**합니다.

---

## 4. 실제 여행 가능성이 고려되지 않는 문제

촬영지 자체가 좋아도 장소 사이를 지나치게 오래 걸어야 한다면 실제 여행 코스로 사용하기 어렵습니다.

FAVEWAY는 사용자가 설정한:

```text
전체 여행 가능 시간
+
한 구간 최대 도보 시간
```

을 함께 고려해 실제 방문 가능한 Course를 구성합니다.

---

## 5. AI 추천의 신뢰성 문제

LLM이 장소나 촬영 정보를 직접 생성하면 실제 존재하지 않거나 검증되지 않은 정보를 사실처럼 제공할 수 있습니다.

FAVEWAY에서는 AI가 촬영지를 새로 생성하는 것이 아니라:

```text
Database Candidate
↓
Filtering
↓
Route Validation
↓
AI Personalization
```

구조로 제한합니다.

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

현재 구현된 Recommendation Pipeline은 다음과 같습니다.

```text
Actor / Content Selection
↓
Scene Retrieval
↓
Actor Scene Filtering
↓
Scene → Place Mapping
↓
Active Place Filter
↓
Coordinate Filter
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

향후 AI를 추가하면:

```text
Database Candidate
↓
Actor / Scene Filtering
↓
Route Validation
↓
AI Personalization
↓
Structured Output Validation
↓
Candidate ID Validation
↓
Course
```

형태로 확장할 예정입니다.

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
작품의 전체 촬영지 조회
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
선택 배우가 등장한 Scene 조회
↓
해당 Scene과 연결된 촬영지 조회
```

배우 검색은 전체 이름뿐만 아니라 **이름 일부만 입력해도 검색**할 수 있도록 구성했습니다.

---

# 배우 기반 촬영지 필터링

배우가 선택된 경우 단순히 작품 촬영지를 우선 정렬하는 것이 아니라 **실제 Scene 관계를 따라 Candidate 자체를 제한합니다.**

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

작품 조건까지 포함하면:

```text
Actor
+
Content
↓
해당 작품의 Scene
↓
선택 Actor가 등장한 Scene
↓
Scene과 연결된 Place
```

예:

```text
Actor   : 공유
Content : 도깨비
```

처리:

```text
도깨비 Scene 조회
↓
공유가 등장한 Scene만 Filter
↓
해당 Scene과 연결된 Place 조회
↓
Course Candidate
```

따라서 배우가 선택된 경우 **배우가 실제 등장한 것으로 확인된 촬영지만 Course 후보가 됩니다.**

---

# 여행 조건 설정

## 여행 가능 시간

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

---

## 한 구간 최대 도보 시간

현재 선택값:

```text
10분 이내
20분 이내
30분 이내
제한 없음
```

최대 도보 시간은 **전체 여행에서 걷는 총 시간이 아니라 한 장소에서 다음 장소까지 이동하는 한 구간의 최대 도보 시간**을 의미합니다.

예:

```text
사용자 최대 도보 시간: 10분

A → B = 8분
가능

B → C = 17분
불가능
```

---

# 촬영지 Candidate 조회

## 작품만 선택한 경우

```text
작품과 연결된 촬영지
+
is_active = true
+
좌표 존재
```

를 Candidate로 사용합니다.

---

## 작품 + 배우를 선택한 경우

```text
선택 작품의 Scene
↓
선택 배우가 등장한 Scene
↓
해당 Scene과 연결된 Place
↓
is_active = true
↓
좌표 존재
```

를 Candidate로 사용합니다.

즉:

```text
배우 관련 장소 우선
```

이 아니라:

```text
배우가 실제 등장한 Scene의 촬영지만 사용
```

하는 구조입니다.

---

# Course 생성

현재 MVP에서는 AI Course Recommendation을 연결하기 전에 **규칙 기반 Course 생성 로직**을 사용합니다.

전체 과정:

```text
1. 작품 기준 DB Candidate 조회

2. 배우가 선택된 경우
   Actor → Scene → Place 기반 Candidate Filter

3. 비활성 장소 제외

4. 동일 장소 중복 제거

5. 좌표가 존재하는 장소만 사용

6. 여행 시간에 따라 최대 방문 장소 수 결정

7. 가능한 장소 조합 및 방문 순서 생성

8. 장소 간 거리 계산

9. 예상 도보 시간 계산

10. 최대 도보 시간 초과 Course 제외

11. 전체 여행 가능 시간 초과 Course 제외

12. 가능한 Course 중 총 이동거리가 가장 짧은 Course 선택

13. 이동 시간을 제외한 시간을 장소별 체류 시간으로 분배

14. Course 반환
```

---

# 현재 Course 선택 기준

## 작품만 선택한 경우

```text
1. 최대 도보 시간 만족
2. 전체 여행 가능 시간 만족
3. 가능한 최대 장소 수 확보
4. 총 이동거리 최소화
```

---

## 배우 + 작품 선택

배우가 선택된 경우에는 Candidate 자체가 이미:

```text
선택 배우가 실제 등장한 Scene의 Place
```

로 제한되어 있습니다.

따라서 Course 선택은:

```text
1. Actor → Scene → Place 조건 만족
2. 최대 도보 시간 만족
3. 전체 여행 가능 시간 만족
4. 가능한 최대 장소 수 확보
5. 총 이동거리 최소화
```

순으로 이루어집니다.

---

# 이동 거리 계산

현재는 장소의 위도·경도를 이용해 **Haversine Formula 기반 직선거리**를 계산합니다.

```text
Place A
(latitude, longitude)

↓

Haversine Formula

↓

Place B
(latitude, longitude)
```

실제 도보 경로는 직선거리보다 길어질 수 있기 때문에 MVP에서는 임시 보정값을 적용합니다.

```text
직선거리
×
경로 보정값
÷
평균 도보 속도
=
예상 도보 시간
```

> 현재 이동거리 및 도보 시간은 실제 지도 경로가 아닌 추정값입니다.

향후 Kakao Map 기반 실제 이동 경로를 사용하도록 개선할 예정입니다.

---

# 체류 시간

`stayMinutes`는 장소 사이의 이동 시간이 아니라 **해당 장소에서 머무르는 예상 시간**입니다.

```text
전체 여행 가능 시간
-
전체 예상 이동 시간
=
전체 체류 가능 시간
```

현재는 장소별 권장 체류시간 데이터가 없기 때문에 남은 시간을 장소 수로 균등 분배합니다.

예:

```text
01 촬영지 A
예상 체류 70분

↓ 도보 12분

02 촬영지 B
예상 체류 70분
```

향후 장소 유형과 콘텐츠 정보를 기반으로 장소별 권장 체류시간을 다르게 적용할 수 있습니다.

---

# 핵심 데이터 모델

FAVEWAY의 핵심 관계는 다음과 같습니다.

```text
Actor
↓
Content
↓
Scene
↓
Place
```

실제 배우 기반 촬영지 검색에서는:

```text
actors
↓
scene_actors
↓
scenes
↓
scene_places
↓
places
```

관계를 사용합니다.

작품 출연 관계는:

```text
actors
↓
content_actors
↓
contents
```

를 통해 관리합니다.

주요 테이블:

```text
actors
content_actors
contents
places
place_relations
scenes
scene_actors
scene_places
```

향후:

```text
trips
trip_stops
```

을 추가해 생성된 여행 Course를 저장할 예정입니다.

---

# 테이블 역할

## `actors`

배우 Entity를 관리합니다.

```text
id
name
```

---

## `contents`

드라마 / 영화 콘텐츠를 관리합니다.

```text
id
title
media_type
release_year
description
```

---

## `content_actors`

배우와 출연 작품의 관계를 관리합니다.

```text
actor_id
content_id
```

사용:

```text
Actor
→ 출연 작품 조회
```

---

## `scenes`

작품의 Scene 데이터를 관리합니다.

```text
id
content_id
...
```

---

## `scene_actors`

Scene과 실제 등장 배우의 관계를 관리합니다.

```text
scene_id
actor_id
```

---

## `scene_places`

Scene과 실제 촬영 장소의 관계를 관리합니다.

```text
scene_id
place_id
```

---

## `places`

실제 장소 Entity를 관리합니다.

```text
id
name
address
latitude
longitude
place_type
is_active
```

---

## `place_relations`

작품과 장소 관계 및 검증 정보를 관리합니다.

예:

```text
content_id
place_id
relation_type
verification_status
verified_fact
```

Course Candidate의 기본 장소 정보와 검증 상태를 조회할 때 사용합니다.

---

# 데이터 신뢰성

FAVEWAY에서는 모든 장소 데이터를 동일하게 취급하지 않습니다.

## `PUBLIC_DATA`

공공기관 데이터에서 작품과 장소 관계를 확인한 데이터입니다.

---

## `FAVEWAY_VERIFIED`

공식 자료나 신뢰 가능한 출처를 추가로 확인해 작품·장면·배우 관계 등을 검증한 데이터입니다.

---

## `DISCOVERY`

촬영지는 아니지만 이동 경로나 여행 경험을 보완할 수 있는 일반 장소입니다.

> 현재 MVP에서는 실제 콘텐츠 촬영지를 우선하며 `DISCOVERY`는 이후 버전에서 확장할 예정입니다.

---

# 데이터 소스

## Primary Data

**한국문화정보원 미디어콘텐츠 영상 촬영지 데이터**

주요 활용 정보:

```text
작품명
장소명
주소
위도 / 경도
장소 설명
미디어 유형
```

---

## Secondary Data

- 한국영상자료원 KMDb
- Wikidata
- 한국관광공사 TourAPI
- 방송사 공식 콘텐츠
- 공식 기사
- 지자체 관광 페이지

공공데이터만으로 확인하기 어려운 배우·Scene 관계는 추가 검증 후 DB에 저장합니다.

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

# `GET /api/actors/search?q=`

배우 이름 일부를 이용해 배우를 검색합니다.

예:

```text
/api/actors/search?q=공
```

결과:

```text
공유
```

---

# `GET /api/actors/:actorId/contents`

선택한 배우의 출연 작품을 조회합니다.

```text
Actor
↓
content_actors
↓
Content
```

---

# `GET /api/contents/:contentId/places`

작품만 선택한 경우 작품의 전체 촬영지를 조회합니다.

```text
Content
↓
place_relations
↓
Place
```

---

# `GET /api/contents/:contentId/places?actorId=`

배우가 함께 선택된 경우:

```text
Actor
↓
scene_actors
↓
Scene
↓
Content Filter
↓
scene_places
↓
Place
```

관계를 이용합니다.

즉 선택 배우가 **실제 등장한 Scene과 연결된 Place만 반환**합니다.

---

# `POST /api/trips`

현재 규칙 기반 여행 Course를 생성합니다.

## Request

```json
{
  "contentId": 1,
  "actorId": 3,
  "durationMinutes": 240,
  "maxWalkingMinutes": 20
}
```

작품만 선택한 경우:

```json
{
  "contentId": 1,
  "actorId": null,
  "durationMinutes": 240,
  "maxWalkingMinutes": null
}
```

`maxWalkingMinutes = null`은 한 구간 도보 시간에 제한을 두지 않는다는 의미입니다.

---

# Course 생성 Pipeline

```text
Actor / Content Selection
↓
Scene Retrieval
↓
Actor Scene Filtering
↓
Scene → Place Mapping
↓
Active Place Filter
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
Distance Optimization
↓
Stay Time Calculation
↓
Course
```

---

# 향후 AI Course Recommendation

현재의 규칙 기반 Course Pipeline을 검증한 후 AI를 추천 계층에 추가할 예정입니다.

AI는 장소를 직접 생성하지 않습니다.

```text
DB Candidate
↓
Actor / Scene Filter
↓
Valid Route Candidate
↓
LLM Ranking
↓
Structured Output
↓
Validation
↓
Course
```

---

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
      "sceneId": 10,
      "latitude": 37.0,
      "longitude": 127.0
    }
  ]
}
```

---

## Structured Output

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

---

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

Candidate에 존재하지 않는 `placeId`는 유효하지 않은 결과로 처리합니다.

---

# 추천 근거

향후 추천 결과에는 단순히 장소만 보여주는 것이 아니라 **왜 해당 장소가 Course에 포함되었는지**도 제공합니다.

예:

```text
선택한 배우가 실제 등장한 장면의 촬영 장소이며,
다른 촬영지와의 이동 거리와 여행 가능 시간을 고려해
Course에 포함했습니다.
```

---

# Place Detail

향후 장소 상세 화면에서는 다음 관계를 확인할 수 있도록 확장합니다.

```text
Place
↓
Scene
↓
Actor
↓
Content
↓
Evidence
```

표시 예정 정보:

```text
장소명
주소
관련 작품
회차
장면 설명
등장 배우
relation type
verification status
verified fact
source
```

---

# AI Docent

장소에 도착했을 때 DB에서 검증된 정보를 기반으로 개인화된 설명을 생성합니다.

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

LLM Input:

```text
작품
배우
Scene
회차
장소
verified_fact
사용자 콘텐츠 취향
```

Prompt에는 다음 제한을 포함할 예정입니다.

```text
제공되지 않은 작품의 사실이나
촬영 정보를 추가하지 마세요.
```

LLM 호출에 실패할 경우 DB에 저장된 기본 설명을 제공하는 Fallback도 추가할 예정입니다.

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
                       ┌──────────┴──────────┐
                       │                     │
                       ▼                     ▼
                   Supabase           Recommendation
                  PostgreSQL               Logic
                                                │
                                     ┌──────────┴──────────┐
                                     │                     │
                                  OpenAI                Kakao Map
                                 (planned)               (planned)
```

별도의 Backend 서버를 두지 않고 **Next.js Route Handler**를 이용해 API를 구성합니다.

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

## Current Recommendation

- DB Candidate Retrieval
- Actor → Scene → Place Filtering
- Haversine Distance
- Walking Time Estimation
- Route Combination
- Walking Constraint Validation
- Duration Validation

## AI - Planned

- OpenAI API
- Structured Output
- Zod Validation

## Map - Planned

- Kakao Maps JavaScript SDK

## Data Processing - Planned

- Python
- Pandas

## Deployment - Planned

- Vercel
- Supabase Production

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

향후:

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

를 추가할 예정입니다.

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

프로젝트 루트에 `.env.local`을 생성합니다.

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

브라우저:

```text
http://localhost:3000
```

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
Actor → Scene → Place Candidate 조회
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
Actor → Scene → Place Candidate Retrieval
↓
PLANNING
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
배우가 등장한 Scene 기반 실제 촬영지 조회
↓
여행 조건 선택
↓
여행 가능한 Course 구성
↓
추천 근거 확인
↓
Kakao Map에서 Course 확인
↓
작품·Scene·배우 관계 확인
↓
AI Docent 생성
```

---

# Development Status

## Core

- [x] 콘텐츠 목록 조회
- [ ] 콘텐츠 이름 검색
- [x] 배우 이름 부분 검색
- [x] 배우 출연 작품 조회
- [x] 작품별 촬영지 조회
- [x] 배우 등장 Scene 기반 촬영지 필터링
- [x] 여행 가능 시간 입력
- [x] 한 구간 최대 도보 시간 입력
- [x] 촬영지 좌표 기반 거리 계산
- [x] 예상 도보 시간 계산
- [x] 여행 시간별 최대 방문 장소 수 적용
- [x] 최대 도보 시간 기반 Course Filter
- [x] 규칙 기반 Course 생성
- [x] Course UI
- [ ] Course 장소 직접 삭제 / 수정
- [ ] Place Detail

---

## Actor / Content / Scene Relation

- [x] Actor 검색
- [x] Actor → Content 조회
- [x] Content → Place 조회
- [x] Actor → Scene 조회
- [x] Scene → Place 조회
- [x] Actor → Content → Scene → Place Candidate 구성
- [ ] Scene 상세 정보 UI
- [ ] Episode 표시
- [ ] Evidence 표시

---

## AI

- [ ] Candidate 기반 Course Recommendation
- [ ] Structured Output
- [ ] Zod Validation
- [ ] Unknown Place ID 차단
- [ ] Recommendation Reason
- [ ] AI Docent
- [ ] AI 실패 Fallback

---

## Map

- [ ] Kakao Map 연동
- [ ] 단일 Marker
- [ ] 다중 Marker
- [ ] 방문 순서 표시
- [ ] Course Path 표시
- [ ] 실제 도보 경로 계산

---

## Data

- [ ] 공공데이터 Raw Import 자동화
- [ ] 콘텐츠 정규화 자동화
- [ ] 장소 정규화 자동화
- [ ] Actor 관계 데이터 확대
- [ ] Scene 관계 데이터 확대
- [ ] Verification 정보 확대
- [ ] ETL 자동화

---

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
- 현재 위치 → 첫 번째 장소 이동 안내
- TTS
- Discovery Spot
- 주변 관광지 자동 보완

---

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

## 1. 작품 출연 여부와 실제 촬영지 관계를 분리

단순히:

```text
Actor
→ Content
→ Place
```

로 추론하지 않습니다.

실제:

```text
Actor
→ Scene
→ Place
```

관계를 이용해 선택 배우가 등장한 촬영지를 구분합니다.

---

## 2. 배우 선택이 Candidate 자체를 변경

배우 선택을 UI 필터나 정렬 조건으로만 사용하지 않습니다.

```text
Actor Selection
↓
scene_actors
↓
Actor Scene
↓
scene_places
↓
Actor Scene Place
↓
Course Candidate
```

즉 배우가 선택되면 **추천 대상 장소 집합 자체가 달라집니다.**

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

을 함께 이용해 실제 여행 가능성을 판단합니다.

---

## 4. DB Candidate 기반 Recommendation Pipeline

현재:

```text
DB Candidate
→ Actor Scene Filter
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
→ Route Validation
→ AI Personalization
→ Schema Validation
→ Candidate Validation
→ Course
```

로 확장할 예정입니다.

---

## 5. AI Hallucination을 구조적으로 제한

향후 AI가 Course를 구성하더라도 Candidate에 존재하지 않는 장소를 추천할 수 없도록 합니다.

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

---

## 6. 추천 근거를 사용자에게 제공

최종적으로:

```text
작품 관계
Scene 관계
배우 등장 여부
검증 상태
추천 이유
```

를 UI에 함께 표시하여 사용자가 **왜 이 장소가 추천됐는지 확인할 수 있는 구조**를 목표로 합니다.

---

## 7. 여행 계획에서 현장 콘텐츠 경험까지 연결

FAVEWAY는 Course 생성에서 끝나지 않습니다.

```text
콘텐츠 / 배우 선택
↓
실제 촬영지 Candidate
↓
Course 생성
↓
지도 이동
↓
장소 도착
↓
Scene / Actor 정보
↓
AI Docent
```

까지 연결하는 것을 목표로 합니다.

---

# 현재 Routing의 한계

현재 Route 계산은 MVP 검증용 규칙 기반 구현입니다.

## 직선거리 기반

실제 도로 경로가 아닌 위·경도 사이의 직선거리를 사용합니다.

---

## 예상 도보 시간

직선거리에 임시 보정값을 적용해 계산합니다.

---

## 체류시간 균등 배분

장소별 권장 체류시간 데이터가 없기 때문에 현재는 이동시간을 제외한 시간을 균등하게 분배합니다.

---

## Course 조합 탐색

현재는 적은 수의 Candidate를 전제로 가능한 방문 순서를 비교합니다.

Candidate 규모가 커질 경우:

```text
Candidate 사전 필터링
지역 Cluster
Heuristic Routing
실제 지도 Route API
```

등으로 개선할 예정입니다.

---

# 배우 관련 촬영지 데이터가 부족한 경우

현재 MVP에서는 정확성을 위해 배우를 선택했을 때 해당 배우가 등장한 Scene과 연결된 Place만 Candidate로 사용합니다.

데이터가 부족하다고 해서 일반 작품 촬영지를 자동으로 섞지 않습니다.

향후에는 사용자가 직접 범위를 확장할 수 있도록 구성할 예정입니다.

예:

```text
공유가 등장한 것으로 확인된 촬영지가 1곳뿐입니다.

[배우 관련 촬영지만 보기]

[도깨비 전체 촬영지까지 확장하기]
```

확장 후에는:

```text
[배우 등장 장면 촬영지]

[작품 관련 촬영지]

[주변 추천]
```

처럼 추천 근거를 구분해 표시합니다.

---

# 프로젝트 핵심 원칙

FAVEWAY의 핵심은 **AI가 얼마나 많은 것을 생성하는가**가 아니라,

> **검증된 콘텐츠 데이터를 실제 여행 가능한 경험으로 얼마나 정확하게 연결하고 개인화하는가**

에 있습니다.

```text
콘텐츠 / 배우 선택
↓
실제 Scene 관계 확인
↓
실제 촬영지 Candidate 조회
↓
여행 가능한 Course 구성
↓
추천 근거 설명
↓
현장에서 콘텐츠 경험
```

새로운 기능을 추가할 때에도 이 핵심 흐름을 강화하는 기능인지 먼저 판단하고, 그렇지 않은 기능은 MVP 이후로 분리합니다.
