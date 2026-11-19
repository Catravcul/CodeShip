# Changelog

Lo nuevo arriba. Una línea por cambio visible o de arquitectura, con su documento. El historial anterior al
2026-11-18 está en git y en `docs/design/`.

## 2026-11-19

- **Santuario 3, bioma subantártico**: una isla como Bird Island con 23 especies (tussac, musgo, kelp, kril, peces,
  papúas, albatros, págalos, lobos y elefantes marinos, foca leopardo…) en una cadena alimenticia viva: nacen en su mes
  real tras aparearse, crecen, cazan, pasan hambre y mueren de viejos; censo en la estación con el botón naranja.
  `fauna` gana plantas como comida (`forage.ts`). [docs/design/bioma-s3.md](docs/design/bioma-s3.md)

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
