/**
 * Shared vehicle cursor.
 *
 * `BridgeModel` computes the vehicle's chainage and the deflected deck height
 * under it while it is already walking the load steps; `Vehicle` and the drive
 * camera read it back. Keeping it in a plain object means none of that crosses
 * React's render path.
 */

export const vehicleState = {
  /** chainage of the vehicle nose along the span, m (NaN when parked) */
  x: Number.NaN,
  /** deflected deck surface height under the vehicle, m */
  deckY: 0,
  /** true once the deck has gone out from under it */
  falling: false,
  active: false,
}

export function resetVehicleState() {
  vehicleState.x = Number.NaN
  vehicleState.deckY = 0
  vehicleState.falling = false
  vehicleState.active = false
}
