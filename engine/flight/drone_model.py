"""Quadcopter (drone) simplified dynamics model."""

import math


class Quadcopter:
    """Simple quadcopter model with 4 propellers for vertical and rotational motion."""

    def __init__(self, mass_kg=1.5, arm_length_m=0.2, thrust_coefficient=1e-5,
                 drag_coefficient=1e-6, max_rpm=10000):
        if mass_kg <= 0:
            raise ValueError("Mass must be positive")
        self.mass = mass_kg
        self.arm_length = arm_length_m
        self.thrust_coeff = thrust_coefficient
        self.drag_coeff = drag_coefficient
        self.max_rpm = max_rpm
        self.x = 0.0
        self.y = 0.0
        self.z = 0.0
        self.vx = 0.0
        self.vy = 0.0
        self.vz = 0.0
        self.roll = 0.0
        self.pitch = 0.0
        self.yaw = 0.0

    def thrust_from_rpm(self, rpm):
        """T = k_t * rpm^2 - Thrust from one propeller."""
        if rpm < 0:
            rpm = 0
        if rpm > self.max_rpm:
            rpm = self.max_rpm
        return self.thrust_coeff * rpm ** 2

    def total_thrust(self, rpms):
        """Sum of thrust from all 4 propellers."""
        return sum(self.thrust_from_rpm(rpm) for rpm in rpms)

    def hover_rpm(self):
        """Calculate RPM per motor needed to hover (thrust = weight)."""
        weight = self.mass * 9.81
        rpm_per_motor = math.sqrt(weight / (4 * self.thrust_coeff))
        return rpm_per_motor

    def vertical_acceleration(self, total_thrust):
        """a_z = (T_total - m*g) / m - Net vertical acceleration."""
        return (total_thrust - self.mass * 9.81) / self.mass

    def roll_torque(self, rpms):
        """Roll torque from differential thrust between left/right motors."""
        if len(rpms) < 4:
            raise ValueError("Need 4 RPM values")
        t_left = self.thrust_from_rpm(rpms[0]) + self.thrust_from_rpm(rpms[3])
        t_right = self.thrust_from_rpm(rpms[1]) + self.thrust_from_rpm(rpms[2])
        return (t_left - t_right) * self.arm_length

    def pitch_torque(self, rpms):
        """Pitch torque from differential thrust between front/back motors."""
        if len(rpms) < 4:
            raise ValueError("Need 4 RPM values")
        t_front = self.thrust_from_rpm(rpms[0]) + self.thrust_from_rpm(rpms[1])
        t_back = self.thrust_from_rpm(rpms[2]) + self.thrust_from_rpm(rpms[3])
        return (t_front - t_back) * self.arm_length

    def update(self, rpms, dt):
        """Update drone state given 4 motor RPMs and time step."""
        if dt <= 0:
            raise ValueError("Time step must be positive")
        t_total = self.total_thrust(rpms)
        a_z = self.vertical_acceleration(t_total)
        tau_roll = self.roll_torque(rpms)
        tau_pitch = self.pitch_torque(rpms)
        inertia = 0.5 * self.mass * self.arm_length ** 2
        alpha_roll = tau_roll / inertia if inertia > 0 else 0
        alpha_pitch = tau_pitch / inertia if inertia > 0 else 0
        self.vz += a_z * dt
        self.z += self.vz * dt
        if self.z < 0:
            self.z = 0
            self.vz = 0
        self.roll += alpha_roll * dt
        self.pitch += alpha_pitch * dt
        self.vx += self.pitch * 9.81 * dt
        self.vy += self.roll * 9.81 * dt
        self.x += self.vx * dt
        self.y += self.vy * dt

    # --- Extended propeller formulas ---
    # Source: Leishman, Principles of Helicopter Aerodynamics (momentum theory)

    def propeller_thrust(self, rpm, diameter_m, ct=0.1):
        """T = C_T * rho * n^2 * D^4 - Propeller thrust.
        n in rev/s, D in meters.
        """
        n = rpm / 60.0
        return ct * 1.225 * n ** 2 * diameter_m ** 4

    def propeller_torque(self, rpm, diameter_m, cq=0.015):
        """Q = C_Q * rho * n^2 * D^5 - Propeller torque.
        Source: Leishman, momentum theory.
        """
        n = rpm / 60.0
        return cq * 1.225 * n ** 2 * diameter_m ** 5

    def propeller_power(self, rpm, diameter_m, cp=0.05):
        """P = C_P * rho * n^3 * D^5 = 2*pi*n*Q - Required power.
        Source: Leishman.
        """
        n = rpm / 60.0
        return cp * 1.225 * n ** 3 * diameter_m ** 5

    def required_power_from_torque(self, rpm, torque):
        """P = 2*pi*n*Q - Power from torque and RPM."""
        n = rpm / 60.0
        return 2 * math.pi * n * torque

    def thrust_to_weight_ratio(self, rpm_per_motor, diameter_m, ct=0.1):
        """T/W ratio for hovering check (should be > 1, ideally 2:1)."""
        total_t = 4 * self.propeller_thrust(rpm_per_motor, diameter_m, ct)
        weight = self.mass * 9.81
        if weight == 0:
            return float("inf")
        return total_t / weight


class PIDController:
    """Simple PID controller for drone stabilization.

    u(t) = Kp * e(t) + Ki * integral(e(t)) dt + Kd * de(t)/dt
    """

    def __init__(self, kp=1.0, ki=0.0, kd=0.1, dt=0.01):
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.dt = dt
        self.integral = 0.0
        self.prev_error = 0.0

    def reset(self):
        self.integral = 0.0
        self.prev_error = 0.0

    def update(self, setpoint, measurement):
        """Compute PID output given setpoint and measurement."""
        error = setpoint - measurement
        self.integral += error * self.dt
        derivative = (error - self.prev_error) / self.dt if self.dt > 0 else 0
        self.prev_error = error
        return self.kp * error + self.ki * self.integral + self.kd * derivative


class AltitudeHoldPID:
    """Altitude hold controller using PID + feed-forward hover RPM."""

    def __init__(self, quadcopter, kp=2.0, ki=0.5, kd=0.3, dt=0.01):
        self.quad = quadcopter
        self.pid = PIDController(kp=kp, ki=ki, kd=kd, dt=dt)
        self.dt = dt

    def compute_rpms(self, target_z):
        """Compute 4 motor RPMs to maintain target altitude."""
        hover_rpm = self.quad.hover_rpm()
        correction = self.pid.update(target_z, self.quad.z)
        adjusted_rpm = hover_rpm + correction
        adjusted_rpm = max(0, min(adjusted_rpm, self.quad.max_rpm))
        return [adjusted_rpm, adjusted_rpm, adjusted_rpm, adjusted_rpm]
