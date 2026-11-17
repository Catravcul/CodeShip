import type { Reality } from "@core/reality";
import { ROBOTICS_SOURCES as S } from "./robotics";

/**
 * The arm's real procedures as blocks of a code challenge (docs/design/brazo-robotico.md). Each block says
 * what the operator at the RWS commands and `move` names the arm motion the outside view plays when it is
 * placed right (station-outside.ts). The order is the real one; the trap block is a real mistake.
 */
export type ArmMove =
  | "punto-captura"
  | "deriva-libre"
  | "acercar"
  | "capturar"
  | "llevar-cbm"
  | "primera-etapa"
  | "segunda-etapa"
  | "soltar"
  | "apartar"
  | "andar-mbs"
  | "rodar-mbs"
  | "agarrar-dextre"
  | "llevar-dextre-ef"
  | "llevar-dextre-camara"
  | "sacar-oru"
  | "tomar-oru"
  | "montar-oru"
  | "devolver-dextre"
  | "agarrar-modulo"
  | "sacar-modulo"
  | "llevar-modulo"
  | "volver-ida"
  | "agarrar-bishop"
  | "sacar-bishop"
  | "soltar-carga"
  | "atracar-bishop"
  | "comprobar";

export interface ArmStep {
  readonly id: string;
  readonly pseudo: string;
  readonly move: ArmMove;
}

export type ArmProcedureId = "captura" | "atraque-modulo" | "desatraque-modulo" | "bishop" | "dextre-camara";

export interface ArmProcedure {
  readonly id: ArmProcedureId;
  readonly title: string;
  readonly idea: string;
  readonly steps: readonly ArmStep[];
  /** A real mistake, never in the solution. */
  readonly trap: { readonly pseudo: string };
  readonly reality: Reality;
  /** What is a licence in it, said on the card. */
  readonly licence?: string;
  readonly source: string;
}

const url = (s: string) => s.split(": ").pop()!;

export const ARM_PROCEDURES: Readonly<Record<ArmProcedureId, ArmProcedure>> = {
  captura: {
    id: "captura",
    title: "Capturar el Cygnus y atracarlo",
    idea: "El carguero espera a 10 m; con sus propulsores apagados el brazo lo agarra y lo lleva al CBM",
    steps: [
      { id: "a", pseudo: "esperar a que el Cygnus se pare en el punto de captura (10 m)", move: "punto-captura" },
      { id: "b", pseudo: "ordenar la deriva libre: el Cygnus apaga sus propulsores", move: "deriva-libre" },
      { id: "c", pseudo: "acercar el LEE al accesorio de agarre del Cygnus", move: "acercar" },
      { id: "d", pseudo: "disparar: los tres cables del LEE atrapan el vástago", move: "capturar" },
      { id: "e", pseudo: "llevar el Cygnus hasta el CBM de nadir", move: "llevar-cbm" },
      { id: "f", pseudo: "primera etapa: los 4 pestillos del CBM lo arriman", move: "primera-etapa" },
      { id: "g", pseudo: "segunda etapa: los 16 pernos se aprietan", move: "segunda-etapa" },
      { id: "h", pseudo: "soltar el Cygnus y apartar el brazo", move: "soltar" },
    ],
    trap: { pseudo: "capturar con los propulsores del Cygnus encendidos" },
    reality: "real",
    source: url(S.ng19),
  },
  "atraque-modulo": {
    id: "atraque-modulo",
    title: "Atracar el módulo lunar en el CBM con el brazo",
    idea: "El brazo saca el módulo de su IDA y lo atraca en el CBM de nadir de Unity, como un Cygnus",
    steps: [
      { id: "a", pseudo: "rodar la MBS por la celosía hasta Harmony", move: "rodar-mbs" },
      { id: "b", pseudo: "agarrar el módulo por su accesorio de agarre", move: "agarrar-modulo" },
      { id: "c", pseudo: "abrir los ganchos del IDA y sacarlo despacio", move: "sacar-modulo" },
      { id: "d", pseudo: "llevarlo por encima de la celosía hasta el nadir de Unity", move: "llevar-modulo" },
      { id: "e", pseudo: "primera etapa: los 4 pestillos del CBM", move: "primera-etapa" },
      { id: "f", pseudo: "segunda etapa: los 16 pernos", move: "segunda-etapa" },
    ],
    trap: { pseudo: "soltar el módulo antes de apretar los pernos" },
    reality: "licencia",
    licence: "Licencia: el módulo lunar Apolo no lleva accesorio de agarre ni anillo CBM; el procedimiento es el de un Cygnus",
    source: url(S.cbm),
  },
  "desatraque-modulo": {
    id: "desatraque-modulo",
    title: "Devolver el módulo lunar a su IDA",
    idea: "Al revés que el atraque: primero los pernos, luego los pestillos, y el brazo lo lleva al IDA",
    steps: [
      { id: "a", pseudo: "agarrar el módulo en el CBM", move: "agarrar-modulo" },
      { id: "b", pseudo: "soltar los 16 pernos", move: "segunda-etapa" },
      { id: "c", pseudo: "abrir los 4 pestillos", move: "primera-etapa" },
      { id: "d", pseudo: "llevarlo por encima de la celosía hasta el IDA de cenit", move: "volver-ida" },
      { id: "e", pseudo: "cerrar los ganchos del IDA y soltarlo", move: "soltar" },
    ],
    trap: { pseudo: "tirar del módulo con los pernos apretados" },
    reality: "licencia",
    licence: "Licencia: el módulo lunar Apolo no lleva accesorio de agarre ni anillo CBM",
    source: url(S.cbm),
  },
  bishop: {
    id: "bishop",
    title: "Sacar la Bishop y soltar la carga",
    idea: "La Bishop no tiene escotillas propias: se cierra la de Tranquility y el brazo la saca entera",
    steps: [
      { id: "a", pseudo: "cerrar la escotilla CBM de Tranquility", move: "comprobar" },
      { id: "b", pseudo: "bombear el aire del vestíbulo a la estación", move: "comprobar" },
      { id: "c", pseudo: "agarrar la Bishop por su accesorio", move: "agarrar-bishop" },
      { id: "d", pseudo: "soltar los pernos del CBM y sacarla", move: "sacar-bishop" },
      { id: "e", pseudo: "abrir el lanzador: la carga se aleja sola", move: "soltar-carga" },
      { id: "f", pseudo: "volver a atracar la Bishop y apretar los pernos", move: "atracar-bishop" },
    ],
    trap: { pseudo: "soltar los pernos con aire en el vestíbulo" },
    reality: "real",
    source: url(S.bishop),
  },
  "dextre-camara": {
    id: "dextre-camara",
    title: "Cambiar la cámara de S1 con Dextre",
    idea: "Canadarm2 lleva a Dextre, y Dextre, con sus manos pequeñas, cambia la pieza",
    steps: [
      { id: "a", pseudo: "andar el brazo hasta un PDGF de la MBS", move: "andar-mbs" },
      { id: "b", pseudo: "agarrar a Dextre por el accesorio de su cabeza", move: "agarrar-dextre" },
      { id: "c", pseudo: "llevar a Dextre al estante de repuestos de la JEM-EF", move: "llevar-dextre-ef" },
      { id: "d", pseudo: "Dextre toma la cámara nueva con su OTCM", move: "tomar-oru" },
      { id: "e", pseudo: "llevar a Dextre hasta la cámara de S1", move: "llevar-dextre-camara" },
      { id: "f", pseudo: "Dextre desenrosca la cámara vieja y la sujeta con su otra mano", move: "sacar-oru" },
      { id: "g", pseudo: "Dextre monta la cámara nueva y aprieta el perno", move: "montar-oru" },
      { id: "h", pseudo: "devolver a Dextre a la MBS con la cámara vieja", move: "devolver-dextre" },
    ],
    trap: { pseudo: "desenroscar la cámara vieja sin otra mano que la sujete" },
    reality: "real",
    source: url(S.dextre),
  },
};
