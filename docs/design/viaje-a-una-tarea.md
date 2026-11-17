# Ir a una tarea: viaje o teletransporte

Petición de Berón (2026-11-14): «Desde la nave elegí la estación en las tareas para ir, porque no sabía llegar, y me dio la impresión de que me teletransportó. Tiene que ser una opción: teletransporte o viaje. En viaje, el personaje sigue la ruta real solo. Se ocultan los mandos de movimiento y sale un botón para parar. La cámara siempre se tiene que poder mover».

## El ajuste

Arriba de la lista de tareas, un interruptor **Viaje** (por defecto) / **Teletransporte** (2026-11-16, Berón: «sería ideal en el modal de tareas en vez de en la esterilla»). Se guarda con los demás ajustes en `codeship.ajustes` (`taskTravel`) y ya no está en la esterilla: tiene un solo sitio.

- **Viaje**: «Ir» calcula el camino real y Doménica lo hace sola.
- **Teletransporte**: lo de antes (aparece en la máquina, por las escotillas abiertas), con un fundido corto y el aviso «Teletransporte (elegido en Tareas)», para que se vea que es una elección y no un fallo.

## El camino real

Un grafo de lugares y traslados con su duración real (`modules/tasks/domain/journey.ts`, puro y con tests); el camino más rápido gana. Los lugares son «sala:sitio» (`anillo:cocina`, `eje:atraque`, `modulo:asiento`, `estacion:impresora`). Los traslados:

| Traslado | Duración | De dónde sale |
|---|---|---|
| Andar por el anillo | distancia / 2,2 m/s (por la puerta de la granja si hace falta) | la velocidad con la que el anillo ya la lleva a una máquina |
| Ascensor del radio | 29,5 s (51 m: acelera a 0,5 m/s², 2 m/s, frena) | `SPOKE_CAR` en `gravity/data/spine.ts` (el mismo coche) |
| Saltos por la espina | suma de `hopSeconds` de la cadena más rápida (escaleras y lanzadores incluidos) | el grafo de saltos de la espina |
| Andar por el puente o el habitáculo | por los pasillos, a 0,9 o 0,55 m/s; sentarse, 2 s | `floorPath` de las salas |
| Saltos por la estación | igual que la espina, con el grafo de la estación | `stationHandrails`, `stationPortals` |
| Escotilla | 3 s; solo abierta si los vehículos están unidos | módulo–nodriza, módulo–estación, nodriza–estación |
| Vuelo del módulo | solo de vuelta a la nodriza: viaje comprimido (`travel.realS`) + acople con el asistente (su perfil de frenado desde 40 m) + 5 s de desacople | `Navigator.landerTrip`, `dockingSeconds` |
| Vuelo de la nodriza | a la estación, con el módulo a bordo o sin él: viaje comprimido (empuje continuo de sus propulsores, tope de 75 s) + unos 5 s de entrada en el dique seco, desde la consola de navegación del puente o del anillo | `Navigator.trip`, `Navigator.carrierFlies` |

**La nodriza viaja; el módulo aterriza** (2026-11-16, [dique-seco.md](dique-seco.md)). El módulo ya no vuela a la estación: para ir allí siempre vuela la nodriza, que entra en el dique seco. Si el módulo está posado o se quedó en la estación, la nodriza va sola.

Los vuelos cambian cómo están unidos los vehículos (dónde está acoplado el módulo, si la nodriza está atracada). Si no hay camino, se dice por qué: primero el motivo de un vuelo que no puede salir (sin combustible, sin xenón, posada, la sonda fuera), después el de una escotilla cerrada.

## Con la Starship (2026-11-17)

Con la nodriza real ([nodriza-starship.md](nodriza-starship.md)) el grafo no tiene anillo, radio ni espina: tiene la sala `nave` (las tres cubiertas en 0 g, con su propio grafo de saltos, el mismo motor que la estación), la escotilla del techo de la cubierta 1 a la cubierta de vuelo, la escotilla de la cubierta 3 al módulo y el túnel de proa a la estación. El vuelo sale de la mesa de navegación del puente. En cada escotilla ella **la abre** (la hoja gira, 1,2 s), pasa flotando o andando y la escotilla se cierra detrás ([viajes.md](viajes.md#trayectos-por-dentro-escotillas-que-se-abren)). Medido en vivo (PX-36):

| Desde → hasta | Camino | Plan |
|---|---|---|
| Asiento del LM → cocina (cubierta 1) | andar a la escotilla del techo, escotilla, saltos por las cubiertas 3, 2 y 1 | 42 s |
| Asiento del LM → Planos (estación) | escotilla, saltos hasta la escotilla de la cubierta de vuelo, escotilla, andar a la mesa NAV, la Starship vuela y atraca (1 h 32 min de juego = 1 min 32 s), andar, escotilla, saltos al túnel de proa, escotilla, saltos en la estación | 2 min 52 s |

## Durante el viaje

- Doménica anda, sube en el coche, salta, cruza escotillas, se sienta y vuela con los mismos controladores que usa la jugadora (no hay otro código de movimiento): `src/journey.ts` los conduce tramo a tramo.
- Se ocultan los mandos de movimiento (palanca de andar, flechas, ▲▼ del ascensor, mandos de traslación de la cabina, botones de máquina). Sale **Parar**: la deja donde está (en el aire, termina el salto y se agarra; en vuelo, el piloto automático suelta los mandos) y devuelve los controles. «Ir» otra vez sigue desde allí.
- La cámara sigue libre: arrastrar mira alrededor (mientras anda sola, gira la vista respecto a hacia dónde anda), el ojo cambia de 1ª a 3ª persona y, sentada, el ciclo de cámaras.
- Una línea abajo a la izquierda: tramo actual («Viaje · 4/7: Subir al eje por el radio») y «Llegada en ~1 min 5 s». En vuelo, la hora sale del propio piloto automático.
- En un tramo de vuelo, la barra lleva **Ver trayecto**: la nave que vuela, a pantalla completa, sobre su ruta dibujada y con la cámara siguiéndola ([dique-seco.md](dique-seco.md#verlo)). La ficha de viaje se oculta durante el viaje porque la barra ya dice lo mismo.
- Al llegar se usa la máquina: empieza la tarea del anillo, se abre la consola del puente, se sienta a pilotar o se abre la pestaña de la estación.
- Si un tramo falla (el vuelo se interrumpe, un salto no llega), se para y lo dice.

## Primera persona por defecto

El anillo, el puente, el habitáculo y la estación empiezan en primera persona, según el ajuste «Vista a pie» (el ojo pasa a tercera durante la visita). En la esterilla se ve desde fuera y, al levantarse, vuelve la vista que tenía.

## Escala del dibujo

Los interiores se dibujan a `WORLD_SCALE` = 1,5 ([escala.md](escala.md)). El plan del puente y del habitáculo está en metros reales y las salas mueven a Doménica en esas mismas unidades (solo el dibujo se multiplica), así que sus tiempos no cambian. La estación se recorre ya escalada (`scaleInteriorPlan`), y el viaje planifica sobre ese mismo plano, con sus saltos ya más largos.

## Tiempos del camino (planificados)

Con la nodriza junto a Bennu y el módulo acoplado (el arranque del juego), medido en PX-16:

| Desde → hasta | Camino | Tiempo |
|---|---|---|
| Anillo → Planos (estación) | consola de navegación del anillo (3 s), la nodriza vuela y entra en el dique seco (15 s), ascensor (30 s), espina (13 s), escotilla de atraque (3 s), saltos (31 s) | ~100 s |
| Asiento del módulo → Planos | escotilla, espina, puente, la nodriza vuela, espina, escotilla de atraque, saltos | ~80 s |
| Anillo → Planos, nodriza ya en el dique | ascensor, espina, escotilla, saltos | ~80 s |
| Anillo → asiento del módulo | ascensor, espina, escotilla, asiento | 54 s |
| Anillo → consola NAV del puente | ascensor, espina (12 s), escotilla del puente, consola | 57 s |

En SwiftShader (sin GPU) el juego va a pocos fotogramas y todo tarda más en reloj de pared.

## Preguntas abiertas

1. ~~¿Está bien que «Ir» mueva la nave de viaje, o preferimos que solo vuele el módulo?~~ Resuelta (2026-11-16): vuela la nodriza; el módulo es para aterrizar ([dique-seco.md](dique-seco.md)).
2. El acople del asistente va en tiempo real (~1–3 min). ¿Lo comprimimos también en el viaje automático?
3. El viaje automático no pasa por los retos de programar el viaje. ¿Es lo que queremos, o el vuelo en modo viaje debería pedir los retos como el mapa?
4. La pestaña Vida (sin biorreactor instalado) e Importar no tienen máquina propia: el viaje lleva a la guantera de materiales y abre su pestaña.
