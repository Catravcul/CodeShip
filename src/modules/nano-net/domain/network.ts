import type { Vec3 } from "@core/math/vec3";
import { NANO_TUNING, NO_EFFECTS, NanoCore, type Fault, type NetEffects, type RemoteNet } from "./core";

/** Where a core can be planted: a persuaded asteroid. */
export interface CoreSite {
  readonly id: string;
  readonly name: string;
  readonly position: Vec3;
  readonly radiusM: number;
}

/** Every core the player has planted, plus the networks others built that a core may link to. */
export class NanoNet {
  private readonly _cores = new Map<string, NanoCore>();

  constructor(readonly remotes: readonly RemoteNet[] = []) {}

  get cores(): readonly NanoCore[] {
    return [...this._cores.values()];
  }
  core(siteId: string): NanoCore | undefined {
    return this._cores.get(siteId);
  }

  /** Turn a persuaded asteroid into a core. */
  plant(site: CoreSite): NanoCore {
    if (this._cores.has(site.id)) throw new Error(`${site.name} is already a core`);
    const c = new NanoCore(site.id, site.name, site.position, site.radiusM);
    this._cores.set(site.id, c);
    return c;
  }

  /** The closest other network a core could link to, if any is in range. */
  remoteInRange(core: NanoCore): RemoteNet | undefined {
    const d = (r: RemoteNet) => r.position.sub(core.position).length();
    return [...this.remotes].sort((a, b) => d(a) - d(b)).find((r) => d(r) <= NANO_TUNING.netLinkRangeM);
  }

  /** What the networks give at a point: the best of each effect among the cores that cover it. */
  effectsAt(p: Vec3): NetEffects {
    let out = NO_EFFECTS;
    for (const c of this._cores.values()) {
      const fx = c.effectsAt(p);
      if (!fx.covered) continue;
      out = {
        covered: true,
        energyKw: out.energyKw + fx.energyKw,
        safety: Math.max(out.safety, fx.safety),
        warpFactor: Math.max(out.warpFactor, fx.warpFactor),
      };
    }
    return out;
  }

  faults(): Fault[] {
    return this.cores.flatMap((c) => c.faults());
  }

  tick(dtDays: number, rng: () => number): Fault[] {
    return this.cores.flatMap((c) => c.tick(dtDays, rng));
  }
}
