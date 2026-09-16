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

- [x] 여행 가능 시간 선택
- [x] 한 구간 최대 도보 시간 선택
- [x] 도보 제한 없음
- [x] 단일 작품 Course
- [x] 복수 작품 Course
- [x] 복수 배우 OR 조건
- [x] Actor → Scene → Place Filtering
- [x] 거리 계산
- [x] 예상 도보 시간 계산
- [x] Route 조합
- [x] 여행 시간 검증
- [x] 도보 조건 검증
- [x] 장소 중복 제거
- [x] 체류 시간 계산

### Kakao Map

- [x] Kakao Maps JavaScript SDK 연결
- [x] Course 방문 순서 Marker 표시
- [x] Course 지도 시각화
- [x] 방문 순서에 따른 Marker 연결선 표시
- [x] 여러 촬영지가 한 화면에 보이도록 지도 범위 자동 조정
- [x] Marker 클릭 시 해당 Course 장소 카드로 이동
- [x] 선택한 Marker / 장소 카드 강조
- [x] 지도 하단 장소 버튼과 Course 카드 연동

현재 지도 위 연결선은 실제 도보 경로가 아니라 **Course 방문 순서를 표현하는 직선**입니다.

### Course 수정

- [x] Course 장소 삭제
- [x] 삭제 후 방문 순서 재정렬
- [x] 삭제 후 이동 거리 재계산
- [x] 삭제 후 예상 도보 시간 재계산
- [x] 삭제 후 총 이동 거리 재계산
- [x] 삭제 후 총 도보 시간 재계산
- [x] 삭제 후 체류 시간 재분배
- [x] 삭제 결과를 Kakao Map Marker / 연결선에 즉시 반영
- [x] 최소 1개 장소 유지
- [x] 방문 순서 변경
- [x] 순서 변경 후 이동 거리 재계산
- [x] 순서 변경 후 예상 도보 시간 재계산
- [x] 순서 변경 후 총 이동 거리 재계산
- [x] 순서 변경 후 총 도보 시간 재계산
- [x] 순서 변경 후 체류 시간 재계산
- [x] 순서 변경 결과를 Kakao Map Marker / 연결선에 즉시 반영
- [x] 수정 후 여행 시간 조건 재검증
- [x] 수정 후 최대 도보 시간 조건 재검증
- [x] 조건을 초과한 이동 구간 경고 표시
- [x] 조건을 다시 만족하면 경고 자동 해제

현재 Course 수정 내용은 브라우저 상태에서만 유지되며, 새로고침 시 최초 생성된 Course로 복원됩니다.

---

## 다음 우선순위

### 1. Course 장소 추가

생성된 Course에 사용자가 새로운 촬영지를 직접 추가할 수 있도록 확장합니다.

- [ ] 추가 가능한 Candidate 목록 조회
- [ ] 현재 Course에 포함되지 않은 장소만 표시
- [ ] 기존 Course와 장소 중복 검증
- [ ] 추가할 장소 선택
- [ ] 장소 추가 위치 결정
- [ ] 추가 후 방문 순서 재정렬
- [ ] 추가 후 이동 거리 재계산
- [ ] 추가 후 예상 도보 시간 재계산
- [ ] 추가 후 총 이동 거리 재계산
- [ ] 추가 후 총 도보 시간 재계산
- [ ] 추가 후 체류 시간 재분배
- [ ] 추가 후 여행 시간 조건 재검증
- [ ] 추가 후 최대 도보 시간 조건 재검증
- [ ] 추가 결과를 Kakao Map Marker / 연결선에 반영

예상 흐름:

```text
현재 Course
+
추가 가능한 Candidate
↓
장소 선택
↓
중복 검증
↓
추가 위치 결정
↓
방문 순서 재구성
↓
거리 재계산
↓
예상 도보 시간 재계산
↓
여행 시간 검증
↓
도보 조건 검증
↓
체류 시간 재분배
↓
Map 갱신
```

초기 구현에서는 장소 추가 위치를 자동 최적화하기보다 사용자가 원하는 위치에 추가하거나, 가장 단순한 방식부터 단계적으로 적용합니다.

---

### 2. Kakao Map 실제 이동 경로

현재 Haversine 기반으로 계산하는 거리와 예상 도보 시간을 실제 이동 경로 기반 정보로 확장합니다.

- [ ] 실제 도보 Route API 조사
- [ ] 장소 간 실제 이동 경로 조회
- [ ] 지도 직선 연결선을 실제 이동 경로로 교체
- [ ] 실제 이동 거리 반영
- [ ] 실제 예상 이동 시간 반영
- [ ] Route API 실패 시 Haversine Fallback
- [ ] 외부 API 호출 횟수 최적화

예상 구조:

```text
Course Candidate
↓
Haversine 기반 1차 필터
↓
실제 Route API
↓
실제 이동 거리
+
실제 이동 시간
↓
Course Validation
```

Haversine 계산은 제거하지 않고 빠른 1차 필터 및 Route API 실패 시 Fallback으로 유지합니다.

---

### 3. 촬영지 탐색 지도

현재 Course 화면에 적용된 Kakao Map을 촬영지 탐색 화면에도 확장합니다.

- [ ] `/explore` 촬영지 Marker 표시
- [ ] 작품 기준 촬영지 지도 표시
- [ ] 배우 기준 촬영지 지도 표시
- [ ] 촬영지 필터 변경 시 Marker 갱신
- [ ] 동일 실제 장소 Marker 중복 제거
- [ ] Marker 클릭 시 장소 상세 연결
- [ ] 장소 카드 클릭 시 지도 Marker 강조

촬영지 목록에서는 작품별 관계를 유지하되, 지도에서는 동일한 실제 `place_id`를 하나의 Marker로 표시합니다.

---

### 4. 장소 상세 고도화

현재 작품별로 분리되어 있는 장소 관계를 실제 장소 중심으로 더 자연스럽게 보여주도록 개선합니다.

- [ ] 동일 실제 장소 + 여러 작품 관계 통합
- [ ] 장소 중심 상세 구조
- [ ] 작품별 Scene 그룹화
- [ ] 작품별 등장 배우 표시
- [ ] 중복된 장소 설명 / 검증 정보 정리

예상 구조:

```text
Place
├─ Content A
│  ├─ Scene
│  └─ Actors
│
└─ Content B
   ├─ Scene
   └─ Actors
```

현재 목록에서는 `content_id + place_id` 조합을 기준으로 관계를 유지하며, 상세 화면에서 동일한 실제 장소와 연결된 여러 작품 정보를 통합하는 방향으로 개선합니다.

---

### 5. Actor Match Mode

복수 배우를 선택했을 때 어떤 관계의 촬영지를 원하는지 사용자가 선택할 수 있도록 확장합니다.

현재는 선택 배우 중 한 명 이상이 등장한 Scene을 사용하는 `ANY` 방식만 지원합니다.

향후 다음 두 가지 방식을 지원합니다.

- [ ] `ANY` — 선택한 배우 중 한 명 이상이 등장한 Scene의 촬영지
- [ ] `ALL` — 선택한 배우 전원이 동일 Scene에 함께 등장한 촬영지
- [ ] 배우 2명 이상 선택 시 Match Mode 선택 UI 표시
- [ ] 작품 기준 촬영지 탐색에 Match Mode 적용
- [ ] Course 생성에 Match Mode 적용
- [ ] 선택한 Match Mode를 추천 근거에 표시

사용자 UI에서는 기술 용어 대신 다음과 같이 표현합니다.

```text
어떤 촬영지를 찾고 싶나요?

○ 선택한 배우 중 한 명이라도 나온 장소
○ 선택한 배우가 함께 나온 장소
```

`ALL`은 단순한 장소 교집합이 아니라 **동일 Scene에 선택한 배우 전원이 등장했는지**를 기준으로 판단합니다.

예:

```text
Scene A
공유 O
김고은 X
→ 제외

Scene B
공유 X
김고은 O
→ 제외

Scene C
공유 O
김고은 O
→ 포함
```

향후 API 확장 예시:

```ts
actorMatchMode: "ANY" | "ALL";
```

---

### 6. AI Recommendation

현재 규칙 기반으로 생성한 유효한 Candidate와 Route 후보 중 사용자 취향에 더 적합한 Course를 AI가 선택하도록 확장합니다.

- [ ] 유효 Route 후보 생성
- [ ] LLM Ranking
- [ ] Structured Output
- [ ] Schema Validation
- [ ] Candidate ID Validation
- [ ] 추천 이유 생성
- [ ] AI 실패 Fallback

예상 구조:

```text
DB Candidate
↓
Actor / Scene Validation
↓
Route Validation
↓
Valid Route Candidates
↓
LLM Ranking
↓
Structured Output
↓
Candidate Validation
↓
Final Course
```

AI는 새로운 촬영지를 생성하지 않고, DB에서 검증된 Candidate 안에서만 추천합니다.

---

### 7. AI Docent

촬영 장소에 도착했을 때 검증된 작품·장면·배우 정보를 기반으로 개인화된 설명을 제공합니다.

- [ ] DB 기반 Docent Prompt
- [ ] 사용자 취향 반영
- [ ] 작품 정보 반영
- [ ] Scene / Episode 정보 반영
- [ ] 배우 정보 반영
- [ ] 한국어 Docent
- [ ] 영어 Docent
- [ ] TTS
- [ ] AI 실패 시 DB 기본 설명 Fallback

예상 구조:

```text
Verified DB Data
+
User Preference
+
Content
+
Scene
+
Actor
+
Place
↓
LLM
↓
Personalized Docent
```

---

### 8. 사용자 기능

사용자의 취향과 여행 결과를 저장할 수 있도록 계정 기능을 확장합니다.

- [ ] 회원가입
- [ ] 로그인
- [ ] 사용자 취향 저장
- [ ] Course 저장
- [ ] 수정된 Course 저장
- [ ] 저장한 Course 조회
- [ ] 여행 기록

---

### 9. Data

콘텐츠와 배우를 확대하고 데이터 구축 과정을 자동화합니다.

- [ ] Actor 데이터 확대
- [ ] Content 데이터 확대
- [ ] Scene 데이터 확대
- [ ] Scene ↔ Actor 관계 확대
- [ ] Scene ↔ Place 관계 확대
- [ ] Verification 정보 확대
- [ ] 장소 정규화 자동화
- [ ] 콘텐츠 정규화 자동화
- [ ] ETL 자동화

---

### 10. Deployment

실제 모바일 환경에서 사용할 수 있도록 Production 환경을 구성합니다.

- [ ] Vercel 배포
- [ ] Production Supabase 연결
- [ ] Production 환경변수 설정
- [ ] Kakao JavaScript SDK Production Domain 등록
- [ ] 모바일 화면 검증
- [ ] 실제 모바일 브라우저 위치 권한 검증
- [ ] Production API 오류 처리 확인

---

## 이후 확장

핵심 여행 흐름이 안정화된 이후 다음 기능을 검토합니다.

### 현장 여행 모드

```text
저장된 Course
↓
여행 시작
↓
현재 위치 확인
↓
다음 촬영지 안내
↓
촬영지 도착
↓
Scene / Actor 정보
↓
AI Docent
↓
다음 장소
```

- [ ] 여행 시작 / 종료
- [ ] 현재 위치 기반 Course 진행 상태
- [ ] 장소 도착 여부 확인
- [ ] 방문 완료 처리
- [ ] 다음 장소 안내

### 취향 기반 개인화

- [ ] 좋아하는 작품 저장
- [ ] 좋아하는 배우 저장
- [ ] 여행 분위기 저장
- [ ] 이전 Course 기반 추천
- [ ] 개인별 Course Ranking

---

## 개발 원칙

새로운 기능은 다음 흐름을 유지하는 방향으로 개발합니다.

```text
사용자 취향
↓
Content / Actor 선택
↓
Actor → Scene → Place 관계 검증
↓
실제 촬영지 Candidate
↓
여행 조건 검증
↓
실제 방문 가능한 Course
↓
사용자 Course 수정
↓
Course 조건 재검증
↓
개인화
↓
현장 콘텐츠 경험
```

FAVEWAY에서 AI는 촬영지를 만들어내는 역할이 아니라 **검증된 콘텐츠 데이터를 사용자의 취향과 실제 여행 경험에 맞게 연결하는 역할**을 담당합니다.
