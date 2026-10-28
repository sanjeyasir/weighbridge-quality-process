import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { DataGrid } from "@mui/x-data-grid";
import { 
  subscribeToApiTransactions, 
  resetMockApiData
} from "../../services/firebase/weighbridgeApiService";
import { subscribeToPlants } from "../../services/firebase/plantService";
import { useAuth } from "../../contexts/AuthContext";

export default function WeighbridgeApiStream() {
  const { isMockMode } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [plantsList, setPlantsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [plantFilter, setPlantFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, PENDING_SECOND_WEIGHT, SECOND_WEIGHT, COMPLETED
  const [directionFilter, setDirectionFilter] = useState("ALL"); // ALL, IN, OUT
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, weight_desc, weight_asc
  
  // Modal state
  const [selectedTx, setSelectedTx] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Subscribe to real-time transactions
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToApiTransactions(
      (data) => {
        setTransactions(data);
        setLoading(false);
      },
      (err) => {
        console.error("Subscription error:", err);
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [isMockMode]);

  // Subscribe to plant master for filter options
  useEffect(() => {
    const unsubPlants = subscribeToPlants(
      (data) => setPlantsList(data),
      (err) => console.error("Plants listener error:", err)
    );
    return () => {
      if (typeof unsubPlants === "function") unsubPlants();
    };
  }, []);

  // Flash toast notification helper
  const showToast = (text, type = "primary") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper date-time formatter
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

  // Unique plant codes for the filter dropdown
  const plantOptions = useMemo(() => {
    const set = new Set();
    plantsList.forEach(p => { if (p.plant_code) set.add(p.plant_code); });
    transactions.forEach(t => { if (t.plant_code) set.add(t.plant_code); });
    if (set.size === 0) set.add("HES-1");
    return Array.from(set).sort();
  }, [plantsList, transactions]);

  // Filtered & Searched data
  const filteredData = useMemo(() => {
    const filtered = transactions.filter(tx => {
      if (plantFilter !== "ALL" && (tx.plant_code || "HES-1") !== plantFilter) return false;
      if (statusFilter !== "ALL" && tx.status !== statusFilter) return false;
      if (directionFilter !== "ALL" && tx.direction !== directionFilter) return false;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const match = 
          tx.transaction_no?.toLowerCase().includes(q) ||
          tx.plant_code?.toLowerCase().includes(q) ||
          tx.vehicle_no?.toLowerCase().includes(q) ||
          tx.supplier_name?.toLowerCase().includes(q) ||
          tx.material_name?.toLowerCase().includes(q) ||
          tx.driver_name?.toLowerCase().includes(q) ||
          tx.sub_type?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.updated_at || a.first_weight_at || 0) - new Date(b.updated_at || b.first_weight_at || 0);
      }
      if (sortBy === "weight_desc") {
        const netA = Number(a.final_net_weight_kg || a.net_weight_kg || 0);
        const netB = Number(b.final_net_weight_kg || b.net_weight_kg || 0);
        return netB - netA;
      }
      if (sortBy === "weight_asc") {
        const netA = Number(a.final_net_weight_kg || a.net_weight_kg || 0);
        const netB = Number(b.final_net_weight_kg || b.net_weight_kg || 0);
        return netA - netB;
      }
      // default: newest first
      return new Date(b.updated_at || b.first_weight_at || 0) - new Date(a.updated_at || a.first_weight_at || 0);
    });
  }, [transactions, plantFilter, statusFilter, directionFilter, searchQuery, sortBy]);

  // Prepared Rows for MUI X DataGrid
  const rows = useMemo(() => {
    return filteredData.map((item, index) => {
      const dt = formatDateTime(item.second_weight_at || item.first_weight_at || item.updated_at);
      const netWeight = item.final_net_weight_kg ?? item.net_weight_kg ?? null;
      return {
        id: item.id || item.transaction_no || `tx-${index}`,
        plant_code: item.plant_code || "HES-1",
        ...item,
        formatted_date: dt.date,
        formatted_time: dt.time,
        display_net_weight: netWeight
      };
    });
  }, [filteredData]);


  // Export to CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      showToast("No records available to export", "warning");
      return;
    }
    const headers = [
      "Transaction No",
      "Plant Code",
      "Status",
      "Vehicle No",
      "Driver Name",
      "Supplier Name",
      "Material Name",
      "Direction",
      "Sub Type",
      "1st Weight (KG)",
      "1st Weight Time",
      "2nd Weight (KG)",
      "2nd Weight Time",
      "Net Weight (KG)",
      "Final Net Weight (KG)",
      "Remarks"
    ];

    const csvRows = filteredData.map(r => [
      `"${r.transaction_no || ""}"`,
      `"${r.plant_code || "HES-1"}"`,
      `"${r.status || ""}"`,
      `"${r.vehicle_no || ""}"`,
      `"${r.driver_name || ""}"`,
      `"${r.supplier_name || ""}"`,
      `"${r.material_name || ""}"`,
      `"${r.direction || ""}"`,
      `"${r.sub_type || ""}"`,
      r.first_weight_kg ?? "",
      `"${r.first_weight_at || ""}"`,
      r.second_weight_kg ?? "",
      `"${r.second_weight_at || ""}"`,
      r.net_weight_kg ?? "",
      r.final_net_weight_kg ?? "",
      `"${(r.remarks || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `weighbridge_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Transaction data exported to CSV!");
  };


  const hasActiveFilters = searchQuery || plantFilter !== "ALL" || statusFilter !== "ALL" || directionFilter !== "ALL" || sortBy !== "newest";

  const clearFilters = () => {
    setSearchQuery("");
    setPlantFilter("ALL");
    setStatusFilter("ALL");
    setDirectionFilter("ALL");
    setSortBy("newest");
  };

  // MUI X DataGrid Columns - NO CHIPS; Only Status cell gets background color based on status
  const columns = useMemo(() => [
    {
      field: "transaction_no",
      headerName: "Ticket #",
      width: 130,
      renderCell: (params) => (
        <span className="font-monospace fw-bold text-primary">
          {params.value}
        </span>
      )
    },
    {
      field: "plant_code",
      headerName: "Plant",
      width: 100,
      renderCell: (params) => (
        <span className="font-monospace fw-semibold text-dark">
          {params.value || "HES-1"}
        </span>
      )
    },
    {
      field: "formatted_date",
      headerName: "Date & Time",
      width: 155,
      renderCell: (params) => (
        <span className="text-dark">
          {params.row.formatted_date} {params.row.formatted_time && <span className="text-secondary ms-1">{params.row.formatted_time}</span>}
        </span>
      )
    },
    {
      field: "vehicle_no",
      headerName: "Vehicle",
      width: 120,
      renderCell: (params) => (
        <span className="font-monospace text-dark fw-medium">
          {params.value || "—"}
        </span>
      )
    },
    {
      field: "driver_name",
      headerName: "Driver",
      width: 150,
      renderCell: (params) => (
        <span className="text-dark">{params.value || "—"}</span>
      )
    },
    {
      field: "supplier_name",
      headerName: "Supplier / Party",
      width: 200,
      renderCell: (params) => (
        <span className="text-dark fw-medium text-truncate" title={params.value}>
          {params.value || "—"}
        </span>
      )
    },
    {
      field: "material_name",
      headerName: "Material",
      width: 140,
      renderCell: (params) => (
        <span className="text-dark">
          {params.value || "—"}
        </span>
      )
    },
    {
      field: "direction",
      headerName: "Direction",
      width: 90,
      renderCell: (params) => (
        <span className={params.value === "IN" ? "text-primary fw-semibold" : "text-secondary fw-semibold"}>
          {params.value || "—"}
        </span>
      )
    },
    {
      field: "sub_type",
      headerName: "Sub Type",
      width: 110,
      renderCell: (params) => (
        <span className="text-secondary">{params.value || "Standard"}</span>
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
        <span className="font-monospace text-dark">
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
        <span className="font-monospace text-dark">
          {params.value != null ? `${Number(params.value).toLocaleString()} kg` : "—"}
        </span>
      )
    },
    {
      field: "display_net_weight",
      headerName: "Net Weight (kg)",
      width: 135,
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
      width: 160,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const val = params.value;
        let bg = "#f8f9fa";
        let color = "#495057";
        let label = "Pending 2nd Weight";

        if (val === "COMPLETED") {
          bg = "#d1e7dd"; // Bootstrap classic success background
          color = "#0f5132";
          label = "Completed";
        } else if (val === "SECOND_WEIGHT" || (params.row.second_weight_kg && val !== "COMPLETED")) {
          bg = "#cff4fc"; // Bootstrap classic info background
          color = "#055160";
          label = "2nd Reading Done";
        } else if (val === "PENDING_SECOND_WEIGHT") {
          bg = "#fff3cd"; // Bootstrap classic warning background
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
              fontSize: "0.875rem",
              letterSpacing: "0.01em"
            }}
          >
            {label}
          </div>
        );
      }
    },
    {
      field: "actions",
      headerName: "Action",
      width: 90,
      sortable: false,
      filterable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <button 
          type="button" 
          className="btn btn-outline-primary btn-sm py-0 px-2 fw-semibold"
          style={{ fontSize: "0.78rem" }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedTx(params.row);
          }}
        >
          View
        </button>
      )
    }
  ], []);

  return (
    <div className="container-fluid p-0">
      {/* Toast Alert */}
      {toastMessage && (
        <div 
          className={`alert alert-${toastMessage.type} alert-dismissible fade show shadow-sm mb-3 d-flex align-items-center justify-content-between`} 
          role="alert"
        >
          <span className="fw-medium">{toastMessage.text}</span>
          <button type="button" className="btn-close" onClick={() => setToastMessage(null)}></button>
        </div>
      )}

      {/* Breadcrumb Top Navigation */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-2" style={{ fontSize: "0.85rem" }}>
          <li className="breadcrumb-item">
            <Link to="/dashboard" className="text-decoration-none text-primary">Dashboard</Link>
          </li>
          <li className="breadcrumb-item active text-secondary" aria-current="page">
            Weighbridge Transactions
          </li>
        </ol>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pb-2 border-bottom">
          <div>
            <h4 className="fw-bold mb-0 text-dark">Weighbridge Transactions</h4>
            <p className="text-secondary small mb-0">
              Live scale transaction records, plant allocations, and completion status
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button 
              type="button" 
              className="btn btn-primary btn-sm px-3"
              onClick={handleExportCSV}
            >
              Export CSV
            </button>
          </div>
        </div>
      </nav>

      {/* Filter & Search Bar with Plant Filter */}
      <div className="card border shadow-sm rounded-3 mb-3 bg-white">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            {/* Search Input */}
            <div className="col-12 col-lg-3">
              <input 
                type="text" 
                className="form-control form-control-sm bg-light" 
                placeholder="Search Ticket, Plant, Vehicle, Supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Plant Filter */}
            <div className="col-6 col-md-3 col-lg-2">
              <select 
                className="form-select form-select-sm" 
                value={plantFilter}
                onChange={(e) => setPlantFilter(e.target.value)}
              >
                <option value="ALL">All Plants</option>
                {plantOptions.map(code => (
                  <option key={code} value={code}>Plant {code}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="col-6 col-md-3 col-lg-2">
              <select 
                className="form-select form-select-sm" 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_SECOND_WEIGHT">1st Reading Done</option>
                <option value="SECOND_WEIGHT">2nd Reading Done</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            {/* Direction Filter */}
            <div className="col-6 col-md-3 col-lg-2">
              <select 
                className="form-select form-select-sm" 
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
              >
                <option value="ALL">All Directions</option>
                <option value="IN">Inbound (IN)</option>
                <option value="OUT">Outbound (OUT)</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="col-6 col-md-3 col-lg-2">
              <select 
                className="form-select form-select-sm" 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="weight_desc">Highest Net Weight</option>
                <option value="weight_asc">Lowest Net Weight</option>
              </select>
            </div>

            {/* Clear Filters / Count */}
            <div className="col-12 col-lg-1 text-lg-end d-flex align-items-center justify-content-lg-end gap-2">
              {hasActiveFilters && (
                <button 
                  type="button" 
                  className="btn btn-outline-secondary btn-sm py-1 px-2"
                  onClick={clearFilters}
                  title="Clear all filters"
                >
                  Clear
                </button>
              )}
              <span className="text-secondary small fw-medium text-nowrap">
                {filteredData.length} records
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* React Data Grid Component - MUI X with Status Background Cell */}
      <div 
        className="card border shadow-sm rounded-3 bg-white p-2"
        style={{ height: 620, width: "100%" }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 }
            }
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          onRowClick={(params) => setSelectedTx(params.row)}
          sx={{
            border: "none",
            fontFamily: "inherit",
            fontSize: "0.875rem",
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f8f9fa",
              borderBottom: "1px solid #dee2e6",
              fontWeight: 600,
              fontSize: "0.85rem",
              textTransform: "uppercase",
              color: "#495057"
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid #f1f3f5",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center"
            },
            "& .MuiDataGrid-cell[data-field='status']": {
              padding: 0
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "#f8f9fa",
              cursor: "pointer"
            },
            "& .MuiTablePagination-root": {
              color: "#6c757d",
              fontSize: "0.875rem"
            }
          }}
        />
      </div>

      {/* Viewing Ticket Details Modal - Clean Text, No Chips, Status Update Action */}
      {selectedTx && (
        <div 
          className="modal show d-block" 
          tabIndex="-1" 
          style={{ backgroundColor: "rgba(33, 37, 41, 0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border shadow rounded-3">
              {/* Modal Header */}
              <div className="modal-header border-bottom py-3 px-4 bg-light d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="modal-title fw-bold mb-0 text-dark">
                    Ticket #{selectedTx.transaction_no}
                  </h5>
                  <span className="text-secondary small">
                    Plant: {selectedTx.plant_code || "HES-1"} • Weighbridge Scale Transaction
                  </span>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedTx(null)}></button>
              </div>

              {/* Modal Body */}
              <div className="modal-body p-4">
                {/* Status & Lifecycle Strip */}
                <div 
                  className="d-flex flex-wrap justify-content-between align-items-center p-3 rounded-2 mb-4 border"
                  style={{
                    backgroundColor: 
                      selectedTx.status === "COMPLETED" ? "#d1e7dd" :
                      selectedTx.status === "SECOND_WEIGHT" || selectedTx.second_weight_kg ? "#cff4fc" : "#fff3cd"
                  }}
                >
                  <div>
                    <span className="text-dark small d-block fw-semibold mb-1">Transaction Lifecycle Status</span>
                    <span className="fw-bold fs-6 text-dark">
                      {selectedTx.status === "COMPLETED" ? "Completed (Finalized)" :
                       selectedTx.status === "SECOND_WEIGHT" || selectedTx.second_weight_kg ? "2nd Reading Done — Ready to Complete" :
                       "1st Reading Done — Awaiting 2nd Weight"}
                    </span>
                  </div>

                  <div>
                    <span className="text-dark small d-block fw-semibold mb-1">Direction</span>
                    <span className="fw-bold text-dark">
                      {selectedTx.direction === "IN" ? "Inbound (IN)" : "Outbound (OUT)"}
                    </span>
                  </div>
                </div>

                {/* Weight Breakdown Cards */}
                <h6 className="fw-bold mb-2 text-dark">Weight Measurements</h6>
                <div className="card border mb-4">
                  <div className="card-body p-3">
                    <div className="row g-3 text-center">
                      {/* 1st Weight */}
                      <div className="col-4 border-end">
                        <div className="text-secondary small mb-1">1st Weight</div>
                        <h4 className="fw-bold mb-0 text-dark font-monospace">
                          {selectedTx.first_weight_kg != null ? Number(selectedTx.first_weight_kg).toLocaleString() : "—"}{" "}
                          <small className="fs-7 fw-normal text-secondary">KG</small>
                        </h4>
                        <div className="text-secondary small mt-1">
                          {formatDateTime(selectedTx.first_weight_at).date} {formatDateTime(selectedTx.first_weight_at).time}
                        </div>
                      </div>

                      {/* 2nd Weight */}
                      <div className="col-4 border-end">
                        <div className="text-secondary small mb-1">2nd Weight</div>
                        <h4 className="fw-bold mb-0 text-dark font-monospace">
                          {selectedTx.second_weight_kg != null ? Number(selectedTx.second_weight_kg).toLocaleString() : "—"}{" "}
                          <small className="fs-7 fw-normal text-secondary">KG</small>
                        </h4>
                        <div className="text-secondary small mt-1">
                          {selectedTx.second_weight_at 
                            ? `${formatDateTime(selectedTx.second_weight_at).date} ${formatDateTime(selectedTx.second_weight_at).time}` 
                            : "Awaiting second weighing"}
                        </div>
                      </div>

                      {/* Net Weight */}
                      <div className="col-4">
                        <div className="text-secondary small mb-1">Net Weight</div>
                        <h4 className="fw-bold mb-0 text-primary font-monospace">
                          {selectedTx.final_net_weight_kg != null 
                            ? Number(selectedTx.final_net_weight_kg).toLocaleString() 
                            : (selectedTx.net_weight_kg != null ? Number(selectedTx.net_weight_kg).toLocaleString() : "—")}{" "}
                          <small className="fs-7 fw-normal text-secondary">KG</small>
                        </h4>
                        {selectedTx.net_weight_kg && selectedTx.final_net_weight_kg && selectedTx.net_weight_kg !== selectedTx.final_net_weight_kg && (
                          <div className="text-secondary small mt-1">
                            Gross Net: {Number(selectedTx.net_weight_kg).toLocaleString()} KG
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logistics & Particulars Table (Clean Plain Text - No Chips) */}
                <h6 className="fw-bold mb-2 text-dark">Transaction Particulars</h6>
                <div className="table-responsive">
                  <table className="table table-bordered table-sm mb-0">
                    <tbody>
                      <tr>
                        <th className="bg-light text-secondary fw-semibold" style={{ width: "32%" }}>Ticket Number</th>
                        <td className="font-monospace fw-bold text-primary">{selectedTx.transaction_no}</td>
                      </tr>
                      <tr>
                        <th className="bg-light text-secondary fw-semibold">Plant Code</th>
                        <td className="fw-semibold text-dark">
                          {selectedTx.plant_code || "HES-1"}
                        </td>
                      </tr>
                      <tr>
                        <th className="bg-light text-secondary fw-semibold">Vehicle Number</th>
                        <td className="font-monospace text-dark">{selectedTx.vehicle_no || "—"}</td>
                      </tr>
                      <tr>
                        <th className="bg-light text-secondary fw-semibold">Driver Name</th>
                        <td className="text-dark">{selectedTx.driver_name || "—"}</td>
                      </tr>
                      <tr>
                        <th className="bg-light text-secondary fw-semibold">Supplier / Customer</th>
                        <td className="fw-medium text-dark">{selectedTx.supplier_name || "—"}</td>
                      </tr>
                      <tr>
                        <th className="bg-light text-secondary fw-semibold">Material / Commodity</th>
                        <td className="text-dark">{selectedTx.material_name || "—"}</td>
                      </tr>
                      <tr>
                        <th className="bg-light text-secondary fw-semibold">Operation Sub Type</th>
                        <td className="text-dark">{selectedTx.sub_type || "Standard"}</td>
                      </tr>
                      <tr>
                        <th className="bg-light text-secondary fw-semibold">Remarks & Scale Notes</th>
                        <td className="text-dark">{selectedTx.remarks || "No additional notes provided."}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer border-top py-2 px-4 d-flex justify-content-end gap-2 bg-light">

                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedTx.transaction_no);
                      showToast(`Copied ${selectedTx.transaction_no}`);
                    }}
                  >
                    Copy Ticket No
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm px-3" 
                    onClick={() => setSelectedTx(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
