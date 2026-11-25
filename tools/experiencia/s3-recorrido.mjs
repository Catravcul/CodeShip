// PX-45 Sanctuary 3, the aerial sanctuary (Berón, 2026-11-18; docs/design/santuario3-escena.md), on an iPhone 13
// with visible taps only. The start screen's «Jugar» on 3 puts Doménica on the training island's helipad at the
// start of her initiation, walking (gravity: the left stick moves her, the right one the camera). She walks with the
// stick, the task list's «Ir» walks her to post 2 (never a teleport: the journey bar with «Parar»), a task on
// another island walks her to the navigation machine with a notice (reglas.md §3.5), the machine's Panel opens the
// island navigation window (the map window, as Áreas) and «Volar», with the flight programmed on the sheet («Por reto»),
// flies her to the launch cap in sight. There Áreas'
// «Ir» walks her to the tree's lift and rides it to the Electron's crown (182 m, the height rule), from where she sees
// the Electron and the sea pad's Falcon 9 ~1,1 km away. Captures in docs/screenshots/s3-<paso>-movil.png.
import { mkdirSync } from "node:fs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(500);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/s3-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

/** What the scene says of her: where, how she moves, what she is doing by herself. */
const s3 = (p) =>
  p.evaluate(() => {
    const c = window.codeshipS3;
    if (!c) return null;
    const bar = document.querySelector(".s3-bar");
    return { body: c.body, mode: c.mode, island: c.island, near: c.near, third: c.thirdPerson, bar: bar && !bar.classList.contains("hidden") ? bar.textContent : "", stop: !!bar?.querySelector(".jb-stop:not([hidden])"), toast: document.querySelector(".s3-ui .cab-toast.on")?.textContent ?? "", craftY: c.craftY(), cabY: c.cabY("lanzadera-arbol"), move: !!document.querySelector(".vstick.s3-move")?.checkVisibility(), look: !!document.querySelector(".vstick.s3-look")?.checkVisibility() };
  });

/** Wait (polling the scene) until `ok(state)`, at most `ms`; returns the last state. */
async function until(j, ok, ms) {
  const t0 = Date.now();
  let s = await s3(j.page);
  while (!ok(s) && Date.now() - t0 < ms) {
    await j.page.waitForTimeout(400);
    s = await s3(j.page);
  }
  return s;
}

/** Every look on the way: she never jumps further than she could walk, swim or fly in that time (no teleport). */
async function track(j, ok, ms, maxMs) {
  const t0 = Date.now();
  let s = await s3(j.page);
  let worst = 0;
  let at = "";
  while (!ok(s) && Date.now() - t0 < ms) {
    const a = s;
    const ta = Date.now();
    await j.page.waitForTimeout(300);
    s = await s3(j.page);
    const d = Math.hypot(s.body.x - a.body.x, s.body.y - a.body.y, s.body.z - a.body.z);
    const v = d / Math.max(0.3, (Date.now() - ta) / 1000);
    if (v > worst) at = `de (${a.body.x.toFixed(1)}, ${a.body.y.toFixed(2)}, ${a.body.z.toFixed(1)}) a (${s.body.x.toFixed(1)}, ${s.body.y.toFixed(2)}, ${s.body.z.toFixed(1)}) en ${Date.now() - ta} ms`;
    worst = Math.max(worst, v);
  }
  return { s, worst, at, ok: worst <= maxMs };
}

/** Turn the camera with its stick (visible drags) until it looks at a prop of the layout. */
async function face(j, kind) {
  const p = j.page;
  for (let i = 0; i < 14; i++) {
    const diff = await p.evaluate((k) => {
      const c = window.codeshipS3;
      const t = c.layout.props.find((x) => x.kind === k);
      const want = Math.atan2(-(t.x - c.body.x), -(t.z - c.body.z));
      return Math.atan2(Math.sin(want - c.yaw), Math.cos(want - c.yaw));
    }, kind);
    if (Math.abs(diff) < 0.12) return;
    await j.stick(".vstick.s3-look", diff > 0 ? -40 : 40, 0, Math.min(1200, 200 + Math.abs(diff) * 450));
  }
}

export async function s3Recorrido(j) {
  const p = j.page;
  // 1. The start screen: «Jugar» on 3.
  await j.tap('.start-screen .mw-pick[data-pick="aereo"]', "Tarjeta: Santuario Aéreo");
  await j.tap('.start-screen .mw-go[data-go="aereo"]', "Jugar: Santuario Aéreo");
  await p.waitForFunction(() => window.codeshipS3, null, { timeout: 120000 });
  await p.waitForFunction(() => performance.getEntriesByName("codeship-primer-fotograma").length > 0, null, { timeout: 60000 }).catch(() => {});
  await j.detectGpu();
  await p.waitForTimeout(1500);
  await j.resetPerf();
  const s0 = await s3(p);
  j.check("«Jugar» en el 3 empieza el santuario aéreo: Doménica en el helipuerto de la isla de entrenamiento, andando", s0?.island === "entrenamiento" && s0.body.area === "entrenamiento:helipuerto" && s0.body.motion === "gravedad", JSON.stringify(s0?.body));
  j.check("con gravedad hay dos joysticks: «Moverse» la mueve a ella y «Mirar» la cámara", s0.move && s0.look, JSON.stringify({ move: s0.move, look: s0.look }));
  j.check("no queda la pantalla de inicio ni la partida del espacio", await p.evaluate(() => !document.querySelector(".start-screen:not(.hidden)") && !window.codeship));
  await capture(j, "inicio", "Santuario 3: el helipuerto de la isla de entrenamiento");
  // The same Switch controls as sanctuary 1 (ui/game-pad.ts, reglas.md §5.7): every button there, the general ones on −, +, capture and home.
  const pad = await p.evaluate(() => {
    const on = [...document.querySelectorAll(".switch-pad:not(.hidden) .ap-btn:not(.free)")].map((b) => b.getAttribute("aria-label"));
    const all = document.querySelectorAll(".switch-pad .ap-btn").length;
    const gear = [...document.querySelectorAll(".rm-root")].some((g) => g.checkVisibility());
    return { on, all, gear };
  });
  j.check("los mandos de la Switch del santuario 1: los 16 botones; Correr, Saltar, Trepar, zoom, + Tareas, − Áreas, captura Vista, inicio Ajustes", pad.all === 16 && ["Correr", "Saltar", "Trepar", "Acercar", "Alejar", "Tareas", "Áreas", "Vista", "Ajustes"].every((l) => pad.on.some((o) => o.startsWith(l))), JSON.stringify(pad.on));
  j.check("lo que está en el mando no brota del engranaje: no queda el menú árbol antiguo", !pad.gear);
  const jump0 = await p.evaluate(() => window.codeshipS3.body.y);
  await j.tap(".switch-pad .ap-a", "A: Saltar");
  const jumped = await p.evaluate(() => new Promise((r) => { let top = 0; const t0 = performance.now(); const f = () => { top = Math.max(top, window.codeshipS3.rig.position.y); if (performance.now() - t0 < 1500) requestAnimationFrame(f); else r(top); }; f(); }));
  j.check("A la hace saltar (los pies suben del suelo, como en el santuario 1)", jumped - jump0 > 0.2, `${(jumped - jump0).toFixed(2)} m`);

  // 2. She walks with the stick (a finger on «Moverse»).
  await j.stick(".vstick.s3-move", 0, -45, 2500);
  const s1 = await s3(p);
  const walked = Math.hypot(s1.body.x - s0.body.x, s1.body.z - s0.body.z);
  j.check("el joystick «Moverse» la hace andar por la isla", walked > 1 && s1.body.motion === "gravedad", `${walked.toFixed(2)} m`);
  await j.stick(".vstick.s3-look", 40, 0, 900);
  const s1b = await p.evaluate(() => window.codeshipS3.yaw);
  j.check("el joystick «Mirar» gira la cámara", Math.abs(s1b - Math.PI) > 0.05, String(s1b));
  await j.tap(".s3-view", "Vista: 3ª persona");
  await capture(j, "tercera", "Santuario 3: en tercera persona en la isla de entrenamiento");
  await j.tap(".s3-view", "Vista: 1ª persona");

  // 3. The task list: the initiation's posts of this island, each with «Ir»; she walks to post 2, the medical centre (the centrifuge seats her in its gondola on arrival).
  // (With s3-iniciacion-2 every post here has its challenge: the «En construcción» card is checked by PX-47's posts 10
  // and 13; post 6 went to the glacier.)
  await j.tap(".s3-tasks", "Tareas");
  const rows = await p.evaluate(() => [...document.querySelectorAll(".task-board [data-go]")].map((b) => b.dataset.go));
  j.check("Tareas lista los puestos de la iniciación de esta isla, cada uno con «Ir»", rows.length >= 8 && rows.includes("s3-puesto-2"), rows.join(", "));
  await capture(j, "tareas", "Santuario 3: la lista de tareas");
  await j.tap('.task-board [data-go="s3-puesto-2"]', "Ir: Centro médico");
  const s2 = await until(j, (s) => s.mode !== "ruta" || s.bar, 3000);
  j.check("«Ir» la lleva andando (barra del viaje con «Parar»; sin joystick de moverse)", s2.mode === "ruta" && s2.stop && !s2.move, JSON.stringify({ mode: s2.mode, bar: s2.bar, move: s2.move }));
  const w1 = await track(j, (s) => s.mode === "libre", 330000, 3);
  const post2 = await p.evaluate(() => window.codeshipS3.layout.machines.filter((m) => m.post === 2).map((m) => m.id));
  j.check("llega al puesto 2 sin saltos (nunca más rápido que andando)", post2.includes(w1.s.near) && w1.ok, `${w1.s.near} · ${w1.worst.toFixed(2)} m/s ${w1.at}`);
  await capture(j, "puesto", "Santuario 3: el puesto 2 y su tarjeta");
  const act = await j.interactionLabel();
  j.check("junto al puesto, el botón naranja del santuario 1: «Reto: <puesto>» (ui/interaction.ts)", /^Reto: /.test(act), act);

  // 4. A task on another island: she walks to the navigation machine and a notice says to fly there first.
  await j.tap(".s3-tasks", "Tareas");
  await j.taskSettings({ vehicle: "todos" });
  await j.tap('.task-board [data-go="s3-puesto-6"]', "Ir: Vuelo parabólico (otra isla: el glaciar)");
  const w2 = await track(j, (s) => s.mode === "libre", 330000, 3);
  const s3b = await s3(p);
  j.check("una tarea de otra isla la lleva andando a la máquina de navegación y un aviso dice que primero hay que volar (reglas §3.5)", w2.s.near === "nav-entrenamiento" && /volar/.test(s3b.toast), `${w2.s.near} · ${s3b.toast}`);

  // 5. The navigation machine: Panel › «Abrir navegación», the island window, «Volar» to the launch cap.
  await j.tap('.s3-ui .cm-acts [data-act="nav"]', "Abrir navegación");
  const nav = await p.evaluate(() => [...document.querySelectorAll(".island-nav .mw-row")].map((r) => ({ id: r.dataset.row, go: !r.querySelector(".mw-go").disabled, sub: r.querySelector(".mw-pick small")?.textContent ?? "" })));
  j.check("la ventana de navegación lista las siete islas (con la de las alturas); la suya «Aquí», sin vuelo", nav.length === 7 && nav.find((r) => r.id === "entrenamiento")?.go === false && nav.filter((r) => r.go).length === 6, JSON.stringify(nav));
  j.check("cada vuelo dice el aparato y su tiempo", nav.filter((r) => r.go).every((r) => /(Helicóptero|Alfombra).*\d+ (s|min)/.test(r.sub)), JSON.stringify(nav.map((r) => r.sub)));
  await capture(j, "navegacion", "Santuario 3: la máquina de navegación");
  await j.tap('.island-nav .mw-pick[data-pick="lanzadera"]', "Lanzadera en la lista");
  await j.tap('.island-nav .mw-go[data-fly="lanzadera"]', "Volar a la Lanzadera");
  // «Por reto» (the navigation's gear; reglas §3.6): the flight is programmed on the sheet, then flown in sight (PX-46).
  await until(j, (s) => s.mode === "reto" || s.mode === "vuelo", 60000);
  if ((await s3(p)).mode === "reto") {
    await j.waitDuel(30000);
    for (let i = 0; i < 3 && (await p.evaluate(() => window.codeshipS3.exercise ?? window.codeshipS3.trace?.state)); i++) {
      await j.answer(() => window.codeshipS3.exercise ?? window.codeshipS3.trace?.state, true);
      await p.waitForTimeout(500);
    }
    await j.tap(".duel button.end", "Continuar");
  }
  const f0 = await until(j, (s) => s.mode === "vuelo", 30000);
  j.check("camina al helipuerto y despega: se ve el vuelo (sin teletransporte)", f0.mode === "vuelo", f0.mode);
  const f1 = await until(j, (s) => s.mode === "vuelo" && s.craftY > 40, 40000);
  j.check("el helicóptero sube a su altura de crucero", f1.craftY > 40, String(f1.craftY));
  await capture(j, "vuelo", "Santuario 3: en vuelo a la lanzadera");
  const f2 = await track(j, (s) => s.mode === "libre", 150000, 120);
  j.check("aterriza en la lanzadera, andando, sin saltos mayores que el vuelo", f2.s.island === "lanzadera" && f2.s.body.motion === "gravedad" && f2.ok, `${f2.s.island} · ${f2.worst.toFixed(1)} m/s`);
  await capture(j, "lanzadera", "Santuario 3: en la lanzadera");

  // 6. Áreas: «Ir» to the Electron's crown: walk to the lift, ride it, step out at 182 m.
  await j.tap(".areas-btn", "Áreas");
  // The shared scope (areas.md): the island, then its buildings and floors, as sanctuary 1's buildings and caps.
  await j.tap(".areas-window .ar-view", "Ajustes de áreas");
  const groups = await p.evaluate(() => ({ b: [...document.querySelectorAll('.areas-window [data-scope-kind="edificio"]')].map((x) => x.dataset.scopeId), f: [...document.querySelectorAll('.areas-window [data-scope-kind="piso"]')].map((x) => x.dataset.scopeId), isle: document.querySelectorAll(".areas-window [data-vehicle]").length }));
  j.check("Áreas del santuario 3: el engranaje lista la isla, el edificio-árbol y sus dos niveles", groups.isle > 0 && groups.b.includes("lanzadera-arbol") && groups.f.join() === "lanzadera-arbol:nivel-1,lanzadera-arbol:nivel-2", JSON.stringify(groups));
  await capture(j, "areas-alcance", "Santuario 3: el alcance de Áreas (isla, edificio, piso)");
  await j.tap('.areas-window [data-scope-kind="piso"][data-scope-id="lanzadera-arbol:nivel-1"]', "Nivel 1");
  await j.tap(".areas-window .ar-view", "Volver al mapa de áreas");
  const lvl = await p.evaluate(() => [...document.querySelectorAll(".areas-window [data-area]")].map((b) => b.dataset.area));
  j.check("con el nivel 1 elegido, solo sus pisos y miradores", lvl.length >= 3 && lvl.every((a) => /-1-\d$/.test(a)), lvl.join(", "));
  await j.areasScope("", "", "Todo: la isla");
  await j.tap('.areas-window [data-pick="lanzadera-arbol:plataforma"]', "Plataforma de lanzamiento en el mapa");
  await capture(j, "areas", "Santuario 3: las áreas de la lanzadera");
  await j.tap('.areas-window [data-area="lanzadera-arbol:plataforma"]', "Ir: Plataforma de lanzamiento");
  const r1 = await until(j, (s) => s.mode === "ascensor", 120000);
  j.check("Áreas la lleva andando al ascensor del tronco", r1.mode === "ascensor", r1.mode);
  const r2 = await until(j, (s) => s.mode === "ascensor" && s.cabY > 40, 60000);
  j.check("sube en la cabina, que se ve subir por el tronco", r2.cabY > 40 && Math.abs(r2.body.y - r2.cabY) < 0.5, JSON.stringify({ cab: r2.cabY, y: r2.body.y }));
  await capture(j, "ascensor", "Santuario 3: en el ascensor del árbol de la lanzadera");
  const r3 = await until(j, (s) => s.mode === "libre", 120000);
  j.check("llega a la plataforma de lanzamiento, a unos 182 m (la regla de altura)", r3.body.y >= 181.9 && r3.body.area === "lanzadera-arbol:plataforma", JSON.stringify(r3.body));

  // 7. The Electron at hand and, to the south-east, the sea pad with the Falcon 9 ~1,1 km away.
  await j.tap(".s3-view", "Vista: 3ª persona");
  const view = await p.evaluate(() => {
    const c = window.codeshipS3;
    const f9 = c.layout.props.find((x) => x.kind === "falcon9");
    return { d: Math.hypot(f9.x - c.layout.crown.x, f9.z - c.layout.crown.z), f9 };
  });
  j.check("el Falcon 9 de la plataforma está a ~1,1 km o más", view.d > 1000, `${view.d.toFixed(0)} m`);
  await face(j, "electron");
  await j.stick(".vstick.s3-look", 0, -40, 700);
  await capture(j, "electron", "Santuario 3: la corona del Electron");
  await j.stick(".vstick.s3-look", 0, 40, 700);
  await face(j, "falcon9");
  await capture(j, "plataforma-mar", "Santuario 3: la plataforma del Falcon 9 vista desde la corona");
  j.check("sin errores en la página", j.errors.length === 0, j.errors.slice(0, 3).join(" | "));
}
