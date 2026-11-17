# Áreas: el esquema del vehículo

Petición de Berón (2026-11-17, 18:36): un botón «Áreas» en el menú árbol ([reglas.md](reglas.md) §5.8) que abra el esquema del vehículo donde está ella (Starship, estación o LM), con la idea del mapa de navegación (que abstrae la nave, los asteroides y la estación). Cada área es un nodo; al tocarlo, ella va allí sola, por el camino real o con teletransporte si lo eligió. Un selector cambia de vehículo. Los ajustes de viaje/teletransporte y de vehículo son los mismos que los de Tareas.

## Cómo se ve

| Parte | Qué tiene |
|---|---|
| Cabecera | «Áreas» · [⚙︎ Ajustes de áreas] [✕ Cerrar áreas]. En el menú, el icono de Áreas es la X que la cierra mientras está abierta. |
| Línea de estado | El vehículo («Estación», «Módulo (automático)») y cómo se va («Viaje: el camino real» o «Teletransporte»). |
| Esquema | Un nodo por compartimento a presión con algún sitio al que ir, colocado según el plano real visto desde sus dos ejes más largos (la ISS desde arriba, proa arriba; la Starship de lado, la cubierta 1 arriba y la cubierta de vuelo encima). Las escotillas son las líneas. En el LM, sus puestos (comandante, mente, escotilla delantera, escotilla de acople, ECS, esterilla) según dónde se está de pie, la escotilla de acople en el centro. Donde está ella pone «Aquí». |
| Ajustes (⚙︎ → icono de lista) | **Ir a una tarea**: Viaje / Teletransporte. **Vehículo**: Automático: donde está ella · Nave (Starship) · Estación · Módulo. Son `taskTravel` y `taskVehicle` de `codeship.ajustes`: los mismos de los ajustes de Tareas ([viaje-a-una-tarea.md](viaje-a-una-tarea.md#ajustes-de-tareas)), una sola fuente. «Todos» no sale aquí (un esquema enseña un vehículo); si en Tareas se eligió «Todos», Áreas enseña donde está ella. |

Cada nodo mide al menos 44 × 44 px (64 px de ancho, para su nombre) y ninguno tapa a otro: si el plano real los junta, se separan lo justo y el dibujo crece hacia abajo (`placeNodes`).

## Ir a un área

- **Viaje** (por defecto): el mismo motor de «Ir» de las tareas (`JourneyDriver.goTo`), con el sitio del grafo del área (`estacion:<accesorio>`, `nave:<accesorio>`, `puente:nav`, `modulo:<puesto>`). Al llegar no usa ninguna máquina: se queda allí y lo dice («En: Destiny»). Si hay que volar antes, para donde se vuela con el aviso de siempre (reglas.md §3.5).
- **Teletransporte**: como en las tareas, con fundido y el aviso «Teletransporte (elegido en Áreas)»; si los vehículos no están unidos, la lleva a lo que los une y dice por qué.

## Para más adelante (no hecho)

Berón puede pedir que las misiones usen el mismo mapa: un esquema que resalte el área de la tarea elegida. El esquema ya está pensado para eso: un nodo solo sabe dónde está, cómo se llama y su sitio del grafo (`AreaNode.goal`), que es el mismo que da `taskGoal` para una tarea; bastaría con marcar el nodo cuyo sitio es el de la tarea.

## Archivos

- `src/modules/tasks/application/areas.ts` (puro, con tests): `interiorAreas`, `starshipAreas`, `landerAreas`, `placeNodes`.
- `src/ui/areas-window.ts`, `src/ui/task-settings.ts` (los ajustes compartidos con Tareas).
- `src/journey.ts`: `goTo(sitio, nombre)`.
- Recorrido: PX-42 (`tareas-ajustes`). Casos: HAB-42.
