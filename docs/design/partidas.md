# Partidas guardadas

Pedido de Berón (2026-11-18): «guardar la partida en localStorage» y, en la pantalla de inicio, un engranaje con el
mismo patrón que las demás ventanas de mapa (engranaje → ajustes, icono de lista → volver) para elegir una partida
guardada o jugar sin ninguna (una partida nueva). Cierra HC-06 ([casos.md](../qa/casos.md)).

## Cómo se juega

- **Se guarda sola.** Cada minuto de juego, y en el momento en las ocasiones que importan: al llegar a un sitio
  (cambiar de vehículo, acoplar o desacoplar, atracar, posarse, acabar un viaje o un aterrizaje), al acabar un reto
  (también el duelo de la mente) y al despertar. En el móvil también al ocultarse la página (bloquear la pantalla,
  cambiar de app, recargar o cerrar la pestaña). Dos ocasiones seguidas en menos de 5 s guardan una vez.
  Valores de juego en `src/modules/saves/application/auto-save.ts`.
- **«Continuar»** en la tarjeta del santuario reanuda la partida guardada más reciente que se pueda reanudar.
- **El engranaje** de la pantalla de inicio cambia la lista de santuarios por las partidas guardadas y pasa a icono
  de lista («Volver a los santuarios»). Cada partida dice su número, su santuario, el día a bordo, el vehículo y el
  sitio donde está ella, y cuándo se guardó; la más reciente lleva la etiqueta «Continuar». Cada una tiene «Jugar» y
  «Borrar», de 44 px. «Borrar» pregunta dentro de su fila («¿Borrar la partida 1? No se puede deshacer.» con
  «Borrar» y «Cancelar»), nunca con el diálogo del navegador.
- **«Jugar sin partida guardada»** empieza una partida nueva en la primera ranura libre: nunca escribe sobre una
  partida guardada. Con las 5 ranuras ocupadas la partida nueva se juega sin guardar, y el inicio y la partida lo
  dicen («borra una para guardarla»). Para escribir sobre una ranura, el jugador la borra primero: es su elección.
- Una ranura que no se puede leer sale con ⊘ y por qué (dañada, de una versión antigua o de una más nueva) y solo
  ofrece «Borrar»; nunca rompe la pantalla ni la partida.

## Modelo (hexagonal)

| Capa | Archivo | Qué hace |
|---|---|---|
| Dominio | `src/modules/saves/domain/save-slot.ts` | La ranura: nivel (3 o 6), fecha, día a bordo, resumen (vehículo y sitio) y el estado del nivel. Texto JSON versionado (`format`), con el gancho de migración `MIGRATIONS` (un paso por versión). Leerla nunca lanza: devuelve la ranura o `dañada` / `antigua` / `futura` |
| Dominio | `src/modules/saves/domain/space-state.ts` | La forma del estado del santuario 6 y su comprobación: solo es obligatorio dónde están las naves y ella; el resto, si falta o está roto, se queda como en una partida nueva |
| Dominio | `snapshot()` / `restore()` de cada pieza | Soporte vital (`LifeSupport`, `OpenLoopEcs`), Doménica (`CrewMember`), acuarios, monedero, misiones, cartas, relación con cada asteroide, almacén de la estación, módulo (`Ship`), `FlightComputer.restore`; con `src/core/snapshot.ts`, que lee sin fiarse |
| Aplicación | `src/modules/saves/application/save-book.ts` | Las ranuras del dispositivo detrás de un puerto clave-valor: listar (la más nueva primero), la de «Continuar», guardar en la suya, borrar, la ranura libre. Un fallo de escritura (cuota, modo privado) se dice, no lanza |
| Aplicación | `src/modules/saves/application/auto-save.ts` | Cuándo guardar sola |
| Adaptador | `src/adapters/storage/saved-games.ts` | `localStorage`, qué nivel se puede reanudar y la sesión que pasa el inicio a la partida |
| Adaptador | `src/game-save.ts` | Toma y devuelve el estado de la partida del 6 (desde `main.ts`, con una llamada por fotograma) |
| UI | `src/ui/start-screen.ts`, `src/boot.ts` | «Continuar», el engranaje y la lista |

**Almacenamiento.** Cada ranura es su propia clave, `codeship.partida.<n>` (n = 1…5), para que una rota no se lleve
las demás. La clave antigua `codeship.partida` (solo nivel y fecha, de antes de las ranuras) sale como «Partida
antigua» y se puede borrar. Los ajustes siguen en sus claves (`codeship.ajustes`, `codeship.retos-ui`,
`codeship.retos-ordenar`, `codeship.aterrizaje`) y además viajan dentro de cada partida: al reanudarla vuelven a sus
claves antes de que el juego construya los interiores (la escala y la separación dependen de ellos).

**Versiones.** `SAVE_FORMAT` es 1. Cuando cambie la forma de la ranura o del estado de un nivel se sube y se añade el
paso a `MIGRATIONS`; una partida más vieja sin paso sale como «antigua»; una de una versión más nueva, como «futura»,
y no se toca.

**Por niveles.** La ranura guarda el número del santuario. El 6 comprueba su estado con `checkSpaceState`; el 3 añadirá
su comprobación en `STATE_CHECKS` (`saved-games.ts`) cuando se juegue (rama `s3-escena`). Mientras un santuario no se
pueda jugar, sus partidas se listan con su candado y su porqué, sin «Jugar».

Si reanudar una partida falla a medias, se sigue jugando **sin guardar**, para no estropear su ranura, y se avisa.

## Qué se guarda (santuario 6)

- Días a bordo (el día de la lista) y el reloj de la misión (el giro de los asteroides).
- Dónde está ella: en el puesto del módulo, en su habitáculo (junto a qué puesto), en la cubierta de vuelo de la
  Starship, en las cubiertas de la Starship o en la estación (junto a qué máquina). Al reanudar vuelve allí.
- Sus necesidades: saciedad, forma física, estrés, soledad y días en ingravidez.
- El módulo lunar: posición, velocidad, actitud y giro, a qué está acoplado (Starship o un puerto de la estación),
  el asteroide al que va, su propelente y su casco.
- La Starship: posición, actitud, si está atracada en la estación y su propelente.
- El soporte vital de la estación y de la Starship (aire, agua, comida, tanques, depósitos, temperatura,
  contaminantes, desgaste, averías activas y repuestos) y el del módulo (O₂, cartuchos de LiOH, agua, batería).
- Las despensas: la de la Starship y la de la estación.
- El monedero (créditos y movimientos), las misiones de Nevaeh hechas y la activa, sus cartas (llegadas, leídas,
  misiones cumplidas) y la relación con cada asteroide (fases, confianza, fallos y nivel; de ahí, los persuadidos).
- El almacén de materiales de la estación.
- Los animales adoptados que viven en los acuarios AQH de la Starship y de Kibo: cuántos peces y caracoles, el nombre
  del banco, el agua (nitrato, amonio, algas), el hambre, la salud y la amistad.
- Los ajustes: los generales, el modo de los retos de ordenar y el de aterrizaje.

## Del 3 al 6 (2026-11-18, `s3-lanzamiento`)

Una partida del 3 pasa a ser del 6 al terminar la iniciación ([santuario3-lanzamiento.md](santuario3-lanzamiento.md)):
acoplada la Dragon a la Starship en órbita baja, la misma ranura se escribe como **nivel 6** con un traspaso
(`saves/domain/launch-handover.ts`): los días, los puestos superados y los días del crucero a Bennu por hacer.
`checkSpaceState` lo acepta (y lo comprueba con `checkHandover`); la lista lo enseña como «Starship · Crucero a Bennu».
El santuario aéreo deja el id en `sessionStorage` (`codeship.seguir`) y recarga la página: `boot.ts` sigue esa ranura en el
6 sin pasar por la pantalla de inicio. `GameSave` ve el traspaso: empieza una partida nueva con sus días y con ella en la
cubierta de vuelo de la Starship, y arranca el crucero (`src/bennu-cruise.ts`); su primer guardado deja ya el estado
completo del 6. Sin ranura libre, se queda en el 3 y lo dice. El 6 se sigue empezando también desde la pantalla de inicio.

## Qué no se guarda (todavía)

Al reanudar, esto vuelve como en una partida nueva:

- **Lo que estaba en marcha**: el crucero a Bennu del traspaso (si se recarga a medio crucero, sigue ya en Bennu), un viaje de la Starship, del módulo o de la sonda, un aterrizaje por programa, el
  asistente de acople y el pilotaje a mano. Las naves quedan donde estaban (el módulo libre conserva su velocidad);
  el viaje se programa otra vez. También un reto o un duelo abierto, el paseo espacial (vuelve dentro) y el sueño.
- **Posado en un asteroide**: se guarda la posición junto al suelo, no el anclaje; al reanudar se vuelve a posar.
  La fase de la expedición (persuadido, furioso) sale de nuevo de la relación con el asteroide.
- **La sonda Juventas** (en su dispensador, en vuelo o posada) y los dispensadores.
- **La ira de los asteroides** (amenazas, persecuciones) y los asteroides movidos por su impulsor de gravedad.
- **La nano_net** (núcleos y averías).
- **La estación por dentro de su obra**: módulos y equipos montados después del principio, cola de las máquinas,
  biolaboratorio, piezas y naves del hangar, el catálogo de naves, Bishop, el módulo en el CBM y el brazo.
- **Importaciones en camino**: pedidos, el buzón, el remolcador, el lanzador de masas y los componentes.
- **El catálogo de especies**: la ficha de cada especie (quién llegó, sus nombres) y los animales en camino; los que
  ya viven en un acuario sí se guardan.
- Las lesiones de Doménica, las cartas escritas al momento (averías, pedidos), los cambios de motor o equipo de la
  nodriza y la cámara (vista y giro).
- Todo lo de ficción tras `REAL_ONLY` (anillos, huerto, granja, mascotas, gallinas): no se juega por defecto.

Cada uno de estos puntos es una ampliación del estado (`space-state.ts`) con su `snapshot()` / `restore()` y su test
de ida y vuelta; si cambia la forma, se sube `SAVE_FORMAT` con su migración.
