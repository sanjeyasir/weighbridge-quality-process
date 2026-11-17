import React, { useState, useEffect, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { subscribeToWeighbridgeRequests, approveOrRejectByFinanceManager } from "../../services/firebase/weighbridgeService";
import PlantSelector from "../../components/common/PlantSelector";
import { useAuth } from "../../contexts/AuthContext";
import { Modal, Row, Col, Alert, Button } from "react-bootstrap";

export default function FinanceApprovalView() {
  const { currentUser } = useAuth() || {};
  const isAdminMultiPlant = currentUser?.email?.toLowerCase() === "admin@gmail.com";
  const userPlant = (currentUser?.plantId || "HES-1").toUpperCase();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters (admin defaults to ALL; regular employee defaults to userPlant)
  const [selectedPlant, setSelectedPlant] = useState(isAdminMultiPlant ? "ALL" : userPlant);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING_FINANCE_MANAGER");

  // Approval Modal State
  const [activeReq, setActiveReq] = useState(null);
  const [managerRemarks, setManagerRemarks] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cheque");
  const [paymentRefNo, setPaymentRefNo] = useState("");
  const [rejectReason, setRejectReason] = useState("");
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
        console.error("Finance approval subscription error:", err);
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

  const openApprovalModal = (req) => {
    setActiveReq(req);
    setManagerRemarks("");
    setPaymentMode("Cheque");
    setPaymentRefNo("CHQ-" + Math.floor(100000 + Math.random() * 900000));
    setRejectReason("");
  };

  const handleDecision = async (decision) => {
    if (!activeReq) return;
    if (decision === "REJECT" && !rejectReason.trim()) {
      alert("Please enter a specific reason for rejecting this request.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await approveOrRejectByFinanceManager(
        activeReq.id,
        decision,
        {
          name: currentUser?.displayName || currentUser?.email || "Finance Manager",
          remarks: managerRemarks,
          reason: rejectReason,
          payment: decision === "APPROVE" ? {
            mode: paymentMode,
            refNo: paymentRefNo,
            amount: activeReq.costing?.totalPayment || 0
          } : null
        },
        currentUser
      );
      setSubmitting(false);
      setActiveReq(null);
      setAlertMsg({
        type: decision === "APPROVE" ? "success" : "warning",
        text: decision === "APPROVE" 
          ? `Request #${activeReq.requestNo} APPROVED and completed by Finance Manager!`
          : `Request #${activeReq.requestNo} REJECTED.`
      });
    } catch (err) {
      console.error("Decision error:", err);
      alert(err.message || "Failed to process decision");
      setSubmitting(false);
    }
  };

  // DataGrid Rows with separate columns
  const rows = useMemo(() => {
    return filteredData.map((item, idx) => {
      const wp = Number(item.costing?.weightForPayment ?? item.quality?.weightForPayment ?? item.wbtWeight ?? 0);
      const rate = item.costing?.ratePerKg != null ? Number(item.costing.ratePerKg) : 0;
      const total = item.costing?.totalPayment != null ? Number(item.costing.totalPayment) : (wp * rate);

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
        wpWeight: wp,
        ratePerKg: rate,
        totalPayment: total,
        costingOfficer: item.costing?.officer?.name || "Finance Officer",
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
      field: "wpWeight",
      headerName: "Pay Weight (WP)",
      width: 150,
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
          Rs {Number(params.value).toFixed(2)}
        </span>
      )
    },
    {
      field: "totalPayment",
      headerName: "Amount Payable (Rs)",
      width: 170,
      type: "number",
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <span className="font-monospace fw-bold text-success fs-7">
          Rs {Number(params.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      field: "costingOfficer",
      headerName: "Costed By",
      width: 150,
      renderCell: (params) => (
        <span className="text-secondary text-nowrap">{params.value}</span>
      )
    },
    {
      field: "status",
      headerName: "Status",
      width: 160,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        if (params.value === "COMPLETED") return <span className="badge bg-success text-white fw-bold">✓ Approved</span>;
        if (params.value === "REJECTED") return <span className="badge bg-danger text-white fw-bold">✗ Rejected</span>;
        return <span className="badge bg-primary text-white fw-bold">Pending FM Approval</span>;
      }
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
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
            openApprovalModal(params.row.raw);
          }}
        >
          {params.row.raw.status === "PENDING_FINANCE_MANAGER" ? "Review & Authorize" : "View Approval"}
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
            <h4 className="fw-bold mb-0 text-dark">Finance Manager Approval (Plant-Wise)</h4>
            <p className="text-secondary small mb-0 mt-1">
              {isAdminMultiPlant
                ? "Final executive review, cost authorization, and payment voucher approval (Admin Multi-Plant View)"
                : `Final executive review and cost authorization strictly for Plant ${userPlant}`}
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
              <option value="ALL">All Stages</option>
              <option value="PENDING_FINANCE_MANAGER">Pending FM Approval</option>
              <option value="COMPLETED">Approved & Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </Col>

          <Col xs={6} md={4} className="text-end">
            <span className="text-secondary small fw-medium">
              Showing <strong>{filteredData.length}</strong> approval requests
            </span>
          </Col>
        </Row>
      </div>

      {/* DataGrid */}
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
          onRowClick={(params) => openApprovalModal(params.row.raw)}
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

      {/* Review & Authorize Modal */}
      {activeReq && (
        <Modal show={true} onHide={() => setActiveReq(null)} size="lg" centered scrollable>
          <Modal.Header closeButton className="bg-light py-2.5 px-3 border-bottom">
            <Modal.Title className="fw-bold fs-6 text-dark">
              Executive Review & Authorization — Request #{activeReq.requestNo}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4">
            {/* Particulars & Quality / Costing Summary */}
            <div className="card border shadow-sm rounded-3 bg-white p-3 mb-3">
              <Row className="g-2 text-dark small">
                <Col xs={6} md={3}>
                  <span className="text-secondary d-block">Plant Code:</span>
                  <strong className="badge bg-primary fs-7 font-monospace">{activeReq.plantCode || "HES-1"}</strong>
                </Col>
                <Col xs={6} md={3}>
                  <span className="text-secondary d-block">Ticket #:</span>
                  <strong className="font-monospace fs-7 text-primary">{activeReq.ticketNo}</strong>
                </Col>
                <Col xs={6} md={3}>
                  <span className="text-secondary d-block">Supplier:</span>
                  <strong className="fs-7">{activeReq.supplier}</strong>
                </Col>
                <Col xs={6} md={3}>
                  <span className="text-secondary d-block">Vehicle / Lorry:</span>
                  <strong className="font-monospace fs-7">{activeReq.vehicleNo}</strong>
                </Col>
              </Row>
            </div>

            {/* Calculations Breakdown */}
            <div className="p-3 rounded-2 border bg-light mb-3">
              <Row className="g-3 text-center">
                <Col xs={4} className="border-end">
                  <span className="text-secondary small d-block mb-1">Scale WBT</span>
                  <h5 className="fw-bold mb-0 text-dark font-monospace">
                    {Number(activeReq.wbtWeight || 0).toLocaleString()} <small className="fs-7">Kg</small>
                  </h5>
                </Col>

                <Col xs={4} className="border-end">
                  <span className="text-secondary small d-block mb-1">Weight for Payment (WP)</span>
                  <h5 className="fw-bold mb-0 text-primary font-monospace">
                    {Number(activeReq.costing?.weightForPayment ?? activeReq.quality?.weightForPayment ?? activeReq.wbtWeight ?? 0).toLocaleString()} <small className="fs-7">Kg</small>
                  </h5>
                </Col>

                <Col xs={4}>
                  <span className="text-success small fw-bold d-block mb-1">Total Payable Amount</span>
                  <h4 className="fw-bold mb-0 text-success font-monospace">
                    Rs {Number(activeReq.costing?.totalPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                  <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                    @ Rs {activeReq.costing?.ratePerKg || 0}/Kg
                  </span>
                </Col>
              </Row>
            </div>

            {/* If Already Decided */}
            {activeReq.status === "COMPLETED" && (
              <div className="p-3 rounded-2 border border-success bg-success bg-opacity-10 mb-3">
                <span className="fw-bold text-success d-block">✓ Request Approved by Finance Manager</span>
                <span className="small text-dark">Approved By: {activeReq.approval?.managerName}</span>
                {activeReq.payment?.completed && (
                  <div className="mt-1 small">
                    Payment Mode: {activeReq.payment.paymentMode} • Ref #: {activeReq.payment.refNo}
                  </div>
                )}
              </div>
            )}

            {activeReq.status === "REJECTED" && (
              <div className="p-3 rounded-2 border border-danger bg-danger bg-opacity-10 mb-3">
                <span className="fw-bold text-danger d-block">✗ Request Rejected</span>
                <span className="small text-dark">Reason: {activeReq.approval?.rejectedReason}</span>
              </div>
            )}

            {/* Decision Controls (If Pending Approval) */}
            {activeReq.status === "PENDING_FINANCE_MANAGER" && (
              <>
                <div className="card border shadow-sm rounded-3 bg-white p-3 mb-3">
                  <h6 className="fw-bold text-dark mb-2">Payment Voucher Particulars</h6>
                  <Row className="g-2">
                    <Col xs={6}>
                      <label className="form-label small fw-bold text-dark mb-1">Payment Mode</label>
                      <select
                        className="form-select form-select-sm"
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                      >
                        <option value="Cheque">Cheque</option>
                        <option value="Bank Transfer">Bank Transfer / SLIPS</option>
                        <option value="Cash Voucher">Cash Voucher</option>
                      </select>
                    </Col>
                    <Col xs={6}>
                      <label className="form-label small fw-bold text-dark mb-1">Cheque / Ref No</label>
                      <input
                        type="text"
                        className="form-control form-control-sm font-monospace fw-bold"
                        value={paymentRefNo}
                        onChange={(e) => setPaymentRefNo(e.target.value)}
                      />
                    </Col>
                  </Row>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark mb-1">Manager Remarks / Sign-off Notes</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    placeholder="Approval comments..."
                    value={managerRemarks}
                    onChange={(e) => setManagerRemarks(e.target.value)}
                  ></textarea>
                </div>

                <div className="p-3 rounded-2 border border-danger-subtle bg-light mb-2">
                  <label className="form-label small fw-bold text-danger mb-1">
                    If Rejecting, Specify Reason:
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Mandatory rejection reason if rejecting..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              </>
            )}
          </Modal.Body>

          <Modal.Footer className="bg-light py-2.5 px-4 border-top d-flex justify-content-between">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveReq(null)}>
              Close
            </button>

            {activeReq.status === "PENDING_FINANCE_MANAGER" && (
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm px-3 fw-semibold"
                  onClick={() => handleDecision("REJECT")}
                  disabled={submitting}
                >
                  <i className="bi bi-x-circle me-1"></i> Reject Request
                </button>

                <button
                  type="button"
                  className="btn btn-success btn-sm px-4 fw-semibold shadow-sm"
                  onClick={() => handleDecision("APPROVE")}
                  disabled={submitting}
                >
                  <i className="bi bi-check2-circle me-1"></i> Approve & Authorize Payment
                </button>
              </div>
            )}
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
