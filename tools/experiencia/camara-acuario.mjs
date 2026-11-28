// PX-43: Berón's review of 2026-11-17, played with taps on an iPhone 13. (1) The camera moves only with a joystick
// (reglas.md §5.7) and there are no gravity areas for now (§2.6): in the LM, Starship and the station the only stick
// is «Mirar» with its «+» and «−», no stick moves her, and a drag on the screen turns nothing. (2) JAXA's AQH at real
// size (two 15 × 7 × 7 cm chambers, medaka of about 3,5 cm), its rack off the wall, scaled by the presentation
// setting, the fish swimming inside its chambers. (3) The species catalogue is a laptop on the animal rack, beside
// the AQH in Kibo and on Starship's deck 2, not a flat panel. (4) An adoption's arrival time counts down with the
// catalogue open. Captures: docs/screenshots/camara-acuario-*-movil.png.
import { mkdirSync } from "node:fs";
import { enterGame } from "./lib.mjs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(700);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/camara-acuario-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

/** Visible sticks on screen: their labels. */
const sticks = (j) => j.page.evaluate(() => [...document.querySelectorAll(".vstick")].filter((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== "none").map((e) => e.querySelector("span")?.textContent ?? ""));

/** A drag across the middle of the screen (a player trying to turn the view by hand). */
async function dragScreen(p) {
  const vp = p.viewportSize();
  await p.mouse.move(vp.width / 2 - 60, vp.height * 0.3);
  await p.mouse.down();
  await p.mouse.move(vp.width / 2 + 80, vp.height * 0.3 + 30, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(300);
}

/** Where a camera looks, as a heading round the vertical (radians). */
const headingOf = (path) => {
  const cam = path.split(".").reduce((o, k) => o?.[k], window.codeship);
  const v = cam.position.clone();
  cam.updateMatrixWorld();
  cam.getWorldDirection(v);
  return Math.atan2(v.x, v.z);
};

/** A push on the camera joystick `stick` turns the camera `cam` (Berón, 2026-11-18: in 3ª persona nothing moved). */
async function stickTurns(j, label, cam, stick) {
  const p = j.page;
  const shown = await p.locator(stick).first().isVisible().catch(() => false);
  j.check(`${label}: el joystick de cámara está en pantalla`, shown);
  const h0 = await p.evaluate(headingOf, cam);
  await j.stick(stick, 45, 0, 700);
  await p.waitForTimeout(250);
  const d = (await p.evaluate(headingOf, cam)) - h0;
  const turn = Math.atan2(Math.sin(d), Math.cos(d));
  j.check(`${label}: empujar el joystick gira la cámara`, Math.abs(turn) > 0.05, `${turn.toFixed(2)} rad`);
}

/** The same in first and third person (the «Vista» button of the menu is played in PX-42), then back to first. */
async function bothViews(j, label, area, cam, stick, shot) {
  const view = (third) =>
    j.setup(`vista en ${third ? "3ª" : "1ª"} persona en ${label}`, ([a, t]) => {
      a.split(".").reduce((o, k) => o[k], window.codeship).thirdPerson = t;
    }, [area, third]);
  for (const third of [false, true]) {
    await view(third);
    await j.page.waitForTimeout(400);
    await stickTurns(j, `${label}, ${third ? "3ª" : "1ª"} persona`, cam, stick);
    if (third && shot) await capture(j, shot, `${label} en 3ª persona, la cámara girada con el joystick`);
  }
  await view(false);
}

/** The AQH's live audit: every fish's head and tail inside its chamber, sizes, and nothing behind the wall. */
const aqhAudit = (path) => {
  const c = window.codeship;
  const g = path.split(".").reduce((o, k) => o[k], c).gearOf(path.startsWith("starship") ? "habitat-acuatico" : "rack-acuatico");
  const M = g.root.matrixWorld.clone();
  const m = M.clone();
  let inside = true;
  for (let i = 0; i < g.fish.count; i++) {
    g.fish.getMatrixAt(i, m);
    const ch = g.chambers[i % 2];
    for (const z of [g.fishLength / 2, -g.fishLength / 2]) {
      const p = ch.centre.clone().set(0, 0, z).applyMatrix4(m).sub(ch.centre);
      inside &&= Math.abs(p.x) < ch.half.x && Math.abs(p.y) < ch.half.y && Math.abs(p.z) < ch.half.z;
    }
  }
  const k = g.chambers[0].half.x * 2 + 0.004;
  return { fish: g.fish.count, inside, chamberCm: Math.round(k * 1000) / 10, fishCm: Math.round(g.fishLength * 1000) / 10 };
};

export async function camaraAcuario(j) {
  const p = j.page;

  // 1. The LM's cabin: zero g, so the only stick is «Mirar», with «+» and «−»; a drag on the screen turns nothing.
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await p.waitForTimeout(800);
  const lm = await sticks(j);
  j.check("en el LM solo hay el joystick «Mirar» (sin gravedad, ninguno la mueve)", lm.length === 1 && /Mirar/i.test(lm[0]), lm.join(" / "));
  // The zoom is on the Switch pad's D-pad ↑ / ↓ in every level (ui/game-pad.ts, reglas.md §5.7): the stick's own «+» «−» go.
  j.check("el zoom está en la cruceta del mando de la Switch (↑ Acercar, ↓ Alejar), no junto a «Mirar»", (await p.locator(".switch-pad .ap-up:visible, .switch-pad .ap-down:visible").count()) === 2 && (await p.locator(".vstick .cam-zoom button:visible").count()) === 0);
  const yaw0 = await p.evaluate(() => window.codeship.cabin.yaw);
  await dragScreen(p);
  j.check("en el LM, arrastrar la pantalla no mueve la cámara", (await p.evaluate(() => window.codeship.cabin.yaw)) === yaw0);
  await j.stick(".vstick.cab-look", 45, 0, 600);
  j.check("en el LM, el joystick «Mirar» gira la cámara", (await p.evaluate(() => window.codeship.cabin.yaw)) !== yaw0);
  await capture(j, "lm-mirar", "El LM con solo el joystick de cámara");
  await bothViews(j, "el LM", "cabin", "cabin.camera", ".vstick.cab-look", "lm-3p");

  // 2. Starship's deck 3: the AQH.
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la Starship");
  await p.waitForFunction(() => window.codeship.starship.active && !window.codeship.starship.mode.throughHatch, null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(800);
  const ship = await sticks(j);
  j.check("en la Starship solo hay el joystick «Mirar»", ship.length === 1 && /Mirar/i.test(ship[0]), ship.join(" / "));
  const placeShip = (id) => j.setup(`Doménica va hasta «${id}» de la Starship (los saltos se juegan en PX-28)`, (f) => window.codeship.starship.mode.placeAt(f), id);
  await j.setup("llegan 6 medakas y 4 caracoles al AQH (adoptarlos se juega en PX-27)", () => {
    const t = window.codeship.starship.aquarium.tank;
    t.stock("banco", 6, "medakas");
    t.stock("caracoles", 4, "caracoles");
    t.algae = 0;
  });
  await placeShip("habitat-acuatico");
  await p.waitForTimeout(1200);
  const shipYaw = await p.evaluate(() => window.codeship.starship.mode.yaw);
  await dragScreen(p);
  j.check("en la Starship, arrastrar la pantalla no mueve la cámara", (await p.evaluate(() => window.codeship.starship.mode.yaw)) === shipYaw);
  const scale = await p.evaluate(() => window.codeship.starship.mode.interior.plan.scale ?? 1);
  for (let t = 0; t < 3; t++) {
    const a = await p.evaluate(aqhAudit, "starship.mode");
    j.check(`Starship: las ${a.fish} medakas nadan dentro de sus cámaras, sin atravesar el cristal (muestra ${t + 1})`, a.fish === 6 && a.inside, JSON.stringify(a));
    if (t === 0) j.check(`Starship: cámaras de 15 cm y medakas de 3,5 cm, ampliadas por la escala de interiores (${scale}×)`, Math.abs(a.chamberCm - 15 * scale) < 0.2 && Math.abs(a.fishCm - 3.5 * scale) < 0.1, JSON.stringify(a));
    await p.waitForTimeout(700);
  }
  const behind = await p.evaluate(() => {
    const g = window.codeship.starship.mode.gearOf("habitat-acuatico");
    const box = new (g.root.position.constructor)();
    let min = Infinity;
    const inv = g.root.matrixWorld.clone().invert();
    g.root.traverse((o) => {
      if (!o.geometry || o.isInstancedMesh) return;
      o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox;
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) min = Math.min(min, box.set(x, y, z).applyMatrix4(o.matrixWorld).applyMatrix4(inv).z);
    });
    return min;
  });
  j.check("Starship: el AQH no se mete en la pared (todo él queda en el pasillo)", behind > -1e-3, `${behind.toFixed(3)} m`);
  await capture(j, "starship-aqh", "El AQH de la Starship");
  // Further, with «−»: the whole unit, both chambers with their medaka.
  await j.hold(".switch-pad .ap-down", 1200);
  const zoom = await p.evaluate(() => window.codeship.starship.mode.camera.zoom);
  j.check("↓ de la cruceta (Alejar) abre la cámara (sin mover a Doménica)", zoom < 0.8, zoom.toFixed(2));
  await capture(j, "starship-aqh-entero", "El AQH entero con «−»");
  await bothViews(j, "la cubierta 3 de la Starship", "starship.mode", "starship.mode.camera", ".vstick.sts-look", "starship-3p");

  // 3. The catalogue's laptop on the animal rack (deck 2), then the live arrival time.
  await placeShip("catalogo");
  await p.waitForTimeout(1200);
  const lap = await p.evaluate(() => window.codeship.starship.mode.gearOf("catalogo")?.kind ?? "");
  j.check("Starship: el catálogo es un portátil en el bastidor de los animales, no un panel", lap === "catalogo", lap);
  await capture(j, "starship-portatil", "El portátil del catálogo en la Starship");
  await j.tap('.sts-card:not(.hidden) [data-act="catalogo"]', "Abrir el catálogo de especies");
  await p.waitForTimeout(500);
  await j.tap('.species-catalog [data-group="peces"]', "filtro Peces");
  await j.tap('.species-catalog .sc-card[data-id="pez-cebra"]', "ficha Pez cebra");
  await p.waitForTimeout(300);
  await j.tap(".species-catalog .sc-adopt", "Adoptar pez cebra");
  await p.waitForTimeout(400);
  const s0 = (await j.texts(".species-catalog .sc-status"))[0] ?? "";
  j.check("la ficha dice cuánto falta, en horas de a bordo y en tiempo real", /llega en .* h de a bordo \(\d+:\d\d reales\)/.test(s0), s0);
  // A real second or two (a busy phone draws few frames, and board time follows the frames).
  await p.waitForFunction((t) => document.querySelector(".species-catalog .sc-status")?.textContent !== t, s0, { timeout: 30000 }).catch(() => {});
  const s1 = (await j.texts(".species-catalog .sc-status"))[0] ?? "";
  j.check("con el catálogo abierto, la hora de llegada cuenta sola (sin cerrarlo y abrirlo)", s1 !== s0 && /reales/.test(s1), `${s0} → ${s1}`);
  await capture(j, "llegada-en-vivo", "La llegada contando en el catálogo abierto");
  await j.tap(".species-catalog [data-back]", "‹ Catálogo");
  await p.waitForTimeout(300);
  const badge0 = (await j.texts('.species-catalog .sc-card[data-id="pez-cebra"] .sc-badge'))[0] ?? "";
  // 0,1 h of board time is 6 real seconds.
  await p.waitForFunction((t) => document.querySelector('.species-catalog .sc-card[data-id="pez-cebra"] .sc-badge')?.textContent !== t, badge0, { timeout: 60000 }).catch(() => {});
  const badge1 = (await j.texts('.species-catalog .sc-card[data-id="pez-cebra"] .sc-badge'))[0] ?? "";
  j.check("en la lista, el distintivo «En camino» también baja solo", /En camino/.test(badge0) && badge1 !== badge0, `${badge0} → ${badge1}`);
  await j.tap(".species-catalog [data-close]", "Cerrar el catálogo");
  await p.waitForTimeout(300);

  // The Starship's airlock and its flight deck (a room of its own since puente-starship): the stick in both views.
  await placeShip("esclusa");
  await p.waitForTimeout(1200);
  await bothViews(j, "la esclusa de la Starship", "starship.mode", "starship.mode.camera", ".vstick.sts-look");
  await placeShip("subir-cubierta-vuelo");
  await p.waitForTimeout(1200);
  await j.tap('.sts-card:not(.hidden) [data-act="subir"]', "Subir a la cubierta de vuelo");
  await p.waitForFunction(() => window.codeship.bridge.active, null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1500);
  await bothViews(j, "la cubierta de vuelo de la Starship", "bridge", "bridge.camera", ".vstick.puente-look", "cubierta-vuelo-3p");

  // 4. The station: Kibo's AQH and the catalogue's laptop beside it (reglas.md §6.0, parity).
  await j.setup("vuelve al LM y lo acopla en su puerto de la estación", () => {
    const c = window.codeship;
    if (c.bridge.active) c.bridge.exit();
    c.starship.exit();
    c.docking.undock();
    c.docking.dockNow(c.structure.portFor("sonda"));
    c.cabin.enter("asiento");
  });
  await p.waitForTimeout(800);
  await j.useMachine("cabin", "acople", "entrar-estacion", "Entrar en la estación");
  await p.waitForFunction(() => window.codeship.stationInside.active, null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1200);
  const iss = await sticks(j);
  j.check("en la estación solo hay el joystick «Mirar»", iss.length === 1 && /Mirar/i.test(iss[0]), iss.join(" / "));
  const placeIss = (id) => j.setup(`Doménica va hasta «${id}» de la estación (cruzar la estación salto a salto lleva minutos)`, (f) => window.codeship.stationInside.placeAt(f), id);
  await j.setup("6 medakas en el AQH de Kibo (el traslado se juega en PX-38)", () => window.codeship.stationAquarium.tank.stock("banco", 6, "medakas"));
  await placeIss("rack-acuatico");
  await p.waitForTimeout(1200);
  const a = await p.evaluate(aqhAudit, "stationInside");
  j.check("Kibo: las medakas nadan dentro de las cámaras del AQH", a.fish === 6 && a.inside, JSON.stringify(a));
  await capture(j, "kibo-aqh", "El AQH de Kibo");
  await bothViews(j, "Kibo", "stationInside", "stationInside.camera", ".vstick.sti-look");
  await placeIss("rack-catalogo");
  await p.waitForTimeout(1200);
  const issLap = await p.evaluate(() => window.codeship.stationInside.gearOf("rack-catalogo")?.kind ?? "");
  j.check("Kibo: el catálogo es el portátil del bastidor de los animales, junto al AQH", issLap === "catalogo", issLap);
  await capture(j, "kibo-portatil", "El portátil del catálogo en Kibo");
  const issYaw = await p.evaluate(() => window.codeship.stationInside.yaw);
  await dragScreen(p);
  j.check("en la estación, arrastrar la pantalla no mueve la cámara", (await p.evaluate(() => window.codeship.stationInside.yaw)) === issYaw);

  // 5. The rest of the station's areas (Berón, 2026-11-18: «¿es general?»): Quest's airlock, the bay and outside.
  await placeIss("trajes");
  await p.waitForTimeout(1200);
  await bothViews(j, "la esclusa Quest", "stationInside", "stationInside.camera", ".vstick.sti-look");
  await j.setup("hay alas nuevas en el hangar (impresas en Planos → Componentes)", () => {
    const h = window.codeship.stationOps.station.hangar;
    h.put("alas-saw-irosa-x4");
    h.put("alas-saw-x4");
  });
  await placeIss("consola-bahia");
  await p.waitForTimeout(1200);
  await j.tap('.sti-card [data-act="bahia"]', "Abrir la bahía");
  await p.waitForTimeout(1200);
  await stickTurns(j, "la bahía", "bay.view.camera", ".cam-stick.bay-look .vstick");
  await j.tap('.bay-ui [data-view="estacion"]', "Estación");
  await j.tap('.bay-ui [data-part^="estacion:alas"]', "Alas solares");
  const fit = p.locator(".bay-ui .bay-act:not(.locked)").first();
  if (await fit.count()) await j.tapAt(fit);
  await j.tap(".bay-ui .bay-back", "Volver a la estación");
  await j.setup("traje puesto, ISLE y esclusa vacía (se juegan en PX-39)", () => {
    window.codeship.stationEva.eva._phase = "fuera";
  });
  await placeIss("escotilla-eva");
  await p.waitForTimeout(1200);
  await j.tap('.sti-card [data-act="salir"]', "Salir por la escotilla EVA");
  await p.waitForTimeout(1500);
  await stickTurns(j, "fuera de la estación (paseo espacial)", "stationEva.camera", ".cam-stick.eva-cam .vstick");
  await capture(j, "eva-camara", "Fuera de la estación con el joystick de cámara");

  // 6. A new game landed on Bennu: the LM's cabin on the asteroid (0 g too) and the walk outside.
  await p.reload();
  await enterGame(p);
  await p.waitForTimeout(1500);
  await j.setup("posa el módulo sobre Bennu (aterrizar a mano lleva minutos y se juega en PX-03)", () => {
    const c = window.codeship;
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
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await p.waitForTimeout(800);
  await bothViews(j, "el LM posado", "cabin", "cabin.camera", ".vstick.cab-look");
  await j.setup("fuera con el traje puesto (ponérselo es un reto que se juega en PX-03)", () => window.codeship.evaMode.skipSuitUp());
  await p.waitForTimeout(1500);
  await stickTurns(j, "el paseo por Bennu", "evaMode.camera", ".vstick.eva-look");
  await capture(j, "bennu-eva", "Fuera, en Bennu, con el joystick de cámara");
}
