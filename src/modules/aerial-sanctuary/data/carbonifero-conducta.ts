import type { Traits } from "@modules/fauna/domain/predation";
import type { EthoAct, SpeciesEthogram } from "@modules/fauna/domain/ethogram";

/**
 * How the Carboniferous giants behave (fauna's Ecosystem, like data/bioma-conducta.ts, which merges these): who hunts
 * whom by stats, their habits from their sources (data/carbonifero.ts). Their speeds are real (×1: they are drawn at
 * their fossil size); the 0–1 stats are ours, set so the stats give the relations of the chain: the griffenflies take
 * flying insects (Meganeuropsis the paleodictyopterans too); nobody hunts the Arthropleura.
 */
const t = (o: Omit<Traits, "armour" | "agility" | "packFactor" | "hungerPerDay"> & Partial<Pick<Traits, "armour" | "agility" | "packFactor" | "hungerPerDay">>): Traits => ({ armour: 0.1, agility: 0.5, packFactor: 0, hungerPerDay: 1, ...o });
const SRC = "data/carbonifero.ts (sus fuentes); estadísticas 0–1 nuestras";

export const CARBON_TRAITS: Readonly<Record<string, Traits & { readonly source: string }>> = {
  arthropleura: { ...t({ massKg: 50, strength: 0.8, armour: 0.8, agility: 0.1, armament: 0.1, diet: "herbivoro", medium: "tierra", runMs: 0.5, senseM: 8, huntSuccess: 0, rangeM: 0, eats: [] }), source: `Davies et al. 2021 (placas duras en cada segmento; lento, pacía restos de plantas); ${SRC}` },
  cucaracha: { ...t({ massKg: 2e-3, strength: 0.05, armour: 0.3, agility: 0.7, armament: 0, diet: "herbivoro", medium: "tierra", runMs: 1, senseM: 3, huntSuccess: 0, rangeM: 0, eats: [] }), source: `Garwood y Sutton 2010 (patas para correr; podía volar con sus alas); ${SRC}` },
  mazothairos: { ...t({ massKg: 0.012, strength: 0.15, armour: 0.15, agility: 0.3, armament: 0, diet: "herbivoro", medium: "aire", runMs: 3, senseM: 10, huntSuccess: 0, rangeM: 0, eats: [] }), source: `Kukalová-Peck 1978 (no plegaba las alas: vuelo menos ágil que el de las libélulas); ${SRC}` },
  meganeura: { ...t({ massKg: 0.025, strength: 0.4, agility: 0.9, armament: 0.6, diet: "carnivoro", medium: "aire", runMs: 8, senseM: 40, huntSuccess: 0.7, rangeM: 300, eats: ["cucaracha"] }), source: `Wikipedia, Meganeura (patas espinosas para atrapar presas al vuelo); ${SRC}` },
  meganeuropsis: { ...t({ massKg: 0.035, strength: 0.5, agility: 0.9, armament: 0.7, diet: "carnivoro", medium: "aire", runMs: 8, senseM: 40, huntSuccess: 0.7, rangeM: 300, eats: ["mazothairos", "cucaracha", "meganeura"] }), source: `Wikipedia, Meganeuropsis; ${SRC}` },
};

export const CARBON_NAMES: Readonly<Record<string, [string, string, string]>> = {
  arthropleura: ["una artropleura", "una artropleura joven", "una artropleura joven"],
  cucaracha: ["una cucaracha primitiva", "una ninfa de cucaracha primitiva", "una cucaracha joven"],
  mazothairos: ["un mazothairos", "una ninfa de mazothairos", "un mazothairos joven"],
  meganeura: ["una meganeura", "una ninfa de meganeura", "una meganeura joven"],
  meganeuropsis: ["una meganeuropsis", "una ninfa de meganeuropsis", "una meganeuropsis joven"],
};

const a = (verb: string, mode: EthoAct["mode"], weight: number, seconds: number, source: string): EthoAct => ({ verb, mode, weight, seconds, source });

export const CARBON_ETHOGRAMS: Readonly<Record<string, SpeciesEthogram>> = {
  arthropleura: { acts: [a("come hojarasca del suelo del bosque", "pacer", 0.7, 30, "Davies et al. 2021"), a("avanza despacio ondulando sus patas", "pasear", 0.3, 25, "Wikipedia, Arthropleura (huellas Diplichnites de hasta 50 cm de ancho)")], young: a("busca hojarasca entre los helechos (añade segmentos con cada muda)", "pacer", 1, 30, "Lhéritier et al. 2024") },
  cucaracha: { acts: [a("hurga en la hojarasca", "pacer", 0.6, 25, "Grimaldi y Engel 2005"), a("corre a esconderse bajo la corteza caída", "pasear", 0.4, 10, "Garwood y Sutton 2010")], young: a("come hojarasca (una ninfa sin alas)", "pacer", 1, 25, "Grimaldi y Engel 2005") },
  mazothairos: { acts: [a("chupa con su pico los jugos de un cono", "quieto", 0.6, 30, "Labandeira 1997"), a("vuela despacio de árbol en árbol con las alas extendidas", "patrullar", 0.4, 20, "Kukalová-Peck 1978")], young: a("chupa la savia de un tallo (una ninfa con esbozos de alas)", "quieto", 1, 30, "Kukalová-Peck 1978") },
  meganeura: { acts: [a("patrulla sobre el bosque cazando al vuelo", "patrullar", 0.7, 30, "Wikipedia, Meganeura"), a("descansa en un tronco con las alas abiertas", "quieto", 0.3, 20, "Wikipedia, Meganeura")], young: a("caza bajo el agua de la charca (ninfa: ficción)", "pacer", 1, 30, "data/carbonifero.ts") },
  meganeuropsis: { acts: [a("patrulla alto sobre los árboles cazando al vuelo", "patrullar", 0.7, 30, "Wikipedia, Meganeuropsis"), a("descansa en una rama de cordaites", "quieto", 0.3, 20, "Wikipedia, Meganeuropsis")], young: a("caza bajo el agua de la charca (ninfa: ficción)", "pacer", 1, 30, "data/carbonifero.ts") },
};
