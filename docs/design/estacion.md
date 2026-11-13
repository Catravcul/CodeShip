# Estación espacial: materiales, planos, fabricación y hangar

Petición de Berón (2026-11-12): «Las piezas nuevas se fabrican con los recursos obtenidos. Tenemos planos y, cuando tenemos los recursos necesarios, podemos construirlas. Podría haber una estación espacial con la maquinaria para crear componentes, y allí se guardarían también todas nuestras sondas y naves».

## Cómo se juega

```
Persuadir un asteroide → la bodega se llena con su roca real → Descargar en la estación
      → Refinería (cadena de retos + horas de máquina) → materiales refinados
      → Planos: Fabricar (cadena de retos + horas) → la pieza o el módulo de aterrizaje llega al hangar
      → Bahía de la nave: montar la pieza (necesita tenerla en el hangar; la vieja vuelve al hangar)
Agua y nitrógeno de la roca → Planta de propelente → hidracina y NTO en el almacén (+ importados)
      → Atracada: Repostar (cadena de retos + horas de trasvase) → tanques llenos
```

## Cómo se llega

Petición de Berón (2026-11-12): «La estación debe construirse como las demás estaciones: la estructura existe en el espacio y, al acercarte, aparece la opción de revisar las tareas».

- **Estación Nueva Polana**, a unos 1,2 km de Bennu y a 0,9 km del punto de salida. Es una **estructura física**: el módulo no la puede atravesar (misma regla de exclusión que la nodriza, que se apaga cerca de los puertos para poder acoplar).
- ~~**Botón «Revisar tareas de la estación»**~~ (quitado en la fase 1 de accesos, [accesos.md](accesos.md): las tareas de la estación se abren solo desde dentro, con **Tareas** o sus máquinas): aparecía solo cuando la nave está **acoplada a la estación o a menos de 400 m** (`dockingRangeM`, valor de juego), también con el módulo a bordo de la nodriza atracada. En el móvil va en la columna izquierda, justo encima de los mandos táctiles, al alcance del pulgar y sin tapar la barra de vuelo; la tira del piloto automático sube encima. En el escritorio va abajo, centrado. Abre la pantalla de la estación de siempre.
- **Acceso remoto**: ya no existe en el juego normal. Con `?dev` en la URL vuelve el botón «Estación · 0,9 km (dev)» de la barra de vuelo, que abre la estación desde cualquier sitio (para pruebas y capturas).
- **En el mapa** hay dos destinos nuevos además de los asteroides: la **Estación Nueva Polana** (rombo dorado) y la **Nodriza** (rombo ámbar). Su ficha muestra la distancia al puerto, los puertos IDSS, los límites de contacto y el viaje. El botón dice **«Ir a la estación»** o **«Volver a la nodriza»** y programa el viaje con la **misma cadena de retos** (ordenar la maniobra, Δv, tiempo, reparar el frenado y la orden a la IA), con un bloque y una respuesta nuevos sobre el acople a 0,07 m/s.
  - **Con el módulo acoplado a la nodriza**, «Ir a la estación» lleva **a la nodriza entera**: vuela con sus propulsores Hall (en cámara rápida, como los demás viajes), para a 80 m en el eje del puerto de la nodriza, se acerca a 0,07 m/s y **acopla sola**. El módulo llega a bordo.
  - **Con el módulo suelto** (o acoplado a la estación), vuela el módulo: rodea las rocas hasta un punto a 300 m en el eje del puerto del módulo, frena a 40 m y el **asistente de acople** hace el resto, con los mismos límites IDSS que en la nodriza.
  - **«Volver a la nodriza»** hace lo mismo hacia el puerto de la nodriza. Si ya estás acoplada, el mapa lo dice y no deja programarlo.
  - Si la nodriza está atracada en la estación y se programa un viaje a un asteroide, primero **retrocede 80 m por el eje del puerto** sin girar (para que los anillos no barran la estación) y luego sigue su ruta.
- Mientras tanto, el asistente de acople (K) sirve para cualquier puerto: elige el más cercano, o el del viaje. La página «Acople» del puente de la nodriza dice a qué puerto se refiere.
- El puente y el interior de la nodriza solo se abren con el módulo acoplado a la nodriza (no a la estación).
- **Por dentro** (petición 2026-11-12, «que se pueda andar por el hangar y el módulo habitable»): con el módulo acoplado a su puerto, el botón de la escotilla de la cabina dice **«Entrar en la estación»**; con la nodriza atracada, se pasa desde la escotilla de su espina (**Pasar a la estación**). La **bahía de la nave** tiene consola en el Nodo 2 (y B, y un botón en la pestaña Hangar). Doménica flota en ingravidez por el Nodo 2, el módulo habitable, el Nodo 1, el módulo de fabricación y, con traje y por la esclusa, el **hangar, que está abierto al vacío**. La refinería, la fundición, la impresora y los estantes del hangar abren su pestaña de esta pantalla. Detalles, referencias y la decisión del hangar en [interiores.md §5](interiores.md#5-la-estación-por-dentro).

## La estructura

Inspirada en la ISS y en el Gateway lunar (`POLANA_LAYOUT` en `modules/station/data/structure.ts`). Ejes de la estación: x a lo largo de la celosía, y hacia arriba, z hacia popa. Mantiene su orientación; solo las alas solares giran sobre su eje largo para seguir al Sol, como las juntas beta (BGA) de la ISS.

| Pieza | Tamaño | Base |
| --- | --- | --- |
| Nodo 1 (centro) | 5,47 × 4,57 m | [Nodo Unity de la ISS](https://en.wikipedia.org/wiki/Unity_(ISS_module)) |
| Módulo habitable (delante) | 6,1 × 3 m | [HALO del Gateway lunar](https://handwiki.org/wiki/Astronomy:Habitation_and_Logistics_Outpost) |
| Nodo 2 (atraque) | 5,47 × 4,57 m | Otro nodo como Unity, con los dos puertos |
| Dos adaptadores de atraque | 1,1 m de alto, 2,4 m de diámetro | [IDA de la ISS](https://en.wikipedia.org/wiki/International_Docking_Adapter); paso de 800 mm del [NASA Docking System](https://en.wikipedia.org/wiki/NASA_Docking_System) (norma IDSS) |
| Módulo de fabricación (detrás) | 8,5 × 4,3 m | Valor de juego, del tamaño del laboratorio Destiny. Tiene el brillo del horno de la refinería |
| Hangar (al fondo) | 20 × 14 × 20 m | Valor de juego; la puerta iluminada mira a popa. **Sin presión**: presurizarlo pediría 6,7 t de aire y 28–41 MN en cada pared ([interiores.md §5](interiores.md#el-hangar-sin-presión-decisión)) |
| Celosía | 88 m de largo, 4,5 m de sección | Valor de juego, como la celosía de la ISS |
| Cuatro alas solares | 35 × 12 m cada una | [Alas solares de la ISS](https://en.wikipedia.org/wiki/Electrical_system_of_the_International_Space_Station), casi 31 kW cada una (unos 124 kW en total) |
| Dos radiadores | 23 × 3,4 m | Valor de juego; la ISS expulsa hasta [70 kW](https://en.wikipedia.org/wiki/External_Active_Thermal_Control_System) con los suyos |

**Puertos** (norma IDSS, los mismos límites de contacto que la nodriza: 0,05–0,10 m/s de cierre, 0,10 m de desalineación lateral, 4° de inclinación):

- **Puerto del módulo**: debajo del nodo 2 (nadir). El módulo acopla con el techo contra el puerto, igual que en la nodriza.
- **Puerto de la nodriza**: en la punta del nodo 2, mirando hacia delante. La nodriza acopla de proa con un puerto IDSS nuevo en la punta de su nodo delantero (`NODRIZA_NOSE_PORT`, posición de juego), como un vehículo que visita la ISS. Así queda delante de la estación: sus anillos (56 m de radio) quedan a más de 10 m de cualquier parte de la estación (hay un test).

La estructura completa cabe en una esfera de 66 m (`radiusM` de la estación). Las rutas del mapa la rodean como a una roca.

## La pantalla

En el móvil, arriba se ve el hangar en 3D y abajo hay un panel con cuatro pestañas. En horizontal, el panel va a la derecha. El hangar muestra el módulo (si está acoplado), las tres máquinas, que se encienden mientras trabajan, el estante de piezas de repuesto y las sondas fabricadas. Se gira arrastrando.

| Pestaña | Qué hay |
| --- | --- |
| **Materiales** | Arriba, con una nave atracada, **Repostar** (ver [Planta de propelente y repostaje](#planta-de-propelente-y-repostaje)). Después, la bodega de la nave y el botón **Descargar la bodega en la estación**. Debajo, el almacén: roca sin refinar, refinados e importados, cada uno con su nota y su fuente. Al final está la **refinería**: cada proceso con lo que entra y lo que sale en el lote posible, y el botón **Refinar**. Después, la **planta de propelente** (botón **Producir**) y los **depósitos de propelente**. |
| **Planos** | Lo que se puede fabricar ya y lo que no. Cada plano indica su máquina, el proceso real con su fuente, la masa y las horas. Los materiales salen en verde si hay suficientes y en rojo con lo que falta («faltan 4,1 kg»). También dice cuántas piezas iguales hay en el hangar. |
| **Fabricación** | La cola de cada máquina (refinería, fundición, impresora 3D de metal, planta de propelente y línea de repostaje), con barra de progreso y las horas que quedan. Cada máquina hace un trabajo detrás de otro, y las tres trabajan a la vez. |
| **Hangar** | Las naves y sondas: la **nodriza**, el **Explorer** y las sondas fabricadas, con dónde está cada una. Debajo, las piezas de repuesto. |

Las horas de máquina corren con el mismo reloj que la vida a bordo, un día de juego cada 40 s (`STATION_TUNING.hoursPerSecond`).

## Materiales: de la roca de Bennu al almacén

Hasta ahora, Bennu solo declaraba agua y carbono. Ahora declara también la roca que forma el resto de su masa, que es lo que llena la bodega:

| En la bodega (500 kg) | Fracción | Fuente |
| --- | --- | --- |
| Agua en minerales hidratados | 1–6,2 % | [Wikipedia: Bennu](https://en.wikipedia.org/wiki/101955_Bennu) |
| Carbono | 4,5–4,7 % | Muestra devuelta ([Lauretta et al. 2024](https://arxiv.org/abs/2404.12536), tabla 4) |
| Hierro (en magnetita y sulfuros de Fe-Ni) | 18,3 % | Condritas CI ([Lodders 2003](https://ui.adsabs.harvard.edu/abs/2003ApJ...591.1220L/abstract), tabla 3: 182 800 ppm), porque la muestra de Bennu es de tipo CI |
| Níquel (en sulfuros de Fe-Ni) | 1,06 % | Lodders 2003: 10 640 ppm |
| Nitrógeno (en sales de amonio y orgánicos) | 0,23–0,25 % | Muestra de Bennu ([Glavin et al. 2025](https://ntrs.nasa.gov/api/citations/20250001355/downloads/GlavinAbundantSTI.pdf), Nature Astronomy). No cuenta para la riqueza |
| Silicatos (filosilicatos) | 55–65 % | Lauretta et al. 2024: ≈80 % del volumen son serpentina y esmectita. La fracción en masa es lo que queda tras restar lo demás (estimación de juego) |

Los miembros pequeños de la familia de Nueva Polana usan la misma composición, marcada como «asumida igual a la de Bennu». La roca común (hierro ligado, níquel y silicatos) **no cuenta para la riqueza** (`resourceRichness`), así que el duelo con Bennu es igual de difícil que antes. Hay un test que lo comprueba.

Los **kits importados** (electrónica, válvulas y el lecho catalizador S-405 de iridio sobre alúmina) aún no se pueden hacer con roca. La estación empieza con 6. Se basa en la idea de arrancar la industria espacial con un sistema «subreplicante» abastecido desde la Tierra ([Metzger et al. 2013](https://arxiv.org/abs/1612.03238)).

## Refinería

Cada lote es una cadena de retos. Primero hay que **predecir cuánto sale** con la proporción real del proceso. Después viene **un reto por paso**, y los pasos con un valor real (las temperaturas) piden ese valor. Si falta roca para un lote entero, se refina el lote parcial que permita el almacén (mínimo 10 %).

| Proceso | Lote (valores de juego) | Pasos y valores reales | Fuentes |
| --- | --- | --- | --- |
| Extracción térmica del agua | 20 kg de agua hidratada → 18 kg de agua · 6 h | Triturar, hornear en vacío y condensar en la trampa fría | [Pohl y Britt 2024](https://doaj.org/article/198ccfc372ab4952abdfa1e23f2e25cb) (deshidratación de serpentinas), [Metzger, Zacny y Morrison](https://arxiv.org/abs/2306.03776) (extracción térmica de volátiles) |
| Reducción y proceso carbonilo | 100 kg de hierro en mineral + 6 kg de níquel en mineral + 4 kg de carbono → 80 kg de hierro + 4,8 kg de níquel · 12 h | Ni + 4 CO → Ni(CO)₄ a **50–60 °C**; se descompone a **220–250 °C**. Los carbonilos de Fe y Ni se separan por destilación | [Proceso Mond](https://en.wikipedia.org/wiki/Mond_process), [U. de Arizona para la NASA](https://ntrs.nasa.gov/citations/19910015913) (carbonilos de metal meteorítico) |
| Electrólisis de regolito fundido | 100 kg de silicatos → 30 kg de oxígeno + 55 kg de cerámica de escoria + 3 kg de hierro · 16 h | Fundir **a unos 1600 °C**. El oxígeno sale en el ánodo y el hierro y el silicio, en el cátodo | [Sirk, Sadoway y Sibille 2010](https://ntrs.nasa.gov/citations/20110008535), [Muscatello 2017](https://ntrs.nasa.gov/citations/20170001458) |

Ninguna refinería produce más masa de la que entra (hay un test).

## Planta de propelente y repostaje

Petición de Berón (2026-11-13): «Una refinería de propelente en la estación para rellenar los tanques de las naves (hoy solo se recupera cambiando un tanque lleno)».

### Qué se puede hacer con la roca y qué no

Los propelentes que queman nuestras naves (MMH/NTO, hidracina, LMP-103S y el xenón de la nodriza) **llevan todos nitrógeno o son gases nobles**. El hidrógeno y el oxígeno sobran (agua), pero ningún motor nuestro los quema.

| Qué | ¿Se hace aquí? | Por qué | Fuente |
| --- | --- | --- | --- |
| Agua → hidrógeno + oxígeno | **Sí, de sobra** | Electrólisis PEM: 2 H₂O → 2 H₂ + O₂. **55 kWh por kg de H₂** (sistema, estado 2022; objetivo 2026: 51), unos 6,1 kWh por kg de agua | [DOE, objetivos de electrólisis PEM](https://www.energy.gov/eere/fuelcells/technical-targets-proton-exchange-membrane-electrolysis) |
| Metano (Sabatier) | Se podría, no se hace | CO₂ + 4 H₂ → CH₄ + 2 H₂O sobre níquel a 300–400 °C (la ISS lo usa para recuperar agua). El carbono de la roca da el CO₂, pero ningún motor nuestro quema metano (pregunta abierta 9 de [componentes.md](componentes.md)) | [Sabatier](https://en.wikipedia.org/wiki/Sabatier_reaction) |
| Amoníaco | **Sí, pero escaso** | Bennu tiene **0,23–0,25 % de N** en masa y ~13,6 µmol/g de amoníaco soluble, 75 veces más que Ryugu y 12 más que Murchison (es un mínimo). Una bodega de 500 kg trae ~1,4 kg de N. Haber–Bosch eléctrico: 11,1–12,5 kWh/kg de NH₃ con el hidrógeno incluido | [Glavin et al. 2025](https://ntrs.nasa.gov/api/citations/20250001355/downloads/GlavinAbundantSTI.pdf); CI: N 2950 ppm ([Lodders, Palme y Gail 2009](https://arxiv.org/abs/0901.1149), tabla 3); [Frontiers 2021](https://www.frontiersin.org/articles/10.3389/fceng.2021.765457/full) |
| Hidracina | **Sí, poca** | Proceso del peróxido: 2 NH₃ + H₂O₂ → N₂H₄ + 2 H₂O, con metiletilcetona que se recicla (cetazina a ~50 °C, hidrólisis a 8 bar). No necesita cloro, a diferencia del Raschig de Olin (hipoclorito) y del Bayer. El agua oxigenada sale del hidrógeno y el oxígeno. Es 87 % nitrógeno: 45 kg (el tanque de RCS) llevan 39 kg de N: con los rendimientos de la planta, unas 40 bodegas | [Proceso del peróxido](https://en.wikipedia.org/wiki/Peroxide_process), [Hidracina](https://en.wikipedia.org/wiki/Hydrazine) |
| NTO | **Sí, poco** | Ostwald: 4 NH₃ + 5 O₂ → 4 NO + 6 H₂O a ~900 °C sobre platino con 10 % de rodio (muy exotérmica); el NO enfriado a ~250 °C se oxida a NO₂ ⇌ N₂O₄. Solo el 30 % es nitrógeno; el 70 % es oxígeno, que sobra. La malla de Pt-Rh es importada | [Proceso Ostwald](https://en.wikipedia.org/wiki/Ostwald_process) |
| MMH | **No: importado** | Se hace por el Raschig modificado: cloramina (de amoníaco e **hipoclorito**) con metilamina. Cloro en CI: 698 ppm, demasiado poco para una cadena de cloro y sosa. Las otras rutas (metilurea con hipoclorito, alquilar hidracina con sulfato de dimetilo o cloruro de metilo) también piden cloro o azufre | [EP 2042483 A1](https://patents.google.com/patent/EP2042483A1/en); Cl: Lodders, Palme y Gail 2009 |
| LMP-103S | **No: importado** | Su oxidante es dinitramida de amonio (ADN): nitrar sulfamatos con ácidos nítrico y sulfúrico, o nitrato de amonio en óleum. Química de ácidos concentrados que la estación no tiene | [ADN](https://en.wikipedia.org/wiki/Ammonium_dinitramide) |
| Helio | **No: importado** | CI: 9,17 ng/g (partes por mil millones). Nada que sacar | Lodders, Palme y Gail 2009 |
| Xenón (y kriptón, argón) | **No: importado** | CI: **Xe 0,174 ng/g**, Kr 0,052 ng/g, Ar 1,33 ng/g. Las 150 t de la nodriza pedirían ~9 × 10¹⁴ kg de roca, unas 12 000 Bennus. En la Tierra se producían 5000–7000 m³ al año (1998) | Lodders, Palme y Gail 2009; [Xenón](https://en.wikipedia.org/wiki/Xenon) |

**La decisión:** la planta hace **hidrógeno, amoníaco, hidracina y NTO** (química real, nitrógeno real de Bennu), pero el nitrógeno da para poco: es un goteo que complementa lo importado. El **MMH, el LMP-103S, el helio y el xenón** solo llegan importados, como los kits. La estación empieza con una carga del par y del tanque de hidracina del módulo (170 kg de MMH, 280 de NTO, 45 de hidracina), 3 kg de helio y 20 t de xenón (valores de juego).

### Procesos de la planta (`PROPELLANT_PROCESSES`)

Las masas salen de las reacciones ajustadas (H 1, N 14, O 16 g/mol). Los lotes y las horas son **valores de juego**; los rendimientos por debajo de 1 son **estimaciones**.

| Proceso | Lote | Energía por lote | Pasos con valor real |
| --- | --- | --- | --- |
| Electrólisis del agua | 18 kg de agua → 2 kg de H₂ + 16 kg de O₂ · 4 h | **110 kWh** (55 kWh/kg H₂, DOE) | 2 kg de hidrógeno por cada 18 kg de agua |
| Amoníaco del nitrógeno de la roca | 1,4 kg de N + 0,3 kg de H₂ → 1,53 kg de NH₃ (90 %, estimación) · 8 h | ~3 kWh (estimación: 11,1–12,5 kWh/kg del Haber–Bosch eléctrico menos los ~9,7 del hidrógeno) | 3 partes de hidrógeno por cada una de nitrógeno (N₂ + 3 H₂) |
| Hidracina por el peróxido | 1,7 kg de NH₃ + 0,1 kg de H₂ + 1,6 kg de O₂ → 1,28 kg de N₂H₄ (80 %, estimación) + 1,8 kg de agua · 10 h | Sin dato publicado | Cetazina a 50 °C; hidrólisis a 8 bar |
| NTO por oxidación del amoníaco | 1,7 kg de NH₃ + 5,6 kg de O₂ → 4,37 kg de NTO (95 %, estimación) + 2,7 kg de agua · 6 h | Exotérmica: no gasta | Malla a 900 °C; enfriar a 250 °C |

Cada lote es la misma cadena de retos que la refinería (`refineChore`): predecir cuánto sale y un reto por paso. La planta es una máquina propia (`planta`) con su cola, así que trabaja a la vez que la refinería. Hay un test que comprueba las proporciones de cada reacción y otro que encadena agua → hidrógeno → amoníaco → hidracina.

### Repostar

Con el **módulo de aterrizaje acoplado al puerto de la estación** (o a bordo de la nodriza atracada), o con la **nodriza atracada**, Materiales muestra arriba **Repostar** con una tarjeta por nave: cada depósito con lo que lleva, su capacidad, lo que cargará y, si algo falta en el almacén, qué. Debajo, lo que saldrá del almacén.

- **Par MMH/NTO**: un kg del par se reparte a la razón de mezcla 1,65: 0,377 kg de MMH y 0,623 kg de NTO. Además, el **helio**: en un sistema regulado el gas que llenó el volumen vaciado no vuelve a la botella (las válvulas antirretorno lo impiden), así que se purga y la botella se rellena con lo mismo: volumen por kg × 3,2527 kg/m³ (helio a 20 bar, NIST) = **2,8 g de helio por kg** cargado.
- **Hidracina y LMP-103S** (tanques de purga con diafragma): no gastan gas. El líquido que entra vuelve a comprimir el gas del otro lado del diafragma hasta la presión de partida.
- **Xenón de la nodriza**: kg por kg, hasta las 150 t.
- **Capacidad**: nunca se pasa de la capacidad de los tanques (`Ship.refuel`, `Mothership.refuel`).

**Cadena de retos** (`refuelChore`):

1. Si hay par: **cuánto NTO va al tanque de oxidante** (`nto = par · razonMezcla / (1 + razonMezcla)`). Errores típicos: la parte del MMH o multiplicar sin dividir.
2. **Cuántas horas tarda el trasvase** (`horas = carga / caudal`).
3. **Un reto por paso de la conexión**. Módulo: conectar la manguera a la válvula de servicio, purgar la manguera con helio, comprobar que el regulador da **20 bar** (la presión regulada del juego, estimación), trasvasar combustible y oxidante por líneas separadas, buscar fugas con el detector de helio, cerrar y desconectar. Nodriza: conectar, hacer vacío en la línea, mantenerla por encima de **17 °C** (punto crítico del xenón, 16,6 °C: sin líquido, una sola fase), trasvasar, buscar fugas, cerrar. Se basan en la carga de hidracina por la válvula de servicio con purga de la manguera ([JPL, NPO-20679](https://www.techbriefs.com/component/content/article/6967-npo-20679)) y en la prueba de fugas con helio y vacío antes de cargar ([ESA, Biomass](https://www.spacedaily.com/reports/Biomass_satellite_prepped_for_launch_fuel_load_999.html)).

Al resolverla, el propelente sale del almacén y el trasvase entra en la **línea de repostaje**: 60 kg/h para el módulo (el par entero en ~7 h) y 2500 kg/h de xenón (150 t en 60 h). Son **valores de juego**; el primer trasvase en órbita de Tianzhou 1 a Tiangong 2 tardó unos cinco días ([Spaceflight Now](https://spaceflightnow.com/2017/04/27/tianzhou-1-freighter-achieves-chinas-first-in-space-refueling-demo/)). El propelente llega a bordo al acabar. Si la nave se ha ido, todo vuelve al almacén. Si se falla la cadena, no se gasta nada.

**En la estación por dentro**, la refinería abre Materiales directamente en la planta de propelente.

## Planos

Hay un plano para **cada pieza del catálogo** (`ALL_PARTS`). Desde el 13 de noviembre, los tanques son tanques reales de titanio, con el casco importado en kits ([componentes.md](componentes.md), §1.8). También hay uno para la **sonda de prospección** (30 kg, valor de juego), que se guarda en el hangar.

- **Material** = masa de la pieza ÷ rendimiento (0,8, valor de juego: viruta, soportes y descartes), repartido según la receta del tipo de pieza. Más los kits.
- **Motores bipropelentes** (R-4D): 50 % de níquel, 40 % de hierro, 10 % de cerámica y 2 kits. Se hacen en la **impresora 3D de metal**, por láser y capa a capa, como la [impresora de metal de la ESA en la ISS](https://www.tomshardware.com/3d-printing/scientists-print-3d-metal-parts-in-space-for-the-first-time-a-key-ability-for-long-distance-long-duration-missions) (primera pieza de acero inoxidable en agosto de 2024).
- **Propulsores de hidracina** (MR-104H y RCS): 60 % de hierro, 30 % de níquel y 10 % de cerámica. Llevan un kit con el catalizador [S-405](https://en.wikipedia.org/wiki/Monopropellant_rocket). El RCS se fabrica como **juego de 24**, porque al cambiarlo se cambian los 24, y necesita 2 kits más.
- **Tanques**: un forro de hierro envuelto en fibra de carbono ([COPV](https://en.wikipedia.org/wiki/Composite_overwrapped_pressure_vessel)), con 85 % de hierro, 15 % de carbono y 1 kit. Se hacen en la **fundición**.
- **Propulsores de la nodriza** (X3, AEPS, NEXT-C y VASIMR VX-200; datos y fuentes en [nave-nodriza.md](nave-nodriza.md), «Propulsores intercambiables»). Se imprime **solo el cabezal**, con su masa real (230, 50, 14 y 500 kg). La fuente de potencia, el cátodo y el control de flujo de xenón llegan en kits importados: 3 kits, 6 para el X3 (su fuente es de 100 kW) y 10 para el VX-200 (imán superconductor y generadores de RF). Recetas de juego: Hall, 70 % de hierro (circuito magnético), 20 % de cerámica (canal) y 10 % de níquel; iónico, 50 % de hierro, 30 % de carbono (rejillas), 10 % de cerámica y 10 % de níquel; VASIMR, 50 % de hierro, 20 % de níquel, 20 % de cerámica y 10 % de carbono. Horas: 12 + ½ por kg (127 h el X3). Un X3 pide 287,5 kg de material: hace falta refinar mucho Bennu. El VX-200 se puede fabricar, pero no montar, porque usa argón (ver la pregunta abierta).
- Las horas son valores de juego: unas 6 + 5 por kg en la impresora y unas 4 + ½ por kg en la fundición.

Al empezar se puede fabricar un tanque o el MR-104H, pero no el juego de 24 MR-107T. Con una carga de Bennu, un lote de carbonilo y uno de electrólisis ya alcanza (hay un test que lo comprueba). El níquel es escaso (≈1 % de la roca) y es lo que limita los motores.

**Retos de fabricar** (`fabricationChore`):

1. **Predecir** el material: `material = masaPieza / rendimiento`, con la masa real de la pieza. Los errores típicos son multiplicar o sumar.
2. **Predecir** lo que quedará en el almacén del material que más se usa, con los números reales del almacén (`almacen.hierro = 30 kg; almacen.hierro = almacen.hierro − 13,81 kg`).
3. **Ordenar** los pasos del plano.

Si se resuelven, se toman los materiales y el trabajo entra en la cola. Si se fallan, no se gasta nada.

## Bahía de la nave: las piezas salen del hangar

`bayActions` recibe ahora el hangar (`PartSupply`). Una pieza que está en el hangar se ofrece como siempre, con «n en el hangar». Si no está, sale **bloqueada** y la bahía dice «no hay en el hangar: fabrícala en la estación». Al montarla, la pieza sale del hangar y **la vieja vuelve a él**, así que se puede volver a cambiar. Sin hangar (por ejemplo en los tests antiguos), todo sigue siendo libre como antes.

Los **propulsores de la nodriza** siguen la misma regla en la pestaña **Nodriza**, y además solo con el módulo acoplado. Cada módulo de propulsores (dorsal y ventral) ofrece añadir uno, quitar uno o montar n de otro tipo, con los que haya en el hangar. Los que salen vuelven al hangar (`applyDriveRefit`). En la pestaña Hangar de la estación aparecen como «Propulsor X3 × 9».

## Arquitectura

- `modules/station/domain`: `MaterialStock`, `Blueprint`, `RefineProcess` (con `energyKwh` opcional), `STATION_TUNING`, `Hangar` y `Station` (descargar, refinar, fabricar, colas por máquina, `transfer` y `setReceiver` para el repostaje, y `tick(horas)`). `refuel.ts`: `PropellantLine`, `planRefuel` (lo que cabe, limitado por el almacén, con el almacén compartido entre depósitos y lo que ya va de camino) y `transferHours`.
- `modules/station/application/refuel.ts`: `RefuelOps` (estado de cada nave, `startRefuel` con su cadena de retos), `shipRefuelTarget` y `mothershipRefuelTarget`, `PROPELLANT_MATERIALS` (reparto del par y helio por kg), `refuelChore` y `REFUEL_TUNING`.
- `modules/station/data/propellant-processes.ts`: los cuatro procesos de la planta.
- `modules/station/application`: `StationOps` (planos con lo que falta, refinería, sesiones de retos) y `challenges.ts` (`fabricationChore` y `refineChore`, que reutilizan `ChoreRun`, `stepChain` y `DuelView`).
- `modules/station/data`: materiales y mapa desde la carga, procesos, planos, estación y fuentes.
- `modules/station/domain/structure.ts`: `StationStructure` (módulos, piezas, puertos como `DockingTarget`, exclusión y radio). `modules/station/data/structure.ts`: `POLANA_LAYOUT` con sus fuentes.
- **Acople generalizado** (`modules/mothership`): `DockingTarget` es cualquier cosa con un puerto (la nodriza o un puerto de la estación). `Docking` acepta varios destinos, sabe a cuál está acoplada (`dockedTo`) y el asistente vuela al más cercano o al que se le pida (`assistTo`). `approachSpeed` es el perfil de frenado del asistente, compartido con `Berthing`, el caso de uso con el que la nodriza (que no vuela en el bucle de 120 Hz) se acerca a un puerto y se juzga el contacto con los mismos límites IDSS. La geometría de exclusión pasó a `flight/domain/keep-out.ts` y la usan la nodriza y la estación.
- **Navegación**: `NavTarget` es ahora `AsteroidTarget | DockTarget`. `Navigator` planea el viaje a un puerto (`probeDockTrip`), pasa al asistente de acople al llegar (estado `docking` y luego `docked`) y, si la nodriza lleva el módulo, lo lleva hasta el puerto de la nodriza y la acopla (`CarrierPort.berth`). Valores de juego en `navigation/application/dock-trip.ts`.
- Interior: `modules/station/domain/interior.ts` y `data/interior.ts` (volúmenes, esclusa, máquinas → pestañas), `src/station-interior.ts` y `adapters/three/interior/station-rooms.ts`.
- Adaptadores: `adapters/three/station-model.ts` (`StationModel` construido desde `POLANA_LAYOUT`, y `StationScene` dentro del hangar), `src/station-screen.ts` (pestañas y retos), `src/station-dock.ts` (el botón «Revisar tareas», el acceso `?dev` y los destinos del mapa) y `src/ui/nav-dock-card.ts` (ficha del mapa).
- Cambios en archivos compartidos con la planta de propelente: `celestial/data/bennu.ts` (nitrógeno), `celestial/domain/resources.ts` (peso 0), `ship/domain/ship.ts` (`refuel`), `mothership/domain/mothership.ts` (`refuel`), `chores/domain/chore.ts` (tipo `repostar`), `station/domain/interior.ts` y `data/interior.ts` (la refinería abre la planta), `station-interior.ts`, `station-screen.ts`, `ui/nav-map.ts` (nombre del nitrógeno), `ui/style.css` y `main.ts`.
- Cambios en archivos compartidos: Bennu y Nueva Polana (composición), `resources.ts` (pesos), `Expedition.unloadCargo()`, `bay.ts` (`PartSupply`), `ship-bay.ts` (consume del hangar), `start-region.ts` (sin rocas sobre la estación), `parts.ts` (dos tanques nuevos) y `main.ts`. Con el atraque: `main.ts` (estructura, destinos del mapa, botón, exclusión), `nav-map.ts` (destinos de acople), `navigation.ts` (textos), `region.ts` (`obstaclesExcept` sin asteroide), `mothership.ts` (exclusión compartida, `id`, `dockedTo`) y `style.css`.

## Capturas

`docs/screenshots/refineria-*-{mobile,desktop}.png` (iPhone 13 y 1280 × 800): 1 Repostar con el módulo y la nodriza atracados, 2 primer reto (cuánto NTO), 3 reto de la presión del regulador, 4 trasvase en marcha, 5 planta de propelente, 6 cola de la línea de repostaje. El módulo y la nodriza se atracan y se vacían en parte por código para la captura.

`docs/screenshots/estacion-atraque-*-{desktop,mobile}.png` (iPhone 13 y 1280 × 800): 1 cabina en la salida (sin botón), 2 ficha de la estación en el mapa, 3 primer reto del viaje, 4 la nodriza en viaje, 5 nodriza atracada con el botón «Revisar tareas», 6 vista exterior, 7 pantalla de la estación, 8 la nodriza atracada vista desde fuera, 9 el módulo acoplando en el puerto del módulo, 10 y 11 módulo acoplado a la estación.

Capturas anteriores:

`docs/screenshots/estacion-*-{desktop,mobile}.png`, de 0 (cabina y estación vista por la ventana) a 7 (bahía con pieza disponible y pieza bloqueada). El módulo se coloca junto a la estación por código, porque aún no hay piloto automático.

## Preguntas abiertas para Berón

- **Acceso solo atracado** (resuelto): el botón aparece solo acoplada o a menos de 400 m. Queda abierto si las piezas del hangar se montan solo estando allí o si la nodriza lleva un almacén propio. Hoy la bahía de la nave sigue cogiendo piezas del hangar desde cualquier sitio.
- **¿400 m o solo acoplada?** Hoy basta con estar a menos de 400 m. ¿Lo dejamos así o exigimos estar acoplada?
- **Interior con la nodriza atracada.** El interior de la nodriza solo se abre con el módulo acoplado a la nodriza. Si el módulo está en el puerto de la estación y la nodriza también está atracada, ¿se puede pasar andando por la estación?
- **Kits importados.** ¿Cómo se consiguen más: comercio con el santuario, misiones de Nevaeh o, más adelante, fabricar electrónica?
- **Usos del agua y del oxígeno.** Ahora la planta los usa para hidrógeno, hidracina y NTO, pero sobran. ¿Rellenan el soporte vital de la nodriza, o hacen propelente (H₂/O₂ con un motor nuevo)? ¿Se repone el pienso o el medio de cultivo con carbono?
- **Importados de propelente.** El MMH, el LMP-103S, el helio y el xenón solo llegan importados, y la estación empieza con una carga. ¿Cómo llegan más: misiones de Nevaeh, comercio, un carguero periódico?
- **Nitrógeno escaso.** Una bodega de Bennu da ~1,4 kg de N: ~1,1 kg de hidracina o ~3,8 kg de NTO. ¿Lo dejamos así (es lo real) o buscamos asteroides más ricos en nitrógeno? ¿Una bodega mayor para la roca?
- **Repostar sin trasvase visible.** El propelente entra al final del trasvase, de golpe. ¿Lo queremos poco a poco? ¿Bloqueamos el desacople mientras la manguera está conectada? Hoy, si la nave se va, el propelente vuelve al almacén.
- **Energía de la estación.** La planta da los kWh de cada lote, pero la estación no tiene balance de energía (sus alas dan ~124 kW). ¿Lo añadimos, de modo que la electrólisis compita con las demás máquinas?
- **Sondas.** El módulo fabricada se queda en el hangar. ¿Qué hace: prospectar asteroides antes del duelo, transportar carga, servir de nodo de la nano_net?
- **Montaje fallido.** Si se fallan los retos de fabricar, no se pierde material. ¿Queremos que se pierda una parte (desecho)?
- **Propulsores de la nodriza.** ¿Damos a la nodriza tanques de argón o de kriptón para que el VASIMR (y el X3 con kriptón) sirvan de algo, o quitamos el plano del VX-200 hasta entonces? ¿Mezclar tipos en un mismo módulo? ¿Encender a media potencia (los Hall se pueden regular) en vez de solo unidades enteras?
- **Colisión con la estación** (resuelto): la estación es un obstáculo y tiene dos puertos IDSS.
- **Otras estaciones.** `StationStructure` y `DockTarget` sirven para más estaciones. ¿Habrá más, por ejemplo en otras regiones?
