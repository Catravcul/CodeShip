# Santuario 3: la isla de entrenamiento con detalle

Rama `s3-detalle`, recorrido PX-49 `s3-detalle`. Berón (2026-11-18): «las áreas se ven vacías». Cada instalación real
de la isla de entrenamiento lleva ahora su equipo, sus muebles y sus accesorios a tamaño real, cada pieza con su fuente
y su etiqueta (real, en desarrollo, licencia o ficción). Lo que no tiene fuente publicada se dice aquí y se marca como
nuestro (`S.ours` o «medidas nuestras»): no se rellena ningún hueco en silencio.

Código: `src/modules/aerial-sanctuary/data/fixtures.ts` (catálogo `CAT`, una función por sala y `furnishIsland` para
el exterior), dibujado en `src/adapters/three/s3-fixtures.ts` (geometría fundida por material, sin texturas).
Fuentes: `data/sources.ts`. La centrífuga, el parabólico, los simuladores, la robótica, la geología y el frío son de
`s3-iniciacion-2` y no se tocan aquí.

## 1. Reglas que se cumplen

- **Tamaño real.** Cada pieza se pone a su tamaño real; la escala de presentación (k = 1 o 1,5, [escala.md](escala.md))
  solo separa las posiciones en planta, como en el resto del santuario. Las alturas no se escalan.
- **Todo se recorre.** Cada compartimento nuevo (la sala de control de la NBL, la cámara hiperbárica, la cabina del
  audiómetro, la sala del ecógrafo, la esclusa y la cámara hipobárica, la plataforma de Destiny, el embarcadero) tiene un
  camino de comprobación (`walkChecks`) que la prueba anda paso a paso. Las puertas son solo un hueco.
- **Nada atraviesa nada.** Ninguna pieza sólida se mete en otra, en una pared ni en un mueble de la sala, y lo que está
  suelto sin ser sólido tampoco entra en las paredes (`fixtures.test.ts`, a k = 1 y 1,5).
- **Caminos libres.** Medio metro entre cada tramo del «Ir» y cada pieza en la que se choca. Los sitios de los retos de
  los puestos 1–4 y 7 y el paso de las entrenadoras (PX-46) quedan sin muebles: el paso de la entrenadora del puesto 4
  va ahora por el pasillo de x = 2,5 (`stages.ts`), lejos de la esclusa de la cámara hipobárica.
- **Rendimiento.** Menos de 2000 piezas y menos de 45 rótulos; 482 llamadas de dibujo como máximo en PX-49 (tope 600). El equipo de toda la isla es una malla por tipo de material, con el color en los vértices: unas seis llamadas en vez de 106 (con lo de `s3-iniciacion-2` se llegaba a 601).
- **Umbral en cada puerta.** El suelo de cada nave acababa 0,2 m antes que el de la isla: en el hueco de la puerta,
  andando a pasitos (el «Ir» a muchos fotogramas por segundo), caía al mar bajo la isla y salía nadando (PX-45 lo veía
  como un salto de 2 m al entrar al centro médico; ya pasaba en `integracion`). Ahora hay un umbral (`layout.ts`).
- **El mar no tapa las piscinas.** El plano del mar (y = −0,6) tiene un agujero sobre cada piscina, o escondía su
  fondo: las maquetas de la NBL a 12 m no se veían.

## 2. Qué hay en cada sala, y de dónde sale

| Sala | Qué tiene | Fuente | Etiqueta |
| --- | --- | --- | --- |
| NBL, piscina | Vaso de 62 × 31 × 12 m; en el fondo Unity, Quest, un tramo de viga, Dragon, Cygnus, Columbus y Kibo, a su tamaño | `S.nbl`, `S.unity`, `S.quest`, `S.cygnus`, `S.columbus`, `S.kibo` | real |
| NBL, grúas | Dos grúas puente de 10 t sobre sus carriles y cuatro grúas de pluma de 1,6 t en el borde, con el soporte de vestirse colgado | `S.nblCranes` (FS-NBL-508c), `S.nblPodcast` | real |
| NBL, zona de vestirse | Dos soportes del EMU, carro del traje, panel del ECS, botellas, banco de trabajo, armario, estantería | `S.nblPodcast`, `S.nblSheet` | real (muebles: `S.generic`) |
| NBL, buzos | Puesto de los buzos de seguridad y puesto de los de cámara (dos de seguridad, uno de apoyo y uno de cámara por astronauta), botellas, bancos, pizarra, reloj, monitores del borde | `S.nblPodcast`, `S.nblPage` | real |
| NBL, taquillas | Seis bloques de taquillas en la pared norte | `S.generic` | real |
| NBL, sala de control | En el piso alto (4,5 m), con ventanas sobre la piscina: tres puestos (vídeo, director de la prueba, ECS) y el del controlador al lado; pared de vídeo; escalera de 25 peldaños | `S.nblPodcast` | real; altura y sitio nuestros |
| NBL, cámara hiperbárica | Cámara de dos esclusas en la esquina noreste, que se recorre | `S.nblCranes`, `S.nblPage` | real; medidas de una cámara corriente; la real está 20 pies bajo tierra |
| SVMF | Carriles y grúa puente, puerta industrial norte, escalones en las escotillas de Destiny y Orion (ni Dragon ni el LM: no están en la lista de la NASA; cada simulador tiene su sala, abajo), la cápsula de Orion (Ø 5,02 × 3,3 m), Unity y Quest enteras, plataforma de trabajo junto a Destiny con su escalera, suelo de cojinetes de aire (PABF) con su trineo, cinco bastidores ISPR, bancos de trabajo, armarios, plataforma elevadora, carros de herramientas, mesa de reuniones | `S.svmfPage`, `S.svmfWiki`, `S.orion`, `S.unity`, `S.quest` | real; plataforma y su escalera nuestras |
| Simuladores de Crew Dragon | Como en Hawthorne: el simulador a escala real (la cabina, con su escalón), la cabina de dos asientos y la consola de los instructores con su silla | `S.spacexSims` | real; planta y consola nuestras |
| Simulador del LM (LMS) | La cabina del LM (la de `s3-iniciacion-2`) y la consola de control del LMS con dos sillas | `S.mstf` | real; planta y sitio de la consola nuestros |
| Centro de robótica | Como el de la CSA: aula con tres pizarras interactivas y las maquetas a escala de Canadarm2 y Dextre, mesas y sillas; la maqueta de Destiny a 3/4 con su escalón y la estación (portátil y dos mandos; las tres pantallas las pone la escena) | `S.csaRobotics` | real; planta y mesas del aula nuestras |
| Control de misión | Cuatro filas de cuatro consolas (la trinchera y la segunda fila más bajas), sillas, barandillas de madera, FLIGHT en la tercera fila y CAPCOM en la segunda, cinco pantallas grandes y nueve pequeñas al frente | `S.fcr1`, `S.mocrRows`, `S.mccRestore` | real |
| Gimnasio | Cintas, bicis, jaulas, banco, mancuernas, polea, remo, ARED, suelo de caucho, esterilla, espejo, taquillas y bancos, fuente, discos, cajones, tele, reloj, pizarra | `S.ascr` (ARED: el material de a bordo); el resto `S.generic` | real |
| Centro médico | Consulta con el ECG, la camilla, la cortina, el tallímetro y el equipo de pared; cabina de audiometría con su audiómetro; sala del ecógrafo; mesa del médico; optotipo a 6,1 m; sala de espera (doce sillas, mesa baja, recepción, tele, planta); archivo de historiales (seis archivadores, estanterías, mesa); carro de paradas | `S.snellen`, `S.training`, `S.generic` | real |
| Cámara hipobárica | Esclusa con puerta de acero, cuatro asientos a cada lado frente a frente, cada uno con su panel de tres conectores de O₂, ventana reforzada, panel de los operadores fuera con tres sillas altas | `S.altitudeChamber` (JBSA) | real |
| Supervivencia en el agua (nueva) | Piscina de 25 × 12 × 5 m, el METS sobre su pórtico, el izado con el collar de rescate, la balsa, sillas de socorrista, escalerillas, bancos, chalecos, estante de balsas | `S.pensacola`, `S.mets` | real; medidas de la piscina y del METS nuestras |
| Helipuerto | 16 luces verdes de perímetro, marca pintada «12 t · 21», manga de viento iluminada, focos, punto de combustible con extintor | `S.heliport` (FAA AC 150/5390-2D) | real |
| Exterior | Caminos pavimentados, farolas cada 24 m, poste de señales, banco y papelera, matas de tussac, embarcadero con pilotes, bolardos y salvavidas | `S.tussock`; el resto `S.ours` | licencia (tussac y embarcadero) |

## 3. Lo que no está verificado o es nuestro

- **Plataformas de trabajo de la NBL:** no aparecen en las fuentes; no se modelan (solo el soporte de vestirse en la
  grúa de pluma, que sí aparece).
- **Sitio y altura de la sala de control de la NBL** (4,5 m, al norte): la fuente dice «arriba, con ventanas»; el
  sitio es nuestro. El sitio de cada sala dentro de su edificio es nuestro en todas: no hay planos publicados.
- **Cámara hiperbárica:** la real está 20 pies bajo tierra; aquí está en el suelo de la nave, con medidas de una cámara
  de dos esclusas corriente.
- **Piscina de supervivencia y METS:** sus medidas son nuestras (Pensacola no publica plano).
- **Dragon en el edificio 9:** la página de la NASA no la nombra (los simuladores de Dragon están en Hawthorne). Se
  muda a su propio edificio después de esta rama.
- **Gimnasio:** solo el ARED y «el material de a bordo» salen de la NASA; el resto es material corriente de gimnasio.
- **FLIGHT y CAPCOM** en una rejilla de 4 × 4: siguen las filas del MOCR, no un plano de la FCR-1.
- **La sala de visitas de la FCR** no se modela.
- **Embarcadero y tussac:** licencia (la isla es nuestra).
- **La viga (truss) del fondo de la NBL:** medidas aproximadas.

## 4. Preguntas para Berón

1. El puesto 3 (agua) sigue en la NBL, y ahora hay una piscina de supervivencia real (Pensacola). ¿Se muda allí?
2. PX-49 estaba reservado en [santuario3-iniciacion.md](santuario3-iniciacion.md) para la rama opcional `s3-energia`;
   esta rama lo usa y aquella queda «por asignar».

## 5. Recorrido PX-49

En un iPhone 13, con toques: «Ir» por teletransporte en los ajustes de Tareas (PX-45 ya recorre la isla andando); en
cada sala, Áreas → la sala → «Ir», unos pasos con «Moverse» hacia lo que se mira, «Mirar» para girar e inclinar la
cámara, y la captura `docs/screenshots/s3d-<sala>-movil.png` (390 × 664): NBL (piscina, zona de vestirse, buzos), su
sala de control, la cámara hiperbárica, SVMF, Orion, los simuladores de Dragon y del LM, el centro de robótica, control de misión, gimnasio, centro médico (consulta y sala de
espera), cámara hipobárica, supervivencia, helipuerto y exterior.
