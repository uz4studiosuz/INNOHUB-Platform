"""Braking distance and deceleration calculations."""


def braking_distance(initial_velocity, deceleration):
    """d = v^2 / (2 * a) - Braking distance from constant deceleration."""
    if deceleration <= 0:
        raise ValueError("Deceleration must be positive")
    return initial_velocity ** 2 / (2 * deceleration)


def deceleration_from_friction(coefficient_friction, gravitational_acceleration=9.81):
    """a = mu * g - Maximum deceleration from tire-road friction."""
    if coefficient_friction < 0:
        raise ValueError("Friction coefficient cannot be negative")
    return coefficient_friction * gravitational_acceleration


def braking_time(initial_velocity, deceleration):
    """t = v / a - Time to stop from initial velocity."""
    if deceleration <= 0:
        raise ValueError("Deceleration must be positive")
    return initial_velocity / deceleration


def total_stopping_distance(reaction_time, initial_velocity, deceleration):
    """
    d_total = v * t_reaction + v^2 / (2 * a)
    Total stopping distance including reaction time.
    """
    if reaction_time < 0:
        raise ValueError("Reaction time cannot be negative")
    reaction_distance = initial_velocity * reaction_time
    brake_distance = braking_distance(initial_velocity, deceleration)
    return reaction_distance + brake_distance
