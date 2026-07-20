"""Tests for engine.mechanics modules."""

import sys
import os
import math

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from mechanics.levers import (
    mechanical_advantage,
    lever_force,
    required_effort,
    lever_class_torque_balance,
)
from mechanics.gears import (
    gear_ratio,
    rotational_speed,
    torque,
    linear_speed_from_rotation,
    rotational_speed_to_angular,
    angular_to_rotational_speed,
)
from mechanics.springs import (
    spring_force,
    spring_potential_energy,
    spring_constant_from_force,
    spring_force_magnitude,
    series_spring_constants,
    parallel_spring_constants,
)
from mechanics.friction import (
    static_friction_max,
    kinetic_friction,
    is_static,
    net_force_with_friction,
    friction_coefficient_from_angle,
)


# ---------- Lever Tests ----------

def test_mechanical_advantage():
    assert abs(mechanical_advantage(2, 1) - 2.0) < 1e-10


def test_mechanical_advantage_less_than_one():
    assert abs(mechanical_advantage(1, 2) - 0.5) < 1e-10


def test_lever_force():
    assert abs(lever_force(10, 2, 1) - 20.0) < 1e-10


def test_required_effort():
    assert abs(required_effort(100, 1, 2) - 50.0) < 1e-10


def test_torque_balance():
    assert lever_class_torque_balance(10, 2, 20, 1) is True


def test_torque_balance_unbalanced():
    assert lever_class_torque_balance(10, 2, 10, 1) is False


# ---------- Gear Tests ----------

def test_gear_ratio():
    assert abs(gear_ratio(40, 20) - 2.0) < 1e-10


def test_gear_ratio_underdrive():
    assert abs(gear_ratio(20, 40) - 0.5) < 1e-10


def test_rotational_speed():
    assert abs(rotational_speed(1000, 2) - 500.0) < 1e-10


def test_torque():
    assert abs(torque(10, 2) - 20.0) < 1e-10


def test_linear_speed_from_rotation():
    v = linear_speed_from_rotation(10, 0.3)
    assert abs(v - 3.0) < 1e-10


def test_rpm_to_angular():
    omega = rotational_speed_to_angular(60)
    expected = 60 * 2 * math.pi / 60
    assert abs(omega - expected) < 1e-10


def test_angular_to_rpm():
    rpm = angular_to_rotational_speed(2 * math.pi)
    assert abs(rpm - 60.0) < 1e-10


# ---------- Spring Tests ----------

def test_spring_force():
    f = spring_force(100, 0.05)
    assert abs(f - (-5.0)) < 1e-10


def test_spring_potential_energy():
    pe = spring_potential_energy(100, 0.05)
    assert abs(pe - 0.125) < 1e-10


def test_spring_constant_from_force():
    k = spring_constant_from_force(5, -0.05)
    assert abs(k - 100.0) < 1e-6


def test_spring_force_magnitude():
    f = spring_force_magnitude(100, -0.05)
    assert abs(f - 5.0) < 1e-10


def test_series_spring_constants():
    k = series_spring_constants(100, 100)
    assert abs(k - 50.0) < 1e-10


def test_parallel_spring_constants():
    k = parallel_spring_constants(100, 100, 100)
    assert abs(k - 300.0) < 1e-10


# ---------- Friction Tests ----------

def test_static_friction_max():
    assert abs(static_friction_max(100, 0.5) - 50.0) < 1e-10


def test_kinetic_friction():
    assert abs(kinetic_friction(100, 0.3) - 30.0) < 1e-10


def test_is_static_true():
    assert is_static(30, 50) is True


def test_is_static_false():
    assert is_static(60, 50) is False


def test_net_force_with_friction():
    assert abs(net_force_with_friction(100, 30) - 70.0) < 1e-10


def test_friction_coefficient_from_angle():
    mu = friction_coefficient_from_angle(30)
    assert abs(mu - math.tan(math.radians(30))) < 1e-10


if __name__ == "__main__":
    test_mechanical_advantage()
    test_mechanical_advantage_less_than_one()
    test_lever_force()
    test_required_effort()
    test_torque_balance()
    test_torque_balance_unbalanced()
    test_gear_ratio()
    test_gear_ratio_underdrive()
    test_rotational_speed()
    test_torque()
    test_linear_speed_from_rotation()
    test_rpm_to_angular()
    test_angular_to_rpm()
    test_spring_force()
    test_spring_potential_energy()
    test_spring_constant_from_force()
    test_spring_force_magnitude()
    test_series_spring_constants()
    test_parallel_spring_constants()
    test_static_friction_max()
    test_kinetic_friction()
    test_is_static_true()
    test_is_static_false()
    test_net_force_with_friction()
    test_friction_coefficient_from_angle()
    print("All mechanics tests passed!")
