import type { StepAct } from "@modules/chores/domain/step-visual";

/**
 * The crew's everyday procedures as code challenges (reglas.md §4.1; docs/design/equipos.md): washing at the
 * hygiene station, sheltering from a solar particle event, and the medical kit (CHeCS). Each one is a list of
 * real steps (one challenge each; `{right|wrong|wrong}` asks for a value), plausible wrong steps, and what each
 * solved step shows where it is done (`acts`, played by step-show.ts).
 */
export interface Procedure {
  readonly id: string;
  readonly title: string;
  readonly scenario: string;
  readonly steps: readonly string[];
  readonly wrong: readonly string[];
  readonly acts: readonly (readonly StepAct[])[];
  readonly source: string;
  /** real: as the ISS does it; licencia: the ISS's procedure on Starship; en-desarrollo: a proposed concept. */
  readonly label: "real" | "licencia" | "en-desarrollo";
}

export const PROCEDURE_SOURCES = {
  hygiene: "Agencia Espacial Canadiense, higiene personal en el espacio: toalla con jabón sin aclarado, champú sin aclarado, secar con la toalla y peinarse: https://asc-csa.gc.ca/eng/astronauts/living-in-space/personal-hygiene-in-space.asp",
  quarters: "NASA, ISS Crew Quarters (Broyan, Borrego y Bahr, 2008): los camarotes de Harmony llevan material de reducción de la radiación integrado: https://ntrs.nasa.gov/citations/20080013462",
  spe: "Ante una tormenta solar la tripulación de la ISS se va a las zonas más blindadas, avisada por el SRAG de la NASA; Destiny, en el centro del conjunto, es uno de sus refugios: https://johnsonfrancis.org/techworld/?p=16371",
  shelter: "RadWorks Storm Shelter (NASA, NTRS 20150001237): paredes de agua de 9,3–10,8 g/cm² reducen a la mitad la dosis de una tormenta solar: https://ntrs.nasa.gov/api/citations/20150001237/downloads/20150001237.pdf",
  checs: "Sistema médico de la ISS (rack CHeCS): bolsa médica ambulatoria, bolsa de soporte vital avanzado, desfibrilador LifePak 1000 para microgravedad y ecógrafo; un oficial médico de la tripulación con unas 40 h de formación: https://newspaceeconomy.ca/2025/09/20/life-above-earth-emergency-procedures-and-medical-capabilities-on-the-international-space-station",
} as const;

/** Washing at the hygiene station (WHC): no shower on the ISS; the wet towel's water goes to the air and is recovered. */
export const HYGIENE: Procedure = {
  id: "asearse",
  title: "Asearse en el WHC",
  scenario: "Sin ducha en 0 g: toalla, jabón y champú sin aclarado, y el agua que queda acaba en el aire",
  steps: [
    "moja la toalla con agua de la bolsa y jabón sin aclarado",
    "lávate la cara, el cuello y los brazos con la toalla",
    "pon el champú sin aclarado en las manos",
    "masajea bien el cuero cabelludo",
    "sécate el pelo con la toalla",
    "péinate y deja que el pelo se seque al aire",
    "cuelga la toalla para que se seque: su agua la recupera el soporte vital",
  ],
  wrong: ["aclárate el pelo bajo un chorro de agua", "sacude el pelo mojado para secarlo", "tira la toalla mojada a la basura"],
  acts: [
    [{ action: "verter", place: "objetivo", tint: "agua" }],
    [{ action: "lavar", place: "objetivo", tint: "agua" }],
    [{ action: "servir", place: "objetivo", tint: "agua" }],
    [{ action: "remover", place: "objetivo", tint: "agua" }],
    [{ action: "lavar", place: "objetivo", tint: "agua" }],
    [{ action: "revisar", place: "objetivo" }],
    [{ action: "reposar", place: "objetivo", tint: "agua" }],
  ],
  source: PROCEDURE_SOURCES.hygiene,
  label: "real",
};

/** Sheltering from a solar particle event at the station: her crew quarter in Harmony (radiation reduction material). */
export const SHELTER_ISS: Procedure = {
  id: "refugio-estacion",
  title: "Simulacro de tormenta solar: resguardarse",
  scenario: "El SRAG avisa de una tormenta de partículas solares: a la zona más blindada hasta que pase",
  steps: [
    "lee el aviso de tormenta solar del control de radiación (SRAG)",
    "coge tu dosímetro personal",
    "ve a tu camarote de Harmony, con material contra la radiación en sus paredes",
    "pon bolsas de agua contra la pared que da afuera",
    "cierra la puerta plegable y sujétate",
    "apunta la dosis del dosímetro cada {1|12|24} hora",
    "sal cuando el control dé la tormenta por terminada",
  ],
  wrong: ["sal a la Cupola a ver la aurora", "quédate junto a la escotilla de proa, que es más fina", "apaga el dosímetro para ahorrar batería"],
  acts: [
    [{ action: "revisar", place: "objetivo", vessel: "saco" }],
    [{ action: "tomar", place: "objetivo" }],
    [{ action: "saco", place: "objetivo" }],
    [{ action: "servir", place: "objetivo", tint: "agua" }],
    [{ action: "luz", place: "objetivo", vessel: "saco" }],
    [{ action: "programar", place: "objetivo", vessel: "saco" }],
    [{ action: "revisar", place: "objetivo", vessel: "saco" }],
  ],
  source: `${PROCEDURE_SOURCES.spe}; ${PROCEDURE_SOURCES.quarters}`,
  label: "real",
};

/** On Starship: into the water-wall shelter (en desarrollo: RadWorks; Orion makes its own with its stowage). */
export const SHELTER_SHIP: Procedure = {
  id: "refugio-nodriza",
  title: "Simulacro de tormenta solar: al refugio de agua",
  scenario: "Aviso de tormenta de partículas solares: al refugio forrado de bolsas de agua de la cubierta 2",
  steps: [
    "lee el aviso de tormenta solar",
    "coge tu dosímetro personal",
    "comprueba que las bolsas de agua del refugio están llenas",
    "métete en el refugio y baja la puerta enrollable",
    "sujétate con la cinta",
    "apunta la dosis del dosímetro cada {1|12|24} hora",
    "sal cuando el aviso termine",
  ],
  wrong: ["vacía las bolsas de agua para pesar menos", "quédate junto a la ventana", "apaga el dosímetro para ahorrar batería"],
  acts: [
    [{ action: "revisar", place: "objetivo" }],
    [{ action: "tomar", place: "objetivo" }],
    [{ action: "revisar", place: "objetivo", tint: "agua" }],
    [{ action: "revisar", place: "objetivo" }],
    [{ action: "reposar", place: "objetivo" }],
    [{ action: "programar", place: "objetivo" }],
    [{ action: "revisar", place: "objetivo" }],
  ],
  source: PROCEDURE_SOURCES.shelter,
  label: "en-desarrollo",
};

/** The periodic check-up with the CHeCS kit: blood pressure, ECG to the flight surgeons, ultrasound guided from the ground. */
export const CHECKUP: Procedure = {
  id: "medico-chequeo",
  title: "Chequeo médico con el CHeCS",
  scenario: "Revisión periódica: tensión, electrocardiograma y ecografía, enviados a los médicos de vuelo",
  steps: [
    "saca el tensiómetro de la bolsa médica ambulatoria",
    "toma la tensión: en reposo, por debajo de {120|180|60} mmHg de sistólica",
    "pega los electrodos del electrocardiograma",
    "envía el electrocardiograma a los médicos de vuelo",
    "pasa la sonda del ecógrafo por el corazón, guiada desde tierra",
    "guarda todo en su bolsa del CHeCS",
  ],
  wrong: ["tómate la tensión justo después de correr en la T2", "borra el electrocardiograma sin enviarlo", "deja el ecógrafo flotando suelto"],
  acts: [
    [{ action: "tomar", place: "objetivo" }],
    [{ action: "curar", place: "objetivo" }],
    [{ action: "curar", place: "objetivo" }],
    [{ action: "programar", place: "objetivo" }],
    [{ action: "revisar", place: "objetivo" }],
    [{ action: "reposar", place: "objetivo" }],
  ],
  source: PROCEDURE_SOURCES.checs,
  label: "real",
};

/** Medical training (the crew medical officer's): a cardiac arrest with the CHeCS defibrillator, on the restraint board. */
export const AED_DRILL: Procedure = {
  id: "medico-desfibrilador",
  title: "Formación médica: el desfibrilador",
  scenario: "Práctica de oficial médico de la tripulación: una parada cardiaca en 0 g, con el desfibrilador del CHeCS",
  steps: [
    "comprueba que no responde ni respira",
    "avisa a la tripulación y a los médicos de vuelo",
    "sujeta al paciente a la tabla de inmovilización con sus cintas",
    "enciende el desfibrilador y pega los parches en el pecho",
    "que nadie lo toque mientras analiza el ritmo",
    "da la descarga y sigue con la reanimación",
    "guarda el desfibrilador y repón los parches",
  ],
  wrong: ["dale agua para que se recupere", "sujétalo con la mano durante la descarga", "espera a llegar a tierra"],
  acts: [
    [{ action: "revisar", place: "objetivo" }],
    [{ action: "programar", place: "objetivo" }],
    [{ action: "curar", place: "objetivo" }],
    [{ action: "curar", place: "objetivo" }],
    [{ action: "revisar", place: "objetivo" }],
    [{ action: "curar", place: "objetivo" }],
    [{ action: "reposar", place: "objetivo" }],
  ],
  source: PROCEDURE_SOURCES.checs,
  label: "real",
};

export const PROCEDURES: readonly Procedure[] = [HYGIENE, SHELTER_ISS, SHELTER_SHIP, CHECKUP, AED_DRILL];
export const procedureById = (id: string): Procedure | undefined => PROCEDURES.find((p) => p.id === id);
