"""Tests for engine.core.component_loader."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.component_loader import (
    load_components,
    get_component_by_id,
    get_all_components,
    Component,
)


def test_load_electronics():
    components = load_components("electronics")
    assert len(components) >= 10
    for comp in components:
        assert isinstance(comp, Component)
        assert comp.type == "electronics"


def test_load_mechanics():
    components = load_components("mechanics")
    assert len(components) >= 8
    for comp in components:
        assert comp.type == "mechanics"


def test_load_aero():
    components = load_components("aero")
    assert len(components) >= 5
    for comp in components:
        assert comp.type == "aerodynamics"


def test_get_component_by_id():
    components = load_components("electronics")
    resistor = get_component_by_id(components, "resistor")
    assert resistor is not None
    assert resistor.id == "resistor"
    assert "resistance_ohms" in resistor.parameters


def test_get_component_by_id_not_found():
    components = load_components("electronics")
    result = get_component_by_id(components, "nonexistent")
    assert result is None


def test_get_all_components():
    all_comps = get_all_components()
    total = len(all_comps)
    assert total >= 23  # 10 + 8 + 5 = 23 minimum


def test_resistor_parameters():
    components = load_components("electronics")
    resistor = get_component_by_id(components, "resistor")
    params = resistor.parameters
    assert params["resistance_ohms"]["default"] == 1000
    assert params["resistance_ohms"]["unit"] == "Ω"


def test_component_repr():
    components = load_components("electronics")
    resistor = get_component_by_id(components, "resistor")
    assert repr(resistor) == "Component(id='resistor', name='Resistor', type='electronics')"


if __name__ == "__main__":
    test_load_electronics()
    test_load_mechanics()
    test_load_aero()
    test_get_component_by_id()
    test_get_component_by_id_not_found()
    test_get_all_components()
    test_resistor_parameters()
    test_component_repr()
    print("All component loader tests passed!")
