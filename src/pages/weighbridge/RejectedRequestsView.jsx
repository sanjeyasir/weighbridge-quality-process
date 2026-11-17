import React, { useState, useEffect, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { subscribeToWeighbridgeRequests } from "../../services/firebase/weighbridgeService";
import PlantSelector from "../../components/common/PlantSelector";
import { useAuth } from "../../contexts/AuthContext";
import { Modal, Row, Col, Badge, Button } from "react-bootstrap";

export default function RejectedRequestsView() {
  const { currentUser } = useAuth() || {};
  const isAdminMultiPlant = currentUser?.email?.toLowerCase() === "admin@gmail.com";
  const userPlant = (currentUser?.plantId || "HES-1").toUpperCase();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters (admin defaults to ALL; regular employee defaults to userPlant)
  const [selectedPlant, setSelectedPlant] = useState(isAdminMultiPlant ? "ALL" : userPlant);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReq, setSelectedReq] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToWeighbridgeRequests(
      (data) => {
        setRequests(data);
        setLoading(false);
      },
      (err) => {
        console.error("Rejected requests subscription error:", err);
        setLoading(false);
      }
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Filtered requests: only REJECTED
  const filteredData = useMemo(() => {
    return requests.filter((r) => {
      if (r.status !== "REJECTED") return false;
      const rPlant = (r.plantCode || "HES-1").toUpperCase();
      if (!isAdminMultiPlant && rPlant !== userPlant) return false;
      if (isAdminMultiPlant && selectedPlant !== "ALL" && rPlant !== selectedPlant) return false;

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const match =
          String(r.requestNo).includes(q) ||
          r.ticketNo?.toLowerCase().includes(q) ||
          r.vehicleNo?.toLowerCase().includes(q) ||
          r.supplier?.toLowerCase().includes(q) ||
          r.material?.toLowerCase().includes(q) ||
          r.approval?.rejectedReason?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [requests, selectedPlant, searchQuery]);

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
      wbtWeight: Number(item.wbtWeight || item.netWeight || 0),
      rejectedBy: item.approval?.managerName || item.approval?.rejectedBy || "Finance Reviewer",
      rejectedReason: item.approval?.rejectedReason || item.rejectionReason || "Specification not met",
      status: item.status,
      raw: item
    }));
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
      width: 150,
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
      field: "rejectedBy",
      headerName: "Rejected By",
      width: 160,
      renderCell: (params) => (
        <span className="text-dark fw-semibold text-nowrap">{params.value}</span>
      )
    },
    {
      field: "rejectedReason",
      headerName: "Rejection Reason",
      width: 280,
      renderCell: (params) => (
        <span className="text-danger fw-medium text-truncate" title={params.value}>
          <i className="bi bi-exclamation-circle me-1"></i>
          {params.value}
        </span>
      )
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      align: "center",
      headerAlign: "center",
      renderCell: () => (
        <span className="badge bg-danger text-white fw-bold">✗ Rejected</span>
      )
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      filterable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <button
          type="button"
          className="btn btn-outline-danger btn-sm py-0.5 px-2.5 fw-semibold"
          style={{ fontSize: "0.75rem" }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedReq(params.row.raw);
          }}
        >
          View Reason
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
            <h4 className="fw-bold mb-0 text-dark">Rejected Requests Log (Plant-Wise)</h4>
            <p className="text-secondary small mb-0 mt-1">
              {isAdminMultiPlant
                ? "Audit log of all rejected weighbridge process requests with refusal justifications (Admin Multi-Plant View)"
                : `Audit log of rejected process requests strictly for Plant ${userPlant}`}
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

      {/* Filter Toolbar */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <Row className="g-2 align-items-center">
          <Col xs={12} md={6}>
            <input
              type="text"
              className="form-control form-control-sm bg-light"
              placeholder="Search Request #, Ticket, Vehicle, Supplier, Rejection Reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>

          <Col xs={12} md={6} className="text-end">
            <span className="text-secondary small fw-medium">
              Showing <strong>{filteredData.length}</strong> rejected requests
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

      {/* Rejection Details Modal */}
      {selectedReq && (
        <Modal show={true} onHide={() => setSelectedReq(null)} size="lg" centered>
          <Modal.Header closeButton className="bg-light py-2.5 px-3 border-bottom">
            <Modal.Title className="fw-bold fs-6 text-danger d-flex align-items-center gap-2">
              <i className="bi bi-x-circle-fill"></i>
              <span>Rejection Record — Request #{selectedReq.requestNo}</span>
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4">
            {/* Alert banner with rejection reason */}
            <div className="alert alert-danger shadow-sm mb-3">
              <h6 className="fw-bold mb-1">Reason for Rejection:</h6>
              <div className="fs-6">
                {selectedReq.approval?.rejectedReason || selectedReq.rejectionReason || "Specification requirements not met."}
              </div>
              <div className="text-secondary small mt-2">
                Decided By: <strong>{selectedReq.approval?.managerName || "Finance Reviewer"}</strong>
                {selectedReq.approval?.updatedAt && ` on ${new Date(selectedReq.approval.updatedAt).toLocaleString()}`}
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered table-sm mb-0">
                <tbody>
                  <tr>
                    <th className="bg-light" style={{ width: "35%" }}>Ticket Number</th>
                    <td className="font-monospace fw-bold text-primary">{selectedReq.ticketNo}</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Plant Code</th>
                    <td className="font-monospace fw-bold">{selectedReq.plantCode || "HES-1"}</td>
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
                    <td>{selectedReq.material} ({selectedReq.grade})</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Scale Net Weight</th>
                    <td className="font-monospace">{Number(selectedReq.wbtWeight || 0).toLocaleString()} kg</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Manager Remarks</th>
                    <td>{selectedReq.approval?.remarks || "No additional remarks."}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Modal.Body>

          <Modal.Footer className="bg-light py-2 px-3 border-top">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedReq(null)}>
              Close
            </button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
