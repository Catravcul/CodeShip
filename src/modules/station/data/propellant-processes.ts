import type { RefineProcess } from "../domain/blueprint";
import { SRC } from "./sources";

const GAME = "Cantidades por lote y horas: valores de juego";

/**
 * Masses come from the balanced reactions (molar masses H 1, N 14, O 16 g/mol, rounded); yields
 * below 1 are estimates and say so. Energy is per full batch where a source gives it.
 */
const H2_KWH_PER_KG = 55; // DOE, PEM electrolysis system, 2022 status

/**
 * The propellant plant (docs/design/estacion.md, «Planta de propelente»). Water splits into hydrogen
 * and oxygen; the nitrogen of the rock and that hydrogen make ammonia; ammonia makes hydrazine (with
 * hydrogen peroxide) and NTO (burnt with oxygen). MMH, LMP-103S, helium and xenon cannot be made here
 * and come imported.
 */
export const PROPELLANT_PROCESSES: readonly RefineProcess[] = [
  {
    id: "electrolisis-agua",
    name: "Electrólisis del agua",
    machine: "planta",
    requires: "planta",
    // 2 H2O → 2 H2 + O2: 18 kg of water give 2 kg of hydrogen and 16 kg of oxygen.
    inputs: { agua: 18 },
    outputs: { hidrogeno: 2, oxigeno: 16 },
    hours: 4,
    energyKwh: { value: 2 * H2_KWH_PER_KG, source: SRC.pemElectrolysis, note: "55 kWh por kg de hidrógeno (sistema PEM, estado 2022 del DOE) × 2 kg" },
    process: {
      value: "Una membrana de intercambio de protones separa el agua con corriente: hidrógeno en el cátodo y oxígeno en el ánodo",
      source: SRC.pemElectrolysis,
      note: `2 H₂O → 2 H₂ + O₂, rendimiento estequiométrico. ${GAME}`,
    },
    steps: {
      value: ["desioniza el agua", "llena el electrolizador de membrana", "pasa la corriente por las celdas", "saca {2|18|16} kg de hidrógeno por cada 18 kg de agua", "guarda el oxígeno del ánodo"],
      source: SRC.pemElectrolysis,
    },
  },
  {
    id: "amoniaco",
    name: "Amoníaco del nitrógeno de la roca",
    machine: "planta",
    requires: "planta",
    // N2 + 3 H2 → 2 NH3: 1,4 kg N + 0,3 kg H2 → 1,7 kg NH3; 90 % recovered (estimate).
    inputs: { "nitrogeno-roca": 1.4, hidrogeno: 0.3 },
    outputs: { amoniaco: 1.53 },
    hours: 8,
    energyKwh: {
      value: 3,
      source: SRC.haberBoschEnergy,
      note: "Estimación: el Haber–Bosch eléctrico gasta 11,1–12,5 kWh/kg con el hidrógeno incluido; sin los ~9,7 kWh del hidrógeno quedan ~2 kWh/kg × 1,53 kg",
    },
    process: {
      value: "Al calentar la roca, las sales de amonio sueltan amoníaco y la materia orgánica nitrógeno; el nitrógeno se junta con hidrógeno sobre un catalizador de hierro (Haber–Bosch)",
      source: SRC.bennuNitrogen,
      note: `Bennu: N 0,23–0,25 % en masa y ~13,6 µmol/g de amoníaco (Glavin et al. 2025). Recuperar el 90 % es una estimación. ${GAME}`,
    },
    steps: {
      value: [
        "calienta la roca para soltar el amoníaco y el nitrógeno",
        "separa el amoníaco del vapor de agua",
        "mezcla cada parte de nitrógeno con {3|1|8} partes de hidrógeno",
        "comprime la mezcla sobre el catalizador de hierro",
        "condensa el amoníaco",
      ],
      source: SRC.haber,
    },
  },
  {
    id: "hidracina",
    name: "Hidracina por el proceso del peróxido",
    machine: "planta",
    requires: "planta",
    // H2 + O2 → H2O2, then 2 NH3 + H2O2 → N2H4 + 2 H2O: 1,7 + 0,1 + 1,6 kg → 1,6 kg N2H4 + 1,8 kg water; 80 % (estimate).
    inputs: { amoniaco: 1.7, hidrogeno: 0.1, oxigeno: 1.6 },
    outputs: { hidracina: 1.28, agua: 1.8 },
    hours: 10,
    process: {
      value: "El agua oxigenada (de hidrógeno y oxígeno) y el amoníaco forman una cetazina con metiletilcetona; al hidrolizarla sale hidracina hidratada, que se destila hasta anhidra",
      source: SRC.peroxideProcess,
      note: `2 NH₃ + H₂O₂ → N₂H₄ + 2 H₂O; la cetona se recicla. El rendimiento del 80 % es una estimación; no hay dato publicado de energía. ${GAME}`,
    },
    steps: {
      value: [
        "haz agua oxigenada con hidrógeno y oxígeno",
        "mezcla amoníaco, agua oxigenada y metiletilcetona a {50|250|900} °C",
        "decanta la cetazina",
        "hidroliza la cetazina a {8|80|1} bar",
        "destila la hidracina hasta dejarla anhidra",
      ],
      source: SRC.peroxideProcess,
    },
  },
  {
    id: "nto",
    name: "NTO por oxidación del amoníaco",
    machine: "planta",
    requires: "planta",
    // 4 NH3 + 7 O2 → 4 NO2 + 6 H2O, 2 NO2 ⇌ N2O4: 1,7 + 5,6 kg → 4,6 kg NTO + 2,7 kg water; 95 % (estimate).
    inputs: { amoniaco: 1.7, oxigeno: 5.6 },
    outputs: { nto: 4.37, agua: 2.7 },
    hours: 6,
    process: {
      value: "El amoníaco arde con oxígeno sobre una malla de platino y rodio (proceso Ostwald); el monóxido, al enfriarse, se oxida a dióxido, que se seca y se condensa como tetróxido",
      source: SRC.ostwald,
      note: `Muy exotérmica: sobra calor, no hace falta energía. El rendimiento del 95 % es una estimación; la malla de platino y rodio vino importada. ${GAME}`,
    },
    steps: {
      value: [
        "mezcla el amoníaco con oxígeno",
        "quema la mezcla en la malla de platino y rodio a {900|50|1600} °C",
        "enfría el gas a {250|900|20} °C",
        "deja que el monóxido se oxide a dióxido",
        "seca el gas para que no forme ácido nítrico",
        "condensa el tetróxido de nitrógeno",
      ],
      source: SRC.ostwald,
    },
  },
];
