import React, { useState, useEffect, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { subscribeToWeighbridgeRequests } from "../../services/firebase/weighbridgeService";
import PlantSelector from "../../components/common/PlantSelector";
import { useAuth } from "../../contexts/AuthContext";
import PrintableAcceptanceNoteModal from "./components/PrintableAcceptanceNoteModal";
import { generateAcceptanceNotePDF } from "../../utils/acceptanceNotePdfGenerator";
import { Modal, Row, Col, Badge, Button } from "react-bootstrap";

export default function CompletedRequestsView() {
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
        console.error("Completed requests subscription error:", err);
        setLoading(false);
      }
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Filtered requests: only COMPLETED
  const filteredData = useMemo(() => {
    return requests.filter((r) => {
      if (r.status !== "COMPLETED") return false;
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
          r.payment?.refNo?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [requests, selectedPlant, searchQuery]);

  // Aggregate totals
  const totals = useMemo(() => {
    const count = filteredData.length;
    const totalWbt = filteredData.reduce((acc, r) => acc + Number(r.wbtWeight || 0), 0);
    const totalWp = filteredData.reduce((acc, r) => acc + Number(r.costing?.weightForPayment ?? r.quality?.weightForPayment ?? r.wbtWeight ?? 0), 0);
    const totalPaid = filteredData.reduce((acc, r) => acc + Number(r.payment?.paidAmount || r.costing?.totalPayment || 0), 0);
    return { count, totalWbt, totalWp, totalPaid };
  }, [filteredData]);

  // DataGrid Rows with separate columns
  const rows = useMemo(() => {
    return filteredData.map((item, idx) => {
      const wp = Number(item.costing?.weightForPayment ?? item.quality?.weightForPayment ?? item.wbtWeight ?? 0);
      const rate = item.costing?.ratePerKg != null ? Number(item.costing.ratePerKg) : 0;
      const paid = Number(item.payment?.paidAmount || item.costing?.totalPayment || 0);

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
        totalPaid: paid,
        approvedBy: item.approval?.managerName || "Finance Manager",
        paymentMode: item.payment?.paymentMode || "Cheque",
        paymentRef: item.payment?.refNo || "—",
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
      width: 120,
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
      field: "totalPaid",
      headerName: "Paid Amount (Rs)",
      width: 160,
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
      field: "approvedBy",
      headerName: "Approved By",
      width: 150,
      renderCell: (params) => (
        <span className="text-secondary text-nowrap">{params.value}</span>
      )
    },
    {
      field: "paymentMode",
      headerName: "Payment Mode",
      width: 120,
      renderCell: (params) => (
        <span className="badge bg-light text-dark border">{params.value}</span>
      )
    },
    {
      field: "paymentRef",
      headerName: "Ref / Cheque #",
      width: 140,
      renderCell: (params) => (
        <span className="font-monospace fw-semibold text-primary">{params.value}</span>
      )
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
            title="Download Vector PDF Report"
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
            title="Preview Acceptance Note"
          >
            <i className="bi bi-eye"></i> View
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
            <h4 className="fw-bold mb-0 text-dark">Completed & Paid Requests (Plant-Wise)</h4>
            <p className="text-secondary small mb-0 mt-1">
              {isAdminMultiPlant
                ? "Finalized weighbridge transactions with approved costing and executed payments (Admin Multi-Plant View)"
                : `Finalized weighbridge transactions strictly for Plant ${userPlant}`}
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

        {/* Totals Summary */}
        <Row className="g-3 mt-1">
          <Col xs={6} md={3}>
            <div className="p-2.5 rounded-2 border bg-light">
              <span className="text-secondary small fw-medium d-block">Completed Requests</span>
              <h4 className="fw-bold mb-0 text-dark font-monospace">{totals.count}</h4>
            </div>
          </Col>

          <Col xs={6} md={3}>
            <div className="p-2.5 rounded-2 border bg-light">
              <span className="text-secondary small fw-medium d-block">Total Scale Weight (WBT)</span>
              <h4 className="fw-bold mb-0 text-primary font-monospace">{totals.totalWbt.toLocaleString()} <small className="fs-7">Kg</small></h4>
            </div>
          </Col>

          <Col xs={6} md={3}>
            <div className="p-2.5 rounded-2 border bg-light">
              <span className="text-secondary small fw-medium d-block">Total Payment Weight (WP)</span>
              <h4 className="fw-bold mb-0 text-primary font-monospace">{totals.totalWp.toLocaleString()} <small className="fs-7">Kg</small></h4>
            </div>
          </Col>

          <Col xs={6} md={3}>
            <div className="p-2.5 rounded-2 border border-success bg-success bg-opacity-10">
              <span className="text-success small fw-bold d-block">Total Disbursed (Rs)</span>
              <h4 className="fw-bold mb-0 text-success font-monospace">
                Rs {totals.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
            </div>
          </Col>
        </Row>
      </div>

      {/* Filter Toolbar */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <Row className="g-2 align-items-center">
          <Col xs={12} md={6}>
            <input
              type="text"
              className="form-control form-control-sm bg-light"
              placeholder="Search Request #, Ticket, Vehicle, Supplier, Cheque #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>

          <Col xs={12} md={6} className="text-end">
            <span className="text-secondary small fw-medium">
              Showing <strong>{filteredData.length}</strong> completed requests
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

      {/* Printable Acceptance Note Modal */}
      {selectedReq && (
        <PrintableAcceptanceNoteModal
          show={true}
          onHide={() => setSelectedReq(null)}
          request={{
            ...selectedReq,
            moistureCutPercent: selectedReq.quality?.moistureCutPercent,
            moistureCutKg: selectedReq.quality?.moistureCutKg,
            tradeCutPercent: selectedReq.quality?.tradeCutPercent,
            tradeCutKg: selectedReq.quality?.tradeCutKg,
            weightForPayment: selectedReq.costing?.weightForPayment ?? selectedReq.quality?.weightForPayment ?? selectedReq.wbtWeight,
            ratePerKg: selectedReq.costing?.ratePerKg,
            totalPayment: selectedReq.payment?.paidAmount || selectedReq.costing?.totalPayment,
            samples: selectedReq.quality?.samples,
            avgMoisturePercent: selectedReq.quality?.avgMoisturePercent,
            passFail: selectedReq.quality?.passFail,
            dryTest: selectedReq.quality?.dryTest,
            hacklingTest: selectedReq.quality?.hacklingTest,
            nonConformities: selectedReq.quality?.nonConformities,
            actionTaken: selectedReq.quality?.actionTaken,
            intakeQc: selectedReq.quality?.inspector,
            locationHead: { approved: true, name: "Location Head" },
            accountant: selectedReq.costing?.officer ? { checked: true, name: selectedReq.costing.officer.name } : null,
            financeManager: selectedReq.approval?.managerName ? { approved: true, name: selectedReq.approval.managerName } : null,
            payment: selectedReq.payment
          }}
        />
      )}
    </div>
  );
}
