# FAVEWAY Roadmap

## 현재 완료

### Navigation / UX

- [x] HOME
- [x] 코스 만들기 / 촬영지 둘러보기 분리
- [x] 공통 이전 버튼
- [x] 작품 기준 탐색
- [x] 배우 기준 탐색

### Content / Actor

- [x] 작품 목록 조회
- [x] 작품 제목 검색
- [x] 배우 부분 검색
- [x] 추천 배우 3명
- [x] 작품 → 배우 조회
- [x] 배우 → 작품 조회
- [x] 복수 배우 선택
- [x] 복수 작품 선택
- [x] 작품 미선택 시 배우 전체 작품 사용

### Filming Location

- [x] 작품 전체 촬영지 조회
- [x] 작품 + 배우 촬영지 필터
- [x] 배우 전체 촬영지 조회
- [x] 배우 + 작품 촬영지 필터
- [x] 동일 작품 + 동일 장소 중복 제거
- [x] 장소 상세 Dialog
- [x] Scene / Episode / 등장 배우 표시
- [x] 주소 / 검증 정보 / 출처 표시

### Course

- [x] 여행 가능 시간
- [x] 한 구간 최대 도보 시간
- [x] 도보 제한 없음
- [x] 단일 작품 Course
- [x] 복수 작품 Course
- [x] 복수 배우 OR 조건
- [x] Actor → Scene → Place Filtering
- [x] 거리 계산
- [x] 예상 도보 시간
- [x] Route 조합
- [x] 여행 시간 검증
- [x] 도보 조건 검증
- [x] 장소 중복 제거
- [x] 체류 시간 계산

---

## 다음 우선순위

### 1. Kakao Map

- [ ] Kakao Maps JavaScript SDK 연결
- [ ] 촬영지 Marker
- [ ] Course 방문 순서 Marker
- [ ] 지도에서 Course 시각화
- [ ] 실제 도보 경로 적용

### 2. Course 수정

- [ ] Course 장소 삭제
- [ ] Course 장소 추가
- [ ] 방문 순서 변경
- [ ] 수정 후 조건 재검증

### 3. 장소 상세 고도화

- [ ] 동일 실제 장소 + 여러 작품 관계 통합
- [ ] 장소 중심 상세 구조
- [ ] 작품별 Scene 그룹화

### 4. AI Recommendation

- [ ] 유효 Route 후보 생성
- [ ] LLM Ranking
- [ ] Structured Output
- [ ] Candidate ID Validation
- [ ] 추천 이유 생성
- [ ] AI 실패 Fallback

### 5. AI Docent

- [ ] DB 기반 Docent Prompt
- [ ] 사용자 취향 반영
- [ ] 작품 / Scene / 배우 정보 반영
- [ ] 한국어 / 영어
- [ ] TTS

### 6. 사용자 기능

- [ ] 회원가입 / 로그인
- [ ] 취향 저장
- [ ] Course 저장
- [ ] 여행 기록

### 7. Data

- [ ] Actor 데이터 확대
- [ ] Scene 데이터 확대
- [ ] Verification 정보 확대
- [ ] ETL 자동화
- [ ] 장소 정규화 자동화

### 8. Deployment

- [ ] Vercel 배포
- [ ] Production Supabase 연결
- [ ] Production 환경변수 설정
- [ ] 실제 모바일 환경 검증
