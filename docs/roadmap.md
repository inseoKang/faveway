# FAVEWAY Roadmap

FAVEWAY는 영화·드라마·배우를 기준으로 실제 촬영지를 탐색하고,
사용자가 선택한 콘텐츠와 조건을 바탕으로 도보 여행 코스를 구성하는 개인 프로젝트입니다.

현재는 서울 지역의 검증된 촬영지 데이터를 기반으로
콘텐츠 탐색 → 배우 탐색 → 촬영지 조회 → 코스 생성 → 코스 편집 → 지도 경로 확인
흐름을 우선 구현하고 있습니다.

---

# 현재 완료

## Navigation / UX

- [x] HOME
- [x] 코스 만들기 / 촬영지 둘러보기 분리
- [x] 공통 이전 버튼
- [x] 작품 기준 탐색
- [x] 배우 기준 탐색

---

## Content / Actor

- [x] 작품 목록 조회
- [x] 작품 제목 검색
- [x] 배우 부분 검색
- [x] 추천 배우 3명
- [x] 작품 → 배우 조회
- [x] 배우 → 작품 조회
- [x] 복수 배우 선택
- [x] 복수 작품 선택
- [x] 작품 미선택 시 배우 전체 작품 사용

---

## Filming Location

- [x] 작품 전체 촬영지 조회
- [x] 작품 + 배우 촬영지 필터
- [x] 배우 전체 촬영지 조회
- [x] 배우 + 작품 촬영지 필터
- [x] 동일 작품 + 동일 장소 중복 제거
- [x] 촬영지 상세 Dialog
- [x] 장면 정보 표시
- [x] 에피소드 정보 표시
- [x] 관련 배우 표시
- [x] 주소 표시
- [x] 검증 상태 표시
- [x] 출처 표시

### 배우 촬영지 관계

배우 기반 촬영지는 작품에 출연했다는 이유만으로 모든 촬영지를 반환하지 않습니다.

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

- [x] Actor → Scene → Place 관계 기반 조회
- [x] 배우가 실제 연결된 장면의 촬영지만 반환
- [x] 작품 필터와 함께 사용 가능

---

## Course Generation

- [x] 여행 가능 시간 입력
- [x] 최대 도보 시간 입력
- [x] 도보 제한 없음 지원
- [x] 단일 작품 코스 생성
- [x] 복수 작품 코스 생성
- [x] 복수 배우 OR 조건 처리
- [x] Actor → Scene → Place 후보 필터링
- [x] 촬영지 중복 제거
- [x] Haversine 기반 장소 간 거리 계산
- [x] 예상 도보 시간 계산
- [x] 장소 조합 기반 코스 구성
- [x] 전체 여행 시간 검증
- [x] 구간별 최대 도보 시간 검증
- [x] 장소별 체류 시간 계산

### 현재 코스 생성 방식

```text
DB 촬영지 후보
↓
Actor → Scene → Place 필터
↓
후보 장소 정리
↓
Haversine 거리 계산
↓
예상 도보 시간 계산
↓
코스 조합
↓
여행 시간 검증
↓
도보 조건 검증
↓
Course 생성
```

> 촬영지 후보 자체는 반드시 DB에 존재하는 데이터를 사용합니다.  
> AI가 존재하지 않는 촬영지를 임의로 생성하지 않습니다.

---

## Course Editing

- [x] 코스 장소 삭제
- [x] 최소 1개 장소 유지
- [x] 장소 순서 위로 이동
- [x] 장소 순서 아래로 이동
- [x] 순서 변경 후 order 재계산
- [x] 순서 변경 후 거리 재계산
- [x] 순서 변경 후 도보 시간 재계산
- [x] 전체 거리 재계산
- [x] 전체 이동 시간 재계산
- [x] 체류 시간 재계산
- [x] 여행 가능 시간 초과 검증
- [x] 최대 도보 시간 초과 검증
- [x] 조건이 다시 충족되면 경고 자동 해제
- [x] 지도와 코스 편집 상태 동기화

---

## Course Place Addition

- [x] 현재 코스에 추가 가능한 촬영지 조회
- [x] 현재 선택한 작품 / 배우 조건 유지
- [x] 현재 코스에 존재하는 장소 제외
- [x] place_id 기준 후보 중복 제거
- [x] 장소 추가
- [x] 추가 장소를 코스 마지막에 삽입
- [x] 기존 순서 변경 기능으로 위치 조정
- [x] 추가 후 거리 재계산
- [x] 추가 후 도보 시간 재계산
- [x] 추가 후 체류 시간 재계산
- [x] 추가 후 조건 검증
- [x] 추가 후 지도 갱신

---

## Course State Persistence

- [x] 코스 편집 상태 localStorage 저장
- [x] 장소 추가 상태 유지
- [x] 장소 삭제 상태 유지
- [x] 장소 순서 변경 상태 유지
- [x] 새로고침 후 편집 코스 복원
- [x] 코스별 Storage Key 분리
- [x] 변경사항 초기화
- [x] 초기 Course 상태로 복구

현재 코스 편집 결과는 브라우저의 `localStorage`에 저장합니다.

실제 서버 저장 기능을 추가하기 전까지는
브라우저 단위 임시 저장 방식으로 코스 편집 상태를 유지합니다.

---

## Kakao Map

- [x] Kakao Maps JavaScript SDK 연동
- [x] Course 지도 표시
- [x] 촬영지별 번호 Marker
- [x] Course 전체 장소가 보이도록 Bounds 조정
- [x] Marker 클릭 → Course 카드 선택
- [x] Course 카드 클릭 → Marker 선택
- [x] 선택된 장소 시각적 강조
- [x] Course 편집 결과 지도 즉시 반영

---

## 실제 도보 경로

### TMAP 보행자 경로 API

- [x] 실제 보행자 Route API 조사
- [x] TMAP 앱 / 경로안내 상품 설정
- [x] TMAP appKey 서버 환경변수 관리
- [x] Next Route Handler를 통한 TMAP 호출
- [x] 브라우저에 TMAP appKey 노출 방지

### 실제 경로 계산

- [x] 인접 장소 간 실제 보행자 경로 조회
- [x] Course 전체 장소를 한 번의 `/api/routes/walking` 요청으로 전달
- [x] 서버에서 각 인접 구간 순차 처리
- [x] TMAP 실제 거리 반영
- [x] TMAP 실제 이동 시간 반영
- [x] 실제 이동 시간을 Course 검증에 반영
- [x] 실제 이동 거리를 Course Summary에 반영

현재 흐름:

```text
Course Stops
↓
POST /api/routes/walking
↓
서버에서 인접 구간 분리

1 → 2
2 → 3
3 → 4

↓
TMAP 보행자 경로 API
↓
실제 거리 + 실제 시간 + Path
↓
Course 갱신
↓
Kakao Map Polyline 갱신
```

### 지도 경로

- [x] 장소 간 단순 직선 연결 제거
- [x] 실제 보행자 이동 경로 Polyline 표시
- [x] 도로 / 보행로를 따라 경로 표시
- [x] 장소 추가 시 실제 경로 재조회
- [x] 장소 삭제 시 실제 경로 재조회
- [x] 장소 순서 변경 시 실제 경로 재조회
- [x] 코스 초기화 시 실제 경로 재조회
- [x] 새로고침 후 Course 복원 → 실제 경로 재조회

### Fallback

- [x] TMAP 요청 실패 구간 감지
- [x] 실패한 구간만 Haversine 기반 거리 사용
- [x] 실패한 구간만 기존 예상 도보 시간 사용
- [x] 실패 구간을 직선 경로로 표시
- [x] 일부 실패 / 전체 실패 상태 구분
- [x] 외부 Route API 장애가 Course 전체 장애로 이어지지 않도록 처리

> TMAP에서 받은 실제 경로 데이터는 localStorage나 DB에 장기 저장하지 않고,
> Course 화면에서 필요할 때 다시 조회합니다.

---

# 앞으로 할 작업

## 1. 실제 도보 경로 API 추가 최적화

현재 브라우저에서는 Course 단위로 `/api/routes/walking`을 한 번만 호출하지만,
서버에서는 인접 장소 수만큼 TMAP API 요청이 발생합니다.

예:

```text
장소 4개

브라우저
POST /api/routes/walking 1회

서버
1 → 2 TMAP
2 → 3 TMAP
3 → 4 TMAP
```

향후 필요 시 호출량을 추가로 줄입니다.

- [ ] 동일 구간 중복 요청 방지
- [ ] 화면 내 단기 메모리 캐시 검토
- [ ] 순서 변경 시 변경된 구간만 재조회 검토
- [ ] TMAP API 사용량 모니터링
- [ ] API 호출 제한 대응

우선순위는 낮음.

현재 규모에서는 기존 구조로도 충분하며,
실제 호출량 문제가 확인될 때 최적화합니다.

---

## 2. 촬영지 둘러보기 지도

코스를 만들기 전 촬영지들을 지도에서 탐색할 수 있도록 합니다.

- [ ] 촬영지 둘러보기 페이지 지도 추가
- [ ] 조회된 촬영지 Marker 표시
- [ ] Marker 클릭 → 장소 정보 표시
- [ ] 장소 카드 클릭 → 지도 Marker 선택
- [ ] 작품별 촬영지 지도 표시
- [ ] 배우별 촬영지 지도 표시
- [ ] 현재 조회 결과 기준 Bounds 조정
- [ ] 동일 좌표 / 인접 Marker 처리 검토
- [ ] 지도와 촬영지 목록 상태 동기화

목표:

```text
작품 또는 배우 선택
↓
촬영지 조회
↓
목록 + 지도
↓
장소 선택
↓
촬영지 상세 확인
```

---

## 3. 촬영지 상세 정보 고도화

현재 기본 장소 정보와 Scene 정보를 더 풍부하게 확장합니다.

- [ ] 장면 설명 UI 개선
- [ ] Episode 표시 방식 개선
- [ ] 배우 정보 표시 개선
- [ ] 작품 정보 표시 개선
- [ ] verified_fact 활용
- [ ] verification_status 표현 개선
- [ ] source_url UX 개선
- [ ] 촬영 장면과 장소 관계를 더 명확하게 표시
- [ ] 장소 이미지 데이터 검토
- [ ] 장소 이미지 표시

장소 상세에서 사용자가 다음을 이해할 수 있어야 합니다.

```text
왜 이 장소가 추천됐는가?
↓
어떤 작품인가?
↓
어떤 장면인가?
↓
어떤 배우와 관련됐는가?
↓
정보의 근거는 무엇인가?
```

---

## 4. Actor Match Mode

복수 배우 선택 시 현재 OR 방식 외에 추가적인 매칭 방식을 검토합니다.

현재:

```text
공유 OR 김고은
```

→ 공유 또는 김고은과 관계된 장소 모두 후보

추가 검토:

- [ ] ANY Actor
- [ ] ALL Actors
- [ ] 특정 배우 우선순위
- [ ] 배우별 후보 수 표시
- [ ] 배우별 촬영지 부족 시 UX 처리

예:

```text
ANY
공유 OR 김고은

ALL
공유 AND 김고은
```

데이터가 충분하지 않은 경우 잘못된 장소를 만들어내지 않고
후보가 부족하다는 사실을 사용자에게 명확히 보여줍니다.

---

## 5. AI Recommendation

현재 Rule-based Course Recommendation 위에 AI 기반 개인화를 추가합니다.

중요 원칙:

```text
AI
≠
촬영지 생성
```

AI가 새로운 촬영지를 만들어내는 것이 아니라
DB에서 조회된 실제 후보 안에서 추천 이유와 선호도를 계산하는 구조로 사용합니다.

예상 흐름:

```text
Verified DB Candidates
↓
사용자 취향
+
여행 조건
+
작품 / 배우 선호
↓
AI Ranking
↓
Route Algorithm
↓
Course
```

- [ ] 사용자 취향 입력 방식 정의
- [ ] 여행 분위기 입력
- [ ] 추천 입력 데이터 구조 정의
- [ ] AI Ranking 방식 설계
- [ ] 후보 장소 점수화
- [ ] 추천 이유 생성
- [ ] Rule-based 결과와 AI 결과 비교
- [ ] AI 실패 시 Rule-based fallback

---

## 6. AI Docent

DB의 검증된 작품 / 장면 정보를 중심으로 장소별 AI 설명을 생성합니다.

원칙:

```text
DB Fact
+
Scene
+
Place
+
User Preference
↓
LLM
↓
AI Docent
```

AI가 장소나 장면 사실을 임의로 만드는 방식은 사용하지 않습니다.

- [ ] Docent API 설계
- [ ] DB → LLM 입력 구조 정의
- [ ] verified_fact 반영
- [ ] Scene 정보 반영
- [ ] Episode 정보 반영
- [ ] 사용자 취향 반영
- [ ] 한국어 Docent
- [ ] 영어 Docent
- [ ] 한국어 TTS
- [ ] 영어 TTS
- [ ] 잘못된 정보 생성 방지
- [ ] 데이터 부족 시 응답 정책
- [ ] LLM 실패 fallback

---

## 7. User Features

현재 브라우저 localStorage 기반 기능을 실제 사용자 저장 기능으로 확장합니다.

- [ ] 회원가입
- [ ] 로그인
- [ ] 로그아웃
- [ ] 사용자 Profile
- [ ] 사용자 취향 저장
- [ ] 생성한 Course 저장
- [ ] Course 목록
- [ ] 저장된 Course 상세
- [ ] Course 수정사항 서버 저장
- [ ] Course 삭제

이 단계에서 현재 localStorage 기반 Course Persistence를
DB 기반 저장 방식으로 확장합니다.

---

## 8. Data

서비스 기능이 늘어날수록 데이터 품질을 함께 높입니다.

- [ ] 작품 데이터 추가
- [ ] 배우 데이터 추가
- [ ] 촬영지 데이터 추가
- [ ] Scene 데이터 추가
- [ ] scene_actors 데이터 추가
- [ ] scene_places 데이터 추가
- [ ] verified_fact 보강
- [ ] source_url 보강
- [ ] verification_status 정리
- [ ] 폐업 / 이전 장소 확인
- [ ] is_active 관리
- [ ] 좌표 검증
- [ ] 중복 장소 정리
- [ ] 장소 타입 정리

핵심 관계:

```text
Content
↓
Scene
↓
Scene Actor
↓
Scene Place
↓
Place
```

---

## 9. Deployment

- [ ] Production 환경변수 정리
- [ ] Supabase Production 설정 확인
- [ ] Kakao Maps Production Domain 등록
- [ ] TMAP Production 환경 설정 확인
- [ ] API Key 서버 관리 점검
- [ ] Vercel 배포
- [ ] Production API 테스트
- [ ] 모바일 반응형 최종 점검
- [ ] Error / Empty / Loading UI 점검
- [ ] README 최종 업데이트

---

# 이후 확장

## 여행 진행 모드

코스를 만드는 서비스에서 실제 여행 중 사용하는 서비스로 확장합니다.

- [ ] 여행 시작
- [ ] 현재 방문 장소 표시
- [ ] 다음 장소 안내
- [ ] 현재 위치 기반 장소 도착 감지
- [ ] 방문 완료 처리
- [ ] 다음 장소 이동
- [ ] 실제 이동 경로 안내
- [ ] 현장 AI Docent 재생

예상 상태:

```text
PLANNED
↓
IN_PROGRESS
↓
COMPLETED
```

---

## 개인화

- [ ] 선호 작품 저장
- [ ] 선호 배우 저장
- [ ] 방문 장소 이력
- [ ] 저장한 Course 분석
- [ ] 추천 피드백
- [ ] 사용자 행동 기반 추천 보정
- [ ] 개인화 Course Ranking

---

# 현재 개발 우선순위

```text
1. 실제 도보 경로 API 추가 최적화
   ↓
2. 촬영지 둘러보기 지도
   ↓
3. 촬영지 상세 정보 고도화
   ↓
4. Actor Match Mode
   ↓
5. AI Recommendation
   ↓
6. AI Docent
   ↓
7. User Features
   ↓
8. Data 확장
   ↓
9. Deployment
```

단, 실제 도보 경로 API의 추가 최적화는
현재 호출량에서 문제가 없다면 뒤로 미루고
`촬영지 둘러보기 지도` 작업을 먼저 진행할 수 있습니다.

---

# 현재 핵심 사용자 흐름

```text
HOME
↓
코스 만들기
↓
작품 / 배우 탐색
↓
작품 / 배우 선택
↓
여행 조건 입력
↓
DB 촬영지 후보 조회
↓
Actor → Scene → Place 검증
↓
Course 생성
↓
실제 TMAP 도보 경로 조회
↓
Kakao Map에 실제 경로 표시
↓
Course 확인
↓
장소 추가 / 삭제 / 순서 변경
↓
실제 경로 재계산
↓
Course 상태 localStorage 유지
```

---

# 핵심 원칙

## 1. 촬영지는 AI가 생성하지 않는다

촬영지는 반드시 DB에 존재하는 실제 데이터를 사용합니다.

## 2. 배우와 촬영지는 Scene을 통해 연결한다

```text
Actor
→ Scene
→ Place
```

배우가 작품에 출연했다는 이유만으로 해당 작품의 모든 촬영지를
배우 관련 장소로 취급하지 않습니다.

## 3. 검증된 정보를 추천 근거로 사용한다

장소, 작품, 장면, 배우 관계의 근거가 사용자에게 보이도록 합니다.

## 4. AI는 DB 데이터를 확장 설명하고 순위를 개인화한다

AI가 사실 데이터를 대신하는 구조가 아니라
검증된 데이터를 기반으로 추천과 설명을 개선하는 방향으로 사용합니다.

## 5. Route API 실패가 서비스 전체 실패로 이어지지 않게 한다

TMAP 실제 보행자 경로 조회가 실패할 경우
기존 Haversine 거리 및 예상 도보 시간 계산을 fallback으로 사용합니다.
