// PX-44 The start screen (Berón, 2026-11-18; docs/design/santuario3-iniciacion.md §5), on an iPhone 13 with taps.
// It comes before the game on every load: the map window (src/ui/map-window.ts) with the six sanctuaries on Cold
// Sanctuary's «depth = danger» axis on top, which a finger turns and a pinch zooms (reglas.md §5.7), and a card for
// each under it with its description and a 44 px button. 6 and 3 start (3's card still says its training challenges
// are being built; its game: PX-45); 1, 2, 4 and 5 say «Próximamente». No tree menu: there is no game yet. «Jugar» on 6 starts the game of
// now; with a kept game the button is «Continuar» (the gear's saved games: PX-50). Captures in docs/screenshots/inicio-<pantalla>-movil.png.
import { mkdirSync } from "node:fs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(400);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/inicio-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

/** What the start screen shows: the map's view and nodes, the cards and the tools. */
const start = (p) =>
  p.evaluate(() => {
    const w = document.querySelector(".start-screen:not(.hidden)");
    if (!w) return null;
    const s = window.codeshipInicio.state;
    const c = w.querySelector(".nav-canvas canvas").getBoundingClientRect();
    const side = w.querySelector(".nav-side").getBoundingClientRect();
    return {
      ...s,
      canvas: { w: Math.round(c.width), h: Math.round(c.height), top: Math.round(c.top), bottom: Math.round(c.bottom) },
      side: { top: Math.round(side.top), bottom: Math.round(side.bottom) },
      rows: [...w.querySelectorAll(".mw-row")].map((r) => {
        const go = r.querySelector(".mw-go");
        const g = go.getBoundingClientRect();
        return { id: r.dataset.row, name: r.querySelector(".mw-pick b")?.textContent ?? "", desc: r.querySelector(".mw-pick span")?.textContent ?? "", lock: r.querySelector(".mw-lock")?.textContent.trim() ?? "", action: go.textContent, off: go.disabled, gw: g.width, gh: g.height, on: r.classList.contains("on") };
      }),
      tools: [...w.querySelectorAll(".nav-tools button")].map((b) => { const r = b.getBoundingClientRect(); return { label: b.getAttribute("aria-label") ?? b.textContent, w: r.width, h: r.height }; }),
      menu: [...document.querySelectorAll(".root-menu")].some((m) => m.checkVisibility()),
      game: !!window.codeship,
    };
  });

/** One finger dragging sideways across the canvas. */
async function dragAcross(p, box) {
  const cdp = await p.context().newCDPSession(p);
  const y = box.y + box.height / 2;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width * 0.3, y, id: 1 }] });
  for (const f of [0.4, 0.5, 0.6, 0.7]) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x + box.width * f, y: y + 20 * f, id: 1 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

/** Two fingers on the canvas moving apart (a pinch out). */
async function pinchOut(p, box) {
  const cdp = await p.context().newCDPSession(p);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const pts = (d) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts(30) });
  for (const d of [45, 60, 75, 90]) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts(d) });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

const nodeAt = (s, id) => s.nodes.find((n) => n.id === id);

export async function inicio(j) {
  const p = j.page;
  // 1. Before the game: the start screen, with no game and no tree menu.
  const s0 = await start(p);
  j.check("al cargar sale la pantalla de inicio, antes de la partida", !!s0 && !s0.game, JSON.stringify(s0 && { game: s0.game }));
  if (!s0) return;
  j.check("en el inicio no hay menú árbol", !s0.menu);
  j.check("arriba el mapa 3D de los santuarios (al menos 300×150) y debajo la lista, sin pisarse, en 390×664", s0.canvas.w >= 300 && s0.canvas.h >= 150 && s0.side.top >= s0.canvas.bottom - 1 && s0.side.bottom <= 664, JSON.stringify({ canvas: s0.canvas, side: s0.side }));
  j.check("sus herramientas (+, −, Cenital y el engranaje de las partidas guardadas) miden 44 px y no hay ×: se sale eligiendo", s0.tools.length === 4 && s0.tools[3].label === "Partidas guardadas" && s0.tools.every((t) => t.w >= 44 && t.h >= 44), JSON.stringify(s0.tools));
  j.check("el mapa dibuja los seis santuarios", s0.nodes.length === 6, JSON.stringify(s0.nodes.map((n) => n.id)));
  // The «depth = danger» axis: space on top, then the air, the land, the sea, the rock and the core at the bottom.
  const order = [...s0.nodes].sort((a, b) => a.y - b.y).map((n) => n.id);
  j.check("en el eje profundidad = peligro: el espacio arriba, luego el aéreo y el terrestre; el núcleo abajo del todo", order[0] === "espacio" && order[1] === "aereo" && order[order.length - 1] === "nucleo", order.join(" > "));
  // 2. The cards: one per sanctuary, with what it is and a 44 px button; 6 and 3 start.
  j.check("una tarjeta por santuario, cada una con su descripción y su botón de 44 px", s0.rows.length === 6 && s0.rows.every((r) => r.desc.length > 30 && r.gw >= 44 && r.gh >= 44), JSON.stringify(s0.rows.map((r) => [r.id, r.gw, r.gh])));
  const row = (s, id) => s.rows.find((r) => r.id === id);
  j.check("se pueden jugar el 6 (Espacio), el 3 (Aéreo) y el 1 (Terrestre); el 6 empieza elegido", !row(s0, "espacio")?.off && !row(s0, "aereo")?.off && !row(s0, "terrestre")?.off && s0.rows.filter((r) => !r.off).length === 3 && s0.picked === "espacio" && row(s0, "espacio")?.on, JSON.stringify(s0.rows.map((r) => [r.id, r.off, r.on])));
  j.check("el 3 dice en su descripción que los retos de entrenamiento están «En construcción», sin candado", !row(s0, "aereo")?.lock && /En construcción: los retos de los puestos de entrenamiento/.test(row(s0, "aereo")?.desc ?? ""), row(s0, "aereo")?.desc);
  j.check("2, 4 y 5 dicen «Próximamente», con su candado; el 1 se juega (santuario 1)", ["marino", "subterraneo", "nucleo"].every((id) => row(s0, id)?.off && /⊘\s*Próximamente/.test(row(s0, id)?.lock ?? "")), JSON.stringify(s0.rows.map((r) => [r.id, r.lock])));
  await capture(j, "mapa", "Inicio: mapa de santuarios y tarjetas");

  // 3. A finger turns the map, a pinch zooms it, «+» and «−» too.
  const canvas = await p.locator(".start-screen .nav-canvas canvas").boundingBox();
  await dragAcross(p, canvas);
  await p.waitForTimeout(200);
  const s1 = await start(p);
  j.check("arrastrar el dedo por el mapa lo gira", Math.abs(s1.yaw - s0.yaw) > 0.05, `${s0.yaw} → ${s1.yaw}`);
  await pinchOut(p, canvas);
  await p.waitForTimeout(200);
  const s2 = await start(p);
  j.check("pellizcar hacia fuera lo amplía", s2.zoom > s1.zoom * 1.3, `${s1.zoom} → ${s2.zoom}`);
  await j.tap('.start-screen [data-act="zout"]', "Alejar");
  await j.tap('.start-screen [data-act="zout"]', "Alejar");
  const s3 = await start(p);
  j.check("«−» lo aleja", s3.zoom < s2.zoom, `${s2.zoom} → ${s3.zoom}`);

  // 4. A tap on a node: one that comes later is not picked; 3 is, and its card can start.
  const later = nodeAt(s3, "nucleo");
  if (later) await p.touchscreen.tap(later.x, later.y);
  await p.waitForTimeout(250);
  const s4 = await start(p);
  j.check("tocar en el mapa un santuario que viene más tarde no lo elige", s4.picked === "espacio", s4.picked);
  const air = nodeAt(s4, "aereo");
  if (air) await p.touchscreen.tap(air.x, air.y);
  await p.waitForTimeout(300);
  const s5 = await start(p);
  j.check("tocar el 3 en el mapa lo elige y su tarjeta se marca, con «Jugar» encendido", s5.picked === "aereo" && row(s5, "aereo")?.on && !row(s5, "aereo")?.off, JSON.stringify({ picked: s5.picked, air }));
  await capture(j, "girado", "Inicio: el mapa girado y el 3 elegido");
  // A tap on a later card does not pick it either (it is marked aria-disabled: a finger on it all the same).
  await j.tapAt(p.locator('.start-screen .mw-pick[data-pick="marino"]'));
  const s6 = await start(p);
  j.check("tocar la tarjeta de un santuario que viene más tarde no lo elige", s6.picked === "aereo" && !s6.game, s6.picked);

  // 5. «Jugar» on 6: the game of now starts, and the start screen is gone.
  await j.tap('.start-screen .mw-pick[data-pick="espacio"]', "Tarjeta: Santuario Espacio");
  await j.tap('.start-screen .mw-go[data-go="espacio"]', "Jugar: Santuario Espacio");
  await p.waitForFunction(() => window.codeship, null, { timeout: 120000 }).catch(() => {});
  await p.waitForFunction(() => performance.getEntriesByName("codeship-primer-fotograma").length > 0, null, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const inGame = await p.evaluate(() => ({ game: !!window.codeship, start: !!document.querySelector(".start-screen"), menu: [...document.querySelectorAll(".root-menu")].some((m) => m.checkVisibility()), first: performance.getEntriesByName("codeship-primer-fotograma").length > 0 }));
  j.check("«Jugar» en el 6 empieza la partida de ahora y el inicio desaparece", inGame.game && inGame.first && !inGame.start, JSON.stringify(inGame));
  j.check("en la partida vuelve el menú árbol", inGame.menu, JSON.stringify(inGame));
  await capture(j, "partida", "La partida tras el inicio");

  // 6. A kept game (docs/design/partidas.md; PX-50 plays it whole): the game saved itself when the page was hidden
  // by the reload, so its level's button says «Continuar», and it starts the game too.
  await p.reload();
  await p.waitForSelector(".start-screen:not(.hidden)", { timeout: 120000 });
  await p.waitForTimeout(500);
  const s7 = await start(p);
  j.check("con una partida guardada, el botón del 6 dice «Continuar» (el único); el 3 y el 1 siguen con «Jugar»", row(s7, "espacio")?.action === "Continuar" && s7.rows.filter((r) => r.action === "Continuar").length === 1 && row(s7, "aereo")?.action === "Jugar" && row(s7, "terrestre")?.action === "Jugar" && s7.rows.filter((r) => !r.off).length === 3, JSON.stringify(s7.rows.map((r) => [r.id, r.action, r.off])));
  await capture(j, "continuar", "Inicio con una partida guardada");
  await j.tap('.start-screen .mw-go[data-go="espacio"]', "Continuar");
  await p.waitForFunction(() => window.codeship, null, { timeout: 120000 }).catch(() => {});
  j.check("«Continuar» entra en la partida", await p.evaluate(() => !!window.codeship && !document.querySelector(".start-screen")));
}
