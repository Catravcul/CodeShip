import type { Traits } from "@modules/fauna/domain/predation";
import type { EthoAct, SpeciesEthogram } from "@modules/fauna/domain/ethogram";

/**
 * How the biome's animals behave (fauna's Ecosystem: who hunts whom by stats, who flees, the habits of each, the
 * courtships). Speeds and diets are real, with their source; the 0–1 stats (strength, armour, agility, weapon) are
 * ours, set so the stats give the real relations: the leopard seal takes penguins in the water and fur seal pups; the
 * skua takes eggs and chicks and small birds; the sheathbill robs the colony; nobody takes a grown elephant seal.
 * Prey is told apart by stage (docs/design/fauna.md: «siempre `eats`»): `papua:cria` is a gentoo chick.
 */
const WIKI = (p: string) => `Wikipedia, ${p}`;
const t = (o: Omit<Traits, "armour" | "agility" | "packFactor" | "hungerPerDay"> & Partial<Pick<Traits, "armour" | "agility" | "packFactor" | "hungerPerDay">>): Traits => ({ armour: 0.1, agility: 0.5, packFactor: 0, hungerPerDay: 1, ...o });

export const BIOME_TRAITS: Readonly<Record<string, Traits & { readonly source: string }>> = {
  papua: { ...t({ massKg: 5.5, strength: 0.15, armament: 0.05, diet: "carnivoro", medium: "ambos", runMs: 10, senseM: 25, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Gentoo penguin")} (el pingüino que más rápido nada: hasta 36 km/h)` },
  damero: { ...t({ massKg: 0.45, strength: 0.05, agility: 0.9, armament: 0, diet: "carnivoro", medium: "aire", runMs: 12, senseM: 25, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Cape petrel")} (vuela bajo sobre el agua y picotea kril)` },
  albatros: { ...t({ massKg: 9, strength: 0.3, agility: 0.6, armament: 0.1, diet: "carnivoro", medium: "aire", runMs: 15, senseM: 40, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Wandering albatross")} (planeo dinámico; ~15 m/s de media)` },
  pagalo: { ...t({ massKg: 1.3, strength: 0.1, agility: 0.8, armament: 0.05, diet: "carnivoro", medium: "ambos", runMs: 14, senseM: 40, huntSuccess: 0.35, rangeM: 200, eats: ["papua:cria", "damero:cria", "bisbita:cria", "bisbita:joven"] }), source: `${WIKI("South polar skua")} (caza huevos y pollos de pingüino y de aves pequeñas); éxito: nuestro` },
  charran: { ...t({ massKg: 0.1, strength: 0.03, agility: 0.95, armament: 0, diet: "carnivoro", medium: "aire", runMs: 10, senseM: 20, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Arctic tern")} (se cierne y se zambulle por kril y peces pequeños)` },
  bisbita: { ...t({ massKg: 0.036, strength: 0.02, agility: 0.9, armament: 0, diet: "carnivoro", medium: "tierra", runMs: 6, senseM: 15, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("South Georgia pipit")} (insectos entre el tussac y la orilla)` },
  picovaina: { ...t({ massKg: 0.65, strength: 0.08, agility: 0.6, armament: 0.08, diet: "omnivoro", medium: "tierra", runMs: 4, senseM: 20, huntSuccess: 0.25, rangeM: 60, eats: ["papua:cria"] }), source: `${WIKI("Snowy sheathbill")} (anda más que vuela; roba huevos y pollos de la colonia); éxito: nuestro` },
  lobo: { ...t({ massKg: 38, strength: 0.4, armour: 0.3, armament: 0.2, diet: "carnivoro", medium: "ambos", runMs: 4, senseM: 30, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Antarctic fur seal")} (anda a cuatro patas en tierra; come kril y peces)` },
  elefante: { ...t({ massKg: 500, strength: 0.8, armour: 0.7, armament: 0.1, diet: "carnivoro", medium: "ambos", runMs: 2.5, senseM: 30, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${WIKI("Southern elephant seal")} (lento en tierra; calamar y peces en lo hondo)` },
  leopardo: { ...t({ massKg: 400, strength: 0.9, armour: 0.4, agility: 0.7, armament: 0.6, diet: "carnivoro", medium: "agua", runMs: 10, senseM: 60, huntSuccess: 0.5, rangeM: 200, eats: ["papua:joven", "papua", "lobo:cria", "lobo:joven"] }), source: `${WIKI("Leopard seal")} (hasta ~40 km/h; acecha a los pingüinos en la orilla, en el agua, y caza crías de lobo marino); éxito: nuestro` },
  Humano: { ...t({ massKg: 60, strength: 0.4, armament: 0.15, diet: "omnivoro", medium: "ambos", runMs: 6.5, senseM: 0, huntSuccess: 0, rangeM: 0 }), source: "Doménica (sprint de 6,5 m/s)" },
};

/** The species key an animal of `stage` is known by among the agents: its young and juveniles are prey apart. */
export const agentKey = (species: string, stage: string): string => (stage === "cria" || stage === "joven" ? `${species}:${stage}` : species);

/** Traits of every key: a chick has its species' traits (its size makes it weak). */
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
  papua: ["un pingüino papúa", "un pollo de pingüino papúa", "un pingüino papúa joven"],
  damero: ["un petrel damero", "un pollo de petrel damero", "un petrel damero joven"],
  albatros: ["un albatros viajero", "un pollo de albatros", "un albatros joven"],
  pagalo: ["un págalo", "un pollo de págalo", "un págalo joven"],
  charran: ["un charrán ártico", "un pollo de charrán", "un charrán joven"],
  bisbita: ["una bisbita", "un pollo de bisbita", "una bisbita joven"],
  picovaina: ["un picovaina", "un pollo de picovaina", "un picovaina joven"],
  lobo: ["un lobo marino", "una cría de lobo marino", "un lobo marino joven"],
  elefante: ["un elefante marino", "una cría de elefante marino", "un elefante marino joven"],
  leopardo: ["una foca leopardo", "una cría de foca leopardo", "una foca leopardo joven"],
  Humano: ["Doménica", "Doménica", "Doménica"],
};
export const AGENT_NAMES: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(NAME).flatMap(([k, [a, c, j]]) => [[k, a], [`${k}:cria`, c], [`${k}:joven`, j]]));

/** Each species' courtship, in words (its real display). */
export const COURTSHIPS: Readonly<Record<string, string>> = {
  papua: "el macho le ofrece guijarros y rebuznan con la cabeza al cielo (ADW, Pygoscelis papua)",
  damero: "se llaman y se acicalan el uno al otro en la repisa (Wikipedia, Cape petrel)",
  albatros: "bailan con las alas abiertas, chocan los picos y gritan al cielo (Wikipedia, Wandering albatross)",
  pagalo: "se llaman con las alas alzadas en su territorio (Wikipedia, South polar skua)",
  bisbita: "el macho canta en vuelo sobre el tussac (Wikipedia, South Georgia pipit)",
  picovaina: "inclinan la cabeza y se llaman junto al nido (Wikipedia, Snowy sheathbill)",
  lobo: "el macho guarda a sus hembras en la playa y ruge a los demás (Wikipedia, Antarctic fur seal)",
  elefante: "el macho dominante guarda su harén y ruge con la trompa inflada (Wikipedia, Southern elephant seal)",
  leopardo: "cantan bajo el agua en el celo (Wikipedia, Leopard seal)",
};

const a = (verb: string, mode: EthoAct["mode"], weight: number, seconds: number, source: string): EthoAct => ({ verb, mode, weight, seconds, source });

/** What each does when it is calm (Cold Sanctuary's Ethogram, for these species from their sources). */
export const BIOME_ETHOGRAMS: Readonly<Record<string, SpeciesEthogram>> = {
  papua: {
    acts: [
      a("lleva un guijarro a su nido", "pasear", 0.5, 8, "ADW, Pygoscelis papua (nidos de piedras y hierba)"),
      a("se acicala", "quieto", 0.3, 25, "ADW, Pygoscelis papua"),
      a("se apiña con la colonia", "apinarse", 0.3, 30, "Wikipedia, Gentoo penguin"),
    ],
    young: a("pide comida a sus padres en el nido", "seguir", 1, 60, "Wikipedia, Gentoo penguin (los pollos se reúnen en guarderías)"),
  },
  damero: { acts: [a("vuela bajo sobre el mar", "patrullar", 0.6, 40, "Wikipedia, Cape petrel"), a("descansa en la repisa", "quieto", 0.4, 30, "Wikipedia, Cape petrel")], young: a("espera en el nido", "quieto", 1, 60, "Wikipedia, Cape petrel") },
  albatros: { acts: [a("planea sobre el mar", "patrullar", 0.6, 60, "Wikipedia, Wandering albatross"), a("descansa en su nido de barro y tussac", "quieto", 0.4, 40, "Wikipedia, Wandering albatross")], young: a("espera en el nido meses a que vuelvan sus padres", "quieto", 1, 90, "Wikipedia, Wandering albatross") },
  pagalo: { acts: [a("vigila su territorio desde una roca", "quieto", 0.5, 30, "Wikipedia, South polar skua"), a("patrulla la colonia en vuelo", "patrullar", 0.5, 30, "Wikipedia, South polar skua")], young: a("se esconde entre el musgo", "quieto", 1, 60, "Wikipedia, South polar skua") },
  charran: { acts: [a("se cierne y se zambulle", "patrullar", 0.7, 30, "Wikipedia, Arctic tern"), a("descansa en la orilla", "quieto", 0.3, 20, "Wikipedia, Arctic tern")], young: a("espera", "quieto", 1, 30, "Wikipedia, Arctic tern") },
  bisbita: { acts: [a("busca insectos entre el tussac", "pacer", 0.6, 20, "Wikipedia, South Georgia pipit"), a("canta en una mata", "quieto", 0.4, 15, "Wikipedia, South Georgia pipit")], young: a("pía en el nido del tussac", "quieto", 1, 30, "Wikipedia, South Georgia pipit") },
  picovaina: { acts: [a("ronda la colonia buscando restos", "pasear", 0.6, 20, "Wikipedia, Snowy sheathbill"), a("descansa sobre una roca", "quieto", 0.4, 20, "Wikipedia, Snowy sheathbill")], young: a("espera en la grieta del nido", "quieto", 1, 30, "Wikipedia, Snowy sheathbill") },
  lobo: { acts: [a("descansa en la playa", "quieto", 0.6, 40, "Wikipedia, Antarctic fur seal"), a("se rasca y se acicala", "quieto", 0.2, 15, "Wikipedia, Antarctic fur seal"), a("cambia de sitio en la playa", "pasear", 0.2, 20, "Wikipedia, Antarctic fur seal")], young: a("sigue a su madre y mama", "seguir", 1, 60, "Wikipedia, Antarctic fur seal") },
  elefante: { acts: [a("duerme en la playa", "quieto", 0.7, 60, "Wikipedia, Southern elephant seal"), a("se echa arena por encima", "quieto", 0.3, 20, "Wikipedia, Southern elephant seal")], young: a("mama junto a su madre", "seguir", 1, 60, "Wikipedia, Southern elephant seal") },
  leopardo: { acts: [a("patrulla la orilla de la colonia", "patrullar", 0.6, 40, "Wikipedia, Leopard seal"), a("descansa en la playa", "quieto", 0.4, 40, "Wikipedia, Leopard seal")], young: a("sigue a su madre", "seguir", 1, 60, "Wikipedia, Leopard seal") },
};
