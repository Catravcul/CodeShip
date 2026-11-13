# Codeship

Juego web de pilotaje espacial realista. El jugador vuela en primera persona hasta asteroides reales, se enfrenta a su «mente» resolviendo código y, si gana, el asteroide cede sus recursos. Comparte mundo con Cold Sanctuary.

Esta es la versión 2, rehecha desde cero con Three.js y TypeScript. El borrador anterior (React 17) sigue en las ramas `develop`, `top_nav` y `recuperar-onedrive`.

**Preview jugable:** https://catravcul.github.io/CodeShip/ (rama `gh-pages`; se publica con `npx vite build --base=./` y se sube la carpeta compilada a esa rama).

El juego empieza en el cinturón interior, en la familia de Nueva Polana, de donde probablemente viene Bennu: el Sol y los planetas se ven con su tamaño y brillo reales calculados con los elementos orbitales de JPL, y alrededor hay asteroides reales de la zona y miles de rocas, en una zona de vuelo de 40 km. Detalles y qué se comprime en [docs/research/sistema-solar.md](docs/research/sistema-solar.md).

A bordo, Doménica cuida un huerto, una cubierta de cultivo que hace el viaje autosuficiente, gatos, chihuahuas y gallinas libres que pueden llegar a ser una familia, y recibe por radio las cartas de Nevaeh y las llamadas de Kushal. Todo se hace con retos de código. Diseño en [docs/design/vida-a-bordo.md](docs/design/vida-a-bordo.md).

Un asteroide persuadido puede convertirse en **núcleo de la nano_net**, la red de nodos que da energía, protección y velocidad. Se le programa por etapas (generar, mover y conectar nodos, enlazar con otra red) y se repara aterrizado en él, siempre con retos de código. Diseño en [docs/design/nano-net.md](docs/design/nano-net.md).

La **estación espacial** Nueva Polana (se entra acoplando el módulo de aterrizaje a su puerto: **Entrar en la estación**) recibe la roca de los asteroides persuadidos, la refina y, con planos, fabrica piezas y sondas en cadenas de retos de código. Las piezas esperan en su hangar hasta que se montan en la bahía. Diseño en [docs/design/estacion.md](docs/design/estacion.md).

## Arrancar

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests del dominio (Vitest)
npm run lint:arch  # comprueba que el dominio no dependa de Three.js ni del DOM
npm run qa:check   # casos de QA, registro y tests cuadran (docs/qa/README.md)
npm run build
```

## Controles

| Acción | Tecla |
| --- | --- |
| Avanzar / retroceder (RCS) | W / S |
| Lateral (RCS) | A / D |
| Subir / bajar (RCS) | R / F |
| Cabeceo / guiñada | Flechas |
| Alabeo | Q / E |
| Motor principal | Espacio |
| Asistente de rotación | T |
| Cambiar cámara (cabina, ventral, trasera, exterior, acople, nodriza) | C |
| Desacoplar / asistente de acople | K |
| Centrar la vista | V |
| Acelerar el tiempo (×1, ×10, ×50) | X |
| Bahía de la nave (abrir / cerrar) | B |
| Mapa de navegación (abrir / cerrar) | M |

En la cabina, el mando **Mirar** (o arrastrar la pantalla) gira la cabeza del piloto para ver por las ventanas laterales; la cámara trasera muestra lo que queda detrás de la tobera y la exterior orbita alrededor de la nave. Los RCS empujan poco (≈0,07 m/s² con 670 kg), así que el polvo espacial y la línea de propulsores del HUD muestran que la nave se mueve; el motor principal da ≈0,7 m/s². El tiempo acelerado solo actúa sin maniobrar y a más de 150 m del asteroide.

La partida empieza con el módulo de aterrizaje **acoplado** bajo la **nave nodriza**, que lleva los anillos de 1 g, el huerto y los camarotes, y se mueve entre asteroides con 18 propulsores eléctricos X3 alimentados por un reactor de 2 MWe. **Desacoplar** (K) suelta el módulo para volar a Bennu. Para volver, el botón **Acople** activa el asistente, que se acerca al puerto dentro de los límites IDSS (0,05–0,10 m/s, 0,10 m, 4°). Diseño en [docs/design/nave-nodriza.md](docs/design/nave-nodriza.md).

En el móvil hay mandos táctiles. Con el módulo de aterrizaje acoplado a la nodriza, el botón **Entrar en la nave de viaje** lleva por la escotilla de la espina a la nodriza, y de ahí al módulo habitable: Doménica se ve en tercera persona (el botón **Vista** pasa a primera persona), se camina con el mando **Caminar** o WASD y se mira con el mando **Mirar**, las flechas o arrastrando. **Tareas** lista lo que hay que hacer a bordo; cada tarea es una cadena de retos de código (ver [vida-a-bordo.md](docs/design/vida-a-bordo.md)). El módulo va en un anillo que gira a 4 rpm y da 1 g. Un ascensor sube por el radio hasta el eje, donde se flota (▲▼ o R/F) y se llega a la escotilla de atraque, que baja al módulo de aterrizaje o pasa a la estación si la nodriza está atracada ([gravedad.md](docs/design/gravedad.md)). El módulo tiene huerto, cocina, molino, laboratorio de carne cultivada, enfermería, el panel de la mente de la nave, la consola de navegación (abre la página NAV del puente: mapa, viajes, misiones y nano_net), un rincón de ejercicio (esterilla de yoga, cinta, bici y máquina de fuerza), el camarote de Doménica y el aseo; el gallinero está en la cubierta de cultivo. En la espina sin gravedad están el taller, el almacén y la esclusa con los trajes. Cómo se ha ordenado cada nave y con qué referencias reales: [interiores.md](docs/design/interiores.md).

La **bahía de la nave** está en la estación: su consola en el Nodo 2, la tecla B dentro de la estación o el botón de la pestaña Hangar de la pantalla de la estación. Qué se puede hacer en cada vehículo: [docs/design/accesos.md](docs/design/accesos.md). Muestra la nave por fuera: se orbita arrastrando, con el mando **Orbitar** o con las flechas, y la rueda acerca o aleja. Tocar una pieza en 3D o en la lista abre su ficha con datos reales y acciones. Las piezas que hay que revisar laten en naranja (aviso) o en rojo (crítico). Reparar, cuidar y cambiar el motor, el RCS o los tanques son retos de código, y la maqueta cambia con cada pieza montada (ver [bahia-de-la-nave.md](docs/design/bahia-de-la-nave.md)). **Volver** o Esc devuelve a donde estabas.

Con la nave **anclada**, **Salir de la nave** lleva a Doménica a Bennu con un traje EMU: ponérselo es una cadena de retos y fuera avanza agarrada a las rocas (mando **Moverse** o WASD), se suelta con **Impulso** (Espacio), baja con el SAFER (**Bajar**, F), recoge el cable de 25,9 m (R), toma muestras (Intro) y vuelve con **Volver a la nave** (B). En Bennu la velocidad de escape es ≈0,2 m/s y un paso normal la lanzaría al espacio. Diseño en [docs/design/paseo-espacial.md](docs/design/paseo-espacial.md).

**Mapa** (botón de la barra de vuelo o M) muestra la zona en un esquema 3D con Bennu y los seis asteroides reales de Nueva Polana; la ficha de cada uno trae sus datos reales, el duelo que espera y el coste del viaje. **Programar viaje** abre una cadena de retos con los números reales del salto (ordenar la maniobra, completar el Δv, predecir el tiempo, reparar la línea de frenado, especificar la orden); resuelta, la nodriza lleva el módulo acoplado hasta su punto de aparcamiento y el módulo sigue solo con su piloto automático hasta 300 m, donde devuelve los mandos para aterrizar a mano. Cualquier asteroide de la lista se puede aterrizar y persuadir. Diseño en [docs/design/navegacion.md](docs/design/navegacion.md).

## Arquitectura

Monolito modular con arquitectura hexagonal. Cada módulo tiene `domain/` (reglas puras, sin motor), `application/` (casos de uso) y `data/` (catálogos con fuentes). Los adaptadores (Three.js, teclado, HUD) viven fuera y dependen del dominio, nunca al revés; `npm run lint:arch` lo comprueba en CI.

```
src/
  core/            núcleo compartido: Vec3, Quat, unidades, valores con fuente
  modules/
    ship/          nave como composición de componentes reales; masa, inercia, delta-v, cambio de piezas
    ship-bay/      bahía de la nave: estado por pieza y reglas de atención
    flight/        sólido rígido 6DOF newtoniano, ordenador de vuelo a 120 Hz fijo
    celestial/     asteroides reales, órbitas (Kepler), cielo visto desde la zona y zona de vuelo
    navigation/    mapa, destinos, retos del viaje y piloto automático (módulo de aterrizaje y nodriza)
    mothership/    nave nodriza: presupuesto de masas, propulsión eléctrica, acople con límites IDSS
    nano-net/      núcleos de la nano_net hechos de asteroides: etapas, nodos, cobertura, averías
    station/       estación espacial: materiales, refinería, planos, colas de fabricación y hangar
  content/         generadores procedurales deterministas (forma de asteroides)
  adapters/three/  escena, cabina, malla del asteroide, estrellas
  adapters/input/  teclado → orden de empuje
  ui/              HUD
```

Reglas: TDD en `domain/` y `application/`; cada valor real lleva su fuente (`sources` o `Sourced<T>`); la simulación es determinista y se prueba sin renderizar.

## Datos reales usados

| Elemento | Valores | Fuente |
| --- | --- | --- |
| Motor principal R-4D | 490 N, Isp 312 s, 3,6 kg, MMH/NTO | [Wikipedia](https://en.wikipedia.org/wiki/R-4D) |
| RCS MR-106L | 22 N (10–34 N), Isp 228–235 s, 0,59 kg, hidracina | [SatCatalog](https://satcatalog.com/component/mr-106l-22n) |
| Motor MR-104H (pieza de cambio) | clase de 510 N (201–554 N), Isp 223–237 s, 2,4 kg, hidracina | [SatCatalog](https://satcatalog.com/component/mr-104h-510n/) |
| RCS MR-111G / MR-107T (piezas de cambio) | clase de 4 N, Isp 219–229 s, 0,37 kg / clase de 110 N, Isp 222–225 s, 1,01 kg | [SatCatalog](https://satcatalog.com/component/mr-111g-4n/), [SatCatalog](https://satcatalog.com/component/mr-107t-110n/) |
| Densidades | hidracina 1021 kg/m³; MMH 875 kg/m³; NTO 1442,46 kg/m³ | [Wikipedia](https://en.wikipedia.org/wiki/Hydrazine), [Wikipedia](https://en.wikipedia.org/wiki/Monomethylhydrazine), [Wikipedia](https://en.wikipedia.org/wiki/Dinitrogen_tetroxide) |
| 101955 Bennu | 565×535×508 m, radio medio 245,03 m, 7,329×10¹⁰ kg, 1190 kg/m³, rotación 4,296057 h, tipo B | [Wikipedia](https://en.wikipedia.org/wiki/101955_Bennu) |
| Planetas | Elementos keplerianos medios 1800–2050, radios, leyes de brillo | [JPL (Standish)](https://ssd.jpl.nasa.gov/planets/approx_pos.html), [NASA Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/), [Mallama y Hilton 2018](https://arxiv.org/abs/1808.01973) |
| 142 Polana y 6 asteroides de su zona | Órbita, diámetros y albedos NEOWISE, rotaciones LCDB | [JPL SBDB](https://ssd-api.jpl.nasa.gov/doc/sbdb.html) |
| Propulsor Hall X3 (nodriza) | 5,4 N a 99 kW, Isp 1800–2650 s, xenón | [Hall et al. 2019](https://ntrs.nasa.gov/citations/20190004993) |
| Energía eléctrica nuclear de clase MW | 2 MWe, 19 kg/kWe, 33,7 %, 2760 m² de radiadores | [Harnack et al. 2022](https://ntrs.nasa.gov/api/citations/20220013600/downloads/ASCEND_22_Brayton_Performance_Mass_Sensitivity.pdf) |
| Contacto de acople IDSS | 0,05–0,10 m/s de cierre, 0,04 m/s lateral, 0,10 m, 4°, 0,2 °/s | [IDSS IDD Rev. F](https://ntrs.nasa.gov/citations/20220011643) |

El casco y los tanques de la nave inicial son valores de juego, a sustituir por piezas reales. La distribución de 24 propulsores RCS en pares dedicados es una simplificación jugable.
