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

## Dataset Files

| File | Size | Rows | Contents |
|---|---|---|---|
| `county_to_county_flows.csv` | 4.3 MB | 254,348 | Directed county-pair edges (origin, destination, flow, MOE) |
| `county_geoids.csv` | 76 KB | 3,221 | GEOID → county name + state lookup (join key) |

**Flow network:** 254,348 directed edges, 3,220 origin counties, 3,219
destination counties, 18,061,885 total movers (2016–2020).

## Schema — `county_to_county_flows.csv` (4 columns)

| # | Column | Type | Description | Sample Value |
|---|---|---|---|---|
| 1 | `origin_geoid` | string | Origin county FIPS code (5-digit) | `01003` |
| 2 | `dest_geoid` | string | Destination county FIPS code | `01001` |
| 3 | `flow` | number | Weighted movers, origin → destination (2016–2020) | `30` |
| 4 | `moe` | number | Margin of error (90% confidence) for `flow` | `37` |

## Schema — `county_geoids.csv` (3 columns, lookup table)

| # | Column | Type | Description | Sample Value |
|---|---|---|---|---|
| 1 | `geoid` | string | County FIPS code (5-digit) | `01003` |
| 2 | `county_name` | string | County name | `Baldwin County` |
| 3 | `state_abbr` | string | State abbreviation | `AL` |

Each `geoid` appears once. The two files together form a **directed weighted
graph**: the edge `(01003 → 01001)` has weight 30, and joining `county_geoids.csv`
on `origin_geoid`/`dest_geoid` recovers county names and states. Aggregating
flows by state reproduces state inflow totals; joining on `geoid` with the
county boundary file gives geographic coordinates for arcs or flow maps.

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
6. **Split** into two files to avoid repeating county names on every edge:
   the narrow flow edge list (`origin_geoid`, `dest_geoid`, `flow`, `moe`) and
   a de-duplicated `geoid → county_name, state_abbr` lookup (3,221 rows,
   every geoid in the edge list resolves in it).

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
  by flow (join `county_geoids.csv` for labels).
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