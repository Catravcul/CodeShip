// PX-42 The task list's settings (Berón, 2026-11-17; docs/design/viaje-a-una-tarea.md §Ajustes de tareas): on an
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

export async function tareasAjustes(j) {
  const p = j.page;
  // 1. A new game: she is in the LM. The list shows the LM's tasks (automatic), with nothing but «Ir».
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await p.waitForTimeout(800);
  await j.tap(".room-ui:not(.hidden) .cab-tasks", "Tareas");
  await p.waitForTimeout(400);
  const l1 = await board(p);
  j.check("la lista abre con [⚙︎ Ajustes de tareas][✕ Cerrar tareas]", l1?.title === "Tareas" && l1.toggle === "Ajustes de tareas" && l1.close === "Cerrar tareas", JSON.stringify(l1));
  await headerButtons(j, "Lista");
  j.check("en la lista ya no están el interruptor ni los filtros (están en los ajustes)", l1?.travel === 0 && l1.chips === 0 && l1.vehicleChoices === 0, JSON.stringify(l1));
  // At the start the LM has no task of its own: the list says so and where the others are.
  const empty = (await j.texts(".task-board .tb-empty, .task-board .tb-hint")).join(" ");
  j.check("«Automático» por defecto: en el LM solo salen las tareas del módulo (ninguna al empezar), y lo dice", l1?.vehicles.every((v) => v === "modulo") && /En el módulo \(automático\)/.test(l1.scope) && l1.n < l1.total && (l1.n > 0 || (/Nada pendiente en el módulo/.test(empty) && /tareas más fuera de este filtro: ⚙︎ Ajustes de tareas › Todos/.test(empty))), `${JSON.stringify(l1)} · ${empty}`);
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
  await j.tap(".task-board [data-close]", "Cerrar tareas");

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
  j.check("«Automático» en la Starship: solo sus tareas, y lo dice", l4?.vehicles.join() === "nodriza" && /En la nave \(automático\)/.test(l4.scope), JSON.stringify(l4));
  await capture(j, "lista-nave", "Lista en la Starship");
  await j.taskSettings({ vehicle: "todos" });
  const l5 = await board(p);
  j.check("«Todos»: todas las tareas del juego, de los tres vehículos", l5?.n === l5?.total && /Todos los vehículos/.test(l5.scope), JSON.stringify(l5));
  await j.taskSettings({ vehicle: "auto" });
  await j.tap(".task-board [data-close]", "Cerrar tareas");
}
