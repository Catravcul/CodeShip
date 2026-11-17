# Soporte vital real (ECLSS): fuentes y cifras

Rama `eclss-real`, fase 1 del plan de [naves-reales.md](../design/naves-reales.md) §3. El diseño está en [design/soporte-vital.md](../design/soporte-vital.md).

Todas las cifras están en el código (`src/modules/life-support/data/` y `domain/`), cada una con su fuente (`ECLSS_SOURCES`). Las etiquetas siguen la regla de datos: **real** (hardware que ha volado), **en desarrollo**, **licencia** o **ficción**. Las máquinas de esta rama son todas **reales**. Los valores que solo hacen jugable el juego llevan la nota «Valor de juego». Los que no encontramos publicados llevan «Estimación nuestra».

## 1. Lo que gasta y produce una persona al día

Fuente principal: el modelo MetMan de la NASA ([NTRS 20190027563](https://ntrs.nasa.gov/api/citations/20190027563/downloads/20190027563.pdf), tabla 1). Corresponde a un astronauta de 82 kg que hace 90 min de ejercicio al día.

| Concepto | Por persona y día | Fuente |
| --- | --- | --- |
| O₂ consumido | **0,89 kg** | MetMan, tabla 1 |
| CO₂ producido | **1,08 kg** | MetMan, tabla 1 |
| Comida envasada | **2,39 kg** (0,43 kg de envase) | BVAD, tabla 4-53, citado en MetMan |
| Agua para beber y rehidratar | **2,5 L** como mínimo (600 mL calientes por comida) | NASA-STD-3001, en el [brief de agua de la OCHMO](https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf) |
| Agua de aseo | **1,3 L** (cuenta nuestra: 3,8 L de la ISS − 2,5 L) | [Marshall](https://www.nasa.gov/centers/marshall/pdf/174687main_eclss_facts.pdf) |
| Orina | **1,40 kg** | MetMan, sección II.A |
| Vapor de sudor y respiración (condensado) | **2,53 kg** | MetMan, tabla 1 |
| Energía metabólica (calor) | **12 778 kJ** (≈ 148 W): 6288 kJ sensibles y 6134 kJ latentes | MetMan, tabla 1 |
| Contaminantes traza | Sin cifra en la fuente: en el juego, índice respecto a su límite (SMAC) | Valor de juego |

### Umbrales de salud

| Qué | Umbral | Fuente |
| --- | --- | --- |
| CO₂, límite de 1 h | **3 mmHg** (NASA-STD-3001 V2 6004) | [OCHMO CO₂](https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/) |
| CO₂, dolores de cabeza | **2,8–4,5 mmHg**; menos del 1 % de riesgo bajo 2,5 mmHg (media de 7 días) | ídem |
| CO₂, cansancio, malestar y náuseas | **> 4,5 mmHg** | ídem |
| Alarma del juego | **5,3 mmHg** (0,7 % a 101,3 kPa): el antiguo límite de 180 días de la ISS. La cifra la pide el diseño; el brief cita los SMAC sin dar el número | ídem |
| O₂ inspirado | normoxia 149 mmHg; límite inferior absoluto **122 mmHg** (16,3 kPa) | [OCHMO atmósfera](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf) |
| Deshidratación | perder el **2,5 %** del peso en agua empeora las decisiones y la concentración | [OCHMO agua](https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf) |

## 2. Aire: OGA, Sabatier, CDRA y TCCS

- **OGA** (generador de oxígeno): electrólisis del agua. Produce **2,3–9,2 kg/día** en continuo y **5,4 kg/día** en ciclo; eso da para 4 personas en nominal y 7 al máximo. Consume **3573 W** procesando y **382 W** en espera ([NTRS 20080036243](https://ntrs.nasa.gov/api/citations/20080036243/downloads/20080036243.pdf)).
  - Averías reales ([ICES-2024-141](https://ntrs.nasa.gov/api/citations/20240007995/downloads/ICES2024141%20ISS%20ECLS%20Presentaton%20RevA.pdf)):
    - bombas con los engranajes bloqueados por fosfato de níquel;
    - el regulador del domo de H₂, con su límite bajado por software a **19 psia**;
    - la pila de celdas, que pierde voltaje.
  - La estequiometría es nuestra: 1,125 kg de agua por kg de O₂ y 0,125 kg de H₂.
- **Sabatier**: CO₂ + 4 H₂ → CH₄ + 2 H₂O. Convierte cerca del **50 %** del CO₂ ([ISS ECLSS](https://en.wikipedia.org/wiki/ISS_ECLSS)). Da unos **0,352 kg de agua por persona y día**, estimados por los autores de [Frontiers 2024](https://frontiersin.org/articles/10.3389/frspt.2024.1461389/full). La avería del compresor de CO₂ es nuestra versión de un fallo plausible: la fuente no lo detalla.
- **CDRA**: cuatro lechos (dos desecantes y dos de zeolita), con medio ciclo de **90 min**. El CDRA-4EU quitó **4,8 kg/día a 3 mmHg**, 4,1 personas a 2 torr y 10,5 a 5 torr ([NTRS 20150016500](https://ntrs.nasa.gov/api/citations/20150016500/downloads/20150016500.pdf)). Con los dos lechos cubre a seis personas ([OCHMO CO₂](https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/)).
  - Averías reales (ICES-2024-141):
    - la válvula selectora de aire 103, que se llevó por delante la soplante;
    - la presión diferencial de los lechos, que subió en 2023 y obligó a limpiarlos.
- **TCCS**: carbón, oxidador catalítico y lecho de LiOH. La soplante mueve **15,3 m³/h** y un tercio pasa por el oxidador. El lecho de LiOH se hace polvo en la entrada ([NTRS 20070019823](https://ntrs.nasa.gov/api/citations/20070019823/downloads/20070019823.pdf)).

## 3. Agua: UPA, WPA y BPA

Fuente: [ICES-2022-098](https://ntrs.nasa.gov/api/citations/20220006163/downloads/ICES%202022-098%20Status%20of%20ISS%20Water%20Management%20and%20Recovery_Final%20Manuscript.pdf).

- **UPA**: recupera el **87 %** del agua de la orina desde marzo de 2020 y está pensado para **9 kg/día**.
  - Averías: el **conjunto de destilación** (conductividad alta y sensor de vacío desviado), la **PCPA** (corriente alta tras unas **2300 h**) y la bomba de fluidos.
- **WPA**: dio **7548 L** en un año.
  - Su **lecho de multifiltración** llega a la primera ruptura iónica a unas **9000 lb** de agua tratada: es el mantenimiento del juego.
  - Otras averías: fugas en el reactor catalítico y en el **separador de gas y líquido**.
  - Reserva mínima de agua potable: **818 L**; en 2022 había 1200 L guardados.
- **BPA**: con él, la recuperación llegó al **98 %** en junio de 2023; antes era del 93–94 % ([phys.org](https://phys.org/news/2023-06-nasa-recovery-milestone-international-space.pdf)).
- Comprobación del modelo: con la fracción del WPA que da el 98 % total, quitar el BPA da el **94 %**, el valor de antes de 2023 (test SV-03).

## 4. Calor, incendios y comida

- **Control térmico** ([NASA ATCS](https://www.nasa.gov/wp-content/uploads/2021/02/473486main_iss_atcs_overview.pdf)):
  - Lazos de agua interiores: el bajo a **4 °C** y el medio a **17 °C**.
  - Amoníaco exterior a **2,8 °C**, con **70 kW** (35 kW por lazo).
  - Módulo de bomba exterior: **354 kg**.
  - Anomalías de los lazos interiores: válvula de retención abierta y fugas en los conectores ([NTRS 20040086485](https://ntrs.nasa.gov/api/citations/20040086485/downloads/20040086485.pdf)).
- **Incendios** ([NTRS 20030053429](https://ntrs.nasa.gov/api/citations/20030053429/downloads/20030053429.pdf)):
  - Detectores láser de humo con autoprueba (BIT).
  - Extintores de CO₂ de **6 lb a 850 psi** que se vacían en unos **45 s**.
  - Mascarillas de oxígeno de 15 min.
  - Protocolo: cortar la corriente, aislar la ventilación y cortar el O₂ y el N₂.
- **Comida**: la de la ISS va envasada, y se rehidrata con agua caliente (600 mL por comida) y se calienta en el calentador. No se recicla nada.

## 5. Reabastecimiento y refugio

Son cuentas nuestras con las cifras anteriores (`resupply`, test SV-06). Por persona y año:

- **Comida**: 2,39 × 365 = **872 kg**. Cuatro personas comen **3,5 t**.
- **Agua perdida**: 3,8 × 2 % × 365 ≈ **28 kg**. Sin reciclar serían 1,4 t.
- **Agua neta para el O₂**: ≈ **182 kg**. Es lo que el OGA electroliza menos lo que devuelve el Sabatier. En la realidad, parte vuelve como agua metabólica: el modelo no lo cuenta.
- **Fugas**: ≈ **4 kg de O₂** y **15 kg de N₂**. Parten de la estimación de 0,011 kg de O₂ por persona y día de Frontiers 2024, contada como aire.
- **Repuestos**: uno de cada modo de fallo como mínimo, más los que tocan con los ritmos de avería del juego. No encontramos la masa de cada ORU publicada.

**Refugio contra la radiación** ([RadWorks, NTRS 20150001237](https://ntrs.nasa.gov/api/citations/20150001237/downloads/20150001237.pdf)):
- Paredes de agua de **9,3–10,8 g/cm²** quitan el **50 %** de la dosis efectiva de las tormentas solares históricas.
- El 70 % pide **25,6 g/cm²**, que no es práctico.
- Forrar un camarote del tamaño de un bastidor ISPR a 10,8 g/cm² pide unos **1000 kg** de agua: la reserva de agua potable es el blindaje.

## 6. Lo que no encontramos (estimaciones nuestras)

No hemos encontrado publicadas estas potencias y masas. En los datos llevan la nota «Estimación nuestra»:

| Máquina | Potencia | Masa |
| --- | --- | --- |
| CDRA | 860 W | 200 kg |
| Sabatier | 300 W | 230 kg |
| TCCS | 160 W | 75 kg |
| UPA | 315 W | 500 kg |
| WPA | 320 W | 550 kg |
| BPA | 200 W | 150 kg |
| Bomba del control térmico interior | 300 W | (se usa la del módulo exterior) |
| Galería | 200 W | 40 kg |

Tampoco encontramos la masa del rack del OGA (dato: 676 kg, estimación). La tabla de hardware del BVAD (NASA/TP-2015-218570) debería tenerlas; el PDF no se pudo leer entero desde aquí. Queda como tarea: sustituir estas cifras por las del BVAD o las de Bagdigian et al. (ICES-2015-094).

Las averías ya no van al azar: cada modo tiene una causa y una vida (tabla en [design/soporte-vital.md](../design/soporte-vital.md), «Averías con causa»). Solo dos vidas son reales: la PCPA (≈ 2300 h, ICES-2022-098) y el lecho de multifiltración (≈ 9000 lb hasta la primera ruptura iónica). Las demás son estimaciones nuestras: no hay MTBF publicados de cada ORU en las fuentes leídas.

## 7. Causas de las averías (lo que dicen las fuentes)

- **OGA** ([ICES-2024-141](https://ntrs.nasa.gov/api/citations/20240007995/downloads/ICES2024141%20ISS%20ECLS%20Presentaton%20RevA.pdf)): las bombas SN 3 y 5 se bloquearon por fosfato de níquel, que viene de la degradación del niquelado químico de los conectores mojados. El regulador del domo de H₂ SN 3 tenía el vástago corroído por un pasivado pobre. La pila de celdas pierde voltaje en espera por adelgazamiento de la membrana (fin de vida). El AOGA está pensado para 5 años y su lecho de resinas para 3.
- **CDRA** ([NTRS 20050210002](https://ntrs.nasa.gov/api/citations/20050210002/downloads/20050210002.pdf)): un sello del lecho desecante y adsorbente falló y dejó salir finos de zeolita, que estropearon la bomba de ahorro de aire, la válvula de retención y las válvulas selectoras. Se pusieron filtros en línea y se rediseñó la retención. Las válvulas selectoras llevaban años atascándose; en 2013 no quedaban repuestos nuevos ([NSF 2013](https://www.nasaspaceflight.com/2013/10/iss-hardware-providing-lessons-learned-deep-space-missions/)). En 2023 subió la presión diferencial de los dos CDRA y hubo que limpiar los lechos (ICES-2024-141). Los ciclos de vacío y calor rompen la zeolita en polvo ([ICES-2017-117](https://ntrs.nasa.gov/api/citations/20170009817/downloads/20170009817.pdf)).
- **Sabatier** (NSF 2013): se paró por la humedad en el acumulador de CO₂, que tapaba el paso.
- **UPA** ([ICES-2022-098](https://ntrs.nasa.gov/api/citations/20220006163/downloads/ICES%202022-098%20Status%20of%20ISS%20Water%20Management%20and%20Recovery_Final%20Manuscript.pdf)): el conjunto de destilación SN2 (2010) falló por sulfato de calcio precipitado con el pretratado de ácido sulfúrico; el SN004, por el sensor de vacío, cuyo diafragma degrada la orina pretratada. La PCPA falló por su engranaje planetario a algo más de 2300 h. La bomba de fluidos, probablemente por un tubo peristáltico roto.
- **WPA** (ICES-2022-098): el lecho de multifiltración dura hasta la ruptura iónica (≈ 9000, 16 000 y 25 000–30 000 lb) o hasta que sale DMSD (desde ≈ 7000 lb). El reactor catalítico pierde agua por sus juntas tóricas (≈ 2 años). El separador de gas y líquido dejó pasar agua al aire en 2021, sin causa raíz encontrada.
- **Filtros HEPA de cabina** (ICES-2024-141): vida de 5 años en todos los módulos, por inspección y por la presión diferencial de los ventiladores. No están en el juego como máquina.

## 8. Cargueros

- **Dragon de carga** ([Dragon 2](https://en.wikipedia.org/wiki/SpaceX_Dragon_2)): hasta 2507 kg presurizados y 800 kg en el maletero; 9,3 m³ presurizados. [CRS-28](https://en.wikipedia.org/wiki/SpaceX_CRS-28): lanzada el 5 de junio de 2023 a las 15:47 UTC y acoplada el 6 a las 09:54 (18 h); 3304 kg, de ellos 1098 kg de suministros de tripulación.
- **Cygnus** ([NG-19](https://en.wikipedia.org/wiki/Cygnus_NG-19)): 3749 kg presurizados; lanzada el 2 de agosto de 2023 a las 00:31 UTC y atracada en el CBM de nadir de Unity el 4 a las 12:28 (60 h); 1590 kg de suministros de tripulación.
- Masa de cada repuesto (ORU o lecho): no publicada; 20 kg es estimación nuestra.
