import React, { useState, useEffect } from "react";
import { subscribeToPlants } from "../../services/firebase/plantService";
import { useAuth } from "../../contexts/AuthContext";

export default function PlantSelector({ 
  selectedPlant, 
  onSelectPlant, 
  showAllOption = true, 
  label = "Filter by Plant",
  allowAllUsersMultiPlant = false 
}) {
  const { currentUser } = useAuth() || {};
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdminMultiPlant = allowAllUsersMultiPlant || currentUser?.email?.toLowerCase() === "admin@gmail.com";
  const userPlant = (currentUser?.plantId || "HES-1").toUpperCase();

  useEffect(() => {
    const unsub = subscribeToPlants((list) => {
      setPlants(list);
      setLoading(false);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // When the user is NOT admin@gmail.com, force the selection to their assigned plant
  useEffect(() => {
    if (!isAdminMultiPlant && userPlant) {
      if (selectedPlant !== userPlant) {
        onSelectPlant(userPlant);
      }
    }
  }, [isAdminMultiPlant, userPlant, selectedPlant, onSelectPlant]);

  // Non-admin@gmail.com users see only their assigned plant (no dropdown to switch to other plants)
  if (!isAdminMultiPlant) {
    return (
      <div className="d-flex align-items-center gap-1.5">
        {label && (
          <span className="small text-secondary fw-semibold d-none d-sm-inline">
            <i className="bi bi-buildings me-1 text-primary"></i>
            {label}:
          </span>
        )}
        <span 
          className="badge bg-primary-subtle text-primary border border-primary px-2.5 py-1.5 fw-bold font-monospace d-flex align-items-center gap-1.5 shadow-sm"
          style={{ fontSize: "0.85rem" }}
          title={`Assigned Plant: Plant ${userPlant}`}
        >
          <i className="bi bi-geo-alt-fill text-danger fs-8"></i>
          Plant {userPlant}
        </span>
      </div>
    );
  }

  // admin@gmail.com only gets the dropdown to view multiple plants
  return (
    <div className="d-flex align-items-center gap-2">
      {label && (
        <label className="form-label small fw-semibold text-secondary mb-0 text-nowrap d-none d-sm-inline">
          <i className="bi bi-buildings me-1 text-primary"></i>
          {label}:
        </label>
      )}
      <select
        className="form-select form-select-sm fw-bold border-primary shadow-sm"
        style={{ minWidth: 160, fontSize: "0.85rem" }}
        value={selectedPlant || "ALL"}
        onChange={(e) => onSelectPlant(e.target.value)}
        disabled={loading}
      >
        {showAllOption && <option value="ALL">🌐 All Plants (Global)</option>}
        {plants.length === 0 && !loading && (
          <>
            <option value="HES-1">Plant HES-1 — Eco Solutions 1</option>
            <option value="HES-2">Plant HES-2 — Eco Solutions 2</option>
          </>
        )}
        {plants.map((p) => {
          const code = (p.plant_code || p.id || "").toUpperCase();
          const name = p.plant_name || `Plant ${code}`;
          return (
            <option key={code} value={code}>
              Plant {code} — {name}
            </option>
          );
        })}
      </select>
    </div>
  );
}
