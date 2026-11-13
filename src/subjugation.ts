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
import type { Eva } from "@modules/eva/application/eva";
import type { EvaMode } from "./eva-mode";
import type { FlightDeck } from "./flight-deck";
import { ProbeMode } from "./probe-mode";
import { asteroidText, type DuelView, type SessionText } from "./ui/duel-view";
import type { NavMap } from "./ui/nav-map";
import { RapportChip, rapportCardHtml } from "./ui/rapport-view";

const STAGE_TITLE: Readonly<Record<Stage, string>> = { sonda: "fase 1 · sonda", nave: "fase 2 · módulo", traje: "fase 3 · traje" };
const kg = (v: number) => v.toFixed(0);

/** The duel screen's texts for a stage: the same mind, a deeper level. */
export function stageDuelText(name: string, stage: Stage): SessionText {
  const t = asteroidText(name);
  return { ...t, title: `${t.title} · ${STAGE_TITLE[stage]}` };
}

/** One line on how a won stage went (banner and toasts). */
export function stageResultText(e: Expedition): string {
  const r = e.lastResult;
  const name = e.asteroid.data.name;
  if (!r) return "";
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
/** Show the HUD chip within this distance of the target's surface, m. Game value. */
const CHIP_RANGE_M = 6000;

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
}

/**
 * Wiring of the subjugation's three stages (docs/design/subyugacion.md): the probe and its console on
 * the flight deck, the stage duels, the lie-down in the suit, the map card block and the HUD chip.
 */
export class SubjugationUi {
  readonly probe: ProbeOps;
  readonly probeMode: ProbeMode;
  readonly chip: RapportChip;
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
      canStartDuel: () => ex.canStartStage("sonda"),
      startDuel: () => this.startDuel("sonda"),
      keyboard: d.keyboard,
    });
    d.deck.addStatusButton("fd-probe", "Sonda", () => this.probeMode.enter());
    this.chip = new RapportChip(d.root);
    d.map.rapportMark = (id) => rapportCardHtml(ex.rapport.peek(id), ex.phase === "aggressive" && id === ex.asteroid.data.id);

    d.evaMode.canSubjugate = () => ex.canStartStage("traje");
    d.evaMode.onLieDown = () => this.startDuel("traje");

    // Closing the duel screen after a won duel: back to where the pilot was.
    const prev = d.duelView.onClose;
    d.duelView.onClose = () => {
      this.closeDuel();
      prev?.();
    };
  }

  /** Enter the mind at `stage` and show the duel screen. */
  startDuel(stage: Stage): void {
    const ex = this.d.expedition;
    if (!ex.canStartStage(stage)) return;
    ex.startDuel(stage);
    this.duelStage = stage;
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
      stageDuelText(ex.asteroid.data.name, stage),
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
  }

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
   * out of the rocks, apply the asteroid's anger, and refresh its console and the HUD chip.
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
    const t = ex.asteroid;
    const near = t.surfaceDistance(this.probeMode.active ? f.state.position : cockpit.landerPosition, f.simTimeS) < CHIP_RANGE_M;
    this.chip.update(cockpit.visible && near && !this.probeMode.active, t.data.name, ex.rapport.peek(t.data.id), ex.phase === "aggressive");
  }

  /** The lander's banner while landed: what its stage allows here. */
  landedText(): string {
    const ex = this.d.expedition;
    const r = ex.bond;
    const name = ex.asteroid.data.name;
    if (r.subjugated) return `${name} obedece · puedes salir con el traje`;
    if (r.next === "sonda") return `${name} no te conoce: primero la sonda, desde el puente de la nodriza (fase 1)`;
    if (r.next === "traje") return `${name} confía en ti · sal con el traje y túmbate sobre él (fase 3)`;
    return `Módulo anclado en ${name} · entra en su mente (fase ${stageIndex("nave") + 1})`;
  }
}
