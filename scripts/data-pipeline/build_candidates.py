from pathlib import Path
import math
import re

import pandas as pd


ROOT = Path(__file__).resolve().parents[2]

KCCF_FILMING_PATH = (
    ROOT
    / "data"
    / "raw"
    / "kccf"
    / "한국문화정보원_미디어콘텐츠_영상촬영지.csv"
)

KCCF_ARTIST_PATH = (
    ROOT
    / "data"
    / "raw"
    / "kccf"
    / "k-culture_drama_artist.csv"
)

BLOG_DIR = ROOT / "data" / "raw" / "blog"
BLOG_ARTIST_PATH = BLOG_DIR / "blog_drama_artist.csv"

OUTPUT_DIR = ROOT / "outputs" / "data-expansion"

CANDIDATE_OUTPUT_PATH = (
    OUTPUT_DIR / "content_place_candidates.csv"
)

REVIEW_OUTPUT_PATH = (
    OUTPUT_DIR / "content_place_review.csv"
)


TARGET_CONTENTS = [
    "도깨비",
    "여신강림",
    "빈센조",
    "스타트업",
    "사내맞선",
    "그 해 우리는",
    "오징어게임",
    "미생",
    "런온",
    "알고있지만",
]


CONTENT_ALIASES = {
    "그해우리는": "그 해 우리는",
    "그 해 우리는": "그 해 우리는",
    "오징어 게임": "오징어게임",
    "오징어게임": "오징어게임",
    "호텔델루나": "호텔 델루나",
}


NEARBY_DISTANCE_METERS = 100
COORDINATE_DUPLICATE_METERS = 5


def normalize_text(value: object) -> str:
    if pd.isna(value):
        return ""

    text = str(value).strip()
    text = re.sub(r"\s+", " ", text)

    return text


def normalize_content_title(value: object) -> str:
    text = normalize_text(value)

    if not text:
        return ""

    compact = re.sub(r"\s+", "", text)

    for alias, canonical in CONTENT_ALIASES.items():
        alias_compact = re.sub(r"\s+", "", alias)

        if compact == alias_compact:
            return canonical

    return text


def normalize_address(value: object) -> str:
    text = normalize_text(value)

    if not text:
        return ""

    replacements = {
        "서울시 ": "서울특별시 ",
        "서울 ": "서울특별시 ",
    }

    for source, target in replacements.items():
        if text.startswith(source):
            text = target + text[len(source):]
            break

    text = re.sub(r"\s+", " ", text)

    return text


def normalize_place_name(value: object) -> str:
    return normalize_text(value)


def is_seoul_address(address: str) -> bool:
    return address.startswith("서울특별시")


def load_kccf_filming() -> pd.DataFrame:
    df = pd.read_csv(KCCF_FILMING_PATH)

    df = df[
        df["미디어타입"]
        .astype(str)
        .str.lower()
        .eq("drama")
    ].copy()

    return pd.DataFrame(
        {
            "content_title": df["제목"].map(
                normalize_content_title
            ),
            "place_name": df["장소명"].map(
                normalize_place_name
            ),
            "address": df["주소"].map(
                normalize_address
            ),
            "latitude": pd.to_numeric(
                df["위도"],
                errors="coerce",
            ),
            "longitude": pd.to_numeric(
                df["경도"],
                errors="coerce",
            ),
            "kccf_exists": True,
            "blog_exists": False,
        }
    )


def load_blog_filming() -> pd.DataFrame:
    files = sorted(
        BLOG_DIR.glob("blog_drama_*.csv")
    )

    files = [
        path
        for path in files
        if path.name != "blog_drama_artist.csv"
    ]

    frames: list[pd.DataFrame] = []

    for path in files:
        df = pd.read_csv(path)

        frame = pd.DataFrame(
            {
                "content_title": df["콘텐츠명"].map(
                    normalize_content_title
                ),
                "place_name": df["촬영지"].map(
                    normalize_place_name
                ),
                "address": df["촬영지 주소"].map(
                    normalize_address
                ),
                "latitude": pd.to_numeric(
                    df["위도"],
                    errors="coerce",
                ),
                "longitude": pd.to_numeric(
                    df["경도"],
                    errors="coerce",
                ),
                "kccf_exists": False,
                "blog_exists": True,
            }
        )

        frames.append(frame)

    if not frames:
        return pd.DataFrame(
            columns=[
                "content_title",
                "place_name",
                "address",
                "latitude",
                "longitude",
                "kccf_exists",
                "blog_exists",
            ]
        )

    return pd.concat(
        frames,
        ignore_index=True,
    )


def load_artist_contents() -> set[str]:
    frames: list[pd.DataFrame] = []

    if KCCF_ARTIST_PATH.exists():
        frames.append(
            pd.read_csv(KCCF_ARTIST_PATH)
        )

    if BLOG_ARTIST_PATH.exists():
        frames.append(
            pd.read_csv(BLOG_ARTIST_PATH)
        )

    if not frames:
        return set()

    df = pd.concat(
        frames,
        ignore_index=True,
    )

    contents = (
        df["콘텐츠명"]
        .map(normalize_content_title)
        .dropna()
        .astype(str)
        .str.strip()
    )

    return {
        content
        for content in contents
        if content
    }


def choose_first_non_empty(
    series: pd.Series,
) -> object:
    for value in series:
        if pd.isna(value):
            continue

        if (
            isinstance(value, str)
            and not value.strip()
        ):
            continue

        return value

    return None


def haversine_distance_meters(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    earth_radius = 6_371_000

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)

    delta_lat = math.radians(
        lat2 - lat1
    )
    delta_lon = math.radians(
        lon2 - lon1
    )

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad)
        * math.cos(lat2_rad)
        * math.sin(delta_lon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a),
    )

    return earth_radius * c


def detect_address_quality(
    address: str,
) -> str:
    if not address:
        return "NEEDS_REVIEW"

    if not address.startswith(
        "서울특별시 "
    ):
        return "NEEDS_REVIEW"

    seoul_district_pattern = (
        r"서울특별시\s+"
        r"[가-힣]+구(?:\s|$)"
    )

    if not re.search(
        seoul_district_pattern,
        address,
    ):
        return "NEEDS_REVIEW"

    return "OK"


def add_duplicate_name_flags(
    df: pd.DataFrame,
) -> pd.DataFrame:
    result = df.copy()

    counts = (
        result.groupby(
            [
                "content_title",
                "place_name",
            ]
        )["address"]
        .transform("count")
    )

    result[
        "duplicate_name_candidate"
    ] = counts > 1

    return result


def add_coordinate_flags(
    df: pd.DataFrame,
) -> pd.DataFrame:
    result = df.copy()

    result[
        "nearby_cross_source_candidate"
    ] = False

    result[
        "coordinate_duplicate_candidate"
    ] = False

    for _, group in result.groupby(
        "content_title"
    ):
        indices = list(group.index)

        for i in range(len(indices)):
            index_a = indices[i]

            row_a = result.loc[index_a]

            if (
                pd.isna(row_a["latitude"])
                or pd.isna(
                    row_a["longitude"]
                )
            ):
                continue

            for j in range(
                i + 1,
                len(indices),
            ):
                index_b = indices[j]

                row_b = result.loc[index_b]

                if (
                    pd.isna(
                        row_b["latitude"]
                    )
                    or pd.isna(
                        row_b["longitude"]
                    )
                ):
                    continue

                distance = (
                    haversine_distance_meters(
                        float(
                            row_a[
                                "latitude"
                            ]
                        ),
                        float(
                            row_a[
                                "longitude"
                            ]
                        ),
                        float(
                            row_b[
                                "latitude"
                            ]
                        ),
                        float(
                            row_b[
                                "longitude"
                            ]
                        ),
                    )
                )

                if (
                    distance
                    <= COORDINATE_DUPLICATE_METERS
                ):
                    result.loc[
                        index_a,
                        "coordinate_duplicate_candidate",
                    ] = True

                    result.loc[
                        index_b,
                        "coordinate_duplicate_candidate",
                    ] = True

                cross_source = (
                    (
                        row_a["kccf_exists"]
                        and row_b["blog_exists"]
                    )
                    or (
                        row_a["blog_exists"]
                        and row_b["kccf_exists"]
                    )
                )

                if (
                    cross_source
                    and distance
                    <= NEARBY_DISTANCE_METERS
                ):
                    result.loc[
                        index_a,
                        "nearby_cross_source_candidate",
                    ] = True

                    result.loc[
                        index_b,
                        "nearby_cross_source_candidate",
                    ] = True

    return result


def calculate_review_priority(
    row: pd.Series,
) -> str:
    if (
        row[
            "coordinate_duplicate_candidate"
        ]
        or row[
            "address_quality"
        ]
        == "NEEDS_REVIEW"
    ):
        return "HIGH"

    if (
        row[
            "duplicate_name_candidate"
        ]
        or row[
            "nearby_cross_source_candidate"
        ]
        or row["source_count"] == 2
    ):
        return "MEDIUM"

    return "LOW"


def build_candidates() -> pd.DataFrame:
    kccf = load_kccf_filming()
    blog = load_blog_filming()

    combined = pd.concat(
        [kccf, blog],
        ignore_index=True,
    )

    combined = combined[
        combined[
            "content_title"
        ].isin(TARGET_CONTENTS)
    ].copy()

    combined = combined[
        combined["address"].map(
            is_seoul_address
        )
    ].copy()

    combined = combined[
        combined["address"] != ""
    ].copy()

    grouped = (
        combined.groupby(
            [
                "content_title",
                "address",
            ],
            as_index=False,
            dropna=False,
        )
        .agg(
            {
                "place_name":
                    choose_first_non_empty,
                "latitude":
                    choose_first_non_empty,
                "longitude":
                    choose_first_non_empty,
                "kccf_exists": "max",
                "blog_exists": "max",
            }
        )
    )

    artist_contents = (
        load_artist_contents()
    )

    grouped["region"] = "서울"

    grouped[
        "actor_data_exists"
    ] = grouped[
        "content_title"
    ].isin(artist_contents)

    grouped["source_count"] = (
        grouped[
            "kccf_exists"
        ].astype(int)
        + grouped[
            "blog_exists"
        ].astype(int)
    )

    grouped[
        "has_coordinates"
    ] = (
        grouped[
            "latitude"
        ].notna()
        & grouped[
            "longitude"
        ].notna()
    )

    grouped[
        "address_quality"
    ] = grouped[
        "address"
    ].map(
        detect_address_quality
    )

    grouped = (
        add_duplicate_name_flags(
            grouped
        )
    )

    grouped = (
        add_coordinate_flags(
            grouped
        )
    )

    grouped[
        "review_priority"
    ] = grouped.apply(
        calculate_review_priority,
        axis=1,
    )

    grouped["review_status"] = (
        "PENDING"
    )

    grouped["review_note"] = ""

    priority_order = {
        "HIGH": 0,
        "MEDIUM": 1,
        "LOW": 2,
    }

    grouped[
        "_priority_sort"
    ] = grouped[
        "review_priority"
    ].map(priority_order)

    grouped = grouped.sort_values(
        by=[
            "_priority_sort",
            "content_title",
            "source_count",
            "place_name",
        ],
        ascending=[
            True,
            True,
            False,
            True,
        ],
    )

    grouped = grouped.drop(
        columns=[
            "_priority_sort",
        ]
    )

    grouped = grouped[
        [
            "content_title",
            "place_name",
            "address",
            "latitude",
            "longitude",
            "region",
            "kccf_exists",
            "blog_exists",
            "actor_data_exists",
            "source_count",
            "has_coordinates",
            "duplicate_name_candidate",
            "nearby_cross_source_candidate",
            "coordinate_duplicate_candidate",
            "address_quality",
            "review_priority",
            "review_status",
            "review_note",
        ]
    ]

    return grouped.reset_index(
        drop=True
    )


def build_review_candidates(
    candidates: pd.DataFrame,
) -> pd.DataFrame:
    review_mask = (
        (
            candidates[
                "source_count"
            ]
            == 2
        )
        | candidates[
            "duplicate_name_candidate"
        ]
        | candidates[
            "nearby_cross_source_candidate"
        ]
        | candidates[
            "coordinate_duplicate_candidate"
        ]
        | (
            candidates[
                "address_quality"
            ]
            == "NEEDS_REVIEW"
        )
    )

    return (
        candidates[
            review_mask
        ]
        .copy()
        .reset_index(drop=True)
    )


def print_summary(
    candidates: pd.DataFrame,
    review_candidates: pd.DataFrame,
) -> None:
    print(
        "\n"
        + "=" * 80
    )

    print(
        "FAVEWAY filming data "
        "pipeline summary"
    )

    print(
        "=" * 80
    )

    print(
        f"총 후보 수: "
        f"{len(candidates)}"
    )

    print(
        f"우선 검수 후보 수: "
        f"{len(review_candidates)}"
    )

    print()

    if candidates.empty:
        print(
            "후보 데이터가 없습니다."
        )
        return

    summary = (
        candidates.groupby(
            "content_title"
        )
        .agg(
            candidate_count=(
                "address",
                "count",
            ),
            both_sources=(
                "source_count",
                lambda values: int(
                    (
                        values == 2
                    ).sum()
                ),
            ),
            high_priority=(
                "review_priority",
                lambda values: int(
                    (
                        values
                        == "HIGH"
                    ).sum()
                ),
            ),
            medium_priority=(
                "review_priority",
                lambda values: int(
                    (
                        values
                        == "MEDIUM"
                    ).sum()
                ),
            ),
            actor_data_exists=(
                "actor_data_exists",
                "max",
            ),
        )
        .reset_index()
    )

    print(
        summary.to_string(
            index=False
        )
    )

    print()

    print(
        "Review flags:"
    )

    print(
        "- 동일 장소명 후보: "
        f"{int(candidates['duplicate_name_candidate'].sum())}"
    )

    print(
        "- 근거리 교차 출처 후보: "
        f"{int(candidates['nearby_cross_source_candidate'].sum())}"
    )

    print(
        "- 좌표 중복 후보: "
        f"{int(candidates['coordinate_duplicate_candidate'].sum())}"
    )

    print(
        "- 주소 검토 필요: "
        f"{int((candidates['address_quality'] == 'NEEDS_REVIEW').sum())}"
    )


def main() -> None:
    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    candidates = build_candidates()

    review_candidates = (
        build_review_candidates(
            candidates
        )
    )

    candidates.to_csv(
        CANDIDATE_OUTPUT_PATH,
        index=False,
        encoding="utf-8-sig",
    )

    review_candidates.to_csv(
        REVIEW_OUTPUT_PATH,
        index=False,
        encoding="utf-8-sig",
    )

    print_summary(
        candidates,
        review_candidates,
    )

    print()

    print(
        "전체 후보 생성 완료:"
    )

    print(
        CANDIDATE_OUTPUT_PATH
    )

    print()

    print(
        "검수 후보 생성 완료:"
    )

    print(
        REVIEW_OUTPUT_PATH
    )


if __name__ == "__main__":
    main()