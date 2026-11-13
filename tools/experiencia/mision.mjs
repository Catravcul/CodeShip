// Nevaeh's first mission end to end: read the letter on the radio, find it in the mission log, land on
// Bennu, convince its mind in the duel (one wrong answer on purpose) and see the mission done.

/** The answer key: the challenge on screen, as a player who knows the code would read it. */
const key = () => window.codeship.expedition.duel?.current ?? null;

export async function mision(j) {
  const p = j.page;
  await j.tap(".mode-btn", "Entrar en la nave de viaje");
  await p.waitForTimeout(800);
  const badge = (await j.texts(".radio-btn b"))[0] ?? "";
  j.check("la Radio avisa de cartas sin leer", Number(badge) > 0, badge);
  await j.tap(".radio-btn", "Radio");
  await p.waitForTimeout(400);
  const letters = await j.texts(".board .chore");
  const mission = letters.findIndex((l) => /Misión/.test(l));
  j.check("una carta trae una misión", mission >= 0, letters.join(" | ").slice(0, 160));
  await j.tap(`.board .chore >> nth=${Math.max(0, mission)}`, "carta con misión");
  await p.waitForTimeout(400);
  const letter = (await j.texts(".board .letter"))[0] ?? "";
  j.check("la carta dice qué hay que hacer y dónde", /Bennu/.test(letter), letter.slice(0, 120));
  await j.shot("carta");
  await j.tap(".board [data-radio]", "‹ Radio");
  await j.tap(".board [data-missions]", "Registro de misiones");
  await p.waitForTimeout(500);
  const head = (await j.texts(".mission-log .ml-head span"))[0] ?? "";
  j.check("el registro de misiones abre con 0 hechas", /^0\//.test(head), head);
  await j.shot("registro");
  await j.tap('.mission-log [data-act="close"]', "×");

  // Out to the lander and down on Bennu.
  await p.reload();
  await p.waitForFunction(() => window.codeship, null, { timeout: 120000 });
  await p.waitForTimeout(1500);
  await j.setup("posa el módulo sobre Bennu (aterrizar a mano lleva minutos)", () => {
    const c = window.codeship;
    const f = c.flight;
    const s = f.state;
    const P = s.position.constructor;
    const Q = s.orientation.constructor;
    c.docking.undock();
    const bennu = c.region.target;
    let y = 400;
    while (bennu.surfaceDistance(new P(0, y, 0), f.simTimeS) > 3.2) y -= 0.1;
    f._state = new s.constructor(new P(0, y, 0), new P(0, -0.07, 0), Q.IDENTITY, new P(0, 0, 0));
  });
  await p.waitForFunction(() => window.codeship.expedition.phase === "landed", null, { timeout: 180000 });
  await p.waitForTimeout(800);
  await j.setup("la fase de la sonda ya está hecha en Bennu (posar la sonda a mano lleva minutos)", () => {
    const ex = window.codeship.expedition;
    ex.rapport.of(ex.asteroid.data.id).succeed("sonda");
  });
  await p.waitForTimeout(800);
  const action = (await j.texts(".ctx-dock > .action:not(.nano-action)"))[0] ?? "";
  j.check("posado, aparece el botón para entrar en su mente, sobre el pulgar derecho", /mente|Convencer/.test(action), action);
  const box = await p.locator(".ctx-dock > .action:not(.nano-action)").boundingBox();
  const vp = p.viewportSize();
  j.check("la acción principal está en la mitad derecha y en la mitad de abajo", box && box.x + box.width / 2 > vp.width / 2 && box.y > vp.height / 2, box ? `${Math.round(box.x)},${Math.round(box.y)}` : "");
  await j.shot("posado");
  await j.tap(".ctx-dock > .action:not(.nano-action)", action || "acción");
  await p.locator(".duel:not(.hidden)").waitFor({ timeout: 30000 });
  await p.waitForTimeout(400);
  const fails0 = (await j.texts(".duel .stat.fails"))[0] ?? "";
  j.check("el duelo muestra Aciertos y Fallos escritos", /Fallos 0\//.test(fails0), fails0);

  await j.answer(key, false);
  const fails1 = (await j.texts(".duel .stat.fails"))[0] ?? "";
  const fb = (await j.texts(".duel .feedback"))[0] ?? "";
  j.check("una idea errónea suma un fallo y lo dice", /Fallos 1\//.test(fails1) && /✗/.test(fb), `${fails1} · ${fb}`);
  await j.shot("duelo-fallo");
  for (let n = 0; n < 12 && (await p.evaluate(() => window.codeship.expedition.phase)) === "duel"; n++) await j.answer(key, true);
  const result = (await j.texts(".duel .result"))[0] ?? "";
  j.check("la pantalla del duelo dice «Conseguido» y cuántos fallos hubo", /Conseguido/.test(result) && /1 fallo/.test(result), result);
  const extra = await j.texts(".ctx-dock > .action:not(.nano-action)");
  j.check("al terminar el duelo hay un solo botón para volver", extra.length === 0, extra.join(" / "));
  await j.shot("duelo-conseguido");
  await p.waitForTimeout(1000);
  await j.tap(".duel button.end", "Continuar");
  await p.waitForTimeout(800);

  // Stage 3: out in the suit and lying on Bennu.
  await j.tap(".eva-btn", "Salir de la nave");
  await p.locator(".duel:not(.hidden)").waitFor({ timeout: 30000 });
  for (let n = 0; n < 8 && (await p.evaluate(() => window.codeship.eva.phase)) === "preparando"; n++) await j.answer(() => window.codeship.eva._run?.current ?? null);
  await j.tapAt(p.locator(".duel button.end"));
  await p.waitForTimeout(2500);
  j.check("con el traje puesto, sale al exterior", await p.evaluate(() => window.codeship.eva.outside), await p.evaluate(() => window.codeship.eva.phase));
  await j.shot("fuera");
  await j.tap(".eva-lie", "Tumbarse sobre el asteroide");
  await p.locator(".duel:not(.hidden)").waitFor({ timeout: 30000 });
  for (let n = 0; n < 14 && (await p.evaluate(() => window.codeship.expedition.phase)) === "duel"; n++) await j.answer(key, true);
  const phase = await p.evaluate(() => window.codeship.expedition.phase);
  j.check("con las tres fases, Bennu queda persuadido", phase === "persuaded", phase);
  await p.waitForTimeout(1500);
  const toast = (await j.texts(".ml-toast"))[0] ?? "";
  j.check("un aviso dice que la misión de Nevaeh está cumplida", /cumplida/i.test(toast), toast);
  const covers = await p.evaluate(() => {
    const a = document.querySelector(".ml-toast.on")?.getBoundingClientRect();
    const b = document.querySelector(".duel .result")?.getBoundingClientRect();
    return !!a && !!b && a.bottom > b.top && a.top < b.bottom;
  });
  j.check("el aviso de la misión no tapa el resultado del duelo", !covers);
  await j.shot("mision-cumplida");
  await j.tapAt(p.locator(".duel button.end"));
  await p.waitForTimeout(600);
}
