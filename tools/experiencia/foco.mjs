// Focus of a challenge (docs/design/ux-acciones.md §Foco del reto): opens every kind of challenge in
// every place it can be met, with taps on visible controls, and checks that while it is open only the
// sheet, the 3D scene and the step overlay are on screen (j.onlyChallengeVisible). Each challenge's
// screen is captured, and what else was on screen is kept in j.audit (the H findings of 2026-11-16).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { placeAbove } from "./aterrizaje.mjs";

/** What is open now: the outsiders, a capture, then «×» (or «Continuar»/«Cerrar» once it ended). */
async function focus(j, id, title, recheck = false) {
  const p = j.page;
  await p.waitForTimeout(600);
  // j.waitDuel already checked it as it opened; again after something changed on the sheet (the HUD view).
  const out = recheck ? await j.onlyChallengeVisible(title) : await j.outsideChallenge();
  j.audit ??= [];
  j.audit.push({ id, title, outside: out });
  mkdirSync("docs/screenshots", { recursive: true });
  await p.screenshot({ path: `docs/screenshots/foco-${id}-movil.png`, timeout: 120000 }).catch(() => {});
  await j.shot(id);
}

async function close(j) {
  const p = j.page;
  await p.waitForTimeout(1000);
  if (await p.locator(".duel:not(.hidden) button.end").count()) await j.tap(".duel:not(.hidden) button.end", "Continuar");
  else if (await p.locator('.duel:not(.hidden) .duel-tools [data-act="close"]').count()) await j.tap('.duel:not(.hidden) .duel-tools [data-act="close"]', "× del reto");
  await p.waitForFunction(() => [...document.querySelectorAll(".duel")].every((e) => e.classList.contains("hidden")), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(500);
  j.check("al cerrar el reto vuelve la interfaz de antes", await p.evaluate(() => !document.body.classList.contains("in-duel")));
}

/** One part of the journey: a failure in one place does not hide what the others show. */
async function part(j, name, fn) {
  try {
    await fn();
  } catch (e) {
    j.check(`${name}: se llega al reto`, false, e.message.split("\n")[0]);
    await j.page.evaluate(() => window.codeship.duelView.visible && document.querySelector('.duel [data-act="close"]')?.click()).catch(() => {});
  }
}

async function reload(j) {
  const p = j.page;
  await p.reload();
  await p.waitForFunction(() => window.codeship, null, { timeout: 120000 });
  await p.waitForTimeout(1500);
}

async function fromTasks(j, has, id, title) {
  await j.tap(".tasks-btn", "Tareas");
  await j.page.waitForTimeout(400);
  await j.tap(`.task-board .tb-task${has.map((h) => `:has-text("${h}")`).join("")} .tb-go`, `Ir: ${has[0]}`);
  await j.waitDuel(120000);
  await focus(j, id, title);
}

const toRing = async (j) => {
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la nave de viaje");
  await j.page.waitForTimeout(800);
  await j.setup("la llevamos al anillo (bajar del eje por el radio se juega en «movimiento»)", () => {
    const z = window.codeship.interior.zones;
    z.zone = "anillo";
    z.autoDown = false;
  });
};

const toBridge = (j) =>
  j.setup("sube al puente por la espina", () => {
    const c = window.codeship;
    if (c.interior.active) c.interior.exit();
    c.bridge.enter("salida");
  });

const landOnBennu = () => {
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
};

const placeAt = (j, id) => j.setup(`Doménica va hasta «${id}»`, (f) => window.codeship.stationInside.placeAt(f), id);

export async function foco(j) {
  const p = j.page;

  // 0. «Ir» with teleport from the lander's cabin: the notice and the fade come with the challenge.
  await part(j, "teletransporte a una tarea", async () => {
    await j.tap(".stand-btn", "Levantarse: habitáculo");
    await p.waitForTimeout(800);
    await j.tap(".room-ui:not(.hidden) .cab-tasks", "Tareas");
    await j.tap('.task-board .tb-travel [data-travel="teletransporte"]', "Teletransporte");
    await j.tap('.task-board .tb-task:has-text("Cosechar Rábano") .tb-go', "Ir: Cosechar Rábano");
    await j.waitDuel(60000);
    await focus(j, "teletransporte", "Tarea del anillo con «Ir» en teletransporte");
    await close(j);
    await j.tap(".tasks-btn", "Tareas");
    await j.tap('.task-board .tb-travel [data-travel="viaje"]', "Viaje");
    await j.tap(".task-board [data-close]", "Cerrar tareas");
  });
  await reload(j);

  // 1. The ring of the mothership: a recipe (both views), a chore, the aquarium and yoga, from «Ir».
  await toRing(j);
  await part(j, "cocina del anillo", async () => {
    await fromTasks(j, ["Cocinar Huevos revueltos"], "anillo-cocina", "Receta en la cocina del anillo");
    await j.tap('.duel [data-act="ui"]', "Vista HUD");
    await p.waitForTimeout(500);
    await focus(j, "anillo-cocina-hud", "Receta en la cocina del anillo, vista HUD", true);
    await j.tap('.duel [data-act="ui"]', "Vista panel");
    await j.setup("mientras cocina llegan un aviso de misión, una línea de radio y un aviso del entorno", () => {
      const c = window.codeship;
      c.missionLog.notify("Misión cumplida: Huevos para la tripulación", "ok");
      c.levels.radio("<b>101955 Bennu</b> manda un paquete a la estación");
      c.journey.say("Aviso del viaje a una tarea", 6);
    });
    await focus(j, "anillo-avisos", "Receta con avisos llegando", true);
    await close(j);
  });
  await part(j, "tarea del anillo", async () => {
    await fromTasks(j, ["Cosechar Rábano"], "anillo-tarea", "Tarea del huerto del anillo");
    await close(j);
  });
  await part(j, "acuario", async () => {
    await fromTasks(j, ["Dar de comer a las medakas"], "acuario", "Acuario del anillo");
    await close(j);
  });
  await part(j, "yoga", async () => {
    await fromTasks(j, ["Saludo al Sol", "Esterilla de yoga ·"], "yoga", "Yoga en la esterilla del anillo");
    await close(j);
  });

  // 2. The bridge: navigation, the probe's trip, the probe's landing program and the mind by the probe.
  await toBridge(j);
  await part(j, "viaje desde la mesa de navegación", async () => {
    await j.useMachine("bridge", "nav", "abrir", "Usar la consola: Mesa de navegación");
    await p.waitForTimeout(1200);
    const id = await p.evaluate(() => window.codeship.nav.targets.find((t) => t.kind === "asteroid" && t.id !== window.codeship.region.target.data.id)?.id);
    await j.tap(`.nav-map .nav-chip[data-id="${id}"]`, "asteroide en el mapa");
    await p.waitForTimeout(400);
    await j.tap('.nav-map [data-act="program"]', "Programar viaje");
    await j.waitDuel(30000);
    await focus(j, "puente-viaje", "Programar un viaje en la mesa de navegación");
    await close(j);
    await j.tap(".fd-panel.max .fd-back", "Volver al puente");
    await j.setup("el destino vuelve a ser Bennu", () => window.codeship.nav.select(window.codeship.region.target.data.id));
  });
  await part(j, "viaje de la sonda", async () => {
    await j.useMachine("bridge", "sonda", "abrir", "Tomar el mando de la sonda");
    await p.waitForTimeout(800);
    await j.tap('.probe-ui [data-act="launch"]', "Lanzar sonda");
    await p.waitForTimeout(800);
    await j.setup("el destino es otro asteroide (el viaje de la sonda es a lo lejos)", () => {
      const c = window.codeship;
      c.nav.select(c.nav.targets.find((t) => t.kind === "asteroid" && t.id !== c.region.target.data.id).id);
    });
    await p.waitForTimeout(600);
    await j.tap('.probe-ui [data-act="trip"]', "Programar viaje (sonda)");
    await j.waitDuel(30000);
    await focus(j, "puente-sonda-viaje", "Programar el viaje de la sonda");
    await close(j);
    await j.setup("el destino vuelve a ser Bennu", () => window.codeship.nav.select("101955-bennu"));
  });
  await part(j, "aterrizaje de la sonda por programa", async () => {
    await j.setup("la sonda llega a 300 m de Bennu (lo que deja el viaje comprimido)", placeAbove, ["sonda", 300, 0]);
    await p.waitForTimeout(1200);
    await j.tap(".land-offer.probe", "Aterrizar con un programa");
    await j.waitDuel(30000);
    await focus(j, "puente-sonda-aterrizaje", "Programa de aterrizaje de la sonda");
    // A critical alert ends the challenge instead of hiding under it (ux-acciones §7).
    await j.setup("Bennu se enfada con la sonda (un duelo fallido): empieza a lanzarle rocas", () => {
      const c = window.codeship;
      c.wrathMode.wrath.duelFailed(c.region.target.data.id, 1);
    });
    const ended = await p.waitForFunction(() => !window.codeship.duelView.visible, null, { timeout: 60000 }).then(() => true, () => false);
    j.check("una alerta crítica (rocas hacia la sonda que pilota) termina el reto en vez de quedar debajo", ended && (await p.evaluate(() => window.codeship.wrathMode.critical(true))));
    await p.waitForTimeout(800);
    await j.shot("alerta-critica");
    await j.setup("Bennu se calma", () => window.codeship.wrathMode.wrath.setAnger(window.codeship.region.target.data.id, 0));
    await close(j);
  });
  await part(j, "mente por la sonda", async () => {
    // Landing the probe takes minutes with SwiftShader (PX-07 plays it): here it is set down on Bennu.
    await j.setup("la sonda queda posada sobre Bennu", () => {
      const pr = window.codeship.probe;
      pr._status = "posada";
      if (!pr.flight.target) pr.flight.setTarget(window.codeship.region.target);
    });
    await p.waitForFunction(() => !!window.codeship.probe.parkedOn, null, { timeout: 10000 });
    await j.tap(".pr-exit", "Volver al puente");
    await p.waitForTimeout(600);
    await j.useMachine("bridge", "mente", "mente", "Entrar en su mente por la sonda");
    await j.waitDuel(30000);
    await focus(j, "puente-mente", "Duelo con la mente por la sonda");
    await answerAll(j, () => window.codeship.expedition.duel?.current ?? null, () => window.codeship.expedition.phase === "duel");
    await close(j);
  });

  // 3. The lander on Bennu: its landing program, the mind from the cabin, the suit and the nano_net.
  await reload(j);
  await part(j, "aterrizaje del módulo por programa", async () => {
    await j.setup("el módulo llega a 300 m de Bennu, parado sobre el suelo", placeAbove, ["modulo", 300, 0]);
    await p.waitForTimeout(1200);
    await j.tap(".ctx-dock > .land-offer", "Aterrizar con un programa");
    await j.waitDuel(30000);
    await focus(j, "modulo-aterrizaje", "Programa de aterrizaje del módulo");
    await close(j);
  });
  await part(j, "habitáculo posado", async () => {
    await j.setup("posa el módulo sobre Bennu (aterrizar a mano lleva minutos)", landOnBennu);
    await p.waitForFunction(() => window.codeship.expedition.phase === "landed", null, { timeout: 180000 });
    await j.setup("la fase de la sonda ya está hecha en Bennu", () => {
      const ex = window.codeship.expedition;
      ex.rapport.of(ex.asteroid.data.id).succeed("sonda");
    });
    await j.tap(".stand-btn", "Levantarse: habitáculo");
    await j.useMachine("cabin", "mente", "mente", "Entrar en su mente");
    await j.waitDuel(30000);
    await focus(j, "modulo-mente", "Duelo con la mente desde el habitáculo del módulo");
    await answerAll(j, () => window.codeship.expedition.duel?.current ?? null, () => window.codeship.expedition.phase === "duel");
    await close(j);
    await j.useMachine("cabin", "escotilla", "salir-eva", "Ponerse el traje y salir");
    await j.waitDuel(30000);
    await focus(j, "eva-traje", "Ponerse el traje");
    await close(j);
  });
  await part(j, "nano_net", async () => {
    await j.setup("Bennu persuadido (las tres fases se juegan en «mision»)", () => window.codeship.nano.subjugate(window.codeship.region.target.data.id));
    await j.useMachine("cabin", "asiento", "pilotar", "Sentarse a pilotar");
    await p.waitForTimeout(800);
    await j.tap(".nano-action", "nano_net: acción del núcleo");
    await j.waitDuel(30000);
    await focus(j, "nano", "Reto de la nano_net en el núcleo");
    await close(j);
  });

  // 4. The station: its galley, a machine, its screens (a refinery batch), an import and the ship bay.
  await reload(j);
  await j.setup("acopla el módulo en su puerto de la estación", () => {
    const c = window.codeship;
    c.docking.undock();
    c.docking.dockNow(c.structure.portFor("sonda"));
  });
  await j.tap(".stand-btn", "Levantarse: habitáculo");
  await j.useMachine("cabin", "acople", "entrar-estacion", "Entrar en la estación");
  await p.waitForTimeout(900);
  await part(j, "cocina de la estación", async () => {
    await placeAt(j, "cocina");
    await j.tap('.sti-card [data-act^="chore:cocinar"]', "Cocinar un plato");
    await j.waitDuel();
    await focus(j, "estacion-cocina", "Cocina de la estación");
    await close(j);
  });
  await part(j, "máquina de la estación", async () => {
    const at = await p.evaluate(() => {
      const s = window.codeship.stationInside;
      for (const f of ["lavadora", "ducha", "bicicleta", "cinta", "esterilla", "ejercicio", "aseo", "camarote"]) {
        try {
          if (s.placeAt(f) !== false) return f;
        } catch {}
      }
      return "";
    });
    j.checks.push({ ok: true, name: `(preparación) Doménica va hasta «${at}»`, setup: true });
    await p.waitForTimeout(600);
    await j.tap('.sti-card [data-act^="chore:"]', `Tarea de «${at}»`);
    await j.waitDuel();
    await focus(j, "estacion-maquina", `Máquina de la estación («${at}»)`);
    await close(j);
  });
  await part(j, "pantalla de la estación", async () => {
    await placeAt(j, "refineria");
    await j.tap('.sti-card [data-act="abrir"]', "Abrir (refinería)");
    await p.waitForTimeout(600);
    await j.tap(".st-ui [data-refine]:not([disabled])", "Refinar un lote");
    await j.waitDuel();
    await focus(j, "estacion-pantalla", "Pantalla de la estación: refinar");
    await close(j);
  });
  await part(j, "importar", async () => {
    await j.tap('.st-tabs [data-tab="importar"]', "pestaña Importar");
    await p.waitForTimeout(400);
    await j.tap(".st-ui [data-good-plus]", "+ un material");
    await j.tap(".st-ui [data-order]", "Pedir");
    await j.waitDuel();
    await focus(j, "estacion-importar", "Importar desde la Tierra");
    await close(j);
  });
  await part(j, "hangar: cambiar una pieza", async () => {
    await j.tap('.st-tabs [data-tab="hangar"]', "pestaña Hangar");
    await p.waitForTimeout(400);
    await j.tap(".st-ui [data-bay]", "Abrir la bahía de la nave");
    await p.waitForTimeout(800);
    await j.tap('.bay-ui [data-part="alas-solares"]', "Energía del módulo");
    await p.waitForTimeout(400);
    await j.tap(".bay-ui .bay-act:not(.locked)", "cambiar la pieza");
    await j.waitDuel();
    await focus(j, "hangar-pieza", "Cambiar una pieza en el hangar");
    await close(j);
  });

  writeFileSync(join(j.dir, "foco-auditoria.json"), JSON.stringify(j.audit ?? [], null, 2));
}

/** Plays a duel to its end with the right answers (a failed mind duel enrages the asteroid). */
async function answerAll(j, key, running) {
  for (let n = 0; n < 16 && (await j.page.evaluate(running)); n++) await j.answer(key, true);
}
