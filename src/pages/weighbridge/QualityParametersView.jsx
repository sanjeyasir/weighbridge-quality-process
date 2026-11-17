import React, { useState, useEffect, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { subscribeToWeighbridgeRequests, updateQualityParameters } from "../../services/firebase/weighbridgeService";
import PlantSelector from "../../components/common/PlantSelector";
import { useAuth } from "../../contexts/AuthContext";
import { Modal, Row, Col, Table, Alert, Button } from "react-bootstrap";

export default function QualityParametersView() {
  const { currentUser } = useAuth() || {};
  const isAdminMultiPlant = currentUser?.email?.toLowerCase() === "admin@gmail.com";
  const userPlant = (currentUser?.plantId || "HES-1").toUpperCase();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters (admin defaults to ALL; regular employee defaults to userPlant)
  const [selectedPlant, setSelectedPlant] = useState(isAdminMultiPlant ? "ALL" : userPlant);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING_QUALITY");

  // Modal State
  const [activeReq, setActiveReq] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  // Quality Form Fields
  const defaultSamples = [
    { sampleNo: "S1", moisture: 21.0, weight: 100, length: 15, noOfStrings: 4, brkStrength: 45, runnage: 120, warp: 10, weft: 12, ropeDiameter: 8, noOfTwist: 15 },
    { sampleNo: "S2", moisture: 20.5, weight: 100, length: 15, noOfStrings: 4, brkStrength: 46, runnage: 121, warp: 10, weft: 11, ropeDiameter: 8, noOfTwist: 15 },
    { sampleNo: "S3", moisture: 21.5, weight: 101, length: 15, noOfStrings: 4, brkStrength: 44, runnage: 119, warp: 11, weft: 12, ropeDiameter: 8, noOfTwist: 16 },
    { sampleNo: "S4", moisture: 20.8, weight: 100, length: 15, noOfStrings: 4, brkStrength: 45, runnage: 120, warp: 10, weft: 12, ropeDiameter: 8, noOfTwist: 15 },
    { sampleNo: "S5", moisture: 21.2, weight: 100, length: 15, noOfStrings: 4, brkStrength: 47, runnage: 120, warp: 10, weft: 11, ropeDiameter: 8, noOfTwist: 15 }
  ];
  const [samples, setSamples] = useState(defaultSamples);
  const [moistureCutPercent, setMoistureCutPercent] = useState(9.60);
  const [tradeCutPercent, setTradeCutPercent] = useState(0.00);
  const [otherDeductionKg, setOtherDeductionKg] = useState(0);

  const [dryTest, setDryTest] = useState({ weight: 100, weightAfterDry: 79, actualLossMoisture: 21 });
  const [hacklingTest, setHacklingTest] = useState({ boPercent: 4.0, sfPercent: 3.0, pithPercent: 1.0, dustPercent: 0.5, qualityComment: "Good" });
  const [nonConformities, setNonConformities] = useState({ highMoisture: false, offColour: false, veryPithy: false, foreignMatters: false, other: false, details: "" });
  const [actionTaken, setActionTaken] = useState("Standard moisture deduction applied per specification.");

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToWeighbridgeRequests(
      (data) => {
        setRequests(data);
        setLoading(false);
      },
      (err) => {
        console.error("Quality requests subscription error:", err);
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

  // Average Moisture & Pass/Fail live calculation
  const avgMoisture = useMemo(() => {
    const valid = samples.filter(s => s.moisture !== "" && !isNaN(Number(s.moisture)));
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, s) => acc + Number(s.moisture), 0);
    return Number((sum / valid.length).toFixed(2));
  }, [samples]);

  const passFail = avgMoisture <= 20.0 ? "Pass" : (avgMoisture <= 30.0 ? "Pass (with Cut)" : "Fail / High Moisture");

  const openQualityModal = (req) => {
    setActiveReq(req);
    const existingQ = req.quality || {};
    if (existingQ.samples && existingQ.samples.length > 0) {
      setSamples(existingQ.samples);
    } else {
      setSamples(defaultSamples);
    }
    setMoistureCutPercent(existingQ.moistureCutPercent ?? (req.company === "TOYO" ? 8.50 : 9.60));
    setTradeCutPercent(existingQ.tradeCutPercent ?? 0.00);
    setOtherDeductionKg(existingQ.otherDeductionKg ?? 0);
    if (existingQ.dryTest) setDryTest(existingQ.dryTest);
    if (existingQ.hacklingTest) setHacklingTest(existingQ.hacklingTest);
    if (existingQ.nonConformities) setNonConformities(existingQ.nonConformities);
    setActionTaken(existingQ.actionTaken || "Standard moisture deduction applied per specification.");
  };

  const handleSampleChange = (idx, field, val) => {
    setSamples(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSaveQuality = async (isDraft = false) => {
    if (!activeReq) return;
    try {
      setSubmitting(true);
      await updateQualityParameters(
        activeReq.id,
        {
          samples,
          avgMoisturePercent: avgMoisture,
          passFail,
          dryTest,
          hacklingTest,
          nonConformities,
          actionTaken,
          moistureCutPercent,
          tradeCutPercent,
          otherDeductionKg
        },
        currentUser,
        isDraft
      );
      setSubmitting(false);
      setActiveReq(null);
      if (isDraft) {
        setAlertMsg({ 
          type: "info", 
          text: `Draft quality parameters saved for Request #${activeReq.requestNo}! You can review and update again before submitting to Finance Officer.` 
        });
      } else {
        setAlertMsg({ 
          type: "success", 
          text: `Quality parameters confirmed and submitted for Request #${activeReq.requestNo}! Transferred to Finance Officer for costing confirmation.` 
        });
      }
    } catch (err) {
      console.error("Save quality error:", err);
      alert(err.message || "Failed to save quality parameters");
      setSubmitting(false);
    }
  };

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
      avgMoisture: item.quality?.avgMoisturePercent != null ? `${item.quality.avgMoisturePercent}%` : "Pending",
      passFail: item.quality?.passFail || "Pending",
      moistureCutPct: item.quality?.moistureCutPercent != null ? `${item.quality.moistureCutPercent}%` : "—",
      tradeCutPct: item.quality?.tradeCutPercent != null ? `${item.quality.tradeCutPercent}%` : "—",
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
        <span className="font-monospace fw-bold text-primary">
          {Number(params.value).toLocaleString()} kg
        </span>
      )
    },
    {
      field: "avgMoisture",
      headerName: "Avg Moisture %",
      width: 130,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <span className={`badge ${params.value === "Pending" ? "bg-warning text-dark" : "bg-primary text-white"} font-monospace px-2 py-1`}>
          {params.value}
        </span>
      )
    },
    {
      field: "passFail",
      headerName: "Quality Grading",
      width: 130,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <span className={`badge ${params.value.includes("Pass") ? "bg-success text-white" : "bg-secondary text-white"} px-2 py-1`}>
          {params.value}
        </span>
      )
    },
    {
      field: "moistureCutPct",
      headerName: "Moisture Cut %",
      width: 130,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <span className="font-monospace fw-semibold">{params.value}</span>
      )
    },
    {
      field: "tradeCutPct",
      headerName: "Trade Cut %",
      width: 120,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <span className="font-monospace text-secondary">{params.value}</span>
      )
    },
    {
      field: "status",
      headerName: "Status",
      width: 180,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const isDraft = params.row.raw?.quality?.isDraft;
        if (params.value === "PENDING_QUALITY") {
          return isDraft ? (
            <span className="badge bg-warning bg-opacity-25 text-dark border border-warning px-2.5 py-1 fw-bold">
              <i className="bi bi-pencil-square me-1 text-warning"></i> Quality Draft Saved
            </span>
          ) : (
            <span className="badge bg-warning text-dark fw-bold px-2 py-1">
              Pending Inspection
            </span>
          );
        }
        return (
          <span className="badge bg-info text-dark fw-bold px-2 py-1">
            Quality Completed
          </span>
        );
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
      renderCell: (params) => {
        const isDraft = params.row.raw?.quality?.isDraft;
        return (
          <button
            type="button"
            className="btn btn-primary btn-sm py-0.5 px-2.5 fw-semibold d-flex align-items-center gap-1 mx-auto"
            style={{ fontSize: "0.75rem" }}
            onClick={(e) => {
              e.stopPropagation();
              openQualityModal(params.row.raw);
            }}
          >
            <i className={`bi ${isDraft ? "bi-pencil-square" : "bi-clipboard-check"}`}></i>
            <span>{isDraft ? "Continue Draft" : (params.row.raw.status === "PENDING_QUALITY" ? "Inspect Samples" : "Edit Quality")}</span>
          </button>
        );
      }
    }
  ], []);

  return (
    <div className="d-flex flex-column gap-3">
      {/* Header */}
      <div className="card border shadow-sm rounded-3 bg-white p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h4 className="fw-bold mb-0 text-dark">Quality & Costing Parameters (Quality Team View)</h4>
            <p className="text-secondary small mb-0 mt-1">
              {isAdminMultiPlant 
                ? "Inspect sample test parameters, calculate average moisture, and set plant-wise moisture & trade cuts (Admin Multi-Plant View)" 
                : `Inspect sample test parameters strictly for your assigned plant (Plant ${userPlant})`}
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
              <option value="ALL">All Inspection Stages</option>
              <option value="PENDING_QUALITY">Pending Quality Inspection</option>
              <option value="PENDING_FINANCE_OFFICER">Quality Completed (In Costing)</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </Col>

          <Col xs={6} md={4} className="text-end">
            <span className="text-secondary small fw-medium">
              Showing <strong>{filteredData.length}</strong> inspection requests
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
          onRowClick={(params) => openQualityModal(params.row.raw)}
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

      {/* Update Quality Parameters Modal */}
      {activeReq && (
        <Modal show={true} onHide={() => setActiveReq(null)} size="xl" centered scrollable>
          <Modal.Header closeButton className="bg-light py-2.5 px-4 border-bottom">
            <div className="d-flex align-items-center gap-3">
              <span className="badge bg-primary px-2.5 py-1 font-monospace">
                Plant {activeReq.plantCode || "HES-1"}
              </span>
              <Modal.Title className="fw-bold fs-5 text-dark mb-0">
                Update Quality Parameters — Request #{activeReq.requestNo} (Ticket #{activeReq.ticketNo})
              </Modal.Title>
              {activeReq?.quality?.isDraft && (
                <span className="badge bg-warning bg-opacity-25 text-dark border border-warning px-2.5 py-1 small fw-bold">
                  <i className="bi bi-file-earmark-text me-1 text-warning"></i> Draft in Progress
                </span>
              )}
            </div>
          </Modal.Header>

          <Modal.Body className="p-4 bg-light">
            {/* Particulars strip */}
            <div className="card border shadow-sm rounded-3 bg-white p-3 mb-3">
              <Row className="g-2 text-dark small">
                <Col xs={6} md={3}>
                  <span className="text-secondary d-block">Supplier:</span>
                  <strong className="fs-7">{activeReq.supplier}</strong>
                </Col>
                <Col xs={6} md={3}>
                  <span className="text-secondary d-block">Vehicle / Lorry No:</span>
                  <strong className="font-monospace fs-7">{activeReq.vehicleNo}</strong>
                </Col>
                <Col xs={6} md={3}>
                  <span className="text-secondary d-block">Material / Grade:</span>
                  <strong className="fs-7">{activeReq.material} ({activeReq.grade})</strong>
                </Col>
                <Col xs={6} md={3}>
                  <span className="text-secondary d-block">Scale Net Weight (WBT):</span>
                  <strong className="font-monospace fs-6 text-primary">
                    {Number(activeReq.wbtWeight || 0).toLocaleString()} Kg
                  </strong>
                </Col>
              </Row>
            </div>

            {/* Quality Samples S1 to S5 */}
            <div className="card border shadow-sm rounded-3 bg-white p-3 mb-3">
              <div className="d-flex justify-content-between align-items-center pb-2 mb-3 border-bottom">
                <h6 className="fw-bold text-dark mb-0 text-uppercase" style={{ letterSpacing: "0.03em" }}>
                  Intake Samples Testing ($S_1$ to $S_5$)
                </h6>
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold small text-dark">Average Moisture:</span>
                  <span className="badge bg-primary fs-7 font-monospace px-2.5 py-1">{avgMoisture}%</span>
                  <span className={`badge ${avgMoisture <= 20 ? "bg-success" : "bg-warning text-dark"} fs-7 px-2.5 py-1`}>
                    {passFail}
                  </span>
                </div>
              </div>

              <div className="table-responsive mb-3">
                <Table bordered hover size="sm" className="align-middle text-center mb-0" style={{ fontSize: "0.82rem" }}>
                  <thead className="table-light text-secondary text-uppercase fw-semibold">
                    <tr>
                      <th style={{ width: 70 }}>Sample</th>
                      <th style={{ width: 100 }}>Moisture %</th>
                      <th style={{ width: 90 }}>Weight (g)</th>
                      <th style={{ width: 90 }}>Length (cm)</th>
                      <th style={{ width: 100 }}>No of Strings</th>
                      <th style={{ width: 105 }}>Brk Strength</th>
                      <th style={{ width: 90 }}>Runnage</th>
                      <th style={{ width: 80 }}>Warp</th>
                      <th style={{ width: 80 }}>Weft</th>
                      <th style={{ width: 100 }}>Rope Dia (mm)</th>
                      <th style={{ width: 90 }}>Twist</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samples.map((s, idx) => (
                      <tr key={s.sampleNo}>
                        <td className="fw-bold font-monospace bg-light">{s.sampleNo}</td>
                        <td>
                          <input
                            type="number"
                            step="0.1"
                            className="form-control form-control-sm text-center font-monospace fw-semibold p-1"
                            value={s.moisture}
                            onChange={(e) => handleSampleChange(idx, "moisture", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm text-center p-1"
                            value={s.weight}
                            onChange={(e) => handleSampleChange(idx, "weight", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm text-center p-1"
                            value={s.length}
                            onChange={(e) => handleSampleChange(idx, "length", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm text-center p-1"
                            value={s.noOfStrings}
                            onChange={(e) => handleSampleChange(idx, "noOfStrings", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm text-center p-1"
                            value={s.brkStrength}
                            onChange={(e) => handleSampleChange(idx, "brkStrength", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm text-center p-1"
                            value={s.runnage}
                            onChange={(e) => handleSampleChange(idx, "runnage", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm text-center p-1"
                            value={s.warp}
                            onChange={(e) => handleSampleChange(idx, "warp", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm text-center p-1"
                            value={s.weft}
                            onChange={(e) => handleSampleChange(idx, "weft", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm text-center p-1"
                            value={s.ropeDiameter}
                            onChange={(e) => handleSampleChange(idx, "ropeDiameter", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm text-center p-1"
                            value={s.noOfTwist}
                            onChange={(e) => handleSampleChange(idx, "noOfTwist", e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Moisture & Trade Cut Deductions Inputs */}
              <div className="p-3 rounded-2 border bg-light">
                <span className="fw-bold small text-dark d-block mb-2">Plant Moisture & Trade Cut Deductions</span>
                <Row className="g-3">
                  <Col xs={12} sm={4}>
                    <label className="form-label small fw-semibold text-dark mb-1">Moisture Cut %</label>
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        step="0.01"
                        className="form-control font-monospace fw-bold"
                        value={moistureCutPercent}
                        onChange={(e) => setMoistureCutPercent(e.target.value)}
                      />
                      <span className="input-group-text">%</span>
                    </div>
                  </Col>

                  <Col xs={12} sm={4}>
                    <label className="form-label small fw-semibold text-dark mb-1">Trade Cut %</label>
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        step="0.01"
                        className="form-control font-monospace fw-bold"
                        value={tradeCutPercent}
                        onChange={(e) => setTradeCutPercent(e.target.value)}
                      />
                      <span className="input-group-text">%</span>
                    </div>
                  </Col>

                  <Col xs={12} sm={4}>
                    <label className="form-label small fw-semibold text-dark mb-1">Other Weight Deduction (kg)</label>
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        className="form-control font-monospace"
                        value={otherDeductionKg}
                        onChange={(e) => setOtherDeductionKg(e.target.value)}
                      />
                      <span className="input-group-text">Kg</span>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>

            {/* Dry Test & Hackling */}
            <div className="card border shadow-sm rounded-3 bg-white p-3 mb-3">
              <Row className="g-3">
                <Col xs={12} md={6}>
                  <span className="fw-bold small text-dark d-block mb-2">Dry Test (RM 20% Std)</span>
                  <Row className="g-2">
                    <Col xs={4}>
                      <label className="form-label fs-9 text-secondary mb-0">Initial Wt (g)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm font-monospace"
                        value={dryTest.weight}
                        onChange={(e) => setDryTest({ ...dryTest, weight: e.target.value })}
                      />
                    </Col>
                    <Col xs={4}>
                      <label className="form-label fs-9 text-secondary mb-0">Dry Wt (g)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm font-monospace"
                        value={dryTest.weightAfterDry}
                        onChange={(e) => {
                          const wA = Number(e.target.value) || 0;
                          const wI = Number(dryTest.weight) || 100;
                          const loss = wI > 0 ? ((wI - wA) / wI) * 100 : 0;
                          setDryTest({ ...dryTest, weightAfterDry: e.target.value, actualLossMoisture: Number(loss.toFixed(1)) });
                        }}
                      />
                    </Col>
                    <Col xs={4}>
                      <label className="form-label fs-9 text-secondary mb-0">Loss (%)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm font-monospace fw-bold text-primary"
                        value={dryTest.actualLossMoisture}
                        onChange={(e) => setDryTest({ ...dryTest, actualLossMoisture: e.target.value })}
                      />
                    </Col>
                  </Row>
                </Col>

                <Col xs={12} md={6}>
                  <span className="fw-bold small text-dark d-block mb-2">Hackling Test</span>
                  <Row className="g-2">
                    <Col xs={3}>
                      <label className="form-label fs-9 text-secondary mb-0">BO %</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control form-control-sm font-monospace"
                        value={hacklingTest.boPercent}
                        onChange={(e) => setHacklingTest({ ...hacklingTest, boPercent: e.target.value })}
                      />
                    </Col>
                    <Col xs={3}>
                      <label className="form-label fs-9 text-secondary mb-0">SF %</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control form-control-sm font-monospace"
                        value={hacklingTest.sfPercent}
                        onChange={(e) => setHacklingTest({ ...hacklingTest, sfPercent: e.target.value })}
                      />
                    </Col>
                    <Col xs={3}>
                      <label className="form-label fs-9 text-secondary mb-0">Pith %</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control form-control-sm font-monospace"
                        value={hacklingTest.pithPercent}
                        onChange={(e) => setHacklingTest({ ...hacklingTest, pithPercent: e.target.value })}
                      />
                    </Col>
                    <Col xs={3}>
                      <label className="form-label fs-9 text-secondary mb-0">Rating</label>
                      <select
                        className="form-select form-select-sm"
                        value={hacklingTest.qualityComment}
                        onChange={(e) => setHacklingTest({ ...hacklingTest, qualityComment: e.target.value })}
                      >
                        <option value="Good">Good</option>
                        <option value="Average">Average</option>
                        <option value="Poor">Poor</option>
                        <option value="Reject">Reject</option>
                      </select>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </div>

            {/* Action Taken */}
            <div className="card border shadow-sm rounded-3 bg-white p-3">
              <label className="form-label small fw-bold text-dark mb-1">Corrective Action Taken & Quality Sign-Off</label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
              ></textarea>
            </div>
          </Modal.Body>

          <Modal.Footer className="bg-light py-2.5 px-4 border-top d-flex justify-content-between align-items-center">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveReq(null)}>
              Cancel
            </button>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm px-3 fw-semibold d-flex align-items-center gap-1.5 shadow-sm"
                onClick={() => handleSaveQuality(true)}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    <span>Saving Draft...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-save2"></i>
                    <span>Update Draft</span>
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm px-4 fw-semibold d-flex align-items-center gap-1.5 shadow-sm"
                onClick={() => handleSaveQuality(false)}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-check"></i>
                    <span>Submit to Finance Officer</span>
                  </>
                )}
              </button>
            </div>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
