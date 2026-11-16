import type { RackHabitat } from "../domain/rack";
import { ADOPTION_SRC as A } from "./sources";

/**
 * Real flight habitats for the rack slots (docs/design/catalogo-especies.md, «Hábitats reales»). Only these
 * take animals: a species is adoptable if it has really lived in microgravity (`CatalogEntry.real`) and one of
 * these habitats was flown with it. Hardware figures are the sources'; capacities are game values.
 */
export const RACK_HABITATS: readonly RackHabitat[] = [
  {
    id: "habitat-acuatico",
    area: {
      id: "habitat-acuatico",
      name: "Hábitat acuático",
      kind: "marino",
      host: "nodriza",
      gravityG: 0,
      light: "fotoperiodo",
      // Two aquariums of 0.7 L in a closed loop of 3.2 L (JAXA AQH).
      waterM3: 0.0032,
      pressureKpa: 101.3,
      tempC: [25, 30],
      residents: [],
      // Its bacteria filter decomposes the ammonia; its gas exchange gives the oxygen a plant would.
      support: ["productor", "descomponedor"],
      requires: { areas: [], station: [] },
    },
    // Medaka and zebrafish, as the AQH was built for; Biomphalaria flew in the C.E.B.A.S. closed aquarium.
    accepts: ["medaka", "pez-cebra", "caracol"],
    capacity: 16,
    summary: "Como el Aquatic Habitat de JAXA en el Kibo: dos acuarios de 0,7 L en un circuito cerrado de 3,2 L, a 25–30 °C, con LED de día y noche y filtro de bacterias; hasta 90 días.",
    source: A.aqh,
  },
  {
    id: "habitat-roedores",
    area: {
      id: "habitat-roedores",
      name: "Hábitat de roedores",
      kind: "terrestre",
      host: "nodriza",
      gravityG: 0,
      light: "fotoperiodo",
      waterM3: 0,
      pressureKpa: 101.3,
      // No active thermal control: the cabin's air (game value for a station cabin).
      tempC: [21, 24],
      residents: [],
      // Food bars and a filter for the waste: the machine closes the loop.
      support: ["productor", "descomponedor"],
      requires: { areas: [], station: [] },
    },
    accepts: ["raton"],
    capacity: 10,
    summary: "Como el Rodent Habitat de la NASA en la ISS: hasta diez ratones en dos lados, barritas de comida y agua para todo el estudio, luz con temporizador y el aire de la cabina.",
    source: A.rodentHabitat,
  },
];
