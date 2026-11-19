import { Ecosystem, type Agent, type Intent } from "@modules/fauna/application/ecosystem";
import { MODE_SPEED, actAt, type EthoAct } from "@modules/fauna/domain/ethogram";
import { ageLabel, lifeAt, nextBirth, sizeAt, stageOf, type Stage } from "@modules/fauna/domain/life-cycle";
import { wanderAt } from "@modules/fauna/domain/roam";
import { ETHOGRAMS } from "../data/etograma";
import { LIFE_CYCLES } from "../data/ciclos-de-vida";
import { NAMES, TRAITS } from "../data/rasgos";
import { model } from "../data/catalog";
import type { Instance } from "../data/layout";
import { WATER_Y } from "../data/site";

/**
 * The wild animals living, day by day (Berón 2026-11-19: «¿se ha revisado que los animales cumplan sus ciclos de vida
 * reales? Quizás se puede importar lógica de cold-sanctuary para recrear animales inteligentes»), on the shared fauna
 * module: each one grows by its species' real curve, dies of old age and leaves its place to a newborn in its birth
 * season (fauna/domain/life-cycle.ts); it wants (hunger, fatigue, fear: fauna's Ecosystem, Cold Sanctuary's desires,
 * predation and threat response): a hungry wolf pack goes looking for musk oxen and hares, the hares flee, the orcas
 * hunt seals and penguins in the water, the timid flee Doménica; a prey that is caught is gone until the next birth
 * season. When calm it spends its time on its species' habits (Cold Sanctuary's Ethogram); the young keep to their
 * mother. Positions move at the animal's own speed, so a change of mind never makes it jump.
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
  stage?: Stage;
  act?: EthoAct;
  intent?: Intent;
}

const STROLL: EthoAct = { verb: "recorre su territorio", mode: "pasear", weight: 1, seconds: 30, source: "" };
/** Decisions are taken this often, s (the bodies move every frame). */
const DECIDE_S = 0.25;
/** The id of Doménica among the agents. */
const PLAYER = -1;

export class Wildlife {
  private readonly now = new Map<Instance, AnimalNow>();
  private readonly base = new Map<Instance, number>();
  /** Each one's day of birth (a newborn's, once it took the place of an old or eaten one). */
  private readonly born = new Map<Instance, number>();
  private readonly ids = new Map<Instance, number>();
  private readonly eco = new Ecosystem(TRAITS, NAMES);
  private intents = new Map<number, Intent>();
  private since = DECIDE_S;
  private lastDay?: number;
  /** Who was eaten, by whom (the scene can tell). */
  readonly kills: { prey: Instance; hunter: Instance; day: number }[] = [];

  /** `animals`: the wandering instances (not the ones that swim up the trunks); `yearDay0`: the year day (0-based) of game day 0. */
  constructor(private readonly instances: readonly Instance[], animals: readonly Instance[], private readonly yearDay0: number) {
    for (const it of animals) {
      this.now.set(it, { x: it.x, y: it.y, z: it.z, yaw: it.rot, moving: false, scale: it.scale ?? 1, label: it.name ?? model(it.model).label });
      this.ids.set(it, instances.indexOf(it));
      const c = it.life && LIFE_CYCLES[it.life.species];
      // Its scale without its age (a bulk rule's), so the growth curve sets the rest.
      this.base.set(it, c ? (it.scale ?? 1) / sizeAt(-it.life!.born, c) : (it.scale ?? 1));
      if (it.life) this.born.set(it, it.life.born);
    }
  }

  get(it: Instance): AnimalNow | undefined {
    return this.now.get(it);
  }

  /** The ecosystem's needs of an animal (tests, the scene's hook). */
  needsOf(it: Instance): { hunger: number; fatigue: number } | undefined {
    const id = this.ids.get(it);
    return id === undefined ? undefined : this.eco.needsOf(id);
  }

  setNeeds(it: Instance, n: { hunger: number; fatigue: number }): void {
    const id = this.ids.get(it);
    if (id !== undefined) this.eco.setNeeds(id, n);
  }

  /** Advances them `dt` s; `t` is the wild clock (s), `day` the game day (fractional), `player` where Doménica is. */
  step(dt: number, t: number, day: number, player?: { x: number; z: number }): void {
    for (const [it, a] of this.now) this.live(it, a, day);
    this.since += dt;
    if (this.since >= DECIDE_S) {
      const agents: Agent[] = [];
      for (const [it, a] of this.now) {
        if (!it.life || a.scale <= 0) continue;
        const w = it.wander!;
        const young = a.stage === "cria";
        agents.push({ id: this.ids.get(it)!, species: it.life.species, x: a.x, z: a.z, home: { x: w.x, z: w.z, r: w.r }, scale: a.scale / (this.base.get(it) ?? 1), young, ...(it.life.mother !== undefined ? { mother: it.life.mother } : {}), inWater: it.area === "mar" });
      }
      if (player) agents.push({ id: PLAYER, species: "Humano", x: player.x, z: player.z, home: { x: player.x, z: player.z, r: 1 }, scale: 1, young: false, inWater: false, observer: true });
      const r = this.eco.step(this.since, Math.max(0, day - (this.lastDay ?? day)), t, agents);
      this.since = 0;
      this.lastDay = day;
      this.intents = r.intents;
      for (const k of r.kills) {
        const prey = this.instances[k.prey]!;
        const c = prey.life && LIFE_CYCLES[prey.life.species];
        // Its place waits for the next birth season of its kind.
        if (c && prey.life) this.born.set(prey, nextBirth(day, c, this.yearDay0, prey.life.offset));
        this.kills.push({ prey, hunter: this.instances[k.hunter]!, day });
        this.live(prey, this.now.get(prey)!, day);
      }
    }
    for (const [it, a] of this.now) if (it.life?.mother === undefined) this.move(it, a, dt, t);
    for (const [it, a] of this.now) if (it.life?.mother !== undefined) this.move(it, a, dt, t);
  }

  /** Its age, size and name today; 0 size while its place waits for a birth. */
  private live(it: Instance, a: AnimalNow, day: number): void {
    const c = it.life && LIFE_CYCLES[it.life.species];
    if (!c || !it.life) return;
    const l = lifeAt(this.born.get(it) ?? it.life.born, day, c, this.yearDay0, it.life.offset);
    if (l.born !== this.born.get(it)) this.born.set(it, l.born);
    if (!l.alive) {
      a.scale = 0;
      a.moving = false;
      a.label = `${c.label} (aún no ha nacido)`;
      // A newborn starts by its mother, or at its nest.
      const m = it.life.mother !== undefined ? this.now.get(this.instances[it.life.mother]!) : undefined;
      const w = it.wander!;
      a.x = m && m.scale > 0 ? m.x : w.x;
      a.z = m && m.scale > 0 ? m.z : w.z;
      return;
    }
    const age = day - l.born;
    const scale = (this.base.get(it) ?? 1) * sizeAt(age, c);
    // In the sea it floats as deep as its size (layout.ts set its depth for its first size).
    if (it.area === "mar") a.y = WATER_Y + ((it.y - WATER_Y) * scale) / (it.scale ?? 1);
    a.scale = scale;
    a.stage = stageOf(age, c);
    a.label = `${c.label}, ${ageLabel(age, c)}`;
  }

  private move(it: Instance, a: AnimalNow, dt: number, t: number): void {
    if (a.scale <= 0) return;
    const w = it.wander!;
    const d = model(it.model);
    const i = this.intents.get(this.ids.get(it)!);
    const e = it.life && ETHOGRAMS[it.life.species];
    // Calm (or grazing): its species' habits; grazing picks its grazing habit.
    let act = e ? actAt(e, w.seed, t + w.seed, a.stage ?? "adulto") : STROLL;
    if (i?.doing === "comer" && e) act = e.acts.find((x) => x.mode === "pacer") ?? act;
    a.act = act;
    a.intent = i;
    const name = a.label.split(":")[0];
    const verb = i && i.verb ? i.verb : act.verb;
    a.label = `${name}: ${verb}`;
    let to: { x: number; z: number } = a;
    let speed = w.speed * MODE_SPEED[act.mode];
    if (i && (i.doing === "huir" || i.doing === "cazar" || i.doing === "buscar" || i.doing === "volver") && i.to) {
      to = i.to;
      speed = i.speed;
    } else if (i && (i.doing === "descansar" || i.doing === "devorar")) {
      speed = 0;
    } else if ((i?.doing === "seguir" || act.mode === "seguir") && it.life?.mother !== undefined) {
      const m = this.now.get(this.instances[it.life.mother]!);
      if (m && m.scale > 0) {
        // At its mother's side, half a body behind her.
        const side = w.seed % 2 ? 1 : -1;
        const back = d.size.z * m.scale * 0.5;
        const off = d.size.x * m.scale * 0.9;
        to = { x: m.x - Math.sin(m.yaw) * back + Math.cos(m.yaw) * off * side, z: m.z - Math.cos(m.yaw) * back - Math.sin(m.yaw) * off * side };
        speed = Math.max(i?.speed ?? 0, w.speed * 1.6, Math.hypot(m.x - a.x, m.z - a.z) > 8 ? (TRAITS[it.life.species]?.runMs ?? 2) * 0.5 : 0);
        if (it.area === "mar") a.y = m.y;
      } else to = wanderAt({ x: w.x, z: w.z }, w.r, w.seed, t + w.seed, w.speed);
    } else if (act.mode === "apinarse") {
      // Close to its family's centre, a body's length apart.
      const ang = (w.seed % 360) * (Math.PI / 180);
      const r = d.size.z * a.scale * (0.6 + (w.seed % 7) / 7);
      to = { x: w.x + Math.cos(ang) * r, z: w.z + Math.sin(ang) * r };
      speed = w.speed * MODE_SPEED.apinarse;
    } else if (act.mode !== "quieto") {
      to = wanderAt({ x: w.x, z: w.z }, w.r, w.seed, t + w.seed, Math.max(0.05, speed));
      // Back from a chase it walks home at its pace before it wanders again.
      speed = Math.max(speed, w.speed);
    }
    const dx = to.x - a.x;
    const dz = to.z - a.z;
    const dist = Math.hypot(dx, dz);
    const max = Math.max(speed, 0.2) * dt;
    if (dist > 0.02 && speed > 0) {
      const k = Math.min(1, max / dist);
      a.x += dx * k;
      a.z += dz * k;
      a.yaw = Math.atan2(dx, dz);
      a.moving = dt > 0 && (dist * k) / dt > 0.05;
    } else a.moving = false;
  }
}
