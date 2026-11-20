// Landing (docs/design/aterrizaje.md): the probe lands by program with taps, each programming step shows
// what it does (a trip step too), and the manual landing readout appears and turns red when too fast.

/** Craft `h` m above Bennu, moving with the ground under it, as a compressed trip hands it over. */
export const placeAbove = ([which, h, vDown]) => {
  const c = window.codeship;
  const P = c.flight.state.position.constructor;
  let f;
  if (which === "sonda") {
    if (c.probe.status === "estibada") {
      // Out of its deployer: the door, the slide out and the springs (PX-41 plays it at ×1).
      if (!c.probe.deploying) c.probe.launch(new P(0, 1, 0));
      const z = new P(0, 0, 0);
      c.probe.update(10, { mainThrottle: 0, translation: z, rotation: z });
    }
    f = c.probe.flight;
  } else {
    c.docking.undock();
    f = c.flight;
  }
  const s = f.state;
  const bennu = c.region.target;
  const dir = new P(0.3, 0.2, 1).normalize();
  let r = 900;
  while (bennu.surfaceDistance(dir.scale(r), f.simTimeS) > h) r -= 0.25;
  const pos = dir.scale(r);
  // Belly to the ground (body +Y along the local vertical) for the lander; the probe arrives nose first.
  const Q = s.orientation.constructor;
  const up = dir;
  const axis = new P(0, 1, 0).cross(up);
  const q = which === "sonda" ? s.orientation : axis.length() < 1e-9 ? Q.IDENTITY : Q.fromAxisAngle(axis.normalize(), Math.acos(up.y));
  f._state = new s.constructor(pos, bennu.surfaceVelocity(pos).sub(dir.scale(vDown)), q, new P(0, 0, 0));
};

const tripStep = () => window.codeship.nav.programming?.current ?? null;
const landingStep = (which) => (which === "sonda" ? window.codeship.probeLanding : window.codeship.landerLanding).programming?.current ?? null;
const drawn = () => window.codeship.planOverlay.drawn;

/** Reads the readout's four lines and the colour classes of its values. */
async function readout(j, sel) {
  return j.page.evaluate((s) => {
    const el = [...document.querySelectorAll(s)].find((e) => !e.classList.contains("hidden") && e.getBoundingClientRect().width > 0);
    if (!el) return null;
    const spans = [...el.querySelectorAll(".lr-lines span")].map((x) => ({ t: x.textContent, c: x.className }));
    return { text: el.textContent.replace(/\s+/g, " ").trim(), spans, verdict: el.dataset.verdict };
  }, sel);
}

/** A correct trip-programming step draws its part of the plan at once (the route), and closing clears it. */
async function tripStepVisual(j) {
  const p = j.page;
  await p.evaluate(() => window.codeship.interior.openNavConsole());
  await p.waitForTimeout(1200);
  const id = await p.evaluate(() => window.codeship.nav.targets.find((t) => t.kind === "asteroid" && t.id !== window.codeship.region.target.data.id)?.id);
  await j.tap(`.nav-map .nav-chip[data-id="${id}"]`, "asteroide en el mapa");
  await p.waitForTimeout(400);
  await j.tap('.nav-map [data-act="program"]', "Programar viaje");
  await j.waitDuel(30000);
  j.check("antes de responder no hay plan dibujado", (await p.evaluate(drawn)) === 0);
  await j.answer(tripStep, true);
  await p.waitForTimeout(500);
  const cap = (await j.texts(".plan-caption.on"))[0] ?? "";
  const lines = await p.evaluate(drawn);
  j.check("un paso del viaje bien respondido dibuja la ruta en 3D y lo dice", /Ruta trazada/.test(cap) && lines > 0, `${cap} · ${lines} líneas`);
  await j.shot("viaje-paso-ruta");
  await j.answer(tripStep, true);
  await p.waitForTimeout(500);
  const cap2 = (await j.texts(".plan-caption.on"))[0] ?? "";
  j.check("el siguiente paso añade el empuje", /Empuje/.test(cap2) && (await p.evaluate(drawn)) > lines, cap2);
  await j.tap('.duel [data-act="close"]', "×");
  await p.waitForTimeout(400);
  j.check("al cerrar los retos el plan se borra", (await p.evaluate(drawn)) === 0);
  await p.evaluate(() => window.codeship.deck.restore());
  await p.waitForTimeout(400);
}

export async function aterrizajePrograma(j) {
  const p = j.page;
  // The probe: from its console on the deck, arrived 300 m above Bennu.
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la nave de viaje");
  await p.waitForTimeout(800);
  await tripStepVisual(j);
  await j.setup("el destino vuelve a ser Bennu (el reto del viaje lo cambió)", () => window.codeship.nav.select(window.codeship.region.target.data.id));
  // The probe's own console on the bridge (docs/design/habitaculo.md §Puente).
  await j.setup("sube al puente por la espina", () => {
    const c = window.codeship;
    if (c.interior.active) c.interior.exit();
    c.bridge.enter("salida");
  });
  await j.useMachine("bridge", "sonda", "abrir", "Manual: tomar el mando de la sonda");
  await p.waitForTimeout(600);
  // Juventas leaves its deployer on Starship's hull: the door opens, it slides out, the springs push it at 3 cm/s.
  await j.tap('.pr-actions [data-act="launch"]', "Soltar del dispensador");
  await p.waitForTimeout(1500);
  const rel = await p.evaluate(() => ({ deploying: window.codeship.probe.deploying, msg: document.querySelector(".pr-msg")?.textContent ?? "" }));
  j.check("«Soltar del dispensador» abre la puerta y dice cómo sale (3 cm/s)", rel.deploying && /puerta del dispensador/.test(rel.msg) && /3 cm\/s/.test(rel.msg), JSON.stringify(rel));
  await j.setup("la sonda llega a 300 m de Bennu (lo que deja el viaje comprimido)", placeAbove, ["sonda", 300, 0]);
  await p.waitForTimeout(1200);
  const r = await readout(j, ".land-box.probe .landing-readout");
  j.check("en la zona de aterrizaje aparecen los indicadores X, Y, Z y vx, vy, vz", !!r && /X /.test(r.text) && /Z 29\d m/.test(r.text) && /vz/.test(r.text), r?.text);
  j.check("la inclinación sale en rojo: la sonda llega de proa, no de panza", !!r && r.spans.some((s) => /∠/.test(s.t) && s.c === "bad"), r?.spans.map((s) => `${s.t}:${s.c}`).join(" "));
  await j.shot("sonda-zona");
  await j.tap(".land-offer.probe", "Aterrizar con un programa");
  await j.waitDuel(30000);
  await j.answer(() => window.codeship.probeLanding.programming?.current ?? null, true);
  await p.waitForTimeout(500);
  const cap = (await j.texts(".plan-caption.on"))[0] ?? "";
  j.check("el primer paso bien respondido marca el sitio en 3D", /Sitio fijado/.test(cap) && (await p.evaluate(drawn)) > 0, cap);
  await j.shot("sonda-reto-sitio");
  // One wrong answer on purpose: a less precise program, but it still lands.
  await j.answer(() => window.codeship.probeLanding.programming?.current ?? null, false);
  for (let n = 0; n < 8 && (await p.evaluate(() => window.codeship.probeLanding.status)) === "programming"; n++) await j.answer(() => window.codeship.probeLanding.programming?.current ?? null, true);
  const st = await p.evaluate(() => window.codeship.probeLanding.status);
  j.check("con la cadena resuelta (un fallo), el ordenador vuela el programa", st === "flying", st);
  await p.waitForFunction(() => [...document.querySelectorAll(".duel")].every((e) => e.classList.contains("hidden")), null, { timeout: 15000 }).catch(() => {});
  const said = await p.evaluate(() => document.querySelector(".pr-msg")?.textContent ?? "");
  j.check("al cargar el programa dice adónde baja y para qué (reglas §3.9)", /sitio marcado/.test(said) && /Para posar la sonda/.test(said), said);
  await p.waitForTimeout(2500);
  const fly = await readout(j, ".land-box.probe .landing-readout");
  j.check("mientras baja, los indicadores dicen la fase del programa", !!fly && /Programa/i.test(fly.text), fly?.text);
  const chip = (await j.texts(".trip-chip.on .tc-detail"))[0] ?? "";
  j.check("la ficha de viaje sigue el descenso (con «Ver» y «Mando»)", /del suelo/.test(chip) && (await j.texts(".trip-chip.on .tc-take")).length > 0, chip);
  await j.shot("sonda-bajando");
  const where = (await j.texts(".trip-chip.on")).join(" ");
  j.check("la ficha dice el sitio, la distancia al sitio y el tiempo que falta", /sitio de aterrizaje en/.test(where) && /al sitio \d/.test(where) && /llega en/.test(where), where);
  // «Ver trayecto» never traps her (reglas §3.8): the camera turns, and closing it gives the console back.
  await j.tap(".trip-chip .tc-view", "Ver trayecto");
  await p.waitForTimeout(1200);
  const cam0 = await p.evaluate(() => window.codeship.tripPreview.camera.position.toArray());
  // The camera turns only with its joystick (reglas.md §5.7), never by dragging the screen.
  await j.stick(".cam-stick.trip-look .vstick", 50, 15, 700);
  await p.waitForTimeout(400);
  const cam1 = await p.evaluate(() => window.codeship.tripPreview.camera.position.toArray());
  j.check("en «Ver trayecto» el joystick de cámara la gira", Math.hypot(...cam1.map((v, i) => v - cam0[i])) > 0.1);
  await j.tap(".trip-chip .tc-view", "Ocultar trayecto");
  await p.waitForTimeout(600);
  const back = await p.evaluate(() => ({ full: document.body.classList.contains("in-trip-view"), exit: getComputedStyle(document.querySelector(".pr-exit")).visibility }));
  j.check("al ocultar el trayecto vuelven la consola y sus botones", !back.full && back.exit === "visible", JSON.stringify(back));
  // The probe is flown from afar: she can leave the console and the program goes on (reglas §3.8).
  await j.tap(".pr-exit", "Volver al puente");
  await p.waitForTimeout(800);
  const away = await p.evaluate(() => ({ bridge: window.codeship.bridge.active, chip: !!document.querySelector(".trip-chip.on"), st: window.codeship.probeLanding.status }));
  j.check("deja la consola: en el puente no sale el aterrizaje y la sonda sigue bajando sola", away.bridge && !away.chip && (away.st === "flying" || away.st === "landed"), JSON.stringify(away));
  await j.useMachine("bridge", "sonda", "abrir", "Volver a la consola de la sonda");
  await p.waitForTimeout(800);
  await p.waitForFunction(() => window.codeship.probeLanding.status !== "flying", null, { timeout: 300000 });
  const end = await p.evaluate(() => [window.codeship.probeLanding.status, window.codeship.probe.status]);
  j.check("Juventas se posa sola (sin anclas: rebota y se asienta)", end[0] === "landed" && end[1] === "posada", end.join(" / "));
  await p.waitForTimeout(600);
  const msg = (await j.texts(".pr-msg.on"))[0] ?? "";
  j.check("la consola dice a cuánto del sitio se posó y cuántas veces rebotó", /Posada por programa|rebota/.test(msg), msg);
  await j.shot("sonda-posada");
}

/** The lander, by hand: the readout appears, the site shows in the ventral camera, a fast descent turns red. */
export async function aterrizajeManual(j) {
  const p = j.page;
  await j.setup("el módulo llega a 250 m de Bennu, bajando a 0,5 m/s con la panza al suelo", placeAbove, ["modulo", 250, 0.5]);
  await p.waitForTimeout(1500);
  // The readout and the offer come up within a few frames (slower under a throttled CPU): wait for them.
  await p.waitForFunction(() => [...document.querySelectorAll('.rcs-pad.lander-pad [data-act="auto"], .land-box.lander .landing-readout')].filter((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== "none").length >= 2, null, { timeout: 15000 }).catch(() => {});
  const r = await readout(j, ".land-box.lander .landing-readout");
  j.check("en la cabina aparecen los indicadores X, Y, Z, vx, vy, vz e inclinación", !!r && /X /.test(r.text) && /Y /.test(r.text) && /Z 2\d\d m/.test(r.text) && /∠/.test(r.text), r?.text);
  j.check("bajando a 0,5 m/s a 250 m, la velocidad vertical está en verde", !!r && r.spans.some((s) => /vz/.test(s.t) && s.c === "ok"), r?.spans.map((s) => `${s.t}:${s.c}`).join(" "));
  const offer = (await j.texts('.rcs-pad.lander-pad [data-act="auto"]'))[0] ?? "";
  j.check("los mandos a mano ofrecen «Pasar a automático» (el aterrizaje por programa)", /automático/.test(offer) && !(await j.texts(".land-offer.lander")).length, offer);
  const over = await j.overlaps();
  j.check("los indicadores no tapan ningún botón", over.length === 0, over.slice(0, 3).join("; "));
  await j.shot("modulo-indicadores");
  // Flying by hand the tree menu gives way to the pad (reglas.md §5.8): «Cámara» is on the pad.
  await j.tap('.rcs-pad.lander-pad [data-act="cam"]', "Cámara");
  await p.waitForFunction(() => !!document.querySelector(".land-mark.on span"), null, { timeout: 10000 }).catch(() => {});
  j.check("con la cámara ventral se ve el sitio marcado en el suelo", (await j.texts(".land-mark.on span")).length > 0);
  await j.shot("modulo-ventral");
  await j.setup("el módulo cae a 4 m/s a 40 m del suelo", placeAbove, ["modulo", 40, 4]);
  await p.waitForFunction(() => (window.codeship.landerLanding.readout()?.z ?? 999) < 60, null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(800);
  const fast = await readout(j, ".land-box.lander .landing-readout");
  j.check("cayendo demasiado rápido, vz sale en rojo y el marco avisa", !!fast && fast.spans.some((s) => /vz/.test(s.t) && s.c === "bad") && fast.verdict === "bad", fast?.spans.map((s) => `${s.t}:${s.c}`).join(" "));
  await j.shot("modulo-demasiado-rapido");
}

/** Desktop: the manual readout, then the lander landed by program with clicks. */
export async function aterrizajeEscritorio(j) {
  const p = j.page;
  await aterrizajeManual(j);
  await j.setup("el módulo vuelve a 300 m, parado sobre el suelo", placeAbove, ["modulo", 300, 0]);
  await p.waitForTimeout(800);
  await j.tap('.rcs-pad.lander-pad [data-act="auto"]', "Pasar a automático (aterrizar con un programa)");
  await j.waitDuel(30000);
  await j.answer(() => window.codeship.landerLanding.programming?.current ?? null, true);
  await p.waitForTimeout(500);
  const cap = (await j.texts(".plan-caption.on"))[0] ?? "";
  j.check("el primer paso bien respondido marca el sitio", /Sitio fijado/.test(cap), cap);
  await j.shot("modulo-reto");
  for (let n = 0; n < 8 && (await p.evaluate(() => window.codeship.landerLanding.status)) === "programming"; n++) await j.answer(() => window.codeship.landerLanding.programming?.current ?? null, true);
  await p.waitForTimeout(3000);
  await j.shot("modulo-bajando");
  await p.waitForFunction(() => window.codeship.landerLanding.status !== "flying", null, { timeout: 300000 });
  const end = await p.evaluate(() => [window.codeship.landerLanding.status, window.codeship.expedition.phase]);
  j.check("el módulo se posa por programa", end[0] === "landed" && end[1] === "landed", end.join(" / "));
  await p.waitForTimeout(600);
  await j.shot("modulo-posado");
}
