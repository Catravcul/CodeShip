// PX-51 Sanctuary 3, the biome of the air and the heights (docs/design/bioma-s3.md, pupa-abeja.md, larvas-lago.md,
// carbonifero.md), on an iPhone 13 with visible taps only. The «Isla de las alturas» is a mountain of the Karakoram from
// the river to the snows with its real fauna (Khunjerab: ibex, markhor, snow leopard…); inside the mountain (another
// scene, through its gates: montana-hueca.md) live its giant insects of Gilgit-Baltistán (×400), and the hall holds at its
// middle the bee's pupa (Berón 2026-11-26: it takes the cloud globe's place), a translucent wax cell where an Asian
// honeybee lives its metamorphosis, reached walking along the pier from a tree's foot; its lake holds the larvae of
// the island's insects (dragonfly nymphs, mayflies, caddisflies, midges), seen diving; at the pyramid's north-east
// foot, the Carboniferous forest (Lepidodendron, Sigillaria, Calamites, Psaronius, Cordaites) with its giants at real
// size (Arthropleura, roachoids, Mazothairos, Meganeura, Meganeuropsis). In the breeding room inside, the census board
// counts the giant insects, the Carboniferous and the lake's larvae; at the research hut the orange button opens its
// census of the real fauna outside, and the field table offers the field methods (hive
// inspection, butterfly transect, pitfall traps): she does one. The draw calls stay ≤ 600. Captures in
// docs/screenshots/s3b-<sitio>-movil.png.
import { mkdirSync } from "node:fs";
import { lookAt, tilt, walkTo } from "./s3-detalle.mjs";

/** Áreas on the area's own island (the gear's island list: the pupa is on the training island, the zones on the air island), then «Ir». */
async function goArea(j, id, title) {
  const island = id.split(":")[0];
  await j.tap(".areas-btn", "Áreas");
  await j.tap(".areas-window .ar-view", "Ajustes de áreas");
  const isl = `.areas-window [data-vehicle="${island}"]`;
  if (await j.page.locator(isl).count()) await j.tap(isl, `Isla: ${island}`);
  const all = '.areas-window [data-scope-kind=""][data-scope-id=""]';
  if (await j.page.locator(all).count()) await j.tap(all, "Todo: la isla");
  await j.tap(".areas-window .ar-view", "Volver al mapa de áreas");
  await j.tap(`.areas-window [data-pick="${id}"]`, `${title} en el mapa`);
  const ok = await j.tap(`.areas-window [data-area="${id}"]`, `Ir: ${title}`);
  for (let i = 0; i < 40 && (await j.page.evaluate(() => window.codeshipS3.mode)) !== "libre"; i++) await j.page.waitForTimeout(500);
  await j.page.waitForTimeout(600);
  return ok && (await j.page.evaluate(() => window.codeshipS3.mode)) === "libre";
}

async function capture(j, label, title) {
  await j.page.waitForTimeout(600);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/s3b-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

/** The animals of a chain (`life`: "life" the island's, "carbon" the Carboniferous) near her, by species; flying apart. */
const around = (p, r, life = "life") =>
  p.evaluate(
    ([r, life]) => {
      const c = window.codeshipS3;
      const b = c.body;
      const near = {};
      const flying = {};
      for (const q of c.biome[life].poses()) {
        if (q.hidden || Math.hypot(q.x - b.x, q.z - b.z) >= r) continue;
        near[q.species] = (near[q.species] ?? 0) + 1;
        if (q.flying) flying[q.species] = (flying[q.species] ?? 0) + 1;
      }
      return { near, flying, calls: window.__codeshipFrame?.calls ?? 0 };
    },
    [r, life],
  );

export async function s3Bioma(j) {
  const p = j.page;
  await j.tap('.start-screen .mw-pick[data-pick="aereo"]', "Tarjeta: Santuario Aéreo");
  await j.tap('.start-screen .mw-go[data-go="aereo"]', "Jugar: Santuario Aéreo");
  await p.waitForFunction(() => window.codeshipS3, null, { timeout: 120000 });
  await p.waitForFunction(() => performance.getEntriesByName("codeship-primer-fotograma").length > 0, null, { timeout: 60000 }).catch(() => {});
  await j.detectGpu();
  await p.waitForTimeout(1200);
  await j.resetPerf();

  await j.tap(".s3-tasks", "Tareas");
  await j.taskSettings({ travel: "teletransporte", vehicle: "bioma" });
  await j.tap(".task-board .tb-close, .task-board [aria-label='Cerrar tareas']", "Cerrar tareas").catch(() => {});

  const zones = ["estacion", "estepa", "rio", "bosque", "enebral", "garganta", "pradera", "pedrera", "farallon", "cresta", "nieves"].map((z) => `bioma:${z}`);
  const isl = await p.evaluate(() => {
    const c = window.codeshipS3;
    return { name: c.layout.islands.find((i) => i.id === "bioma")?.name, areas: c.layout.areas.filter((a) => a.island === "bioma").map((a) => ({ id: a.id, belt: a.belt?.id })), pupa: c.layout.areas.find((a) => a.id === "entrenamiento:pupa"), globe: c.layout.areas.some((a) => a.id.includes("globo")) };
  });
  j.check("la Isla de las alturas tiene sus zonas del río a las nieves (el bosque del Carbonífero está dentro de la montaña)", isl.name === "Isla de las alturas" && zones.every((z) => isl.areas.some((a) => a.id === z)), isl.areas.map((a) => a.id).join(", "));
  j.check("Áreas tiene la pupa de la abeja en la montaña hueca, y ya no el globo de nubes", !!isl.pupa && !isl.globe, JSON.stringify(isl.pupa?.label));

  let maxCalls = 0;
  // ── The bee's pupa at the hollow pyramid's middle: «Ir» from Áreas, then walked from a tree's foot along the pier.
  let went = await goArea(j, "entrenamiento:pupa", "La pupa de la abeja");
  const P = await p.evaluate(() => window.codeshipS3.biome.pupaAt);
  j.check("«Ir» la lleva al mirador de la pupa, en el centro de la pirámide", went && (await p.evaluate(() => window.codeshipS3.body.area)) === "entrenamiento:pupa", await p.evaluate(() => JSON.stringify(window.codeshipS3.body)));
  await walkTo(j, P.x, P.gallery.z0 + 1.5, 1);
  await lookAt(j, P.x, P.z);
  // At the gallery: the young larva curled on the cell's bottom (day ~4 of 19), looked at a little down.
  await p.evaluate(() => (window.codeshipS3.biome.bee.k = 0.22));
  await tilt(j, -0.15);
  await p.waitForTimeout(1200);
  let tag = await p.evaluate(() => document.querySelector(".s3-pupa-etapa:not(.hidden)")?.textContent ?? "");
  j.check("junto a la pupa, la etiqueta dice la etapa de la abeja: la larva en el fondo de la celda", /Abeja de la pupa · .*[Ll]arva/.test(tag), tag);
  maxCalls = Math.max(maxCalls, await p.evaluate(() => window.__codeshipFrame?.calls ?? 0));
  await capture(j, "pupa-larva", "La pupa: la larva");

  // Walking as a player: from the foot of the building its pier leaves, «Ir» with «Viaje: el camino real» in the
  // gear (the game's own route, montana-hueca.md); she must never fall into the lake on the way.
  const foot = await p.evaluate(() => {
    const c = window.codeshipS3;
    const end = c.layout.graph.points.filter((q) => q.id.startsWith("entrenamiento:pupa:muelle")).at(-1);
    return c.layout.hollow.trees.map((t) => ({ id: `entrenamiento:${t.def.id}:pie`, d: Math.hypot(t.x - end.x, t.z - end.z) })).sort((a, b) => a.d - b.d)[0].id;
  });
  went = await goArea(j, foot, "Pie del árbol del muelle");
  await j.tap(".s3-tasks", "Tareas");
  await j.taskSettings({ travel: "viaje" });
  await j.tap(".task-board .tb-close, .task-board [aria-label='Cerrar tareas']", "Cerrar tareas").catch(() => {});
  await j.tap(".areas-btn", "Áreas");
  await j.tap('.areas-window [data-pick="entrenamiento:pupa"]', "La pupa en el mapa");
  went = (await j.tap('.areas-window [data-area="entrenamiento:pupa"]', "Ir: la pupa, andando")) && went;
  const pierEnd = await p.evaluate(() => window.codeshipS3.layout.graph.points.filter((q) => q.id.startsWith("entrenamiento:pupa:muelle")).at(-1));
  let wet = "";
  let shotPier = false;
  for (let i = 0; i < 400; i++) {
    const s = await p.evaluate(() => ({ mode: window.codeshipS3.mode, body: window.codeshipS3.body }));
    if (s.body.motion === "agua" && !wet) wet = JSON.stringify(s.body);
    if (s.mode !== "ruta") break;
    // Halfway along the pier: the whole cell standing in the lake among the buildings, the pupa inside it.
    if (!shotPier && Math.hypot(s.body.x - pierEnd.x, s.body.z - pierEnd.z) > 120 && s.body.area === "entrenamiento:pupa") {
      shotPier = true;
      await p.evaluate(() => (window.codeshipS3.biome.bee.k = 12 / 19));
      await p.waitForTimeout(800);
      j.check("desde el muelle se ve la celda entera, con la pupa dentro", await p.evaluate(() => window.codeshipS3.biome.pupa.root.visible && window.codeshipS3.biome.pupa.bee.count > 10));
      await capture(j, "pupa", "La pupa de la abeja desde el muelle");
    }
    await p.waitForTimeout(1500);
  }
  const atPupa = await p.evaluate(() => window.codeshipS3.body);
  j.check("con «Ir» andando desde el pie del edificio más cercano llega a la pupa por el muelle, sin caer al lago", went && atPupa.area === "entrenamiento:pupa" && !wet, `${foot}; ${JSON.stringify(atPupa)}${wet ? `; cayó al agua en ${wet}` : ""}`);
  tag = await p.evaluate(() => document.querySelector(".s3-pupa-etapa:not(.hidden)")?.textContent ?? "");
  // (The bee goes on with its clock while she walks: by now a pupa or the adult.)
  j.check("en la galería, la etiqueta dice la etapa de la abeja", /Abeja de la pupa · /.test(tag), tag);
  await j.tap(".s3-tasks", "Tareas");
  await j.taskSettings({ travel: "teletransporte" });
  await j.tap(".task-board .tb-close, .task-board [aria-label='Cerrar tareas']", "Cerrar tareas").catch(() => {});

  // EXPERIENCIA_TRAMO=pupa-tablones: only the pupa and the two census boards (a short run while they change).
  const only = process.env.EXPERIENCIA_TRAMO === "pupa-tablones";
  if (!only) {
  // ── The lake's larvae: off the gallery into the lake, down to the bottom where the nymphs and larvae live.
  const larva = await p.evaluate(() => {
    const c = window.codeshipS3;
    const b = c.body;
    return c.biome.carbonView.lastLarvae.filter((q) => q.y < 101 && (q.stage === "ninfa" || q.stage === "larva")).sort((a, q) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(q.x - b.x, q.z - b.z))[0];
  });
  // Off the gallery into the water and down to it (swimming is slow: short strokes, diving when near).
  // It crawls (its home's circle): follow it where it is now.
  const now = () => p.evaluate(([sp, i]) => window.codeshipS3.biome.carbonView.lastLarvae.find((q) => q.species === sp && q.i === i), [larva.species, larva.i]);
  for (let i = 0; i < 40; i++) {
    const q = await now();
    const s = await p.evaluate(([x, z]) => ({ d: Math.hypot(x - window.codeshipS3.body.x, z - window.codeshipS3.body.z), y: window.codeshipS3.camera.position.y }), [q.x, q.z]);
    if (s.d < 8 && s.y < 102) break;
    await lookAt(j, q.x, q.z);
    await tilt(j, s.d < 12 ? -0.9 : -0.4);
    await j.stick(".vstick.s3-move", 0, -40, 1200);
  }
  const q = await now();
  await lookAt(j, q.x, q.z);
  await tilt(j, await p.evaluate(([x, y, z]) => { const C = window.codeshipS3.camera.position; return Math.atan2(y - C.y, Math.hypot(x - C.x, z - C.z)); }, [q.x, q.y, q.z]));
  await p.waitForTimeout(1200);
  const under = await p.evaluate(() => {
    const c = window.codeshipS3;
    const cam = c.camera.position;
    const near = c.biome.carbonView.lastLarvae.filter((q) => Math.hypot(q.x - cam.x, q.z - cam.z) < 60);
    return { y: cam.y, motion: c.body.motion, n: near.length, kinds: [...new Set(near.map((q) => q.species))], stages: [...new Set(near.map((q) => q.stage))], tag: document.querySelector(".s3-pupa-etapa:not(.hidden)")?.textContent ?? "" };
  });
  j.check("bucea en el lago de la pirámide (la cámara bajo el agua)", under.motion === "agua" && under.y < 0, JSON.stringify(under));
  j.check("en el fondo viven larvas de los insectos: al menos 3 a la vista y de 2 especies, en distintas etapas", under.n >= 3 && under.kinds.length >= 2, JSON.stringify(under));
  j.check("buceando, la etiqueta dice la larva más cercana y su etapa", /·/.test(under.tag) && !/Abeja/.test(under.tag), under.tag);
  await capture(j, "lago-larvas", "Larvas del lago");

  }
  // ── The breeding room inside the mountain: its census board (the giant insects, the Carboniferous, the lake's larvae).
  const card = () =>
    p.evaluate(() => {
      const el = document.querySelector(".s3-censo");
      const rows = [...el.querySelectorAll("li[data-especie]")].map((li) => ({ id: li.dataset.especie, text: li.innerText }));
      return { open: !!el.checkVisibility() && document.body.classList.contains("panel-on"), rows, events: [...el.querySelectorAll(".cz-events li")].map((li) => li.innerText), text: el.innerText };
    });
  const fits = () =>
    p.evaluate(() => {
      const el = document.querySelector(".s3-censo");
      const over = [...el.querySelectorAll("li")].filter((li) => li.scrollWidth > li.clientWidth + 1 || li.getBoundingClientRect().right > window.innerWidth + 1).map((li) => li.dataset.especie ?? li.innerText.slice(0, 20));
      return { over, card: Math.round(el.getBoundingClientRect().width), vw: window.innerWidth };
    });
  let c;
  const row = (id) => c.rows.find((r) => r.id === id)?.text ?? "";
  went = await goArea(j, "entrenamiento:crianza", "Criadero de insectos gigantes");
  const hb = await p.evaluate(() => window.codeshipS3.biome.hallBoard);
  if (hb) {
    // Into the room's middle first (the insectaries and the hive stand along its walls), then before the board.
    await walkTo(j, hb.x, hb.z + 4, 0.6);
    await walkTo(j, hb.x, hb.z + 1.6, 0.5);
  }
  const nearHall = await p.waitForFunction(() => window.codeshipS3.biome.at === "nave", null, { timeout: 8000 }).then(() => true).catch(() => false);
  j.check("en el criadero de la nave está el tablón del censo de dentro", went && nearHall, await p.evaluate(() => JSON.stringify({ body: window.codeshipS3.body, board: window.codeshipS3.biome.hallBoard })));
  await j.showPanel(".s3-censo");
  c = await card();
  j.check("el tablón del criadero cuenta los insectos gigantes, el Carbonífero y las larvas del lago", c.open && /Censo de la nave/.test(c.text) && !!row("abeja") && !!row("meganeuropsis") && c.rows.filter((r) => r.id.startsWith("larva-")).length >= 4 && !row("ibice"), `${c.rows.length} filas: ${c.rows.map((r) => r.id).join(", ")}`);
  j.check("las colonias de abeja asiática salen con sus obreras y sus colmenas", /abeja/i.test(row("abeja")) && /colmena/i.test(row("abeja")), row("abeja"));
  j.check("la cadena del Carbonífero: Meganeuropsis come Mazothairos; a la cucaracha primitiva se la comen las libélulas gigantes", /Come:.*Mazothairos/i.test(row("meganeuropsis")) && /Lo comen:.*Meganeur/i.test(row("cucaracha")), `${row("meganeuropsis")} | ${row("cucaracha")}`);
  j.check("las larvas del lago con sus etapas de ahora (huevos, ninfas, larvas, pupas)", /ninfas \d+/.test(row("larva-libelula")) || /huevos \d+/.test(row("larva-libelula")), row("larva-libelula"));
  let wide = await fits();
  j.check("cada fila del censo de la nave cabe en el móvil de 390 px", wide.over.length === 0 && wide.card <= wide.vw, JSON.stringify(wide));
  await capture(j, "censo-nave", "Censo de la nave");
  await j.tapInteraction("Cerrar el censo (botón naranja)");

  // ── The research hut outside: its census through the orange button (the mountain's real fauna and flora).
  went = await goArea(j, "bioma:estacion", "Estación de investigación");
  const near = await p.waitForFunction(() => window.codeshipS3.biome.at === "fuera", null, { timeout: 8000 }).then(() => true).catch(() => false);
  j.check("«Ir» la deja ante el tablón del censo, dentro de la cabaña", went && near, await p.evaluate(() => JSON.stringify(window.codeshipS3.body)));
  const shownAlone = await p.evaluate(() => document.body.classList.contains("panel-on") && !!document.querySelector(".s3-censo:not(.hidden)")?.checkVisibility());
  j.check("el censo no se abre solo: espera al botón naranja (reglas §5.8)", !shownAlone);
  await j.showPanel(".s3-censo");
  c = await card();
  j.check("el botón naranja abre el censo de la montaña", c.open && /Censo de la montaña/.test(c.text), String(c.rows.length));
  j.check("el tablón de la cabaña cuenta la fauna real de fuera (íbice, markhor, leopardo de las nieves…) y sus plantas, sin los insectos gigantes", c.rows.length >= 30 && !!row("ibice") && !!row("leopardo") && !!row("pino") && !row("abeja") && !row("meganeuropsis"), `${c.rows.length} filas: ${c.rows.map((r) => r.id).join(", ")}`);
  wide = await fits();
  j.check("cada fila del censo cabe en el móvil de 390 px", wide.over.length === 0 && wide.card <= wide.vw, JSON.stringify(wide));
  await capture(j, "censo", "Censo de la montaña");

  if (only) {
    maxCalls = Math.max(maxCalls, await p.evaluate(() => window.__codeshipFrame?.calls ?? 0));
    j.check("las llamadas de dibujo quedan en el presupuesto (≤ 600)", maxCalls > 0 && maxCalls <= 600, String(maxCalls));
    return;
  }
  // ── The field table: the field methods; she does the first one open now.
  await j.tapInteraction("Cerrar el censo (botón naranja)");
  const desk = await p.evaluate(() => window.codeshipS3.biome.view.deskAt);
  await walkTo(j, desk.x, desk.z - 0.9, 0.5);
  const atDesk = await p.waitForFunction(() => window.codeshipS3.biome.nearDesk, null, { timeout: 8000 }).then(() => true).catch(() => false);
  j.check("en la cabaña está la mesa de campo, a más de 2 m del tablón", atDesk, await p.evaluate(() => JSON.stringify(window.codeshipS3.body)));
  const label = await j.interactionLabel();
  j.check("en la mesa, el botón naranja dice «Mesa de campo» y nada se abre solo", /Mesa de campo/.test(label) && !(await p.evaluate(() => document.body.classList.contains("in-reto-picker"))), label);
  await j.tapInteraction("Mesa de campo (Y del mando)");
  const jobs = await p.evaluate(() => [...document.querySelectorAll(".reto-picker .rp-opt")].map((b, i) => ({ i, open: !b.disabled, text: b.innerText })));
  j.check("los métodos de campo: colmenas, transecto de mariposas y trampas de caída", jobs.length === 3 && /colmenas/i.test(jobs[0].text) && /Transecto/i.test(jobs[1].text) && /Trampas/i.test(jobs[2].text), jobs.map((x) => `${x.text.split("\n")[0]}:${x.open}`).join(", "));
  await capture(j, "mesa", "Mesa de campo");
  const job = jobs.find((x) => x.open);
  if (job) {
    await j.tap(`.reto-picker .rp-opt[data-i="${job.i}"]`, job.text.split("\n")[0]);
    await j.waitDuel();
    const oracle = () => window.codeshipS3.exercise ?? window.codeshipS3.trace?.state;
    let steps = 0;
    for (let i = 0; i < 12; i++) {
      const ex = await p.evaluate(oracle);
      if (!ex) break;
      await j.answer(oracle, true);
      await p.waitForTimeout(900);
      steps++;
    }
    const drawn = !(await j.page.locator(".duel:not(.hidden)").count());
    const result = drawn ? "Conseguido" : ((await j.texts(".duel .result"))[0] ?? "");
    j.check(`${job.text.split("\n")[0]}: se completa`, /Conseguido/.test(result), `${steps} pasos · ${result}`);
    await j.endSheet();
    await p.waitForTimeout(800);
  } else {
    // The game's clock may be past November (December–January): every method then says why it waits, by its season.
    j.check("fuera de temporada, cada método de campo dice por qué espera", jobs.every((x) => x.text.split("\n")[1]?.length > 10), JSON.stringify(jobs));
    await j.tap(".reto-picker .rp-close, .reto-picker [aria-label='Cerrar']", "Cerrar la mesa de campo").catch(() => {});
  }

  // ── The Carboniferous forest at the pyramid's north-east foot: its five trees, its giants walking.
  went = await goArea(j, "entrenamiento:bosque-carbonifero", "Bosque del Carbonífero");
  j.check("«Ir» la lleva al bosque del Carbonífero, en la orilla de la nave dentro de la montaña", went, await p.evaluate(() => window.codeshipS3.body.area));
  const forest = await p.evaluate(() => {
    const c = window.codeshipS3;
    const b = c.body;
    const t = c.biome.carbonView.trees.filter((q) => Math.hypot(q.x - b.x, q.z - b.z) < 120);
    return { kinds: [...new Set(t.map((q) => q.species))], n: t.length };
  });
  j.check("el bosque tiene sus cinco árboles del Carbonífero (Lepidodendron, Sigillaria, Calamites, Psaronius, Cordaites)", forest.kinds.length === 5 && forest.n >= 40, JSON.stringify(forest));
  const giant = await p.evaluate(() => {
    const c = window.codeshipS3;
    return c.biome.carbon.poses().filter((q) => !q.hidden && q.species === "arthropleura")[0];
  });
  if (giant) {
    await walkTo(j, giant.x, giant.z - 7, 3);
    await lookAt(j, giant.x, giant.z);
    await tilt(j, 0.05);
  }
  let a = await around(p, 150, "carbon");
  maxCalls = Math.max(maxCalls, a.calls);
  j.check("en noviembre camina por el bosque Arthropleura, el miriápodo de 2,6 m", (a.near.arthropleura ?? 0) > 0, JSON.stringify(a.near));
  await capture(j, "carbonifero", "Bosque del Carbonífero");

  // ── To mid June (≈ 16 game days): births or deaths in the census; the griffenflies fly over the forest.
  // At midday: the griffenflies fly by day and rest on the ground at night (biome-life.ts), and a slow run reaches the
  // forest at night (24 real minutes a board day from 9:00: CI took ~18 min to get here; at 3:00 none flew).
  await p.evaluate(() => {
    const c = window.codeshipS3;
    if (c.hour < 10 || c.hour > 16) c.setHour(12);
    c.biome.skip(15.8);
  });
  await p.waitForTimeout(2500);
  let fly = {};
  for (let k = 0; k < 20 && !((fly.meganeura ?? 0) + (fly.meganeuropsis ?? 0) > 0); k++) {
    fly = (await around(p, 250, "carbon")).flying;
    if (!((fly.meganeura ?? 0) + (fly.meganeuropsis ?? 0) > 0)) await p.waitForTimeout(500);
  }
  j.check("en junio las libélulas gigantes (Meganeura, Meganeuropsis) patrullan sobre el bosque", (fly.meganeura ?? 0) + (fly.meganeuropsis ?? 0) > 0, JSON.stringify({ fly, hour: await p.evaluate(() => window.codeshipS3.hour) }));
  const m = await p.evaluate(() => window.codeshipS3.biome.carbon.poses().find((q) => !q.hidden && q.flying && q.species.startsWith("meganeur")));
  if (m) {
    const b = await p.evaluate(() => window.codeshipS3.body);
    await lookAt(j, m.x, m.z);
    await tilt(j, Math.max(-0.4, Math.min(0.8, Math.atan2(m.y - b.y - 1.6, Math.hypot(m.x - b.x, m.z - b.z)))));
  }
  a = await around(p, 150, "carbon");
  maxCalls = Math.max(maxCalls, a.calls);
  await capture(j, "carbonifero-junio", "Bosque del Carbonífero en junio");
  await goArea(j, "bioma:estacion", "Estación de investigación");
  await j.showPanel(".s3-censo");
  c = await card();
  j.check("al pasar el tiempo el censo cuenta nacimientos o muertes", c.events.some((e) => /nace|muere|caza|pone|crías nuevas/i.test(e)), c.events.slice(0, 5).join(" / "));
  await j.tapInteraction("Cerrar el censo (botón naranja)");
  j.check("las llamadas de dibujo quedan en el presupuesto (≤ 600)", maxCalls > 0 && maxCalls <= 600, String(maxCalls));
}
