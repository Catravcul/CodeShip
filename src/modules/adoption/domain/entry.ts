import type { LoopRole } from "@modules/sanctuary/domain/area";

/**
 * One species (or variant) of the species catalogue (docs/design/catalogo-especies.md): everything Doménica can
 * bring aboard the ring or into the station. Berón (2026-11-16): «Los animales no aparecen desde el principio. Al
 * principio es Doménica sola y ella los puede agregar. […] Cada uno tendrá su breve descripción, que luego podremos
 * ampliar para que cada especie tenga distintos aportes y precauciones». So the text is short but structured:
 * contributions and precautions are separate lists, ready to grow.
 *
 * Canon: animals are friends and family, never food. Asking a befriended animal for help is a mind program.
 */

/** Filter groups of the catalogue. */
export type CatalogGroup = "mascotas" | "aves" | "peces" | "caracoles" | "crustaceos" | "insectos" | "suelo" | "acuaticos" | "plantas" | "microbios";

export const CATALOG_GROUPS: readonly { readonly id: CatalogGroup; readonly label: string }[] = [
  { id: "mascotas", label: "Mascotas" },
  { id: "aves", label: "Aves" },
  { id: "peces", label: "Peces" },
  { id: "caracoles", label: "Caracoles" },
  { id: "crustaceos", label: "Crustáceos" },
  { id: "insectos", label: "Insectos" },
  { id: "suelo", label: "Fauna del suelo" },
  { id: "acuaticos", label: "Otros acuáticos" },
  { id: "plantas", label: "Plantas" },
  { id: "microbios", label: "Microbios" },
];

/**
 * How it lives in the world once it arrives: a cat, a dog or a hen of the habitat module (with their own
 * chores and families), the aquarium's school or snails, a colony (a tank or terrarium of the sanctuary)
 * with a friendship program and a help program of its own, or a plant or microbe culture that only joins
 * the loop (`bucle`: no mind to befriend).
 */
export type Lodging = "gato" | "perro" | "gallina" | "banco" | "caracoles" | "colonia" | "bucle";

/** What its flight record says. */
export type FlightStatus = "volo" | "solo-latentes" | "volo-mal" | "sin-vuelo";

export const FLIGHT_LABEL: Readonly<Record<FlightStatus, string>> = {
  volo: "Ha volado",
  "solo-latentes": "Solo han volado sus huevos o quistes",
  "volo-mal": "Voló, pero no se valió en ingravidez",
  "sin-vuelo": "Sin vuelo espacial",
};

export interface FlightRecord {
  readonly status: FlightStatus;
  /** One line: what flew, where and what happened. */
  readonly text: string;
  readonly source: string;
}

/**
 * How it gets aboard. `importar`: an order to the Sanctuary on the existing import system (credits for the
 * launch and a real Hohmann transfer); what flies is the animals, their transport habitat and their food for
 * the whole transfer (`shipmentKg`). `eclosion`: from dormant eggs or cysts in the ship's bank, a few days.
 */
export type Acquisition =
  | {
      readonly kind: "importar";
      /** What arrives, in words («un gato adulto», «20 medakas adultas»). */
      readonly what: string;
      readonly count: number;
      /** Mass of the animals, kg. */
      readonly liveKg: number;
      /** Carrier or sealed transport tank (with its water), kg. Game value. */
      readonly containerKg: number;
      /** Food per day of transfer, kg. Game value from each species' real ration. */
      readonly feedKgPerDay: number;
    }
  | {
      readonly kind: "eclosion";
      readonly what: string;
      readonly count: number;
      readonly from: "quistes" | "huevos" | "latentes";
      /** Board days until they hatch or wake. */
      readonly days: number;
      readonly source: string;
    };

/** The drawn icon: a silhouette with its real colours (src/ui/species-icon.ts). */
export type IconShape = "gato" | "perro" | "gallina" | "codorniz" | "raton" | "pez" | "caracol" | "gamba" | "isopodo" | "insecto" | "polilla" | "larva" | "lombriz" | "colembolo" | "medusa" | "calamar" | "tardigrado" | "planta" | "microbio";

export interface SpeciesIcon {
  readonly shape: IconShape;
  readonly body: string;
  readonly accent: string;
}

export interface CatalogEntry {
  /** Unique id of the entry (a variant has its own: «medaka-himedaka»). */
  readonly id: string;
  /** The species record behind it (fit(), loopStatus()): SANCTUARY_SPECIES or EXTRA_SPECIES. */
  readonly speciesId: string;
  readonly group: CatalogGroup;
  /** Common name, as on the card. */
  readonly name: string;
  readonly scientific?: string;
  /** Plural with its article, as the world says it when they arrive («las medakas»). */
  readonly plural: string;
  /** The strain, breed or line, if it is a variant of a species. */
  readonly variant?: string;
  /** Two or three lines, in Spanish. */
  readonly description: string;
  /** What it gives: its help once befriended (from the species) and more, ready to grow. */
  readonly contributions: readonly string[];
  /** What to watch for. */
  readonly precautions: readonly string[];
  readonly flight: FlightRecord;
  readonly acquire: Acquisition;
  readonly lodging: Lodging;
  readonly icon: SpeciesIcon;
  /** Where the species facts come from (husbandry, behaviour), besides the flight record. */
  readonly source: string;
  /** Already aboard when the game starts (plants and the biofilter's bacteria: not animals). */
  readonly aboard?: boolean;
  /** Names for the ones that arrive (cats, dogs, hens), in order. */
  readonly names?: readonly string[];
}

/** Role in the self-sufficiency loop, in Spanish for the card. */
export const ROLE_LABEL: Readonly<Record<LoopRole, string>> = {
  productor: "Productor: hace oxígeno o alimento con luz o química",
  consumidor: "Consumidor: come y abona a los demás",
  descomponedor: "Descomponedor: devuelve los restos al bucle",
};

/** kg that fly for an import: the animals, their transport habitat and their food for the whole transfer. */
export function shipmentKg(a: Extract<Acquisition, { kind: "importar" }>, transitDays: number): number {
  return Math.round((a.liveKg + a.containerKg + a.feedKgPerDay * Math.max(0, transitDays)) * 100) / 100;
}
