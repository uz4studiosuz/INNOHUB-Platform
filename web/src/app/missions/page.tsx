"use client";

import { useCallback, useState } from "react";
import MissionCard from "@/components/missions/MissionCard";
import { ALL_MISSIONS, getScore, getTotalMissions } from "@/lib/missions/missions";

export default function MissionsPage() {
  const [score, setScore] = useState(getScore());
  const total = getTotalMissions();

  const handleScoreChange = useCallback(() => {
    setScore(getScore());
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Missiyalar</h1>
        <p className="text-lg text-gray-600">
          Progress: {score} / {total} mission
        </p>
        <div className="mt-2 h-3 w-64 rounded-full bg-gray-300 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${total > 0 ? (score / total) * 100 : 0}%` }}
          />
        </div>
      </header>

      {Object.entries(ALL_MISSIONS).map(([module, missions]) => (
        <section key={module} className="mb-8">
          <h2 className="text-xl font-bold capitalize mb-4 text-gray-700">{module}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {missions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onScoreChange={handleScoreChange}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
