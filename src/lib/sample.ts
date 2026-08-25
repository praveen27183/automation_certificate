import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const TEXT =
  'This is to certify that {{PERSON}} has successfully completed the {{COURSE}} internship at {{COLLEGE}}.';

export async function buildSamplePdf(): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 420]); // A4-ish landscape
  const { width, height } = page.getSize();

  // Border
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: rgb(0.16, 0.36, 0.78),
    borderWidth: 3,
  });

  // Title
  const title = 'CERTIFICATE OF COMPLETION';
  const titleSize = 26;
  const tw = font.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: (width - tw) / 2,
    y: height - 80,
    size: titleSize,
    font,
    color: rgb(0.1, 0.2, 0.5),
  });

  // Body
  const size = 14;
  const lines = TEXT.split(' ');
  const words: { text: string; w: number }[] = lines.map((t) => ({
    text: t,
    w: font.widthOfTextAtSize(t, size),
  }));
  const space = font.widthOfTextAtSize(' ', size);
  let lineWidth = words.reduce((a, w) => a + w.w + space, 0) - space;
  let x = (width - lineWidth) / 2;
  const y = height - 160;
  for (const word of words) {
    page.drawText(word.text, { x, y, size, font, color: rgb(0.1, 0.1, 0.1) });
    x += word.w + space;
  }

  // Footer line
  page.drawLine({
    start: { x: 80, y: 70 },
    end: { x: width - 80, y: 70 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  page.drawText('Lepto Tech Internship Program', {
    x: 80,
    y: 50,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  const bytes = await doc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
