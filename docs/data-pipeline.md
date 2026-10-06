# Filming Data Pipeline

최종 업데이트: 2026-10-06.

FAVEWAY는 원천 촬영지 데이터를 그대로 서비스 DB에 넣지 않고,
정규화와 중복 검수 과정을 거쳐 서비스 후보 데이터를 생성합니다.

## Data Sources

### KCCF

한국문화정보원 기반 촬영지 데이터입니다.

주요 컬럼:

- 콘텐츠 제목
- 장소명
- 장소 설명
- 주소
- 위도 / 경도
- 미디어 타입

### Blog

블로그 기반으로 수집된 드라마 촬영지 데이터입니다.

주요 컬럼:

- 콘텐츠명
- 촬영지
- 촬영지 주소
- 위도 / 경도

배우-작품 관계 데이터도 별도로 사용합니다.

## Pipeline Flow

Raw CSV  
↓  
작품명 / 주소 정규화  
↓  
대상 작품 및 서울 주소 필터  
↓  
작품 + 주소 기준 중복 제거  
↓  
KCCF / Blog 출처 병합  
↓  
배우 데이터 존재 여부 확인  
↓  
검수 후보 생성  
↓  
검수 이유 및 비교 대상 생성  
↓  
수동 검수  
↓  
Supabase Import

## Candidate Output

전체 촬영지 후보 파일:

`outputs/data-expansion/content_place_candidates.csv`

주요 컬럼:

- `content_title`
- `place_name`
- `address`
- `latitude`
- `longitude`
- `region`
- `kccf_exists`
- `blog_exists`
- `actor_data_exists`
- `source_count`
- `has_coordinates`
- `duplicate_name_candidate`
- `nearby_cross_source_candidate`
- `coordinate_duplicate_candidate`
- `address_quality`
- `review_priority`
- `review_status`
- `review_note`

## Review Output

우선 검수 대상 파일:

`outputs/data-expansion/content_place_review.csv`

Candidate Output의 기본 정보에 다음 검수 컨텍스트가 추가됩니다.

- `review_reason`
- `matched_place_name`
- `matched_address`
- `matched_source`
- `distance_meters`
- `recommended_action`

현재 검수 기준:

- 동일 작품에서 동일 장소명이 여러 주소로 존재하는 경우
- KCCF / Blog 촬영지 후보가 가까운 거리에 위치하는 경우
- 동일 작품에서 좌표가 동일하거나 매우 가까운 경우
- 서울 주소 형식이 불완전한 경우
- KCCF와 Blog 두 출처에서 동시에 확인된 경우

## Review Context

`review_reason`은 해당 후보가 검수 대상으로 선택된 이유를 나타냅니다.

현재 사용되는 주요 값:

- `SAME_PLACE_NAME`
- `COORDINATE_DUPLICATE`
- `NEARBY_CROSS_SOURCE`
- `MULTI_SOURCE`
- `ADDRESS_NEEDS_REVIEW`

여러 조건에 동시에 해당하는 경우 `|`로 연결합니다.

예:

`SAME_PLACE_NAME|NEARBY_CROSS_SOURCE`

`matched_place_name`, `matched_address`, `matched_source`는
현재 후보와 비교할 가치가 가장 높은 다른 후보의 정보를 제공합니다.

`distance_meters`는 두 후보의 좌표 사이 직선거리를 미터 단위로 나타냅니다.

이 정보는 자동 병합 기준이 아니라 사람이 검수하기 위한 참고 정보입니다.

## Recommended Action

`recommended_action`은 수동 검수 시 먼저 확인할 작업을 나타냅니다.

### `CHECK_MERGE`

동일 장소이거나 하나의 장소로 병합할 가능성이 있는 후보입니다.

자동 병합하지 않고 장소명, 주소, 출처를 확인한 뒤 판단합니다.

### `CHECK_NEARBY`

서로 다른 출처의 후보가 가까운 거리에 있습니다.

동일 장소인지, 같은 지역의 서로 다른 촬영 포인트인지 확인합니다.

### `CHECK_COORDINATES`

장소명이나 주소는 다르지만 좌표가 동일하거나 매우 가깝습니다.

원천 데이터의 좌표 정확성을 확인합니다.

### `CHECK_ADDRESS`

서울 주소 형식이 불완전하거나 주소 정보에 추가 검토가 필요합니다.

### `REVIEW`

다른 액션 조건에 해당하지 않을 때 사용하는 기본값입니다.
현재 출력 CSV에는 이 액션으로 분류된 행이 없습니다.

### `VERIFY_SOURCE`

KCCF와 Blog 두 출처에서 모두 확인된 후보입니다.

복수 출처 존재만으로 검증 완료 처리하지 않고 촬영 관계와 출처 내용을 확인합니다.

`recommended_action`은 자동 처리 명령이 아니라 검수 방향을 제안하는 참고 정보입니다.

## Review Priority

`HIGH`

- 좌표 중복 가능성이 있는 경우
- 주소 품질 검토가 필요한 경우

`MEDIUM`

- 동일 장소명 후보가 존재하는 경우
- 근거리 교차 출처 후보가 존재하는 경우
- KCCF와 Blog 두 출처에서 모두 확인된 경우

`LOW`

- 현재 우선 검수 대상이 아닌 경우

`review_priority`는 촬영 사실의 신뢰도 점수가 아닙니다.

사람이 먼저 확인할 데이터의 검수 우선순위를 의미합니다.

## Deduplication Policy

현재 1차 중복 제거 기준은 다음과 같습니다.

`정규화된 content_title + 정규화된 address`

위 표기는 비교 기준이며 별도의 normalized\_\* 출력 컬럼은 없습니다.

같은 작품과 같은 정규화 주소를 가진 데이터는 하나의 후보로 병합합니다.
현재 코드는 장소명이 다르더라도 이 키가 같으면 병합합니다.
같은 주소 안의 서로 다른 촬영 포인트를 자동 보존하는 예외는 구현되어 있지 않습니다.

장소명 / 위도 / 경도는 컬럼별 첫 번째 비어 있지 않은 값을 선택하고,
KCCF / Blog 존재 여부는 병합합니다.
같은 그룹의 서로 다른 행에서 위도와 경도가 선택될 가능성도 있어 좌표 검수가 필요합니다.

서로 다른 주소로 남은 후보 사이에서는:

- 동일 작품 + 동일 장소명
- 좌표 거리 5m 이하
- 교차 출처 + 좌표 거리 100m 이하

조건을 표시합니다.
이 비교는 추가 자동 병합이 아니라 수동 검수 후보를 만드는 단계입니다.

## Source Policy

현재 주요 출처는 다음과 같습니다.

- KCCF
- Blog

후보 데이터에는 각 출처의 존재 여부를 별도로 기록합니다.

예:

`kccf_exists = true`

`blog_exists = true`

`source_count = 2`

두 출처에 모두 존재한다고 해서 자동으로 검증 완료 처리하지 않습니다.

`source_count`는 검수 우선순위를 결정하기 위한 참고 정보입니다.

FAVEWAY DB의 `verification_status`와는 별개의 개념입니다.

## Actor Data

배우-작품 데이터는 촬영지 후보와 별도로 연결합니다.

배우가 작품에 출연했다는 이유만으로 해당 작품의 모든 촬영지를 배우 관련 장소로 취급하지 않습니다.

FAVEWAY의 배우 기반 촬영지 기준은 다음 관계를 따릅니다.

Actor  
↓  
Scene  
↓  
Place

Scene과 Place의 관계가 확인되지 않은 경우 배우 기반 촬영지로 자동 연결하지 않습니다.

## Raw Data Policy

원본 CSV는 직접 수정하지 않습니다.

원본 데이터는 다음 경로에서 로컬로 관리합니다.

`data/raw`

원본 CSV는 Git에 포함하지 않습니다.

`.gitignore`에서는 다음 패턴으로 제외합니다.

`data/raw/**/*.csv`

원본 데이터에 대한 설명만 `data/raw/README.md`에 기록합니다.

## Output Policy

파이프라인 실행 결과는 다음 경로에 생성합니다.

`outputs/data-expansion`

현재 생성 파일:

- `content_place_candidates.csv`
- `content_place_review.csv`

후보 파일은 Supabase에 바로 import하지 않습니다.

검수 후 승인된 데이터만 실제 서비스 DB에 반영합니다.

## Current Scope

현재 파이프라인 테스트 대상 작품:

- 도깨비
- 여신강림
- 빈센조
- 스타트업
- 사내맞선
- 그 해 우리는
- 오징어게임
- 미생
- 런온
- 알고있지만

현재 서비스 범위는 서울입니다.

## Current Pipeline Result

출력 CSV 집계 (2026-09-29 기준):

- 전체 촬영지 후보: 443개
- 우선 검수 후보: 167개
- 동일 장소명 후보: 32개
- 근거리 교차 출처 후보: 87개
- 좌표 중복 후보: 8개
- 주소 검토 필요: 1개

현재 검수 액션 분포:

- `CHECK_NEARBY`: 69개
- `VERIFY_SOURCE`: 59개
- `CHECK_MERGE`: 32개
- `CHECK_COORDINATES`: 6개
- `CHECK_ADDRESS`: 1개

현재 결과는 최종 서비스 데이터가 아니라 검수 전 후보 데이터입니다.
자동 생성 출력인 전체 후보 443행과 우선 검수 167행 모두 `review_status = PENDING`입니다.
별도로 보관하는 수동 검수 CSV의 누적 결과는 아래 Manual Review CSV History를 참고합니다.
검수 완료나 Supabase 반영 완료로 해석하지 않습니다.

동일 후보가 여러 검수 플래그에 해당할 수 있으므로 플래그 개수는 단순 합산하지 않습니다.
`recommended_action`은 각 검수 행마다 하나를 선택합니다.

## Manual Review CSV History

기록일: 2026-10-06. 아래 집계는 보관 중인 CSV 네 개를 직접 비교한 결과이며,
검수일은 파일의 `reviewed_at`을 기준으로 구분합니다.

### 파일 역할과 누적 과정

네 파일은 모두 **167행 · 34열**이며 헤더, 컬럼 순서, 후보 ID와 행 순서가 같습니다.
검수 전 파일에서 시작해 기존 검수 결과를 보존하면서 결정을 누적한 스냅샷입니다.
`MERGE`와 `REJECT`도 원본 후보 행을 삭제하지 않고 분류로 기록합니다.

| 단계                        | 파일                                                                                                                      | 이번 단계 반영 | REVIEWED | PENDING | NEW_PLACE | MERGE | REJECT | REVIEW | 미분류 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------: | -------: | ------: | --------: | ----: | -----: | -----: | -----: |
| 검수 전 기준본              | [content_place_decisions.csv](../data/manual/content_place_decisions.csv)                                                 |              0 |        0 |     167 |         0 |     0 |      0 |      0 |    167 |
| HIGH 검수                   | [content_place_decisions_high_reviewed.csv](../data/manual/content_place_decisions_high_reviewed.csv)                     |              9 |        9 |     158 |         6 |     2 |      1 |      0 |    158 |
| CHECK_MERGE 누적 검수       | [content_place_decisions_high_and_merge_reviewed.csv](../data/manual/content_place_decisions_high_and_merge_reviewed.csv) |             30 |       39 |     128 |        22 |    16 |      1 |      0 |    128 |
| CHECK_NEARBY 일부 누적 검수 | [content_place_decisions_reviewed_2026-10-02.csv](../data/manual/content_place_decisions_reviewed_2026-10-02.csv)         |             17 |       56 |     111 |        31 |    18 |      6 |      1 |    111 |

**현재 최신 수동 검수 기준 파일은 `content_place_decisions_reviewed_2026-10-02.csv`입니다.**
기본 이름의 `content_place_decisions.csv`는 아직 167건 모두 PENDING인 검수 전 기준본입니다.
이 문서화 작업에서는 파일을 이동·삭제·교체하지 않았으며, `history/` 폴더도 만들지 않았습니다.

### 1. HIGH 검수 — 2026-09-29

`CP-0001`부터 `CP-0009`까지 9건을 검수했습니다.
NEW_PLACE 6건, MERGE 2건, REJECT 1건이며 `reviewed_at`은 모두 `2026-09-29`입니다.

- 생활맥주 연신내점: `CP-0001 → CP-0002`로 병합하고 상세 주소가 있는 후보를 대표로 유지했습니다.
- 느린마을양조장: `CP-0003 → CP-0004`로 병합하고 강남점 상세 명칭과 주소를 사용했습니다.
- 에리트빌딩 `CP-0005`는 제외하고 촬영지 근거가 직접 연결되는 은성회관 `CP-0006`을 유지했습니다.
- 상사마을 `CP-0007`, `CP-0008`은 촬영 위치와 설명이 달라 별도 장소로 유지했습니다. 동일 좌표의 정확성은 재확인이 필요합니다.
- 수노래연습장 `CP-0009`는 과거 촬영지 후보로 유지했습니다. CSV에는 현재 폐업한 장소라는 검수 메모가 있으며 촬영 사실과 현재 영업 여부를 구분했습니다.

### 2. CHECK_MERGE 검수 — 2026-10-02

HIGH 단계에서 이미 검수한 CHECK_MERGE 2건을 보존하고 나머지 30건을 추가했습니다.
추가 분류는 NEW_PLACE 16건, MERGE 14건이며 누적 REVIEWED는 39건입니다.
이 단계 이후 CHECK_MERGE 미검수 행은 0건입니다.

동일한 장소명만으로 일괄 병합하지 않고 CSV의 검수 메모에 따라 대표 주소와 촬영 포인트를 구분했습니다.

- `CP-0029`, `CP-0030`은 원래 `대학로거리`로 표시되었으나, 각각 `창신동집`, `창신동주차장`으로 검수된 별도 장소입니다. 원본 `place_name`과 검수 후 `reviewed_place_name`을 구분해 읽어야 합니다.
- 중앙고등학교 입구와 대표 주소, 공원 전체 주소와 구체적인 내부 주소 등은 별도 촬영 포인트 근거 여부를 고려해 대표 후보로 통합했습니다.
- CSV에서 요구하는 병합 후보의 장면·출처 정보 보존은 후속 데이터 반영 작업입니다. 병합 ID 기록만으로 DB 관계 이전이 완료된 것은 아닙니다.

### 3. CHECK_NEARBY 일부 검수 — 2026-10-02

기존 39건을 그대로 보존하고 다음 17건을 추가했습니다.
NEW_PLACE 9건, MERGE 2건, REJECT 5건, REVIEW 1건입니다.

| 후보 ID   | 원본 장소명      | 분류        | 병합 대상 |
| --------- | ---------------- | ----------- | --------- |
| `CP-0013` | 자하슈퍼         | `NEW_PLACE` | —         |
| `CP-0017` | 감고당길         | `NEW_PLACE` | —         |
| `CP-0018` | 비토사진관       | `REVIEW`    | —         |
| `CP-0019` | 윤보선길         | `NEW_PLACE` | —         |
| `CP-0020` | 자하주택         | `NEW_PLACE` | —         |
| `CP-0021` | 창덕궁5길        | `NEW_PLACE` | —         |
| `CP-0024` | 자작나무이야기   | `NEW_PLACE` | —         |
| `CP-0028` | 개뿔앞           | `REJECT`    | —         |
| `CP-0031` | 덕성여고옆       | `REJECT`    | —         |
| `CP-0032` | 배스킨라빈스앞   | `REJECT`    | —         |
| `CP-0033` | 사간동골목       | `REJECT`    | —         |
| `CP-0034` | 사근용답간인도교 | `NEW_PLACE` | —         |
| `CP-0035` | 성수동           | `MERGE`     | `CP-0036` |
| `CP-0036` | 성수이로7길      | `NEW_PLACE` | —         |
| `CP-0041` | 용답역다리       | `MERGE`     | `CP-0034` |
| `CP-0042` | 이니스프리앞     | `REJECT`    | —         |
| `CP-0043` | 이화벽화마을     | `NEW_PLACE` | —         |

- `CP-0034`: 대표 명칭은 **사근용답간인도교**, 검수 주소는 **서울특별시 성동구 사근동 235-1**입니다. 용답역다리 `CP-0041`은 같은 촬영지의 다른 이름으로 판단해 병합했습니다.
- `CP-0036`: 대표 명칭은 **성수이로7길**, 검수 주소는 **서울특별시 성동구 연무장길 36**입니다. 넓은 지역명으로 표현된 성수동 `CP-0035`를 병합했습니다.
- 그 밖의 최근 결정 중 `review_note`가 비어 있는 행은 분류 결과까지만 기록된 상태입니다. CSV에 없는 세부 제외 사유나 외부 확인 근거를 이 문서에서 추정해 보충하지 않습니다.

### 최신본의 전체 병합 관계

MERGE 18건 모두 `merged_into_candidate_id`가 채워져 있으며,
대상 ID가 같은 파일에 존재하고 대상 분류는 모두 NEW_PLACE입니다. 자기 자신으로의 병합은 없습니다.
작품이 다른 동명 장소도 있으므로 장소명만으로 ID를 통합하지 않습니다.

| 병합 후보 | 원본 장소명       | 대표 후보 |
| --------- | ----------------- | --------- |
| `CP-0001` | 생활맥주 연신내점 | `CP-0002` |
| `CP-0003` | 느린마을양조장    | `CP-0004` |
| `CP-0026` | 감고당길          | `CP-0027` |
| `CP-0035` | 성수동            | `CP-0036` |
| `CP-0041` | 용답역다리        | `CP-0034` |
| `CP-0045` | 중앙고등학교      | `CP-0044` |
| `CP-0050` | 낙산공원          | `CP-0051` |
| `CP-0054` | 루카511           | `CP-0053` |
| `CP-0057` | 여의도공원        | `CP-0056` |
| `CP-0066` | 낙산공원          | `CP-0065` |
| `CP-0073` | 안국역            | `CP-0072` |
| `CP-0076` | 합정역            | `CP-0075` |
| `CP-0089` | 동작대교          | `CP-0090` |
| `CP-0092` | 서울로7017        | `CP-0091` |
| `CP-0093` | 석파랑            | `CP-0094` |
| `CP-0103` | 동작대교          | `CP-0104` |
| `CP-0112` | 양재시민의숲역    | `CP-0111` |
| `CP-0113` | 한강대교          | `CP-0114` |

### 상태 해석과 남은 작업

- `review_priority`의 HIGH는 검수 우선순위이고 `recommended_action`의 CHECK_MERGE / CHECK_NEARBY는 검수 방향입니다. 최종 분류인 `candidate_classification`과 구분합니다.
- `review_status = REVIEWED`는 검수 결과를 기록했다는 뜻입니다. 서비스 DB 반영 완료나 촬영 사실의 최종 검증 상태를 뜻하지 않습니다.
- `CP-0018` 비토사진관은 REVIEWED이지만 분류가 REVIEW이므로 추가 확인이 필요합니다. NEW_PLACE 승인 건수에 포함하지 않습니다.
- PENDING 111건은 CHECK_NEARBY 52건과 VERIFY_SOURCE 59건입니다. 이 111건 외에 REVIEW 1건과 기존 검수 메모의 좌표·정보 보완 과제가 남아 있습니다.
- NEW_PLACE 31건도 장소 후보 분류 결과입니다. Supabase에 31개 장소가 생성되었다는 의미가 아니며 Scene / Actor / Evidence 연결은 별도로 확인해야 합니다.

### 보존 및 확인 기준

- 다음 검수는 최신 누적 파일을 기준으로 진행하고 기존 스냅샷 네 개를 이력으로 보관합니다.
- 기존 `reviewed_at`은 덮어쓰지 않습니다. 최신본에는 `2026-09-29` 9건, `2026-10-02` 47건, 공란 111건이 있습니다. 문서 작성일인 2026-10-06을 검수일로 넣지 않습니다.
- 검수 전 기준본은 UTF-8 BOM이 없고 검수 결과 파일 세 개는 UTF-8 BOM이 있습니다. 이후 스냅샷도 UTF-8 BOM CSV로 저장합니다.
- 단계별 비교에서 행·열 수, 헤더 및 후보 ID 순서가 같고 앞 단계의 REVIEWED 행이 그대로 유지됨을 확인했습니다.
- 새 스냅샷을 추가하면 이 표의 집계와 최신 기준 파일을 함께 갱신합니다. 병합·제외 행을 삭제하거나 미검수 항목을 완료로 간주하지 않습니다.

## Import Flow

최종 데이터 반영 흐름은 다음과 같습니다.

Raw Data  
↓  
Normalize  
↓  
Filter  
↓  
Deduplicate  
↓  
Merge Sources  
↓  
Generate Candidates  
↓  
Generate Review Candidates  
↓  
Add Review Context  
↓  
Manual Review  
↓  
Approved Data  
↓  
Supabase Import

검수 과정에서 촬영 사실, Scene, Episode, Actor 등장 여부 등 확인되지 않은 정보는 추측해서 생성하지 않습니다.

## 구현 범위와 다음 작업

현재 스크립트는 CSV 두 개를 작성하고 요약을 출력합니다.
OpenAI 호출, 온라인 출처 검증, Scene 생성, Supabase 쓰기는 수행하지 않습니다.
수동 검수 → Approved Data → Supabase Import는 운영 흐름이며 이 스크립트의 구현 범위 밖입니다.

KCCF 원천은 `미디어타입 = drama`를 대상으로 하고,
Blog는 `blog_drama_*.csv` 중 배우 파일을 제외해 읽습니다.
현재 대상 작품은 코드의 `TARGET_CONTENTS` 10개로 제한합니다.
주소를 정규화한 뒤 `서울특별시`로 시작하는 행을 서울 후보로 사용합니다.
이는 좌표 기반 행정구역 판정이 아닙니다.

`actor_data_exists`는 해당 작품의 배우 데이터 파일 기록 존재 여부입니다.
Scene Actor 또는 배우의 해당 장소 촬영 사실을 확인한 값이 아닙니다.
`has_coordinates`는 위도·경도가 결측치가 아닌지 확인한 값이며 좌표 정확성 검증 결과가 아닙니다.

검수 비교 대상은 좌표 중복 → 동일 장소명 → 근거리 교차 출처 순으로 선택하고,
동일 우선순위에서는 거리를 비교합니다.
`review_reason`은 선택된 비교 대상의 이유와 복수 출처 / 주소 검토 사유를 조합하므로,
모든 후보와의 비교 사유를 빠짐없이 나열한 목록은 아닙니다.

다음 작업:

- 같은 주소의 다른 촬영 포인트 보존 기준 검토
- 대표 장소명과 좌표 선택 방식 검토
- 남은 수동 검수 및 REVIEW 항목 재확인, 승인 기준 확정
- 승인 데이터 Import 형식 및 DB 관계 연결 확인
- 검수 완료·DB 반영 여부를 별도로 기록
