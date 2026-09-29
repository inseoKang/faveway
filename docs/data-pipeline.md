# Filming Data Pipeline

최종 업데이트: 2026-09-29.

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
전체 후보 443행과 우선 검수 167행 모두 `review_status = PENDING`입니다.
검수 완료나 Supabase 반영 완료로 해석하지 않습니다.

동일 후보가 여러 검수 플래그에 해당할 수 있으므로 플래그 개수는 단순 합산하지 않습니다.
`recommended_action`은 각 검수 행마다 하나를 선택합니다.

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
- 수동 검수 결과 기록과 승인 기준 확정
- 승인 데이터 Import 형식 및 DB 관계 연결 확인
- 검수 완료·DB 반영 여부를 별도로 기록
