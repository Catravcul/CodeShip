# Catálogo de casos de QA

Qué tiene que pasar en Codeship, qué lo cubre (test de Vitest, recorrido o QA jugando) y cómo se
comprueba a mano. Este fichero es el **catálogo**: dice qué tiene que pasar, no si pasó. El estado y
la evidencia de cada caso viven en [registro.md](registro.md); cada ejecución deja su run log en
[runs/](runs/); lo que se encontró, en [hallazgos.md](hallazgos.md). El mapa de estado compartido del
que salen los casos de convivencia está en [entrelazamiento.md](entrelazamiento.md). El flujo de
trabajo, en [README.md](README.md).

## Reglas

- **Un ID no se reutiliza ni se renumera.** Un caso que deja de aplicar pasa a `Retirado` en el
  registro y aquí se tacha (`~~VUE-03~~`); no se borra, porque los títulos de los tests, los run logs y
  los hallazgos apuntan a él.
- **Sin evidencia no hay «probado».** Ver [registro.md](registro.md).
- **El ID va en el título del test** cuando el test se escribe para el caso (todos los CV):
  `it("CV-03 un viaje comprimido no multiplica…")`. Los tests anteriores a este catálogo se citan por
  fichero; al tocarlos se puede añadir el ID al título.
- **Casos con carrera** (una acción a mitad de otro proceso): el caso dice qué acción se hace y en qué
  momento; el run log la anota en «Acción a mitad». Si al jugar no llegan a cruzarse se anota «no
  reproducido», nunca OK.
- `npm run qa:check` comprueba que los ficheros citados existen, que cada ID tiene fila en el
  registro, que los casos con test propio tienen un test con su ID y que ningún test cita un ID que no
  está aquí.

## IDs

- **Áreas**: VUE vuelo, aterrizaje y acople · NAV navegación, mapa y viajes comprimidos · SON sonda ·
  SUB subyugación en tres fases y duelos · NIV niveles de subyugación · IRA poderes de la ira ·
  EST estación, planos y montaje · REF refinería y propelente · BIO autosustento ·
  IMP importación · VID vida a bordo · EVA paseo espacial · ING ingravidez · NNT nano_net ·
  MIS misiones, radio y créditos · UI interfaz de retos · CV convivencia de procesos ·
  PX experiencia del jugador.
- Bugs abiertos o arreglados: `B-nn`. Huecos (comportamiento sin decidir o sin cubrir): `HC-nn`.
  Hallazgos de una ejecución: `Hn` (en [hallazgos.md](hallazgos.md)).
- El siguiente ID libre de un área es el último más uno, aunque haya retirados.

## Cómo se usa

- **Funcionalidad nueva.** Primero el caso aquí, con el siguiente ID libre de su área (y un CV por
  cada estado compartido que toque, mirando [entrelazamiento.md](entrelazamiento.md)). Después el test
  en rojo con el ID en el título, el arreglo y la QA con su run log.
- **Antes de fusionar una rama.** Los casos de las áreas que toca el diff, y todos los CV cuya fila
  cita esas áreas, son la lista de regresiones. `npx vitest run src/qa` corre todos los CV.

---

## Casos

Columna QA: cómo se comprueba jugando, o «Solo test» si no tiene sentido hacerlo a mano.

### Vuelo, aterrizaje y acople (VUE)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| VUE-01 | La física corre a 120 Hz fijos sea cual sea el fotograma; el motor acelera a F/m; sin asistente el giro no se para | `flight-computer.test.ts`, `rigid-body.test.ts`, `ship.test.ts`, `rocket.test.ts` | Jugar: W y Espacio, ver la velocidad del HUD |
| VUE-02 | Posarse despacio ancla la nave y gira con el asteroide; demasiado rápido rebota o se estrella con daño; con el casco (no las patas) resbala | `flight-computer.test.ts`, `contact.test.ts` | Jugar: aterrizar en Bennu a < 0,1 m/s y a 1 m/s |
| VUE-03 | El asistente de acople mete el módulo en el puerto dentro de los límites IDSS; un contacto fuera de límites rebota y dice por qué; acoplado, ignora el empuje y se suelta con el muelle | `docking.test.ts`, `mothership.test.ts` | Jugar: K, botón Acople |
| VUE-04 | La nodriza atraca sola en la estación dentro de IDSS y sus anillos y radiadores no tocan la estación | `berthing.test.ts`, `dock-trip.test.ts` | Jugar: viaje a «Estación» con el módulo acoplado |
| VUE-05 | Propulsión de la nodriza: 18 X3 en los 2 MWe, Δv y xenón de su presupuesto de masas | `propulsion.test.ts`, `mothership.test.ts`, `panels.test.ts` | Solo test |

### Navegación, mapa y viajes comprimidos (NAV)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| NAV-01 | Elegir un asteroide en el mapa lo hace objetivo del vuelo y de la expedición; no se cambia de destino posado | `navigator.test.ts` | Jugar: M, elegir 58587 |
| NAV-02 | La ruta rodea las rocas y se planifica con el motor real; la ficha da dificultad del duelo y coste | `navigator.test.ts`, `route.test.ts`, `transfer.test.ts`, `trip-chore.test.ts` | Jugar: ficha del mapa |
| NAV-03 | Resolver los retos del viaje enciende el piloto automático, que devuelve los mandos a ~300 m; fallarlos deja el control manual | `navigator.test.ts`, `autopilot.test.ts` | Jugar: Programar viaje |
| NAV-04 | Viaje comprimido: nunca más de 75 s reales; el tope se reparte entre los tramos; la cámara rápida se ajusta a la estimación | `travel-time.test.ts`, `carrier-trip.test.ts`, `navigator.test.ts` | Jugar: viaje de la nodriza a 242916, cronometrar |
| NAV-05 | Con el módulo acoplado la nodriza hace el tramo largo y suelta el módulo cerca; solo un viaje comprimido a la vez | `carrier-trip.test.ts`, `dock-trip.test.ts` | Jugar: con la sonda de viaje, intentar programar la nodriza |
| NAV-06 | Región: límite suave, rocas como obstáculos, cielo con efemérides de JPL, LOD de las rocas | `region.test.ts`, `orbit.test.ts`, `sky.test.ts`, `lod.test.ts`, `asteroid.test.ts`, `asteroid-field.test.ts` | Solo test |

### Sonda (SON)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| SON-01 | La sonda es una nave real (~17 kg, Δv de decenas de m/s); sale estibada, se lanza con los muelles y se posa | `probe-ops.test.ts` | Jugar: consola de la sonda en el puente |
| SON-02 | El brazo solo la agarra lenta y cerca de la bahía; vuelve cargada | `probe-ops.test.ts`, `probe-trip.test.ts` | Jugar: volver a la nodriza |
| SON-03 | Se pierde por escombros, radiación o batería (~15 h); la siguiente ocupa su sitio; la estación repone el bastidor | `probe-ops.test.ts` | Solo test |
| SON-04 | Viaje largo de la sonda: retos, vuela sola en cámara rápida y espera a ~300 m (posarla es manual); tocar los mandos devuelve el control | `probe-trip.test.ts` | Jugar: Programar viaje a… |

### Subyugación en tres fases y duelos (SUB)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| SUB-01 | Duelo mental: ideas correctas persuaden, las erróneas cuestan paciencia; sin paciencia se enfada; misma semilla, mismas ideas | `duel.test.ts`, `difficulty.test.ts`, `aggression.test.ts`, `exercises.test.ts` | Jugar: duelo en Bennu |
| SUB-02 | Las fases van en orden (sonda, módulo, traje); cada una da confianza y su recompensa; solo con las tres está subyugado | `expedition.test.ts`, `rapport.test.ts` | Jugar: las tres fases en Bennu |
| SUB-03 | Un duelo fallado se notifica a la ira con su fase y no hay otro duelo hasta que se calma | `expedition.test.ts`, `wrath.test.ts` | Jugar: fallar a propósito |
| SUB-04 | Fallar la fase del traje no sacude el módulo hasta que Doménica está dentro | `expedition.test.ts` | Jugar |

### Niveles de subyugación (NIV)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| NIV-01 | Niveles 1–4 en orden, cada uno con más confianza; un fallo cuesta confianza, nunca un nivel | `levels.test.ts`, `rapport.test.ts`, `expedition.test.ts` | Jugar: Convencer · nivel N |
| NIV-02 | Nivel 2: un paquete al día a la bodega de la nodriza (20 t), que se descarga al atracar | `asteroid-services.test.ts`, `hold.test.ts`, `yields.test.ts` | Jugar (estado puesto por código) |
| NIV-03 | Nivel 3: un paquete mayor al día al buzón de la estación, con sus horas de vuelo | `asteroid-services.test.ts`, `yields.test.ts` | Jugar (estado puesto por código) |
| NIV-04 | Nivel 4: espera a que nada esté anclado, viaja a la estación, aparca y se extrae lote a lote | `asteroid-services.test.ts`, `gravity-drive.test.ts` | Jugar: mapa con la línea a su destino |

### Poderes de la ira (IRA)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| IRA-01 | El nivel de poder sale de los datos reales; la ira baja con su vida media y al calmarse se puede reintentar | `power.test.ts`, `anger.test.ts`, `wrath.test.ts` | Jugar: tarjeta de ira |
| IRA-02 | Proyectiles con cinemática real y guiado limitado; cada impacto pasa por la protección real; cargas, pulsos y chorros de cometa | `projectile.test.ts`, `effects.test.ts`, `jet.test.ts`, `wrath.test.ts` | Jugar (`demoTier`) |
| IRA-03 | Persigue a la nave que lo enfadó, la más cercana activa, hasta calmarse; huir fuera del alcance acaba la persecución | `wrath.test.ts`, `gravity-drive.test.ts` | Jugar |
| IRA-04 | Modo supervivencia: con la estación a su alcance, la estación huye con sus motores y frena al salir | `station-escape.test.ts`, `wrath.test.ts` | Jugar (`demoTier` 4) |
| IRA-05 | Embestida: un asteroide rápido (Bennu) avisa 5 s y carga contra la sonda o el módulo; choque con ½·μ·v² y restitución de Philae a través de la protección; una esquiva lateral lo hace pasarse de largo v²/2a; los grandes y lentos siguen lanzando; a una nave posada encima la sacude | `ram.test.ts`, `wrath.test.ts`, `gravity-drive.test.ts`, `asteroid-services.test.ts`, `embestida.test.ts` | Jugar (capturas `embestida-*`) |

### Estación, planos y montaje (EST)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| EST-01 | El almacén nunca va a negativo; fabricar toma los materiales y la pieza llega al hangar al acabar; las máquinas trabajan en paralelo | `station.test.ts`, `station-ops.test.ts`, `blueprints.test.ts` | Jugar: Planos |
| EST-02 | Crecer: equipo y módulos ocupan bastidores y puertos y reservan energía al ponerse en cola; sin energía, bloqueado y dice por qué | `outfit.test.ts`, `structure.test.ts`, `station-ops.test.ts` | Jugar: Planos → Equipo |
| EST-03 | El interior se genera del equipo montado: pasillos, escotillas, esclusa y consolas de cada máquina | `interior.test.ts`, `handrails.test.ts` (estación) | Jugar: Entrar en la estación |
| EST-04 | Bahía: cada pieza con datos reales, avisos por gravedad, cambios con piezas del hangar como cadenas de retos | `bay.test.ts`, `attention.test.ts`, `refit.test.ts`, `equipment.test.ts`, `drive-refit.test.ts`, `equipment-refit.test.ts`, `mothership-equipment.test.ts`, `drive.test.ts`, `parts.test.ts` | Jugar: B en la estación |

### Refinería y propelente (REF)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| REF-01 | Refinar con las temperaturas reales; con roca escasa, media tanda | `station-ops.test.ts`, `station.test.ts` | Jugar: pestaña Refinería |
| REF-02 | Planta de propelente: agua → H₂ + O₂, amoníaco, hidracina, NTO; cometas: hielo de agua y de CO₂ | `propellant-processes.test.ts`, `comet-processes.test.ts` | Solo test |
| REF-03 | Repostaje: se toma del almacén al poner en cola; si la nave se fue, vuelve al almacén; la nodriza solo atracada | `refuel.test.ts` (aplicación y dominio) | Jugar: Repostar |

### Autosustento (BIO)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| BIO-01 | Los cultivos arrancan solos al montarse; los reactores se ajustan con retos y bajan a la mitad al desajustarse | `bio-ops.test.ts`, `bioreactor.test.ts` (estación) | Jugar: pestaña Vida |
| BIO-02 | Cada proceso va al ritmo de su entrada más escasa y dice cuál; el CO₂ de la tripulación entra antes | `bioreactor.test.ts` (estación) | Solo test |
| BIO-03 | Indicador de autosustento honesto: nitrógeno importado salvo fuente local (amoníaco de cometas) | `bio-ops.test.ts`, `bioreactor.test.ts`, `bio.test.ts` | Jugar: indicador |
| BIO-04 | La comida va a la despensa de la nodriza en unidades enteras | `bio-ops.test.ts` | Jugar |

### Importación (IMP)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| IMP-01 | Pedido al Santuario: precio por lanzador, se paga al resolver los retos, llega tras el tránsito | `import-ops.test.ts`, `transfer.test.ts` (importación) | Jugar: pestaña Importar |
| IMP-02 | Remolcador SEP: empuje, tiempo y xenón reales; trae una roca y vuelve al hangar | `tug.test.ts`, `import-ops.test.ts` | Jugar |
| IMP-03 | Lanzador de masas: solo donde los paquetes escapan; lanza un paquete cada pocas horas | `tug.test.ts`, `import-ops.test.ts` | Jugar |
| IMP-04 | Cometas 67P, 46P y 133P con datos de SBDB y composición de Rosetta | `comets.test.ts` | Solo test |

### Vida a bordo (VID)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| VID-01 | Huerto y cubierta de cultivo crecen con datos reales; la cubierta hace el viaje autosuficiente | `plant.test.ts`, `species.test.ts`, `habitat.test.ts` | Jugar: huerto |
| VID-02 | Cocina: cada paso de receta es un reto; la carga de salida da varios platos; saciedad por kcal reales | `recipes.test.ts`, `nutrition.test.ts`, `habitat.test.ts`, `catalog.test.ts` | Jugar: Tareas → cocina (recorrido PX `cocina`) |
| VID-03 | Animales: gatos, perros y gallinas con necesidades reales, presentaciones, familias y reglas programadas | `pets.test.ts`, `dog.test.ts`, `hen.test.ts`, `family.test.ts`, `habitat.test.ts` | Jugar |
| VID-04 | Enfermería: heridas que empeoran sin tratar; lo grave pide la cama | `health.test.ts`, `habitat.test.ts` | Jugar |
| VID-05 | Tareas: cadenas de retos que fallan tras demasiados errores y aplican su efecto al resolverse | `chore.test.ts`, `catalog.test.ts`, `habitat.test.ts` | Jugar: Tareas |
| VID-06 | Una sacudida de un asteroide furioso rompe máquinas y crea escenarios de cuidado | `habitat.test.ts` | Jugar |
| VID-07 | Tripulación, ejercicio, yoga, carne cultivada y soporte vital | `crew-member.test.ts`, `habitat.test.ts`, `bioreactor.test.ts` (carne cultivada), `sustainability.test.ts` | Solo test |

### Paseo espacial (EVA)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| EVA-01 | Solo posada; ponerse el traje es una cadena de retos; fuera avanza agarrada, se suelta con impulso y el cable la sujeta | `eva.test.ts`, `surface-motion.test.ts`, `suit.test.ts` | Jugar: Salir de la nave |
| EVA-02 | El oxígeno se gasta más deprisa fuera; con poco vuelve sola | `eva.test.ts`, `suit.test.ts` | Jugar |
| EVA-03 | Se tumba sobre el asteroide (fase 3); un asteroide furioso la tira y el cable la recoge | `eva.test.ts` | Jugar |

### Ingravidez (ING)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| ING-01 | De asidero en asidero: impulso, planeo sin dirección, agarre del asidero previsto; contra la pared rebota | `iva.test.ts`, `handrails.test.ts` (gravedad) | Jugar: espina de la nodriza (recorrido PX `movimiento`) |
| ING-02 | Anillo de 4 rpm y 1 g; en el eje las fuerzas aparentes curvan el vuelo | `spin-gravity.test.ts`, `ring.test.ts`, `iva.test.ts` | Jugar: ascensor |

### nano_net (NNT)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| NNT-01 | Un asteroide de nivel 1 puede ser núcleo; las etapas se programan con retos hasta enlazar con el relé | `operations.test.ts`, `core.test.ts`, `network.test.ts` | Jugar |
| NNT-02 | El tiempo rompe nodos; las averías son misiones de reparación posado en el núcleo | `operations.test.ts`, `core.test.ts` | Jugar |
| NNT-03 | Dentro de la cobertura la energía repara el casco y los nodos de velocidad aceleran el tiempo | `operations.test.ts`, `network.test.ts` | Solo test |

### Misiones, radio y créditos (MIS)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| MIS-01 | Misiones de Nevaeh en orden, con carta y recompensa; las secundarias se avisan una vez | `mission.test.ts`, `mission-control.test.ts` | Jugar: radio (recorrido PX `mision`) |
| MIS-02 | Nevaeh paga créditos por misión; la cartera nunca va a negativo | `mission-control.test.ts`, `tug.test.ts` | Solo test |
| MIS-03 | El buzón entrega las cartas en orden y marca logros | `mailbox.test.ts` | Jugar |

### Interfaz de retos (UI)

| ID | Qué tiene que pasar | Test / fixture | QA |
|---|---|---|---|
| UI-01 | Vista HUD y vista panel de los retos: el botón cambia al momento y se recuerda en `localStorage` | Sin test (adaptador) | Jugar: botón «Vista HUD» |
| UI-02 | Los paneles del puente leen el estado real (propulsión, energía, vida, acople, radio, alertas) | `panels.test.ts` | Jugar: puente |
| UI-03 | Una cadena de retos falla tras demasiados errores y repetir un fallo no cuenta | `chore.test.ts` | Jugar (recorrido PX `cocina`) |

### Convivencia de procesos (CV)

Qué pasa cuando dos procesos actúan sobre el mismo estado a la vez. El mapa de qué estado comparten
está en [entrelazamiento.md](entrelazamiento.md). Los tests están en `src/qa/convivencia/` y llevan el
ID en el título; arman los módulos como los arma `main.ts`, sin Three.js ni DOM.

Clase: **Alineado** (se comportan bien juntos), **Choque** (resultado incorrecto o sin decidir),
**Arreglado** (era un choque, ahora alineado), **No aplica**.

| ID | Procesos | Qué tiene que pasar | Clase | Test / fixture | Áreas |
|---|---|---|---|---|---|
| CV-01 | Viaje comprimido × vida a bordo × estación | El reloj de misión va a la cámara rápida; la estación avanza 24 h por día de a bordo; si el viaje comprime más que la vida, la arrastra | Alineado | `relojes.test.ts` | NAV, VID, EST |
| CV-02 | Tiempo ×N manual × vida a bordo × estación | Hoy: la estación (y los niveles) corren ×N, la vida a bordo y la nano_net no | Choque (HC-01) | `relojes.test.ts` | NAV, VID, EST, NIV |
| CV-03 | Viaje comprimido × paquetes de nivel 2/3 y confianza | Un paquete por día de a bordo (40 s reales) aunque el viaje vaya a ×600 | Arreglado (B-01) | `niveles.test.ts` | NAV, NIV |
| CV-04 | Viaje comprimido × extracción de nivel 4 | La extracción va a las horas de la estación, no a la cámara rápida | Arreglado (B-01) | `niveles.test.ts` | NAV, NIV, EST |
| CV-05 | Extracción de nivel 4 × almacén | El almacén crece sin tope y sin fallar | Choque (HC-02) | `niveles.test.ts` | NIV, EST |
| CV-06 | Ira × viaje de la nodriza | Con el módulo acoplado nadie lo persigue; la ira se apaga en el reloj de misión; si se desacopla aún furioso, la persecución empieza | Alineado | `ira.test.ts` | IRA, NAV |
| CV-07 | Ira × cámara rápida > ×600 a menos de 10 fps | La ira se apaga al ritmo del reloj de misión | Choque (B-02) | `ira.test.ts` (`.fails`) | IRA, NAV |
| CV-08 | Cámara rápida de un viaje × amenazas de la ira | Hoy la cámara rápida del viaje no se frena con proyectiles en camino (la manual sí) | Choque (HC-03) | `relojes.test.ts` | NAV, IRA |
| CV-09 | Supervivencia × importación × nivel 4 aparcado | La estación huye; los pedidos llegan al almacén; el asteroide aparcado la sigue y sigue entregando; al calmarse frena | Alineado | `supervivencia.test.ts` | IRA, IMP, NIV, EST |
| CV-10 | Biorreactores × planta de propelente (amoníaco) | Nunca negativo; la planta toma al poner en cola, la biología por tick; nadie reserva | Alineado / choque (HC-04) | `almacen.test.ts` | BIO, REF, EST |
| CV-11 | Crecer la estación × biorreactores en marcha | La energía cuenta lo montado y lo que está en obra; los biorreactores trabajando no la cambian; dos obras no reservan la misma | Alineado | `almacen.test.ts` | EST, BIO |
| CV-12 | Duelo de la sonda fallado × módulo volando | Persigue a la sonda, no al módulo; perdida la sonda, se queda quieto hasta calmarse | Alineado | `ira.test.ts` | SON, SUB, IRA |
| CV-13 | Fase 3 fallada × persecución con Doménica fuera | Persigue al traje o al módulo pero se queda a su distancia: nunca se les echa encima | Alineado | `ira.test.ts` | EVA, SUB, IRA |
| CV-14 | Sonda perdida × su viaje comprimido | El viaje acaba en fallo, la cámara rápida vuelve a ×1, la nodriza queda libre y la siguiente sonda puede viajar | Alineado | `sonda.test.ts` | SON, NAV |
| CV-15 | Dos pedidos en retos × créditos para uno | El segundo, resuelto, no cobra ni envía nada (y hoy no avisa); un pago a mitad de la cadena lo deja pasar | Choque menor (HC-05) | `almacen.test.ts` | IMP, MIS |
| CV-16 | Guardar y cargar a mitad de viaje | No hay partidas guardadas: recargar empieza de cero | No aplica (HC-06) | — | NAV |
| CV-17 | Embestida × viaje comprimido | Con el módulo acoplado (viaje de la nodriza) no hay embestida. A ×1 el aviso dura 5 s reales y la carga más de 30 s. En el tramo comprimido del módulo (×60) el aviso dura < 0,1 s real y el choque llega en ~1 s: no se puede esquivar | Choque (HC-03) | `embestida.test.ts` | IRA, NAV |

#### Casos con carrera

Cómo se provoca cada cruce jugando, o por qué solo lo cubre el test. La acción a mitad y su momento
van al run log.

| ID | Acción a mitad | Cubierto por |
|---|---|---|
| CV-03 | Con Bennu en nivel 3 (por código), programar un viaje de la nodriza y, durante los 30 s, mirar el aviso de radio: no debe llegar más de un paquete | Test; en vivo con estado puesto por código |
| CV-06 | Fallar el duelo de la fase 2 en Bennu, despegar, acoplar y programar un viaje; al llegar, desacoplar | Test y en vivo |
| CV-09 | Con `demoTier(4)` en Bennu y un pedido en camino, fallar un duelo; ver la pestaña Importar mientras la estación huye | Test y en vivo |
| CV-12 | Sonda posada en Bennu, despegar con el módulo; fallar el duelo de la sonda; abandonar la sonda | Test y en vivo |
| CV-14 | Sonda de viaje; en mitad, dejar que la ira la destruya (o forzar la batería por código) e intentar programar la nodriza | Test; en vivo probabilístico |
| CV-07 | Solo test: hace falta < 10 fps y un salto de la nodriza de más de ~25 km |  |

### Experiencia del jugador (PX)

Recorridos completos jugados con toques reales (`touchscreen.tap`) en el perfil iPhone 13 de Playwright con la CPU ×4,
con capturas, comprobaciones de toque (≥ 44 px, no tapado, con nombre) y rendimiento frente a presupuesto. Código en
`tools/experiencia/` (`npm run experiencia`), diseño y presupuestos en [docs/testing.md](../testing.md). Los IDs no se
reutilizan: un recorrido que deja de aplicar pasa a `Retirado`. La lista debe coincidir con `JOURNEYS` de
`tools/experiencia/presupuestos.mjs` (`npm run check:docs`). Cada ejecución deja `runs/<fecha>-PX-….md` y reescribe la
fila del recorrido en [registro.md](registro.md).

| ID | Recorrido | Qué debe pasar | Modo |
| --- | --- | --- | --- |
| PX-01 | `cocina` | Tres toques sobre la misma opción errónea dejan **Fallos 1/3**, la opción marcada con ✗ y el paso sin avanzar ni terminar; con los siete pasos bien, «✓ Conseguido 7/7 con 1 fallo» y la despensa (al tocar el estado) con crema de cacahuete. En vista HUD: fallos en ámbar sobre placa oscura, rojo al tope, «✗ Reto perdido» que un toque inmediato no cierra, y la receta sigue disponible. | iPhone 13, CPU ×4 |
| PX-02 | `movimiento` | W enciende el RCS y el HUD lo dice; la velocidad deja de estar en reposo. En la escotilla, Impulsarse la mueve (lo dice el HUD y cambia la vista). Una tarea elegida en el eje avisa «Bajas al anillo». En el anillo, Caminar avanza la vista y el HUD dice la gravedad. | iPhone 13, CPU ×4 |
| PX-03 | `mision` | La radio avisa de cartas; una trae la misión de Bennu; el registro abre con 0 hechas. Posado (fase de la sonda preparada), la acción principal aparece abajo a la derecha; un fallo suma «Fallos 1/N»; ganar muestra «Conseguido» con un solo botón para volver. Con el traje, tumbarse y ganar el tercer duelo: Bennu persuadido y aviso de misión cumplida que no tapa el resultado. | iPhone 13, CPU ×4 |
| PX-04 | `acciones-movil` | Cada pantalla (cabina acoplada y libre, ingravidez, anillo, tareas, puente, mapa, sonda, posado, traje, paseo, estación y sus seis pestañas) sin controles solapados a 390×664 visibles; capturas `ux-<antes/despues>-*-movil.png`. | iPhone 13, CPU ×1 |
| PX-05 | `acciones-escritorio` | Lo mismo a 1280×800; capturas `ux-*-escritorio.png`. | Escritorio, CPU ×1 |

---

## Bugs y huecos conocidos

| ID | Caso | Detalle | Estado |
|---|---|---|---|
| B-01 | CV-03, CV-04 | `AsteroidServices` contaba los días de los paquetes de nivel 2 y 3, la confianza que devuelve el servicio y las horas de extracción de nivel 4 con el reloj de misión (`dt × warp`). En un viaje de la nodriza a ×600, 30 s reales daban 449 paquetes en vez de 0 | Arreglado en `qa-casos`: `update(dtS, stationHours)` y `LevelsUi.update` reciben las horas de la estación de `frameClocks` |
| B-02 | CV-07 | `AsteroidWrath.update` descarta lo que pase de 60 s de juego por llamada. Un salto largo de la nodriza va a más de ×600 (el tope se reparte con el tramo del módulo: ≈ ×629 para 30 km) y a menos de 10 fps `main` limita el fotograma a 0,1 s: la ira se apaga más despacio que el reloj de misión (≈ 9 % en el test) | Abierto: subir el tope cuesta pasos por fotograma; decidir entre tope en pasos o repartir en varias llamadas |
| HC-01 | CV-02 | Con el tiempo ×10/×50 manual la estación, su buzón, los biosistemas y los servicios de los niveles corren ×N y la vida a bordo y la nano_net no. ¿Debe la vida a bordo acelerar también, o la estación no? | Decisión de diseño |
| HC-02 | CV-05 | El almacén no tiene tope: la extracción de nivel 4 lo llena sin límite (pregunta abierta de subyugacion.md) | Decisión de diseño |
| HC-03 | CV-08, CV-17 | La regla de poderes-ira.md («tiempo acelerado solo si nada vuela hacia el módulo») solo frena la cámara rápida manual, no la de un viaje del módulo (hasta ×60). Lo mismo con una embestida: `allowsWarp` la cuenta, pero la cámara rápida del viaje no | Decisión de diseño |
| HC-04 | CV-10 | Nada reserva el almacén: el abono con amoníaco (activado por defecto) puede gastar el amoníaco que el jugador guardaba para hidracina | Decisión de diseño |
| HC-05 | CV-15 | Resolver la cadena de un pedido sin créditos no hace nada y no avisa: el jugador no sabe por qué no llegó | Abierto |
| HC-06 | CV-16 | No hay partidas guardadas (solo la preferencia de la vista de retos en `localStorage`) | Sin plan |
