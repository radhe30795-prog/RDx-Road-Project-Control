import * as XLSX from "xlsx";

export interface BillMeasurement {
  mbNo: string;
  location: string;
  nos: number | null;
  length: number | null;
  width: number | null;
  depth: number | null;
  quantity: number;
}

export interface BillItem {
  boqItemId: number;
  itemCode: string;
  sor: string;
  description: string;
  unit: string;
  rate: number;
  measurements: BillMeasurement[];
  previousQty: number;
  currentQty: number;
  uptoQty: number;
  previousAmt: number;
  currentAmt: number;
  uptoAmt: number;
}

export interface BillRoad {
  roadId: number;
  roadCode: string;
  roadName: string;
  items: BillItem[];
  roadTotal: { previousAmt: number; currentAmt: number; uptoAmt: number };
}

export interface RaBillExportParams {
  billNo: string; // e.g. "3rd. RA Bill"
  periodFrom: string;
  periodTo: string;
  projectName: string;
  clientName: string;
  contractorName: string;
}

/**
 * Generate an RA Bill workbook in the user's measurement-sheet format.
 * One sheet per road + an Abstract sheet with Previous / Current / Up-to-date.
 */
export function generateRaBillExcel(
  roads: BillRoad[],
  params: RaBillExportParams
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  for (const road of roads) {
    const rows: any[][] = [];

    // Row 1: Road title
    rows.push([`Const. of ${road.roadName}`]);
    // Row 2: Bill number
    rows.push(["", params.billNo]);
    // Row 3: Headers
    rows.push([
      "S.NO.", "DESCRIPTION OF ITEM", "NOS.", "",
      "MEASUREMENT", "", "",
      "QTY.", "UNIT", "RATE ", "AMOUNT",
    ]);
    // Row 4: L / W / H-D sub-headers
    rows.push(["", "", "", "", "L", "W", "H/D", "", "", "", ""]);
    // Row 5: column numbers
    rows.push(["1", "2", "3", "", "4", "5", "6", "7", "8", "9", "10"]);

    let excelRow = 6; // 1-based row number of next row to push
    let serial = 1;

    for (const item of road.items) {
      const itemHeaderRow = excelRow;

      // Item header row: SOR + description, qty/unit/rate/amount filled on total row
      const shortDesc = item.description.length > 60
        ? item.description.substring(0, 60)
        : item.description;
      rows.push([
        `${serial} / ${item.sor}`,
        shortDesc,
        "", "", "", "", "",
        "", "", "", "",
      ]);
      excelRow++;

      const firstMeasRow = excelRow;
      // Measurement detail rows (current bill only)
      if (item.measurements.length > 0) {
        for (const m of item.measurements) {
          const r = excelRow;
          // Qty formula: NOS * L * W * H/D when all present, else direct qty
          let qtyFormula: string | number = m.quantity;
          if (m.nos != null && m.length != null && m.width != null && m.depth != null) {
            qtyFormula = `=C${r}*E${r}*F${r}*G${r}`;
          } else if (m.length != null && m.width != null && m.depth != null) {
            qtyFormula = `=E${r}*F${r}*G${r}`;
          } else if (m.length != null && m.width != null) {
            qtyFormula = `=E${r}*F${r}`;
          }
          rows.push([
            "",
            m.location || m.mbNo,
            m.nos ?? "",
            "",
            m.length ?? "",
            m.width ?? "",
            m.depth ?? "",
            qtyFormula,
            "",
            "",
            "",
          ]);
          excelRow++;
        }
      } else {
        // No detailed measurements: single row with previous+current summary
        const r = excelRow;
        rows.push([
          "",
          `As per MB (up-to-date qty ${item.uptoQty})`,
          "", "",
          "", "", "",
          item.currentQty,
          "", "", "",
        ]);
        excelRow++;
      }
      const lastMeasRow = excelRow - 1;

      // Total row
      const tr = excelRow;
      const qtyCell = firstMeasRow === lastMeasRow
        ? `H${firstMeasRow}`
        : `SUM(H${firstMeasRow}:H${lastMeasRow})`;
      rows.push([
        "",
        "Total : -",
        "", "", "", "", "",
        `=${qtyCell}`,
        item.unit,
        item.rate,
        `=ROUND(J${tr}*H${tr},0)`,
      ]);
      excelRow++;

      // Blank row after item
      rows.push([]);
      excelRow++;

      // Fill the item header row's qty cell with reference to total (for readability)
      rows[itemHeaderRow - 1][7] = `=H${tr}`;

      serial++;
    }

    // Road total row
    const roadTotalRow = excelRow;
    rows.push([
      "", "ROAD TOTAL : -", "", "", "", "", "",
      "", "", "",
      `=SUM(K6:K${roadTotalRow - 1})`,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Column widths to match the template
    ws["!cols"] = [
      { wch: 10 }, // A S.NO.
      { wch: 42 }, // B DESCRIPTION
      { wch: 8 },  // C NOS.
      { wch: 2 },  // D blank
      { wch: 10 }, // E L
      { wch: 10 }, // F W
      { wch: 10 }, // G H/D
      { wch: 14 }, // H QTY
      { wch: 8 },  // I UNIT
      { wch: 12 }, // J RATE
      { wch: 16 }, // K AMOUNT
    ];

    // Sheet name: road code (max 31 chars)
    const sheetName = road.roadCode.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // ---------- Abstract sheet ----------
  const abs: any[][] = [];
  abs.push([`${params.projectName}`]);
  abs.push([`${params.billNo} — Abstract of Cost`]);
  abs.push([`Period: ${params.periodFrom} to ${params.periodTo}`]);
  abs.push([`Client: ${params.clientName} | Contractor: ${params.contractorName}`]);
  abs.push([]);
  abs.push([
    "S.No", "Road", "Item (SOR)", "Description", "Unit", "Rate",
    "Prev. Qty", "Prev. Amount",
    "Curr. Qty", "Curr. Amount",
    "Up-to-date Qty", "Up-to-date Amount",
  ]);

  let sNo = 1;
  let tPrev = 0, tCurr = 0, tUpto = 0;
  for (const road of roads) {
    for (const item of road.items) {
      abs.push([
        sNo++,
        `${road.roadCode} — ${road.roadName}`,
        item.sor,
        item.description.length > 80 ? item.description.substring(0, 80) : item.description,
        item.unit,
        item.rate,
        item.previousQty, item.previousAmt,
        item.currentQty, item.currentAmt,
        item.uptoQty, item.uptoAmt,
      ]);
      tPrev += item.previousAmt;
      tCurr += item.currentAmt;
      tUpto += item.uptoAmt;
    }
  }
  abs.push([]);
  abs.push([
    "", "", "", "", "", "GRAND TOTAL",
    "", Math.round(tPrev),
    "", Math.round(tCurr),
    "", Math.round(tUpto),
  ]);

  const absWs = XLSX.utils.aoa_to_sheet(abs);
  absWs["!cols"] = [
    { wch: 6 }, { wch: 28 }, { wch: 14 }, { wch: 50 }, { wch: 8 }, { wch: 12 },
    { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, absWs, "Abstract");

  return wb;
}

/** Download the workbook as an .xlsx file */
export function downloadRaBillExcel(
  roads: BillRoad[],
  params: RaBillExportParams
) {
  const wb = generateRaBillExcel(roads, params);
  const fileName = `${params.billNo.replace(/[^a-zA-Z0-9]+/g, "_")}_${params.periodTo}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
