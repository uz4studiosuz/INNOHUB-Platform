"""Tests for engine.flight modules."""

import sys
import os
import math

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from flight.glider_model import Glider, GliderModel
from flight.drone_model import Quadcopter
from flight.rocket_model import Rocket
from flight.drone_model import PIDController, AltitudeHoldPID
from flight.stability_check import (
    check_longitudinal_stability,
    check_lateral_stability,
    check_directional_stability,
    check_weight_and_power,
    overall_readiness,
)


# ---------- Glider Tests ----------

def test_glider_initial_state():
    g = Glider()
    assert g.x == 0.0
    assert g.y == 0.0


def test_glider_lift_force():
    g = Glider(wing_area_m2=0.3, lift_coefficient=0.5)
    L = g.lift_force(velocity=10)
    expected = 0.5 * 1.225 * 100 * 0.3 * 0.5
    assert abs(L - expected) < 1e-6


def test_glider_drag_force():
    g = Glider(wing_area_m2=0.3, drag_coefficient=0.05)
    D = g.drag_force(velocity=10)
    expected = 0.5 * 1.225 * 100 * 0.3 * 0.05
    assert abs(D - expected) < 1e-6


def test_glide_ratio():
    g = Glider(lift_coefficient=0.5, drag_coefficient=0.05)
    assert abs(g.glide_ratio() - 10.0) < 1e-10


def test_equilibrium_glide_speed():
    g = Glider(mass_kg=1.0, wing_area_m2=0.3, lift_coefficient=0.5)
    v = g.equilibrium_glide_speed()
    expected = math.sqrt(2 * 1.0 * 9.81 / (1.225 * 0.3 * 0.5))
    assert abs(v - expected) < 1e-6


def test_glider_simulate():
    g = Glider(mass_kg=1.0, wing_area_m2=0.3)
    g.vx = 10.0
    g.vy = -1.0
    history = g.simulate(dt=0.1, steps=50)
    assert len(history) == 50
    x_final, y_final = history[-1]
    assert x_final > 0


# ---------- GliderModel Tests ----------

def test_glider_model_default_initialization():
    gm = GliderModel()
    assert gm.mass == 1.0
    assert gm.span == 1.0
    assert gm.chord == 0.15
    assert gm.airfoil_id == "naca2412"


def test_glider_model_wing_area():
    gm = GliderModel(wing_span_m=2.0, chord_m=0.2)
    expected_area = 2.0 * 0.2
    assert abs(gm.wing_area() - expected_area) < 1e-10


def test_glider_model_aspect_ratio():
    gm = GliderModel(wing_span_m=2.0, chord_m=0.2)
    # S = 2*0.2 = 0.4, AR = 4/0.4 = 10
    expected_ar = 4.0 / 0.4
    assert abs(gm.aspect_ratio() - expected_ar) < 1e-10


def test_glider_model_aspect_ratio_high_aspect():
    gm = GliderModel(wing_span_m=3.0, chord_m=0.1)
    AR = gm.aspect_ratio()
    expected = 9.0 / 0.3
    assert abs(AR - expected) < 1e-10


def test_glider_model_lift_coefficient():
    gm = GliderModel(airfoil_id="naca0012", angle_of_attack_deg=5)
    cl = gm.lift_coefficient()
    # NACA 0012: cl_alpha_slope = 0.11 per degree -> 0.11 * 5 = 0.55
    expected = 0.11 * 5
    assert abs(cl - expected) < 1e-6
    assert cl <= 1.2


def test_glider_model_induced_drag_coefficient():
    gm = GliderModel(wing_span_m=2.0, chord_m=0.2, oswald_efficiency=0.8,
                     airfoil_id="naca0012", angle_of_attack_deg=3)
    cdi = gm.induced_drag_coefficient()
    cl = gm.lift_coefficient()
    AR = gm.aspect_ratio()
    expected_cdi = cl ** 2 / (math.pi * 0.8 * AR)
    assert abs(cdi - expected_cdi) < 1e-10


def test_glider_model_drag_coefficient():
    gm = GliderModel(airfoil_id="naca0012", angle_of_attack_deg=3)
    cd = gm.drag_coefficient()
    cd0 = gm.zero_lift_drag_coefficient()
    cdi = gm.induced_drag_coefficient()
    assert abs(cd - (cd0 + cdi)) < 1e-10


def test_glider_model_lift_force_zero_velocity():
    gm = GliderModel(mass_kg=1.0, wing_span_m=1.0, chord_m=0.15)
    L = gm.lift_force(0)
    assert abs(L) < 1e-10


def test_glider_model_lift_force_known_value():
    gm = GliderModel(mass_kg=1.0, wing_span_m=2.0, chord_m=0.2,
                     airfoil_id="naca0012", angle_of_attack_deg=4)
    cl = gm.lift_coefficient()
    S = gm.wing_area()
    v = 10.0
    L = gm.lift_force(v)
    expected = 0.5 * 1.225 * 100 * S * cl
    assert abs(L - expected) < 1e-6


def test_glider_model_drag_force_known_value():
    gm = GliderModel(mass_kg=1.0, wing_span_m=2.0, chord_m=0.2,
                     airfoil_id="naca0012", angle_of_attack_deg=4)
    cd = gm.drag_coefficient()
    S = gm.wing_area()
    v = 10.0
    D = gm.drag_force(v)
    expected = 0.5 * 1.225 * 100 * S * cd
    assert abs(D - expected) < 1e-6


def test_glider_model_glide_ratio():
    gm = GliderModel(airfoil_id="naca0012", angle_of_attack_deg=3)
    LD = gm.glide_ratio()
    cl = gm.lift_coefficient()
    cd = gm.drag_coefficient()
    assert abs(LD - cl / cd) < 1e-10


def test_glider_model_wing_loading():
    gm = GliderModel(mass_kg=2.0, wing_span_m=2.0, chord_m=0.5)
    wl = gm.wing_loading()
    expected = 2.0 * 9.81 / (2.0 * 0.5)
    assert abs(wl - expected) < 1e-10


def test_glider_model_reynolds_number():
    gm = GliderModel(chord_m=0.2)
    v = 10.0
    Re = gm.reynolds_number(v)
    expected = 1.225 * 10 * 0.2 / 1.81e-5
    assert abs(Re - expected) < 1e-6


def test_glider_model_static_margin_positive():
    gm = GliderModel(cg_position_m=0.04, neutral_point_m=0.06, chord_m=0.2)
    sm = gm.static_margin()
    assert abs(sm - 0.1) < 1e-10
    assert gm.is_stable() is True


def test_glider_model_static_margin_negative():
    gm = GliderModel(cg_position_m=0.06, neutral_point_m=0.04, chord_m=0.2)
    sm = gm.static_margin()
    assert abs(sm - (-0.1)) < 1e-10
    assert gm.is_stable() is False


def test_glider_model_equilibrium_glide_speed():
    gm = GliderModel(mass_kg=1.0, wing_span_m=2.0, chord_m=0.2,
                     airfoil_id="naca0012", angle_of_attack_deg=5)
    v = gm.equilibrium_glide_speed()
    expected = math.sqrt(2 * 1.0 * 9.81 / (1.225 * gm.wing_area() * gm.lift_coefficient()))
    assert abs(v - expected) < 1e-6


def test_glider_model_sink_rate():
    gm = GliderModel(airfoil_id="naca0012", angle_of_attack_deg=3)
    v = 10.0
    sink = gm.sink_rate(v)
    LD = gm.glide_ratio()
    assert abs(sink - v / LD) < 1e-10


def test_glider_model_glide_angle():
    gm = GliderModel(airfoil_id="naca0012", angle_of_attack_deg=3)
    gamma = gm.glide_angle()
    LD = gm.glide_ratio()
    expected = math.atan2(1.0, LD)
    assert abs(gamma - expected) < 1e-10


def test_glider_model_update_positive_dt():
    gm = GliderModel(mass_kg=1.0, wing_span_m=2.0, chord_m=0.2)
    gm.vx = 10.0
    gm.vy = -1.0
    gm.update(0.1)
    assert gm.x != 0 or gm.y != 0


def test_glider_model_update_invalid_dt():
    gm = GliderModel()
    try:
        gm.update(0)
        assert False, "Should have raised ValueError"
    except ValueError:
        pass


def test_glider_model_simulate_basic():
    gm = GliderModel(mass_kg=0.5, wing_span_m=1.0, chord_m=0.15,
                     airfoil_id="naca0012", angle_of_attack_deg=4)
    gm.x = 0.0
    gm.y = 50.0
    gm.vx = 10.0
    gm.vy = 0.0
    result = gm.simulate(dt=0.05, max_time=5.0)
    assert len(result["trajectory"]) > 0
    assert result["flight_time_s"] > 0
    assert result["range_m"] > 0


def test_glider_model_simulate_metrics():
    gm = GliderModel(mass_kg=0.5, wing_span_m=1.0, chord_m=0.15,
                     airfoil_id="naca2412", angle_of_attack_deg=5)
    gm.y = 50.0
    gm.vx = 15.0
    gm.vy = 0.0
    result = gm.simulate(dt=0.05, max_time=10.0)
    metrics = ["flight_time_s", "range_m", "max_LD", "landing_velocity_ms", "max_height_m"]
    for key in metrics:
        assert key in result, f"Missing metric: {key}"
    assert result["max_LD"] > 0


# ---------- Rocket Tests ----------

def test_rocket_initial_state():
    r = Rocket()
    assert r.x == 0.0
    assert r.y == 0.0
    assert r.dry_mass == 1.0
    assert r.thrust == 50.0


def test_rocket_current_mass_before_burnout():
    r = Rocket(propellant_mass_kg=0.5, burn_time_s=2.0)
    m = r.current_mass(1.0)
    expected = 1.5 - 0.25 * 1.0
    assert abs(m - expected) < 1e-10


def test_rocket_current_mass_after_burnout():
    r = Rocket(propellant_mass_kg=0.5, burn_time_s=2.0)
    m = r.current_mass(3.0)
    assert abs(m - r.dry_mass) < 1e-10


def test_rocket_delta_v_ideal():
    r = Rocket(dry_mass_kg=1.0, propellant_mass_kg=0.5, isp_s=100.0)
    dv = r.delta_v_ideal()
    expected = 100 * 9.81 * math.log(1.5 / 1.0)
    assert abs(dv - expected) < 1e-6


def test_rocket_thrust_during_burn():
    r = Rocket(thrust_N=50.0, burn_time_s=2.0)
    assert abs(r.thrust_force(0) - 50.0) < 1e-10
    assert abs(r.thrust_force(1.0) - 50.0) < 1e-10


def test_rocket_thrust_after_burnout():
    r = Rocket(thrust_N=50.0, burn_time_s=2.0)
    assert abs(r.thrust_force(3.0)) < 1e-10


def test_rocket_drag_force_zero_velocity():
    r = Rocket()
    assert abs(r.drag_force(0)) < 1e-10


def test_rocket_drag_force_known_value():
    r = Rocket(body_diameter_m=0.05, cd=0.4)
    D = r.drag_force(100)
    A = math.pi * (0.025 ** 2)
    expected = 0.5 * 1.225 * 10000 * A * 0.4
    assert abs(D - expected) < 1e-6


def test_rocket_cross_section_area():
    r = Rocket(body_diameter_m=0.05)
    expected = math.pi * (0.025 ** 2)
    assert abs(r.cross_section_area() - expected) < 1e-10


def test_rocket_center_of_pressure():
    r = Rocket(body_length_m=0.5, body_diameter_m=0.05)
    cp = r.center_of_pressure()
    assert cp > 0
    assert cp < r.body_length * 1.5


def test_rocket_center_of_gravity():
    r = Rocket(dry_mass_kg=1.0, propellant_mass_kg=0.5, body_length_m=0.5)
    cg = r.center_of_gravity(t=0)
    assert cg > 0
    assert cg < r.body_length


def test_rocket_static_margin():
    r = Rocket(body_length_m=0.5, body_diameter_m=0.05)
    sm = r.static_margin(t=0)
    assert isinstance(sm, float)


def test_rocket_stability_check():
    r = Rocket(body_length_m=0.5, body_diameter_m=0.05)
    stable = r.is_stable()
    assert isinstance(stable, bool)


def test_rocket_max_height_no_drag():
    r = Rocket(dry_mass_kg=1.0, propellant_mass_kg=0.5, isp_s=100.0)
    h = r.max_height_no_drag()
    dv = r.delta_v_ideal()
    expected = dv ** 2 / (2 * 9.81)
    assert abs(h - expected) < 1e-6


def test_rocket_update_basic():
    r = Rocket(thrust_N=50.0, dry_mass_kg=1.0, propellant_mass_kg=0.5)
    r.vy = 10.0
    r.update(t=0, dt=0.1)
    assert r.y != 0


def test_rocket_update_invalid_dt():
    r = Rocket()
    try:
        r.update(t=0, dt=0)
        assert False, "Should have raised ValueError"
    except ValueError:
        pass


def test_rocket_simulate_basic():
    r = Rocket(dry_mass_kg=0.2, propellant_mass_kg=0.1,
               burn_time_s=0.5, thrust_N=20.0, isp_s=80,
               body_diameter_m=0.03, body_length_m=0.3, cd=0.5)
    result = r.simulate(dt=0.05, max_time=10.0)
    assert len(result["trajectory"]) > 0
    assert result["flight_time_s"] > 0
    assert result["apogee_m"] > 0


def test_rocket_simulate_metrics():
    r = Rocket(dry_mass_kg=0.2, propellant_mass_kg=0.1,
               burn_time_s=0.5, thrust_N=20.0, isp_s=80,
               body_diameter_m=0.03, body_length_m=0.3, cd=0.5)
    result = r.simulate(dt=0.05, max_time=10.0)
    for key in ["flight_time_s", "range_m", "apogee_m", "delta_v_ideal_ms", "stability_margin_calibers"]:
        assert key in result, f"Missing metric: {key}"
    assert result["apogee_m"] > 0
    assert result["delta_v_ideal_ms"] > 0


# ---------- Drone Tests ----------

def test_drone_initial_state():
    d = Quadcopter()
    assert d.z == 0.0
    assert d.vz == 0.0


def test_drone_thrust_from_rpm():
    d = Quadcopter(thrust_coefficient=1e-5)
    t = d.thrust_from_rpm(5000)
    assert abs(t - 250.0) < 1e-6


def test_drone_total_thrust():
    d = Quadcopter(thrust_coefficient=1e-5)
    t = d.total_thrust([5000, 5000, 5000, 5000])
    assert abs(t - 1000.0) < 1e-6


def test_drone_hover_rpm():
    d = Quadcopter(mass_kg=1.5, thrust_coefficient=1e-5)
    rpm = d.hover_rpm()
    expected = math.sqrt(1.5 * 9.81 / (4 * 1e-5))
    assert abs(rpm - expected) < 1e-6


def test_drone_vertical_acceleration():
    d = Quadcopter(mass_kg=1.5)
    a = d.vertical_acceleration(total_thrust=20)
    expected = (20 - 1.5 * 9.81) / 1.5
    assert abs(a - expected) < 1e-6


def test_drone_update():
    d = Quadcopter(mass_kg=1.5, thrust_coefficient=1e-5)
    hover_rpm = d.hover_rpm()
    d.update([hover_rpm, hover_rpm, hover_rpm, hover_rpm], dt=0.1)
    assert abs(d.vz) < 0.01


# ---------- Drone Extended Tests ----------

def test_drone_propeller_thrust():
    d = Quadcopter()
    t = d.propeller_thrust(rpm=5000, diameter_m=0.3, ct=0.1)
    n = 5000 / 60.0
    expected = 0.1 * 1.225 * n ** 2 * 0.3 ** 4
    assert abs(t - expected) < 1e-6


def test_drone_propeller_torque():
    d = Quadcopter()
    q = d.propeller_torque(rpm=5000, diameter_m=0.3, cq=0.015)
    n = 5000 / 60.0
    expected = 0.015 * 1.225 * n ** 2 * 0.3 ** 5
    assert abs(q - expected) < 1e-6


def test_drone_propeller_power():
    d = Quadcopter()
    p = d.propeller_power(rpm=5000, diameter_m=0.3, cp=0.05)
    n = 5000 / 60.0
    expected = 0.05 * 1.225 * n ** 3 * 0.3 ** 5
    assert abs(p - expected) < 1e-6


def test_drone_power_from_torque():
    d = Quadcopter()
    p = d.required_power_from_torque(rpm=5000, torque=0.1)
    n = 5000 / 60.0
    expected = 2 * math.pi * n * 0.1
    assert abs(p - expected) < 1e-6


def test_drone_thrust_to_weight_hover():
    d = Quadcopter(mass_kg=1.5)
    hover_rpm = d.hover_rpm()
    twr = d.thrust_to_weight_ratio(hover_rpm, diameter_m=0.3, ct=d.thrust_coeff * 60 ** 2 / (1.225 * 0.3 ** 4))
    assert abs(twr - 1.0) < 0.1


def test_pid_controller_initial():
    pid = PIDController(kp=1.0, ki=0, kd=0)
    output = pid.update(setpoint=10, measurement=0)
    assert abs(output - 10.0) < 1e-10


def test_pid_controller_at_setpoint():
    pid = PIDController(kp=1.0, ki=0.1, kd=0.1)
    pid.reset()
    output = pid.update(setpoint=10, measurement=10)
    assert abs(output) < 1e-10


def test_pid_controller_derivative():
    pid = PIDController(kp=0, ki=0, kd=1.0, dt=0.1)
    pid.prev_error = 10
    output = pid.update(setpoint=10, measurement=0)
    expected_deriv = (10 - 10) / 0.1
    assert abs(output - expected_deriv) < 1e-10


def test_altitude_hold_pid():
    d = Quadcopter(mass_kg=1.5, thrust_coefficient=1e-5)
    alt_hold = AltitudeHoldPID(d, kp=2.0, ki=0.5, kd=0.3, dt=0.01)
    rpms = alt_hold.compute_rpms(target_z=10)
    assert len(rpms) == 4
    for rpm in rpms:
        assert rpm > 0
        assert rpm <= d.max_rpm


# ---------- Stability Check Tests ----------

def test_longitudinal_stability_ok():
    ok, sm = check_longitudinal_stability(0.25, 0.35)
    assert ok is True
    assert abs(sm - 0.10) < 1e-10


def test_longitudinal_stability_fail():
    ok, sm = check_longitudinal_stability(0.35, 0.25)
    assert ok is False
    assert abs(sm - (-0.10)) < 1e-10


def test_lateral_stability_ok():
    assert check_lateral_stability(3.0) is True


def test_lateral_stability_fail():
    assert check_lateral_stability(1.0) is False


def test_directional_stability_ok():
    ok, vv = check_directional_stability(
        vertical_tail_area=0.2, vertical_tail_arm=0.6,
        wing_area=1.5, wing_span=2.0,
    )
    assert ok is True


def test_directional_stability_fail():
    ok, vv = check_directional_stability(
        vertical_tail_area=0.01, vertical_tail_arm=0.1,
        wing_area=1.5, wing_span=2.0,
    )
    assert ok is False


def test_overall_readiness():
    result = overall_readiness(
        cg_percent=0.25, neutral_point_percent=0.35,
        dihedral_angle_deg=3.0,
        vtail_area=0.2, vtail_arm=0.6, wing_area=1.5, wing_span=2.0,
        mass=1.0, wing_area_m2=0.3, engine_power_w=200,
    )
    assert "passed" in result
    assert "static_margin" in result
    assert "power_to_weight" in result


if __name__ == "__main__":
    test_glider_initial_state()
    test_glider_lift_force()
    test_glider_drag_force()
    test_glide_ratio()
    test_equilibrium_glide_speed()
    test_glider_simulate()
    test_glider_model_default_initialization()
    test_glider_model_wing_area()
    test_glider_model_aspect_ratio()
    test_glider_model_aspect_ratio_high_aspect()
    test_glider_model_lift_coefficient()
    test_glider_model_induced_drag_coefficient()
    test_glider_model_drag_coefficient()
    test_glider_model_lift_force_zero_velocity()
    test_glider_model_lift_force_known_value()
    test_glider_model_drag_force_known_value()
    test_glider_model_glide_ratio()
    test_glider_model_wing_loading()
    test_glider_model_reynolds_number()
    test_glider_model_static_margin_positive()
    test_glider_model_static_margin_negative()
    test_glider_model_equilibrium_glide_speed()
    test_glider_model_sink_rate()
    test_glider_model_glide_angle()
    test_glider_model_update_positive_dt()
    test_glider_model_update_invalid_dt()
    test_glider_model_simulate_basic()
    test_glider_model_simulate_metrics()
    test_rocket_initial_state()
    test_rocket_current_mass_before_burnout()
    test_rocket_current_mass_after_burnout()
    test_rocket_delta_v_ideal()
    test_rocket_thrust_during_burn()
    test_rocket_thrust_after_burnout()
    test_rocket_drag_force_zero_velocity()
    test_rocket_drag_force_known_value()
    test_rocket_cross_section_area()
    test_rocket_center_of_pressure()
    test_rocket_center_of_gravity()
    test_rocket_static_margin()
    test_rocket_stability_check()
    test_rocket_max_height_no_drag()
    test_rocket_update_basic()
    test_rocket_update_invalid_dt()
    test_rocket_simulate_basic()
    test_rocket_simulate_metrics()
    test_drone_initial_state()
    test_drone_thrust_from_rpm()
    test_drone_total_thrust()
    test_drone_hover_rpm()
    test_drone_vertical_acceleration()
    test_drone_update()
    test_drone_propeller_thrust()
    test_drone_propeller_torque()
    test_drone_propeller_power()
    test_drone_power_from_torque()
    test_drone_thrust_to_weight_hover()
    test_pid_controller_initial()
    test_pid_controller_at_setpoint()
    test_pid_controller_derivative()
    test_altitude_hold_pid()
    test_longitudinal_stability_ok()
    test_longitudinal_stability_fail()
    test_lateral_stability_ok()
    test_lateral_stability_fail()
    test_directional_stability_ok()
    test_directional_stability_fail()
    test_overall_readiness()
    print("All flight dynamics tests passed!")
