"""Spring mechanics: Hooke's law and spring energy calculations."""


def spring_force(spring_constant, displacement):
    """F = -k * x - Hooke's law (returns magnitude, sign indicates direction)."""
    return -spring_constant * displacement


def spring_potential_energy(spring_constant, displacement):
    """PE_spring = 0.5 * k * x^2 - Potential energy stored in spring."""
    return 0.5 * spring_constant * displacement ** 2


def spring_constant_from_force(force, displacement):
    """k = -F / x - Calculate spring constant from force and displacement."""
    if displacement == 0:
        raise ValueError("Displacement cannot be zero")
    return -force / displacement


def spring_force_magnitude(spring_constant, displacement):
    """|F| = k * |x| - Magnitude of spring force (always positive)."""
    return spring_constant * abs(displacement)


def series_spring_constants(*spring_constants):
    """1/k_total = 1/k1 + 1/k2 + ... + 1/kn - Springs in series."""
    if any(k <= 0 for k in spring_constants):
        raise ValueError("All spring constants must be positive")
    return 1.0 / sum(1.0 / k for k in spring_constants)


def parallel_spring_constants(*spring_constants):
    """k_total = k1 + k2 + ... + kn - Springs in parallel."""
    if any(k < 0 for k in spring_constants):
        raise ValueError("Spring constants cannot be negative")
    return sum(spring_constants)
