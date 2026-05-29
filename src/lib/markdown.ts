/**
 * Жижиг хэрэгцээт, гадны dependency-гүй markdown→HTML хөрвүүлэгч.
 * Дэмждэг:
 *   # / ## / ### гарчиг
 *   **bold** / *italic* / `code`
 *   - / * жагсаалт, 1. дугаарлагдсан
 *   [text](url) ссылка (http/https only)
 *   --- хэвтээ зураас
 *   Хоосон мөрөөр тусгаарлагдсан догол
 * Бусад HTML/JS-ийг ил тод escape хийнэ — XSS бат.
 */

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function inline(s: string): string {
  let t = escapeHtml(s);
  // code spans first (so other markers don't apply inside)
  t = t.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-white/[0.06] rounded text-[12px] font-mono">$1</code>');
  // bold
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italic
  t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // links — restrict to http(s) to block javascript:
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand hover:underline">$1</a>'
  );
  return t;
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let listKind: "ul" | "ol" | null = null;
  let paraBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length) {
      out.push(`<p>${inline(paraBuf.join(" "))}</p>`);
      paraBuf = [];
    }
  };
  const closeList = () => {
    if (listKind) {
      out.push(`</${listKind}>`);
      listKind = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      closeList();
      continue;
    }
    // Heading
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushPara();
      closeList();
      const level = h[1].length;
      const cls = level === 1
        ? "text-[20px] font-semibold tracking-tight mt-6 mb-3"
        : level === 2
        ? "text-[16px] font-semibold tracking-tight mt-5 mb-2"
        : "text-[14px] font-semibold mt-4 mb-2";
      out.push(`<h${level} class="${cls}">${inline(h[2])}</h${level}>`);
      continue;
    }
    // Horizontal rule
    if (/^-{3,}$/.test(line)) {
      flushPara();
      closeList();
      out.push('<hr class="my-5 border-bd" />');
      continue;
    }
    // Unordered list
    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul) {
      flushPara();
      if (listKind !== "ul") {
        closeList();
        out.push('<ul class="list-disc pl-6 my-2 space-y-1">');
        listKind = "ul";
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }
    // Ordered list
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      flushPara();
      if (listKind !== "ol") {
        closeList();
        out.push('<ol class="list-decimal pl-6 my-2 space-y-1">');
        listKind = "ol";
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }
    // Plain paragraph buffer
    closeList();
    paraBuf.push(line.trim());
  }
  flushPara();
  closeList();
  return out.join("\n");
}
