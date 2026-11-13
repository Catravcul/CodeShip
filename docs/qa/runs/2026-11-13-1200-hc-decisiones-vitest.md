# CV-01…CV-17, EST-05 · 2026-11-13 12:00 · vitest + en vivo · Node 22 / iPhone 13

Commit: `c21eebe` · Rama: `decisiones-hc` · Ejecutor: agente (Claude)
Perfil: Vitest en Node 22 (CPU); navegador Chromium de Playwright con emulación iPhone 13 (sin CPU ×4), GPU por software (SwiftShader)
Recorrido / casos: suite de convivencia (`npx vitest run src/qa`) tras implementar las decisiones HC-01 a HC-05 y el arreglo de B-02; en vivo: tarjeta del almacén lleno (EST-05, CV-05), botón de pedido sin créditos (CV-15) y un viaje del módulo con una amenaza (CV-08, CV-17)
Preparación: por código (`window.codeship`): almacén llenado hasta su capacidad (`stock.add` con `roomKg` de silicatos), cartera vaciada (`wallet.spend`), módulo desacoplado y viaje programado a 242916 resolviendo los retos con la solución
Acción a mitad (casos con carrera): CV-17/CV-08: a los 3 s del tramo del módulo (×6,6, faltaban 73,9 s reales) se forzó `duelFailed(242916, 2)`; el viaje bajó a ×1 con «⚠ Amenaza: viaje a ×1 hasta que pase» y la cuenta atrás se quedó en 73 s durante 4,5 s; al calmarlo (`setAnger 0`) siguió (72,1 s)
Resultado: OK · 32 OK, 0 `.fails` (CV-07 ya pasa)
Rendimiento: suite 1,2 s; en vivo informativo (SwiftShader)
Evidencia: salida abajo; capturas `docs/screenshots/hc-almacen-mobile.png`, `hc-pedido-sin-creditos-mobile.png`, `hc-viaje-antes-mobile.png`, `hc-viaje-amenaza-mobile.png`; sin errores de página ni de consola
Hallazgos: H8

## Salida

```
 ✓ src/qa/convivencia/ira.test.ts > CV · ira de los asteroides con otros procesos > CV-06 ira durante un viaje de la nodriza: el módulo acoplado no es blanco, nadie persigue y la ira se apaga en el reloj de misión 62ms
 ✓ src/qa/convivencia/ira.test.ts > CV · ira de los asteroides con otros procesos > CV-06 si el módulo se desacopla con el asteroide aún furioso, la persecución empieza entonces 2ms
 ✓ src/qa/convivencia/ira.test.ts > CV · ira de los asteroides con otros procesos > CV-07 a pocos fps y cámara rápida de más de ×600 la ira se apaga al ritmo del reloj de misión (B-02) 10ms
 ✓ src/qa/convivencia/ira.test.ts > CV · ira de los asteroides con otros procesos > CV-12 un duelo de la sonda falla con el módulo volando cerca: el asteroide persigue a la sonda, no al módulo 1ms
 ✓ src/qa/convivencia/ira.test.ts > CV · ira de los asteroides con otros procesos > CV-13 fase 3 fallada con Doménica fuera: persigue al traje o al módulo, pero no se les echa encima (se queda a su distancia) 13ms
 ✓ src/qa/convivencia/embestida.test.ts > CV · embestida con otros procesos > CV-17 viaje de la nodriza con el módulo acoplado: no es blanco, Bennu furioso no embiste a nada 62ms
 ✓ src/qa/convivencia/embestida.test.ts > CV · embestida con otros procesos > CV-17 a ×1 el aviso dura sus 5 s reales y la carga desde 300 m deja tiempo para esquivar 26ms
 ✓ src/qa/convivencia/embestida.test.ts > CV · embestida con otros procesos > CV-17 en el tramo comprimido del módulo (×60) la amenaza baja el viaje a ×1: el aviso dura sus 5 s reales y da tiempo a esquivar (HC-03) 25ms
 ✓ src/qa/convivencia/embestida.test.ts > CV · embestida con otros procesos > CV-17 sin mirar las amenazas (como antes de HC-03) el aviso a ×60 dura menos de 0,1 s real y el choque llega en ~1 s 31ms
 ✓ src/qa/convivencia/sonda.test.ts > CV · sonda perdida a mitad de su viaje > CV-14 la sonda se pierde en pleno viaje: el viaje acaba en fallo, la cámara rápida vuelve a ×1 y la nodriza queda libre 352ms
 ✓ src/qa/convivencia/supervivencia.test.ts > CV · modo supervivencia con entregas en camino > CV-09 la estación huye mientras llegan un pedido del Santuario y los lotes de un asteroide de nivel 4 aparcado, que la sigue 89ms
 ✓ src/qa/convivencia/supervivencia.test.ts > CV · modo supervivencia con entregas en camino > CV-09 cuando la ira se apaga la estación frena y se queda donde llegó; las entregas siguen llegando 39ms
 ✓ src/qa/convivencia/relojes.test.ts > CV · relojes del mundo > CV-01 en un viaje comprimido el reloj de misión va a la cámara rápida y la estación a las horas de la vida a bordo 2ms
 ✓ src/qa/convivencia/relojes.test.ts > CV · relojes del mundo > CV-01 un viaje que comprime más que la vida a bordo arrastra la vida y la estación con él 3ms
 ✓ src/qa/convivencia/relojes.test.ts > CV · relojes del mundo > CV-01 a lo largo de un viaje entero los relojes no se separan: horas de estación = 24 × días de a bordo 2ms
 ✓ src/qa/convivencia/relojes.test.ts > CV · relojes del mundo > CV-02 tiempo acelerado a mano (×50, sin viaje): la vida a bordo corre ×50 igual que la estación (HC-01) 0ms
 ✓ src/qa/convivencia/relojes.test.ts > CV · relojes del mundo > CV-02 con ×10 a mano un día de a bordo dura 4 s reales, y la estación no se separa de la vida a lo largo de un minuto 3ms
 ✓ src/qa/convivencia/relojes.test.ts > CV · relojes del mundo > CV-08 una amenaza de la ira baja a ×1 la cámara rápida del viaje (y la manual), y el viaje queda retenido (HC-03) 0ms
 ✓ src/qa/convivencia/relojes.test.ts > CV · relojes del mundo > CV-08 al pasar la amenaza el viaje recupera su cámara rápida, que manda sobre la manual 0ms
 ✓ src/qa/convivencia/relojes.test.ts > CV · relojes del mundo > CV-01 un fotograma de tiempo negativo o nulo no mueve ningún reloj 0ms
 ✓ src/qa/convivencia/niveles.test.ts > CV · niveles de subyugación y viaje comprimido > CV-03 un viaje comprimido no multiplica los paquetes de nivel 3: salen uno por día de la estación (40 s reales) 34ms
 ✓ src/qa/convivencia/niveles.test.ts > CV · niveles de subyugación y viaje comprimido > CV-03 nivel 2: los paquetes a la bodega de la nodriza tampoco se multiplican con la cámara rápida 38ms
 ✓ src/qa/convivencia/niveles.test.ts > CV · niveles de subyugación y viaje comprimido > CV-03 la confianza que devuelve el servicio tranquilo sigue los días de a bordo, no la cámara rápida 23ms
 ✓ src/qa/convivencia/niveles.test.ts > CV · niveles de subyugación y viaje comprimido > CV-04 la extracción de nivel 4 durante un viaje comprimido va al ritmo de las horas de la estación 68ms
 ✓ src/qa/convivencia/niveles.test.ts > CV · niveles de subyugación y viaje comprimido > CV-05 la extracción de nivel 4 llena el almacén hasta su capacidad y para: el asteroide guarda el resto (HC-02) 22ms
 ✓ src/qa/convivencia/niveles.test.ts > CV · niveles de subyugación y viaje comprimido > CV-05 con el almacén lleno los paquetes de nivel 3 esperan en el buzón y entran al hacer sitio (HC-02) 2ms
 ✓ src/qa/convivencia/almacen.test.ts > CV · almacén, energía y créditos compartidos > CV-10 la planta pone en cola hidracina y luego los cultivos abonan con el amoníaco que queda: nada negativo 5ms
 ✓ src/qa/convivencia/almacen.test.ts > CV · almacén, energía y créditos compartidos > CV-10 al revés: con poco amoníaco el abono no toca la reserva de propelente y la planta hace su tanda entera (HC-04) 1ms
 ✓ src/qa/convivencia/almacen.test.ts > CV · almacén, energía y créditos compartidos > CV-10 con amoníaco de sobra el abono usa solo lo que pasa de la reserva de propelente (HC-04) 2ms
 ✓ src/qa/convivencia/almacen.test.ts > CV · almacén, energía y créditos compartidos > CV-10 la refinería y los biorreactores intercalados muchas veces no dejan nunca el almacén en negativo 3ms
 ✓ src/qa/convivencia/almacen.test.ts > CV · almacén, energía y créditos compartidos > CV-11 crecer la estación reserva su energía al ponerse en cola, aunque los biorreactores estén trabajando 1ms
 ✓ src/qa/convivencia/almacen.test.ts > CV · almacén, energía y créditos compartidos > CV-15 dos pedidos en retos a la vez con créditos para uno: el segundo, resuelto, no cobra ni envía nada y dice cuántos créditos faltan (HC-05) 5ms
 Test Files  7 passed (7)
      Tests  32 passed (32)
   Duration  1.15s (tests 46%, transform 29%, import 21%, worker 4%)
```

## Notas

- Números clave: almacén de partida 9,8 t (14 bastidores ISPR de 700 kg); +2,8 t por módulo, +20 t el
  hangar; reserva de propelente 3,4 kg de amoníaco; la ira reparte en 600 subpasos una llamada de más de
  60 s de juego.
- En vivo: «Almacén · 9,8 t de 9,8 t · 100 % · Almacén lleno…» y «Reservado para propelente: amoníaco
  3,4 kg»; botón «Faltan 573 créditos» desactivado.
- H8: al principio el xenón de la nodriza (20 t) ocupaba el almacén y lo dejaba en 20,9 t de 9,8 t; los
  propelentes pasan a sus depósitos, sin tope (pregunta abierta).
- Sin probar en vivo: el mensaje «No se pidió: faltan N créditos» al resolver un pedido sin créditos (lo
  cubre CV-15 en la suite), la extracción de nivel 4 parada con el almacén lleno (CV-05) y el ×N manual
  con la vida a bordo (CV-02).
