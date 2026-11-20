import { Vec3 } from "@core/math/vec3";

/**
 * Game values for the nano_net (canon from Berón, 2026-11-12). None of them is real data: the
 * nano_net is fiction. Real numbers enter through the core's asteroid (radius, mass, μ) in the
 * challenges. Everything here is **tuning** (ajuste de juego).
 */
export const NANO_TUNING = {
  /** Nodes a core learns to grow in its first stage. */
  firstNodes: 3,
  /** Height above the core's surface where newborn nodes wait, m. */
  bornAltitudeM: 40,
  /** Height of the parking ring the core moves its nodes to, m above the surface. */
  ringAltitudeM: 600,
  /** Radius each working node covers, m. */
  nodeRangeM: 600,
  /** Longest link between two nodes, or between a node and the core's surface, m. */
  linkRangeM: 700,
  /** Longest link between two networks, m. */
  netLinkRangeM: 60_000,
  /** Before the mesh each node only talks to the core and gives this fraction of its effect. Meshed, the network pools everything. */
  unmeshedFactor: 0.5,
  /** Power each energy node beams to a ship inside its range, kW. */
  energyKwPerNode: 2,
  /** Fraction of jolts and debris each shield node absorbs. */
  safetyPerNode: 0.15,
  maxSafety: 0.6,
  /** Extra time-warp each speed node allows (×1 → ×1.25). */
  warpPerNode: 0.25,
  maxWarpFactor: 3,
  /** Extra warp once the network is linked to another one (a corridor). */
  linkedWarpBonus: 0.5,
  /** Below this health a node or a core's program is broken. */
  brokenBelow: 0.5,
  /** Slow wear of every node (micrometeoroids, radiation), health per day. */
  wearPerDay: 0.02,
  /** Chance per node per day of a hit that breaks it. */
  hitRatePerDay: 0.03,
  hitDamage: 0.6,
  /** Chance per day that the core's program corrupts itself. */
  programFaultRatePerDay: 0.02,
  /** Health left in a corrupted program. */
  corruptedProgram: 0.3,
  /** Hull fraction the ship's maintenance drones restore per kW·h of beamed energy. */
  hullRepairPerKwH: 0.01,
} as const;

export const STAGES = ["generar", "mover", "cubrir", "enlazar"] as const;
/** What a core learns, in order: grow nodes, move them, link them to cover an area, link to another network. */
export type Stage = (typeof STAGES)[number];

export type NodeRole = "energia" | "escudo" | "impulso";
const ROLES: readonly NodeRole[] = ["energia", "escudo", "impulso"];

/** Another nano_net a core can link to. */
export interface RemoteNet {
  readonly id: string;
  readonly name: string;
  readonly position: Vec3;
}

export type FaultTarget = "nodo" | "programa";
export interface Fault {
  readonly id: string;
  readonly coreId: string;
  readonly target: FaultTarget;
  readonly nodeId?: string;
}

/** What the network gives a ship at one point. */
export interface NetEffects {
  readonly covered: boolean;
  /** Power beamed to the ship, kW. */
  readonly energyKw: number;
  /** Fraction of jolts and debris absorbed (0–maxSafety). */
  readonly safety: number;
  /** Multiplier on the time warp the pilot asks for (≥ 1). */
  readonly warpFactor: number;
}

export const NO_EFFECTS: NetEffects = { covered: false, energyKw: 0, safety: 0, warpFactor: 1 };

export class NanoNode {
  private _health = 1;
  constructor(
    readonly id: string,
    readonly role: NodeRole,
    /** World position, m. */
    public position: Vec3,
  ) {}
  get health(): number {
    return this._health;
  }
  get working(): boolean {
    return this._health >= NANO_TUNING.brokenBelow;
  }
  damage(amount: number): void {
    this._health = Math.max(0, this._health - amount);
  }
  repair(): void {
    this._health = 1;
  }
}

/** Nodes needed so the arc between neighbours on a ring is never longer than a link. */
export function ringNodeCount(ringRadiusM: number, linkRangeM: number): number {
  return Math.ceil((2 * Math.PI * ringRadiusM) / linkRangeM);
}

/**
 * Point on the core's ring: a polar ring (YZ plane) that passes over both poles, where the spin is
 * slowest and ships land, so a ship anchored there sits under the network.
 */
const onRing = (center: Vec3, r: number, i: number, n: number) => {
  const a = (2 * Math.PI * i) / n;
  return center.add(new Vec3(0, Math.sin(a) * r, Math.cos(a) * r));
};

/** Poisson event with `ratePerDay` during `dtDays`. */
const happens = (rng: () => number, ratePerDay: number, dtDays: number) => rng() < 1 - Math.exp(-ratePerDay * dtDays);

/**
 * A nano_net core: an asteroid, persuaded and then programmed in stages, that grows nodes, moves
 * them through space, links them to cover an area and finally links its network to another one.
 * Its program and its nodes break over time or after jolts; repairs are done landed on it.
 */
export class NanoCore {
  private readonly _learned: Stage[] = [];
  private readonly _nodes: NanoNode[] = [];
  private _links: [string, string][] = [];
  private _program = 1;
  private _linkedTo: RemoteNet | undefined;
  /** Faults already reported, so tick() only returns new ones. */
  private readonly reported = new Set<string>();

  constructor(
    readonly id: string,
    readonly name: string,
    readonly position: Vec3,
    readonly radiusM: number,
  ) {}

  get learned(): readonly Stage[] {
    return this._learned;
  }
  get nextStage(): Stage | undefined {
    return STAGES[this._learned.length];
  }
  get nodes(): readonly NanoNode[] {
    return this._nodes;
  }
  /** Node-to-node links (the mesh). Every node also has a beam to the core while in range. */
  get links(): readonly (readonly [string, string])[] {
    return this._links;
  }
  get meshed(): boolean {
    return this._learned.includes("cubrir");
  }
  get linkedTo(): RemoteNet | undefined {
    return this._linkedTo;
  }
  get programHealth(): number {
    return this._program;
  }
  get programWorking(): boolean {
    return this._program >= NANO_TUNING.brokenBelow;
  }
  get ringRadiusM(): number {
    return this.radiusM + NANO_TUNING.ringAltitudeM;
  }

  learn(stage: Stage, remote?: RemoteNet): void {
    if (stage !== this.nextStage) throw new Error(`Core ${this.id} cannot learn ${stage} now (next: ${this.nextStage})`);
    if (!this.programWorking) throw new Error(`Core ${this.id}: repair its program first`);
    const T = NANO_TUNING;
    switch (stage) {
      case "generar":
        for (let i = 0; i < T.firstNodes; i++)
          this._nodes.push(new NanoNode(`${this.id}-n${i + 1}`, ROLES[i % ROLES.length]!, onRing(this.position, this.radiusM + T.bornAltitudeM, i, T.firstNodes)));
        break;
      case "mover":
        this._nodes.forEach((n, i) => (n.position = onRing(this.position, this.ringRadiusM, i, this._nodes.length)));
        break;
      case "cubrir": {
        const count = ringNodeCount(this.ringRadiusM, T.linkRangeM);
        for (let i = this._nodes.length; i < count; i++) this._nodes.push(new NanoNode(`${this.id}-n${i + 1}`, ROLES[i % ROLES.length]!, this.position));
        this._nodes.forEach((n, i) => (n.position = onRing(this.position, this.ringRadiusM, i, count)));
        this._links = this._nodes.map((n, i) => [n.id, this._nodes[(i + 1) % count]!.id]);
        break;
      }
      case "enlazar":
        if (!remote || remote.position.sub(this.position).length() > T.netLinkRangeM) throw new Error(`No network in range of ${this.id}`);
        this._linkedTo = remote;
        break;
    }
    this._learned.push(stage);
  }

  /** Distance from the core's surface to a point, m. */
  private fromSurface(p: Vec3): number {
    return Math.max(0, p.sub(this.position).length() - this.radiusM);
  }

  /** Working nodes reachable from the core through beams and mesh links. Nothing if the program is broken. */
  connectedNodes(): NanoNode[] {
    if (!this.programWorking) return [];
    const T = NANO_TUNING;
    const working = this._nodes.filter((n) => n.working);
    const seen = new Set(working.filter((n) => this.fromSurface(n.position) <= T.linkRangeM).map((n) => n.id));
    const byId = new Map(working.map((n) => [n.id, n]));
    let grew = true;
    while (grew) {
      grew = false;
      for (const [a, b] of this._links) {
        const na = byId.get(a);
        const nb = byId.get(b);
        if (!na || !nb || na.position.sub(nb.position).length() > T.linkRangeM) continue;
        if (seen.has(a) !== seen.has(b)) {
          seen.add(a);
          seen.add(b);
          grew = true;
        }
      }
    }
    return working.filter((n) => seen.has(n.id));
  }

  effectsAt(p: Vec3): NetEffects {
    const T = NANO_TUNING;
    const connected = this.connectedNodes();
    const near = connected.filter((n) => n.position.sub(p).length() <= T.nodeRangeM);
    if (near.length === 0) return NO_EFFECTS;
    // Once meshed, the whole network pools what it gives: any node in range hands it all over.
    const from = this.meshed ? connected : near;
    const k = this.meshed ? 1 : T.unmeshedFactor;
    const sum = (role: NodeRole, per: number) => from.filter((n) => n.role === role).reduce((s, n) => s + per * n.health * k, 0);
    const warp = 1 + sum("impulso", T.warpPerNode) + (this._linkedTo ? T.linkedWarpBonus : 0);
    return {
      covered: true,
      energyKw: sum("energia", T.energyKwPerNode),
      safety: Math.min(T.maxSafety, sum("escudo", T.safetyPerNode)),
      warpFactor: Math.min(T.maxWarpFactor, warp),
    };
  }

  faults(): Fault[] {
    const out: Fault[] = [];
    if (this._nodes.length && !this.programWorking) out.push({ id: `programa-${this.id}`, coreId: this.id, target: "programa" });
    for (const n of this._nodes) if (!n.working) out.push({ id: `nodo-${n.id}`, coreId: this.id, target: "nodo", nodeId: n.id });
    return out;
  }

  repair(faultId: string): void {
    if (faultId === `programa-${this.id}`) this._program = 1;
    else {
      const n = this._nodes.find((x) => `nodo-${x.id}` === faultId);
      if (!n) throw new Error(`Unknown fault ${faultId}`);
      n.repair();
    }
    this.reported.delete(faultId);
  }

  corruptProgram(): void {
    this._program = Math.min(this._program, NANO_TUNING.corruptedProgram);
  }

  /** Wear and random hits over `dtDays`. Returns faults that are new. */
  tick(dtDays: number, rng: () => number): Fault[] {
    const T = NANO_TUNING;
    if (this._nodes.length === 0) return [];
    for (const n of this._nodes) {
      n.damage(T.wearPerDay * dtDays);
      if (happens(rng, T.hitRatePerDay, dtDays)) n.damage(T.hitDamage);
    }
    if (happens(rng, T.programFaultRatePerDay, dtDays)) this.corruptProgram();
    return this.fresh();
  }

  /** A jolt near the core (an enraged asteroid, a collision): strong ones corrupt the program and hit a node. */
  jolt(severity: number, rng: () => number): Fault[] {
    if (this._nodes.length === 0 || severity < 0.5) return [];
    this.corruptProgram();
    this._nodes[Math.floor(rng() * this._nodes.length)]!.damage(0.3 + 0.4 * severity);
    return this.fresh();
  }

  private fresh(): Fault[] {
    const out = this.faults().filter((f) => !this.reported.has(f.id));
    for (const f of out) this.reported.add(f.id);
    return out;
  }
}
