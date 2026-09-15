# FAVEWAY

> 좋아하는 작품과 배우의 실제 촬영지를 따라 나만의 서울 여행 코스를 만들어주는 AI 콘텐츠 여행 서비스

FAVEWAY는 사용자가 좋아하는 **드라마·영화·배우**를 선택하면, 검증된 콘텐츠 촬영지 데이터를 기반으로 실제 방문 가능한 여행 코스를 생성하고 각 장소에서 작품과 장면에 대한 **AI 도슨트**를 제공하는 콘텐츠 여행 서비스입니다.

일반적인 AI 여행 추천처럼 LLM이 장소를 직접 만들어내는 방식이 아니라, **데이터베이스에서 실제 촬영지 후보를 먼저 조회한 뒤 AI가 후보 안에서 선택·정렬·개인화**하도록 설계했습니다.

---

## 서비스 소개

좋아하는 드라마나 영화의 촬영지를 직접 찾아 여행하려면 여러 검색 결과를 비교하고, 장소를 정리하고, 다시 이동 동선을 구성해야 합니다.

특히 특정 배우를 중심으로 여행하고 싶을 경우에는 단순히 해당 배우의 출연작 촬영지라는 이유만으로 실제 배우와 관련 없는 장소까지 섞일 수 있습니다.

FAVEWAY는 이러한 문제를 해결하기 위해 다음 흐름을 하나의 서비스로 연결합니다.

```text
콘텐츠 탐색
→ 작품 / 배우 선택
→ 여행 조건 입력
→ 관련 촬영지 조회
→ AI 여행 코스 생성
→ 지도에서 코스 확인
→ 장소 상세 확인
→ AI 도슨트
```

현재 MVP는 **서울 지역의 드라마·영화·배우 기반 콘텐츠 여행**에 집중합니다.

---

## 해결하려는 문제

### 1. 촬영지를 직접 찾아야 하는 문제

좋아하는 콘텐츠의 실제 촬영지를 방문하려면 사용자가 여러 사이트에서 장소 정보를 직접 검색해야 합니다.

### 2. 장소를 여행 동선으로 다시 구성해야 하는 문제

촬영지 목록을 찾더라도 제한된 여행 시간 안에서 방문할 순서와 동선을 다시 계획해야 합니다.

### 3. 작품·배우·장소의 관계가 불명확한 문제

특정 배우의 출연 작품에 등장한 촬영지라고 해서 모든 장소가 해당 배우의 장면과 직접 연결되는 것은 아닙니다.

### 4. AI 추천의 신뢰성 문제

LLM이 장소나 촬영 정보를 직접 생성하면 실제 존재하지 않거나 검증되지 않은 정보를 사실처럼 제공할 수 있습니다.

---

## FAVEWAY의 해결 방식

FAVEWAY에서는 역할을 다음과 같이 분리했습니다.

```text
DB        = 사실과 관계
Backend   = 데이터와 서비스 흐름
AI        = 선택·정렬·설명·개인화
Frontend  = 사용자 경험
```

AI에게 촬영지 자체를 생성하도록 하지 않습니다.

```text
User
  +
Database Candidate
  ↓
Filtering
  ↓
LLM Ranking
  ↓
Course
```

먼저 DB에서 실제 콘텐츠와 연결된 장소를 조회하고, 지역·활성 상태·콘텐츠 관계 등을 검증한 뒤 AI가 최종 코스를 구성합니다.

---

## 핵심 기능

### 콘텐츠 탐색

- 드라마 / 영화 탐색
- 작품명 일부 검색
- 배우 이름 일부 검색
- 배우 선택 시 출연 작품 조회

### 여행 조건 설정

- 여행 분위기 선택
- 여행 가능 시간 설정
- 선택 콘텐츠와 배우 정보 반영

### 촬영지 Candidate 조회

선택한 작품과 연결된 장소를 DB에서 조회합니다.

```text
서울
AND
is_active = true
AND
작품 관계 존재
```

배우가 함께 선택된 경우 배우와 직접 연결된 장소를 우선합니다.

### AI 여행 코스 생성

DB에서 조회한 Candidate를 기반으로 AI가 다음 내용을 생성합니다.

- 방문 장소
- 방문 순서
- 예상 체류 시간
- 장소별 추천 이유

AI가 Candidate에 존재하지 않는 장소를 반환하면 유효하지 않은 응답으로 처리합니다.

### 추천 근거 제공

각 장소에는 단순 추천 결과뿐 아니라 **왜 추천됐는지**를 함께 제공합니다.

예:

```text
선택한 배우가 등장한 장면의 실제 촬영 장소이며
감성적인 여행 분위기와 잘 맞는 장소입니다.
```

### 코스 지도

생성된 코스를 Kakao Map에 표시합니다.

- 다중 Marker
- 방문 순서 표시
- 장소 선택
- 장소 상세 연결

### 장소 상세

장소마다 다음 관계를 확인할 수 있습니다.

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

표시 정보:

- 장소명
- 주소
- 관련 작품
- 회차
- 장면 설명
- 관련 배우
- 데이터 검증 상태
- 출처

### AI Docent

장소에 도착했을 때 작품과 장면 정보를 바탕으로 개인화된 설명을 생성합니다.

AI Docent에는 DB에서 확인된 정보만 전달합니다.

```text
작품
배우
회차
장면
장소
verified_fact
사용자 취향
여행 분위기
```

LLM 호출에 실패할 경우 DB에 저장된 기본 설명을 제공합니다.

---

## 데이터 신뢰성

FAVEWAY에서는 모든 장소 데이터를 동일하게 취급하지 않습니다.

### `PUBLIC_DATA`

공공기관 데이터에서 작품과 장소 관계를 확인한 데이터입니다.

### `FAVEWAY_VERIFIED`

공식 자료나 신뢰 가능한 출처를 추가로 확인하여 장면·배우 관계까지 직접 검증한 데이터입니다.

### `DISCOVERY`

콘텐츠 촬영지는 아니지만 여행 분위기나 이동 경로를 고려해 보완하는 일반 장소입니다.

> 현재 MVP에서는 검증된 콘텐츠 촬영지를 우선하며 Discovery 기능은 이후 버전에서 확장할 예정입니다.

---

## 데이터 소스

### Primary Data

**한국문화정보원 미디어콘텐츠 영상 촬영지 데이터**

주요 활용 정보:

- 작품명
- 장소명
- 주소
- 위도 / 경도
- 장소 설명
- 미디어 유형

### Secondary Data

- 한국영상자료원 KMDb
- Wikidata
- 한국관광공사 TourAPI
- 방송사 공식 콘텐츠
- 기사
- 지자체 관광 페이지

공공데이터로 부족한 배우·작품 관계 및 최신 콘텐츠 정보는 추가 검증 후 별도 저장합니다.

---

## 핵심 데이터 모델

FAVEWAY에서 가장 중요한 관계는 다음과 같습니다.

```text
Actor
  ↓
Content
  ↓
Scene
  ↓
Place
```

사용자는 배우나 작품을 기준으로 여행을 시작하지만, 최종적으로 추천되는 Entity는 `Place`입니다.

주요 테이블:

```text
contents
actors
content_actors
places
scenes
scene_actors
scene_places
place_relations
trips
trip_stops
```

추천 및 검증 로직에서는 `place_relations`를 중심으로 작품·배우·장면·장소의 관계를 관리합니다.

---

## AI Recommendation Pipeline

FAVEWAY의 AI는 장소 검색 엔진이 아니라 **검증된 Candidate의 추천 및 개인화 계층**으로 사용합니다.

### 1. Candidate Retrieval

예를 들어 사용자가 다음과 같이 선택한 경우:

```text
Actor   : 공유
Content : 도깨비
```

DB에서는 다음 조건으로 Candidate를 조회합니다.

```text
도깨비와 연결된 장소
+
공유 relation이 있는 장소 우선
+
서울 지역
+
is_active = true
```

### 2. LLM Input

```json
{
  "preference": {
    "content": "도깨비",
    "actor": "공유",
    "mood": "감성"
  },
  "durationMinutes": 240,
  "candidates": [
    {
      "id": "P01",
      "name": "운현궁 양관",
      "relation": "SCENE_ACTOR",
      "scene": "...",
      "latitude": 37.0,
      "longitude": 127.0
    }
  ]
}
```

### 3. Structured Output

AI 응답은 자유 텍스트가 아닌 Structured JSON으로 제한합니다.

```json
{
  "stops": [
    {
      "placeId": "P01",
      "order": 1,
      "stayMinutes": 45,
      "reason": "..."
    }
  ]
}
```

### 4. Validation

`Zod`를 이용해 AI 응답 형태를 검증하고, 반환된 `placeId`가 실제 Candidate에 포함되어 있는지도 다시 확인합니다.

```text
LLM Output
↓
Schema Validation
↓
Candidate ID Validation
↓
Valid Course
```

이를 통해 AI가 존재하지 않는 장소를 임의로 추천하는 문제를 방지합니다.

---

## AI Docent Pipeline

```text
Verified DB Data
+
User Preference
+
Travel Mood
↓
Prompt
↓
LLM
↓
Personalized Docent
```

Prompt에는 다음 규칙을 포함합니다.

```text
제공하지 않은 작품의 사실이나
촬영 정보를 추가하지 마세요.
```

AI가 새로운 촬영 사실을 만드는 것이 아니라, 검증된 데이터를 사용자의 관심사에 맞게 설명하는 역할만 담당합니다.

---

## 시스템 아키텍처

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
                 ┌────────────────┼────────────────┐
                 │                │                │
                 ▼                ▼                ▼
              Supabase        OpenAI API       Kakao Map
            PostgreSQL
                 │
                 ▼
            FAVEWAY Data
```

개인 프로젝트의 개발 복잡도를 줄이기 위해 별도의 Backend 서버를 분리하지 않고 **Next.js Route Handler**를 이용해 API를 구성했습니다.

---

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Next.js Route Handler
- REST API

### Database

- Supabase
- PostgreSQL
- Prisma

### AI

- OpenAI API
- Structured Output
- Zod Validation

### Map

- Kakao Maps JavaScript SDK

### Data Processing

- Python
- Pandas

### Deployment

- Vercel
- Supabase

---

## 주요 API

```text
GET    /api/contents
GET    /api/contents/search?q=
GET    /api/actors/search?q=
GET    /api/actors/:actorId/contents
GET    /api/contents/:contentId/places

POST   /api/trips
GET    /api/trips/:tripId

POST   /api/docent
```

### `POST /api/trips`

여행 코스를 생성하는 핵심 API입니다.

```text
1. DB Candidate 조회
2. 서울 지역 필터링
3. Active 장소 필터링
4. Actor Relation 우선 적용
5. AI Input 생성
6. AI Course 생성
7. Structured Output 검증
8. Candidate ID 검증
9. Trip 저장
10. 결과 반환
```

---

## Data Pipeline

공공데이터 원본은 직접 수정하지 않고 별도로 관리합니다.

```text
Raw Public Data
↓
Normalization
↓
Entity Extraction
↓
Relation Mapping
↓
Database Insert
↓
Candidate Retrieval
↓
Recommendation
```

폴더 구조:

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

ETL 과정은 Python과 Pandas를 사용해 자동화합니다.

---

## Project Structure

```text
faveway/
│
├── app/
│   ├── page.tsx
│   │
│   ├── explore/
│   ├── planning/
│   ├── course/
│   ├── place/
│   ├── guide/
│   │
│   └── api/
│       ├── contents/
│       ├── actors/
│       ├── trips/
│       └── docent/
│
├── components/
│   ├── common/
│   ├── content/
│   ├── planning/
│   ├── course/
│   ├── map/
│   └── guide/
│
├── lib/
│   ├── db/
│   ├── openai/
│   ├── kakao/
│   └── recommendation/
│
├── types/
├── data/
├── scripts/
│
└── prisma/
    └── schema.prisma
```

---

## Getting Started

### 1. Repository Clone

```bash
git clone https://github.com/inseoKang/faveway.git
cd faveway
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

프로젝트 루트에 `.env.local` 파일을 생성합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

DATABASE_URL=

OPENAI_API_KEY=

NEXT_PUBLIC_KAKAO_MAP_KEY=
```

> API Key 및 환경 변수 파일은 GitHub에 업로드하지 않습니다.

### 4. Run Development Server

```bash
npm run dev
```

브라우저에서 다음 주소로 접속합니다.

```text
http://localhost:3000
```

---

## MVP User Flow

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
AI Course
↓
COURSE
↓
MAP
↓
PLACE
↓
DOCENT
```

MVP 완료 기준은 다음 시나리오가 실제 배포 환경에서 동작하는 것입니다.

```text
드라마 또는 배우 선택
↓
관련 작품 선택
↓
여행 분위기와 시간 선택
↓
DB에서 실제 촬영지 조회
↓
Candidate 안에서 AI가 코스 구성
↓
추천 근거 확인
↓
Kakao Map에서 코스 확인
↓
장소의 작품·장면·배우 관계 확인
↓
AI Docent 생성
```

---

## Development Status

> 실제 구현 상황에 맞게 아래 체크박스를 업데이트합니다.

### Core

- [ ] 콘텐츠 목록 조회
- [ ] 콘텐츠 검색
- [ ] 배우 검색
- [ ] 배우 출연 작품 조회
- [ ] 작품별 촬영지 조회
- [ ] 여행 조건 입력
- [ ] Course 생성
- [ ] Course UI
- [ ] 장소 삭제

### AI

- [ ] Candidate 기반 Course Recommendation
- [ ] Structured Output
- [ ] Zod Validation
- [ ] Unknown Place ID 차단
- [ ] Recommendation Reason
- [ ] AI Docent
- [ ] AI 실패 Fallback

### Map

- [ ] Kakao Map 연동
- [ ] 단일 Marker
- [ ] 다중 Marker
- [ ] 방문 순서 표시

### Data

- [ ] 공공데이터 Raw Import
- [ ] 콘텐츠 정규화
- [ ] 장소 정규화
- [ ] 관계 데이터 구성
- [ ] Verification 정보 저장
- [ ] ETL 자동화

### Deployment

- [ ] Vercel 배포
- [ ] Supabase Production 연결
- [ ] Production Environment Variables 설정

---

## MVP 이후 확장

### Version 2

- 회원가입 / 로그인
- 여행 코스 저장
- 여행 기록
- 실시간 GPS
- TTS
- Discovery Spot
- 관광지 자동 보완

### Version 3

- 아티스트 기반 여행
- 팬 장소
- 최신 작품 자동 확장
- 사용자 장소 제보
- 검증 / 신고 시스템
- 영어 지원
- 전국 지역 확장

---

## Technical Highlights

### 1. 공공데이터를 서비스용 관계형 데이터로 구조화

단순 CSV 조회가 아니라 작품·장면·배우·장소 관계를 분리해 관계형 DB로 모델링합니다.

```text
Raw CSV
→ Normalize
→ Relational Database
```

### 2. DB Candidate 기반 AI Recommendation

LLM에게 여행 장소 생성을 맡기지 않고 DB에서 검증된 Candidate를 조회한 뒤 AI가 선택과 정렬만 담당하도록 구성합니다.

```text
DB Candidate
→ Filter
→ AI Ranking
→ Validation
→ Course
```

### 3. Structured Output을 이용한 Hallucination 방어

LLM 결과를 Zod Schema로 검증하고 Candidate에 존재하지 않는 `placeId`는 거부합니다.

### 4. 추천 결과의 근거를 사용자에게 제공

결과만 보여주는 추천이 아니라 작품·배우·장면 관계와 데이터 검증 상태를 UI에 함께 노출합니다.

### 5. 데이터 신뢰도를 서비스 구조에 포함

`PUBLIC_DATA`, `FAVEWAY_VERIFIED`, `DISCOVERY` 등급을 이용해 정보의 출처와 신뢰 수준을 구분합니다.

### 6. 여행 계획에서 현장 콘텐츠 경험까지 연결

콘텐츠 선택에서 코스 생성으로 끝나지 않고 지도, 장소 상세, AI Docent까지 하나의 사용자 흐름으로 연결합니다.

---

## 프로젝트 핵심 원칙

FAVEWAY의 핵심은 **AI가 얼마나 많은 것을 생성하는가**가 아니라, **검증된 데이터를 AI가 얼마나 적절하게 개인화하는가**에 있습니다.

```text
콘텐츠 선택
→ 실제 장소 검색
→ 여행 가능한 코스 구성
→ 추천 근거 설명
→ 현장에서 콘텐츠 경험
```

새로운 기능을 추가할 때에도 이 핵심 흐름을 강화하는 기능인지 먼저 판단하고, 그렇지 않은 기능은 MVP 이후로 분리합니다.
