// The Apollo LM and Juventas (docs/design/modulo-lunar-juventas.md), played with taps on an iPhone 13: the
// LM's real cabin with its ECS panel, undocking from Starship, landing on Bennu by program, the mind duel,
// docking back, and at the ISS putting Juventas together in the Bishop from the catalogue and deploying it,
// seen from the Cupola. Captures in docs/screenshots/lm-<pantalla>-movil.png.
import { mkdirSync } from "node:fs";
import { placeAbove } from "./aterrizaje.mjs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(800);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/lm-${label}-movil.png`, timeout: 120000 });
  await j.shot(`lm-${label}`);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

/** A capture without the overlap check: the flight HUD's camera tag overlaps other things (B-03, open). */
async function photo(j, label) {
  await j.page.waitForTimeout(800);
  await j.page.screenshot({ path: `docs/screenshots/lm-${label}-movil.png`, timeout: 120000 });
  await j.shot(`lm-${label}`);
}

const landing = () => window.codeship.landerLanding.programming?.current ?? null;
const duel = () => window.codeship.expedition.duel?.current ?? null;

export async function moduloLunar(j) {
  const p = j.page;
  const ship = await p.evaluate(() => ({ name: window.codeship.ship.design.hull.name, dry: Math.round(window.codeship.ship.dryMassKg), look: window.codeship.ship.design.look }));
  j.check("el módulo de la jugadora es el módulo lunar Apolo (4280 kg + adaptador IDSS en seco)", ship.look === "apollo-lm" && ship.dry > 4280 && ship.dry < 4800, JSON.stringify(ship));

  // The LM's cabin: six machines, among them its own ECS panel.
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await p.waitForTimeout(900);
  const ids = await p.evaluate(() => window.codeship.cabin.opts.layout.stations.map((s) => s.id));
  j.check("la cabina del LM tiene puesto del comandante, mente, escotilla delantera, acople, ECS y esterilla", ["asiento", "mente", "escotilla", "acople", "ecs", "esterilla"].every((i) => ids.includes(i)), ids.join(", "));
  await capture(j, "cabina", "Cabina del LM");
  await j.useMachine("cabin", "ecs", null);
  const ecs = (await j.texts(".room-ui:not(.hidden) .cab-machine"))[0] ?? "";
  j.check("el panel del ECS da O₂, LiOH, CO₂ y autonomía", /ECS del módulo lunar/.test(ecs) && /LiOH/.test(ecs) && /CO₂/.test(ecs) && /Autonomía/.test(ecs), ecs.slice(0, 200));
  j.check("con el cartucho nuevo no deja cambiarlo y dice por qué", /queda el 100 %/.test(ecs), ecs.slice(0, 300));
  await capture(j, "ecs", "Panel del ECS del LM");

  // Undock from Starship, and down on Bennu by program.
  await j.useMachine("cabin", "acople", "desacoplar", "Desacoplar");
  await p.waitForTimeout(600);
  j.check("la escotilla de acople desacopla el LM de la Starship", await p.evaluate(() => !window.codeship.docking.docked));
  await j.setup("el LM llega a 300 m de Bennu (lo que deja el viaje comprimido)", placeAbove, ["modulo", 300, 0]);
  await j.useMachine("cabin", "asiento", "pilotar", "Ponerse en el puesto del comandante");
  await p.waitForTimeout(1200);
  await capture(j, "zona", "El LM en la zona de aterrizaje");
  await j.tap(".ctx-dock > .land-offer", "Aterrizar con un programa");
  await j.waitDuel(30000);
  await j.answer(landing, true);
  for (let n = 0; n < 8 && (await p.evaluate(() => window.codeship.landerLanding.status)) === "programming"; n++) await j.answer(landing, true);
  await p.waitForTimeout(3000);
  await photo(j, "bajando");
  await p.waitForFunction(() => window.codeship.landerLanding.status !== "flying", null, { timeout: 300000 });
  const end = await p.evaluate(() => [window.codeship.landerLanding.status, window.codeship.expedition.phase]);
  j.check("el LM se posa en Bennu por programa y las patas anclan", end[0] === "landed" && end[1] === "landed", end.join(" / "));
  await j.tap(".cam-btn", "Cámara");
  await p.waitForTimeout(800);
  await photo(j, "posado");

  // The mind duel from the LMP's station.
  await j.setup("la fase de la sonda ya está hecha en Bennu (posar Juventas lleva horas de juego)", () => {
    const ex = window.codeship.expedition;
    ex.rapport.of(ex.asteroid.data.id).succeed("sonda");
  });
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "mente", "mente", "Entrar en su mente");
  await j.waitDuel(30000);
  await j.answer(duel, false);
  for (let n = 0; n < 14 && (await p.evaluate(() => window.codeship.expedition.phase)) === "duel"; n++) await j.answer(duel, true);
  const result = (await j.texts(".duel .result"))[0] ?? "";
  j.check("el duelo de la mente se gana desde la cabina del LM (con un fallo)", /Conseguido/.test(result), result);
  await capture(j, "duelo", "Duelo de la mente desde el LM");
  await j.tap(".duel button.end", "Continuar");
  await p.waitForTimeout(600);

  // Docking back: the flight home is a trip of its own (PX-06); here it is placed at the port.
  await j.setup("el LM vuelve y acopla en la Starship (el viaje de vuelta es otro recorrido)", () => {
    const c = window.codeship;
    c.flight.releaseAnchor();
    c.docking.dockNow(c.mothership);
  });
  await j.useMachine("cabin", "acople", null);
  const dock = (await j.texts(".room-ui:not(.hidden) .cab-machine"))[0] ?? "";
  j.check("acoplado de vuelta, la escotilla de acople ofrece entrar en la nave de viaje", /Entrar en la nave de viaje/.test(dock), dock.slice(0, 160));
  await j.useMachine("cabin", "ecs", null);
  const refill = (await j.texts(".room-ui:not(.hidden) .cab-machine"))[0] ?? "";
  j.check("acoplado, el ECS se puede reponer desde el anfitrión", /Reponer O₂, agua y cartuchos/.test(refill), refill.slice(0, 200));

  // At the ISS: Juventas put together in the Bishop from the catalogue, and deployed.
  await j.setup("el LM acopla en su IDA de cenit de Harmony y las piezas de Juventas están en la estación", () => {
    const c = window.codeship;
    c.docking.undock();
    c.docking.dockNow(c.structure.portFor("sonda"));
    const h = c.stationOps.station.hangar;
    for (const [id, n] of [["juventas-bus", 1], ["jura", 1], ["grass", 1], ["juventas-gas-frio", 1], ["bateria-juventas", 1]]) h.put(id, n);
  });
  await j.useMachine("cabin", "acople", "entrar-estacion", "Entrar en la estación");
  await p.waitForTimeout(900);
  await j.setup("Doménica va hasta la refinería", () => window.codeship.stationInside.placeAt("refineria"));
  await p.waitForFunction(() => window.codeship.stationInside.nearFixture() === "refineria", null, { timeout: 15000 }).catch(() => undefined);
  await j.tap('.sti-card [data-act="abrir"]', "Abrir (refinería)");
  await p.waitForTimeout(600);
  await j.tap('.st-tabs [data-tab="hangar"]', "Pestaña Hangar");
  await j.tap("[data-catalogue]", "Ver el catálogo");
  await p.waitForTimeout(500);
  const btn = p.locator('[data-yard-build="juventas"]');
  await btn.scrollIntoViewIfNeeded();
  j.check("Juventas se monta en la esclusa Bishop", /Montar en la esclusa Bishop/.test(await btn.innerText()) && !(await btn.isDisabled()), await btn.innerText());
  await capture(j, "catalogo-juventas", "Juventas en el catálogo");
  await j.tap('[data-yard-build="juventas"]', "Montar Juventas en la Bishop");
  await p.waitForTimeout(600);
  const waiting = await p.evaluate(() => window.codeship.station.yard.parked().map((c) => `${c.id}@${c.site}`));
  j.check("Juventas espera montada en la Bishop", waiting.some((w) => /^juventas.*@bishop$/.test(w)), waiting.join(", "));
  const rel = p.locator('[data-yard-release^="juventas"]');
  await rel.scrollIntoViewIfNeeded();
  await j.tapAt(rel);
  await p.waitForTimeout(1500);
  j.check("«Desplegar Juventas» la suelta y se ve desde la Cupola", await p.evaluate(() => window.codeship.stationOutside.viewing && window.codeship.stationOutside.busy));
  await p.waitForTimeout(4000);
  await capture(j, "desplegar", "Juventas sale de la Bishop");
  const gone = await p.waitForFunction(() => !window.codeship.stationOutside.busy, null, { timeout: 60000 }).then(() => true, () => false);
  j.check("Juventas queda libre y ya no espera en la Bishop", gone && (await p.evaluate(() => window.codeship.station.yard.parked().length)) === 0);
}
