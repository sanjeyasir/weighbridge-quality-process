import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function ApiDocs({ isPublic = false }) {
  const [activeTab, setActiveTab] = useState("first_weight");
  const [copiedKey, setCopiedKey] = useState(null);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const endpointUrl = "https://weighbridge-quality-process.web.app/api/weighbridge";
  const cloudRunUrl = "https://weighbridgeapi-401265739015.us-central1.run.app";

  const firstWeightPayload = {
    event_type: "FIRST_WEIGHT",
    transaction_no: "26-00007",
    plant_code: "HES-1",
    plant_name: "Hayleys Eco Solutions Plant 1",
    vehicle_no: "WP-1615",
    supplier_name: "Hayleys DPL",
    material_name: "Coir",
    direction: "IN",
    first_weight_kg: 9000,
    first_weight_at: "2026-10-28T09:15:00+05:30",
    sub_type: "Purchase",
    driver_name: "K. Wickramasinghe",
    remarks: "Weighed at Inbound Scale Platform 1"
  };

  const secondWeightPayload = {
    event_type: "SECOND_WEIGHT",
    transaction_no: "26-00007",
    plant_code: "HES-1",
    plant_name: "Hayleys Eco Solutions Plant 1",
    vehicle_no: "WP-1615",
    supplier_name: "Hayleys DPL",
    material_name: "Coir",
    direction: "IN",
    first_weight_kg: 9000,
    second_weight_kg: 5600,
    net_weight_kg: 3400,
    final_net_weight_kg: 3390,
    first_weight_at: "2026-10-28T09:15:00+05:30",
    second_weight_at: "2026-10-28T10:20:00+05:30",
    sub_type: "Purchase",
    driver_name: "K. Wickramasinghe",
    remarks: "Received at main weighbridge. 10 kg moisture deduction applied."
  };

  const openApiSpec = {
    openapi: "3.0.3",
    info: {
      title: "Weighbridge Automation REST API",
      version: "1.0.0",
      description: "API for automated weighbridge platform data ingestion into Firebase Firestore."
    },
    servers: [
      { url: "https://weighbridge-quality-process.web.app/api", description: "Production Gateway" },
      { url: "https://weighbridgeapi-401265739015.us-central1.run.app", description: "Direct Cloud Function URL" }
    ],
    paths: {
      "/weighbridge": {
        post: {
          summary: "Ingest Weighbridge Scale Reading Event",
          description: "Receives FIRST_WEIGHT (initial gross/tare) or SECOND_WEIGHT (finalized tare/gross) readings with plant identification.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["event_type", "transaction_no", "plant_code", "vehicle_no", "supplier_name", "material_name", "direction", "first_weight_kg", "first_weight_at"],
                  properties: {
                    event_type: { type: "string", enum: ["FIRST_WEIGHT", "SECOND_WEIGHT"], example: "FIRST_WEIGHT" },
                    transaction_no: { type: "string", example: "26-00007" },
                    plant_code: { type: "string", example: "HES-1" },
                    plant_name: { type: "string", example: "Hayleys Eco Solutions Plant 1" },
                    vehicle_no: { type: "string", example: "WP-1615" },
                    supplier_name: { type: "string", example: "Hayleys DPL" },
                    material_name: { type: "string", example: "Coir" },
                    direction: { type: "string", enum: ["IN", "OUT"], example: "IN" },
                    first_weight_kg: { type: "number", example: 9000 },
                    first_weight_at: { type: "string", format: "date-time", example: "2026-10-28T09:15:00+05:30" },
                    second_weight_kg: { type: "number", example: 5600, description: "Required for SECOND_WEIGHT" },
                    net_weight_kg: { type: "number", example: 3400, description: "Required for SECOND_WEIGHT" },
                    final_net_weight_kg: { type: "number", example: 3390, description: "Required for SECOND_WEIGHT" },
                    second_weight_at: { type: "string", format: "date-time", example: "2026-10-28T10:20:00+05:30" },
                    sub_type: { type: "string", example: "Purchase" },
                    driver_name: { type: "string", example: "K. Wickramasinghe" },
                    remarks: { type: "string", example: "Received at main weighbridge" }
                  }
                }
              }
            }
          },
          responses: {
            "200": { description: "Second weight saved and transaction updated." },
            "201": { description: "First weight saved and pending transaction created." },
            "400": { description: "Validation error (missing required fields or invalid types)." }
          }
        }
      }
    }
  };

  const curlFirst = `curl -X POST ${endpointUrl} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(firstWeightPayload, null, 2)}'`;

  const curlSecond = `curl -X POST ${endpointUrl} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(secondWeightPayload, null, 2)}'`;

  return (
    <div className={isPublic ? "min-vh-100 bg-light pb-5" : "container-fluid p-0"}>
      {/* Public Top Navbar if viewing directly without login */}
      {isPublic && (
        <header className="bg-white border-bottom shadow-sm mb-4 py-2 px-3 px-md-4 sticky-top">
          <div className="container-xl p-0 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <div 
                className="d-flex align-items-center justify-content-center text-white rounded-3 shadow-sm flex-shrink-0"
                style={{
                  width: 36,
                  height: 36,
                  background: "linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)",
                  fontSize: "1.1rem"
                }}
              >
                <i className="bi bi-file-earmark-code"></i>
              </div>
              <div>
                <div className="fw-bold text-dark lh-sm" style={{ fontSize: "0.95rem" }}>
                  Weighbridge Operations Hub
                </div>
                <div className="text-primary text-uppercase fw-bold" style={{ fontSize: "0.68rem", letterSpacing: "0.05em" }}>
                  Public REST API Reference
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <Link 
                to="/login" 
                className="btn btn-primary btn-sm px-3 fw-semibold d-flex align-items-center gap-1 shadow-sm"
              >
                <i className="bi bi-box-arrow-in-right"></i>
                <span>Sign In to Workspace</span>
              </Link>
            </div>
          </div>
        </header>
      )}

      <div className={isPublic ? "container-xl px-3 px-md-4" : ""}>
        {/* Top Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb mb-2" style={{ fontSize: "0.85rem" }}>
            {isPublic ? (
              <li className="breadcrumb-item">
                <Link to="/login" className="text-decoration-none text-primary">Workspace</Link>
              </li>
            ) : (
              <>
                <li className="breadcrumb-item">
                  <Link to="/dashboard" className="text-decoration-none text-primary">Dashboard</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link to="/api-stream" className="text-decoration-none text-primary">Weighbridge Transactions</Link>
                </li>
              </>
            )}
            <li className="breadcrumb-item active text-secondary" aria-current="page">
              Swagger API Docs
            </li>
          </ol>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pb-2 border-bottom">
          <div>
            <div className="d-flex align-items-center gap-2">
              <h4 className="fw-bold mb-0 text-dark">Swagger API Documentation</h4>
              <span className="badge bg-primary text-white">OpenAPI 3.0.3</span>
            </div>
            <p className="text-secondary small mb-0">
              Interactive specification and request payloads for weighbridge automated endpoints
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline-primary btn-sm px-3 fw-semibold"
            onClick={() => copyToClipboard(JSON.stringify(openApiSpec, null, 2), "spec")}
          >
            {copiedKey === "spec" ? "Copied OpenAPI Spec!" : "Copy Full OpenAPI JSON"}
          </button>
        </div>
      </nav>

      {/* Endpoint Info Banner */}
      <div className="card border shadow-sm rounded-3 mb-4 bg-white">
        <div className="card-body p-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary px-3 py-2 fw-bold fs-7">POST</span>
              <code className="fs-6 text-dark font-monospace fw-bold">{endpointUrl}</code>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="text-secondary small">Direct Cloud Run URL:</span>
              <code className="small text-muted font-monospace">{cloudRunUrl}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Instance Tabs */}
      <div className="card border shadow-sm rounded-3 bg-white mb-4">
        <div className="card-header bg-light border-bottom p-2">
          <ul className="nav nav-pills gap-2">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link py-2 px-3 fw-semibold border-0 ${
                  activeTab === "first_weight" ? "bg-primary text-white" : "text-secondary"
                }`}
                onClick={() => setActiveTab("first_weight")}
              >
                Instance 1: FIRST_WEIGHT (1st Reading)
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link py-2 px-3 fw-semibold border-0 ${
                  activeTab === "second_weight" ? "bg-primary text-white" : "text-secondary"
                }`}
                onClick={() => setActiveTab("second_weight")}
              >
                Instance 2: SECOND_WEIGHT (2nd Reading)
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link py-2 px-3 fw-semibold border-0 ${
                  activeTab === "lifecycle" ? "bg-primary text-white" : "text-secondary"
                }`}
                onClick={() => setActiveTab("lifecycle")}
              >
                Instance 3: Lifecycle & Status Update
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-4">
          {/* TAB 1: FIRST_WEIGHT */}
          {activeTab === "first_weight" && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <h6 className="fw-bold text-dark mb-1">Instance 1: FIRST_WEIGHT Request Payload</h6>
                  <p className="text-secondary small mb-0">
                    Transmitted when vehicle enters the platform and the initial gross or tare weight is captured.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm px-3 fw-semibold"
                  onClick={() => copyToClipboard(JSON.stringify(firstWeightPayload, null, 2), "first")}
                >
                  {copiedKey === "first" ? "Copied!" : "Copy JSON Payload"}
                </button>
              </div>

              {/* JSON Pre */}
              <pre className="p-3 rounded-2 bg-dark text-light font-monospace small overflow-auto mb-4" style={{ maxHeight: 320 }}>
                {JSON.stringify(firstWeightPayload, null, 2)}
              </pre>

              {/* Field Schema Table */}
              <h6 className="fw-bold text-dark mb-2">Payload Field Specifications</h6>
              <div className="table-responsive mb-4">
                <table className="table table-bordered table-sm mb-0">
                  <thead className="table-light text-secondary text-uppercase fs-8 fw-semibold">
                    <tr>
                      <th>Field</th>
                      <th>Type</th>
                      <th>Requirement</th>
                      <th>Sample Value</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-monospace fw-bold text-primary">event_type</td>
                      <td>String</td>
                      <td><span className="text-danger fw-bold">Required</span></td>
                      <td><code>"FIRST_WEIGHT"</code></td>
                      <td>Must be exact string <code>"FIRST_WEIGHT"</code></td>
                    </tr>
                    <tr>
                      <td className="font-monospace fw-bold text-primary">transaction_no</td>
                      <td>String</td>
                      <td><span className="text-danger fw-bold">Required</span></td>
                      <td><code>"26-00007"</code></td>
                      <td>Unique weighbridge slip or ticket number</td>
                    </tr>
                    <tr>
                      <td className="font-monospace fw-bold text-primary">plant_code</td>
                      <td>String</td>
                      <td><span className="text-danger fw-bold">Required</span></td>
                      <td><code>"HES-1"</code></td>
                      <td>Manufacturing facility identifier (e.g. HES-1, HES-2)</td>
                    </tr>
                    <tr>
                      <td className="font-monospace fw-bold">plant_name</td>
                      <td>String</td>
                      <td>Optional</td>
                      <td><code>"Hayleys Eco Solutions Plant 1"</code></td>
                      <td>Descriptive plant location name</td>
                    </tr>
                    <tr>
                      <td className="font-monospace fw-bold text-primary">vehicle_no</td>
                      <td>String</td>
                      <td><span className="text-danger fw-bold">Required</span></td>
                      <td><code>"WP-1615"</code></td>
                      <td>Vehicle registration number</td>
                    </tr>
                    <tr>
                      <td className="font-monospace fw-bold text-primary">supplier_name</td>
                      <td>String</td>
                      <td><span className="text-danger fw-bold">Required</span></td>
                      <td><code>"Hayleys DPL"</code></td>
                      <td>Supplier / Consignor company name</td>
                    </tr>
                    <tr>
                      <td className="font-monospace fw-bold text-primary">material_name</td>
                      <td>String</td>
                      <td><span className="text-danger fw-bold">Required</span></td>
                      <td><code>"Coir"</code></td>
                      <td>Material or commodity classification</td>
                    </tr>
                    <tr>
                      <td className="font-monospace fw-bold text-primary">direction</td>
                      <td>String</td>
                      <td><span className="text-danger fw-bold">Required</span></td>
                      <td><code>"IN"</code></td>
                      <td>Traffic direction: <code>"IN"</code> (Inbound) or <code>"OUT"</code> (Outbound)</td>
                    </tr>
                    <tr>
                      <td className="font-monospace fw-bold text-primary">first_weight_kg</td>
                      <td>Number</td>
                      <td><span className="text-danger fw-bold">Required</span></td>
                      <td><code>9000</code></td>
                      <td>Non-negative scale weight in kilograms</td>
                    </tr>
                    <tr>
                      <td className="font-monospace fw-bold text-primary">first_weight_at</td>
                      <td>String (ISO 8601)</td>
                      <td><span className="text-danger fw-bold">Required</span></td>
                      <td><code>"2026-10-28T09:15:00+05:30"</code></td>
                      <td>Timestamp when 1st weight scale reading was captured</td>
                    </tr>
                    <tr>
                      <td className="font-monospace">sub_type</td>
                      <td>String</td>
                      <td>Optional</td>
                      <td><code>"Purchase"</code></td>
                      <td>Transaction category (Purchase, Direct Sale, Transfer)</td>
                    </tr>
                    <tr>
                      <td className="font-monospace">driver_name</td>
                      <td>String</td>
                      <td>Optional</td>
                      <td><code>"K. Wickramasinghe"</code></td>
                      <td>Name of vehicle driver</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* cURL Example */}
              <h6 className="fw-bold text-dark mb-2">cURL CLI Request</h6>
              <div className="position-relative">
                <pre className="p-3 rounded-2 bg-light border font-monospace small overflow-auto mb-0 text-dark">
                  {curlFirst}
                </pre>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm position-absolute top-0 end-0 m-2"
                  onClick={() => copyToClipboard(curlFirst, "curlFirst")}
                >
                  {copiedKey === "curlFirst" ? "Copied!" : "Copy cURL"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SECOND_WEIGHT */}
          {activeTab === "second_weight" && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <h6 className="fw-bold text-dark mb-1">Instance 2: SECOND_WEIGHT Request Payload</h6>
                  <p className="text-secondary small mb-0">
                    Transmitted when vehicle returns after discharge/loading to capture the 2nd tare/gross reading.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm px-3 fw-semibold"
                  onClick={() => copyToClipboard(JSON.stringify(secondWeightPayload, null, 2), "second")}
                >
                  {copiedKey === "second" ? "Copied!" : "Copy JSON Payload"}
                </button>
              </div>

              {/* JSON Pre */}
              <pre className="p-3 rounded-2 bg-dark text-light font-monospace small overflow-auto mb-4" style={{ maxHeight: 320 }}>
                {JSON.stringify(secondWeightPayload, null, 2)}
              </pre>

              {/* Field Schema Table */}
              <h6 className="fw-bold text-dark mb-2">Second Weight Additional Field Specifications</h6>
              <div className="table-responsive mb-4">
                <table className="table table-bordered table-sm mb-0">
                  <thead className="table-light text-secondary text-uppercase fs-8 fw-semibold">
                    <tr>
                      <th>Field</th>
                      <th>Type</th>
                      <th>Requirement</th>
                      <th>Sample Value</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-monospace fw-bold text-primary">event_type</td>
                      <td>String</td>
                      <td><span className="text-danger fw-bold">Required</span></td>
                      <td><code>"SECOND_WEIGHT"</code></td>
                      <td>Must be exact string <code>"SECOND_WEIGHT"</code></td>
                    </tr>
                    <tr>
                      <td className="font-monospace fw-bold text-primary">second_weight_kg</td>
                      <td>Number</td>
                      <td><span className="text-danger fw-bold">Required</span></td>
                      <td><code>5600</code></td>
                      <td>Scale reading of the second weight in KG</td>
                    </tr>
                    <tr>
                      <td className="font-monospace fw-bold text-primary">net_weight_kg</td>
                      <td>Number</td>
                      <td><span className="text-danger fw-bold">Required</span></td>
                      <td><code>3400</code></td>
                      <td>Calculated Gross - Tare differential (kg)</td>
                    </tr>
                    <tr>
                      <td className="font-monospace fw-bold text-primary">final_net_weight_kg</td>
                      <td>Number</td>
                      <td><span className="text-danger fw-bold">Required</span></td>
                      <td><code>3390</code></td>
                      <td>Net weight after verified deductions (e.g. moisture/sand)</td>
                    </tr>
                    <tr>
                      <td className="font-monospace fw-bold text-primary">second_weight_at</td>
                      <td>String (ISO 8601)</td>
                      <td><span className="text-danger fw-bold">Required</span></td>
                      <td><code>"2026-10-28T10:20:00+05:30"</code></td>
                      <td>Timestamp when 2nd weight reading was captured</td>
                    </tr>
                    <tr>
                      <td className="font-monospace">remarks</td>
                      <td>String</td>
                      <td>Optional</td>
                      <td><code>"Quality verified. Scale #2."</code></td>
                      <td>Operator scale remarks or deduction rationale</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* cURL Example */}
              <h6 className="fw-bold text-dark mb-2">cURL CLI Request</h6>
              <div className="position-relative">
                <pre className="p-3 rounded-2 bg-light border font-monospace small overflow-auto mb-0 text-dark">
                  {curlSecond}
                </pre>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm position-absolute top-0 end-0 m-2"
                  onClick={() => copyToClipboard(curlSecond, "curlSecond")}
                >
                  {copiedKey === "curlSecond" ? "Copied!" : "Copy cURL"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: LIFECYCLE */}
          {activeTab === "lifecycle" && (
            <div>
              <h6 className="fw-bold text-dark mb-2">Instance 3: Transaction Lifecycle Flow</h6>
              <p className="text-secondary small mb-4">
                The weighbridge process follows a strict 3-stage validation lifecycle:
              </p>

              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="p-3 border rounded-3 bg-light h-100">
                    <span className="badge bg-warning text-dark mb-2">Stage 1</span>
                    <h6 className="fw-bold text-dark">First Reading (FIRST_WEIGHT)</h6>
                    <p className="small text-secondary mb-0">
                      Captured when the truck first enters. Status is set to <code>PENDING_SECOND_WEIGHT</code>. Displays with soft amber background in the Data Grid.
                    </p>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="p-3 border rounded-3 bg-light h-100">
                    <span className="badge bg-info text-dark mb-2">Stage 2</span>
                    <h6 className="fw-bold text-dark">Second Reading (SECOND_WEIGHT)</h6>
                    <p className="small text-secondary mb-0">
                      Captured when the truck returns. Calculates net weight and final net weight. Ready for operator signoff. Displays with soft cyan background.
                    </p>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="p-3 border rounded-3 bg-light h-100">
                    <span className="badge bg-success text-white mb-2">Stage 3</span>
                    <h6 className="fw-bold text-dark">Completion (COMPLETED)</h6>
                    <p className="small text-secondary mb-0">
                      Operator verifies readings and clicks the primary <strong>"Complete"</strong> button in the UI. Status becomes <code>COMPLETED</code> and displays with soft green background.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-light border rounded-3">
                <h6 className="fw-bold text-dark mb-1">Response Codes:</h6>
                <ul className="small text-secondary mb-0 ps-3">
                  <li><strong>201 Created</strong>: Returned upon successful creation of a new first weight record.</li>
                  <li><strong>200 OK</strong>: Returned upon successful update of second weight and net weights.</li>
                  <li><strong>400 Bad Request</strong>: Returned if any required field is missing or data types are invalid.</li>
                  <li><strong>405 Method Not Allowed</strong>: Returned if non-POST methods are submitted.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
