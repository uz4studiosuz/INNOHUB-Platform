"""Physics Lab: Mechanics experiments using core engine.

Sources: Halliday Resnick - Fundamentals of Physics.
"""

import math


def projectile_motion(v0_ms, angle_deg, g=9.81, n_points=100):
    """Calculate projectile trajectory.
    Returns list of (t, x, y) points.
    """
    angle_rad = math.radians(angle_deg)
    vx = v0_ms * math.cos(angle_rad)
    vy = v0_ms * math.sin(angle_rad)
    time_of_flight = 2 * vy / g if g > 0 else 0
    dt = time_of_flight / n_points if n_points > 0 else 0

    points = []
    for i in range(n_points + 1):
        t = i * dt
        x = vx * t
        y = vy * t - 0.5 * g * t ** 2
        if y < 0:
            y = 0
        points.append((t, x, y))
    return {
        "trajectory": points,
        "time_of_flight": time_of_flight,
        "max_height": vy ** 2 / (2 * g) if g > 0 else 0,
        "range": vx * time_of_flight,
        "max_height_time": vy / g if g > 0 else 0,
    }


def collision_1d(m1, v1, m2, v2, elastic=True):
    """1D collision between two masses.
    elastic=True: both momentum and KE conserved.
    elastic=False: perfectly inelastic (stick together).
    Source: Halliday Resnick, conservation of momentum.
    """
    p_total = m1 * v1 + m2 * v2
    if elastic:
        v1f = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2)
        v2f = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2)
    else:
        vf = p_total / (m1 + m2)
        v1f = v2f = vf

    ke_before = 0.5 * m1 * v1 ** 2 + 0.5 * m2 * v2 ** 2
    ke_after = 0.5 * m1 * v1f ** 2 + 0.5 * m2 * v2f ** 2

    return {
        "v1f": v1f, "v2f": v2f,
        "ke_before": ke_before, "ke_after": ke_after,
        "ke_loss": ke_before - ke_after,
        "momentum_conserved": abs(p_total - (m1 * v1f + m2 * v2f)) < 1e-10,
    }


def spring_oscillator(mass_kg, k_Nm, amplitude_m, g=9.81):
    """Mass-spring oscillator analysis.
    Source: Halliday Resnick, SHM.
    """
    omega = math.sqrt(k_Nm / mass_kg) if mass_kg > 0 else 0
    period = 2 * math.pi / omega if omega > 0 else float("inf")
    frequency = 1 / period if period > 0 else 0
    max_velocity = amplitude_m * omega if omega > 0 else 0
    max_acceleration = amplitude_m * omega ** 2 if omega > 0 else 0
    max_force = k_Nm * amplitude_m
    total_energy = 0.5 * k_Nm * amplitude_m ** 2

    return {
        "omega_rad_s": omega,
        "period_s": period,
        "frequency_hz": frequency,
        "max_velocity_ms": max_velocity,
        "max_acceleration_ms2": max_acceleration,
        "max_force_N": max_force,
        "total_energy_J": total_energy,
    }


def pendulum_period(length_m, g=9.81):
    """T = 2*pi*sqrt(L/g) - Simple pendulum period (small angles).
    Source: Halliday Resnick.
    """
    if length_m <= 0 or g <= 0:
        raise ValueError("Length and gravity must be positive")
    return 2 * math.pi * math.sqrt(length_m / g)


def centripetal_force(mass_kg, velocity_ms, radius_m):
    """F_c = m * v^2 / r - Centripetal force."""
    if radius_m <= 0:
        raise ValueError("Radius must be positive")
    return mass_kg * velocity_ms ** 2 / radius_m


def kinetic_energy(mass_kg, velocity_ms):
    return 0.5 * mass_kg * velocity_ms ** 2


def potential_energy(mass_kg, height_m, g=9.81):
    return mass_kg * g * height_m
