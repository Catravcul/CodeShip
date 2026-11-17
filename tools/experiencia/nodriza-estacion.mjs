// The mothership travels to the station and goes into its dry dock (docs/design/dique-seco.md): from the
// ring, «Ir» to a station task in «Viaje» mode walks to the ring's navigation console and stops there with a
// notice to travel first (a task never flies a ship, docs/design/reglas.md §3.5); at the console «Programar
// viaje» and its challenges fly the mothership (not the lander); «Ver trayecto» shows her moving on her drawn
// path with the camera following; she berths in the open cradle, whose arms close on her spine; «Ir» again
// takes her into the station, and she is seen through the window of the docking hatch. Then the task list's switch goes to «Teletransporte», and the probe's «Ver trayecto»
// works the same. iPhone 13; captures in docs/screenshots/nodriza-*-movil.png.
import { mkdirSync } from "node:fs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(700);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/nodriza-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

const visible = (p, sel) =>
  p.evaluate((s) => [...document.querySelectorAll(s)].some((e) => {
    const r = e.getBoundingClientRect();
    return getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden" && !e.hidden && r.width > 0 && r.height > 0;
  }), sel);

const taskTitle = (p, kind) =>
  p.evaluate((k) => window.codeship.tasks().find((t) => (k === "anillo" ? t.place.spot === "anillo" : t.place.vehicle === "estacion" && t.place.spot === "pantalla"))?.title, kind);

async function go(j, title) {
  await j.page.waitForFunction(() => document.body.classList.contains("in-tasks"), null, { timeout: 8000 }).catch(() => {});
  return j.tap(`.task-board .tb-go[aria-label="Ir: ${title.replace(/"/g, '\\"')}"]`, `Ir: ${title}`);
}

export async function nodrizaEstacion(j) {
  const p = j.page;
  // To the ring the quick way: teleport from the cabin to a ring chore, chosen in the task list's switch.
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await p.waitForTimeout(800);
  await j.tap(".room-ui:not(.hidden) .cab-tasks", "Tareas");
  j.check("la lista de tareas lleva arriba el interruptor «Viaje / Teletransporte»", (await j.texts(".task-board .tb-travel button")).join("/") === "Viaje/Teletransporte");
  await j.tap('.task-board .tb-travel [data-travel="teletransporte"]', "Teletransporte");
  await go(j, await taskTitle(p, "anillo"));
  await p.waitForTimeout(400);
  await p.waitForFunction(() => [...document.querySelectorAll(".duel")].some((e) => !e.classList.contains("hidden")), null, { timeout: 20000 }).catch(() => {});
  await j.onlyChallengeVisible();
  if ((await j.texts(".duel .x")).length) await j.tap(".duel .x", "Cerrar el reto");
  j.check("en el anillo", await p.evaluate(() => window.codeship.interior.active));
  const start = await p.evaluate(() => ({ lander: window.codeship.docking.dockedTo === window.codeship.mothership, berthed: !!window.codeship.mothership.dockedTo }));
  j.check("la nodriza empieza lejos de la estación, con el módulo acoplado", start.lander && !start.berthed, JSON.stringify(start));

  // «Viaje» and «Ir» to a station task: the mothership flies.
  const task = await taskTitle(p, "estacion");
  if (!task) return j.check("hay una tarea de la estación en la lista", false);
  await j.tap(".tasks-btn", "Tareas");
  await j.tap('.task-board .tb-travel [data-travel="viaje"]', "Viaje");
  await capture(j, "tareas", "Lista de tareas con el interruptor en «Viaje»");
  await go(j, task);
  await p.waitForTimeout(600);
  const plan = await p.evaluate(() => window.codeship.journey.plan.map((l) => ({ kind: l.kind, from: l.from, to: l.to, label: l.label, s: Math.round(l.seconds) })));
  j.check("el camino lleva a la consola de navegación y para allí: una tarea no vuela la nave (reglas §3.5)", plan.length > 0 && !plan.some((l) => l.kind === "vuelo"), plan.map((l) => `${l.kind} ${l.to} ${l.s}s`).join(" → "));
  await p.waitForFunction(() => !window.codeship.journey.active, null, { timeout: 180000 }).catch(() => {});
  const told = await p.evaluate(() => ({ note: document.querySelector(".journey-note.on")?.textContent ?? "", status: window.codeship.nav.status }));
  j.check("al llegar a la consola, un aviso dice que primero hay que viajar y la nodriza no despega sola", /primero hay que viajar/.test(told.note) && told.status !== "carrier", JSON.stringify(told));

  // At the console: «Programar viaje» and its challenges fly her (reglas §3.6: also «Pilotar a mano»).
  await j.setup("usa la consola de navegación del anillo (la del final del camino)", () => window.codeship.deck.enter("interior", "nav"));
  await p.waitForTimeout(1200);
  const dock = await p.evaluate(() => window.codeship.nav.targets.find((t) => t.kind === "dock")?.id);
  await j.tap(`.nav-map .nav-chip[data-id="${dock}"]`, "estación en el mapa");
  await p.waitForTimeout(400);
  const modes = await j.texts('.nav-map [data-act="program"], .nav-map [data-act="hand"]');
  j.check("la tarjeta de la estación ofrece «Programar viaje» y «Pilotar a mano»", modes.some((t) => /Programar viaje/.test(t)) && modes.some((t) => /Pilotar a mano/.test(t)), modes.join(" | "));
  await j.tap('.nav-map [data-act="program"]', "Programar viaje");
  await j.waitDuel(30000);
  for (let n = 0; n < 12 && (await p.evaluate(() => window.codeship.nav.status)) === "programming"; n++) {
    await j.answer(() => window.codeship.nav.programming?.current ?? null);
    await p.waitForTimeout(900);
  }
  const fly = await p.evaluate(() => window.codeship.nav.progress()?.etaRealS ?? 0);
  // At the board's pace, ×60 (docs/design/viajes.md «Un solo reloj»): minutes, capped at 10 plus the berthing.
  j.check("con el último reto la nodriza despega; el vuelo dura minutos reales al ritmo de a bordo (entre 1 y 11 min)", fly >= 60 && fly <= 660, `${Math.round(fly)} s`);
  const flying = await p.evaluate(() => window.codeship.nav.status === "carrier");
  j.check("la nodriza vuela con el piloto automático", flying);
  await p.waitForTimeout(600);
  await p.waitForFunction(() => !!document.querySelector(".trip-chip .tc-view") && getComputedStyle(document.querySelector(".trip-chip")).display !== "none", null, { timeout: 8000 }).catch(() => {});
  j.check("en el chip del viaje se ve «Ver trayecto» mientras vuela", await visible(p, ".trip-chip .tc-view"));
  const before = await p.evaluate(() => { const m = window.codeship.mothership.position; return [m.x, m.y, m.z]; });
  await j.tap(".trip-chip .tc-view", "Ver trayecto");
  // A frame or two (SwiftShader draws a few per second).
  await p.waitForFunction(() => window.codeship.tripPreview.pathPoints >= 2, null, { timeout: 20000 }).catch(() => {});
  const pip = await p.evaluate(() => ({ on: window.codeship.tripPreview.visible, points: window.codeship.tripPreview.pathPoints, label: document.querySelector(".trip-pip .tp-label")?.textContent, route: window.codeship.nav.route.length }));
  j.check("«Ver trayecto» enseña la nodriza en directo con su ruta dibujada", pip.on && pip.points >= 2 && /Nodriza/.test(pip.label ?? ""), JSON.stringify(pip));
  await capture(j, "trayecto", "Ver trayecto: la nodriza sobre su ruta");
  const after = await p.evaluate(() => { const m = window.codeship.mothership.position; return [m.x, m.y, m.z]; });
  const moved = Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2]);
  j.check("la nodriza avanza por la ruta mientras la cámara la sigue", moved > 1, `${Math.round(moved)} m`);
  j.check("la cámara del trayecto mira a la nodriza", await p.evaluate(() => {
    const c = window.codeship.tripPreview.camera;
    const m = window.codeship.mothership.position;
    const v = { x: m.x - c.position.x, y: m.y - c.position.y, z: m.z - c.position.z };
    c.updateMatrixWorld();
    const e = c.matrixWorld.elements;
    const f = [-e[8], -e[9], -e[10]];
    const n = Math.hypot(v.x, v.y, v.z);
    return (v.x * f[0] + v.y * f[1] + v.z * f[2]) / n > 0.9;
  }));

  // Trips run on their own (reglas §3.8): away from the console the trip does not show, and she flies on.
  if (await p.evaluate(() => window.codeship.tripPreview.visible)) await j.tap(".trip-chip .tc-view", "Ocultar trayecto");
  await j.tap(".fd-panel.max .fd-back", "‹ Dejar la consola");
  await p.waitForTimeout(800);
  const away = await p.evaluate(() => ({ deck: window.codeship.deck.active, chip: !!document.querySelector(".trip-chip.on"), status: window.codeship.nav.status }));
  j.check("lejos de la consola no sale el viaje y la nodriza sigue volando sola", !away.deck && !away.chip && away.status === "carrier", JSON.stringify(away));
  j.check("y se puede mover la cámara y tocar botones (nada atrapado)", await p.evaluate(() => !document.body.classList.contains("in-trip-view")));

  // She berths in the dry dock; the arms close.
  const berthed = await p.waitForFunction(() => !!window.codeship.mothership.dockedTo, null, { timeout: 600000 }).then(() => true).catch(() => false);
  j.check("la nodriza atraca en la estación", berthed);
  const inDock = await p.evaluate(() => {
    const c = window.codeship;
    const st = c.structure.position;
    const m = c.mothership.position;
    const q = c.structure.orientation;
    // In the station's frame: the dock runs along −z from node 2, ±64 m across.
    const local = q.conjugate().rotate(m.sub(st));
    return { x: Math.round(local.x), y: Math.round(local.y), z: Math.round(local.z), lander: c.docking.dockedTo === c.mothership };
  });
  j.check("dentro del dique seco (eje del puerto, delante del Nodo 2)", Math.abs(inDock.x) < 5 && Math.abs(inDock.y) < 5 && inDock.z < -60 && inDock.z > -170, JSON.stringify(inDock));
  await p.waitForFunction(() => window.codeship.dryDock.model.holding > 0.95, null, { timeout: 30000 }).catch(() => {});
  j.check("los brazos del dique se cierran y los focos se encienden", await p.evaluate(() => window.codeship.dryDock.model.holding > 0.95 && window.codeship.dryDock.model.lit > 0.9));

  // «Ir» again: along the spine and through the docking hatch into the station; then its window shows her.
  await j.setup("abre la lista de tareas", () => window.codeship.taskBoard.open());
  await go(j, task);
  const inside = await p.waitForFunction(() => window.codeship.stationInside.active || window.codeship.station.active || !window.codeship.journey.active, null, { timeout: 300000 }).then(() => true).catch(() => false);
  j.check("el viaje sigue por la espina y la escotilla de atraque hasta la estación", inside);
  await p.waitForFunction(() => !window.codeship.journey.active, null, { timeout: 300000 }).catch(() => {});
  await j.setup("vuelve de la pantalla de la estación a la escotilla de la nodriza", () => {
    const c = window.codeship;
    if (c.station.active) c.station.exit();
    if (!c.stationInside.active) c.stationInside.enter("nodriza");
    const f = c.stationInside.interior.plan.fixtures.find((x) => x.action.kind === "salir" && x.action.to === "nodriza");
    return c.stationInside.placeAt(f.id);
  });
  await p.waitForTimeout(800);
  await j.tap('.sti-card:not(.hidden) [data-act="ventana"]', "Mirar el dique por la ventanilla");
  await p.waitForTimeout(1200);
  const seen = await p.evaluate(() => {
    const c = window.codeship;
    const cam = c.dryDock.view.camera;
    const m = c.mothership.position;
    const v = new cam.position.constructor(m.x, m.y, m.z).project(cam);
    return { open: c.dryDock.viewing, ndc: [Number(v.x.toFixed(2)), Number(v.y.toFixed(2)), Number(v.z.toFixed(3))], status: document.querySelector(".dock-view .dv-status")?.textContent };
  });
  j.check("por la ventanilla se ve la nodriza en el dique", seen.open && Math.abs(seen.ndc[0]) < 1 && Math.abs(seen.ndc[1]) < 1 && seen.ndc[2] < 1, JSON.stringify(seen));
  j.check("y lo dice: brazos cerrados y umbilicales conectados", /brazos cerrados/.test(seen.status ?? ""), seen.status);
  await capture(j, "dique", "La nodriza en el dique seco, vista desde la estación");
  await j.tap(".dock-view .dv-close", "Cerrar las cámaras del dique");

  // The switch to «Teletransporte» in the task list, from the station.
  await j.tap(".sti-ui .sti-tasks", "Tareas");
  await j.tap('.task-board .tb-travel [data-travel="teletransporte"]', "Teletransporte");
  const tele = await p.evaluate(() => ({ s: window.codeship.settings.value.taskTravel, saved: JSON.parse(localStorage.getItem("codeship.ajustes") ?? "{}").taskTravel, on: document.querySelector(".task-board .tb-travel .on")?.textContent }));
  j.check("«Teletransporte» en la lista de tareas se guarda en codeship.ajustes (un solo ajuste)", tele.s === "teletransporte" && tele.saved === "teletransporte" && tele.on === "Teletransporte", JSON.stringify(tele));
  await capture(j, "teletransporte", "Interruptor en «Teletransporte»");
  await j.tap(".task-board [data-close]", "Cerrar tareas");

  // The probe's «Ver trayecto»: the same view, on its own path.
  await j.setup("la sonda tiene un plan cargado hacia el asteroide", () => window.codeship.probeTravel.trip.engage({ kind: "asteroid", body: window.codeship.expedition.asteroid }));
  await p.waitForTimeout(800);
  const probeOn = await visible(p, ".trip-chip.on .tc-view");
  j.check("con la sonda volando sola, la ficha de viaje ofrece «Ver trayecto»", probeOn && (await j.texts(".trip-chip.on .tc-view"))[0] === "Ver trayecto");
  if (probeOn) {
    await j.tap(".trip-chip.on .tc-view", "Ver trayecto (sonda)");
    await p.waitForFunction(() => /Sonda/.test(document.querySelector(".trip-pip .tp-label")?.textContent ?? ""), null, { timeout: 20000 }).catch(() => {});
    const sp = await p.evaluate(() => ({ on: window.codeship.tripPreview.visible, points: window.codeship.tripPreview.pathPoints, label: document.querySelector(".trip-pip .tp-label")?.textContent }));
    j.check("«Ver trayecto» de la sonda enseña su ruta y la sigue", sp.on && sp.points >= 2 && /Sonda/.test(sp.label ?? ""), JSON.stringify(sp));
    await capture(j, "sonda", "Ver trayecto de la sonda");
  }
}
