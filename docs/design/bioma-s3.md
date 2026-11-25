# Santuario 3: el bioma del aire y las alturas (rama `bioma-aire`)

Berón, 2026-11-19: «crear un bioma donde hay animales y plantas de todo tipo para cumplir una cadena alimenticia y que
sigan sus ciclos de vida naturales». Berón, 2026-11-20: cada santuario recrea el bioma de un elemento (reglas.md §1); el
3 es **el aire y las alturas**: aves, cabras que trepan, acantilados, cañones y roedores. La isla subantártica de la
primera versión se sustituye por una sola isla gigante, la **Isla de las alturas** (las demás islas del santuario 3
siguen: entrenamiento, plataforma de lanzamiento e islas mágicas). Se llega en helicóptero (su máquina de navegación)
o con «Ir» desde Áreas.

**Una región real**: los valles de Hunza–Nagar en el Karakórum (Gilgit-Baltistán, Pakistán), del fondo del valle a
Khunjerab. Todas las especies viven juntas allí: la lista del Parque Nacional de Khunjerab, más el markhor y la ardilla
voladora lanuda de los bosques de Nagar y Gilgit; las plantas son los cinturones del valle de Batura (Eberhardt,
Dickoré y Miehe 2007) y los bosques húmedos del Rakaposhi.

## Dónde está el código

| Archivo | Qué |
| --- | --- |
| `aerial-sanctuary/data/bioma.ts` | `airBiome(k)` / `AIR_BIOME` (un `BiomeDef`): 12 plantas, 4 bancos, 15 insectos y dos restos (carroña, estiércol), el clima de Gilgit, el día 0 (20 de noviembre); la escala ×400 y la regla por persona; **una fuente** por especie; lo nuestro en `ours` con el porqué (**licencia**) |
| `aerial-sanctuary/domain/mountain.ts` | La montaña como función de altura: macizo con anillo de cantiles, cresta, garganta, senderos, rellanos; pendiente, cinturón y altitud real |
| `aerial-sanctuary/data/bioma-island.ts` | La isla: `MOUNTAIN` (sus datos), `BELTS`, zonas, cabaña, helipuerto, senderos, repisas del farallón, Áreas con cinturón |
| `aerial-sanctuary/domain/bioma.ts` | La cadena alimenticia **genérica**: vive cualquier `BiomeDef` (determinista, con semilla) |
| `aerial-sanctuary/data/bioma-conducta.ts` | Rasgos de conducta para `fauna`, cortejos, rivalidades (choque de cuernos) y etogramas, con fuente |
| `aerial-sanctuary/application/biome-life.ts` | La cadena + `fauna/Ecosystem` sobre el terreno: cada animal en su zona y su suelo, los que trepan en la roca, los vuelos (térmicas, picados, cernido, bandadas, huesos, vencejos, uve de los ánsares), la ardilla que planea al anochecer, las marmotas que hibernan |
| `aerial-sanctuary/data/bioma-crowd.ts`, `domain/bioma-crowd.ts` | Colonias (genéricas: especies como datos): tamaños reales, obreras dibujadas (licencia), colmenas, nidos y hormigueros |
| `aerial-sanctuary/data/globo-nubes.ts`, `domain/abeja.ts`, `adapters/three/s3-cloud-globe.ts` | El globo de nubes y su abeja ([globo-nubes.md](globo-nubes.md)) |
| `adapters/three/s3-biome-models.ts` | La escena: terreno por trozos con colores por cinturón, roca y sendero; río; árboles, matorrales y plantas con nivel de detalle; cabaña y mesa |
| `adapters/three/s3-biome-crowd.ts` | Las colonias dibujadas: obreras volando ante su nido cerca, cajas lejos (una malla instanciada) |
| `aerial-sanctuary/data/bioma-retos.ts`, `application/field-work.ts` | Los métodos de campo del Himalaya como retos (`procedureReto` del santuario 1) |
| `src/s3-biome.ts` | El cableado, la tarjeta del censo y la Y/botón naranja de la mesa de campo |

## La isla

Centro (1450, 250), 1600 × 1200 m, sin escalar (ya es gigante; solo la cabaña y el helipuerto crecen con la escala de
presentación). **Licencia**: 1 m de la isla son 9 m de ladera real; la playa son 2 400 m y la cumbre, a 520 m sobre el
mar, 5 080 m. Cada zona cae en su cinturón real (Batura): submontano hasta 2 700 m, montano hasta 3 500, subalpino
hasta 3 900, alpino hasta 4 600, subnival hasta 5 200 y nival encima.

| Zona (Áreas) | Cinturón | Qué hay |
| --- | --- | --- |
| Estación de investigación | submontano | Cabaña junto al río: tablón del censo y mesa de campo |
| Estepa de artemisa | submontano | Artemisa, efedra; ratones y hámsteres; zorro y cernícalo |
| Río de la garganta | submontano | Espino amarillo en la grava; palomas nivales |
| Bosque de pino azul | montano | Pino azul y pícea; la ardilla voladora lanuda |
| Enebral y abedules | subalpino | El límite del bosque; el markhor ramonea |
| Mirador de la garganta | alpino | Garganta de 160 m: markhores en sus paredes, el quebrantahuesos, el treparriscos |
| Pradera de las marmotas | alpino | Juncias y cojines; familias de marmotas en sus madrigueras, bharales, el águila real |
| Pedrera de las pikas | alpino | Cono de piedras; pikas entre las grietas, amapola azul |
| Farallón de los íbices | alpino | Anillo de cantiles de ~90 m: íbices en las repisas, colonia de buitres; **9 repisas para trepar con X** |
| Collado de la perdiz nival | subnival | Saussureas; la perdiz nival; pasan los ánsares indios |
| Campo de nieve | nival | Líquenes, colémbolos y arañas saltarinas de la zona eólica |

Áreas agrupa por **isla → cinturón** (`area-scope.ts`, alcance «cinturon»). Senderos andables del helipuerto a las
nieves, al mirador y al río (`mountain.test.ts`: todos por debajo de la pendiente andable). La roca más empinada que
`walkSlope` no tiene suelo: solo se sube por las repisas (suelos `bioma:repisa-N`, `climbTarget` del santuario 1).

## Especies: insectos gigantes (Berón, 2026-11-25)

Berón, 2026-11-25: la fauna del santuario 3 son **insectos gigantes reales de Gilgit-Baltistán**, cada uno con su
fuente; las plantas siguen, más las **flores** (néctar y polen) y los **pulgones** para la cadena. Los animales son
amigos, nunca comida de las personas. Fuentes completas en `data/bioma.ts`.

**Escala** (`INSECT_SCALE`, ficción): la mosca de la fruta (*Drosophila melanogaster*, 2,5 mm: `FRUIT_FLY_M`, real) se
dibuja de 1 m, así que **todo insecto se dibuja ×400**: la abeja asiática (11 mm) mide 4,4 m; el abejorro, 8 m; la
langosta, 20 m; la mantis, 28 m; la libélula, 19 m de largo y 32 m de envergadura. Los suelos y senderos siguen
andables: los insectos no son sólidos (como los animales del santuario 1), la cadena los pone en su zona y los vuelos
van por encima del terreno (`biome-life.test.ts`: todos en tierra o en el aire, nunca en el mar).

| Nivel | Especies (fuente principal) |
| --- | --- |
| Plantas | las 11 de antes y las **flores** (néctar y polen de la pradera, la estepa y los albaricoqueros de Hunza) |
| Bancos (cohortes) | pulgones (*Cinara* en los pinos), mosquitos y moscas pequeñas (plancton aéreo, Swan 1992), colémbolos de la nieve, arañas saltarinas de altura (*Euophrys omnisuperstes*: un arácnido, el que caza a más altura) |
| Herbívoros y polinizadores (2) | abeja melífera asiática *Apis cerana* (colmena), abejorro de Gilgit *Bombus tunicatus* = *B. gilgitensis* (GBIF 11075556; Williams 1991), Apolo del Himalaya *Parnassius epaphus* (Smith et al. 2007, Holarctic Lepidoptera 11), langosta migratoria *Locusta migratoria* (Mahmood, Abbas y Shah 2004, Pak. J. Zool. 36), mosca de la fruta, escarabajo enterrador *Nicrophorus nepalensis* (carroña), escarabajo del estiércol *Aphodius* |
| Depredadores de pulgones y pequeños (3) | mariquita de siete puntos, crisopa verde, sírfido de bandas, hormiga de los bosques *Formica* (ordeña pulgones), mosca ladrona (Asilidae) |
| Grandes cazadores (4) | libélula migradora *Pantala flavescens* (visitante may–oct; éxito de caza 0,9: Combes et al. 2012), mantis religiosa, avispón asiático *Vespa velutina* (caza abejas ante la colmena) |

**Restos**: la carroña (de los ratones y aves del valle que la isla no muestra) para el escarabajo enterrador, y el
**estiércol** de los yaks y cabras que pastan en verano, para el escarabajo del estiércol.

## La regla de animales por persona (como el santuario 1)

`fauna/domain/population.ts` (`ANIMALS_PER_HUMAN`, `allocate`, el reparto 70 / 22 / 8 de Cold Sanctuary) ahora recibe
su tabla (`PopulationTable`); sin tabla es la del santuario 1, que no cambia. El santuario 3:

- **Personas** (`s3People()`): los entrenadores de la iniciación (`data/trainers.ts`, 16) + Doménica = **17**.
- **Animales** = personas × el ajuste compartido **«Animales por persona»** (3–6, 4 por defecto) = 68.
- **Niveles**: tróficos 2 → presas (70 %), 3 → intermedios (22 %), 4 → ápice (8 %); cada especie peso 1
  (`S3_PER_HUMAN`). Con 4: 47 / 15 / 6 → abeja 7, abejorro 7, Apolo 7, langosta 6, mosca 7, enterrador 7, pelotero 6;
  mariquita, crisopa, sírfido, hormiga y asílido 3; libélula, mantis y avispón 2.
- Los insectos sociales cuentan **por colonia**: la cadena vive a su reina (la de la abeja y la hormiga, perenne; la del
  abejorro y el avispón, que funda el nido cada primavera) y la escena dibuja sus obreras.

`airBiome(k)` construye la cadena con ese número (inicio = tope); se aplica al volver a cargar el juego.

## Cómo funciona la cadena

`domain/bioma.ts` sigue genérico (recibe un `BiomeDef`); para los insectos añade, por especie y como datos:

- **Metamorfosis**: `eggDays`, `pupa` (completa: huevo, larva, pupa, adulto) o `nymph` (incompleta: ninfas sin alas).
  `lifeStageOf` da huevo / larva / ninfa / pupa / adulto; huevos y pupas no comen ni se ven (`quietNow`).
- **Anuales** (`annual`): una generación al año, el adulto vive lo que queda del año (`adultDays` = 405 − larva − joven);
  sin dispersión natal; los rescates y los que vuelven llegan en su mes de apareamiento. **Licencia**: una sola
  generación al año (la mosca y los pulgones tienen muchas; los pulgones van como banco).
- **Sin madre** (`selfFed`): las larvas comen solas (o las crían sus obreras): no hay muertes «sin madre».
- **Letargo**: cada uno pasa el invierno como en la realidad (huevo, ooteca, larva en el suelo, adulto escondido o la
  colmena entera); en noviembre se ven sobre todo abejas, moscas, mariquitas, crisopas y sírfidos.
- **Caza** con `fauna/Ecosystem` y su éxito real; la mantis y la libélula cazan al vuelo o al acecho.
- **Estable**: 10 años con las semillas 4, 11 y 23 sin extinciones (`bioma.test.ts`).

**Vuelos reales** (`FLIGHT` en `application/biome-life.ts`, altura en cuerpos): pecoreo de flor en flor (abeja,
abejorro), planeo (Apolo, alas quietas entre batidas), cernido inmóvil (sírfido), patrulla sobre el río (libélula),
acecho desde una percha (asílido), cernido ante la colmena (avispón), revoloteo en círculos cortos (mosca, crisopa,
mariquita), salto y vuelo corto (langosta). Cuerpo de cubos de insecto (`fauna/domain/animal-body.ts` `insect`): cabeza,
ojos, antenas, tórax, abdomen con bandas, **6 patas** en trípode, **alas que baten** (2 en moscas, 4 en el resto,
élitros en los escarabajos); larvas (`larva-<id>`, la oruga con sus falsas patas) y ninfas (`<id>-ninfa`, con esbozos
de alas). Los cuerpos del santuario 1 no cambian.

## Colonias

`data/bioma-crowd.ts`, `domain/bioma-crowd.ts`: cada colonia de la cadena se dibuja con `perAdult` obreras (licencia)
alrededor de su nido; en invierno no sale ninguna.

| Colonia | Real (fuente) | Obreras dibujadas | Nido |
| --- | --- | --- | --- |
| Abeja asiática | 6 000–7 000 obreras (Oldroyd y Wongsiri 2006) | ×8 | colmena en una grieta de roca, con sus panales |
| Abejorro de Gilgit | 50–400 obreras | ×4 | nido en una madriguera vieja, bajo el musgo |
| Avispón asiático | miles al final del verano | ×5 | nido de papel colgado de un árbol |
| Hormiga de los bosques | miles | ×10 | hormiguero de agujas de pino |

Cerca de ella las obreras son cuerpos articulados que vuelan en círculo ante su nido (las hormigas andan); lejos, una
caja cada una. Los nidos se dibujan más pequeños que la escala ×400 (licencia: una colmena serían 160 m).

## El globo de nubes

Sobre el mar al sur de la isla: una esfera de nubes donde se nada, con una abeja gigante que se desarrolla de huevo a
adulta en su celda. Ver [globo-nubes.md](globo-nubes.md).

## Escena y presupuesto (iPhone 13)

Terreno en 16 trozos de rejilla de 6 m, colores por cinturón, roca, sendero y grava; el río en el fondo de la garganta.
Pinos y abedules en una geometría fundida; enebros, artemisa, espino; cerca de ella (nivel de detalle): pedregal,
hierba, cojines, amapolas, saussureas. Insectos con los cuerpos de cubos de `fauna` ×400 (una malla fundida por
especie y etapa: una llamada cada una), sus colonias en una sola malla de cajas, el globo de nubes en ~7 llamadas. La
vida se actualiza si la cámara está a menos de 1 600 m. **≤ 600 llamadas** (en la pradera en junio: ~40).

## La estación: el censo y la mesa de campo

En la cabaña, el botón de interacción (la **Y naranja** del mando, o el botón naranja) abre **«Censo de la montaña»**:
cada insecto con sus etapas, qué come y quién se lo come, muertes y nacimientos; las colonias con sus colmenas, nidos
y hormigueros («Pasan el invierno dentro del nido»); los bancos por su peso. En la **mesa de campo**:

| Trabajo | Fuente | Cuándo |
| --- | --- | --- |
| Revisión de colmenas de *Apis cerana* | COLOSS BEEBOOK (Delaplane, van der Steen y Guzmán 2013, J. Apic. Res. 52) | con las colonias activas |
| Transecto de mariposas (el Apolo) | Pollard 1977; Pollard y Yates 1993 | junio–agosto |
| Trampas de caída para escarabajos | Barber 1931; Woodcock 2005 | abril–octubre |

Lo hecho queda en el **cuaderno de campo** del censo.

## Pruebas

`domain/bioma.test.ts` (regla por persona, escala, estado inicial, 10 años estables, una cadena genérica con una
langosta), `domain/abeja.test.ts`, `data/globo-nubes.test.ts`, `domain/mountain.test.ts`, `domain/bioma-crowd.test.ts`,
`data/bioma-island.test.ts`, `application/biome-life.test.ts`, `application/field-work.test.ts`,
`sanctuary-one/data/layout.test.ts` (el santuario 1 no cambia).

## Para después

- Los nombres de las zonas de `data/bioma-island.ts` aún hablan de mamíferos («Pradera de las marmotas», «Farallón de
  los íbices»): ese archivo lo cambia otro hilo (la montaña hueca con cuevas).
- El recorrido **PX-51** (`tools/experiencia/s3-bioma.mjs`) busca íbices, markhores y marmotas: hay que reescribirlo
  para los insectos (colmenas, Apolo en junio, avispón ante la colmena, el globo de nubes).
- Varias generaciones al año para la mosca y la mariquita; la bola de calor de las abejas contra el avispón.
