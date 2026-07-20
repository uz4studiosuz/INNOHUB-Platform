import { NextRequest, NextResponse } from "next/server";
import { runPythonSimulation } from "@/lib/pythonRunner";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { module, params } = body;
    
    if (!module) {
      return NextResponse.json({ error: "Missing 'module' parameter" }, { status: 400 });
    }
    
    const result = await runPythonSimulation(module, params || {});
    return NextResponse.json(result);
    
  } catch (err: any) {
    console.error("Simulation API Error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred during simulation" },
      { status: 500 }
    );
  }
}
