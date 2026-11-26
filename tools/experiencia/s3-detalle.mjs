// PX-49 Sanctuary 3, the training island in detail (Berón, 2026-11-18: «las áreas se ven vacías»;
// docs/design/santuario3-detalle.md), on an iPhone 13 with visible taps only. With «Ir» set to teleport in the task
// settings (PX-45 walks the island), Áreas takes her to each real facility and its rooms: the NBL (the pool with the
// ISS, Dragon and Cygnus on the bottom, the two bridge cranes and four jib cranes, the suit-up area with the EMU on its
// donning stands, the divers' stations, the lockers), its control room upstairs behind its windows and the hyperbaric
// chamber; the mock-up hall (Destiny and Orion with their steps, the work platform, the air-bearing floor, the
// racks); the Crew Dragon sims hall (Hawthorne), the Apollo LM simulator hall (Building 5) and the CSA-style robotics
// centre (classroom, whiteboards, the 3/4 Destiny); Mission Control (four rows, the sunken trench, FLIGHT and CAPCOM, the five big screens and nine small);
// the gym; the medical centre (exam room with the ECG, the audiometry booth, the ultrasound, the waiting room and the
// records) and the hypobaric chamber with its airlock, seats and O₂ panels; the water survival pool (METS, raft,
// hoist); the helipad at the south cave's mouth (green lights, wind cone, fuel point); the campus's services in the
// giant trees of the hollow mountain (docs/design/montana-hueca.md: the crew's suits room, the residence, the
// restaurant, the clinic, the assembly hall, the classrooms, the library, the sample lab, the rearing room, the growing
// room and the prototype workshop) and the mountain inside, from the foot of the training tree. In each she walks a few
// steps with «Moverse» and looks with «Mirar»: the capture must look full.
// Captures in docs/screenshots/s3d-<área>-movil.png.
import { mkdirSync } from "node:fs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(500);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/s3d-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

const s3 = (p) =>
  p.evaluate(() => {
    const c = window.codeshipS3;
    return { body: c.body, mode: c.mode, yaw: c.yaw, where: document.querySelector(".cab-where")?.textContent ?? "" };
  });

async function until(j, ok, ms) {
  const t0 = Date.now();
  let s = await s3(j.page);
  while (!ok(s) && Date.now() - t0 < ms) {
    await j.page.waitForTimeout(300);
    s = await s3(j.page);
  }
  return s;
}

/** Turn the camera with its stick (visible drags) until it looks at the point (x, z). */
export async function lookAt(j, x, z) {
  const p = j.page;
  for (let i = 0; i < 16; i++) {
    const diff = await p.evaluate(([tx, tz]) => {
      const c = window.codeshipS3;
      const want = Math.atan2(-(tx - c.body.x), -(tz - c.body.z));
      return Math.atan2(Math.sin(want - c.yaw), Math.cos(want - c.yaw));
    }, [x, z]);
    if (Math.abs(diff) < 0.1) return true;
    await j.stick(".vstick.s3-look", diff > 0 ? -40 : 40, 0, Math.min(1200, 150 + Math.abs(diff) * 420));
  }
  return false;
}

/** Tilt the camera with the same stick (up and down drags) to the pitch `want` (negative looks down). */
export async function tilt(j, want) {
  for (let i = 0; i < 10; i++) {
    const d = want - (await j.page.evaluate(() => window.codeshipS3.pitch));
    if (Math.abs(d) < 0.06) return;
    await j.stick(".vstick.s3-look", 0, d > 0 ? -40 : 40, Math.min(1000, 120 + Math.abs(d) * 500));
  }
}

/** Walk at the point with «Moverse» until she is `stop` metres from it (or stops getting closer). */
export async function walkTo(j, x, z, stop) {
  const dist = () => j.page.evaluate(([tx, tz]) => Math.hypot(tx - window.codeshipS3.body.x, tz - window.codeshipS3.body.z), [x, z]);
  let d = await dist();
  for (let i = 0; i < 12 && d > stop; i++) {
    await lookAt(j, x, z);
    await j.stick(".vstick.s3-move", 0, -40, Math.min(1500, 200 + (d - stop) * 250));
    const n = await dist();
    // Never into the water: a step back to the deck if the walk took her in.
    if ((await j.page.evaluate(() => window.codeshipS3.body.motion)) === "agua") {
      await j.stick(".vstick.s3-move", 0, 40, 700);
      break;
    }
    if (n > d - 0.2) break;
    d = n;
  }
  return d;
}

/** Áreas → the area on the map → «Ir» (teleport, as set in the settings), then a few steps in with «Moverse». */
export async function goArea(j, id, title) {
  await j.tap(".areas-btn", "Áreas");
  // «Automático» shows the building she is in (the shared scope, areas.md): another one is under «Todo» in the gear.
  if (!(await j.page.locator(`.areas-window [data-pick="${id}"]`).count())) await j.areasScope("", "", "Todo: la isla");
  await j.tap(`.areas-window [data-pick="${id}"]`, `${title} en el mapa`);
  const ok = await j.tap(`.areas-window [data-area="${id}"]`, `Ir: ${title}`);
  const s = await until(j, (q) => q.mode === "libre", 20000);
  await j.page.waitForTimeout(600);
  return ok && s.mode === "libre";
}

/** What the scene has around her: the fixtures of this area and the draw calls of the last frame. */
const around = (p, area) =>
  p.evaluate((a) => {
    const c = window.codeshipS3;
    const f = c.layout.fixtures.filter((q) => q.area === a || q.area.startsWith(`${a}-`) || q.area.startsWith(`${a}:`));
    return { n: f.length, kinds: [...new Set(f.map((q) => q.kind))], calls: window.__codeshipFrame?.calls ?? 0 };
  }, area);

const SHOTS = [
  // area id, title, label, where to look (a fixture's kind, the area's own point or a point off her), how near to walk
  // (stand, m), the camera's tilt (pitch), and the kinds that must be there.
  { id: "entrenamiento:nbl", title: "Laboratorio de flotabilidad neutra (NBL)", label: "nbl", look: { kind: "maqueta-modulo" }, stand: 14, pitch: -0.35, kinds: ["grua-puente", "grua-pluma", "soporte-emu", "maqueta-modulo", "puesto-buzos", "taquillas"] },
  { id: "entrenamiento:nbl", title: "Laboratorio de flotabilidad neutra (NBL)", label: "nbl-trajes", look: { kind: "soporte-emu" }, stand: 4.5, pitch: -0.12, kinds: [] },
  { id: "entrenamiento:nbl", title: "Laboratorio de flotabilidad neutra (NBL)", label: "nbl-buzos", look: { kind: "puesto-buzos" }, stand: 4.5, pitch: -0.12, kinds: [] },
  { id: "entrenamiento:nbl-control", title: "Sala de control de la NBL", label: "nbl-control", look: { centre: "entrenamiento:nbl", dz: -10 }, stand: 0, pitch: -0.3, kinds: [] },
  { id: "entrenamiento:nbl-hiperbarica", title: "Cámara hiperbárica (NBL)", label: "nbl-hiperbarica", look: { kind: "hiperbarica" }, stand: 0, back: 2.5, pitch: -0.1, kinds: [] },
  { id: "entrenamiento:svmf", title: "Nave de maquetas (SVMF)", label: "svmf", look: { kind: "maqueta-modulo" }, stand: 11, pitch: -0.12, kinds: ["capsula-orion", "rack-ispr", "trineo", "puerta-industrial"] },
  { id: "entrenamiento:svmf", title: "Nave de maquetas (SVMF)", label: "svmf-orion", go: [{ kind: "capsula-orion", dx: -4.5, keepZ: true }, { kind: "capsula-orion", dx: -4.5, dz: 0 }], look: { kind: "capsula-orion" }, stand: 0, back: 1.5, pitch: -0.12, kinds: [] },
  { id: "entrenamiento:simulador-dragon", title: "Simuladores de Crew Dragon", label: "simulador-dragon", look: { kind: "consola-fcr" }, stand: 5, pitch: -0.12, kinds: ["consola-fcr", "silla-fcr", "escalon"] },
  { id: "entrenamiento:simulador-lm", title: "Simulador del módulo lunar (LMS)", label: "simulador-lm", look: { centre: "entrenamiento:simulador-lm" }, stand: 0, back: 0.6, pitch: -0.1, kinds: ["consola-fcr", "silla-fcr"] },
  { id: "entrenamiento:robotica", title: "Centro de entrenamiento en robótica", label: "robotica", look: { kind: "pizarra" }, stand: 5, pitch: -0.12, kinds: ["pizarra", "mesa", "silla", "escalon"] },
  { id: "entrenamiento:control", title: "Control de misión", label: "control", look: { kind: "pantallas-frente" }, stand: 9, pitch: -0.1, kinds: ["consola-fcr", "silla-fcr", "pantallas-frente", "barandilla"] },
  { id: "entrenamiento:gimnasio", title: "Gimnasio y vestuarios", label: "gimnasio", look: { kind: "ared" }, stand: 5, pitch: -0.15, kinds: ["cinta", "bici", "jaula", "mancuernas", "remo", "polea", "ared", "taquillas"] },
  { id: "entrenamiento:medico", title: "Centro médico y de selección", label: "medico", look: { kind: "ecg" }, stand: 3.5, pitch: -0.15, kinds: ["ecg", "ecografo", "audiometro", "camilla-exam", "asiento-camara", "consola-camara", "archivador", "mostrador"] },
  { id: "entrenamiento:medico", title: "Centro médico y de selección", label: "medico-espera", look: { kind: "mostrador" }, stand: 6, pitch: -0.12, kinds: [] },
  { id: "entrenamiento:medico-hipobarica", title: "Cámara hipobárica", label: "hipobarica", look: { dx: -6 }, stand: 0, back: 1, pitch: -0.15, kinds: [] },
  { id: "entrenamiento:supervivencia", title: "Supervivencia en el agua", label: "supervivencia", go: { pool: "supervivencia-piscina" }, look: { kind: "mets" }, stand: 0, back: 0.5, pitch: -0.25, kinds: ["mets", "balsa", "izado", "silla-socorrista", "chalecos"] },
  { id: "entrenamiento:helipuerto", title: "Helipuerto", label: "helipuerto", look: { kind: "manga" }, stand: 10, pitch: -0.15, kinds: [] },
  // The campus's services in the trees of the hollow mountain (montana-hueca.md §Auditoría del campus).
  { id: "entrenamiento:trajes", title: "Sala de trajes de la tripulación", label: "trajes", look: { kind: "taquillas" }, stand: 4, pitch: -0.12, kinds: ["taquillas", "consola-fcr", "mesa"] },
  { id: "entrenamiento:residencia", title: "Residencia de la tripulación", label: "residencia", look: { kind: "cama" }, stand: 4, pitch: -0.15, kinds: ["cama", "armario", "sofa", "mesa-reunion"] },
  { id: "entrenamiento:restaurante", title: "Restaurante y laboratorio de alimentos", label: "restaurante", look: { kind: "cocina" }, stand: 5, pitch: -0.12, kinds: ["cocina", "mostrador", "nevera", "mesa-reunion", "silla"] },
  { id: "entrenamiento:clinica", title: "Clínica de medicina de vuelo", label: "clinica", look: { kind: "sillon-dental" }, stand: 4, pitch: -0.15, kinds: ["camilla-exam", "sillon-dental", "lavabo", "cama"] },
  { id: "entrenamiento:asambleas", title: "Sala de asambleas", label: "asambleas", look: { kind: "pizarra" }, stand: 5, pitch: -0.1, kinds: ["mesa-reunion", "silla", "tele-pared", "pizarra"] },
  { id: "entrenamiento:aulas", title: "Aulas", label: "aulas", look: { kind: "pizarra" }, stand: 5, pitch: -0.1, kinds: ["pupitre", "silla", "pizarra"] },
  { id: "entrenamiento:biblioteca", title: "Biblioteca", label: "biblioteca", look: { kind: "estanteria" }, stand: 4, pitch: -0.1, kinds: ["estanteria", "mesa", "silla"] },
  { id: "entrenamiento:laboratorio", title: "Laboratorio de muestras", label: "laboratorio", look: { kind: "guantera" }, stand: 4, pitch: -0.12, kinds: ["guantera", "nevera", "lavabo"] },
  { id: "entrenamiento:crianza", title: "Área de crianza", label: "crianza", look: { kind: "colmena" }, stand: 4, pitch: -0.12, kinds: ["insectario", "colmena"] },
  { id: "entrenamiento:huerto", title: "Huerto de cultivo", label: "huerto", look: { kind: "camara-cultivo" }, stand: 4, pitch: -0.1, kinds: ["camara-cultivo", "estante-cultivo"] },
  { id: "entrenamiento:taller", title: "Taller de prototipos", label: "taller", look: { kind: "impresora-3d" }, stand: 4, pitch: -0.12, kinds: ["impresora-3d", "torno", "fresadora", "banco-trabajo"] },
  // Inside the hollow mountain, from the foot of the training tree: the lake, the giant trees and their carpet stations.
  { id: "entrenamiento:arbol-entrenamiento:pie", title: "Árbol del entrenamiento · pie", label: "montana", look: { centre: "entrenamiento:lago" }, stand: 0, pitch: 0.1, kinds: [] },
];

export async function s3Detalle(j) {
  const p = j.page;
  await j.tap('.start-screen .mw-pick[data-pick="aereo"]', "Tarjeta: Santuario Aéreo");
  await j.tap('.start-screen .mw-go[data-go="aereo"]', "Jugar: Santuario Aéreo");
  await p.waitForFunction(() => window.codeshipS3, null, { timeout: 120000 });
  await p.waitForFunction(() => performance.getEntriesByName("codeship-primer-fotograma").length > 0, null, { timeout: 60000 }).catch(() => {});
  await j.detectGpu();
  await p.waitForTimeout(1200);
  await j.resetPerf();

  // 1. «Ir» by teleport (PX-45 walks the island): the task settings, which Áreas shares.
  await j.tap(".s3-tasks", "Tareas");
  await j.taskSettings({ travel: "teletransporte" });
  await j.tap(".task-board .tb-close, .task-board [aria-label='Cerrar tareas']", "Cerrar tareas").catch(() => {});

  const data = await p.evaluate(() => {
    const c = window.codeshipS3;
    return { areas: c.layout.areas.filter((a) => a.island === "entrenamiento").map((a) => a.id), k: c.layout.k };
  });
  j.check("Áreas tiene las salas nuevas: la sala de control de la NBL, la cámara hiperbárica, Orion, la piscina de supervivencia, los simuladores de Dragon y del LM y el centro de robótica", ["entrenamiento:nbl-control", "entrenamiento:nbl-hiperbarica", "entrenamiento:svmf-orion", "entrenamiento:supervivencia", "entrenamiento:simulador-dragon", "entrenamiento:simulador-lm", "entrenamiento:robotica"].every((a) => data.areas.includes(a)), data.areas.join(", "));

  let maxCalls = 0;
  for (const sh of SHOTS) {
    const went = await goArea(j, sh.id, sh.title);
    const st = await s3(p);
    j.check(`«Ir» la lleva a ${sh.title}`, went && st.mode === "libre" && st.where.includes(sh.title.replace(/ \(.*\)$/, "")), st.where);
    // Where to look: at a fixture of the area, at a point off her, or at an area's middle.
    const target = await p.evaluate(([look, id]) => {
      const c = window.codeshipS3;
      const b = c.body;
      if (look.kind) {
        const f = c.layout.fixtures.filter((q) => q.kind === look.kind).sort((a, q) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(q.x - b.x, q.z - b.z))[0];
        return f ? { x: f.x, z: f.z } : null;
      }
      if (look.centre) {
        const a = c.layout.areas.find((q) => q.id === look.centre);
        return { x: a.centre.x + (look.dx ?? 0), z: a.centre.z + (look.dz ?? 0) };
      }
      return { x: b.x + (look.dx ?? 0), z: b.z + (look.dz ?? 0) };
    }, [sh.look, sh.id]);
    // First where to stand, if the shot says: off her (out of a capsule's hatch), or on the deck at a pool's edge.
    if (sh.go) {
      for (const go of Array.isArray(sh.go) ? sh.go : [sh.go]) {
        const g = await p.evaluate((go) => {
          const c = window.codeshipS3;
          const b = c.body;
          if (go.pool) {
            const w = c.layout.world.waters.find((q) => q.id === go.pool);
            const x = Math.max(w.x0, Math.min(w.x1, b.x));
            const z = Math.max(w.z0, Math.min(w.z1, b.z));
            const L = Math.hypot(b.x - x, b.z - z) || 1;
            return { x: x + ((b.x - x) / L) * 1.2, z: z + ((b.z - z) / L) * 1.2 };
          }
          const o = go.kind ? c.layout.fixtures.find((q) => q.kind === go.kind) : b;
          return { x: o.x + (go.dx ?? 0), z: go.keepZ ? b.z : o.z + (go.dz ?? 0) };
        }, go);
        await walkTo(j, g.x, g.z, 0.4);
      }
    }
    // A few steps toward it with «Moverse» (she walks the room), or a step back to see it whole; then look and tilt.
    if (target && sh.stand > 0) await walkTo(j, target.x, target.z, sh.stand);
    else if (target) {
      await lookAt(j, target.x, target.z);
      await j.stick(".vstick.s3-move", 0, sh.back ? 40 : -40, sh.back ? 200 + sh.back * 250 : 500);
    }
    if (target) await lookAt(j, target.x, target.z);
    await tilt(j, sh.pitch);
    await p.waitForTimeout(600);
    const a = await around(p, sh.id);
    maxCalls = Math.max(maxCalls, a.calls);
    if (sh.kinds.length) j.check(`${sh.title}: su equipo real está (${sh.kinds.join(", ")})`, sh.kinds.every((k) => a.kinds.includes(k)), a.kinds.join(", "));
    await capture(j, sh.label, sh.title);
  }
  j.check("las llamadas de dibujo quedan en el presupuesto (≤ 600) en cada sala", maxCalls > 0 && maxCalls <= 600, String(maxCalls));
}
