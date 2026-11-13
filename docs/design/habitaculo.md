# Habitáculo del módulo, ajustes, tareas y puente de consolas

Lo pidió el diseñador: la cabina de aterrizaje cargaba botones de modo (Entrar en la nave, EVA, Entrar en su
mente, Nombres, ☰ Mandos) y una ficha de fase y confianza que estorbaba al aterrizar. Además, el puente era
un panel con todo a la vez. Ahora esas acciones son **máquinas** de sitios por los que Doménica camina. En
pantalla queda lo mínimo para volar.

## Habitáculo del módulo

Es la misma cápsula que el piloto ve desde el asiento (`adapters/three/cockpit.ts`) con el suelo a la altura
de sus pies. Doménica camina por ella con cámara de casa de muñecas: la cámara queda fuera y por encima, y
se quitan las paredes que hay entre ella y la cámara. Con el ojo (V) pasa a 1ª persona.

| Máquina | Qué hace | Sustituye |
| --- | --- | --- |
| Asiento del piloto | Sentarse a pilotar (con la cámara de los ajustes). Una transición corta tapa el corte en el móvil. | — |
| Consola de acople, bajo la escotilla del techo | Desacoplar; el asistente de acople (a menos de 3 km de un puerto); **Entrar en la nave de viaje** o **Entrar en la estación**, según dónde esté acoplado | «Entrar en…», el conmutador Acople |
| Escotilla EVA | Ponerse el traje y salir (solo anclada en un asteroide; si no, dice por qué) | «Salir de la nave» |
| Consola de la mente del asteroide | Fase N de 3, siguiente paso, confianza y niveles, y **Entrar en su mente** / Convencer · nivel N cuando la fase lo permite | La ficha de confianza y el botón del duelo del HUD de vuelo |
| Esterilla de yoga | Sentarse en loto: abre los ajustes generales | «Nombres» y los demás ajustes |

Desde el asiento, **Levantarse** (icono fijo arriba a la derecha, tecla H) la pone en el habitáculo. Al volver
del paseo entra por la escotilla EVA. Al bajar de la nodriza por la espina, llega a la consola de acople.

**Fuentes de tamaño y disposición.** El habitáculo es para dos de pie, con unos 5,5 m³ habitables, entre el
módulo lunar Apolo y Orion:

- Módulo lunar Apolo: 6,7 m³ de cabina y 4,5 m³ habitables, escotilla de acople en el techo y escotilla delantera para salir. https://en.wikipedia.org/wiki/Apollo_Lunar_Module
- Orion: 8,9 m³ habitables para cuatro. https://en.wikipedia.org/wiki/Orion_(spacecraft)
- Crew Dragon: 9,3 m³ presurizados, con el puerto IDSS en el techo. https://en.wikipedia.org/wiki/SpaceX_Dragon_2
- Starship HLS, solo como contraste de tamaño (esclusa aparte). https://en.wikipedia.org/wiki/Starship_HLS

Datos en `src/modules/lander-cabin/data/cabin.ts` (`CABIN_SOURCES`, `LANDER_CABIN`). Las reglas (suelo,
máquina más cercana, camino que rodea los asientos, qué ofrece cada máquina) están en
`src/modules/lander-cabin/domain/cabin.ts`.

## Ajustes generales (solo en una esterilla)

Hay dos esterillas: la del habitáculo del módulo y la del rincón de ejercicio de la nodriza («Sentarse en
loto: ajustes»). Doménica se sienta en loto y se abre una hoja con el mismo aspecto que los retos. Tiene la
misma opción panel/HUD.

| Ajuste | Qué hace |
| --- | --- |
| Nombres | Nombres del Sol, los planetas y los asteroides sobre la vista de vuelo (antes, un botón del HUD) |
| Ayuda de teclado | Muestra las teclas en botones y tarjetas («K desacopla», `Intro`) y las etiquetas de los iconos. Al empezar está encendida sin pantalla táctil y apagada con ella. La primera entrada (tecla o toque) la ajusta, hasta que la jugadora la elige. |
| Vista de retos | Panel u HUD (la misma preferencia que el botón de los retos) |
| Cámara al pilotar | Cabina, exterior, ventral o trasera al sentarse |
| Sonido | Alarmas de embestida e impactos |

Se guardan en `localStorage` (`codeship.ajustes`). La vista de retos sigue leyendo `codeship.retos-ui`.

Otro módulo puede añadir su fila con `SettingsPanel.addRow`. Así entrará, por ejemplo, el modo de respuesta
de los retos de ordenar («Ordenar todo» o «Paso a paso», rama `retos-ordenar`). Código:
`src/modules/settings/domain/settings.ts`, `src/ui/settings-store.ts` y `src/ui/settings-panel.ts`.

## Iconos de raíz

Los mandos de vuelo secundarios son iconos que brotan de una raíz y se recogen solos a los 5 s, como en el
borrador de `recuperar-onedrive`. Hay dos fijos: el ojo, que cambia la cámara (cabina, exterior, ventral,
trasera; 1ª/3ª persona; tecla C), y Levantarse (H). De la raíz salen Aterrizaje (G), Acople (K, solo en
alcance), Tiempo y Centrar.

Cada icono mide al menos 44 px y tiene nombre accesible. La etiqueta se ve con una pulsación larga, al pasar
el ratón o siempre con la ayuda de teclado encendida. Con un reto abierto se ocultan (H26). Código:
`src/ui/root-menu.ts` y `src/ui/icons.ts`.

## Fase y confianza, fuera del vuelo

Durante el aterrizaje el HUD solo muestra lo de volar. La fase («Bennu · fase 2 de 3: aterriza el módulo y
entra en su mente · confianza 25 %»), los pasos y los niveles están en dos sitios: la **consola de la mente**
(la del habitáculo y la del puente) y la ficha del mapa. El duelo se abre desde esa consola.

## Lista de tareas

Un botón **Tareas** (T) en el habitáculo, el puente y la nodriza abre la lista de **todas** las tareas,
agrupadas:

- vuelo y asteroides (fases y niveles de cada asteroide);
- viajes, misión de Nevaeh y nano_net;
- estación (fabricar, refinar, importar, bio, combustible y reparaciones);
- tareas de a bordo (comida, plantas, animales, salud, nave).

Cada tarea tiene **Ir**, que la lleva al sitio por las escotillas abiertas: al asiento, a una máquina del
habitáculo, a una consola del puente, a una máquina del anillo o a una pestaña de la estación. Si el vehículo
no está acoplado, la lleva a lo que los une (el mapa del puente o el asiento) y dice por qué. Código:
`src/modules/tasks/application/task-list.ts` y `src/ui/task-board.ts`.

## Puente de la nodriza: sala de consolas

El puente era un panel con las seis páginas, nano_net y la sonda a la vez. Ahora es el nodo de proa, una sala
a pie con una consola por máquina:

| Consola | Abre |
| --- | --- |
| Navegación | solo la página NAV (mapa, destinos, viajes) |
| Propulsión, Energía y calor, Vida y hábitat, Acople | solo su página |
| Radio y misiones | la página de radio y el registro de misiones |
| nano_net | su ficha de estado |
| Mando de la sonda | la vista de la sonda: solo lo de volar (lanzar, pilotar, posar, recoger) |
| Mente del asteroide | fase, confianza y niveles, y el duelo **por la sonda** cuando está aparcada sobre él |
| Escotilla a la espina | volver a la nodriza |

Cada consola tiene una luz del color de su peor aviso (rojo, ámbar, azul o verde). Bajo el título, una lista
corta dice qué necesita atención. «Volver» desde una página la deja de pie junto a la consola.

**Fuentes.** El nodo es del tamaño del Harmony de la ISS. En el control de vuelo cada sistema tiene su
puesto, y la robótica de la Cupola es un puesto aparte:

- https://en.wikipedia.org/wiki/Harmony_(ISS_module)
- https://en.wikipedia.org/wiki/Flight_controller
- https://en.wikipedia.org/wiki/Cupola_(ISS_module)

Datos en `src/modules/flight-deck/data/bridge.ts` (`BRIDGE`, `BRIDGE_SOURCES`). Sala en `src/bridge.ts`, sobre
la base común `src/walk-room.ts`.

## Casos y recorridos

HAB-01 a HAB-07 en [casos.md](../qa/casos.md). Recorridos PX-07 (`habitaculo-movil`) y PX-08
(`habitaculo-escritorio`), con capturas en `docs/screenshots/habitaculo-*.png`.

## Preguntas abiertas

- La ventana de proa del puente muestra un cielo genérico. ¿Debe mostrar la escena real?
- ¿Debe la ficha del mapa llevar también el botón del duelo, o solo la información?
- ¿Hace falta una esterilla en la estación?
