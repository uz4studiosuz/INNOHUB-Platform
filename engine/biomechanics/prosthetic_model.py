"""Prosthetic limb model: joint torque, actuator sizing, material selection.

Sources:
  - Winter, Biomechanics and Motor Control of Human Movement
  - Norton, Design of Machinery (linkage analysis)
"""

import math

# Material database: {name: (E_modulus_GPa, density_kg_m3, yield_stress_MPa)}
MATERIALS = {
    "aluminum_6061": (68.9, 2700, 276),
    "carbon_fiber": (230, 1600, 3500),
    "steel_304": (193, 8000, 215),
    "titanium_ti6al4v": (114, 4430, 880),
    "plastic_abs": (2.3, 1040, 40),
    "nylon_12": (1.6, 1020, 45),
}


def get_material(name):
    """Get material properties by name."""
    return MATERIALS.get(name)


def list_materials():
    """List available material names."""
    return list(MATERIALS.keys())


def joint_torque(limb_mass_kg, limb_length_m, angle_deg_from_horizontal=0):
    """tau = m * g * L * cos(theta) - Torque at joint due to limb weight.
    Source: Winter, Biomechanics, joint moment calculations.
    """
    return limb_mass_kg * 9.81 * limb_length_m * math.cos(math.radians(angle_deg_from_horizontal))


def actuator_required_torque(load_force_N, moment_arm_m):
    """tau = F * d - Torque required from actuator.
    Source: Norton, Design of Machinery, static force analysis.
    """
    return load_force_N * moment_arm_m


def mechanical_advantage(input_arm_m, output_arm_m):
    """MA = d_input / d_output - Mechanical advantage of lever system."""
    if output_arm_m <= 0:
        raise ValueError("Output arm must be positive")
    return input_arm_m / output_arm_m


def stress_in_material(force_N, cross_section_area_m2):
    """sigma = F / A - Engineering stress (Pa)."""
    if cross_section_area_m2 <= 0:
        raise ValueError("Cross section area must be positive")
    return force_N / cross_section_area_m2


def strain(change_in_length_m, original_length_m):
    """epsilon = delta_L / L - Engineering strain."""
    if original_length_m <= 0:
        raise ValueError("Original length must be positive")
    return change_in_length_m / original_length_m


def youngs_modulus_from_name(material_name):
    """Get Young's modulus in Pa from material database."""
    mat = get_material(material_name)
    if mat is None:
        raise ValueError(f"Unknown material: {material_name}")
    return mat[0] * 1e9


def material_safety_factor(material_name, applied_stress_pa):
    """SF = sigma_yield / sigma_actual - Factor of safety for a material."""
    mat = get_material(material_name)
    if mat is None:
        raise ValueError(f"Unknown material: {material_name}")
    yield_stress_pa = mat[2] * 1e6
    if applied_stress_pa == 0:
        return float("inf")
    return yield_stress_pa / abs(applied_stress_pa)


def prosthetic_hand_grip_force(actuator_force_N, linkage_ratio=0.5):
    """F_grip = F_actuator * MA - Estimated grip force from actuator.
    Simplified four-bar linkage model.
    """
    return actuator_force_N * linkage_ratio


def battery_life(capacity_Ah, current_draw_A):
    """t = capacity / draw - Estimated battery life in hours."""
    if current_draw_A <= 0:
        raise ValueError("Current draw must be positive")
    return capacity_Ah / current_draw_A
