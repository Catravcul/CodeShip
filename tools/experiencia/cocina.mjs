// Cooking on board: peanut butter in the mill step by step, with a wrong tap repeated three times
// (the designer's report), then a recipe in the HUD view lost on purpose, with a quick extra tap.

/** What the player reads in the recipe (src/modules/kitchen/data/processes.ts): the steps in order. */
const CREMA = ["tuesta los cacahuetes a 160 °C", "afloja la piel con aire a 138 °C", "quítales la piel", "muélelos en grueso", "muélelos en fino", "añade sal", "envasa la crema"];
const TOSTADOS = ["saca los cacahuetes de la despensa", "pélalos", "extiéndelos en la bandeja", "tuéstalos a 160 °C", "remueve a media cocción", "déjalos enfriar", "sirve con una pizca de sal"];
const VALUE = /a (\d+) °C$/;
/** Scrambled eggs (the designer's report) and what each right step shows in 3D (src/modules/kitchen/domain/kitchen-visuals.ts). */
const HUEVOS = ["ve a la nevera", "toma los huevos", "calienta la plancha", "revuelve los huevos", "cocina hasta 71 °C", "especia con sal y pimienta", "emplata"];
const SE_VE = ["tomar", "cascar", "calentar", "remover", "calentar", "sazonar", "emplatar"];

/** The step acted out in 3D (`data-paso` on the habitat's UI, src/interior.ts): waits until it shows. */
const seesStep = (j, action, timeout = 15000) =>
  j.page
    .waitForFunction((a) => document.querySelector(".interior-ui")?.dataset.paso === a && window.codeship.interior.steps.root.visible, action, { timeout })
    .then(() => true)
    .catch(() => false);
const stepTag = (j) => j.page.evaluate(() => `${document.querySelector(".interior-ui")?.dataset.paso} (${document.querySelector(".interior-ui")?.dataset.pasos} pasos)`);

/** Hits and failures as the player reads them: the HUD's written readouts, or the panel's meters (their label). */
export const readStats = async (j) => {
  const hud = [(await j.texts(".duel .stat.hits"))[0], (await j.texts(".duel .stat.fails"))[0]];
  if (hud[0] || hud[1]) return hud;
  return j.page.evaluate(() => [".duel .meter.persuasion", ".duel .meter.patience"].map((s) => document.querySelector(s)?.getAttribute("aria-label") ?? ""));
};

const stats = async (j) => {
  const [hits = "", fails = ""] = await readStats(j);
  return { hits, fails, q: (await j.texts(".duel .question"))[0] ?? "", fb: (await j.texts(".duel .feedback"))[0] ?? "" };
};

/** Taps the option whose text is `text` (exactly what a player reads on the button). */
async function choose(j, text) {
  const opts = await j.texts(".duel .option");
  const i = opts.findIndex((o) => o.replace(/^✗\s*/, "") === text);
  if (i < 0) return j.check(`la opción «${text}» está en pantalla`, false, opts.join(" | "));
  // A finger on the button's centre (also on an option marked as failed: a player can still tap it).
  await j.tapAt(j.page.locator(".duel .option").nth(i));
  return true;
}

const answerFor = (step) => (VALUE.test(step) ? `${VALUE.exec(step)[1]} °C` : step);

export async function cocina(j) {
  const p = j.page;
  await j.tap(".mode-btn", "Entrar en la nave de viaje");
  await p.waitForTimeout(800);
  j.check("al entrar en la nave se ven Tareas y Radio", (await j.texts(".tasks-btn")).length === 1 && (await j.texts(".radio-btn")).length === 1);
  await j.setup("la llevamos al anillo (bajar del eje por el radio lleva un minuto; se juega en «movimiento»)", () => {
    const z = window.codeship.interior.zones;
    z.zone = "anillo";
    z.autoDown = false;
  });
  await j.resetPerf();

  // Pasos visibles (VID-09): every right step of scrambled eggs is acted out at the galley.
  await j.tap(".tasks-btn", "Tareas");
  await p.waitForTimeout(400);
  await j.tap('.board .chore:has-text("Cocinar Huevos revueltos")', "Cocinar Huevos revueltos");
  await j.waitDuel(120000);
  j.check("al abrir la receta, Doménica está en la cocina (la escena se ve sobre la hoja del reto)", await p.evaluate(() => window.codeship.interior.steps.framing && window.codeship.interior.avatarRig.visible));
  for (const [i, step] of HUEVOS.entries()) {
    await choose(j, answerFor(step));
    const seen = await seesStep(j, SE_VE[i]);
    j.check(`huevos, paso ${i + 1} bien («${step}»): se ve «${SE_VE[i]}» en la cocina`, seen, await stepTag(j));
    if (i === 0) await j.shot("huevos-nevera");
    if (i === 1) await j.shot("huevos-cascar");
    if (i === 3) await j.shot("huevos-remover");
  }
  const eggs = (await j.texts(".duel .result"))[0] ?? "";
  j.check("los huevos revueltos quedan «Conseguido» 7/7", /Conseguido/.test(eggs) && /7\/7/.test(eggs), eggs);
  await j.tap(".duel button.end", "Continuar");
  await p.waitForTimeout(600);
  j.check("al cerrar la receta, los utensilios se recogen", await p.evaluate(() => !window.codeship.interior.steps.root.visible && !document.querySelector(".interior-ui").dataset.paso));

  await j.tap(".tasks-btn", "Tareas");
  await p.waitForTimeout(400);
  const list = await j.texts(".board .chore b");
  j.check("la lista de tareas ofrece «Hacer crema de cacahuete»", list.includes("Hacer crema de cacahuete"), `${list.length} tareas`);
  await j.shot("tareas");
  await j.tap('.board .chore:has-text("Hacer crema de cacahuete")', "Hacer crema de cacahuete");
  await j.waitDuel(120000);
  await p.waitForTimeout(400);
  let s = await stats(j);
  j.check("el reto empieza con Aciertos 0/7 y Fallos 0/3 escritos", /Aciertos 0\/7/.test(s.hits) && /Fallos 0\/3/.test(s.fails), `${s.hits} · ${s.fails}`);
  j.check("la primera pregunta es el paso 1 de 7", /Paso 1 de 7/.test(s.q), s.q);
  await j.shot("crema-inicio");

  // The designer's report: the same wrong option, three times.
  const wrong = (await j.texts(".duel .option")).find((o) => o !== "160 °C");
  for (let k = 1; k <= 3; k++) {
    await choose(j, wrong);
    s = await stats(j);
    const marked = await p.locator(".duel .option.wrong").count();
    j.check(`toque ${k} sobre «${wrong}» (errónea): queda Fallos 1/3`, /Fallos 1\/3/.test(s.fails), s.fails);
    j.check(`toque ${k}: la opción sigue marcada como fallida (✗)`, marked === 1 && (await j.texts(".duel .option.wrong"))[0]?.startsWith("✗"));
    j.check(`toque ${k}: el paso no avanza ni se termina el reto`, /Aciertos 0\/7/.test(s.hits) && /Paso 1 de 7/.test(s.q) && (await j.texts(".duel .result")).length === 0, s.q);
    if (k > 1) j.check(`toque ${k}: el aviso dice que esa ya falló`, /ya falló/.test(s.fb), s.fb);
    await j.shot(`crema-toque-${k}`);
  }
  // Panel view (unchanged since its creation): the patience meter loses one lit cell.
  const lit = await j.page.evaluate(() => document.querySelectorAll(".duel .meter.patience .cell.on").length);
  j.check("en vista panel, el medidor de intentos apaga una casilla (2 de 3)", lit === 2, String(lit));

  const CREMA_SE_VE = ["hornear", "hornear", "cortar", "moler", "moler", "sazonar", "emplatar"];
  for (const [i, step] of CREMA.entries()) {
    await choose(j, answerFor(step));
    if (i === 0 || i === 3) j.check(`crema, paso ${i + 1} bien: se ve «${CREMA_SE_VE[i]}» en el molino`, await seesStep(j, CREMA_SE_VE[i]), await stepTag(j));
    if (i === 3) await j.shot("crema-moler");
    s = await stats(j);
    if (i < CREMA.length - 1) j.check(`paso ${i + 1} bien: Aciertos ${i + 1}/7`, s.hits.includes(`Aciertos ${i + 1}/7`), s.hits);
    if (i === 0) {
      const on = await j.page.evaluate(() => document.querySelectorAll(".duel .meter.persuasion .cell.on").length);
      j.check("en vista panel, el medidor de pasos enciende una casilla tras el primer acierto", on === 1, String(on));
      await j.shot("crema-acierto");
    }
  }
  const result = (await j.texts(".duel .result"))[0] ?? "";
  j.check("al terminar, la pantalla dice «Conseguido» con 7/7 y 1 fallo", /Conseguido/.test(result) && /7\/7/.test(result) && /1 fallo/.test(result), result);
  await j.shot("crema-conseguido");
  await j.tap('.duel button.end', "Continuar");
  await p.waitForTimeout(600);
  if (j.opts.mobile !== false && (await j.texts(".ihud .more")).length === 0) await j.tap(".ihud", "estado de Doménica (despliega la despensa)");
  const larder = (await j.texts(".ihud .more")).join(" ");
  j.check("la despensa (al tocar el estado) ya muestra crema de cacahuete", /crema de cacahuete/.test(larder), larder.slice(0, 160));
  await j.shot("despensa");
  await j.tap(".ihud", "estado de Doménica (pliega)");

  // Pasos visibles en otras áreas (VID-10): a harvest «paso a paso» acts out each right pick at once; the coop door, a program.
  await p.evaluate(() => localStorage.setItem("codeship.retos-ordenar", "pasos"));
  await j.tap(".tasks-btn", "Tareas");
  await p.waitForTimeout(400);
  await j.tap('.board .chore:has-text("Cosechar Rábano")', "Cosechar Rábano");
  await j.waitDuel(120000);
  const harvest = await p.evaluate(() => window.codeship.interior.session.run.current);
  await j.tapAt(p.locator(`.duel .tray [data-id="${harvest.solution[0]}"]`));
  j.check("cosechar paso a paso: el primer bloque bien ya se ve («revisar») sin terminar el orden", await seesStep(j, "revisar"), await stepTag(j));
  for (const id of harvest.solution.slice(1)) await j.tapAt(p.locator(`.duel .tray [data-id="${id}"]`));
  j.check("cosechar: el último bloque se ve («cosechar», cesta junto al rábano)", await seesStep(j, "cosechar"), await stepTag(j));
  await j.shot("cosechar");
  await j.tap('.duel [data-act="close"]', "Cerrar");
  await p.waitForTimeout(400);
  await p.evaluate(() => localStorage.removeItem("codeship.retos-ordenar"));
  await j.tap(".tasks-btn", "Tareas");
  await p.waitForTimeout(400);
  await j.tap('.board .chore:has-text("Programar la puerta del gallinero")', "Programar la puerta del gallinero");
  await j.waitDuel(120000);
  await j.answer(() => window.codeship.interior.session?.run.current);
  j.check("gallinero: el programa bien enviado se ve («programar», pantalla holográfica)", await seesStep(j, "programar"), await stepTag(j));
  await j.shot("gallinero");
  await j.tap('.duel [data-act="close"]', "Cerrar");
  await p.waitForTimeout(400);

  // HUD view, a recipe lost on purpose: three different wrong answers.
  await j.tap(".tasks-btn", "Tareas");
  await p.waitForTimeout(400);
  await j.tap('.board .chore:has-text("Cocinar Cacahuetes tostados")', "Cocinar Cacahuetes tostados");
  await j.waitDuel(120000);
  await j.tap('.duel [data-act="ui"]', "Vista HUD");
  await p.waitForTimeout(400);
  j.check("el botón cambia a la vista HUD", await p.evaluate(() => document.body.classList.contains("ui-compact")));
  await j.shot("hud-inicio");
  const contrast = await p.evaluate(() => {
    const el = document.querySelector(".duel .duel-stats");
    const bg = getComputedStyle(el).backgroundColor;
    return bg;
  });
  j.check("en HUD los indicadores llevan placa oscura (contraste AA sobre la escena)", /rgba\(2, 10, 18, 0\.8/.test(contrast), contrast);
  // Fail every wrong option of each step, then take the right one, until the recipe is lost.
  let lost = false;
  let first = true;
  for (const step of TOSTADOS) {
    for (const o of (await j.texts(".duel .option:not(.wrong)")).filter((x) => x !== answerFor(step))) {
      if (/Fallos 2\/3/.test((await stats(j)).fails)) {
        // The losing tap, as a nervous double tap: the second lands where the options were.
        const i = (await j.texts(".duel .option")).findIndex((x) => x === o);
        const b = await p.locator(".duel .option").nth(i).boundingBox();
        await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
        await p.waitForTimeout(150);
        await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
        await p.waitForTimeout(150);
        j.check("un doble toque al perder no cierra el resultado sin verlo", (await j.texts(".duel .result")).length === 1);
        lost = true;
        break;
      }
      await choose(j, o);
      s = await stats(j);
      if (first) {
        j.check("en HUD, un fallo queda escrito: Fallos 1/3 en ámbar", /Fallos 1\/3/.test(s.fails) && (await j.color(".duel .stat.fails")) === "rgb(255, 179, 71)", s.fails);
        await j.shot("hud-fallo");
        first = false;
      }
      lost = (await j.texts(".duel .result")).length > 0;
      if (lost) break;
    }
    if (lost) break;
    await choose(j, answerFor(step));
  }
  const r2 = (await j.texts(".duel .result"))[0] ?? "";
  j.check("con todos los fallos, la pantalla dice «Reto perdido» (no parece terminado con éxito)", /Reto perdido/.test(r2), r2);
  const red = await j.color(".duel .stat.fails");
  j.check("Fallos al tope se pinta en rojo", red === "rgb(255, 122, 107)", red);
  await j.shot("hud-perdido");
  await p.waitForTimeout(1000);
  await j.tap(".duel button.end", "Cerrar");
  await p.waitForTimeout(400);
  j.check("Cerrar vuelve a la nave", (await j.texts(".duel")).length === 0 && (await j.texts(".tasks-btn")).length === 1);
  await j.tap(".tasks-btn", "Tareas");
  await p.waitForTimeout(300);
  j.check("tras perder, la receta sigue en la lista para reintentarla (no se gastó nada)", (await j.texts(".board .chore b")).includes("Cocinar Cacahuetes tostados"));
  await j.tap(".board [data-close]", "✕");
  await p.evaluate(() => localStorage.removeItem("codeship.retos-ui"));
}
