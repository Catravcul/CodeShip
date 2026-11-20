# Bucle de juego

Diseño acordado con Berón el 11 de noviembre de 2026. El jugador programa los viajes largos, pilota a mano los tramos cortos, aterriza en el asteroide y entra en su mente para persuadirlo.

```
Planificar ruta (programación) → Viaje automático (vida a bordo) → Llegada y pilotaje manual
      ↑                                                                     ↓
Recursos a bodega ← Asteroide persuadido ← Duelo mental ← Aterrizar y anclarse
                                                ↓
                                  Paciencia agotada → asteroide agresivo → huir a distancia segura
```

## 1. Viajes largos: se programan

Las distancias entre asteroides son enormes, así que esos tramos no se pilotan. Se resuelven con un reto de programación que define la maniobra, y la física real calcula la trayectoria:

- Bloques de maniobra: esperar la ventana de lanzamiento, encender el motor con un delta-v dado, aprovechar la gravedad de un cuerpo (asistencia gravitatoria), corregir en mitad del camino.
- El delta-v disponible sale de la nave real (`Ship.mainDeltaV()`), así que mejorar motores o tanques abre destinos más lejanos.
- Si el plan no llega o se queda sin combustible, el ordenador lo avisa antes de ejecutarlo.

## 2. Viaje automático: vida a bordo

Mientras la nave viaja, con el tiempo acelerado, el jugador controla al personaje dentro de la nave. Hace las actividades de Cold Sanctuary para mantener su salud: yoga, entrenamiento y cocina. La salud del piloto afecta después al duelo; por ejemplo, la fatiga reduce el tiempo para pensar. Esta parte reutiliza la lógica portada de Cold Sanctuary.

## 3. Llegada: pilotaje manual

La nave se detiene a una distancia de espera (unos 2 km) y se activa el pilotaje manual en primera persona que ya existe: física newtoniana, RCS, asistente de rotación.

## 4. Aterrizar y anclarse

El duelo solo empieza con la nave posada en el asteroide. La gravedad es tan débil que aterrizar es delicado:

- Velocidad de escape de Bennu: √(2GM/r) = √(2 · 4,89 / 245) ≈ 0,20 m/s (con la masa y el radio medio de `asteroides.md`). Llegar más rápido que eso es salir rebotado al espacio.
- Regla del juego: contacto con velocidad relativa menor que 0,10 m/s → **anclada**. Entre 0,10 m/s y 1 m/s → **rebote** (la nave sale despedida con parte de su velocidad). Más de 1 m/s → **impacto** con daño al casco.
- La velocidad relativa incluye el giro del asteroide: su superficie se mueve.

## 5. Duelo mental

Entrar en la mente del asteroide. Cada asteroide tiene una mente con dos medidores:

| Medidor | Empieza en | Sube | Baja |
| --- | --- | --- | --- |
| Persuasión | 0 | Cada ejercicio resuelto bien | — |
| Paciencia | Según el asteroide | — | Cada ejercicio fallado |

- El duelo es una serie de ejercicios de los cinco tipos (ordenar, completar, predecir, reparar, especificar). Cada ejercicio aparece como una **idea** que surge en la mente del asteroide.
- Una idea resuelta bien persuade; una fallada le quita paciencia.
- Persuasión al máximo → el asteroide **obedece** la petición del jugador y sus recursos llenan la bodega según su composición real.
- Paciencia a cero → el asteroide se vuelve **agresivo**.

### Dificultad

Ligada a la masa y a la riqueza de recursos del asteroide:

- Masa en escala logarítmica: de unos 10¹⁰ kg (Itokawa, Bennu) a 10²⁰ kg (Vesta).
- Riqueza: cuánto valen sus recursos (agua y metales pesan más).
- Más dificultad = más ejercicios, más bloques por ejercicio, distractores, menos paciencia y conceptos más avanzados del [índice de estudio](../research/indice-de-estudio.md).

## 6. Agresividad y huida

Con el asteroide agresivo, el casco sufre daño mientras la nave esté dentro de la distancia segura. El jugador despega y huye hasta esa distancia, que crece con el tamaño del asteroide. Pasado un tiempo de calma se puede volver a intentar, con la paciencia en parte recuperada.

## Estado de implementación

| Parte | Estado |
| --- | --- |
| Pilotaje manual, física, gravedad | Hecho (PR #2) |
| Aterrizaje, rebote e impacto | En esta rama |
| Duelo: ideas, persuasión, paciencia, dificultad, agresividad | En esta rama |
| Pantalla del duelo para móvil | En esta rama |
| Viaje programado entre asteroides | Hecho: mapa, retos del viaje y piloto automático ([navegacion.md](navegacion.md)) |
| Vida a bordo (actividades de Cold Sanctuary) | Pendiente |
| Controles táctiles de vuelo | Pendiente |
