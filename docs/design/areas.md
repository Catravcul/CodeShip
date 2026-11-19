# Áreas: el mapa del vehículo

Petición de Berón (2026-11-17, 18:36): un botón «Áreas» en el menú árbol ([reglas.md](reglas.md) §5.8) que abra el esquema del vehículo donde está ella (Starship, estación o LM), con la idea del mapa de navegación (que abstrae la nave, los asteroides y la estación). Cada área es un nodo; al tocarlo, ella va allí sola, por el camino real o con teletransporte si lo eligió. Un selector cambia de vehículo. Los ajustes de viaje/teletransporte y de vehículo son los mismos que los de Tareas.

## Segunda ronda (Berón, 2026-11-18; [reglas.md](reglas.md) §5.7–5.8): Áreas **replica la ventana de Navegación** (`src/ui/nav-map.ts` y sus estilos): arriba un mapa tridimensional del vehículo que se gira y se amplía; debajo, las áreas con su descripción y el botón de ir.

## Cómo se ve

| Parte | Qué tiene |
|---|---|
| Barra de arriba | Solo botones, como en Navegación: **+** («Acercar»), **−** («Alejar»), **Cenital/Inclinada**, **⚙︎** («Ajustes de áreas») y **×** («Cerrar áreas»), de 44 px. Sin texto encima del mapa. |
| Mapa 3D | Cada área es la caja real del plano (metros, ejes del vehículo): los compartimentos de la ISS, las cubiertas de la Starship con la cubierta de vuelo encima, y en el LM una columna por puesto donde se está de pie. Las escotillas son líneas discontinuas entre las cajas; debajo, una rejilla del suelo. Donde está ella va en verde («· aquí») y la elegida en dorado. **Un dedo arrastrado lo gira, dos dedos pellizcando lo amplían** (la única excepción de §5.7, junto al mapa de Navegación); también se gira con su joystick de cámara y se amplía con + / −. Tocar una caja la elige y la marca en la lista. |
| Lista de debajo | Una línea con el vehículo («Módulo (automático)») y cómo se va («Viaje: el camino real» o «Teletransporte»). Después, cada área: su nombre (con «Aquí» si está ella), su código, **qué hay** (en la ISS y la Starship, el tipo de módulo y lo que se puede usar en él; en el LM, la línea del puesto) y su botón **«Ir»** de 44 px. Tocar la fila (no el «Ir») la elige en el mapa. |
| Ajustes (⚙︎ → icono de lista) | Ocupan el sitio del mapa y la lista. **Ir a una tarea**: Viaje / Teletransporte. **Vehículo**: Automático: donde está ella · Nave (Starship) · Estación · Módulo. Son `taskTravel` y `taskVehicle` de `codeship.ajustes`: los mismos de los ajustes de Tareas ([viaje-a-una-tarea.md](viaje-a-una-tarea.md#ajustes-de-tareas)), una sola fuente. «Todos» no sale aquí (el mapa enseña un vehículo); si en Tareas se eligió «Todos», Áreas enseña donde está ella. |

La ventana ocupa toda la pantalla (`body.in-areas`): el menú árbol se oculta mientras está abierta y vuelve tal como estaba al cerrarla (con su ×, con Escape o al tocar «Ir»).

Ir a un área

- **Viaje** (por defecto): el mismo motor de «Ir» de las tareas (`JourneyDriver.goTo`), con el sitio del grafo del área (`estacion:<accesorio>`, `nave:<accesorio>`, `puente:nav`, `modulo:<puesto>`). Al llegar no usa ninguna máquina: se queda allí y lo dice («En: Destiny»). Si hay que volar antes, para donde se vuela con el aviso de siempre (reglas.md §3.5).
- **Teletransporte**: como en las tareas, con fundido y el aviso «Teletransporte (elegido en Áreas)»; si los vehículos no están unidos, la lleva a lo que los une y dice por qué.

## Todos los niveles (2026-11-19)

La misma ventana (`ui/areas-window.ts`) en las naves y en los santuarios 1 y 3, cada uno con sus datos: cada área es una
esfera en su sitio, y la lista tiene los chips de categoría (en las naves, el tipo de módulo; en el santuario 1, la del
edificio; en el 3, Troncos, Pisos, Instalaciones y Exterior: `aerial-sanctuary/domain/area-category.ts`). Se abre con «−» del
mando de la Switch ([ux-acciones.md](ux-acciones.md)). El alcance por casquete o edificio es del santuario 1; el 3 y las naves
eligen isla o vehículo, como antes.

## Para más adelante (no hecho)

Berón puede pedir que las misiones usen el mismo mapa: un mapa que resalte el área de la tarea elegida. El mapa ya está pensado para eso: un nodo solo sabe dónde está, cómo se llama y su sitio del grafo (`AreaNode.goal`), que es el mismo que da `taskGoal` para una tarea; bastaría con marcar el nodo cuyo sitio es el de la tarea.

## Archivos

- `src/modules/tasks/application/areas.ts` (puro, con tests): `interiorAreas`, `starshipAreas`, `landerAreas`; cada `AreaNode` lleva su caja (`centre`, `half`) y su descripción (`desc`).
- `src/ui/areas-window.ts` (la ventana, con la estructura y los estilos de `nav-map.css`), `src/ui/map-gestures.ts` (arrastrar y pellizcar, compartido con Navegación), `src/ui/task-settings.ts` (los ajustes compartidos con Tareas).
- `src/journey.ts`: `goTo(sitio, nombre)`.
- Recorrido: PX-42 (`tareas-ajustes`). Casos: HAB-42.
