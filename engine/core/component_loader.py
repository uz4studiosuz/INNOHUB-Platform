"""
Component loader - loads component definitions from JSON files.
Each JSON file contains a list of component definitions with parameters.
"""

import json
import os
from pathlib import Path


COMPONENTS_DIR = Path(__file__).resolve().parent.parent.parent / "components"


class Component:
    """Represents a single component definition loaded from JSON."""

    def __init__(self, data):
        self.id = data["id"]
        self.name = data["name"]
        self.type = data["type"]
        self.description = data.get("description", "")
        self.parameters = data.get("parameters", {})
        self.symbol = data.get("symbol", "")
        self.model_3d_path = data.get("model_3d_path", "")
        self.related_functions = data.get("related_functions", [])

    def __repr__(self):
        return f"Component(id='{self.id}', name='{self.name}', type='{self.type}')"


def load_components(domain):
    """
    Load all components for a given domain.
    domain: 'electronics', 'mechanics', or 'aero'
    """
    filename = f"{domain}.json"
    filepath = COMPONENTS_DIR / filename
    if not filepath.exists():
        raise FileNotFoundError(f"Component file not found: {filepath}")
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [Component(item) for item in data]


def get_component_by_id(components, component_id):
    """Find a component by its id in a list of components."""
    for comp in components:
        if comp.id == component_id:
            return comp
    return None


def get_all_components():
    """Load all components from all domains."""
    all_comps = []
    for domain in ["electronics", "mechanics", "aero"]:
        all_comps.extend(load_components(domain))
    return all_comps
