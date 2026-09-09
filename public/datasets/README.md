# Datasets

A collection of public datasets curated for the Constructing Visualizations course.
Each dataset is stored as a clean CSV file alongside a script that documents how
it was generated.

Total: **24 datasets**, **33 CSV files** (~49 MB combined).

## Dataset Index

| Dataset | CSV File(s) | Size | Rows | Source |
|---|---|---|---|---|
| `palmer-penguins` | `penguins.csv` | 15K | 344 | GitHub (palmerpenguins R pkg) |
| `npm-top-packages` | `npm-top-10000.csv` | 8.0K | 12 | npm Registry API (partial) |
| `yrbss-2023` | `yrbss_2023.csv` | 12K | 151 | Published CDC rates |
| `fred-macro` | `fred_macro.csv` | 16K | 313 | FRED CSV download |
| `un-m49` | `un_m49_hierarchy.csv` | 20K | 280 | ISO-3166 with Regions |
| `starwars-social-network` | `starwars_edges.csv` + `starwars_nodes.csv` | 24K + 8.0K | 1,012 + 298 | GitHub (evelinag) |
| `programming-languages-influence` | `languages.csv` + `influence_edges.csv` + `paradigms.csv` | 80K + 76K + 4.0K | 1,219 + 1,139 + 55 | GitHub (yaph) |
| `pew-religion` | `pew_religion.csv` | 96K | 1,289 | Pew Research ZIP |
| `openrouter-models` | `openrouter_models.csv` | 112K | 365 | OpenRouter API |
| `statsbomb` | `statsbomb_shots.csv` | 132K | 1,495 | StatsBomb GitHub |
| `census-county-boundaries` | `county_boundaries.csv` | 216K | 3,223 | Census Gazetteer |
| `bls-qcew` | `bls_qcew_county_all_industries_2024.csv` | 228K | 3,138 | Derived (`00` code, 2024 only) |
| `cdc-places` | `cdc_places.csv` | 272K | 3,145 | data.cdc.gov |
| `acs-5yr-county` | `acs_5yr_county.csv` | 304K | 3,223 | Census API + Gazetteer |
| `ga4-ecommerce` | `ga4_ecommerce.csv` | 368K | 7,328 | Synthetic GA4 ecommerce |
| `bls-qcew` | `bls_qcew_county_all_industries.csv` | 1.2M | 15,686 | Derived (`00` code, all years) |
| `bls-qcew` | `bls_qcew_county_manufacturing.csv` | 1.1M | 15,562 | Derived (`31-33` code, all years) |
| `atus` | `atus_streamgraph.csv` + `atus_streamgraph_15min_by_sex_age.csv` | 1.4M + 1.0M | 24,536 + 15,721 | BLS ATUS 2024 microdata |
| `nyc-tlc` | `nyc_tlc_trips.csv` | 1.6M | 24,119 | NYC S3 + DuckDB |
| `un-wpp-2024` | `un_wpp_2024.csv` | 1.9M | 16,966 | World Bank API |
| `nasa-exoplanets` | `nasa_exoplanets.csv` | 2.5M | 27,522 | NASA TAP API |
| `noaa-storm-events` | `noaa_storm_events_2024.csv` | 4.0M | 69,802 | NOAA NCEI |
| `bls-qcew` | `bls_qcew_county_2024.csv` | 5.4M | 65,355 | Derived (all codes, 2024 only) |
| `bls-laus` | `bls_laus_county.csv` | 6.2M | 119,104 | BLS FTP |
| `online-retail-ii` | `online_retail_ii.csv` | 8.1M | 127,531 | UCI ML Repository |
| `bts-od-survey` | `bts_airline_routes.csv` + `bts_airports.csv` | 8.5M + 516K | 244,966 + 6,054 | BTS TranStats + DuckDB |
| `acs-migration-flows` | `county_to_county_flows.csv` + `county_geoids.csv` | 4.3M + 76K | 254,348 + 3,221 | Census ACS 5-yr flows |

## Notes

- All datasets were downloaded from public APIs or portals — no authentication required
  for most sources. Exceptions noted in each dataset's README.
- **ga4-ecommerce** uses realistic synthetic data (BigQuery access unavailable).
- **un-wpp-2024** uses the UN World Population Prospects 2024 estimates.
- **atus** aggregates the official BLS 2024 ATUS microdata into weighted,
  minute-by-minute activity shares for stream graphs (the "rhythm of daily life").
- **acs-migration-flows** contains the ACS 2016-2020 county-to-county migration
  flows (the latest county-pair vintage) as a directed edge list keyed by FIPS
  code, plus a compact `geoid → county/state` lookup table.
- Each dataset subdirectory contains the CSV file(s), a generation script (`.mjs`), and a README
  with schema documentation and methodology.

## Generation

All datasets were generated in parallel by orchestrating agent workers, each
responsible for one dataset.

To regenerate a specific dataset:

```bash
cd {dataset-name}
node fetch-{name}.mjs
```