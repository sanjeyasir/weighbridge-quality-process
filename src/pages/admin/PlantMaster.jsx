import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { DataGrid } from "@mui/x-data-grid";
import { 
  subscribeToPlants, 
  createPlant, 
  updatePlant, 
  deletePlant,
  seedLivePlants
} from "../../services/firebase/plantService";

export default function PlantMaster() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    plant_code: "",
    plant_name: "",
    location: ""
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToPlants(
      (data) => {
        setPlants(data);
        setLoading(false);
      },
      (err) => {
        console.error("Plant subscription error:", err);
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const showToast = (text, type = "primary") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ plant_code: "", plant_name: "", location: "" });
    setFormError("");
    setShowModal(true);
  };

  const handleOpenEdit = (plant) => {
    setIsEditing(true);
    setCurrentId(plant.id);
    setFormData({
      plant_code: plant.plant_code || "",
      plant_name: plant.plant_name || "",
      location: plant.location !== "—" ? plant.location : ""
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const code = formData.plant_code.trim().toUpperCase();
    const name = formData.plant_name.trim();

    if (!code) {
      setFormError("Plant Code is required (e.g. HES-1)");
      return;
    }
    if (!name) {
      setFormError("Plant Name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updatePlant(currentId, {
          plant_code: code,
          plant_name: name,
          location: formData.location.trim()
        });
        showToast(`Plant '${code}' updated successfully.`);
      } else {
        await createPlant({
          plant_code: code,
          plant_name: name,
          location: formData.location.trim()
        });
        showToast(`Plant '${code}' registered successfully.`);
      }
      setShowModal(false);
    } catch (err) {
      setFormError(err.message || "Failed to save plant record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (plant) => {
    if (window.confirm(`Are you sure you want to delete Plant ${plant.plant_code} (${plant.plant_name})?`)) {
      try {
        await deletePlant(plant.id);
        showToast(`Plant ${plant.plant_code} removed.`);
      } catch (err) {
        showToast("Failed to delete plant.", "danger");
      }
    }
  };

  // Filtered plants
  const filteredPlants = useMemo(() => {
    if (!searchQuery.trim()) return plants;
    const q = searchQuery.toLowerCase();
    return plants.filter(
      p =>
        p.plant_code?.toLowerCase().includes(q) ||
        p.plant_name?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q)
    );
  }, [plants, searchQuery]);

  const rows = useMemo(() => {
    return filteredPlants.map((p, index) => ({
      id: p.id || `plant-${index}`,
      ...p
    }));
  }, [filteredPlants]);

  const columns = useMemo(() => [
    {
      field: "plant_code",
      headerName: "Plant Code",
      width: 160,
      renderCell: (params) => (
        <span className="font-monospace fw-bold text-primary">
          {params.value}
        </span>
      )
    },
    {
      field: "plant_name",
      headerName: "Plant Name",
      flex: 1,
      minWidth: 260,
      renderCell: (params) => (
        <span className="fw-semibold text-dark">
          {params.value}
        </span>
      )
    },
    {
      field: "location",
      headerName: "Location / Site",
      width: 200,
      renderCell: (params) => (
        <span className="text-secondary">
          {params.value || "—"}
        </span>
      )
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 170,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className="d-flex align-items-center gap-1">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm py-0 px-2 fw-semibold"
            style={{ fontSize: "0.78rem" }}
            onClick={() => handleOpenEdit(params.row)}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm py-0 px-2 fw-semibold"
            style={{ fontSize: "0.78rem" }}
            onClick={() => handleDelete(params.row)}
          >
            Delete
          </button>
        </div>
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
            Plant Master
          </li>
        </ol>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pb-2 border-bottom">
          <div>
            <h4 className="fw-bold mb-0 text-dark">Plant Master</h4>
            <p className="text-secondary small mb-0">
              Manage manufacturing facilities and weighbridge plant codes (e.g. HES-1)
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            {plants.length === 0 && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3 fw-semibold"
                onClick={async () => {
                  try {
                    await seedLivePlants();
                    showToast("Live Firestore initialized with starter plants (HES-1, HES-2, KVP-1).");
                  } catch (err) {
                    showToast("Failed to initialize starter plants.", "danger");
                  }
                }}
              >
                Seed Starter Plants
              </button>
            )}

            <button
              type="button"
              className="btn btn-primary btn-sm px-3 fw-semibold d-flex align-items-center gap-2"
              onClick={handleOpenAdd}
            >
              <i className="bi bi-plus-lg"></i>
              <span>Add Plant</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Filter / Search Bar */}
      <div className="card border shadow-sm rounded-3 mb-3 bg-white">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-6 col-lg-5">
              <input
                type="text"
                className="form-control form-control-sm bg-light"
                placeholder="Search by Plant Code (e.g. HES-1) or Plant Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-7 text-md-end text-secondary small fw-medium">
              Showing {filteredPlants.length} of {plants.length} registered plants
            </div>
          </div>
        </div>
      </div>

      {/* Plant Master MUI X Data Grid */}
      <div 
        className="card border shadow-sm rounded-3 bg-white p-2"
        style={{ height: 500, width: "100%" }}
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
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          sx={{
            border: "none",
            fontFamily: "inherit",
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f8f9fa",
              borderBottom: "1px solid #dee2e6",
              fontWeight: 600,
              fontSize: "0.8rem",
              textTransform: "uppercase",
              color: "#6c757d"
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid #f1f3f5",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center"
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "#f8f9fa"
            },
            "& .MuiTablePagination-root": {
              color: "#6c757d"
            }
          }}
        />
      </div>

      {/* Add / Edit Plant Modal */}
      {showModal && (
        <div 
          className="modal show d-block" 
          tabIndex="-1" 
          style={{ backgroundColor: "rgba(33, 37, 41, 0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border shadow rounded-3">
              <div className="modal-header border-bottom py-3 px-4 bg-light">
                <h5 className="modal-title fw-bold mb-0 text-dark">
                  {isEditing ? "Edit Plant Details" : "Register New Plant"}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                ></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  {formError && (
                    <div className="alert alert-danger py-2 px-3 small mb-3">
                      {formError}
                    </div>
                  )}

                  {/* Plant Code */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark">
                      Plant Code <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm font-monospace text-uppercase"
                      placeholder="e.g. HES-1"
                      value={formData.plant_code}
                      onChange={(e) => setFormData({ ...formData, plant_code: e.target.value.toUpperCase() })}
                      required
                    />
                    <div className="form-text text-muted small">
                      Standardized unique code (e.g. HES-1, HES-2, KVP-1).
                    </div>
                  </div>

                  {/* Plant Name */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark">
                      Plant Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. Hayleys Eco Solutions Plant 1"
                      value={formData.plant_name}
                      onChange={(e) => setFormData({ ...formData, plant_name: e.target.value })}
                      required
                    />
                  </div>

                  {/* Location */}
                  <div className="mb-2">
                    <label className="form-label small fw-semibold text-dark">
                      Location / Region
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. Badalgama, Western Province"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer border-top py-2 px-4 bg-light d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm px-3"
                    onClick={() => setShowModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm px-3 fw-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : (isEditing ? "Save Changes" : "Create Plant")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
