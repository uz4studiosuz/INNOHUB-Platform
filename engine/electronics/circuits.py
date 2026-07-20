"""Series and parallel circuit calculations."""


def series_resistance(*resistances):
    """R_total = R1 + R2 + ... + Rn - Total resistance in series."""
    if any(r < 0 for r in resistances):
        raise ValueError("Resistance cannot be negative")
    return sum(resistances)


def parallel_resistance(*resistances):
    """1/R_total = 1/R1 + 1/R2 + ... + 1/Rn - Total resistance in parallel."""
    if any(r <= 0 for r in resistances):
        raise ValueError("All resistances must be positive for parallel calculation")
    return 1.0 / sum(1.0 / r for r in resistances)


def voltage_divider(v_in, r1, r2):
    """V_out = Vin * R2 / (R1 + R2) - Voltage divider output."""
    if r1 + r2 == 0:
        raise ValueError("Total resistance cannot be zero")
    return v_in * r2 / (r1 + r2)


def current_divider(total_current, r_target, *parallel_resistances):
    """
    I_target = Itotal * (R_equivalent_parallel / R_target)
    Current through one branch in a parallel circuit.
    """
    if total_current <= 0:
        raise ValueError("Total current must be positive")
    if r_target <= 0:
        raise ValueError("Target resistance must be positive")
    parallel_r = parallel_resistance(r_target, *parallel_resistances)
    r_eq = 1.0 / sum(1.0 / r for r in (r_target,) + parallel_resistances)
    return total_current * r_eq / r_target


def total_circuit_power(voltage, total_resistance):
    """P = V^2 / R_total - Total power consumption of a circuit."""
    if total_resistance <= 0:
        raise ValueError("Total resistance must be positive")
    return voltage ** 2 / total_resistance
