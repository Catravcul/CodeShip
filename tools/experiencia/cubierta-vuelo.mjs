// PX-40 Starship's flight deck rebuilt from what is public (docs/design/puente.md, Berón 2026-11-17: «¿dónde está el
// control manual de la nodriza?»): the round deck in the nose under its three windows; no console that only shows
// numbers; the pilot seat flies to any destination by hand («Manual»: its panel only there) or by challenges
// («Automático (retos)»); the docking seat docks at the station by hand with the nose port's camera, undocks back to
// Waypoint 1 and docks again by challenges. iPhone 13; captures in docs/screenshots/cubierta-vuelo-*-movil.png.
import { mkdirSync } from "node:fs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(600);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/cubierta-vuelo-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

const card = (p) => p.evaluate(() => document.querySelector(".room-ui:not(.hidden) .cab-machine:not(.hidden)")?.innerText ?? "");
const acts = (p) => p.$$eval(".room-ui:not(.hidden) .cab-machine [data-act]", (els) => els.map((e) => ({ id: e.dataset.act, text: e.textContent.trim(), on: !e.disabled })));

async function closeSheet(j) {
  const p = j.page;
  if (await p.locator('.duel:not(.hidden) .duel-tools [data-act="close"]').count()) await j.tap('.duel:not(.hidden) .duel-tools [data-act="close"]', "× del reto");
  await p.waitForFunction(() => [...document.querySelectorAll(".duel")].every((e) => e.classList.contains("hidden")), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(400);
}

export async function cubiertaVuelo(j) {
  const p = j.page;
  await j.setup("sube a la cubierta de vuelo de la Starship (la subida por las cubiertas se juega en PX-28 y PX-36)", () => window.codeship.bridge.enter("salida"));
  await p.waitForTimeout(900);

  // 1. The room: Starship's own deck, not the old bridge.
  const room = await p.evaluate(() => {
    const b = window.codeship.bridge;
    return { shape: b.shape, ids: b.opts.layout.stations.map((s) => s.id), title: document.querySelector(".room-ui:not(.hidden) .cab-where")?.textContent };
  });
  j.check("es la cubierta de vuelo de la Starship (sala redonda del morro), no el puente de la nave de anillos", room.shape === "starship" && /Cubierta de vuelo/.test(room.title ?? ""), JSON.stringify(room));
  j.check("sin consolas que solo informan: fuera «Vida y hábitat» y «Energía y calor»", !room.ids.includes("life") && !room.ids.includes("power"), room.ids.join(", "));
  await j.setup("mira hacia proa, a las tres ventanas", () => window.codeship.bridge.face({ x: 0, y: 1.6, z: -5 }));
  await capture(j, "1-proa", "Proa: ventanas y puestos");

  // 2. Every console does something: no «Usar la consola» that only opens a reading page.
  for (const id of room.ids) {
    await j.setup(`va a «${id}»`, (m) => window.codeship.bridge.goTo(m), id);
    await p.waitForFunction((m) => window.codeship.bridge.near() === m && !window.codeship.bridge.walking, id, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(400);
    const a = await acts(p);
    j.check(`«${id}»: su ficha ofrece lo que hace su puesto real`, a.length > 0 && !a.some((x) => /^Usar la consola: (Pilotaje|Acople|Vida|Energía)/.test(x.text)), a.map((x) => x.text).join(" | "));
  }

  // 3. The pilot seat: destination, «Manual» and «Automático (retos)»; seated.
  await j.useMachine("bridge", "prop", null);
  await p.waitForTimeout(800);
  const seat = await p.evaluate(() => ({ chair: window.codeship.bridge.chair, opts: [...document.querySelectorAll(".cm-dest select option")].map((o) => o.value) }));
  j.check("en el puesto de pilotaje se sienta", seat.chair === true, JSON.stringify(seat.chair));
  const a3 = await acts(p);
  j.check("el puesto ofrece «Manual» y «Automático (retos)»", a3.some((x) => x.id === "manual" && x.text === "Manual") && a3.some((x) => x.id === "auto" && /Automático \(retos\)/.test(x.text)), a3.map((x) => x.text).join(" | "));
  const dest = await p.evaluate(() => window.codeship.nav.targets.filter((t) => t.kind === "asteroid").map((t) => t.id));
  j.check("el destino puede ser la estación o cualquier asteroide", seat.opts.includes("estacion-polana") && dest.filter((d) => seat.opts.includes(d)).length >= 5, seat.opts.join(", "));
  await capture(j, "2-pilotaje", "Puesto de pilotaje");

  // 4. By hand to an asteroid: the hand panel, only at the pilot seat.
  const rock = await p.evaluate(() => window.codeship.nav.targets.find((t) => t.kind === "asteroid" && t.id !== window.codeship.region.target.data.id)?.id);
  await p.selectOption(".cm-dest select", rock);
  await p.waitForTimeout(300);
  await j.tap('.room-ui:not(.hidden) .cab-machine [data-act="manual"]', "Manual");
  await p.waitForTimeout(700);
  for (let i = 0; i < 2; i++) await j.tap('.carrier-hand [data-dv="0.1"]', "+0,1 m/s");
  const fl = await p.evaluate(() => ({ v: window.codeship.nav.manualCarrier?.speedMs ?? 0, goal: window.codeship.nav.target.id, hand: (document.querySelector(".carrier-hand:not(.hidden)")?.textContent ?? "") }));
  j.check("«Manual» vuela a mano hacia el asteroide elegido con ±0,1 m/s (mandos en desarrollo)", Math.abs(fl.v - 0.2) < 1e-6 && fl.goal === rock && /en desarrollo/.test(fl.hand), JSON.stringify({ v: fl.v, goal: fl.goal }));
  await capture(j, "3-manual-asteroide", "Pilotar a mano hacia un asteroide");
  await j.setup("se levanta y va a la mesa de navegación", () => window.codeship.bridge.goTo("nav"));
  await p.waitForFunction(() => window.codeship.bridge.near() === "nav" && !window.codeship.bridge.walking, null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(500);
  j.check("lejos del puesto de pilotaje los mandos no salen (la nave sigue a la velocidad dada)", await p.evaluate(() => !!document.querySelector(".carrier-hand.hidden") && (window.codeship.nav.manualCarrier?.speedMs ?? 0) > 0));
  const free = await p.evaluate(() => ({ chip: !!document.querySelector(".trip-chip.on"), tag: !!document.querySelector(".autopilot-tag.on"), status: window.codeship.tripStatus() }));
  j.check("lejos del puesto la vista queda libre: ni el chip del viaje ni su franja (reglas §5.9)", !free.chip && !free.tag, JSON.stringify({ chip: free.chip, tag: free.tag }));
  j.check("el estado del viaje sigue como dato para la ventana «Trayecto» del menú (destino, distancia, tiempo, fase)", !!free.status && free.status.vehicle === "Starship" && free.status.distanceM > 0 && !!free.status.phase, JSON.stringify(free.status));
  await j.useMachine("bridge", "prop", null);
  await p.waitForTimeout(600);
  await j.tap('.carrier-hand [data-dv="stop"]', "Parar");
  await j.tap(".trip-chip .tc-take", "Dejar de pilotar");
  await p.waitForTimeout(500);
  j.check("«Dejar de pilotar» deja la Starship parada donde está", await p.evaluate(() => window.codeship.nav.status !== "carrier" && !window.codeship.nav.manualCarrier));

  // 5. By challenges to the station: the trip's challenge sheet opens from the seat.
  await p.selectOption(".cm-dest select", "estacion-polana");
  await p.waitForTimeout(300);
  await j.tap('.room-ui:not(.hidden) .cab-machine [data-act="auto"]', "Automático (retos)");
  await j.waitDuel(30000);
  const sheet = await p.evaluate(() => window.codeship.nav.programming?.chore.title ?? "");
  j.check("«Automático (retos)» abre la cadena de retos del viaje a la estación", /Estación/.test(sheet), sheet);
  await closeSheet(j);

  // 6. Hand flight to the station stops at Waypoint 1; the docking seat docks it by hand with the camera.
  await j.setup("vuela a mano hasta cerca del punto de espera de la estación (el vuelo a mano entero se juega en PX-36)", () => {
    const n = window.codeship.nav;
    n.flyByHand("estacion-polana");
    const m = n.manualCarrier;
    m.command(0.4);
    m.advance((m.remainingM - 50) / m.speedMs);
    m.hold();
  });
  const held = await p.waitForFunction(() => window.codeship.nav.holdingAt()?.id === "estacion-polana", null, { timeout: 120000 }).then(() => true).catch(() => false);
  j.check("a mano no atraca sola: se queda en el punto de espera 1 (150 m)", held && (await p.evaluate(() => !window.codeship.mothership.dockedTo)));
  await j.useMachine("bridge", "dock", null);
  await p.waitForTimeout(600);
  const d1 = await acts(p);
  j.check("el puesto de acople ofrece acoplar a mano (cámara) y automático (retos)", d1.some((x) => x.id === "acoplar-mano" && x.on) && d1.some((x) => x.id === "acoplar-auto" && x.on), d1.map((x) => x.text).join(" | "));
  await capture(j, "4-acople-espera", "Puesto de acople en el punto de espera");
  await j.tap('.room-ui:not(.hidden) .cab-machine [data-act="acoplar-mano"]', "Acoplar a mano (cámara)");
  await p.waitForTimeout(600);
  for (let i = 0; i < 6; i++) await j.tap('.dock-cam [data-ax="closing"][data-n="1"]', "+0,05 m/s");
  await p.waitForTimeout(1500);
  await capture(j, "5-camara-acople", "Cámara de acople");
  const near = await p.waitForFunction(() => (window.codeship.nav.manualBerth?.alignment().axialM ?? 0) < 14, null, { timeout: 150000 }).then(() => true).catch(() => false);
  if (near) for (let i = 0; i < 4; i++) await j.tap('.dock-cam [data-ax="closing"][data-n="-1"]', "−0,05 m/s");
  await capture(j, "6-camara-cerca", "Cámara de acople, cerca del puerto");
  const docked = await p.waitForFunction(() => !!window.codeship.mothership.dockedTo, null, { timeout: 120000 }).then(() => true).catch(() => false);
  j.check("frenando a 0,10 m/s antes del contacto, los ganchos IDSS cogen: atracada a mano", docked, await p.evaluate(() => window.codeship.nav.lastBerthFailure.join("; ")));
  await p.waitForTimeout(700);

  // 7. Docked: «Manual» waits for undocking; the docking seat undocks back to Waypoint 1.
  const d2 = await acts(p);
  j.check("atracada, el puesto de acople ofrece «Desacoplar»", d2.some((x) => x.id === "desacoplar" && x.on), d2.map((x) => x.text).join(" | "));
  await capture(j, "7-atracada", "Atracada en la estación");
  await j.tap('.room-ui:not(.hidden) .cab-machine [data-act="desacoplar"]', "Desacoplar");
  await p.waitForTimeout(800);
  const und = await p.evaluate(() => ({ phase: window.codeship.nav.progress()?.phase, docked: !!window.codeship.mothership.dockedTo }));
  j.check("«Desacoplar» abre los ganchos y retrocede por el eje", und.phase === "undock" && !und.docked, JSON.stringify(und));
  await j.setup("deja pasar el retroceso (130 m a 0,07 m/s: 31 s reales a ×60)", () => window.codeship.nav.update(35));
  const back = await p.waitForFunction(() => window.codeship.nav.holdingAt()?.id === "estacion-polana", null, { timeout: 60000 }).then(() => true).catch(() => false);
  j.check("desacoplada, espera en el punto de espera 1", back);

  // 8. Docking by challenges: the Demo-1 approach as a code challenge, then the computer flies it.
  await p.waitForTimeout(600);
  await j.tap('.room-ui:not(.hidden) .cab-machine [data-act="acoplar-auto"]', "Acoplar automático (retos)");
  await j.waitDuel(30000);
  const title = await p.evaluate(() => window.codeship.bridge.dockChore?.chore.title ?? "");
  j.check("«Acoplar automático (retos)» abre el reto del acople", /acople/.test(title), title);
  await capture(j, "8-reto-acople", "Reto del acople");
  for (let n = 0; n < 6 && (await p.evaluate(() => !!window.codeship.bridge.dockChore)); n++) await j.answer(() => window.codeship.bridge.dockChore?.current ?? null, true);
  const auto = await p.waitForFunction(() => window.codeship.nav.progress()?.phase === "dock" || !!window.codeship.mothership.dockedTo, null, { timeout: 30000 }).then(() => true).catch(() => false);
  j.check("resuelto, el ordenador vuela la aproximación como la Crew Dragon (fase de atraque)", auto);
  await p.waitForFunction(() => [...document.querySelectorAll(".duel")].every((e) => e.classList.contains("hidden")), null, { timeout: 15000 }).catch(() => {});
  const docked2 = await p.waitForFunction(() => !!window.codeship.mothership.dockedTo, null, { timeout: 180000 }).then(() => true).catch(() => false);
  j.check("y atraca en la estación", docked2);
  await j.useMachine("bridge", "prop", null);
  await p.waitForTimeout(600);
  const why = (await card(p)).match(/desacopla antes[^\n]*/)?.[0];
  j.check("atracada, «Manual» dice que primero hay que desacoplar en el puesto de acople", !!why, why);
  await capture(j, "9-pilotaje-atracada", "Puesto de pilotaje con la Starship atracada");
}
