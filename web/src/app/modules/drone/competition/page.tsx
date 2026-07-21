"use client";

import { Leaderboard } from "../../../../components/module-shell/Leaderboard";

export default function DroneCompetitionPage() {
  return (
    <Leaderboard
      title="Competition — Aerial Trial"
      moduleKey="drone"
      direction="max"
      metricLabel="T/W nisbati"
      mockEntries={[
        { name: "Alisher T.", value: 2.8 },
        { name: "Dilnoza R.", value: 2.3 },
        { name: "Javlon K.", value: 1.9 },
        { name: "Madina S.", value: 1.5 },
      ]}
      color="#f59e0b"
    />
  );
}
