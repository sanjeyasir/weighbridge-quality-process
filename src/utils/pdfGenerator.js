import { jsPDF } from "jspdf";

/**
 * Helper to safely format Firestore Timestamps, JS Dates, and ISO strings
 */
function formatDate(timestamp) {
  if (!timestamp) return "";
  try {
    // If Firestore Timestamp
    if (timestamp && typeof timestamp.toDate === "function") {
      return timestamp.toDate().toLocaleDateString();
    }
    // If timestamp has seconds/nanoseconds fields (sometimes serialized)
    if (timestamp && timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
  } catch (e) {
    return "";
  }
}

/**
 * Generates and downloads the Coir Fiber Pith Receipt PDF
 * in LANDSCAPE orientation, matching the physical document layout exactly.
 */
export async function downloadReceiptPDF(request) {
  if (!request) return;

  // Initialize jsPDF in Landscape ("l") mode, A4 size
  const doc = new jsPDF("l", "mm", "a4");

  // Set Times New Roman Font
  doc.setFont("times", "normal");

  // Outer Border Box (Width: 277mm, Height: 190mm)
  doc.setLineWidth(0.4);
  doc.rect(10, 10, 277, 190);

  // Top Title Headers
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("Coir Fiber Pith Receipt", 148, 18, { align: "center" });

  doc.setFontSize(9);
  doc.text(`CR No: ${request.qualityNo || "52062"}`, 235, 18);
  
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.text("REF NO: FM 10 SOP 03/D1", 235, 23);
  doc.line(10, 26, 287, 26);

  // Table Row 1: No., CONSEC No, DATE, TIME, 1st Weight, 2nd Weight, Gross Weight
  doc.line(10, 31, 287, 31);
  doc.line(10, 37, 287, 37);

  // Draw Vertical lines for Row 1
  doc.line(50, 26, 50, 37); // No | Consec
  doc.line(80, 26, 80, 37); // Consec | Date
  doc.line(115, 26, 115, 37); // Date | Time
  doc.line(150, 26, 150, 37); // Time | 1st W
  doc.line(195, 26, 195, 37); // 1st W | 2nd W
  doc.line(240, 26, 240, 37); // 2nd W | Gross

  doc.setFont("times", "bold");
  doc.text("No.", 12, 30);
  doc.text("CONSEC No", 52, 30);
  doc.text("DATE", 82, 30);
  doc.text("TIME", 117, 30);
  doc.text("1st Weight", 152, 30);
  doc.text("2nd Weight", 197, 30);
  doc.text("Gross Weight", 242, 30);

  doc.setFont("times", "normal");
  doc.text(request.vehicleNo || "-", 12, 35);
  doc.text(request.consecNo || "-", 52, 35);
  doc.text(request.date || "-", 82, 35);
  doc.text(request.time1 || "-", 117, 35);
  doc.text(request.firstWeight ? `${request.firstWeight} kg` : "-", 152, 35);
  doc.text(request.secondWeight ? `${request.secondWeight} kg` : "-", 197, 35);
  doc.text(request.netWeight ? `${request.netWeight} kg` : "-", 242, 35);

  // Middle Section Split (Contractor on Left, Calculations on Right)
  // X limits: Left (10 to 148), Right (148 to 287).
  // Divider runs vertically down from x = 148
  doc.line(148, 37, 148, 114);
  doc.line(10, 114, 287, 114);

  // Left Section Rows (General Info)
  let y = 43;
  const leftItems = [
    { label: "MILL", val: request.mill || "CPH-Galle" },
    { label: "CONTRACT No", val: request.commodity || "-" },
    { label: "CODE No.", val: "-" },
    { label: "MILL OWNER", val: request.supplier || "-" },
    { label: "Weight By", val: "Weighbridge Automation" },
    { label: "Received By", val: request.requestedBy?.name || "System Office" },
    { label: "Supplier rep", val: request.supplierRep || "-" }
  ];

  leftItems.forEach(item => {
    doc.setFont("times", "bold");
    doc.text(item.label, 12, y);
    doc.setFont("times", "normal");
    doc.text(String(item.val), 55, y);
    doc.line(10, y + 2, 148, y + 2);
    y += 10;
  });

  // Right Section Rows (Deductions & Calculations)
  // X limits: 148 to 287
  y = 43;
  
  // H2O Row
  doc.setFont("times", "bold");
  doc.text("H2O %", 150, y);
  doc.setFont("times", "normal");
  doc.text(request.h2oPercent || "9.5%", 180, y);
  doc.setFont("times", "bold");
  doc.text("AV BAG WT:", 210, y);
  doc.setFont("times", "normal");
  doc.text(request.avBagWt || "0.1 kg", 240, y);
  doc.line(148, y + 2, 287, y + 2);

  // Dedn/MT Row
  y += 10;
  doc.setFont("times", "bold");
  doc.text("Dedn/MT", 150, y);
  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.text(`Wastage: ${request.wastage !== undefined ? request.wastage : "-"} kg`, 180, y - 1.5);
  doc.text(`Moisture: ${request.moistureCut !== undefined ? request.moistureCut : "-"} kg`, 180, y + 2);
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.text("Net Weight:", 215, y);
  doc.setFont("times", "normal");
  doc.text(request.netWeightQty ? `${request.netWeightQty} kg` : "-", 245, y);
  doc.line(148, y + 2, 287, y + 2);

  // Rate Approved
  y += 10;
  doc.setFont("times", "bold");
  doc.text("RATE (PMT)", 150, y);
  doc.setFont("times", "normal");
  doc.text(request.rateApproval !== undefined ? `Rs. ${request.rateApproval.toFixed(2)}` : "-", 200, y);
  doc.line(148, y + 2, 287, y + 2);

  // Premium
  y += 10;
  doc.setFont("times", "bold");
  doc.text("PREMIUM", 150, y);
  doc.setFont("times", "normal");
  doc.text("-", 200, y);
  doc.line(148, y + 2, 287, y + 2);

  // Oil Deduction
  y += 10;
  doc.setFont("times", "bold");
  doc.text("OIL DEDUCTION (Rs)", 150, y);
  doc.setFont("times", "normal");
  doc.text("-", 200, y);
  doc.line(148, y + 2, 287, y + 2);

  // Deduction Adv
  y += 10;
  doc.setFont("times", "bold");
  doc.text("DEDUCTION (Adv)", 150, y);
  doc.setFont("times", "normal");
  doc.text(request.deduction !== undefined ? `Rs. ${request.deduction.toFixed(2)}` : "-", 200, y);
  doc.line(148, y + 2, 287, y + 2);

  // Net Value
  y += 10;
  doc.setFont("times", "bold");
  doc.text("NET VALUE (Rs.)", 150, y);
  doc.setFont("times", "bold");
  doc.text(request.netPayment ? `Rs. ${request.netPayment.toLocaleString(undefined, {minimumFractionDigits: 2})}` : "-", 200, y);

  // Y: 114 (Amount in Words box)
  doc.setFont("times", "bold");
  doc.text("Amount (in words):", 12, 119);
  doc.setFont("times", "normal");
  const words = request.netPayment 
    ? "Forty seven thousand seven hundred eighty four rupees and fifty cents only" 
    : "....................................................................................................................................................";
  doc.text(words, 45, 119);
  doc.line(10, 122, 287, 122);

  // Y: 122 start Quality Table (Left) and Payment Settlements (Right)
  // X limits: Quality Table (10 to 190), Payment (190 to 287)
  // Vertical split line at x = 190
  doc.line(190, 122, 190, 168);
  doc.line(10, 168, 287, 168);

  // Quality parameters title
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.text("SAMPLE EVALUATION PARAMETERS", 12, 127);

  // Draw Quality Table Headers Y: 129
  doc.setFontSize(6.5);
  doc.text("Sample Lot", 11, 132);
  doc.text("Sand%", 30, 132);
  doc.text("+1/4\"+3/8\"%", 44, 132);
  doc.text("FM%", 65, 132);
  doc.text("Mo%Rig", 80, 132);
  doc.text("Probe%", 97, 132);
  doc.text("EC", 116, 132);
  doc.text("pH", 128, 132);
  doc.text("BSBD", 140, 132);
  doc.text("Box", 154, 132);
  doc.text("BD", 168, 132);
  doc.line(10, 134, 190, 134);

  // Draw Quality samples rows Y: 134 to 168
  let qY = 138;
  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  const mockOrRealSamples = request.samples || [
    { sampleLotNo: "24", sand: "", sieve1438: "", fm: "", moRig: "", avgMoistProbe: "", ec: "", ph: "", bsbd: "", box: "", bd: "" },
    { sampleLotNo: "56", sand: "", sieve1438: "", fm: "", moRig: "", avgMoistProbe: "", ec: "", ph: "", bsbd: "", box: "", bd: "" },
    { sampleLotNo: "90", sand: "", sieve1438: "", fm: "", moRig: "", avgMoistProbe: "", ec: "", ph: "", bsbd: "", box: "", bd: "" }
  ];

  mockOrRealSamples.forEach(row => {
    doc.text(String(row.sampleLotNo || ""), 11, qY);
    doc.text(row.sand ? `${row.sand}%` : "-", 30, qY);
    doc.text(row.sieve1438 ? `${row.sieve1438}%` : "-", 44, qY);
    doc.text(row.fm ? `${row.fm}%` : "-", 65, qY);
    doc.text(row.moRig ? `${row.moRig}%` : "-", 80, qY);
    doc.text(row.avgMoistProbe ? `${row.avgMoistProbe}%` : "-", 97, qY);
    doc.text(String(row.ec || "-"), 116, qY);
    doc.text(String(row.ph || "-"), 128, qY);
    doc.text(String(row.bsbd || "-"), 140, qY);
    doc.text(String(row.box || "-"), 154, qY);
    doc.text(String(row.bd || "-"), 168, qY);
    doc.line(10, qY + 2, 190, qY + 2);
    qY += 8;
  });

  // Right Side Bottom Section: Payment Settled Outcomes (X: 190 to 287)
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.text("PAYMENT SETTLED OUTCOMES", 192, 127);
  doc.line(190, 129, 287, 129);

  let pY = 135;
  const payItems = [
    { label: "PAYMENT MODE", val: request.paymentMode || "-" },
    { label: "Cheque No", val: request.chequeNo || "-" },
    { label: "Received Name", val: request.receivedByName || "-" },
    { label: "NIC No.", val: request.nicNo || "-" }
  ];

  payItems.forEach(item => {
    doc.setFont("times", "bold");
    doc.text(item.label, 192, pY);
    doc.setFont("times", "normal");
    doc.text(String(item.val), 225, pY);
    doc.line(190, pY + 2, 287, pY + 2);
    pY += 8;
  });

  // Y: 168 to 200 (Signatures block)
  // Grid split vertical lines at x = 95, 190
  doc.line(95, 168, 95, 200);
  doc.line(190, 168, 190, 200);

  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.text("QC By (Sign)", 12, 173);
  doc.text("Payee Identified by", 97, 173);
  doc.text("Payee / Authorised by", 192, 173);

  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.text("....................", 12, 185);
  doc.text("....................", 97, 185);
  doc.text("....................", 192, 185);

  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.text(`Date: ${formatDate(request.qcBy?.timestamp)}`, 12, 192);
  doc.text(`Date: ${formatDate(request.financeBy?.timestamp)}`, 97, 192);
  doc.text(`Date: ${formatDate(request.financeBy?.timestamp)}`, 192, 192);

  // Trigger download
  doc.save(`Receipt_Ticket_${request.requestNo || "Draft"}.pdf`);
}
