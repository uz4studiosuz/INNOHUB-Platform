"""Truss analysis using method of joints for 2D trusses.

Sources:
  - Hibbeler, Engineering Mechanics: Statics (method of joints)
  - Beer & Johnston, Vector Mechanics for Engineers
"""

import math

from structures.beam_analysis import euler_buckling_load


class TrussMember:
    """Single truss member with end nodes and material properties."""

    def __init__(self, node_i, node_j, area_m2=1e-4, modulus_elasticity_pa=200e9,
                 yield_stress_pa=250e6, density_kg_m3=7850.0):
        self.node_i = node_i
        self.node_j = node_j
        self.area = area_m2
        self.E = modulus_elasticity_pa
        self.yield_stress = yield_stress_pa
        self.density = density_kg_m3
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

    def mass_kg(self, nodes):
        """m = L * A * rho - Member mass from its volume and material density."""
        return self.length(nodes) * self.area * self.density

    def moment_of_inertia_m4(self):
        """I = a^2 / 12, assuming a square cross-section of side a (a^2 = area).
        Used only for the Euler buckling check - real truss members (angle
        iron, tubes, etc.) have a different I for the same area, but a square
        section is a reasonable order-of-magnitude stand-in without asking
        the user for a cross-section shape.
        """
        return self.area ** 2 / 12.0

    def buckling_critical_load(self, nodes):
        """P_cr = pi^2 * E * I / L^2 - Euler critical buckling load.
        Only meaningful for members in compression.
        """
        L = self.length(nodes)
        return euler_buckling_load(self.E, self.moment_of_inertia_m4(), L)


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

    def add_member(self, node_i, node_j, area_m2=1e-4, E=200e9, yield_stress=250e6,
                    density_kg_m3=7850.0):
        member = TrussMember(node_i, node_j, area_m2, E, yield_stress, density_kg_m3)
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

    def total_mass_kg(self):
        """Sum of member masses (length * area * density) - the structure's own weight."""
        return sum(m.mass_kg(self.nodes) for m in self.members)

    def total_weight_N(self):
        return self.total_mass_kg() * 9.81

    def load_test(self):
        """Linear load test: solve once at the truss's currently-set reference
        load, then use proportional scaling (member forces in a linear truss
        scale linearly with the applied load) to find the load multiplier at
        which the first member fails - either by exceeding its material yield
        stress (tension or compression) or, for members in compression, by
        Euler buckling - whichever limit is lower.

        Returns a dict with the failure load, structure mass/efficiency, the
        index of the first member to fail, and per-member failure details.
        """
        self.solve()

        ref_load_magnitude = sum(math.hypot(fx, fy) for fx, fy in self.loads.values())
        if ref_load_magnitude <= 0:
            raise ValueError("Load test requires at least one non-zero reference load")

        mass_kg = self.total_mass_kg()
        weight_N = mass_kg * 9.81

        member_results = []
        best_scale = float("inf")
        failing_index = None

        for i, m in enumerate(self.members):
            f = m.force
            axial_limit_N = m.yield_stress * m.area
            is_buckling = False

            if f < 0:
                p_cr = m.buckling_critical_load(self.nodes)
                limit_N = min(axial_limit_N, p_cr)
                is_buckling = p_cr < axial_limit_N
            else:
                limit_N = axial_limit_N

            if abs(f) < 1e-9:
                member_scale = float("inf")
            else:
                member_scale = limit_N / abs(f)

            member_failure_load_N = (
                ref_load_magnitude * member_scale if member_scale != float("inf") else float("inf")
            )

            member_results.append({
                "force_N": f,
                "stress_Pa": m.stress(),
                "in_tension": m.is_tension(),
                "is_buckling": is_buckling,
                "member_failure_load_N": member_failure_load_N,
            })

            if member_scale < best_scale:
                best_scale = member_scale
                failing_index = i

        failure_load_N = ref_load_magnitude * best_scale
        efficiency = failure_load_N / weight_N if weight_N > 0 else float("inf")

        return {
            "failure_load_N": failure_load_N,
            "structure_mass_kg": mass_kg,
            "efficiency": efficiency,
            "failing_member_index": failing_index,
            "members": member_results,
        }


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
