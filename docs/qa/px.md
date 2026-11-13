# Experiencia del jugador (PX)

Recorridos de la suite de experiencia (`tools/experiencia/`, [../testing.md](../testing.md)), enlazados desde la sección «Experiencia del jugador (PX)» de [casos.md](casos.md). Los IDs **no se reutilizan ni se renumeran**: un recorrido que deja de aplicar pasa a `Retirado`. La lista debe coincidir con `JOURNEYS` de `tools/experiencia/presupuestos.mjs` (`npm run check:docs`). Los hallazgos de las partidas están en [hallazgos.md](hallazgos.md).

## Catálogo

| ID | Recorrido | Qué debe pasar | Modo |
| --- | --- | --- | --- |
| PX-01 | `cocina` | Tres toques sobre la misma opción errónea dejan **Fallos 1/3**, la opción marcada con ✗ y el paso sin avanzar ni terminar; con los siete pasos bien, «✓ Conseguido 7/7 con 1 fallo» y la despensa (al tocar el estado) con crema de cacahuete. En vista HUD: fallos en ámbar sobre placa oscura, rojo al tope, «✗ Reto perdido» que un toque inmediato no cierra, y la receta sigue disponible. | iPhone 13, CPU ×4 |
| PX-02 | `movimiento` | W enciende el RCS y el HUD lo dice; la velocidad deja de estar en reposo. En la escotilla, Impulsarse la mueve (lo dice el HUD y cambia la vista). Una tarea elegida en el eje avisa «Bajas al anillo». En el anillo, Caminar avanza la vista y el HUD dice la gravedad. | iPhone 13, CPU ×4 |
| PX-03 | `mision` | La radio avisa de cartas; una trae la misión de Bennu; el registro abre con 0 hechas. Posado (fase de la sonda preparada), la acción principal aparece abajo a la derecha; un fallo suma «Fallos 1/N»; ganar muestra «Conseguido» con un solo botón para volver. Con el traje, tumbarse y ganar el tercer duelo: Bennu persuadido y aviso de misión cumplida que no tapa el resultado. | iPhone 13, CPU ×4 |
| PX-04 | `acciones-movil` | Cada pantalla (cabina acoplada y libre, ingravidez, anillo, tareas, puente, mapa, sonda, posado, traje, paseo, estación y sus seis pestañas) sin controles solapados a 390×664 visibles; capturas `ux-<antes/despues>-*-movil.png`. | iPhone 13, CPU ×1 |
| PX-05 | `acciones-escritorio` | Lo mismo a 1280×800; capturas `ux-*-escritorio.png`. | Escritorio, CPU ×1 |

## Estado

**Solo un registro de ejecución (`runs/<fecha>-PX-…md`) mueve un recorrido a «Probado».** `npm run experiencia` reescribe la fila de cada recorrido que juega.

| ID | Recorrido | Estado | Fecha | Commit | Registro |
|---|---|---|---|---|---|
| PX-01 | Cocinar paso a paso | Sin probar | – | – | – |
| PX-02 | Moverse | Sin probar | – | – | – |
| PX-03 | Misión 1 de Nevaeh | Sin probar | – | – | – |
| PX-04 | Botones en el móvil | Sin probar | – | – | – |
| PX-05 | Botones en escritorio | Sin probar | – | – | – |
