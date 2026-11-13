// Landing (docs/design/aterrizaje.md): the probe lands by program with taps, each programming step shows
// what it does (a trip step too), and the manual landing readout appears and turns red when too fast.

/** Craft `h` m above Bennu, moving with the ground under it, as a compressed trip hands it over. */
const placeAbove = ([which, h, vDown]) => {
  const c = window.codeship;
  const P = c.flight.state.position.constructor;
  let f;
  if (which === "sonda") {
    if (c.probe.status === "estibada") c.probe.launch(new P(0, 1, 0));
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
  await j.useMachine("bridge", "sonda", "abrir", "Tomar el mando de la sonda");
  await p.waitForTimeout(600);
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
  await p.waitForTimeout(2500);
  const fly = await readout(j, ".land-box.probe .landing-readout");
  j.check("mientras baja, los indicadores dicen la fase del programa", !!fly && /Programa/i.test(fly.text), fly?.text);
  const chip = (await j.texts(".trip-chip.on .tc-detail"))[0] ?? "";
  j.check("la ficha de viaje sigue el descenso (con «Ver» y «Mando»)", /del suelo/.test(chip) && (await j.texts(".trip-chip.on .tc-take")).length > 0, chip);
  await j.shot("sonda-bajando");
  await p.waitForFunction(() => window.codeship.probeLanding.status !== "flying", null, { timeout: 300000 });
  const end = await p.evaluate(() => [window.codeship.probeLanding.status, window.codeship.probe.status]);
  j.check("la sonda se posa sola y las anclas sujetan", end[0] === "landed" && end[1] === "posada", end.join(" / "));
  await p.waitForTimeout(600);
  const msg = (await j.texts(".pr-msg.on"))[0] ?? "";
  j.check("la consola dice a cuánto del sitio se posó", /Posada por programa|anclas sujetan/.test(msg), msg);
  await j.shot("sonda-posada");
}

/** The lander, by hand: the readout appears, the site shows in the ventral camera, a fast descent turns red. */
export async function aterrizajeManual(j) {
  const p = j.page;
  await j.setup("el módulo llega a 250 m de Bennu, bajando a 0,5 m/s con la panza al suelo", placeAbove, ["modulo", 250, 0.5]);
  await p.waitForTimeout(1500);
  const r = await readout(j, ".land-box.lander .landing-readout");
  j.check("en la cabina aparecen los indicadores X, Y, Z, vx, vy, vz e inclinación", !!r && /X /.test(r.text) && /Y /.test(r.text) && /Z 2\d\d m/.test(r.text) && /∠/.test(r.text), r?.text);
  j.check("bajando a 0,5 m/s a 250 m, la velocidad vertical está en verde", !!r && r.spans.some((s) => /vz/.test(s.t) && s.c === "ok"), r?.spans.map((s) => `${s.t}:${s.c}`).join(" "));
  const offer = (await j.texts(".ctx-dock > .land-offer"))[0] ?? "";
  j.check("la columna de contexto ofrece «Aterrizar con un programa»", /programa/.test(offer), offer);
  const over = await j.overlaps();
  j.check("los indicadores no tapan ningún botón", over.length === 0, over.slice(0, 3).join("; "));
  await j.shot("modulo-indicadores");
  if (j.opts.mobile !== false) await j.tap(".bar-toggle", "☰ Mandos");
  await j.tap(".cam-btn", "Cámara");
  await p.waitForTimeout(400);
  if (j.opts.mobile !== false) await j.tap(".bar-toggle", "☰ Mandos");
  await p.waitForTimeout(800);
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
  await j.tap(".ctx-dock > .land-offer", "Aterrizar con un programa");
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
