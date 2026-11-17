// What Berón found missing in the playtest of 2026-11-17 (docs/qa/animaciones.md, «Hallazgos de Berón»), played on an
// iPhone 13 with taps on what a player sees: the yoga-mat settings in the HUD view in the LM, on Starship and on the
// station (where the mat now is in Destiny, and she is seen sitting on it); the camera stick on Starship, the station
// and the probe; the «Vista HUD» toggle in the blueprints (Planos) and in the mind duel; a Starship meal acted out
// with its package at the galley. Captures in docs/screenshots/pendientes-<pantalla>-movil.png.
import { mkdirSync } from "node:fs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(800);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/pendientes-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

/** A finger dragged across a look stick (or the scene): the gesture a player makes to look around. */
async function drag(j, selector, dx = 5) {
  const box = await j.page.locator(selector).first().boundingBox();
  if (!box) return false;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const cdp = await j.page.context().newCDPSession(j.page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + i * dx, y }] });
    await j.page.waitForTimeout(80);
  }
  await j.page.waitForTimeout(700);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await j.page.waitForTimeout(300);
  return true;
}

/** The settings sheet is on screen (not hidden by a rule of the room) and shows its rows. */
const sheetShown = (j) =>
  j.page.evaluate(() => {
    const s = document.querySelector(".settings-sheet");
    const r = s?.getBoundingClientRect();
    return !!s && !s.classList.contains("hidden") && getComputedStyle(s).display !== "none" && (r?.height ?? 0) > 100 && s.querySelectorAll(".set-row").length > 3;
  });

/** At the mat: sit in lotus, switch the settings to the HUD view, check the sheet and close it. */
async function matSettings(j, where, card) {
  const p = j.page;
  await j.tap(`${card} [data-act="ajustes"]`, `Sentarse en loto: ajustes (${where})`);
  await p.waitForTimeout(600);
  if (await p.evaluate(() => !document.querySelector(".settings-sheet")?.classList.contains("set-hud"))) await j.tap('.settings-sheet [data-key="challengeView"]', "Vista HUD (ajustes)");
  await p.waitForTimeout(500);
  j.check(`${where}: en vista HUD, los ajustes de la esterilla se ven`, await sheetShown(j), await p.evaluate(() => document.body.className));
}

export async function pendientes(j) {
  const p = j.page;
  // 1. The LM's cabin: the mat's settings in the HUD view (they used to vanish: their «hud» class was hidden in every room).
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "esterilla", "ajustes", "Sentarse en loto: ajustes");
  await p.waitForTimeout(600);
  if (await p.evaluate(() => !document.querySelector(".settings-sheet")?.classList.contains("set-hud"))) await j.tap('.settings-sheet [data-key="challengeView"]', "Vista HUD (ajustes)");
  await p.waitForTimeout(500);
  j.check("habitáculo del LM: en vista HUD, los ajustes de la esterilla se ven", await sheetShown(j), await p.evaluate(() => document.body.className));
  await capture(j, "ajustes-hud-lm", "Ajustes en vista HUD en el LM");
  await j.tap(".settings-sheet [data-close]", "Levantarse y cerrar los ajustes");

  // 2. Starship: the look stick turns the view (the station's stick used to sit on top of it).
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la Starship");
  await p.waitForTimeout(1200);
  const yaw0 = await p.evaluate(() => window.codeship.starship.mode.yaw);
  await drag(j, ".sts-look");
  const yaw1 = await p.evaluate(() => window.codeship.starship.mode.yaw);
  j.check("Starship: el mando «Mirar» gira la cámara", Math.abs(yaw1 - yaw0) > 0.2, `${yaw0.toFixed(2)} → ${yaw1.toFixed(2)} rad`);
  const covered = await p.evaluate(() => {
    const el = document.querySelector(".sts-look");
    const r = el.getBoundingClientRect();
    return !el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  });
  j.check("Starship: nada tapa el mando «Mirar»", !covered);

  // 3. Starship's mat: the settings in the HUD view, with her seen sitting on it.
  await j.setup("Doménica va hasta la esterilla de la cubierta 1 (los saltos se juegan en PX-28)", () => window.codeship.starship.mode.placeAt("esterilla"));
  await p.waitForTimeout(800);
  await matSettings(j, "Starship", ".sts-card");
  j.check("Starship: sentada en loto se la ve en la esterilla", await p.evaluate(() => window.codeship.starship.mode.steps.framing && window.codeship.starship.mode.steps.holdPose));
  await capture(j, "ajustes-starship", "Ajustes en la esterilla de la Starship");
  await j.tap(".settings-sheet [data-close]", "Levantarse y cerrar los ajustes");

  // 4. Starship's galley: an ISS-type meal acted out with its package (no pans, no hob).
  await j.setup("Doménica va hasta la cocina de la cubierta 1", () => window.codeship.starship.mode.placeAt("cocina"));
  await p.waitForTimeout(800);
  if (await j.tap('.sts-card [data-act^="chore:cocinar"]', "Cocinar en la cocina de la Starship")) {
    await j.waitDuel();
    await p.waitForTimeout(600);
    await j.answer(() => window.codeship.starship.session?.run.current ?? null, true);
    await p.waitForTimeout(1500);
    const a = await p.evaluate(() => {
      const el = [...document.querySelectorAll(".duel.sheet")].find((e) => !e.classList.contains("hidden"));
      const r = window.codeship.starship.mode.stepAudit(el ? el.getBoundingClientRect().top : innerHeight);
      return r ? { action: r.action, props: r.props.map((q) => q.name) } : null;
    });
    j.check("Starship: el primer paso de la comida se ve en la cocina, con el envase en la mano", !!a && a.props.includes("pouch"), JSON.stringify(a));
    await capture(j, "cocina-starship", "Cocina de la Starship con el envase");
    await j.tap('.duel [data-act="close"]', "Cerrar el reto");
  }

  // 5. The probe's console on the flight deck: its own «Mirar» orbits the camera around it.
  await j.setup("sube a la cubierta de vuelo (los saltos se juegan en PX-28)", () => {
    const c = window.codeship;
    c.starship.exit();
    c.bridge.enter("salida");
  });
  await j.useMachine("bridge", "sonda", "abrir", "Tomar el mando de la sonda");
  await p.waitForTimeout(1000);
  const o0 = await p.evaluate(() => window.codeship.probe && window.codeship.subj.probeMode.orbit.yaw);
  await drag(j, ".probe-look");
  const o1 = await p.evaluate(() => window.codeship.subj.probeMode.orbit.yaw);
  j.check("sonda: el mando «Mirar» gira la cámara alrededor de ella", Math.abs(o1 - (o0 ?? 0)) > 0.2, `${o0} → ${o1}`);
  await capture(j, "sonda-mirar", "Cámara de la sonda girada");
  await j.tap(".probe-ui .pr-exit", "Volver al puente");

  // 6. The station: the mat in Destiny, in the HUD view, with her seen sitting on it; its look stick.
  await j.setup("vuelve al LM y lo acopla en su puerto de la estación", () => {
    const c = window.codeship;
    c.bridge.exit();
    c.docking.undock();
    c.docking.dockNow(c.structure.portFor("sonda"));
    c.cabin.enter("asiento");
  });
  await j.useMachine("cabin", "acople", "entrar-estacion", "Entrar en la estación");
  await p.waitForTimeout(1200);
  const s0 = await p.evaluate(() => window.codeship.stationInside.yaw);
  await drag(j, ".sti-look");
  const s1 = await p.evaluate(() => window.codeship.stationInside.yaw);
  j.check("estación: el mando «Mirar» gira la cámara", Math.abs(s1 - s0) > 0.2, `${s0.toFixed(2)} → ${s1.toFixed(2)} rad`);
  await j.setup("Doménica va hasta la esterilla de Destiny (cruzar la estación salto a salto lleva minutos)", () => window.codeship.stationInside.placeAt("esterilla"));
  await p.waitForTimeout(900);
  const where = await p.evaluate(() => window.codeship.stationInside.interior.fixture("esterilla")?.volume);
  j.check("la esterilla de la estación está en Destiny, en una pared, junto al sitio del CEVIS", where === "destiny", where);
  await matSettings(j, "estación", ".sti-card");
  j.check("estación: sentada en loto se la ve en la esterilla", await p.evaluate(() => window.codeship.stationInside.steps.framing && window.codeship.stationInside.steps.holdPose));
  await capture(j, "ajustes-estacion", "Ajustes en la esterilla de Destiny");
  await j.tap(".settings-sheet [data-close]", "Levantarse y cerrar los ajustes");

  // 7. Planos (blueprints): the printed part's challenge offers «Vista HUD» and «Vista panel».
  await j.setup("almacén con material para la pieza impresa; Doménica va hasta la impresora de Columbus", () => {
    const c = window.codeship;
    const st = c.stationOps.station;
    for (const pl of c.stationOps.plans()) for (const id of Object.keys(pl.blueprint.inputs)) st.stock.add({ [id]: 2000 });
    c.stationInside.placeAt("impresora");
  });
  await p.waitForTimeout(900);
  await j.tap('.sti-card [data-act="abrir"]', "Abrir Planos");
  await p.waitForTimeout(500);
  const build = p.locator(".st-body [data-build]:not([disabled])").first();
  if (await build.count()) {
    await build.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await j.tapAt(build);
    await j.waitDuel();
    await p.waitForTimeout(600);
    for (const view of ["antes", "después"]) {
      const t = await p.evaluate(() => document.querySelector(".duel:not(.hidden) .ui-toggle[data-act=ui]")?.textContent ?? "");
      j.check(`Planos (${view}): el reto ofrece cambiar de vista`, /Vista (HUD|panel)/.test(t), t);
      if (view === "antes") await j.tap('.duel:not(.hidden) .ui-toggle[data-act="ui"]', "Cambiar de vista (reto)");
      await p.waitForTimeout(600);
    }
    if (/Vista HUD/.test(await p.evaluate(() => document.querySelector(".duel:not(.hidden) .ui-toggle[data-act=ui]")?.textContent ?? ""))) {
      await j.tap('.duel:not(.hidden) .ui-toggle[data-act="ui"]', "Vista HUD (reto)");
      await p.waitForTimeout(600);
    }
    await capture(j, "planos-hud", "Reto de Planos en vista HUD");
    await j.tap('.duel:not(.hidden) .ui-toggle[data-act="ui"]', "Vista panel (reto)");
    await j.tap('.duel [data-act="close"]', "Cerrar el reto");
  } else j.check("Planos: hay una pieza que fabricar", false);
  await j.tap(".st-back", "Volver");

  // 8. The mind duel (the fiction that stays) offers the view toggle too (reglas.md §4.4).
  await j.setup("posa el módulo sobre Bennu y la fase de la sonda ya está hecha (aterrizar a mano lleva minutos)", () => {
    const c = window.codeship;
    c.stationInside.suspend();
    c.cabin.enter("asiento");
    c.cabin.exit();
    const f = c.flight;
    const s = f.state;
    const P = s.position.constructor;
    const Q = s.orientation.constructor;
    c.docking.undock();
    const bennu = c.region.target;
    let y = 400;
    while (bennu.surfaceDistance(new P(0, y, 0), f.simTimeS) > 3.2) y -= 0.1;
    f._state = new s.constructor(new P(0, y, 0), new P(0, -0.07, 0), Q.IDENTITY, new P(0, 0, 0));
  });
  await p.waitForFunction(() => window.codeship.expedition.phase === "landed", null, { timeout: 180000 }).catch(() => {});
  await j.setup("la fase de la sonda ya está hecha", () => {
    const ex = window.codeship.expedition;
    ex.rapport.of(ex.asteroid.data.id).succeed("sonda");
  });
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "mente", "mente", "Entrar en su mente");
  await j.waitDuel(30000);
  await p.waitForTimeout(600);
  // The view is a persisted setting (the mat's settings above may have left it in HUD): toggle and see it flip.
  const label = () => p.evaluate(() => document.querySelector(".duel:not(.hidden) .ui-toggle[data-act=ui]")?.textContent ?? "");
  const t0 = await label();
  j.check("duelo de la mente: ofrece cambiar de vista", /Vista (HUD|panel)/.test(t0), t0);
  await j.tap('.duel:not(.hidden) .ui-toggle[data-act="ui"]', "Cambiar de vista (duelo)");
  await p.waitForTimeout(600);
  const t1 = await label();
  j.check("duelo de la mente: el botón cambia de vista", /Vista (HUD|panel)/.test(t1) && t1 !== t0, `${t0} → ${t1}`);
  if (/Vista HUD/.test(t1)) {
    await j.tap('.duel:not(.hidden) .ui-toggle[data-act="ui"]', "Vista HUD (duelo)");
    await p.waitForTimeout(600);
  }
  await capture(j, "duelo-hud", "Duelo de la mente en vista HUD");
  await j.tap('.duel:not(.hidden) .ui-toggle[data-act="ui"]', "Vista panel (duelo)");
}
