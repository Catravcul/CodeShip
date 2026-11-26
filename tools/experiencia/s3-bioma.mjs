// PX-51 Sanctuary 3, the biome of the air and the heights (docs/design/bioma-s3.md, pupa-abeja.md, larvas-lago.md,
// carbonifero.md), on an iPhone 13 with visible taps only. The «Isla de las alturas» is a mountain of the Karakoram from
// the river to the snows with its giant insects of Gilgit-Baltistán (×400); the hollow pyramid in it holds at its
// middle the bee's pupa (Berón 2026-11-26: it takes the cloud globe's place), a translucent wax cell where an Asian
// honeybee lives its metamorphosis, reached walking along the pier from a tree's foot; its lake holds the larvae of
// the island's insects (dragonfly nymphs, mayflies, caddisflies, midges), seen diving; at the pyramid's north-east
// foot, the Carboniferous forest (Lepidodendron, Sigillaria, Calamites, Psaronius, Cordaites) with its giants at real
// size (Arthropleura, roachoids, Mazothairos, Meganeura, Meganeuropsis). At the research hut the orange button opens
// the census (insects, the Carboniferous and their food chain) and the field table offers the field methods (hive
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

/** Swim (or walk) at a point with «Moverse», the camera tilted `pitch` (down dives), for at most `ms`. */
async function swimTo(j, x, z, pitch, stop, tries = 8) {
  const dist = () => j.page.evaluate(([tx, tz]) => Math.hypot(tx - window.codeshipS3.body.x, tz - window.codeshipS3.body.z), [x, z]);
  for (let i = 0; i < tries && (await dist()) > stop; i++) {
    await lookAt(j, x, z);
    await tilt(j, pitch);
    await j.stick(".vstick.s3-move", 0, -40, 900);
  }
  return dist();
}

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

  const zones = ["estacion", "estepa", "rio", "bosque", "enebral", "garganta", "pradera", "pedrera", "farallon", "cresta", "nieves", "bosque-carbonifero"].map((z) => `bioma:${z}`);
  const isl = await p.evaluate(() => {
    const c = window.codeshipS3;
    return { name: c.layout.islands.find((i) => i.id === "bioma")?.name, areas: c.layout.areas.filter((a) => a.island === "bioma").map((a) => ({ id: a.id, belt: a.belt?.id })), pupa: c.layout.areas.find((a) => a.id === "entrenamiento:pupa"), globe: c.layout.areas.some((a) => a.id.includes("globo")) };
  });
  j.check("la Isla de las alturas tiene sus zonas del río a las nieves y el bosque del Carbonífero", isl.name === "Isla de las alturas" && zones.every((z) => isl.areas.some((a) => a.id === z)), isl.areas.map((a) => a.id).join(", "));
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

  // Walking: from the root deck of the tree its pier leaves (the carpets' foot station), by the graph's walked links.
  const foot = await p.evaluate(() => {
    const c = window.codeshipS3;
    const end = c.layout.graph.points.filter((q) => q.id.startsWith("entrenamiento:pupa:muelle")).at(-1);
    return c.layout.hollow.trees.map((t) => ({ id: `entrenamiento:${t.def.id}:pie`, d: Math.hypot(t.x - end.x, t.z - end.z) })).sort((a, b) => a.d - b.d)[0].id;
  });
  const way = await p.evaluate((foot) => {
    const g = window.codeshipS3.layout.graph;
    const from = window.codeshipS3.layout.areas.find((a) => a.id === foot).point;
    const by = new Map(g.points.map((q) => [q.id, q]));
    const prev = new Map([[from, ""]]);
    const queue = [from];
    while (queue.length) {
      const id = queue.shift();
      if (id === "entrenamiento:pupa:mirador") break;
      for (const [a, b] of g.links) {
        const n = a === id ? b : b === id ? a : undefined;
        if (!n || prev.has(n) || (by.get(id)?.carpet && by.get(n)?.carpet) || by.get(n)?.lift) continue;
        prev.set(n, id);
        queue.push(n);
      }
    }
    const out = [];
    for (let id = "entrenamiento:pupa:mirador"; id; id = prev.get(id)) out.unshift(by.get(id));
    return out.map((q) => ({ id: q.id, x: q.x, z: q.z }));
  }, foot);
  went = await goArea(j, foot, "Pie del árbol del muelle");
  const pierAt = way.findIndex((q) => q.id.startsWith("entrenamiento:pupa:"));
  // Along each stretch in short legs (the stick's aim drifts over a long one, and the pier is 6 m wide).
  const along = async (pts) => {
    for (const q of pts) {
      const b = await p.evaluate(() => ({ x: window.codeshipS3.body.x, z: window.codeshipS3.body.z }));
      const n = Math.max(1, Math.ceil(Math.hypot(q.x - b.x, q.z - b.z) / 8));
      for (let i = 1; i <= n; i++) await walkTo(j, b.x + ((q.x - b.x) * i) / n, b.z + ((q.z - b.z) * i) / n, 0.8);
    }
  };
  await along(way.slice(1, pierAt + 1));
  // From the pier's start: the whole cell standing in the lake among the giant trees, the pupa inside it.
  await p.evaluate(() => (window.codeshipS3.biome.bee.k = 12 / 19));
  await lookAt(j, P.x, P.z);
  await tilt(j, 0.35);
  await p.waitForTimeout(1200);
  j.check("desde el muelle se ve la celda entera, con la pupa dentro", await p.evaluate(() => window.codeshipS3.biome.pupa.root.visible && window.codeshipS3.biome.pupa.bee.count > 10));
  await capture(j, "pupa", "La pupa de la abeja desde el muelle");
  await along(way.slice(pierAt + 1));
  const atPupa = await p.evaluate(() => window.codeshipS3.body);
  j.check("andando por el muelle desde el pie del árbol se llega a la pupa", went && atPupa.area === "entrenamiento:pupa", `${way.map((q) => q.id).join(" → ")}; ${JSON.stringify(atPupa)}`);
  tag = await p.evaluate(() => document.querySelector(".s3-pupa-etapa:not(.hidden)")?.textContent ?? "");
  j.check("en la galería, la etiqueta dice la etapa: la pupa con sus ojos de color", /Abeja de la pupa · .*(ojos|[Pp]upa)/.test(tag), tag);

  // ── The lake's larvae: off the gallery into the lake, down to the bottom where the nymphs and larvae live.
  const larva = await p.evaluate(() => {
    const c = window.codeshipS3;
    const b = c.body;
    return c.biome.carbonView.lastLarvae.filter((q) => q.stage !== "emergencia").sort((a, q) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(q.x - b.x, q.z - b.z))[0];
  });
  await swimTo(j, larva.x, larva.z, -0.9, 9);
  await lookAt(j, larva.x, larva.z);
  await tilt(j, -0.2);
  await p.waitForTimeout(1200);
  const under = await p.evaluate(() => {
    const c = window.codeshipS3;
    const cam = c.camera.position;
    const near = c.biome.carbonView.lastLarvae.filter((q) => Math.hypot(q.x - cam.x, q.z - cam.z) < 60);
    return { y: cam.y, motion: c.body.motion, n: near.length, kinds: [...new Set(near.map((q) => q.species))], stages: [...new Set(near.map((q) => q.stage))], tag: document.querySelector(".s3-pupa-etapa:not(.hidden)")?.textContent ?? "" };
  });
  j.check("bucea en el lago de la pirámide (la cámara bajo el agua)", under.motion === "agua" && under.y < 104, JSON.stringify(under));
  j.check("en el fondo viven larvas de los insectos: al menos 3 a la vista y de 2 especies, en distintas etapas", under.n >= 3 && under.kinds.length >= 2, JSON.stringify(under));
  j.check("buceando, la etiqueta dice la larva más cercana y su etapa", /·/.test(under.tag) && !/Abeja/.test(under.tag), under.tag);
  await capture(j, "lago-larvas", "Larvas del lago");

  // ── The research hut: the census through the orange button (insects, the Carboniferous, their food chain).
  went = await goArea(j, "bioma:estacion", "Estación de investigación");
  const near = await p.waitForFunction(() => window.codeshipS3.biome.near, null, { timeout: 8000 }).then(() => true).catch(() => false);
  j.check("«Ir» la deja ante el tablón del censo, dentro de la cabaña", went && near, await p.evaluate(() => JSON.stringify(window.codeshipS3.body)));
  const shownAlone = await p.evaluate(() => document.body.classList.contains("panel-on") && !!document.querySelector(".s3-censo:not(.hidden)")?.checkVisibility());
  j.check("el censo no se abre solo: espera al botón naranja (reglas §5.8)", !shownAlone);
  await j.showPanel(".s3-censo");
  const card = () =>
    p.evaluate(() => {
      const el = document.querySelector(".s3-censo");
      const rows = [...el.querySelectorAll("li[data-especie]")].map((li) => ({ id: li.dataset.especie, text: li.innerText }));
      return { open: !!el.checkVisibility() && document.body.classList.contains("panel-on"), rows, events: [...el.querySelectorAll(".cz-events li")].map((li) => li.innerText), text: el.innerText };
    });
  let c = await card();
  const row = (id) => c.rows.find((r) => r.id === id)?.text ?? "";
  j.check("el botón naranja abre el censo de la montaña", c.open, String(c.rows.length));
  j.check("cada especie tiene su fila: plantas, bancos, 15 insectos de Gilgit-Baltistán y 5 gigantes del Carbonífero", c.rows.length >= 36, String(c.rows.length));
  j.check("las colonias de abeja asiática salen con sus obreras y sus colmenas", /abeja/i.test(row("abeja")) && /colmena/i.test(row("abeja")), row("abeja"));
  j.check("la cadena del Carbonífero: Meganeuropsis come Mazothairos; a la cucaracha primitiva se la comen las libélulas gigantes", /Come:.*Mazothairos/i.test(row("meganeuropsis")) && /Lo comen:.*Meganeur/i.test(row("cucaracha")), `${row("meganeuropsis")} | ${row("cucaracha")}`);
  j.check("el censo dice quién come a quién en el bosque del Carbonífero", /hojarasca/i.test(c.text) && /Carbonífero/.test(c.text));
  const wide = await p.evaluate(() => {
    const el = document.querySelector(".s3-censo");
    const over = [...el.querySelectorAll("li")].filter((li) => li.scrollWidth > li.clientWidth + 1 || li.getBoundingClientRect().right > window.innerWidth + 1).map((li) => li.dataset.especie ?? li.innerText.slice(0, 20));
    return { over, card: Math.round(el.getBoundingClientRect().width), vw: window.innerWidth };
  });
  j.check("cada fila del censo cabe en el móvil de 390 px", wide.over.length === 0 && wide.card <= wide.vw, JSON.stringify(wide));
  await capture(j, "censo", "Censo de la montaña");

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
  went = await goArea(j, "bioma:bosque-carbonifero", "Bosque del Carbonífero");
  j.check("«Ir» la lleva al bosque del Carbonífero, al pie de la pirámide", went, await p.evaluate(() => window.codeshipS3.body.area));
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
  await p.evaluate(() => window.codeshipS3.biome.skip(15.8));
  await p.waitForTimeout(2500);
  let fly = {};
  for (let k = 0; k < 20 && !((fly.meganeura ?? 0) + (fly.meganeuropsis ?? 0) > 0); k++) {
    fly = (await around(p, 250, "carbon")).flying;
    if (!((fly.meganeura ?? 0) + (fly.meganeuropsis ?? 0) > 0)) await p.waitForTimeout(500);
  }
  j.check("en junio las libélulas gigantes (Meganeura, Meganeuropsis) patrullan sobre el bosque", (fly.meganeura ?? 0) + (fly.meganeuropsis ?? 0) > 0, JSON.stringify(fly));
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
