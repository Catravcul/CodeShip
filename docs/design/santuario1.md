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
| 27 | Parqueaderos de alfombras en la copa y el pie de cada árbol-edificio | Hecho: `parqueadero-alfombras` (ficción) en ambos sitios |
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
