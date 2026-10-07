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

async function loadTemplate(): Promise<XLSX.WorkBook> {
  const res = await fetch(`${import.meta.env.BASE_URL}wp-template.xlsx`);
  const buf = await res.arrayBuffer();
  return XLSX.read(buf, { type: "array", cellStyles: true });
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
