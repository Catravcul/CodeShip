import type { Traits } from "@modules/fauna/domain/predation";
import type { EthoAct, SpeciesEthogram } from "@modules/fauna/domain/ethogram";
import { fact } from "./sources";

/**
 * How the giant insects of the air biome behave (fauna's Ecosystem: who hunts whom by stats, who flees, the habits of
 * each, the courtships and the contests). Diets and the facts in the words are real, with their source (Wikipedia
 * species pages unless said); the 0–1 stats (strength, armour, agility, weapon) are ours, set so the stats give the real
 * relations: the dragonfly takes small flies and hoverflies in flight; the robber fly flies, hoverflies and bees; the
 * mantis locusts, butterflies, hoverflies and bees from ambush; the hornet bees at the hive and other insects; nobody
 * takes the hornet (on the island). Prey is told apart by stage (docs/design/fauna.md: «siempre `eats`»): the hunters
 * take adults (and the locust's nymphs), never eggs or pupae (domain/bioma.ts `quietNow`).
 *
 * Speeds (`runMs`, m/s in the scene) are the real ones × `INSECT_SPEED` (licencia): the insects are 400 times their
 * size (data/bioma.ts `INSECT_SCALE`); at their real speed a 5 m bee would seem to crawl, at 400 times it would cross
 * the island in two seconds.
 */
export const INSECT_SPEED = fact(4, "licencia", "nuestro: entre la velocidad real (se verían a cámara lenta) y ×400 (cruzarían la isla en segundos)");
const W = (p: string) => `Wikipedia, ${p}`;
const t = (o: Omit<Traits, "armour" | "agility" | "packFactor" | "hungerPerDay"> & Partial<Pick<Traits, "armour" | "agility" | "packFactor" | "hungerPerDay">>): Traits => ({ armour: 0.1, agility: 0.5, packFactor: 0, hungerPerDay: 1, ...o });
const v = (realMs: number) => realMs * INSECT_SPEED.value;
/** A prey's adult and its nymph (the hunters' keys). */
const ADULT_NYMPH = (s: string) => [s, `${s}:joven`];

export const BIOME_TRAITS: Readonly<Record<string, Traits & { readonly source: string }>> = {
  abeja: { ...t({ massKg: 8e-5, strength: 0.2, armour: 0.15, agility: 0.7, armament: 0.35, diet: "herbivoro", medium: "aire", runMs: v(7), senseM: 30, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${W("Apis cerana")} (pica; forma una bola de obreras que calienta al avispón hasta matarlo); vuela a ~7 m/s (${W("Western honey bee")})` },
  abejorro: { ...t({ massKg: 6e-4, strength: 0.3, armour: 0.2, agility: 0.5, armament: 0.35, diet: "herbivoro", medium: "aire", runMs: v(5), senseM: 30, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${W("Bumblebee")} (pica; vuela con frío calentando sus músculos)` },
  mariposa: { ...t({ massKg: 3e-4, strength: 0.05, agility: 0.5, armament: 0, diet: "herbivoro", medium: "aire", runMs: v(3), senseM: 20, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${W("Parnassius")} (vuelo lento y planeado cerca del suelo)` },
  saltamontes: { ...t({ massKg: 2e-3, strength: 0.15, armour: 0.15, agility: 0.6, armament: 0.05, diet: "herbivoro", medium: "tierra", runMs: v(3), senseM: 20, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${W("Migratory locust")} (salta con sus patas traseras y vuela en enjambre)` },
  drosophila: { ...t({ massKg: 1e-6, strength: 0.01, agility: 0.8, armament: 0, diet: "herbivoro", medium: "aire", runMs: v(1), senseM: 10, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${W("Drosophila melanogaster")} (se lanza al vuelo en una fracción de segundo cuando ve venir algo)` },
  carronero: { ...t({ massKg: 4e-4, strength: 0.2, armour: 0.5, agility: 0.3, armament: 0.1, diet: "carnivoro", medium: "tierra", runMs: v(0.1), senseM: 60, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${W("Nicrophorus nepalensis")} (huele un cadáver desde lejos y vuela a él)` },
  pelotero: { ...t({ massKg: 1e-4, strength: 0.1, armour: 0.5, agility: 0.3, armament: 0.02, diet: "herbivoro", medium: "tierra", runMs: v(0.05), senseM: 40, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${W("Aphodiinae")} (vive dentro de la boñiga)` },
  mariquita: { ...t({ massKg: 4e-5, strength: 0.05, armour: 0.5, agility: 0.4, armament: 0.15, diet: "carnivoro", medium: "aire", runMs: v(1), senseM: 10, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${W("Coccinella septempunctata")} (sus colores avisan: sabe mal y suelta un líquido amargo)` },
  crisopa: { ...t({ massKg: 1e-5, strength: 0.02, agility: 0.4, armament: 0.02, diet: "omnivoro", medium: "aire", runMs: v(0.6), senseM: 10, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${W("Chrysoperla carnea")} (vuela de noche y oye a los murciélagos)` },
  sirfido: { ...t({ massKg: 1.5e-5, strength: 0.02, agility: 0.95, armament: 0, diet: "herbivoro", medium: "aire", runMs: v(4), senseM: 15, huntSuccess: 0, rangeM: 0, eats: [] }), source: `${W("Episyrphus balteatus")} (se cierne inmóvil y sale disparado; imita a una avispa)` },
  hormiga: { ...t({ massKg: 3e-5, strength: 0.15, armour: 0.3, agility: 0.5, armament: 0.3, diet: "omnivoro", medium: "tierra", runMs: v(0.05), senseM: 10, huntSuccess: 0.3, rangeM: 0, eats: [], packFactor: 0.5 }), source: `${W("Formica")} (rocían ácido fórmico; se defienden en grupo)` },
  asilido: { ...t({ massKg: 5e-5, strength: 0.25, agility: 0.9, armament: 0.6, diet: "carnivoro", medium: "ambos", runMs: v(6), senseM: 40, huntSuccess: 0.4, rangeM: 600, eats: ["drosophila", "sirfido", "abeja"] }), source: `${W("Asilidae")} (acecha en una percha, caza al vuelo y paraliza con su saliva; hasta abejas y avispas)` },
  libelula: { ...t({ massKg: 3e-4, strength: 0.3, agility: 1, armament: 0.5, diet: "carnivoro", medium: "ambos", runMs: v(10), senseM: 80, huntSuccess: 0.9, rangeM: 1200, eats: ["drosophila", "sirfido", "mariposa"] }), source: `${W("Pantala flavescens")}; Combes et al. 2012, J. Exp. Biol. 215: 903 (más del 90 % de sus cazas acaban en captura)` },
  mantis: { ...t({ massKg: 2.5e-3, strength: 0.5, armour: 0.2, agility: 0.7, armament: 0.8, diet: "carnivoro", medium: "ambos", runMs: v(1.5), senseM: 40, huntSuccess: 0.5, rangeM: 200, eats: [...ADULT_NYMPH("saltamontes"), "mariposa", "sirfido", "abeja"] }), source: `${W("European mantis")} (caza al acecho con las patas raptoras)` },
  avispon: { ...t({ massKg: 6e-4, strength: 0.6, armour: 0.35, agility: 0.8, armament: 0.8, diet: "carnivoro", medium: "ambos", runMs: v(6), senseM: 80, huntSuccess: 0.3, rangeM: 1500, eats: ["abeja", "sirfido", "drosophila", ...ADULT_NYMPH("saltamontes")] }), source: `${W("Asian hornet")} (se cierne ante las colmenas y caza abejas al vuelo)` },
  // Next to insects 400 times their size, Doménica is as small as a 4 mm insect: her 60 kg ÷ 400³ (they do not flee her).
  Humano: { ...t({ massKg: 60 / 400 ** 3, strength: 0.01, armament: 0, diet: "omnivoro", medium: "ambos", runMs: 6.5, senseM: 0, huntSuccess: 0, rangeM: 0 }), source: "Doménica (sprint de 6,5 m/s); su masa a la escala de los insectos gigantes (60 kg ÷ 400³): nuestro" },
};

/** The species key an animal of `stage` is known by among the agents: its young and juveniles are prey apart. */
export const agentKey = (species: string, stage: string): string => (stage === "cria" || stage === "joven" ? `${species}:${stage}` : species);

/** Traits of every key: a young one has its species' traits (its size makes it weak). */
export function agentTraits(): Record<string, Traits> {
  const r: Record<string, Traits> = {};
  for (const [k, x] of Object.entries(BIOME_TRAITS)) {
    r[k] = x;
    // The young hunt nothing yet (a mantis nymph does, but small prey the chain does not see).
    r[`${k}:cria`] = { ...x, eats: [], huntSuccess: 0 };
    r[`${k}:joven`] = { ...x, eats: x.eats?.filter((e) => e !== `${k}:cria`) ?? [] };
  }
  return r;
}

/** «a bee», its young (larva or nymph), its pupa or last nymph. */
const NAME: Readonly<Record<string, [string, string, string]>> = {
  abeja: ["una abeja asiática", "una larva de abeja", "una pupa de abeja"],
  abejorro: ["un abejorro", "una larva de abejorro", "una pupa de abejorro"],
  mariposa: ["una mariposa apolo", "una oruga de apolo", "una crisálida de apolo"],
  saltamontes: ["una langosta", "una ninfa de langosta", "una langosta joven"],
  drosophila: ["una mosca de la fruta", "una larva de mosca de la fruta", "una pupa de mosca de la fruta"],
  carronero: ["un escarabajo enterrador", "una larva de escarabajo enterrador", "una pupa de escarabajo enterrador"],
  pelotero: ["un escarabajo del estiércol", "una larva de escarabajo del estiércol", "una pupa de escarabajo del estiércol"],
  mariquita: ["una mariquita", "una larva de mariquita", "una pupa de mariquita"],
  crisopa: ["una crisopa", "una larva de crisopa", "un capullo de crisopa"],
  sirfido: ["un sírfido", "una larva de sírfido", "una pupa de sírfido"],
  hormiga: ["una reina de hormiga", "una larva de hormiga", "una pupa de hormiga"],
  asilido: ["una mosca ladrona", "una larva de mosca ladrona", "una pupa de mosca ladrona"],
  libelula: ["una libélula", "una ninfa de libélula", "una libélula joven"],
  mantis: ["una mantis", "una ninfa de mantis", "una mantis joven"],
  avispon: ["un avispón", "una larva de avispón", "una pupa de avispón"],
  Humano: ["Doménica", "Doménica", "Doménica"],
};
export const AGENT_NAMES: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(NAME).flatMap(([k, [a, c, j]]) => [[k, a], [`${k}:cria`, c], [`${k}:joven`, j]]));

/** Each species' courtship, in words (its real display), where the source describes it. */
export const COURTSHIPS: Readonly<Record<string, string>> = {
  drosophila: "el macho la sigue y hace vibrar un ala: canta una canción de cortejo propia de su especie (Wikipedia, Drosophila melanogaster)",
  mariposa: "tras aparearse, el macho le deja un tapón en el abdomen, el esfragis, para que no se aparee con otro (Wikipedia, Parnassius)",
  libelula: "vuelan en tándem, el macho sujetando a la hembra por la nuca, y ella pone en el agua (Wikipedia, Pantala flavescens)",
  mantis: "el macho se acerca despacio por detrás; a veces la hembra se lo come (Wikipedia, European mantis)",
  abejorro: "los machos patrullan un circuito marcado con su olor esperando a las reinas nuevas (Wikipedia, Bumblebee)",
  abeja: "las reinas vírgenes vuelan a las zonas donde se juntan los zánganos y se aparean en el aire (Oldroyd y Wongsiri 2006)",
};

/** Each species' contest between males (fauna `Rivalries`), only where it is documented. */
export const RIVALRIES: Readonly<Record<string, string>> = {
  drosophila: "los machos se embisten y se empujan con las patas delanteras por un trozo de fruta (Wikipedia, Drosophila melanogaster)",
  libelula: "los machos defienden su tramo de agua y persiguen a los rivales (Wikipedia, Dragonfly)",
};

const a = (verb: string, mode: EthoAct["mode"], weight: number, seconds: number, source: string): EthoAct => ({ verb, mode, weight, seconds, source });
const LARVA = (verb: string, src: string) => a(verb, "pacer", 1, 30, src);

/** What each does when it is calm (Cold Sanctuary's Ethogram, for these species from their sources). */
export const BIOME_ETHOGRAMS: Readonly<Record<string, SpeciesEthogram>> = {
  abeja: { acts: [a("liba néctar y recoge polen de flor en flor", "patrullar", 0.6, 25, W("Apis cerana")), a("vuelve a la colmena con las cestas de polen", "pasear", 0.25, 20, W("Apis cerana")), a("baila en la colmena para contar dónde están las flores", "quieto", 0.15, 20, "Oldroyd y Wongsiri 2006 (A. cerana danza como A. mellifera)")], young: LARVA("come la papilla que le dan las nodrizas", W("Apis cerana")) },
  abejorro: { acts: [a("pecorea flores de la pradera", "patrullar", 0.6, 25, W("Bumblebee")), a("calienta sus músculos temblando antes de volar", "quieto", 0.4, 15, W("Bumblebee"))], young: LARVA("come polen y néctar en su celda", W("Bumblebee")) },
  mariposa: { acts: [a("planea despacio sobre la pedrera", "patrullar", 0.5, 25, W("Parnassius")), a("liba en una flor con las alas abiertas al sol", "quieto", 0.5, 20, W("Parnassius"))], young: LARVA("come hojas de las plantas en cojín", W("Parnassius")) },
  saltamontes: { acts: [a("come hierba en la estepa", "pacer", 0.6, 30, W("Migratory locust")), a("salta y vuela un trecho", "pasear", 0.2, 10, W("Migratory locust")), a("toma el sol en una piedra", "quieto", 0.2, 20, W("Migratory locust"))], young: a("salta entre la hierba (una ninfa, sin alas)", "pacer", 1, 20, W("Migratory locust")) },
  drosophila: { acts: [a("lame la levadura de una baya de espino que fermenta", "quieto", 0.5, 20, W("Drosophila melanogaster")), a("revolotea junto a las bayas", "patrullar", 0.5, 15, W("Drosophila melanogaster"))], young: LARVA("come dentro de la fruta", W("Drosophila melanogaster")) },
  carronero: { acts: [a("busca un cadáver por el olor", "patrullar", 0.5, 25, W("Nicrophorus nepalensis")), a("entierra un cadáver con su pareja", "quieto", 0.5, 30, W("Nicrophorus nepalensis"))], young: LARVA("come en la cripta lo que le regurgitan sus padres", W("Nicrophorus nepalensis")) },
  pelotero: { acts: [a("entra y sale de una boñiga", "pacer", 0.7, 25, W("Aphodiinae")), a("vuela a otra boñiga", "patrullar", 0.3, 15, W("Dung beetle"))], young: LARVA("come estiércol bajo tierra", W("Aphodiinae")) },
  mariquita: { acts: [a("come pulgones en una rama", "pacer", 0.6, 25, W("Coccinella septempunctata")), a("vuela a otra planta con pulgones", "patrullar", 0.4, 15, W("Coccinella septempunctata"))], young: LARVA("caza pulgones por la rama", W("Coccinella septempunctata")) },
  crisopa: { acts: [a("liba néctar y melaza", "quieto", 0.6, 25, W("Chrysoperla carnea")), a("revolotea despacio", "patrullar", 0.4, 15, W("Chrysoperla carnea"))], young: LARVA("devora pulgones, el «león de los pulgones»", W("Chrysoperla carnea")) },
  sirfido: { acts: [a("se cierne inmóvil en el aire", "quieto", 0.5, 12, W("Episyrphus balteatus")), a("come polen de una flor", "patrullar", 0.5, 20, W("Episyrphus balteatus"))], young: LARVA("caza pulgones a ciegas por la hoja", W("Episyrphus balteatus")) },
  hormiga: { acts: [a("ordeña a los pulgones por su melaza", "pacer", 0.6, 25, W("Formica")), a("lleva una presa al hormiguero", "pasear", 0.4, 20, W("Formica"))], young: LARVA("espera a que la alimenten las obreras", W("Formica")) },
  asilido: { acts: [a("acecha desde una percha", "quieto", 0.6, 25, W("Asilidae")), a("sale al vuelo tras un insecto", "patrullar", 0.4, 10, W("Asilidae"))], young: LARVA("caza larvas en el suelo", W("Asilidae")) },
  libelula: { acts: [a("patrulla sobre el río cazando al vuelo", "patrullar", 0.7, 30, W("Pantala flavescens")), a("descansa en una rama con las alas abiertas", "quieto", 0.3, 20, W("Dragonfly"))], young: a("caza bajo el agua con su máscara (una ninfa)", "pacer", 1, 30, W("Dragonfly")) },
  mantis: { acts: [a("acecha inmóvil con las patas raptoras plegadas", "quieto", 0.7, 30, W("European mantis")), a("se balancea despacio como una hoja al viento", "pasear", 0.3, 15, W("European mantis"))], young: a("acecha moscas pequeñas (una ninfa)", "quieto", 1, 30, W("European mantis")) },
  avispon: { acts: [a("se cierne ante una colmena esperando a las abejas", "quieto", 0.4, 20, W("Asian hornet")), a("caza insectos al vuelo", "patrullar", 0.6, 25, W("Asian hornet"))], young: LARVA("espera en su celda a que le traigan carne masticada", W("Asian hornet")) },
};
