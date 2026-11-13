// Guards the QA case system (docs/qa/README.md): the catalogue, the registro and the tests must agree.
// Fails (exit 1) when:
//  - a test file cited in docs/qa/casos.md does not exist under src/ (renamed or deleted);
//  - a case ID of the catalogue has no row in docs/qa/registro.md, or the registro names an unknown ID;
//  - a case whose tests live in src/qa/ has no test title with its ID (an emptied suite stays visible);
//  - a test title cites a case, bug or gap ID that the catalogue does not know;
//  - a `.fails` or `.todo` test does not name the bug (B-nn) it waits for.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const AREAS = ["VUE", "NAV", "SON", "SUB", "NIV", "IRA", "EST", "REF", "BIO", "IMP", "VID", "EVA", "ING", "NNT", "MIS", "UI", "CV", "PX"];
const CASE = new RegExp(`\\b(?:${AREAS.join("|")})-\\d{2}\\b`, "g");
const ISSUE = /\b(?:B|HC)-\d{2}\b/g;

const casos = readFileSync("docs/qa/casos.md", "utf8");
const registro = readFileSync("docs/qa/registro.md", "utf8");
const errors = [];

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};
const files = walk("src");
const testNames = new Set(files.filter((f) => f.endsWith(".test.ts")).map((f) => f.split(/[\\/]/).pop()));

// Catalogue rows: | ID | ... |, an ID only counts where it opens a table row (possibly struck through).
const rows = new Map();
let section = "";
for (const line of casos.split("\n")) {
  if (line.startsWith("#")) section = line;
  // The race table repeats CV IDs to say how each crossing is provoked: not a definition.
  if (/con carrera/i.test(section)) continue;
  const m = line.match(/^\|\s*(?:~~)?([A-Z]{2,3}-\d{2})(?:~~)?\s*\|/);
  if (m && AREAS.includes(m[1].split("-")[0])) {
    if (rows.has(m[1])) errors.push(`casos.md: ${m[1]} aparece dos veces`);
    rows.set(m[1], line);
  }
}
const issues = new Set();
for (const line of casos.split("\n")) {
  const m = line.match(/^\|\s*((?:B|HC)-\d{2})\s*\|/);
  if (m) issues.add(m[1]);
}
if (rows.size === 0) errors.push("casos.md: no se encontró ningún caso (¿cambió el formato de las tablas?)");

// 1. Cited test files exist.
for (const [id, line] of rows) {
  for (const f of line.match(/[\w.-]+\.test\.ts/g) ?? []) {
    if (/rama `/.test(line)) continue; // tests that live on another branch
    if (!testNames.has(f)) errors.push(`casos.md ${id}: no existe ${f} en src/`);
  }
}

// 2. Registro rows: every case has one, and nothing unknown.
const reg = new Set();
for (const line of registro.split("\n")) {
  if (!line.startsWith("|")) continue;
  const first = line.split("|")[1] ?? "";
  for (const id of first.match(CASE) ?? []) reg.add(id);
}
for (const id of rows.keys()) if (!reg.has(id)) errors.push(`registro.md: falta la fila de ${id}`);
for (const id of reg) if (!rows.has(id)) errors.push(`registro.md: ${id} no está en casos.md`);

// 3. Test titles.
const titled = new Set();
const TITLE = /\b(?:it|test)(\.fails|\.todo|\.skip|\.only)?\(\s*(["'`])((?:\\.|(?!\2).)*)\2/g;
for (const f of files.filter((x) => x.endsWith(".test.ts"))) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(TITLE)) {
    const [, mod, , title] = m;
    for (const id of title.match(CASE) ?? []) {
      titled.add(id);
      if (!rows.has(id)) errors.push(`${f}: el test «${title.slice(0, 60)}…» cita ${id}, que no está en casos.md`);
    }
    for (const id of title.match(ISSUE) ?? []) if (!issues.has(id)) errors.push(`${f}: el test cita ${id}, que no está en la tabla de bugs y huecos`);
    if ((mod === ".fails" || mod === ".todo") && !/\bB-\d{2}\b/.test(title)) errors.push(`${f}: «${title.slice(0, 60)}…» es ${mod} sin el B-nn que espera`);
    if (mod === ".only") errors.push(`${f}: hay un .only`);
  }
}
for (const [id, line] of rows) if (/`src\/qa\/|`[\w-]+\.test\.ts`/.test(line) && id.startsWith("CV-") && !titled.has(id)) errors.push(`${id}: cita tests de src/qa pero ningún título lleva su ID`);

for (const e of errors) console.error(e);
if (errors.length) {
  console.error(`\n${errors.length} problema(s) en el sistema de casos (docs/qa/README.md).`);
  process.exit(1);
}
console.log(`Casos OK: ${rows.size} casos, ${titled.size} con tests que llevan su ID, ${issues.size} bugs y huecos.`);
