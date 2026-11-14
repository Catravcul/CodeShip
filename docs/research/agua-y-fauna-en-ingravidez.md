# Agua y fauna en ingravidez

Investigación para el **santuario espacial** ([diseño](../design/santuario-espacial.md)). Responde a las preguntas de Berón (2026-11-14): ¿se puede nadar en el espacio?, ¿sirve el agua para guardar reservas y moverse?, ¿se pueden tener peces?, ¿hacen falta «ríos» para oxigenar el agua?, ¿lo tienen más fácil la fauna abisal, los insectos y los animales nocturnos? Consultado el 14 de noviembre de 2026; la segunda ronda (§10–§13) responde a la petición de Berón del mismo día sobre fauna, amistad y biomas. Las fuentes están al final y, las que usa el código, en `src/modules/sanctuary/data/sources.ts`.

## Resumen

| Pregunta | Respuesta corta |
| --- | --- |
| ¿Se puede nadar en 0 g? | **Sí, dentro de un volumen de agua cerrado**: el agua da apoyo para empujar (en el aire no: un astronauta en medio de Kibo no llega a nada). Pero el agua **se pega a la cara**, no cae y no hay «arriba» para salir a respirar: hace falta respirar con equipo. En el EVA 23 bastaron ~1,5 L en el casco para tapar ojos, nariz y oídos. |
| ¿Necesitan los peces corriente y aireación? | **Sí, siempre circulación; en 0 g, además, sin burbujas**. Sin flotación no hay convección ni las burbujas suben: el oxígeno se agota junto al pez. El acuario de la ISS (AQH) bombea 0–0,5 L/min por tanque e intercambia gases por una membrana («pulmón artificial»). |
| ¿Lo tienen más fácil los abisales o los nocturnos? | **Los abisales, no**: necesitan 10–40 MPa y 2–4 °C; un granadero murió por una bajada de presión del 10 %. **La oscuridad sí ahorra** (sin luz que pagar, el pez ciego gasta un 27 % menos). Los **insectos nocturnos que vuelan bien** (polillas) y los detritívoros (cucarachas) son buenos candidatos; las abejas, no. |
| ¿Es viable el hangar lleno de agua? | **Lleno, no**: 20 × 14 × 20 m son **5 600 t** de agua, 6,4 veces la nodriza entera, y el hangar está al vacío. **Una parte, sí**: un tambor giratorio de 6 m de radio con 1 m de agua (≈ 346 t) es una piscina-río, una reserva y un refugio contra tormentas solares. |

## 1. Cómo se porta el agua en ingravidez

- **Manda la tensión superficial.** Sin peso, el agua libre forma esferas que tiemblan y oscilan. Lo enseñaron Don Pettit en sus «Science off the Sphere» y las tripulaciones que han metido una cámara en una bola de agua ([APS](https://www.aps.org/apsnews/2012/03/aps-outreach-website-features-exclusive-videos-from-space), [Universe Today](https://www.universetoday.com/94055/playing-with-water-in-space)).
- **Moja y trepa.** En microgravedad el mojado y la capilaridad pueden dominar el flujo: el agua que toca una pared o una piel se extiende por ella ([NASA, ciencia en microgravedad](https://www.nasa.gov/wp-content/uploads/2015/02/501343main_microgravity_science.pdf)).
- **No hay convección por densidad.** «La falta de convección inducida por la flotación es el factor dominante en microgravedad»; la convección por densidad «no puede usarse para mezclar», hay que agitar a mano o con bombas. En una caldera en órbita la separación de gas y líquido queda indeterminada (misma fuente).
- **Las burbujas no suben.** Sin flotación una burbuja se queda donde nace o la arrastra el flujo. Para separarlas hay que girar (centrífuga) o atraparlas.
- **En un anillo que gira, todo vuelve a la normalidad**, con la gravedad del giro: a = ω²r ([gravedad.md](../design/gravedad.md)). A 0,1 g las burbujas suben despacio hacia el eje y las olas son altas y lentas.

## 2. ¿Se puede nadar?

### En el aire, no

Las brazadas en el aire apenas empujan. Mark Kelly (STS-124) avisó de que en Kibo «puedes quedarte en medio y no llegar a un asidero»; la solución fue tender cuerdas ([Universe Today](https://www.universetoday.com/articles/space-station-astronauts-could-get-stranded-in-kibo)). Por eso Codeship se mueve de asidero en asidero ([ingravidez.md](../design/ingravidez.md)).

### En el agua, sí, pero es peligroso

- **Propulsión:** el agua es unas 800 veces más densa que el aire, así que una brazada siempre empuja y el agua frena en cuanto paras. En un tubo lleno de agua nunca te quedas varado. Es más lento que planear en el aire, pero controlable.
- **Respirar:** en 0 g no hay superficie «arriba» a la que salir. Una bola de agua libre envuelve la cabeza y no cae.
- **El aviso real, EVA 23** (16 de julio de 2013): por un separador obstruido, el agua de refrigeración del traje subió al casco de Luca Parmitano. Al final había **unos 1,5 L**. Primero la notó en la nuca; al girarse le tapó **ojos, oídos y nariz**, perdió la radio a ratos y volvió a la esclusa a ciegas siguiendo su cable, ya de noche orbital. Tras la investigación (49 recomendaciones) los trajes llevan una **almohadilla absorbente** y un **snorkel** ([NASA, 10 años del EVA 23](https://www.nasa.gov/history/10-years-ago-eva-23-how-a-high-visibility-close-call-cut-short-a-spacewalk/), [informe en NTRS](https://ntrs.nasa.gov/citations/20140016950), [Universe Today](https://www.universetoday.com/articles/spacesuit-leak-mishap-why-it-took-nasa-23-minutes-to-send-astronaut-to-safety)).
- **Conclusión:** nadar en 0 g es posible **con máscara completa y aire propio** (como bucear) y con una salida que quite el agua del cuerpo (chorros de aire, toallas). Sin eso, se ahoga uno con poca agua.

### En un cilindro que gira, sí, y es lo realista

**Kalpana One** (Globus, NSS) propone una **piscina cilíndrica**: un cilindro de 20–40 m de radio, con cojinetes magnéticos, que gira más deprisa que el hábitat. El agua se queda contra la pared, se nada en círculo sin fin y se puede «saltar hacia arriba» al núcleo de aire. **El agua de la piscina sirve también de refugio contra tormentas solares** ([NSS, Kalpana One](https://nss.org/kalpana-one-space-settlement/)).

## 3. Cómo podría funcionar un «túnel de agua»

| Opción | Cómo funciona | ¿Realista? |
| --- | --- | --- |
| **Tambor giratorio (piscina-río)** | Cilindro que gira: el agua forma un anillo contra la pared con superficie libre hacia el eje; dentro, aire. Se nada a lo largo del anillo; en el eje se flota | **Sí** (Kalpana One). Pide un tambor gemelo que gire al revés para no acumular momento angular, como los anillos de la nodriza |
| **Tubo lleno en 0 g** | Tubo cerrado sin aire, con bomba que mueve el agua en circuito | **Sí, con equipo de buceo**. Hay que ahogar toda burbuja (si no, se forman bolsas que viajan) y una esclusa con secado para salir |
| **Esfera libre en un módulo** | Una bola de agua de varios metros flotando en una sala | **Sí, para peces y como espectáculo**; mal para nadar: al tocar paredes las moja y se deshace en gotas, y envuelve la cara |
| **Tubo de membrana que se atraviesa en seco** | Una membrana que deja pasar a la persona sin mojarla | **Ficción** |
| **Agua sin contenedor por los pasillos** | Ríos libres que se quedan en su sitio | **Ficción**: cualquier maniobra o empujón la desprende en gotas |

**¿Ayuda el agua a moverse?** En un volumen de agua siempre hay de dónde empujar, así que no te quedas varado; pero vas más despacio que planeando entre asideros y gastas más. Su valor es otro: **juego, ejercicio** (nadar carga los músculos sin impacto) y **refugio**.

## 4. El agua como reserva y escudo

- **Reserva de la ISS:** al menos **818 L** de agua potable de contingencia; en febrero de 2022 había ~1 200 L. Un tanque de reabastecimiento (RST) lleva 73 L ([NASA, ICES 2022](https://ntrs.nasa.gov/api/citations/20220006163/downloads/ICES%202022-098%20Status%20of%20ISS%20Water%20Management%20and%20Recovery_Final%20Manuscript.pdf)). Una persona gasta ~3,8 kg de agua al día y la ISS recupera el 98 % ([autosustento.md](../design/autosustento.md)).
- **Tormentas solares (SPE):** el estudio RadWorks de NASA propone **paredes de agua de al menos 4 pulgadas** alrededor de los camarotes con bolsas hinchables llenas de la reserva. Para bajar la dosis un 50 % hacen falta **9,3–20,7 g/cm²** (9–21 cm de agua), con 1,3–1,6 t de agua por refugio. Bajarla un 70 % pide 4,3–4,7 t y lo juzgan poco práctico. La ventaja: es agua que hay que llevar de todas formas ([Simon et al., RadWorks](https://ntrs.nasa.gov/api/citations/20150001237/downloads/20150001237.pdf)).
- **Rayos cósmicos (GCR):** en el espacio profundo hacen falta **6–7 t/m²** de agua o polietileno (600–700 cm de agua) para quedarse en unos 20 mSv/año; de regolito, 10–11 t/m². En una órbita baja ecuatorial casi no hace falta escudo ([Globus y Strout 2016](https://nss.org/wp-content/uploads/Orbital-Space-Settlement-Radiation-Shielding-Globus.pdf)). El toro de Stanford usaba 1,7 m de suelo lunar, el 95 % de sus ~10 millones de toneladas ([Wikipedia](https://en.wikipedia.org/wiki/Stanford_torus)).

**Cifras para Codeship** (agua dulce, 1 m³ ≈ 1 t; `domain/water.ts`):

| Volumen | Agua | Comparación |
| --- | --- | --- |
| Hangar lleno, 20 × 14 × 20 m | **5 600 t** | 6,4 veces la nodriza (877 t); unas 7 000 veces la reserva mínima de la ISS (818 L) |
| Escudo GCR para las paredes del hangar (1 920 m² a 7 t/m²) | 13 440 t | Más del doble de llenarlo |
| Tambor-río de 6 m de radio, 10 m de largo y 1 m de agua | **346 t** | Refugio SPE en su eje: ≥ 100 g/cm² hacia fuera |
| Esfera de 4 m | 33,5 t | Cabe en el módulo agrícola B330 (6,7 m de diámetro) |
| Pared de agua de 10 cm en el módulo habitable (~72 m²) | 7,2 t | 10 g/cm²: el umbral bajo de RadWorks para −50 % de dosis SPE |
| Acuario de 1 m³ | 1 t | — |

**De dónde sale tanta agua:** la refinería saca 18 kg de agua de 20 kg de minerales de Bennu (6 h) y 19,6 kg de 20 kg de hielo de cometa (2 h) ([estacion.md](../design/estacion.md), [importacion.md](../design/importacion.md)). El remolcador trae rocas de 0,6–5 t en unas 55 h. 346 t son unos 70 viajes con rocas de hielo de 5 t; 5 600 t serían más de 1 100.

**En el vacío:** el hangar está abierto al espacio. El agua tiene que ir en un recipiente a presión por encima de su presión de vapor (unos 3,2 kPa a 25 °C) y aislada para que no se congele. En 0 g el agua **no tiene presión hidrostática**: la carga en las paredes es la del gas que se le pone encima. En el tambor a 0,1 g, 1 m de agua solo añade ρgh ≈ 1 kPa.

## 5. Vida acuática en el espacio

| Misión | Año | Qué voló | Qué pasó | Fuente |
| --- | --- | --- | --- | --- |
| Skylab 3 | 1973 | 2 mummichogs (*Fundulus heteroclitus*) y 50 huevos | Al principio nadaban en bucles; al 4.º día, normal, **con el lomo hacia las luces**. 48 de 50 huevos eclosionaron; las crías no hacían bucles y se orientaban por la luz | [Scientific American](https://www.scientificamerican.com/blog/guest-blog/the-first-fish-in-orbit/) |
| IML-2, STS-65 | 1994 | 4 medakas (*Oryzias latipes*) | **Primeros vertebrados que se aparearon en el espacio**; los huevos se desarrollaron y eclosionaron. La cepa se eligió porque **no hacía bucles** en ~20 s de vuelo parabólico y se guiaba mucho por la vista | [Ijiri 1995](https://www.jstage.jst.go.jp/article/bss/9/1/9_1_3/_article), [Nagoya](https://nagoya.repo.nii.ac.jp/records/11922) |
| Carpas doradas | 1997 (publicado) | 6 carpas doradas, algunas sin otolitos | 5 hicieron bucles hacia atrás hasta el día 12; la vista **no bastó** para evitarlos | [Biol. Sci. Space 11(4):351](https://www.jstage.jst.go.jp/article/bss/11/4/11_4_351/_article) |
| C.E.B.A.S., STS-89 y STS-90 | 1998 | Xifos (*Xiphophorus helleri*), caracoles *Biomphalaria glabrata*, ceratófilo y bacterias del filtro | Ecosistema cerrado que se sostuvo los dos vuelos; Neurolab duró 16 días | [Blüm et al., SAE 1999-01-1988](https://saemobilus.sae.org/papers/cebas-minimodule-development-realization-perspectives-1999-01-1988), [kit de prensa STS-90](https://www.nasa.gov/wp-content/uploads/2023/05/sts-090-press-kit.pdf) |
| Neurolab | 1998 | Caracoles y larvas de xifo | Los criados en órbita hicieron **piedras de gravedad más grandes** (+50 % de volumen en los caracoles) | [Wiederhold et al.](https://ntrs.nasa.gov/citations/20030068205) |
| Omegahab, Bion-M1 | 2013 | *Euglena*, ceratófilo, 40 larvas de tilapia, anfípodos *Hyalella* y caracoles | Mini-ecosistema: algas y plantas dan oxígeno, bacterias reciclan | [DLR](https://dlr.de/en/latest/news/2013/20130419_lift-off-mini-ecosystem-and-mini-satellites-en-route-to-space_6797/@@download/file) |
| AQH en Kibo (ISS) | 2012– | Medakas | Hasta 90 días y **hasta tres generaciones** nacidas en órbita; estudio de osteoclastos (pérdida de hueso) | [JAXA AQH](https://iss.jaxa.jp/en/kiboexp/pm/aqh), [JAXA](https://iss.jaxa.jp/en/kiboexp/news/medaka_starts.html), [phys.org](https://phys.org/news/2012-07-fish-friendly-facility-international-space.pdf) |
| UMAMI, SpaceX CRS-22 | 2021 | >120 calamares bobtail hawaianos | Estudio de su simbiosis con bacterias luminosas | [U. de Hawái](https://hawaii.edu/news/2021/06/24/squids-in-space) |
| Tiangong | 2024 | 4 peces cebra y 4 g de ceratófilo, tanque de 1,2 L | **43 días**, récord de un ecosistema acuático en órbita (el anterior: 16 días con xifos). Hacia el día 20 se volteaban y giraban, luego se adaptaron; pusieron huevos | [IHB-CAS](https://english.ihb.cas.cn/newsroom/itm/202501/t20250117_898908.html), [Sixth Tone](https://www.sixthtone.com/news/1016541) |

**Desorientación y luz.** Sin peso, el oído interno del pez no sabe dónde está abajo y el pez hace bucles. Muchos peces tienen la **respuesta dorsal a la luz**: ponen el lomo hacia la luz. En el Skylab eso bastó; en las carpas doradas, no. Por eso la medaka se eligió por cepa. **Regla para el juego:** en 0 g los peces necesitan luz desde un lado fijo, y un pez ciego no tiene esa ayuda.

## 6. Oxígeno sin flotación: ¿hacen falta «ríos»?

- **Cuánto oxígeno cabe:** el agua saturada a 25 °C tiene unos 8 mg/L. Los peces necesitan **≥ 5 mg/L**; sufren con 2–4 y mueren por debajo de 2 ([UF/IFAS FA27](https://ask.ifas.ufl.edu/publication/FA002/pdf)).
- **Cuánto respiran:** el modelo de tilapia de Khater et al. 2021 da unos 300–460 mg O₂/kg·h para alevines de 3 g a 24–28 °C, y 10–75 g O₂/m³·h en un sistema denso ([Scientific Reports 11:24130](https://www.nature.com/articles/s41598-021-03604-1.pdf); conversión a kg nuestra).
- **Cuánto dura sin aireación** (`oxygenReserveHours`): reserva útil = (8 − 5) mg/L × volumen; demanda = kg de pez × ritmo.
  - 1 m³ con 1 kg de pez a 460 mg/kg·h: **6,5 h**.
  - Esfera de 33,5 m³ con 2 kg: **109 h**.
  - Tambor de 346 m³ con 200 kg de tilapia: **11 h**.
- **Cómo se airea en 0 g:** no con burbujas. El AQH usa un **pulmón artificial** (membrana permeable a gases que da O₂ y quita CO₂), un **filtro biológico** con bacterias nitrificantes (NH₄ y NO₂), carbón activado, recambio de agua para el NO₃, LEDs de 0–1 000 lux con ciclo día/noche, 25–30 °C y un caudal de 0–0,5 L/min por tanque ([JAXA AQH](https://iss.jaxa.jp/en/kiboexp/pm/aqh)). Guarda una pequeña bolsa de aire atrapada en rejillas para que los peces «piquen» aire ([phys.org](https://phys.org/news/2012-07-fish-friendly-facility-international-space.pdf)).
- **¿«Ríos artificiales»?** **Sí tienen sentido, como circulación**: sin convección el agua no se mezcla sola, así que una corriente lleva el agua pobre en oxígeno a la membrana y los desechos al filtro. Lo que **no** funciona en 0 g es oxigenar con cascadas o burbujas. En un anillo (o en el tambor a 0,1 g) un río con rápidos sí airea por la superficie, como en la Tierra.
- **El sistema cerrado (C.E.B.A.S., Omegahab, Tiangong):** las plantas (ceratófilo, *Euglena*) dan oxígeno con luz, los animales lo gastan y dan CO₂ y desechos, y las bacterias convierten los desechos en abono. Es el bucle productor → consumidor → descomponedor del dominio (`loopStatus`).

## 7. Fauna abisal y de la oscuridad

- **La presión:** en el abismo hay 10–40 MPa (100–400 atm). Drazen, Bird y Barry (2005) subieron un granadero (*Coryphaenoides acrolepis*) a 13–14,5 MPa en una trampa presurizada: vivió 84 h, y **bajadas de presión del 10 % le hicieron perder la flotabilidad y lo mataron** ([L&O Methods 3:488](https://www.aanderaa.com/media/pdfs/drazen-et-al-2005-hyperbaric-fish-incubator-reduced-size.pdf)). Sus proteínas dependen de la presión y de un osmolito, el TMAO, que sube con la profundidad hasta un límite cerca de 8 200 m ([Yancey et al. 2014, PNAS](https://phys.org/news/2014-03-marine-fish-dont-deeper-blue.html)).
- **El frío:** 2–4 °C, que en una estación cuesta energía de refrigeración.
- **La quimiosíntesis:** junto a las fuentes hidrotermales no llega la luz. El gusano *Riftia* no tiene tubo digestivo: sus bacterias oxidan sulfuro de hidrógeno y fijan carbono por dos vías a un ritmo «excepcionalmente alto» ([Harvard OEB, Nature Microbiology 2024](https://www.oeb.harvard.edu/news/dual-carbon-fixation-mechanisms-enable-tubeworm-survival-harsh-hydrothermal-vent-conditions)). **En la estación la quimiosíntesis ya existe**: el reactor de proteína tipo Solein cultiva bacterias con hidrógeno, CO₂ y amoníaco, sin luz ([Solar Foods](https://en.wikipedia.org/wiki/Solar_Foods), [autosustento.md](../design/autosustento.md)).
- **Lo que sí ahorra la oscuridad:** el pez ciego mexicano (*Astyanax mexicanus*) gasta **un 27 % menos de energía** que su forma de superficie en luz/oscuridad, y un 38 % menos que un pez de superficie en la oscuridad ([Moran et al. 2014, PLOS ONE](https://www.sciencenews.org/blog/wild-things/blind-cavefish-got-no-circadian-rhythm)). Además no hay que pagar luz (los campos de cultivo de la estación gastan ~300 W/m²). Pero, al no ver, **no puede orientarse por la luz en 0 g**: es fauna de anillo.

**Veredicto:** un ecosistema **afótico y a alta presión es más difícil** en una estación: recipiente a presión, frío y química tóxica (sulfuro). **Un ecosistema afótico a presión normal es más fácil**: animales de cueva, detritívoros y bacterias quimiosintéticas que comen hidrógeno del electrolizador.

## 8. Insectos y animales nocturnos que han volado

| Animal | Misión | Qué pasó | Fuente |
| --- | --- | --- | --- |
| Polilla de la soja (*Anticarsia gemmatalis*) | STS-3, 1982 | **Volaba sin problemas** | [Miquel, NASA Ames](https://ntrs.nasa.gov/api/citations/19850027266/downloads/19850027266.pdf) |
| Mosca doméstica | STS-3 | Volaba mejor que las abejas y andaba por las paredes (patas adhesivas) | ídem |
| Abeja melífera | STS-3 | Flotaba y daba tumbos: **no pudo volar con control** | ídem |
| Grillos | Neurolab (STS-90), 1998 | Huevos y larvas para estudiar el desarrollo de sus sensores de gravedad (cercos) | [kit de prensa STS-90](https://www.nasa.gov/wp-content/uploads/2023/05/sts-090-press-kit.pdf) |
| Cucaracha «Nadezhda» | Foton-M3, 2007 | **Primer animal concebido en el espacio**; 33 crías, de caparazón más oscuro antes de tiempo | [Wikipedia](https://en.wikipedia.org/wiki/Nadezhda_(cockroach)) |
| Tardígrados | FOTON-M3, 2007 | Secos, **sobrevivieron al vacío** y a la radiación cósmica; algunos a una UV solar 1 000 veces mayor | [Jönsson et al. 2008, ScienceDaily](https://www.sciencedaily.com/releases/2008/09/080908135906.htm) |
| Murciélago de cola libre | STS-119, 2009 | Se agarró al tanque externo con un ala rota; **casi seguro murió en el ascenso**. Ningún murciélago ha volado al espacio vivo | [Space.com](https://www.space.com/missionlaunches/090317-sts119-bat-shuttle.html) |

**Buenos candidatos y por qué:**
- **Polillas y moscas:** vuelan bien en 0 g. Las polillas son nocturnas y polinizan; las larvas de mosca comen residuos.
- **Cucarachas y grillos:** se reproducen en órbita (Nadezhda), son nocturnos, detritívoros u omnívoros, comen restos del huerto. Los grillos son además alimento posible.
- **Tardígrados:** la mascota extrema. Viven en el musgo húmedo y se secan si falla algo.
- **Medaka, pez cebra y xifo, con caracol y ceratófilo:** el acuario cerrado más probado.
- **Murciélagos:** sin datos. Necesitan mucho volumen y ecolocalización; en 0 g no podrían colgarse «cabeza abajo». Mejor dejarlos fuera de la primera tanda.

## 9. Estaciones con agua en conceptos reales

| Concepto | Giro y tamaño | Agua y fauna |
| --- | --- | --- |
| **Toro de Stanford** (NASA SP-413, 1977) | 1 790 m de diámetro, 1 rpm, 0,9–1 g, 10 000 personas | Escudo de 1,7 m de suelo lunar (~95 % de la masa). Su agricultura incluía **260 000 peces, a 0,1 m² cada uno** ([Wikipedia](https://en.wikipedia.org/wiki/Stanford_torus), [SP-413 cap. 3](https://settlement.nss.org/75SummerStudy/Chapt3.html)) |
| **Cilindros de O'Neill** (1974) | 8 km de diámetro, 32 km de largo, ~40 vueltas por hora; **pareja que gira en sentidos contrarios** | El eje sin gravedad es para recreo; anillos agrícolas aparte ([Wikipedia](https://en.wikipedia.org/wiki/O'Neill_cylinder)) |
| **Kalpana One** (Globus, NSS) | 250 m de radio, 2 rpm, 3 000 personas, hasta 10 t/m² de regolito | **Piscina cilíndrica** en el cilindro interior (20–40 m de radio, gira más rápido) que es también **refugio contra tormentas**; habitaciones a 0 g ([NSS](https://nss.org/kalpana-one-space-settlement/)) |
| **Voyager / Gateway Foundation** | Rueda que gira; gravedad ajustable por el ritmo de giro | Sin datos publicados de agua ni de piscina ([Universe Today](https://www.universetoday.com/articles/gateway-foundation-gives-a-detailed-update-on-its-voyager-station-concept)) |

**Lo que aprendemos:** el agua grande va **en lo que gira** (piscina de Kalpana, peces del toro de Stanford), y lo que gira va **por parejas** (O'Neill, los anillos de la nodriza). En 0 g, solo volúmenes pequeños y cerrados (AQH, Tiangong).

## 10. Segunda ronda (2026-11-14): qué fauna vive mejor en acuarios y módulos cerrados

Petición de Berón: «investiga los animales marinos mejor adaptados al espacio y a estos acuarios artificiales, y en general los animales mejor preparados para vivir en un medio artificial; y cómo ofrecerles un medio adecuado». Y el canon: **los animales son amigos, nunca comida**; a cada especie se le puede **pedir ayuda** cuando es amiga y se programa su mente. La columna «Ayuda» es jugable y se apoya, de lejos, en una conducta real.

**Leyenda de evidencia:** *vuelo* = ha vivido en órbita; *cerrado* = vive años en un sistema cerrado en tierra; *simulante* = probado en regolito simulado; *sin vuelo* = solo datos de laboratorio.

### 10.1 Peces

| Especie | Evidencia | Espacio y masa | Papel | Ayuda (jugable) |
| --- | --- | --- | --- | --- |
| **Medaka** (*Oryzias latipes*) | Vuelo: se apareó en el IML-2 (1994); hasta tres generaciones en el AQH ([Ijiri 1995](https://www.jstage.jst.go.jp/article/bss/9/1/9_1_3/_article), [JAXA AQH](https://iss.jaxa.jp/en/kiboexp/pm/aqh)) | 3–4 cm, ~0,5 g (valor de juego); tanques del AQH de 0,7 L | Consumidor | **Avisar del agua**: con poco oxígeno los peces suben a la superficie antes de enfermar ([Small et al. 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3984153)); también comen larvas de mosquito, aunque menos que la gambusia ([J. Trop. Med. Hyg.](https://www.jstage.jst.go.jp/article/tmh1973/17/2/17_2_157/_article/-char/en)) |
| **Pez cebra** (*Danio rerio*) | Vuelo: 43 días y puesta en Tiangong (2024) ([IHB-CAS](https://english.ihb.cas.cn/newsroom/itm/202501/t20250117_898908.html)) | 4 peces en 1,2 L | Consumidor | Avisar del agua; su puesta dice que el tanque está sano |
| **Xifo** (*Xiphophorus helleri*) | Vuelo: C.E.B.A.S. (STS-89, STS-90) ([SAE 1999-01-1988](https://saemobilus.sae.org/papers/cebas-minimodule-development-realization-perspectives-1999-01-1988)) | 8–12 cm; ~2 L por pez (juego) | Consumidor | Come algas filamentosas |
| **Cíclidos** (tilapia, *Oreochromis mossambicus*) | Vuelo de larvas: Omegahab (Bion-M1, 2013) ([DLR](https://dlr.de/en/latest/news/2013/20130419_lift-off-mini-ecosystem-and-mini-satellites-en-route-to-space_6797/@@download/file)); vuelo en cohete a 0,0001 g frente a una centrífuga a 0,04 g ([U. Hohenheim](https://www.uni-hohenheim.de/uploads/media/TEXUS_Presse_Sept2007.pdf)) | Adultos de 20–40 cm: ≥ 100 L | Consumidor | Come algas y restos vegetales del río. **No es granja**: es un vecino del río |
| **Pez ciego** (*Astyanax mexicanus*) | Sin vuelo; −27 % de gasto ([Moran 2014](https://www.sciencenews.org/blog/wild-things/blind-cavefish-got-no-circadian-rhythm)) | ≥ 40 L | Consumidor | Guía a oscuras en la cueva |

**El pez arquero reconoce caras humanas** (81 % de acierto entre 44 caras; [Newport et al. 2016, Oxford](https://www.ox.ac.uk/node/509329)): es el apoyo real de «hacer amistad» (el banco aprende la cara de Doménica).

### 10.2 Crustáceos

| Especie | Evidencia | Espacio y masa | Papel | Ayuda |
| --- | --- | --- | --- | --- |
| **Artemia** (*A. franciscana*) | Vuelo: quistes reactivados en órbita (STS-37, STS-43, 1991) eclosionaron como en tierra (~40 %) y mudaron ([Spooner 1994, NTRS](https://ntrs.nasa.gov/citations/19950029060)) | Mililitros; quistes secos durante años | Consumidor | **Alimentar a los demás**: comida viva que se guarda seca. Agua salada |
| **Dafnia** (*Daphnia magna*) | Vuelo: crió en 10 días de transbordador y vivió 4 meses en la Mir (ABS); la mitad hacía bucles ([Ijiri 1998](https://www.jstage.jst.go.jp/article/bss/12/4/12_4_377/_article)); propuesta para módulos acuáticos de soporte vital ([Trotter 2015](https://epub.uni-bayreuth.de/3166/1/npjmgrav201516.pdf)) | 1 L basta | Consumidor (filtrador) | **Aclarar el agua verde** |
| **Anfípodos** (*Hyalella*) | Vuelo: 4 meses en la Mir sin bucles (ABS); Omegahab (2013) | 1 L | Descomponedor | Recoger hojas muertas del fondo |
| **Copépodos** | Solo han volado sus **huevos de resistencia**, dentro y fuera de la ISS ([Alekseev 2022](https://mdpi.com/2075-1729/12/1/47)) | — | Consumidor | Plancton de reserva que repuebla tras un fallo |
| **Gamba roja** (*Neocaridina davidi*) | Sin vuelo. NASA KSC la propone para soporte vital ([Brown et al. 2021](https://ouci.dntb.gov.ua/works/4MzpZ1xl)); las gambas *Halocaridina* del EcoSphere viven 2–3 años (algunas más de 12) en un frasco sellado ([EcoSphere](https://en.wikipedia.org/wiki/Ecosphere_(aquarium))) | ≥ 10 L | Descomponedor | **Limpiar biofilm y comida sobrante** |
| **Cochinilla de agua** (*Asellus aquaticus*) | Sin vuelo; detritívoro muy estudiado ([Lafuente 2021](https://www.frontiersin.org/articles/10.3389/fevo.2021.748212)) | 5 L; agua fresca (5–25 °C) | Descomponedor | Desmenuzar hojas para las bacterias |
| **Cangrejo de río** | Sin registro de vuelo encontrado | Territorial, pide escondites y espacio; trepa y escapa | Omnívoro | **Fuera de la primera tanda**: se come caracoles y gambas, y en 0 g no hay fondo que patrullar |

### 10.3 Moluscos y cnidarios

| Especie | Evidencia | Espacio y masa | Papel | Ayuda |
| --- | --- | --- | --- | --- |
| **Caracol *Biomphalaria*** | Vuelo: C.E.B.A.S., Omegahab, Neurolab (se aparearon en órbita) | 0,5 L | Consumidor | **Limpiar el cristal** (raspa con la rádula). Ojo: es el huésped de la esquistosomiasis ([CDC](https://www.cdc.gov/dpdx/schistosomiasis/index.html)): solo líneas de laboratorio sin parásito |
| **Caracol nerita** | Sin vuelo; el mejor limpiacristales y **no se multiplica en agua dulce** ([Chewy](https://www.chewy.com/education/fish/general/nerite-snail-care-guide)) | ≥ 20 L | Consumidor | Limpiar algas duras sin plaga de caracoles |
| **Calamar bobtail** (*Euprymna scolopes*) | Vuelo: >120 crías a la ISS (2021) ([U. Hawái](https://hawaii.edu/news/2021/06/24/squids-in-space)) | ≥ 20 L de agua salada | Consumidor | Iluminar el tanque salado de noche con sus bacterias |
| **Medusa luna** (*Aurelia*) | Vuelo: 2 478 pólipos en el SLS-1 (STS-40, 1991); formaron sus estatolitos, pero 6 veces más éfiras nacidas en órbita pulsaban mal al volver a 1 g ([Space Centre](https://www.spacecentre.co.uk/news/space-now-blog/from-the-sea-to-the-stars-jellyfish-in-space/)) | Tanque **kreisel** redondo y sin esquinas, ≥ 50 L de agua salada fría (10–22 °C) | Consumidor | **Calmar**: su pulso lento se mira como un fuego (bienestar con acuarios: [Cracknell 2016](https://pubmed.ncbi.nlm.nih.gov/27818525/)) |
| **Corales** | Sin registro de corales adultos en órbita encontrado | Agua salada estable, luz fuerte, mucha química | Productor (simbiosis) | **Fuera por ahora**: el arrecife es el acuario más difícil; posible en el anillo como meta tardía |

### 10.4 Insectos y otros invertebrados de tierra

| Especie | Evidencia | Espacio | Papel | Ayuda |
| --- | --- | --- | --- | --- |
| **Grillo** (*Acheta*) | Vuelo: Neurolab ([kit STS-90](https://www.nasa.gov/wp-content/uploads/2023/05/sts-090-press-kit.pdf)) | Cajas pequeñas | Consumidor | Marca el anochecer con su canto |
| **Gusano de seda** (*Bombyx mori*) | Vuelo: 5 de 6 hicieron el capullo en Tiangong-2 (2016) ([China Daily](https://covid-19.chinadaily.com.cn/usa/china/2016-11/10/content_27332553.htm)) | Bandejas con hoja de morera | Consumidor | **Hilar seda** para cuerdas y redes de asideros |
| **Mosca soldado negra** (*Hermetia illucens*) | Simulante: pupó y emergió en regolito lunar simulado ([Romano & Stefanini 2024](https://iris.sssup.it/handle/11382/567652)); sus larvas pasan el 13–21 % de los restos de comida (seco) a biomasa ([Peguero 2022](https://www.frontiersin.org/articles/10.3389/fsufs.2021.745894/full)) | Cajas de larvas; los adultos no comen | Descomponedor | **Reciclar los restos de la cocina** |
| **Tenebrio** (*Tenebrio molitor*) | Equipo del Palacio Lunar (Beihang): con paja y hojas viejas, la paja baja un 48 % ([Li, Zhao y Liu 2013](https://buaa.globalimpact.cn/en/publications/feasibility-of-feeding-yellow-mealworm-tenebrio-molitor-l-in-bior/)) | Bandejas | Descomponedor | Comerse la paja del trigo |
| **Colémbolos** (*Folsomia*) | Sin vuelo; descomponedores y bioindicadores ([collemboles.fr](https://collemboles.fr/en/biotope-and-role/71-springtails-bioindicators.html)) | Suelo húmedo | Descomponedor | Limpiar el moho de los bancales; avisar si el suelo se contamina |
| **Cochinilla de la humedad** (*Porcellio*) | Sin vuelo ([Woodlouse](https://en.wikipedia.org/wiki/Woodlouse)) | Hojarasca húmeda | Descomponedor | Descomponer hojarasca bajo los árboles |
| **Lombriz roja** (*Eisenia fetida*) | Simulante: crió en suelo de Marte simulado con estiércol (Wageningen, 2017) ([UPI](https://www.gpsdaily.com/reports/Earthworms_can_reproduce_in_Mars-like_soil_999.html)) | Bancales | Descomponedor | **Hacer tierra** (humus) y airearla |
| **Tardígrado** | Vuelo: secos, sobrevivieron al vacío (FOTON-M3) | Musgo húmedo | Consumidor | Vigía de la humedad: se seca antes que nadie |
| **Abeja** | STS-3: no voló con control en 0 g | Anillo con luz de día | Consumidor | Polinizar en el anillo |

**Lo más importante:**
1. **Para el acuario de 1 g del anillo** sirve casi cualquier especie de acuario de agua dulce templada: el vuelo solo importa en 0 g. Por eso se añade la **gamba roja** (limpieza y restos) a medaka, caracol, ceratófilo y biofiltro.
2. **Para 0 g**, los mejores son los que ya han vivido meses en órbita: **medaka, pez cebra, xifo, caracoles, anfípodos, dafnias** (estas hacen bucles) y **ceratófilo**. El experimento ABS de la Mir es casi un catálogo: anfípodos, caracoles, ostrácodos y dafnias con ceratófilo, 4 meses, criando.
3. **Los que se guardan secos** (quistes de artemia, huevos de dafnia y copépodo, tardígrados) son el **banco de semillas** del santuario: repueblan tras un fallo.
4. **Descomponedores de tierra**: mosca soldado (restos de cocina), tenebrio (paja), lombriz (compost a humus) y colémbolos: cierran el bucle del huerto.
5. **Fuera de la primera tanda**: cangrejo de río (depredador territorial), corales (química difícil), murciélagos y fauna abisal.

## 11. Cómo dar a cada especie un medio adecuado

| Factor | En el anillo (1 g) | En 0 g | Fuente |
| --- | --- | --- | --- |
| **Luz** | Ciclo día/noche con LEDs (el AQH: 0–1 000 lux) | Luz **desde un lado fijo**: los peces ponen el lomo hacia ella | [JAXA AQH](https://iss.jaxa.jp/en/kiboexp/pm/aqh), Skylab (§5) |
| **Temperatura** | 24–28 °C para la mayoría de los tropicales; 10–22 °C para medusas y *Asellus* (otro tanque) | Igual; sin convección, el calor del LED no se mezcla: hace falta circulación | AQH 25–30 °C |
| **Flujo** | Bomba y biofiltro; corriente suave | Siempre encendida (0–0,5 L/min por tanque en el AQH); las medusas, en tanque **kreisel** circular | AQH |
| **Oxigenación** | Burbujas y superficie | **Membrana** (pulmón artificial) y trampa de burbujas | AQH (§6) |
| **Sustrato** | Grava fina para caracoles y bacterias; el ceratófilo no tiene raíces | Sin grava suelta: biofiltro en cartucho; plantas flotantes | C.E.B.A.S. |
| **Rotación y gravedad** | Lo que no tiene vuelo va al anillo; a 4 rpm la cabeza de un pez no nota el gradiente | Solo especies con vuelo | [ring.ts](../../src/modules/gravity/data/ring.ts) |
| **Ruido y vibración** | Bombas sobre soportes elásticos, lejos del cristal (valor de diseño) | Igual: los peces oyen la vibración por la línea lateral | Valor de diseño |
| **Agua de reserva** | Quistes y huevos secos de artemia, dafnia y copépodo | Igual | §10 |
| **Salinidad** | Agua dulce y salada **nunca juntas**: la regla `fit` lo comprueba (`salinidad`) | Igual | `fauna.ts` |

**Cuánto pienso y cuánto nitrato en el acuario de 1 m³** (`domain/aquarium.ts`): 40 medakas de 0,5 g comen el 3 % de su peso al día (0,6 g). La regla de acuicultura TAN = pienso × proteína × 0,092 da 22 mg de amonio al día, 0,022 mg/L; el biofiltro lo pasa a nitrato (×4,43) y el ceratófilo se lleva una parte. Un tanque grande y poco poblado es **estable**: el nitrato sube muy despacio y basta un cambio del 20 % de vez en cuando.

## 12. Tamaños reales de la nodriza y de la estación, y qué biomas caben

Datos del repositorio:

| Pieza | Tamaño | Superficie o volumen | Fuente en el código |
| --- | --- | --- | --- |
| **Anillo habitable** de la nodriza (y su gemelo, que gira al revés) | Radio del suelo 56 m, 18 m de ancho, cubiertas de 7 m, 4 rpm, 1 g | 2π·56 = **352 m** de perímetro; **6 334 m²** de suelo por anillo | `gravity/data/ring.ts` |
| Cubierta de cultivo del juego | 18 × 18 m | 324 m² (**5 %** del suelo de un anillo) | `farm-deck.ts` |
| Nodriza | 152 m de largo, **877 t** | — | `mothership/data/mothership.ts` |
| Estación: nodos | 5,47 × 4,57 m (como Unity) | ~90 m³ cada uno | `station/data/structure.ts` |
| Estación: módulo habitable | 6,1 × 3 m (como HALO) | ~43 m³ | ídem |
| Estación: **módulo agrícola** | 16,88 × 6,7 m (como el B330) | **330 m³** | `station/data/outfit.ts` |
| Estación: **hangar** (sin presión) | 20 × 14 × 20 m, +10 m con la ampliación | 5 600 m³ (8 400 con la ampliación) | ídem |
| Referencia: **BA 2100 «Olympus»** | 12,6 m de diámetro, 17,8 m de largo, 65–100 t | **2 250 m³** | [Wikipedia](https://en.wikipedia.org/wiki/BA_2100) |

**Qué cabe:**

- **Nodriza (anillo, 1 g):** sobra suelo. Un sector del anillo de 40 m de arco × 18 m (720 m²) es un **bosque de anillo** (frutales, abejas, lombrices, colémbolos, cochinillas). Un **estanque** de 100 m² y 1 m de hondo son 100 t: hay que poner las mismas 100 t en el anillo gemelo (agua de reserva), porque los dos anillos deben tener el mismo momento de inercia. La nodriza lleva los recursos de la tripulación; sus biomas son pequeños y cercanos.
- **Estación (0 g):** con las piezas de hoy, solo el módulo agrícola de 330 m³ (esfera de 4 m, insectario). Para los **biomas grandes** que imagina Berón hace falta un módulo nuevo: un **módulo bioma** hinchable del tamaño del BA 2100 (2 250 m³) da para un **tambor giratorio interior** de 10 m de diámetro y 12 m de largo (~940 m³) con suelo a 0,1–0,3 g, o para un bosque de aire en 0 g con polillas, gusanos de seda y plantas trepadoras sobre redes. El hangar ya tiene su **río de dos tambores** (346 t).

## 13. Estaciones conectadas: precedentes reales

- **Soyuz T-15 (1986)** voló de la Mir a la Salyut 7 (5–6 de mayo) y volvió a la Mir (25–26 de junio): la primera nave que visitó y se acopló a dos estaciones en la misma misión ([Wikipedia](https://en.wikipedia.org/wiki/Soyuz_T-15)). Es el precedente del «transporte entre estaciones-árbol».
- En una misma órbita, dos estaciones a unos kilómetros se alcanzan con un pequeño vehículo de traslado en horas (maniobra de encuentro, como los vuelos de la nodriza a la estación en el juego).

## Fuentes

Todas las enlazadas arriba. Las que usa el código, con su nota, están en `src/modules/sanctuary/data/sources.ts`. Valores de juego (rangos de temperatura por especie, volúmenes mínimos, tamaños de las áreas): marcados en `data/fauna.ts` y `data/areas.ts`.
