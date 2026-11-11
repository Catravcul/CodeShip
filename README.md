# Codeship

Juego web de pilotaje espacial realista. El jugador vuela en primera persona hasta asteroides reales, se enfrenta a su «mente» resolviendo código y, si gana, el asteroide cede sus recursos. Comparte mundo con Cold Sanctuary.

Esta es la versión 2, rehecha desde cero con Three.js y TypeScript. El borrador anterior (React 17) sigue en las ramas `develop`, `top_nav` y `recuperar-onedrive`.

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

En el móvil hay mandos táctiles. Con el botón **Ir al interior** se entra en el módulo habitable: se camina con WASD (o el joystick) y se mira con las flechas o arrastrando. **Tareas** lista lo que hay que hacer a bordo; cada tarea es una cadena de retos de código (ver [vida-a-bordo.md](docs/design/vida-a-bordo.md)). El módulo tiene huerto, cocina, molino, laboratorio de carne cultivada, enfermería, gallinero, rincón de los gatos, esterilla de yoga y el panel de la mente de la nave.

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
