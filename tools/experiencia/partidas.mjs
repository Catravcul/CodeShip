// PX-50 Saved games (Berón, 2026-11-18; docs/design/partidas.md), on an iPhone 13 with taps. The game saves itself
// in localStorage (every minute, at an arrival, at the end of a challenge, on waking and when the page is hidden).
// She plays, goes from the LM's seat through the docking hatch into the Starship, the page reloads, and «Continuar»
// puts her back there with the state intact. The start screen's gear (gear → settings, list icon → back, like the
// other map windows) lists the save; a broken one says so without breaking anything; deleting asks inside the window
// (never `window.confirm`); «Jugar sin partida guardada» starts a new game. Trips under way (2026-11-19, «Viajes en
// marcha»): a reload in the middle of the Starship's hop, and of the cruise to Bennu after the launch, comes back
// still flying at the same point, with «Trayecto» showing it and the LM latched. Captures docs/screenshots/partidas-*-movil.png.
import { mkdirSync } from "node:fs";
import { enterGame } from "./lib.mjs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(400);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/partidas-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

/** The start screen's saved games (the gear's settings): rows, their buttons and the fresh-game button. */
const saves = (p) =>
  p.evaluate(() => {
    const w = document.querySelector(".start-screen:not(.hidden)");
    const box = w?.querySelector(".ss-saves:not(.hidden)");
    if (!box) return null;
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height), top: Math.round(b.top), bottom: Math.round(b.bottom) };
    };
    const gear = w.querySelector(".mw-gear");
    return {
      gear: gear?.getAttribute("aria-label"),
      rows: [...box.querySelectorAll(".ss-save")].map((row) => ({
        id: row.dataset.slot,
        text: row.textContent.replace(/\s+/g, " ").trim(),
        confirming: row.classList.contains("confirming"),
        buttons: [...row.querySelectorAll("button")].map((b) => ({ label: b.textContent.trim(), aria: b.getAttribute("aria-label"), off: b.disabled, ...r(b) })),
      })),
      none: box.querySelector(".ss-saves-none")?.textContent ?? "",
      fresh: box.querySelector(".ss-fresh") ? { off: box.querySelector(".ss-fresh").disabled, ...r(box.querySelector(".ss-fresh")) } : null,
      freshHelp: box.querySelector(".ss-fresh-help")?.textContent ?? "",
      card: w.querySelector('.mw-go[data-go="espacio"]')?.textContent,
    };
  });

/** The trip flying now (the Starship's hop or the cruise to Bennu), read for the checks. */
const trip = (p) =>
  p.evaluate(() => {
    const c = window.codeship;
    const m = c.mothership.position;
    const pr = c.nav.progress();
    const t = c.nav.target;
    const goal = t.kind === "asteroid" ? t.body.position : null;
    const from = c.nav.route[0];
    return {
      status: c.nav.status,
      target: t.id,
      phase: pr?.phase ?? null,
      fraction: pr?.fraction ?? null,
      etaRealS: pr?.etaRealS ?? null,
      fromStartM: from ? Math.hypot(m.x - from.x, m.y - from.y, m.z - from.z) : null,
      toGoalM: goal ? Math.hypot(m.x - goal.x, m.y - goal.y, m.z - goal.z) : null,
      ship: [m.x, m.y, m.z],
      dock: c.docking.dockedTo?.id ?? null,
      canUndock: c.docking.canUndock(),
      cruise: c.cruise ? { active: c.cruise.active, left: c.cruise.left, total: c.cruise.totalS } : null,
      rocks: c.field.group.visible,
      status6: c.tripStatus() ?? null,
      slot: c.gameSave.slot,
    };
  });

/** Where she is and what the game keeps, read for the checks (the taps do the playing). */
const game = (p) =>
  p.evaluate(() => {
    const c = window.codeship;
    const st = c.flight.state.position;
    return {
      slot: c.gameSave.slot,
      days: c.gameSave.boardDays,
      ship: !!c.starship?.active,
      cabin: c.cabin.active,
      seat: c.view.enabled,
      deck: c.starship?.where?.() ?? null,
      fixture: c.starship?.active ? c.starship.mode.nearestFixture() : null,
      dock: c.docking.dockedTo?.id ?? null,
      lander: [st.x, st.y, st.z],
      satiety: c.habitat.crew.satiety,
      fitness: c.habitat.crew.fitness,
      shipLife: c.starship?.lifeSupport?.system.readout().foodKg ?? null,
      letters: c.habitat.mailbox.received.length,
      credits: c.wallet.balance,
    };
  });

export async function partidas(j) {
  const p = j.page;
  const dialogs = [];
  p.on("dialog", (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });

  // 1. No game kept yet: the gear is in the start screen's tools and its settings say so.
  const gearBox = await p.locator(".start-screen .mw-gear").boundingBox();
  j.check("la pantalla de inicio tiene el engranaje de las partidas guardadas, de 44 px", !!gearBox && gearBox.width >= 44 && gearBox.height >= 44, JSON.stringify(gearBox));
  await j.tap(".start-screen .mw-gear", "⚙︎ Partidas guardadas");
  const s0 = await saves(p);
  j.check("el engranaje cambia la lista por las partidas guardadas y pasa a icono de lista («Volver a los santuarios»)", !!s0 && s0.gear === "Volver a los santuarios", JSON.stringify(s0?.gear));
  j.check("sin partidas: lo dice, y ofrece «Jugar sin partida guardada» (44 px)", !!s0 && /Todavía no hay ninguna partida guardada/.test(s0.none) && s0.fresh && s0.fresh.h >= 44 && !s0.fresh.off && /ranura 1/.test(s0.freshHelp), JSON.stringify(s0));
  await capture(j, "vacia", "Partidas guardadas, sin ninguna");
  await j.tap('.start-screen .mw-gear[aria-label="Volver a los santuarios"]', "Volver a los santuarios");

  // 2. Play: «Jugar» on 6, then from the LM's seat into the cabin and through the docking hatch into the Starship.
  await enterGame(p);
  await p.waitForTimeout(2500);
  const g0 = await game(p);
  j.check("una partida nueva se guarda en la ranura 1", g0.slot === "1", JSON.stringify(g0.slot));
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await p.waitForTimeout(1200);
  // Áreas: the Switch pad's «−» (ui/game-pad.ts); j.tap opens the gear itself where there is no pad.
  await j.tap(".room-ui:not(.hidden) .areas-btn", "Áreas");
  await p.waitForTimeout(500);
  await j.tap('.areas-window .tb-go[data-area="acople"]', "Ir: Escotilla de acople");
  await p.waitForFunction(() => !window.codeship.journey.active, null, { timeout: 60000 }).catch(() => {});
  await j.tapInteraction("Mostrar la tarjeta (Y del mando)");
  await j.tap('.cab-machine:not(.hidden) button[data-act="entrar-nodriza"]', "Entrar en la nodriza");
  await p.waitForFunction(() => window.codeship.starship?.active, null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(3000);
  const g1 = await game(p);
  j.check("ella ha pasado del módulo a la Starship por la escotilla de acople", g1.ship && g1.dock === "nodriza", JSON.stringify(g1));
  await capture(j, "antes", "En la Starship antes de recargar");

  // 3. Reload: the page hides (it saves), the start screen offers «Continuar», and she is back where she was.
  await p.reload();
  await p.waitForSelector(".start-screen:not(.hidden)", { timeout: 120000 });
  await p.waitForTimeout(500);
  const cont = await p.evaluate(() => document.querySelector('.start-screen .mw-go[data-go="espacio"]')?.textContent);
  j.check("al recargar, el 6 dice «Continuar» (se guardó al ocultarse la página)", cont === "Continuar", cont);
  await capture(j, "continuar", "Inicio con la partida guardada");
  await enterGame(p, { resume: true });
  await p.waitForTimeout(2500);
  const g2 = await game(p);
  j.check("«Continuar» la devuelve a la Starship, a la misma cubierta y junto al mismo sitio", g2.ship && g2.deck === g1.deck && g2.fixture === g1.fixture, JSON.stringify({ antes: [g1.deck, g1.fixture], ahora: [g2.deck, g2.fixture] }));
  j.check("y sigue en la ranura 1", g2.slot === "1", g2.slot);
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  j.check(
    "con el estado intacto: el módulo acoplado en el mismo sitio, sus necesidades, la despensa, las cartas y los créditos; el día sigue",
    g2.dock === "nodriza" && g2.lander.every((x, i) => near(x, g1.lander[i], 1)) && near(g2.satiety, g1.satiety, 0.01) && g2.satiety < 0.8 && near(g2.fitness, g1.fitness, 0.01) && near(g2.shipLife ?? 0, g1.shipLife ?? 0, 0.5) && g2.letters === g1.letters && g2.credits === g1.credits && g2.days >= g1.days - 1e-3,
    JSON.stringify({ antes: g1, ahora: g2 }),
  );
  await capture(j, "recuperada", "La partida recuperada");

  // 4. The gear lists the save; a broken slot is reported, not fatal.
  await j.setup("una ranura dañada a mano (texto roto en codeship.partida.3)", () => localStorage.setItem("codeship.partida.3", "{roto"));
  await p.reload();
  await p.waitForSelector(".start-screen:not(.hidden)", { timeout: 120000 });
  await p.waitForTimeout(500);
  await j.tap(".start-screen .mw-gear", "⚙︎ Partidas guardadas");
  const s1 = await saves(p);
  const r1 = s1?.rows.find((r) => r.id === "1");
  j.check("el engranaje lista la partida: santuario, día, vehículo y sitio, cuándo se guardó y «Continuar»", !!r1 && /Partida 1 · Santuario Espacio/.test(r1.text) && /Día \d+ · Starship · Cubierta/.test(r1.text) && /Guardada el/.test(r1.text) && /Continuar/.test(r1.text), r1?.text);
  j.check("cada partida tiene «Jugar» y «Borrar» de 44 px", !!r1 && r1.buttons.length === 2 && r1.buttons.every((b) => b.w >= 44 && b.h >= 44 && !b.off), JSON.stringify(r1?.buttons));
  const bad = s1?.rows.find((r) => r.id === "3");
  j.check("la ranura dañada sale con ⊘ y por qué, solo con «Borrar», y no rompe nada", !!bad && /⊘ Partida dañada/.test(bad.text) && bad.buttons.length === 1 && bad.buttons[0].label === "Borrar", bad?.text);
  j.check("con la 3 ocupada, «Jugar sin partida guardada» usaría la 2 (no pisa ninguna)", /ranura 2/.test(s1?.freshHelp ?? ""), s1?.freshHelp);
  await capture(j, "lista", "Partidas guardadas");

  // 5. Delete: asked inside the window, never with the browser's dialog; «Cancelar» keeps it.
  await j.tap('.start-screen [data-del="1"]', "Borrar la partida 1");
  const s2 = await saves(p);
  const c2 = s2?.rows.find((r) => r.id === "1");
  j.check("«Borrar» pregunta dentro de la ventana, en su fila: «¿Borrar la partida 1? No se puede deshacer.», con «Borrar» y «Cancelar» de 44 px", !!c2 && c2.confirming && /¿Borrar la partida 1\? No se puede deshacer/.test(c2.text) && c2.buttons.map((b) => b.label).join("/") === "Borrar/Cancelar" && c2.buttons.every((b) => b.w >= 44 && b.h >= 44), JSON.stringify(c2));
  j.check("sin diálogo del navegador (window.confirm)", dialogs.length === 0, dialogs.join(" | "));
  await capture(j, "borrar", "Confirmar el borrado");
  await j.tap(".start-screen [data-del-no]", "Cancelar");
  const s3 = await saves(p);
  j.check("«Cancelar» la deja como estaba", !!s3?.rows.find((r) => r.id === "1" && !r.confirming), JSON.stringify(s3?.rows.map((r) => r.id)));
  await j.tap('.start-screen [data-del="1"]', "Borrar la partida 1");
  await j.tap('.start-screen [data-del-yes="1"]', "Sí, borrar");
  await j.tap('.start-screen [data-del="3"]', "Borrar la ranura dañada");
  await j.tap('.start-screen [data-del-yes="3"]', "Sí, borrar");
  const s4 = await saves(p);
  j.check("borradas, no queda ninguna y el 6 vuelve a decir «Jugar»", !!s4 && s4.rows.length === 0 && /Todavía no hay/.test(s4.none) && s4.card === "Jugar", JSON.stringify(s4));
  j.check("ni un diálogo del navegador en todo el borrado", dialogs.length === 0, dialogs.join(" | "));
  const left = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("codeship.partida")));
  j.check("y ya no están en el almacenamiento", left.length === 0, left.join(", "));

  // 6. «Jugar sin partida guardada»: a new game, at the LM's seat.
  await j.tap(".start-screen .ss-fresh", "Jugar sin partida guardada");
  await p.waitForFunction(() => window.codeship, null, { timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const g3 = await game(p);
  j.check("«Jugar sin partida guardada» empieza una partida nueva: en el puesto del módulo, en la ranura 1", g3.seat && !g3.ship && g3.slot === "1" && g3.days < 0.05 && g3.satiety > g2.satiety, JSON.stringify(g3));
  await capture(j, "nueva", "Partida nueva sin partida guardada");

  // 7. A reload in mid-hop (2026-11-19, «Viajes en marcha»): the Starship's programmed trip is kept and goes on.
  const set = await j.setup("la Starship sale con el módulo hacia otro asteroide (los retos del viaje se juegan en PX-36)", () => {
    const c = window.codeship;
    const t = c.nav.targets.find((x) => x.kind === "asteroid" && x.id !== c.expedition.asteroid.data.id && c.nav.canCarry(x).ok);
    return t ? c.nav.carry(t.id) : { ok: false, reason: "sin destino" };
  });
  if (!j.check("la Starship vuela sola hacia el asteroide", set?.ok, JSON.stringify(set))) return;
  await p.waitForTimeout(8000);
  const h1 = await trip(p);
  j.check("en vuelo: entre el origen y el destino, con fase y avance", h1.status === "carrier" && h1.fraction > 0 && h1.fraction < 1 && h1.fromStartM > 1 && h1.toGoalM > 1000, JSON.stringify(h1));
  await j.tap(".flight-bar .dock-btn", "⊘ Desacoplar (la Starship va de viaje)");
  await p.waitForTimeout(500);
  const lock = await p.evaluate(() => ({ dock: window.codeship.docking.dockedTo?.id ?? null, label: document.querySelector(".flight-bar .dock-btn")?.getAttribute("aria-label"), locked: document.querySelector(".flight-bar .dock-btn")?.classList.contains("locked"), said: document.body.innerText.includes("se desacopla cuando aparque") }));
  j.check("en viaje el módulo no se desacopla: el interruptor sale bloqueado con el porqué y tocarlo no lo suelta", lock.dock === "nodriza" && lock.locked && lock.said && /⊘ Desacoplar: .*en viaje/.test(lock.label ?? ""), JSON.stringify(lock));
  await capture(j, "viaje-antes", "La Starship de viaje antes de recargar");
  await p.reload();
  await p.waitForSelector(".start-screen:not(.hidden)", { timeout: 120000 });
  await enterGame(p, { resume: true });
  await p.waitForTimeout(2500);
  const h2 = await trip(p);
  j.check(
    "«Continuar» a medio viaje: la Starship sigue volando hacia el mismo asteroide, entre el origen y el destino, con el avance de antes",
    h2.status === "carrier" && h2.target === h1.target && h2.fraction >= h1.fraction - 0.02 && h2.fraction < h1.fraction + 0.1 && h2.fromStartM > 1 && h2.toGoalM > 1000 && Math.abs(h2.etaRealS - h1.etaRealS) < 20,
    JSON.stringify({ antes: h1, ahora: h2 }),
  );
  j.check("con el módulo aún acoplado y «Trayecto» en el menú con el viaje", h2.dock === "nodriza" && !!h2.status6 && h2.status6.destination && h2.status6.fraction > 0, JSON.stringify(h2.status6));
  await j.tap(".flight-bar .trip-btn", "Trayecto");
  await p.waitForFunction(() => /Llega en/.test(document.querySelector(".trip-window:not(.hidden)")?.textContent ?? ""), null, { timeout: 10000 }).catch(() => {});
  const tw = await p.evaluate(() => document.querySelector(".trip-window:not(.hidden)")?.textContent ?? "");
  j.check("«Trayecto» dice adónde va y cuánto falta", /Destino/.test(tw) && /Llega en/.test(tw), tw);
  await capture(j, "viaje-recuperado", "El viaje sigue tras «Continuar»");
  await p.waitForTimeout(3000);
  const h3 = await trip(p);
  j.check("y sigue en marcha (avanza)", h3.status === "carrier" && h3.fraction > h2.fraction, JSON.stringify({ antes: h2.fraction, ahora: h3.fraction }));
  await j.setup("se para el viaje", () => window.codeship.nav.cancel());

  // 8. A reload in mid-cruise to Bennu (after level 3's launch): the cruise is kept, not arrived.
  await j.setup("la partida llega del lanzamiento del santuario 3 en la ranura 2 (el traspaso; PX-48 juega el lanzamiento)", () => {
    const state = { boardDays: 3.2, fromLaunch: { posts: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], cruiseDays: 816 } };
    localStorage.setItem("codeship.partida.2", JSON.stringify({ format: 1, level: 6, savedAt: new Date().toISOString(), boardDay: 4, summary: { vehicle: "Starship", place: "Crucero a Bennu" }, state }));
    sessionStorage.setItem("codeship.seguir", "2");
  });
  await p.reload();
  await p.waitForFunction(() => window.codeship?.cruise, null, { timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(10000);
  const k1 = await trip(p);
  j.check("del lanzamiento: el crucero a Bennu en marcha, sin asteroides a la vista, en la ranura 2", !!k1.cruise?.active && k1.cruise.left < k1.cruise.total && !k1.rocks && k1.slot === "2", JSON.stringify(k1));
  j.check("en crucero el módulo no se desacopla, y lo dice", k1.dock === "nodriza" && !k1.canUndock.ok && /crucero/.test(k1.canUndock.reason ?? ""), JSON.stringify(k1.canUndock));
  await p.reload();
  await p.waitForSelector(".start-screen:not(.hidden)", { timeout: 120000 });
  await enterGame(p, { resume: true });
  await p.waitForTimeout(2500);
  const k2 = await trip(p);
  j.check(
    "«Continuar» a medio crucero: sigue de camino a Bennu (no aparece allí), con lo que faltaba y sin asteroides a la vista",
    !!k2.cruise?.active && k2.slot === "2" && !k2.rocks && k2.cruise.left <= k1.cruise.left + 1 && k2.cruise.left > k1.cruise.left - 15,
    JSON.stringify({ antes: k1.cruise, ahora: k2.cruise }),
  );
  await j.tap(".room-ui:not(.hidden) .trip-btn", "Trayecto");
  await p.waitForFunction(() => /Llega en/.test(document.querySelector(".trip-window:not(.hidden)")?.textContent ?? ""), null, { timeout: 10000 }).catch(() => {});
  const tw2 = await p.evaluate(() => document.querySelector(".trip-window:not(.hidden)")?.textContent ?? "");
  j.check("la ventana «Trayecto» del menú: Starship → Bennu, fase Crucero y cuánto falta", /Starship → Bennu/.test(tw2) && /Crucero/.test(tw2) && /Llega en/.test(tw2), tw2);
  const chip = await p.evaluate(() => !!document.querySelector(".cruise-chip.on"));
  j.check("fuera del puesto de pilotaje la ficha del crucero no sale (reglas.md §3.8): lo dice «Trayecto»", !chip);
  j.check("«Trayecto» lo enseña: Starship → Bennu, en crucero", k2.status6?.destination === "Bennu" && k2.status6?.phase === "Crucero" && k2.status6.fraction > 0, JSON.stringify(k2.status6));
  j.check("y el módulo sigue acoplado y bloqueado", k2.dock === "nodriza" && !k2.canUndock.ok, JSON.stringify(k2.canUndock));
  await capture(j, "crucero-recuperado", "El crucero a Bennu sigue tras «Continuar»");
}
