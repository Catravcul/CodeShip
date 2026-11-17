# Módulo lunar Apolo y Juventas: los vehículos reales de la jugadora

Decisión de Berón (2026-11-16): «módulo de aterrizaje: módulo lunar Apolo, ~4,3 t en seco» y «sonda:
Juventas, 12 kg; el plano de 30 kg desaparece». Es el punto 4 de la fase 1 de
[naves-reales.md](naves-reales.md) §3. Cada número lleva su fuente y una etiqueta: **real**,
**en-desarrollo**, **licencia** o **ficción**. Lo único de ficción que queda es entrar en la mente
de los asteroides.

Código: `src/modules/ship/data/apollo-lm.ts`, `src/modules/ship/data/probe.ts`,
`src/modules/life-support/data/lm-ecs.ts`, `src/modules/lander-cabin/data/cabin.ts`,
`src/modules/station/domain/vehicle-catalogue.ts` (montaje).

## Módulo lunar Apolo (LM)

Fuente principal: [Apollo Lunar Module](https://en.wikipedia.org/wiki/Apollo_Lunar_Module). La
versión estándar es la de Apolo 9–14, salvo donde se indica.

| Dato | Valor | Etiqueta |
|---|---|---|
| Masa en seco | 4280 kg (4920 kg el extendido de Apolo 15–17) | real |
| Masa al lanzar | 15 200 kg | real |
| Etapa de ascenso en seco | 2150 kg | real |
| Etapa de descenso en seco | 2130 kg (4280 − 2150) | real, derivado |
| Propelente | DPS 8200 kg, APS 2353 kg, RCS 287 kg | real |
| Alto y anchos | 7,04 m de alto, 4,22 m sin patas, 9,4 m con las patas | real |
| Motor de descenso (DPS) | 45 040 N, regulable del 10 al 60 % (y fijo a pleno), Isp 311 s | real |
| Motor de ascenso (APS) | 16 000 N fijos, Isp 311 s | real |
| RCS | 16 toberas R-4D de 440 N en cuatro quads, Isp 290 s | real |
| Cabina | 6,7 m³ presurizados, 4,5 m³ habitables, 2,34 m de alto, 1,07 m de fondo delante | real |
| Atmósfera | 100 % O₂ a 33 kPa (4,8 psi) | real |
| Escotilla delantera | 0,81 × 0,81 m | real |
| Radio de los quads del RCS | 2,2 m | estimación |
| Adaptador de acople | NDS (norma IDSS), 340 kg | licencia |

### Qué se adapta (`LM_ADAPTATIONS`, se ve en la ficha del catálogo)

- **Las dos etapas no se separan** (real). En un asteroide la gravedad es millonésimas de la lunar:
  el motor de descenso basta para volver. El LM podía volar entero: Apolo 13 usó el de descenso para
  volver.
- **El APS no se enciende** (real). Va a bordo con su masa, como motor de aborto en la ficha.
- **Un solo depósito de propelente** (licencia). El LM tenía tanques de descenso, de ascenso y del RCS.
- **MMH/NTO en vez de Aerozine 50** (licencia). La estación produce MMH/NTO, y los dos rinden casi igual
  (311 s).
- **Adaptador IDSS en la escotilla del techo** (licencia). El LM se acoplaba con sonda y cono; Starship
  y la ISS usan la norma IDSS.
- **Toberas del RCS a la altura del centro de masas** (licencia), para que trasladar no lo haga girar.
- **Se posa con el RCS** (real). Al 10 % mínimo, el DPS empuja 4,5 kN, unos 0,3 m/s², contra los
  ~6 µm/s² de Bennu. Para tocar suelo basta el RCS, con 0,06–0,12 m/s².

### Vuelo en cuerpos pequeños

- El motor principal empuja hacia arriba, a través de la panza. Por eso el piloto automático
  (`thrustAxis`) gira la panza hacia donde quiere frenar, no la proa.
- El RCS del LM son 16 toberas compartidas (`buildQuadRcsLayout`): cada una traslada y gira a la vez,
  y la mezcla se satura como en el LM real.
- El programa de aterrizaje (`LANDING_PROGRAM.craft.modulo`) apunta a un sitio de 5 m. Baja a 1,5 m/s
  como máximo y toca entre 0,04 y 0,16 m/s según el fallo; por debajo de 0,1 m/s las patas anclan.
- Las indicaciones y lecturas salen de la masa y del RCS del LM.

### Cabina

- La cabina es la del LM a tamaño real (`LANDER_CABIN_REAL`):
  - 1,6 m de suelo de ancho (estimación) y 1,79 m de fondo, que con 2,34 m de alto dan 6,7 m³;
  - delante, los puestos de pie del comandante (pilotar) y del piloto del LM (la consola de la mente,
    que es ficción);
  - la escotilla delantera, baja entre los dos;
  - detrás, la cubierta del motor de ascenso, con la escotilla de acople encima;
  - el panel del ECS a babor y la esterilla a estribor.
- La capa de presentación (`src/core/presentation.ts`) la dibuja:
  - con «Separación: Amplia», `spreadLayout` abre todo el plano por un mismo factor (`CABIN_SPREAD`,
    unos 2,3 a escala 1,5) hasta que las máquinas quedan a 2 m;
  - con «Real», queda como el LM.
- Nada se coloca a mano por máquina.
- La vista de pilotaje es esta misma cabina, de pie en el puesto del comandante: ventana triangular, ventana de acople con el COAS y los paneles 1–16 ([cabina-lm.md](cabina-lm.md)).

### Soporte vital propio (ECS de circuito abierto)

Fuente: [NASA TN D-6724](https://ntrs.nasa.gov/api/citations/19720013195/downloads/19720013195.pdf).
El cartucho sale del [Smithsonian](https://dashboard.si.edu/object/cartridge-lithium-hydroxide-canister-lunar-module:nasm_A20020434000).

| Dato | Valor | Etiqueta |
|---|---|---|
| O₂ de descenso | 48 lb (21,8 kg) | real |
| O₂ de ascenso | 2 × 2,4 lb (el escaneo dice «2,_ lb») | licencia |
| Agua | 332 lb de descenso + 2 × 42 lb de ascenso | real |
| Cartucho de LiOH | 1,2 kg; unos 0,83 kg de CO₂ por cartucho | real / estimación |
| Baterías (Apolo 15–17) | (5 × 415 + 2 × 296) Ah × 30 V ≈ 80 kWh | real |
| Autonomía | 75 h (LM extendido) | real |
| Represurizar tras una EVA | ≈ 2,9 kg de O₂ (6,7 m³ a 33 kPa) | derivado |

- `OpenLoopEcs` gasta el O₂, llena el cartucho de CO₂ y evapora agua en el sublimador. Solo cuenta a
  quien va en el módulo.
- Avisa cuando el cartucho se satura o cuando el CO₂ sube de 5,3 mmHg.
- En el panel del ECS se cambia el cartucho; entonces sale la tarea «Cambiar el cartucho de LiOH del
  módulo».
- Acoplado, el anfitrión lo repone (licencia: el LM no repostaba).
- Salir a EVA vacía la cabina y cuesta O₂.

## Juventas (la sonda)

Fuentes:
- [la web de Hera](https://www.heramission.space/hera-mission-juventas-cubesat);
- [SpaceOps 2025](https://publications.spaceops.org/2025/download_by_id.php?id=0005);
- [EPSC 2021](https://meetingorganizer.copernicus.org/EPSC2021/EPSC2021-750.html);
- [el aterrizaje](https://smallsatnews.com/2024/03/29/esa-radar-journey-to-centre-of-heras-asteroid-with-juventas-cubesat/);
- [el GomSpace NanoProp](https://gomspace.com/UserFiles/Subsystems/flyer/Flyer_NanoProp_6DOF.pdf).

| Dato | Valor | Etiqueta |
|---|---|---|
| Masa | 12 kg húmeda (10,95 kg en SpaceOps 2025) | real |
| Tamaño | 6U-XL, 37 × 23 × 10 cm | real |
| Propulsión | 8 propulsores de gas frío de 1 mN, Isp 50 s | real |
| Butano | 122 g (la carga de un NanoProp) | licencia: la ESA no la publica |
| Orientación | 4 ruedas de reacción | real; en el juego no gastan gas |
| Radar JuRa | 60 MHz, < 1,3 kg, cuatro antenas de 1,5 m | real |
| Gravímetro GRASS | < 380 g, mejor que 0,002 mGal | real |
| Batería | 200 Wh, como MASCOT | estimación |
| Toma de contacto | «centímetros por segundo»: 2 cm/s | real |
| Alcance del enlace | < 60 km de la nave madre | real |

- Sin anclas: Juventas toca, rebota y se asienta. `settle()` calcula los rebotes con restitución 0,5
  (licencia: calculado, no volado) y la pantalla de aterrizaje los cuenta.
- Su Δv es de unos 5 m/s, así que sus viajes duran horas y se juegan en cámara rápida (lapso de 100
  a 400).
- Su física corre a 12 Hz (`PROBE_STEP_S`), igual de exacta con fuerzas de 1 mN.
- La nodriza lleva dos, como Hera lleva dos cubesats.
- La Bishop la guarda y la despliega (`BISHOP_PAYLOADS`).

## Montaje del catálogo

`assemblyPlan` sustituye la comprobación por `HANGAR_SIZE`. Cada vehículo se monta donde lo haría la
ISS:

| Sitio | Límite real | Qué va | Cómo se suelta (`RELEASE_STEPS`) |
|---|---|---|---|
| Bishop | 3,99 m³, 2,014 m × 1,8 m | sondas pequeñas (Juventas) | Canadarm2 saca la Bishop, el muelle la suelta y la Bishop vuelve |
| JEM-EF | 500 kg por puerto, 1,85 × 1,0 × 0,8 m ([eoPortal](https://www.eoportal.org/satellite-missions/iss-jem-ef)) | cargas expuestas pequeñas | el brazo de Kibo, luego Canadarm2, y se suelta |
| Canadarm2 en un CBM | 116 t, 17,6 m | lo que no es una estación y cabe (el LM, DART…) | 16 pernos, a 10 m bajo la estación, se abre el efector |
| Dique seco | — | lo demás (Starship) | **licencia**: el dique no existe en la ISS |

- Lo montado espera en su sitio y se dibuja allí desde la Cupola (`VehicleYard.parked`).
- «Botar» o «Desplegar» lo suelta en 3D siguiendo esos pasos.
- El brazo rechaza un atraque de más de 116 t.

## Decisiones abiertas

- ~~¿La vista de pilotaje del LM debe ser su cabina real?~~ Sí (Berón, 2026-11-17: «si la cabina realista es
  con ventanas triangulares y tal se debe hacer así»): [cabina-lm.md](cabina-lm.md).
- ¿Un LM montado en el catálogo debe sustituir al módulo de la jugadora (uno de repuesto) o solo
  soltarse?
- La masa del O₂ de ascenso (2 × 2,4 lb) sale de un escaneo ilegible: falta confirmarla.
