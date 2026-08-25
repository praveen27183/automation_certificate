export interface CsvData {
  columns: string[];
  rows: string[][];
}

// Robust CSV parser supporting quoted values, escaped quotes, embedded newlines, and empty values.
export function parseCsv(text: string): CsvData {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let i = 0;
  let inQuotes = false;

  // Normalize BOM and line endings, then detect common CSV delimiters.
  const s = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const firstLine = s.split('\n').find((line) => line.trim().length > 0) ?? '';
  const delimiter = [',', ';', '\t'].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];

  while (i < s.length) {
    const ch = s[i];

    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === delimiter) {
      row.push(field);
      field = '';
      i++;
      continue;
    }

    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // last field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Trim trailing empty rows (common trailing newline)
  while (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (last.length === 1 && last[0].trim() === '') {
      rows.pop();
    } else {
      break;
    }
  }

  if (rows.length === 0) return { columns: [], rows: [] };

  const rawColumns = rows[0].map((c) => c.replace(/^\uFEFF/, '').trim());
  const columns: string[] = [];
  rawColumns.forEach((column, index) => {
    const base = column || `Column ${index + 1}`;
    let unique = base;
    let suffix = 2;
    while (columns.includes(unique)) unique = `${base} ${suffix++}`;
    columns.push(unique);
  });
  const dataRows = rows.slice(1).map((r) => {
    // pad/truncate to column count
    const padded = [...r];
    while (padded.length < columns.length) padded.push('');
    return padded.slice(0, columns.length);
  });

  return { columns, rows: dataRows };
}

export function toCsv(data: CsvData): string {
  const escape = (v: string) => {
    if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
    return v;
  };
  const lines = [data.columns.map(escape).join(',')];
  for (const r of data.rows) {
    lines.push(r.map(escape).join(','));
  }
  return lines.join('\n');
}

export const SAMPLE_CSV = `PERSON,COLLEGE,COURSE,CERTIFICATE_ID,DATE
Narpat Singh,ABC College,MERN Stack,LT_2026_101,25-08-2026
Abhishek R,XYZ College,MERN Stack,LT_2026_102,25-08-2026
Asaliya Jose A,ABC College,MERN Stack,LT_2026_103,25-08-2026
Feronica P,ABC College,MERN Stack,LT_2026_104,25-08-2026
Rahul Kumar,XYZ College,MERN Stack,LT_2026_105,25-08-2026
Priya Sharma,ABC College,MERN Stack,LT_2026_106,25-08-2026`;
