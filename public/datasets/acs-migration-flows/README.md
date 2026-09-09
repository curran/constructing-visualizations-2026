# ACS County-to-County Migration Flows

**Directed "people movement" network of U.S. county-to-county migration, from
the Census Bureau's 2016–2020 American Community Survey (ACS 5-year).**

Every row is one directed origin → destination county pair, with the weighted
number of people who lived in the origin county one year ago and now live in
the destination county. This is the classic network for geographic flow
visualizations — county polygons as nodes, migration as weighted, directed
edges — and it joins directly to the other county datasets in this collection
(`acs-5yr-county`, `bls-laus`, `bls-qcew`, `census-county-boundaries`) via the
5-digit county FIPS code (`geoid`).

---

## Dataset File

| File | Size | Rows | Origin Counties | Destination Counties | Total Movers |
|---|---|---|---|---|---|
| `county_to_county_flows.csv` | 13.2 MB | 254,348 | 3,220 | 3,219 | 18,061,885 |

## Schema (8 columns)

| # | Column | Type | Description | Sample Value |
|---|---|---|---|---|
| 1 | `origin_geoid` | string | Origin county FIPS code (5-digit) | `01003` |
| 2 | `origin_county` | string | Origin county name | `Baldwin County` |
| 3 | `origin_state` | string | Origin state abbreviation | `AL` |
| 4 | `dest_geoid` | string | Destination county FIPS code | `01001` |
| 5 | `dest_county` | string | Destination county name | `Autauga County` |
| 6 | `dest_state` | string | Destination state abbreviation | `AL` |
| 7 | `flow` | number | Weighted movers, origin → destination (2016–2020) | `30` |
| 8 | `moe` | number | Margin of error (90% confidence) for `flow` | `37` |

A tuple of row 1 + rows like this forms a **directed weighted graph**: the edge
`(01003 → 01001)` has weight 30. Aggregating by `dest_state` reproduces state
inflow totals; `origin_geoid` plus the county boundary `geoid` gives geographic
coordinates for arcs or flow maps.

---

## Methodology

### Source

```
https://www2.census.gov/programs-surveys/demo/tables/geographic-mobility/2020/
  county-to-county-migration-2016-2020/county-to-county-migration-flows/
  county-to-county-2016-2020-current-residence-sort.xlsx
```

This workbook (one sheet per current-residence state: 50 states + DC + Puerto
Rico) is the Census Bureau's official county-to-county migration flows file for
the 2016–2020 ACS 5-year period. "Movers in County-to-County Flow" counts
people whose current and previous residences are both U.S. counties.

### Processing Steps

1. **Download** the official Excel workbook (~49 MB).
2. **Parse** each state sheet (rows 5+; rows 1–4 are title/column headers).
3. **Resolve** shared-string cells and extract per row:
   - Current Residence State/FIPS County Code and name (destination)
   - Residence 1 Year Ago State/FIPS County Code and name (origin)
   - `Movers in County-to-County Flow` and its MOE
4. **Build** 5-digit FIPS codes (`state(2) + county(3)`) for both endpoints.
5. **Exclude** rows whose origin is a foreign region or U.S. island area
   (10,219 rows; 1.86M movers) — these have no U.S. county endpoint — and
   zero-flow rows. 254,348 county-pair rows remain.

### Actual Statistics (2016–2020)

| Metric | Value |
|---|---|
| Directed county-pair rows | 254,348 |
| Unique origin counties | 3,220 |
| Unique destination counties | 3,219 |
| Total county-to-county movers | 18,061,885 |
| Largest flow | 38,761 (Los Angeles County, CA → Orange County, CA) |
| Top destination state by volume | Texas |

### Prerequisites

- Node.js ≥ 18 (uses built-in `fetch`, `node:zlib`, `DataView` — no external
  dependencies)

### Regeneration

```bash
cd public/datasets/acs-migration-flows
node fetch-migration-flows.mjs
```

---

## Usage Ideas

- **Chord/arc diagram**: county-to-county arcs on a U.S. map, alpha-weighted
  by flow.
- **Node-link diagram**: state-aggregated flows as a 51-node directed network.
- **Choropleth**: net migration per county computed from in/out flows.
- **Small multiples / animation**: top destination by county, or "where do
  people in my county move to?"
- **Course use**: geographic network visualization; joins to ACS county
  demographics and boundary files by `geoid`.

---

## License

Public domain — U.S. federal government data (U.S. Census Bureau, 2016–2020
American Community Survey 5-year estimates).