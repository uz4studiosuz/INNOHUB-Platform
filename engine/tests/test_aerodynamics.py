"""Tests for engine.aerodynamics modules."""

import sys
import os
import math

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from aerodynamics.lift_drag import (
    lift_force,
    drag_force,
    lift_to_drag_ratio,
    dynamic_pressure,
    air_density_at_altitude,
)
from aerodynamics.airfoil import (
    get_airfoil,
    list_airfoils,
    estimate_cl,
    estimate_cd,
    AIRFOIL_DATA,
)
from aerodynamics.stability import (
    stability_margin,
    is_stable,
    neutral_point,
    required_tail_area,
)


# ---------- Lift/Drag Tests ----------

def test_lift_force():
    L = lift_force(air_density=1.225, velocity=10, wing_area=1.5, lift_coefficient=0.5)
    expected = 0.5 * 1.225 * 100 * 1.5 * 0.5
    assert abs(L - expected) < 1e-6


def test_lift_force_zero_velocity():
    L = lift_force(1.225, 0, 1.5, 0.5)
    assert abs(L - 0.0) < 1e-10


def test_drag_force():
    D = drag_force(air_density=1.225, velocity=10, reference_area=1.5, drag_coefficient=0.05)
    expected = 0.5 * 1.225 * 100 * 1.5 * 0.05
    assert abs(D - expected) < 1e-6


def test_lift_to_drag_ratio():
    assert abs(lift_to_drag_ratio(100, 10) - 10.0) < 1e-10


def test_dynamic_pressure():
    q = dynamic_pressure(1.225, 10)
    assert abs(q - 61.25) < 1e-10


def test_air_density_at_altitude():
    rho = air_density_at_altitude(1.225, 1000)
    expected = 1.225 * math.exp(-1000 / 8400)
    assert abs(rho - expected) < 1e-10


# ---------- Airfoil Tests ----------

def test_get_airfoil():
    data = get_airfoil("naca0012")
    assert data is not None
    assert data["cl_max"] == 1.2


def test_get_airfoil_not_found():
    data = get_airfoil("unknown")
    assert data is None


def test_list_airfoils():
    foils = list_airfoils()
    assert len(foils) == 4
    assert "naca0012" in foils


def test_estimate_cl_before_stall():
    cl = estimate_cl("naca0012", 5)
    expected = 0.11 * 5
    assert abs(cl - expected) < 1e-6


def test_estimate_cl_at_stall():
    cl = estimate_cl("naca0012", 20)
    assert abs(cl - 1.2) < 1e-6  # cl_max


def test_estimate_cd():
    cd = estimate_cd("naca0012", 0.5)
    expected = 0.006 + 0.04 * 0.5 ** 2
    assert abs(cd - expected) < 1e-6


# ---------- Stability Tests ----------

def test_stability_margin_positive():
    sm = stability_margin(0.25, 0.35, 0.2)
    assert abs(sm - 0.5) < 1e-10


def test_stability_margin_negative():
    sm = stability_margin(0.35, 0.25, 0.2)
    assert abs(sm - (-0.5)) < 1e-10


def test_is_stable_true():
    assert is_stable(0.1, min_margin=0.05) is True


def test_is_stable_false():
    assert is_stable(0.02, min_margin=0.05) is False


def test_neutral_point():
    np_val = neutral_point(
        wing_lift_slope=0.1, wing_area=1.5,
        tail_lift_slope=0.08, tail_area=0.3,
        tail_arm=0.8, wing_mac=0.2,
    )
    assert np_val > 0


def test_required_tail_area():
    area = required_tail_area(
        cg_pos=0.25, neutral_point_target=0.4,
        wing_area=1.5, tail_arm=0.8, wing_mac=0.2,
    )
    expected = 0.15 * 1.5 * 0.2 / 0.8
    assert abs(area - expected) < 1e-6


if __name__ == "__main__":
    test_lift_force()
    test_lift_force_zero_velocity()
    test_drag_force()
    test_lift_to_drag_ratio()
    test_dynamic_pressure()
    test_air_density_at_altitude()
    test_get_airfoil()
    test_get_airfoil_not_found()
    test_list_airfoils()
    test_estimate_cl_before_stall()
    test_estimate_cl_at_stall()
    test_estimate_cd()
    test_stability_margin_positive()
    test_stability_margin_negative()
    test_is_stable_true()
    test_is_stable_false()
    test_neutral_point()
    test_required_tail_area()
    print("All aerodynamics tests passed!")
