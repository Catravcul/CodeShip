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
| `aerial-sanctuary/data/bioma.ts` | `AIR_BIOME` (un `BiomeDef`): 28 especies y dos restos (carroña, huesos), el clima de Gilgit, el día 0 (20 de noviembre); **una fuente** por especie; lo nuestro en `ours` con el porqué (**licencia**) |
| `aerial-sanctuary/domain/mountain.ts` | La montaña como función de altura: macizo con anillo de cantiles, cresta, garganta, senderos, rellanos; pendiente, cinturón y altitud real |
| `aerial-sanctuary/data/bioma-island.ts` | La isla: `MOUNTAIN` (sus datos), `BELTS`, zonas, cabaña, helipuerto, senderos, repisas del farallón, Áreas con cinturón |
| `aerial-sanctuary/domain/bioma.ts` | La cadena alimenticia **genérica**: vive cualquier `BiomeDef` (determinista, con semilla) |
| `aerial-sanctuary/data/bioma-conducta.ts` | Rasgos de conducta para `fauna`, cortejos, rivalidades (choque de cuernos) y etogramas, con fuente |
| `aerial-sanctuary/application/biome-life.ts` | La cadena + `fauna/Ecosystem` sobre el terreno: cada animal en su zona y su suelo, los que trepan en la roca, los vuelos (térmicas, picados, cernido, bandadas, huesos, vencejos, uve de los ánsares), la ardilla que planea al anochecer, las marmotas que hibernan |
| `aerial-sanctuary/data/bioma-crowd.ts`, `domain/bioma-crowd.ts` | Multitudes (genéricas: especies como datos): tamaños de grupo reales, escala (licencia), parches, madrigueras y nidos |
| `adapters/three/s3-biome-models.ts` | La escena: terreno por trozos con colores por cinturón, roca y sendero; río; árboles, matorrales y plantas con nivel de detalle; cabaña y mesa |
| `adapters/three/s3-biome-crowd.ts` | Las multitudes dibujadas: cuerpos de cubos cerca, cajas lejos (una malla instanciada) |
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

## Especies

Todo **real** desde su fuente salvo lo dicho. Fuentes completas en `data/bioma.ts`.

| Grupo | Especies |
| --- | --- |
| Plantas (por cinturón) | estepa de artemisa, espino amarillo, pino azul, abedul y sauce, enebro, pradera alpina, plantas en cojín, amapola azul, saussurea, líquenes, y la **lluvia eólica** (lo que sube el viento: Swan 1961, 1992) |
| Bancos | insectos de la pradera, insectos voladores, ratones y hámsteres, colémbolos de la nieve, arañas saltarinas |
| Herbívoros | íbice, markhor, bharal, marmota de cola larga (hiberna sep–abr), pika orejuda, ardilla voladora lanuda (agujas de pino: Zahler y Khan 2003) |
| Depredadores | zorro rojo, leopardo de las nieves, águila real, cernícalo |
| Carroñeros | buitre del Himalaya (carroña), quebrantahuesos (huesos) |
| Aves | chova piquigualda, treparriscos, perdiz nival, paloma nival, vencejo real (visitante, may–sep), ánsar indio (de paso) |

Dejadas fuera (también del Khunjerab): lobo y oso pardo (el leopardo es el gran depredador; el presupuesto de la
cadena), argalí de Marco Polo y kiang (viven en las mesetas del paso, no en una ladera de cantiles; el bharal hace su
papel), murciélagos y liebre (nocturnos o sin nicho propio aquí). Las 23 especies subantárticas salen: no son de la región.

## Cómo funciona la cadena

Port de `FoodChain` de Cold Sanctuary, ahora **genérico**: `domain/bioma.ts` recibe un `BiomeDef` (especies, restos,
clima, día de inicio, «a otra parte de…») y construye su modelo una vez; nada del aire está en el dominio.

- **Tiempo.** El año dura 28 días de juego; pasos de una hora de juego; el día 0 es el 20 de noviembre. Determinista.
- **Plantas** crecen con la luz del día (latitud 35,9°) × el calor del mes de **Gilgit** a su altitud (−6,5 °C/km,
  OACI): la pradera alpina crece en verano, la estepa casi todo el año.
- **Restos.** Carroña y huesos: lo que dejan las muertes y las cazas (y algo de fuera, nuestro); se pudren a su ritmo.
  El buitre come carroña, el quebrantahuesos huesos.
- **Letargo** (`dormant`): las marmotas hibernan de septiembre a abril (ni comen ni gastan; ocultas en su madriguera).
- **Visitantes** (`windows`): el vencejo llega en mayo y se va en septiembre; los ánsares pasan en primavera y otoño.
  Llegan con edad de adulto. Los enjambres de insectos varían por año (`yearFactor`).
- **Individuos**: etapas, masa, ingesta ∝ masa^0,75, madres que alimentan a sus crías, reserva de ayuno; muertes de
  viejos, cazados, de hambre y sin madre. **Celo y partos** en su mes real; sin macho no hay crías (el íbice, celo
  dic–ene). Si el valle está lleno, «no cría este año».
- **Caza**: cada depredador quita como mucho el 30 % de lo que produce cada presa, con su éxito real; los cazadores del
  aire cazan «en ambos medios» (`fauna/Ecosystem`).
- **Estable**: 10 años con las semillas 4, 11 y 23 sin extinciones; los vencejos llegan cada año (`bioma.test.ts`).

## Multitudes (rebaños, colonias, madrigueras)

La cadena vive uno a uno unas decenas de animales; cada adulto **representa a `perAdult` más** (licencia) dibujados
alrededor. Tamaños de grupo reales:

| Multitud | Real (fuente) | Escala | Se ven |
| --- | --- | --- | --- |
| Íbices, dos rebaños en el farallón | 5–30 por rebaño (Wikipedia) | ×2 | ~28 |
| Markhores, en la garganta | hembras en grupos de 8–9 (ADW) | ×1,6 | ~16 |
| Bharales, pradera alta | grupos de hasta 10 (Wikipedia) | ×1,5 | ~20 |
| Marmotas, cinco familias | hasta 7 adultos y ~3 madrigueras (Wikipedia) | ×2,5 | ~35 y sus madrigueras |
| Pikas, dos pedreras | en grietas, sin madriguera | ×2 | ~32 |
| Buitres, colonia en repisas | 5–7 parejas (Wikipedia) | ×2 | ~12, nidos de palos |
| Perdiz nival, palomas, chovas | bandos y colonias en grietas | ×1,5 / ×4 / ×3 | 12 / 48 / 36 |

Los que viven en la roca (`footing: "roca"`) solo se colocan en roca empinada. Las madrigueras de las marmotas se ven
todo el año; en invierno las marmotas no. Nidos y huevos siguen el calendario real (`nestPhase`).

## Escena y presupuesto (iPhone 13)

Terreno en 16 trozos de rejilla de 6 m, colores por cinturón, roca, sendero y grava; el río en el fondo de la garganta.
Pinos y abedules en una geometría fundida; enebros, artemisa, espino; cerca de ella (nivel de detalle): pedregal,
hierba, cojines, amapolas, saussureas. Animales con los cuerpos de cubos de `fauna` (nuevas siluetas: patas y cola por
especie, aves por envergadura). La vida se actualiza si la cámara está a menos de 1 600 m. **≤ 600 llamadas** (PX-51:
~225).

## La estación: el censo y la mesa de campo

En la cabaña, el botón de interacción (la **Y naranja** del mando de Switch, o el botón naranja bajo el menú si no hay
mando) abre **«Censo de la montaña»**: cada especie con su cinturón, sus etapas, qué come y quién se la come, muertes y
nacimientos; «Duermen bajo tierra» para las marmotas en invierno; las multitudes con sus madrigueras y nidos; los
enjambres por su peso. En la **mesa de campo**, «Reto: Mesa de campo» abre los métodos de campo del Himalaya:

| Trabajo | Fuente | Cuándo |
| --- | --- | --- |
| Cámaras trampa para el leopardo de las nieves | Jackson, Roe, Wangchuk y Hunter 2006 (Wildlife Society Bulletin 34: 772); Durbach et al. (Snow Leopard Trust) | enero–marzo |
| Censo de íbices por doble observador (el total es la multitud de la cadena) | GSLEP 2019, «Double-observer survey manual» | con íbices en el farallón |
| Seguimiento de los nidos de buitre del Himalaya | Smith, Slater y Neal, BLM Technical Note 436 | con huevos o pollos |

Lo hecho queda en el **cuaderno de campo** del censo.

## Pruebas

`domain/bioma.test.ts`, `domain/mountain.test.ts`, `domain/bioma-crowd.test.ts`, `domain/area-scope.test.ts`,
`data/bioma-island.test.ts` (sendero andable, trepar las 9 repisas), `application/biome-life.test.ts` (todos en tierra y
en su suelo, los íbices en la roca, la ardilla planea al anochecer), `application/field-work.test.ts`,
`fauna/domain/animal-body-heights.test.ts`. Recorrido **PX-51** (`s3-bioma`): farallón (≥ 10 íbices a la vista,
buitres en térmicas, X sube a la repisa), garganta (quebrantahuesos a la vista, ≥ 8 markhores), censo (marmotas
hibernando en noviembre), mesa de campo (doble observador), en junio pradera (≥ 10 marmotas) y pedrera (≥ 8 pikas),
las 11 plantas vivas, ≤ 600 llamadas.

## Para después

- Que la multitud reaccione a ella (los íbices se apartan, las marmotas silban y se meten en la madriguera).
- El leopardo visible en las cámaras trampa (fotos en el cuaderno).
