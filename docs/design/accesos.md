# Accesos: qué se puede hacer en cada vehículo (fase 1)

Petición (2026-11-13): el juego «ha quedado todo amontonado», con demasiados botones y funciones a mano desde cualquier sitio. El rediseño aprobado sigue los vuelos reales (Apolo, Artemis): **cuatro vehículos**, cada uno con su interior y su papel, y **solo se pasa de uno a otro acoplando**. El módulo de aterrizaje tripulado es **distinto** de la nave de viaje.

La **fase 1** solo ordena los accesos: no hay mecánicas nuevas.

## Nombres

| Vehículo | En el juego | En el código |
|---|---|---|
| Estación-fábrica | Estación Nueva Polana | `modules/station`, `StationInteriorMode`, `StationScreen` |
| Nave de viaje | La **nodriza** (Codeship Nodriza) | `Mothership`, `FlightDeck`, `Interior` |
| Módulo de aterrizaje tripulado | **Módulo de aterrizaje**, en corto **módulo** (antes «sonda»; la Codeship Explorer) | `Ship`, `explorerDesign`, ids `"sonda"` (sin cambiar: puertos, pestaña de la bahía, entradas de la estación) |
| Sonda sin tripulación | **Sonda** (Sonda Centinela, cubesat tipo Juventas; ver [subyugacion.md](subyugacion.md)) | `ProbeOps`, `probeDesign`, `ProbeMode`; planos `"sonda"` del hangar |

## Qué hay en cada sitio

| Dónde estás | Qué puedes hacer | Cómo se llega |
|---|---|---|
| **Cabina del módulo de aterrizaje** | Pilotar (mandos, cámara, centrar), asistente de aterrizaje (G; oculto acoplado), acople y desacople (K), nombres en el cielo, tiempo acelerado (X; solo en vuelo libre, lejos de la superficie), anclarse, **Entrar en su mente**, **Salir de la nave** (EVA en Bennu, anclado), acción de la nano_net anclado en el núcleo, aviso de misiones nuevas en el HUD (solo aviso) | Por la escotilla de atraque de la nave de viaje (**Bajar al módulo de aterrizaje**) o de la estación (**Volver al módulo de aterrizaje** / **Salir**) |
| **Nave de viaje: espina** | Escotilla de atraque: **Bajar al módulo de aterrizaje** (si está acoplado aquí) y **Pasar a la estación** (si la nodriza está atracada); escotilla lateral al puente | **Entrar en la nave de viaje** desde la cabina del módulo acoplado; o desde la estación por su puerto de la nodriza |
| **Nave de viaje: puente** | Mapa y programación de viajes (página NAV, M), radio y **Registro de misiones** (COMM), botón **nano_net** (tarjeta de estado), propulsión, energía, vida, acople | Escotilla lateral de la espina, o la **consola de navegación** del anillo |
| **Nave de viaje: anillo** | Tareas de a bordo, radio con **Registro de misiones**, **consola de navegación** (abre el puente en NAV) | Por el radio desde el eje |
| **Estación** | Andar por sus módulos, **Tareas** (pantalla: materiales, refinería, **Repostar**, planos, fabricación, hangar), **bahía de la nave** (consola del Nodo 2, B, o botón en la pestaña Hangar), **Salir** por la escotilla por la que se entró | **Entrar en la estación** desde la cabina del módulo acoplado a su puerto; **Pasar a la estación** desde la espina de la nodriza atracada |
| **Sonda** | Pilotada a distancia desde la nave de viaje: lanzar, posar, entrar en su mente (fase 1), recuperar con el brazo o abandonar ([subyugacion.md](subyugacion.md)) | Botón **Sonda** en la barra de estado del puente de la nodriza |

Reglas:

- Solo se cambia de vehículo **por una escotilla con algo acoplado**. El botón de la cabina dice adónde lleva («Entrar en la nave de viaje» o «Entrar en la estación») y no aparece sin acoplar. Dentro de la nodriza no hay atajo a la cabina: hay que ir a la escotilla de la espina; al entrar, Doménica aparece flotando junto a ella.
- La **bahía** cambia piezas del módulo siempre que se esté en la estación (el módulo está acoplado a ella o a la nodriza atracada). Las de la nodriza, solo con la nodriza atracada en la estación.
- Al llegar un viaje de la nodriza a su punto de aparcamiento, el relevo automático sigue bajando a Doménica a la cabina del módulo, que continúa solo.
- Con `?dev` en la URL sigue el botón remoto «Estación (dev)» para pruebas y capturas.

## Cabina del módulo: botones antes y después (iPhone 13)

| | Barra de vuelo | Además |
|---|---|---|
| Antes, acoplado a la nodriza | 11: Aterrizaje, Desacoplar, Nombres, Mapa, Misiones, nano_net, Puente de la nodriza, Bahía de la nave, Cámara, Tiempo, Centrar | Ir al interior (12 en total) |
| Después, acoplado a la nodriza | 4: Desacoplar, Nombres, Cámara, Centrar | Entrar en la nave de viaje (5 en total) |
| Después, en vuelo libre | 6: Aterrizaje, Acople (si hay un puerto cerca), Nombres, Cámara, Tiempo, Centrar | — |
| Después, anclado en Bennu | Aterrizaje, Nombres, Cámara, Centrar, Salir de la nave | Entrar en su mente / acción de la nano_net |

Teclas: **M** en la cabina solo avisa de que el mapa está en el puente; **B** solo funciona dentro de la estación.

## Capturas

`docs/screenshots/fase1-*-{mobile,desktop}.png` (iPhone 13 y 1280 × 800): 1 cabina del módulo acoplado · 2a llegada a la espina de la nodriza · 2 puente con el mapa (NAV) · 2c puente entero · 2b tarjeta de la nano_net en el puente · 3 bahía abierta en la estación · 3b pestaña Hangar con el botón de la bahía.

## Preguntas abiertas

1. ¿Renombramos también «nodriza» a «nave de viaje» en todos los textos? Ahora conviven: el botón dice «Entrar en la nave de viaje» y el resto, «nodriza».
2. Sin la nodriza cerca no hay mapa: el módulo solo no puede programar viajes (vuela a mano). ¿Es lo que queremos, o el módulo debería tener un piloto automático corto (por ejemplo, «volver a la nodriza»)?
3. La bahía no tiene aún una pestaña para configurar la propia estación (lo pide la tabla del diseño). Queda para otra fase.
4. La acción de la nano_net (convertir, programar o reparar un núcleo) sigue en la cabina porque exige estar anclado en el núcleo. ¿La pasamos a la EVA?
5. Subir del anillo a la escotilla lleva unos 30 s de ascensor. ¿Ponemos un ascensor más rápido o un acceso a la escotilla desde el anillo?
