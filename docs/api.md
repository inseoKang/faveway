# FAVEWAY API

FAVEWAY의 Frontend에서 사용하는 Next.js Route Handler API를 정리합니다.

FAVEWAY는 별도의 Backend 서버를 두지 않고
Next.js App Router의 Route Handler를 API 계층으로 사용합니다.

---

# 1. Contents

## `GET /api/contents`

등록된 작품 목록을 조회합니다.

주요 사용 위치:

- 작품 기준 탐색
- Planning
- Course 장소 추가 후보 조회

---

## `GET /api/contents/:contentId/actors`

특정 작품에 출연한 배우를 조회합니다.

```text
Content
↓
content_actors
↓
Actors
```

주요 사용 위치:

- 작품 기준 탐색
- 작품 선택 후 배우 필터

---

## `GET /api/contents/:contentId/places`

특정 작품과 연결된 전체 촬영지를 조회합니다.

배우 필터가 없는 경우 작품 기준 촬영지를 사용합니다.

```text
Content
↓
Place Relation
↓
Place
```

---

## `GET /api/contents/:contentId/places?actorIds=3,5`

특정 작품의 촬영지 중
선택한 배우가 실제 등장한 Scene과 연결된 장소만 조회합니다.

복수 배우는 현재 OR 조건입니다.

```text
Actor A Scene
UNION
Actor B Scene
↓
Place
```

배우가 작품에 출연했다는 사실만으로
해당 작품의 모든 촬영지를 배우 관련 장소로 취급하지 않습니다.

핵심 관계:

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

---

## `GET /api/contents/:contentId/places/:placeId`

특정 작품과 장소에 대한 상세 정보를 조회합니다.

주요 응답 정보:

- 작품
- 장소
- Scene
- Episode
- Scene 등장 배우
- verified_fact
- verification_status
- source_type
- source_url
- verified_at

장면 정보나 출처 정보가 없는 경우
존재하지 않는 정보를 생성하지 않고 빈 상태로 전달합니다.

---

# 2. Actors

## `GET /api/actors/search?q=`

배우 이름을 부분 검색합니다.

예:

```text
/api/actors/search?q=공
```

주요 사용 위치:

- 배우 기준 탐색
- Planning

---

## `GET /api/actors/recommendations`

촬영 Scene 데이터가 존재하는 배우 중 일부를 추천합니다.

현재 UI에서는 추천 배우 3명을 사용합니다.

---

## `GET /api/actors/:actorId/contents`

특정 배우가 출연한 작품을 조회합니다.

```text
Actor
↓
content_actors
↓
Contents
```

배우 기준 탐색에서 작품 필터 후보를 구성할 때 사용합니다.

---

## `GET /api/actors/:actorId/places`

특정 배우가 실제 등장한 Scene과 연결된 촬영지를 조회합니다.

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

동일한 장소가 여러 Scene을 통해 조회될 수 있으므로
현재 다음 조합을 기준으로 중복을 제거합니다.

```text
content_id + place_id
```

---

## `GET /api/actors/:actorId/places?contentIds=1,2`

배우 촬영지를 선택한 작품 범위로 제한합니다.

복수 작품을 지원합니다.

작품을 선택하지 않은 경우
해당 배우의 전체 관련 작품을 대상으로 조회할 수 있습니다.

---

# 3. Trips

## `POST /api/trips`

DB에 저장된 검증된 촬영지 후보를 이용해
규칙 기반 Course를 생성합니다.

AI가 촬영지를 생성하지 않습니다.

---

## Request

```json
{
  "contentIds": [1, 4],
  "actorIds": [3, 5],
  "durationMinutes": 240,
  "maxWalkingMinutes": 20
}
```

---

## Fields

### `contentIds`

- 필수
- 복수 작품 지원

### `actorIds`

- 빈 배열 가능
- 빈 배열이면 작품 전체 촬영지 사용
- 복수 배우 선택 시 현재 OR 조건

### `durationMinutes`

현재 지원 값:

```text
180
240
300
```

각각:

```text
3시간
4시간
5시간
```

### `maxWalkingMinutes`

현재 지원 값:

```text
10
20
30
null
```

`null`은 도보 제한이 없다는 의미입니다.

---

# 4. Trip 처리 흐름

```text
contentIds
+
actorIds
↓
Candidate 조회
↓
Actor → Scene → Place Filtering
↓
활성 장소 확인
↓
좌표 확인
↓
중복 제거
↓
Route 조합 생성
↓
Haversine 기반 초기 거리 계산
↓
도보 조건 검증
↓
전체 여행 시간 검증
↓
조건을 만족하는 Route 선택
↓
Course 반환
```

초기 Course 생성 단계에서는
다수의 Route 조합을 빠르게 비교하기 위해
Haversine 기반 거리 계산을 사용합니다.

실제 Course 화면에서는 별도의 Walking Route API를 통해
TMAP 실제 보행 경로를 다시 조회합니다.

---

# 5. Walking Route

## `POST /api/routes/walking`

Course 전체 장소 목록을 한 번에 전달하면
서버에서 인접 장소별 TMAP 보행 경로를 조회합니다.

Frontend가 각 구간별 API 요청을 직접 보내지 않습니다.

---

## Request

```json
{
  "stops": [
    {
      "placeId": 1,
      "name": "장소 A",
      "latitude": 37.123,
      "longitude": 126.123
    },
    {
      "placeId": 2,
      "name": "장소 B",
      "latitude": 37.456,
      "longitude": 126.456
    }
  ]
}
```

---

## Server 처리

예:

```text
A
B
C
D
```

요청 시:

```text
Client
↓
POST /api/routes/walking 1회

Server
↓
A → B
B → C
C → D
↓
각 구간 TMAP 조회
↓
결과 통합
```

---

## Response

```json
{
  "data": {
    "segments": [
      {
        "fromPlaceId": 1,
        "toPlaceId": 2,
        "distanceMeters": 850,
        "durationSeconds": 720,
        "path": [
          {
            "latitude": 37.123,
            "longitude": 126.123
          }
        ],
        "success": true
      }
    ]
  }
}
```

주요 필드:

```text
fromPlaceId
toPlaceId
distanceMeters
durationSeconds
path
success
```

---

# 6. Walking Route 부분 실패

한 구간의 TMAP 요청 실패가
Course 전체 실패로 이어지지 않도록 구성합니다.

예:

```text
A → B
TMAP 성공

B → C
TMAP 실패

C → D
TMAP 성공
```

결과:

```text
A → B
실제 TMAP 경로

B → C
success: false

C → D
실제 TMAP 경로
```

Frontend는 실패한 구간만
Haversine 기반 거리와 예상 도보 시간으로 fallback 합니다.

---

## 좌표가 없는 구간

장소 하나에 유효한 좌표가 없더라도
Walking Route 요청 전체를 실패시키지 않습니다.

```text
A → B
정상 좌표
→ TMAP

B → C
C 좌표 없음
→ 해당 segment만 실패

C → D
정상 좌표
→ TMAP
```

이를 통해 한 장소의 좌표 문제 때문에
정상 조회 가능한 다른 구간까지 fallback 되는 것을 방지합니다.

---

# 7. Error Handling

API는 가능한 경우 다음 형태로 오류를 반환합니다.

```json
{
  "message": "오류 설명"
}
```

Frontend에서는 API 실패를 모두 동일하게 처리하지 않습니다.

현재 상태 기준:

```text
Blocking Error
Recoverable Error
Partial Failure
Empty
```

---

## Blocking Error

페이지의 핵심 기능을 사용할 수 없는 상태입니다.

예:

```text
잘못된 Course 데이터
```

---

## Recoverable Error

Retry를 통해 다시 시도할 수 있는 상태입니다.

예:

```text
촬영지 후보 조회 실패
```

---

## Partial Failure

일부 기능은 실패했지만
핵심 기능은 계속 사용할 수 있는 상태입니다.

예:

```text
TMAP 일부 구간 실패
Kakao Map 로딩 실패
localStorage 저장 실패
```

---

## Empty

요청 자체는 성공했지만
표시할 데이터가 없는 정상 상태입니다.

예:

```text
추가 가능한 촬영지 없음
검색 결과 없음
```

기술적인 DB 오류 메시지를 그대로 노출하지 않고
사용자가 현재 상태와 다음 행동을 이해할 수 있도록 표시합니다.