"""Friction calculations: static and kinetic friction forces."""


def static_friction_max(normal_force, coefficient):
    """F_s_max = mu_s * N - Maximum static friction force before motion starts."""
    if normal_force < 0:
        raise ValueError("Normal force cannot be negative")
    if coefficient < 0:
        raise ValueError("Coefficient cannot be negative")
    return coefficient * normal_force


def kinetic_friction(normal_force, coefficient):
    """F_k = mu_k * N - Kinetic friction force during motion."""
    if normal_force < 0:
        raise ValueError("Normal force cannot be negative")
    if coefficient < 0:
        raise ValueError("Coefficient cannot be negative")
    return coefficient * normal_force


def is_static(applied_force, max_static_friction):
    """Check if object remains stationary (applied force <= max static friction)."""
    return abs(applied_force) <= max_static_friction


def net_force_with_friction(applied_force, friction_force):
    """F_net = F_applied - F_friction - Net force in direction of motion."""
    return applied_force - friction_force


def friction_coefficient_from_angle(max_angle_deg):
    """mu = tan(theta) - Coefficient from angle where object starts sliding."""
    import math
    angle_rad = math.radians(max_angle_deg)
    return math.tan(angle_rad)
