"""Reactive component calculations: capacitive and inductive reactance."""

import math


def capacitive_reactance(frequency_hz, capacitance_farads):
    """Xc = 1 / (2 * pi * f * C) - Capacitive reactance in ohms."""
    if frequency_hz <= 0:
        raise ValueError("Frequency must be positive")
    if capacitance_farads <= 0:
        raise ValueError("Capacitance must be positive")
    return 1.0 / (2 * math.pi * frequency_hz * capacitance_farads)


def inductive_reactance(frequency_hz, inductance_henrys):
    """Xl = 2 * pi * f * L - Inductive reactance in ohms."""
    if frequency_hz < 0:
        raise ValueError("Frequency cannot be negative")
    if inductance_henrys < 0:
        raise ValueError("Inductance cannot be negative")
    return 2 * math.pi * frequency_hz * inductance_henrys


def resonance_frequency(inductance_henrys, capacitance_farads):
    """f = 1 / (2 * pi * sqrt(L * C)) - LC circuit resonant frequency."""
    if inductance_henrys <= 0:
        raise ValueError("Inductance must be positive")
    if capacitance_farads <= 0:
        raise ValueError("Capacitance must be positive")
    return 1.0 / (2 * math.pi * math.sqrt(inductance_henrys * capacitance_farads))


def time_constant_rc(resistance_ohms, capacitance_farads):
    """tau = R * C - RC time constant in seconds."""
    return resistance_ohms * capacitance_farads


def time_constant_rl(inductance_henrys, resistance_ohms):
    """tau = L / R - RL time constant in seconds."""
    if resistance_ohms <= 0:
        raise ValueError("Resistance must be positive")
    return inductance_henrys / resistance_ohms
