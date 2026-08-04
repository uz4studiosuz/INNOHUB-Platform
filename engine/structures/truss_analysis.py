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

    def stability_check(self):
        """Static determinacy check: m + r vs 2j (Hibbeler, Statics - the
        method of joints needs exactly 2j independent equilibrium equations).
          m + r < 2j  -> unstable (mechanism): too few members/supports
          m + r = 2j  -> statically determinate: solvable by method of joints
          m + r > 2j  -> statically indeterminate: more restraints than needed
        j = joints (nodes), m = members, r = reaction components contributed
        by supports (pin = 2, roller = 1).
        """
        j = len(self.nodes)
        m = len(self.members)
        r = sum(2 if s == 'pin' else 1 for s in self.supports.values())
        two_j = 2 * j
        m_plus_r = m + r

        if m_plus_r < two_j:
            status = 'unstable'
        elif m_plus_r == two_j:
            status = 'determinate'
        else:
            status = 'indeterminate'

        return {
            'joints': j,
            'members': m,
            'reactions': r,
            'two_j': two_j,
            'm_plus_r': m_plus_r,
            'status': status,
        }

    def solve(self):
        """Solve truss using method of joints (equilibrium at each node).

        Returns list of member forces (+ = tension, - = compression).
        Source: Hibbeler, Engineering Mechanics: Statics, Method of Joints.
        """
        check = self.stability_check()
        if check['status'] == 'unstable':
            missing = check['two_j'] - check['m_plus_r']
            raise ValueError(
                f"Structure is unstable (mechanism): m + r = {check['m_plus_r']}, "
                f"need 2j = {check['two_j']} (missing {missing} member(s)/reaction(s)). "
                f"Add more members or supports."
            )
        if check['status'] == 'indeterminate':
            extra = check['m_plus_r'] - check['two_j']
            raise ValueError(
                f"Structure is statically indeterminate: m + r = {check['m_plus_r']}, "
                f"but 2j = {check['two_j']} ({extra} redundant member(s)/reaction(s)). "
                f"Method of joints cannot solve this - remove a member or support."
            )

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

        try:
            x = _least_squares_solve(A, b)
        except ValueError:
            # The joint count passed (m + r = 2j), so this is a geometric/form
            # instability the counting rule can't catch - e.g. members at a
            # joint are collinear, or a group of members is parallel and
            # can't resist load in the perpendicular direction.
            raise ValueError(
                "Structure passes the joint count (m + r = 2j) but this specific member "
                "layout is still geometrically unstable (e.g. members meeting at a joint "
                "are collinear, or don't triangulate in some direction). Reposition nodes "
                "so members form clear triangles rather than straight chains."
            )

        # Extract member forces
        for mi in range(n_members):
            self.members[mi].force = x[mi]

        return [m.force for m in self.members]

    def solve_stiffness(self):
        """Solve the truss by the direct stiffness method (matrix FEA).

        Why this exists alongside solve(): the method of joints only works for
        statically *determinate* trusses (m + r = 2j). Anything with a
        redundant member or an extra support - which is most real bridges, and
        a very common thing for a student to draw - made solve() raise, so the
        whole analysis refused to run. The stiffness method has no such limit:
        it solves determinate and indeterminate structures with the same
        equations, because it brings in member stiffness (EA/L) as the extra
        information that equilibrium alone lacks.

        It also returns joint displacements, which the method of joints never
        computes - those are what a deflected-shape drawing needs.

        Method (standard matrix structural analysis):
          For each member, in global coordinates,
            k = (EA/L) * [[ c2,  cs, -c2, -cs],
                          [ cs,  s2, -cs, -s2],
                          [-c2, -cs,  c2,  cs],
                          [-cs, -s2,  cs,  s2]]
          where c = cos(theta), s = sin(theta), c2 = c^2, s2 = s^2.
          Assemble into the global K, delete restrained DOFs, solve K u = F,
          then recover each member's axial force as (EA/L) * (relative axial
          displacement of its two ends).

        Sources: Kassimali, Matrix Analysis of Structures; McGuire, Gallagher
        & Ziemian, Matrix Structural Analysis.

        Returns {'forces': [...], 'displacements': [(dx, dy), ...],
                 'reactions': {node_idx: (rx, ry)}}
        Raises ValueError if the structure is a mechanism (singular K).
        """
        n = len(self.nodes)
        ndof = 2 * n

        K = [[0.0] * ndof for _ in range(ndof)]

        for member in self.members:
            L = member.length(self.nodes)
            if L == 0:
                raise ValueError(
                    "A member has zero length (both ends on the same joint). "
                    "Move one of its end joints."
                )
            c, s = member.direction_vector(self.nodes)
            k_axial = member.E * member.area / L
            c2, s2, cs = c * c, s * s, c * s

            i, j = member.node_i, member.node_j
            dofs = [2 * i, 2 * i + 1, 2 * j, 2 * j + 1]
            ke = [
                [c2, cs, -c2, -cs],
                [cs, s2, -cs, -s2],
                [-c2, -cs, c2, cs],
                [-cs, -s2, cs, s2],
            ]
            for a in range(4):
                for b_ in range(4):
                    K[dofs[a]][dofs[b_]] += k_axial * ke[a][b_]

        # Restrained DOFs come from the supports.
        fixed = set()
        for node_idx, sup_type in self.supports.items():
            if sup_type == 'pin':
                fixed.add(2 * node_idx)
                fixed.add(2 * node_idx + 1)
            elif sup_type == 'roller_h':   # blocks vertical translation
                fixed.add(2 * node_idx + 1)
            elif sup_type == 'roller_v':   # blocks horizontal translation
                fixed.add(2 * node_idx)

        free = [d for d in range(ndof) if d not in fixed]
        if not free:
            # Everything is pinned down: no displacement anywhere, no forces.
            for m in self.members:
                m.force = 0.0
            return {
                'forces': [0.0] * len(self.members),
                'displacements': [(0.0, 0.0)] * n,
                'reactions': {idx: (0.0, 0.0) for idx in self.supports},
            }

        F = [0.0] * ndof
        for node_idx, (fx, fy) in self.loads.items():
            F[2 * node_idx] += fx
            F[2 * node_idx + 1] += fy

        Kff = [[K[r][c_] for c_ in free] for r in free]
        Ff = [F[r] for r in free]

        try:
            uf = _gaussian_solve(Kff, Ff)
        except ValueError:
            # A singular stiffness matrix means some joint (or the whole
            # structure) can move without any member resisting it - a
            # mechanism. The joint count may still look fine, so this catches
            # geometric instabilities that counting cannot.
            raise ValueError(
                "Structure is a mechanism: some joint can move freely because no "
                "member or support resists it. Add a member or a support so every "
                "joint is triangulated."
            )

        u = [0.0] * ndof
        for slot, dof in enumerate(free):
            u[dof] = uf[slot]

        # Member axial forces from the end displacements.
        forces = []
        for member in self.members:
            L = member.length(self.nodes)
            c, s = member.direction_vector(self.nodes)
            i, j = member.node_i, member.node_j
            # Elongation = (displacement of j - displacement of i) along the axis.
            elongation = (u[2 * j] - u[2 * i]) * c + (u[2 * j + 1] - u[2 * i + 1]) * s
            member.force = (member.E * member.area / L) * elongation
            forces.append(member.force)

        # Reactions at the restrained DOFs: R = K u - F.
        reactions = {}
        for node_idx in self.supports:
            rx = sum(K[2 * node_idx][d] * u[d] for d in range(ndof)) - F[2 * node_idx]
            ry = sum(K[2 * node_idx + 1][d] * u[d] for d in range(ndof)) - F[2 * node_idx + 1]
            reactions[node_idx] = (rx, ry)

        displacements = [(u[2 * i], u[2 * i + 1]) for i in range(n)]
        return {'forces': forces, 'displacements': displacements, 'reactions': reactions}

    def deck_node_indices(self):
        """The bottom chord - the joints a vehicle actually drives on.

        Found geometrically as the joints sharing the lowest y in the design,
        ordered left to right. A truss can be drawn anywhere on the canvas, so
        this cannot be a fixed list; it has to come from the geometry.
        """
        if not self.nodes:
            return []
        min_y = min(y for _, y in self.nodes)
        tol = 1e-6
        deck = [i for i, (_, y) in enumerate(self.nodes) if abs(y - min_y) <= tol]
        deck.sort(key=lambda i: self.nodes[i][0])
        return deck

    def apply_vehicle_load(self, total_load_N, position_ratio):
        """Place a vehicle of `total_load_N` on the deck at `position_ratio`
        (0 = left abutment, 1 = right abutment), replacing any existing loads.

        A wheel that sits between two joints does not load the deck at that
        point - a truss can only take load at its joints, so the weight splits
        between the two neighbouring joints in inverse proportion to distance.
        This is the standard panel-point distribution, and it is why a load in
        mid-panel produces different member forces than the same load directly
        over a joint.
        """
        deck = self.deck_node_indices()
        self.loads = {}
        if not deck or total_load_N <= 0:
            return

        if len(deck) == 1:
            self.loads[deck[0]] = (0.0, -total_load_N)
            return

        x_left = self.nodes[deck[0]][0]
        x_right = self.nodes[deck[-1]][0]
        x = x_left + (x_right - x_left) * max(0.0, min(1.0, position_ratio))

        # Find the panel containing x.
        for k in range(len(deck) - 1):
            i, j = deck[k], deck[k + 1]
            xi, xj = self.nodes[i][0], self.nodes[j][0]
            if xi <= x <= xj or k == len(deck) - 2:
                span = xj - xi
                t = 0.0 if span == 0 else (x - xi) / span
                t = max(0.0, min(1.0, t))
                self.loads[i] = (0.0, -total_load_N * (1 - t))
                self.loads[j] = (0.0, -total_load_N * t)
                return

    def moving_load_test(self, total_load_N, steps=21):
        """Drive `total_load_N` across the deck and report the worst position.

        Real bridges are not checked at one load position - a member that is
        barely stressed with the lorry at midspan can be the critical one when
        it sits over a quarter point. Engineers use influence lines for exactly
        this. Here the load is stepped across the span and every member's worst
        utilisation across all positions is kept, so the reported result is the
        governing case rather than an arbitrary snapshot.

        Returns the same shape as load_test(), plus `worst_position_ratio`.
        """
        if not self.members:
            raise ValueError("Truss has no members")
        if total_load_N <= 0:
            raise ValueError("Vehicle load must be greater than zero")

        n = len(self.members)
        # Per-member worst case seen at any load position.
        worst_force = [0.0] * n
        worst_util = [0.0] * n
        worst_buckling = [False] * n
        limits = [0.0] * n

        governing_index = None
        governing_util = 0.0
        governing_ratio = 0.0
        governing_displacements = None

        for step in range(steps):
            ratio = step / (steps - 1) if steps > 1 else 0.5
            self.apply_vehicle_load(total_load_N, ratio)
            result = self.solve_stiffness()

            step_worst = 0.0
            for i, m in enumerate(self.members):
                f = m.force
                axial_limit = m.yield_stress * m.area
                if f < 0:
                    p_cr = m.buckling_critical_load(self.nodes)
                    limit = min(axial_limit, p_cr)
                    buckles = p_cr < axial_limit
                else:
                    limit = axial_limit
                    buckles = False

                util = abs(f) / limit if limit > 0 else 0.0
                if util > worst_util[i]:
                    worst_util[i] = util
                    worst_force[i] = f
                    worst_buckling[i] = buckles
                    limits[i] = limit
                elif limits[i] == 0.0:
                    limits[i] = limit
                step_worst = max(step_worst, util)

            if step_worst > governing_util:
                governing_util = step_worst
                governing_ratio = ratio
                governing_index = max(range(n), key=lambda i: worst_util[i])
                governing_displacements = result["displacements"]

        # Restore the governing position so the reported displacements and the
        # stored member forces describe the same instant.
        self.apply_vehicle_load(total_load_N, governing_ratio)
        final = self.solve_stiffness()
        if governing_displacements is None:
            governing_displacements = final["displacements"]

        mass_kg = self.total_mass_kg()
        weight_N = mass_kg * 9.81

        member_results = []
        for i, m in enumerate(self.members):
            limit = limits[i]
            util = worst_util[i]
            member_results.append({
                "force_N": worst_force[i],
                "stress_Pa": worst_force[i] / m.area if m.area else 0.0,
                "in_tension": worst_force[i] > 0,
                "is_buckling": worst_buckling[i],
                "member_failure_load_N": (total_load_N / util) if util > 0 else float("inf"),
                "length_m": m.length(self.nodes),
                "mass_kg": m.mass_kg(self.nodes),
                "axial_capacity_N": m.yield_stress * m.area,
                "buckling_capacity_N": m.buckling_critical_load(self.nodes) if worst_force[i] < 0 else float("inf"),
                "governing_limit_N": limit,
                "utilisation": util,
                "safety_factor": (1.0 / util) if util > 0 else float("inf"),
            })

        # Capacity: scale the vehicle until the worst member just reaches its
        # limit. Note this is a property of the BRIDGE - it does not change
        # when a heavier vehicle is chosen, which is exactly right: a heavier
        # lorry does not make the bridge weaker, it just uses more of it up.
        failure_load_N = (total_load_N / governing_util) if governing_util > 0 else float("inf")
        efficiency = failure_load_N / weight_N if weight_N > 0 else float("inf")

        return {
            "failure_load_N": failure_load_N,
            "structure_mass_kg": mass_kg,
            "efficiency": efficiency,
            "failing_member_index": governing_index,
            "members": member_results,
            "displacements": governing_displacements,
            "reactions": final["reactions"],
            "stability": self.stability_check(),
            "reference_load_N": total_load_N,
            "worst_position_ratio": governing_ratio,
        }

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

        Solved by the stiffness method rather than the method of joints so a
        redundant member or an extra support no longer blocks the analysis -
        see solve_stiffness(). The determinacy status is still reported, since
        it tells the student something real about their design, but it is
        information now, not a refusal.
        """
        stability = self.stability_check()
        result = self.solve_stiffness()

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

            length_m = m.length(self.nodes)
            p_cr = m.buckling_critical_load(self.nodes) if f < 0 else float("inf")

            member_results.append({
                "force_N": f,
                "stress_Pa": m.stress(),
                "in_tension": m.is_tension(),
                "is_buckling": is_buckling,
                "member_failure_load_N": member_failure_load_N,
                # Per-member detail so the UI can show *why* a member is the
                # weak one, not just that it is: its length, its own capacity
                # in yield and in buckling, and how much of that is used up.
                "length_m": length_m,
                "mass_kg": m.mass_kg(self.nodes),
                "axial_capacity_N": axial_limit_N,
                "buckling_capacity_N": p_cr,
                "governing_limit_N": limit_N,
                "utilisation": abs(f) / limit_N if limit_N > 0 else 0.0,
                "safety_factor": (limit_N / abs(f)) if abs(f) > 1e-9 else float("inf"),
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
            # Deflected shape, in metres, for the drawing.
            "displacements": result["displacements"],
            "reactions": {str(k): v for k, v in result["reactions"].items()},
            "stability": stability,
            "reference_load_N": ref_load_magnitude,
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
