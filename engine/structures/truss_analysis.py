"""Truss analysis using method of joints for 2D trusses.

Sources:
  - Hibbeler, Engineering Mechanics: Statics (method of joints)
  - Beer & Johnston, Vector Mechanics for Engineers
"""

import math


class TrussMember:
    """Single truss member with end nodes and material properties."""

    def __init__(self, node_i, node_j, area_m2=1e-4, modulus_elasticity_pa=200e9,
                 yield_stress_pa=250e6):
        self.node_i = node_i
        self.node_j = node_j
        self.area = area_m2
        self.E = modulus_elasticity_pa
        self.yield_stress = yield_stress_pa
        self.force = 0.0  # + = tension, - = compression

    def length(self, nodes):
        """Calculate member length from node coordinates."""
        xi, yi = nodes[self.node_i]
        xj, yj = nodes[self.node_j]
        return math.sqrt((xj - xi) ** 2 + (yj - yi) ** 2)

    def direction_vector(self, nodes):
        """Unit vector from node_i to node_j."""
        xi, yi = nodes[self.node_i]
        xj, yj = nodes[self.node_j]
        L = self.length(nodes)
        if L == 0:
            return (0.0, 0.0)
        return ((xj - xi) / L, (yj - yi) / L)

    def stress(self):
        """sigma = F / A - Axial stress (Pa)."""
        if self.area == 0:
            return 0.0
        return self.force / self.area

    def safety_factor(self):
        """SF = sigma_yield / |sigma| - Factor of safety."""
        s = abs(self.stress())
        if s == 0:
            return float("inf")
        return self.yield_stress / s

    def is_tension(self):
        return self.force > 0

    def is_compression(self):
        return self.force < 0


class Truss:
    """2D truss structure with nodes and members.

    Nodes are indexed 0..n-1. Members connect pairs of nodes.
    Supports and loads are applied at nodes.
    """

    def __init__(self):
        self.nodes = []  # list of (x, y)
        self.members = []  # list of TrussMember
        self.supports = {}  # node_idx -> ('pin'|'roller_h'|'roller_v')
        self.loads = {}  # node_idx -> (fx, fy)

    def add_node(self, x, y):
        idx = len(self.nodes)
        self.nodes.append((x, y))
        return idx

    def add_member(self, node_i, node_j, area_m2=1e-4, E=200e9, yield_stress=250e6):
        member = TrussMember(node_i, node_j, area_m2, E, yield_stress)
        self.members.append(member)
        return len(self.members) - 1

    def add_pin_support(self, node_idx):
        """Pin support: prevents translation in x and y."""
        self.supports[node_idx] = 'pin'

    def add_roller_support_h(self, node_idx):
        """Roller support: prevents y translation, free x."""
        self.supports[node_idx] = 'roller_h'

    def add_roller_support_v(self, node_idx):
        """Roller support: prevents x translation, free y."""
        self.supports[node_idx] = 'roller_v'

    def add_load(self, node_idx, fx=0.0, fy=0.0):
        self.loads[node_idx] = (fx, fy)

    def solve(self):
        """Solve truss using method of joints (equilibrium at each node).

        Returns list of member forces (+ = tension, - = compression).
        Source: Hibbeler, Engineering Mechanics: Statics, Method of Joints.
        """
        n_nodes = len(self.nodes)
        n_members = len(self.members)

        # Build equilibrium equations: 2*n_nodes equations
        # Unknowns: member forces (n_members) + reaction forces (2*supports)
        support_count = sum(2 if s == 'pin' else 1 for s in self.supports.values())
        n_unknowns = n_members + support_count

        A = [[0.0] * n_unknowns for _ in range(2 * n_nodes)]
        b = [0.0] * (2 * n_nodes)

        # Fill member force contributions
        col = 0
        for mi, member in enumerate(self.members):
            dx, dy = member.direction_vector(self.nodes)
            i, j = member.node_i, member.node_j
            # At node i: force pushes away from member (compression negative)
            A[2 * i][col] = dx
            A[2 * i + 1][col] = dy
            # At node j: force pulls toward member (tension positive)
            A[2 * j][col] = -dx
            A[2 * j + 1][col] = -dy
            col += 1

        # Fill support reaction contributions
        reaction_col = col
        sup_map = {}
        for node_idx, sup_type in self.supports.items():
            if sup_type == 'pin':
                sup_map[(node_idx, 'x')] = reaction_col
                A[2 * node_idx][reaction_col] = 1
                reaction_col += 1
                sup_map[(node_idx, 'y')] = reaction_col
                A[2 * node_idx + 1][reaction_col] = 1
                reaction_col += 1
            elif sup_type == 'roller_h':
                sup_map[(node_idx, 'y')] = reaction_col
                A[2 * node_idx + 1][reaction_col] = 1
                reaction_col += 1
            elif sup_type == 'roller_v':
                sup_map[(node_idx, 'x')] = reaction_col
                A[2 * node_idx][reaction_col] = 1
                reaction_col += 1

        # Fill load vector (negated, moved to RHS)
        for node_idx, (fx, fy) in self.loads.items():
            b[2 * node_idx] = -fx
            b[2 * node_idx + 1] = -fy

        x = _least_squares_solve(A, b)

        # Extract member forces
        for mi in range(n_members):
            self.members[mi].force = x[mi]

        return [m.force for m in self.members]


def _gaussian_solve(a, b):
    """Solve a square linear system Ax = b via Gaussian elimination with
    partial pivoting. Pure Python (no numpy) so it has no compiled
    dependency to load.
    """
    n = len(a)
    aug = [row[:] + [b[i]] for i, row in enumerate(a)]

    for col in range(n):
        pivot_row = max(range(col, n), key=lambda r: abs(aug[r][col]))
        if abs(aug[pivot_row][col]) < 1e-9:
            raise ValueError("Truss solution failed - check supports and geometry")
        aug[col], aug[pivot_row] = aug[pivot_row], aug[col]

        pivot = aug[col][col]
        aug[col] = [v / pivot for v in aug[col]]

        for r in range(n):
            if r != col:
                factor = aug[r][col]
                if factor != 0:
                    aug[r] = [aug[r][k] - factor * aug[col][k] for k in range(n + 1)]

    return [aug[i][n] for i in range(n)]


def _least_squares_solve(a, b):
    """Solve Ax = b, falling back to the normal-equations least-squares
    solution (A^T A x = A^T b) when the system is not square (e.g. an
    over- or under-supported truss).
    """
    n_rows = len(a)
    n_cols = len(a[0]) if n_rows else 0

    if n_rows == n_cols:
        return _gaussian_solve(a, b)

    ata = [[sum(a[k][i] * a[k][j] for k in range(n_rows)) for j in range(n_cols)]
           for i in range(n_cols)]
    atb = [sum(a[k][i] * b[k] for k in range(n_rows)) for i in range(n_cols)]
    return _gaussian_solve(ata, atb)
