// PX-51 Sanctuary 3, the subantarctic biome (Berón, 2026-11-19: «crear un bioma donde hay animales y plantas de todo
// tipo para cumplir una cadena alimenticia y que sigan sus ciclos de vida naturales»; docs/design/bioma-s3.md), on an
// iPhone 13 with visible taps only. With «Ir» set to teleport, Áreas takes her to the penguin colony and the tussac
// slope (animals and plants in sight), then to the field station: at the census board the card shows only through
// the orange button (reglas.md §5.8), with each species' count, its stages and what it eats. Then a month of the
// island passes (the test hook `codeshipS3.biome.skip`) and the card lists a birth or a death.
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

const SHOTS = [
  { id: "bioma:colonia", title: "Colonia de pingüinos papúa", label: "colonia", want: ["papua"], stand: 5 },
  { id: "bioma:playa", title: "Playa de los lobos marinos", label: "playa", want: [], stand: 12 },
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
    // Look at where most animals are around her.
    const t = await p.evaluate(() => {
      const c = window.codeshipS3;
      const b = c.body;
      // The animal with most others round it (a group, not an empty middle), on land within 60 m.
      const ps = c.biome.life.poses().filter((q) => !q.flying && !q.swimming && Math.hypot(q.x - b.x, q.z - b.z) < 60);
      let best = null;
      let most = -1;
      for (const q of ps) {
        const n = ps.filter((o) => Math.hypot(o.x - q.x, o.z - q.z) < 8).length;
        if (n > most) [best, most] = [q, n];
      }
      return best && { x: best.x, z: best.z };
    });
    // A few steps toward them with «Moverse», then look at them, a little down.
    if (t) {
      await walkTo(j, t.x, t.z, sh.stand);
      await lookAt(j, t.x, t.z);
    }
    await tilt(j, -0.18);
    await p.waitForTimeout(800);
    const a = await around(p, 80);
    maxCalls = Math.max(maxCalls, a.calls);
    const kinds = Object.keys(a.near);
    j.check(`${sh.title}: se ven animales cerca (${kinds.join(", ") || "ninguno"})`, a.visible && kinds.length > 0 && sh.want.every((w) => kinds.includes(w)), JSON.stringify(a.near));
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
  await capture(j, "censo", "Censo de la isla");

  // A month of the island (≈ 2,3 game days) passes: births, deaths, arrivals reach the card.
  const before = c.events.join("|");
  await p.evaluate(() => window.codeshipS3.biome.skip(2.5));
  await p.waitForFunction((b) => [...document.querySelectorAll(".s3-censo .cz-events li")].map((li) => li.innerText).join("|") !== b, before, { timeout: 30000 }).catch(() => {});
  c = await card();
  j.check("al pasar el tiempo el censo cuenta nacimientos o muertes", c.events.some((e) => /nace|muere| caza:|crías nuevas/i.test(e)), c.events.slice(0, 5).join(" / "));
  await capture(j, "censo-despues", "Censo tras un mes");
  j.check("las llamadas de dibujo quedan en el presupuesto (≤ 600) en la isla", maxCalls > 0 && maxCalls <= 600, String(maxCalls));
}
