export function resolveUrl(baseUrl: string, target: string): string {
  if (target.startsWith("http://") || target.startsWith("https://")) return target;
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  if (target.startsWith("/")) return `${base}${target}`;
  return `${base}/${target}`;
}


