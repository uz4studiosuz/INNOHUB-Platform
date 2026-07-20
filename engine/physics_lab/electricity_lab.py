"""Physics Lab: Electricity experiments using core electronics engine.

Sources: Halliday Resnick - Fundamentals of Physics.
"""


def ohm_law_experiment(voltage_V=None, current_A=None, resistance_ohm=None):
    """Calculate the missing value in V=IR."""
    if voltage_V is None and current_A is not None and resistance_ohm is not None:
        return {"voltage_V": current_A * resistance_ohm, "formula": "V = I * R"}
    elif current_A is None and voltage_V is not None and resistance_ohm is not None:
        if resistance_ohm == 0:
            raise ValueError("Resistance cannot be zero")
        return {"current_A": voltage_V / resistance_ohm, "formula": "I = V / R"}
    elif resistance_ohm is None and voltage_V is not None and current_A is not None:
        if current_A == 0:
            raise ValueError("Current cannot be zero")
        return {"resistance_ohm": voltage_V / current_A, "formula": "R = V / I"}
    raise ValueError("Exactly two of three parameters must be provided")


def series_circuit(voltages=None, resistances=None):
    """Series circuit analysis.
    Returns total resistance, current through each, voltage drop across each.
    """
    if resistances is None:
        resistances = []
    if voltages is None:
        voltages = []
    r_total = sum(resistances)
    v_total = sum(voltages) if voltages else 0
    i_total = v_total / r_total if r_total > 0 else 0

    drops = [i_total * r for r in resistances] if voltages else []
    return {
        "total_resistance": r_total,
        "total_voltage": v_total,
        "current": i_total,
        "voltage_drops": drops,
        "power_total": v_total * i_total if voltages else 0,
    }


def parallel_circuit(voltage_V, resistances):
    """Parallel circuit analysis.
    Returns total resistance, current through each branch.
    """
    if not resistances or any(r <= 0 for r in resistances):
        raise ValueError("All resistances must be positive")
    r_total = 1.0 / sum(1.0 / r for r in resistances)
    i_total = voltage_V / r_total
    branch_currents = [voltage_V / r for r in resistances]
    return {
        "total_resistance": r_total,
        "total_current": i_total,
        "branch_currents": branch_currents,
        "power_total": voltage_V * i_total,
    }


def electromagnetic_induction(N_turns, delta_flux_Wb, delta_time_s):
    """EMF = -N * dPhi/dt - Faraday's law of induction.
    Source: Halliday Resnick, Faraday's law.
    """
    if delta_time_s <= 0:
        raise ValueError("Time interval must be positive")
    return -N_turns * delta_flux_Wb / delta_time_s


def lorentz_force(charge_C, electric_field_Vm=None, velocity_ms=None,
                  magnetic_field_T=None, angle_deg=90):
    """F = q*(E + v x B) - Lorentz force (simplified).
    Source: Halliday Resnick.
    """
    if electric_field_Vm is not None:
        f_e = charge_C * electric_field_Vm
    else:
        f_e = 0

    if velocity_ms is not None and magnetic_field_T is not None:
        import math
        f_m = charge_C * velocity_ms * magnetic_field_T * math.sin(math.radians(angle_deg))
    else:
        f_m = 0

    return f_e + f_m


def rc_time_constant(R_ohm, C_farad):
    """tau = R * C - RC time constant (seconds)."""
    return R_ohm * C_farad


def capacitor_charge(voltage_V, R_ohm, C_farad, time_s):
    """Q(t) = C*V*(1 - exp(-t/RC)) - Capacitor charging.
    V_c(t) = V*(1 - exp(-t/RC))
    Source: Halliday Resnick.
    """
    import math
    tau = rc_time_constant(R_ohm, C_farad)
    if tau == 0:
        return 0.0
    return voltage_V * (1 - math.exp(-time_s / tau))
