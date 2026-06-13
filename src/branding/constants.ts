/** Product + distribution identifiers (distinct from unrelated "autodemo" sites/products). */
export const BRAND = {
  name: "AutoDemo",
  tagline: "demos as code",
  githubRepo: "praveen-palanisamy/autodemo",
  githubUrl: "https://github.com/praveen-palanisamy/autodemo",
  productSiteUrl: "https://praveen-palanisamy.github.io/autodemo/",
  npmPackage: "@praveen-palanisamy/autodemo",
  npmUrl: "https://www.npmjs.com/package/@praveen-palanisamy/autodemo",
} as const;

export function brandingFooterHtml(): string {
  return `
    <footer class="branding">
      <a href="${BRAND.productSiteUrl}" target="_blank" rel="noopener">
        Made with <strong>${BRAND.name}</strong> — ${BRAND.tagline}
      </a>
      ·
      <a href="${BRAND.npmUrl}" target="_blank" rel="noopener">${BRAND.npmPackage}</a>
    </footer>`;
}
