import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { subscribeToApiTransactions } from "../../services/firebase/weighbridgeApiService";
import { createWeighbridgeRequest } from "../../services/firebase/weighbridgeService";
import PlantSelector from "../../components/common/PlantSelector";
import { useAuth } from "../../contexts/AuthContext";
import { Card, Row, Col, Alert, Button } from "react-bootstrap";

export default function CreateProcessRequestView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth() || {};

  const isAdminMultiPlant = currentUser?.email?.toLowerCase() === "admin@gmail.com";
  const userPlant = (currentUser?.plantId || "HES-1").toUpperCase();

  const initialPlant = isAdminMultiPlant 
    ? (searchParams.get("plant") || "HES-1").toUpperCase()
    : userPlant;
  const initialTicket = searchParams.get("ticket") || "";

  const [selectedPlant, setSelectedPlant] = useState(initialPlant);
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(true);

  // Form states
  const [ticketNo, setTicketNo] = useState(initialTicket);
  const [company, setCompany] = useState("RILEYS");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [material, setMaterial] = useState("");
  const [grade, setGrade] = useState("YJ042");
  const [tickMethod, setTickMethod] = useState("MMR");
  const [firstWeight, setFirstWeight] = useState(0);
  const [secondWeight, setSecondWeight] = useState(0);
  const [wbtWeight, setWbtWeight] = useState(0);
  const [remarks, setRemarks] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  // Subscribe to live scale transactions to populate ticket list
  useEffect(() => {
    setLoadingTx(true);
    const unsub = subscribeToApiTransactions(
      (data) => {
        setTransactions(data);
        setLoadingTx(false);
      },
      (err) => {
        console.error("Tx load error:", err);
        setLoadingTx(false);
      }
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Filter scale transactions by selected plant AND ONLY completed weighbridge integration transactions
  const plantTransactions = transactions.filter(t => {
    const tPlant = (t.plant_code || "HES-1").toUpperCase();
    if (!isAdminMultiPlant && tPlant !== userPlant) return false;
    if (isAdminMultiPlant && selectedPlant !== "ALL" && tPlant !== selectedPlant) return false;

    // Check integration completion (both 1st and 2nd weights completed or status is completed)
    const isCompleted = 
      t.status === "COMPLETED" || 
      (t.second_weight_kg != null && Number(t.second_weight_kg) > 0) ||
      (t.final_net_weight_kg != null && Number(t.final_net_weight_kg) > 0) ||
      (t.net_weight_kg != null && Number(t.net_weight_kg) > 0);

    return isCompleted;
  });

  // When ticketNo or selectedPlant changes, attempt auto-fill
  useEffect(() => {
    if (!ticketNo || transactions.length === 0) return;
    const match = transactions.find(t => t.transaction_no === ticketNo);
    if (match) {
      if (match.plant_code && isAdminMultiPlant) {
        setSelectedPlant(match.plant_code.toUpperCase());
      }
      setSupplier(match.supplier_name || "");
      setVehicleNo(match.vehicle_no || "");
      setDriverName(match.driver_name || "");
      setMaterial(match.material_name || "");
      setGrade(match.material_name?.includes("Grade") ? match.material_name : "YJ042");
      setFirstWeight(Number(match.first_weight_kg || 0));
      setSecondWeight(Number(match.second_weight_kg || 0));
      const net = match.final_net_weight_kg ?? match.net_weight_kg ?? 0;
      setWbtWeight(Number(net));
    }
  }, [ticketNo, transactions, isAdminMultiPlant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticketNo.trim()) {
      setAlertMsg({ type: "danger", text: "Please enter or select a valid scale Ticket Number." });
      return;
    }

    // Verify that the scale transaction is completed before allowing submission
    const matchedTx = transactions.find(t => t.transaction_no === ticketNo.trim());
    if (matchedTx) {
      const isCompleted = 
        matchedTx.status === "COMPLETED" || 
        (matchedTx.second_weight_kg != null && Number(matchedTx.second_weight_kg) > 0) ||
        (matchedTx.final_net_weight_kg != null && Number(matchedTx.final_net_weight_kg) > 0) ||
        (matchedTx.net_weight_kg != null && Number(matchedTx.net_weight_kg) > 0);

      if (!isCompleted) {
        setAlertMsg({ 
          type: "danger", 
          text: `Ticket #${ticketNo} is still incomplete at the weighbridge (pending 2nd reading / scale exit). A process request can only be initiated after weighbridge integration is completed.` 
        });
        return;
      }
    }

    if (!supplier.trim()) {
      setAlertMsg({ type: "danger", text: "Supplier name is required." });
      return;
    }
    if (wbtWeight <= 0) {
      setAlertMsg({ type: "warning", text: "Notice: Scale net weight (WBT) is zero or empty. Please verify weight." });
    }

    try {
      setSubmitting(true);
      setAlertMsg(null);

      const effectivePlant = isAdminMultiPlant ? (selectedPlant === "ALL" ? "HES-1" : selectedPlant) : userPlant;

      const requestPayload = {
        plantCode: effectivePlant,
        ticketNo: ticketNo.trim(),
        company,
        date,
        supplier: supplier.trim(),
        vehicleNo: vehicleNo.trim(),
        driverName: driverName.trim(),
        material: material.trim(),
        grade: grade.trim(),
        tickMethod,
        firstWeight: Number(firstWeight),
        secondWeight: Number(secondWeight),
        wbtWeight: Number(wbtWeight),
        remarks: remarks.trim()
      };

      await createWeighbridgeRequest(requestPayload, null, currentUser);
      setSubmitting(false);
      navigate("/requests/created");
    } catch (err) {
      console.error("Create request error:", err);
      setAlertMsg({ type: "danger", text: err.message || "Failed to create request." });
      setSubmitting(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-3">
      {/* Header */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h4 className="fw-bold mb-0 text-dark">Create Weighbridge Process Request</h4>
            <p className="text-secondary small mb-0 mt-1">
              Initiate an official quality and costing process for a completed scale ticket (Plant: {isAdminMultiPlant ? selectedPlant : userPlant})
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <PlantSelector
              selectedPlant={selectedPlant}
              onSelectPlant={(p) => {
                setSelectedPlant(p);
                setTicketNo("");
              }}
              showAllOption={false}
              label={isAdminMultiPlant ? "Select Plant" : "Assigned Plant"}
            />
          </div>
        </div>
      </div>

      {alertMsg && (
        <Alert variant={alertMsg.type} dismissible onClose={() => setAlertMsg(null)} className="shadow-sm">
          {alertMsg.text}
        </Alert>
      )}

      {/* Main Request Form */}
      <div className="card border shadow-sm rounded-3 bg-white p-4">
        <form onSubmit={handleSubmit}>
          {/* Step 1: Scale Ticket Selection */}
          <div className="d-flex align-items-center justify-content-between pb-2 mb-3 border-bottom">
            <h6 className="fw-bold text-dark mb-0 text-uppercase" style={{ letterSpacing: "0.03em" }}>
              1. Scale Ticket & Logistics Information (Completed Scale Records Only)
            </h6>
            <div className="btn-group shadow-sm" role="group">
              <button
                type="button"
                className={`btn btn-sm fw-bold px-3 ${company === "RILEYS" ? "btn-primary" : "btn-outline-primary bg-white"}`}
                onClick={() => setCompany("RILEYS")}
              >
                RILEYS Template
              </button>
              <button
                type="button"
                className={`btn btn-sm fw-bold px-3 ${company === "TOYO" ? "btn-success" : "btn-outline-success bg-white"}`}
                onClick={() => setCompany("TOYO")}
              >
                TOYO Template
              </button>
            </div>
          </div>

          <Row className="g-3 mb-4">
            {/* Ticket Selector */}
            <Col xs={12} md={4}>
              <label className="form-label small fw-bold text-dark mb-1">
                Completed Scale Ticket # <span className="text-danger">*</span>
              </label>
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  className="form-control font-monospace fw-bold text-primary"
                  placeholder="Ticket # e.g. KF8079"
                  value={ticketNo}
                  onChange={(e) => setTicketNo(e.target.value)}
                  list="plant-tickets-list"
                  required
                />
              </div>
              <datalist id="plant-tickets-list">
                {plantTransactions.map((t) => (
                  <option key={t.transaction_no} value={t.transaction_no}>
                    {t.transaction_no} — {t.supplier_name} ({t.material_name} - {t.final_net_weight_kg || t.net_weight_kg} kg)
                  </option>
                ))}
              </datalist>
              <span className="text-muted small" style={{ fontSize: "0.72rem" }}>
                {plantTransactions.length} completed weighbridge tickets available for Plant {isAdminMultiPlant ? selectedPlant : userPlant}
              </span>
            </Col>

            {/* Date */}
            <Col xs={6} md={2}>
              <label className="form-label small fw-bold text-dark mb-1">Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Col>

            {/* Plant Code */}
            <Col xs={6} md={2}>
              <label className="form-label small fw-bold text-dark mb-1">Plant Code</label>
              <input
                type="text"
                className="form-control form-control-sm font-monospace fw-bold bg-light"
                value={isAdminMultiPlant ? selectedPlant : userPlant}
                readOnly
              />
            </Col>

            {/* Supplier */}
            <Col xs={12} md={4}>
              <label className="form-label small fw-bold text-dark mb-1">
                Supplier Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control form-control-sm fw-semibold"
                placeholder="Supplier or Party"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                required
              />
            </Col>

            {/* Vehicle No */}
            <Col xs={6} md={3}>
              <label className="form-label small fw-bold text-dark mb-1">Vehicle / Lorry No</label>
              <input
                type="text"
                className="form-control form-control-sm font-monospace"
                placeholder="e.g. PX-7046"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
              />
            </Col>

            {/* Driver Name */}
            <Col xs={6} md={3}>
              <label className="form-label small fw-bold text-dark mb-1">Driver Name</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Driver"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </Col>

            {/* Material */}
            <Col xs={6} md={3}>
              <label className="form-label small fw-bold text-dark mb-1">Material / Commodity</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Fibre"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              />
            </Col>

            {/* Grade */}
            <Col xs={6} md={3}>
              <label className="form-label small fw-bold text-dark mb-1">Grade Code</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. YJ042"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
            </Col>
          </Row>

          {/* Step 2: Weight Scale Particulars */}
          <div className="d-flex align-items-center justify-content-between pb-2 mb-3 border-bottom">
            <h6 className="fw-bold text-dark mb-0 text-uppercase" style={{ letterSpacing: "0.03em" }}>
              2. Scale Net Weight (Basis for Quality Inspection)
            </h6>
          </div>

          <Row className="g-3 mb-4">
            <Col xs={4} md={3}>
              <div className="p-2.5 rounded-2 border bg-light">
                <span className="text-secondary small d-block mb-1">1st Weight</span>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control font-monospace"
                    value={firstWeight}
                    onChange={(e) => setFirstWeight(e.target.value)}
                  />
                  <span className="input-group-text">Kg</span>
                </div>
              </div>
            </Col>

            <Col xs={4} md={3}>
              <div className="p-2.5 rounded-2 border bg-light">
                <span className="text-secondary small d-block mb-1">2nd Weight</span>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control font-monospace"
                    value={secondWeight}
                    onChange={(e) => setSecondWeight(e.target.value)}
                  />
                  <span className="input-group-text">Kg</span>
                </div>
              </div>
            </Col>

            <Col xs={4} md={3}>
              <div className="p-2.5 rounded-2 border border-primary bg-primary bg-opacity-10">
                <span className="text-primary fw-bold small d-block mb-1">WBT Net Weight (Kg)</span>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control font-monospace fw-bold text-primary"
                    value={wbtWeight}
                    onChange={(e) => setWbtWeight(e.target.value)}
                  />
                  <span className="input-group-text">Kg</span>
                </div>
              </div>
            </Col>

            <Col xs={12} md={3}>
              <div className="p-2.5 rounded-2 border bg-light">
                <span className="text-secondary small fw-bold d-block mb-1">Testing Method</span>
                <select
                  className="form-select form-select-sm"
                  value={tickMethod}
                  onChange={(e) => setTickMethod(e.target.value)}
                >
                  <option value="MMR">MMR Test</option>
                  <option value="Box">Box Test</option>
                  <option value="Dry Test">Dry Test (RM 20%)</option>
                </select>
              </div>
            </Col>

            <Col xs={12}>
              <label className="form-label small fw-bold text-dark mb-1">Requester Scale Notes / Remarks</label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                placeholder="Optional notes for the quality inspection team..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              ></textarea>
            </Col>
          </Row>

          {/* Form Actions */}
          <div className="d-flex justify-content-between align-items-center pt-3 border-top">
            <button
              type="button"
              className="btn btn-secondary btn-sm px-3"
              onClick={() => navigate("/requests/created")}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary btn-sm px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Submitting to Live Database...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-send-check"></i>
                  <span>Submit Request (Proceed to Quality Team)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
