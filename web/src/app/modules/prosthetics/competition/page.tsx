"use client";

import { Leaderboard } from "../../../../components/module-shell/Leaderboard";

export default function ProstheticsCompetitionPage() {
  return (
    <Leaderboard
      title="Competition — Grip Challenge"
      moduleKey="prosthetics"
      direction="max"
      metricLabel="Xavfsizlik koeffitsienti"
      mockEntries={[
        { name: "Alisher T.", value: 4.2 },
        { name: "Dilnoza R.", value: 3.5 },
        { name: "Javlon K.", value: 2.8 },
        { name: "Madina S.", value: 2.1 },
      ]}
      color="#0d9488"
    />
  );
}
