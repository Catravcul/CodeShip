// Cooking on board: peanut butter in the mill step by step, with a wrong tap repeated three times
// (the designer's report), then a recipe in the HUD view lost on purpose, with a quick extra tap.

/** What the player reads in the recipe (src/modules/kitchen/data/processes.ts): the steps in order. */
const CREMA = ["tuesta los cacahuetes a 160 °C", "afloja la piel con aire a 138 °C", "quítales la piel", "muélelos en grueso", "muélelos en fino", "añade sal", "envasa la crema"];
const VALUE = /a (\d+) °C$/;

const stats = async (j) => {
  const [hits = "", fails = ""] = [(await j.texts(".duel .stat.hits"))[0], (await j.texts(".duel .stat.fails"))[0]];
  return { hits, fails, q: (await j.texts(".duel .question"))[0] ?? "", fb: (await j.texts(".duel .feedback"))[0] ?? "" };
};

/** Taps the option whose text is `text` (exactly what a player reads on the button). */
async function choose(j, text) {
  const opts = await j.texts(".duel .option");
  const i = opts.findIndex((o) => o.replace(/^✗\s*/, "") === text);
  if (i < 0) return j.check(`la opción «${text}» está en pantalla`, false, opts.join(" | "));
  // A finger on the button's centre (also on an option marked as failed: a player can still tap it).
  const b = await j.page.locator(".duel .option").nth(i).boundingBox();
  await j.page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await j.page.waitForTimeout(450);
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

  await j.tap(".tasks-btn", "Tareas");
  await p.waitForTimeout(400);
  const list = await j.texts(".board .chore b");
  j.check("la lista de tareas ofrece «Hacer crema de cacahuete»", list.includes("Hacer crema de cacahuete"), `${list.length} tareas`);
  await j.shot("tareas");
  await j.tap('.board .chore:has-text("Hacer crema de cacahuete")', "Hacer crema de cacahuete");
  await p.locator(".duel:not(.hidden)").waitFor({ timeout: 120000 });
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
  const amber = await j.color(".duel .stat.fails");
  j.check("Fallos 1/3 se pinta en ámbar (como la velocidad en aviso)", amber === "rgb(255, 179, 71)", amber);

  for (const [i, step] of CREMA.entries()) {
    await choose(j, answerFor(step));
    s = await stats(j);
    if (i < CREMA.length - 1) j.check(`paso ${i + 1} bien: Aciertos ${i + 1}/7`, s.hits.includes(`Aciertos ${i + 1}/7`), s.hits);
    if (i === 0) {
      const green = await j.color(".duel .stat.hits");
      j.check("Aciertos se pinta en verde tras el primer acierto", green === "rgb(125, 255, 176)", green);
      await j.shot("crema-acierto");
    }
  }
  const result = (await j.texts(".duel .result"))[0] ?? "";
  j.check("al terminar, la pantalla dice «Conseguido» con 7/7 y 1 fallo", /Conseguido/.test(result) && /7\/7/.test(result) && /1 fallo/.test(result), result);
  await j.shot("crema-conseguido");
  await j.tap('.duel button.end', "Continuar");
  await p.waitForTimeout(600);
  const hud = (await j.texts(".interior-ui .ihud"))[0] ?? "";
  j.check("la despensa ya muestra crema de cacahuete", /crema de cacahuete/.test(hud), hud.slice(0, 160));

  // HUD view, a recipe lost on purpose: three different wrong answers.
  await j.tap(".tasks-btn", "Tareas");
  await p.waitForTimeout(400);
  await j.tap('.board .chore:has-text("Cocinar Cacahuetes tostados")', "Cocinar Cacahuetes tostados");
  await p.locator(".duel:not(.hidden)").waitFor({ timeout: 120000 });
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
  // Step 1 asks which step comes first: tap a wrong one, then another wrong one.
  let lost = false;
  for (let k = 0; k < 6 && !lost; k++) {
    const opts = (await j.texts(".duel .option:not(.wrong)")).filter((o) => o !== "saca los cacahuetes de la despensa");
    if (!opts.length) break;
    await choose(j, opts[0]);
    s = await stats(j);
    if (k === 0) {
      j.check("en HUD, un fallo queda escrito: Fallos 1/2", /Fallos 1\/2/.test(s.fails), s.fails);
      await j.shot("hud-fallo");
    }
    lost = (await j.texts(".duel .result")).length > 0;
  }
  const r2 = (await j.texts(".duel .result"))[0] ?? "";
  j.check("con todos los fallos, la pantalla dice «Reto perdido» (no parece terminado con éxito)", /Reto perdido/.test(r2), r2);
  const red = await j.color(".duel .stat.fails");
  j.check("Fallos al tope se pinta en rojo", red === "rgb(255, 122, 107)", red);
  // A quick extra tap where the options were must not close it.
  const box = await p.locator(".duel button.end").boundingBox();
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForTimeout(100);
  j.check("un toque inmediato tras perder no cierra el resultado sin verlo", (await j.texts(".duel .result")).length === 1);
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
