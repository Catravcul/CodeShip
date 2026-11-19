import { Ecosystem, type Agent, type Intent } from "@modules/fauna/application/ecosystem";
import { MODE_SPEED, actAt, type EthoAct } from "@modules/fauna/domain/ethogram";
import { inEstrus } from "@modules/fauna/domain/mating";
import { STAGE_LABEL, type Stage } from "@modules/fauna/domain/life-cycle";
import { hash01, wanderAt } from "@modules/fauna/domain/roam";
import { BIOME, type AnimalSpec, type Habitat } from "../data/bioma";
import { BIOME_ISLAND, BIOME_ZONES, inside } from "../data/bioma-island";
import { AGENT_NAMES, BIOME_ETHOGRAMS, BIOME_TRAITS, COURTSHIPS, agentKey, agentTraits } from "../data/bioma-conducta";
import { advance, createBiome, hungerOf, huntKill, mate, scaleOf, stageOfIndividual, youngOf, BIO_DAYS_PER_GAME_DAY, START_DAY_OF_YEAR, STEP_GAME_DAYS, type BiomeState, type Individual } from "../domain/bioma";

/**
 * THE BIOME LIVING ON SCREEN (docs/design/bioma-s3.md): the food chain of domain/bioma.ts (births, growth, hunger,
 * old age, what is eaten, by the game clock) and, on top, each animal acting its life with fauna's Ecosystem (Cold
 * Sanctuary's desires and predation): it rests, keeps to its habits, goes to sea to feed when hungry, flees what can
 * take it, hunts when owed a prey (the hunt the scene shows is the chain's kill), courts in its season (the mating is
 * the chain's), and its young follow it. No engine: the scene draws the poses this gives.
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
  flying: boolean;
  swimming: boolean;
  /** «Pingüino papúa, cría: pide comida a sus padres en el nido». */
  label: string;
}

const animals = BIOME.filter((s): s is AnimalSpec => s.kind === "animal");
const specOf = new Map(animals.map((s) => [s.id, s]));
/** Decisions this often, s. */
const DECIDE_S = 0.25;
const PLAYER = -1;
const ZONE_OF: Readonly<Record<Habitat, string>> = { colonia: "colonia", playa: "playa", tussac: "tussac", musgo: "musgo", roca: "musgo", mar: "kelp", aire: "kelp", suelo: "musgo" };

/** The island's frame at the presentation's scale (§2.4): local plan metres → world. */
export function biomeGeo(k: number) {
  const C = BIOME_ISLAND.centre.value;
  const world = (x: number, z: number) => ({ x: C.x + x * k, z: C.z + z * k });
  const local = (x: number, z: number) => ({ x: (x - C.x) / k, z: (z - C.z) / k });
  const zone = (id: string) => BIOME_ZONES.find((q) => q.id === id)!;
  return {
    world,
    local,
    isSea: (x: number, z: number) => {
      const l = local(x, z);
      return !inside(l.x, l.z);
    },
    /** A home for an animal of `habitat`: a point of its zone on land (seeded), and a radius to roam. */
    home(habitat: Habitat, seed: number): { x: number; z: number; r: number } {
      const r = zone(ZONE_OF[habitat]).r;
      for (let i = 0; i < 30; i++) {
        const x = r.x0 + (r.x1 - r.x0) * hash01(seed, i * 2);
        const z = r.z0 + (r.z1 - r.z0) * hash01(seed, i * 2 + 1);
        if (habitat === "aire" || habitat === "mar" ? !inside(x, z) : inside(x * 1.06, z * 1.06)) return { ...world(x, z), r: (habitat === "colonia" ? 10 : habitat === "playa" ? 14 : 16) * k };
      }
      return { ...world(zone(ZONE_OF[habitat]).point.x, zone(ZONE_OF[habitat]).point.z), r: 8 * k };
    },
    /** Where it feeds at sea: off its own shore (seeded). */
    sea(home: { x: number; z: number }, seed: number): { x: number; z: number; r: number } {
      const l = local(home.x, home.z);
      const a = Math.atan2(l.z / BIOME_ISLAND.half.value.z, l.x / BIOME_ISLAND.half.value.x) + (hash01(seed, 7) - 0.5) * 0.6;
      const d = 1.35 + 0.25 * hash01(seed, 9);
      return { ...world(Math.cos(a) * BIOME_ISLAND.half.value.x * d, Math.sin(a) * BIOME_ISLAND.half.value.z * d), r: 25 * k };
    },
  };
}
export type BiomeGeo = ReturnType<typeof biomeGeo>;

interface Body {
  pose: Pose;
  home: { x: number; z: number; r: number };
  sea: { x: number; z: number; r: number };
  seed: number;
  alt: number;
}

export class BiomeLife {
  readonly state: BiomeState;
  private readonly eco = new Ecosystem(agentTraits(), AGENT_NAMES, COURTSHIPS);
  private readonly bodies = new Map<number, Body>();
  private intents = new Map<number, Intent>();
  private since = DECIDE_S;
  private stepsDone = 0;
  private lastDays = 0;
  /** Hunts and courtships the scene saw (the census lists the chain's events). */
  readonly seen: { day: number; text: string }[] = [];

  constructor(readonly geo: BiomeGeo, seed = 1) {
    this.state = createBiome(seed);
  }

  /** Game days since the island's day 0 that the chain has lived. */
  get gameDays(): number {
    return this.stepsDone * STEP_GAME_DAYS;
  }

  /**
   * Advances to game day `days` (S3's board clock) and moves the animals `dt` s. `onStage`: she is on the island (the
   * chain leaves the hunts and courtships to the scene); `t`: the wild clock (s); `hour`: the board hour (night rest).
   */
  tick(dt: number, days: number, t: number, hour: number, player?: { x: number; z: number }, onStage = false): void {
    // The chain, a game hour at a time (a saved game catches up at once).
    const want = Math.floor(days / STEP_GAME_DAYS);
    if (want > this.stepsDone) {
      advance(this.state, (want - this.stepsDone) * STEP_GAME_DAYS, { onStage });
      this.stepsDone = want;
    }
    const st = this.state;
    const alive = st.animals.filter((a) => !a.dead);
    const ids = new Set(alive.map((a) => a.id));
    for (const id of [...this.bodies.keys()]) if (!ids.has(id)) this.bodies.delete(id);
    for (const a of alive) if (!this.bodies.has(a.id)) this.bodies.set(a.id, this.born(a));
    this.since += dt;
    if (this.since >= DECIDE_S) {
      const agents: Agent[] = [];
      for (const a of alive) {
        const b = this.bodies.get(a.id)!;
        const s = specOf.get(a.species)!;
        const stage = stageOfIndividual(a);
        const mother = a.mother !== undefined && ids.has(a.mother) ? a.mother : undefined;
        // Its hunger is the chain's (what it is owed, how low its reserve is).
        const n = this.eco.needsOf(a.id);
        this.eco.setNeeds(a.id, { hunger: hungerOf(st, a), fatigue: n?.fatigue ?? 0 });
        agents.push({
          id: a.id, species: agentKey(a.species, stage), x: b.pose.x, z: b.pose.z, home: b.home, scale: scaleOf(a), young: stage === "cria",
          ...(mother !== undefined ? { mother } : {}), inWater: b.pose.swimming, sex: a.female ? "hembra" : "macho",
          estrus: !s.visitor && a.pregnant === undefined && inEstrus(st.day, s, START_DAY_OF_YEAR, stage),
        });
      }
      if (player && onStage) agents.push({ id: PLAYER, species: "Humano", x: player.x, z: player.z, home: { x: player.x, z: player.z, r: 1 }, scale: 1, young: false, inWater: false, observer: true });
      const r = this.eco.step(this.since, ((days - this.lastDays) || 0), t, agents);
      this.since = 0;
      this.lastDays = days;
      this.intents = r.intents;
      for (const k of r.kills) if (huntKill(st, k.hunter, k.prey)) this.seen.push({ day: st.day, text: `${AGENT_NAMES[agents.find((x) => x.id === k.hunter)!.species]} caza ${AGENT_NAMES[agents.find((x) => x.id === k.prey)!.species]}` });
      for (const m of r.matings) if (mate(st, m.female, m.male)) this.seen.push({ day: st.day, text: `Se aparea una pareja: ${AGENT_NAMES[agents.find((x) => x.id === m.female)!.species]}` });
      if (this.seen.length > 30) this.seen.splice(0, this.seen.length - 30);
    }
    const night = hour < 5 || hour >= 22;
    for (const a of alive) if (a.mother === undefined || !ids.has(a.mother)) this.move(a, dt, t, night);
    for (const a of alive) if (a.mother !== undefined && ids.has(a.mother)) this.move(a, dt, t, night);
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

  /** A newborn starts by its mother (or at its home: a newcomer lands there). */
  private born(a: Individual): Body {
    const s = specOf.get(a.species)!;
    const seed = a.id * 7919 + 13;
    const m = a.mother !== undefined ? this.bodies.get(a.mother) : undefined;
    const home = m ? { ...m.home } : this.geo.home(s.habitat, seed);
    const sea = m ? { ...m.sea } : this.geo.sea(home, seed);
    const at = m ? { x: m.pose.x + 0.6, z: m.pose.z + 0.4 } : wanderAt(home, home.r, seed, 0, 1);
    return {
      home, sea, seed, alt: 10 + 30 * hash01(seed, 3),
      pose: { id: a.id, species: a.species, x: at.x, y: 0, z: at.z, yaw: hash01(seed, 5) * 6.28, moving: false, scale: scaleOf(a), stage: stageOfIndividual(a), flying: false, swimming: this.geo.isSea(at.x, at.z), label: s.name },
    };
  }

  private move(a: Individual, dt: number, t: number, night: boolean): void {
    const b = this.bodies.get(a.id)!;
    const p = b.pose;
    const s = specOf.get(a.species)!;
    const tr = BIOME_TRAITS[a.species]!;
    p.stage = stageOfIndividual(a);
    p.scale = scaleOf(a);
    const i = this.intents.get(a.id);
    const e = BIOME_ETHOGRAMS[a.species]!;
    const act: EthoAct = actAt(e, b.seed, t + b.seed, p.stage);
    const flier = s.shape === "ave" && p.stage !== "cria";
    const swimmer = s.shape === "pinguino" || s.shape === "pinnipedo";
    const walk = Math.max(0.4, tr.runMs * 0.12);
    let to: { x: number; z: number } = p;
    let speed = 0;
    let fly = false;
    let verb = i?.verb || act.verb;
    const nest = youngOf(this.state, a).length > 0;
    if (i && (i.doing === "huir" || i.doing === "cazar" || i.doing === "buscar" || i.doing === "volver" || i.doing === "aparearse" || i.doing === "rivalizar") && i.to) {
      to = i.to;
      speed = i.speed;
      fly = flier;
    } else if (i && (i.doing === "descansar" || i.doing === "devorar" || i.doing === "cortejar" || i.doing === "rivalizar")) {
      speed = 0;
    } else if (a.mother !== undefined && this.bodies.has(a.mother) && (p.stage === "cria" || i?.doing === "seguir")) {
      // The young keeps by its mother: at the nest while she is there, after her on the beach.
      const m = this.bodies.get(a.mother)!.pose;
      const nestBound = s.shape !== "pinnipedo";
      const anchor = nestBound && (m.flying || m.swimming) ? b.home : m;
      to = { x: anchor.x + 0.5 * Math.cos(b.seed), z: anchor.z + 0.5 * Math.sin(b.seed) };
      speed = Math.max(walk, Math.hypot(to.x - p.x, to.z - p.z) > 6 ? tr.runMs * 0.4 : walk);
      if (m.flying || m.swimming) verb = nestBound ? "espera en el nido a que vuelva su madre con comida" : "espera a su madre en la playa";
      else verb = s.shape === "pinnipedo" ? "mama junto a su madre" : "pide comida a su madre";
    } else if (night && !i?.doing.startsWith("ca")) {
      // Night: ashore and still (ours: the island rests; seals and birds sleep at the colony).
      to = b.home;
      speed = Math.hypot(b.home.x - p.x, b.home.z - p.z) > b.home.r ? walk * 2 : 0;
      fly = flier && speed > 0;
      verb = "duerme";
    } else if (i?.doing === "comer") {
      // Feeding at sea: seabirds fly over it, penguins and seals swim; the pipit and the sheathbill look ashore.
      const ashore = s.id === "bisbita" || s.id === "picovaina";
      const z = ashore ? b.home : b.sea;
      to = wanderAt(z, z.r, b.seed, t + b.seed, Math.max(0.5, walk));
      speed = flier ? tr.runMs * 0.6 : swimmer ? tr.runMs * 0.35 : walk;
      fly = flier;
      verb = ashore ? (s.id === "bisbita" ? "busca mosquitos y colémbolos en el tussac" : "busca restos en la colonia") : flier ? "pesca kril sobre el mar" : s.id === "elefante" ? "bucea a por calamar" : "pesca kril y peces en el mar";
      if (nest && !flier && !swimmer) verb += " para su cría";
    } else if (act.mode !== "quieto" && !(nest && s.shape === "ave")) {
      const r = act.mode === "patrullar" && flier ? { ...b.sea, r: b.sea.r * 2 } : act.mode === "apinarse" ? { ...b.home, r: b.home.r * 0.4 } : b.home;
      to = wanderAt(r, r.r, b.seed, t + b.seed, Math.max(0.3, walk * MODE_SPEED[act.mode]));
      speed = flier && act.mode === "patrullar" ? tr.runMs * 0.6 : walk * Math.max(0.3, MODE_SPEED[act.mode]);
      fly = flier && act.mode === "patrullar";
    } else if (nest) verb = s.shape === "pinnipedo" ? "amamanta a su cría" : "incuba y da de comer a su cría en el nido";
    // Land-bound ones never step into the sea.
    if (!swimmer && !fly && this.geo.isSea(to.x, to.z)) to = b.home;
    const dx = to.x - p.x;
    const dz = to.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.05 && speed > 0) {
      const k = Math.min(1, (speed * dt) / dist);
      p.x += dx * k;
      p.z += dz * k;
      p.yaw = Math.atan2(dx, dz);
      p.moving = true;
    } else p.moving = false;
    p.swimming = !fly && this.geo.isSea(p.x, p.z);
    p.flying = fly || (flier && p.y > 0.6 && this.geo.isSea(p.x, p.z));
    const groundY = p.swimming ? -0.55 : 0;
    const targetY = p.flying ? b.alt : groundY;
    p.y += (targetY - p.y) * Math.min(1, dt * (p.flying ? 0.6 : 2));
    const days = Math.round(a.age);
    p.label = `${s.name}, ${STAGE_LABEL[p.stage]}${p.stage === "cria" ? ` de ${days < 30 ? `${Math.max(1, days)} días` : `${Math.round(days / 30.4)} meses`}` : ""}: ${verb}`;
  }
}

/** Real days of biology in a game day (for the scene's labels). */
export const BIO_PER_GAME_DAY = BIO_DAYS_PER_GAME_DAY;
