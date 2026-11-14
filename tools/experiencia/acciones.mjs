// Audit of the action buttons on every screen (docs/design/ux-acciones.md): visits each screen the way
// a player gets there, captures it and lists the controls that overlap. Run at 390×844 and 1280×800.

const SCREENS = [];
const screen = (id, title) => SCREENS.push({ id, title });

/** Saves a capture named ux-<prefix>-<screen>-<viewport>.png and checks that no buttons overlap. */
async function audit(j, id, title) {
  await j.page.waitForTimeout(900);
  const over = await j.overlaps();
  const buttons = await j.texts("button");
  const file = `ux-${j.opts.prefix}-${id}-${j.opts.mobile ? "movil" : "escritorio"}`;
  // Other browsers on the same machine can slow SwiftShader down: a capture may take longer than 30 s.
  await j.page.screenshot({ path: `${j.dir}/${file}.png`, timeout: 120000 });
  j.shots.push(`${file}.png`);
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
  j.audit = j.audit ?? [];
  j.audit.push({ id, title, buttons: buttons.length, overlaps: over });
  screen(id, title);
}

const landOnBennu = () => {
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
};

export async function acciones(j) {
  const p = j.page;
  await audit(j, "cabina-acoplada", "Cabina del módulo, acoplado a la nodriza");

  // Interior: 0 g at the spine hatch, then the ring.
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la nave de viaje");
  await audit(j, "ingravidez", "Interior en ingravidez (escotilla de la espina)");
  await j.setup("la llevamos al anillo", () => {
    const z = window.codeship.interior.zones;
    z.zone = "anillo";
    z.autoDown = false;
  });
  await audit(j, "anillo", "Interior en el anillo");
  await j.tap(".tasks-btn", "Tareas");
  await audit(j, "tareas", "Tablero de tareas");
  await j.tap(".task-board [data-close]", "Cerrar tareas");
  // The bridge: a room of consoles, each opening only its own page (docs/design/habitaculo.md §Puente).
  await j.setup("la llevamos a la escotilla del puente (en la espina)", () => {
    const c = window.codeship;
    c.interior.exit();
    c.bridge.enter("salida");
  });
  await audit(j, "puente", "Puente de mando: sala de consolas");
  await j.useMachine("bridge", "nav", "abrir", "Usar la consola: Mesa de navegación");
  await p.waitForTimeout(1200);
  await audit(j, "mapa", "Consola de navegación con el mapa");
  await j.tap(".fd-panel.max .fd-back", "Volver al puente");
  await j.useMachine("bridge", "sonda", "abrir", "Tomar el mando de la sonda");
  await p.waitForTimeout(800);
  await audit(j, "sonda", "Consola de la sonda");
  await j.tap(".pr-exit", "Volver al puente");
  await j.useMachine("bridge", "mente", null);
  const why = (await j.texts(".room-ui:not(.hidden) .cab-machine"))[0] ?? "";
  j.check("la consola de la mente del puente dice qué falta para entrar por la sonda", /sonda/i.test(why), why.slice(0, 120));
  await audit(j, "mente-puente", "Consola de la mente del asteroide (puente)");
  await p.reload();
  await p.waitForFunction(() => window.codeship, null, { timeout: 120000 });
  await p.waitForTimeout(1500);

  // Free flight, then landed on Bennu: the crowded state.
  await j.setup("desacopla el módulo", () => window.codeship.docking.undock());
  await audit(j, "cabina-libre", "Cabina en vuelo libre");
  // An angry asteroid (docs/design/poderes-ira.md): its card, the level chip and a radio line at once.
  await j.setup("Bennu enfadado y una línea de radio de los niveles", () => {
    const c = window.codeship;
    c.wrathMode.wrath.setAnger(c.region.target.data.id, 0.7);
    c.levels.radio("<b>101955 Bennu</b> se pone en marcha hacia la estación: llega en 3 h");
  });
  await audit(j, "cabina-ira", "Cabina con un asteroide enfadado y radio");
  await j.setup("posa el módulo sobre Bennu (aterrizar a mano lleva minutos)", landOnBennu);
  await p.waitForFunction(() => window.codeship.expedition.phase === "landed", null, { timeout: 180000 });
  await audit(j, "aterrizado", "Módulo posado en Bennu");
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await audit(j, "habitaculo", "Habitáculo del módulo, posado");
  {
    await j.useMachine("cabin", "escotilla", "salir-eva", "Ponerse el traje y salir");
    await j.waitDuel(30000);
    await audit(j, "eva-traje", "Ponerse el traje (reto)");
    for (let n = 0; n < 8 && (await p.evaluate(() => window.codeship.eva.phase)) === "preparando"; n++) await j.answer(() => window.codeship.eva._run?.current ?? null);
    // Won, she steps out on her own after 0.6 s: the card closes itself (eva-mode.ts).
    await p.waitForFunction(() => document.body.classList.contains("in-eva"), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await audit(j, "eva", "Paseo espacial");
  }
  await p.reload();
  await p.waitForFunction(() => window.codeship, null, { timeout: 120000 });
  await p.waitForTimeout(1500);

  // Station: dock the lander at its port, go in, open the tabs.
  await j.setup("acopla el módulo en su puerto de la estación", () => {
    const c = window.codeship;
    c.docking.undock();
    c.docking.dockNow(c.structure.portFor("sonda"));
  });
  await audit(j, "estacion-acoplado", "Cabina acoplada a la estación");
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-estacion", "Entrar en la estación");
  await p.waitForTimeout(800);
  await audit(j, "estacion-interior", "Interior de la estación");
  await j.tap(".sti-ui .sti-tasks", "Tareas de la estación");
  await p.waitForTimeout(600);
  j.check("en la estación, Tareas abre la lista global con «Ir»", (await p.locator(".task-board:not(.hidden) .tb-go").count()) > 0);
  await audit(j, "estacion-tareas", "Lista de tareas en la estación");
  await j.tap(".task-board [data-close]", "Cerrar tareas");
  // The screen's tabs: from a machine's card (the refinery opens Materiales).
  await j.setup("Doménica va hasta la refinería", () => window.codeship.stationInside.placeAt("refineria"));
  await j.tap('.sti-card [data-act="abrir"]', "Abrir (refinería)");
  await p.waitForTimeout(600);
  const tabs = await p.$$eval(".st-tabs [data-tab]", (els) => els.map((e) => e.dataset.tab));
  j.check("la pantalla de la estación tiene sus pestañas", tabs.length >= 5, tabs.join(", "));
  for (const t of tabs) {
    await j.tap(`.st-tabs [data-tab="${t}"]`, `pestaña ${t}`);
    await audit(j, `estacion-${t}`, `Estación, pestaña ${t}`);
  }
}
