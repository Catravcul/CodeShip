// PX-51 Sanctuary 3, the biome of the air and the heights (Berón, 2026-11-20: cada santuario recrea el bioma de un
// elemento; el 3 es el aire y las alturas; Berón, 2026-11-25: su fauna son insectos gigantes reales de Gilgit-Baltistán;
// docs/design/bioma-s3.md), on an iPhone 13 with visible taps only. The «Isla de las alturas» is one giant mountain of
// the Karakoram from the river to the snows. With «Ir» set to teleport, Áreas (its zones grouped by altitude belt)
// takes her in November to the steppe (the Asian honeybees flying before their hives) and to the cliffs (insects in the
// air over them; X climbs the ledges); at the research hut the orange button opens the census (each insect, its stages,
// what it eats and who eats it; the bumblebees overwintering in their nests) and the field table offers the Karakoram's
// field jobs (the hives of Apis cerana open, the butterfly transect and the pitfall traps closed in November): she
// draws the hive inspection. In June the transect and the traps open, the bumblebees fly over the meadow, the hornets
// hunt before the hives and the Apollo flies over the scree. The draw calls stay ≤ 600 on the mountain. Captures in
// docs/screenshots/s3b-<zona>-movil.png.
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

/** The live insects (the chain's) of `species`, where they are now. */
const posesOf = (p, species) => p.evaluate((sp) => window.codeshipS3.biome.life.poses().filter((q) => q.species === sp && !q.hidden).map((q) => ({ x: q.x, y: q.y, z: q.z, flying: !!q.flying })), species);

/** Pitch to look from her eyes at a point. */
const pitchTo = (p, t, off = 0) => p.evaluate(([t, off]) => {
  const b = window.codeshipS3.body;
  return Math.max(-0.6, Math.min(0.7, Math.atan2(t.y - b.y - 1.6, Math.hypot(t.x - b.x, t.z - b.z)) + off));
}, [t, off]);

/**
 * At a colony (bioma-crowd.ts): from `stand` m of its middle, on ground she can walk, she looks at it and counts the
 * workers in view for a few seconds, as a player watches (they fly in circles before their nests). Returns the most seen.
 */
async function watchColony(j, species, stand) {
  const p = j.page;
  const t = await p.evaluate((s) => window.codeshipS3.biome.view.crowd.centreOf(s), species);
  if (!t) return { seen: 0, t };
  const spot = await p.evaluate(([h, r0]) => {
    const g = window.codeshipS3.biome.life.geo;
    const b = window.codeshipS3.body;
    let best = null;
    for (const r of [r0, r0 * 0.7, r0 * 1.4]) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const x = h.x + r * Math.cos(a);
        const z = h.z + r * Math.sin(a);
        if (g.isSea(x, z) || g.steep(x, z) > 0.6) continue;
        const d = Math.hypot(x - b.x, z - b.z);
        if (!best || d < best.d) best = { x, z, d };
      }
      if (best) return best;
    }
    return null;
  }, [t, stand]);
  if (spot) await walkTo(j, spot.x, spot.z, 1.5);
  await face(j, t, await pitchTo(p, t, -0.15));
  let seen = 0;
  for (let k = 0; k < 6; k++) {
    seen = Math.max(seen, (await inView(p))[species] ?? 0);
    await p.waitForTimeout(600);
  }
  return { seen, t };
}

/** Looks for a flying insect of the chain (`species`), facing where it is now, for up to `tries` looks; true if one was in view. */
async function watchFlying(j, species, r, tries) {
  const p = j.page;
  let last = {};
  for (let k = 0; k < tries; k++) {
    const b = await p.evaluate(() => window.codeshipS3.body);
    const q = (await posesOf(p, species)).filter((x) => x.flying).sort((a, c) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(c.x - b.x, c.z - b.z))[0];
    if (!q) {
      await p.waitForTimeout(800);
      continue;
    }
    if (k % 3 === 0) await face(j, q, await pitchTo(p, q));
    last = await chainInView(p, r);
    if ((last[`${species}:vuela`] ?? 0) > 0) return { ok: true, last };
    await p.waitForTimeout(500);
  }
  return { ok: false, last };
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
  j.check("la isla del bioma es la «Isla de las alturas», con sus zonas del río a las nieves", isl.name === "Isla de las alturas" && zones.every((z) => isl.areas.some((a) => a.id === z)), `${isl.name}: ${isl.areas.map((a) => a.id).join(", ")}`);
  j.check("cada zona en su cinturón de altitud real (de la estepa submontana a las nieves)", new Set(isl.areas.map((a) => a.belt).filter(Boolean)).size === 6, JSON.stringify(isl.areas));

  let maxCalls = 0;
  // ── November, the steppe: the Asian honeybees fly before their hives in the rock (the only colony out in winter).
  let went = await goArea(j, "bioma:estepa", "Estepa de artemisa");
  j.check("«Ir» la lleva a la estepa de artemisa", went && (await p.evaluate(() => window.codeshipS3.body.area)).startsWith("bioma"), await p.evaluate(() => JSON.stringify(window.codeshipS3.body)));
  const hives = await p.evaluate(() => window.codeshipS3.biome.view.crowd.countsOf("abeja"));
  j.check("en noviembre las colonias de abeja asiática están activas en sus colmenas", !!hives && hives.nests >= 1 && !hives.asleep && hives.adults > 0, JSON.stringify(hives));
  const bees = await watchColony(j, "abeja", 22);
  let a = await around(p, 250);
  maxCalls = Math.max(maxCalls, a.calls);
  j.check("ante las colmenas de la roca se ven las obreras de abeja asiática volando (al menos 6 a la vista)", bees.seen >= 6, `${bees.seen} · ${JSON.stringify(bees.t)}`);
  await capture(j, "colmenas", "Colmenas de abeja asiática en la estepa");

  // ── The cliffs: insects in the air over them; X climbs the ledges.
  went = await goArea(j, "bioma:farallon", "Farallón de los íbices");
  j.check("«Ir» la lleva al pie del farallón", went && (await p.evaluate(() => window.codeshipS3.body.area)).startsWith("bioma"), await p.evaluate(() => JSON.stringify(window.codeshipS3.body)));
  a = await around(p, 250);
  maxCalls = Math.max(maxCalls, a.calls);
  j.check("sobre los cantiles vuelan insectos gigantes (abejas, sírfidos…)", Object.values(a.flying).reduce((t, n) => t + n, 0) > 0, JSON.stringify(a.flying));
  const ledge = await p.evaluate(() => window.codeshipS3.layout.world.floors.filter((f) => f.id.startsWith("bioma:repisa")).sort((a, b) => a.y - b.y)[0]);
  await walkTo(j, (ledge.x0 + ledge.x1) / 2, ledge.z0 - 0.5, 0.4);
  await lookAt(j, (ledge.x0 + ledge.x1) / 2, ledge.z1 + 20);
  await capture(j, "farallon", "Farallón de las repisas");
  const y0 = await p.evaluate(() => window.codeshipS3.body.y);
  await j.tap('.switch-pad .ap-btn[aria-label^="Trepar"]', "Trepar (X)").catch(() => {});
  await p.waitForTimeout(1600);
  const y1 = await p.evaluate(() => window.codeshipS3.body.y);
  j.check("con X (Trepar) sube a la primera repisa del farallón", y1 - y0 > 0.6, `${y0.toFixed(1)} → ${y1.toFixed(1)} m`);

  // ── The research hut: the census through the orange button; in November the bumblebees overwinter in their nests.
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
  j.check("cada especie tiene su fila: 12 plantas, 4 bancos y 15 insectos", c.rows.length >= 31, String(c.rows.length));
  j.check("las abejas asiáticas salen con su número, sus etapas, las obreras que se ven y sus colmenas", /\d/.test(row("abeja")) && /adulto/i.test(row("abeja")) && /Se ven ≈/.test(row("abeja")) && /colmenas/.test(row("abeja")), row("abeja"));
  j.check("la dieta está: la abeja come flores y se la comen la mosca ladrona, la mantis y el avispón", /Come:.*Flores/i.test(row("abeja")) && /Lo comen:.*Avispón/i.test(row("abeja")), row("abeja"));
  j.check("en noviembre los abejorros pasan el invierno dentro del nido", /invierno/i.test(row("abejorro")), row("abejorro"));
  const wide = await p.evaluate(() => {
    const el = document.querySelector(".s3-censo");
    const over = [...el.querySelectorAll("li")].filter((li) => li.scrollWidth > li.clientWidth + 1 || li.getBoundingClientRect().right > window.innerWidth + 1).map((li) => li.dataset.especie ?? li.innerText.slice(0, 20));
    return { over, card: Math.round(el.getBoundingClientRect().width), vw: window.innerWidth };
  });
  j.check("cada fila del censo cabe en el móvil de 390 px", wide.over.length === 0 && wide.card <= wide.vw, JSON.stringify(wide));
  await capture(j, "censo", "Censo de la montaña");

  // ── The field table: the Karakoram's field jobs; she draws the inspection of the hives.
  await j.tapInteraction("Cerrar el censo (botón naranja)");
  const desk = await p.evaluate(() => window.codeshipS3.biome.view.deskAt);
  const toDesk = async () => {
    await walkTo(j, desk.x, desk.z - 0.9, 0.5);
    return p.waitForFunction(() => window.codeshipS3.biome.nearDesk, null, { timeout: 8000 }).then(() => true).catch(() => false);
  };
  const atDesk = await toDesk();
  j.check("en la cabaña está la mesa de campo, a más de 2 m del tablón", atDesk, await p.evaluate(() => JSON.stringify(window.codeshipS3.body)));
  const label = await j.interactionLabel();
  j.check("en la mesa, el botón naranja (la Y del mando) dice «Reto: Mesa de campo» y nada se abre solo", /Reto: Mesa de campo/.test(label) && !(await p.evaluate(() => document.body.classList.contains("in-reto-picker"))), label);
  await j.tapInteraction("Reto: Mesa de campo (Y del mando)");
  const jobsNow = () => p.evaluate(() => [...document.querySelectorAll(".reto-picker .rp-opt")].map((b) => ({ open: !b.disabled, text: b.innerText })));
  let jobs = await jobsNow();
  j.check("los trabajos de campo: las colmenas de Apis cerana (abiertas), el transecto de mariposas y las trampas de caída (cerrados en noviembre)", jobs.length === 3 && /colmenas/i.test(jobs[0].text) && jobs[0].open && /Transecto/.test(jobs[1].text) && !jobs[1].open && /Trampas/.test(jobs[2].text) && !jobs[2].open, jobs.map((x) => `${x.text.split("\n")[0]}:${x.open}`).join(", "));
  await capture(j, "mesa", "Mesa de campo");
  await j.tap('.reto-picker .rp-opt[data-i="0"]', "Revisión de las colmenas de abeja asiática");
  await j.waitDuel();
  const oracle = () => window.codeshipS3.exercise ?? window.codeshipS3.trace?.state;
  const total = await p.evaluate(() => ({ counted: window.codeshipS3.biome.counted, nests: window.codeshipS3.biome.view.crowd.countsOf("abeja")?.nests }));
  j.check("el trabajo anota las colmenas de la isla (su último paso es el número de colmenas de la cadena)", total.counted === total.nests && total.nests > 0, JSON.stringify(total));
  let steps = 0;
  let framed = false;
  for (let i = 0; i < 12; i++) {
    const ex = await p.evaluate(oracle);
    if (!ex) break;
    await j.answer(oracle, true);
    await p.waitForTimeout(900);
    framed ||= await p.evaluate(() => window.codeshipS3.biome.steps.framing && window.codeshipS3.biome.steps.played > 0);
    if (i === 0) await capture(j, "mesa-paso", "Revisión de colmenas: un paso en la mesa");
    steps++;
  }
  j.check("cada paso se ve en la mesa (ella con el cuaderno y los prismáticos)", framed);
  // The sheet of options says «Conseguido»; the drawing ends on its molecule and closes by itself.
  const drawn = !(await j.page.locator(".duel:not(.hidden)").count());
  const result = drawn ? "Conseguido" : ((await j.texts(".duel .result"))[0] ?? "");
  j.check("la revisión de las colmenas se completa («Conseguido»)", /Conseguido/.test(result) && !(await p.evaluate(oracle)), `${steps} trazados · ${result}`);
  await j.endSheet();
  await p.waitForTimeout(800);

  // ── To mid June (≈ 16 game days): births and deaths in the census; the summer jobs open.
  const before = c.events.join("|");
  await p.evaluate(() => window.codeshipS3.biome.skip(15.8));
  await goArea(j, "bioma:estacion", "Estación de investigación");
  await j.showPanel(".s3-censo");
  await p.waitForFunction((b) => [...document.querySelectorAll(".s3-censo .cz-events li")].map((li) => li.innerText).join("|") !== b, before, { timeout: 30000 }).catch(() => {});
  c = await card();
  const note = await p.evaluate(() => document.querySelector(".s3-censo .cz-notebook")?.innerText ?? "");
  j.check("la revisión de las colmenas queda en el cuaderno de campo", /colmenas/i.test(note), note);
  j.check("al pasar el tiempo el censo cuenta nacimientos o muertes", c.events.some((e) => /nace|muere|caza|cría|eclosion/i.test(e)) || c.rows.some((r) => /Muertes:|nacidos [1-9]/.test(r.text)), c.events.slice(0, 5).join(" / "));
  await j.tapInteraction("Cerrar el censo (botón naranja)");
  await toDesk();
  await j.tapInteraction("Reto: Mesa de campo (Y del mando)");
  jobs = await jobsNow();
  j.check("en junio se abren el transecto de las apolo y las trampas de los escarabajos", jobs.length === 3 && jobs[1].open && jobs[2].open, jobs.map((x) => `${x.text.split("\n")[0]}:${x.open}`).join(", "));
  await j.tap(".reto-picker:not(.hidden) .rp-close", "Cerrar la mesa de campo");
  j.check("la ✕ cierra la elección de trabajo sin empezar ninguno", await p.evaluate(() => !document.querySelector(".reto-picker:not(.hidden)") && !window.codeshipS3.trace?.state && !window.codeshipS3.exercise));

  // ── June on the mountain: the bumblebees over the meadow, the hornets hunting before the hives, the Apollo on the scree.
  // Insects fly by day: drawing the hives took hours of the board clock (it may be night now), so she goes at midday,
  // as a field entomologist would (Pollard's walk is between 10:45 and 15:45).
  await p.evaluate(() => window.codeshipS3.setHour(11.5));
  went = await goArea(j, "bioma:pradera", "Pradera de las marmotas");
  j.check("«Ir» la lleva a la pradera", went, await p.evaluate(() => window.codeshipS3.body.area));
  // Their four nests spread over ~80 m and the phone held upright sees a narrow slice: she stands well back to see the colony.
  const bumble = await watchColony(j, "abejorro", 60);
  a = await around(p, 120);
  maxCalls = Math.max(maxCalls, a.calls);
  // Each nest shows 4 workers (bioma-crowd.ts); from where she stands one or two nests fill the upright screen.
  j.check("en junio los abejorros de Gilgit vuelan ante sus nidos en la pradera (las obreras de un nido entero a la vista, ≥ 4)", bumble.seen >= 4, `${bumble.seen} · ${JSON.stringify(bumble.t)}`);
  await capture(j, "pradera", "Abejorros en la pradera");

  went = await goArea(j, "bioma:estepa", "Estepa de artemisa");
  await watchColony(j, "abeja", 22);
  const hornet = await watchFlying(j, "avispon", 120, 12);
  a = await around(p, 250);
  maxCalls = Math.max(maxCalls, a.calls);
  j.check("en junio el avispón asiático caza ante las colmenas de abeja, a la vista", hornet.ok, JSON.stringify(hornet.last));
  await capture(j, "avispon", "Avispones ante las colmenas");

  went = await goArea(j, "bioma:pedrera", "Pedrera de las pikas");
  j.check("«Ir» la lleva a la pedrera", went, await p.evaluate(() => window.codeshipS3.body.area));
  const apollo = await watchFlying(j, "mariposa", 120, 18);
  a = await around(p, 250);
  maxCalls = Math.max(maxCalls, a.calls);
  j.check("en junio el Apolo del Himalaya vuela sobre la pedrera, a la vista", apollo.ok, JSON.stringify(apollo.last));
  await capture(j, "pedrera", "El Apolo sobre la pedrera");

  const plants = (await around(p, 1)).plants;
  const all = ["artemisa", "espino", "pino", "abedul", "enebro", "pradera", "cojines", "amapola", "saussurea", "liquen", "eolica", "flores"];
  j.check("las plantas de cada cinturón y las flores están vivas, de la artemisa a los líquenes", all.every((k) => (plants[k] ?? 0) > 0), JSON.stringify(plants));
  j.check("las llamadas de dibujo quedan en el presupuesto (≤ 600) en la montaña", maxCalls > 0 && maxCalls <= 600, String(maxCalls));
  j.check("sin errores en la página", j.errors.length === 0, j.errors.slice(0, 3).join(" | "));
}
