/**
 * The furnishing of each floor that is already ported, in the floor's own frame: metres from its centre, x across,
 * z away from the trunk (whose face is at z = −size/2); `rot` turns the model about y (radians, as Unity's yaw). Each list
 * copies its Cold Sanctuary builder position by position, so a change there is a change of numbers here.
 */
export interface Placed {
  readonly model: string;
  readonly x: number;
  readonly z: number;
  readonly rot?: number;
  readonly name?: string;
}

export interface FloorPlan {
  readonly id: string;
  /** The floor's true plan (the area inside the tower's square floor). */
  readonly size: { readonly x: number; readonly z: number };
  readonly items: readonly Placed[];
  /**
   * Cold Sanctuary's RING (Levels.cs RingDeck): a U-deck 8 m over the floor (TreeSpec.RingOverFloor), 10 m wide with
   * 2 m over the floor's edge and the rest flying out, open towards the trunk with a 3 m balcony against it, reached
   * swimming through its own door in the trunk. Its things, in the floor's frame (RingPoint gives their places).
   */
  readonly ring?: readonly Placed[];
  readonly source: string;
}

/** Cold Sanctuary's ring numbers (Levels.cs RingDeck, TreeSpec.RingOverFloor). */
export const RING = { over: 8, width: 10, inside: 0.2, balcony: 3 } as const;

/**
 * A point on the ring's centre line at `s` m from the middle of its +z side, clockwise (Levels.cs RingPointFull), and
 * the yaw of a bed laid across it. `corner` marks a corner, or the trunk side of a tree-building's U ring (no deck).
 */
export function ringPoint(floor: number, s: number, cornerClear = RING.width / 2): { x: number; z: number; yaw: number; corner: boolean } {
  const inn = RING.width * RING.inside;
  const c = floor / 2 - inn + RING.width / 2;
  const per = 8 * c;
  s = ((s % per) + per) % per;
  const corner = (along: number, len: number) => along < cornerClear || along > len - cornerClear;
  let r: { x: number; z: number; yaw: number; corner: boolean };
  if (s < c) r = { x: s, z: c, yaw: 0, corner: s > c - cornerClear };
  else if ((s -= c) < 2 * c) r = { x: c, z: c - s, yaw: Math.PI / 2, corner: corner(s, 2 * c) };
  else if ((s -= 2 * c) < 2 * c) r = { x: c - s, z: -c, yaw: 0, corner: corner(s, 2 * c) };
  else if ((s -= 2 * c) < 2 * c) r = { x: -c, z: -c + s, yaw: Math.PI / 2, corner: corner(s, 2 * c) };
  else { s -= 2 * c; r = { x: -c + s, z: c, yaw: 0, corner: s < cornerClear }; }
  if (r.z < -floor / 2 + 1.5) r.corner = true;
  return r;
}

/** Ring length (Levels.cs RingLength). */
export const ringLength = (floor: number): number => 4 * (floor - 2 * RING.width * RING.inside + RING.width);
