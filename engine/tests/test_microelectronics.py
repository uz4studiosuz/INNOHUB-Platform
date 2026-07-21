"""Tests for engine.electronics.microcontroller."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from electronics.microcontroller import (
    power_consumption_W, cycle_time_s, loop_time_s, gpio_budget, battery_life_hours,
)


def test_power_consumption_W():
    p = power_consumption_W(5.0, [0.02, 0.01, 0.05])
    assert abs(p - 5.0 * 0.08) < 1e-9


def test_power_consumption_W_negative_voltage():
    import pytest
    with pytest.raises(ValueError):
        power_consumption_W(-5.0, [0.02])


def test_power_consumption_W_negative_current():
    import pytest
    with pytest.raises(ValueError):
        power_consumption_W(5.0, [-0.02])


def test_cycle_time_s():
    t = cycle_time_s(16_000_000)
    assert abs(t - 1 / 16_000_000) < 1e-15


def test_cycle_time_s_zero_clock():
    import pytest
    with pytest.raises(ValueError):
        cycle_time_s(0)


def test_loop_time_s():
    t = loop_time_s(1_000_000, 1000)
    assert abs(t - 0.001) < 1e-9


def test_loop_time_s_negative_instructions():
    import pytest
    with pytest.raises(ValueError):
        loop_time_s(1_000_000, -1)


def test_gpio_budget_ok():
    assert gpio_budget(23, 10) == 13


def test_gpio_budget_over():
    assert gpio_budget(10, 15) == -5


def test_gpio_budget_negative_input():
    import pytest
    with pytest.raises(ValueError):
        gpio_budget(-1, 5)


def test_battery_life_hours():
    t = battery_life_hours(2000, 0.1)
    assert abs(t - 20.0) < 1e-9


def test_battery_life_hours_zero_current():
    import pytest
    with pytest.raises(ValueError):
        battery_life_hours(2000, 0)


if __name__ == "__main__":
    test_power_consumption_W()
    test_power_consumption_W_negative_voltage()
    test_power_consumption_W_negative_current()
    test_cycle_time_s()
    test_cycle_time_s_zero_clock()
    test_loop_time_s()
    test_loop_time_s_negative_instructions()
    test_gpio_budget_ok()
    test_gpio_budget_over()
    test_gpio_budget_negative_input()
    test_battery_life_hours()
    test_battery_life_hours_zero_current()
    print("All microelectronics tests passed!")
