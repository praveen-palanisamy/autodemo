export type RecordedElementInfo = {
  tag: string;
  testId?: string;
  ariaLabel?: string;
  nameAttr?: string;
  placeholder?: string;
  role?: string;
  href?: string;
  text?: string;
  labelText?: string;
  inputType?: string;
};

export type RecordedAction =
  | { type: "click"; el: RecordedElementInfo }
  | { type: "fill"; el: RecordedElementInfo; value: string };

function escAttrValue(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escHasText(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').trim();
}

function cleanText(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const t = v.replace(/\s+/g, " ").trim();
  if (!t) return undefined;
  return t.length > 60 ? t.slice(0, 60) : t;
}

export function buildSelectorAndNote(action: RecordedAction): { selector: string; note?: string } {
  const el = action.el;
  const tag = el.tag || "div";

  // 1) data-testid
  if (el.testId) {
    const selector = `[data-testid="${escAttrValue(el.testId)}"]`;
    const note =
      action.type === "click"
        ? `Click ${tag} (${el.testId})`
        : el.labelText
          ? `Fill ${el.labelText}`
          : `Fill ${tag} (${el.testId})`;
    return { selector, note };
  }

  // 2) label + input
  if (action.type === "fill" && el.labelText) {
    const label = escHasText(el.labelText);
    const selector = `label:has-text("${label}") >> input`;
    return { selector, note: `Fill ${el.labelText}` };
  }

  // 3) aria-label
  if (el.ariaLabel) {
    const selector = `${tag}[aria-label="${escAttrValue(el.ariaLabel)}"]`;
    const note = action.type === "click" ? `Click ${el.ariaLabel}` : `Fill ${el.ariaLabel}`;
    return { selector, note };
  }

  // 4) name / placeholder for inputs
  if (action.type === "fill") {
    if (el.nameAttr) {
      return { selector: `${tag}[name="${escAttrValue(el.nameAttr)}"]`, note: `Fill ${el.nameAttr}` };
    }
    if (el.placeholder) {
      return { selector: `${tag}[placeholder="${escAttrValue(el.placeholder)}"]`, note: `Fill ${el.placeholder}` };
    }
  }

  // 5) href for links
  if (action.type === "click" && el.href) {
    return { selector: `a[href="${escAttrValue(el.href)}"]`, note: `Click link ${el.href}` };
  }

  // 6) text-based for buttons/links/etc (Playwright extension)
  const txt = cleanText(el.text);
  if (txt) {
    const t = escHasText(txt);
    if (action.type === "click") {
      const base = tag === "button" ? "button" : tag === "a" ? "a" : tag;
      return { selector: `${base}:has-text("${t}")`, note: `Click "${txt}"` };
    }
  }

  // 7) fallback: tag only (still better than invalid CSS)
  return { selector: tag, note: action.type === "click" ? `Click ${tag}` : `Fill ${tag}` };
}


