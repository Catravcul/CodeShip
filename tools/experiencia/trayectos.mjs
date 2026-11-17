// PX-36 Real journeys (docs/design/viajes.md, «Trayectos por dentro» and «Un solo reloj»; docs/design/reglas.md §3):
// from the lander's seat, «Ir» to a station task in «Viaje» mode walks the whole way: the LM's roof hatch opens,
// hops through Starship's three decks, the ceiling hatch up to the flight deck opens, the walk to the navigation
// table, Starship flies and berths like Crew Dragon Demo-1 (minutes of real time, at the board's ×60), «Ver
// trayecto» shows the real ship in the real scene with a camera that turns and zooms, then back down, through
// the nose tunnel and the station's hops to the machine. Then the bay: the Starship at true scale, pinch to zoom.
// iPhone 13; captures in docs/screenshots/trayectos-*-movil.png.
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
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await p.waitForTimeout(800);
  await j.tap(".room-ui:not(.hidden) .cab-tasks", "Tareas");
  j.check("«Viaje» está elegido por defecto en la lista de tareas", (await j.texts('.task-board .tb-travel [aria-pressed="true"]')).join() === "Viaje", (await j.texts('.task-board .tb-travel [aria-pressed="true"]')).join());
  await j.tap(`.task-board .tb-go[aria-label="Ir: ${task.replace(/"/g, '\\"')}"]`, `Ir: ${task}`);
  await p.waitForTimeout(500);
  const plan = await p.evaluate(() => window.codeship.journey.plan.map((l) => ({ kind: l.kind, from: l.from, to: l.to, label: l.label, s: Math.round(l.seconds) })));
  const route = plan.map((l) => `${l.kind} ${l.to}`).join(" → ");
  j.check("el camino recorre el LM, las cubiertas de la Starship, la cubierta de vuelo y la estación, sin teletransporte", plan.some((l) => l.to.startsWith("nave:")) && plan.some((l) => l.to === "puente:nav") && plan.some((l) => l.kind === "vuelo") && plan.at(-1)?.to.startsWith("estacion:"), route);
  j.check("cuatro escotillas: techo del LM, cubierta de vuelo (subir y bajar) y túnel de proa", plan.filter((l) => l.kind === "escotilla").length === 4, route);
  const s0 = await state(p);
  j.check("no sale el aviso de teletransporte", !/Teletransporte|aún no está/.test(s0.note), s0.note);

  // 1. The LM's roof hatch opens before she goes up.
  const s1 = await until(p, (s) => s.cabinLeaf > 0.3 || s.leg > 1, 30000);
  j.check("la escotilla del techo del LM se abre (la hoja gira) antes de subir", s1.cabinLeaf > 0.3, `hoja ${s1.cabinLeaf.toFixed(2)}`);
  await capture(j, "1-escotilla-lm", "Abre la escotilla del techo del LM", false);

  // 2. Hops through the decks; the flight deck hatch opens.
  const s2 = await until(p, (s) => (s.kind === "escotilla" && s.shipLeaf > 0.3) || s.kind === "andar" && s.leg > 3, 150000);
  j.check("en la cubierta 1 abre la escotilla del techo a la cubierta de vuelo", s2.shipLeaf > 0.3, JSON.stringify(s2));
  await capture(j, "2-escotilla-cubierta-vuelo", "Abre la escotilla a la cubierta de vuelo", false);
  const s3 = await until(p, (s) => s.kind === "vuelo", 90000);
  j.check("anda hasta la mesa de navegación del puente y la Starship despega", s3.kind === "vuelo", JSON.stringify(s3));

  // 3. The flight: minutes, at the board's pace; «Ver trayecto» shows the real ship in the real scene.
  await p.waitForFunction(() => !!window.codeship.nav.progress(), null, { timeout: 30000 }).catch(() => {});
  const fl = await p.evaluate(() => {
    const c = window.codeship;
    const q = c.nav.progress();
    return { eta: q?.etaRealS ?? 0, lapse: q?.lapse ?? 0 };
  });
  j.check("el viaje de la Starship a la estación dura minutos reales (más de 60 s), no segundos", fl.eta > 60, `${Math.round(fl.eta)} s`);
  j.check("va al ritmo de a bordo: ×60 (una hora de juego por minuto real)", Math.abs(fl.lapse - 60) < 0.5, `×${fl.lapse.toFixed(1)}`);
  await j.tap(".journey-bar .jb-view", "Ver trayecto");
  await p.waitForTimeout(1200);
  const view = await p.evaluate(() => ({ on: window.codeship.tripPreview.visible, d: window.codeship.tripPreview.distanceM, path: window.codeship.tripPreview.pathPoints, ship: window.codeship.mothership.spec.layout.lengthM }));
  j.check("«Ver trayecto» muestra la Starship en la escena del espacio con su ruta dibujada", view.on && view.path >= 2, JSON.stringify(view));
  j.check("la cámara está cerca, a unas esloras de la Starship (se ve el casco, no un punto)", view.d > view.ship && view.d < 5 * view.ship, `${Math.round(view.d)} m de una nave de ${view.ship} m`);
  await capture(j, "3-ver-trayecto", "Ver trayecto: la Starship volando a la estación");
  // The camera always moves: drag to turn round the ship.
  const before = await p.evaluate(() => window.codeship.tripPreview.camera.position.toArray());
  await p.mouse.move(195, 300);
  await p.mouse.down();
  await p.mouse.move(280, 330, { steps: 6 });
  await p.mouse.up();
  await p.waitForTimeout(400);
  const after = await p.evaluate(() => window.codeship.tripPreview.camera.position.toArray());
  const moved = Math.hypot(...after.map((v, i) => v - before[i]));
  j.check("arrastrar gira la cámara alrededor de la nave", moved > 1, `${moved.toFixed(1)} m`);
  await capture(j, "4-ver-trayecto-girado", "Ver trayecto girado a mano");
  // The berthing: the last approach, like Demo-1.
  const dock = await (async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 300000) {
      const q = await p.evaluate(() => window.codeship.nav.progress()?.phase);
      if (q === "dock") return true;
      if (!(await p.evaluate(() => window.codeship.journey.active))) return false;
      await p.waitForTimeout(500);
    }
    return false;
  })();
  j.check("se acerca al puerto despacio, como la Crew Dragon (fase de atraque)", dock);
  if (dock) await capture(j, "5-atraque", "Atraque: la Starship se acerca a la estación");
  if (await p.evaluate(() => window.codeship.tripPreview.visible)) await j.tap(".journey-bar .jb-view", "Ocultar trayecto");

  // 4. Down the hatch, the nose tunnel and the station's hops; the machine opens.
  const s5 = await until(p, (s) => s.kind === "escotilla" && s.label.includes("túnel") && s.shipLeaf > 0.3, 400000);
  j.check("abre la escotilla del túnel de proa para pasar a la estación", s5.shipLeaf > 0.3, JSON.stringify(s5));
  await capture(j, "6-tunel-proa", "Abre el túnel de proa", false);
  const end = await until(p, (s) => !s.active, 200000);
  const arrived = await p.evaluate(() => ({ screen: window.codeship.station.active, berthed: !!window.codeship.mothership.dockedTo }));
  j.check("llega a la máquina de la estación y se abre su pestaña, con la Starship atracada", !end.active && arrived.screen && arrived.berthed, JSON.stringify(arrived));
  await capture(j, "7-llegada", "Llegada a la pestaña de planos");

  // 5. The bay: Starship at true scale, framed by its size; pinch zooms.
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
  await capture(j, "8-bahia-nodriza", "Bahía con la Starship a escala real");
  const cdp = await p.context().newCDPSession(p);
  const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  await touch("touchStart", [[170, 250], [220, 250]]);
  for (let i = 1; i <= 8; i++) await touch("touchMove", [[170 - i * 12, 250], [220 + i * 12, 250]]);
  await touch("touchEnd", []);
  await p.waitForTimeout(1500);
  const zoomed = await p.evaluate(() => window.codeship.bay.view.distanceM);
  j.check("pellizcar acerca la cámara de la bahía", zoomed < home * 0.8, `${Math.round(home)} → ${Math.round(zoomed)} m`);
  await capture(j, "9-bahia-zoom", "Bahía con zoom de pellizco");
}
