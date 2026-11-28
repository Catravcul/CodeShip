import { Vec3 } from "@core/math/vec3";

/**
 * Canadarm2 as a state machine (docs/design/brazo-robotico.md): one LEE latched to a PDGF is the base (power,
 * data and video come through it), the other end works. It walks end over end: the free LEE latches a PDGF
 * within reach and the old base lets go. On the MBS it rides the truss rails. It grabs what has a grapple
 * fixture, as long as it is within reach and not too heavy. Rules from the real arm; positions in the station
 * frame (metres). No engine here.
 */

export interface ArmFixture {
  readonly id: string;
  readonly kind: "pdgf" | "frgf";
  readonly at: Vec3;
  readonly onMbs?: boolean;
}

export interface ArmSpec {
  readonly lengthM: number;
  readonly maxPayloadKg: number;
  /** Rail limits of the MBS along x, m. */
  readonly rail: { readonly minX: number; readonly maxX: number };
  /** MBS speed, m per board minute. */
  readonly mbsMPerMin: number;
}

/** What the arm holds: a fixture's payload (Dextre, the Bishop, a vehicle, an ORU box). */
export interface Held {
  readonly id: string;
  readonly massKg: number;
}

export class Canadarm2 {
  private _base: string;
  private _held: Held | null = null;
  /** MBS position along the rails (x offset from where its fixtures are listed). */
  private _mbsX = 0;
  private readonly fixtures = new Map<string, ArmFixture>();

  constructor(
    readonly spec: ArmSpec,
    fixtures: readonly ArmFixture[],
    base: string,
  ) {
    for (const f of fixtures) this.fixtures.set(f.id, f);
    if (this.fixture(base).kind !== "pdgf") throw new Error(`Base ${base} is not a PDGF`);
    this._base = base;
  }

  fixture(id: string): ArmFixture {
    const f = this.fixtures.get(id);
    if (!f) throw new Error(`No fixture ${id}`);
    return f;
  }

  get base(): string {
    return this._base;
  }
  get held(): Held | null {
    return this._held;
  }
  get mbsX(): number {
    return this._mbsX;
  }
  /** On one of the MBS's PDGFs: it rides the rails. */
  get onMbs(): boolean {
    return !!this.fixture(this._base).onMbs;
  }

  /** Where a fixture is now (the MBS's ride along the truss). */
  where(id: string): Vec3 {
    const f = this.fixture(id);
    return f.onMbs ? f.at.add(new Vec3(this._mbsX, 0, 0)) : f.at;
  }

  /** The base, now. */
  get basePoint(): Vec3 {
    return this.where(this._base);
  }

  /** Within reach of the free LEE from the base (the arm's length; booms, not a sphere, in reality). */
  reaches(p: Vec3): boolean {
    return p.sub(this.basePoint).length() <= this.spec.lengthM + 1e-9;
  }

  /** Walk off: the free LEE latches PDGF `to` and the base lets go (end over end). Why not, if it cannot. */
  walkTo(to: string): string | undefined {
    const f = this.fixtures.get(to);
    if (!f) return `No hay accesorio ${to}`;
    if (f.kind !== "pdgf") return "Solo puede apoyarse en un PDGF: un FRGF agarra, pero no da corriente ni datos";
    if (this._held) return "Primero suelta lo que lleva: para andar, la punta libre tiene que agarrar el PDGF";
    if (to === this._base) return "Ya está apoyado ahí";
    if (!this.reaches(this.where(to))) return `No llega: está a ${num(this.where(to).sub(this.basePoint).length())} m y el brazo mide ${num(this.spec.lengthM)} m`;
    this._base = to;
    return undefined;
  }

  /** Ride the MBS to x (along the truss). Board minutes it takes, or why not. */
  rideTo(x: number): number | string {
    if (!this.onMbs) return "El brazo no está sobre la MBS: anda primero hasta uno de sus PDGF";
    const to = Math.max(this.spec.rail.minX, Math.min(this.spec.rail.maxX, x));
    const minutes = Math.abs(to - this._mbsX) / this.spec.mbsMPerMin;
    this._mbsX = to;
    return minutes;
  }

  /** Grab what is at `at` by its fixture. Why not, if it cannot. */
  grab(item: Held, at: Vec3): string | undefined {
    if (this._held) return `Ya lleva ${this._held.id}`;
    if (item.massKg > this.spec.maxPayloadKg) return `Pesa ${Math.round(item.massKg / 1000)} t: el brazo mueve hasta ${Math.round(this.spec.maxPayloadKg / 1000)} t`;
    if (!this.reaches(at)) return `No llega: a ${num(at.sub(this.basePoint).length())} m, y el brazo mide ${num(this.spec.lengthM)} m`;
    this._held = item;
    return undefined;
  }

  /** Let go of what it holds (berthed, stowed or released). */
  release(): Held | null {
    const h = this._held;
    this._held = null;
    return h;
  }
}

const num = (x: number) => (Math.round(x * 10) / 10).toLocaleString("es-ES");
