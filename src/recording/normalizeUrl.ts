export type NormalizedUrl = {
  origin: string;
  pathAndQuery: string; // includes pathname + search + hash
  full: string;
};

export function normalizeRecordingUrl(input: string): NormalizedUrl {
  const trimmed = input.trim();
  const withProto = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `http://${trimmed}`;
  const u = new URL(withProto);
  const pathAndQuery = `${u.pathname || "/"}${u.search || ""}${u.hash || ""}`;
  return { origin: u.origin, pathAndQuery, full: u.toString() };
}


