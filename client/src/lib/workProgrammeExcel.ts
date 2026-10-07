import * as XLSX from "xlsx";

export interface WpPhase {
  sno: number;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  avgPct: number;
  remark: string;
}

export interface WpRoadInfo {
  roadName: string;
  roadId: string;
  lengthKm: string;
  agreementNo: string;
  stipulatedCompletion: string; // DD.MM.YYYY
  district: string;
  contractor: string;
}

export interface WpMonth {
  label: string;      // "01.07.26 - 31.07.26"
  start: Date;
  end: Date;
}

const STYLE_CELLS: Record<string, string> = {
  title: "A1",
  headLabel: "A2",
  headValue: "A3",
  colHeader: "A4",
  monthHeader: "A5",
  yellow: "A6",
  empty: "A7",
  sno: "A8",
  item: "A9",
  remark: "A10",
  footer: "A11",
};

/** Build month columns from agreement start to stipulated end (like sample: partial first/last) */
export function buildMonths(agreeStart: string, stipEnd: string): WpMonth[] {
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(2)}`;
  const s = new Date(agreeStart + "T00:00:00");
  const e = new Date(stipEnd + "T00:00:00");
  const months: WpMonth[] = [];
  const cur = new Date(s.getFullYear(), s.getMonth(), 1);
  const endM = new Date(e.getFullYear(), e.getMonth(), 1);
  while (cur <= endM) {
    const mStart = new Date(cur);
    const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const effStart = mStart < s ? new Date(s) : mStart;
    const effEnd = mEnd > e ? new Date(e) : mEnd;
    months.push({ label: `${fmt(effStart)} - ${fmt(effEnd)}`, start: effStart, end: effEnd });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart <= bEnd && bStart <= aEnd;
}

// Styled template (yellow fills, headers, borders) embedded as base64
const TEMPLATE_B64 = "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";

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function loadTemplate(): Promise<XLSX.WorkBook> {
  return XLSX.read(base64ToArrayBuffer(TEMPLATE_B64), { type: "array", cellStyles: true });
}

function colLetter(n: number): string {
  let s = "";
  n += 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function downloadWorkProgrammeExcel(
  road: WpRoadInfo,
  phases: WpPhase[],
  agreeStart: string,
  stipEnd: string
) {
  const wb = await loadTemplate();
  const wsStyles = wb.Sheets["STYLES"];
  const ws = wb.Sheets["Programme"];

  const getStyle = (key: string) => {
    const cell = wsStyles[STYLE_CELLS[key]];
    return cell && cell.s ? JSON.parse(JSON.stringify(cell.s)) : undefined;
  };
  const styles = {
    title: getStyle("title"),
    headLabel: getStyle("headLabel"),
    headValue: getStyle("headValue"),
    colHeader: getStyle("colHeader"),
    monthHeader: getStyle("monthHeader"),
    yellow: getStyle("yellow"),
    empty: getStyle("empty"),
    sno: getStyle("sno"),
    item: getStyle("item"),
    remark: getStyle("remark"),
    footer: getStyle("footer"),
  };

  const months = buildMonths(agreeStart, stipEnd);
  const nMonths = months.length;
  // Cols: A=S.No, B=Particular, C..=months, last=remark
  const remarkCol = 2 + nMonths; // 0-indexed

  const set = (r: number, c: number, v: string | number, styleKey?: keyof typeof styles) => {
    const ref = `${colLetter(c)}${r}`;
    ws[ref] = { t: typeof v === "number" ? "n" : "s", v };
    if (styleKey && styles[styleKey]) ws[ref].s = JSON.parse(JSON.stringify(styles[styleKey]));
  };

  // Column widths
  ws["!cols"] = [
    { wch: 8 },   // A S.No
    { wch: 32 },  // B Particular
    ...months.map(() => ({ wch: 15 })),
    { wch: 28 },  // remark
  ];

  let r = 2;
  // Title (merge across all cols)
  set(r, 0, "Work Programme", "title");
  ws["!merges"] = [{ s: { r: r - 1, c: 0 }, e: { r: r - 1, c: remarkCol } }];
  r = 4;

  const headerRows: Array<[string, string]> = [
    ["Name of Road", `${road.roadName}`],
    ["Total Length of the Road", `${road.lengthKm} k.m.`],
    ["Agreement No.", road.agreementNo],
    ["Stipulated Date of Completion", road.stipulatedCompletion],
    ["Distt.", road.district],
    ["Name of Contractor", road.contractor],
  ];
  for (const [label, value] of headerRows) {
    set(r, 1, label, "headLabel");
    set(r, 2, ":-", "headValue");
    set(r, 3, value, "headValue");
    ws["!merges"]!.push({ s: { r: r - 1, c: 3 }, e: { r: r - 1, c: remarkCol } });
    r++;
  }
  r = 11;

  // Table headers
  set(r, 0, "S.No.", "colHeader");
  set(r, 1, "Particular of\nItem", "colHeader");
  set(r, 2, "Progress of Work", "colHeader");
  ws["!merges"]!.push({ s: { r: r - 1, c: 2 }, e: { r: r - 1, c: 2 + nMonths - 1 } });
  set(r, remarkCol, "remark", "colHeader");
  r = 12;
  // Month sub-headers
  months.forEach((m, i) => set(r, 2 + i, m.label, "monthHeader"));
  r = 13;

  // Data rows (with blank spacer rows like the sample)
  phases.forEach((p) => {
    const ps = new Date(p.startDate + "T00:00:00");
    const pe = new Date(p.endDate + "T00:00:00");
    set(r, 0, p.sno, "sno");
    set(r, 1, p.name, "item");
    months.forEach((m, i) => {
      const hit = overlaps(ps, pe, m.start, m.end);
      set(r, 2 + i, "", hit ? "yellow" : "empty");
    });
    set(r, remarkCol, p.remark, "remark");
    r += 2; // spacer row
  });

  r += 1;
  set(r, remarkCol - 3, `FOR ${road.contractor.toUpperCase()}`, "footer");
  ws["!merges"]!.push({ s: { r: r - 1, c: remarkCol - 3 }, e: { r: r - 1, c: remarkCol } });

  // Remove the hidden STYLES sheet from output
  delete wb.Sheets["STYLES"];
  wb.SheetNames = wb.SheetNames.filter((n) => n !== "STYLES");

  const fileName = `Work_Programme_${road.roadId.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
