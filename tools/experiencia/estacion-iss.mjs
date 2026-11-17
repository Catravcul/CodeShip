// The station as the ISS's US segment (docs/design/estacion-real.md), played with taps on an iPhone 13:
// a tour through its hatches (Harmony, Destiny, Unity, Tranquility, Columbus, Kibo with the species catalogue's
// rack slots, and Quest), the galley in
// Unity, Juventas stowed in the Bishop and let go outside by Canadarm2, and the arm berthing the lander on
// Unity's nadir CBM seen from the Cupola. Captures in docs/screenshots/iss-<pantalla>-movil.png.
import { mkdirSync } from "node:fs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(900);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/iss-${label}-movil.png`, timeout: 120000 });
  await j.shot(`iss-${label}`);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

const card = (j) => j.page.evaluate(() => document.querySelector(".sti-card:not(.hidden)")?.innerText.replace(/\s+/g, " ") ?? "");
const where = (j) => j.page.evaluate(() => window.codeship.stationInside.where());
/** Teleport to a thing's grab point (crossing the station hop by hop takes minutes with SwiftShader). */
async function placeAt(j, id) {
  await j.setup(`Doménica va hasta «${id}»`, (f) => window.codeship.stationInside.placeAt(f), id);
  // The card follows on the next frames (SwiftShader draws a few per second).
  await j.page.waitForFunction((f) => window.codeship.stationInside.nearFixture() === f, id, { timeout: 15000 }).catch(() => undefined);
  await j.page.waitForTimeout(600);
}

/** Through a hatch with its door's card: «Entrar en <módulo>». */
async function through(j, door, to, name) {
  await placeAt(j, door);
  const c = await card(j);
  j.check(`la puerta dice «Entrar en ${name}»`, new RegExp(`Entrar en ${name}`).test(c), c.slice(0, 120));
  await j.tap('.sti-card [data-act="entrar"]', `Entrar en ${name}`);
  const ok = await j.page.waitForFunction((v) => window.codeship.stationInside.where() === v, to, { timeout: 90000 }).then(() => true, () => false);
  j.check(`cruza la escotilla y está en ${name}`, ok, await where(j));
}

/** A thing in the module she is in: its card names it (and, for the racks, eclss-real's name). */
async function look(j, fixture, re, label, title) {
  await placeAt(j, fixture);
  const c = await card(j);
  j.check(`${title}: su tarjeta lo nombra`, re.test(c), c.slice(0, 140));
  await capture(j, label, title);
}

/**
 * An arm job from the Cupola's RWS is a challenge (docs/design/brazo-robotico.md): answered right, the arm's last
 * move captured in the strip above the sheet before closing it. Says whether the arm moved outside.
 */
async function armChallenge(j, label, title) {
  const p = j.page;
  await j.waitDuel();
  for (let i = 0; i < 24 && (await p.evaluate(() => !!window.codeship.robotics.session?.run.current)); i++) await j.answer(() => window.codeship.robotics.session?.run.current ?? null);
  await p.waitForTimeout(2500);
  await capture(j, label, title);
  const moved = await p.evaluate(() => (window.codeship.robotics.audit(innerHeight).arm?.moved ?? 0) > 0 || !!window.codeship.robotics.audit(innerHeight).arm);
  await j.tap(".duel button.end", "Continuar");
  await p.waitForTimeout(600);
  if (await p.locator(".dock-view.on .dv-close").count()) await j.tap(".dock-view.on .dv-close", "Cerrar la vista de fuera");
  return moved;
}

export async function estacionIss(j) {
  const p = j.page;
  await j.setup("acopla el módulo en su IDA de cenit de Harmony", () => {
    const c = window.codeship;
    c.docking.undock();
    c.docking.dockNow(c.structure.portFor("sonda"));
  });
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-estacion", "Entrar en la estación");
  await p.waitForTimeout(900);
  j.check("entra en Harmony por el IDA de cenit", (await where(j)) === "nodo-2", await where(j));

  // The tour, as on the ISS: Harmony's crew quarters, then down the stack and out to the side modules.
  // Harmony's four crew quarters are rooms one floats into (docs/design/compartimentos.md): hers is the first.
  await look(j, "saco-1", /Tu saco de dormir/, "harmony", "Harmony: dentro de su camarote");
  j.check("su camarote es un cuarto de Harmony en el que está dentro", (await where(j)) === "camarote-1", await where(j));
  await through(j, "puerta-escotilla-destiny-nodo2-nodo-2", "destiny", "Destiny");
  await look(j, "amf", /Additive Manufacturing|AMF/, "destiny", "Destiny: la impresora AMF de Redwire");
  await through(j, "puerta-escotilla-nodo1-destiny-destiny", "nodo-1", "Unity");
  await through(j, "puerta-escotilla-nodo1-nodo3-nodo-1", "nodo-3", "Tranquility");
  await look(j, "sv-wrs", /Recuperación de agua/, "tranquility", "Tranquility: los bastidores de agua (WRS)");
  await through(j, "puerta-escotilla-nodo2-columbus-nodo-2", "columbus", "Columbus");
  await look(j, "impresora", /[Ii]mpresora/, "columbus", "Columbus: el taller (la impresora de metal de la ESA)");
  await through(j, "puerta-escotilla-nodo2-kibo-nodo-2", "kibo", "Kibo");
  // Kibo's airlock is a hatch for cargo: tapping it only says what it is; the inventory is at the JEMRMS console.
  await placeAt(j, "esclusa-kibo");
  j.check("la esclusa de Kibo no abre ningún menú (solo dice qué es)", (await p.locator(".sti-card:not(.hidden) [data-act]:not([disabled])").count()) === 0, (await card(j)).slice(0, 140));
  await look(j, "consola-jemrms", /JEMRMS/, "kibo", "Kibo: la consola del JEMRMS junto a su esclusa");
  // Kibo hosts the species catalogue's rack slots: the Aquatic Habitat (as on the ISS) and the catalogue laptop.
  await look(j, "rack-acuatico", /Aquatic Habitat|AQH/, "kibo-aqh", "Kibo: el hábitat acuático (AQH)");
  await placeAt(j, "rack-catalogo");
  await j.tap('.sti-card [data-act="catalogo"]', "Abrir el catálogo de especies");
  j.check("el portátil de Kibo abre el catálogo de especies", await p.evaluate(() => window.codeship.sanctuary.catalog.visible));
  await capture(j, "catalogo", "Catálogo de especies desde Kibo");
  await j.tap(".species-catalog .sc-x", "Cerrar el catálogo");
  await through(j, "puerta-escotilla-nodo1-quest-nodo-1", "quest", "Quest");
  await look(j, "trajes", /Trajes/, "quest", "Quest: los trajes de EVA");

  // The galley in Unity: a dish from the station's larder.
  await placeAt(j, "cocina");
  const galley = await card(j);
  j.check("la cocina está en Unity y ofrece platos", /Cocinar /.test(galley) && (await where(j)) === "nodo-1", galley.slice(0, 140));
  const before = await p.evaluate(() => JSON.stringify(window.codeship.stationCrew.larder()));
  await j.tap('.sti-card [data-act^="chore:cocinar"]', "Cocinar un plato");
  await j.waitDuel();
  for (let i = 0; i < 12 && (await p.evaluate(() => !!window.codeship.stationLife.session?.run.current)); i++) await j.answer(() => window.codeship.stationLife.session?.run.current);
  await p.waitForTimeout(1000);
  await capture(j, "cocina", "Cocina de Unity: plato hecho");
  await j.tap(".duel button.end", "Continuar");
  const after = await p.evaluate(() => JSON.stringify(window.codeship.stationCrew.larder()));
  j.check("cocinar gasta la despensa de la estación", before !== after, `${before} → ${after}`);

  // The Bishop: Juventas in, the hatch shut, Canadarm2 takes it out and lets it go.
  // Inside the Bishop (a room off Tranquility's port end), Juventas onto its plate; released from the Cupola's RWS.
  await placeAt(j, "bishop");
  const b = await card(j);
  j.check("dentro de la Bishop, su placa ofrece sujetar Juventas", /Sujetar Juventas/.test(b) && (await where(j)) === "bishop", b.slice(0, 160));
  await capture(j, "bishop-dentro", "Dentro de la Bishop");
  await j.tap('.sti-card [data-act="guardar:juventas"]', "Sujetar Juventas a la placa");
  j.check("Juventas está en la Bishop", (await p.evaluate(() => window.codeship.bishop.place("juventas"))) === "bishop");
  await placeAt(j, "cupula");
  j.check("el puesto robótico de la Cupola está dentro de la Cupola", (await where(j)) === "cupola", await where(j));
  await j.tap('.sti-card [data-act="soltar"]', "Soltar Juventas con la Bishop (puesto robótico)");
  const bishopShown = await armChallenge(j, "bishop-suelta", "Canadarm2 saca la Bishop y suelta Juventas");
  j.check("se ve: el brazo saca la Bishop paso a paso", bishopShown);
  j.check("Juventas queda fuera, volando sola", (await p.evaluate(() => window.codeship.bishop.place("juventas"))) === "fuera");
  const back = await p.waitForFunction(() => !window.codeship.stationOutside.busy, null, { timeout: 60000 }).then(() => true, () => false);
  j.check("la Bishop vuelve a su puerto de Tranquility", back);

  // Canadarm2 berths the lander on Unity's nadir CBM, seen from the Cupola.
  await placeAt(j, "cupula");
  await j.tap('.sti-card [data-act="atracar"]', "Atracar el módulo en el CBM con el brazo");
  j.check("se ve: el brazo lleva el módulo por encima de la celosía", await armChallenge(j, "brazo-cbm", "Módulo atracado en el CBM de Unity"));
  j.check("el módulo está atracado en el CBM", await p.evaluate(() => window.codeship.landerBerth.onCbm));
  await placeAt(j, "cupula");
  await j.tap('.sti-card [data-act="desatracar"]', "Devolver el módulo a su IDA");
  await armChallenge(j, "brazo-ida", "El módulo de vuelta en su IDA");
  j.check("el brazo lo devuelve a su IDA", await p.evaluate(() => !window.codeship.landerBerth.onCbm));
}
