"""Semiconductor component calculations (diode, transistor, LED)."""

import math


def diode_forward_voltage_drop(current, saturation_current, thermal_voltage=0.026):
    """Vd = Vt * ln(I / I_s) - Shockley diode equation approximation."""
    if current <= 0 or saturation_current <= 0:
        raise ValueError("Current and saturation current must be positive")
    return thermal_voltage * math.log(current / saturation_current)


def transistor_beta_gain(collector_current, base_current):
    """beta = Ic / Ib - Current gain of a BJT transistor."""
    if base_current == 0:
        raise ValueError("Base current cannot be zero")
    return collector_current / base_current


def led_resistor_value(supply_voltage, led_voltage, led_current):
    """R = (Vsupply - Vled) / Iled - Resistor value needed for an LED circuit."""
    if supply_voltage <= 0 or led_voltage <= 0 or led_current <= 0:
        raise ValueError("Supply voltage, LED voltage, and current must be positive")
    return (supply_voltage - led_voltage) / led_current


def transistor_collector_current(base_current, beta):
    """Ic = Ib * beta - Collector current from base current and gain."""
    return base_current * beta


def zener_regulator_resistor(supply_voltage, zener_voltage, load_current, zener_current):
    """R = (Vsupply - Vz) / (Iload + Iz) - Resistor for Zener voltage regulator."""
    if supply_voltage <= zener_voltage:
        raise ValueError("Supply voltage must be greater than Zener voltage")
    return (supply_voltage - zener_voltage) / (load_current + zener_current)
