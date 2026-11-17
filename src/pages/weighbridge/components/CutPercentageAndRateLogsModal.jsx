import React, { useState, useEffect } from "react";
import { Modal, Tab, Tabs, Table, Badge, Button, Row, Col, Form, Alert } from "react-bootstrap";
import { 
  getCompanyConfigs, 
  updateCutPercentageConfig, 
  getCutPercentageLogs, 
  getRateLogs 
} from "../../../services/firebase/qualityCostingService";
import { useAuth } from "../../../contexts/AuthContext";

export default function CutPercentageAndRateLogsModal({
  show,
  onHide,
  onConfigChanged
}) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("cutConfigs");

  const [configs, setConfigs] = useState(null);
  const [cutLogs, setCutLogs] = useState([]);
  const [rateLogs, setRateLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Cut % modal
  const [editModal, setEditModal] = useState({
    show: false,
    company: "RILEYS",
    cutType: "moisture", // "moisture" or "trade"
    value: 0,
    reason: ""
  });
  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  // Search in Rate Logs
  const [rateSearch, setRateSearch] = useState("");
  const [rateCompanyFilter, setRateCompanyFilter] = useState("ALL");

  const loadData = async () => {
    try {
      setLoading(true);
      const [cfg, cLogs, rLogs] = await Promise.all([
        getCompanyConfigs(),
        getCutPercentageLogs(),
        getRateLogs()
      ]);
      setConfigs(cfg);
      setCutLogs(cLogs);
      setRateLogs(rLogs);
    } catch (err) {
      console.error("Error loading logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (show) {
      loadData();
    }
  }, [show]);

  const handleOpenEdit = (company, cutType) => {
    const curVal = cutType === "moisture" 
      ? configs?.[company]?.moistureCutPercent ?? (company === "RILEYS" ? 9.6 : 8.5)
      : configs?.[company]?.tradeCutPercent ?? 0;
    
    setEditModal({
      show: true,
      company,
      cutType,
      value: curVal,
      reason: ""
    });
  };

  const handleSaveCutConfig = async () => {
    try {
      setSaving(true);
      const res = await updateCutPercentageConfig(
        editModal.company,
        editModal.cutType,
        editModal.value,
        currentUser,
        editModal.reason
      );
      setSaving(false);
      setEditModal({ ...editModal, show: false });
      setAlertMsg({ type: "success", text: `Updated ${editModal.company} ${editModal.cutType} cut to ${editModal.value}%` });
      loadData();
      if (onConfigChanged) onConfigChanged(res.configs);
    } catch (err) {
      console.error("Failed to save cut config:", err);
      alert(err.message || "Failed to update cut percentage");
      setSaving(false);
    }
  };

  // Filtered Rate Logs
  const filteredRateLogs = rateLogs.filter(item => {
    if (rateCompanyFilter !== "ALL" && item.company !== rateCompanyFilter) return false;
    if (rateSearch.trim() !== "") {
      const q = rateSearch.toLowerCase();
      const match = 
        item.ticketNo?.toLowerCase().includes(q) ||
        item.supplier?.toLowerCase().includes(q) ||
        item.grade?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const formatDate = (isoStr) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
        " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoStr;
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
      <Modal.Header closeButton className="bg-light py-2.5 px-4 border-bottom">
        <div>
          <Modal.Title className="fw-bold fs-5 text-dark mb-0">
            Cut Percentage Configuration & Per-KG Cost Logs
          </Modal.Title>
          <span className="text-secondary small">
            Configurable moisture & trade cut parameters for Toyo & Rileys + Audit change history and rate monitoring
          </span>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4 bg-light">
        {alertMsg && (
          <Alert variant={alertMsg.type} dismissible onClose={() => setAlertMsg(null)} className="py-2 mb-3 shadow-sm">
            {alertMsg.text}
          </Alert>
        )}

        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3 border-bottom bg-white rounded-top px-3 pt-2"
        >
          {/* Tab 1: Cut Configurations & Cut Log */}
          <Tab eventKey="cutConfigs" title="1. Moisture & Trade Cut % (Toyo & Rileys)">
            {/* Live Configuration Cards */}
            <Row className="g-3 mb-4">
              {/* RILEYS CONFIG */}
              <Col xs={12} md={6}>
                <div className="card border shadow-sm rounded-3 h-100 bg-white p-3">
                  <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-primary px-2.5 py-1 fw-bold fs-7">RILEYS</span>
                      <h6 className="fw-bold mb-0 text-dark">Active Configuration</h6>
                    </div>
                    <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                      Last updated: {formatDate(configs?.RILEYS?.lastUpdated)}
                    </span>
                  </div>

                  <Row className="g-3">
                    <Col xs={6}>
                      <div className="p-2.5 rounded-2 border bg-light">
                        <span className="text-secondary small fw-bold d-block mb-1">Moisture Cut %</span>
                        <div className="d-flex align-items-baseline justify-content-between">
                          <h3 className="fw-bold mb-0 text-primary font-monospace">
                            {configs?.RILEYS?.moistureCutPercent ?? 9.60}%
                          </h3>
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm py-0.5 px-2"
                            style={{ fontSize: "0.75rem" }}
                            onClick={() => handleOpenEdit("RILEYS", "moisture")}
                          >
                            Edit
                          </button>
                        </div>
                        <span className="text-muted small" style={{ fontSize: "0.72rem" }}>
                          Applied on scale net weight
                        </span>
                      </div>
                    </Col>

                    <Col xs={6}>
                      <div className="p-2.5 rounded-2 border bg-light">
                        <span className="text-secondary small fw-bold d-block mb-1">Trade Cut %</span>
                        <div className="d-flex align-items-baseline justify-content-between">
                          <h3 className="fw-bold mb-0 text-dark font-monospace">
                            {configs?.RILEYS?.tradeCutPercent ?? 0.00}%
                          </h3>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm py-0.5 px-2"
                            style={{ fontSize: "0.75rem" }}
                            onClick={() => handleOpenEdit("RILEYS", "trade")}
                          >
                            Edit
                          </button>
                        </div>
                        <span className="text-muted small" style={{ fontSize: "0.72rem" }}>
                          Commercial deduction
                        </span>
                      </div>
                    </Col>
                  </Row>
                </div>
              </Col>

              {/* TOYO CONFIG */}
              <Col xs={12} md={6}>
                <div className="card border shadow-sm rounded-3 h-100 bg-white p-3">
                  <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-success px-2.5 py-1 fw-bold fs-7">TOYO</span>
                      <h6 className="fw-bold mb-0 text-dark">Active Configuration</h6>
                    </div>
                    <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                      Last updated: {formatDate(configs?.TOYO?.lastUpdated)}
                    </span>
                  </div>

                  <Row className="g-3">
                    <Col xs={6}>
                      <div className="p-2.5 rounded-2 border bg-light">
                        <span className="text-secondary small fw-bold d-block mb-1">Moisture Cut %</span>
                        <div className="d-flex align-items-baseline justify-content-between">
                          <h3 className="fw-bold mb-0 text-success font-monospace">
                            {configs?.TOYO?.moistureCutPercent ?? 8.50}%
                          </h3>
                          <button
                            type="button"
                            className="btn btn-outline-success btn-sm py-0.5 px-2"
                            style={{ fontSize: "0.75rem" }}
                            onClick={() => handleOpenEdit("TOYO", "moisture")}
                          >
                            Edit
                          </button>
                        </div>
                        <span className="text-muted small" style={{ fontSize: "0.72rem" }}>
                          Applied on scale net weight
                        </span>
                      </div>
                    </Col>

                    <Col xs={6}>
                      <div className="p-2.5 rounded-2 border bg-light">
                        <span className="text-secondary small fw-bold d-block mb-1">Trade Cut %</span>
                        <div className="d-flex align-items-baseline justify-content-between">
                          <h3 className="fw-bold mb-0 text-dark font-monospace">
                            {configs?.TOYO?.tradeCutPercent ?? 0.00}%
                          </h3>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm py-0.5 px-2"
                            style={{ fontSize: "0.75rem" }}
                            onClick={() => handleOpenEdit("TOYO", "trade")}
                          >
                            Edit
                          </button>
                        </div>
                        <span className="text-muted small" style={{ fontSize: "0.72rem" }}>
                          Commercial deduction
                        </span>
                      </div>
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>

            {/* Cut Percentage Audit Log Table */}
            <div className="card border shadow-sm rounded-3 bg-white p-3">
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <h6 className="fw-bold text-dark mb-0 text-uppercase" style={{ letterSpacing: "0.03em" }}>
                  Cut Percentage Change Audit Trail (Moisture & Trade)
                </h6>
                <span className="text-muted small">
                  {cutLogs.length} historical modifications logged
                </span>
              </div>

              <div className="table-responsive">
                <Table hover size="sm" className="align-middle mb-0" style={{ fontSize: "0.85rem" }}>
                  <thead className="table-light text-secondary text-uppercase fw-semibold" style={{ fontSize: "0.78rem" }}>
                    <tr>
                      <th style={{ width: 170 }}>Timestamp</th>
                      <th style={{ width: 100 }}>Company</th>
                      <th style={{ width: 120 }}>Cut Type</th>
                      <th style={{ width: 140 }}>Adjustment</th>
                      <th>Updated By</th>
                      <th>Reason / Specification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cutLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-muted">
                          No cut percentage adjustments recorded yet.
                        </td>
                      </tr>
                    ) : (
                      cutLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="text-dark font-monospace" style={{ fontSize: "0.8rem" }}>
                            {formatDate(log.timestamp)}
                          </td>
                          <td>
                            <Badge bg={log.company === "RILEYS" ? "primary" : "success"}>
                              {log.company}
                            </Badge>
                          </td>
                          <td>
                            <span className="fw-semibold text-dark text-capitalize">
                              {log.cutType} Cut
                            </span>
                          </td>
                          <td>
                            <span className="font-monospace text-secondary">{Number(log.oldValue || 0).toFixed(2)}%</span>
                            <i className="bi bi-arrow-right mx-1.5 text-primary"></i>
                            <strong className="font-monospace text-dark">{Number(log.newValue || 0).toFixed(2)}%</strong>
                          </td>
                          <td className="fw-medium text-dark">{log.updatedBy || "—"}</td>
                          <td className="text-secondary small">{log.reason || "Configuration baseline update"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          </Tab>

          {/* Tab 2: Per KG Cost / Rate Monitoring Log */}
          <Tab eventKey="rateLogs" title="2. Per-KG Cost & Rate Monitoring Log">
            <div className="card border shadow-sm rounded-3 bg-white p-3 mb-3">
              <Row className="g-2 align-items-center">
                <Col xs={12} md={6}>
                  <input
                    type="text"
                    className="form-control form-control-sm bg-light"
                    placeholder="Search by Ticket #, Supplier, Grade..."
                    value={rateSearch}
                    onChange={(e) => setRateSearch(e.target.value)}
                  />
                </Col>

                <Col xs={6} md={3}>
                  <select
                    className="form-select form-select-sm"
                    value={rateCompanyFilter}
                    onChange={(e) => setRateCompanyFilter(e.target.value)}
                  >
                    <option value="ALL">All Companies</option>
                    <option value="RILEYS">RILEYS</option>
                    <option value="TOYO">TOYO</option>
                  </select>
                </Col>

                <Col xs={6} md={3} className="text-end">
                  <span className="text-secondary small fw-medium">
                    Showing <strong>{filteredRateLogs.length}</strong> rate entries
                  </span>
                </Col>
              </Row>
            </div>

            <div className="card border shadow-sm rounded-3 bg-white p-3">
              <div className="table-responsive">
                <Table hover size="sm" className="align-middle mb-0" style={{ fontSize: "0.85rem" }}>
                  <thead className="table-light text-secondary text-uppercase fw-semibold" style={{ fontSize: "0.78rem" }}>
                    <tr>
                      <th style={{ width: 160 }}>Timestamp</th>
                      <th style={{ width: 110 }}>Ticket #</th>
                      <th style={{ width: 90 }}>Company</th>
                      <th>Supplier</th>
                      <th>Grade</th>
                      <th className="text-end" style={{ width: 120 }}>Rate (Rs/Kg)</th>
                      <th className="text-end" style={{ width: 110 }}>WP (Kg)</th>
                      <th className="text-end" style={{ width: 130 }}>Total Paid (Rs)</th>
                      <th>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRateLogs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-4 text-muted">
                          No per-kg rate records match the search.
                        </td>
                      </tr>
                    ) : (
                      filteredRateLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="text-secondary font-monospace" style={{ fontSize: "0.8rem" }}>
                            {formatDate(log.timestamp)}
                          </td>
                          <td>
                            <span className="font-monospace fw-bold text-primary">
                              {log.ticketNo || "—"}
                            </span>
                          </td>
                          <td>
                            <Badge bg={log.company === "RILEYS" ? "primary" : "success"}>
                              {log.company}
                            </Badge>
                          </td>
                          <td className="fw-semibold text-dark text-truncate" style={{ maxWidth: 180 }}>
                            {log.supplier || "—"}
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border">
                              {log.grade || "Fibre"}
                            </span>
                          </td>
                          <td className="text-end font-monospace fw-bold text-dark fs-7">
                            Rs {Number(log.ratePerKg || 0).toFixed(2)}
                          </td>
                          <td className="text-end font-monospace text-secondary">
                            {Number(log.weightForPaymentKg || 0).toLocaleString()}
                          </td>
                          <td className="text-end font-monospace fw-bold text-success">
                            Rs {Number(log.totalPaymentRs || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="text-secondary small">{log.recordedBy || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          </Tab>
        </Tabs>
      </Modal.Body>

      <Modal.Footer className="bg-light py-2 px-4 border-top d-flex justify-content-end">
        <button type="button" className="btn btn-secondary btn-sm px-3" onClick={onHide}>
          Close
        </button>
      </Modal.Footer>

      {/* Sub-Modal to Edit Cut Percentage */}
      {editModal.show && (
        <Modal
          show={true}
          onHide={() => setEditModal({ ...editModal, show: false })}
          centered
          size="sm"
        >
          <Modal.Header closeButton className="bg-light py-2 px-3 border-bottom">
            <Modal.Title className="fw-bold fs-6 text-dark">
              Update {editModal.company} {editModal.cutType === "moisture" ? "Moisture" : "Trade"} Cut %
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-3">
            <div className="mb-3">
              <label className="form-label small fw-bold text-dark mb-1">
                New Cut Percentage (%)
              </label>
              <div className="input-group input-group-sm">
                <input
                  type="number"
                  step="0.01"
                  className="form-control font-monospace fw-bold"
                  value={editModal.value}
                  onChange={(e) => setEditModal({ ...editModal, value: e.target.value })}
                />
                <span className="input-group-text">%</span>
              </div>
            </div>

            <div className="mb-2">
              <label className="form-label small fw-bold text-dark mb-1">
                Reason / Calibration Reference
              </label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                value={editModal.reason}
                onChange={(e) => setEditModal({ ...editModal, reason: e.target.value })}
                placeholder="e.g. Seasonal moisture variation review..."
              ></textarea>
            </div>
          </Modal.Body>

          <Modal.Footer className="bg-light py-2 px-3 border-top d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setEditModal({ ...editModal, show: false })}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm fw-semibold"
              onClick={handleSaveCutConfig}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save & Log Change"}
            </button>
          </Modal.Footer>
        </Modal>
      )}
    </Modal>
  );
}

