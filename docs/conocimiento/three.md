# Three.js

### Una segunda cámara (la vista en directo) dibuja la escena tal como la dejó la vista principal

- **Síntoma:** en la vista en directo de un viaje, el módulo de aterrizaje se queda donde estaba la
  última vez que se vio la cabina.
- **Medido (código):** el modelo del módulo solo sigue al vuelo en la vista de cabina; `present()` en
  `main.ts` lo coloca a mano antes de `tripPreview.render`.
- **Cómo se evita:** antes de dibujar la escena con otra cámara, colocar todo lo que solo se actualiza
  en la vista principal.
- **Dónde:** `src/main.ts` (`present`), `src/adapters/three/trip-preview.ts`.

### Lo que se regenera (la estación que crece, los rieles, las trazas) se libera con `dispose`

- **Síntoma (hipótesis):** sin liberar, la memoria de GPU crece cada vez que la estación crece.
- **Medido (código):** `station-model.ts`, `station-interior.ts`, `ship-model.ts`, `wrath-view.ts` y
  `nano-net-view.ts` llaman a `geometry.dispose()` (y a `material.dispose()` donde el material es suyo).
- **Cómo se evita:** al reconstruir un modelo, `dispose` de geometrías y materiales propios; los
  materiales compartidos no.
- **Dónde:** los ficheros citados.

### Escala de 5 cm a 2 000 km en una sola escena: búfer de profundidad logarítmico

- **Hipótesis:** sin `logarithmicDepthBuffer` habría z-fighting entre la cabina (plano cercano 0,05 m)
  y el asteroide y la estación (plano lejano 2·10⁶ m).
- **Medido (código):** `main.ts` crea el renderer con `logarithmicDepthBuffer: true` y la cámara con
  `near = 0,05`, `far = 2e6`. El Sol y los planetas son impostores (docs/research/sistema-solar.md).
- **Cómo se evita:** no bajar `near` ni subir `far` sin mirar la profundidad.
- **Dónde:** `src/main.ts`.

### Miles de piezas iguales: `InstancedMesh`

- **Medido (código):** las rocas cercanas, los cantos de Bennu, los cultivos, los peldaños y los
  asideros son `InstancedMesh`; las 5000 rocas lejanas son puntos en un solo draw call
  (docs/research/sistema-solar.md: el LOD cuesta ~0,3 ms cada 4 fotogramas).
- **Cómo se evita:** lo repetido entra como instancias; el presupuesto de llamadas de dibujo
  (600 por fotograma) está en `docs/testing.md` de `jugabilidad-ux`.
- **Dónde:** `asteroid-field.ts`, `asteroid-mesh.ts`, `interior/farm-deck.ts`, `interior/zero-g-body.ts`.
