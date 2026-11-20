import { Ecosystem, type Agent, type Intent } from "@modules/fauna/application/ecosystem";
import { MODE_SPEED, actAt, type EthoAct } from "@modules/fauna/domain/ethogram";
import { inEstrus } from "@modules/fauna/domain/mating";
import { STAGE_LABEL, type Stage } from "@modules/fauna/domain/life-cycle";
import { hash01, wanderAt } from "@modules/fauna/domain/roam";
import type { AnimalSpec, Habitat } from "../data/bioma";
import { BIOME_ISLAND, BIOME_ZONES, MOUNTAIN } from "../data/bioma-island";
import { AGENT_NAMES, BIOME_ETHOGRAMS, BIOME_TRAITS, COURTSHIPS, RIVALRIES, agentKey, agentTraits } from "../data/bioma-conducta";
import { advance, createBiome, dormantIn, hungerOf, huntKill, mate, monthOfDay, scaleOf, stageOfIndividual, youngOf, BIO_DAYS_PER_GAME_DAY, STEP_GAME_DAYS, type BiomeState, type Individual } from "../domain/bioma";
import { heightAt, slopeAt } from "../domain/mountain";

/**
 * THE BIOME LIVING ON SCREEN (docs/design/bioma-s3.md): the food chain of domain/bioma.ts (births, growth, hunger,
 * sleep, old age, what is eaten, by the game clock) and, on top, each animal acting its life with fauna's Ecosystem
 * (Cold Sanctuary's desires and predation) on the mountain: the hoofed keep to their cliffs and meadows, the marmots
 * to their burrows (and sleep under them all winter), the pikas to their scree; the griffons and the bearded vulture
 * soar in the thermals and the bearded vulture drops its bones on the gorge's slabs, the golden eagle circles and
 * stoops, the kestrel hovers into the wind, the choughs and the pigeons fly in flocks, the flying squirrel glides from
 * tree to tree at dusk, the swifts hawk over the gorge and the geese cross the island in a V on their migration.
 * No engine: the scene draws the poses this gives.
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
  /** Out of sight (asleep in its burrow or its cave). */
  hidden: boolean;
  /** «Íbice del Himalaya, cría de 2 meses: sigue a su madre». */
  label: string;
}

/** Decisions this often, s. */
const DECIDE_S = 0.25;
const PLAYER = -1;
/** The sea's surface (layout.ts SEA_Y). */
const SEA = -0.6;
/** The zone each habitat lives in (data/bioma-island.ts BIOME_ZONES). */
const ZONE_OF: Readonly<Record<Habitat, string>> = { aire: "farallon" };
/** Where each soaring bird finds its thermals or hunts (a zone), and how it flies (ours, from each one's source). */
const FLIGHT: Readonly<Record<string, { zone: string; style: "termica" | "picado" | "cernido" | "bandada" | "huesos" | "vencejo" | "uve" }>> = {
  buitre: { zone: "farallon", style: "termica" },
  quebrantahuesos: { zone: "garganta", style: "huesos" },
  aguila: { zone: "pradera", style: "picado" },
  cernicalo: { zone: "estepa", style: "cernido" },
  chova: { zone: "farallon", style: "bandada" },
  paloma: { zone: "rio", style: "bandada" },
  vencejo: { zone: "garganta", style: "vencejo" },
  ansar: { zone: "cresta", style: "uve" },
};
/** The ones that stand on rock too steep to walk (wild goats, the wallcreeper on its wall). */
const CLIMBERS = new Set(["ibice", "markhor", "bharal", "treparriscos", "leopardo"]);

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
  alt: number;
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
  /** The gorge's line below its lookout (world), where the bearded vulture flies. */
  private gorgeBelow?: { x: number; z: number };
  /** Hunts and courtships the scene saw (the census lists the chain's events). */
  readonly seen: { day: number; text: string }[] = [];

  constructor(readonly geo: BiomeGeo, seed = 1) {
    this.state = createBiome(seed);
    this.specOf = new Map(this.state.def.species.filter((s): s is AnimalSpec => s.kind === "animal").map((s) => [s.id, s]));
  }

  /** Game days since the island's day 0 that the chain has lived. */
  get gameDays(): number {
    return this.stepsDone * STEP_GAME_DAYS;
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
        // Asleep underground it takes no part (no one hunts a marmot in its burrow).
        if (dormantIn(s, month)) continue;
        const b = this.bodies.get(a.id)!;
        const stage = stageOfIndividual(a);
        const mother = a.mother !== undefined && ids.has(a.mother) ? a.mother : undefined;
        const n = this.eco.needsOf(a.id);
        this.eco.setNeeds(a.id, { hunger: hungerOf(st, a), fatigue: n?.fatigue ?? 0 });
        agents.push({
          id: a.id, species: agentKey(a.species, stage), x: b.pose.x, z: b.pose.z, home: b.home, scale: scaleOf(a), young: stage === "cria",
          ...(mother !== undefined ? { mother } : {}), inWater: false, sex: a.female ? "hembra" : "macho",
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
    const dusk = (hour >= 18 && hour < 21) || (hour >= 4.5 && hour < 6);
    // The geese of a flock in their V: their order in it.
    const geese = alive.filter((a) => a.species === "ansar").map((a) => a.id);
    for (const a of alive) if (a.mother === undefined || !ids.has(a.mother)) this.move(a, dt, t, night, dusk, month, geese);
    for (const a of alive) if (a.mother !== undefined && ids.has(a.mother)) this.move(a, dt, t, night, dusk, month, geese);
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
    const s = this.specOf.get(a.species)!;
    const seed = a.id * 7919 + 13;
    const m = a.mother !== undefined ? this.bodies.get(a.mother) : undefined;
    const home = m ? { ...m.home } : this.geo.home(s.habitat, seed, CLIMBERS.has(s.id) && s.id !== "leopardo");
    const at = m ? { x: m.pose.x + 0.6, z: m.pose.z + 0.4 } : wanderAt(home, home.r, seed, 0, 1);
    return {
      home, seed, alt: 25 + 40 * hash01(seed, 3),
      pose: { id: a.id, species: a.species, x: at.x, y: this.geo.ground(at.x, at.z), z: at.z, yaw: hash01(seed, 5) * 6.28, moving: false, scale: scaleOf(a), stage: stageOfIndividual(a), flying: false, swimming: false, hidden: false, label: s.name },
    };
  }

  /** Where a flier is now, if it is in the air (each its own way of flying). */
  private flight(a: Individual, b: Body, s: AnimalSpec, t: number, doing: string | undefined, geese: readonly number[]): { x: number; z: number; y: number; verb?: string } | undefined {
    const f = FLIGHT[s.id];
    if (!f) return undefined;
    const g = this.geo;
    const z = g.zone(f.zone);
    const ph = hash01(b.seed, 11) * Math.PI * 2;
    if (f.style === "uve") {
      // The flock crosses the island high (bar-headed geese fly over the Himalaya), in a V, and comes round again.
      const i = Math.max(0, geese.indexOf(a.id));
      const span = 2200;
      const u = ((t * 18) % span) - span / 2;
      const head = { x: BIOME_ISLAND.centre.value.x + u * 0.8, z: BIOME_ISLAND.centre.value.z + u * 0.6 };
      const rank = Math.ceil(i / 2);
      const side = i % 2 ? 1 : -1;
      return { x: head.x - 0.8 * rank * 4 + side * 0.6 * rank * 3, z: head.z - 0.6 * rank * 4 - side * 0.8 * rank * 3, y: 560 + rank * 0.5, verb: "cruza la isla en uve en su migración" };
    }
    if (f.style === "termica" || (f.style === "picado" && doing !== "cazar")) {
      // Circling up a thermal over the sunlit rock, then gliding off to the next (ours: ~1 m/s up, 120 m).
      const R = 30 + 25 * hash01(b.seed, 12);
      const w = (s.id === "aguila" ? 14 : 11) / R;
      const climb = (t * 1.1 + hash01(b.seed, 13) * 120) % 120;
      const c = { x: z.x + (hash01(b.seed, 14) - 0.5) * z.r, z: z.z + (hash01(b.seed, 15) - 0.5) * z.r };
      const x = c.x + R * Math.cos(w * t + ph);
      const zz = c.z + R * Math.sin(w * t + ph);
      return { x, z: zz, y: Math.max(g.ground(c.x, c.z), g.ground(x, zz)) + 40 + climb, verb: s.id === "aguila" ? "da vueltas en la térmica buscando marmotas" : "sube en espiral en una térmica" };
    }
    if (f.style === "huesos") {
      // Over the gorge below the lookout (its river), and every few laps over the lookout's slabs: it drops a bone from
      // 50–150 m (Bearded vulture).
      const o = this.gorgeBelow ??= (() => {
        const M = MOUNTAIN.value;
        const p = M.gorge.reduce((best, q) => (Math.hypot(q.x - (z.x - BIOME_ISLAND.centre.value.x), q.z - (z.z - BIOME_ISLAND.centre.value.z)) < Math.hypot(best.x - (z.x - BIOME_ISLAND.centre.value.x), best.z - (z.z - BIOME_ISLAND.centre.value.z)) ? q : best));
        return g.world(p.x, p.z);
      })();
      const R = 60;
      const w = 13 / R;
      const x = o.x + R * Math.cos(w * t + ph);
      const zz = o.z + R * Math.sin(w * t + ph) * 0.7;
      const lap = ((w * t + ph) / (Math.PI * 2)) % 3;
      const drop = lap > 2.9 && doing === "comer";
      return { x, z: zz, y: Math.max(g.ground(z.x, z.z), g.ground(x, zz)) + 40, verb: drop ? "deja caer un hueso sobre las losas para romperlo" : "planea a lo largo de la garganta" };
    }
    if (f.style === "cernido") {
      // Hovering into the wind at 10–20 m, then a short stoop (Common kestrel).
      const c = { x: b.home.x + (hash01(b.seed, Math.floor(t / 25)) - 0.5) * 40, z: b.home.z + (hash01(b.seed + 1, Math.floor(t / 25)) - 0.5) * 40 };
      const k = (t % 25) / 25;
      const y = g.ground(c.x, c.z) + (k > 0.85 ? 15 * (1 - (k - 0.85) / 0.15) + 1 : 15 + 0.4 * Math.sin(t * 6));
      return { x: c.x, z: c.z, y, verb: k > 0.85 ? "se lanza en picado corto sobre un ratón" : "se cierne contra el viento" };
    }
    if (f.style === "bandada") {
      // The flock wheels together over its cliff (one centre for the species, each bird its place in it).
      const c = wanderAt(z, z.r, s.id.length * 977, t, 9);
      const o = 3 + 6 * hash01(b.seed, 16);
      const x = c.x + o * Math.cos(t * 1.3 + ph);
      const zz = c.z + o * Math.sin(t * 1.3 + ph);
      return { x, z: zz, y: Math.max(g.ground(c.x, c.z), g.ground(x, zz)) + 22 + 6 * Math.sin(t * 0.7 + ph), verb: "vuela en bandada" };
    }
    if (f.style === "vencejo") {
      const R = 60 + 40 * hash01(b.seed, 17);
      const w = 22 / R;
      const x = z.x + R * Math.cos(w * t + ph);
      const zz = z.z + R * Math.sin(w * t + ph) * 0.7;
      return { x, z: zz, y: Math.max(g.ground(z.x, z.z), g.ground(x, zz)) + 35 + 15 * Math.sin(t * 0.9 + ph), verb: "caza insectos en vuelo sobre la garganta" };
    }
    return undefined;
  }

  private move(a: Individual, dt: number, t: number, night: boolean, dusk: boolean, month: number, geese: readonly number[]): void {
    const b = this.bodies.get(a.id)!;
    const p = b.pose;
    const s = this.specOf.get(a.species)!;
    const g = this.geo;
    const tr = BIOME_TRAITS[a.species]!;
    p.stage = stageOfIndividual(a);
    p.scale = scaleOf(a);
    p.swimming = false;
    const days = Math.round(a.age);
    const label = (verb: string) => `${s.name}, ${STAGE_LABEL[p.stage]}${p.stage === "cria" ? ` de ${days < 30 ? `${Math.max(1, days)} días` : `${Math.round(days / 30.4)} meses`}` : ""}: ${verb}`;
    // Asleep: the marmots in their burrows all winter; the flying squirrel in its cave by day.
    const asleep = dormantIn(s, month) ? "hiberna en su madriguera" : s.id === "ardilla" && !night && !dusk ? "duerme en su cueva del cantil" : undefined;
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
    const nest = youngOf(this.state, a).length > 0;
    const grown = p.stage !== "cria";
    // In the air: each flier its own way, while it is not resting, nesting, hunting on foot or fleeing.
    const busy = i && (i.doing === "huir" || i.doing === "cazar" || i.doing === "aparearse" || i.doing === "rivalizar" || i.doing === "cortejar" || i.doing === "devorar");
    const airborne = grown && !night && (s.id === "ansar" || (FLIGHT[s.id] && !nest && !(busy && s.id !== "aguila") && (act.mode === "patrullar" || i?.doing === "comer" || s.id === "vencejo")));
    if (airborne) {
      const to = s.id === "aguila" && i?.doing === "cazar" && i.to ? { ...i.to, y: g.ground(i.to.x, i.to.z) + 0.5, verb: "se lanza en picado sobre su presa" } : this.flight(a, b, s, t, i?.doing, geese);
      if (to) {
        const stoop = to.verb?.includes("picado") ? 3 : 1;
        const k = Math.min(1, dt * 1.5 * stoop);
        const dx = to.x - p.x;
        const dz = to.z - p.z;
        if (Math.hypot(dx, dz) > 0.05) p.yaw = Math.atan2(dx, dz);
        p.x += dx * k;
        p.z += dz * k;
        p.y += (to.y - p.y) * k;
        p.flying = true;
        p.moving = true;
        p.label = label(to.verb ?? verb);
        return;
      }
    }
    // The flying squirrel at dusk: from a treetop it glides down to the next tree, then climbs it (Woolly flying squirrel).
    if (s.id === "ardilla" && grown && (dusk || night)) {
      const cyc = 14;
      const n = Math.floor((t + b.seed) / cyc);
      const u = ((t + b.seed) % cyc) / cyc;
      const A = { x: b.home.x + (hash01(b.seed, n) - 0.5) * 60, z: b.home.z + (hash01(b.seed + 3, n) - 0.5) * 60 };
      const B = { x: b.home.x + (hash01(b.seed, n + 1) - 0.5) * 60, z: b.home.z + (hash01(b.seed + 3, n + 1) - 0.5) * 60 };
      const glide = Math.min(1, u / 0.45);
      const at = glide < 1 ? { x: A.x + (B.x - A.x) * glide, z: A.z + (B.z - A.z) * glide } : B;
      p.yaw = Math.atan2(B.x - A.x, B.z - A.z);
      p.x = at.x;
      p.z = at.z;
      p.y = g.ground(at.x, at.z) + (glide < 1 ? 22 - 18 * glide : 4 + 18 * ((u - 0.45) / 0.55));
      p.flying = glide < 1;
      p.moving = true;
      p.label = label(glide < 1 ? "planea de un pino a otro con la membrana abierta" : "trepa por el tronco");
      return;
    }
    let to: { x: number; z: number } = p;
    let speed = 0;
    if (i && (i.doing === "huir" || i.doing === "cazar" || i.doing === "buscar" || i.doing === "volver" || i.doing === "aparearse" || i.doing === "rivalizar") && i.to) {
      to = i.to;
      speed = i.speed;
    } else if (i && (i.doing === "descansar" || i.doing === "devorar" || i.doing === "cortejar")) {
      speed = 0;
    } else if (a.mother !== undefined && this.bodies.has(a.mother) && (p.stage === "cria" || i?.doing === "seguir")) {
      // The young keeps by its mother: kids and cubs follow her; nestlings wait at the nest while she is away.
      const m = this.bodies.get(a.mother)!.pose;
      const nestBound = s.shape !== "cuadrupedo" && s.id !== "perdiz" && s.id !== "ansar";
      const anchor = (nestBound && m.flying) || m.hidden ? b.home : m;
      to = { x: anchor.x + 0.5 * Math.cos(b.seed), z: anchor.z + 0.5 * Math.sin(b.seed) };
      speed = Math.max(walk, Math.hypot(to.x - p.x, to.z - p.z) > 6 ? tr.runMs * 0.4 : walk);
      verb = nestBound ? (m.flying ? "espera en el nido a que vuelva su madre con comida" : "pide comida a su madre") : s.id === "marmota" ? "juega junto a la madriguera" : "sigue a su madre";
    } else if (night && !i?.doing.startsWith("ca")) {
      to = b.home;
      speed = Math.hypot(b.home.x - p.x, b.home.z - p.z) > b.home.r ? walk * 2 : 0;
      verb = s.id === "leopardo" ? "patrulla de noche" : "duerme";
      if (s.id === "leopardo") speed = walk;
    } else if (act.mode !== "quieto" && !(nest && s.shape !== "cuadrupedo")) {
      const r = act.mode === "apinarse" ? { ...b.home, r: b.home.r * 0.4 } : b.home;
      to = wanderAt(r, r.r, b.seed, t + b.seed, Math.max(0.3, walk * MODE_SPEED[act.mode]));
      speed = walk * Math.max(0.3, MODE_SPEED[act.mode]);
    } else if (nest) verb = s.shape === "cuadrupedo" ? "cuida a su cría" : "incuba y da de comer a su cría en el nido";
    // Never into the sea; only the climbers onto rock too steep to walk.
    if (to !== p && (g.isSea(to.x, to.z) || (!CLIMBERS.has(s.id) && g.steep(to.x, to.z) > 1.1))) to = b.home;
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
    // Landing: down onto the ground where it is (fliers glide down to it).
    const gy = g.ground(p.x, p.z);
    p.y = p.flying ? p.y + (gy - p.y) * Math.min(1, dt * 1.5) : gy;
    if (p.flying && p.y - gy < 0.3) p.flying = false;
    if (!p.flying) p.y = gy;
    p.label = label(verb);
  }
}

/** Real days of biology in a game day (for the scene's labels). */
export const BIO_PER_GAME_DAY = BIO_DAYS_PER_GAME_DAY;
