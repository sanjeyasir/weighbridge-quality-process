import React, { useState, useEffect, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { subscribeToWeighbridgeRequests, updateFinanceCosting } from "../../services/firebase/weighbridgeService";
import PlantSelector from "../../components/common/PlantSelector";
import { useAuth } from "../../contexts/AuthContext";
import { Modal, Row, Col, Alert, Button } from "react-bootstrap";

export default function FinanceCostingView() {
  const { currentUser } = useAuth() || {};
  const isAdminMultiPlant = currentUser?.email?.toLowerCase() === "admin@gmail.com";
  const userPlant = (currentUser?.plantId || "HES-1").toUpperCase();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters (admin defaults to ALL; regular employee defaults to userPlant)
  const [selectedPlant, setSelectedPlant] = useState(isAdminMultiPlant ? "ALL" : userPlant);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING_FINANCE_OFFICER");

  // Modal State
  const [activeReq, setActiveReq] = useState(null);
  const [ratePerKg, setRatePerKg] = useState(170.00);
  const [weightForGrn, setWeightForGrn] = useState(0);
  const [costingNotes, setCostingNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToWeighbridgeRequests(
      (data) => {
        setRequests(data);
        setLoading(false);
      },
      (err) => {
        console.error("Finance costing subscription error:", err);
        setLoading(false);
      }
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Filtered requests by Plant and Status
  const filteredData = useMemo(() => {
    return requests.filter((r) => {
      const rPlant = (r.plantCode || "HES-1").toUpperCase();
      if (!isAdminMultiPlant && rPlant !== userPlant) return false;
      if (isAdminMultiPlant && selectedPlant !== "ALL" && rPlant !== selectedPlant) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const match =
          String(r.requestNo).includes(q) ||
          r.ticketNo?.toLowerCase().includes(q) ||
          r.vehicleNo?.toLowerCase().includes(q) ||
          r.supplier?.toLowerCase().includes(q) ||
          r.material?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [requests, selectedPlant, statusFilter, searchQuery]);

  const openCostingModal = (req) => {
    setActiveReq(req);
    const curWp = Number(req.quality?.weightForPayment ?? req.wbtWeight ?? 0);
    const curRate = Number(req.costing?.ratePerKg ?? (req.company === "TOYO" ? 165 : 170));
    setRatePerKg(curRate);
    setWeightForGrn(Number(req.costing?.weightForGrn ?? curWp));
    setCostingNotes(req.costing?.costingNotes || "");
  };

  // Live calculation
  const calculations = useMemo(() => {
    if (!activeReq) return { wp: 0, rate: 0, total: 0, wgrn: 0, effective: 0 };
    const wp = Number(activeReq.quality?.weightForPayment ?? activeReq.wbtWeight ?? 0);
    const rate = Number(ratePerKg || 0);
    const total = Number((wp * rate).toFixed(2));
    const wgrn = Number(weightForGrn || wp);
    const effective = wgrn > 0 ? Number((total / wgrn).toFixed(2)) : rate;
    return { wp, rate, total, wgrn, effective };
  }, [activeReq, ratePerKg, weightForGrn]);

  const handleSaveCosting = async () => {
    if (!activeReq) return;
    if (ratePerKg <= 0) {
      alert("Please enter a valid rate greater than zero.");
      return;
    }
    try {
      setSubmitting(true);
      await updateFinanceCosting(
        activeReq.id,
        {
          weightForPayment: calculations.wp,
          ratePerKg: calculations.rate,
          totalPayment: calculations.total,
          weightForGrn: calculations.wgrn,
          effectivePrice: calculations.effective,
          costingNotes
        },
        currentUser
      );
      setSubmitting(false);
      setActiveReq(null);
      setAlertMsg({ type: "success", text: `Costing completed for Request #${activeReq.requestNo}! Submitted to Finance Manager for approval.` });
    } catch (err) {
      console.error("Save costing error:", err);
      alert(err.message || "Failed to update costing");
      setSubmitting(false);
    }
  };

  // DataGrid Rows with separate columns
  const rows = useMemo(() => {
    return filteredData.map((item, idx) => {
      const wp = Number(item.quality?.weightForPayment ?? item.wbtWeight ?? 0);
      const rate = item.costing?.ratePerKg != null ? Number(item.costing.ratePerKg) : null;
      const total = item.costing?.totalPayment != null ? Number(item.costing.totalPayment) : (rate ? wp * rate : null);

      return {
        id: item.id || `req-${idx}`,
        requestNo: item.requestNo ? `#${item.requestNo}` : `#${1000 + idx}`,
        plantCode: (item.plantCode || "HES-1").toUpperCase(),
        ticketNo: item.ticketNo || "—",
        date: item.date || item.createdAt?.slice(0, 10) || "—",
        vehicleNo: item.vehicleNo || "—",
        supplier: item.supplier || "—",
        material: item.material || item.commodity || "—",
        wbtWeight: Number(item.wbtWeight || item.netWeight || 0),
        moistureCutKg: item.quality?.moistureCutKg != null ? Number(item.quality.moistureCutKg) : null,
        tradeCutKg: item.quality?.tradeCutKg != null ? Number(item.quality.tradeCutKg) : null,
        wpWeight: wp,
        ratePerKg: rate,
        totalPayment: total,
        status: item.status,
        raw: item
      };
    });
  }, [filteredData]);

  const columns = useMemo(() => [
    {
      field: "requestNo",
      headerName: "Request #",
      width: 110,
      renderCell: (params) => (
        <span className="font-monospace fw-bold text-dark">{params.value}</span>
      )
    },
    {
      field: "plantCode",
      headerName: "Plant",
      width: 95,
      renderCell: (params) => (
        <span className="badge bg-secondary-subtle text-dark font-monospace fw-bold">
          {params.value}
        </span>
      )
    },
    {
      field: "ticketNo",
      headerName: "Ticket #",
      width: 120,
      renderCell: (params) => (
        <span className="font-monospace fw-bold text-primary">{params.value}</span>
      )
    },
    {
      field: "date",
      headerName: "Date",
      width: 120,
      renderCell: (params) => (
        <span className="text-dark font-monospace">{params.value}</span>
      )
    },
    {
      field: "vehicleNo",
      headerName: "Vehicle No",
      width: 120,
      renderCell: (params) => (
        <span className="font-monospace fw-semibold text-dark">{params.value}</span>
      )
    },
    {
      field: "supplier",
      headerName: "Supplier / Party",
      width: 190,
      renderCell: (params) => (
        <span className="text-dark fw-medium text-nowrap" title={params.value}>
          {params.value}
        </span>
      )
    },
    {
      field: "material",
      headerName: "Material",
      width: 140,
      renderCell: (params) => (
        <span className="badge bg-light text-dark border fw-semibold px-2 py-1 text-nowrap">
          {params.value}
        </span>
      )
    },
    {
      field: "wbtWeight",
      headerName: "Scale Net Wt (kg)",
      width: 150,
      type: "number",
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <span className="font-monospace text-secondary">
          {Number(params.value).toLocaleString()} kg
        </span>
      )
    },
    {
      field: "moistureCutKg",
      headerName: "Moisture Cut (kg)",
      width: 140,
      type: "number",
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <span className="font-monospace text-danger">
          {params.value != null ? `-${Number(params.value).toLocaleString()} kg` : "—"}
        </span>
      )
    },
    {
      field: "tradeCutKg",
      headerName: "Trade Cut (kg)",
      width: 130,
      type: "number",
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <span className="font-monospace text-danger">
          {params.value != null ? `-${Number(params.value).toLocaleString()} kg` : "—"}
        </span>
      )
    },
    {
      field: "wpWeight",
      headerName: "Weight for Pay (WP)",
      width: 160,
      type: "number",
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <span className="font-monospace fw-bold text-primary">
          {Number(params.value).toLocaleString()} kg
        </span>
      )
    },
    {
      field: "ratePerKg",
      headerName: "Rate (Rs/kg)",
      width: 130,
      type: "number",
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <span className="font-monospace fw-bold text-dark">
          {params.value != null ? `Rs ${Number(params.value).toFixed(2)}` : "Pending"}
        </span>
      )
    },
    {
      field: "totalPayment",
      headerName: "Total Payment (Rs)",
      width: 160,
      type: "number",
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <span className="font-monospace fw-bold text-success">
          {params.value != null ? `Rs ${Number(params.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Pending"}
        </span>
      )
    },
    {
      field: "status",
      headerName: "Status",
      width: 170,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <span className={params.value === "PENDING_FINANCE_OFFICER" ? "badge bg-info text-dark fw-bold" : "badge bg-primary text-white fw-bold"}>
          {params.value === "PENDING_FINANCE_OFFICER" ? "Pending Costing" : "Costing Done"}
        </span>
      )
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 140,
      sortable: false,
      filterable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <button
          type="button"
          className="btn btn-primary btn-sm py-0.5 px-2.5 fw-semibold"
          style={{ fontSize: "0.75rem" }}
          onClick={(e) => {
            e.stopPropagation();
            openCostingModal(params.row.raw);
          }}
        >
          {params.row.raw.status === "PENDING_FINANCE_OFFICER" ? "Update Cost" : "Edit Cost"}
        </button>
      )
    }
  ], []);

  return (
    <div className="d-flex flex-column gap-3">
      {/* Header */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h4 className="fw-bold mb-0 text-dark">Finance Officer Costing (Plant-Wise)</h4>
            <p className="text-secondary small mb-0 mt-1">
              {isAdminMultiPlant
                ? "Verify quality deductions, apply per-kg rates, and compute total payable amounts (Admin Multi-Plant View)"
                : `Verify quality deductions and apply per-kg rates strictly for Plant ${userPlant}`}
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <PlantSelector
              selectedPlant={selectedPlant}
              onSelectPlant={setSelectedPlant}
              showAllOption={isAdminMultiPlant}
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

      {/* Filter Toolbar */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <Row className="g-2 align-items-center">
          <Col xs={12} md={5}>
            <input
              type="text"
              className="form-control form-control-sm bg-light"
              placeholder="Search Request #, Ticket, Vehicle, Supplier..."
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
              <option value="ALL">All Costing Stages</option>
              <option value="PENDING_FINANCE_OFFICER">Pending Finance Costing</option>
              <option value="PENDING_FINANCE_MANAGER">Costing Done (Awaiting FM Approval)</option>
              <option value="COMPLETED">Completed (Paid)</option>
            </select>
          </Col>

          <Col xs={6} md={4} className="text-end">
            <span className="text-secondary small fw-medium">
              Showing <strong>{filteredData.length}</strong> costing requests
            </span>
          </Col>
        </Row>
      </div>

      {/* DataGrid with Separate Columns */}
      <div 
        className="card border shadow-sm rounded-3 bg-white p-2"
        style={{ height: 600, width: "100%" }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 15 } }
          }}
          pageSizeOptions={[15, 25, 50, 100]}
          disableRowSelectionOnClick
          onRowClick={(params) => openCostingModal(params.row.raw)}
          sx={{
            border: "none",
            fontSize: "0.85rem",
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f8f9fa",
              fontWeight: 600,
              fontSize: "0.8rem",
              textTransform: "uppercase",
              color: "#495057",
              whiteSpace: "nowrap"
            },
            "& .MuiDataGrid-cell": {
              whiteSpace: "nowrap",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center"
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "#f8f9fa",
              cursor: "pointer"
            }
          }}
        />
      </div>

      {/* Costing Update Modal */}
      {activeReq && (
        <Modal show={true} onHide={() => setActiveReq(null)} size="lg" centered>
          <Modal.Header closeButton className="bg-light py-2.5 px-3 border-bottom">
            <Modal.Title className="fw-bold fs-6 text-dark">
              Finance Costing — Request #{activeReq.requestNo} (Ticket #{activeReq.ticketNo})
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4">
            <div className="card border shadow-sm rounded-3 bg-white p-3 mb-3">
              <Row className="g-2 text-dark small">
                <Col xs={6} md={3}>
                  <span className="text-secondary d-block">Supplier:</span>
                  <strong className="fs-7">{activeReq.supplier}</strong>
                </Col>
                <Col xs={6} md={3}>
                  <span className="text-secondary d-block">Vehicle:</span>
                  <strong className="font-monospace fs-7">{activeReq.vehicleNo}</strong>
                </Col>
                <Col xs={6} md={3}>
                  <span className="text-secondary d-block">Scale WBT:</span>
                  <strong className="font-monospace fs-7">{Number(activeReq.wbtWeight || 0).toLocaleString()} Kg</strong>
                </Col>
                <Col xs={6} md={3}>
                  <span className="text-secondary d-block">Avg Moisture:</span>
                  <strong className="fs-7 text-primary">{activeReq.quality?.avgMoisturePercent || 0}% ({activeReq.quality?.passFail || "Pass"})</strong>
                </Col>
              </Row>
            </div>

            {/* Calculations Breakdown */}
            <div className="p-3 rounded-2 border bg-light mb-3">
              <Row className="g-3">
                <Col xs={6} md={4}>
                  <span className="text-secondary small fw-bold d-block mb-1">Moisture Cut Deduction</span>
                  <div className="font-monospace text-danger fw-bold">
                    -{Number(activeReq.quality?.moistureCutKg || 0).toLocaleString()} Kg ({activeReq.quality?.moistureCutPercent || 0}%)
                  </div>
                </Col>

                <Col xs={6} md={4}>
                  <span className="text-secondary small fw-bold d-block mb-1">Trade Cut Deduction</span>
                  <div className="font-monospace text-danger fw-bold">
                    -{Number(activeReq.quality?.tradeCutKg || 0).toLocaleString()} Kg ({activeReq.quality?.tradeCutPercent || 0}%)
                  </div>
                </Col>

                <Col xs={12} md={4}>
                  <span className="text-primary small fw-bold d-block mb-1">Weight for Payment (WP)</span>
                  <div className="font-monospace text-primary fw-bold fs-6">
                    {calculations.wp.toLocaleString()} Kg
                  </div>
                </Col>
              </Row>
            </div>

            {/* Rates & Cost Inputs */}
            <div className="card border shadow-sm rounded-3 bg-white p-3 mb-3">
              <Row className="g-3">
                <Col xs={12} sm={6}>
                  <label className="form-label small fw-bold text-dark mb-1">
                    Rate / Cost Per Kg (Rs) <span className="text-danger">*</span>
                  </label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text fw-bold">Rs</span>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control font-monospace fw-bold fs-6 text-dark"
                      value={ratePerKg}
                      onChange={(e) => setRatePerKg(e.target.value)}
                      required
                    />
                  </div>
                </Col>

                <Col xs={12} sm={6}>
                  <label className="form-label small fw-bold text-dark mb-1">
                    Weight for GRN (WGRN Kg)
                  </label>
                  <div className="input-group input-group-sm">
                    <input
                      type="number"
                      step="any"
                      className="form-control font-monospace"
                      value={weightForGrn}
                      onChange={(e) => setWeightForGrn(e.target.value)}
                    />
                    <span className="input-group-text">Kg</span>
                  </div>
                </Col>

                {/* Total Payment Highlight */}
                <Col xs={12} sm={6}>
                  <div className="p-2.5 rounded-2 border border-success bg-success bg-opacity-10">
                    <span className="text-success small fw-bold d-block mb-1">Total Payable Amount (Rs)</span>
                    <h4 className="fw-bold mb-0 text-success font-monospace">
                      Rs {calculations.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h4>
                  </div>
                </Col>

                <Col xs={12} sm={6}>
                  <div className="p-2.5 rounded-2 border bg-light">
                    <span className="text-secondary small fw-bold d-block mb-1">Effective Price per Kg</span>
                    <h5 className="fw-bold mb-0 text-dark font-monospace">
                      Rs {calculations.effective.toFixed(2)} / Kg
                    </h5>
                  </div>
                </Col>

                <Col xs={12}>
                  <label className="form-label small fw-bold text-dark mb-1">Costing Remarks</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Rate agreed / contract pricing notes..."
                    value={costingNotes}
                    onChange={(e) => setCostingNotes(e.target.value)}
                  />
                </Col>
              </Row>
            </div>
          </Modal.Body>

          <Modal.Footer className="bg-light py-2.5 px-4 border-top d-flex justify-content-between">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveReq(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm px-4 fw-semibold"
              onClick={handleSaveCosting}
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Submit Costing to Finance Manager"}
            </button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
