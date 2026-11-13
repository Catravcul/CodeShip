# Aterrizaje: a mano con indicadores, o por programa

Petición del diseñador: «Aterrizar la sonda me está resultando muy difícil, quizás le faltan los indicadores de x,y,z, se podría plantear que el aterrizaje también se pueda realizar por medio de reto, entonces tendríamos las dos opciones».

Hasta ahora los aterrizajes eran solo manuales y los viajes largos se programaban con retos ([viajes.md](viajes.md)). Ahora, al llegar a la **zona de aproximación** (menos de 450 m del suelo; el viaje comprimido deja la nave o la sonda a unos 300 m), hay dos caminos, para el módulo y para la sonda:

1. **A mano**, con los nuevos **indicadores de aterrizaje**.
2. **Por programa**: «Aterrizar con un programa» abre una cadena de cinco retos; resuelta, el ordenador de descenso baja solo hasta el sitio y ancla.

## Indicadores de aterrizaje

Un recuadro pequeño, en monoespaciada y con mucho contraste, solo en la zona de aproximación (arriba a la derecha en la cabina del módulo; en la columna de contexto de la consola de la sonda). Se oculta con un reto abierto (`body.in-duel`).

```
 ┌──────┐ ATERRIZAJE
 │  ┼ × │ X +3,2   vx +0,05
 │  ●   │ Y −1,0   vy −0,02
 └──────┘ Z 184 m  vz −1,20
          ∠ 12°    toca 40 s ✓
```

- **Marco local** (`flight/domain/landing-frame.ts`): Z es la vertical local (hacia fuera del asteroide) y Z = **altura de las patas sobre el suelo**; X es la derecha de la nave e Y su proa, tumbadas sobre el suelo. Con la panza al suelo X es A/D, Y es W/S y Z es R/F: cada número dice qué mando lo corrige. Si la nave está de lado (su derecha apunta arriba) se toma el otro eje horizontal.
- **Posición** X, Y respecto al sitio (el suelo bajo la nave al entrar en la zona); **velocidades** vx, vy, vz respecto al suelo, que gira (en Bennu el suelo se mueve unos 0,1–0,2 m/s); **inclinación** ∠ de la panza.
- **Cruz de puntería** (como la del módulo lunar Apollo): el sitio en el centro con su radio a trazos, la nave como punto, su deriva como raya y el **punto de toque previsto** (×) si sigue bajando como va: t = Z / −vz, toque = (X + vx·t, Y + vy·t). Las distancias se comprimen hacia el borde para que lo lejano siga en el dial.
- **Marca del sitio** en la escena: un anillo verde a trazos donde está el sitio (se ve en la cámara ventral).
- **Colores** contra los límites que ya aplica la física en `contact.ts` (los mismos para el módulo y para las anclas de rosca de la sonda):
  - toque: < 0,10 m/s de velocidad total relativa al suelo; choque con daño desde 1 m/s;
  - inclinación: ≤ 30°;
  - verde hasta 2/3 del límite, ámbar hasta el límite, rojo por encima (como las bandas de la pantalla de acople de Dragon);
  - la bajada (y la deriva) se juzgan contra la **velocidad segura** 0,10 + √(2·a·0,5·h), la que el RCS todavía puede frenar a la altura h con la mitad de su aceleración a de margen; a menos de 1 m del suelo vale el límite de toque tal cual;
  - el sitio: verde dentro de su radio (módulo 5 m, sonda 1,5 m), ámbar si el toque previsto cae dentro.

## Aterrizar por programa

**Cuándo**: en la zona de aproximación, libre (no acoplada ni posada), a más de 0,3 m del suelo, y sin otro viaje o aterrizaje comprimido en marcha (la cámara rápida es una sola para todo el mundo). La oferta es un botón «Aterrizar con un programa» (columna de contexto en la cabina; bajo los indicadores en la consola de la sonda).

**Ajuste** «Aterrizaje: preguntar / manual / por programa» (`landingMode()` y `setLandingMode()` en `src/ui/landing-readout.ts`, para el modal de ajustes generales; por defecto «preguntar»):

- preguntar: al entrar en la zona, un aviso dice «pósala a mano con los indicadores X, Y, Z o pulsa «Aterrizar con un programa»», y el botón va resaltado;
- manual: sin aviso; el botón queda discreto;
- por programa: al entrar en la zona con la vista del vehículo delante, se abre la cadena de retos sola.

**Los cinco retos** (`navigation/application/landing-chore.ts`), con los números reales del descenso:

1. *Ordenar* el programa: fijar el sitio bajo la nave, girar la panza al suelo (< 30°), ir a la velocidad del suelo, bajar como mucho a v m/s frenando con el RCS, a 3 m bajar a 0,04 m/s, al tocar anclar y apagar. Trampa: «bajar a v m/s hasta tocar el suelo».
2. *Completar* la deriva: el asteroide gira y el suelo bajo la nave pasa a g m/s; la velocidad lateral correcta es la del suelo.
3. *Predecir* la velocidad máxima de bajada: vMax = √(2·a·0,5·h) con la aceleración real del RCS.
4. *Reparar* el frenado final: «velocidad = 0,5» rebota; la buena es 0,04 m/s (< 0,10, las patas aguantan).
5. *Especificar* la orden del toque: «al tocar a menos de 0,10 m/s con la panza a menos de 30°, dispara las anclas de rosca (sonda) / ancla las patas (módulo), apaga los propulsores; si rebota, para y avísame».

**Los fallos hacen un programa menos preciso, no un choque** (valores de juego en `LANDING_PROGRAM`):

| Fallos | Toque | Apunta | Resultado |
| --- | --- | --- | --- |
| 0 | 0,04 m/s | al centro del sitio | se posa en el sitio |
| 1 | 0,07 m/s | 0,8 radios al lado | se posa, fuera del centro |
| 2 | 0,16 m/s | 1,6 radios al lado | **rebota** sin daño (0,10–1 m/s); «vuelve a programarlo o pósala a mano» |
| 3 | — | — | el programa no carga: mandos manuales |

**Guía de descenso** (`navigation/application/landing-guidance.ts`): solo RCS (con la panza al suelo el motor principal empuja de lado). El asistente de aterrizaje del ordenador de vuelo nivela la panza; la guía sigue una velocidad deseada: sobre el sitio a min(0,5 m/s, √(2·a·d), d/6 s), y hacia abajo solo con la panza a menos de 12° y dentro de un cono sobre el sitio, por la curva min(vMax, toque + √(2·a·0,5·(h − 3 m))), con los últimos 3 m a la velocidad de toque (una «puerta baja» como la de Apollo, a escala). Devuelve los mandos al anclar o tras un rebote. Módulo: vMax 1,5 m/s; sonda: 0,6 m/s (su RCS da unos 0,03 m/s²).

**Vista previa**: mientras baja, la ficha de viaje dice «Módulo/Sonda → aterrizaje en …» con fase, altura, velocidad y la cámara rápida; «Ver» abre la vista en directo y «Mando» toma el control. El descenso dura unos 30 s reales (cámara rápida fija, como mucho ×20: el módulo ≈×9, la sonda ≈×19).

## Cada paso se ve

Regla del diseñador: cada reto debe mostrar el paso correcto ocurriendo. Al acertar un paso de programar un **viaje** (módulo, nodriza o sonda) o un **aterrizaje**, su parte del plan aparece al momento en 3D (líneas, sin luces nuevas) con una línea de texto sobre la escena (`navigation/application/plan-sketch.ts`, dibujado en `adapters/three/plan-overlay.ts`; puerto `StepVisual` en `ui/step-visual.ts`, para unificarlo con los pasos visibles de las tareas):

| Paso | Viaje | Aterrizaje |
| --- | --- | --- |
| 1 | ruta trazada (tramos y km) | sitio fijado: anillo en el suelo y vertical |
| 2 | flecha de empuje (crucero, Δv) | flecha de la deriva del suelo |
| 3 | anillo de llegada (duración) | curva de descenso (velocidad permitida por altura) |
| 4 | punto de frenado y tramo de frenado | anillo del frenado final a 3 m |
| 5 | ruta en verde: plan completo | anclas listas |

Cerrar los retos lo borra; resuelto, el plan sigue 8 s mientras el piloto automático arranca.

## Fuentes

- Módulo lunar Apollo: el indicador de cruz (*cross-pointer*) daba la velocidad hacia delante y lateral en los ejes del propio módulo, y el piloto leía altura y velocidad de bajada por separado; Armstrong posó el Apollo 11 a mano buscando un sitio libre. [Apollo Lunar Surface Journal, aterrizaje del Apollo 11](https://www.hq.nasa.gov/alsj/a11/a11.landing.html), [índice del ALSJ](https://www.hq.nasa.gov/alsj/).
- Dragon y la ISS: la pantalla de acople da distancia, velocidad de cierre, desvíos X/Y/Z y ángulos con verde dentro de los límites; el simulador público de SpaceX la reproduce. [SpaceX ISS Docking Simulator](https://iss-sim.spacex.com/).
- Hera/Juventas: cubesat 6U-XL que intentará posarse en Dimorphos al final de su misión, con muy poco empuje (por eso la sonda baja a 0,6 m/s como mucho). [Hera, Juventas](https://www.heramission.space/hera-mission-juventas-cubesat).
- MASCOT (Hayabusa2): sin propulsores, se soltó desde unos 41 m y rebotó hasta pararse en Ryugu; un toque rápido en un asteroide rebota. [DLR, MASCOT](https://www.dlr.de/en/research-and-transfer/projects-and-missions/hayabusa2/the-mascot-lander).
- Philae (Rosetta): llevaba tornillos de hielo en las patas y arpones para anclarse; los arpones no dispararon y rebotó. Las anclas de rosca de la sonda son esa idea. [ESA, Rosetta](https://www.esa.int/Science_Exploration/Space_Science/Rosetta).
- Límites del juego en `src/modules/flight/domain/contact.ts` (0,10 m/s de toque, 1 m/s de choque, 30° de inclinación, con su justificación).

Consultado el 2026-11-13.

## Archivos

- Dominio: `flight/domain/landing-frame.ts` (marco local, lecturas, colores).
- Casos de uso: `navigation/application/landing-program.ts` (oferta, sitio, programa, estados, lecturas), `landing-guidance.ts`, `landing-chore.ts`, `plan-sketch.ts`.
- Interfaz: `src/landing.ts` (cabina y consola de la sonda), `src/ui/landing-readout.ts` y `aterrizaje.css`, `src/adapters/three/plan-overlay.ts`, `src/navigation.ts` (`openTripSheet` con su `StepVisual`).
- QA: VUE-06 a VUE-09, SON-05, NAV-07 y los recorridos PX-07 a PX-09 en [docs/qa/casos.md](../qa/casos.md).

Capturas del recorrido de QA (`docs/screenshots/aterrizaje-*-movil.png` en iPhone 13 y `-escritorio.png` a 1280×800; PX-07 a PX-09):

1. `aterrizaje-1-viaje-paso-ruta-movil`: un paso del viaje bien respondido dibuja la ruta.
2. `aterrizaje-2-sonda-zona-movil`: la sonda a 300 m con los indicadores y la oferta.
3. `aterrizaje-3-sonda-reto-sitio-movil`: primer reto del aterrizaje, el sitio fijado.
4. `aterrizaje-4-sonda-bajando-movil`: el programa vuela; ficha de viaje.
5. `aterrizaje-5-sonda-posada-movil`.
6. `aterrizaje-6-modulo-indicadores-{movil,escritorio}`, `aterrizaje-7-modulo-ventral-*`, `aterrizaje-8-modulo-demasiado-rapido-*`.
7. `aterrizaje-9-modulo-reto-escritorio`, `aterrizaje-10-modulo-bajando-escritorio`, `aterrizaje-11-modulo-posado-escritorio`: el módulo aterrizado por programa.
