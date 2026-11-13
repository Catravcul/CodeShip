# Pruebas

Hay tres capas:

| Capa | Comando | Qué prueba |
| --- | --- | --- |
| Unitarias (Vitest) | `npx vitest run` | Reglas del juego en el dominio y la aplicación (TDD). Sin DOM ni Three.js. |
| Arquitectura | `npm run lint:arch` | Que el dominio y la aplicación no importan adaptadores, UI, Three.js ni el DOM. |
| Experiencia del jugador (Playwright) | `npm run experiencia` | Recorridos completos jugados con toques y teclas, con capturas y rendimiento. |

## Experiencia del jugador

Copia el modelo del `ExperienciaJugadorTest` de Cold Sanctuary: **emular solo lo que un jugador puede hacer** y comprobar lo que ve. Cada recorrido:

- se juega con **toques en los controles visibles** (`tap` en el centro del botón, arrastre de los mandos táctiles) o con las teclas que tiene un jugador de escritorio; si un botón está oculto o tapado, el toque falla y el recorrido lo apunta;
- comprueba **lo que se ve**: textos (`Aciertos 1/7`, `Fallos 1/3`), colores calculados (ámbar, verde, rojo), si la vista cambia, avisos;
- guarda una **captura** en cada momento importante;
- apunta los **problemas de experiencia** que no son fallos (por ejemplo, «dos botones para lo mismo»).

Lo único que no hace un jugador son las **preparaciones**, marcadas con `·` en el informe: llevar a Doménica al anillo sin esperar el ascensor, posar el módulo sobre Bennu o acoplarlo en la estación. Son el equivalente del `Teleport` de Cold Sanctuary: ahorran minutos que no prueban nada nuevo. Para saber qué opción es la correcta en un duelo se lee la respuesta del reto (el «oráculo», lo que sabría un jugador que entiende el código); la acción sigue siendo un toque.

### Recorridos (`tools/experiencia/`)

Cada recorrido tiene un ID estable (`PX-01`…) en la sección «Experiencia del jugador (PX)» de [qa/casos.md](qa/casos.md), con su estado en [qa/registro.md](qa/registro.md); cada ejecución deja un registro en `docs/qa/runs/<fecha>-PX-….md`. **Sin registro de ejecución no hay «Probado».**

| Recorrido | Qué juega |
| --- | --- |
| PX-01 `cocina` | Entra en la nave, abre Tareas, hace la crema de cacahuete tocando **tres veces la misma opción errónea** (el informe del diseñador) y luego los siete pasos; después cocina cacahuetes tostados en **vista HUD**, falla hasta perder y da un toque rápido de más sobre el resultado. |
| PX-02 `movimiento` | Propulsores de la cabina con W y la velocidad del HUD; el mando de flechas en ingravidez (salto, flechas apagadas durante el salto); avisos del jugador sin pisar (H24) y de ambiente a la vista; una tarea elegida desde el eje (avisa de que baja); caminar y mirar con los mandos del anillo. |
| PX-03 `mision` | Radio → carta de Nevaeh → registro de misiones → posado en Bennu → duelo con un fallo a propósito → misión cumplida. |
| PX-04 `acciones-movil`, PX-05 `acciones-escritorio` | Visita cada pantalla (cabina, ingravidez, anillo, tareas, puente, mapa, sonda, vuelo libre, posado, paseo, estación y sus pestañas), la captura como `ux-<antes/despues>-<pantalla>-<movil/escritorio>.png` y lista los controles que se solapan. |
| PX-06 `ordenar` | En el puente programa el viaje a Bennu: un orden con dos pasos cambiados (marcas ✓/✗ por casilla en las dos vistas, Reintentar que deja los buenos) y, en otro intento, **paso a paso** (aviso al momento, un fallo por bloque erróneo, repetirlo no cuenta). Capturas `ordenar-*` (copiadas a `docs/screenshots/`). |
| PX-07 `aterrizaje-programa`, PX-08 `aterrizaje-manual`, PX-09 `aterrizaje-escritorio` | Un paso del viaje se dibuja al acertarlo; la sonda aterriza por programa con toques; los indicadores de aterrizaje del módulo aparecen y cambian de color; el módulo aterriza por programa a 1280×800 ([aterrizaje.md](design/aterrizaje.md)). |
| PX-10 `habitaculo-movil`, PX-11 `habitaculo-escritorio` | Habitáculo del módulo: sin Nombres ni Mandos, levantarse y desacoplar en la consola, ajustes en la esterilla (ayuda de teclado), «Ir» de una tarea de vuelo, y las consolas del puente (cada una abre solo su página; la mente aparte de la sonda). Capturas en `docs/screenshots/habitaculo-*-<movil/escritorio>.png`. |

```
npm run experiencia                 # compila, sirve dist/ y juega todos los recorridos
npm run experiencia -- cocina mision
EXPERIENCIA_URL=http://localhost:5173/ node tools/experiencia/run.mjs cocina   # contra un servidor ya en marcha
```

Salida: `experiencia-informe/<fecha>/report.md`, `report.json` y las capturas (carpeta ignorada por git), más el registro `docs/qa/runs/<fecha>-PX-….md` (commit, tabla de recorridos, comprobaciones y rendimiento frente a presupuesto) la fila de cada recorrido en `docs/qa/registro.md` y una línea en su tabla de ejecuciones. El proceso sale con 1 si falla alguna comprobación, si un recorrido esperado no hizo **ninguna** comprobación, si una medida falta o si se pasa algún presupuesto que aplica.

Antes de cada toque se comprueban tres invariantes (como los ayudantes de invariantes de Natuka): el objetivo mide al menos **44×44 px** en el móvil (24×24 en escritorio), nada tapa su centro (`elementFromPoint`) y tiene nombre accesible (texto o `aria-label`). Cada control se comprueba una vez por recorrido.

El comprobador y el informe (`tools/experiencia/qa.mjs`: `makeChecker`, `verdict`, `exitCodeFor`, `checkBudgets`, `renderRunLog`, `updateRegistro`) son funciones puras con sus pruebas en Vitest (`qa.test.mjs`).

Variables: `EXPERIENCIA_SIN_REGISTRO=1` (no escribe en `docs/qa/`), `EXPERIENCIA_URL` (servidor ya en marcha), `EXPERIENCIA_OUT` (carpeta de salida), `EXPERIENCIA_PREFIJO` (`antes`/`despues` en las capturas de botones), `EXPERIENCIA_CPU` (freno de CPU por defecto, 4), `EXPERIENCIA_ESTRICTO=1` (aplica todos los presupuestos aunque la GPU sea por software).

### Rendimiento

Cada recorrido corre en el perfil **iPhone 13** de Playwright con la CPU frenada **×4** (`Emulation.setCPUThrottlingRate` por CDP), que se acerca a un móvil de gama media. Mide:

- **fotogramas** con `requestAnimationFrame` desde que empieza el recorrido (después de cargar): mediana y p95 en ms, % de fotogramas de más de 33 ms;
- **tareas largas** (`PerformanceObserver` de `longtask`): cuántas por minuto y la mayor;
- **memoria JS** (`performance.memory`, Chromium);
- **llamadas de dibujo y triángulos** del último fotograma: `window.__codeshipFrame`, un gancho que solo existe en desarrollo o con `?prueba` en la URL (`renderer.info` sin reinicio automático, leído al empezar cada fotograma);
- **carga hasta el primer fotograma interactivo**: la marca `codeship-primer-fotograma` que pone el bucle en su primera vuelta.

Los presupuestos se declaran en un solo sitio, `tools/experiencia/presupuestos.mjs`; `npm run check:docs` falla si esta tabla no coincide.

| Presupuesto | Máximo | Depende de la GPU | Por qué |
| --- | --- | --- | --- |
| Carga hasta el primer fotograma | 8000 ms | sí | Un móvil con CPU ×4 debe ver la cabina en menos de 8 s. |
| Fotograma p95 | 33 ms | sí | 30 fps sostenidos; por encima, los mandos táctiles se notan pesados. |
| Fotogramas de más de 33 ms | 10 % | sí | Tirones ocasionales sí, entrecortado no. |
| Tareas largas por minuto | 30 | sí | Cada una bloquea los toques más de 50 ms. |
| Memoria JS | 350 MB | no | Safari en iPhone mata pestañas que pasan de unos 400 MB. |
| Llamadas de dibujo por fotograma | 600 | no | Por encima, la GPU de un móvil no llega a 30 fps. |
| Triángulos por fotograma | 2000 k | no | Ídem. |

Una medida que falta (sin fotogramas, sin el gancho de dibujo, sin `performance.memory`) se apunta como **no medido** y hace fallar el recorrido: nunca cuenta como 0.

Los presupuestos de **carga, fotogramas y tareas largas dependen de la GPU**. En un contenedor sin GPU Chromium dibuja con SwiftShader (por software) y la escena va a 2–6 fps aunque el juego vaya bien en un teléfono: ahí esos tres se informan como «informativo» y no hacen fallar la ejecución. Memoria, llamadas de dibujo y triángulos no dependen de la GPU y siempre aplican. En una máquina con GPU (o con `EXPERIENCIA_ESTRICTO=1`) aplican todos.
