import { mkdir, rm } from "node:fs/promises";

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function rmrf(targetPath: string): Promise<void> {
  await rm(targetPath, { recursive: true, force: true });
}


