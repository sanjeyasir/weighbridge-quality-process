import React, { useState, useEffect, useMemo } from "react";
import { Modal, Row, Col, Table, Form, Badge, Alert, Button } from "react-bootstrap";
import { 
  getCompanyConfigs, 
  createQualityCostingRequest 
} from "../../../services/firebase/qualityCostingService";
import { useAuth } from "../../../contexts/AuthContext";

export default function RileyToyoTemplateModal({
  show,
  onHide,
  hes1Transactions = [],
  preselectedTx = null,
  initialCompany = "RILEYS",
  onRequestCreated
}) {
  const { currentUser } = useAuth();
  const [company, setCompany] = useState(initialCompany || "RILEYS");
  const [configs, setConfigs] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form State
  const [ticketNo, setTicketNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState("");
  const [lorryNo, setLorryNo] = useState("");
  const [grade, setGrade] = useState("YJ042");
  const [tickMethod, setTickMethod] = useState("MMR"); // "Box", "MMR", "Dry Test"

  // Weights & Deductions
  const [wbtWeight, setWbtWeight] = useState(0); // Net weight kg from weighbridge
  const [moistureCutPercent, setMoistureCutPercent] = useState(9.60);
  const [moistureUnCutPercent, setMoistureUnCutPercent] = useState(0);
  const [tradeCutPercent, setTradeCutPercent] = useState(0.00);
  const [otherDeductionKg, setOtherDeductionKg] = useState(0);
  const [ratePerKg, setRatePerKg] = useState(170.00);
  const [remarks, setRemarks] = useState("");

  // Quality Samples (S1 to S5) matching rileytemplate.xlsx
  const defaultSamples = [
    { sampleNo: "S1", moisture: 29.6, weight: 100, length: 15, noOfStrings: 4, brkStrength: 45, runnage: 120, warp: 10, weft: 12, ropeDiameter: 8, noOfTwist: 15 },
    { sampleNo: "S2", moisture: 29.4, weight: 102, length: 15, noOfStrings: 4, brkStrength: 46, runnage: 122, warp: 10, weft: 11, ropeDiameter: 8, noOfTwist: 15 },
    { sampleNo: "S3", moisture: 29.8, weight: 99, length: 16, noOfStrings: 4, brkStrength: 44, runnage: 119, warp: 11, weft: 12, ropeDiameter: 8, noOfTwist: 16 },
    { sampleNo: "S4", moisture: 29.5, weight: 101, length: 15, noOfStrings: 4, brkStrength: 45, runnage: 121, warp: 10, weft: 12, ropeDiameter: 8, noOfTwist: 15 },
    { sampleNo: "S5", moisture: 29.7, weight: 100, length: 16, noOfStrings: 4, brkStrength: 47, runnage: 120, warp: 10, weft: 11, ropeDiameter: 8, noOfTwist: 15 }
  ];
  const [samples, setSamples] = useState(defaultSamples);

  // Dry Test & Hackling Test
  const [dryTest, setDryTest] = useState({
    weight: 100,
    weightAfterDry: 70.4,
    actualLossMoisture: 29.6
  });

  const [hacklingTest, setHacklingTest] = useState({
    boPercent: 5.0,
    sfPercent: 3.5,
    pithPercent: 1.0,
    dustPercent: 0.5,
    qualityComment: "Good" // Good, Average, Poor, Reject
  });

  // Non-Conformities
  const [nonConformities, setNonConformities] = useState({
    highMoisture: false,
    offColour: false,
    veryPithy: false,
    foreignMatters: false,
    other: false,
    details: ""
  });
  const [actionTaken, setActionTaken] = useState("Standard moisture deduction applied.");

  // Load configs on mount or company change
  useEffect(() => {
    getCompanyConfigs().then((cfg) => {
      setConfigs(cfg);
      const compCfg = cfg?.[company] || {};
      if (compCfg.moistureCutPercent != null) {
        setMoistureCutPercent(Number(compCfg.moistureCutPercent));
      }
      if (compCfg.tradeCutPercent != null) {
        setTradeCutPercent(Number(compCfg.tradeCutPercent));
      }
      if (compCfg.standardRatePerKg != null) {
        setRatePerKg(Number(compCfg.standardRatePerKg));
      }
    });
  }, [company]);

  // Handle preselected transaction on open
  useEffect(() => {
    if (preselectedTx) {
      setTicketNo(preselectedTx.transaction_no || "");
      setSupplier(preselectedTx.supplier_name || "");
      setLorryNo(preselectedTx.vehicle_no || "");
      setGrade(preselectedTx.material_name || "YJ042");
      const net = preselectedTx.final_net_weight_kg ?? preselectedTx.net_weight_kg ?? 0;
      setWbtWeight(Number(net));
    }
  }, [preselectedTx]);

  // When ticket dropdown is changed, auto-populate particulars
  const handleTicketSelect = (selectedTNo) => {
    setTicketNo(selectedTNo);
    const found = hes1Transactions.find(t => t.transaction_no === selectedTNo);
    if (found) {
      setSupplier(found.supplier_name || "");
      setLorryNo(found.vehicle_no || "");
      setGrade(found.material_name || "YJ042");
      const net = found.final_net_weight_kg ?? found.net_weight_kg ?? 0;
      setWbtWeight(Number(net));
    }
  };

  // Live Auto-Calculations
  const calculations = useMemo(() => {
    const wbt = Number(wbtWeight) || 0;
    const mCutPct = Number(moistureCutPercent) || 0;
    const mCutKg = (wbt * (mCutPct / 100));

    const mUnCutPct = Number(moistureUnCutPercent) || 0;
    const mUnCutKg = (wbt * (mUnCutPct / 100));

    const tCutPct = Number(tradeCutPercent) || 0;
    const tCutKg = (wbt * (tCutPct / 100));

    const otherDed = Number(otherDeductionKg) || 0;

    // Weight for Payment (WP) = WBT Weight - Moisture Cut Kg - Trade Cut Kg - Other Deductions
    const weightForPayment = Math.max(0, wbt - mCutKg - tCutKg - otherDed);

    const rate = Number(ratePerKg) || 0;
    const totalPayment = weightForPayment * rate;

    const weightForGrn = weightForPayment;
    const effectivePrice = weightForGrn > 0 ? (totalPayment / weightForGrn) : rate;

    // Samples Average Moisture
    const validSamples = samples.filter(s => s.moisture !== "" && !isNaN(Number(s.moisture)));
    const avgMoisture = validSamples.length > 0
      ? validSamples.reduce((acc, s) => acc + Number(s.moisture), 0) / validSamples.length
      : 0;

    const passFail = avgMoisture <= 20.0 ? "Pass" : (avgMoisture <= 30.0 ? "Pass (with Cut)" : "Fail / High Moisture");

    return {
      wbt,
      mCutKg: Number(mCutKg.toFixed(2)),
      mUnCutKg: Number(mUnCutKg.toFixed(2)),
      tCutKg: Number(tCutKg.toFixed(2)),
      weightForPayment: Number(weightForPayment.toFixed(2)),
      totalPayment: Number(totalPayment.toFixed(2)),
      weightForGrn: Number(weightForGrn.toFixed(2)),
      effectivePrice: Number(effectivePrice.toFixed(2)),
      avgMoisture: Number(avgMoisture.toFixed(2)),
      passFail
    };
  }, [wbtWeight, moistureCutPercent, moistureUnCutPercent, tradeCutPercent, otherDeductionKg, ratePerKg, samples]);

  // Update sample row
  const handleSampleChange = (index, field, value) => {
    setSamples(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Form submission
  const handleSubmit = async (submitForApproval = true) => {
    if (!ticketNo.trim()) {
      setErrorMessage("Please select or enter a valid Ticket Number.");
      return;
    }
    if (!supplier.trim()) {
      setErrorMessage("Supplier name is required.");
      return;
    }
    if (wbtWeight <= 0) {
      setErrorMessage("WBT Net Weight must be greater than zero.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const payload = {
        company,
        ticketNo: ticketNo.trim(),
        date,
        supplier: supplier.trim(),
        lorryNo: lorryNo.trim(),
        grade: grade.trim(),
        tickMethod,
        wbtWeight: Number(wbtWeight),
        moistureCutPercent: Number(moistureCutPercent),
        moistureCutKg: calculations.mCutKg,
        moistureUnCutPercent: Number(moistureUnCutPercent),
        moistureUnCutKg: calculations.mUnCutKg,
        tradeCutPercent: Number(tradeCutPercent),
        tradeCutKg: calculations.tCutKg,
        otherDeductionKg: Number(otherDeductionKg),
        weightForPayment: calculations.weightForPayment,
        ratePerKg: Number(ratePerKg),
        totalPayment: calculations.totalPayment,
        weightForGrn: calculations.weightForGrn,
        effectivePrice: calculations.effectivePrice,
        remarks: remarks.trim(),
        samples,
        avgMoisturePercent: calculations.avgMoisture,
        passFail: calculations.passFail,
        dryTest,
        hacklingTest,
        nonConformities,
        actionTaken,
        submitImmediately: submitForApproval
      };

      const result = await createQualityCostingRequest(payload, currentUser);
      setSubmitting(false);
      if (onRequestCreated) onRequestCreated(result);
      onHide();
    } catch (err) {
      console.error("Failed to create request:", err);
      setErrorMessage(err.message || "Failed to create Quality & Costing record.");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      scrollable
      backdrop="static"
    >
      <Modal.Header closeButton className="bg-light py-2.5 px-4 border-bottom">
        <div className="d-flex align-items-center justify-content-between w-100 me-3">
          <div className="d-flex align-items-center gap-3">
            <span className={`badge px-3 py-1.5 fw-bold fs-7 ${company === "RILEYS" ? "bg-primary" : "bg-success"}`}>
              {company}
            </span>
            <div>
              <Modal.Title className="fw-bold mb-0 text-dark fs-5">
                Incoming Acceptance Note — Fibre (QP 13/PR FORM 15)
              </Modal.Title>
              <span className="text-secondary small">
                Weighbridge Quality & Costing Process • Issue No: 00 • Rev No: 00
              </span>
            </div>
          </div>

          {/* Company Toggle Buttons */}
          <div className="btn-group shadow-sm" role="group">
            <button
              type="button"
              className={`btn btn-sm fw-semibold px-3 ${company === "RILEYS" ? "btn-primary" : "btn-outline-primary bg-white"}`}
              onClick={() => setCompany("RILEYS")}
            >
              RILEYS
            </button>
            <button
              type="button"
              className={`btn btn-sm fw-semibold px-3 ${company === "TOYO" ? "btn-success" : "btn-outline-success bg-white"}`}
              onClick={() => setCompany("TOYO")}
            >
              TOYO
            </button>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4 bg-light">
        {errorMessage && (
          <Alert variant="danger" dismissible onClose={() => setErrorMessage("")} className="py-2 mb-3 shadow-sm">
            <i className="bi bi-exclamation-octagon-fill me-2"></i>
            {errorMessage}
          </Alert>
        )}

        {/* Template Form Container */}
        <div className="card border shadow-sm rounded-3 bg-white p-3 mb-3">
          {/* Section 1: Header Particulars */}
          <div className="d-flex align-items-center justify-content-between pb-2 mb-3 border-bottom">
            <h6 className="fw-bold text-dark mb-0 text-uppercase" style={{ letterSpacing: "0.03em" }}>
              1. General Particulars & Ticket Association
            </h6>
            <span className="badge bg-light text-secondary border">
              Format: {company} Official Acceptance Note
            </span>
          </div>

          <Row className="g-3">
            {/* WBT Ticket Selector */}
            <Col xs={12} md={4}>
              <label className="form-label small fw-bold text-dark mb-1">
                3. WBT / TR No (Ticket #) <span className="text-danger">*</span>
              </label>
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  className="form-control font-monospace fw-bold text-primary"
                  placeholder="e.g. KF8079 or 32079"
                  value={ticketNo}
                  onChange={(e) => setTicketNo(e.target.value)}
                  list="hes1-ticket-list"
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => handleTicketSelect(ticketNo)}
                  title="Load ticket particulars"
                >
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>
              <datalist id="hes1-ticket-list">
                {hes1Transactions.map(t => (
                  <option key={t.transaction_no} value={t.transaction_no}>
                    {t.transaction_no} — {t.supplier_name} ({t.material_name})
                  </option>
                ))}
              </datalist>
              <div className="text-muted small mt-1" style={{ fontSize: "0.75rem" }}>
                Select from HES-1 transactions or type manually
              </div>
            </Col>

            {/* Date */}
            <Col xs={6} md={2}>
              <label className="form-label small fw-bold text-dark mb-1">
                2. Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Col>

            {/* Company / Location */}
            <Col xs={6} md={2}>
              <label className="form-label small fw-bold text-dark mb-1">
                1. Company / Location
              </label>
              <input
                type="text"
                className="form-control form-control-sm fw-bold bg-light"
                readOnly
                value={company}
              />
            </Col>

            {/* Supplier Name */}
            <Col xs={12} md={4}>
              <label className="form-label small fw-bold text-dark mb-1">
                4. Supplier Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control form-control-sm fw-semibold"
                placeholder="Supplier name"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </Col>

            {/* Lorry / Vehicle No */}
            <Col xs={6} md={3}>
              <label className="form-label small fw-bold text-dark mb-1">
                Lorry No (Vehicle)
              </label>
              <input
                type="text"
                className="form-control form-control-sm font-monospace"
                placeholder="e.g. PX-7046"
                value={lorryNo}
                onChange={(e) => setLorryNo(e.target.value)}
              />
            </Col>

            {/* Grade */}
            <Col xs={6} md={3}>
              <label className="form-label small fw-bold text-dark mb-1">
                5. Grade / Material
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. YJ042"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
            </Col>

            {/* Tick Method */}
            <Col xs={12} md={6}>
              <label className="form-label small fw-bold text-dark mb-1">
                Tick Method
              </label>
              <div className="d-flex align-items-center gap-3 pt-1">
                {["Box", "MMR", "Dry Test"].map((m) => (
                  <div key={m} className="form-check form-check-inline mb-0">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="tickMethodRadio"
                      id={`method-${m}`}
                      value={m}
                      checked={tickMethod === m}
                      onChange={(e) => setTickMethod(e.target.value)}
                    />
                    <label className="form-check-label small fw-medium" htmlFor={`method-${m}`}>
                      {m}
                    </label>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        </div>

        {/* Section 2: Weight, Deductions & Costing Calculations */}
        <div className="card border shadow-sm rounded-3 bg-white p-3 mb-3">
          <div className="d-flex align-items-center justify-content-between pb-2 mb-3 border-bottom">
            <h6 className="fw-bold text-dark mb-0 text-uppercase" style={{ letterSpacing: "0.03em" }}>
              2. Weight Deductions & Costing Calculations (Riley Template)
            </h6>
            <span className="text-muted small">
              Live automated calculations per template formula
            </span>
          </div>

          <Row className="g-3">
            {/* 7. WBT Weight (WBT) */}
            <Col xs={12} sm={6} md={3}>
              <div className="p-2.5 rounded-2 border bg-light">
                <label className="form-label small fw-bold text-dark mb-1">
                  7. WBT Weight (Net Weight) <span className="text-danger">*</span>
                </label>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    step="any"
                    className="form-control font-monospace fw-bold fs-6 text-primary"
                    placeholder="0"
                    value={wbtWeight}
                    onChange={(e) => setWbtWeight(e.target.value)}
                  />
                  <span className="input-group-text bg-white">Kg</span>
                </div>
                <div className="text-muted small mt-1" style={{ fontSize: "0.72rem" }}>
                  Scale net weight from Ticket #{ticketNo || "—"}
                </div>
              </div>
            </Col>

            {/* 8. Moisture Cut % */}
            <Col xs={12} sm={6} md={3}>
              <div className="p-2.5 rounded-2 border bg-light">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label small fw-bold text-dark mb-0">
                    8. Moisture Cut %
                  </label>
                  <span className="badge bg-secondary-subtle text-dark fs-9">
                    {company} Spec
                  </span>
                </div>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    step="0.01"
                    className="form-control font-monospace fw-semibold"
                    value={moistureCutPercent}
                    onChange={(e) => setMoistureCutPercent(e.target.value)}
                  />
                  <span className="input-group-text bg-white">%</span>
                </div>
                <div className="text-danger fw-bold small mt-1" style={{ fontSize: "0.78rem" }}>
                  Deduction: -{calculations.mCutKg.toLocaleString()} Kg
                </div>
              </div>
            </Col>

            {/* 9. Moisture Un-Cut % */}
            <Col xs={12} sm={6} md={3}>
              <div className="p-2.5 rounded-2 border bg-light">
                <label className="form-label small fw-bold text-dark mb-1">
                  9. Moisture Un-Cut %
                </label>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    step="0.01"
                    className="form-control font-monospace"
                    value={moistureUnCutPercent}
                    onChange={(e) => setMoistureUnCutPercent(e.target.value)}
                  />
                  <span className="input-group-text bg-white">%</span>
                </div>
                <div className="text-muted small mt-1" style={{ fontSize: "0.78rem" }}>
                  Un-Cut: {calculations.mUnCutKg.toLocaleString()} Kg
                </div>
              </div>
            </Col>

            {/* 10. Trade Cut % */}
            <Col xs={12} sm={6} md={3}>
              <div className="p-2.5 rounded-2 border bg-light">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label small fw-bold text-dark mb-0">
                    10. Trade Cut %
                  </label>
                  <span className="badge bg-secondary-subtle text-dark fs-9">
                    Configurable
                  </span>
                </div>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    step="0.01"
                    className="form-control font-monospace fw-semibold"
                    value={tradeCutPercent}
                    onChange={(e) => setTradeCutPercent(e.target.value)}
                  />
                  <span className="input-group-text bg-white">%</span>
                </div>
                <div className="text-danger fw-bold small mt-1" style={{ fontSize: "0.78rem" }}>
                  Deduction: -{calculations.tCutKg.toLocaleString()} Kg
                </div>
              </div>
            </Col>

            {/* 11. Weight for Payment (WP) */}
            <Col xs={12} sm={6} md={4}>
              <div className="p-3 rounded-2 border border-primary bg-primary bg-opacity-10 h-100">
                <span className="text-primary small fw-bold d-block mb-1 text-uppercase">
                  11. Weight for Payment (WP)
                </span>
                <h4 className="fw-bold mb-1 text-primary font-monospace">
                  {calculations.weightForPayment.toLocaleString()} <small className="fs-6">Kg</small>
                </h4>
                <div className="text-secondary small" style={{ fontSize: "0.75rem" }}>
                  Net Weight after all deductions ({calculations.wbt} - {calculations.mCutKg} - {calculations.tCutKg})
                </div>
              </div>
            </Col>

            {/* 12. Rate (Per Kg Cost) */}
            <Col xs={12} sm={6} md={4}>
              <div className="p-3 rounded-2 border bg-light h-100">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-dark small fw-bold text-uppercase">
                    12. Rate / Per Kg Cost (Rs)
                  </span>
                  <span className="badge bg-info-subtle text-dark fs-9">
                    Monitored in Log
                  </span>
                </div>
                <div className="input-group input-group-sm mb-1">
                  <span className="input-group-text bg-white fw-bold">Rs</span>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control font-monospace fw-bold fs-6 text-dark"
                    value={ratePerKg}
                    onChange={(e) => setRatePerKg(e.target.value)}
                  />
                </div>
                <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                  Standard baseline: Rs {configs?.[company]?.standardRatePerKg || 170.00}/Kg
                </div>
              </div>
            </Col>

            {/* 13. Total Payment */}
            <Col xs={12} sm={12} md={4}>
              <div className="p-3 rounded-2 border border-success bg-success bg-opacity-10 h-100">
                <span className="text-success small fw-bold d-block mb-1 text-uppercase">
                  13. Total Payment (Rs)
                </span>
                <h4 className="fw-bold mb-1 text-success font-monospace">
                  Rs {calculations.totalPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
                <div className="text-secondary small" style={{ fontSize: "0.75rem" }}>
                  WP ({calculations.weightForPayment} Kg) × Rate (Rs {ratePerKg})
                </div>
              </div>
            </Col>

            {/* Additional Fields: 14. Weight for GRN & 15. Effective Price */}
            <Col xs={6} md={6}>
              <div className="d-flex align-items-center gap-2 p-2 rounded-2 border bg-white">
                <span className="fw-bold small text-secondary">14. Weight for GRN (WGRN):</span>
                <span className="font-monospace fw-bold text-dark">{calculations.weightForGrn.toLocaleString()} Kg</span>
              </div>
            </Col>

            <Col xs={6} md={6}>
              <div className="d-flex align-items-center gap-2 p-2 rounded-2 border bg-white">
                <span className="fw-bold small text-secondary">15. Effective Price:</span>
                <span className="font-monospace fw-bold text-dark">Rs {calculations.effectivePrice.toFixed(2)} / Kg</span>
              </div>
            </Col>
          </Row>
        </div>

        {/* Section 3: Quality Samples (Intake QC Moisture & Tests) */}
        <div className="card border shadow-sm rounded-3 bg-white p-3 mb-3">
          <div className="d-flex align-items-center justify-content-between pb-2 mb-3 border-bottom">
            <div>
              <h6 className="fw-bold text-dark mb-0 text-uppercase" style={{ letterSpacing: "0.03em" }}>
                3. Quality Intake Inspection & Samples (6. Samples S1 - S5)
              </h6>
              <span className="text-secondary small">
                Technical quality inspector provides average moisture and physical characteristics
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold small text-dark">Average Moisture (AVG%):</span>
              <span className="badge bg-primary fs-7 font-monospace px-2.5 py-1">
                {calculations.avgMoisture}%
              </span>
              <span className={`badge ${calculations.avgMoisture <= 20 ? "bg-success" : "bg-warning text-dark"} fs-7 px-2.5 py-1`}>
                {calculations.passFail}
              </span>
            </div>
          </div>

          {/* Samples Table S1-S5 */}
          <div className="table-responsive mb-3">
            <Table bordered hover size="sm" className="align-middle text-center mb-0" style={{ fontSize: "0.82rem" }}>
              <thead className="table-light text-secondary text-uppercase fw-semibold">
                <tr>
                  <th style={{ width: 70 }}>Sample</th>
                  <th style={{ width: 100 }}>Moisture %</th>
                  <th style={{ width: 90 }}>Weight (g)</th>
                  <th style={{ width: 90 }}>Length (cm)</th>
                  <th style={{ width: 100 }}>No of Strings</th>
                  <th style={{ width: 105 }}>Brk Strength</th>
                  <th style={{ width: 90 }}>Runnage</th>
                  <th style={{ width: 80 }}>Warp</th>
                  <th style={{ width: 80 }}>Weft</th>
                  <th style={{ width: 100 }}>Rope Dia (mm)</th>
                  <th style={{ width: 90 }}>No of Twist</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s, idx) => (
                  <tr key={s.sampleNo}>
                    <td className="fw-bold text-dark font-monospace">{s.sampleNo}</td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control form-control-sm text-center font-monospace fw-semibold p-1"
                        value={s.moisture}
                        onChange={(e) => handleSampleChange(idx, "moisture", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm text-center p-1"
                        value={s.weight}
                        onChange={(e) => handleSampleChange(idx, "weight", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm text-center p-1"
                        value={s.length}
                        onChange={(e) => handleSampleChange(idx, "length", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm text-center p-1"
                        value={s.noOfStrings}
                        onChange={(e) => handleSampleChange(idx, "noOfStrings", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm text-center p-1"
                        value={s.brkStrength}
                        onChange={(e) => handleSampleChange(idx, "brkStrength", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm text-center p-1"
                        value={s.runnage}
                        onChange={(e) => handleSampleChange(idx, "runnage", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm text-center p-1"
                        value={s.warp}
                        onChange={(e) => handleSampleChange(idx, "warp", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm text-center p-1"
                        value={s.weft}
                        onChange={(e) => handleSampleChange(idx, "weft", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm text-center p-1"
                        value={s.ropeDiameter}
                        onChange={(e) => handleSampleChange(idx, "ropeDiameter", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm text-center p-1"
                        value={s.noOfTwist}
                        onChange={(e) => handleSampleChange(idx, "noOfTwist", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* Dry Test & Hackling Test */}
          <Row className="g-3 mb-3">
            {/* Dry Test */}
            <Col xs={12} md={6}>
              <div className="p-2.5 rounded-2 border bg-light">
                <span className="fw-bold small text-dark d-block mb-2">
                  Dry Test (If Required — MMR 20% Std — RM)
                </span>
                <Row className="g-2">
                  <Col xs={4}>
                    <label className="form-label fs-9 fw-semibold text-secondary mb-0">Initial Wt (g)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm font-monospace"
                      value={dryTest.weight}
                      onChange={(e) => setDryTest({ ...dryTest, weight: e.target.value })}
                    />
                  </Col>
                  <Col xs={4}>
                    <label className="form-label fs-9 fw-semibold text-secondary mb-0">Wt After Dry (g)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm font-monospace"
                      value={dryTest.weightAfterDry}
                      onChange={(e) => {
                        const wAfter = Number(e.target.value) || 0;
                        const wInit = Number(dryTest.weight) || 100;
                        const loss = wInit > 0 ? ((wInit - wAfter) / wInit) * 100 : 0;
                        setDryTest({
                          ...dryTest,
                          weightAfterDry: e.target.value,
                          actualLossMoisture: Number(loss.toFixed(1))
                        });
                      }}
                    />
                  </Col>
                  <Col xs={4}>
                    <label className="form-label fs-9 fw-semibold text-secondary mb-0">Actual Loss (%)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm font-monospace fw-bold text-primary"
                      value={dryTest.actualLossMoisture}
                      onChange={(e) => setDryTest({ ...dryTest, actualLossMoisture: e.target.value })}
                    />
                  </Col>
                </Row>
              </div>
            </Col>

            {/* Hackling Test */}
            <Col xs={12} md={6}>
              <div className="p-2.5 rounded-2 border bg-light">
                <span className="fw-bold small text-dark d-block mb-2">
                  Hackling Test & Quality Grading
                </span>
                <Row className="g-2">
                  <Col xs={3}>
                    <label className="form-label fs-9 fw-semibold text-secondary mb-0">BO %</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control form-control-sm font-monospace"
                      value={hacklingTest.boPercent}
                      onChange={(e) => setHacklingTest({ ...hacklingTest, boPercent: e.target.value })}
                    />
                  </Col>
                  <Col xs={3}>
                    <label className="form-label fs-9 fw-semibold text-secondary mb-0">SF %</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control form-control-sm font-monospace"
                      value={hacklingTest.sfPercent}
                      onChange={(e) => setHacklingTest({ ...hacklingTest, sfPercent: e.target.value })}
                    />
                  </Col>
                  <Col xs={3}>
                    <label className="form-label fs-9 fw-semibold text-secondary mb-0">Pith %</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control form-control-sm font-monospace"
                      value={hacklingTest.pithPercent}
                      onChange={(e) => setHacklingTest({ ...hacklingTest, pithPercent: e.target.value })}
                    />
                  </Col>
                  <Col xs={3}>
                    <label className="form-label fs-9 fw-semibold text-secondary mb-0">Comment</label>
                    <select
                      className="form-select form-select-sm"
                      value={hacklingTest.qualityComment}
                      onChange={(e) => setHacklingTest({ ...hacklingTest, qualityComment: e.target.value })}
                    >
                      <option value="Good">Good (3)</option>
                      <option value="Average">Average (2)</option>
                      <option value="Poor">Poor (1)</option>
                      <option value="Reject">Reject (0)</option>
                    </select>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>

          {/* Non-Conformities */}
          <div className="p-2.5 rounded-2 border bg-light">
            <span className="fw-bold small text-dark d-block mb-2">
              Non-Conformities Checklist & Corrective Action
            </span>
            <div className="d-flex flex-wrap align-items-center gap-3 mb-2">
              {[
                { id: "highMoisture", label: "High Moisture" },
                { id: "offColour", label: "Off Colour" },
                { id: "veryPithy", label: "Very Pithy" },
                { id: "foreignMatters", label: "Foreign Matters" },
                { id: "other", label: "Other" }
              ].map(({ id, label }) => (
                <div key={id} className="form-check form-check-inline mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`nc-${id}`}
                    checked={nonConformities[id]}
                    onChange={(e) => setNonConformities({ ...nonConformities, [id]: e.target.checked })}
                  />
                  <label className="form-check-label small" htmlFor={`nc-${id}`}>
                    {label}
                  </label>
                </div>
              ))}
            </div>

            <Row className="g-2">
              <Col xs={12} md={6}>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Action Taken for Non-Conformity..."
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                />
              </Col>
              <Col xs={12} md={6}>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Scale Remarks / Notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </Col>
            </Row>
          </div>
        </div>

        {/* Workflow Information Footer */}
        <div className="p-3 rounded-3 border bg-white d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-shield-check text-primary fs-5"></i>
            <div>
              <div className="fw-bold small text-dark">5-Stage Approval & Payment Workflow</div>
              <div className="text-secondary small" style={{ fontSize: "0.78rem" }}>
                1. Intake QC & Costing → 2. Location Head Approval → 3. Accountant Check → 4. Finance Manager Approval → 5. Completed with Payment
              </div>
            </div>
          </div>
          <span className="badge bg-primary-subtle text-primary fw-bold">
            Anyone Can Initiate
          </span>
        </div>
      </Modal.Body>

      <Modal.Footer className="bg-light py-2 px-4 border-top d-flex justify-content-between">
        <button
          type="button"
          className="btn btn-secondary btn-sm px-3"
          onClick={onHide}
          disabled={submitting}
        >
          Cancel
        </button>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm px-3"
            onClick={() => handleSubmit(false)}
            disabled={submitting}
          >
            Save as Draft
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm px-4 fw-semibold d-flex align-items-center gap-1.5"
            onClick={() => handleSubmit(true)}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <i className="bi bi-send-check"></i>
                <span>Submit for Location Head Approval</span>
              </>
            )}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

