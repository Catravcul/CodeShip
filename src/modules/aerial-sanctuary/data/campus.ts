import type { Procedure } from "@modules/sanctuary-one/data/retos";
import type { RoomDef } from "./layout";

/**
 * THE CAMPUS (docs/design/montana-hueca.md §Campus; Berón 2026-11-25: «todos los Cold Sanctuary deben ofrecer los
 * mismos servicios… una residencia, un restaurante, un hospital, un área de crianza, un área de entrenamiento, de
 * estudio»). The training rooms were real but the campus around them was missing: where the crew sleeps, eats, is
 * looked after, studies, breeds its animals, grows its food and makes its parts. Each room here is the real facility
 * of its kind at the astronauts' centres (Houston, Florida, Star City), laid out by us where no plan is published.
 * Sizes are real (m); the layout widens them with the presentation scale like every training room.
 */
export const CAMPUS_SRC = {
  crewQuarters: "NASA, «Astronaut Crew Quarters» (Neil Armstrong O&C, Kennedy): dormitorios, cocina, comedor, sala de ejercicio y consulta médica para la cuarentena antes del vuelo: https://www.nasa.gov/image-article/astronaut-crew-quarters/",
  starCity: "Ciudad de las Estrellas (Zvyozdny Gorodok): el profilactorio donde la tripulación vive y se aísla antes del vuelo, aulas de sistemas y de ruso: https://en.wikipedia.org/wiki/Star_City,_Russia",
  foodLab: "NASA JSC, Space Food Systems Laboratory: cocina de pruebas y sesiones de cata donde la tripulación puntúa cada plato de 1 a 9 (escala hedónica): https://www.nasa.gov/reference/jsc-food-nutrition/",
  starport: "NASA JSC Starport: la cafetería y los servicios del centro: https://www.nasa.gov/starport/",
  hsp: "NASA, Health Stabilization Program: la tripulación en cuarentena 14 días antes del lanzamiento; solo entran los contactos primarios, examinados por los médicos de vuelo",
  flightMed: "NASA JSC, Flight Medicine Clinic (edificio 8): médicos de vuelo, consulta, odontología y pruebas: https://en.wikipedia.org/wiki/List_of_buildings_in_the_Johnson_Space_Center",
  library: "NASA JSC, el Centro de Información Técnica (STI) y las bibliotecas de los centros; a bordo, el ODF (Operations Data File) con los procedimientos",
  flyLab: "NASA Ames, Fruit Fly Lab: Drosophila criada en cajas ventiladas con viales de comida, en la ISS y en tierra: https://www.nasa.gov/ames/space-biosciences/fruit-fly-lab/",
  bees: "Skylab 3 (1973): el experimento de las arañas y, en el STS-3 (1982), una colmena de 3 400 abejas en una caja de observación (Christian Science Monitor, 1982)",
  glovebox: "NASA, Microgravity Science Glovebox y las guanteras de los laboratorios de muestras (Lunar Sample Laboratory, JSC): las muestras se manejan con guantes en nitrógeno",
  veggie: "NASA KSC, Veggie y Advanced Plant Habitat: cojines de arcilla calcinada con abono, mechas y luz LED roja, azul y verde: https://www.nasa.gov/missions/station/iss-research/veggie/",
  aaf: "NASA y Redwire, Additive Manufacturing Facility (AMF) de la ISS: impresora 3D de plástico para piezas y herramientas desde 2016",
  astroOffice: "NASA JSC, Astronaut Office (edificio 4S): la reunión de los lunes de toda la oficina, asignaciones y novedades: https://en.wikipedia.org/wiki/List_of_buildings_in_the_Johnson_Space_Center",
} as const;

const room = (r: RoomDef): RoomDef => r;

/** The new campus rooms (their place is their tree's floor: data/montana.ts). */
export const CAMPUS_ROOMS: readonly RoomDef[] = [
  room({
    id: "residencia",
    label: "Residencia de la tripulación",
    desc: "Como las Astronaut Crew Quarters de Florida y el profilactorio de la Ciudad de las Estrellas: un dormitorio por astronauta con su cama, su escritorio y su armario, la sala común con el sofá y la tele, y la lavandería. Aquí se duerme",
    reality: "real",
    centre: { x: 0, z: 0 },
    half: { x: 14, z: 8 },
    height: 3.4,
    door: { side: "s", at: 0, width: 2.2 },
    machines: [
      { id: "residencia-cama", kind: "cama", label: "Tu cama", what: "Dormir: ocho horas en la cama de tu dormitorio, con la luz apagada y la habitación fresca", x: -11.6, z: 5.6, via: [{ x: 0, z: -5.4 }, { x: -11.6, z: -5.4 }] },
      { id: "residencia-sueno", kind: "servicio", label: "Preparar el descanso", what: "La rutina de sueño de la tripulación antes de un vuelo", x: 6, z: -3, reto: "sueno" },
    ],
  }),
  room({
    id: "restaurante",
    label: "Restaurante y laboratorio de alimentos",
    desc: "La cocina y el comedor de la tripulación, y junto a ellos el laboratorio de alimentos espaciales de Houston: su cocina de pruebas, las bolsas de comida y la mesa de las catas donde cada plato se puntúa de 1 a 9. Aquí se come",
    reality: "real",
    centre: { x: 0, z: 0 },
    half: { x: 14, z: 9 },
    height: 4,
    door: { side: "s", at: -4, width: 2.4 },
    machines: [
      { id: "restaurante-mesa", kind: "comedor", label: "Mesa del comedor", what: "Comer: la comida del día en la mesa de la tripulación", x: -5, z: 1.2, via: [{ x: -4, z: -6 }] },
      { id: "restaurante-cata", kind: "servicio", label: "Mesa de catas", what: "Una sesión de cata del laboratorio de alimentos espaciales", x: 8, z: 1.4, reto: "cata", via: [{ x: -4, z: -6 }, { x: 8, z: -6 }] },
    ],
  }),
  room({
    id: "clinica",
    label: "Clínica de medicina de vuelo",
    desc: "La consulta de los médicos de vuelo, con su camilla, el gabinete de odontología y las dos habitaciones de la cuarentena de estabilización: 14 días antes del lanzamiento, solo los contactos primarios",
    reality: "real",
    centre: { x: 0, z: 0 },
    half: { x: 12, z: 8 },
    height: 3.4,
    door: { side: "n", at: 0, width: 2.4 },
    machines: [{ id: "clinica-cuarentena", kind: "servicio", label: "Cuarentena", what: "Entrar en la cuarentena de estabilización sanitaria antes de un vuelo", x: 0, z: 0, reto: "cuarentena" }],
  }),
  room({
    id: "aulas",
    label: "Aulas",
    desc: "Las aulas de la formación: clases de los sistemas de la nave y de la estación con sus diagramas, y las de idiomas (en la Ciudad de las Estrellas todos aprenden ruso)",
    reality: "real",
    centre: { x: 0, z: 0 },
    half: { x: 10, z: 7 },
    height: 3.4,
    door: { side: "w", at: 0, width: 2 },
    machines: [{ id: "aulas-clase", kind: "servicio", label: "Clase de sistemas", what: "Una clase del sistema de soporte vital de la estación", x: 0, z: -3, reto: "clase" }],
  }),
  room({
    id: "biblioteca",
    label: "Biblioteca",
    desc: "Estanterías de los manuales, mesas de estudio y los puestos para consultar los procedimientos de a bordo, como el centro de información técnica de Houston",
    reality: "real",
    centre: { x: 0, z: 0 },
    half: { x: 9, z: 7 },
    height: 4.2,
    door: { side: "e", at: 0, width: 2 },
    machines: [{ id: "biblioteca-estudio", kind: "servicio", label: "Mesa de estudio", what: "Estudiar un procedimiento del ODF antes de hacerlo", x: 0, z: 0, reto: "procedimiento" }],
  }),
  room({
    id: "laboratorio",
    label: "Laboratorio de muestras",
    desc: "Las guanteras de nitrógeno donde se abren y se pesan las muestras (como las de rocas lunares de Houston), la balanza, el microscopio y el frigorífico de −80 °C",
    reality: "real",
    centre: { x: 0, z: 0 },
    half: { x: 10, z: 7 },
    height: 3.6,
    door: { side: "w", at: 0, width: 2 },
    machines: [{ id: "laboratorio-guantera", kind: "servicio", label: "Guantera", what: "Abrir una muestra en la guantera sin contaminarla", x: 4, z: 4.9, reto: "guantera" }],
  }),
  room({
    id: "crianza",
    label: "Criadero de insectos gigantes",
    desc: "Donde se crían y se domestican los insectos gigantes de la montaña (Berón 2026-11-28: «el criadero será para domesticar a estos insectos gigantes»): el insectario con sus cajas ventiladas y viales, como el laboratorio de moscas de Ames, y la colmena de observación con su ventana, como la que voló en el transbordador en 1982. Las crías se acostumbran a la gente antes de salir a la nave",
    reality: "real",
    centre: { x: 0, z: 0 },
    half: { x: 10, z: 7 },
    height: 3.6,
    door: { side: "e", at: 0, width: 2 },
    machines: [
      { id: "crianza-moscas", kind: "servicio", label: "Insectario", what: "Pasar las moscas a un vial con comida nueva: así empieza la cría de las gigantes", x: -4, z: 5.1, reto: "moscas" },
      { id: "crianza-colmena", kind: "servicio", label: "Colmena de observación", what: "Revisar la colmena por su ventana: las abejas se acostumbran a la gente", x: 5, z: -5.4, reto: "colmena" },
    ],
  }),
  room({
    id: "huerto",
    label: "Huerto de cultivo",
    desc: "Las cámaras de cultivo como Veggie y el Advanced Plant Habitat de Florida: lechugas en cojines de arcilla con luz LED roja, azul y verde, y las estanterías de cultivo del huerto del campus",
    reality: "real",
    centre: { x: 0, z: 0 },
    half: { x: 12, z: 8 },
    height: 4,
    door: { side: "s", at: 0, width: 2.4 },
    machines: [{ id: "huerto-veggie", kind: "servicio", label: "Cámara Veggie", what: "Plantar un cojín de lechuga en la cámara", x: -6, z: 6.3, reto: "veggie" }],
  }),
  room({
    id: "taller",
    label: "Taller de prototipos",
    desc: "El taller donde se hacen las piezas y las herramientas: torno, fresadora, banco de trabajo y la impresora 3D como la de la estación",
    reality: "real",
    centre: { x: 0, z: 0 },
    half: { x: 12, z: 8 },
    height: 5,
    door: { side: "n", at: 0, width: 3 },
    machines: [{ id: "taller-impresora", kind: "servicio", label: "Impresora 3D", what: "Imprimir una pieza de repuesto", x: 7, z: -6.1, reto: "impresora" }],
  }),
  room({
    id: "asambleas",
    label: "Sala de asambleas",
    desc: "La sala de la Oficina de Astronautas: la reunión de los lunes con toda la oficina, las asignaciones de vuelo y las novedades de cada equipo",
    reality: "real",
    centre: { x: 0, z: 0 },
    half: { x: 9, z: 6 },
    height: 3.6,
    door: { side: "s", at: 0, width: 2 },
    machines: [{ id: "asambleas-reunion", kind: "servicio", label: "Reunión de la oficina", what: "La reunión de los lunes de la Oficina de Astronautas", x: 0, z: 1.2, reto: "reunion" }],
  }),
];

const r = (q: Omit<Procedure, "reality"> & { reality?: Procedure["reality"] }): Procedure => ({ reality: "real", ...q });

/**
 * The campus's challenges: real procedures, one step at a time (same shape as sanctuary 1's, data/retos.ts); in
 * sanctuary 3 each is traced as its compound (docs/design/retos-trazos.md).
 */
export const CAMPUS_RETOS: Readonly<Record<string, Procedure>> = {
  sueno: r({ id: "s3-sueno", title: "Rutina de sueño de la tripulación", kind: "trabajar", reward: "salud", scenario: "Mañana hay entrenamiento temprano: toca dormir bien", steps: ["apaga las pantallas una hora antes", "deja la habitación fresca, entre 18 y 20 °C", "oscuridad total: cortinas o antifaz", "tapones si hay ruido", "a la cama a la misma hora que ayer"], wrong: ["un café para relajarse", "la tele encendida hasta dormirse", "la calefacción a 26 °C"], source: `${CAMPUS_SRC.crewQuarters}; NASA, Sleep and circadian countermeasures for flight crews` }),
  cata: r({ id: "s3-cata", title: "Sesión de cata de comida espacial", kind: "cocinar", reward: "comida", scenario: "El laboratorio de alimentos prepara el menú de la próxima misión: hay que puntuarlo", steps: ["rehidrata la bolsa con el agua que indica la etiqueta", "caliéntala en el calentador", "prueba un bocado de cada plato con agua entre uno y otro", "puntúa aspecto, color, olor, sabor y textura", "de 1 (me disgusta muchísimo) a 9 (me gusta muchísimo)", "anota qué cambiarías"], wrong: ["puntúa solo el que más te gusta", "mezcla dos platos en la misma bolsa"], source: CAMPUS_SRC.foodLab }),
  cuarentena: r({ id: "s3-cuarentena", title: "Cuarentena de estabilización sanitaria", kind: "atender-paciente", reward: "salud", scenario: "Faltan 14 días para el vuelo: empieza la cuarentena", steps: ["el médico de vuelo hace la revisión de entrada", "solo entran los contactos primarios ya examinados", "lavado de manos al entrar y al salir", "comidas preparadas para la tripulación", "cada mañana, temperatura y síntomas al médico"], wrong: ["visitas de cualquiera que esté sano", "salir a comer fuera"], source: CAMPUS_SRC.hsp }),
  clase: r({ id: "s3-clase-eclss", title: "Clase de soporte vital", kind: "trabajar", reward: "compania", scenario: "Clase de sistemas: cómo la estación mantiene el aire y el agua", steps: ["el Elektron o el OGS saca oxígeno del agua por electrólisis", "el CDRA retira el CO₂ con zeolitas", "el Sabatier junta CO₂ e hidrógeno y da agua y metano", "el WPA recicla la orina y el sudor en agua potable", "la alarma de CO₂ salta por encima del límite"], wrong: ["el oxígeno viene solo de las plantas", "el CO₂ se ventila por la ventana"], source: "NASA, ECLSS de la ISS: https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/" }),
  procedimiento: r({ id: "s3-odf", title: "Estudiar un procedimiento del ODF", kind: "trabajar", reward: "compania", scenario: "Antes de hacer una tarea a bordo se estudia su procedimiento", steps: ["busca el procedimiento por su número", "lee las notas, avisos y precauciones", "comprueba el material que pide", "repasa cada paso en orden", "pregunta a control lo que no esté claro"], wrong: ["empieza por el último paso", "sáltate los avisos"], source: CAMPUS_SRC.library }),
  guantera: r({ id: "s3-guantera", title: "Abrir una muestra en la guantera", kind: "procesar", reward: "salud", scenario: "Ha llegado una muestra de roca: se abre sin contaminarla", steps: ["comprueba que la guantera está llena de nitrógeno seco", "mete la muestra por la antecámara y purga", "ponte los guantes de la guantera", "abre el envase con las pinzas de acero inoxidable", "pésala y fotografíala", "guárdala en su bolsa de teflón con su etiqueta"], wrong: ["ábrela en la mesa para verla mejor", "tócala con los dedos"], source: CAMPUS_SRC.glovebox }),
  moscas: r({ id: "s3-moscas", title: "Pasar las moscas a un vial nuevo", kind: "alimentar-animal", reward: "compania", scenario: "Los viales de las moscas de la fruta tienen la comida vieja", steps: ["prepara viales con comida nueva de levadura y harina de maíz", "golpea el vial viejo contra la mesa para que bajen", "pásalas al vial nuevo de un movimiento", "tapa con el algodón", "etiqueta la cepa y la fecha", "deja el vial a 25 °C"], wrong: ["ábrelo en el aire y espera a que vuelen", "tapa con plástico sin aire"], source: CAMPUS_SRC.flyLab }),
  colmena: r({ id: "s3-colmena", title: "Revisar la colmena de observación", kind: "alimentar-animal", reward: "compania", scenario: "La colmena de la ventana: hay que ver si la reina está bien", steps: ["busca a la reina por su punto de color", "mira si hay huevos en las celdas", "mira las celdas de larvas y de pupas operculadas", "comprueba la miel y el polen almacenados", "anota el estado en el registro"], wrong: ["abre la colmena de golpe para ver mejor", "golpea el cristal"], source: CAMPUS_SRC.bees }),
  veggie: r({ id: "s3-veggie", title: "Plantar un cojín en Veggie", kind: "regar", reward: "comida", scenario: "Toca una tanda nueva de lechugas en la cámara", steps: ["coloca el cojín de arcilla calcinada con su abono", "mete la semilla en la mecha del cojín", "conecta el cojín a la bolsa de agua", "enciende las luces LED roja, azul y verde", "riega cada día según la sonda de humedad", "a los 33 días, cosecha"], wrong: ["entierra la semilla a un palmo", "deja la cámara a oscuras"], source: CAMPUS_SRC.veggie }),
  impresora: r({ id: "s3-impresora", title: "Imprimir una pieza de repuesto", kind: "trabajar", reward: "fuerza", scenario: "Se ha roto un soporte: se imprime en el taller", steps: ["abre el modelo de la pieza aprobado", "comprueba el filamento y la boquilla", "calienta la base y la boquilla", "imprime capa a capa", "deja enfriar y quita el soporte", "mide la pieza con el calibre"], wrong: ["imprime sin calentar la base", "sácala caliente"], source: CAMPUS_SRC.aaf }),
  reunion: r({ id: "s3-reunion", title: "La reunión de los lunes", kind: "trabajar", reward: "compania", scenario: "Lunes por la mañana en la Oficina de Astronautas", steps: ["llega a la hora", "cada equipo cuenta sus novedades", "el jefe de la oficina da las asignaciones", "anota tus tareas de la semana", "pregunta lo que no esté claro"], wrong: ["llega a mitad", "no apuntes nada"], source: CAMPUS_SRC.astroOffice }),
};

/** The campus audit (docs/design/montana-hueca.md §Campus): each service every sanctuary offers, and where it is here. */
export const CAMPUS_SERVICES: readonly { service: string; rooms: readonly string[] }[] = [
  { service: "Residencia (dormir)", rooms: ["residencia"] },
  { service: "Restaurante (comer)", rooms: ["restaurante"] },
  { service: "Hospital", rooms: ["clinica", "medico"] },
  { service: "Crianza", rooms: ["crianza"] },
  { service: "Entrenamiento", rooms: ["nbl", "centrifuga", "svmf", "gimnasio", "supervivencia", "simulador-dragon", "simulador-lm", "robotica", "trajes", "control"] },
  { service: "Estudio", rooms: ["aulas", "biblioteca"] },
  { service: "Ciencias", rooms: ["laboratorio"] },
  { service: "Campos (cultivo)", rooms: ["huerto"] },
  { service: "Producción", rooms: ["taller"] },
  { service: "Asambleas", rooms: ["asambleas"] },
];

/**
 * WHERE EACH CAMPUS SERVICE IS SINCE 2026-11-28 (Berón: «tomar los de sanctuary1 y migrarlos tal cual dentro de la
 * montaña»): sanctuary 1's buildings stand in the hall with their floors furnished as there, so each service of the
 * campus is done on the floor of sanctuary 1 that does it, at its own piece of furniture (a bunk of the Residencia's
 * crown, a table of the restaurant's ring…), not in a room of its own. Each machine of the room it stood in (its id,
 * kind and challenge, CAMPUS_ROOMS) goes to the model named here on that floor (data/montana.ts finds it, the way to it
 * and where she stands). The giant insects' breeding room and the training rooms stay sanctuary 3's own floors.
 */
export const CAMPUS_IN_S1: Readonly<Record<string, { readonly area: string; readonly at: Readonly<Record<string, string>> }>> = {
  residencia: { area: "ciencias:cima", at: { "residencia-cama": "res-habitacion-1", "residencia-sueno": "res-habitacion-2" } },
  restaurante: { area: "servicios:piso-1:anillo", at: { "restaurante-mesa": "comedor-mesa", "restaurante-cata": "comedor-mesa" } },
  clinica: { area: "servicios:piso-2", at: { "clinica-cuarentena": "hospital-aislamiento" } },
  aulas: { area: "ciencias:cima", at: { "aulas-clase": "aula-pared-pizarra" } },
  biblioteca: { area: "ciencias:cima", at: { "biblioteca-estudio": "aula-biblioteca" } },
  laboratorio: { area: "ciencias:piso-1", at: { "laboratorio-guantera": "q-guantes" } },
  huerto: { area: "produccion:piso-3", at: { "huerto-veggie": "vf-rack" } },
  taller: { area: "produccion:piso-2", at: { "taller-impresora": "mec-banco" } },
  asambleas: { area: "servicios:piso-5", at: { "asambleas-reunion": "asamblea-mesa-comision" } },
};
