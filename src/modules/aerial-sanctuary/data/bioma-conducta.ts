import type { Traits } from "@modules/fauna/domain/predation";
import type { EthoAct, SpeciesEthogram } from "@modules/fauna/domain/ethogram";

/**
 * How the air biome's animals behave (fauna's Ecosystem: who hunts whom by stats, who flees, the habits of each, the
 * courtships and the contests). Diets and the facts in the words are real, with their source; the speeds and the 0–1
 * stats (strength, armour, agility, weapon) are ours unless the source gives them, set so the stats give the real
 * relations: the snow leopard takes grown ibex, bharal and markhor; the golden eagle takes marmots, pikas, snowcocks,
 * choughs and the hoofed kids (it hunts from the air onto the ground: medium «ambos»); the fox takes the young and the
 * small; nobody takes the leopard. Prey is told apart by stage (docs/design/fauna.md: «siempre `eats`»).
 */
const WIKI = (p: string) => `Wikipedia, ${p}`;
const ADW = (p: string) => `ADW, ${p}`;
const t = (o: Omit<Traits, "armour" | "agility" | "packFactor" | "hungerPerDay"> & Partial<Pick<Traits, "armour" | "agility" | "packFactor" | "hungerPerDay">>): Traits => ({ armour: 0.1, agility: 0.5, packFactor: 0, hungerPerDay: 1, ...o });
const HOOF = (s: string) => [s, `${s}:joven`, `${s}:cria`];

export const BIOME_TRAITS: Readonly<Record<string, Traits & { readonly source: string }>> = {
  ibice: { ...t({ massKg: 80, strength: 0.5, armour: 0.25, agility: 0.95, armament: 0.35, diet: "herbivoro", medium: "tierra", runMs: 12, senseM: 60, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Siberian ibex")} (cuernos de cimitarra; laderas empinadas y pedreras); velocidad nuestra` },
  markhor: { ...t({ massKg: 70, strength: 0.5, armour: 0.25, agility: 0.9, armament: 0.4, diet: "herbivoro", medium: "tierra", runMs: 11, senseM: 60, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${ADW("Capra falconeri")} (cuernos en espiral; trepa a los árboles bajos a ramonear); velocidad nuestra` },
  bharal: { ...t({ massKg: 55, strength: 0.4, armour: 0.2, agility: 0.85, armament: 0.25, diet: "herbivoro", medium: "tierra", runMs: 11, senseM: 50, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Bharal")} (se queda inmóvil contra la roca y es casi invisible); velocidad nuestra` },
  marmota: { ...t({ massKg: 4.5, strength: 0.15, agility: 0.4, armament: 0.08, diet: "herbivoro", medium: "tierra", runMs: 4, senseM: 40, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Long-tailed marmot")} (no se aleja de su madriguera); velocidad nuestra` },
  pika: { ...t({ massKg: 0.2, strength: 0.03, agility: 0.85, armament: 0, diet: "herbivoro", medium: "tierra", runMs: 3, senseM: 20, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Large-eared pika")} (entre las grietas de la pedrera); velocidad nuestra` },
  ardilla: { ...t({ massKg: 2.2, strength: 0.08, agility: 0.8, armament: 0.03, diet: "herbivoro", medium: "ambos", runMs: 8, senseM: 25, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Woolly flying squirrel")} (planea al anochecer; agujas de pino y líquenes); velocidad nuestra` },
  zorro: { ...t({ massKg: 5.5, strength: 0.25, agility: 0.75, armament: 0.3, diet: "carnivoro", medium: "tierra", runMs: 13, senseM: 60, huntSuccess: 0.3, rangeM: 600, eats: ["marmota:cria", "pika", "pika:joven", "perdiz:cria", "perdiz:joven", "bharal:cria", "ibice:cria"] }), source: `${WIKI("Red fox")} (roedores, aves y crías; hasta 50 km/h); éxito: nuestro` },
  leopardo: { ...t({ massKg: 45, strength: 0.85, armour: 0.3, agility: 0.95, armament: 0.75, diet: "carnivoro", medium: "tierra", runMs: 18, senseM: 120, huntSuccess: 0.3, rangeM: 2000, eats: [...HOOF("bharal"), ...HOOF("ibice"), ...HOOF("markhor"), "marmota", "marmota:joven", "perdiz", "pika"] }), source: `${WIKI("Snow leopard")} (bharal e íbice como presas principales; acecha desde arriba y salta); velocidad y éxito: nuestros` },
  quebrantahuesos: { ...t({ massKg: 6, strength: 0.25, agility: 0.7, armament: 0.15, diet: "carnivoro", medium: "aire", runMs: 18, senseM: 200, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Bearded vulture")} (vive de huesos: los deja caer desde 50–150 m sobre las rocas para romperlos)` },
  buitre: { ...t({ massKg: 9, strength: 0.3, agility: 0.5, armament: 0.15, diet: "carnivoro", medium: "aire", runMs: 15, senseM: 300, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Himalayan vulture")} (solo carroña; sube en las térmicas)` },
  aguila: { ...t({ massKg: 4.5, strength: 0.45, agility: 0.85, armament: 0.6, diet: "carnivoro", medium: "ambos", runMs: 30, senseM: 300, huntSuccess: 0.2, rangeM: 2000, eats: ["marmota", "marmota:joven", "marmota:cria", "pika", "perdiz", "perdiz:joven", "perdiz:cria", "chova", "ibice:cria", "markhor:cria", "bharal:cria"] }), source: `${WIKI("Golden eagle")} (sobre todo marmotas y liebres; picados de 240–320 km/h; un 20 % de las cazas acaban en captura)` },
  cernicalo: { ...t({ massKg: 0.2, strength: 0.05, agility: 0.9, armament: 0.1, diet: "carnivoro", medium: "aire", runMs: 15, senseM: 60, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Common kestrel")} (se cierne contra el viento; topillos e insectos)` },
  chova: { ...t({ massKg: 0.22, strength: 0.04, agility: 0.95, armament: 0.02, diet: "omnivoro", medium: "aire", runMs: 14, senseM: 40, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Alpine chough")} (vuelo acrobático en bandada)` },
  treparriscos: { ...t({ massKg: 0.018, strength: 0.01, agility: 0.9, armament: 0, diet: "carnivoro", medium: "aire", runMs: 6, senseM: 15, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Wallcreeper")} (insectos y arañas de las paredes)` },
  perdiz: { ...t({ massKg: 2.5, strength: 0.08, agility: 0.6, armament: 0.02, diet: "herbivoro", medium: "tierra", runMs: 6, senseM: 50, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Himalayan snowcock")} (sube corriendo y escapa en planeo ladera abajo)` },
  paloma: { ...t({ massKg: 0.3, strength: 0.03, agility: 0.8, armament: 0, diet: "herbivoro", medium: "aire", runMs: 18, senseM: 40, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Snow pigeon")}` },
  vencejo: { ...t({ massKg: 0.1, strength: 0.02, agility: 1, armament: 0, diet: "carnivoro", medium: "aire", runMs: 25, senseM: 30, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Alpine swift")} (caza insectos en vuelo; pasa casi toda su vida en el aire)` },
  ansar: { ...t({ massKg: 2.5, strength: 0.15, agility: 0.5, armament: 0.03, diet: "herbivoro", medium: "aire", runMs: 22, senseM: 60, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Bar-headed goose")} (vuela sobre el Himalaya en su migración)` },
  Humano: { ...t({ massKg: 60, strength: 0.4, armament: 0.15, diet: "omnivoro", medium: "ambos", runMs: 6.5, senseM: 0, huntSuccess: 0, rangeM: 0 }), source: "Doménica (sprint de 6,5 m/s)" },
};

/** The species key an animal of `stage` is known by among the agents: its young and juveniles are prey apart. */
export const agentKey = (species: string, stage: string): string => (stage === "cria" || stage === "joven" ? `${species}:${stage}` : species);

/** Traits of every key: a young one has its species' traits (its size makes it weak). */
export function agentTraits(): Record<string, Traits> {
  const r: Record<string, Traits> = {};
  for (const [k, v] of Object.entries(BIOME_TRAITS)) {
    r[k] = v;
    // The young hunt nothing yet.
    r[`${k}:cria`] = { ...v, eats: [], huntSuccess: 0 };
    r[`${k}:joven`] = { ...v, eats: v.eats?.filter((e) => e !== `${k}:cria`) ?? [] };
  }
  return r;
}

const NAME: Readonly<Record<string, [string, string, string]>> = {
  ibice: ["un íbice", "una cría de íbice", "un íbice joven"],
  markhor: ["un markhor", "una cría de markhor", "un markhor joven"],
  bharal: ["un bharal", "una cría de bharal", "un bharal joven"],
  marmota: ["una marmota", "una cría de marmota", "una marmota joven"],
  pika: ["una pika", "una cría de pika", "una pika joven"],
  ardilla: ["una ardilla voladora", "una cría de ardilla voladora", "una ardilla voladora joven"],
  zorro: ["un zorro", "un cachorro de zorro", "un zorro joven"],
  leopardo: ["un leopardo de las nieves", "un cachorro de leopardo de las nieves", "un leopardo de las nieves joven"],
  quebrantahuesos: ["un quebrantahuesos", "un pollo de quebrantahuesos", "un quebrantahuesos joven"],
  buitre: ["un buitre del Himalaya", "un pollo de buitre", "un buitre joven"],
  aguila: ["un águila real", "un pollo de águila", "un águila joven"],
  cernicalo: ["un cernícalo", "un pollo de cernícalo", "un cernícalo joven"],
  chova: ["una chova", "un pollo de chova", "una chova joven"],
  treparriscos: ["un treparriscos", "un pollo de treparriscos", "un treparriscos joven"],
  perdiz: ["una perdiz nival", "un pollo de perdiz nival", "una perdiz nival joven"],
  paloma: ["una paloma nival", "un pichón de paloma nival", "una paloma nival joven"],
  vencejo: ["un vencejo real", "un pollo de vencejo", "un vencejo joven"],
  ansar: ["un ánsar indio", "un pollo de ánsar", "un ánsar joven"],
  Humano: ["Doménica", "Doménica", "Doménica"],
};
export const AGENT_NAMES: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(NAME).flatMap(([k, [a, c, j]]) => [[k, a], [`${k}:cria`, c], [`${k}:joven`, j]]));

/** Each species' courtship, in words (its real display), where the source describes it. */
export const COURTSHIPS: Readonly<Record<string, string>> = {
  ibice: "en el celo los machos se juntan a los rebaños de hembras, que entonces crecen mucho (Wikipedia, Siberian ibex)",
  markhor: "los machos solitarios se unen al rebaño de hembras y se tocan en el cortejo (ADW, Capra falconeri)",
  bharal: "el macho la guarda, le corta el paso y la persigue (tending, blocking, coursing: Wikipedia, Bharal)",
  aguila: "la pareja vuela en ondas, subiendo y cayendo sobre su territorio (Wikipedia, Golden eagle)",
  chova: "las parejas son para toda la vida y vuelan juntas dentro de la bandada (Wikipedia, Alpine chough)",
};

/**
 * Each species' contest between males in the rut (fauna `Rivalries`), only where it is documented, with its source:
 * ibex rear up on their hind legs and clash their horns; markhor males compete aggressively in the rut.
 */
export const RIVALRIES: Readonly<Record<string, string>> = {
  ibice: "los machos se alzan sobre las patas traseras y chocan los cuernos (Wikipedia, Siberian ibex)",
  markhor: "los machos compiten con fiereza por las hembras en el celo (ADW, Capra falconeri)",
};

const a = (verb: string, mode: EthoAct["mode"], weight: number, seconds: number, source: string): EthoAct => ({ verb, mode, weight, seconds, source });
const FOLLOW = (src: string) => a("sigue a su madre", "seguir", 1, 60, src);
const NESTLING = (src: string) => a("espera en el nido a que le traigan comida", "quieto", 1, 60, src);

/** What each does when it is calm (Cold Sanctuary's Ethogram, for these species from their sources). */
export const BIOME_ETHOGRAMS: Readonly<Record<string, SpeciesEthogram>> = {
  ibice: { acts: [a("pace pasto y juncias en la ladera", "pacer", 0.5, 30, "Wikipedia, Siberian ibex"), a("descansa en una repisa del cantil", "quieto", 0.3, 40, "Wikipedia, Siberian ibex"), a("cruza la pared de repisa en repisa", "pasear", 0.2, 20, "Wikipedia, Siberian ibex")], young: FOLLOW("Wikipedia, Siberian ibex") },
  markhor: { acts: [a("ramonea los arbustos de la garganta", "pacer", 0.5, 30, "ADW, Capra falconeri"), a("trepa por la pared de la garganta", "pasear", 0.3, 20, "ADW, Capra falconeri"), a("rumia a la sombra", "quieto", 0.2, 40, "ADW, Capra falconeri")], young: FOLLOW("ADW, Capra falconeri") },
  bharal: { acts: [a("pasta en la pradera", "pacer", 0.6, 30, "Wikipedia, Bharal"), a("se queda inmóvil contra la roca", "quieto", 0.4, 30, "Wikipedia, Bharal")], young: FOLLOW("Wikipedia, Bharal") },
  marmota: { acts: [a("vigila erguida junto a su madriguera", "quieto", 0.4, 20, "Wikipedia, Long-tailed marmot"), a("pasta cerca de la madriguera", "pacer", 0.6, 25, "Wikipedia, Long-tailed marmot")], young: a("juega junto a la madriguera", "seguir", 1, 40, "Wikipedia, Long-tailed marmot") },
  pika: { acts: [a("lleva hierba a su pila de heno", "pasear", 0.5, 12, "Wikipedia, Large-eared pika"), a("toma el sol en una piedra", "quieto", 0.5, 20, "Wikipedia, Large-eared pika")], young: a("se esconde en la grieta", "quieto", 1, 30, "Wikipedia, Large-eared pika") },
  ardilla: { acts: [a("planea de un árbol a otro", "patrullar", 0.5, 20, "Wikipedia, Woolly flying squirrel"), a("come agujas de pino", "quieto", 0.5, 30, "Wikipedia, Woolly flying squirrel")], young: a("espera en su grieta", "quieto", 1, 60, "Wikipedia, Woolly flying squirrel") },
  zorro: { acts: [a("acecha ratones en la estepa", "patrullar", 0.5, 25, "Wikipedia, Red fox"), a("descansa al sol", "quieto", 0.5, 30, "Wikipedia, Red fox")], young: FOLLOW("Wikipedia, Red fox") },
  leopardo: { acts: [a("recorre las crestas y marca las rocas con su olor", "patrullar", 0.5, 40, "Jackson et al. 2006, Wildlife Society Bulletin 34: 772–781 (rocas rociadas y rascaderos en sus caminos)"), a("acecha tumbado sobre una roca", "quieto", 0.5, 40, "Wikipedia, Snow leopard")], young: FOLLOW("Wikipedia, Snow leopard") },
  quebrantahuesos: { acts: [a("planea a lo largo de la garganta", "patrullar", 0.6, 40, "Wikipedia, Bearded vulture"), a("descansa en una repisa", "quieto", 0.4, 30, "Wikipedia, Bearded vulture")], young: NESTLING("Wikipedia, Bearded vulture") },
  buitre: { acts: [a("sube en una térmica", "patrullar", 0.6, 50, "Wikipedia, Himalayan vulture"), a("descansa en la repisa de la colonia", "quieto", 0.4, 40, "Wikipedia, Himalayan vulture")], young: NESTLING("Wikipedia, Himalayan vulture") },
  aguila: { acts: [a("planea sobre la pradera", "patrullar", 0.6, 40, "Wikipedia, Golden eagle"), a("otea desde un risco", "quieto", 0.4, 30, "Wikipedia, Golden eagle")], young: NESTLING("Wikipedia, Golden eagle") },
  cernicalo: { acts: [a("se cierne contra el viento", "patrullar", 0.6, 20, "Wikipedia, Common kestrel"), a("otea desde una roca", "quieto", 0.4, 20, "Wikipedia, Common kestrel")], young: NESTLING("Wikipedia, Common kestrel") },
  chova: { acts: [a("vuela en bandada sobre el cantil", "patrullar", 0.5, 25, "Wikipedia, Alpine chough"), a("busca insectos en la pradera", "pacer", 0.5, 20, "Wikipedia, Alpine chough")], young: NESTLING("Wikipedia, Alpine chough") },
  treparriscos: { acts: [a("busca arañas en la pared con las alas abiertas", "pasear", 1, 15, "Wikipedia, Wallcreeper")], young: NESTLING("Wikipedia, Wallcreeper") },
  perdiz: { acts: [a("sube andando la ladera mientras come", "pacer", 0.6, 30, "Wikipedia, Himalayan snowcock"), a("llama desde una roca", "quieto", 0.4, 15, "Wikipedia, Himalayan snowcock")], young: FOLLOW("Wikipedia, Himalayan snowcock") },
  paloma: { acts: [a("come semillas en bandada", "pacer", 0.6, 25, "Wikipedia, Snow pigeon"), a("descansa en su grieta del cantil", "quieto", 0.4, 30, "Wikipedia, Snow pigeon")], young: NESTLING("Wikipedia, Snow pigeon") },
  vencejo: { acts: [a("caza insectos en vuelo", "patrullar", 1, 30, "Wikipedia, Alpine swift")], young: NESTLING("Wikipedia, Alpine swift") },
  ansar: { acts: [a("pasta en la pradera", "pacer", 0.6, 30, "Wikipedia, Bar-headed goose"), a("descansa con la bandada", "quieto", 0.4, 30, "Wikipedia, Bar-headed goose")], young: FOLLOW("Wikipedia, Bar-headed goose") },
};
