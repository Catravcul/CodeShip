// «Ir a una tarea» (docs/design/viaje-a-una-tarea.md): the setting at the yoga mat, teleport (fade and
// notice) and the real journey from the ring to a station task: the movement controls hide, «Parar» shows
// and stops her midway, the camera still turns, and she goes by the spoke's car, the spine and the docking
// hatch. Played on an iPhone 13 with visible taps; captures in docs/screenshots/viaje-*-movil.png.
import { mkdirSync } from "node:fs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(500);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/viaje-${label}-movil.png` });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

/** Whether an element is on screen (not display:none, with a size). */
const visible = (p, sel) =>
  p.evaluate((s) => [...document.querySelectorAll(s)].some((e) => {
    const r = e.getBoundingClientRect();
    return getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden" && r.width > 0 && r.height > 0;
  }), sel);

/** The first task of the list whose place matches, by its «Ir» button's name. */
const taskTitle = (p, kind) =>
  p.evaluate((k) => window.codeship.tasks().find((t) => (k === "anillo" ? t.place.spot === "anillo" : t.place.vehicle === "estacion" && t.place.spot === "pantalla"))?.title, kind);

async function go(j, title) {
  await j.page.waitForFunction(() => document.body.classList.contains("in-tasks"), null, { timeout: 8000 }).catch(() => {});
  return j.tap(`.task-board .tb-go[aria-label="Ir: ${title.replace(/"/g, '\\"')}"]`, `Ir: ${title}`);
}

/** A drag on the canvas, as a thumb looks around; returns how far the view turned (rad). */
async function dragLook(p, room) {
  const dir = () => p.evaluate((r) => {
    const c = window.codeship[r].camera;
    c.updateMatrixWorld();
    const e = c.matrixWorld.elements;
    return [-e[8], -e[9], -e[10]];
  }, room);
  const a = await dir();
  const vp = p.viewportSize();
  await p.mouse.move(vp.width / 2, vp.height * 0.4);
  await p.mouse.down();
  await p.mouse.move(vp.width / 2 + 140, vp.height * 0.4, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(400);
  const b = await dir();
  return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
}

const MOVE = ".walk-stick, .vstick.room-move, .vstick.sti-move, .zg-pad, .updown, .touch";

export async function viaje(j) {
  const p = j.page;
  // The setting: at the lander cabin's mat, «Ir a una tarea» is «Viaje» unless she chose otherwise.
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await p.waitForTimeout(800);
  await j.useMachine("cabin", "esterilla", "ajustes", "Sentarse en loto: ajustes");
  await p.waitForTimeout(500);
  const row = (await j.texts('.settings-sheet [data-extra="ir-a-tarea"]'))[0] ?? "";
  j.check("en la esterilla, «Ir a una tarea» dice «Viaje» por defecto", /Ir a una tarea/.test(row) && /Viaje/.test(row), row);
  await capture(j, "ajuste", "Ajuste «Ir a una tarea»");
  await j.tap('.settings-sheet [data-extra="ir-a-tarea"]', "Ir a una tarea");
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("codeship.ajustes") ?? "{}").taskTravel);
  j.check("cambiar a «Teletransporte» se guarda en codeship.ajustes", saved === "teletransporte", String(saved));
  await j.tap(".settings-sheet [data-close]", "Levantarse y cerrar los ajustes");

  // Teleport: a ring chore from the cabin, at once, with a fade and the notice that it is a choice.
  const chore = await taskTitle(p, "anillo");
  await j.tap(".room-ui:not(.hidden) .cab-tasks", "Tareas");
  await go(j, chore);
  await p.waitForTimeout(250);
  const note = (await j.texts(".journey-note.on"))[0] ?? "";
  j.check("teletransporte: aviso «Teletransporte (ajustes)»", /Teletransporte \(ajustes\)/.test(note), note);
  j.check("teletransporte: llega al anillo al momento, sin «Parar»", (await p.evaluate(() => window.codeship.interior.active && !window.codeship.journey.active)) && !(await visible(p, ".journey-bar .jb-stop")));
  await capture(j, "teletransporte", "Teletransporte con aviso");
  await p.waitForFunction(() => [...document.querySelectorAll(".duel")].some((e) => !e.classList.contains("hidden")), null, { timeout: 20000 }).catch(() => {});
  if ((await j.texts(".duel .x")).length) await j.tap(".duel .x", "Cerrar el reto");

  // Back to «Viaje» at the ring's yoga mat.
  await j.setup("camina hasta la esterilla de yoga del anillo y se sienta (ajustes)", () => window.codeship.interior.sitForSettings());
  await p.waitForFunction(() => document.body.classList.contains("in-settings"), null, { timeout: 20000 }).catch(() => {});
  await j.tap('.settings-sheet [data-extra="ir-a-tarea"]', "Ir a una tarea");
  j.check("en la esterilla del anillo vuelve a «Viaje»", await p.evaluate(() => window.codeship.settings.value.taskTravel === "viaje"));
  await j.tap(".settings-sheet [data-close]", "Levantarse y cerrar los ajustes");

  // Travel: from the ring to a station task.
  const task = await taskTitle(p, "estacion");
  if (!task) return j.check("hay una tarea de la estación en la lista", false);
  j.check("empieza en primera persona", await p.evaluate(() => !window.codeship.interior.thirdPerson));
  await j.tap(".tasks-btn", "Tareas");
  await go(j, task);
  await p.waitForTimeout(600);
  const plan = await p.evaluate(() => window.codeship.journey.plan.map((l) => ({ kind: l.kind, from: l.from, to: l.to, s: Math.round(l.seconds) })));
  j.check("el viaje sale del anillo y pasa por el ascensor, la espina y la escotilla de atraque", plan.some((l) => l.kind === "ascensor") && plan.some((l) => l.kind === "saltos" && l.from.startsWith("eje:")) && plan.some((l) => l.kind === "escotilla" && l.from === "eje:atraque"), plan.map((l) => `${l.kind} ${l.to} ${l.s}s`).join(" → "));
  j.check("durante el viaje se ocultan los mandos de movimiento", !(await visible(p, MOVE)));
  j.check("durante el viaje se ve un botón «Parar»", await visible(p, ".journey-bar .jb-stop"));
  const hud = (await j.texts(".journey-bar .jb-text"))[0] ?? "";
  j.check("una línea dice el siguiente tramo y la hora de llegada", /Viaje · 1\/\d+: .+/.test(hud) && /Llegada en ~\d/.test(hud), hud);
  j.check("el ojo de la vista sigue a mano", await visible(p, ".interior-ui .view-btn"));
  await capture(j, "anillo", "Viaje: andando por el anillo (1ª persona)");
  j.check("arrastrar gira la cámara mientras anda sola (1ª persona)", (await dragLook(p, "interior")) > 0.2);
  // Third person: the eye switches the view and she keeps walking by herself.
  await j.tap(".interior-ui .view-btn", "Vista: 3ª persona");
  const leg0 = await p.evaluate(() => window.codeship.journey.legIndex);
  await p.waitForFunction((i) => window.codeship.journey.legIndex > i || !window.codeship.journey.active, leg0, { timeout: 60000 }).catch(() => {});
  j.check("en tercera persona sigue andando sola", await p.evaluate((i) => window.codeship.journey.legIndex > i && window.codeship.journey.active, leg0));
  await capture(j, "tercera", "Viaje en tercera persona");
  await j.tap(".interior-ui .view-btn", "Vista: 1ª persona");

  // Up the spoke's car.
  const rode = await p.waitForFunction(() => window.codeship.interior.zones.zone === "radio", null, { timeout: 120000 }).then(() => true).catch(() => false);
  j.check("sube por el ascensor del radio", rode);
  await capture(j, "ascensor", "Viaje: ascensor del radio");
  j.check("en el ascensor la cámara se sigue moviendo", (await dragLook(p, "interior")) > 0.2);

  // In the spine: «Parar» stops her where she is and gives the controls back.
  const spine = await p.waitForFunction(() => window.codeship.interior.zones.zone === "eje" && window.codeship.journey.plan[window.codeship.journey.legIndex]?.kind === "saltos", null, { timeout: 90000 }).then(() => true).catch(() => false);
  j.check("en el eje salta sola por la espina", spine);
  await p.waitForTimeout(1500);
  await capture(j, "espina", "Viaje: saltos por la espina");
  await j.tap(".journey-bar .jb-stop", "Parar");
  await p.waitForTimeout(600);
  const stopped = await p.evaluate(() => ({ active: window.codeship.journey.active, zone: window.codeship.interior.zones.zone, routing: window.codeship.interior.zones.routing }));
  j.check("«Parar» la detiene a medio camino, en la espina", !stopped.active && stopped.zone === "eje" && !stopped.routing, JSON.stringify(stopped));
  await p.waitForFunction(() => window.codeship.interior.zones.iva.motion.kind === "sujeta", null, { timeout: 15000 }).catch(() => {});
  j.check("al parar vuelven los mandos (las flechas)", await visible(p, ".interior-ui .zg-pad"));
  await capture(j, "parada", "Parada en la espina");

  // «Ir» again: from where she stopped, through the docking hatch into the station.
  await j.tap(".tasks-btn", "Tareas");
  await go(j, task);
  await p.waitForTimeout(500);
  j.check("al volver a «Ir» sigue desde donde se paró (sin volver al anillo)", await p.evaluate(() => window.codeship.journey.active && !window.codeship.journey.plan.some((l) => l.kind === "ascensor")));
  const through = await p.waitForFunction(() => window.codeship.stationInside.active || window.codeship.station.active, null, { timeout: 120000 }).then(() => true).catch(() => false);
  const passed = await p.evaluate(() => window.codeship.journey.plan.slice(0, window.codeship.journey.legIndex + 1).some((l) => l.kind === "escotilla" && l.from === "eje:atraque") || !window.codeship.journey.active);
  j.check("cruza la escotilla de atraque a la estación", through && passed);
  if (await p.evaluate(() => window.codeship.stationInside.active)) await capture(j, "estacion", "Viaje: saltos por la estación");
  const arrived = await p.waitForFunction(() => window.codeship.station.active && !window.codeship.journey.active, null, { timeout: 120000 }).then(() => true).catch(() => false);
  j.check("llega: se abre la pantalla de la estación en la pestaña de la tarea", arrived);
  j.check("al llegar, sin «Parar» y sin la clase de viaje", !(await visible(p, ".journey-bar .jb-stop")) && !(await p.evaluate(() => document.body.classList.contains("in-journey"))));
  await capture(j, "llegada", "Llegada a la tarea de la estación");
}
