// PX-48 The whole initiation's last phase (docs/design/santuario3-lanzamiento.md, s3-lanzamiento), on an iPhone 13
// with visible taps. Before the other posts, the suit-up waits. Posts 1–9, 11 and 12 are marked passed by the test
// hook (PX-46 and PX-47 play them); then at 9:00 Luciana gives post 10 in mission control (the Electron rises off the
// launch tree's crown on the front screen) and Irosene post 13 in the suit-up room (suit, helmet, umbilical, leak
// check). She flies «Por reto» to the crew pad and, at the tower, her launch day: the access arm and the white room,
// the countdown (the arm swings away), the ascent (the first stage falls away, Dragon alone) and the rendezvous by
// challenge (Dragon's display at each waypoint). Docked, the slot becomes a level-6 game and the page goes on in the
// Starship, with the cruise to Bennu running. Captures in docs/screenshots/px48-<paso>-movil.png.
import { mkdirSync } from "node:fs";
import { goArea } from "./s3-detalle.mjs";

async function capture(j, label) {
  await j.page.waitForTimeout(400);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/px48-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
}

const s3 = (p) =>
  p.evaluate(() => {
    const c = window.codeshipS3;
    return { body: c.body, mode: c.mode, island: c.island, near: c.near, hour: c.hour, passed: c.passed, busy: c.stage.busy, craftY: c.craftY(), launchDone: c.launchDone, handedOver: c.handedOver ?? null };
  });

async function until(j, ok, ms) {
  const t0 = Date.now();
  let s = await s3(j.page);
  while (!ok(s) && Date.now() - t0 < ms) {
    await j.page.waitForTimeout(300);
    s = await s3(j.page);
  }
  return s;
}

const oracle = () => window.codeshipS3.exercise ?? window.codeshipS3.trace?.state;

/** Gathers in the page, every 150 ms, what the launches show (the beats are faster than a capture). */
const watch = (p) =>
  p.evaluate(() => {
    const seen = (window.__px48 = { things: [], ePhases: [], eRise: 0, screen: false, fPhases: [], fRise: 0, arm: 0, sep: false, display: false, herY: 0 });
    const add = (a, v) => v && !a.includes(v) && a.push(v);
    window.__px48timer = setInterval(() => {
      const c = window.codeshipS3;
      seen.handedOver ||= c.handedOver ?? null;
      // Docked, the page reloads into the Starship 3,5 s later (aerial-sanctuary.ts): on a slow runner that can come
      // before she reads this, so it is kept where the reload does not wipe it.
      sessionStorage.setItem("px48", JSON.stringify(seen));
      const l = c.launch;
      for (const [k, o] of c.stage.things.entries()) if (o.visible) add(seen.things, k);
      add(seen.ePhases, l.ePhase);
      if (l.electron) seen.eRise = Math.max(seen.eRise, l.electron.position.y - l.eRest.y);
      seen.screen ||= !!l.screen?.visible;
      if (l.active === "falcon") add(seen.fPhases, l.fPhase);
      if (l.falcon) seen.fRise = Math.max(seen.fRise, l.falcon.position.y - l.fRest.y);
      seen.arm = Math.max(seen.arm, l.pivot.rotation.y);
      seen.sep ||= !!l.parts.first && l.parts.first.position.y < -5;
      seen.display ||= !!l.display?.mesh.visible;
      if (!l.flightT) seen.herY = Math.max(seen.herY, c.rig.position.y);
    }, 150);
  });
// It keeps gathering until the reload (the hand-over comes after the last challenge).
const seenNow = (p) => p.evaluate(() => window.__px48 ?? JSON.parse(sessionStorage.getItem("px48") ?? "null"));

/** Answer the open sheet right, block by block, letting each beat play; then «Continuar». */
async function solve(j, title) {
  const p = j.page;
  await j.waitDuel(60000);
  for (let i = 0; i < 4; i++) {
    if (!(await p.evaluate(oracle))) break;
    // One call draws the whole compound (retos-trazos.md): the launch day's next challenge opens right after it, and
    // is the next `solve`'s.
    const drawing = await j.tracing();
    await j.answer(oracle, true);
    await p.waitForTimeout(2600);
    if (drawing) break;
  }
  // The last one docks, and the page may already be reloading into the Starship: nothing busy there.
  for (let k = 0; k < 40 && (await s3(p).catch(() => ({ busy: false }))).busy; k++) await p.waitForTimeout(500);
  // The sheet of options says «Conseguido»; the drawing ends on its molecule and closes by itself.
  const drawn = !(await j.page.locator(".duel:not(.hidden)").count());
  const result = drawn ? "Conseguido" : ((await j.texts(".duel .result"))[0] ?? "");
  j.check(`${title}: el reto se completa («Conseguido»)`, /Conseguido/.test(result), result);
}

async function goPost(j, n, title) {
  await j.tap(".s3-tasks", "Tareas");
  await j.tap(`.task-board [data-go="s3-puesto-${n}"]`, `Ir: ${title}`);
  await until(j, (s) => s.mode === "libre" && s.near, 30000);
}

/**
 * Drawing a compound takes a while of the board clock (a board hour is a real minute, retos-trazos.md): past 9:30 she
 * plays the post the next morning at 9:12, and waits, as a player does, for its trainer to walk to it.
 */
async function morning(j, n) {
  await j.page.evaluate(() => {
    const c = window.codeshipS3;
    if (c.hour > 9.5 || c.hour < 9) c.setHour(9.2);
  });
  await j.trainerAtPost(n);
}

async function post(j, n, title, who, label) {
  const p = j.page;
  await morning(j, n);
  await goPost(j, n, title);
  await j.showPanel(".s3-ui .cm-who");
  const card = (await j.texts(".s3-ui .cab-machine:not(.hidden) .cm-who"))[0] ?? "";
  j.check(`${title}: la tarjeta dice quién da el reto: ${who}, de turno`, new RegExp(`${who}, de turno`).test(card) && !/camino/.test(card), card);
  await j.tap('.s3-ui .cab-machine:not(.hidden) [data-act="reto"]', `Empezar el reto: ${title}`);
  await watch(p);
  await j.waitDuel();
  // The first step (a glyph of the drawing, or a block «Paso a paso»), then a look at its beat.
  await j.firstStep(oracle);
  await p.waitForTimeout(9000);
  await capture(j, `${label}-paso`);
  await solve(j, title);
  const seen = await seenNow(p);
  await j.endSheet();
  const after = await until(j, (s) => s.mode === "libre", 40000);
  j.check(`${title}: el puesto queda superado`, after.passed.includes(n), JSON.stringify(after.passed));
  return seen;
}

export async function iniciacionCompleta(j) {
  const p = j.page;
  await j.tap('.start-screen .mw-pick[data-pick="aereo"]', "Tarjeta: Santuario Aéreo");
  await j.tap('.start-screen .mw-go[data-go="aereo"]', "Jugar: Santuario Aéreo");
  await p.waitForFunction(() => window.codeshipS3, null, { timeout: 120000 });
  await p.waitForFunction(() => performance.getEntriesByName("codeship-primer-fotograma").length > 0, null, { timeout: 60000 }).catch(() => {});
  await j.detectGpu();
  await p.waitForTimeout(1200);
  await j.resetPerf();
  await j.tap(".s3-tasks", "Tareas");
  await j.taskSettings({ travel: "teletransporte", vehicle: "todos" });
  await j.tap(".task-board .tb-close, .task-board [aria-label='Cerrar tareas']", "Cerrar tareas").catch(() => {});

  // 1. Who gives posts 10 and 13 at 9:00; the suit-up waits for the other posts.
  const of = await p.evaluate(() => [10, 13].map((n) => window.codeshipS3.trainerOf(n)));
  j.check("a las 9 dan los puestos 10 y 13 Luciana (control de misión) e Irosene (los trajes)", of.join() === "luciana,irosene", of.join());
  await goPost(j, 13, "Integración y lanzamiento");
  await j.showPanel(".s3-ui .cm-who");
  await j.tap('.s3-ui .cab-machine:not(.hidden) [data-act="reto"]', "Empezar el reto: el traje, antes de tiempo");
  const wait = (await j.texts(".s3-ui .cab-toast.on"))[0] ?? "";
  j.check("antes de los demás puestos el traje espera: dice cuáles faltan", /faltan 1, 2, 3/.test(wait) && (await s3(p)).mode === "libre", wait);
  await p.evaluate(() => window.codeshipS3.passPosts([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12]));

  // 2. Post 10: an Electron from mission control (Luciana).
  const e = await post(j, 10, "Puesto 10, control de misión", "Luciana", "electron");
  j.check("en la pantalla grande del control de misión el Electron carga, despega y sube", e.screen && ["carga", "despegue"].every((f) => e.ePhases.includes(f)) && e.eRise > 20, JSON.stringify({ screen: e.screen, phases: e.ePhases, rise: e.eRise }));

  // 3. Post 13: the suit-up (Irosene).
  const t = await post(j, 13, "Puesto 13, el traje de la Crew Dragon", "Irosene", "traje");
  j.check("el traje se ve: el casco, el umbilical al puesto de pruebas y la lista de la comprobación de fugas", ["casco-ss", "umbilical", "lista"].every((k) => t.things.includes(k)), t.things.join(", "));

  // 4. To the crew pad, «Por reto»: Áreas (by teleport) to the campus's helipad at the south cave's mouth (PX-45 walks
  // the ~400 m from the trees), on foot to the navigation machine, the program, the flight in sight.
  await goArea(j, "entrenamiento:helipuerto", "Helipuerto del campus");
  await j.tap(".s3-tasks", "Tareas");
  await j.taskSettings({ travel: "viaje", vehicle: "todos" });
  await j.tap('.task-board [data-go="s3-puesto-11"]', "Ir: Geología (otra isla: a la máquina de navegación)");
  await j.untilArrived(() => s3(p), (s) => s.mode === "libre" && s.near === "nav-entrenamiento", 300000);
  await j.showPanel(".s3-ui .cm-acts [data-act='nav']");
  await j.tap('.s3-ui .cm-acts [data-act="nav"]', "Abrir navegación");
  await j.tap('.island-nav .mw-pick[data-pick="plataforma"]', "Plataforma de tripulación en la lista");
  await j.tap('.island-nav .mw-go[data-fly="plataforma"]', "Volar a la plataforma");
  await until(j, (s) => s.mode === "reto", 60000);
  await solve(j, "El vuelo a la plataforma, programado");
  await j.endSheet();
  const flown = await until(j, (s) => s.mode === "libre" && s.island === "plataforma", 240000);
  j.check("el helicóptero aterriza en la plataforma de tripulación", flown.island === "plataforma", flown.island);

  // 5. At the tower: the launch card.
  await j.tap(".s3-tasks", "Tareas");
  await j.tap('.task-board [data-go="s3-lanzamiento"]', "Ir: Lanzamiento (la torre de acceso)");
  const tower = await j.untilArrived(() => s3(p), (s) => s.mode === "libre" && s.near === "plataforma-acceso", 300000);
  j.check("«Ir» del lanzamiento lleva andando a la torre de acceso de la plataforma", tower.near === "plataforma-acceso", JSON.stringify(tower));
  await j.showPanel('.s3-ui .cm-acts [data-act="lanzar"]');
  await capture(j, "torre-tarjeta");
  await j.tap('.s3-ui .cm-acts [data-act="lanzar"]', "Empezar el lanzamiento");
  await watch(p);
  await solve(j, "La torre, el brazo de acceso y la sala blanca");
  await capture(j, "torre");
  await j.endSheet();
  await solve(j, "La cuenta atrás del Falcon 9");
  await capture(j, "despegue");
  await j.endSheet();
  await solve(j, "El ascenso: las etapas y la órbita");
  await capture(j, "ascenso");
  await j.endSheet();
  await solve(j, "La cita con la Starship en órbita baja");
  const f = await seenNow(p);
  const inS3 = () => p.evaluate(() => !!window.codeshipS3).catch(() => false);
  if (await inS3()) await capture(j, "cita");
  j.check("por el brazo de acceso a la sala blanca, a la altura de la escotilla de la Dragon (más de 60 m sobre la cubierta)", f.herY > 22 + 60, JSON.stringify({ herY: f.herY }));
  j.check("el brazo se retira, el Falcon 9 despega, la 1.ª etapa se separa y la Dragon queda sola en órbita", f.arm > 1 && f.fRise > 100 && f.sep && ["despegue", "separacion", "orbita"].every((x) => f.fPhases.includes(x)), JSON.stringify({ arm: f.arm, rise: f.fRise, sep: f.sep, phases: f.fPhases }));
  j.check("en la cita, la pantalla de la Dragon ante su asiento con la cámara de acople", f.display && f.fPhases.includes("cita"), JSON.stringify({ display: f.display }));
  j.check("con el traje y el casco de la Crew Dragon durante todo el día", ["casco-ss"].every((k) => f.things.includes(k)), f.things.join(", "));
  if (await inS3()) await j.endSheet();

  // 6. Docked: the slot is a level-6 game now, and the page goes on in the Starship (3,5 s later it reloads).
  let handedOver = null;
  for (let k = 0; k < 60 && !handedOver; k++) {
    handedOver = await p.evaluate(() => window.codeshipS3?.handedOver ?? JSON.parse(sessionStorage.getItem("px48") ?? "null")?.handedOver ?? null).catch(() => null);
    if (!handedOver) await p.waitForTimeout(500);
  }
  const slot = await p.evaluate((id) => JSON.parse(localStorage.getItem(`codeship.partida.${id}`) ?? "null"), handedOver);
  j.check("acoplada: la partida pasa al nivel 6 en la misma ranura, con los días y los puestos, y el crucero a Bennu por hacer", slot?.level === 6 && slot?.state?.fromLaunch?.cruiseDays === 816 && slot.state.fromLaunch.posts.length === 13, JSON.stringify(slot).slice(0, 300));
  await p.waitForFunction(() => window.codeship?.cruise, null, { timeout: 120000 });
  await p.waitForTimeout(2500);
  const cruise = await p.evaluate(() => ({ active: window.codeship.cruise.active, left: window.codeship.cruise.left, field: window.codeship.field.group.visible, chip: document.querySelector(".cruise-chip")?.textContent ?? "", trayecto: window.codeship.tripStatus()?.destination ?? null, start: !!document.querySelector(".start-screen:not(.hidden)") }));
  j.check("sigue sola en el nivel 6, sin la pantalla de inicio: el crucero a Bennu con su ficha (816 días, tope de 10 min; en el puesto de pilotaje) y en «Trayecto», sin asteroides a la vista", cruise.active && !cruise.field && cruise.trayecto === "Bennu" && /Starship → Bennu/.test(cruise.chip) && /816 días/.test(cruise.chip) && cruise.left > 500 && cruise.left <= 600, JSON.stringify(cruise));
  await capture(j, "crucero");
  await p.evaluate(() => window.codeship.cruise.finishNow());
  const arrived = await p.evaluate(() => ({ field: window.codeship.field.group.visible, chip: !!document.querySelector(".cruise-chip") }));
  j.check("al llegar, Bennu y los asteroides a la vista y el chip se va", arrived.field && !arrived.chip, JSON.stringify(arrived));

  j.check("sin errores en la página", j.errors.length === 0, j.errors.slice(0, 3).join(" | "));
}
