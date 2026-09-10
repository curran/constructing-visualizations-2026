# Programming Languages Influence Network

**A directed graph of 1,219 programming languages connected by influence
relations, derived from the Freebase/Wikidata knowledge graph.**

Root languages (C, Lisp, Smalltalk) have massive influence footprints; most
languages are terminal leaves. The network exhibits classic scale-free,
power-law topology and groups naturally by programming paradigm — the ideal
dataset for teaching node-link diagrams, hierarchy discovery, and force-
directed layouts (and an antidote to the familiar "influence" cliché graphs).

---

## Dataset Files

| File | Size | Rows |
|---|---|---|
| `languages.csv` | 73 KB | 1,219 nodes |
| `influence_edges.csv` | 76 KB | 1,139 edges |
| `paradigms.csv` | 3 KB | 55 paradigm categories |

## Schema — `languages.csv`

| # | Column | Type | Description | Sample Value |
|---|---|---|---|---|
| 1 | `label` | string | Language name | `C++` |
| 2 | `id` | string | Knowledge-graph identifier (Freebase/Wikidata) | `/en/cplusplus` |
| 3 | `size` | number | Influence magnitude (larger = more influential) | `33` |
| 4 | `paradigms` | string | Paradigm tags, `; ` separated | `Object-oriented programming; Functional programming; …` |
| 5 | `paradigm_count` | number | Number of paradigm tags | `5` |

## Schema — `influence_edges.csv`

| # | Column | Type | Description | Sample Value |
|---|---|---|---|---|
| 1 | `language` | string | Influenced language (graph node) | `C++` |
| 2 | `language_id` | string | Knowledge identifier of the language | `/en/cplusplus` |
| 3 | `influenced_by` | string | Influencing language/paradigm (graph node) | `ALGOL 68` |
| 4 | `influenced_by_id` | string | Knowledge identifier of the influencer | `/en/algol_68` |

Influence flows **from** `influenced_by` **to** `language`. 402 languages
influence at least one other language; 817 have no incoming influence edges.

## Schema — `paradigms.csv`

| # | Column | Type | Description | Sample Value |
|---|---|---|---|---|
| 1 | `name` | string | Paradigm name | `Object-oriented programming` |
| 2 | `id` | string | Knowledge identifier | `/en/object-oriented_programming` |
| 3 | `language_count` | number | Languages tagged with the paradigm | `198` |

---

## Methodology

### Source

```
https://github.com/yaph/programming-languages-influence  (data.json)
```

Ramiro Gómez assembled the network from Wikidata/Freebase entities: each
language lists the languages (and language families) that influenced it, with
a `size` field representing influence magnitude.

### Processing Steps

1. **Download** `data.json` from GitHub.
2. **Flatten** `langs` (nodes) and their `influencedby` lists (directed edges)
   into CSV rows, preserving knowledge-graph ids and paradigm tags.
3. **Emit** the paradigm catalog with per-paradigm language counts.

### Prerequisites

- Node.js ≥ 18 (`fetch` only — no external dependencies)

### Regeneration

```bash
cd public/datasets/programming-languages-influence
node fetch-langs.mjs
```

---

## Usage Ideas

- **Force-directed node-link**: color by primary paradigm; observe the dense
  hub of influential languages and the long tail of leaves.
- **Tree/hierarchy**: walk influence paths backward from any language to its
  roots (e.g., JavaScript ← Java ← C ← ALGOL).
- **Degree analysis**: log-log degree distribution reveals scale-free
  topology; count influencers vs. influenced.
- **Circular packing / treemap**: `size`-weighted language bubbles grouped by
  paradigm.

---

## License

Data © Ramiro Gómez (`yaph/programming-languages-influence`, MIT-licensed),
derived from public Freebase/Wikidata data. Free for research and education.