// Animation audit (PX-20, docs/qa/animaciones.md): plays every challenge that acts its steps out, with taps on
// the right answers, and after each step measures in the 3D scene (src/adapters/three/interior/step-audit.ts)
// where its props are, whether they are within Doménica's reach, on screen above the sheet and not hidden or
// inside the furniture, and whether her gesture plays. One small screenshot per step (the strip above the
// sheet, webp) in docs/screenshots/anim/ and one row per step in docs/qa/animaciones.md.
//
// Berón (2026-11-16): «¿En el reto de la crema de cacahuete parecía que los cacahuetes aparecían lejos del
// personaje? ¿Se han hecho pruebas en vivo de cada reto y su animación?»
//
// ANIM_SOLO=crema,huevos (substrings of chore ids) plays only those chores; ANIM_SIN_DOC=1 writes no doc.
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { placeAbove } from "./aterrizaje.mjs";
import { adoptar, llegan } from "./catalogo.mjs";

const SHOTS = join("docs", "screenshots", "anim");
const DOC = join("docs", "qa", "animaciones.md");
/** Same thresholds as step-audit.ts (the doc says them). */
const RULES = { reach: 0.8, gesture: 0.3 };

const sheetTop = () => {
  const el = [...document.querySelectorAll(".duel.sheet")].find((e) => !e.classList.contains("hidden"));
  return el ? el.getBoundingClientRect().top : innerHeight;
};

/** The strip above the sheet as a small webp (encoded by the browser: no image tools needed). */
async function stripShot(j, file) {
  const top = Math.max(40, Math.round(await j.page.evaluate(sheetTop)));
  const png = await j.page.screenshot({ clip: { x: 0, y: 0, width: j.page.viewportSize().width, height: top } });
  j.encoder ??= await j.page.context().newPage();
  const b64 = await j.encoder.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/webp", 0.55).split(",")[1];
  }, png.toString("base64"));
  writeFileSync(join(SHOTS, file), Buffer.from(b64, "base64"));
  return file;
}

const auditNow = (j) =>
  j.page.evaluate(() => {
    const el = [...document.querySelectorAll(".duel.sheet")].find((e) => !e.classList.contains("hidden"));
    return window.codeship.interior.stepAudit(el ? el.getBoundingClientRect().top : innerHeight) ?? null;
  });

/**
 * Follows the act that a right answer started: samples the scene while it plays (from its start to its
 * end and the moment after, when its props stay on the counter), with a screenshot halfway.
 */
async function followAct(j, before, file) {
  const p = j.page;
  const started = await p
    .waitForFunction((n) => (window.codeship.interior.steps.played ?? 0) > n, before, { timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  if (!started) return { started: false, samples: [], shot: (await stripShot(j, file)) };
  const target = before + 1;
  const samples = [];
  let shot;
  const t0 = Date.now();
  while (Date.now() - t0 < 9000) {
    const a = await auditNow(j);
    if (!a || a.played !== target) break;
    samples.push(a);
    if (!shot && (a.t >= 0.5 || !a.playing)) shot = await stripShot(j, file);
    if (!a.playing) break;
    await p.waitForTimeout(120);
  }
  if (!shot) shot = await stripShot(j, file);
  return { started: true, samples, shot };
}

/** Pass or fail of one act from its samples, with the reasons a designer can read. */
export function judge(r) {
  const why = [];
  if (!r.started) return { ok: false, why: ["no se ve nada: el paso no se representa"], props: [] };
  const s = r.samples;
  if (!s.length) return { ok: false, why: ["sin muestras de la escena"], props: [] };
  const late = s.filter((x) => x.t >= 0.35 || !x.playing);
  const gesture = Math.max(...s.map((x) => x.gesture));
  if (gesture < RULES.gesture) why.push(`el gesto no se nota (${gesture.toFixed(2)} rad)`);
  if (!s.some((x) => x.handSeen)) why.push("su mano no se ve encima de la hoja");
  const names = [...new Set(late.flatMap((x) => x.props.map((q) => q.name)))];
  const props = names.map((n) => {
    const seen = late.map((x) => x.props.find((q) => q.name === n)).filter(Boolean);
    const far = Math.max(...seen.map((q) => q.hand));
    return {
      name: n,
      hand: far,
      reach: seen.every((q) => q.reach),
      seen: Math.max(...seen.map((q) => q.seen)),
      inside: seen.find((q) => q.inside)?.inside,
      hiddenBy: seen.every((q) => q.hiddenBy) ? seen[0].hiddenBy : undefined,
    };
  });
  for (const q of props) {
    if (!q.reach) why.push(`${q.name} lejos de sus manos (${q.hand.toFixed(2)} m) y fuera del puesto`);
    if (q.seen === 0) why.push(`${q.name} no se ve (${q.hiddenBy ? `tapado por ${q.hiddenBy}` : "fuera de la franja sobre la hoja"})`);
    if (q.inside) why.push(`${q.name} dentro de otra pieza (${q.inside})`);
  }
  if (!props.length && !s.some((x) => x.spotSeen)) why.push("sin objetos y el sitio del paso no se ve");
  const a = s[0];
  return { ok: why.length === 0, why, props, action: a.action, place: a.place, gesture, feet: Math.max(...s.map((x) => x.feetToSpot)) };
}

/** The right pick for the challenge on screen (in «paso a paso» each block is one pick). */
async function pickRight(j, oracle, whole = false) {
  const p = j.page;
  const ex = await p.evaluate(oracle);
  if (!ex) return undefined;
  if (ex.kind === "choice") {
    await j.tapAt(p.locator(".duel .option").nth(ex.correct));
    return { text: ex.options[ex.correct], part: false };
  }
  const stepwise = await p.evaluate(() => localStorage.getItem("codeship.retos-ordenar") === "pasos");
  if (!stepwise || whole) {
    // The whole order as one step (a trip or landing plan draws each exercise, not each block).
    if (!stepwise) await j.answer(oracle, true);
    else for (const id of ex.solution) if (await p.locator(`.duel .tray [data-id="${id}"]`).count()) await j.tapAt(p.locator(`.duel .tray [data-id="${id}"]`));
    return { text: ex.blocks.find((b) => b.id === ex.solution[0])?.pseudo ?? "", part: false };
  }
  for (const id of ex.solution) {
    const loc = p.locator(`.duel .tray [data-id="${id}"]`);
    if (await loc.count()) {
      await j.tapAt(loc);
      return { text: ex.blocks.find((b) => b.id === id)?.pseudo ?? id, part: true };
    }
  }
  return undefined;
}

const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

/** One chore of the ring, from the task list's «Ir» to its result, each step audited. */
async function playChore(j, chore, rows) {
  const p = j.page;
  await j.tap(".tasks-btn", "Tareas");
  await p.waitForTimeout(300);
  // Doing other chores (or the clock) may have solved this one: it is not pending any more.
  if (!(await p.locator(`.task-board [data-go="${chore.id}"]`).count())) {
    j.problem(`«${chore.title}» ya no está en la lista de tareas: no se audita`);
    await j.tap(".task-board [data-close]", "Cerrar tareas");
    return;
  }
  // A player scrolls the list until the task is in the middle (not under the board's sticky header).
  await p.locator(`.task-board [data-go="${chore.id}"]`).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await p.waitForTimeout(200);
  if (!(await j.tap(`.task-board [data-go="${chore.id}"]`, `Ir: ${chore.title}`))) return;
  try {
    await j.waitDuel(240000);
  } catch {
    j.check(`«${chore.title}»: se abre el reto`, false, await p.evaluate(() => document.querySelector(".banner")?.textContent ?? ""));
    await p.keyboard.press("Escape");
    return;
  }
  await p.waitForTimeout(500);
  const framed = await p.evaluate(() => window.codeship.interior.steps.framing);
  if (!framed) {
    rows.push({ chore, step: "—", act: "—", shot: await stripShot(j, `${slug(chore.id)}-00.webp`), ok: chore.kind === "yoga", why: chore.kind === "yoga" ? ["la postura de la figura en la esterilla es el paso (no se enmarca)"] : ["no hay escena de pasos"] });
  }
  const oracle = () => window.codeship.interior.session?.run.current ?? null;
  let n = 0;
  for (let guard = 0; guard < 40; guard++) {
    if ((await j.texts(".duel .result")).length) break;
    const before = await p.evaluate(() => window.codeship.interior.steps.played ?? 0);
    const pick = await pickRight(j, oracle);
    if (!pick) break;
    if (!framed) continue;
    n++;
    const file = `${slug(chore.id)}-${String(n).padStart(2, "0")}.webp`;
    const r = await followAct(j, before, file);
    const v = judge(r);
    rows.push({ chore, step: pick.text, act: v.action ? `${v.action} · ${v.place}` : "—", shot: r.shot, ok: v.ok, why: v.why, props: v.props });
    j.check(`«${chore.title}», paso ${n} («${pick.text}»): ${v.action ?? "nada"} se ve al alcance y sobre la hoja`, v.ok, v.why.join("; "));
  }
  const res = (await j.texts(".duel .result"))[0] ?? "";
  if (!/Conseguido/.test(res)) j.check(`«${chore.title}» termina «Conseguido» respondiendo bien`, false, res);
  if (await p.locator(".duel button.end").count()) await j.tap(".duel button.end", "Continuar");
  else await j.tap('.duel [data-act="close"]', "Cerrar");
  await p.waitForTimeout(500);
  j.check(`«${chore.title}»: al cerrar, los utensilios se recogen`, await p.evaluate(() => !window.codeship.interior.steps.root.visible));
}

/** Trip and landing plans: each right step draws its part, on screen above the sheet. */
async function playPlan(j, rows, label, oracle, id) {
  const p = j.page;
  let n = 0;
  for (let guard = 0; guard < 12; guard++) {
    if ((await j.texts(".duel .result")).length) break;
    if (!(await p.evaluate(oracle))) break;
    const before = await p.evaluate(() => window.codeship.planOverlay.drawn);
    const pick = await pickRight(j, oracle, true);
    if (!pick) break;
    // The step's part of the plan and its caption (they may take a frame or two under load).
    await p.waitForFunction((b) => window.codeship.planOverlay.drawn > b && !!document.querySelector(".plan-caption.on")?.textContent, before, { timeout: 4000 }).catch(() => {});
    await p.waitForTimeout(400);
    n++;
    const a = await p.evaluate(() => {
      const el = [...document.querySelectorAll(".duel.sheet, .duel")].find((e) => !e.classList.contains("hidden"));
      return window.codeship.planAudit(el?.classList.contains("sheet") ? el.getBoundingClientRect().top : innerHeight);
    });
    const shot = await stripShot(j, `${id}-${String(n).padStart(2, "0")}.webp`);
    const why = [];
    if (a.drawn <= before && !pick.part) why.push("el paso no añade nada al plan");
    if (!a.inView) why.push("el plan se dibuja en una escena que no está en pantalla");
    else if (a.points && a.onScreen === 0) why.push(`ninguno de sus ${a.points} puntos queda en pantalla sobre la hoja`);
    if (process.env.ANIM_DEBUG) console.log(JSON.stringify(a));
    if (!a.caption) why.push("sin rótulo del paso");
    const ok = why.length === 0;
    rows.push({ chore: { id, title: label }, step: pick.text, act: a.caption || "—", shot, ok, why });
    j.check(`${label}, paso ${n} («${pick.text}»): el plan se ve sobre la hoja`, ok, why.join("; ") || `${a.onScreen}/${a.points} puntos en pantalla`);
  }
}

/** Contact sheet (docs/qa/animaciones.md): one row per step. */
function writeDoc(rows, extra) {
  const ok = rows.filter((r) => r.ok).length;
  const esc = (s) => String(s).replace(/\|/g, "\\|");
  const lines = [
    "# Auditoría de animaciones de los retos",
    "",
    "Generado por `tools/experiencia/animaciones.mjs` (recorrido PX-20, `npm run experiencia -- PX-20`), en un iPhone 13 (390 × 664 visibles, 1×).",
    "Cada reto se juega con toques en las respuestas correctas, en «paso a paso» (cada bloque bien colocado es un paso). Tras cada paso se mide en la escena 3D (`src/adapters/three/interior/step-audit.ts`):",
    "",
    `- **Alcance**: cada objeto a ≤ ${RULES.reach} m de una de sus manos, o sobre el sitio del paso (≤ 0,45 m) con ella de pie delante (≤ 0,9 m).`,
    "- **A la vista**: alguna parte del objeto en la franja de escena sobre la hoja del reto y sin muebles ni su cuerpo delante.",
    "- **Sin atravesar**: el centro del objeto no está dentro de otra pieza (encimera, pared, máquina).",
    `- **Gesto**: su pose se aparta de la de espera al menos ${RULES.gesture} rad, y su mano se ve.`,
    "- **Planes de viaje y aterrizaje**: cada paso añade su parte del plan, con rótulo, y sus puntos quedan en pantalla sobre la hoja.",
    "",
    "Regla (docs/qa/README.md): todo reto o visual de paso nuevo debe pasar esta auditoría.",
    "",
    `**${ok} de ${rows.length} pasos bien.**`,
    "",
    ...extra,
    "",
    "| Tarea | Paso | Se ve | Captura | Resultado |",
    "|---|---|---|---|---|",
    ...rows.map((r) => `| ${esc(r.chore.title)} | ${esc(r.step)} | ${esc(r.act)} | <img src="../screenshots/anim/${r.shot}" width="180" alt="${esc(r.chore.title)}: ${esc(r.step)}"> | ${r.ok ? "✓ bien" : `✗ ${esc(r.why.join("; "))}`} |`),
    "",
  ];
  writeFileSync(DOC, lines.join("\n"));
}

/** Which ring chores to play: every recipe and process, and one of each kind at each station. */
const chooseChores = () => {
  const i = window.codeship.interior;
  const seen = new Set();
  const out = [];
  // Yoga is acted out by her figure on the mat, posture by posture (its own journey, PX-23).
  for (const c of i.currentChores().filter((x) => x.kind !== "yoga")) {
    const facts = i.choreFacts().find((f) => f.id === c.id);
    const key = `${c.kind}|${facts?.station}`;
    if (c.kind === "cocinar" || c.kind === "procesar" || !seen.has(key)) {
      seen.add(key);
      out.push({ id: c.id, title: c.title, kind: c.kind, station: facts?.station });
    }
  }
  // Station by station along the ring, so she walks little between chores.
  const ORDER = ["cocina", "procesado", "huerto", "biorreactor", "enfermeria", "panel", "navegacion", "ejercicio", "camarote", "yoga", "gatos", "perros", "gallinero", "terreno", "acuario", "catalogo"];
  return out.sort((a, b) => ORDER.indexOf(a.station) - ORDER.indexOf(b.station));
};

export async function animaciones(j) {
  let p = j.page;
  const solo = (process.env.ANIM_SOLO ?? "").split(",").filter(Boolean);
  const want = (id) => !solo.length || solo.some((s) => id.includes(s));
  if (!solo.length && existsSync(SHOTS)) for (const f of readdirSync(SHOTS)) rmSync(join(SHOTS, f));
  mkdirSync(SHOTS, { recursive: true });
  const rows = [];
  const extra = [];

  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la nave de viaje");
  await p.waitForTimeout(800);
  await j.setup("la llevamos al anillo; «Ir» con teletransporte (ajuste de la esterilla); «paso a paso» en los retos de ordenar", () => {
    const c = window.codeship;
    c.interior.zones.zone = "anillo";
    c.interior.zones.autoDown = false;
    c.settings.set("taskTravel", "teletransporte");
    localStorage.setItem("codeship.retos-ordenar", "pasos");
  });
  // A new game has no animals (docs/design/catalogo-especies.md): every kind that has chores, from the catalogue.
  await adoptar(j, [["gato", "mascotas"], ["perro-mestizo", "mascotas"], ["gallina", "aves"], ["medaka", "peces"], ["nerita", "caracoles"], ["lombriz", "suelo"]]);
  await llegan(j);
  // Every larder item of the data (src/modules/kitchen/data/items.ts), so every recipe and process can be made.
  const items = [...readFileSync(join("src", "modules", "kitchen", "data", "items.ts"), "utf8").matchAll(/id: "([a-z0-9-]+)"/g)].map((m) => m[1]);
  await j.setup("despensa llena para cada receta y proceso; una sacudida rompe máquinas, vuelca macetas, hiere y contamina; pasa medio día (hambre y sed)", (ids) => {
    const h = window.codeship.habitat;
    for (const id of ids) h.stock(id, 5000);
    h.jolt(0.9, "Auditoría");
    h.tick(0.5);
  }, items);
  await j.resetPerf();
  const chores = (await p.evaluate(chooseChores)).filter((c) => want(c.id));
  extra.push(`Tareas del anillo jugadas: ${chores.length} (${[...new Set(chores.map((c) => c.kind))].length} clases).`);
  for (const c of chores) await playChore(j, c, rows);

  // A trip from the ring's navigation console: each step draws its part of the route.
  if (want("viaje")) {
    await p.evaluate(() => window.codeship.interior.openNavConsole());
    await p.waitForTimeout(1200);
    const id = await p.evaluate(() => window.codeship.nav.targets.find((t) => t.kind === "asteroid" && t.id !== window.codeship.region.target.data.id)?.id);
    await j.tap(`.nav-map .nav-chip[data-id="${id}"]`, "asteroide en el mapa");
    await p.waitForTimeout(400);
    if (await j.tap('.nav-map [data-act="program"]', "Programar viaje")) {
      await j.waitDuel(30000);
      await playPlan(j, rows, "Programar un viaje (consola de navegación del anillo)", () => window.codeship.nav.programming?.current ?? null, "viaje");
      // A plan that flies closes its sheet by itself.
      await p.waitForTimeout(1500);
      if (await p.locator(".duel:not(.hidden) button.end").count()) await j.tap(".duel:not(.hidden) button.end", "Continuar");
      else if (await p.locator('.duel:not(.hidden) [data-act="close"]').count()) await j.tap('.duel:not(.hidden) [data-act="close"]', "×");
    }
  }

  // Landing by program (the lander, from its cabin at the start): each step draws on the ground.
  if (want("aterrizaje")) {
    // A fresh game: the lander, from its cabin, 300 m over Bennu (the chores above changed the ship's state).
    const url = p.url();
    const errors = j.errors;
    await j.encoder?.close();
    j.encoder = undefined;
    await j.browser.close();
    p = await j.open(url);
    j.errors.unshift(...errors);
    await j.setup("el módulo llega a 300 m de Bennu, parado sobre el suelo", placeAbove, ["modulo", 300, 0]);
    await p.waitForTimeout(1200);
    if (await j.tap(".ctx-dock > .land-offer", "Aterrizar con un programa")) {
      await j.waitDuel(30000);
      await playPlan(j, rows, "Aterrizar el módulo con un programa", () => window.codeship.landerLanding.programming?.current ?? null, "aterrizaje-modulo");
      await p.waitForTimeout(800);
    }
  }

  extra.push(
    "Abierto: el plan de un viaje programado desde la consola de navegación del anillo se dibuja en la escena de vuelo, pero el mapa de navegación ocupa la franja sobre la hoja y la ruta (km) no cabe en su cámara (UA): sus filas salen ✗ hasta que el mapa enseñe el plan.",
  );
  extra.push(
    "Sin visual de pasos (no se pueden auditar hasta que lo tengan; abiertos): la cocina de la estación (`station-life.ts` abre la hoja sin `StepVisual`), las tareas de nano_net en un núcleo y las de las máquinas de la estación (fabricar, refinar, importar).",
  );
  const bad = rows.filter((r) => !r.ok).length;
  j.check(`auditoría: ${rows.length - bad} de ${rows.length} pasos se ven bien`, bad === 0, rows.filter((r) => !r.ok).slice(0, 4).map((r) => `${r.chore.title} / ${r.step}: ${r.why[0]}`).join(" | "));
  if (!process.env.ANIM_SIN_DOC && !solo.length) writeDoc(rows, extra);
  if (solo.length) writeFileSync(join(j.dir, "anim-solo.json"), JSON.stringify(rows.map((r) => ({ ...r, chore: r.chore.id })), null, 1));
  await j.encoder?.close();
}
