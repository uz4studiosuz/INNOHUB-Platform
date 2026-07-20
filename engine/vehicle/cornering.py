"""Cornering dynamics: centripetal force, maximum safe speed."""


def centripetal_force(mass, velocity, radius):
    """
    F_c = m * v^2 / r - Centripetal force required to maintain circular motion.
    """
    if mass <= 0:
        raise ValueError("Mass must be positive")
    if radius <= 0:
        raise ValueError("Radius must be positive")
    return mass * velocity ** 2 / radius


def centripetal_acceleration(velocity, radius):
    """a_c = v^2 / r - Centripetal acceleration."""
    if radius <= 0:
        raise ValueError("Radius must be positive")
    return velocity ** 2 / radius


def max_cornering_speed(radius, friction_coefficient, gravitational_acceleration=9.81):
    """
    v_max = sqrt(mu * g * r)
    Maximum speed through a turn without sliding.
    """
    if radius <= 0:
        raise ValueError("Radius must be positive")
    if friction_coefficient < 0:
        raise ValueError("Friction coefficient cannot be negative")
    return (friction_coefficient * gravitational_acceleration * radius) ** 0.5


def max_cornering_speed_banked(radius, friction_coefficient, bank_angle_deg,
                                gravitational_acceleration=9.81):
    """
    v_max = sqrt(g * r * (mu + tan(theta)) / (1 - mu * tan(theta)))
    Maximum speed through a banked turn.
    """
    import math
    if radius <= 0:
        raise ValueError("Radius must be positive")
    theta = math.radians(bank_angle_deg)
    numerator = gravitational_acceleration * radius * (friction_coefficient + math.tan(theta))
    denominator = 1 - friction_coefficient * math.tan(theta)
    if denominator <= 0:
        return float("inf")
    return math.sqrt(numerator / denominator)
