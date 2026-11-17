import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { subscribeToApiTransactions } from "../../services/firebase/weighbridgeApiService";
import { subscribeToWeighbridgeRequests } from "../../services/firebase/weighbridgeService";
import PlantSelector from "../../components/common/PlantSelector";
import { useAuth } from "../../contexts/AuthContext";
import { Card, Row, Col, Table, Badge, Button } from "react-bootstrap";

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth() || {};
  const isAdminMultiPlant = currentUser?.email?.toLowerCase() === "admin@gmail.com";
  const userPlant = (currentUser?.plantId || "HES-1").toUpperCase();

  const [transactions, setTransactions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState(isAdminMultiPlant ? "ALL" : userPlant);

  useEffect(() => {
    setLoading(true);
    let loadedTx = false;
    let loadedReq = false;

    const checkDone = () => {
      if (loadedTx && loadedReq) setLoading(false);
    };

    const unsubTx = subscribeToApiTransactions(
      (data) => {
        setTransactions(data);
        loadedTx = true;
        checkDone();
      },
      (err) => {
        console.error("Dashboard scale transactions error:", err);
        loadedTx = true;
        checkDone();
      }
    );

    const unsubReq = subscribeToWeighbridgeRequests(
      (data) => {
        setRequests(data);
        loadedReq = true;
        checkDone();
      },
      (err) => {
        console.error("Dashboard requests error:", err);
        loadedReq = true;
        checkDone();
      }
    );

    return () => {
      if (typeof unsubTx === "function") unsubTx();
      if (typeof unsubReq === "function") unsubReq();
    };
  }, []);

  // Filter by plant: Non-admin strictly sees only their plant's details
  const filteredTx = useMemo(() => {
    if (!isAdminMultiPlant) {
      return transactions.filter(t => (t.plant_code || "HES-1").toUpperCase() === userPlant);
    }
    if (selectedPlant === "ALL") return transactions;
    return transactions.filter(t => (t.plant_code || "HES-1").toUpperCase() === selectedPlant);
  }, [transactions, selectedPlant, isAdminMultiPlant, userPlant]);

  const filteredRequests = useMemo(() => {
    if (!isAdminMultiPlant) {
      return requests.filter(r => (r.plantCode || "HES-1").toUpperCase() === userPlant);
    }
    if (selectedPlant === "ALL") return requests;
    return requests.filter(r => (r.plantCode || "HES-1").toUpperCase() === selectedPlant);
  }, [requests, selectedPlant, isAdminMultiPlant, userPlant]);

  // Updated Operational Figures & Metrics
  const figures = useMemo(() => {
    // Scale Transactions Figures
    const totalScaleTx = filteredTx.length;
    const scaleNetKg = filteredTx.reduce((acc, t) => acc + (Number(t.final_net_weight_kg || t.net_weight_kg) || 0), 0);
    const scaleTonnage = (scaleNetKg / 1000).toFixed(1);
    const completedScaleTx = filteredTx.filter(t => t.status === "COMPLETED").length;
    const pendingScaleTx = filteredTx.filter(t => t.status !== "COMPLETED").length;

    // Process Requests Figures
    const totalRequests = filteredRequests.length;
    const pendingQuality = filteredRequests.filter(r => r.status === "PENDING_QUALITY").length;
    const pendingFinanceOfficer = filteredRequests.filter(r => r.status === "PENDING_FINANCE_OFFICER").length;
    const pendingFinanceManager = filteredRequests.filter(r => r.status === "PENDING_FINANCE_MANAGER").length;
    const completedRequests = filteredRequests.filter(r => r.status === "COMPLETED").length;
    const rejectedRequests = filteredRequests.filter(r => r.status === "REJECTED").length;

    // Total Financials & WP Tonnage
    const totalWpKg = filteredRequests.reduce((acc, r) => {
      const wp = Number(r.costing?.weightForPayment ?? r.quality?.weightForPayment ?? r.wbtWeight ?? 0);
      return acc + wp;
    }, 0);
    const totalWpTonnage = (totalWpKg / 1000).toFixed(1);

    const totalPayableAmount = filteredRequests.reduce((acc, r) => {
      const paid = Number(r.payment?.paidAmount || r.costing?.totalPayment || 0);
      return acc + paid;
    }, 0);

    return {
      totalScaleTx,
      scaleNetKg,
      scaleTonnage,
      completedScaleTx,
      pendingScaleTx,
      totalRequests,
      pendingQuality,
      pendingFinanceOfficer,
      pendingFinanceManager,
      completedRequests,
      rejectedRequests,
      totalWpKg,
      totalWpTonnage,
      totalPayableAmount
    };
  }, [filteredTx, filteredRequests]);

  const activePlantLabel = isAdminMultiPlant 
    ? (selectedPlant === "ALL" ? "All Plants (Global)" : `Plant ${selectedPlant}`)
    : `Plant ${userPlant}`;

  return (
    <div className="d-flex flex-column gap-3">
      {/* Header & Single Select Plant Dropdown */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h4 className="fw-bold mb-0 text-dark">Weighbridge & Quality Dashboard Overview</h4>
            <p className="text-secondary small mb-0 mt-1">
              Live operational metrics, scale tonnage, and multi-stage process requests for {activePlantLabel}
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <PlantSelector
              selectedPlant={selectedPlant}
              onSelectPlant={setSelectedPlant}
              showAllOption={isAdminMultiPlant}
              label={isAdminMultiPlant ? "Plant Scope" : "Assigned Plant"}
            />
          </div>
        </div>
      </div>

      {/* Row 1: Primary KPI Figures */}
      <Row className="g-3">
        {/* Scale Transactions */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border shadow-sm rounded-3 h-100 bg-white">
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary small fw-bold text-uppercase">Scale Records</span>
                <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-2">
                  <i className="bi bi-journal-text fs-5"></i>
                </div>
              </div>
              <h3 className="fw-bold mb-1 text-dark font-monospace">
                {loading ? "..." : figures.totalScaleTx}
              </h3>
              <div className="text-muted small">
                {figures.completedScaleTx} Completed • {figures.pendingScaleTx} Pending 2nd Wt
              </div>
              <Link to="/weighbridge-transactions" className="btn btn-link btn-sm p-0 text-primary mt-2 text-decoration-none fw-semibold">
                View Scale Records →
              </Link>
            </Card.Body>
          </Card>
        </Col>

        {/* Process Requests */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border shadow-sm rounded-3 h-100 bg-white">
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary small fw-bold text-uppercase">Process Requests</span>
                <div className="bg-info bg-opacity-10 text-info p-2 rounded-2">
                  <i className="bi bi-inbox fs-5"></i>
                </div>
              </div>
              <h3 className="fw-bold mb-1 text-dark font-monospace">
                {loading ? "..." : figures.totalRequests}
              </h3>
              <div className="text-muted small">
                {figures.completedRequests} Completed • {figures.rejectedRequests} Rejected
              </div>
              <Link to="/requests/created" className="btn btn-link btn-sm p-0 text-info mt-2 text-decoration-none fw-semibold">
                View Created Requests →
              </Link>
            </Card.Body>
          </Card>
        </Col>

        {/* Scale Net Tonnage */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border shadow-sm rounded-3 h-100 bg-white">
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary small fw-bold text-uppercase">Net Inward Tonnage</span>
                <div className="bg-success bg-opacity-10 text-success p-2 rounded-2">
                  <i className="bi bi-truck fs-5"></i>
                </div>
              </div>
              <h3 className="fw-bold mb-1 text-success font-monospace">
                {loading ? "..." : `${figures.scaleTonnage} MT`}
              </h3>
              <div className="text-muted small">
                {figures.scaleNetKg.toLocaleString()} Total Kilograms
              </div>
              <div className="small text-secondary mt-2">
                Weight for Payment: <strong>{figures.totalWpTonnage} MT</strong>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Total Financials */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border shadow-sm rounded-3 h-100 bg-white">
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary small fw-bold text-uppercase">Total Cost / Payable</span>
                <div className="bg-warning bg-opacity-10 text-warning p-2 rounded-2">
                  <i className="bi bi-cash-stack fs-5"></i>
                </div>
              </div>
              <h3 className="fw-bold mb-1 text-dark font-monospace">
                {loading ? "..." : `Rs ${Number(figures.totalPayableAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              </h3>
              <div className="text-muted small">
                Approved Costing Disbursements
              </div>
              <Link to="/requests/completed" className="btn btn-link btn-sm p-0 text-success mt-2 text-decoration-none fw-semibold">
                View Completed Reports →
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Row 2: Workflow Stage Breakdown Figures */}
      <Card className="border shadow-sm rounded-3 bg-white p-3">
        <h6 className="fw-bold text-dark mb-3 text-uppercase" style={{ letterSpacing: "0.03em" }}>
          Process Lifecycle Pipeline ({activePlantLabel})
        </h6>

        <Row className="g-3">
          {/* 1. Pending Quality */}
          <Col xs={6} md={3}>
            <div 
              className="p-3 rounded-3 border bg-warning bg-opacity-10 h-100 cursor-pointer"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/requests/quality")}
            >
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small fw-bold text-dark">1. Pending Quality</span>
                <i className="bi bi-clipboard-check text-warning fs-5"></i>
              </div>
              <h3 className="fw-bold mb-1 text-dark font-monospace">{figures.pendingQuality}</h3>
              <span className="text-secondary small">Awaiting sample testing & moisture cuts</span>
            </div>
          </Col>

          {/* 2. Pending Finance Costing */}
          <Col xs={6} md={3}>
            <div 
              className="p-3 rounded-3 border bg-info bg-opacity-10 h-100 cursor-pointer"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/requests/finance-costing")}
            >
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small fw-bold text-dark">2. Pending Costing</span>
                <i className="bi bi-calculator text-info fs-5"></i>
              </div>
              <h3 className="fw-bold mb-1 text-dark font-monospace">{figures.pendingFinanceOfficer}</h3>
              <span className="text-secondary small">Awaiting finance officer rates</span>
            </div>
          </Col>

          {/* 3. Pending FM Approval */}
          <Col xs={6} md={3}>
            <div 
              className="p-3 rounded-3 border bg-primary bg-opacity-10 h-100 cursor-pointer"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/requests/finance-approval")}
            >
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small fw-bold text-dark">3. Pending FM Approval</span>
                <i className="bi bi-check2-circle text-primary fs-5"></i>
              </div>
              <h3 className="fw-bold mb-1 text-dark font-monospace">{figures.pendingFinanceManager}</h3>
              <span className="text-secondary small">Awaiting executive authorization</span>
            </div>
          </Col>

          {/* 4. Completed & Paid */}
          <Col xs={6} md={3}>
            <div 
              className="p-3 rounded-3 border bg-success bg-opacity-10 h-100 cursor-pointer"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/requests/completed")}
            >
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small fw-bold text-dark">4. Completed / Paid</span>
                <i className="bi bi-patch-check-fill text-success fs-5"></i>
              </div>
              <h3 className="fw-bold mb-1 text-success font-monospace">{figures.completedRequests}</h3>
              <span className="text-secondary small">Vouchers signed and executed</span>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Row 3: Live Recent Requests Table */}
      <Card className="border shadow-sm rounded-3 bg-white p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h6 className="fw-bold text-dark mb-0 text-uppercase" style={{ letterSpacing: "0.03em" }}>
              Recent Process Requests
            </h6>
            <span className="text-muted small">Live workflow requests from Firestore for {activePlantLabel}</span>
          </div>

          <Button variant="primary" size="sm" onClick={() => navigate("/requests/new")}>
            <i className="bi bi-plus-circle me-1"></i> Create Request
          </Button>
        </div>

        <div className="table-responsive">
          <Table hover size="sm" className="align-middle mb-0 text-nowrap" style={{ fontSize: "0.85rem" }}>
            <thead className="table-light text-secondary text-uppercase fw-semibold" style={{ fontSize: "0.78rem" }}>
              <tr>
                <th>Request #</th>
                <th>Plant</th>
                <th>Ticket #</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Material</th>
                <th className="text-end">Scale Wt (kg)</th>
                <th className="text-center">Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-muted">
                    No requests found for {activePlantLabel}.
                  </td>
                </tr>
              ) : (
                filteredRequests.slice(0, 6).map((req) => (
                  <tr key={req.id}>
                    <td className="font-monospace fw-bold text-dark">#{req.requestNo}</td>
                    <td><span className="badge bg-secondary-subtle text-dark font-monospace">{req.plantCode || "HES-1"}</span></td>
                    <td className="font-monospace fw-bold text-primary">{req.ticketNo}</td>
                    <td className="font-monospace">{req.date || req.createdAt?.slice(0, 10)}</td>
                    <td className="fw-medium text-dark">{req.supplier}</td>
                    <td><span className="badge bg-light text-dark border">{req.material}</span></td>
                    <td className="text-end font-monospace">{Number(req.wbtWeight || 0).toLocaleString()} kg</td>
                    <td className="text-center">
                      <span className={`badge ${
                        req.status === "COMPLETED" ? "bg-success" :
                        req.status === "REJECTED" ? "bg-danger" :
                        req.status === "PENDING_QUALITY" ? "bg-warning text-dark" : "bg-info text-dark"
                      } px-2 py-1`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="py-0 px-2 fw-semibold"
                        style={{ fontSize: "0.75rem" }}
                        onClick={() => {
                          if (req.status === "PENDING_QUALITY") navigate("/requests/quality");
                          else if (req.status === "PENDING_FINANCE_OFFICER") navigate("/requests/finance-costing");
                          else if (req.status === "PENDING_FINANCE_MANAGER") navigate("/requests/finance-approval");
                          else navigate("/requests/completed");
                        }}
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
