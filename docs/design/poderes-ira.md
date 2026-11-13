# Poderes de la ira

**Respuesta corta.** Cuando Doménica falla un duelo mental, el asteroide se enfada y ataca. Lo que puede hacer sale de sus **datos reales**: masa, tamaño, tipo espectral y composición. Hay cinco niveles de poder. Cada nivel añade armas y alcance al anterior: rocas, grandes proyectiles, explosivos, átomos y gravedad. La ira baja sola con el tiempo de juego, con una vida media que depende del nivel. Mientras dura, hay que huir. Si el asteroide alcanza la estación, empieza el **modo supervivencia**: la estación enciende sus motores y se aleja hasta salir del alcance o hasta que la ira se apague. Cuando el asteroide se calma, se puede volver a intentar el duelo.

Código: `src/modules/asteroid-wrath` (dominio y aplicación, con pruebas), `src/modules/station/{domain,data}/drive.ts` (motores de la estación), `src/wrath-mode.ts` (conexión con el juego), `src/adapters/three/wrath-view.ts` (3D) y `src/ui/wrath-panel.ts` (tarjeta de ira).

## 1. Los cinco niveles

El nivel se calcula con `powerOf(asteroid)`. Las reglas se comprueban de la más fuerte a la más débil. Los umbrales son **valores de juego**, pero cada uno se apoya en un dato real:

| Nivel | Nombre | Regla (en orden) | Por qué ese umbral | Alcanza a |
| --- | --- | --- | --- | --- |
| 5 | Gravedad | velocidad de escape ≥ 50 m/s | Vesta (360 m/s), Ceres (516 m/s), lunas y planetas. Bennu tiene 0,2 m/s | sonda, módulo, traje, nodriza, estación |
| 4 | Átomos | tipo M, o ≥ 30 % de metal libre (hierro-níquel, platinoides) | Los M son núcleos metálicos de cuerpos diferenciados | sonda, módulo, traje, nodriza, estación |
| 3 | Explosivos | diámetro > 1 km **y** agua + carbono ≥ 5 % | Bennu tiene ~8 % (1–6,2 % de agua, 4,5–4,7 % de carbono). Las condritas ordinarias (tipo S) tienen menos del 1 % | sonda, módulo, traje, nodriza |
| 2 | Grandes proyectiles | diámetro > 1 km | Por encima de un kilómetro, los bloques que lanza superan la tonelada | sonda, módulo, traje |
| 1 | Rocas | el resto: montones de escombros pequeños | Como Bennu | sonda |

Si un cuerpo no tiene composición, los volátiles se suponen por su tipo: B y C como Bennu (8,2 %), S 0,5 %, M y X 0 %. El juego lo marca como «supuesto por su tipo».

### Niveles de los asteroides reales de la región

| Asteroide | Diámetro | Tipo | Escape | Volátiles | Nivel | Roca lanzada |
| --- | --- | --- | --- | --- | --- | --- |
| 101955 Bennu | 0,49 km | B | 0,20 m/s | 8,2 % | **1 Rocas** | 0,49 m, 72 kg a 3,3 m/s |
| 242916 (2006 OS2) | 2,44 km | C | 1,00 m/s | 8,2 % | **3 Explosivos** | 1,09 m, 800 kg a 20 m/s |
| 58587 (1997 SK23) | 2,31 km | C | 0,94 m/s | 8,2 % | **3** | 1,06 m, 735 kg |
| 265900 (2006 BY34) | 1,79 km | C | 0,73 m/s | 8,2 % | **3** | 0,93 m, 504 kg |
| 236201 (2005 WF81) | 1,56 km | C | 0,64 m/s | 8,2 % | **3** | 0,87 m, 410 kg |
| 417464 (2006 QY64) | 1,32 km | C | 0,54 m/s | 8,2 % | **3** | 0,80 m, 318 kg |
| 2009 UF113 | 1,20 km | C | 0,49 m/s | 8,2 % | **3** | 0,76 m, 275 kg |
| 142 Polana (lejos, fuera de la zona de vuelo) | 54,8 km | B | 22,4 m/s | 8,2 % (supuesto) | **3** | 4 m (tope) |

La región de inicio **solo tiene los niveles 1 y 3**. Las seis compañeras de Bennu pasan de 1 km y tienen la roca de Bennu, que es rica en volátiles. Para cubrir los demás niveles hay cuerpos de referencia reales en `data/reference-bodies.ts`. No están colocados en ninguna región:

| Cuerpo | Datos | Nivel |
| --- | --- | --- |
| 433 Eros | 16,84 km, tipo S, 6,687 × 10¹⁵ kg ([Wikipedia](https://en.wikipedia.org/wiki/433_Eros)) | 2 |
| (6178) 1986 DA | 3,15 km, tipo M, ~85 % de metal ([Wikipedia](https://en.wikipedia.org/wiki/(6178)_1986_DA), [Sanchez et al. 2021](https://arxiv.org/abs/2109.13950)). Densidad de 5,3 g/cm³ supuesta | 4 |
| 16 Psyche | 222 km, tipo M, 2,29 × 10¹⁹ kg, escape de 166 m/s ([Wikipedia](https://en.wikipedia.org/wiki/16_Psyche)) | 5 (le gana la gravedad al metal) |
| 1 Ceres | 939 km, 9,38 × 10²⁰ kg, escape de 516 m/s ([Wikipedia](https://en.wikipedia.org/wiki/Ceres_(dwarf_planet))) | 5 |

## 2. La ira

- Un duelo fallido sube la ira según la fase (valores de juego). Fase 1, la sonda posada: +0,45. Fase 2, el módulo de aterrizaje posado: +0,75. Fase 3, Doménica tumbada en el asteroide con el traje: +1. La ira nunca pasa de 1.
- La ira baja de forma exponencial con el tiempo de juego. La vida media es de 30 s en el nivel 1, 60 s en el 2, 120 s en el 3, 240 s en el 4 y 480 s en el 5. Por debajo de 0,05 el asteroide está **calmado**. Tiempo hasta la calma: `vida media × log2(ira / 0,05)`. Con la ira a tope son 2 min 10 s en el nivel 1 y 34 min 35 s en el nivel 5.
- Con más ira lanza más a menudo: intervalo ÷ max(ira, 0,25).
- Para el flujo de subyugación de la otra rama hay una API: `AsteroidWrath.duelFailed(asteroidId, fase)` y `canRetry(asteroidId)`. `Expedition` tiene un enganche opcional, `wrath`. Si está puesto, avisa de cada fallo con su fase (por ahora la 2: el duelo se juega desde el módulo posado). Además apaga el daño antiguo a corta distancia y no deja empezar otro duelo hasta que `canRetry` dé verdadero. Sin el enganche, `Expedition` se porta como antes.

## 3. Las armas

### Proyectiles (todos los niveles)

- **Tamaño:** la roca mide d = 0,022·√D (valor de juego), con un tope de 4 m. Su masa sale de la densidad real del asteroide. Así, Bennu lanza piedras de medio metro y un cuerpo de 2,3 km lanza bloques de un metro.
- **Velocidad:** en el nivel 1 es de **3,3 m/s**, lo máximo que se vio salir de Bennu: Bennu expulsa partículas de centímetros a 1–3 m/s ([Lauretta et al. 2019, Science 366:eaay3544](https://physicstoday.aip.org/news/asteroid-loses-weight-and-may-gain-some-back)). Del nivel 2 al 5 la velocidad sube a 15, 20, 25 y 30 m/s, con licencia de juego. Las cargas van ×1,5 y las nucleares ×2. Ninguna pasa de su tope.
- **Lanzamiento:** sale de la superficie del lado del blanco, apuntado al punto de encuentro, que se calcula resolviendo |p + v·t − o| = s·t.
- **Guiado «con su gravedad»:** cada paso suma la gravedad real del asteroide (masa puntual) y una aceleración de guiado limitada. Esa aceleración gira la velocidad hacia el punto de encuentro y vale `a₀ · ira · (R/r)²`: cae con la distancia al asteroide igual que la gravedad. a₀ va de 0,03 m/s² (nivel 1) a 0,2 m/s² (nivel 5), un valor de juego muy por encima de la gravedad real (Bennu: 8 × 10⁻⁵ m/s²). Cerca del asteroide los proyectiles corrigen bien. Lejos vuelan casi balísticos y una maniobra a tiempo los esquiva.
- **Impacto:** cuenta la energía ½·m·v_rel². Una piedra de menos de 1 kg es «escombro»: la pared y el escudo Whipple la frenan (diámetro crítico de la NASA, `debrisDamageFactor`, [componentes.md](componentes.md)). Un bloque más pesado golpea como un choque y el Whipple no sirve contra él, la misma regla que el contacto con el suelo.

### Explosivos (nivel 3 y más)

En el vacío **no hay onda expansiva ni sobrepresión**, porque no hay aire que la lleve. El daño viene de la **nube de fragmentos** que lanza el gas.

- La carga pesa 40 kg (valor de juego). La parte de volátiles es la del asteroide (8,2 % en la región) y el resto es la carcasa.
- La velocidad de los fragmentos sale de la **ecuación de Gurney** para una esfera, V = √(2E) · (M/C + 3/5)^(−1/2) ([Gurney](https://en.wikipedia.org/wiki/Gurney_equations); el TNT tiene √(2E) = 2,44 km/s). La energía de una carga de volátiles se estima en 0,3 MJ/kg, una explosión de vapor y no una detonación. Es una estimación de juego. Con la roca de Bennu, los fragmentos salen a **226 m/s**.
- La carga revienta a 15 m del blanco. Hay 200 fragmentos iguales: una simplificación de la ley de Mott. Llegan a un blanco N·A/(4πr²) fragmentos, con A la sección del blanco. Esos fragmentos sí son escombros y el escudo los frena.

### Átomos (nivel 4 y más)

- **Pulso de radiación dirigida** cada tres lanzamientos. Es licencia de juego: 400 mSv en la superficie con la ira a tope, que se reparten con el cuadrado de la distancia. Lo que lo para, en cambio, es real: la dosis pasa por el **mismo modelo de blindaje** que los rayos cósmicos de la nodriza (curvas de Naito y Kodaira 2022, `relativeDose`). El módulo de aterrizaje tiene su pared de aluminio-litio (0,83 g/cm²). La nodriza tiene su blindaje montado (de serie, 20 g/cm² de agua). La estación tiene 1,7 g/cm² de aluminio, una estimación con la pared y el parachoques de un nodo de la ISS. En una sonda sin tripulación, la dosis daña la electrónica: falla con 50 Gy (5 krad, electrónica comercial; es una estimación).
- **Carga nuclear**, solo con la ira por encima de 0,8 y uno de cada cinco lanzamientos. Libera 1 GJ (unos 240 kg de TNT, valor de juego). En el espacio, casi toda la energía sale como **rayos X** ([Glasstone y Dolan 1977](https://www.fourmilab.ch/etexts/www/effects/), cap. II), y aquí es el 70 %. Esos rayos X se depositan en la sección del blanco según el cuadrado de la distancia, y un Whipple no los para. Además da una dosis inmediata de 2 Sv a 100 m (valor de juego), que también se reparte con el cuadrado de la distancia y pasa por el blindaje.

### Gravedad (nivel 5)

Dentro de 3 radios, el asteroide añade un tirón hacia sí: `max(0,05; 5 · g_superficie) · ira`, que se apaga en línea recta hasta el borde. En Ceres (g = 0,284 m/s²) el tirón llega a 1,4 m/s², y el motor del módulo da unos 0,33 m/s². **Escapar es imposible** hasta que la ira baje o se salga de la zona de agarre. La tarjeta lo avisa en rojo. El alcance de un cuerpo de nivel 5 llega como mínimo al borde de su agarre.

### Embestida (cualquier nivel, si es rápido)

Regla del diseñador: «si el asteroide es lo suficientemente rápido puede probar de impactar directo en lugar de lanzar cosas». Un asteroide enfadado que persigue a la nave que lo enfadó (`pursuit`, motor gravitatorio de [subyugacion.md](subyugacion.md)) puede **cargar contra ella y chocar con todo su cuerpo**. Código: `domain/ram.ts` (regla y física), `chargeProfile` y `stepCharge` en `celestial/domain/gravity-drive.ts`, y la máquina de estados en `AsteroidWrath` (`ram`, `ramAt`, `rams`).

**Cuándo embiste** (`chooseAttack`, valores de juego):

1. Solo a la **sonda** y al **módulo** en vuelo, y solo si se conoce su masa. A Doménica con el traje nunca la embiste.
2. Una nave **posada sobre él** no se embiste: se la **sacude** de la superficie (0,5 m/s hacia fuera, como la sacudida tras un duelo fallido). Una nave posada en otro cuerpo no se embiste. Una nave acoplada no es un blanco.
3. Su velocidad de carrera debe llegar a **5 m/s**. La carrera es un esprint del motor gravitatorio: ×10 la aceleración de persecución y ×2 su velocidad máxima, sin reserva para frenar. Como el motor escala con (M_Bennu/M)^(1/6), **los pequeños son los rápidos**: Bennu llega a 8 m/s con la ira a tope (7 m/s con la ira de un duelo de fase 2), 2009 UF113 (1,2 km) a 5,1 m/s solo con la ira por encima de 0,95, y los demás miembros de 1,3–2,4 km (3,6–4,9 m/s) **nunca embisten: siguen lanzando**. Polana, Psyche o Ceres, menos aún.
4. Debe poder **cerrar más rápido de lo que la nave huye**: velocidad de carrera − velocidad de la nave alejándose ≥ 2 m/s.
5. Debe estar cerca: la nave a menos de 600 m de su superficie y a más de 50 m (necesita carrerilla; más cerca, la sigue pegado a ella).

Un asteroide capaz de embestir se acerca hasta 400 m de su superficie en lugar de quedarse al 40 % de su alcance.

**Aviso y carga.** Primero **se prepara 5 s** sin lanzar nada: aviso «¡Bennu se lanza contra módulo! Esquiva de lado 248 m», tres pitidos (Web Audio, `adapters/audio/alarm.ts`), línea roja parpadeante en 3D desde el asteroide hasta el punto al que apunta, con un anillo, y línea en el mapa hasta ese punto («va a embestir a módulo»). Al acabar, **fija la dirección** hacia donde estará la nave si mantiene su velocidad y sale en línea recta (`stepCharge`): acelera hacia esa dirección hasta su velocidad de carrera y no frena. La tarjeta de ira muestra «¡EMBESTIDA → módulo! · 7,8 m/s · choque en 25 s» y la flecha cambia a **«Esquiva de lado N m»**: la dirección perpendicular a la carga y lo que falta para salir de su trayectoria (radio del asteroide + radio de la nave). Mientras hay una embestida no se permite el tiempo acelerado.

**Choque** (`ramImpact`): física de dos cuerpos a lo largo de la línea de centros.

- Masa reducida μ = m₁m₂/(m₁+m₂). Contra un asteroide es casi la masa de la nave.
- Energía en el sistema del centro de masas: ½·μ·v_rel² ([colisión inelástica](https://en.wikipedia.org/wiki/Inelastic_collision)).
- Lo que el rebote no devuelve, ½·μ·v_n²·(1 − e²), aplasta el casco. Solo cuenta la componente normal v_n: un roce en el borde hace mucho menos.
- **Coeficiente de restitución e = 0,38**: el primer contacto de **Philae** con el cometa 67P, que llegó a ~1,0 m/s y rebotó a ~0,38 m/s ([Biele et al. 2015, Science 349:aaa9816](https://doi.org/10.1126/science.aaa9816); rebote de 38 cm/s en [ESA, «Three touchdowns for Rosetta's lander», 2014](https://www.esa.int/Science_Exploration/Space_Science/Rosetta/Three_touchdowns_for_Rosetta_s_lander)). La superficie de Bennu es igual de suelta: cohesión casi nula, como una piscina de bolas ([Walsh et al. 2022, Science Advances 8:eabm6229](https://doi.org/10.1126/sciadv.abm6229); [Lauretta et al. 2022, Science 377:285](https://doi.org/10.1126/science.abm1018)). Usarlo para un choque nave–asteroide es una estimación. [Coeficiente de restitución](https://en.wikipedia.org/wiki/Coefficient_of_restitution).
- Impulso J = (1 + e)·μ·v_n: la nave sale despedida con Δv = J/m_nave hacia fuera; el asteroide cambia J/M, nada.
- El daño pasa por el **mismo modelo de protección** que las rocas (`impactFraction`) como choque romo: un Whipple no para un asteroide.

Masas reales de las naves: módulo de aterrizaje 1649 kg (`Ship.massKg` del diseño de serie, 0,27 m/s² con el motor principal), sonda según su diseño.

| Bennu contra el módulo (1649 kg) | Ira 0,45 | Ira 0,75 | Ira 1 |
| --- | --- | --- | --- |
| Aceleración y velocidad de carrera | 0,44 m/s², 5,8 m/s | 0,53 m/s², 7,0 m/s | 0,60 m/s², 8,0 m/s |
| ½·μ·v² | 28 kJ | 40 kJ | 53 kJ |
| Absorbido (1 − e²) → casco | 24 kJ → −12 % | 35 kJ → −17 % | 45 kJ → −23 % |
| Empujón de la nave | 8,0 m/s | 9,7 m/s | 11,0 m/s |
| Carrera desde 400 m | 75 s | 63 s | 56 s |

**Esquiva y pasada de largo.** Para esquivarlo hay que apartarse de lado su radio más el de la nave: 248 m contra Bennu, que con el motor del módulo (0,27 m/s²) son unos 43 s de empuje. Los 5 s de aviso y el minuto de carrera dan tiempo a girar y quemar de lado. Si falla, el asteroide sigue: ya no tiene el empuje del esprint y frena con su aceleración de persecución. Se pasa **v²/2a** de largo (533 m para Bennu a 8 m/s con 0,06 m/s²) y tarda **2v/a** en volver al punto donde falló (4 min 27 s): para entonces Bennu ya se ha calmado. Después de un choque o un fallo espera eso más 10 s para volver a cargar. Una carga que no acierta en 120 s se da por fallada.

**En pantalla:** destello blanco-naranja en el punto del choque (3D), la vista tiembla y un destello cubre la pantalla en la nave que lo recibe, un golpe sordo, y el aviso «¡Embestida a 7,8 m/s sobre módulo de aterrizaje! 45 kJ · −23 % de casco · empujón de 11 m/s». Si se esquiva: «Esquivado: Bennu se pasa 533 m de largo y tarda 4 min 27 s en volver».

## 4. A quién ataca y hasta dónde

Cada nivel tiene un **alcance**, medido desde la superficie (valores de juego): 2, 3, 5, 8 y 12 km. Mientras un blanco del tipo adecuado está dentro, el asteroide le lanza cosas por turnos. Cuando sale:

- recibe el aviso «fuera de su alcance»;
- el asteroide no le lanza nada más;
- los proyectiles que ya volaban pierden el guiado y siguen balísticos hasta perderse.

En la Tierra no podría ser así, pero aquí perseguir más lejos es lo que el asteroide no puede hacer.

| Blanco (`TargetKind`) | Energía que lo destroza (valor de juego) | Protección real |
| --- | --- | --- |
| `sonda` | 3 kJ | Electrónica: 50 Gy |
| `aterrizador` (módulo de aterrizaje) | 200 kJ: un bloque de 740 kg a 20 m/s le quita tres cuartos | Pared de la cabina más escudo Whipple (`debrisDamageFactor`). Dosis: la pared de aluminio |
| `traje` | 1,5 kJ | (sin conectar todavía) |
| `nodriza` | 30 MJ | El agua del blindaje como pared (diámetro crítico monolítico). Dosis: su blindaje |
| `estacion` | 50 MJ | Whipple de los nodos de la ISS (0,16 cm a 12 cm sobre 0,48 cm). Dosis: 1,7 g/cm² de aluminio |

El daño del módulo va a `Ship.damage`. El de la nodriza y la estación va a un `Hull` propio del módulo de ira, porque el juego todavía no lleva el casco de esas dos. La dosis de Doménica se suma donde ella esté: en el módulo, o en la nodriza o la estación si el módulo está acoplado. Un módulo acoplado no es un blanco aparte: forma parte de lo que lo lleva.

## 5. Modo supervivencia: la estación se mueve

La estación no tenía propulsión. Ahora lleva **dos motores S5.79**, como los motores principales de Zvezda en la ISS ([S5.79](https://en.wikipedia.org/wiki/S5.79), [Zvezda](https://en.wikipedia.org/wiki/Zvezda_(ISS_module))). Los datos están en `station/data/drive.ts`:

| Dato | Valor | Origen |
| --- | --- | --- |
| Empuje | 2 × 3,09 kN | S5.79 |
| Isp | 293,7 s | S5.79 |
| Propelente | N₂O₄/UDMH, 2 t | Valor de juego (del orden de un reabastecimiento de Progress) |
| Masa en seco | 110 t | Estimación: nodos como Unity (11,6 t) y Harmony (14,3 t), un laboratorio como Destiny (14,5 t), HALO, dos IDA, cuatro alas solares de 1,1 t, radiadores, celosía y hangar |
| Aceleración | 0,055 m/s² | 6180 N / 112 t |
| Δv | 52 m/s | Tsiolkovsky |

Cuando un asteroide enfadado de nivel 4 o 5 tiene la estación a su alcance, `StationEscape` empuja en línea recta hacia fuera del asteroide. Gasta propelente a razón de ṁ = F/(Isp·g₀). Al salir del alcance, o cuando la ira se apaga, frena hasta pararse. Salir de 7 km de alcance lleva unos 8 minutos de tiempo de juego. La nodriza atracada se mueve con la estación, y una nave acoplada a cualquiera de las dos sigue a su puerto. Para que la estación pudiera moverse se tocaron un poco `StationStructure.moveTo`, `Station.moveTo` y el destino «Estación» del mapa, que ahora lee la posición viva.

## 6. Lo que ve el jugador

- **En 3D:** cada roca es un poliedro con un resplandor naranja; las cargas son esferas amarillas y las nucleares blancas verdosas. Todas dejan estela y se agrandan con la distancia para que se vean. Al reventar, una carga hace un destello y una nube de puntos que se abre. El pulso de radiación es un rayo violeta. Cada asteroide enfadado lleva una cáscara roja tenue en el borde de su alcance.
- **Tarjeta de ira**, en el HUD y no como botón nuevo. En el móvil va a la izquierda, bajo el HUD de vuelo; en el escritorio, arriba en el centro. También sale **en el puente de la nodriza**: en el móvil, como una franja abajo; en el escritorio, sobre la ventana de proa. Desde el puente, la guía de huida es la de la nodriza. Muestra:
  - el asteroide y su poder;
  - el medidor de ira y el tiempo hasta la calma;
  - el modo supervivencia (distancia que le falta a la estación, su velocidad, el Δv que le queda);
  - el último impacto o la última explosión, con el casco que quitó;
  - las amenazas en vuelo por blanco, con el tiempo de llegada;
  - la guía de **huida**: una flecha en el marco de la nave (con «hacia atrás» si queda detrás), los metros que faltan para salir del alcance y el aviso de agarre;
  - en el escritorio, además, el casco del módulo, de la nodriza y de la estación, y la dosis de Doménica.

  En el móvil, mientras la tarjeta está a la vista, ocupa el sitio de la franja de avisos.
- **Tiempo acelerado:** se permite mientras nada vuela hacia el módulo y el módulo está fuera de alcance. Así se puede esperar a que se calme, o a que la estación termine de huir.

## 7. Capturas

En `docs/screenshots/ira-{rocas,explosivo,supervivencia}-{mobile,desktop}.png` (iPhone 13 y 1280 × 800):

- **Rocas y explosivo:** duelo fallido en la fase 2 contra 58587 (nivel 3), desde 700 m y con la cámara exterior.
- **Supervivencia:** el módulo frente a la estación, con Bennu con poder de nivel 4 mediante el gancho de demostración `demoTier`, porque en la región no hay ningún asteroide de nivel 4. El juego nunca lo llama.
- **Puente:** `ira-puente-{mobile,desktop}.png`, la misma situación vista desde el puente de la nodriza.
- **Embestida:** `embestida-{1-aviso,2-carga,3-impacto,4-esquiva,5-pasada,6-mapa}-{mobile,desktop}.png`. El módulo parado a 240 m de Bennu, duelo fallido de fase 2 con la ira fijada a 1 por código. Aviso, carga, choque; luego otra carga esquivada con un empuje lateral puesto por código, la pasada de largo y la línea en el mapa del puente.

## 8. Preguntas abiertas

- **La sonda sin tripulación** es de la rama `sonda-subyugacion`. Entra con `wrathMode.wrath.addTarget({ kind: "sonda", … })`. Hasta que esa rama se fusione, el nivel 1 (Bennu) no tiene blanco, y fallar con Bennu solo provoca la sacudida.
- **El traje (fase 3)** está modelado en el dominio pero no conectado.
- **Qué pasa cuando un casco llega a 0** en el módulo, la nodriza o la estación: ¿fin de partida, rescate, reparación?
- **Huida de la nodriza:** solo se guía, no se automatiza. ¿Debe huir sola, como la estación?
- **Embestida:** Bennu (nivel 1) no lanza nada al módulo, pero ahora puede embestirlo. ¿Es lo que se quiere, o la embestida debería limitarse a los blancos de su nivel? ¿Y embestir a la nodriza o a la estación (hoy no son «naves que lo enfadaron»)?
- **La dosis de Doménica** se acumula y se muestra, pero todavía no afecta a su salud (`medical`).
