"""Beam analysis: bending moment, stress, and deflection calculations.

Sources:
  - Hibbeler, Mechanics of Materials (beam bending, Euler buckling)
  - Beer & Johnston, Mechanics of Materials
"""

import math


def bending_moment(force_N, length_m):
    """M = F * L - Bending moment for a cantilever with end load (N·m).
    Source: Hibbeler, Mechanics of Materials.
    """
    return force_N * length_m


def bending_stress(moment_Nm, distance_from_neutral_m, moment_of_inertia_m4):
    """sigma = M * c / I - Bending stress (Pa).
    Source: Hibbeler, flexure formula.
    """
    if moment_of_inertia_m4 <= 0:
        raise ValueError("Moment of inertia must be positive")
    return moment_Nm * distance_from_neutral_m / moment_of_inertia_m4


def beam_deflection_simple_support(force_N, length_m, modulus_E_pa, moment_of_inertia_m4):
    """delta = F*L^3 / (48 * E * I) - Simply supported beam, center load.
    Source: Hibbeler, beam deflection tables.
    """
    if modulus_E_pa <= 0 or moment_of_inertia_m4 <= 0:
        raise ValueError("Modulus and moment of inertia must be positive")
    return force_N * length_m ** 3 / (48 * modulus_E_pa * moment_of_inertia_m4)


def beam_deflection_cantilever(force_N, length_m, modulus_E_pa, moment_of_inertia_m4):
    """delta = F*L^3 / (3 * E * I) - Cantilever beam, end load.
    Source: Hibbeler, beam deflection tables.
    """
    if modulus_E_pa <= 0 or moment_of_inertia_m4 <= 0:
        raise ValueError("Modulus and moment of inertia must be positive")
    return force_N * length_m ** 3 / (3 * modulus_E_pa * moment_of_inertia_m4)


def euler_buckling_load(modulus_E_pa, moment_of_inertia_m4, effective_length_m):
    """F_cr = pi^2 * E * I / L_eff^2 - Euler critical buckling load.
    Source: Hibbeler, Euler buckling formula.
    """
    if modulus_E_pa <= 0 or moment_of_inertia_m4 <= 0 or effective_length_m <= 0:
        raise ValueError("All parameters must be positive")
    return math.pi ** 2 * modulus_E_pa * moment_of_inertia_m4 / effective_length_m ** 2


def axial_stress(force_N, area_m2):
    """sigma = F / A - Axial stress (tension or compression) in Pa."""
    if area_m2 <= 0:
        raise ValueError("Area must be positive")
    return force_N / area_m2


def axial_strain(change_in_length_m, original_length_m):
    """epsilon = delta_L / L - Axial strain (dimensionless)."""
    if original_length_m <= 0:
        raise ValueError("Original length must be positive")
    return change_in_length_m / original_length_m


def youngs_modulus(stress_pa, strain):
    """E = sigma / epsilon - Young's modulus from stress-strain data."""
    if strain == 0:
        raise ValueError("Strain cannot be zero")
    return stress_pa / strain


def safety_factor(yield_stress_pa, actual_stress_pa):
    """SF = sigma_yield / |sigma_actual| - Factor of safety."""
    if actual_stress_pa == 0:
        return float("inf")
    return yield_stress_pa / abs(actual_stress_pa)


# Beam section properties (moment of inertia about neutral axis)

def rect_moment_of_inertia(width_m, height_m):
    """I = b * h^3 / 12 - Rectangle about centroidal axis.
    Source: Hibbeler, appendix.
    """
    if width_m <= 0 or height_m <= 0:
        raise ValueError("Dimensions must be positive")
    return width_m * height_m ** 3 / 12.0


def circle_moment_of_inertia(diameter_m):
    """I = pi * d^4 / 64 - Circle about centroidal axis."""
    if diameter_m <= 0:
        raise ValueError("Diameter must be positive")
    return math.pi * diameter_m ** 4 / 64.0


def pipe_moment_of_inertia(outer_diameter_m, inner_diameter_m):
    """I = pi * (D^4 - d^4) / 64 - Hollow pipe."""
    if outer_diameter_m <= 0 or inner_diameter_m <= 0:
        raise ValueError("Diameters must be positive")
    if inner_diameter_m >= outer_diameter_m:
        raise ValueError("Inner diameter must be less than outer diameter")
    return math.pi * (outer_diameter_m ** 4 - inner_diameter_m ** 4) / 64.0
