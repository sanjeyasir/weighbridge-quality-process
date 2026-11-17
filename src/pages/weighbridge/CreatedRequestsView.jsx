import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DataGrid } from "@mui/x-data-grid";
import { subscribeToWeighbridgeRequests } from "../../services/firebase/weighbridgeService";
import PlantSelector from "../../components/common/PlantSelector";
import { useAuth } from "../../contexts/AuthContext";
import { Modal, Row, Col, Badge, Button } from "react-bootstrap";
import { generateAcceptanceNotePDF } from "../../utils/acceptanceNotePdfGenerator";

export default function CreatedRequestsView() {
  const navigate = useNavigate();
  const { currentUser } = useAuth() || {};
  const isAdminMultiPlant = currentUser?.email?.toLowerCase() === "admin@gmail.com";
  const userPlant = (currentUser?.plantId || "HES-1").toUpperCase();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters (admin defaults to ALL; regular employee defaults to userPlant)
  const [selectedPlant, setSelectedPlant] = useState(isAdminMultiPlant ? "ALL" : userPlant);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedReq, setSelectedReq] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToWeighbridgeRequests(
      (data) => {
        setRequests(data);
        setLoading(false);
      },
      (err) => {
        console.error("Created requests subscription error:", err);
        setLoading(false);
      }
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Filtered requests by Plant and Status (Non-admin strictly sees only their plant's details)
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
          r.material?.toLowerCase().includes(q) ||
          r.requestedBy?.name?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [requests, isAdminMultiPlant, userPlant, selectedPlant, statusFilter, searchQuery]);

  // DataGrid Rows with separate columns
  const rows = useMemo(() => {
    return filteredData.map((item, idx) => ({
      id: item.id || `req-${idx}`,
      requestNo: item.requestNo ? `#${item.requestNo}` : `#${1000 + idx}`,
      plantCode: (item.plantCode || "HES-1").toUpperCase(),
      ticketNo: item.ticketNo || "—",
      date: item.date || item.createdAt?.slice(0, 10) || "—",
      vehicleNo: item.vehicleNo || "—",
      supplier: item.supplier || "—",
      material: item.material || item.commodity || "—",
      grade: item.grade || "YJ042",
      wbtWeight: Number(item.wbtWeight || item.netWeight || 0),
      requesterName: item.requestedBy?.name || item.requestedBy?.email || "Requester",
      status: item.status || "PENDING_QUALITY",
      raw: item
    }));
  }, [filteredData]);

  // Status Badge Formatter
  const renderStatusBadge = (status) => {
    switch (status) {
      case "PENDING_QUALITY":
        return <span className="badge bg-warning text-dark fw-bold">1. Pending Quality</span>;
      case "PENDING_FINANCE_OFFICER":
        return <span className="badge bg-info text-dark fw-bold">2. Pending Finance Costing</span>;
      case "PENDING_FINANCE_MANAGER":
        return <span className="badge bg-primary text-white fw-bold">3. Pending FM Approval</span>;
      case "COMPLETED":
        return <span className="badge bg-success text-white fw-bold">✓ Completed (Approved)</span>;
      case "REJECTED":
        return <span className="badge bg-danger text-white fw-bold">✗ Rejected</span>;
      default:
        return <span className="badge bg-secondary text-white fw-bold">{status}</span>;
    }
  };

  // Separate Columns for MUI DataGrid
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
      headerName: "Request Date",
      width: 120,
      renderCell: (params) => (
        <span className="text-dark font-monospace" style={{ fontSize: "0.85rem" }}>
          {params.value}
        </span>
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
      width: 150,
      renderCell: (params) => (
        <span className="badge bg-light text-dark border fw-semibold px-2 py-1 text-nowrap">
          {params.value}
        </span>
      )
    },
    {
      field: "grade",
      headerName: "Grade",
      width: 100,
      renderCell: (params) => (
        <span className="text-secondary">{params.value}</span>
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
        <span className="font-monospace fw-bold text-primary">
          {Number(params.value).toLocaleString()} kg
        </span>
      )
    },
    {
      field: "requesterName",
      headerName: "Created By",
      width: 150,
      renderCell: (params) => (
        <span className="text-secondary text-nowrap">{params.value}</span>
      )
    },
    {
      field: "status",
      headerName: "Current Status",
      width: 180,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => renderStatusBadge(params.value)
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
        <div className="d-flex align-items-center gap-1.5 justify-content-center">
          <button
            type="button"
            className="btn btn-primary btn-sm py-0.5 px-2 fw-semibold d-flex align-items-center gap-1 shadow-sm"
            style={{ fontSize: "0.75rem" }}
            onClick={(e) => {
              e.stopPropagation();
              generateAcceptanceNotePDF(params.row.raw);
            }}
            title="Download PDF Report"
          >
            <i className="bi bi-file-earmark-pdf-fill"></i> PDF
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm py-0.5 px-2 fw-semibold d-flex align-items-center gap-1"
            style={{ fontSize: "0.75rem" }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedReq(params.row.raw);
            }}
            title="View Details"
          >
            <i className="bi bi-eye"></i> Details
          </button>
        </div>
      )
    }
  ], []);

  return (
    <div className="d-flex flex-column gap-3">
      {/* Header */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h4 className="fw-bold mb-0 text-dark">Created Process Requests (Requester View)</h4>
            <p className="text-secondary small mb-0 mt-1">
              {isAdminMultiPlant 
                ? "All initiated weighbridge quality and costing requests across plants (Admin Multi-Plant View)" 
                : `All initiated requests strictly for your assigned plant (Plant ${userPlant})`}
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <PlantSelector
              selectedPlant={selectedPlant}
              onSelectPlant={setSelectedPlant}
              showAllOption={isAdminMultiPlant}
              label={isAdminMultiPlant ? "Select Plant" : "Assigned Plant"}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm fw-semibold d-flex align-items-center gap-1.5 shadow-sm"
              onClick={() => navigate("/requests/new")}
            >
              <i className="bi bi-plus-circle"></i>
              <span>Create Request</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <Row className="g-2 align-items-center">
          <Col xs={12} md={5}>
            <input
              type="text"
              className="form-control form-control-sm bg-light"
              placeholder="Search Request #, Ticket, Vehicle, Supplier, Requester..."
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
              <option value="ALL">All Lifecycle Statuses</option>
              <option value="PENDING_QUALITY">1. Pending Quality</option>
              <option value="PENDING_FINANCE_OFFICER">2. Pending Finance Costing</option>
              <option value="PENDING_FINANCE_MANAGER">3. Pending FM Approval</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </Col>

          <Col xs={6} md={4} className="text-end">
            <span className="text-secondary small fw-medium">
              Showing <strong>{filteredData.length}</strong> created requests
            </span>
          </Col>
        </Row>
      </div>

      {/* MUI DataGrid with Separate Columns */}
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
          onRowClick={(params) => setSelectedReq(params.row.raw)}
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

      {/* Details Modal */}
      {selectedReq && (
        <Modal show={true} onHide={() => setSelectedReq(null)} size="lg" centered>
          <Modal.Header closeButton className="bg-light py-2.5 px-3 border-bottom">
            <Modal.Title className="fw-bold fs-6 text-dark">
              Request #{selectedReq.requestNo} Details — Ticket #{selectedReq.ticketNo}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <div className="table-responsive">
              <table className="table table-bordered table-sm mb-3">
                <tbody>
                  <tr>
                    <th className="bg-light" style={{ width: "35%" }}>Request Number</th>
                    <td className="font-monospace fw-bold text-dark">#{selectedReq.requestNo}</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Plant Code</th>
                    <td className="font-monospace fw-bold text-primary">{selectedReq.plantCode || "HES-1"}</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Ticket Number</th>
                    <td className="font-monospace fw-bold text-primary">{selectedReq.ticketNo}</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Current Stage</th>
                    <td>{renderStatusBadge(selectedReq.status)}</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Supplier</th>
                    <td className="fw-semibold">{selectedReq.supplier}</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Vehicle No</th>
                    <td className="font-monospace">{selectedReq.vehicleNo}</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Material / Grade</th>
                    <td>{selectedReq.material} ({selectedReq.grade || "YJ042"})</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Scale Net Weight (WBT)</th>
                    <td className="font-monospace fw-bold">{Number(selectedReq.wbtWeight || 0).toLocaleString()} kg</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Created By</th>
                    <td>{selectedReq.requestedBy?.name || "—"} ({selectedReq.requestedBy?.email})</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Requester Notes</th>
                    <td>{selectedReq.remarks || "No remarks."}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Modal.Body>
          <Modal.Footer className="bg-light py-2 px-3 border-top d-flex justify-content-between align-items-center">
            <button type="button" className="btn btn-secondary btn-sm px-3" onClick={() => setSelectedReq(null)}>
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm px-3 fw-semibold d-flex align-items-center gap-1.5 shadow-sm"
              onClick={() => generateAcceptanceNotePDF(selectedReq)}
            >
              <i className="bi bi-file-earmark-pdf-fill"></i>
              <span>Download PDF Report</span>
            </button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
