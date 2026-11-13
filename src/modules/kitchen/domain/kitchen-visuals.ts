import { classifyStep, normalizeStep, type StepAction, type StepVisual } from "@modules/chores/domain/step-visual";

/**
 * Where a kitchen step happens: spots of the galley (nevera, despensa, encimera, fogón, horno) and of the
 * mill corner (molino, procesador de soja). The view knows where each one is.
 */
export type KitchenPlace = "nevera" | "despensa" | "encimera" | "fogon" | "horno" | "molino" | "procesador";

/** Food colour keys the props are tinted with. */
export type FoodTint = "huevo" | "papa" | "verdura" | "fresa" | "higo" | "cacahuete" | "tofu" | "carne" | "masa" | "avena" | "chile" | "soja" | "grano" | "lenteja" | "fruta" | "generico";

/** Words in a step or an item id → its food tint (first match wins). */
const FOODS: readonly (readonly [FoodTint, RegExp])[] = [
  ["huevo", /huevo/],
  ["papa", /\bpapa/],
  ["fresa", /fresa/],
  ["higo", /higo/],
  ["fruta", /\bfruta/],
  ["cacahuete", /cacahuete|\bmani\b|crema de cacahuete/],
  ["tofu", /tofu/],
  ["carne", /carne/],
  ["masa", /harina|masa\b|chapati|disco|bolita/],
  ["avena", /avena|gachas/],
  ["chile", /chile/],
  ["soja", /soja|cuajada|nigari|leche de soja|pasta/],
  ["lenteja", /lenteja|sopa/],
  ["grano", /trigo|grano|pienso|frijol|maiz|amaranto|calcio/],
  ["verdura", /lechuga|tomate|rabano|vegetal|zanahoria|cebolla/],
];

const foodOf = (text: string): FoodTint | undefined => FOODS.find(([, r]) => r.test(text))?.[0];

/** Fresh food lives in the fridge; dry stores in the cupboard. */
const FRESH: ReadonlySet<FoodTint> = new Set(["huevo", "carne", "verdura", "fresa", "higo", "fruta", "tofu", "chile", "papa"]);

/** Exact steps whose leading verb tells less than the step means. */
const OVERRIDES: Readonly<Record<string, StepAction>> = {
  // Eggs already out of the open fridge: «take the eggs» is cracking them into the bowl.
  "toma los huevos": "cascar",
};

export interface KitchenContext {
  /** Larder item ids the dish uses (the first one tints steps that name no food). */
  readonly ingredients?: readonly string[];
  /** The machine of a process (molino, procesador-soja); none for a recipe at the galley. */
  readonly machine?: string;
}

/**
 * Visuals of a recipe's or a process's steps, one per step, in order. It walks the steps keeping what is
 * hot (a pan or a pot), so «revuelve los huevos» after «calienta la plancha» happens in the pan.
 * Every step of the data resolves to an action (tests); an unknown verb falls back to a gesture at the counter.
 */
export function kitchenVisuals(steps: readonly string[], ctx: KitchenContext = {}): StepVisual[] {
  const base = (ctx.ingredients ?? []).map((id) => foodOf(normalizeStep(id.replace(/-/g, " ")))).find((f) => f) ?? "generico";
  const mill = ctx.machine === "molino";
  const soy = ctx.machine === "procesador-soja";
  let hot: "sarten" | "olla" | "bandeja" | undefined;
  let food: FoodTint = base;
  const at = (x: StepVisual): StepVisual => (soy && x.place === "fogon" ? { ...x, place: "procesador" } : x);
  return steps.map((raw) => at(visual(raw)));
  function visual(raw: string): StepVisual {
    const s = normalizeStep(raw);
    const action: StepAction = OVERRIDES[s] ?? classifyStep(raw) ?? "gesto";
    food = foodOf(s) ?? food;
    const v = (place: KitchenPlace, vessel?: string, heat?: boolean): StepVisual => ({ action, place, tint: food, ...(vessel ? { vessel } : {}), ...(heat ? { heat } : {}) });
    const panWord = /sarten|plancha/.test(s);
    switch (action) {
      case "tomar":
        if (/nevera|camara fria/.test(s)) return v("nevera");
        if (/despensa|frijol|maiz|amaranto|lenteja|avena|harina/.test(s)) return v("despensa");
        return v(FRESH.has(food) ? "nevera" : "despensa");
      case "calentar":
        if (soy) return v("procesador", "olla", true);
        hot = /\bolla\b|cuece|hierve/.test(s) && !panWord ? "olla" : "sarten";
        return v("fogon", hot, true);
      case "hervir":
        hot = "olla";
        return soy ? v("procesador", "olla", true) : v("fogon", "olla", true);
      case "hornear":
        if (/amaranto/.test(s)) {
          hot = "sarten";
          return v("fogon", "sarten", true);
        }
        hot = "bandeja";
        return v("horno", "bandeja", true);
      case "moler":
        if (mill) return v("molino");
        if (soy) return v("procesador");
        if (hot === "olla") return v("fogon", "olla", true);
        return v("encimera", "bol");
      case "remover":
        if (hot === "sarten" || hot === "olla") return v("fogon", hot, true);
        if (hot === "bandeja") return v("horno", "bandeja", true);
        return v(soy ? "procesador" : "encimera", "bol");
      case "sazonar":
        if ((hot === "sarten" || hot === "olla") && !/bol/.test(s)) return v("fogon", hot, true);
        return v("encimera", "bol");
      case "verter":
        if (/bandeja/.test(s)) {
          hot = "bandeja";
          return v("encimera", "bandeja");
        }
        if ((hot === "sarten" || hot === "olla") && !/\bbol\b/.test(s)) return v("fogon", hot, true);
        return v(soy ? "procesador" : "encimera", "bol");
      case "batir":
      case "cascar":
        if (panWord) return v("fogon", "sarten", true);
        return v("encimera", "bol");
      case "reposar":
        hot = undefined;
        return v("encimera", /bandeja/.test(s) ? "bandeja" : "plato");
      case "emplatar": {
        hot = undefined;
        const vessel = /envasa|guard/.test(s) ? "tarro" : /\bbol\b|gachas/.test(s) ? "bol" : "plato";
        return v("encimera", vessel);
      }
      case "cortar":
      case "lavar":
      case "amasar":
        return v("encimera", action === "lavar" ? "bol" : "tabla");
      default:
        return v("encimera");
    }
  }
}
