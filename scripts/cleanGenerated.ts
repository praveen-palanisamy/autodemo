import { rm } from "node:fs/promises";

async function rmrf(p: string) {
  await rm(p, { recursive: true, force: true });
}

await rmrf(".autodemo.yml");
await rmrf("public/demos");
await rmrf(".autodemo-out");

console.log("Cleaned generated AutoDemo artifacts.");


