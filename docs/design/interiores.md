# Interiores reales: módulo de aterrizaje, nodriza y estación

Petición de diseño (2026-11-12): «¿Podemos recrear el interior real del módulo de aterrizaje y pasar la cocina, el hospital, el dormitorio, el yoga, etc. a la nave nodriza? También podemos reorganizar para poner zonas en la estación, y la nodriza también se haría más fiel a la realidad».

**Respuesta corta:** la cocina, la enfermería, el yoga y las máquinas ya estaban en la nodriza desde que se separaron las dos naves ([nave-nodriza.md](nave-nodriza.md)); el módulo solo tenía una cabina con dos asientos. Lo que faltaba era que cada nave se pareciera a su referencia real:

- **Módulo de aterrizaje:** su cabina es ahora la de una cápsula pequeña (módulo lunar Apolo, Orion, Crew Dragon, Starliner): dos asientos con los mandos de mano, consola de cristal con interruptores físicos, escotilla de acople en el techo, escotilla lateral para salir con el traje, el traje, el aseo con cortina y los cartuchos de CO₂. Nada de cocina ni de camas.
- **Nodriza:** el módulo del anillo se ordena como un hábitat de larga duración de la NASA (Deep Space Habitat, TransHab), con dos zonas que faltaban: el **camarote de Doménica** y un **rincón de ejercicio** con las máquinas de la ISS y el protocolo Sprint. El aseo y el gallinero pasan a la cubierta de cultivo. La espina sin gravedad tiene **taller, almacén y esclusa**. Por fuera, los **radiadores** salen del calor del reactor y quedan dentro de la **sombra de su escudo**, y la espina lleva sus módulos presurizados.
- **Estación:** ya se puede recorrer por dentro (§5): nodos, módulo habitable, módulo de fabricación con sus máquinas, esclusa y hangar sin presión, todo en ingravidez.

## 1. Dónde estaba cada zona (auditoría, 2026-11-12, rama `integracion` en 649a503)

| Zona | Antes | Ahora |
| --- | --- | --- |
| Cabina de vuelo | Módulo de aterrizaje (`adapters/three/cockpit.ts`): dos asientos, consola de tres pantallas, máscaras, extintor, agua, botiquín y una «escotilla al hábitat» en el mamparo trasero | Módulo, rehecha como cápsula. La escotilla al hábitat estaba mal: el módulo se acopla por el techo, así que ahora la escotilla de acople está arriba |
| Puente de mando | Nodriza, nodo delantero (`src/flight-deck.ts`) | Igual |
| Cocina, molino y procesador de soja, laboratorio de carne, huerto en bastidores | Nodriza, módulo del anillo (`interior/room.ts`) | Igual, en el extremo «ruidoso» del módulo, junto al ascensor |
| Enfermería | Nodriza, módulo del anillo | Igual, en el centro, junto al rincón de ejercicio |
| Yoga | Una esterilla en el módulo | Dentro del nuevo **rincón de ejercicio** |
| Ejercicio | No había | **Nuevo:** cinta, bicicleta y máquina de fuerza, con su tarea |
| Camarote de Doménica | No había (el documento de la nodriza hablaba de «camarotes» en el anillo gemelo, sin interior) | **Nuevo:** al fondo del módulo, el extremo tranquilo |
| Aseo | No había | **Nuevo:** en la cubierta de cultivo, junto a la puerta |
| Gatos | Rincón con cama, comederos, arenero y rascador en el módulo | Cama en la litera de Doménica, rascador en su puerta, arenero y comederos en la esquina de al lado |
| Gallinero | Dentro del módulo, junto a la cocina | En la **cubierta de cultivo**, al final del césped |
| Perros, bancales, higueras | Cubierta de cultivo | Igual |
| Taller, almacén, esclusa | La espina tenía taquillas genéricas | **Nuevo:** taller (guantera e impresora 3D), almacén (bolsas de carga) y esclusa con dos trajes |
| Hangar y fabricación | Estación (pantalla 2D y maqueta) | Igual; interiores como siguiente paso (§5) |

## 2. El módulo: una cápsula

### Referencias

| Nave | Volumen | Tripulación y cabina | Qué tomamos | Fuente |
| --- | --- | --- | --- | --- |
| **Módulo lunar Apolo** (etapa de ascenso) | 6,7 m³ de cabina, 4,5 m³ habitables; 2,34 m de alto y 1,07 m de fondo | Dos astronautas **de pie**, sujetos con cables (los asientos se quitaron por peso); ventanas triangulares pequeñas y una ventana en el techo para el acople; escotilla delantera de 81 × 81 cm para salir a la Luna y escotilla de acople en el techo; dos ciclos de despresurización previstos | Escotilla de acople y ventana en el techo; la cabina entera hace de esclusa; la masa en seco de 2150 kg | [Wikipedia: Apollo Lunar Module](https://en.wikipedia.org/wiki/Apollo_Lunar_Module) |
| **Orion** | 8,9 m³ habitables, 19,56 m³ presurizados | 4 asientos; tres pantallas principales y siete paneles de interruptores; mandos de mano de **rotación** y **traslación**; aseo UWMS en un compartimento cerrado de 0,46 m²; el volante de ejercicio va bajo la escotilla lateral | Los dos mandos de mano en los reposabrazos; aseo cerrado | [Wikipedia: Orion](https://en.wikipedia.org/wiki/Orion_(spacecraft)) |
| **Crew Dragon** | 9,3 m³ presurizados | Panel de tres pantallas sobre los asientos centrales; aseo en el techo **con cortina**; puerto IDSS en el techo y escotilla lateral para entrar | La consola de tres pantallas y el aseo con cortina | [Wikipedia: SpaceX Dragon 2](https://en.wikipedia.org/wiki/SpaceX_Dragon_2) |
| **Starliner** | 11 m³ | Hasta 7 plazas (la NASA vuela 4); NASA Docking System bajo el cono del morro | Confirma el tamaño: 9–11 m³ para una cápsula de 4 | [Wikipedia: Boeing Starliner](https://en.wikipedia.org/wiki/Boeing_Starliner) |

Nuestra cabina mide unos 2,4 × 1,7 × 1,95 m (≈ 8 m³), como Orion o Dragon. Es una nave de **salidas de horas**: no lleva cocina, camas ni enfermería. Doménica vuelve a la nodriza para comer y dormir.

### Cómo es ahora (`src/adapters/three/cockpit.ts`)

Vista desde el asiento del piloto, mirando a proa:

- **Delante:** consola con tres pantallas (NAV, SISTEMAS, SOPORTE VITAL) y debajo una fila de **interruptores físicos**: Dragon y Orion guardan unos pocos para lo que tiene que funcionar con las pantallas apagadas. Los de los extremos, en rojo, son el aborto y la extinción de incendios.
- **Asientos:** el del piloto y otro a su derecha, reclinados, con arnés de cinco puntos. En el reposabrazos derecho está el **mando de rotación** y en el izquierdo el de **traslación** (Orion, Apolo). El respaldo del piloto no se dibuja: al girar la cabeza taparía la cabina.
- **Techo:** la **escotilla de acople** (IDSS) con su ventanita, por donde se pasa a la nodriza. La cámara «Acople» sigue mirando por ahí.
- **Detrás a la izquierda:** la **escotilla EVA**, con la válvula para despresurizar la cabina, y el **traje** colgado en el mamparo. Como en el módulo lunar, toda la cabina hace de esclusa: no hay sitio para una esclusa aparte. El paseo espacial (`eva-mode.ts`) no cambia.
- **Detrás a la derecha:** el **aseo** tras una cortina (Dragon, Orion).
- **Mamparo trasero:** bolsas de carga, tres **cartuchos de CO₂** (el módulo lunar y Orion los cambian a mano), botiquín. En el techo, máscaras de oxígeno y pasamanos; en los lados, extintor y grifo de agua.
- **Rótulos** pequeños («Escotilla de acople», «Escotilla EVA», «Traje EVA», «Aseo», «Filtros de CO₂») que se ven siempre, aunque los tape una pared.

**Licencia:** la ventana delantera es mucho mayor que la de cualquier cápsula real (las del módulo lunar eran triángulos pequeños). Así se puede aterrizar mirando. Las cámaras (ventral, trasera, exterior, acople, nodriza) y el HUD siguen igual.

**Pendiente (pregunta 3 de nave-nodriza.md):** el módulo pesa ~680 kg y la etapa de ascenso del módulo lunar pesaba 2150 kg en seco. La cabina ahora parece real; la masa sigue siendo una licencia.

## 3. La nodriza

### Referencias de hábitat de larga duración

| Estudio o nave | Qué dice | Qué tomamos | Fuente |
| --- | --- | --- | --- |
| **Deep Space Habitat** (NASA Marshall, Smitherman et al. 2011) | Hábitat de 4 personas y 60 o 500 días hecho con módulos de la ISS. Camarotes de **~4 m³** (en la ISS ~2 m³) en el **extremo tranquilo** del módulo, con privacidad acústica y visual, y que sirven de refugio contra tormentas solares. El aseo **no** va junto a los camarotes ni junto a la cocina. El ejercicio es un espacio abierto **junto a la enfermería**. La cocina se abre a una mesa común. El almacenaje aísla del ruido y de la radiación | El orden del módulo: ruidoso (cocina) en un extremo, tranquilo (camarote) en el otro, ejercicio al lado de la enfermería, aseo fuera | [Deep Space Habitat Configurations Based on ISS Systems](https://ntrs.nasa.gov/api/citations/20120014530/downloads/20120014530.pdf) |
| **TransHab** (NASA, años 90) | Hábitat hinchable de 8,2 m de diámetro y 339,8 m³ en cuatro niveles: cocina y mesa común (nivel 1); seis camarotes de **2,3 m³** con saco, taquilla y ordenador, y los depósitos de agua en el núcleo (nivel 2); ejercicio con cinta y bicicleta, dos bastidores del Crew Health Care System, aseo y almacén (nivel 3); túnel (nivel 4) | Cinta y bicicleta juntas; enfermería con lo que lleva un bastidor CHeCS | [Wikipedia: TransHab](https://en.wikipedia.org/wiki/TransHab) |
| **Camarotes de la ISS** (Node 2) | Hasta cuatro en el Node 2, con sujeciones para dormir, luz regulable, ventilación propia, aislamiento acústico, material contra la radiación y equipo de comunicaciones | Un camarote cerrado y personal; en el juego, con su portátil para leer las cartas de la familia | [Broyan, Borrego y Bahr, ICES 2008](https://ntrs.nasa.gov/citations/20080013462) |
| **Ejercicio en la ISS** | **T2** (cinta Woodway modificada, 2,4–19,3 km/h, con arnés y gomas), **CEVIS** (bicicleta de 25–350 W a 30–120 rpm), **ARED** (cilindros de vacío, 11–272 kg). El estudio **Sprint** probó un plan de alta intensidad: 3 días de intervalos (8 × 30 s, 6 × 2 min, 4 × 4 min) y 3 de 30 min continuos al 75 % del VO2 pico, más fuerza 3 días (4 × 12, 4 × 8 o 4 × 6). Unas **6 h a la semana**, frente a las 9–10 del programa normal | Las tres máquinas y los entrenamientos | [English et al. 2020, npj Microgravity](https://pmc.ncbi.nlm.nih.gov/articles/PMC7434884) |
| **Pulso máximo** | 208 − 0,7 × edad | Objetivo de los intervalos: más del 90 % | [Tanaka et al. 2001](https://doi.org/10.1016/S0735-1097(00)01054-8) |

### El módulo del anillo (12 × 4 × 2,6 m, a 1 g)

`src/adapters/three/interior/room.ts`. El eje z va a lo largo del suelo del anillo, del ascensor (−z) a la puerta de la cubierta de cultivo (+z).

```
 −z  ascensor ·································································· puerta a la cubierta  +z
 izq. │ bastidores del huerto (18 macetas) │ enfermería │ escotilla │ camarote de Doménica │ gatos │
      │                                    │            │  bahía    │ (litera, portátil)   │       │
 centro                                          esterilla de yoga (cruzada)
 der. │ cocina · nevera · molino · soja · laboratorio de carne │ mente de la nave │ cinta · bici · fuerza │
       └──────── extremo ruidoso (agua, ruido, olores) ────────┘                 └─ extremo tranquilo ─┘
```

| Zona | Dónde | Qué hay | Tarea que la usa |
| --- | --- | --- | --- |
| Huerto en bastidores | izq., z −5,7 a −0,7 | Dos pisos de canales NFT con LED (como Veggie/BPC) | regar, agitar, cosechar, curar plantas |
| Cocina | der., z −5,6 a −2,7 | Placa de inducción, horno, nevera | cocinar |
| Molino y procesador de soja | der., z −2,6 a −1,8 | Tolva, molino, procesador | procesar |
| Laboratorio de carne cultivada | der., z −0,6 a +0,9 | Tanque agitado, nitrógeno líquido, campana | cultivo (sembrar, renovar, diferenciar, cosechar, esterilizar) |
| Enfermería (CHeCS) | izq., z −0,4 a +2,1 | Camilla, mesa veterinaria, armario, monitor | atender pacientes (personas y animales) |
| Mente de la nave | der., z +2 | Panel con la clase de la nave | reparar la nave |
| Escotilla de la bahía | izq., z +2,75 | Puerta con marco ámbar | abrir la bahía |
| **Rincón de ejercicio** | centro y der., z +2,9 a +5,9 | Esterilla de yoga, cinta (T2), bicicleta (CEVIS) y estante de fuerza con barra (ARED) | yoga, **ejercicio** (nuevo) |
| **Camarote de Doménica** | izq., z +3,3 a +5,25 | Cabina cerrada de 0,95 × 1,95 m: litera con cajones, estante, portátil, dos fotos (Nevaeh y Kushal), luz de lectura, cortina. Los gatos duermen en su litera | El botón «Camarote: leer cartas» abre la radio |
| Gatos | izq., z +5,3 a +6, junto al camarote | Arenero y cuencos; el rascador está en la puerta del camarote | alimentar y calmar gatos |

En el anillo hay 1 g, así que las máquinas son las de la Tierra: la cinta no necesita el arnés con gomas de la T2 ni la bicicleta las correas de la CEVIS. Eso es parte de uno de los retos. La de fuerza se queda como la ARED: no pesa lo que levanta.

**Camarote:** mide ~4,6 m³ (0,95 × 1,95 × 2,5 m), en la línea de los 4 m³ del Deep Space Habitat. Es más que los ~2 m³ de la ISS porque a 1 g hace falta una litera. Está en el extremo tranquilo y no se toca con la cocina.

**Fuera del módulo, en la cubierta de cultivo** (`farm-deck.ts`, la misma escena):

| Zona | Dónde | Por qué allí |
| --- | --- | --- |
| **Aseo** | a la izquierda de la puerta, 1,4 × 1,25 m, con puerta | El Deep Space Habitat no quiere el aseo junto a la cocina ni junto a los camarotes |
| **Gallinero** | al final del césped, a la derecha (x ≈ 7,4) | Las gallinas no deben vivir junto a la cocina y la enfermería. En la cubierta tienen el césped y el compost al lado, y las gallinas libres salen por su puerta |
| Perros, bancales, higueras | igual que antes | |

### El ejercicio (dominio)

`modules/wellness/data/exercise.ts` guarda las tres máquinas con sus límites reales y cuatro entrenamientos del protocolo Sprint. `workoutChore` (en `chores/application/catalog.ts`) convierte cada uno en una tarea de **Salud** con retos de predecir:

| Entrenamiento | Retos |
| --- | --- |
| Intervalos 4 × 4 min en la cinta | pulso objetivo con 208 − 0,7 × edad y el 90 % (30 años → 169 lpm); minutos a fondo de un bucle (16 min); qué da la cinta si se le piden 22 km/h (19,3); qué cambia a 1 g |
| Intervalos 8 × 30 s en la bicicleta | el pulso; 4 min a fondo; 350 W como máximo |
| 30 min continuos en la bicicleta | 3 días × 30 min = 90 min a la semana; el límite de la bici |
| Fuerza 4 × 8 | dos bucles anidados: 32 repeticiones; 272 kg como máximo |

Cada reto resuelto suma forma a Doménica (`CrewMember.train`): un entrenamiento entero da +0,35 de forma y −0,1 de estrés, contra +0,25 y −0,3 del yoga (**valores de juego**, `CREW_TUNING`). El ejercicio pone en forma y el yoga calma.

### La espina sin gravedad

Interior (`interior/spoke.ts`): desde el cojinete hacia proa, el **taller** (una guantera con dos puertos para los guantes, como la MSG de Destiny, y una impresora 3D), el **almacén** (bolsas de carga atadas al «techo», como en el PMM Leonardo), la escotilla verde al **puente de mando**, la **esclusa** con dos trajes EMU y la escotilla exterior, y al final la escotilla al módulo. Por dentro, la espina está comprimida a 13,5 m; por fuera, los módulos ocupan unos 20 m.

Fuera (`NODRIZA.layout.spineModules`, dibujados en `mothership-model.ts`):

| Módulo | z (m) | Ø | Como |
| --- | --- | --- | --- |
| Nodo delantero con el puente y el puerto IDSS | −74,5 a −65,5 | 4,4 m | [Unity](https://en.wikipedia.org/wiki/Unity_(ISS_module)) (ya estaba) |
| Esclusa | −65,5 a −60,5 | 3,8 m | [Quest Joint Airlock](https://en.wikipedia.org/wiki/Quest_Joint_Airlock) (5,5 × 4 m) |
| Almacén | −60,5 a −54 | 4,2 m | [Leonardo (PMM)](https://en.wikipedia.org/wiki/Leonardo_(ISS_module)) (6,6 × 4,57 m) |
| Taller | −54 a −46 | 4 m | [Destiny](https://en.wikipedia.org/wiki/Destiny_(ISS_module)) (8,5 × 4,3 m) |
| Cubo del anillo habitable | −45 a −39 | | gira con el anillo |

Un test comprueba que van seguidos, entre el nodo y el cubo.

### Radiadores, escudo y propulsores (por fuera)

El reactor da 2 MWe con un 33,7 % de rendimiento: hay que tirar **3,93 MW** de calor. El estudio de la NASA da **2760 m²** de radiador, emisividad **0,9**, un sumidero de **4 K** y **357 K** a la entrada del compresor, el punto más frío del ciclo ([Harnack et al. 2022](https://ntrs.nasa.gov/api/citations/20220013600/downloads/ASCEND_22_Brayton_Performance_Mass_Sensitivity.pdf)). El estudio no dice si los 2760 m² son área que radia o planta. Con Stefan–Boltzmann (`domain/thermal.ts`):

- Si son **área que radia**: T = (3,93 MW / (0,9 · σ · 2760 m²))^¼ ≈ **409 K**. Está por encima de 357 K: es posible.
- Si fueran **planta** de paneles de dos caras (5520 m² radiando): T ≈ 344 K. Está por debajo de la entrada del compresor: el radiador no podría enfriar el gas hasta allí. **Imposible.**

Así que los paneles son de dos caras y su **planta es de 1380 m²**: dos alas de 690 m². Antes la maqueta dibujaba 2755 m² de planta, el doble. Las alas son **trapecios** de z = +4 a +50 m, 22 m de ancho delante y 8 m detrás, con costuras entre paneles y un colector a lo largo de la raíz.

**Escudo de sombra:** un tronco de cono entre el reactor (z = +74 m) y el resto (z = +70,5 a +72 m) que proyecta una sombra de **35°** de semiángulo. Es un valor de juego: el número redondo más pequeño que cubre las llantas de los dos anillos. Por eso las alas se estrechan hacia el reactor y los módulos de propulsores pasan de z = +64 a **+54 m**. Un test comprueba que los anillos, las esquinas de las alas, los módulos de propulsores y los de la espina caen dentro de la sombra. Detrás del escudo hay cuatro convertidores Brayton, como en el estudio. La espina es ahora una celosía con diagonales.

**Lo que no cambia:** los anillos (56 m, 4 rpm, 18 m de ancho), el presupuesto de masas y la propulsión.

## 4. Lo que tocan las tareas

Todas las tareas siguen llegando a su sitio. `stationFor` en `src/interior.ts` lleva cada tipo de tarea a una estación de `STATIONS`, y el paseo automático cruza la puerta de la cubierta de cultivo cuando hace falta (el gallinero ya no está en el módulo):

- `ejercicio` → «Rincón de ejercicio» (nuevo); `yoga` → esterilla, igual que antes.
- Gallinas: abrir el gallinero, darles de comer, recoger huevos y programarlas → «Gallinero», ahora en la cubierta. Las gallinas libres siguen yendo al césped junto a la puerta.
- Gatos → «Rincón de los gatos», junto al camarote.
- «Camarote de Doménica» → abre la radio con las cartas.
- El resto, igual.

Comprobado en el navegador (iPhone 13 y 1280 × 800): caminar con el mando táctil, el botón de la estación de ejercicio («Rincón de ejercicio: 4 tareas»), su lista y el primer reto, sin errores en la consola.

## 5. La estación por dentro

Petición de diseño (2026-11-12): «Que se pueda andar por dentro de la estación, tanto por el hangar como por el módulo habitable».

**Cómo se entra:** con el módulo acoplado a la estación, o con la nodriza atracada en ella y el módulo a bordo, se entra por la escotilla donde está acoplado el vehículo: **«Entrar en la estación»** en la cabina del módulo, o **Pasar a la estación** en la escotilla de la espina de la nodriza. **Salir** devuelve por la escotilla por la que se entró ([accesos.md](accesos.md)). Doménica entra por la escotilla del puerto donde está la nave: por el **suelo del Nodo 2** si viene del módulo o por **proa del Nodo 2** si viene de la nodriza.

### Ingravidez y vertical local

La estación no gira, así que dentro hay **0 g** en todas partes. Doménica se mueve igual que en la espina de la nodriza: **de asidero en asidero**. Se agarra, se impulsa, vuela en línea recta sin frenar y agarra el siguiente asidero. Ver [ingravidez.md](ingravidez.md); el dominio compartido es `modules/gravity/domain/iva.ts`. (Antes flotaba con un empuje continuo, `floatStep`, que ya no existe.)

Toda la estación tiene la **misma vertical local**, como pide la NASA (NASA-STD-3001 Vol. 2, [V2 8007](https://www.nasa.gov/reference/8-0-architecture-vol-2): orientación coherente respecto a una vertical definida, sobre todo sin gravedad). El **techo** mira al cenit (+y), la **proa** a −z y el **estribor** a +x. Las ayudas para orientarse (V2 8010 y V2 8011) son:

- **Colores por cara:** suelo oscuro, techo claro con las tiras de luz (la luz viene de «arriba») y paredes grises con las juntas entre bastidores cada 1,05 m (el ancho de un [bastidor ISPR](https://en.wikipedia.org/wiki/International_Standard_Payload_Rack)).
- **Rótulos pintados** en cada cara, cerca de los extremos de cada módulo: «HAB1 · TECHO», «FAB1 · BABOR»…
- **Códigos de ubicación** como los de la ISS ([LAB1S2 es la guantera MSG en Destiny](https://gipoc.grc.nasa.gov/pims/pimsdocs/public/ISS%20Handbook/hb_vib_equipment_Inc68_POSSUM_SAMS_Photos_2023.pdf)): módulo, cara (D suelo, O techo, P babor, S estribor) y bahía. La refinería es FAB1P2 y la impresora FAB1S4.
- **HUD:** el módulo donde está, hacia dónde mira («Mirando hacia popa · el techo es "arriba"»), la gravedad (0 g), el aire (101 kPa o vacío) y lo que tiene al lado con su código.

### Los módulos (`modules/station/data/interior.ts`, a partir de `POLANA_LAYOUT`)

El espacio libre de cada módulo es un **pasillo** entre lo que va en las paredes. Su largo es el del módulo de `structure.ts`. Su sección es un valor de juego que cabe en el diámetro real (un test lo comprueba). Entre módulos solo se pasa por las **escotillas**: CBM de [1,27 m de lado](https://en.wikipedia.org/wiki/Common_Berthing_Mechanism) entre módulos e IDSS de [800 mm](https://en.wikipedia.org/wiki/NASA_Docking_System) en los adaptadores de atraque.

| Código | Módulo | Largo | Pasillo | Qué hay |
| --- | --- | --- | --- | --- |
| NOD2 | Nodo 2 (atraque), como [Unity](https://en.wikipedia.org/wiki/Unity_(ISS_module)) | 5,47 m | 2,4 × 2,4 m | Escotilla IDSS del módulo en el suelo y de la nodriza a proa; bolsas de carga en el techo |
| HAB1 | Módulo habitable, como el [HALO](https://handwiki.org/wiki/Astronomy:Habitation_and_Logistics_Outpost) (3 m de diámetro) | 6,1 m | 1,2 × 1,7 m | Desde el Nodo 1: **ejercicio** (estribor: bicicleta como la CEVIS y volante de inercia como el de Orion) y **aseo** cerrado con UWMS (babor); en el centro, la **cocina** de calentar con grifo de agua (estribor), la **mesa** con cinchas y velcro (suelo) y el **botiquín** (techo); en el extremo tranquilo, junto al Nodo 2, **dos camarotes para visitas** (~1,8 m³ cada uno, como los ~2 m³ de la ISS) |
| NOD1 | Nodo 1, como Unity | 5,47 m | 2,4 × 2,4 m | Dos puertos radiales CBM libres, tapados |
| FAB1 | Módulo de fabricación, como [Destiny](https://en.wikipedia.org/wiki/Destiny_(ISS_module)) (24 bastidores, seis por cara) | 8,5 m | 2 × 2 m | **Refinería** (babor) y **guantera** como la [MSG](https://en.wikipedia.org/wiki/Microgravity_Science_Glovebox) (estribor, 255 L, puertos de 40 cm); **fundición** (babor) e **impresora 3D de metal** (estribor, [como la de la ESA en la ISS](https://www.tomshardware.com/3d-printing/scientists-print-3d-metal-parts-in-space-for-the-first-time-a-key-ability-for-long-distance-long-duration-missions)); **esclusa de carga** en el techo, como la [Bishop](https://en.wikipedia.org/wiki/Bishop_Airlock_Module), para pasar piezas al hangar |
| ESC1 | Esclusa (valor de juego: la mitad «de tripulación» de una esclusa como [Quest](https://en.wikipedia.org/wiki/Quest_Joint_Airlock)) | 2,1 m | 1,7 × 1,9 m | Dos trajes colgados; escotilla exterior de 1 m al hangar |
| HNG1 | Hangar **sin presión** | 20 m | 20 × 14 m | Estantes de piezas a babor y estribor (tres baldas, seis cajas por balda y lado), seis cunas para sondas en el suelo, consola, puerta abierta a popa |

El hábitat sigue el orden del Deep Space Habitat (§3): el ejercicio y el aseo juntos en un extremo, lejos de los camarotes; la cocina y la mesa en medio; los camarotes en el extremo tranquilo. Aquí no se cocina: sin gravedad solo se calienta comida y la cocina de verdad está en el anillo de la nodriza, a 1 g. La enfermería también sigue en la nodriza.

### El hangar: sin presión (decisión)

**El hangar está abierto al vacío.** Doménica entra por la esclusa, con traje.

- **No hay hangares presurizados en órbita.** La [bodega del transbordador](https://en.wikipedia.org/wiki/Space_Shuttle_orbiter) (18,3 × 4,6 m) volaba abierta y las cargas de la ISS salen al vacío por esclusas pequeñas: Quest para personas (34 m³) y Bishop para cargas (4 m³).
- **El tamaño.** El hangar mide 20 × 14 × 20 m, unos 5600 m³: **seis veces el volumen presurizado de toda la ISS** ([916 m³](https://en.wikipedia.org/wiki/International_Space_Station)). A 101,3 kPa harían falta **6,7 t de aire** (1,19 kg/m³), y cada vez que se abriera la puerta para sacar una sonda habría que bombearlo todo o perderlo.
- **La carga en las paredes.** 101,3 kPa empujan **28 MN** cada pared de 20 × 14 m y **41 MN** el suelo y el techo de 20 × 20 m. Una caja plana aguanta mal la presión. Por eso los módulos presurizados son cilindros de 3–4,5 m.

`hangarPressureCase()` hace estas cuentas, y un test las comprueba.

**La esclusa** (`fits(p, margen, conTraje)` en el dominio): la escotilla interior solo se abre con la esclusa **a presión** y la exterior solo **vacía y con traje**. El botón «Ponerse el traje y vaciar la esclusa» cambia de estado en 2,5 s, mientras el HUD baja de 101 a 0 kPa. Es una **licencia**: en la ISS, ponerse el traje y la prerrespiración llevan horas (Quest baja la cabina a 70 kPa la noche antes). Con el traje no se puede volver a la nave: primero hay que llenar la esclusa y quitárselo.

En el hangar se ven las **piezas de repuesto** en cajas sobre los estantes, con el nombre de la pieza en la primera caja de cada tipo, y las **sondas fabricadas** en sus cunas, con su nombre. Salen de `Hangar` del dominio (`StationInterior.stow`). La nodriza y el módulo que pilotas no están dentro: están atracadas fuera.

### Las máquinas abren la pantalla de la estación

| Dónde | Abre |
| --- | --- |
| Refinería, guantera | **Materiales** (la bodega y la refinería) |
| Impresora 3D de metal | **Planos** |
| Fundición | **Fabricación** (las colas de las tres máquinas) |
| Consola del hangar, estantes, cunas, esclusa de carga | **Hangar** |

Se abre de dos maneras: **acercándose**, porque aparece un botón verde abajo («Refinería: abrir Materiales»; también con Intro), o **tocándola** en la pantalla a menos de 12 m. Al cerrar la pantalla («Volver») Doménica sigue donde estaba. Las ventanas de la refinería, la fundición y la impresora brillan y parpadean mientras su cola trabaja, y se quedan tenues cuando la máquina para. Lo que no es máquina (cocina, aseo, camarotes, ejercicio, puertos…) da un botón «¿qué es?» con una línea y su referencia. **Tareas** (arriba) abre la pantalla directamente.

Para **salir**: por la escotilla del módulo se vuelve a la cabina y por la de la nodriza al interior de la nodriza, si cada nave está atracada en su puerto. «Salir», arriba, vuelve a la cabina desde cualquier sitio, salvo con el traje puesto.

### Móvil primero

Dos mandos en las esquinas de abajo: las flechas de salto, que llevan de asidero en asidero (fase C de [ingravidez.md](ingravidez.md)), y Mirar. El botón de contexto va encima, al alcance del pulgar. Arriba a la izquierda va el HUD y a la derecha tres botones cortos: «Tareas», «Vista 3ª/1ª» y «Salir». Los rótulos flotantes se esconden cuando están tan cerca que taparían la pantalla. La cámara en 3ª persona nunca atraviesa una pared: se acerca al centro del pasillo y, si aun así no cabe detrás de Doménica, pasa a 1ª persona hasta que hay sitio. En el escritorio, las flechas o WASD saltan, Q/E y arrastrar miran e Intro usa.

### Archivos

- Dominio: `modules/station/domain/interior.ts` (`StationInterior`: volúmenes, escotillas, esclusa, cara hacia la que se mira, códigos, objeto cercano, estiba) y `modules/gravity/domain/iva.ts` y `handrails.ts`. Datos: `modules/station/data/interior.ts` y `handrails.ts`. Tests: `interior.test.ts`, `iva.test.ts`, `handrails.test.ts`.
- Adaptadores: `adapters/three/interior/station-rooms.ts` (la escena), `src/station-interior.ts` (modo, mandos y HUD) y `src/ui/station-interior.css`.
- Compartidos: `main.ts` (crear el modo, el bucle, la vuelta desde la pantalla), `station-dock.ts` (botón «Entrar en la estación») y `interior/zones.ts` (el mismo movimiento por asideros).

## 6. Capturas

`docs/screenshots/interiores-*-{mobile,desktop}.png` (iPhone 13 y 1280 × 800):

1. Cabina del módulo mirando a proa · 2, 2b. Mirando atrás: escotilla EVA y traje; aseo, cartuchos de CO₂ y botiquín · 2c. La escotilla de acople del techo
3. El módulo del anillo hacia el extremo tranquilo (ejercicio, camarote) · 4. El camarote
5. La estación de ejercicio con sus cuatro tareas · 6. El primer reto (pulso objetivo)
7. El gallinero en la cubierta de cultivo · 8. La espina: taller y almacén · 9. La esclusa con los trajes
10. La nodriza por fuera · 11. Desde atrás: radiadores en trapecio, escudo y propulsores · 12. La pestaña Nodriza de la bahía

`docs/screenshots/estacion-interior-*-{mobile,desktop}.png` (iPhone 13 y 1280 × 800):

1. Cabina acoplada a la estación con «Entrar en la estación» · 2. Nodo 2 al entrar desde el módulo · 3. Módulo habitable: mesa, camarotes y botiquín
4. Del Nodo 1 al módulo de fabricación · 5. La refinería con su botón · 6. La pestaña Materiales abierta desde la refinería · 7. La impresora y, al fondo, la esclusa
8. Los trajes en la esclusa · 9. La escotilla exterior, con la esclusa vacía · 10. El hangar desde la puerta, hacia la esclusa · 11. Estantes y sondas en sus cunas

## Preguntas para Berón

1. **Masa del módulo.** La cabina ya parece una cápsula de 8 m³, pero pesa ~680 kg (la etapa de ascenso del módulo lunar pesaba 2150 kg en seco). ¿La subimos, aunque los RCS empujen menos?
2. **¿Más tripulación?** El Deep Space Habitat y TransHab son para 4–6 personas. Con Doménica sola, un camarote basta. Si vienen visitas (Nevaeh, Kushal), ¿usamos los camarotes del anillo gemelo, que hoy no tienen interior?
3. **Ventana del módulo.** ¿Te vale la ventana grande, que es una licencia, o prefieres ventanas pequeñas como las del módulo lunar y aterrizar más con las cámaras?
4. **Estación.** Hecho (§5). Quedan dudas nuevas en la lista de abajo.
5. **Escudo de sombra.** 35° es un valor de juego. Los diseños reales alejan el reactor con un mástil largo para que el escudo sea pequeño. ¿Alargamos la nodriza por popa?
6. **Hangar sin presión.** ¿Te vale entrar con traje por la esclusa, o prefieres una galería presurizada con ventanas (como la Cupola de la ISS) desde la que se vea el hangar sin salir?
7. **Esclusa rápida.** Ponerse el traje y vaciar la esclusa lleva 2,5 s; en la ISS lleva horas. ¿Lo dejamos así o hacemos un pequeño reto (el protocolo de prerrespiración) cada vez?
8. **Paso directo nodriza → estación.** Hoy se entra desde la cabina del módulo. ¿Añadimos en la espina de la nodriza un botón «Ir a la estación» cuando está atracada?
9. **Visitas.** Los camarotes del módulo habitable están vacíos. ¿Quién viene a dormir a la estación (Nevaeh, Kushal, la tripulación que traiga la historia)?
