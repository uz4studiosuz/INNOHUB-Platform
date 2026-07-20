"""Lever mechanics: mechanical advantage and force calculations."""


def mechanical_advantage(effort_arm, load_arm):
    """MA = effort_arm / load_arm - Mechanical advantage of a lever."""
    if load_arm <= 0:
        raise ValueError("Load arm must be positive")
    return effort_arm / load_arm


def lever_force(effort_force, effort_arm, load_arm):
    """F_load = F_effort * effort_arm / load_arm - Force at load end."""
    if load_arm <= 0:
        raise ValueError("Load arm must be positive")
    return effort_force * effort_arm / load_arm


def required_effort(load_force, load_arm, effort_arm):
    """F_effort = F_load * load_arm / effort_arm - Force needed at effort end."""
    if effort_arm <= 0:
        raise ValueError("Effort arm must be positive")
    return load_force * load_arm / effort_arm


def lever_class_torque_balance(force1, distance1, force2, distance2):
    """
    Check torque balance: F1 * d1 = F2 * d2
    Returns True if balanced (within tolerance).
    """
    tolerance = 1e-10
    return abs(force1 * distance1 - force2 * distance2) < tolerance
