// The HTML in premium guide blocks is authored (and, from phase 4, edited by
// hosts), so it's treated as untrusted: only <strong>, <i>, <em>, <br> and
// <a href> survive, and every other tag is dropped (its text is kept).
// Pure string code, no DOM — runs on the server and in the browser.

const ALLOWED_TAGS = new Set(["strong", "i", "em", "br", "a"]);
const SAFE_HREF = /^(https?:\/\/|tel:|mailto:|wa\.me\/)/i;

function escapeText(text: string): string {
  // Entities already in the source (&amp;, &#39;...) are kept as they are;
  // only a bare "<" or ">" is neutralised.
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// Phone numbers typed as plain text (e.g. "954 580 000", "+34 644 435 404")
// become tap-to-call links. Nine or more digits, so prices, minutes and
// street numbers never match.
const PHONE_PATTERN = /(\+?\d[\d ]{7,}\d)/g;

function linkPhones(text: string): string {
  return text.replace(PHONE_PATTERN, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 13) return match;
    const tel = match.trim().startsWith("+") ? `+${digits}` : digits;
    return `<a href="tel:${tel}">${match}</a>`;
  });
}

export function sanitizeGuideHtml(html: string, { linkPhoneNumbers = true } = {}): string {
  if (!html) return "";
  const out: string[] = [];
  const open: string[] = [];
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  let last = 0;
  let insideAnchor = false;
  let match: RegExpExecArray | null;

  const pushText = (text: string) => {
    if (!text) return;
    const escaped = escapeText(text);
    out.push(linkPhoneNumbers && !insideAnchor ? linkPhones(escaped) : escaped);
  };

  while ((match = tagPattern.exec(html))) {
    pushText(html.slice(last, match.index));
    last = match.index + match[0].length;
    const name = match[1].toLowerCase();
    const isClosing = match[0].startsWith("</");
    if (!ALLOWED_TAGS.has(name)) continue;

    if (name === "br") {
      if (!isClosing) out.push("<br/>");
      continue;
    }
    if (isClosing) {
      const index = open.lastIndexOf(name);
      if (index === -1) continue;
      // Close anything left open inside it so the output stays well-formed.
      while (open.length > index) {
        const closing = open.pop()!;
        out.push(`</${closing}>`);
        if (closing === "a") insideAnchor = false;
      }
      continue;
    }
    if (name === "a") {
      const href = /href\s*=\s*("([^"]*)"|'([^']*)')/i.exec(match[2]);
      const value = (href?.[2] ?? href?.[3] ?? "").trim();
      if (!SAFE_HREF.test(value) || insideAnchor) continue;
      const target = value.startsWith("http") ? ' target="_blank" rel="noopener noreferrer"' : "";
      out.push(`<a href="${escapeAttr(value)}"${target}>`);
      open.push("a");
      insideAnchor = true;
      continue;
    }
    out.push(`<${name}>`);
    open.push(name);
  }
  pushText(html.slice(last));
  while (open.length) out.push(`</${open.pop()}>`);
  return out.join("");
}
