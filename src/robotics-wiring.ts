import type * as THREE from "three";
import { ExteriorWork } from "@modules/robotics/application/exterior-work";
import type { CargoResupply } from "@modules/life-support/application/cargo-resupply";
import type { LanderBerth } from "@modules/station/domain/hangar-berth";
import type { CargoAirlock } from "@modules/station/domain/cargo-airlock";
import { applyStationRefit, type StationComponentOption } from "@modules/station/application/station-refit";
import { STATION_COMPONENTS } from "@modules/station/data/outfit";
import type { Hangar } from "@modules/station/domain/hangar";
import type { StationOutfit } from "@modules/station/domain/outfit";
import { RoboticsGame } from "./robotics-game";
import { StationEva } from "./station-eva";
import type { StationInteriorMode } from "./station-interior";
import type { StationOutside } from "./station-outside";
import type { DuelView } from "./ui/duel-view";

/**
 * The arm and the spacewalk wired into the game (docs/design/brazo-robotico.md, paseo-espacial.md): one call
 * from main.ts, so the shared file only routes to these.
 */
export interface RoboticsWiringDeps {
  readonly root: HTMLElement;
  readonly scene: THREE.Scene;
  readonly stationRoot: THREE.Object3D;
  readonly duel: DuelView;
  readonly inside: StationInteriorMode;
  readonly outside: StationOutside;
  readonly cargo: CargoResupply;
  readonly berth: LanderBerth;
  readonly bishop: CargoAirlock;
  atPort(): boolean;
  landerMassKg(): number;
  /** The station's own components and the hangar the new part comes from (the old one goes back). */
  readonly outfit: StationOutfit;
  readonly hangar: Pick<Hangar, "count" | "take" | "put">;
  say(text: string, seconds?: number): void;
}

export function wireRobotics(d: RoboticsWiringDeps) {
  const work = new ExteriorWork();
  const robotics = new RoboticsGame({ duel: d.duel, outside: d.outside, inside: d.inside, cargo: d.cargo, berth: d.berth, bishop: d.bishop, work, atPort: d.atPort, landerMassKg: d.landerMassKg, say: d.say, root: d.root });
  const fitComponent = (id: string): string => {
    const c = STATION_COMPONENTS.find((x) => x.id === id);
    if (!c) return "Pieza desconocida";
    try {
      applyStationRefit(d.outfit, c, d.hangar);
    } catch {
      return "Falta la pieza en el hangar: no se ha cambiado nada";
    }
    return `Montado: ${c.name} · lo viejo va al hangar · la estación puede usar ${d.outfit.capacityKw.toLocaleString("es-ES")} kW`;
  };
  // Outside, what is said goes on her own line (the rest of the screen is hidden while she is out).
  const say = (text: string, seconds?: number) => (stationEva.active ? stationEva.say(text, seconds) : d.say(text, seconds));
  const stationEva: StationEva = new StationEva({ root: d.root, scene: d.scene, station: d.stationRoot, duel: d.duel, inside: d.inside, outside: d.outside, work, fitComponent, say });
  d.outside.cygnusOf = () => robotics.cygnusState();
  // A Cygnus berthed on its CBM until its stay ends: the next one flies once it is released.
  d.cargo.portBlocker = (id) => (id === "cygnus" ? robotics.cygnusOrderBlocker() : undefined);
  return {
    work,
    robotics,
    stationEva,
    /** A station component chosen at Unity's cargo laptop: a spacewalk from Quest, planned (ship-bay.ts). */
    planExterior(o: StationComponentOption): string {
      const r = work.planComponent(o.component.slot, o.component.id, o.component.name);
      return typeof r === "string" ? r : `Se cambia fuera: ${r.why}. Paseo planeado: ve a los trajes de Quest (está en Tareas)`;
    },
    /** Arm and spacewalk challenges started from the task list or a card. */
    startChore: (id: string) => robotics.startChore(id) || stationEva.startChore(id),
    taskFacts: () => [...robotics.taskFacts(), ...stationEva.taskFacts()],
    tick(hours: number): void {
      robotics.tick(hours);
      stationEva.tick(hours);
    },
  };
}
