// PX-36 Real journeys (docs/design/viajes.md, «Trayectos por dentro» and «Un solo reloj»; docs/design/reglas.md §3,
// §3.5, §3.6): from the lander's seat, «Ir» to a station task in «Viaje» mode walks to the travel room and stops
// there: the LM's roof hatch opens, hops through Starship's three decks, the ceiling hatch up to the flight deck
// opens, the walk to the pilot seat, and a notice says she has to travel first (a task never flies a ship).
// The pilot seat offers both modes, «Manual» and «Automático (retos)» (docs/design/puente.md); «Automático» opens
// the navigation window, she picks the station and solves the trip's challenges; Starship flies there and berths
// like Crew Dragon Demo-1; «Ver trayecto» shows the real ship in the real scene with a camera that turns. Then
// «Ir» again: down, through the nose tunnel and the station's hops to the machine. Then the bay: the Starship at
// true scale, «+» to zoom. iPhone 13; captures in docs/screenshots/trayectos-*-movil.png.
import { mkdirSync } from "node:fs";

async function capture(j, label, title, overlaps = true) {
  await j.page.waitForTimeout(500);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/trayectos-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  if (!overlaps) return;
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

const state = (p) =>
  p.evaluate(() => {
    const c = window.codeship;
    const st = c.starship;
    return {
      active: c.journey.active,
      leg: c.journey.legIndex,
      kind: c.journey.plan[c.journey.legIndex]?.kind,
      label: c.journey.plan[c.journey.legIndex]?.label,
      cabinLeaf: c.cabin.leafOpen("acople"),
      shipThrough: !!st?.mode.throughHatch,
      shipLeaf: Math.max(st?.mode.leafOpen("subir-cubierta-vuelo") ?? 0, st?.mode.leafOpen("salir-modulo") ?? 0, st?.mode.leafOpen("salir-estacion") ?? 0),
      bridgeLeaf: c.bridge.leafOpen("salida"),
      note: document.querySelector(".journey-note.on")?.textContent ?? "",
      status: c.nav.status,
    };
  });

/** Wait until `pred(state)` holds (polling), or the time is up; returns the last state. */
async function until(p, pred, ms) {
  const t0 = Date.now();
  let s = await state(p);
  while (!pred(s) && Date.now() - t0 < ms) {
    await p.waitForTimeout(250);
    s = await state(p);
  }
  return s;
}

export async function trayectos(j) {
  const p = j.page;
  const ship = await p.evaluate(() => ({ name: window.codeship.mothership.spec.name, lander: window.codeship.docking.dockedTo === window.codeship.mothership, berthed: !!window.codeship.mothership.dockedTo }));
  j.check("partida nueva: la Starship lejos de la estación, el LM acoplado y ella en su asiento", ship.name === "Starship" && ship.lander && !ship.berthed, JSON.stringify(ship));

  // «Ir» to a station task in «Viaje» mode (the default), from the LM's seat.
  const task = await p.evaluate(() => window.codeship.tasks().find((t) => t.place.vehicle === "estacion" && t.place.spot === "pantalla" && t.place.tab === "planos")?.title);
  if (!task) return j.check("hay una tarea de planos de la estación", false);
  const goTask = async (title) => {
    await p.waitForFunction(() => document.body.classList.contains("in-tasks"), null, { timeout: 8000 }).catch(() => {});
    await j.tap(`.task-board .tb-go[aria-label="Ir: ${title.replace(/"/g, '\\"')}"]`, `Ir: ${title}`);
  };
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await p.waitForTimeout(800);
  await j.tap(".room-ui:not(.hidden) .cab-tasks", "Tareas");
  // The list's settings (the gear): «Viaje» is the default; the vehicle goes to «Todos» to see the station's tasks from the LM.
  await j.tap('.task-board .board-head [data-view][aria-label="Ajustes de tareas"]', "⚙︎ Ajustes de tareas");
  j.check("«Viaje» está elegido por defecto en los ajustes de la lista de tareas", (await j.texts('.task-board .tb-travel [aria-checked="true"]')).join() === "Viaje", (await j.texts('.task-board .tb-travel [aria-checked="true"]')).join());
  await j.tap('.task-board .tb-settings [data-vehicle="todos"]', "Vehículo: Todos");
  await j.tap('.task-board .board-head [data-view][aria-label="Volver a la lista de tareas"]', "Lista de tareas");
  await goTask(task);
  await p.waitForTimeout(500);
  const plan = await p.evaluate(() => window.codeship.journey.plan.map((l) => ({ kind: l.kind, from: l.from, to: l.to, label: l.label, s: Math.round(l.seconds) })));
  const route = plan.map((l) => `${l.kind} ${l.to}`).join(" → ");
  j.check("el camino va por el LM y las cubiertas de la Starship hasta el puesto de pilotaje y para allí: una tarea no hace volar la nave (reglas §3.5)", plan.some((l) => l.to.startsWith("nave:")) && plan.at(-1)?.to === "puente:prop" && !plan.some((l) => l.kind === "vuelo"), route);
  j.check("dos escotillas a pie: techo del LM y cubierta de vuelo", plan.filter((l) => l.kind === "escotilla").length === 2, route);
  const s0 = await state(p);
  j.check("no sale el aviso de teletransporte", !/Teletransporte|aún no está/.test(s0.note), s0.note);

  // 1. The LM's roof hatch opens before she goes up.
  const s1 = await until(p, (s) => s.cabinLeaf > 0.3 || s.leg > 1, 30000);
  j.check("la escotilla del techo del LM se abre (la hoja gira) antes de subir", s1.cabinLeaf > 0.3, `hoja ${s1.cabinLeaf.toFixed(2)}`);
  await capture(j, "1-escotilla-lm", "Abre la escotilla del techo del LM", false);

  // 2. Hops through the decks; the flight deck hatch opens; she stops at the navigation table and is told to travel.
  const s2 = await until(p, (s) => (s.kind === "escotilla" && s.shipLeaf > 0.3) || (s.kind === "saltos" && s.leg > 3), 150000);
  j.check("en la cubierta 1 abre la escotilla del techo a la cubierta de vuelo", s2.shipLeaf > 0.3, JSON.stringify(s2));
  await capture(j, "2-escotilla-cubierta-vuelo", "Abre la escotilla a la cubierta de vuelo", false);
  const s3 = await until(p, (s) => !s.active, 120000);
  const atDeck = await p.evaluate(() => ({ bridge: window.codeship.bridge.active, status: window.codeship.nav.status, berthed: !!window.codeship.mothership.dockedTo }));
  j.check("va a saltos hasta el puesto de pilotaje de la cubierta de vuelo y la Starship no despega sola", !s3.active && atDeck.bridge && atDeck.status !== "carrier" && !atDeck.berthed, JSON.stringify(atDeck));
  j.check("un aviso dice que primero hay que viajar a la estación, con los dos modos", /primero hay que viajar a la estación/.test(s3.note) && /Manual/.test(s3.note) && /Automático \(retos\)/.test(s3.note), s3.note);
  await capture(j, "3-aviso-viajar", "Aviso: primero hay que viajar", false);

  // 3. At the pilot seat: both modes (reglas §3.6); no destination there: «Automático» opens the navigation window.
  await j.useMachine("bridge", "prop", null);
  await p.waitForTimeout(800);
  const dock = await p.evaluate(() => window.codeship.nav.targets.find((t) => t.kind === "dock" && t.carrierPort)?.id);
  const modes = await j.texts(".room-ui:not(.hidden) .cab-machine [data-act]");
  j.check("el puesto de pilotaje ofrece «Manual» y «Automático (retos)», sin selector de destino", modes.includes("Manual") && modes.some((t) => /Automático \(retos\)/.test(t)) && !(await p.locator(".room-ui:not(.hidden) select").count()), modes.join(" | "));
  await j.tap('.room-ui:not(.hidden) .cab-machine [data-act="auto"]', "Automático (retos)");
  await p.waitForTimeout(700);
  await j.tap(`.nav-map .nav-chip[data-id="${dock}"]`, "la estación en la ventana de navegación");
  await j.tap('.nav-map [data-act="program"]', "Programar viaje");
  await j.waitDuel(30000);
  for (let n = 0; n < 9 && (await p.evaluate(() => window.codeship.nav.status)) === "programming"; n++) await j.answer(() => window.codeship.nav.programming?.current ?? null, true);
  await p.waitForFunction(() => [...document.querySelectorAll(".duel")].every((e) => e.classList.contains("hidden")), null, { timeout: 15000 }).catch(() => {});
  const fl = await p.evaluate(() => ({ status: window.codeship.nav.status, q: window.codeship.nav.progress() }));
  j.check("resuelta la cadena de retos, la Starship vuela sola su programa hacia la estación", fl.status === "carrier" && !!fl.q && !fl.q.manual, JSON.stringify({ status: fl.status, phase: fl.q?.phase }));
  if (await p.evaluate(() => window.codeship.deck.active)) await j.tap(".fd-panel.max .fd-back", "‹ Dejar la mesa de navegación");
  await j.useMachine("bridge", "prop", null);
  await p.waitForTimeout(600);
  await j.tap(".trip-chip .tc-view", "Ver trayecto");
  await p.waitForTimeout(1200);
  const view = await p.evaluate(() => ({ on: window.codeship.tripPreview.visible, d: window.codeship.tripPreview.distanceM, path: window.codeship.tripPreview.pathPoints, ship: window.codeship.mothership.spec.layout.lengthM }));
  j.check("«Ver trayecto» muestra la Starship en la escena del espacio con su ruta dibujada", view.on && view.path >= 2, JSON.stringify(view));
  j.check("la cámara está cerca, a unas esloras de la Starship (se ve el casco, no un punto)", view.d > view.ship && view.d < 5 * view.ship, `${Math.round(view.d)} m de una nave de ${view.ship} m`);
  await capture(j, "5-ver-trayecto", "Ver trayecto: la Starship volando a la estación");
  const before = await p.evaluate(() => window.codeship.tripPreview.camera.position.toArray());
  // The camera turns only with its joystick (reglas.md §5.7), never by dragging the screen.
  await j.stick(".cam-stick.trip-look .vstick", 50, 15, 700);
  await p.waitForTimeout(400);
  const after = await p.evaluate(() => window.codeship.tripPreview.camera.position.toArray());
  const moved = Math.hypot(...after.map((v, i) => v - before[i]));
  j.check("el joystick de cámara gira la vista alrededor de la nave", moved > 1, `${moved.toFixed(1)} m`);
  if (await p.evaluate(() => window.codeship.tripPreview.visible)) await j.tap(".trip-chip .tc-view", "Ocultar trayecto");
  // The trip ends with the berthing, flown by the computer like Crew Dragon Demo-1 (the docking seat's own ways: PX-40).
  const docking = await p.waitForFunction(() => window.codeship.nav.progress()?.phase === "dock" || !!window.codeship.mothership.dockedTo, null, { timeout: 300000 }).then(() => true).catch(() => false);
  j.check("al llegar, se acerca al puerto despacio, como la Crew Dragon (fase de atraque)", docking);
  if (docking) await capture(j, "6-atraque", "Atraque: la Starship se acerca a la estación");

  // Trips run on their own (reglas §3.8): while Starship berths she goes down to cook; the trip shows only at the flight deck.
  const meal = await p.evaluate(() => window.codeship.tasks().find((t) => t.place.vehicle === "nodriza" && /^Cocinar/.test(t.title))?.title);
  if (await p.evaluate(() => window.codeship.deck.active)) {
    // One console, one page: «‹» leaves the console, back to the bridge.
    await j.tap(".fd-panel.max .fd-back", "‹ Dejar la mesa de navegación");
  }
  await p.waitForTimeout(600);
  j.check("en el puesto de acople se ve el atraque (chip con el tiempo que falta)", await p.evaluate(() => window.codeship.bridge.active && !!document.querySelector(".trip-chip.on")));
  if (meal) {
    await j.setup("abre la lista de tareas", () => window.codeship.taskBoard.open());
    await goTask(meal);
    await p.waitForFunction(() => !window.codeship.bridge.active, null, { timeout: 120000 }).catch(() => {});
    await p.waitForTimeout(800);
    const away = await p.evaluate(() => ({ chip: !!document.querySelector(".trip-chip.on"), status: window.codeship.nav.status, berthed: !!window.codeship.mothership.dockedTo }));
    j.check("fuera del puente no sale el viaje, y la Starship sigue atracando sola", !away.chip && (away.status === "carrier" || away.berthed), JSON.stringify(away));
    await p.waitForFunction(() => !window.codeship.journey.active, null, { timeout: 200000 }).catch(() => {});
    await p.waitForTimeout(800);
    if (await p.evaluate(() => [...document.querySelectorAll(".duel")].some((e) => !e.classList.contains("hidden")))) {
      await j.shot("cocina-durante-el-atraque");
      if (await p.locator('.duel:not(.hidden) .duel-tools [data-act="close"]').count()) await j.tap('.duel:not(.hidden) .duel-tools [data-act="close"]', "× del reto");
      else if (await p.locator(".duel:not(.hidden) .x").count()) await j.tap(".duel:not(.hidden) .x", "Cerrar el reto");
    }
    j.check("mientras atraca, ella llega a la cocina de la cubierta 1", await p.evaluate(() => !!window.codeship.starship?.active), meal);
  }
  const berthed = await p.waitForFunction(() => !!window.codeship.mothership.dockedTo, null, { timeout: 300000 }).then(() => true).catch(() => false);
  j.check("la Starship atraca en la estación", berthed);

  // 4. «Ir» again, from where she is: the nose tunnel and the station's hops; the machine opens.
  await p.waitForTimeout(600);
  await j.setup("abre la lista de tareas", () => window.codeship.taskBoard.open());
  await goTask(task);
  await p.waitForTimeout(500);
  const plan2 = await p.evaluate(() => window.codeship.journey.plan.map((l) => `${l.kind} ${l.to}`).join(" → "));
  j.check("ahora el camino pasa por el túnel de proa a la estación", /estacion:/.test(plan2) && !/vuelo /.test(plan2), plan2);
  const s5 = await until(p, (s) => s.kind === "escotilla" && s.label.includes("túnel") && s.shipLeaf > 0.3, 400000);
  j.check("abre la escotilla del túnel de proa para pasar a la estación", s5.shipLeaf > 0.3, JSON.stringify(s5));
  await capture(j, "7-tunel-proa", "Abre el túnel de proa", false);
  const end = await until(p, (s) => !s.active, 200000);
  const arrived = await p.evaluate(() => ({ screen: window.codeship.station.active, berthed: !!window.codeship.mothership.dockedTo }));
  j.check("llega a la máquina de la estación y se abre su pestaña, con la Starship atracada", !end.active && arrived.screen && arrived.berthed, JSON.stringify(arrived));
  await capture(j, "8-llegada", "Llegada a la pestaña de planos");

  // 5. The bay: Starship at true scale, framed by its size; «+» zooms.
  await p.evaluate(() => window.codeship.station.active && window.codeship.station.exit());
  await p.waitForTimeout(600);
  const bayTask = await p.evaluate(() => window.codeship.tasks().find((t) => t.place.vehicle === "estacion" && t.place.spot === "bahia")?.title);
  if (bayTask) {
    if (await p.locator(".sti-ui:not(.hidden) .sti-tasks").count()) await j.tap(".sti-ui:not(.hidden) .sti-tasks", "Tareas");
    else await p.evaluate(() => window.codeship.taskBoard.open());
    await j.tap(`.task-board .tb-go[aria-label="Ir: ${bayTask.replace(/"/g, '\\"')}"]`, `Ir: ${bayTask}`);
    await p.waitForFunction(() => window.codeship.bay.active, null, { timeout: 120000 }).catch(() => {});
  }
  if (!(await p.evaluate(() => window.codeship.bay.active))) return j.check("la bahía se abre", false);
  await j.tap('.bay-tabs [data-view="nodriza"]', "Nodriza");
  await p.waitForTimeout(1500);
  const home = await p.evaluate(() => window.codeship.bay.view.homeDistanceM);
  j.check("la bahía encuadra la Starship a escala real por su tamaño (52 m)", home > 40 && home < 200, `${Math.round(home)} m`);
  await capture(j, "9-bahia-nodriza", "Bahía con la Starship a escala real");
  // The camera zooms with its «+» beside the joystick (reglas.md §5.7: never a pinch on the screen).
  await j.hold(".cam-stick.bay-look .cam-zoom button[data-z='1']", 1200);
  await p.waitForTimeout(400);
  const zoomed = await p.evaluate(() => window.codeship.bay.view.distanceM);
  j.check("«+» acerca la cámara de la bahía", zoomed < home * 0.8, `${Math.round(home)} → ${Math.round(zoomed)} m`);
  await capture(j, "10-bahia-zoom", "Bahía con «+»");
}
