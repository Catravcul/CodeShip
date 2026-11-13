// The one place where the experience suite's journeys and performance budgets are declared.
// docs/testing.md and docs/qa/casos.md (section PX) and docs/qa/registro.md must match these (npm run check:docs).

/** Stable journey IDs: never renumbered or reused; a journey that no longer applies becomes «Retirado». */
export const JOURNEYS = [
  { id: "PX-01", name: "cocina", title: "Cocinar paso a paso: crema de cacahuete con un fallo repetido, receta perdida en vista HUD" },
  { id: "PX-02", name: "movimiento", title: "Moverse: propulsores de la cabina, flechas en ingravidez, caminar por el anillo" },
  { id: "PX-03", name: "mision", title: "Misión 1 de Nevaeh: carta, registro, las tres fases en Bennu y duelo con un fallo" },
  { id: "PX-04", name: "acciones-movil", title: "Botones de cada pantalla de un iPhone 13 (390×664 visibles de 390×844): capturas, solapes y objetivos de toque", mobile: true, throttle: 1 },
  { id: "PX-05", name: "acciones-escritorio", title: "Botones de cada pantalla a 1280×800: capturas y solapes", mobile: false, throttle: 1 },
  { id: "PX-06", name: "ordenar", title: "Programar un viaje: orden erróneo con ✓/✗ por casilla y Reintentar; paso a paso con aviso al momento; ambas vistas" },
  { id: "PX-07", name: "aterrizaje-programa", title: "Programar: un paso del viaje se dibuja al acertarlo; la sonda aterriza en Bennu por programa con toques (un fallo)" },
  { id: "PX-08", name: "aterrizaje-manual", title: "Aterrizar a mano: indicadores X/Y/Z con colores, sitio en la cámara ventral, vz en rojo si cae deprisa" },
  { id: "PX-09", name: "aterrizaje-escritorio", title: "A 1280×800: indicadores del módulo y aterrizaje del módulo por programa con clics", mobile: false },
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
