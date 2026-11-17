// The one place where the experience suite's journeys and performance budgets are declared.
// docs/testing.md and docs/qa/casos.md (section PX) and docs/qa/registro.md must match these (npm run check:docs).

/** Stable journey IDs: never renumbered or reused; a journey that no longer applies becomes «Retirado». */
export const JOURNEYS = [
  { id: "PX-01", fiction: true, name: "cocina", title: "Cocinar paso a paso: huevos revueltos con cada paso visible en 3D, crema de cacahuete con un fallo repetido, receta perdida en vista HUD, pasos visibles al cosechar; sin gallinas no hay puerta del gallinero" },
  { id: "PX-02", fiction: true, name: "movimiento", title: "Moverse: propulsores de la cabina, flechas en ingravidez, cruzar la espina (lanzador y escalera), caminar por el anillo" },
  { id: "PX-03", name: "mision", title: "Misión 1 de Nevaeh: carta, registro, las tres fases en Bennu y duelo con un fallo" },
  { id: "PX-04", name: "acciones-movil", title: "Botones de cada pantalla de un iPhone 13 (390×664 visibles de 390×844): capturas, solapes y objetivos de toque", mobile: true, throttle: 1 },
  { id: "PX-05", name: "acciones-escritorio", title: "Botones de cada pantalla a 1280×800: capturas y solapes", mobile: false, throttle: 1 },
  { id: "PX-06", name: "ordenar", title: "Programar un viaje: orden erróneo con ✓/✗ por casilla y Reintentar; paso a paso con aviso al momento; ambas vistas" },
  { id: "PX-07", name: "aterrizaje-programa", title: "Programar: un paso del viaje se dibuja al acertarlo; la sonda aterriza en Bennu por programa con toques (un fallo)" },
  { id: "PX-08", name: "aterrizaje-manual", title: "Aterrizar a mano: indicadores X/Y/Z con colores, sitio en la cámara ventral, vz en rojo si cae deprisa" },
  { id: "PX-09", name: "aterrizaje-escritorio", title: "A 1280×800: indicadores del módulo y aterrizaje del módulo por programa con clics", mobile: false },
  { id: "PX-10", name: "habitaculo-movil", title: "Habitáculo del módulo en un iPhone 13: levantarse, desacoplar en la consola, ajustes en la esterilla, «Ir» de una tarea de vuelo y consolas del puente", mobile: true, throttle: 1 },
  { id: "PX-11", name: "habitaculo-escritorio", title: "Habitáculo del módulo y consolas del puente a 1280×800", mobile: false, throttle: 1 },
  { id: "PX-12", name: "estacion-movil", title: "Estación (la ISS) en un iPhone 13: primera persona, puertas con nombre, cocina de Unity con su despensa, camarote de Harmony, ajustes en la esterilla, «Ir» de una tarea de la estación y Canadarm2 atracando el módulo en el CBM, visto desde la Cupola", mobile: true, throttle: 1 },
  { id: "PX-13", fiction: true, name: "acuario", title: "Acuario del anillo en un iPhone 13: adoptar medakas y caracoles Biomphalaria para el tanque vacío, «Ir» hasta el tanque, dar de comer con pasos visibles, hacer amistad con las medakas y los caracoles, pedir ayuda a los caracoles y a las medakas y ver el efecto" },
  { id: "PX-14", fiction: true, name: "viaje", title: "«Ir a una tarea»: ajuste en la esterilla, teletransporte con aviso y viaje real del anillo a la estación (ascensor, espina, escotilla) con «Parar» a medio camino y la cámara libre", mobile: true, throttle: 1 },
  { id: "PX-15", name: "puente-real", title: "Puente real en un iPhone 13 y en 1ª persona: cada consola se reconoce por su cartel y se toca sin solapes, sentarse en el mando de la sonda y abrir la mesa de navegación", mobile: true, throttle: 1 },
  { id: "PX-16", fiction: true, name: "nodriza-estacion", title: "La nodriza viaja a la estación y entra en el dique seco: «Ir» desde el anillo en modo Viaje, «Ver trayecto» con la ruta dibujada y la cámara siguiéndola, atraque en el dique visible desde la estación y el interruptor Viaje/Teletransporte en la lista de tareas", mobile: true, throttle: 1 },
  { id: "PX-24", name: "catalogo-naves", title: "Catálogo de naves reales en un iPhone 13: pestaña Hangar de la estación, cada vehículo con su estado y las piezas que pide, y «Montar» DART en el CBM con el brazo, listo para «Botar»", mobile: true, throttle: 1 },
  { id: "PX-23", fiction: true, name: "yoga", title: "Yoga en el anillo con el esqueleto de Cold Sanctuary: «Ir» al Saludo al Sol, cada acierto lleva a Doménica a la siguiente asana con transición suave y respiración; captura por asana junto a su ficha; manos y pies en la esterilla (IK); tiempo de JS de las poses", mobile: true },
  { id: "PX-25", fiction: true, name: "foco", title: "Foco del reto: cada clase de reto en cada sitio (cocina, tarea, acuario y yoga del anillo; viaje, sonda, aterrizajes y mente en el puente y el módulo; traje, nano_net; cocina, máquina, pantallas, importar y hangar de la estación), abierto con toques; con la hoja abierta solo se ven la hoja, la escena y el paso", mobile: true, throttle: 1 },
  { id: "PX-27", fiction: true, name: "catalogo", title: "Catálogo de especies en un iPhone 13: partida nueva con Doménica sola, el catálogo desde la lista de tareas, comparar los dos caracoles (la nerita, «pendiente»), adoptar medakas y Biomphalaria para el hábitat acuático, verlas llegar, ratones «disponibles» y gallinas «pendientes», hacerse amigos y dos comidas en un día de a bordo", mobile: true },
  { id: "PX-28", name: "starship", title: "Partida nueva en la nodriza real, una Starship: de la escotilla del módulo a la cubierta 3, cocinar comida de la ISS en la cubierta 1 y correr en la T2 desde «Ir», adoptar medakas en el terminal del catálogo de la cubierta 2 y verlas en el hábitat acuático de la cubierta 3, subir a la cubierta de vuelo, la página de propulsión (Raptor de vacío, metano y oxígeno) y programar un viaje que acelera, va por inercia y frena; sin nada de la nave de ficción en pantalla", mobile: true, throttle: 1 },
  { id: "PX-29", name: "estacion-iss", title: "La ISS en un iPhone 13: recorrido por sus escotillas (Harmony, Destiny, Unity, Tranquility, Columbus, Kibo, Quest), Juventas a la Bishop y suelta por Canadarm2, el brazo atracando el módulo en el CBM de Unity visto desde la Cupola y la cocina de Unity", mobile: true, throttle: 1 },
  { id: "PX-31", name: "modulo-lunar", title: "El módulo lunar Apolo y Juventas en un iPhone 13: la cabina real del LM con su panel del ECS, desacoplar de la Starship, posarse en Bennu por programa, el duelo de la mente, acoplar de vuelta y, en la ISS, montar Juventas en la Bishop desde el catálogo y desplegarla, vista desde la Cupola", mobile: true, throttle: 1 },
  { id: "PX-33", name: "componentes", title: "Componentes por nivel e importación en un iPhone 13: en el Hangar de la estación cada componente real con su nivel, fuente, masa, coste y viaje; lo del LM es de serie; importar un motor del nivel 2 (reto del pedido), verlo llegar al hangar tras la transferencia y montarlo en la bahía con su reto; el nivel 3 se desbloquea; importar lo que le falta a Juventas y montarla en la Bishop", mobile: true, throttle: 1 },
  { id: "PX-37", name: "pendientes", title: "Hallazgos de Berón (2026-11-17) en un iPhone 13: ajustes de la esterilla en vista HUD en el LM, la Starship y la estación (esterilla en Destiny, con ella sentada a la vista); el mando «Mirar» en la Starship, la estación y la sonda; una comida de la Starship con su envase en la cocina; «Vista HUD» en el reto de Planos y en el duelo de la mente", mobile: true, throttle: 1 },
  { id: "PX-20", fictionToo: true, name: "animaciones", title: "Auditoría de animaciones: cada receta, proceso y tarea del anillo, el viaje, los aterrizajes del módulo y de la sonda, la cocina y las máquinas de la estación jugados con toques; tras cada paso, sus objetos al alcance de Doménica, a la vista sobre la hoja y sin atravesar muebles, y su gesto", throttle: 1 },
  { id: "PX-30", name: "soporte-vital", title: "Soporte vital real en la estación con un iPhone 13: lecturas solo en los bastidores y la consola; el CDRA se tapona, el CO₂ pasa la alarma de 5,3 mmHg y a Doménica le duele la cabeza; «Ir» a la reparación, pasos encendidos en el bastidor y el CO₂ vuelve; mantenimiento del lecho del WPA; el desgaste de los lechos con su causa y su preventivo; la despensa de la cocina, un Dragon de carga que la llena y un plato que la gasta", mobile: true, throttle: 1 },
];

/**
 * Performance budgets (iPhone 13 profile, CPU ×4). `gpu: true` ones only bind on a hardware GPU
 * (or with EXPERIENCIA_ESTRICTO=1): with SwiftShader the scene draws at a few fps whatever the game does.
 */
export const BUDGETS = [
  { key: "loadMs", name: "Carga hasta el primer fotograma", max: 8000, unit: "ms", gpu: true },
  { key: "frameP95Ms", name: "Fotograma p95", max: 33, unit: "ms", gpu: true },
  { key: "slowFramesPct", name: "Fotogramas de más de 33 ms", max: 10, unit: "%", gpu: true },
  { key: "longTasksPerMin", name: "Tareas largas por minuto", max: 30, unit: "", gpu: true },
  { key: "heapMB", name: "Memoria JS", max: 350, unit: "MB", gpu: false },
  { key: "drawCalls", name: "Llamadas de dibujo por fotograma", max: 600, unit: "", gpu: false },
  { key: "trianglesK", name: "Triángulos por fotograma", max: 2000, unit: "k", gpu: false },
];

/** Minimum touch target on phones (Apple HIG 44 pt; Material 48 dp) and on desktop (WCAG 2.5.8, 24 px). */
export const TOUCH_MIN_PX = { mobile: 44, desktop: 24 };
