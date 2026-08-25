import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { MappingItem, GenerationSettings, CustomFont } from '@/types';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface TextItem {
  str: string;
  transform: number[]; // [a, b, c, d, e, f]  e=x, f=y (from bottom in PDF coords)
  width: number;
  height: number;
  fontSize: number;
  pageWidth: number;
  pageHeight: number;
}

export interface FoundText {
  item: TextItem;
  start: number; // char start index within item.str
  end: number;
}

export interface ReplacementPlan {
  page: number; // 0-based
  // PDF.js text item index to cover
  cover: { x: number; y: number; width: number; height: number }[];
  // text to draw
  draw: {
    x: number;
    y: number;
    size: number;
    text: string;
    width: number;
    fontKey: string;
    color: { r: number; g: number; b: number };
    alignment: 'left' | 'center' | 'right';
    baseline: 'original' | 'helvetica' | 'times' | 'custom';
  }[];
}

// Extract text items per page using PDF.js
export async function extractText(bytes: ArrayBuffer): Promise<TextItem[][]> {
  const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  const pages: TextItem[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items: TextItem[] = [];
    for (const it of content.items as any[]) {
      if (!('str' in it)) continue;
      const tr = it.transform as number[];
      const fontSize = Math.hypot(tr[2], tr[3]) || Math.abs(tr[0]) || Math.abs(tr[3]) || 10;
      items.push({
        str: it.str,
        transform: tr,
        width: it.width || 0,
        height: it.height || fontSize,
        fontSize,
        pageWidth: viewport.width,
        pageHeight: viewport.height,
      });
    }
    pages.push(items);
  }
  await doc.cleanup();
  return pages;
}

export function detectPlaceholders(pages: TextItem[][]): string[] {
  const set = new Set<string>();
  const re = /\{\{([A-Z0-9_]+)\}\}/g;
  for (const page of pages) {
    for (const it of page) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(it.str)) !== null) set.add(m[1]);
    }
  }
  // Also detect bare uppercase placeholders like PERSON, CERTIFICATE_ID
  const bare = new Set<string>();
  for (const page of pages) {
    for (const it of page) {
      const trimmed = it.str.trim();
      if (/^[A-Z][A-Z0-9_]{2,}$/.test(trimmed)) bare.add(trimmed);
    }
  }
  return [...set].map((s) => `{{${s}}}`).concat([...bare].map((s) => `${s}`));
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

function pageMatches(sel: MappingItem['page'], pageIndex: number, totalPages: number): boolean {
  if (sel.kind === 'all') return true;
  if (sel.kind === 'page') return pageIndex === sel.page - 1;
  if (sel.kind === 'range') return pageIndex >= sel.from - 1 && pageIndex <= sel.to - 1;
  return true;
}

// Build replacement plans for a single row
export function buildPlans(
  pages: TextItem[][],
  mappings: MappingItem[],
  columns: string[],
  row: string[],
  settings: GenerationSettings
): ReplacementPlan[] {
  const plans: ReplacementPlan[] = [];
  for (let p = 0; p < pages.length; p++) {
    const items = pages[p];
    const plan: ReplacementPlan = { page: p, cover: [], draw: [] };
    const applicable = mappings.filter((m) => pageMatches(m.page, p, pages.length));
    if (applicable.length === 0) {
      plans.push(plan);
      continue;
    }
    for (const m of applicable) {
      const colIdx = columns.indexOf(m.column);
      const value = colIdx >= 0 ? row[colIdx] ?? '' : '';
      if (!value) continue;

      // Find all occurrences of m.find across text items on this page.
      // PDF.js may split text across items; we handle within-item matches primarily,
      // and also join adjacent items to catch placeholders split across items.
      const findText = m.find;

      // First: within-item matches
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        let idx = 0;
        while ((idx = it.str.indexOf(findText, idx)) !== -1) {
          const tr = it.transform;
          const x = tr[4];
          const y = tr[5];
          const itemWidth = it.width > 0 ? it.width : it.fontSize * 0.5 * it.str.length;
          const charWidth = it.str.length > 0 ? itemWidth / it.str.length : it.fontSize * 0.5;
          const startX = x + idx * charWidth;
          const matchWidth = findText.length * charWidth;
          const textHeight = Math.max(it.height, it.fontSize);
          plan.cover.push({
            x: startX - 4,
            y: y - textHeight * 0.35 - 2,
            width: matchWidth + 8,
            height: textHeight * 1.7 + 4,
          });
          plan.draw.push({
            x: startX,
            y,
            size: m.fontSizeMode === 'custom' ? m.fontSize : it.fontSize,
            text: value,
            width: matchWidth,
            fontKey: m.fontKey,
            color: hexToRgb(m.color),
            alignment: m.alignment,
            baseline: 'original',
          });
          idx += findText.length;
        }
      }

      // Second: cross-item matches (placeholder split across items)
      // Concatenate strings with indices, search, then cover the spanned items.
      const joined = items.map((it) => it.str).join('');
      const joinedIdx = joined.indexOf(findText);
      if (joinedIdx >= 0) {
        // Map joined index back to item ranges
        let pos = 0;
        const ranges: { itemIdx: number; localStart: number; localEnd: number }[] = [];
        for (let i = 0; i < items.length; i++) {
          const len = items[i].str.length;
          const start = pos;
          const end = pos + len;
          if (joinedIdx < end && joinedIdx + findText.length > start) {
            ranges.push({
              itemIdx: i,
              localStart: Math.max(0, joinedIdx - start),
              localEnd: Math.min(len, joinedIdx + findText.length - start),
            });
          }
          pos = end;
        }
        if (ranges.length > 1) {
          // cover from first item's start to last item's end
          const first = items[ranges[0].itemIdx];
          const last = items[ranges[ranges.length - 1].itemIdx];
          const firstWidth = first.width > 0 ? first.width : first.fontSize * 0.5 * first.str.length;
          const lastWidth = last.width > 0 ? last.width : last.fontSize * 0.5 * last.str.length;
          const x0 = first.transform[4] + (first.str.length > 0 ? firstWidth * ranges[0].localStart / first.str.length : 0);
          const y0 = first.transform[5];
          const x1 = last.transform[4] + (last.str.length > 0 ? lastWidth * ranges[ranges.length - 1].localEnd / last.str.length : lastWidth);
          const textHeight = Math.max(first.height, last.height, first.fontSize);
          plan.cover.push({
            x: x0 - 4,
            y: Math.min(y0, last.transform[5]) - textHeight * 0.35 - 2,
            width: Math.max(0, x1 - x0) + 8,
            height: textHeight * 1.7 + 4,
          });
          plan.draw.push({
            x: x0,
            y: y0,
            size: m.fontSizeMode === 'custom' ? m.fontSize : first.fontSize,
            text: value,
            width: Math.max(0, x1 - x0),
            fontKey: m.fontKey,
            color: hexToRgb(m.color),
            alignment: m.alignment,
            baseline: 'original',
          });
        }
      }
    }
    plans.push(plan);
  }
  return plans;
}

// Apply plans to a PDF document copy and return new bytes
export async function applyPlans(
  templateBytes: ArrayBuffer,
  plans: ReplacementPlan[],
  settings: GenerationSettings,
  customFonts: CustomFont[]
): Promise<ArrayBuffer> {
  const doc = await PDFDocument.load(templateBytes.slice(0));
  doc.registerFontkit(fontkit);

  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const times = await doc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  const customCache: Record<string, PDFFont> = {};
  for (const cf of customFonts) {
    try {
      customCache[cf.id] = await doc.embedFont(cf.bytes.slice(0), { subset: true });
    } catch (e) {
      console.warn('font embed failed', cf.name, e);
    }
  }

  const pages = doc.getPages();

  for (const plan of plans) {
    const page = pages[plan.page];
    if (!page) continue;
    const bgColor = rgb(1, 1, 1);

    // Cover original text
    if (settings.preserveOriginal) {
      for (const c of plan.cover) {
        page.drawRectangle({
          x: c.x,
          y: c.y,
          width: c.width,
          height: c.height,
          color: bgColor,
          borderColor: bgColor,
          borderWidth: 0,
        });
      }
    }

    // Draw replacement text
    for (const d of plan.draw) {
      let font: PDFFont = helvetica;
      if (d.fontKey === 'helvetica') font = helvetica;
      else if (d.fontKey === 'times') font = times;
      else if (d.fontKey === 'arial') font = helvetica; // Arial ~ Helvetica
      else if (d.fontKey && customCache[d.fontKey]) font = customCache[d.fontKey];
      else font = helvetica;

      let size = d.size;
      const minSize = settings.minFontSize;
      const maxSize = settings.maxFontSize;

      if (settings.autoFit) {
        const textWidth = font.widthOfTextAtSize(d.text, size);
        if (textWidth > d.width && d.width > 0) {
          // Binary search the largest size that fits in the original area.
          let lo = minSize;
          let hi = size;
          while (hi - lo > 0.25) {
            const mid = (lo + hi) / 2;
            if (font.widthOfTextAtSize(d.text, mid) <= d.width) lo = mid;
            else hi = mid;
          }
          size = lo;
        }
        if (size > maxSize) size = maxSize;
        if (size < minSize) size = minSize;
      }

      const textWidth = font.widthOfTextAtSize(d.text, size);
      let drawX = d.x;
      if (d.alignment === 'center') drawX = d.x + (d.width - textWidth) / 2;
      else if (d.alignment === 'right') drawX = d.x + d.width - textWidth;

      page.drawText(d.text, {
        x: drawX,
        y: d.y,
        size,
        font,
        color: rgb(d.color.r, d.color.g, d.color.b),
      });
    }
  }

  const out = await doc.save({ useObjectStreams: true });
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}

export async function generateOne(
  templateBytes: ArrayBuffer,
  pages: TextItem[][],
  mappings: MappingItem[],
  columns: string[],
  row: string[],
  settings: GenerationSettings,
  customFonts: CustomFont[]
): Promise<ArrayBuffer> {
  const plans = buildPlans(pages, mappings, columns, row, settings);
  return applyPlans(templateBytes, plans, settings, customFonts);
}
