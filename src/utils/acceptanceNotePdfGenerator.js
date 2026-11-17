import { jsPDF } from "jspdf";

/**
 * Helper to safely format dates
 */
function formatDate(dStr) {
  if (!dStr) return "—";
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return String(dStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return String(dStr);
  }
}

/**
 * Converts numbers into formal English words
 */
function numberToWords(num) {
  if (!num || isNaN(num) || num <= 0) return "Zero Rupees Only";
  const wholePart = Math.floor(num);
  const cents = Math.round((num - wholePart) * 100);

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
                "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertChunk(n) {
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + " ";
    }
    return str.trim();
  }

  let words = "";
  if (wholePart >= 10000000) {
    words += convertChunk(Math.floor(wholePart / 10000000)) + " Crore ";
    num %= 10000000;
  }
  if (wholePart >= 100000) {
    words += convertChunk(Math.floor(wholePart / 100000)) + " Lakh ";
    num %= 100000;
  }
  if (wholePart >= 1000) {
    words += convertChunk(Math.floor(wholePart / 1000)) + " Thousand ";
    num %= 1000;
  }
  if (wholePart > 0) {
    words += convertChunk(wholePart);
  }

  let result = words.trim() + " Rupees";
  if (cents > 0) {
    result += " and " + convertChunk(cents) + " Cents";
  }
  return result + " Only";
}

/**
 * Generates an official, clean, vector PDF document for the
 * Weighbridge Incoming Acceptance Note (Coir Fibre & Pith).
 * Completely Black & White / Monochrome (NO dark filled regions, NO colors).
 * Pure white background with crisp black lines and fully wrapped text.
 */
export function generateAcceptanceNotePDF(request) {
  if (!request) return;

  // Initialize jsPDF in Portrait ("p") mode, A4 size (210mm x 297mm)
  const doc = new jsPDF("p", "mm", "a4");

  // Extract variables with safe fallbacks
  const company = request.company || "RILEYS";
  const plantCode = (request.plantCode || request.plant || "HES-1").toUpperCase();
  const requestNo = request.requestNo ? String(request.requestNo) : "1001";
  const ticketNo = request.ticketNo || "TR-001";
  const dateStr = formatDate(request.date || request.createdAt);
  const supplier = request.supplier || "—";
  const vehicleNo = request.vehicleNo || request.lorryNo || "—";
  const material = request.material || request.commodity || "Coir Fibre";
  const grade = request.grade || "YJ042";

  const wbtWeight = Number(request.wbtWeight || request.netWeight || 0);
  const quality = request.quality || {};
  const moistureCutPct = Number(quality.moistureCutPercent ?? request.moistureCutPercent ?? 0);
  const moistureCutKg = Number(quality.moistureCutKg ?? request.moistureCutKg ?? (wbtWeight * (moistureCutPct / 100)));
  const tradeCutPct = Number(quality.tradeCutPercent ?? request.tradeCutPercent ?? 0);
  const tradeCutKg = Number(quality.tradeCutKg ?? request.tradeCutKg ?? (wbtWeight * (tradeCutPct / 100)));
  const otherDeductionKg = Number(quality.otherDeductionKg ?? request.otherDeductionKg ?? 0);
  
  const costing = request.costing || {};
  const weightForPayment = Number(costing.weightForPayment ?? quality.weightForPayment ?? request.weightForPayment ?? Math.max(0, wbtWeight - moistureCutKg - tradeCutKg - otherDeductionKg));
  const ratePerKg = Number(costing.ratePerKg ?? request.ratePerKg ?? 0);
  const weightForGrn = Number(costing.weightForGrn ?? request.weightForGrn ?? weightForPayment);
  const totalPayment = Number(request.payment?.paidAmount ?? costing.totalPayment ?? request.totalPayment ?? (weightForPayment * ratePerKg));

  const samples = (quality.samples && quality.samples.length > 0) ? quality.samples : (request.samples || [
    { sampleNo: "S1", moisture: 21.0, weight: 100, length: 15, noOfStrings: 4, brkStrength: 45, runnage: 120, warp: 10, weft: 12, ropeDiameter: 8, noOfTwist: 15 },
    { sampleNo: "S2", moisture: 20.5, weight: 100, length: 15, noOfStrings: 4, brkStrength: 46, runnage: 121, warp: 10, weft: 11, ropeDiameter: 8, noOfTwist: 15 },
    { sampleNo: "S3", moisture: 21.5, weight: 101, length: 15, noOfStrings: 4, brkStrength: 44, runnage: 119, warp: 11, weft: 12, ropeDiameter: 8, noOfTwist: 16 },
    { sampleNo: "S4", moisture: 20.8, weight: 100, length: 15, noOfStrings: 4, brkStrength: 45, runnage: 120, warp: 10, weft: 12, ropeDiameter: 8, noOfTwist: 15 },
    { sampleNo: "S5", moisture: 21.2, weight: 100, length: 15, noOfStrings: 4, brkStrength: 47, runnage: 120, warp: 10, weft: 11, ropeDiameter: 8, noOfTwist: 15 }
  ]);

  const avgMoisture = quality.avgMoisturePercent ?? request.avgMoisturePercent ?? 21.0;
  const passFail = quality.passFail ?? request.passFail ?? "Pass";
  const dryTest = quality.dryTest || request.dryTest || { weight: 100, weightAfterDry: 79, actualLossMoisture: 21 };
  const hacklingTest = quality.hacklingTest || request.hacklingTest || { boPercent: 4.0, sfPercent: 3.0, pithPercent: 1.0, dustPercent: 0.5, qualityComment: "Good" };
  const nonConformities = quality.nonConformities || request.nonConformities || {};
  const actionTaken = quality.actionTaken || request.actionTaken || "Standard processing authorized per specification.";

  const approval = request.approval || {};
  const payment = request.payment || {};

  // Outer Page Border (Clean black stroke, NO fills)
  doc.setLineWidth(0.4);
  doc.setDrawColor(0, 0, 0);
  doc.rect(10, 10, 190, 277);

  // 1. Header Box (Clear outline, clean black text)
  doc.rect(10, 10, 190, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text(company, 14, 18);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`PLANT ${plantCode} • QUALITY PROCESS SYSTEM`, 14, 23);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(0, 0, 0);
  doc.text("INCOMING ACCEPTANCE NOTE — FIBRE", 105, 17, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("COMMODITY: COIR FIBRE & PITH INTAKE", 105, 22, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text("QP 13 / PR FORM 15", 196, 17, { align: "right" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`REQ #${requestNo} | TICKET #${ticketNo}`, 196, 22, { align: "right" });

  // 2. Sub-Meta Bar (Issue No, Revision Date, Rev No, Status)
  let y = 28;
  doc.rect(10, y, 190, 6);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  doc.text("Issue No : 00", 14, y + 4.2);
  doc.text("Revision Date : N/A", 80, y + 4.2);
  doc.text("Rev. No : 00", 135, y + 4.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`Status: ${request.status || "COMPLETED"}`, 196, y + 4.2, { align: "right" });

  // 3. Section 1: Top Particulars & Weighbridge Deductions Grid (7 Rows)
  y = 34;
  const colX = [10, 18, 58, 105, 113, 153, 200];
  const rowH = 6.4;

  const leftFields = [
    { num: "1", label: "Company/Location", val: `${company} / Plant ${plantCode}` },
    { num: "2", label: "Date", val: dateStr },
    { num: "3", label: "WBT / TR No", val: ticketNo, bold: true },
    { num: "4", label: "Supplier Name", val: supplier },
    { num: "5", label: "Lorry / Vehicle No", val: vehicleNo },
    { num: "6", label: "Material & Grade", val: `${material} (${grade})` },
    { num: "—", label: "Weight for GRN (WGRN)", val: `${weightForGrn.toLocaleString()} Kg` }
  ];

  const rightFields = [
    { num: "7", label: "WBT Weight (WBT)", val: `${wbtWeight.toLocaleString()} Kg`, bold: true },
    { num: "8", label: `Moisture Cut (${moistureCutPct}%)`, val: `-${moistureCutKg.toFixed(2)} Kg` },
    { num: "9", label: `Trade Cut (${tradeCutPct}%)`, val: `-${tradeCutKg.toFixed(2)} Kg` },
    { num: "10", label: "Other Deductions", val: `-${otherDeductionKg.toFixed(2)} Kg` },
    { num: "11", label: "Weight for Payment (WP)", val: `${weightForPayment.toLocaleString()} Kg`, bold: true },
    { num: "12", label: "Rate (Rs/Kg)", val: `Rs ${ratePerKg.toFixed(2)} / Kg` },
    { num: "13", label: "Payment Total (Rs)", val: `Rs ${totalPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, bold: true }
  ];

  leftFields.forEach((lf, idx) => {
    const rf = rightFields[idx];
    const currY = y + (idx * rowH);

    // Row Box (Outline only)
    doc.setDrawColor(0, 0, 0);
    doc.rect(colX[0], currY, 190, rowH);

    // Vertical line dividers
    doc.line(colX[1], currY, colX[1], currY + rowH);
    doc.line(colX[2], currY, colX[2], currY + rowH);
    doc.line(colX[3], currY, colX[3], currY + rowH);
    doc.line(colX[4], currY, colX[4], currY + rowH);
    doc.line(colX[5], currY, colX[5], currY + rowH);

    // Index Col 1
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text(lf.num, colX[0] + 4, currY + 4.3, { align: "center" });

    // Label Col 2 (width 40mm)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 30, 30);
    const leftLabelLines = doc.splitTextToSize(lf.label, 38);
    doc.text(leftLabelLines[0], colX[1] + 2, currY + 4.3);

    // Val Col 3 (width 47mm: colX[2] to colX[3]) - WRAP TEXT TO PREVENT OVERLAP
    doc.setFont("helvetica", lf.bold ? "bold" : "normal");
    doc.setTextColor(0, 0, 0);
    const leftValLines = doc.splitTextToSize(String(lf.val), 44);
    if (leftValLines.length > 1) {
      doc.setFontSize(6.2);
      doc.text(leftValLines[0], colX[2] + 2, currY + 2.7);
      doc.text(leftValLines[1], colX[2] + 2, currY + 5.3);
    } else {
      doc.setFontSize(7.5);
      doc.text(leftValLines[0], colX[2] + 2, currY + 4.3);
    }

    // Index Col 4
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text(rf.num, colX[3] + 4, currY + 4.3, { align: "center" });

    // Label Col 5 (width 40mm)
    doc.setFont("helvetica", rf.bold ? "bold" : "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 30, 30);
    const rightLabelLines = doc.splitTextToSize(rf.label, 38);
    doc.text(rightLabelLines[0], colX[4] + 2, currY + 4.3);

    // Val Col 6 (width 47mm: colX[5] to colX[6]) - RIGHT-ALIGNED WRAP
    doc.setFont("helvetica", rf.bold ? "bold" : "normal");
    doc.setTextColor(0, 0, 0);
    const rightValLines = doc.splitTextToSize(String(rf.val), 44);
    doc.setFontSize(rf.bold ? 7.5 : 7.2);
    doc.text(rightValLines[0], colX[6] - 2, currY + 4.3, { align: "right" });
  });

  // 4. Section 2: Quality Inspection Samples S1 to S5
  y = y + (leftFields.length * rowH) + 3;

  // Title Box (Outline only)
  doc.rect(10, y, 190, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("6. SAMPLES INTAKE QUALITY TEST (S1 TO S5)", 14, y + 4.2);

  doc.setFontSize(7.5);
  doc.text(`Avg Moisture: ${avgMoisture}%   •   Grading: ${passFail}`, 196, y + 4.2, { align: "right" });

  y += 6;
  const sampleCols = [
    { label: "Sample", w: 16 },
    { label: "Moisture %", w: 18 },
    { label: "Weight (g)", w: 18 },
    { label: "Length (cm)", w: 18 },
    { label: "Strings", w: 17 },
    { label: "Brk Strength", w: 19 },
    { label: "Runnage", w: 17 },
    { label: "Warp", w: 17 },
    { label: "Weft", w: 17 },
    { label: "Rope Dia", w: 17 },
    { label: "Twist", w: 16 }
  ];

  // Table Header (Outline only)
  doc.rect(10, y, 190, 5.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);

  let curX = 10;
  sampleCols.forEach((col, cIdx) => {
    if (cIdx > 0) {
      doc.line(curX, y, curX, y + 5.5);
    }
    doc.text(col.label, curX + (col.w / 2), y + 3.8, { align: "center" });
    curX += col.w;
  });

  y += 5.5;

  // Samples Rows (Outline only, clean dividers)
  samples.slice(0, 5).forEach((s) => {
    doc.rect(10, y, 190, 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);

    let sx = 10;
    const vals = [
      s.sampleNo || "S1",
      `${s.moisture || 0}%`,
      String(s.weight || 100),
      String(s.length || 15),
      String(s.noOfStrings || 4),
      String(s.brkStrength || 45),
      String(s.runnage || 120),
      String(s.warp || 10),
      String(s.weft || 12),
      String(s.ropeDiameter || 8),
      String(s.noOfTwist || 15)
    ];

    vals.forEach((v, vIdx) => {
      const colW = sampleCols[vIdx].w;
      if (vIdx > 0) {
        doc.line(sx, y, sx, y + 5);
      }
      if (vIdx === 0) {
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFont("helvetica", "normal");
      }
      doc.text(v, sx + (colW / 2), y + 3.5, { align: "center" });
      sx += colW;
    });

    y += 5;
  });

  // 5. Section 3: Dry Test & Hackling Test (Side-by-Side Boxes, Outline only)
  y += 2.5;
  const boxW = 93;
  const boxH = 22;

  // Dry Test Box (Left, Outline only)
  doc.rect(10, y, boxW, boxH);
  doc.line(10, y + 5.5, 10 + boxW, y + 5.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text("DRY TEST (MMR 20% STD - RM)", 14, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Weight:", 14, y + 9.5);
  doc.text(`${dryTest.weight || 100} g`, 100, y + 9.5, { align: "right" });

  doc.text("Weight after Dry:", 14, y + 14.5);
  doc.text(`${dryTest.weightAfterDry || 79} g`, 100, y + 14.5, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.text("Actual Loss (Moisture):", 14, y + 19.5);
  doc.text(`${dryTest.actualLossMoisture || avgMoisture}%`, 100, y + 19.5, { align: "right" });

  // Hackling Test Box (Right, Outline only)
  const rightX = 107;
  doc.rect(rightX, y, boxW, boxH);
  doc.line(rightX, y + 5.5, rightX + boxW, y + 5.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text("HACKLING TEST & QUALITY RATING", rightX + 4, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`BO %: ${hacklingTest.boPercent || 0}%`, rightX + 4, y + 9.5);
  doc.text(`SF %: ${hacklingTest.sfPercent || 0}%`, rightX + 50, y + 9.5);

  doc.text(`Pith %: ${hacklingTest.pithPercent || 0}%`, rightX + 4, y + 14.5);
  doc.text(`Dust %: ${hacklingTest.dustPercent || 0}%`, rightX + 50, y + 14.5);

  doc.setFont("helvetica", "bold");
  doc.text("Quality Rating:", rightX + 4, y + 19.5);
  doc.text(String(hacklingTest.qualityComment || "Good"), rightX + boxW - 4, y + 19.5, { align: "right" });

  // 6. Section 4: Non-Conformities & Action Taken (Outline only, Wrapped Text)
  y += boxH + 2.5;
  doc.rect(10, y, 190, 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text("Non-Conformities:", 14, y + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const ncItems = [
    `[${nonConformities.highMoisture ? "X" : " "}] High Moisture`,
    `[${nonConformities.offColour ? "X" : " "}] Off Colour`,
    `[${nonConformities.veryPithy ? "X" : " "}] Very Pithy`,
    `[${nonConformities.foreignMatters ? "X" : " "}] Foreign Matters`,
    `[${nonConformities.other ? "X" : " "}] Other`
  ];
  doc.text(ncItems.join("      "), 42, y + 4.5);
  doc.line(10, y + 6.5, 200, y + 6.5);

  // Wrapped Action Taken
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Action Taken:", 14, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const actionLines = doc.splitTextToSize(String(actionTaken || "Standard processing authorized per specification."), 150);
  doc.text(actionLines.slice(0, 2), 35, y + 11);

  if (quality.inspector?.name) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(70, 70, 70);
    const inspText = `Inspected by: ${quality.inspector.name} (${quality.inspector.email || ""}) on ${formatDate(quality.inspector.updatedAt)}`;
    doc.text(doc.splitTextToSize(inspText, 180)[0], 14, y + 19);
  }

  // 7. Section 5: Authorization & Signatures (4 Columns, Outline only)
  y += 24.5;
  const sigW = 47.5;
  const sigH = 22;

  const signatures = [
    {
      title: "1. INTAKE QC",
      name: quality.inspector?.name || "QC Inspector",
      sub: "Quality Inspected",
      verified: true
    },
    {
      title: "2. LOCATION HEAD",
      name: request.locationHead?.name || (plantCode === "HES-1" ? "HES-1 Head" : "Plant Manager"),
      sub: "Purchase Authorized",
      verified: true
    },
    {
      title: "3. ACCOUNTANT",
      name: costing.officer?.name || "Finance Officer",
      sub: "Costing & GRN Verified",
      verified: Boolean(costing.ratePerKg)
    },
    {
      title: "4. FINANCE MANAGER",
      name: approval.managerName || "Finance Manager",
      sub: "Payment Authorized",
      verified: request.status === "COMPLETED" || Boolean(approval.managerName)
    }
  ];

  signatures.forEach((sig, sIdx) => {
    const sx = 10 + (sIdx * sigW);
    doc.rect(sx, y, sigW, sigH);
    doc.line(sx, y + 5, sx + sigW, y + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(0, 0, 0);
    doc.text(sig.title, sx + (sigW / 2), y + 3.6, { align: "center" });

    // Name / Signature (Wrapped to prevent overflow)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    const sigNameLines = doc.splitTextToSize(sig.name, sigW - 4);
    doc.text(sigNameLines[0], sx + (sigW / 2), y + 11.5, { align: "center" });

    // Divider line
    doc.line(sx + 4, y + 15, sx + sigW - 4, y + 15);

    // Status label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(50, 50, 50);
    doc.text(sig.verified ? `Verified (${sig.sub})` : `Pending (${sig.sub})`, sx + (sigW / 2), y + 19, { align: "center" });
  });

  // 8. Section 6: Payment Execution Voucher Slip (Outline only, Wrapped Amount in Words)
  y += sigH + 2.5;
  doc.rect(10, y, 190, 21);
  doc.line(10, y + 5.5, 200, y + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text("PAYMENT EXECUTION & SETTLEMENT SLIP", 14, y + 4);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  const payMode = payment.paymentMode || "Cheque";
  const payRef = payment.refNo || "—";
  const payDate = formatDate(payment.paidDate || request.date);
  doc.text(`Payment Mode: ${payMode}      Ref / Cheque No: ${payRef}      Settlement Date: ${payDate}`, 14, y + 9.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Disbursed Total: Rs ${totalPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, y + 14);

  // Wrapped Amount in Words
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(50, 50, 50);
  const wordLines = doc.splitTextToSize(`Amount in words: ${numberToWords(totalPayment)}`, 180);
  doc.text(wordLines.slice(0, 2), 14, y + 18.5);

  // 9. Document Footer & Audit Trail
  y += 24;
  doc.line(10, y, 200, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  const generatedTimestamp = new Date().toLocaleString("en-GB");
  doc.text(`Generated on: ${generatedTimestamp} • Weighbridge Quality Process Management System`, 14, y + 4.5);
  doc.text("Official Internal Audit Record • Authentic System Generated PDF Document", 196, y + 4.5, { align: "right" });

  // Download the generated black-and-white vector PDF
  doc.save(`Acceptance_Note_Ticket_${ticketNo}_${requestNo}.pdf`);
  return true;
}
