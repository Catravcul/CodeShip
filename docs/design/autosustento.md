# Autosustento: el módulo agrícola y el laboratorio de biología

Petición del diseñador (2026-11-13): que el área agrícola dé **todo lo que pueda** (comida, oxígeno, materia prima para fabricar), que la estación sea **lo más autosuficiente posible** y que un **laboratorio de biología** use sistemas vivos para sostener los recursos.

La biología se queda a nivel de juego: entradas y salidas por hora, potencia, masa, rendimientos medidos y su fuente. No hay protocolos de laboratorio ni condiciones de cultivo; los retos hablan de energía, balance y a qué sistema va cada salida.

## Cómo se juega

- **Planos → Equipo**: el **laboratorio de biología** pide el **módulo agrícola** (y cabe en él). Cada reactor pide el laboratorio. Los hace la fundición con acero y vidrio de escoria de la roca; bombas, sensores y cepas llegan en kits.
- **Pestaña Vida** de la pantalla de la estación (y cualquier biorreactor del interior la abre): el **indicador de autosuficiencia**, la despensa, el nitrógeno y una tarjeta por máquina viva (estado, horas de ajuste que quedan, a qué ritmo rinde, qué entrada le falta, consumo y producción al día y la fuente).
- **Poner en marcha / Ajustar** abre una cadena de cuatro retos (tarea `ajustar-biorreactor`, categoría *plantas*):
  1. cuántos kWh cuesta cada kg de su salida principal (potencia ÷ salida por hora);
  2. qué entrada del almacén se acaba antes a toda marcha (o cuánto sale en un día si solo hay una entrada);
  3. a qué sistema va su salida (oxígeno → aire, cosecha → despensa, paja → bucle, resina → celda de compuestos…);
  4. la ronda de mantenimiento en orden (*revisa → ajusta el caudal → recoge…*).
- Un ajuste dura **240 h de juego**; después la máquina rinde al **50 %** hasta que se vuelve a ajustar. Los **campos de cultivo** arrancan solos al montarse (se siembran al construirlos) y también se desajustan.
- Cada máquina va a la velocidad que le permita su entrada más escasa. Funcionan con el reloj de la estación (un día cada 40 s).
- **Despensa**: con la nodriza atracada, «Enviar a la despensa» pasa la cosecha como harina (120 g por porción: dos chapatis de 60 g), la espirulina como pienso de gallinas (330 g = un día de tres gallinas a 110 g, NRC 1994) y la proteína como pienso de gatos (en gramos).
- **Resina PHB**: la fibra de carbono de la celda de compuestos lleva ahora un 40 % de resina en masa (`RECIPES.fibra`, la CFRP tiene un 50–65 % de fibra en volumen). La estación empieza con 120 kg importados y 4 kg de N en fertilizante.

## Números (al día, a toda marcha)

| Máquina | Entra | Sale | Potencia | Base |
|---|---|---|---|---|
| Campos de cultivo (60 m², trigo y papa) | 1,85 kg CO₂ · 36 g N | 1,35 kg O₂ · 0,49 kg comestible seco · 0,71 kg paja | 18 kW | [BPC de la NASA](https://ntrs.nasa.gov/citations/20040089951): 20 m² × 1200 días → 540 kg O₂, 196 kg comestibles, 285 kg no comestibles, 739 kg CO₂ |
| Fotobiorreactor de espirulina (400 L) | 0,50 kg CO₂ · 21 g N | 0,37 kg O₂ · 0,23 kg espirulina | 2,5 kW | [Planta piloto MELiSSA](https://frontiersin.org/articles/10.3389/fspas.2023.1178332/full): 0,58 g/L·día, 1,19 mmol O₂/L·h; un CO₂ por O₂ |
| Bucle de residuos MELiSSA | 0,60 kg de paja y células | 0,67 kg CO₂ · 17,9 g N | 2 kW | [Lunar Palace 365](https://www.biorxiv.org/content/10.1101/2021.01.12.426282v1.full-text): degrada el 67 %, ~400 g secos y ~670 g CO₂ al día; 99,7 % del N recuperado; [MELiSSA](https://en.wikipedia.org/wiki/MELiSSA) |
| Biorreactor de resina PHB (10 L) | 0,29 kg H₂ · 1,66 kg O₂ · 0,76 kg CO₂ | 0,37 kg resina · 0,18 kg células al bucle | 1 kW | [C. necator autótrofo](https://www.mdpi.com/2306-5354/10/11/1304): 62 g/L de PHB en 40 h; [33 H₂ : 12 O₂ : 4 CO₂](https://catalog.lib.kyushu-u.ac.jp/opac_download_md/24037/p055.pdf) |
| Reactor de proteína tipo Solein (40 L) | 0,31 kg H₂ · 1,42 kg O₂ · 1,29 kg CO₂ · 0,10 kg NH₃ | 0,72 kg (50 % proteína) | 1,5 kW | [Solar Foods](https://en.wikipedia.org/wiki/Solar_Foods); estequiometría de Takeshita et al. 1993 |
| Tanques de biominería | 0,48 kg mineral de Ni · 1,9 kg mineral de Fe | 0,38 kg Ni · 1,15 kg Fe | 0,5 kW | [BioRock](https://link.springer.com/10.1038/s41467-020-19276-w) (ISS, 21 días); rendimientos 80 % / 60 %: valores de juego |

Una persona (BVAD, [Anderson et al. 2018](https://ntrs.nasa.gov/citations/20180001338)): 0,816 kg O₂ y 1,04 kg CO₂ al día; ~3,8 kg de agua, de la que el ECLSS de la ISS recupera el 98 % ([NASA 2023](https://phys.org/news/2023-06-nasa-recovery-milestone-international-space.pdf)). La comida se mide en kcal (USDA: harina 3400, espirulina 2900, proteína 3575 kcal/kg) frente a lo que comen la tripulación y los animales de la nodriza.

**Lo que sale de jugar con todo montado** (prueba de Playwright, 1 tripulante, 36 h):

- **Comida 100 %**: ~4900 kcal al día frente a ~4100 de Doménica, gatos, perros y gallinas.
- **CO₂ 100 %**: los cultivos y reactores se comen 3,7 kg al día, mucho más de lo que exhala una persona (1,04). Con una sola persona los campos se quedan cortos de CO₂; el **hielo de CO₂ de los cometas** (rama `cometas-importacion`, ya en `integracion`) se sublima para ellos cuando hace falta.
- **Agua 100 %** con el bucle en marcha (98 % sin él), como en Lunar Palace 365.
- **Oxígeno 0 % neto**: plantas y espirulina dan 1,72 kg al día, pero las bacterias del hidrógeno (PHB y proteína) respiran 3,08 kg. Sin ellas, los campos solos cubren a una persona (1,35 > 0,82). El resto lo da el electrolizador de la planta de propelente.
- **Resina**: 0,37 kg al día; tarda en pesar frente a los 120 kg importados del principio.

## Nitrógeno: el bucle no lo cierra

El bucle solo devuelve el nitrógeno que traen los residuos: **~0,74 g N/h** frente a los **~1,5 g N/h** que comen los campos (y la espirulina y el PHB piden más). Con todo montado, el indicador marca **~23 % local**. El resto aparece tal cual como **fertilizante importado**.

Qué lo cierra:
- **Amoníaco del almacén** («Abonar con amoníaco», activado por defecto): cuando falta fertilizante, la estación lo hace con amoníaco (14 kg de N por cada 17 kg de NH₃). Ese amoníaco llega de los **cometas** (pestaña Importar, `"Ammonia (ice and ammonium salts)" → amoniaco`) o de la planta de propelente con el nitrógeno de la roca. En el indicador cuenta como **local**.
- **Gancho** `BioOps.nitrogenSources`: cualquier fuente continua (`{ id, label, kgNPerDay, local }`) se suma al indicador sin tocar el dominio.

## Fuentes

[BPC](https://ntrs.nasa.gov/citations/20040089951) · [Wheeler 2021, cultivos por persona](https://www.frontiersin.org/journals/astronomy-and-space-sciences/articles/10.3389/fspas.2021.734343/full) · [Lunar Palace 365](https://www.biorxiv.org/content/10.1101/2021.01.12.426282v1.full-text) · [MELiSSA](https://en.wikipedia.org/wiki/MELiSSA) · [Limnospira en la planta piloto](https://frontiersin.org/articles/10.3389/fspas.2023.1178332/full) · [PHB autótrofo](https://www.mdpi.com/2306-5354/10/11/1304) · [Estequiometría knallgas](https://catalog.lib.kyushu-u.ac.jp/opac_download_md/24037/p055.pdf) · [BioRock](https://link.springer.com/10.1038/s41467-020-19276-w) · [Solein](https://en.wikipedia.org/wiki/Solar_Foods) · [ECLSS de la ISS](https://en.wikipedia.org/wiki/ISS_ECLSS) · [Agua al 98 %](https://phys.org/news/2023-06-nasa-recovery-milestone-international-space.pdf) · [BVAD](https://ntrs.nasa.gov/citations/20180001338) · [Guantera LSG](https://www.nasa.gov/humans-in-space/partnership-teamwork-enable-landmark-science-glovebox-launch-to-space-station) · [CFRP](https://en.wikipedia.org/wiki/Carbon-fiber_reinforced_polymer) · [PHB](https://en.wikipedia.org/wiki/Polyhydroxybutyrate). Todas en `src/modules/station/data/bio-sources.ts`.

**Valores de juego** (marcados en los datos): masa, potencia, recetas y horas de cada equipo; 3 % de N en la biomasa seca; escala de cada reactor (60 m², 400 L, 10 L, 40 L); 240 h de ajuste y 50 % desajustado; rendimientos de la biominería; 40 % de resina en la fibra; tamaño de las porciones de la despensa; 1 tripulante en la estación.

## Código

- Dominio: `domain/bioreactor.ts` (`BioLab`, `selfSufficiencyGauge`, `NitrogenSource`); `Blueprint.requiresModule` y `StationOutfit.missingModule`.
- Datos: `data/bio.ts` (procesos, necesidades, destinos, despensa), `data/bio-equipment.ts`, `data/bio-materials.ts`, `data/bio-sources.ts`, `BIO_BLUEPRINTS` en `data/outfit.ts`.
- Aplicación: `application/bio-ops.ts` (`BioOps`), `bioTuneChore` en `application/challenges.ts`.
- Interfaz: pestaña Vida en `src/station-screen.ts` (+ `src/ui/station-life.css`), frentes de los biorreactores en `src/adapters/three/interior/station-rooms.ts`, conexión en `src/main.ts`.

## Capturas

`docs/screenshots/autosustento-{1-vida,2-biorreactores,3-reto,4-planos,5-interior}-{mobile,desktop}.png` (iPhone 13 y 1280×800; la estación se hizo crecer por código para verla entera).

## Preguntas abiertas

1. **Oxígeno de las bacterias del hidrógeno**: PHB y proteína respiran más O₂ del que dan las plantas. ¿Se deja así (el electrolizador lo pone) o se limita cuánto pueden correr a la vez?
2. **CO₂ con poca tripulación**: con una persona los campos quedan cortos de CO₂ sin hielo de cometa. ¿Más tripulantes en la estación, o el CO₂ que exhala la tripulación de la nodriza cuando atraca?
3. **Fijación de nitrógeno**: *Anabaena* fija el N₂ del aire ([Verseux et al. 2021](https://www.frontiersin.org/articles/10.3389/fmicb.2021.611798)); podría ser un reactor futuro que cierre el nitrógeno sin cometas.
4. **Biominería**: compite por bastidores en el módulo de fabricación; ¿se queda en el módulo de la planta?
5. **¿Despensa automática?** Ahora el envío a la nodriza es un botón; ¿debe ir solo cada vez que atraca?
6. **¿Guardar partida?** El estado del `BioLab` (ajustes, lo fabricado) aún no se guarda.
