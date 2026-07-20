"""Ohm's Law calculations: V = I * R and derived formulas."""


def calculate_voltage(current, resistance):
    """V = I * R - Voltage across a resistor."""
    return current * resistance


def calculate_current(voltage, resistance):
    """I = V / R - Current through a resistor."""
    if resistance == 0:
        raise ValueError("Resistance cannot be zero")
    return voltage / resistance


def calculate_resistance(voltage, current):
    """R = V / I - Resistance of a component."""
    if current == 0:
        raise ValueError("Current cannot be zero")
    return voltage / current


def calculate_power_voltage_current(voltage, current):
    """P = V * I - Electrical power."""
    return voltage * current


def calculate_power_current_resistance(current, resistance):
    """P = I^2 * R - Power dissipated by a resistor."""
    return current ** 2 * resistance


def calculate_power_voltage_resistance(voltage, resistance):
    """P = V^2 / R - Power from voltage and resistance."""
    if resistance == 0:
        raise ValueError("Resistance cannot be zero")
    return voltage ** 2 / resistance
