// Canadarm2 and the spacewalk from Quest (docs/design/brazo-robotico.md, paseo-espacial.md), played with taps on
// an iPhone 13: a Cygnus ordered at the galley waits at the 10 m capture point; from the Cupola's RWS it is
// captured and berthed on its CBM by challenge (her hands at the RWS, then the arm outside, each block audited
// live), and another one by hand with the THC; a solar-wing swap planned at Unity's cargo laptop becomes a
// spacewalk: the EMU and the ISLE prebreathe at Quest's suits, the airlock depressed, out along the handrails
// with the tether hooked at each anchor, feet in the APFR, the job's challenge audited, back in and the suit off;
// after its 140 days the Cygnus unberthed and released (the camera turned with its joystick); the lander's engine swapped
// on a spacewalk from Quest and the Starship's power from its own airlock; and Dextre swapping the P1 camera burnt by radiation. Rows in docs/qa/animaciones-brazo.md, captures in
// docs/screenshots/brazo-<pantalla>-movil.png.
import { mkdirSync, writeFileSync } from "node:fs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(700);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/brazo-${label}-movil.png`, timeout: 120000 });
  await j.shot(`brazo-${label}`);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

const card = (j) => j.page.evaluate(() => document.querySelector(".sti-card:not(.hidden)")?.innerText.replace(/\s+/g, " ") ?? "");
async function placeAt(j, id) {
  await j.setup(`Doménica va hasta «${id}»`, (f) => window.codeship.stationInside.placeAt(f), id);
  await j.page.waitForFunction((f) => window.codeship.stationInside.nearFixture() === f, id, { timeout: 15000 }).catch(() => undefined);
  await j.page.waitForTimeout(600);
}
const sheetTop = () => {
  const el = [...document.querySelectorAll(".duel.sheet, .duel")].find((e) => !e.classList.contains("hidden"));
  return el ? el.getBoundingClientRect().top : innerHeight;
};

/** One block of the challenge placed (or one question answered): the right one. */
async function pickRight(j, oracle) {
  const p = j.page;
  const ex = await p.evaluate(oracle);
  if (!ex) return undefined;
  if (ex.kind === "choice") {
    await j.tapAt(p.locator(".duel .option").nth(ex.correct));
    return { text: ex.options[ex.correct], choice: true };
  }
  for (const id of ex.solution) {
    const loc = p.locator(`.duel .tray [data-id="${id}"]`);
    if (await loc.count()) {
      await j.tapAt(loc);
      return { text: ex.blocks.find((b) => b.id === id)?.pseudo ?? id, choice: false };
    }
  }
  return undefined;
}

/**
 * A challenge played block by block («paso a paso»), each act audited while it plays: `audit` returns the scene's
 * numbers ({ seen, through, moved, playing, ... }); `judge` turns the samples into reasons it fails.
 */
async function auditedSheet(j, rows, title, oracle, audit, judge, prefix) {
  const p = j.page;
  let n = 0;
  for (let guard = 0; guard < 40; guard++) {
    if ((await j.texts(".duel .result")).length) break;
    const pick = await pickRight(j, oracle);
    if (!pick) break;
    n++;
    const samples = [];
    const t0 = Date.now();
    let shot;
    await p.waitForTimeout(300);
    while (Date.now() - t0 < 12000) {
      const a = await p.evaluate(audit, await p.evaluate(sheetTop));
      if (a) samples.push(a);
      if (!shot && a && (!a.playing || a.t >= 0.5)) {
        shot = `${prefix}-${String(n).padStart(2, "0")}.png`;
        await p.screenshot({ path: `docs/screenshots/${shot}`, clip: { x: 0, y: 0, width: p.viewportSize().width, height: Math.max(40, Math.round(await p.evaluate(sheetTop))) } });
      }
      if (a && !a.playing && samples.length > 1) break;
      if (!a && samples.length === 0 && Date.now() - t0 > 4000) break;
      await p.waitForTimeout(200);
    }
    const why = judge(samples, pick);
    const last = samples.at(-1);
    rows.push({ title, step: pick.text, scene: last ? `${last.move ?? "—"} · ${last.viewpoint ?? last.site ?? ""}` : "—", shot: shot ?? "—", ok: why.length === 0, why });
    j.check(`«${title}», paso ${n} («${pick.text.slice(0, 60)}»): se ve sobre la hoja y nada atraviesa nada`, why.length === 0, why.join("; "));
  }
  await p.waitForTimeout(800);
  const res = (await j.texts(".duel .result"))[0] ?? "";
  j.check(`«${title}» termina bien respondiendo bien`, /Conseguido|Bien hecho|Hecho/.test(res), res);
  if (await p.locator(".duel button.end").count()) await j.tap(".duel button.end", "Continuar");
}

/** The arm's audit: its hands at the RWS first, then the arm outside. */
const armAudit = (top) => {
  const a = window.codeship.robotics.audit(top);
  return a.arm ? { ...a.arm, hands: !!a.hands } : null;
};
const judgeArm = (samples, pick) => {
  const why = [];
  if (!samples.length) return pick.choice ? [] : ["sin escena del brazo"];
  const through = [...new Set(samples.flatMap((s) => s.through))];
  if (through.length) why.push(`atraviesa: ${through.slice(0, 3).join(", ")}`);
  const seen = Math.max(...samples.map((s) => s.seen));
  if (seen < 0.5) why.push(`lo que se mueve apenas se ve (${seen} de sus puntos; lo tapa ${samples.at(-1).hiddenBy ?? "—"})`);
  if (!pick.choice && Math.max(...samples.map((s) => s.moved)) < 0.05 && !samples.some((s) => s.shows) && !/comprobar/.test(samples.at(-1).move)) why.push("el paso no mueve nada");
  return why;
};
/** Her hands at a fixture inside (the same rule as PX-20: the hand and the spot on screen above the sheet, and a gesture). */
const judgeHands = (samples) => {
  if (!samples.length) return ["sin escena de pasos"];
  const why = [];
  if (!samples.some((s) => s.handSeen)) why.push("su mano no se ve sobre la hoja");
  if (!samples.some((s) => s.spotSeen)) why.push("el sitio del paso no se ve");
  if (Math.max(...samples.map((s) => s.gesture)) < 0.3) why.push("sin gesto");
  return why;
};
const evaAudit = (top) => (window.codeship.stationEva.active ? window.codeship.stationEva : window.codeship.starshipEva)?.audit(top) ?? null;
const judgeEva = (samples, pick) => {
  const why = [];
  if (!samples.length) return ["sin escena fuera"];
  const through = [...new Set(samples.flatMap((s) => s.through))];
  if (through.length) why.push(`atraviesa: ${through.slice(0, 3).join(", ")}`);
  const fig = Math.max(...samples.map((s) => s.figureSeen));
  if (fig < 0.5) why.push(`ella apenas se ve (${fig})`);
  if (!pick.choice && !samples.some((s) => s.gesture)) why.push("el paso no tiene gesto");
  return why;
};

/**
 * Holds «Avanzar» or «Atrás» (a finger kept on it) until she stops: at an anchor she has not hooked yet (then
 * «Enganchar el cable aquí»), at the end of the tether, or at `done`.
 */
async function crawl(j, dir, what, done, key = "stationEva") {
  const p = j.page;
  let hooks = 0;
  for (let guard = 0; guard < 12; guard++) {
    if (await p.evaluate(done)) break;
    const hook = p.locator('.eva-st:not(.hidden) [data-es="enganchar"]');
    if (await hook.count()) {
      await j.tap('.eva-st:not(.hidden) [data-es="enganchar"]', "Enganchar el cable aquí");
      hooks++;
      await p.waitForTimeout(300);
      continue;
    }
    const b = await p.locator(`.eva-st:not(.hidden) [data-es="${dir}"]`).boundingBox();
    if (!b) break;
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await p.mouse.down();
    const s0 = await p.evaluate((k) => window.codeship[k].eva.anchor, key);
    await p
      .waitForFunction(
        ([fn, a0, forward, k]) => {
          const e = window.codeship[k].eva;
          const at = e.atPoint;
          const hookable = forward && at !== undefined && e.route[at]?.anchor && at !== e.anchor;
          return new Function(`return (${fn})()`)() || hookable || (forward && e.tetherOut >= 25.8);
        },
        [done.toString(), s0, dir === "avanzar", key],
        { timeout: 120000, polling: 200 },
      )
      .catch(() => undefined);
    await p.mouse.up();
    await p.waitForTimeout(400);
  }
  j.check(`${what}: llega (${hooks} cambios de anclaje del cable)`, await p.evaluate(done));
}

async function placeOnStarship(j, id) {
  await j.setup(`Doménica va hasta «${id}» (Starship)`, (f) => window.codeship.starship.mode.placeAt(f), id);
  await j.page.waitForFunction((f) => window.codeship.starship.mode.nearFixture() === f, id, { timeout: 15000 }).catch(() => undefined);
  await j.page.waitForTimeout(600);
}

/** A whole spacewalk from an airlock (`o.key`: the station's Quest or the Starship's): suit, ISLE, out, the job audited, back, suit off. */
async function spacewalk(j, rows, o) {
  const p = j.page;
  const ev = (fn) => p.evaluate(fn, o.key);
  await o.at(j, o.suits);
  await j.tap(`${o.card} [data-act="eva:traje"]`, "Ponerse el EMU y prerrespirar (ISLE)");
  await j.waitDuel();
  await auditedSheet(j, [], "Ponerse el EMU", () => (window.codeship.stationEva.session ?? window.codeship.starshipEva?.session)?.run.current ?? null, () => null, () => [], `${o.shot}-traje`);
  await j.setup("pasan los 160 min del ISLE (reloj de a bordo)", (k) => window.codeship[k].tick(161 / 60), o.key);
  await o.at(j, o.suits);
  await j.tap(`${o.card} [data-act="despresurizar"]`, "Despresurizar la esclusa");
  await j.setup("pasan los minutos de despresurizar", (k) => window.codeship[k].tick(16 / 60), o.key);
  await o.at(j, o.hatch);
  await j.tap(`${o.card} [data-act="salir"]`, "Salir por la escotilla");
  await p.waitForTimeout(1200);
  j.check(`${o.title}: fuera, con el HUD del EMU`, await p.locator(".eva-st:not(.hidden) .es-hud").isVisible());
  await capture(j, `${o.shot}-fuera`, `${o.title}: fuera`);
  await crawl(j, "avanzar", `${o.title}: por los asideros`, new Function(`return window.codeship.${o.key}.eva.atWorksite`), o.key);
  await j.tap('.eva-st:not(.hidden) [data-es="pies"]', "Pies en el APFR");
  await capture(j, `${o.shot}-apfr`, `${o.title}: en el APFR`);
  await j.tap('.eva-st:not(.hidden) [data-es="trabajar"]', "Trabajar");
  await j.waitDuel();
  await auditedSheet(j, rows, o.title, () => (window.codeship.stationEva.session ?? window.codeship.starshipEva?.session)?.run.current ?? null, evaAudit, judgeEva, o.shot);
  await j.tap('.eva-st:not(.hidden) [data-es="pies"]', "Sacar los pies del APFR");
  await crawl(j, "atras", `${o.title}: vuelta`, new Function(`return window.codeship.${o.key}.eva.atHatch`), o.key);
  await j.tap('.eva-st:not(.hidden) [data-es="entrar"]', o.enter);
  j.check(`${o.title}: de vuelta en la esclusa`, await ev((k) => !window.codeship[k].active && window.codeship[k].eva.phase === "represurizando"));
  await j.setup("pasan los minutos de represurizar", (k) => window.codeship[k].tick(16 / 60), o.key);
  await o.at(j, o.suits);
  await j.tap(`${o.card} [data-act="quitar"]`, "Quitarse el EMU");
  j.check(`${o.title}: sin traje`, await ev((k) => window.codeship[k].eva.phase === "dentro"));
}

export async function brazoEva(j) {
  const p = j.page;
  const rows = [];
  await j.setup("retos en «paso a paso»: cada bloque es un paso que se anima", () => localStorage.setItem("codeship.retos-ordenar", "pasos"));
  await j.setup("acopla el módulo en su IDA de cenit de Harmony", () => {
    const c = window.codeship;
    c.docking.undock();
    c.docking.dockNow(c.structure.portFor("sonda"));
  });
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-estacion", "Entrar en la estación");
  await p.waitForTimeout(900);

  // A Cygnus ordered at Unity's galley: on arrival it waits at the 10 m capture point, as on the ISS.
  await placeAt(j, "cocina");
  await j.tap('.sti-card [data-act="carguero:cygnus"]', "Pedir un Cygnus");
  await j.setup("pasan las horas del tránsito del Cygnus", () => window.codeship.lifeSupport.advance(80));
  j.check("el Cygnus espera en el punto de captura (no se acopla solo)", await p.evaluate(() => !!window.codeship.lifeSupport.cargo.awaitingCapture));

  // Capture and berthing by challenge from the RWS.
  await placeAt(j, "cupula");
  const rws = await card(j);
  j.check("el puesto robótico ofrece capturar el Cygnus, por reto y a mano", /Capturar el Cygnus \(por reto\)/.test(rws) && /a mano/.test(rws), rws.slice(0, 200));
  await capture(j, "rws", "Puesto robótico de la Cupola con el Cygnus esperando");
  const food0 = await p.evaluate(() => window.codeship.lifeSupport.system.readout().foodKg);
  await j.tap('.sti-card [data-act="brazo:captura"]', "Capturar el Cygnus (por reto)");
  await j.waitDuel();
  await p.waitForTimeout(500);
  const scroll = await p.evaluate(() => {
    const el = [...document.querySelectorAll(".duel.sheet")].find((e) => !e.classList.contains("hidden"));
    const inner = el ? [el, ...el.querySelectorAll("*")].filter((e) => e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY)) : [];
    return inner.map((e) => `${e.className}: ${e.scrollHeight - e.clientHeight} px`);
  });
  // Nine blocks (four slots and five in the tray) do not fit the sheet at 390 × 664 without changing the panel view
  // (reglas.md: «Vista panel» stays as it is): said, not failed, until Berón decides.
  if (scroll.length) j.problem(`la hoja de la captura se desplaza en 390 × 664: ${scroll.join("; ")}`);
  j.check("al empezar se ven sus manos en los mandos del puesto robótico", await p.evaluate(() => window.codeship.robotics.showingHands || !!window.codeship.robotics.audit(innerHeight).hands));
  await auditedSheet(j, rows, "Capturar el Cygnus y atracarlo en su CBM", () => window.codeship.robotics.session?.run.current ?? null, armAudit, judgeArm, "brazo-captura");
  await p.waitForTimeout(1500);
  await capture(j, "cygnus-cbm", "Cygnus atracado en su CBM");
  j.check("el Cygnus queda atracado y descarga", await p.evaluate(() => window.codeship.robotics.cygnusState() === "atracado"));
  const food1 = await p.evaluate(() => window.codeship.lifeSupport.system.readout().foodKg);
  j.check("la despensa se llena con su carga", food1 > food0, `${food0} → ${food1}`);
  if (await p.locator(".dock-view.on .dv-close").count()) await j.tap(".dock-view.on .dv-close", "Cerrar la vista de fuera");

  // The next one flies only when the port is free: after NG-19's 140 days the arm unberths and releases it.
  await placeAt(j, "cocina");
  j.check("con un Cygnus atracado, la cocina no pide otro y dice por qué", /quedan/.test(await card(j)) || !(await p.locator('.sti-card [data-act="carguero:cygnus"]:not([disabled])').count()));
  await j.setup("pasan los 140 días de a bordo del NG-19", () => window.codeship.robotics.tick(140 * 24 + 1));
  await placeAt(j, "cupula");
  await j.tap('.sti-card [data-act="brazo:suelta-cygnus"]', "Desatracar y soltar el Cygnus");
  await j.waitDuel();
  await p.waitForTimeout(800);
  // The camera turns with its joystick over the scene above the sheet (reglas.md §5.7: never a drag), and the
  // automatic framing stays the default.
  await j.stick(".cam-stick.dock-look .vstick", 45, 5, 600);
  await p.waitForTimeout(400);
  j.check("en un reto del brazo la cámara se gira con el joystick de cámara", await p.evaluate(() => window.codeship.stationOutside.orbitYaw !== 0));
  await capture(j, "suelta-giro", "Cámara girada durante el reto del brazo");
  await auditedSheet(j, rows, "Desatracar y soltar el Cygnus", () => window.codeship.robotics.session?.run.current ?? null, armAudit, judgeArm, "brazo-suelta");
  await p.waitForTimeout(1500);
  j.check("el Cygnus se suelta y se aleja: el CBM queda libre", await p.evaluate(() => window.codeship.robotics.cygnusState() !== "atracado"));
  if (await p.locator(".dock-view.on .dv-close").count()) await j.tap(".dock-view.on .dv-close", "Cerrar la vista de fuera");

  // Another Cygnus captured by hand: the THC moves the tip, the trigger fires when it is close and slow.
  await placeAt(j, "cocina");
  if (await p.locator('.sti-card [data-act="carguero:cygnus"]').count()) {
    await j.tap('.sti-card [data-act="carguero:cygnus"]', "Pedir otro Cygnus");
    await j.setup("pasan las horas del tránsito", () => window.codeship.lifeSupport.advance(80));
    await placeAt(j, "cupula");
    await j.tap('.sti-card [data-act="brazo:mano"]', "Capturar el Cygnus a mano (RHC/THC)");
    j.check("los mandos del THC están en pantalla, sin la tarjeta", await p.locator(".arm-thc:not(.hidden)").isVisible());
    await capture(j, "thc", "Captura a mano con el THC");
    const dist = () => p.evaluate(() => window.codeship.robotics.manualState()?.distanceM ?? 99);
    const pads = ["up", "down", "left", "right", "in", "out"];
    for (let round = 0; round < 30 && (await dist()) > 0.15; round++) {
      let best;
      for (const id of pads) {
        const b = await p.locator(`.arm-thc [data-thc="${id}"]`).boundingBox();
        const d0 = await dist();
        await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await p.mouse.down();
        await p.waitForTimeout(250);
        await p.mouse.up();
        const d1 = await dist();
        if (!best || d0 - d1 > best.gain) best = { id, gain: d0 - d1, b };
      }
      if (!best || best.gain <= 0) break;
      const left = await dist();
      await p.mouse.move(best.b.x + best.b.width / 2, best.b.y + best.b.height / 2);
      await p.mouse.down();
      await p.waitForTimeout(Math.min(2500, Math.max(150, ((left - 0.1) / 0.3) * 600)));
      await p.mouse.up();
    }
    await p.waitForTimeout(400);
    j.check("la punta llega al accesorio de agarre con el THC", (await dist()) < 0.2, String(await dist()));
    await j.tap('.arm-thc [data-arm="disparar"]', "Disparar: capturar");
    j.check("disparado cerca y despacio: capturado y atracado desde tierra", await p.evaluate(() => !window.codeship.robotics.manualActive && window.codeship.robotics.cygnusState() === "atracado"));
    if (await p.locator(".dock-view.on .dv-close").count()) await j.tap(".dock-view.on .dv-close", "Cerrar la vista de fuera");
  } else j.problem("la cocina no ofrece otro Cygnus con uno atracado: la captura a mano no se ha jugado");

  // An outside part planned at the cargo laptop becomes a spacewalk from Quest.
  await j.setup("hay alas nuevas en el hangar (impresas en Planos → Componentes)", () => {
    const h = window.codeship.stationOps.station.hangar;
    h.put("alas-saw-irosa-x4");
    h.put("alas-saw-x4");
  });
  await placeAt(j, "consola-bahia");
  await j.tap('.sti-card [data-act="bahia"]', "Abrir la bahía");
  await j.tap('.bay-ui [data-view="estacion"]', "Estación");
  await j.tap('.bay-ui [data-part^="estacion:alas"]', "Alas solares");
  const fit = p.locator(".bay-ui .bay-act:not(.locked)").first();
  if (await fit.count()) await j.tapAt(fit);
  j.check("cambiar las alas se planea como paseo espacial desde Quest", await p.evaluate(() => !!window.codeship.exteriorWork.job("eva:alas")));
  await capture(j, "planear-eva", "La bahía planea el paseo");
  await j.tap(".bay-ui .bay-back", "Volver a la estación");

  await placeAt(j, "trajes");
  await j.tap('.sti-card [data-act="eva:traje"]', "Ponerse el EMU y prerrespirar (ISLE)");
  await j.waitDuel();
  await auditedSheet(j, rows, "Ponerse el EMU y prerrespirar (ISLE)", () => window.codeship.stationEva.session?.run.current ?? null, (top) => {
    const a = window.codeship.stationInside.stepAudit(top);
    return a ? { ...a, move: `${a.action} · ${a.place}` } : null;
  }, judgeHands, "brazo-traje");
  j.check("prerrespira con el traje puesto", await p.evaluate(() => window.codeship.stationEva.eva.phase === "prerrespirando"));
  await j.setup("pasan los 160 min del ISLE (reloj de a bordo)", () => window.codeship.stationEva.tick(161 / 60));
  await placeAt(j, "trajes");
  await j.tap('.sti-card [data-act="despresurizar"]', "Despresurizar la esclusa");
  await j.setup("pasan los minutos de despresurizar", () => window.codeship.stationEva.tick(16 / 60));
  await placeAt(j, "escotilla-eva");
  await j.tap('.sti-card [data-act="salir"]', "Salir por la escotilla EVA");
  await p.waitForTimeout(1200);
  j.check("fuera: el HUD del EMU y sus mandos", await p.locator(".eva-st:not(.hidden) .es-hud").isVisible());
  await capture(j, "eva-fuera", "Fuera de Quest con el EMU");
  // Along the handrails, the tether hooked at each anchor.
  await crawl(j, "avanzar", "Avanzar por los asideros", () => window.codeship.stationEva.eva.atWorksite);
  j.check("llega al sitio del trabajo por los asideros", await p.evaluate(() => window.codeship.stationEva.eva.atWorksite));
  await j.tap('.eva-st:not(.hidden) [data-es="pies"]', "Pies en el APFR");
  await capture(j, "eva-apfr", "En el APFR junto a las alas");
  await j.tap('.eva-st:not(.hidden) [data-es="trabajar"]', "Trabajar");
  await j.waitDuel();
  await auditedSheet(j, rows, "Paseo: cambiar las alas", () => window.codeship.stationEva.session?.run.current ?? null, evaAudit, judgeEva, "brazo-eva");
  j.check("las alas nuevas quedan montadas", await p.evaluate(() => !window.codeship.exteriorWork.job("eva:alas")));
  await j.tap('.eva-st:not(.hidden) [data-es="pies"]', "Sacar los pies del APFR");
  await crawl(j, "atras", "Volver por los asideros", () => window.codeship.stationEva.eva.atHatch);
  await j.tap('.eva-st:not(.hidden) [data-es="entrar"]', "Entrar en Quest");
  j.check("de vuelta en la esclusa", await p.evaluate(() => !window.codeship.stationEva.active && window.codeship.stationEva.eva.phase === "represurizando"));
  await j.setup("pasan los minutos de represurizar", () => window.codeship.stationEva.tick(16 / 60));
  await placeAt(j, "trajes");
  await j.tap('.sti-card [data-act="quitar"]', "Quitarse el EMU");
  j.check("sin traje y con el traje recargado", await p.evaluate(() => window.codeship.stationEva.eva.phase === "dentro"));

  // The lander's engine is outside too: planned at the bay, swapped on a spacewalk from Quest (Canadarm2 brings it).
  await j.setup("hay un R-4D-11 en el hangar", () => window.codeship.stationOps.station.hangar.put("aerojet-r-4d"));
  await placeAt(j, "consola-bahia");
  await j.tap('.sti-card [data-act="bahia"]', "Abrir la bahía");
  await j.tap('.bay-ui [data-view="sonda"]', "Módulo");
  await j.tap('.bay-ui [data-part="motor"]', "Motor principal del módulo");
  const r4d = p.locator(".bay-ui .bay-act:not(.locked)", { hasText: "R-4D-11" });
  if (await r4d.count()) await j.tapAt(r4d.first());
  j.check("el motor del módulo no se cambia en la bahía: se planea un paseo desde Quest", await p.evaluate(() => !!window.codeship.exteriorWork.job("eva:modulo") && !window.codeship.duelView.visible));
  await j.tap(".bay-ui .bay-back", "Volver a la estación");
  await spacewalk(j, rows, { key: "stationEva", at: placeAt, card: ".sti-card", suits: "trajes", hatch: "escotilla-eva", title: "Paseo: cambiar el motor del módulo", shot: "eva-modulo", enter: "Entrar en Quest" });
  const engine = await p.evaluate(() => window.codeship.ship.design.mainEngines[0]?.model.id);
  j.check("el módulo lleva el R-4D-11 al terminar el paseo", engine === "aerojet-r-4d", engine);

  // The Starship has its own crew airlock (HLS, en desarrollo): its power is changed from there.
  await j.setup("la Starship está atracada en el IDA de proa (el viaje es PX-36) y hay alas ROSA en el hangar", () => {
    const c = window.codeship;
    c.berthMothershipNow();
    c.stationOps.station.hangar.put("rosa-sunstone-x4");
  });
  await placeAt(j, "consola-bahia");
  await j.tap('.sti-card [data-act="bahia"]', "Abrir la bahía");
  await j.tap('.bay-ui [data-view="nodriza"]', "Nodriza");
  await j.tap('.bay-ui [data-part="nodriza-equipo:energia-auxiliar"]', "Energía auxiliar de la Starship");
  const rosa = p.locator(".bay-ui .bay-act:not(.locked)", { hasText: "SunStone" });
  if (await rosa.count()) await j.tapAt(rosa.first());
  j.check("la energía de la Starship se planea como paseo desde su propia esclusa", await p.evaluate(() => !!window.codeship.exteriorWork.job("eva:nodriza-energia")));
  await j.tap(".bay-ui .bay-back", "Volver a la estación");
  await j.setup("pasa a la Starship por su túnel de proa", () => {
    const c = window.codeship;
    c.stationInside.suspend();
    c.starship.enterFromStation();
  });
  await p.waitForTimeout(1200);
  await spacewalk(j, rows, { key: "starshipEva", at: placeOnStarship, card: ".sts-card", suits: "esclusa", hatch: "esclusa", title: "Paseo: cambiar la energía de la Starship", shot: "eva-starship", enter: "Entrar en la Starship" });
  const aux = await p.evaluate(() => window.codeship.mothership.equipment("energia-auxiliar")?.id ?? "");
  j.check("la Starship lleva las alas SunStone al terminar el paseo", aux === "rosa-sunstone-x4", aux);
  await j.setup("vuelve a la estación", () => {
    const c = window.codeship;
    c.starship.mode.suspend();
    c.stationInside.enter("nodriza");
  });

  // Dextre: the P1 camera burnt by radiation, swapped from the RWS.
  await j.setup("pasan las horas: la radiación quema la cámara de P1", () => window.codeship.exteriorWork.tick(8));
  await placeAt(j, "cupula");
  await j.tap('.sti-card [data-act="brazo:dextre-camara"]', "Dextre: cambiar la cámara de P1");
  await j.waitDuel();
  await auditedSheet(j, rows, "Dextre cambia la cámara de P1", () => window.codeship.robotics.session?.run.current ?? null, armAudit, judgeArm, "brazo-dextre");
  j.check("la cámara nueva queda puesta", await p.evaluate(() => !window.codeship.exteriorWork.job("brazo:dextre-camara")));
  if (await p.locator(".dock-view.on .dv-close").count()) await j.tap(".dock-view.on .dv-close", "Cerrar la vista de fuera");

  writeRows(rows);
}

function writeRows(rows) {
  const lines = [
    "# Animaciones del brazo y del paseo (PX-39)",
    "",
    "Escrito por `tools/experiencia/brazo-eva.mjs` (no a mano). Cada bloque bien colocado es un paso: tras él se mide en la escena (`ArmShow.audit` en `src/adapters/three/arm-show.ts`, `StationEva.audit` en `src/station-eva.ts`) si lo que se mueve se ve sobre la hoja, si algo atraviesa la estación y si se ha movido.",
    "",
    "| Reto | Paso | Escena | Captura | Resultado |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map((r) => `| ${r.title} | ${r.step.replace(/\|/g, "\\|")} | ${r.scene} | ${r.shot === "—" ? "—" : `[${r.shot}](../screenshots/${r.shot})`} | ${r.ok ? "Bien" : `Mal: ${r.why.join("; ")}`} |`),
    "",
  ];
  writeFileSync("docs/qa/animaciones-brazo.md", lines.join("\n"));
}
