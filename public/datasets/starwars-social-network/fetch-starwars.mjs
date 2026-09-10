#!/usr/bin/env node

/**
 * fetch-starwars.mjs
 *
 * Downloads the Star Wars character interaction networks from Evelina
 * Gabasova's open-source "StarWars-social-network" repository (GitHub) and
 * converts them into tidy CSV edge/node files.
 *
 * The network is built from the movie scripts: two characters are connected
 * when they interact on screen; edge weights count shared scenes.
 *
 * Source:
 *   https://github.com/evelinag/StarWars-social-network/tree/master/networks
 *
 * Output:
 *   starwars_edges.csv  (episode 1-7 + "all", source_char, target_char, value)
 *   starwars_nodes.csv  (episode 1-7 + "all", name, value, colour)
 *
 * Run:  node fetch-starwars.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WORK_DIR = new URL(".", import.meta.url).pathname;
const BASE =
  "https://raw.githubusercontent.com/evelinag/StarWars-social-network/master/networks";

const EPISODES = [1, 2, 3, 4, 5, 6, 7];
const USER_AGENT = "Mozilla/5.0";

function csvEscape(v) {
  v = String(v);
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

async function downloadJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

async function main() {
  const edgeRows = [];
  const nodeRows = [];

  const sources = [
    ...EPISODES.map((n) => ({
      episode: String(n),
      url: `${BASE}/starwars-episode-${n}-interactions-allCharacters.json`,
    })),
    {
      episode: "all",
      url: `${BASE}/starwars-full-interactions-allCharacters.json`,
    },
  ];

  for (const { episode, url } of sources) {
    console.log(`Fetching episode ${episode} ...`);
    const data = await downloadJson(url);
    const nodes = data.nodes ?? [];
    const links = data.links ?? [];

    for (const [i, node] of nodes.entries()) {
      nodeRows.push({
        episode,
        name: node.name,
        value: node.value,
        colour: node.colour ?? "",
        index: i,
      });
    }
    for (const link of links) {
      const src = nodes[link.source];
      const dst = nodes[link.target];
      edgeRows.push({
        episode,
        source: src?.name ?? link.source,
        target: dst?.name ?? link.target,
        value: link.value,
      });
    }
    console.log(`  ${nodes.length} nodes, ${links.length} edges`);
  }

  writeCsv(join(WORK_DIR, "starwars_edges.csv"),
    ["episode", "source", "target", "value"], edgeRows);
  writeCsv(join(WORK_DIR, "starwars_nodes.csv"),
    ["episode", "name", "value", "colour"], nodeRows);

  console.log("\nDone.");
}

function writeCsv(path, columns, rows) {
  const lines = [columns.join(",")];
  for (const r of rows) {
    lines.push(columns.map((c) => csvEscape(r[c] ?? "")).join(","));
  }
  writeFileSync(path, lines.join("\n") + "\n", "utf8");
  const sizeKB = (Buffer.byteLength(lines.join("\n"), "utf8") / 1024).toFixed(1);
  console.log(`Wrote ${path} (${rows.length} rows, ${sizeKB} KB)`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("\nFatal:", err);
    process.exit(1);
  });
}