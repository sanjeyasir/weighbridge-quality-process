import React, { useState, useMemo } from "react";
import { Table, Badge, Button, Row, Col, Modal, Form, Alert } from "react-bootstrap";
import { 
  updateRequestApprovalStage, 
  deleteQualityCostingRequest 
} from "../../../services/firebase/qualityCostingService";
import { useAuth } from "../../../contexts/AuthContext";

export default function DailyRequestsTab({
  requests = [],
  loading = false,
  onOpenCreateNew,
  onViewDocument,
  onOpenConfigs
}) {
  const { currentUser } = useAuth();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filters
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [filterAllDates, setFilterAllDates] = useState(false);
  const [companyFilter, setCompanyFilter] = useState("ALL"); // ALL, RILEYS, TOYO
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Approval Action Modal state
  const [actionModal, setActionModal] = useState({
    show: false,
    request: null,
    stage: "", // "LOCATION_HEAD_APPROVE", "ACCOUNTANT_CHECK", "FINANCE_MANAGER_APPROVE", "COMPLETE_PAYMENT", "REJECT"
    remarks: "",
    name: "",
    paymentMode: "Cheque",
    refNo: "",
    weightForGrn: "",
    reason: ""
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Date filter
      if (!filterAllDates && selectedDate) {
        const reqDate = (req.date || req.createdAt || "").slice(0, 10);
        if (reqDate !== selectedDate) return false;
      }

      // Company filter (Toyo or Rileys)
      if (companyFilter !== "ALL" && req.company !== companyFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "ALL" && req.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const match =
          req.ticketNo?.toLowerCase().includes(q) ||
          req.requestNo?.toLowerCase().includes(q) ||
          req.supplier?.toLowerCase().includes(q) ||
          req.lorryNo?.toLowerCase().includes(q) ||
          req.grade?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  }, [requests, selectedDate, filterAllDates, companyFilter, statusFilter, searchQuery]);

  // Daily KPI summary
  const dailyMetrics = useMemo(() => {
    const list = filteredRequests;
    const totalRequests = list.length;
    const totalWbtWeight = list.reduce((acc, r) => acc + (Number(r.wbtWeight) || 0), 0);
    const totalPaymentWeight = list.reduce((acc, r) => acc + (Number(r.weightForPayment) || 0), 0);
    const totalPayableAmount = list.reduce((acc, r) => acc + (Number(r.totalPayment) || 0), 0);
    const completedCount = list.filter(r => r.status === "COMPLETED").length;
    const pendingApprovalCount = list.filter(r => r.status.startsWith("PENDING_")).length;

    return {
      totalRequests,
      totalWbtWeight,
      totalPaymentWeight,
      totalPayableAmount,
      completedCount,
      pendingApprovalCount
    };
  }, [filteredRequests]);

  // Stage Badge Helper
  const getStageBadge = (status) => {
    switch (status) {
      case "DRAFT":
        return <Badge bg="secondary" className="px-2 py-1 fw-bold">Draft / Initiated</Badge>;
      case "PENDING_LOCATION_HEAD":
        return <Badge bg="warning" text="dark" className="px-2 py-1 fw-bold">1. Pending Location Head</Badge>;
      case "PENDING_ACCOUNTANT":
        return <Badge bg="info" text="dark" className="px-2 py-1 fw-bold">2. Pending Accountant Check</Badge>;
      case "PENDING_FINANCE_MANAGER":
        return <Badge bg="primary" className="px-2 py-1 fw-bold">3. Pending Finance Manager</Badge>;
      case "PENDING_PAYMENT":
        return <Badge bg="purple" style={{ backgroundColor: "#6f42c1", color: "#fff" }} className="px-2 py-1 fw-bold">4. Pending Payment</Badge>;
      case "COMPLETED":
        return <Badge bg="success" className="px-2 py-1 fw-bold">✓ Payment Completed</Badge>;
      case "REJECTED":
        return <Badge bg="danger" className="px-2 py-1 fw-bold">Rejected</Badge>;
      default:
        return <Badge bg="light" text="dark" className="border px-2 py-1 fw-bold">{status}</Badge>;
    }
  };

  // Open Action Modal
  const openAction = (request, stage) => {
    const defaultName = currentUser?.displayName || currentUser?.email || "";
    setActionModal({
      show: true,
      request,
      stage,
      remarks: "",
      name: defaultName,
      paymentMode: "Cheque",
      refNo: "CHQ-" + Math.floor(100000 + Math.random() * 900000),
      weightForGrn: request.weightForPayment || "",
      reason: ""
    });
  };

  // Submit Action Modal
  const handleActionSubmit = async () => {
    if (!actionModal.request) return;
    try {
      setActionLoading(true);
      await updateRequestApprovalStage(
        actionModal.request.id,
        actionModal.stage,
        {
          name: actionModal.name,
          remarks: actionModal.remarks,
          weightForGrn: actionModal.weightForGrn,
          paymentMode: actionModal.paymentMode,
          refNo: actionModal.refNo,
          paidAmount: actionModal.request.totalPayment,
          paidTo: actionModal.request.supplier,
          paidDate: todayStr,
          reason: actionModal.reason
        },
        currentUser
      );
      setActionLoading(false);
      setActionModal({ ...actionModal, show: false });
    } catch (err) {
      console.error("Stage update error:", err);
      alert(err.message || "Failed to update workflow stage.");
      setActionLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-3">
      {/* Top Banner & KPI Summary */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-success px-2.5 py-1.5 fw-bold font-monospace">DAILY WORKFLOW</span>
              <h5 className="fw-bold mb-0 text-dark">Daily Quality & Costing Requests</h5>
            </div>
            <p className="text-secondary small mb-0 mt-1">
              Separate daily records for Toyo and Rileys with full 5-stage sign-offs: QC → Location Head → Accountant → Finance Manager → Payment
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-primary fw-semibold btn-sm px-3 d-flex align-items-center gap-1.5 shadow-sm"
              onClick={onOpenCreateNew}
            >
              <i className="bi bi-file-earmark-plus"></i>
              <span>Initiate New Request</span>
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5"
              onClick={onOpenConfigs}
            >
              <i className="bi bi-sliders"></i>
              <span>Cut % & Rates</span>
            </button>
          </div>
        </div>

        {/* Daily KPI Metric Cards */}
        <Row className="g-3 mt-1">
          <Col xs={6} md={3}>
            <div className="p-2.5 rounded-2 border bg-light">
              <span className="text-secondary small fw-medium d-block">Requests on Day</span>
              <h4 className="fw-bold mb-0 text-dark font-monospace">{dailyMetrics.totalRequests}</h4>
              <div className="text-muted small" style={{ fontSize: "0.72rem" }}>
                {dailyMetrics.completedCount} Completed • {dailyMetrics.pendingApprovalCount} In-Progress
              </div>
            </div>
          </Col>

          <Col xs={6} md={3}>
            <div className="p-2.5 rounded-2 border bg-light">
              <span className="text-secondary small fw-medium d-block">Scale Net Weight (WBT)</span>
              <h4 className="fw-bold mb-0 text-primary font-monospace">
                {dailyMetrics.totalWbtWeight.toLocaleString()} <small className="fs-6 text-secondary">Kg</small>
              </h4>
              <div className="text-muted small" style={{ fontSize: "0.72rem" }}>
                Gross inward weight
              </div>
            </div>
          </Col>

          <Col xs={6} md={3}>
            <div className="p-2.5 rounded-2 border bg-light">
              <span className="text-secondary small fw-medium d-block">Weight for Payment (WP)</span>
              <h4 className="fw-bold mb-0 text-success font-monospace">
                {dailyMetrics.totalPaymentWeight.toLocaleString()} <small className="fs-6 text-secondary">Kg</small>
              </h4>
              <div className="text-muted small" style={{ fontSize: "0.72rem" }}>
                Net after moisture & trade cuts
              </div>
            </div>
          </Col>

          <Col xs={6} md={3}>
            <div className="p-2.5 rounded-2 border bg-light">
              <span className="text-secondary small fw-medium d-block">Total Payable Amount</span>
              <h4 className="fw-bold mb-0 text-dark font-monospace">
                Rs {dailyMetrics.totalPayableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
              <div className="text-success small fw-semibold" style={{ fontSize: "0.72rem" }}>
                Based on logged per-Kg rates
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Filter Toolbar (Daily Picker, Company, Status) */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <Row className="g-2 align-items-end">
          {/* Daily Date Selector */}
          <Col xs={12} sm={6} md={3}>
            <label className="form-label small fw-bold text-dark mb-1">
              Select Record Day:
            </label>
            <div className="input-group input-group-sm">
              <input
                type="date"
                className="form-control"
                value={selectedDate}
                disabled={filterAllDates}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setFilterAllDates(false);
                }}
              />
              <button
                type="button"
                className={`btn btn-sm ${filterAllDates ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setFilterAllDates(!filterAllDates)}
                title="Toggle All Dates"
              >
                {filterAllDates ? "All Dates" : "All"}
              </button>
            </div>
          </Col>

          {/* Company Filter (Toyo / Rileys / All) */}
          <Col xs={6} sm={3} md={2}>
            <label className="form-label small fw-bold text-dark mb-1">
              Company
            </label>
            <select
              className="form-select form-select-sm fw-semibold"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
            >
              <option value="ALL">All Companies</option>
              <option value="RILEYS">RILEYS</option>
              <option value="TOYO">TOYO</option>
            </select>
          </Col>

          {/* Status Filter */}
          <Col xs={6} sm={3} md={3}>
            <label className="form-label small fw-bold text-dark mb-1">
              Approval Stage
            </label>
            <select
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Stages</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_LOCATION_HEAD">Pending Location Head</option>
              <option value="PENDING_ACCOUNTANT">Pending Accountant Check</option>
              <option value="PENDING_FINANCE_MANAGER">Pending Finance Manager</option>
              <option value="PENDING_PAYMENT">Pending Payment</option>
              <option value="COMPLETED">Completed (Paid)</option>
            </select>
          </Col>

          {/* Search Box */}
          <Col xs={12} md={4}>
            <label className="form-label small fw-bold text-dark mb-1">
              Search Request #, Ticket, Supplier
            </label>
            <input
              type="text"
              className="form-control form-control-sm bg-light"
              placeholder="Search daily requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>
        </Row>
      </div>

      {/* Requests Table */}
      <div className="card border shadow-sm rounded-3 bg-white overflow-hidden">
        <div className="table-responsive">
          <Table hover className="align-middle mb-0" style={{ fontSize: "0.875rem" }}>
            <thead className="table-light text-uppercase text-secondary fw-semibold border-bottom" style={{ fontSize: "0.8rem" }}>
              <tr>
                <th style={{ width: 130 }}>Request #</th>
                <th style={{ width: 90 }}>Company</th>
                <th style={{ width: 110 }}>Ticket #</th>
                <th>Supplier & Vehicle</th>
                <th>Grade</th>
                <th className="text-end" style={{ width: 110 }}>WBT (kg)</th>
                <th className="text-end" style={{ width: 115 }}>WP (kg)</th>
                <th className="text-end" style={{ width: 120 }}>Rate & Total</th>
                <th className="text-center" style={{ width: 160 }}>Current Stage</th>
                <th className="text-center" style={{ width: 190 }}>Workflow Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-4 text-secondary">
                    <div className="spinner-border spinner-border-sm me-2 text-primary" role="status"></div>
                    Loading Quality & Costing requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-5 text-secondary">
                    <i className="bi bi-inbox fs-2 text-muted d-block mb-2"></i>
                    No Quality & Costing requests found for the selected day ({filterAllDates ? "All Dates" : selectedDate}).
                    <div className="mt-2">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={onOpenCreateNew}
                      >
                        Initiate a request for today
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id}>
                    {/* Request # */}
                    <td>
                      <div className="fw-bold font-monospace text-dark">{req.requestNo || req.id}</div>
                      <div className="text-muted small" style={{ fontSize: "0.72rem" }}>
                        {req.date}
                      </div>
                    </td>

                    {/* Company */}
                    <td>
                      <span className={`badge px-2 py-1 fw-bold ${req.company === "RILEYS" ? "bg-primary" : "bg-success"}`}>
                        {req.company}
                      </span>
                    </td>

                    {/* Ticket # */}
                    <td>
                      <span className="font-monospace fw-bold text-primary">
                        {req.ticketNo}
                      </span>
                    </td>

                    {/* Supplier & Vehicle */}
                    <td>
                      <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: 180 }} title={req.supplier}>
                        {req.supplier}
                      </div>
                      <div className="text-muted small font-monospace">
                        {req.lorryNo || "—"}
                      </div>
                    </td>

                    {/* Grade */}
                    <td>
                      <span className="badge bg-light text-dark border px-2 py-0.5">
                        {req.grade || "Fibre"}
                      </span>
                      <div className="text-muted small" style={{ fontSize: "0.72rem" }}>
                        Avg M: {req.avgMoisturePercent || 0}%
                      </div>
                    </td>

                    {/* WBT Weight */}
                    <td className="text-end font-monospace text-secondary">
                      {Number(req.wbtWeight || 0).toLocaleString()}
                    </td>

                    {/* WP Weight */}
                    <td className="text-end">
                      <span className="font-monospace fw-bold text-primary">
                        {Number(req.weightForPayment || 0).toLocaleString()} kg
                      </span>
                    </td>

                    {/* Rate & Total */}
                    <td className="text-end">
                      <div className="text-dark fw-bold font-monospace">
                        Rs {Number(req.totalPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-muted small font-monospace" style={{ fontSize: "0.72rem" }}>
                        @ Rs {req.ratePerKg}/kg
                      </div>
                    </td>

                    {/* Current Stage Badge */}
                    <td className="text-center">
                      {getStageBadge(req.status)}
                    </td>

                    {/* Workflow Actions */}
                    <td className="text-center">
                      <div className="d-flex align-items-center justify-content-center gap-1">
                        {/* View Acceptance Note Document */}
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm py-0.5 px-2"
                          style={{ fontSize: "0.78rem" }}
                          onClick={() => onViewDocument(req)}
                          title="View & Print Full Acceptance Note"
                        >
                          <i className="bi bi-file-earmark-text"></i> Note
                        </button>

                        {/* Stage Specific Action Button */}
                        {req.status === "DRAFT" && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm py-0.5 px-2 fw-semibold"
                            style={{ fontSize: "0.78rem" }}
                            onClick={() => openAction(req, "SUBMIT_FOR_APPROVAL")}
                          >
                            Submit
                          </button>
                        )}

                        {req.status === "PENDING_LOCATION_HEAD" && (
                          <button
                            type="button"
                            className="btn btn-warning btn-sm py-0.5 px-2 fw-semibold text-dark"
                            style={{ fontSize: "0.78rem" }}
                            onClick={() => openAction(req, "LOCATION_HEAD_APPROVE")}
                            title="Location Head: Authorize Purchase"
                          >
                            Sign LH
                          </button>
                        )}

                        {req.status === "PENDING_ACCOUNTANT" && (
                          <button
                            type="button"
                            className="btn btn-info btn-sm py-0.5 px-2 fw-semibold text-dark"
                            style={{ fontSize: "0.78rem" }}
                            onClick={() => openAction(req, "ACCOUNTANT_CHECK")}
                            title="Accountant: Check Weights & Costing"
                          >
                            Check Acct
                          </button>
                        )}

                        {req.status === "PENDING_FINANCE_MANAGER" && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm py-0.5 px-2 fw-semibold"
                            style={{ fontSize: "0.78rem" }}
                            onClick={() => openAction(req, "FINANCE_MANAGER_APPROVE")}
                            title="Finance Manager: Approve Payment Voucher"
                          >
                            Approve FM
                          </button>
                        )}

                        {req.status === "PENDING_PAYMENT" && (
                          <button
                            type="button"
                            className="btn btn-success btn-sm py-0.5 px-2 fw-semibold"
                            style={{ fontSize: "0.78rem" }}
                            onClick={() => openAction(req, "COMPLETE_PAYMENT")}
                            title="Record Payment & Complete"
                          >
                            Pay
                          </button>
                        )}

                        {req.status === "COMPLETED" && (
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                            Paid
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Stage Sign-off / Action Modal */}
      {actionModal.show && (
        <Modal
          show={true}
          onHide={() => setActionModal({ ...actionModal, show: false })}
          centered
        >
          <Modal.Header closeButton className="bg-light py-2.5 px-3 border-bottom">
            <Modal.Title className="fw-bold fs-6 text-dark">
              {actionModal.stage === "LOCATION_HEAD_APPROVE" && "Location Head Purchase Authorization"}
              {actionModal.stage === "ACCOUNTANT_CHECK" && "Accountant Verification & Check"}
              {actionModal.stage === "FINANCE_MANAGER_APPROVE" && "Finance Manager Payment Approval"}
              {actionModal.stage === "COMPLETE_PAYMENT" && "Record Payment & Complete Transaction"}
              {actionModal.stage === "SUBMIT_FOR_APPROVAL" && "Submit for Location Head Approval"}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4">
            <div className="p-2.5 rounded-2 border bg-light mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="fw-bold font-monospace text-primary">Ticket #{actionModal.request?.ticketNo}</span>
                <span className="badge bg-primary">{actionModal.request?.company}</span>
              </div>
              <div className="small text-secondary">Supplier: <strong>{actionModal.request?.supplier}</strong></div>
              <div className="small text-secondary">Weight for Payment: <strong>{actionModal.request?.weightForPayment} Kg</strong></div>
              <div className="small text-dark fw-bold">Total Amount: Rs {Number(actionModal.request?.totalPayment || 0).toLocaleString()}</div>
            </div>

            {/* Stage Specific Fields */}
            {actionModal.stage === "COMPLETE_PAYMENT" ? (
              <>
                <div className="mb-2">
                  <label className="form-label small fw-bold text-dark mb-1">Payment Mode</label>
                  <select
                    className="form-select form-select-sm"
                    value={actionModal.paymentMode}
                    onChange={(e) => setActionModal({ ...actionModal, paymentMode: e.target.value })}
                  >
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer / SLIPS</option>
                    <option value="Cash">Cash Voucher</option>
                  </select>
                </div>

                <div className="mb-2">
                  <label className="form-label small fw-bold text-dark mb-1">Cheque # / Reference No</label>
                  <input
                    type="text"
                    className="form-control form-control-sm font-monospace fw-bold"
                    value={actionModal.refNo}
                    onChange={(e) => setActionModal({ ...actionModal, refNo: e.target.value })}
                  />
                </div>
              </>
            ) : null}

            {actionModal.stage === "ACCOUNTANT_CHECK" ? (
              <div className="mb-2">
                <label className="form-label small fw-bold text-dark mb-1">Verified Weight for GRN (WGRN)</label>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control font-monospace"
                    value={actionModal.weightForGrn}
                    onChange={(e) => setActionModal({ ...actionModal, weightForGrn: e.target.value })}
                  />
                  <span className="input-group-text">Kg</span>
                </div>
              </div>
            ) : null}

            <div className="mb-2">
              <label className="form-label small fw-bold text-dark mb-1">Signatory Name</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={actionModal.name}
                onChange={(e) => setActionModal({ ...actionModal, name: e.target.value })}
                placeholder="Your full name and title"
              />
            </div>

            <div className="mb-2">
              <label className="form-label small fw-bold text-dark mb-1">Remarks & Sign-off Notes</label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                value={actionModal.remarks}
                onChange={(e) => setActionModal({ ...actionModal, remarks: e.target.value })}
                placeholder="Optional comments or inspection approval notes..."
              ></textarea>
            </div>
          </Modal.Body>

          <Modal.Footer className="bg-light py-2 px-3 border-top d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActionModal({ ...actionModal, show: false })}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm fw-semibold px-3"
              onClick={handleActionSubmit}
              disabled={actionLoading}
            >
              {actionLoading ? "Saving..." : "Confirm & Sign"}
            </button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

