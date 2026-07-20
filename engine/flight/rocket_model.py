"""Rocket flight model using Tsiolkovsky rocket equation and Euler integration.

Sources:
  - Sutton, Rocket Propulsion Elements (Tsiolkovsky equation, thrust)
  - Barrowman method for CP calculation (simplified)
"""

import math

G0 = 9.81
AIR_DENSITY = 1.225


class Rocket:
    """Rocket model with thrust, drag, and gravity simulation."""

    def __init__(self, dry_mass_kg=1.0, propellant_mass_kg=0.5,
                 burn_time_s=2.0, thrust_N=50.0, isp_s=100.0,
                 body_diameter_m=0.05, body_length_m=0.5,
                 fin_count=3, fin_root_chord_m=0.04, fin_tip_chord_m=0.02,
                 fin_span_m=0.03, cd=0.4):
        if dry_mass_kg <= 0:
            raise ValueError("Dry mass must be positive")
        if propellant_mass_kg < 0:
            raise ValueError("Propellant mass cannot be negative")
        if burn_time_s <= 0:
            raise ValueError("Burn time must be positive")

        self.dry_mass = dry_mass_kg
        self.propellant_mass = propellant_mass_kg
        self.total_mass = dry_mass_kg + propellant_mass_kg
        self.burn_time = burn_time_s
        self.thrust = thrust_N
        self.isp = isp_s
        self.cd = cd

        # Geometry
        self.body_diameter = body_diameter_m
        self.body_length = body_length_m
        self.fin_count = fin_count
        self.fin_root_chord = fin_root_chord_m
        self.fin_tip_chord = fin_tip_chord_m
        self.fin_span = fin_span_m

        # Derived
        self.body_radius = body_diameter_m / 2.0
        self.reference_area = math.pi * self.body_radius ** 2
        self.mass_flow = propellant_mass_kg / burn_time_s if burn_time_s > 0 else 0

        # Exhaust velocity from specific impulse
        # v_e = I_sp * g0  (Sutton, Rocket Propulsion Elements)
        self.exhaust_velocity = isp_s * G0

        # State
        self.x = 0.0
        self.y = 0.0
        self.vx = 0.0
        self.vy = 0.0

    def current_mass(self, t):
        """Current mass at time t during burn."""
        if t >= self.burn_time:
            return self.dry_mass
        return self.total_mass - self.mass_flow * t

    def delta_v_ideal(self):
        """Δv = I_sp * g0 * ln(m0/mf) - Tsiolkovsky rocket equation.
        Source: Sutton, Rocket Propulsion Elements, Ch.3.
        """
        ratio = self.total_mass / self.dry_mass
        if ratio <= 0:
            return 0.0
        return self.isp * G0 * math.log(ratio)

    def thrust_force(self, t):
        """F = ṁ * v_e - Thrust during burn, 0 after burnout.
        Source: Sutton, Rocket Propulsion Elements, Thrust equation.
        """
        if t < self.burn_time and self.propellant_mass > 0:
            return self.thrust
        return 0.0

    def drag_force(self, velocity):
        """D = 0.5 * rho * v^2 * A * Cd - Aerodynamic drag.
        Source: Anderson, Fundamentals of Aerodynamics, Drag equation.
        """
        return 0.5 * AIR_DENSITY * velocity ** 2 * self.reference_area * self.cd

    def cross_section_area(self):
        """A = π * r² - Frontal cross section area."""
        return self.reference_area

    def center_of_pressure(self):
        """CP position from nose tip (simplified Barrowman method).
        Source: Barrowman, Calculating the Center of Pressure.
        For a simple rocket: CP ≈ 0.5 * body_length + fin contribution.
        """
        body_cp = 0.5 * self.body_length
        if self.fin_count == 0 or self.fin_span == 0:
            return body_cp

        fin_area = self.fin_count * (self.fin_root_chord + self.fin_tip_chord) / 2.0 * self.fin_span
        fin_cp_offset = self.body_length
        cp = (body_cp * self.reference_area * self.body_length +
              fin_cp_offset * fin_area * self.fin_span) / \
             (self.reference_area * self.body_length + fin_area * self.fin_span)
        return cp

    def center_of_gravity(self, t=0):
        """CG position from nose tip (time-dependent as propellant burns)."""
        if self.total_mass == 0:
            return 0.0
        cg_dry = 0.55 * self.body_length
        cg_prop = 0.4 * self.body_length
        dry_frac = self.dry_mass / self.total_mass
        prop_frac = self.propellant_mass / self.total_mass
        remaining = self.current_mass(t)
        if remaining <= 0:
            return cg_dry
        m_dry = self.dry_mass
        m_prop = remaining - m_dry
        if m_prop < 0:
            m_prop = 0
        return (m_dry * cg_dry + m_prop * cg_prop) / remaining

    def static_margin(self, t=0):
        """SM = (CP - CG) / d - Static stability margin in calibers.
        Positive means stable. Recommended: 1-2 calibers.
        Source: Barrowman method.
        """
        if self.body_diameter == 0:
            return 0.0
        return (self.center_of_pressure() - self.center_of_gravity(t)) / self.body_diameter

    def is_stable(self, t=0, min_margin=1.0, max_margin=3.0):
        """Check stability: 1-2 calibers is ideal range."""
        sm = self.static_margin(t)
        return min_margin <= sm <= max_margin

    def max_height_no_drag(self):
        """h_max = v0² / (2*g) - Max altitude with no drag (simplified).
        Source: Basic kinematics (Halliday Resnick).
        """
        dv = self.delta_v_ideal()
        if dv <= 0:
            return 0.0
        return dv ** 2 / (2 * G0)

    def update(self, t, dt):
        """Update rocket state using Euler integration."""
        if dt <= 0:
            raise ValueError("Time step must be positive")
        v = math.sqrt(self.vx ** 2 + self.vy ** 2)

        F_thrust = self.thrust_force(t)
        F_drag = self.drag_force(v)
        F_gravity = self.current_mass(t) * G0

        if v > 0:
            flight_angle = math.atan2(self.vy, self.vx)
            thrust_x = F_thrust * math.cos(flight_angle)
            thrust_y = F_thrust * math.sin(flight_angle)
            drag_x = -F_drag * math.cos(flight_angle)
            drag_y = -F_drag * math.sin(flight_angle)
        else:
            # When at rest, thrust acts along current velocity direction
            # Default: straight up (positive y)
            thrust_x = 0.0
            thrust_y = F_thrust
            drag_x = 0.0
            drag_y = 0.0

        mass = self.current_mass(t)
        if mass <= 0:
            mass = self.dry_mass

        ax = (thrust_x + drag_x) / mass
        ay = (thrust_y + drag_y - F_gravity) / mass

        self.vx += ax * dt
        self.vy += ay * dt
        self.x += self.vx * dt
        self.y += self.vy * dt

    def simulate(self, dt=0.01, max_time=60.0, ground_y=0.0):
        """Simulate full rocket trajectory.

        Returns dict with trajectory and metrics.
        """
        if dt <= 0:
            raise ValueError("Time step must be positive")
        if max_time <= 0:
            raise ValueError("Max time must be positive")

        self.x = 0.0
        self.y = 0.0

        n_steps = int(max_time / dt)
        trajectory = []
        apogee = 0.0

        for step in range(n_steps):
            t = step * dt
            self.update(t, dt)
            v = math.sqrt(self.vx ** 2 + self.vy ** 2)

            if self.y > apogee:
                apogee = self.y

            trajectory.append({
                "t": t,
                "x": self.x,
                "y": self.y,
                "vx": self.vx,
                "vy": self.vy,
                "v": v,
                "mass": self.current_mass(t),
                "thrust": self.thrust_force(t),
                "burning": t < self.burn_time,
            })

            if self.y <= ground_y and t > self.burn_time * 0.5:
                self.y = ground_y
                if self.vy < 0:
                    self.vy = 0
                break

        last = trajectory[-1]
        return {
            "trajectory": trajectory,
            "flight_time_s": last["t"],
            "range_m": last["x"],
            "apogee_m": apogee,
            "landing_velocity_ms": last["v"],
            "delta_v_ideal_ms": self.delta_v_ideal(),
            "stability_margin_calibers": self.static_margin(t=0),
            "max_mach": max(p["v"] / 340.0 for p in trajectory) if trajectory else 0,
        }
