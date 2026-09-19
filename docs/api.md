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

DB에 저장된 실제 촬영지 후보를 이용해
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

## Request Fields

### `contentIds`

- 필수
- 1개 이상
- 복수 작품 지원

### `actorIds`

- 빈 배열 가능
- 빈 배열이면 선택 작품 전체 촬영지 사용
- 값이 있으면 `Actor → Scene → Place` 관계로 후보 제한
- 복수 배우 선택 시 현재 OR 조건

### `durationMinutes`

현재 UI 지원 값:

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

현재 UI 지원 값:

```text
10
20
30
null
```

`null`은 한 구간 최대 도보 시간 제한을 적용하지 않는다는 의미입니다.

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
place_id 기준 중복 제거
↓
좌표 확인
↓
Route 조합 생성
↓
Haversine 기반 초기 거리 계산
↓
예상 도보 시간 계산
↓
구간별 최대 도보 시간 검증
↓
전체 여행 시간 검증
↓
조건을 만족하는 Route 중 총 이동거리 최소 Route 선택
↓
Course 반환
```

배우가 선택된 경우에는
배우가 작품에 출연했다는 사실만으로
작품 전체 촬영지를 배우 관련 장소로 사용하지 않습니다.

반드시 다음 관계를 사용합니다.

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

장소별 최소 체류 시간:

```text
45분
```

여행 시간별 최대 기본 방문 장소 수:

```text
180분 → 최대 2곳
240분 → 최대 3곳
300분 → 최대 4곳
```

최대 장소 수의 Route가 조건을 만족하지 않으면
장소 수를 하나씩 줄여 다시 탐색합니다.

```text
3곳 실패
↓
2곳 시도
↓
1곳 시도
```

1개 장소 Course도 정상 결과로 허용합니다.

초기 Course 선택은 빠른 Route 조합 비교를 위해
Haversine 기반 거리와 예상 도보 시간을 사용합니다.

Course 화면에 진입한 뒤에는
`POST /api/routes/walking`을 통해
TMAP 실제 보행 경로를 다시 조회합니다.

---

# 5. Trip Success Response

예:

```json
{
  "data": {
    "contentIds": [1],
    "actorIds": [3],
    "durationMinutes": 180,
    "maxWalkingMinutes": 10,
    "candidateSource": "ACTOR_SCENE",
    "candidateCount": 1,
    "routeSelectionReason": "ONLY_ONE_CANDIDATE",
    "totalDistanceKm": 0,
    "totalWalkingMinutes": 0,
    "stops": [
      {
        "contentId": 1,
        "contentTitle": "작품명",
        "placeId": 10,
        "order": 1,
        "stayMinutes": 180,
        "distanceFromPreviousKm": 0,
        "walkingMinutesFromPrevious": 0,
        "relationType": "filming_location",
        "verificationStatus": "verified",
        "verifiedFact": "검증된 장소 설명",
        "place": {}
      }
    ]
  }
}
```

---

## `candidateSource`

후보 생성 범위를 나타냅니다.

```text
ACTOR_SCENE
→ 배우가 등장한 Scene과 연결된 촬영지 기준

CONTENT
→ 선택 작품 전체 촬영지 기준
```

---

## `candidateCount`

작품 / 배우 조건을 적용한 뒤
좌표 검증까지 통과해 Course 계산에 사용할 수 있는 후보 장소 수입니다.

즉 다음 단계까지 통과한 장소 수입니다.

```text
작품 / 배우 조건
↓
활성 장소
↓
중복 제거
↓
좌표 검증
↓
candidateCount
```

---

## `routeSelectionReason`

최종 Course가 현재 장소 수로 선택된 이유를 나타냅니다.

### `NORMAL`

```text
2곳 이상의 유효한 Course 생성
```

### `ONLY_ONE_CANDIDATE`

```text
현재 조건에서
Course에 사용할 수 있는 후보 자체가 1곳
```

### `WALKING_LIMIT`

```text
후보는 여러 곳
+
최대 도보 시간 조건
↓
2곳 이상의 Route 불가
```

### `DURATION_LIMIT`

```text
후보는 여러 곳
+
여행 가능 시간 조건
↓
2곳 이상의 Route 불가
```

### `MULTIPLE_CONSTRAINTS`

```text
여행 시간
+
최대 도보 시간
↓
두 조건을 함께 적용하면
2곳 이상의 유효 Route 불가
```

Frontend는 1개 장소 Course를 Error로 처리하지 않고
이 값을 이용해 결과 이유와 다음 행동을 안내합니다.

---

# 6. 배우 조건 제거 재요청

배우 기준 후보가 부족한 경우
애플리케이션이 자동으로 작품 전체 범위로 확장하지 않습니다.

사용자가 다음 액션을 직접 선택한 경우에만 재요청합니다.

```text
배우 조건 없이 작품 전체로 넓혀보기
```

기존 요청:

```json
{
  "contentIds": [1],
  "actorIds": [3],
  "durationMinutes": 180,
  "maxWalkingMinutes": 10
}
```

범위 확장 요청:

```json
{
  "contentIds": [1],
  "actorIds": [],
  "durationMinutes": 180,
  "maxWalkingMinutes": 10
}
```

유지:

```text
contentIds
durationMinutes
maxWalkingMinutes
```

변경:

```text
actorIds
→ []
```

즉 작품, 여행 가능 시간, 최대 도보 시간은 유지하고
배우 필터만 제거합니다.

사용자의 명시적인 선택 없이
자동으로 배우 조건을 제거하지 않습니다.

---

# 7. Trip Error Handling

Trip API는 가능한 경우 다음 형태로 오류를 반환합니다.

```json
{
  "code": "ERROR_CODE",
  "message": "오류 설명"
}
```

---

## `INVALID_TRIP_CONDITIONS`

HTTP `400`

잘못된 작품 조건, 여행 시간 또는 최대 도보 시간이 전달된 경우입니다.

예:

```text
contentIds 없음
잘못된 durationMinutes
지원하지 않는 maxWalkingMinutes
```

---

## `NO_FILMING_LOCATIONS`

HTTP `404`

선택 조건과 연결된 촬영지가 없는 경우입니다.

배우가 선택된 경우에는
`Actor → Scene → Place` 관계 기준으로 후보가 없다는 의미입니다.

```text
Actor
↓
Scene
↓
Place

결과 없음
```

Frontend에서는 시스템 오류가 아니라
데이터가 없는 Empty 상태로 처리합니다.

---

## `NO_COORDINATED_FILMING_LOCATIONS`

HTTP `404`

촬영지는 존재하지만
Course 계산에 필요한 좌표가 등록된 장소가 없는 경우입니다.

```text
Place 존재
+
latitude / longitude 없음
↓
Course Candidate 없음
```

Place 자체가 잘못된 것은 아니므로
Explore / Detail에서는 계속 사용할 수 있습니다.

---

## `NO_AVAILABLE_ROUTE`

HTTP `422`

촬영지 후보는 존재하지만
현재 여행 조건을 만족하는 Route를 만들 수 없는 경우입니다.

예:

```text
여행 시간 부족
도보 조건 불충족
```

Frontend에서는 조건 변경을 유도하는
Empty 상태로 처리합니다.

---

## `TRIP_CANDIDATES_FETCH_FAILED`

HTTP `500`

Supabase에서 Course 후보를 조회하지 못한 경우입니다.

사용자 조건 문제가 아니라
데이터 조회 실패이므로 Error로 처리합니다.

---

## `TRIP_CREATION_FAILED`

HTTP `500`

예상하지 못한 Course 생성 오류가 발생한 경우입니다.

Frontend에서는 Error로 처리하고
가능한 경우 Retry를 제공합니다.

---

# 8. Walking Route

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

# 9. Walking Route 부분 실패

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
필요한 좌표가 유효한 경우
→ TMAP
```

문제가 있는 구간만 `success: false`로 반환하고,
정상 조회 가능한 다른 구간은 계속 TMAP을 사용합니다.

이를 통해 한 장소의 좌표 문제 때문에
정상 조회 가능한 다른 구간까지 fallback 되는 것을 방지합니다.

---

# 10. Frontend 상태 처리 기준

Frontend에서는 API 결과를 모두 같은 실패 상태로 처리하지 않습니다.

```text
Loading
Empty
Error
Partial / Fallback
Validation
```

---

## Loading

요청이 진행 중인 상태입니다.

예:

```text
Trip 생성 중
후보 촬영지 조회 중
TMAP Route 조회 중
```

기존 데이터가 있다면
가능한 범위에서 화면을 유지합니다.

---

## Empty

정상적으로 요청은 처리됐지만
현재 데이터 또는 조건으로 결과를 만들 수 없는 상태입니다.

예:

```text
NO_FILMING_LOCATIONS
NO_COORDINATED_FILMING_LOCATIONS
NO_AVAILABLE_ROUTE
추가 가능한 촬영지 없음
검색 결과 없음
```

사용자에게 가능한 다음 행동을 안내합니다.

```text
조건 다시 설정
작품 / 배우 다시 선택
배우 조건 없이 작품 전체로 범위 확장
```

---

## Error

데이터 조회 실패 또는 예상하지 못한 서버 오류입니다.

예:

```text
TRIP_CANDIDATES_FETCH_FAILED
TRIP_CREATION_FAILED
Network Error
```

Retry 가능한 경우
다시 시도할 수 있도록 안내합니다.

---

## Partial / Fallback

일부 기능은 실패했지만
핵심 Course는 계속 사용할 수 있는 상태입니다.

예:

```text
TMAP 일부 구간 실패
TMAP 전체 fallback
Kakao Map 실패
localStorage 저장 실패
```

일부 외부 기능의 실패 때문에
Course 전체를 사용할 수 없게 만들지 않습니다.

---

## Validation

사용자가 Course를 편집한 뒤
현재 여행 조건을 벗어난 상태입니다.

예:

```text
최대 도보 시간 초과
여행 가능 시간 초과
```

Course 자체는 유지하고
문제가 되는 조건을 안내합니다.

---

## 1개 장소 Course

오류나 Empty로 처리하지 않습니다.

```text
stops.length = 1
```

인 경우에도 Course를 정상 표시합니다.

`routeSelectionReason`을 기준으로
왜 1곳으로 구성됐는지 설명하고
원인에 맞는 다음 행동을 제공합니다.

예:

```text
ONLY_ONE_CANDIDATE
+
actorIds 존재
↓
배우 조건 없이 작품 전체로 넓혀보기
```

```text
WALKING_LIMIT
DURATION_LIMIT
MULTIPLE_CONSTRAINTS
↓
여행 조건 다시 설정하기
```

---

# 11. API 설계 원칙

## 1. 촬영지 사실은 DB에서 가져온다

```text
DB Place
→ 사용

AI Generated Place
→ 사용하지 않음
```

---

## 2. 배우 촬영지는 Scene 관계를 기준으로 한다

```text
Actor
↓
Scene
↓
Place
```

작품 출연 사실만으로
작품 전체 장소를 배우 촬영지로 처리하지 않습니다.

---

## 3. Empty와 Error를 구분한다

```text
정상 조회 + 결과 없음
→ Empty

API / DB / Network 실패
→ Error
```

---

## 4. 부분 실패가 전체 기능 실패로 전파되지 않게 한다

```text
TMAP 실패
→ 해당 구간 Haversine fallback
```

---

## 5. 데이터 부족 시 조건을 자동 변경하지 않는다

```text
Candidate 부족
↓
자동 범위 확장 X
↓
사용자에게 선택권 제공
```

사용자가 직접 선택한 경우에만
배우 조건을 제거해 Course를 다시 생성합니다.