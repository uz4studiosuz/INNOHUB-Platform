"""Glider (glider) flight model - extended trajectory simulation.

Sources:
  - Anderson, Fundamentals of Aerodynamics, Lift/Drag equations
  - Prandtl lifting-line theory (induced drag)
  - Raymer, Aircraft Design (wing loading, stability)
"""

import math

# Air viscosity at sea level (Pa·s)
# Source: Anderson, Fundamentals of Aerodynamics, Table 1.1
AIR_VISCOSITY = 1.81e-5


class Glider:
    """Simple glider model with lift, drag, and gravity (backward compatible)."""

    def __init__(self, mass_kg=1.0, wing_area_m2=0.3, lift_coefficient=0.5,
                 drag_coefficient=0.05, air_density=1.225):
        if mass_kg <= 0:
            raise ValueError("Mass must be positive")
        if wing_area_m2 <= 0:
            raise ValueError("Wing area must be positive")
        self.mass = mass_kg
        self.wing_area = wing_area_m2
        self.cl = lift_coefficient
        self.cd = drag_coefficient
        self.air_density = air_density
        self.x = 0.0
        self.y = 0.0
        self.vx = 0.0
        self.vy = 0.0

    def lift_force(self, velocity):
        """L = 0.5 * rho * v^2 * S * Cl"""
        return 0.5 * self.air_density * velocity ** 2 * self.wing_area * self.cl

    def drag_force(self, velocity):
        """D = 0.5 * rho * v^2 * S * Cd"""
        return 0.5 * self.air_density * velocity ** 2 * self.wing_area * self.cd

    def glide_ratio(self):
        """L/D ratio - horizontal distance per unit altitude loss."""
        if self.cd == 0:
            return float("inf")
        return self.cl / self.cd

    def sink_rate(self, velocity, glide_angle_deg):
        """Vertical velocity component during gliding."""
        return velocity * math.sin(math.radians(glide_angle_deg))

    def equilibrium_glide_speed(self):
        """
        Approximate equilibrium glide speed where lift = weight.
        v = sqrt(2 * m * g / (rho * S * Cl))
        """
        return math.sqrt(
            2 * self.mass * 9.81 / (self.air_density * self.wing_area * self.cl)
        )

    def update(self, dt):
        """Update glider state using Euler integration."""
        if dt <= 0:
            raise ValueError("Time step must be positive")
        v = math.sqrt(self.vx ** 2 + self.vy ** 2)
        if v > 0:
            L = self.lift_force(v)
            D = self.drag_force(v)
            glide_angle = math.atan2(self.vy, self.vx)
            lift_x = -L * math.sin(glide_angle)
            lift_y = L * math.cos(glide_angle)
            drag_x = -D * math.cos(glide_angle)
            drag_y = -D * math.sin(glide_angle)
            ax = (lift_x + drag_x) / self.mass
            ay = (lift_y + drag_y - self.mass * 9.81) / self.mass
        else:
            ax, ay = 0, -9.81
        self.vx += ax * dt
        self.vy += ay * dt
        self.x += self.vx * dt
        self.y += self.vy * dt

    def simulate(self, dt, steps):
        """Simulate glider flight. Returns list of (x, y) positions."""
        history = []
        for _ in range(steps):
            self.update(dt)
            history.append((self.x, self.y))
        return history


class GliderModel:
    """Extended glider model with full aerodynamic calculations.

    Supports airfoil profiles, aspect ratio, induced drag,
    Reynolds number, static margin, and 2D trajectory simulation.

    Source: Anderson, Fundamentals of Aerodynamics;
            Raymer, Aircraft Design;
            Prandtl lifting-line theory.
    """

    def __init__(self, mass_kg=1.0, wing_span_m=1.0, chord_m=0.15,
                 airfoil_id="naca2412", angle_of_attack_deg=5,
                 oswald_efficiency=0.8, air_density=1.225,
                 cg_position_m=None, neutral_point_m=None):
        if mass_kg <= 0:
            raise ValueError("Mass must be positive")
        if wing_span_m <= 0:
            raise ValueError("Wing span must be positive")
        if chord_m <= 0:
            raise ValueError("Chord must be positive")

        self.mass = mass_kg
        self.span = wing_span_m
        self.chord = chord_m
        self.airfoil_id = airfoil_id
        self.alpha_deg = angle_of_attack_deg
        self.oswald_efficiency = oswald_efficiency
        self.air_density = air_density
        self.cg_position = cg_position_m if cg_position_m is not None else 0.3 * chord_m
        self.neutral_point = neutral_point_m if neutral_point_m is not None else 0.5 * chord_m

        # State variables
        self.x = 0.0
        self.y = 0.0
        self.vx = 0.0
        self.vy = 0.0

    def wing_area(self):
        """S = b * c  (rectangular wing approximation)."""
        return self.span * self.chord

    def aspect_ratio(self):
        """AR = b^2 / S - Wing aspect ratio.
        Source: Anderson, Fundamentals of Aerodynamics, Ch.5.
        """
        S = self.wing_area()
        if S == 0:
            return 0.0
        return self.span ** 2 / S

    def _load_airfoil(self):
        """Load airfoil data, returning (cl, cd0) or defaults."""
        try:
            from aerodynamics.airfoil import estimate_cl, estimate_cd
            cl = estimate_cl(self.airfoil_id, self.alpha_deg)
            cd0 = estimate_cd(self.airfoil_id, cl) - 0.04 * cl ** 2
            if cd0 < 0:
                cd0 = 0.006
            return cl, cd0
        except (ImportError, ValueError):
            # Default approximations if airfoil module unavailable
            cl = 0.105 * self.alpha_deg * (180 / math.pi)
            if cl > 1.4:
                cl = 1.4
            cd0 = 0.007 + 0.04 * cl ** 2
            return cl, cd0

    def lift_coefficient(self):
        """C_L - Lift coefficient from airfoil at current angle of attack."""
        cl, _ = self._load_airfoil()
        return cl

    def induced_drag_coefficient(self):
        """C_Di = C_L^2 / (pi * e * AR) - Induced drag coefficient.
        Source: Prandtl lifting-line theory.
        """
        cl = self.lift_coefficient()
        AR = self.aspect_ratio()
        if AR == 0 or self.oswald_efficiency == 0:
            return 0.0
        return cl ** 2 / (math.pi * self.oswald_efficiency * AR)

    def zero_lift_drag_coefficient(self):
        """C_D0 - Profile drag at zero lift."""
        _, cd0 = self._load_airfoil()
        return cd0

    def drag_coefficient(self):
        """C_D = C_D0 + C_Di - Total drag coefficient.
        Source: Anderson, Fundamentals of Aerodynamics, Drag polar.
        """
        return self.zero_lift_drag_coefficient() + self.induced_drag_coefficient()

    def lift_force(self, velocity):
        """L = 0.5 * rho * v^2 * S * C_L - Lift force in Newtons.
        Source: Anderson, Lift equation.
        """
        return 0.5 * self.air_density * velocity ** 2 * self.wing_area() * self.lift_coefficient()

    def drag_force(self, velocity):
        """D = 0.5 * rho * v^2 * S * C_D - Drag force in Newtons.
        Source: Anderson, Drag equation.
        """
        return 0.5 * self.air_density * velocity ** 2 * self.wing_area() * self.drag_coefficient()

    def glide_ratio(self):
        """L/D - Aerodynamic efficiency (lift-to-drag ratio)."""
        cd = self.drag_coefficient()
        if cd == 0:
            return float("inf")
        return self.lift_coefficient() / cd

    def wing_loading(self):
        """W/S - Wing loading (N/m^2)."""
        S = self.wing_area()
        if S == 0:
            return 0.0
        return self.mass * 9.81 / S

    def reynolds_number(self, velocity):
        """Re = rho * V * c / mu - Reynolds number.
        Source: Anderson, Fundamentals of Aerodynamics, Ch.1.
        """
        return self.air_density * velocity * self.chord / AIR_VISCOSITY

    def static_margin(self):
        """SM = (x_np - x_cg) / c - Static stability margin.
        Positive margin = longitudinally stable.
        Source: Raymer, Aircraft Design, Stability chapter.
        """
        if self.chord == 0:
            return 0.0
        return (self.neutral_point - self.cg_position) / self.chord

    def is_stable(self, min_margin=0.05):
        """Check if static margin meets minimum stability requirement."""
        return self.static_margin() >= min_margin

    def equilibrium_glide_speed(self):
        """v = sqrt(2 * m * g / (rho * S * C_L)) - Steady glide speed.
        Assumes lift ~= weight for small glide angles.
        """
        S = self.wing_area()
        cl = self.lift_coefficient()
        if S == 0 or cl == 0:
            return 0.0
        return math.sqrt(2 * self.mass * 9.81 / (self.air_density * S * cl))

    def sink_rate(self, velocity):
        """V_sink = V / (L/D) - Vertical sink rate in steady glide.
        Source: Anderson, Glide performance.
        """
        LD = self.glide_ratio()
        if LD == 0 or LD == float("inf"):
            return 0.0
        return velocity / LD

    def glide_angle(self):
        """gamma = arctan(1 / (L/D)) - Glide angle below horizontal (radians).
        Source: Anderson, Glide performance.
        """
        LD = self.glide_ratio()
        if LD == 0 or LD == float("inf"):
            return 0.0
        return math.atan2(1.0, LD)

    def update(self, dt):
        """Update glider state using Euler integration (2D forces)."""
        if dt <= 0:
            raise ValueError("Time step must be positive")
        v = math.sqrt(self.vx ** 2 + self.vy ** 2)
        if v > 0:
            L = self.lift_force(v)
            D = self.drag_force(v)
            flight_path_angle = math.atan2(self.vy, self.vx)
            lift_x = -L * math.sin(flight_path_angle)
            lift_y = L * math.cos(flight_path_angle)
            drag_x = -D * math.cos(flight_path_angle)
            drag_y = -D * math.sin(flight_path_angle)
            ax = (lift_x + drag_x) / self.mass
            ay = (lift_y + drag_y - self.mass * 9.81) / self.mass
        else:
            ax, ay = 0, -9.81
        self.vx += ax * dt
        self.vy += ay * dt
        self.x += self.vx * dt
        self.y += self.vy * dt

    def simulate(self, dt=0.01, max_time=30.0, ground_y=0.0):
        """Simulate full 2D glider trajectory until landing or max_time.

        Input: time step dt, maximum simulation time, ground y position.
        Returns dict with trajectory data and summary metrics.
        """
        if dt <= 0:
            raise ValueError("Time step must be positive")
        if max_time <= 0:
            raise ValueError("Max time must be positive")

        n_steps = int(max_time / dt)
        trajectory = []
        times = []

        for step in range(n_steps):
            self.update(dt)
            v = math.sqrt(self.vx ** 2 + self.vy ** 2)
            LD = self.glide_ratio()
            trajectory.append({
                "t": step * dt,
                "x": self.x,
                "y": self.y,
                "vx": self.vx,
                "vy": self.vy,
                "v": v,
                "L_D": LD,
                "Cl": self.lift_coefficient(),
                "Cd": self.drag_coefficient(),
            })
            times.append(step * dt)

            if self.y <= ground_y:
                self.y = ground_y
                if self.vy < 0:
                    self.vy = 0
                    self.vx *= 0.5
                break

        metrics = self._compute_metrics(trajectory, times)
        return {"trajectory": trajectory, **metrics}

    def _compute_metrics(self, trajectory, times):
        """Compute summary metrics from trajectory."""
        if not trajectory:
            return {
                "flight_time_s": 0.0,
                "range_m": 0.0,
                "max_LD": 0.0,
                "landing_velocity_ms": 0.0,
                "max_height_m": 0.0,
                "final_x": 0.0,
                "final_y": 0.0,
            }

        max_ld = max(p["L_D"] for p in trajectory)
        max_height = max(p["y"] for p in trajectory)
        final = trajectory[-1]

        return {
            "flight_time_s": final["t"],
            "range_m": final["x"],
            "max_LD": max_ld,
            "landing_velocity_ms": final["v"],
            "max_height_m": max_height,
            "final_x": final["x"],
            "final_y": final["y"],
        }
