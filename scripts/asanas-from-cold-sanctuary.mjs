// Brings Cold Sanctuary's asanas over to Codeship (docs/design/esqueleto.md), so they are not retyped by hand.
// Cold Sanctuary writes its postures as C# code (Assets/Scripts/Asana/*.cs): expression-bodied helpers such as
// `Spine(x)`, `Hinge(hip)` or `ArmsUp`, and tables of postures. This script turns those C# expressions into
// JavaScript (BodyPart.X → "X", new Vector3 → V, new[] { } → [ ], tuples → T(...)), evaluates them with the
// same helpers, and writes the result, still in Unity's convention (left-handed, X right, degrees, Euler ZXY),
// to src/modules/body/data/cold-sanctuary-asanas.ts. The axis change to Three.js lives in TypeScript, tested.
//
// Usage: node scripts/asanas-from-cold-sanctuary.mjs [ruta/a/cold-sanctuary]   (or COLD_SANCTUARY_DIR)
//        node scripts/asanas-from-cold-sanctuary.mjs --check   fails if the generated file is out of date.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const check = args.includes("--check");
const dir = args.find((a) => !a.startsWith("-")) ?? process.env.COLD_SANCTUARY_DIR ?? "../videnacry/cold-sanctuary";
const OUT = "src/modules/body/data/cold-sanctuary-asanas.ts";
const ASANA = join(dir, "Assets/Scripts/Asana");
if (!existsSync(ASANA)) {
  console.error(`No encuentro Cold Sanctuary en ${dir} (pasa la ruta o COLD_SANCTUARY_DIR).`);
  process.exit(2);
}
const read = (f) => readFileSync(join(ASANA, f), "utf8");

// --- C# → JS ------------------------------------------------------------------------------------------

/** The text between the bracket at `open` and its match. */
function matching(src, open) {
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const stack = [];
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"') {
      i = src.indexOf('"', i + 1);
      continue;
    }
    if (pairs[c]) stack.push(pairs[c]);
    else if (c === ")" || c === "]" || c === "}") {
      if (stack.pop() !== c) throw new Error(`Paréntesis descuadrado en ${src.slice(open, open + 60)}`);
      if (!stack.length) return i;
    }
  }
  throw new Error("Paréntesis sin cerrar");
}

/** Splits at the commas that are not inside brackets or strings. */
function splitTop(s) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') i = s.indexOf('"', i + 1);
    else if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    else if (c === "," && depth === 0) {
      out.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (s.slice(start).trim()) out.push(s.slice(start).trim());
  return out;
}

const stripComments = (s) => s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

/** A C# expression of the posture vocabulary as JavaScript. */
function js(expr) {
  let s = stripComments(expr)
    .replace(/System\.Array\.Empty<[^>]*>\(\)/g, "[]")
    .replace(/new \(BodyPart, Vector3\)\[0\]/g, "[]")
    .replace(/new \(BodyPart(?: part)?, Vector3(?: euler)?\)\[\]\s*\{/g, "new[] {")
    .replace(/(\d+(?:\.\d+)?)f\b/g, "$1")
    .replace(/new Vector3\(/g, "V(")
    .replace(/(?<![\w>])\(\s*BodyPart\.(\w+)\s*,/g, 'T("$1",')
    .replace(/BodyPart\.(\w+)/g, '"$1"')
    .replace(/Mathf\./g, "Math.")
    .replace(/SunSalutation\./g, "SunSalutation.");
  // new[] { a, b } → [ a, b ]
  for (let i = s.indexOf("new[]"); i >= 0; i = s.indexOf("new[]")) {
    const open = s.indexOf("{", i);
    const close = matching(s, open);
    s = s.slice(0, i) + "[" + s.slice(open + 1, close) + "]" + s.slice(close + 1);
  }
  return s;
}

/** Expression-bodied static members of a class body: `Name => expr;` and `Name(params) => expr;`. */
function members(body) {
  const out = [];
  const re = /static\s+(?:readonly\s+)?[\w.<>,()\[\] ]*?\s(\w+)\s*(\([^)]*\))?\s*=>/g;
  for (let m; (m = re.exec(body)); ) {
    let i = m.index + m[0].length;
    let depth = 0;
    let j = i;
    for (; j < body.length; j++) {
      const c = body[j];
      if (c === '"') j = body.indexOf('"', j + 1);
      else if ("([{".includes(c)) depth++;
      else if (")]}".includes(c)) depth--;
      else if (c === ";" && depth === 0) break;
    }
    const params = m[2]
      ? splitTop(m[2].slice(1, -1)).map((p) => {
          const [decl, def] = p.replace(/^params\s+/, "").split("=");
          const name = decl.trim().split(/\s+/).pop();
          return def === undefined ? name : `${name} = ${def.trim().replace(/f$/, "")}`;
        })
      : null;
    out.push({ name: m[1], params, expr: body.slice(i, j).trim() });
  }
  return out;
}

/** `const float Name = value;` of a class body. */
const consts = (body) => Object.fromEntries([...body.matchAll(/const float (\w+) = (-?[\d.]+)f;/g)].map((m) => [m[1], Number(m[2])]));

/** The body of `static class Name { … }` in a file. */
function classBody(src, name) {
  const at = src.indexOf(`static class ${name}`);
  if (at < 0) throw new Error(`No encuentro la clase ${name}`);
  const open = src.indexOf("{", at);
  return src.slice(open + 1, matching(src, open));
}

// The shared helpers every class writes the same way (block-bodied in C#, so they are written here).
const V = (x, y, z) => [x, y, z];
const T = (part, v) => [part, v];
const J = (p, a, b = 0) => [p, Array.isArray(a) ? a : [a, 0, b]];
const Join = (...groups) => groups.flat();

/** A scope where a class's members and consts are names, evaluated lazily (properties as getters). */
function scope(body, extra = {}) {
  const s = { V, T, J, Join, Math, ...extra, ...consts(body) };
  for (const m of members(body)) {
    if (["J", "Join", "Label", "PostureCount", "Duration"].includes(m.name)) continue;
    const fn = new Function("scope", `with (scope) { return (${m.params ? `(${m.params.join(", ")}) => (${js(m.expr)})` : `() => (${js(m.expr)})`}); }`)(s);
    if (m.params) s[m.name] = fn;
    else Object.defineProperty(s, m.name, { get: fn, enumerable: true });
  }
  return s;
}
const evalIn = (s, expr) => new Function("scope", `with (scope) { return (${js(expr)}); }`)(s);

// --- Reading the postures ----------------------------------------------------------------------------

const asanas = new Map();
const sequences = [];
const slug = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Registers a posture (same name and same data = the same asana; same name, other data = «-2»). */
function asana(name, source, root, stance, set, reaches) {
  const joints = {};
  for (const [part, e] of set ?? []) joints[part] = e.map((v) => +v.toFixed(3));
  const data = { name, source, joints, rootHeight: root < 0 ? null : root, stanceWidth: stance < 0 ? null : stance, reaches: (reaches ?? []).map(([end, t]) => ({ end, target: t.map((v) => +v.toFixed(3)) })) };
  const key = JSON.stringify({ ...data, source: undefined, name: undefined });
  const base = slug(name);
  for (let n = 1; ; n++) {
    const id = n === 1 ? base : `${base}-${n}`;
    const had = asanas.get(id);
    if (!had) {
      asanas.set(id, { id, ...data });
      return id;
    }
    if (JSON.stringify({ ...had, id: undefined, source: undefined, name: undefined }) === key) return id;
  }
}

const breathOf = (label) => (/inhala/.test(label) ? "inhala" : /exhala/.test(label) ? "exhala" : "respira");

// SunSalutation (YogaSpells.cs): the 12 postures and Ashtanga's Surya Namaskara A.
const spellsSrc = read("YogaSpells.cs");
const sunBody = classBody(spellsSrc, "SunSalutation");
const sun = scope(sunBody);
{
  const at = sunBody.indexOf("Postures =");
  const open = sunBody.indexOf("{", at);
  const rows = splitTop(sunBody.slice(open + 1, matching(sunBody, open)));
  const steps = [];
  for (const row of rows) {
    const [name, root, stance, set, reach] = splitTop(row.trim().slice(1, -1));
    const lambda = (x) => (x === "null" ? null : evalIn(sun, x.replace(/^\(\)\s*=>/, "")));
    const id = asana(JSON.parse(name), "YogaSpells.cs · SunSalutation", evalIn(sun, root), evalIn(sun, stance), lambda(set), lambda(reach));
    steps.push({ asana: id, label: JSON.parse(name), phases: 3 });
  }
  sequences.push({ id: "saludo-al-sol", name: "Saludo al Sol (Surya Namaskar)", source: "YogaSpells.cs · SunSalutation.Sequence", steps });
}
{
  const at = sunBody.indexOf("var steps =");
  const open = sunBody.indexOf("{", sunBody.indexOf("]", at));
  const rows = splitTop(sunBody.slice(open + 1, matching(sunBody, open)));
  const steps = rows.map((row) => {
    const [name, root, stance, set, reach, hold] = splitTop(row.trim().slice(1, -1));
    const id = asana(JSON.parse(name), "YogaSpells.cs · SunSalutation.AshtangaA", evalIn(sun, root), evalIn(sun, stance), evalIn(sun, set), reach === "null" ? null : evalIn(sun, reach));
    return { asana: id, label: JSON.parse(name), phases: 1 + Number(hold) };
  });
  sequences.push({ id: "surya-namaskara-a", name: "Surya Namaskara A (Ashtanga)", source: "YogaSpells.cs · SunSalutation.AshtangaA", steps });
}

// AshtangaPrimary.cs: the runnable core of the Primary Series (after its Surya Namaskara A).
{
  const body = classBody(read("AshtangaPrimary.cs"), "AshtangaPrimary");
  const s = scope(body, { SunSalutation: sun });
  const seq = body.slice(body.indexOf("Sequence("), body.indexOf("public static float Duration"));
  const steps = [];
  for (let i = seq.indexOf("Posture(seq"); i >= 0; i = seq.indexOf("Posture(seq", i + 1)) {
    const open = seq.indexOf("(", i);
    const a = splitTop(seq.slice(open + 1, matching(seq, open)));
    const [name, root, stance, set, reach] = a.slice(4);
    const id = asana(JSON.parse(name), "AshtangaPrimary.cs", evalIn(s, root), evalIn(s, stance), evalIn(s, set), reach ? evalIn(s, reach) : null);
    steps.push({ asana: id, label: JSON.parse(name), phases: 11 });
  }
  const sav = seq.indexOf('Pose("Savasana');
  const a = splitTop(seq.slice(sav + 5, matching(seq, sav + 4)));
  const id = asana("Savasana (relajación final)", "AshtangaPrimary.cs", evalIn(s, a[3]), -1, evalIn(s, a[4]), null);
  steps.push({ asana: id, label: "Savasana (relajación final)", phases: 15 });
  sequences.push({ id: "ashtanga-primaria", name: "Ashtanga, Serie Primaria (núcleo)", source: "AshtangaPrimary.cs", steps });
}

// YogaNamaskar.cs: palms always together; prayer and overhead join the palms by IK (rule of its Pose()).
{
  const src = read("YogaNamaskar.cs");
  const body = classBody(src, "YogaNamaskar");
  const s = scope(body);
  const prayer = [["HandLeft", [-0.035, 1.34, 0.27]], ["HandRight", [0.035, 1.34, 0.27]]];
  const overhead = [["HandLeft", [-0.035, 2.07, 0.1]], ["HandRight", [0.035, 2.07, 0.1]]];
  const reachesFor = (set) => (set.some(([p, e]) => p === "ForearmLeft" && e[0] === -105) ? prayer : set.some(([p, e]) => p === "ShoulderLeft" && e[0] === -172) ? overhead : null);
  const named = (label, set) => {
    const squat = set.some(([p, e]) => p === "ShinLeft" && e[0] === 145);
    const what = label.replace(/^(prepara|inhala|exhala)( \(ujjayi\))?: /, "").replace(/ \(cuclillas\)/, "").replace(/, baja a cuclillas/, "");
    return `Yoga Namaskar: ${what}${squat ? " (cuclillas)" : ""}`;
  };
  const seq = body.slice(body.indexOf("Sequence("), body.indexOf("public static float Duration"));
  const steps = [];
  const loops = [...seq.matchAll(/for \(int r = 0; r < (\d+); r\+\+\)/g)];
  const calls = [];
  for (let i = seq.indexOf("Pose("); i >= 0; i = seq.indexOf("Pose(", i + 1)) {
    const open = seq.indexOf("(", i);
    const close = matching(seq, open);
    const a = splitTop(seq.slice(open + 1, close));
    const before = seq.slice(0, i).replace(/seq\.Add\($/, "").trimEnd();
    const inElse = /else$/.test(before);
    const inIf = /if \(r < 2\)$/.test(before);
    calls.push({ at: i, a, inIf, inElse });
  }
  // Unroll: preparation, standing ×3 (the last exhale goes down to the squat), squat ×2, Balasana.
  const make = (c) => {
    const label = JSON.parse(c.a[0]);
    const set = evalIn(s, c.a.slice(5).join(", "));
    const root = evalIn(s, c.a[4]);
    const name = named(label, set);
    return { asana: asana(name, "YogaNamaskar.cs", root, -1, set, reachesFor(set)), label, phases: 1 };
  };
  const [prep, ...rest] = calls;
  steps.push(make(prep));
  const standEnd = loops[1] ? loops[1].index : seq.length;
  const stand = rest.filter((c) => c.at < standEnd);
  const squat = rest.filter((c) => c.at > standEnd);
  for (let r = 0; r < Number(loops[0][1]); r++) for (const c of stand) if ((r < 2 && !c.inElse) || (r === 2 && !c.inIf)) steps.push(make(c));
  for (let r = 0; r < Number(loops[1][1]); r++) for (const c of squat) steps.push(make(c));
  const bal = classBody(src, "YogaNamaskar").slice(body.indexOf("static AsanaPoseSpell Balasana"));
  const setExpr = /var set = (Join\([\s\S]*?\));\s*return/.exec(bal)[1];
  const root = Number(/Pose\("Balasana[^"]*", "respira", hold, [\d.]+f, ([\d.]+)f/.exec(bal)[1]);
  steps.push({ asana: asana("Balasana (postura del niño)", "YogaNamaskar.cs", root, -1, evalIn(s, setExpr), null), label: "Balasana (postura del niño)", phases: Math.round(120 / 8) });
  sequences.push({ id: "yoga-namaskar", name: "Yoga Namaskar", source: "YogaNamaskar.cs", steps });
}

// UpaYoga.cs: neck and shoulders, one breath phase each.
{
  const body = classBody(read("UpaYoga.cs"), "UpaYoga");
  const s = scope(body);
  const seq = body.slice(body.indexOf("NeckSequence("), body.indexOf("public static float Duration"));
  const steps = [];
  // Unroll the `for (r < 3)` blocks: each Add inside a loop body repeats 3 times.
  const re = /for \(int r = 0; r < (\d+); r\+\+\)[^{]*\{([\s\S]*?)\n        \}|Add\(seq, ("[^"]*"), breath, ([^;]*)\);/g;
  const add = (label, expr) => {
    const l = JSON.parse(label);
    const set = evalIn(s, expr);
    const name = set.length === 0 ? "Upa-yoga: neutro" : `Upa-yoga: ${l.replace(/^(inhala|exhala): /, "")}`;
    steps.push({ asana: asana(name, "UpaYoga.cs", -1, -1, set, null), label: l, phases: 1 });
  };
  for (let m; (m = re.exec(seq)); ) {
    if (m[1]) for (let r = 0; r < Number(m[1]); r++) for (const a of m[2].matchAll(/Add\(seq, ("[^"]*"), breath, ([^;]*)\);/g)) add(a[1], a[2]);
    else add(m[3], m[4]);
  }
  sequences.push({ id: "upa-yoga-cuello", name: "Upa-yoga de cuello y hombros", source: "UpaYoga.cs", steps });
}

// --- Writing ------------------------------------------------------------------------------------------

let commit = "desconocido";
try {
  commit = execSync("git rev-parse --short HEAD", { cwd: dir, encoding: "utf8" }).trim();
} catch {}
const list = [...asanas.values()];
/** JSON with short arrays and small objects on one line, so a posture reads at a glance. */
const pretty = (v) =>
  JSON.stringify(v, null, 2)
    .replace(/\[\s+([^\[\]{}]*?)\s+\]/g, (_, inner) => `[${inner.replace(/\s*\n\s*/g, " ")}]`)
    .replace(/\{[^{}]*\}/g, (o) => {
      const one = o.replace(/\s*\n\s*/g, " ").replace("{ ", "{ ").replace(/ \}$/, " }");
      return one.length <= 150 ? one : o;
    });
const out = `// GENERADO por scripts/asanas-from-cold-sanctuary.mjs desde Cold Sanctuary (commit ${commit}). No editar a mano:
// vuelve a ejecutar el script. Convención de Unity tal cual (X derecha, Y arriba, Z adelante; grados, Euler ZXY);
// el cambio de ejes a Three.js está en ../domain/unity-axes.ts.
import type { AsanaData, AsanaSequenceData } from "../domain/asana";

export const COLD_SANCTUARY_COMMIT = ${JSON.stringify(commit)};

export const COLD_SANCTUARY_ASANAS: readonly AsanaData[] = ${pretty(list)};

export const COLD_SANCTUARY_SEQUENCES: readonly AsanaSequenceData[] = ${pretty(sequences)};
`;
// Without the commit line, so that --check does not fail only because Cold Sanctuary moved on.
const body = (s) => s.replace(/commit [0-9a-f]+\)/, "").replace(/COLD_SANCTUARY_COMMIT = "[^"]*"/, "");
if (check) {
  const now = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (body(now) !== body(out)) {
    console.error(`${OUT} no coincide con Cold Sanctuary: ejecuta node scripts/asanas-from-cold-sanctuary.mjs`);
    process.exit(1);
  }
  console.log(`${OUT} al día (${list.length} asanas, ${sequences.length} secuencias).`);
} else {
  writeFileSync(OUT, out);
  console.log(`${OUT}: ${list.length} asanas, ${sequences.length} secuencias (Cold Sanctuary ${commit}).`);
}
