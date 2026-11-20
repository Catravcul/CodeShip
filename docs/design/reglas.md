# Reglas de diseño de Codeship (canon del diseñador)

Estas son las reglas que Berón ha ido fijando. Son **generales y sin excepciones**: cada rama las cumple al implementar, y cada revisión las comprueba con la lista del final. Si una regla choca con otra, se pregunta al diseñador; no se inventa una excepción. Si algo concreto no le gusta al verlo en vivo, lo pedirá él.

Detalle y fuentes: [ux-acciones.md](ux-acciones.md), [escala.md](escala.md), [naves-reales.md](naves-reales.md), [soporte-vital.md](soporte-vital.md), [viaje-a-una-tarea.md](viaje-a-una-tarea.md).

## 1. Realismo

1. **Naves, estaciones, interiores y procesos son reales** o están en desarrollo para un lanzamiento: nodriza = Starship, módulo = Apollo LM, sonda = Juventas, estación = segmento estadounidense de la ISS. Cada dato lleva su fuente y su etiqueta: real, en desarrollo, licencia o ficción.
2. **Lo único ficticio** es el comportamiento de los asteroides: sus mentes y el duelo, la ira, la persecución, el viaje propio, los niveles y nano_net. Las importaciones también se quedan. En el santuario 3, las áreas que vienen de Cold Sanctuary conservan toda su magia (edificios-árbol, alfombras, submarinos); su isla de entrenamiento es real.
3. **Todo lo demás ficticio queda parado** tras `REAL_ONLY` y apuntado en [pendientes.md](../pendientes.md): anillos, granjas, santuario, animales no volados y dique seco.
4. **Soporte vital real (ECLSS)**. Se consume solo donde está la tripulación. Las averías tienen causa (desgaste, obstrucción, contaminación); nunca son al azar.
5. **Los componentes y las naves llegan por importación** desde la Tierra. En el espacio solo se imprimen piezas pequeñas, como en la ISS. Se empieza con el componente de menor capacidad de cada tipo.
6. **Cada santuario recrea el bioma de un elemento** (Berón, 2026-11-20), con especies reales de una sola región que viven juntas, cada dato con fuente: 1 terrestre, 2 acuático, 3 aire y alturas ([bioma-s3.md](bioma-s3.md): el Karakórum de Hunza en la Isla de las alturas), 4 subterráneo, 5 nucleico, 6 espacial.

## 2. Espacios y exploración

1. **Todo compartimento que existe en la realidad se puede recorrer.** Una puerta nunca sustituye a un área: no vale una puerta «Camarotes» que abre un menú; hay camarotes reales en los que se entra.
2. **Las puertas y escotillas solo dan paso.** Nunca abren catálogos, planos ni menús.
3. **Las ventanas de gestión se abren desde máquinas o consolas** del compartimento donde se hace eso en la realidad. Ejemplos: el catálogo y las cámaras exteriores, en la estación de robótica de la Cupola o en un portátil del módulo; el hábitat de animales, en su rack.
4. **Las dimensiones son reales y están en los datos.** La capa de presentación las amplía con dos ajustes generales: «Escala de interiores» (Real 1× / Cómoda 1,5×) y «Separación» (Real / Amplia 2 m). Se aplican igual a todas las áreas, cabinas incluidas.
5. **Hay al menos 2 m entre elementos con los que se interactúa.** En ingravidez hay asideros en cada uno, más saltos, escaleras y lanzadores.
6. **La gravedad es la real.** En el espacio todo es ingravidez (también el módulo posado en un asteroide) y el joystick mueve la cámara. En la Tierra (santuario 3) hay gravedad: se anda y se nada con el joystick «Moverse», y la cámara tiene su propio joystick.
7. **Los edificios árbol se ven como árboles y son espaciosos** (Berón, 2026-11-19 y 2026-11-20). Por nivel, 2 pisos grandes en lados opuestos o 4 pisos pequeños, uno por lado; ningún piso encima de otro a menos de tres niveles. Los pisos pequeños nacen en la punta de su rama. Las ramas son directas: de media una torcida por cada dos rectas, y las torcidas no se apilan en el mismo lado. Cada rama lleva un aro de luz donde sale del tronco y otro en cada quiebre; el agua del árbol es clara y su corriente lleva a quien nada (×3). Los pisos de edificios distintos nunca se cruzan.
8. **Cada piso tiene su estación de alfombras** (como en Cold Sanctuary), y cada copa y cada pie la suya. La de un piso nace como un **apéndice**: un rellano que sale del borde exterior del piso (o de un lado si ese borde está lleno), nunca sobre su espacio ni detrás de un mueble; se comprueba que se llega andando desde la puerta. Al pisarla sale el botón naranja «Volar» (Y en el mando); abre la ventana de mapa con sus destinos: las de los pisos vuelan dentro de su edificio (pisos, copa y pie); las de la copa, también a las otras copas, y las del pie, a los otros pies. Las alfombras vuelan solas, sin reto, y ni el movimiento ni la cámara cambian el vuelo. Cada estación guarda su propio «viaje o teletransporte».
   **Ningún vuelo atraviesa nada**: cada estación tiene su **carril**, una columna de aire libre (2 m de margen) desde su piso hasta por encima de todas las copas; la alfombra sale al carril, sube o baja a la altura más baja a la que puede cruzar libre (recta o rodeando el tronco), cruza y baja por el carril de destino. Los carriles se calculan del edificio tal como es; `reglas.test.ts` vuela todas las rutas.
9. **Ningún piso queda medio vacío.** Se mide: en un piso amueblado, al menos el 60 % de su superficie tiene algún equipo a menos de 3 m. Si una sala real es más pequeña que el piso, va como piso pequeño en una rama, con su tamaño real (ballet, dojos, aulas, cría).
10. **Una clase por piso.** Si un piso real tiene dos salas de clase (yoga occidental y tradicional), van como dos pisos pequeños.
11. **El vehículo más grande pasa por el árbol con sitio de sobra** (regla dinámica, `data/paso.ts`): el tronco y las ramas se dimensionan con el submarino más grande del santuario 1 (todo modelo marcado `travels: "agua"`) más 2 m a cada lado y por encima para personas y animales. Tronco al menos ×1,5 y ramas ×2 de lo que eran. Bajo el tronco no hay suelo: su agua baja al mar.

## 3. Trayectos

1. **Ningún trayecto se teletransporta por defecto.** Entre áreas de una nave o de la estación, ella recorre el camino entero: abre escotillas y puertas y cruza túneles y escaleras.
2. **El teletransporte es una opción del jugador**, en el modal de la tarea, nunca el comportamiento por defecto.
3. **Durante un viaje automático** se ocultan los controles de movimiento, aparece «Parar» y la cámara siempre se puede mover.
4. **Los viajes espaciales siguen la trayectoria real**, con su física y en el sitio real. «Ver trayecto» muestra ese viaje real, no un esquema. Pueden durar minutos reales, porque durante ese tiempo se hacen las tareas de a bordo.
5. **Una tarea en otro vehículo nunca hace volar una nave sola.** Ella va andando hasta la sala de viajes (el puente) y un aviso le dice que primero tiene que viajar allí.
6. **Todo vuelo tiene dos modos: manual y por reto (automático).** Esto vale para la nodriza, los viajes y los aterrizajes de la sonda y del módulo.
7. **El brazo robótico y los paseos espaciales siguen los procedimientos reales.**

8. **Los viajes y las operaciones a distancia siguen solos.** Una vez programados, ella puede dejar los mandos y hacer tareas en el interior. «Ver trayecto», «Parar», el tiempo que falta y la llegada solo aparecen en la consola de ese vehículo. Nunca se quedan atrapados la cámara ni los botones. Lo mismo vale para la sonda, la nodriza y el módulo.
9. **El aterrizaje automático muestra adónde va**: el sitio, la distancia y el tiempo que falta.

## 4. Acciones, retos y animaciones

1. **Todo se hace con retos de código**: cocinar, cuidar, reparar, mantener, cambiar piezas, yoga, dormir…
2. **Cada paso de un reto tiene animación en su entorno real.** Ella está ante la máquina y se le ven las manos y el objeto, y nada atraviesa nada. Toda animación se revisa en vivo con capturas, no solo con tests.
3. **Mientras hay un reto abierto solo se ven la hoja del reto y la escena.** Lo que el reto necesite mostrar, como el plan de un viaje, va dentro de la hoja o de la escena.
4. **La «Vista panel» de los retos no se cambia.** Los cambios que pida el diseñador para el HUD van solo a la vista HUD, que debe estar disponible en todos los retos, incluidos los planos.
5. **Cada equipo se ve como el real** (cinta, bicicleta, pesas, acuario con sus animales, refugio), y cada uno tiene su propia animación. Un asidero solo no representa una máquina.
6. **El ejercicio se hace sobre la máquina** (Berón, 2026-11-20): sentada en su asiento, tumbada en su banco, de pie en su cinta o bajo su barra, mirando hacia donde se usa. Cada máquina tiene su estación (santuario 1: `data/estaciones.ts`); los pasos de preparar y limpiar se hacen de pie a su lado.

## 5. Interfaz

1. **Botones mínimos en el HUD.** Las acciones viven en máquinas 3D. Los secundarios brotan de un icono raíz.
2. **Los ajustes generales se abren en la esterilla de yoga** de cualquier vehículo que la tenga, en cualquier modo de vista.
3. **La vista por defecto es en primera persona.** La cámara se controla en todos los vehículos y modos.
4. **La lista de tareas tiene todas las tareas**, cada una con «Ir».
5. **Es para móvil primero**: iPhone 13, 390×664 visibles. Los objetivos de toque miden al menos 44 px y nada se solapa.
6. **Los fallos se marcan con forma y color**, nunca solo con color.
7. **La cámara se mueve solo con joystick.** Los mandos imitan los de una Nintendo Switch (dos sticks redondos y botones de acción redondos: correr, saltar, trepar), semitransparentes para no tapar la vista (Berón, 2026-11-19). Nunca se arrastra la pantalla para mover la cámara; donde haya cámara movible hay un joystick de cámara. **Todos los niveles comparten los mismos mandos** (`ui/game-pad.ts`, Berón 2026-11-19: «un solo sistema, no copias»): la cruceta ↑/↓ acerca y aleja, «+» abre la lista del nivel (Misiones en el santuario 1; Tareas en el 3 y en las naves), «−» Áreas, captura la Vista (1.ª/3.ª persona), inicio los ajustes generales (con la salida a la pantalla de inicio) e Y, en naranja, el reto o la máquina que hay al alcance. Donde hay gravedad, B corre, A salta y X trepa (`aerial-sanctuary/application/free-walk.ts`); en ingravidez esos botones salen apagados. Los mandos se ocultan con los retos, el pilotaje manual, las ventanas a pantalla completa, los viajes automáticos y las pantallas de las consolas. Única excepción: el mapa tridimensional de las ventanas de mapa se gira y se amplía con el dedo; por eso esos mapas no llevan joystick de cámara ni botones de zoom o de inclinar (Berón, 2026-11-20). Sus modelos son una pieza cerrada de líneas y esferas, como la pantalla de inicio y Codeship: anillos de base, troncos como líneas con sus pisos unidos, casquetes e islas como contornos; nada de rejillas ni cajas que parezcan un trozo de un mapa mayor. Son un solo modelo ([santuario3-iniciacion.md](santuario3-iniciacion.md), decisión de Berón del 2026-11-18): Navegación, Áreas y la pantalla de inicio; más adelante, la navegación entre islas y las misiones.
8. **Menú árbol general.** Un icono raíz (engranaje) que al pulsarlo se vuelve una X. Debajo brotan Vista, Tareas y los botones que apliquen en ese momento (por ejemplo Trayecto). Cada botón que abre una ventana se vuelve X para cerrarla. Dentro de un panel, el engranaje cambia la lista por sus ajustes y pasa a icono de lista para volver.
   - **El menú solo se cierra con su X.** Nunca se cierra solo al pulsar otros botones; puede quedarse abierto indefinidamente.
   - **Con los mandos de la Switch**, lo que está en ellos (Vista, Tareas o Misiones, Áreas) no brota del engranaje: el engranaje solo sale si queda algo más (Trayecto durante un viaje, los botones propios de un modo).
   - **Se oculta un momento solo** durante los retos (el pilotaje manual cuenta como reto) y con las ventanas que ocupan casi toda la pantalla (Tareas, Misiones), que toman el ancho completo y tienen su propio cierre. Al cerrarlas vuelve tal como estaba.
   - **Las ventanas de máquinas y áreas no se abren solas.** Cuando hay algo con lo que interactuar (una máquina, su reto, una planta, un animal), se enciende en naranja **el botón Y de los mandos de la Switch**, con su nombre corto debajo como los demás botones («Reto», o «Cerrar» con la tarjeta abierta; el nombre entero, «Reto: <cosa>», es su nombre accesible) (Berón, 2026-11-20: «el botón de reto debe migrar a los mandos de switch»; tecla E). El toque que abre una tarjeta con la Y no pulsa lo que la tarjeta pone bajo el dedo (`ui/action-pad.ts`); donde no hay mandos (una consola a pantalla completa) sale **un botón naranja fuera del menú, justo debajo de su botón raíz** (2026-11-19: es una alerta de que se puede interactuar). Solo se ve mientras hay algo cerca. Es el mismo en todos los niveles (`ui/interaction.ts`): si lo que hay cerca da un reto dice «Reto: <cosa>» con el icono de reto; si es otra máquina (una escotilla, una pantalla, un ascensor), su nombre con el icono de máquina. La misma regla en todos los niveles, sin excepciones (2026-11-19): el botón «Reto: <cosa>» pasa por `chooseReto`: con un reto lo abre directamente; con varios (o uno cerrado, en gris con su motivo) primero se elige cuál (`RetoPicker`); si la máquina tiene además otras acciones (una pantalla, una escotilla), la elección trae «Ver la máquina», que muestra su tarjeta. Las máquinas sin reto (escotilla, pantalla, ascensor, navegación) siguen mostrando su tarjeta, y el botón es la X que la oculta. Al abrirse el reto, la cámara la enfoca junto a la máquina en la franja que deja la hoja, con la misma lente en todos los niveles (`adapters/three/interior/reto-focus.ts`).
   - **Áreas replica la ventana de Navegación**: arriba un mapa tridimensional del vehículo que se gira y se amplía; debajo, las áreas con su descripción y el botón de ir. En todos los niveles cada área es una esfera en su sitio y la lista tiene los filtros de categoría (cada nivel con sus datos). El alcance del engranaje es el mismo en todos: «Automático: donde está ella», «Todo» y cada nivel de la jerarquía del sitio (santuario 1: edificio o casquete; santuario 3: isla → edificio → piso; naves: vehículo → módulo o cubierta → compartimento).
   - **Tareas en «Automático»** muestra solo las del vehículo donde está ella. Los filtros de grupo van en la lista.
9. **La vista queda libre.** No se queda ninguna ventana fija en pantalla al cerrar un reto o una vista. La ventana de Trayecto del menú solo muestra el estado; «Ver trayecto» y tomar el mando solo están en los mandos de pilotaje.

## 6. Vida a bordo

0. **Las instalaciones funcionan en todos los vehículos que las tienen.** Si la cocina, la esterilla, el ejercicio, el sueño o las reparaciones funcionan en la estación, también funcionan en la nodriza, y al revés.

1. **Hay 2 comidas al día. Un día dura 24 minutos reales.** La comida sale de la despensa, que se llena con cargueros.
2. **Doménica empieza sola.** Los animales llegan después, desde el catálogo de especies; cada especie tiene descripción, aportes y precauciones. Los animales son amigos, nunca comida.

## 7. Precios

1. **Los precios se pagan en recursos.** Pendiente de decidir: doble (mitad para crear la pieza y mitad de pago) o triple.

## Lista para cada rama y cada revisión

- [ ] ¿Algún dato nuevo sin fuente o sin etiqueta (real, en desarrollo, licencia o ficción)?
- [ ] ¿Alguna puerta que abre algo que no sea un paso? ¿Algún compartimento real que no se pueda recorrer?
- [ ] ¿Alguna ventana de gestión que no se abra desde una máquina o consola de su compartimento?
- [ ] ¿Alguna tarea que haga volar una nave sola? ¿Algún vuelo sin modo manual y modo por reto?
- [ ] ¿Algún equipo que sea solo un asidero o que comparta animación con otro? ¿Algún ejercicio que se haga en el aire, junto a su máquina en vez de sobre ella?
- [ ] ¿Alguna instalación que funcione en un vehículo y no en otro? ¿Algún viaje que bloquee la cámara o que no deje hacer tareas mientras sigue?
- [ ] ¿Algún trayecto que se teletransporte sin que el jugador lo haya elegido?
- [ ] ¿Algún paso de reto sin animación en su entorno, o sin revisar en vivo?
- [ ] ¿Se ve algo más que la hoja y la escena mientras hay un reto abierto?
- [ ] ¿Se cumplen la escala, la separación y los toques de 44 px en todas las áreas nuevas?
- [ ] ¿Funcionan los ajustes en la esterilla, el control de cámara y la vista HUD en lo nuevo?
- [ ] ¿Alguna cámara que se mueva arrastrando la pantalla o sin joystick? ¿Algún botón suelto fuera del menú árbol? ¿Alguna ventana fija que tape la vista?
- [ ] ¿Algún piso o edificio árbol que rompa §2.7–2.9? Lo dicen los tests de `sanctuary-one/data/reglas.test.ts` y `layout.test.ts`.
- [ ] ¿Algún dato a escala que no sea real? ¿Alguna excepción a estas reglas? Si la hay, no se mete en el código: se le pregunta al diseñador.
