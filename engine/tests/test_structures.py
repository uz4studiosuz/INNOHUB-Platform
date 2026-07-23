"""Tests for engine.structures modules."""

import sys
import os
import math

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from structures.truss_analysis import Truss, TrussMember
from structures.beam_analysis import (
    bending_moment, bending_stress, beam_deflection_simple_support,
    beam_deflection_cantilever, euler_buckling_load, axial_stress,
    axial_strain, youngs_modulus, safety_factor, rect_moment_of_inertia,
    circle_moment_of_inertia, pipe_moment_of_inertia,
)


def test_truss_add_node():
    truss = Truss()
    idx = truss.add_node(0, 0)
    assert idx == 0
    assert truss.nodes[0] == (0, 0)


def test_truss_add_member():
    truss = Truss()
    truss.add_node(0, 0)
    truss.add_node(1, 0)
    idx = truss.add_member(0, 1)
    assert idx == 0
    assert truss.members[0].node_i == 0
    assert truss.members[0].node_j == 1


def test_truss_member_length():
    truss = Truss()
    truss.add_node(0, 0)
    truss.add_node(3, 4)
    truss.add_member(0, 1)
    L = truss.members[0].length(truss.nodes)
    assert abs(L - 5.0) < 1e-6


def test_truss_member_direction():
    truss = Truss()
    truss.add_node(0, 0)
    truss.add_node(3, 4)
    truss.add_member(0, 1)
    dx, dy = truss.members[0].direction_vector(truss.nodes)
    assert abs(dx - 0.6) < 1e-6
    assert abs(dy - 0.8) < 1e-6


def test_truss_member_stress():
    m = TrussMember(0, 1, area_m2=1e-4)
    m.force = 1000
    s = m.stress()
    assert abs(s - 1e7) < 1


def test_truss_member_safety_factor():
    m = TrussMember(0, 1, area_m2=1e-4, yield_stress_pa=250e6)
    m.force = 1000
    sf = m.safety_factor()
    assert abs(sf - 25.0) < 0.1


def test_truss_member_mass_kg():
    m = TrussMember(0, 1, area_m2=1e-4, density_kg_m3=2700.0)
    nodes = [(0, 0), (3, 4)]  # length 5
    expected = 5.0 * 1e-4 * 2700.0
    assert abs(m.mass_kg(nodes) - expected) < 1e-9


def test_truss_member_moment_of_inertia():
    m = TrussMember(0, 1, area_m2=1e-4)
    expected = (1e-4) ** 2 / 12.0
    assert abs(m.moment_of_inertia_m4() - expected) < 1e-15


def test_truss_member_buckling_critical_load():
    m = TrussMember(0, 1, area_m2=1e-4, modulus_elasticity_pa=200e9)
    nodes = [(0, 0), (2, 0)]  # length 2
    I = (1e-4) ** 2 / 12.0
    expected = math.pi ** 2 * 200e9 * I / (2.0 ** 2)
    assert abs(m.buckling_critical_load(nodes) - expected) < 1e-3


def test_truss_total_mass_kg():
    truss = Truss()
    truss.add_node(0, 0)
    truss.add_node(3, 4)
    truss.add_member(0, 1, area_m2=1e-4, density_kg_m3=2700.0)
    expected = 5.0 * 1e-4 * 2700.0
    assert abs(truss.total_mass_kg() - expected) < 1e-9


def test_truss_load_test_failure_load_and_efficiency():
    # Simple triangle, hand-computed reference: at fy=-1000N, method-of-joints
    # gives member forces of +500 (tension, node0-node1), -559.017 (compression,
    # diagonals) for this 2-2-sqrt5-ish geometry - verified against test_truss_solve_simple's
    # topology so the linear-scaling failure load can be cross-checked by hand.
    truss = Truss()
    truss.add_node(0, 0)     # 0
    truss.add_node(2, 0)     # 1
    truss.add_node(1, 2)     # 2
    truss.add_member(0, 1, area_m2=1e-4, E=200e9, yield_stress=250e6, density_kg_m3=7850.0)
    truss.add_member(0, 2, area_m2=1e-4, E=200e9, yield_stress=250e6, density_kg_m3=7850.0)
    truss.add_member(1, 2, area_m2=1e-4, E=200e9, yield_stress=250e6, density_kg_m3=7850.0)
    truss.add_pin_support(0)
    truss.add_roller_support_h(1)
    truss.add_load(2, fy=-1000)

    result = truss.load_test()

    # Hand-check: diagonal members compress the most and are slender enough
    # that Euler buckling governs their failure, not yield.
    assert result["failing_member_index"] in (1, 2)
    failing_member = result["members"][result["failing_member_index"]]
    assert failing_member["is_buckling"] is True
    assert failing_member["in_tension"] is False

    # Efficiency = failure load / structure weight, both must be positive and finite.
    assert result["failure_load_N"] > 0
    assert result["structure_mass_kg"] > 0
    expected_efficiency = result["failure_load_N"] / (result["structure_mass_kg"] * 9.81)
    assert abs(result["efficiency"] - expected_efficiency) < 1e-6


def test_truss_load_test_different_material_changes_efficiency():
    def build(density, yield_stress):
        truss = Truss()
        truss.add_node(0, 0)
        truss.add_node(2, 0)
        truss.add_node(1, 2)
        truss.add_member(0, 1, area_m2=1e-4, E=200e9, yield_stress=yield_stress, density_kg_m3=density)
        truss.add_member(0, 2, area_m2=1e-4, E=200e9, yield_stress=yield_stress, density_kg_m3=density)
        truss.add_member(1, 2, area_m2=1e-4, E=200e9, yield_stress=yield_stress, density_kg_m3=density)
        truss.add_pin_support(0)
        truss.add_roller_support_h(1)
        truss.add_load(2, fy=-1000)
        return truss

    balsa = build(160.0, 15e6).load_test()
    steel = build(8000.0, 250e6).load_test()

    # Same geometry/load, much lighter material -> better (higher) efficiency.
    assert balsa["structure_mass_kg"] < steel["structure_mass_kg"]
    assert balsa["efficiency"] != steel["efficiency"]


def test_truss_load_test_requires_nonzero_load():
    import pytest
    truss = Truss()
    truss.add_node(0, 0)
    truss.add_node(2, 0)
    truss.add_member(0, 1)
    truss.add_pin_support(0)
    truss.add_roller_support_h(1)
    truss.add_load(1, fx=0, fy=0)
    with pytest.raises(ValueError):
        truss.load_test()


def test_stability_check_determinate():
    truss = Truss()
    truss.add_node(0, 0)
    truss.add_node(2, 0)
    truss.add_node(1, 2)
    truss.add_member(0, 1)
    truss.add_member(0, 2)
    truss.add_member(1, 2)
    truss.add_pin_support(0)
    truss.add_roller_support_h(1)

    check = truss.stability_check()
    assert check["joints"] == 3
    assert check["members"] == 3
    assert check["reactions"] == 3
    assert check["two_j"] == 6
    assert check["m_plus_r"] == 6
    assert check["status"] == "determinate"


def test_stability_check_unstable():
    # Same 3 joints, but missing the top member - just two members hinged
    # at the base supports can't resist a sideways load: a mechanism.
    truss = Truss()
    truss.add_node(0, 0)
    truss.add_node(2, 0)
    truss.add_node(1, 2)
    truss.add_member(0, 1)
    truss.add_member(0, 2)
    truss.add_pin_support(0)
    truss.add_roller_support_h(1)

    check = truss.stability_check()
    assert check["m_plus_r"] == 5
    assert check["two_j"] == 6
    assert check["status"] == "unstable"


def test_stability_check_indeterminate():
    # Same stable triangle, but pinned at BOTH supports instead of
    # pin + roller - one redundant reaction component.
    truss = Truss()
    truss.add_node(0, 0)
    truss.add_node(2, 0)
    truss.add_node(1, 2)
    truss.add_member(0, 1)
    truss.add_member(0, 2)
    truss.add_member(1, 2)
    truss.add_pin_support(0)
    truss.add_pin_support(1)

    check = truss.stability_check()
    assert check["m_plus_r"] == 7
    assert check["two_j"] == 6
    assert check["status"] == "indeterminate"


def test_solve_raises_for_unstable_structure():
    import pytest
    truss = Truss()
    truss.add_node(0, 0)
    truss.add_node(2, 0)
    truss.add_node(1, 2)
    truss.add_member(0, 1)
    truss.add_member(0, 2)
    truss.add_pin_support(0)
    truss.add_roller_support_h(1)
    truss.add_load(2, fy=-1000)

    with pytest.raises(ValueError, match="unstable"):
        truss.solve()


def test_solve_raises_for_indeterminate_structure():
    import pytest
    truss = Truss()
    truss.add_node(0, 0)
    truss.add_node(2, 0)
    truss.add_node(1, 2)
    truss.add_member(0, 1)
    truss.add_member(0, 2)
    truss.add_member(1, 2)
    truss.add_pin_support(0)
    truss.add_pin_support(1)
    truss.add_load(2, fy=-1000)

    with pytest.raises(ValueError, match="indeterminate"):
        truss.solve()


def test_truss_solve_simple():
    truss = Truss()
    truss.add_node(0, 0)    # 0
    truss.add_node(2, 0)    # 1
    truss.add_node(1, 2)    # 2
    truss.add_member(0, 1)
    truss.add_member(0, 2)
    truss.add_member(1, 2)
    truss.add_pin_support(0)
    truss.add_roller_support_h(1)
    truss.add_load(2, fy=-1000)
    forces = truss.solve()
    assert len(forces) == 3


def test_bending_moment():
    M = bending_moment(force_N=100, length_m=2)
    assert abs(M - 200) < 1e-6


def test_bending_stress():
    sigma = bending_stress(200, 0.05, 1e-6)
    assert abs(sigma - 1e7) < 1


def test_bending_stress_zero_inertia():
    import pytest
    with pytest.raises(ValueError):
        bending_stress(200, 0.05, 0)


def test_beam_deflection_simple_support():
    d = beam_deflection_simple_support(100, 2, 200e9, 1e-6)
    expected = 100 * 8 / (48 * 200e9 * 1e-6)
    assert abs(d - expected) < 1e-10


def test_beam_deflection_cantilever():
    d = beam_deflection_cantilever(100, 2, 200e9, 1e-6)
    expected = 100 * 8 / (3 * 200e9 * 1e-6)
    assert abs(d - expected) < 1e-10


def test_euler_buckling():
    F = euler_buckling_load(200e9, 1e-6, 2)
    expected = math.pi ** 2 * 200e9 * 1e-6 / 4
    assert abs(F - expected) < 1


def test_axial_stress():
    s = axial_stress(1000, 1e-4)
    assert abs(s - 1e7) < 1


def test_axial_strain():
    e = axial_strain(0.001, 1.0)
    assert abs(e - 0.001) < 1e-10


def test_youngs_modulus():
    E = youngs_modulus(200e6, 0.001)
    assert abs(E - 2e11) < 1e3


def test_safety_factor():
    sf = safety_factor(250e6, 100e6)
    assert abs(sf - 2.5) < 1e-6


def test_rect_moment_of_inertia():
    I = rect_moment_of_inertia(0.1, 0.2)
    expected = 0.1 * 0.008 / 12
    assert abs(I - expected) < 1e-10


def test_circle_moment_of_inertia():
    I = circle_moment_of_inertia(0.05)
    expected = math.pi * 0.05 ** 4 / 64
    assert abs(I - expected) < 1e-12


def test_pipe_moment_of_inertia():
    I = pipe_moment_of_inertia(0.05, 0.04)
    expected = math.pi * (0.05**4 - 0.04**4) / 64
    assert abs(I - expected) < 1e-12


if __name__ == "__main__":
    test_truss_add_node()
    test_truss_add_member()
    test_truss_member_length()
    test_truss_member_direction()
    test_truss_member_stress()
    test_truss_member_safety_factor()
    test_truss_member_mass_kg()
    test_truss_member_moment_of_inertia()
    test_truss_member_buckling_critical_load()
    test_truss_total_mass_kg()
    test_truss_load_test_failure_load_and_efficiency()
    test_truss_load_test_different_material_changes_efficiency()
    test_truss_load_test_requires_nonzero_load()
    test_stability_check_determinate()
    test_stability_check_unstable()
    test_stability_check_indeterminate()
    test_solve_raises_for_unstable_structure()
    test_solve_raises_for_indeterminate_structure()
    test_truss_solve_simple()
    test_bending_moment()
    test_bending_stress()
    test_bending_stress_zero_inertia()
    test_beam_deflection_simple_support()
    test_beam_deflection_cantilever()
    test_euler_buckling()
    test_axial_stress()
    test_axial_strain()
    test_youngs_modulus()
    test_safety_factor()
    test_rect_moment_of_inertia()
    test_circle_moment_of_inertia()
    test_pipe_moment_of_inertia()
    print("All structures tests passed!")
