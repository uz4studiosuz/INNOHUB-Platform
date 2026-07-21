"use client";

import { Leaderboard } from "../../../../components/module-shell/Leaderboard";

export default function RoverCompetitionPage() {
  return (
    <Leaderboard
      title="Competition — Mars Rally"
      moduleKey="rover"
      direction="max"
      metricLabel="Masofa (m)"
      unit=" m"
      mockEntries={[
        { name: "Alisher T.", value: 42.5 },
        { name: "Dilnoza R.", value: 35.1 },
        { name: "Javlon K.", value: 28.7 },
        { name: "Madina S.", value: 21.3 },
      ]}
      color="#ea580c"
    />
  );
}
