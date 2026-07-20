"""Aircraft stability calculations: center of gravity, neutral point, stability margin."""


def stability_margin(cg_position, neutral_point, mean_aerodynamic_chord):
    """
    SM = (NP - CG) / MAC - Static stability margin.
    Positive margin = stable, Negative margin = unstable.
    Typical stable aircraft: SM >= 0.05 (5%).
    """
    if mean_aerodynamic_chord <= 0:
        raise ValueError("Mean aerodynamic chord must be positive")
    return (neutral_point - cg_position) / mean_aerodynamic_chord


def is_stable(stability_margin, min_margin=0.05):
    """Check if aircraft is stable (stability margin >= minimum)."""
    return stability_margin >= min_margin


def neutral_point(wing_lift_slope, wing_area, tail_lift_slope, tail_area,
                  tail_arm, wing_mac):
    """
    NP = (wing_ac_pos * wing_contribution + tail_ac_pos * tail_contribution)
        / (wing_contribution + tail_contribution)
    Simplified neutral point calculation for conventional aircraft.
    """
    if wing_area <= 0 or wing_mac <= 0:
        raise ValueError("Wing area and MAC must be positive")
    wing_contribution = wing_lift_slope * wing_area
    tail_contribution = tail_lift_slope * tail_area * tail_arm / wing_mac
    if wing_contribution + tail_contribution == 0:
        raise ValueError("Total lift contribution cannot be zero")
    wing_ac = 0.25 * wing_mac
    tail_ac = wing_ac + tail_arm
    return (wing_ac * wing_contribution + tail_ac * tail_contribution) / (
        wing_contribution + tail_contribution
    )


def required_tail_area(cg_pos, neutral_point_target, wing_area, tail_arm, wing_mac):
    """
    Calculate required tail area to achieve a target neutral point.
    """
    if tail_arm <= 0:
        raise ValueError("Tail arm must be positive")
    if wing_area <= 0 or wing_mac <= 0:
        raise ValueError("Wing area and MAC must be positive")
    required_np_shift = neutral_point_target - cg_pos
    if required_np_shift <= 0:
        return 0.0
    return required_np_shift * wing_area * wing_mac / tail_arm
