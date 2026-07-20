"""Tests for engine.physics_lab modules."""

import sys
import os
import math

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from physics_lab.mechanics_lab import (
    projectile_motion, kinetic_energy, potential_energy, centripetal_force,
    pendulum_period, collision_1d, spring_oscillator,
)
from physics_lab.electricity_lab import (
    ohm_law_experiment, series_circuit, parallel_circuit,
    electromagnetic_induction, lorentz_force, rc_time_constant,
    capacitor_charge,
)
from physics_lab.waves_lab import (
    wave_speed, wave_frequency, wavelength_from_freq, simple_pendulum,
    spring_mass_system, harmonic_position, harmonic_velocity,
    harmonic_acceleration, sound_intensity, doppler_effect,
    resonance_frequency_organ_pipe,
)
from physics_lab.thermo_lab import (
    heat_energy, latent_heat, first_law_thermodynamics, ideal_gas_pressure,
    ideal_gas_volume, thermal_expansion_length, thermal_expansion_volume,
    heat_conduction, efficiency_heat_engine, carnot_efficiency,
)


# ---------- Mechanics ----------

def test_projectile_motion():
    res = projectile_motion(20, 45)
    assert res["time_of_flight"] > 0
    assert res["range"] > 0
    assert res["max_height"] > 0
    assert len(res["trajectory"]) == 101


def test_projectile_motion_range():
    res = projectile_motion(20, 45)
    expected = 20**2 * math.sin(math.radians(90)) / 9.81
    assert abs(res["range"] - expected) < 1e-6


def test_kinetic_energy():
    ke = kinetic_energy(10, 5)
    assert abs(ke - 125) < 1e-6


def test_potential_energy():
    pe = potential_energy(10, 5)
    assert abs(pe - 10 * 9.81 * 5) < 1e-6


def test_centripetal_force():
    F = centripetal_force(10, 5, 2)
    assert abs(F - 10 * 25 / 2) < 1e-6


def test_pendulum_period():
    T = pendulum_period(1)
    expected = 2 * math.pi * math.sqrt(1 / 9.81)
    assert abs(T - expected) < 1e-6


def test_collision_1d_elastic():
    res = collision_1d(1, 3, 2, 1, elastic=True)
    v1f_expected = ((1 - 2) * 3 + 2 * 2 * 1) / (1 + 2)
    assert abs(res["v1f"] - v1f_expected) < 1e-6
    assert res["momentum_conserved"] is True


def test_collision_1d_inelastic():
    res = collision_1d(1, 3, 2, 1, elastic=False)
    vf_expected = (1 * 3 + 2 * 1) / (1 + 2)
    assert abs(res["v1f"] - vf_expected) < 1e-6
    assert res["ke_loss"] > 0


def test_spring_oscillator():
    res = spring_oscillator(1, 100, 0.1)
    expected_omega = math.sqrt(100 / 1)
    assert abs(res["omega_rad_s"] - expected_omega) < 1e-6
    assert res["period_s"] > 0
    assert res["total_energy_J"] > 0


# ---------- Electricity ----------

def test_ohm_law_voltage():
    res = ohm_law_experiment(current_A=2, resistance_ohm=5)
    assert abs(res["voltage_V"] - 10) < 1e-6


def test_ohm_law_current():
    res = ohm_law_experiment(voltage_V=10, resistance_ohm=5)
    assert abs(res["current_A"] - 2) < 1e-6


def test_ohm_law_resistance():
    res = ohm_law_experiment(voltage_V=10, current_A=2)
    assert abs(res["resistance_ohm"] - 5) < 1e-6


def test_ohm_law_invalid():
    import pytest
    with pytest.raises(ValueError):
        ohm_law_experiment()


def test_series_circuit():
    res = series_circuit(voltages=[12], resistances=[10, 20, 30])
    assert abs(res["total_resistance"] - 60) < 1e-6
    assert abs(res["current"] - 0.2) < 1e-6
    assert len(res["voltage_drops"]) == 3


def test_parallel_circuit():
    res = parallel_circuit(voltage_V=12, resistances=[10, 20, 30])
    assert abs(res["total_current"] - 12.0 / (1/(1/10+1/20+1/30))) < 1e-6


def test_electromagnetic_induction():
    emf = electromagnetic_induction(100, 0.5, 0.01)
    assert abs(emf - -100 * 0.5 / 0.01) < 1e-6


def test_lorentz_force_electric():
    F = lorentz_force(1.6e-19, electric_field_Vm=1000)
    assert abs(F - 1.6e-16) < 1e-20


def test_lorentz_force_magnetic():
    F = lorentz_force(1.6e-19, velocity_ms=1e6, magnetic_field_T=1, angle_deg=90)
    assert abs(F - 1.6e-19 * 1e6 * 1) < 1e-25


def test_rc_time_constant():
    tau = rc_time_constant(1000, 1e-6)
    assert abs(tau - 0.001) < 1e-10


def test_capacitor_charge():
    V = capacitor_charge(5, 1000, 1e-6, 0.001)
    expected = 5 * (1 - math.exp(-0.001 / 0.001))
    assert abs(V - expected) < 1e-6


# ---------- Waves ----------

def test_wave_speed():
    v = wave_speed(100, 2)
    assert abs(v - 200) < 1e-6


def test_wave_frequency():
    f = wave_frequency(2, 200)
    assert abs(f - 100) < 1e-6


def test_wavelength_from_freq():
    lam = wavelength_from_freq(200, 100)
    assert abs(lam - 2) < 1e-6


def test_simple_pendulum_waves():
    res = simple_pendulum(1)
    assert abs(res["period_s"] - 2 * math.pi * math.sqrt(1 / 9.81)) < 1e-6


def test_spring_mass_system():
    res = spring_mass_system(1, 100)
    expected_omega = math.sqrt(100 / 1)
    assert abs(res["angular_frequency_rad_s"] - expected_omega) < 1e-6


def test_harmonic_position():
    x = harmonic_position(1, 2 * math.pi, 0.25)
    assert abs(x - 0) < 1e-6


def test_harmonic_velocity():
    v = harmonic_velocity(1, 2 * math.pi, 0)
    assert abs(v - 0) < 1e-6


def test_harmonic_acceleration():
    a = harmonic_acceleration(1, 2 * math.pi, 0)
    expected = -(2 * math.pi) ** 2
    assert abs(a - expected) < 1e-6


def test_sound_intensity():
    I = sound_intensity(10, 1)
    expected = 10 / (4 * math.pi)
    assert abs(I - expected) < 1e-6


def test_doppler_effect():
    f = doppler_effect(440, 30, source_approaching=True)
    expected = 440 * 343 / (343 - 30)
    assert abs(f - expected) < 1


def test_resonance_frequency_closed():
    f = resonance_frequency_organ_pipe(1, 1, closed_end=True)
    expected = 343 / 4
    assert abs(f - expected) < 1


def test_resonance_frequency_open():
    f = resonance_frequency_organ_pipe(1, 1, closed_end=False)
    expected = 343 / 2
    assert abs(f - expected) < 1


# ---------- Thermodynamics ----------

def test_heat_energy():
    Q = heat_energy(2, 4186, 10)
    assert abs(Q - 2 * 4186 * 10) < 1e-6


def test_latent_heat():
    Q = latent_heat(1, 334000)
    assert abs(Q - 334000) < 1


def test_first_law_thermodynamics():
    dU = first_law_thermodynamics(500, 200)
    assert abs(dU - 300) < 1e-6


def test_ideal_gas_pressure():
    P = ideal_gas_pressure(0.025, 1, 300)
    expected = 1 * 8.314 * 300 / 0.025
    assert abs(P - expected) < 1


def test_ideal_gas_volume():
    V = ideal_gas_volume(101325, 1, 300)
    expected = 1 * 8.314 * 300 / 101325
    assert abs(V - expected) < 1e-6


def test_thermal_expansion_length():
    dL = thermal_expansion_length(1, 1.2e-5, 50)
    assert abs(dL - 1 * 1.2e-5 * 50) < 1e-10


def test_thermal_expansion_volume():
    dV = thermal_expansion_volume(0.001, 3.6e-5, 50)
    assert abs(dV - 0.001 * 3.6e-5 * 50) < 1e-10


def test_heat_conduction():
    P = heat_conduction(0.8, 1, 10, 0.1)
    assert abs(P - 0.8 * 1 * 10 / 0.1) < 1e-6


def test_efficiency_heat_engine():
    eta = efficiency_heat_engine(300, 1000)
    assert abs(eta - 0.3) < 1e-6


def test_carnot_efficiency():
    eta = carnot_efficiency(500, 300)
    assert abs(eta - (1 - 300 / 500)) < 1e-6


if __name__ == "__main__":
    test_projectile_motion()
    test_projectile_motion_range()
    test_kinetic_energy()
    test_potential_energy()
    test_centripetal_force()
    test_pendulum_period()
    test_collision_1d_elastic()
    test_collision_1d_inelastic()
    test_spring_oscillator()
    test_ohm_law_voltage()
    test_ohm_law_current()
    test_ohm_law_resistance()
    test_ohm_law_invalid()
    test_series_circuit()
    test_parallel_circuit()
    test_electromagnetic_induction()
    test_lorentz_force_electric()
    test_lorentz_force_magnetic()
    test_rc_time_constant()
    test_capacitor_charge()
    test_wave_speed()
    test_wave_frequency()
    test_wavelength_from_freq()
    test_simple_pendulum_waves()
    test_spring_mass_system()
    test_harmonic_position()
    test_harmonic_velocity()
    test_harmonic_acceleration()
    test_sound_intensity()
    test_doppler_effect()
    test_resonance_frequency_closed()
    test_resonance_frequency_open()
    test_heat_energy()
    test_latent_heat()
    test_first_law_thermodynamics()
    test_ideal_gas_pressure()
    test_ideal_gas_volume()
    test_thermal_expansion_length()
    test_thermal_expansion_volume()
    test_heat_conduction()
    test_efficiency_heat_engine()
    test_carnot_efficiency()
    print("All physics lab tests passed!")
