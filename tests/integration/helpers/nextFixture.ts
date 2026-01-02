import path from "node:path";
import net from "node:net";

export type RunningProcess = {
  pid: number;
  kill: () => void;
};

async function waitForHttpOk(url: string, timeoutMs: number): Promise<void> {
  const started = Date.now();
  for (;;) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // ignore
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Timed out waiting for ${url}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

export async function startNextFixture(opts?: { port?: number }): Promise<{
  baseUrl: string;
  proc: RunningProcess;
}> {
  const port = opts?.port ?? (await getFreePort());
  const fixtureDir = path.join(process.cwd(), "tests", "integration", "fixtures", "next-app");
  const baseUrl = `http://localhost:${port}`;

  // Run Next directly so we can control the port.
  const child = Bun.spawn(["bunx", "next", "dev", "--turbo", "--port", String(port)], {
    cwd: fixtureDir,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env },
  });

  // If the process exits immediately, surface the error.
  const earlyExit = await Promise.race([
    child.exited.then(() => true),
    new Promise<boolean>((r) => setTimeout(() => r(false), 500)),
  ]);
  if (earlyExit) {
    const stderr = await new Response(child.stderr).text();
    throw new Error(`Next fixture failed to start.\n\n${stderr}`);
  }

  // Wait for server to be reachable.
  await waitForHttpOk(baseUrl, 60_000);

  const proc: RunningProcess = {
    pid: child.pid,
    kill: () => {
      try {
        child.kill();
      } catch {
        // ignore
      }
    },
  };

  return { baseUrl, proc };
}

async function getFreePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Failed to allocate a free port");
  }
  const port = address.port;
  server.close();
  return port;
}


