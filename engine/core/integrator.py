"""
State integrator for time-based physics simulation.
Uses simple Euler integration for updating position and velocity over time.
Source: Numerical Recipes in C (Euler method chapter).
"""


class State:
    """Represents the physical state of an object at a point in time."""

    def __init__(self, position=0.0, velocity=0.0):
        self.position = position
        self.velocity = velocity

    def __repr__(self):
        return f"State(position={self.position}, velocity={self.velocity})"


def euler_step(state, acceleration, dt):
    """
    Update state using forward Euler integration.
    v_new = v + a * dt
    x_new = x + v * dt
    """
    if dt <= 0:
        raise ValueError("Time step dt must be positive")
    new_velocity = state.velocity + acceleration * dt
    new_position = state.position + state.velocity * dt
    return State(position=new_position, velocity=new_velocity)


def simulate(state, acceleration, dt, steps):
    """
    Simulate motion over multiple time steps.
    Returns a list of State objects for each step.
    """
    if steps < 1:
        raise ValueError("Steps must be at least 1")
    history = []
    current = state
    for _ in range(steps):
        current = euler_step(current, acceleration, dt)
        history.append(current)
    return history
