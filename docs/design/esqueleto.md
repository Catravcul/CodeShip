# Esqueleto de yoga: el de Cold Sanctuary en Codeship

Pregunta del diseñador (Berón, 2026-11-16): «En Cold Sanctuary hay una lógica para crear esqueletos de personajes
para que hagan yoga. ¿Es mejor que nuestro modelo actual? ¿Se puede usar o el impacto en rendimiento sería
demasiado?»

**Respuesta corta:** sí, es mejor para el yoga, y cuesta poco. Doménica hace ahora el yoga del anillo con el
esqueleto de Cold Sanctuary (19 articulaciones, IK de dos huesos, apoyo en el suelo y respiración) y con sus
48 asanas, traídas por un script y no copiadas a mano. Se ve igual que antes: son las mismas cajas, una más,
porque el torso pasa a ser lumbar y pecho. Coste medido en el perfil iPhone 13 con la CPU ×4: **+1 llamada de
dibujo, +12 triángulos, +2,9 MB de memoria JS y unos 0,3–0,5 ms de JS por fotograma** (mediana) mientras
cambia de postura. Los animales no lo usan: su anatomía es otra y no lo necesitan.

## Los dos modelos

| | Codeship antes (`CubeFigure`) | Cold Sanctuary (`CubeHumanoid` + `AsanaPoseSpell`) |
| --- | --- | --- |
| Articulaciones | 9 pivotes: pelvis, torso, cabeza, 2 hombros, 2 codos, 2 caderas, 2 rodillas | 19: pelvis, lumbar (`Back`), pecho (`Chest`), cuello, cabeza, 2 escápulas, 2 hombros, 2 codos, 2 muñecas, 2 caderas, 2 rodillas, 2 tobillos |
| Grados de libertad | 16: altura y cabeceo de la pelvis, torso 1, cabeza 3, hombro 2, codo 1, cadera 1, rodilla 1 | 3 ejes en cada articulación (57), más la altura de la pelvis y la anchura entre los pies (`stanceWidth`) |
| Columna | Un bloque rígido | Dos tramos (55 % lumbar, 45 % torácica): se curva al flexionar y al extender |
| IK | No: las manos caen donde caen los ángulos | `TwoBoneIK` (ley de cosenos) para manos y pies: palmas juntas en el rezo, diez dedos al suelo junto a los pies |
| Apoyo | La altura de la pelvis se escribe a mano en cada pose | `Ground`: la esquina más baja del cuerpo toca el suelo, en cualquier postura |
| Asanas | 13 formas de yoga escritas a mano «como las de Cold Sanctuary», aproximadas | 48 asanas distintas en 5 sesiones (abajo) |
| Respiración | No hay | Por fases de 8 s (inhala, exhala); cada postura se sostiene N respiraciones |
| Transiciones | Suavizado exponencial de ángulos Euler | `SmoothStep` desde donde esté el cuerpo; el IK entra con la transición |

Datos de Cold Sanctuary (commit `af0bca9`, `Assets/Scripts/Asana/`):

| Sesión | Fuente | Pasos | Asanas distintas |
| --- | --- | --- | --- |
| Saludo al Sol (Surya Namaskar) | `YogaSpells.cs`, `SunSalutation.Sequence` | 12 | 9 |
| Surya Namaskara A de Ashtanga | `SunSalutation.AshtangaA` | 11 | 7 más |
| Ashtanga, Serie Primaria (núcleo) | `AshtangaPrimary.cs` | 10 | 10 |
| Yoga Namaskar | `YogaNamaskar.cs` | 26 | 10 |
| Upa-yoga de cuello y hombros | `UpaYoga.cs` | 70 | 14 |

La ficha anatómica de cada postura está en su `docs/yoga-asanas-spec.md`; no tiene imágenes de referencia.

**Veredicto:** el modelo de Cold Sanctuary es mejor en todo lo que pide el yoga: más articulaciones, IK,
apoyo, respiración y datos. El nuestro solo ganaba en sencillez. Por eso se porta el modelo y se deja la
figura igual por fuera.

## Qué se ha portado

- **`src/modules/body/domain`**, en TypeScript puro y con tests, sin Three.js:
  - `skeleton.ts`: la jerarquía de 19 articulaciones (`JOINTS`), con las medidas de nuestra figura
    (`CUBE_FIGURE`), cinemática directa y el punto más bajo de las cajas.
  - `unity-axes.ts`: el cambio de ejes de Unity a Three.js (abajo).
  - `two-bone-ik.ts`: el IK de dos huesos.
  - `asana.ts`: el formato de una asana (`AsanaData`) y la pose que pide.
  - `body-solver.ts`: el orden de `AsanaPoseSpell.Apply`: alcances al cuerpo, apoyo en el suelo, alcances al
    suelo.
  - `asana-player.ts`: transición suave, entrada del IK y respiración.
- **`src/modules/body/data/cold-sanctuary-asanas.ts`**, generado por `scripts/asanas-from-cold-sanctuary.mjs`
  (`npm run asanas`). El script lee el C# de Cold Sanctuary, que escribe las posturas como código (`Hinge(112)`,
  `Spine(32)`, `ArmsUp`…), y lo traduce a JavaScript con los mismos ayudantes. Evalúa las tablas de las cinco
  sesiones y guarda las asanas y las secuencias tal cual, en la convención de Unity. `npm run asanas -- --check`
  falla si el fichero ya no coincide con Cold Sanctuary. Si una asana se repite con el mismo nombre y otros
  datos, lleva «-2»; por ejemplo, la zancada con la otra pierna.
- **`src/modules/body/data/asanas.ts`**: las asanas con los añadidos de Codeship, que se guardan aparte para
  que el fichero generado siga siendo una copia (abajo).
- **Adaptador**: `CubeFigure` (`adapters/three/interior/figure.ts`) tiene ahora los grupos de las 19
  articulaciones. El torso son dos cajas: lumbar de 0,24 m y pecho de 0,26 m, igual que la caja de 0,5 m de
  antes. Hay cuello, escápulas y muñecas sin caja, y tobillos con el pie. `figure.asana(a)` le pasa el cuerpo
  al `AsanaPlayer`, y cada fotograma copia los cuaterniones en los grupos. Los gestos de siempre (`pose`,
  `poseAngles`, `walk`) mueven las 9 articulaciones de antes. Al volver a ellos, las demás vuelven al reposo.
  No hay malla con piel (*skinned mesh*): son las mismas cajas, una más.
- **Datos del juego**: cada postura de `wellness/data/yoga.ts` (Saludo al Sol y upa-yoga) dice su `asana`.
  Un test comprueba que todas existen.
- **Anillo**: en la esterilla está ahora Doménica, con su pelo lavanda, y no una figura genérica. La cámara se
  pone en el pasillo y la ve de perfil sobre la hoja del reto. Empieza de pie (Samasthitih) y cada acierto la
  lleva a la asana siguiente.

## Ejes

Unity es levógiro y Three.js dextrógiro. Los dos tienen Y arriba. Nuestra figura mira a +Z como la de Unity,
así que su izquierda está en +X y en Unity en −X. El cambio de base es el espejo M = diag(−1, 1, 1):

- Puntos (alcances del IK): (x, y, z) → (−x, y, z).
- Rotaciones: R' = M·R·M. El giro sobre X no cambia («X+ flexiona hacia delante» sigue igual) y los giros
  sobre Y y Z cambian de signo. Se mantiene el orden de Euler de Unity (`Quaternion.Euler`: Z, luego X, luego
  Y), así que q = Ry(−y)·Rx(x)·Rz(−z).
- Los nombres `Left`/`Right` no se tocan: la izquierda de Unity cae en +X, que es nuestra izquierda.

Los tests de `unity-axes.test.ts` lo comprueban con lo que Unity da para `Quaternion.Euler(0, 90, 0) * forward`
y los demás casos.

## Diferencias con el C# (y por qué)

1. **IK desde el polo.** El C# empuja la flexión que ya tiene el codo. Aquí el codo se coloca en el lado del
   polo y luego se gira lo mínimo en el plano de flexión, así que no salta cuando la pose lo tenía doblado al
   otro lado.
2. **Mientras el IK entra, se mueve el objetivo, no las rotaciones.** El objetivo va de la mano al punto, y el
   polo, de la flexión actual al polo pedido. El IK pesa en el 60 % final de la transición. Si se mezclaran
   rotaciones, un codo doblado podría girar por el camino largo.
3. **Apoyo sin los miembros que van al suelo.** Una mano que cuelga baja sostenía el cuerpo y los pies
   flotaban 8 cm (Uttanasana). El cuerpo se apoya sin ellos, después llegan las manos y al final se vuelve a
   apoyar todo.
4. **Palma en el suelo.** El objetivo de Cold Sanctuary es la muñeca a 3 cm del suelo. Aquí se sube lo que la
   caja inclinada del antebrazo baja bajo la muñeca, así que la palma queda en el suelo.
5. **Alcance según nuestras proporciones.** Si un punto del suelo queda fuera del alcance de nuestro brazo,
   se acerca por el suelo hacia el hombro lo que falta. Pasa con las manos del perro boca abajo, a 1 m.
6. **Añadidos** (`CODESHIP_REACHES`): Cold Sanctuary da en Bhujangasana y en Ashtanga Namaskara las manos «de
   apoyo», pero solo ángulos, sin alcance. Sin él, los brazos sostenían el cuerpo y las piernas flotaban. Se
   añaden las manos al suelo bajo los hombros. Convendría llevarlo a Cold Sanctuary.
7. **Tiempo.** En Cold Sanctuary cada movimiento dura una fase (8 s). En el reto, cada acierto es un paso, así
   que la transición dura **3 s** (valor de juego). La respiración sigue a 8 s por fase (inhala y exhala), con
   el pecho que se abre 3° y los hombros que suben 4° al inhalar.
8. **Sostener cuesta menos.** Mientras sostiene una asana, el cuerpo se recalcula 20 veces por segundo, no
   en cada fotograma. Solo se mueve la respiración, un centímetro en 8 s.

No se ha portado: las cajas de la escápula y de la mano (nuestra figura no las tenía), las stats por parte del
cuerpo y la evaluación de calidad (`BodyPartStats`, `AsanaEvaluator`), el profesor (`TeacherNPC`), la imitación
(`MimicPoseSpell`) ni el mapeo a esqueletos de `.fbx` (`CreatureRig` con `Animator`).

## Rendimiento

Mismo recorrido antes y después: anillo, «Ir» al Saludo al Sol, 12 aciertos, perfil iPhone 13 de Playwright con
la CPU ×4. Para que la escena fuera la misma, el «antes» es la rama `integracion` con la misma cámara y Doménica
en la esterilla; solo cambia el esqueleto. El tiempo de JS se mide con `performance.now()` alrededor de la
actualización de la pose (`interior.poseTime`, `FrameTimer`). La máquina era compartida, con carga ~20 y
SwiftShader (3–4 fps), así que medias y máximos llevan pausas ajenas. La mediana es la cifra fiable. Chromium
redondea `performance.now()` a 0,1 ms.

| Medida | Antes | Después | Presupuesto |
| --- | --- | --- | --- |
| Llamadas de dibujo por fotograma | 113 / 128 | 114 / 129 | 600 |
| Triángulos por fotograma | 7,2 k / 8,0 k | 7,3 k / 8,0 k | 2000 k |
| Memoria JS | 45,2 MB | 48,1 MB | 350 MB |
| Cajas de la figura de Doménica | 19 | 20 | — |
| JS de la pose de Doménica, mediana | < 0,1 ms | 0,3 / 0,5 ms | — |
| JS de la pose de Doménica, media (con pausas ajenas) | 0,13 / 0,80 ms | 1,14 / 1,20 ms | — |
| JS de 4 gatos, 4 gallinas y 2 perros, mediana / media | 0 / 0,18 ms | 0–0,1 / 0,21–0,27 ms | — |

(Dos pasadas de cada uno. Las llamadas y los triángulos cambian según lo que se vea en cada pasada.) En Node,
sin limitar la CPU, una resolución del esqueleto cuesta 35 µs de pie, 60 µs en el rezo (IK de dos manos) y
110 µs en Uttanasana (IK al suelo, dos pasadas y apoyo). Con ×4 son unos 0,15–0,45 ms, lo que coincide con la
mediana medida. Todo queda muy por debajo del presupuesto: un fotograma de 33 ms se lleva menos del 2 %.

**Animales.** No usan el esqueleto. Las 19 articulaciones son de un cuerpo humano, y los gatos, perros y
gallinas son cuadrúpedos y aves con sus propios modelos de pocas piezas (`cat-model.ts`, `dog-model.ts`,
`hen-model.ts`), que no hacen asanas. Por coste cabría: 10 animales a 35–110 µs serían de 0,35 a 1,1 ms sin
limitar la CPU y de 1,4 a 4,4 ms con ×4. Sería 10 veces lo que cuestan hoy (0,2 ms) para nada que se vea. Si
algún día los animales necesitan IK (patas en un terreno), el IK de dos huesos y el apoyo sirven tal cual con
otra `SkeletonSpec`.

**Malla con piel.** Juntar las cajas de una figura en una sola malla con huesos de Three.js
(`SkinnedMesh`) bajaría a Doménica de 20 llamadas a 1. Hoy no hace falta: el anillo dibuja ~115 de 600. Se deja
como opción.

## Pruebas

- Unidad: `unity-axes.test.ts`, `skeleton.test.ts`, `two-bone-ik.test.ts`, `body-solver.test.ts` (las 48 asanas
  apoyadas en el suelo, cada alcance al suelo a ≤ 3,5 cm, palmas juntas, perro boca abajo en V),
  `asana-player.test.ts` (transición, el Saludo al Sol entero sin saltos, respiración), `asanas.test.ts`
  (datos) y `figure.test.ts` (misma figura, asana, vuelta a los gestos). Caso VID-24.
- Recorrido **PX-23** `yoga` (`tools/experiencia/yoga.mjs`): toques reales en un iPhone 13 con la CPU ×4,
  captura de cada asana junto a su texto de la ficha (`docs/screenshots/yoga-<nn>-<asana>-movil.png`),
  manos y pies en la esterilla y tiempo de JS de las poses.

## Pendiente

- **Datos de Cold Sanctuary aproximados** (su ficha lo dice: «el compañero afina en Unity»). Con el apoyo en el
  suelo se ve: en Ashtanga Namaskara el pecho no baja al suelo; en la zancada el pie de atrás queda alto, con
  la rodilla en el suelo; en Hasta Uttanasana los brazos se van un poco atrás con la extensión. Mejor
  corregirlo en Cold Sanctuary y volver a ejecutar `npm run asanas`.
- **Más sesiones como retos.** Surya Namaskara A, la Serie Primaria y el Yoga Namaskar ya están en los datos.
  Falta que sean retos de la esterilla, si el diseño lo quiere.
- La esterilla de la estación (Nodo 1) usa la hoja del reto sin figura en 3D.
