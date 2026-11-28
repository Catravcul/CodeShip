# Retos de trazos: dibujar compuestos químicos (rama `s3-retos-dibujo`)

Pedido de Berón (2026-11-25): «en sanctuary3 los retos son diferentes, en lugar de selección de opciones se deben dibujar
compuestos químicos, imagino que es como una varita mágica […] se muestra de una en una la forma de la letra que toca
dibujar y lo que se debe hacer es pasar el dedo por la figura […] hasta terminar un compuesto químico que represente al
reto, quizás a estas figuras se les podría dar un aspecto representativo del compuesto».

## Qué es

Todos los retos del santuario 3 (los puestos de la iniciación, la programación de vuelos, el día del lanzamiento y el
trabajo de campo del bioma) se hacen **dibujando con el dedo un compuesto real** que representa al reto, glifo a glifo.
Ocupa el sitio de la hoja (solo se ven la hoja y la escena, [reglas.md](reglas.md) §4.3): arriba la fórmula entera con
el glifo que toca resaltado; en grande, ese glifo con su guía (el punto de inicio numerado, flechas en el sentido del
trazo, línea discontinua que se va llenando) y el rastro luminoso del dedo, **como una varita mágica**, con el aspecto
del compuesto (su paleta y sus partículas). Al terminar la fórmula se dibuja su molécula en 2D (los átomos aparecen y se
enlazan) y el reto se cierra con éxito. «×» sale sin éxito. Dedo y ratón (pointer events). El santuario 1 y las naves no
cambian: siguen con la hoja de opciones.

Los pasos del reto siguen ahí y suenan igual que antes: al terminar el glifo *i* de *G* se dan por hechos los pasos
hasta ⌈(*i*+1)·*N*/*G*⌉ de *N* (con todas las partes de un paso de ordenar), y cada uno lanza su animación del puesto
(`beat(index, part)`). El pie dice «Pasos 2/5».

## Vista HUD y la escena encuadrada (2026-11-28)

Berón: «en los retos de sanctuary3 falta la vista hud, he realizado el reto de dar una clase en el aula y no he visto la
animación, asegúrate que se encuadre la cámara para ver las animaciones».

- **Vista HUD / Vista panel** en la barra de arriba, junto a «×»: el mismo ajuste que la hoja de opciones de todos los
  niveles y que los ajustes generales («Vista de retos», `compactUi` de `ui/duel-view.ts`). En HUD el reto flota sobre la
  escena: arriba el título y la fórmula, abajo el panel de dibujo transparente (un velo tenue para leer la guía) con la
  pista y los pasos; en medio, la escena.
- **La cámara encuadra en la franja libre**, medida en la propia pantalla del reto (`ui/sheet-band.ts` mide `.trace`
  igual que `.duel`): en panel, encima del panel; en HUD, entre la fórmula y el panel de dibujo. El santuario 3 la mide
  para todos sus retos (`retoLens` de `aerial-sanctuary.ts`: puestos, servicios, vuelos, mesa de campo) y la vuelve a
  medir al cambiar de vista.
- **Los servicios del campus** (la clase del aula, la cata, la cuarentena, el estudio, la guantera, el insectario, la
  colmena, la Veggie, la impresora, la reunión, el descanso) antes no encuadraban ni animaban: ahora ella se pone ante el
  servicio, la cámara entra por detrás de su hombro derecho (`focusReto`) y cada paso dibujado se representa con la
  animación de ese paso del santuario 1 (`stepAnimation`, con el reproductor de pasos `StepShow` de las naves). El
  mando de la cámara gira alrededor de ella.
- **Encuadre en panel**: la franja ve ±33° (antes 28°, `sheetLens` compartido): ella entera con aire sobre la cabeza
  y el objeto del paso dentro de la franja medida.
- **Puesto 8 (simulador de Dragon)**: la cámara se pone a su lado, entre ella y la pantalla (`S3Rigs.eye`): se ven ella
  y la pantalla donde se juega cada paso, sin que su cabeza la tape.

## Código

| Pieza | Dónde |
| --- | --- |
| Geometría (arcos, remuestreo, distancias) | `src/modules/trazos/domain/shape.ts` |
| Comprobación de un trazo | `src/modules/trazos/domain/trace.ts` (`StrokeTracker`, `checkStroke`) |
| Fórmula → glifos, conteo de átomos | `src/modules/trazos/domain/formula.ts` |
| Dibujar una fórmula, con ayuda tras fallos | `src/modules/trazos/domain/run.ts` (`TraceRun`) |
| Pasos del reto por glifo | `src/modules/trazos/application/trace-chore.ts` (`stepsUpTo`, `glyphBeats`) |
| Glifos | `src/modules/trazos/data/glyphs.ts` |
| Compuestos (fórmula, PubChem, aspecto real y del juego, molécula 2D) | `src/modules/trazos/data/compounds.ts` |
| Qué compuesto es cada reto del santuario 3 | `src/modules/aerial-sanctuary/data/retos-trazos.ts` |
| La pantalla | `src/ui/trace-view.ts` + `trace.css`; `openTraceChallenge(view, chore, compuesto, beat, done)` la abre para cualquier santuario |
| El punto de cambio | `openChallenge` de `src/aerial-sanctuary.ts` (el bioma abre sus retos por ahí: `S3Biome.wire`) |

El módulo `trazos` es compartido: no sabe de ningún santuario. Otro santuario que quiera trazos solo necesita su tabla de
retos → compuestos y llamar a `openTraceChallenge`. Gancho de prueba: `window.codeshipS3.trace` (`state`, `ideal()`: los
trazos ideales del glifo actual en px de pantalla, para que Playwright los recorra con el ratón).

## Glifos

Mayúsculas A–Z salvo J y Q (ningún símbolo químico empieza por ellas), minúsculas que son segunda letra de algún símbolo
(a–z salvo j, q, w, x; la «n» también es el subíndice de un polímero), dígitos 0–9 (los subíndices, que se dibujan en
grande de uno en uno), «+», «−», «(» y «)». Cada glifo es una lista de trazos en el orden y sentido de la caligrafía
escolar (de arriba abajo y de izquierda a derecha; las redondas en sentido antihorario desde arriba o desde la derecha),
como polilíneas en unidades de la caja: 0 arriba de la mayúscula, 1 la línea base, 0,42 la altura de la minúscula, 1,32
el pie de una descendente. Todos se dibujan con la misma línea base y el mismo tamaño. El dibujo es nuestro
(**licencia**). Las pruebas comprueban que hay glifo para cada letra de los 118 símbolos, que cada trazo recorrido tal
cual cuenta y que los trazos largos al revés no.

## Comprobación

- **Tolerancia**: el 12 % de la altura del glifo en pantalla, al menos 18 px (≈ 30 px en un iPhone 13).
- El trazo se corta en muestras cada media tolerancia; el dedo (densificado, para que uno rápido no se salte muestras)
  las cubre **en orden y desde el principio**: una muestra cuenta si el dedo pasa a menos de la tolerancia y las
  anteriores ya se pasaron (se perdona un hueco de 1,5 tolerancias).
- Cuenta si cubre **≥ 85 %** y no más del 30 % del recorrido del dedo queda lejos (> 1,8 tolerancias) de la línea.
- Si no cuenta, dice por qué: «al revés» (cubriría el trazo invertido), «empieza en el punto», «te faltó parte», «te
  saliste». **El trazo se repite, sin vidas ni castigo**; tras dos fallos en el mismo trazo la tolerancia crece ×1,4, y
  tras cuatro ×1,8 con un 75 % de cobertura, para que nadie se atasque.

## Aspecto de cada compuesto

Paleta de tres colores (rastro, brillo, fondo) y partícula: **gotas** (agua, fluoresceína, queroseno), **burbujas** (O₂, N₂,
CO₂), **cristales** cúbicos (NaCl, AgCl, pirita; prismas para el olivino), **llamas** (metano azul, TEA verde), **humo**
(N₂O₄ pardo rojizo, CO), **fibras** (celulosa, PET, epoxi de la fibra de carbono), **polvo** (glucosa, escopolamina,
carbonato de calcio), **chispas** (LiCoO₂). La molécula final usa los colores CPK; las grandes, sin los H (como las
dibujan los químicos); las sales y los minerales, un trozo de su red en la proporción de la fórmula (las pruebas
comprueban que los átomos de cada dibujo cuadran con su fórmula).

## Tabla: el compuesto de cada reto

Los compuestos y sus datos son **reales** (PubChem). Qué compuesto representa a cada reto es **nuestro** (licencia).

| Reto | Compuesto | PubChem | Aspecto real | Por qué |
| --- | --- | --- | --- | --- |
| 1 Selección | (C₆H₁₀O₅)ₙ celulosa | Cellulose | Fibras o polvo blancos | La selección es papel: la solicitud y la carpeta |
| 2 Reconocimiento médico | AgCl cloruro de plata | CID 24561 | Cristales blancos que se oscurecen a la luz | Los electrodos del ECG son de Ag/AgCl |
| 3 Natación y supervivencia | C₂₀H₁₂O₅ fluoresceína | CID 16850 | Polvo rojo anaranjado; en agua, verde fluorescente | El tinte marcador que tiñe el mar para que la vean desde el aire |
| 4 Cámara hipobárica | O₂ oxígeno | CID 977 | Gas incoloro; líquido azul pálido | Se prerrespira oxígeno y se aprende qué pasa sin él |
| 5 Centrífuga | C₆H₁₂O₆ glucosa | CID 5793 | Polvo cristalino blanco | Con la g, el cerebro se queda sin oxígeno ni glucosa: el G-LOC |
| 6 Vuelo parabólico | C₁₇H₂₁NO₄ escopolamina | CID 3000322 | Líquido viscoso; su bromhidrato, cristales blancos | La NASA la da contra el mareo de las parábolas |
| 7 Piscina NBL | H₂O agua | CID 962 | Líquido incoloro | La flotabilidad neutra es en agua |
| 8 Simuladores de Dragon y del LM | N₂O₄ tetróxido de dinitrógeno | CID 25352 | Pardo rojizo | Oxidante hipergólico de los Draco y del motor de descenso del LM |
| 9 Robótica | C₂₁H₂₄O₄ BADGE (resina epoxi) | CID 2286 | Líquido viscoso incoloro a amarillo | Vigas de Canadarm2 de fibra de carbono en resina; el BADGE es la epoxi más común (la del brazo no está publicada) |
| 10 Control de misión (Electron) | LiCoO₂ óxido de litio y cobalto | Lithium cobalt oxide | Polvo gris azulado oscuro | Las bombas eléctricas de los Rutherford van con baterías de polímero de litio; cátodo típico (la química de Rocket Lab no está publicada) |
| 11 Meteoritos | Mg₂SiO₄ forsterita (olivino) | Forsterite | Cristales verde oliva | El mineral más abundante de las condritas |
| 12 Supervivencia en frío | CO monóxido de carbono | CID 281 | Gas incoloro, inodoro, tóxico | Ventilar la zanja y la tienda con el hornillo encendido |
| 13 Integración: el traje | C₁₀H₈O₄ PET (una unidad) | Polyethylene terephthalate | Sólido blanco o transparente; en fibra, poliéster | Fibra de base de los tejidos técnicos (la composición del traje de SpaceX no está publicada) |
| Lanzamiento: torre y sala blanca | N₂ nitrógeno | CID 947 | Gas incoloro | La cabina se cierra llena de aire como el de la Tierra: 78 % de N₂ |
| Lanzamiento: cuenta atrás | Al(C₂H₅)₃ trietilaluminio (TEA) | CID 16682 | Líquido que arde solo al aire; con TEB, llama verde | Los Merlin se encienden en T−0 con TEA-TEB: el destello verde |
| Lanzamiento: ascenso | CO₂ dióxido de carbono | CID 280 | Gas incoloro | El queroseno arde con el oxígeno y sale CO₂ y agua |
| Lanzamiento: cita con la Starship | CH₄ metano | CID 297 | Gas incoloro; llama azul | Los Raptor de la Starship queman metano |
| Programar un vuelo | C₁₂H₂₆ dodecano | CID 8182 | Líquido incoloro | El S-92 quema Jet A; el dodecano es su modelo de una molécula |
| Colmenas de abeja asiática (bioma) | C₆H₁₂O₆ glucosa | CID 5793 | Polvo blanco dulce | Se miden los cuadros de miel: glucosa y fructosa |
| Transecto de mariposas (bioma) | (C₆H₁₀O₅)n celulosa | Cellulose | Fibras blancas | Cada apolo se apunta en la hoja de campo |
| Trampas de escarabajos (bioma) | NaCl sal | CID 5234 | Cristales cúbicos blancos | Las trampas llevan agua saturada de sal |
| Rutina de sueño (residencia) | O₂ oxígeno | CID 977 | Gas incoloro | Habitación ventilada: aire fresco, sin CO₂ acumulado |
| Cata (restaurante) | H₂O agua | CID 962 | Líquido incoloro | La comida espacial se rehidrata con agua |
| Cuarentena (clínica) | NaCl sal | CID 5234 | Cristales cúbicos blancos | El suero fisiológico lleva un 0,9 % de sal |
| Clase de soporte vital (aulas) | CH₄ metano | CID 297 | Gas incoloro | El Sabatier da agua y metano |
| Procedimiento del ODF (biblioteca) | (C₆H₁₀O₅)n celulosa | Cellulose | Fibras blancas | Los procedimientos van en papel |
| Guantera (laboratorio) | N₂ nitrógeno | CID 947 | Gas incoloro | La guantera se llena de nitrógeno seco |
| Moscas (crianza) | CO₂ | CID 280 | Gas incoloro | Las moscas se duermen con CO₂ para pasarlas de vial |
| Colmena (crianza) | C₆H₁₂O₆ glucosa | CID 5793 | Polvo blanco dulce | La miel es glucosa y fructosa |
| Veggie (huerto) | CO₂ | CID 280 | Gas incoloro | Las lechugas toman el CO₂ de la cabina |
| Impresora 3D (taller) | PET | Polyethylene terephthalate | Sólido blanco o transparente | El filamento es PETG |
| Reunión de los lunes (asambleas) | (C₆H₁₀O₅)n celulosa | Cellulose | Fibras blancas | Las tareas se apuntan en papel |

**Fuente.** PubChem (pubchem.ncbi.nlm.nih.gov): fórmula, nombre y «Physical Description». El 2026-11-25 PubChem no era
accesible desde la máquina de trabajo (el proxy lo bloquea): los CID se escribieron de memoria y quedan **por
confirmar**; donde no estábamos seguros del CID se deja solo el nombre con que PubChem lo registra.

## Preguntas abiertas para Berón

1. ¿Le valen los compuestos elegidos (sobre todo los de licencia: LiCoO₂ para el Electron, PET para el traje, CO para el frío)?
2. Los retos de 1–3 glifos (O₂, CO, N₂) son cortos; los largos (C₂₁H₂₄O₄) tienen 8 glifos. ¿Se iguala la duración (p. ej.
   dibujar también el nombre o repetir la fórmula), o vale así?
3. Los recorridos PX-45/46/47 y el del bioma respondían la hoja de opciones con `codeshipS3.exercise`; hay que
   pasarlos a trazar con `codeshipS3.trace.ideal()`.
