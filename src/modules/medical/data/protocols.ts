import type { Sourced } from "@core/units";
import type { ConditionKind } from "../domain/health";

/** What to do for a condition: the first check (triage) and the treatment, step by step. */
export interface Protocol {
  readonly kind: ConditionKind;
  readonly name: string;
  readonly steps: Sourced<readonly string[]>;
}

const WHO_BEC = "https://www.who.int/publications/i/item/basic-emergency-care-approach-to-the-acutely-ill-and-injured";
const CS_HOSPITAL = "https://github.com/videnacry/cold-sanctuary/blob/master/docs/hospital.md";

/**
 * Triage always starts with the ABCDE approach of WHO/ICRC Basic Emergency Care: airway, breathing,
 * circulation, disability, exposure. It works the same for a person, a cat or a hen.
 */
export const ABCDE: Sourced<readonly string[]> = {
  value: ["vía aérea", "respiración", "circulación", "estado neurológico", "exposición"],
  source: WHO_BEC,
};

export const PROTOCOLS: Readonly<Record<ConditionKind, Protocol>> = {
  herida: {
    kind: "herida",
    name: "Herida",
    steps: {
      source: WHO_BEC,
      note: "First aid for wounds: stop bleeding with pressure, irrigate with clean water or saline, cover. Game summary, not a clinical protocol.",
      value: ["ponte guantes", "presiona para parar el sangrado", "irriga la herida con suero salino", "revisa si hay cuerpos extraños", "cubre con un apósito limpio"],
    },
  },
  contusion: {
    kind: "contusion",
    name: "Golpe",
    steps: {
      source: CS_HOSPITAL,
      note: "Imaging (ultrasound/X-ray) before deciding; immobilise and give analgesia. Game summary.",
      value: ["inmoviliza la zona", "haz una ecografía", "aplica frío", "da analgesia según el peso", "deja en reposo"],
    },
  },
  intoxicacion: {
    kind: "intoxicacion",
    name: "Intoxicación",
    steps: {
      source: "https://www.aspca.org/pet-care/animal-poison-control",
      note: "Identify the plant, call poison control, follow the vet's decontamination advice; never induce vomiting without it. Game summary.",
      value: ["identifica la planta mordida", "consulta al centro de toxicología", "da carbón activado si lo indican", "pon fluidos", "vigila 24 horas"],
    },
  },
  absceso: {
    kind: "absceso",
    name: "Absceso",
    steps: {
      source: CS_HOSPITAL,
      note: "Infected bite: drain, flush and give antibiotics. Game summary.",
      value: ["seda al paciente", "abre y drena el absceso", "lava con suero salino", "da antibiótico", "pon un collar para que no se lama"],
    },
  },
  "estres-agudo": {
    kind: "estres-agudo",
    name: "Estrés agudo",
    steps: {
      source: CS_HOSPITAL,
      note: "Quiet, dim, safe place; check for hidden injuries. Game summary.",
      value: ["lleva al paciente a un lugar tranquilo", "baja la luz", "revisa lesiones ocultas", "ofrece agua", "deja que descanse"],
    },
  },
};
