"""Flight stability checks for aircraft configurations."""


def check_longitudinal_stability(cg_position_percent_mac, neutral_point_percent_mac,
                                 min_static_margin=0.05):
    """
    Check if aircraft has positive longitudinal stability.
    CG must be ahead of neutral point.
    """
    sm = neutral_point_percent_mac - cg_position_percent_mac
    return sm >= min_static_margin, sm


def check_lateral_stability(dihedral_angle_deg):
    """Check if dihedral angle provides positive lateral (roll) stability."""
    return dihedral_angle_deg >= 2.0


def check_directional_stability(vertical_tail_area, vertical_tail_arm,
                                 wing_area, wing_span):
    """
    Simplified directional stability check using vertical tail volume coefficient.
    V_v = (S_vt * L_vt) / (S_w * b_w)
    Typical stable value: V_v >= 0.04
    """
    if wing_area <= 0 or wing_span <= 0:
        raise ValueError("Wing area and span must be positive")
    vv = (vertical_tail_area * vertical_tail_arm) / (wing_area * wing_span)
    return vv >= 0.04, vv


def check_weight_and_power(mass_kg, wing_area_m2, engine_power_w,
                            max_power_to_weight=100, min_wing_loading=10):
    """
    Check if aircraft has sufficient power and reasonable wing loading.
    Power-to-weight ratio: P/W (W/kg)
    Wing loading: W/S (kg/m^2)
    """
    if mass_kg <= 0 or wing_area_m2 <= 0:
        raise ValueError("Mass and wing area must be positive")
    pw = engine_power_w / (mass_kg * 9.81)
    wl = mass_kg / wing_area_m2
    checks = {
        "power_to_weight_adequate": pw >= max_power_to_weight / 100,
        "wing_loading_reasonable": wl >= min_wing_loading,
    }
    return checks, pw, wl


def overall_readiness(cg_percent, neutral_point_percent, dihedral_angle_deg,
                       vtail_area, vtail_arm, wing_area, wing_span,
                       mass, wing_area_m2, engine_power_w):
    """Run all stability checks and return a summary."""
    long_ok, sm = check_longitudinal_stability(cg_percent, neutral_point_percent)
    lat_ok = check_lateral_stability(dihedral_angle_deg)
    dir_ok, vv = check_directional_stability(vtail_area, vtail_arm, wing_area, wing_span)
    pw_checks, pw, wl = check_weight_and_power(mass, wing_area_m2, engine_power_w)
    passed = long_ok and lat_ok and dir_ok and pw_checks["power_to_weight_adequate"]
    return {
        "passed": passed,
        "static_margin": sm,
        "dihedral_ok": lat_ok,
        "vertical_tail_volume": vv,
        "power_to_weight": pw,
        "wing_loading": wl,
        "details": pw_checks,
    }
