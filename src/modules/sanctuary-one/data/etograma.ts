import type { EthoAct, SpeciesEthogram } from "../domain/ethogram";

/**
 * Each sanctuary-1 species' ethogram (domain/ethogram.ts). Cold Sanctuary's own activities, verbs and sources where it
 * has the species (Assets/Animals/Ethogram.cs, «SANTUARIO DE HIELO»: Penguin, Bear, Seal, Whale, Orca, Fox, Bunny →
 * liebre ártica, Deer → reno); the walrus, musk ox, wolf and snow petrel are ours, from the literature. The young's
 * line is ours too, with its source.
 */
const CS = "Cold Sanctuary, Assets/Animals/Ethogram.cs";
const a = (verb: string, mode: EthoAct["mode"], weight: number, seconds: number, source: string): EthoAct => ({ verb, mode, weight, seconds, source });
const FOLLOW = (verb: string, source: string) => a(verb, "seguir", 1, 60, source);
const STROLL = a("recorre su territorio", "pasear", 0.25, 30, "desplazamiento entre zonas de alimentación y descanso");

export const ETHOGRAMS: Readonly<Record<string, SpeciesEthogram>> = {
  Penguin: {
    acts: [
      a("lleva un guijarro a su nido (o se lo roba al vecino)", "pasear", 0.5, 6, `${CS}; Adélie: nidos de piedras y robo de guijarros (California Academy of Sciences, 2004; Notornis 22:77)`),
      a("se acicala en el borde del hielo", "quieto", 0.3, 25, `${CS}; acicalamiento: hasta ~1/4 del tiempo en tierra`),
      a("se apiña con la colonia", "apinarse", 0.3, 30, `${CS}; Gilbert et al. 2006, Physiol Behav 88:479`),
    ],
    young: a("espera en el nido a que vuelvan sus padres con comida", "quieto", 1, 60, "Ainley 2002, The Adélie Penguin (cría en el nido y luego en guardería)"),
  },
  EmperorPenguin: {
    acts: [
      a("se apiña con la colonia contra el viento", "apinarse", 0.6, 60, `${CS} (Penguin); Gilbert et al. 2006, Physiol Behav 88:479 (huddling del pingüino emperador)`),
      a("se acicala", "quieto", 0.2, 25, `${CS} (Penguin)`),
      a("camina en fila hacia el borde del hielo", "pasear", 0.2, 30, "Ancel et al. 1992; Kooyman 1993 (marchas entre la colonia y el mar)"),
    ],
    young: a("se apiña en la guardería con los otros pollos", "apinarse", 1, 60, "Jouventin 1975, Behaviour 52 (guarderías de pollos de emperador)"),
  },
  Bear: {
    acts: [
      a("acecha inmóvil junto a un respiradero de foca", "quieto", 0.6, 60, `${CS}; Stirling 1974, Can J Zool 52:1191 (still-hunting)`),
      a("descansa en su guarida de nieve", "quieto", 0.2, 60, `${CS}; guaridas temporales en ventisqueros`),
      a("come bayas de camarina", "pacer", 0.15, 15, `${CS}; Gormezano & Rockwell 2013, Ecol Evol 3:3509`),
      STROLL,
    ],
    young: FOLLOW("sigue a su madre a todas partes", "Ramsay & Stirling 1988, J Zool 214:601 (los oseznos van con la madre hasta los 2,5 años)"),
  },
  Seal: {
    acts: [
      a("sale a descansar al hielo", "quieto", 0.6, 90, `${CS}; Kelly et al. 2010, Polar Biol 33:1095 (haul-out)`),
      a("respira y mantiene su respiradero", "quieto", 0.4, 15, `${CS}; Smith & Stirling 1975`),
      a("nada buscando peces", "pasear", 0.3, 30, "Plötz et al. 2001, Polar Biol 24:901 (foca de Weddell: caza de bacalao antártico)"),
    ],
    young: FOLLOW("no se separa de su madre, que la amamanta", "Kooyman 1981, Weddell Seal: Consummate Diver (lactancia de 6-7 semanas junto a la madre)"),
  },
  Whale: {
    acts: [
      a("se frota contra la grava para mudar la piel", "pacer", 0.4, 25, `${CS}; Fortune et al. 2017, PLoS ONE 12:e0186156`),
      a("nada despacio y sale a respirar", "pasear", 0.6, 40, "ciclo de inmersión y respiración"),
    ],
    young: FOLLOW("nada pegado al costado de su madre", "Videsen et al. 2017, Funct Ecol 31:1561 (el ballenato nada junto a la madre)"),
  },
  Orca: {
    acts: [
      a("patrulla los témpanos donde descansan las focas", "patrullar", 0.4, 20, `${CS}; Pitman & Durban 2012, Mar Mamm Sci 28:16 (wave-washing)`),
      a("descansa en superficie con su grupo", "apinarse", 0.3, 40, "Ford 2009, Killer whale (descanso en formación cerrada)"),
      STROLL,
    ],
    young: FOLLOW("nada en la estela de su madre", "Noren 2008, Funct Ecol 22:552 (la cría nada en la estela de la madre)"),
  },
  ArcticFox: {
    acts: [
      a("descansa en su madriguera", "quieto", 0.3, 40, `${CS} (Fox)`),
      a("rastrea lemmings bajo la nieve", "patrullar", 0.4, 20, "Audet et al. 2002, Can J Zool 80:1063 (búsqueda de presas bajo la nieve)"),
      STROLL,
    ],
    young: a("juega a la entrada de la madriguera", "quieto", 1, 40, "Audet et al. 2002 (los cachorros no se alejan de la madriguera)"),
  },
  ArcticHare: {
    acts: [
      a("ramonea sauce ártico", "pacer", 0.6, 15, `${CS} (Bunny); Klein & Bay 1994`),
      a("se queda inmóvil sobre la nieve", "quieto", 0.3, 30, "Aniskowicz et al. 1990, Can Field-Nat 104:470 (descanso en grupos, inmóviles)"),
      STROLL,
    ],
    young: a("se esconde quieta donde la dejó su madre", "quieto", 1, 60, "Aniskowicz et al. 1990 (los lebratos se dispersan y la madre los visita para amamantar)"),
  },
  Reindeer: {
    acts: [
      a("pace liquen de reno", "pacer", 0.6, 20, `${CS} (Deer); Heggberget et al. 2002, Rangifer 22:13`),
      a("rumia echado", "quieto", 0.3, 40, "Colman et al. 2001, Rangifer 21:89 (ciclo de pastar y rumiar)"),
      STROLL,
    ],
    young: FOLLOW("sigue a su madre por la manada", "Espmark 1971, Behaviour 39:21 (el ternero sigue a la madre desde el primer día)"),
  },
  Walrus: {
    acts: [
      a("descansa apiñada con las otras en el hielo", "apinarse", 0.6, 90, "Fay 1982, North American Fauna 74 (descanso en grupos apretados)"),
      a("busca almejas en el fondo", "pacer", 0.4, 30, "Fay 1982 (forrajeo bentónico de bivalvos)"),
    ],
    young: FOLLOW("va con su madre, que la lleva y la protege", "Fay 1982 (la cría mama dos años junto a la madre)"),
  },
  MuskOx: {
    acts: [
      a("pace hierba y sauce bajo la nieve", "pacer", 0.5, 25, "Tener 1965, Muskoxen in Canada (ciclo de pastar y descansar)"),
      a("rumia echado con la manada", "apinarse", 0.4, 40, "Tener 1965"),
      STROLL,
    ],
    young: FOLLOW("sigue a su madre dentro de la manada", "Tener 1965 (el ternero sigue a la madre y se pone en el centro del círculo de defensa)"),
  },
  Wolf: {
    acts: [
      a("patrulla el territorio con la manada", "patrullar", 0.5, 30, "Mech 1995, Arctic 48:329 (lobos árticos de Ellesmere)"),
      a("descansa junto a la madriguera", "quieto", 0.4, 60, "Mech 1995"),
    ],
    young: a("espera en la madriguera a que vuelva la manada", "quieto", 1, 60, "Mech 1995 (los lobeznos se quedan en la madriguera las primeras semanas)"),
  },
  SnowPetrel: {
    acts: [
      a("descansa en su grieta de roca", "quieto", 0.5, 40, "Brown 1966, Ibis 108:157 (nidos en grietas)"),
      a("vuela sobre el hielo", "patrullar", 0.5, 20, "Ainley et al. 1984, AOU Ornithol Monogr 32 (busca krill en el borde del hielo)"),
    ],
    young: a("espera en el nido", "quieto", 1, 60, "Brown 1966 (el pollo se queda en la grieta 7 semanas)"),
  },
};

/** Each species' courtship when in estrus (modules/fauna mating), in words, with its source. */
export const CORTEJOS: Readonly<Record<string, { readonly verb: string; readonly source: string }>> = {
  Bear: { verb: "la pareja va junta: el macho la siguió por su rastro", source: "Ramsay & Stirling 1986, J Zool 208:63 (el macho sigue el rastro de la hembra y pasan una o dos semanas juntos)" },
  Seal: { verb: "el macho trina bajo el hielo y la ronda en el agua", source: "Thomas & Kuechle 1982, J Acoust Soc Am 72:1730 (trinos territoriales; apareamiento en el agua)" },
  Penguin: { verb: "exhibición extática: pico al cielo, aletas batiendo y canto", source: "Ainley 2002, The Adélie Penguin (ecstatic display)" },
  EmperorPenguin: { verb: "la pareja se reconoce por su canto y se hace reverencias", source: "Jouventin 1982, Visual and Vocal Signals in Penguins" },
  Whale: { verb: "el macho canta y escolta a la hembra", source: "Payne & McVay 1971, Science 173:585 (canto de la ballena jorobada); Tyack 1981" },
  Orca: { verb: "nadan juntas rozándose", source: "Ford 2009, Killer whale, en Encyclopedia of Marine Mammals (conducta sociosexual)" },
  ArcticFox: { verb: "la pareja se acicala y juega junta", source: "Audet et al. 2002, Mammalian Species 713 (pareja estable; el macho lleva comida)" },
  Wolf: { verb: "la pareja se acicala, juega y duerme junta", source: "Mech 1970, The Wolf (cortejo de la pareja reproductora)" },
  Walrus: { verb: "el macho canta bajo el agua con golpes y campanas", source: "Stirling, Calvert & Spencer 1987, Can J Zool 65:2311 (cantos del macho junto a las hembras)" },
  Reindeer: { verb: "el macho en celo brama y persigue a la hembra", source: "Espmark 1964, Behaviour 23 (celo del reno)" },
  MuskOx: { verb: "el macho en celo ruge y sigue a la hembra rozándola", source: "Tener 1965, Muskoxen in Canada; Gray 1987" },
  ArcticHare: { verb: "el macho la persigue y ella lo rechaza a manotazos", source: "Aniskowicz et al. 1990, Can Field-Nat 104:470 (persecuciones y «boxeo»)" },
  SnowPetrel: { verb: "la pareja se saluda en la grieta con reverencias y llamadas", source: "Brown 1966, Ibis 108:157" },
};
