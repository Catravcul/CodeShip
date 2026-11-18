// PX-35. Real compartments (docs/design/compartimentos.md): every compartment of the ISS's US segment is a room
// she floats into, and the doors only give passage. On an iPhone 13 with taps: «Ir» to «Dormir en tu camarote»
// takes her hop by hop through Harmony into her own crew quarter, where going to sleep is a challenge whose steps
// play in the quarter (fan, alarm, into the bag, zip, light, asleep); its folding door shuts while she sleeps and
// folds open when she wakes; the free quarters say whose they are; the
// Cupola's robotic workstation holds the arm, the outside cameras and the catalogue; Unity's laptop opens the ship
// bay and the imports (each window from its own console: the screen has no tab bar); Kibo's airlock is a hatch
// that opens no menu and its JEMRMS console has the inventory; and in the Starship, her crew quarter on deck 2,
// with the same challenge and door. Captures in docs/screenshots/compartimentos-<pantalla>-movil.png.
import { mkdirSync } from "node:fs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(900);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/compartimentos-${label}-movil.png`, timeout: 120000 });
  await j.shot(`compartimentos-${label}`);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

const card = async (j) => {
  await j.showPanel(".cab-machine");
  return j.page.evaluate(() => document.querySelector(".sti-card:not(.hidden), .sts-card:not(.hidden)")?.innerText.replace(/\s+/g, " ") ?? "");
};
const where = (j) => j.page.evaluate(() => window.codeship.stationInside.where());
/** Plays the open sleep challenge with the right answers, a capture per step, and closes the sheet. */
async function playSleep(j, label) {
  const p = j.page;
  for (let i = 0; i < 12 && (await p.evaluate(() => !!(window.codeship.stationLife.session ?? window.codeship.starship?.session)?.run.current)); i++) {
    await j.answer(() => (window.codeship.stationLife.session ?? window.codeship.starship?.session)?.run.current);
    await p.waitForTimeout(1600);
    if (label) await capture(j, `${label}-${String(i + 1).padStart(2, "0")}`, `Dormir, paso ${i + 1}`);
  }
  await p.waitForTimeout(1000);
  const res = (await j.texts(".duel .result"))[0] ?? "";
  await j.tap(".duel button.end", "Continuar");
  return res;
}

/** While she sleeps her quarter's folding door shuts, and it folds open when she wakes (docs/design/compartimentos.md). */
async function doorWhileAsleep(j, mode, label, where) {
  const p = j.page;
  const shut = await p.waitForFunction((m) => { const s = m === "starship" ? window.codeship.starship.mode : window.codeship.stationInside; return s.asleep && s.doorAmount("camarote-1") >= 1; }, mode, { timeout: 10000 }).then(() => true, () => false);
  j.check(`${where}: mientras duerme, la puerta plegable de su camarote se cierra`, shut);
  await capture(j, label, `${where}: duerme con la puerta cerrada`);
  const woke = await p.waitForFunction((m) => { const s = m === "starship" ? window.codeship.starship.mode : window.codeship.stationInside; return !s.asleep && s.doorAmount("camarote-1") === 0; }, mode, { timeout: 30000 }).then(() => true, () => false);
  j.check(`${where}: al despertar, la puerta se abre otra vez`, woke);
  await capture(j, `${label}-despierta`, `${where}: despierta, la puerta abierta`);
}

const buttons = (j) => j.page.locator(".sti-card:not(.hidden) [data-act]:not([disabled])").count();
/** Teleport to a thing's grab point (crossing the station hop by hop takes minutes with SwiftShader). */
async function placeAt(j, id) {
  await j.setup(`Doménica va hasta «${id}»`, (f) => window.codeship.stationInside.placeAt(f), id);
  await j.page.waitForFunction((f) => window.codeship.stationInside.nearFixture() === f, id, { timeout: 15000 }).catch(() => undefined);
  await j.page.waitForTimeout(600);
}

export async function compartimentos(j) {
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
  await p.evaluate(() => localStorage.setItem("codeship.retos-ordenar", "pasos"));

  // «Ir» to sleep: she hops from the hatch to her crew quarter and the challenge opens there.
  await j.tap(".sti-ui .sti-tasks", "Tareas");
  const sleepTask = '.task-board [data-go="est-dormir"]';
  j.check("la lista de tareas tiene «Dormir en tu camarote» con «Ir»", (await p.locator(sleepTask).count()) === 1);
  await j.tap(sleepTask, "Ir: dormir en tu camarote");
  const arrived = await p.waitForFunction(() => !!window.codeship.stationLife.session, null, { timeout: 180000 }).then(() => true, () => false);
  j.check("salto a salto llega a su camarote (dentro, no a una puerta) y el reto empieza allí", arrived && (await where(j)) === "camarote-1", `${await where(j)} · ${await p.evaluate(() => window.codeship.stationInside.nearFixture())}`);
  if (arrived) {
    await j.waitDuel();
    const stress = await p.evaluate(() => window.codeship.habitat.crew.stress);
    j.check("los pasos se representan en el camarote", await p.evaluate(() => window.codeship.stationInside.steps.framing));
    const res = await playSleep(j, "dormir");
    j.check("el reto de dormir termina bien", /Conseguido|Bien hecho|Hecho/.test(res), res);
    j.check("dormir la calma", await p.evaluate((s) => window.codeship.habitat.crew.stress <= s, stress));
    await doorWhileAsleep(j, "estacion", "dormida", "En Harmony");
  }

  // The free quarters: rooms too, each with its bag, laptop and light; they say whose they are.
  await placeAt(j, "saco-3");
  j.check("el camarote del techo es un cuarto en el que está dentro", (await where(j)) === "camarote-3", await where(j));
  j.check("un camarote libre dice que el suyo es el 1", /el tuyo es el 1/.test(await card(j)), (await card(j)).slice(0, 140));
  await capture(j, "camarote-libre", "Camarote libre del techo");

  // The Cupola's robotic workstation: arm, cameras, catalogue and assembly, the Bishop's release.
  await placeAt(j, "cupula");
  const rws = await card(j);
  j.check("dentro de la Cupola, el puesto robótico tiene el brazo, las cámaras y el catálogo", (await where(j)) === "cupola" && /Cámaras de fuera/.test(rws) && /Catálogo y montaje/.test(rws), rws.slice(0, 200));
  await capture(j, "cupola", "Puesto robótico de la Cupola");
  await j.tap('.sti-card [data-act="inventario"]', "Catálogo y montaje");
  await p.waitForTimeout(600);
  j.check("el puesto robótico abre el catálogo de vehículos y su montaje (Hangar)", (await p.locator("[data-catalogue]").count()) === 1);
  await capture(j, "catalogo-rws", "Catálogo desde el puesto robótico");
  await j.tap(".st-back", "Volver a la estación");
  await p.waitForTimeout(600);

  // Unity: the bay opens from its laptop; the nadir CBM beside it is a hatch.
  await placeAt(j, "consola-bahia");
  j.check("el portátil de la bahía está en Unity", (await where(j)) === "nodo-1");
  await j.tap('.sti-card [data-act="bahia"]', "Abrir la bahía de la nave");
  await p.waitForTimeout(800);
  j.check("el portátil abre la bahía de las naves", await p.evaluate(() => window.codeship.bay.active));
  await capture(j, "bahia", "La bahía desde el portátil de Unity");
  await j.tap(".bay-ui .bay-back", "Volver a la estación");
  await p.waitForTimeout(600);
  await placeAt(j, "consola-bahia");
  await j.tap('.sti-card [data-act="abrir:importar"]', "Abrir Importar (portátil de carga de Unity)");
  await p.waitForTimeout(600);
  j.check("el mismo portátil abre la ventana Importar, sin barra de pestañas", (await p.locator(".st-tabs").count()) === 0 && /Importar/.test((await j.texts(".st-title"))[0] ?? ""), (await j.texts(".st-title"))[0]);
  await capture(j, "importar", "Importar desde el portátil de carga de Unity");
  await j.tap(".st-back", "Volver a la estación");
  await p.waitForTimeout(600);
  await placeAt(j, "cbm-nadir-nodo1");
  j.check("el CBM de nadir de Unity es una escotilla: no abre ningún menú", (await buttons(j)) === 0, (await card(j)).slice(0, 140));

  // Kibo: the airlock is a hatch (cargo only); the inventory is at the JEMRMS console.
  await placeAt(j, "esclusa-kibo");
  j.check("la esclusa de Kibo no abre ningún menú", (await buttons(j)) === 0, (await card(j)).slice(0, 140));
  await placeAt(j, "consola-jemrms");
  j.check("la consola del JEMRMS abre el Hangar", /Abrir Hangar/.test(await card(j)), (await card(j)).slice(0, 140));
  await capture(j, "jemrms", "Consola del JEMRMS en Kibo");

  // No door in the station opens anything but a way through.
  const doors = await p.evaluate(() => {
    const s = window.codeship.stationInside;
    return s.interior.plan.fixtures.filter((f) => f.action.kind === "puerta" || f.action.kind === "salir" || /escotilla|esclusa-kibo|cbm|pma|puerto/.test(f.id)).map((f) => `${f.id}:${f.action.kind}`);
  });
  // Quest's EVA hatch is the way out to the handrails (docs/design/paseo-espacial.md): its action is the airlock's.
  const bad = doors.filter((d) => !/:(puerta|salir|info)$/.test(d) && d !== "escotilla-eva:esclusa");
  j.check("todas las puertas y escotillas solo dan paso (o dicen por qué están cerradas)", bad.length === 0 && doors.length > 10, bad.join(", ") || `${doors.length} puertas`);

  // The Starship: her crew quarter on deck 2 is a room too (our layout: SpaceX has not published one).
  await j.setup("pasa a la Starship por su túnel de proa", () => {
    const c = window.codeship;
    c.stationInside.suspend();
    c.starship.enterFromStation();
    c.starship.mode.placeAt("saco-1");
  });
  await p.waitForTimeout(1500);
  const deck = await p.evaluate(() => window.codeship.starship.mode.where());
  j.check("en la Starship, su camarote de la cubierta 2 es un cuarto en el que está dentro", deck === "camarote-1", deck);
  j.check("y ofrece el mismo reto de dormir", /Dormir en tu camarote/.test(await card(j)), (await card(j)).slice(0, 140));
  await capture(j, "starship-camarote", "Su camarote en la Starship");
  if (await j.tap('.sts-card [data-act="chore:dormir"], .sti-card [data-act="chore:dormir"]', "Dormir en tu camarote (Starship)")) {
    await j.waitDuel();
    const res = await playSleep(j);
    j.check("en la Starship, el reto de dormir termina bien", /Conseguido|Bien hecho|Hecho/.test(res), res);
    await doorWhileAsleep(j, "starship", "starship-dormida", "En la Starship");
  }
}
