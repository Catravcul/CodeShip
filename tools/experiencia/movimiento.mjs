// Moving around: the lander's thrusters in the cockpit, floating in 0 g at the spine, walking on the ring.

const differs = (a, b) => {
  if (a.length !== b.length) return true;
  let diff = 0;
  for (let i = 0; i < a.length; i += 97) if (a[i] !== b[i]) diff++;
  return diff > 20;
};

export async function movimiento(j) {
  const p = j.page;
  // Cockpit: undocked, fire the forward RCS with W and watch the speed readout.
  await j.setup("desacopla el módulo de la nodriza", () => window.codeship.docking.undock());
  const hud0 = (await j.texts(".hud"))[0] ?? "";
  j.check("la cabina muestra la velocidad en m/s", /m\/s/.test(hud0), hud0.slice(0, 80));
  await p.keyboard.down("KeyW");
  await p.waitForTimeout(2500);
  const firing = (await j.texts(".hud .thrust"))[0] ?? "";
  await j.shot("cabina-rcs");
  await p.keyboard.up("KeyW");
  j.check("con W encendido, el HUD dice qué propulsor empuja", firing.startsWith("▶"), firing);
  const speedLine = (await j.texts(".hud .row")).find((r) => /reposo relativo|acercándose|alejándose/.test(r)) ?? "";
  j.check("la velocidad relativa ya no es «en reposo»", !/en reposo relativo/.test(speedLine), speedLine);
  const pads = (await j.texts(".touch-left, .touch-right, .vstick")).length;
  if (!pads) j.problem("En móvil la cabina no muestra mandos táctiles de traslación: solo se pilota con teclado");

  // Back in, through the hatch: 0 g.
  await j.setup("vuelve a acoplar en la nodriza", () => window.codeship.docking.dockNow(window.codeship.mothership));
  await j.tap(".mode-btn", "Entrar en la nave de viaje");
  await p.waitForTimeout(1000);
  j.check("al entrar, la escotilla deja en ingravidez con el botón Impulsarse", (await j.texts(".zg-push")).length === 1);
  const before = (await j.texts(".interior-ui .ihud"))[0] ?? "";
  const shot0 = await p.screenshot();
  await j.tapAt(p.locator(".zg-push:visible"));
  await p.waitForTimeout(3000);
  const after = (await j.texts(".interior-ui .ihud"))[0] ?? "";
  j.check("un toque en Impulsarse la hace planear (lo dice el HUD)", /Planeando|Impuls|sujeta|Agarrada/i.test(after) && after !== before, after.match(/Espina[^·]*·[^·]*·[^·]*/)?.[0] ?? after.slice(-80));
  j.check("la vista cambia al impulsarse", differs(shot0, await p.screenshot()));
  await j.shot("ingravidez");

  // A chore picked in 0 g: she has to go down; it must say so.
  await j.tap(".tasks-btn", "Tareas");
  await p.waitForTimeout(400);
  // Other life on board may speak right after (the dog, the kids): keep every line the toast showed.
  await p.evaluate(() => {
    const el = document.querySelector(".interior-ui .toast");
    window.__toasts = [];
    if (el) new MutationObserver(() => window.__toasts.push(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true });
  });
  await j.tap(".board .chore", "primera tarea");
  await p.waitForTimeout(500);
  const toast = (await p.evaluate(() => window.__toasts)).find((t) => /Bajas al anillo/.test(t)) ?? (await j.texts(".interior-ui .toast"))[0] ?? "";
  j.check("al elegir una tarea en el eje avisa de que baja al anillo", /Bajas al anillo/.test(toast), toast);
  await j.shot("tarea-desde-el-eje");

  // Walking on the ring with the left stick.
  await j.setup("la llevamos al anillo (sin esperar el ascensor)", () => {
    const i = window.codeship.interior;
    i.walkTo = null;
    i.zones.zone = "anillo";
    i.zones.autoDown = false;
  });
  await p.waitForTimeout(800);
  const ring0 = await p.screenshot();
  const sticks = await j.texts(".walk-stick, .look-stick");
  j.check("en el anillo hay dos mandos: Caminar y Mirar", sticks.length >= 2, sticks.join(" / "));
  await j.stick(".walk-stick", 0, -50, 2500);
  j.check("al arrastrar Caminar hacia arriba la vista avanza", differs(ring0, await p.screenshot()));
  await j.stick(".look-stick", 60, 0, 1200);
  await j.shot("anillo");
  const g = (await j.texts(".interior-ui .ihud"))[0] ?? "";
  j.check("el HUD del anillo dice la gravedad", /g\b/.test(g), g.slice(-90));
}
