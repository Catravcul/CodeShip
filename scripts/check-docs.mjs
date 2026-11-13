// Docs that are a contract with the code (idea from Natuka's check-docs.sh): fails when
// docs/testing.md's budget table or docs/qa/px.md drift from tools/experiencia/presupuestos.mjs.
import { readFileSync } from "node:fs";
import { BUDGETS, JOURNEYS } from "../tools/experiencia/presupuestos.mjs";

const problems = [];
const testing = readFileSync("docs/testing.md", "utf8");
const px = readFileSync("docs/qa/px.md", "utf8");

for (const b of BUDGETS) {
  const cell = `${b.max}${b.unit ? ` ${b.unit}` : ""}`;
  const row = testing.split("\n").find((l) => l.startsWith(`| ${b.name} |`));
  if (!row) problems.push(`docs/testing.md: falta la fila del presupuesto «${b.name}»`);
  else {
    const [, max, gpu] = row.split("|").map((c) => c.trim()).slice(1);
    if (max !== cell) problems.push(`docs/testing.md: «${b.name}» dice ${max}, el código ${cell}`);
    if (gpu !== (b.gpu ? "sí" : "no")) problems.push(`docs/testing.md: «${b.name}» depende de la GPU: dice ${gpu}, el código ${b.gpu ? "sí" : "no"}`);
  }
}
const budgetRows = testing.split("\n").filter((l) => /^\| [^|]+ \| \d+/.test(l)).length;
if (budgetRows !== BUDGETS.length) problems.push(`docs/testing.md: ${budgetRows} filas de presupuesto, el código declara ${BUDGETS.length}`);

for (const j of JOURNEYS) {
  if (!px.split("\n").some((l) => l.startsWith(`| ${j.id} | \`${j.name}\` |`))) problems.push(`docs/qa/px.md: falta ${j.id} \`${j.name}\` en el catálogo`);
  if (px.split("\n").filter((l) => l.startsWith(`| ${j.id} |`)).length < 2) problems.push(`docs/qa/px.md: falta la fila de estado de ${j.id}`);
}
for (const id of new Set([...px.matchAll(/^\| (PX-\d+) \|/gm)].map((m) => m[1])))
  if (!JOURNEYS.some((j) => j.id === id)) problems.push(`docs/qa/px.md: ${id} no está en presupuestos.mjs (si ya no aplica, márcalo Retirado y déjalo en el código)`);
// «Probado» needs its run log.
for (const l of px.split("\n").filter((x) => x.includes("| Probado |"))) {
  const m = /\(runs\/([^)]+)\)/.exec(l);
  try {
    if (!m) throw new Error();
    readFileSync(`docs/qa/runs/${m[1]}`);
  } catch {
    problems.push(`docs/qa/px.md: ${l.split("|")[1].trim()} está Probado sin registro de ejecución`);
  }
}

for (const p of problems) console.error(p);
if (problems.length) process.exit(1);
console.log(`Docs OK (${BUDGETS.length} presupuestos, ${JOURNEYS.length} recorridos).`);
