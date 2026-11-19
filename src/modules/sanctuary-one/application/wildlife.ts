import { ETHOGRAMS } from "../data/etograma";
import { LIFE_CYCLES } from "../data/ciclos-de-vida";
import { model } from "../data/catalog";
import type { Instance } from "../data/layout";
import { WATER_Y } from "../data/site";
import { MODE_SPEED, actAt, type EthoAct } from "../domain/ethogram";
import { ageLabel, lifeAt, sizeAt, stageOf } from "../domain/life-cycle";
import { wanderAt } from "../domain/motion";

/**
 * The wild animals living, day by day (Berón 2026-11-19: «¿se ha revisado que los animales cumplan sus ciclos de vida
 * reales? Quizás se puede importar lógica de cold-sanctuary para recrear animales inteligentes»). Each one grows by
 * its species' real curve, dies of old age and leaves its place to a newborn in its birth season
 * (domain/life-cycle.ts), and spends its time on its species' activities (Cold Sanctuary's Ethogram,
 * domain/ethogram.ts): resting, still-hunting, grazing, patrolling, huddling with its family; the young keep to
 * their mother. Positions move at the animal's own speed, so a change of activity never makes it jump.
 */
export interface AnimalNow {
  x: number;
  y: number;
  z: number;
  yaw: number;
  moving: boolean;
  /** 0 while its place waits for the next birth season. */
  scale: number;
  /** «Foca, cría de 3 días: no se separa de su madre, que la amamanta». */
  label: string;
  act?: EthoAct;
}

const STROLL: EthoAct = { verb: "recorre su territorio", mode: "pasear", weight: 1, seconds: 30, source: "" };

export class Wildlife {
  private readonly now = new Map<Instance, AnimalNow>();
  private readonly base = new Map<Instance, number>();

  /** `animals`: the wandering instances (not the ones that swim up the trunks); `yearDay0`: the year day (0-based) of game day 0. */
  constructor(private readonly instances: readonly Instance[], animals: readonly Instance[], private readonly yearDay0: number) {
    for (const it of animals) {
      this.now.set(it, { x: it.x, y: it.y, z: it.z, yaw: it.rot, moving: false, scale: it.scale ?? 1, label: it.name ?? model(it.model).label });
      const c = it.life && LIFE_CYCLES[it.life.species];
      // Its scale without its age (a bulk rule's), so the growth curve sets the rest.
      this.base.set(it, c ? (it.scale ?? 1) / sizeAt(-it.life!.born, c) : (it.scale ?? 1));
    }
  }

  get(it: Instance): AnimalNow | undefined {
    return this.now.get(it);
  }

  /** Advances them `dt` s; `t` is the wild clock (s) and `day` the game day (fractional). Mothers go before their young. */
  step(dt: number, t: number, day: number): void {
    for (const [it, a] of this.now) if (it.life?.mother === undefined) this.move(it, a, dt, t, day);
    for (const [it, a] of this.now) if (it.life?.mother !== undefined) this.move(it, a, dt, t, day);
  }

  private move(it: Instance, a: AnimalNow, dt: number, t: number, day: number): void {
    const w = it.wander!;
    const d = model(it.model);
    const c = it.life && LIFE_CYCLES[it.life.species];
    let act = STROLL;
    let stageScale = 1;
    if (c && it.life) {
      const l = lifeAt(it.life.born, day, c, this.yearDay0, it.life.offset);
      const age = day - l.born;
      if (!l.alive) {
        a.scale = 0;
        a.moving = false;
        a.label = `${c.label} (aún no ha nacido)`;
        a.act = undefined;
        // A newborn starts by its mother, or at its nest.
        const m = it.life.mother !== undefined ? this.now.get(this.instances[it.life.mother]!) : undefined;
        a.x = m && m.scale > 0 ? m.x : w.x;
        a.z = m && m.scale > 0 ? m.z : w.z;
        return;
      }
      stageScale = sizeAt(age, c);
      const e = ETHOGRAMS[it.life.species];
      act = e ? actAt(e, w.seed, t + w.seed, stageOf(age, c)) : STROLL;
      a.label = `${c.label}, ${ageLabel(age, c)}: ${act.verb}`;
    }
    a.act = act;
    const scale = (this.base.get(it) ?? 1) * stageScale;
    // In the sea it floats as deep as its size (layout.ts set its depth for its first size).
    if (it.area === "mar" && a.scale > 0) a.y = WATER_Y + ((it.y - WATER_Y) * scale) / (it.scale ?? 1);
    a.scale = scale;
    const speed = w.speed * MODE_SPEED[act.mode];
    let to: { x: number; z: number } = a;
    switch (act.mode) {
      case "quieto":
        break;
      case "apinarse": {
        // Close to its family's centre, a body's length apart.
        const ang = (w.seed % 360) * (Math.PI / 180);
        const r = d.size.z * scale * (0.6 + (w.seed % 7) / 7);
        to = { x: w.x + Math.cos(ang) * r, z: w.z + Math.sin(ang) * r };
        break;
      }
      case "seguir": {
        const m = it.life?.mother !== undefined ? this.now.get(this.instances[it.life.mother]!) : undefined;
        if (m && m.scale > 0) {
          // At its mother's side, half a body behind her.
          const side = w.seed % 2 ? 1 : -1;
          const back = d.size.z * m.scale * 0.5;
          const off = d.size.x * m.scale * 0.9;
          to = { x: m.x - Math.sin(m.yaw) * back + Math.cos(m.yaw) * off * side, z: m.z - Math.cos(m.yaw) * back - Math.sin(m.yaw) * off * side };
          if (it.area === "mar") a.y = m.y;
        } else to = wanderAt({ x: w.x, z: w.z }, w.r, w.seed, t + w.seed, w.speed);
        break;
      }
      default:
        to = wanderAt({ x: w.x, z: w.z }, w.r, w.seed, t + w.seed, Math.max(0.05, speed));
    }
    const dx = to.x - a.x;
    const dz = to.z - a.z;
    const dist = Math.hypot(dx, dz);
    // It keeps up at its own pace (a young one trots to stay by its mother).
    const max = Math.max(w.speed * 1.6, 0.2) * dt;
    if (dist > 0.02) {
      const k = Math.min(1, max / dist);
      a.x += dx * k;
      a.z += dz * k;
      a.yaw = Math.atan2(dx, dz);
      a.moving = dt > 0 && (dist * k) / dt > 0.05;
    } else a.moving = false;
  }
}
