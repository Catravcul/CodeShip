# Microcosmos

Berón (2026-11-23): «¿Podrías crear el de Platón? … recrear bien el distrito, edificios, calles, sistemas, flora,
terreno, personas… los insectos humanos realizan sus días y su ciclo de vida… misiones resueltas por retos». Se sigue
el patrón del microcosmos de Elon Musk de Cold Sanctuary (`docs/microcosmos-musk-historia.md` de `videnacry/Cold-Sanctuary`).

## Reglas (las de Cold Sanctuary)

- Un barrio de ~300 × 300 m; la ciudad de alrededor, de fondo y sin detalle.
- El lugar a 1:1 y sus insectos-humanos a la mitad (s = 0,5). En CodeShip el mundo se dibuja y se anda a `K = 2` veces
  el lugar real y las figuras conservan su talla: mismas proporciones, y andar, saltar y trepar funcionan sin cambios
  (`application/mundo.ts`).
- Vista de corte: el tejado de un edificio no se dibuja mientras ella está dentro.
- Puertas de ≥ 1,2 m (prueba); un hito y un transporte de época que se usa; las necesidades básicas dentro (prueba).
- Cada dato con su fuente o la marca «supuesto».
- La historia en pasos, y los pasos con retos de CodeShip (`domain/historia.ts`).

## Rendimiento: cuántos caben

Un microcosmos es un trozo de código aparte (`src/microcosmos-academia.ts`, 48 kB, 18 kB comprimido) que se descarga
solo al entrar por la máquina y se libera entero al salir (geometrías, materiales, texturas, interfaz y mando). Mientras
ella está dentro, el santuario 1 no se mueve ni se dibuja. Así el límite no es cuántos microcosmos haya, sino lo que cuesta
el que está abierto: la Academia pide entre 24 y ~340 llamadas de dibujo y entre 6.000 y 33.000 triángulos según dónde
mire (medido con Playwright, iPhone 13). Lo caro son las figuras cercanas: lejos de la cámara no se animan ni muestran
el nombre. Caben tantos como se quieran, uno abierto cada vez.

## La Academia de Platón (Atenas, verano de 360 a. C.)

Se entra desde cualquier máquina de simulación: hay una en cada piso (`MICROCOSMOS`, Berón 2026-11-24). Datos:
`modules/microcosmos/data/academia.ts`; retos: `data/retos-academia.ts`.

| Parte | Qué | Fuente |
| --- | --- | --- |
| El Dromos | El camino de la ciudad, de 40 m de ancho, con las tumbas de los caídos a los lados; llega a la puerta | Marchiandi; Pausanias I.29 |
| El muro de Hiparco | Rodea el gimnasio (trazado y altura: supuesto); puerta al Dromos y paso al jardín de Platón | Suda; IEP |
| Altares | Prometeo (el hito, con fuego: de él sale la carrera de antorchas), Eros a la entrada, Hermes, Atenea, Heracles, las Musas | Pausanias I.30 |
| Palestra | Peristilo cuadrado del s. IV a. C. con sus salas: vestuario, efebeo, aceite, saco, almacén, polvo, baños, exedras con bancos, patio de arena con el foso | Caruso; Vitruvio V.11 |
| Museo | El santuario de las Musas que fundó Platón, con rollos | Diógenes Laercio IV 1 |
| Exedra | Banco semicircular bajo los plátanos, donde se enseña | Diógenes Laercio IV 19 |
| Chozas de discípulos | Tres (en 360 a. C.: supuesto) | Diógenes Laercio IV 19 |
| Pista | Un estadio (~185 m) | Plutarco, Cimón 13.8; Miller |
| Olivar sagrado, plátanos, olmos, álamos blancos | Instanciados | Aristófanes, Las nubes 1005–1008 |
| Acequia de Cimón | Agua del Cefiso para el olivar, con pasarelas | Plutarco, Cimón 13.8 |
| Fuente | Pilón para beber y lavarse | Supuesto |
| Casa de Platón | Casa de patio (tipo Olinto): andrón con lechos, cocina con hogar y molino, despensa con tinajas, dormitorios, telar, cisterna, orinal; huerto, higueras y parra | Cahill (Olinto); Diógenes Laercio III 20 y 41–43 |
| Fondo | Colono Hipio, las murallas con el Dipilón y la Acrópolis (más cerca que en realidad) | — |
| Transporte | El carro del Dromos con su asno: «Subir al carro» lo lleva hasta la puerta | Burford (supuesto su uso) |

**La gente** (`PERSONAS`): Platón (67), Espeusipo, Jenócrates, Aristóteles (24), Heráclides Póntico, Filipo de Opunte,
Axiotea de Fliunte y Lastenia de Mantinea (las dos discípulas que cita Diógenes Laercio III 46), Ártemis (de la casa;
el testamento de Platón la deja libre), el paidotriba, el jardinero y el carretero. Sus días (`domain/vida.ts`): lecciones
en la exedra, lucha en la palestra, la comida en el andrón, paseos bajo los plátanos, estudio en el Museo, la carrera de
la tarde y el sueño. **Ciclo de vida**: doce familias de atenienses que vienen al gimnasio viven al ritmo de los
insectos, un año por hora del microcosmos (ficción): crecen (niño, joven, adulto, anciano), mueren a su edad (55–85) y
nace un hijo en su lugar («Glauco II»). Los de la historia conservan su edad real.

**La historia** (`HISTORIA`, 8 pasos, 6 retos): llegar por el Dromos; la lucha en la palestra (paidotriba); duplicar el
cuadrado con Platón en la exedra (Menón 82b–85b); regar el olivar con la acequia (jardinero); la comida sencilla con
Ártemis; comer en el andrón; el gnomon con Filipo en el Museo; la carrera de antorchas con Aristóteles desde el altar de
Prometeo. Quien acompaña un paso deja su jornada y espera en el sitio. La recompensa de cada reto va a sus necesidades del
santuario 1. Botón de inicio: salir; vuelve delante de la máquina.

**Diálogos** (`data/dialogos-academia.ts`): cada persona de la historia tiene una conversación que es un reto de código:
ella ordena lo que se dice, turno a turno, y las opciones falsas son lo que esa persona nunca diría. Platón, la caverna
(República VII); Aristóteles, por qué filosofar (Protréptico, escrito después); Espeusipo, clasificar por semejanzas;
Jenócrates, la paciencia («necesita espuela»); Heráclides, el giro diario de la Tierra; Filipo, el ciclo de Metón; Axiotea,
venir a estudiar tras leer la República; Lastenia, aprender con amigos; Ártemis, el fuego del hogar; el paidotriba,
gimnasia y música en equilibrio; el jardinero, los olivos de Atenea y el aceite de las Panateneas; el carretero, las tumbas
del Dromos y el discurso de Pericles. Botón naranja «Hablar con…» al acercarse; mientras habla, la persona se vuelve hacia
ella y gesticula. Recompensa: compañía.

## Animaciones de los retos y rendimiento

Animar una figura en un paso (`motion()` + `poseAngles` + `update`) cuesta ~2 µs por figura y fotograma en el servidor de
pruebas (medido con 20.000 repeticiones); en un móvil, del orden de 10–20 µs. Un reto de equipo con seis figuras anima, así,
~0,1 ms de los 16,7 ms de un fotograma: no se nota. Lo que cuesta es dibujar las figuras (cada una son varias llamadas de
dibujo), y eso ocurre haya reto o no.

## Siguiente (propuesto)

- Más microcosmos con el mismo patrón (p. ej. Hawthorne 2008, cuando Cold Sanctuary lo rehaga).
- Diálogos con los personajes en cada paso; noche con lámparas; más fauna (mochuelos, cigarras del Fedro).
