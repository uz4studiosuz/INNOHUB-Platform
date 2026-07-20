"""Gear mechanics: gear ratio, rotational speed, torque calculations."""

import math


def gear_ratio(driven_teeth, driver_teeth):
    """GR = N_driven / N_driver - Gear ratio."""
    if driver_teeth <= 0:
        raise ValueError("Driver teeth must be positive")
    return driven_teeth / driver_teeth


def rotational_speed(input_rpm, gear_ratio):
    """omega_out = omega_in / GR - Output rotational speed."""
    if gear_ratio <= 0:
        raise ValueError("Gear ratio must be positive")
    return input_rpm / gear_ratio


def torque(torque_input, gear_ratio):
    """tau_out = tau_in * GR - Output torque."""
    return torque_input * gear_ratio


def linear_speed_from_rotation(angular_velocity_rad_s, radius_m):
    """v = omega * r - Linear speed at wheel/gear rim."""
    return angular_velocity_rad_s * radius_m


def rotational_speed_to_angular(rotational_speed_rpm):
    """omega = RPM * 2*pi / 60 - Convert RPM to rad/s."""
    return rotational_speed_rpm * 2 * math.pi / 60.0


def angular_to_rotational_speed(angular_velocity_rad_s):
    """RPM = omega * 60 / (2*pi) - Convert rad/s to RPM."""
    return angular_velocity_rad_s * 60.0 / (2 * math.pi)
