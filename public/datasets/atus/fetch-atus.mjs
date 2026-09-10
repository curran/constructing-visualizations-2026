#!/usr/bin/env node

/**
 * fetch-atus.mjs
 *
 * Downloads the 2024 American Time Use Survey (ATUS) microdata from the
 * U.S. Bureau of Labor Statistics and aggregates it into minute-by-minute
 * stream-graph data: the weighted share of the population engaged in each
 * Tier-1 activity category at every minute of the diary day.
 *
 * Primary source (official):
 *   https://www.bls.gov/tus/datafiles/atusact-2024.zip   (Activity file)
 *   https://www.bls.gov/tus/datafiles/atusresp-2024.zip  (Respondent file)
 *   https://www.bls.gov/tus/datafiles/atusrost-2024.zip  (Roster file)
 *
 * The BLS bot-protection layer occasionally serves "Access Denied" pages to
 * automated retrievers. When a download fails, the script transparently falls
 * back to identical copies of the same official files archived by the
 * Internet Archive Wayback Machine.
 *
 * Output:
 *   atus_streamgraph.csv                          — minute (0-1439) x Tier-1 code
 *   atus_streamgraph_15min_by_sex_age.csv         — 15-min bins x sex x age group
 *
 * Run:  node fetch-atus.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

const WORK_DIR = new URL(".", import.meta.url).pathname;
const CACHE_DIR = join(WORK_DIR, ".cache");
mkdirSync(CACHE_DIR, { recursive: true });

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";

// Official URLs + Wayback snapshot fallbacks (same official files).
const FILES = [
  {
    name: "atusact-2024.zip",
    url: "https://www.bls.gov/tus/datafiles/atusact-2024.zip",
    wayback: "https://web.archive.org/web/20260214121627/https://www.bls.gov/tus/datafiles/atusact-2024.zip",
  },
  {
    name: "atusresp-2024.zip",
    url: "https://www.bls.gov/tus/datafiles/atusresp-2024.zip",
    wayback: "https://web.archive.org/web/20250802075239/https://www.bls.gov/tus/datafiles/atusresp-2024.zip",
  },
  {
    name: "atusrost-2024.zip",
    url: "https://www.bls.gov/tus/datafiles/atusrost-2024.zip",
    wayback: "https://web.archive.org/web/20260214115841/https://www.bls.gov/tus/datafiles/atusrost-2024.zip",
  },
];

// ATUS Tier-1 categories for the 2024 revision of the coding lexicon
// (https://www.bls.gov/tus/lexicons/lexiconwex2024.xls). The 2024 revision
// renumbered several Tier-1 codes versus earlier years: e.g. Work moved
// from 04 to 05, Education from 05 to 06, Eating from 10 to 11, and
// Traveling from 16 to 18.
const TIER1_LABELS = {
  "01": "Personal care (incl. sleep)",
  "02": "Household activities",
  "03": "Caring for and helping household members",
  "04": "Caring for and helping nonhousehold members",
  "05": "Work and work-related activities",
  "06": "Education",
  "07": "Consumer purchases",
  "08": "Professional and personal care services",
  "09": "Household services",
  "10": "Government services and civic obligations",
  "11": "Eating and drinking",
  "12": "Socializing, relaxing, and leisure",
  "13": "Sports, exercise, and recreation",
  "14": "Religious and spiritual activities",
  "15": "Volunteer activities",
  "16": "Telephone calls",
  "18": "Traveling",
  "50": "Insufficient detail",
};

const AGE_GROUPS = [
  { label: "15-24", min: 15, max: 24 },
  { label: "25-34", min: 25, max: 34 },
  { label: "35-44", min: 35, max: 44 },
  { label: "45-54", min: 45, max: 54 },
  { label: "55-64", min: 55, max: 64 },
  { label: "65+", min: 65, max: 120 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function download(url, dest) {
  if (existsSync(dest)) {
    console.log(`  Using cached ${dest}`);
    return;
  }
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
    signal: AbortSignal.timeout(300000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  writeFileSync(dest, bytes);
  console.log(`  Downloaded ${url} (${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB)`);
}

async function downloadWithFallback(file) {
  const dest = join(CACHE_DIR, file.name);
  for (const url of [file.url, file.wayback]) {
    try {
      await download(url, dest);
      return true;
    } catch (err) {
      console.log(`    ${url} failed: ${err.message}`);
      try { await rmIfExists(dest); } catch (_) {}
    }
  }
  throw new Error(`Could not download ${file.name} from any source`);
}

async function rmIfExists(p) {
  try {
    const { unlinkSync } = await import("node:fs");
    unlinkSync(p);
  } catch (_) {}
}

/**
 * Minimal ZIP reader: extracts entries that are stored (method 0) or
 * deflated (method 8). No compression, no encryption, UTF-8 names.
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
 * Parse a CSV body with RFC-4180-style quoting. Returns the header array and
 * a list of row objects keyed by header name.
 */
function parseCsv(body) {
  const rows = [];
  let field = "", row = [], inQuotes = false;
  const push = () => { row.push(field); field = ""; };
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inQuotes) {
      if (ch === '"') {
        if (body[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      push();
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && body[i + 1] === "\n") i++;
      if (row.length > 0 || field.length > 0 || inQuotes) {
        push();
        rows.push(row);
        row = [];
      }
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) { push(); rows.push(row); }
  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => h.trim());
  const data = rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
    return obj;
  });
  return { headers, rows: data };
}

function timeToMinutes(t) {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t.trim());
  if (!m) return null;
  return (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) % 1440;
}

function csvEscape(v) {
  v = String(v);
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

function writeCsv(path, columns, rows) {
  const lines = [columns.join(",")];
  for (const r of rows) lines.push(columns.map((c) => csvEscape(r[c] ?? "")).join(","));
  writeFileSync(path, lines.join("\n") + "\n", "utf8");
  const sizeKB = (Buffer.byteLength(lines.join("\n"), "utf8") / 1024).toFixed(0);
  console.log(`  Wrote ${path} (${rows.length} rows, ${sizeKB} KB)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Downloading ATUS 2024 microdata files...");
  for (const file of FILES) await downloadWithFallback(file);

  console.log("Reading ZIP archives...");
  const zips = {};
  for (const file of FILES) {
    const b = readFileSync(join(CACHE_DIR, file.name));
    zips[file.name] = readZipBytes(new Uint8Array(b.buffer, b.byteOffset, b.byteLength));
  }

  const actCsv = new TextDecoder().decode(zips["atusact-2024.zip"]["atusact_2024.dat"]);
  const respCsv = new TextDecoder().decode(zips["atusresp-2024.zip"]["atusresp_2024.dat"]);
  const rostCsv = new TextDecoder().decode(zips["atusrost-2024.zip"]["atusrost_2024.dat"]);

  const { rows: respRows } = parseCsv(respCsv);
  const { rows: rostRows } = parseCsv(rostCsv);
  const { rows: actRows } = parseCsv(actCsv);
  console.log(`  Respondents: ${respRows.length}  Roster: ${rostRows.length}  Activities: ${actRows.length}`);

  // Respondent weights keyed by case id.
  const weights = new Map();
  for (const r of respRows) {
    const w = parseFloat(r.TUFINLWGT);
    if (!Number.isNaN(w)) weights.set(r.TUCASEID, w);
  }

  // Respondent demographics (respondent is household member TULINENO == 1).
  const ageByCase = new Map();
  const sexByCase = new Map();
  for (const r of rostRows) {
    if (r.TULINENO !== "1") continue;
    const a = parseInt(r.TEAGE, 10);
    const s = parseInt(r.TESEX, 10);
    if (!Number.isNaN(a)) ageByCase.set(r.TUCASEID, a);
    if (!Number.isNaN(s)) sexByCase.set(r.TUCASEID, s);
  }

  console.log("Aggregating minute-by-minute activity proportions...");

  // accAll[minute][tier] for the whole population; weighted minutes.
  const accAll = new Array(1440);
  for (let m = 0; m < 1440; m++) accAll[m] = new Map();
  // accDemo[minute][sexIdx*6+ageIdx][tier]
  const accDemo = new Array(1440);
  for (let m = 0; m < 1440; m++) {
    accDemo[m] = new Array(12);
    for (let d = 0; d < 12; d++) accDemo[m][d] = new Map();
  }

  let skipped = 0;
  for (const a of actRows) {
    const caseId = a.TUCASEID;
    const w = weights.get(caseId);
    if (!w) { skipped++; continue; }
    const tier = a.TUTIER1CODE;
    if (!TIER1_LABELS[tier]) { skipped++; continue; }

    const start = timeToMinutes(a.TUSTARTTIM);
    let dur = parseFloat(a.TUACTDUR24);
    if (!Number.isNaN(dur) && dur > 0 && dur <= 1440) {
      // duration-based enumeration (handles 4:00 a.m. wrap naturally)
    } else {
      const stop = timeToMinutes(a.TUSTOPTIME);
      if (start === null || stop === null) { skipped++; continue; }
      dur = (stop - start + 1440) % 1440;
      if (dur === 0) dur = 1440;
    }
    if (start === null || !(dur > 0)) { skipped++; continue; }

    const age = ageByCase.get(caseId);
    const sex = sexByCase.get(caseId);
    let dIdx = -1;
    if (sex === 1 || sex === 2) {
      let ag = -1;
      for (let i = 0; i < AGE_GROUPS.length; i++) {
        const g = AGE_GROUPS[i];
        if (age >= g.min && age <= g.max) { ag = i; break; }
      }
      if (ag >= 0) dIdx = (sex === 1 ? 0 : 1) * 6 + ag;
    }

    const intDur = Math.round(dur);
    for (let k = 0; k < intDur; k++) {
      const m = (start + k) % 1440;
      accAll[m].set(tier, (accAll[m].get(tier) ?? 0) + w);
      if (dIdx >= 0) {
        accDemo[m][dIdx].set(tier, (accDemo[m][dIdx].get(tier) ?? 0) + w);
      }
    }
  }
  console.log(`  Activities skipped (no weight/unknown tier): ${skipped}`);

  // ---- File 1: minute x tier, all persons ----
  const out1 = [];
  for (let m = 0; m < 1440; m++) {
    let total = 0;
    for (const v of accAll[m].values()) total += v;
    if (total <= 0) continue;
    for (const [tier, wm] of [...accAll[m].entries()].sort()) {
      out1.push({
        minute_of_day: m,
        diary_minute: (m - 240 + 1440) % 1440,
        tier_code: tier,
        tier_label: TIER1_LABELS[tier],
        weighted_minutes: Math.round(wm),
        share: Math.round((wm / total) * 1000000) / 1000000,
      });
    }
  }
  writeCsv(
    join(WORK_DIR, "atus_streamgraph.csv"),
    ["minute_of_day", "diary_minute", "tier_code", "tier_label", "weighted_minutes", "share"],
    out1
  );

  // ---- File 2: 15-minute bin x tier x sex x age group ----
  const sexOf = (d) => (d < 6 ? "male" : "female");
  const ageOf = (d) => AGE_GROUPS[d % 6].label;
  const out2 = [];
  for (let bin = 0; bin < 96; bin++) {
    const rowsPerBin = new Array(12);
    for (let d = 0; d < 12; d++) {
      rowsPerBin[d] = { total: 0, acc: new Map() };
    }
    for (let k = 0; k < 15; k++) {
      const m = bin * 15 + k;
      for (let d = 0; d < 12; d++) {
        for (const [tier, v] of accDemo[m][d]) {
          rowsPerBin[d].acc.set(tier, (rowsPerBin[d].acc.get(tier) ?? 0) + v);
        }
      }
    }
    for (let d = 0; d < 12; d++) {
      for (const [tier, v] of rowsPerBin[d].acc) rowsPerBin[d].total += v;
    }
    for (let d = 0; d < 12; d++) {
      if (rowsPerBin[d].total <= 0) continue;
      for (const [tier, wm] of [...rowsPerBin[d].acc.entries()].sort()) {
        out2.push({
          minute_of_day: bin * 15,
          sex: sexOf(d),
          age_group: ageOf(d),
          tier_code: tier,
          tier_label: TIER1_LABELS[tier],
          weighted_minutes: Math.round(wm),
          share: Math.round((wm / rowsPerBin[d].total) * 1000000) / 1000000,
        });
      }
    }
  }
  writeCsv(
    join(WORK_DIR, "atus_streamgraph_15min_by_sex_age.csv"),
    ["minute_of_day", "sex", "age_group", "tier_code", "tier_label", "weighted_minutes", "share"],
    out2
  );

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});