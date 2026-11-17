// Components by tier, imported from Earth (docs/design/componentes.md §7, importacion.md §5), as a player
// meets them on an iPhone 13: in the station's Hangar tab each real component shows its tier, source,
// mass, cost and trip; what the LM carries is «de serie»; a better engine is imported (its order chain),
// lands in the hangar after the real transfer and is fitted in the bay with the part-change chain; then
// what Juventas lacks is imported whole and it can be put together in the Bishop. Captures in
// docs/screenshots/componentes-<pantalla>-movil.png.
import { mkdirSync } from "node:fs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(700);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/componentes-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

/** Plays the open chain with the right answers and closes the sheet. */
async function solveChain(j, oracle) {
  const p = j.page;
  for (let n = 0; n < 8 && (await p.evaluate(oracle)); n++) {
    await j.answer(oracle, true);
    await p.waitForTimeout(900);
  }
  await p.waitForTimeout(800);
  if (await p.locator(".duel:not(.hidden) button.end").count()) await j.tap(".duel:not(.hidden) button.end", "Continuar");
  await p.waitForFunction(() => [...document.querySelectorAll(".duel")].every((e) => e.classList.contains("hidden")), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(500);
}

const stationOracle = () => window.codeship.station.session?.run.current ?? null;

export async function componentes(j) {
  const p = j.page;
  await j.setup("acopla el módulo en su puerto de la estación", () => {
    const c = window.codeship;
    c.docking.undock();
    c.docking.dockNow(c.structure.portFor("sonda"));
  });
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-estacion", "Entrar en la estación");
  await p.waitForTimeout(800);
  await j.setup("Doménica va hasta la refinería", () => window.codeship.stationInside.placeAt("refineria"));
  await p.waitForFunction(() => window.codeship.stationInside.nearFixture() === "refineria", null, { timeout: 15000 }).catch(() => undefined);
  await j.tap('.sti-card [data-act="abrir"]', "Abrir (refinería)");
  await p.waitForTimeout(600);
  await j.tap('.st-tabs [data-tab="planos"]', "Pestaña Planos");
  await p.waitForTimeout(400);
  const plans = await p.evaluate(() => document.querySelector(".st-body")?.textContent ?? "");
  j.check("Planos ya no fabrica motores: dice que se importan y ofrece la pieza pequeña impresa", /se importan/.test(plans) && /Pieza pequeña de metal impresa/.test(plans) && !/HiPAT/.test(plans), plans.slice(0, 200));

  await j.tap('.st-tabs [data-tab="hangar"]', "Pestaña Hangar");
  await p.waitForTimeout(400);
  await j.tap("[data-components]", "Ver los componentes");
  await p.waitForTimeout(500);
  const cats = await p.locator(".st-comp-cat").count();
  j.check("los componentes salen por categorías (motores, RCS, tanques, cabinas, energía, baterías, escudos, soporte vital, aviónica, acople)", cats >= 12, `${cats}`);
  const dps = await p.locator('[data-comp="lm-dps"]').innerText();
  j.check("el motor de descenso del LM es de serie y del nivel 1", /De serie en el módulo lunar/.test(dps) && /Nivel 1/.test(dps), dps.slice(0, 160));
  const r4d = p.locator('[data-comp="aerojet-r-4d"]');
  await r4d.scrollIntoViewIfNeeded();
  const r4dText = await r4d.innerText();
  j.check("el R-4D-11 dice su nivel, su Isp, su masa, el vehículo de carga, el precio y el viaje", /Nivel 2/.test(r4dText) && /Isp 315 s/.test(r4dText) && /Dragon de carga/.test(r4dText) && /créditos/.test(r4dText) && /días/.test(r4dText) && (await r4d.locator("a").count()) > 0, r4dText.replace(/\s+/g, " ").slice(0, 240));
  const hipat = await p.locator('[data-supply-import="aerojet-r-4d-15-hipat"]').innerText();
  j.check("el HiPAT (nivel 3) está bloqueado hasta tener uno del nivel 2", /Primero el nivel 2/.test(hipat) && (await p.locator('[data-supply-import="aerojet-r-4d-15-hipat"]').isDisabled()), hipat);
  await capture(j, "lista", "Componentes por nivel");

  await j.tap('[data-supply-import="aerojet-r-4d"]', "Importar el R-4D-11");
  await j.waitDuel();
  await capture(j, "reto", "Reto del pedido");
  await solveChain(j, stationOracle);
  const coming = await p.evaluate(() => window.codeship.componentImports.inTransit("aerojet-r-4d"));
  j.check("pagado: el R-4D-11 está en camino", coming === 1, `${coming}`);
  await capture(j, "en-camino", "En camino");

  await j.setup("pasa el viaje de Hohmann en el reloj de la estación (unas 25 h de estación)", () => {
    const c = window.codeship;
    c.importOps.tick(60);
    c.componentImports.tick();
  });
  await j.tap('.st-tabs [data-tab="hangar"]', "Pestaña Hangar");
  await p.waitForTimeout(600);
  const landed = p.locator('[data-comp="aerojet-r-4d"]');
  await landed.scrollIntoViewIfNeeded();
  j.check("el R-4D-11 llega al hangar", /1 en el hangar/.test(await landed.innerText()));
  const hipat2 = await p.locator('[data-comp="aerojet-r-4d-15-hipat"]').innerText();
  j.check("con un motor del nivel 2, el HiPAT se desbloquea", /Desbloqueado/.test(hipat2), hipat2.replace(/\s+/g, " ").slice(0, 200));
  await capture(j, "llegada", "Llega al hangar");

  // Fitting it reuses the bay's part-change chain.
  await j.tap('[data-comp="aerojet-r-4d"] [data-bay]', "Cambiar en la bahía");
  await p.waitForTimeout(900);
  await j.tap('.bay-ui [data-part="motor"]', "Motor principal del módulo");
  await p.waitForTimeout(500);
  const act = p.locator(".bay-ui .bay-act:not(.locked)", { hasText: "R-4D-11" });
  j.check("la bahía ofrece montar el R-4D-11 que llegó", (await act.count()) > 0);
  if (await act.count()) {
    await j.tapAt(act.first());
    await j.waitDuel();
    await solveChain(j, () => window.codeship.bay.session?.run.current ?? null);
  }
  const fitted = await p.evaluate(() => window.codeship.ship.design.mainEngines[0]?.model.id);
  j.check("el módulo lunar lleva ahora el R-4D-11 y el motor de descenso vuelve al hangar", fitted === "aerojet-r-4d", fitted);
  await capture(j, "bahia", "Pieza montada en la bahía");

  // A whole vehicle: what Juventas lacks, in one shipment, then put together in the Bishop.
  await j.tap(".bay-ui .bay-back", "Volver a la estación");
  await p.waitForTimeout(800);
  await j.tap('.st-tabs [data-tab="hangar"]', "Pestaña Hangar");
  if (!(await p.locator(".st-vehicle").count())) await j.tap("[data-catalogue]", "Ver el catálogo");
  await p.waitForTimeout(500);
  const buy = p.locator('[data-yard-import="juventas"]');
  await buy.scrollIntoViewIfNeeded();
  const buyText = await buy.innerText();
  j.check("Juventas ofrece «Importar lo que falta»", /Importar lo que falta/.test(buyText) && !(await buy.isDisabled()), buyText);
  await capture(j, "juventas", "Juventas: importar lo que falta");
  await j.tap('[data-yard-import="juventas"]', "Importar lo que falta (Juventas)");
  await j.waitDuel();
  await solveChain(j, stationOracle);
  await j.setup("pasa el viaje de Hohmann", () => {
    const c = window.codeship;
    c.importOps.tick(60);
    c.componentImports.tick();
  });
  await j.tap('.st-tabs [data-tab="hangar"]', "Pestaña Hangar");
  await p.waitForTimeout(600);
  const build = p.locator('[data-yard-build="juventas"]');
  await build.scrollIntoViewIfNeeded();
  j.check("con sus piezas importadas, Juventas se monta en la Bishop", /Montar en la esclusa Bishop/.test(await build.innerText()) && !(await build.isDisabled()), await build.innerText());
  await capture(j, "juventas-lista", "Juventas lista para montar");
}
