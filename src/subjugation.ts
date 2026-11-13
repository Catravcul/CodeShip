import type * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import type { Region } from "@modules/celestial/domain/region";
import type { Expedition } from "@modules/expedition/application/expedition";
import { FlightComputer } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import type { Mothership } from "@modules/mothership/domain/mothership";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import { Ship, type ThrustCommand } from "@modules/ship/domain/ship";
import { PROBE_BATTERY_WH, PROBE_HULL, PROBE_LOAD_W, PROBES_ON_BOARD, probeDesign } from "@modules/ship/data/probe";
import { ProbeOps } from "@modules/subjugation/application/probe-ops";
import { stageIndex, type Stage } from "@modules/subjugation/domain/rapport";
import { LEVEL_NAME, type Level } from "@modules/subjugation/domain/levels";
import type { Eva } from "@modules/eva/application/eva";
import type { EvaMode } from "./eva-mode";
import type { FlightDeck } from "./flight-deck";
import { ProbeMode } from "./probe-mode";
import { asteroidText, type DuelView, type SessionText } from "./ui/duel-view";
import type { NavMap } from "./ui/nav-map";
import { rapportCardHtml } from "./ui/rapport-view";
import type { WrathTarget } from "@modules/asteroid-wrath/application/wrath";
import { HULL_ENERGY_J, PROBE_ELECTRONICS_TOLERANCE_MSV } from "@modules/asteroid-wrath/domain/protection";

const STAGE_TITLE: Readonly<Record<Stage, string>> = { sonda: "fase 1 · sonda", nave: "fase 2 · módulo", traje: "fase 3 · traje" };
const kg = (v: number) => v.toFixed(0);

/** The duel screen's texts for a stage: the same mind, a deeper level. */
export function stageDuelText(name: string, stage: Stage): SessionText {
  const t = asteroidText(name);
  return { ...t, title: `${t.title} · ${STAGE_TITLE[stage]}` };
}

/** The duel screen's texts for a subjugation level. */
export function levelDuelText(name: string, level: Level): SessionText {
  const t = asteroidText(name);
  return { ...t, title: `${t.title} · nivel ${level}` };
}

const LEVEL_DONE: Readonly<Record<Level, string>> = {
  1: "aportará a la nano_net: ya puede ser núcleo de la red",
  2: "enviará paquetes de su roca a la bodega de la nodriza cada día",
  3: "enviará paquetes de su roca a la estación cada día",
  4: "irá a la estación por su cuenta para que la extraigan entera: despega y se pondrá en marcha",
};

/** One line on how a won stage went (banner and toasts). */
export function stageResultText(e: Expedition): string {
  const r = e.lastResult;
  const name = e.asteroid.data.name;
  if (!r) return "";
  if (r.level) return r.persuaded ? `${name} acepta el nivel ${r.level}: ${LEVEL_DONE[r.level]}` : `¡${name} se niega a ${LEVEL_NAME[r.level]} y se enfada! Te persigue con su gravedad: huye`;
  if (!r.persuaded) return `¡${name} se enfada! Su confianza baja`;
  const load = r.cargo.length ? `: ${r.cargo.map((c) => `${kg(c.kg)} kg de ${c.material}`).join(", ")} en la bodega` : "";
  switch (r.stage) {
    case "sonda":
      return `${name} te deja asomarte: escaneo de su composición hecho, confía un poco más. Recupera la sonda`;
    case "nave":
      return `${name} se abre más${load}. Para el último nivel, sal con el traje y túmbate sobre él`;
    case "traje":
      return `${name} obedece: subyugado${load}`;
  }
}

/** Mothership body frame: the probe's bay on top of the forward node, opposite the lander's port. Game value. */
export const PROBE_BAY_BODY = new Vec3(0, 2.2 + PROBE_HULL.y / 2 + 0.55, -70);

export interface SubjugationDeps {
  readonly root: HTMLElement;
  readonly scene: THREE.Scene;
  readonly expedition: Expedition;
  readonly region: Region;
  readonly mothership: Mothership;
  readonly deck: FlightDeck;
  readonly duelView: DuelView;
  readonly eva: Eva;
  readonly evaMode: EvaMode;
  readonly map: NavMap;
  keyboard(): ThrustCommand;
  /** Docked at the station (directly or through the mothership): spare probes are restocked. */
  atStation(): boolean;
  /** The asteroids' wrath (docs/design/poderes-ira.md): the probe and Doménica in her suit join its targets. */
  readonly wrath?: { addTarget(t: WrathTarget): void };
  /** Doménica plus her suit, kg (a comet's jet pushes her by momentum / mass). */
  readonly crewMassKg?: number;
}

/**
 * EMU shielding against radiation, aluminium-equivalent g/cm². Estimate: the suit's layers are
 * a few tenths of a g/cm²; game value until a sourced figure is wired.
 */
const SUIT_SHIELD_GCM2 = 0.3;
/** Suit damage (0..1) that sends her back to the hatch at once. Game value. */
const SUIT_RETREAT_AT = 0.3;

/**
 * Wiring of the subjugation's three stages (docs/design/subyugacion.md): the probe and its console on
 * the flight deck, the stage duels, the lie-down in the suit and the map card block. The phase and trust
 * are not on the flight HUD (they got in the way of landing): they live on the asteroid's mind consoles.
 */
export class SubjugationUi {
  readonly probe: ProbeOps;
  readonly probeMode: ProbeMode;
  private duelStage: Stage | undefined;

  constructor(private readonly d: SubjugationDeps) {
    const { expedition: ex, mothership, region } = d;
    const bay = () => this.bayPose();
    this.probe = new ProbeOps(
      (serial, timeS) => new FlightComputer(Ship.create(probeDesign(serial)), bay(), { gravitySources: region.asteroids, target: ex.asteroid, startTimeS: timeS }),
      bay,
      { probes: PROBES_ON_BOARD, batteryWh: PROBE_BATTERY_WH, loadW: PROBE_LOAD_W },
    );
    ex.contacts = { probeParkedOn: () => this.probe.parkedOn, suitLying: () => d.eva.lying, suitOutside: () => d.eva.outside };

    this.probeMode = new ProbeMode(d.root, d.scene, {
      probe: this.probe,
      launchDirection: () => mothership.orientation.rotate(Vec3.Y),
      targetName: () => ex.asteroid.data.name,
      bond: () => ex.bond,
      angry: () => ex.phase === "aggressive",
      canStartDuel: () => ex.canStartStage("sonda") || ex.canStartLevel("sonda"),
      startDuel: () => (ex.canStartLevel("sonda") ? this.startLevelDuel("sonda") : this.startDuel("sonda")),
      duelLabel: () => (ex.bond.nextLevel && ex.bond.subjugated ? (ex.canStartLevel("sonda") ? `Convencer · nivel ${ex.bond.nextLevel}` : `Nivel ${ex.bond.nextLevel}: ${ex.bond.levelBlock() || "espera a que se calme"}`) : undefined),
      keyboard: d.keyboard,
    });
    d.map.rapportMark = (id) => rapportCardHtml(ex.rapport.peek(id), ex.phase === "aggressive" && id === ex.asteroid.data.id, this.activityOf?.(id) ?? "");

    d.evaMode.canSubjugate = () => ex.canStartStage("traje");
    d.evaMode.onLieDown = () => this.startDuel("traje");

    if (d.wrath) for (const t of [this.probeTarget(), this.suitTarget()]) d.wrath.addTarget(t);

    // Closing the duel screen after a won duel: back to where the pilot was.
    const prev = d.duelView.onClose;
    d.duelView.onClose = () => {
      this.closeDuel();
      prev?.();
    };
  }

  /** Damage the suit has taken on this walk, 0..1. */
  suitDamage = 0;
  /** Dose Doménica took outside, mSv. */
  suitDoseMSv = 0;

  /** The probe as a target of an angry asteroid: tiny, unshielded, electronics that fail under radiation. */
  private probeTarget(): WrathTarget {
    const p = this.probe;
    const ship = () => p.flight.ship;
    return {
      id: "sonda",
      kind: "sonda",
      name: "sonda",
      radiusM: 0.4,
      position: () => p.flight.state.position,
      velocity: () => p.flight.state.velocity,
      // Stowed, it is part of the travel ship.
      active: () => p.out,
      landed: () => p.status === "posada",
      protection: () => ({ hullEnergyJ: HULL_ENERGY_J.sonda, debrisFactor: 1, electronicsToleranceMSv: PROBE_ELECTRONICS_TOLERANCE_MSV }),
      damage: (f) => ship().damage(f, "choque"),
      dose: (mSv) => p.irradiate(mSv, PROBE_ELECTRONICS_TOLERANCE_MSV),
      pull: (dv) => {
        if (p.status === "posada") p.shakeOff();
        p.flight.applyImpulse(dv);
      },
      thrustAccelMs2: () => ship().preview({ mainThrottle: 1, translation: Vec3.ZERO, rotation: Vec3.ZERO }).forceBody.length() / ship().massKg,
      massKg: () => ship().massKg,
    };
  }

  /** Doménica outside in her suit (stage 3): hits send her back to the hatch; a grip pulls her off the ground. */
  private suitTarget(): WrathTarget {
    const { eva, evaMode } = this.d;
    const t = () => eva.flight.simTimeS;
    const local = () => eva.body?.position ?? Vec3.ZERO;
    return {
      id: "traje",
      kind: "traje",
      name: "Doménica (traje)",
      radiusM: 1,
      position: () => eva.asteroid.toWorld(local(), t()),
      velocity: () => eva.asteroid.surfaceVelocity(eva.asteroid.toWorld(local(), t())),
      active: () => eva.outside && !!eva.body,
      protection: () => ({ hullEnergyJ: HULL_ENERGY_J.traje, debrisFactor: 1, radiation: { material: "aluminio", arealDensityGcm2: SUIT_SHIELD_GCM2 } }),
      damage: (f) => {
        this.suitDamage = Math.min(1, this.suitDamage + f);
        evaMode.tell(`¡Impacto en el traje! Daño ${Math.round(this.suitDamage * 100)} %${this.suitDamage >= SUIT_RETREAT_AT ? ": vuelve a la escotilla" : ""}`, 5000);
        if (this.suitDamage >= SUIT_RETREAT_AT) eva.requestReturn();
      },
      dose: (mSv) => (this.suitDoseMSv += mSv),
      pull: (dv) => {
        const b = eva.body;
        if (b) b.applyImpulse(eva.asteroid.orientationAt(t()).conjugate().rotate(dv));
      },
      thrustAccelMs2: () => eva.jetAccelMs2,
      // Doménica and her suit: the EMU is about 145 kg (NASA), her own mass is the crew model's.
      massKg: () => this.d.crewMassKg ?? 200,
    };
  }

  /** What a subjugated asteroid is doing now (set by the levels wiring), for the mind consoles and the map. */
  activityOf?: (asteroidId: string) => string;

  /** Enter its mind again to persuade it into the next level, through the lander or the parked probe. */
  startLevelDuel(via: "nave" | "sonda"): void {
    const ex = this.d.expedition;
    if (!ex.canStartLevel(via)) return;
    const level = ex.startLevelDuel(via);
    this.duelStage = via;
    this.showDuel(levelDuelText(ex.asteroid.data.name, level), via);
  }

  /** Enter the mind at `stage` and show the duel screen. */
  startDuel(stage: Stage): void {
    const ex = this.d.expedition;
    if (!ex.canStartStage(stage)) return;
    ex.startDuel(stage);
    this.duelStage = stage;
    this.showDuel(stageDuelText(ex.asteroid.data.name, stage), stage);
  }

  private showDuel(text: SessionText, stage: Stage): void {
    const ex = this.d.expedition;
    const duel = ex.duel!;
    this.d.duelView.show(
      {
        get current() {
          return duel.current;
        },
        get progress() {
          return duel.persuasion;
        },
        goal: duel.profile.persuasionGoal,
        get lives() {
          return duel.patience;
        },
        maxLives: duel.profile.patience,
      },
      text,
      (a: Answer) => {
        const events = ex.answer(a);
        if (events.some((e) => e.type === "asteroid-enraged")) this.onEnraged(stage);
        if (events.some((e) => e.type === "asteroid-persuaded")) this.say(stageResultText(ex));
        return { ok: events.some((e) => e.type === "idea-accepted") };
      },
    );
  }

  private onEnraged(stage: Stage): void {
    const ex = this.d.expedition;
    if (stage === "sonda") this.probe.shakeOff();
    // Faster than Bennu's escape speed: she flies off and the tether catches her.
    if (stage === "traje") this.d.eva.throwOff(0.25);
    if (ex.level) return this.say(stageResultText(ex));
    this.say(`¡${ex.asteroid.data.name} está furioso! ${stage === "sonda" ? "Rescata la sonda si puedes, o abandónala" : stage === "traje" ? "Vuelve al módulo y huye" : "Huye a la distancia segura"}`);
  }

  private closeDuel(): void {
    const ex = this.d.expedition;
    if (ex.phase === "persuaded") ex.acknowledge();
    if (this.duelStage === "traje" && this.d.eva.lying) this.d.eva.standUp();
    this.duelStage = undefined;
  }

  private say(text: string): void {
    if (this.probeMode.active) this.probeMode.say(text, 7);
    else if (this.d.evaMode.active) this.d.evaMode.tell(text, 7000);
    else this.onSay?.(text);
  }

  /** Where the duel's result is said when neither the probe nor the suit is on screen (the bridge's mind console). */
  onSay?: (text: string) => void;

  /** Pose of the probe's bay on the travel ship now (debug and checks). */
  bayPose(): RigidBodyState {
    const m = this.d.mothership;
    return RigidBodyState.at(m.position.add(m.orientation.rotate(PROBE_BAY_BODY))).withOrientation(m.orientation);
  }

  /** The probe is flown (pads/keys go to it, not to the lander). */
  get piloting(): boolean {
    return this.probeMode.active;
  }

  /** Distance to surface of the craft being flown, for the time-warp rule. */
  pilotedDistanceM(landerM: number): number {
    return this.probeMode.active ? this.probe.flight.telemetry().distanceToSurface : landerM;
  }

  /**
   * Every frame: keep the probe on the expedition's target, fly it (or let it ride its bay), keep it
   * out of the rocks, apply the asteroid's anger, and refresh its console.
   */
  update(dt: number, warp: number, warpNote: string, cockpit: { visible: boolean; landerPosition: Vec3 }): void {
    const { expedition: ex, region, mothership } = this.d;
    const p = this.probe;
    const f = p.flight;
    if (!f.landed && f.target !== ex.asteroid) f.setTarget(ex.asteroid);
    if (this.d.atStation()) p.restock();
    p.update(dt * warp, this.probeMode.command(), {
      angry: ex.phase === "aggressive" && f.target === ex.asteroid,
      safeDistanceM: ex.safeDistanceM ?? 0,
      danger: ex.bond.danger,
    });
    if (p.status === "en-vuelo") {
      const s = f.state;
      // Region rules like the lander's; the mothership's hull only away from the bay, where the arm works.
      const nearBay = p.bayRange().distanceM < 20;
      f.applyImpulse(region.boundaryPush(s.position, s.velocity, dt * warp).add(region.avoidObstacles(s.position, s.velocity, ex.asteroid)).add(nearBay ? Vec3.ZERO : mothership.keepOut(s.position, s.velocity)));
    }
    for (const e of p.drainEvents()) this.probeMode.onEvent(e);
    this.probeMode.update(dt, warp, warpNote);
    if (!this.d.eva.outside) this.suitDamage = 0;
  }

  /** The lander's banner while landed: what its stage allows here. */
  landedText(): string {
    const ex = this.d.expedition;
    const r = ex.bond;
    const name = ex.asteroid.data.name;
    if (r.subjugated) {
      const l = r.nextLevel;
      if (!l) return `${name} · nivel máximo: despega y se irá a la estación`;
      if (ex.canStartLevel()) return `${name} obedece (nivel ${r.level}/4) · convéncelo del nivel ${l}: ${LEVEL_NAME[l]}`;
      return `${name} obedece (nivel ${r.level}/4) · nivel ${l}: ${r.levelBlock() || "espera a que se calme"}`;
    }
    if (r.next === "sonda") return `${name} no te conoce: primero la sonda, desde el puente de la nodriza (fase 1)`;
    if (r.next === "traje") return `${name} confía en ti · sal con el traje y túmbate sobre él (fase 3)`;
    return `Módulo anclado en ${name} · entra en su mente (fase ${stageIndex("nave") + 1})`;
  }
}
