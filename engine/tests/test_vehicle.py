"""Tests for engine.vehicle modules."""

import sys
import os
import math

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from vehicle.car_model import Car
from vehicle.braking import (
    braking_distance,
    deceleration_from_friction,
    braking_time,
    total_stopping_distance,
)
from vehicle.cornering import (
    centripetal_force,
    centripetal_acceleration,
    max_cornering_speed,
    max_cornering_speed_banked,
)


# ---------- Car Model Tests ----------

def test_car_initial_state():
    car = Car(mass_kg=1000, engine_power_w=50000)
    assert car.position == 0.0
    assert car.velocity == 0.0


def test_car_tractive_force():
    car = Car(engine_power_w=50000)
    f = car.tractive_force(10)
    assert abs(f - 5000.0) < 1e-6


def test_car_drag_force():
    car = Car(air_density=1.225, drag_coefficient=0.3, frontal_area_m2=2.2)
    f = car.drag_force(10)
    expected = 0.5 * 1.225 * 100 * 0.3 * 2.2
    assert abs(f - expected) < 1e-6


def test_car_update():
    car = Car(mass_kg=1000, engine_power_w=100000)
    car.update(1.0)
    assert car.velocity > 0
    assert car.position > 0


def test_car_simulate():
    car = Car(mass_kg=1000, engine_power_w=100000)
    history = car.simulate(dt=0.1, steps=100)
    assert len(history) == 100
    pos, vel = history[-1]
    assert pos > 0
    assert vel > 0


def test_car_top_speed():
    car = Car(mass_kg=1000, engine_power_w=100000)
    v_top = car.top_speed()
    assert v_top > 0


# ---------- Braking Tests ----------

def test_braking_distance():
    d = braking_distance(initial_velocity=20, deceleration=5)
    assert abs(d - 40.0) < 1e-10


def test_deceleration_from_friction():
    a = deceleration_from_friction(coefficient_friction=0.7)
    assert abs(a - 6.867) < 1e-10


def test_braking_time():
    t = braking_time(initial_velocity=20, deceleration=5)
    assert abs(t - 4.0) < 1e-10


def test_total_stopping_distance():
    d = total_stopping_distance(reaction_time=1, initial_velocity=20, deceleration=5)
    expected = 20 * 1 + 20 ** 2 / (2 * 5)
    assert abs(d - expected) < 1e-10


# ---------- Cornering Tests ----------

def test_centripetal_force():
    f = centripetal_force(mass=1000, velocity=10, radius=50)
    assert abs(f - 2000.0) < 1e-10


def test_centripetal_acceleration():
    a = centripetal_acceleration(velocity=10, radius=50)
    assert abs(a - 2.0) < 1e-10


def test_max_cornering_speed():
    v = max_cornering_speed(radius=50, friction_coefficient=0.7)
    expected = math.sqrt(0.7 * 9.81 * 50)
    assert abs(v - expected) < 1e-6


def test_max_cornering_speed_banked():
    v = max_cornering_speed_banked(radius=50, friction_coefficient=0.7, bank_angle_deg=10)
    theta = math.radians(10)
    numerator = 9.81 * 50 * (0.7 + math.tan(theta))
    denominator = 1 - 0.7 * math.tan(theta)
    expected = math.sqrt(numerator / denominator)
    assert abs(v - expected) < 1e-6


def test_max_cornering_speed_banked_no_friction():
    v = max_cornering_speed_banked(radius=50, friction_coefficient=0, bank_angle_deg=20)
    expected = math.sqrt(9.81 * 50 * math.tan(math.radians(20)))
    assert abs(v - expected) < 1e-6


if __name__ == "__main__":
    test_car_initial_state()
    test_car_tractive_force()
    test_car_drag_force()
    test_car_update()
    test_car_simulate()
    test_car_top_speed()
    test_braking_distance()
    test_deceleration_from_friction()
    test_braking_time()
    test_total_stopping_distance()
    test_centripetal_force()
    test_centripetal_acceleration()
    test_max_cornering_speed()
    test_max_cornering_speed_banked()
    test_max_cornering_speed_banked_no_friction()
    print("All vehicle dynamics tests passed!")
