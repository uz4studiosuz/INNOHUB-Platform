"""Tests for engine.biomechanics.prosthetic_model."""

import sys
import os
import math

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from biomechanics.prosthetic_model import (
    get_material, list_materials, joint_torque, actuator_required_torque,
    mechanical_advantage, stress_in_material, strain, youngs_modulus_from_name,
    material_safety_factor, prosthetic_hand_grip_force, battery_life,
)


def test_get_material():
    mat = get_material("aluminum_6061")
    assert mat is not None
    assert mat[0] == 68.9
    assert mat[1] == 2700
    assert mat[2] == 276


def test_get_material_unknown():
    mat = get_material("unknown")
    assert mat is None


def test_list_materials():
    mats = list_materials()
    assert len(mats) > 0
    assert "aluminum_6061" in mats


def test_joint_torque():
    tau = joint_torque(2.0, 0.3, 0)
    expected = 2.0 * 9.81 * 0.3
    assert abs(tau - expected) < 1e-6


def test_joint_torque_angled():
    tau = joint_torque(2.0, 0.3, 45)
    expected = 2.0 * 9.81 * 0.3 * math.cos(math.radians(45))
    assert abs(tau - expected) < 1e-6


def test_actuator_required_torque():
    tau = actuator_required_torque(100, 0.05)
    assert abs(tau - 5.0) < 1e-6


def test_mechanical_advantage():
    ma = mechanical_advantage(0.1, 0.05)
    assert abs(ma - 2.0) < 1e-6


def test_mechanical_advantage_zero_output():
    import pytest
    with pytest.raises(ValueError):
        mechanical_advantage(0.1, 0)


def test_stress_in_material():
    s = stress_in_material(1000, 1e-4)
    assert abs(s - 1e7) < 1


def test_stress_in_material_zero_area():
    import pytest
    with pytest.raises(ValueError):
        stress_in_material(1000, 0)


def test_strain():
    e = strain(0.001, 1.0)
    assert abs(e - 0.001) < 1e-10


def test_strain_zero_length():
    import pytest
    with pytest.raises(ValueError):
        strain(0.001, 0)


def test_youngs_modulus_from_name():
    E = youngs_modulus_from_name("aluminum_6061")
    assert abs(E - 68.9e9) < 1e6


def test_youngs_modulus_from_name_unknown():
    import pytest
    with pytest.raises(ValueError):
        youngs_modulus_from_name("unknown")


def test_material_safety_factor():
    sf = material_safety_factor("aluminum_6061", 100e6)
    expected = 276e6 / 100e6
    assert abs(sf - expected) < 0.01


def test_material_safety_factor_infinite():
    sf = material_safety_factor("aluminum_6061", 0)
    assert sf == float("inf")


def test_material_safety_factor_unknown():
    import pytest
    with pytest.raises(ValueError):
        material_safety_factor("unknown", 100e6)


def test_prosthetic_hand_grip_force():
    F = prosthetic_hand_grip_force(100, 0.5)
    assert abs(F - 50.0) < 1e-6


def test_battery_life():
    t = battery_life(2.0, 0.5)
    assert abs(t - 4.0) < 1e-6


def test_battery_life_zero_current():
    import pytest
    with pytest.raises(ValueError):
        battery_life(2.0, 0)


if __name__ == "__main__":
    test_get_material()
    test_get_material_unknown()
    test_list_materials()
    test_joint_torque()
    test_joint_torque_angled()
    test_actuator_required_torque()
    test_mechanical_advantage()
    test_mechanical_advantage_zero_output()
    test_stress_in_material()
    test_stress_in_material_zero_area()
    test_strain()
    test_strain_zero_length()
    test_youngs_modulus_from_name()
    test_youngs_modulus_from_name_unknown()
    test_material_safety_factor()
    test_material_safety_factor_infinite()
    test_material_safety_factor_unknown()
    test_prosthetic_hand_grip_force()
    test_battery_life()
    test_battery_life_zero_current()
    print("All prosthetics tests passed!")
