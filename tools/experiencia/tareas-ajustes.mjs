// PX-42 The general tree menu, «Panel», «Áreas» and the task list's settings (docs/design/reglas.md §5.7–5.9,
// ux-acciones.md §Menú árbol, areas.md, viaje-a-una-tarea.md §Ajustes de tareas; Berón 2026-11-18), on an
// iPhone 13 with taps. With the Switch pad (ui/game-pad.ts) Vista, Tareas and Áreas are on its capture, «+» and «−»; the gear shows only for the rest (
// Trayecto while a trip runs); only its own X folds it. A machine's card never pops up: the orange interaction
// button under the root (outside the menu, only at a machine; Berón 2026-11-19) shows it and turns into the X that hides it. «Áreas» is the Navigation window for the vehicle: a 3D map
// that turns with a finger and zooms with a pinch, and under it the areas with what is there and «Ir». Tareas and
// Áreas cover the screen, the menu hides under them and comes back as it was. The task list keeps its group chips;
// its gear has «Viaje / Teletransporte» and the vehicle («Automático»: only where she is). Captures in
// docs/screenshots/tareas-ajustes-<pantalla>-movil.png.
import { mkdirSync } from "node:fs";
import { enterGame } from "./lib.mjs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(500);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/tareas-ajustes-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

const GEAR = '.task-board .board-head [data-view][aria-label="Ajustes de tareas"]';
const LIST = '.task-board .board-head [data-view][aria-label="Volver a la lista de tareas"]';

/** What the open board shows: its view, the «Ir» tasks with their vehicle, the scope line and the checked choices. */
const board = (p) =>
  p.evaluate(() => {
    const el = document.querySelector(".task-board:not(.hidden)");
    if (!el) return null;
    const all = window.codeship.tasks();
    const ids = [...el.querySelectorAll(".tb-go")].map((b) => b.dataset.go);
    const vis = (sel) => [...el.querySelectorAll(sel)].filter((x) => x.getBoundingClientRect().width > 0).length;
    return {
      title: el.querySelector(".board-head b")?.textContent,
      toggle: el.querySelector("[data-view]")?.getAttribute("aria-label"),
      close: el.querySelector("[data-close]")?.getAttribute("aria-label"),
      vehicles: [...new Set(ids.map((id) => all.find((t) => t.id === id)?.place.vehicle))],
      n: ids.length,
      total: all.length,
      scope: el.querySelector(".tb-scope")?.textContent ?? "",
      travel: vis(".tb-travel"),
      chips: vis("[data-group]"),
      vehicleChoices: vis("[data-vehicle]"),
      checkedVehicle: el.querySelector('[data-vehicle][aria-checked="true"]')?.dataset.vehicle,
      checkedTravel: el.querySelector('[data-travel][aria-checked="true"]')?.dataset.travel,
      saved: JSON.parse(localStorage.getItem("codeship.ajustes") ?? "{}").taskVehicle,
    };
  });

/** The header's two buttons sit side by side at the top right, 44 px or more, without touching. */
async function headerButtons(j, what) {
  const r = await j.page.evaluate(() => {
    const box = (s) => document.querySelector(`.task-board:not(.hidden) ${s}`)?.getBoundingClientRect();
    const a = box("[data-view]");
    const b = box("[data-close]");
    return a && b ? { a: { x: a.x, r: a.right, w: a.width, h: a.height, y: a.y }, b: { x: b.x, r: b.right, w: b.width, h: b.height, y: b.y }, vw: innerWidth } : null;
  });
  j.check(`${what}: [⚙︎][✕] juntos arriba a la derecha, de 44 px o más y sin tocarse`, !!r && r.a.w >= 44 && r.a.h >= 44 && r.b.w >= 44 && r.b.h >= 44 && r.a.r <= r.b.x && r.b.r <= r.vw && Math.abs(r.a.y - r.b.y) < 2, JSON.stringify(r));
}

/** The tree menu on screen now: its root and the icons out, top to bottom. */
const menu = (p) =>
  p.evaluate(() => {
    const m = [...document.querySelectorAll(".root-menu")].find((x) => x.checkVisibility());
    if (!m) return null;
    const root = m.querySelector(".rm-root");
    const r = root.getBoundingClientRect();
    return {
      open: m.classList.contains("open"),
      root: root.getAttribute("aria-label"),
      rootAt: { right: Math.round(innerWidth - r.right), top: Math.round(r.top), w: r.width, h: r.height },
      out: [...m.querySelectorAll(".rm-shoots > button")].filter((b) => b.checkVisibility({ visibilityProperty: true })).map((b) => ({ label: b.getAttribute("aria-label"), y: Math.round(b.getBoundingClientRect().top), w: b.offsetWidth, h: b.offsetHeight })),
    };
  });

/** The Switch pad (ui/game-pad.ts): shown, and the jobs of its buttons. */
const padNow = (p) =>
  p.evaluate(() => {
    const pad = document.querySelector(".switch-pad:not(.hidden)");
    const on = [...document.querySelectorAll(".switch-pad .ap-btn:not(.free)")].map((b) => b.getAttribute("aria-label"));
    return { shown: !!pad?.checkVisibility(), on };
  });
const padHas = (pd, ...labels) => pd.shown && labels.every((l) => pd.on.some((o) => o.startsWith(l)));

/** The Áreas window: its map's view, the rows under it and what is picked. */
const areas = (p) =>
  p.evaluate(() => {
    const w = document.querySelector(".areas-window:not(.hidden)");
    if (!w) return null;
    const a = window.codeship.areasWindow;
    const c = w.querySelector(".nav-canvas canvas").getBoundingClientRect();
    return {
      label: w.getAttribute("aria-label"),
      scope: w.querySelector(".tb-scope")?.textContent ?? "",
      canvas: { w: Math.round(c.width), h: Math.round(c.height), top: Math.round(c.top) },
      yaw: a.yaw,
      elevation: a.elevation,
      zoom: a.zoom,
      picked: a.picked,
      boxes: a.screen.map((s) => ({ id: s.id, x: Math.round(c.left + s.c.x), y: Math.round(c.top + s.c.y) })),
      rows: [...w.querySelectorAll(".ar-row")].map((r) => {
        const go = r.querySelector(".tb-go").getBoundingClientRect();
        return { id: r.dataset.row, name: r.querySelector(".ar-pick b")?.textContent, desc: r.querySelector(".ar-pick span")?.textContent ?? "", go: r.querySelector(".tb-go").getAttribute("aria-label"), gw: go.width, gh: go.height, on: r.classList.contains("on") };
      }),
      tools: [...w.querySelectorAll(".nav-tools button")].map((b) => { const r = b.getBoundingClientRect(); return { label: b.getAttribute("aria-label") ?? b.textContent, w: r.width, h: r.height, top: Math.round(r.top) }; }),
      overText: [...w.querySelectorAll(".nav-head *")].filter((e) => !e.closest("button") && e.children.length === 0 && e.textContent.trim()).map((e) => e.textContent),
    };
  });

/** Two fingers on the canvas moving apart (a pinch out), by the browser's touch events. */
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

/** One finger dragging sideways across the canvas. */
async function dragAcross(p, box) {
  const cdp = await p.context().newCDPSession(p);
  const y = box.y + box.height / 2;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width * 0.3, y, id: 1 }] });
  for (const f of [0.4, 0.5, 0.6, 0.7]) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x + box.width * f, y: y + 20 * f, id: 1 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

export async function tareasAjustes(j) {
  const p = j.page;
  // 0. The tree menu with the Switch pad (reglas.md §5.7–5.8, 2026-11-19): Vista, Tareas and Áreas are on the pad (capture, +, −),
  // so they do not sprout from the gear and the gear is not out; the orange interaction button stays under the root.
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await p.waitForTimeout(1200);
  const m0 = await menu(p);
  const pd0 = await padNow(p);
  j.check("en el habitáculo del LM, Vista, Tareas y Áreas están en el mando de la Switch (captura, «+», «−») y no brota nada del engranaje, que no sale", !!m0 && !m0.open && m0.out.length === 0 && m0.rootAt.w === 0 && padHas(pd0, "Vista", "Tareas", "Áreas", "Ajustes", "Acercar"), JSON.stringify({ m0, pd0 }));
  const card0 = await p.evaluate(() => [...document.querySelectorAll(".cab-machine:not(.hidden)")].some((c) => c.checkVisibility()));
  j.check("de pie junto al puesto del comandante, su tarjeta no sale sola", !card0);
  await capture(j, "menu-cerrado", "Menú árbol cerrado");
  const m1 = await menu(p);
  const labels = m1?.out.map((b) => b.label) ?? [];
  const act = () => p.evaluate(() => { const b = [...document.querySelectorAll(".room-ui:not(.hidden) .rm-act")].find((x) => x.checkVisibility()); return b ? { label: b.getAttribute("aria-label"), open: b.classList.contains("rm-open"), inMenu: !!b.closest(".rm-shoots") } : null; });
  const a0 = await act();
  j.check("junto a una máquina sale el botón naranja de interacción bajo la raíz, fuera de lo que brota del menú", !!a0 && !a0.inMenu && !a0.open && !labels.includes("Panel"), `${labels.join(" / ")} · ${JSON.stringify(a0)}`);
  await capture(j, "menu-abierto", "Menú árbol abierto");

  // 0a. «Panel» shows the machine's card and turns into the X that hides it; the menu stays open all along.
  await j.tap(".room-ui:not(.hidden) .rm-act", "Panel");
  await p.waitForTimeout(300);
  const card1 = await p.evaluate(() => [...document.querySelectorAll(".cab-machine:not(.hidden)")].find((c) => c.checkVisibility())?.querySelector(".cm-head b")?.textContent);
  const m1b = await menu(p);
  const a1 = await act();
  j.check("el botón naranja muestra la tarjeta de la máquina y pasa a ser la X que la oculta; el menú sigue como estaba", !!card1 && m1b?.open === m1?.open && !!a1?.open && /^Cerrar/.test(a1.label ?? ""), `${card1} · ${JSON.stringify(a1)}`);
  await capture(j, "panel", "Panel de la máquina desde el menú");
  await j.tap(".room-ui:not(.hidden) .rm-act.rm-open", "X del menú: Cerrar panel");
  await p.waitForTimeout(300);
  const card2 = await p.evaluate(() => [...document.querySelectorAll(".cab-machine:not(.hidden)")].some((c) => c.checkVisibility()));
  const m1c = await menu(p);
  const a2 = await act();
  j.check("la X del botón naranja oculta la tarjeta y el menú sigue como estaba", !card2 && m1c?.open === m1?.open && !!a2 && !a2.open, JSON.stringify(a2));

  // 0b. «Áreas»: the Navigation window for the LM; the menu hides under it.
  await j.tap(".room-ui:not(.hidden) .areas-btn", "Áreas");
  await p.waitForTimeout(600);
  const ar = await areas(p);
  j.check("«Áreas» abre a toda pantalla el mapa 3D del LM (donde está, automático) y debajo sus áreas", !!ar && /^Módulo \(automático\) · Viaje/.test(ar.scope) && ar.canvas.w >= 300 && ar.canvas.h >= 150 && ar.rows.length >= 5 && ar.boxes.length === ar.rows.length && ar.rows.some((r) => r.id === "ecs"), JSON.stringify(ar));
  j.check("cada área dice lo que hay y tiene su «Ir» de 44 px", !!ar && ar.rows.every((r) => r.desc.length > 3 && /^Ir a /.test(r.go) && r.gw >= 44 && r.gh >= 44), JSON.stringify(ar?.rows));
  j.check("arriba solo los botones (+, −, Cenital, ⚙︎, ×) de 44 px, sin texto encima del mapa", !!ar && ar.overText.length === 0 && ar.tools.length === 5 && ar.tools.every((t) => t.w >= 44 && t.h >= 44), JSON.stringify(ar && { tools: ar.tools, overText: ar.overText }));
  j.check("con Áreas abierta el menú se oculta", !(await menu(p)));
  await capture(j, "areas-modulo", "Áreas: mapa 3D del LM");
  // A finger turns it, a pinch zooms it (reglas.md §5.7, its one exception), and «+» zooms too.
  const canvas = await p.locator(".areas-window .nav-canvas canvas").boundingBox();
  await dragAcross(p, canvas);
  await p.waitForTimeout(200);
  const turned = await areas(p);
  j.check("arrastrar el dedo por el mapa lo gira", !!turned && Math.abs(turned.yaw - ar.yaw) > 0.05, `${ar?.yaw} → ${turned?.yaw}`);
  await pinchOut(p, canvas);
  await p.waitForTimeout(200);
  const pinched = await areas(p);
  j.check("pellizcar hacia fuera lo amplía", !!pinched && pinched.zoom > turned.zoom * 1.3, `${turned?.zoom} → ${pinched?.zoom}`);
  await j.tap('.areas-window [data-act="zout"]', "Alejar");
  await j.tap('.areas-window [data-act="zout"]', "Alejar");
  // A tap on a box picks it, and its row lights up.
  const target = (await areas(p)).boxes.find((b) => b.id === "esterilla");
  if (target) {
    await p.touchscreen.tap(target.x, target.y);
    await p.waitForTimeout(300);
  }
  const picked = await areas(p);
  j.check("tocar un área del mapa la elige y se marca en la lista", !!picked?.picked && picked.rows.some((r) => r.on && r.id === picked.picked), JSON.stringify({ picked: picked?.picked, target }));
  await capture(j, "areas-girado", "Áreas: el mapa girado y ampliado con el dedo");
  // Its gear: the same shared settings as the task list (no «Todos»: the map shows one vehicle).
  await j.tap('.areas-window [data-view][aria-label="Ajustes de áreas"]', "⚙︎ Ajustes de áreas");
  const as = await p.evaluate(() => ({ travel: [...document.querySelectorAll(".areas-window [data-travel]")].map((b) => b.dataset.travel + (b.getAttribute("aria-checked") === "true" ? "*" : "")), vehicles: [...document.querySelectorAll(".areas-window [data-vehicle]")].map((b) => b.dataset.vehicle + (b.getAttribute("aria-checked") === "true" ? "*" : "")), back: !!document.querySelector('.areas-window [data-view][aria-label="Volver al mapa de áreas"]') }));
  j.check("el engranaje cambia el mapa por los ajustes compartidos (Viaje/Teletransporte y el vehículo) y pasa a icono de lista", as.back && as.travel.join() === "viaje*,teletransporte" && as.vehicles.join() === "auto*,nodriza,estacion,modulo", JSON.stringify(as));
  await capture(j, "areas-ajustes", "Ajustes de Áreas");
  await j.tap('.areas-window [data-vehicle="estacion"]', "Vehículo: Estación");
  await j.tap('.areas-window [data-view][aria-label="Volver al mapa de áreas"]', "Mapa de áreas");
  const st = await areas(p);
  j.check("con «Estación», el mapa y la lista son los de la ISS (Harmony, Destiny…)", !!st && st.rows.some((r) => /Harmony/.test(r.name)) && st.rows.some((r) => /Destiny/.test(r.name)) && st.boxes.length === st.rows.length, JSON.stringify(st?.rows.map((r) => r.name)));
  await capture(j, "areas-estacion", "Áreas: mapa de la estación");
  await j.tap('.areas-window [data-view][aria-label="Ajustes de áreas"]', "⚙︎ Ajustes de áreas");
  await j.tap('.areas-window [data-vehicle="auto"]', "Vehículo: Automático");
  await j.tap('.areas-window [data-view][aria-label="Volver al mapa de áreas"]', "Mapa de áreas");
  await j.tap('.areas-window .tb-go[data-area="ecs"]', "Ir: Panel del ECS");
  await p.waitForTimeout(400);
  const walk = await p.evaluate(() => ({ active: window.codeship.journey.active, legs: window.codeship.journey.plan.map((l) => `${l.kind} ${l.to}`), open: !!document.querySelector(".areas-window:not(.hidden)") }));
  j.check("«Ir» en «Panel del ECS» cierra Áreas y ella va andando por el camino real (Viaje)", !walk.open && (walk.active ? walk.legs.some((l) => /^andar modulo:ecs/.test(l)) : true), JSON.stringify(walk));
  const m6 = await menu(p);
  const pd6 = await padNow(p);
  // While «Ir» walks her the pad hides (reglas.md §3.3: no move controls on an automatic trip); Áreas stays on its «−».
  const going = await p.evaluate(() => document.body.classList.contains("in-journey"));
  j.check("al cerrarse Áreas el menú vuelve tal como estaba y Áreas sigue en «−» del mando (oculto mientras «Ir» la lleva)", m6?.open === m1?.open && (going || pd6.shown) && pd6.on.some((o) => o.startsWith("Áreas")), JSON.stringify({ m6, pd6, going }));
  await p.waitForFunction(() => !window.codeship.journey.active, null, { timeout: 60000 }).catch(() => {});
  const near = await p.evaluate(() => window.codeship.cabin.near());
  j.check("y llega al panel del ECS, sin que su tarjeta salga sola", near === "ecs" && !(await p.evaluate(() => [...document.querySelectorAll(".cab-machine:not(.hidden)")].some((c) => c.checkVisibility()))), String(near));
  await capture(j, "areas-llega", "Llega al panel del ECS desde Áreas");

  // 1. A new game: she is in the LM. The list shows only the LM's tasks (automatic): none at the start.
  await j.tap(".room-ui:not(.hidden) .cab-tasks", "Tareas");
  await p.waitForTimeout(400);
  j.check("con la lista abierta el menú se oculta (la lista ocupa la pantalla y tiene su propio cierre)", !(await menu(p)));
  const l1 = await board(p);
  j.check("la lista abre con [⚙︎ Ajustes de tareas][✕ Cerrar tareas]", l1?.title === "Tareas" && l1.toggle === "Ajustes de tareas" && l1.close === "Cerrar tareas", JSON.stringify(l1));
  await headerButtons(j, "Lista");
  const wide = await p.evaluate(() => { const r = document.querySelector(".task-board:not(.hidden)").getBoundingClientRect(); return { left: r.left, right: innerWidth - r.right }; });
  j.check("la lista toma su ancho completo de siempre (no deja una columna para el menú)", wide.left <= 20 && wide.right <= 20, JSON.stringify(wide));
  j.check("en la lista no están el interruptor ni el vehículo (están en los ajustes)", l1?.travel === 0 && l1.vehicleChoices === 0, JSON.stringify(l1));
  const empty = (await j.texts(".task-board .tb-empty, .task-board .tb-hint")).join(" ");
  j.check("«Automático» por defecto: en el LM solo salen las tareas del módulo (ninguna al empezar), y lo dice con la pista", l1?.vehicles.every((v) => v === "modulo") && /En el módulo \(automático\)/.test(l1.scope) && l1.n === 0 && /Nada pendiente en el módulo/.test(empty) && /tareas más en otros vehículos: ⚙︎ Ajustes de tareas › Todos/.test(empty), `${JSON.stringify(l1)} · ${empty}`);
  await capture(j, "lista-modulo", "Lista en el LM");

  // 2. The gear: the settings replace the list, and the gear turns into a list icon.
  await j.tap(GEAR, "⚙︎ Ajustes de tareas");
  const s1 = await board(p);
  j.check("⚙︎ cambia la lista por sus ajustes y el engranaje pasa a ser el icono de lista", s1?.title === "Ajustes de tareas" && s1.toggle === "Volver a la lista de tareas" && s1.n === 0, JSON.stringify(s1));
  j.check("los ajustes llevan Viaje/Teletransporte y los cinco vehículos (los grupos van en la lista)", s1?.travel === 1 && s1.vehicleChoices === 5 && s1.chips === 0, JSON.stringify(s1));
  j.check("«Viaje» y «Automático» elegidos por defecto", s1?.checkedTravel === "viaje" && s1.checkedVehicle === "auto", JSON.stringify(s1));
  const vehicles = await j.texts(".task-board [data-vehicle]");
  j.check("«Automático: donde está ella» dice dónde está ahora (Módulo)", /^Automático: donde está ella Módulo/.test(vehicles[0] ?? "") && vehicles.slice(1).map((v) => v.replace(/ \d+$/, "")).join("/") === "Nave (Starship)/Estación/Módulo/Todos", vehicles.join(" / "));
  await headerButtons(j, "Ajustes");
  await capture(j, "ajustes", "Ajustes de la lista");

  // 3. Station by hand: back to the list, which shows only the station's tasks and its group chips.
  await j.tap('.task-board [data-vehicle="estacion"]', "Vehículo: Estación");
  j.check("«Estación» queda marcada y se guarda en codeship.ajustes", (await board(p))?.checkedVehicle === "estacion" && (await board(p))?.saved === "estacion");
  await j.tap(LIST, "Lista de tareas");
  const l2 = await board(p);
  j.check("el icono de lista vuelve a la lista: solo tareas de la estación, cada una con «Ir», y los chips de grupo", l2?.toggle === "Ajustes de tareas" && l2.vehicles.join() === "estacion" && l2.n > 0 && /En la estación · /.test(l2.scope) && l2.chips >= 2, JSON.stringify(l2));
  await capture(j, "lista-estacion", "Lista filtrada a la estación");

  // 4. A group chip in the list: only its tasks, and the scope line says so.
  const chip = await p.evaluate(() => document.querySelector('.task-board .tb-chips [data-group]:not([data-group=""])')?.dataset.group);
  if (chip) {
    await j.tap(`.task-board .tb-chips [data-group="${chip}"]`, `Grupo: ${chip}`);
    const g = await p.evaluate(() => [...document.querySelectorAll(".task-board .tb-group")].map((h) => h.textContent));
    j.check("un chip de grupo deja en la lista solo ese grupo, y la línea de arriba lo dice", g.length === 1 && (await board(p))?.scope.includes(g[0]), `${g.join(", ")} · ${(await board(p))?.scope}`);
  } else j.check("la estación tiene al menos un grupo de tareas", false);
  // The list's own ✕ closes it, and the menu comes back as it was: open.
  await j.tap(".task-board [data-close]", "Cerrar tareas");
  await p.waitForTimeout(300);
  const m3 = await menu(p);
  const pd3 = await padNow(p);
  j.check("el ✕ de la lista la cierra, el menú vuelve tal como estaba y Tareas sigue en «+» del mando", !(await p.locator(".task-board:not(.hidden)").count()) && m3?.open === m1?.open && padHas(pd3, "Tareas"), JSON.stringify({ m3, pd3 }));

  // 5. Kept over a reload; the group is not (it starts at «Todas» every time the list opens).
  await p.reload();
  await enterGame(p);
  await p.waitForTimeout(1500);
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await p.waitForTimeout(800);
  await j.tap(".room-ui:not(.hidden) .cab-tasks", "Tareas");
  const l3 = await board(p);
  j.check("tras recargar sigue «Estación» (en codeship.ajustes) y el grupo vuelve a «Todas»", l3?.vehicles.join() === "estacion" && !/ · .* · /.test(l3.scope.replace(/ · \d+ de \d+$/, "")), JSON.stringify(l3));

  // 6. Back to «Automático», then into the Starship: the list follows her.
  await j.taskSettings({ vehicle: "auto" });
  await j.tap(".task-board [data-close]", "Cerrar tareas");
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la Starship");
  await p.waitForFunction(() => window.codeship.starship?.active && !window.codeship.starship.mode.throughHatch, null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(500);
  await j.tap(".sts-ui .sts-tasks", "Tareas");
  const l4 = await board(p);
  j.check("«Automático» en la Starship: solo sus tareas, y lo dice", l4?.vehicles.join() === "nodriza" && /En la nave \(automático\)/.test(l4.scope), JSON.stringify(l4));
  await capture(j, "lista-nave", "Lista en la Starship");
  await j.taskSettings({ vehicle: "todos" });
  const l5 = await board(p);
  j.check("«Todos»: todas las tareas del juego, de los tres vehículos", l5?.n === l5?.total && /Todos los vehículos/.test(l5.scope), JSON.stringify(l5));
  await j.taskSettings({ vehicle: "auto" });
  await j.tap(".task-board [data-close]", "Cerrar tareas");

  // 7. A trip running: «Trayecto» sprouts under Vista and Tareas and opens a status-only window.
  const noTrip = await menu(p);
  j.check("sin viaje no hay «Trayecto» en el menú", !(noTrip?.out ?? []).some((b) => b.label === "Trayecto"), JSON.stringify(noTrip));
  const flying = await j.setup("la Starship sale hacia la estación (el viaje con sus retos se juega en PX-36)", () => {
    const c = window.codeship;
    const t = c.nav.targets.find((x) => x.kind === "dock");
    return c.nav.carry(t.id);
  });
  if (!j.check("la Starship vuela hacia la estación", flying?.ok, JSON.stringify(flying))) return;
  await p.waitForTimeout(1500);
  await j.tap(".sts-ui .trip-btn", "Trayecto");
  await p.waitForTimeout(800);
  const tw = await p.evaluate(() => {
    const w = document.querySelector(".trip-window:not(.hidden)");
    return w && { rows: [...w.querySelectorAll("dt")].map((d) => d.textContent), text: w.textContent, buttons: [...w.querySelectorAll("button")].map((b) => b.getAttribute("aria-label")) };
  });
  j.check("«Trayecto» abre una ventana de solo estado: destino, fase, distancia y lo que falta, con su barra", !!tw && ["Destino", "Fase", "Distancia", "Llega en"].every((r) => tw.rows.includes(r)) && !!(await p.locator(".trip-window .tw-bar").count()), JSON.stringify(tw));
  j.check("sin «Ver trayecto» ni «Mando» en la ventana (solo en los mandos de pilotaje); solo se cierra", !!tw && !/Ver trayecto|Mando/.test(tw.text) && tw.buttons.join() === "Cerrar trayecto", JSON.stringify(tw));
  const m4 = await menu(p);
  const l4b = m4?.out.map((b) => b.label) ?? [];
  j.check("con el mando, solo «Trayecto» brota del engranaje (Vista y Tareas están en el mando) y es ahora la X que lo cierra", l4b.length === 1 && l4b[0] === "Cerrar trayecto" && (m4?.rootAt.w ?? 0) >= 44, JSON.stringify(m4));
  await capture(j, "trayecto", "Ventana de Trayecto desde el menú");
  await j.tap(".sts-ui .trip-btn.rm-open", "X del menú: Cerrar trayecto");
  await p.waitForTimeout(300);
  j.check("la X del menú cierra la ventana de Trayecto", !(await p.locator(".trip-window:not(.hidden)").count()));
  await j.setup("se para el viaje", () => window.codeship.nav.cancel());
  await p.waitForTimeout(800);
  j.check("sin viaje, «Trayecto» deja de brotar del menú y el engranaje se va (no queda nada fuera del mando)", !(await p.locator(".sts-ui .trip-btn:not(.hidden)").count()) && ((await menu(p))?.rootAt.w ?? 0) === 0);
}
