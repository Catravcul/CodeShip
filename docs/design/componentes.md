# Componentes reales: qué pesa la sonda y qué se puede cambiar

Petición de diseño (2026-11-12): «La sonda debería pesar lo que pesan sus componentes; lo ideal es investigar los componentes reales. Por ahora se pueden cambiar los propulsores y el motor; ¿qué otros componentes pueden ser intercambiables? ¿La cabina? ¿Las alas? ¿Los escudos? Investiga componentes de sondas, naves nodriza o cohetes, lo más reales posible: necesitamos costes de energía, masas, materiales, etc.».

**Respuesta corta.** La sonda ya no tiene un casco de 420 kg «de relleno». Su masa en seco es la suma de lo que lleva montado, y cada pieza dice de dónde sale su número. Pasa de **461 kg** en seco (681 kg con los tanques llenos) a **1147 kg** (1367 kg). Sigue siendo más ligera que la etapa de ascenso del módulo lunar, que pesaba 2150 kg en seco. Hay **cuatro huecos nuevos en la sonda**: cabina, fuente de energía, batería y escudo contra micrometeoritos. En la **nodriza** hay **dos**: energía auxiliar y blindaje contra la radiación. Todos se cambian en la bahía con una cadena de retos y piezas del hangar, y todos tienen plano en la estación.

**Propulsión (13 de noviembre).** Motores, RCS y tanques también son piezas reales (§1.6 a §1.9). La sonda lleva de serie un R-4D-15 HiPAT con el par de tanques de titanio de MESSENGER y una botella de helio, y RCS MR-106L de hidracina en un tanque de Dawn. Pesa **1166 kg en seco y 1649 kg llena**, y su Δv pasa de 432 a **975 m/s**. No se ha retocado ningún número. El Δv sube porque el tanque de serie es ahora un par real de 398 L con 438 kg (antes, 180 kg de valor de juego). Además, un tanque real de ese tamaño pesa el 4 % de lo que lleva (el 7,5 % con el helio), y no el 10 % que se había supuesto.

Convenciones: «copiado» es un número tal cual lo da la fuente; «derivado» es una cuenta hecha con números copiados, y la cuenta se enseña; «estimación» es un número razonado sin fuente directa; «valor de juego» es una decisión de diseño. Datos consultados el 12 de noviembre de 2026.

## 1. Catálogo

### 1.1 Cabinas y recipientes de presión

| Referencia | Masa | Volumen | Materiales y notas | Fuente |
| --- | --- | --- | --- | --- |
| Módulo lunar Apolo, etapa de ascenso | 2150 kg en seco, 4700 kg cargada | 6,7 m³ de cabina, 4,5 m³ habitables | Dos baterías de plata-zinc de 296 Ah (57 kg cada una). La estructura de todo el módulo lunar fue 1/15 de su peso cargado | [Wikipedia](https://en.wikipedia.org/wiki/Apollo_Lunar_Module), [TN D-7084](https://ntrs.nasa.gov/api/citations/19730010174/downloads/19730010174.pdf) |
| Módulo de mando Apolo | 5560 kg | 5,9 m³ (10,4 m³ presurizados) | Recipiente interior de panal de aluminio soldado y pegado; escudo térmico ablativo de unos 1400 kg | [Wikipedia](https://en.wikipedia.org/wiki/Apollo_command_and_service_module) |
| Orion | — | 8,9 m³ habitables, 19,56 m³ presurizados | El recipiente de presión es de siete piezas grandes de aluminio. El de EM-1 pesa unos 1800 kg (4000 lb) menos que el de EFT-1 | [NASA](https://www.nasa.gov/feature/orion-ingenuity-improves-manufacturing-while-reducing-mass) |
| Crew Dragon / Starliner | — | 9,3 m³ / 11 m³ | Ya están en [interiores.md](interiores.md) | — |
| Composite Crew Module (NASA, 2007–2009) | Unos 68 kg menos que su primer diseño integrado | Del tamaño de Orion | Sándwich de panal de aluminio con pieles de fibra de carbono. No ha volado | [CompositesWorld](https://compositesworld.com/articles/building-on-ccm-lessons-learned(2)) |
| Módulo Columbus (ISS) | — | — | **Pared cilíndrica de 4 mm de aluminio 2219**, 7 mm en los conos | [Wikipedia: 2219](https://en.wikipedia.org/wiki/2219_aluminium_alloy) |
| Altair (estudio de lander lunar) | Módulo de ascenso de 5,1 a 6,8 t, según el ciclo de diseño | — | Energía de 3 kW de media y 6 kW de pico; 6,1 kW de calor; el impacto de micrometeoritos sobre el recipiente es un riesgo principal | [IAC-09.D2.3.2](https://ntrs.nasa.gov/api/citations/20090035549/downloads/20090035549.pdf) |

**Materiales de pared**

| Material | Densidad | Resistencia | Notas | Fuente |
| --- | --- | --- | --- | --- |
| Al 2219 | 2,84 g/cm³ | 388 MPa (derivado: 504 / 1,3) | Columbus, cúpula de la ISS, tanque estándar del transbordador | [Wikipedia](https://en.wikipedia.org/wiki/2219_aluminium_alloy) |
| Al-Li 2195 | 5 % menos denso que el 2219 | 30 % más resistente que el 2219 | Tanque superligero del transbordador, tanques del Falcon 9 | [Wikipedia](https://en.wikipedia.org/wiki/2195_aluminium_alloy) |
| Al-Li (2541-T8 en la tabla) | 2,70 g/cm³ | 504 MPa | Espesor mínimo de 1,02 mm | [Cellucci et al.](https://ar5iv.arxiv.org/html/1703.00044) |
| Ti-6Al-4V | 4,43–4,51 g/cm³ | 880–920 MPa | — | [Wikipedia](https://en.wikipedia.org/wiki/Ti-6Al-4V) |
| Acero | 7,862 g/cm³ | 690 MPa | Starship usa acero inoxidable | [Cellucci et al.](https://ar5iv.arxiv.org/html/1703.00044) |
| CFRP | 1,62 g/cm³ | 2500 MPa en la dirección de la fibra; un recipiente bobinado aprovecha como mucho el 28 % | Espesor mínimo de 2,03 mm | [Cellucci et al.](https://ar5iv.arxiv.org/html/1703.00044) |

**Cómo pesa una cabina en el juego.** La cabina dibujada mide 2,4 × 1,7 × 1,95 m y tiene 24,2 m² de pared (valor de juego). La pared de referencia es la de Columbus: 4 mm de 2219. Las demás tienen la misma resistencia, así que su espesor es 4 mm × 388 MPa ÷ su resistencia (estimación: espesor proporcional a 1/resistencia), y nunca baja del espesor mínimo. A eso se suman **120 kg** de escotillas, ventanas, suelo y anillos (estimación, igual para todas).

| Cabina | Pared | Masa | Se fabrica con | Diámetro crítico sin escudo |
| --- | --- | --- | --- | --- |
| Aluminio-litio 2195 (**de serie**) | 3,08 mm, 8,3 kg/m² | **320 kg** | Chapa importada (kits) | 0,77 mm |
| Aluminio 2219 | 4 mm, 11,4 kg/m² | 394 kg | Chapa importada | 1,05 mm |
| Titanio Ti-6Al-4V | 1,76 mm, 7,8 kg/m² | 309 kg | Chapa importada | 0,72 mm |
| Acero de hierro y níquel | 2,25 mm, 17,7 kg/m² | 547 kg | **Hierro y níquel de la roca** | 1,64 mm |
| Fibra de carbono | 2,22 mm, 3,6 kg/m² | 207 kg | **Carbono de la roca** + resina en kits | 0,33 mm |

El modelo exagera la ventaja del CFRP: no cuenta uniones ni insertos, y el CCM real no fue mucho más ligero. Por eso el juego le cobra con lo que sí es real: una pared fina para menos piedras.

### 1.2 Escudos contra micrometeoritos

| Configuración | Parachoques | Separación | Pared trasera | Fuente |
| --- | --- | --- | --- | --- |
| Ejemplo de Whipple (figura 4-4) | 0,12 cm de Al 6061-T6 | 10 cm | 0,32 cm de Al 6061-T6 | [Manual de la NASA JSC-64399](https://ntrs.nasa.gov/citations/20090010053) |
| Nodos 2 y 3 de la ISS (figura 4-6) | 0,16 cm | 12 cm | 0,48 cm | ídem |
| Nodos 2 y 3, versión pesada (figura 4-7) | 0,25 cm | 12 cm | 0,64 cm | ídem |
| Whipple relleno (figura 4-9) | 0,2 cm de Al + 6 capas de Nextel AF62 + 6 de Kevlar 710 | 10,7 cm | 0,48 cm de Al 2219-T87 | ídem |
| Multichoque (figura 4-11) | 4 capas de Nextel AF26 de 0,043 g/cm² | 10,2 cm en total | 0,051 cm de Al 2024-T3 | ídem |

- Un escudo de tres paredes puede ahorrar **la mitad o más** de la masa de escudo ([manual](https://ntrs.nasa.gov/citations/20090010053), §1.2.4).
- A 7 km/s, una esfera de aluminio atraviesa una placa de **4 veces su diámetro** ([NASA JSC HVIT](https://ntrs.nasa.gov/api/citations/20190001193/downloads/20190001193.pdf)).
- Los soportes y la tornillería son **hasta el 35 %** de la masa del escudo ([revisión de 2025](https://arxiv.org/pdf/2508.03957)).
- Ecuación de Whipple, rama de hipervelocidad (Christiansen): d_c = 3,918 · t_w^(2/3) · ρ_p^(−1/3) · ρ_b^(−1/9) · V^(−2/3) · S^(1/3) · (σ/70)^(1/3). Las unidades son cm, g/cm³, km/s y ksi. Con la configuración de la figura 4-4 da unos 0,55 cm, y hay una prueba que lo comprueba. La ecuación está copiada de la literatura: en el PDF del manual solo se leyó el título de §4.2.2 y no el cuerpo, así que conviene confirmarla.

| Escudo de la sonda | Masa | Diámetro crítico con la cabina de serie | Daño de las piedras | Se fabrica con |
| --- | --- | --- | --- | --- |
| Sin escudo (**de serie**, como el módulo lunar) | 0 kg | 0,77 mm | 100 % | — |
| Whipple de aluminio (figura 4-4) | 120 kg | 5,5 mm | 14 % | Chapa importada + soportes de acero |
| Whipple de acero (misma masa por m²) | 120 kg | 4,9 mm | 16 % | **Hierro de la roca** |
| Whipple de los nodos de la ISS | 161 kg | 5,9 mm | 13 % | Chapa importada |

**Regla de juego (escombros):** el daño que hace un asteroide enfadado se multiplica por d_c de la cabina de serie ÷ d_c de lo montado. Si la pared para partículas del doble de tamaño, el daño se reduce a la mitad. Las piedras de un asteroide son más lentas que 7 km/s: comparar con el punto de diseño de la NASA es una licencia. Los choques contra el suelo o contra el puerto **no** se reducen, porque un Whipple no sirve contra un golpe romo.

### 1.3 Blindaje contra la radiación

| Dato | Valor | Fuente |
| --- | --- | --- |
| Dosis efectiva de rayos cósmicos sin blindaje, mínimo solar | 523 mSv/año | [Naito y Kodaira 2022, Sci. Rep. 12:13617](https://www.nature.com/articles/s41598-022-17079-1.pdf) |
| Dosis relativa detrás de 5/10/15/20 g/cm² de aluminio | 0,81 / 0,70 / 0,62 / 0,55 | ídem, tabla 2 |
| … de polietileno | 0,75 / 0,61 / 0,51 / 0,45 | ídem |
| … de CFRP | 0,77 / 0,64 / 0,55 / 0,48 | ídem |
| Medida real en crucero hacia Marte (RAD de Curiosity, dentro de la nave) | 1,8 mSv/día | [SwRI](https://www.swri.org/press-release/swri-led-team-calculates-radiation-exposure-associated-trip-mars) |
| Límite de carrera de la NASA | 600 mSv de dosis efectiva; 250 mSv por tormenta solar | [NASA OCHMO](https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf) |

El agua no está en la tabla. Se coloca entre el aluminio y el polietileno según su hidrógeno (11,2 % frente a 14,4 %), y es una estimación. La escoria se trata como el aluminio, también por estimación. El área que se cubre, 300 m², sale de la estimación anterior: 60 t de agua a 20 cm (estimación).

| Blindaje de la nodriza | Masa en el anillo | Dosis | Límite de carrera en | Se fabrica con |
| --- | --- | --- | --- | --- |
| Agua de 20 g/cm² (**de serie**) | 60 t | 247 mSv/año | 2,4 años | **Agua de la roca** |
| Agua de 10 g/cm² | 30 t | 329 mSv/año | 1,8 años (aviso) | Agua |
| Polietileno de 20 g/cm² | 60 t | 235 mSv/año | 2,6 años | **Carbono y agua de la roca** (gas de síntesis, Fischer–Tropsch, etileno) |
| Polietileno de 10 g/cm² | 30 t | 319 mSv/año | 1,9 años (aviso) | ídem |
| Escoria de 20 g/cm² | 60 t | 288 mSv/año | 2,1 años | Escoria de la electrólisis |
| Ninguno | 0 t | 523 mSv/año | 1,2 años (aviso) | — |

El blindaje cuenta **dos veces** en la masa: el anillo gemelo tiene que pesar lo mismo que el habitable para que el momento angular total sea cero. Quitar 30 t de agua aligera 60 t y sube el Δv de 4140 a 4477 m/s. La dosis no cuenta la pared del propio módulo, una simplificación. En la sonda no hay blindaje contra la radiación: una salida de horas suma décimas de mSv, y el blindaje que la protegería pesa toneladas.

### 1.4 Energía

| Componente | Potencia | Masa | Otros datos | Fuente |
| --- | --- | --- | --- | --- |
| Ala solar de la ISS (SAW) | ~31 kW | 1088 kg (≈ 28–32 W/kg) | 35 × 12 m, unas 33 000 células | [Wikipedia](https://en.wikipedia.org/wiki/Electrical_system_of_the_International_Space_Station), [JPL ST8](https://www.jpl.nasa.gov/nmp/st8/tech/solar_array2.html) |
| Paneles de Dawn | 10,5 kW | 80 W/kg | Rígidos | [JPL ST8](https://www.jpl.nasa.gov/nmp/st8/tech/solar_array2.html) |
| UltraFlex 175 (diseño ST8) | 7 kW | 175 W/kg (objetivo) | Ala circular plegable (Cygnus, InSight) | ídem |
| ROSA Diamond / Opal / Sapphire / Tanzanite / SunStone / Phenacite | 3,3 / 5,3 / 12,9 / 17,6 / 28 / 37 kW | 36 / 42,7 / 160 / 180 / 331 / 521 kg | 8,6 a 24,8 m desplegada | [Redwire](https://rdw.com/product-archive/power/rosa/) |
| iROSA (ISS) | más de 20 kW por ala | — | Seis alas instaladas | ídem |
| MMRTG | 125 W al principio, ~100 W a los 14 años; 2 kW térmicos | 45 kg (2,8 W/kg) | 4,8 kg de PuO₂; 66,8 cm | [Wikipedia](https://en.wikipedia.org/wiki/Multi-mission_radioisotope_thermoelectric_generator) |
| Kilopower 10 kWe (diseño para Marte) | 10 kWe | ~1500 kg | KRUSTY: 28 h a plena potencia en 2018, 134 kg el reactor de prueba, TRL 5 | [Wikipedia](https://en.wikipedia.org/wiki/Kilopower) |
| Reactor Brayton de la nodriza (estudio NEP de clase MW) | 2000 kWe | 19 kg/kWe | Ya en el juego | [Harnack et al. 2022](https://ntrs.nasa.gov/api/citations/20220013600/downloads/ASCEND_22_Brayton_Performance_Mass_Sensitivity.pdf) |
| Pila de combustible del módulo de servicio Apolo | 1,4 kW a 30 V | 111 kg cada una (tres) | H₂ y O₂; dan agua potable | [Wikipedia](https://en.wikipedia.org/wiki/Apollo_command_and_service_module) |
| Batería Saft 4S1P VES16 | 64 Wh, 14,8 V | 0,7 kg (~91 Wh/kg) | Células de 4,5 Ah y 155 g; hasta 18 años en órbita | [SatNow](https://satnow.com/products/batteries/saft/98-1277-4s1p-ves16-battery) |
| Batería de plata-zinc del módulo lunar | 296 Ah a 28–32 V (~8,9 kWh) | 57 kg (~156 Wh/kg) | Primaria: no se recarga | [Wikipedia](https://en.wikipedia.org/wiki/Apollo_Lunar_Module) |
| Batería de níquel-hidrógeno original de la ISS | 38 células | 170 kg | Se sustituyó por ion-litio: hacían falta la mitad de baterías | [Wikipedia](https://en.wikipedia.org/wiki/Electrical_system_of_the_International_Space_Station) |

La potencia solar cae con el cuadrado de la distancia al Sol. La región está a la distancia media de Bennu, **1,1264 UA** ([Wikipedia](https://en.wikipedia.org/wiki/101955_Bennu)), así que un ala da el 79 % de lo que daría a 1 UA.

**Consumo de la sonda: 660 W en total.** Es el de los sistemas fijos:

- Aviónica: 250 W. Las tres placas RAD750 suman 30 W, copiado de [Wikipedia](https://en.wikipedia.org/wiki/RAD750). El resto es estimación.
- Radio: 60 W (estimación).
- Soporte vital: 200 W (estimación).
- Control térmico: 150 W (estimación).

Como contraste, Altair estaba dimensionado para 3 kW de media con 4 personas.

| Fuente de la sonda | Masa | Produce en la región | Balance | Batería de serie de 5 kWh |
| --- | --- | --- | --- | --- |
| Alas rígidas de GaAs de 1,5 kW (**de serie**) | 19 kg | 1182 W | +522 W | Sin límite |
| ROSA Diamond | 36 kg | 2605 W | +1945 W | Sin límite |
| Dos MMRTG | 90 kg | 250 W (no depende del Sol) | −410 W | 12 h |
| Sin fuente | 0 kg | 0 W | −660 W | 7,6 h (aviso: menos de 8 h, valor de juego) |

| Batería de la sonda | Masa | Energía |
| --- | --- | --- |
| Ion-litio, 78 módulos VES16 (**de serie**) | 54,6 kg | 5,0 kWh |
| Ion-litio, 156 módulos | 109,2 kg | 10,0 kWh |
| Dos de plata-zinc del módulo lunar | 114 kg | 17,8 kWh, no se recargan |

| Energía auxiliar de la nodriza | Masa | Aporta en la región | Efecto |
| --- | --- | --- | --- |
| Ninguna (**de serie**) | 0 | 0 kW | 1800 kW libres: 18 X3 encendidos |
| 4 alas ROSA SunStone | 1,3 t | 88 kW | Con un X3 de más montado, encienden 19 en vez de 18 |
| 4 alas ROSA Phenacite | 2,1 t | 117 kW | ídem, con más margen |
| 4 Kilopower de 10 kWe | 6 t | 40 kW, también lejos del Sol | No basta para otro X3 (99 kW); pesa más |

### 1.5 Sistemas fijos de la sonda

Cuentan para la masa y el consumo, pero no se pueden cambiar todavía.

| Sistema | Masa | Consumo | Base | Fuente |
| --- | --- | --- | --- | --- |
| Estructura primaria | 120 kg | — | Estimación: 1/15 del peso cargado, como el módulo lunar | [TN D-7084](https://ntrs.nasa.gov/api/citations/19730010174/downloads/19730010174.pdf) |
| Sistema de acople NDS (IDSS) | **340 kg** | Solo al acoplar | Copiado: masa máxima de control de 750 lb de las versiones -301/-303, por confirmar; paso de 69 cm con pétalos | [NDS IDD](https://ntrs.nasa.gov/api/citations/20110011626/downloads/20110011626.pdf) |
| Tren de aterrizaje de 4 patas con panal | 60 kg | — | Estimación de masa. El diseño es el del módulo lunar: el panal del amortiguador principal se aplasta con 9500 lb | [TN D-7084](https://ntrs.nasa.gov/api/citations/19730010174/downloads/19730010174.pdf) |
| Aviónica (3 × RAD750, inercial, buscador de estrellas, pantallas) | 60 kg | 250 W | RAD750: 10 W la placa, vuela desde 2005 | [Wikipedia](https://en.wikipedia.org/wiki/RAD750) |
| Radio de banda X (transpondedor Iris y antenas) | 8 kg | 60 W | Iris: 1,2 kg, voló en MarCO; el resto, estimación | [Wikipedia](https://en.wikipedia.org/wiki/Iris_(transponder)) |
| Soporte vital de ciclo abierto | 81 kg | 200 W | 2 personas × 3 días × 0,818 kg de O₂ (BVAD) = 4,9 kg; LiOH = 5,9 kg de CO₂ × 1,09 = 6,4 kg; 70 kg de equipos (estimación) | [BVAD vía Ichimura y Yamashiki 2025](https://frontiersin.org/journals/space-technologies/articles/10.3389/frspt.2024.1461389/pdf) |
| Control térmico (mantas, calentadores, sublimador) | 44 kg | 150 W | 24,2 m² × 1 kg/m² de mantas (estimación; Wikipedia da 12 kg/m² para 40 capas, que parece alto) + 20 kg | [Wikipedia](https://en.wikipedia.org/wiki/Multi-layer_insulation) |

**Soporte vital de ciclo cerrado (solo nodriza, sin hueco todavía).** El OGA de la ISS produce de 2,3 a 9 kg de O₂ al día, con 5,4 kg/día en ciclo normal. Sirve para 6 personas. El rack con sus repuestos pesa entre 1400 y 1500 kg ([Gentry y Cover, ICES-2015-155](https://ntrs.nasa.gov/api/citations/20150022318/downloads/20150022318.pdf); [MSFC](https://www.nasa.gov/centers/marshall/pdf/174687main_eclss_facts.pdf)). Los dos racks del sistema de recuperación de agua y sus repuestos pesan unas 3000 kg. No se encontraron cifras citables de masa y potencia del CDRA ni del WPA.

**Radiadores.** Los de la nodriza ya están dimensionados por el estudio NEP, con 2760 m² ([nave-nodriza.md](nave-nodriza.md)). La sonda se enfría con un sublimador de agua, como el módulo lunar. No se encontraron cifras de masa de radiadores pequeños.

### 1.6 Motores principales

Petición de diseño (2026-11-13): «Los motores y los tanques también tienen que salir de una investigación a fondo». Así que no se retocan números a mano: el motor, los RCS y los tanques salen de hojas de fabricante. Datos consultados el 13 de noviembre de 2026. Las hojas de L3Harris (antes Aerojet Rocketdyne) dan el empuje en lbf y la masa en lb; aquí se convierten (1 lbf = 4,448 N; 1 lb = 0,4536 kg). Cuando la hoja da un intervalo, el juego usa el valor prudente (el Isp más bajo) y lo dice.

**MMH/NTO (hipergólicos almacenables).** Arden al tocarse, no necesitan encendedor y se guardan años a temperatura ambiente. Es lo que usan casi todos los módulos de aterrizaje y las sondas con motor principal.

| Motor | Empuje | Isp (vacío) | Masa | O/F | Entrada | Vida | Cámara | Ha volado | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **R-4D-15 HiPAT** (en el juego, **de serie**) | 445 N (378–512) | **322 s** | 5,44 kg | 1,65 | 15,2 bar (6,9–27,6) | 391 encendidos, 7200 s seguidos | Renio con forro de iridio | Motor de apogeo; la familia R-4D, más de 300 misiones de apogeo sin fallo | [L3Harris](https://www.l3harris.com/sites/default/files/2025-05/l3harris-ar-bipropellant-rocket-engines.pdf), [Wikipedia](https://en.wikipedia.org/wiki/R-4D) |
| R-4D-11 (en el juego) | 490 N | 315 s | 4,31 kg | 1,65 | 15,2 bar (4,1–29,3) | 59 000 encendidos, 12 000 s seguidos | Aleación de niobio con siliciuro | RCS del Apolo desde 1966; ATV, HTV, Orion; dos en Cassini como motores principales | L3Harris, [Wikipedia](https://en.wikipedia.org/wiki/R-4D), [Cassini](https://en.wikipedia.org/wiki/Cassini%E2%80%93Huygens) |
| R-4D original (Apolo) | 490 N | 312 s | 3,6 kg | — | Cámara a 6,9 bar | 1 h seguida, 20 000 encendidos | Molibdeno con siliciuro | 800 unidades en el programa Apolo | [Wikipedia](https://en.wikipedia.org/wiki/R-4D) |
| ArianeGroup 400N (en el juego) | 425 N (340–450) | 321 s | 4,30 kg | 1,65 | 12,5–18,5 bar | — | Platino; tobera de Nimonic | Más de 40 años en vuelo | [ArianeGroup](https://ariane.group/app/uploads/2024/09/ArianeGroup_Chemical_Bipropellant_Thruster_Family.pdf) |
| R-42 (en el juego) | 890 N (623–1357) | 305 s | 6,58 kg | 1,65 | 15,2 bar | 134 encendidos, 3940 s seguidos | — | Ha volado | L3Harris |
| AJ10-190 / OMS (en el juego) | 26,7 kN | 316 s | 118 kg | 1,65 | Cámara a 8,6 bar | 1000 encendidos, 15 h, 100 misiones | — | Transbordador (STS-1, 1981); módulo de servicio europeo de Orion | [Wikipedia](https://en.wikipedia.org/wiki/Orbital_Maneuvering_System), L3Harris (AR-40) |
| Descenso del módulo lunar (LMDE, TRW) | 45 kN, regulable de 4,67 a 45 kN | 311 s (285 s al 10 %) | 179 kg | — | Helio regulado a 17 bar | — | Ablativa, inyector de aguja | Apolo; rescate del Apolo 13. Su derivado TR-201 voló 77 veces en la segunda etapa del Delta | [Wikipedia](https://en.wikipedia.org/wiki/Descent_Propulsion_System), [módulo lunar](https://en.wikipedia.org/wiki/Apollo_Lunar_Module) |
| Ascenso del módulo lunar (Bell) | 16 kN | 311 s | — | — | Helio a 207 bar en dos botellas de 2,9 kg | Empuje fijo | — | Apolo: 2353 kg de propelente, 2220 m/s | [Wikipedia](https://en.wikipedia.org/wiki/Apollo_Lunar_Module) |
| SuperDraco (SpaceX) | 71 kN (nivel del mar) | 235 s (nivel del mar) | — | — | Cámara a 69 bar | Regulable del 100 al 20 % | Inconel impreso por láser | Escape de la Crew Dragon | [Wikipedia](https://en.wikipedia.org/wiki/SuperDraco) |
| Aestus (Ariane 5) | 29,6 kN | 324 s | 111 kg | 1,9 | Cámara a 11 bar | 3 encendidos por vuelo con el ATV | — | Ariane 5 (1997–2018) | [Wikipedia](https://en.wikipedia.org/wiki/Aestus) |

**Hidracina con NTO (modo dual).** La hidracina sirve de combustible del motor principal y de monopropelente para los RCS, del mismo tanque.

| Motor | Empuje | Isp | Masa | O/F | Ha volado | Fuente |
| --- | --- | --- | --- | --- | --- | --- |
| LEROS 1b (Nammo) | 635 N (587–707) | 317 s | 4,5 kg | 0,85 | Juno, MESSENGER, Mars Global Surveyor. Niobio C103 con R512E; 70 rearranques; 2520 s seguidos | [Nammo](https://www.nammo.com/products/space/space-propulsion-thrusters-and-engines/nammo-space-leros-1b-apogee-engine/) |
| LEROS 1c / 2b / 4 | 460 / 407 / 1100 N | 325 / 318 / 323 s | — | — | Familia de niobio; la familia voló en NEAR, Beresheet y Blue Ghost; el 2b y el 4 queman MMH | [Wikipedia](https://en.wikipedia.org/wiki/LEROS) |
| DM R-4D-15 (HiPAT de modo dual) | 445 N | 328 s | 5,44 kg | 0,85–1,0 | TRL 8/9 | L3Harris |
| R-4D-16 AMBR | 534 N | 329 s | 4,9 kg | 0,85–1,0 | Desarrollo terminado («past development» en la hoja) | L3Harris |

**Hidracina sola (monopropelente).** Un lecho catalizador de iridio sobre alúmina descompone la hidracina ([Wikipedia](https://en.wikipedia.org/wiki/Hydrazine)). Menos Isp, pero un solo tanque y sin oxidante.

| Motor | Empuje | Isp | Masa | Encendidos | Ha volado | Fuente |
| --- | --- | --- | --- | --- | --- | --- |
| MR-104H (en el juego) | 510 N (201–554) | 223–237 s | 2,4 kg | — | Ha volado | [satcatalog](https://satcatalog.com/component/mr-104h-510n/) |
| MR-107S (en el juego) | 275 N (85–360) | 225–236 s | 1,01 kg | 87 | **OSIRIS-REx**: cuatro como motores principales, también para salir de Bennu | [satcatalog](https://satcatalog.com/component/mr-107s-275n), [Space Foundation](https://www.spacefoundation.org/2016/09/09/aerojet-rocketdyne-supports-launch-of-osiris-rex-spacecraft-to-explore-near-earth-asteroid/) |
| MR-80B (en el juego) | 31–3600 N, regulable más de 100:1 | 200–230 s | 8,6 kg | **10** | Ocho en la etapa de descenso de Curiosity | [L3Harris](https://www.l3harris.com/sites/default/files/2025-10/l3harris-ar-monopropellant-rocket-engines.pdf), [Space Foundation](https://www.spacefoundation.org/2012/08/05/aerojet-propulsion-helps-land-mars-science-laboratory/) |
| MR-104J / MR-104G | 460–590 / 470–780 N | 222–228 s | 5,5 kg | 71 / 21 | — | L3Harris |

**Monopropelentes verdes.** Menos tóxicos que la hidracina, más densos y con algo más de Isp, pero el lecho se precalienta más.

| Motor | Propelente | Empuje | Isp | Masa | Potencia | Estado | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GR-1 (Aerojet) | AF-M315E / ASCENT, 1,47 g/cm³ | 0,26–1,42 N | 231 s | No publicada | 12 W de válvula, 10 W de precalentamiento a 315 °C | Voló en GPIM (2019–2020) | [NASA 2017](https://ntrs.nasa.gov/api/citations/20170001286/downloads/20170001286.pdf), [NASA 2014](https://ntrs.nasa.gov/api/citations/20140012587/downloads/20140012587.pdf) |
| GR-22 (Aerojet) | AF-M315E | 5,7–26,9 N | 248 s | No publicada | 28 W de válvula, 30 W de precalentamiento | Voló en GPIM; un prototipo se agrietó a 3 kg de vida | ídem |
| HPGP 22N (ECAPS, en el juego) | LMP-103S, 1,24 g/cm³ | 5,5–22 N | 243–255 s | 1,1 kg | 25–50 W | En calificación (EQM-2: ~150 kg de vida) | [NASA MSFC 2020](https://ntrs.nasa.gov/api/citations/20205006456/downloads/Marshall%20StateoftheArt_2020Final%20%28AFRL%20PA%20Approved%29-Final.pdf), [NASA](https://ntrs.nasa.gov/api/citations/20210022261/downloads/HPGP_22N_Abstract_Space_Prop_2022_10012021_Final.pdf) |
| HPGP 5N (en el juego) / 1N | LMP-103S | 1,5–5,5 / 0,25–1 N | 239–253 / 204–235 s | 0,48 / 0,38 kg | 15–25 / 8–10 W | El de 1 N voló en PRISMA (2010) | ídem, [ECAPS](https://soff.se/app/uploads/2023/11/ECAPS-Brochure-1.0-2023.pdf) |

El GR-22 no entra en el juego porque su masa no está publicada.

**Criogénicos.** Más Isp, pero se evaporan.

| Motor | Propelentes | Empuje | Isp | Masa | Notas | Fuente |
| --- | --- | --- | --- | --- | --- | --- |
| HD5 de Morpheus (NASA) | LOX/metano | 24 kN, regulable 4:1 | 321 s | — | El vehículo pesaba 1100 kg en seco con 2900 kg de propelente; RCS de LOX/metano de 22–67 N. Prototipo: 15 vuelos libres hasta 2014 | [Wikipedia](https://en.wikipedia.org/wiki/Project_Morpheus) |
| VR900 (Nova-C, Intuitive Machines) | LOX/metano | 3100 N | — | — | 845 kg de LOX, 422 kg de metano y 17 kg de helio; RCS de helio. IM-1 (2024) e IM-2 (2025) quedaron volcados | [Wikipedia](https://en.wikipedia.org/wiki/Nova-C) |
| RL10A-4-2 / RL10C-1-1 | LOX/LH₂ | 99 / 106 kN | 451 / 453,8 s | 170 / 188 kg | O/F 5,5; Centaur. El CECE regulaba hasta el 5,9 % | [Wikipedia](https://en.wikipedia.org/wiki/RL10) |

| Líquido | Densidad | Hierve a 1 atm | Fuente |
| --- | --- | --- | --- |
| Oxígeno | 1141 kg/m³ | 90,2 K | [NIST](https://webbook.nist.gov/cgi/fluid.cgi?Action=Load&ID=C7782447&Type=SatP&Digits=5&PLow=1.01325&PHigh=1.01325&PInc=1&RefState=DEF&TUnit=K&PUnit=bar&DUnit=kg%2Fm3&HUnit=kJ%2Fkg&WUnit=m%2Fs&VisUnit=uPa*s&STUnit=N%2Fm) |
| Metano | 422 kg/m³ | 111,7 K | [NIST](https://webbook.nist.gov/cgi/fluid.cgi?Action=Load&ID=C74828&Type=SatP&Digits=5&PLow=1.01325&PHigh=1.01325&PInc=1&RefState=DEF&TUnit=K&PUnit=bar&DUnit=kg%2Fm3&HUnit=kJ%2Fkg&WUnit=m%2Fs&VisUnit=uPa*s&STUnit=N%2Fm) |
| Hidrógeno | 70,8 kg/m³ | 20,4 K | [NIST](https://webbook.nist.gov/cgi/fluid.cgi?Action=Load&ID=C1333740&Type=SatP&Digits=5&PLow=1.01325&PHigh=1.01325&PInc=1&RefState=DEF&TUnit=K&PUnit=bar&DUnit=kg%2Fm3&HUnit=kJ%2Fkg&WUnit=m%2Fs&VisUnit=uPa*s&STUnit=N%2Fm) |

**Evaporación.** Con mantas multicapa, en teoría se baja de un 3 % al mes; para un tanque grande de hidrógeno con 50 capas la NASA estima al menos un 0,6 % al mes, y un 6 % al mes con el exterior más caliente. No hay criorrefrigeradores que trabajen a la temperatura del hidrógeno, así que «cero evaporación» no está demostrado para el LH₂ ([NASA TM-2011-215988](https://ntrs.nasa.gov/api/citations/20120011680/downloads/20120011680.pdf)). Un estudio de Boeing para la órbita baja daba 0,127 % al día ([NASA CR-3536, citado por B. Dunn](https://yarchive.net/space/spacecraft/hydrogen_storage.html)). Un tanque pequeño pierde más en proporción, porque tiene más superficie por litro. **Por eso no hay criogénicos en el juego todavía:** la sonda pasa semanas acoplada entre salidas, el hidrógeno ocupa 16 veces más que el MMH/NTO, y el único lander de LOX/metano que ha volado (Nova-C) cayó volcado dos veces. Ver la pregunta abierta 9.

### 1.7 RCS

En el juego, la sonda lleva 24 RCS iguales (`rcs-layout.ts`), un valor de juego. La aceleración al trasladarse es la de dos propulsores.

| Propulsor | Propelente | Empuje | Isp | Masa | Consumo | Vida | Ha volado | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **MR-106L** (**de serie**) | Hidracina | 22 N (10–34) | 228–236 s | 0,59 kg | 36 W de media | 1483 encendidos, 120 511 pulsos | Seis en OSIRIS-REx | [satcatalog](https://satcatalog.com/component/mr-106l-22n), L3Harris |
| MR-111G | Hidracina | 4 N (1,8–4,9) | 219–230 s | 0,37 kg | 16 W | 420 145 pulsos | Dieciséis en OSIRIS-REx | [satcatalog](https://satcatalog.com/component/mr-111g-4n/) |
| MR-107T | Hidracina | 110 N (54–125) | 222–225 s | 1,01 kg | 52 W | **Solo 44 encendidos** | Ha volado | [satcatalog](https://satcatalog.com/component/mr-107t-110n/) |
| ArianeGroup 10N | MMH/NTO | 10 N (6–12,5) | 292 s | 0,35 kg | — | 1,1 millones de ciclos, 69 h | Desde 1974: GAIA, BepiColombo, Solar Orbiter. Cámara de platino y rodio | [ArianeGroup](https://ariane.group/app/uploads/2024/09/ArianeGroup_Chemical_Bipropellant_Thruster_Family.pdf) |
| R-1E | MMH/NTO | 111 N (64–138) | 280,5 s | 2,0 kg | — | 330 000 pulsos | Ha volado | L3Harris |
| HPGP 22N / 5N | LMP-103S | 22 / 5 N | 243 / 239 s | 1,1 / 0,48 kg | 25–50 / 15–25 W | — | Ver arriba | NASA MSFC |
| Draco (SpaceX) | MMH/NTO | 400 N | 300 s | — | — | — | 16 en cada Dragon | [Wikipedia](https://en.wikipedia.org/wiki/SpaceX_Draco) |
| R-6D | MMH/MON-3 | 22 N | 295 s | 0,77 kg | — | 300 000 pulsos | Ya no se fabrica | L3Harris |

Draco no entra en el juego porque su masa no está publicada, y el R-6D porque no se fabrica. **Regla:** en la bahía un propulsor es RCS si empuja menos de 200 N. Los RCS de MMH/NTO beben del par del motor principal: con ellos, el tanque de hidracina queda como masa muerta y la bahía lo avisa. Los de LMP-103S necesitan un tanque de LMP-103S.

### 1.8 Tanques

**Cómo se calcula un tanque en el juego** (`ship/domain/tanks.ts`, `ship/data/tanks.ts`):

- **Capacidad** = número de tanques × volumen × densidad × llenado, en kg enteros.
- **Llenado.** Par de MMH/NTO regulado: **95 %**, copiado del 80433-1, cuya hoja dice «95% max fill fraction». Tanque de hidracina en purga: **75 %**. El gas del hueco (la cuarta parte del tanque) empuja el diafragma y, al vaciarse, la presión cae 4:1 (gas ideal). Esa relación es una estimación; el GR-1 trabaja de 37,9 a 6,9 bar, una relación de 5,5:1.
- **Par de MMH/NTO.** Con O/F 1,65, combustible y oxidante ocupan el mismo volumen: 1 kg de mezcla son 0,377/875 + 0,623/1442,46 = 0,000863 m³, así que la mezcla tiene 1159 kg/m³. El par son dos tanques iguales y una línea de helio. Los tanques de NTO son de PMD (tensión superficial): ningún elastómero toca el oxidante.
- **Helio** (isoterma a 20 °C, densidades reales del [NIST](https://webbook.nist.gov/cgi/fluid.cgi?Action=Load&ID=C7440597&Type=IsoTherm&Digits=5&PLow=20&PHigh=310&PInc=10&T=293.15&RefState=DEF&TUnit=K&PUnit=bar&DUnit=kg%2Fm3&HUnit=kJ%2Fkg&WUnit=m%2Fs&VisUnit=uPa*s&STUnit=N%2Fm): 44,427 kg/m³ a 310 bar y 3,2527 kg/m³ a 20 bar). El gas que sale de la botella tiene que llenar todos los tanques a la presión regulada, 20 bar (estimación: por debajo del MEOP de 22 bar de los tanques y por encima de los 15,2 bar de entrada del R-4D). La fórmula es V_botella = V_tanques × 3,2527 / (44,427 − 3,2527). Se monta la botella más ligera que basta, llena. Una descarga rápida es adiabática y pide más gas: el margen es lo que sobra de botella.
- **Regulador, válvulas de cierre y retención, filtros y tuberías: 5 kg** (estimación: no se encontró una masa de catálogo).
- **El helio cuenta como masa en seco:** no se quema, se queda en los tanques.

**Tanques de propelente (titanio Ti-6Al-4V).** Northrop Grumman (antes PSI y ATK) da las cifras en pulgadas cúbicas, psig y libras; aquí se convierten.

| Tanque | Tipo | Volumen | Presión de trabajo | Masa | PV/m | Ha volado | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- |
| NG 80599-1 | PMD | 94,6 L | 22,1 bar | 6,62 kg | 32 kJ/kg | «Lunar Lander» | [NG, PMD](https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pmd-tanks/data-sheets-sorted-by-part-number) |
| NG 80546-1 | PMD | 131,0 L | 24,1 bar | 10,98 kg | 29 kJ/kg | JWST (NTO, 132 kg cargados) | ídem |
| **NG 80433-1** | PMD | **199,1 L** | 22,4 bar | **9,07 kg** | 49 kJ/kg | **MESSENGER** | ídem |
| ArianeGroup OST 25/0 | PMD | 282 L | 22 bar | 21,0 kg | 30 kJ/kg | Amos 2 | [ArianeGroup](https://space-propulsion.com/spacecraft-propulsion/bipropellant-tanks/index.html) |
| ArianeGroup T11-0 / OST 25/3 / ESM de Orion | PMD | 218 / 331 / 2100 L | 22 / 19,5 / 25 bar | 11 / 22,7 / ~110 kg | — | MSG / BepiColombo / Orion | ídem |
| MT Aerospace PMD 165 | PMD | 165 L | 20 bar | 10,8 kg | — | GAIA, Eurostar | [MT Aerospace](https://www.mt-aerospace.de/files/mta/tankkatalog/MT-Tankkatalog.pdf) |
| NG 80397-1 | Diafragma | 37,7 L | 22,1 bar | 4,54 kg | 18 kJ/kg | Phoenix, InSight | [NG, diafragma](https://northropgrumman.com/space/diaphragm-tanks-data-sheets-sorted-by-volume) |
| **NG 80274-1** | Diafragma | **60,0 L** | 26,0 bar | **6,70 kg** | 23 kJ/kg | **Dawn**, MSL, TESS | ídem |
| NG 80428-1 | Diafragma | 119,0 L | 28,8 bar | 13,15 kg | 26 kJ/kg | New Horizons | ídem |
| NG 80325-1 | Diafragma | 186,0 L | 31,0 bar | 19,96 kg | 29 kJ/kg | Magellan, Cassini, Hinode | ídem |
| NG 80407-1 | Diafragma | 461,2 L | 27,6 bar | 35,38 kg | 36 kJ/kg | LRO, X-38 | ídem |
| NG 80498-1 | Diafragma | 15,1 L | 36,2 bar | 2,72 kg | 20 kJ/kg | PRISMA (llevaba HPGP y también hidracina; la tabla no dice cuál usaba este tanque) | ídem |
| MT Aerospace PTD-96 / 177 / 222 | Diafragma de EPDM | 96 / 177 / 222 L | 24–24,5 bar | 8,2 / 15,5 / 17,1 kg | — | Seastar / Herschel-Planck / Iridium NEXT | [MT Aerospace](https://www.mt-aerospace.de/files/mta/tankkatalog/MT-Tankkatalog.pdf) |

**Botellas de helio.**

| Botella | Material | Volumen | Trabajo / rotura | Masa | PV/m | Ha volado | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **NG 80586-1** | Titanio monolítico | 35,0 L | 310 bar | **7,98 kg** | 136 kJ/kg | Lander lunar de Axiom | [NG, presurizantes](https://www.northropgrumman.com/what-we-do/space/mission-enabling-products/pressurant-tanks/data-sheets-sorted-by-volume) |
| NG 80445-1 | Titanio monolítico, 422 × 663 mm | 67,3 L | 310 / 465 bar | 10,5 kg | 199 kJ/kg | MESSENGER | ídem |
| MT Aerospace PVG 40–75 | **COPV**: forro de titanio con fibra de carbono T800 | 40–75 L | 310 bar | 8,5–14,4 kg | 146–161 kJ/kg | SpaceBus, MTG, Euclid | [MT Aerospace](https://www.mt-aerospace.de/files/mta/tankkatalog/MT-Tankkatalog.pdf) |
| Botellas del ascenso del módulo lunar | — | — | 207 bar | 2 × 2,9 kg | — | Apolo | [Wikipedia](https://en.wikipedia.org/wiki/Apollo_Lunar_Module) |

**Cómo escala la masa.** La pared de un recipiente fino es proporcional a presión × radio, así que su masa es proporcional a presión × volumen (PV). La cifra de mérito es PV/m. Para una esfera de Ti-6Al-4V con 880 MPa y un factor de rotura de 1,5, el límite es 2σ / (3ρ · 1,5) = 88 kJ/kg (derivado). Los tanques de propelente quedan muy por debajo (18–49 kJ/kg), por el espesor mínimo, las bridas y el PMD o el diafragma. Por eso un tanque pequeño pesa más en proporción: el 80397-1 pesa el 16 % de lo que lleva y el 80407-1, el 10 %. Las botellas de 310 bar de Northrop Grumman pasan de ese límite (136–199 kJ/kg). Con su presión de rotura de 465 bar, el 80445-1 pediría casi 2 GPa en la pared de una esfera de titanio, el doble de lo que aguanta el Ti-6Al-4V. O la tabla tiene una errata, o esas botellas no son monolíticas. El juego usa las cifras tal como vienen copiadas, pero hay que confirmarlo (pregunta abierta 8). El COPV de MT Aerospace (146–161 kJ/kg) sí entra en lo esperable para un compuesto.

**Tanques en el juego.**

| Pieza | Tanques | Capacidad | Masa en vacío | Masa / carga |
| --- | --- | --- | --- | --- |
| Par MMH/NTO 208 kg | 2 × 80599-1 + 80586-1 | 208 kg | 27,8 kg (13,2 de tanques, 14,5 de línea de helio) | 13 % |
| Par MMH/NTO 288 kg | 2 × 80546-1 + 80586-1 | 288 kg | 36,5 kg | 13 % |
| **Par MMH/NTO 438 kg** (**de serie**) | 2 × 80433-1 + 80586-1 | 438 kg | 32,7 kg | 7,5 % |
| Par MMH/NTO 620 kg | 2 × OST 25/0 + 80445-1 | 620 kg | 60,5 kg | 9,8 % |
| Hidracina 28 / **45** / 91 / 142 / 353 kg | 80397-1 / **80274-1** (**de serie**) / 80428-1 / 80325-1 / 80407-1 | — | 4,5 / 6,7 / 13,2 / 20,0 / 35,4 kg | 16 / 15 / 14 / 14 / 10 % |
| LMP-103S 28 / 56 kg | 2 / 4 × 80498-1 | — | 5,4 / 10,9 kg | 19 % |

**Reglas.** Un hueco de tanque se cambia por un tanque del mismo sistema. El par, con helio regulado, solo se cambia por otro par. El tanque de purga admite hidracina o LMP-103S, porque los dos son tanques de diafragma. Si se cambia el propelente, el que había se va con el tanque viejo. El tanque nuevo llega de la estación lleno y presurizado: es el último paso de la cadena de montaje.

### 1.9 Recomendación: la propulsión de serie

**Qué hacen las naves reales que se posan en cuerpos pequeños:**

| Nave | Masa | Propulsión |
| --- | --- | --- |
| NEAR Shoemaker (se posó en Eros a 1,5–1,8 m/s) | 487 kg en seco; 209 kg de hidracina y 109 kg de NTO | Modo dual: un motor de 450 N de hidracina y NTO, más RCS de hidracina; 1450 m/s ([Wikipedia](https://en.wikipedia.org/wiki/NEAR_Shoemaker)) |
| MESSENGER | 1108 kg al lanzar, 608 kg de propelente y helio | LEROS 1b de modo dual (645 N, 317 s), RCS de hidracina de 22 y 4,4 N ([Wikipedia](https://en.wikipedia.org/wiki/MESSENGER)). Los tanques 80433-1 y la botella 80445-1 son de MESSENGER |
| OSIRIS-REx (tocó Bennu a 10 cm/s y se fue) | 880 kg en seco, 1230 kg de hidracina y helio | Solo hidracina: 4 MR-107S, 6 MR-106L, 16 MR-111G ([Wikipedia](https://en.wikipedia.org/wiki/OSIRIS-REx), Space Foundation) |
| Cassini | 2523 kg en seco | Dos R-4D con MMH/NTO, más RCS de hidracina aparte; 2352 m/s ([Wikipedia](https://en.wikipedia.org/wiki/Cassini%E2%80%93Huygens)) |
| Peregrine (lunar) | 1283 kg al lanzar, hasta 450 kg de MMH/MON-25 | 5 × 667 N y 12 RCS de 45 N del mismo par. Falló una válvula entre el helio y el oxidante, y el tanque de oxidante se rompió ([Wikipedia](https://en.wikipedia.org/wiki/Peregrine_Mission_One)) |
| Módulo lunar, ascenso | 2150 kg en seco | 16 kN con A-50/NTO, y RCS aparte de 16 × 440 N |

**La propulsión de serie de la sonda** (`ship/data/explorer.ts`) es la de Cassini, con piezas de MESSENGER y de Dawn:

- **Motor principal:** R-4D-15 HiPAT, de 445 N y 322 s. Es el MMH/NTO con más Isp que se fabrica, y su cámara de renio e iridio aguanta 7200 s seguidos.
- **Tanques:** el par de MESSENGER, 2 × 80433-1, con 438 kg de MMH/NTO y la botella de helio 80586-1.
- **RCS:** 24 × MR-106L de hidracina, el mismo modelo que usó OSIRIS-REx en Bennu. Van en su propio tanque de purga, el 80274-1 de Dawn, con 45 kg.

**Por qué esta combinación:**

- Los hipergólicos encienden siempre y sin encendedor, y se guardan semanas acoplados sin evaporarse.
- Un motor de 445 N sobra para Bennu: la gravedad de su superficie se mide en µm/s².
- La hidracina de los RCS es una reserva aparte, como los RCS del módulo lunar. Si el par se vacía, la sonda aún puede orientarse, frenar y posarse.

El modo dual de NEAR y MESSENGER sería un poco más eficiente, pero el juego aún no separa combustible y oxidante (pregunta abierta 7). Usar solo hidracina, como OSIRIS-REx, da menos Δv con la misma masa de tanques (ver abajo).

**Cuentas (ecuación del cohete, g₀ = 9,80665 m/s²):**

1. Sin propulsión: 1106,6 kg de cabina, energía, batería y sistemas fijos (§1.1–1.5).
2. Propulsión en seco: 5,44 (HiPAT) + 24 × 0,59 = 14,16 (RCS) + 2 × 9,07 + 7,98 + 1,55 + 5 = 32,67 (par con helio) + 6,70 (tanque de hidracina) = 58,97 kg.
3. **En seco: 1165,6 kg.** Llena: 1165,6 + 438 + 45 = **1648,6 kg**.
4. Δv del motor principal: 322 × 9,80665 × ln(1648,6 / (1648,6 − 438)) = 3157,7 × ln(1,3618) = 3157,7 × 0,3088 = **975 m/s**.
5. Aceleración del motor: 445 / 1648,6 = **0,27 m/s²** con todo lleno, y 445 / 1210,6 = 0,37 m/s² con el par vacío.
6. RCS al trasladarse: 2 × 22 / 1648,6 = **0,027 m/s²**.

| | Antes (R-4D y tanques de juego) | Ahora (piezas reales) |
| --- | --- | --- |
| En seco / llena | 1147 / 1367 kg | 1166 / 1649 kg |
| Propelente del motor | 180 kg (valor de juego) | 438 kg (2 × 199,1 L × 1159 kg/m³ × 0,95) |
| Masa de tanques | 18 + 5 kg (valor de juego) | 32,7 + 6,7 kg (catálogo, con el helio) |
| Δv | 432 m/s | **975 m/s** |
| Aceleración del motor | 0,36 m/s² | 0,27 m/s² |
| Aceleración de los RCS | 0,032 m/s² | 0,027 m/s² |

**Alternativas con la misma sonda** (calculadas con el juego, con los tanques llenos):

| Cambio | Δv | Aceleración del motor |
| --- | --- | --- |
| R-4D-11 en vez del HiPAT | 955 m/s | 0,30 m/s² |
| ArianeGroup 400N | 973 m/s | 0,26 m/s² |
| R-42 | 923 m/s | 0,54 m/s² |
| AJ10-190 (118 kg) | 886 m/s | 15,2 m/s²: absurdo para una sonda |
| Par de 208 / 288 / 620 kg | 503 / 672 / 1282 m/s | 0,30 / 0,30 / 0,24 m/s² |
| Solo hidracina, como OSIRIS-REx: un MR-107S y el 80407-1 con 353 kg (cuenta a mano) | 225 × 9,80665 × ln(1510 / 1157) = 587 m/s | 0,18 m/s² |
| Todo MMH/NTO: RCS ArianeGroup 10N del par, sin tanque de hidracina (cuenta a mano) | ≈ 1017 m/s, pero los RCS gastan del mismo par | 0,28 m/s² |

Un salto del piloto automático gasta como mucho 2 × 25 m/s (`TRANSFER_TUNING`). Con 975 m/s caben unos 19 saltos completos; antes cabían 8.

## 2. Qué se fabrica con la roca y qué llega en kits

| Pieza | De la roca | Importado (kits) |
| --- | --- | --- |
| Cabina de acero | Hierro y níquel (carbonilo) | 2 kits: ventanas y juntas |
| Cabina de CFRP | Carbono | 4 kits de resina + 1 de herrajes |
| Cabinas de aluminio o titanio | Herrajes de acero | La chapa: 1 kit por cada 25 kg (valor de juego); 8 kits la de 2195 |
| Whipple de acero | Hierro | Nada |
| Whipple de aluminio | Soportes de acero | La lámina (4 kits) |
| Alas solares | Paneles y mástiles de carbono | Las células: 1 kit por cada 500 W (sonda) o 10 kW (nodriza) |
| Baterías | Cajas de acero | Las células: 1 kit por kWh |
| MMRTG / Kilopower | Aletas y blindaje de acero | El combustible nuclear: 20 / 40 kits |
| Blindaje de agua / polietileno / escoria | Todo | 2 kits de bolsas y redes |
| Motores y RCS | El cuerpo, impreso con hierro y níquel | 2 kits de válvulas y electrónica (4 un juego de RCS), más 1 por cámara de metal refractario o noble (niobio, renio e iridio, platino; 2 un juego de RCS). Los de monopropelente traen el lecho catalizador de iridio en el kit |
| Tanques de propelente | Soportes de acero (el 10 % de la masa, valor de juego) | Los hemisferios de titanio (1 kit cada 25 kg), 1 kit de diafragma o PMD y, en un par, la botella de helio y 1 kit de regulador |
| Propelente | Hidracina y NTO en la planta, con el nitrógeno de la roca (poco: 0,23–0,25 %) | MMH, LMP-103S, helio y xenón ([estacion.md](estacion.md#planta-de-propelente-y-repostaje)) |

Las recetas, el rendimiento (0,8) y las horas son **valores de juego** (`station/data/blueprints.ts`). El reparto entre lo que da la roca y lo que hay que importar sigue la idea de Metzger et al. de una industria que arranca con kits de la Tierra ([arXiv](https://arxiv.org/abs/1612.03238)).

## 3. Qué huecos se cambian y por qué

**Primera tanda (hecha):**

| Nave | Hueco | Por qué se cambia | Efecto real en el juego |
| --- | --- | --- | --- |
| Sonda | **Cabina** | Es la mayor masa que se elige, y el material decide si se fabrica aquí (acero, CFRP) o se importa (Al-Li, Ti) | Masa, Δv, aceleración, y el diámetro crítico de la pared (daño de las piedras) |
| Sonda | **Fuente de energía** | Las alas existían sin modelo. Ahora hay una elección real entre sol, radioisótopos o solo batería | Balance de energía en la bahía, a 1,13 UA; masa |
| Sonda | **Batería** | Duración sin sol; la de plata-zinc enseña qué es una batería primaria | Horas que dura el déficit; masa |
| Sonda | **Escudo contra micrometeoritos** | Elección clásica de masa frente a protección, con ecuaciones de la NASA | El daño de los escombros de un asteroide enfadado baja al 13–16 %; masa |
| Nodriza | **Energía auxiliar** | El reactor limita cuántos propulsores encienden; el sol a 1,1 UA es ligero | kW libres para propulsión → propulsores encendidos, empuje; masa → Δv |
| Nodriza | **Blindaje contra la radiación** | Las 60 t de agua eran la mayor partida estimada del anillo | Dosis de la tripulación y años hasta el límite de 600 mSv; masa ×2 por el gemelo → Δv |

**Lo que no se cambia todavía, y por qué:**

- **Radio:** la sonda solo habla con la nodriza, a pocos km. Una antena mayor no cambia nada mientras no haya un enlace con la Tierra o con sondas lejanas.
- **Acople:** solo hay un sistema real compatible con IDSS (NDS, 340 kg). Un probe-drogue como el de Apolo sería más ligero, pero no encaja en los puertos de la nodriza ni de la estación.
- **Tren de aterrizaje:** tendría sentido si el tren cambiara la velocidad máxima de aterrizaje (`flight/domain/contact.ts`). Es el siguiente candidato.
- **Pila de combustible:** necesita modelar los reactivos que se gastan y el agua que sale. Encaja bien con el soporte vital de la nodriza, pero eso es otro trabajo.
- **Soporte vital de ciclo cerrado de la nodriza:** primero hay que conseguir cifras de masa y potencia del CDRA y del WPA.
- **Blindaje de la sonda contra la radiación:** en salidas de horas, la dosis es casi nula y el blindaje pesa toneladas.

## 4. Qué cambia en el juego

- **Masa de la sonda:** pasa de 461 a 1147 kg en seco y de 681 a 1367 kg llena. El Δv del R-4D baja de ~940 a **432 m/s**. Con el motor principal acelera 0,36 m/s² (antes 0,72), y con los RCS 0,032 m/s² (antes 0,065). La sonda es más lenta de manejar. El MR-107T recupera la agilidad a cambio de hidracina.
- **Propulsión real (13 de noviembre):** con el HiPAT, el par de MESSENGER y el tanque de Dawn, la sonda pesa 1166 kg en seco y 1649 kg llena: **975 m/s**, 0,27 m/s² con el motor y 0,027 m/s² con los RCS (§1.9).
  - **Bahía:** la ficha del motor y de los RCS da el empuje con su intervalo, el Isp (y si se usa el valor bajo), la O/F, la aceleración, la vida y los encendidos, la cámara, el consumo, la presión de entrada y el historial de vuelo. La del tanque da la cuenta de la capacidad, los tanques del catálogo, la línea de helio con su cuenta y el llenado.
  - **Cambiar tanques:** un tanque solo se cambia por otro del mismo sistema. El que entra llega lleno de la estación; el que sale se lleva su parte del propelente.
  - **Repostar (13 de noviembre):** atracada en la estación, la sonda rellena sus tanques sin cambiarlos (`Ship.refuel`, nunca por encima de la capacidad). El par se carga a O/F 1,65 (0,377 kg de MMH y 0,623 kg de NTO por kg) más 2,8 g de helio por kg para rellenar la botella (el gas que empujó el propelente se purga). Los tanques de purga de hidracina y LMP-103S no gastan gas: el líquido que entra vuelve a comprimir el suyo. La nodriza rellena su xenón (`Mothership.refuel`). Ver [estacion.md](estacion.md#planta-de-propelente-y-repostaje).
  - **Asistente de aterrizaje:** con la sonda más pesada, el controlador de antes (un PD fijo de 2,5 s) se pasaba de largo y no llegaba a nivelar en 40 s. Ahora limita la velocidad de giro a la que los RCS pueden frenar en el ángulo que queda, con la mitad de su aceleración angular real (par ÷ inercia). Una nave más pesada gira más despacio en vez de oscilar. No se ha tocado ningún número de las piezas.
  - **Capturas:** `docs/screenshots/motores-{1-motor,2-motor-ficha,3-tanque,4-tanque-ficha,5-rcs}-{mobile,desktop}.png`.
  - **HUD:** los propelentes que se muestran salen de los tanques montados, con quién bebe de cada uno («Hidracina (RCS)», «LMP-103S (RCS)»).
- **Bahía (móvil primero):** la ficha muestra primero los datos clave y las acciones. Los materiales, el historial de vuelo, las cuentas y la lista de consumos van en «Ficha completa y fuentes», plegada. En el iPhone 13 las acciones se ven sin hacer scroll en la mayoría de las piezas.
  - **Casco:** ahora es la cabina. Muestra la pared y la masa en seco como suma.
  - **Energía:** produce, consume, balance y cuánto dura la batería.
  - **Escudo:** diámetro crítico y daño que pasa.
  - **Estructura y sistemas fijos:** cada uno con su masa, su consumo y su fuente.
  - **Nodriza:** energía auxiliar (kW, propulsores encendidos) y blindaje (dosis, años hasta el límite).
- **Cambiar una pieza:** usa el mismo patrón que motor y RCS. El reto pide la masa real de la pieza nueva y predecir el Δv con Tsiolkovsky, y luego ordenar el montaje con pasos propios de cada hueco. En la nodriza se predice además cuántos propulsores encienden o la dosis anual detrás del blindaje. La pieza nueva sale del hangar y la vieja entra. «Quitar» (sin escudo, sin fuente, sin blindaje) no necesita nada del hangar.
- **Maqueta 3D:** las alas cambian con la potencia (ROSA es larga y estrecha), los MMRTG se ven como dos cilindros con aletas y el Whipple como láminas separadas de los costados y la panza.

## 5. Arquitectura

- `modules/ship/domain/equipment.ts`: tipos y masa total. `power.ts`: balance de energía y 1/r². `mmod.ts`: ecuaciones de diámetro crítico y la regla del daño. `ship.ts`: `dryMassKg` como suma de piezas; `damage(fracción, "escombros")`. `refit.ts`: huecos `cabina | energia | bateria | escudo` y piezas `equipment`.
- `modules/ship/data/equipment.ts`: el catálogo de la sonda, con fuentes y cuentas.
- `modules/mothership/domain/equipment.ts`: tabla de dosis y huecos. `mothership.ts`: `fitEquipment`, `withEquipment`, `auxiliaryKw`, `crewDoseMSvPerYear`, `yearsToCareerLimit`; el blindaje entra en el anillo habitable. `data/equipment.ts`: el catálogo. `application/equipment-refit.ts`: opciones, cambio con el hangar y cadena de retos.
- `modules/ship-bay/application/bay.ts` y `mothership-equipment.ts`: estados para la bahía. `station/data/blueprints.ts`: planos.
- Propulsión: `ship/domain/components.ts` (`ThrusterSheet`, `RealTank`, `TankBuild`, `PressurantLine`, `feedSystemOf`), `ship/domain/tanks.ts` (helio isotermo, capacidad y masa de un hueco), `ship/data/thrusters.ts` (8 motores y 7 RCS), `ship/data/tanks.ts` (tanques y botellas del catálogo), `ship/data/propellants.ts` (densidades, helio del NIST, llenados), `ship/data/parts.ts` (estantes) y `ship/data/explorer.ts` (la propulsión de serie). `Ship.refit` carga el tanque nuevo. El asistente de aterrizaje está en `flight/application/flight-computer.ts`.

## 6. Preguntas abiertas para Berón

1. **Agilidad.** La sonda pesa el doble y maniobra a la mitad. ¿La aceptamos, o damos tanques mayores o RCS más fuertes de serie (MR-107T)?
2. **Energía en vuelo.** Hoy el balance solo se ve en la bahía. ¿Queremos que la batería se gaste en vuelo y que, si se agota, se apaguen la radio o la aviónica?
3. **Acople ligero.** El NDS pesa 340 kg, un 30 % de la sonda en seco. ¿Aceptamos un sistema más ligero no estándar, aunque no encaje en la estación?
4. **Tren de aterrizaje como hueco.** ¿Patas más fuertes que permitan aterrizar más rápido, a cambio de masa?
5. **Tormentas solares.** El blindaje solo cuenta los rayos cósmicos. ¿Añadimos tormentas con un refugio, que es donde el agua de 20 cm de verdad salva?
6. **Kits.** Una cabina importada cuesta 8 kits, un MMRTG 20 y un Kilopower 40, y las misiones dan 2 o 3. ¿Es buen ritmo, o hace falta otra forma de conseguir kits?
7. **Modo dual.** NEAR y MESSENGER usaban hidracina para el motor (con NTO) y para los RCS, del mismo tanque. Para modelarlo hay que separar combustible y oxidante en el `Ship` (hoy un par es un solo depósito). Así entrarían el LEROS 1b y el HiPAT de modo dual (328 s). ¿Lo hacemos?
8. **Botellas de helio de Northrop Grumman.** Sus cifras (80586-1 y 80445-1) salen más ligeras de lo que permite el titanio macizo. Hay que confirmarlas en la hoja de cada pieza; si son erratas, la botella de serie sería el COPV PVG 40 de MT Aerospace (0,5 kg más).
9. **Criogénicos.** El LOX/metano daría unos 320–330 s, y el metano se podría sacar del carbono y el agua de la roca (Sabatier), pero se evapora. ¿Lo añadimos con evaporación en vuelo y un enfriador en la estación?
10. **Repostaje** (resuelto, 2026-11-13). Atracada, la estación rellena los tanques desde su almacén con una cadena de retos y horas de trasvase. La planta hace hidracina y NTO con el nitrógeno de Bennu (escaso); el MMH, el LMP-103S, el helio y el xenón llegan importados. Detalles y fuentes en [estacion.md](estacion.md#planta-de-propelente-y-repostaje).
11. **Encendidos.** El MR-80B solo tiene 10 encendidos calificados y el MR-107T, 44. Hoy solo se ve en la ficha. ¿Contamos los encendidos y avisamos?
12. **Consumo de los propulsores.** Los calentadores del lecho (16–60 W cada uno en hidracina, hasta 50 W en verde) no entran en el balance de energía. Con 24 RCS calientes serían cientos de vatios. ¿Los sumamos?
