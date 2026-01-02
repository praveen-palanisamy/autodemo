export type RunStatus = "success" | "failure";

export type RunJsonStep = {
  index: number;
  type: string;
  startedAt: string;
  finishedAt: string;
  status: RunStatus;
  offsetMs?: number;
  durationMs?: number;
  screenshotPath?: string;
  // Step-specific fields (optional to keep schema stable and flexible)
  url?: string;
  instruction?: string;
  selector?: string;
  text?: string;
  error?: { message: string };
  note?: string;
};

export type RunJson = {
  project: { name: string; baseUrl: string };
  scenario: { name: string; description?: string };
  startedAt: string;
  finishedAt: string;
  durationMs?: number;
  status: RunStatus;
  steps: RunJsonStep[];
  artifacts: {
    interactiveHtmlPath: string;
    runJsonPath: string;
    videoMp4Path?: string;
    traceZipPath?: string;
    ffmpegLogPath?: string;
  };
};


