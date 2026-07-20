"""
Airfoil data and approximations for lift/drag coefficients.
Provides simple lookup tables and interpolation for common airfoil profiles.
"""


AIRFOIL_DATA = {
    "naca0012": {
        "name": "NACA 0012 (Symmetric)",
        "description": "Symmetric airfoil, good for tails and acrobatic aircraft",
        "cl_alpha_slope": 0.11,
        "cd_min": 0.006,
        "cl_max": 1.2,
        "stall_angle_deg": 16,
    },
    "naca2412": {
        "name": "NACA 2412 (Semi-symmetric)",
        "description": "Cambered airfoil, common in general aviation (Cessna 172)",
        "cl_alpha_slope": 0.105,
        "cd_min": 0.007,
        "cl_max": 1.4,
        "stall_angle_deg": 15,
    },
    "clark_y": {
        "name": "Clark Y (Flat bottom)",
        "description": "Flat bottom airfoil, high lift, used in early aircraft and RC models",
        "cl_alpha_slope": 0.1,
        "cd_min": 0.008,
        "cl_max": 1.5,
        "stall_angle_deg": 14,
    },
    "naca4412": {
        "name": "NACA 4412 (High camber)",
        "description": "Highly cambered airfoil for high lift applications",
        "cl_alpha_slope": 0.108,
        "cd_min": 0.008,
        "cl_max": 1.6,
        "stall_angle_deg": 13,
    },
}


def get_airfoil(airfoil_id):
    """Get airfoil data by ID. Returns None if not found."""
    return AIRFOIL_DATA.get(airfoil_id)


def list_airfoils():
    """Return list of available airfoil IDs."""
    return list(AIRFOIL_DATA.keys())


def estimate_cl(airfoil_id, angle_of_attack_deg):
    """
    Estimate lift coefficient at a given angle of attack.
    Uses linear approximation: Cl = Cl_alpha_slope * alpha (per degree).
    Above stall angle, returns Cl_max.
    Source: Anderson, Fundamentals of Aerodynamics, Thin airfoil theory.
    """
    data = get_airfoil(airfoil_id)
    if data is None:
        raise ValueError(f"Unknown airfoil: {airfoil_id}")
    if angle_of_attack_deg < data["stall_angle_deg"]:
        return data["cl_alpha_slope"] * angle_of_attack_deg
    return data["cl_max"]


def estimate_cd(airfoil_id, cl):
    """
    Estimate drag coefficient from lift coefficient.
    Simplified parabolic drag polar: Cd = Cd_min + k * Cl^2.
    """
    data = get_airfoil(airfoil_id)
    if data is None:
        raise ValueError(f"Unknown airfoil: {airfoil_id}")
    k = 0.04
    return data["cd_min"] + k * cl ** 2
