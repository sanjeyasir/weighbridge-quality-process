import React, { useState, useMemo } from "react";
import { Card, Table, Badge, Button, Row, Col, Modal } from "react-bootstrap";

export default function InitiateQualityCostingTab({
  transactions,
  loading,
  onInitiateWithTx,
  onOpenConfigs,
  onViewDailyRequests
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("RILEYS");
  const [selectedTicketNo, setSelectedTicketNo] = useState("");

  // Only HES-1 transactions
  const hes1Transactions = useMemo(() => {
    return transactions.filter(t => (t.plant_code || "HES-1").toUpperCase() === "HES-1");
  }, [transactions]);

  // Ready for QC: transactions with net weight or completed
  const readyTransactions = useMemo(() => {
    return hes1Transactions.filter(t => {
      const net = t.final_net_weight_kg ?? t.net_weight_kg;
      return net != null && Number(net) > 0;
    });
  }, [hes1Transactions]);

  // Filtered transactions
  const filteredData = useMemo(() => {
    return hes1Transactions.filter(tx => {
      if (statusFilter === "READY_ONLY") {
        const net = tx.final_net_weight_kg ?? tx.net_weight_kg;
        if (net == null || Number(net) <= 0) return false;
      } else if (statusFilter !== "ALL" && tx.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const match =
          tx.transaction_no?.toLowerCase().includes(q) ||
          tx.vehicle_no?.toLowerCase().includes(q) ||
          tx.supplier_name?.toLowerCase().includes(q) ||
          tx.material_name?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.second_weight_at || b.first_weight_at || b.created_at) - new Date(a.second_weight_at || a.first_weight_at || a.created_at));
  }, [hes1Transactions, statusFilter, searchQuery]);

  // Format date helper
  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: "—", time: "" };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: dateStr, time: "" };
      const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return { date, time };
    } catch {
      return { date: dateStr, time: "" };
    }
  };

  // Handle Select Modal Submission
  const handleSelectModalSubmit = () => {
    if (!selectedTicketNo) {
      alert("Please select a ticket number.");
      return;
    }
    const found = hes1Transactions.find(t => t.transaction_no === selectedTicketNo);
    setSelectModalOpen(false);
    onInitiateWithTx(found || { transaction_no: selectedTicketNo }, selectedCompany);
  };

  return (
    <div className="d-flex flex-column gap-3">
      {/* Top Banner with Action Button */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary px-2.5 py-1.5 fw-bold font-monospace">HES-1 INTAKE</span>
              <h5 className="fw-bold mb-0 text-dark">Initiate Quality & Costing Process</h5>
            </div>
            <p className="text-secondary small mb-0 mt-1">
              Select an HES-1 weighbridge ticket and company (Toyo or Rileys) to launch the Acceptance Note and start the 5-stage approval workflow
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Dedicated Button to Select Company & Ticket */}
            <button
              type="button"
              className="btn btn-primary fw-semibold btn-sm px-3 shadow-sm d-flex align-items-center gap-1.5"
              onClick={() => {
                if (hes1Transactions.length > 0 && !selectedTicketNo) {
                  setSelectedTicketNo(hes1Transactions[0].transaction_no);
                }
                setSelectModalOpen(true);
              }}
            >
              <i className="bi bi-plus-circle"></i>
              <span>Select Company & Ticket</span>
            </button>

            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5"
              onClick={onOpenConfigs}
            >
              <i className="bi bi-sliders"></i>
              <span>Cut % & Rates</span>
            </button>

            <button
              type="button"
              className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1.5"
              onClick={onViewDailyRequests}
            >
              <i className="bi bi-calendar3"></i>
              <span>View Daily Requests</span>
            </button>
          </div>
        </div>

        {/* Operational Quick Metrics */}
        <Row className="g-3 mt-1">
          <Col xs={12} sm={4}>
            <div className="p-2.5 rounded-2 border bg-light d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-medium d-block">Available HES-1 Tickets</span>
                <span className="fs-5 fw-bold text-dark font-monospace">{hes1Transactions.length}</span>
              </div>
              <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-2">
                <i className="bi bi-ticket-detailed fs-5"></i>
              </div>
            </div>
          </Col>

          <Col xs={12} sm={4}>
            <div className="p-2.5 rounded-2 border bg-light d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-medium d-block">Ready for QC (2nd Wt Done)</span>
                <span className="fs-5 fw-bold text-success font-monospace">{readyTransactions.length}</span>
              </div>
              <div className="bg-success bg-opacity-10 text-success p-2 rounded-2">
                <i className="bi bi-check2-circle fs-5"></i>
              </div>
            </div>
          </Col>

          <Col xs={12} sm={4}>
            <div className="p-2.5 rounded-2 border bg-light d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-medium d-block">Configured Baseline Moisture</span>
                <span className="fs-6 fw-bold text-dark font-monospace">
                  Rileys: 9.6% • Toyo: 8.5%
                </span>
              </div>
              <div className="bg-info bg-opacity-10 text-info p-2 rounded-2">
                <i className="bi bi-percent fs-5"></i>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Filter Toolbar */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <Row className="g-2 align-items-center">
          <Col xs={12} md={5}>
            <input
              type="text"
              className="form-control form-control-sm bg-light"
              placeholder="Search Ticket #, Vehicle, Supplier, Material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>

          <Col xs={6} md={3}>
            <select
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All HES-1 Transactions ({hes1Transactions.length})</option>
              <option value="READY_ONLY">Ready for QC / Costing ({readyTransactions.length})</option>
              <option value="COMPLETED">Completed Scale Records</option>
              <option value="SECOND_WEIGHT">2nd Reading Done</option>
              <option value="PENDING_SECOND_WEIGHT">1st Reading Done</option>
            </select>
          </Col>

          <Col xs={6} md={4} className="text-end">
            <span className="text-secondary small fw-medium">
              Showing <strong>{filteredData.length}</strong> scale tickets
            </span>
          </Col>
        </Row>
      </div>

      {/* Transactions List with Direct "Initiate for Rileys / Toyo" buttons */}
      <div className="card border shadow-sm rounded-3 bg-white overflow-hidden">
        <div className="table-responsive">
          <Table hover className="align-middle mb-0" style={{ fontSize: "0.875rem" }}>
            <thead className="table-light text-uppercase text-secondary fw-semibold border-bottom" style={{ fontSize: "0.8rem" }}>
              <tr>
                <th style={{ width: 120 }}>Ticket #</th>
                <th style={{ width: 140 }}>Date & Time</th>
                <th style={{ width: 110 }}>Vehicle</th>
                <th>Supplier</th>
                <th>Material</th>
                <th className="text-end" style={{ width: 130 }}>Net Weight (WBT)</th>
                <th className="text-center" style={{ width: 130 }}>Status</th>
                <th className="text-center" style={{ width: 220 }}>Initiate QC Request</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-secondary">
                    <div className="spinner-border spinner-border-sm me-2 text-primary" role="status"></div>
                    Loading scale transactions...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-secondary">
                    <i className="bi bi-inbox fs-2 text-muted d-block mb-2"></i>
                    No transactions match the criteria.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const dt = formatDateTime(item.second_weight_at || item.first_weight_at || item.created_at);
                  const netWeight = item.final_net_weight_kg ?? item.net_weight_kg;

                  let statusBg = "#f8f9fa";
                  let statusColor = "#495057";
                  let statusText = "1st Weight Done";

                  if (item.status === "COMPLETED") {
                    statusBg = "#d1e7dd";
                    statusColor = "#0f5132";
                    statusText = "Completed";
                  } else if (item.status === "SECOND_WEIGHT" || (item.second_weight_kg && item.status !== "COMPLETED")) {
                    statusBg = "#cff4fc";
                    statusColor = "#055160";
                    statusText = "2nd Weight Done";
                  } else {
                    statusBg = "#fff3cd";
                    statusColor = "#664d03";
                    statusText = "Awaiting 2nd Wt";
                  }

                  return (
                    <tr key={item.id || item.transaction_no}>
                      {/* Ticket # */}
                      <td>
                        <span className="font-monospace fw-bold text-primary">
                          {item.transaction_no}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td>
                        <div className="text-dark fw-medium">{dt.date}</div>
                        <div className="text-secondary small">{dt.time}</div>
                      </td>

                      {/* Vehicle */}
                      <td>
                        <span className="font-monospace text-dark fw-semibold">
                          {item.vehicle_no || "—"}
                        </span>
                      </td>

                      {/* Supplier */}
                      <td>
                        <div className="fw-medium text-dark text-truncate" style={{ maxWidth: 200 }} title={item.supplier_name}>
                          {item.supplier_name || "—"}
                        </div>
                      </td>

                      {/* Material */}
                      <td>
                        <span className="badge bg-light text-dark border fw-medium px-2 py-1">
                          {item.material_name || "—"}
                        </span>
                      </td>

                      {/* Net Weight */}
                      <td className="text-end">
                        <span className="font-monospace fw-bold text-primary fs-7">
                          {netWeight != null ? `${Number(netWeight).toLocaleString()} kg` : "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="text-center p-1">
                        <div
                          style={{
                            backgroundColor: statusBg,
                            color: statusColor,
                            fontWeight: 600,
                            fontSize: "0.78rem",
                            borderRadius: 4,
                            padding: "4px 8px"
                          }}
                        >
                          {statusText}
                        </div>
                      </td>

                      {/* Action: Select Company to Initiate */}
                      <td className="text-center">
                        <div className="d-flex align-items-center justify-content-center gap-1.5">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm py-1 px-2.5 fw-semibold"
                            style={{ fontSize: "0.78rem" }}
                            onClick={() => onInitiateWithTx(item, "RILEYS")}
                            title="Initiate with RILEYS Template Format"
                          >
                            <i className="bi bi-file-earmark-text me-1"></i>
                            Rileys
                          </button>

                          <button
                            type="button"
                            className="btn btn-outline-success btn-sm py-1 px-2.5 fw-semibold"
                            style={{ fontSize: "0.78rem" }}
                            onClick={() => onInitiateWithTx(item, "TOYO")}
                            title="Initiate with TOYO Template Format"
                          >
                            <i className="bi bi-file-earmark-text me-1"></i>
                            Toyo
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Select Company & Ticket Number Modal */}
      {selectModalOpen && (
        <Modal
          show={true}
          onHide={() => setSelectModalOpen(false)}
          centered
        >
          <Modal.Header closeButton className="bg-light py-2.5 px-3 border-bottom">
            <Modal.Title className="fw-bold fs-6 text-dark">
              Select Company & Weighbridge Ticket
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4">
            <div className="mb-3">
              <label className="form-label small fw-bold text-dark mb-1">
                1. Select Target Company:
              </label>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className={`btn flex-fill py-2 fw-bold ${selectedCompany === "RILEYS" ? "btn-primary shadow-sm" : "btn-outline-primary bg-white"}`}
                  onClick={() => setSelectedCompany("RILEYS")}
                >
                  <i className="bi bi-building me-1"></i> RILEYS
                </button>
                <button
                  type="button"
                  className={`btn flex-fill py-2 fw-bold ${selectedCompany === "TOYO" ? "btn-success shadow-sm" : "btn-outline-success bg-white"}`}
                  onClick={() => setSelectedCompany("TOYO")}
                >
                  <i className="bi bi-building me-1"></i> TOYO
                </button>
              </div>
              <div className="text-muted small mt-1" style={{ fontSize: "0.75rem" }}>
                Loads company-specific moisture cut % ({selectedCompany === "RILEYS" ? "9.6%" : "8.5%"}) and baseline rates
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-bold text-dark mb-1">
                2. Select HES-1 Ticket Number:
              </label>
              <select
                className="form-select form-select-sm font-monospace fw-semibold"
                value={selectedTicketNo}
                onChange={(e) => setSelectedTicketNo(e.target.value)}
              >
                <option value="">-- Choose an HES-1 Scale Ticket --</option>
                {hes1Transactions.map(t => {
                  const net = t.final_net_weight_kg ?? t.net_weight_kg ?? 0;
                  return (
                    <option key={t.transaction_no} value={t.transaction_no}>
                      Ticket #{t.transaction_no} — {t.supplier_name} | Net: {net} Kg | {t.material_name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Ticket Preview Card */}
            {selectedTicketNo && (() => {
              const tx = hes1Transactions.find(t => t.transaction_no === selectedTicketNo);
              if (!tx) return null;
              const net = tx.final_net_weight_kg ?? tx.net_weight_kg ?? 0;
              return (
                <div className="p-3 rounded-2 border bg-light">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-bold text-dark font-monospace">Ticket #{tx.transaction_no}</span>
                    <Badge bg="primary">{tx.plant_code || "HES-1"}</Badge>
                  </div>
                  <div className="small text-secondary mb-1">Supplier: <strong className="text-dark">{tx.supplier_name}</strong></div>
                  <div className="small text-secondary mb-1">Vehicle: <strong className="text-dark">{tx.vehicle_no}</strong> • Material: <strong className="text-dark">{tx.material_name}</strong></div>
                  <div className="small text-primary fw-bold font-monospace">Scale Net Weight (WBT): {Number(net).toLocaleString()} Kg</div>
                </div>
              );
            })()}
          </Modal.Body>

          <Modal.Footer className="bg-light py-2 px-3 border-top d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm fw-semibold px-3"
              onClick={handleSelectModalSubmit}
              disabled={!selectedTicketNo}
            >
              Initiate Request Form
            </button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

