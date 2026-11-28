/**
 * Cold Sanctuary's launch height rule (LaunchHeightRule; Berón there, 2026-11-04): the launch crown on top of the
 * launch tree stands at least `margin` above both the tallest thing of the sanctuary and the birds' flight band
 * (152 m: ~72 % of bird strikes are below it, FAA/USDA). In Codeship it is part of the aerial sanctuary's magic
 * (reglas.md §1.2): no real pad stands in the air, so the crown and the rule are labelled fiction.
 */
export interface ElevatedThing {
  readonly label: string;
  /** Its highest point, m above the sea. */
  readonly topM: number;
}

export interface HeightRule {
  readonly birdBandM: number;
  readonly marginM: number;
}

export interface PadHeight {
  readonly requiredM: number;
  readonly why: string;
}

/** The least height of the crown's face, and why. `birdsM` is how high the sanctuary's own birds fly (min + 3 × max). */
export function requiredPadHeight(things: readonly ElevatedThing[], rule: HeightRule, birdsM = 0): PadHeight {
  let top = 0;
  let what = "nada";
  for (const t of things)
    if (t.topM > top) {
      top = t.topM;
      what = t.label;
    }
  const birds = Math.max(birdsM, rule.birdBandM);
  const req = Math.max(top, birds) + rule.marginM;
  const birdText = birdsM > rule.birdBandM ? `las aves del santuario (${Math.round(birdsM)} m)` : `la franja de vuelo de la mayoría de las aves (${rule.birdBandM} m)`;
  return { requiredM: req, why: `máx(${what} ${Math.round(top)} m, ${birdText}) + ${rule.marginM} m = ${Math.round(req)} m` };
}

/** Cold Sanctuary's validator: the crown stays if it meets the rule, else it rises to it (and its pillars lengthen). */
export function validatePad(padM: number, need: PadHeight): { padM: number; raised: boolean } {
  return padM >= need.requiredM - 0.01 ? { padM, raised: false } : { padM: need.requiredM, raised: true };
}

/** The first floor of a two-level launch tree whose crown meets the rule (SampleSceneBuilder.Launch.cs). */
export function launchFirstFloorY(need: PadHeight, o: { minFirstY: number; padRiseM: number; aboveFirstM: number }): number {
  return Math.max(o.minFirstY, Math.ceil(need.requiredM - o.padRiseM - o.aboveFirstM));
}
