/**
 * Each person's own look (Berón 2026-11-19: «me ha parecido que todos los humanos llevaban misma ropa y caras? En
 * Cold Sanctuary cada humano estaba customizado en forma y cara»). Ported from Cold Sanctuary's
 * Assets/Scripts/Avatar/CubeHair.cs `For(name)` and docs/diseno-personajes.md, whose looks were drawn from each
 * person's reference photo (the photos are not in its repository; their descriptions are, and are kept here). Everyone
 * else gets a varied look from their name, as Cold Sanctuary does, plus build and height so no two are alike.
 *
 * Colours are hex; Cold Sanctuary's 0–1 floats are converted with `C`.
 */
export type HairStyle = "corto" | "largo" | "mono" | "coleta" | "rizado" | "rapado" | "gorro-cocinero" | "degradado" | "largo-ondulado" | "media-melena" | "bob" | "turbante";
export type BeardStyle = "ninguna" | "completa" | "perilla" | "de-dias" | "larga";

export interface Look {
  readonly hairStyle: HairStyle;
  readonly hair: number;
  readonly skin: number;
  readonly eyes: number;
  readonly beard: BeardStyle;
  /** Height in metres. */
  readonly height: number;
  /** Build: −0,3 slim … +0,4 broad (Cold Sanctuary's BodyShape from strength and mass, here per person). */
  readonly build: number;
  /** Top (shirt, coat, scrubs, dress). */
  readonly top: number;
  readonly pants: number;
  readonly shorts?: boolean;
  /** Forearms covered (long sleeves) in this colour; undefined = bare forearms. */
  readonly sleeves?: number;
  /** No sleeves at all: upper arms bare too. */
  readonly sleeveless?: boolean;
  readonly shoes: number;
  readonly glasses?: number;
  /** A cap with its logo colour. */
  readonly cap?: readonly [number, number];
  readonly beanie?: number;
  /** Turban cloth and stripe. */
  readonly turban?: readonly [number, number];
  readonly lips?: number;
  /** A vest over the top: [vest, shirt underneath]. */
  readonly vest?: number;
  readonly stole?: number;
  readonly necklace?: number;
  readonly earring?: boolean;
  /** Fine arched brows and lashes. */
  readonly feminine?: boolean;
  /** Jaw width (0,66 narrow … 0,92 wide). */
  readonly jaw: number;
  /** Where the look comes from. */
  readonly source: string;
}

const C = (r: number, g: number, b: number): number => (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
const SKIN = { light: C(0.93, 0.8, 0.7), mid: C(0.84, 0.66, 0.52), tan: C(0.72, 0.54, 0.4), dark: C(0.5, 0.36, 0.26) } as const;
const CS = "Cold Sanctuary, Assets/Scripts/Avatar/CubeHair.cs For() y docs/diseno-personajes.md";
const PHOTO = `${CS} (descrito de su foto de referencia)`;

const base = (o: Partial<Look> & Pick<Look, "hairStyle" | "hair" | "skin" | "eyes" | "height" | "top" | "pants" | "jaw">, source = PHOTO): Look => ({ beard: "ninguna", build: 0, shoes: 0x2a2a2e, source, ...o });

/** The people Cold Sanctuary dressed from their photos and sheets. */
const NAMED: Readonly<Record<string, Look>> = {
  linduarda: base({ hairStyle: "coleta", hair: C(0.08, 0.06, 0.06), skin: C(0.86, 0.68, 0.55), eyes: C(0.25, 0.16, 0.1), feminine: true, jaw: 0.72, lips: C(0.7, 0.38, 0.4), height: 1.6, build: 0.05, top: C(0.52, 0.72, 0.9), pants: C(0.52, 0.72, 0.9), sleeves: C(0.95, 0.95, 0.93), glasses: C(0.85, 0.7, 0.4), shoes: C(0.95, 0.95, 0.95) }),
  lizmibet: base({ hairStyle: "rizado", hair: C(0.6, 0.32, 0.2), skin: C(0.93, 0.77, 0.67), eyes: C(0.3, 0.2, 0.12), feminine: true, jaw: 0.84, lips: C(0.78, 0.5, 0.52), glasses: C(0.72, 0.72, 0.75), height: 1.55, build: 0.1, top: C(0.97, 0.97, 0.95), pants: C(0.97, 0.97, 0.95), sleeves: C(0.97, 0.97, 0.95), shoes: C(0.95, 0.95, 0.95) }),
  jefeconstruccion: base({ hairStyle: "corto", hair: C(0.2, 0.19, 0.19), skin: C(0.8, 0.6, 0.47), eyes: C(0.2, 0.14, 0.1), jaw: 0.88, glasses: C(0.08, 0.08, 0.1), height: 1.68, build: 0.3, top: C(0.78, 0.8, 0.82), pants: C(0.5, 0.58, 0.54), shorts: true, shoes: C(0.08, 0.08, 0.09) }),
  sadhguru: base({ hairStyle: "turbante", hair: C(0.92, 0.92, 0.9), skin: C(0.56, 0.39, 0.28), eyes: C(0.15, 0.1, 0.08), turban: [C(0.95, 0.93, 0.87), C(0.5, 0.15, 0.25)], beard: "larga", jaw: 0.86, height: 1.72, build: 0.05, top: C(0.5, 0.72, 0.62), sleeveless: true, pants: C(0.96, 0.96, 0.94), stole: C(0.97, 0.97, 0.96), necklace: C(0.9, 0.82, 0.5), shoes: C(0.56, 0.39, 0.28) }),
  andrea: base({ hairStyle: "rizado", hair: C(0.2, 0.14, 0.1), skin: C(0.9, 0.72, 0.6), eyes: C(0.3, 0.2, 0.12), jaw: 0.82, earring: true, height: 1.78, build: 0, top: C(0.07, 0.07, 0.08), sleeves: C(0.07, 0.07, 0.08), pants: C(0.22, 0.23, 0.26), necklace: C(0.8, 0.8, 0.83), shoes: C(0.32, 0.2, 0.13) }),
  goluis: base({ hairStyle: "degradado", hair: C(0.1, 0.08, 0.07), skin: C(0.74, 0.55, 0.42), eyes: C(0.18, 0.12, 0.08), jaw: 0.92, beard: "perilla", earring: true, height: 1.75, build: 0.4, top: C(0.93, 0.9, 0.86), pants: C(0.2, 0.22, 0.28) }),
  panterilia: base({ hairStyle: "largo", hair: C(0.66, 0.46, 0.22), skin: SKIN.mid, eyes: C(0.78, 0.58, 0.18), feminine: true, jaw: 0.76, height: 1.68, build: -0.25, top: C(0.45, 0.5, 0.32), pants: C(0.3, 0.28, 0.22) }, CS),
  gohageneis: base({ hairStyle: "degradado", hair: C(0.07, 0.06, 0.06), skin: C(0.66, 0.46, 0.33), eyes: C(0.2, 0.13, 0.08), jaw: 0.84, cap: [C(0.15, 0.3, 0.75), C(0.98, 0.8, 0.15)], height: 1.76, build: 0.15, top: C(0.95, 0.95, 0.93), pants: C(0.85, 0.12, 0.12), shorts: true }),
  irosene: base({ hairStyle: "largo-ondulado", hair: C(0.86, 0.8, 0.64), skin: C(0.93, 0.76, 0.66), eyes: C(0.45, 0.58, 0.62), feminine: true, jaw: 0.9, lips: C(0.82, 0.55, 0.55), height: 1.55, build: -0.05, top: C(0.85, 0.32, 0.3), pants: C(0.3, 0.26, 0.3) }),
  kushal: base({ hairStyle: "media-melena", hair: C(0.07, 0.06, 0.07), skin: C(0.84, 0.66, 0.6), eyes: C(0.22, 0.16, 0.12), jaw: 0.74, beard: "de-dias", beanie: C(0.55, 0.1, 0.14), glasses: C(0.3, 0.3, 0.32), height: 1.75, build: 0.05, top: C(0.1, 0.1, 0.33), vest: C(0.36, 0.12, 0.45), pants: C(0.08, 0.28, 0.22), shoes: C(0.62, 0.64, 0.68) }, `${CS} (su hoja de diseño)`),
};

/** A stable hash of a name (Cold Sanctuary uses .NET's string hash; any stable one keeps each look fixed). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const STYLES: readonly HairStyle[] = ["corto", "largo", "mono", "coleta", "rizado", "degradado", "media-melena", "bob", "rapado"];
const HAIR = [C(0.15, 0.1, 0.08), C(0.4, 0.26, 0.15), C(0.85, 0.7, 0.4), C(0.6, 0.2, 0.1), C(0.55, 0.55, 0.58), C(0.07, 0.06, 0.06)];
const SKINS = [SKIN.light, SKIN.mid, SKIN.tan, SKIN.dark];
const EYES = [C(0.25, 0.18, 0.12), C(0.15, 0.1, 0.08), C(0.35, 0.5, 0.6), C(0.35, 0.45, 0.25)];
const TOPS = [0x3d6fa8, 0xb03a48, 0x2f8f6a, 0xd9a420, 0x6a4a8c, 0xe8e4da, 0x2a2a30, 0xc8643c, 0x4f8a9c, 0x8a9a3c];
const PANTS = [0x2a3446, 0x3a3a40, 0x5a4a3a, 0x24303a, 0x6a6a70, 0x1f2a24];
const SHOES = [0x2a2a2e, 0xe8e8e8, 0x6b4a2a, 0x3b6fc2];

/** The look of a person by name: Cold Sanctuary's own if it dressed them, else a varied one from the name. */
export function lookOf(name: string): Look {
  const n = name.toLowerCase().replace(/[^a-záéíóúñ]/g, "");
  for (const [k, l] of Object.entries(NAMED)) if (n.includes(k)) return l;
  const h = hash(n);
  const pick = <T>(xs: readonly T[], k: number): T => xs[Math.floor(h / k) % xs.length]!;
  const hairStyle = pick(STYLES, 1);
  const feminine = ["largo", "mono", "coleta", "bob", "largo-ondulado"].includes(hairStyle) ? h % 5 !== 0 : h % 7 === 0;
  return {
    hairStyle,
    hair: pick(HAIR, 11),
    skin: pick(SKINS, 13),
    eyes: pick(EYES, 17),
    beard: feminine ? "ninguna" : (["ninguna", "ninguna", "de-dias", "completa", "perilla"] as const)[Math.floor(h / 19) % 5]!,
    height: Math.round((feminine ? 1.58 : 1.68) * 100 + (Math.floor(h / 23) % 16)) / 100,
    build: ((Math.floor(h / 29) % 9) - 3) / 10,
    top: pick(TOPS, 31),
    pants: pick(PANTS, 37),
    ...(h % 3 === 0 ? { sleeves: pick(TOPS, 41) } : {}),
    shoes: pick(SHOES, 43),
    ...(h % 6 === 1 ? { glasses: 0x2a2a30 } : {}),
    feminine,
    jaw: 0.7 + (Math.floor(h / 47) % 20) / 100,
    source: `${CS}: aspecto variado por su nombre (sin ficha ni foto)`,
  };
}
