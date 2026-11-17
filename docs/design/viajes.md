# Viajes: retos de código y el reloj de a bordo

Regla del diseñador (2026-11-17, sustituye el tope de segundos: «no hay problema si tarda minutos»; ampliada antes: el aterrizaje también puede ser por reto, [aterrizaje.md](aterrizaje.md)): «Los aterrizajes son manuales, pero para viajes de la nave y sonda siendo que son muy largos se pueden sustituir por los retos de código, entonces se mueven solos y el tiempo real se reduce de modo que se puede ver a la sonda o nave volar desde su preview pero el tiempo no supera un tope de segundos, en ese tiempo el jugador puede resolver otras tareas».

## Cómo se juega

1. **Programar o pilotar a mano** (reglas.md §3.6). El viaje largo se programa con la cadena de cinco retos de siempre (ordenar, completar, predecir, reparar, especificar), con los números reales de ese viaje ([navegacion.md](navegacion.md)), o se vuela a mano:
   - nodriza o módulo: desde el mapa del puente (NAV) → **Programar viaje**, o **Pilotar a mano** (abajo);
   - sonda: desde su consola en el puente → **Programar viaje a …** (asteroide lejano) o **Programar vuelta a la nodriza**.
2. **Vuela solo.** Al resolver la cadena, el vehículo vuela solo con su física real (la Starship con sus Raptor: quemado, inercia y frenado; el módulo y la sonda con quemado, crucero, vuelta y frenado). El tiempo del juego pasa al **ritmo de a bordo, ×60** (una hora de juego por minuto real) y el viaje dura los minutos que salen (tope de 10 min).
3. **Mientras tanto** (reglas.md §3.8). El viaje sigue solo y se puede dejar la consola para hacer cualquier otra cosa: tareas, cocina, ejercicio, estación, radio. La **ficha de viaje** sale **solo en la consola de ese vehículo** (la cubierta de vuelo para la nodriza, la consola de la sonda para la sonda, la cabina del LM para el módulo); fuera de ella no sale, y el aviso de llegada espera allí a que vuelva. Dice quién viaja y adónde, **cuándo llega en segundos reales**, la fase, la velocidad, lo que falta, la duración real del vuelo y la cámara rápida (×N). Tiene dos botones:
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

- **Starship**: 6 Raptor (3 de vacío de 2530 kN), unos 1600 t; entre los puntos de espera junto a los asteroides vuela a la **velocidad real de las operaciones de proximidad**: **40 cm/s**, como Hayabusa2 al bajar desde su *home position* de 20 km ([JAXA, 2018-09-20](https://www.hayabusa2.jaxa.jp/en/topics/20180920e)); enciende un instante, va por inercia y frena (Δv 0,8 m/s por salto, `chemicalCruiseMS`, [nodriza-starship.md](nodriza-starship.md)). OSIRIS-REx llegó a Bennu a 4 cm/s ([The Planetary Society](https://www.planetary.org/blogs/jason-davis/osiris-rex-arrival.html)). Los 10 cm/s de Hayabusa2 por debajo de 5 km son su bajada a la superficie: aquí, el tramo del módulo. Real (antes: 30 min de inercia, valor de juego).
- **Atraque real en la estación** (nuevo): para en el **Waypoint 1, a 150 m** del puerto, se acerca a **0,07 m/s** (velocidad de contacto, dentro del rango IDSS de 0,05–0,10 m/s), **espera en el Waypoint 2, a 20 m** (el «go/no-go») y acopla. Del Waypoint 1 a la captura tarda **51 min**, como la Crew Dragon en la misión Demo-1 de 2019 ([The Planetary Society](https://planetary.org/articles/crew-dragon-docks)). Real. La espera a 20 m (≈15 min) es lo que deja Demo-1 tras recorrer los 150 m: derivado.
- **Módulo lunar** y **Juventas**: quemado, crucero y frenado con su motor y su masa ([modulo-lunar-juventas.md](modulo-lunar-juventas.md)).

### Tabla para el diseñador

Medido en la partida nueva (nodriza junto a Bennu), con `codeship.nav.trip()` y `probeTravel.trip.time()`:

| Viaje | Distancia | Tiempo de juego (física) | Compresión | Minutos reales |
| --- | --- | --- | --- | --- |
| Starship a la estación: vuelo + atraque | 1,0 km | 41 min (a 40 cm/s) + 51 min = 1 h 32 min | ×60 | **1 min 32 s** |
| Starship a otro asteroide (a 40 cm/s) + último tramo del LM | 7–14 km + 1 km | 5 h 2 min – 9 h 38 min | ×60 | **5–9,6 min** |
| Módulo lunar solo (Bennu, 1 km) | 1,1 km | 51 s | ×60 | 1 s |
| Módulo de vuelta a la Starship | 0,6 km | 31 s (+ acople a ×1, 1–3 min) | ×60 | 1 s + el acople |
| Juventas a Bennu | 1–2 km | 1 h 27 min | ×60 | **1 min 27 s** |
| Juventas a otro asteroide | 7–14 km | 4 h 17 min – 6 h 27 min | ×60 | **4–6,5 min** |
| Cualquier viaje de más de 10 h de juego | — | > 10 h | > ×60 | 10 min (tope) |

Durante esos minutos, a bordo pasan las mismas horas: con el viaje a la estación (1 h 32 min de juego) la tripulación vive 1 h 32 min: ni una comida (hay dos al día, [vida-a-bordo.md](vida-a-bordo.md)). Con un salto de la Starship de 6 a 10 h, un cuarto o casi la mitad del día: puede tocar una comida a bordo durante el salto. Ningún salto de la región pasa del tope de 10 min: todos van a ×60.

**Decidido (2026-11-17):** el salto de la Starship entre asteroides va a la velocidad real de Hayabusa2 (40 cm/s), no a la media hora de inercia de antes. Con la región comprimida (la Starship aparca a 1,35 km; Hayabusa2 esperaba a 20 km), 7–14 km son 5–9,6 min reales. **Abierta:** el módulo lunar baja todavía con su propio plan de empuje (1 km en 51 s de juego); con los 10 cm/s reales de Hayabusa2 serían casi 3 h de juego, 3 min reales.

## Un reloj para todo el mundo

Durante un viaje automático el bucle principal usa la compresión del viaje como paso del mundo (`frameClocks` en `navigation/domain/travel-time.ts`):

- **Reloj de la misión** (física de vuelo, giro de los asteroides, su ira, la batería de la sonda): tiempo × compresión (×60).
- **Vida a bordo y estación** (tripulación, hambre, soporte vital de cada vehículo, máquinas, importaciones): su ritmo de siempre, un día cada 24 min reales, que ahora es el mismo ×60. A bordo pasa exactamente el tiempo del viaje (prueba en `travel-time.test.ts`).
- **Tiempo ×10/×50 a mano** fuera de un viaje (decisión HC-01): acelera igual la misión, la vida a bordo y la estación.
- **Amenaza durante un viaje** (decisión HC-03): si la ira va a por la nave que viaja, el viaje baja a **×1** con el aviso «⚠ Amenaza: viaje a ×1 hasta que pase», y el reloj del viaje no cuenta esos segundos.
- Solo hay un viaje comprimido a la vez.

## Una tarea no vuela una nave (reglas.md §3.5, 2026-11-17)

Berón tocó «Ir» en la tarea de dormir estando en la Starship: la Starship voló sola a la estación, la vio un momento y apareció dentro de la estación con «Parar» y «46 s»; tras «Parar», la escotilla de vuelta decía que no estaba acoplada. Ahora «Ir» **nunca hace volar una nave**: el plan se corta en el primer tramo de vuelo (`upToFlight`), ella anda hasta donde se pilota ese vuelo (la mesa de navegación del puente, o el puesto del comandante del LM) y un aviso dice: «Para «X» primero hay que viajar a la estación: en la mesa de navegación, «Programar viaje» (retos) o «Pilotar a mano»». Si ya está allí, solo sale el aviso. Como «Ir» no vuela, ya no puede dejarla en la estación con la Starship sin atracar (el estado incoherente tras «Parar»). Cuando la nave ha atracado, «Ir» otra vez la lleva andando, por el túnel de proa, hasta la tarea.

## Pilotar a mano la nodriza (reglas.md §3.6, en desarrollo)

En la tarjeta de un destino de la nodriza, junto a «Programar viaje», sale **Pilotar a mano**. Desde la cubierta de vuelo se da el empuje con encendidos cortos, como en las operaciones de proximidad: **−0,1 m/s**, **Parar** y **+0,1 m/s** (hasta 1 m/s), a ×60. El panel dice lo que falta hasta el punto de espera, la velocidad y el Δv gastado, y qué hacer («Da empuje (+): 0,4 m/s como Hayabusa2», «Para en …», «¡Estás en el punto: Parar!»). Parada a menos de 100 m del punto de espera de una estación, el ordenador hace el atraque como la Demo-1 (51 min de juego); lejos de una estación queda aparcada y se baja en el módulo. SpaceX no ha publicado cómo se pilota la Starship: el panel lo dice («Mandos de la Starship: en desarrollo»). Código: `ManualCarrierRun` en `carrier-trip.ts`, `Navigator.flyByHand`, el panel `.carrier-hand` de `src/navigation.ts`.

## Ver trayecto: el vuelo real

«Ver trayecto» (barra del viaje y ficha) es una segunda cámara **sobre la misma escena del espacio**: la Starship (su modelo, a su tamaño real de 52 m), la estación, los asteroides y el Sol en su sitio, con la ruta que vuela dibujada en cian y un anillo donde acaba. No es un esquema: es lo que pasa, a ×60.

- La cámara sigue al vehículo desde detrás con el destino al fondo, a unas 2,2 esloras (antes 170 m por eslora: la Starship se veía diminuta).
- **La cámara se mueve** (regla 3.3): arrastrar gira alrededor del vehículo; rueda o pellizco acercan y alejan (de 0,35× a 12×).
- La ficha de viaje baja al borde inferior para no tapar el vehículo, con botones de 44 px.
- **Nunca atrapa** (reglas.md §3.8). Berón abrió «Ver trayecto» en la consola de la sonda y se quedó sin cámara ni botones: al cerrarlo, la clase de pantalla entera no se quitaba (solo se quitaba al dibujar la vista, y cerrada ya no se dibujaba). Ahora se quita siempre; PX-07 y PX-16 comprueban que la cámara se gira, que se cierra y que vuelven los botones de la consola.

## Trayecto en el menú (reglas.md §5.8–5.9, 2026-11-17)

Mientras un viaje o una operación a distancia está en marcha (la nodriza, el módulo o la sonda viajando o aterrizando), del engranaje del menú brota **Trayecto**, esté donde esté ella. Abre una ventana de solo estado: quién va adónde, la fase, la distancia que falta, cuánto falta en tiempo real y una barra de avance. No tiene «Ver trayecto» ni «Mando», que siguen solo en los mandos de pilotaje del vehículo (§3.8). Al acabar el viaje se cierra sola y el icono deja de brotar ([ux-acciones.md](ux-acciones.md), «Menú árbol general»).

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

Capturas de PX-36 (`docs/screenshots/trayectos-*-movil.png`): 1 escotilla del techo del LM, 2 escotilla a la cubierta de vuelo, 3 aviso de viajar primero, 4 pilotar a mano, 5 «Ver trayecto», 6 atraque, 7 túnel de proa, 8 llegada a Planos, 9–10 bahía con la Starship a escala real y con zoom.

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
