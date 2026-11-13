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
  await j.page.screenshot({ path: `${j.dir}/${file}.png` });
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
  await j.tap(".mode-btn", "Entrar en la nave de viaje");
  await audit(j, "ingravidez", "Interior en ingravidez (escotilla de la espina)");
  await j.setup("la llevamos al anillo", () => {
    const z = window.codeship.interior.zones;
    z.zone = "anillo";
    z.autoDown = false;
  });
  await audit(j, "anillo", "Interior en el anillo");
  await j.tap(".tasks-btn", "Tareas");
  await audit(j, "tareas", "Tablero de tareas");
  await j.tap(".board [data-close]", "✕");
  await p.evaluate(() => window.codeship.interior.openNavConsole());
  await p.waitForTimeout(1200);
  await audit(j, "mapa", "Puente de mando con el mapa");
  await p.evaluate(() => window.codeship.deck.restore());
  await p.waitForTimeout(400);
  await audit(j, "puente", "Puente de mando");
  if ((await j.texts(".fd-probe")).length) {
    await j.tap(".fd-probe", "Sonda");
    await audit(j, "sonda", "Consola de la sonda");
    await p.keyboard.press("Escape");
    await p.evaluate(() => window.codeship.probe && document.querySelector(".probe-ui .pm-exit, .probe-ui [data-exit]")?.click());
  }
  await p.reload();
  await p.waitForFunction(() => window.codeship, null, { timeout: 120000 });
  await p.waitForTimeout(1500);

  // Free flight, then landed on Bennu: the crowded state.
  await j.setup("desacopla el módulo", () => window.codeship.docking.undock());
  await audit(j, "cabina-libre", "Cabina en vuelo libre");
  await j.setup("posa el módulo sobre Bennu (aterrizar a mano lleva minutos)", landOnBennu);
  await p.waitForFunction(() => window.codeship.expedition.phase === "landed", null, { timeout: 180000 });
  await audit(j, "aterrizado", "Módulo posado en Bennu");
  if ((await j.texts(".eva-btn")).length) {
    await j.tap(".eva-btn", "Salir al exterior");
    await p.waitForTimeout(2500);
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
  await j.tap(".mode-btn", "Entrar en la estación");
  await p.waitForTimeout(800);
  await audit(j, "estacion-interior", "Interior de la estación");
  await j.tap(".sti-tasks", "Tareas de la estación");
  await p.waitForTimeout(600);
  const tabs = await p.$$eval(".st-tabs [data-tab]", (els) => els.map((e) => e.dataset.tab));
  j.check("la pantalla de la estación tiene sus pestañas", tabs.length >= 5, tabs.join(", "));
  for (const t of tabs) {
    await j.tap(`.st-tabs [data-tab="${t}"]`, `pestaña ${t}`);
    await audit(j, `estacion-${t}`, `Estación, pestaña ${t}`);
  }
}
