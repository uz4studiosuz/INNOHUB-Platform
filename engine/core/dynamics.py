"""
Dynamics functions based on Newton's laws of motion.
Source: Halliday Resnick - Fundamentals of Physics.
"""


def net_force(mass, acceleration):
    """F = m * a - Newton's second law."""
    if mass <= 0:
        raise ValueError("Mass must be positive")
    return mass * acceleration


def weight(mass, gravitational_acceleration=9.81):
    """W = m * g - Weight force due to gravity (Earth default g=9.81 m/s^2)."""
    if mass <= 0:
        raise ValueError("Mass must be positive")
    if gravitational_acceleration <= 0:
        raise ValueError("Gravitational acceleration must be positive")
    return mass * gravitational_acceleration


def friction_force(normal_force, coefficient):
    """F_friction = μ * N - Friction force (static or kinetic)."""
    if normal_force < 0:
        raise ValueError("Normal force cannot be negative")
    if coefficient < 0:
        raise ValueError("Friction coefficient cannot be negative")
    return coefficient * normal_force


def net_force_from_forces(forces):
    """F_net = Σ F_i - Sum of all forces (list of floats, sign indicates direction)."""
    return sum(forces)


def acceleration_from_net_force(net_force, mass):
    """a = F_net / m - Acceleration produced by net force."""
    if mass <= 0:
        raise ValueError("Mass must be positive")
    return net_force / mass
