# Componentes reales: qué pesa la sonda y qué se puede cambiar

Petición de diseño (2026-11-12): «La sonda debería pesar lo que pesan sus componentes; lo ideal es investigar los componentes reales. Por ahora se pueden cambiar los propulsores y el motor; ¿qué otros componentes pueden ser intercambiables? ¿La cabina? ¿Las alas? ¿Los escudos? Investiga componentes de sondas, naves nodriza o cohetes, lo más reales posible: necesitamos costes de energía, masas, materiales, etc.».

**Respuesta corta.** La sonda ya no tiene un casco de 420 kg «de relleno». Su masa en seco es la suma de lo que lleva montado, y cada pieza dice de dónde sale su número. Pasa de **461 kg** en seco (681 kg con los tanques llenos) a **1147 kg** (1367 kg). Sigue siendo más ligera que la etapa de ascenso del módulo lunar, que pesaba 2150 kg en seco. Hay **cuatro huecos nuevos en la sonda**: cabina, fuente de energía, batería y escudo contra micrometeoritos. En la **nodriza** hay **dos**: energía auxiliar y blindaje contra la radiación. Todos se cambian en la bahía con una cadena de retos y piezas del hangar, y todos tienen plano en la estación.

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

## 6. Preguntas abiertas para Berón

1. **Agilidad.** La sonda pesa el doble y maniobra a la mitad. ¿La aceptamos, o damos tanques mayores o RCS más fuertes de serie (MR-107T)?
2. **Energía en vuelo.** Hoy el balance solo se ve en la bahía. ¿Queremos que la batería se gaste en vuelo y que, si se agota, se apaguen la radio o la aviónica?
3. **Acople ligero.** El NDS pesa 340 kg, un 30 % de la sonda en seco. ¿Aceptamos un sistema más ligero no estándar, aunque no encaje en la estación?
4. **Tren de aterrizaje como hueco.** ¿Patas más fuertes que permitan aterrizar más rápido, a cambio de masa?
5. **Tormentas solares.** El blindaje solo cuenta los rayos cósmicos. ¿Añadimos tormentas con un refugio, que es donde el agua de 20 cm de verdad salva?
6. **Kits.** Una cabina importada cuesta 8 kits, un MMRTG 20 y un Kilopower 40, y las misiones dan 2 o 3. ¿Es buen ritmo, o hace falta otra forma de conseguir kits?
