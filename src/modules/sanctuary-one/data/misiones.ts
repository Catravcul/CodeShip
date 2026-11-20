/**
 * The workday's missions of sanctuary 1 (docs/design/misiones-y-jornada.md §3): Cold Sanctuary's
 * `AreaFunctions.SanctuaryMissions()` (its ids, titles and hours), each done with the challenge of a machine of its
 * floor (application/challenges.ts). `model` is that machine; `reto` which of its challenges (0 the first);
 * `floor` the floor plan it is on (site.ts `furnish`) or, for a ring, its area id, so «Ir» takes her there.
 *
 * `category` is Berón's list (2026-11-18): cocinar, yoga, ejercicio, alimentar animales, programar mentes, campo,
 * curar personas, curar animales, plantas de los edificios, limpieza; plus comer and the other floors' work.
 */
export type MissionCategory = "Comer" | "Cocinar" | "Yoga" | "Ejercicio" | "Alimentar animales" | "Programar mentes" | "Campo" | "Curar personas" | "Curar animales" | "Plantas" | "Limpieza" | "Trabajo";

export interface Mission {
  /** Cold Sanctuary's id (AreaFunctions.cs) where it has one; ours start with «s1_». */
  readonly id: string;
  readonly title: string;
  readonly category: MissionCategory;
  /** Hours it takes in Cold Sanctuary's workday. */
  readonly hours: number;
  /** In Cold Sanctuary, a task someone must do every day. */
  readonly mandatory: boolean;
  readonly floor: string;
  readonly model: string;
  readonly reto?: number;
  /** A training block's mission (8–9 and 14–15), not a task block's. */
  readonly training?: boolean;
}

const M = (id: string, title: string, category: MissionCategory, hours: number, mandatory: boolean, floor: string, model: string, reto = 0, training = false): Mission => ({ id, title, category, hours, mandatory, floor, model, reto, ...(training ? { training } : {}) });

export const MISSIONS: readonly Mission[] = [
  // Eating (the workday's breakfast and lunch) and the kitchen.
  M("s1_comer", "Comer en el restaurante", "Comer", 1, true, "servicios:piso-1:anillo", "comedor-mesa"),
  M("coc_servicio", "Servicio del restaurante (cocinar la carta)", "Cocinar", 2, true, "restaurante", "cocina-puesto"),
  M("coc_obrador", "Elaboraciones del obrador: pan", "Cocinar", 2, false, "restaurante", "cocina-panaderia"),
  M("s1_queso", "Elaboraciones del obrador: queso fresco", "Cocinar", 2, false, "restaurante", "cocina-queseria"),
  M("s1_kefir", "Elaboraciones del obrador: kéfir", "Cocinar", 1, false, "restaurante", "cocina-fermentos"),
  M("s1_harina", "Elaboraciones del obrador: moler harina", "Cocinar", 1, false, "restaurante", "cocina-molienda"),
  M("coc_limpieza", "Limpieza e inventario de la cocina", "Limpieza", 1, true, "restaurante", "cocina-puesto", 1),
  // Training (the 8–9 and 14–15 blocks).
  M("s1_fuerza", "Entrenamiento de fuerza (máquinas de placas)", "Ejercicio", 1, true, "gimnasio-0", "gym-prensa", 0, true),
  M("s1_peso_libre", "Entrenamiento de fuerza (sentadilla en la jaula)", "Ejercicio", 1, true, "gimnasio-0", "gym-jaula", 0, true),
  M("s1_cardio", "Cardio en la cinta", "Ejercicio", 1, true, "cardio", "gym-cinta", 0, true),
  M("s1_calistenia", "Calistenia: dominadas", "Ejercicio", 1, true, "calistenia", "cal-dominadas", 0, true),
  M("s1_parkour", "Parkour: saltos de precisión", "Ejercicio", 1, false, "calistenia", "pk-bloques", 0, true),
  M("yog_practica", "Clase de Hatha: practicar", "Yoga", 1, true, "yoga-hatha-1", "yoga-esterilla", 0, true),
  M("yog_ashtanga", "Clase de Ashtanga: practicar", "Yoga", 1, false, "yoga-ashtanga-1", "yoga-esterilla", 0, true),
  M("gym_limpieza", "Limpieza del gimnasio", "Limpieza", 0.5, false, "gimnasio-0", "gym-prensa", 1),
  M("yog_sala", "Preparar y limpiar las salas de yoga", "Limpieza", 1, false, "yoga-hatha-1", "yoga-suelo-madera"),
  // Animals.
  M("cri_tomas", "Tomas y pesaje de las crías (anotar en la pizarra)", "Alimentar animales", 1, true, "cria", "cria-cocina-leche"),
  M("s1_dietas", "Preparar las dietas de focas y pingüinos", "Alimentar animales", 1, true, "hospital-veterinario", "vet-dietas"),
  M("cri_vinculo", "Programar la mente de una cría (su vínculo)", "Programar mentes", 2, false, "cria", "osezno", 1),
  M("s1_mente_foca", "Programar la mente de una cría de foca", "Programar mentes", 1, false, "cria", "cria-foca", 1),
  M("hos_veterinaria", "Hospital veterinario: consulta de animales", "Curar animales", 2, false, "hospital-veterinario", "vet-bascula"),
  M("s1_pediluvio", "Renovar el pediluvio del veterinario", "Curar animales", 0.5, false, "hospital-veterinario", "vet-pediluvio"),
  // People.
  M("enf_visita", "Pasar visita en las salas de camas", "Curar personas", 2, true, "servicios:piso-2:anillo", "hospital-cama"),
  M("hos_urgencias", "Guardia de urgencias (curas)", "Curar personas", 2, true, "hospital-urgencias", "hospital-camilla", 1),
  // The fields and the buildings' plants.
  M("hue_riego", "Riego y cuidado del huerto", "Campo", 2, true, "campos-huerto", "cultivo-alto", 1),
  M("hue_cosecha", "Cosecha para la cocina", "Campo", 1, false, "campos-huerto", "cultivo-alto"),
  M("s1_bosque", "Podar y cosechar el bosque comestible", "Campo", 1, false, "campos-bosque-1", "planta-arbolito"),
  M("huv_solucion", "Huerto vertical: medir la solución nutritiva", "Plantas", 0.5, false, "huerto-vertical-1", "vf-dosificador"),
  M("s1_plantas", "Cuidar las plantas de la sala de asambleas", "Plantas", 0.5, false, "asambleas", "asamblea-arbol"),
  // Cleaning.
  M("coc_comedor", "Limpieza del comedor y de los aseos", "Limpieza", 1, true, "servicios:piso-1:anillo", "aseos-3"),
  // The other floors' work.
  M("lab_biorreactor", "Carne cultivada: pasar las células al biorreactor", "Trabajo", 1, true, "carne-cultivada", "lab-biorreactor-semilla"),
  M("qui_sintesis", "Síntesis en la campana", "Trabajo", 1, false, "quimica-sintesis", "q-campana"),
  M("bio_pcr", "Del ADN a la secuencia: preparar una PCR", "Trabajo", 1, false, "biologia-molecular", "b-termociclador"),
  M("ifo_refrigeracion", "Ronda del centro de datos", "Trabajo", 1, false, "informatica", "i-intercambiador"),
  M("tex_tejer", "Tejer y teñir", "Trabajo", 2, false, "textil", "tex-tina"),
  M("gua_sala", "Turno en la sala de guardia", "Trabajo", 2, true, "guardia", "guardia-radio"),
  M("aul_clase", "Dar o recibir una clase en el aula", "Trabajo", 1, false, "aula-matematicas", "aula-mesa-profesor"),
  M("son_ensayo", "Preparar y ensayar el concierto de la semana", "Trabajo", 1, false, "musica-ensayo", "mus-bateria"),
  M("asa_orden", "Moderar la asamblea", "Trabajo", 1, false, "asambleas", "asamblea-centro"),
  M("con_almacen", "Obra: hacer hormigón", "Trabajo", 1, false, "construccion", "cons-hormigonera"),
];

export const MISSIONS_SOURCE = "Cold Sanctuary, Assets/Scripts/Progression/AreaFunctions.cs (SanctuaryMissions) y WorkdayDirector.cs (horario)";
