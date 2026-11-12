import { IDSS_CONTACT_LIMITS } from "@modules/mothership/data/mothership";
import { DOCKING_ASSIST } from "@modules/mothership/domain/docking";
import { BERTH_STANDOFF_M } from "@modules/mothership/application/berthing";

/**
 * How a trip to a structure ends (game values; the contact speeds are the IDSS ones the docking
 * assist already uses). The trip autopilot stops `handoverM` out on the port axis and the docking
 * assist flies the rest; the mothership stops `berthStandoffM` out and closes on its own.
 */
export const DOCK_TRIP = {
  handoverM: 40,
  /** The entry point is this far beyond the structure's keep-out sphere, m… */
  entryMarginM: 30,
  /** …and at least this far out on the axis, so the autopilot brakes on a straight line, m. */
  entryMinM: 300,
  /** Within this share of the axial distance off the axis, the probe goes straight in. */
  onAxisShare: 0.25,
  berthStandoffM: BERTH_STANDOFF_M,
  contactMs: DOCKING_ASSIST.contactSpeedMs,
  closingMaxMs: IDSS_CONTACT_LIMITS.closingMaxMs,
} as const;
