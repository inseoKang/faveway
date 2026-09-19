# FAVEWAY Roadmap

FAVEWAY는 영화·드라마·배우를 기준으로 실제 촬영지를 탐색하고,
사용자가 선택한 콘텐츠와 조건을 바탕으로
서울 도보 여행 코스를 구성하는 개인 프로젝트입니다.

현재 핵심 흐름:

```text
콘텐츠 / 배우 탐색
↓
촬영지 조회
↓
여행 조건 입력
↓
Course 생성
↓
실제 도보 경로 조회
↓
Course 편집
↓
지도 / Summary 갱신
```

---

# 현재 완료

## Navigation / UX

- [x] HOME
- [x] 코스 만들기 / 촬영지 둘러보기 분리
- [x] 공통 이전 버튼
- [x] 공통 PageHeader
- [x] 작품 기준 탐색
- [x] 배우 기준 탐색

---

## UI / Design System

- [x] FAVEWAY 공통 디자인 스타일 정리
- [x] 공통 색상 / 여백 / 버튼 / 카드 스타일 정리
- [x] 공통 BackButton
- [x] 공통 PageHeader
- [x] Home 디자인 정리
- [x] Explore 디자인 정리
- [x] Plan 디자인 정리
- [x] Planning 디자인 정리
- [x] Course 디자인 정리
- [x] PlaceDetailDialog UI 개선
- [x] CourseMap / ExploreMap UI 통일
- [x] 모바일 Course chip 레이아웃 수정
- [x] 좁은 화면 버튼 줄바꿈 문제 수정

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
- [x] Scene 설명 표시
- [x] Episode 표시
- [x] Scene 등장 배우 표시
- [x] 주소 표시
- [x] verified_fact 표시
- [x] verification_status 표시
- [x] source_type 표시
- [x] source_url 표시
- [x] verified_at 표시
- [x] Kakao Map 위치 링크
- [x] 좌표가 없는 경우 주소 검색 fallback
- [x] 정보 없음 Empty 처리
- [x] 상세 API Retry

---

## Actor → Scene → Place

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

- [x] 배우 실제 등장 Scene 기반 조회
- [x] 작품 출연 관계만으로 모든 장소를 반환하지 않음
- [x] 작품 필터와 함께 사용 가능

---

## Explore Map

- [x] Kakao Map 표시
- [x] 촬영지 Marker
- [x] Marker → 장소 카드 선택
- [x] 장소 카드 → Marker 선택
- [x] 작품 기준 지도
- [x] 배우 기준 지도
- [x] Bounds 조정
- [x] 지도 / 목록 상태 동기화

---

## Course Generation

- [x] 여행 가능 시간 입력
- [x] 최대 도보 시간 입력
- [x] 도보 제한 없음
- [x] 단일 작품 Course
- [x] 복수 작품 Course
- [x] 복수 배우 OR 조건
- [x] Actor → Scene → Place 후보 필터
- [x] 활성 장소 필터
- [x] 좌표 검증
- [x] 중복 제거
- [x] Route Combination
- [x] Haversine 초기 거리 계산
- [x] 예상 도보 시간 계산
- [x] 전체 여행 시간 검증
- [x] 구간별 최대 도보 시간 검증
- [x] 체류 시간 계산
- [x] 거리 최소 Route 선택

현재 최대 장소 수:

```text
3시간 → 2곳
4시간 → 3곳
5시간 → 4곳
```

---

## Course Editing

- [x] 장소 삭제
- [x] 최소 1개 장소 유지
- [x] 장소 추가
- [x] 순서 위로 이동
- [x] 순서 아래로 이동
- [x] order 재계산
- [x] 거리 재계산
- [x] 도보 시간 재계산
- [x] 체류 시간 재계산
- [x] 전체 거리 갱신
- [x] 전체 이동 시간 갱신
- [x] 여행 가능 시간 검증
- [x] 최대 도보 시간 검증
- [x] 조건 충족 시 경고 자동 해제
- [x] 지도와 편집 상태 동기화

---

## Course Place Addition

- [x] 추가 가능한 촬영지 조회
- [x] 현재 작품 조건 유지
- [x] 현재 배우 조건 유지
- [x] 현재 Course 장소 제외
- [x] place_id 중복 제거
- [x] 비활성 장소 제외
- [x] 좌표 없는 후보 제외
- [x] Course 마지막에 추가
- [x] 추가 후 Route 재계산
- [x] 추가 후 Summary 갱신
- [x] 추가 후 지도 갱신

---

## Course State Persistence

- [x] localStorage 저장
- [x] 장소 추가 상태 유지
- [x] 장소 삭제 상태 유지
- [x] 장소 순서 유지
- [x] 새로고침 후 복원
- [x] Course별 Storage Key
- [x] 변경사항 초기화
- [x] 초기 Course 복원
- [x] TMAP Route 데이터는 저장하지 않음
- [x] 복원 후 실제 Route 재조회
- [x] localStorage 복원 실패 Warning
- [x] localStorage 저장 실패 Warning

---

## Kakao Map

- [x] Kakao Maps JavaScript SDK
- [x] Course 지도
- [x] Explore 지도
- [x] 번호 Marker
- [x] Bounds
- [x] Marker / Card 선택 동기화
- [x] 선택 장소 강조
- [x] Course 편집 결과 지도 반영
- [x] 지도 로딩 상태
- [x] 지도 Error 상태
- [x] 지도 실패 시 목록 유지

---

## TMAP Actual Walking Route

- [x] TMAP Pedestrian API
- [x] appKey 서버 환경변수
- [x] Route Handler 경유
- [x] Client appKey 노출 방지
- [x] Course 전체 Stops 1회 요청
- [x] 서버 인접 구간 분리
- [x] 실제 거리
- [x] 실제 이동 시간
- [x] 실제 Path
- [x] Course Summary 반영
- [x] Kakao Polyline 반영
- [x] 장소 추가 후 재조회
- [x] 장소 삭제 후 재조회
- [x] 순서 변경 후 재조회
- [x] 초기화 후 재조회
- [x] localStorage 복원 후 재조회

---

## TMAP Fallback

- [x] 실패 구간 감지
- [x] 실패 구간만 Haversine
- [x] 실패 구간 예상 도보 시간
- [x] 실패 구간 직선 Polyline
- [x] 일부 실패 상태 구분
- [x] 전체 실패 상태 구분
- [x] Course 전체 장애 방지
- [x] 좌표 없는 구간만 개별 실패 처리
- [x] 정상 구간 TMAP 조회 유지
- [x] fallback 값을 Summary에 반영

---

## Loading / Empty / Error / Retry

### 공통

- [x] StateFeedback
- [x] InlineWarning
- [x] Loading 기준
- [x] Empty 기준
- [x] Error 기준
- [x] Retry 상태
- [x] Blocking / Non-blocking 구분
- [x] Partial Failure UI

### Explore

- [x] 기본 데이터 오류
- [x] 배우 검색 오류
- [x] 배우 검색 결과 없음
- [x] 촬영지 loading
- [x] 촬영지 error
- [x] 촬영지 Retry
- [x] 촬영지 empty

### ExploreMap

- [x] SDK Loading
- [x] SDK Error
- [x] 좌표 없음
- [x] 지도 실패 시 목록 유지

### CourseMap

- [x] SDK Loading
- [x] SDK Error
- [x] 지도 실패 시 Course 유지

### Course

- [x] 초기 Loading
- [x] Course 정보 없음
- [x] 잘못된 Course 데이터
- [x] 후보 촬영지 Loading
- [x] 후보 촬영지 Error
- [x] 후보 촬영지 Empty
- [x] 후보 Retry
- [x] TMAP route loading
- [x] TMAP partial fallback
- [x] TMAP full fallback
- [x] invalid Course 처리
- [x] localStorage 복원 실패
- [x] localStorage 저장 실패

### Planning

- [ ] 초기 작품 / 배우 Loading 정리
- [ ] 초기 데이터 Error
- [ ] 후보 데이터 Empty
- [ ] Trip 생성 Loading
- [ ] Trip 생성 Error
- [ ] 조건에 맞는 Course 없음
- [ ] Retry
- [ ] 중복 요청 방지 최종 점검
- [ ] 버튼 disabled 조건 최종 점검

---

# 앞으로 할 작업

## 1. Planning 상태 처리 마무리

현재 상태 처리 작업 중 남은 주요 화면입니다.

- [ ] 작품 / 배우 초기 데이터 상태 정리
- [ ] API 오류 처리
- [ ] Trip 생성 중 상태
- [ ] Trip 생성 실패
- [ ] 조건에 맞는 Course 없음
- [ ] Retry
- [ ] 중복 요청 차단
- [ ] disabled 조건 검증

---

## 2. 촬영지 상세 UX 고도화

기본 데이터 표시는 이미 구현되어 있습니다.

남은 작업:

- [ ] Scene / Episode 표현 방식 개선
- [ ] Actor → Scene → Place 관계를 더 직관적으로 표시
- [ ] Verification UI 개선
- [ ] Source UX 개선
- [ ] 장소 이미지 데이터 검토
- [ ] 장소 이미지 표시

---

## 3. 데이터 부족 시 Fallback 정책

촬영지 데이터가 부족하다고 해서
AI가 장소를 생성하지 않습니다.

검토:

- [ ] Course 최소 장소 수 정책
- [ ] 배우 기준 후보 부족 UX
- [ ] 작품 범위 확장 UX
- [ ] 일반 장소 추천 여부 결정
- [ ] 일반 장소와 촬영지 UI 구분
- [ ] 추천 근거 표시

---

## 4. Data 확장 및 정제

현재 도깨비 데이터를 기준으로
핵심 데이터 구조를 검증했습니다.

완료:

- [x] Content
- [x] Actor
- [x] Scene
- [x] Place
- [x] scene_actors
- [x] scene_places
- [x] Content ↔ Place 관계 검증
- [x] 도깨비 데이터 정리

다음:

- [ ] 데이터 소스별 신뢰도 기준
- [ ] Scene 없는 촬영지 저장 정책
- [ ] 동일 장소 병합 기준
- [ ] source 관리 기준
- [ ] Import CSV 포맷 고정
- [ ] 여신강림 데이터
- [ ] 추가 작품 2~3개

---

## 5. AI Docent

우선순위가 높은 신규 핵심 기능입니다.

```text
DB Fact
+
Scene
+
Place
+
Actor
+
User Preference
↓
LLM
↓
Docent
```

- [ ] Docent API
- [ ] DB → LLM 입력 구조
- [ ] verified_fact
- [ ] Scene
- [ ] Episode
- [ ] 사용자 취향
- [ ] 한국어
- [ ] 영어
- [ ] 한국어 TTS
- [ ] 영어 TTS
- [ ] 정보 부족 정책
- [ ] LLM 실패 fallback

---

## 6. AI Recommendation

현재 Rule-based Recommendation 위에
개인화 Ranking을 추가합니다.

- [ ] 사용자 취향 입력
- [ ] 여행 분위기
- [ ] AI Ranking
- [ ] Candidate 점수
- [ ] 추천 이유
- [ ] Candidate ID Validation
- [ ] Rule-based fallback

---

## 7. Deployment

- [ ] Production 환경변수
- [ ] Supabase Production 설정
- [ ] Kakao Production Domain
- [ ] TMAP Production 설정
- [ ] API Key 점검
- [ ] Vercel 배포
- [ ] Production API Test
- [ ] 모바일 최종 테스트
- [ ] 상태 UI 최종 점검
- [ ] README 최종 업데이트

---

## 8. User Features

핵심 MVP 이후 확장합니다.

- [ ] 회원가입
- [ ] 로그인
- [ ] 로그아웃
- [ ] Profile
- [ ] 사용자 취향 저장
- [ ] Course 서버 저장
- [ ] 저장 Course 목록
- [ ] Course 상세
- [ ] Course 삭제

현재 단계에서는 localStorage를 유지합니다.

---

# 후속 최적화

## TMAP Route 최적화

현재:

```text
Client
POST /api/routes/walking 1회

Server
장소 수 - 1 만큼 TMAP 호출
```

실제 사용량 문제가 발생하면:

- [ ] 동일 구간 캐시
- [ ] 변경된 구간만 재조회
- [ ] 단기 메모리 캐시
- [ ] 호출량 모니터링
- [ ] Rate Limit 대응

을 검토합니다.

현재 우선순위는 낮습니다.

---

# 이후 확장

## 여행 진행 모드

- [ ] 여행 시작
- [ ] 현재 장소
- [ ] 다음 장소
- [ ] 위치 기반 도착 감지
- [ ] 방문 완료
- [ ] 다음 장소 이동
- [ ] 현장 AI Docent

예상 상태:

```text
PLANNED
↓
IN_PROGRESS
↓
COMPLETED
```

---

# 현재 개발 우선순위

```text
1. Planning 상태 처리 마무리
↓
2. 촬영지 상세 UX 보완
↓
3. 데이터 부족 Fallback 정책
↓
4. Data 확장 및 정제
↓
5. AI Docent
↓
6. AI Recommendation
↓
7. Deployment
↓
8. User Features
```

---

# 핵심 원칙

## 1. 촬영지는 AI가 생성하지 않는다

DB에 존재하는 실제 장소만 사용합니다.

## 2. 배우와 촬영지는 Scene을 통해 연결한다

```text
Actor
→ Scene
→ Place
```

## 3. 검증된 정보를 추천 근거로 사용한다

## 4. AI는 설명과 개인화에 사용한다

## 5. TMAP 실패가 Course 전체 실패가 되지 않게 한다

## 6. 저장 상태와 재계산 상태를 구분한다

## 7. 데이터가 없으면 없는 상태를 그대로 보여준다