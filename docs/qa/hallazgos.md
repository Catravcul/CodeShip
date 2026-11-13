# Hallazgos

Lo que se vio en una ejecución (de la suite o jugando) y no es simplemente «OK». Los `Hn` no se
renumeran ni se borran: cambia su estado. Un hallazgo que es un fallo pasa a `B-nn` en la tabla de
bugs de [casos.md](casos.md); uno que pide una decisión, a `HC-nn`. Si enseña algo general del motor,
del navegador o de la simulación, se apunta también en [docs/conocimiento/](../conocimiento/README.md).

| Hn | Caso | Run | Qué se vio | Estado |
|---|---|---|---|---|
| H1 | CV-03, CV-04 | [2026-11-13 10:18](runs/2026-11-13-1018-cv-convivencia-vitest.md) (notas: antes del arreglo) | En 30 s reales de un viaje de la nodriza a ×600 un asteroide de nivel 3 mandó 449 paquetes a la estación (debía mandar 0), uno de nivel 2 llenaba la bodega igual, la confianza subía al tope y la extracción de nivel 4 iba 600 veces más deprisa. Los servicios contaban días con el reloj de misión | **B-01**, arreglado en `qa-casos` (`99b1cef`) |
| H2 | CV-07 | [2026-11-13 10:18](runs/2026-11-13-1018-cv-convivencia-vitest.md) | A menos de 10 fps y con un salto de la nodriza por encima de ×600 la ira se apaga ≈ 9 % más despacio que el reloj de misión: `AsteroidWrath.update` tira lo que pasa de 60 s por llamada | **B-02**, arreglado en `decisiones-hc` (`5a68872`) |
| H3 | CV-02 | [2026-11-13 10:18](runs/2026-11-13-1018-cv-convivencia-vitest.md) | Con ×50 manual la estación avanza 50 veces más que la vida a bordo, y más que durante un viaje a ×600 | **HC-01**, cerrado en `decisiones-hc` (`f60ac62`): la vida a bordo acelera también |
| H4 | CV-05 | [2026-11-13 10:18](runs/2026-11-13-1018-cv-convivencia-vitest.md) | En diez días de juego la extracción de Bennu mete más de 100 t en el almacén, sin tope | **HC-02**, cerrado en `decisiones-hc` (`9f8354f`, `c21eebe`): almacén con tope por módulos |
| H5 | CV-08 | [2026-11-13 10:18](runs/2026-11-13-1018-cv-convivencia-vitest.md) | La cámara rápida de un viaje no mira las amenazas de la ira; la manual sí | **HC-03**, cerrado en `decisiones-hc` (`f60ac62`): una amenaza baja el viaje a ×1 |
| H6 | CV-10 | [2026-11-13 10:18](runs/2026-11-13-1018-cv-convivencia-vitest.md) | Con 1,72 kg de amoníaco, un día de abono deja la hidracina en media tanda; al revés, la hidracina deja los cultivos sin abono | **HC-04**, cerrado en `decisiones-hc` (`4832217`): reservas con prioridad, el propelente primero |
| H7 | CV-15 | [2026-11-13 10:18](runs/2026-11-13-1018-cv-convivencia-vitest.md) | Resolver el segundo de dos pedidos abiertos sin créditos no hace nada ni dice nada | **HC-05**, cerrado en `decisiones-hc` (`b098bf1`): el pedido dice cuántos créditos faltan |
| H8 | EST-05, CV-05 | [2026-11-13 12:00](runs/2026-11-13-1200-hc-decisiones-vitest.md) | Con la capacidad nueva, el almacén de partida pesaba 20,9 t de 9,8 t: el xenón de la nodriza (20 t) contaba como carga de bastidores | Arreglado en el mismo run (`c21eebe`): los propelentes van en sus depósitos y no ocupan almacén; su tope queda como pregunta abierta |
