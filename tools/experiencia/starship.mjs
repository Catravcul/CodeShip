// A new game in the real-only mothership, a Starship (docs/design/nodriza-starship.md): from the lander's
// hatch into deck 3, cook ISS food at the galley of deck 1 and run on the T2 of deck 3 (each from the task
// list's «Ir», challenge sheets alone on screen), up the hatch to the flight deck, and plan a trip at the
// navigation table: the burn-coast-brake hop of the vacuum Raptors with methane and oxygen. Nowhere a ring,
// a farm, an animal or xenon. iPhone 13; captures in docs/screenshots/starship-*-movil.png.
import { mkdirSync } from "node:fs";
import { adoptarUna, llegan } from "./catalogo.mjs";

/** Words that belong to the fictional ring ship (docs/pendientes.md): none may be on screen. */
const FICTION = /\banillo\b|\bradio del anillo\b|\bhuerto\b|\bgallin|\bgata\b|\bperr[oa]\b|\bxenón\b|\bespina\b/i;

async function capture(j, label, title) {
  await j.page.waitForTimeout(700);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/starship-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
  await noFiction(j, title);
}

async function noFiction(j, where) {
  const text = await j.page.evaluate(() => document.body.innerText);
  const hit = text.match(/.{0,30}(?:anillo|huerto|gallin|gata|perr[oa]|xenón|espina).{0,30}/i);
  j.check(`${where}: nada de la nave de ficción en pantalla (anillo, huerto, animales, xenón)`, !FICTION.test(text), hit?.[0]);
}

async function close(j) {
  const p = j.page;
  await p.waitForTimeout(800);
  if (await p.locator(".duel:not(.hidden) button.end").count()) await j.tap(".duel:not(.hidden) button.end", "Continuar");
  else if (await p.locator('.duel:not(.hidden) .duel-tools [data-act="close"]').count()) await j.tap('.duel:not(.hidden) .duel-tools [data-act="close"]', "× del reto");
  await p.waitForFunction(() => [...document.querySelectorAll(".duel")].every((e) => e.classList.contains("hidden")), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(500);
}

async function fromTasks(j, button, title) {
  await j.tap(button, "Tareas");
  await j.page.waitForTimeout(400);
  await j.tap(`.task-board .tb-go[aria-label="Ir: ${title.replace(/"/g, '\\"')}"]`, `Ir: ${title}`);
}

export async function starship(j) {
  const p = j.page;
  const ship = await p.evaluate(() => {
    const c = window.codeship;
    return { name: c.mothership.spec.name, ring: !!c.ring, animals: c.habitat.animals.length, plants: c.habitat.plants.length, propellant: c.mothership.propellantName, dv: Math.round(c.mothership.deltaV()) };
  });
  j.check("la partida nueva empieza con la Starship de nodriza, sin anillo, animales ni huerto", ship.name === "Starship" && !ship.ring && ship.animals === 0 && ship.plants === 0, JSON.stringify(ship));
  j.check("su propelente es metano y oxígeno, con unos 10 km/s de Δv con los tanques llenos", ship.propellant === "metano y oxígeno" && ship.dv > 9000 && ship.dv < 11000, `${ship.dv} m/s`);

  // 1. From the lander's cabin, through the docking hatch into deck 3.
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la nave de viaje");
  await p.waitForTimeout(1500);
  const in3 = await p.evaluate(() => ({ active: window.codeship.starship.active, deck: window.codeship.starship.where() }));
  j.check("entra por la escotilla del módulo a la cubierta 3 de la Starship", in3.active && in3.deck === "cubierta-3", JSON.stringify(in3));
  const hud = (await j.texts(".sts-ui .sts-hud")).join(" ");
  j.check("el letrero dice la cubierta y que es 0 g", /Cubierta 3/.test(hud) && /0 g/.test(hud), hud.slice(0, 80));
  await capture(j, "cubierta-3", "Cubierta 3: ejercicio y esclusa");

  // 2. Cook ISS food at the galley of deck 1: «Ir» from the task list (teleport through the hatches).
  const meal = await p.evaluate(() => window.codeship.tasks().find((t) => t.place.vehicle === "nodriza" && t.place.spot === "anillo" && /^Cocinar/.test(t.title))?.title);
  if (!meal) return j.check("hay una comida de la ISS en la lista de tareas", false);
  j.check("la comida es de la ISS (rehidratar o calentar)", /rehidratad|termoestabilizad/i.test(meal), meal);
  await fromTasks(j, ".sts-ui .sts-tasks", meal);
  await j.waitDuel(120000);
  const deck1 = await p.evaluate(() => window.codeship.starship.where());
  j.check("«Ir» la lleva a la cocina de la cubierta 1", deck1 === "cubierta-1", deck1);
  await capture(j, "cocina", "Cocina de la cubierta 1 con el reto abierto");
  await close(j);

  // 3. Exercise on the T2 of deck 3.
  const run = await p.evaluate(() => window.codeship.tasks().find((t) => t.place.vehicle === "nodriza" && /cinta/i.test(t.title))?.title);
  if (!run) return j.check("hay un ejercicio de cinta en la lista de tareas", false);
  await fromTasks(j, ".sts-ui .sts-tasks", run);
  await j.waitDuel(120000);
  const deck3 = await p.evaluate(() => window.codeship.starship.where());
  j.check("«Ir» la lleva a la cinta T2 de la cubierta 3", deck3 === "cubierta-3", deck3);
  await capture(j, "ejercicio", "Cinta T2 con el reto abierto");
  await close(j);

  // 4. The species catalogue's rack slots: its terminal on deck 2, the aquatic habitat in a rack bay of deck 3.
  await j.setup("salta hasta el terminal del catálogo de la cubierta 2 (los saltos por los asideros se juegan arriba)", () => window.codeship.starship.mode.placeAt("catalogo"));
  await p.waitForTimeout(1000);
  await j.tap('.sts-card:not(.hidden) [data-act="catalogo"]', "Abrir el catálogo de especies");
  await p.waitForTimeout(500);
  j.check("el terminal de la cubierta 2 abre el catálogo de especies", await p.locator(".species-catalog:not(.hidden)").count() > 0);
  await j.tap('.species-catalog [data-area="habitat-acuatico"]', "Hábitat: Hábitat acuático");
  const st = await adoptarUna(j, "medaka", "peces");
  j.check("adoptar medakas para el hábitat acuático: vienen de camino", /En camino/.test(st), st);
  await capture(j, "catalogo", "Catálogo de especies desde la Starship");
  await j.tap(".species-catalog [data-close]", "Cerrar el catálogo");
  await llegan(j);
  const fish = await p.evaluate(() => ({ fish: window.codeship.starship.aquarium.tank.fishCount, drawn: window.codeship.starship.tank.fish.count }));
  j.check("llegan las medakas al hábitat acuático de la Starship y se ven en 3D", fish.fish > 0 && fish.drawn === fish.fish, JSON.stringify(fish));
  await j.setup("salta hasta el hábitat acuático de la cubierta 3", () => window.codeship.starship.mode.placeAt("habitat-acuatico"));
  await p.waitForTimeout(1000);
  const care = await j.texts(".sts-card:not(.hidden) button");
  j.check("el hábitat acuático ofrece cuidar las medakas", care.some((t) => /medakas/i.test(t)), care.join(" / "));
  await capture(j, "habitat-acuatico", "Hábitat acuático de la cubierta 3");

  // 5. Up to the flight deck through the hatch in deck 1's ceiling.
  await j.setup("sube a la cubierta 1, junto a la escotilla de la cubierta de vuelo (los saltos por los asideros se juegan en «movimiento»)", () => window.codeship.starship.mode.placeAt("subir-cubierta-vuelo"));
  await p.waitForTimeout(1200);
  await capture(j, "escotilla-vuelo", "Escotilla de la cubierta de vuelo");
  await j.tap('.sts-card:not(.hidden) [data-act="subir"]', "Subir a la cubierta de vuelo");
  await p.waitForTimeout(1500);
  j.check("arriba está el puente con sus consolas", await p.evaluate(() => window.codeship.bridge.active && !window.codeship.starship.active));

  // 6. The propulsion page: vacuum Raptors and methane and oxygen; the power page has no reactor.
  await j.useMachine("bridge", "prop", "abrir", "Usar la consola: Pilotaje y propulsión");
  await p.waitForTimeout(1200);
  const prop = (await j.texts(".fd .fd-panel.max")).join(" ");
  j.check("la página de propulsión habla de los Raptor de vacío y de metano y oxígeno", /Raptor de vacío/.test(prop) && /Metano y oxígeno/.test(prop), prop.slice(0, 160));
  await capture(j, "propulsion", "Página de propulsión de la Starship");
  await j.tap(".fd-panel.max .fd-back", "Volver al puente");
  await p.waitForTimeout(600);

  // 7. Plan a trip at the navigation table: the challenge is the burn-coast-brake hop.
  await j.useMachine("bridge", "nav", "abrir", "Usar la consola: Mesa de navegación");
  await p.waitForTimeout(1200);
  const id = await p.evaluate(() => window.codeship.nav.targets.find((t) => t.kind === "asteroid" && t.id !== window.codeship.region.target.data.id)?.id);
  await j.tap(`.nav-map .nav-chip[data-id="${id}"]`, "asteroide en el mapa");
  await p.waitForTimeout(400);
  const card = (await j.texts(".nav-map")).join(" ");
  j.check("la tarjeta del destino da el propelente en metano y oxígeno", /metano y oxígeno/.test(card), card.match(/nodriza[^\n]{0,120}/)?.[0]);
  await j.tap('.nav-map [data-act="program"]', "Programar viaje");
  await j.waitDuel(30000);
  const sheet = (await j.texts(".duel:not(.hidden)")).join(" ");
  j.check("la hoja del viaje dice que se acelera, se va por inercia y se frena", /inercia/.test(sheet), sheet.slice(0, 200));
  const scenario = await p.evaluate(() => window.codeship.nav.programming?.chore.scenario ?? "");
  j.check("el viaje es con los Raptor de vacío y gasta metano y oxígeno", /Raptor de vacío/.test(scenario) && /metano y oxígeno/.test(scenario), scenario);
  await capture(j, "viaje", "Programar el viaje de la Starship");
  await close(j);
  await j.tap(".fd-panel.max .fd-back", "Volver al puente");
  await j.setup("el destino vuelve a ser Bennu", () => window.codeship.nav.select(window.codeship.region.target.data.id));
}
