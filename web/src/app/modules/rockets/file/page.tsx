"use client";

import React from "react";
import { useRocketStore } from "../../../../store/rocketStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { RocketNavbar } from "../../../../components/rocket-lab/RocketNavbar";

export default function FilePage() {
  const store = useRocketStore();
  const revisions = store.revisions.filter(r => !r.isWorkingCopy); // Chart only shows saved non-working copies

  const handleSaveWorkingCopy = () => {
    store.saveRevision(true);
    alert("Saved as Working Copy.");
  };

  const handleSaveAndEnter = () => {
    if (store.analysis.specStatus === "OUT_OF_SPEC") {
      alert("Cannot enter competition. Design is OUT OF SPEC.");
      return;
    }
    store.saveRevision(false);
    alert("Saved and entered into Competition.");
  };

  const handleNewDesign = () => {
    if (window.confirm("Starting a new design will reset all inputs to their defaults. Any unsaved changes will be lost. Are you sure?")) {
      window.location.reload();
    }
  };

  return (
    <div className="absolute inset-0 bg-[#f8f8f8] flex flex-col">
      <RocketNavbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-64 bg-gray-100 border-r border-gray-300 p-4 flex flex-col gap-4">
          <div className="flex bg-white rounded border border-gray-300 overflow-hidden text-sm">
            <button className="flex-1 py-1 px-2 border-r border-gray-300 hover:bg-gray-50">Open</button>
            <button className="flex-1 py-1 px-2 border-r border-gray-300 bg-gray-200 font-bold">Save</button>
            <button className="flex-1 py-1 px-2 hover:bg-gray-50" onClick={handleNewDesign}>New</button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
            <strong>Are you sure?</strong>
            <p className="mt-2 text-xs">Starting a new design will reset all inputs to their defaults. Any unsaved changes will be lost.</p>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 py-1.5 bg-white border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-50">Cancel</button>
            </div>
            <button onClick={handleNewDesign} className="w-full mt-2 py-2 bg-red-500 text-white rounded font-bold hover:bg-red-600">Start New Design</button>
          </div>

          <div className="mt-8 flex flex-col gap-2">
            <button onClick={handleSaveWorkingCopy} className="py-2 bg-gray-300 text-gray-800 rounded font-bold border border-gray-400 hover:bg-gray-400">
              Save a Working Copy
            </button>
            <button onClick={handleSaveAndEnter} className="py-2 bg-orange-500 text-white rounded font-bold border border-orange-600 hover:bg-orange-600">
              Save and Enter Competition
            </button>
          </div>
        </div>

        {/* Right Panel: Chart */}
        <div className="flex-1 p-8 bg-white overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-normal text-center mb-1 text-gray-700">Design Performance</h1>
            <p className="text-xs text-center text-gray-500 mb-8">Note: Working Copies are not displayed on the chart</p>

            <div className="h-96 w-full border border-gray-200 pt-8 pb-4 pr-8 bg-[#fafafa]">
              {revisions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revisions}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="id" tick={false} axisLine={false} />
                    <YAxis domain={[0, 10]} ticks={[3, 4, 5, 6, 7]} axisLine={false} tickLine={false} />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border p-2 text-xs shadow-sm">
                            <p>Revision: {data.id}</p>
                            <p>Status: <span className={data.status === "IN_SPEC" ? "text-green-600" : "text-red-600"}>{data.status}</span></p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Line 
                      type="linear" 
                      dataKey="performance" 
                      stroke="#8884d8" 
                      strokeWidth={1}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        const fill = payload.status === "IN_SPEC" ? "#10b981" : "#ef4444";
                        return <circle cx={cx} cy={cy} r={4} fill={fill} key={payload.id} />;
                      }}
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No competition designs saved yet.
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-center gap-6 text-xs text-gray-500 font-bold">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div> OUT OF SPEC
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div> IN SPEC
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
