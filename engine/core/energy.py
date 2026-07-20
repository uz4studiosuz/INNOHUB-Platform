"""
Energy calculation functions.
Source: Halliday Resnick - Fundamentals of Physics.
"""


def kinetic_energy(mass, velocity):
    """KE = 0.5 * m * v^2 - Kinetic energy."""
    if mass <= 0:
        raise ValueError("Mass must be positive")
    return 0.5 * mass * velocity ** 2


def potential_energy(mass, height, gravitational_acceleration=9.81):
    """PE = m * g * h - Gravitational potential energy (Earth default g=9.81 m/s^2)."""
    if mass <= 0:
        raise ValueError("Mass must be positive")
    return mass * gravitational_acceleration * height


def mechanical_energy(kinetic_energy, potential_energy):
    """E_mech = KE + PE - Total mechanical energy."""
    return kinetic_energy + potential_energy


def work(force, displacement, angle_deg=0):
    """W = F * d * cos(θ) - Work done by constant force."""
    import math
    angle_rad = math.radians(angle_deg)
    return force * displacement * math.cos(angle_rad)


def power(work, time):
    """P = W / t - Average power (work per unit time)."""
    if time <= 0:
        raise ValueError("Time must be positive")
    return work / time
