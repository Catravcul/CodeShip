// The vehicle catalogue (docs/design/naves-reales.md) as a player meets it: in the station, the
// Hangar tab lists real ships, landers, probes and stations with their status and the parts each
// one needs; with DART's parts at the station, «Montar en el CBM, con el brazo» puts it together where the
// ISS would (docs/design/modulo-lunar-juventas.md, «Montaje»). iPhone 13; captures in
// docs/screenshots/catalogo-naves-<pantalla>-movil.png.
import { mkdirSync } from "node:fs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(700);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/catalogo-naves-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

export async function catalogoNaves(j) {
  const p = j.page;
  await j.setup("acopla el módulo en su puerto de la estación", () => {
    const c = window.codeship;
    c.docking.undock();
    c.docking.dockNow(c.structure.portFor("sonda"));
  });
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-estacion", "Entrar en la estación");
  await p.waitForTimeout(800);
  // The vehicle catalogue and its assembly open at the Cupola's robotic workstation (docs/design/compartimentos.md).
  await j.setup("Doménica va hasta el puesto robótico de la Cupola", () => window.codeship.stationInside.placeAt("cupula"));
  await p.waitForFunction(() => window.codeship.stationInside.nearFixture() === "cupula", null, { timeout: 15000 }).catch(() => undefined);
  await j.tap('.sti-card [data-act="inventario"]', "Catálogo y montaje (puesto robótico de la Cupola)");
  await p.waitForTimeout(600);
  await j.tap('.st-tabs [data-tab="hangar"]', "Pestaña Hangar");
  await p.waitForTimeout(500);
  j.check("la pestaña Hangar ofrece el catálogo de naves", (await p.locator("[data-catalogue]").count()) === 1);
  await j.tap("[data-catalogue]", "Ver el catálogo");
  await p.waitForTimeout(500);
  const cards = await p.locator(".st-vehicle").count();
  j.check("el catálogo lista al menos 20 vehículos", cards >= 20, `${cards}`);
  const statuses = await p.$$eval(".st-vehicle .st-status", (els) => [...new Set(els.map((e) => e.textContent))]);
  j.check("cada vehículo dice si ha volado, está en desarrollo, en pausa, es concepto o inventado", ["Ha volado", "En desarrollo", "En pausa", "Concepto", "Inventado"].every((s) => statuses.includes(s)), statuses.join(", "));
  const dart = p.locator('.st-vehicle:has([data-yard-build="dart"])');
  j.check("DART pide sus piezas y aún no se puede construir", (await dart.locator("[data-yard-build]").isDisabled()) && /NEXT-C/.test(await dart.innerText()));
  await dart.scrollIntoViewIfNeeded();
  await capture(j, "lista", "Catálogo de naves");

  await j.setup("pone en el hangar las piezas de DART (como si hubieran llegado importadas)", () => {
    const h = window.codeship.stationOps.station.hangar;
    h.put("ionico-next-c", 1);
    h.put("rosa-diamond", 2);
    h.put("dart-cuerpo", 1);
  });
  await p.waitForTimeout(700);
  const btn = p.locator('[data-yard-build="dart"]');
  await btn.scrollIntoViewIfNeeded();
  j.check("con las piezas, DART dice dónde se monta: «Montar en el CBM, con el brazo»", /Montar en el CBM, con el brazo/.test(await btn.innerText()) && !(await btn.isDisabled()));
  await capture(j, "lista-dart", "DART listo para montar");
  await j.tap('[data-yard-build="dart"]', "Construir DART");
  await p.waitForTimeout(600);
  const built = await p.evaluate(() => window.codeship.stationOps.station.hangar.crafts.some((c) => c.id === "dart"));
  j.check("DART queda montada en el CBM y sus piezas se gastan", built && (await p.evaluate(() => window.codeship.stationOps.station.hangar.count("rosa-diamond"))) === 0);
  const bota = (await j.texts('[data-yard-release="dart"]'))[0] ?? "";
  j.check("la ficha ofrece «Botar DART»", /Botar DART/.test(bota), bota);
  await capture(j, "dart-montada", "DART montada");
}
