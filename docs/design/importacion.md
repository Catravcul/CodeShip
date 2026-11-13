# Importación: cometas, fuentes propias y el Santuario

Petición del diseñador: **importar menos**. Tres caminos, del más barato al más caro:

1. **Cometas** en el mapa, subyugables como los asteroides, que dan volátiles (agua, CO₂, amoníaco, carbono).
2. **Fuentes propias** de la estación, sin subyugar nada: un **remolcador** que trae rocas pequeñas y un **lanzador de masas** que envía paquetes. Son lentas y modestas, para el principio del juego.
3. **El Santuario** (Nevaeh, Cold Sanctuary) como último recurso: se paga en créditos y tarda lo que tarda una transferencia de Hohmann real.

Todo número de juego está marcado como «valor de juego»; el resto lleva su fuente.

> **Cambio de diseño (2026-11-13).** El remolcador y el lanzador de masas **no dependen de la subyugación**: funcionan sobre cualquier asteroide o cometa del mapa. Lo que hace un asteroide subyugado (moverse con su gravedad, mandar recursos a la nave y a la estación, viajar él mismo a la estación) es otra mecánica, en la rama `niveles-subyugacion`. Para esa rama queda un **buzón** de la estación: `ImportOps.inbox.send(origen, etiqueta, materiales, horas)` (puerto `StationInbox`, en `modules/imports/domain/delivery.ts`). Lo que se envía por él llega al almacén cuando pasan esas horas del reloj de la estación.

## 1. Cometas

### Composición (Rosetta en 67P, Giotto en Halley)

| Dato | Valor | Fuente |
|---|---|---|
| Polvo/gas de 67P sobre la cara iluminada | 4 ± 2 | Rotundi et al. 2015, *Science* 347 ([ESA](https://sci.esa.int/web/rosetta/-/55330-rotundi-et-al-2015)) |
| Refractario/hielo en el núcleo | ≥ 3 (límite inferior a 1σ) | Fulle et al. 2019, *MNRAS* 482:3326 ([ADS](https://ui.adsabs.harvard.edu/abs/2019MNRAS.482.3326F)) |
| Mismo cociente, revisión del equipo de Rosetta | rango amplio de valores posibles | Choukroun et al. 2020, *Space Sci. Rev.* 216:44 ([DLR](https://elib.dlr.de/135524)) |
| Gas perdido por 67P entre 2014 y 2016 | H₂O 4,0·10⁹ kg; CO₂ 7,2·10⁸; CO 1,9·10⁸; O₂ 1,6·10⁸; H₂S 1,3·10⁸; NH₃ 1,5·10⁷ kg (14 especies) | Läuter et al. 2020, *MNRAS* ([arXiv:2006.01750](https://arxiv.org/abs/2006.01750), tabla 1) |
| Polvo: materia orgánica / minerales | 45 % / 55 % | Bardyn et al. 2017, *MNRAS* (COSIMA) ([MPS](https://www.mps.mpg.de/Rosetta-A-Comet-s-List-of-Ingredients)) |
| Halley (Giotto, 1986) | gas ≈ 80 % agua en volumen, 10 % CO, 2,5 % CO₂; «domina la suciedad, no el hielo»; 3 t/s desde siete chorros; densidad de solo 0,3 g/cm³ | [ESA Giotto](https://sci.esa.int/web/giotto/-/31878-halley) |

**Composición en el juego** (`cometComposition`, `modules/celestial/data/comets.ts`). Se toma el cociente R = 3–6 (el límite inferior de Fulle y la parte alta de 4 ± 2). El hielo es 1/(1+R) de la masa y se reparte como el gas que perdió 67P. El resto es polvo: 45 % orgánico y 55 % mineral.

| Material (carga) | Fracción de masa | Va a la estación como |
|---|---|---|
| Hielo de agua | 10,6–18,6 % | `hielo-agua` → «Fundir y filtrar hielo» → agua (propelente y vida) |
| Hielo de CO₂ | 1,9–3,3 % | `hielo-co2` → electrólisis de CO₂ (como MOXIE) y reacción de Boudouard → oxígeno y carbono |
| Hielo de CO | 0,5–0,9 % | se pierde: sublima cerca de 25 K, antes de que se pueda guardar |
| Amoníaco | 0,04–0,07 % | `amoniaco` (el nitrógeno para cultivos y para la planta) |
| Otros volátiles (H₂S, O₂, CH₃OH…) | 1,2–2,2 % | se pierden |
| Orgánicos refractarios (CHON) | 33,8–38,6 % | `carbono` (la resina y la fibra de los compuestos) |
| Silicatos y sulfuros | 41,3–47,1 % | `silicatos` (oxígeno y cerámica por electrólisis de fundido) |

Fundir el hielo cuesta 2,05 kJ/(kg·K) × 70 K + 333,55 kJ/kg + 4,18 kJ/(kg·K) × 20 K ≈ **0,56 MJ/kg** ([entalpía de fusión](https://en.wikipedia.org/wiki/Enthalpy_of_fusion), [hielo](https://en.wikipedia.org/wiki/Ice)). Es mucho menos que cocer los filosilicatos de Bennu. Que la carga salga a −70 °C es un valor de juego. La celda de CO₂ sigue la estequiometría CO₂ → C + O₂ (12 : 32) con un rendimiento del 90 %, que es una estimación ([MOXIE](https://en.wikipedia.org/wiki/Mars_Oxygen_In-Situ_Resource_Utilization_Experiment), [Boudouard](https://en.wikipedia.org/wiki/Boudouard_reaction)).

### Cometas en el mapa (JPL SBDB, consultado el 2026-11-13)

| Cometa | Diámetro | Densidad | Rotación | Órbita (a, e, q–Q) | Notas |
|---|---|---|---|---|---|
| 67P/Churyumov-Gerasimenko | 3,4 km (Sierks 2015) | 533 kg/m³ (Pätzold 2016) | 12,761 h (Mottola 2014) | 3,46 UA, 0,641, 1,24–5,68 UA | GM = 662,2·10⁻⁹ km³/s²; la masa del juego queda a menos del 15 % |
| 46P/Wirtanen | 1,2 km (Lamy 2004) | la de 67P (supuesta) | 8,98 h (Farnham 2021, [arXiv](https://arxiv.org/abs/2012.01291)) | 3,09 UA, 0,659, 1,06–5,13 UA | composición como 67P (supuesta) |
| 133P/Elst-Pizarro | 3,2 km (NEOWISE) | la de Bennu (supuesta) | 3,471 h (LCDB) | 3,16 UA, 0,155, 2,67–3,66 UA | cometa del cinturón principal: roca como Bennu y 1–5 % de hielo enterrado (valor de juego) |

Los dos cometas de la familia de Júpiter cruzan la distancia al Sol de la región (2,2–2,4 UA). 133P vive en el cinturón. 2P/Encke (4,8 km, q = 0,34 UA) también cruza la región, pero no está en el mapa para no llenarlo de cuerpos grandes. Las posiciones dentro de la zona de vuelo son valores de juego, igual que las de los asteroides. Las formas son procedurales. Se dibujan con una coma tenue y una cola que apunta en contra del Sol.

### Poder de ira: chorros

Un cometa conserva el nivel que le dan su tamaño y sus volátiles (los tres son de nivel 3, «Explosivos»), y además gana el arma **`chorro`**: uno de cada tres lanzamientos es un chorro de gas y polvo. Las cifras salen de los 34 estallidos de 67P en 2015 (Vincent et al. 2016, [arXiv:1609.07743](https://ar5iv.labs.arxiv.org/html/1609.07743)): 60–260 kg/s de polvo según la ira, al menos a 13 m/s y durante menos de 5 min. El cono de 10° y la duración de 20 s son valores de juego. El objetivo recibe la parte del cono que tapa su sección. El empuje es momento/masa y el daño pasa por su protección real (`jetOnTarget`, `modules/asteroid-wrath/domain/jet.ts`). En la vida real un chorro apenas mueve una nave. Como las rocas de los niveles altos, el juego lo amplifica con la velocidad del nivel.

## 2. ¿Traer materiales con una roca que pasa cerca de una estrella?

No funciona. Cerca del Sol un cuerpo helado **pierde justo lo que queremos**. 67P soltó unos 5·10⁹ kg de gas y, con un polvo/gas de 1 a 4, entre 10¹⁰ y 2·10¹⁰ kg en total en una sola órbita (Läuter 2020, Rotundi 2015). Eso es 0,1–0,2 % de su masa, y casi todo el hielo de la superficie. Los cometas que rozan el Sol se deshacen por completo (ISON en 2013). Lo que sí funciona es **redirigir con asistencias gravitatorias**: el estudio de Keck devolvía la roca con solo ~160 m/s desde el asteroide hasta una asistencia gravitatoria de la Luna, que la deja capturada. En el juego lo hacen los asteroides subyugados, que controlan la gravedad (rama `niveles-subyugacion`).

## 3. Remolcador y lanzador de masas (fuentes propias, sin subyugación)

### Remolcador SEP (`plano-remolcador`, necesita la impresora de metal grande)

| Dato | Valor | Fuente |
|---|---|---|
| Estudio de Keck 2012 | roca de ~7 m y ~500 t; SEP de ~40 kW; Isp 3 000 s; 6–10 años; masa húmeda ≤ 15,5 t con 12–13 t de xenón; Atlas V; ~2 600 M US$ | Brophy et al., [KISS](https://kiss.caltech.edu/final_reports/Asteroid_final_report.pdf) |
| ARM, opción B | roca de hasta 4 m levantada de un asteroide mayor; SEP de 50 kW; cancelada en 2017 | [Wikipedia](https://en.wikipedia.org/wiki/Asteroid_Redirect_Mission) |
| Eficiencia Hall | 45–60 % | [Hall-effect thruster](https://en.wikipedia.org/wiki/Hall-effect_thruster) |

Valores del juego: 40 kW, Isp 3 000 s y η = 0,6, que dan **F = 2ηP/(g₀·Isp) = 1,63 N**. El remolcador seco pesa 3 500 kg (15,5 t − 12 t de Keck) y lleva hasta 300 kg de xenón (valor de juego). Los brazos cierran rocas de hasta 4 m (ARM), pero como fuente temprana y modesta solo sale a por rocas de **1, 1,5 o 2 m** (0,6–5 t con la densidad de Bennu; valor de juego). El viaje acelera la mitad del camino y frena la otra mitad: t = 2√(d/a), Δv = 2√(d·a). La captura dura 48 h (valor de juego). A unos 16 km de la estación: ida 3,4 h, vuelta 3,7–5,2 h, unas 55 h en total, y 1,4–1,7 kg de xenón (que viene importado). Las distancias de la región están comprimidas, como el vuelo del resto del juego.

### Lanzador de masas (`plano-lanzador-masas`, necesita la soldadora por haz de electrones)

| Dato | Valor | Fuente |
|---|---|---|
| Mass Driver Two | 5 000 m/s² nominales hasta 112 m/s; Mass Driver 1: 40 m/s a 33 g | [Mass driver](https://en.wikipedia.org/wiki/Mass_driver) |
| Lanzador lunar de O'Neill (Ames 1977) | cubos de 10,5 kg a 4 Hz, 2 400 m/s, 1 000 g, 488 m, 125 MW, 650 000 t/año | Arnold, O'Neill et al., [Mass Drivers III](https://settlement.nss.org/spaceres/III-3.html) |

En el juego: 112 m/s, 5 000 m/s², bobinas de v²/2a = 1,25 m y cubos de 10,5 kg, con ½mv² = 66 kJ por disparo. Sale **un paquete cada 8 h** (valor de juego: el minero tiene que llenar el cubo), unos 31 kg por día de juego. Vuela en línea recta a 112 m/s y la red de la estación lo atrapa. Un asteroide pequeño no lo retiene: su velocidad de escape es de 1–2 m/s.

## 4. Importar del Santuario

El Santuario está en la Tierra (Doménica llegó a Cold Sanctuary desde la Tierra, `story/data/friends.ts`). Nevaeh lanza el pedido a la órbita baja y desde allí lo empujan dos etapas en el espacio.

| Lanzador | US$/kg a LEO | Fuente |
|---|---|---|
| Falcon 9 | 3 246 (≈ 74 M US$ por 22 800 kg, 2026) | [New Space Economy, 2026](https://newspaceeconomy.ca/2026/06/21/how-accurate-were-elon-musks-falcon-9-and-starship-kg-claims/) |
| Falcon Heavy | 1 410 (dólares de 2018) | Jones 2018, ICES-2018-81, tabla A2 ([NTRS](https://ntrs.nasa.gov/api/citations/20200001093/downloads/20200001093.pdf)) |
| Starship (objetivo) | 100: menos de 10 M US$ por vuelo con 100 t (Musk, 2022). **Sin precio público** | ídem |

**Δv y tiempo.** Hohmann entre órbitas circulares de la Tierra (1 UA) y la región, a la distancia real de la región en la fecha del juego: **2,21 UA**. El encendido de salida en LEO (400 km) es √(v∞² + v_esc²) − v_circ = **4,35 km/s**. El de llegada, para igualar la órbita, es de **4,23 km/s**. El viaje dura **372 días**, y hay una ventana cada **524 días** (periodo sinódico) ([Hohmann](https://en.wikipedia.org/wiki/Hohmann_transfer_orbit), [Oberth](https://en.wikipedia.org/wiki/Oberth_effect)).

**Ecuación del cohete.** Cada encendido lo hace una etapa que se suelta vacía. Isp 380 s (Raptor Vacuum, [Wikipedia](https://en.wikipedia.org/wiki/SpaceX_Raptor)). La masa seca de cada etapa es el 10 % de su propelente (valor de juego). Una sola etapa no puede dar 8,6 km/s con esos tanques. Con dos, cada kilo entregado necesita **16,2 kg en LEO** ([Tsiolkovsky](https://en.wikipedia.org/wiki/Tsiolkovsky_rocket_equation)).

**Fórmula del juego** (`importQuote`, `modules/imports/domain/quote.ts`):

```
créditos = ⌈ masa · multiplicador(Δv₁, Δv₂, Isp, tanques) · (US$/kg a LEO) / 1 000 ⌉
retraso  = días de Hohmann × 1 h de estación por día
```

1 crédito = 1 000 US$ (valor de juego). Un día real de transferencia es una hora del reloj de la estación (valor de juego). Con el reloj de la estación (un día cada 40 s), 372 h son unos 10 minutos reales sin acelerar el tiempo.

| Un kit (25 kg) | Falcon 9 | Falcon Heavy | Starship (objetivo) |
|---|---|---|---|
| Coste | 1 318 créditos (1,32 M US$) | 573 créditos | 41 créditos |

**Créditos.** Se empieza con 1 000 (el primer pago de Nevaeh). Cada misión principal paga 1 500 o 2 500 además de sus kits, y cada misión secundaria (un cuerpo subyugado fuera de la cadena) paga 400. Todo son valores de juego. Con el pedido aceptado, Nevaeh contesta por radio con una carta que repite el desglose.

## En el juego

- **Estación → pestaña «Importar»**:
  - créditos y últimos movimientos;
  - pedido al Santuario: lanzador, artículos con −/+ y el desglose completo (Δv, multiplicador, lanzamiento, coste, viaje) con sus fuentes;
  - «En camino»;
  - «Fuentes propias»: elegir cuerpo y tamaño de roca para el remolcador, o el cuerpo donde montar el lanzador.
- **Retos de código** (`modules/imports/application/challenges.ts`):
  - **pedido:** kg en LEO = masa × multiplicador, coste en créditos, y el viaje en orden;
  - **remolque:** masa de la roca ρ·π/6·d³, horas de vuelta 2√(d/a), y la captura de la opción B en orden;
  - **lanzador:** tiempo de vuelo d/v, energía ½mv², y el montaje en orden.
- **Planos → Componentes:** el remolcador y el lanzador de masas, en el árbol de crecimiento de la estación.

## Capturas

- `docs/screenshots/importacion-santuario-{mobile,desktop}.png`: pestaña Importar con un pedido.
- `docs/screenshots/importacion-reto-{mobile,desktop}.png`: el reto del pedido.
- `docs/screenshots/importacion-en-camino-{mobile,desktop}.png`: el desglose y el pedido en camino.
- `docs/screenshots/importacion-fuentes-{mobile,desktop}.png`: remolcador y lanzador.
- `docs/screenshots/importacion-cometa-{mobile,desktop}.png`: 67P desde la cabina.

## Preguntas abiertas

- ¿Ventanas de lanzamiento? Ahora se puede pedir en cualquier momento, aunque en la realidad hay una ventana cada ~524 días.
- ¿Se ofrece Starship, que solo tiene un precio objetivo? Abarata 32 veces respecto a Falcon 9.
- ¿Propulsión eléctrica para los pedidos (más barata, más lenta)?
- ¿Cuánto paga cada misión? Las cifras de créditos están por equilibrar.
- ¿La rama `niveles-subyugacion` usa `ImportOps.inbox` para sus envíos, o prefiere su propio puerto?
