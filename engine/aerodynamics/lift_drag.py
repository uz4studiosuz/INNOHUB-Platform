"""Lift and drag force calculations using simplified aerodynamic formulas."""


def lift_force(air_density, velocity, wing_area, lift_coefficient):
    """L = 0.5 * rho * v^2 * S * Cl - Lift force in Newtons."""
    if air_density <= 0:
        raise ValueError("Air density must be positive")
    if wing_area <= 0:
        raise ValueError("Wing area must be positive")
    return 0.5 * air_density * velocity ** 2 * wing_area * lift_coefficient


def drag_force(air_density, velocity, reference_area, drag_coefficient):
    """D = 0.5 * rho * v^2 * S * Cd - Drag force in Newtons."""
    if air_density <= 0:
        raise ValueError("Air density must be positive")
    if reference_area <= 0:
        raise ValueError("Reference area must be positive")
    return 0.5 * air_density * velocity ** 2 * reference_area * drag_coefficient


def lift_to_drag_ratio(lift_force, drag_force):
    """L/D ratio - Measure of aerodynamic efficiency."""
    if drag_force <= 0:
        raise ValueError("Drag force must be positive")
    return lift_force / drag_force


def dynamic_pressure(air_density, velocity):
    """q = 0.5 * rho * v^2 - Dynamic pressure in Pascals."""
    return 0.5 * air_density * velocity ** 2


def air_density_at_altitude(sea_level_density, altitude_m, scale_height=8400):
    """
    rho = rho_0 * exp(-h / H)
    Approximate air density at altitude (barometric formula).
    """
    if altitude_m < 0:
        raise ValueError("Altitude cannot be negative")
    return sea_level_density * __import__("math").exp(-altitude_m / scale_height)
