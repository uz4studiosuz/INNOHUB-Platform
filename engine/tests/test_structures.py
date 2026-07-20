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
