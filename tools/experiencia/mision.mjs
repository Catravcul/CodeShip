import { readStats } from "./cocina.mjs";
// Nevaeh's first mission end to end: read the letter on the radio, find it in the mission log, land on
// Bennu, convince its mind in the duel (one wrong answer on purpose) and see the mission done.

/** The answer key: the challenge on screen, as a player who knows the code would read it. */
const key = () => window.codeship.expedition.duel?.current ?? null;

export async function mision(j) {
  const p = j.page;
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la nave de viaje");
  await p.waitForTimeout(800);
  if (await p.evaluate(() => !!window.codeship.starship)) await radioOnTheBridge(j);
  else await radioOnTheRing(j);

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
  // During the landing the flight view shows no phase or trust: the mind is a console in the cabin (HAB-04).
  const flightHud = await j.texts(".rapport-chip, .ctx-dock > .action:not(.nano-action)");
  j.check("posado, la vista de vuelo no muestra fase ni confianza ni botón de la mente", flightHud.length === 0, flightHud.join(" / "));
  await j.shot("posado");
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "mente", "mente", "Entrar en su mente");
  await j.waitDuel(30000);
  await p.waitForTimeout(400);
  const fails0 = (await readStats(j))[1] ?? "";
  j.check("el duelo muestra Aciertos y Fallos", /Fallos 0\//.test(fails0), fails0);

  await j.answer(key, false);
  const fails1 = (await readStats(j))[1] ?? "";
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
  await j.useMachine("cabin", "escotilla", "salir-eva", "Ponerse el traje y salir");
  await j.waitDuel(30000);
  for (let n = 0; n < 8 && (await p.evaluate(() => window.codeship.eva.phase)) === "preparando"; n++) await j.answer(() => window.codeship.eva._run?.current ?? null);
  // Won, she steps out on her own after 0.6 s and the card closes itself (eva-mode.ts).
  await p.waitForFunction(() => document.body.classList.contains("in-eva"), null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1500);
  j.check("con el traje puesto, sale al exterior", await p.evaluate(() => window.codeship.eva.outside), await p.evaluate(() => window.codeship.eva.phase));
  await j.shot("fuera");
  await j.tap(".eva-lie", "Tumbarse sobre el asteroide");
  await j.waitDuel(30000);
  for (let n = 0; n < 14 && (await p.evaluate(() => window.codeship.expedition.phase)) === "duel"; n++) await j.answer(key, true);
  const phase = await p.evaluate(() => window.codeship.expedition.phase);
  j.check("con las tres fases, Bennu queda persuadido", phase === "persuaded", phase);
  await p.waitForTimeout(1500);
  // With a challenge open only the sheet shows (ux-acciones.md §7): the mission notice waits under it.
  const early = await p.evaluate(() => {
    const a = document.querySelector(".ml-toast.on")?.getBoundingClientRect();
    return !!a && a.width > 0 && a.height > 0;
  });
  j.check("el aviso de la misión no tapa el resultado del duelo (espera a que se cierre)", !early);
  await j.shot("mision-cumplida");
  await j.tapAt(p.locator(".duel button.end"));
  await p.waitForTimeout(1200);
  const toast = (await j.texts(".ml-toast"))[0] ?? "";
  j.check("al cerrar el duelo, un aviso dice que la misión de Nevaeh está cumplida", /cumplida/i.test(toast), toast);
  await j.shot("mision-aviso");
}

/** The ring ship (?ficcion): the ring's Radio button and its board. */
async function radioOnTheRing(j) {
  const p = j.page;
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
}

/** The Starship (real-only): the radio is the comms console of the flight deck (docs/design/nodriza-starship.md). */
async function radioOnTheBridge(j) {
  const p = j.page;
  await j.setup("sube a la escotilla de la cubierta de vuelo (los saltos por los asideros se juegan en «starship»)", () => window.codeship.starship.mode.placeAt("subir-cubierta-vuelo"));
  await p.waitForTimeout(800);
  await j.tap('.sts-card:not(.hidden) [data-act="subir"]', "Subir a la cubierta de vuelo");
  await p.waitForTimeout(1200);
  await j.useMachine("bridge", "comms", "abrir", "Usar la consola de radio");
  await p.waitForTimeout(800);
  const unread = await p.locator(".fd .fd-panel.max .fd-msg.new").count();
  j.check("la radio avisa de cartas sin leer", unread > 0, String(unread));
  const letters = await j.texts(".fd .fd-panel.max .fd-msg");
  const mission = letters.findIndex((l) => /misión/.test(l));
  j.check("una carta trae una misión", mission >= 0, letters.join(" | ").slice(0, 160));
  await j.tap(`.fd .fd-panel.max .fd-msg >> nth=${Math.max(0, mission)}`, "carta con misión");
  await p.waitForTimeout(400);
  const letter = (await j.texts(".fd .fd-panel.max .fd-letter"))[0] ?? "";
  j.check("la carta dice qué hay que hacer y dónde", /Bennu/.test(letter), letter.slice(0, 120));
  await j.shot("carta");
  await j.tap(".fd-panel.max .fd-back", "Volver al puente");
  await p.waitForTimeout(500);
  await j.useMachine("bridge", "comms", "misiones", "Registro de misiones");
  await p.waitForTimeout(500);
  const head = (await j.texts(".mission-log .ml-head span"))[0] ?? "";
  j.check("el registro de misiones abre con 0 hechas", /^0\//.test(head), head);
  await j.shot("registro");
  await j.tap('.mission-log [data-act="close"]', "×");
}
