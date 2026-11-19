import { LOBES, capOf } from "./site";

/**
 * The category chips and the scope of sanctuary 1's areas (Berón 2026-11-19: «filtros de categoría» and the
 * settings santuario / casquete / edificio). Pure, from the area's id, its floor plan and where it is.
 */
const BY_FURNISH: readonly (readonly [RegExp, string])[] = [
  [/^(gimnasio|cardio|calistenia)/, "Gimnasio"],
  [/^yoga/, "Yoga"],
  [/^(ballet|dojo)/, "Gimnasio"],
  [/^restaurante/, "Cocina"],
  [/^hospital-veterinario|^cria/, "Animales"],
  [/^hospital/, "Hospital"],
  [/^(carne-cultivada|quimica|biologia|informatica)/, "Ciencia"],
  [/^(construccion|mecanica|textil|garaje)/, "Taller"],
  [/^(huerto|campos)/, "Cultivos"],
  [/^(aula|musica|asambleas|guardia)/, "Comunidad"],
  [/^(residencia|habitaciones)/, "Residencia"],
];

export function areaCategory(a: { readonly id: string; readonly furnish?: string }): string {
  if (a.id.endsWith(":anillo")) return "Anillos";
  if (a.id.includes(":punta-")) return "Puntas";
  if (a.id.startsWith("hielo:") || a.id.startsWith("tierra:")) return "Casquetes";
  if (a.furnish) for (const [re, c] of BY_FURNISH) if (re.test(a.furnish)) return c;
  if (a.id.includes(":piso-")) return "Pisos libres";
  return "Mar y laguna";
}

/** The cap (Norte, Centro, Isla…) whose lobe is nearest a point on the ice. */
export function capAt(x: number, z: number): string {
  let best = LOBES[0]!;
  let d = Infinity;
  for (const l of LOBES) {
    const k = Math.hypot(x - l.x, z - l.z) - l.r;
    if (k < d) {
      d = k;
      best = l;
    }
  }
  return capOf(best);
}

/** The caps, for the scope setting's options. */
export const CAPS: readonly string[] = [...new Set(LOBES.filter((l) => l.r > 0).map(capOf))];
