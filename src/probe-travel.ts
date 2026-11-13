import { Vec3 } from "@core/math/vec3";
import type { Expedition } from "@modules/expedition/application/expedition";
import type { Mothership } from "@modules/mothership/domain/mothership";
import type { Obstacle } from "@modules/navigation/domain/route";
import { ProbeTrip, type ProbeGoal } from "@modules/navigation/application/probe-trip";
import { num } from "@modules/navigation/application/trip-chore";
import type { ProbeOps } from "@modules/subjugation/application/probe-ops";
import type { Region } from "@modules/celestial/domain/region";
import type { RigidBodyState } from "@modules/flight/domain/rigid-body";
import type { DuelView } from "./ui/duel-view";
import type { ProbeMode } from "./probe-mode";
import { openTripSheet } from "./navigation";

export interface ProbeTravelDeps {
  readonly probe: ProbeOps;
  readonly probeMode: ProbeMode;
  readonly expedition: Expedition;
  readonly region: Region;
  readonly mothership: Mothership;
  readonly duel: DuelView;
  /** Keep-out radius round the whole mothership, m. */
  readonly mothershipClearanceM: number;
  bayPose(): RigidBodyState;
  /** Why no probe trip can start (the mothership or the lander already on a compressed trip), if so. */
  busy(): string | undefined;
}

/**
 * Wiring of the probe's long trips (docs/design/viajes.md): the «Programar viaje» buttons of the
 * probe console, the challenge sheet, and what the console says when the probe hands back control.
 */
export class ProbeTravel {
  readonly trip: ProbeTrip;
  private last: string;

  constructor(private readonly d: ProbeTravelDeps) {
    const { probe, mothership } = d;
    this.trip = new ProbeTrip({
      flight: () => probe.flight,
      stowed: () => probe.status === "estibada",
      launch: () => probe.launch(mothership.orientation.rotate(Vec3.Y)),
      bay: () => ({ position: d.bayPose().position, up: mothership.orientation.rotate(Vec3.Y) }),
      obstaclesFor: (g) => this.obstacles(g),
      busy: () => d.busy(),
    });
    this.last = this.trip.status;
    d.probeMode.deps.tripOffer = () => this.offer();
    d.probeMode.deps.programTrip = (home) => this.program(home);
  }

  private obstacles(g: ProbeGoal): Obstacle[] {
    const m = this.d.mothership;
    return [...this.d.region.obstaclesExcept(g.kind === "asteroid" ? g.body : undefined), { centre: m.position, radiusM: this.d.mothershipClearanceM }];
  }

  private goal(home: boolean): ProbeGoal {
    return home ? { kind: "bay" } : { kind: "asteroid", body: this.d.expedition.asteroid };
  }

  /** Which trips the console offers now. */
  offer(): { to?: string; home?: boolean; flying?: boolean } {
    const t = this.trip;
    if (t.active) return { flying: true };
    if (this.d.probe.status === "sin-sonda") return {};
    return {
      ...(t.canProgram(this.goal(false)).ok ? { to: this.d.expedition.asteroid.data.name } : {}),
      ...(t.canProgram(this.goal(true)).ok ? { home: true } : {}),
    };
  }

  program(home: boolean): void {
    const g = this.goal(home);
    const can = this.trip.canProgram(g);
    if (!can.ok) {
      this.d.probeMode.say(can.reason ?? "");
      return;
    }
    const run = this.trip.startProgramming(g);
    const t = this.trip;
    openTripSheet(
      this.d.duel,
      run,
      (a) => t.answer(a),
      () => t.status === "flying",
      () => {
        if (t.status === "programming") t.cancel();
      },
    );
  }

  /** Each frame, after the probe's physics ran at the trip's lapse. */
  update(dtS: number): void {
    const t = this.trip;
    const goal = t.goal;
    t.update(dtS);
    if (t.status === this.last) return;
    const say = (s: string) => this.d.probeMode.say(s, 8);
    if (t.status === "flying") say(`Plan cargado: la sonda vuela sola hacia ${goal ? ProbeTrip.goalName(goal) : ""}. Puedes hacer otras cosas; «Ver» la enseña en directo`);
    if (t.status === "arrived" && goal?.kind === "asteroid") say(`La sonda ha llegado a unos ${num(this.d.probe.flight.telemetry().distanceToSurface)} m de ${goal.body.data.name}: tienes los mandos, pósala a mano`);
    if (t.status === "arrived" && goal?.kind === "bay") say(`La sonda espera a ${num(this.d.probe.bayRange().distanceM)} m de la bahía: acércala a menos de 10 m para el brazo`);
    if (t.status === "manual" && this.last === "flying") say("Mando manual: el piloto automático de la sonda se ha desconectado");
    if (t.status === "failed") say(this.last === "flying" ? "Viaje interrumpido: la sonda se ha perdido" : "El plan no compila: vuela la sonda a mano o vuelve a programarlo");
    this.last = t.status;
  }
}
