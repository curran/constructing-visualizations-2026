# ATUS — American Time Use Survey (2024)

**Minute-by-minute activity stream-graph data from the U.S. Bureau of Labor
Statistics' American Time Use Survey (ATUS), 2024 microdata.**

The ATUS is a continuous federal survey in which respondents keep a detailed
24-hour activity diary. This dataset aggregates the 2024 interview microdata
(139,535 activity records from 7,669 respondents) into **weighted population
proportions per activity tier at every minute of the day** — the raw material
for stream graphs, area charts, and "a day in the life" visualizations. It is
the canonical source for the rhythm of daily life: a swell of sleep at the
edges of the day, towering peaks of work and education mid-morning, and thin
slivers of eating and drinking at noon and 6 PM.

---

## Dataset Files

| File | Size | Rows | Granularity |
|---|---|---|---|
| `atus_streamgraph.csv` | 1.4 MB | 24,536 | minute × Tier-1 activity, all persons |
| `atus_streamgraph_15min_by_sex_age.csv` | 1.0 MB | 15,721 | 15-min × Tier-1 × sex × age group |

## Schema — `atus_streamgraph.csv`

| # | Column | Type | Description | Sample Value |
|---|---|---|---|---|
| 1 | `minute_of_day` | number | Wall-clock minute 0–1439 (0 = 12:00 AM) | `0` |
| 2 | `diary_minute` | number | Minute in ATUS diary frame 0–1439, where 0 = 4:00 AM | `1200` |
| 3 | `tier_code` | string | ATUS lexicon Tier-1 code (2 digits) | `01` |
| 4 | `tier_label` | string | Human-readable Tier-1 category | `Personal care` |
| 5 | `weighted_minutes` | number | Sample-weighted minutes spent in tier at that minute | `87582219104` |
| 6 | `share` | number | Weighted share of the population doing the tier (0–1) | `0.878` |

`share` sums to ≈ 1 across tiers within each minute (each respondent is doing
exactly one primary activity at any instant), so the rows stack directly into
a stream graph with `minute_of_day` on the x-axis.

## Schema — `atus_streamgraph_15min_by_sex_age.csv`

Same columns as above, plus:

| # | Column | Type | Description |
|---|---|---|---|
| 7 | `sex` | string | `male` or `female` |
| 8 | `age_group` | string | `15-24`, `25-34`, `35-44`, `45-54`, `55-64`, `65+` |

`minute_of_day` is the start of each 15-minute bin. Shares are computed within
each sex × age group, enabling side-by-side stream comparison (e.g., the
"sandwich generation" — how childcare and work reshape the day between ages
25 and 45).

## Tier-1 Activity Categories (ATUS Coding Lexicon)

| Code | Category | Code | Category |
|---|---|---|---|
| 01 | Personal care (incl. sleep) | 10 | Government services and civic obligations |
| 02 | Household activities | 11 | Eating and drinking |
| 03 | Caring for & helping household members | 12 | Socializing, relaxing, and leisure |
| 04 | Caring for & helping nonhousehold members | 13 | Sports, exercise, and recreation |
| 05 | Work and work-related activities | 14 | Religious and spiritual activities |
| 06 | Education | 15 | Volunteer activities |
| 07 | Consumer purchases | 16 | Telephone calls |
| 08 | Professional and personal care services | 18 | Traveling |
| 09 | Household services | 50 | Insufficient detail |

> The 2024 revision of the ATUS coding lexicon renumbered several Tier-1
> codes relative to earlier years (Work `04→05`, Education `05→06`, Eating
> `10→11`, Socializing `11→12`, Sports `12→13`, Volunteer `14→15`, Telephone
> `15→16`, Traveling `16→18`). Code `17` is unused in the 2024 lexicon; `50`
> marks activities with insufficient detail in the respondent's verbatim.

---

## Methodology

### Source

Official BLS 2024 ATUS microdata files:

```
https://www.bls.gov/tus/datafiles/atusact-2024.zip     (Activity file, 139,535 rows)
https://www.bls.gov/tus/datafiles/atusresp-2024.zip    (Respondent file, 7,669 respondents)
https://www.bls.gov/tus/datafiles/atusrost-2024.zip    (Roster file, household members)
```

Each ZIP contains a CSV data file (these files ship as `.dat` with comma
delimiters) that can be read with any statistical package.

### Processing Steps

1. **Download** the three microdata ZIPs from `bls.gov`. The BLS bot-protection
   layer occasionally rejects automated retrievers; the script falls back to
   identical copies of the same official files archived by the Internet Archive
   Wayback Machine.
2. **Read** the Activity file (one row per activity performed during the diary
   day, with `TUSTARTTIM` start time, `TUACTDUR24` duration, and `TUTIER1CODE`
   activity tier).
3. **Join** respondent days to their sampling weights (`TUFINLWGT` from the
   Respondent file) and demographics (`TEAGE`/`TESEX` from the Roster file,
   where `TULINENO = 1` marks the respondent).
4. **Enumerate** each activity into per-minute intervals, adding the
   respondent's weight to each (minute, tier) bucket. Durations carry across
   midnight naturally; the ATUS diary frame begins at 4:00 AM.
5. **Normalize** — for each minute, divide each tier's weighted minutes by the
   minute's total weighted minutes to get population shares summing to 1.

### Actual Statistics (2024)

| Metric | Value |
|---|---|
| Respondents | 7,669 |
| Activity records | 139,535 |
| Unique diary minutes covered | 1,440 |
| Tier-1 categories present | 18 (codes 01–16, 18, 50) |
| ~ share asleep at midnight (tier 01) | 87% |
| ~ share working at 2 PM (tier 05) | 29% |

### Prerequisites

- Node.js ≥ 18 (uses built-in `fetch`, `node:zlib`, and `DataView` — no
  external dependencies)

### Regeneration

```bash
cd public/datasets/atus
node fetch-atus.mjs
```

---

## Usage Ideas

- **Stream graph**: stack `share` by `tier_label` over `minute_of_day` (or
  `diary_minute` for the canonical 4 AM–4 AM day) using a silhouette/wiggle
  layout.
- **Line/area charts**: highlight a single tier across the day — e.g.,
  Work = `05`, Traveling = `18`, Eating = `11`.
- **Demographic comparison**: side-by-side small-multiple stream graphs of
  `sex` × `age_group` to reveal the "sandwich generation."
- **Animated clock**: react to the minute as a clock/sunburst.

---

## License

Public domain — U.S. federal government data (U.S. Bureau of Labor Statistics,
American Time Use Survey, 2024 microdata).