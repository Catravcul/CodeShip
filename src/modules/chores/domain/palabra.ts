/**
 * The one word that says what a challenge is about (Berón 2026-11-25: «el botón de reto en lugar de decir reto podría
 * decir en una palabra de qué se trata el reto, como por ejemplo "cocina", "boxeo", etc»). The Switch pad's Y and the
 * orange interaction button show it; the challenge's full name stays their accessible name. The same rule in every
 * level (sanctuary 1's things, sanctuary 3's posts and field work, the ships' chores), from the challenge's own data:
 *
 * 1. its `palabra`, where the data sets one (only where it cannot be derived);
 * 2. a cleaning is «Limpieza» and a watering or a harvest «Huerto», wherever they are;
 * 3. its id (sanctuary 1's procedures, the ships' chore ids, sanctuary 3's posts `s3:puesto-N`);
 * 4. its title, then the place's name (the machine's card: a button there only carries its title);
 * 5. its board kind (chores/domain/chore.ts ChoreKind);
 * 6. else «Reto».
 *
 * Always one word, capitalised: «Cocina», «Boxeo», «Natación», «Hipoxia», «Centrífuga», «Yoga».
 */
export interface RetoTag {
  /** The word, set by the data where it cannot be derived. */
  readonly palabra?: string;
  /** The procedure's or the chore's id. */
  readonly id?: string;
  /** The board's kind (ChoreKind, sanctuary 1's RetoKind). */
  readonly kind?: string;
  /** The challenge's title. */
  readonly title?: string;
  /** Where it is done (the machine's name), the last clue. */
  readonly place?: string;
}

/** What every challenge says when nothing tells it apart. */
export const RETO = "Reto";
/** Several challenges of different kinds at one place. */
export const RETOS = "Retos";

type Rule = readonly [RegExp, string];

/** Sanctuary 3's posts (modules/aerial-sanctuary/application/initiation.ts POSTS), by number. */
const POSTS: Readonly<Record<number, string>> = {
  1: "Selección",
  2: "Medicina",
  3: "Natación",
  4: "Hipoxia",
  5: "Centrífuga",
  6: "Ingravidez",
  7: "Inmersión",
  8: "Simulador",
  9: "Robótica",
  10: "Lanzamiento",
  11: "Geología",
  12: "Supervivencia",
  13: "Traje",
};

/** By id (after «obj-», «chore:» and «s3:» are taken off), first match wins. */
const BY_ID: readonly Rule[] = [
  [/^dojo-(saco|pera|ring)/, "Boxeo"],
  [/^dojo-makiwara/, "Kárate"],
  [/^dojo-(judo|tatami$)/, "Judo"],
  [/^dojo/, "Lucha"],
  [/^(musica|mus)-/, "Música"],
  [/^ballet/, "Ballet"],
  [/^yoga/, "Yoga"],
  [/^gym-(cinta|bici|eliptica|escaladora|assault|remo-tecnica|skierg|cardio)/, "Cardio"],
  [/^(gym-crossfit|cf-)/, "Crossfit"],
  [/^(cal-|gym-(calistenia|fondos))/, "Calistenia"],
  [/^(pk-|gym-parkour)/, "Parkour"],
  [/^gym/, "Gimnasio"],
  [/^(cocina|comedor|cocinar|procesar)-/, "Cocina"],
  [/^(mente|programar)-/, "Mente"],
  [/^(alimentar|biberon|vigilar-petrel|cria|osezno|polluelo|cachorro|calmar|jugar)-/, "Animales"],
  [/^aula-estudio/, "Estudio"],
  [/^(aula|his)-/, "Clase"],
  [/^(hosp|hospital|atender)-/, "Medicina"],
  [/^vet-/, "Veterinaria"],
  [/^(gua|guardia)-/, "Guardia"],
  [/^(cpd|i)-/, "Informática"],
  [/^(q-|lab-(quimica|analisis))/, "Química"],
  [/^(b-|lab-(cabina|pcr|molecular))/, "Biología"],
  [/^lab-/, "Laboratorio"],
  [/^(cons|obra)-/, "Obra"],
  [/^mec-/, "Mecánica"],
  [/^sub-/, "Submarino"],
  [/^tex(til)?-/, "Textil"],
  [/^asamblea-/, "Asamblea"],
  [/^tundra-/, "Botánica"],
  [/^(res-terraza|planta|frutal|huerto|cultivo|metodo|seto|vf-|fotobio|regar|curar|cosechar|agitar)/, "Huerto"],
  [/^res-/, "Hogar"],
  [/^sim-/, "Simulación"],
  [/^aseos/, "Limpieza"],
  [/^brazo[:-]/, "Robótica"],
  [/^eva:/, "Paseo"],
  [/^sv-pm-/, "Mantenimiento"],
  [/^(sv-|reparar-)/, "Reparación"],
  [/-maniobra$/, "Navegación"],
  [/-programa$/, "Aterrizaje"],
];

/** By title or place, lower case and without accents, first match wins. */
const BY_TEXT: readonly Rule[] = [
  [/natacion|nadar/, "Natación"],
  [/hipobaric|hipoxia/, "Hipoxia"],
  [/centrifuga/, "Centrífuga"],
  [/parabolic|ingravidez/, "Ingravidez"],
  [/flotabilidad|\bnbl\b/, "Inmersión"],
  [/robotica|brazo|canadarm|cygnus/, "Robótica"],
  [/simulador|acople|alunizaje/, "Simulador"],
  [/meteorit|geolog/, "Geología"],
  [/supervivencia/, "Supervivencia"],
  [/lanzamiento|cuenta atras|electron/, "Lanzamiento"],
  [/seleccion|entrevista/, "Selección"],
  [/traje/, "Traje"],
  [/reconocimiento|medic|botiquin/, "Medicina"],
  [/camaras? trampa|censo|nido|mesa de campo|ibice|leopardo|buitre|fauna|colmena|transecto|mariposa|escarabajo|insecto/, "Fauna"],
  [/yoga|saludo al sol/, "Yoga"],
  [/boxeo|\bsaco\b/, "Boxeo"],
  [/cocin|receta/, "Cocina"],
  [/acuario/, "Acuario"],
  [/dormir|sueno/, "Sueño"],
  [/limpi|fregar/, "Limpieza"],
  [/navegacion|viaje/, "Navegación"],
  [/aterrizaje/, "Aterrizaje"],
];

/** By the board's kind, when nothing else told. */
const BY_KIND: Readonly<Record<string, string>> = {
  ejercicio: "Ejercicio",
  yoga: "Yoga",
  cocinar: "Cocina",
  procesar: "Cocina",
  regar: "Huerto",
  cosechar: "Huerto",
  "curar-planta": "Huerto",
  agitar: "Huerto",
  "alimentar-animal": "Animales",
  "alimentar-gato": "Animales",
  "calmar-gato": "Animales",
  "alimentar-perro": "Animales",
  "jugar-perro": "Animales",
  "abrir-gallinero": "Animales",
  "alimentar-gallinas": "Animales",
  "recoger-huevos": "Animales",
  "programar-animal": "Mente",
  "atender-paciente": "Medicina",
  medico: "Medicina",
  limpiar: "Limpieza",
  asearse: "Aseo",
  dormir: "Sueño",
  refugio: "Refugio",
  "reparar-nave": "Reparación",
  "reparar-maquina": "Reparación",
  "cambiar-pieza": "Reparación",
  "soporte-vital": "Reparación",
  "brazo-robotico": "Robótica",
  "salir-eva": "Paseo",
  "programar-viaje": "Navegación",
  "programar-aterrizaje": "Aterrizaje",
  importar: "Importar",
  fabricar: "Fabricar",
  refinar: "Refinar",
  repostar: "Repostar",
  "cuidar-acuario": "Acuario",
  "amistad-acuario": "Acuario",
  "ayuda-acuario": "Acuario",
  "amistad-especie": "Especies",
  "ayuda-especie": "Especies",
  trabajar: "Trabajo",
};

const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** «cocina» → «Cocina»; a word set by the data comes out the same way (one word, capitalised). */
export function capitalised(w: string): string {
  const one = w.trim().split(/\s+/)[0] ?? "";
  return one ? one[0]!.toLocaleUpperCase("es") + one.slice(1).toLocaleLowerCase("es") : RETO;
}

const match = (rules: readonly Rule[], s: string | undefined) => (s ? rules.find(([re]) => re.test(s))?.[1] : undefined);

/** The one word of a challenge (the rules at the top of this file). */
export function retoWord(r: RetoTag): string {
  if (r.palabra?.trim()) return capitalised(r.palabra);
  if (r.kind === "limpiar") return "Limpieza";
  // A plant's watering or harvest is the garden's, in whatever room it stands (the assembly's tree).
  if (r.kind === "regar" || r.kind === "cosechar") return "Huerto";
  const id = r.id?.replace(/^(chore:|obj-)/, "");
  const post = id?.match(/^s3:puesto-(\d+)/);
  if (post) return POSTS[Number(post[1])] ?? RETO;
  return match(BY_ID, id?.replace(/^s3:/, "")) ?? match(BY_TEXT, r.title && plain(r.title)) ?? match(BY_TEXT, r.place && plain(r.place)) ?? (r.kind ? BY_KIND[r.kind] : undefined) ?? RETO;
}

/** The word of a place that offers several: the first one's if they are all of the same kind, else «Retos». */
export function retosWord(rs: readonly RetoTag[]): string {
  const words = rs.map(retoWord);
  if (!words.length) return RETO;
  return words.every((w) => w === words[0]) ? words[0]! : RETOS;
}

/** A chore's word (the ships' cards, sanctuary 3's posts and field work). */
export const choreWord = (c: { readonly palabra?: string; readonly id: string; readonly kind: string; readonly title: string }): string => retoWord({ palabra: c.palabra, id: c.id, kind: c.kind, title: c.title });
