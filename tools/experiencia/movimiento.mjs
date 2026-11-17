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

  // Crossing the spine with visible taps only (docs/design/ingravidez.md, «Fase D: la espina»): the
  // launcher's tag, its button, the hub's ladder (▲ held climbs), the elevator's tag.
  await j.setup("vuelve a la escotilla de atraque, sujeta a su barra", () => window.codeship.interior.zones.arriveAtHatch());
  await padIdle();
  const held = () => p.evaluate(() => {
    const zs = window.codeship.interior.zones;
    const m = zs.iva.motion;
    return { poi: zs.heldPoi()?.id ?? null, rail: m.kind === "sujeta" ? m.rail : null, kind: m.kind, y: zs.iva.position.y };
  });
  const arrive = (test) => p.waitForFunction(test, null, { timeout: 30000 }).then(() => true).catch(() => false);
  const where = (id) =>
    p.evaluate((i) => {
      const s = window.codeship.interior.zones.screenPoint(i);
      // Clear of the HUD by a finger's width: the HUD grows a line («días en ingravidez») after a minute and a bit.
      const free = [0, -28, 28].every((dy) => document.elementFromPoint(s.x, s.y + dy)?.tagName === "CANVAS");
      return { ...s, free };
    }, id);
  const tapThing = async (id, label) => {
    let pt = await where(id);
    // Off screen (or under a button): she turns the view toward it with «Mirar» (reglas.md §5.7), as a player would.
    const vp = p.viewportSize();
    for (let k = 0; k < 6 && !(pt.visible && pt.free); k++) {
      // Behind her: turn round (the stick held right longer); otherwise toward it.
      const dx = pt.behind ? 1 : Math.max(-1, Math.min(1, (pt.x - vp.width / 2) / (vp.width / 2)));
      const dy = pt.behind ? 0 : Math.max(-1, Math.min(1, (pt.y - vp.height / 2) / (vp.height / 2)));
      await j.stick(".look-stick", Math.round(dx * 50), Math.round(dy * 50), pt.behind ? 1400 : 500);
      await p.waitForTimeout(400);
      pt = await where(id);
    }
    const ok = pt.visible && pt.free;
    j.check(`«${label}» se ve en pantalla y se puede tocar`, ok, `${Math.round(pt.x)}, ${Math.round(pt.y)}`);
    if (ok) await p.touchscreen.tap(pt.x, pt.y);
    else await j.setup(`salta a «${label}» (no se ve)`, (i) => (i.startsWith("escalera") ? window.codeship.interior.zones.goToLadder(i, window.codeship.interior.zones.iva.position) : window.codeship.interior.zones.goToPoi(i)), id);
  };
  const t0 = Date.now();
  await tapThing("lanzador-proa", "Lanzador de proa");
  j.check("tocar el lanzador encadena saltos hasta su asidero", await arrive(() => window.codeship.interior.zones.heldPoi()?.id === "lanzador-proa"), JSON.stringify(await held()));
  await j.shot("espina-lanzador");
  const launch = (await j.texts(".zones-ui .zone-btn"))[0] ?? "";
  j.check("sujeta al lanzador, su botón dice adónde la lanza", /Lanzarse a la red de popa/.test(launch), launch);
  await j.tap(".zones-ui .zone-btn", launch || "Lanzarse");
  await p.waitForTimeout(400);
  const flying = (await j.texts(".interior-ui .ihud"))[0] ?? "";
  j.check("el lanzador la empuja y el HUD lo dice", /lanzador|Lanzada|red/i.test(flying), flying.match(/(El lanzador|Lanzada|La red)[^·]*/)?.[0] ?? flying.slice(-60));
  // Caught by the net, she brings the view back level with «Mirar» (she had looked down at the launcher).
  const pitch = await p.evaluate(() => window.codeship.interior.pitch);
  if (Math.abs(pitch) > 0.2) {
    await j.stick(".look-stick", 0, Math.sign(pitch) * 50, Math.min(1500, (Math.abs(pitch) / 1.4) * 1000));
    await p.waitForTimeout(300);
  }
  j.check("la red del otro extremo la recoge", await arrive(() => window.codeship.interior.zones.heldPoi()?.id === "lanzador-popa"), JSON.stringify(await held()));
  await tapThing("escalera-cubo", "Escalera del cubo");
  j.check("tocar la escalera la lleva a uno de sus peldaños", await arrive(() => window.codeship.interior.zones.iva.motion.rail === "escalera-cubo"), JSON.stringify(await held()));
  await padIdle();
  const y0 = (await held()).y;
  const up = await p.locator(".interior-ui .zg-arriba").boundingBox();
  await p.mouse.move(up.x + up.width / 2, up.y + up.height / 2);
  await p.mouse.down();
  await p.waitForTimeout(900);
  const climbing = (await j.texts(".interior-ui .ihud"))[0] ?? "";
  await j.shot("espina-escalera");
  await p.waitForTimeout(700);
  await p.mouse.up();
  const y1 = (await held()).y;
  j.check("con ▲ pulsada trepa por la escalera sin parar (lo dice el HUD)", /trepando/.test(climbing) && Math.abs(y1 - y0) > 0.4, `${(y1 - y0).toFixed(2)} m · ${climbing.match(/Sujeta a la escalera[^·]*/)?.[0] ?? ""}`);

  // A chore picked in 0 g: she has to go down; it must say so, and life on board must not cover it (H24).
  await j.tap(".tasks-btn", "Tareas");
  await p.waitForTimeout(400);
  // The task list has every task: the ring's chores are under Comida, Plantas, Animales, Salud, Nave.
  await j.taskSettings({ group: "comida" });
  await j.tap(".task-board .tb-go", "Ir: primera tarea de comida");
  await p.waitForTimeout(500);
  const toast = (await j.texts(".interior-ui .toast"))[0] ?? "";
  j.check("al elegir una tarea en el eje avisa de que baja al anillo", /Bajas al anillo/.test(toast), toast);
  await j.setup("justo después llega una alerta (en una partida nueva no hay animales que hablen: docs/design/catalogo-especies.md)", () => {
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
  // The task's «Ir» chains the hops to the elevator by itself, and down she goes.
  j.check("«Ir» la lleva saltando hasta el ascensor y baja", await arrive(() => window.codeship.interior.zones.zone !== "eje"), JSON.stringify(await held()));
  const crossS = (Date.now() - t0) / 1000;
  j.check("cruzar la espina de la escotilla al ascensor con toques (lanzador, escalera, «Ir») lleva menos de 60 s con la CPU ×4", crossS < 60, `${crossS.toFixed(1)} s de reloj, con las pausas de las capturas`);
  await j.shot("espina-ascensor");

  // Walking on the ring with the left stick.
  await j.setup("la llevamos al anillo (sin esperar el ascensor)", () => {
    const i = window.codeship.interior;
    window.codeship.journey?.stop();
    i.walkTo = null;
    i.zones.zone = "anillo";
    i.zones.autoDown = false;
  });
  await p.waitForTimeout(800);
  const ring0 = await p.screenshot();
  // No gravity areas for now (core/realism.ts AREA_MOTION, reglas.md §2.6): the ring's only stick moves the camera.
  const sticks = await j.texts(".walk-stick, .look-stick");
  j.check("en el anillo solo hay el mando Mirar (sin gravedad, el joystick mueve la cámara)", sticks.length === 1, sticks.join(" / "));
  // Scale (docs/design/escala.md): the ring is drawn 1,5 times bigger on the plan; she stays at real size.
  const plan = await p.evaluate(() => ({ k: window.codeship.interior.camera.planScale, rig: window.codeship.interior.avatarRig.scale.x }));
  j.check("el anillo se dibuja a escala 1,5 en planta y Doménica a tamaño real", plan.k === 1.5 && Math.abs(plan.rig * plan.k - 1) < 1e-6, JSON.stringify(plan));
  await j.stick(".look-stick", 60, 0, 1200);
  j.check("al mover Mirar la vista gira", differs(ring0, await p.screenshot()));
  await j.shot("anillo");
  // On the ring, life on board shows where it happens, as a small HUD label, only when in view.
  // Deterministic (it passed about half the time when the dog wandered off): the dog stands still on the
  // open farm deck, and she looks at it from 2 m (3 m as drawn), with no other life aboard to cover it.
  const seen = await j.setup("si hay perro y gato a bordo (una partida nueva no tiene): el perro, quieto delante de ella, le ladra al gato", () => {
    const i = window.codeship.interior;
    const h = window.codeship.habitat;
    const dog = h.dogs[0] && i.dogs.get(h.dogs[0].id);
    if (!dog || !h.cats[0]) return false;
    const spot = { x: 1.5, z: 9 + 4.5 };
    dog.follow = null;
    dog.setBounds({ minX: spot.x, maxX: spot.x, minZ: spot.z, maxZ: spot.z });
    dog.root.position.set(spot.x, 0, spot.z);
    i.walkTo = null;
    i.pos.set(spot.x, 0, spot.z - 2);
    i.thirdPerson = false;
    i.yaw = Math.PI;
    i.pitch = -0.3;
    i.ambient.clear?.();
    return true;
  });
  if (seen) {
    await p.waitForTimeout(500);
    await j.setup("ladra", () => {
      const h = window.codeship.habitat;
      window.codeship.interior.onEvent({ type: "animal-hostile", actorId: h.dogs[0].id, targetId: h.cats[0].id, action: "ladrar" });
    });
    await p.waitForTimeout(800);
    const label = (await j.texts(".amb-note.on")).join(" · ");
    const toastNow = (await j.texts(".interior-ui .toast.on"))[0] ?? "";
    j.check("mirando hacia donde sucede, el aviso de ambiente flota allí con estilo HUD (no en el aviso del jugador)", /ladra/.test(label) && !/ladra/.test(toastNow), label);
    await j.shot("aviso-ambiente");
  }
  const g = (await j.texts(".interior-ui .ihud"))[0] ?? "";
  j.check("el HUD del anillo dice la gravedad", /g\b/.test(g), g.slice(-90));

  // HAB-08 on the ring: the exercise corner, the bunk and the yoga mat, each its own button, one at a time.
  const shown = [];
  for (const id of ["ejercicio", "camarote", "yoga"]) {
    await j.setup(`se pone donde se usa «${id}»`, (s) => {
      const i = window.codeship.interior;
      const st = window.codeship.ringStations?.find((x) => x.id === s) ?? null;
      const stand = st?.stand ?? { ejercicio: { x: 1, z: 4.4 }, camarote: { x: -1, z: 5.4 }, yoga: { x: 1, z: 7.6 } }[s];
      i.walkTo = null;
      i.pos.set(stand.x, 0, stand.z);
    }, id);
    // Under load a frame can take a while: wait for the station's button (at most 5 s), then a beat for any other.
    await p.waitForFunction(() => [...document.querySelectorAll(".interior-ui .station-btn")].some((b) => !b.classList.contains("hidden")), null, { timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
      const vis = [...document.querySelectorAll(".interior-ui .station-btn, .interior-ui .mat-btn")].filter((b) => !b.classList.contains("hidden"));
      const boxes = vis.map((b) => b.getBoundingClientRect());
      const overlap = boxes.some((a, i) => boxes.some((b, k) => k > i && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom));
      return { texts: vis.filter((b) => b.classList.contains("station-btn")).map((b) => b.textContent), overlap };
    });
    shown.push(`${id}: ${r.texts.join(" | ")}`);
    const want = { ejercicio: /ejercicio/i, camarote: /Camarote/, yoga: /yoga/i }[id];
    j.check(`junto a «${id}» se ve un solo botón de puesto, el suyo, y nada lo tapa`, r.texts.length === 1 && want.test(r.texts[0]) && !r.overlap, r.texts.join(" | "));
    await j.shot(`anillo-${id}`);
  }
}
