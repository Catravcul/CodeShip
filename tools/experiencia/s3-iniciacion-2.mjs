// PX-47 Sanctuary 3, initiation phase 5 (docs/design/santuario3-iniciacion.md §5.3, s3-iniciacion-2), on an iPhone
// 13 with visible taps only. At 9:00 the trainers on shift give posts 5, 6, 8, 9, 11 and 12. She goes (teleport, chosen
// in the task settings) to each: the centrifuge spins up to 4–5 g with her reclined in the gondola; the Il-76MDK
// takes off from the glacier's blue-ice runway, climbs to 6000 m, pulls 2 g and floats her; the Dragon simulator's screen shows each
// rehearsal; she docks Dragon by hand inside the IDSS limits and, in the LM simulator's hall, lands the LM by hand inside its gear's; the robotics
// trainer's screens show the Canadarm2 capturing the Cygnus; the meteorite search and the cold-survival school are
// acted on the glacier with their things. At lunch the post waits for the next shift, and a trainer sets off early to
// be at her next place on time; after lunch she waits for each midday trainer at her post (11, 12, 9, 8), and the hand
// practices come last (their walks move the clock on). Captures in docs/screenshots/s3i2-<paso>-movil.png.
import { mkdirSync } from "node:fs";
import { goArea, walkTo } from "./s3-detalle.mjs";

async function capture(j, label, title, overlaps = true) {
  await j.page.waitForTimeout(400);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/s3i2-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  if (!overlaps) return;
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

const s3 = (p) =>
  p.evaluate(() => {
    const c = window.codeshipS3;
    return { mode: c.mode, island: c.island, near: c.near, hour: c.hour, passed: c.passed, busy: c.stage.busy, readout: c.rigs.readout, rig: c.rig.position.toArray() };
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

/** What the post's scene shows now: the things out, the caption, the machine's reading and state. */
const scene = (p) =>
  p.evaluate(() => {
    const c = window.codeshipS3;
    const st = c.stage;
    const r = c.rigs;
    return {
      shown: [...st.things.entries()].filter(([, o]) => o.visible).map(([k]) => k),
      caption: st.caption,
      readout: r.readout,
      g: r.g,
      arm: r.arm?.rotation.y ?? 0,
      phase: r.phase ?? "",
      planeY: r.plane?.group.position.y ?? 0,
      show: r.show ?? "",
      armOn: r.armScreens.some((m) => m.visible),
      armPlaying: r.armShow.playing,
      herY: c.rig.position.y,
    };
  });

/**
 * Waits, as she would, for the midday trainer of post `n` to be at her post: the clock goes to 11:57, and those who
 * already walked there stay; the rest are still on their way (they walk at walking pace on the board clock).
 */
async function onShift(j, n, id) {
  await j.page.evaluate(() => window.codeshipS3.setHour(11.95));
  await j.page.waitForFunction(([n, id]) => window.codeshipS3.crowd.positions().some((c) => c.id === id && c.key === `puesto:${n}` && c.there), [n, id], { timeout: 240000 });
  // Her walk in moved the clock on (a board hour is a minute): back to the start of the shift, so that she does not
  // set off for the 14:00 training while the challenge is being played.
  await j.page.evaluate(() => window.codeshipS3.setHour(12.05));
}

async function goPost(j, n, title) {
  await j.tap(".s3-tasks", "Tareas");
  await j.tap(`.task-board [data-go="s3-puesto-${n}"]`, `Ir: ${title}`);
  await until(j, (s) => s.mode === "libre" && s.near, 30000);
  await j.showPanel(".s3-ui .cm-who");
}

/** The post's challenge answered right; returns what was seen while its beats played. */
async function doPost(j, n, title, label, who, expectThings) {
  const p = j.page;
  const card = (await j.texts(".s3-ui .cab-machine:not(.hidden) .cm-who"))[0] ?? "";
  j.check(`${title}: la tarjeta dice quién da el reto: ${who}, de turno`, new RegExp(`${who}, de turno`).test(card) && !/camino/.test(card), card);
  await j.tap('.s3-ui .cab-machine:not(.hidden) [data-act="reto"]', `Empezar el reto: ${title}`);
  await j.waitDuel();
  // The shared reto focus (reto-focus.ts): her at the post, in the strip above the sheet.
  await p.waitForTimeout(800);
  const framed = await j.herFramed("codeshipS3");
  j.check(`${title}: el reto la enfoca en el puesto, encima de la hoja (reto-focus.ts)`, !!framed?.ok, JSON.stringify(framed));
  const seen = { things: new Set(), reads: new Set(), phases: new Set(), shows: new Set(), maxG: 1, armTurn: 0, maxPlaneY: 0, armOn: false, armPlaying: false, herYs: [] };
  const look = async () => {
    const sc = await scene(p);
    for (const t of sc.shown) seen.things.add(t);
    if (sc.readout) seen.reads.add(sc.readout);
    if (sc.phase) seen.phases.add(sc.phase);
    if (sc.show) seen.shows.add(sc.show);
    seen.maxG = Math.max(seen.maxG, sc.g);
    seen.armTurn = Math.max(seen.armTurn, sc.arm);
    seen.maxPlaneY = Math.max(seen.maxPlaneY, sc.planeY);
    seen.armOn ||= sc.armOn;
    seen.armPlaying ||= sc.armPlaying;
    seen.herYs.push(sc.herY);
  };
  // What is out (things, the simulator's screen, the plane's phase) is also gathered in the page every 150 ms: a
  // capture can take longer than a beat (2,2 s) and polling from here alone missed some.
  await p.evaluate(() => {
    const seen = (window.__s3seen = { things: new Set(), shows: new Set(), phases: new Set() });
    window.__s3timer = setInterval(() => {
      const c = window.codeshipS3;
      for (const [k, o] of c.stage.things.entries()) if (o.visible) seen.things.add(k);
      if (c.rigs.show) seen.shows.add(c.rigs.show);
      if (c.rigs.phase) seen.phases.add(c.rigs.phase);
    }, 150);
  });
  let shot = false;
  for (let i = 0; i < 4; i++) {
    const ex = await p.evaluate(oracle);
    if (!ex) break;
    await j.answer(oracle, true);
    for (let k = 0; k < 8; k++) {
      await p.waitForTimeout(800);
      await look();
      if (!shot && k === 3) {
        await capture(j, `${label}-paso`, `${title}: un paso a la vista`, false);
        shot = true;
      }
    }
  }
  for (let k = 0; k < 40; k++) {
    await look();
    if (!(await s3(p)).busy) break;
    await p.waitForTimeout(600);
  }
  const inPage = await p.evaluate(() => (clearInterval(window.__s3timer), { things: [...window.__s3seen.things], shows: [...window.__s3seen.shows], phases: [...window.__s3seen.phases] }));
  for (const k of ["things", "shows", "phases"]) for (const t of inPage[k]) seen[k].add(t);
  const result = (await j.texts(".duel .result"))[0] ?? "";
  j.check(`${title}: el reto se completa («Conseguido»)`, /Conseguido/.test(result), result);
  if (expectThings.length) j.check(`${title}: cada paso se ve en el sitio, con los objetos (${expectThings.join(", ")})`, expectThings.every((t) => seen.things.has(t)), [...seen.things].join(", "));
  await capture(j, `${label}-reto`, `${title}: la hoja del reto y la escena`, false);
  const only = await j.outsideChallenge().catch(() => null);
  if (only) j.check(`${title}: con el reto abierto solo se ven la hoja y la escena (reglas §4.3)`, only.length === 0, JSON.stringify(only).slice(0, 200));
  await j.tap(".duel button.end", "Continuar");
  const after = await until(j, (s) => s.mode === "libre", 40000);
  j.check(`${title}: el puesto queda superado y ella vuelve a andar`, after.passed.includes(n) && after.mode === "libre", JSON.stringify({ passed: after.passed, mode: after.mode }));
  return seen;
}

/** Pad buttons already checked once (visible, not overlapped): later presses are a finger's tap, not the full check. */
const padChecked = new Set();
/**
 * A tap on a pad of the hand practices. The first press of each button goes through `j.tap` (its overlap checks);
 * the next ones are a plain tap, as quick as a pilot's finger. With the full check every press took ~2 s on CI, so
 * the shortest correction (a translation tap, then «Anular» one press later) moved Dragon ~0,2 m: more than the
 * IDSS's 0,10 m off the axis, and the docking failed now and then (CI runs 44952767116, 44997439276, 45055879960…).
 */
async function tapPad(j, label) {
  const sel = `.rcs-pad:not(.hidden) [aria-label="${label}"]`;
  if (!padChecked.has(label)) {
    padChecked.add(label);
    return j.tap(sel, label);
  }
  const loc = j.page.locator(sel).first();
  try {
    if (j.opts.mobile === false) await loc.click({ timeout: 15000 });
    else await loc.tap({ timeout: 15000 });
  } catch (e) {
    j.check(`se puede tocar «${label}»`, false, e.message.split("\n")[0]);
  }
}

export async function s3Iniciacion2(j) {
  const p = j.page;
  padChecked.clear();
  await j.tap('.start-screen .mw-pick[data-pick="aereo"]', "Tarjeta: Santuario Aéreo");
  await j.tap('.start-screen .mw-go[data-go="aereo"]', "Jugar: Santuario Aéreo");
  await p.waitForFunction(() => window.codeshipS3, null, { timeout: 120000 });
  await p.waitForFunction(() => performance.getEntriesByName("codeship-primer-fotograma").length > 0, null, { timeout: 60000 }).catch(() => {});
  await j.detectGpu();
  await p.waitForTimeout(1200);
  await j.resetPerf();

  // 1. At 9:00, who gives each phase-5 post.
  const start = await p.evaluate(() => {
    const c = window.codeshipS3;
    return { hour: c.hour, of: [5, 6, 8, 9, 11, 12].map((n) => c.trainerOf(n)), crowd: c.crowd.positions() };
  });
  j.check("a las 9 dan los retos 5, 6, 8, 9, 11 y 12 Fausto, Ivelyna, David, Adonis, Amykhuz y Gohageneis", start.of.join() === "fausto,ivelyna,david,adonis,amykhuz,gohageneis", start.of.join());
  j.check("la gente del glaciar empieza en sus puestos del glaciar", ["ivelyna", "amykhuz", "gohageneis"].every((id) => start.crowd.find((c) => c.id === id)?.there), JSON.stringify(start.crowd.filter((c) => ["ivelyna", "amykhuz", "gohageneis"].includes(c.id))));
  await j.tap(".s3-tasks", "Tareas");
  await j.taskSettings({ travel: "teletransporte", vehicle: "todos" });
  await j.tap(".task-board .tb-close, .task-board [aria-label='Cerrar tareas']", "Cerrar tareas").catch(() => {});

  // 2. Post 5: the centrifuge (Fausto).
  await goPost(j, 5, "Centrífuga");
  const c5 = await doPost(j, 5, "Puesto 5, centrífuga", "centrifuga", "Fausto", ["sensores", "boton"]);
  j.check("la centrífuga gira con ella en la góndola y sube a 4–5 g", c5.maxG >= 4 && c5.armTurn > 3, JSON.stringify({ maxG: c5.maxG, armTurn: c5.armTurn, reads: [...c5.reads] }));

  // 3. Post 6: the parabolic flight from the glacier (Ivelyna).
  await goPost(j, 6, "Vuelo parabólico");
  const isl6 = (await s3(p)).island;
  j.check("el puesto 6 está en el glaciar, junto al Il-76MDK de la pista de hielo azul", isl6 === "glaciar", isl6);
  const c6 = await doPost(j, 6, "Puesto 6, vuelo parabólico", "parabolico", "Ivelyna", []);
  j.check("el Il-76MDK despega, sube a 6000 m, entra a 2 g, flota en ingravidez y aterriza, con ella dentro", ["despegue", "subida", "ingravidez", "salida", "aterrizaje"].every((f) => c6.phases.has(f)) && c6.maxPlaneY >= 5800 && Math.max(...c6.herYs) >= 5800 && c6.reads.has("2,0 g") && c6.reads.has("0,0 g"), JSON.stringify({ phases: [...c6.phases], maxPlaneY: c6.maxPlaneY, herMaxY: Math.max(...c6.herYs), reads: [...c6.reads] }));

  // 4. Lunch: nobody on shift at post 6; the card says when the next shift starts. A trainer sets off early.
  await p.evaluate(() => window.codeshipS3.setHour(10.75));
  await p.waitForTimeout(1500);
  const early = await p.evaluate(() => ({ hour: window.codeshipS3.hour, ivelyna: window.codeshipS3.crowd.positions().find((c) => c.id === "ivelyna") }));
  j.check("antes de las 11 Ivelyna ya sale hacia el campamento para comer a su hora (no anda más deprisa)", early.hour < 11 && early.ivelyna?.key === "cruce", JSON.stringify(early));
  await p.evaluate(() => window.codeshipS3.setHour(11.3));
  await j.showPanel(".s3-ui .cm-why");
  const lunch = await p.evaluate(() => ({ who: window.codeshipS3.trainerOf(6) ?? null, card: document.querySelector(".s3-ui .cab-machine:not(.hidden) .cm-why")?.textContent ?? "", off: !!document.querySelector('.s3-ui .cab-machine:not(.hidden) [data-act="reto"][disabled]') }));
  j.check("a la hora de comer el puesto 6 espera: la tarjeta dice que el siguiente turno empieza a las 12:00, con Malena", lunch.who === null && lunch.off && /el siguiente empieza a las 12:00, con Malena/.test(lunch.card), JSON.stringify(lunch));
  await capture(j, "pausa", "Puesto 6 a la hora de comer");
  // 5. After lunch, post 11: meteorites on the blue ice (Amykhuz).
  await onShift(j, 11, "amykhuz");
  await goPost(j, 11, "Geología");
  await doPost(j, 11, "Puesto 11, meteoritos en el hielo azul", "meteoritos", "Amykhuz", ["moto-nieve", "meteorito", "gps", "etiqueta", "contador", "camara-foto", "libro", "pinzas", "bolsa", "cinta", "bandera"]);

  // 6. Post 12: cold survival (Nesvitor at midday).
  await onShift(j, 12, "nesvitor");
  await goPost(j, 12, "Supervivencia en frío");
  await doPost(j, 12, "Puesto 12, supervivencia en frío", "frio", "Nesvitor", ["tienda-scott", "muro-nieve", "zanja-techo", "hornillo", "olla", "radio-hf", "antena"]);

  // 7. Post 9: robotics (Adonis) — the Canadarm2 capture on the trainer's screens.
  await onShift(j, 9, "adonis");
  await goPost(j, 9, "Robótica");
  const c9 = await doPost(j, 9, "Puesto 9, robótica", "robotica", "Adonis", ["mandos"]);
  j.check("las pantallas del simulador del brazo se encienden y el brazo se mueve con cada bloque", c9.armOn && c9.armPlaying, JSON.stringify({ armOn: c9.armOn, armPlaying: c9.armPlaying }));


  // 8. Post 8: the Dragon simulator (David), then the hand practices.
  await onShift(j, 8, "david");
  await goPost(j, 8, "Simuladores");
  const c8 = await doPost(j, 8, "Puesto 8, simulador de Dragon", "simulador", "David", ["casco-vuelo"]);
  j.check("la pantalla del simulador muestra lanzamiento, aborto, acople, fallo y reentrada", ["lanzamiento", "aborto", "acople", "fallo", "reentrada"].every((s) => c8.shows.has(s)), [...c8.shows].join(", "));
  await j.showPanel('.s3-ui .cm-acts [data-act="sim:acople"]');
  await j.tap('.s3-ui .cm-acts [data-act="sim:acople"]', "Practicar el acople");
  await capture(j, "acople", "El acople a mano en el simulador de Dragon");
  // As a pilot does with a slow hand (a tap here takes ~2 s): first the yaw, as the translations go where Dragon
  // points; then onto the axis, each step stopped a tap's time early; then in at 0,1 m/s. The display's own numbers.
  const g = () => p.evaluate(() => {
    const d = window.codeshipS3.sims.dock;
    const r = d.run;
    const q = r.orientation;
    return { yaw: (2 * Math.atan2(q.y, q.w) * 180) / Math.PI, yawRate: r.ratesDegS.y, right: r.position.x, up: r.position.y, z: r.position.z, contact: d.contact ?? null, v: r.velocity };
  });
  let lat = 2;
  const timed = async (label) => {
    const t0 = Date.now();
    await tapPad(j, label);
    lat = 0.5 * lat + 0.5 * ((Date.now() - t0) / 1000 + 0.2);
  };
  /** A step towards zero on `key` (rate `rate`), then «Parar» a tap's time before it gets there. */
  const settle = async (key, rate, neg, pos, tol) => {
    let s = await g();
    if (Math.abs(s[key]) < tol) return;
    await timed(s[key] > 0 ? neg : pos);
    for (let k = 0; k < 300; k++) {
      s = await g();
      if (Math.abs(s[key]) <= Math.abs(rate(s)) * lat + tol / 3 || Math.sign(s[key]) === Math.sign(rate(s))) break;
      await p.waitForTimeout(100);
    }
    await timed("Anular giros y velocidad");
  };
  // Round after round until Dragon is turned square and on the axis (a pilot checks before going in), not a set
  // number of rounds: on a slow runner one round can stop short or past.
  const TOL = { yaw: 0.1, right: 0.03, up: 0.03 };
  for (let round = 0; round < 8; round++) {
    await settle("yaw", (s) => s.yawRate, "Guiñada a la derecha", "Guiñada a la izquierda", TOL.yaw);
    await settle("right", (s) => s.v.x, "Trasladar a la izquierda", "Trasladar a la derecha", TOL.right);
    await settle("up", (s) => s.v.y, "Trasladar abajo", "Trasladar arriba", TOL.up);
    const s = await g();
    if (Math.abs(s.yaw) < TOL.yaw && Math.abs(s.right) < TOL.right && Math.abs(s.up) < TOL.up && Math.hypot(s.v.x, s.v.y, s.v.z) < 1e-3) break;
  }
  await tapPad(j, "Trasladar adelante");
  // In at 0,1 m/s until contact: ~2 min of simulator time, more on a loaded runner (its frames, and so the simulator,
  // go slower than the clock). It waits while Dragon is still closing, not a fixed time.
  let s = await g();
  for (let seen = { z: s.z, at: Date.now() }; !s.contact && Date.now() - seen.at < 30000; ) {
    await p.waitForTimeout(500);
    s = await g();
    if (s.z < seen.z - 0.05) seen = { z: s.z, at: Date.now() };
  }
  const toast = (await j.texts(".s3-ui .cab-toast.on"))[0] ?? "";
  j.check("el acople a mano toca dentro de los límites del IDSS y acopla", !!s.contact?.ok && /acoplada/.test(toast), JSON.stringify({ contact: s.contact, toast }));
  await until(j, (q) => q.mode === "libre", 15000);
  // The LM's landing from 150 m, in the LM simulator's own hall (as the LMS of Building 5): Áreas, then a few steps
  // to the cabin with «Moverse»; the descent engine's throttle, the drift nulled with the RCS.
  await goArea(j, "entrenamiento:simulador-lm", "Simulador del módulo lunar (LMS)");
  const lmAt = await p.evaluate(() => window.codeshipS3.layout.machines.find((q) => q.id === "lm-simulador"));
  await walkTo(j, lmAt.x, lmAt.z, 0.4);
  await j.showPanel('.s3-ui .cm-acts [data-act="sim:alunizaje"]');
  await j.tap('.s3-ui .cm-acts [data-act="sim:alunizaje"]', "Practicar el alunizaje (LM)");
  await capture(j, "alunizaje", "El alunizaje a mano en la maqueta del LM");
  await tapPad(j, "Anular giros y velocidad");
  // Down at about a tenth of the height a second (2,5 m/s at most, 0,6 at the end): the 400 kg of the trainer's
  // propellant last about 100 s of hover, so a slow CI runner must not dawdle (11-19). Until it touches down (the
  // simulator's own clock runs slower than the wall's on a loaded runner), not for a set number of looks.
  const lm = () => p.evaluate(() => window.codeshipS3.sims.land ?? null);
  let m = await lm();
  for (let k = 0; k < 2000 && m && !m.landed; k++) {
    await p.waitForTimeout(300);
    const m2 = await lm();
    if (!m2 || m2.landed) {
      m = m2;
      break;
    }
    // Each throttle tap changes the acceleration by ~0,3 m/s² and takes a second or two on a slow runner: it tracks
    // an acceleration that brings the descent rate to its target over ~3 s, tapping only when off by more than half a
    // tap (no hunting near the ground), and never below the engine's 10 % (a tap there cuts it). Chasing the rate a
    // tap late made it bounce near the ground and touch at 5,1 and 5,6 m/s (CI runs 45238233908, 45331168037).
    const acc = (m2.vzMs - m.vzMs) / Math.max(0.05, m2.t - m.t);
    const want = -Math.max(0.6, Math.min(2.5, m2.altM / 10));
    const aim = Math.max(-0.5, Math.min(0.5, (want - m2.vzMs) / 3));
    if (acc < aim - 0.17) await tapPad(j, "Subir el empuje del motor de descenso");
    else if (acc > aim + 0.17 && m2.throttle - 0.05 >= 0.1 + 1e-6) await tapPad(j, "Bajar el empuje del motor de descenso");
    m = await lm();
  }
  const toastL = (await j.texts(".s3-ui .cab-toast.on"))[0] ?? "";
  j.check("el LM toca dentro de los límites del tren (3,05 m/s y 1,22 m/s): posada", !!m?.landed?.ok && /Posada/.test(toastL), JSON.stringify({ landed: m?.landed, toastL }));
  await until(j, (q) => q.mode === "libre", 15000);

  j.check("sin errores en la página", j.errors.length === 0, j.errors.slice(0, 3).join(" | "));
}
