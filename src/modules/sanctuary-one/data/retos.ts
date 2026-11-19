/**
 * The work of sanctuary 1, as code challenges (docs/design/santuario1.md §Retos; Berón 2026-11-18 and 11-19):
 * every machine, plant, animal and room offers a real procedure, one challenge per step. A step written
 * `… {right|wrong|wrong} unit` asks for the real value. Each procedure keeps its source and its reality label;
 * the animals' minds are the sanctuary's magic (reglas.md §1.2), marked «ficción».
 *
 * The reward is one of the four Berón asked for: «no pasar hambre» (comida), «compañía», «fuerza» and «salud».
 */
export type Reward = "comida" | "compania" | "fuerza" | "salud";
export type Reality = "real" | "ficción";
/** The board's kind of the challenge (chores/domain/chore.ts ChoreKind). */
export type RetoKind = "ejercicio" | "cocinar" | "procesar" | "regar" | "cosechar" | "alimentar-animal" | "programar-animal" | "atender-paciente" | "limpiar" | "trabajar";

export interface Procedure {
  readonly id: string;
  readonly title: string;
  /** Why now, in one line. */
  readonly scenario: string;
  readonly steps: readonly string[];
  /** Plausible wrong steps (common mistakes), offered among the options. */
  readonly wrong: readonly string[];
  readonly kind: RetoKind;
  readonly reward: Reward;
  readonly reality: Reality;
  readonly source: string;
}

const NSCA = "NSCA, Essentials of Strength Training and Conditioning, 4.ª ed. (2016), cap. 15: técnica de ejercicios";
const ACSM = "ACSM's Guidelines for Exercise Testing and Prescription, 11.ª ed. (2021): calentamiento, intensidad y vuelta a la calma";
const CDC_CLEAN = "CDC y ICAN, Best Practices for Environmental Cleaning in Healthcare Facilities (2019)";
const WHO_HANDS = "OMS, Guidelines on Hand Hygiene in Health Care (2009): lavado de 40–60 s";

const p = (id: string, title: string, kind: RetoKind, reward: Reward, scenario: string, steps: readonly string[], wrong: readonly string[], source: string, reality: Reality = "real"): Procedure => ({ id, title, kind, reward, scenario, steps, wrong, source, reality });

// --- The gym (Entrenamiento) -----------------------------------------------------------------------------------------
export const GYM = {
  placas: p("gym-maquina-placas", "Una serie en máquina de placas", "ejercicio", "fuerza", "Toca entrenamiento: una serie bien hecha vale más que tres torcidas", [
    "ajusta el asiento: la articulación que trabaja, en línea con el eje de la máquina",
    "elige la carga: el pasador en una placa que permita {10|25|3} repeticiones limpias",
    "colócate con la espalda apoyada en el respaldo",
    "haz el esfuerzo exhalando (empujar o tirar), sin bloquear la articulación al final",
    "vuelve en {2|0|8} segundos, controlando las placas sin que choquen",
    "termina la serie y deja el pasador en la placa más ligera",
  ], ["deja caer las placas de golpe", "aguanta la respiración toda la serie", "pon el pasador a medias"], NSCA),
  pesoLibre: p("gym-peso-libre", "Sentadilla en la jaula", "ejercicio", "fuerza", "La barra está en la jaula: sentadilla con seguridad", [
    "pon los topes de seguridad justo por debajo de tu punto más bajo",
    "carga los discos por igual a cada lado y cierra los collarines",
    "colócate bajo la barra, apoyada en los trapecios, y sácala con dos pasos atrás",
    "pies a la anchura de los hombros, puntas un poco hacia fuera",
    "baja con la espalda neutra hasta que el muslo quede paralelo al suelo",
    "sube empujando el suelo y exhala al pasar el punto difícil",
    "devuelve la barra a los ganchos caminando hacia delante",
  ], ["carga un solo lado de la barra", "quita los topes para ir más rápido", "redondea la espalda al bajar"], NSCA),
  pressBanca: p("gym-press-banca", "Press de banca con topes", "ejercicio", "fuerza", "La barra está en los ganchos del banco", [
    "pon los topes de seguridad a la altura del pecho",
    "túmbate con los ojos bajo la barra y los pies firmes en el suelo",
    "agarra la barra algo más abierta que los hombros y sácala con los brazos estirados",
    "baja hasta rozar el pecho, codos a unos {45|90|10} grados del cuerpo",
    "empuja hacia arriba exhalando, sin despegar la cadera",
    "devuelve la barra a los ganchos",
  ], ["rebota la barra en el pecho", "entrena sin topes ni ayudante"], NSCA),
  pesoMuerto: p("gym-peso-muerto", "Peso muerto en la plataforma", "ejercicio", "fuerza", "La barra está cargada en la plataforma", [
    "colócate con la barra sobre el centro del pie",
    "agarra la barra con los brazos por fuera de las rodillas",
    "baja la cadera, pecho arriba y espalda neutra",
    "sube empujando el suelo, la barra rozando las piernas",
    "bloquea arriba con la cadera, sin echarte atrás",
    "baja la barra controlando hasta la plataforma",
  ], ["tira con la espalda redondeada", "aleja la barra de las piernas"], NSCA),
  mancuernas: p("gym-mancuernas", "Curl y press con mancuernas", "ejercicio", "fuerza", "Un par de mancuernas del estante", [
    "elige un par que permita {10|25|2} repeticiones limpias",
    "de pie, codos pegados al cuerpo, sube las mancuernas doblando los codos",
    "baja despacio hasta estirar los brazos",
    "siéntate en el banco y empuja las mancuernas por encima de la cabeza",
    "devuelve las mancuernas a su sitio del estante",
  ], ["balancea el cuerpo para subirlas", "deja las mancuernas en el suelo"], NSCA),
  cardio: p("gym-cardio", "Sesión de cardio", "ejercicio", "fuerza", "Media hora para el corazón y los pulmones", [
    "calienta {5|0|30} minutos a ritmo suave",
    "sube a ritmo moderado: puedes hablar, pero no cantar",
    "mantén el ritmo {20|2|90} minutos",
    "vuelve a la calma bajando el ritmo poco a poco",
    "limpia el agarre y el asiento con el pulverizador",
  ], ["para en seco a ritmo máximo", "empieza al máximo sin calentar"], ACSM),
  zonaLibre: p("gym-zona-libre", "Core y estiramientos en la esterilla", "ejercicio", "fuerza", "Abdominales y espalda, sin máquinas", [
    "extiende la esterilla en un hueco libre",
    "plancha frontal de {30|5|300} segundos con el cuerpo en línea",
    "puente de glúteos: sube la cadera sin arquear la lumbar",
    "bird-dog: brazo y pierna contrarios, despacio",
    "estira cuádriceps, isquios y espalda {30|3|180} segundos cada uno",
    "enrolla la esterilla y devuélvela a la estantería",
  ], ["rebota al estirar", "haz cien abdominales tirando del cuello"], "McGill, Low Back Disorders, 3.ª ed. (2015): los tres grandes; ACSM (2021): estiramientos de 10–30 s"),
  calistenia: p("gym-calistenia", "Dominadas en la barra", "ejercicio", "fuerza", "Tu propio peso es la máquina", [
    "agarra la barra con las palmas hacia delante, algo más abiertas que los hombros",
    "cuelga con los brazos estirados y activa los hombros, bajándolos",
    "sube hasta que la barbilla pase la barra",
    "baja controlando hasta estirar los brazos",
    "si no llegas, usa la goma o la barra baja para dominadas australianas",
  ], ["balancéate para subir", "suéltate arriba de la barra"], NSCA),
  parkour: p("gym-parkour", "Salto de precisión", "ejercicio", "fuerza", "Del cajón al bloque, aterrizando en silencio", [
    "mira el punto de aterrizaje y mide la distancia con la vista",
    "flexiona rodillas y cadera y lleva los brazos atrás",
    "salta empujando con los dos pies a la vez y lanzando los brazos",
    "aterriza con la punta de los pies primero, encima del borde",
    "amortigua flexionando tobillos, rodillas y cadera sin pasar de la vertical",
  ], ["aterriza con los talones y las piernas rectas", "salta sin mirar dónde caes"], "Parkour UK, Coaching Award Level 1: precision jump y aterrizaje"),
  crossfit: p("gym-crossfit", "Empuje de trineo", "ejercicio", "fuerza", "El trineo espera al final de la pista de césped", [
    "carga los discos en el trineo y comprueba que la pista está libre",
    "agarra los postes con los brazos estirados y el cuerpo inclinado a {45|90|10} grados",
    "empuja con pasos cortos y potentes, de la punta del pie",
    "mantén la espalda neutra hasta el final de la pista",
    "descarga los discos y devuélvelos a su estante",
  ], ["empuja con los brazos doblados y la espalda curvada"], "NSCA, Developing Agility and Quickness (2018): sled push"),
  aseoGym: p("gym-limpiar-maquina", "Limpiar la máquina después de usarla", "limpiar", "salud", "Hay sudor en el asiento y en los agarres", [
    "pulveriza la toalla, no la máquina",
    "limpia agarres, asiento y respaldo, de lo más limpio a lo más sucio",
    "deja actuar el desinfectante el tiempo de su etiqueta",
    "seca y deja la toalla en el cesto",
  ], ["pulveriza sobre la pantalla", "usa la misma toalla para el suelo"], CDC_CLEAN),
} as const;

// --- Yoga and the dojo (yogaChore covers the sequences; this is the room) -------------------------------------------
export const SALA_YOGA = p("yoga-preparar-sala", "Preparar la sala de yoga", "limpiar", "salud", "La clase empieza en un rato", [
    "barre el suelo y ventila la sala",
    "extiende las esterillas en filas, a {1|0|5} m entre ellas",
    "deja un bloque, una manta y un cinturón junto a cada esterilla",
    "enciende la lámpara de aceite en la tarima del maestro",
    "comprueba que el agua del kund está limpia",
  ], ["amontona las esterillas en una esquina", "cierra todas las ventanas sin ventilar"], "Iyengar, Light on Yoga (1966): práctica en un suelo limpio y ventilado; las medidas de la sala, nuestras", "real");

// --- The kitchen (Servicios): the restaurant's own productions ------------------------------------------------------
export const COCINA = {
  pan: p("cocina-pan-masa-madre", "Pan de masa madre", "procesar", "comida", "La panadería: hogazas para el día", [
    "refresca la masa madre y espera a que doble su volumen",
    "mezcla harina y agua al {70|30|120} % de hidratación y deja reposar (autólisis)",
    "añade la masa madre y la sal ({2|10|0} % del peso de la harina)",
    "pliega la masa cada media hora durante la fermentación en bloque",
    "forma las hogazas y déjalas fermentar en la fermentadora",
    "hornea en el horno de pisos a {240|120|400} °C con vapor al principio",
    "deja enfriar sobre rejilla antes de cortar",
  ], ["corta el pan recién salido del horno", "amasa con agua hirviendo"], "Hamelman, Bread: A Baker's Book of Techniques and Recipes, 3.ª ed. (2021)"),
  harina: p("cocina-harina", "Moler harina de trigo", "procesar", "comida", "Molienda: el trigo del huerto, a harina", [
    "limpia el grano: cribado y separación de piedras",
    "acondiciónalo con agua hasta un {15|5|40} % de humedad y deja reposar",
    "muele entre los rodillos o las piedras",
    "tamiza: harina blanca por un lado, salvado por el otro",
    "ensaca la harina con la fecha y guárdala en el almacén seco",
  ], ["muele el grano mojado sin reposar", "guarda la harina junto a la cámara de pescado"], "FAO, Wheat Flour Milling (2004); Posner y Hibbs, Wheat Flour Milling, 2.ª ed."),
  queso: p("cocina-queso-fresco", "Queso fresco", "procesar", "comida", "La quesería: la leche del día", [
    "pasteuriza la leche a {72|40|100} °C durante 15 segundos",
    "enfríala a {32|5|60} °C en la cuba",
    "añade el fermento y luego el cuajo, y deja cuajar unos 40 minutos",
    "corta la cuajada en cubos cuando se rompa limpia",
    "remueve despacio y desuera",
    "llena los moldes, prensa suave y sala",
    "guarda los quesos en la cámara a 4 °C",
  ], ["añade el cuajo a la leche hirviendo", "deja la leche cruda al sol"], "FAO, Milk Processing Guide Series; Kindstedt, American Farmstead Cheese (2005)"),
  kefir: p("cocina-kefir", "Kéfir de leche", "procesar", "comida", "Fermentos: los gránulos de kéfir tienen hambre", [
    "pon los gránulos en un tarro limpio de vidrio",
    "cúbrelos con leche, un gránulo por cada {10|1|100} partes de leche",
    "tapa con tela y deja fermentar a 20–25 °C unas {24|2|96} horas",
    "cuela el kéfir con un colador de plástico",
    "guarda el kéfir en la nevera y vuelve a empezar con los gránulos",
  ], ["lava los gránulos con lejía", "cierra el tarro hermético al sol"], "Rosa et al., Milk kefir: nutritional, microbiological and health benefits, Nutrition Research Reviews 30 (2017)"),
  yogur: p("cocina-yogur", "Yogur en la yogurtera", "procesar", "comida", "Fermentos: yogur para el desayuno", [
    "calienta la leche a {85|40|120} °C y mantenla unos minutos",
    "enfríala a {43|10|80} °C",
    "añade el fermento (una cucharada del yogur anterior)",
    "reparte en tarros e incúbalos de 4 a 6 horas",
    "pásalos a la nevera para cortar la fermentación",
  ], ["añade el fermento a la leche a 85 °C"], "Tamime y Robinson, Yoghurt: Science and Technology, 3.ª ed. (2007)"),
  tempeh: p("cocina-tempeh", "Tempeh de soja", "procesar", "comida", "Fermentos: la incubadora de tempeh está libre", [
    "remoja la soja una noche y quítale la piel",
    "cuécela {30|1|300} minutos y sécala bien",
    "añade un poco de vinagre y el fermento de Rhizopus",
    "aplana en bolsas perforadas",
    "incuba a {31|5|60} °C entre 24 y 36 horas hasta que el micelio blanco la una",
  ], ["incúbala en bolsas cerradas sin aire"], "Shurtleff y Aoyagi, The Book of Tempeh (1979); Nout y Kiers, J. Appl. Microbiol. 98 (2005)"),
  pasta: p("cocina-pasta", "Pasta fresca", "procesar", "comida", "La laminadora está lista", [
    "haz un volcán con la harina de sémola y casca los huevos en el centro",
    "mezcla y amasa {10|1|60} minutos hasta que quede lisa",
    "envuélvela y déjala reposar media hora",
    "pásala por la laminadora, de lo más grueso a lo más fino",
    "corta las tiras y espolvoréalas con sémola para que no se peguen",
  ], ["lamina la masa sin reposar recién mezclada"], "Hazan, Essentials of Classic Italian Cooking (1992)"),
  panela: p("cocina-panela", "Panela de caña", "procesar", "comida", "Ha llegado caña del Árbol de los Campos", [
    "muele la caña en el trapiche y cuela el jugo",
    "calienta el jugo y retira la cachaza (la espuma) con la espumadera",
    "añade un poco de cal para clarificar",
    "concentra hirviendo hasta {118|80|200} °C, cuando el punto hace hilo",
    "bate hasta que empiece a cristalizar y vierte en los moldes",
    "desmolda en frío y envuelve las panelas",
  ], ["vierte el jugo crudo en los moldes"], "FAO, Non-centrifugal sugar (panela) processing; CORPOICA, Manual de elaboración de panela (2007)"),
  recepcion: p("cocina-recepcion", "Recibir la mercancía", "trabajar", "comida", "Ha llegado el pedido del día", [
    "comprueba el albarán contra el pedido",
    "mide la temperatura: refrigerado a {4|15|-30} °C o menos",
    "rechaza lo que llegue roto, mojado o fuera de temperatura",
    "etiqueta cada caja con la fecha de llegada",
    "guarda primero lo congelado, luego lo refrigerado, luego lo seco",
  ], ["deja lo congelado en el muelle hasta la tarde"], "FDA Food Code (2022), 3-202: recepción; APPCC"),
  limpieza: p("cocina-limpieza", "Cerrar la cocina limpia", "limpiar", "salud", "Fin del servicio", [
    "retira los restos y separa la basura orgánica para el compost",
    "lava las superficies con agua caliente y detergente",
    "aclara y aplica el desinfectante el tiempo de su etiqueta",
    "lava y desinfecta las tablas de corte por colores",
    "friega el suelo de lo más limpio a la salida",
  ], ["desinfecta sin lavar antes la grasa", "usa la tabla de carne para la verdura"], "FDA Food Code (2022), 4-6: limpieza y desinfección"),
} as const;

// --- Hospital and veterinary --------------------------------------------------------------------------------------
export const SALUD = {
  constantes: p("hospital-constantes", "Tomar las constantes (NEWS2)", "atender-paciente", "salud", "Ronda de la mañana en la sala", [
    "lávate las manos {40|5|300} segundos con agua y jabón",
    "preséntate y explica lo que vas a hacer",
    "cuenta la frecuencia respiratoria durante un minuto",
    "mide la saturación de oxígeno con el pulsioxímetro",
    "toma la tensión y el pulso",
    "mide la temperatura y mira si está alerta",
    "suma la puntuación NEWS2 y avisa si es de {5|1|20} o más",
  ], ["toma las constantes sin lavarte las manos", "apunta solo el pulso"], "Royal College of Physicians, National Early Warning Score (NEWS) 2 (2017); " + WHO_HANDS),
  herida: p("hospital-herida", "Curar una herida", "atender-paciente", "salud", "Alguien se ha cortado en el taller", [
    "lávate las manos y ponte guantes",
    "para el sangrado apretando con una gasa limpia",
    "lava la herida con suero o agua potable abundante",
    "mira si necesita puntos: bordes separados o más de {1|10|0} cm de profundidad",
    "cubre con un apósito limpio",
    "pregunta por la vacuna del tétanos",
  ], ["echa alcohol dentro de la herida abierta", "tapa la herida sin lavarla"], "OMS, Best Practice Guidelines on Emergency Surgical Care (2005); Cruz Roja, Primeros auxilios (2020)"),
  manos: p("hospital-lavado-manos", "Lavado de manos", "limpiar", "salud", "Antes de tocar a un paciente", [
    "mójate las manos y pon jabón",
    "frota palma con palma",
    "frota el dorso con los dedos entrelazados",
    "frota los pulgares y las puntas de los dedos",
    "aclara y seca con una toalla de un solo uso",
    "cierra el grifo con la toalla",
  ], ["sécate en la bata", "aclara sin frotar"], WHO_HANDS),
  vetRevision: p("vet-revision", "Revisión veterinaria", "atender-paciente", "salud", "Un animal ha llegado a la báscula", [
    "pesa al animal en la báscula de suelo",
    "obsérvalo a distancia: respiración, postura y cómo se mueve",
    "revisa ojos, nariz, boca y piel",
    "ausculta corazón y pulmones",
    "apunta el peso y lo visto en su ficha",
    "decide: alta, observación o aislamiento",
  ], ["sácalo de la cuarentena antes de revisarlo"], "WSAVA, Global Veterinary Community: examen físico; AZA Animal Care Manuals"),
  pediluvio: p("vet-pediluvio", "Renovar el pediluvio", "limpiar", "salud", "El agua del pediluvio está turbia", [
    "vacía el pediluvio y quita el barro",
    "friega la bandeja",
    "llénalo con agua limpia y el desinfectante a su dosis",
    "cámbialo cuando se ensucie o como mucho cada {1|30|7} días",
  ], ["añade desinfectante al agua sucia sin vaciarla"], "AZA, Biosecurity Guidelines; USDA APHIS, Footbath use"),
} as const;

// --- Animals: feeding and their minds -----------------------------------------------------------------------------
export interface AnimalCare {
  readonly feed: Procedure;
  /** Writing a rule into the animal's mind (the sanctuary's magic). */
  readonly mind: Procedure;
}
const mind = (id: string, name: string, rule: string, steps: readonly string[]): Procedure =>
  p(`mente-${id}`, `Programar a ${name}: ${rule}`, "programar-animal", "compania", `Su mente admite una regla nueva`, steps, ["si (hambre) → ataca al más cercano", "olvida a su familia"], "La magia de Cold Sanctuary: las mentes de los animales se programan (reglas.md §1.2)", "ficción");

export const ANIMALES: Readonly<Record<string, AnimalCare>> = {
  oso: {
    feed: p("alimentar-oso", "Alimentar al oso polar", "alimentar-animal", "compania", "Hora de su ración", [
      "prepara la ración: pescado, carne y grasa, con suplemento de vitamina E",
      "pesa la ración: alrededor del {2|20|0} % de su peso al día",
      "reparte la comida escondida en el recinto para que la busque",
      "observa que come y cuánto deja",
      "apunta lo comido en su ficha",
    ], ["dale la comida en la mano a través de la reja"], "AZA, Polar Bear Care Manual (2009): dieta y enriquecimiento"),
    mind: mind("oso", "la osa", "respeta a las crías", ["si (ve una cría ajena) → se detiene", "olfatea a distancia", "se aparta por el otro lado", "si (la cría llora) → avisa al cuidador"]),
  },
  lobo: {
    feed: p("alimentar-lobo", "Alimentar a la manada de lobos", "alimentar-animal", "compania", "La manada ronda el comedero", [
      "prepara una pieza entera para que la manada la reparta",
      "comprueba que haya comida para todos: ración de 1,5–2 kg por lobo",
      "deja la comida y sal del recinto",
      "observa que todos coman, también el de menor rango",
    ], ["dales de comer uno a uno en la mano"], "AZA, Mexican Wolf / Canid TAG husbandry guidelines; Mech y Boitani, Wolves (2003)"),
    mind: mind("lobo", "la manada", "caza solo lo silvestre", ["si (ve un animal del santuario) → lo ignora", "sigue el rastro de la liebre silvestre", "comparte la presa con la manada"]),
  },
  zorro: {
    feed: p("alimentar-zorro", "Alimentar al zorro ártico", "alimentar-animal", "compania", "El zorro espera junto a la cresta", [
      "prepara una ración pequeña de carne, huevo y pienso",
      "escóndela en varios puntos para que la busque",
      "rellena el agua sin hielo",
      "apunta si comió todo",
    ], ["déjale la comida en un solo montón al sol"], "AZA, Small Carnivore TAG; Arctic fox husbandry"),
    mind: mind("zorro", "el zorro", "no robes huevos del nido", ["si (ve un nido) → se aleja", "busca en su escondite", "si (tiene hambre) → acude al comedero"]),
  },
  herbivoro: {
    feed: p("alimentar-herbivoro", "Alimentar a los herbívoros", "alimentar-animal", "compania", "Renos, liebres y bueyes almizcleros", [
      "llena el pesebre con heno y liquen",
      "añade el pienso en su comedero, poco a poco",
      "rompe el hielo del bebedero",
      "revisa que nadie se quede sin comer",
      "limpia los restos del día anterior",
    ], ["dales pan duro", "deja el bebedero helado"], "AZA, Ungulate TAG: reindeer and muskox husbandry"),
    mind: mind("herbivoro", "la manada", "vuelve al corral si llega la ventisca", ["si (viento fuerte) → busca a la manada", "camina hacia el corral", "se tumba al abrigo"]),
  },
  foca: {
    feed: p("alimentar-foca", "Alimentar a las focas", "alimentar-animal", "compania", "Las focas esperan en el descansadero", [
      "descongela el pescado en la nevera, no al aire",
      "añade el suplemento de tiamina y vitamina E",
      "pesa la ración: un {5|50|0} % de su peso al día",
      "dales el pescado de cabeza, uno a uno, contándolos",
      "apunta lo que comió cada una",
    ], ["descongela el pescado en agua caliente", "tira el pescado al agua sin contar"], "AZA, Pinniped Care Manual (2019): dieta y suplementos"),
    mind: mind("foca", "las focas", "deja paso a quien nada", ["si (una persona nada cerca) → se aparta", "sigue su camino por debajo", "vuelve al descansadero"]),
  },
  cetaceo: {
    feed: p("alimentar-cetaceo", "Vigilar a orcas y ballenas", "alimentar-animal", "compania", "La laguna es su casa: comen solas", [
      "sube al puesto de la orilla",
      "cuenta a los animales de la laguna",
      "mira la respiración: soplos regulares",
      "busca heridas o redes enganchadas",
      "apunta lo visto en el registro",
    ], ["tira pescado a la laguna para acercarlas"], "NOAA Fisheries, Marine Mammal Health and Stranding Response Program"),
    mind: mind("cetaceo", "la orca", "cuida de los nadadores", ["si (una persona nada) → nada a su lado", "si (se cansa) → la sostiene", "la lleva al tronco más cercano"]),
  },
  pinguino: {
    feed: p("alimentar-pinguino", "Dar de comer a los pingüinos", "alimentar-animal", "compania", "La colonia está en la orilla", [
      "descongela el pescado en la nevera",
      "añade la tiamina y la vitamina E",
      "da el pescado a mano, de uno en uno, de cabeza",
      "cuenta los peces de cada pingüino por su anilla",
      "apunta quién comió poco",
    ], ["deja un cubo de pescado para que se sirvan solos"], "AZA, Penguin Care Manual (2014): alimentación a mano y suplementos"),
    mind: mind("pinguino", "la colonia", "guarda el turno", ["si (otro pingüino come) → espera", "avanza un paso", "come su pescado"]),
  },
  ave: {
    feed: p("vigilar-petrel", "Vigilar la colonia de petreles", "alimentar-animal", "compania", "La colonia anida en el nunatak", [
      "acércate solo hasta la distancia de seguridad",
      "cuenta los nidos ocupados con los prismáticos",
      "apunta huevos y pollos a la vista",
      "aléjate sin hacer ruido",
    ], ["sube al nido para contar los huevos"], "SCAR, Code of Conduct for Wildlife Watching in the Antarctic (2021)"),
    mind: mind("petrel", "los petreles", "avisa de la ventisca", ["si (cae la presión) → grita", "vuela hacia el santuario", "se refugia en el nunatak"]),
  },
  cria: {
    feed: p("biberon-cria", "Dar el biberón a una cría", "alimentar-animal", "compania", "La pizarra de tomas dice que toca", [
      "lávate las manos en la cocina de leche",
      "prepara la fórmula de su especie a la temperatura del cuerpo",
      "pesa a la cría antes de la toma",
      "dale el biberón despacio, con la cabeza alta",
      "pésala después y apunta lo que tomó en la pizarra",
      "lava y esteriliza el biberón",
    ], ["calienta el biberón en el microondas sin mezclar", "dale la toma tumbada boca arriba"], "AZA, Hand-rearing protocols (Polar Bear Care Manual 2009, Pinniped Care Manual 2019)"),
    mind: mind("cria", "la cría", "busca a su cuidador", ["si (se pierde) → llora", "sigue la voz del cuidador", "se queda en el recinto"]),
  },
};

// --- Plants --------------------------------------------------------------------------------------------------------
export const PLANTAS = {
  regar: p("planta-regar", "Cuidar la planta", "regar", "comida", "Las hojas se ven algo lacias", [
    "mete el dedo en la tierra: riega si está seca a {3|0|30} cm",
    "riega despacio al pie hasta que salga agua por abajo",
    "quita las hojas secas o enfermas",
    "busca plagas por el envés de las hojas",
    "añade acolchado si la tierra se seca rápido",
  ], ["riega las hojas a pleno sol", "riega cada día aunque esté encharcada"], "RHS, Watering garden plants; FAO, Good Agricultural Practices for greenhouse vegetable crops (2013)"),
  frutal: p("frutal-cuidar", "Podar y cosechar el frutal", "cosechar", "comida", "El frutal de la punta tiene fruta madura", [
    "desinfecta las tijeras",
    "quita las ramas secas, enfermas o que se cruzan",
    "cosecha solo la fruta madura, girándola sin arrancar la rama",
    "riega la maceta hasta que drene",
    "abona en primavera con compost",
  ], ["poda con tijeras sucias de otra planta enferma", "arranca la fruta verde"], "RHS, Pruning fruit trees; FAO, Fruit tree management"),
  huerto: p("huerto-cosechar", "Cosechar y resembrar el bancal", "cosechar", "comida", "Hay hortalizas listas en el bancal", [
    "cosecha por la mañana, con la planta fresca",
    "corta con cuchillo limpio sin dañar la planta",
    "deja los restos sanos en el compostador",
    "afloja la tierra y añade compost",
    "siembra la siguiente hortaliza de la rotación",
  ], ["siembra lo mismo en el mismo sitio cada vez"], "FAO, Save and Grow (2011): rotación y cubierta del suelo"),
  vertical: p("vf-nutrientes", "Ajustar la solución nutritiva", "regar", "comida", "El dosificador avisa", [
    "mide la conductividad: EC entre {1,5|0,1|8} mS/cm para hoja",
    "mide el pH: entre {6|3|9}",
    "corrige el pH con la solución ácida o básica, poco a poco",
    "rellena el depósito con agua y nutriente",
    "revisa que todas las bandejas reciben riego",
  ], ["corrige el pH con vinagre del almacén a ojo"], "Resh, Hydroponic Food Production, 7.ª ed. (2012)"),
  fotobio: p("fotobio-cuidar", "Cuidado diario de los fotobiorreactores", "cosechar", "salud", "El cuadro avisa: la espirulina está densa", [
    "mira el pH del cultivo en el cuadro: entre 9,5 y {10,5|7|13}",
    "mira la temperatura: de día unos {33|15|50} °C",
    "cosecha por el filtro hasta dejarlo en {0,7|0,1|5} g/L de biomasa",
    "repone el medio con bicarbonato y nutrientes",
    "comprueba que el desgasificador saca el oxígeno y que las LED encienden",
  ], ["cosecha hasta dejar el tubo casi vacío", "abre un tubo para mirar el cultivo"], "Cold Sanctuary, docs/fotobiorreactores.md (FotobioSpec); Zarrouk (1966), medio de Arthrospira; ESA MELiSSA, compartimento IVa"),
  maleza: p("huerto-maleza", "Quitar plantas no nativas", "trabajar", "salud", "Han salido plantas no nativas en el bancal", [
    "identifica la planta con la guía antes de arrancarla",
    "arráncala con la raíz entera, antes de que eche semilla",
    "métela en una bolsa cerrada para no esparcir semillas",
    "llévala al incinerador con filtro",
    "apunta dónde salió para vigilar ese sitio",
  ], ["échala al compostador con las semillas"], "Protocolo del Tratado Antártico, anexo II (especies no nativas); CAFF, Arctic Invasive Alien Species Strategy (2017)"),
  tundra: p("tundra-observar", "Censo de flora de la tundra", "trabajar", "salud", "Toca el censo de la isla", [
    "camina solo por las piedras y el sendero",
    "marca la parcela de un metro cuadrado",
    "cuenta las plantas de cada especie: musgo, sauce, dríada, algodón",
    "fotografía la parcela",
    "apunta los datos y la fecha",
  ], ["arranca una planta para mirarla mejor"], "CAFF, Arctic Biodiversity Assessment (2013): seguimiento de flora"),
} as const;

// --- Cleaning -----------------------------------------------------------------------------------------------------
export const LIMPIEZA = {
  aseos: p("limpiar-aseos", "Limpiar los aseos", "limpiar", "salud", "Turno de limpieza", [
    "ponte guantes y coloca el cartel de suelo mojado",
    "repón papel y jabón",
    "limpia de lo más limpio a lo más sucio: lavabos, grifos, y al final inodoros",
    "deja actuar el desinfectante el tiempo de su etiqueta",
    "friega el suelo de dentro hacia la puerta",
    "quítate los guantes y lávate las manos",
  ], ["usa la misma bayeta para inodoros y lavabos", "friega hacia dentro y pisa lo fregado"], CDC_CLEAN),
  suelo: p("limpiar-suelo", "Fregar el suelo del piso", "limpiar", "salud", "El suelo tiene marcas del día", [
    "aparta lo que se pueda mover",
    "barre o aspira primero",
    "friega con detergente diluido según la etiqueta",
    "friega por zonas, de lo más lejano a la puerta",
    "pon el cartel hasta que se seque",
  ], ["friega sin barrer antes"], CDC_CLEAN),
} as const;

// --- The other floors' work ----------------------------------------------------------------------------------------
export const TRABAJO = {
  quimica: p("lab-quimica", "Trabajar en la campana de gases", "trabajar", "salud", "Una síntesis del cuaderno de laboratorio", [
    "ponte bata, gafas y guantes de nitrilo",
    "comprueba el caudal de la campana en su indicador",
    "baja la guillotina a {45|100|0} cm o menos",
    "trabaja a {15|0|60} cm o más dentro de la campana",
    "etiqueta los residuos en su bidón",
    "apunta todo en el cuaderno",
  ], ["sube la guillotina del todo para ver mejor"], "OSHA, Laboratory Safety Chemical Fume Hoods (2011); ANSI/AIHA Z9.5"),
  analisis: p("lab-analisis", "Pasar una muestra por el HPLC", "trabajar", "salud", "Una muestra espera su análisis", [
    "filtra la muestra a {0,45|10|0} µm",
    "purga la bomba y equilibra la columna con la fase móvil",
    "inyecta el patrón y comprueba el tiempo de retención",
    "inyecta la muestra",
    "integra los picos y compáralos con el patrón",
  ], ["inyecta la muestra sin filtrar"], "Snyder, Kirkland y Dolan, Introduction to Modern Liquid Chromatography, 3.ª ed. (2010)"),
  biologia: p("lab-cabina", "Trabajar en la cabina de seguridad biológica", "trabajar", "salud", "Un cultivo para pasar", [
    "enciende la cabina y deja que purgue {5|0|60} minutos",
    "limpia la superficie con etanol al 70 %",
    "mete solo lo necesario, sin tapar las rejillas",
    "trabaja despacio, en el centro de la cabina",
    "limpia otra vez al terminar y apaga",
  ], ["tapa la rejilla delantera con los papeles"], "CDC y NIH, Biosafety in Microbiological and Biomedical Laboratories, 6.ª ed. (2020), apéndice A"),
  molecular: p("lab-pcr", "Preparar una PCR", "trabajar", "salud", "El secuenciador necesita muestras", [
    "prepara la mezcla en la sala pre-PCR, nunca después",
    "añade agua, tampón, nucleótidos, cebadores y polimerasa",
    "añade el ADN de la muestra fuera de la sala limpia",
    "desnaturaliza a {95|37|150} °C",
    "repite unos {30|3|300} ciclos de desnaturalizar, unir y extender",
  ], ["prepara la mezcla junto a los productos ya amplificados"], "Green y Sambrook, Molecular Cloning, 4.ª ed. (2012)"),
  carne: p("lab-carne", "Pasar las células al biorreactor", "trabajar", "comida", "El biorreactor semilla está listo", [
    "comprueba la confluencia de las placas al microscopio",
    "despega las células con tripsina a {37|4|90} °C unos minutos",
    "neutraliza y cuéntalas",
    "siembra el biorreactor en la cabina estéril",
    "ajusta pH {7,3|5|9} y temperatura a 37 °C",
  ], ["siembra el biorreactor fuera de la cabina"], "Post et al., Scientific, sustainability and regulatory challenges of cultured meat, Nature Food 1 (2020)"),
  informatica: p("cpd-ronda", "Ronda del centro de datos", "trabajar", "salud", "Una alerta en la consola de monitorización", [
    "revisa la consola: temperatura del agua de las CDU",
    "comprueba que el agua entra a {32|80|0} °C o menos (clase W32)",
    "mira las alarmas de los discos y cambia el que esté rojo",
    "revisa la carga del SAI",
    "apunta la ronda",
  ], ["abre un rack en marcha para mirar dentro mojado"], "ASHRAE TC 9.9, Liquid Cooling Guidelines for Datacom Equipment Centers, 2.ª ed. (2014)"),
  construccion: p("obra-hormigon", "Hacer hormigón en la hormigonera", "trabajar", "fuerza", "La obra del ballet necesita hormigón", [
    "ponte casco, guantes y gafas",
    "echa agua y la grava primero, con la hormigonera girando",
    "añade el cemento y la arena: 1 de cemento, 2 de arena y 3 de grava",
    "ajusta el agua: relación agua/cemento de {0,5|2|0,1}",
    "mezcla unos {3|30|0} minutos hasta que tenga color uniforme",
    "vierte en la carretilla y limpia la hormigonera",
  ], ["echa todo el agua al final de golpe"], "Portland Cement Association, Design and Control of Concrete Mixtures, 17.ª ed. (2018)"),
  textil: p("textil-tinte", "Teñir lana con tinte natural", "trabajar", "fuerza", "La tina de tinte está lista", [
    "lava la lana con jabón neutro",
    "mordiéntala con alumbre al {12|60|0} % de su peso",
    "prepara el baño de tinte con la planta",
    "sumerge la lana y calienta a {85|100|30} °C una hora, sin hervir",
    "deja enfriar en el baño y aclara",
    "tiende la lana a la sombra",
  ], ["hierve la lana a borbotones", "pasa la lana de agua fría a caliente de golpe"], "Dean, Wild Color (2010)"),
  telar: p("textil-telar", "Tejer en el telar de pie", "trabajar", "fuerza", "Una manta a medias en el telar", [
    "comprueba que la urdimbre está tensa",
    "pisa el pedal para abrir la calada",
    "pasa la lanzadera de lado a lado",
    "aprieta la trama con el peine",
    "cambia de pedal y repite",
  ], ["aprieta antes de pasar la lanzadera"], "Chandler, Learning to Weave (2009)"),
  submarino: p("sub-inmersion", "Lista de antes de la inmersión", "trabajar", "fuerza", "El submarino de obra sale a la laguna", [
    "comprueba la carga de las baterías",
    "revisa el oxígeno y el absorbente de CO₂ para {72|1|8} horas de emergencia",
    "prueba la radio y el teléfono subacuático",
    "cierra y revisa la escotilla y la cúpula",
    "avisa a superficie y empieza a lastrar",
  ], ["sumérgete sin avisar a superficie"], "DNV, Rules for Classification: Underwater Technology (2023); IMCA, submersibles"),
  aceiteTractor: p("mec-aceite-tractor", "Cambiar el aceite del tractor", "trabajar", "fuerza", "El tractor compacto cumple sus 200 horas", [
    "calienta el motor unos minutos y apágalo en llano",
    "pon el recipiente bajo el tapón de vaciado y quítalo",
    "deja escurrir y cambia el filtro, con la junta untada de aceite nuevo",
    "pon el tapón con su arandela nueva y llena hasta la marca de la varilla",
    "arranca, busca fugas y vuelve a mirar el nivel",
    "vierte el aceite usado en su bidón del cubeto",
  ], ["tira el aceite usado por el desagüe", "llena por encima de la marca máxima"], "Kubota, manual del operador de tractores compactos (mantenimiento cada 200 h); Directiva 2008/98/CE (aceites usados)"),
  fueraborda: p("mec-fueraborda", "Lavar el fueraborda tras salir al mar", "trabajar", "salud", "La barca de trabajo vuelve del mar", [
    "lava el motor por fuera con agua dulce",
    "pon las orejeras de lavado en la toma de agua y abre el grifo",
    "arranca y deja circular agua dulce unos minutos al ralentí",
    "comprueba que sale el chorro testigo de la refrigeración",
    "revisa los ánodos de sacrificio y cambia los gastados a la mitad",
    "inclina el motor hacia arriba para guardarlo",
  ], ["arranca el motor sin agua en las orejeras"], "Yamaha y Mercury, manuales del propietario de motores fueraborda: lavado con agua dulce y ánodos"),
  guardia: p("guardia-radio", "Guardia: prueba de radio y carta de hielo", "trabajar", "salud", "Empieza tu turno de guardia", [
    "escucha el canal {16|1|99} de VHF, el de socorro",
    "haz la prueba de radio con la otra torre",
    "lee la carta de hielo del día",
    "marca los icebergs nuevos en la mesa de radar",
    "apunta el relevo en el tablero",
  ], ["usa el canal 16 para charlar"], "UIT, Reglamento de Radiocomunicaciones, apéndice 18; International Ice Patrol"),
  aula: p("aula-clase", "Dar una clase", "trabajar", "compania", "La clase de la mañana", [
    "repasa lo que vieron el día anterior",
    "explica la idea nueva con un ejemplo",
    "deja que lo prueben por parejas",
    "corrige en voz alta los errores más comunes",
    "resume y apunta lo que queda para mañana",
  ], ["dicta todo sin preguntar nada"], "Rosenshine, Principles of Instruction, American Educator (2012)"),
  musica: p("musica-ensayo", "Ensayo en la sala", "trabajar", "compania", "La banda ensaya hoy", [
    "afina con el diapasón a {440|100|1000} Hz",
    "calienta con escalas despacio",
    "toca la pieza por partes, empezando por la difícil",
    "tócala entera con el metrónomo",
    "graba el ensayo y escuchadlo juntos",
  ], ["toca la pieza entera siempre a toda velocidad"], "Ericsson et al., The role of deliberate practice, Psychological Review 100 (1993)"),
  asamblea: p("asamblea-reunion", "Moderar la asamblea", "trabajar", "compania", "Hoy hay asamblea", [
    "lee el orden del día",
    "da la palabra por turnos, con la piedra de la palabra",
    "resume cada propuesta antes de votar",
    "cuenta los votos en el marcador",
    "apunta las decisiones en el archivo de actas",
  ], ["vota antes de oír las propuestas"], "Robert's Rules of Order, 12.ª ed. (2020)"),
  descanso: p("residencia-ordenar", "Ordenar tu habitación", "limpiar", "salud", "Antes de dormir", [
    "ventila la habitación",
    "haz la cama",
    "guarda la ropa en el armario",
    "deja la esterilla estirada",
    "apaga la luz grande y deja la de la mesilla",
  ], ["deja la ropa mojada en la cama"], "CDC, Healthy Housing Reference Manual (2006); el orden, nuestro"),
} as const;
