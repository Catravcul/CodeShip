// Docs that are a contract with the code (idea from Natuka's check-docs.sh): fails when
// docs/testing.md's budget table, the PX catalogue in docs/qa/casos.md or its rows in docs/qa/registro.md drift from tools/experiencia/presupuestos.mjs.
import { existsSync, readFileSync } from "node:fs";
import { BUDGETS, JOURNEYS } from "../tools/experiencia/presupuestos.mjs";

const problems = [];
const testing = readFileSync("docs/testing.md", "utf8");
const casos = readFileSync("docs/qa/casos.md", "utf8").split("\n");
const registro = readFileSync("docs/qa/registro.md", "utf8").split("\n");

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
  if (!casos.some((l) => l.startsWith(`| ${j.id} | \`${j.name}\` |`))) problems.push(`docs/qa/casos.md: falta ${j.id} \`${j.name}\` en la sección PX`);
  if (!registro.some((l) => l.startsWith(`| ${j.id} |`))) problems.push(`docs/qa/registro.md: falta la fila de ${j.id}`);
}
for (const id of new Set(casos.flatMap((l) => /^\| (PX-\d+) \|/.exec(l)?.[1] ?? [])))
  if (!JOURNEYS.some((j) => j.id === id)) problems.push(`docs/qa/casos.md: ${id} no está en presupuestos.mjs (si ya no aplica, márcalo Retirado y déjalo en el código)`);
// A journey «Probado» needs its run log on disk.
for (const l of registro.filter((x) => /^\| PX-\d+ \| Probado/.test(x))) {
  const m = /\(runs\/([^)]+)\)/.exec(l);
  if (!m || !existsSync(`docs/qa/runs/${m[1]}`)) problems.push(`docs/qa/registro.md: ${l.split("|")[1].trim()} está Probado sin registro de ejecución`);
}

for (const p of problems) console.error(p);
if (problems.length) process.exit(1);
console.log(`Docs OK (${BUDGETS.length} presupuestos, ${JOURNEYS.length} recorridos).`);
