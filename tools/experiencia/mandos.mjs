// PX-41: the lander's and the probe's controls as Berón asked (2026-11-17), played with taps on an iPhone 13
// (docs/design/cabina-lm.md «Mandos», modulo-lunar-juventas.md «Cómo sale Juventas»): in the LM's flight view the
// dock/undock switch sits under the eye only at a port and shows the opposite of the state, with no unexplained
// icon; the commander's station offers Manual and Automático, and Automático lists only the destinations near
// the mothership and opens the trip challenge; on Starship's flight deck the probe's station offers the same,
// Juventas starts in its deployer on the hull (wherever the mothership went), the door opens, it slides out and
// the springs release it at 3 cm/s; its mission ends on the surface and an empty set of deployers says so.
// Captures in docs/screenshots/mandos-<pantalla>-movil.png.
import { mkdirSync } from "node:fs";
import { placeAbove } from "./aterrizaje.mjs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(800);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/mandos-${label}-movil.png`, timeout: 120000 });
  await j.shot(`mandos-${label}`);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón ni rótulo se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

const tripStep = () => window.codeship.nav.programming?.current ?? null;
const probeStep = () => window.codeship.probeTravel.trip.programming?.current ?? null;
const seatButtons = () => [...document.querySelectorAll(".room-ui:not(.hidden) .cab-machine .cm-acts button")].map((b) => ({ id: b.dataset.act, label: b.textContent.trim(), on: !b.disabled }));
const pinned = () =>
  [...document.querySelectorAll(".flight-bar .rm-pinned button, .flight-bar > .rm-root")]
    .filter((b) => b.checkVisibility())
    .map((b) => ({ cls: b.className, label: b.getAttribute("aria-label"), y: Math.round(b.getBoundingClientRect().top) }));

export async function mandos(j) {
  const p = j.page;

  // 1. Docked: under the eye, the undock switch (its icon the opposite of «docked»); no other icon.
  const docked = await p.evaluate(pinned);
  const eye = docked.find((b) => /cam-btn/.test(b.cls));
  const sw = docked.find((b) => /dock-btn/.test(b.cls));
  j.check("acoplado, bajo el ojo está el interruptor «Desacoplar» (el icono de lo contrario del estado)", !!eye && !!sw && sw.y > eye.y && /^Desacoplar/.test(sw.label ?? ""), JSON.stringify(docked));
  j.check("ningún icono sin explicar: la raíz no sale (no queda nada plegado dentro) y no hay «Centrar la vista»", !docked.some((b) => /rm-root/.test(b.cls)) && !(await p.locator(".center-btn").count()), JSON.stringify(docked));
  await capture(j, "acoplado", "Vista de vuelo acoplada con el interruptor de acople");

  // 2. The commander's station: Manual and Automático; Automático lists only the nearby destinations.
  await j.tap(".stand-btn", "Dejar el puesto: habitáculo");
  await j.useMachine("cabin", "asiento", null);
  const seat = await p.evaluate(seatButtons);
  j.check("el puesto del comandante ofrece «Manual» y «Automático» (sin «Desacoplar»: es el interruptor del vuelo)", seat.map((b) => b.label).join("|") === "Manual|Automático", JSON.stringify(seat));
  await j.tap('.room-ui:not(.hidden) .cab-machine [data-act="automatico"]', "Automático");
  await p.waitForTimeout(500);
  const list = await p.evaluate(seatButtons);
  const near = await p.evaluate(() => {
    const c = window.codeship;
    const r = c.mothership.spec.parkingDistanceM.value + c.nav.approachM;
    return c.nav.targets.map((t) => ({ id: t.id, far: (t.kind === "asteroid" ? t.body.position.sub(c.mothership.position).length() - t.body.meanRadiusM : t.probePort.port.position.sub(c.mothership.position).length()) > r }));
  });
  const listed = list.filter((b) => b.id?.startsWith("auto:")).map((b) => b.id.slice(5));
  j.check("«Automático» lista solo destinos cercanos a la nodriza (ningún asteroide lejano: esos viajes son de la nodriza)", listed.length > 0 && listed.every((id) => near.find((t) => t.id === id && !t.far)) && near.filter((t) => t.far).every((t) => !listed.includes(t.id)), `${listed.join(", ")} · lejos: ${near.filter((t) => t.far).map((t) => t.id).join(", ")}`);
  await capture(j, "automatico-destinos", "Destinos cercanos del «Automático» del LM");
  const bennu = await p.evaluate(() => window.codeship.region.target.data.id);
  await j.tap(`.room-ui:not(.hidden) .cab-machine [data-act="auto:${bennu}"]`, "Automático a Bennu");
  await j.waitDuel(30000);
  await capture(j, "automatico-reto", "Reto del viaje automático del LM");
  for (let n = 0; n < 9 && (await p.evaluate(() => window.codeship.nav.status)) === "programming"; n++) await j.answer(tripStep, true);
  await p.waitForTimeout(1500);
  const flying = await p.evaluate(() => ({ status: window.codeship.nav.status, docked: window.codeship.docking.docked, carrier: !!window.codeship.nav.carrierTrip }));
  j.check("resuelto el reto, el LM se desacopla y su piloto automático lo lleva (la nodriza no se mueve)", flying.status === "autopilot" && !flying.docked && !flying.carrier, JSON.stringify(flying));

  // 3. Free near the Starship's port: the switch shows «Acoplar» and the assist flies in.
  await j.setup("se para el viaje y el LM queda a 60 m del puerto de la Starship, en su eje", () => {
    const c = window.codeship;
    c.nav.cancel();
    const port = c.mothership.port ?? c.docking.targets[0].port;
    const at = port.position.add(port.normal.scale(60));
    c.flight.applyImpulse(c.flight.state.velocity.scale(-1));
    c.flight.nudge(at.sub(c.flight.state.position));
  });
  await j.useMachine("cabin", "asiento", "pilotar", "Manual");
  await p.waitForTimeout(1200);
  const free = await p.evaluate(pinned);
  const sw2 = free.find((b) => /dock-btn/.test(b.cls));
  j.check("libre dentro de la esfera de 200 m del puerto, el interruptor dice «Acoplar»", !!sw2 && sw2.label === "Acoplar", JSON.stringify(free));
  await capture(j, "acoplar", "Interruptor «Acoplar» cerca del puerto");
  await j.tap(".dock-btn", "Acoplar");
  await p.waitForTimeout(600);
  j.check("al tocarlo, el asistente lleva el LM al puerto («Acoplando: tocar para parar»)", await p.evaluate(() => window.codeship.docking.assist && /Acoplando/.test(document.querySelector(".dock-btn")?.getAttribute("aria-label") ?? "")));
  await j.setup("el asistente llega al contacto (minutos de juego)", () => window.codeship.docking.dockNow(window.codeship.mothership));
  await p.waitForTimeout(800);
  await j.tap(".dock-btn", "Desacoplar");
  await p.waitForTimeout(600);
  j.check("y vuelve a desacoplar con el mismo interruptor", await p.evaluate(() => !window.codeship.docking.docked));
  await j.setup("vuelve a acoplar en la Starship", () => window.codeship.docking.dockNow(window.codeship.mothership));

  // 4. Juventas in its deployer on Starship's hull, wherever she is.
  await j.tap(".stand-btn", "Dejar el puesto: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la nave de viaje");
  await p.waitForTimeout(1500);
  await j.setup("sube a la cubierta 1, junto a la escotilla de la cubierta de vuelo", () => window.codeship.starship.mode.placeAt("subir-cubierta-vuelo"));
  await p.waitForTimeout(1200);
  await j.tap('.sts-card:not(.hidden) [data-act="subir"]', "Subir a la cubierta de vuelo");
  await p.waitForTimeout(1500);
  const inHull = () =>
    p.evaluate(() => {
      const c = window.codeship;
      const m = c.mothership;
      const rel = c.probe.flight.state.position.sub(m.position);
      const body = m.orientation.conjugate().rotate(rel);
      return { r: Math.hypot(body.x, body.y), z: body.z, R: m.spec.layout.spine.radiusM, half: m.spec.layout.lengthM / 2 };
    });
  const at0 = await inHull();
  j.check("Juventas empieza dentro de su dispensador, bajo la piel del casco de la Starship", at0.r < at0.R && at0.r > at0.R - 0.5 && Math.abs(at0.z) < at0.half, JSON.stringify(at0));
  await j.setup("la Starship viaja 4 km (el viaje entero lo juega PX-28)", () => {
    const c = window.codeship;
    const m = c.mothership;
    m.moveTo(m.position.add(c.region.target.position.sub(m.position).normalize().scale(-4000)));
  });
  await p.waitForTimeout(800);
  const at1 = await inHull();
  j.check("tras el viaje de la nodriza, la sonda sigue en su dispensador, en la nodriza (no a una distancia fija)", at1.r < at1.R && Math.abs(at1.z) < at1.half, JSON.stringify(at1));
  await j.setup("la Starship vuelve a su sitio junto a Bennu", () => {
    const c = window.codeship;
    const m = c.mothership;
    m.moveTo(m.position.add(c.region.target.position.sub(m.position).normalize().scale(4000)));
  });

  // 5. The probe's station: Manual / Automático; Automático to Bennu shows the release from the deployer.
  await j.useMachine("bridge", "sonda", null);
  const ps = await p.evaluate(seatButtons);
  j.check("el mando de la sonda ofrece «Manual» y «Automático»", ps.map((b) => b.label).join("|") === "Manual|Automático", JSON.stringify(ps));
  await j.tap('.room-ui:not(.hidden) .cab-machine [data-act="automatico"]', "Automático");
  await p.waitForTimeout(500);
  const pl = (await p.evaluate(seatButtons)).filter((b) => b.id?.startsWith("auto:")).map((b) => b.id.slice(5));
  j.check("solo asteroides cercanos a la nodriza (Juventas no hace viajes largos)", pl.length > 0 && pl.every((id) => near.find((t) => t.id === id && !t.far)), pl.join(", "));
  await capture(j, "sonda-destinos", "Destinos cercanos del «Automático» de la sonda");
  await j.tap(`.room-ui:not(.hidden) .cab-machine [data-act="auto:${pl[0]}"]`, "Automático al asteroide cercano");
  await j.waitDuel(30000);
  for (let n = 0; n < 9 && (await p.evaluate(() => window.codeship.probeTravel.trip.status)) === "programming"; n++) await j.answer(probeStep, true);
  await p.waitForFunction(() => window.codeship.probe.doorOpen(window.codeship.probe.slot) > 0.6, null, { timeout: 20000 }).catch(() => {});
  const door = await p.evaluate(() => ({ deploying: window.codeship.probe.deploying, door: window.codeship.probe.doorOpen(window.codeship.probe.slot), lapse: window.codeship.probeTravel.trip.lapse, msg: document.querySelector(".pr-msg")?.textContent ?? "" }));
  j.check("primero se abre la puerta del dispensador, a ×1 para que se vea, y la consola lo dice", door.deploying && door.door > 0.5 && door.lapse === 1 && /puerta del dispensador/.test(door.msg), JSON.stringify(door));
  await capture(j, "sonda-puerta", "La puerta del dispensador abierta y la sonda saliendo");
  await p.waitForFunction(() => window.codeship.probe.status === "en-vuelo", null, { timeout: 60000 }).catch(() => {});
  const out = await p.evaluate(() => {
    const c = window.codeship;
    const v = c.probe.flight.state.velocity.length();
    return { status: c.probe.status, v, trip: c.probeTravel.trip.status, left: c.probe.inDeployers };
  });
  j.check("los muelles la sueltan a unos 3 cm/s y el viaje automático sigue solo", out.status === "en-vuelo" && out.trip === "flying" && out.left === 1, JSON.stringify(out));
  await capture(j, "sonda-suelta", "Juventas suelta junto a la Starship");

  // 6. Its mission ends on the surface: the next one, then empty deployers.
  await j.setup("se para el viaje y la sonda queda posada sobre el asteroide (posarla la juega PX-07)", () => {
    const c = window.codeship;
    c.probeTravel.trip.cancel();
    c.probe._status = "posada";
  });
  await p.waitForTimeout(600);
  const end = await p.evaluate(() => [...document.querySelectorAll(".pr-actions button")].filter((b) => b.checkVisibility()).map((b) => b.textContent));
  j.check("posada, la consola ofrece terminar su misión (no hay «Recuperar con el brazo»: Juventas no vuelve)", end.some((t) => /Terminar su misión/.test(t)) && !end.some((t) => /Recuperar/.test(t)), end.join(" | "));
  await j.tap('.pr-actions [data-act="abandon"]', "Terminar su misión");
  await p.waitForTimeout(600);
  j.check("la siguiente Juventas espera en su dispensador", await p.evaluate(() => window.codeship.probe.status === "estibada" && window.codeship.probe.inDeployers === 1 && window.codeship.probe.ended.length === 1));
  await j.setup("la segunda también termina su misión (soltarla y posarla es lo mismo)", () => {
    const pr = window.codeship.probe;
    pr.full[pr.slot] = false;
    pr._status = "posada";
    pr.endMission();
  });
  await p.waitForTimeout(800);
  const empty = await p.evaluate(() => ({ status: window.codeship.probe.status, tele: document.querySelector(".pr-tele")?.textContent ?? "" }));
  j.check("con los dispensadores vacíos la consola lo dice: importar otra del catálogo", empty.status === "sin-sonda" && /dispensadores están vacíos/.test(empty.tele) && /catálogo/.test(empty.tele), JSON.stringify(empty));
  await capture(j, "sonda-vacio", "Dispensadores vacíos");
  await j.tap(".pr-exit", "Volver al puente");
  await p.waitForTimeout(800);
  await j.useMachine("bridge", "sonda", null);
  const auto = (await p.evaluate(seatButtons)).find((b) => b.id === "automatico");
  const why = (await j.texts(".room-ui:not(.hidden) .cab-machine .cm-why")).join(" ");
  j.check("en el mando, «Automático» queda apagado y dice que los dispensadores están vacíos", !!auto && !auto.on && /vacíos/.test(why), why);
}
