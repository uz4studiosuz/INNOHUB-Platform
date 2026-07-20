"""
Kinematics functions for calculating motion parameters.
Formulas based on standard physics (source: Halliday Resnick - Fundamentals of Physics).
"""


def final_velocity(initial_velocity, acceleration, time):
    """v = u + at - Final velocity after constant acceleration."""
    return initial_velocity + acceleration * time


def displacement(initial_velocity, time, acceleration):
    """s = ut + 0.5 * a * t^2 - Displacement under constant acceleration."""
    return initial_velocity * time + 0.5 * acceleration * time ** 2


def velocity_displacement(initial_velocity, final_velocity, displacement):
    """v^2 = u^2 + 2*a*s - Solve for acceleration given velocities and displacement."""
    if displacement == 0:
        raise ValueError("Displacement cannot be zero for this calculation")
    return (final_velocity ** 2 - initial_velocity ** 2) / (2 * displacement)


def average_velocity(initial_velocity, final_velocity):
    """v_avg = (u + v) / 2 - Average velocity for constant acceleration."""
    return (initial_velocity + final_velocity) / 2


def acceleration_from_force(mass, net_force):
    """a = F / m - Acceleration from net force and mass (Newton's 2nd)."""
    if mass <= 0:
        raise ValueError("Mass must be positive")
    return net_force / mass
