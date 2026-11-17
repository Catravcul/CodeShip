// The real crew equipment (docs/design/equipos.md), played on an iPhone 13 with taps on what a player sees:
// the ISS's T2, CEVIS and ARED on Starship («licencia: equivalente de la ISS») and on the station, each with its
// own movement on the skeleton and the machine moving with her; the mat's settings in both views at the LM, on
// Starship and on the station, with her sitting ON the mat, and the build label; JAXA's AQH with its medaka and
// snails and the cleaning acted out at it, each vehicle with its own colony and the transfer between them as a
// chore; the storm shelter drill (Starship's water wall, the station's Harmony crew quarter), washing at the WHC
// and the CHeCS medical kit as code challenges acted out step by step; and the parity of the facilities (reglas.md
// §6.0): every one in both vehicles works in both, with its animation. Captures: docs/screenshots/equipos-*-movil.png.
import { mkdirSync } from "node:fs";

/** File names in plain ASCII («estación» → «estacion»). */
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");

async function capture(j, label, title) {
  label = slug(label);
  await j.page.waitForTimeout(800);
  mkdirSync("docs/screenshots", { recursive: true });
  await j.page.screenshot({ path: `docs/screenshots/equipos-${label}-movil.png`, timeout: 120000 });
  await j.shot(label);
  const over = await j.overlaps();
  j.check(`${title}: ningún botón se solapa con otro`, over.length === 0, over.slice(0, 4).join("; "));
}

async function close(j) {
  const p = j.page;
  await p.waitForTimeout(600);
  if (await p.locator(".duel:not(.hidden) button.end").count()) await j.tap(".duel:not(.hidden) button.end", "Continuar");
  else if (await p.locator('.duel:not(.hidden) [data-act="close"]').count()) await j.tap('.duel:not(.hidden) [data-act="close"]', "× del reto");
  await p.waitForFunction(() => [...document.querySelectorAll(".duel")].every((e) => e.classList.contains("hidden")), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(500);
}

/** The settings at a mat, in the panel view and in the HUD view, with the build label. */
async function matSettings(j, where, tapIt, seated, arg = null) {
  const p = j.page;
  await tapIt();
  await p.waitForTimeout(800);
  for (const view of ["panel", "HUD"]) {
    const hud = await p.evaluate(() => !!document.querySelector(".settings-sheet")?.classList.contains("set-hud"));
    if (hud !== (view === "HUD")) await j.tap('.settings-sheet [data-key="challengeView"]', `Vista ${view} (ajustes)`);
    await p.waitForTimeout(600);
    const shown = await p.evaluate(() => {
      const s = document.querySelector(".settings-sheet");
      const r = s?.getBoundingClientRect();
      return !!s && !s.classList.contains("hidden") && getComputedStyle(s).display !== "none" && (r?.height ?? 0) > 100;
    });
    j.check(`${where}, vista ${view}: los ajustes de la esterilla se ven`, shown);
    j.check(`${where}, vista ${view}: ella está sentada en loto sobre la esterilla`, await p.evaluate(seated, arg));
    await capture(j, `ajustes-${where}-${view}`, `Ajustes en la esterilla (${where}, vista ${view})`);
  }
  const build = await p.evaluate(() => document.querySelector(".settings-sheet [data-build]")?.textContent ?? "");
  j.check(`${where}: los ajustes dicen la versión (hash corto y fecha)`, /Versión ([0-9a-f]{7,}|desarrollo|sin-git)( · \d{4}-\d\d-\d\d)?/.test(build), build);
  await j.tap(".settings-sheet [data-close]", "Levantarse y cerrar los ajustes");
}

/**
 * At each machine of a vehicle: its card offers its own workout, she moves as that machine asks (run, pedal,
 * squat) and the machine with her; `mode` is the vehicle's 0 g interior on window.codeship.
 */
async function machines(j, vehicle, mode, card, place) {
  const p = j.page;
  for (const [id, device, verb] of [["t2", "cinta", "corre con el arnés en la T2"], ["cevis", "bicicleta", "pedalea en la CEVIS sin sillín"], ["ared", "fuerza", "hace sentadillas con la barra del ARED"]]) {
    await place(id);
    await p.waitForTimeout(800);
    if (!(await j.tap(`${card}:not(.hidden) [data-act^="chore:ejercicio"]`, `${vehicle}: entrenar en ${id.toUpperCase()}`))) {
      j.check(`${vehicle}: la ${id.toUpperCase()} ofrece su entrenamiento`, false);
      continue;
    }
    await j.waitDuel();
    await p.waitForTimeout(1200);
    const a = await p.evaluate((m) => {
      const x = m.split(".").reduce((o, k) => o[k], window.codeship);
      const e = x.avatar.exercising;
      return e ? { device: e.motion.device, phase: e.phase } : null;
    }, mode);
    // It keeps moving: the phase changes within a few frames (slow CI frames included).
    const b = await p
      .waitForFunction(([m, ph]) => {
        const e = m.split(".").reduce((o, k) => o[k], window.codeship).avatar.exercising;
        return e && e.phase !== ph ? e.phase : false;
      }, [mode, a?.phase ?? -1], { timeout: 8000, polling: 100 })
      .then((h) => h.jsonValue(), () => null);
    j.check(`${vehicle}: ${verb} (su propia animación, en marcha)`, a?.device === device && b !== null && b !== a.phase, JSON.stringify({ a, b }));
    await capture(j, `${vehicle.toLowerCase()}-${id}`, `${vehicle}: ${id.toUpperCase()}`);
    await close(j);
  }
}

const SHIP_RUN = () => window.codeship.starship.session?.run.current ?? null;
const ISS_RUN = () => window.codeship.stationLife.session?.run.current ?? null;

/**
 * A procedure as code challenges at its fixture: tap its chore on the card, solve `steps` of them (all with
 * Infinity) and check that each solved step is acted out there (framed, and on its own model with `gear`).
 */
async function procedure(j, { card, act, what, oracle, mode, gear, steps = 1, label, title }) {
  const p = j.page;
  if (!(await j.tap(`${card}:not(.hidden) [data-act="${act}"]`, what))) {
    j.check(`${what}: está en su tarjeta`, false);
    return;
  }
  await j.waitDuel();
  let framed = true;
  for (let i = 0; i < steps; i++) {
    if (!(await j.answer(oracle, true))) break;
    await p.waitForTimeout(900);
    const seen = await p.evaluate(([m, g]) => {
      const x = m.split(".").reduce((o, k) => o[k], window.codeship);
      return x.steps.framing && (!g || x.onGear === g);
    }, [mode, gear ?? null]);
    framed &&= seen;
    if (i === 0) await capture(j, label, title);
    await p.waitForTimeout(600);
  }
  j.check(`${what}: cada paso resuelto se ve donde se hace${gear ? ` (en su ${gear})` : ""}`, framed);
  await close(j);
  await p.waitForFunction((m) => !m.split(".").reduce((o, k) => o[k], window.codeship).steps.framing, mode, { timeout: 15000 }).catch(() => {});
}

export async function equipos(j) {
  const p = j.page;
  const onMat = (m) => {
    const x = m.split(".").reduce((o, k) => o[k], window.codeship);
    return x.steps.framing && x.steps.holdPose && x.onGear === "esterilla";
  };

  // 1. The LM's mat: the settings in both views, she seen in lotus on it.
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await matSettings(j, "LM", () => j.useMachine("cabin", "esterilla", "ajustes", "Sentarse en loto: ajustes"), () => window.codeship.cabin.steps.framing && window.codeship.cabin.steps.holdPose);

  // 2. Starship: the three machines, each with its movement.
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la Starship");
  await p.waitForFunction(() => window.codeship.starship.active && !window.codeship.starship.mode.throughHatch, null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(800);
  const placeShip = (id) => j.setup(`Doménica va hasta «${id}» de la Starship (los saltos se juegan en PX-28)`, (f) => window.codeship.starship.mode.placeAt(f), id);
  await machines(j, "Starship", "starship.mode", ".sts-card", placeShip);

  // 3. Starship's mat: settings in both views, and yoga ON the mat (turned to its wall, feet in its loops).
  await placeShip("esterilla");
  await matSettings(j, "Starship", () => j.tap('.sts-card:not(.hidden) [data-act="ajustes"]', "Sentarse en loto: ajustes (Starship)"), onMat, "starship.mode");
  await placeShip("esterilla");
  if (await j.tap('.sts-card:not(.hidden) [data-act^="chore:yoga"]', "Yoga en la esterilla de la Starship")) {
    await j.waitDuel();
    await j.answer(() => window.codeship.starship.session?.run.current ?? null, true);
    await p.waitForTimeout(2500);
    const up = await p.evaluate(() => {
      const m = window.codeship.starship.mode;
      return { on: m.onGear, camUp: m.camera.up.toArray().map((v) => Math.round(v * 100) / 100) };
    });
    j.check("Starship: el yoga se hace sobre la esterilla (su pared es el suelo en pantalla)", up.on === "esterilla", JSON.stringify(up));
    await capture(j, "starship-yoga", "Yoga sobre la esterilla de la Starship");
    await close(j);
  }

  // 4. The AQH: medaka and snails in its two chambers; cleaning the glass acted out at it.
  await j.setup("llegan 6 medakas y 4 caracoles al AQH (adoptarlos se juega en PX-28)", () => {
    const t = window.codeship.starship.aquarium.tank;
    t.stock("banco", 6, "medakas");
    t.stock("caracoles", 4, "caracoles");
    t.algae = 0.6;
  });
  await placeShip("habitat-acuatico");
  await p.waitForTimeout(800);
  const drawn = await p.evaluate(() => {
    const g = window.codeship.starship.mode.gearOf("habitat-acuatico");
    return { fish: g.fish.count, snails: g.snails.count };
  });
  j.check("Starship: el AQH muestra sus medakas y sus caracoles", drawn.fish === 6 && drawn.snails === 4, JSON.stringify(drawn));
  const clean = '.sts-card:not(.hidden) [data-act^="chore:acuario-cristal"]';
  if (await j.tap((await p.locator(clean).count()) ? clean : '.sts-card:not(.hidden) [data-act^="chore:"]', "Cuidar el AQH")) {
    await j.waitDuel();
    await j.answer(() => window.codeship.starship.session?.run.current ?? null, true);
    await p.waitForTimeout(900);
    j.check("Starship: el paso se ve en el AQH, con ella en su bandeja", await p.evaluate(() => window.codeship.starship.mode.steps.framing));
    await capture(j, "starship-aqh", "Cuidado del AQH en la Starship");
    await close(j);
  }
  // Each vehicle keeps its own colony: the station's AQH is empty until they are carried there.
  j.check("cada vehículo tiene su colonia: el AQH de la estación sigue vacío", await p.evaluate(() => window.codeship.stationAquarium.tank.fishCount + window.codeship.stationAquarium.tank.snailCount === 0));
  await j.setup("la Starship está atracada en la estación (el viaje y el atraque se juegan en PX-36)", () => {
    const c = window.codeship;
    c.mothership.dockedTo ??= c.structure.portFor("nodriza")?.port?.id ?? "nodriza";
  });
  await placeShip("habitat-acuatico");
  await procedure(j, { card: ".sts-card", act: "chore:acuario-traslado", what: "Trasladar el banco y los caracoles a la estación", oracle: SHIP_RUN, mode: "starship.mode", steps: Infinity, label: "starship-traslado", title: "Traslado del AQH a la estación" });
  const moved = await p.evaluate(() => ({ ship: window.codeship.starship.aquarium.tank.fishCount, station: window.codeship.stationAquarium.tank.fishCount, snails: window.codeship.stationAquarium.tank.snailCount }));
  j.check("el traslado (un reto por paso) lleva las 6 medakas y los 4 caracoles al AQH de la estación", moved.ship === 0 && moved.station === 6 && moved.snails === 4, JSON.stringify(moved));

  // 5. The storm shelter drill (en desarrollo: RadWorks' water walls), washing at the WHC and the CHeCS: code challenges, acted out.
  await placeShip("sv-refugio");
  await procedure(j, { card: ".sts-card", act: "refugio", what: "Simulacro de tormenta solar en el refugio de agua (Starship)", oracle: SHIP_RUN, mode: "starship.mode", gear: "sv-refugio", label: "starship-refugio", title: "Refugio de tormenta solar" });
  await placeShip("aseo");
  await procedure(j, { card: ".sts-card", act: "chore:asearse", what: "Asearse en el WHC (Starship)", oracle: SHIP_RUN, mode: "starship.mode", steps: 2, label: "starship-aseo", title: "Aseo en el WHC de la Starship" });
  await placeShip("botiquin");
  await procedure(j, { card: ".sts-card", act: "chore:medico-chequeo", what: "Chequeo médico con el CHeCS (Starship)", oracle: SHIP_RUN, mode: "starship.mode", steps: 2, label: "starship-checs", title: "Chequeo con el CHeCS de la Starship" });

  // 6. The station: the same machines and facilities, working the same.
  await j.setup("vuelve al LM y lo acopla en su puerto de la estación", () => {
    const c = window.codeship;
    c.starship.exit();
    c.docking.undock();
    c.docking.dockNow(c.structure.portFor("sonda"));
    c.cabin.enter("asiento");
  });
  await j.useMachine("cabin", "acople", "entrar-estacion", "Entrar en la estación");
  await p.waitForFunction(() => window.codeship.stationInside.active, null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1200);
  const placeIss = (id) => j.setup(`Doménica va hasta «${id}» de la estación (cruzar la estación salto a salto lleva minutos)`, (f) => window.codeship.stationInside.placeAt(f), id);
  await machines(j, "Estación", "stationInside", ".sti-card", placeIss);
  await placeIss("esterilla");
  await matSettings(j, "Estación", () => j.tap('.sti-card:not(.hidden) [data-act="ajustes"]', "Sentarse en loto: ajustes (estación)"), onMat, "stationInside");
  await placeIss("rack-acuatico");
  await p.waitForTimeout(800);
  const issTank = await p.evaluate(() => {
    const g = window.codeship.stationInside.gearOf("rack-acuatico");
    return { fish: g.fish.count, snails: g.snails.count, card: [...document.querySelectorAll(".sti-card:not(.hidden) button")].map((b) => b.textContent.trim()) };
  });
  j.check("estación: el AQH de Kibo muestra la colonia trasladada (sus medakas y caracoles, sus tareas)", issTank.fish === 6 && issTank.snails === 4 && issTank.card.some((t) => /medakas|cristal|caracoles/i.test(t)), JSON.stringify(issTank));
  if (await j.tap('.sti-card:not(.hidden) [data-act^="chore:"]', "Cuidar el AQH de Kibo")) {
    await j.waitDuel();
    await j.answer(() => window.codeship.stationLife.session?.run.current ?? null, true);
    await p.waitForTimeout(900);
    j.check("estación: el paso se ve en el AQH de Kibo", await p.evaluate(() => window.codeship.stationInside.steps.framing));
    await capture(j, "estacion-aqh", "Cuidado del AQH de Kibo");
    await close(j);
  }
  await placeIss("aseo");
  await procedure(j, { card: ".sti-card", act: "chore:asearse", what: "Asearse en el WHC de Tranquility", oracle: ISS_RUN, mode: "stationInside", steps: 2, label: "estacion-aseo", title: "Aseo en el WHC de Tranquility" });
  // The station's real procedure: into the most shielded spot, her Harmony crew quarter (radiation reduction material).
  await placeIss("saco-1");
  await procedure(j, { card: ".sti-card", act: "chore:refugio-estacion", what: "Simulacro de tormenta solar en el camarote de Harmony", oracle: ISS_RUN, mode: "stationInside", steps: 3, label: "estacion-refugio", title: "Resguardarse en el camarote de Harmony" });
  await placeIss("botiquin");
  await procedure(j, { card: ".sti-card", act: "chore:medico-desfibrilador", what: "Formación con el desfibrilador del CHeCS (Columbus)", oracle: ISS_RUN, mode: "stationInside", steps: 2, label: "estacion-checs", title: "El desfibrilador del CHeCS en Columbus" });

  // 7. Parity (reglas.md §6.0): every facility of both vehicles has its real model and an action on its card in both.
  const SHARED = ["cocina", "esterilla", "t2", "cevis", "ared", "aseo", "saco-1", "rack-acuatico", "sv-consola", "botiquin"];
  const RACKS = ["sv-ar", "sv-wrs", "sv-ogs", "sv-itcs", "sv-incendios", "sv-consola"];
  const SHARED_GEAR = { esterilla: "esterilla", t2: "t2", cevis: "cevis", ared: "ared", aseo: "aseo", botiquin: "botiquin" };
  const gaps = [];
  for (const [vehicle, mode, card] of [["estación", "stationInside", ".sti-card"]]) {
    for (const id of SHARED) {
      await p.evaluate(([m, f]) => m.split(".").reduce((o, k) => o[k], window.codeship).placeAt(f), [mode, id]);
      await p.waitForTimeout(350);
      const ok = await p.evaluate((c) => [...document.querySelectorAll(`${c}:not(.hidden) button`)].some((b) => !b.disabled && !/^nada$/.test(b.dataset.act ?? "")), card);
      if (!ok) gaps.push(`${vehicle}:${id}`);
      if (SHARED_GEAR[id] && !(await p.evaluate(([m, f]) => !!m.split(".").reduce((o, k) => o[k], window.codeship).gearOf(f), [mode, id]))) gaps.push(`${vehicle}:${id} sin modelo`);
    }
  }
  const racks = await p.evaluate((ids) => ids.filter((id) => !window.codeship.stationInside.rack(id) || !window.codeship.starship.mode.rack(id)), RACKS);
  j.check("paridad: los mismos bastidores de soporte vital, con su modelo, en las dos (sus reparaciones se juegan en PX-30)", racks.length === 0, racks.join(", "));
  j.check("paridad: cada instalación de la estación que también tiene la Starship funciona aquí (acción en su tarjeta y su modelo real)", gaps.length === 0, gaps.join(", "));
  const shipGear = await p.evaluate((ids) => {
    const m = window.codeship.starship.mode;
    return ids.filter((id) => !m.gearOf(id));
  }, Object.values(SHARED_GEAR));
  j.check("paridad: la Starship tiene los mismos modelos reales (esterilla, T2, CEVIS, ARED, WHC, AQH, CHeCS)", shipGear.length === 0 && (await p.evaluate(() => !!window.codeship.starship.mode.gearOf("habitat-acuatico"))), shipGear.join(", "));
}
