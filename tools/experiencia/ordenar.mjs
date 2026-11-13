import { readStats } from "./cocina.mjs";
// Order challenges (docs/qa/casos.md UI-04, UI-05): programming a trip from the travel ship's bridge.
// «Ordenar todo y enviar»: a wrong order marks every slot ✓/✗ and keeps them until «Reintentar», which
// leaves the right ones in place. «Paso a paso»: a wrong pick is flagged at once and costs one failure;
// the same wrong pick again costs nothing. Both views (panel and HUD) and both modes are captured.

/** The answer key: the challenge on screen, as a player who knows the code would read it. */
const key = () => window.codeship.duelView.duel?.current ?? null;

const marks = (j) =>
  j.page.evaluate(() =>
    [...document.querySelectorAll(".duel .slots .block")].map((b) => {
      const m = b.querySelector(".mark");
      return m ? `${m.textContent}:${m.getAttribute("aria-label")}:${getComputedStyle(m).backgroundColor}` : b.classList.contains("slot") ? "vacío" : "sin marca";
    }),
  );

/** Before a capture: the sheet scrolled so the question and the slots sit just under the status. */
const showSlots = (j) =>
  j.page.evaluate(() => {
    const d = document.querySelector(".duel");
    const top = d.querySelector(".duel-top").getBoundingClientRect().bottom;
    d.scrollTop += d.querySelector(".question").getBoundingClientRect().top - top - 8;
  });

const tray = (j, id) => j.page.locator(`.duel .tray [data-id="${id}"]`);

async function openTrip(j) {
  await j.page.evaluate(() => window.codeship.interior.openNavConsole());
  await j.page.waitForTimeout(1200);
  await j.tap(".nav-map [data-act=program], [data-act=program]", "Programar viaje");
  await j.waitDuel(30000);
  await j.page.waitForTimeout(500);
}

export async function ordenar(j) {
  const p = j.page;
  await j.tap(".mode-btn", "Entrar en la nave de viaje");
  await p.waitForTimeout(800);
  await openTrip(j);
  let ex = await p.evaluate(key);
  j.check("el viaje empieza con un reto de ordenar la maniobra", ex?.kind === "order", ex?.kind);
  const sol = ex.solution;
  const mode = (await j.texts(".duel .order-toggle"))[0] ?? "";
  j.check("junto a «Vista HUD» está el cambio de modo, en «Ordenar todo y enviar» por defecto", mode === "Paso a paso", mode);

  // A: wrong order with steps 2 and 3 swapped.
  const wrong = [sol[0], sol[2], sol[1], ...sol.slice(3)];
  for (const id of wrong) await j.tapAt(tray(j, id));
  await j.tapAt(p.locator(".duel .submit"));
  let [, fails] = await readStats(j);
  let m = await marks(j);
  j.check("un orden erróneo suma un fallo", /Fallos 1\//.test(fails), fails);
  j.check("cada casilla dice si está en su sitio: ✓ en verde, ✗ en rojo, con nombre", m[0]?.startsWith("✓:en su sitio:rgb(94, 224, 143)") && m[1]?.startsWith("✗:no va aquí:rgb(255, 107, 90)") && m[2]?.startsWith("✗") && m.slice(3).every((x) => x.startsWith("✓")), m.join(" | "));
  const fb = (await j.texts(".duel .feedback"))[0] ?? "";
  j.check("el aviso cuenta cuántos pasos están en su sitio", new RegExp(`${sol.length - 2} de ${sol.length} en su sitio`).test(fb), fb);
  await showSlots(j);
  await p.waitForTimeout(300);
  await j.shot("ordenar-panel-todo");
  await p.waitForTimeout(2500);
  j.check("las marcas siguen a la vista hasta que el jugador actúa", (await marks(j)).filter((x) => /^[✓✗]/.test(x)).length === sol.length);
  await j.tap('.duel [data-act="ui"]', "Vista HUD");
  await p.waitForTimeout(400);
  m = await marks(j);
  j.check("en vista HUD se ven las mismas marcas", m.filter((x) => x.startsWith("✗")).length === 2 && m.filter((x) => x.startsWith("✓")).length === sol.length - 2, m.join(" | "));
  await showSlots(j);
  await p.waitForTimeout(300);
  await j.shot("ordenar-hud-todo");
  await j.tap(".duel .submit.retry", "Reintentar: quitar los ✗");
  m = await marks(j);
  j.check("Reintentar deja los ✓ en su sitio y devuelve los ✗ a la bandeja", m[0].startsWith("✓") && m[1] === "vacío" && m[2] === "vacío" && m.slice(3).every((x) => x.startsWith("✓")), m.join(" | "));
  await j.tapAt(tray(j, sol[1]));
  await j.tapAt(tray(j, sol[2]));
  await j.tapAt(p.locator(".duel .submit"));
  let [hits] = await readStats(j);
  [, fails] = await readStats(j);
  j.check("completado sin tocar los buenos, el paso cuenta como acierto y sin más fallos", /Aciertos 1\//.test(hits) && /Fallos 1\//.test(fails), `${hits} · ${fails}`);
  await j.tap('.duel [data-act="close"]', "×");
  await p.waitForTimeout(600);

  // B: step by step, in a new attempt at the trip.
  await openTrip(j);
  ex = await p.evaluate(key);
  await j.tap(".duel .order-toggle", "Paso a paso");
  const stored = await p.evaluate(() => localStorage.getItem("codeship.retos-ordenar"));
  j.check("el modo se guarda en el dispositivo", stored === "pasos", stored);
  const q = (await j.texts(".duel .question"))[0] ?? "";
  j.check("la pregunta dice qué paso se elige", /paso a paso: elige el paso 1 de/.test(q), q);
  j.check("paso a paso no hay botón de enviar", (await p.locator(".duel .submit").count()) === 0);
  await j.tapAt(tray(j, ex.solution[0]));
  m = await marks(j);
  j.check("un paso bien queda en su casilla con ✓", m[0]?.startsWith("✓"), m[0]);
  const bad = ex.blocks.map((b) => b.id).find((id) => !ex.solution.slice(0, 2).includes(id));
  await j.tapAt(tray(j, bad));
  [, fails] = await readStats(j);
  const flagged = await j.texts(".duel .tray .block.wrong");
  const fb2 = (await j.texts(".duel .feedback"))[0] ?? "";
  j.check("un paso erróneo avisa al momento y cuenta un fallo", /Fallos 1\//.test(fails) && /no va en el paso 2/.test(fb2), `${fails} · ${fb2}`);
  j.check("el bloque erróneo queda tachado con ✗ en la bandeja y no se coloca", flagged.length === 1 && flagged[0].startsWith("✗") && (await marks(j))[1] === "vacío", flagged.join(" | "));
  await showSlots(j);
  await p.waitForTimeout(300);
  await j.shot("ordenar-hud-pasos");
  await j.tapAt(tray(j, bad));
  [, fails] = await readStats(j);
  const fb3 = (await j.texts(".duel .feedback"))[0] ?? "";
  j.check("repetir el mismo paso erróneo no cuenta otro fallo", /Fallos 1\//.test(fails) && /ya falló/.test(fb3), `${fails} · ${fb3}`);
  await j.tap('.duel [data-act="ui"]', "Vista panel");
  await p.waitForTimeout(400);
  const lit = await p.evaluate(() => document.querySelectorAll(".duel .meter.patience .cell.on").length);
  j.check("en vista panel, los medidores de casillas siguen como eran (Intentos con una casilla menos)", lit === 1 && (await j.texts(".duel .meter .label")).join(",") === "Plan,Intentos", String(lit));
  await showSlots(j);
  await p.waitForTimeout(300);
  await j.shot("ordenar-panel-pasos");
  for (const id of ex.solution) if ((await tray(j, id).count()) > 0) await j.tapAt(tray(j, id));
  await p.waitForTimeout(400);
  [hits] = await readStats(j);
  j.check("con todos los pasos bien, el reto cuenta un acierto", /Aciertos 1\//.test(hits), hits);
  // Opening the game again on the same device (a second tab, so this one keeps its performance sampler).
  const again = await p.context().newPage();
  await again.goto(p.url());
  await again.waitForFunction(() => window.codeship, null, { timeout: 120000 });
  const after = await again.evaluate(() => localStorage.getItem("codeship.retos-ordenar"));
  await again.close();
  j.check("al volver a abrir el juego sigue en paso a paso", after === "pasos", after);
}
