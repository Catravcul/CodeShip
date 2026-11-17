import type * as THREE from "three";
import { ExteriorWork } from "@modules/robotics/application/exterior-work";
import type { CargoResupply } from "@modules/life-support/application/cargo-resupply";
import type { LanderBerth } from "@modules/station/domain/hangar-berth";
import type { CargoAirlock } from "@modules/station/domain/cargo-airlock";
import { applyStationRefit, type StationComponentOption } from "@modules/station/application/station-refit";
import { STATION_COMPONENTS } from "@modules/station/data/outfit";
import type { Hangar } from "@modules/station/domain/hangar";
import type { StationOutfit } from "@modules/station/domain/outfit";
import { Vec3 } from "@core/math/vec3";
import { EVA_ROUTES, STARSHIP_SITES, landerRoute, starshipHull, starshipRoute, type EvaSite, type StationSite, type VehicleSite } from "@modules/eva/data/station-eva";
import { RoboticsGame } from "./robotics-game";
import { StationEva, type EvaBase, type Hulls } from "./station-eva";
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
  /** Where the lander sits at the station, if it is here. */
  landerAt(): "ida" | "cbm" | undefined;
  /** The Starship's decks (real ships): its airlock and suits (HLS, en desarrollo). */
  readonly starship?: StationInteriorMode;
  /** The Starship's nose on the forward IDA (station frame), when it is berthed there. */
  starshipNose(): Vec3 | undefined;
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
  const say = (text: string, seconds?: number) => (stationEva.active ? stationEva.say(text, seconds) : starshipEva?.active ? starshipEva.say(text, seconds) : d.say(text, seconds));
  // What is outside besides the station: the lander on its port, the Starship berthed nose-on.
  const hulls = (): Hulls => {
    const at = d.landerAt();
    const nose = d.starshipNose();
    return { cylinders: nose ? starshipHull(nose) : [], boxes: at ? [d.outside.landerBox(at)] : [] };
  };
  const onStarship = (s: EvaSite) => STARSHIP_SITES.includes(s);
  const quest: EvaBase = {
    name: "Quest",
    suits: "trajes",
    hatch: "escotilla-eva",
    serves: (s) => !onStarship(s),
    route: (s) => {
      if (s !== "modulo") return EVA_ROUTES[s as StationSite];
      const at = d.landerAt();
      return at ? landerRoute(at, d.outside.landerBox(at)) : "El módulo no está en la estación: el paseo se hace con él en su puerto";
    },
    hulls,
  };
  const stationEva: StationEva = new StationEva({ root: d.root, scene: d.scene, station: d.stationRoot, duel: d.duel, inside: d.inside, outside: d.outside, work, base: quest, fitComponent, say });
  // The Starship's own crew airlock (HLS, en desarrollo): its spacewalks go out from there, with it berthed.
  const starshipEva: StationEva | undefined = d.starship
    ? new StationEva({
        root: d.root,
        scene: d.scene,
        station: d.stationRoot,
        duel: d.duel,
        inside: d.starship,
        outside: d.outside,
        work,
        base: {
          name: "la Starship",
          suits: "esclusa",
          hatch: "esclusa",
          serves: onStarship,
          route: (s) => {
            const nose = d.starshipNose();
            return nose ? starshipRoute(s as "nodriza-motores" | "nodriza-energia", nose) : "La Starship no está atracada en la estación: este paseo se hace con ella atracada";
          },
          hulls,
        },
        fitComponent,
        say,
      })
    : undefined;
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
    starshipEva,
    /**
     * A vehicle's outside part chosen at the bay: a spacewalk, from Quest to the lander or from the Starship's
     * airlock, never a swap at the bay (docs/design/paseo-espacial.md, «Piezas de fuera de las naves»).
     */
    planVehicle(site: VehicleSite, name: string, apply: () => string): string | undefined {
      // The ring ship (fiction) has no airlock of this kind: its work stays at the bay.
      if (onStarship(site) && !starshipEva) return undefined;
      const r = work.planVehicle(site, name, apply);
      if (typeof r === "string") return r;
      return `Se cambia fuera: ${r.why}. Paseo planeado: ve a los trajes ${onStarship(site) ? "de la cubierta 3 de la Starship" : "de Quest"} (está en Tareas)`;
    },
    /** Arm and spacewalk challenges started from the task list or a card. */
    startChore: (id: string) => robotics.startChore(id) || stationEva.startChore(id),
    /** The station's spacewalks and arm jobs (the Starship's are on its own decks: `starshipEva`). */
    taskFacts: () => [...robotics.taskFacts(), ...stationEva.taskFacts()],
    /** Someone is outside (the main loop draws her camera). */
    get evaOut(): StationEva | undefined {
      return stationEva.active ? stationEva : starshipEva?.active ? starshipEva : undefined;
    },
    tick(hours: number): void {
      robotics.tick(hours);
      stationEva.tick(hours);
      starshipEva?.tick(hours);
    },
  };
}
