#!/usr/bin/env node

/**
 * fetch-langs.mjs
 *
 * Downloads the programming-languages influence network from Ramiro Gómez's
 * "programming-languages-influence" repository (GitHub) and converts it into
 * tidy CSV node/edge files.
 *
 * The graph is derived from the Freebase/Wikidata knowledge graph: a directed
 * edge points from a language to the languages/paradigms that influenced it.
 * Each language carries a `size` (influence magnitude) and a set of paradigms
 * (programming paradigm categories).
 *
 * Source:
 *   https://github.com/yaph/programming-languages-influence (data.json)
 *
 * Output:
 *   languages.csv        (nodes: language, id, size, paradigms, paradigm_count)
 *   influence_edges.csv  (edges: language, influenced_by, + knowledge ids)
 *   paradigms.csv        (paradigm list with language counts)
 *
 * Run:  node fetch-langs.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WORK_DIR = new URL(".", import.meta.url).pathname;
const DATA_URL =
  "https://raw.githubusercontent.com/yaph/programming-languages-influence/master/data.json";
const USER_AGENT = "Mozilla/5.0";

function csvEscape(v) {
  v = String(v);
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
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

async function main() {
  console.log(`Fetching ${DATA_URL} ...`);
  const res = await fetch(DATA_URL, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${DATA_URL}`);
  const data = await res.json();

  const langs = data.langs ?? [];
  console.log(`  ${langs.length} languages`);

  // ---- languages.csv ----
  const langRows = [];
  for (const l of langs) {
    const paradigms = (l.paradigms ?? []).map((p) => p.name);
    langRows.push({
      label: l.label,
      id: l.id ?? "",
      size: l.size ?? "",
      paradigms: paradigms.join("; "),
      paradigm_count: paradigms.length,
    });
  }
  writeCsv(join(WORK_DIR, "languages.csv"),
    ["label", "id", "size", "paradigms", "paradigm_count"], langRows);

  // ---- influence_edges.csv ----
  const edgeRows = [];
  let edgeCount = 0;
  for (const l of langs) {
    for (const inf of l.influencedby ?? []) {
      edgeRows.push({
        language: l.label,
        language_id: l.id ?? "",
        influenced_by: inf.name,
        influenced_by_id: inf.id ?? "",
      });
      edgeCount++;
    }
  }
  writeCsv(join(WORK_DIR, "influence_edges.csv"),
    ["language", "language_id", "influenced_by", "influenced_by_id"], edgeRows);
  console.log(`  ${edgeCount} directed influence edges`);

  // ---- paradigms.csv ----
  const paraRows = (data.paradigms ?? []).map((p) => ({
    name: p.name,
    id: p.id ?? "",
    language_count: p.count ?? "",
  }));
  writeCsv(join(WORK_DIR, "paradigms.csv"),
    ["name", "id", "language_count"], paraRows);

  console.log("\nDone.");
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("\nFatal:", err);
    process.exit(1);
  });
}