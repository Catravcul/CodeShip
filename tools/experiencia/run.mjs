// Runs the player-experience journeys (docs/testing.md, catalogue in docs/qa/casos.md, section PX).
// Usage: npm run experiencia [-- PX-01 cocina …]   (EXPERIENCIA_URL to use a running server)
// Writes experiencia-informe/<fecha>/ (report.md, report.json, screenshots) and the run log
// docs/qa/runs/<fecha>-PX-….md, and updates the journeys' rows in docs/qa/registro.md: no run log, no «Probado».
import { spawn, execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Journey } from "./lib.mjs";
import { JOURNEYS } from "./presupuestos.mjs";
import { exitCodeFor, renderRunLog, runLogName, updateRegistro } from "./qa.mjs";
import { cocina } from "./cocina.mjs";
import { movimiento } from "./movimiento.mjs";
import { mision } from "./mision.mjs";
import { acciones } from "./acciones.mjs";
import { habitaculo } from "./habitaculo.mjs";
import { ordenar } from "./ordenar.mjs";
import { acuario } from "./acuario.mjs";
import { aterrizajePrograma, aterrizajeManual, aterrizajeEscritorio } from "./aterrizaje.mjs";

const PLAY = { cocina, movimiento, mision, "acciones-movil": acciones, "acciones-escritorio": acciones, ordenar, "aterrizaje-programa": aterrizajePrograma, "aterrizaje-manual": aterrizajeManual, "aterrizaje-escritorio": aterrizajeEscritorio, "habitaculo-movil": habitaculo, "habitaculo-escritorio": habitaculo, acuario };

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = process.env.EXPERIENCIA_OUT ?? join("experiencia-informe", stamp);
mkdirSync(outDir, { recursive: true });

const pick = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const unknown = pick.filter((p) => !JOURNEYS.some((j) => j.id === p || j.name === p));
if (unknown.length) {
  console.error(`Recorridos desconocidos: ${unknown.join(", ")}. Catálogo: ${JOURNEYS.map((j) => `${j.id} ${j.name}`).join(", ")}`);
  process.exit(2);
}
const expected = JOURNEYS.filter((j) => !pick.length || pick.includes(j.id) || pick.includes(j.name));

let server;
let url = process.env.EXPERIENCIA_URL;
const alive = async (u) => {
  try {
    return (await fetch(u)).ok;
  } catch {
    return false;
  }
};
async function startServer() {
  const port = 4317 + Math.floor(Math.random() * 200);
  server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--port", String(port), "--strictPort"], { stdio: "ignore" });
  url = `http://localhost:${port}/`;
  for (let i = 0; i < 60 && !(await alive(url)); i++) await new Promise((r) => setTimeout(r, 500));
}
const own = !url;
if (own) await startServer();
const base = () => url + (url.includes("?") ? "&" : "?") + "prueba";

const results = [];
for (const spec of expected) {
  if (own && !(await alive(url))) await startServer();
  console.log(`\n▶ ${spec.id} · ${spec.title}`);
  const j = new Journey(spec.name, spec.title, { outDir, prefix: process.env.EXPERIENCIA_PREFIJO ?? "despues", ...spec });
  try {
    await j.open(base());
    await PLAY[spec.name](j);
  } catch (e) {
    j.check("el recorrido llega al final", false, e.message.split("\n")[0]);
    try {
      await j.shot("error");
    } catch {}
  }
  results.push({ ...(await j.close()), audit: j.audit });
}
server?.kill();

// Every expected journey must have run and checked something (empty-suite guard).
for (const spec of expected) if (!results.some((r) => r.id === spec.id)) results.push({ id: spec.id, title: spec.title, verdict: "SIN COMPROBACIONES", passed: false, checks: [], budgets: [], perf: {} });

const git = (c) => {
  try {
    return execSync(`git ${c}`, { encoding: "utf8" }).trim();
  } catch {
    return "desconocido";
  }
};
const commit = git("rev-parse --short HEAD") + (git("status --porcelain --untracked-files=no") ? " (con cambios sin commit)" : "");
const env = `iPhone 13 de Playwright (pantalla 390×844, 390×664 visibles), CPU ×${process.env.EXPERIENCIA_CPU ?? 4} (botones: ×1); GPU ${results[0]?.perf?.gpu ?? "?"}; ${process.env.CI ? "CI" : "local"}`;
const log = renderRunLog({ date: now, commit, branch: git("rev-parse --abbrev-ref HEAD"), env, results });
writeFileSync(join(outDir, "report.md"), log);
writeFileSync(join(outDir, "report.json"), JSON.stringify({ stamp, url, commit, results }, null, 2));

if (!process.env.EXPERIENCIA_SIN_REGISTRO) {
  const runs = join("docs", "qa", "runs");
  mkdirSync(runs, { recursive: true });
  const name = runLogName(now, results.map((r) => r.id));
  writeFileSync(join(runs, name), log);
  const reg = join("docs", "qa", "registro.md");
  if (existsSync(reg)) {
    const date = now.toISOString().slice(0, 10);
    const rows = results.map((r) => {
      const ok = r.checks.filter((c) => c.ok === true && !c.setup).length;
      const bad = r.checks.filter((c) => c.ok === false).length;
      return { id: r.id, passed: r.passed, date, commit: commit.split(" ")[0], summary: bad ? `${ok} OK, ${bad} FALLA` : `${ok} OK` };
    });
    const when = `${date} ${now.toISOString().slice(11, 16)}`;
    writeFileSync(reg, updateRegistro(readFileSync(reg, "utf8"), { when, log: name, rows }));
  }
  console.log(`Registro de la ejecución: ${join(runs, name)}`);
}

const code = exitCodeFor(results.map((r) => (r.passed ? "OK" : r.verdict === "OK" ? "FALLA" : r.verdict)));
console.log(`\n${results.filter((r) => r.passed).length}/${results.length} recorridos bien · informe en ${join(outDir, "report.md")}`);
process.exit(code);
