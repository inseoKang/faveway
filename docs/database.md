# FAVEWAY Database

## 1. 핵심 원칙

DB는 AI가 추측해야 하는 정보를 줄이고, 촬영지와 콘텐츠 관계를 가능한 한 구조화해서 저장합니다.

```text
DB = 사실과 관계
AI = 선택, 정렬, 설명, 개인화
```

---

## 2. 핵심 관계

```text
Actor
↓
Scene
↓
Place
```

배우가 작품에 출연했다는 사실만으로 작품의 모든 촬영지가 배우 관련 장소가 되지 않도록 Scene 관계를 별도로 관리합니다.

---

## 3. 주요 테이블

### `actors`

```text
id
name
```

배우 Entity.

### `contents`

```text
id
title
media_type
release_year
description
```

드라마 / 영화 콘텐츠.

### `content_actors`

```text
actor_id
content_id
character_name
```

배우와 작품의 출연 관계.

### `scenes`

```text
id
content_id
episode
description
```

작품의 Scene.

### `scene_actors`

```text
scene_id
actor_id
```

Scene에 실제 등장한 배우 관계.

### `scene_places`

```text
scene_id
place_id
```

Scene과 실제 촬영 장소 관계.

### `places`

```text
id
name
address
latitude
longitude
place_type
is_active
```

실제 장소 Entity.

### `place_relations`

```text
content_id
place_id
relation_type
verification_status
verified_fact
source_url
```

작품과 장소의 기본 관계 및 검증 정보.

---

## 4. 대표 조회 관계

### 작품 → 배우

```text
contents
↓
content_actors
↓
actors
```

### 배우 → 작품

```text
actors
↓
content_actors
↓
contents
```

### 배우 → 실제 촬영지

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

### 작품 → 촬영지

```text
contents
↓
place_relations
↓
places
```

---

## 5. 중복 처리

배우 기준 촬영지 조회 과정에서 동일 작품과 동일 장소가 여러 Scene이나 관계 때문에 반복될 수 있습니다.

현재는 다음 조합을 기준으로 중복을 제거합니다.

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

다른 작품과 연결된 동일 장소는 아직 별도 관계로 유지합니다.

---

## 6. 데이터 검증

주요 검증 정보:

```text
verified_fact
source_url
verification_status
verified_at
```

촬영 장소와 장면 정보를 AI가 임의 생성하지 않고, 검증된 DB 정보를 우선 사용하도록 설계합니다.

---

## 7. 향후 개선

- 동일 실제 장소 + 여러 작품 관계의 장소 중심 통합
- Actor / Scene 데이터 확대
- Verification 상태 정교화
- 데이터 정규화 자동화
- ETL 자동화
