import "server-only";
import PptxGenJS from "pptxgenjs";

// SAYSANAA brand colors (mirrors web app palette)
const BG = "0B1020";        // page bg
const PANEL = "121A33";     // surf
const PANEL2 = "18224A";    // surf2
const BORDER = "24305E";    // bd
const TX = "E7ECFF";        // text
const SUB = "9AA6CF";       // sub
const BRAND = "6AA6FF";     // sky blue
const BRAND2 = "8B5CF6";    // violet
const ACCENT = "F472B6";    // pink

const FONT = "Arial";

/** 16:9 slide dimensions in inches (default 10×5.625) */
const W = 13.333;
const H = 7.5;

export type DeckSlot = {
  kind: "MOODBOARD" | "PLAN" | "SKETCH" | "RENDER" | "MATERIALS";
  ordinal: number;
  imageUrl: string;
  caption: string | null;
};

export type DeckProject = {
  code: string;
  name: string;
  clientName: string;
  location: string | null;
  purpose: string | null;
  type: "DESIGN" | "BUILD";
  areaM2: number | null;
  contractValue: number | null;
  startDate: Date | null;
  endDate: Date | null;
  totalWorkDays: number;
  progressPct: number;
  assignments: { fullName: string; role: string; isLead: boolean }[];
  gradeLabel: string | null; // e.g. "A+"
};

export type DeckData = {
  briefText: string | null;
  materialsText: string | null;
  slots: DeckSlot[];
};

function fmtMoney(n: number | null): string {
  if (n == null) return "—";
  if (n === 0) return "0 ₮";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2)}M ₮`;
  return `${n.toLocaleString("mn-MN")} ₮`;
}

function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "—";
}

const PROJECT_TYPE_MN: Record<string, string> = {
  DESIGN: "Зураг төсөл",
  BUILD: "Засал гүйцэтгэл",
};

/**
 * URL allowlist: accept only https-Supabase public URLs.
 * Blocks SSRF: any http://, file://, localhost, RFC1918, AWS metadata
 * (169.254.169.254), GCP/Azure metadata endpoints, etc.
 */
function isAllowedImageUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    if (!/\.supabase\.co$/i.test(u.hostname)) return false;
    // reject literal IP addresses just in case
    if (/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Fetch image as base64 — returns null on failure (rendered as placeholder). */
async function fetchImageData(url: string): Promise<string | null> {
  if (!isAllowedImageUrl(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000); // 8s per image
  try {
    const r = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!r.ok) return null;
    // Cap image size at 20MB to avoid memory blow-ups
    const cl = parseInt(r.headers.get("content-length") || "0", 10);
    if (cl > 20 * 1024 * 1024) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.byteLength > 20 * 1024 * 1024) return null;
    const ct = r.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image/")) return null;
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Limited-concurrency Promise.all (avoid spamming Supabase). */
async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }).map(
    async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) return;
        out[idx] = await fn(items[idx], idx);
      }
    }
  );
  await Promise.all(workers);
  return out;
}

/** Slide chrome — dark navy bg + gradient header line + small footer. */
function decorate(slide: PptxGenJS.Slide, deckTitle: string) {
  slide.background = { color: BG };
  // top accent strip (~6 px tall) — gradient effect via two rectangles
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: W / 2,
    h: 0.08,
    fill: { color: BRAND },
    line: { color: BRAND, width: 0 },
  });
  slide.addShape("rect", {
    x: W / 2,
    y: 0,
    w: W / 2,
    h: 0.08,
    fill: { color: BRAND2 },
    line: { color: BRAND2, width: 0 },
  });
  // footer line
  slide.addShape("rect", {
    x: 0,
    y: H - 0.4,
    w: W,
    h: 0.02,
    fill: { color: BORDER },
    line: { color: BORDER, width: 0 },
  });
  slide.addText(deckTitle, {
    x: 0.4,
    y: H - 0.35,
    w: W - 0.8,
    h: 0.3,
    fontFace: FONT,
    fontSize: 9,
    color: SUB,
  });
}

function infoCard(
  slide: PptxGenJS.Slide,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string
) {
  slide.addShape("rect", {
    x,
    y,
    w,
    h,
    fill: { color: PANEL },
    line: { color: BORDER, width: 0.75 },
  });
  slide.addText(label, {
    x: x + 0.18,
    y: y + 0.1,
    w: w - 0.36,
    h: 0.25,
    fontFace: FONT,
    fontSize: 9,
    color: SUB,
    bold: false,
  });
  slide.addText(value, {
    x: x + 0.18,
    y: y + 0.35,
    w: w - 0.36,
    h: h - 0.5,
    fontFace: FONT,
    fontSize: 16,
    color: TX,
    bold: true,
  });
}

/** Layout helper for image gallery (1-12 images) — returns x/y/w/h per cell. */
function galleryLayout(count: number): { x: number; y: number; w: number; h: number }[] {
  const padX = 0.8;
  const padTop = 1.3;
  const padBot = 0.6;
  const gutter = 0.15;
  const availW = W - padX * 2;
  const availH = H - padTop - padBot;

  let cols: number;
  let rows: number;
  if (count === 1) { cols = 1; rows = 1; }
  else if (count <= 2) { cols = 2; rows = 1; }
  else if (count <= 4) { cols = 2; rows = 2; }
  else if (count <= 6) { cols = 3; rows = 2; }
  else if (count <= 9) { cols = 3; rows = 3; }
  else { cols = 4; rows = 3; }

  const cellW = (availW - gutter * (cols - 1)) / cols;
  const cellH = (availH - gutter * (rows - 1)) / rows;
  const cells: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    cells.push({
      x: padX + c * (cellW + gutter),
      y: padTop + r * (cellH + gutter),
      w: cellW,
      h: cellH,
    });
  }
  return cells;
}

async function addGallery(
  slide: PptxGenJS.Slide,
  slots: DeckSlot[]
): Promise<void> {
  const max = 12;
  const subset = slots.slice(0, max);
  const cells = galleryLayout(subset.length);
  // Parallel-fetch (concurrency 4) to stay within Vercel function timeout.
  const datas = await mapConcurrent(subset, 4, (s) => fetchImageData(s.imageUrl));
  for (let i = 0; i < subset.length; i++) {
    const cell = cells[i];
    const data = datas[i];
    if (data) {
      slide.addImage({
        data,
        x: cell.x,
        y: cell.y,
        w: cell.w,
        h: cell.h,
        sizing: { type: "cover", w: cell.w, h: cell.h },
      });
    } else {
      slide.addShape("rect", {
        x: cell.x,
        y: cell.y,
        w: cell.w,
        h: cell.h,
        fill: { color: PANEL2 },
        line: { color: BORDER, width: 0.75 },
      });
      slide.addText("Зураг ачаалагдсангүй", {
        x: cell.x,
        y: cell.y,
        w: cell.w,
        h: cell.h,
        fontFace: FONT,
        fontSize: 12,
        color: SUB,
        align: "center",
        valign: "middle",
      });
    }
    if (subset[i].caption) {
      slide.addText(subset[i].caption!, {
        x: cell.x,
        y: cell.y + cell.h - 0.4,
        w: cell.w,
        h: 0.3,
        fontFace: FONT,
        fontSize: 9,
        color: TX,
        fill: { color: BG, transparency: 30 },
        align: "left",
        valign: "bottom",
      });
    }
  }
}

function sectionTitle(slide: PptxGenJS.Slide, title: string, subtitle?: string) {
  slide.addText(title, {
    x: 0.6,
    y: 0.3,
    w: W - 1.2,
    h: 0.6,
    fontFace: FONT,
    fontSize: 24,
    bold: true,
    color: TX,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6,
      y: 0.85,
      w: W - 1.2,
      h: 0.35,
      fontFace: FONT,
      fontSize: 12,
      color: SUB,
    });
  }
}

export async function buildPresentation(
  project: DeckProject,
  deck: DeckData
): Promise<Buffer> {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE"; // 13.333 × 7.5"
  pres.title = `${project.code} — ${project.name}`;
  pres.subject = "SAYSANAA";
  pres.author = "SAYSANAA OS";

  const footerLabel = `SAYSANAA · ${project.code} · ${project.name}`;
  const slotsByKind = (k: DeckSlot["kind"]) =>
    deck.slots.filter((s) => s.kind === k).sort((a, b) => a.ordinal - b.ordinal);

  // ── Slide 1: Cover ───────────────────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: BG };
    // Big violet→blue diagonal accent
    s.addShape("rect", {
      x: 0,
      y: 0,
      w: W,
      h: 0.1,
      fill: { color: BRAND },
      line: { color: BRAND, width: 0 },
    });
    s.addShape("rect", {
      x: 0,
      y: H * 0.55,
      w: W,
      h: 0.04,
      fill: { color: BRAND2 },
      line: { color: BRAND2, width: 0 },
    });
    s.addText("SAYSANAA", {
      x: 0.6,
      y: 0.5,
      w: 5,
      h: 0.4,
      fontFace: FONT,
      fontSize: 12,
      color: BRAND,
      bold: true,
      charSpacing: 8,
    });
    s.addText(project.name, {
      x: 0.6,
      y: H * 0.3,
      w: W - 1.2,
      h: 1.6,
      fontFace: FONT,
      fontSize: 44,
      bold: true,
      color: TX,
    });
    s.addText(
      `${project.code} · ${PROJECT_TYPE_MN[project.type] ?? project.type}${
        project.purpose ? " · " + project.purpose : ""
      }`,
      {
        x: 0.6,
        y: H * 0.3 + 1.6,
        w: W - 1.2,
        h: 0.5,
        fontFace: FONT,
        fontSize: 14,
        color: BRAND,
      }
    );
    s.addText(project.clientName, {
      x: 0.6,
      y: H * 0.62,
      w: W - 1.2,
      h: 0.5,
      fontFace: FONT,
      fontSize: 18,
      color: TX,
    });
    if (project.location) {
      s.addText(project.location, {
        x: 0.6,
        y: H * 0.7,
        w: W - 1.2,
        h: 0.4,
        fontFace: FONT,
        fontSize: 12,
        color: SUB,
      });
    }
    s.addText(`Танилцуулга · ${fmtDate(new Date())}`, {
      x: 0.6,
      y: H - 0.6,
      w: W - 1.2,
      h: 0.3,
      fontFace: FONT,
      fontSize: 10,
      color: SUB,
    });
  }

  // ── Slide 2: Project info ────────────────────────────────────────────────
  {
    const s = pres.addSlide();
    decorate(s, footerLabel);
    sectionTitle(s, "Төслийн товч мэдээлэл", "Project overview");

    const top = 1.4;
    const cardH = 1.1;
    const cardW = (W - 1.4) / 4;
    const xs = (i: number) => 0.7 + i * cardW;
    infoCard(s, xs(0), top, cardW - 0.1, cardH, "Төрөл", PROJECT_TYPE_MN[project.type] ?? project.type);
    infoCard(s, xs(1), top, cardW - 0.1, cardH, "Талбай", project.areaM2 ? `${project.areaM2} м²` : "—");
    infoCard(s, xs(2), top, cardW - 0.1, cardH, "Гэрээний үнэ", fmtMoney(project.contractValue));
    infoCard(s, xs(3), top, cardW - 0.1, cardH, "Грейд", project.gradeLabel ?? "—");

    const row2 = top + cardH + 0.25;
    infoCard(s, xs(0), row2, cardW - 0.1, cardH, "Эхлэх огноо", fmtDate(project.startDate));
    infoCard(s, xs(1), row2, cardW - 0.1, cardH, "Дуусах огноо", fmtDate(project.endDate));
    infoCard(s, xs(2), row2, cardW - 0.1, cardH, "Ажлын өдөр", `${project.totalWorkDays} өдөр`);
    infoCard(s, xs(3), row2, cardW - 0.1, cardH, "Гүйцэтгэл", `${project.progressPct}%`);

    // team
    const teamY = row2 + cardH + 0.4;
    s.addText("Багийн бүрэлдэхүүн", {
      x: 0.7,
      y: teamY,
      w: W - 1.4,
      h: 0.4,
      fontFace: FONT,
      fontSize: 13,
      color: SUB,
      bold: true,
    });
    if (project.assignments.length === 0) {
      s.addText("—", {
        x: 0.7,
        y: teamY + 0.4,
        w: W - 1.4,
        h: 0.4,
        fontFace: FONT,
        fontSize: 14,
        color: TX,
      });
    } else {
      const teamText = project.assignments
        .map((a) => `${a.isLead ? "★ " : ""}${a.fullName}${a.role ? ` (${a.role})` : ""}`)
        .join("    ·    ");
      s.addText(teamText, {
        x: 0.7,
        y: teamY + 0.4,
        w: W - 1.4,
        h: 0.6,
        fontFace: FONT,
        fontSize: 14,
        color: TX,
      });
    }
  }

  // ── Slide 3: Brief ──────────────────────────────────────────────────────
  {
    const s = pres.addSlide();
    decorate(s, footerLabel);
    sectionTitle(s, "Brief / Зорилго", "Концепц ба хүрэх үр дүн");
    s.addText(deck.briefText?.trim() || "Brief текст оруулаагүй байна.", {
      x: 0.7,
      y: 1.5,
      w: W - 1.4,
      h: H - 2.4,
      fontFace: FONT,
      fontSize: 16,
      color: TX,
      valign: "top",
      paraSpaceAfter: 8,
    });
  }

  // ── Slides 4-7: Image galleries (Moodboard, Plan, Sketch, Render) ───────
  const galleries: { kind: DeckSlot["kind"]; title: string; subtitle: string }[] = [
    { kind: "MOODBOARD", title: "Moodboard", subtitle: "Дизайны санаа, өнгө, материалын мэдрэмж" },
    { kind: "PLAN", title: "Plan", subtitle: "Талбайн зохион байгуулалт" },
    { kind: "SKETCH", title: "3D Sketch", subtitle: "Эхэн үеийн санааны 3D" },
    { kind: "RENDER", title: "3D Render", subtitle: "Эцсийн дизайны үзүүлэлт" },
  ];

  for (const g of galleries) {
    const items = slotsByKind(g.kind);
    if (items.length === 0) continue;
    const s = pres.addSlide();
    decorate(s, footerLabel);
    sectionTitle(s, g.title, g.subtitle);
    await addGallery(s, items);
  }

  // ── Slide 8: Materials & Specs ──────────────────────────────────────────
  {
    const s = pres.addSlide();
    decorate(s, footerLabel);
    sectionTitle(s, "Material & Spec", "Сонгосон материал, өнгө, тавилга");
    const matSlots = slotsByKind("MATERIALS");
    const hasText = !!deck.materialsText?.trim();
    if (matSlots.length === 0) {
      s.addText(deck.materialsText?.trim() || "Материалын мэдээлэл оруулаагүй байна.", {
        x: 0.7,
        y: 1.5,
        w: W - 1.4,
        h: H - 2.4,
        fontFace: FONT,
        fontSize: 14,
        color: TX,
        valign: "top",
      });
    } else if (!hasText) {
      // Only images
      await addGallery(s, matSlots);
    } else {
      // Text left (40%), gallery right (60%)
      s.addText(deck.materialsText!.trim(), {
        x: 0.7,
        y: 1.4,
        w: W * 0.4 - 1,
        h: H - 2.2,
        fontFace: FONT,
        fontSize: 12,
        color: TX,
        valign: "top",
        paraSpaceAfter: 8,
      });
      const rightX = W * 0.4 + 0.1;
      const rightW = W - rightX - 0.6;
      const rightY = 1.4;
      const rightH = H - 2.2;
      const cells = (() => {
        const count = Math.min(matSlots.length, 6);
        let cols: number, rows: number;
        if (count === 1) { cols = 1; rows = 1; }
        else if (count <= 2) { cols = 1; rows = 2; }
        else if (count <= 4) { cols = 2; rows = 2; }
        else { cols = 2; rows = 3; }
        const gutter = 0.1;
        const cellW = (rightW - gutter * (cols - 1)) / cols;
        const cellH = (rightH - gutter * (rows - 1)) / rows;
        const out: { x: number; y: number; w: number; h: number }[] = [];
        for (let i = 0; i < count; i++) {
          const r = Math.floor(i / cols);
          const c = i % cols;
          out.push({
            x: rightX + c * (cellW + gutter),
            y: rightY + r * (cellH + gutter),
            w: cellW,
            h: cellH,
          });
        }
        return out;
      })();
      const matDatas = await mapConcurrent(
        matSlots.slice(0, cells.length),
        4,
        (s) => fetchImageData(s.imageUrl)
      );
      for (let i = 0; i < cells.length; i++) {
        const data = matDatas[i];
        if (data) {
          s.addImage({
            data,
            x: cells[i].x,
            y: cells[i].y,
            w: cells[i].w,
            h: cells[i].h,
            sizing: { type: "cover", w: cells[i].w, h: cells[i].h },
          });
        }
      }
    }
  }

  // ── Final slide: Thank you ───────────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: BG };
    s.addShape("rect", {
      x: 0,
      y: H * 0.85,
      w: W,
      h: 0.04,
      fill: { color: BRAND2 },
      line: { color: BRAND2, width: 0 },
    });
    s.addText("Баярлалаа", {
      x: 0.6,
      y: H * 0.35,
      w: W - 1.2,
      h: 1.0,
      fontFace: FONT,
      fontSize: 48,
      bold: true,
      color: TX,
    });
    s.addText("Танилцуулга төгсөв · Асуулт, санал хүлээж авна", {
      x: 0.6,
      y: H * 0.5,
      w: W - 1.2,
      h: 0.5,
      fontFace: FONT,
      fontSize: 14,
      color: BRAND,
    });
    s.addText("SAYSANAA · artify", {
      x: 0.6,
      y: H * 0.78,
      w: W - 1.2,
      h: 0.4,
      fontFace: FONT,
      fontSize: 11,
      color: SUB,
      charSpacing: 4,
    });
  }

  // pptxgenjs returns Buffer in Node when type: "nodebuffer"
  const buf = (await pres.write({ outputType: "nodebuffer" })) as unknown as Buffer;
  // Mark accent variable as intentionally unused (kept for future use)
  void ACCENT;
  return buf;
}
