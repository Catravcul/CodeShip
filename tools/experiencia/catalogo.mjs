// The species catalogue (docs/design/catalogo-especies.md, recorrido PX-27): a new game with Doménica alone and no
// animals, the catalogue from its terminal (a rack slot; the ring hosts it for now; never from the task list), the
// two snails side by side (only the one that lived in microgravity can be adopted), adopting medaka and
// Biomphalaria for the empty aquatic habitat, seeing them arrive and befriending them; then two meals in a
// board day (Berón, 2026-11-16). The helpers `abrirCatalogo`, `adoptar` and `llegan` are how every journey that
// needs animals gets them: with the taps a player makes.
// Captures go to docs/screenshots/catalogo-<paso>-movil.png.
import { mkdirSync } from "node:fs";

const current = () => window.codeship.interior.session?.run.current;

async function capture(j, label) {
  await j.page.waitForTimeout(500);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/catalogo-${label}-${j.opts.mobile === false ? "escritorio" : "movil"}.png` });
  await j.shot(label);
}

/**
 * The catalogue from its machine in her compartment (reglas.md §2.3: never from the task list): the laptop on
 * the animal rack of the Starship's deck 2 or of Kibo, or the ring's terminal beside the aquarium. Getting there
 * is set up (the walks and hops are played in PX-28, PX-29 and «movimiento»); opening it is a tap on its card.
 */
export async function abrirCatalogo(j) {
  const p = j.page;
  const where = await p.evaluate(() => {
    const c = window.codeship;
    if (c.stationInside?.active) return "estacion";
    if (c.starship?.active) return "starship";
    return "anillo";
  });
  if (where === "starship") {
    await j.setup("salta hasta el portátil del catálogo, cubierta 2 (los saltos se juegan en PX-28)", () => window.codeship.starship.mode.placeAt("catalogo"));
    await p.waitForTimeout(900);
    await j.tap('.sts-card:not(.hidden) [data-act="catalogo"]', "Abrir el catálogo de especies (portátil)");
  } else if (where === "estacion") {
    await j.setup("va hasta el portátil del catálogo en Kibo (el recorrido por la estación se juega en PX-29)", () => window.codeship.stationInside.placeAt("rack-catalogo"));
    await p.waitForTimeout(900);
    await j.tap('.sti-card [data-act="catalogo"]', "Abrir el catálogo de especies (portátil)");
  } else {
    await j.setup("camina hasta el terminal del catálogo, al lado del acuario (andar se juega en «movimiento»)", () => {
      const i = window.codeship.interior;
      i.pos.set(-6.6, 0, 10.6);
      i.yaw = 0;
    });
    await p.waitForTimeout(600);
    await j.tap(".station-btn", "Catálogo de especies (terminal)");
  }
  await p.waitForTimeout(400);
}

/** In the open catalogue: its group chip, its card, «Adoptar», back to the list. Returns the status line. */
export async function adoptarUna(j, id, group) {
  const p = j.page;
  if (group) await j.tap(`.species-catalog [data-group="${group}"]`, `filtro ${group}`);
  await j.tap(`.species-catalog .sc-card[data-id="${id}"]`, `ficha ${id}`);
  await p.waitForTimeout(300);
  await j.tap(".species-catalog .sc-adopt", `Adoptar ${id}`);
  await p.waitForTimeout(300);
  const status = (await j.texts(".species-catalog .sc-status"))[0] ?? "";
  await j.tap(".species-catalog [data-back]", "‹ Catálogo");
  await p.waitForTimeout(200);
  return status;
}

/** Adopts each `[id, group]` with taps at the catalogue's machine, then closes the catalogue. */
export async function adoptar(j, list) {
  await abrirCatalogo(j);
  for (const [id, group] of list) {
    const s = await adoptarUna(j, id, group);
    j.check(`«Adoptar» ${id}: ya viene de camino o eclosiona`, /En camino|Eclosionando/.test(s), s);
  }
  await j.tap(".species-catalog [data-close]", "Cerrar el catálogo");
  await j.page.waitForTimeout(300);
}

/** The Sanctuary's transfer (about 25 h of the station clock, 25 real minutes) and hatching pass at once. */
export async function llegan(j, hours = 30) {
  await j.setup(`pasa el viaje del Santuario (${hours} h de a bordo; a ×1 son ${hours} min reales)`, (h) => {
    window.codeship.importOps.tick(h);
    window.codeship.sanctuary.update(h / 24);
  }, hours);
  await j.page.waitForTimeout(1200);
}

/** Solve every challenge of the open chore with visible taps, then «Continuar». */
async function solveAll(j, label) {
  const n = await j.page.evaluate(() => window.codeship.interior.session?.run.steps ?? 0);
  for (let i = 0; i < n; i++) {
    await j.answer(current);
    await j.page.waitForTimeout(300);
  }
  const result = (await j.texts(".duel .result"))[0] ?? "";
  j.check(`${label}: «Conseguido»`, /Conseguido/.test(result), result);
  await j.tap(".duel button.end", "Continuar");
  await j.page.waitForTimeout(400);
}

async function hudStatus(j) {
  if (!(await j.page.evaluate(() => document.querySelector(".ihud")?.classList.contains("open")))) await j.tap(".ihud", "estado de Doménica (despliega)");
  await j.page.waitForTimeout(300);
  const line = (await j.texts(".ihud .more")).find((t) => t.startsWith("Acuario:")) ?? "";
  await j.tap(".ihud", "estado de Doménica (pliega)");
  return line;
}

export async function catalogo(j) {
  const p = j.page;
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la nave de viaje");
  await p.waitForTimeout(800);
  await j.setup("la llevamos al anillo (bajar por el radio se juega en «movimiento»)", () => {
    const z = window.codeship.interior.zones;
    z.zone = "anillo";
    z.autoDown = false;
  });
  await j.resetPerf();

  // 1. A new game: Doménica alone.
  const world = await p.evaluate(() => {
    const c = window.codeship;
    return { cats: c.habitat.cats.length, dogs: c.habitat.dogs.length, hens: c.habitat.hens.length, fish: c.interior.aquarium.tank.fishCount, snails: c.interior.aquarium.tank.snailCount, families: c.habitat.families.length };
  });
  j.check("partida nueva: ni gatos, ni perros, ni gallinas, ni peces ni caracoles", Object.values(world).every((n) => n === 0), JSON.stringify(world));
  const empty = await hudStatus(j);
  j.check("el estado del acuario dice que no hay peces y dónde adoptarlos", /sin peces \(adóptalos en el catálogo\)/.test(empty), empty);
  // The flight view's button, or the pinned one of the Starship's or the station's interior.
  await j.tap(".tasks-btn:visible, .sts-tasks:visible, .sti-tasks:visible", "Tareas");
  await p.waitForTimeout(400);
  const animalTasks = await p.evaluate(() => window.codeship.interior.choreFacts().filter((f) => f.category === "animales").map((f) => f.title));
  j.check("la lista de tareas no tiene ninguna de cuidar animales (solo el cristal del acuario: tiene algas aunque esté vacío)", animalTasks.every((t) => t === "Limpiar el cristal del acuario"), animalTasks.join(" | "));
  await j.tap(".task-board [data-close]", "Cerrar tareas");

  j.check("la lista de tareas no tiene botón del catálogo: se abre en su terminal (reglas §2.3)", (await p.locator(".task-board .tb-catalog, .task-board [data-catalog]").count()) === 0);
  // 2. The catalogue from its terminal: extensive, filterable.
  await abrirCatalogo(j);
  const head = (await j.texts(".species-catalog .sc-title span"))[0] ?? "";
  const n = Number(/^(\d+)/.exec(head)?.[1] ?? 0);
  j.check("el catálogo tiene más de 50 especies y variantes", n >= 50, head);
  j.check("en el móvil la hoja cabe a lo ancho (sin desplazamiento lateral)", await p.evaluate(() => document.querySelector(".species-catalog").scrollWidth <= window.innerWidth + 1));
  await capture(j, "lista");
  await j.tap('.species-catalog [data-group="caracoles"]', "Caracoles");
  const snails = await p.$$eval(".species-catalog .sc-card", (els) => els.map((e) => e.dataset.id));
  j.check("el filtro Caracoles muestra los dos caracoles: Biomphalaria y nerita", snails.includes("caracol") && snails.includes("nerita"), snails.join(", "));
  await capture(j, "caracoles");

  // 3. The two snails side by side: only the one that really lived in microgravity can be adopted.
  await j.tap('.species-catalog .sc-card[data-id="nerita"]', "ficha nerita");
  const ner = (await j.texts(".species-catalog .sc-detail"))[0] ?? "";
  j.check("nerita: sin vuelo, el mejor limpiacristales y no cría en agua dulce", /Sin vuelo espacial/.test(ner) && /limpiacristales/.test(ner) && /no eclosionan en agua dulce/.test(ner), ner.slice(0, 160));
  j.check("nerita: aporta y precauciones van por separado, con la fuente del vuelo", /Aporta/i.test(ner) && /Precauciones/i.test(ner) && (await p.locator('.species-catalog .sc-detail a:has-text("Fuente")').count()) > 0);
  const nerSt = (await j.texts(".species-catalog .sc-status"))[0] ?? "";
  j.check("nerita: «Pendiente: nunca ha vivido en ingravidez» y sin botón de adoptar", /Pendiente: nunca ha vivido en ingravidez/.test(nerSt) && (await p.locator(".species-catalog .sc-adopt").count()) === 0, nerSt);
  await capture(j, "nerita");
  await j.tap(".species-catalog [data-back]", "‹ Catálogo");
  await j.tap('.species-catalog .sc-card[data-id="caracol"]', "ficha Biomphalaria");
  const bio = (await j.texts(".species-catalog .sc-detail"))[0] ?? "";
  j.check("Biomphalaria: ha volado (C.E.B.A.S.) y avisa del esquistosoma: solo líneas de laboratorio", /Ha volado/.test(bio) && /esquistosoma/.test(bio) && /laboratorio/.test(bio), bio.slice(0, 160));
  j.check("Biomphalaria: cabe en el hábitat acuático (fit), tipo Aquatic Habitat de JAXA, con su fuente", /Hábitat acuático: cabe/.test(bio) && /Aquatic Habitat de JAXA/.test(bio));
  await capture(j, "biomphalaria");

  // 4. Adopt Biomphalaria and medaka for the empty aquatic habitat.
  await j.tap(".species-catalog .sc-adopt", "Adoptar Biomphalaria");
  const bioSt = (await j.texts(".species-catalog .sc-status"))[0] ?? "";
  j.check("al adoptar los caracoles, vienen de camino con su tránsito real", /En camino: llega en [\d,]+ h de a bordo \(\d+:\d\d reales\)/.test(bioSt), bioSt);
  await j.tap(".species-catalog [data-back]", "‹ Catálogo");
  await j.tap('.species-catalog [data-area="habitat-acuatico"]', "Hábitat: Hábitat acuático");
  await j.tap('.species-catalog [data-group="peces"]', "Peces");
  const fish = await p.$$eval(".species-catalog .sc-card", (els) => els.map((e) => e.dataset.id));
  j.check("filtrado por el hábitat acuático, salen las medakas y el pez cebra (los del Aquatic Habitat), no la tilapia ni el pez ciego", fish.includes("medaka") && fish.includes("pez-cebra") && !fish.includes("tilapia") && !fish.includes("pez-ciego"), fish.join(", "));
  await j.tap('.species-catalog .sc-card[data-id="medaka"]', "ficha medaka");
  await j.tap(".species-catalog .sc-adopt", "Adoptar medaka");
  const medSt = (await j.texts(".species-catalog .sc-status"))[0] ?? "";
  j.check("las medakas también vienen de camino", /En camino/.test(medSt), medSt);
  await capture(j, "medaka-en-camino");
  await j.tap(".species-catalog [data-back]", "‹ Catálogo");
  await j.tap('.species-catalog [data-area=""]', "Cualquier hábitat");
  await j.tap('.species-catalog [data-group="mascotas"]', "Mascotas");
  const pets = Object.fromEntries(await p.$$eval(".species-catalog .sc-card", (els) => els.map((e) => [e.dataset.id, e.querySelector(".sc-badge")?.textContent ?? ""])));
  j.check("mascotas: el ratón (hábitat de roedores) está disponible; gatos y perros, «Pendiente» (no hay hábitat real para ellos)", pets.raton === "Disponible" && pets.gato === "Pendiente" && pets.chihuahua === "Pendiente", JSON.stringify(pets));
  await capture(j, "mascotas");
  await j.tap(".species-catalog [data-close]", "Cerrar el catálogo");

  // 5. They arrive and show up in the tank.
  await llegan(j);
  const arrived = await p.evaluate(() => {
    const i = window.codeship.interior;
    return { fish: i.aquarium.tank.fishCount, snails: i.aquarium.tank.snailCount, drawnFish: i.tank.fish.count, drawnSnails: i.tank.snails.count };
  });
  j.check("llegan 8 medakas y 4 caracoles al tanque, y se ven en 3D", arrived.fish === 8 && arrived.snails === 4 && arrived.drawnFish === 8 && arrived.drawnSnails === 4, JSON.stringify(arrived));

  // 6. Befriend them: feed the school, then the mind programs, from the task list and the tank.
  // The flight view's button, or the pinned one of the Starship's or the station's interior.
  await j.tap(".tasks-btn:visible, .sts-tasks:visible, .sti-tasks:visible", "Tareas");
  await p.waitForTimeout(400);
  await j.tap('.task-board .tb-task:has-text("Dar de comer a las medakas") .tb-go', "Ir: Dar de comer a las medakas");
  await j.waitDuel(120000);
  await capture(j, "llegaron");
  await solveAll(j, "dar de comer");
  for (const [id, what] of [
    ["acuario-amistad", "Hacer amistad con las medakas"],
    ["acuario-amistad-caracoles", "Hacer amistad con los caracoles"],
  ]) {
    await j.tap(".station-btn", "Acuario del anillo");
    await p.waitForTimeout(400);
    await j.tap(`.board [data-chore="${id}"]`, what);
    await j.waitDuel(30000);
    await solveAll(j, what);
  }
  const friends = await hudStatus(j);
  j.check("el estado dice «medakas amigas» y «caracoles amigos»", /medakas amigas/.test(friends) && /caracoles amigos/.test(friends), friends);
  await capture(j, "amigos");

  // 7. The catalogue from its terminal on the farm deck: they are aboard.
  await j.setup("camina hasta el terminal del catálogo (al lado del acuario)", () => {
    const i = window.codeship.interior;
    i.pos.set(-6.6, 0, 10.6);
    i.yaw = 0;
  });
  await p.waitForTimeout(600);
  const btn = (await j.texts(".station-btn"))[0] ?? "";
  j.check("junto al terminal sale «Catálogo de especies»", /^Catálogo de especies/.test(btn), btn);
  await j.tap(".station-btn", "Catálogo de especies (terminal)");
  await j.tap('.species-catalog [data-group="caracoles"]', "Caracoles");
  const badge = await p.locator('.species-catalog .sc-card[data-id="caracol"] .sc-badge').textContent();
  j.check("en el catálogo, los caracoles salen «A bordo · 4»", /A bordo · 4/.test(badge ?? ""), badge);
  await capture(j, "terminal");
  await j.tap(".species-catalog [data-close]", "Cerrar el catálogo");

  // 8. Two meals in a board day (Berón: «las comidas serán 2 al día»).
  const meals = await j.setup("pasa un día de a bordo en el anillo; cada vez que tiene hambre come media jornada (cocinar se juega en «cocina»)", () => {
    const c = window.codeship;
    const crew = c.habitat.crew;
    crew.eatKcal(crew.dailyKcal * Math.max(0, 0.75 - crew.satiety));
    let onsets = 0;
    let was = crew.hungry;
    for (let k = 0; k < 480; k++) {
      c.interior.update(1 / 60, 1 / 480);
      if (crew.hungry && !was) {
        onsets++;
        crew.eatKcal(crew.mealKcal);
      }
      was = crew.hungry;
    }
    return { onsets, mealKcal: Math.round(crew.mealKcal), dailyKcal: Math.round(crew.dailyKcal) };
  });
  j.check(`en un día de a bordo le entra hambre 2 veces y cada comida es media jornada (${meals.mealKcal} de ${meals.dailyKcal} kcal)`, meals.onsets === 2 && Math.abs(meals.mealKcal * 2 - meals.dailyKcal) <= 1, JSON.stringify(meals));
  const toast = (await j.texts(".interior-ui .toast"))[0] ?? "";
  j.check("el aviso dice «Doménica tiene hambre: hora de cocinar»", /tiene hambre/.test(toast) || (await p.evaluate(() => window.codeship.interior.notices?.log?.some?.((n) => /tiene hambre/.test(n.text)) ?? false)), toast);
}
