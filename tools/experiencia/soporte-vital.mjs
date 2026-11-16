// PX-30. Real life support (docs/design/soporte-vital.md) as a player meets it in the station: the readout
// only on the racks and the life-support laptop; the CDRA's zeolite beds clog and the CO₂ climbs past the
// 5,3 mmHg alarm with Doménica's headache; «Ir» from the global task list to the air rack, the repair as code
// challenges with its steps lit on the rack; the CO₂ comes back; then the water processor's multifiltration bed
// is changed at the water rack. iPhone 13; captures in docs/screenshots/soporte-vital-<pantalla>-movil.png.
import { mkdirSync } from "node:fs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(800);
  const clash = await j.page.evaluate(() => {
    const c = document.querySelector(".sti-card:not(.hidden)")?.getBoundingClientRect();
    const h = document.querySelector(".sti-hud")?.getBoundingClientRect();
    return c && h && h.height > 0 && c.height > 0 && c.top < h.bottom - 1 ? `tarjeta arriba en ${Math.round(c.top)} px, HUD hasta ${Math.round(h.bottom)} px` : "";
  });
  j.check(`${title}: la tarjeta con las lecturas no tapa el HUD de ubicación`, !clash, clash);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/soporte-vital-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

const card = (j) => j.page.evaluate(() => document.querySelector(".sti-card:not(.hidden)")?.innerText.replace(/\s+/g, " ") ?? "");
const co2 = (j) => j.page.evaluate(() => window.codeship.lifeSupport.system.readout().ppCO2MmHg);
/** Teleport to a thing's grab point (crossing the station hop by hop takes minutes with SwiftShader). */
const placeAt = async (j, id) => {
  await j.setup(`Doménica va hasta «${id}»`, (f) => window.codeship.stationInside.placeAt(f), id);
  // Her card follows on the next frames.
  await j.page.waitForFunction((f) => window.codeship.stationInside.nearFixture?.() === f || !document.querySelector(".sti-card:not(.hidden)"), id, { timeout: 5000 }).catch(() => {});
  await j.page.waitForTimeout(400);
};

async function solve(j) {
  const p = j.page;
  await j.waitDuel();
  for (let i = 0; i < 6 && (await p.evaluate(() => !!window.codeship.lifeSupport.session?.run.current)); i++) {
    await j.answer(() => window.codeship.lifeSupport.session?.run.current);
    await p.waitForTimeout(500);
  }
}

export async function soporteVital(j) {
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

  // The readout is not on the HUD: only on the racks and the life-support laptop.
  await placeAt(j, "carga-nodo2");
  j.check("lejos de las máquinas no hay lecturas de soporte vital", (await p.locator(".sv-readout").count()) === 0);
  await placeAt(j, "sv-consola");
  const desk = await card(j);
  j.check("la consola de soporte vital da ppO₂, ppCO₂, agua, comida y energía", ["ppO₂", "ppCO₂", "Agua", "Comida", "Energía"].every((w) => desk.toLowerCase().includes(w.toLowerCase())), desk.slice(0, 220));
  j.check("con el CDRA en marcha, el CO₂ está por debajo de 3 mmHg (NASA-STD-3001)", (await co2(j)) < 3, String(await co2(j)));
  await capture(j, "consola", "Consola de soporte vital");

  // The CDRA's zeolite beds clog (a real failure, ICES-2024-141) and a week goes by.
  await j.setup("se taponan los lechos de zeolita del CDRA y pasa una semana", () => {
    const ls = window.codeship.lifeSupport;
    ls.system.fail("cdra-lechos");
    ls.advance(24 * 7);
  });
  const high = await co2(j);
  j.check("el CO₂ pasa de la alarma de 5,3 mmHg", high > 5.3, String(high));
  await placeAt(j, "sv-ar");
  const air = await card(j);
  j.check("el bastidor de aire muestra la alarma de CO₂ y el CDRA averiado", /ALARMA CO₂/.test(air) && /CDRA/.test(air) && (await p.locator('.sv-readout [data-sv="co2"].alarma').count()) === 1, air.slice(0, 260));
  j.check("Doménica tiene síntomas por el CO₂ (NASA: cansancio por encima de 4,5 mmHg)", /Doménica: (cansancio|dolor de cabeza)/.test(air), air.slice(0, 260));
  await capture(j, "alarma", "Alarma de CO₂ en el bastidor de aire");

  // The repair is a task of the global list; «Ir» takes her to the rack and opens it.
  await placeAt(j, "sv-consola");
  await j.tap(".sti-ui .sti-tasks", "Tareas");
  const task = '.task-board [data-go="est-sv-cdra-lechos"]';
  j.check("la lista global tiene la reparación del CDRA", (await p.locator(task).count()) === 1);
  await capture(j, "tareas", "Lista de tareas con la reparación");
  await j.tap(task, "Ir: reparar el CDRA");
  const opened = await p.waitForFunction(() => !!window.codeship.lifeSupport.session, null, { timeout: 120000 }).then(() => true, () => false);
  j.check("«Ir» la lleva al bastidor de aire y abre la reparación", opened, await p.evaluate(() => window.codeship.stationInside.nearFixture?.() ?? ""));
  if (!opened) return;
  await j.waitDuel();
  await j.answer(() => window.codeship.lifeSupport.session?.run.current);
  await p.waitForTimeout(600);
  const lit = await p.evaluate(() => {
    const m = window.codeship.stationInside.rack("sv-ar");
    let n = 0;
    m.group.traverse((o) => {
      if (o.isMesh && o.material?.color?.getHex?.() === 0x3ddc84 && o.geometry?.parameters?.depth < 0.04) n++;
    });
    return n;
  });
  j.check("al ordenar el procedimiento, el bastidor enciende una luz por paso", lit >= 5, String(lit));
  await capture(j, "reparacion", "Reparación del CDRA con sus pasos en el bastidor");
  await solve(j);
  await p.waitForTimeout(1000);
  await j.tap(".duel button.end", "Continuar");
  const fixed = await p.evaluate(() => !window.codeship.lifeSupport.system.active().some((f) => f.id === "cdra-lechos"));
  j.check("el CDRA queda reparado y el lecho de repuesto se gasta", fixed && (await p.evaluate(() => window.codeship.lifeSupport.system.spares("lecho-zeolita"))) === 0);

  await j.setup("pasa un día con el CDRA en marcha", () => window.codeship.lifeSupport.advance(24));
  await placeAt(j, "sv-ar");
  const back = await co2(j);
  j.check("el CO₂ vuelve por debajo de 3 mmHg y la alarma se apaga", back < 3 && (await p.locator(".sv-alarm").count()) === 0, String(back));
  await capture(j, "recupera", "CO₂ recuperado");

  // Maintenance of the water processor: its multifiltration bed reached ionic breakthrough.
  await j.setup("el lecho de multifiltración del WPA llega a su ruptura iónica", () => window.codeship.lifeSupport.system.fail("wpa-lecho-mf"));
  await placeAt(j, "sv-wrs");
  const water = await card(j);
  j.check("el bastidor de agua ofrece el mantenimiento del WPA", /Mantenimiento WPA/.test(water), water.slice(0, 220));
  await capture(j, "agua", "Bastidor de agua con el mantenimiento");
  await j.tap('.sti-card [data-act="chore:sv-wpa-lecho-mf"]', "Mantenimiento del WPA");
  await solve(j);
  await p.waitForTimeout(1000);
  await j.tap(".duel button.end", "Continuar");
  j.check("el WPA vuelve al 100 %", await p.evaluate(() => window.codeship.lifeSupport.system.capacity("wpa") === 1));
}
