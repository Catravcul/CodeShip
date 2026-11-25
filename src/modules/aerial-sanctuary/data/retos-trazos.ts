import { compound, type Compound } from "@modules/trazos/data/compounds";

/**
 * SANCTUARY 3'S CHALLENGES DRAWN AS COMPOUNDS (Berón, 2026-11-25; docs/design/retos-trazos.md §Tabla): every challenge
 * of the aerial sanctuary is drawn as a real compound that stands for it, glyph by glyph, like a magic wand. Which
 * compound stands for which challenge is ours (**licencia**), each with why; the compounds and their facts are real
 * (trazos/data/compounds.ts). `match` is a chore id, or the start of one ending in «:» (the flights).
 */
export interface RetoCompound {
  readonly match: string;
  readonly compound: string;
  readonly why: string;
}

export const RETO_COMPOUNDS: readonly RetoCompound[] = [
  { match: "s3:puesto-1", compound: "celulosa", why: "La selección es papel: la solicitud, los requisitos y la carpeta ante el tribunal; el papel es celulosa" },
  { match: "s3:puesto-2", compound: "cloruro-plata", why: "Los electrodos del ECG son de plata y cloruro de plata (Ag/AgCl), los que se pegan para el electrocardiograma tumbada" },
  { match: "s3:puesto-3", compound: "fluoresceina", why: "El tinte marcador del equipo de supervivencia en el agua: la fluoresceína tiñe el mar de verde para que la vean desde el aire" },
  { match: "s3:puesto-4", compound: "oxigeno", why: "En la cámara hipobárica se prerrespira oxígeno y se aprende qué pasa sin él (hipoxia) al quitarse la máscara" },
  { match: "s3:puesto-5", compound: "glucosa", why: "En la centrífuga la sangre baja a las piernas y el cerebro se queda sin oxígeno ni glucosa, su único combustible: así llega el G-LOC" },
  { match: "s3:puesto-6", compound: "escopolamina", why: "Contra el mareo de las parábolas, la NASA da escopolamina a quien vuela en el avión de gravedad reducida" },
  { match: "s3:puesto-7", compound: "agua", why: "La flotabilidad neutra es en agua: la piscina NBL de Houston, con el traje lastrado para no subir ni bajar" },
  { match: "s3:puesto-8", compound: "tetroxido", why: "El oxidante hipergólico de los motores Draco de la Dragon y del motor de descenso del LM: el N₂O₄ arde al tocar su combustible" },
  { match: "s3:puesto-9", compound: "epoxi", why: "Las vigas de Canadarm2 son de fibra de carbono en resina; el BADGE es la resina epoxi más común de esos compuestos (la del brazo no está publicada)" },
  { match: "s3:puesto-10", compound: "litio-cobalto", why: "Los Rutherford del Electron mueven sus bombas con motores eléctricos y baterías de polímero de litio; el LiCoO₂ es el cátodo típico de esas baterías (Rocket Lab no publica su química)" },
  { match: "s3:puesto-11", compound: "forsterita", why: "El olivino es el mineral más abundante de las condritas, los meteoritos más comunes que se recogen en el hielo azul" },
  { match: "s3:puesto-12", compound: "co", why: "La regla de la zanja y la tienda con el hornillo encendido: ventilar, porque el monóxido de carbono no se ve ni se huele" },
  { match: "s3:puesto-13", compound: "pet", why: "El traje es un tejido técnico; el poliéster (PET) es la fibra de base de esos tejidos (la composición del de SpaceX no está publicada)" },
  { match: "s3:lanzamiento-torre", compound: "nitrogeno", why: "La cabina que se cierra en la sala blanca y se prueba de fugas va llena de aire como el de la Tierra: un 78 % de nitrógeno" },
  { match: "s3:lanzamiento-cuenta", compound: "trietilaluminio", why: "En T−0 los Merlin se encienden con TEA-TEB: el trietilaluminio y el trietilborano arden solos al aire con el destello verde" },
  { match: "s3:lanzamiento-ascenso", compound: "co2", why: "En el ascenso el queroseno arde con el oxígeno líquido y sale sobre todo CO₂ y agua por las toberas" },
  { match: "s3:lanzamiento-acople", compound: "metano", why: "La cita es con la Starship, cuyos Raptor queman metano con oxígeno líquido" },
  { match: "s3-vuelo:", compound: "dodecano", why: "El S-92 quema Jet A, un queroseno; el dodecano es su modelo químico de una sola molécula" },
  { match: "s3-camaras-leopardo", compound: "pirita", why: "Las cámaras trampa van con pilas de litio Li/FeS₂, las que aguantan el frío de las crestas en invierno" },
  { match: "s3-doble-observador", compound: "sal", why: "Los íbices bajan a los saladeros a lamer sal: allí se juntan y se ven los grupos que cuentan los dos observadores" },
  { match: "s3-nidos-buitre", compound: "carbonato-calcio", why: "El seguimiento de los nidos busca los huevos y su eclosión: la cáscara del huevo es carbonato de calcio" },
];

/** The compound a sanctuary-3 challenge is drawn as (none for one not in the table: it keeps the sheet). */
export function compoundForChore(id: string): Compound | undefined {
  const r = RETO_COMPOUNDS.find((q) => (q.match.endsWith(":") ? id.startsWith(q.match) : id === q.match));
  return r ? compound(r.compound) : undefined;
}
