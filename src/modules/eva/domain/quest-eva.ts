import type { Vec3 } from "@core/math/vec3";
import type { SuitSpec } from "../data/suit";
import type { RailPoint } from "../data/station-eva";
import { Suit, WORKLOAD } from "./suit";

/**
 * A spacewalk from Quest, step by step as on the ISS (docs/design/paseo-espacial.md, «Desde Quest»). Every
 * step only after the one before; the clock is the board's (minutes), so real durations pass compressed.
 *
 * dentro → (suit on) traje → prerrespirando (ISLE) → listo → despresurizando → fuera → represurizando → en-esclusa → (suit off) dentro
 *
 * Outside she moves along a handrail route on her waist tether; the safety tether's reel (25,9 m) is hooked
 * at an anchor and she cannot go farther than it lets her: at another anchor she swaps it. At the worksite her
 * feet go in the foot restraint (APFR) before the job; she takes them out to move.
 */
export type QuestEvaPhase = "dentro" | "traje" | "prerrespirando" | "listo" | "despresurizando" | "fuera" | "represurizando" | "en-esclusa";

export interface QuestEvaTimes {
  readonly prebreatheMin: number;
  readonly depressMin: number;
  readonly repressMin: number;
}

export class QuestEva {
  private _phase: QuestEvaPhase = "dentro";
  /** Board minutes left in the current timed phase. */
  private left = 0;
  /** Metres along the route. */
  private _s = 0;
  /** Index of the route point the safety tether is hooked to. */
  private _anchor = 0;
  private _feetIn = false;
  private _route: readonly RailPoint[] = [];
  private readonly cumul: number[] = [];
  /** Board minutes outside, this walk. */
  outsideMin = 0;
  readonly suit: Suit;

  constructor(
    readonly spec: SuitSpec,
    readonly times: QuestEvaTimes,
    readonly tetherM: number,
  ) {
    this.suit = new Suit(spec);
  }

  get phase(): QuestEvaPhase {
    return this._phase;
  }
  get minutesLeft(): number {
    return this.left;
  }
  get s(): number {
    return this._s;
  }
  get feetIn(): boolean {
    return this._feetIn;
  }
  get anchor(): number {
    return this._anchor;
  }
  get route(): readonly RailPoint[] {
    return this._route;
  }
  get length(): number {
    return this.cumul[this.cumul.length - 1] ?? 0;
  }
  /** Safety tether paid out from its anchor, m (along the handrails). */
  get tetherOut(): number {
    return this._s - (this.cumul[this._anchor] ?? 0);
  }
  /** At the worksite (the route's end). */
  get atWorksite(): boolean {
    return this._phase === "fuera" && this._s >= this.length - 0.05;
  }
  /** At the hatch (the route's start). */
  get atHatch(): boolean {
    return this._phase === "fuera" && this._s <= 0.05;
  }
  /** The route point she is at (within 0,5 m), if any. */
  get atPoint(): number | undefined {
    const i = this.cumul.findIndex((c) => Math.abs(c - this._s) < 0.5);
    return i < 0 ? undefined : i;
  }

  /** Where she is, between two route points. */
  position(): Vec3 {
    const r = this._route;
    if (!r.length) throw new Error("No route");
    let i = 0;
    while (i < r.length - 2 && this.cumul[i + 1]! < this._s) i++;
    const a = r[i]!.at;
    const b = r[Math.min(i + 1, r.length - 1)]!.at;
    const seg = this.cumul[i + 1]! - this.cumul[i]!;
    const f = seg > 0 ? Math.min(1, Math.max(0, (this._s - this.cumul[i]!) / seg)) : 0;
    return a.add(b.sub(a).scale(f));
  }

  /** The direction along the route where she is (towards the worksite). */
  heading(): Vec3 {
    const r = this._route;
    let i = 0;
    while (i < r.length - 2 && this.cumul[i + 1]! < this._s) i++;
    return r[Math.min(i + 1, r.length - 1)]!.at.sub(r[i]!.at).normalize();
  }

  /** The EMU is on (the donning chore was done). */
  suitUp(): string | undefined {
    if (this._phase !== "dentro") return "Ya llevas el traje";
    this._phase = "traje";
    return undefined;
  }
  /** Start the ISLE prebreathe (mask, then in the suit with light exercise). */
  prebreathe(): string | undefined {
    if (this._phase !== "traje") return this._phase === "dentro" ? "Primero ponte el traje" : "Ya has prerrespirado";
    this._phase = "prerrespirando";
    this.left = this.times.prebreatheMin;
    return undefined;
  }
  /** Depress the crew lock (only with the nitrogen out of her blood). */
  depress(): string | undefined {
    if (this._phase === "prerrespirando") return `Aún no: quedan ${Math.ceil(this.left)} min de prerrespiración`;
    if (this._phase !== "listo") return "Primero el traje y la prerrespiración";
    this._phase = "despresurizando";
    this.left = this.times.depressMin;
    return undefined;
  }

  /** Out on route `route` (the job's): hooked at the hatch. */
  egress(route: readonly RailPoint[]): string | undefined {
    if (this._phase !== "fuera") return this._phase === "despresurizando" ? "La esclusa aún tiene aire" : "La esclusa no está vacía";
    this._route = route;
    this.cumul.length = 0;
    let c = 0;
    route.forEach((p, i) => {
      if (i > 0) c += p.at.sub(route[i - 1]!.at).length();
      this.cumul.push(c);
    });
    this._s = 0;
    this._anchor = 0;
    this._feetIn = false;
    this.outsideMin = 0;
    return undefined;
  }

  /** Hand over hand: `ds` metres along the route (negative: back). Why she stops, if she does. */
  move(ds: number): string | undefined {
    if (this._phase !== "fuera") return "Solo fuera";
    if (this._feetIn) return "Primero saca los pies del APFR";
    const anchorAt = this.cumul[this._anchor] ?? 0;
    let to = Math.max(0, Math.min(this.length, this._s + ds));
    let why: string | undefined;
    if (to - anchorAt > this.tetherM) {
      to = anchorAt + this.tetherM;
      why = `El cable de seguridad no da más (${fmt(this.tetherM)} m): cámbialo de anclaje en un punto de anclaje`;
    }
    // Back behind the anchor, the reel winds in: she unhooks it as she passes (it goes back with her).
    if (to < anchorAt - 0.25) {
      let back = 0;
      for (let i = 0; i < this._anchor; i++) if (this._route[i]?.anchor && this.cumul[i]! <= to + 1e-9) back = i;
      this._anchor = back;
    }
    this._s = to;
    return why;
  }

  /** Hook the safety tether at the anchor she is at (her waist tether stays on the handrail meanwhile). */
  swapTether(): string | undefined {
    const i = this.atPoint;
    if (this._phase !== "fuera" || i === undefined || !this._route[i]?.anchor) return "Aquí no hay punto de anclaje";
    if (i === this._anchor) return "El cable ya está enganchado aquí";
    this._anchor = i;
    // She reaches the anchor's ring to hook it: she is at it.
    this._s = this.cumul[i]!;
    return undefined;
  }

  /** Feet in (or out of) the APFR at the worksite. */
  setFeet(on: boolean): string | undefined {
    if (on && !this.atWorksite) return "El APFR está en el sitio de trabajo";
    this._feetIn = on;
    return undefined;
  }

  /** Back in through the hatch: it closes and the crew lock fills. */
  ingress(): string | undefined {
    if (!this.atHatch) return "Vuelve a la escotilla";
    this._phase = "represurizando";
    this.left = this.times.repressMin;
    this._route = [];
    return undefined;
  }
  /** Suit off in the equipment lock: its consumables are recharged. */
  doff(): string | undefined {
    if (this._phase !== "en-esclusa" && this._phase !== "traje" && this._phase !== "listo") return "Aún no puedes quitártelo";
    this._phase = "dentro";
    this.suit.recharge();
    return undefined;
  }

  /** Board minutes pass. `work`: she is working or moving (metabolic load), outside only. */
  tick(minutes: number, work = false): void {
    if (minutes <= 0) return;
    if (this._phase === "prerrespirando" || this._phase === "despresurizando" || this._phase === "represurizando") {
      this.left = Math.max(0, this.left - minutes);
      if (this.left === 0) this._phase = this._phase === "prerrespirando" ? "listo" : this._phase === "despresurizando" ? "fuera" : "en-esclusa";
    }
    // The suit's own consumables count from the depress on (before it the umbilical feeds it from the station).
    if (this._phase === "fuera" || this._phase === "despresurizando") {
      this.suit.tick(minutes * 60, work ? WORKLOAD.crawl : WORKLOAD.rest);
      if (this._phase === "fuera") this.outsideMin += minutes;
    }
  }
}

const fmt = (x: number) => (Math.round(x * 10) / 10).toLocaleString("es-ES");
