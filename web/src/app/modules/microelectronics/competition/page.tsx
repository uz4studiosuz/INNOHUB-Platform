"use client";

import { Leaderboard } from "../../../../components/module-shell/Leaderboard";

export default function MicroelectronicsCompetitionPage() {
  return (
    <Leaderboard
      title="Competition — Power Budget Challenge"
      moduleKey="microelectronics"
      direction="max"
      metricLabel="Batareya muddati (soat)"
      unit=" soat"
      mockEntries={[
        { name: "Alisher T.", value: 48.2 },
        { name: "Dilnoza R.", value: 31.5 },
        { name: "Javlon K.", value: 22.8 },
        { name: "Madina S.", value: 14.1 },
      ]}
      color="#0891b2"
    />
  );
}
