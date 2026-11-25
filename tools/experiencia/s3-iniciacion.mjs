// PX-46 Sanctuary 3, initiation phase 4 (docs/design/santuario3-iniciacion.md §5.3, s3-iniciacion-1), on an iPhone
// 13 with visible taps only. A new game starts at 9:00 with Cold Sanctuary's trainers at their posts (WorkRoster's
// working day). She goes (teleport, chosen in the task settings, since PX-45 walks) to posts 1, 2, 3, 4 and 7; at each
// the card says who gives the challenge (the trainer on shift), and the challenge is a code challenge whose steps
// are acted out at the post: the folder before the tribunal, the cuff and the ECG on the couch, the lengths of the
// survival pool, the raft and the hoist, the mask in the hypobaric chamber, the EMU and the divers' lead at the bottom of the
// NBL. At lunch nobody is on shift and the post waits: the card says when the next shift starts. Then the island flights: «Por reto» (the flight
// programmed on the sheet, then flown by itself in sight) and «Manual» (the S-92's cyclic, collective and pedals on
// the pad, landed by hand on the other island's helipad). Captures in docs/screenshots/s3i-<paso>-movil.png.
import { mkdirSync } from "node:fs";

async function capture(j, label, title, overlaps = true) {
  await j.page.waitForTimeout(400);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/s3i-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  if (!overlaps) return;
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

const s3 = (p) =>
  p.evaluate(() => {
    const c = window.codeshipS3;
    return { body: c.body, mode: c.mode, island: c.island, near: c.near, hour: c.hour, passed: c.passed, caption: c.stage.caption, active: c.stage.active, busy: c.stage.busy, rig: { x: c.stage.her?.rig.position.x, y: c.stage.her?.rig.position.y, z: c.stage.her?.rig.position.z }, hand: c.hand, toast: document.querySelector(".s3-ui .cab-toast.on")?.textContent ?? "", craftY: c.craftY() };
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

/** What is out in the post's scene now: the things shown and where her rig is. */
const scene = (p) =>
  p.evaluate(() => {
    const st = window.codeshipS3.stage;
    const shown = [...st.things.entries()].filter(([, o]) => o.visible).map(([k]) => k);
    return { shown, caption: st.caption };
  });

/** «Ir» from Tareas to a post (teleport, chosen in the settings), then Panel. */
/**
 * Each trainer leaves her post a quarter of an hour before lunch: between 10:00 and 11:00 she plays on the next morning, at
 * 9:12, while the trainers are still at their posts (a post takes about half an hour of the board clock).
 */
async function morning(j) {
  await j.page.evaluate(() => {
    const c = window.codeshipS3;
    if (c.hour > 10 && c.hour < 11) c.setHour(9.2);
  });
}

async function goPost(j, n, title) {
  await morning(j);
  await j.tap(".s3-tasks", "Tareas");
  await j.tap(`.task-board [data-go="s3-puesto-${n}"]`, `Ir: ${title}`);
  await until(j, (s) => s.mode === "libre" && s.near, 20000);
  await j.showPanel(".s3-ui .cm-who");
}

/**
 * The post's challenge, answered right with visible taps («Paso a paso»: each block placed right is acted at once).
 * Checks that each answered step shows something at the post, then «Continuar».
 */
async function doPost(j, n, title, label, expectThings) {
  const p = j.page;
  const who = (await j.texts(".s3-ui .cab-machine:not(.hidden) .cm-who"))[0] ?? "";
  await j.tap('.s3-ui .cab-machine:not(.hidden) [data-act="reto"]', `Empezar el reto: ${title}`);
  await j.waitDuel();
  // The shared reto focus (reto-focus.ts): her at the post, in the strip above the sheet.
  await p.waitForTimeout(800);
  const framed = await j.herFramed("codeshipS3");
  j.check(`${title}: el reto la enfoca en el puesto, encima de la hoja (reto-focus.ts)`, !!framed?.ok, JSON.stringify(framed));
  const seen = new Set();
  // What is out is also gathered in the page every 150 ms: on a slow machine a capture can take longer than a beat
  // (2,2 s), and polling from here alone missed the mask of post 4 on CI.
  await p.evaluate(() => {
    const out = (window.__s3seen = new Set());
    window.__s3timer = setInterval(() => {
      for (const [k, o] of window.codeshipS3.stage.things.entries()) if (o.visible) out.add(k);
    }, 150);
  });
  let shot = false;
  for (let i = 0; i < 4; i++) {
    const ex = await p.evaluate(oracle);
    if (!ex) break;
    await j.answer(oracle, true);
    // Let the beats play, looking at what is out.
    for (let k = 0; k < 8; k++) {
      await p.waitForTimeout(900);
      for (const t of (await scene(p)).shown) seen.add(t);
      if (!shot && k === 2) {
        await capture(j, `${label}-paso`, `${title}: un paso a la vista`, false);
        shot = true;
      }
    }
  }
  // The last beats may still be playing: watch them to the end.
  for (let k = 0; k < 30; k++) {
    const sc = await scene(p);
    for (const t of sc.shown) seen.add(t);
    if (!(await s3(p)).busy) break;
    await p.waitForTimeout(700);
  }
  for (const t of await p.evaluate(() => (clearInterval(window.__s3timer), [...window.__s3seen]))) seen.add(t);
  // The sheet of options says «Conseguido»; the drawing ends on its molecule and closes (its pass is checked below).
  const drawn = !(await p.locator(".duel:not(.hidden)").count());
  const result = drawn ? "" : ((await j.texts(".duel .result"))[0] ?? "");
  if (!drawn) j.check(`${title}: el reto se completa («Conseguido»)`, /Conseguido/.test(result), result);
  j.check(`${title}: cada paso se ve en el sitio, con los objetos (${expectThings.join(", ")})`, expectThings.every((t) => seen.has(t)), [...seen].join(", "));
  await capture(j, `${label}-reto`, `${title}: la hoja del reto y la escena`, false);
  const only = await j.outsideChallenge().catch(() => null);
  if (only && !drawn) j.check(`${title}: con el reto abierto solo se ven la hoja y la escena (reglas §4.3)`, only.length === 0, JSON.stringify(only).slice(0, 200));
  await j.endSheet();
  const after = await until(j, (s) => s.mode === "libre", 30000);
  j.check(`${title}: el puesto queda superado y ella vuelve a andar`, after.passed.includes(n) && after.mode === "libre", JSON.stringify({ passed: after.passed, mode: after.mode }));
  return who;
}

export async function s3Iniciacion(j) {
  const p = j.page;
  await j.tap('.start-screen .mw-pick[data-pick="aereo"]', "Tarjeta: Santuario Aéreo");
  await j.tap('.start-screen .mw-go[data-go="aereo"]', "Jugar: Santuario Aéreo");
  await p.waitForFunction(() => window.codeshipS3, null, { timeout: 120000 });
  await p.waitForFunction(() => performance.getEntriesByName("codeship-primer-fotograma").length > 0, null, { timeout: 60000 }).catch(() => {});
  await j.detectGpu();
  await p.waitForTimeout(1200);
  await j.resetPerf();

  // 1. A new game starts at 9:00, with each trainer on shift already at her post.
  const start = await p.evaluate(() => {
    const c = window.codeshipS3;
    return { hour: c.hour, where: document.querySelector(".cab-where")?.textContent ?? "", crowd: c.crowd.positions(), of: [1, 2, 3, 4, 7].map((n) => c.trainerOf(n)) };
  });
  j.check("la partida empieza a las 9:00 y la hora se ve arriba", start.hour >= 9 && start.hour < 9.2 && /^9:0\d · /.test(start.where), start.where);
  j.check("a las 9 da cada reto quien está de turno en él: Karen, Linduarda, Andrea, Lizmibet y Adaguchi", start.of.join() === "karen,linduarda,andrea,lizmibet,adaguchi", start.of.join());
  j.check("cada entrenadora de turno ya está en su puesto", ["karen", "linduarda", "andrea", "lizmibet", "adaguchi"].every((id) => start.crowd.find((c) => c.id === id && c.key.startsWith("puesto:"))?.there), JSON.stringify(start.crowd.filter((c) => ["karen", "linduarda", "andrea", "lizmibet", "adaguchi"].includes(c.id))));

  // 2. «Ir» by teleport (PX-45 walks the island): the task settings.
  await j.tap(".s3-tasks", "Tareas");
  await j.taskSettings({ travel: "teletransporte" });
  await j.tap(".task-board .tb-close, .task-board [aria-label='Cerrar tareas']", "Cerrar tareas").catch(() => {});

  // 3. Post 1: the tribunal (Karen).
  await goPost(j, 1, "Llegada y selección");
  const card1 = (await j.texts(".s3-ui .cab-machine:not(.hidden) .cm-who"))[0] ?? "";
  j.check("la tarjeta del puesto 1 dice quién da el reto: Karen, de turno", /Karen, de turno/.test(card1) && !/camino/.test(card1), card1);
  await capture(j, "tribunal", "Puesto 1: la tarjeta del tribunal");
  // «Paso a paso»: each block placed right is acted at once.
  await j.tap('.s3-ui .cab-machine:not(.hidden) [data-act="reto"]', "Empezar el reto: Selección");
  await j.waitDuel();
  await j.firstStep(oracle);
  await p.waitForTimeout(1200);
  const b1 = await scene(p);
  j.check("paso a paso, el primer bloque bien se ve al momento: la solicitud sobre la mesa del tribunal", b1.shown.includes("carpeta"), JSON.stringify(b1));
  await capture(j, "tribunal-paso", "Puesto 1: la carpeta sobre la mesa", false);
  await j.closeChallenge();
  await until(j, (s) => s.mode === "libre", 15000);
  await j.showPanel(".s3-ui .cm-who");
  await doPost(j, 1, "Puesto 1, selección", "tribunal", ["carpeta", "acreditacion", "sello"]);

  // 4. Post 2: the medical (Linduarda).
  await goPost(j, 2, "Reconocimiento médico");
  await doPost(j, 2, "Puesto 2, reconocimiento médico", "medico", ["manguito", "electrodos", "lista"]);

  // 5. Post 4: the hypobaric chamber (Lizmibet, inside as the observer).
  await goPost(j, 4, "Cámara hipobárica");
  await doPost(j, 4, "Puesto 4, cámara hipobárica", "hipobarica", ["mascara", "lista"]);

  // 6. Post 3: the swim test and water survival (Andrea) — in the survival pool (METS, raft, hoist), not the NBL.
  await goPost(j, 3, "Natación y supervivencia");
  const where3 = await p.evaluate(() => document.querySelector(".cab-where")?.textContent ?? "");
  j.check("el puesto 3 está en la piscina de supervivencia, la del METS, la balsa y el izado", /Supervivencia en el agua/.test(where3), where3);
  await j.tap('.s3-ui .cab-machine:not(.hidden) [data-act="reto"]', "Empezar el reto: Natación");
  await j.waitDuel();
  await j.firstStep(oracle);
  const xs = [];
  for (let k = 0; k < 10; k++) {
    await p.waitForTimeout(500);
    xs.push((await s3(p)).rig.x);
  }
  const span = Math.max(...xs) - Math.min(...xs);
  j.check("los largos se nadan: ella va de un extremo al otro de la piscina", span > 10, xs.map((x) => x.toFixed(1)).join(" "));
  await capture(j, "natacion-largo", "Puesto 3: un largo de la piscina", false);
  await j.closeChallenge();
  await until(j, (s) => s.mode === "libre", 20000);
  await j.showPanel(".s3-ui .cm-who");
  await doPost(j, 3, "Puesto 3, natación y supervivencia", "natacion", ["balsa", "arnes"]);

  // 7. Post 7: the NBL (Adaguchi) — the EMU's steps of the spacewalk, then the lead at the bottom.
  await goPost(j, 7, "Piscina de flotabilidad neutra");
  await doPost(j, 7, "Puesto 7, flotabilidad neutra", "nbl", ["casco", "plomo"]);
  const fondo = await s3(p);
  void fondo;

  // 8. At lunch (11–12) nobody is on shift: the post waits for the next shift (no stand-in), and the card says when.
  await p.evaluate(() => window.codeshipS3.setHour(11.3));
  await goPost(j, 2, "Reconocimiento médico");
  await p.waitForTimeout(800);
  const lunch = await p.evaluate(() => ({ who: window.codeshipS3.trainerOf(2) ?? null, card: document.querySelector(".s3-ui .cab-machine:not(.hidden) .cm-why")?.textContent ?? "", off: !!document.querySelector('.s3-ui .cab-machine:not(.hidden) [data-act="reto"][disabled]') }));
  j.check("a la hora de comer nadie está de turno: el puesto espera y la tarjeta dice cuándo empieza el siguiente turno y con quién", lunch.who === null && lunch.off && /Sin turno a las 11:\d\d: el siguiente empieza a las 12:00, con \S+/.test(lunch.card), JSON.stringify(lunch));
  await capture(j, "pausa", "El puesto 2 a la hora de comer: espera al siguiente turno");

  // 9. Flight «Por reto»: the gear of the navigation window, the program on the sheet, the flight in sight.
  await j.tap(".s3-tasks", "Tareas");
  // On foot (teleporting would put her straight on the other island): she walks to the navigation machine.
  await j.taskSettings({ travel: "viaje", vehicle: "todos" });
  await j.tap('.task-board [data-go="s3-puesto-11"]', "Ir: Geología (otra isla)");
  await until(j, (s) => s.mode === "libre" && s.near === "nav-entrenamiento", 90000);
  await j.showPanel(".s3-ui .cm-acts [data-act='nav']");
  await j.tap('.s3-ui .cm-acts [data-act="nav"]', "Abrir navegación");
  await j.tap(".island-nav .mw-gear", "Ajustes del vuelo");
  const modes = await j.texts(".island-nav .mw-settings [data-mode]");
  j.check("el engranaje de la navegación ofrece los dos modos de vuelo: «Por reto» y «Manual» (reglas §3.6)", modes.join() === "Por reto,Manual", modes.join());
  await j.tap('.island-nav .mw-settings [data-mode="reto"]', "Por reto");
  await capture(j, "vuelo-modos", "Navegación: los modos de vuelo");
  await j.tap(".island-nav .mw-gear", "Volver a las islas");
  await j.tap('.island-nav .mw-pick[data-pick="lanzadera"]', "Lanzadera en la lista");
  await j.tap('.island-nav .mw-go[data-fly="lanzadera"]', "Volar a la Lanzadera");
  await until(j, (s) => s.mode === "reto", 60000);
  await j.waitDuel(60000);
  const prog = await p.evaluate(oracle);
  j.check("«Por reto»: en el helipuerto se programa el vuelo (pasos reales del helicóptero)", prog?.kind === "order" && /arrancar los motores/.test(JSON.stringify(prog.blocks)), JSON.stringify(prog?.blocks?.map((b) => b.pseudo)));
  await capture(j, "vuelo-reto", "El programa del vuelo en la hoja, con el S-92 en el helipuerto", false);
  for (let i = 0; i < 3 && (await p.evaluate(oracle)); i++) {
    await j.answer(oracle, true);
    await p.waitForTimeout(600);
  }
  await j.endSheet();
  const f1 = await until(j, (s) => s.mode === "vuelo" && s.craftY > 40, 60000);
  j.check("con el programa bien, el piloto automático despega y se ve el vuelo", f1.mode === "vuelo" && f1.craftY > 40, JSON.stringify({ mode: f1.mode, y: f1.craftY }));
  const bar = (await j.texts(".s3-bar .jb-text"))[0] ?? "";
  j.check("la barra del vuelo dice adónde va, la distancia y el tiempo que falta (reglas §3.9)", /Lanzadera/.test(bar) && /\d+ (m|km)/.test(bar) && /\d+ (s|min)/.test(bar), bar);
  await capture(j, "vuelo-auto", "En vuelo programado a la lanzadera");
  const f2 = await until(j, (s) => s.mode === "libre", 150000);
  j.check("aterriza en la lanzadera", f2.island === "lanzadera", f2.island);

  // 10. Flight «Manual»: the S-92's cyclic, collective and pedals on the pad, landed by hand on the training island.
  // First, on foot (Áreas) from the helipad to the launch cap's navigation machine by the carpet platform.
  await j.tap(".areas-btn", "Áreas");
  await j.tap('.areas-window [data-pick="lanzadera:casquete"]', "Casquete de la lanzadera en el mapa");
  await j.tap('.areas-window [data-area="lanzadera:casquete"]', "Ir: Casquete de la lanzadera");
  await until(j, (s) => s.mode === "libre" && s.body.area === "lanzadera:casquete", 90000);
  // The machine stands a few metres from the platform: the last steps with the move stick, as a thumb would.
  const navAt = await p.evaluate(() => window.codeshipS3.layout.machines.find((m) => m.id === "nav-lanzadera"));
  for (let i = 0; i < 10; i++) {
    const w = await p.evaluate(() => ({ x: window.codeshipS3.body.x, z: window.codeshipS3.body.z, yaw: window.codeshipS3.yaw, near: window.codeshipS3.near }));
    if (w.near === "nav-lanzadera") break;
    const d = Math.hypot(navAt.x - w.x, navAt.z - w.z);
    const wx = (navAt.x - w.x) / d;
    const wz = (navAt.z - w.z) / d;
    const fwd = -(wx * Math.sin(w.yaw) + wz * Math.cos(w.yaw));
    const right = wx * Math.cos(w.yaw) - wz * Math.sin(w.yaw);
    await j.stick(".vstick.s3-move", 45 * right, -45 * fwd, Math.min(1500, 250 + d * 250));
  }
  const atNav = await s3(p);
  j.check("andando llega a la máquina de navegación de la lanzadera", atNav.near === "nav-lanzadera", atNav.near);
  await j.showPanel(".s3-ui .cm-acts [data-act='nav']");
  await j.tap('.s3-ui .cm-acts [data-act="nav"]', "Abrir navegación");
  await j.tap(".island-nav .mw-gear", "Ajustes del vuelo");
  await j.tap('.island-nav .mw-settings [data-mode="manual"]', "Manual");
  await j.tap(".island-nav .mw-gear", "Volver a las islas");
  await j.tap('.island-nav .mw-pick[data-pick="entrenamiento"]', "Isla de entrenamiento en la lista");
  await j.tap('.island-nav .mw-go[data-fly="entrenamiento"]', "Volar a la isla de entrenamiento");
  const h0 = await until(j, (s) => s.mode === "mano", 60000);
  const pad = await p.evaluate(() => [...document.querySelectorAll(".s3-hand-pad button")].map((b) => b.getAttribute("aria-label")));
  j.check("«Manual»: los mandos del helicóptero en el pad: cíclico, colectivo y pedales", h0.mode === "mano" && ["Cíclico adelante", "Colectivo arriba: subir", "Pedal izquierdo: morro a la izquierda"].every((l) => pad.includes(l)), pad.join(", "));
  const tapPad = (label, n = 1) => (async () => {
    for (let i = 0; i < n; i++) await j.tap(`.s3-hand-pad button[aria-label="${label}"]`, label);
  })();
  await tapPad("Colectivo arriba: subir", 4);
  const up = await until(j, (s) => s.hand && s.hand.y > 40, 40000);
  j.check("el colectivo la sube: despega del helipuerto", up.hand && !up.hand.onGround && up.hand.y > 40, JSON.stringify(up.hand && { y: up.hand.y }));
  await tapPad("Anular giros y velocidad");
  await capture(j, "manual", "Vuelo manual: el pad con cíclico, colectivo y pedales");
  // Fly by the numbers: nose to the pad with the pedals, cyclic forward, slow down near it and come down slowly.
  const dest = await p.evaluate(() => window.codeshipS3.layout.islands.find((i) => i.id === "entrenamiento").pad.at);
  const rel = (h) => {
    const want = Math.atan2(dest.x - h.x, dest.z - h.z);
    return Math.atan2(Math.sin(want - h.heading), Math.cos(want - h.heading));
  };
  const dist = (h) => Math.hypot(dest.x - h.x, dest.z - h.z);
  let h = (await s3(p)).hand;
  const t0 = Date.now();
  while (h && !h.onGround && Date.now() - t0 < 240000) {
    const d = dist(h);
    const r = rel(h);
    const yawAsk = h.ask.yaw;
    const wantYaw = Math.abs(r) < 0.05 ? 0 : r > 0 ? 1 : -1;
    if (yawAsk < wantYaw) await tapPad("Pedal izquierdo: morro a la izquierda");
    else if (yawAsk > wantYaw) await tapPad("Pedal derecho: morro a la derecha");
    const fwdWant = Math.abs(r) > 0.3 ? 0 : d > 600 ? 8 : d > 250 ? 3 : d > 32 ? 1 : 0;
    const fwdNow = h.ask.fwd;
    if (fwdNow < fwdWant) await tapPad("Cíclico adelante");
    else if (fwdNow > fwdWant) await tapPad("Cíclico atrás");
    // Hovering short of the pad: a nudge of cyclic, then level it again (a pilot's small corrections).
    if (d > 8 && d <= 32 && Math.hypot(h.vFwd, h.vSide) < 0.8 && Math.abs(r) < 0.3 && h.ask.fwd === 0) {
      await tapPad("Cíclico adelante");
      await p.waitForTimeout(Math.min(1500, 200 + d * 30));
      await tapPad("Anular giros y velocidad");
      await p.waitForTimeout(1500);
      h = (await s3(p)).hand;
      continue;
    }
    // Over the pad (it lands within 10 m of its centre) and slow: down, the last metres at 1,5 m/s.
    const upWant = d < 8 && Math.hypot(h.vFwd, h.vSide) < 1 ? (h.y - dest.y > 15 ? -3 : -1) : 0;
    if (h.ask.up > upWant) await tapPad("Colectivo abajo: bajar");
    else if (h.ask.up < upWant) await tapPad("Colectivo arriba: subir");
    await p.waitForTimeout(500);
    h = (await s3(p)).hand;
  }
  j.check("se posa despacio en el helipuerto de la isla de entrenamiento", !!h?.onGround && h.landedOn === "entrenamiento", JSON.stringify(h && { onGround: h.onGround, landedOn: h.landedOn, d: dist(h) }));
  await tapPad("Dejar los mandos");
  const out = await until(j, (s) => s.mode === "libre", 10000);
  j.check("«Dejar los mandos» la baja en la isla de entrenamiento", out.mode === "libre" && out.island === "entrenamiento", JSON.stringify({ mode: out.mode, island: out.island }));
  await capture(j, "manual-fin", "De vuelta en la isla de entrenamiento tras el vuelo manual");
  j.check("sin errores en la página", j.errors.length === 0, j.errors.slice(0, 3).join(" | "));
}
