import type { Procedure, Reality, RetoKind, Reward } from "./retos";

/**
 * EACH OBJECT ITS OWN CHALLENGE (Berón 2026-11-23: «cada instrumento parece que lleva al mismo reto de ensayo… lo
 * ideal es que cada instrumento tenga su reto propio para que el jugador aprenda de cada instrumento, y también
 * debería funcionar así con los objetos de otras áreas, como las pesas, las esterillas, la cocina»). Keyed by the
 * model it is done at: what that thing teaches, step by step, from its source. The area's shared challenges (a band
 * rehearsal, a restaurant service) belong to the simulation machine (docs/design/santuario1.md, phase 2).
 * Each step's animation is in data/animaciones.ts PROCEDURE_STEPS, one per step.
 */
const p = (id: string, title: string, kind: RetoKind, reward: Reward, scenario: string, steps: readonly string[], wrong: readonly string[], source: string, reality: Reality = "real"): Procedure => ({ id, title, kind, reward, scenario, steps, wrong, source, reality });

const NSCA = "NSCA, Essentials of Strength Training and Conditioning, 4.ª ed. (2016), cap. 15";
const ACSM = "ACSM's Guidelines for Exercise Testing and Prescription, 11.ª ed. (2021)";
const BOX = "AIBA/IBA, Coaching Manual (2015): vendaje, guardia, asaltos de 3 min con 1 de descanso";

// --- Music: each instrument -----------------------------------------------------------------------------------------
const bateria = p("musica-bateria", "Ritmo de rock en la batería", "trabajar", "compania", "La batería sostiene a la banda: hoy, el ritmo básico", [
  "ajusta el taburete: muslos un poco por encima de las rodillas",
  "toma las baquetas por un tercio desde la base, agarre igualado",
  "con el metrónomo a {80|200|20} pulsaciones, charles en corcheas",
  "bombo en los tiempos 1 y 3, caja en el 2 y el 4",
  "toca el ritmo cuatro compases seguidos y cierra con un redoble y el platillo",
], ["aprieta las baquetas con toda la mano", "toca sin metrónomo y acelera"], "Hal Leonard Drumset Method, libro 1 (2005): postura, agarre y ritmo de rock");
const guitarra = p("musica-guitarra", "Acordes de la guitarra eléctrica", "trabajar", "compania", "Tu guitarra está en el soporte, junto a su amplificador", [
  "cuélgate la guitarra con la correa y enchúfala al amplificador con el volumen a cero",
  "afina: la quinta cuerda al aire es un La de {110|440|55} Hz",
  "acorde de Mi menor: dedos 2 y 3 en el segundo traste de la quinta y cuarta cuerdas",
  "rasguea abajo en negras y luego abajo-arriba en corcheas",
  "cambia Mi menor, Do, Sol y Re sin parar el rasgueo",
], ["sube el volumen antes de enchufar", "aprieta las cuerdas lejos del traste"], "Hal Leonard Guitar Method, libro 1 (2002); afinación estándar La 440 Hz");
const bajo = p("musica-bajo", "Línea de bajo con el bombo", "trabajar", "compania", "El bajo une la batería con la armonía", [
  "cuélgate el bajo y enchúfalo al amplificador de bajo con el volumen a cero",
  "afina: la cuarta cuerda al aire es un Mi de {41|82|330} Hz",
  "pulsa con los dedos índice y medio alternando, apoyando en la cuerda de abajo",
  "toca la fundamental en negras, con el bombo de la batería",
  "pasa de Mi a La y a Si en el traste justo, sin que zumbe",
], ["pulsa siempre con el mismo dedo", "deja sonar las cuerdas que no tocas"], "Hal Leonard Bass Method, libro 1 (2008); afinación estándar del bajo (Mi1 ≈ 41,2 Hz)");
const teclado = p("musica-teclado", "Acordes y escala en el teclado", "trabajar", "compania", "El teclado de la sala está libre", [
  "siéntate con los antebrazos a la altura de las teclas y los dedos curvados",
  "escala de Do mayor con la mano derecha: el pulgar pasa por debajo tras el Mi",
  "acordes de Do, Fa y Sol con la mano izquierda, en posición fundamental",
  "junta las manos: acorde en la izquierda y melodía en la derecha",
  "toca con el pedal de sustain, levantándolo en cada cambio de acorde",
], ["toca con los dedos estirados", "deja el pedal pisado toda la pieza"], "Alfred's Basic Adult Piano Course, nivel 1 (1983)");
const voz = p("musica-voz", "Calentar la voz y cantar al micrófono", "trabajar", "compania", "Tu voz también se entrena", [
  "de pie, hombros sueltos: respira con el diafragma, el abdomen se hincha",
  "calienta con labios en vibración (brrr) subiendo y bajando suave",
  "escala de cinco notas con «mi-me-ma-mo-mu»",
  "pon el micrófono a un palmo de la boca, ligeramente por debajo",
  "canta la estrofa sin forzar y bebe agua entre tomas",
], ["grita para calentar", "pega los labios a la rejilla del micrófono"], "Titze, Principles of Voice Production (1994); Shure, Microphone Techniques for Live Sound (2014)");
const mesa = p("musica-mesa", "Prueba de sonido en la mesa", "trabajar", "compania", "Antes de tocar, cada canal en su sitio", [
  "enciende primero la mesa y después los altavoces",
  "canal por canal, sube la ganancia hasta que los picos queden a {-18|0|-60} dBFS",
  "ecualiza: quita graves a las voces con el filtro paso alto",
  "ajusta los monitores: que cada músico se oiga a sí mismo",
  "al terminar, baja los altavoces antes de apagar la mesa",
], ["apaga la mesa con los altavoces encendidos", "sube la ganancia hasta que se encienda el piloto rojo"], "Davis y Jones, The Sound Reinforcement Handbook, 2.ª ed. (1989)");

// --- The dojo: each bag and mat -------------------------------------------------------------------------------------
const saco = p("dojo-saco-pesado", "Asaltos al saco pesado", "ejercicio", "fuerza", "El saco está libre: tres asaltos", [
  "véndate las manos y ponte los guantes",
  "calienta a la comba {3|0|30} minutos",
  "ponte en guardia a un brazo del saco",
  "asaltos de 3 minutos golpeando el saco con directos y crochets, girando la cadera",
  "descansa 1 minuto entre asaltos con la guardia abajo, respirando",
  "estira hombros y muñecas y guarda guantes y vendas",
], ["golpea con la muñeca doblada", "pega al saco sin vendas"], BOX);
const pera = p("dojo-pera-rapida", "Ritmo en la pera loca", "ejercicio", "fuerza", "La pera entrena el ritmo y los hombros", [
  "ponte los guantes ligeros de pera",
  "ajusta la plataforma: la pera a la altura de tu boca",
  "golpea con el lateral del puño y deja que rebote tres veces",
  "alterna las manos en ritmo de tres tiempos durante {2|20|0} minutos",
  "baja los brazos y sacude los hombros entre series",
], ["golpea la pera desde abajo con todo el brazo", "pon la pera por encima de la cabeza"], BOX);
const makiwara = p("dojo-makiwara-zuki", "Choku-zuki en la makiwara", "ejercicio", "fuerza", "La makiwara enseña a alinear el puño", [
  "saluda al dojo con una inclinación (rei)",
  "colócate en zenkutsu-dachi a un brazo de la makiwara",
  "golpea con los dos primeros nudillos, la muñeca recta, retirando el otro puño a la cadera",
  "empieza con golpes suaves: {20|200|2} por mano",
  "revisa los nudillos y estira las muñecas",
], ["golpea con toda la fuerza el primer día", "dobla la muñeca al golpear"], "Funakoshi, Karate-dō Kyōhan (1935): makiwara y choku-zuki");
const judo = p("dojo-judo-ukemi", "Caídas y entradas en el tatami de judo", "ejercicio", "fuerza", "En judo se aprende primero a caer", [
  "saluda al entrar en el tatami (ritsu-rei)",
  "ushiro-ukemi: cae hacia atrás con la barbilla al pecho y palmea el tatami",
  "yoko-ukemi: cae de lado palmeando con el brazo a 45°",
  "uchi-komi: repite la entrada de o-goshi {10|100|1} veces con tu compañera",
  "saluda al salir del tatami",
], ["cae apoyando la mano estirada", "aguanta la respiración al caer"], "Kano, Kodokan Judo (1986): ukemi y uchi-komi");
const ring = p("dojo-ring-sombra", "Sombra y patadas en el ring", "ejercicio", "fuerza", "El ring de kickboxing está libre", [
  "entra al ring por entre las cuerdas y ponte la guardia",
  "boxeo de sombra: directos y desplazamientos {3|30|0} minutos",
  "patada circular: gira el pie de apoyo y golpea con la tibia",
  "combina directo, crochet y patada sin perder la guardia",
  "vuelve a la calma andando por el ring y estira las caderas",
], ["levanta la pierna sin girar el pie de apoyo", "baja las manos al patear"], "WAKO, Rules and Coaching Guidelines (2023): técnica de kickboxing");
const mma = p("dojo-jaula-derribo", "Derribo y control en la jaula", "ejercicio", "fuerza", "Trabajo de lucha contra la valla", [
  "ponte espinilleras, protector bucal y guantes de MMA",
  "nivel bajo: dobla las rodillas para bajar la cadera",
  "entrada de doble pierna: paso de penetración con la rodilla al suelo",
  "sprawl: echa las piernas atrás y la cadera al suelo si te entran",
  "levántate en base y vuelve a la guardia",
], ["agacha la cabeza mirando al suelo al entrar", "cruza los pies al moverte"], "UFC Performance Institute, Fundamentals of MMA (2018); USA Wrestling, Coaching Manual");
const grappling = p("dojo-grappling-gamba", "Movilidad de suelo en el tatami", "ejercicio", "fuerza", "El suelo se aprende moviendo la cadera", [
  "túmbate boca arriba con las rodillas dobladas",
  "gamba: apoya un pie, empuja y saca la cadera hacia atrás",
  "puente: sube la cadera alto y gira sobre el hombro",
  "levántate técnico: una mano y un pie en el suelo, la otra mano protegiendo",
  "repite la secuencia {5|50|1} veces por lado",
], ["empuja con las manos en lugar de la cadera", "levántate de frente sin proteger la cara"], "Gracie y Gracie, Brazilian Jiu-Jitsu: Theory and Technique (2001)");

// --- Gym: the free weights, the mats and each cardio machine --------------------------------------------------------
const smith = p("gym-smith-sentadilla", "Sentadilla en la máquina Smith", "ejercicio", "fuerza", "La Smith guía la barra en vertical", [
  "pon los topes de la guía justo debajo de tu punto más bajo",
  "colócate bajo la barra con los pies algo adelantados",
  "gira la barra para soltarla de los ganchos",
  "baja hasta muslos paralelos con la espalda neutra",
  "sube y gira la barra para engancharla en el gancho más cercano",
], ["suelta la barra sin topes", "pon los pies justo debajo de la barra"], NSCA);
const discos = p("gym-discos-orden", "Cargar y descargar discos", "ejercicio", "fuerza", "Una barra con discos hay que cargarla y dejarla bien", [
  "agáchate con la espalda recta y coge el disco por el agarre con las dos manos",
  "carga los discos grandes primero, por igual a cada lado",
  "cierra los collarines contra los discos",
  "al terminar, descarga un lado y luego el otro, alternando",
  "devuelve cada disco a su pivote por peso",
], ["descarga un lado entero y luego el otro", "coge el disco con una mano por el borde"], NSCA);
const barras = p("gym-barras-elegir", "Elegir y llevar la barra", "ejercicio", "fuerza", "Cada ejercicio con su barra", [
  "elige la barra: olímpica de {20|5|50} kg, femenina de 15 kg o barra Z",
  "sácala del soporte por el centro, con las dos manos",
  "llévala vertical o horizontal sin golpear a nadie",
  "déjala en los ganchos de la jaula o del banco",
  "al terminar, devuélvela a su soporte",
], ["arrastra la barra por el suelo", "déjala apoyada en la pared"], NSCA);
const esterilla = p("gym-esterilla-core", "Abdominales en la esterilla", "ejercicio", "fuerza", "El core se trabaja sin prisa", [
  "extiende la esterilla en un hueco libre",
  "crunch: sube los hombros sin tirar del cuello",
  "plancha frontal de {30|5|300} segundos con el cuerpo en línea",
  "plancha lateral sobre el antebrazo, cada lado",
  "estira la espalda en postura del niño y enrolla la esterilla",
], ["haz el crunch tirando de la cabeza con las manos", "hunde la cadera en la plancha"], "McGill, Low Back Disorders, 3.ª ed. (2015)");
const bandas = p("gym-bandas", "Hombros con banda elástica", "ejercicio", "fuerza", "Las bandas de la estantería, para los hombros", [
  "elige una banda por su color (resistencia)",
  "separa la banda a la altura del pecho juntando las escápulas",
  "rotación externa con el codo pegado al cuerpo",
  "{15|150|1} repeticiones por ejercicio, despacio",
  "cuelga la banda en su gancho de la estantería",
], ["suelta la banda de golpe", "eleva los hombros hacia las orejas"], "Andersen et al., J Strength Cond Res 24 (2010): bandas elásticas y fuerza");
const lsit = p("cal-l-sit", "L-sit en las paralelas bajas", "ejercicio", "fuerza", "Las paralelas bajas, para el core y los brazos", [
  "apoya las manos en las paralelas bajas con los brazos estirados",
  "deprime los hombros: empújalos hacia abajo",
  "sube las rodillas recogidas (tuck) y aguanta",
  "estira las piernas al frente en L, {10|100|1} segundos",
  "baja controlando y descansa",
], ["hunde la cabeza entre los hombros", "dobla los codos"], "Low, Overcoming Gravity, 2.ª ed. (2016)");
const cardio = (id: string, title: string, scenario: string, steps: readonly string[], wrong: readonly string[], source = ACSM) => p(id, title, "ejercicio", "fuerza", scenario, steps, wrong, source);
const cinta = cardio("gym-cinta-carrera", "Carrera en la cinta", "La cinta, con la pinza de seguridad", [
  "engancha la pinza de seguridad a la ropa",
  "arranca a paso de {5|25|1} km/h para calentar",
  "corre a ritmo conversacional con la pendiente al 1 %",
  "baja a paso de marcha antes de parar",
  "limpia los pasamanos y la pantalla",
], ["salta de la cinta en marcha", "corre agarrada a los pasamanos"]);
const eliptica = cardio("gym-eliptica-sesion", "Sesión en la elíptica", "La elíptica cuida las rodillas", [
  "sube por detrás agarrando los manillares fijos",
  "elige resistencia y pedalea sin despegar los talones",
  "empuja y tira de los brazos móviles con la zancada",
  "mantén {20|2|90} minutos a ritmo moderado",
  "baja la resistencia para volver a la calma y limpia los agarres",
], ["inclínate sobre la consola", "pedalea de puntillas"]);
const bici = cardio("gym-bici-spinning", "Clase de spinning", "La bici de spinning se ajusta a tu cuerpo", [
  "ajusta el sillín a la altura de la cadera, de pie junto a la bici",
  "ajusta el manillar a la altura del sillín",
  "pedalea sentada a {80|200|20} pedaladas por minuto",
  "sube la resistencia y pedalea de pie en la cuesta",
  "baja la resistencia, vuelve a la calma y limpia la bici",
], ["pedalea de pie sin resistencia", "pon el sillín tan bajo que la rodilla suba al pecho"], "Mello y Faria, «Indoor cycling», ACSM Health & Fitness Journal (2010)");
const reclinada = cardio("gym-bici-reclinada-sesion", "Pedaleo en la bici reclinada", "La reclinada descarga la espalda", [
  "desliza el asiento hasta que la rodilla quede algo doblada con el pedal adelante",
  "apoya la espalda en el respaldo",
  "pedalea a resistencia moderada {20|2|90} minutos",
  "baja la resistencia al final",
  "limpia el asiento y los agarres",
], ["estira la rodilla del todo", "despega la espalda del respaldo"]);
const escaladora = cardio("gym-escaladora-sesion", "Subir escalones en la escaladora", "Subir escaleras sin escalera", [
  "sube agarrada a los pasamanos y elige el ritmo bajo",
  "pisa el escalón entero, no solo con la punta",
  "sube con el tronco recto, sin apoyar el peso en los brazos",
  "mantén {10|1|60} minutos y sube el ritmo poco a poco",
  "baja el ritmo hasta parar y limpia los pasamanos",
], ["cuélgate de los pasamanos", "sube de puntillas"]);
const remo = cardio("gym-remo-tecnica", "Técnica de remo ergómetro", "El remo es piernas, tronco y brazos", [
  "ajusta los pies: la correa sobre la parte más ancha",
  "toma: piernas dobladas, tronco adelante, brazos estirados",
  "empuja con las piernas, luego el tronco atrás, luego los brazos al abdomen",
  "vuelve en orden inverso: brazos, tronco, piernas",
  "rema a {20|60|5} paladas por minuto",
], ["tira con los brazos antes que con las piernas", "encorva la espalda en la toma"], "Concept2, Indoor Rowing Technique (2020)");
const assault = cardio("gym-assault-intervalos", "Intervalos en la assault bike", "La assault bike trabaja brazos y piernas", [
  "ajusta el sillín a la altura de la cadera",
  "calienta {3|0|30} minutos suave",
  "sprint de 20 segundos empujando y tirando de los brazos",
  "recupera 40 segundos pedaleando suave",
  "repite y termina con 3 minutos suaves",
], ["empieza con un sprint sin calentar", "suelta los brazos en el sprint"]);
const skierg = cardio("gym-skierg-tecnica", "Técnica de SkiErg", "Como el esquí de fondo, de pie", [
  "de pie frente a la máquina, agarra las asas por encima de la cabeza",
  "tira hacia abajo doblando la cadera y las rodillas a la vez",
  "termina con las manos junto a los muslos",
  "vuelve arriba estirándote, con los brazos rectos",
  "mantén {30|5|120} paladas por minuto",
], ["tira solo con los brazos", "redondea la espalda abajo"], "Concept2, SkiErg Technique (2020)");

// --- The weight-stack machines: each with its own cue ---------------------------------------------------------------
const placa = (id: string, title: string, seat: string, cue: string, wrong: string) =>
  p(id, title, "ejercicio", "fuerza", "Una serie bien hecha vale más que tres torcidas", [
    seat,
    "elige la carga: el pasador en una placa que permita {10|25|3} repeticiones limpias",
    cue,
    "vuelve en {2|0|8} segundos, controlando las placas sin que choquen",
    "termina la serie y deja el pasador en la placa más ligera",
  ], [wrong, "deja caer las placas de golpe"], NSCA);
const pressPecho = placa("gym-press-pecho-serie", "Press de pecho en máquina", "ajusta el asiento: los agarres a la altura del pecho", "empuja los agarres al frente exhalando, sin bloquear los codos", "arquea la espalda separándola del respaldo");
const pressHombros = placa("gym-press-hombros-serie", "Press de hombros en máquina", "ajusta el asiento: los agarres a la altura de los hombros", "empuja por encima de la cabeza sin arquear la lumbar", "echa la cabeza adelante al empujar");
const jalon = placa("gym-jalon-serie", "Jalón al pecho", "ajusta el rodillo sobre los muslos", "tira de la barra hasta el pecho llevando los codos abajo y atrás", "tira de la barra por detrás de la nuca");
const remoSentado = placa("gym-remo-serie", "Remo sentado", "ajusta el apoyo del pecho para llegar a los agarres con los brazos estirados", "tira hacia el abdomen juntando las escápulas", "balancea el tronco para mover el peso");
const prensa = placa("gym-prensa-serie", "Prensa de piernas", "ajusta el respaldo: las rodillas a 90° al bajar", "empuja la plataforma con todo el pie sin bloquear las rodillas", "despega la cadera del asiento al bajar");
const extension = placa("gym-extension-serie", "Extensión de cuádriceps", "alinea la rodilla con el eje de la máquina y el rodillo sobre los tobillos", "estira las rodillas levantando el rodillo, sin dar patadas", "da tirones para subir el peso");
const femoral = placa("gym-femoral-serie", "Curl femoral tumbado", "túmbate boca abajo con la rodilla en el eje y el rodillo sobre los talones", "lleva los talones hacia los glúteos sin levantar la cadera", "levanta la cadera del banco");
const hipThrust = placa("gym-hip-thrust-serie", "Hip thrust en máquina", "apoya la parte alta de la espalda en el respaldo y el cinturón sobre la cadera", "sube la cadera hasta alinearla con el tronco, apretando los glúteos", "arquea la lumbar arriba");
const gemelos = placa("gym-gemelos-serie", "Gemelos sentado", "pon las almohadillas sobre los muslos y la punta de los pies en el escalón", "sube los talones todo lo que puedas y baja hasta estirar", "rebota abajo");
const curlBiceps = placa("gym-curl-biceps-serie", "Curl de bíceps en máquina", "ajusta el asiento: la axila sobre el borde del apoyo", "dobla los codos sin despegarlos del apoyo", "levanta los codos del apoyo");

// --- The kitchen: each station ----------------------------------------------------------------------------------------
const FOOD = "FDA Food Code (2022); Escuela de Hostelería, Técnicas culinarias (Paraninfo, 2019)";
const k = (id: string, title: string, scenario: string, steps: readonly string[], wrong: readonly string[], reward: Reward = "comida") => p(id, title, "cocinar", reward, scenario, steps, wrong, FOOD);
const prepVerdura = k("cocina-cortar-verdura", "Cortar verdura en la tabla verde", "La tabla verde es solo para verdura", [
  "lava las verduras bajo el grifo",
  "pon la tabla verde sobre un paño húmedo para que no resbale",
  "corta en juliana con la mano en garra, los nudillos guiando el cuchillo",
  "pasa la verdura cortada a una gastronorm con su etiqueta y fecha",
  "lava y desinfecta la tabla y el cuchillo",
], ["corta la verdura en la tabla roja", "corta con los dedos estirados"]);
const prepCarne = k("cocina-preparar-carne", "Preparar la carne cultivada", "La carne cultivada llega del laboratorio", [
  "lávate las manos y ponte guantes",
  "saca la carne de la cámara justo antes, a menos de {4|20|-30} °C",
  "córtala en la tabla roja, separada de la verdura",
  "porciona en raciones de 120 g en la báscula",
  "guarda lo que no uses tapado y etiquetado, y desinfecta la tabla",
], ["deja la carne fuera de la cámara toda la mañana", "corta la carne en la tabla de verdura"]);
const servicio = k("cocina-pase-servicio", "Servir en el pase", "El pase es donde sale cada plato", [
  "comprueba la comanda: mesa y platos",
  "revisa el plato: temperatura, limpieza del borde y guarnición",
  "llama al camarero de la mesa",
  "entrega el plato por la izquierda del comensal",
  "tacha la comanda servida",
], ["saca el plato con el borde manchado", "sirve antes de comprobar la comanda"], "salud");
const emplatado = k("cocina-emplatar", "Emplatar", "La mesa de emplatado, con los platos calientes", [
  "templa los platos",
  "pon la guarnición en la base",
  "coloca la pieza principal encima, a las seis del plato",
  "salsea con la cuchara, sin manchar el borde",
  "limpia el borde con un paño antes de pasarlo al pase",
], ["emplata en platos fríos", "llena el plato hasta el borde"]);
const mise = k("cocina-mise-en-place", "Mise en place", "Antes del servicio, todo en su sitio", [
  "lee las recetas del día y apunta lo que necesitas",
  "saca los ingredientes de la cámara y la despensa",
  "pésalos en la báscula en sus recipientes",
  "ordénalos en la encimera por el orden en que se usan",
  "tapa y etiqueta lo que espere",
], ["empieza a cocinar sin sacar nada", "deja los ingredientes destapados"]);
const inventario = k("cocina-inventario", "Inventario de la estantería", "Cada semana se cuenta lo que hay", [
  "cuenta las unidades de cada estante",
  "revisa fechas: lo que caduca antes, delante (FIFO)",
  "aparta lo caducado o dañado",
  "anota lo que falta en la lista de pedido",
  "limpia el estante vacío antes de reponer",
], ["pon lo nuevo delante de lo viejo", "deja lo caducado en el estante"], "salud");

/** The own challenge of each model (model id → procedure). */
export const OBJETO: Readonly<Record<string, Procedure>> = {
  "mus-bateria": bateria,
  "mus-ampli-guitarra": guitarra,
  "mus-ampli-bajo": bajo,
  "mus-teclado": teclado,
  "mus-microfonos": voz,
  "mus-pa-ensayo": mesa,
  "dojo-sacos": saco,
  "gym-portico-sacos": saco,
  "dojo-pera": pera,
  "dojo-makiwara": makiwara,
  "dojo-tatami-judo": judo,
  "dojo-ring": ring,
  "dojo-jaula-mma": mma,
  "dojo-tatami": grappling,
  "dojo-tatami-grappling": grappling,
  "gym-smith": smith,
  "gym-arbol-discos": discos,
  "gym-soporte-barras": barras,
  "gym-esterilla": esterilla,
  "gym-estanteria-material": bandas,
  "cal-paralelas-bajas": lsit,
  "gym-cinta": cinta,
  "gym-eliptica": eliptica,
  "gym-bici": bici,
  "gym-bici-reclinada": reclinada,
  "gym-escaladora": escaladora,
  "gym-remo-ergometro": remo,
  "gym-assault-bike": assault,
  "gym-skierg": skierg,
  "gym-press-pecho": pressPecho,
  "gym-press-hombros": pressHombros,
  "gym-jalon": jalon,
  "gym-remo": remoSentado,
  "gym-prensa": prensa,
  "gym-extension": extension,
  "gym-curl-femoral": femoral,
  "gym-hip-thrust": hipThrust,
  "gym-gemelos": gemelos,
  "gym-curl-biceps": curlBiceps,
  "cocina-prep-verdura": prepVerdura,
  "cocina-prep-carne": prepCarne,
  "cocina-barra-servicio": servicio,
  "cocina-mesa-emplatado": emplatado,
  "cocina-encimera-ingredientes": mise,
  "cocina-estanteria": inventario,
};
