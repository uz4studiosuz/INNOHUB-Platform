"""Rover (ground vehicle) model with tractive force, rolling resistance, and gradeability.

Sources:
  - Wong, Theory of Ground Vehicles (tractive force, rolling resistance)
  - Basic mechanics: Newton's laws, gear ratios
"""

import math


class Rover:
    """Rover model with motor, gearing, and wheel dynamics."""

    def __init__(self, mass_kg=10.0, wheel_radius_m=0.1, motor_torque_Nm=0.5,
                 gear_ratio=10, efficiency=0.85, rolling_resistance_coeff=0.02,
                 friction_coeff=0.6, drag_coeff=0.3, frontal_area_m2=0.05):
        if mass_kg <= 0:
            raise ValueError("Mass must be positive")
        self.mass = mass_kg
        self.wheel_radius = wheel_radius_m
        self.motor_torque = motor_torque_Nm
        self.gear_ratio = gear_ratio
        self.efficiency = efficiency
        self.crr = rolling_resistance_coeff
        self.mu = friction_coeff
        self.cd = drag_coeff
        self.frontal_area = frontal_area_m2

        # State
        self.x = 0.0
        self.v = 0.0
        self.distance = 0.0

    def tractive_force(self):
        """F = tau_motor * GR * eta / r_wheel - Tractive force at wheels.
        Source: Wong, Theory of Ground Vehicles, Ch.2.
        """
        if self.wheel_radius <= 0:
            return 0.0
        return self.motor_torque * self.gear_ratio * self.efficiency / self.wheel_radius

    def rolling_resistance(self, incline_deg=0):
        """F_rr = C_rr * m * g * cos(theta) - Rolling resistance.
        Source: Wong, Ch.3.
        """
        return self.crr * self.mass * 9.81 * math.cos(math.radians(incline_deg))

    def grade_resistance(self, incline_deg):
        """F_grade = m * g * sin(theta) - Grade resistance (hill climb)."""
        return self.mass * 9.81 * math.sin(math.radians(incline_deg))

    def drag_force(self, velocity):
        """F_drag = 0.5 * rho * v^2 * Cd * A - Aerodynamic drag."""
        return 0.5 * 1.225 * velocity ** 2 * self.cd * self.frontal_area

    def max_grade_angle(self):
        """theta_max = arctan(mu) - Maximum climbable grade (friction limited).
        Source: Wong, Ch.4.
        """
        return math.degrees(math.atan(self.mu))

    def acceleration(self, velocity=0, incline_deg=0):
        """a = (F_tractive - F_resist) / m - Net acceleration."""
        F_t = self.tractive_force()
        F_rr = self.rolling_resistance(incline_deg)
        F_gr = self.grade_resistance(incline_deg) if incline_deg > 0 else 0
        F_d = self.drag_force(velocity)
        F_net = F_t - F_rr - F_gr - F_d
        return F_net / self.mass

    def power_required(self, velocity, incline_deg=0):
        """P = F_total * v - Power needed to maintain speed."""
        F_t = self.tractive_force()
        F_rr = self.rolling_resistance(incline_deg)
        F_gr = self.grade_resistance(incline_deg) if incline_deg > 0 else 0
        F_d = self.drag_force(velocity)
        F_total = F_t - F_rr - F_gr - F_d
        return max(0, F_total * velocity)

    def energy_consumption(self, velocity, time_s, incline_deg=0):
        """E = P * t - Energy consumed in Joules."""
        return self.power_required(velocity, incline_deg) * time_s

    def update(self, dt, incline_deg=0):
        """Update rover state."""
        if dt <= 0:
            raise ValueError("Time step must be positive")
        a = self.acceleration(self.v, incline_deg)
        self.v += a * dt
        if self.v < 0:
            self.v = 0
        self.x += self.v * dt
        self.distance += abs(self.v) * dt

    def simulate(self, dt=0.1, max_time=30.0, incline_deg=0):
        """Simulate rover motion over time."""
        if dt <= 0 or max_time <= 0:
            raise ValueError("dt and max_time must be positive")

        self.x = 0.0
        self.v = 0.0
        self.distance = 0.0

        n_steps = int(max_time / dt)
        trajectory = []
        for step in range(n_steps):
            self.update(dt, incline_deg)
            if step % max(1, n_steps // 100) == 0:
                a = self.acceleration(self.v, incline_deg)
                trajectory.append({
                    "t": step * dt,
                    "x": self.x,
                    "v": self.v,
                    "a": a,
                    "distance": self.distance,
                })

        last = trajectory[-1] if trajectory else {"t": 0, "x": 0, "v": 0}
        return {
            "trajectory": trajectory,
            "final_distance_m": self.distance,
            "final_velocity_ms": self.v,
            "max_grade_deg": self.max_grade_angle(),
            "tractive_force_N": self.tractive_force(),
            "top_speed_ms": self.v,
        }
