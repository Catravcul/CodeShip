// The ring aquarium on the farm deck (docs/design/santuario-espacial.md, «Acuario del anillo»): walk to the
// tank with «Ir», feed the medaka (each right step shows on the tank), befriend the school with a mind
// program, ask the snails to clean the glass and the medaka to watch the water, and see the effect.
// Captures go to docs/screenshots/acuario-<paso>-movil.png.
import { mkdirSync } from "node:fs";

const seesStep = (j, action, timeout = 15000) =>
  j.page
    .waitForFunction((a) => document.querySelector(".interior-ui")?.dataset.paso === a && window.codeship.interior.steps.root.visible, action, { timeout })
    .then(() => true)
    .catch(() => false);
const current = () => window.codeship.interior.session?.run.current;

async function capture(j, label) {
  await j.page.waitForTimeout(600);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/acuario-${label}-${j.opts.mobile === false ? "escritorio" : "movil"}.png` });
  await j.shot(label);
}

/** The HUD's folded status lines, as the player reads them after tapping the status. */
async function hudStatus(j) {
  if (j.opts.mobile !== false && !(await j.page.evaluate(() => document.querySelector(".ihud")?.classList.contains("open")))) await j.tap(".ihud", "estado de Doménica (despliega)");
  await j.page.waitForTimeout(300);
  const line = (await j.texts(".ihud .more")).find((t) => t.startsWith("Acuario:")) ?? "";
  if (j.opts.mobile !== false) await j.tap(".ihud", "estado de Doménica (pliega)");
  return line;
}
const algaePct = (line) => Number(/algas (\d+) %/.exec(line)?.[1] ?? NaN);

/** Solve every challenge of the open chore with visible taps, then «Continuar». */
async function solveAll(j, label, step) {
  const n = await j.page.evaluate(() => window.codeship.interior.session?.run.steps ?? 0);
  for (let i = 0; i < n; i++) {
    await j.answer(current);
    await j.page.waitForTimeout(300);
    if (step && i === 0) j.check(`${label}: el primer paso bien se ve en el acuario («${step}»)`, await seesStep(j, step), await j.page.evaluate(() => document.querySelector(".interior-ui")?.dataset.paso));
  }
  const result = (await j.texts(".duel .result"))[0] ?? "";
  j.check(`${label}: «Conseguido»`, /Conseguido/.test(result), result);
  return result;
}

async function stationChore(j, id, what) {
  await j.page.waitForTimeout(500);
  const label = (await j.texts(".station-btn"))[0] ?? "";
  j.check(`junto al tanque sale un solo botón, el del acuario («${label}»)`, /^Acuario del anillo: \d+ tareas?$/.test(label), label);
  await j.tap(".station-btn", "Acuario del anillo");
  await j.page.waitForTimeout(400);
  await j.tap(`.board [data-chore="${id}"]`, what);
  await j.waitDuel(30000);
}

export async function acuario(j) {
  const p = j.page;
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la nave de viaje");
  await p.waitForTimeout(800);
  await j.setup("la llevamos al anillo (bajar del eje por el radio se juega en «movimiento»)", () => {
    const z = window.codeship.interior.zones;
    z.zone = "anillo";
    z.autoDown = false;
  });
  await j.resetPerf();

  // 1. Care chore from the task list: «Ir» walks her to the tank on the farm deck.
  await j.tap(".tasks-btn", "Tareas");
  await p.waitForTimeout(400);
  await j.tap('.task-board .tb-task:has-text("Dar de comer a las medakas") .tb-go', "Ir: Dar de comer a las medakas");
  await j.waitDuel(120000);
  const at = await p.evaluate(() => {
    const i = window.codeship.interior;
    return { framing: i.steps.framing, z: i.pos.z, x: i.pos.x };
  });
  j.check("«Ir» la lleva andando hasta el acuario de la cubierta de cultivo (la escena se ve sobre la hoja)", at.framing && at.z > 9 && at.x < -3, JSON.stringify(at));
  await capture(j, "comer");
  await j.answer(current);
  await p.waitForTimeout(300);
  await j.answer(current);
  j.check("dar de comer: al acertar el orden caen escamas en el tanque («servir»)", (await seesStep(j, "servir")) || (await p.evaluate(() => window.codeship.interior.tank.flakes.visible)));
  await capture(j, "escamas");
  const fed = (await j.texts(".duel .result"))[0] ?? "";
  j.check("dar de comer: «Conseguido»", /Conseguido/.test(fed), fed);
  await j.tap(".duel button.end", "Continuar");
  j.check("las medakas ya no tienen hambre", await p.evaluate(() => window.codeship.interior.aquarium.tank.hunger < 0.1));

  // 2. Make friends: a mind program for the school.
  await stationChore(j, "acuario-amistad", "Hacer amistad con las medakas");
  await solveAll(j, "amistad", "programar");
  await capture(j, "amistad");
  await j.tap(".duel button.end", "Continuar");
  const friendLine = await hudStatus(j);
  j.check("el estado dice «medakas amigas»", /medakas amigas/.test(friendLine), friendLine);
  await p.waitForTimeout(2500);
  j.check("con ella delante, el banco viene al cristal", (await p.evaluate(() => window.codeship.interior.tank.school)) === "cristal");
  await capture(j, "banco-en-el-cristal");

  // 3. Ask the snails for help: they climb the glass and the algae go down.
  const before = algaePct(await hudStatus(j));
  await stationChore(j, "acuario-ayuda-caracoles-limpian", "Pedir ayuda a los caracoles");
  await solveAll(j, "ayuda de los caracoles", "programar");
  await j.tap(".duel button.end", "Continuar");
  await p.waitForTimeout(3000);
  const snailLine = await hudStatus(j);
  j.check("el estado dice «caracoles limpiando el cristal»", /caracoles limpiando el cristal/.test(snailLine), snailLine);
  j.check(`las algas bajan (${before} % → ${algaePct(snailLine)} %)`, algaePct(snailLine) < before, snailLine);
  const tasks = await p.evaluate(() => window.codeship.interior.choreFacts().map((c) => c.title));
  j.check("ya no hace falta «Limpiar el cristal del acuario»", !tasks.includes("Limpiar el cristal del acuario"), tasks.join(" | "));
  await capture(j, "caracoles");

  // 4. Ask the medaka to watch the water: at 38 mg/L they warn, and the water change shows up.
  await stationChore(j, "acuario-ayuda-medakas-avisan", "Pedir ayuda a las medakas");
  await solveAll(j, "ayuda de las medakas", "programar");
  await j.tap(".duel button.end", "Continuar");
  const warned = await p
    .waitForFunction(() => /nitrato está alto/.test(document.querySelector(".interior-ui .toast")?.textContent ?? ""), null, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  j.check("las medakas avisan en el aviso: «el nitrato está alto, cambia el agua»", warned, (await j.texts(".toast"))[0] ?? "");
  await p.waitForTimeout(2500);
  j.check("el banco sube a la superficie del cristal a avisar", (await p.evaluate(() => window.codeship.interior.tank.school)) === "superficie");
  await capture(j, "aviso");
  await stationChore(j, "acuario-agua", "Cambiar el 20 % del agua del acuario");
  await solveAll(j, "cambio de agua");
  await j.tap(".duel button.end", "Continuar");
  const waterLine = await hudStatus(j);
  j.check("tras el cambio, el nitrato baja a unos 30 mg/L", /nitrato 3[01] mg\/L/.test(waterLine), waterLine);
  const calm = await p.evaluate(() => 1 - window.codeship.habitat.crew.stress);
  j.check("Doménica está más tranquila con sus amigas (Calma > 0)", calm > 0, calm.toFixed(2));
  await capture(j, "agua");
}
