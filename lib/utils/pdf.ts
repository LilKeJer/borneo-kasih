interface MedicalRecordPdfOptions {
  clinicName: string;
  documentTitle: string;
  recordId: string;
  examinationDate: string;
  doctorName: string;
  generatedAt: string;
  diagnosis: string;
  description: string;
  treatment: string;
  doctorNotes: string;
}

interface PdfPageState {
  commands: string[];
  cursorY: number;
  isFirstPage: boolean;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 44;
const BOTTOM_MARGIN = 52;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const BASE_FONT_SIZE = 11;
const BODY_LINE_HEIGHT = 15;
const SECTION_HEADER_HEIGHT = 24;
const SECTION_PADDING_TOP = 12;
const SECTION_PADDING_BOTTOM = 14;
const SECTION_GAP = 18;
const FOOTER_HEIGHT = 28;
const FIRST_PAGE_CONTENT_START_Y = PAGE_HEIGHT - 146;
const CONTINUATION_PAGE_CONTENT_START_Y = PAGE_HEIGHT - 98;

function normalizePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(value: string) {
  return normalizePdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function estimateMaxCharsPerLine(fontSize: number, width: number) {
  return Math.max(24, Math.floor(width / (fontSize * 0.53)));
}

function wrapParagraph(paragraph: string, maxChars: number) {
  if (!paragraph.trim()) {
    return [""];
  }

  const words = paragraph.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const rawWord of words) {
    let word = rawWord;

    while (word.length > maxChars) {
      const chunk = word.slice(0, maxChars);
      word = word.slice(maxChars);

      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }

      lines.push(chunk);
    }

    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxChars) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function wrapText(value: string, fontSize: number, width: number) {
  const maxChars = estimateMaxCharsPerLine(fontSize, width);

  return value
    .replace(/\r/g, "")
    .split("\n")
    .flatMap((paragraph) => wrapParagraph(paragraph, maxChars));
}

function createPageState(isFirstPage: boolean): PdfPageState {
  return {
    commands: [],
    cursorY: isFirstPage
      ? FIRST_PAGE_CONTENT_START_Y
      : CONTINUATION_PAGE_CONTENT_START_Y,
    isFirstPage,
  };
}

function addCommand(page: PdfPageState, command: string) {
  page.commands.push(command);
}

function drawFilledRect(
  page: PdfPageState,
  x: number,
  y: number,
  width: number,
  height: number,
  rgb: [number, number, number]
) {
  addCommand(
    page,
    `${rgb[0]} ${rgb[1]} ${rgb[2]} rg ${x} ${y} ${width} ${height} re f`
  );
}

function drawStrokeRect(
  page: PdfPageState,
  x: number,
  y: number,
  width: number,
  height: number,
  rgb: [number, number, number],
  lineWidth = 1
) {
  addCommand(
    page,
    `${lineWidth} w ${rgb[0]} ${rgb[1]} ${rgb[2]} RG ${x} ${y} ${width} ${height} re S`
  );
}

function drawLine(
  page: PdfPageState,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rgb: [number, number, number],
  lineWidth = 1
) {
  addCommand(
    page,
    `${lineWidth} w ${rgb[0]} ${rgb[1]} ${rgb[2]} RG ${x1} ${y1} m ${x2} ${y2} l S`
  );
}

function drawText(
  page: PdfPageState,
  text: string,
  x: number,
  y: number,
  options?: {
    font?: "F1" | "F2";
    size?: number;
    color?: [number, number, number];
  }
) {
  const font = options?.font ?? "F1";
  const size = options?.size ?? BASE_FONT_SIZE;
  const color = options?.color ?? [0.15, 0.19, 0.24];

  addCommand(
    page,
    `BT /${font} ${size} Tf ${color[0]} ${color[1]} ${color[2]} rg 1 0 0 1 ${x} ${y} Tm (${escapePdfText(
      text
    )}) Tj ET`
  );
}

function getAvailableBodyHeight(page: PdfPageState) {
  return page.cursorY - (BOTTOM_MARGIN + FOOTER_HEIGHT);
}

function drawPageChrome(
  page: PdfPageState,
  options: MedicalRecordPdfOptions,
  pageNumber: number,
  pageCount: number
) {
  drawStrokeRect(page, 28, 28, PAGE_WIDTH - 56, PAGE_HEIGHT - 56, [
    0.84, 0.88, 0.92,
  ]);

  if (page.isFirstPage) {
    drawFilledRect(page, MARGIN_X, PAGE_HEIGHT - 110, CONTENT_WIDTH, 56, [
      0.11, 0.37, 0.55,
    ]);
    drawText(page, options.clinicName, MARGIN_X + 18, PAGE_HEIGHT - 82, {
      font: "F2",
      size: 20,
      color: [1, 1, 1],
    });
    drawText(page, options.documentTitle, MARGIN_X + 18, PAGE_HEIGHT - 101, {
      font: "F1",
      size: 10,
      color: [0.89, 0.95, 0.98],
    });
  } else {
    drawText(page, options.clinicName, MARGIN_X, PAGE_HEIGHT - 62, {
      font: "F2",
      size: 14,
      color: [0.11, 0.37, 0.55],
    });
    drawLine(
      page,
      MARGIN_X,
      PAGE_HEIGHT - 74,
      PAGE_WIDTH - MARGIN_X,
      PAGE_HEIGHT - 74,
      [0.84, 0.88, 0.92]
    );
  }

  drawText(page, `Halaman ${pageNumber} dari ${pageCount}`, PAGE_WIDTH - 132, 38, {
    size: 9,
    color: [0.45, 0.49, 0.55],
  });
  drawText(page, "Dokumen rekam medis pasien", MARGIN_X, 38, {
    size: 9,
    color: [0.45, 0.49, 0.55],
  });
}

function drawMetadataCard(page: PdfPageState, options: MedicalRecordPdfOptions) {
  const cardTop = page.cursorY;
  const cardHeight = 110;
  const cardY = cardTop - cardHeight;

  drawFilledRect(page, MARGIN_X, cardY, CONTENT_WIDTH, cardHeight, [
    0.96, 0.98, 0.99,
  ]);
  drawStrokeRect(page, MARGIN_X, cardY, CONTENT_WIDTH, cardHeight, [
    0.86, 0.9, 0.93,
  ]);
  drawText(page, "Informasi Pemeriksaan", MARGIN_X + 16, cardTop - 26, {
    font: "F2",
    size: 13,
    color: [0.11, 0.37, 0.55],
  });

  const metaRows = [
    ["ID Rekam Medis", options.recordId],
    ["Tanggal Pemeriksaan", options.examinationDate],
    ["Dokter Pemeriksa", options.doctorName],
    ["Tanggal Unduh", options.generatedAt],
  ];

  metaRows.forEach(([label, value], index) => {
    const y = cardTop - 48 - index * 16;
    drawText(page, `${label}:`, MARGIN_X + 16, y, {
      font: "F2",
      size: 10,
      color: [0.28, 0.33, 0.38],
    });
    drawText(page, value, MARGIN_X + 142, y, {
      size: 10,
      color: [0.18, 0.21, 0.25],
    });
  });

  page.cursorY = cardY - 22;
}

function drawSectionOnPage(
  page: PdfPageState,
  title: string,
  lines: string[],
  isContinuation: boolean
) {
  const bodyHeight =
    SECTION_PADDING_TOP +
    SECTION_PADDING_BOTTOM +
    Math.max(lines.length, 1) * BODY_LINE_HEIGHT;
  const boxHeight = SECTION_HEADER_HEIGHT + bodyHeight;
  const topY = page.cursorY;
  const boxY = topY - boxHeight;

  drawStrokeRect(page, MARGIN_X, boxY, CONTENT_WIDTH, boxHeight, [
    0.86, 0.9, 0.93,
  ]);
  drawFilledRect(page, MARGIN_X, topY - SECTION_HEADER_HEIGHT, CONTENT_WIDTH, SECTION_HEADER_HEIGHT, [
    0.91, 0.95, 0.98,
  ]);
  drawText(
    page,
    isContinuation ? `${title} (lanjutan)` : title,
    MARGIN_X + 14,
    topY - 17,
    {
      font: "F2",
      size: 11,
      color: [0.11, 0.37, 0.55],
    }
  );

  const startY = topY - SECTION_HEADER_HEIGHT - SECTION_PADDING_TOP;
  const printableLines = lines.length > 0 ? lines : [""];

  printableLines.forEach((line, index) => {
    drawText(page, line, MARGIN_X + 14, startY - index * BODY_LINE_HEIGHT, {
      size: BASE_FONT_SIZE,
      color: [0.18, 0.21, 0.25],
    });
  });

  page.cursorY = boxY - SECTION_GAP;
}

function drawSectionAcrossPages(
  pages: PdfPageState[],
  title: string,
  value: string
) {
  const wrappedLines = wrapText(value, BASE_FONT_SIZE, CONTENT_WIDTH - 28);
  const remainingLines = [...wrappedLines];
  let isContinuation = false;

  while (remainingLines.length > 0) {
    let page = pages[pages.length - 1];
    const availableHeight = getAvailableBodyHeight(page);
    const reservedHeight =
      SECTION_HEADER_HEIGHT + SECTION_PADDING_TOP + SECTION_PADDING_BOTTOM;
    const rawMaxLines = Math.floor(
      (availableHeight - reservedHeight) / BODY_LINE_HEIGHT
    );

    if (rawMaxLines <= 0) {
      page = createPageState(false);
      pages.push(page);
      continue;
    }

    const maxLines = Math.max(1, rawMaxLines);
    const linesForPage = remainingLines.splice(0, maxLines);
    drawSectionOnPage(page, title, linesForPage, isContinuation);
    isContinuation = remainingLines.length > 0;

    if (remainingLines.length > 0) {
      pages.push(createPageState(false));
    }
  }
}

function buildPageStream(commands: string[]) {
  return commands.join("\n");
}

export function createMedicalRecordPdfBlob(
  options: MedicalRecordPdfOptions
): Blob {
  const pages = [createPageState(true)];

  drawMetadataCard(pages[0], options);
  drawSectionAcrossPages(pages, "Diagnosis", options.diagnosis);
  drawSectionAcrossPages(
    pages,
    "Deskripsi Pemeriksaan",
    options.description
  );
  drawSectionAcrossPages(
    pages,
    "Penanganan dan Pengobatan",
    options.treatment
  );
  drawSectionAcrossPages(pages, "Catatan Dokter", options.doctorNotes);

  pages.forEach((page, index) => {
    drawPageChrome(page, options, index + 1, pages.length);
  });

  const encoder = new TextEncoder();
  let nextObjectId = 1;
  const catalogId = nextObjectId++;
  const pagesId = nextObjectId++;
  const regularFontId = nextObjectId++;
  const boldFontId = nextObjectId++;
  const pageIds = pages.map(() => nextObjectId++);
  const contentIds = pages.map(() => nextObjectId++);
  const objects = new Map<number, string>();

  objects.set(
    regularFontId,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  );
  objects.set(
    boldFontId,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  );

  pages.forEach((page, index) => {
    const stream = buildPageStream(page.commands);
    const contentId = contentIds[index];
    const pageId = pageIds[index];

    objects.set(
      contentId,
      `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`
    );
    objects.set(
      pageId,
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
  });

  objects.set(
    pagesId,
    `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] >>`
  );
  objects.set(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (let id = 1; id < nextObjectId; id += 1) {
    offsets[id] = encoder.encode(pdf).length;
    pdf += `${id} 0 obj\n${objects.get(id) ?? ""}\nendobj\n`;
  }

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${nextObjectId}\n`;
  pdf += "0000000000 65535 f \n";

  for (let id = 1; id < nextObjectId; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${nextObjectId} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}
