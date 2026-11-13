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

  // Back in, through the hatch: 0 g, moved with the arrow pad (docs/design/ingravidez.md, «Fase C: flechas»).
  await j.setup("vuelve a acoplar en la nodriza", () => window.codeship.docking.dockNow(window.codeship.mothership));
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la nave de viaje");
  await p.waitForTimeout(1000);
  const arrows = await j.texts(".interior-ui .zg-pad .zg-arrow");
  j.check("al entrar, la escotilla deja en ingravidez con el mando de flechas (sin Manos ni Impulsarse)", arrows.length === 4 && (await j.texts(".zg-push, body.in-zero-g .walk-stick")).length === 0, arrows.join(" "));
  const padIdle = () => p.waitForFunction(() => !document.querySelector(".interior-ui .zg-pad")?.classList.contains("busy"), null, { timeout: 60000 });
  await padIdle();
  const before = (await j.texts(".interior-ui .ihud"))[0] ?? "";
  const shot0 = await p.screenshot();
  await j.tap(".interior-ui .zg-arriba", "▲ Saltar hacia delante");
  await p.waitForFunction(() => document.querySelector(".interior-ui .zg-pad")?.classList.contains("busy"), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(300);
  const during = await p.evaluate(() => {
    const pad = document.querySelector(".interior-ui .zg-pad");
    return { busy: pad?.classList.contains("busy"), off: [...(pad?.querySelectorAll(".zg-arrow") ?? [])].every((b) => b.getAttribute("aria-disabled") === "true") };
  });
  j.check("durante el salto las flechas se deshabilitan (y se ven apagadas)", during.busy && during.off, JSON.stringify(during));
  const mid = (await j.texts(".interior-ui .ihud"))[0] ?? "";
  await j.shot("flechas-salto");
  await padIdle();
  await p.waitForTimeout(300);
  const after = (await j.texts(".interior-ui .ihud"))[0] ?? "";
  j.check("una flecha la lleva al siguiente asidero: apunta, se impulsa, planea y se agarra (lo dice el HUD)", /Apunta|impulsa|Planeando|Agarrando/i.test(mid) && /Sujeta/.test(after), (mid.match(/Espina[^·]*·[^·]*·[^·]*/)?.[0] ?? mid.slice(-60)) + " → " + (after.match(/Sujeta[^·]*/)?.[0] ?? after.slice(-40)));
  j.check("al llegar las flechas se vuelven a habilitar", await p.evaluate(() => [...document.querySelectorAll(".interior-ui .zg-arrow")].some((b) => b.getAttribute("aria-disabled") === "false")));
  j.check("la vista cambia al saltar", differs(shot0, await p.screenshot()) && after !== before);
  await j.shot("ingravidez");

  // A chore picked in 0 g: she has to go down; it must say so, and life on board must not cover it (H24).
  await j.tap(".tasks-btn", "Tareas");
  await p.waitForTimeout(400);
  // The task list has every task: the ring's chores are under Comida, Plantas, Animales, Salud, Nave.
  await j.tap('.task-board [data-group="comida"]', "Comida");
  await j.tap(".task-board .tb-go", "Ir: primera tarea de comida");
  await p.waitForTimeout(500);
  const toast = (await j.texts(".interior-ui .toast"))[0] ?? "";
  j.check("al elegir una tarea en el eje avisa de que baja al anillo", /Bajas al anillo/.test(toast), toast);
  await j.setup("la vida a bordo habla justo después (un perro le ladra a un gato)", () => {
    const i = window.codeship.interior;
    const h = window.codeship.habitat;
    if (h.dogs[0] && h.cats[0]) i.onEvent({ type: "animal-hostile", actorId: h.dogs[0].id, targetId: h.cats[0].id, action: "ladrar" });
    i.say("Una máquina se ha averiado", "alerta");
  });
  await p.waitForTimeout(1200);
  const still = (await j.texts(".interior-ui .toast"))[0] ?? "";
  j.check("los avisos de ambiente y las alertas no pisan el aviso del jugador (H24)", /Bajas al anillo/.test(still), still);
  j.check("el aviso de ambiente no está a la vista desde el eje (no mira hacia donde sucede)", (await p.locator(".amb-note.on").count()) === 0);
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
  // On the ring, life on board shows where it happens, as a small HUD label, only when in view.
  const seen = await j.setup("un perro le ladra a un gato delante de ella", () => {
    const i = window.codeship.interior;
    const h = window.codeship.habitat;
    const dog = h.dogs[0] && i.dogs.get(h.dogs[0].id);
    if (!dog || !h.cats[0]) return false;
    // Two metres from the dog, looking at it through her own eyes.
    const d = dog.root.getWorldPosition(dog.root.position.clone());
    i.pos.set(d.x + (d.x > 0 ? -2 : 2), 0, d.z);
    i.thirdPerson = false;
    i.yaw = Math.atan2(-(d.x - i.pos.x), -(d.z - i.pos.z));
    i.pitch = -0.25;
    i.onEvent({ type: "animal-hostile", actorId: h.dogs[0].id, targetId: h.cats[0].id, action: "ladrar" });
    return true;
  });
  if (seen) {
    await p.waitForTimeout(800);
    const label = (await j.texts(".amb-note.on"))[0] ?? "";
    const toastNow = (await j.texts(".interior-ui .toast.on"))[0] ?? "";
    j.check("mirando hacia donde sucede, el aviso de ambiente flota allí con estilo HUD (no en el aviso del jugador)", /ladra/.test(label) && !/ladra/.test(toastNow), label);
    await j.shot("aviso-ambiente");
  }
  const g = (await j.texts(".interior-ui .ihud"))[0] ?? "";
  j.check("el HUD del anillo dice la gravedad", /g\b/.test(g), g.slice(-90));
}
