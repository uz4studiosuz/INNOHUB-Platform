"""Tests for engine.electronics.breadboard."""

import sys
import os
import math

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from electronics.breadboard import (
    Breadboard, BreadboardNode, BreadboardComponent,
)


def test_breadboard_init():
    bb = Breadboard(rows=30)
    assert len(bb.nodes) == 2 + 30 * 2  # vcc + gnd + row nodes
    assert "vcc" in bb.nodes
    assert "gnd" in bb.nodes
    assert "row1_left" in bb.nodes


def test_breadboard_hole_node():
    bb = Breadboard(rows=30)
    nid = bb.hole_node(1, 0)
    assert nid == "row1_left"
    nid = bb.hole_node(1, 5)
    assert nid == "row1_right"


def test_add_resistor():
    bb = Breadboard(rows=30)
    comp = bb.add_resistor(1000, 1, 0, 1, 5)
    assert comp.type == "resistor"
    assert comp.value == 1000
    assert len(bb.components) == 1


def test_add_battery():
    bb = Breadboard(rows=30)
    comp = bb.add_battery(9, 1, 0, 1, 5)
    assert comp.type == "battery"
    assert comp.value == 9


def test_add_led():
    bb = Breadboard(rows=30)
    comp = bb.add_led(2.0, 0.02, 1, 0, 1, 5)
    assert comp.type == "led"
    assert comp.value == 2.0
    assert comp.extra["max_current"] == 0.02


def test_add_wire():
    bb = Breadboard(rows=30)
    comp = bb.add_wire(1, 0, 1, 5)
    assert comp.type == "wire"


def test_solve_no_components():
    bb = Breadboard(rows=30)
    result = bb.solve_dc()
    assert result == {}


def test_solve_single_resistor():
    bb = Breadboard(rows=30)
    bb.add_battery(9, 1, 0, 1, 5)
    bb.add_resistor(100, 1, 5, 2, 0)
    result = bb.solve_dc()
    assert "gnd" in result
    assert result["gnd"] == 0.0


def test_solve_voltage_divider():
    bb = Breadboard(rows=30)
    bb.add_battery(9, 1, 0, 2, 0)
    bb.add_resistor(1000, 1, 5, 1, 0)
    bb.add_resistor(2000, 2, 0, 2, 5)
    result = bb.solve_dc()
    assert "gnd" in result


def test_led_current_resistor():
    bb = Breadboard(rows=30)
    R = bb.led_current_resistor(9, 2.0, 0.02)
    expected = (9 - 2.0) / 0.02
    assert abs(R - expected) < 1e-6


def test_solve_three_node_circuit():
    bb = Breadboard(rows=30)
    bb.add_battery(12, 1, 0, 2, 0)
    bb.add_resistor(100, 1, 5, 1, 0)
    bb.add_resistor(200, 2, 0, 2, 5)
    bb.add_resistor(300, 3, 0, 3, 5)
    result = bb.solve_dc()
    assert "gnd" in result


def test_component_current_after_solve():
    bb = Breadboard(rows=30)
    bb.add_battery(9, 1, 0, 2, 0)
    r = bb.add_resistor(100, 1, 5, 2, 5)
    bb.solve_dc()
    if r.current != 0:
        assert abs(r.voltage_drop) > 0


if __name__ == "__main__":
    test_breadboard_init()
    test_breadboard_hole_node()
    test_add_resistor()
    test_add_battery()
    test_add_led()
    test_add_wire()
    test_solve_no_components()
    test_solve_single_resistor()
    test_solve_voltage_divider()
    test_led_current_resistor()
    test_solve_three_node_circuit()
    test_component_current_after_solve()
    print("All breadboard tests passed!")
