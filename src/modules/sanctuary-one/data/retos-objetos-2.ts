import type { StepAnimation } from "./animaciones";
import type { Procedure, Reality, RetoKind, Reward } from "./retos";

/**
 * EACH OBJECT ITS OWN CHALLENGE, second batch (Berón 2026-11-23 18:33: «sigue con los retos propios»): the hospital,
 * the veterinary hospital and the guard room. Same pattern as data/retos-objetos.ts: what that thing teaches, step by
 * step, from its source, with the animation of each step next to it (merged into data/animaciones.ts PROCEDURE_STEPS).
 */
type Paso = readonly [text: string, anim: StepAnimation];

const PROCS: Procedure[] = [];
const ANIMS: Record<string, readonly StepAnimation[]> = {};
function q(id: string, title: string, kind: RetoKind, reward: Reward, scenario: string, steps: readonly Paso[], wrong: readonly string[], source: string, reality: Reality = "real"): Procedure {
  const proc: Procedure = { id, title, kind, reward, scenario, steps: steps.map((s) => s[0]), wrong, source, reality };
  PROCS.push(proc);
  ANIMS[id] = steps.map((s) => s[1]);
  return proc;
}

const OMS_MANOS = "OMS, Directrices sobre higiene de las manos en la atención sanitaria (2009): los cinco momentos";
const ERC = "European Resuscitation Council, Guidelines 2021: soporte vital (30:2, 100–120 compresiones/min, 5–6 cm)";
const CDC_EPI = "CDC, Sequence for Putting On and Removing Personal Protective Equipment (2014)";
const WHO_SURG = "OMS, Lista de verificación de la seguridad de la cirugía (2009)";

// --- Hospital ------------------------------------------------------------------------------------------------------
export const OBJETO_2: Record<string, Procedure> = {
  "hospital-silla-examen": q("hosp-exploracion", "Explorar en la silla de examen", "trabajar", "salud", "Una paciente se sienta para que la explores", [
    ["preséntate, di tu nombre y pide permiso para explorar", "pedir"],
    ["lávate las manos antes de tocarla", "limpiar"],
    ["mira, palpa, percute y ausculta, en ese orden", "mirar"],
    ["explica lo que has encontrado con palabras sencillas", "pedir"],
    ["lávate las manos después", "limpiar"],
  ], ["ausculta sin lavarte las manos", "explora sin explicar nada"], `Bates, Guía de exploración física e historia clínica, 13.ª ed. (2021); ${OMS_MANOS}`),
  "hospital-camilla": q("hosp-camilla", "Pasar a un paciente a la camilla", "trabajar", "salud", "Hay que pasar a un paciente de la silla de ruedas a la camilla", [
    ["frena la silla y la camilla y ponlas a la misma altura", "ajustar"],
    ["explícale el movimiento y cuenta con su ayuda", "pedir"],
    ["con la tabla de transferencia, deslízalo sin levantarlo a pulso", "empujar-trineo"],
    ["sube las barandillas y comprueba que está cómodo", "ajustar"],
  ], ["levántalo a pulso con la espalda doblada", "deja la camilla sin frenar"], "NHS, Safer Handling of People (2018): transferencias con tabla y camas frenadas"),
  "hospital-botiquin": q("hosp-herida", "Curar una herida con el botiquín", "trabajar", "salud", "Alguien se ha cortado en la mano con un cuchillo", [
    ["ponte guantes", "guantes"],
    ["aprieta la herida con una gasa limpia para parar la sangre", "tomar"],
    ["lava la herida con agua limpia", "limpiar"],
    ["tápala con un apósito estéril", "tomar"],
    ["si no deja de sangrar en {10|60|1} minutos o es profunda, que la vea el médico", "mirar"],
  ], ["echa alcohol dentro de la herida", "quita la gasa cada poco a mirar"], "Cruz Roja, Manual de primeros auxilios (2021): heridas y hemorragias"),
  "hospital-lavabotas": q("hosp-lavabotas", "Limpiar las botas al salir", "limpiar", "salud", "Sales de una zona sucia con botas de agua", [
    ["entra en la cubeta del lavabotas", "agacharse"],
    ["cepilla la suela y los lados con el agua y el desinfectante", "limpiar"],
    ["deja actuar el desinfectante el tiempo que marca la etiqueta", "mirar"],
    ["sécalas y guárdalas en el lado limpio", "tomar"],
  ], ["sal al pasillo limpio con las botas sucias", "aclara antes de que actúe el desinfectante"], "OMS, Infection prevention and control (2016): separación de zonas sucia y limpia"),
  "hospital-laboratorio": q("hosp-muestra", "Recibir una muestra en el laboratorio", "trabajar", "salud", "Llega un tubo de sangre al laboratorio", [
    ["comprueba que el tubo lleva nombre, fecha de nacimiento y número de historia", "mirar"],
    ["compáralo con la petición: tienen que coincidir", "mirar"],
    ["registra la hora de llegada", "tomar"],
    ["centrífuga o refrigera según la prueba", "ajustar"],
  ], ["analiza un tubo sin etiqueta y ya se sabrá de quién es", "deja el tubo al sol en la ventana"], "ISO 15189:2022, Laboratorios clínicos: fase preanalítica e identificación de muestras"),
  "hospital-analizador": q("hosp-analizador", "Pasar los controles del analizador", "trabajar", "salud", "Antes de analizar las muestras del día hay que fiarse del aparato", [
    ["pasa el control normal y el control patológico", "ajustar"],
    ["mira si caen dentro de {2|5|10} desviaciones típicas de su media", "mirar"],
    ["si uno sale fuera, no informes resultados: busca la causa", "mirar"],
    ["con los controles bien, pasa las muestras", "ajustar"],
  ], ["informa los resultados aunque falle el control", "pasa los controles una vez al mes"], "Westgard, J. O., Basic QC Practices, 4.ª ed. (2016): reglas de control 1-2s y 1-3s"),
  "hospital-banco-sangre": q("hosp-transfusion", "Comprobar una transfusión", "trabajar", "salud", "Hay que poner una bolsa de sangre a un paciente", [
    ["pregúntale su nombre y su fecha de nacimiento, no se los digas tú", "pedir"],
    ["compara la pulsera con la etiqueta de la bolsa", "mirar"],
    ["comprueba el grupo, la caducidad y que la bolsa no tenga fugas", "mirar"],
    ["toma las constantes antes y a los {15|60|120} minutos de empezar", "mirar"],
    ["si tiene fiebre, escalofríos o le falta el aire, para la transfusión", "ajustar"],
  ], ["pon la bolsa porque es la habitación correcta", "calienta la bolsa en el microondas"], "British Society for Haematology, Guideline on the administration of blood components (2017)"),
  "hospital-mesa-medico": q("hosp-nota", "Escribir la nota clínica", "trabajar", "salud", "Terminas de ver a un paciente y queda escribirlo", [
    ["S: lo que cuenta el paciente", "tomar"],
    ["O: lo que exploras y mides", "tomar"],
    ["A: tu valoración", "mirar"],
    ["P: el plan, con fecha y tu nombre", "tomar"],
  ], ["escribe solo «paciente bien»", "copia la nota de ayer sin verlo"], "Weed, L. L., «Medical records that guide and teach», NEJM 278 (1968): la nota SOAP"),
  "hospital-consulta": q("hosp-anamnesis", "Hacer la entrevista clínica", "trabajar", "salud", "Entra alguien a la consulta: «me duele el pecho»", [
    ["deja que lo cuente sin interrumpir", "respirar"],
    ["pregunta desde cuándo, dónde, cómo es y qué lo mejora o empeora", "pedir"],
    ["pregunta por sus enfermedades, medicinas y alergias", "pedir"],
    ["resume lo que has entendido y pregunta si es así", "pedir"],
  ], ["interrumpe a los pocos segundos", "receta antes de preguntar"], "Silverman, Kurtz y Draper, Skills for Communicating with Patients, 3.ª ed. (2013): guía Calgary-Cambridge"),
  "hospital-telemedicina": q("hosp-telemedicina", "Consulta por videollamada", "trabajar", "salud", "Una cuidadora de la estación del sur llama por vídeo", [
    ["comprueba quién es y dónde está el paciente", "mirar"],
    ["pide su consentimiento para la videollamada", "pedir"],
    ["pide que acerque la cámara a lo que hay que ver", "pedir"],
    ["di qué hacer y cuándo volver a llamar o venir", "pedir"],
  ], ["empieza sin saber dónde está el paciente", "graba la llamada sin decirlo"], "OMS, Consolidated telemedicine implementation guide (2022)"),
  "hospital-carro-parada": q("hosp-rcp", "Reanimación con el carro de parada", "trabajar", "salud", "Alguien se desploma en el pasillo y no respira con normalidad", [
    ["pide ayuda y que traigan el carro con el desfibrilador", "pedir"],
    ["empieza las compresiones en el centro del pecho, a {100|60|200} por minuto", "agacharse"],
    ["30 compresiones y 2 ventilaciones con la bolsa", "agacharse"],
    ["pon los parches y sigue lo que diga el desfibrilador", "tomar"],
    ["nadie toca al paciente durante la descarga", "mirar"],
  ], ["espera a que llegue el médico para empezar", "compresiones suaves para no hacer daño"], ERC),
  "hospital-aislamiento": q("hosp-aislamiento", "Entrar en una habitación de aislamiento", "trabajar", "salud", "En la habitación hay un paciente con tuberculosis", [
    ["comprueba que la presión de la habitación es negativa", "mirar"],
    ["ponte la mascarilla FFP2 y comprueba que ajusta", "ajustar"],
    ["entra y cierra la puerta detrás de ti", "tomar"],
    ["al salir, quítate la mascarilla fuera y lávate las manos", "limpiar"],
  ], ["deja la puerta abierta para ventilar", "usa una mascarilla quirúrgica"], "CDC, Guidelines for Environmental Infection Control (2003): salas de aislamiento con presión negativa y ≥12 renovaciones por hora"),
  "hospital-epi": q("hosp-epi", "Ponerse y quitarse el equipo de protección", "trabajar", "salud", "Vas a atender a un paciente con una infección contagiosa", [
    ["ponte la bata", "tomar"],
    ["ponte la mascarilla", "ajustar"],
    ["ponte las gafas o la pantalla", "ajustar"],
    ["ponte los guantes por encima de los puños de la bata", "guantes"],
    ["al salir, quítate primero los guantes, lo más sucio", "guantes"],
  ], ["quítate la mascarilla antes que los guantes", "tócate la cara con los guantes puestos"], CDC_EPI),
  "hospital-espera": q("hosp-espera", "Atender la sala de espera", "trabajar", "compania", "La sala de espera está llena y alguien lleva mucho rato", [
    ["saluda y explica por qué hay espera", "pedir"],
    ["pregunta si ha empeorado desde el triaje", "pedir"],
    ["si ha empeorado, avisa para volver a valorarle", "pedir"],
    ["ofrece agua o una manta si se puede", "servir"],
  ], ["di que espere sin más", "pásale delante de otros más graves porque protesta"], "Manchester Triage Group, Emergency Triage, 3.ª ed. (2014): la revaloración en la espera"),
  "hospital-farmacia": q("hosp-farmacia", "Preparar una medicación", "trabajar", "salud", "Hay que dar a un paciente su antibiótico", [
    ["paciente correcto", "mirar"],
    ["medicamento correcto", "mirar"],
    ["dosis correcta", "mirar"],
    ["vía correcta", "mirar"],
    ["hora correcta, y anótalo al darlo", "tomar"],
  ], ["da el medicamento de la caja que se parece", "anótalo antes de darlo"], "ISMP, Los «cinco correctos» de la administración de medicamentos"),
  "hospital-paritorio": q("hosp-parto", "Ayudar en el parto", "trabajar", "salud", "Una mujer da a luz en el paritorio", [
    ["lávate las manos y prepara el material limpio", "limpiar"],
    ["al nacer, seca al bebé y ponlo piel con piel con su madre", "tomar"],
    ["espera al menos {1|0|10} minuto para pinzar el cordón", "mirar"],
    ["comprueba que el bebé respira y llora", "mirar"],
    ["ayuda a empezar el pecho en la primera hora", "pedir"],
  ], ["corta el cordón nada más nacer", "lleva al bebé a otra sala a pesarlo enseguida"], "OMS, Lista de verificación para un parto seguro (2015); OMS, pinzamiento tardío del cordón (2014)"),
  "hospital-quirofano": q("hosp-quirofano", "La pausa quirúrgica", "trabajar", "salud", "Todo listo para operar: antes del bisturí, la pausa", [
    ["todos dicen su nombre y su papel", "pedir"],
    ["se confirma el paciente, el lugar y la operación", "mirar"],
    ["se revisa si hay alergias y si se dio el antibiótico", "mirar"],
    ["solo entonces empieza la incisión", "cortar"],
  ], ["empieza y ya se confirmará después", "salta la pausa si hay prisa"], WHO_SURG),
  "hospital-lavado-quirurgico": q("hosp-lavado", "Lavado quirúrgico de manos", "limpiar", "salud", "Te preparas para entrar a operar", [
    ["quítate anillos y reloj", "tomar"],
    ["frota con solución alcohólica de las uñas a los codos", "limpiar"],
    ["mantén las manos por encima de los codos", "estirar"],
    ["frota durante el tiempo que indica el fabricante, unos {3|1|10} minutos", "limpiar"],
  ], ["sécate con la bata", "deja las manos colgando"], `${OMS_MANOS} (lavado quirúrgico)`),
  "hospital-autoclave": q("hosp-autoclave", "Esterilizar en el autoclave", "trabajar", "salud", "Hay que esterilizar el instrumental de la mañana", [
    ["limpia y seca el instrumental antes", "limpiar"],
    ["empaqueta y pon el indicador químico", "tomar"],
    ["carga sin apretar para que entre el vapor", "ajustar"],
    ["programa {134|100|60} °C durante al menos 3 minutos", "ajustar"],
    ["comprueba que el indicador ha virado antes de guardar", "mirar"],
  ], ["esteriliza el instrumental con sangre seca", "guarda los paquetes húmedos"], "OMS/OPS, Decontamination and Reprocessing of Medical Devices (2016)"),
  "hospital-planta-oxigeno": q("hosp-oxigeno", "Revisar la planta de oxígeno", "trabajar", "salud", "La planta PSA saca oxígeno del aire", [
    ["mira la pureza: debe estar en {93|50|21} % más o menos 3", "mirar"],
    ["mira la presión de salida a la red", "mirar"],
    ["comprueba que las botellas de reserva están llenas", "mirar"],
    ["anota los valores en el registro", "tomar"],
  ], ["fuma cerca para ver si funciona", "ignora la alarma de baja pureza"], "OMS, Technical specifications for PSA oxygen plants (2020)"),
  "hospital-uci": q("hosp-uci", "Revisar a un paciente de la UCI", "trabajar", "salud", "Empieza el turno en la UCI", [
    ["A: vía aérea, comprueba el tubo y su fijación", "mirar"],
    ["B: respiración, mira el respirador y la saturación", "mirar"],
    ["C: circulación, tensión, pulso y vías", "mirar"],
    ["D: nivel de conciencia y sedación", "mirar"],
    ["E: exponer y explorar el resto, sin olvidar la piel", "mirar"],
  ], ["silencia las alarmas para que descanse", "empieza por la piel"], "Resuscitation Council UK, The ABCDE approach (2021)"),
  "hospital-control-uci": q("hosp-relevo", "El relevo de turno", "trabajar", "compania", "Cambia el turno y hay que pasar los pacientes", [
    ["S: situación, qué le pasa ahora", "pedir"],
    ["B: antecedentes", "pedir"],
    ["A: tu valoración", "pedir"],
    ["R: lo que recomiendas y lo pendiente", "pedir"],
  ], ["pasa el relevo en el pasillo con prisa", "omite lo pendiente"], "Institute for Healthcare Improvement, SBAR Tool (2004)"),

  // --- Veterinary hospital -------------------------------------------------------------------------------------------
  "vet-perrera": q("vet-perrera", "Cuidar la perrera", "limpiar", "compania", "Los perros ingresados esperan su mañana", [
    ["saca a cada perro a pasear mientras limpias su box", "pedir"],
    ["retira la suciedad y friega con el desinfectante", "limpiar"],
    ["agua fresca y su ración, apuntada en su ficha", "servir"],
    ["juega o acaricia a cada uno un rato", "agacharse"],
  ], ["limpia con el perro dentro", "da a todos la misma ración"], "WSAVA, Global Nutrition Guidelines (2011); Association of Shelter Veterinarians, Guidelines for Standards of Care (2022)"),
  "vet-jaulas": q("vet-jaulas", "Sacar a un gato de su jaula", "trabajar", "compania", "Un gato asustado no quiere salir", [
    ["acércate despacio y háblale bajo", "pedir"],
    ["déjale oler tu mano", "agacharse"],
    ["envuélvelo con una toalla, sin agarrarlo del cuello", "tomar"],
    ["sostenlo contra tu cuerpo con su peso apoyado", "tomar"],
  ], ["sácalo por el pellejo del cuello", "grítale para que salga"], "ISFM/AAFP, Feline-Friendly Handling Guidelines (2011)"),
  "vet-bascula": q("vet-bascula", "Pesar para la dosis", "trabajar", "salud", "Hay que dar un antiparasitario a una perra", [
    ["pon la báscula a cero", "ajustar"],
    ["sube a la perra y espera a que se quede quieta", "pedir"],
    ["apunta el peso en kilos", "tomar"],
    ["calcula la dosis: {10|20|5} kg por 5 mg/kg son 50 mg", "mirar"],
  ], ["calcula la dosis a ojo", "pesa con la correa colgando fuera"], "Plumb's Veterinary Drug Handbook, 10.ª ed. (2023): dosis por kilo de peso"),
  "vet-quirofano": q("vet-anestesia", "Anestesia veterinaria segura", "trabajar", "salud", "Van a esterilizar a una gata", [
    ["comprueba que lleva el ayuno indicado", "mirar"],
    ["pésala y calcula los fármacos", "mirar"],
    ["comprueba la máquina de anestesia y el circuito", "ajustar"],
    ["vigila pulso, respiración y temperatura cada {5|60|30} minutos", "mirar"],
    ["abrígala hasta que despierte", "tomar"],
  ], ["déjala sola mientras despierta", "calcula los fármacos sin pesarla"], "AAHA, Anesthesia and Monitoring Guidelines for Dogs and Cats (2020)"),
  "vet-caja-aves": q("vet-aves", "Manejar un ave herida", "trabajar", "compania", "Ha llegado un págalo con un ala herida", [
    ["baja la luz: a oscuras se calman", "ajustar"],
    ["cúbrela con una toalla y sujeta las alas pegadas al cuerpo", "tomar"],
    ["no aprietes el pecho: respira moviéndolo", "mirar"],
    ["déjala en una caja de cartón con agujeros, en un sitio tranquilo", "agacharse"],
  ], ["sujétala apretando el pecho", "dale pan"], "RSPB / BTO, handling wild birds; Samour, Avian Medicine, 3.ª ed. (2016)"),
  "vet-sala-fria": q("vet-vacunas", "Guardar las vacunas en frío", "trabajar", "salud", "Llega el pedido de vacunas", [
    ["mételas en la nevera enseguida, entre {2|10|-5} y 8 °C", "tomar"],
    ["ninguna pegada a las paredes ni al congelador", "ajustar"],
    ["apunta la temperatura mínima y máxima del día", "mirar"],
    ["usa primero las que caducan antes", "tomar"],
  ], ["congélalas para que duren más", "déjalas en la mesa hasta la tarde"], "WSAVA, Guidelines for the Vaccination of Dogs and Cats (2016): cadena de frío 2–8 °C"),
  "vet-aislamiento": q("vet-aislamiento", "El box de aislamiento", "trabajar", "salud", "Un cachorro con parvovirus está aislado", [
    ["ponte bata, guantes y calzas solo para este box", "guantes"],
    ["atiéndelo el último de la ronda", "mirar"],
    ["limpia con un desinfectante que mate el parvovirus", "limpiar"],
    ["quítate el equipo dentro y lávate las manos al salir", "limpiar"],
  ], ["atiéndelo el primero y luego a los demás", "lava solo con jabón"], "Greene, Infectious Diseases of the Dog and Cat, 5.ª ed. (2021): parvovirus canino, resiste a muchos desinfectantes"),

  // --- The guard room (watch-keeping in the Antarctic) ---------------------------------------------------------------
  "guardia-muro-video": q("gua-video", "Vigilar el muro de vídeo", "trabajar", "salud", "Empieza tu guardia ante las cámaras", [
    ["recorre cada cámara en orden, de izquierda a derecha", "mirar"],
    ["apunta lo que se sale de lo normal con su hora", "tomar"],
    ["si alguien está en peligro, avisa por radio enseguida", "pedir"],
    ["al acabar, pasa las notas al relevo", "pedir"],
  ], ["mira solo la cámara que más te gusta", "apunta las cosas al final del turno, de memoria"], "IAMSAR, Manual internacional de búsqueda y salvamento aeronáutico y marítimo, vol. III (2022): la vigilancia", "real"),
  "guardia-consola": q("gua-consola", "Hacer el parte de la guardia", "trabajar", "compania", "Cada hora hay que dejar constancia", [
    ["apunta la hora", "tomar"],
    ["apunta el tiempo: viento, visibilidad y temperatura", "mirar"],
    ["apunta quién ha salido y quién ha vuelto", "tomar"],
    ["firma la entrada", "tomar"],
  ], ["deja el parte en blanco si no ha pasado nada", "corrige las horas a lápiz"], "COMNAP, Antarctic Station Operations: registros de guardia y control de salidas (supuesto el formato)", "real"),
  "guardia-respaldo": q("gua-generador", "Probar el generador de respaldo", "trabajar", "salud", "La prueba semanal del generador de emergencia", [
    ["mira el nivel de gasóleo y de aceite", "mirar"],
    ["arranca el generador", "ajustar"],
    ["déjalo con carga el tiempo de la prueba", "mirar"],
    ["apunta horas, tensión y frecuencia", "tomar"],
  ], ["arráncalo sin mirar el aceite", "pruébalo solo cuando falle la red"], "NFPA 110, Standard for Emergency and Standby Power Systems (2022): pruebas periódicas con carga"),
  "guardia-radar": q("gua-radar", "Seguir un eco en el radar", "trabajar", "salud", "Aparece un eco nuevo en la pantalla", [
    ["marca el eco y apunta su rumbo y distancia", "mirar"],
    ["márcalo otra vez al cabo de unos minutos", "mirar"],
    ["si su rumbo no cambia y la distancia baja, viene hacia aquí", "mirar"],
    ["avisa al jefe de guardia", "pedir"],
  ], ["fíate de una sola marca", "apaga el radar para que no moleste"], "OMI, COLREG regla 7 (riesgo de abordaje: demora constante y distancia que disminuye)"),
  "guardia-carta-hielo": q("gua-hielo", "Leer la carta de hielo", "trabajar", "salud", "Hay que decidir si el bote puede salir", [
    ["busca la zona en la carta", "mirar"],
    ["lee la concentración en décimas: {9|1|3}/10 es banquisa casi cerrada", "mirar"],
    ["mira el tipo y la edad del hielo", "mirar"],
    ["con hielo cerrado, el bote no sale", "pedir"],
  ], ["sal y ya verás el hielo allí", "lee la carta de la semana pasada"], "OMM, Nomenclatura del hielo marino (OMM n.º 259) y código del huevo"),
  "guardia-sismografo": q("gua-sismo", "Leer el sismógrafo", "trabajar", "salud", "El sismógrafo ha registrado un terremoto lejano", [
    ["busca la llegada de la onda P, la primera", "mirar"],
    ["busca la llegada de la onda S, más grande y después", "mirar"],
    ["mide los segundos entre las dos", "mirar"],
    ["cada segundo de diferencia son unos {8|1|100} km de distancia", "mirar"],
  ], ["la onda S llega antes que la P", "mide la distancia por el tamaño del trazo"], "USGS, «Locating an earthquake»: diferencia S–P ≈ 8 km por segundo"),
  "guardia-mareografo": q("gua-marea", "Comprobar el mareógrafo", "trabajar", "salud", "Hay que mirar si la marea va como se esperaba", [
    ["lee la altura del mar ahora", "mirar"],
    ["compárala con la tabla de mareas", "mirar"],
    ["si sube mucho más de lo previsto, avisa", "pedir"],
    ["apunta la lectura con su hora", "tomar"],
  ], ["ignora una subida rápida fuera de tabla", "apunta sin la hora"], "COI, Manual on Sea Level Measurement and Interpretation, vol. IV (2006)"),
  "guardia-radio": q("gua-radio", "La prueba de radio", "trabajar", "compania", "Cada mañana se prueba la radio con las patrullas", [
    ["llama: «Patrulla uno, aquí guardia, prueba de radio»", "pedir"],
    ["suelta el pulsador y escucha", "respirar"],
    ["di cómo se oye, de uno a cinco", "pedir"],
    ["deletrea los nombres con el alfabeto: A de Alfa, B de Bravo", "pedir"],
  ], ["habla con el pulsador apretado mientras te contestan", "di «se oye regular» sin número"], "OMI, Frases normalizadas de comunicación marítima (SMCP, 2001); alfabeto fonético de la UIT"),
  "guardia-tablero": q("gua-salidas", "Controlar las salidas", "trabajar", "salud", "Un equipo sale al glaciar", [
    ["apunta quiénes son, a dónde van y cuándo vuelven", "tomar"],
    ["comprueba que llevan radio y la han probado", "mirar"],
    ["acuerda la hora de llamada", "pedir"],
    ["si no llaman a su hora, empieza el plan de búsqueda", "pedir"],
  ], ["deja salir a quien no dice a dónde va", "espera al día siguiente si no llaman"], "COMNAP, Antarctic Field Operations: control de salidas y llamadas programadas"),
};

/** Each step's animation for these challenges (data/animaciones.ts merges them into PROCEDURE_STEPS). */
export const PASOS_2: Readonly<Record<string, readonly StepAnimation[]>> = ANIMS;
export const PROCEDIMIENTOS_2: readonly Procedure[] = PROCS;
