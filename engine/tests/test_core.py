"""Tests for engine.core modules (kinematics, dynamics, energy, integrator)."""

import math
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.kinematics import (
    final_velocity,
    displacement,
    velocity_displacement,
    average_velocity,
    acceleration_from_force,
)
from core.dynamics import (
    net_force,
    weight,
    friction_force,
    net_force_from_forces,
    acceleration_from_net_force,
)
from core.energy import (
    kinetic_energy,
    potential_energy,
    mechanical_energy,
    work,
    power,
)
from core.integrator import State, euler_step, simulate


# ---------- Kinematics Tests ----------

def test_final_velocity():
    v = final_velocity(initial_velocity=0, acceleration=9.81, time=2)
    assert abs(v - 19.62) < 1e-10


def test_final_velocity_deceleration():
    v = final_velocity(initial_velocity=10, acceleration=-2, time=3)
    assert abs(v - 4.0) < 1e-10


def test_displacement():
    s = displacement(initial_velocity=0, time=3, acceleration=9.81)
    expected = 0.5 * 9.81 * 9
    assert abs(s - expected) < 1e-10


def test_displacement_with_initial_velocity():
    s = displacement(initial_velocity=5, time=2, acceleration=0)
    assert abs(s - 10.0) < 1e-10


def test_velocity_displacement():
    a = velocity_displacement(initial_velocity=0, final_velocity=10, displacement=20)
    assert abs(a - 2.5) < 1e-10


def test_average_velocity():
    v_avg = average_velocity(initial_velocity=0, final_velocity=20)
    assert abs(v_avg - 10.0) < 1e-10


def test_acceleration_from_force():
    a = acceleration_from_force(mass=2, net_force=10)
    assert abs(a - 5.0) < 1e-10


# ---------- Dynamics Tests ----------

def test_net_force():
    f = net_force(mass=5, acceleration=2)
    assert abs(f - 10.0) < 1e-10


def test_weight():
    w = weight(mass=10)
    assert abs(w - 98.1) < 1e-10


def test_weight_custom_gravity():
    w = weight(mass=10, gravitational_acceleration=1.62)
    assert abs(w - 16.2) < 1e-10


def test_friction_force():
    f = friction_force(normal_force=100, coefficient=0.5)
    assert abs(f - 50.0) < 1e-10


def test_net_force_from_forces():
    forces = [10, -5, 3, -2]
    assert abs(net_force_from_forces(forces) - 6.0) < 1e-10


def test_acceleration_from_net_force():
    a = acceleration_from_net_force(net_force=15, mass=3)
    assert abs(a - 5.0) < 1e-10


# ---------- Energy Tests ----------

def test_kinetic_energy():
    ke = kinetic_energy(mass=2, velocity=3)
    assert abs(ke - 9.0) < 1e-10


def test_kinetic_energy_zero_velocity():
    ke = kinetic_energy(mass=5, velocity=0)
    assert abs(ke - 0.0) < 1e-10


def test_potential_energy():
    pe = potential_energy(mass=2, height=10)
    assert abs(pe - 196.2) < 1e-10


def test_mechanical_energy():
    me = mechanical_energy(kinetic_energy=50, potential_energy=100)
    assert abs(me - 150.0) < 1e-10


def test_work():
    w = work(force=10, displacement=5, angle_deg=0)
    assert abs(w - 50.0) < 1e-10


def test_work_at_angle():
    w = work(force=10, displacement=5, angle_deg=60)
    expected = 10 * 5 * math.cos(math.radians(60))
    assert abs(w - expected) < 1e-10


def test_power():
    p = power(work=100, time=5)
    assert abs(p - 20.0) < 1e-10


# ---------- Integrator Tests ----------

def test_euler_step():
    state = State(position=0, velocity=0)
    new_state = euler_step(state, acceleration=2, dt=1)
    assert abs(new_state.position - 0.0) < 1e-10
    assert abs(new_state.velocity - 2.0) < 1e-10


def test_euler_step_moving():
    state = State(position=10, velocity=5)
    new_state = euler_step(state, acceleration=-2, dt=0.5)
    assert abs(new_state.position - 12.5) < 1e-10
    assert abs(new_state.velocity - 4.0) < 1e-10


def test_simulate():
    state = State(position=0, velocity=0)
    history = simulate(state, acceleration=1, dt=1, steps=3)
    assert len(history) == 3
    assert abs(history[-1].position - 3.0) < 1e-10
    assert abs(history[-1].velocity - 3.0) < 1e-10


def test_simulate_single_step():
    state = State(position=0, velocity=0)
    history = simulate(state, acceleration=0, dt=1, steps=1)
    assert len(history) == 1
    assert abs(history[0].position - 0.0) < 1e-10
    assert abs(history[0].velocity - 0.0) < 1e-10


if __name__ == "__main__":
    test_final_velocity()
    test_final_velocity_deceleration()
    test_displacement()
    test_displacement_with_initial_velocity()
    test_velocity_displacement()
    test_average_velocity()
    test_acceleration_from_force()
    test_net_force()
    test_weight()
    test_weight_custom_gravity()
    test_friction_force()
    test_net_force_from_forces()
    test_acceleration_from_net_force()
    test_kinetic_energy()
    test_kinetic_energy_zero_velocity()
    test_potential_energy()
    test_mechanical_energy()
    test_work()
    test_work_at_angle()
    test_power()
    test_euler_step()
    test_euler_step_moving()
    test_simulate()
    test_simulate_single_step()
    print("All tests passed!")
