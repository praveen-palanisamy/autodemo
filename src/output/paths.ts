import path from "node:path";

export function scenarioLatestDir(outputDirBase: string, scenarioName: string): string {
  return path.join(outputDirBase, scenarioName, "latest");
}

export function stepsDir(outDir: string): string {
  return path.join(outDir, "steps");
}

export function stepScreenshotFilename(stepIndex: number): string {
  return `${String(stepIndex + 1).padStart(4, "0")}.png`;
}

export function stepScreenshotPath(outDir: string, stepIndex: number): { abs: string; rel: string } {
  const rel = path.join("steps", stepScreenshotFilename(stepIndex));
  return { rel, abs: path.join(outDir, rel) };
}


