// Nevaeh's first mission end to end: read the letter on the radio, find it in the mission log, land on
// Bennu, convince its mind in the duel (one wrong answer on purpose) and see the mission done.

/**
 * The answer key: what a player who knows the code would answer. Reading the right option is the
 * oracle, not an action: every action below is a tap on a visible control.
 */
const key = () => {
  const ex = window.codeship.expedition.duel?.current;
  if (!ex) return null;
  return ex.kind === "choice" ? { kind: "choice", index: ex.correct, options: ex.options } : { kind: "order", solution: ex.solution };
};

async function tapCentre(j, loc) {
  const b = await loc.boundingBox();
  await j.page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await j.page.waitForTimeout(450);
}

/** Answers the challenge on screen: right, or wrong on purpose. */
async function answer(j, right) {
  const p = j.page;
  const k = await p.evaluate(key);
  if (!k) return false;
  if (k.kind === "choice") {
    const i = right ? k.index : (k.index + 1) % k.options.length;
    await tapCentre(j, p.locator(".duel .option").nth(i));
    return true;
  }
  const order = right ? k.solution : [...k.solution].reverse();
  for (const id of order) await tapCentre(j, p.locator(`.duel .tray [data-id="${id}"]`));
  await tapCentre(j, p.locator(".duel .submit"));
  return true;
}

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
  const action = (await j.texts(".action"))[0] ?? "";
  j.check("posado, aparece el botón para entrar en su mente", action.length > 0, action);
  await j.shot("posado");
  await j.tap(".action", action || "acción");
  await p.locator(".duel:not(.hidden)").waitFor({ timeout: 30000 });
  await p.waitForTimeout(400);
  const fails0 = (await j.texts(".duel .stat.fails"))[0] ?? "";
  j.check("el duelo muestra Aciertos y Fallos escritos", /Fallos 0\//.test(fails0), fails0);

  await answer(j, false);
  const fails1 = (await j.texts(".duel .stat.fails"))[0] ?? "";
  const fb = (await j.texts(".duel .feedback"))[0] ?? "";
  j.check("una idea errónea suma un fallo y lo dice", /Fallos 1\//.test(fails1) && /✗/.test(fb), `${fails1} · ${fb}`);
  await j.shot("duelo-fallo");
  for (let n = 0; n < 12 && (await p.evaluate(() => window.codeship.expedition.phase)) === "duel"; n++) await answer(j, true);
  const phase = await p.evaluate(() => window.codeship.expedition.phase);
  j.check("con las ideas correctas Bennu queda persuadido", phase === "persuaded", phase);
  const result = (await j.texts(".duel .result"))[0] ?? "";
  j.check("la pantalla del duelo dice «Conseguido» y cuántos fallos hubo", /Conseguido/.test(result) && /1 fallo/.test(result), result);
  await j.shot("duelo-conseguido");
  await p.waitForTimeout(1000);
  const toast = (await j.texts(".ml-toast"))[0] ?? "";
  j.check("un aviso dice que la misión de Nevaeh está cumplida", /cumplida/i.test(toast), toast);
  const buttons = await j.texts(".duel button.end, .action");
  if (buttons.length > 1) j.problem(`Al terminar el duelo hay dos botones para lo mismo: ${buttons.join(" / ")}`);
  await j.tap(".duel button.end", "Continuar");
  await p.waitForTimeout(600);
  await j.shot("tras-el-duelo");
}
