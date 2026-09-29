# FAVEWAY Database

최종 업데이트: 2026-09-29.

## 1. 핵심 원칙

FAVEWAY의 Database는
AI가 추측해야 하는 정보를 줄이고,
촬영지와 콘텐츠 관계를 구조화해서 저장합니다.

```text
DB
=
사실 + 관계 + 검증 정보

AI
=
설명 + 개인화
```

촬영지 자체는 AI가 생성하지 않습니다.

---

# 2. 핵심 관계

```text
Actor
↓
Scene
↓
Place
```

배우가 작품에 출연했다는 사실만으로
작품의 모든 촬영지가 배우 관련 장소가 되지 않도록
Scene 관계를 별도로 관리합니다.

---

# 3. 주요 테이블

## `actors`

```text
id
name
created_at
```

배우 Entity입니다.

---

## `contents`

```text
id
title
media_type
release_year
description
created_at
```

드라마 / 영화 콘텐츠 Entity입니다.

---

## `content_actors`

```text
content_id
actor_id
character_name
```

배우와 작품의 출연 관계입니다.

---

## `scenes`

```text
id
content_id
episode
description
raw_description
created_at
```

작품의 Scene 정보입니다.

역할:

```text
description
→ 서비스에서 사용하는 정리된 장면 설명

raw_description
→ 원본 데이터에서 가져온 장면 설명
```

장면 정보가 확인되지 않은 경우
존재하지 않는 설명이나 Episode를 임의 생성하지 않습니다.

---

## `scene_actors`

```text
scene_id
actor_id
character_name
```

특정 Scene에 실제 등장한 배우 관계입니다.

---

## `scene_places`

```text
scene_id
place_id
```

특정 Scene과 실제 촬영 장소의 관계입니다.

---

## `places`

```text
id
name
address
latitude
longitude
place_type
is_active
created_at
region
place_description
```

실제 장소 Entity입니다.

### `region`

현재 서비스 지역 범위를 명시적으로 관리합니다.

현재 예:

```text
서울
인천
강원
전남
```

FAVEWAY의 초기 Course 범위는 서울이므로:

```text
region = 서울
+
is_active !== false
```

인 장소를 Course 후보로 사용합니다.

서울 외 장소는 DB에서 삭제하지 않고 유지합니다.

---

### `place_description`

실제 장소 자체에 대한 설명입니다.

```text
scene.description
→ 작품 속에서 어떤 장면인가

places.place_description
→ 현실에서 이곳은 어떤 장소인가

place_relations.verified_fact
→ 작품과 장소의 촬영 관계를 뒷받침하는 검증 사실
```

세 정보의 책임을 분리합니다.

`place_description`도 근거 없이 생성하지 않습니다.

현재는 출처가 충분히 확인된 장소부터 순차적으로 보강합니다.

---

### `place_type`

2026-09-21 점검 기준:

```text
NULL
playground
```

기존 일부 데이터의 `playground` 값이
실제 장소 유형과 일치하지 않는 경우가 확인되었습니다.

따라서 현재 `place_type`은
Course 또는 AI Docent의 신뢰 데이터로 사용하지 않습니다.

추후 분류 기준을 정의한 뒤 정제합니다.

---

## `place_relations`

작품과 장소의 기본 관계와
촬영지 검증 정보를 관리합니다.

테이블 컬럼 (2026-09-21 점검 기준):

```text
id
content_id
actor_id
scene_id
place_id
relation_type
verification_status
source_type
source_url
verified_fact
verified_at
created_at
```

현재 데이터에서는
Scene / Actor 단위로 같은 작품 + 장소 관계가 여러 행 존재할 수 있습니다.

예:

```text
도깨비 + 운현궁 양관 + Scene 4 + Actor A
도깨비 + 운현궁 양관 + Scene 4 + Actor B
도깨비 + 운현궁 양관 + Scene 4 + Actor C
```

이 때문에:

```text
content_id + place_id
```

만 기준으로 보면 중복처럼 보일 수 있지만,
현재 구조에서는 Scene / Actor 관계를 함께 저장하면서 발생한 반복입니다.

장기적으로 검증 정보를 별도 구조로 분리할 수 있지만,
현재 서비스와 API 호환성을 위해 기존 구조를 유지합니다.

---

# 4. 대표 조회 관계

## 작품 → 배우

```text
contents
↓
content_actors
↓
actors
```

---

## 배우 → 작품

```text
actors
↓
content_actors
↓
contents
```

---

## 배우 → 실제 촬영지

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

---

## 작품 → 촬영지

```text
contents
↓
place_relations
↓
places
```

---

# 5. 배우 촬영지 판정 기준

FAVEWAY는 다음과 같이 판단하지 않습니다.

```text
Actor
→ Content
→ 해당 작품 모든 Place
```

대신:

```text
Actor
→ Scene
→ Place
```

관계를 사용합니다.

이를 통해 사용자가 선택한 배우가
실제로 연결된 장면의 촬영지만 후보로 사용합니다.

---

# 6. 중복 처리

배우 기준 촬영지 조회 과정에서
동일 작품과 동일 장소가 여러 Scene이나 관계로 인해
반복 조회될 수 있습니다.

현재 UI / API에서는 다음 조합을 기준으로 중복을 제거합니다.

```text
content_id + place_id
```

예:

```text
도깨비 + 장소 A
도깨비 + 장소 A
도깨비 + 장소 A
```

↓

```text
도깨비 + 장소 A
```

다른 작품에 연결된 동일 장소는
각 작품 관계를 유지합니다.

---

# 7. 장소 활성 상태

`places.is_active`를 사용해
현재 Course 후보로 사용할 수 있는 장소인지 관리합니다.

```text
is_active !== false
→ 현재 Course Candidate 가능

is_active = false
→ Course Candidate 제외
```

촬영지 기록 자체를 삭제한다는 의미는 아닙니다.

예:

```text
과거 촬영지
+
현재 폐점
↓
Scene / 촬영지 기록 유지
is_active = false
```

달콤커피 종로종각점은
현재 방문 후보에서 제외하기 위해
`is_active = false`로 관리합니다.

---

# 8. 서비스 지역

현재 FAVEWAY의 Course 범위는 서울입니다.

Course 후보 조건:

```text
is_active !== false
+
region = 서울
+
좌표 존재
```

서울 외 촬영지는 DB에서 삭제하지 않습니다.

```text
서울 외 장소
→ 데이터 보존
→ 현재 Course에서는 제외
```

향후 서비스 범위가 확장되면
`region` 기준을 이용해 후보 범위를 넓힐 수 있습니다.

---

# 9. 좌표

Course 생성과 지도 표시를 위해
다음 좌표를 사용합니다.

```text
latitude
longitude
```

Course 후보 생성 시
좌표가 없는 장소는 Route 계산 대상에서 제외합니다.

Place Detail에서는 좌표가 없는 경우
주소 검색 기반 이동 링크 fallback을 사용할 수 있습니다.

---

# 10. 데이터 검증

주요 검증 정보:

```text
verified_fact
verification_status
source_url
source_type
verified_at
```

목적:

```text
어떤 장소인가?
↓
어떤 작품과 관련 있는가?
↓
어떤 장면인가?
↓
정보의 출처는 무엇인가?
↓
현재 어느 정도 검증됐는가?
```

---

# 11. verification_status

2026-09-21에 확인한 상태값:

```text
PUBLIC_DATA
UNVERIFIED
```

### `PUBLIC_DATA`

공공데이터를 기반으로 등록된 관계입니다.

현재 도깨비 일부 촬영지는
한국문화정보원 미디어콘텐츠 영상 촬영지 데이터를 근거로 사용합니다.

### `UNVERIFIED`

기존 데이터에는 존재하지만
FAVEWAY에서 공공데이터 수준의 검증 완료 상태로 분류하지 않은 관계입니다.

`source_url`이나 `verified_fact`가 추가되었더라도
자동으로 `PUBLIC_DATA`로 변경하지 않습니다.

---

# 12. source_type

현재 사용하는 값:

```text
KCCF_PUBLIC_DATA
OFFICIAL
SECONDARY
USER_PROVIDED_CSV
```

### `KCCF_PUBLIC_DATA`

한국문화정보원 등 기존 공공데이터 출처입니다.

### `OFFICIAL`

서울시, 공공기관, 장소 공식 사이트 등
공식 출처를 사용한 경우입니다.

### `SECONDARY`

언론,
촬영지 전문 데이터베이스,
촬영지 / 여행 정보 사이트 등
2차 출처를 사용한 경우입니다.

### `USER_PROVIDED_CSV`

기존 CSV에서 가져온 데이터로,
추가 외부 검증 전 상태를 의미합니다.

새로운 검증 출처를 확보하면
현재 `source_url`의 성격에 맞게
`source_type`을 업데이트합니다.

---

# 13. verified_at

```text
verified_at
→ FAVEWAY에서 해당 근거를 확인한 시점
```

원문 기사 작성일이나
촬영 날짜를 의미하지 않습니다.

---

# 14. 도깨비 데이터 점검 기록 (2026-09-21)

점검일: 2026-09-21.

도깨비:

```text
content_id = 1
```

Scene:

```text
총 32개
scene description 누락 0
raw_description 누락 0
Episode 누락 1
Scene Actor 없는 Scene 0
Scene Place 없는 Scene 0
```

Episode가 확인되지 않은 Scene은
추측해서 채우지 않고 `NULL`을 유지합니다.

---

## 서울 촬영지

2026-09-21 점검 당시 도깨비 서울 촬영지:

```text
총 19곳
활성 18곳
비활성 1곳
```

검증 정보:

```text
verified_fact
+
source_url
+
verified_at
```

이 모두 보강된 서울 촬영지는
당시 14곳입니다.

`place_description`은
공식 또는 신뢰 가능한 설명 근거가 확보된 장소부터
순차적으로 보강하고 있습니다.

---

# 15. Scene 정보가 없는 경우

촬영 장소라는 사실은 확인됐지만
구체적인 Scene 정보가 없는 데이터가 존재할 수 있습니다.

이 경우:

```text
Place 존재
Scene 정보 없음
```

상태를 그대로 유지합니다.

하지 않는 것:

```text
AI로 Scene 생성
UI에서 추측한 장면 표시
출처 없는 Episode 생성
```

---

# 16. DB와 AI의 책임 분리

DB:

```text
촬영지
장면
배우
작품
관계
검증 정보
출처
지역
실제 장소 설명
```

AI:

```text
검증된 정보 설명
사용자 취향 기반 표현
언어 변환
Docent 생성
```

---

# 17. AI Docent Evidence 적용 정책

현재 narration evidence 허용 조건:

```text
verification_status === "PUBLIC_DATA"
+
verified_fact가 문자열
+
verified_fact.trim().length > 0
```

`UNVERIFIED`의 `verified_fact`는 생성 Context의 evidence에서 제외합니다.
`source_type`이나 출처 개수만으로 evidence를 허용하지 않습니다.
현재 필터는 `source_url` / `verified_at` 존재 여부를 검사하지 않습니다.

Scene description은 evidence와 별도로 전달합니다.
`PUBLIC_DATA`는 개별 촬영 관계 사실의 사용 조건이며,
Scene / Episode / Actor 정보까지 독립 검증됐다는 의미는 아닙니다.
Prompt는 Scene 기록에 명시된 범위에서만 설명하도록 제한합니다.

이 구조는 생성 근거를 제한하는 구현이며,
생성 문장의 사실 정확성을 자동으로 보증하는 검증기는 아닙니다.

현재 코드가 생성 Context에 넣는 Place 정보는 `id`, `name`, `address`입니다.
`is_active`는 조회 시 제외 판단에 사용하고,
`place_description` / `place_type` / `source_url` / `verified_at`는 현재 LLM 입력에 넣지 않습니다.

Context 존재 확인과 생성 가능 여부는 별도입니다.
Scene 또는 작품·장소 관계 행이 존재해도,
설명 가능한 Scene description과 허용된 verified_fact가 모두 없을 수 있습니다.

Trip 후보 조회는 PUBLIC_DATA 상태를 필수로 요구하지 않습니다.
AI evidence 사용 조건을 DB 전체 또는 Course 전체의 검증 상태로 확대 해석하지 않습니다.

---

# 18. 향후 개선

- 남은 도깨비 촬영지 검증 보강
- `place_description` 확대
- `place_type` 분류 기준 재정의
- 동일 실제 장소 + 여러 작품 관계의 장소 중심 통합
- Actor / Scene 데이터 확대
- 현재 AI Evidence 정책 유지 및 새로운 Verification 상태 필요성 검토
- source 관리 방식 고도화
- 검증 정보 별도 테이블 분리 검토
- 구현된 CSV 정규화 / 후보 생성 파이프라인의 검수 이후 단계 확장
- 승인 데이터 Import 및 ETL 자동화 검토
- 폐업 / 이전 장소 검증
- 좌표 검증 자동화
- 추가 작품 2~3개 데이터 구축

---

# 19. 활성 조건과 데이터 수량 해석

현재 Trip / 작품별 장소 API는 `is_active !== false`를 사용합니다.
이 조건은 false만 제외하며 null을 명시적으로 제외하지 않습니다.
Course 입력 구조 검증은 `is_active`의 boolean 타입을 요구합니다.
DB의 NOT NULL / CHECK 제약과 애플리케이션의 null 처리 정합성은 추가 점검이 필요합니다.

파이프라인 후보 443개와 우선 검수 167개는 로컬 CSV의 행 수입니다.
해당 수를 Supabase의 places 수나 검증 완료 장소 수로 기록하지 않습니다.
후보의 `review_status`와 DB의 `verification_status`도 서로 다른 값입니다.
