"""Tests for engine.vehicle.rover_model."""

import sys
import os
import math

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from vehicle.rover_model import Rover


def test_rover_init():
    r = Rover(mass_kg=10.0, wheel_radius_m=0.1, motor_torque_Nm=0.5,
              gear_ratio=10, efficiency=0.85)
    assert r.mass == 10.0
    assert r.x == 0.0
    assert r.v == 0.0


def test_rover_init_zero_mass():
    import pytest
    with pytest.raises(ValueError):
        Rover(mass_kg=0)


def test_tractive_force():
    r = Rover(motor_torque_Nm=0.5, gear_ratio=10, efficiency=0.85, wheel_radius_m=0.1)
    F = r.tractive_force()
    expected = 0.5 * 10 * 0.85 / 0.1
    assert abs(F - expected) < 1e-6


def test_rolling_resistance():
    r = Rover(mass_kg=10, rolling_resistance_coeff=0.02)
    Frr = r.rolling_resistance(0)
    expected = 0.02 * 10 * 9.81
    assert abs(Frr - expected) < 1e-6


def test_rolling_resistance_incline():
    r = Rover(mass_kg=10, rolling_resistance_coeff=0.02)
    Frr = r.rolling_resistance(10)
    expected = 0.02 * 10 * 9.81 * math.cos(math.radians(10))
    assert abs(Frr - expected) < 1e-6


def test_grade_resistance():
    r = Rover(mass_kg=10)
    Fg = r.grade_resistance(15)
    expected = 10 * 9.81 * math.sin(math.radians(15))
    assert abs(Fg - expected) < 1e-6


def test_drag_force():
    r = Rover(drag_coeff=0.3, frontal_area_m2=0.05)
    Fd = r.drag_force(5)
    expected = 0.5 * 1.225 * 25 * 0.3 * 0.05
    assert abs(Fd - expected) < 1e-6


def test_max_grade_angle():
    r = Rover(friction_coeff=0.6)
    theta = r.max_grade_angle()
    expected = math.degrees(math.atan(0.6))
    assert abs(theta - expected) < 1e-6


def test_acceleration():
    r = Rover(mass_kg=10, motor_torque_Nm=0.5, gear_ratio=10,
              efficiency=0.85, wheel_radius_m=0.1)
    a = r.acceleration(0, 0)
    assert a > 0


def test_update():
    r = Rover(mass_kg=10)
    r.update(1.0)
    assert r.v >= 0
    assert r.x >= 0


def test_update_negative_dt():
    import pytest
    with pytest.raises(ValueError):
        r = Rover(mass_kg=10)
        r.update(-0.1)


def test_simulate():
    r = Rover(mass_kg=10)
    res = r.simulate(dt=0.1, max_time=5.0)
    assert res["final_distance_m"] > 0
    assert len(res["trajectory"]) > 0
    assert res["tractive_force_N"] > 0
    assert res["max_grade_deg"] > 0


def test_power_required():
    r = Rover(mass_kg=10)
    p = r.power_required(1.0)
    assert p >= 0


def test_energy_consumption():
    r = Rover(mass_kg=10)
    e = r.energy_consumption(1.0, 10)
    assert e >= 0


def test_simulate_negative_dt():
    import pytest
    with pytest.raises(ValueError):
        r = Rover(mass_kg=10)
        r.simulate(dt=-0.1, max_time=5.0)


if __name__ == "__main__":
    test_rover_init()
    test_rover_init_zero_mass()
    test_tractive_force()
    test_rolling_resistance()
    test_rolling_resistance_incline()
    test_grade_resistance()
    test_drag_force()
    test_max_grade_angle()
    test_acceleration()
    test_update()
    test_update_negative_dt()
    test_simulate()
    test_power_required()
    test_energy_consumption()
    test_simulate_negative_dt()
    print("All rover tests passed!")
