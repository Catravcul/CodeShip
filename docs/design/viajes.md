# Viajes: retos de código y el reloj de a bordo

Regla del diseñador (2026-11-17, sustituye el tope de segundos: «no hay problema si tarda minutos»; ampliada antes: el aterrizaje también puede ser por reto, [aterrizaje.md](aterrizaje.md)): «Los aterrizajes son manuales, pero para viajes de la nave y sonda siendo que son muy largos se pueden sustituir por los retos de código, entonces se mueven solos y el tiempo real se reduce de modo que se puede ver a la sonda o nave volar desde su preview pero el tiempo no supera un tope de segundos, en ese tiempo el jugador puede resolver otras tareas».

## Cómo se juega

1. **Programar.** El viaje largo se programa con la cadena de cinco retos de siempre (ordenar, completar, predecir, reparar, especificar), con los números reales de ese viaje ([navegacion.md](navegacion.md)):
   - nodriza o módulo: desde el mapa del puente (NAV) → **Programar viaje**;
   - sonda: desde su consola en el puente → **Programar viaje a …** (asteroide lejano) o **Programar vuelta a la nodriza**.
2. **Vuela solo.** Al resolver la cadena, el vehículo vuela solo con su física real (la Starship con sus Raptor: quemado, inercia y frenado; el módulo y la sonda con quemado, crucero, vuelta y frenado). El tiempo del juego pasa al **ritmo de a bordo, ×60** (una hora de juego por minuto real) y el viaje dura los minutos que salen (tope de 10 min).
3. **Mientras tanto.** Se puede hacer cualquier otra cosa: caminar por el anillo, tareas, huerto, estación, radio. La **ficha de viaje** (abajo, en cualquier pantalla) dice quién viaja y adónde, **cuándo llega en segundos reales**, la fase, la velocidad, lo que falta, la duración real del vuelo y la cámara rápida (×N). Tiene dos botones:
   - **Ver**: abre la **vista en directo** (una segunda cámara sobre la escena del espacio, en una esquina; arriba en el móvil). Sigue a la nodriza, al módulo o a la sonda con su destino al fondo. «×» o **Ocultar** la cierran.
   - **Mando**: toma el mando (el piloto automático se desconecta; tocar los mandos del vehículo hace lo mismo).
4. **Llegada.** El vehículo llega cerca y devuelve los mandos parado:
   - módulo: a unos 300 m de la superficie; se aterriza **a mano con los indicadores X/Y/Z** o **por programa** (otra cadena de retos), ver [aterrizaje.md](aterrizaje.md);
   - sonda: a unos 300 m del asteroide; posarla (fase 1 de la subyugación, [subyugacion.md](subyugacion.md)) también es a mano o por programa ([aterrizaje.md](aterrizaje.md));
   - sonda de vuelta: a unos 60 m de la bahía; acercarla a 10 m para que la agarre el brazo es manual;
   - nodriza a una estación: atraca sola, como antes (es un atraque, no un aterrizaje).

Solo hay un viaje comprimido a la vez: con la sonda de viaje no se programa la nave, y al revés. La nodriza no se va con la sonda fuera («recógela antes de mover la nodriza»).

## Cuánto dura: un solo reloj, el de a bordo (2026-11-17)

Berón: «El viaje a la estación parece hacerse en segundos y no se ve el camino […] Con días de 24 min, ¿cuál sería el tiempo equivalente para el viaje espacial automático? No hay problema si tarda minutos, ya que en esos minutos se pueden hacer las tareas internas».

**Respuesta.** Un día de a bordo dura 24 minutos reales ([board-time.ts](../../src/core/board-time.ts)), es decir, el juego va a **×60**: **una hora de juego por cada minuto real**. Los viajes automáticos van ahora a ese mismo ritmo (`BOARD_TIME_LAPSE`), así que la nave, el hambre, el soporte vital y la estación avanzan exactamente el mismo tiempo de juego que dura el vuelo. Antes la nodriza iba a ×600 y todo viaje cabía en 75 s; ahora un viaje de *H* horas de juego dura *H* minutos reales. Solo un viaje de más de 10 h de juego se aprieta en el tope de seguridad de **10 minutos reales** (valor de juego).

La física es la de siempre, con los datos de cada vehículo:

- **Starship**: 6 Raptor (3 de vacío de 2530 kN), unos 1600 t; acelera hasta su crucero, va por inercia media hora (valor de juego `coastS`) y frena (`chemicalCruiseMS`, [nodriza-starship.md](nodriza-starship.md)).
- **Atraque real en la estación** (nuevo): para en el **Waypoint 1, a 150 m** del puerto, se acerca a **0,07 m/s** (velocidad de contacto, dentro del rango IDSS de 0,05–0,10 m/s), **espera en el Waypoint 2, a 20 m** (el «go/no-go») y acopla. Del Waypoint 1 a la captura tarda **51 min**, como la Crew Dragon en la misión Demo-1 de 2019 ([The Planetary Society](https://planetary.org/articles/crew-dragon-docks)). Real. La espera a 20 m (≈15 min) es lo que deja Demo-1 tras recorrer los 150 m: derivado.
- **Módulo lunar** y **Juventas**: quemado, crucero y frenado con su motor y su masa ([modulo-lunar-juventas.md](modulo-lunar-juventas.md)).

### Tabla para el diseñador

Medido en la partida nueva (nodriza junto a Bennu), con `codeship.nav.trip()` y `probeTravel.trip.time()`:

| Viaje | Distancia | Tiempo de juego (física) | Compresión | Minutos reales |
| --- | --- | --- | --- | --- |
| Starship a la estación: vuelo + atraque | 1,0 km | 30 min + 51 min = 1 h 21 min | ×60 | **1 min 21 s** |
| Starship a otro asteroide + último tramo del LM | 7–14 km + 1 km | 30 min + 51 s ≈ 31 min | ×60 | **31 s** |
| Módulo lunar solo (Bennu, 1 km) | 1,1 km | 51 s | ×60 | 1 s |
| Módulo de vuelta a la Starship | 0,6 km | 31 s (+ acople a ×1, 1–3 min) | ×60 | 1 s + el acople |
| Juventas a Bennu | 1–2 km | 1 h 27 min | ×60 | **1 min 27 s** |
| Juventas a otro asteroide | 7–14 km | 4 h 17 min – 6 h 27 min | ×60 | **4–6,5 min** |
| Cualquier viaje de más de 10 h de juego | — | > 10 h | > ×60 | 10 min (tope) |

Durante esos minutos, a bordo pasan las mismas horas: con el viaje a la estación (1 h 21 min de juego) la tripulación vive 1 h 21 min: ni una comida (hay dos al día, [vida-a-bordo.md](vida-a-bordo.md)). Con 6 h de Juventas, un cuarto de día.

**Abierta para el diseñador:** el salto de la Starship entre asteroides va por inercia 30 min (valor de juego) y dura 31 s reales. Con la velocidad real de las operaciones de proximidad de Hayabusa2 (decenas de cm/s) 9 km serían 6–25 h de juego, es decir 6–25 min reales. ¿Lo pasamos a esa velocidad?

## Un reloj para todo el mundo

Durante un viaje automático el bucle principal usa la compresión del viaje como paso del mundo (`frameClocks` en `navigation/domain/travel-time.ts`):

- **Reloj de la misión** (física de vuelo, giro de los asteroides, su ira, la batería de la sonda): tiempo × compresión (×60).
- **Vida a bordo y estación** (tripulación, hambre, soporte vital de cada vehículo, máquinas, importaciones): su ritmo de siempre, un día cada 24 min reales, que ahora es el mismo ×60. A bordo pasa exactamente el tiempo del viaje (prueba en `travel-time.test.ts`).
- **Tiempo ×10/×50 a mano** fuera de un viaje (decisión HC-01): acelera igual la misión, la vida a bordo y la estación.
- **Amenaza durante un viaje** (decisión HC-03): si la ira va a por la nave que viaja, el viaje baja a **×1** con el aviso «⚠ Amenaza: viaje a ×1 hasta que pase», y el reloj del viaje no cuenta esos segundos.
- Solo hay un viaje comprimido a la vez.

## Ver trayecto: el vuelo real

«Ver trayecto» (barra del viaje y ficha) es una segunda cámara **sobre la misma escena del espacio**: la Starship (su modelo, a su tamaño real de 52 m), la estación, los asteroides y el Sol en su sitio, con la ruta que vuela dibujada en cian y un anillo donde acaba. No es un esquema: es lo que pasa, a ×60.

- La cámara sigue al vehículo desde detrás con el destino al fondo, a unas 2,2 esloras (antes 170 m por eslora: la Starship se veía diminuta).
- **La cámara se mueve** (regla 3.3): arrastrar gira alrededor del vehículo; rueda o pellizco acercan y alejan (de 0,35× a 12×).
- La ficha de viaje baja al borde inferior para no tapar el vehículo, con botones de 44 px.

## «Fijar destino»: fuera

Berón: «¿Para qué es "Fijar destino"?». Solo cambiaba el destino (el asteroide del puesto de pilotaje) sin programar el viaje. «Programar viaje» ya lo fija antes de abrir los retos, y si no se puede programar (está cerca, falta propelente) el destino queda fijado igual y la ficha dice por qué y que se puede volar a mano. Por la regla de botones mínimos, se quita: cada ficha del mapa tiene un solo botón de acción.

## Trayectos por dentro: escotillas que se abren

Regla 3.1: ningún trayecto se teletransporta por defecto. Revisión de todos los pasos entre áreas (2026-11-17):

| Paso | Antes | Ahora |
| --- | --- | --- |
| «Ir» con la Starship (cubiertas, puente, módulo, estación) | teletransporte con el aviso «el viaje por las cubiertas de la Starship aún no está» | camino real: saltos por las cubiertas (grafo de saltos de la Starship), escotillas, paseo por el puente, vuelo |
| Cubierta 1 ↔ cubierta de vuelo | corte | va al asidero de la escotilla del techo, mira arriba, la hoja se abre (1,2 s), flota a través; arriba la escotilla de bajada está abierta y se cierra detrás |
| Módulo ↔ Starship / estación (escotilla del techo del LM) | corte | anda hasta la escotilla, la hoja redonda se abre, sube; entra flotando por la escotilla de la cubierta 3 o del Nodo 2, que se cierra detrás |
| Starship ↔ estación (túnel de proa) | corte | igual, con la hoja de la escotilla de atraque a cada lado |
| Estación → módulo o Starship | corte | igual (botón de la escotilla o tramo del viaje) |
| «Ver en el mapa» desde el registro de misiones en la Starship | corte a la página NAV | va andando a la mesa de navegación (o se teletransporta si se eligió) |
| Escotillas internas de la ISS (entre módulos) | abiertas | siguen abiertas, como en la ISS durante la jornada |
| Asiento del LM ↔ cabina; la bahía; la pantalla de la estación; la consola de la sonda | — | no son áreas: son el asiento o pantallas de una consola |
| Salida EVA del LM | reto del traje y luego la superficie | sin cambiar (pendiente: hoja de la escotilla delantera) |
| Teletransporte elegido en Tareas | corte con aviso | igual: es la opción del jugador |

Mientras cruza una escotilla en 0 g la cámara se aparta un poco, a un lado dentro del compartimento, para verla a ella con la mano en la escotilla y la hoja girando; los carteles se ocultan. Después vuelve la vista que tenía.

Capturas de PX-36 (`docs/screenshots/trayectos-*-movil.png`): 1 escotilla del techo del LM, 2 escotilla a la cubierta de vuelo, 3–4 «Ver trayecto» (y girado a mano), 5 atraque, 6 túnel de proa, 7 llegada a Planos, 8–9 bahía con la Starship a escala real y con zoom.

Archivos: `src/adapters/three/interior/hatch-leaf.ts` (la hoja), `StationInteriorMode.passHatch` / `arriveThrough` (0 g), `WalkRoom.passHatch` (puente y LM), el grafo `journey-world.ts` (sala `nave`) y `src/journey.ts`.

## La bahía: zoom

Berón: «en la bahía la nodriza se ve muy pequeña, ¿quizá falta un control de zoom?». La bahía dibujaba la nodriza a 1:10 y la estación a 1:4 con la misma cámara. Ahora las dos van **a escala real** y la cámara encuadra cada vista por su tamaño (esfera que la envuelve); el zoom va del 12 % al 250 % de esa distancia, con **rueda** y **pellizco** (dos dedos), y al elegir una pieza la cámara se acerca en proporción. El módulo se ve como antes.

## Archivos

- Dominio: `src/modules/navigation/domain/travel-time.ts` (tope, reparto entre tramos, `TravelClock` con sus estados en-ruta → llegada / cancelado, `worldStep`).
- Casos de uso: `navigator.ts` (cámara rápida de nodriza y módulo, `lapse`, ETA real en `progress()`, puerto `busy`), `probe-trip.ts` (viajes de la sonda: retos, lanzamiento, piloto automático, vuelta a la bahía), `hop.ts` (planificación común del salto) y `autopilot.ts` (ganancias por vehículo).
- Interfaz: `src/ui/trip-chip.ts` y `trip-chip.css` (ficha de viaje), `src/adapters/three/trip-preview.ts` (vista en directo), `src/probe-travel.ts` (botones de la consola de la sonda), `src/navigation.ts` (hoja de retos compartida) y `src/main.ts` (reloj del mundo).

Capturas (`docs/screenshots/viajes-*-mobile.png` en iPhone 13 y `viajes-*-desktop.png` a 1280×800):

1. `viajes-1`: retos del viaje de la nodriza.
2. `viajes-2`: ficha de viaje en la cabina.
3. `viajes-3`: «Ver»: la nodriza en directo.
4. `viajes-4`: en el interior durante el viaje, con la ficha y la vista.
5. `viajes-5`: llegada a 300 m, mandos manuales.
6. `viajes-6`: consola de la sonda con «Programar viaje a…».
7. `viajes-7`: la sonda volando sola.
8. `viajes-8`: en el puente, «Ver» la sonda.
9. `viajes-9`: la sonda espera a 300 m: posarla a mano o por programa ([aterrizaje.md](aterrizaje.md)).

Cada paso bien respondido al programar el viaje dibuja su parte del plan (ruta, empuje, llegada, punto de frenado): [aterrizaje.md](aterrizaje.md#cada-paso-se-ve).
