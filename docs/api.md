# FAVEWAY API

## 1. Contents

### `GET /api/contents`

등록된 작품 목록 조회.

---

### `GET /api/contents/:contentId/actors`

작품의 출연 배우 조회.

```text
Content
↓
content_actors
↓
Actors
```

---

### `GET /api/contents/:contentId/places`

작품 전체 촬영지 조회.

---

### `GET /api/contents/:contentId/places?actorIds=3,5`

작품의 촬영지 중 선택 배우가 실제 등장한 Scene의 장소만 조회.

복수 배우는 OR 조건입니다.

```text
Actor A Scene
UNION
Actor B Scene
↓
Place
```

---

### `GET /api/contents/:contentId/places/:placeId`

특정 작품 + 장소 상세 조회.

주요 응답 정보:

- 작품
- 장소
- Scene
- Episode
- Scene 등장 배우
- 검증 정보
- 출처

---

## 2. Actors

### `GET /api/actors/search?q=`

배우 이름 부분 검색.

예:

```text
/api/actors/search?q=공
```

---

### `GET /api/actors/recommendations`

촬영 Scene 데이터가 존재하는 배우 중 일부를 추천합니다.

현재 UI에서는 3명을 사용합니다.

---

### `GET /api/actors/:actorId/contents`

배우의 출연 작품 조회.

```text
Actor
↓
content_actors
↓
Contents
```

---

### `GET /api/actors/:actorId/places`

배우가 실제 등장한 Scene과 연결된 촬영지 조회.

```text
Actor
↓
scene_actors
↓
Scenes
↓
scene_places
↓
Places
```

동일한 `content_id + place_id`는 한 번만 반환합니다.

---

### `GET /api/actors/:actorId/places?contentIds=1,2`

배우 촬영지를 선택 작품 범위로 제한합니다.

복수 작품을 지원합니다.

---

## 3. Trips

### `POST /api/trips`

규칙 기반 Course 생성.

요청 예시:

```json
{
  "contentIds": [1, 4],
  "actorIds": [3, 5],
  "durationMinutes": 240,
  "maxWalkingMinutes": 20
}
```

### 필드

`contentIds`

- 필수
- 복수 작품 지원

`actorIds`

- 빈 배열 가능
- 빈 배열이면 작품 전체 촬영지 사용
- 복수 배우 선택 시 OR 조건

`durationMinutes`

- 현재 180 / 240 / 300분

`maxWalkingMinutes`

- `10`, `20`, `30`
- `null`이면 도보 제한 없음

---

## 4. Trip 처리 개요

```text
contentIds
+
actorIds
↓
Candidate 조회
↓
Actor → Scene → Place Filtering
↓
중복 제거
↓
좌표 검증
↓
Route 조합
↓
도보 조건 검증
↓
전체 여행 시간 검증
↓
최종 Course
```

---

## 5. Error Handling

API는 가능한 경우 다음 형태로 오류를 반환합니다.

```json
{
  "message": "오류 설명"
}
```

Frontend는 사용자에게 기술적인 DB 오류 대신 이해 가능한 메시지를 표시하도록 구성합니다.
