"use client";

import { Leaderboard } from "../../../../components/module-shell/Leaderboard";

export default function ElectronicsCompetitionPage() {
  return (
    <Leaderboard
      title="Competition — Circuit Challenge"
      moduleKey="electronics"
      direction="max"
      metricLabel="LED zapas toki (mA)"
      unit=" mA"
      mockEntries={[
        { name: "Alisher T.", value: 12.4 },
        { name: "Dilnoza R.", value: 9.1 },
        { name: "Javlon K.", value: 6.7 },
        { name: "Madina S.", value: 3.2 },
      ]}
      color="#059669"
    />
  );
}
