// PX-51 Sanctuary 3, the subantarctic biome (Berón, 2026-11-19: «crear un bioma donde hay animales y plantas de todo
// tipo para cumplir una cadena alimenticia y que sigan sus ciclos de vida naturales»; docs/design/bioma-s3.md), on an
// iPhone 13 with visible taps only. With «Ir» set to teleport, Áreas takes her to the penguin colony and the tussac
// slope (animals and plants in sight), then to the field station: at the census board the card shows only through
// the orange button (reglas.md §5.8), with each species' count, its stages and what it eats. Then a month of the
// island passes (the test hook `codeshipS3.biome.skip`) and the card lists a birth or a death.
// The crowds (bioma-s3-2): the colony, the beach and the tussac look as dense as the real ones (hundreds of gentoos
// and fur seals in view, 650 tussocks a hectare), nests with eggs in November, the moult in its season; the census
// reads krill in tonnes and every row fits a 390 px phone; at the field table the orange button offers the nest
// count (a real procedure, acted out at the table) and she does it.
// Captures in docs/screenshots/s3b-<zona>-movil.png.
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

/** What lives near her: animals by species within `r` metres, the draw calls of the last frame. */
const around = (p, r) =>
  p.evaluate((r) => {
    const c = window.codeshipS3;
    const b = c.body;
    const near = {};
    for (const q of c.biome.life.poses()) if (Math.hypot(q.x - b.x, q.z - b.z) < r) near[q.species] = (near[q.species] ?? 0) + 1;
    const plants = c.biome.life.state.plants;
    return { near, plants: Object.fromEntries(Object.entries(plants).map(([k, v]) => [k, Math.round(v)])), calls: window.__codeshipFrame?.calls ?? 0, visible: c.biome.view.root.visible };
  }, r);

/** Crowd animals in the camera's view within 80 m, by species. */
const inView = (p) => p.evaluate(() => window.codeshipS3.biome.view.crowd.inView(window.codeshipS3.camera, 80));

const SHOTS = [
  // crowd: whose crowd to look at (its middle), from `stand` m; `many`: how many of it in view at least.
  { id: "bioma:colonia", title: "Colonia de pingüinos papúa", label: "colonia", want: ["papua"], crowd: "papua", stand: 12, many: 120 },
  { id: "bioma:playa", title: "Playa de los lobos marinos", label: "playa", want: [], crowd: "lobo", stand: 7, many: 20 },
  { id: "bioma:tussac", title: "Ladera de tussac", label: "tussac", want: [], stand: 6 },
];

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
  // Áreas shows the island chosen in the shared settings: the subantarctic island, from the training one.
  await j.taskSettings({ travel: "teletransporte", vehicle: "bioma" });
  await j.tap(".task-board .tb-close, .task-board [aria-label='Cerrar tareas']", "Cerrar tareas").catch(() => {});

  const areas = await p.evaluate(() => window.codeshipS3.layout.areas.filter((a) => a.island === "bioma").map((a) => a.id));
  j.check("Áreas tiene la isla subantártica con sus zonas (estación, playa, colonia, tussac, musgo, kelp)", ["bioma:estacion", "bioma:playa", "bioma:colonia", "bioma:tussac", "bioma:musgo", "bioma:kelp"].every((a) => areas.includes(a)), areas.join(", "));

  let maxCalls = 0;
  for (const sh of SHOTS) {
    const went = await goArea(j, sh.id, sh.title);
    j.check(`«Ir» la lleva a ${sh.title}`, went && (await p.evaluate(() => window.codeshipS3.body.area)).startsWith("bioma"), await p.evaluate(() => window.codeshipS3.body.area));
    // Look at the crowd's middle (or, on the slope, where most of the chain's animals are) from a few metres off.
    const t = await p.evaluate((crowd) => {
      const c = window.codeshipS3;
      if (crowd) return c.biome.view.crowd.centreOf(crowd) ?? null;
      const b = c.body;
      const ps = c.biome.life.poses().filter((q) => !q.flying && !q.swimming && Math.hypot(q.x - b.x, q.z - b.z) < 60);
      let best = null;
      let most = -1;
      for (const q of ps) {
        const n = ps.filter((o) => Math.hypot(o.x - q.x, o.z - q.z) < 8).length;
        if (n > most) [best, most] = [q, n];
      }
      return best && { x: best.x, z: best.z };
    }, sh.crowd ?? null);
    if (t) {
      await walkTo(j, t.x, t.z, sh.stand);
      await lookAt(j, t.x, t.z);
    }
    await tilt(j, sh.crowd ? -0.3 : -0.18);
    await p.waitForTimeout(800);
    const a = await around(p, 80);
    maxCalls = Math.max(maxCalls, a.calls);
    const kinds = Object.keys(a.near);
    j.check(`${sh.title}: se ven animales cerca (${kinds.join(", ") || "ninguno"})`, a.visible && kinds.length > 0 && sh.want.every((w) => kinds.includes(w)), JSON.stringify(a.near));
    if (sh.crowd) {
      const v = await inView(p);
      j.check(`${sh.title}: densa como la real, al menos ${sh.many} a la vista`, (v[sh.crowd] ?? 0) >= sh.many, JSON.stringify(v));
    }
    if (sh.label === "colonia") {
      const n = await p.evaluate(() => window.codeshipS3.biome.view.crowd.countsOf("papua"));
      j.check("noviembre: nidos de piedras con huevos en la colonia (la incubación)", n.phase === "huevos" && n.nests > 0 && n.eggs > 0, JSON.stringify(n));
    }
    if (sh.label === "tussac") {
      const tc = await p.evaluate(() => window.codeshipS3.biome.view.tussacCount);
      j.check("la ladera de tussac tiene su densidad real (650 matas por hectárea): más de 1000 matas, las cercanas con hojas", tc.all > 1000 && tc.near > 100, JSON.stringify(tc));
    }
    await capture(j, sh.label, sh.title);
  }
  const plants = (await around(p, 1)).plants;
  j.check("las plantas están vivas: tussac, musgo, hierba pilosa, liquen, kelp y fitoplancton con biomasa", ["tussac", "musgo", "hierba-pilosa", "liquen", "kelp", "fitoplancton"].every((k) => (plants[k] ?? 0) > 0), JSON.stringify(plants));

  // The field station: «Ir» leaves her at the census board; the card waits for the orange button.
  const went = await goArea(j, "bioma:estacion", "Estación de investigación");
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
  j.check("el botón naranja abre el censo de la isla", c.open, String(c.rows.length));
  const row = (id) => c.rows.find((r) => r.id === id)?.text ?? "";
  j.check("cada especie tiene su fila: 6 plantas, 7 del mar y el suelo, 10 aves y focas", c.rows.length >= 23, String(c.rows.length));
  j.check("los pingüinos papúa salen con su número y sus etapas", /\d/.test(row("papua")) && /adulto/i.test(row("papua")), row("papua"));
  j.check("la dieta está: el papúa come kril, el leopardo come pingüinos y focas", /Come:.*kril/i.test(row("papua")) && /Come:.*(pingüino|papúa)/i.test(row("leopardo")), `${row("papua")} | ${row("leopardo")}`);
  j.check("y quién se los come: al kril se lo comen pingüinos y focas", /Lo comen:/.test(row("kril")), row("kril"));
  j.check("el kril se lee en toneladas («≈ 800 000 t»), sin «millones de millones»", /≈ \d{1,3}(\s\d{3})* t/.test(row("kril")) && !/millones de millones|\d\.\d{3}\.\d{3}/.test(row("kril")), row("kril").split("\n")[1]);
  const wide = await p.evaluate(() => {
    const el = document.querySelector(".s3-censo");
    const over = [...el.querySelectorAll("li")].filter((li) => li.scrollWidth > li.clientWidth + 1 || li.getBoundingClientRect().right > window.innerWidth + 1).map((li) => li.dataset.especie ?? li.innerText.slice(0, 20));
    return { over, card: Math.round(el.getBoundingClientRect().width), vw: window.innerWidth };
  });
  j.check("cada fila del censo cabe en el móvil de 390 px", wide.over.length === 0 && wide.card <= wide.vw, JSON.stringify(wide));
  j.check("el censo dice cuántos papúas se ven en la colonia, con sus nidos y huevos", /Se ven ≈ [\d\s]+ .*nidos/.test(row("papua")), row("papua"));
  await capture(j, "censo", "Censo de la isla");

  // The field table: the orange button offers the nest count (it is November: the gentoos sit on their eggs).
  await j.tap(".rm-act:not(.hidden)", "Cerrar el censo (botón naranja)").catch(() => {});
  const desk = await p.evaluate(() => window.codeshipS3.biome.view.deskAt);
  await walkTo(j, desk.x, desk.z - 0.9, 0.5);
  const atDesk = await p.waitForFunction(() => window.codeshipS3.biome.nearDesk, null, { timeout: 8000 }).then(() => true).catch(() => false);
  j.check("en la cabaña está la mesa de campo, a más de 2 m del tablón", atDesk, await p.evaluate(() => JSON.stringify(window.codeshipS3.body)));
  // The orange button reads «Reto: Mesa de campo» (ui/interaction.ts, as in sanctuary 1) and opens the shared picker.
  const label = await p.waitForFunction(() => [...document.querySelectorAll(".rm-act:not(.hidden)")].map((b) => b.innerText).join("|"), null, { timeout: 8000 }).then((h) => h.jsonValue()).catch(() => "");
  j.check("en la mesa, el botón naranja dice «Reto: Mesa de campo» y nada se abre solo", /Reto: Mesa de campo/.test(label) && !(await p.evaluate(() => document.body.classList.contains("in-reto-picker"))), label);
  await j.tap(".rm-act:not(.hidden)", "Reto: Mesa de campo");
  const jobs = await p.evaluate(() => [...document.querySelectorAll(".reto-picker .rp-opt")].map((b) => ({ open: !b.disabled, text: b.innerText })));
  j.check("el selector de retos del santuario 1 ofrece contar los nidos (abierto en noviembre) y anillar pollos de albatros (con su época)", jobs.length === 2 && /nidos/.test(jobs[0].text) && jobs[0].open && /albatros/.test(jobs[1].text), jobs.map((x) => `${x.text.split("\n")[0]}:${x.open}`).join(", "));
  await capture(j, "mesa", "Mesa de campo");
  await j.tap('.reto-picker .rp-opt[data-i="0"]', "Contar los nidos de papúa");
  await j.waitDuel();
  const oracle = () => window.codeshipS3.exercise;
  const nests = await p.evaluate(() => window.codeshipS3.biome.counted);
  let steps = 0;
  let framed = false;
  for (let i = 0; i < 12; i++) {
    const ex = await p.evaluate(oracle);
    if (!ex) break;
    if (i === 6) j.check(`el último paso pide el total de la colonia (${nests} nidos)`, JSON.stringify(ex).includes(String(nests)), JSON.stringify(ex).slice(0, 200));
    await j.answer(oracle, true);
    await p.waitForTimeout(900);
    framed ||= await p.evaluate(() => window.codeshipS3.biome.steps.framing && window.codeshipS3.biome.steps.played > 0);
    if (i === 2) await capture(j, "mesa-paso", "Contar los nidos: un paso en la mesa");
    steps++;
  }
  j.check("cada paso se ve en la mesa (ella con el cuaderno y el contador)", framed);
  const result = (await j.texts(".duel .result"))[0] ?? "";
  j.check("contar los nidos se completa («Conseguido»)", /Conseguido/.test(result), `${steps} pasos · ${result}`);
  await j.tap(".duel button.end", "Continuar").catch(() => {});
  await p.waitForTimeout(800);
  await goArea(j, "bioma:estacion", "Estación de investigación");
  await j.showPanel(".s3-censo");
  const note = await p.evaluate(() => document.querySelector(".s3-censo .cz-notebook")?.innerText ?? "");
  j.check("el recuento queda en el cuaderno de campo del censo", /nidos ocupados/.test(note), note);

  // A month of the island (≈ 2,3 game days) passes: births, deaths, arrivals reach the card.
  const before = c.events.join("|");
  await p.evaluate(() => window.codeshipS3.biome.skip(2.5));
  await p.waitForFunction((b) => [...document.querySelectorAll(".s3-censo .cz-events li")].map((li) => li.innerText).join("|") !== b, before, { timeout: 30000 }).catch(() => {});
  c = await card();
  j.check("al pasar el tiempo el censo cuenta nacimientos o muertes", c.events.some((e) => /nace|muere| caza:|crías nuevas/i.test(e)), c.events.slice(0, 5).join(" / "));
  await capture(j, "censo-despues", "Censo tras un mes");
  // Late March: the chicks have gone and the gentoos moult ashore; the elephant seals moult on the beach.
  await p.evaluate(() => window.codeshipS3.biome.skip(7.6));
  await p.waitForFunction(() => (window.codeshipS3.biome.view.crowd.countsOf("papua")?.moult ?? 0) > 0, null, { timeout: 60000 }).catch(() => {});
  const m = await p.evaluate(() => ({ papua: window.codeshipS3.biome.view.crowd.countsOf("papua"), elefante: window.codeshipS3.biome.view.crowd.countsOf("elefante") }));
  j.check("a finales de marzo los papúas mudan en tierra y los elefantes marinos en la playa", m.papua.moult > 0 && m.elefante.moult > 0 && m.papua.nests === 0, JSON.stringify(m));
  await goArea(j, "bioma:colonia", "Colonia de pingüinos papúa");
  const mc = await p.evaluate(() => window.codeshipS3.biome.view.crowd.centreOf("papua"));
  if (mc) {
    await walkTo(j, mc.x, mc.z, 10);
    await lookAt(j, mc.x, mc.z);
    await tilt(j, -0.3);
  }
  await capture(j, "muda", "Colonia en muda");
  const a2 = await around(p, 80);
  maxCalls = Math.max(maxCalls, a2.calls);
  j.check("las llamadas de dibujo quedan en el presupuesto (≤ 600) en la isla", maxCalls > 0 && maxCalls <= 600, String(maxCalls));
}
