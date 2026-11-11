import type { MachineSpec } from "../domain/machine";

const BPC = "https://ntrs.nasa.gov/api/citations/20140017323/downloads/20140017323.pdf";
const CS_LAB = "https://github.com/videnacry/cold-sanctuary/blob/master/docs/carne-cultivada.md";

/**
 * The ship's bioregenerative life-support module: what lets a long voyage grow every ingredient.
 * Modelled on NASA's Biomass Production Chamber and Veggie, and on Cold Sanctuary's cultured-meat lab.
 */
export const MACHINES: readonly MachineSpec[] = [
  {
    id: "bastidores",
    name: "Bastidores de cultivo",
    basis: {
      value: "Hidroponía NFT con luz LED roja, azul y verde",
      source: BPC,
      note: "NASA grew wheat, soybean, potato, lettuce and tomato hydroponically under electric light in the BPC; Veggie uses red/blue/green LEDs.",
    },
    settings: [
      { name: "fotoperiodo", value: 16, unit: "h", wrong: [24, 6] },
      { name: "pH de la solución", value: 5.8, unit: "", wrong: [8.5, 3] },
    ],
    repairSteps: ["corta la corriente de los LED", "cambia la bomba de la solución", "purga el aire de los tubos", "comprueba el caudal", "vuelve a encender los LED"],
  },
  {
    id: "molino",
    name: "Molino de grano",
    basis: { value: "Molino de muelas para trigo y pienso", source: BPC, note: "Wheat and soybean from the BPC must be milled to be eaten." },
    settings: [{ name: "separación de muelas", value: 0.5, unit: "mm", wrong: [5, 0] }],
    repairSteps: ["desconecta el molino", "limpia el polvo de harina", "cambia la correa", "ajusta las muelas", "prueba con un puñado de grano"],
  },
  {
    id: "procesador-soja",
    name: "Procesador de soja",
    basis: { value: "Remojo, molienda, cocción, filtrado y prensa para tofu", source: "https://es.wikipedia.org/wiki/Tofu" },
    settings: [{ name: "temperatura de cocción", value: 100, unit: "°C", wrong: [37, 250] }],
    repairSteps: ["vacía el depósito", "desatasca el filtro", "cambia la junta de la prensa", "llena con agua limpia", "haz un ciclo de prueba"],
  },
  {
    id: "biorreactor",
    name: "Biorreactor de carne cultivada",
    basis: { value: "Tanque agitado con sondas de pH, O₂ y temperatura", source: CS_LAB },
    settings: [
      { name: "temperatura", value: 37, unit: "°C", wrong: [4, 100] },
      { name: "pH mínimo", value: 7.2, unit: "", wrong: [5, 9] },
    ],
    repairSteps: ["cierra las válvulas", "saca la sonda de pH", "calibra la sonda con tampón 7,0", "cambia la junta del agitador", "esteriliza el circuito"],
  },
  {
    id: "gallinero",
    name: "Gallinero",
    basis: {
      value: "Ponederos, aseladero, bebedero y luz de 14–16 h en el anillo con gravedad",
      source: "https://www.merckvetmanual.com/poultry/nutrition-and-management-poultry/management-of-laying-chickens",
    },
    settings: [{ name: "horas de luz", value: 16, unit: "h", wrong: [8, 24] }],
    repairSteps: ["saca a las gallinas al corral", "repara la malla", "limpia el bebedero", "cambia la cama de viruta", "devuelve a las gallinas"],
  },
  {
    id: "cocina",
    name: "Cocina",
    basis: { value: "Placa de inducción, horno y nevera", source: "https://github.com/videnacry/cold-sanctuary/blob/master/docs/kitchen-simulation.md" },
    settings: [{ name: "nevera", value: 4, unit: "°C", wrong: [20, -40] }],
    repairSteps: ["corta la corriente", "revisa la placa", "cambia el fusible", "limpia el filtro de la campana", "enciende y prueba"],
  },
  {
    id: "enfermeria",
    name: "Enfermería",
    basis: {
      value: "Camilla, ecógrafo, desfibrilador y botiquín para personas y animales",
      source: "https://github.com/videnacry/cold-sanctuary/blob/master/docs/hospital.md",
      note: "One sickbay for people and animals ('one health'), scaled down from Cold Sanctuary's hospital.",
    },
    settings: [{ name: "autoclave", value: 121, unit: "°C", wrong: [60, 300] }],
    repairSteps: ["retira al paciente", "revisa la toma de oxígeno", "cambia la batería del monitor", "esteriliza el instrumental", "prueba el monitor"],
  },
];
