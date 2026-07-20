"""Physics Lab: Waves and oscillations experiments.

Sources: Halliday Resnick - Fundamentals of Physics.
"""

import math


def wave_speed(frequency_hz, wavelength_m):
    """v = lambda * f - Wave speed from frequency and wavelength."""
    return frequency_hz * wavelength_m


def wave_frequency(wavelength_m, speed_ms):
    """f = v / lambda - Frequency from wave speed and wavelength."""
    if wavelength_m <= 0:
        raise ValueError("Wavelength must be positive")
    return speed_ms / wavelength_m


def wavelength_from_freq(speed_ms, frequency_hz):
    """lambda = v / f - Wavelength."""
    if frequency_hz <= 0:
        raise ValueError("Frequency must be positive")
    return speed_ms / frequency_hz


def simple_pendulum(length_m, g=9.81):
    """T = 2*pi*sqrt(L/g) - Pendulum period, small angle approximation."""
    if length_m <= 0 or g <= 0:
        raise ValueError("Length and gravity must be positive")
    period = 2 * math.pi * math.sqrt(length_m / g)
    return {
        "period_s": period,
        "frequency_hz": 1.0 / period if period > 0 else float("inf"),
        "angular_frequency_rad_s": math.sqrt(g / length_m),
    }


def spring_mass_system(mass_kg, k_Nm):
    """Mass-spring system analysis."""
    if mass_kg <= 0 or k_Nm <= 0:
        raise ValueError("Mass and spring constant must be positive")
    omega = math.sqrt(k_Nm / mass_kg)
    period = 2 * math.pi / omega
    return {
        "angular_frequency_rad_s": omega,
        "period_s": period,
        "frequency_hz": 1.0 / period if period > 0 else float("inf"),
    }


def harmonic_position(amplitude_m, angular_freq_rad_s, time_s, phase_rad=0):
    """x(t) = A * cos(omega*t + phi) - Position in SHM."""
    return amplitude_m * math.cos(angular_freq_rad_s * time_s + phase_rad)


def harmonic_velocity(amplitude_m, angular_freq_rad_s, time_s, phase_rad=0):
    """v(t) = -A*omega * sin(omega*t + phi) - Velocity in SHM."""
    return -amplitude_m * angular_freq_rad_s * math.sin(angular_freq_rad_s * time_s + phase_rad)


def harmonic_acceleration(amplitude_m, angular_freq_rad_s, time_s, phase_rad=0):
    """a(t) = -A*omega^2 * cos(omega*t + phi) - Acceleration in SHM."""
    return -amplitude_m * angular_freq_rad_s ** 2 * math.cos(angular_freq_rad_s * time_s + phase_rad)


def sound_intensity(power_W, distance_m):
    """I = P / (4*pi*r^2) - Sound intensity at distance from point source."""
    if distance_m <= 0:
        raise ValueError("Distance must be positive")
    return power_W / (4 * math.pi * distance_m ** 2)


def doppler_effect(source_freq_hz, source_speed_ms, observer_speed_ms=0,
                   sound_speed_ms=343, source_approaching=True):
    """f' = f * (v +/- v_o) / (v -/+ v_s) - Doppler effect.
    Source: Halliday Resnick.
    """
    if source_approaching:
        return source_freq_hz * (sound_speed_ms + observer_speed_ms) / (sound_speed_ms - source_speed_ms)
    else:
        return source_freq_hz * (sound_speed_ms + observer_speed_ms) / (sound_speed_ms + source_speed_ms)


def resonance_frequency_organ_pipe(length_m, harmonic_n=1, closed_end=True, speed_sound_ms=343):
    """Resonant frequencies for open/closed pipes.
    closed_end=True: f_n = n*v/(4*L), n=1,3,5...
    closed_end=False: f_n = n*v/(2*L), n=1,2,3...
    Source: Halliday Resnick.
    """
    if length_m <= 0 or harmonic_n <= 0:
        raise ValueError("Length and harmonic must be positive")
    if closed_end:
        if harmonic_n % 2 == 0:
            raise ValueError("Closed pipe only supports odd harmonics")
        return harmonic_n * speed_sound_ms / (4 * length_m)
    return harmonic_n * speed_sound_ms / (2 * length_m)
