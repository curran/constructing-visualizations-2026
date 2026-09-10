#!/usr/bin/env node

/**
 * fetch-migration-flows.mjs
 *
 * Downloads the U.S. Census Bureau's ACS 2016-2020 County-to-County Migration
 * Flows (current-residence sort) from census.gov and converts the official
 * Excel workbook into a tidy CSV edge list.
 *
 * The workbook contains one sheet per destination state (50 states + DC +
 * Puerto Rico). Each row is a county-to-county flow pair:
 *   "Current Residence"      = destination (where the person lives now)
 *   "Residence 1 Year Ago"   = origin      (where the person lived before)
 *   "Movers in County-to-County Flow" = weighted number of people moving
 *   "MOE"                    = 90% margin of error for that flow
 *
 * Rows whose origin is a foreign region or U.S. island area (not a U.S.
 * county) are excluded from the edge list (see README).
 *
 * Source:
 *   https://www2.census.gov/programs-surveys/demo/tables/geographic-mobility/2020/county-to-county-migration-2016-2020/county-to-county-migration-flows/county-to-county-2016-2020-current-residence-sort.xlsx
 *
 * Output (two files to avoid repeating county names on every row):
 *   county_to_county_flows.csv  — origin_geoid, dest_geoid, flow, moe
 *   county_geoids.csv           — geoid -> county_name, state_abbr lookup
 *
 * Run:  node fetch-migration-flows.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

const WORK_DIR = new URL(".", import.meta.url).pathname;
const CACHE_DIR = join(WORK_DIR, ".cache");
mkdirSync(CACHE_DIR, { recursive: true });

const XLSX_URL =
  "https://www2.census.gov/programs-surveys/demo/tables/geographic-mobility/2020/" +
  "county-to-county-migration-2016-2020/county-to-county-migration-flows/" +
  "county-to-county-2016-2020-current-residence-sort.xlsx";

const CACHE_FILE = join(CACHE_DIR, "county-to-county-2016-2020-current-residence-sort.xlsx");

// USPS abbreviations by state FIPS code.
const STATE_ABBR = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
  "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
  "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY", "72": "PR",
};

// ---------------------------------------------------------------------------
// ZIP + XLSX helpers
// ---------------------------------------------------------------------------

/**
 * Minimal ZIP reader: extracts entries that are stored (method 0) or
 * deflated (method 8). Returns a map of entry name -> Uint8Array.
 */
export function readZipBytes(bytes) {
  const LE = true;
  const buf = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u32 = (o) => buf.getUint32(o, LE);
  const u16 = (o) => buf.getUint16(o, LE);
  let eocd = -1;
  for (let i = bytes.byteLength - 22; i >= 0; i--) {
    if (u32(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not a ZIP archive (no EOCD record)");
  const count = u16(eocd + 10);
  let off = u32(eocd + 16);
  const entries = [];
  for (let n = 0; n < count; n++) {
    if (u32(off) !== 0x02014b50) throw new Error("bad central directory signature");
    const method = u16(off + 10);
    const csize = u32(off + 20), usize = u32(off + 24);
    const nameLen = u16(off + 28), extraLen = u16(off + 30), commentLen = u16(off + 32);
    const localOff = u32(off + 42);
    const name = new TextDecoder().decode(bytes.subarray(off + 46, off + 46 + nameLen));
    entries.push({ name, method, csize, usize, localOff });
    off += 46 + nameLen + extraLen + commentLen;
  }
  const files = {};
  for (const e of entries) {
    if (e.method !== 0 && e.method !== 8) continue;
    if (u32(e.localOff) !== 0x04034b50) throw new Error(`bad local header for ${e.name}`);
    const nameLen = u16(e.localOff + 26), extraLen = u16(e.localOff + 28);
    const dataStart = e.localOff + 30 + nameLen + extraLen;
    const raw = bytes.subarray(dataStart, dataStart + e.csize);
    files[e.name] = e.method === 0 ? raw.subarray(0, e.usize) : inflateRawSync(raw);
  }
  return files;
}

/**
 * Parse a single <worksheet> XML body into rows of { colLetter: value },
 * skipping header rows (rows 1-4 contain title/column labels).
 * Shared-string index cells are resolved via strings[].
 */
export function parseSheet(xml, strings) {
  const rows = [];
  const rowRe = /<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let m;
  while ((m = rowRe.exec(xml)) !== null) {
    const rowNum = parseInt(m[1], 10);
    if (rowNum < 5) continue;
    const body = m[2];
    const cells = {};
    const cellRe = /<c\b[^>]*r="([A-Z]+)\d+"(?:[^>]*t="([a-z])")?[^>]*?(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm;
    while ((cm = cellRe.exec(body)) !== null) {
      const col = cm[1];
      const type = cm[2];
      const inner = cm[3] ?? "";
      const vMatch = /<v>([\s\S]*?)<\/v>/.exec(inner);
      if (!vMatch) continue;
      const raw = vMatch[1];
      if (type === "s") {
        const idx = parseInt(raw, 10);
        cells[col] = strings[idx] ?? "";
      } else {
        cells[col] = raw;
      }
    }
    rows.push(cells);
  }
  return rows;
}

/**
 * Parse sharedStrings.xml into an array of strings.
 */
export function parseSharedStrings(xml) {
  const strings = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml)) !== null) {
    const inner = m[1];
    let text = "";
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let tm;
    while ((tm = tRe.exec(inner)) !== null) text += tm[1];
    strings.push(text);
  }
  return strings;
}

function csvEscape(v) {
  v = String(v);
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Download (with cache).
  if (!existsSync(CACHE_FILE)) {
    console.log(`Downloading ${XLSX_URL} ...`);
    const res = await fetch(XLSX_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(600000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${XLSX_URL}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    writeFileSync(CACHE_FILE, bytes);
    console.log(`  Saved ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB to .cache`);
  } else {
    console.log(`Using cached ${CACHE_FILE}`);
  }

  const b = readFileSync(CACHE_FILE);
  const files = readZipBytes(new Uint8Array(b.buffer, b.byteOffset, b.byteLength));
  const decoder = new TextDecoder();
  const strings = parseSharedStrings(decoder.decode(files["xl/sharedStrings.xml"]));
  console.log(`  Shared strings: ${strings.length}`);

  // Determine sheet file names in file order (sheet1.xml ... sheetN.xml).
  const sheetNames = Object.keys(files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort((a, x) => parseInt(a.match(/\d+/)[0], 10) - parseInt(x.match(/\d+/)[0], 10));
  console.log(`  Worksheets: ${sheetNames.length}`);

  const edges = [];
  let skippedForeign = 0;
  const geoidMap = new Map();

  for (const sheetFile of sheetNames) {
    const xml = decoder.decode(files[sheetFile]);
    const rows = parseSheet(xml, strings);
    for (const cells of rows) {
      const curState = cells.A ?? "";   // Current Residence State Code
      const curCounty = cells.B ?? "";  // Current Residence FIPS County Code
      const prevState = cells.C ?? "";  // Residence 1 Year Ago State Code
      const prevCounty = cells.D ?? ""; // Residence 1 Year Ago FIPS County Code
      const flowText = cells.AK ?? "";
      const moeText = cells.AL ?? "";

      if (!/^\d{3}$/.test(prevState) || !/^\d{3}$/.test(curState)) {
        if (flowText && flowText !== "0") skippedForeign++;
        continue;
      }
      const flow = Math.round(parseFloat(flowText));
      if (!Number.isNaN(flow) && flow <= 0) continue;

      // State codes are zero-padded to 3 digits in this workbook (e.g., "001");
      // the standard 5-digit county FIPS is the 2-digit state + 3-digit county.
      const originFips = prevState.slice(-2) + prevCounty;
      const destFips = curState.slice(-2) + curCounty;
      if (originFips.length !== 5 || destFips.length !== 5) continue;

      edges.push({
        origin_geoid: originFips,
        dest_geoid: destFips,
        flow,
        moe: Number.isNaN(parseFloat(moeText)) ? "" : Math.round(parseFloat(moeText)),
      });

      // Collect GEOID -> county name/state mappings from both endpoints.
      geoidMap.set(originFips, { name: cells.V ?? "", state: STATE_ABBR[prevState.slice(-2)] ?? prevState });
      geoidMap.set(destFips, { name: cells.F ?? "", state: STATE_ABBR[curState.slice(-2)] ?? curState });
    }
  }

  console.log(`  Domestic county-pair rows: ${edges.length}  (foreign rows skipped: ${skippedForeign})`);

  // Sort deterministically: destination, then origin.
  edges.sort((a, b) =>
    a.dest_geoid !== b.dest_geoid
      ? a.dest_geoid.localeCompare(b.dest_geoid)
      : a.origin_geoid.localeCompare(b.origin_geoid)
  );

  const flowColumns = ["origin_geoid", "dest_geoid", "flow", "moe"];
  const flowLines = [flowColumns.join(",")];
  for (const r of edges) {
    flowLines.push(flowColumns.map((c) => csvEscape(r[c] ?? "")).join(","));
  }
  const flowCsv = flowLines.join("\n") + "\n";
  const flowPath = join(WORK_DIR, "county_to_county_flows.csv");
  writeFileSync(flowPath, flowCsv, "utf8");
  console.log(
    `  Wrote ${flowPath} (${(flowCsv.length / 1024 / 1024).toFixed(1)} MB, ${edges.length} rows)`
  );

  // Lookup table: GEOID -> county name + state abbreviation. Sorted by GEOID.
  const lookupRows = [...geoidMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([geoid, info]) => ({ geoid, county_name: info.name, state_abbr: info.state }));
  const lookupColumns = ["geoid", "county_name", "state_abbr"];
  const lookupLines = [lookupColumns.join(",")];
  for (const r of lookupRows) {
    lookupLines.push(lookupColumns.map((c) => csvEscape(r[c] ?? "")).join(","));
  }
  const lookupCsv = lookupLines.join("\n") + "\n";
  const lookupPath = join(WORK_DIR, "county_geoids.csv");
  writeFileSync(lookupPath, lookupCsv, "utf8");
  console.log(
    `  Wrote ${lookupPath} (${(lookupCsv.length / 1024).toFixed(0)} KB, ${lookupRows.length} rows)`
  );

  // Summary stats.
  let totalMovers = 0;
  for (const r of edges) totalMovers += r.flow;
  const origins = new Set(edges.map((r) => r.origin_geoid));
  const dests = new Set(edges.map((r) => r.dest_geoid));
  console.log(`  Total movers: ${totalMovers.toLocaleString()}`);
  console.log(`  Unique origin counties: ${origins.size}; unique destination counties: ${dests.size}`);
}

if (import.meta.main) {
main().catch((err) => {
  console.error("\nFatal:", err);
  process.exit(1);
});
}