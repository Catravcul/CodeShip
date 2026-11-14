# Santuario espacial

Petición de Berón (2026-11-14, traducida): «¿Podríamos tener túneles de agua? ¿Se puede nadar en el espacio? La idea sería usar también ese mecanismo para guardar agua. El agua se guardaría en zonas sin gravedad y facilitaría que los astronautas se movieran. Hasta podríamos tener peces. En la estación, todo el hangar podría ser una reserva de agua con un mecanismo de ríos artificiales, porque entiendo que hacen falta para mantener el oxígeno del agua para los peces, ¿o algo así? ¿Quizá es más fácil tener fauna marina en el espacio? Las zonas abisales no reciben sol, así que imagino que las criaturas abisales no lo echarían de menos. ¿Quizá algunos insectos y animales nocturnos también estarían mejor preparados para el espacio? Así que empecemos con el santuario espacial. Como viste en Cold Sanctuary, hay santuarios terrestres, marinos y subterráneos, cada uno con sus adaptaciones, su fauna local y autosustentable. De hecho Cold Sanctuary tiene reglas para crear áreas y pisos. Revísalas, toma lo mejor y adáptalo si hace falta».

Investigación con fuentes: [agua-y-fauna-en-ingravidez.md](../research/agua-y-fauna-en-ingravidez.md). Código de reglas: `src/modules/sanctuary/` (dominio, datos y casos de uso). El **acuario del anillo** ya está en el juego (§7–§9): tanque en 3D en la cubierta de cultivo, cuidados, amistad y ayuda.

## Respuestas cortas

- **¿Se puede nadar en 0 g?** Sí, dentro de agua cerrada y con aire propio. Sin máscara, el agua se pega a la cara y no cae: en el EVA 23 bastó litro y medio en un casco.
- **¿Hacen falta ríos para los peces?** Hace falta **circulación** siempre (sin convección el agua no se mezcla) y, en 0 g, aireación por **membrana**, no por burbujas, porque las burbujas no suben.
- **¿Es más fácil la fauna abisal o nocturna?** La abisal, **más difícil** (presión de 10–40 MPa y frío). La oscuridad sí ahorra: **fauna de cueva, insectos nocturnos y bacterias quimiosintéticas** son buenos candidatos.
- **¿El hangar entero lleno de agua?** **No**: 5 600 t, 6,4 veces la nodriza. **Un río giratorio de 346 t dentro del hangar, sí**: es reserva, piscina y refugio contra tormentas solares.

## 1. Las reglas de áreas y pisos de Cold Sanctuary, adaptadas al espacio

Fuentes en Cold Sanctuary: `docs/world-topology-and-planes.md`, `plano-edificios.md`, `construcciones-elevadas.md`, `entrenamiento-areas.md`, `world-simulation.md`, `garden-simulation.md`, `ice-sanctuary-ecology.md`, `era-species-behavior.md`, `creature-stats.md` y `construccion-sostenible.md`.

| # | Regla en Cold Sanctuary | En el espacio | En el código |
| --- | --- | --- | --- |
| 1 | **Nunca perder el origen.** El santuario terrestre inicial es un hub permanente; las misiones vuelven a él | El hub es el **jardín del anillo**: la cubierta de cultivo de la nodriza, que ya existe (huerto, gallinas, perros). Toda área nueva cuelga de él | `HUB_AREA_ID`; `missingRequirements` añade el hub a cualquier área |
| 2 | **Profundidad = peligro**, y la **dispersión** depende del peligro: poco peligro, estructuras esparcidas; mucho peligro, todo en un castillo | El peligro es **agua suelta en 0 g, presión y oscuridad**. Lo seguro se reparte por el anillo; lo peligroso se concentra en la estación tras escotillas y esclusas | `waterHandling`: en 0 g, volumen cerrado y trampa de burbujas |
| 3 | Santuarios **terrestre, marino** (vertical; lo abisal abajo), **aéreo** (disperso), **subterráneo** (unido) y **núcleo** | Jardín del anillo (terrestre), acuario, esfera y río (marino), insectario ingrávido (aéreo), cueva y módulo oscuro (subterráneo). El núcleo queda abierto (§8) | `SanctuaryKind` |
| 4 | **Tiers con requisitos de entrada** (`SanctuaryArea`: fuerza, satisfacción, observación) y **tareas por área** (`AreaTask`) | El requisito es lo **construido**: áreas anteriores y piezas de la estación (módulos y equipo de [estacion.md](estacion.md)). Las tareas son **cadenas de retos de código** | `requires.areas`, `requires.station` |
| 5 | **Pisos:** misma planta en todos (`SetBack = 0`), 11 m entre pisos, **lo pesado abajo y lo silencioso arriba** (tierra abajo, laboratorio limpio arriba; máquinas abajo, yoga arriba) | En un anillo «abajo» es **el borde**: el agua y la tierra van en el suelo del borde, donde la estructura aguanta la carga y la gravedad es mayor. Cada cubierta hacia el eje tiene menos peso: g = g₀ (R − n·h)/R. En 0 g no hay pisos: hay **módulos** en puertos, todos del mismo diámetro | `deckGravityG`, `checkDeckOrder` |
| 6 | **Lo construido no ocupa el suelo de la naturaleza** (elevar 6 m en hielo, 8–10 m en bosque); huella mínima; dejar pasar la luz | El volumen central de cada área es para la fauna; las máquinas van en **bastidores en las paredes** (ISPR), como ya hace la estación. En 0 g el «suelo» son todas las paredes: la fauna vive en el centro | Regla de diseño |
| 7 | **Autosustentable:** se construye con lo cultivado, sin dañar animales; solar; bucle producción → consumo | Cada área cierra su bucle **productor → consumidor → descomponedor**, como C.E.B.A.S. y el ecosistema de Tiangong. Una máquina puede cubrir un papel (biofiltro, membrana) | `loopStatus` |
| 8 | **Primero el bioma real, luego las mutaciones** | **Primero la fauna que ya ha volado.** En 0 g solo entra lo que tiene registro de vuelo; lo demás espera a un anillo. La ficción va marcada | `fit`: `sin-datos-en-ingravidez` |
| 9 | La conducta es **datos + componentes**, no un guion por especie; diurno y nocturno (`SleepCycle`) | Cada especie es una ficha con su respuesta a 0 g, luz, temperatura, agua y presión | `Species` |
| 10 | **Escala:** pocos animales completos y bancos como un solo organismo (`Swarm`) | Los peces pequeños (medaka, pez cebra) van como banco con un solo estado | Para la fase 3D |
| 11 | **Dos velocidades:** la obra es lenta y consume material cada día | Igual que la estación: horas de máquina con el reloj de la estación (un día cada 40 s) | Ya existe en `Station` |

**Presupuesto de soporte vital.** Cada área gasta energía y da o quita oxígeno y CO₂. Se suma a la pestaña Vida ([autosustento.md](autosustento.md)) y al balance de la estación: energía libre = min(alas, radiadores) − gasto.

## 2. Las clases de santuario en el espacio

Datos en `src/modules/sanctuary/data/areas.ts`; un test comprueba que **cada especie cabe en su área y que cada bucle se cierra**.

| Área | Clase | Dónde | Gravedad · luz | Agua | Fauna y flora | Bucle |
| --- | --- | --- | --- | --- | --- | --- |
| **Jardín del anillo** (hub) | Terrestre | Nodriza, cubierta de cultivo | 1 g · día/noche | — | Cultivos, grillos, polillas, lombrices y colémbolos (más las gallinas y los perros que ya hay) | Cultivos → insectos → compost |
| **Acuario del anillo** | Marino | Nodriza, suelo del borde | 1 g · día/noche | 1 m³ (1 t) | Medaka, caracol *Biomphalaria*, gamba roja, ceratófilo, biofiltro | Ceratófilo → peces y caracoles → bacterias |
| **Cueva del anillo** | Subterráneo | Nodriza, cubierta a oscuras | 1 g · oscuridad | 0,5 m³ | Pez ciego, bacterias del hidrógeno, grillos, cucarachas | Quimiosíntesis → peces e insectos → detritívoros |
| **Esfera de agua** | Marino | Estación, módulo agrícola (B330) | 0 g · día/noche | Esfera de 4 m (33,5 t) | Medaka, pez cebra, caracol, ceratófilo, *Euglena*, biofiltro | Como C.E.B.A.S., más grande |
| **Insectario ingrávido** | Aéreo | Estación, módulo agrícola | 0 g · penumbra | — | Polillas, moscas, cucarachas, los campos de cultivo | Cultivos → polillas → moscas y cucarachas |
| **Módulo oscuro** | Subterráneo | Estación | 0 g · oscuridad | 0,2 m³ | Bacterias del hidrógeno, tardígrados, grillos, cucarachas | El «abismo químico»: hidrógeno del electrolizador en vez de sol |
| **Río del hangar** | Marino | Estación, hangar | 0,1 g (tambores) · día/noche | 346 t | Medaka, pez cebra, tilapia, caracol, ceratófilo, *Euglena*, biofiltro | El mayor; reserva y refugio |

### Adaptaciones por clase

- **Terrestre (anillo):** todo funciona como en la Tierra. Es el sitio de lo que en 0 g no funciona (las **abejas** podrían polinizar aquí; en el STS-3 no pudieron volar en 0 g).
- **Marino en el anillo:** superficie libre, burbujas que suben, aireación clásica. El peso se nota: 1 m³ en el suelo son 1 000 kg/m². **El anillo gemelo necesita el mismo momento de inercia** (test de `mothership.test.ts`): lleva un depósito de agua de la misma masa, que es además reserva.
- **Marino en 0 g:** volumen **cerrado** y sin aire suelto, aireación por **membrana** (el «pulmón artificial» del AQH de la ISS), **trampa de burbujas**, circulación siempre encendida y **luz desde un lado fijo**, porque los peces se orientan poniendo el lomo hacia la luz.
- **Aéreo en 0 g:** solo voladores que vuelan bien sin peso (polillas, moscas). Redes en las rejillas de ventilación. Penumbra para los nocturnos.
- **Subterráneo:** sin luz, la base del bucle es **quimiosintética**: las bacterias del hidrógeno del reactor de proteína (tipo Solein), alimentadas por el electrolizador. En el anillo cabe el **pez ciego** (gasta un 27 % menos de energía); en 0 g, no, porque sin ojos no tiene luz con la que orientarse.

### Lo que queda fuera (de momento)

- **Fauna abisal de verdad** (granadero): necesita 13 MPa o más y 2–6 °C. Una bajada del 10 % de presión mató al que se subió vivo. El test lo comprueba: no cabe en ninguna área.
- **Murciélagos:** ninguno ha volado vivo al espacio.
- **Calamar bobtail:** voló al ISS (2021), pero necesita agua salada y no se conoce su conducta adulta en 0 g. Sería un acuario salado en el anillo (§8).

## 3. Túneles de agua y nadar

### Lo realista

1. **El río del hangar (tambores giratorios).** Dos tambores de 12 m de diámetro y 5 m de largo que **giran en sentidos contrarios** a unas 3,9 rpm (0,1 g en la pared), como los cilindros de O'Neill y los anillos de la nodriza. El agua forma un anillo de 1 m contra la pared; dentro queda un núcleo de aire. Es la **piscina cilíndrica de Kalpana One** (NSS), que también sirve de **refugio contra tormentas solares**.
   - Se nada a lo largo del anillo sin fin. «Arriba» es el eje: allí se sale a respirar y se flota a 0 g.
   - A 0,1 g las olas son altas y lentas y las salpicaduras tardan en caer.
   - **Coriolis:** nadar a 1 m/s añade 2ωv ≈ 0,8 m/s², casi tanto como la propia gravedad (0,98 m/s²). Nadar a favor del giro te aprieta contra el agua; en contra, te levanta. Es raro y real.
   - La pared se mueve a 2,4 m/s.
2. **Tubo inundado en 0 g.** Un tubo lleno del todo, sin aire, con corriente de bomba. Se atraviesa **con máscara completa y aire propio**. A la salida, una esclusa con chorros de aire y toallas quita el agua pegada. En un tubo de agua nunca te quedas varado como en medio de Kibo, pero vas más lento que planeando entre asideros.
3. **Esfera de agua para peces.** No se nada en ella: se mira y se cuida por guanteras y escotillas con membrana.

### La versión jugable

- **Modo nado** en el río del hangar: brazada = impulso con arrastre (la velocidad cae enseguida al dejar de nadar), medidor de aire cuando la cabeza está bajo el agua, y la gravedad y Coriolis del tambor en el HUD (los mismos que en el anillo, [gravedad.md](gravedad.md)). En el eje se pasa a flotar y a moverse de asidero en asidero ([ingravidez.md](ingravidez.md)).
- **Paso por el tubo inundado** entre el río y la esclusa: con máscara, un recorrido corto con corriente a favor.
- **Peligro:** sin máscara en agua de 0 g, el agua se pega a la cara; el HUD lo avisa y el reto de salida es quitarla (como el snorkel y la almohadilla que se añadieron a los trajes tras el EVA 23).

### Ficción (marcada así en el juego)

- Ríos de agua libre por los pasillos que se quedan en su sitio.
- Membranas que se atraviesan sin mojarse.
- Nadar en agua de 0 g sin máscara ni aire.
- Fauna abisal a presión normal.
- Oxigenar el agua de 0 g con cascadas o burbujas.

Si el juego usa alguna como licencia (Cold Sanctuary tiene magia), debe decirlo en la ficha, como hace la esclusa con su prerrespiración acortada.

## 4. El hangar como reserva de agua

| Opción | Agua | Viable | Por qué |
| --- | --- | --- | --- |
| Hangar entero lleno | 5 600 t | **No** | 6,4 veces la nodriza; más de 1 100 viajes del remolcador con hielo de cometa; el hangar está al vacío y habría que presurizarlo todo; como escudo de rayos cósmicos ni siquiera llega (las paredes pedirían 13 440 t a 7 t/m²) |
| **Río del hangar** (dos tambores) | **346 t** | **Sí, como objetivo largo** | Cabe en 20 × 14 × 20 m; unos 70 viajes de 5 t de hielo; el aire del núcleo son ~0,9 t (frente a las 6,7 t de presurizar el hangar) |
| Esfera de 4 m | 33,5 t | Sí | Unos 7 viajes |
| Pared de agua de 10 cm en el módulo habitable | 7,2 t | Sí | 10 g/cm²: el umbral bajo de RadWorks para reducir un 50 % la dosis de una tormenta solar |

**Circulación y «ríos».** En el tambor (0,1 g) el agua tiene superficie y las burbujas suben hacia el eje: un río con rápidos airea, como en la Tierra. La bomba lleva el agua por el biofiltro y el intercambiador de calor. En la esfera de 0 g el «río» es solo circulación: el oxígeno entra por la membrana.

**Números del río** (valores de juego salvo la física):
- **Volumen:** π (6² − 5²) × 10 m = 345,6 m³. **Presión del agua:** a 0,1 g, 1 m de agua solo suma ~1 kPa; la carga del tambor es la del aire a 101,3 kPa, como un módulo.
- **Giro:** 0,1 g a 6 m pide ω = 0,404 rad/s (3,86 rpm). Cada tambor (173 t de agua) lleva unos 2,1 × 10⁶ N·m·s de momento angular; el gemelo lo anula. Arrancarlo cuesta ½ I ω² ≈ 0,43 MJ por tambor (0,12 kWh): lo caro es el rozamiento y las bombas.
- **Oxígeno sin aireación:** con 200 kg de tilapia, el agua aguanta unas **11 h** antes de bajar de 5 mg/L (`oxygenReserveHours`). El acuario de 1 m³ con 1 kg de pez aguanta 6,5 h; la esfera con 2 kg, 109 h. Es el reto «¿cuánto tiempo tienes si falla la bomba?».
- **Reserva:** 346 t de agua son 38 t de hidrógeno y 308 t de oxígeno para la planta de propelente o el aire: el agua del río es la **reserva estratégica** de la estación.
- **Refugio:** en el eje del tambor hay ≥ 1 m de agua hacia fuera (≥ 100 g/cm²), muy por encima de los 9–21 g/cm² de RadWorks. Los extremos del tambor no tienen agua: hacen falta tapas de agua o de almacén.

## 5. Primeros candidatos

Por orden: lo que ya ha vivido y criado en órbita, y su papel en el bucle.

1. **Medaka** (*Oryzias latipes*): se apareó en el IML-2 (1994), hasta tres generaciones en el AQH, cepa elegida por no hacer bucles.
2. **Caracol** *Biomphalaria glabrata* y **ceratófilo**: el núcleo de C.E.B.A.S. y Omegahab; el ceratófilo también fue con los peces cebra de Tiangong.
3. **Pez cebra** (*Danio rerio*): 43 días y puesta en Tiangong (2024).
4. **Polilla** (vuela bien en 0 g) y **mosca** (vuela y descompone).
5. **Cucaracha** (concebida en órbita) y **grillo** (Neurolab): nocturnos y detritívoros.
6. **Bacterias del hidrógeno** (ya en la estación) y **tardígrados**: la base del módulo oscuro.
7. **Pez ciego**: solo en la cueva del anillo.
8. **Tilapia**: solo en el río, a 0,1 g. Ver la decisión sobre comer peces (§8).

## 6. Cómo se construye y desbloquea cada área

Igual que la estación crece ([estacion.md, «La estación crece»](estacion.md#la-estación-crece)): una nueva clase de plano, **Santuario**, en Planos. Cada plano dice qué le falta (`missingRequirements`) en naranja: «Necesita Acuario del anillo», «Necesita Módulo agrícola (Planos → Módulos)». Construir es una cadena de retos; si se falla, no se gasta nada. El área pide energía como el resto del equipo.

| Área | Pide | Retos (resumen) |
| --- | --- | --- |
| Acuario del anillo | Hub | 1) la masa: `agua_kg = volumen_m3 * 1000`; 2) cuánto aguanta sin bomba: `horas = (od - 5) * litros / (kg * ritmo)`; 3) ordenar el **ciclado del biofiltro** (amonio → nitrito → nitrato) antes de meter peces; 4) **qué especie cabe**: escribir la condición de `fit` (agua, temperatura) |
| Cueva del anillo | Acuario, laboratorio de biología | 1) ¿por qué el pez ciego solo en el anillo? (`if (g === 0 && !ve) …`); 2) hidrógeno al día para las bacterias, con las cifras del reactor de proteína; 3) ordenar el apagado de la luz y el arranque del reactor |
| Esfera de agua | Acuario, módulo agrícola, laboratorio de biología | 1) volumen de una esfera de 4 m (`Math.PI * d ** 3 / 6`); 2) elegir aireación según la gravedad (`g > 0 ? "burbujas" : "membrana"`); 3) dónde va la luz (un lado fijo); 4) ordenar el llenado sin burbujas |
| Insectario ingrávido | Módulo agrícola, campos de cultivo | 1) quién vuela en 0 g (abeja no, polilla sí: una tabla de datos); 2) cerrar el bucle: qué papel falta (`["productor", "consumidor", "descomponedor"].filter(…)`) |
| Módulo oscuro | Cueva, insectario, reactor de proteína | 1) el bucle sin luz; 2) energía: kWh del electrolizador por kg de biomasa |
| Río del hangar | Esfera, ampliación del hangar | 1) rpm para 0,1 g a 6 m (`Math.sqrt(g / r)`); 2) momento angular y por qué dos tambores; 3) viajes del remolcador para 346 t; 4) ordenar el llenado, el giro y la siembra |

**Cuidar** cada área después es una tarea de la lista de Tareas (categoría *animales* o *plantas*), como ajustar un biorreactor: revisar el oxígeno, limpiar el filtro, alimentar, recoger huevos. Si no se cuida, el área rinde menos y avisa.

## 7. El canon: amigos y familia, nunca comida

Berón (2026-11-14): «Los peces son amigos. La idea raíz de los santuarios es que humanos, animales, insectos, bacterias y plantas se hagan amigos, se hagan familia».

- **Ningún animal del santuario es comida**, ni los peces ni los insectos. La tilapia del río es un vecino, no una granja; el tenebrio y la mosca soldado reciclan, no se comen. La proteína de la tripulación sigue siendo la del huerto, la carne cultivada y el reactor de proteína.
- **Familia entre especies:** el santuario usa la misma regla que gatos, perros y gallinas (`family/domain/family.ts`): cada encuentro calmado suma vínculo (`warmMeetingBond`, 0,12) y desde `familyAt` (0,7) son familia. En el acuario, **cada tarea de cuidado bien hecha es un encuentro cálido** con el banco.
- **Bienestar:** con amigos en el tanque la Calma de Doménica sube un poco cada día; mirar un acuario más poblado bajó el pulso y mejoró el ánimo de los visitantes del National Marine Aquarium ([Cracknell et al. 2016](https://pubmed.ncbi.nlm.nih.gov/27818525/)).
- **Las bacterias y las plantas también cuentan:** el biofiltro y el ceratófilo son parte de la familia del tanque; «ciclar» el filtro es convencer a las bacterias de quedarse.

## 8. Pedir ayuda: un reto de programar mentes

En Codeship hablar con una mente es **leer o escribir su programa** (el duelo de mentes). En Cold Sanctuary modificar pensamientos ajenos es un hechizo avanzado (`spells-suprahechizo-and-thoughts.md`); aquí es el **núcleo del juego**: además de hacer que los animales se lleven bien, sirve para **pedirles ayuda**.

1. **Hacer amistad** (`amistad-acuario`): tras cuidarlos al menos una vez, un programa en la mente del banco: «cuando Doménica se acerque al cristal → recordar su cara y nadar hacia ella en banco». Se apoya en que los peces aprenden caras humanas ([pez arquero, 81 %](https://www.ox.ac.uk/node/509329)). Tres retos: ordenar el programa, predecir qué hace el banco con calma 0,8, y elegir la orden que no asusta.
2. **Pedir ayuda** (`ayuda-acuario`), solo a amigos, una regla por tarea y durante 10 días de juego:
   - **Caracoles: limpiar el cristal.** «cuando el cristal tenga algas → subir y rasparlas con la rádula; al terminar, volver al fondo». Efecto: las algas bajan al momento y siguen bajando (raspan 0,25 al día más), la tarea «Limpiar el cristal» desaparece y en 3D los caracoles suben al cristal. El reto de reparar enseña el peligro: un `si no → comer(ceratofilo)` se comería la planta que da el oxígeno.
   - **Medakas: avisar del agua.** «cuando el nitrato pase de 30 mg/L o falte oxígeno → subir en banco al cristal». Efecto: el cambio de agua se pide a 30 mg/L en vez de a 40, y el banco sube a la superficie y lo dice. Real: con poco oxígeno los peces suben a respirar la película de la superficie antes de morir ([Small et al. 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3984153)).
3. **La ficha de cada especie dice qué ayuda puede dar** (`Species.help` en `data/fauna.ts`): artemias que alimentan, dafnias que aclaran el agua, gambas que limpian el biofilm, lombrices que hacen tierra, mosca soldado que recicla los restos, gusanos de seda que hilan cuerda para los asideros, abejas que polinizan en el anillo.

**Licencia marcada:** la conducta es real; que una regla escrita la desencadene a voluntad es la licencia del juego, como los hechizos de Cold Sanctuary.

## 9. El acuario del anillo (lo que ya está)

| Pieza | Qué hace | Código |
| --- | --- | --- |
| Tanque | 1,6 × 0,8 × 0,8 m (1 m³) sobre un mueble, contra la pared de la puerta de la cubierta de cultivo, a 2 m de todo (HAB-08) | `habitat/data/ring-module.ts` (`acuario`), `adapters/three/interior/aquarium-model.ts` |
| Habitantes | 40 medakas (un solo banco, como el `Swarm` de Cold Sanctuary), 12 caracoles, gambas rojas, ceratófilo y biofiltro | `data/areas.ts`, `domain/aquarium.ts` |
| Bucle | Pienso → amonio (TAN = pienso × proteína × 0,092) → biofiltro → nitrato → ceratófilo; algas que crecen con la luz y el nitrato y que raspan los caracoles; hambre | `RingAquarium.tick` |
| Cuidados | Dar de comer (ración por peso), limpiar el cristal, cambiar el 20 % del agua: retos de código con **pasos visibles** (puerto `StepVisual`: escamas que caen, cristal que se limpia, el programa brilla sobre el tanque) | `application/aquarium-ops.ts`, `chores/application/step-visuals.ts` |
| Amistad y ayuda | §7 y §8 | `data/aquarium-lessons.ts` |
| Estado | Una línea en el estado de Doménica: nitrato, algas, «medakas amigas», quién ayuda | `ui/aquarium-text.ts` |
| QA | VID-11 a VID-13 y el recorrido PX-13 `acuario` | `aquarium.test.ts`, `aquarium-ops.test.ts`, `tools/experiencia/acuario.mjs` |

## 10. Progresión: de la medaka a las criaturas poderosas

En Cold Sanctuary, Doménica se hace fuerte para **jugar con los animales más poderosos** (la ballena, el oso polar): solo juegan los criados por humanos, los de vínculo suficiente o los muy relajados; un oso salvaje sigue la ley natural (`world-topology-and-planes.md` §4.1). Tras dominar el yoga aprende hechizos avanzados que parecen magia.

**El equivalente espacial** sube por **dos escaleras a la vez**: el **yoga** (Calma y Forma de la tripulación, ya en `CrewMember`) y la **destreza mental** (nivel de los duelos y de la subyugación, ya en `mind-duel` y `subjugation-levels`). Cada escalón pide algo de las dos:

| Nivel | Criaturas | Por qué son «más poderosas» | Pide |
| --- | --- | --- | --- |
| 1 · Acuario | Medaka, caracoles, gambas | Mentes simples, un banco | Cuidar una vez |
| 2 · Enjambres | Abejas del anillo, polillas y gusanos de seda del insectario | Muchas mentes a la vez: la regla debe valer para todo el enjambre | Calma ≥ 0,6; duelos de nivel 2 |
| 3 · Mentes grandes | **Calamar bobtail** y **pulpo** (acuario salado del anillo) | Cerebros grandes que aprenden y escapan; un mal programa los enfada (agresividad del duelo) | Calma ≥ 0,7; programas con bucles y condiciones |
| 4 · «La ballena» | **El río del hangar** como un solo organismo: tilapias, bancos y plantas | Una mente colectiva enorme; acercarse es nadar (modo nado, fase 7) | Forma ≥ 0,7 para nadar; duelos de nivel 4 |
| 5 · «El oso polar» | **Los asteroides furiosos** que hoy se subyugan | La mente más fuerte del juego. En vez de subyugarlos, **hacerlos familia**: que acepten «jugar» (dejar minar, cambiar de órbita) | Yoga avanzado y la subyugación completa |

Como en Cold Sanctuary, una criatura que no es amiga sigue su naturaleza: el pulpo se escapa del tanque, el asteroide embiste. El vínculo (cuidar + jugar) es lo que desbloquea pedirles más.

## 11. Biomas de la estación a su tamaño real

Cifras en la investigación (§12). La nodriza lleva los recursos de la tripulación y **biomas pequeños en su anillo** (sobra suelo: 6 334 m² por anillo y la cubierta de cultivo usa 324). La estación **aloja los biomas grandes**:

| Bioma | Dónde | Tamaño | Gravedad | Fauna (ver catálogo) |
| --- | --- | --- | --- | --- |
| Acuario del anillo (hecho) | Nodriza, cubierta de cultivo | 1 m³ | 1 g | Medaka, caracol, gamba roja, ceratófilo |
| Bosque del anillo | Nodriza, sector de 40 × 18 m | 720 m² | 1 g | Frutales, abejas, lombrices, colémbolos, cochinillas |
| Acuario salado | Nodriza, cubierta del anillo | 2–5 m³ (+ el mismo peso en el anillo gemelo) | 1 g | Artemia, medusa luna (kreisel), calamar bobtail |
| Esfera de agua | Estación, módulo agrícola (330 m³) | 33,5 t | 0 g | Medaka, pez cebra, caracol, anfípodo, dafnia, ceratófilo |
| Insectario | Estación, módulo agrícola | — | 0 g | Polillas, gusanos de seda, grillos, mosca soldado |
| **Módulo bioma** (nuevo) | Estación, hinchable como el BA 2100, atracado en uno de los **dos puertos laterales libres del Nodo 1** (la estación le da sola puerta con nombre, pasillo y asideros) | 2 250 m³; tambor interior de 10 m × 12 m | 0,1–0,3 g en el tambor, 0 g en el eje | Bosque de aire y suelo: lombrices, tenebrio, cochinillas, colémbolos, plantas trepadoras |
| Río del hangar | Estación, hangar | 346 t | 0,1 g | Medaka, pez cebra, tilapia, caracol |

## 12. Estaciones-árbol: la red de estaciones

Berón: «reutiliza la idea de los edificios-árbol de Cold Sanctuary: estaciones espaciales que actúan como edificios-árbol, con máquinas espaciales para pasar de una a otra. Así podrían entrar más personajes, como Cold Sanctuary empezó con pocas plataformas y ahora tiene varios edificios para todos sus habitantes».

En Cold Sanctuary (`construcciones-elevadas.md`, `plano-edificios.md`, `transporte-alfombras.md`): lo construido no ocupa el suelo de la naturaleza; los edificios crecen en pisos sobre un tronco (lo pesado abajo, lo silencioso arriba); las plataformas cercanas se unen con puentes y las lejanas con **alfombras voladoras automáticas** desde una pista en lo alto de cada edificio.

| Cold Sanctuary | Codeship |
| --- | --- |
| **Edificio-árbol**: tronco y pisos | **Estación-árbol**: una **viga central** (el tronco) con los módulos como ramas; cerca del tronco lo pesado y ruidoso (fábrica, planta), en las puntas lo silencioso (habitáculos, yoga, biomas) |
| Puentes entre plataformas cercanas | **Pasillos presurizados** entre módulos de la misma estación |
| Pista de alfombras en el último piso | Un **puerto de traslado** en la punta de cada estación |
| **Alfombra voladora** automática: tocar, elegir destino, ir sentado | **Lanzadera de traslado** automática (como la Soyuz T-15 que fue de la Mir a la Salyut 7 en 1986): se toca la máquina del puerto, se elige la estación, Doménica va sentada y se acopla sola |
| Arboleda residencial: un dormitorio por persona | **Estación-hogar** de cada grupo nuevo: así entran personajes |

**Cómo entran personajes:** cada estación nueva trae a sus habitantes (una familia de científicos para el módulo bioma, una tripulación de mineros, los cuidadores del río). La red empieza con la nodriza y la estación de hoy y crece de una en una, como Cold Sanctuary pasó de pocas plataformas a varios edificios. Cada estación es un **plano** con requisitos (`missingRequirements`) y su pieza de tronco.

## 13. Plan por fases (fauna, amistad y estaciones-árbol)

| Fase | Rama | Qué entra | Tamaño |
| --- | --- | --- | --- |
| A | `santuario-fauna` (esta) | Investigación de fauna y medio (§10–§13 de la investigación), catálogo ampliado con fuentes y ayudas, regla de salinidad, **acuario del anillo** jugable (cuidados, amistad, ayuda), PX-13 | Hecha |
| B | `santuario-familia` | Guardar el estado del acuario; el banco y los caracoles en la línea de Familias; más ayudas (gambas, dafnias) y el reto de ciclar el biofiltro | Pequeña |
| C | `santuario-salado` | Acuario salado del anillo: artemia, medusa luna en kreisel, calamar bobtail; anillo gemelo con su contrapeso de agua | Media |
| D | `santuario-bosque` | Bosque del anillo: abejas, lombrices, colémbolos, mosca soldado y tenebrio que reciclan los restos de la cocina | Media |
| E | `santuario-esfera` (antes fase 3) | Esfera de 0 g con lo que ya voló (medaka, anfípodos, dafnias) | Media |
| F | `estaciones-arbol` | Red de estaciones: puerto de traslado, lanzadera automática, segunda estación con el **módulo bioma** y sus personajes | Grande |
| G | `santuario-poderosos` | Progresión §10: enjambres, cefalópodos, el río como una mente, asteroides como familia | Grande |

## 14. Plan original por fases (fase 0)

| Fase | Rama | Qué entra | Tamaño |
| --- | --- | --- | --- |
| 0 | `santuario-espacial` (esta) | Investigación, este documento y el dominio de reglas (`modules/sanctuary`: clases, requisitos, cubiertas, agua, encaje de fauna, bucle) con tests | Hecha |
| 1 | `santuario-acuario` | Acuario del anillo en la cubierta de cultivo: casos de uso (`SanctuaryOps`), cadena de retos de construir y de cuidar, tanque en 3D con banco de medakas como un solo organismo, oxígeno y filtro en la pestaña Vida, depósito gemelo en el otro anillo | Media |
| 2 | `santuario-planos` | Clase **Santuario** en Planos (estado, bloqueos, energía), guardar el estado de las áreas | Pequeña |
| 3 | `santuario-esfera` | Esfera de agua en el B330: membrana, trampa de burbujas, luz lateral, peces que hacen bucles los primeros días y luego se orientan por la luz | Media |
| 4 | `santuario-insectario` | Insectario ingrávido: polillas y moscas que vuelan, cucarachas en las paredes, penumbra | Media |
| 5 | `santuario-oscuro` | Cueva del anillo y módulo oscuro: quimiosíntesis enlazada con el reactor de proteína | Media |
| 6 | `santuario-rio` | Río del hangar: agua importada (remolcador y cometas), dos tambores, refugio contra tormentas | Grande |
| 7 | `santuario-nado` | Modo nado en el río y el tubo inundado; aviso de agua en la cara | Media |

Cada fase con su documento de diseño, capturas en móvil y escritorio y los recorridos de QA que toquen.

## 15. Decisiones abiertas para Berón

1. **El hub:** ¿el santuario terrestre es la cubierta de cultivo de la nodriza (lo que propongo) o queremos un anillo propio en la estación (una centrífuga nueva, cara)?
2. **Primer santuario:** propongo el **acuario del anillo** (1 m³, medaka, caracol y ceratófilo). ¿Te vale, o prefieres empezar por la esfera en 0 g, más espectacular y más difícil?
3. **Nadar:** sin respuesta; se queda solo en el río del hangar y la ficción marcada para más adelante.
4. ~~**¿Se comen los peces?**~~ **Respondida (2026-11-14):** no; los peces son amigos (§7).
5. **Agua salada:** ¿abrimos un acuario salado en el anillo para el calamar bobtail (que voló a la ISS y brilla con sus bacterias)?
6. **El abismo:** ¿descartamos la fauna abisal real (presión) o aceptamos un tanque hiperbárico pequeño como laboratorio, o como licencia mágica?
7. **El núcleo:** Cold Sanctuary tiene un quinto santuario, el Núcleo. ¿Tiene un equivalente aquí (por ejemplo, junto al reactor de la nodriza) o lo dejamos?
8. **Murciélagos:** no hay datos de vuelo. ¿Los queremos más adelante, en un anillo y con mucho volumen?
9. **El agua del río:** ¿cuánto tiempo de juego para traer 346 t? Con el remolcador son unos 70 viajes; ¿añadimos un carguero de hielo de cometa?
10. **Caracol:** *Biomphalaria* tiene vuelo pero hospeda la esquistosomiasis; la nerita no ha volado pero no se multiplica en agua dulce y limpia mejor. ¿Mantenemos *Biomphalaria* de laboratorio (lo que propongo, por su historial) o cambiamos a nerita en el acuario del anillo?
11. **Escalera de poder (§10):** ¿te valen el pulpo como «mente grande» y los asteroides como «oso polar»? El pulpo no ha volado y pide agua salada.
12. **Módulo bioma (§11):** ¿un hinchable del tamaño del BA 2100 (2 250 m³) en la estación, con un tambor interior de 0,1–0,3 g?
13. **Estaciones-árbol (§12):** ¿lanzadera automática (realista, como la Soyuz T-15) o un transporte con licencia (un «tubo» de traslado)? ¿Qué personajes llegan con la segunda estación?
14. **Cuántos peces:** 40 medakas en 1 m³ es una carga muy suave (el tanque es estable y apenas pide cambios de agua). ¿Más peces y más tareas, o así de tranquilo?
