import type * as THREE from "three";
import type { S1Layout } from "@modules/sanctuary-one/data/layout";
import type { Body } from "@modules/aerial-sanctuary/domain/walk";
import { rideAt, slideMouth, startRide, stepRide, type Ride } from "@modules/sanctuary-one/domain/tobogan";
import { canTake, carrying, drop, hit, newWar, score, take, tick, type War } from "@modules/sanctuary-one/domain/guerra-almohadas";

/**
 * The Residencia's crown at play (Berón 2026-11-24): its real slides (domain/tobogan.ts), sat down and carried by
 * gravity from the mouth to the pillow ring, and the pillow war (domain/guerra-almohadas.ts): each castle keeps its
 * team's treasure; she takes the others' to hers, the castles' defenders throw pillows at her while she is in theirs.
 * Her team is the first castle's (Rojo), where the first aposentos are.
 */
const ME = "ella";
export const MY_TEAM = "rojo";

type Crown = NonNullable<S1Layout["towers"][number]["cima"]>;

export class CrownPlay {
  private readonly crown?: Crown;
  private readonly slides: { path: Crown["castles"][number]["slides"][number] }[] = [];
  private ride?: Ride;
  private again = 0;
  private war?: War;
  private raid = 0;
  /** Where a dropped treasure lies (on the floor). */
  private readonly lying = new Map<string, { x: number; y: number; z: number }>();
  private readonly chests = new Map<string, THREE.Object3D>();

  constructor(L: S1Layout, root: THREE.Object3D, private readonly say: (t: string, s?: number) => void) {
    this.crown = L.towers.find((t) => t.cima)?.cima;
    if (!this.crown) return;
    for (const c of this.crown.castles) {
      for (const p of c.slides) this.slides.push({ path: p });
      const m = root.getObjectByName(`tesoro-${c.team}`);
      if (m) this.chests.set(c.team, m);
    }
  }

  get riding(): boolean {
    return !!this.ride;
  }

  private castleOf(x: number, z: number): string | undefined {
    return this.crown?.castles.find((c) => x >= c.rect.x0 && x <= c.rect.x1 && z >= c.rect.z0 && z <= c.rect.z1)?.team;
  }

  private on(b: Body): boolean {
    return !!this.crown && b.area === this.crown.area;
  }

  /** At a slide's mouth (walking into it): she sits and goes. */
  tryEnter(b: Body, moving: boolean): boolean {
    if (this.ride || this.again > 0 || !moving || !this.on(b)) return false;
    const s = slideMouth(this.slides, b.x, b.y, b.z, 1.2);
    if (!s) return false;
    this.ride = startRide(s.path);
    return true;
  }

  /** While on a slide: where she is (her body moved along it); undefined once she is out. */
  rideFrame(dt: number, b: Body): { body: Body; yaw: number } | undefined {
    if (!this.ride) return undefined;
    this.ride = stepRide(this.ride, dt);
    const at = rideAt(this.ride);
    if (at.done) {
      this.ride = undefined;
      this.again = 1.5;
    }
    return { body: { ...b, x: at.x, y: at.y, z: at.z, motion: "gravedad" }, yaw: at.yaw + Math.PI };
  }

  /** What she can do with the treasures where she stands, if anything. */
  offer(b: Body): { label: string; run: () => void } | undefined {
    if (!this.on(b) || !this.crown) return undefined;
    const near = (p: { x: number; y: number; z: number }) => Math.hypot(p.x - b.x, p.z - b.z) < 2.2 && Math.abs(p.y - b.y) < 1.5;
    const name = (team: string) => this.crown!.castles.find((c) => c.team === team)!.name;
    const home = this.crown.castles.find((c) => c.team === MY_TEAM)!;
    if (!this.war || this.war.winner) {
      if (near(home.treasure)) return { label: "Empezar la guerra de almohadas (5 min)", run: () => this.start() };
      return undefined;
    }
    const w = this.war;
    const mine = carrying(w, ME);
    if (mine) {
      const here = this.castleOf(b.x, b.z);
      if (here === MY_TEAM) return { label: `Dejar el tesoro de ${name(mine.id)} en el castillo`, run: () => this.put(drop(w, ME, MY_TEAM)) };
      return undefined;
    }
    for (const t of w.treasures) {
      if (!canTake(w, MY_TEAM, t.id)) continue;
      const p = this.where(t.id);
      if (p && near(p)) return { label: `Coger el tesoro de ${name(t.id)}`, run: () => this.put(take(w, ME, MY_TEAM, t.id)) };
    }
    return undefined;
  }

  private start(): void {
    this.war = newWar(this.crown!.castles.map((c) => c.team));
    this.lying.clear();
    this.say("¡Guerra de almohadas! Trae a tu castillo los tesoros de los otros tres", 4);
  }

  private put(w: War): void {
    const before = this.war;
    this.war = w;
    if (w.winner && w.winner !== before?.winner) this.say(w.winner === "empate" ? "Empate" : `Gana ${this.crown!.castles.find((c) => c.team === w.winner)!.name}`, 5);
  }

  /** Where a treasure is now (if not carried). */
  private where(id: string): { x: number; y: number; z: number } | undefined {
    const t = this.war?.treasures.find((q) => q.id === id);
    if (!t || t.carrier) return undefined;
    if (!t.castle) return this.lying.get(id);
    const c = this.crown!.castles.find((k) => k.team === t.castle)!;
    // In its castle: beside the others kept there.
    const kept = this.war!.treasures.filter((q) => q.castle === t.castle && !q.carrier);
    const i = kept.indexOf(t);
    return { x: c.treasure.x + (i - (kept.length - 1) / 2) * 1.2 * Math.cos(c.team === "azul" || c.team === "verde" ? Math.PI / 2 : 0), y: c.treasure.y, z: c.treasure.z + (i - (kept.length - 1) / 2) * 1.2 * Math.sin(c.team === "azul" || c.team === "verde" ? Math.PI / 2 : 0) };
  }

  /** Each frame: the time, the defenders' pillows, the chests where they are; the war's line for the HUD. */
  frame(dt: number, b: Body): string {
    this.again = Math.max(0, this.again - dt);
    if (!this.crown || !this.war) return "";
    const w0 = this.war;
    if (!w0.winner) this.put(tick(w0, dt));
    const w = this.war;
    // The defenders: in another team's castle with a treasure, a pillow every couple of seconds may knock it off her.
    const mine = carrying(w, ME);
    const here = this.castleOf(b.x, b.z);
    if (mine && here && here !== MY_TEAM && (this.raid -= dt) <= 0) {
      this.raid = 2.5;
      if (Math.random() < 0.3) {
        this.lying.set(mine.id, { x: b.x, y: b.y, z: b.z });
        this.put(hit(w, ME));
        this.say("¡Almohadazo! Se te ha caído el tesoro", 2);
      }
    }
    for (const [team, m] of this.chests) {
      const t = this.war.treasures.find((q) => q.id === team);
      if (t?.carrier) m.position.set(b.x, b.y + 1.9, b.z);
      else {
        const p = this.where(team);
        if (p) m.position.set(p.x, p.y, p.z);
      }
    }
    if (this.war.winner && this.war.left <= 0 && !this.on(b)) return "";
    const s = score(this.war);
    const mm = Math.floor(this.war.left / 60);
    const ss = String(Math.floor(this.war.left % 60)).padStart(2, "0");
    const mark: Record<string, string> = { rojo: "🟥", azul: "🟦", amarillo: "🟨", verde: "🟩" };
    const end = this.war.winner ? (this.war.winner === "empate" ? "empate" : `gana ${mark[this.war.winner] ?? this.war.winner}`) : `${mm}:${ss}`;
    return ` · Guerra ${this.crown.castles.map((c) => `${mark[c.team] ?? c.name}${s[c.team]}`).join(" ")} · ${end}`;
  }
}
