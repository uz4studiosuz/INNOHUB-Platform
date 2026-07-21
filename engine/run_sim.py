import sys
import os
import json
import math

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
    
    # LED: Row 3 Left back to the battery's negative rail (Row 1 Col 9), closing the loop.
    # Each row's "right" strip is its own isolated node (real breadboard rows aren't
    # bridged automatically), so returning to (3, 9) would leave the LED dangling on a
    # dead-end node instead of completing the series circuit.
    bb.add_led(led_v, led_i, 3, 3, 1, 9)
    
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

def run_drone(params):
    from flight.drone_model import Quadcopter, AltitudeHoldPID

    mass = params.get("mass", 1.5)
    arm_length = params.get("armLength", 0.2)
    thrust_coeff = params.get("thrustCoeff", 1e-5)
    drag_coeff = params.get("dragCoeff", 1e-6)
    max_rpm = params.get("maxRpm", 10000)
    prop_diameter = params.get("propDiameter", 0.1)
    target_altitude = params.get("targetAltitude", 10.0)
    dt = params.get("dt", 0.02)
    max_time = params.get("maxTime", 15.0)

    quad = Quadcopter(
        mass_kg=mass,
        arm_length_m=arm_length,
        thrust_coefficient=thrust_coeff,
        drag_coefficient=drag_coeff,
        max_rpm=max_rpm
    )
    controller = AltitudeHoldPID(quad, dt=dt)

    n_steps = int(max_time / dt)
    trajectory = []
    for step in range(n_steps):
        rpms = controller.compute_rpms(target_altitude)
        quad.update(rpms, dt)
        if step % max(1, n_steps // 150) == 0:
            trajectory.append({
                "t": step * dt,
                "z": quad.z,
                "vz": quad.vz,
                "roll": quad.roll,
                "pitch": quad.pitch,
            })

    hover_rpm = quad.hover_rpm()
    weight_N = mass * 9.81
    single_motor_thrust_N = quad.thrust_from_rpm(max_rpm)
    total_thrust_N = quad.total_thrust([max_rpm] * 4)
    return {
        "trajectory": trajectory,
        "hover_rpm": hover_rpm,
        "final_altitude_m": quad.z,
        "final_vz_ms": quad.vz,
        "thrust_to_weight": quad.thrust_to_weight_ratio(hover_rpm, prop_diameter),
        "weight_N": weight_N,
        "single_motor_thrust_N": single_motor_thrust_N,
        "total_thrust_N": total_thrust_N,
        "tw_ratio": total_thrust_N / weight_N if weight_N > 0 else float("inf"),
        "max_vertical_accel_ms2": quad.vertical_acceleration(total_thrust_N)
    }

def run_car(params):
    mode = params.get("mode", "accelerate")

    if mode == "accelerate":
        from vehicle.car_model import Car

        mass = params.get("mass", 1000.0)
        engine_power = params.get("enginePower", 50000.0)
        cd = params.get("dragCoefficient", 0.3)
        frontal_area = params.get("frontalArea", 2.2)
        rolling_resistance = params.get("rollingResistance", 0.015)
        dt = params.get("dt", 0.5)
        steps = params.get("steps", 60)

        car = Car(
            mass_kg=mass,
            engine_power_w=engine_power,
            drag_coefficient=cd,
            frontal_area_m2=frontal_area,
            rolling_resistance=rolling_resistance
        )
        history = car.simulate(dt, steps)
        return {
            "trajectory": [{"t": i * dt, "position_m": p, "velocity_ms": v} for i, (p, v) in enumerate(history)],
            "top_speed_ms": car.top_speed()
        }

    elif mode == "braking":
        from vehicle.braking import (
            braking_distance, deceleration_from_friction, braking_time, total_stopping_distance
        )

        velocity = params.get("velocity", 20.0)
        friction_coeff = params.get("frictionCoeff", 0.7)
        reaction_time = params.get("reactionTime", 1.5)

        decel = deceleration_from_friction(friction_coeff)
        return {
            "deceleration_ms2": decel,
            "braking_distance_m": braking_distance(velocity, decel),
            "braking_time_s": braking_time(velocity, decel),
            "total_stopping_distance_m": total_stopping_distance(reaction_time, velocity, decel)
        }

    elif mode == "cornering":
        from vehicle.cornering import (
            centripetal_force, centripetal_acceleration, max_cornering_speed, max_cornering_speed_banked
        )

        mass = params.get("mass", 1000.0)
        velocity = params.get("velocity", 15.0)
        radius = params.get("radius", 30.0)
        friction_coeff = params.get("frictionCoeff", 0.8)
        bank_angle = params.get("bankAngleDeg", 0.0)

        return {
            "centripetal_force_N": centripetal_force(mass, velocity, radius),
            "centripetal_acceleration_ms2": centripetal_acceleration(velocity, radius),
            "max_cornering_speed_ms": max_cornering_speed(radius, friction_coeff),
            "max_cornering_speed_banked_ms": max_cornering_speed_banked(radius, friction_coeff, bank_angle)
        }

    return {"error": "Unknown car analysis mode"}

def run_rover(params):
    from vehicle.rover_model import Rover

    mass = params.get("mass", 10.0)
    wheel_radius = params.get("wheelRadius", 0.1)
    motor_torque = params.get("motorTorque", 0.5)
    gear_ratio = params.get("gearRatio", 10)
    efficiency = params.get("efficiency", 0.85)
    rolling_resistance = params.get("rollingResistance", 0.02)
    friction_coeff = params.get("frictionCoeff", 0.6)
    drag_coeff = params.get("dragCoeff", 0.3)
    frontal_area = params.get("frontalArea", 0.05)
    incline_deg = params.get("inclineDeg", 0.0)
    dt = params.get("dt", 0.1)
    max_time = params.get("maxTime", 30.0)

    rover = Rover(
        mass_kg=mass,
        wheel_radius_m=wheel_radius,
        motor_torque_Nm=motor_torque,
        gear_ratio=gear_ratio,
        efficiency=efficiency,
        rolling_resistance_coeff=rolling_resistance,
        friction_coeff=friction_coeff,
        drag_coeff=drag_coeff,
        frontal_area_m2=frontal_area
    )
    return rover.simulate(dt=dt, max_time=max_time, incline_deg=incline_deg)

def run_prosthetic(params):
    from biomechanics.prosthetic_model import (
        joint_torque, actuator_required_torque, mechanical_advantage,
        stress_in_material, material_safety_factor, prosthetic_hand_grip_force,
        battery_life, list_materials
    )

    limb_mass = params.get("limbMass", 1.0)
    limb_length = params.get("limbLength", 0.3)
    angle_deg = params.get("angleDeg", 0.0)
    load_force = params.get("loadForce", 50.0)
    moment_arm = params.get("momentArm", 0.05)
    input_arm = params.get("inputArm", 0.1)
    output_arm = params.get("outputArm", 0.05)
    cross_section = params.get("crossSectionArea", 1e-4)
    material = params.get("material", "titanium_ti6al4v")
    linkage_ratio = params.get("linkageRatio", 0.5)
    actuator_force = params.get("actuatorForce", 100.0)
    battery_capacity = params.get("batteryCapacityAh", 2.0)
    current_draw = params.get("currentDrawA", 1.5)

    stress = stress_in_material(load_force, cross_section)

    return {
        "joint_torque_Nm": joint_torque(limb_mass, limb_length, angle_deg),
        "actuator_required_torque_Nm": actuator_required_torque(load_force, moment_arm),
        "mechanical_advantage": mechanical_advantage(input_arm, output_arm),
        "stress_Pa": stress,
        "safety_factor": material_safety_factor(material, stress),
        "grip_force_N": prosthetic_hand_grip_force(actuator_force, linkage_ratio),
        "battery_life_hours": battery_life(battery_capacity, current_draw),
        "material": material,
        "available_materials": list_materials()
    }

def run_truss(params):
    from structures.truss_analysis import Truss

    nodes = params.get("nodes")
    members = params.get("members")
    supports = params.get("supports")
    loads = params.get("loads")

    truss = Truss()

    if nodes:
        for x, y in nodes:
            truss.add_node(x, y)
    else:
        # Default: simple pin-jointed triangular truss (Hibbeler, Statics)
        truss.add_node(0, 0)
        truss.add_node(4, 0)
        truss.add_node(2, 3)

    if members:
        for m in members:
            area = m[2] if len(m) > 2 else 1e-4
            e_mod = m[3] if len(m) > 3 else 200e9
            yield_stress = m[4] if len(m) > 4 else 250e6
            truss.add_member(m[0], m[1], area, e_mod, yield_stress)
    else:
        truss.add_member(0, 1)
        truss.add_member(0, 2)
        truss.add_member(1, 2)

    if supports:
        for idx, s in supports.items():
            idx = int(idx)
            if s == "pin":
                truss.add_pin_support(idx)
            elif s == "roller_h":
                truss.add_roller_support_h(idx)
            elif s == "roller_v":
                truss.add_roller_support_v(idx)
    else:
        truss.add_pin_support(0)
        truss.add_roller_support_h(1)

    if loads:
        for idx, fxy in loads.items():
            truss.add_load(int(idx), fxy[0], fxy[1])
    else:
        truss.add_load(2, 0.0, -1000.0)

    try:
        forces = truss.solve()
        members_out = []
        for i, m in enumerate(truss.members):
            members_out.append({
                "id": i,
                "node_i": m.node_i,
                "node_j": m.node_j,
                "force_N": m.force,
                "stress_Pa": m.stress(),
                "safety_factor": m.safety_factor(),
                "in_tension": m.is_tension()
            })
        return {"member_forces_N": list(forces), "members": members_out}
    except ValueError as e:
        return {"error": str(e)}

def run_mechanics(params):
    mode = params.get("mode", "friction")

    if mode == "friction":
        from mechanics.friction import static_friction_max, kinetic_friction, is_static, friction_coefficient_from_angle

        normal_force = params.get("normalForce", 100.0)
        static_coeff = params.get("staticCoeff", 0.6)
        kinetic_coeff = params.get("kineticCoeff", 0.4)
        applied_force = params.get("appliedForce", 50.0)
        angle_deg = params.get("angleDeg", 20.0)

        f_static_max = static_friction_max(normal_force, static_coeff)
        return {
            "max_static_friction_N": f_static_max,
            "kinetic_friction_N": kinetic_friction(normal_force, kinetic_coeff),
            "object_stays_static": is_static(applied_force, f_static_max),
            "friction_coeff_from_angle": friction_coefficient_from_angle(angle_deg)
        }

    elif mode == "gears":
        from mechanics.gears import (
            gear_ratio, rotational_speed, torque, linear_speed_from_rotation, rotational_speed_to_angular
        )

        driver_teeth = params.get("driverTeeth", 20)
        driven_teeth = params.get("drivenTeeth", 60)
        input_rpm = params.get("inputRpm", 1000.0)
        input_torque = params.get("inputTorque", 5.0)
        wheel_radius = params.get("wheelRadius", 0.15)

        gr = gear_ratio(driven_teeth, driver_teeth)
        output_rpm = rotational_speed(input_rpm, gr)
        output_omega = rotational_speed_to_angular(output_rpm)
        return {
            "gear_ratio": gr,
            "output_rpm": output_rpm,
            "output_torque_Nm": torque(input_torque, gr),
            "output_linear_speed_ms": linear_speed_from_rotation(output_omega, wheel_radius)
        }

    elif mode == "levers":
        from mechanics.levers import mechanical_advantage, lever_force, required_effort

        effort_arm = params.get("effortArm", 0.5)
        load_arm = params.get("loadArm", 0.1)
        effort_force = params.get("effortForce", 20.0)
        load_force = params.get("loadForce", 80.0)

        return {
            "mechanical_advantage": mechanical_advantage(effort_arm, load_arm),
            "load_force_N": lever_force(effort_force, effort_arm, load_arm),
            "required_effort_N": required_effort(load_force, load_arm, effort_arm)
        }

    elif mode == "springs":
        from mechanics.springs import (
            spring_force_magnitude, spring_potential_energy, series_spring_constants, parallel_spring_constants
        )

        k = params.get("springConstant", 200.0)
        displacement = params.get("displacement", 0.05)
        k_list = params.get("springConstants", [k])

        return {
            "spring_force_N": spring_force_magnitude(k, displacement),
            "spring_potential_energy_J": spring_potential_energy(k, displacement),
            "series_constant_Nm": series_spring_constants(*k_list) if len(k_list) > 1 else k_list[0],
            "parallel_constant_Nm": parallel_spring_constants(*k_list)
        }

    return {"error": "Unknown mechanics mode"}

def run_aerodynamics(params):
    mode = params.get("mode", "lift_drag")

    if mode == "airfoil":
        from aerodynamics.airfoil import get_airfoil, list_airfoils, estimate_cl, estimate_cd

        airfoil_id = params.get("airfoilId", "naca2412")
        alpha = params.get("alpha", 5.0)

        data = get_airfoil(airfoil_id)
        if data is None:
            return {"error": f"Unknown airfoil: {airfoil_id}", "available": list_airfoils()}

        cl = estimate_cl(airfoil_id, alpha)
        cd = estimate_cd(airfoil_id, cl)
        return {
            "airfoil": data,
            "cl": cl,
            "cd": cd,
            "l_d_ratio": cl / cd if cd else float("inf")
        }

    elif mode == "lift_drag":
        from aerodynamics.lift_drag import (
            lift_force, drag_force, lift_to_drag_ratio, dynamic_pressure, air_density_at_altitude
        )

        rho0 = params.get("airDensity", 1.225)
        altitude = params.get("altitude", 0.0)
        velocity = params.get("velocity", 20.0)
        wing_area = params.get("wingArea", 0.2)
        cl = params.get("cl", 0.5)
        cd = params.get("cd", 0.04)

        rho = air_density_at_altitude(rho0, altitude)
        lift = lift_force(rho, velocity, wing_area, cl)
        drag = drag_force(rho, velocity, wing_area, cd)
        return {
            "air_density_kg_m3": rho,
            "lift_N": lift,
            "drag_N": drag,
            "l_d_ratio": lift_to_drag_ratio(lift, drag),
            "dynamic_pressure_Pa": dynamic_pressure(rho, velocity)
        }

    elif mode == "stability":
        from aerodynamics.stability import stability_margin, is_stable, neutral_point, required_tail_area

        wing_lift_slope = params.get("wingLiftSlope", 0.1)
        wing_area = params.get("wingArea", 0.2)
        tail_lift_slope = params.get("tailLiftSlope", 0.1)
        tail_area = params.get("tailArea", 0.04)
        tail_arm = params.get("tailArm", 0.5)
        wing_mac = params.get("wingMac", 0.15)
        cg_position = params.get("cgPosition", 0.05)

        np_pos = neutral_point(wing_lift_slope, wing_area, tail_lift_slope, tail_area, tail_arm, wing_mac)
        sm = stability_margin(cg_position, np_pos, wing_mac)
        return {
            "neutral_point_m": np_pos,
            "stability_margin": sm,
            "is_stable": is_stable(sm),
            "required_tail_area_m2": required_tail_area(cg_position, np_pos, wing_area, tail_arm, wing_mac)
        }

    return {"error": "Unknown aerodynamics mode"}

def run_physics_lab(params):
    lab = params.get("lab", "mechanics")
    experiment = params.get("experiment")

    if lab == "mechanics":
        from physics_lab.mechanics_lab import (
            projectile_motion, collision_1d, spring_oscillator, pendulum_period,
            centripetal_force, kinetic_energy, potential_energy
        )

        if experiment == "projectile":
            return projectile_motion(params.get("v0", 20.0), params.get("angleDeg", 45.0), params.get("g", 9.81))
        elif experiment == "collision":
            return collision_1d(
                params.get("m1", 1.0), params.get("v1", 5.0),
                params.get("m2", 1.0), params.get("v2", 0.0),
                params.get("elastic", True)
            )
        elif experiment == "spring_oscillator":
            return spring_oscillator(params.get("mass", 1.0), params.get("k", 50.0), params.get("amplitude", 0.1))
        elif experiment == "pendulum":
            return {"period_s": pendulum_period(params.get("length", 1.0), params.get("g", 9.81))}
        elif experiment == "centripetal":
            return {"force_N": centripetal_force(params.get("mass", 1.0), params.get("velocity", 5.0), params.get("radius", 1.0))}
        elif experiment == "energy":
            return {
                "kinetic_energy_J": kinetic_energy(params.get("mass", 1.0), params.get("velocity", 5.0)),
                "potential_energy_J": potential_energy(params.get("mass", 1.0), params.get("height", 2.0))
            }
        return {"error": f"Unknown mechanics experiment: {experiment}"}

    elif lab == "electricity":
        from physics_lab.electricity_lab import (
            ohm_law_experiment, series_circuit, parallel_circuit,
            electromagnetic_induction, lorentz_force, rc_time_constant, capacitor_charge
        )

        if experiment == "ohms_law":
            return ohm_law_experiment(params.get("voltage"), params.get("current"), params.get("resistance"))
        elif experiment == "series_circuit":
            return series_circuit(params.get("voltages", []), params.get("resistances", []))
        elif experiment == "parallel_circuit":
            return parallel_circuit(params.get("voltage", 9.0), params.get("resistances", [100.0, 200.0]))
        elif experiment == "induction":
            return {"emf_V": electromagnetic_induction(
                params.get("turns", 100), params.get("deltaFlux", 0.001), params.get("deltaTime", 0.1)
            )}
        elif experiment == "lorentz_force":
            return {"force_N": lorentz_force(
                params.get("charge", 1e-6), params.get("electricField"),
                params.get("velocity"), params.get("magneticField"), params.get("angleDeg", 90)
            )}
        elif experiment == "rc_circuit":
            r = params.get("resistance", 1000.0)
            c = params.get("capacitance", 1e-6)
            v = params.get("voltage", 5.0)
            t = params.get("time", 0.001)
            return {"tau_s": rc_time_constant(r, c), "capacitor_voltage_V": capacitor_charge(v, r, c, t)}
        return {"error": f"Unknown electricity experiment: {experiment}"}

    elif lab == "waves":
        from physics_lab.waves_lab import (
            wave_speed, wave_frequency, wavelength_from_freq, simple_pendulum,
            spring_mass_system, harmonic_position, harmonic_velocity, harmonic_acceleration,
            sound_intensity, doppler_effect, resonance_frequency_organ_pipe
        )

        if experiment == "wave_properties":
            freq = params.get("frequency")
            wavelength = params.get("wavelength")
            speed = params.get("speed")
            result = {}
            if freq is not None and wavelength is not None:
                result["speed_ms"] = wave_speed(freq, wavelength)
            if wavelength is not None and speed is not None:
                result["frequency_hz"] = wave_frequency(wavelength, speed)
            if speed is not None and freq is not None:
                result["wavelength_m"] = wavelength_from_freq(speed, freq)
            return result
        elif experiment == "pendulum":
            return simple_pendulum(params.get("length", 1.0), params.get("g", 9.81))
        elif experiment == "spring_mass":
            return spring_mass_system(params.get("mass", 1.0), params.get("k", 50.0))
        elif experiment == "shm":
            a = params.get("amplitude", 0.1)
            omega = params.get("angularFreq", 5.0)
            t = params.get("time", 0.5)
            phase = params.get("phase", 0.0)
            return {
                "position_m": harmonic_position(a, omega, t, phase),
                "velocity_ms": harmonic_velocity(a, omega, t, phase),
                "acceleration_ms2": harmonic_acceleration(a, omega, t, phase)
            }
        elif experiment == "sound_intensity":
            return {"intensity_W_m2": sound_intensity(params.get("power", 1.0), params.get("distance", 1.0))}
        elif experiment == "doppler":
            return {"observed_freq_hz": doppler_effect(
                params.get("sourceFreq", 440.0), params.get("sourceSpeed", 30.0),
                params.get("observerSpeed", 0.0), params.get("soundSpeed", 343.0),
                params.get("approaching", True)
            )}
        elif experiment == "organ_pipe":
            return {"resonant_freq_hz": resonance_frequency_organ_pipe(
                params.get("length", 1.0), params.get("harmonic", 1),
                params.get("closedEnd", True), params.get("soundSpeed", 343.0)
            )}
        return {"error": f"Unknown waves experiment: {experiment}"}

    elif lab == "thermo":
        from physics_lab.thermo_lab import (
            heat_energy, latent_heat, first_law_thermodynamics, ideal_gas_pressure,
            ideal_gas_volume, thermal_expansion_length, thermal_expansion_volume,
            heat_conduction, efficiency_heat_engine, carnot_efficiency
        )

        if experiment == "heat_energy":
            return {"heat_J": heat_energy(params.get("mass", 1.0), params.get("specificHeat", 4186.0), params.get("tempChange", 10.0))}
        elif experiment == "latent_heat":
            return {"heat_J": latent_heat(params.get("mass", 1.0), params.get("latentHeat", 334000.0))}
        elif experiment == "first_law":
            return {"delta_U_J": first_law_thermodynamics(params.get("heatAdded", 100.0), params.get("workDone", 40.0))}
        elif experiment == "ideal_gas":
            if params.get("solveFor") == "volume":
                return {"volume_m3": ideal_gas_volume(params.get("pressure", 101325.0), params.get("moles", 1.0), params.get("temp", 300.0))}
            return {"pressure_Pa": ideal_gas_pressure(params.get("volume", 0.024), params.get("moles", 1.0), params.get("temp", 300.0))}
        elif experiment == "thermal_expansion":
            return {
                "delta_length_m": thermal_expansion_length(params.get("initialLength", 1.0), params.get("alpha", 1.2e-5), params.get("tempChange", 20.0)),
                "delta_volume_m3": thermal_expansion_volume(params.get("initialVolume", 0.001), params.get("beta", 3.6e-5), params.get("tempChange", 20.0))
            }
        elif experiment == "heat_conduction":
            return {"power_W": heat_conduction(
                params.get("conductivity", 0.6), params.get("area", 1.0),
                params.get("tempDiff", 20.0), params.get("thickness", 0.01)
            )}
        elif experiment == "heat_engine":
            return {
                "efficiency": efficiency_heat_engine(params.get("workOutput", 400.0), params.get("heatInput", 1000.0)),
                "carnot_max_efficiency": carnot_efficiency(params.get("hotTemp", 500.0), params.get("coldTemp", 300.0))
            }
        return {"error": f"Unknown thermo experiment: {experiment}"}

    return {"error": f"Unknown physics lab: {lab}"}

def run_microelectronics(params):
    from electronics.microcontroller import (
        power_consumption_W, cycle_time_s, loop_time_s, gpio_budget, battery_life_hours,
    )

    clock_hz = params.get("clockHz", 16_000_000)
    supply_v = params.get("supplyV", 5.0)
    mcu_idle_a = params.get("mcuIdleCurrentA", 0.02)
    peripheral_currents = params.get("peripheralCurrentsA", [])
    instructions_per_loop = params.get("instructionsPerLoop", 1000)
    gpio_total = params.get("gpioTotal", 20)
    gpio_used = params.get("gpioUsed", 0)
    battery_mah = params.get("batteryCapacityMah", 2000)

    currents = [mcu_idle_a] + list(peripheral_currents)
    total_current_a = sum(currents)
    power_w = power_consumption_W(supply_v, currents)
    remaining_pins = gpio_budget(gpio_total, gpio_used)

    return {
        "power_W": power_w,
        "total_current_A": total_current_a,
        "cycle_time_ns": cycle_time_s(clock_hz) * 1e9,
        "loop_time_us": loop_time_s(clock_hz, instructions_per_loop) * 1e6,
        "gpio_remaining": remaining_pins,
        "gpio_over_budget": remaining_pins < 0,
        "battery_life_hours": battery_life_hours(battery_mah, total_current_a) if total_current_a > 0 else float("inf"),
    }

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
        elif module == "drone":
            result = run_drone(params)
        elif module == "car":
            result = run_car(params)
        elif module == "rover":
            result = run_rover(params)
        elif module == "prosthetic":
            result = run_prosthetic(params)
        elif module == "truss":
            result = run_truss(params)
        elif module == "mechanics":
            result = run_mechanics(params)
        elif module == "aerodynamics":
            result = run_aerodynamics(params)
        elif module == "physics_lab":
            result = run_physics_lab(params)
        elif module == "microelectronics":
            result = run_microelectronics(params)
        else:
            result = {"error": f"Unknown module '{module}'"}
            
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
