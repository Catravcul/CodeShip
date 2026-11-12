import type { RefineProcess } from "../domain/blueprint";
import { SRC } from "./sources";

const GAME = "Cantidades por lote, rendimientos y horas: valores de juego";

/** Refinery processes: what the station does with the rock from a hold. */
export const REFINE_PROCESSES: readonly RefineProcess[] = [
  {
    id: "extraer-agua",
    name: "Extracción térmica del agua",
    machine: "refineria",
    inputs: { "agua-hidratada": 20 },
    outputs: { agua: 18 },
    hours: 6,
    process: {
      value: "Se calienta la roca en un horno sellado: los filosilicatos sueltan su agua como vapor, que se condensa en una trampa fría",
      source: SRC.serpentineWater,
      note: `Pohl y Britt 2024; modelo térmico de Metzger, Zacny y Morrison. ${GAME}`,
    },
    steps: {
      value: ["tritura la roca", "cierra el horno", "calienta la roca en vacío", "condensa el vapor en la trampa fría", "guarda el agua en el tanque"],
      source: SRC.thermalExtraction,
    },
  },
  {
    id: "carbonilo",
    name: "Reducción y proceso carbonilo",
    machine: "refineria",
    inputs: { "mineral-hierro": 100, "mineral-niquel": 6, carbono: 4 },
    outputs: { hierro: 80, niquel: 4.8 },
    hours: 12,
    process: {
      value: "El hierro y el níquel se reducen a metal; el monóxido de carbono los convierte en carbonilos gaseosos que se destilan por separado y se descomponen en metal puro",
      source: SRC.carbonylAsteroid,
      note: `Ni + 4 CO → Ni(CO)₄ a 50–60 °C y vuelta a níquel a 220–250 °C (proceso Mond). ${GAME}`,
    },
    steps: {
      value: [
        "tuesta los sulfuros para soltar el azufre",
        "reduce los óxidos a metal",
        "haz pasar monóxido de carbono a {50|250|1600} °C",
        "destila el carbonilo de níquel y el de hierro por separado",
        "descompón el carbonilo de níquel a {230|50|1600} °C",
      ],
      source: SRC.mond,
    },
  },
  {
    id: "mre",
    name: "Electrólisis de regolito fundido",
    machine: "refineria",
    inputs: { silicatos: 100 },
    outputs: { oxigeno: 30, ceramica: 55, hierro: 3 },
    hours: 16,
    process: {
      value: "El silicato se funde y una corriente lo separa: oxígeno en el ánodo, hierro y silicio fundidos en el cátodo, y escoria vítrea",
      source: SRC.mre,
      note: `Sirk, Sadoway y Sibille 2010; Muscatello 2017. ${GAME}`,
    },
    steps: {
      value: ["seca la roca para que no le quede agua", "funde el silicato a {1600|600|60} °C", "haz pasar la corriente entre los electrodos", "recoge el oxígeno del ánodo", "sangra el metal del cátodo", "enfría la escoria y muélela"],
      source: SRC.mre,
    },
  },
];

export const refineProcessById = (id: string): RefineProcess | undefined => REFINE_PROCESSES.find((p) => p.id === id);
