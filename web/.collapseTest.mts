import { createCollapse, stepCollapse } from './src/components/structures-lab/engineering/trussCollapse';
import type { TrussNode, TrussMemberDraft } from './src/components/structures-lab/engineering/types';

let fails = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ' :: ' + d : ''}`); if (!ok) fails++; };

const mk = (id: string, x: number, y: number, support: TrussNode['support'] = 'none'): TrussNode =>
  ({ id, x, y, support, loadFx: 0, loadFy: 0 });
const link = (id: string, a: string, b: string): TrussMemberDraft =>
  ({ id, nodeA: a, nodeB: b, areaM2: 1e-5, yieldStrengthPa: 276e6, E: 68.9e9, densityKgM3: 2700, materialLabel: 'Alyuminiy 6061' });

// Warren truss: 5 joints, pin at n0, roller at n4, ground 120 px below.
const nodes = [mk('n0', 0, 300, 'pin'), mk('n1', 60, 240), mk('n2', 120, 300), mk('n3', 180, 240), mk('n4', 240, 300, 'roller_h')];
const members = [
  link('m0','n0','n1'), link('m1','n1','n2'), link('m2','n2','n3'),
  link('m3','n3','n4'), link('m4','n0','n2'), link('m5','n2','n4'), link('m6','n1','n3'),
];
const GROUND = 420;

// 1. Nothing broken -> the truss must hold its shape (supports carry it).
{
  const st = createCollapse(nodes, members, new Set());
  for (let i = 0; i < 300; i++) stepCollapse(st, 1/60, GROUND);
  const drop = Math.max(...st.nodes.map((n, i) => n.y - nodes[i].y));
  check('intact truss barely moves', drop < 12, `max drop ${drop.toFixed(2)} px`);
  check('pinned nodes never move',
    st.nodes.filter(n => n.pinned).every((n, i) => {
      const orig = nodes.filter(o => o.support !== 'none')[i];
      return n.x === orig.x && n.y === orig.y;
    }));
  const spans = st.links.filter(l => !l.broken).map(l => {
    const a = st.nodes[l.a], b = st.nodes[l.b];
    return Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - l.restLength);
  });
  check('members keep their length', Math.max(...spans) < 2.0, `max stretch ${Math.max(...spans).toFixed(2)} px`);
}

// 2. Break the bottom chord -> the bridge must actually collapse.
{
  const st = createCollapse(nodes, members, new Set(['m4', 'm5']));
  for (let i = 0; i < 600; i++) stepCollapse(st, 1/60, GROUND);
  const drop = Math.max(...st.nodes.map((n, i) => n.y - nodes[i].y));
  check('broken truss collapses', drop > 60, `max drop ${drop.toFixed(1)} px`);
  check('nothing falls through the ground', st.nodes.every(n => n.y <= GROUND + 0.01),
    `lowest ${Math.max(...st.nodes.map(n => n.y)).toFixed(1)} vs ground ${GROUND}`);
  check('simulation settles', st.settled, `after ${st.elapsed.toFixed(1)} s`);
  const intact = st.links.filter(l => !l.broken).map(l => {
    const a = st.nodes[l.a], b = st.nodes[l.b];
    return Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - l.restLength);
  });
  check('surviving members stay rigid', Math.max(...intact) < 3.0, `max stretch ${Math.max(...intact).toFixed(2)} px`);
}

// 3. Everything broken -> free fall to the ground.
{
  const st = createCollapse(nodes, members, new Set(members.map(m => m.id)));
  for (let i = 0; i < 600; i++) stepCollapse(st, 1/60, GROUND);
  const free = st.nodes.filter(n => !n.pinned);
  check('fully broken truss falls to the ground', free.every(n => n.y > GROUND - 1), 
    `lowest free node ${Math.min(...free.map(n => n.y)).toFixed(1)}`);
}

// 4. No NaN anywhere, ever.
{
  const st = createCollapse(nodes, members, new Set(['m1']));
  for (let i = 0; i < 900; i++) stepCollapse(st, 1/60, GROUND);
  check('no NaN in the simulation', st.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails ? 1 : 0);
