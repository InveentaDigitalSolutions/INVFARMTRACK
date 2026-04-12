/**
 * Invoice PDF Generator — renders AGRIGENTUM S.A. export invoices.
 * Two variants: BANCO (export prices USD) and JASON (internal prices HNL).
 *
 * Format matches the real invoice: Invoice #000-001-01-00001461
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoiceLine {
  boxRange: string;
  grossWeight: number;
  netWeight: number;
  boxes: number;
  pack: number;
  quantity: number;
  description: string;
  customer: string;
  pricePerUnit: number;
  amount: number;
}

export interface InvoiceData {
  // Header
  invoiceNumber: string;
  cai: string;
  caiExpiry: string;
  caiRange: string;
  rtn: string;

  // Customer
  customerName: string;
  customerAddress: string;
  customerTaxId: string;
  customerContact: string;
  customerPhone: string;
  customerEmail: string;

  // Delivery (if different)
  deliverToName?: string;
  deliverToAddress?: string;

  // Dates
  invoiceDate: string;
  weekNumber: number;
  etd: string;
  eta: string;

  // Shipping
  shippedVia: string;
  carrier: string;
  awbNumber: string;
  containerNumber?: string;
  sealNumber?: string;
  tempRecord?: string;
  terms: string;
  portOfEntry: string;
  phytoNumber?: string;

  // Notify party
  notifyPartyName?: string;
  notifyPartyAddress?: string;
  notifyPartyContact?: string;

  // Lines
  lines: InvoiceLine[];

  // Totals
  subtotal: number;
  isv15: number;
  isv18: number;
  subtotalExonerated: number;
  discounts: number;
  airFreight: number;
  totalInvoice: number;
  paid: number;
  balance: number;

  // Currency
  exchangeRate: number;
  totalHNL: number;

  // Totals summary
  totalBoxes: number;
  totalGrossWeight: number;
  totalNetWeight: number;
  totalStems: number;
}

type InvoiceVariant = "BANCO" | "JASON";

export function generateInvoicePDF(data: InvoiceData, variant: InvoiceVariant = "BANCO"): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = margin;

  // Colors
  const blue = [0, 51, 153] as [number, number, number];
  const black = [0, 0, 0] as [number, number, number];
  const gray = [100, 100, 100] as [number, number, number];

  // === HEADER ===
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...blue);
  doc.text("AGRIGENTUM, S.A.", margin, y);
  y += 5;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...blue);
  doc.text("Antigua CA5 Km 84, Bo. San Miguel, Aldea Tenguaje, Frente a IMEXU", margin, y);
  y += 3;
  doc.text("12101 Comayagua, Honduras.", margin, y);
  y += 3;
  doc.text(`Phone: (504) 9875 9720`, margin, y);
  y += 3;
  doc.text(`Email: plantaflorh@gmail.com`, margin, y);

  // RTN / CAI block (right side)
  const rightX = pageWidth - margin;
  let ry = margin;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(`RTN ${data.rtn}`, rightX, ry, { align: "right" });
  ry += 3;
  doc.setFont("helvetica", "normal");
  doc.text(`CAI ${data.cai}`, rightX, ry, { align: "right" });
  ry += 3;
  doc.text(`Fecha Limite Emision: ${data.caiExpiry}`, rightX, ry, { align: "right" });
  ry += 3;
  doc.text(`Desde ${data.caiRange}`, rightX, ry, { align: "right" });

  y += 6;
  doc.setDrawColor(...blue);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // === SOLD TO / INVOICE INFO ===
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("SOLD TO/CONSIGNEE:", margin, y);

  // Invoice info box (right)
  const boxX = pageWidth / 2 + 10;
  const boxW = pageWidth / 2 - margin - 10;
  doc.setDrawColor(...blue);
  doc.rect(boxX, y - 3, boxW, 38);

  doc.setFontSize(7);
  const invoiceInfo = [
    ["INVOICE n°:", data.invoiceNumber],
    ["Week:", String(data.weekNumber)],
    ["Date:", data.invoiceDate],
    ["ETD:", data.etd],
    ["ETA:", data.eta],
    ["Phyto:", data.phytoNumber || ""],
    ["Shipped Via:", data.shippedVia],
    ["Vessel / Carrier:", data.carrier],
    ["BL n°/ AWB n°:", data.awbNumber],
    ["Temp Record #:", data.tempRecord || ""],
    ["TERMS:", data.terms],
    ["Port of Entrée:", data.portOfEntry],
  ];

  let iy = y;
  invoiceInfo.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, boxX + 2, iy);
    doc.setFont("helvetica", "normal");
    doc.text(value, boxX + boxW - 2, iy, { align: "right" });
    iy += 3;
  });

  // Customer info (left)
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text(data.customerName, margin, y);
  y += 3;
  doc.setFont("helvetica", "normal");
  const addrLines = data.customerAddress.split("\n");
  addrLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 3;
  });
  doc.text(`Tax ID#: ${data.customerTaxId}`, margin, y);
  y += 3;
  doc.text(`Contact: ${data.customerContact}`, margin + 40, y - 3);
  doc.text(data.customerPhone, margin + 40, y);

  y = Math.max(y, iy) + 6;

  // === LINE ITEMS TABLE ===
  const tableHeaders = [
    "Bx #", "GW Kg/Bx", "NW Kg/Bx", "Bx Qty", "Pack", "Qty", "DESCRIPTION",
    "Customer", "Price/Und US$", "AMOUNT US$"
  ];

  const tableData = data.lines.map((line) => [
    line.boxRange,
    line.grossWeight.toFixed(1),
    line.netWeight.toFixed(1),
    String(line.boxes),
    line.pack.toLocaleString(),
    line.quantity.toLocaleString(),
    line.description,
    line.customer,
    line.pricePerUnit.toFixed(3),
    line.amount.toFixed(2),
  ]);

  autoTable(doc, {
    startY: y,
    head: [tableHeaders],
    body: tableData,
    theme: "grid",
    styles: {
      fontSize: 6.5,
      cellPadding: 1.5,
      textColor: black,
      lineColor: blue,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [240, 240, 255] as [number, number, number],
      textColor: blue,
      fontStyle: "bold",
      fontSize: 6,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { halign: "center", cellWidth: 14 },
      2: { halign: "center", cellWidth: 14 },
      3: { halign: "center", cellWidth: 10 },
      4: { halign: "center", cellWidth: 12 },
      5: { halign: "right", cellWidth: 14 },
      6: { cellWidth: 50 },
      7: { cellWidth: 18 },
      8: { halign: "right", cellWidth: 16 },
      9: { halign: "right", cellWidth: 18 },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // === TOTALS ===
  const totalsX = pageWidth - margin - 50;

  const totalsRows = [
    ["SUBTOTAL", data.subtotal.toFixed(2)],
    ["SUB-TOTAL ISV TAX 15 %", data.isv15.toFixed(2)],
    ["SUB-TOTAL ISV TAX 18 %", data.isv18.toFixed(2)],
    ["SUB-TOTAL W/O TAX", (data.subtotal - data.isv15 - data.isv18).toFixed(2)],
    ["SUB-TOTAL EXONERATED", data.subtotalExonerated.toFixed(2)],
    ["DISCOUNTS", data.discounts.toFixed(2)],
    ["AIR FREIGHT", data.airFreight > 0 ? data.airFreight.toFixed(2) : ""],
    ["SUBTOTAL", data.subtotal.toFixed(2)],
    ["15% ISV", data.isv15.toFixed(2)],
    ["18% ISV", data.isv18.toFixed(2)],
    ["TOTAL INVOICE", data.totalInvoice.toFixed(2)],
  ];

  doc.setFontSize(6.5);
  totalsRows.forEach(([label, value]) => {
    const isBold = label === "TOTAL INVOICE" || label === "SUBTOTAL";
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.text(label, totalsX, y);
    doc.text(value, pageWidth - margin, y, { align: "right" });
    y += 3;
  });

  y += 2;

  // Totals row
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL`, margin, y);
  doc.text(`${data.totalGrossWeight.toFixed(1)}`, margin + 15, y);
  doc.text(`${data.totalNetWeight.toFixed(1)}`, margin + 30, y);
  doc.text(`${data.totalBoxes}`, margin + 42, y);
  doc.text(`${data.totalStems.toLocaleString()}`, margin + 55, y);

  doc.text(`GROSS Weight Kgr`, margin + 75, y);
  doc.text(`${data.totalGrossWeight.toFixed(1)}`, margin + 110, y);
  y += 3;
  doc.text(`NET Weight Kgr`, margin + 75, y);
  doc.text(`${data.totalNetWeight.toFixed(1)}`, margin + 110, y);

  // Paid / Balance
  doc.text(`PAID`, totalsX, y - 3);
  doc.text(data.paid.toFixed(2), pageWidth - margin, y - 3, { align: "right" });
  doc.text(`BALANCE`, totalsX, y);
  doc.text(data.balance.toFixed(2), pageWidth - margin, y, { align: "right" });

  y += 5;

  // Lempiras conversion
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text(`Lps Currency`, margin, y);
  doc.text(`Exchange rate`, margin + 25, y);
  doc.text(`USD $`, margin + 50, y);
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.text(`L ${data.totalHNL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin, y);
  doc.text(`L ${data.exchangeRate.toFixed(4)}`, margin + 25, y);
  doc.text(`${data.totalInvoice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + 50, y);

  // Pay this amount
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Pay this", pageWidth - margin - 15, y - 3);
  doc.text("Amount", pageWidth - margin - 15, y);

  y += 8;

  // Variant watermark
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...blue);
  doc.text(variant === "BANCO" ? "ORIGINAL" : "INTERNAL COPY", pageWidth / 2, y, { align: "center" });

  y += 6;

  // Signature line
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...black);
  doc.line(margin, y, margin + 50, y);
  y += 3;
  doc.text("Agrigentum, S.A.", margin, y);

  return doc;
}

/**
 * Generate both BANCO and JASON PDFs and trigger downloads.
 */
export function downloadInvoicePDFs(data: InvoiceData): void {
  const banco = generateInvoicePDF(data, "BANCO");
  const jason = generateInvoicePDF(data, "JASON");

  const numPart = data.invoiceNumber.replace(/[^0-9]/g, "").slice(-4);

  banco.save(`Invoice_${numPart}_BANCO.pdf`);
  setTimeout(() => {
    jason.save(`Invoice_${numPart}_JASON.pdf`);
  }, 500);
}
