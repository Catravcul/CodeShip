// Pure checker and reporter of the experience suite (no browser here, tested in qa.test.mjs).
// Ported from the Natuka live-QA runner: zero checks is a failure, a missing measurement is a failure,
// every run leaves a Markdown log with the commit, the journeys and the performance against budget.

/** Collects checks; setup steps are kept apart and never count as checks. */
export function makeChecker() {
  const checks = [];
  return {
    checks,
    check(name, ok, detail = "") {
      checks.push({ name, ok: !!ok, detail: String(detail ?? "") });
      return !!ok;
    },
    setup(name) {
      checks.push({ name, ok: true, detail: "", setup: true });
    },
  };
}

/** OK only with at least one real check and none failed. */
export function verdict(checks) {
  const real = checks.filter((c) => !c.setup);
  if (real.length === 0) return "SIN COMPROBACIONES";
  return real.every((c) => c.ok) ? "OK" : "FALLA";
}

/** 0 when every journey is OK; 1 otherwise (zero checks included). */
export function exitCodeFor(verdicts) {
  return verdicts.length > 0 && verdicts.every((v) => v === "OK") ? 0 : 1;
}

/**
 * Each budget against its measurement. A missing measurement (no frames, no sample) is «no medido»
 * and fails: an empty sample must never read as a pass.
 */
export function checkBudgets(perf, budgets, { softwareGl = false, strict = false } = {}) {
  return budgets.map((b) => {
    const value = perf?.[b.key];
    const measured = typeof value === "number" && Number.isFinite(value) && !(b.key.startsWith("frame") && !(perf.frames > 0));
    const binding = !(b.gpu && softwareGl && !strict);
    return { ...b, value: measured ? value : null, measured, ok: measured && value <= b.max, binding };
  });
}

/** A journey passes with an OK verdict and every binding budget met (unmeasured ones fail). */
export function journeyPasses(checks, budgetRows) {
  return verdict(checks) === "OK" && budgetRows.every((b) => !b.binding || b.ok);
}

/** Timestamped name so runs never overwrite each other. */
export function runLogName(date, ids) {
  const p = (n) => String(n).padStart(2, "0");
  const stamp = `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())}-${p(date.getUTCHours())}${p(date.getUTCMinutes())}`;
  return `${stamp}-${ids.join("-")}.md`;
}

const fmtBudget = (b) => `| ${b.name} | ${b.measured ? `${b.value} ${b.unit}`.trim() : "no medido"} | ${`${b.max} ${b.unit}`.trim()} | ${b.ok ? "✓" : b.binding ? "✗" : "✗ informativo (GPU por software)"} |`;

/** The Markdown run log: commit, environment, journey table, then each journey's checks and performance. */
export function renderRunLog({ date, commit, branch, env, results }) {
  const out = [`# Experiencia del jugador · ${date.toISOString().slice(0, 16).replace("T", " ")} UTC`, ""];
  out.push(`- Commit: \`${commit}\`${branch ? ` (${branch})` : ""}`, `- Entorno: ${env}`, "");
  out.push("| ID | Recorrido | Veredicto | Comprobaciones | Presupuestos |", "|---|---|---|---|---|");
  for (const r of results) {
    const real = r.checks.filter((c) => !c.setup);
    const bad = r.budgets.filter((b) => b.binding && !b.ok).length;
    out.push(`| ${r.id} | ${r.title} | ${r.passed ? "OK" : r.verdict === "SIN COMPROBACIONES" ? "SIN COMPROBACIONES" : "FALLA"} | ${real.filter((c) => c.ok).length}/${real.length} | ${bad ? `${bad} superados` : "✓"} |`);
  }
  for (const r of results) {
    out.push("", `## ${r.id} · ${r.title}`, "");
    for (const c of r.checks) out.push(`- ${c.setup ? "· (preparación)" : c.ok ? "✓" : "✗"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
    if (r.problems?.length) out.push("", "Problemas de experiencia:", ...r.problems.map((x) => `- ${x}`));
    const p = r.perf ?? {};
    out.push("", `Rendimiento (GPU: ${p.gpu ?? "?"}): ${p.frames ?? 0} fotogramas en ${p.seconds ?? 0} s, mediana ${p.frameMedianMs ?? "–"} ms, ${p.longTasks ?? "–"} tareas largas (la mayor ${p.longestTaskMs ?? "–"} ms).`, "");
    out.push("| Presupuesto | Valor | Máximo | |", "|---|---|---|---|", ...r.budgets.map(fmtBudget));
    if (r.shots?.length) out.push("", `Capturas: ${r.shots.join(", ")}`);
  }
  return out.join("\n") + "\n";
}

/** Replaces (or adds) each journey's status row (docs/qa/px.md, «Estado»). Rows: | ID | Recorrido | Estado | Fecha | Commit | Registro |. */
export function updateRegistro(md, rows) {
  const lines = md.split("\n");
  // The status table is the one whose header has an «Estado» column (px.md also has the catalogue above it).
  const head = lines.findIndex((l) => /^\| ID \| Recorrido \| Estado \|/.test(l));
  const from = head < 0 ? 0 : head;
  for (const r of rows) {
    const row = `| ${r.id} | ${r.title} | ${r.state} | ${r.date} | \`${r.commit}\` | [${r.log}](runs/${r.log}) |`;
    const i = lines.findIndex((l, k) => k > from && l.startsWith(`| ${r.id} |`));
    if (i >= 0) lines[i] = row;
    else {
      let last = from + 1;
      lines.forEach((l, k) => k > from && l.startsWith("| PX-") && (last = k));
      lines.splice(last + 1, 0, row);
    }
  }
  return lines.join("\n");
}
