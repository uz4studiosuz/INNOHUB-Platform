import { spawn } from "child_process";
import path from "path";

export async function runPythonSimulation(moduleName: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    // Resolve engine paths
    const cwd = /* turbopackIgnore: true */ process.cwd();
    const isWebCwd = cwd.endsWith("web");
    const enginePath = isWebCwd 
      ? path.resolve(/* turbopackIgnore: true */ cwd, "../engine")
      : path.resolve(/* turbopackIgnore: true */ cwd, "engine");
      
    const scriptPath = path.join(/* turbopackIgnore: true */ enginePath, "run_sim.py");
    
    // Command input JSON
    const inputData = JSON.stringify({
      module: moduleName,
      params: params
    });
    
    // Use 'python' or 'python3' or path from env
    const pythonCmd = process.env.PYTHON_PATH || "python";
    
    const pyProcess = spawn(pythonCmd, [scriptPath], {
      cwd: enginePath
    });
    
    let stdoutData = "";
    let stderrData = "";
    
    pyProcess.stdin.write(inputData);
    pyProcess.stdin.end();
    
    pyProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });
    
    pyProcess.stderr.on("data", (data) => {
      stderrData += data.toString();
    });
    
    pyProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}. Stderr: ${stderrData}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdoutData);
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse Python output JSON: ${err}. Output was: ${stdoutData}`));
      }
    });
    
    pyProcess.on("error", (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}
