# Codeship

Juego web de pilotaje espacial realista. El jugador vuela en primera persona hasta asteroides reales, se enfrenta a su «mente» resolviendo código y, si gana, el asteroide cede sus recursos. Comparte mundo con Cold Sanctuary.

Esta es la versión 2, rehecha desde cero con Three.js y TypeScript. El borrador anterior (React 17) sigue en las ramas `develop`, `top_nav` y `recuperar-onedrive`.

**Preview jugable:** https://catravcul.github.io/CodeShip/ (rama `gh-pages`; se publica con `npx vite build --base=./` y se sube la carpeta compilada a esa rama).

A bordo, Doménica cuida un huerto, una cubierta de cultivo que hace el viaje autosuficiente, gatos, chihuahuas y gallinas libres que pueden llegar a ser una familia, y recibe por radio las cartas de Nevaeh y las llamadas de Kushal. Todo se hace con retos de código. Diseño en [docs/design/vida-a-bordo.md](docs/design/vida-a-bordo.md).

## Arrancar

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests del dominio (Vitest)
npm run lint:arch  # comprueba que el dominio no dependa de Three.js ni del DOM
npm run build
```

## Controles

| Acción | Tecla |
| --- | --- |
| Avanzar / retroceder (RCS) | W / S |
| Lateral (RCS) | A / D |
| Subir / bajar (RCS) | R / F |
| Cabeceo / guiñada | Flechas |
| Alabeo | Q / E |
| Motor principal | Espacio |
| Asistente de rotación | T |
| Cambiar cámara (cabina, trasera, exterior) | C |
| Centrar la vista | V |
| Acelerar el tiempo (×1, ×10, ×50) | X |

En la cabina, el mando **Mirar** (o arrastrar la pantalla) gira la cabeza del piloto para ver por las ventanas laterales; la cámara trasera muestra lo que queda detrás de la tobera y la exterior orbita alrededor de la nave. Los RCS empujan poco (≈0,07 m/s² con 670 kg), así que el polvo espacial y la línea de propulsores del HUD muestran que la nave se mueve; el motor principal da ≈0,7 m/s². El tiempo acelerado solo actúa sin maniobrar y a más de 150 m del asteroide.

En el móvil hay mandos táctiles. Con el botón **Ir al interior** se entra en el módulo habitable: Doménica se ve en tercera persona (el botón **Vista** pasa a primera persona), se camina con el mando **Caminar** o WASD y se mira con el mando **Mirar**, las flechas o arrastrando. **Tareas** lista lo que hay que hacer a bordo; cada tarea es una cadena de retos de código (ver [vida-a-bordo.md](docs/design/vida-a-bordo.md)). El módulo tiene huerto, cocina, molino, laboratorio de carne cultivada, enfermería, gallinero, rincón de los gatos, esterilla de yoga y el panel de la mente de la nave.

Con la nave **anclada**, **Salir de la nave** lleva a Doménica a Bennu con un traje EMU: ponérselo es una cadena de retos y fuera avanza agarrada a las rocas (mando **Moverse** o WASD), se suelta con **Impulso** (Espacio), baja con el SAFER (**Bajar**, F), recoge el cable de 25,9 m (R), toma muestras (Intro) y vuelve con **Volver a la nave** (B). En Bennu la velocidad de escape es ≈0,2 m/s y un paso normal la lanzaría al espacio. Diseño en [docs/design/paseo-espacial.md](docs/design/paseo-espacial.md).

## Arquitectura

Monolito modular con arquitectura hexagonal. Cada módulo tiene `domain/` (reglas puras, sin motor), `application/` (casos de uso) y `data/` (catálogos con fuentes). Los adaptadores (Three.js, teclado, HUD) viven fuera y dependen del dominio, nunca al revés; `npm run lint:arch` lo comprueba en CI.

```
src/
  core/            núcleo compartido: Vec3, Quat, unidades, valores con fuente
  modules/
    ship/          nave como composición de componentes reales; masa, inercia, delta-v
    flight/        sólido rígido 6DOF newtoniano, ordenador de vuelo a 120 Hz fijo
    celestial/     asteroides reales: masa, densidad, rotación, gravedad, composición
  content/         generadores procedurales deterministas (forma de asteroides)
  adapters/three/  escena, cabina, malla del asteroide, estrellas
  adapters/input/  teclado → orden de empuje
  ui/              HUD
```

Reglas: TDD en `domain/` y `application/`; cada valor real lleva su fuente (`sources` o `Sourced<T>`); la simulación es determinista y se prueba sin renderizar.

## Datos reales usados

| Elemento | Valores | Fuente |
| --- | --- | --- |
| Motor principal R-4D | 490 N, Isp 312 s, 3,6 kg, MMH/NTO | [Wikipedia](https://en.wikipedia.org/wiki/R-4D) |
| RCS MR-106L | 22 N (10–34 N), Isp 228–235 s, 0,59 kg, hidracina | [SatCatalog](https://satcatalog.com/component/mr-106l-22n) |
| 101955 Bennu | 565×535×508 m, radio medio 245,03 m, 7,329×10¹⁰ kg, 1190 kg/m³, rotación 4,296057 h, tipo B | [Wikipedia](https://en.wikipedia.org/wiki/101955_Bennu) |

El casco y los tanques de la nave inicial son valores de juego, a sustituir por piezas reales. La distribución de 24 propulsores RCS en pares dedicados es una simplificación jugable.
