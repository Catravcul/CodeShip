import type { EclssMachineId, EclssMachineSpec, FailureMode, RackKind, RackSpec } from "../domain/eclss";
import { ECLSS_SOURCES as S, GAME_VALUE } from "./eclss-sources";

/** Our estimate where the sources found give no figure: marked so in the data and in the research doc. */
const ESTIMATE = "Estimación nuestra (no encontramos la cifra publicada; ver docs/research/soporte-vital.md §6)";

const f = (m: EclssMachineId, x: Omit<FailureMode, "machine">): FailureMode => ({ machine: m, ...x });

/**
 * The real machines of the ISS's US segment ECLSS, with their rates, power, failures and spares
 * (docs/research/soporte-vital.md §2–§5). Failure modes are the ones flown and reported.
 */
export const ECLSS_MACHINES: readonly EclssMachineSpec[] = [
  {
    id: "oga",
    short: "OGA",
    name: "Generador de oxígeno",
    does: "Electrólisis del agua: 2 H₂O → 2 H₂ + O₂. El O₂ va a la cabina y el H₂ al Sabatier",
    realism: "real",
    rack: "ogs",
    rate: { value: 5.4, unit: "kg O₂/día", source: S.ogaPerformance, note: "5,4 kg/día en ciclo día-noche; 2,3–9,2 kg/día en continuo (de 4 a 7 personas)" },
    powerW: { value: 3573, source: S.ogaPerformance, note: "3573 W procesando, 382 W en espera" },
    massKg: { value: 676, source: S.ogaPerformance, note: ESTIMATE },
    cooled: true,
    failures: [
      f("oga", {
        id: "oga-bomba",
        name: "Bomba de recirculación bloqueada",
        symptom: "El OGA se para: la bomba de recirculación no gira (precipitado de fosfato de níquel en sus engranajes)",
        capacity: 0,
        spare: { id: "oru-bomba-oga", name: "ORU de bomba del OGA" },
        steps: ["para el OGA y purga con nitrógeno", "cierra las válvulas de agua", "desmonta la ORU de la bomba", "monta la bomba de repuesto", "purga el aire del lazo", "enciende y comprueba el caudal"],
        check: { name: "producción máxima del OGA", value: 9.2, unit: "kg O₂/día", wrong: [0.89, 54] },
        meanDays: 400,
        source: S.eclsStatus2024,
      }),
      f("oga", {
        id: "oga-domo-h2",
        name: "Regulador del domo de H₂ inestable",
        symptom: "Paradas por baja presión: el regulador de contrapresión del domo de hidrógeno falla",
        capacity: 0.4,
        spare: { id: "oru-domo-h2", name: "ORU del domo de H₂" },
        steps: ["para el OGA y purga con nitrógeno", "desconecta la línea de hidrógeno", "cambia el domo de H₂", "conecta la línea de hidrógeno", "comprueba que no hay fugas", "enciende el OGA"],
        check: { name: "límite de baja presión (anulado por software)", value: 19, unit: "psia", wrong: [2, 190] },
        meanDays: 500,
        source: S.eclsStatus2024,
      }),
    ],
  },
  {
    id: "sabatier",
    short: "Sabatier",
    name: "Reactor Sabatier",
    does: "CO₂ + 4 H₂ → CH₄ + 2 H₂O: recupera agua del CO₂ del CDRA con el H₂ del OGA; el metano se tira",
    realism: "real",
    rack: "ogs",
    rate: { value: 0.352, unit: "kg H₂O/persona·día", source: S.logistics2024, note: "Agua del Sabatier en la ISS (estimada por los autores con su capacidad de diseño); convierte cerca del 50 % del CO₂" },
    powerW: { value: 300, source: S.issEclss, note: ESTIMATE },
    massKg: { value: 230, source: S.issEclss, note: ESTIMATE },
    cooled: true,
    failures: [
      f("sabatier", {
        id: "sabatier-compresor",
        name: "Compresor de CO₂ averiado",
        symptom: "El Sabatier no recibe CO₂: el compresor que lo guarda entre ciclos del CDRA se ha parado",
        capacity: 0,
        spare: { id: "oru-compresor-co2", name: "Compresor de CO₂" },
        steps: ["para el Sabatier", "cierra la válvula de CO₂", "desmonta el compresor", "monta el compresor de repuesto", "abre la válvula de CO₂", "enciende y comprueba la presión"],
        check: { name: "H₂ por cada CO₂ en la reacción", value: 4, unit: "moléculas", wrong: [1, 2] },
        meanDays: 600,
        source: S.issEclss,
      }),
    ],
  },
  {
    id: "cdra",
    short: "CDRA",
    name: "Eliminador de CO₂",
    does: "Cuatro lechos: dos secan el aire y dos de zeolita atrapan el CO₂; cada medio ciclo (90 min) uno se calienta al vacío y suelta el CO₂",
    realism: "real",
    rack: "ar",
    rate: { value: 4.8, unit: "kg CO₂/día a 3 mmHg", source: S.cdra4eu, note: "Medido en el CDRA-4EU; 4,1 personas a 2 torr y 10,5 a 5 torr: lo que quita sube con la ppCO₂" },
    powerW: { value: 860, source: S.cdra4eu, note: ESTIMATE },
    massKg: { value: 200, source: S.cdra4eu, note: ESTIMATE },
    cooled: true,
    failures: [
      f("cdra", {
        id: "cdra-lechos",
        name: "Lechos de zeolita degradados",
        symptom: "La ppCO₂ sube: el polvo de zeolita tapona los lechos y la presión diferencial se dispara",
        capacity: 0.05,
        spare: { id: "lecho-zeolita", name: "Lecho de zeolita" },
        steps: ["para el CDRA y su soplante", "desmonta el lecho tapado", "limpia las rejillas de polvo", "monta el lecho de repuesto", "comprueba la presión diferencial"],
        check: { name: "medio ciclo de los lechos", value: 90, unit: "min", wrong: [9, 900] },
        meanDays: 300,
        source: S.eclsStatus2024,
      }),
      f("cdra", {
        id: "cdra-valvula",
        name: "Válvula selectora de aire atascada",
        symptom: "El CDRA se para: la válvula selectora de aire 103 falló y se llevó por delante la soplante",
        capacity: 0,
        spare: { id: "oru-valvula-asv", name: "Válvula selectora de aire" },
        steps: ["para el CDRA y su soplante", "desconecta la válvula 103", "cambia la válvula selectora", "cambia la soplante", "conecta y prueba el ciclo"],
        check: { name: "personas que cubre con los dos lechos", value: 6, unit: "", wrong: [1, 60] },
        meanDays: 500,
        source: S.eclsStatus2024,
      }),
    ],
  },
  {
    id: "tccs",
    short: "TCCS",
    name: "Filtro de contaminantes traza",
    does: "Carbón activado, un oxidador catalítico caliente y un lecho de LiOH quitan amoníaco, CO, metanol y lo que desprenden los materiales",
    realism: "real",
    rack: "ar",
    rate: { value: 15.3, unit: "m³ de aire/h", source: S.tccs, note: "La soplante mueve 15,3 m³/h; un tercio pasa por el oxidador" },
    powerW: { value: 160, source: S.tccs, note: ESTIMATE },
    massKg: { value: 75, source: S.tccs, note: ESTIMATE },
    cooled: true,
    failures: [
      f("tccs", {
        id: "tccs-lioh",
        name: "Lecho de LiOH apelmazado",
        symptom: "Sube la resistencia al paso del aire: el LiOH de la entrada se ha hecho polvo",
        capacity: 0.3,
        spare: { id: "lecho-lioh", name: "Lecho posterior de LiOH" },
        steps: ["desconecta la soplante del TCCS", "desmonta el lecho de LiOH", "monta el lecho nuevo", "enciende la soplante", "comprueba el caudal de aire"],
        check: { name: "caudal de la soplante", value: 15.3, unit: "m³/h", wrong: [1.5, 153] },
        maintenance: true,
        meanDays: 700,
        source: S.tccs,
      }),
    ],
  },
  {
    id: "upa",
    short: "UPA",
    name: "Procesador de orina",
    does: "Destilación por compresión de vapor a baja presión: saca el 87 % del agua de la orina",
    realism: "real",
    rack: "wrs",
    rate: { value: 9, unit: "kg de orina/día", source: S.issEclss, note: "Pensado para seis personas; recupera el 87 % desde marzo de 2020 (ICES-2022-098)" },
    powerW: { value: 315, source: S.water2022, note: ESTIMATE },
    massKg: { value: 500, source: S.water2022, note: ESTIMATE },
    cooled: true,
    failures: [
      f("upa", {
        id: "upa-destilacion",
        name: "Conjunto de destilación averiado",
        symptom: "El destilado sale con conductividad alta y el sensor de vacío se desvía: la orina se queda en el tanque",
        capacity: 0,
        spare: { id: "oru-destilacion", name: "Conjunto de destilación (DA)" },
        steps: ["para el UPA", "vacía el tanque de orina pretratada", "desconecta el conjunto de destilación", "monta el conjunto de repuesto", "haz un ciclo de prueba", "comprueba la conductividad del destilado"],
        check: { name: "agua recuperada de la orina", value: 87, unit: "%", wrong: [8.7, 100] },
        meanDays: 400,
        source: S.water2022,
      }),
      f("upa", {
        id: "upa-pcpa",
        name: "Bomba de control de presión (PCPA) agotada",
        symptom: "Corriente alta en el motor de la PCPA tras unas 2300 h: el UPA se para",
        capacity: 0,
        spare: { id: "oru-pcpa", name: "PCPA" },
        steps: ["para el UPA", "desconecta la PCPA", "cambia la PCPA", "conecta y purga el aire", "enciende y comprueba la corriente"],
        check: { name: "horas de la PCPA al fallar", value: 2300, unit: "h", wrong: [23, 230000] },
        meanDays: 450,
        source: S.water2022,
      }),
    ],
  },
  {
    id: "wpa",
    short: "WPA",
    name: "Procesador de agua",
    does: "Filtros, lechos de multifiltración y un reactor catalítico: del condensado, el agua de aseo y el destilado sale agua potable",
    realism: "real",
    rack: "wrs",
    rate: { value: 20.7, unit: "L de agua potable/día", source: S.water2022, note: "7548 L en un año (feb. 2021–feb. 2022)" },
    powerW: { value: 320, source: S.water2022, note: ESTIMATE },
    massKg: { value: 550, source: S.water2022, note: ESTIMATE },
    cooled: true,
    failures: [
      f("wpa", {
        id: "wpa-lecho-mf",
        name: "Lecho de multifiltración agotado",
        symptom: "Mantenimiento: el lecho de multifiltración llegó a su ruptura iónica y el agua sale con más conductividad",
        capacity: 0.5,
        spare: { id: "lecho-mf", name: "Lecho de multifiltración" },
        steps: ["para el WPA", "cierra las válvulas del lecho", "desmonta el lecho agotado", "monta el lecho nuevo", "purga el aire del lecho", "comprueba la conductividad del agua"],
        check: { name: "agua tratada hasta la 1.ª ruptura iónica", value: 9000, unit: "lb", wrong: [90, 900000] },
        maintenance: true,
        meanDays: 365,
        source: S.water2022,
      }),
      f("wpa", {
        id: "wpa-separador",
        name: "Fuga en el separador de gas y líquido",
        symptom: "El separador de gas y líquido pierde agua: el WPA se para",
        capacity: 0,
        spare: { id: "oru-gls", name: "Separador de gas y líquido" },
        steps: ["para el WPA", "seca el agua de la fuga", "desmonta el separador", "monta el separador nuevo", "comprueba que no hay fugas"],
        check: { name: "reserva mínima de agua potable de la ISS", value: 818, unit: "L", wrong: [8, 8180] },
        meanDays: 500,
        source: S.water2022,
      }),
    ],
  },
  {
    id: "bpa",
    short: "BPA",
    name: "Procesador de salmuera",
    does: "Seca la salmuera que deja el UPA con aire caliente y recupera su agua: con él, la ISS llegó al 98 %",
    realism: "real",
    rack: "wrs",
    rate: { value: 98, unit: "% de agua recuperada", source: S.water98, note: "Junio de 2023; antes, el 93–94 %" },
    powerW: { value: 200, source: S.water2022, note: ESTIMATE },
    massKg: { value: 150, source: S.water2022, note: ESTIMATE },
    cooled: true,
    failures: [
      f("bpa", {
        id: "bpa-bolsa",
        name: "Bolsa de salmuera llena",
        symptom: "Mantenimiento: la bolsa de salmuera seca está llena y hay que cambiarla",
        capacity: 0,
        spare: { id: "bolsa-salmuera", name: "Bolsa de salmuera" },
        steps: ["para el BPA", "cierra la bolsa de salmuera", "saca la bolsa llena", "pon la bolsa nueva", "enciende el BPA"],
        check: { name: "agua recuperada con el BPA", value: 98, unit: "%", wrong: [50, 9.8] },
        maintenance: true,
        meanDays: 200,
        source: S.water2022,
      }),
    ],
  },
  {
    id: "itcs",
    short: "ITCS",
    name: "Control térmico interno",
    does: "Dos lazos de agua (bajo a 4 °C, medio a 17 °C) llevan el calor de las máquinas y la cabina a los lazos de amoníaco y a los radiadores",
    realism: "real",
    rack: "itcs",
    rate: { value: 70, unit: "kW a los radiadores", source: S.atcs, note: "35 kW por lazo de amoníaco en el segmento estadounidense" },
    powerW: { value: 300, source: S.itcs, note: ESTIMATE },
    massKg: { value: 354, source: S.atcs, note: "Módulo de bomba de amoníaco exterior (780 lb); la bomba interior pesa menos" },
    cooled: false,
    failures: [
      f("itcs", {
        id: "itcs-bomba",
        name: "Bomba del lazo de refrigeración parada",
        symptom: "Sin refrigeración: las máquinas refrigeradas se apagan y la cabina se calienta",
        capacity: 0,
        spare: { id: "oru-ppa", name: "Conjunto de bomba (PPA)" },
        steps: ["conecta los dos lazos a una bomba", "desconecta la bomba averiada", "cambia el conjunto de bomba", "purga el gas del lazo", "comprueba la temperatura del lazo"],
        check: { name: "temperatura del lazo bajo", value: 4, unit: "°C", wrong: [40, -77] },
        meanDays: 600,
        source: S.itcs,
      }),
    ],
  },
  {
    id: "incendios",
    short: "Incendios",
    name: "Detectores de humo y extintores",
    does: "Detectores láser de humo en cada módulo; extintores portátiles de CO₂ y mascarillas de oxígeno de 15 min",
    realism: "real",
    rack: "incendios",
    rate: { value: 45, unit: "s de descarga del extintor", source: S.fire, note: "2,7 kg (6 lb) de CO₂ a 850 psi" },
    powerW: { value: 10, source: S.fire, note: ESTIMATE },
    massKg: { value: 2.7, source: S.fire, note: "Carga de CO₂ del extintor (6 lb)" },
    cooled: false,
    failures: [
      f("incendios", {
        id: "incendios-detector",
        name: "Detector de humo sin pasar su autoprueba",
        symptom: "Revisión: un detector de humo no pasa su autoprueba (BIT)",
        capacity: 0,
        spare: { id: "detector-humo", name: "Detector de humo" },
        steps: ["revisa el aviso del detector", "desconecta el detector", "cambia el detector", "conecta y haz la autoprueba"],
        check: { name: "presión del extintor de CO₂", value: 850, unit: "psi", wrong: [85, 8500] },
        maintenance: true,
        meanDays: 500,
        source: S.fire,
      }),
    ],
  },
  {
    id: "galeria",
    short: "Galería",
    name: "Agua caliente y calentador de comida",
    does: "Dispensador de agua (600 mL calientes por comida) para rehidratar los envases y un calentador para las latas y bolsas",
    realism: "real",
    rack: "galeria",
    rate: { value: 600, unit: "mL de agua caliente/comida", source: S.waterBrief, note: "NASA-STD-3001, tabla 4" },
    powerW: { value: 200, source: S.waterBrief, note: ESTIMATE },
    massKg: { value: 40, source: S.waterBrief, note: ESTIMATE },
    cooled: false,
    failures: [],
  },
];

export const eclssMachine = (id: EclssMachineId): EclssMachineSpec => {
  const m = ECLSS_MACHINES.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown ECLSS machine ${id}`);
  return m;
};

export const ALL_FAILURES: readonly FailureMode[] = ECLSS_MACHINES.flatMap((m) => m.failures);

export const failureMode = (id: string): FailureMode | undefined => ALL_FAILURES.find((x) => x.id === id);

/** ISPR rack: about 2,0 m high, 1,05 m wide, 0,86 m deep (real size; the host scales it to draw). */
export const ISPR = { w: 1.05, h: 2.0, d: 0.86, source: S.ispr } as const;

/**
 * What a host places (the data interface for the interiors of base-nodriza-real and estacion-real):
 * one interactable per rack group, at its real size. Grouping as on the ISS: the AR rack holds the
 * CDRA and the TCCS, the OGS rack the OGA and the Sabatier, the two WRS racks the UPA and WPA (the
 * BPA, in an EXPRESS rack beside them on the ISS, joins them here: «distribución nuestra»).
 */
export const ECLSS_RACKS: readonly RackSpec[] = [
  { kind: "ar", name: "Bastidor de aire (CDRA y TCCS)", machines: ["cdra", "tccs"], size: { w: ISPR.w, h: ISPR.h, d: ISPR.d }, bays: 1, info: "Revitalización del aire: el CDRA quita el CO₂ y el TCCS los contaminantes traza", source: S.issEclss },
  { kind: "ogs", name: "Generador de oxígeno (OGA y Sabatier)", machines: ["oga", "sabatier"], size: { w: ISPR.w, h: ISPR.h, d: ISPR.d }, bays: 1, info: "El OGA hace O₂ del agua; el Sabatier recupera agua del CO₂ con su hidrógeno", source: S.marshall },
  { kind: "wrs", name: "Recuperación de agua (UPA, WPA y BPA)", machines: ["upa", "wpa", "bpa"], size: { w: 2 * ISPR.w, h: ISPR.h, d: ISPR.d }, bays: 2, info: "Orina, condensado y agua de aseo vuelven a ser agua potable: el 98 %", source: S.water98 },
  { kind: "itcs", name: "Control térmico (bombas de los lazos)", machines: ["itcs"], size: { w: ISPR.w, h: ISPR.h, d: ISPR.d }, bays: 1, info: "Lazos de agua a 4 y 17 °C hacia los radiadores (70 kW)", source: S.atcs },
  { kind: "incendios", name: "Puesto de incendios", machines: ["incendios"], size: { w: 0.5, h: 0.9, d: 0.3 }, bays: 0, info: "Extintor de CO₂, mascarilla de oxígeno y el detector de humo del módulo", source: S.fire },
  { kind: "galeria", name: "Galería (agua caliente y calentador)", machines: ["galeria"], size: { w: 0.9, h: 1.2, d: 0.6 }, bays: 0, info: "Rehidratar y calentar la comida envasada de la ISS", source: S.waterBrief },
  { kind: "refugio", name: "Refugio contra la radiación", machines: [], size: { w: ISPR.w, h: ISPR.h, d: ISPR.d }, bays: 1, info: "Camarote forrado con bolsas de agua: unos 10 g/cm² quitan la mitad de la dosis de una tormenta solar", source: S.shelter },
  { kind: "consola", name: "Consola de soporte vital", machines: [], size: { w: 0.6, h: 0.45, d: 0.1 }, bays: 0, info: "Portátil con las lecturas de todo el soporte vital", source: S.issEclss },
];

export const rackSpec = (kind: RackKind): RackSpec => ECLSS_RACKS.find((r) => r.kind === kind)!;

/** Sizes of the non-ISPR things (extinguisher post, galley, laptop) are ours. */
export const RACK_SIZE_NOTE = `${GAME_VALUE}: el puesto de incendios, la galería y la consola no son bastidores ISPR`;
