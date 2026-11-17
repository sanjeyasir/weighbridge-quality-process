import React from "react";
import { Modal, Button, Table, Row, Col, Badge } from "react-bootstrap";
import { generateAcceptanceNotePDF } from "../../../utils/acceptanceNotePdfGenerator";

export default function PrintableAcceptanceNoteModal({
  show,
  onHide,
  request
}) {
  if (!request) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    generateAcceptanceNotePDF(request);
  };

  const formatDate = (dStr) => {
    if (!dStr) return "—";
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return dStr;
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      scrollable
    >
      <Modal.Header closeButton className="bg-light py-2.5 px-4 border-bottom d-print-none">
        <div className="d-flex align-items-center justify-content-between w-100 me-3">
          <div className="d-flex align-items-center gap-2">
            <span className={`badge px-2.5 py-1 fw-bold ${request.company === "RILEYS" ? "bg-primary" : "bg-success"}`}>
              {request.company}
            </span>
            <Modal.Title className="fw-bold fs-5 text-dark mb-0">
              Acceptance Note Document Preview — Ticket #{request.ticketNo}
            </Modal.Title>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm fw-semibold d-flex align-items-center gap-1.5"
              onClick={handlePrint}
            >
              <i className="bi bi-printer"></i>
              <span>Print</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm fw-semibold d-flex align-items-center gap-1.5 shadow-sm"
              onClick={handleDownloadPDF}
            >
              <i className="bi bi-file-earmark-pdf-fill"></i>
              <span>Download PDF Report</span>
            </button>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4 bg-white" id="printable-acceptance-note">
        {/* Printable Document Sheet matching rileytemplate.xlsx */}
        <div className="border border-dark p-4 bg-white" style={{ fontFamily: "Arial, sans-serif", fontSize: "0.85rem", color: "#000" }}>
          {/* Header Title */}
          <div className="text-center mb-2 pb-2 border-bottom border-dark position-relative">
            <h4 className="fw-bold mb-0 text-uppercase tracking-wide">
              Incoming Acceptance Note — Fibre
            </h4>
            <div className="position-absolute end-0 top-0 text-end small fw-semibold font-monospace">
              QP 13/PR FORM 15
            </div>
          </div>

          {/* Issue & Revision Meta */}
          <div className="d-flex justify-content-between small text-secondary pb-2 mb-3 border-bottom font-monospace">
            <span>Issue No : 00</span>
            <span>Revision Date: N/A</span>
            <span>Rev. No: 00</span>
          </div>

          {/* Top Particulars & Deductions Grid (Matching Riley template rows 5-12) */}
          <div className="table-responsive mb-3">
            <table className="table table-bordered border-dark table-sm mb-0 align-middle">
              <tbody>
                {/* Row 1 */}
                <tr>
                  <td className="bg-light fw-bold" style={{ width: "4%" }}>1</td>
                  <td className="fw-semibold" style={{ width: "22%" }}>Company/Location</td>
                  <td className="fw-bold font-monospace text-primary" style={{ width: "24%" }}>{request.company}</td>
                  <td className="bg-light fw-bold" style={{ width: "4%" }}>7</td>
                  <td className="fw-semibold" style={{ width: "24%" }}>WBT Weight (WBT)</td>
                  <td className="fw-bold text-end font-monospace" style={{ width: "16%" }}>{Number(request.wbtWeight || 0).toLocaleString()} Kg</td>
                </tr>

                {/* Row 2 */}
                <tr>
                  <td className="bg-light fw-bold">2</td>
                  <td className="fw-semibold">Date</td>
                  <td>{formatDate(request.date)}</td>
                  <td className="bg-light fw-bold">8</td>
                  <td className="fw-semibold">Moisture Cut ({request.moistureCutPercent || 0}%)</td>
                  <td className="text-danger fw-bold text-end font-monospace">
                    -{Number(request.moistureCutKg || 0).toFixed(2)} Kg
                  </td>
                </tr>

                {/* Row 3 */}
                <tr>
                  <td className="bg-light fw-bold">3</td>
                  <td className="fw-semibold">WBT / TR No</td>
                  <td className="fw-bold font-monospace text-primary">{request.ticketNo}</td>
                  <td className="bg-light fw-bold">9</td>
                  <td className="fw-semibold">Moisture Un-Cut ({request.moistureUnCutPercent || 0}%)</td>
                  <td className="text-end font-monospace">{Number(request.moistureUnCutKg || 0).toFixed(2)} Kg</td>
                </tr>

                {/* Row 4 */}
                <tr>
                  <td className="bg-light fw-bold">4</td>
                  <td className="fw-semibold">Supplier Name</td>
                  <td className="fw-bold">{request.supplier}</td>
                  <td className="bg-light fw-bold">10</td>
                  <td className="fw-semibold">Trade Cut ({request.tradeCutPercent || 0}%)</td>
                  <td className="text-danger fw-bold text-end font-monospace">
                    -{Number(request.tradeCutKg || 0).toFixed(2)} Kg
                  </td>
                </tr>

                {/* Row 5 */}
                <tr>
                  <td className="bg-light fw-bold"></td>
                  <td className="fw-semibold">Lorry No</td>
                  <td className="font-monospace fw-semibold">{request.lorryNo || "—"}</td>
                  <td className="bg-light fw-bold">11</td>
                  <td className="fw-bold text-primary">Weight for Payment (WP)</td>
                  <td className="fw-bold text-primary text-end font-monospace fs-7">
                    {Number(request.weightForPayment || 0).toLocaleString()} Kg
                  </td>
                </tr>

                {/* Row 6 */}
                <tr>
                  <td className="bg-light fw-bold">5</td>
                  <td className="fw-semibold">Grade</td>
                  <td className="fw-semibold">{request.grade || "YJ042"}</td>
                  <td className="bg-light fw-bold">12</td>
                  <td className="fw-semibold">Rate</td>
                  <td className="text-end font-monospace">Rs {Number(request.ratePerKg || 0).toFixed(2)} / Kg</td>
                </tr>

                {/* Row 7 */}
                <tr>
                  <td className="bg-light fw-bold"></td>
                  <td className="fw-semibold">Tick Method</td>
                  <td>{request.tickMethod || "MMR"}</td>
                  <td className="bg-light fw-bold">13</td>
                  <td className="fw-bold text-success">Payment Total (Rs)</td>
                  <td className="fw-bold text-success text-end font-monospace fs-7">
                    Rs {Number(request.totalPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>

                {/* Row 8 */}
                <tr>
                  <td className="bg-light fw-bold"></td>
                  <td className="fw-semibold">Weight for GRN (WGRN)</td>
                  <td className="font-monospace">{Number(request.weightForGrn || request.weightForPayment || 0).toLocaleString()} Kg</td>
                  <td className="bg-light fw-bold">15</td>
                  <td className="fw-semibold">Effective Price</td>
                  <td className="text-end font-monospace">Rs {Number(request.effectivePrice || request.ratePerKg || 0).toFixed(2)} / Kg</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 6: Samples (S1 - S5) Table */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="fw-bold text-dark">6. Samples Intake Quality Test:</span>
              <span className="font-monospace small">
                Average Moisture: <strong>{request.avgMoisturePercent || 0}%</strong> • 
                Pass/Fail: <strong className={request.avgMoisturePercent <= 20 ? "text-success" : "text-warning"}>{request.passFail || "Pass"}</strong>
              </span>
            </div>

            <table className="table table-bordered border-dark table-sm mb-0 text-center align-middle" style={{ fontSize: "0.8rem" }}>
              <thead className="table-light">
                <tr>
                  <th>Sample</th>
                  <th>Moisture %</th>
                  <th>Weight (g)</th>
                  <th>Length (cm)</th>
                  <th>No of Strings</th>
                  <th>Brk Strength</th>
                  <th>Runnage</th>
                  <th>Warp</th>
                  <th>Weft</th>
                  <th>Rope Dia</th>
                  <th>Twist</th>
                </tr>
              </thead>
              <tbody>
                {(request.samples || []).map((s) => (
                  <tr key={s.sampleNo}>
                    <td className="fw-bold font-monospace bg-light">{s.sampleNo}</td>
                    <td className="font-monospace fw-semibold">{s.moisture || "—"}</td>
                    <td>{s.weight || "—"}</td>
                    <td>{s.length || "—"}</td>
                    <td>{s.noOfStrings || "—"}</td>
                    <td>{s.brkStrength || "—"}</td>
                    <td>{s.runnage || "—"}</td>
                    <td>{s.warp || "—"}</td>
                    <td>{s.weft || "—"}</td>
                    <td>{s.ropeDiameter || "—"}</td>
                    <td>{s.noOfTwist || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Dry Test & Hackling Test (Rows 14-23) */}
          <Row className="g-2 mb-3">
            <Col xs={6}>
              <div className="border border-dark p-2">
                <span className="fw-bold d-block mb-1 small text-uppercase">Dry Test (MMR 20% Std - RM)</span>
                <table className="table table-sm table-borderless mb-0 small">
                  <tbody>
                    <tr>
                      <td className="text-muted">Weight:</td>
                      <td className="font-monospace fw-semibold text-end">{request.dryTest?.weight || 100} g</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Weight after Dry:</td>
                      <td className="font-monospace fw-semibold text-end">{request.dryTest?.weightAfterDry || "—"} g</td>
                    </tr>
                    <tr className="border-top">
                      <td className="fw-bold">Actual Loss (Moisture):</td>
                      <td className="font-monospace fw-bold text-end text-primary">{request.dryTest?.actualLossMoisture || "—"} %</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Col>

            <Col xs={6}>
              <div className="border border-dark p-2">
                <span className="fw-bold d-block mb-1 small text-uppercase">Hackling Test</span>
                <table className="table table-sm table-borderless mb-0 small">
                  <tbody>
                    <tr>
                      <td className="text-muted">BO %: {request.hacklingTest?.boPercent || 0}%</td>
                      <td className="text-muted">SF %: {request.hacklingTest?.sfPercent || 0}%</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Pith %: {request.hacklingTest?.pithPercent || 0}%</td>
                      <td className="text-muted">Dust %: {request.hacklingTest?.dustPercent || 0}%</td>
                    </tr>
                    <tr className="border-top">
                      <td className="fw-bold" colSpan={2}>
                        Quality Comment: <span className="text-primary fw-bold">{request.hacklingTest?.qualityComment || "Good"}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Col>
          </Row>

          {/* Non-Conformities & Action Taken */}
          <div className="border border-dark p-2 mb-4 small">
            <div className="d-flex flex-wrap gap-3 mb-1">
              <span className="fw-bold">Non-Conformities:</span>
              <span>[ {request.nonConformities?.highMoisture ? "✓" : " "} ] High Moisture</span>
              <span>[ {request.nonConformities?.offColour ? "✓" : " "} ] Off Colour</span>
              <span>[ {request.nonConformities?.veryPithy ? "✓" : " "} ] Very Pithy</span>
              <span>[ {request.nonConformities?.foreignMatters ? "✓" : " "} ] Foreign Matters</span>
              <span>[ {request.nonConformities?.other ? "✓" : " "} ] Other</span>
            </div>
            <div>
              <strong>Action Taken:</strong> {request.actionTaken || "Standard processing authorized."}
            </div>
            {request.remarks && (
              <div className="mt-1 text-muted">
                <strong>Remarks:</strong> {request.remarks}
              </div>
            )}
          </div>

          {/* Authorization & 4 Signature Boxes (Rows 28-33) */}
          <div className="border border-dark mb-2">
            <Row className="g-0 text-center">
              {/* 1. Intake QC */}
              <Col xs={3} className="border-end border-dark p-2">
                <div className="fw-bold small text-uppercase mb-1">Intake QC</div>
                <div className="py-2 font-monospace fw-semibold small text-primary">
                  {request.intakeQc?.name || "S. Fernando (QC)"}
                </div>
                <div className="text-muted fs-9 border-top pt-1">
                  Signature & Timestamp
                </div>
              </Col>

              {/* 2. Purchase Authorized: Location Head */}
              <Col xs={3} className="border-end border-dark p-2">
                <div className="fw-bold small text-uppercase mb-1">Location Head / FM</div>
                <div className="py-2 font-monospace fw-semibold small text-dark">
                  {request.locationHead?.approved ? request.locationHead.name : <span className="text-muted fst-italic">Pending</span>}
                </div>
                <div className="text-muted fs-9 border-top pt-1">
                  Purchase Authorized
                </div>
              </Col>

              {/* 3. Checked by Accountant */}
              <Col xs={3} className="border-end border-dark p-2">
                <div className="fw-bold small text-uppercase mb-1">Accountant</div>
                <div className="py-2 font-monospace fw-semibold small text-dark">
                  {request.accountant?.checked ? request.accountant.name : <span className="text-muted fst-italic">Pending</span>}
                </div>
                <div className="text-muted fs-9 border-top pt-1">
                  Costing & GRN Verified
                </div>
              </Col>

              {/* 4. Payment Authorized: Finance Manager */}
              <Col xs={3} className="p-2">
                <div className="fw-bold small text-uppercase mb-1">Finance Manager / CEO</div>
                <div className="py-2 font-monospace fw-semibold small text-dark">
                  {request.financeManager?.approved ? request.financeManager.name : <span className="text-muted fst-italic">Pending</span>}
                </div>
                <div className="text-muted fs-9 border-top pt-1">
                  Payment Authorized
                </div>
              </Col>
            </Row>
          </div>

          {/* Payment Completion Slip */}
          {request.payment?.completed && (
            <div className="p-2 border border-success bg-light small d-flex justify-content-between align-items-center mt-2">
              <div>
                <strong className="text-success">Payment Executed:</strong> {request.payment.paymentMode} Ref: <span className="font-monospace fw-bold">{request.payment.refNo}</span>
              </div>
              <div>
                Paid Date: <span className="font-monospace">{request.payment.paidDate}</span> • Amount: <strong className="font-monospace">Rs {Number(request.payment.paidAmount || request.totalPayment || 0).toLocaleString()}</strong>
              </div>
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer className="bg-light py-2 px-4 border-top d-flex justify-content-between align-items-center d-print-none">
        <button type="button" className="btn btn-secondary btn-sm px-3" onClick={onHide}>
          Close
        </button>
        <div className="d-flex align-items-center gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm px-3" onClick={handlePrint}>
            <i className="bi bi-printer me-1.5"></i>
            Print
          </button>
          <button type="button" className="btn btn-primary btn-sm px-4 fw-semibold shadow-sm" onClick={handleDownloadPDF}>
            <i className="bi bi-file-earmark-pdf-fill me-1.5"></i>
            Download PDF Report
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

