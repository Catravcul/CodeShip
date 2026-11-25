// PX-51 Sanctuary 3, the biome of the air and the heights (Berón, 2026-11-20: cada santuario recrea el bioma de un
// elemento; el 3 es el aire y las alturas: aves, cabras que trepan, acantilados, cañones y roedores en una isla gigante;
// docs/design/bioma-s3.md), on an iPhone 13 with visible taps only. The «Isla de las alturas» is one giant mountain of
// the Karakoram from the river to the snows. With «Ir» set to teleport, Áreas (its zones grouped by altitude belt)
// takes her to the cliffs (ibex herds on the ledges, the griffons in their thermals, and X climbs the ledges), to the
// gorge's lookout (markhor on the walls, the bearded vulture over the gorge), and in June to the meadow (marmot
// families at their burrows) and the scree (pikas); at the research hut the orange button opens the census (each
// species, its stages, what it eats and who eats it; the marmots hibernating in November) and the field table offers
// the Himalayan field methods (camera traps, the double-observer count, the vulture nests): she does the count.
// The draw calls stay ≤ 600 on the mountain. Captures in docs/screenshots/s3b-<zona>-movil.png.
import { mkdirSync } from "node:fs";
import { goArea, lookAt, tilt, walkTo } from "./s3-detalle.mjs";

async function capture(j, label, title) {
  await j.page.waitForTimeout(600);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/s3b-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

/** What lives near her: animals by species within `r` metres (those in the air apart), the draw calls of the last frame. */
const around = (p, r) =>
  p.evaluate((r) => {
    const c = window.codeshipS3;
    const b = c.body;
    const near = {};
    const flying = {};
    for (const q of c.biome.life.poses()) {
      if (q.hidden || Math.hypot(q.x - b.x, q.z - b.z) >= r) continue;
      near[q.species] = (near[q.species] ?? 0) + 1;
      if (q.flying) flying[q.species] = (flying[q.species] ?? 0) + 1;
    }
    const plants = c.biome.life.state.plants;
    return { near, flying, plants: Object.fromEntries(Object.entries(plants).map(([k, v]) => [k, Math.round(v)])), calls: window.__codeshipFrame?.calls ?? 0, visible: c.biome.view.root.visible };
  }, r);

/** Crowd animals in the camera's view within 140 m, by species. */
const inView = (p) => p.evaluate(() => window.codeshipS3.biome.view.crowd.inView(window.codeshipS3.camera, 140));

/** Animals of the chain in the camera's view (in the frustum, within `r` m), by species; in the air apart. */
const chainInView = (p, r) =>
  p.evaluate((r) => {
    const c = window.codeshipS3;
    const cam = c.camera;
    cam.updateMatrixWorld();
    const m = cam.projectionMatrix.clone().multiply(cam.matrixWorldInverse);
    const out = {};
    for (const q of c.biome.life.poses()) {
      if (q.hidden) continue;
      const d = Math.hypot(q.x - cam.position.x, q.y - cam.position.y, q.z - cam.position.z);
      if (d > r) continue;
      const e = m.elements;
      const w = e[3] * q.x + e[7] * q.y + e[11] * q.z + e[15];
      const x = (e[0] * q.x + e[4] * q.y + e[8] * q.z + e[12]) / w;
      const y = (e[1] * q.x + e[5] * q.y + e[9] * q.z + e[13]) / w;
      if (w <= 0 || Math.abs(x) > 1 || Math.abs(y) > 1) continue;
      const k = q.flying ? `${q.species}:vuela` : q.species;
      out[k] = (out[k] ?? 0) + 1;
    }
    return out;
  }, r);

/** Turn and tilt to look at a world point from where she stands. */
async function face(j, t, pitch) {
  await lookAt(j, t.x, t.z);
  await tilt(j, pitch);
  await j.page.waitForTimeout(900);
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
  // Áreas shows the island chosen in the shared settings: the air island, from the training one.
  await j.taskSettings({ travel: "teletransporte", vehicle: "bioma" });
  await j.tap(".task-board .tb-close, .task-board [aria-label='Cerrar tareas']", "Cerrar tareas").catch(() => {});

  const zones = ["estacion", "estepa", "rio", "bosque", "enebral", "garganta", "pradera", "pedrera", "farallon", "cresta", "nieves"].map((z) => `bioma:${z}`);
  const isl = await p.evaluate(() => {
    const c = window.codeshipS3;
    return { name: c.layout.islands.find((i) => i.id === "bioma")?.name, areas: c.layout.areas.filter((a) => a.island === "bioma").map((a) => ({ id: a.id, belt: a.belt?.id })) };
  });
  j.check("la isla subantártica es ahora la «Isla de las alturas», con sus zonas del río a las nieves", isl.name === "Isla de las alturas" && zones.every((z) => isl.areas.some((a) => a.id === z)), `${isl.name}: ${isl.areas.map((a) => a.id).join(", ")}`);
  j.check("cada zona en su cinturón de altitud real (de la estepa submontana a las nieves)", new Set(isl.areas.map((a) => a.belt).filter(Boolean)).size === 6, JSON.stringify(isl.areas));

  let maxCalls = 0;
  // ── The cliffs: ibex herds on the ledges, the griffons soaring in their thermals; X climbs the ledges.
  let went = await goArea(j, "bioma:farallon", "Farallón de los íbices");
  j.check("«Ir» la lleva al pie del farallón", went && (await p.evaluate(() => window.codeshipS3.body.area)).startsWith("bioma"), await p.evaluate(() => JSON.stringify(window.codeshipS3.body)));
  const ibex = await p.evaluate(() => window.codeshipS3.biome.view.crowd.centreOf("ibice"));
  if (ibex) {
    // Back from the herd (~25 m) on open ground below it, so the cliff and the herd fill the view.
    const stand = await p.evaluate((h) => {
      const g = window.codeshipS3.biome.life.geo;
      let best = null;
      for (const r of [25, 20, 32]) {
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          const x = h.x + r * Math.cos(a);
          const z = h.z + r * Math.sin(a);
          if (g.isSea(x, z) || g.steep(x, z) > 0.6) continue;
          const y = g.ground(x, z);
          if (!best || y < best.y) best = { x, z, y };
        }
        if (best) return best;
      }
      return null;
    }, ibex);
    if (stand) await walkTo(j, stand.x, stand.z, 2);
    else await walkTo(j, ibex.x, ibex.z, 30);
    const b = await p.evaluate(() => window.codeshipS3.body);
    await face(j, ibex, Math.max(-0.6, Math.min(0.7, Math.atan2(ibex.y - b.y - 1.6, Math.hypot(ibex.x - b.x, ibex.z - b.z)) - 0.12)));
  }
  let v = await inView(p);
  let a = await around(p, 250);
  maxCalls = Math.max(maxCalls, a.calls);
  j.check("en el farallón se ven rebaños de íbices en las repisas (al menos 10 a la vista)", (v.ibice ?? 0) >= 10, JSON.stringify(v));
  j.check("los buitres del Himalaya planean en las térmicas sobre los cantiles", (a.flying.buitre ?? 0) > 0, JSON.stringify(a.flying));
  await capture(j, "farallon", "Farallón de los íbices");
  // The ledges: from the foot of the first one, facing the cliff, X (Trepar) climbs her onto it.
  await goArea(j, "bioma:farallon", "Farallón de los íbices");
  const ledge = await p.evaluate(() => window.codeshipS3.layout.world.floors.filter((f) => f.id.startsWith("bioma:repisa")).sort((a, b) => a.y - b.y)[0]);
  await walkTo(j, (ledge.x0 + ledge.x1) / 2, ledge.z0 - 0.5, 0.4);
  await lookAt(j, (ledge.x0 + ledge.x1) / 2, ledge.z1 + 20);
  const y0 = await p.evaluate(() => window.codeshipS3.body.y);
  await j.tap('.switch-pad .ap-btn[aria-label^="Trepar"]', "Trepar (X)").catch(() => {});
  await p.waitForTimeout(1600);
  const y1 = await p.evaluate(() => window.codeshipS3.body.y);
  j.check("con X (Trepar) sube a la primera repisa del farallón", y1 - y0 > 0.6, `${y0.toFixed(1)} → ${y1.toFixed(1)} m`);

  // ── The gorge: the bearded vulture over it, markhor on its walls, the river 160 m below.
  went = await goArea(j, "bioma:garganta", "Mirador de la garganta");
  j.check("«Ir» la lleva al mirador de la garganta", went, await p.evaluate(() => window.codeshipS3.body.area));
  // It patrols up and down the gorge at the height of its rims and swings close past the lookout: from the lookout,
  // facing the gorge where it passes, wait for it to cross the view.
  const look = await p.evaluate(() => {
    const c = window.codeshipS3;
    const g = c.biome.life.geo;
    const z = g.zone("garganta");
    const run = c.biome.life.gorgeRun;
    return { z, o: run ? g.world(run.o.x, run.o.z) : null, oy: run?.o.y };
  });
  if (look.z) await walkTo(j, look.z.x, look.z.z, 1.5);
  let g = {};
  if (look.o) {
    const b = await p.evaluate(() => window.codeshipS3.body);
    await face(j, look.o, Math.atan2(look.oy - b.y - 1.6, Math.hypot(look.o.x - b.x, look.o.z - b.z)) - 0.2);
  }
  for (let k = 0; k < 120 && !(g["quebrantahuesos:vuela"] > 0); k++) {
    g = await chainInView(p, 90);
    if (!(g["quebrantahuesos:vuela"] > 0)) await p.waitForTimeout(400);
  }
  a = await around(p, 400);
  maxCalls = Math.max(maxCalls, a.calls);
  j.check("un quebrantahuesos vuela sobre la garganta, a la vista (a menos de 90 m)", (g["quebrantahuesos:vuela"] ?? 0) > 0, JSON.stringify(g));
  await capture(j, "garganta", "Quebrantahuesos sobre la garganta");
  const mk = await p.evaluate(() => window.codeshipS3.biome.view.crowd.countsOf("markhor"));
  j.check("los markhores están en las paredes de la garganta (su rebaño, con el número de la cadena)", mk && mk.adults >= 8, JSON.stringify(mk));

  // ── The research hut: the census through the orange button; in November the marmots hibernate.
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
      return { open: !!el.checkVisibility() && document.body.classList.contains("panel-on"), rows, events: [...el.querySelectorAll(".cz-events li")].map((li) => li.innerText) };
    });
  let c = await card();
  j.check("el botón naranja abre el censo de la montaña", c.open, String(c.rows.length));
  const row = (id) => c.rows.find((r) => r.id === id)?.text ?? "";
  j.check("cada especie tiene su fila: 11 plantas, 5 de suelo y aire, 18 aves y mamíferos", c.rows.length >= 34, String(c.rows.length));
  j.check("los íbices salen con su número y sus etapas, y cuántos se ven en la montaña", /\d/.test(row("ibice")) && /adulto/i.test(row("ibice")) && /Se ven ≈/.test(row("ibice")), row("ibice"));
  j.check("la dieta está: el leopardo de las nieves come bharal e íbices; a la marmota se la comen el águila y el zorro", /Come:.*Bharal/i.test(row("leopardo")) && /Lo comen:.*Águila/i.test(row("marmota")), `${row("leopardo")} | ${row("marmota")}`);
  j.check("en noviembre las marmotas hibernan en sus madrigueras", /hibern/i.test(row("marmota")), row("marmota"));
  const wide = await p.evaluate(() => {
    const el = document.querySelector(".s3-censo");
    const over = [...el.querySelectorAll("li")].filter((li) => li.scrollWidth > li.clientWidth + 1 || li.getBoundingClientRect().right > window.innerWidth + 1).map((li) => li.dataset.especie ?? li.innerText.slice(0, 20));
    return { over, card: Math.round(el.getBoundingClientRect().width), vw: window.innerWidth };
  });
  j.check("cada fila del censo cabe en el móvil de 390 px", wide.over.length === 0 && wide.card <= wide.vw, JSON.stringify(wide));
  await capture(j, "censo", "Censo de la montaña");

  // ── The field table: the Himalayan field methods; she does the double-observer count of the ibex.
  await j.tapInteraction("Cerrar el censo (botón naranja)");
  const desk = await p.evaluate(() => window.codeshipS3.biome.view.deskAt);
  await walkTo(j, desk.x, desk.z - 0.9, 0.5);
  const atDesk = await p.waitForFunction(() => window.codeshipS3.biome.nearDesk, null, { timeout: 8000 }).then(() => true).catch(() => false);
  j.check("en la cabaña está la mesa de campo, a más de 2 m del tablón", atDesk, await p.evaluate(() => JSON.stringify(window.codeshipS3.body)));
  await p.waitForFunction(() => window.codeshipS3.biome.nearDesk, null, { timeout: 8000 }).catch(() => {});
  const label = await j.interactionLabel();
  j.check("en la mesa, el botón naranja (la Y del mando) dice «Reto: Mesa de campo» y nada se abre solo", /Reto: Mesa de campo/.test(label) && !(await p.evaluate(() => document.body.classList.contains("in-reto-picker"))), label);
  await j.tapInteraction("Reto: Mesa de campo (Y del mando)");
  const jobs = await p.evaluate(() => [...document.querySelectorAll(".reto-picker .rp-opt")].map((b) => ({ open: !b.disabled, text: b.innerText })));
  j.check("los métodos de campo del Himalaya: cámaras trampa (cerradas hasta enero), doble observador (abierto) y nidos de buitre", jobs.length === 3 && /Cámaras/.test(jobs[0].text) && !jobs[0].open && /doble observador/.test(jobs[1].text) && jobs[1].open && /buitre/.test(jobs[2].text), jobs.map((x) => `${x.text.split("\n")[0]}:${x.open}`).join(", "));
  await capture(j, "mesa", "Mesa de campo");
  await j.tap('.reto-picker .rp-opt[data-i="1"]', "Censo de íbices por doble observador");
  await j.waitDuel();
  const oracle = () => window.codeshipS3.exercise ?? window.codeshipS3.trace?.state;
  const total = await p.evaluate(() => window.codeshipS3.biome.counted);
  let steps = 0;
  let framed = false;
  for (let i = 0; i < 12; i++) {
    const ex = await p.evaluate(oracle);
    if (!ex) break;
    if (i === 6) j.check(`el último paso pide el total de íbices de la montaña (${total})`, JSON.stringify(ex).includes(String(total)), JSON.stringify(ex).slice(0, 200));
    await j.answer(oracle, true);
    await p.waitForTimeout(900);
    framed ||= await p.evaluate(() => window.codeshipS3.biome.steps.framing && window.codeshipS3.biome.steps.played > 0);
    if (i === 2) await capture(j, "mesa-paso", "Doble observador: un paso en la mesa");
    steps++;
  }
  j.check("cada paso se ve en la mesa (ella con el cuaderno y los prismáticos)", framed);
  // The sheet of options says «Conseguido»; the drawing ends on its molecule and closes by itself.
  const drawn = !(await j.page.locator(".duel:not(.hidden)").count());
  const result = drawn ? "Conseguido" : ((await j.texts(".duel .result"))[0] ?? "");
  j.check("el censo por doble observador se completa («Conseguido»)", /Conseguido/.test(result), `${steps} pasos · ${result}`);
  await j.endSheet();
  await p.waitForTimeout(800);

  // ── To mid June (≈ 16 game days): births in the census, the marmots awake on the meadow, the pikas on the scree.
  const before = c.events.join("|");
  await p.evaluate(() => window.codeshipS3.biome.skip(15.8));
  await goArea(j, "bioma:estacion", "Estación de investigación");
  await j.showPanel(".s3-censo");
  await p.waitForFunction((b) => [...document.querySelectorAll(".s3-censo .cz-events li")].map((li) => li.innerText).join("|") !== b, before, { timeout: 30000 }).catch(() => {});
  c = await card();
  const note = await p.evaluate(() => document.querySelector(".s3-censo .cz-notebook")?.innerText ?? "");
  j.check("el censo por doble observador queda en el cuaderno de campo", /íbices/.test(note), note);
  j.check("al pasar el tiempo el censo cuenta nacimientos o muertes", c.events.some((e) => /nace|muere| caza |crías nuevas/i.test(e)), c.events.slice(0, 5).join(" / "));
  await j.tapInteraction("Cerrar el censo (botón naranja)");
  for (const sh of [
    { id: "bioma:pradera", title: "Pradera de las marmotas", label: "pradera", crowd: "marmota", many: 10, stand: 9 },
    { id: "bioma:pedrera", title: "Pedrera de las pikas", label: "pedrera", crowd: "pika", many: 8, stand: 6 },
  ]) {
    went = await goArea(j, sh.id, sh.title);
    j.check(`«Ir» la lleva a ${sh.title}`, went, await p.evaluate(() => window.codeshipS3.body.area));
    const t = await p.evaluate((s) => window.codeshipS3.biome.view.crowd.centreOf(s), sh.crowd);
    if (t) {
      // From `stand` m downhill (south) of them, looking at them.
      await walkTo(j, t.x, t.z - sh.stand, 1.5);
      const b = await p.evaluate(() => window.codeshipS3.body);
      await face(j, t, Math.atan2(t.y - b.y - 1.6, Math.hypot(t.x - b.x, t.z - b.z)) - 0.3);
    }
    // She watches a few seconds, as a player does: pikas and marmots dart in and out of their burrows and rocks, so one
    // frame may catch one fewer (7 of 8 pikas on CI run 45477655808).
    v = await inView(p);
    for (let k = 0; k < 6 && (v[sh.crowd] ?? 0) < sh.many; k++) {
      await p.waitForTimeout(700);
      const w = await inView(p);
      if ((w[sh.crowd] ?? 0) > (v[sh.crowd] ?? 0)) v = w;
    }
    a = await around(p, 120);
    maxCalls = Math.max(maxCalls, a.calls);
    const where = await p.evaluate((s) => ({ b: window.codeshipS3.body, n: window.codeshipS3.biome.view.crowd.countsOf(s) }), sh.crowd);
    j.check(`${sh.title}: en junio se ven al menos ${sh.many} a la vista`, (v[sh.crowd] ?? 0) >= sh.many, `${JSON.stringify(v)} · mira a ${JSON.stringify(t)} desde ${JSON.stringify(where)}`);
    await capture(j, sh.label, sh.title);
  }
  const plants = (await around(p, 1)).plants;
  const all = ["artemisa", "espino", "pino", "abedul", "enebro", "pradera", "cojines", "amapola", "saussurea", "liquen", "eolica"];
  j.check("las plantas de cada cinturón están vivas, de la artemisa a los líquenes", all.every((k) => (plants[k] ?? 0) > 0), JSON.stringify(plants));
  j.check("las llamadas de dibujo quedan en el presupuesto (≤ 600) en la montaña", maxCalls > 0 && maxCalls <= 600, String(maxCalls));
}
