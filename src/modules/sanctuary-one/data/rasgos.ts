import type { Traits } from "@modules/fauna/domain/predation";

/**
 * Each sanctuary-1 species' traits for the food chain (modules/fauna: who hunts whom by stats, speeds, senses,
 * hunger and how often its hunts succeed). Real values with their sources; the 0–1 stats (strength, armour, agility,
 * weapon) are ours, set so the stats give the real relations: a lone wolf takes a hare, a pack a musk ox; the bear
 * takes seals and young walruses; the orca seals and penguins in the water; the fox hares' young. Doménica is the
 * observer («Humano»): the timid flee her, nobody hunts her.
 */
const ADW = "Animal Diversity Web (animaldiversity.org)";
const t = (o: Omit<Traits, "armour" | "agility"> & Partial<Pick<Traits, "armour" | "agility">>): Traits => ({ armour: 0.1, agility: 0.5, ...o });

export const TRAITS: Readonly<Record<string, Traits & { readonly source: string }>> = {
  Bear: { ...t({ massKg: 450, strength: 0.9, armour: 0.4, armament: 0.4, packFactor: 0.3, diet: "carnivoro", medium: "ambos", runMs: 11, senseM: 60, huntSuccess: 0.1, hungerPerDay: 0.2, rangeM: 320, eats: ["Seal", "Walrus", "Reindeer", "Penguin", "EmperorPenguin"] }), source: `${ADW} (Ursus maritimus: 350-700 kg, 40 km/h); Stirling 1974, Can J Zool 52:1191 (acecho en respiraderos: ~1 de cada 10-20 intentos); Stirling & Øritsland 1995 (una foca cada 5-6 días)` },
  Seal: { ...t({ massKg: 450, strength: 0.6, armour: 0.5, armament: 0.15, packFactor: 0, diet: "carnivoro", medium: "agua", runMs: 3, senseM: 30, huntSuccess: 0.5, hungerPerDay: 0.8, rangeM: 0, eats: [] }), source: `${ADW} (Leptonychotes weddellii: 400-600 kg; come peces, que no están en la escena); Sato et al. 2003 (nada a 1-3 m/s)` },
  Penguin: { ...t({ massKg: 5, strength: 0.15, armament: 0.05, packFactor: 0, diet: "carnivoro", medium: "ambos", runMs: 2.2, senseM: 20, huntSuccess: 0, hungerPerDay: 1, rangeM: 0, eats: [] }), source: `${ADW} (Pygoscelis adeliae: 4-6 kg, nada a 8 km/h; come krill, fuera de la escena)` },
  EmperorPenguin: { ...t({ massKg: 30, strength: 0.25, armament: 0.05, packFactor: 0, diet: "carnivoro", medium: "ambos", runMs: 2.7, senseM: 20, huntSuccess: 0, hungerPerDay: 1, rangeM: 0, eats: [] }), source: `${ADW} (Aptenodytes forsteri: 22-45 kg, nada a 9,7 km/h; come peces y kril)` },
  Whale: { ...t({ massKg: 30000, strength: 1, armour: 0.6, armament: 0, packFactor: 0, diet: "carnivoro", medium: "agua", runMs: 7.5, senseM: 60, huntSuccess: 0, hungerPerDay: 1, rangeM: 0, eats: [] }), source: `${ADW} (Megaptera novaeangliae: 25-40 t, 27 km/h; filtra kril)` },
  Orca: { ...t({ massKg: 4000, strength: 1, armour: 0.3, agility: 0.8, armament: 0.5, packFactor: 0.8, diet: "carnivoro", medium: "agua", runMs: 15, senseM: 70, huntSuccess: 0.5, hungerPerDay: 1, rangeM: 80, eats: ["Seal", "Penguin", "EmperorPenguin", "Walrus"] }), source: `${ADW} (Orcinus orca: 3-6 t, 56 km/h, ~4 % de su masa al día); Pitman & Durban 2012, Mar Mamm Sci 28:16 (caza de focas en témpanos, en grupo); Guinet 1991 (éxito alto en grupo)` },
  ArcticFox: { ...t({ massKg: 3.5, strength: 0.25, agility: 0.8, armament: 0.15, packFactor: 0.2, diet: "carnivoro", medium: "tierra", runMs: 13, senseM: 30, huntSuccess: 0.3, hungerPerDay: 1, rangeM: 150, eats: ["ArcticHare", "SnowPetrel"] }), source: `${ADW} (Vulpes lagopus: 3-4 kg, 48 km/h; lemmings, lebratos y huevos)` },
  Wolf: { ...t({ massKg: 45, strength: 0.5, agility: 0.6, armament: 0.25, packFactor: 0.8, diet: "carnivoro", medium: "tierra", runMs: 16, senseM: 50, huntSuccess: 0.15, hungerPerDay: 0.4, rangeM: 260, eats: ["MuskOx", "Reindeer", "ArcticHare"] }), source: `${ADW} (Canis lupus arctos: 45 kg, 60 km/h); Mech 1995, Arctic 48:329 (lobos de Ellesmere: bueyes almizcleros y liebres); Mech & Peterson 2003 (éxito de caza ~15 %, una presa cada 2-4 días)` },
  Walrus: { ...t({ massKg: 1000, strength: 0.9, armour: 0.7, armament: 0.3, packFactor: 0.3, diet: "carnivoro", medium: "ambos", runMs: 9.7, senseM: 30, huntSuccess: 0, hungerPerDay: 1, rangeM: 0, eats: [] }), source: `${ADW} (Odobenus rosmarus: 800-1700 kg, 35 km/h en el agua; come almejas del fondo)` },
  Reindeer: { ...t({ massKg: 120, strength: 0.5, armour: 0.2, agility: 0.7, armament: 0.15, packFactor: 0, diet: "herbivoro", medium: "tierra", runMs: 22, senseM: 60, huntSuccess: 0, hungerPerDay: 2, rangeM: 0 }), source: `${ADW} (Rangifer tarandus: 80-180 kg, 80 km/h)` },
  MuskOx: { ...t({ massKg: 300, strength: 0.9, armour: 0.8, armament: 0.3, packFactor: 0, diet: "herbivoro", medium: "tierra", runMs: 11, senseM: 50, huntSuccess: 0, hungerPerDay: 2, rangeM: 0 }), source: `${ADW} (Ovibos moschatus: 200-400 kg, 40 km/h; forma un círculo contra los lobos)` },
  ArcticHare: { ...t({ massKg: 4.5, strength: 0.1, agility: 0.9, armament: 0, packFactor: 0, diet: "herbivoro", medium: "tierra", runMs: 18, senseM: 30, huntSuccess: 0, hungerPerDay: 2, rangeM: 0 }), source: `${ADW} (Lepus arcticus: 4-5,5 kg, 64 km/h)` },
  SnowPetrel: { ...t({ massKg: 0.3, strength: 0.05, agility: 0.9, armament: 0, packFactor: 0, diet: "carnivoro", medium: "aire", runMs: 15, senseM: 30, huntSuccess: 0, hungerPerDay: 1, rangeM: 0 }), source: `${ADW} (Pagodroma nivea: 240-460 g; vuela; come kril)` },
  Humano: { ...t({ massKg: 60, strength: 0.4, armament: 0.15, packFactor: 0, diet: "omnivoro", medium: "ambos", runMs: 6.5, senseM: 0, huntSuccess: 0, hungerPerDay: 0, rangeM: 0 }), source: "Doménica (sprint de 6,5 m/s, domain/effort.ts)" },
};

/** How each species is named in what the animals do: «huye de un lobo ártico». */
export const NAMES: Readonly<Record<string, string>> = {
  Bear: "un oso polar", Seal: "una foca", Penguin: "un pingüino", EmperorPenguin: "un pingüino emperador", Whale: "una ballena", Orca: "una orca",
  ArcticFox: "un zorro ártico", Wolf: "un lobo ártico", Walrus: "una morsa", Reindeer: "un reno", MuskOx: "un buey almizclero", ArcticHare: "una liebre ártica",
  SnowPetrel: "un petrel níveo", Humano: "Doménica",
};
