# QA: casos, convivencia y evidencia

Cómo se captura qué tiene que pasar en el juego, cómo se prueba que dos procesos conviven y dónde se
deja la evidencia. Copia el sistema de QA del otro proyecto del diseñador (catálogo con IDs estables,
registro con «sin evidencia no hay probado», run logs y base de conocimiento), adaptado a un juego:
sin tiendas ni webhooks, con relojes, cámara rápida y perfiles de dispositivo.

| Fichero | Qué es |
|---|---|
| [casos.md](casos.md) | Catálogo: casos por área con ID estable, qué tiene que pasar y qué test lo cubre; bugs `B-nn` y huecos `HC-nn` |
| [entrelazamiento.md](entrelazamiento.md) | Mapa de estado compartido: relojes, almacén, posiciones, créditos, energía… y quién escribe cada uno |
| [registro.md](registro.md) | Estado por caso, con fecha, commit y run log |
| [runs/](runs/) | Un run log por ejecución ([PLANTILLA.md](runs/PLANTILLA.md)) |
| [hallazgos.md](hallazgos.md) | Lo que se vio en una ejecución (`Hn`) y en qué acabó |
| `src/qa/convivencia/` | Tests de los casos CV (Vitest, capa de aplicación, sin DOM ni Three.js) |
| `scripts/qa-check.mjs` | `npm run qa:check`: que catálogo, registro y tests cuadren |
| [../conocimiento/](../conocimiento/README.md) | Lo aprendido que volverá a morder (Three.js, Chromium, simulación, ramas) |

## Flujo

1. **Funcionalidad nueva → primero el caso.** Se añade a [casos.md](casos.md) con el siguiente ID
   libre de su área. Se mira [entrelazamiento.md](entrelazamiento.md): si el proceso escribe algo que
   otro ya escribe (o lee algo que otro mueve), se añade su fila y un caso **CV** por cada cruce.
2. **Test en rojo** con el ID en el título (`it("CV-18 …")`). Los CV van en `src/qa/convivencia/` y se
   arman con `mundo.ts` como los arma `main.ts`. Si la lógica entre procesos solo está en `main.ts`, se
   saca a una función pura con test (como `frameClocks`).
3. **Arreglo.** Si el test enseña un fallo pequeño y claro, se arregla (TDD). Si no, el test queda como
   `it.fails` (o `it.todo`) con el `B-nn` en el título y el bug en la tabla de casos.md. Si el
   comportamiento no está decidido, el test fija lo actual y el caso apunta a un `HC-nn`.
4. **QA con run log.** Se ejecuta (la suite, o jugando con el perfil iPhone 13 / escritorio) y se
   deja un run log en [runs/](runs/) con el commit. El registro pasa a `Probado` solo con ese run log.
   Lo visto va a [hallazgos.md](hallazgos.md) y, si es general, a la base de conocimiento.
5. `npm run qa:check` en verde.

## Antes de fusionar una rama

1. Lista las áreas que toca el diff (`git diff --stat integracion...`).
2. Corre sus casos: los tests citados en casos.md para esas áreas, y **todos los CV cuya columna
   «Áreas» cita alguna de ellas** (en la práctica, `npx vitest run src/qa`, que tarda segundos).
3. Mira los `B-nn` y `HC-nn` que cuelgan de esos casos: si la rama los toca, actualiza su estado.
4. `npx tsc --noEmit`, `npx vitest run`, `npm run lint:arch`, `npm run qa:check`, `npm run build`.
5. Si la rama añade estado compartido, el caso CV va en la misma rama.

## Experiencia del jugador

Los recorridos jugados (Playwright, perfil iPhone 13 con CPU ×4, capturas y rendimiento) llegan con la
rama `jugabilidad-ux` como casos `PX-nn`; sus run logs usan la misma [plantilla](runs/PLANTILLA.md) con
los números de rendimiento.

## Dónde va cada cosa

| Si es… | Va a |
|---|---|
| Qué tiene que pasar (un comportamiento con ID) | [casos.md](casos.md) |
| Dos procesos que tocan el mismo estado | [entrelazamiento.md](entrelazamiento.md) y un caso CV |
| El test de un caso de convivencia | `src/qa/convivencia/<tema>.test.ts`, con el ID en el título |
| El test de un caso de un solo módulo | Junto al código, `src/modules/<módulo>/…/*.test.ts` |
| Si un caso está probado | [registro.md](registro.md) |
| La salida de una ejecución | [runs/](runs/) (`AAAA-MM-DD-HHMM-<qué>-<modo>.md`) |
| Lo que se vio al probar | [hallazgos.md](hallazgos.md) (`Hn`) |
| Un fallo o un hueco | Tabla «Bugs y huecos» de [casos.md](casos.md) (`B-nn`, `HC-nn`) |
| Un gotcha del motor, el navegador o la simulación | [docs/conocimiento/](../conocimiento/README.md) |
| Cómo funciona una mecánica y sus fuentes | [docs/design/](../design/) |
| Datos reales | [docs/research/](../research/) |
