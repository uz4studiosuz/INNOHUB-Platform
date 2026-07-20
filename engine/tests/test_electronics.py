"""Tests for engine.electronics modules."""

import sys
import os
import math

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from electronics.ohms_law import (
    calculate_voltage,
    calculate_current,
    calculate_resistance,
    calculate_power_voltage_current,
    calculate_power_current_resistance,
    calculate_power_voltage_resistance,
)
from electronics.reactive_components import (
    capacitive_reactance,
    inductive_reactance,
    resonance_frequency,
    time_constant_rc,
    time_constant_rl,
)
from electronics.semiconductors import (
    diode_forward_voltage_drop,
    transistor_beta_gain,
    led_resistor_value,
    transistor_collector_current,
    zener_regulator_resistor,
)
from electronics.circuits import (
    series_resistance,
    parallel_resistance,
    voltage_divider,
    total_circuit_power,
)


# ---------- Ohm's Law Tests ----------

def test_calculate_voltage():
    assert abs(calculate_voltage(2, 10) - 20.0) < 1e-10


def test_calculate_current():
    assert abs(calculate_current(12, 4) - 3.0) < 1e-10


def test_calculate_current_zero_resistance():
    try:
        calculate_current(5, 0)
        assert False, "Expected ValueError"
    except ValueError:
        pass


def test_calculate_resistance():
    assert abs(calculate_resistance(12, 3) - 4.0) < 1e-10


def test_power_voltage_current():
    assert abs(calculate_power_voltage_current(12, 2) - 24.0) < 1e-10


def test_power_current_resistance():
    assert abs(calculate_power_current_resistance(3, 5) - 45.0) < 1e-10


def test_power_voltage_resistance():
    assert abs(calculate_power_voltage_resistance(12, 6) - 24.0) < 1e-10


# ---------- Reactive Components Tests ----------

def test_capacitive_reactance():
    xc = capacitive_reactance(50, 1e-6)
    expected = 1.0 / (2 * math.pi * 50 * 1e-6)
    assert abs(xc - expected) < 1e-6


def test_inductive_reactance():
    xl = inductive_reactance(50, 0.1)
    expected = 2 * math.pi * 50 * 0.1
    assert abs(xl - expected) < 1e-6


def test_resonance_frequency():
    f = resonance_frequency(0.1, 1e-6)
    expected = 1.0 / (2 * math.pi * math.sqrt(0.1 * 1e-6))
    assert abs(f - expected) < 1e-6


def test_time_constant_rc():
    assert abs(time_constant_rc(1000, 1e-6) - 0.001) < 1e-10


def test_time_constant_rl():
    assert abs(time_constant_rl(0.01, 10) - 0.001) < 1e-10


# ---------- Semiconductors Tests ----------

def test_diode_forward_voltage_drop():
    vd = diode_forward_voltage_drop(1e-3, 1e-12)
    expected = 0.026 * math.log(1e-3 / 1e-12)
    assert abs(vd - expected) < 1e-6


def test_transistor_beta_gain():
    assert abs(transistor_beta_gain(0.1, 0.001) - 100.0) < 1e-6


def test_led_resistor_value():
    r = led_resistor_value(5, 2.2, 0.02)
    assert abs(r - 140.0) < 1e-6


def test_transistor_collector_current():
    assert abs(transistor_collector_current(0.001, 200) - 0.2) < 1e-10


def test_zener_regulator_resistor():
    r = zener_regulator_resistor(12, 5.1, 0.01, 0.005)
    assert abs(r - 460.0) < 1e-6


# ---------- Circuits Tests ----------

def test_series_resistance():
    assert abs(series_resistance(100, 200, 300) - 600.0) < 1e-10


def test_parallel_resistance():
    rp = parallel_resistance(100, 100)
    assert abs(rp - 50.0) < 1e-10


def test_parallel_resistance_three():
    rp = parallel_resistance(100, 200, 300)
    expected = 1.0 / (1/100 + 1/200 + 1/300)
    assert abs(rp - expected) < 1e-6


def test_voltage_divider():
    vout = voltage_divider(12, 1000, 2000)
    assert abs(vout - 8.0) < 1e-10


def test_total_circuit_power():
    p = total_circuit_power(12, 24)
    assert abs(p - 6.0) < 1e-10


if __name__ == "__main__":
    test_calculate_voltage()
    test_calculate_current()
    test_calculate_current_zero_resistance()
    test_calculate_resistance()
    test_power_voltage_current()
    test_power_current_resistance()
    test_power_voltage_resistance()
    test_capacitive_reactance()
    test_inductive_reactance()
    test_resonance_frequency()
    test_time_constant_rc()
    test_time_constant_rl()
    test_diode_forward_voltage_drop()
    test_transistor_beta_gain()
    test_led_resistor_value()
    test_transistor_collector_current()
    test_zener_regulator_resistor()
    test_series_resistance()
    test_parallel_resistance()
    test_parallel_resistance_three()
    test_voltage_divider()
    test_total_circuit_power()
    print("All electronics tests passed!")
