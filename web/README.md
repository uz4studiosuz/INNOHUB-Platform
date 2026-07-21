This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Physics architecture: which module uses which source of truth

This app computes results two different ways, and the split is intentional rather than
accidental:

| Module | Physics source | Why |
|---|---|---|
| `glider` | Client-side TypeScript (`src/lib/physics/gliderPhysics.ts`) | Needs sub-frame-rate feedback while the user drags 3D sliders (wingspan, dihedral, stab area) — a network round-trip per slider tick would feel laggy. |
| `rockets` | Client-side TypeScript (`src/lib/physics/rocketPhysics.ts`) | Same real-time-3D-preview requirement as glider (nose cone / fin / body-tube dimensions update the render live). |
| `drone`, `rover`, `prosthetics`, `physics-lab`, `electronics`, `microelectronics`, `structures` (truss), `structure` (beam/column) | Python engine via `POST /api/simulate` (`web/src/app/api/simulate/route.ts` → `web/src/lib/pythonRunner.ts` → `engine/run_sim.py`) | These are "set parameters, press Calculate" workflows (no live 3D drag-to-update loop), so a round-trip to the Python engine is the right cost to pay in exchange for one number-crunching implementation that's also covered by `engine/tests/` (`pytest`, 300+ tests). |

**Source of truth for numeric correctness is the Python engine (`engine/`).** It's the only
side with a test suite. `glider`/`rockets` intentionally duplicate a subset of that math in
TypeScript for real-time 3D preview — if you change a formula in `engine/`, check whether the
equivalent client-side formula in `gliderPhysics.ts` / `rocketPhysics.ts` needs the same fix
(there is currently no automated cross-check between the two; the Python and Glider/Rocket
`/api/simulate` modules exist and can be called from the browser console to spot-check
divergence manually).

All client-side physics helpers (including `gliderPhysics` and `rocketPhysics`) are re-exported
from the `src/lib/physics/index.ts` barrel, so `import { ... } from "@/lib/physics"` works
regardless of which file a helper actually lives in.
