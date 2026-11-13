// Runs the player-experience journeys (docs/testing.md) and writes report.json + report.md.
// Usage: npm run experiencia [-- cocina duelo …]   (EXPERIENCIA_URL to use a running server)
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Journey } from "./lib.mjs";
import { cocina } from "./cocina.mjs";
import { acciones } from "./acciones.mjs";
import { movimiento } from "./movimiento.mjs";
import { mision } from "./mision.mjs";

const JOURNEYS = {
  cocina: ["Cocinar paso a paso: crema de cacahuete con un fallo repetido, receta perdida en vista HUD", cocina],
  movimiento: ["Moverse: propulsores de la cabina, impulso en ingravidez, caminar por el anillo", movimiento],
  mision: ["Misión 1 de Nevaeh: carta, registro, aterrizaje en Bennu y duelo con un fallo", mision],
  "acciones-movil": ["Botones de cada pantalla de un iPhone 13 (390×664 visibles de 390×844): capturas y solapes", acciones, { mobile: true, throttle: 1 }],
  "acciones-escritorio": ["Botones de cada pantalla a 1280×800: capturas y solapes", acciones, { mobile: false, throttle: 1 }],
};

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = process.env.EXPERIENCIA_OUT ?? join("experiencia-informe", stamp);
mkdirSync(outDir, { recursive: true });

let server;
let url = process.env.EXPERIENCIA_URL;
if (!url) {
  const port = 4317 + Math.floor(Math.random() * 200);
  server = spawn("npx", ["vite", "preview", "--port", String(port), "--strictPort"], { stdio: "ignore" });
  url = `http://localhost:${port}/`;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
}
url += (url.includes("?") ? "&" : "?") + "prueba";

const pick = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const results = [];
const prefix = process.env.EXPERIENCIA_PREFIJO ?? "despues";
for (const [name, [title, play, opts = {}]] of Object.entries(JOURNEYS)) {
  if (pick.length && !pick.includes(name)) continue;
  console.log(`\n▶ ${title}`);
  const j = new Journey(name, title, { outDir, prefix, ...opts });
  try {
    await j.open(url);
    await play(j);
  } catch (e) {
    j.check("el recorrido llega al final", false, e.message.split("\n")[0]);
    try {
      await j.shot("error");
    } catch {}
  }
  results.push({ ...(await j.close()), audit: j.audit });
}
server?.kill();

const md = [`# Experiencia del jugador · ${stamp}`, "", `iPhone 13 (pantalla 390×844; 390×664 visibles con las barras de Safari; táctil), CPU ×4 más lenta (los recorridos de botones, sin frenar). Capturas en esta carpeta.`, ""];
for (const r of results) {
  md.push(`## ${r.ok ? "✓" : "✗"} ${r.title}`, "");
  for (const c of r.checks) md.push(`- ${c.setup ? "·" : c.ok ? "✓" : "✗"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  if (r.problems.length) md.push("", "Problemas de experiencia:", ...r.problems.map((x) => `- ${x}`));
  const p = r.perf;
  md.push("", `Rendimiento (GPU: ${p.gpu}): ${p.fps} fps, fotograma mediana ${p.frameMedianMs} ms / p95 ${p.frameP95Ms} ms, ${p.slowFramesPct} % > 33 ms, ${p.longTasks} tareas largas (la mayor ${p.longestTaskMs} ms), ${p.heapMB} MB, ${p.drawCalls} llamadas de dibujo, ${p.trianglesK} k triángulos, primer fotograma a ${p.loadMs} ms.`, "");
  md.push("| Presupuesto | Valor | Máximo | |", "|---|---|---|---|");
  for (const b of r.budgets) md.push(`| ${b.name} | ${b.value} ${b.unit} | ${b.max} ${b.unit} | ${b.ok ? "✓" : b.binding ? "✗" : "✗ (informativo: GPU por software)"} |`);
  md.push("", r.shots.map((s) => `![${s}](${s})`).join(" "), "");
}
writeFileSync(join(outDir, "report.json"), JSON.stringify({ stamp, url, results }, null, 2));
writeFileSync(join(outDir, "report.md"), md.join("\n"));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} recorridos bien · informe en ${join(outDir, "report.md")}`);
process.exit(failed.length ? 1 : 0);
