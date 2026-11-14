/**
 * What goes inside the hangar and what docks outside (docs/design/estacion-tripulacion.md, «Hangar»).
 * The station's arm can lift the lander from its docking port into the hangar, as Canadarm2 lifts a
 * Dragon or an HTV from its capture point to its berth; there the ship bay works on it.
 */

/** The box a craft takes, m (its longest reach, rings and legs included), and its mass, kg. */
export interface CraftEnvelope {
  readonly id: string;
  readonly name: string;
  readonly lengthM: number;
  readonly widthM: number;
  readonly heightM: number;
  readonly massKg: number;
  readonly basis: string;
}

/** The hangar's free space, m. */
export interface HangarSize {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Whether a craft fits through the door and inside, with `marginM` all round: its three sizes, largest
 * first, against the hangar's three sizes, largest first (it can be turned any way in free fall).
 */
export function fitsInHangar(c: CraftEnvelope, h: HangarSize, marginM = 1): boolean {
  const craft = [c.lengthM, c.widthM, c.heightM].sort((a, b) => b - a);
  const room = [h.x, h.y, h.z].sort((a, b) => b - a);
  return craft.every((d, i) => d + 2 * marginM <= room[i]!);
}

/** How many times the hangar's longest side the craft is. */
export const overHangar = (c: CraftEnvelope, h: HangarSize): number => Math.max(c.lengthM, c.widthM, c.heightM) / Math.max(h.x, h.y, h.z);

export type LanderPlace = "puerto" | "hangar";

/** Where the lander is while it is at the station: on its docking port, or berthed in the hangar. */
export class LanderBerth {
  place: LanderPlace = "puerto";

  /** The arm takes it into the hangar; why not, if it cannot. */
  moveIn(atPort: boolean): string | undefined {
    if (this.place === "hangar") return "El módulo ya está en el hangar";
    if (!atPort) return "El módulo no está acoplado a la estación: acóplalo en su puerto y el brazo lo meterá aquí";
    this.place = "hangar";
    return undefined;
  }

  /** The arm puts it back on its port (to fly, or to go back in through its hatch). */
  moveOut(): string | undefined {
    if (this.place === "puerto") return "El módulo ya está en su puerto";
    this.place = "puerto";
    return undefined;
  }

  /** It left the station (undocked): nothing in the hangar any more. */
  reset(): void {
    this.place = "puerto";
  }

  get inHangar(): boolean {
    return this.place === "hangar";
  }
}
