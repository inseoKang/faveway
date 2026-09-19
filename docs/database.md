# FAVEWAY Database

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
```

드라마 / 영화 콘텐츠 Entity입니다.

---

## `content_actors`

```text
actor_id
content_id
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
```

작품의 Scene 정보입니다.

장면 정보가 확인되지 않은 경우
존재하지 않는 설명을 임의 생성하지 않습니다.

---

## `scene_actors`

```text
scene_id
actor_id
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
```

실제 장소 Entity입니다.

---

## `place_relations`

작품과 장소의 기본 관계와
촬영지 검증 정보를 관리합니다.

주요 정보:

```text
content_id
place_id
relation_type
verification_status
verified_fact
source_url
```

현재 서비스에서는 추가 검증 메타데이터로 다음 정보도 사용합니다.

```text
source_type
verified_at
```

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

현재 다음 조합을 기준으로 중복을 제거합니다.

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
is_active = true
→ Candidate 가능

is_active = false
→ Candidate 제외
```

---

# 8. 좌표

Course 생성과 지도 표시를 위해
다음 좌표를 사용합니다.

```text
latitude
longitude
```

Course 후보 생성 시
좌표가 없는 장소는 Route 계산 대상에서 제외할 수 있습니다.

Place Detail에서는 좌표가 없는 경우
주소 검색 기반 이동 링크 fallback을 사용할 수 있습니다.

---

# 9. 데이터 검증

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

# 10. Scene 정보가 없는 경우

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

# 11. DB와 AI의 책임 분리

DB:

```text
촬영지
장면
배우
작품
관계
검증 정보
출처
```

AI:

```text
검증된 정보 설명
사용자 취향 기반 표현
언어 변환
Docent 생성
```

---

# 12. 향후 개선

- 동일 실제 장소 + 여러 작품 관계의 장소 중심 통합
- Actor / Scene 데이터 확대
- Verification 상태 정교화
- source 관리 방식 고도화
- 데이터 정규화 자동화
- ETL 자동화
- 폐업 / 이전 장소 검증
- 좌표 검증 자동화