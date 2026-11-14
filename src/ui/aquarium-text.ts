import type { AquariumEvent, RingAquarium } from "@modules/sanctuary/domain/aquarium";

/** What the ring aquarium's events say in the toast (Spanish UI). */
export function aquariumEventText(e: AquariumEvent): string {
  switch (e.type) {
    case "amigos":
      return "¡Las medakas ya son tus amigas! Vienen al cristal cuando te acercas";
    case "ayuda":
      return e.helper === "caracoles-limpian" ? "Los caracoles suben al cristal a limpiar las algas" : "Las medakas vigilan el agua por ti";
    case "ayuda-terminada":
      return e.helper === "caracoles-limpian" ? "Los caracoles vuelven al fondo: pídeles ayuda otra vez si hace falta" : "Las medakas dejan de vigilar el agua";
    case "aviso":
      return e.reason === "nitrato" ? "Las medakas suben al cristal: el nitrato está alto, cambia el agua" : "Las medakas suben a la superficie: hay amonio en el agua";
  }
}

/** One status line for the HUD: water, glass, school and who is helping. */
export function aquariumStatus(t: RingAquarium): string {
  const helpers = [t.helping("caracoles-limpian") ? "caracoles limpiando el cristal" : "", t.helping("medakas-avisan") ? "medakas vigilando el agua" : ""].filter(Boolean);
  return `Acuario: nitrato ${Math.round(t.nitrateMgL)} mg/L · algas ${Math.round(t.algae * 100)} % · medakas ${t.friends ? "amigas" : "aún tímidas"}${helpers.length ? ` · ${helpers.join(", ")}` : ""}`;
}
