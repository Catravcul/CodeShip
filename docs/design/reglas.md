# Reglas de diseño de Codeship (canon del diseñador)

Estas son las reglas que Berón ha ido fijando. Son **generales y sin excepciones**: cada rama las cumple al implementar, y cada revisión las comprueba con la lista del final. Si una regla choca con otra, se pregunta al diseñador; no se inventa una excepción. Si algo concreto no le gusta al verlo en vivo, lo pedirá él.

Detalle y fuentes: [ux-acciones.md](ux-acciones.md), [escala.md](escala.md), [naves-reales.md](naves-reales.md), [soporte-vital.md](soporte-vital.md), [viaje-a-una-tarea.md](viaje-a-una-tarea.md).

## 1. Realismo

1. **Naves, estaciones, interiores y procesos son reales** o están en desarrollo para un lanzamiento: nodriza = Starship, módulo = Apollo LM, sonda = Juventas, estación = segmento estadounidense de la ISS. Cada dato lleva su fuente y su etiqueta: real, en desarrollo, licencia o ficción.
2. **Lo único ficticio** es el comportamiento de los asteroides: sus mentes y el duelo, la ira, la persecución, el viaje propio, los niveles y nano_net. Las importaciones también se quedan.
3. **Todo lo demás ficticio queda parado** tras `REAL_ONLY` y apuntado en [pendientes.md](../pendientes.md): anillos, granjas, santuario, animales no volados y dique seco.
4. **Soporte vital real (ECLSS)**. Se consume solo donde está la tripulación. Las averías tienen causa (desgaste, obstrucción, contaminación); nunca son al azar.
5. **Los componentes y las naves llegan por importación** desde la Tierra. En el espacio solo se imprimen piezas pequeñas, como en la ISS. Se empieza con el componente de menor capacidad de cada tipo.

## 2. Espacios y exploración

1. **Todo compartimento que existe en la realidad se puede recorrer.** Una puerta nunca sustituye a un área: no vale una puerta «Camarotes» que abre un menú; hay camarotes reales en los que se entra.
2. **Las puertas y escotillas solo dan paso.** Nunca abren catálogos, planos ni menús.
3. **Las ventanas de gestión se abren desde máquinas o consolas** del compartimento donde se hace eso en la realidad. Ejemplos: el catálogo y las cámaras exteriores, en la estación de robótica de la Cupola o en un portátil del módulo; el hábitat de animales, en su rack.
4. **Las dimensiones son reales y están en los datos.** La capa de presentación las amplía con dos ajustes generales: «Escala de interiores» (Real 1× / Cómoda 1,5×) y «Separación» (Real / Amplia 2 m). Se aplican igual a todas las áreas, cabinas incluidas.
5. **Hay al menos 2 m entre elementos con los que se interactúa.** En ingravidez hay asideros en cada uno, más saltos, escaleras y lanzadores.

## 3. Trayectos

1. **Ningún trayecto se teletransporta por defecto.** Entre áreas de una nave o de la estación, ella recorre el camino entero: abre escotillas y puertas y cruza túneles y escaleras.
2. **El teletransporte es una opción del jugador**, en el modal de la tarea, nunca el comportamiento por defecto.
3. **Durante un viaje automático** se ocultan los controles de movimiento, aparece «Parar» y la cámara siempre se puede mover.
4. **Los viajes espaciales siguen la trayectoria real**, con su física y en el sitio real. «Ver trayecto» muestra ese viaje real, no un esquema. Pueden durar minutos reales, porque durante ese tiempo se hacen las tareas de a bordo.

## 4. Acciones, retos y animaciones

1. **Todo se hace con retos de código**: cocinar, cuidar, reparar, mantener, cambiar piezas, yoga, dormir…
2. **Cada paso de un reto tiene animación en su entorno real.** Ella está ante la máquina y se le ven las manos y el objeto, y nada atraviesa nada. Toda animación se revisa en vivo con capturas, no solo con tests.
3. **Mientras hay un reto abierto solo se ven la hoja del reto y la escena.** Lo que el reto necesite mostrar, como el plan de un viaje, va dentro de la hoja o de la escena.
4. **La «Vista panel» de los retos no se cambia.** Los cambios que pida el diseñador para el HUD van solo a la vista HUD, que debe estar disponible en todos los retos, incluidos los planos.

## 5. Interfaz

1. **Botones mínimos en el HUD.** Las acciones viven en máquinas 3D. Los secundarios brotan de un icono raíz.
2. **Los ajustes generales se abren en la esterilla de yoga** de cualquier vehículo que la tenga, en cualquier modo de vista.
3. **La vista por defecto es en primera persona.** La cámara se controla en todos los vehículos y modos.
4. **La lista de tareas tiene todas las tareas**, cada una con «Ir».
5. **Es para móvil primero**: iPhone 13, 390×664 visibles. Los objetivos de toque miden al menos 44 px y nada se solapa.
6. **Los fallos se marcan con forma y color**, nunca solo con color.

## 6. Vida a bordo

1. **Hay 2 comidas al día. Un día dura 24 minutos reales.** La comida sale de la despensa, que se llena con cargueros.
2. **Doménica empieza sola.** Los animales llegan después, desde el catálogo de especies; cada especie tiene descripción, aportes y precauciones. Los animales son amigos, nunca comida.

## 7. Precios

1. **Los precios se pagan en recursos.** Pendiente de decidir: doble (mitad para crear la pieza y mitad de pago) o triple.

## Lista para cada rama y cada revisión

- [ ] ¿Algún dato nuevo sin fuente o sin etiqueta (real, en desarrollo, licencia o ficción)?
- [ ] ¿Alguna puerta que abre algo que no sea un paso? ¿Algún compartimento real que no se pueda recorrer?
- [ ] ¿Alguna ventana de gestión que no se abra desde una máquina o consola de su compartimento?
- [ ] ¿Algún trayecto que se teletransporte sin que el jugador lo haya elegido?
- [ ] ¿Algún paso de reto sin animación en su entorno, o sin revisar en vivo?
- [ ] ¿Se ve algo más que la hoja y la escena mientras hay un reto abierto?
- [ ] ¿Se cumplen la escala, la separación y los toques de 44 px en todas las áreas nuevas?
- [ ] ¿Funcionan los ajustes en la esterilla, el control de cámara y la vista HUD en lo nuevo?
- [ ] ¿Algún dato a escala que no sea real? ¿Alguna excepción a estas reglas? Si la hay, no se mete en el código: se le pregunta al diseñador.
