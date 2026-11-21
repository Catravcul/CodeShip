import type { Chore, ChoreKind } from "@modules/chores/domain/chore";
import type { CrewMember } from "@modules/crew/domain/crew-member";
import { cookingChore, stepChain, stepPool, workoutChore, yogaChore } from "@modules/chores/application/catalog";
import { RECIPES } from "@modules/kitchen/data/recipes";
import { WORKOUTS } from "@modules/wellness/data/exercise";
import { YOGA_SEQUENCES } from "@modules/wellness/data/yoga";
import type { ModelDef } from "../data/models/kit";
import { MACHINE_MOTION } from "../data/animaciones";
import { ANIMALES, AULAS, COCINA, GYM, LIMPIEZA, MUSICA, PLANTAS, SALA_YOGA, SALUD, TRABAJO, type AnimalCare, type Procedure, type Reward } from "../data/retos";

/** One challenge a thing offers: the chore on the sheet, what it gives her, and where its steps come from. */
export interface Reto {
  readonly chore: Chore;
  readonly reward: Reward;
  readonly source: string;
  readonly reality: "real" | "ficción";
  /** The procedure it runs (data/retos.ts), when it is one: its steps' animations come from data/animaciones.ts. */
  readonly procedure?: string;
}

/** Doménica's age (her crew profile), for the heart-rate numbers of a workout. */
const AGE = 30;

const ALL_STEPS = stepPool([GYM, COCINA, SALUD, PLANTAS, LIMPIEZA, TRABAJO].flatMap((g) => Object.values(g).map((q: Procedure) => q.steps)));

/**
 * A procedure as a chore: one challenge per real step (chores/application/catalog.ts stepChain). `pool`: other real
 * steps offered among the options (sanctuary 1's own by default; sanctuary 3's field work passes its own).
 */
export function procedureReto(q: Procedure, target?: string, pool: readonly string[] = ALL_STEPS): Reto {
  const id = target ? `${q.id}-${target}` : q.id;
  return {
    chore: { id, kind: q.kind as ChoreKind, title: q.title, scenario: q.scenario, targetId: target, exercises: stepChain(id, 1, (i) => `${q.title}: paso ${i + 1}`, q.steps, [...q.wrong, ...pool]) },
    reward: q.reward,
    source: q.source,
    reality: q.reality,
    procedure: q.id,
  };
}

const animalCare = (id: string): AnimalCare | undefined => {
  if (id === "oso-polar") return ANIMALES.oso;
  if (id === "lobo-artico") return ANIMALES.lobo;
  if (id === "zorro-artico") return ANIMALES.zorro;
  if (["liebre-artica", "reno", "buey-almizclero"].includes(id)) return ANIMALES.herbivoro;
  if (id === "foca" || id === "morsa") return ANIMALES.foca;
  if (id === "orca" || id === "ballena" || id === "delfin") return ANIMALES.cetaceo;
  if (id.startsWith("pinguino")) return ANIMALES.pinguino;
  if (id === "petrel-niveo") return ANIMALES.ave;
  if (["osezno", "cria-foca", "polluelo-pinguino", "cachorro-malamute"].includes(id)) return ANIMALES.cria;
  return undefined;
};

/** The procedures a kitchen strip runs: the bakery bakes bread, the cheese room makes cheese… */
function kitchenStrip(id: string): readonly Procedure[] {
  switch (id) {
    case "cocina-panaderia":
    case "cocina-horno-pisos":
      return [COCINA.pan];
    case "cocina-molienda":
      return [COCINA.harina];
    case "cocina-queseria":
    case "cocina-cava":
      return [COCINA.queso];
    case "cocina-fermentos":
      return [COCINA.kefir, COCINA.yogur, COCINA.tempeh];
    case "cocina-pasta":
    case "cocina-extrusora":
      return [COCINA.pasta];
    case "cocina-recepcion":
    case "cocina-almacen-seco":
    case "cocina-camaras-frias":
      return [COCINA.recepcion];
    case "cocina-aceite-panela":
      return [COCINA.panela];
    case "cocina-lavado":
      return [COCINA.limpieza];
    default:
      return [];
  }
}

/**
 * What a model offers (docs/design/santuario1.md §Retos), by its group: every machine, plant, animal and room of
 * sanctuary 1 has at least one real task. `seed` picks among a group's options (one recipe of many, one yoga
 * sequence of two) so that neighbouring copies offer different ones. Ground, walls and decoration offer nothing.
 */
export function retosFor(m: ModelDef, seed = 0): Reto[] {
  const g = m.group;
  const pick = <T>(xs: readonly T[]): T => xs[Math.abs(seed) % xs.length]!;
  const of = (...qs: Procedure[]) => qs.map((q) => procedureReto(q));
  if (m.category === "animal") {
    const c = animalCare(m.id);
    return c ? [procedureReto(c.feed, m.id), procedureReto(c.mind, m.id)] : [];
  }
  switch (g) {
    case "gimnasio-placas":
      return of(GYM.placas, GYM.aseoGym);
    case "gimnasio-peso-libre":
      if (m.id === "gym-press-banca" || m.id === "gym-press-inclinado" || m.id === "gym-banco-fid") return of(GYM.pressBanca, GYM.aseoGym);
      if (m.id === "gym-plataforma") return of(GYM.pesoMuerto);
      if (m.id === "gym-estante-mancuernas") return of(GYM.mancuernas);
      return m.category === "maquina" ? of(GYM.pesoLibre, GYM.aseoGym) : of(GYM.pesoLibre);
    case "gimnasio-cardio": {
      const device = m.id === "gym-cinta" ? "cinta" : m.id.startsWith("gym-bici") ? "bicicleta" : undefined;
      const w = device ? WORKOUTS.filter((x) => x.device === device) : [];
      const own = w.length ? [{ chore: workoutChore(pick(w), AGE), reward: "fuerza" as const, source: "Protocolo Sprint (NASA): ver wellness/data/exercise.ts", reality: "real" as const }] : [];
      return [...own, ...of(GYM.cardio, GYM.aseoGym)];
    }
    case "gimnasio-zona-libre":
      // Each machine its own exercise (Berón 2026-11-20: «animaciones que no encajaban con las máquinas»).
      if (m.id === "gym-portico-sacos") return of(GYM.dojo);
      if (m.id in MACHINE_MOTION) return of(GYM.coreMaquina, GYM.aseoGym);
      return of(GYM.zonaLibre);
    case "obra-acabado":
      // The barre and the floor for the class, the bags, rings and mats for fighting; the rest is furniture.
      if (/^ballet-(espejo-barras|barras-portatiles|suelo)$/.test(m.id)) return of(GYM.ballet);
      if (/^dojo-(sacos|makiwara|ring|jaula-mma|tatami|corcho)$/.test(m.id)) return of(GYM.dojo);
      return [];
    case "ballet":
      // The studios' barres: the class starts there.
      return /^ballet-(espejo-barra|barra-portatil)$/.test(m.id) ? of(GYM.ballet) : [];
    case "dojo":
      // The martial arts rooms' own kit: the mats and the speed bag train; the shelf, mirror and bench are furniture.
      if (/^dojo-(pera|tatami-judo|tatami-grappling)$/.test(m.id)) return of(GYM.dojo);
      return [];
    case "gimnasio-calistenia":
      if (MACHINE_MOTION[m.id] === "fondos") return of(GYM.fondos);
      if (MACHINE_MOTION[m.id] === "elevar-rodillas") return of(GYM.coreMaquina);
      if (MACHINE_MOTION[m.id] === "plancha") return of(GYM.zonaLibre);
      return of(GYM.calistenia);
    case "gimnasio-parkour":
      return m.id === "pk-lache" ? of(GYM.calistenia) : of(GYM.parkour);
    case "gimnasio-crossfit":
      if (m.id === "cf-trineo") return of(GYM.crossfit);
      if (m.id === "cf-plataforma") return of(GYM.pesoMuerto);
      if (m.id === "cf-kettlebells") return of(GYM.swing);
      if (m.id.startsWith("cf-cajon")) return of(GYM.saltoCajon);
      if (m.id === "cf-rig") return of(GYM.calistenia);
      if (m.id === "cf-ghd") return of(GYM.coreMaquina, GYM.aseoGym);
      return [];
    case "gimnasio-servicios":
    case "suelos":
      return m.category === "naturaleza" ? of(PLANTAS.huerto) : of(LIMPIEZA.suelo);
    case "aseos":
      return of(LIMPIEZA.aseos);
    case "yoga":
      if (m.id.includes("suelo")) return of(SALA_YOGA);
      return [{ chore: yogaChore(pick(YOGA_SEQUENCES)), reward: "fuerza", source: "wellness/data/yoga.ts (Upa Yoga, Saludo al sol)", reality: "real" }, ...of(SALA_YOGA)];
    case "cocina":
    case "comedor": {
      const r = pick(RECIPES);
      return [{ chore: cookingChore(r, ALL_STEPS), reward: "comida", source: "kitchen/data/recipes.ts", reality: "real" }, ...of(COCINA.limpieza)];
    }
    case "cocina-franjas": {
      if (m.id === "cocina-prep-verdura" || m.id === "cocina-prep-carne") return [{ chore: cookingChore(pick(RECIPES), ALL_STEPS), reward: "comida", source: "kitchen/data/recipes.ts", reality: "real" }];
      return of(...kitchenStrip(m.id));
    }
    case "huerto":
      return of(PLANTAS.maleza);
    case "huerto-mundo":
      return of(PLANTAS.huerto);
    case "fotobiorreactores":
      return of(PLANTAS.fotobio);
    case "hospital":
    case "hospital-camas":
    case "hospital-uci":
    case "hospital-quirofanos":
      return m.id === "hospital-lavamanos" ? of(SALUD.manos) : of(SALUD.constantes, SALUD.herida, SALUD.manos);
    case "veterinario":
    case "veterinario-grandes":
      return m.id === "vet-pediluvio" ? of(SALUD.pediluvio) : m.id === "vet-dietas" ? [procedureReto(ANIMALES.foca!.feed), procedureReto(ANIMALES.pinguino!.feed)] : of(SALUD.vetRevision);
    case "cria":
      return [procedureReto(ANIMALES.cria!.feed)];
    case "plantas-interior":
      return of(PLANTAS.regar);
    case "frutales":
    case "residencia-terrazas":
      return of(PLANTAS.frutal);
    case "cultivos":
      return m.id.startsWith("planta-") ? of(PLANTAS.frutal, PLANTAS.regar) : of(PLANTAS.huerto, PLANTAS.regar);
    case "huerto-vertical":
      return of(PLANTAS.vertical, PLANTAS.huerto);
    case "flora-tundra":
      return of(PLANTAS.tundra);
    case "carne-cultivada":
      return of(TRABAJO.carne, TRABAJO.biologia);
    case "quimica":
    case "seguridad":
    case "puestos":
      return of(TRABAJO.quimica);
    case "quimica-analisis":
      return of(TRABAJO.analisis);
    case "biologia":
      return of(TRABAJO.biologia);
    case "biologia-molecular":
      return of(TRABAJO.molecular);
    case "informatica":
    case "informatica-cluster":
    case "informatica-planta":
      return of(TRABAJO.informatica);
    case "construccion-maquinas":
    case "construccion-material":
    case "construccion-herramientas":
    case "obra":
      return of(TRABAJO.construccion);
    case "textil":
      return m.id.startsWith("tex-telar") ? of(TRABAJO.telar) : of(TRABAJO.textil);
    case "submarino":
      return of(TRABAJO.submarino);
    case "mecanica":
      return m.id === "mec-cuna-submarino" ? of(TRABAJO.submarino) : m.id === "mec-barca-remolque" ? of(TRABAJO.fueraborda) : of(TRABAJO.aceiteTractor, TRABAJO.fueraborda);
    case "guardia":
      return of(TRABAJO.guardia);
    case "aula":
      // The study room's tables and computers give revision; the teacher's desk the subject's class.
      return m.id === "aula-mesa-profesor" ? of(TRABAJO.aula) : m.id === "aula-mesa-estudio" || m.id === "aula-biblioteca" ? of(AULAS.estudio) : [];
    case "aula-matematicas":
      return of(AULAS.matematicas);
    case "aula-lengua":
      return of(AULAS.lengua);
    case "aula-ciencias":
      return of(AULAS.ciencias);
    case "aula-historia":
      return of(AULAS.historia);
    case "aula-idiomas":
      return of(AULAS.idiomas);
    case "aula-arte":
      return of(AULAS.arte);
    case "musica-banda":
      return m.category === "maquina" ? of(TRABAJO.musica) : [];
    case "musica-estudio":
      return m.category === "maquina" ? of(MUSICA.grabar) : [];
    case "musica-practica":
      return of(MUSICA.practicar);
    case "musica-orquesta":
      return of(MUSICA.orquesta);
    case "musica-auditorio":
      return of(MUSICA.concierto);
    case "musica":
      return m.id === "mus-piano-cola" ? of(MUSICA.practicar) : [];
    case "asamblea":
      return of(TRABAJO.asamblea);
    case "residencia-habitaciones":
      return of(TRABAJO.descanso);
    default:
      return [];
  }
}

/** What finishing a challenge gives her (Berón's four rewards), on her needs (crew/domain/crew-member.ts). */
export function applyReward(c: CrewMember, r: Reward): string {
  switch (r) {
    case "comida":
      c.eat(1);
      return "Una ración más: no pasará hambre";
    case "fuerza":
      c.train(1);
      return "Más fuerza y menos estrés";
    case "compania":
      c.keepCompany(0.25);
      return "Compañía: menos soledad";
    case "salud":
      c.rest();
      return "Salud: el santuario más sano y ella más tranquila";
  }
}
