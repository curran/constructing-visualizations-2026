# Star Wars Social Network

**The character interaction network of the Star Wars film series (episodes
I–VII), from Evelina Gabasova's open-source `StarWars-social-network` data.**

Node-link data built from the movie scripts: characters are nodes, an edge
between two characters is created when they interact on screen (appear in the
same scene), and edge weights count shared scenes. Includes one network per
film episode plus the full series network.

---

## Dataset Files

| File | Size | Rows |
|---|---|---|
| `starwars_edges.csv` | 20 KB | 1,012 edges |
| `starwars_nodes.csv` | 6 KB | 298 node records |

## Schema — `starwars_edges.csv`

| # | Column | Type | Description | Sample Value |
|---|---|---|---|---|
| 1 | `episode` | string | Film episode `1`–`7`, or `all` for the full series | `1` |
| 2 | `source` | string | Source character name | `PADME` |
| 3 | `target` | string | Target character name | `R2-D2` |
| 4 | `value` | number | Number of shared scenes (edge weight) | `11` |

Edges are undirected in source data; each pair appears once. Node/edge counts
per episode: 1→(38/135), 2→(33/101), 3→(25/65), 4→(22/60), 5→(21/55),
6→(20/55), 7→(27/92), all→(112/450).

## Schema — `starwars_nodes.csv`

| # | Column | Type | Description | Sample Value |
|---|---|---|---|---|
| 1 | `episode` | string | Film episode `1`–`7`, or `all` | `1` |
| 2 | `name` | string | Character name (`QUI-GON`, `OBI-WAN`, …) | `R2-D2` |
| 3 | `value` | number | Number of scenes the character appears in | `33` |
| 4 | `colour` | string | Character color used by the original visualization | `#4f4fb1` |

---

## Methodology

### Source

```
https://github.com/evelinag/StarWars-social-network
  networks/starwars-episode-{1-7}-interactions-allCharacters.json
  networks/starwars-full-interactions-allCharacters.json
```

Evelina Gabasova extracted the networks from the film scripts using the
Stanford Named Entity Recognizer: an interaction occurs when two characters
appear in the same scene. The `-allCharacters` variants include characters with
zero interactions within an episode, making skeleton comparisons across
episodes possible (e.g., Luke, Leia, and Han appear even in prequel-only
analysis windows).

### Processing Steps

1. **Download** the 8 JSON network files from GitHub (raw.githubusercontent).
2. **Flatten** `nodes`, `links` (which reference nodes by index) into named
   edge records with `episode` tags.
3. **Write** edge and node CSVs, one file per episode plus `all`.

### Prerequisites

- Node.js ≥ 18 (`fetch` only — no external dependencies)

### Regeneration

```bash
cd public/datasets/starwars-social-network
node fetch-starwars.mjs
```

---

## Usage Ideas

- **Force-directed layout**: classic node-link; prequel hubs (Anakin,
  Obi-Wan) vs. original-trilogy hubs (Luke, Leia, Han).
- **Small multiples**: one layout per episode to show the narrative structure
  shifting across the saga.
- **Degree/centrality analysis**: who bridges the two trilogies?
- **Course use**: narrative network visualization, community detection.

---

## License

Data from the open-source `StarWars-social-network` repository by Evelina
Gabasova (MIT-licensed, free for research and education).