# CV-01 a CV-15 · 2026-11-13 10:18 · vitest · Node 22 (contenedor, 4 CPU)

Commit: `99b1cef` · Rama: `qa-casos` · Ejecutor: agente (Claude)
Perfil: Vitest 5.1.0 en Node v22.23.4, linux-x64, 4 CPU; sin navegador
Recorrido / casos: `npx vitest run src/qa --reporter=verbose` (los 6 ficheros de `src/qa/convivencia/`)
Preparación: ninguna (cada test arma su mundo en `src/qa/convivencia/mundo.ts`)
Acción a mitad (casos con carrera): dentro de los tests. CV-06: el módulo se desacopla con Bennu aún furioso. CV-09: Bennu se enfada (`demoTier` 4) con un pedido en camino y un miembro de Nueva Polana (`POLANA_MEMBERS[0]`) de nivel 4 ya aparcado. CV-12: la sonda se pierde con el asteroide furioso. CV-14: pulso de radiación a los 3 s reales del viaje de la sonda. Todos se cruzaron (lo comprueba el propio test)
Resultado: OK · 24 OK, 1 `.fails` esperado (CV-07, B-02)
Rendimiento: suite en 1,58 s (tests 0,8 s); el caso más lento, CV-14 (física de la sonda a 120 Hz), 289 ms
Evidencia: salida abajo
Hallazgos: H1 (antes del arreglo), H2, H3, H4, H5, H6, H7

## Salida

```
 ✓ supervivencia.test.ts > CV-09 la estación huye mientras llegan un pedido del Santuario y los lotes de un asteroide de nivel 4 aparcado, que la sigue 114ms
 ✓ niveles.test.ts > CV-03 un viaje comprimido no multiplica los paquetes de nivel 3: salen uno por día de la estación (40 s reales) 140ms
 ✓ supervivencia.test.ts > CV-09 cuando la ira se apaga la estación frena y se queda donde llegó; las entregas siguen llegando 84ms
 ✓ niveles.test.ts > CV-03 nivel 2: los paquetes a la bodega de la nodriza tampoco se multiplican con la cámara rápida 85ms
 ✓ niveles.test.ts > CV-03 la confianza que devuelve el servicio tranquilo sigue los días de a bordo, no la cámara rápida 68ms
 ✓ niveles.test.ts > CV-04 la extracción de nivel 4 durante un viaje comprimido va al ritmo de las horas de la estación 77ms
 ✓ niveles.test.ts > CV-05 la extracción de nivel 4 llena el almacén sin tope: crece sin fallar (HC-02, pregunta abierta) 19ms
 ✓ sonda.test.ts > CV-14 la sonda se pierde en pleno viaje: el viaje acaba en fallo, la cámara rápida vuelve a ×1 y la nodriza queda libre 289ms
 ✓ ira.test.ts > CV-06 ira durante un viaje de la nodriza: el módulo acoplado no es blanco, nadie persigue y la ira se apaga en el reloj de misión 119ms
 ✓ ira.test.ts > CV-06 si el módulo se desacopla con el asteroide aún furioso, la persecución empieza entonces 2ms
 ✓ ira.test.ts > CV-07 a pocos fps y cámara rápida de más de ×600 la ira se apaga al ritmo del reloj de misión (B-02) 8ms
 ✓ ira.test.ts > CV-12 un duelo de la sonda falla con el módulo volando cerca: el asteroide persigue a la sonda, no al módulo 1ms
 ✓ ira.test.ts > CV-13 fase 3 fallada con Doménica fuera: persigue al traje o al módulo, pero no se les echa encima (se queda a su distancia) 16ms
 ✓ relojes.test.ts > CV-01 en un viaje comprimido el reloj de misión va a la cámara rápida y la estación a las horas de la vida a bordo 2ms
 ✓ relojes.test.ts > CV-01 un viaje que comprime más que la vida a bordo arrastra la vida y la estación con él 0ms
 ✓ relojes.test.ts > CV-01 a lo largo de un viaje entero los relojes no se separan: horas de estación = 24 × días de a bordo 2ms
 ✓ relojes.test.ts > CV-02 tiempo acelerado a mano (×50, sin viaje): la estación corre ×50 y la vida a bordo no (HC-01, se fija lo actual) 0ms
 ✓ relojes.test.ts > CV-02 consecuencia: con ×50 a mano la estación avanza más deprisa que en un viaje de la nodriza a ×600 0ms
 ✓ relojes.test.ts > CV-08 la cámara rápida de un viaje manda sobre la manual y no la frena nada más (HC-03: ni las amenazas de la ira) 0ms
 ✓ relojes.test.ts > CV-01 un fotograma de tiempo negativo o nulo no mueve ningún reloj 0ms
 ✓ almacen.test.ts > CV-10 la planta pone en cola hidracina y luego los cultivos abonan con el amoníaco que queda: nada negativo 5ms
 ✓ almacen.test.ts > CV-10 al revés: el abono con amoníaco se come primero el amoníaco y la planta solo hace media tanda (HC-04, sin reservas) 1ms
 ✓ almacen.test.ts > CV-10 la refinería y los biorreactores intercalados muchas veces no dejan nunca el almacén en negativo 4ms
 ✓ almacen.test.ts > CV-11 crecer la estación reserva su energía al ponerse en cola, aunque los biorreactores estén trabajando 1ms
 ✓ almacen.test.ts > CV-15 dos pedidos en retos a la vez con créditos para uno: el segundo, resuelto, no cobra ni envía nada y no avisa (HC-05) 5ms
 Test Files  6 passed (6)
      Tests  24 passed | 1 expected fail (25)
   Duration  1.58s (tests 52%, transform 24%, import 22%, worker 1%)
```

(Rutas acortadas a `fichero > ID`; el `describe` de cada fichero se omite.)

## Notas

- **Antes del arreglo de B-01** (mismos tests sobre el árbol de `995c2bc`, sin commit): CV-03 y CV-04
  en rojo. «Expected 449 to be 0»: 30 s reales de un viaje de la nodriza a ×600 mandaban 449 paquetes
  de nivel 3 a la estación y 449 de nivel 2 a la bodega, y la confianza subía +10 % (el tope) en vez de
  +1,5 %. Es H1.
- **CV-07** se marcó `.fails` tras comprobar que falla por la razón esperada: con ×629 y fotogramas de
  0,1 s la ira queda en 0,177 cuando por el reloj de misión debería estar en 0,163 (≈ 9 % atrás).
- Los CV fijan el comportamiento de hoy cuando es un hueco sin decidir (CV-02, CV-05, CV-08, CV-10,
  CV-15): si se decide cambiarlo, el test cambia con el caso y el hueco se cierra en casos.md.
- Ningún caso se jugó en el navegador en esta ejecución: los `Probado (suite)` no sustituyen a una
  partida (ver «Casos con carrera» en casos.md para provocarlos en vivo).
