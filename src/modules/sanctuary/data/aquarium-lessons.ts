import type { Exercise } from "@modules/mind-duel/domain/exercise";
import type { AquariumHelper } from "../domain/aquarium";
import { SANCTUARY_SRC as S } from "./sources";

/**
 * Mind programs for the ring aquarium (docs/design/santuario-espacial.md, «Amistad» and «Pedir ayuda»).
 * Talking to a mind is reading or writing its program, as with the cats, dogs and hens: each lesson is a rule
 * and the ideas that must be solved to write it. The behaviour behind each rule is real (sources below);
 * that a written rule makes them do it is the game's licence, as in Cold Sanctuary.
 */
export interface AquariumLesson {
  readonly id: string;
  /** Spanish pseudocode and JS of the rule written into their minds. */
  readonly pseudo: string;
  readonly js: string;
  /** What real behaviour it leans on. */
  readonly basis: string;
  readonly source: string;
  readonly exercises: readonly Exercise[];
}

/** Making friends with the medaka school: they learn her face and come to the glass without fear. */
export const BEFRIEND_SCHOOL: AquariumLesson = {
  id: "medakas-amigas",
  pseudo: "cuando Doménica se acerque al cristal → recordar su cara y nadar hacia ella en banco",
  js: "on('domenica-en-el-cristal', banco => { recordarCara(); acercarse(banco, 'despacio'); });",
  basis: "Los peces aprenden caras humanas (el pez arquero elige una cara aprendida entre 44 con un 81 % de acierto) y asocian a quien los cuida con la comida.",
  source: S.fishFaces,
  exercises: [
    {
      kind: "order",
      id: "acuario-amistad-programa",
      concept: 9,
      idea: "Una sombra grande junto al cristal… ¿es la de siempre?",
      blocks: [
        { id: "a", pseudo: "cuando Doménica se acerque al cristal", js: "on('domenica-en-el-cristal', (banco) => {" },
        { id: "b", pseudo: "recordar su cara", js: "recordarCara('Doménica');", indent: 1 },
        { id: "c", pseudo: "nadar hacia ella despacio, en banco", js: "acercarse(banco, 'despacio');", indent: 1 },
        { id: "d", pseudo: "fin", js: "});" },
      ],
      solution: ["a", "b", "c", "d"],
    },
    {
      kind: "choice",
      id: "acuario-amistad-predecir",
      concept: 5,
      skill: "predecir",
      idea: "¿Nos acercamos o nos escondemos en el ceratófilo?",
      question: "El banco tiene calma 0,8 y conoce su cara. ¿Qué hace?",
      code: [
        { id: "a", pseudo: "si banco.calma > 0,5 y conoce(cara) entonces", js: "if (banco.calma > 0.5 && conoce(cara)) {" },
        { id: "b", pseudo: "acercarse(banco)", js: "acercarse(banco);", indent: 1 },
        { id: "c", pseudo: "si no", js: "} else {" },
        { id: "d", pseudo: "esconderse(ceratofilo)", js: "esconderse(ceratofilo);", indent: 1 },
        { id: "e", pseudo: "fin", js: "}" },
      ],
      options: ["Se esconde en el ceratófilo", "Se acerca al cristal", "Se queda quieto en el fondo"],
      correct: 1,
    },
    {
      kind: "choice",
      id: "acuario-amistad-especificar",
      concept: 5,
      skill: "especificar",
      idea: "Dinos cómo quieres que seamos amigos",
      question: "¿Qué orden hace amigas a las medakas sin asustarlas?",
      code: [],
      options: ["Da golpecitos en el cristal para llamarlas", "Acércate despacio, siempre a la misma hora, y espera a que vengan", "Persíguelas con la red hasta que se cansen"],
      correct: 1,
    },
  ],
};

/** Help programs, one per helper. */
export const HELP_LESSONS: Readonly<Record<AquariumHelper, AquariumLesson & { readonly who: string; readonly task: string }>> = {
  "caracoles-limpian": {
    id: "caracoles-limpian",
    who: "los caracoles",
    task: "limpiar el cristal",
    pseudo: "cuando el cristal tenga algas → subir por él y rasparlas con la rádula; al terminar, volver al fondo",
    js: "on('algas-en-el-cristal', c => { subir(c); raspar(c, 'radula'); bajar(); });",
    basis: "Los caracoles de agua dulce raspan el biofilm y las algas con la rádula; las neritas son los limpiacristales clásicos.",
    source: S.nerite,
    exercises: [
      {
        kind: "order",
        id: "acuario-ayuda-caracoles-programa",
        concept: 9,
        idea: "¿Ese verde del cristal es para nosotros?",
        blocks: [
          { id: "a", pseudo: "cuando el cristal tenga algas", js: "on('algas-en-el-cristal', (cristal) => {" },
          { id: "b", pseudo: "subir por el cristal", js: "subir(cristal);", indent: 1 },
          { id: "c", pseudo: "raspar las algas con la rádula", js: "raspar(cristal, 'radula');", indent: 1 },
          { id: "d", pseudo: "volver al fondo al terminar", js: "bajar();", indent: 1 },
          { id: "e", pseudo: "fin", js: "});" },
        ],
        solution: ["a", "b", "c", "d", "e"],
      },
      {
        kind: "choice",
        id: "acuario-ayuda-caracoles-reparar",
        concept: 5,
        skill: "reparar",
        idea: "Algo en el plan nos hace comernos la planta",
        question: "¿Qué línea haría que los caracoles se comieran el ceratófilo, que da el oxígeno?",
        code: [
          { id: "a", pseudo: "si cristal.algas > 0,3 entonces", js: "if (cristal.algas > 0.3) {" },
          { id: "b", pseudo: "raspar(cristal)", js: "raspar(cristal);", indent: 1 },
          { id: "c", pseudo: "si no", js: "} else {" },
          { id: "d", pseudo: "comer(ceratofilo)", js: "comer(ceratofilo);", indent: 1 },
          { id: "e", pseudo: "fin", js: "}" },
        ],
        options: ["si cristal.algas > 0,3 entonces", "raspar(cristal)", "comer(ceratofilo)"],
        correct: 2,
      },
      {
        kind: "choice",
        id: "acuario-ayuda-caracoles-predecir",
        concept: 4,
        skill: "predecir",
        idea: "¿Cuánto cristal limpiamos?",
        question: "El cristal tiene 0,45 de algas y los caracoles quitan 0,15 al día. ¿Cuánto queda tras 2 días?",
        code: [
          { id: "a", pseudo: "guardar 0,45 en algas", js: "let algas = 0.45;" },
          { id: "b", pseudo: "repetir 2 veces: algas = algas − 0,15", js: "for (let d = 0; d < 2; d++) algas -= 0.15;" },
        ],
        options: ["0,3", "0,15", "0"],
        correct: 1,
      },
    ],
  },
  "medakas-avisan": {
    id: "medakas-avisan",
    who: "las medakas",
    task: "avisar si el agua empeora",
    pseudo: "cuando el nitrato pase de 30 mg/L o falte oxígeno → subir en banco al cristal de delante",
    js: "on('agua', a => { if (a.nitrato > 30 || a.oxigeno < 5) avisar(banco, 'cristal-delantero'); });",
    basis: "Con poco oxígeno los peces suben a respirar la película de la superficie antes de enfermar: es una señal temprana.",
    source: S.surfaceRespiration,
    exercises: [
      {
        kind: "order",
        id: "acuario-ayuda-medakas-programa",
        concept: 9,
        idea: "El agua sabe rara… ¿se lo decimos?",
        blocks: [
          { id: "a", pseudo: "cuando cambie el agua", js: "on('agua', (agua) => {" },
          { id: "b", pseudo: "si el nitrato pasa de 30 o falta oxígeno", js: "if (agua.nitrato > 30 || agua.oxigeno < 5) {", indent: 1 },
          { id: "c", pseudo: "subir en banco al cristal de delante", js: "avisar(banco, 'cristal-delantero');", indent: 2 },
          { id: "d", pseudo: "fin del si", js: "}", indent: 1 },
          { id: "e", pseudo: "fin", js: "});" },
        ],
        solution: ["a", "b", "c", "d", "e"],
      },
      {
        kind: "choice",
        id: "acuario-ayuda-medakas-completar",
        concept: 4,
        skill: "completar",
        idea: "¿Desde cuándo avisamos?",
        question: "Para avisar antes de que haga falta cambiar el agua (a 40 mg/L), ¿qué valor falta?",
        code: [
          { id: "a", pseudo: "si agua.nitrato > ___ entonces", js: "if (agua.nitrato > ___) {" },
          { id: "b", pseudo: "avisar(banco)", js: "avisar(banco);", indent: 1 },
          { id: "c", pseudo: "fin", js: "}" },
        ],
        options: ["30", "40", "80"],
        correct: 0,
      },
      {
        kind: "choice",
        id: "acuario-ayuda-medakas-predecir",
        concept: 5,
        skill: "predecir",
        idea: "¿Nos verás en el cristal?",
        question: "El nitrato está en 38 mg/L y el oxígeno en 7,5 mg/L. ¿Avisan?",
        code: [{ id: "a", pseudo: "si agua.nitrato > 30 o agua.oxigeno < 5 entonces avisar()", js: "if (agua.nitrato > 30 || agua.oxigeno < 5) avisar();" }],
        options: ["No: el oxígeno está bien", "Sí: el nitrato pasa de 30", "Solo si fallan las dos"],
        correct: 1,
      },
    ],
  },
};
