"use client";

import { Leaderboard } from "../../../../components/module-shell/Leaderboard";

export default function PhysicsLabCompetitionPage() {
  return (
    <Leaderboard
      title="Competition — Physics Bowl"
      moduleKey="physics-lab"
      direction="max"
      metricLabel="Oxirgi tajriba natijasi (birligi tajribaga bog'liq)"
      mockEntries={[
        { name: "Alisher T.", value: 87 },
        { name: "Dilnoza R.", value: 64 },
        { name: "Javlon K.", value: 51 },
        { name: "Madina S.", value: 38 },
      ]}
      color="#65a30d"
    />
  );
}
