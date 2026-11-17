import React, { useState, useMemo, useEffect } from "react";
import { Card, Table, Badge, Button, Row, Col, Modal, Form, Alert } from "react-bootstrap";

export default function Hes1TransactionsTab({
  transactions,
  loading,
  onInitiateRequest,
  onOpenConfigs
}) {
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [directionFilter, setDirectionFilter] = useState("ALL");

  // Helper date strings
  const getTodayStr = () => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  };

  const getDaysAgoStr = (days) => {
    const d = new Date(Date.now() - days * 86400000);
    return d.toISOString().slice(0, 10);
  };

  // Date From & To filters (Default: 30 days range up to today)
  const [dateFrom, setDateFrom] = useState(getDaysAgoStr(30));
  const [dateTo, setDateTo] = useState(getTodayStr());
  const [dateLimitWarning, setDateLimitWarning] = useState("");

  // Modal state
  const [selectedTx, setSelectedTx] = useState(null);

  // All HES-1 transactions
  const hes1Transactions = useMemo(() => {
    return transactions.filter(t => (t.plant_code || "HES-1").toUpperCase() === "HES-1");
  }, [transactions]);

  // Current Day's transactions on load
  const todayStr = getTodayStr();
  const currentDayHes1Transactions = useMemo(() => {
    return hes1Transactions.filter(t => {
      const txDateStr = (t.second_weight_at || t.first_weight_at || t.created_at || "").slice(0, 10);
      return txDateStr === todayStr;
    });
  }, [hes1Transactions, todayStr]);

  // Unique Materials from Current Day's Transactions on Load
  const uniqueTodayMaterials = useMemo(() => {
    const map = new Map();
    currentDayHes1Transactions.forEach(t => {
      const mat = (t.material_name || "").trim();
      if (mat) {
        map.set(mat, (map.get(mat) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([material, count]) => ({ material, count }));
  }, [currentDayHes1Transactions]);

  // All other unique materials from entire dataset (for extended filtering if needed)
  const allOtherMaterials = useMemo(() => {
    const todaySet = new Set(uniqueTodayMaterials.map(m => m.material));
    const otherSet = new Set();
    hes1Transactions.forEach(t => {
      const mat = (t.material_name || "").trim();
      if (mat && !todaySet.has(mat)) {
        otherSet.add(mat);
      }
    });
    return Array.from(otherSet).sort();
  }, [hes1Transactions, uniqueTodayMaterials]);

  // Validate and enforce 30-day date limit
  const handleDateChange = (from, to) => {
    if (!from || !to) {
      setDateFrom(from);
      setDateTo(to);
      return;
    }

    const dFrom = new Date(from);
    const dTo = new Date(to);
    const diffTime = dTo.getTime() - dFrom.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      setDateLimitWarning("Start date cannot be after end date.");
      setDateFrom(to);
      setDateTo(to);
      return;
    }

    if (diffDays > 30) {
      setDateLimitWarning("Notice: Date filter is strictly limited to 30 days max. Filter range clamped to 30 days.");
      // Clamp to max 30 days
      const maxTo = new Date(dFrom.getTime() + 30 * 86400000).toISOString().slice(0, 10);
      setDateFrom(from);
      setDateTo(maxTo);
      return;
    }

    setDateLimitWarning("");
    setDateFrom(from);
    setDateTo(to);
  };

  // Helper date formatter
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

  // Filtered HES-1 Data
  const filteredData = useMemo(() => {
    return hes1Transactions.filter(tx => {
      // Material filter
      if (selectedMaterial !== "ALL") {
        if ((tx.material_name || "").trim() !== selectedMaterial) return false;
      }

      // Status filter
      if (statusFilter !== "ALL" && tx.status !== statusFilter) return false;

      // Direction filter
      if (directionFilter !== "ALL" && tx.direction !== directionFilter) return false;

      // Date range filter (limited to max 30 days)
      if (dateFrom || dateTo) {
        const txDateStr = (tx.second_weight_at || tx.first_weight_at || tx.created_at || "").slice(0, 10);
        if (dateFrom && txDateStr < dateFrom) return false;
        if (dateTo && txDateStr > dateTo) return false;
      }

      // Search query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const match =
          tx.transaction_no?.toLowerCase().includes(q) ||
          tx.vehicle_no?.toLowerCase().includes(q) ||
          tx.supplier_name?.toLowerCase().includes(q) ||
          tx.material_name?.toLowerCase().includes(q) ||
          tx.driver_name?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.second_weight_at || b.first_weight_at || b.created_at) - new Date(a.second_weight_at || a.first_weight_at || a.created_at));
  }, [hes1Transactions, selectedMaterial, statusFilter, directionFilter, dateFrom, dateTo, searchQuery]);

  return (
    <div className="d-flex flex-column gap-3">
      {/* Top Banner & Summary */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary px-2.5 py-1.5 fw-bold font-monospace">PLANT HES-1</span>
              <h5 className="fw-bold mb-0 text-dark">HES-1 Weighbridge Scale Records</h5>
            </div>
            <p className="text-secondary small mb-0 mt-1">
              Dedicated view for Hayleys Eco Solutions Plant 1 transactions with 30-day historical window and today's unique material intake filter
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5"
              onClick={onOpenConfigs}
            >
              <i className="bi bi-gear"></i>
              <span>Cut % & Rate Config</span>
            </button>
          </div>
        </div>

        {/* Unique Current Day's Materials on Load Banner */}
        <div className="mt-3 p-2.5 rounded-2 bg-light border">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-calendar-check text-primary"></i>
              <span className="fw-bold small text-dark">
                Unique Materials from Current Day's Transactions ({todayStr}):
              </span>
              <Badge bg="info" className="text-dark fw-bold">
                {uniqueTodayMaterials.length} Unique Types
              </Badge>
            </div>
            <span className="text-muted small">
              Click a material pill below to filter instantly:
            </span>
          </div>

          <div className="d-flex flex-wrap gap-1.5">
            <button
              type="button"
              className={`btn btn-sm py-1 px-2.5 rounded-pill fw-semibold ${
                selectedMaterial === "ALL" ? "btn-primary" : "btn-outline-secondary bg-white"
              }`}
              style={{ fontSize: "0.8rem" }}
              onClick={() => setSelectedMaterial("ALL")}
            >
              All Materials ({hes1Transactions.length})
            </button>

            {uniqueTodayMaterials.map(({ material, count }) => {
              const active = selectedMaterial === material;
              return (
                <button
                  key={material}
                  type="button"
                  className={`btn btn-sm py-1 px-2.5 rounded-pill fw-semibold ${
                    active ? "btn-success text-white shadow-sm" : "btn-outline-success bg-white"
                  }`}
                  style={{ fontSize: "0.8rem" }}
                  onClick={() => setSelectedMaterial(active ? "ALL" : material)}
                >
                  <i className="bi bi-tag-fill me-1"></i>
                  {material} <span className="badge bg-white text-dark ms-1">{count} today</span>
                </button>
              );
            })}

            {uniqueTodayMaterials.length === 0 && (
              <span className="text-muted small fst-italic py-1">
                No transactions recorded today yet.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Date Limit Notice if Triggered */}
      {dateLimitWarning && (
        <Alert variant="warning" dismissible onClose={() => setDateLimitWarning("")} className="py-2 mb-0 shadow-sm">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {dateLimitWarning}
        </Alert>
      )}

      {/* Filter Toolbar with 30-Day Limit Enforcement */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <Row className="g-2 align-items-end">
          {/* Search Box */}
          <Col xs={12} md={4} lg={3}>
            <label className="form-label small fw-semibold text-secondary mb-1">
              Search Ticket / Vehicle / Supplier
            </label>
            <input
              type="text"
              className="form-control form-control-sm bg-light"
              placeholder="Search HES-1 records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>

          {/* Material Dropdown Filter (Emphasizing Today's Unique Materials) */}
          <Col xs={12} sm={6} md={4} lg={3}>
            <label className="form-label small fw-semibold text-secondary mb-1">
              Material Filter (Today's Unique Priority)
            </label>
            <select
              className="form-select form-select-sm"
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
            >
              <option value="ALL">All Materials ({hes1Transactions.length})</option>
              {uniqueTodayMaterials.length > 0 && (
                <optgroup label="⭐ Today's Unique Materials">
                  {uniqueTodayMaterials.map(({ material, count }) => (
                    <option key={material} value={material}>
                      {material} ({count} today)
                    </option>
                  ))}
                </optgroup>
              )}
              {allOtherMaterials.length > 0 && (
                <optgroup label="Other Historical Materials">
                  {allOtherMaterials.map(mat => (
                    <option key={mat} value={mat}>
                      {mat}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </Col>

          {/* Date From (Limited to 30 days max window) */}
          <Col xs={6} sm={3} md={2} lg={2}>
            <label className="form-label small fw-semibold text-secondary mb-1">
              Date From <span className="badge bg-secondary-subtle text-dark fs-9">Max 30d</span>
            </label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={dateFrom}
              max={dateTo || todayStr}
              onChange={(e) => handleDateChange(e.target.value, dateTo)}
            />
          </Col>

          {/* Date To */}
          <Col xs={6} sm={3} md={2} lg={2}>
            <label className="form-label small fw-semibold text-secondary mb-1">
              Date To
            </label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={dateTo}
              min={dateFrom}
              max={todayStr}
              onChange={(e) => handleDateChange(dateFrom, e.target.value)}
            />
          </Col>

          {/* Quick Presets & Clear */}
          <Col xs={12} lg={2} className="text-lg-end">
            <div className="d-flex align-items-center justify-content-lg-end gap-1">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm py-1 px-2"
                style={{ fontSize: "0.78rem" }}
                onClick={() => {
                  setDateFrom(todayStr);
                  setDateTo(todayStr);
                  setDateLimitWarning("");
                }}
                title="Only today's records"
              >
                Today
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm py-1 px-2"
                style={{ fontSize: "0.78rem" }}
                onClick={() => {
                  setDateFrom(getDaysAgoStr(7));
                  setDateTo(todayStr);
                  setDateLimitWarning("");
                }}
                title="Last 7 days"
              >
                7d
              </button>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm py-1 px-2"
                style={{ fontSize: "0.78rem" }}
                onClick={() => {
                  setDateFrom(getDaysAgoStr(30));
                  setDateTo(todayStr);
                  setDateLimitWarning("");
                }}
                title="Maximum allowed 30 days window"
              >
                30d Max
              </button>
              {(searchQuery || selectedMaterial !== "ALL" || dateFrom !== getDaysAgoStr(30) || dateTo !== todayStr) && (
                <button
                  type="button"
                  className="btn btn-link btn-sm text-danger text-decoration-none p-0 ms-1"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedMaterial("ALL");
                    setDateFrom(getDaysAgoStr(30));
                    setDateTo(todayStr);
                    setDateLimitWarning("");
                  }}
                >
                  Reset
                </button>
              )}
            </div>
            <div className="text-muted small mt-1">
              Showing <strong>{filteredData.length}</strong> records
            </div>
          </Col>
        </Row>
      </div>

      {/* Transactions Data Table */}
      <div className="card border shadow-sm rounded-3 bg-white overflow-hidden">
        <div className="table-responsive">
          <Table hover className="align-middle mb-0" style={{ fontSize: "0.875rem" }}>
            <thead className="table-light text-uppercase text-secondary fw-semibold border-bottom" style={{ fontSize: "0.8rem" }}>
              <tr>
                <th style={{ width: 120 }}>Ticket #</th>
                <th style={{ width: 140 }}>Date & Time</th>
                <th style={{ width: 110 }}>Vehicle</th>
                <th>Supplier / Party</th>
                <th>Material</th>
                <th className="text-end" style={{ width: 110 }}>1st Wt (kg)</th>
                <th className="text-end" style={{ width: 110 }}>2nd Wt (kg)</th>
                <th className="text-end" style={{ width: 125 }}>Net Weight</th>
                <th className="text-center" style={{ width: 140 }}>Status</th>
                <th className="text-center" style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-4 text-secondary">
                    <div className="spinner-border spinner-border-sm me-2 text-primary" role="status"></div>
                    Loading HES-1 scale transactions...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-5 text-secondary">
                    <i className="bi bi-inbox fs-2 text-muted d-block mb-2"></i>
                    No HES-1 transactions found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const dt = formatDateTime(item.second_weight_at || item.first_weight_at || item.created_at);
                  const netWeight = item.final_net_weight_kg ?? item.net_weight_kg;

                  let statusBg = "#f8f9fa";
                  let statusColor = "#495057";
                  let statusText = "1st Reading Done";

                  if (item.status === "COMPLETED") {
                    statusBg = "#d1e7dd";
                    statusColor = "#0f5132";
                    statusText = "Completed";
                  } else if (item.status === "SECOND_WEIGHT" || (item.second_weight_kg && item.status !== "COMPLETED")) {
                    statusBg = "#cff4fc";
                    statusColor = "#055160";
                    statusText = "2nd Reading Done";
                  } else {
                    statusBg = "#fff3cd";
                    statusColor = "#664d03";
                    statusText = "Pending 2nd Weight";
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
                        <div className="fw-medium text-dark text-truncate" style={{ maxWidth: 220 }} title={item.supplier_name}>
                          {item.supplier_name || "—"}
                        </div>
                        <div className="text-muted small">
                          Driver: {item.driver_name || "—"}
                        </div>
                      </td>

                      {/* Material */}
                      <td>
                        <span className="badge bg-light text-dark border fw-medium px-2 py-1">
                          {item.material_name || "—"}
                        </span>
                      </td>

                      {/* 1st Weight */}
                      <td className="text-end font-monospace text-secondary">
                        {item.first_weight_kg != null ? Number(item.first_weight_kg).toLocaleString() : "—"}
                      </td>

                      {/* 2nd Weight */}
                      <td className="text-end font-monospace text-secondary">
                        {item.second_weight_kg != null ? Number(item.second_weight_kg).toLocaleString() : "—"}
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

                      {/* Actions */}
                      <td className="text-center">
                        <div className="d-flex align-items-center justify-content-center gap-1.5">
                          {/* View Popup Modal Button */}
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm py-0.5 px-2 fw-semibold"
                            style={{ fontSize: "0.78rem" }}
                            onClick={() => setSelectedTx(item)}
                          >
                            View
                          </button>

                          {/* Quick Initiate Button */}
                          <button
                            type="button"
                            className="btn btn-primary btn-sm py-0.5 px-2 fw-semibold"
                            style={{ fontSize: "0.78rem" }}
                            onClick={() => onInitiateRequest(item)}
                            title="Initiate Quality & Costing Request using this Ticket #"
                          >
                            Initiate
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

      {/* View Popup Modal for HES-1 Scale Record */}
      {selectedTx && (
        <Modal
          show={true}
          onHide={() => setSelectedTx(null)}
          size="lg"
          centered
          scrollable
        >
          <Modal.Header closeButton className="bg-light py-3 px-4 border-bottom">
            <div>
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary font-monospace">HES-1</span>
                <Modal.Title className="fw-bold mb-0 text-dark fs-5">
                  Weighbridge Ticket #{selectedTx.transaction_no}
                </Modal.Title>
              </div>
              <span className="text-secondary small">
                Scale Record Details • Plant: Hayleys Eco Solutions Plant 1
              </span>
            </div>
          </Modal.Header>

          <Modal.Body className="p-4">
            {/* Status & Direction Strip */}
            <div 
              className="p-3 rounded-2 mb-4 border d-flex justify-content-between align-items-center"
              style={{
                backgroundColor: 
                  selectedTx.status === "COMPLETED" ? "#d1e7dd" :
                  selectedTx.status === "SECOND_WEIGHT" || selectedTx.second_weight_kg ? "#cff4fc" : "#fff3cd"
              }}
            >
              <div>
                <span className="text-dark small d-block fw-semibold mb-0.5">Scale Lifecycle Status</span>
                <span className="fw-bold text-dark fs-6">
                  {selectedTx.status === "COMPLETED" ? "Completed (Final Net Weight Locked)" :
                   selectedTx.status === "SECOND_WEIGHT" || selectedTx.second_weight_kg ? "2nd Weight Completed — Ready for QC" :
                   "1st Reading Done — Awaiting Second Weight"}
                </span>
              </div>
              <div className="text-end">
                <span className="text-dark small d-block fw-semibold mb-0.5">Scale Direction</span>
                <span className="badge bg-dark px-2.5 py-1.5 fw-bold">
                  {selectedTx.direction === "IN" ? "INBOUND (IN)" : "OUTBOUND (OUT)"}
                </span>
              </div>
            </div>

            {/* Weight Measurement Summary */}
            <h6 className="fw-bold text-dark mb-2">Weight Scale Measurements</h6>
            <div className="card border mb-4">
              <div className="card-body p-3">
                <Row className="g-3 text-center">
                  <Col xs={4} className="border-end">
                    <span className="text-secondary small d-block mb-1">1st Weight</span>
                    <h4 className="fw-bold mb-0 text-dark font-monospace">
                      {selectedTx.first_weight_kg != null ? Number(selectedTx.first_weight_kg).toLocaleString() : "—"}{" "}
                      <small className="fs-7 fw-normal text-secondary">KG</small>
                    </h4>
                    <div className="text-secondary small mt-1">
                      {formatDateTime(selectedTx.first_weight_at).date} {formatDateTime(selectedTx.first_weight_at).time}
                    </div>
                  </Col>

                  <Col xs={4} className="border-end">
                    <span className="text-secondary small d-block mb-1">2nd Weight</span>
                    <h4 className="fw-bold mb-0 text-dark font-monospace">
                      {selectedTx.second_weight_kg != null ? Number(selectedTx.second_weight_kg).toLocaleString() : "—"}{" "}
                      <small className="fs-7 fw-normal text-secondary">KG</small>
                    </h4>
                    <div className="text-secondary small mt-1">
                      {selectedTx.second_weight_at 
                        ? `${formatDateTime(selectedTx.second_weight_at).date} ${formatDateTime(selectedTx.second_weight_at).time}` 
                        : "Awaiting 2nd scale tare"}
                    </div>
                  </Col>

                  <Col xs={4}>
                    <span className="text-secondary small d-block mb-1">Scale Net Weight (WBT)</span>
                    <h4 className="fw-bold mb-0 text-primary font-monospace">
                      {selectedTx.final_net_weight_kg != null 
                        ? Number(selectedTx.final_net_weight_kg).toLocaleString() 
                        : (selectedTx.net_weight_kg != null ? Number(selectedTx.net_weight_kg).toLocaleString() : "—")}{" "}
                      <small className="fs-7 fw-normal text-secondary">KG</small>
                    </h4>
                    <div className="text-success small fw-medium mt-1">
                      Basis for Quality & Costing
                    </div>
                  </Col>
                </Row>
              </div>
            </div>

            {/* Logistics Particulars Table */}
            <h6 className="fw-bold text-dark mb-2">Transaction Particulars</h6>
            <div className="table-responsive mb-4">
              <table className="table table-bordered table-sm mb-0">
                <tbody>
                  <tr>
                    <th className="bg-light text-secondary fw-semibold" style={{ width: "35%" }}>Ticket Number</th>
                    <td className="font-monospace fw-bold text-primary">{selectedTx.transaction_no}</td>
                  </tr>
                  <tr>
                    <th className="bg-light text-secondary fw-semibold">Plant Code</th>
                    <td className="fw-semibold text-dark">HES-1 (Hayleys Eco Solutions Plant 1)</td>
                  </tr>
                  <tr>
                    <th className="bg-light text-secondary fw-semibold">Vehicle / Lorry No</th>
                    <td className="font-monospace fw-semibold text-dark">{selectedTx.vehicle_no || "—"}</td>
                  </tr>
                  <tr>
                    <th className="bg-light text-secondary fw-semibold">Driver Name</th>
                    <td className="text-dark">{selectedTx.driver_name || "—"}</td>
                  </tr>
                  <tr>
                    <th className="bg-light text-secondary fw-semibold">Supplier / Customer</th>
                    <td className="fw-semibold text-dark">{selectedTx.supplier_name || "—"}</td>
                  </tr>
                  <tr>
                    <th className="bg-light text-secondary fw-semibold">Material / Commodity</th>
                    <td className="text-dark fw-medium">{selectedTx.material_name || "—"}</td>
                  </tr>
                  <tr>
                    <th className="bg-light text-secondary fw-semibold">Operation Sub Type</th>
                    <td className="text-dark">{selectedTx.sub_type || "Purchase / Intake"}</td>
                  </tr>
                  <tr>
                    <th className="bg-light text-secondary fw-semibold">Scale Remarks</th>
                    <td className="text-dark">{selectedTx.remarks || "No remarks logged."}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Action Banner for Quality & Costing */}
            <div className="p-3 rounded-3 border bg-primary bg-opacity-10 d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div>
                <span className="fw-bold text-primary d-block">
                  Next Step: Quality & Costing Process
                </span>
                <span className="text-secondary small">
                  Create a Riley or Toyo Acceptance Note using Ticket #{selectedTx.transaction_no} and Net Weight {selectedTx.final_net_weight_kg || selectedTx.net_weight_kg || 0} kg.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-primary fw-semibold btn-sm px-3 d-flex align-items-center gap-1.5"
                onClick={() => {
                  const tx = selectedTx;
                  setSelectedTx(null);
                  onInitiateRequest(tx);
                }}
              >
                <i className="bi bi-file-earmark-plus"></i>
                <span>Initiate Request with this Ticket</span>
              </button>
            </div>
          </Modal.Body>

          <Modal.Footer className="bg-light py-2 px-4 border-top d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                navigator.clipboard.writeText(selectedTx.transaction_no);
                alert(`Ticket #${selectedTx.transaction_no} copied to clipboard!`);
              }}
            >
              <i className="bi bi-copy me-1"></i> Copy Ticket #
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm px-3"
              onClick={() => setSelectedTx(null)}
            >
              Close
            </button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

