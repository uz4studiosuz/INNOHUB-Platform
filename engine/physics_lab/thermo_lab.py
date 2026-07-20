"""Physics Lab: Thermodynamics experiments.

Sources: Halliday Resnick - Fundamentals of Physics.
"""


def heat_energy(mass_kg, specific_heat_J_kgK, temp_change_K):
    """Q = m * c * delta_T - Heat energy absorbed/released.
    Source: Halliday Resnick, specific heat.
    """
    return mass_kg * specific_heat_J_kgK * temp_change_K


def latent_heat(mass_kg, latent_heat_J_kg):
    """Q = m * L - Heat energy during phase change."""
    return mass_kg * latent_heat_J_kg


def first_law_thermodynamics(heat_added_J, work_done_by_J):
    """delta_U = Q - W - First law of thermodynamics.
    Source: Halliday Resnick.
    """
    return heat_added_J - work_done_by_J


def ideal_gas_pressure(volume_m3, n_mol, temp_K, R=8.314):
    """P = n * R * T / V - Ideal gas law (pressure).
    Source: Halliday Resnick.
    """
    if volume_m3 <= 0:
        raise ValueError("Volume must be positive")
    return n_mol * R * temp_K / volume_m3


def ideal_gas_volume(pressure_Pa, n_mol, temp_K, R=8.314):
    """V = n * R * T / P - Ideal gas law (volume)."""
    if pressure_Pa <= 0:
        raise ValueError("Pressure must be positive")
    return n_mol * R * temp_K / pressure_Pa


def thermal_expansion_length(initial_length_m, alpha_1K, temp_change_K):
    """delta_L = L0 * alpha * delta_T - Linear thermal expansion."""
    return initial_length_m * alpha_1K * temp_change_K


def thermal_expansion_volume(initial_volume_m3, beta_1K, temp_change_K):
    """delta_V = V0 * beta * delta_T - Volumetric thermal expansion."""
    return initial_volume_m3 * beta_1K * temp_change_K


def heat_conduction(thermal_conductivity_W_mK, area_m2, temp_diff_K,
                    thickness_m):
    """P = k * A * delta_T / d - Heat conduction rate (Fourier's law).
    Source: Halliday Resnick.
    """
    if thickness_m <= 0:
        raise ValueError("Thickness must be positive")
    return thermal_conductivity_W_mK * area_m2 * temp_diff_K / thickness_m


def efficiency_heat_engine(work_output_J, heat_input_J):
    """eta = W / Q_h - Thermal efficiency of heat engine."""
    if heat_input_J <= 0:
        raise ValueError("Heat input must be positive")
    return work_output_J / heat_input_J


def carnot_efficiency(hot_temp_K, cold_temp_K):
    """eta_carnot = 1 - T_c / T_h - Maximum possible efficiency.
    Source: Halliday Resnick, Carnot cycle.
    """
    if hot_temp_K <= 0 or cold_temp_K <= 0:
        raise ValueError("Temperatures must be positive")
    return 1 - cold_temp_K / hot_temp_K
