/**
 * Where the "show me the member that broke" camera should look.
 *
 * `BridgeModel` already walks the deformed geometry every frame, so it writes
 * the marked member's world position here and the camera rig reads it back —
 * same trick as `vehicleState`, and for the same reason: no React churn.
 */

export const inspectState = {
  x: 0,
  y: 0,
  z: 0,
  /** member length, so the camera can frame it rather than guess a distance */
  length: 1,
  active: false,
}

export function resetInspectState() {
  inspectState.active = false
  inspectState.length = 1
}
