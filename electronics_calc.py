import math

def diode_forward_voltage_drop(current, saturation_current, thermal_voltage=0.026):
    """Vd = Vt * ln(I / I_s) - Shockley diode equation approximation"""
    if current <= 0 or saturation_current <= 0:
        raise ValueError("Current and saturation current must be positive")
    return thermal_voltage * math.log(current / saturation_current)

def transistor_beta_gain(collector_current, base_current):
    """β = Ic / Ib - current gain calculation"""
    if base_current == 0:
        raise ValueError("Base current cannot be zero for beta calculation")
    return collector_current / base_current

def led_resistor_value(supply_voltage, led_voltage, led_current):
    """R = (Vsupply - Vled) / Iled - resistor value needed for an LED circuit"""
    if supply_voltage <= 0 or led_voltage <= 0 or led_current <= 0:
        raise ValueError("Supply voltage, LED voltage, and current must be positive")
    return (supply_voltage - led_voltage) / led_current

if __name__ == "__main__":
    v_d = diode_forward_voltage_drop(current=1e-3, saturation_current=1e-12)
    print(f"Diode forward voltage drop: {v_d:.4f} volts")

    beta = transistor_beta_gain(collector_current=100e-3, base_current=1e-3)
    print(f"Transistor beta gain: {beta:.2f}")

    r_led = led_resistor_value(supply_voltage=5, led_voltage=2.2, led_current=20e-3)
    print(f"LED resistor value: {r_led:.2f} ohms")