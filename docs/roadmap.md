# FAVEWAY Roadmap

최종 업데이트: 2026-10-07.

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
↓
AI Docent UX
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

## Course Generation

- [x] 여행 가능 시간 입력
- [x] 최대 도보 시간 입력
- [x] 도보 제한 없음
- [x] 복수 작품 Course
- [x] 복수 배우 OR 조건
- [x] Actor → Scene → Place 후보 필터
- [x] 활성 장소 필터
- [x] 서울 지역 촬영지 필터
- [x] 비활성 장소 Course 후보 제외
- [x] 좌표 검증
- [x] 중복 제거
- [x] Route Combination
- [x] Haversine 초기 거리 계산
- [x] 예상 도보 시간 계산
- [x] 전체 여행 시간 검증
- [x] 구간별 최대 도보 시간 검증
- [x] 체류 시간 계산
- [x] 거리 최소 Route 선택
- [x] 1개 장소 Course 허용
- [x] Course 선택 이유 metadata 반환

---

## Course Editing

- [x] 장소 삭제
- [x] 최소 1개 장소 유지
- [x] 장소 추가
- [x] 장소 추가 후보 서울 지역 필터
- [x] 순서 위로 이동
- [x] 순서 아래로 이동
- [x] 거리 / 도보 / 체류 시간 재계산
- [x] Summary 갱신
- [x] 지도와 편집 상태 동기화

---

## Course State Persistence

- [x] localStorage 저장
- [x] 장소 추가 / 삭제 / 순서 유지
- [x] 새로고침 후 복원
- [x] 변경사항 초기화
- [x] TMAP Route 데이터는 저장하지 않음
- [x] 복원 후 Route 재조회
- [x] 저장 / 복원 실패 Warning

---

## TMAP Actual Walking Route

- [x] TMAP Pedestrian API
- [x] appKey 서버 환경변수
- [x] Route Handler 경유
- [x] Course 전체 Stops 1회 요청
- [x] 서버 인접 구간 분리
- [x] 실제 거리 / 이동 시간 / Path
- [x] Course Summary 반영
- [x] Kakao Polyline 반영
- [x] 편집 후 재조회

---

## TMAP Fallback

- [x] 실패 구간 감지
- [x] 실패 구간만 Haversine
- [x] Partial / Full fallback 구분
- [x] Course 전체 장애 방지
- [x] 좌표 없는 구간만 개별 실패 처리

---

## Loading / Empty / Error / Retry

- [x] 공통 StateFeedback
- [x] InlineWarning
- [x] Explore 상태 처리
- [x] ExploreMap 상태 처리
- [x] CourseMap 상태 처리
- [x] Course 상태 처리
- [x] Planning 상태 처리
- [x] Retry
- [x] Blocking / Non-blocking 구분
- [x] Partial Failure UI

---

## Data Fallback UX

- [x] 촬영지 0개 → Empty
- [x] 촬영지 1개 → 1개 장소 Course
- [x] 좌표 없는 장소 → Course 제외
- [x] Scene 없는 장소 → 추측 금지
- [x] Actor → Scene → Place 관계 엄격 적용
- [x] 일반 관광지 자동 추가 금지
- [x] 자동 범위 확장 금지
- [x] 1개 장소 Course 이유 안내
- [x] 사용자 선택 기반 배우 조건 제거
- [x] 서울 외 촬영지 DB 유지 + Course 제외
- [x] 폐점 촬영지 기록 유지 + Course 제외

---

## AI Docent Foundation

- [x] OpenAI SDK 설치
- [x] 서버 전용 OpenAI Client
- [x] Place Docent API
- [x] Course Docent API
- [x] DB → LLM Context 구조
- [x] Content Context
- [x] Place Context
- [x] Scene Context
- [x] Episode Context
- [x] Scene Actor Context
- [x] verified_fact Context
- [x] verification_status 기반 evidence 필터 구조
- [x] Place / Course Prompt 분리
- [x] 실제 배우 사칭 방지 Prompt
- [x] 미검증 사실 생성 방지 Prompt
- [x] Structured Output
- [x] Request / Response Type
- [x] 최소 근거 부족 시 생성 제한
- [x] 실제 OpenAI 호출 환경변수 제어
- [x] 환경변수 미활성화 시 실제 호출 차단

---

## AI Docent UI (Mock 기반 구축 후 실제 API 연결)

- [x] Course Docent 진입 버튼
- [x] Place Docent 진입 버튼
- [x] 공통 `DocentDialog`
- [x] Course / Place mode
- [x] Loading
- [x] Success
- [x] Empty
- [x] Error
- [x] Retry
- [x] ESC 닫기
- [x] 배경 클릭 닫기
- [x] 모바일 Bottom Sheet
- [x] Desktop Dialog
- [x] Course Stop 변경 반영
- [x] 장소 추가 / 삭제 / 순서 변경 반영
- [x] PlaceDetailDialog와 Docent CTA 역할 분리

---

# 앞으로 할 작업

## 1. Data 확장 및 정제

### 촬영지 검수 파이프라인 구현 완료

- [x] KCCF / Blog CSV 통합
- [x] 대상 작품 및 서울 주소 필터
- [x] 작품명 / 주소 정규화
- [x] 작품 + 정규화 주소 기준 후보 병합
- [x] 출처 존재 여부 및 배우 데이터 존재 여부 표시
- [x] 동일 장소명 / 근거리 교차 출처 / 좌표 중복 후보 표시
- [x] 검수 사유 / 비교 대상 / 거리 / 추천 액션 생성
- [x] 전체 후보 443개 및 우선 검수 167개 출력 파일 확인

자동 생성 출력 CSV는 모두 PENDING이며 수동 검수 결과와 구분합니다.
수동 검수 최신본은 `data/manual/content_place_decisions.csv`입니다(2026-10-07).
REVIEWED 96 / PENDING 71이며 NEW_PLACE 58 / MERGE 22 / REJECT 15 / REVIEW 1 / 미분류 71입니다.
검수 결과는 Supabase 반영 완료를 뜻하지 않습니다. 상세 이력은 [데이터 파이프라인](data-pipeline.md#manual-review-csv-history)을 참고합니다.

- [x] 단계별 CSV를 단일 최신 파일로 통합하고 과거 스냅샷을 Git 이력으로 보존
- [x] HIGH 및 CHECK_MERGE 후보 검수
- [ ] CHECK_NEARBY 12건 계속 검수 — 다음 CP-0148 북촌한옥청 ↔ CP-0129 꽃라온
- [ ] VERIFY_SOURCE 59건 및 CP-0018 REVIEW 추가 판단
- [ ] 기존 좌표 보완 과제 및 현재 사라진 촬영지의 방문 안내 가능 여부 확인
- [ ] CP-0140과 수동 CSV 밖 KCCF 대학로의 후속 통합·좌표 확인
- [ ] 닌옆골목의 제외된 Blog 근거와 원본 파일 간 불일치를 서비스 반영 시 적용
- [ ] CP-0151의 사용자 추가 인물 조합을 KCCF 근거와 구분하고 Scene / Actor / Evidence 연결 검토

### 완료

- [x] `places.region` 추가
- [x] 기존 Place 지역 데이터 보강
- [x] 서울 Course 범위 적용
- [x] `places.place_description` 컬럼 추가
- [x] `place_description` 역할 정의
- [x] `scene_description` / `place_description` / `verified_fact` 책임 분리
- [x] `verification_status` 실제 DB 값 확인 (2026-09-21)
- [x] AI Docent evidence에 PUBLIC_DATA + 비어 있지 않은 verified_fact 조건 적용
- [x] `source_type` 기준 정리
- [x] 도깨비 Scene / Actor / Place 관계 품질 점검
- [x] 도깨비 서울 촬영지 1차 검증 정보 보강
- [x] 폐점 촬영지 `is_active=false` 처리 기준 적용

### 다음 작업

- [ ] 도깨비 남은 촬영지 검증 보강
- [ ] `place_description` 추가 보강
- [ ] `place_type` 분류 기준 재정의
- [ ] source 관리 방식 추가 정리
- [ ] 동일 주소 내 다른 촬영 포인트 보존 및 수동 병합 기준 보완
- [ ] 승인 데이터 Import CSV 포맷 고정 및 DB 반영 검증
- [ ] 추가 작품 2~3개 구축
- [ ] 추가 작품 Actor → Scene → Place 연결 검증

---

## 2. AI Docent 실제 연결 및 후속 검증

### 구현 완료

- [x] 실제 DB 상태값을 기준으로 Evidence Filter 정리
- [x] Scene 기록과 PUBLIC_DATA evidence의 의미 분리
- [x] `DocentDialog` Mock 생성 호출 → 실제 API 전환
- [x] `/api/docents/place` / `/api/docents/course` 요청 연결
- [x] API의 ko / en 입력과 언어별 Prompt 구현
- [x] 현재 UI 한국어 요청 연결
- [x] 422 근거 부족 Empty 처리와 나머지 오류 Error / Retry 처리
- [x] Course와 Place의 서로 다른 최소 생성 근거 처리

### 실제 성공 확인

- [x] 활성 상태에서 Course Docent 실제 생성 및 표시
- [x] 기존 shell OPENAI_API_KEY 충돌 진단
- [x] 기존 환경변수 해제 및 개발 서버 재시작 후 429 문제 해소

### 다음 작업

- [ ] Place Docent 실제 생성 및 화면 표시 최종 검증
- [ ] FAVEWAY Local API Key의 Last used 갱신 및 실제 사용량 확인
- [ ] 새 shell에서 기존 API Key가 다시 설정되는지 확인 및 설정 정리
- [ ] `docent-mock.ts`의 미사용 함수와 남은 타입 의존성 제거
- [ ] KR / EN 언어 선택 UI
- [ ] 한국어 출력 품질 검증
- [ ] 영어 실제 생성 및 출력 품질 검증
- [ ] Prompt 튜닝
- [ ] 실제 API의 Empty / Error / Retry 시나리오 검증
- [ ] 비용 제한 기준 정리

### 개인화

- [ ] 사용자 취향 입력 연결
- [ ] 여행 분위기 연결
- [ ] 검증된 place_description의 Context 포함 검토

### TTS

- [ ] 한국어 TTS
- [ ] 영어 TTS
- [ ] 재생 / 일시정지
- [ ] 다시 듣기
- [ ] TTS Loading / Error / Retry

---

## 3. AI Recommendation

- [ ] 사용자 취향 입력
- [ ] 여행 분위기 입력
- [ ] AI Ranking
- [ ] Candidate 점수
- [ ] 추천 이유
- [ ] Candidate ID Validation
- [ ] DB에 없는 Place 결과 차단
- [ ] Rule-based fallback
- [ ] AI 실패 시 기존 Recommendation 유지

---

## 4. Deployment

- [ ] Production 환경변수 정리
- [ ] Supabase Production 설정
- [ ] Kakao Production Domain 설정
- [ ] TMAP Production 설정
- [ ] OpenAI Production 설정
- [ ] API Key 노출 여부 점검
- [ ] Vercel 배포
- [ ] Production API Test
- [ ] 모바일 최종 테스트
- [ ] README 최종 업데이트
- [ ] 배포 URL README 반영

---

## 5. User Features

- [ ] 회원가입
- [ ] 로그인
- [ ] 로그아웃
- [ ] Profile
- [ ] 사용자 취향 저장
- [ ] Course 서버 저장
- [ ] 저장 Course 목록
- [ ] Course 상세
- [ ] Course 삭제

---

# 현재 개발 우선순위

```text
1. Place Docent 최종 검증 및 키 사용 기록 확인
↓
2. Mock 함수 / 타입 의존성 정리
↓
3. 데이터 검수·보강 및 KR / EN 출력 품질 검증
↓
4. TTS
↓
5. AI Recommendation
↓
6. Deployment
↓
7. User Features
```

현재 가장 가까운 다음 작업:

```text
Place Docent 실제 생성 확인
↓
Course / Place의 Empty / Error / Retry 확인
↓
Mock 타입 의존성 제거
```

API 연결 완료와 모든 시나리오의 검증 완료를 구분합니다.
Course 한 번의 생성 성공만으로 Place, 영어, TTS, Production까지 완료로 표시하지 않습니다.

---

# 핵심 원칙

## 1. 촬영지는 AI가 생성하지 않는다

```text
Place 없음
→ AI 생성 X
```

## 2. 배우와 촬영지는 Scene을 통해 연결한다

```text
Actor
→ Scene
→ Place
```

## 3. AI는 설명과 개인화에 사용한다

```text
DB Fact
↓
AI Explanation / Personalization
```

## 4. 데이터가 없으면 없는 상태를 그대로 보여준다

```text
No Data
≠
AI Generation
```

## 5. 데이터 부족과 시스템 오류를 구분한다

```text
정상 조회 + 결과 없음
→ Empty

API / Network 실패
→ Error
```

## 6. 외부 API 실패가 전체 서비스 실패가 되지 않게 한다

```text
TMAP 실패
→ 해당 구간 Haversine fallback
```

## 7. AI 입력은 서버에서 다시 검증한다

```text
Client IDs
↓
Server DB Query
↓
Verified Context
↓
AI
```

## 8. 서비스 범위 밖 데이터는 삭제하지 않는다

```text
서울 외 Place
→ DB 유지
→ 현재 Course에서 제외
```

---

# 추가 점검 항목

- [ ] `is_active !== false` 필터, DB null 제약, Frontend boolean 검증의 일관성 확인
- [ ] Explore 작품 / 배우 탐색의 지역 범위 차이 정책 확인
- [ ] 같은 장소의 복수 작품 관계 중 대표 관계 선택 기준 검토
- [ ] 파이프라인의 동일 주소 병합과 좌표 대표값 선택 방식 보완 검토
