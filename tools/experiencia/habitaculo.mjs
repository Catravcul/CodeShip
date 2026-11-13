// The lander's crew cabin, the general settings at the yoga mat, the task list and the bridge's consoles
// (docs/design/habitaculo.md). Played at 390×844 (PX-06) and 1280×800 (PX-07); its captures go to
// docs/screenshots/habitaculo-<pantalla>-<movil|escritorio>.png.
import { mkdirSync } from "node:fs";

/** A capture in docs/screenshots, plus the journey's own, with the overlap check. */
async function capture(j, label, title) {
  await j.page.waitForTimeout(700);
  const file = `habitaculo-${label}-${j.opts.mobile === false ? "escritorio" : "movil"}.png`;
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/${file}` });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

export async function habitaculo(j) {
  const p = j.page;
  // The landing screen: the minimum of buttons, no «Nombres» nor «☰ Mandos».
  const cockpit = await j.texts("button");
  j.check("en la cabina no hay botón «Nombres» ni «Mandos»", !cockpit.some((t) => /^(Nombres|☰ ?Mandos)/.test(t)), cockpit.join(" / ").slice(0, 160));
  const eye = await p.locator(".flight-bar .cam-btn, .root-menu.flight-bar button[aria-label^='Cámara']").count();
  j.check("la cámara es un icono de ojo con nombre accesible («Cámara: …»)", eye >= 1);
  await capture(j, "cabina", "Cabina de pilotaje");

  // Up from the seat into the cabin, to the docking console: undock.
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await p.waitForTimeout(900);
  j.check("al levantarse, Doménica está en el habitáculo", await p.evaluate(() => window.codeship.cabin.active));
  await capture(j, "habitaculo", "Habitáculo del módulo");
  await j.useMachine("cabin", "acople", "desacoplar", "Desacoplar");
  await p.waitForTimeout(600);
  j.check("la consola de acople desacopla el módulo", await p.evaluate(() => !window.codeship.docking.docked));
  await capture(j, "acople", "Consola de acople");

  // The yoga mat: sit in lotus, the settings open; keyboard help on and off, kept in the browser.
  await j.useMachine("cabin", "esterilla", "ajustes", "Sentarse en loto: ajustes");
  await p.waitForTimeout(600);
  j.check("en la esterilla se abren los ajustes generales", await p.evaluate(() => document.body.classList.contains("in-settings")));
  await capture(j, "ajustes", "Ajustes generales en la esterilla");
  const before = await p.evaluate(() => document.body.classList.contains("kbd-help"));
  await j.tap('.settings-sheet [data-key="keyboardHelp"]', "Ayuda de teclado");
  const after = await p.evaluate(() => ({ on: document.body.classList.contains("kbd-help"), saved: JSON.parse(localStorage.getItem("codeship.ajustes") ?? "{}").keyboardHelp }));
  j.check("Ayuda de teclado cambia las pistas de teclas y se guarda", after.on !== before && after.saved === after.on, JSON.stringify(after));
  await j.tap('.settings-sheet [data-key="keyboardHelp"]', "Ayuda de teclado");
  await j.tap(".settings-sheet [data-close]", "Levantarse y cerrar los ajustes");
  j.check("al cerrar, se levanta de la esterilla", await p.evaluate(() => !document.body.classList.contains("in-settings")));

  // The task list: every task, grouped; «Ir» to a flight task takes her to the pilot seat.
  await j.setup("la fase de la sonda ya está hecha en Bennu (posar la sonda a mano lleva minutos)", () => {
    const ex = window.codeship.expedition;
    ex.rapport.of(ex.asteroid.data.id).succeed("sonda");
  });
  await j.tap(".room-ui:not(.hidden) .cab-tasks", "Tareas");
  await p.waitForTimeout(500);
  const groups = await j.texts(".task-board [data-group]");
  j.check("la lista de tareas está agrupada (Vuelo, Nave, Estación…)", groups.length >= 3, groups.join(", "));
  await capture(j, "tareas", "Lista de tareas");
  const flightTask = '.task-board .tb-task:has-text("Aterriza el módulo") .tb-go';
  if (await p.locator(flightTask).count()) {
    await j.tap(flightTask, "Ir: Aterriza el módulo");
    await p.waitForTimeout(900);
    const seated = await p.evaluate(() => !window.codeship.cabin.active && document.body.classList.contains("in-cockpit"));
    j.check("«Ir» a una tarea de vuelo la sienta en el asiento del piloto", seated);
  } else j.check("la lista ofrece «Aterriza el módulo» tras la fase de la sonda", false);

  // The bridge: one console per page; each opens only its own.
  await j.setup("vuelve a acoplar en la nodriza y sube al puente por la espina", () => {
    const c = window.codeship;
    c.docking.dockNow(c.mothership);
    c.bridge.enter("salida");
  });
  await capture(j, "puente", "Puente: sala de consolas");
  await j.useMachine("bridge", "prop", "abrir", "Usar la consola: Propulsión");
  await p.waitForTimeout(800);
  const shown = await p.$$eval(".fd .fd-panel", (els) => els.filter((e) => getComputedStyle(e).display !== "none").length);
  j.check("la consola de propulsión abre solo su página", shown === 1, `${shown} páginas a la vista`);
  await capture(j, "consola-prop", "Consola de propulsión");
  await j.tap(".fd-panel.max .fd-back", "Volver al puente");
  j.check("«Volver» deja a Doménica en el puente, junto a la consola", await p.evaluate(() => window.codeship.bridge.active && window.codeship.bridge.near() === "prop"));
  await j.useMachine("bridge", "mente", null);
  const card = (await j.texts(".room-ui:not(.hidden) .cab-machine"))[0] ?? "";
  j.check("la consola de la mente (puente) muestra fase y confianza, aparte del mando de la sonda", /fase/i.test(card) && /confianza/i.test(card), card.slice(0, 140));
  await capture(j, "mente", "Consola de la mente del asteroide (puente)");
}
