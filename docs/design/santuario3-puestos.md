# Santuario 3: los puestos de la iniciación, entrenadoras, glaciar y vuelos (ramas `s3-iniciacion-1` y `-2`)

Las fases 4 y 5 de [santuario3-iniciacion.md](santuario3-iniciacion.md) §5.3, con las respuestas de Berón del 2026-11-18 (vuelos con
dos modos, escala para todas las áreas, el muelle fuera de los 300 m; sin sustituta fuera del turno; salen antes en vez de andar más
deprisa). Casos AER-10 a AER-15 (fase 4) y AER-16 a AER-23 (fase 5) en [casos.md](../qa/casos.md); recorridos PX-46
`s3-iniciacion` y PX-47 `s3-iniciacion-2`.

## Puestos con reto

Cada puesto es un reto de código con pasos reales (`application/stations.ts`). Cada paso bien hecho se ve en el sitio
([reglas.md](reglas.md) §4.2): ella y quien da el reto, con los objetos en las manos o puestos, junto a los muebles reales de la sala
(`data/stages.ts`, `adapters/three/s3-stage.ts`). En «Paso a paso» cada bloque bien puesto se ve al momento; en «Ordenar todo», los
pasos se ven uno tras otro al acertar. Con la hoja abierta solo se ven la hoja y la escena (§4.3); el rótulo del paso sale al cerrarla. La cámara las mira de lado
(las dos caben en la vista estrecha del móvil) y vuelve a ponerse de lado cuando un paso las mueve, salvo si se gira con su
mando; en la cámara hipobárica mira desde la esquina de la escotilla.

| # | Puesto | Pasos (orden) | Pregunta | Se ve | Fuente |
| --- | --- | --- | --- | --- | --- |
| 1 | Tribunal de selección | Solicitud por USAJOBS, requisitos, primera y segunda ronda en Johnson, candidata | ¿Cumple? `master y (años ≥ 3 o horas ≥ 750)` (condicionales) | Sentada ante la mesa: la carpeta, el tribunal escribe, la acreditación en el pecho, el sello | NASA, *Become an astronaut* |
| 2 | Reconocimiento médico | Báscula, tensión sentada, ECG tumbada, tabla de la vista | ¿Qué sale de rango? 148/92 > 140/90 (estatura 62–75 pulgadas, vista corregible a 20/20) | Báscula, manguito en el brazo en la camilla, electrodos tumbada, la tabla en la pared; la doctora va con ella de una a otra | NASA FS-2011-11-057-JSC |
| 3 | Natación y supervivencia | 3 × 25 m, mono y zapatillas, otros 3 × 25 m, 10 min flotando, balsa, izado | ¿Cuántos metros? dos bucles de 3 × 25 m = 150 m | Los largos nadados en la piscina, el mono, flotando, la balsa salvavidas y el arnés con su cable hasta el carril | NASA FS-2011-11-057-JSC; Pensacola (DVIDS 2022) |
| 4 | Cámara hipobárica | Prerrespirar O₂, subir a 25 000 pies, quitarse la máscara, anotar síntomas, ponérsela, bajar | Tiempo de consciencia útil: 3–5 min a 25 000 pies (1–2 a 30 000, 20–30 a 18 000) | Sentada en el banco de la cámara, la máscara puesta, en la mano, mareada con la lista; la entrenadora dentro como observadora | FAA AC 61-107B |
| 7 | Flotabilidad neutra (NBL) | Los pasos del EMU del paseo espacial (`DONNING_STEPS`): LCVG, pantalón, torso rígido, guantes y casco, fugas | Sube 2 kg: los buzos añaden 2 kg de plomo (si baja, espuma) | Se viste en el borde (colores del traje, casco), y en el fondo junto a la maqueta con el lastre en la cintura | NASA, ficha del NBL; Wikipedia NBL |

El puesto 3 tiene su propia máquina en el borde de la NBL («Prueba de natación»); el 7 sigue en «Piscina NBL». Los puestos 10 y
13 siguen «En construcción» (rama `s3-lanzamiento`). Un puesto superado lo dice su tarjeta (✓ Superado) y queda en la partida (`posts` del estado
del 3).

## Puestos de la fase 5 (`s3-iniciacion-2`)

`application/stations-phase5.ts`. Las máquinas que se mueven mientras se representa el paso están en `adapters/three/s3-rigs.ts`
(ella va en ellas: la escena la lleva cada fotograma) y los simuladores a mano en `src/s3-simulators.ts`.

| # | Puesto | Pasos (orden) | Pregunta | Se ve | Fuente |
| --- | --- | --- | --- | --- | --- |
| 5 | Centrífuga (TsF-18, NASTAR) | Sensores del ECG y el botón, recostada de cara al eje (Gx), subir a 4 g a 0,1 g/s, un minuto apagando luces, perfil de reentrada de Dragon (4–5 g), bajar y parar. Trampa: sentarse erguida de cara afuera (Gz) | Bucle: de 1 a 4 g a 0,1 g cada segundo = 30 s | El brazo de 18 m gira a la velocidad que da esa g (√(g² − 1) · 9,81 / 18) y la góndola se abre hacia fuera; la cámara va en la góndola, mirándole la cara; el rótulo dice la g | TechInsider (TsF-18); Inspiration4 y NASTAR; AP (reentrada 4–5 g) |
| 6 | Vuelo parabólico (A310 Zero-G) | Escalerilla y asiento atrás, despegue de la pista de hielo azul, tirón a 1,8 g con el morro a ~50°, ~20 s sin peso, salida a 1,8 g tumbada, 31 parábolas con 8 min de descanso cada cinco, asiento y aterrizaje. Trampa: soltarse del suelo en el tirón | Bucle: 31 × 20 s = 10 min 20 s | El A310 (46,4 m, 43,9 m de envergadura) en la pista del glaciar: despega, tira con el morro arriba (vista desde fuera), dentro de la zona acolchada (20 × 5 × 2,3 m) ella y la entrenadora flotan o van tumbadas, y aterriza | ESA, *Parabolic flights* y A310 Zero-G; Union Glacier (pista de 3000 m) |
| 8 | Simuladores de Dragon y del LM | Cascos y asiento del comandante, ensayo de lanzamiento, de aborto, acople a mano, fallo inyectado, reentrada y amerizaje. Trampa: saltarse el ensayo de aborto | Condicional: cierre 0,05–0,10 m/s y ≤ 0,10 m del eje; a 0,12 m, `apartarse()` | En la maqueta de Dragon, la pantalla del simulador muestra cada ensayo (la cámara de acople es la de la Starship); se mira por encima de su hombro | SpaceX (entrenamiento de Dragon); IDSS IDD |
| 9 | Robótica | La captura de un Cygnus con Canadarm2 (el mismo reto que en la Cupola, `armChore("captura")`) en el simulador del brazo | La del reto del brazo | En el puesto de robótica del control de misión, con los dos mandos: el brazo de la Cupola se mueve bloque a bloque en la pantalla grande y en el monitor de la mesa | Space Center Houston (Generic Robotics Trainer, VR Lab); CSA y NASA |
| 11 | Meteoritos en hielo azul (ANSMET) | Barrer en línea con motos a ~30 m, aparcar y el GPS, etiqueta de aluminio, foto con el contador, libro, pinzas y bolsa de teflón estéril, cinta con la etiqueta dentro, bandera. Trampa: cogerla con la mano | Aritmética: 8 motos, 7 huecos de 30 m = 210 m | En el campo de hielo azul del glaciar: en moto, de rodillas junto a la piedra, boca abajo para la foto; cada objeto en su mano o en el hielo | NASA/ANSMET (Case Western, *The Antarctic Search for Meteorites*) |
| 12 | Supervivencia en frío (*Happy Camper*) | Tienda Scott con anclajes de nieve, muro de bloques contra el viento, zanja techada, nieve al hornillo, las dos antenas de 10 m de la radio de HF, llamar al Polo Sur (1360 km). Trampa: dormir al raso | Condicionales: viento del sur → el muro al sur | La tienda, el muro, la zanja, el hornillo con la olla, la radio y la antena se van levantando en el sitio, y quedan | NASA, *Happy Camper School* (USAP, McMurdo) |

El rótulo del paso suma lo que marca la máquina (la g de la góndola o del avión). En la centrífuga la subida se ve a 1,5 g/s: los
0,1 g/s reales tardarían 30 s y un paso dura 2,2 s (el tiempo se comprime, como el reloj del juego); el número de la pregunta es el
real. Las parábolas se ven a 600 m sobre el hielo (las reales empiezan a unos 6 km: dentro solo se ve la cabina).

**Simuladores a mano** (tarjeta del simulador de Dragon, sin entrenadora: es el simulador). «Practicar el acople»: el mismo pad y la
misma pantalla de la Starship (`RcsPad`, `dragonRead`, `drawDockCamera`; `FreeCarrierRun`) desde 12 m, algo fuera del eje y girada
2°; al tocar, los límites del IDSS dicen si acopla y qué se salió (`application/dock-practice.ts`). «Practicar el alunizaje (LM)»:
en la maqueta de la cabina del LM (la misma cabina e instrumentos que el módulo lunar, `buildLmCabin`), los últimos 150 m de Apolo
11 (P66): el motor de descenso (45 040 N, del 10 % al 60 %, Isp 311 s) contra 1,62 m/s², la deriva con el RCS; toca bien si baja a
≤ 3,05 m/s y se desliza a ≤ 1,22 m/s (NASA TN D-6850; `domain/lm-sim.ts`).

## El glaciar

Una pista no cabe en las islas: el avión despega de un **glaciar** fuera de ellas (`data/layout.ts`, isla `glaciar`), al que se va en
helicóptero como a las demás (máquina de navegación en su helipuerto). Tiene una pista de hielo azul de 3000 × 50 m como la de
Union Glacier con el A310 en su plataforma, y junto a ella, a un paseo corto, el campamento (tienda comedor y tiendas Scott), el campo
de hielo azul de los meteoritos y el sitio de supervivencia en frío. La gente del glaciar entrena y come en su campamento.

## Qué es real y qué es nuestro (instalaciones)

Lo que se ve de cada instalación sale de lo publicado; donde no hay nada publicado lo decimos y queda como **nuestro**:

| Instalación | Real (fuente) | Nuestro (sin fuente publicada, o cambiado para el juego) |
| --- | --- | --- |
| Centrífuga | Brazo de 18 m, sala redonda y vacía, cabina para una o dos personas en un anillo con cardanes que se abre hacia fuera, carga del pecho a la espalda, 0,1 g/s y 4 g (TechInsider, ЦФ-18); perfiles de Dragon en Gx (Inspiration4, NASTAR) | La forma y las medidas de la góndola y de la consola (TechInsider no las da); la subida a 1,5 g/s en la escena |
| Vuelo parabólico | A310 Zero-G de 46,4 m, 43,9 m de envergadura, ala baja, zona acolchada de 20 × 5 × 2,3 m, 1,8 g y ~20 s sin peso, 31 parábolas (ESA); pista de hielo azul de 3000 × 50 m (Union Glacier) | Que el A310 vuele desde una pista de hielo (en Union Glacier aterrizan Il-76, 757 y 767, no el A310); parábolas a 600 m (las reales a ~6–7,5 km); el glaciar a ~2 km de las islas y el helicóptero para llegar (a Union Glacier se llega en avión) |
| Campamento del glaciar | Comedores con calefacción y tiendas junto a la pista (Union Glacier Camp); tienda piramidal Scott de ~30 kg para dos o tres (AAD); motos de nieve a ~30 m en línea (ANSMET) | La pista a un paseo corto del campamento (la real está a ~9 km y se va en furgonetas 4×4 o vehículos de orugas, ALE): acortado para que se pueda ir andando; las medidas de la tienda Scott y de las motos (no las encontramos publicadas) |
| Simuladores | La SVMF tiene maquetas de la ISS, de Orion y de cargueros comerciales (NASA); límites del IDSS; LM de Apolo 11 (ALSJ, TN D-6850) | Las maquetas de Dragon y de la cabina del LM en la SVMF: la NASA no publica maquetas de Dragon allí (SpaceX entrena en sus simuladores) ni del LM |
| Robótica | La estación de robótica igual que la de la ISS: un portátil, dos mandos y tres pantallas con las cámaras del brazo (CSA, Robotics Training Centre) | Ponerla en el control de misión (la real está en la CSA, en una maqueta a 3/4 del Destiny, y en Houston); una pantalla grande y un monitor de mesa en vez de tres pantallas |
| Supervivencia en frío | Tienda Scott con anclajes, muro de bloques, zanja techada, hornillo, radio de HF con dos antenas de 10 m (NASA, *Happy Camper*) | La disposición del sitio |

## Entrenadoras

Personas de Cold Sanctuary cuyo oficio encaja (`data/trainers.ts`, de `Professions.cs` y `docs/personajes`), con su aspecto
atestiguado como figuras de cubos sencillas y su nombre encima. Su jornada es la de `WorkRoster` (desde el 2026-11-05):
entrenamiento 8–9 y 14–15, tareas 9–11, 12–14 y 15–16, comida 11–12, libre desde las 16 (`domain/roster.ts`). Qué puesto cubre cada
una es nuestro (**licencia**):

| Persona | Oficio en Cold Sanctuary | 9–11 y 15–16 | 12–14 |
| --- | --- | --- | --- |
| Karen | Asuntos legales y lenguas | 1 Tribunal | — |
| Julian | Dirección de proyectos | — | 1 Tribunal |
| Linduarda | La doctora de la iniciación | 2 Reconocimiento | 4 Hipobárica |
| Lizmibet | Médica | 4 Hipobárica | 2 Reconocimiento |
| Adaguchi | Submarinismo | 7 NBL | 3 Natación |
| Luciana | Piloto | 3 Natación | 7 NBL |
| Fausto | Mecánico (la consola de la centrífuga) | 5 Centrífuga | 5 Centrífuga |
| David | Informática | 8 Simuladores | 8 Simuladores |
| Adonis | Informática | 9 Robótica | 9 Robótica |
| Ivelyna | Pediatra (médica a bordo; glaciar) | 6 Vuelo parabólico | — |
| Malena | Pediatra (médica a bordo; glaciar) | — | 6 Vuelo parabólico |
| Amykhuz | Química (glaciar) | 11 Meteoritos | 11 Meteoritos |
| Gohageneis | Guardia (glaciar) | 12 Frío | — |
| Nesvitor | Guardia y agricultor (glaciar) | — | 12 Frío |

Entrenando están en el gimnasio; a comer y libres, en el cruce de la isla (la gente del glaciar, en su campamento). Van andando por
los caminos (1,4 m/s) y entran a su sitio por la puerta de la sala, sin atravesar muebles; **salen antes** para llegar a su hora al
siguiente sitio (miden el camino y salen cuando ya no cabe en lo que queda: `leaveFor`), sin andar más deprisa. El turno del puesto va primero: si ir a
comer o a entrenar y volver no cabe antes de su siguiente turno, se queda en su puesto, y de su puesto sale como mucho un cuarto de hora antes (pregunta 7). El reto lo da quien
está de turno y ya ha llegado («viene de camino: llega en …»). **Sin nadie de turno** (entrenamiento, comida, libre) la iniciación
espera en ese puesto: la tarjeta dice «Sin turno a las 11:18: el siguiente empieza a las 12:00, con …» y que mientras puede comer,
descansar o hacer otras tareas; «Empezar el reto» queda apagado (`nextShift`). La hora se ve arriba; una partida nueva empieza a
las 9:00 y una hora es un minuto real (`BOARD_DAYS_PER_REAL_S`).

## Vuelos entre islas (§3.6)

El engranaje de la ventana de navegación elige el modo (se guarda en el dispositivo):

- **Por reto** (por defecto): en el helipuerto se programa el vuelo en la hoja (`application/flight-program.ts`): los pasos del
  helicóptero (arrancar, despegue vertical y ascenso a la altura de crucero, rumbo, 280 km/h, aproximación y toma) o de la alfombra, y
  por tramo el tiempo (subir + distancia ÷ velocidad + bajar) o la altura de la alfombra. Con el programa bien, vuela solo y a la
  vista; la barra dice adónde, la distancia y el tiempo (§3.9); la cámara gira.
- **Manual**: los mandos reales del helicóptero en el pad compartido (`RcsPad` con `helicopter`): **cíclico** (adelante, atrás,
  izquierda, derecha), **colectivo** (sube, baja) y **pedales** (morro a izquierda o derecha); cada toque, un paso, y el aparato llega
  con retardo (`domain/hand-flight.ts`). La alfombra los imita a su velocidad. Nada atraviesa nada: el rotor se para contra paredes y
  torres; sobre el mar se queda en el estacionario más bajo (no amara); solo se posa despacio (≤ 1,5 m/s). Posada en el helipuerto
  o andén de una isla que admite el aparato, «Dejar los mandos» la baja allí.

## Escala y muelle

La escala de presentación agranda todas las áreas por igual ([santuario3-escena.md](santuario3-escena.md), «Escala»); el muelle está
en (−230, 210) y cuenta como habitado en la prueba de los 300 m.

## Preguntas abiertas para Berón

1. **Quién cubre cada puesto** es nuestro: Cold Sanctuary da los oficios, no estos turnos. ¿Vale el reparto de la tabla?
2. ~~Andando a escala de tiempo~~ — respondida (salen antes, sin andar más deprisa).
3. ~~La Magnate~~ — respondida (sin sustituta: el puesto espera al siguiente turno).
4. **El glaciar** está fuera de las islas, a ~2 km al norte, con todo a escala ×1,5 como las islas. ¿Le vale el sitio, o lo prefiere
   como una isla más del archipiélago?
5. **Parábolas a 600 m** sobre el hielo (las reales a ~6–7,5 km) y la subida de la centrífuga a 1,5 g/s en la escena (la real a
   0,1 g/s, la de la pregunta): el tiempo de los pasos se comprime. ¿Vale así?
6. **Quién cubre los puestos 5–12** también es nuestro (oficios de Cold Sanctuary): ¿vale el reparto?
7. **Andar con el reloj del juego**: una hora del juego dura un minuto y se anda a 1,4 m/s, así que una hora son ~84 m. De
   un puesto de la isla de entrenamiento al cruce donde se come hay ~100 m por los caminos (más de una hora del juego) y al
   gimnasio ~200 m (~2,4 horas), más que la comida (1 hora) o el entrenamiento (1 hora). Saliendo antes, sin andar más
   deprisa, quien da un puesto lo dejaría casi todo el turno vacío. Mientras, el turno del puesto va primero: si ir a comer
   o a entrenar y volver no cabe antes de su siguiente turno, se queda en su puesto (así en la isla nadie va al cruce ni al
   gimnasio entre turnos; en el glaciar, con el campamento al lado, sí). ¿Comen y entrenan más cerca (una cantina en cada
   isla), anda el reloj más despacio, o vale así?
