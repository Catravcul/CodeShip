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

/**
 * `who`: the scene acting the steps out, a path under window.codeship: `interior` (the ring), `stationInside` (the
 * station) or `starship.mode` (Starship's decks).
 */
const auditNow = (j, who = "interior") =>
  j.page.evaluate((w) => {
    const el = [...document.querySelectorAll(".duel.sheet")].find((e) => !e.classList.contains("hidden"));
    return w.split(".").reduce((o, k) => o[k], window.codeship).stepAudit(el ? el.getBoundingClientRect().top : innerHeight) ?? null;
  }, who);
const playedNow = (j, who = "interior") => j.page.evaluate((w) => w.split(".").reduce((o, k) => o[k], window.codeship).steps.played ?? 0, who);

/**
 * Follows the act that a right answer started: samples the scene while it plays (from its start to its
 * end and the moment after, when its props stay on the counter), with a screenshot halfway.
 */
async function followAct(j, before, file, who = "interior") {
  const p = j.page;
  const started = await p
    .waitForFunction(([n, w]) => (w.split(".").reduce((o, k) => o[k], window.codeship).steps.played ?? 0) > n, [before, who], { timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  if (!started) return { started: false, samples: [], shot: (await stripShot(j, file)) };
  const target = before + 1;
  const samples = [];
  let shot;
  const t0 = Date.now();
  while (Date.now() - t0 < 9000) {
    const a = await auditNow(j, who);
    if (!a || a.played !== target) break;
    samples.push(a);
    if (!shot && (a.t >= 0.5 || !a.playing)) shot = await stripShot(j, file);
    if (!a.playing) break;
    await p.waitForTimeout(120);
  }
  if (!shot) shot = await stripShot(j, file);
  return { started: true, samples, shot };
}

const a0 = (s) => s[0] ?? {};

/** Pass or fail of one act from its samples, with the reasons a designer can read. */
export function judge(r) {
  const why = [];
  if (!r.started) return { ok: false, why: ["no se ve nada: el paso no se representa"], props: [] };
  const s = r.samples;
  if (!s.length) return { ok: false, why: ["sin muestras de la escena"], props: [] };
  const late = s.filter((x) => x.t >= 0.35 || !x.playing);
  const gesture = Math.max(...s.map((x) => x.gesture));
  if (gesture < RULES.gesture) why.push(`el gesto no se nota (${gesture.toFixed(2)} rad)`);
  // A yoga posture is her whole body in the asana (the figure is the step), not something in her hand.
  if (a0(s).action !== "postura" && !s.some((x) => x.handSeen)) why.push("su mano no se ve encima de la hoja");
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
  await auditSheet(j, rows, chore, () => window.codeship.interior.session?.run.current ?? null);
}

/**
 * The challenge sheet open now, played with right answers in «paso a paso»: each step's act audited in
 * the scene `who` acts it out in (`interior`, the ring; `stationInside`, the station), then closed.
 */
async function auditSheet(j, rows, chore, oracle, who = "interior") {
  const p = j.page;
  const framed = await p.evaluate((w) => w.split(".").reduce((o, k) => o[k], window.codeship).steps.framing, who);
  if (!framed) {
    rows.push({ chore, step: "—", act: "—", shot: await stripShot(j, `${slug(chore.id)}-00.webp`), ok: chore.kind === "yoga", why: chore.kind === "yoga" ? ["la postura de la figura en la esterilla es el paso (no se enmarca)"] : ["no hay escena de pasos"] });
  }
  let n = 0;
  for (let guard = 0; guard < 40; guard++) {
    if ((await j.texts(".duel .result")).length) break;
    const before = await playedNow(j, who);
    const pick = await pickRight(j, oracle);
    if (!pick) break;
    if (!framed) continue;
    n++;
    const file = `${slug(chore.id)}-${String(n).padStart(2, "0")}.webp`;
    const r = await followAct(j, before, file, who);
    const v = judge(r);
    rows.push({ chore, step: pick.text, act: v.action ? `${v.action} · ${v.place}` : "—", shot: r.shot, ok: v.ok, why: v.why, props: v.props });
    j.check(`«${chore.title}», paso ${n} («${pick.text}»): ${v.action ?? "nada"} se ve al alcance y sobre la hoja`, v.ok, v.why.join("; "));
  }
  await p.waitForTimeout(1000);
  const res = (await j.texts(".duel .result"))[0] ?? "";
  if (!/Conseguido|Bien hecho|Hecho/.test(res)) j.check(`«${chore.title}» termina bien respondiendo bien`, false, res);
  if (await p.locator(".duel button.end").count()) await j.tap(".duel button.end", "Continuar");
  else await j.tap('.duel [data-act="close"]', "Cerrar");
  await p.waitForTimeout(500);
  j.check(`«${chore.title}»: al cerrar, los utensilios se recogen`, await p.evaluate((w) => !w.split(".").reduce((o, k) => o[k], window.codeship).steps.root.visible, who));
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

/** A new game in a new browser (what the sections before changed is gone); keeps the errors seen so far. */
async function freshGame(j) {
  const url = j.page.url();
  const errors = j.errors;
  await j.encoder?.close();
  j.encoder = undefined;
  await j.browser.close();
  const p = await j.open(url);
  j.errors.unshift(...errors);
  return p;
}

/**
 * The station (docs/design/estacion-tripulacion.md): the galley's dish and one chore of each machine
 * (refine, fabricate, the biology lab, import), each acted out by Doménica at its fixture.
 */
async function playStation(j, rows, skipped = []) {
  const p = j.page;
  await j.setup("acopla el módulo en su puerto de la estación", () => {
    const c = window.codeship;
    c.docking.undock();
    c.docking.dockNow(c.structure.portFor("sonda"));
    localStorage.setItem("codeship.retos-ordenar", "pasos");
  });
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-estacion", "Entrar en la estación");
  await p.waitForTimeout(900);
  await j.setup("almacén lleno de cada material; módulo agrícola con el laboratorio de biología y la espirulina montados", () => {
    const c = window.codeship;
    const st = c.stationOps.station;
    const plans = c.stationOps.plans();
    const ids = new Set();
    for (const pl of plans) for (const id of Object.keys(pl.blueprint.inputs)) ids.add(id);
    for (const r of c.stationOps.refining()) for (const id of Object.keys(r.process.inputs)) ids.add(id);
    for (const id of ids) st.stock.add({ [id]: 2000 });
    const o = st.outfit;
    const farm = plans.find((pl) => pl.blueprint.product.kind === "module" && pl.blueprint.product.module.kind === "agricola")?.blueprint.product.module;
    if (farm && !o.hasModule(farm.id)) {
      o.claimModule(farm);
      o.completeModule(farm);
    }
    for (const id of ["laboratorio-bio", "fotobiorreactor-espirulina"]) {
      const eq = plans.find((pl) => pl.blueprint.product.kind === "equipment" && pl.blueprint.product.equipment.id === id)?.blueprint.product.equipment;
      if (eq && !o.has(id)) o.completeEquipment(eq);
    }
  });
  await p.waitForTimeout(800);
  const placeAt = (id) => j.setup(`Doménica va hasta «${id}» (cruzar la estación salto a salto lleva minutos)`, (f) => window.codeship.stationInside.placeAt(f), id);
  const machineOracle = () => window.codeship.station.session?.run.current ?? null;

  // The galley: a dish from the station's larder.
  await placeAt("cocina");
  const dish = await p.evaluate(() => document.querySelector('.sti-card [data-act^="chore:cocinar"]')?.textContent?.trim() ?? "");
  if (await j.tap('.sti-card [data-act^="chore:cocinar"]', "Cocinar un plato")) {
    await j.waitDuel();
    await p.waitForTimeout(500);
    await auditSheet(j, rows, { id: "estacion-cocina", title: `Estación: ${dish}` }, () => window.codeship.stationLife.session?.run.current ?? null, "stationInside");
  }

  // The crew areas and a repair (Berón, 2026-11-17: «hay acciones sin animación»): yoga on the mat (Destiny), a workout
  // at the T2/ARED (Tranquility) and the CDRA's clogged beds at the air rack, each one played from its card.
  await crewAt(j, rows, { placeAt, card: ".sti-card", fixture: "esterilla", act: "chore:yoga", id: "estacion-yoga", title: "Estación: yoga en la esterilla", oracle: () => window.codeship.stationLife.session?.run.current ?? null, who: "stationInside" });
  await crewAt(j, rows, { placeAt, card: ".sti-card", fixture: "ejercicio", act: "chore:ejercicio", id: "estacion-ejercicio", title: "Estación: ejercicio en la T2 y el ARED", oracle: () => window.codeship.stationLife.session?.run.current ?? null, who: "stationInside" });
  await j.setup("se taponan los lechos de zeolita del CDRA", () => window.codeship.lifeSupport.system.fail("cdra-lechos"));
  await crewAt(j, rows, { placeAt, card: ".sti-card", fixture: "sv-ar", act: "chore:sv-cdra-lechos", id: "estacion-cdra", title: "Estación: cambiar los lechos del CDRA (bastidor de aire)", oracle: () => window.codeship.lifeSupport.session?.run.current ?? null, who: "stationInside" });

  // The machines: open their tab from the fixture's card, start a chore there.
  const MACHINES = [
    { fixture: "guantera", tab: "materiales", start: '.st-body [data-refine]:not([disabled])', id: "estacion-refinar", title: "Estación: refinar" },
    { fixture: "impresora", tab: "planos", start: '.st-body [data-build]:not([disabled])', id: "estacion-fabricar", title: "Estación: fabricar" },
    { fixture: "laboratorio-bio", tab: "vida", start: '.st-body [data-tune]:not([disabled])', id: "estacion-biologia", title: "Estación: ajustar un biorreactor" },
  ];
  for (const m of MACHINES) {
    // A machine with no rack to stand at (no module to mount it in) is skipped, not failed.
    if (!(await placeAt(m.fixture))) {
      skipped.push(m.fixture);
      continue;
    }
    if (!(await j.tap('.sti-card [data-act="abrir"]', `Abrir el panel de «${m.fixture}»`))) continue;
    await p.waitForTimeout(500);
    if (!(await p.locator(m.start).count())) {
      j.check(`${m.title}: hay un reto que empezar`, false, await p.evaluate(() => document.querySelector(".st-body")?.textContent?.slice(0, 160) ?? ""));
      await j.tap(".st-back", "Volver");
      continue;
    }
    await p.locator(m.start).first().evaluate((el) => el.scrollIntoView({ block: "center" }));
    const label = await p.locator(m.start).first().evaluate((el) => el.closest(".st-card")?.querySelector("b")?.textContent ?? "");
    await j.tapAt(p.locator(m.start).first());
    await j.waitDuel();
    await p.waitForTimeout(500);
    await auditSheet(j, rows, { id: m.id, title: `${m.title}${label ? ` (${label})` : ""}` }, machineOracle, "stationInside");
    await j.tap(".st-back", "Volver");
    await p.waitForTimeout(500);
  }
  // Importing: from the glovebox's screen, its «Importar» tab, an order of xenon.
  await placeAt("guantera");
  if (await j.tap('.sti-card [data-act="abrir"]', "Abrir Materiales")) {
    await j.tap('.st-tabs [data-tab="importar"]', "Importar");
    await j.tap('.st-body [data-good-plus="xenon"]', "+ xenón");
    if (await j.tap(".st-body [data-order]:not([disabled])", "Pedir")) {
      await j.waitDuel();
      await p.waitForTimeout(500);
      await auditSheet(j, rows, { id: "estacion-importar", title: "Estación: importar (pedido de xenón)" }, machineOracle, "stationInside");
    }
    await j.tap(".st-back", "Volver");
  }
}

/** A chore started from a fixture's card (her card at the galley, the mat, a machine, a rack), then audited. */
async function crewAt(j, rows, o) {
  const p = j.page;
  await o.placeAt(o.fixture);
  await p.waitForTimeout(500);
  const btn = `${o.card} [data-act^="${o.act}"]`;
  const label = await p.evaluate((b) => document.querySelector(b)?.textContent?.trim() ?? "", btn);
  if (!label) {
    j.check(`${o.title}: su tarjeta ofrece el reto`, false, await p.evaluate((c) => document.querySelector(c)?.textContent?.slice(0, 160) ?? "sin tarjeta", o.card));
    return;
  }
  if (!(await j.tap(btn, `${o.title}: ${label}`))) return;
  await j.waitDuel();
  await p.waitForTimeout(500);
  await auditSheet(j, rows, { id: o.id, title: `${o.title} (${label})`, kind: o.kind }, o.oracle, o.who);
}

/**
 * Starship's decks (the real mothership, docs/design/nodriza-starship.md): every dish of its galley, each workout
 * at its machine, yoga on the mat, the aquatic habitat (JAXA's AQH, with medakas from the catalogue) and a repair.
 */
async function playStarship(j, rows) {
  const p = j.page;
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la Starship");
  await p.waitForTimeout(900);
  await j.setup("«paso a paso» en los retos de ordenar", () => localStorage.setItem("codeship.retos-ordenar", "pasos"));
  const placeAt = (id) => j.setup(`Doménica va hasta «${id}» (los saltos por los asideros se juegan en PX-28)`, (f) => window.codeship.starship.mode.placeAt(f), id);
  const crew = () => window.codeship.starship.session?.run.current ?? null;
  const facts = await p.evaluate(() => window.codeship.starship.choreFacts().map((f) => ({ id: f.id, station: f.station, title: f.title })));
  const W = { card: ".sts-card", oracle: crew, who: "starship.mode", placeAt };
  for (const f of facts.filter((x) => /^(cocinar|yoga|ejercicio)-/.test(x.id)))
    await crewAt(j, rows, { ...W, fixture: f.station, act: `chore:${f.id}`, id: `starship-${f.id}`, title: `Starship: ${f.title}` });
  // The aquatic habitat: medakas adopted at the catalogue terminal (deck 2), then fed at the AQH (deck 3).
  if (await adoptarStarship(j)) {
    const fish = await p.evaluate(() => window.codeship.starship.choreFacts().filter((f) => f.station === "habitat-acuatico").map((f) => ({ id: f.id, station: f.station, title: f.title })));
    for (const f of fish.slice(0, 3)) await crewAt(j, rows, { ...W, fixture: f.station, act: `chore:${f.id}`, id: `starship-${f.id}`, title: `Starship: ${f.title}` });
  }
  await j.setup("se taponan los lechos del CDRA de la Starship", () => window.codeship.starship.lifeSupport.system.fail("cdra-lechos"));
  const rack = await p.evaluate(() => window.codeship.starship.lifeSupport.taskFacts().find((t) => t.id.includes("cdra"))?.area);
  if (rack) await crewAt(j, rows, { ...W, fixture: rack, act: "chore:sv-cdra-lechos", id: "starship-cdra", title: "Starship: cambiar los lechos del CDRA", oracle: () => window.codeship.starship.lifeSupport.session?.run.current ?? null });
}

/** Medakas adopted at the catalogue (from the task list, as a player does) and their trip from the Sanctuary. */
async function adoptarStarship(j) {
  await adoptar(j, [["medaka", "peces"]]);
  await llegan(j);
  return j.page.evaluate(() => window.codeship.starship.choreFacts().some((f) => f.station === "habitat-acuatico"));
}

/**
 * Every challenge a player reaches in the real game (REAL_ONLY, src/core/realism.ts) and where its steps are acted
 * out (Berón, 2026-11-17: «hay acciones sin animación»). Kept by hand next to the audit that plays them.
 */
const INVENTORY = [
  "## Inventario: retos del juego real (REAL_ONLY) y su animación",
  "",
  "| Reto | Dónde se juega | Entorno real de la animación | En la auditoría |",
  "|---|---|---|---|",
  "| Comida de la ISS (avena, frijoles, sopa) | Cocina de la Starship (cubierta 1) y de Unity | Ella en la cocina con el envase: sacarlo, agua por la aguja del dispensador, amasar, esperar, calentador, tijeras, cuchara | Sí (Starship y estación) |",
  "| Yoga (upa-yoga, saludo al sol) | Esterilla de la Starship (cubierta 1) y de Destiny | Ella en la esterilla, postura a postura con su asana, vista de cuerpo entero | Sí |",
  "| Ejercicio (intervalos, continuo, fuerza) | T2, CEVIS y ARED de la cubierta 3; T2 y ARED de Tranquility | Cada entrenamiento en su máquina (la T2 en el suelo) | Sí |",
  "| Hábitat acuático (medakas) | Rack AQH de la cubierta 3 (JAXA, voló en Kibo) | Ella en el rack | Sí |",
  "| Catálogo de especies (amistad y ayuda de colonias) | Terminal del catálogo, cubierta 2 | Ella en el terminal (programas en la mente) | Mismo motor que el AQH |",
  "| Reparaciones y preventivos del soporte vital | Bastidores de la Starship y de la ISS | Ella en el bastidor con la llave; las luces del procedimiento en el bastidor; los del techo, flotando bajo él | Sí (CDRA en la Starship y en la estación) |",
  "| Refinar, fabricar (pieza impresa), importar, ajustar un biorreactor | Máquinas de la estación | Ella en los estribos de cada máquina | Sí (el biorreactor solo con su módulo montado) |",
  "| Ponerse el traje (EVA) | Escotilla delantera del LM | Ella en la escotilla revisando el traje paso a paso | Lo comprueba PX-31 al salir; la captura en PX-37 |",
  "| Programar un viaje | Mesa de navegación de la cubierta de vuelo | El plan se dibuja en el mapa paso a paso | Sí |",
  "| Aterrizar el módulo o la sonda con un programa | Asiento del LM; mando de la sonda | El plan se dibuja sobre el suelo paso a paso | Sí |",
  "| Cambiar o montar una pieza en la bahía | Bahía de la nave (pantalla de la estación) | **Pendiente**: la bahía es la vista del vehículo, sin ella; ver «Abierto» | No |",
  "| Duelo de la mente, nano_net | Consola de la mente | Ficción que se queda (reglas §1.2): su escena es la mente, sin figura | No |",
  "| Dormir | Camarotes | Lo hace la rama `compartimentos-reales` | No |",
  "",
  "**Abierto:** el reto de cambiar una pieza en la bahía no tiene aún a Doménica: en la ISS esos cambios los hace el brazo o un paseo espacial. Pregunta al diseñador: ¿se anima con Canadarm2 en la vista de la Cupola, o con ella en un paseo? El duelo de la mente y nano_net son la ficción que se queda y se juegan en su propia escena.",
];

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
    `- **Gesto**: su pose se aparta de la de espera al menos ${RULES.gesture} rad, y su mano se ve. En el yoga, el gesto es la asana del paso (está en ella) y cuenta su cuerpo entero, no la mano.`,
    "- **Planes de viaje y aterrizaje**: cada paso añade su parte del plan, con rótulo, y sus puntos quedan en pantalla sobre la hoja.",
    "",
    "Regla (docs/qa/README.md): todo reto o visual de paso nuevo debe pasar esta auditoría.",
    "",
    ...INVENTORY,
    "",
    "## Hoja de contactos",
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
  if (!solo.length && !process.env.ANIM_SIN_DOC && existsSync(SHOTS)) for (const f of readdirSync(SHOTS)) rmSync(join(SHOTS, f));
  mkdirSync(SHOTS, { recursive: true });
  const rows = [];
  const extra = [];

  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la nave de viaje");
  await p.waitForTimeout(800);
  // The ring exists only with the fiction switch on (src/core/realism.ts, REAL_ONLY): without it its chores
  // and its navigation console are skipped, not failed.
  const ring = await p.evaluate(() => !!window.codeship.interior?.zones);
  await j.setup("la llevamos al anillo (si lo hay); «Ir» con teletransporte (ajuste de la esterilla); «paso a paso» en los retos de ordenar", () => {
    const c = window.codeship;
    if (c.interior?.zones) {
      c.interior.zones.zone = "anillo";
      c.interior.zones.autoDown = false;
    }
    c.settings.set("taskTravel", "teletransporte");
    localStorage.setItem("codeship.retos-ordenar", "pasos");
  });
  // A new game has no animals (docs/design/catalogo-especies.md): every adoptable kind that has chores (the
  // fish and snails of the aquatic habitat, the mice of the rodent habitat), from the catalogue.
  if (ring) {
    await adoptar(j, [["medaka", "peces"], ["caracol", "caracoles"], ["raton", "mascotas"]]);
    await llegan(j);
  }
  // Every larder item of the data (src/modules/kitchen/data/items.ts), so every recipe and process can be made.
  const items = [...readFileSync(join("src", "modules", "kitchen", "data", "items.ts"), "utf8").matchAll(/id: "([a-z0-9-]+)"/g)].map((m) => m[1]);
  await j.setup("despensa llena para cada receta y proceso; una sacudida rompe máquinas, vuelca macetas, hiere y contamina; pasa medio día (hambre y sed)", (ids) => {
    const h = window.codeship.habitat;
    for (const id of ids) h.stock(id, 5000);
    h.jolt(0.9, "Auditoría");
    h.tick(0.5);
  }, items);
  await j.resetPerf();
  const chores = ring ? (await p.evaluate(chooseChores)).filter((c) => want(c.id)) : [];
  if (!ring) extra.push("Sin anillo (REAL_ONLY, src/core/realism.ts): sus tareas y su consola de navegación no se juegan.");
  extra.push(`Tareas del anillo jugadas: ${chores.length} (${[...new Set(chores.map((c) => c.kind))].length} clases).`);
  for (const c of chores) await playChore(j, c, rows);

  // A trip from the ring's navigation console: each step draws its part of the route.
  if (want("viaje") && ring && (await p.evaluate(() => typeof window.codeship.interior.openNavConsole === "function"))) {
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

  // Without the ring (REAL_ONLY): the trip from the navigation table of Starship's flight deck.
  if (want("viaje") && !ring) {
    p = await freshGame(j);
    await j.tap(".stand-btn", "Levantarse: habitáculo");
    await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la Starship");
    await p.waitForTimeout(800);
    await j.setup("sube a la cubierta de vuelo (los saltos se juegan en PX-28)", () => {
      const c = window.codeship;
      c.starship.exit();
      c.bridge.enter("salida");
      localStorage.setItem("codeship.retos-ordenar", "pasos");
    });
    await j.useMachine("bridge", "nav", "abrir", "Usar la consola: Mesa de navegación");
    await p.waitForTimeout(1200);
    const id = await p.evaluate(() => window.codeship.nav.targets.find((t) => t.kind === "asteroid" && t.id !== window.codeship.region.target.data.id)?.id);
    await j.tap(`.nav-map .nav-chip[data-id="${id}"]`, "asteroide en el mapa");
    await p.waitForTimeout(400);
    if (await j.tap('.nav-map [data-act="program"]', "Programar viaje")) {
      await j.waitDuel(30000);
      await playPlan(j, rows, "Programar un viaje (mesa de navegación de la cubierta de vuelo de la Starship)", () => window.codeship.nav.programming?.current ?? null, "viaje");
      await p.waitForTimeout(1500);
      if (await p.locator(".duel:not(.hidden) button.end").count()) await j.tap(".duel:not(.hidden) button.end", "Continuar");
      else if (await p.locator('.duel:not(.hidden) [data-act="close"]').count()) await j.tap('.duel:not(.hidden) [data-act="close"]', "×");
    }
  }

  // Landing by program (the lander, from its cabin at the start): each step draws on the ground.
  if (want("aterrizaje")) {
    // A fresh game: the lander, from its cabin, 300 m over Bennu (the chores above changed the ship's state).
    p = await freshGame(j);
    await j.setup("el módulo llega a 300 m de Bennu, parado sobre el suelo", placeAbove, ["modulo", 300, 0]);
    await p.waitForTimeout(1200);
    if (await j.tap(".ctx-dock > .land-offer", "Aterrizar con un programa")) {
      await j.waitDuel(30000);
      await playPlan(j, rows, "Aterrizar el módulo con un programa", () => window.codeship.landerLanding.programming?.current ?? null, "aterrizaje-modulo");
      await p.waitForTimeout(800);
    }
  }

  // Landing the probe by program, from its console on the bridge: each step draws on the ground, seen from the probe.
  if (want("aterrizaje")) {
    p = await freshGame(j);
    await j.tap(".stand-btn", "Levantarse: habitáculo");
    await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la nave de viaje");
    await p.waitForTimeout(800);
    await j.setup("sube al puente por la espina", () => {
      const c = window.codeship;
      if (c.interior.active) c.interior.exit();
      c.bridge.enter("salida");
    });
    await j.useMachine("bridge", "sonda", "abrir", "Tomar el mando de la sonda");
    await p.waitForTimeout(600);
    await j.setup("la sonda llega a 300 m de Bennu, parada sobre el suelo", placeAbove, ["sonda", 300, 0]);
    await p.waitForTimeout(1200);
    if (await j.tap(".land-offer.probe", "Aterrizar la sonda con un programa")) {
      await j.waitDuel(30000);
      await playPlan(j, rows, "Aterrizar la sonda con un programa (consola de la sonda en el puente)", () => window.codeship.probeLanding.programming?.current ?? null, "aterrizaje-sonda");
      await p.waitForTimeout(800);
    }
  }

  // Starship (REAL_ONLY's mothership): its galley, mat, exercise machines, aquatic habitat and a repair.
  if (want("starship") && !ring) {
    p = await freshGame(j);
    await playStarship(j, rows);
  }

  // The station: the galley and its machines, acted out by Doménica at each fixture (at the station's 1,5 scale).
  if (want("estacion")) {
    p = await freshGame(j);
    const skipped = [];
    await playStation(j, rows, skipped);
    if (skipped.length) extra.push(`Estación: sin sitio a bordo para ${skipped.map((x) => `«${x}»`).join(", ")}: no hay módulo con rack donde montarlo, no se juega.`);
  }

  extra.push(
    "El viaje desde la consola de navegación: el mapa se oculta con el reto como toda interfaz (foco del reto, sin excepciones) y el plan se dibuja en la escena del reto, que lo encuadra en la franja sobre la hoja cuando la vista de la consola no lo ve (PlanOverlay.view).",
  );
  extra.push(
    "Estación (escala 1,5): la cocina, la esterilla de Destiny, la T2 y el ARED, el bastidor de aire y las máquinas (refinar, fabricar, laboratorio de biología, importar) con Doménica en cada una. Starship: la cocina, la esterilla, la T2, el CEVIS, el ARED, el hábitat acuático y el bastidor de aire. Sin visual de pasos, aplazados con nano_net (sistema ficticio, al backlog): los retos de nano_net.",
  );
  const bad = rows.filter((r) => !r.ok).length;
  j.check(`auditoría: ${rows.length - bad} de ${rows.length} pasos se ven bien`, bad === 0, rows.filter((r) => !r.ok).slice(0, 4).map((r) => `${r.chore.title} / ${r.step}: ${r.why[0]}`).join(" | "));
  if (!process.env.ANIM_SIN_DOC && !solo.length) writeDoc(rows, extra);
  if (solo.length) writeFileSync(join(j.dir, "anim-solo.json"), JSON.stringify(rows.map((r) => ({ ...r, chore: r.chore.id })), null, 1));
  await j.encoder?.close();
}
