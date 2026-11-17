import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DataGrid } from "@mui/x-data-grid";
import { subscribeToApiTransactions } from "../../services/firebase/weighbridgeApiService";
import PlantSelector from "../../components/common/PlantSelector";
import { useAuth } from "../../contexts/AuthContext";
import { Modal, Row, Col, Badge } from "react-bootstrap";

export default function WeighbridgeTransactionsView() {
  const navigate = useNavigate();
  const { currentUser } = useAuth() || {};
  const isAdminMultiPlant = currentUser?.email?.toLowerCase() === "admin@gmail.com";
  const userPlant = (currentUser?.plantId || "HES-1").toUpperCase();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters (admin@gmail.com defaults to ALL; regular employee defaults to their assigned plant)
  const [selectedPlant, setSelectedPlant] = useState(isAdminMultiPlant ? "ALL" : userPlant);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [directionFilter, setDirectionFilter] = useState("ALL");
  const [selectedTx, setSelectedTx] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToApiTransactions(
      (data) => {
        setTransactions(data);
        setLoading(false);
      },
      (err) => {
        console.error("Transactions subscription error:", err);
        setLoading(false);
      }
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Format Date and Time into separate distinct strings
  const parseDateTime = (dateStr) => {
    if (!dateStr) return { date: "—", time: "—" };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: dateStr, time: "—" };
      return {
        date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
    } catch {
      return { date: dateStr, time: "—" };
    }
  };

  // Filtered transactions (Non-admin strictly sees only their plant's details)
  const filteredData = useMemo(() => {
    return transactions.filter((t) => {
      const tPlant = (t.plant_code || "HES-1").toUpperCase();

      // Strict plant isolation: regular employee can ONLY see their assigned plant
      if (!isAdminMultiPlant && tPlant !== userPlant) return false;
      if (isAdminMultiPlant && selectedPlant !== "ALL" && tPlant !== selectedPlant) return false;

      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (directionFilter !== "ALL" && t.direction !== directionFilter) return false;

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const match =
          t.transaction_no?.toLowerCase().includes(q) ||
          t.vehicle_no?.toLowerCase().includes(q) ||
          t.supplier_name?.toLowerCase().includes(q) ||
          t.material_name?.toLowerCase().includes(q) ||
          t.driver_name?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [transactions, isAdminMultiPlant, userPlant, selectedPlant, statusFilter, directionFilter, searchQuery]);

  // DataGrid Rows with separate columns
  const rows = useMemo(() => {
    return filteredData.map((item, idx) => {
      const dt = parseDateTime(item.second_weight_at || item.first_weight_at || item.updated_at);
      const netWeight = item.final_net_weight_kg ?? item.net_weight_kg ?? null;

      // Integration is completed when 2nd weight reading has been taken and net weight is determined
      const isIntegrationCompleted = 
        item.status === "COMPLETED" || 
        (item.second_weight_kg != null && Number(item.second_weight_kg) > 0) ||
        (netWeight != null && Number(netWeight) > 0);

      return {
        id: item.id || item.transaction_no || `tx-${idx}`,
        transaction_no: item.transaction_no || "—",
        plant_code: (item.plant_code || "HES-1").toUpperCase(),
        tx_date: dt.date,
        tx_time: dt.time,
        vehicle_no: item.vehicle_no || "—",
        driver_name: item.driver_name || "—",
        supplier_name: item.supplier_name || "—",
        material_name: item.material_name || "—",
        direction: item.direction || "IN",
        sub_type: item.sub_type || "Purchase",
        first_weight_kg: item.first_weight_kg != null ? Number(item.first_weight_kg) : null,
        second_weight_kg: item.second_weight_kg != null ? Number(item.second_weight_kg) : null,
        net_weight_kg: netWeight != null ? Number(netWeight) : null,
        status: item.status || "PENDING_SECOND_WEIGHT",
        isIntegrationCompleted,
        raw: { ...item, isIntegrationCompleted }
      };
    });
  }, [filteredData]);

  // Separate Columns for MUI DataGrid (Strictly no combining fields, no wrapping)
  const columns = useMemo(() => [
    {
      field: "transaction_no",
      headerName: "Ticket #",
      width: 120,
      renderCell: (params) => (
        <span className="font-monospace fw-bold text-primary">
          {params.value}
        </span>
      )
    },
    {
      field: "plant_code",
      headerName: "Plant",
      width: 95,
      renderCell: (params) => (
        <span className="badge bg-secondary-subtle text-dark font-monospace fw-bold">
          {params.value}
        </span>
      )
    },
    {
      field: "tx_date",
      headerName: "Date",
      width: 120,
      renderCell: (params) => (
        <span className="text-dark font-monospace" style={{ fontSize: "0.85rem" }}>
          {params.value}
        </span>
      )
    },
    {
      field: "tx_time",
      headerName: "Time",
      width: 90,
      renderCell: (params) => (
        <span className="text-secondary font-monospace" style={{ fontSize: "0.85rem" }}>
          {params.value}
        </span>
      )
    },
    {
      field: "vehicle_no",
      headerName: "Vehicle No",
      width: 120,
      renderCell: (params) => (
        <span className="font-monospace fw-semibold text-dark">
          {params.value}
        </span>
      )
    },
    {
      field: "driver_name",
      headerName: "Driver Name",
      width: 140,
      renderCell: (params) => (
        <span className="text-dark text-nowrap">{params.value}</span>
      )
    },
    {
      field: "supplier_name",
      headerName: "Supplier / Party",
      width: 200,
      renderCell: (params) => (
        <span className="text-dark fw-medium text-nowrap" title={params.value}>
          {params.value}
        </span>
      )
    },
    {
      field: "material_name",
      headerName: "Material",
      width: 160,
      renderCell: (params) => (
        <span className="badge bg-light text-dark border fw-semibold px-2 py-1 text-nowrap">
          {params.value}
        </span>
      )
    },
    {
      field: "direction",
      headerName: "Direction",
      width: 95,
      renderCell: (params) => (
        <span className={params.value === "IN" ? "badge bg-primary-subtle text-primary fw-bold" : "badge bg-secondary-subtle text-dark fw-bold"}>
          {params.value}
        </span>
      )
    },
    {
      field: "sub_type",
      headerName: "Sub Type",
      width: 110,
      renderCell: (params) => (
        <span className="text-secondary">{params.value}</span>
      )
    },
    {
      field: "first_weight_kg",
      headerName: "1st Weight (kg)",
      width: 130,
      type: "number",
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <span className="font-monospace text-secondary">
          {params.value != null ? `${Number(params.value).toLocaleString()} kg` : "—"}
        </span>
      )
    },
    {
      field: "second_weight_kg",
      headerName: "2nd Weight (kg)",
      width: 130,
      type: "number",
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <span className="font-monospace text-secondary">
          {params.value != null ? `${Number(params.value).toLocaleString()} kg` : "—"}
        </span>
      )
    },
    {
      field: "net_weight_kg",
      headerName: "Net Weight (kg)",
      width: 140,
      type: "number",
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <span className="font-monospace fw-bold text-primary">
          {params.value != null ? `${Number(params.value).toLocaleString()} kg` : "—"}
        </span>
      )
    },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const val = params.value;
        let bg = "#f8f9fa";
        let color = "#495057";
        let label = "Pending 2nd Wt";

        if (val === "COMPLETED") {
          bg = "#d1e7dd";
          color = "#0f5132";
          label = "Completed";
        } else if (val === "SECOND_WEIGHT" || (params.row.second_weight_kg && val !== "COMPLETED")) {
          bg = "#cff4fc";
          color = "#055160";
          label = "2nd Reading Done";
        } else if (val === "PENDING_SECOND_WEIGHT") {
          bg = "#fff3cd";
          color = "#664d03";
          label = "1st Reading Done";
        }

        return (
          <div 
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: bg,
              color: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: "0.78rem"
            }}
          >
            {label}
          </div>
        );
      }
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 180,
      sortable: false,
      filterable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const isCompleted = params.row.isIntegrationCompleted;

        return (
          <div className="d-flex align-items-center gap-1.5">
            <button 
              type="button" 
              className="btn btn-outline-primary btn-sm py-0.5 px-2 fw-semibold"
              style={{ fontSize: "0.75rem" }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTx(params.row.raw);
              }}
            >
              View
            </button>

            {/* Create Req button can ONLY be seen once normal weighbridge integration is completed */}
            {isCompleted ? (
              <button 
                type="button" 
                className="btn btn-primary btn-sm py-0.5 px-2 fw-semibold"
                style={{ fontSize: "0.75rem" }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/requests/new?plant=${params.row.plant_code}&ticket=${params.row.transaction_no}`);
                }}
                title="Create Weighbridge Process Request"
              >
                Create Req
              </button>
            ) : (
              <span 
                className="badge bg-warning bg-opacity-25 text-warning-emphasis border border-warning border-opacity-50 fw-normal" 
                style={{ fontSize: "0.7rem" }}
                title="Integration Incomplete: Pending 2nd Weight reading at scale"
              >
                Scale Pending
              </span>
            )}
          </div>
        );
      }
    }
  ], [navigate]);

  return (
    <div className="d-flex flex-column gap-3">
      {/* Header with Plant Selector */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h4 className="fw-bold mb-0 text-dark">Weighbridge Scale Records (Plant-Wise)</h4>
            <p className="text-secondary small mb-0 mt-1">
              {isAdminMultiPlant 
                ? "Live scale transactions across all plants with multi-plant filtering (Admin View)" 
                : `Live scale transactions strictly for your assigned plant (Plant ${userPlant})`}
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
          <Col xs={12} md={4}>
            <input
              type="text"
              className="form-control form-control-sm bg-light"
              placeholder="Search Ticket, Vehicle, Supplier, Driver, Material..."
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
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed Scale Records</option>
              <option value="SECOND_WEIGHT">2nd Reading Done</option>
              <option value="PENDING_SECOND_WEIGHT">1st Reading Done</option>
            </select>
          </Col>

          <Col xs={6} md={3}>
            <select
              className="form-select form-select-sm"
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
            >
              <option value="ALL">All Directions</option>
              <option value="IN">Inbound (IN)</option>
              <option value="OUT">Outbound (OUT)</option>
            </select>
          </Col>

          <Col xs={12} md={2} className="text-end">
            <span className="text-secondary small fw-medium">
              Showing <strong>{filteredData.length}</strong> records
            </span>
          </Col>
        </Row>
      </div>

      {/* MUI DataGrid (All columns separate, no wrapping) */}
      <div 
        className="card border shadow-sm rounded-3 bg-white p-2"
        style={{ height: 620, width: "100%" }}
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
          onRowClick={(params) => setSelectedTx(params.row.raw)}
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

      {/* Detail Popup Modal */}
      {selectedTx && (
        <Modal show={true} onHide={() => setSelectedTx(null)} size="lg" centered>
          <Modal.Header closeButton className="bg-light py-2.5 px-3 border-bottom">
            <div>
              <Modal.Title className="fw-bold fs-6 text-dark">
                Scale Ticket #{selectedTx.transaction_no} — Plant {selectedTx.plant_code || "HES-1"}
              </Modal.Title>
            </div>
          </Modal.Header>
          <Modal.Body className="p-4">
            <div className="table-responsive">
              <table className="table table-bordered table-sm mb-3">
                <tbody>
                  <tr>
                    <th className="bg-light" style={{ width: "35%" }}>Ticket Number</th>
                    <td className="font-monospace fw-bold text-primary">{selectedTx.transaction_no}</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Plant Code</th>
                    <td className="font-monospace fw-bold">{selectedTx.plant_code || "HES-1"}</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Integration Status</th>
                    <td>
                      {selectedTx.isIntegrationCompleted ? (
                        <span className="badge bg-success">Integration Completed</span>
                      ) : (
                        <span className="badge bg-warning text-dark">Integration Incomplete (Pending 2nd Weight)</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th className="bg-light">Vehicle Number</th>
                    <td className="font-monospace">{selectedTx.vehicle_no || "—"}</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Driver Name</th>
                    <td>{selectedTx.driver_name || "—"}</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Supplier / Customer</th>
                    <td className="fw-semibold">{selectedTx.supplier_name || "—"}</td>
                  </tr>
                  <tr>
                    <th className="bg-light">Material / Commodity</th>
                    <td>{selectedTx.material_name || "—"}</td>
                  </tr>
                  <tr>
                    <th className="bg-light">1st Weight (kg)</th>
                    <td className="font-monospace">{Number(selectedTx.first_weight_kg || 0).toLocaleString()} kg</td>
                  </tr>
                  <tr>
                    <th className="bg-light">2nd Weight (kg)</th>
                    <td className="font-monospace">
                      {selectedTx.second_weight_kg != null ? `${Number(selectedTx.second_weight_kg).toLocaleString()} kg` : "— (Pending)"}
                    </td>
                  </tr>
                  <tr>
                    <th className="bg-light">Net Weight (kg)</th>
                    <td className="font-monospace fw-bold text-primary">
                      {selectedTx.final_net_weight_kg || selectedTx.net_weight_kg 
                        ? `${Number(selectedTx.final_net_weight_kg || selectedTx.net_weight_kg).toLocaleString()} kg` 
                        : "— (Pending 2nd Weight)"}
                    </td>
                  </tr>
                  <tr>
                    <th className="bg-light">Scale Notes</th>
                    <td>{selectedTx.remarks || "No additional remarks."}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Modal.Body>
          <Modal.Footer className="bg-light py-2 px-3 border-top d-flex justify-content-between">
            {selectedTx.isIntegrationCompleted ? (
              <button
                type="button"
                className="btn btn-primary btn-sm fw-semibold"
                onClick={() => {
                  const tx = selectedTx;
                  setSelectedTx(null);
                  navigate(`/requests/new?plant=${tx.plant_code}&ticket=${tx.transaction_no}`);
                }}
              >
                <i className="bi bi-plus-circle me-1"></i> Create Process Request with this Ticket
              </button>
            ) : (
              <div className="text-warning-emphasis small fw-medium d-flex align-items-center gap-1.5">
                <i className="bi bi-exclamation-triangle-fill text-warning"></i>
                Scale integration incomplete (2nd weight pending). Cannot create request until scale cycle completes.
              </div>
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedTx(null)}>
              Close
            </button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
