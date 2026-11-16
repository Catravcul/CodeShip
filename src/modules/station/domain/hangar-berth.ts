/**
 * What would fit in the old hangar (backlog) and where the lander berths now: on a CBM, with
 * Canadarm2 (docs/design/estacion-real.md).
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

/** Where the lander is at the station: docked on its IDA, or berthed by Canadarm2 on Unity's nadir CBM. */
export type LanderPlace = "puerto" | "cbm";

/**
 * The lander at the station (docs/design/estacion-real.md, «Atraque con el brazo»): Canadarm2 can take
 * it from its docking port (IDA) and berth it on a CBM, as it berths Cygnus on Unity's nadir and as it
 * moved PMA-3 and the cargo ships between ports. There the ship bay works on it; its IDA hatch stays shut.
 */
export class LanderBerth {
  place: LanderPlace = "puerto";

  /** The arm berths it on the CBM; why not, if it cannot. */
  berth(atPort: boolean): string | undefined {
    if (this.place === "cbm") return "El módulo ya está atracado en el CBM";
    if (!atPort) return "El módulo no está acoplado a la estación: acóplalo en su IDA y el brazo lo atracará en el CBM";
    this.place = "cbm";
    return undefined;
  }

  /** The arm puts it back on its docking port (to fly, or to go back in through its hatch). */
  unberth(): string | undefined {
    if (this.place === "puerto") return "El módulo ya está en su puerto";
    this.place = "puerto";
    return undefined;
  }

  /** It left the station (undocked). */
  reset(): void {
    this.place = "puerto";
  }

  get onCbm(): boolean {
    return this.place === "cbm";
  }
}
