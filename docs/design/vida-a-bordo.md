# Vida a bordo: plantas, gatos y la mente de la nave

Este documento continúa [bucle-de-juego.md](bucle-de-juego.md). En los tramos largos la nave vuela sola y el jugador vive dentro: cuida al personaje (las actividades de Cold Sanctuary), las plantas, los gatos y la propia nave.

## Principio común: hablar con una mente es leer o escribir su programa

El asteroide, las plantas, los gatos y la nave usan el mismo motor de duelo (`modules/mind-duel`). Lo que cambia es qué ocurre al ganar o perder:

| Mente | Al persuadirla | Si se agota la paciencia | Conceptos que entrena |
| --- | --- | --- | --- |
| Asteroide | Obedece y sus recursos llenan la bodega | Se vuelve agresivo y hay que huir | Según masa y riqueza (1–10) |
| Gato | Aprende una regla nueva en su mente | Se molesta (estrés +0,3) y no aprende nada | Condicionales y eventos (5, 9) |
| Nave | Se monta la pieza nueva | La pieza queda mal montada y rinde menos | Variables, operaciones, reparar (2, 4) |

Así el jugador practica conceptos distintos según lo que necesita en cada momento, y no solo en los duelos con asteroides.

## Lo que había en el borrador

En la rama `recuperar-onedrive` aparecieron estas piezas:

- **Árboles de mejoras** (`src/UserInterface/menu/upgrades.js`). El crecimiento personal tenía cuatro cualidades: Caregiver (cuidador), Intellectual, Athlete e Introspective. La nave tenía dos: Ecological y Powerful. La IA de la nave mejoraba con materiales obtenidos de los objetos estelares.
- **LeveledObject** (`src/domain/leveled-object`). Tenía puntos físicos y mentales (10/10), defensas física y mental, nivel cada 1000 de experiencia y auras con aliados y enemigos. `mind-corruption` estaba vacío.
- **HolisticCast**. Las acciones de código («declarar var número», «asignar»…) funcionaban como hechizos contra un objetivo, con efectos en el tiempo. Es el antecedente directo del duelo.
- **Materials**. Contaba hielo de agua, carbono, aminoácidos, azúcares, hidrocarburos, silicatos, hierro, níquel y cobalto.
- **Catálogos de componentes** sin fuentes (ya copiados a `docs/research/legado`).
- **Personajes y diálogos.** Las misiones del bloque de variables (`src/Levels/1_Variables/number.js`, `text.js`, `boolean.js`) llegan como **cartas de Nevaeh** a **Doménica**, la protagonista: «Dear Doménica, …». Nevaeh le pide configurar la *nano_net* con números, textos y booleanos, y en las posdatas se cuenta una historia: los seres queridos de Doménica escriben preocupados, hubo un fallo de comunicaciones y Nevaeh termina revelando que «alguien estaba detrás». Las cartas apuntan a un retrato (`/img/nevaeh/face_100px.webp`), pero **la imagen no está** en ninguna rama ni en el zip de OneDrive. La rama `levels` tiene además frases e introducciones en español e inglés para cada bloque («La cantidad puede ser encontrada en nuestras mentes…»).

Encajan así:

- **Cuidador** es la cualidad natural para plantas y gatos. Puede subir la eficacia de los cuidados y de las charlas con sus mentes.
- **Atleta** e **Introspectivo** encajan con el entrenamiento y el yoga de Cold Sanctuary.
- **Intelectual** encaja con el estudio, es decir, con los bloques de conceptos.
- **Ecológica** encaja con el reciclaje: los restos de cosecha vuelven como nutrientes.
- **Potente** encaja con las piezas de la nave.

## Plantas

Los datos de cultivo son reales (`modules/garden/data/species.ts`):

| Especie | Cosechas | Polinización | Fuente |
| --- | --- | --- | --- |
| Lechuga romana roja 'Outredgeous' (Veggie, ISS) | Día 33. Cosechando hojas sin arrancarla («cut-and-come-again») llegó a 64 días | No hace falta | [NTRS 20190028955](https://ntrs.nasa.gov/citations/20190028955), [Scientific American](https://www.scientificamerican.com/article/astronauts-take-first-bites-of-lettuce-grown-in-space/) |
| Chile 'Española Improved' (Plant Habitat-04, ISS, 2021) | Días 100 y 120 | Autopoliniza, pero hay que **agitar** la planta | [NASA PH-04](https://www.nasa.gov/sites/default/files/atoms/files/plant_habitat-04.pdf), [NMSU](https://engr.nmsu.edu/news-events/2021/11/chile-in-space.html) |
| Tomate enano 'Red Robin' (VEG-05, ISS, 2023) | Días 83, 90 y 100 | Agitar las flores (VEG-05 preparó la polinización a mano) | [NTRS 20240001505](https://ntrs.nasa.gov/citations/20240001505), [NTRS 20210026897](https://ntrs.nasa.gov/citations/20210026897) |
| Rábano 'Cherry Belle' (Plant Habitat-02, ISS, 2020) | Día 27 | No hace falta | [Astrobiology](https://astrobiology.com/2020/12/03/astronauts-harvest-first-radish-crop-on-international-space-station/) |
| Papa 'Norland' (Biomass Production Chamber, NASA) | Día 91 (91 o 105) | No hace falta | [Wheeler, BPC](https://ntrs.nasa.gov/api/citations/20140017323/downloads/20140017323.pdf) |
| Soja 'Hoyt' (BPC) | Día 90 (90 o 97) | Autopoliniza | idem |
| Trigo 'Apogee' (BPC) | Día 77 (77–86) | Autopoliniza | idem |
| Cacahuete 'Georgia Red' (NFT, Universidad de Tuskegee, programa de soporte vital de la NASA) | Día 110 tras el trasplante; **588 g/m²** de semilla seca | Autopoliniza; las clavijas (ginóforos) bajan al sustrato | [Mortley et al. 2000, HortScience 35(1):46–48](https://journals.ashs.org/downloadpdf/view/journals/hortsci/35/1/article-p46.pdf) |
| Fresa 'Seascape' (día neutro, Purdue para la NASA) | Fruta desde el día 65 y durante 282 días; en el juego, una recogida cada 35 días (ajuste). **≈ 990 g/m²** por temporada | Hay que **agitar** las flores: sin abejas, la autopolinización se queda corta | [Massa y Mitchell (ASHS 2010)](https://ashs.confex.com/ashs/2010/webprogram/Paper4007.html), [Purdue](https://www.purdue.edu/newsroom/research/2010/100503MitchellStrawberrie.html), rendimiento: [SARE LNE06-241](https://projects.sare.org/project-reports/lne06-241/) (0,59 lb por planta en su peor año, 15.000 plantas/acre), polinización: [U. Minnesota](https://extension.umn.edu/agriculture/specialty-crops/commercial-fruit-production/strawberry-farming/small-or-misshapen-strawberries) |
| Higuera en maceta (*Ficus carica*, higo común) | Primeros higos a los ~4 meses (día 120); temporada de ~300 días, una recogida cada 40 días (ajuste). **7,86 kg/m²** a 1,25 árboles/m² (≈ 6,3 kg por árbol) | Los higos comunes no necesitan polinizar (partenocarpia) | [Mendoza-Castillo et al. 2017, Exp. Agric.](https://www.cambridge.org/core/journals/experimental-agriculture/article/abs/intensive-production-systems-of-fig-ficus-carica-l-under-greenhouse-conditions/E508363F501D2011BBFCA6FA023386EE), [FreshFruitPortal](https://www.freshfruitportal.com/news/2019/01/14/mexico-pioneering-project-uses-greenhouses-new-growing-methods-to-triple-fig-yields/), [Wikipedia](https://en.wikipedia.org/wiki/Common_fig) |
| Hierba para gatos (brotes de avena) | ~10 días (ajuste de juego) | — | [Hart et al. 2021](https://escholarship.org/content/qt8x40j557/qt8x40j557.pdf): el 65 % de los gatos come plantas cada semana; es una conducta normal |

**Rendimiento real.** El cacahuete, la fresa y la higuera llevan su rendimiento medido (`edibleYield`): cada cosecha da esa comida repartida entre sus días de cosecha, en porciones de 50 g (cacahuete), 150 g (fresa, una taza USDA) y 100 g (dos higos). Un bancal de cacahuete de 15 m² da unos 8,8 kg. El resto de cultivos sigue con las porciones fijas del juego.

**¿Y los árboles enanos?** La NASA estudia un ciruelo enano con el gen *FT1* que florece en menos de un año ([Wheeler, NTRS 20170011641](https://ntrs.nasa.gov/citations/20170011641)), pero aún no hay datos de cosecha. Por eso los cuatro árboles de la cubierta son higueras en maceta, que sí los tienen.

**Tóxicas para gatos.** La ASPCA lista la planta del tomate, la de la papa y las higueras (*Ficus*: ficina y psoraleno) como tóxicas para gatos; la fresa, como no tóxica ([ASPCA](https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/strawberry)). Si un gato las muerde, sufre una **intoxicación** y hay que llevarlo a la enfermería.

El Veggie usaba LED rojos, azules y verdes. En el juego, «luces encendidas» es la condición para crecer.

**Cuidados.** Hay que regar (el sustrato se seca), mantener las luces encendidas, agitar el chile antes de que fructifique y proteger la planta de los gatos.

Hablar a las plantas para que produzcan más **se retiró** (decisión de Berón, 2026-11-11). En su lugar, cuidar, cosechar y cocinar son retos de código (ver «Todo a bordo es un reto de código»). Sin ánimo, la planta crece exactamente al ritmo real del experimento si está regada, iluminada y sana.

**Planta nueva.** Durante sus 3 primeros días la planta es «nueva» y atrae a los gatos.

## Gatos

**Energía real.** La energía en reposo (RER) es 70 · kg^0,75 kcal/día. La de mantenimiento es 1,2 × RER para un adulto castrado, 1,4 × RER para uno entero y 2–3 × RER para un gatito. Son estimaciones, y cada gato puede variar hasta un 50 % ([Pet Nutrition Alliance](https://petnutritionalliance.org/wp-content/uploads/2023/03/MER.RER_.PNA_.pdf)). Un gato castrado de 4 kg necesita unas 238 kcal/día.

**Necesidades.** Tiene comida, juego y cariño, y el estrés sube cuando alguna está baja. Un gato muy estresado (≥ 0,8) **se salta sus reglas** y actúa por instinto. Por eso cuidarlo es parte de programarlo.

**Recursos.** La regla de la AAFP es un arenero, un comedero, un bebedero, una cama y un rascador por gato, más uno extra. Si faltan, todos los gatos se estresan.

**Presentaciones.** Siguen la guía de la AAFP y Feline VMA ([PDF](https://catvets.com/wp-content/uploads/2024/07/Step-by-Step-Guide-How-to-Introduce-a-New-Cat-to-Other-Cats-in-Your-Home.pdf)), resumida en seis etapas:

1. **separados:** el gato nuevo está en su habitación de transición.
2. **olores:** se intercambian mantas y juguetes.
3. **juego-tras-puerta:** juegan con la puerta cerrada en medio.
4. **contacto-visual:** se ven a través de una mampara o cristal.
5. **juntos-supervisados:** comparten espacio con el jugador delante.
6. **amigos.**

Solo se avanza cuando los dos gatos están tranquilos, como pide la guía. Desde el contacto visual los gatos se encuentran: si alguno bufa, la etapa vuelve a empezar, y si se saludan, avanza al doble de ritmo. Señales de estrés según la guía: hacer sus necesidades fuera del arenero, gruñir, bufar o caminar de un lado a otro.

**Plantas tóxicas** (ASPCA):

- **Lirio:** tóxico, causa fallo renal en gatos. No se puede llevar a bordo.
- **Planta de tomate:** tóxica por la solanina. El fruto maduro no lo es.
- **Hierba gatera:** tóxica leve. Causa vómitos y diarrea, y a algunos gatos los seda y a otros los excita.
- **Albahaca:** no tóxica.
- **Lechuga y chile:** sin entrada en la ASPCA. Quedan como «desconocido».

Esto prepara una mecánica futura: elegir qué se cultiva teniendo en cuenta a los gatos.

**Programar su mente.** Un gato sin programar tiene instintos: ante una planta nueva la olfatea o la muerde, y ante un gato desconocido bufa u olfatea. Al hablar con su mente el jugador escribe una regla que sustituye al instinto. Cada regla aparece como una línea de su programa:

```
cuando aparezca una planta nueva → olfatearla y seguir mi camino
on('planta-nueva', planta => { olfatear(planta); alejarme(); });
```

Las lecciones de ahora (`modules/pets/data/rules.ts`) son:

- **respetar-plantas:** sirve para cada planta nueva y para cada gato que llega a bordo.
- **hacer-amigos:** el gato saluda en lugar de bufar, así que la presentación va más rápido. Aun así hay que pasar por todas las etapas: no hay atajo.

**Progresión.** Se empieza con un gato. Cada gato nuevo trae trabajo:

- presentarlo a cada residente;
- programarlo para que no dañe las plantas que ya hay;
- conseguir un juego de recursos más.

El máximo previsto es 4 gatos.

## La mente de la nave

En el borrador se mostraba el código de la clase de la nave y se actualizaba al elegir componentes. La propuesta mantiene esa vista y le añade retos:

- **Vista de su código.** Al hablar con la nave se abre su clase, en pseudocódigo o JS. Cada pieza montada es una línea con sus valores reales, por ejemplo `motor = R4D(empuje 490 N, Isp 312 s)`. Los valores que cambian (combustible, casco) se actualizan en vivo.
- **Cambiar una pieza.** El reto se genera a partir del cambio real, no sale de un banco fijo:
  - **completar** el valor nuevo (`motor.empuje = ___`);
  - **predecir** el Δv con el tanque nuevo usando la fórmula de Tsiolkovsky;
  - **ordenar** el montaje (cerrar válvulas, desconectar, montar, conectar, probar);
  - **especificar** la orden correcta.

  La línea cambiada se resalta como un diff.
- **Si fallas.** La nave no se enfada: la pieza queda mal montada y rinde menos (menos empuje, fugas). Para arreglarla hay un reto de **reparar** sobre esa línea.

## Todo a bordo es un reto de código

Cada tarea es una **cadena de retos en orden** (`modules/chores`): cada reto resuelto es un paso hecho. Si fallas dos veces, la tarea queda sin hacer y hay que repetirla. Los retos **se generan a partir del estado y de los datos reales**, no salen de un banco fijo:

| Tarea | Cuándo aparece | Retos | Efecto al terminar |
| --- | --- | --- | --- |
| Curar planta | Salud < 70 % (mordisco de gato, sacudida del asteroide…) | Ordenar la cura · predecir la salud final | Salud +40 % |
| Regar | Agua < 40 % | Completar el umbral del `si` · ordenar el riego | Agua al 100 % |
| Polinizar | El chile florece (mitad del día 100) | Especificar la orden correcta · ordenar | Habrá fruto (PH-04: hay que agitarlo) |
| Cosechar | Llega el día real de cosecha | Ordenar · predecir las porciones con un `si/si no` | Porciones a la despensa |
| Dar de comer al gato | Saciedad < 50 % | **Calcular la ración con la fórmula real** (70·kg^0,75 × factor ÷ 2) · ordenar | Media ración diaria |
| Calmar al gato | Estrés > 50 % (bufidos, sacudidas) | Predecir qué hace el programa según sus orejas · ordenar | Juego, cariño y calma |
| Cocinar | Hay ingredientes en la despensa y la cocina funciona | **Un reto por paso de la receta**: elegir el paso siguiente o completar su valor real (p. ej. 71 °C) | Platos y saciedad del tripulante |
| Procesar | Hay cosecha y su máquina funciona | Un reto por paso (moler, hacer tofu, preparar pienso) | Harina, tofu, pienso |
| Programar a un gato | El gato ya causó el problema (mordió, bufó, acechó) | Las ideas de la lección | Regla escrita en su mente |
| Gallinas: comer, huevos | Hambre o huevos en el nido | Calcular el pienso, completar las horas de luz, contar con un bucle | Gallinas comidas, huevos a la nevera |
| Biorreactor | Según la fase del cultivo | Un reto por paso; calcular duplicaciones y gramos | Siembra, medio renovado, fibras, carne |
| Reparar máquina | Una sacudida la dejó por debajo del 50 % | Ordenar la reparación · completar un ajuste real | Máquina al 100 % |
| Enfermería | Alguien tiene una lesión sin tratar | Triaje ABCDE · un reto por paso del protocolo | Tratado: se recupera con reposo |
| Yoga | Siempre | **Un reto por postura**: elegir la siguiente postura y su respiración | Cada acierto mueve la figura a esa postura; la secuencia sube forma y calma |
| Reparar la nave | Casco < 100 % | Encontrar la línea dañada del código de la nave · completar el valor real | Casco +30 % |

**Escenarios.** La tarea cuenta por qué hace falta: «Luna mordisqueó la lechuga (l2)», «Bennu, furioso, sacudió la nave: la maceta de chile (c1) se volcó». Cuando el asteroide se enfurece, la sacudida daña plantas, asusta a los gatos, estresa al tripulante y deja el casco dañado.

**Yoga de Cold Sanctuary.** Las secuencias salen de la ficha de asanas de Cold Sanctuary ([yoga-asanas-spec.md](https://github.com/videnacry/cold-sanctuary/blob/master/docs/yoga-asanas-spec.md)): Upa-yoga de cuello y hombros (6 ejercicios) y Saludo al Sol (12 asanas con su respiración). La figura de cubos imita el rig de Cold Sanctuary.

**Recetas.** Vienen del restaurante de Cold Sanctuary ([CookingRecipe.cs](https://github.com/videnacry/cold-sanctuary/blob/master/Assets/Scripts/Kitchen/CookingRecipe.cs)) o son recetas tradicionales, adaptadas a lo que se produce a bordo:

| Platillo | Ingredientes de a bordo | Pasos |
| --- | --- | --- |
| Huevos revueltos (Cold Sanctuary) | 2 huevos | 7, con la temperatura segura de 71 °C ([USDA FSIS](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart)) |
| Ensalada de la nave | lechuga, tomate y rábano | 6 |
| Tortilla de papa | 2 papas y 3 huevos | 8 |
| Chapati | harina (del trigo, por el molino) | 7 |
| Tofu salteado con chile | tofu (de la soja) y chile | 6 |
| Carne cultivada con papas | 250 g de carne y 1 papa | 7, con 71 °C como la carne picada |
| Milpa con chile | chile | 6 |
| Mercimek | solo despensa seca | 7 |
| Cacahuetes tostados | 2 cacahuete | 7, tostar a 160 °C ([Wikipedia](https://en.wikipedia.org/wiki/Peanut_butter)) |
| Gachas de avena con cacahuete (desayuno) | 1 cacahuete + avena de la despensa | 6 |
| Llapingachos con salsa de maní (Ecuador) | 2 papa, 2 huevos, 1 cacahuete | 7 ([Wikipedia](https://en.wikipedia.org/wiki/Llapingacho)) |
| Bol de fruta de la cubierta | fresa, higo y cacahuete | 7 |
| Desayuno completo: avena, fresas y crema de cacahuete | fresa y crema de cacahuete | 6 |
| Higos asados con crema de cacahuete (postre) | 2 higos y crema de cacahuete | 5 |
| Chapati con fresas y crema de cacahuete (postre) | harina, fresa y crema | 6 |

La **crema de cacahuete** se hace en el molino (nuevo proceso): tostar a 160 °C, aflojar la piel con aire a 138 °C, moler en grueso y en fino, salar ([Wikipedia](https://en.wikipedia.org/wiki/Peanut_butter)).

**Nutrición real por porción.** Cada receta dice cuántos gramos de cada alimento lleva una porción (`perPortionG`, valor de juego del tamaño de un plato casero). Los nutrientes por 100 g son de USDA FoodData Central, SR Legacy (`kitchen/data/nutrition.ts`): por ejemplo, cacahuete crudo 567 kcal ([FDC 172430](https://fdc.nal.usda.gov/food-details/172430/nutrients)), fresa 32 kcal, higo 74 kcal. La carne cultivada usa la carne picada 85/15 como sustituta. El tablero de tareas muestra las kcal de cada porción:

| Platillo | kcal por porción |
| --- | --- |
| Carne cultivada con papas | 618 |
| Llapingachos | 600 |
| Desayuno completo | 539 |
| Mercimek | 529 |
| Milpa | 498 |
| Gachas de avena con cacahuete | 479 |
| Tortilla de papa | 414 |
| Chapati con fresas y crema | 349 |
| Cacahuetes tostados | 293 |
| Chapati | 231 |
| Tofu con chile | 214 |
| Bol de fruta | 207 |
| Huevos revueltos | 187 |
| Higos asados | 168 |
| Ensalada | 113 |

**Comer llena según la energía.** Al cocinar, Doménica come una porción y su saciedad sube kcal ÷ su energía diaria (2.277 kcal, [JSC-67378](https://ntrs.nasa.gov/api/citations/20205008306/downloads/JSC67378%20Expl%20Nutr%20Reqs%20042020.pdf)). La saciedad baja 1 al día, así que tiene que comer lo que gasta.

**Despensa de salida** (`kitchen/data/stores.ts`, valores de juego): 12 papas, 20 porciones de cacahuete (1 kg), 10 de harina, 6 huevos, 500 g de carne cultivada, más pienso y medio de cultivo. La despensa seca (avena, lenteja, frijol, aceite, especias) no se cuenta. Desde el día 1 se pueden cocinar 8 platos, no solo el mercimek, y un día variado (gachas, llapingachos, carne con papas, mercimek, tortilla) suma más de 2.600 kcal. Las higueras empiezan con higos maduros y la fresa en flor, así que la fruta llega con la primera cosecha.

## Producir toda la comida: el módulo de soporte vital

Sí se puede: una nave de viaje largo lleva un **módulo biorregenerativo**, como la *Biomass Production Chamber* de la NASA, que cultivó trigo, soja, papa, lechuga y tomate en hidroponía bajo luz eléctrica. En el juego son máquinas (`modules/life-support`), cada una con su base real:

| Máquina | Para qué | Base real |
| --- | --- | --- |
| Bastidores de cultivo (2 pisos, 18 macetas) | Todas las plantas; sin ellos no hay luz | BPC (NFT) y Veggie (LED rojo, azul y verde) |
| Molino de grano | Harina de trigo y pienso de gallinas | — |
| Procesador de soja | Tofu: remojar, moler, hervir, filtrar, cuajar con nigari, prensar | [Tofu](https://es.wikipedia.org/wiki/Tofu) |
| Biorreactor de carne cultivada | Carne sin sacrificar animales | [carne-cultivada.md](https://github.com/videnacry/cold-sanctuary/blob/master/docs/carne-cultivada.md) de Cold Sanctuary |
| Gallinero | Huevos, con 16 h de luz | [Merck Veterinary Manual](https://www.merckvetmanual.com/poultry/nutrition-and-management-poultry/management-of-laying-chickens) |
| Cocina | Todos los platillos | Cocina de Cold Sanctuary |
| Enfermería | Personas y animales | Hospital de Cold Sanctuary |

Una **sacudida** puede dañar dos máquinas. Por debajo del 50 % la máquina se para: sus tareas desaparecen hasta repararla con su reto. Cambiar o añadir máquinas por la mente de la nave queda pendiente.

## Carne cultivada

El proceso real, tal como lo documentó Cold Sanctuary: un vial de 10⁹ células satélite se descongela del nitrógeno líquido, crece en un **biorreactor de tanque agitado** a 37 °C y pH 7,2–7,4, y las células se **duplican cada ~24 h**. Para 2 kg hacen falta ~5·10¹¹ células (un gramo de músculo tiene 2–3·10⁸), unas **9 duplicaciones**. Luego se diferencian en fibras sobre un andamio comestible y se cosechan. El medio sin suero (Beefy-9, Stout et al. 2022) no requiere ningún animal sacrificado.

**Cuidados y recursos.** Las células comen glucosa y sueltan lactato, que baja el pH. Hay que **renovar el medio** (y corregir con bicarbonato) cada ~2 días: cada siembra y cada renovación gastan un **lote de medio**, unos 6 por tanda. Si no se renueva, el crecimiento se para; por debajo de pH 6,8 el cultivo muere. Una sacudida puede **contaminarlo**. En ambos casos hay que esterilizarlo en el autoclave (121 °C). El medio viene en la bodega; producirlo a bordo (hidrolizados vegetales) queda pendiente.

## Gallinas

Tres gallinas viven en el gallinero del anillo, donde hay gravedad. Ponen alrededor de un huevo al día (ajuste de juego) si comen, están tranquilas, sanas y tienen **14–16 h de luz** (Merck). El pienso se hace en el molino con trigo, soja y calcio para la cáscara. Un gato sin programar **acecha** a las gallinas: se asustan, dejan de poner y a veces una sale herida. Se arregla programando al gato con la lección «respetar gallinas».

## Qué comen los gatos

Los gatos son **carnívoros estrictos**: necesitan nutrientes que solo da el tejido animal (taurina, ácido araquidónico, vitamina A preformada; Merck). Por eso **no comen lo que se cultiva**: comen **carne cultivada** (de células de pollo, ~1,2 kcal/g) o, si no hay, pienso de la bodega (~3,8 kcal/g). El reto de darles de comer calcula sus kcal reales y luego los gramos.

Lo que sí se les puede plantar es **hierba para gatos**: no los alimenta, pero les gusta mordisquearla. Con la hierba lista, el 70 % de los mordiscos que iban a una planta nueva van a la hierba (ajuste de juego).

## Peleas entre gatos

Durante la presentación, cuando los gatos ya se ven, un bufido entre gatos muy estresados puede acabar en **pelea**: los dos salen con heridas de mordisco y la presentación **retrocede una etapa** (la guía de la AAFP dice volver un paso atrás). Una mordedura de gato sin curar **se infecta en un absceso** a los 3 días.

## La enfermería

Una sola enfermería para personas y animales, versión de a bordo del hospital de Cold Sanctuary: camilla, mesa veterinaria, monitor, ecógrafo y botiquín. Todos los seres de a bordo son **pacientes** con el mismo modelo de salud (`modules/medical`): el tripulante, los gatos, las gallinas y los personajes que se añadan después.

| Lesión | De dónde sale | Protocolo (un reto por paso) |
| --- | --- | --- |
| Herida | Pelea de gatos, gato que ataca a una gallina | Guantes, presionar, irrigar con suero, revisar, cubrir |
| Golpe | Sacudida fuerte: el tripulante choca con un mamparo | Inmovilizar, ecografía, frío, analgesia, reposo |
| Intoxicación | Gato que muerde tomate o papa | Identificar la planta, toxicología, carbón activado si lo indican, fluidos, vigilar |
| Absceso | Mordedura sin curar | Sedar, drenar, lavar, antibiótico, collar |
| Estrés agudo | (reservado para escenarios futuros) | Lugar tranquilo, luz baja, revisar, agua, descanso |

Todo empieza por el **triaje ABCDE** (vía aérea, respiración, circulación, estado neurológico, exposición) de la OMS. Sin tratar, la lesión empeora poco a poco; tratada, se cura con reposo. Las lesiones graves (≥ 60 %) piden cama. Los protocolos son un resumen de juego, no una guía clínica.

## El interior

El módulo habitable se recorre en primera persona: joystick y arrastrar para mirar en el móvil, WASD y flechas en el escritorio. Tiene estas estaciones:

- el **huerto**: dos pisos de bastidores con luces LED, canal de nutrientes y 18 macetas, cada especie con su forma (roseta, fruto, raíz, espigas, hierba);
- la **cocina**: placa que se enciende al cocinar, horno y nevera;
- el **molino** y el **procesador de soja**;
- el **laboratorio de carne cultivada**: tanque de vidrio cuyo medio cambia de rosa a amarillo al acidificarse (como el rojo de fenol), tanque de nitrógeno, campana de flujo y consola con fase, células, pH y glucosa;
- la **enfermería**: camilla, mesa veterinaria y monitor con los pacientes;
- el **panel de la mente de la nave**, con su clase y sus valores reales;
- la **esterilla de yoga**, con la figura de perfil;
- el **rincón de los gatos**;
- el **gallinero**, con malla, ponederos (los huevos aparecen en el nido), aseladero, comedero y bebedero.

Cada máquina tiene una luz: verde si funciona y roja parpadeante si está averiada.

El botón **Tareas** lista lo pendiente con su escenario. Al elegir una, el personaje camina a la estación y el reto se abre en una hoja inferior, para que se siga viendo la planta, el gato o la postura.

Se camina con los pies en el suelo porque el módulo es un **anillo giratorio con gravedad artificial**. Es una licencia de diseño para poder hacer yoga y cocinar: las naves reales, como la ISS, no la tienen.

## Historia: las cartas de Nevaeh

Decisión de Berón (2026-11-12): se rescata la historia del borrador. **Doménica** es la protagonista. **Nevaeh** le escribe cartas que llegan por la **radio de la nave** (botón «Radio», con contador de no leídas). Están en `modules/story`.

Las misiones del borrador se hacían en el panel de la nave. Desde la nano_net (2026-11-12) cada carta anuncia una etapa de un núcleo o una avería, y la misión se cumple **aterrizado en el núcleo**, con retos de código. Ver [nano-net.md](nano-net.md).

| Carta | Llega | Misión |
| --- | --- | --- |
| La nano_net necesita un núcleo (borrador, `number.js`) | Al empezar | Convertir a Bennu en núcleo |
| Que el núcleo aprenda a generar nodos (borrador, `text.js`) | 0,25 días después de la misión anterior | Etapa «generar nodos» |
| Mover los nodos a su órbita (nueva) | Igual | Etapa «mover nodos» |
| Cerrar el anillo y cubrir un área (borrador, `boolean.js`) | Igual | Etapa «cubrir un área» |
| Enlazar tu red con la nuestra (nueva) | Igual | Etapa «enlazar redes» |
| Avería en la nano_net (generada) | Con cada avería nueva | Reparar esa avería en el núcleo |
| ¿Estáis bien? (nueva) | Tras la primera sacudida | — |

Las variables del borrador (`pulsosPorHora = 20`, `'3396815'`, `A001Encendido = true`…) siguen vivas dentro de los retos del núcleo. Las posdatas siguen el arco del borrador: los seres queridos de Doménica escriben preocupados, el fallo de comunicaciones se investiga y al final «alguien estaba detrás». La carta nueva lo continúa.

El retrato original de Nevaeh se perdió (el borrador apuntaba a `/img/nevaeh/face_100px.webp`). Ahora se dibuja a partir de su hoja de diseño de Cold Sanctuary; ver más abajo.

## Familias de gallinas, gatos y chihuahuas

Decisión de Berón (2026-11-12): las gallinas pueden vivir libres, suben a bordo chihuahuas, y el jugador programa un entorno amable para que gallinas, gatos y perros formen **familias**. Eso le da a Doménica, que pasará años en el espacio sin hablar con su familia, un gran bienestar mental.

**Lo real en que se apoya:**

- **Adopción entre especies.** Hay casos documentados: una gata crió patitos nacidos junto a su camada, y una perra crió un cachorro de leopardo. El reconocimiento materno depende de la oxitocina y se aprende, por eso los criadores recurren a la adopción cruzada ([WCVM, Universidad de Saskatchewan](https://wcvmtoday.usask.ca/scicomm/family-or-foe-how-prey-and-predator-animals-can-develop-mother-child-bonds.php)).
- **Gallinas cluecas.** Aceptan pollitos ajenos si se los ponen de noche y en calma. En un ensayo, 3 de 4 grupos fueron aceptados; en el que falló, la gallina los picoteó o los ignoró ([SARE FNE08-645](https://projects.sare.org/project-reports/fne08-645/)).
- **Compañía animal.** La interacción con animales baja el cortisol, la frecuencia cardiaca y la presión arterial, y mejora el ánimo ([Beetz et al. 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3408111/)).

**Que una gallina adopte un cachorro o un gatito es una licencia del juego.** Solo hay vídeos y anécdotas, no estudios.

**Cómo funciona** (`modules/family`, `pets/data/family-lessons.ts`):

1. **Gallinas libres.** El jugador programa la puerta automática del gallinero: abre al amanecer y cierra al anochecer, pero solo si están todas dentro. Las gallinas libres se calman antes, pero escarban los plantones hasta que se les programa «buscar bichos en el compost».
2. **Encuentros.** Cada animal reacciona a los demás según su instinto o según su programa:
   - El perro persigue a las gallinas y le ladra al gato.
   - El gato bufa al perro y acecha a las gallinas.
   - Las gallinas picotean a las crías ajenas.
3. **Lecciones en dos niveles.**
   - **Nivel 1** aparece cuando surge el problema: no perseguir, no picotear.
   - **Nivel 2** es la regla de familia, que se escribe encima de la de nivel 1: tumbarse junto a la gallina, o cobijar a la cría bajo las alas (solo una clueca).
   - Hay también reglas de amistad sin problema previo: el gato espera a que el perro se calme y lo saluda; el perro invita a jugar con la reverencia de juego.
4. **Lazos.** Cada encuentro cálido sube el lazo si el otro está tranquilo. Cuidar a una cría lo sube el doble, y así se adopta. Un encuentro hostil lo baja.
   - Con un lazo de 0,7 o más, dos animales de especies distintas son familia.
   - La familia crece por miembros compartidos.
   - Un animal no ataca a su familia, sea cual sea su instinto.
   - En 3D, las crías siguen a quien las adoptó.
5. **Doménica.** Su soledad crece cada día lejos de su familia, y las comidas y el yoga no la tocan. Las familias de animales la bajan, y el HUD lo muestra en la barra «Compañía». Cuando se forma la primera familia, Kushal la llama.

**Chihuahuas** (`pets/domain/dog.ts`):

- Coco, adulto de 2,4 kg, y Pepa, cachorra de 0,9 kg. El estándar de la raza dice que un chihuahua no debe pasar de 6 lb, unos 2,7 kg ([Chihuahua Club of America](https://www.chihuahuaclubofamerica.org/thechihuahua/breedstandard)).
- Energía: RER × 1,6 para un adulto castrado y × 3 para un cachorro de menos de 4 meses ([Pet Nutrition Alliance](https://petnutritionalliance.org/wp-content/uploads/2023/03/MER.RER_.PNA_.pdf)). Coco necesita unas 223 kcal al día.
- A diferencia de los gatos, los perros aprovechan los almidones cocidos y la proteína vegetal ([Merck](https://www.merckvetmanual.com/management-and-nutrition/nutrition-small-animals/nutritional-requirements-of-small-animals)). Comen carne cultivada o, si no hay, huevos (72 kcal por huevo grande, USDA).
- Van a la enfermería como cualquier otro paciente.

## La cubierta de cultivo: un viaje autosuficiente

La nave es grande. Detrás del módulo habitable, una puerta da a una **cubierta de cultivo** de 18 × 18 m:

- suelo de placas, con una alfombra de césped para gallinas y perros junto a la puerta;
- un cielo de LED;
- once bancales de 15 m² con riego por goteo, que no hay que regar a mano: dos filas de cuatro y, junto a la pared del fondo, una tercera fila de tres bancales girados (cacahuete, cacahuete y fresa);
- cuatro higueras en maceta junto a las paredes, de 0,8 m² cada una, que dan higos de verdad;
- el compost de las gallinas;
- el rincón de los chihuahuas.

**¿Cuánto hace falta?** Wheeler et al. (2021), en su revisión de la investigación de la NASA, estiman 40–50 m² de cultivo con luz intensa para dar las calorías de una persona. Esa misma superficie hace todo su O2 y retira su CO2 ([Frontiers](https://www.frontiersin.org/journals/astronomy-and-space-sciences/articles/10.3389/fspas.2021.734343/full)).

**El cálculo del juego** (`life-support/domain/sustainability.ts`):

- Toma 45 m² por persona y lo escala con la energía de cada comensal:
  - Doménica: ecuación de la NASA para mujeres, unas 2.280 kcal con ejercicio ([JSC-67378](https://ntrs.nasa.gov/api/citations/20205008306/downloads/JSC67378%20Expl%20Nutr%20Reqs%20042020.pdf));
  - cada gallina: 110 g de pienso a unas 2,9 kcal/g;
  - gatos y perros: su RER × factor.
- Es una **cota inferior**, porque alimentar animales a partir de cultivos pierde energía por el camino.
- Hoy a bordo hacen falta unos 81 m². Los bastidores (3,75 m² de macetas vivas) dan un 5 %. Con los once bancales (165 m²) y las cuatro higueras (3,2 m²) hay unos 172 m², un 213 %. La cifra de Wheeler supone cultivos básicos como trigo, papa y soja; las dos primeras filas (120 m²) ya bastan solas, y la fruta y los frutos secos dan variedad y margen para malas cosechas y futuros tripulantes.
- El HUD muestra la autosuficiencia en todo momento.

## Historia: Doménica, Nevaeh y Kushal

Canon de Berón (2026-11-12):

- Doménica tenía en la Tierra una situación difícil que la obligó a huir.
- Llegó a Cold Sanctuary con su grupo de amigos. Ahí le contó sus problemas a **Nevaeh, la Magnate del santuario**, y Nevaeh le habló de ir al espacio. Doménica aceptó sin dudarlo.
- Pasará años en el espacio sin hablar con su familia.
- Su amigo **Kushal** la llama a veces por la línea del santuario. Más amigos del grupo se irán incorporando.

En el juego (`story/data/friends.ts`):

- La primera carta, «Antes de que empieces», es Nevaeh recordando esa noche. Los detalles de lo que hizo huir a Doménica quedan sin escribir a propósito.
- Las llamadas de Kushal llegan por la radio como transcripción. Una llega el día 2 y otra cuando se forma la primera familia.

**Retratos** (`src/ui/portraits.ts`): dibujados con SVG a partir de las hojas de diseño descritas en `docs/diseno-personajes.md` de Cold Sanctuary. Las imágenes de esas hojas no están en ninguno de los dos repositorios.

- **Nevaeh:** bob azul noche con flequillo recto, labios morados, cuello alto blanco, bolero morado y corsé granate con ribete dorado.
- **Kushal:** gorro de lana rojo, gafas redondas, barba de unos días y chaleco morado con cuello de borrego.
- **Doménica:** aún no tiene hoja de diseño.

**La nano_net** ya está: ver [nano-net.md](nano-net.md).

- Las misiones de Nevaeh son vuelos al núcleo que falla, que se arregla con un reto de código.
- Un asteroide subyugado puede convertirse en **núcleo** de la red. Al programarlo, aprende a generar nodos, moverlos, conectarlos para cubrir un área y unirse a otra red.

## Qué hay implementado

| Pieza | Dónde | Estado |
| --- | --- | --- |
| Planta (agua, luz, salud, agitar, cosechar) | `modules/garden/domain/plant.ts` | ✓ con tests |
| Especies con datos reales | `modules/garden/data/species.ts` | ✓ 11 especies (con cacahuete, fresa e higuera) |
| Máquinas del soporte vital | `modules/life-support` | ✓ con tests |
| Biorreactor de carne cultivada | `modules/cultured-meat` | ✓ con tests |
| Gallinas | `modules/poultry` | ✓ con tests |
| Salud y enfermería (cualquier paciente) | `modules/medical` | ✓ con tests |
| Recetas, ingredientes, procesos, nutrición USDA y despensa de salida | `modules/kitchen/data`, `modules/kitchen/domain/nutrition.ts` | ✓ 15 recetas, 4 procesos, con tests |
| Gato (energía real, necesidades, estrés, reglas) | `modules/pets/domain/cat.ts` | ✓ con tests |
| Instintos y decisión | `modules/pets/domain/behavior.ts` | ✓ con tests |
| Presentaciones entre gatos | `modules/pets/domain/introduction.ts` | ✓ con tests |
| Hábitat: une plantas, gatos, tripulante, despensa, sacudidas, tareas y charlas con gatos | `modules/habitat/application/habitat.ts` | ✓ con tests |
| Lecciones para programar gatos | `pets/data/rules.ts` | ✓ 6 ejercicios |
| Tareas como cadenas de retos generados | `modules/chores` | ✓ con tests |
| Tripulante (saciedad, forma, estrés) | `modules/crew` | ✓ con tests |
| Yoga y recetas de Cold Sanctuary | `wellness/data/yoga.ts`, `kitchen/data/recipes.ts` | ✓ |
| Panel de la mente de la nave y reparación por retos | `chores/application/catalog.ts`, `src/interior.ts` | ✓ |
| Bahía de la nave: vista exterior, estado por pieza y cambio de piezas ([bahia-de-la-nave.md](bahia-de-la-nave.md)) | `modules/ship-bay`, `ship/domain/refit.ts`, `src/ship-bay.ts` | ✓ con tests |
| Interior 3D: caminar, huerto, cocina, molino, laboratorio, enfermería, panel, esterilla, gatos, gallinero | `src/interior.ts`, `src/adapters/three/interior/` | ✓ |
| Cartas de Nevaeh a Doménica con misiones de la nano_net | `modules/story`, radio en `src/interior.ts` | ✓ con tests |
| Gallinas libres, chihuahuas, lazos y familias entre especies | `modules/family`, `pets/domain/dog.ts`, `pets/data/family-lessons.ts` | ✓ con tests |
| Cubierta de cultivo y autosuficiencia | `life-support/domain/sustainability.ts`, `src/adapters/three/interior/farm-deck.ts` | ✓ con tests |
| Prólogo de Nevaeh, llamadas de Kushal y retratos | `story/data/friends.ts`, `src/ui/portraits.ts` | ✓ con tests |
| nano_net: núcleos hechos de asteroides, etapas, averías y reparaciones | `modules/nano-net`, `src/ui/nano-net-panel.ts`, `src/adapters/three/nano-net-view.ts` | ✓ con tests |
| Viaje automático programado entre asteroides | — | pendiente |

Los números de cuidado sin fuente (velocidad de secado, ritmo de juego y de cariño, probabilidad de mordisco, días por etapa) están marcados en el código como **ajuste de juego**. Así se distinguen de los datos reales.
