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

| Recorrido | Qué juega |
| --- | --- |
| `cocina` | Entra en la nave, abre Tareas, hace la crema de cacahuete tocando **tres veces la misma opción errónea** (el informe del diseñador) y luego los siete pasos; después cocina cacahuetes tostados en **vista HUD**, falla hasta perder y da un toque rápido de más sobre el resultado. |
| `movimiento` | Propulsores de la cabina con W y la velocidad del HUD; Impulsarse en ingravidez; una tarea elegida desde el eje (avisa de que baja); caminar y mirar con los mandos del anillo. |
| `mision` | Radio → carta de Nevaeh → registro de misiones → posado en Bennu → duelo con un fallo a propósito → misión cumplida. |
| `acciones-movil`, `acciones-escritorio` | Visita cada pantalla (cabina, ingravidez, anillo, tareas, puente, mapa, sonda, vuelo libre, posado, paseo, estación y sus pestañas), la captura como `ux-<antes/despues>-<pantalla>-<movil/escritorio>.png` y lista los controles que se solapan. |

```
npm run experiencia                 # compila, sirve dist/ y juega todos los recorridos
npm run experiencia -- cocina mision
EXPERIENCIA_URL=http://localhost:5173/ node tools/experiencia/run.mjs cocina   # contra un servidor ya en marcha
```

Salida: `experiencia-informe/<fecha>/report.md`, `report.json` y las capturas (carpeta ignorada por git). El proceso sale con 1 si falla alguna comprobación o se pasa algún presupuesto que aplica.

Variables: `EXPERIENCIA_URL` (servidor ya en marcha), `EXPERIENCIA_OUT` (carpeta de salida), `EXPERIENCIA_PREFIJO` (`antes`/`despues` en las capturas de botones), `EXPERIENCIA_CPU` (freno de CPU por defecto, 4), `EXPERIENCIA_ESTRICTO=1` (aplica todos los presupuestos aunque la GPU sea por software).

### Rendimiento

Cada recorrido corre en el perfil **iPhone 13** de Playwright con la CPU frenada **×4** (`Emulation.setCPUThrottlingRate` por CDP), que se acerca a un móvil de gama media. Mide:

- **fotogramas** con `requestAnimationFrame` desde que empieza el recorrido (después de cargar): mediana y p95 en ms, % de fotogramas de más de 33 ms;
- **tareas largas** (`PerformanceObserver` de `longtask`): cuántas por minuto y la mayor;
- **memoria JS** (`performance.memory`, Chromium);
- **llamadas de dibujo y triángulos** del último fotograma: `window.__codeshipFrame`, un gancho que solo existe en desarrollo o con `?prueba` en la URL (`renderer.info` sin reinicio automático, leído al empezar cada fotograma);
- **carga hasta el primer fotograma interactivo**: la marca `codeship-primer-fotograma` que pone el bucle en su primera vuelta.

| Presupuesto | Máximo | Por qué |
| --- | --- | --- |
| Carga hasta el primer fotograma | 8000 ms | Un móvil con CPU ×4 debe ver la cabina en menos de 8 s. |
| Fotograma p95 | 33 ms | 30 fps sostenidos; por encima, los mandos táctiles se notan pesados. |
| Fotogramas de más de 33 ms | 10 % | Tirones ocasionales sí, entrecortado no. |
| Tareas largas por minuto | 30 | Cada una bloquea los toques más de 50 ms. |
| Memoria JS | 350 MB | Safari en iPhone mata pestañas que pasan de unos 400 MB. |
| Llamadas de dibujo por fotograma | 600 | Por encima, la GPU de un móvil no llega a 30 fps. |
| Triángulos por fotograma | 2 000 k | Ídem. |

Los presupuestos de **carga, fotogramas y tareas largas dependen de la GPU**. En un contenedor sin GPU Chromium dibuja con SwiftShader (por software) y la escena va a 2–6 fps aunque el juego vaya bien en un teléfono: ahí esos tres se informan como «informativo» y no hacen fallar la ejecución. Memoria, llamadas de dibujo y triángulos no dependen de la GPU y siempre aplican. En una máquina con GPU (o con `EXPERIENCIA_ESTRICTO=1`) aplican todos.
