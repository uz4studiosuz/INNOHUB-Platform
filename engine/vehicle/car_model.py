"""Car motion model: acceleration, velocity, position over time."""

import math


class Car:
    """Simple car model with mass, engine power, and friction."""

    def __init__(self, mass_kg=1000, engine_power_w=50000, drag_coefficient=0.3,
                 frontal_area_m2=2.2, rolling_resistance=0.015, air_density=1.225):
        if mass_kg <= 0:
            raise ValueError("Mass must be positive")
        self.mass = mass_kg
        self.engine_power = engine_power_w
        self.drag_coefficient = drag_coefficient
        self.frontal_area = frontal_area_m2
        self.rolling_resistance = rolling_resistance
        self.air_density = air_density
        self.position = 0.0
        self.velocity = 0.0

    def tractive_force(self, velocity):
        """F_tractive = P / v - Tractive force from engine power."""
        if velocity <= 0:
            return self.engine_power / 0.01
        return self.engine_power / velocity

    def drag_force(self, velocity):
        """F_drag = 0.5 * rho * v^2 * Cd * A."""
        return 0.5 * self.air_density * velocity ** 2 * self.drag_coefficient * self.frontal_area

    def rolling_friction_force(self):
        """F_rr = mu_r * m * g - Rolling resistance."""
        return self.rolling_resistance * self.mass * 9.81

    def net_acceleration(self, velocity):
        """a = F_net / m - Net acceleration at given velocity."""
        if velocity < 0:
            velocity = 0
        f_tractive = self.tractive_force(velocity)
        f_drag = self.drag_force(velocity)
        f_rr = self.rolling_friction_force()
        f_net = f_tractive - f_drag - f_rr
        return f_net / self.mass

    def update(self, dt):
        """Update car state by one time step using Euler integration."""
        if dt <= 0:
            raise ValueError("Time step must be positive")
        a = self.net_acceleration(self.velocity)
        self.velocity += a * dt
        if self.velocity < 0:
            self.velocity = 0
        self.position += self.velocity * dt

    def simulate(self, dt, steps):
        """Simulate car motion over multiple time steps. Returns history."""
        history = []
        for _ in range(steps):
            self.update(dt)
            history.append((self.position, self.velocity))
        return history

    def top_speed(self):
        """Estimate top speed by iterating until acceleration ~ 0."""
        v = 0.0
        for _ in range(10000):
            a = self.net_acceleration(v)
            if abs(a) < 0.001:
                break
            v += a * 0.1
        return v
