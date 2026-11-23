# Santuario 1: el santuario de hielo de Cold Sanctuary (rama `santuario1`)

Pedido de Berón (2026-11-18): migrar el santuario 1 de Cold Sanctuary a Codeship. Primero el entorno 3D (edificios,
pisos, áreas, animales, personas, utensilios), con los modelos **categorizados para poder hacer cambios a gran escala**;
después las misiones de jornada ([misiones-y-jornada.md](misiones-y-jornada.md) §3). Berón: «que se terminen todas las
tareas y luego lo veo en conjunto y envío una larga lista de arreglos… que involucren a todos los pisos, o los muebles de
todos los pisos o a todos los humanos».

Se entra desde la pantalla de inicio: nivel 1, «Santuario Terrestre» (`boot.ts` carga `src/sanctuary-one.ts`).

## Qué es en Cold Sanctuary

El «Mesocosmos» de `Assets/Editor/SampleSceneBuilder*.cs`: banquisa de casquetes (lóbulos circulares) y una isla de
tierra, una laguna central con fauna marina, y **edificios-árbol** (`HelixTower`): un tronco de agua de 20 m por el que
se nada, con los pisos en molinete alrededor (un nivel cada 22 m, dos pisos por nivel, primer piso a 64 m), puntas al
final de ramas de agua y, en algunos pisos, un **anillo en U** 8 m por encima (Levels.cs `RingDeck`). Su magia se
conserva (reglas.md §1.2).

## Pedidos de Berón (casi literales, con su estado)

Para que ningún resumen se coma un pedido: cada punto se copia de sus mensajes y se marca al cerrarlo.

**2026-11-18 (primer mensaje):** recrear el entorno 3D (edificios, pisos, animales, áreas, personas, utensilios, todos
los modelos), categorizado para cambios a gran escala; misiones de cocinar, yoga, ejercicio, alimentar animales,
programar mentes de animales, trabajar en el campo, curar personas y animales, cuidar plantas de los edificios,
limpieza…; jornada de Cold Sanctuary (tareas distintas por persona y día); **modal de misiones de jornada** que reutiliza
la de navegación y bloquea/desbloquea por hora/día, en horas libres todas; recompensas: no pasar hambre, compañía, fuerza,
salud.

**2026-11-19 (revisión):**

| # | Pedido | Estado |
| --- | --- | --- |
| 1 | Al acercarse a una máquina, botón para su reto **fuera del menú general, debajo de su botón, naranja** (alerta de que se puede interactuar); igual en las naves, donde hoy va dentro del menú | Hecho: `RootMenu.interact()` (botón `.rm-act` bajo el engranaje); las naves lo usan también (MachinePanel) |
| 2 | Retos de código en máquinas, plantas y demás (los que pidió el primer día) | Hecho: `application/challenges.ts` `retosFor` + `data/retos.ts` (procedimientos reales con fuente; la «mente» de los animales es ficción) |
| 3 | Botón de **Misiones** (modal de jornada) | Hecho: ventana Misiones (`data/misiones.ts`, `domain/workday-missions.ts`): bloqueo por hora y día, libres a partir de las 16:00, recompensas comida/compañía/fuerza/salud |
| 4 | Rehacer los botones de zoom; mandos como los de una **Nintendo Switch**, con transparencia; botones de **correr**, **saltar** y **trepar** | Hecho: `ui/action-pad.ts` con todos los botones de la Switch (2.ª lista: cruceta, L/ZL, −, captura a la izquierda; A/B/X/Y, R/ZR, +, inicio a la derecha); asignados X trepar, A saltar, B correr, cruceta ↑/↓ zoom; los libres, atenuados |
| 5 | Mapa de Áreas en su modo más visible (en el santuario 1, quizá vertical); o un modelo simple como la pantalla de inicio: **cada área una esfera** en su posición | Hecho: Áreas como esferas en su posición (vista inclinada en el S1) |
| 6 | Ajustes de Áreas: **santuario / casquete / edificio** y debajo sus opciones (como las alfombras mágicas); solo se ven sus áreas | Hecho (2.ª lista): como la lista de vehículos de Codeship: Automático (donde está ella), todo el santuario, cada edificio por su nombre (Servicios, Entrenamiento…) y cada casquete; el mapa dibuja el edificio elegido (tronco, pisos y anillos) |
| 7 | **Filtros de categoría** en la lista de Áreas (y lo mismo en Codeship, donde también faltan) | Hecho: chips de categoría (también en Codeship: AreaNode.category) |
| 8 | Las **puertas** de los edificios-árbol no se ven: marco | Hecho: marco ámbar en cada puerta (suelo, pisos y anillos) |
| 9 | **Mascarillas de oxígeno** | Hecho: perchero fuera y estación dentro del agua en cada puerta; las personas se la ponen al nadar |
| 10 | **Alfombras voladoras** y **árboles de la isla** | Hecho: alfombras voladoras con plataformas por piso (`CARPET` en jornada.ts) y abedules de bloques en la isla |
| 11 | Personas que parecen **volar todas juntas**; ninguna se ve haciendo sus tareas de jornada | Hecho: salen escalonados (hasta 60 s) cada uno en su alfombra; en su puesto hacen los pasos del reto de esa máquina (los gestos de `step-show.ts`) |
| 12 | Animales: mejores modelos, **cuerpos de cubos con articulaciones** de Cold Sanctuary (revisar si encaja con three.js o hay algo mejor) | Hecho: `domain/animal-body.ts` + `adapters/three/animal-bodies.ts` (un InstancedMesh por parte, articulaciones por anatomía real) |
| 13 | Restaurante y todas las áreas con **realismo**: lista de equipos, utensilios, ingredientes, maquinaria (pan, harina, queso, kéfir…), investigada con fuentes | Restaurante hecho (`models/cocina-equipo.ts`: equipo real por oficio, utensilios, ingredientes y mesas puestas); el resto de áreas, piso a piso |
| 14 | Usar Unity en su PC para revisar la jerarquía de cada área (preguntado) | Exportado: rama `codeship-export` de Cold-Sanctuary (61 470 objetos con posición, tamaño, malla, color y componentes); se usa piso a piso junto con el código y la investigación |

### Segunda lista (2026-11-19)

| # | Pedido | Estado |
| --- | --- | --- |
| 15 | Animaciones: las personas haciendo sus tareas | Hecho: cada puesto (`Place.work`) reproduce los pasos de su reto |
| 16 | Los retos deben **enfocar** para ver la animación | Hecho: `StepShow` en el S1: ella frente a la máquina, cámara por su hombro en la franja libre de la hoja, cada paso resuelto actuado |
| 17 | Mandos: 4 botones a cada lado; primero todos los de la Switch y luego se asignan | Hecho (ver #4) |
| 18 | Cada humano con su forma y cara, como en Cold Sanctuary (sus fotos) | Hecho: `data/looks.ts` (de CubeHair.cs y diseno-personajes.md, descritos de sus fotos; las fotos no están en el repositorio) + `CubeFigure.dress()` |
| 19 | Icono propio para el reto; **lista de iconos** con dónde se usa cada uno | Hecho: `ui/icon-catalog.ts` (la prueba lo compara con el código: un icono con `usedIn: []` está libre) |
| 20 | Filtros de Áreas como Codeship y por edificio con sus nombres | Hecho (ver #6) |
| 21 | Correr y saltar muy notorios, a máximo esfuerzo | Hecho: `domain/effort.ts` (sprint 6,5 m/s; salto de 50 cm con agacharse, impulso, recoger, bajar y amortiguar), `CubeFigure.run/jump`; en 3.ª persona ella gira hacia donde corre; en 1.ª la cabeza se mueve con la zancada y la vista se abre |
| 22 | Los botones de configuración general, al mando | Hecho: + Misiones, − Áreas, captura Vista (1.ª/3.ª), inicio los ajustes generales (con «Pantalla de inicio», ver #26); el botón naranja sigue arriba. Desde el 2026-11-19 son los mismos en el santuario 3 y en las naves (`ui/game-pad.ts`) |
| 23 | Cada máquina con su animación; lista de animaciones por categoría, con los retos y pasos que las lanzan | Hecho: `data/animaciones.ts` (movimientos, gestos, máquina → movimiento, procedimiento → animación de cada paso) y `application/animations.ts` (`stepAnimation`, `animationTable`, con prueba contra todos los retos); `step-show.ts` `motion()` dibuja cada uno |
| 24 | Troncos de agua conectados al mar; animales marinos y submarino suben; entrar a un piso desde cualquier punto; pisos sin barandilla | Hecho: los troncos bajan a −12 m y son agua abierta (`Water.open`: ningún suelo dentro); se sale a un piso desde 2,4 m por encima; focas y pingüinos suben y bajan por cada tronco; sin barandillas, caída por el borde (`dropTo`) |
| 25 | Nado y vista bajo el agua | Hecho: `CubeFigure.swim`, máscara, niebla azul bajo el agua (no blanca) |
| 26 | El botón de menú no abre el menú árbol antiguo | Hecho: inicio abre los ajustes generales, con una fila para volver a la pantalla de inicio |
| 27 | Parqueaderos de alfombras en la copa y el pie de cada árbol-edificio | Hecho: `parqueadero-alfombras` (ficción) en ambos sitios. Desde la séptima lista, una `estacion-alfombras` como la de los pisos (#56) |
| 28 | Ciclos de vida reales, a escala | Hecho: `data/ciclos-de-vida.ts` (etapas y gestación de Cold Sanctuary donde tiene la especie; el resto, AnAge y ADW) y `domain/life-cycle.ts`: cada familia tiene crías, jóvenes y adultos a su tamaño por la curva de crecimiento, con su nombre («Foca, cría de 1 mes»). Los adultos ya estaban a tamaño real con fuente. En vivo (`application/wildlife.ts`): crecen cada día del juego por la curva real, mueren de viejos y su sitio espera a la próxima época de partos de su especie (calendario real: el día 0 del juego es la fecha de hoy), donde nace una cría junto a su madre |
| 30 | Animales inteligentes con lógica de Cold Sanctuary | Hecho, en el módulo compartido [fauna](fauna.md): etograma (`data/etograma.ts`), deseos (hambre, cansancio, miedo), cadena alimenticia por stats (`data/rasgos.ts`, con fuente: velocidades, masas, éxito de caza): los lobos en manada cazan bueyes almizcleros, renos y liebres; el oso, focas y morsas jóvenes; las orcas, focas y pingüinos en el agua; el zorro, lebratos. Las presas huyen y la cazada deja su sitio hasta la próxima época de partos. Los tímidos (liebres) huyen de Doménica. El nombre dice qué hace cada uno. En su época real entran en celo, buscan pareja y cortejan como su especie («el macho trina bajo el hielo y la ronda en el agua», con fuente en `data/etograma.ts` CORTEJOS); solo nace una cría donde una hembra se apareó; dos machos junto a una hembra se la disputan como su especie (`RIVALIDADES`) y el perdedor se va. Pendiente: cuidar a otros |
| 31 | El submarino sube por los troncos | Hecho: el submarino de obra sale de su bahía por la puerta del tronco, baja hasta la raíz y va bajo el hielo a la laguna, a 1,5 m/s; espera y vuelve (`layout.ts submarineDive`, `motion.ts shuttle`) |
| 29 | Todos los humanos de Cold Sanctuary | Hecho: faltaban Kushal, la Magnate (Nevaeh), Sadhguru y Neo; ya son 33 |

### Tercera lista (2026-11-20)

| # | Pedido | Estado |
| --- | --- | --- |
| 32 | En el gimnasio las animaciones **no encajaban con las máquinas**; revisarlas en vivo | Hecho: cada máquina tiene su estación (`data/estaciones.ts`: el punto bajo su pelvis, hacia dónde mira y a qué altura: asiento, cinta, banco, barra); sube por su lado y hace el ejercicio sobre ella (`StepFrame.mount`). Poses corregidas (curl femoral boca abajo, gemelos sentada, press inclinado, fondos, dominadas, remo australiano, hiperextensiones…) y un reto propio por aparato. Revisadas en vivo las ~45 máquinas de gimnasio, cardio, calistenia, crossfit, dojo y ballet |
| 33 | Música: **pasillos muy estrechos** y una sala casi vacía con tres cubos; recrearla de cero, salas a lujo de detalle, **cada una su piso** | Hecho: auditorio, sala de ensayo, estudio de grabación, cabinas de práctica y sala de orquesta, cada una su piso con su equipo real (`models/musica-aulas.ts`, `floors/musica-aulas.ts`), pasillo central y su reto |
| 34 | Si los pisos son pequeños, **más de una rama por lado** del árbol | Hecho: `layout.ts packFloors`: los pisos más pequeños que la cara del tronco van de dos en dos por lado, a media altura de piso uno del otro (a escala 1,5 no caben dos lado a lado) |
| 35 | Lo mismo para las **aulas**: cada aula para una materia | Hecho: matemáticas, lengua, ciencias, historia, idiomas, arte y sala de estudio, cada una su piso, su equipo y su reto; Nevaeh enseña historia y Neo matemáticas |
| 36 | El botón de reto debe **migrar a los mandos de la Switch** | Hecho: el botón Y del mando (`ui/game-pad.ts`, compartido con el santuario 3 y las naves) se pone naranja y dice «Reto» debajo, como los demás botones, al acercarse; el botón naranja de arriba se oculta cuando hay mando (tecla E) |

### Cuarta lista (2026-11-20)

| # | Pedido | Estado |
| --- | --- | --- |
| 37 | La cocina del restaurante: **muchos cubos que no se sabe qué son** | Hecho: cada uno de los 8 puestos con su equipo dibujado como el del fabricante (fry-top, fregadero con ducha, horno mixto doble, abatidor, inducción, armario de puerta de cristal con producto, marmitas con tapa abierta, braseadoras, barra de sushi con vitrina de neta), el pase con sus lámparas y la mesa de emplatado (`models/cocina-equipo.ts` STATION) |
| 38 | En el gimnasio, **al terminar un ejercicio atraviesa el suelo y cae** | Hecho: al abrir el reto ella queda en el piso de la máquina (antes guardaba la altura de donde venía, p. ej. tras la ruta o el teletransporte de una misión) y al cerrarlo, si no hay suelo libre, vuelve donde estaba (`sanctuary-one.ts` stageAt/offStage). Probado en vivo |
| 39 | Música: dos pisos por lado **con ramas**, no entradas directas al tronco | Hecho: cada piso pequeño está al final de su rama (tubo de agua de 7 × 7 m que sale del tronco, va junto a la cara y entra por la puerta del piso), dos por lado uno junto al otro a la misma altura (`layout.ts` packFloors, `ROOM_BRANCH`) |
| 40 | El mensaje del botón de reto tapa otros botones | Hecho: solo «Reto» bajo la Y, como los demás |
| 41 | **Puerta**: no se entra desde las esquinas altas, hay que bajar hasta el suelo | Hecho y probado en vivo en las 7 posiciones (centro, esquinas altas y laterales): nadando, su cuerpo tumbado cabe hasta lo alto de la puerta y donde acaba el agua cae al piso (`free-walk.ts`, `walk.ts` SWIM_BODY_M) |
| 42 | **Nado en 1.ª persona**: todo blanco en cierta perspectiva y el agua oculta | Hecho: los ojos quedaban justo a la altura de la superficie (el agua se veía de canto, es decir, nada); ahora van 30 cm por encima, y el mar es mate (un plano brillante a ras se volvía del color del cielo) |
| 43 | ¿Los **casquetes** son realistas? ¿Se han investigado? | Ver §Casquetes |

### Quinta lista (2026-11-20)

| # | Pedido | Estado |
| --- | --- | --- |
| 44 | Los pisos pequeños **muy pegados**; el árbol-edificio con **estructura de árbol, espacioso y fácil de navegar**: un piso por lado, 2 grandes por nivel y 4 pequeños, que pueden **nacer en las puntas** | Hecho: `layout.ts packFloors` da niveles de 2 pisos grandes (lados opuestos, en molinete) o de 4 pequeños (uno por lado), cada pequeño al final de su rama de agua (tubo de 7 × 7 m), fuera de los cuadrados de los pisos grandes. Hay tres sitios de punta (la punta, más allá del borde y más allá de ambos) que se turnan nivel a nivel, para que ningún piso pequeño quede encima de otro en 66 m. Lo comprueba una prueba (`layout.test.ts`) |
| 45 | **Artes marciales** en pisos pequeños, un aula por arte | Hecho: dojo de karate (tatami de 8 × 8, makiwaras, kamiza), gimnasio de kickboxing (ring, sacos, pera), sala de MMA (octógono y tapiz de grappling) y dojo de judo (tatami de 10 × 10), cada uno su piso (`floors/musica-aulas.ts` DOJOS) |
| 46 | El santuario 1 muestra un **popup en lugar del nombre fijo** | Revisado en vivo: bajo la Y sale fijo «Reto» desde la publicación de las 12:15 UTC; el mensaje flotante ya no existe |

### Sexta lista (2026-11-20)

| # | Pedido | Estado |
| --- | --- | --- |
| 47 | **Alfombras** como en Cold Sanctuary: una estación por piso, que resalte (¿flotando, en ondas?, ¿un objeto espacial encima?), el botón naranja al pisarla abre la navegación con filtros, cada estación con su ajuste de viaje o teletransporte, vuelo automático sin retos | Hecho: `data/alfombras.ts` pone una estación en cada piso y anillo (donde ya esperaban sus alfombras), en cada copa y en cada pie. Encima de las 8 más cercanas, dos alfombras flotan a un palmo con una onda lenta y un orrery de luz gira (`adapters/three/s1-carpets.ts`, intangible). Al pisarla, «Volar» (naranja o Y) abre la **misma ventana de mapa** que Áreas con solo sus destinos: su edificio entero (pisos, copa y pie) y, desde la copa, también las otras copas y pies. No hace falta una ventana por estación: es una sola, que recibe la estación. Su engranaje guarda el ajuste propio de esa estación (`ui/carpet-travel.ts`). El vuelo es automático (desde la séptima lista, `carpetRoute` por carriles, #57) |
| 48 | En los **modelos 3D de las ventanas** fuera el joystick de cámara y los botones de zoom e «Inclinada»; **rehacer** los modelos (salvo Codeship y la pantalla de inicio) para que parezcan una pieza cerrada | Hecho: `map-window.ts` sin joystick ni botones (giro y zoom con los dedos o la rueda). Áreas, Misiones y Alfombras se dibujan como la pantalla de inicio: anillos de base, cada tronco una línea con sus pisos unidos como ramas, casquetes como contornos, sin rejilla ni cajas. La navegación entre islas del santuario 3, igual (contornos y esferas sobre su tallo) |
| 49 | **Nadar por las ramas** es difícil: viajes largos, visión oscura y borrosa, ramas torcidas; aros en la entrada y en los quiebres; 1 torcida por cada 2 rectas, repartidas en vertical | Hecho: agua del árbol clara (niebla clara de 12–150 m en lugar de 0,5–35 m) y con corriente que lleva ×3; aro de luz en la boca de cada rama y en cada quiebre (`aro-rama`, también en las ramas de las puntas de huerto). Las ramas de los pisos pequeños: dos sitios rectos (justo pasado el cuadrado de los pisos grandes, y un piso más allá) y la punta torcida, turnándose por lado y por nivel. Lo comprueba `reglas.test.ts` |
| 50 | ¿Una **estación de alfombras por piso**? | Sí, como en Cold Sanctuary (#47) |
| 51 | **Ballet** real, en pisos pequeños | Hecho: dos estudios, grande de 15 × 12 m con vestuario y pequeño de 12 × 10 m (Sport England, *Studios for Dance*): suelo flotante con vinilo, espejo con barra doble a 0,86 y 1,07 m, barra lateral, barras del centro, piano del acompañante, sonido, resina, fuente y banco. El reto de barra está en cada barra |
| 52 | **Revisar todos los pisos** que deben rehacerse | Hecho con una medida (`reglas.test.ts`): al menos el 60 % de cada piso con equipo a menos de 3 m. No la cumplían 9: la cría y la carne cultivada (su distribución real es de 26 × 20 m: ahora pisos pequeños), el último piso de habitaciones (ahora con la cocina compartida y la sala común), la guardia (mesa de relevo, taquillas, office, descanso), el textil (más máquinas de coser, segunda mesa de corte y telar), el garaje del submarino (grúa, carga de baterías, compresor de aire, repuestos, banco y lavapiezas) y tres laboratorios (más campanas, HPLC y puestos) |
| 53 | ¿Están **documentadas las reglas** y hay **tests** que griten si un piso o árbol nuevo las rompe? | Sí: [reglas.md](reglas.md) §2.7–2.9 y §5.7, y `sanctuary-one/data/reglas.test.ts` (pisos medio vacíos, aros, ramas torcidas, estación de alfombras en cada piso, copa y pie, destinos, pisos de edificios distintos que se cruzan) junto a los de `layout.test.ts` (un piso pequeño por lado, en su punta, ninguno encima de otro; se llega nadando a cada uno). La residencia se movió 5 m: rozaba a Producción |

### Séptima lista (2026-11-20)

| # | Pedido | Estado |
| --- | --- | --- |
| 54 | En la **base del árbol** todavía hay suelo blanco | Hecho: el hielo se recorta alrededor de cada tronco (`cutTrunkHoles`); el agua del tronco baja al mar. Test «bajo el tronco no hay suelo» |
| 55 | **Tronco ×1,5 y ramas ×2**, con la regla del submarino más grande (dinámica) y sitio para personas y animales | Hecho: `data/paso.ts` toma el mayor de los modelos marcados `travels: "agua"` (hoy el submarino de obra) y le suma 2 m por lado y por encima; tronco de 20 → 30 m de ancho, ramas de pisos de 7 → 14 m, ramas de huerto ×2. Test que lo comprueba con cualquier submarino nuevo. Entrenamiento se movió 20 m al oeste y la residencia 5 m: sus ramas rozaban otros edificios |
| 56 | Desde la estación de **un piso no se podía volar**; las de los pisos vuelan dentro del edificio y las de copa y pie entre edificios | Hecho: cada estación de piso vuela a todo su edificio (pisos, copa, pie); la copa, además, a las otras copas y el pie a los otros pies |
| 57 | Los **vuelos verticales atravesaban estructuras**: ¿trayectos sin colisiones, con tests? | Hecho con **carriles** (`data/alfombras.ts`): cada estación tiene una columna de aire libre desde su piso hasta sobre todas las copas, contando los otros edificios. La alfombra sale a su carril, sube o baja a la altura más baja a la que cruza libre (recta o rodeando el tronco), cruza y baja por el carril de destino. Se recalcula solo si cambia un edificio. `reglas.test.ts` vuela todas las rutas y falla si alguna pasa a menos de 2 m de algo. Descartados los túneles de agua (la alfombra no es un submarino) |
| 58 | Estaciones de piso como **apéndices**, nunca tras bloqueos | Hecho: rellano que sale del borde exterior (o de un lado si está lleno de salas, como en las habitaciones o el ballet pequeño); se comprueba andando desde la puerta en una rejilla de 0,5 m. La del pie, en el hielo cerca de la puerta del tronco, donde el cielo está libre (a veces a 40–70 m: encima están los pisos) |
| 59 | **Alfombras y orrery** a la mitad de altura | Hecho: alfombras a 11 cm (antes 22), orrery a 1,7 m (antes 3,4); también en copas y pies |
| 60 | El **viaje en alfombra** se veía afectado por la cámara | Hecho: la alfombra lleva su propio rumbo; la cámara mira libre y el movimiento no hace nada mientras vuela |
| 61 | **Esferas de los mapas** más pequeñas; ¿asteroides de decoración? | Hecho: esferas de 2,5–6 px (antes 4–10) en Áreas, Misiones y Alfombras, y más pequeñas en la navegación de islas; un cinturón de asteroides grises alrededor del modelo, que gira con él (`asteroidDecor`) |
| 62 | **Yoga**: un piso daba para dos clases | Hecho: 8 pisos pequeños de 14 × 16 m, uno por clase (Hatha y Ashtanga, sala occidental y tradicional, 1 y 2): 8 esterillas en dos filas, tarima del maestro, altar; la tradicional con durries, lámparas y kund |
| 63 | ¿**Revisión de realismo** de todos los pisos? | Hecha y aplicada: ver la tabla siguiente (yoga y calistenia/parkour/crossfit separados en pisos de una actividad) |

### Octava lista (2026-11-21)

| # | Pedido | Estado |
| --- | --- | --- |
| 64 | Pisos enormes llenos de maquinaria para muchísimas personas que no hay: **guardar los edificios actuales** y **reemplazarlos por otros con pisos más pequeños**, hechos para los miembros actuales (casi nunca coinciden todos en un piso) | Hecho: los de antes quedan en `site.ts` `TOWERS_AMPLIOS` (63 pisos, con sus planos en `floors/`; `buildS1Layout(k, o, TOWERS_AMPLIOS)` los vuelve a construir) y en la rama `edificios-amplios`. `TOWERS` tiene 33 pisos |
| 65 | Pisos repetidos: **un solo piso de yoga, uno de aula, el gimnasio en uno** (antes dos); revisar qué pisos pueden ser más pequeños o fusionarse; quizá **fusionar el hospital** | Hecho (`floors/reducidos.ts`): gimnasio (una máquina de placas de cada tipo, peso libre y cardio juntos), una sala de yoga (Hatha y Ashtanga a sus horas), un aula (cada materia a su hora), una sala de música, un estudio de ballet, dojo (judo y karate) y sala de contacto (kickboxing y MMA), calistenia y parkour en un piso, hospital en uno (urgencias, consultas, paritorios, 2 quirófanos, 3 UCI y 2 aislamientos; 24 camas en su anillo), cría y carne cultivada en uno, química y biología un laboratorio cada una, un huerto vertical; fuera los 3 pisos libres de Ciencias |
| 66 | **Columnas** en el tronco y las ramas para orientarse al nadar, como un armazón | Hecho: `TowerShape.frame` (`layout.ts`): un poste en cada esquina del tronco de la raíz al techo, una viga alrededor bajo las puertas de cada nivel, y en cada rama sus cantos y los cuatro postes de su columna. Se dibuja, no es sólido (no estorba al nadar). Test en `reglas.test.ts` |
| 67 | Los pisos **tienen patas** (parecían de mesa): quitarlas; que los levanten **columnas diagonales apoyadas en el tronco** | Hecho: fuera las patas de los pisos y las puntas; cada piso lleva dos tornapuntas de madera del tronco a su cara de abajo (`TowerShape.braces`, test en `reglas.test.ts`) |
| 68 | **Los pisos solo nacen del tronco**; las ramas, solo para los anillos frutales (deshacer las ramas de los pisos pequeños, la regla de rectas y torcidas y los 4 pisos pequeños por nivel) | Hecho: dos pisos por nivel en lados opuestos, cada uno de su tamaño real pegado a su cara (centrado si es más estrecho), con su puerta en el tronco. Tests: «todos los pisos nacen del tronco», «las ramas solo llevan a las puntas» |
| 69 | Las ramas se agrandaron para el submarino: **volver a hacerlas pequeñas** (el submarino ya no pasa por ellas) | Hecho: `paso.ts` `ORCHARD_BRANCH` vuelve al tubo de 10,6 m de Cold Sanctuary; la regla del submarino queda para el tronco y sus puertas |
| 70 | **Aros de puerta** muy anchos: más delgados; aros y columnas **marrones**, **suelo de los pisos marrón**; ¿una imagen para que parezcan de **madera**? | Hecho: aros de 20 cm (antes 50) sin lámpara, aros de rama de 15 cm sin luz propia; aros, armazón, suelos de los pisos y anillos en madera con una textura de tablas dibujada en un lienzo (sin imagen que descargar, `woodTexture` en `s1-models.ts`), puesta por su tamaño real (tablas de 0,5 m). Los acabados propios de cada sala (caucho, tatami, linóleo) siguen encima |

### Novena lista (2026-11-21): el mapa en anillos

| # | Pedido | Estado |
| --- | --- | --- |
| 71 | Los edificios árbol **no deben salir de los casquetes** ni quitar espacio a los animales: que nazcan de **una base artificial propia** (¿barco, isla artificial, nave?) | Hecho: cada árbol nace de **su base negra en el mar** (`site.ts` `BASE`, `layout.ts` `TowerShape.base`): un casco negro de 3 m con su cubierta a la altura del hielo y **10 m para andar** alrededor del tronco, abierta donde el tronco baja al mar. Elegida la base flotante (un casco, como un barco) sobre la isla artificial: es lo que se ve en el mar y no ocupa tierra. Test en `mapa.test.ts` |
| 72 | La base tiene **la estación de alfombras** que viaja entre edificios | Hecho: el pie de cada árbol está en su base (`alfombras.ts`). Donde la copa tapa toda la base (Servicios, Producción, Campos, Residencia) sale un **muelle** negro de 8–35 m hasta cielo abierto, con la estación al final |
| 73 | Más espacio entre árboles: **en los bordes del mapa**; los casquetes y la isla, en el centro | Hecho: los 6 árboles en un anillo de 470 m de radio, a 470 m unos de otros (`TREE_RING_R`); ningún piso ni punta sobre un casquete (test) |
| 74 | En el centro, **un mar circular grande** para ballenas, delfines, focas, peces… | Hecho: `SEA` de 120 m de radio, sin hielo. Los casquetes se han movido enteros alrededor (`CAP_MOVES`; el Sur y la isla juntos), con sus nidos, colonias y arboledas (`onMovedCap`). Ballenas, orcas, focas, morsas y una manada de delfines (nuevo: delfín mular, NOAA) viven en él |
| 75 | Una **estructura de agua** en el aire a ~80 m, más grande que el mar: ¿esfera sobre un tronco como un **reloj de arena**, o **pirámide invertida**? | Hecho, la pirámide (encaja con el agua de cajas del juego y da más agua arriba, donde es más ancha): un **reloj de arena** de agua de 80 m (30 m de lado abajo y arriba, 12 en su cintura) que sale del mar y, encima, una **pirámide invertida** de 264 m de lado arriba (más que el mar, 240) a 165 m. Se nada en ella como en un tronco. Dentro: la otra familia de ballenas, 8 delfines, y delfines y focas que suben y bajan por el reloj de arena (`site.ts` `AQUARIUM`, `layout.ts` `aquarium`) |

### Décima lista (2026-11-22)

| # | Pedido | Estado |
| --- | --- | --- |
| 76 | **Más columnas de madera, como una rejilla**, ajustable en los ajustes | Hecho: un poste y una viga cada 4 m en las caras del tronco (cortados en cada puerta) y un aro cada 4 m en ramas y columnas (`layout.ts` `FRAME.grid`). Ajuste **«Rejilla de madera»**: cada 4, 8 o 16 m, o solo esquinas y niveles (se aplica al recargar). Tests: la rejilla nunca cruza una puerta |
| 77 | La pirámide **parece tener un borde**: quitarlo | Hecho: sin aristas dibujadas |
| 78 | La base, **6/10 de su espacio y con muchos lados**, casi redonda | Hecho: base redonda de 48 lados y 27 m de radio (62 % de la cubierta cuadrada de antes; 3 m libres en las esquinas del tronco, 10 en el centro de sus caras) |
| 79 | ¿La pirámide en **globo**, como un vientre con un **embrión** de un tercio en el centro; más grande que cualquier edificio y con toda la vida marina? | Hecho: sobre el reloj de arena (ahora redondo), un **globo de agua de 240 m** (arriba a 316 m, más alto que cualquier árbol) con un **embrión** curvado de 80 m en el centro (su cordón hasta la placenta en la pared del globo; late a ~140 por minuto). Se nada en él; el embrión es sólido. Ballenas por encima del embrión, delfines por debajo, delfines y focas suben y bajan por el reloj de arena. Las alfombras vuelan por encima del globo |
| 80 | Nadando, **el cielo se ve oscuro**: más transparente, que deje ver fuera | Hecho: en el agua de los árboles y del globo el fondo sigue siendo el cielo y la niebla es el cielo apenas teñido, hasta 700 m (`walk-look.ts`). El mar sigue turbio |
| 81 | **Día y noche** marcados, noche oscura con **luna y estrellas** | Hecho (`adapters/three/day-night.ts`): el sol sale a las 6 por el este y se pone a las 20 por el oeste; cielo azul de día, rosado al amanecer y atardecer, casi negro de noche; 2500 estrellas y una luna llena con halo; luz de luna azulada. Tests en `day-night.test.ts` |
| 82 | Volver a la regla de **pisos del tamaño de la cocina** (forma más simétrica); más espacio entre máquinas y muebles o unir pisos; **crossfit con calistenia**; **más espacio entre pupitres**; espacios grandes para correr | Hecho: todos los pisos de 40 × 40 m (`floors/kit.ts` `FLOOR_SIZE`); las salas más pequeñas se separan hasta ×1,8 (`spreadTo`) o van dos por piso (`composed`): calistenia, parkour y crossfit; yoga y ballet; dojo y sala de contacto; aula y música. La regla de «medio vacío» mide en proporción a lo que se separaron (`reglas.test.ts`). Entrenamiento queda en 5 pisos |
| 83 | **Mitad de distancia** entre los árboles y los casquetes e islas | Hecho: cada árbol a la mitad de su distancia del 21 (`site.ts` `TREE_RING_R`, de 371 a 435 m del centro); ningún piso ni punta sobre un casquete (test) |
| 84 | Alfombras **al doble de velocidad**, acelerando y frenando **como un coche** | Hecho: 12 m/s de crucero (antes 6); arrancan despacio, aceleran a 2,5 m/s², frenan antes de cada giro brusco y al llegar (`domain/motion.ts` `flightSpeed`, tests) |
| 85 | ¿Está todo fusionado en `integracion`? | Sí: cada lista se fusiona y la web se publica sola en cada fusión |

### Undécima lista (2026-11-22, tarde)

| # | Pedido | Estado |
| --- | --- | --- |
| 86 | **Embrión en azules y verdes** | Hecho: piel verde azulada, cordón verde agua, placenta azul |
| 87 | La base del globo es **6/10 del mar entre casquetes e islas**; el globo **sigue esa forma, pixelado**, abriéndose desde la boquilla, una sola estructura con el mar | Hecho (`data/globo.ts`): celdas de 8 m del mar; la capa del pie es el 60 % del mar, la boquilla se estrecha y el globo se abre capa a capa siguiendo los rayos hasta los casquetes; su piel se dibuja cara a cara |
| 88 | **Bases de los árboles cuadradas**, no redondas | Hecho: la cubierta cuadrada de 10 m |
| 89 | Poder **tirarse desde los pisos y anillos** | Ya se puede: los bordes no tienen barrera y la caída es libre (comprobado en el test de paseo). Si en algún sitio no deja, se mira dónde |
| 90 | **Retos de cocina en las mesas de comer** | Arreglado: la mesa del comedor da «Poner y recoger la mesa» (`retos.ts` `COCINA.mesa`) |
| 91 | **Sala de guardia** realista y **junto a la de asambleas** | Hecho: un piso «Asambleas y guardia»; la guardia como un centro de salvamento marítimo (MRCC): 4 puestos con 3 monitores y silla de 24 h frente al muro de vídeo, el jefe de guardia detrás y los instrumentos al otro lado de la puerta, a 1,2 m o más |
| 92 | La regla de **pisos no vacíos**, ajustada | Hecho: la mitad del piso con algo a menos de 3 m, sin alargar los 3 m por la separación (antes pasaban pisos que se veían vacíos) |
| 93 | **Carne cultivada** realista | Rehecho con GFI 2024: biorreactores de tanque agitado de acero con motor, mirilla, sondas y su armario; cabina de bioseguridad II, microscopio invertido, dewar, perfusión con andamios, centrífuga de suelo, formadora con tolva y cinta |
| 94 | **Pupitres pegados** | Hecho: pupitres uno a uno (`aula-pupitre`); el aula en la plaza a 1,5 veces su separación |
| 95 | **Literas al doble de alto** con **escalera vertical** que se sube con «Trepar» | Hecho: cama de arriba a 3,2 m, escalera con peldaños cada 30 cm (EN 747); «Trepar» al pie de la escalera sube hasta 4,5 m (`domain/climb.ts`, `Floor.ladder`) |
| 96 | **Cubos verdes y marrones** de las habitaciones | Eran las macetas frutales y la mesilla: macetas de barro con borde, copas de varias hojas y fruta; mesilla con patas y cajón; armario con puertas |
| 97 | **Revisión de realismo** con puntaje y fuentes, como **regla de creación**, y tests | Hecho (`data/realismo.ts`, `reglas.md` §1.7): 100 puntos (fuente, forma, color, apoyo); 80 y nada en el aire para lo de los pisos de hoy; las piezas a menos de 15 cm se asientan solas; 80 modelos pendientes de rehacer, en una lista que solo baja |
| 98 | **Pisos por afinidad** (taller, gimnasio, plaza, ciencias vacíos; aula lejos de la música) | Hecho: gimnasio con su zona de combate; «Salas» (yoga, judo, ballet y música, una por cuarto); laboratorios (química y biología); mecánica con el garaje; textil con el huerto; el aula en la plaza. 23 pisos |
| 99 | Bajo el mar, **la luz viene de la superficie** y se oscurece con la profundidad; mirando arriba se ve fuera según la profundidad | Hecho: la profundidad del globo se mide hasta su piel más cercana (`globeDepth`), y bajo el mar hasta la superficie; niebla y fondo del agua según ella |
| 100 | **Control de rendimiento** | Hecho: presupuesto en `data/rendimiento.test.ts` (instancias, piezas, sólidos, aguas, caras del globo, sólidos por paso) y `tools/rendimiento-s1.mjs` (llamadas, triángulos y fps en vistas fijas) |

### Decimotercera lista (2026-11-23): retos por objeto, animación por paso, máquina de simulación y microcosmos

Por fases, cada una con su PR.

| # | Pedido | Estado |
| --- | --- | --- |
| 110 | **Cada objeto con su reto propio** (instrumentos, pesas, esterillas, cocina…) | Fase 1 hecha para la banda (batería, guitarra, bajo, teclado, voz, mesa), el dojo (saco, pera, makiwara, judo, ring, MMA, suelo), el gimnasio (10 máquinas de placas, 8 de cardio, Smith, discos, barras, esterilla, bandas, L-sit) y los puestos de la cocina (`data/retos-objetos.ts`). Quedan el hospital, los laboratorios, los talleres y los campos: `retos-propios.test.ts` cuenta los objetos que aún comparten reto (255) y solo puede bajar |
| 111 | **Cada paso con su animación, y se repite hasta el siguiente** | Hecho: al resolver un paso, ella lo hace (ponerse los guantes, la comba, los asaltos…) y lo sigue haciendo hasta que se resuelve o falla el siguiente; al fallar, descansa. 30 movimientos nuevos (música, combate, esterilla, bandas…) con su pose, y un test que impide que un movimiento caiga en la pose por defecto. Guitarra, bajo, baquetas y guantes en sus manos |
| 112 | **Golpeaba al aire con el saco detrás** | Era la estación del saco, que la ponía de espaldas a él; arreglada y con test (de cara a lo que golpea o toca). Estaciones nuevas en la batería, el teclado, los amplificadores, los micrófonos, la mesa y la pera |
| 113 | **Zoom y mover la cámara en el reto**; **encuadre distinto en vista HUD y panel** | Hecho: un dedo gira la cámara alrededor de ella, pellizcar o la rueda acerca y aleja (`reglas.md` §5.7, nueva excepción); el encuadre mide la franja que deja libre la hoja del reto, sea panel o HUD |
| 114 | **Máquina de simulación** para retos de área (ensayo en equipo, servicio al cliente), con otros personajes en sus papeles y la recompensa para todos | Hecho (fase 2): la pecera de Cold Sanctuary (`VirtualizationTank`: 1,8 m de lado, 2,4 m de agua, puerta de dos hojas que se deslizan y campo magnético, marcado como ficción) en Salas, el restaurante y la asamblea (`data/simulacion.ts`, `models/simulacion.ts`, `adapters/three/sim-tank.ts`). Entrada animada (`domain/sim-entry.ts`): se acerca, toma la máscara de la puerta, se abren las puertas, entra, se cierran, va al centro, flota hasta la mitad y se abre en estrella mientras la cámara gira alrededor. Retos de área: el ensayo de la banda (ella canta; batería, guitarra, bajo y teclado los toman otros) y el servicio del restaurante (ella en el pase; dos cocineros, el emplatado y dos clientes). Cada uno hace su parte en su sitio, y al terminar ganan la recompensa todos, nombrados en el aviso |
| 115 | **Microcosmos de Platón** | Hecho (fase 3, [microcosmos.md](microcosmos.md)): la máquina de la sala de asambleas lleva a la Academia de Platón, Atenas, verano de 360 a. C. (palestra, Museo, exedra, olivar sagrado, acequia de Cimón, el Dromos con sus tumbas, la casa de Platón), con su gente, sus días y el ciclo de vida de los insectos-humanos, y una historia de 8 pasos con 6 retos. Se carga solo al entrar y se libera al salir: el límite es el que está abierto, no cuántos haya |

### Duodécima lista (2026-11-22, noche)

| # | Pedido | Estado |
| --- | --- | --- |
| 101 | **Poder tirarse de todos los pisos y anillos** | Probado: en vivo (gimnasio, funcional, plaza) y en `caidas.test.ts` para cada piso (desde tres sitios de cada lado abierto, por lo menos) y cada pieza de anillo de las puntas. El gimnasio tenía máquinas a lo largo del borde; ahora deja 2 m libres |
| 102 | **Sin dojo en el gimnasio**; baile (salsa, bachata, merengue, reguetón…) junto al ballet | Hecho: piso «Combate» (judo, karate, kickboxing y MMA); en «Salas», el ballet junto a la sala de bailes sociales (tarima, espejos, sonido, bola de espejos, tablón de clases), con los espejos hacia el centro para dejar libre el borde |
| 103 | **Filtro de áreas**: pisos que salían como «Pisos libres» | Arreglado (`area-kinds.ts`) y con test: ningún piso amueblado sale como libre |
| 104 | **Regla de distribución**: sin grandes huecos | Hecho (`reglas.md` §2.10): al montar cada piso se igualan las filas y columnas (`evened`) y lo que sobra va a los huecos (`filledHoles`); ningún punto a más de 6 m de algo |
| 105 | **Gimnasio**: al menos 2 de cada tipo, 3 de algunos, todo el piso | Hecho: 10 tipos de máquinas de placas (3 de pecho, jalón, prensa y bíceps), peso libre, abdominales, spinning y cardio, repartidos por zonas |
| 106 | **Terminar los pendientes** de realismo | Hecho: los 80 rehechos (`models/rehechos.ts`) o sujetos con escuadras y postes (`braced`); la lista está vacía |
| 107 | **Nadar dentro del globo** | Arreglado: cada capa del globo frenaba en su superficie; ahora la superficie es la de la columna de agua entera (`surfaceAbove`), y mirando arriba se avanza menos y se sube más |
| 108 | El globo **parecía un útero** | Hecho: sobre la boquilla, una esfera de 140 m de radio; las capas pasan de la forma del mar a círculos desde la boquilla |
| 109 | **Más animales**: ajuste, 4 por persona | Hecho: ajuste «Animales por persona» (3 a 6), 4 por defecto; dentro del presupuesto de rendimiento |

#### Revisión de realismo de los pisos (2026-11-20)

Criterios: fuente real o de Cold Sanctuary, tamaño real de la sala, una función (o una clase) por piso, sin medio vacío (test), se llega a todo desde la puerta (test).

| Pisos | Fuente y tamaño | Veredicto |
| --- | --- | --- |
| Gimnasio, cardio | Cold Sanctuary (FurnishGym, FurnishGymCardio), 36 × 26 m | Bien: sala de fitness abierta, sin clases |
| Calistenia, parkour y crossfit | Cold Sanctuary, antes los tres en 36 × 26 m | Rehecho: tres pisos pequeños, cada zona con su tamaño real (parque de calistenia de 20 × 16 m, sala de parkour de 14 × 16 m, box de crossfit de 16 × 25 m), su suelo y su entrada libre. Los Campos se movieron 30 m al norte: la rama sur de Entrenamiento llegaba a su piso 6 |
| Yoga (8) | BuildYogaHall, 14 × 16 m | Rehecho en esta lista: una clase por piso |
| Ballet (2), dojos (4) | Sport England, WKF, WAKO, IJF, Unified Rules | Bien: tamaños reglamentarios |
| Música (5), aulas (7) | Wenger, Newell, Everest; guías de aulas de secundaria | Bien |
| Restaurante, hospital (3), asambleas, guardia | Cold Sanctuary, 40 × 38 m | Bien: plantas de servicio completas (un hospital real junta urgencias y maternidad en planta baja) |
| Cría, carne cultivada | Cold Sanctuary, 26 × 20 m | Bien desde la sexta lista |
| Química, biología, informática | Cold Sanctuary (PackFloor), 32 × 20 m | Bien: laboratorios con campanas, HPLC y puestos |
| Construcción, mecánica, textil, huertos verticales, garaje del submarino | Cold Sanctuary, 26 × 20 m | Bien; la mecánica está amueblada por nosotros (en Cold Sanctuary solo tiene aseos) |
| Plaza, habitaciones (5) | ResidentialBuilder | Bien |
| Campos (4) | GardenPlot | Bien |

## Casquetes

Los casquetes son la distribución de Cold Sanctuary (`PolarLandscapeBuilder.Islands`: círculos que se solapan, ficción
del juego): hielo flotante en una laguna con edificios encima. Lo que no era real y se ha corregido (2026-11-20):

| Antes | Real | Ahora |
| --- | --- | --- |
| Placa blanca de 1,5 m con 25 cm fuera del agua (17 %) | El hielo marino (densidad ≈ 0,9) flota con una décima parte fuera; el hielo fijo de varios años tiene 2–4 m | 2,3 m de hielo azulado bajo 30 cm de nieve, 25 cm fuera del agua |
| Superficie lisa | El viento talla la nieve en sastrugi, crestas de 0,1–0,5 m alineadas con él (Filhol y Sturm 2015) | Sastrugi cada ~12 m en todos los casquetes, a lo largo del viento del suroeste |
| Solo crestas de presión en los lóbulos «Bosque» | La presión entre placas deja crestas y montículos de hielo roto (*hummocks*) en los bordes ([Pressure ridge](https://en.wikipedia.org/wiki/Pressure_ridge_(ice))) | Hummocks en el borde de cada casquete |
| — | Donde el hielo fijo toca la costa, la marea lo rompe en una grieta paralela a ella (*tide crack*, WMO Sea-Ice Nomenclature) | Grieta de marea donde un casquete toca la isla de tierra |

Siguen siendo ficción, y así se marcan: que haya edificios sobre hielo flotante y la forma de círculos de los casquetes.

## Cambios a gran escala

Todo lo que se ve es una **instancia de un modelo del catálogo**, y cada modelo tiene `category` (máquina, mueble,
utensilio, animal, persona, naturaleza, edificio, terreno…) y `group` (p. ej. `gimnasio-placas`, `cocina-franjas`,
`frutales`, `flora-tundra`). Los arreglos se escriben en **un solo archivo**, `src/modules/sanctuary-one/data/overrides.ts`:

| Arreglo de Berón | Regla |
| --- | --- |
| «Todos los animales un 20 % más grandes» | `categoria: { animal: { escala: 1.2 } }` |
| «Las máquinas de placas en otro color» | `grupo: { "gimnasio-placas": { color: 0x335577 } }` |
| «Quita las toallas» | `modelo: { "gym-toallas": { oculto: true } }` |
| «Cambia cada Smith por una jaula» | `modelo: { "gym-smith": { cambiarPor: "gym-jaula" } }` |
| «Más espacio entre los muebles de todos los pisos del Entrenamiento» | `edificio: { entrenamiento: { separacion: 1.2 } }` |
| «Solo en el restaurante» | `piso: { "servicios:piso-1": { separacion: 0.9 } }` (y `piso[…].modelos[id]` para un modelo de ese piso) |
| «Todos los humanos más altos / Kushal con otra ropa» | `personas: { todas: { altura: 1.05 }, nombres: { Kushal: { ropa: 0x884422 } } }` |

Gana la regla más concreta, campo a campo: categoría < grupo < modelo < edificio < piso. Cambiar la entrada del
catálogo (tamaño, piezas, color) cambia todas sus copias; un piso es una lista de datos en `data/floors/<edificio>.ts`.

## Rendimiento

El móvil tiene que seguir jugando tras cada cambio (Berón, 2026-11-22). Dos controles:

- `data/rendimiento.test.ts`, en cada prueba: instancias (≤ 3 500), piezas dibujadas (≤ 32 000), sólidos (≤ 14 500), aguas (≤ 2 000), caras del globo (≤ 15 000) y sólidos que mira el paseo en un sitio (`WalkIndex.near`, ≤ 3 600). Lo medido el 2026-11-22 está en el test.
- `tools/rendimiento-s1.mjs`, en vivo (vista del iPhone 13): llamadas de dibujo (≤ 500), triángulos (≤ 550 000) y fps en el inicio, el mapa desde arriba, el globo por fuera, bajo el mar a 3, 12 y 30 m y dentro del globo; `--shots` guarda una captura de cada vista. En la nube va con SwiftShader: sus fps solo se comparan consigo mismos.

Si algo pasa un presupuesto, se mira en vivo antes de subirlo.

## Arquitectura (código)

| Pieza | Archivo | Qué |
| --- | --- | --- |
| Catálogo | `data/catalog.ts` + `data/models/*.ts` (base, entrenamiento, servicios, ciencias, produccion, residencia, campos, paisaje) | Una entrada por modelo: categoría, grupo, tamaño real, color, forma (o `parts`: cajas como `KitchenProps.C`), realidad y fuente; `walkThrough` para lo blando (colchón, hierbas) |
| Pisos | `data/floors.ts` + `data/floors/*.ts` | Cada piso: `{modelo, x, z, giro}` en el marco del piso (x a lo ancho, +z lejos del tronco), copiado de su `Furnish*`; `packFloor` = `PackFloor` de Research.cs; `floors/puntas.ts` las puntas |
| Reglas | `data/overrides.ts` | Cambios a gran escala (arriba) |
| Sitio | `data/site.ts` | Lóbulos, laguna, torres con sus pisos (`furnish`), nidos y personal |
| Paisaje | `data/paisaje.ts` | Casquetes silvestres (WildCaps.cs), tundra, icebergs |
| Disposición | `data/layout.ts` | Mundo andable (`walk.ts` del S3), instancias, áreas, puertas por piso (`doorFor`: la más cercana a 5 m con paso libre), anillos, puntas |
| Jornada | `domain/motion.ts`, `data/jornada.ts` | Merodeo de animales, horario de `WorkdayDirector`, rutas reales (puerta → tronco → hielo/mar → tronco → piso) |
| Rejilla | `data/walk-index.ts` | El mundo de paseo por celdas de 32 m (8 000 sólidos): cada paso mira solo alrededor |
| Población | `domain/population.ts` | `PopulationPlan` portado |
| Dibujo | `src/adapters/three/s1-models.ts` | Un `InstancedMesh` por modelo (y color de regla); los animales que merodean se mueven por instancia |
| Escena | `src/sanctuary-one.ts` | Andar/nadar, vista 1ª/3ª, reloj, personal, ventana de Áreas |
| Compartido con el santuario 3 y las naves | `ui/game-pad.ts`, `ui/interaction.ts`, `application/free-walk.ts` (en `aerial-sanctuary`), `adapters/three/walk-look.ts`, `adapters/three/interior/reto-focus.ts` | Mandos de la Switch, botón naranja y elección de reto, andar/correr/saltar/trepar/caer/nadar, poses y vista bajo el agua, el foco del reto (2026-11-19: un solo sistema para todos los niveles) |

## Estado (2026-11-18)

| Parte | Estado |
| --- | --- |
| Casquetes, isla de tierra, mar y laguna | Hecho (rejilla de 5 m; Cold Sanctuary usa 2,5 m) |
| 6 edificios-árbol con troncos, puertas, pisos, ramas, puntas y anillos | Hecho |
| Pisos amueblados | **Todos los que Cold Sanctuary amuebla**: Entrenamiento 16, Servicios 8 (con anillos), Ciencias 5, Producción 6, Árbol de los Campos 4, Residencia 6 (plaza con el ring de almohadas y 30 habitaciones). Los 3 pisos libres de Ciencias siguen libres |
| Ballet y dojo | En obras (andamio y material); su acabado está en el grupo `obra-acabado`, oculto por regla |
| Puntas | Frutales en maceta (uno de cada especie de `FruitCare.All` y otra vuelta); en el Árbol de los Campos, el bancal de su gremio |
| Paisaje | Crestas de presión, ventisqueros, nunataks con liquen y descansaderos en los lóbulos «Bosque»; musgo, sauce ártico, dríada y charcas con algodón ártico en la isla; los dos icebergs con focas y pingüinos |
| Fauna | 13 especies en sus nidos; merodean por su territorio |
| Personal | 29 personas siguen la jornada (8–9 entrenamiento, 9–11 tareas, 11–12 comida, 12–14 tareas, 14–15 entrenamiento, 15–16 tareas, libre, a las 22 a dormir en su cama) por rutas reales |
| Reloj | El día de Cold Sanctuary: 60 min reales (`S1_DAY_REAL_S`); empieza a las 7:48. La hora sale arriba |
| Áreas | Ventana de mapa con todos los pisos, anillos y casquetes; «Ir» la lleva por el camino real (o teletransporte si se eligió en sus ajustes) |
| Misiones de jornada | Diseño en [misiones-y-jornada.md](misiones-y-jornada.md) §3 |

## Simplificaciones (para la lista de arreglos)

- Los equipos son piezas con la huella y la altura reales; desde la exportación de Unity ninguno de laboratorio,
  hospital, gimnasio, cocina ni huerto vertical es ya una caja (`models/ciencias-detalle.ts`, `models/detalle.ts`,
  `models/gimnasio-detalle.ts`, `models/cocina-equipo.ts`).
- La Mecánica: Cold Sanctuary solo pone sus aseos; aquí es un taller real de tractor, barca y submarino
  (`models/mecanica.ts`, distribución nuestra).
- Ballet y dojo están terminados (sin la obra de Cold Sanctuary), con sus retos de barra y de saco.
- Sin la máquina de virtualización (microcosmos) de las salas: es ficción del backlog.

## Distribución nuestra (no sale de Cold Sanctuary)

- La puerta de cada piso: la más cercana a 5 m del eje de su cara con paso libre (Cold Sanctuary: `pickDoors`).
- El puesto de trabajo de cada persona: reparto fijo por turno sobre 15 pisos de trabajo, hasta portar `WorkRoster`.
- Los pasillos de 1,6 m en el primer huerto vertical (con 2,1 no caben sus extras).
- La colonia de petreles níveos en el casquete Norte salvaje; el viento dominante del suroeste.
- Todo el personal vive en el santuario 1; Doménica empieza en la puerta del gimnasio.

## Siguiente

1. La lista de arreglos de Berón (en `overrides.ts` cuando sean a gran escala).
2. La exportación de Unity: compararla con nuestros pisos e investigar para superar a Cold Sanctuary, piso a piso.
   Hechos todos los pisos (restaurante, hospital, laboratorios, carne cultivada, producción, gimnasio, yoga y salas de
   entrenamiento, cría, veterinario, residencia). Herramienta: el `.jsonl` de la rama `codeship-export`.
3. La fachada de fotobiorreactores está completa (arpas del tronco, quillas bajo las ramas, bombas y cuadro); el iceberg a
   la deriva es sólido donde está.
