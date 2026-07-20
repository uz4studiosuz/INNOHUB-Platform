"""Breadboard simulator - models a solderless breadboard as a node graph.

Nodes represent electrically connected holes.
Components connect between nodes.
Circuit analysis uses nodal analysis (KCL) for small DC circuits.

Sources:
  - Kirchhoff's current/voltage laws (classical circuit theory)
  - Nodal analysis: matrix solution for 2-6 node circuits
"""

import math


class BreadboardNode:
    """An electrical node on the breadboard (a set of connected holes)."""

    def __init__(self, node_id, name=""):
        self.id = node_id
        self.name = name
        self.voltage = 0.0
        self.components = []  # components connected to this node


class BreadboardComponent:
    """A component placed on the breadboard."""

    def __init__(self, comp_id, comp_type, value, node_a, node_b,
                 label="", **kwargs):
        self.id = comp_id
        self.type = comp_type  # 'resistor', 'led', 'battery', 'wire', etc.
        self.value = value  # resistance in ohms, voltage in V, etc.
        self.node_a = node_a
        self.node_b = node_b
        self.label = label
        self.current = 0.0  # calculated current (A)
        self.voltage_drop = 0.0  # calculated voltage drop (V)
        self.extra = kwargs

    def __repr__(self):
        return (f"BreadboardComponent(id={self.id}, type={self.type}, "
                f"value={self.value}, nA={self.node_a}, nB={self.node_b})")


class Breadboard:
    """Breadboard model: grid of holes organized as nodes.

    Standard breadboard layout:
      - Top power rail (+) : one continuous node
      - Bottom power rail (-) : one continuous node
      - Each row has two 5-hole strips (a-e connected, f-j connected)
    """

    def __init__(self, rows=30):
        self.rows = rows
        self.nodes = {}  # node_id -> BreadboardNode
        self.components = []  # list of BreadboardComponent
        self._build_default_nodes()

    def _build_default_nodes(self):
        """Create standard breadboard node topology."""
        # Power rails
        self.nodes["vcc"] = BreadboardNode("vcc", "Power Rail (+)")
        self.nodes["gnd"] = BreadboardNode("gnd", "Power Rail (-)")

        # Row strips: each row has 'left' (a-e) and 'right' (f-j) nodes
        for row in range(1, self.rows + 1):
            left_id = f"row{row}_left"
            right_id = f"row{row}_right"
            self.nodes[left_id] = BreadboardNode(left_id, f"Row {row} Left (a-e)")
            self.nodes[right_id] = BreadboardNode(right_id, f"Row {row} Right (f-j)")

    def hole_node(self, row, col):
        """Get node ID for a specific hole (row, col).
        col: 0=a, 1=b, 2=c, 3=d, 4=e, 5=f, 6=g, 7=h, 8=i, 9=j
        Plus: 'vcc' and 'gnd' for power rails.
        """
        if col < 0 or col >= 10:
            raise ValueError(f"Column must be 0-9, got {col}")
        if row < 1 or row > self.rows:
            raise ValueError(f"Row must be 1-{self.rows}, got {row}")

        # Power rails (rows below and above the main area)
        # Simplified: columns 0-4 are left strip, 5-9 are right strip
        if col <= 4:
            return f"row{row}_left"
        return f"row{row}_right"

    def add_component(self, comp_type, value, row_a, col_a, row_b, col_b,
                      label="", **kwargs):
        """Add a component between two holes."""
        node_a = self.hole_node(row_a, col_a)
        node_b = self.hole_node(row_b, col_b)
        comp_id = f"comp_{len(self.components) + 1}"

        comp = BreadboardComponent(comp_id, comp_type, value,
                                    node_a, node_b, label, **kwargs)
        self.components.append(comp)
        self.nodes[node_a].components.append(comp)
        self.nodes[node_b].components.append(comp)
        return comp

    def add_wire(self, row_a, col_a, row_b, col_b, label=""):
        """Add a wire (zero-resistance connection) between two holes."""
        return self.add_component("wire", 0.0, row_a, col_a, row_b, col_b, label)

    def add_resistor(self, resistance_ohm, row_a, col_a, row_b, col_b, label=""):
        return self.add_component("resistor", resistance_ohm,
                                  row_a, col_a, row_b, col_b, label)

    def add_battery(self, voltage_V, row_a, col_a, row_b, col_b, label=""):
        return self.add_component("battery", voltage_V,
                                  row_a, col_a, row_b, col_b, label)

    def add_led(self, forward_voltage_V, max_current_A,
                row_a, col_a, row_b, col_b, label=""):
        return self.add_component("led", forward_voltage_V,
                                  row_a, col_a, row_b, col_b, label,
                                  max_current=max_current_A)

    def _get_node_indices(self):
        """Map node IDs to matrix indices for nodal analysis."""
        # Only consider nodes that have components connected
        active_nodes = set()
        for comp in self.components:
            active_nodes.add(comp.node_a)
            active_nodes.add(comp.node_b)

        # GND is reference (0V), exclude from equations
        active_nodes.discard("gnd")
        active_nodes = sorted(active_nodes)
        return {nid: i for i, nid in enumerate(active_nodes)}, active_nodes

    def solve_dc(self):
        """Solve circuit using modified nodal analysis (DC only).

        Returns dict of node_id -> voltage, and updates component currents.
        For 2-6 node circuits. Larger circuits may be slow.
        Source: Modified Nodal Analysis (MNA), classical circuit theory.
        """
        if not self.components:
            return {}

        node_map, active_nodes = self._get_node_indices()
        n = len(active_nodes)
        if n == 0:
            return {}

        try:
            import numpy as np
            G = np.zeros((n, n))
            I = np.zeros(n)

            for comp in self.components:
                a = comp.node_a
                b = comp.node_b

                if comp.type == "resistor" or comp.type == "wire":
                    r = comp.value if comp.type == "resistor" else 1e-6
                    if r <= 0:
                        r = 1e-6
                    conductance = 1.0 / r

                    if a in node_map and b in node_map:
                        ia, ib = node_map[a], node_map[b]
                        G[ia, ia] += conductance
                        G[ib, ib] += conductance
                        G[ia, ib] -= conductance
                        G[ib, ia] -= conductance
                    elif a in node_map:
                        ia = node_map[a]
                        G[ia, ia] += conductance
                    elif b in node_map:
                        ib = node_map[b]
                        G[ib, ib] += conductance

                elif comp.type == "battery":
                    if a in node_map and b in node_map:
                        ia, ib = node_map[a], node_map[b]
                        G[ia, ia] += 1e6
                        G[ib, ib] += 1e6
                        G[ia, ib] -= 1e6
                        G[ib, ia] -= 1e6
                        I[ia] += 1e6 * comp.value
                    elif a in node_map:
                        ia = node_map[a]
                        G[ia, ia] += 1e6
                        I[ia] += 1e6 * comp.value
                    elif b in node_map:
                        ib = node_map[b]
                        G[ib, ib] += 1e6
                        I[ib] -= 1e6 * comp.value

                elif comp.type == "led":
                    r_led = 1.0
                    v_f = comp.value
                    if a in node_map and b in node_map:
                        ia, ib = node_map[a], node_map[b]
                        G[ia, ia] += 1.0 / r_led
                        G[ib, ib] += 1.0 / r_led
                        G[ia, ib] -= 1.0 / r_led
                        G[ib, ia] -= 1.0 / r_led
                        # Model forward voltage as voltage source
                        if v_f > 0:
                            G[ia, ia] += 1e6
                            G[ib, ib] += 1e6
                            G[ia, ib] -= 1e6
                            G[ib, ia] -= 1e6
                            I[ia] += 1e6 * v_f

            # Solve: G * V = I
            try:
                V = np.linalg.solve(G, I)
            except np.linalg.LinAlgError:
                V, _, _, _ = np.linalg.lstsq(G, I, rcond=None)

            voltages = {"gnd": 0.0}
            for i, nid in enumerate(active_nodes):
                voltages[nid] = V[i]

            # Update component currents and voltage drops
            for comp in self.components:
                v_a = voltages.get(comp.node_a, 0.0)
                v_b = voltages.get(comp.node_b, 0.0)
                comp.voltage_drop = v_a - v_b

                if comp.type == "resistor":
                    r = comp.value if comp.value > 0 else 1e-6
                    comp.current = comp.voltage_drop / r
                elif comp.type == "wire":
                    comp.current = 0
                elif comp.type == "led":
                    r_led = 1.0
                    comp.current = comp.voltage_drop / r_led if r_led > 0 else 0

            return voltages

        except ImportError:
            # Fallback: simple voltage divider for 2-resistor circuits
            return self._solve_simple()

        return {}

    def _solve_simple(self):
        """Simple fallback for basic circuits (no numpy)."""
        resistors = [c for c in self.components if c.type == "resistor"]
        batteries = [c for c in self.components if c.type == "battery"]

        voltages = {"gnd": 0.0, "vcc": 0.0}

        if batteries:
            batt = batteries[0]
            voltages[batt.node_a] = batt.value
            voltages[batt.node_b] = 0.0

        if len(resistors) == 1 and batteries:
            r = resistors[0]
            batt = batteries[0]
            v_supply = batt.value
            r_val = r.value
            r.current = v_supply / r_val if r_val > 0 else 0
            r.voltage_drop = v_supply

            if r.node_a in voltages:
                voltages[r.node_a] = v_supply
            if r.node_b in voltages:
                voltages[r.node_b] = v_supply - r.voltage_drop

        elif len(resistors) == 2 and batteries:
            r1, r2 = resistors[0], resistors[1]
            batt = batteries[0]
            v_in = batt.value
            r_total = r1.value + r2.value
            i = v_in / r_total if r_total > 0 else 0
            r1.current = i
            r2.current = i
            r1.voltage_drop = i * r1.value
            r2.voltage_drop = i * r2.value

            v_div = r2.value * v_in / r_total
            voltages[r1.node_a] = v_in
            if r1.node_b in batteries:
                voltages[r1.node_b] = v_div
            if r2.node_b in batteries:
                voltages[r2.node_b] = 0.0

        return voltages

    def led_current_resistor(self, supply_voltage, led_forward_v, led_current_A):
        """R = (Vsupply - Vled) / Iled - Calculate required series resistor."""
        if led_current_A <= 0:
            raise ValueError("LED current must be positive")
        return (supply_voltage - led_forward_v) / led_current_A
