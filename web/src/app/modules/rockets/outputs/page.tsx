"use client";

import React from "react";
import { useRocketStore } from "../../../../store/rocketStore";

export default function OutputsPage() {
  const store = useRocketStore();
  const analysis = store.analysis;
  const limits = {
    airPressurePsi: 60,
    noseLengthMm: 228,
    numberOfFins: 4,
    parachuteDiameterMm: 241.3,
    budgetUsd: 6.0,
  };

  return (
    <div className="absolute inset-0 bg-[#f8f8f8] overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto bg-white p-8 shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Design Specifications Report</h1>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-700 mb-4 bg-gray-100 p-2">Allowables</h2>
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-300">
                <th className="p-2 w-1/3">Criteria</th>
                <th className="p-2 w-1/3">Allowed</th>
                <th className="p-2 w-1/3">Designed</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="p-2">Parachute Recovery</td>
                <td className="p-2">Yes</td>
                <td className="p-2">{store.recovery.system === "parachute" ? "Yes" : "No"}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-2">Bottle Size</td>
                <td className="p-2">20oz, 1L, 2L</td>
                <td className="p-2">{store.propulsion.bottleSize}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-2">Parachute Deploy Status</td>
                <td className="p-2 text-green-600">Will Deploy</td>
                <td className={`p-2 font-bold ${analysis.deployStatus === "Will Deploy" ? "text-green-600" : "text-red-600"}`}>
                  {analysis.deployStatus}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-700 mb-4 bg-gray-100 p-2">Rocket Design Inputs</h2>
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-300">
                <th className="p-2 w-1/4">Input</th>
                <th className="p-2 w-1/4">Minimum</th>
                <th className="p-2 w-1/4">Maximum</th>
                <th className="p-2 w-1/4">Designed</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="p-2">Air Pressure (psi)</td>
                <td className="p-2">-</td>
                <td className="p-2">{limits.airPressurePsi}</td>
                <td className={`p-2 font-bold ${store.propulsion.pressurePsi > limits.airPressurePsi ? "text-red-600" : "text-gray-800"}`}>
                  {store.propulsion.pressurePsi}
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-2">Number of Fins</td>
                <td className="p-2">-</td>
                <td className="p-2">{limits.numberOfFins}</td>
                <td className={`p-2 font-bold ${store.fins.count > limits.numberOfFins ? "text-red-600" : "text-gray-800"}`}>
                  {store.fins.count}
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-2">Parachute Diameter (mm)</td>
                <td className="p-2">-</td>
                <td className="p-2">{limits.parachuteDiameterMm}</td>
                <td className={`p-2 font-bold ${store.recovery.parachuteSizeMm > limits.parachuteDiameterMm ? "text-red-600" : "text-gray-800"}`}>
                  {store.recovery.parachuteSizeMm}
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-2">Budget ($)</td>
                <td className="p-2">-</td>
                <td className="p-2">{limits.budgetUsd}</td>
                <td className={`p-2 font-bold ${analysis.designCostUsd > limits.budgetUsd ? "text-red-600" : "text-gray-800"}`}>
                  {analysis.designCostUsd.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-700 mb-4 bg-gray-100 p-2">Overall Status</h2>
          <div className="p-4 bg-gray-50 border border-gray-200">
            <span className={`text-xl font-bold uppercase tracking-wider ${analysis.specStatus === "IN_SPEC" ? "text-green-600" : "text-red-600"}`}>
              {analysis.specStatus}
            </span>
            {analysis.specErrors.length > 0 && (
              <ul className="mt-4 list-disc pl-5 text-red-600 text-sm">
                {analysis.specErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
