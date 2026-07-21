"""Microcontroller budget calculations: power draw, clock timing, GPIO headroom."""


def power_consumption_W(voltage, currents_A):
    """P = V * sum(I) - Total power draw of MCU + peripherals."""
    if voltage < 0:
        raise ValueError("Voltage cannot be negative")
    if any(i < 0 for i in currents_A):
        raise ValueError("Current cannot be negative")
    return voltage * sum(currents_A)


def cycle_time_s(clock_hz):
    """t_cycle = 1 / f_clock - Duration of a single clock cycle."""
    if clock_hz <= 0:
        raise ValueError("Clock frequency must be positive")
    return 1.0 / clock_hz


def loop_time_s(clock_hz, instructions_per_loop):
    """Estimated wall-clock time for a loop, assuming ~1 cycle/instruction."""
    if instructions_per_loop < 0:
        raise ValueError("Instruction count cannot be negative")
    return cycle_time_s(clock_hz) * instructions_per_loop


def gpio_budget(total_pins, used_pins):
    """Remaining free GPIO pins (negative means over budget)."""
    if total_pins < 0 or used_pins < 0:
        raise ValueError("Pin counts cannot be negative")
    return total_pins - used_pins


def battery_life_hours(capacity_mAh, current_A):
    """t = Capacity(Ah) / I - Runtime on a given battery."""
    if current_A <= 0:
        raise ValueError("Current draw must be positive")
    return (capacity_mAh / 1000.0) / current_A
