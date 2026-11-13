# Subyugación en tres fases: sonda, nave y traje

Entrar en la mente de un asteroide (el duelo de código) ya no es un único duelo desde el módulo de
aterrizaje. Como en Artemis/Apollo hay cuatro vehículos: la **sonda** (sin tripulación), el
**módulo de aterrizaje** (el Explorer, con Doménica dentro), la **nave de viaje** (la nodriza con
anillos) y la **estación**. La subyugación tiene tres fases, cada una más cerca:

1. **Sonda**: se posa la sonda sobre el asteroide y se entra en su mente a través de ella.
2. **Nave**: se posa el módulo de aterrizaje, con Doménica a bordo, y se entra desde la cabina.
3. **Traje**: Doménica sale con el traje y **se tumba** sobre el asteroide, con todo el cuerpo en contacto.

«Cuanto más contacto, más poder mental, pero es arriesgado acercarse tanto a un asteroide que no se
ha domado un poco antes.» El primer encuentro es el más peligroso porque el asteroide no la conoce:
por eso va la sonda, como medida de seguridad para la piloto. Cuando un encuentro sale bien, la
confianza del asteroide sube: es menos peligroso y abre niveles más profundos de su mente.

## 1. Dominio: `Rapport` (confianza por asteroide)

`src/modules/subjugation/domain/rapport.ts`

- `Rapport`: fases hechas (0–3), confianza 0..1, fallos. `next` es la única fase que se ofrece: la
  fase N+1 se abre solo cuando la fase N salió bien **en ese asteroide** (`canAttempt`).
- `RapportBook`: un `Rapport` por asteroide, compartido por la expedición, el mapa y las misiones.
- `Expedition` (`src/modules/expedition/application/expedition.ts`) lleva el `RapportBook` y los
  puertos `contacts` (`probeParkedOn`, `suitLying`, `suitOutside`). `canStartStage(stage)`:
  - `sonda`: la sonda está posada en el asteroide objetivo;
  - `nave`: el módulo está anclado y Doménica dentro (`canStartDuel`, como antes);
  - `traje`: el módulo está anclado y Doménica está tumbada fuera.
- `isPersuaded(id)` significa ahora **subyugado = las tres fases hechas**. Es lo que leen las
  misiones de Nevaeh (`missions.update`), el mapa (insignia «Subyugado») y la nano_net (Bennu solo
  puede ser núcleo una vez subyugado: `nano.subjugate` se llama al completarse la fase 3).

### Duelo de cada fase (valores de juego)

Se parte del perfil del asteroide (`duelProfileFor`: masa y riqueza) y `stageDuelProfile` lo ajusta:

| | Sonda | Nave | Traje |
|---|---|---|---|
| Conceptos | base | base + 2 | base + 4 (máx. 10) |
| Bloques máx. | base | base + 1 | base + 2 |
| Ideas para persuadir | base − 1 (mín. 2) | base | base + 1 |
| Distractores | según el asteroide | según el asteroide | siempre |
| Paciencia | base − 1 + confianza/0,25 (mín. 2) | ídem | ídem |

Más hondo, conceptos más difíciles; pero la paciencia (el margen para fallar) crece con la confianza
ganada: con confianza 0 la sonda tiene una vida menos que el perfil; tras la fase 2 (confianza 0,55)
el traje tiene una más.

| Valor de juego | |
|---|---|
| Confianza que da cada fase | sonda 0,25 · nave 0,30 · traje 0,45 (suman 1) |
| Confianza que quita un fracaso | 0,10 (nunca por debajo de 0) |
| Peligro (multiplica el daño de su ira) | 1 − 0,75 × confianza |

### Lo que da cada fase

- **Sonda**: el escaneo (su composición, de primera mano) y confianza. Nada en la bodega.
- **Nave**: confianza y el 40 % de la bodega (200 de 500 kg) con sus materiales reales.
- **Traje**: el resto de la bodega, confianza plena y la subyugación: puede ser núcleo de la
  nano_net y cuenta para las misiones de Nevaeh.

### Si sale mal

El asteroide se enfada (`aggressive`) y su confianza baja 0,1. Los ataques son del módulo de la ira
([poderes-ira.md](poderes-ira.md), `src/modules/asteroid-wrath`): `Expedition.startDuel` pone
`duelPhase` (1 sonda, 2 módulo, 3 traje) y un fracaso llama a `wrath.duelFailed(id, fase)`; ningún
duelo nuevo empieza en ese asteroide hasta que `wrath.canRetry(id)` (se ha calmado). La sonda y
Doménica con el traje están registradas como objetivos de la ira (`SubjugationUi`):

- **Sonda** (`kind: "sonda"`, activa fuera de su bahía): los impactos le quitan casco, la radiación
  se acumula en su electrónica (se pierde al pasar la tolerancia del módulo de la ira) y el agarre
  gravitatorio la arranca del suelo. Además el asteroide la sacude de la superficie (0,4 m/s). Hay
  que **rescatarla** (llevarla a la bahía) o **abandonarla**.
- **Módulo**: como antes, lo sacude y hay que huir fuera de su alcance.
- **Traje** (`kind: "traje"`, activo mientras está fuera): al fallar la lanza a 0,25 m/s (más que la
  velocidad de escape de Bennu); el cable la sujeta y el torno la devuelve a la escotilla. Los
  impactos dañan el traje (con un 30 % de daño vuelve sola a la escotilla), la radiación pasa por
  ~0,3 g/cm² de aluminio equivalente (estimación) y el agarre la despega del suelo. Mientras está
  fuera el módulo no se sacude; en cuanto entra, el asteroide lo sacude y hay que huir.

Sin el módulo de la ira (pruebas) queda el modelo antiguo de escombros (`Aggression`), multiplicado
por el peligro (1 − 0,75 × confianza).

## 2. La sonda sin tripulación

`src/modules/ship/data/probe.ts` (diseño), `src/modules/subjugation/application/probe-ops.ts` (uso).

Una sonda de la clase de OSIRIS-REx (2 t) no cabe en la nave de viaje. El modelo es **Juventas**,
uno de los dos cubesats 6U-XL que lleva Hera a Didymos y que intentará posarse en Dimorphos.

| Pieza | Dato | Fuente |
|---|---|---|
| Bus 6U-XL tipo Juventas | 37 × 23 × 10 cm, 12 kg (se toma entero, con su gas frío, como margen) | [Hera: Juventas](https://www.heramission.space/hera-mission-juventas-cubesat), [phys.org](https://phys.org/news/2023-11-esa-hera-mission-cubesats-theyll.amp) |
| Propulsión Aerojet MPS-120XW (CHAMPS) | 4 motores de hidracina; 2,79 N (inicio de la purga) a 0,26 N (final) por motor; < 3,2 kg húmedo, < 2,4 kg seco; 20 × 10 × 11,35 cm; < 1 W en operación | [hoja MPS-120XW](https://www.environmental-expert.com/products/model-mps-120xw-cubesat-high-impulse-adaptable-528975), [cuatro motores](https://www.aerospacemanufacturinganddesign.com/news/aerojet-rocketdyne-3d-printed-rocket-121814), [satcatalog](https://www.satcatalog.com/component/mps-120-2u) |
| Hidracina | 0,8 kg = 3,2 − 2,4 kg (derivado) | ídem |
| Isp | 190 s, hidracina en motores pequeños | [LFPS, tabla 1](https://core.ac.uk/download/334990715.pdf) |
| Batería | 200 Wh como MASCOT (unas 16 h; MASCOT trabajó 17 h 7 min en Ryugu). Masa 1,3 kg: estimación a ~150 Wh/kg | [DLR: MASCOT](https://www.dlr.de/en/research-and-transfer/projects-and-missions/hayabusa2/the-mascot-lander) |
| Patas con anclas de rosca | 0,3 kg, valor de juego (idea de Philae) | — |
| Contraste | Lunar Flashlight, otro 6U con monopropelente: 14 kg cargado, 11,5 kg sin cargar | [SSC22-II-06](https://ssdl1.gatech.edu/sites/default/files/ssdl-files/papers/conferencePapers/SSC22-II-06.pdf) |

Resultado (`Ship.create(probeDesign())`): 16,0 kg en seco, 16,8 kg cargada, **Δv ≈ 91 m/s**,
0,062 m/s² con los cuatro motores a 0,26 N y 0,031 m/s² de traslación. El consumo medio (bus 12 W
estimado a partir de MASCOT, más el MPS < 1 W) da **unas 15 h de batería**; se carga en la bahía.

Simplificaciones (valores de juego): el empuje usa el extremo bajo de la purga (0,26 N), para que la
sonda dé siempre lo que promete; el RCS reparte el mismo motor en las 24 toberas desacopladas de
todas las naves del juego (`buildRcsLayout`); la masa de los motores está en la del módulo.

**Retardo de las comunicaciones**: a 1,35 km la luz tarda 4,5 µs (`PROBE_LINK_DELAY_S`): el mando a
distancia es instantáneo. Hera releva a Juventas por un enlace en banda S.

### Cómo se usa (`ProbeOps`)

- **Estibada**: va en su bahía, encima del nodo de proa de la nodriza, en el lado opuesto al
  puerto del módulo de aterrizaje (`PROBE_BAY_BODY`, valor de juego). La sigue en los viajes.
- **Lanzar**: los muelles la sueltan a 0,08 m/s hacia arriba (como los del acople).
- **Vuelo a distancia**: su propio `FlightComputer` con su diseño (mismo modelo de vuelo, asistente
  de aterrizaje, gravedad de la región, rocas y límite de la zona). Comparte el reloj de la misión
  (`startTimeS`) para que los asteroides giren igual para todas las naves. Cámara de persecución.
- **Posada**: se ancla con las mismas reglas de contacto que el módulo (≤ 0,10 m/s, ≤ 30°).
  Desde aquí, «Entrar en su mente · fase 1».
- **Recuperar**: el brazo de la nodriza la agarra a menos de 10 m de la bahía y a menos de
  0,1 m/s (como el Canadarm2 con las naves de carga); vuelve cargada.
- **Abandonar** o **perdida** (escombros, batería agotada): la nodriza lleva **dos** (como Hera
  lleva Juventas y Milani). Al atracar en la estación se reponen (regla de juego).

La sonda trabaja siempre sobre el objetivo actual de la expedición.

## 3. Fase 2: el módulo de aterrizaje

Es el aterrizaje y el duelo de siempre, con el botón «Entrar en su mente» solo cuando la fase 1 ya
está hecha en ese asteroide. El cartel del módulo anclado dice qué toca: «primero la sonda, desde el
puente de la nodriza», «entra en su mente (fase 2)» o «sal con el traje y túmbate (fase 3)».

## 4. Fase 3: tumbarse con el traje

`src/eva-mode.ts`, `src/modules/eva/application/eva.ts`

Fuera, agarrada al regolito, el botón **«Tumbarse sobre el asteroide · fase 3»** (tecla T) la tumba
boca abajo con brazos y piernas abiertos (`SuitFigure.lie`, el muñeco de cubos con la mochila hacia
arriba y una respiración lenta). Si la fase 3 está en oferta, empieza el duelo; si no, solo se tumba.
«Levantarse» la pone otra vez a gatas.

**EVA en otros asteroides**: ya no es solo Bennu. `Eva.retarget` usa la μ, el giro y la superficie
real (la misma función que el aterrizaje: `Asteroid.surfaceRadius`) del objetivo. En los miembros de
Nueva Polana (densidad supuesta de Bennu) la velocidad de escape va de 0,5 a 1 m/s, así que el gateo
a 0,15 m/s sigue siendo seguro. Las muestras con resultados de laboratorio solo existen en Bennu;
en los demás no hay puntos de muestra. Límite: la forma de los miembros es procedimental (no hay
modelos de forma reales).

## 5. Interfaz (móvil primero)

- **Puente de la nodriza**: botón «Sonda» en la barra de estado → consola de la sonda a pantalla
  completa: cámara, telemetría (distancia, cierre, Δv, hidracina, batería, casco, bahía), las fases
  del asteroide, botones (lanzar, aterrizaje auto, entrar en su mente, recuperar, tiempo ×1/10/100,
  abandonar) y los mandos táctiles (o el teclado).
- **Ficha del mapa**: bloque «Subyugación» con las tres fases (hecha / siguiente / cerrada), la
  confianza y el siguiente paso (`rapportCardHtml`, gancho `NavMap.rapportMark`).
- **HUD de cabina**: chip con el asteroide, la confianza, las tres fases y el siguiente paso cuando
  está a menos de 6 km (`RapportChip`).
- **Duelos**: el título dice la fase («Mente de 101955 Bennu · fase 1 · sonda»).

## 6. Pruebas

- `subjugation/domain/rapport.test.ts`: orden de las fases, confianza, peligro, perfiles.
- `subjugation/application/probe-ops.test.ts`: la sonda real (masa, Δv, empuje), estiba, lanzamiento,
  aterrizaje, ira (sacudida, escombros, radiación, pérdida y relevo), brazo, reposición, batería.
- `expedition/application/expedition.test.ts`: duelo por fases, recompensas, ira por fase, aviso a la ira con la fase y espera a que se calme.
- `eva/application/eva.test.ts`: tumbarse, ser lanzada y recogida por el cable, EVA en otro asteroide.

Capturas (móvil iPhone 13 y escritorio 1280×800): `docs/screenshots/subyugacion-1*` (sonda: puente,
lanzada, aproximación, posada, duelo, resultado, confianza en el mapa, recuperada),
`subyugacion-2*` (módulo: mapa, aproximación, anclado, duelo, resultado, siguiente paso) y
`subyugacion-3*` (traje: fuera, tumbada, duelo, resultado).

## 7. Preguntas abiertas

- ¿La estación debería fabricar sondas (plano y materiales) en vez de reponerlas gratis?
- ¿Volver a la bahía a mano desde 1,3 km es demasiado largo? Se podría añadir un «volver a la
  nodriza» automático con la guía de viaje.
- La confianza no decae con el tiempo; ¿debería olvidarte un asteroide si pasan meses?
- Las fases 2 y 3 en Bennu podrían dar muestras extra o lecturas del interior (radar como JuRa).
