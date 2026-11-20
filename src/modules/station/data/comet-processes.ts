import type { RefineProcess } from "../domain/blueprint";
import { SRC } from "./sources";

const GAME = "Cantidades por lote, rendimientos y horas: valores de juego";

/** Heat to take 1 kg of comet ice from −70 °C (game value: the hold is cold) to water at 20 °C, kJ. */
export const ICE_MELT_KJ_PER_KG = 2.05 * 70 + 333.55 + 4.18 * 20;

/**
 * What the station does with a comet's ice (docs/design/importacion.md): the water ice is melted and
 * filtered (no hydrated minerals to bake, so it is much cheaper than Bennu's water); the CO2 ice gives
 * oxygen like MOXIE and its carbon through the Boudouard reaction.
 */
export const COMET_PROCESSES: readonly RefineProcess[] = [
  {
    id: "fundir-hielo",
    name: "Fundir y filtrar hielo de cometa",
    machine: "refineria",
    requires: "refineria",
    inputs: { "hielo-agua": 20 },
    // 2 % stays in the filter with the dust (game value).
    outputs: { agua: 19.6 },
    hours: 2,
    energyKwh: { value: Math.round(((20 * ICE_MELT_KJ_PER_KG) / 3600) * 100) / 100, source: SRC.iceFusion, note: "20 kg × (2,05 kJ/kg·K × 70 K + 333,55 kJ/kg + 4,18 kJ/kg·K × 20 K)" },
    process: {
      value: "El hielo se calienta en un tanque cerrado: se funde, el polvo se queda en un filtro y el agua limpia pasa al depósito",
      source: SRC.iceHeat,
      note: `Calor latente de fusión 333,55 kJ/kg. ${GAME}`,
    },
    steps: {
      value: ["mete el hielo en el tanque cerrado", "calienta el hielo hasta {0|100|−78} °C", "espera a que se funda todo", "pasa el agua por el filtro de polvo", "guarda el agua en el depósito"],
      source: SRC.iceFusion,
    },
  },
  {
    id: "co2-oxigeno",
    name: "Electrólisis del CO₂ y carbono de Boudouard",
    machine: "planta",
    requires: "planta",
    // CO2 → C + O2 overall (2 CO2 → 2 CO + O2, then 2 CO → C + CO2): 44 kg give 12 kg of carbon and 32 kg of oxygen; 90 % yield.
    inputs: { "hielo-co2": 44 },
    outputs: { oxigeno: 28.8, carbono: 10.8 },
    hours: 6,
    process: {
      value: "Una celda de óxido sólido a unos 800 °C parte el CO₂ en CO y oxígeno, como MOXIE en Marte; el CO deja su carbono sobre hierro y el CO₂ que sale vuelve a la celda",
      source: SRC.moxie,
      note: `CO₂ → C + O₂ en total, con un 90 % de rendimiento (estimación). ${GAME}`,
    },
    steps: {
      value: ["sublima el hielo de CO₂", "calienta la celda de óxido sólido a {800|80|1600} °C", "guarda el oxígeno del ánodo", "pasa el CO sobre el hierro a {600|60|1600} °C", "devuelve el CO₂ a la celda"],
      source: SRC.boudouard,
    },
  },
];
