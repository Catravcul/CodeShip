# Changelog

Lo nuevo arriba. Una línea por cambio visible o de arquitectura, con su documento. El historial anterior al
2026-11-18 está en git y en `docs/design/`.

## 2026-11-23

- **Santuario 1, retos por objeto (fase 1)**: cada instrumento, saco, máquina del gimnasio y puesto de cocina con su
  reto propio; cada paso con su animación, que sigue hasta el siguiente paso; guitarra, bajo, baquetas y guantes en
  las manos; la estación del saco ya mira al saco; zoom y giro de la cámara en el reto, y encuadre según la vista.
  [docs/design/santuario1.md](docs/design/santuario1.md) #110–115

## 2026-11-22

- **Santuario 1, duodécima lista**: se puede saltar de todos los pisos y anillos (test); gimnasio lleno (2-3 de cada
  tipo); piso de combate; baile latino junto al ballet; regla de distribución sin grandes huecos; filtro de áreas al
  día; los 80 modelos pendientes de realismo rehechos; se nada dentro del globo, que vuelve a ser una esfera; ajuste
  «Animales por persona» (4). [docs/design/santuario1.md](docs/design/santuario1.md) #101–109
- **Santuario 1, undécima lista**: el globo sigue la forma del mar entre casquetes (pixelado, 6/10 en su pie) con el
  embrión en azules y verdes; bases cuadradas; pisos por afinidad (23); asambleas con una guardia realista; aula en la
  plaza; literas al doble de alto con escalera para trepar; carne cultivada rehecha; revisión de realismo con puntaje
  (`realismo.ts`); la luz bajo el agua según la profundidad; control de rendimiento.
  [docs/design/santuario1.md](docs/design/santuario1.md) #86–100
- **Santuario 1, décima lista**: globo de agua de 240 m con un embrión en el centro sobre el reloj de arena (sin
  aristas); bases redondas más pequeñas; árboles a la mitad de distancia de los casquetes; todos los pisos del tamaño
  de la cocina con más espacio para correr (crossfit con calistenia, aula con más sitio entre pupitres); rejilla de
  madera cada 4 m (ajuste «Rejilla de madera»); el agua clara deja ver el cielo; día y noche con amanecer, atardecer,
  estrellas y luna; alfombras al doble de velocidad, acelerando y frenando como un coche.
  [docs/design/santuario1.md](docs/design/santuario1.md) #76–85

## 2026-11-21

- **Mapa en anillos del santuario 1**: en el centro, un mar circular de 120 m de radio para las ballenas, con un reloj de
  arena de agua de 80 m y encima una pirámide invertida de agua más ancha que el mar (ballenas, delfines y focas
  nadan en ella); alrededor, los casquetes y la isla; en el borde, los 6 árboles, cada uno sobre su base negra en el
  mar con 10 m de cubierta y su estación de alfombras. [docs/design/santuario1.md](docs/design/santuario1.md) #71–75

- **Edificios árbol para los miembros que hay**: 33 pisos en lugar de 63 (un gimnasio, una sala de yoga, un aula, una
  sala de música, un estudio de ballet, dos salas de artes marciales, un hospital, cría con carne cultivada, un
  laboratorio por ciencia, un huerto vertical); los amplios, guardados (`TOWERS_AMPLIOS`, rama
  `edificios-amplios`). Los pisos solo nacen del tronco, dos por nivel, sin patas y apoyados en el tronco con tornapuntas diagonales; las ramas solo van a
  las puntas, otra vez del tamaño de Cold Sanctuary; armazón de madera en tronco y ramas para orientarse nadando;
  aros de puerta delgados y suelos, aros y armazón de madera con textura de tablas.
  [docs/design/santuario1.md](docs/design/santuario1.md) #64–70, [docs/design/reglas.md](docs/design/reglas.md) §2.7

## 2026-11-20

- **Mando**: tras pulsar la Y, el siguiente toque en la tarjeta ya no se pierde (solo se anula el clic del mismo dedo, donde estaba). [docs/design/ux-acciones.md](docs/design/ux-acciones.md)
- **Calistenia, parkour y crossfit en tres pisos** con su tamaño real (revisión de realismo aplicada).
  [docs/design/santuario1.md](docs/design/santuario1.md) #63

- **Alfombras que no atraviesan nada**: cada estación con su carril de aire libre; las de los pisos vuelan por su
  edificio, las de copa y pie entre edificios; estaciones de piso como rellanos que salen del borde, alcanzables desde
  la puerta; alfombras y orrery más bajos; la cámara ya no cambia el vuelo. Árboles más anchos (tronco ×1,5, ramas ×2)
  por la regla del submarino más grande, sin suelo bajo el tronco. Yoga en 8 pisos de una clase. Esferas de mapas más
  pequeñas y asteroides de decoración. [docs/design/santuario1.md](docs/design/santuario1.md) #54–63

- **Alfombras en cada piso**: una estación en cada piso, copa y pie, con dos alfombras que flotan en ondas y un orrery
  de luz encima; al pisarla, «Volar» abre la ventana de mapa con sus destinos y su propio ajuste de viaje. Ballet en
  dos estudios reales; ramas rectas con aros de luz, agua clara y corriente; mapas de las ventanas sin joystick ni
  botones, dibujados como la pantalla de inicio; 9 pisos medio vacíos rehechos. Reglas con tests.
  [docs/design/santuario1.md](docs/design/santuario1.md) #47–53

- **Árbol espacioso**: por nivel, 2 pisos grandes o 4 pequeños (uno por lado), cada pequeño al final de su rama en la
  punta; ningún pequeño encima de otro. Artes marciales en cuatro pisos: karate, kickboxing, MMA y judo.
  [docs/design/santuario1.md](docs/design/santuario1.md) #44–46
- **La Y del mando abre la tarjeta sin pulsar lo de debajo**: el mismo toque ya no sube por la escotilla ni abre la
  pantalla que la tarjeta pone bajo el dedo; bajo la Y solo «Reto» (o «Cerrar»), como los demás botones.
  [docs/design/reglas.md](docs/design/reglas.md)
- **Cuarta lista del santuario 1**: la cocina del restaurante con su equipo reconocible; ya no se cae por el suelo al
  terminar un ejercicio; los pisos pequeños al final de su rama, dos por lado a la misma altura; se sale del tronco
  por cualquier punto de la puerta; nadando en 1.ª persona se ve el agua; casquetes con nieve, sastrugi, montículos y
  grietas de marea, a su grosor real. [docs/design/santuario1.md](docs/design/santuario1.md) #37–43
- **Santuario 3: la Isla de las alturas** sustituye a la isla subantártica: una montaña gigante del Karakórum de Hunza
  con sus 6 cinturones reales, cantiles con repisas para trepar (X), una garganta y senderos; íbices, markhores, bharales,
  marmotas que hibernan, pikas, leopardo, buitres, quebrantahuesos y 28 especies en una cadena alimenticia genérica;
  Áreas por isla → cinturón; métodos de campo del Himalaya en la mesa. [docs/design/bioma-s3.md](docs/design/bioma-s3.md)
- **Gimnasio: cada ejercicio sobre su máquina**: sentada en el asiento, boca abajo en el femoral, en la cinta, bajo la
  barra… (`data/estaciones.ts`), poses corregidas y un reto por aparato; revisadas en vivo las ~45 máquinas.
  [docs/design/santuario1.md](docs/design/santuario1.md) #32
- **Música y aulas rehechas de cero**: 5 salas de música y 7 aulas (una por materia), cada una su piso con su equipo
  real, pasillo central y su reto; los pisos pequeños van dos por lado del árbol. #33–35
- **El reto en el botón Y del mando** (todos los niveles): naranja con «Reto: …» al acercarse; sin el botón de arriba. #36

## 2026-11-19

- **Retos y Áreas iguales en todos los niveles**: el botón naranja de una máquina con retos (santuario 3 y naves) dice
  «Reto: <cosa>» y abre el reto, o la elección de reto si hay varios o está cerrado (con «Ver la máquina» si tiene más
  botones), como en el santuario 1; el reto se ve con la misma lente y el mismo foco (`reto-focus.ts`) en todos; Áreas
  tiene el mismo alcance por jerarquía (santuario 3: isla → edificio → piso; naves: vehículo → módulo o cubierta).
- **Santuario 3, bioma a su densidad real**: la colonia de papúas con cientos de aves y nidos a 1 m, la playa llena de
  lobos marinos (80 crías por 100 m), un harén de elefantes marinos y el tussac a 650 matas por hectárea; cada animal
  de la cadena representa a muchos (×50 los papúas), cuerpos de cubos cerca y cajas lejos. Nidos de piedras con huevos
  en noviembre, pollos de albatros en su nido de barro en invierno, petreles en sus grietas; muda de papúas y elefantes
  marinos. El censo da el kril en toneladas («≈ 800 000 t») y cabe en 390 px. En la cabaña, la mesa de campo: contar
  los nidos y anillar pollos de albatros como retos reales. [docs/design/bioma-s3.md](docs/design/bioma-s3.md)

- **Mismos mandos en todos los niveles**: el santuario 3 y las naves (cubiertas de la Starship, estación, cabina del LM) usan los
  mandos de la Switch del santuario 1 (zoom en la cruceta, + Tareas/Misiones, − Áreas, captura Vista, inicio Ajustes; en el 3,
  correr, saltar, trepar y caer de un borde como en el 1; en 0 g esos salen apagados), el mismo botón naranja «Reto: …» y
  filtros de categoría en las Áreas del 3. Un solo código: `ui/game-pad.ts`, `ui/interaction.ts`, `application/free-walk.ts`.
  [docs/design/ux-acciones.md](docs/design/ux-acciones.md)

- **Santuario 3, bioma subantártico**: una isla como Bird Island con 23 especies (tussac, musgo, kelp, kril, peces,
  papúas, albatros, págalos, lobos y elefantes marinos, foca leopardo…) en una cadena alimenticia viva: nacen en su mes
  real tras aparearse, crecen, cazan, pasan hambre y mueren de viejos; censo en la estación con el botón naranja.
  `fauna` gana plantas como comida (`forage.ts`). [docs/design/bioma-s3.md](docs/design/bioma-s3.md)

- **Santuario 1 terminado para revisar**: quillas de fotobiorreactores bajo las ramas del Árbol de los Campos; el
  iceberg a la deriva es sólido; ballet y dojo abiertos (sin obras), con retos de barra y de saco y sus animaciones
  (plié, tendu, relevé, guardia, golpe). [docs/design/santuario1.md](docs/design/santuario1.md)

- **Santuario 1, pisos desde la exportación de Unity**: gimnasio con piezas reales (máquinas de placas, jaula, bancos,
  mancuernas, parkour, botiquín, materiales de obra); ballet, dojo y aula con lo que faltaba (barras portátiles, caja de
  resina, makiwaras, acolchados, primeros auxilios, ábaco, astrolabio, quipu y esfera armilar); refugio de aves del
  veterinario; cada terraza de la residencia con su frutal (sandía, frutilla, piña…); los seis métodos del mundo en el
  Huerto; punto de cuidados de los frutales en cada punta y la sala de la experta; la fachada de fotobiorreactores de
  espirulina (Árbol de los Campos y Ciencias) con su reto; el iceberg a la deriva se mueve; cámara más abierta en los
  retos de máquinas altas. [docs/design/santuario1.md](docs/design/santuario1.md)

- **Rivalidad entre machos (`fauna`)**: en el celo, dos machos junto a una hembra se la disputan como su especie
  (bueyes almizcleros chocan las cabezas, renos las cuernas, morsas los colmillos); gana el más fuerte y el otro se va.
  [docs/design/fauna.md](docs/design/fauna.md)

- **Celo y cortejo (`fauna`)**: cada especie entra en celo en su época real (partos − gestación), busca pareja y
  corteja con su conducta real; solo nace una cría donde una hembra se apareó. [docs/design/fauna.md](docs/design/fauna.md)

- **Animales inteligentes (módulo compartido `fauna`)**: deseos de Cold Sanctuary (hambre, cansancio, miedo) y
  cadena alimenticia por stats. En el santuario 1 los lobos cazan en manada, las orcas cazan focas y pingüinos, el oso
  focas; las presas huyen, y la cazada deja su sitio hasta su época de partos. Las liebres huyen de Doménica. El 3 lo
  reutiliza para su bioma. [docs/design/fauna.md](docs/design/fauna.md)

- **Santuario 1, animales vivos**: crecen día a día, mueren de viejos y nacen crías en la época real de su especie;
  hacen lo de su etograma (descansar, acechar, pacer, patrullar, apiñarse) y las crías siguen a su madre; el submarino
  de obra baja por su tronco y va bajo el hielo a la laguna. [docs/design/santuario1.md](docs/design/santuario1.md)

- **Viajes en marcha en la partida**: recargar a medio crucero a Bennu (o a medio salto programado de la Starship) y
  «Continuar» sigue el viaje donde estaba, en marcha y con «Trayecto», en vez de aparecer en el destino; con la Starship
  de viaje el módulo no se desacopla (el interruptor dice por qué). [docs/design/partidas.md](docs/design/partidas.md)

- **Santuario 1, tercera lista**: cada máquina con su animación (jalón al pecho ya no corre) y una tabla de
  animaciones por categoría con los retos y pasos que las lanzan; troncos de agua abiertos al mar (focas y pingüinos
  suben), entrar a un piso nadando desde cualquier punto, pisos sin barandilla, nado y vista azul bajo el agua; el
  botón de inicio abre los ajustes; parqueaderos de alfombras en copa y pie; ciclos de vida reales (crías, jóvenes y
  adultos a su tamaño); Kushal, Nevaeh, Sadhguru y Neo. [docs/design/santuario1.md](docs/design/santuario1.md)

- **Tarjetas de máquina en el móvil**: suben por encima del «−» / «+» redondos del joystick de mirar, que ahora están encima de él. [docs/design/reglas.md](docs/design/reglas.md)

- **Santuario 1, realismo y mandos**: correr es un sprint a tope (6,5 m/s, rodillas altas, brazos a 90°, la vista se
  abre) y saltar un salto de 50 cm (agacharse, impulso, recoger, amortiguar), y en 3.ª persona ella mira hacia donde
  corre; los botones generales pasan al mando (+ Misiones, − Áreas, captura Vista, inicio Menú); el hospital, los
  laboratorios y la carne cultivada con el equipo de la escena exportada de Unity y forma real en cada equipo; la
  Mecánica (vacía en Cold Sanctuary) es un taller real de tractor, barca y submarino con sus retos.
  [docs/design/santuario1.md](docs/design/santuario1.md)

- **Santuario 1, 2.ª lista**: mandos con todos los botones de la Switch (zoom en la cruceta); Áreas con Automático,
  cada edificio por su nombre y cada casquete, el edificio dibujado; cada persona con su cara, pelo, ropa y estatura
  (de Cold Sanctuary); el personal hace los pasos de su trabajo; los retos enfocan la animación; catálogo de iconos
  (`ui/icon-catalog.ts`). [docs/design/santuario1.md](docs/design/santuario1.md)

- **Santuario 1, pedidos del 19-nov**: botón naranja de interacción (también en las naves) con retos reales en
  máquinas, plantas y animales; ventana Misiones con la jornada y recompensas; Áreas en esferas con filtros y ajustes
  santuario/casquete/edificio; mandos estilo Switch (correr, saltar, trepar); alfombras voladoras, mascarillas y marcos
  en cada puerta, abedules en la isla; animales de cubos articulados; restaurante con equipo real por oficio, utensilios
  e ingredientes. [docs/design/santuario1.md](docs/design/santuario1.md)

## 2026-11-18

- **Santuario 1 completo (entorno)**: todos los pisos que Cold Sanctuary amuebla (Entrenamiento, Servicios con anillos,
  Ciencias, Producción, Árbol de los Campos, Residencia), frutales y bancales en las puntas, casquetes silvestres,
  tundra, icebergs, animales que merodean, el personal siguiendo la jornada por rutas reales, reloj y ventana de Áreas
  con «Ir». Cambios a gran escala en un archivo (`overrides.ts`). [docs/design/santuario1.md](docs/design/santuario1.md)
- **Santuario 3, fase 6 (rama `s3-lanzamiento`)**: el puesto 10 (un Electron en la pantalla del control de misión, con
  Luciana) y el 13 (el traje de la Crew Dragon, con Irosene); su día de lanzamiento en la plataforma (torre, brazo y sala
  blanca, cuenta atrás, ascenso por etapas, cita con la Starship por reto o a mano), y la partida del 3 que pasa a ser del 6
  con el crucero a Bennu. [docs/design/santuario3-lanzamiento.md](docs/design/santuario3-lanzamiento.md)
- Santuario 3: Dragon y el LM en sus propias salas (Hawthorne, LMS del edificio 5), el Il-76MDK en vez del A310, robótica como
  el centro de la CSA y el puesto 3 en la piscina de supervivencia, todo con fuentes (rama `s3-px45`).
  [docs/design/santuario3-puestos.md](docs/design/santuario3-puestos.md)
- **Santuario 1 (rama `santuario1`)**: el santuario de hielo de Cold Sanctuary se juega desde el nivel 1 de la pantalla
  de inicio. Casquetes, isla de tierra, laguna, 6 edificios-árbol con 44 pisos, el piso 0 del gimnasio amueblado, 13
  especies con el reparto de `PopulationPlan` y el personal. Catálogo de modelos por categoría y grupo para cambios a
  gran escala. [docs/design/santuario1.md](docs/design/santuario1.md)
- **Documentación para retomar**: `CLAUDE.md`, [docs/architecture.md](docs/architecture.md), este changelog y
  [docs/design/misiones-y-jornada.md](docs/design/misiones-y-jornada.md) (misiones antiguas y jornada de Cold Sanctuary).
- Santuario 3: umbral en las puertas, equipo en seis mallas y PX-45 al día (rama `s3-detalle`).
