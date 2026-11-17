// PX-32: the LM's real crew station as the piloting view (docs/design/cabina-lm.md), played with taps on an
// iPhone 13: the commander standing at his station, looking out of his triangular window, with panels 1–16,
// the FDAI, X-pointer, tapes and DSKY fed by the flight; the overhead docking window with the COAS; a landing
// by program on Bennu with the DSKY on P64 and the camera tag in the context column (B-03: no overlaps); then,
// on the Starship's bridge, a trip programmed at the navigation table, its plan drawn in the challenge's own
// scene (the map hides with every other interface: the focus rule has no exceptions); and Juventas flown from
// its console with no cabin of its own. Captures in docs/screenshots/cabina-lm-<pantalla>-movil.png.
import { mkdirSync } from "node:fs";
import { placeAbove } from "./aterrizaje.mjs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(800);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/cabina-lm-${label}-movil.png`, timeout: 120000 });
  await j.shot(`cabina-lm-${label}`);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón ni rótulo se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

const landing = () => window.codeship.landerLanding.programming?.current ?? null;
const tripStep = () => window.codeship.nav.programming?.current ?? null;

export async function cabinaLm(j) {
  const p = j.page;
  // 1. The piloting view is the LM's cabin, standing at the commander's station.
  const cab = await p.evaluate(() => {
    const c = window.codeship;
    const r = c.view.rig;
    const names = ["panel-1", "panel-2", "panel-3", "panel-4", "panel-5", "panel-6", "panel-8", "panel-11", "panel-12", "panel-14", "panel-16", "fdai-1", "fdai-2", "aca", "ttca", "coas", "lpd"];
    const cabin = r.getObjectByName("cabina-lm");
    return { mode: c.view.cameraMode, inCabin: c.view.inCabin, visible: !!cabin?.visible, missing: names.filter((n) => !r.getObjectByName(n)) };
  });
  j.check("al pilotar, la vista es la cabina del LM desde el puesto del comandante (de pie)", cab.mode === "cabina" && cab.inCabin && cab.visible, JSON.stringify(cab));
  j.check("la cabina tiene los paneles 1–6, 8, 11, 12, 14 y 16, los dos FDAI, el ACA, el TTCA, el COAS y la escala del LPD", cab.missing.length === 0, cab.missing.join(", "));
  const read = await p.evaluate(() => ({ r: window.codeship.view.instrumentReading, hud: document.querySelector(".hud .big")?.textContent ?? "" }));
  const km = Number((/([\d.]+)\s*km/.exec(read.hud) ?? [])[1]);
  j.check("las cintas ALT del panel 1 dicen la misma altura que la línea ALT del HUD", !!read.r && Number.isFinite(km) && Math.abs(read.r.altitudeM / 1000 - km) < 0.02, `${read.r?.altitudeM} m · HUD «${read.hud}»`);
  const tags = await j.texts(".hud .ins");
  j.check("cada línea del HUD lleva el nombre de su instrumento del LM (ALT, ALT RATE, T/W, THRUST…)", ["ALT", "ALT RATE", "T/W", "THRUST"].every((t) => tags.includes(t)), tags.join(" "));
  await capture(j, "ventana", "Puesto del comandante: ventana triangular");

  // 2. The overhead docking window with the COAS (the eye cycles the cameras: Cabina → … → Acople).
  for (let n = 0; n < 6 && (await p.evaluate(() => window.codeship.view.cameraMode)) !== "acople"; n++) await j.tap(".cam-btn", "Cámara");
  const dock = await p.evaluate(() => {
    const c = window.codeship;
    const coas = c.view.rig.getObjectByName("coas");
    const cam = c.view.camera;
    const v = coas.getWorldPosition(coas.position.clone()).project(cam);
    return { mode: c.view.cameraMode, inCabin: c.view.inCabin, x: v.x, y: v.y, z: v.z, tag: document.querySelector(".cam-tag")?.textContent ?? "" };
  });
  j.check("la cámara «Acople» mira por la ventana de acople del techo, con el COAS delante", dock.mode === "acople" && dock.inCabin && Math.abs(dock.x) < 1 && Math.abs(dock.y) < 1 && dock.z < 1, JSON.stringify(dock));
  await capture(j, "acople", "Ventana de acople con el COAS");
  for (let n = 0; n < 6 && (await p.evaluate(() => window.codeship.view.cameraMode)) !== "cabina"; n++) await j.tap(".cam-btn", "Cámara");

  // 3. Undock, and down on Bennu by program: the DSKY shows P64, the camera tag stays in the column (B-03).
  await j.tap(".stand-btn", "Dejar el puesto: habitáculo");
  await j.useMachine("cabin", "acople", "desacoplar", "Desacoplar");
  await p.waitForTimeout(600);
  await j.setup("el LM llega a 300 m de Bennu (lo que deja el viaje comprimido)", placeAbove, ["modulo", 300, 0]);
  await j.useMachine("cabin", "asiento", "pilotar", "Pilotar de pie");
  await p.waitForTimeout(1200);
  await j.tap(".ctx-dock > .land-offer", "Aterrizar con un programa");
  await j.waitDuel(30000);
  for (let n = 0; n < 9 && (await p.evaluate(() => window.codeship.landerLanding.status)) === "programming"; n++) await j.answer(landing, true);
  await p.waitForTimeout(3000);
  const desc = await p.evaluate(() => ({ prog: window.codeship.view.instrumentReading?.program, status: window.codeship.landerLanding.status, mode: window.codeship.view.cameraMode }));
  j.check("bajando por programa, el DSKY del panel 4 dice PROG 64", desc.prog === 64, JSON.stringify(desc));
  await capture(j, "bajando", "Bajando por programa (cámara ventral)");
  await p.waitForFunction(() => window.codeship.landerLanding.status !== "flying", null, { timeout: 300000 });
  const end = await p.evaluate(() => [window.codeship.landerLanding.status, window.codeship.view.instrumentReading?.contact]);
  j.check("posado, se enciende LUNAR CONTACT", end[0] === "landed" && end[1] === true, end.join(" / "));
  await j.tap(".cam-btn", "Cámara");
  await p.waitForTimeout(800);
  await capture(j, "posado", "Posado en Bennu (cámara trasera) con el aviso del asteroide");

  // 4. On the Starship's bridge: a trip programmed at the navigation table, its plan in the challenge's scene.
  await j.setup("el LM vuelve y acopla en la Starship (el viaje de vuelta es otro recorrido)", () => {
    const c = window.codeship;
    c.flight.releaseAnchor();
    c.docking.dockNow(c.mothership);
  });
  for (let n = 0; n < 6 && (await p.evaluate(() => window.codeship.view.cameraMode)) !== "cabina"; n++) await j.tap(".cam-btn", "Cámara");
  await j.tap(".stand-btn", "Dejar el puesto: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la nave de viaje");
  await p.waitForTimeout(1500);
  await j.setup("sube a la cubierta 1, junto a la escotilla de la cubierta de vuelo (los saltos se juegan en «movimiento»)", () => window.codeship.starship.mode.placeAt("subir-cubierta-vuelo"));
  await p.waitForTimeout(1200);
  await j.tap('.sts-card:not(.hidden) [data-act="subir"]', "Subir a la cubierta de vuelo");
  await p.waitForTimeout(1500);
  await j.useMachine("bridge", "nav", "abrir", "Usar la consola: Mesa de navegación");
  await p.waitForTimeout(1200);
  const id = await p.evaluate(() => window.codeship.nav.targets.find((t) => t.kind === "asteroid" && t.id !== window.codeship.region.target.data.id)?.id);
  await j.tap(`.nav-map .nav-chip[data-id="${id}"]`, "asteroide en el mapa");
  await p.waitForTimeout(400);
  await j.tap('.nav-map [data-act="program"]', "Programar viaje");
  await j.waitDuel(30000);
  let plan = { drawn: 0, onScreen: 0, points: 0, inView: false };
  for (let n = 0; n < 3; n++) {
    const before = await p.evaluate(() => window.codeship.planOverlay.drawn);
    if (!(await p.evaluate(tripStep))) break;
    await j.answer(tripStep, true);
    await p.waitForFunction((b) => window.codeship.planOverlay.drawn > b, before, { timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(500);
    plan = await p.evaluate(() => {
      const el = [...document.querySelectorAll(".duel")].find((e) => !e.classList.contains("hidden"));
      return window.codeship.planAudit(el?.classList.contains("sheet") ? el.getBoundingClientRect().top : innerHeight);
    });
    if (plan.drawn > 0) break;
  }
  const map = await p.evaluate(() => {
    const m = document.querySelector(".nav-map");
    return { shown: !!m && m.checkVisibility(), keep: document.querySelectorAll("[data-duel-keep]").length };
  });
  j.check("con el reto abierto el mapa se oculta como toda interfaz (sin data-duel-keep)", !map.shown && map.keep === 0, JSON.stringify(map));
  const cap = await p.evaluate(() => ({ inSheet: !!document.querySelector(".duel:not(.hidden) .plan-caption.on"), text: document.querySelector(".plan-caption")?.textContent ?? "" }));
  j.check("la línea del paso va dentro de la hoja del reto", cap.inSheet && cap.text.length > 0, JSON.stringify(cap));
  j.check("el plan del viaje se dibuja en la escena del reto y se ve sobre la hoja", plan.drawn > 0 && plan.inView && plan.onScreen > plan.points / 2, `${plan.onScreen}/${plan.points} puntos · ${plan.drawn} líneas`);
  await j.onlyChallengeVisible("viaje desde la mesa de navegación");
  await capture(j, "plan-viaje", "Plan del viaje en la escena del reto");
  if (await p.locator('.duel:not(.hidden) .duel-tools [data-act="close"]').count()) await j.tap('.duel:not(.hidden) .duel-tools [data-act="close"]', "× del reto");
  else if (await p.locator(".duel:not(.hidden) button.end").count()) await j.tap(".duel:not(.hidden) button.end", "Continuar");
  await p.waitForTimeout(800);
  await j.tap(".fd-panel.max .fd-back", "Volver al puente");
  await p.waitForTimeout(600);

  // 5. Juventas has no cabin: it is flown from its console, with its own camera.
  await j.useMachine("bridge", "sonda", "abrir", "Tomar el mando de la sonda");
  await p.waitForTimeout(900);
  const probe = await p.evaluate(() => ({
    console: document.body.classList.contains("in-probe"),
    cam: document.querySelector(".pr-cam")?.textContent ?? "",
    title: document.querySelector(".pr-title")?.textContent ?? "",
    cabin: window.codeship.view.rig.getObjectByName("cabina-lm")?.visible && window.codeship.view.enabled,
  }));
  j.check("Juventas se pilota a distancia desde su consola, sin cabina (cámara de la sonda)", probe.console && /a distancia/.test(probe.title) && /sin cabina/.test(probe.cam) && !probe.cabin, JSON.stringify(probe));
  await capture(j, "juventas", "Consola de Juventas");
  await j.tap(".pr-exit", "Volver al puente");
}

