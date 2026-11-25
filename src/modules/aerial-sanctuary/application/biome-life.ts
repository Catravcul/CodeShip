import { Ecosystem, type Agent, type Intent } from "@modules/fauna/application/ecosystem";
import { MODE_SPEED, actAt, type EthoAct } from "@modules/fauna/domain/ethogram";
import { inEstrus } from "@modules/fauna/domain/mating";
import { STAGE_LABEL, type Stage } from "@modules/fauna/domain/life-cycle";
import { hash01, wanderAt } from "@modules/fauna/domain/roam";
import { AIR_BIOME, type AnimalSpec, type BiomeDef, type Habitat } from "../data/bioma";
import { BIOME_ISLAND, BIOME_ZONES, MOUNTAIN } from "../data/bioma-island";
import { AGENT_NAMES, BIOME_ETHOGRAMS, BIOME_TRAITS, COURTSHIPS, RIVALRIES, agentKey, agentTraits } from "../data/bioma-conducta";
import { advance, createBiome, dormantIn, hungerOf, huntKill, lifeStageOf, mate, monthOfDay, quietNow, scaleOf, stageOfIndividual, BIO_DAYS_PER_GAME_DAY, STEP_GAME_DAYS, type BiomeState, type Individual, type LifeStage } from "../domain/bioma";
import { heightAt, slopeAt } from "../domain/mountain";

/**
 * THE BIOME LIVING ON SCREEN (docs/design/bioma-s3.md): the food chain of domain/bioma.ts (births, growth, hunger,
 * sleep, old age, what is eaten, by the game clock) and, on top, each giant insect acting its life with fauna's
 * Ecosystem (Cold Sanctuary's desires and predation) on the mountain, each flying its real way: the bees and bumblebees
 * from flower to flower and back to their nest, the Apollo gliding slowly over the scree, the hoverfly hanging still in
 * the air and darting off, the dragonfly patrolling the river in long fast beats, the robber fly sallying from its
 * perch, the hornet hovering before the hives, the fruit flies and the lacewings fluttering in small circles; the
 * locust hops and flies a stretch; the beetles and the ants walk. Eggs and pupae are out of sight, and so are the
 * larvae in the soil, the dung, a carcass's crypt or the river. No engine: the scene draws the poses this gives.
 */
export interface Pose {
  readonly id: number;
  readonly species: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  moving: boolean;
  /** Size over the adult female's. */
  scale: number;
  stage: Stage;
  /** Its stage of life (an insect's egg, larva, nymph, pupa or adult). */
  life: LifeStage;
  flying: boolean;
  swimming: boolean;
  /** Out of sight (an egg, a pupa, a larva underground, a colony overwintering). */
  hidden: boolean;
  /** «Abeja melífera asiática, adulto: liba néctar…». */
  label: string;
}

/** Decisions this often, s. */
const DECIDE_S = 0.25;
const PLAYER = -1;
/** The sea's surface (layout.ts SEA_Y). */
const SEA = -0.6;
/** The zone each habitat lives in (data/bioma-island.ts BIOME_ZONES). */
const ZONE_OF: Readonly<Record<Habitat, string>> = { aire: "rio" };
/**
 * How each flier flies (its real pattern, from its source in data/bioma-conducta.ts), the zone it flies over and its
 * height over the ground in its own body lengths (ours: a giant at the real height would fly hundreds of metres up).
 */
type FlightStyle = "pecoreo" | "planeo" | "cernido" | "patrulla" | "acecho" | "colmena" | "revoloteo" | "salto";
export const FLIGHT: Readonly<Record<string, { style: FlightStyle; zone?: string; bodies: number }>> = {
  abeja: { style: "pecoreo", bodies: 2 },
  abejorro: { style: "pecoreo", bodies: 1.5 },
  mariposa: { style: "planeo", bodies: 1.2 },
  sirfido: { style: "cernido", bodies: 3 },
  libelula: { style: "patrulla", zone: "rio", bodies: 0.8 },
  asilido: { style: "acecho", bodies: 1.5 },
  avispon: { style: "colmena", bodies: 1.2 },
  drosophila: { style: "revoloteo", bodies: 3 },
  crisopa: { style: "revoloteo", bodies: 2 },
  mariquita: { style: "revoloteo", bodies: 3 },
  saltamontes: { style: "salto", bodies: 1 },
};
const LIFE_VERB: Partial<Record<LifeStage, string>> = { huevo: "un huevo, se desarrolla", pupa: "una pupa, se transforma en adulto" };

/** The island's frame: local plan metres ↔ world (the mountain keeps its true size), its ground and its zones. */
export function biomeGeo(_k = 1) {
  const C = BIOME_ISLAND.centre.value;
  const M = MOUNTAIN.value;
  const world = (x: number, z: number) => ({ x: C.x + x, z: C.z + z });
  const local = (x: number, z: number) => ({ x: x - C.x, z: z - C.z });
  const zone = (id: string) => BIOME_ZONES.find((q) => q.id === id) ?? BIOME_ZONES[0]!;
  const ground = (x: number, z: number) => heightAt(M, x - C.x, z - C.z);
  return {
    world,
    local,
    ground,
    steep: (x: number, z: number) => slopeAt(M, x - C.x, z - C.z),
    isSea: (x: number, z: number) => ground(x, z) <= SEA + 0.05,
    /** The middle of a zone, in the world. */
    zone(id: string): { x: number; z: number; r: number } {
      const q = zone(id);
      return { ...world(q.point.x, q.point.z), r: q.r };
    },
    /** A home for an animal of `habitat`: a point of its zone on land (seeded; on steep rock for the climbers), and a radius to roam. */
    home(habitat: Habitat, seed: number, rock = false): { x: number; z: number; r: number } {
      const q = zone(ZONE_OF[habitat] ?? habitat);
      let best: { x: number; z: number; s: number } | undefined;
      for (let i = 0; i < 24; i++) {
        const a = hash01(seed, i * 2) * Math.PI * 2;
        const d = Math.sqrt(hash01(seed, i * 2 + 1)) * q.r * 0.8;
        const x = q.point.x + Math.cos(a) * d;
        const z = q.point.z + Math.sin(a) * d;
        if (heightAt(M, x, z) <= SEA + 0.5) continue;
        const s = slopeAt(M, x, z);
        if (!rock && s < 0.7) return { ...world(x, z), r: Math.min(30, q.r * 0.35) };
        if (rock && (!best || s > best.s)) best = { x, z, s };
      }
      const p = best ?? { x: q.point.x, z: q.point.z };
      return { ...world(p.x, p.z), r: rock ? 14 : 12 };
    },
  };
}
export type BiomeGeo = ReturnType<typeof biomeGeo>;

interface Body {
  pose: Pose;
  home: { x: number; z: number; r: number };
  seed: number;
}

export class BiomeLife {
  readonly state: BiomeState;
  private readonly eco = new Ecosystem(agentTraits(), AGENT_NAMES, COURTSHIPS, RIVALRIES);
  private readonly bodies = new Map<number, Body>();
  private intents = new Map<number, Intent>();
  private since = DECIDE_S;
  private stepsDone = 0;
  private lastDays = 0;
  private readonly specOf: ReadonlyMap<string, AnimalSpec>;
  /** Times its real size each insect is drawn (data/bioma.ts INSECT_SCALE). */
  readonly drawScale: number;
  /** Hunts and courtships the scene saw (the census lists the chain's events). */
  readonly seen: { day: number; text: string }[] = [];

  constructor(readonly geo: BiomeGeo, seed = 1, def: BiomeDef = AIR_BIOME) {
    this.state = createBiome(seed, def);
    this.drawScale = def.drawScale ?? 1;
    this.specOf = new Map(this.state.def.species.filter((s): s is AnimalSpec => s.kind === "animal").map((s) => [s.id, s]));
  }

  /** Game days since the island's day 0 that the chain has lived. */
  get gameDays(): number {
    return this.stepsDone * STEP_GAME_DAYS;
  }

  /** A species' drawn length (m): its real body × the scale. */
  lengthOf(species: string): number {
    return (this.specOf.get(species)?.size.z ?? 1) * this.drawScale;
  }

  /**
   * Advances to game day `days` (S3's board clock) and moves the animals `dt` s. `onStage`: she is on the island (the
   * chain leaves the hunts and courtships to the scene); `t`: the wild clock (s); `hour`: the board hour (night, dusk).
   */
  tick(dt: number, days: number, t: number, hour: number, player?: { x: number; z: number }, onStage = false): void {
    const want = Math.floor(days / STEP_GAME_DAYS);
    if (want > this.stepsDone) {
      advance(this.state, (want - this.stepsDone) * STEP_GAME_DAYS, { onStage });
      this.stepsDone = want;
    }
    const st = this.state;
    const month = monthOfDay(st.day, st.def.startDayOfYear);
    const alive = st.animals.filter((a) => !a.dead);
    const ids = new Set(alive.map((a) => a.id));
    for (const id of [...this.bodies.keys()]) if (!ids.has(id)) this.bodies.delete(id);
    for (const a of alive) if (!this.bodies.has(a.id)) this.bodies.set(a.id, this.born(a));
    this.since += dt;
    if (this.since >= DECIDE_S) {
      const agents: Agent[] = [];
      for (const a of alive) {
        const s = this.specOf.get(a.species)!;
        // Out of sight it takes no part (no one hunts an egg, a pupa or a queen asleep).
        if (dormantIn(s, month) || this.unseen(a, s)) continue;
        const b = this.bodies.get(a.id)!;
        const stage = stageOfIndividual(a);
        const n = this.eco.needsOf(a.id);
        this.eco.setNeeds(a.id, { hunger: hungerOf(st, a), fatigue: n?.fatigue ?? 0 });
        agents.push({
          id: a.id, species: agentKey(a.species, stage), x: b.pose.x, z: b.pose.z, home: b.home, scale: scaleOf(a) * this.drawScale, young: stage === "cria",
          inWater: false, sex: a.female ? "hembra" : "macho",
          estrus: (!s.visitor || !!s.visitor.breeds) && a.pregnant === undefined && inEstrus(st.day, s, st.def.startDayOfYear, stage),
        });
      }
      if (player && onStage) agents.push({ id: PLAYER, species: "Humano", x: player.x, z: player.z, home: { x: player.x, z: player.z, r: 1 }, scale: 1, young: false, inWater: false, observer: true });
      const r = this.eco.step(this.since, days - this.lastDays || 0, t, agents);
      this.since = 0;
      this.lastDays = days;
      this.intents = r.intents;
      for (const k of r.kills) if (huntKill(st, k.hunter, k.prey)) this.seen.push({ day: st.day, text: `${AGENT_NAMES[agents.find((x) => x.id === k.hunter)!.species]} caza ${AGENT_NAMES[agents.find((x) => x.id === k.prey)!.species]}` });
      for (const m of r.matings) if (mate(st, m.female, m.male)) this.seen.push({ day: st.day, text: `Se aparea una pareja: ${AGENT_NAMES[agents.find((x) => x.id === m.female)!.species]}` });
      if (this.seen.length > 30) this.seen.splice(0, this.seen.length - 30);
    }
    const night = hour < 5 || hour >= 21;
    for (const a of alive) this.move(a, dt, t, night, month);
  }

  poses(): Pose[] {
    return [...this.bodies.values()].map((b) => b.pose);
  }

  pose(id: number): Pose | undefined {
    return this.bodies.get(id)?.pose;
  }

  intentOf(id: number): Intent | undefined {
    return this.intents.get(id);
  }

  /** An egg or a pupa, or a young that lives out of sight (in the soil, the dung, a crypt, the river). */
  private unseen(a: Individual, s: AnimalSpec): boolean {
    return quietNow(a) || (!!s.hiddenYoung && stageOfIndividual(a) === "cria");
  }

  /** A newborn starts where its mother laid it (or at its home: a newcomer lands there). */
  private born(a: Individual): Body {
    const s = this.specOf.get(a.species)!;
    const seed = a.id * 7919 + 13;
    const m = a.mother !== undefined ? this.bodies.get(a.mother) : undefined;
    const home = m ? { ...m.home } : this.geo.home(s.habitat, seed);
    const at = m ? { x: m.pose.x + 2 * Math.cos(seed), z: m.pose.z + 2 * Math.sin(seed) } : wanderAt(home, home.r, seed, 0, 1);
    return {
      home, seed,
      pose: { id: a.id, species: a.species, x: at.x, y: this.geo.ground(at.x, at.z), z: at.z, yaw: hash01(seed, 5) * 6.28, moving: false, scale: scaleOf(a), stage: stageOfIndividual(a), life: lifeStageOf(a), flying: false, swimming: false, hidden: false, label: s.name },
    };
  }

  /** Where a flier is now, in the air its own way (`len`: its drawn length, m). */
  private flight(b: Body, s: AnimalSpec, t: number, len: number, doing: string | undefined, hives: readonly { x: number; z: number }[]): { x: number; z: number; y: number; verb: string } | undefined {
    const f = FLIGHT[s.id];
    if (!f) return undefined;
    const g = this.geo;
    const ph = hash01(b.seed, 11) * Math.PI * 2;
    const over = (x: number, z: number, h: number) => g.ground(x, z) + h;
    const H = f.bodies * len;
    const hop = (period: number, reach: number) => {
      const n = Math.floor((t + b.seed) / period);
      const u = ((t + b.seed) % period) / period;
      const A = { x: b.home.x + (hash01(b.seed, n) - 0.5) * reach, z: b.home.z + (hash01(b.seed + 3, n) - 0.5) * reach };
      const B = { x: b.home.x + (hash01(b.seed, n + 1) - 0.5) * reach, z: b.home.z + (hash01(b.seed + 3, n + 1) - 0.5) * reach };
      return { A, B, u };
    };
    switch (f.style) {
      case "pecoreo": {
        // Flower to flower: a short flight and a stop on each flower (Apis cerana, Bombus).
        const { A, B, u } = hop(9, b.home.r * 2);
        const k = Math.min(1, Math.max(0, (u - 0.55) / 0.45));
        const x = A.x + (B.x - A.x) * k;
        const z = A.z + (B.z - A.z) * k;
        return { x, z, y: over(x, z, k > 0 && k < 1 ? H * (0.5 + Math.sin(k * Math.PI)) : len * 0.3), verb: k > 0 && k < 1 ? "vuela a otra flor" : "liba en una flor" };
      }
      case "planeo": {
        // The Apollo's slow flight, gliding close over the scree with a few wingbeats.
        const R = b.home.r * 0.8;
        const x = b.home.x + R * Math.cos(t * 0.05 + ph) + 8 * Math.sin(t * 0.21);
        const z = b.home.z + R * Math.sin(t * 0.05 + ph);
        return { x, z, y: over(x, z, H + len * 0.4 * Math.sin(t * 0.8 + ph)), verb: "planea despacio sobre la pedrera" };
      }
      case "cernido": {
        // The hoverfly hangs still in the air, then darts a few metres to hang again (Episyrphus balteatus).
        const { A, B, u } = hop(6, 50);
        const k = u > 0.85 ? (u - 0.85) / 0.15 : 0;
        const x = A.x + (B.x - A.x) * k;
        const z = A.z + (B.z - A.z) * k;
        return { x, z, y: over(x, z, H + 0.15 * Math.sin(t * 9)), verb: k ? "sale disparado" : "se cierne inmóvil en el aire" };
      }
      case "patrulla": {
        // The dragonfly patrols a beat along the river, long and fast, turning at its ends.
        const zz = f.zone ? g.zone(f.zone) : b.home;
        const u = Math.sin(t * 0.12 + ph);
        const x = zz.x + u * zz.r * 1.2;
        const z = zz.z + Math.sin(t * 0.31 + ph) * zz.r * 0.4;
        return { x, z, y: over(x, z, H + 4 + 3 * Math.sin(t * 0.5)), verb: doing === "cazar" ? "caza al vuelo" : "patrulla sobre el río" };
      }
      case "acecho": {
        // The robber fly waits on its perch and sallies after a passing insect, back to the perch.
        const { A, u } = hop(10, 40);
        const out = u > 0.7 ? Math.sin(((u - 0.7) / 0.3) * Math.PI) : 0;
        const x = A.x + out * 25 * Math.cos(ph);
        const z = A.z + out * 25 * Math.sin(ph);
        return { x, z, y: over(x, z, len * 0.2 + out * H * 3), verb: out ? "sale al vuelo tras un insecto" : "acecha desde su percha" };
      }
      case "colmena": {
        // The hornet hovers before the hives, watching the bees come home (Asian hornet).
        const hv = hives.length ? hives[Math.floor(hash01(b.seed, 7) * hives.length)]! : b.home;
        const x = hv.x + 10 * Math.cos(ph) + 2 * Math.sin(t * 0.7);
        const z = hv.z + 10 * Math.sin(ph) + 2 * Math.cos(t * 0.6);
        return { x, z, y: over(x, z, H + 3 + 0.3 * Math.sin(t * 5)), verb: hives.length ? "se cierne ante una colmena esperando a las abejas" : "caza insectos al vuelo" };
      }
      case "revoloteo": {
        const x = b.home.x + 6 * Math.cos(t * 0.9 + ph) + 3 * Math.sin(t * 2.3);
        const z = b.home.z + 6 * Math.sin(t * 0.7 + ph);
        return { x, z, y: over(x, z, H + len * Math.sin(t * 1.7 + ph)), verb: "revolotea" };
      }
      case "salto": {
        // The locust: a jump and a short flight, then it lands to feed.
        const { A, B, u } = hop(12, 60);
        const k = u > 0.8 ? (u - 0.8) / 0.2 : 0;
        if (!k) return undefined;
        const x = A.x + (B.x - A.x) * k;
        const z = A.z + (B.z - A.z) * k;
        return { x, z, y: over(x, z, Math.sin(k * Math.PI) * len * 2.5), verb: "salta y vuela un trecho" };
      }
    }
  }

  private move(a: Individual, dt: number, t: number, night: boolean, month: number): void {
    const b = this.bodies.get(a.id)!;
    const p = b.pose;
    const s = this.specOf.get(a.species)!;
    const g = this.geo;
    const tr = BIOME_TRAITS[a.species]!;
    p.stage = stageOfIndividual(a);
    p.life = lifeStageOf(a);
    p.scale = scaleOf(a);
    p.swimming = false;
    const len = s.size.z * this.drawScale * p.scale;
    const days = Math.round(a.age - (s.eggDays ?? 0));
    const label = (verb: string) => `${s.name}, ${LIFE_LABEL[p.life]}${p.stage === "cria" ? ` de ${days < 30 ? `${Math.max(1, days)} días` : `${Math.round(days / 30.4)} meses`}` : ""}: ${verb}`;
    // Out of sight: overwintering, an egg, a pupa, a larva in the soil.
    const asleep = dormantIn(s, month) ? (s.social ? "pasa el invierno dentro del nido" : "pasa el invierno escondido") : this.unseen(a, s) ? (LIFE_VERB[p.life] ?? "crece escondida") : undefined;
    p.hidden = !!asleep;
    if (asleep) {
      p.x = b.home.x;
      p.z = b.home.z;
      p.y = g.ground(p.x, p.z);
      p.flying = false;
      p.moving = false;
      p.label = label(asleep);
      return;
    }
    const i = this.intents.get(a.id);
    const e = BIOME_ETHOGRAMS[a.species]!;
    const act: EthoAct = actAt(e, b.seed, t + b.seed, p.stage);
    const walk = Math.max(0.4, tr.runMs * 0.12);
    let verb = i?.verb || act.verb;
    const grown = p.stage !== "cria" && p.stage !== "joven";
    // In the air: each flier its own way, while it is not hunting, fleeing or courting (those fly straight to their mark).
    const busy = i && (i.doing === "huir" || i.doing === "cazar" || i.doing === "aparearse" || i.doing === "rivalizar" || i.doing === "cortejar" || i.doing === "devorar");
    if (grown && !night && FLIGHT[s.id] && !busy) {
      const to = this.flight(b, s, t, len, i?.doing, this.hives);
      if (to) {
        const k = Math.min(1, dt * 2);
        const dx = to.x - p.x;
        const dz = to.z - p.z;
        if (Math.hypot(dx, dz) > 0.05) p.yaw = Math.atan2(dx, dz);
        p.x += dx * k;
        p.z += dz * k;
        p.y += (to.y - p.y) * k;
        p.flying = p.y - g.ground(p.x, p.z) > len * 0.25;
        p.moving = true;
        p.label = label(to.verb);
        return;
      }
    }
    let to: { x: number; z: number } = p;
    let speed = 0;
    if (i && (i.doing === "huir" || i.doing === "cazar" || i.doing === "buscar" || i.doing === "volver" || i.doing === "aparearse" || i.doing === "rivalizar") && i.to) {
      to = i.to;
      speed = i.speed;
    } else if (i && (i.doing === "descansar" || i.doing === "devorar" || i.doing === "cortejar")) {
      speed = 0;
    } else if (night) {
      to = b.home;
      speed = Math.hypot(b.home.x - p.x, b.home.z - p.z) > b.home.r ? walk * 2 : 0;
      verb = s.social ? "duerme en el nido" : "descansa";
    } else if (act.mode !== "quieto") {
      to = wanderAt(b.home, b.home.r, b.seed, t + b.seed, Math.max(0.3, walk * MODE_SPEED[act.mode]));
      speed = walk * Math.max(0.3, MODE_SPEED[act.mode]);
    }
    // Never into the sea, nor up rock too steep for it.
    if (to !== p && (g.isSea(to.x, to.z) || g.steep(to.x, to.z) > 1.1)) to = b.home;
    const dx = to.x - p.x;
    const dz = to.z - p.z;
    const dist = Math.hypot(dx, dz);
    // A flier chasing or fleeing flies there, at its height.
    const fliesThere = grown && !!FLIGHT[s.id] && tr.medium !== "tierra" && speed > 0 && dist > len;
    if (dist > 0.05 && speed > 0) {
      const k = Math.min(1, (speed * dt) / dist);
      p.x += dx * k;
      p.z += dz * k;
      p.yaw = Math.atan2(dx, dz);
      p.moving = true;
    } else p.moving = false;
    const gy = g.ground(p.x, p.z);
    const target = fliesThere ? gy + (FLIGHT[s.id]!.bodies * len) : gy;
    p.y = p.flying || fliesThere ? p.y + (target - p.y) * Math.min(1, dt * 1.5) : gy;
    p.flying = p.y - gy > len * 0.25;
    if (!p.flying) p.y = gy;
    p.label = label(verb);
  }

  /** The honeybees' hives (the hornets hover before them): set by the scene from its colonies. */
  hives: readonly { x: number; z: number }[] = [];
}

const LIFE_LABEL: Readonly<Record<LifeStage, string>> = { huevo: "huevo", larva: "larva", ninfa: "ninfa", pupa: "pupa", cria: STAGE_LABEL.cria, joven: STAGE_LABEL.joven, adulto: STAGE_LABEL.adulto, anciano: "adulto viejo" };

/** Real days of biology in a game day (for the scene's labels). */
export const BIO_PER_GAME_DAY = BIO_DAYS_PER_GAME_DAY;
