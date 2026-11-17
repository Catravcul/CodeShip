// PX-42 The general tree menu and the task list's settings (docs/design/reglas.md §5.8–5.9, ux-acciones.md
// §Menú árbol): one gear at the top right that turns into an X and sprouts Vista and Tareas (and Trayecto while a
// trip runs); an icon that opens a window turns into the X that closes it. Trayecto is a status-only window.
// The task list's settings (Berón, 2026-11-17; docs/design/viaje-a-una-tarea.md §Ajustes de tareas): on an
// iPhone 13 with taps. The list's header is [⚙︎][✕]; the list itself has only the tasks with «Ir» (no switch, no
// chips). ⚙︎ swaps the list for its settings, like a branch of the root menu: «Viaje / Teletransporte», the vehicle
// (Automático: donde está ella, Nave (Starship), Estación, Módulo, Todos) and the groups, and the gear turns into a
// list icon that goes back. «Automático» follows her from the LM to the Starship; a chosen vehicle is kept in
// codeship.ajustes over a reload. Captures in docs/screenshots/tareas-ajustes-<pantalla>-movil.png.
import { mkdirSync } from "node:fs";

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

export async function tareasAjustes(j) {
  const p = j.page;
  // 0. The tree menu: only the gear is out; it turns into an X and Vista and Tareas sprout below it.
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await p.waitForTimeout(1200);
  const m0 = await menu(p);
  j.check("en el habitáculo del LM solo se ve el engranaje del menú, arriba a la derecha", !!m0 && !m0.open && m0.root === "Menú" && m0.out.length === 0 && m0.rootAt.right <= 16 && m0.rootAt.top <= 20 && m0.rootAt.w >= 44, JSON.stringify(m0));
  await capture(j, "menu-cerrado", "Menú árbol cerrado");
  await j.tap('.room-ui:not(.hidden) .root-menu:not(.open) > .rm-root', "⚙︎ Menú");
  await p.waitForTimeout(400);
  const m1 = await menu(p);
  const labels = m1?.out.map((b) => b.label) ?? [];
  j.check("el engranaje se vuelve una X («Cerrar menú») y debajo brotan Vista, Tareas y Áreas, de 44 px", !!m1 && m1.open && m1.root === "Cerrar menú" && /^Vista/.test(labels[0] ?? "") && labels[1] === "Tareas" && labels[2] === "Áreas" && m1.out.every((b) => b.y > m1.rootAt.top && b.w >= 44 && b.h >= 44), JSON.stringify(m1));
  await capture(j, "menu-abierto", "Menú árbol abierto");

  // 0b. «Áreas»: the LM's schematic; a tap on a node and she walks there (Viaje, the shared setting).
  await j.tap(".room-ui:not(.hidden) .areas-btn", "Áreas");
  await p.waitForTimeout(500);
  const ar = await p.evaluate(() => {
    const w = document.querySelector(".areas-window:not(.hidden)");
    return w && { scope: w.querySelector(".tb-scope")?.textContent, nodes: [...w.querySelectorAll(".ar-node")].map((b) => { const r = b.getBoundingClientRect(); return { id: b.dataset.area, label: b.getAttribute("aria-label"), w: r.width, h: r.height }; }), lines: w.querySelectorAll(".ar-links line").length };
  });
  j.check("«Áreas» abre el esquema del LM (el vehículo donde está, automático): sus puestos como nodos de 44 px unidos por líneas", !!ar && /^Módulo \(automático\) · Viaje/.test(ar.scope ?? "") && ar.nodes.length >= 5 && ar.nodes.every((n) => n.w >= 44 && n.h >= 44) && ar.lines >= 4 && ar.nodes.some((n) => n.id === "ecs"), JSON.stringify(ar));
  const m5 = await menu(p);
  j.check("con Áreas abierta, su icono del menú es la X que la cierra", (m5?.out ?? []).some((b) => b.label === "Cerrar áreas"), JSON.stringify(m5));
  await capture(j, "areas-modulo", "Áreas: esquema del LM");
  // Its gear: the same shared settings as the task list (no «Todos»: a schematic shows one vehicle).
  await j.tap('.areas-window [data-view][aria-label="Ajustes de áreas"]', "⚙︎ Ajustes de áreas");
  const as = await p.evaluate(() => ({ travel: [...document.querySelectorAll(".areas-window [data-travel]")].map((b) => b.dataset.travel + (b.getAttribute("aria-checked") === "true" ? "*" : "")), vehicles: [...document.querySelectorAll(".areas-window [data-vehicle]")].map((b) => b.dataset.vehicle + (b.getAttribute("aria-checked") === "true" ? "*" : "")) }));
  j.check("los ajustes de Áreas son los compartidos: Viaje/Teletransporte y el vehículo (automático, nave, estación, módulo)", as.travel.join() === "viaje*,teletransporte" && as.vehicles.join() === "auto*,nodriza,estacion,modulo", JSON.stringify(as));
  await capture(j, "areas-ajustes", "Ajustes de Áreas");
  await j.tap('.areas-window [data-vehicle="estacion"]', "Vehículo: Estación");
  await j.tap('.areas-window [data-view][aria-label="Volver al mapa de áreas"]', "Mapa de áreas");
  const st = await p.evaluate(() => [...document.querySelectorAll(".areas-window .ar-node")].map((b) => b.textContent));
  j.check("con «Estación», el esquema es el de la ISS (Harmony, Destiny…)", st.some((t) => /Harmony/.test(t)) && st.some((t) => /Destiny/.test(t)), st.join(" / "));
  await capture(j, "areas-estacion", "Áreas: esquema de la estación");
  await j.tap('.areas-window [data-view][aria-label="Ajustes de áreas"]', "⚙︎ Ajustes de áreas");
  await j.tap('.areas-window [data-vehicle="auto"]', "Vehículo: Automático");
  await j.tap('.areas-window [data-view][aria-label="Volver al mapa de áreas"]', "Mapa de áreas");
  await j.tap('.areas-window .ar-node[data-area="ecs"]', "Área: Panel del ECS");
  await p.waitForTimeout(400);
  const walk = await p.evaluate(() => ({ active: window.codeship.journey.active, legs: window.codeship.journey.plan.map((l) => `${l.kind} ${l.to}`), open: !!document.querySelector(".areas-window:not(.hidden)") }));
  j.check("tocar «Panel del ECS» cierra Áreas y ella va andando por el camino real (Viaje)", !walk.open && (walk.active ? walk.legs.some((l) => /^andar modulo:ecs/.test(l)) : true), JSON.stringify(walk));
  await p.waitForFunction(() => !window.codeship.journey.active, null, { timeout: 60000 }).catch(() => {});
  const near = await p.evaluate(() => window.codeship.cabin.near());
  j.check("y llega al panel del ECS", near === "ecs", String(near));
  await capture(j, "areas-llega", "Llega al panel del ECS desde Áreas");
  // 1. A new game: she is in the LM. The list shows the LM's tasks (automatic), with nothing but «Ir».
  await j.tap(".room-ui:not(.hidden) .cab-tasks", "Tareas");
  await p.waitForTimeout(400);
  const m2 = await menu(p);
  j.check("con la lista abierta, «Tareas» del menú es una X («Cerrar tareas») y el menú sigue fuera, sin quedar debajo de la lista", !!m2 && m2.open && m2.out.some((b) => b.label === "Cerrar tareas"), JSON.stringify(m2));
  const l1 = await board(p);
  j.check("la lista abre con [⚙︎ Ajustes de tareas][✕ Cerrar tareas]", l1?.title === "Tareas" && l1.toggle === "Ajustes de tareas" && l1.close === "Cerrar tareas", JSON.stringify(l1));
  await headerButtons(j, "Lista");
  j.check("en la lista ya no están el interruptor ni los filtros (están en los ajustes)", l1?.travel === 0 && l1.chips === 0 && l1.vehicleChoices === 0, JSON.stringify(l1));
  // At the start the LM is docked to the Starship: «Automático» shows the LM and the vehicle joined to it by the open hatch.
  const empty = (await j.texts(".task-board .tb-empty, .task-board .tb-hint")).join(" ");
  j.check("«Automático» por defecto: en el LM acoplado salen las tareas del módulo y de la nave acoplada, y lo dice", l1?.vehicles.every((v) => v === "modulo" || v === "nodriza") && /En el módulo( y la nave acoplada)? \(automático\)/.test(l1.scope) && l1.n < l1.total && (l1.n > 0 || /Nada pendiente en el módulo/.test(empty)), `${JSON.stringify(l1)} · ${empty}`);
  await capture(j, "lista-modulo", "Lista en el LM");

  // 2. The gear: the settings replace the list, and the gear turns into a list icon.
  await j.tap(GEAR, "⚙︎ Ajustes de tareas");
  const s1 = await board(p);
  j.check("⚙︎ cambia la lista por sus ajustes y el engranaje pasa a ser el icono de lista", s1?.title === "Ajustes de tareas" && s1.toggle === "Volver a la lista de tareas" && s1.n === 0, JSON.stringify(s1));
  j.check("los ajustes llevan Viaje/Teletransporte, los cinco vehículos y los grupos", s1?.travel === 1 && s1.vehicleChoices === 5 && s1.chips >= 1, JSON.stringify(s1));
  j.check("«Viaje» y «Automático» elegidos por defecto", s1?.checkedTravel === "viaje" && s1.checkedVehicle === "auto", JSON.stringify(s1));
  const vehicles = await j.texts(".task-board [data-vehicle]");
  j.check("«Automático: donde está ella» dice dónde está ahora (Módulo)", /^Automático: donde está ella Módulo/.test(vehicles[0] ?? "") && vehicles.slice(1).map((v) => v.replace(/ \d+$/, "")).join("/") === "Nave (Starship)/Estación/Módulo/Todos", vehicles.join(" / "));
  await headerButtons(j, "Ajustes");
  await capture(j, "ajustes", "Ajustes de la lista");

  // 3. Station by hand: back to the list, which shows only the station's tasks.
  await j.tap('.task-board [data-vehicle="estacion"]', "Vehículo: Estación");
  j.check("«Estación» queda marcada y se guarda en codeship.ajustes", (await board(p))?.checkedVehicle === "estacion" && (await board(p))?.saved === "estacion");
  await j.tap(LIST, "Lista de tareas");
  const l2 = await board(p);
  j.check("el icono de lista vuelve a la lista: solo tareas de la estación, cada una con «Ir»", l2?.toggle === "Ajustes de tareas" && l2.vehicles.join() === "estacion" && l2.n > 0 && /En la estación · /.test(l2.scope), JSON.stringify(l2));
  await capture(j, "lista-estacion", "Lista filtrada a la estación");

  // 4. A group: only its tasks, and the scope line says so.
  await j.tap(GEAR, "⚙︎ Ajustes de tareas");
  const chip = await p.evaluate(() => document.querySelector('.task-board [data-group]:not([data-group=""])')?.dataset.group);
  if (chip) {
    await j.tap(`.task-board [data-group="${chip}"]`, `Grupo: ${chip}`);
    await j.tap(LIST, "Lista de tareas");
    const g = await p.evaluate(() => [...document.querySelectorAll(".task-board .tb-group")].map((h) => h.textContent));
    j.check("un grupo deja en la lista solo ese grupo, y la línea de arriba lo dice", g.length === 1 && (await board(p))?.scope.includes(g[0]), `${g.join(", ")} · ${(await board(p))?.scope}`);
  } else j.check("la estación tiene al menos un grupo de tareas", false);
  // The menu's X closes the list too, and «Tareas» comes back.
  await j.tap('.room-ui:not(.hidden) .cab-tasks.rm-open', "X del menú: Cerrar tareas");
  await p.waitForTimeout(300);
  const m3 = await menu(p);
  j.check("la X del menú cierra la lista y vuelve a ser «Tareas»", !(await p.locator(".task-board:not(.hidden)").count()) && !(m3?.out ?? []).some((b) => b.label === "Cerrar tareas"), JSON.stringify(m3));

  // 5. Kept over a reload; the group is not (it starts at «Todas» every time the list opens).
  await p.reload();
  await p.waitForFunction(() => window.codeship, null, { timeout: 120000 });
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
  j.check("«Automático» en la Starship: sus tareas y las del vehículo acoplado, y lo dice", l4?.vehicles.includes("nodriza") && l4.vehicles.every((v) => v === "nodriza" || v === "modulo") && /En la nave( y el módulo acoplado)? \(automático\)/.test(l4.scope), JSON.stringify(l4));
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
  j.check("en el menú, «Trayecto» va debajo de Vista y Tareas y es ahora la X que lo cierra", /^Vista/.test(l4b[0] ?? "") && l4b[1] === "Tareas" && l4b.at(-1) === "Cerrar trayecto", JSON.stringify(m4));
  await capture(j, "trayecto", "Ventana de Trayecto desde el menú");
  await j.tap(".sts-ui .trip-btn.rm-open", "X del menú: Cerrar trayecto");
  await p.waitForTimeout(300);
  j.check("la X del menú cierra la ventana de Trayecto", !(await p.locator(".trip-window:not(.hidden)").count()));
  await j.setup("se para el viaje", () => window.codeship.nav.cancel());
  await p.waitForTimeout(800);
  j.check("sin viaje, «Trayecto» deja de brotar del menú", !(await p.locator(".sts-ui .trip-btn:not(.hidden)").count()));
}
