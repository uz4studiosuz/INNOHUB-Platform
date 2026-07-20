import sys
import os
import json

# Add current engine directory to path
engine_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, engine_dir)

def run_glider(params):
    from flight.glider_model import GliderModel
    
    mass = params.get("mass", 0.5)
    span = params.get("span", 1.2)
    chord = params.get("chord", 0.15)
    airfoil_id = params.get("airfoilId", "naca2412")
    alpha = params.get("alpha", 5)
    oswald = params.get("oswald", 0.8)
    height = params.get("height", 50.0)
    vx0 = params.get("vx0", 10.0)
    vy0 = params.get("vy0", 0.0)
    
    model = GliderModel(
        mass_kg=mass,
        wing_span_m=span,
        chord_m=chord,
        airfoil_id=airfoil_id,
        angle_of_attack_deg=alpha,
        oswald_efficiency=oswald
    )
    
    model.x = 0.0
    model.y = height
    model.vx = vx0
    model.vy = vy0
    
    result = model.simulate(dt=0.05, max_time=60.0)
    return result

def run_rocket(params):
    from flight.rocket_model import Rocket
    
    dry_mass = params.get("dryMass", 0.2)
    prop_mass = params.get("propMass", 0.012)
    burn_time = params.get("burnTime", 0.8)
    thrust = params.get("thrust", 14.0)
    isp = params.get("isp", 110.0)
    body_dia = params.get("bodyDia", 0.024)
    body_len = params.get("bodyLen", 0.3)
    cd = params.get("cd", 0.4)
    
    rocket = Rocket(
        dry_mass_kg=dry_mass,
        propellant_mass_kg=prop_mass,
        burn_time_s=burn_time,
        thrust_N=thrust,
        isp_s=isp,
        body_diameter_m=body_dia,
        body_length_m=body_len,
        cd=cd
    )
    
    result = rocket.simulate(dt=0.02, max_time=30.0)
    return result

def run_circuit(params):
    from electronics.breadboard import Breadboard
    
    # Custom schematic analysis or simple configuration
    supply_v = params.get("supplyV", 9.0)
    r1_val = params.get("r1", 1000.0)
    r2_val = params.get("r2", 2000.0)
    led_v = params.get("ledV", 2.2)
    led_i = params.get("ledI", 0.02)
    
    bb = Breadboard(rows=30)
    
    # Recreate the series circuit + LED on the breadboard graph
    # Battery: Row 1 Left to GND (vcc to gnd)
    bb.add_battery(supply_v, 1, 0, 1, 9) # Col 0 to Col 9 represent VCC rail to GND rail
    
    # Resistor 1: Row 1 Left to Row 2 Left
    bb.add_resistor(r1_val, 1, 1, 2, 1)
    
    # Resistor 2: Row 2 Left to Row 3 Left
    bb.add_resistor(r2_val, 2, 2, 3, 2)
    
    # LED: Row 3 Left to GND (Row 1 Col 9 / Row 3 Col 9)
    bb.add_led(led_v, led_i, 3, 3, 3, 9)
    
    # Solve circuit
    try:
        voltages = bb.solve_dc()
        components_out = []
        for i, c in enumerate(bb.components):
            components_out.append({
                "id": c.id,
                "type": c.type,
                "value": c.value,
                "voltage_drop": c.voltage_drop,
                "current": c.current
            })
            
        r_total = r1_val + r2_val
        i_total = supply_v / r_total
        v_drops = [i_total * r1_val, i_total * r2_val]
        led_r = bb.led_current_resistor(supply_v, led_v, led_i)
        
        return {
            "voltages": voltages,
            "components": components_out,
            "voltage_drops": v_drops,
            "currents": [i_total, i_total],
            "total_resistance": r_total,
            "led_resistor_ohm": max(0.0, led_r)
        }
    except Exception as e:
        return {"error": str(e)}

def run_structure(params):
    from structures.beam_analysis import (
        rect_moment_of_inertia,
        bending_moment,
        bending_stress,
        beam_deflection_cantilever,
        euler_buckling_load
    )
    
    mode = params.get("mode", "beam")
    force = params.get("force", 100.0)
    length = params.get("length", 1.0)
    width = params.get("width", 0.05)
    height = params.get("height", 0.1)
    e_gpa = params.get("Emod", 200.0)
    e_pa = e_gpa * 1e9
    
    I = rect_moment_of_inertia(width, height)
    
    if mode == "beam":
        M = bending_moment(force, length)
        c = height / 2.0
        stress = bending_stress(M, c, I)
        defl = beam_deflection_cantilever(force, length, e_pa, I)
        return {
            "bending_moment_Nm": M,
            "bending_stress_Pa": stress,
            "deflection_m": defl,
            "moment_of_inertia_m4": I
        }
    elif mode == "column":
        # Simply supported critical buckling load (effective length factor = 1)
        Pcr = euler_buckling_load(e_pa, I, length)
        sf = Pcr / force if force > 0 else float("inf")
        return {
            "critical_load_N": Pcr,
            "safety_factor": sf
        }
    elif mode == "section":
        I_rect = rect_moment_of_inertia(width, height)
        d = min(width, height)
        import math
        I_circle = math.pi * (d ** 4) / 64.0
        return {
            "I_rect_m4": I_rect,
            "I_circle_m4": I_circle
        }
    
    return {"error": "Unknown structural analysis mode"}

def main():
    try:
        # Read from stdin if args are empty
        if len(sys.argv) > 1:
            input_str = sys.argv[1]
        else:
            input_str = sys.stdin.read()
            
        data = json.loads(input_str)
        module = data.get("module")
        params = data.get("params", {})
        
        if module == "glider":
            result = run_glider(params)
        elif module == "rocket":
            result = run_rocket(params)
        elif module == "circuit":
            result = run_circuit(params)
        elif module == "structure":
            result = run_structure(params)
        else:
            result = {"error": f"Unknown module '{module}'"}
            
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
