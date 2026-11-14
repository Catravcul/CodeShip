// The real bridge (docs/design/puente.md, docs/design/escala.md): in first person on an iPhone 13, every
// console can be told apart by its sign and tapped, its sign never on top of another; she sits at the
// probe's station and takes its controls; the plot table opens the NAV page. Captures go to
// docs/screenshots/puente-<pantalla>.png.
import { mkdirSync } from "node:fs";

const ORDER = ["prop", "sonda", "dock", "life", "power", "mente", "nano", "comms", "salida"];

async function capture(j, label, title) {
  await j.page.waitForTimeout(700);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/puente-${label}.png` });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

/** Visible signs that overlap on screen (each a rectangle centred on its sign). */
function signOverlaps(signs) {
  const ids = Object.keys(signs).filter((k) => signs[k].onScreen);
  const out = [];
  for (let a = 0; a < ids.length; a++)
    for (let b = a + 1; b < ids.length; b++) {
      const p = signs[ids[a]];
      const q = signs[ids[b]];
      if (Math.abs(p.x - q.x) < (p.w + q.w) / 2 - 2 && Math.abs(p.y - q.y) < (p.h + q.h) / 2 - 2) out.push(`${ids[a]}×${ids[b]}`);
    }
  return out;
}

export async function puente(j) {
  const p = j.page;
  await j.setup("acopla en la nodriza y sube al puente por la espina", () => {
    const c = window.codeship;
    c.docking.dockNow(c.mothership);
    c.bridge.enter("salida");
  });
  await p.waitForTimeout(900);
  const view = await p.evaluate(() => ({ third: window.codeship.bridge.thirdPerson, label: document.querySelector(".room-ui:not(.hidden) .cab-view")?.getAttribute("aria-label") }));
  j.check("al entrar, la vista es en 1ª persona (ajuste «Vista a pie» por defecto)", view.third === false && /1ª/.test(view.label ?? ""), JSON.stringify(view));
  await j.setup("mira hacia proa desde la escotilla", () => window.codeship.bridge.face({ x: 0, y: 1.0, z: -4 }));
  await capture(j, "entrada", "Puente desde la escotilla, 1ª persona");
  const first = await p.evaluate(() => window.codeship.bridge.measure());
  const o0 = signOverlaps(first.signs);
  j.check("desde la escotilla, ningún cartel tapa a otro", o0.length === 0, o0.join(", "));

  // Every console: seen from the plot table in the middle, its sign readable and alone, its tap box big enough, and a tap walks her there.
  for (const id of ORDER) {
    await j.setup(`desde la mesa, gira la vista hacia «${id}»`, (m) => {
      const b = window.codeship.bridge;
      b.enter("nav");
      b.face(b.opts.layout.stations.find((s) => s.id === m).look);
    }, id);
    await p.waitForTimeout(500);
    const m = await p.evaluate(() => window.codeship.bridge.measure());
    const s = m.signs[id];
    const h = m.hits[id];
    const label = await p.evaluate((x) => window.codeship.bridge.opts.layout.stations.find((s) => s.id === x).label, id);
    j.check(`«${label}»: su cartel se ve y se lee (≥ 28 px de alto)`, !!s && s.onScreen && s.h >= 28, s ? `${s.w}×${s.h} px` : "oculto");
    const ov = signOverlaps(m.signs);
    j.check(`«${label}»: ningún cartel tapa a otro`, ov.length === 0, ov.join(", "));
    j.check(`«${label}»: la consola es un objetivo de toque de al menos 44×44 px`, !!h && h.w >= 44 && h.h >= 44, h ? `${h.w}×${h.h} px` : "fuera de pantalla");
    const pt = await p.evaluate((x) => {
      const q = window.codeship.bridge.screenPoint(x);
      const el = document.elementFromPoint(q.x, q.y);
      return { ...q, free: !!el && el.tagName === "CANVAS" };
    }, id);
    j.check(`«${label}»: su centro no está tapado por la interfaz`, pt.free, `${Math.round(pt.x)},${Math.round(pt.y)}`);
    await j.useMachine("bridge", id, null);
    const card = (await j.texts(".room-ui:not(.hidden) .cab-machine b"))[0] ?? "";
    j.check(`un toque en «${label}» la lleva a ella y su ficha lo nombra`, card === label, card);
    if (id === "life") await capture(j, "consola", "Consola de sistemas de cerca");
    if (id === "salida") await capture(j, "escotilla", "Escotilla a la espina");
  }

  // The probe's station: she sits (belted, eye lower) and takes its controls.
  await j.useMachine("bridge", "sonda", null);
  await p.waitForTimeout(800);
  const seat = await p.evaluate(() => ({ chair: window.codeship.bridge.chair, eye: +window.codeship.bridge.camera.position.y.toFixed(2) }));
  j.check("en el mando de la sonda se sienta (con arnés), con el ojo a la altura de sentada", seat.chair === true && seat.eye < 1.3, JSON.stringify(seat));
  const probe = await p.evaluate(() => window.codeship.bridge.measure().extra);
  j.check("sentada, la pantalla de la sonda queda a 0,33–0,71 m del ojo y a menos de 30° de su normal (MSIS)", probe.eyeToScreen >= 0.33 && probe.eyeToScreen <= 0.71 && probe.offNormalDeg < 30, `${probe.eyeToScreen} m, ${probe.offNormalDeg}°`);
  await capture(j, "sonda-sentada", "Sentada en el mando de la sonda");
  await j.tap('.room-ui:not(.hidden) .cab-machine [data-act="abrir"]', "Tomar el mando de la sonda");
  await p.waitForTimeout(900);
  j.check("toma el mando de la sonda desde el asiento", await p.evaluate(() => document.body.classList.contains("in-probe")));
  await capture(j, "sonda-mando", "Mando de la sonda");
  await j.tap(".pr-exit", "Volver al puente");
  await p.waitForTimeout(500);

  // The plot table: it opens the NAV page.
  await j.useMachine("bridge", "nav", "abrir", "Usar la consola: Mesa de navegación");
  await p.waitForTimeout(1200);
  const shown = await p.$$eval(".fd .fd-panel", (els) => els.filter((e) => getComputedStyle(e).display !== "none").length);
  j.check("la mesa de navegación abre la página NAV (solo ella)", (await p.evaluate(() => document.body.classList.contains("in-deck"))) && shown === 1, `${shown} páginas`);
  await capture(j, "mesa-nav", "Página NAV desde la mesa");
  await j.tap(".fd-panel.max .fd-back", "Volver al puente");
  await p.waitForTimeout(600);
  await capture(j, "mesa", "Mesa de navegación de cerca");

  // Third person is still one tap away (the eye).
  await j.tap(".room-ui:not(.hidden) .cab-view", "Vista: 1ª persona");
  await p.waitForTimeout(800);
  const label3 = await p.evaluate(() => document.querySelector(".room-ui:not(.hidden) .cab-view")?.getAttribute("aria-label"));
  j.check("el ojo pasa a 3ª persona", /3ª/.test(label3 ?? ""), label3);
  await capture(j, "tercera", "Puente en 3ª persona");
  await j.tap(".room-ui:not(.hidden) .cab-view", "Vista: 3ª persona");
}
