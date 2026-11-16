// The space station as a player meets it (docs/design/estacion-real.md, estacion-tripulacion.md): the ISS's
// US segment. In through the lander's hatch on Harmony's zenith IDA in first person, a door that names where
// it leads (Destiny), the galley in Unity cooking from the station's larder, a cabin in Harmony, the yoga
// mat's settings, «Ir» of a station task, and the Cupola: Canadarm2 berths the lander on Unity's nadir CBM
// (seen from outside), its full task list, the lander's hatch says why it is shut, and the arm puts it back.
// iPhone 13; captures in docs/screenshots/estacion-<pantalla>-movil.png.
import { mkdirSync } from "node:fs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(900);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/estacion-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

const card = (j) => j.page.evaluate(() => document.querySelector(".sti-card:not(.hidden)")?.innerText.replace(/\s+/g, " ") ?? "");
/** Teleport to a thing's grab point (crossing the station hop by hop takes minutes with SwiftShader). */
const placeAt = (j, id) => j.setup(`Doménica va hasta «${id}»`, (f) => window.codeship.stationInside.placeAt(f), id);

export async function estacion(j) {
  const p = j.page;
  await j.setup("acopla el módulo en su puerto de la estación", () => {
    const c = window.codeship;
    c.docking.undock();
    c.docking.dockNow(c.structure.portFor("sonda"));
  });
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-estacion", "Entrar en la estación");
  await p.waitForTimeout(900);
  j.check("por la escotilla entra en la estación", await p.evaluate(() => window.codeship.stationInside.active));
  const view = await p.getAttribute(".sti-ui .sti-view", "aria-label");
  j.check("la vista por defecto es en primera persona", /1ª/.test(view ?? ""), view);
  const old = await j.texts(".sti-ui button");
  j.check("sin los botones viejos «Tareas», «Vista 3ª» y «Salir» escritos: iconos de raíz", !old.some((t) => /^(Tareas|Vista 3ª|Vista 1ª|Salir)$/.test(t)) && (await p.locator(".sti-ui .root-menu").count()) === 1, old.join(" / "));
  j.check("entra en Harmony (Nodo 2), por su IDA de cenit", (await p.evaluate(() => window.codeship.stationInside.where())) === "nodo-2", await p.evaluate(() => window.codeship.stationInside.where()));
  await capture(j, "entrada", "Entrada a Harmony");

  // A door: it names where it leads; «Entrar en…» takes her through.
  await placeAt(j, "puerta-escotilla-destiny-nodo2-nodo-2");
  const door = await card(j);
  j.check("la puerta dice adónde lleva, con icono y «Entrar en Destiny», nunca «?»", /Escotilla · Destiny/.test(door) && /Entrar en Destiny/.test(door) && !/\?/.test(door) && (await p.locator(".sti-card .sti-icon svg").count()) === 1, door.slice(0, 120));
  await capture(j, "puerta", "Puerta a Destiny");
  await j.tap('.sti-card [data-act="entrar"]', "Entrar en Destiny");
  const through = await p.waitForFunction(() => window.codeship.stationInside.where() === "destiny", null, { timeout: 90000 }).then(() => true, () => false);
  j.check("«Entrar en…» la lleva al otro lado de la escotilla", through, await p.evaluate(() => window.codeship.stationInside.where()));

  // The galley: a dish from the station's larder, in the shared challenge sheet.
  await placeAt(j, "cocina");
  const galley = await card(j);
  j.check("la cocina de la estación, en Unity como en la ISS, ofrece platos de su despensa", /Cocinar /.test(galley) && (await p.evaluate(() => window.codeship.stationInside.where())) === "nodo-1", galley.slice(0, 140));
  await capture(j, "cocina", "Cocina de la estación");
  const before = await p.evaluate(() => JSON.stringify(window.codeship.stationCrew.larder()));
  await j.tap('.sti-card [data-act^="chore:cocinar"]', "Cocinar un plato");
  await j.waitDuel();
  for (let i = 0; i < 12 && (await p.evaluate(() => !!window.codeship.stationLife.session?.run.current)); i++) await j.answer(() => window.codeship.stationLife.session?.run.current);
  // The result locks its buttons for 0,9 s (duel-view.ts) so a late tap does not close it unseen.
  await p.waitForTimeout(1000);
  await j.tap(".duel button.end", "Continuar");
  const after = await p.evaluate(() => JSON.stringify(window.codeship.stationCrew.larder()));
  j.check("cocinar gasta la despensa de la estación (no la de la nodriza)", before !== after, `${before} → ${after}`);

  // A cabin: sleep calms her.
  await placeAt(j, "camarotes");
  const stress = await p.evaluate(() => window.codeship.habitat.crew.stress);
  await j.tap('.sti-card [data-act="dormir"]', "Dormir en un camarote");
  j.check("dormir en un camarote la calma", await p.evaluate((s) => window.codeship.habitat.crew.stress <= s, stress));
  await capture(j, "camarotes", "Camarotes de la estación");

  // The yoga mat: the settings.
  await placeAt(j, "esterilla");
  await j.tap('.sti-card [data-act="ajustes"]', "Sentarse en loto: ajustes");
  j.check("en la esterilla de la estación se abren los ajustes", await p.evaluate(() => document.body.classList.contains("in-settings")));
  await capture(j, "ajustes", "Ajustes en la esterilla de la estación");
  await j.tap(".settings-sheet [data-close]", "Levantarse y cerrar los ajustes");

  // «Ir» of a station task from the global list: she hops to the mat and the yoga starts.
  await placeAt(j, "ejercicio");
  await j.tap(".sti-ui .sti-tasks", "Tareas");
  const stationTask = '.task-board [data-go^="est-yoga"]';
  j.check("la lista global incluye las tareas de la estación (yoga en su esterilla)", (await p.locator(stationTask).count()) > 0);
  await capture(j, "tareas", "Lista de tareas en la estación");
  await j.tap(stationTask, "Ir: yoga en la estación");
  const yoga = await p.waitForFunction(() => !!window.codeship.stationLife.session, null, { timeout: 120000 }).then(() => true, () => false);
  j.check("«Ir» la lleva a la esterilla de la estación y empieza el yoga", yoga, await p.evaluate(() => window.codeship.stationInside.nearFixture()));
  if (yoga) await j.tap('.duel [data-act="close"]', "Cerrar el reto");

  // The Cupola: Canadarm2 berths the lander on Unity's nadir CBM, and it is seen from outside.
  await placeAt(j, "cupula");
  const cupola = await card(j);
  j.check("en la Cupola, el puesto del brazo ofrece atracar el módulo en el CBM", /Atracar el módulo en el CBM/.test(cupola), cupola.slice(0, 160));
  await j.tap('.sti-card [data-act="atracar"]', "Atracar el módulo en el CBM con el brazo");
  j.check("Canadarm2 atraca el módulo en el CBM de Unity", await p.evaluate(() => window.codeship.landerBerth.onCbm));
  j.check("se ve desde fuera: la vista de la Cupola se abre con el brazo moviéndose", await p.evaluate(() => window.codeship.stationOutside.viewing && window.codeship.stationOutside.busy));
  await p.waitForTimeout(3500);
  await capture(j, "brazo", "Canadarm2 lleva el módulo al CBM");
  const done = await p.waitForFunction(() => !window.codeship.stationOutside.busy, null, { timeout: 60000 }).then(() => true, () => false);
  j.check("el brazo termina y el módulo queda dibujado en el CBM", done && (await p.evaluate(() => window.codeship.stationOutside.holdsLander)));
  await capture(j, "cbm", "Módulo atracado en el CBM de Unity");
  await j.tap(".dock-view.on .dv-close", "Cerrar la vista de fuera");
  await placeAt(j, "cupula");
  await j.tap('.sti-card [data-act="tareas"]', "Tareas (Cupola)");
  const shown = await p.locator(".task-board .tb-go").count();
  const all = await p.evaluate(() => window.codeship.tasks().length);
  j.check("el puesto de la Cupola abre la lista global con «Ir», con todas las tareas", shown === all && shown > 0, `${shown} de ${all}`);
  await j.tap(".task-board [data-close]", "Cerrar tareas");
  await placeAt(j, "salir-sonda");
  const hatch = await card(j);
  j.check("con el módulo en el CBM, su escotilla dice por qué está cerrada y qué la abre", /Cerrada: el módulo está atracado en el CBM/.test(hatch) && /Cupola/.test(hatch), hatch.slice(0, 160));
  await capture(j, "escotilla-cerrada", "Escotilla del módulo cerrada");
  await placeAt(j, "cupula");
  await j.tap('.sti-card [data-act="desatracar"]', "Devolver el módulo a su IDA");
  j.check("el brazo devuelve el módulo a su IDA", await p.evaluate(() => !window.codeship.landerBerth.onCbm));
  await j.tap(".dock-view.on .dv-close", "Cerrar la vista de fuera");
}
