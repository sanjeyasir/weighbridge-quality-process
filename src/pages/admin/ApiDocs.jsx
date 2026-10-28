import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function ApiDocs({ isPublic = false }) {
  const [activeTab, setActiveTab] = useState("first_weight");
  const [copiedKey, setCopiedKey] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const endpointUrl = "https://weighbridge-quality-process.web.app/api/weighbridge";
  const defaultAuthUser = "hayleyseco";
  const defaultAuthPass = "hayleyseco123";
  const basicAuthHeader = "Basic aGF5bGV5c2VjbzpoYXlsZXlzZWNvMTIz";

  const firstWeightPayload = {
    event_type: "FIRST_WEIGHT",
    transaction_no: "26-00007",
    plant_code: "HES-1",
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
      { url: "https://weighbridge-quality-process.web.app/api", description: "Production Gateway" }
    ],
    components: {
      securitySchemes: {
        basicAuth: {
          type: "http",
          scheme: "basic",
          description: "HTTP Basic Authentication: Username 'hayleyseco', Password 'hayleyseco123'"
        }
      }
    },
    security: [
      { basicAuth: [] }
    ],
    paths: {
      "/weighbridge": {
        post: {
          summary: "Ingest Weighbridge Scale Reading Event",
          description: "Receives FIRST_WEIGHT (initial gross/tare) or SECOND_WEIGHT (finalized tare/gross) readings with plant identification.",
          security: [{ basicAuth: [] }],
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
            "200": { description: "Second weight saved and transaction completed." },
            "201": { description: "First weight saved and pending transaction created." },
            "400": { description: "Validation error, duplicate FIRST_WEIGHT transaction, or transaction already COMPLETED." },
            "401": { 
              description: "Unauthorized credentials failure. Returns {\"success\": false, \"error\": \"invalid response\"}" 
            },
            "404": { description: "Transaction not found (SECOND_WEIGHT entry without an existing FIRST_WEIGHT)." }
          }
        }
      }
    }
  };

  // Windows CMD Single-Line cURL command (Basic Auth)
  const curlFirstCmd = `curl -u ${defaultAuthUser}:${defaultAuthPass} -X POST ${endpointUrl} -H "Content-Type: application/json" -d "{\\"event_type\\":\\"FIRST_WEIGHT\\",\\"transaction_no\\":\\"26-00007\\",\\"plant_code\\":\\"HES-1\\",\\"vehicle_no\\":\\"WP-1615\\",\\"supplier_name\\":\\"Hayleys DPL\\",\\"material_name\\":\\"Coir\\",\\"direction\\":\\"IN\\",\\"first_weight_kg\\":9000,\\"first_weight_at\\":\\"2026-10-28T09:15:00+05:30\\",\\"sub_type\\":\\"Purchase\\",\\"driver_name\\":\\"K. Wickramasinghe\\",\\"remarks\\":\\"Weighed at Scale 1\\"}"`;

  // Bash / Linux / macOS cURL command (Basic Auth)
  const curlFirst = `curl -u ${defaultAuthUser}:${defaultAuthPass} -X POST ${endpointUrl} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(firstWeightPayload, null, 2)}'`;

  // Second Weight Windows CMD (Basic Auth)
  const curlSecondCmd = `curl -u ${defaultAuthUser}:${defaultAuthPass} -X POST ${endpointUrl} -H "Content-Type: application/json" -d "{\\"event_type\\":\\"SECOND_WEIGHT\\",\\"transaction_no\\":\\"26-00007\\",\\"plant_code\\":\\"HES-1\\",\\"vehicle_no\\":\\"WP-1615\\",\\"supplier_name\\":\\"Hayleys DPL\\",\\"material_name\\":\\"Coir\\",\\"direction\\":\\"IN\\",\\"first_weight_kg\\":9000,\\"second_weight_kg\\":5600,\\"net_weight_kg\\":3400,\\"final_net_weight_kg\\":3390,\\"first_weight_at\\":\\"2026-10-28T09:15:00+05:30\\",\\"second_weight_at\\":\\"2026-10-28T10:20:00+05:30\\",\\"sub_type\\":\\"Purchase\\",\\"driver_name\\":\\"K. Wickramasinghe\\",\\"remarks\\":\\"Tare weight verified. 10 kg deduction.\\"}"`;

  // Second Weight Bash (Basic Auth)
  const curlSecond = `curl -u ${defaultAuthUser}:${defaultAuthPass} -X POST ${endpointUrl} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(secondWeightPayload, null, 2)}'`;

  return (
    <div className={isPublic ? "min-vh-100 bg-light pb-5" : "container-fluid p-0"} style={{ fontSize: "1rem" }}>
      {/* Public Top Navbar if viewing directly without login */}
      {isPublic && (
        <header className="bg-white border-bottom shadow-sm mb-4 py-3 px-3 px-md-4 sticky-top">
          <div className="container-xl p-0 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <div 
                className="d-flex align-items-center justify-content-center text-white rounded-3 shadow-sm flex-shrink-0"
                style={{
                  width: 42,
                  height: 42,
                  background: "linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)",
                  fontSize: "1.25rem"
                }}
              >
                <i className="bi bi-file-earmark-code"></i>
              </div>
              <div>
                <div className="fw-bold text-dark lh-sm" style={{ fontSize: "1.1rem" }}>
                  Weighbridge Operations Hub
                </div>
                <div className="text-primary text-uppercase fw-bold" style={{ fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                  Public REST API Reference
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className={isPublic ? "container-xl px-3 px-md-4" : ""}>
        {/* Top Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb mb-2" style={{ fontSize: "0.95rem" }}>
            {isPublic ? (
              <li className="breadcrumb-item">
                <span className="text-muted">Documentation</span>
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

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pb-3 border-bottom">
          <div>
            <div className="d-flex align-items-center gap-2">
              <h3 className="fw-bold mb-0 text-dark">Swagger API Documentation</h3>
              <span className="badge bg-primary text-white" style={{ fontSize: "0.85rem" }}>OpenAPI 3.0.3</span>
            </div>
            <p className="text-secondary mb-0 mt-1" style={{ fontSize: "1rem" }}>
              Interactive specification and request payloads for weighbridge automated endpoints
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline-primary px-3 py-2 fw-semibold"
            style={{ fontSize: "0.95rem" }}
            onClick={() => copyToClipboard(JSON.stringify(openApiSpec, null, 2), "spec")}
          >
            {copiedKey === "spec" ? "Copied OpenAPI Spec!" : "Copy Full OpenAPI JSON"}
          </button>
        </div>
      </nav>

      {/* Endpoint Info Banner */}
      <div className="card border shadow-sm rounded-3 mb-4 bg-white">
        <div className="card-body p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <span className="badge bg-primary px-3 py-2 fw-bold" style={{ fontSize: "1rem" }}>POST</span>
            <code className="text-dark font-monospace fw-bold" style={{ fontSize: "1.15rem" }}>{endpointUrl}</code>
          </div>
          <button
            type="button"
            className="btn btn-outline-primary px-3 py-2 fw-semibold"
            style={{ fontSize: "0.95rem" }}
            onClick={() => copyToClipboard(endpointUrl, "endpointUrl")}
          >
            {copiedKey === "endpointUrl" ? "Copied Endpoint URL!" : "Copy Endpoint URL"}
          </button>
        </div>
      </div>

      {/* Endpoint Authentication Banner */}
      <div className="card border shadow-sm rounded-3 mb-4 bg-white">
        <div className="card-header bg-light border-bottom py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-shield-lock-fill text-primary" style={{ fontSize: "1.25rem" }}></i>
            <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: "1.1rem" }}>
              Endpoint Authentication
            </h5>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1" style={{ fontSize: "0.8rem" }}>
              HTTP Basic Authentication Only
            </span>
          </div>
          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-semibold">
            Authentication Required
          </span>
        </div>
        <div className="card-body p-4">
          <p className="text-secondary mb-3" style={{ fontSize: "0.95rem" }}>
            This endpoint strictly requires <strong>HTTP Basic Authentication</strong>. Unauthenticated requests return <code>&#123;"success": false, "error": "invalid response"&#125;</code>.
          </p>

          <div className="row g-3">
            {/* Username */}
            <div className="col-md-4">
              <div className="p-3 border rounded-3 bg-light h-100">
                <div className="text-muted small fw-semibold text-uppercase mb-1" style={{ letterSpacing: "0.04em" }}>
                  Default Username
                </div>
                <div className="d-flex align-items-center justify-content-between gap-2 mt-2">
                  <code className="text-primary font-monospace fw-bold" style={{ fontSize: "1.05rem" }}>{defaultAuthUser}</code>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm py-1 px-2"
                    title="Copy Username"
                    onClick={() => copyToClipboard(defaultAuthUser, "authUser")}
                  >
                    <i className="bi bi-clipboard me-1"></i>
                    {copiedKey === "authUser" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="col-md-4">
              <div className="p-3 border rounded-3 bg-light h-100">
                <div className="text-muted small fw-semibold text-uppercase mb-1" style={{ letterSpacing: "0.04em" }}>
                  Default Password
                </div>
                <div className="d-flex align-items-center justify-content-between gap-2 mt-2">
                  <code className="text-danger font-monospace fw-bold" style={{ fontSize: "1.05rem" }}>
                    {showPassword ? defaultAuthPass : "•••••••••••••"}
                  </code>
                  <div className="d-flex align-items-center gap-1">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm py-1 px-2"
                      title={showPassword ? "Hide Password" : "Show Password"}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <i className={`bi bi-eye${showPassword ? "-slash" : ""}`}></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm py-1 px-2"
                      title="Copy Password"
                      onClick={() => copyToClipboard(defaultAuthPass, "authPass")}
                    >
                      <i className="bi bi-clipboard me-1"></i>
                      {copiedKey === "authPass" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* HTTP Basic Auth Header */}
            <div className="col-md-4">
              <div className="p-3 border rounded-3 bg-light h-100">
                <div className="text-muted small fw-semibold text-uppercase mb-1" style={{ letterSpacing: "0.04em" }}>
                  Authorization Header
                </div>
                <div className="d-flex align-items-center justify-content-between gap-2 mt-2">
                  <code className="text-dark font-monospace small text-truncate" title={basicAuthHeader}>
                    {basicAuthHeader}
                  </code>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm py-1 px-2 flex-shrink-0"
                    title="Copy Full Basic Authorization Header"
                    onClick={() => copyToClipboard(basicAuthHeader, "authHeader")}
                  >
                    <i className="bi bi-clipboard me-1"></i>
                    {copiedKey === "authHeader" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-white border rounded-2">
            <div className="fw-semibold text-dark small mb-1">
              <i className="bi bi-info-circle text-primary me-2"></i>
              HTTP Basic Authentication Usage:
            </div>
            <ul className="text-secondary small mb-0 ps-3" style={{ lineHeight: "1.7" }}>
              <li><strong>cURL Command</strong>: Pass credentials with flag <code>-u hayleyseco:hayleyseco123</code></li>
              <li><strong>Direct HTTP Header</strong>: Send <code>Authorization: Basic aGF5bGV5c2VjbzpoYXlsZXlzZWNvMTIz</code></li>
            </ul>
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
                className={`nav-link py-2 px-3 fw-bold border-0 ${
                  activeTab === "first_weight" ? "bg-primary text-white" : "text-secondary"
                }`}
                style={{ fontSize: "1rem" }}
                onClick={() => setActiveTab("first_weight")}
              >
                Instance 1: FIRST_WEIGHT (1st Reading)
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link py-2 px-3 fw-bold border-0 ${
                  activeTab === "second_weight" ? "bg-primary text-white" : "text-secondary"
                }`}
                style={{ fontSize: "1rem" }}
                onClick={() => setActiveTab("second_weight")}
              >
                Instance 2: SECOND_WEIGHT (2nd Reading)
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link py-2 px-3 fw-bold border-0 ${
                  activeTab === "lifecycle" ? "bg-primary text-white" : "text-secondary"
                }`}
                style={{ fontSize: "1rem" }}
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
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold text-dark mb-1" style={{ fontSize: "1.2rem" }}>
                    Instance 1: FIRST_WEIGHT Request Payload
                  </h5>
                  <p className="text-secondary mb-0" style={{ fontSize: "1rem" }}>
                    Transmitted when vehicle enters the platform and the initial gross or tare weight is captured.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary px-3 py-2 fw-semibold"
                  style={{ fontSize: "0.95rem" }}
                  onClick={() => copyToClipboard(JSON.stringify(firstWeightPayload, null, 2), "first")}
                >
                  {copiedKey === "first" ? "Copied!" : "Copy JSON Payload"}
                </button>
              </div>

              {/* JSON Pre */}
              <pre className="p-3 rounded-3 bg-dark text-light font-monospace overflow-auto mb-4" style={{ fontSize: "0.95rem", lineHeight: "1.55", maxHeight: 360 }}>
                {JSON.stringify(firstWeightPayload, null, 2)}
              </pre>

              {/* Field Schema Table */}
              <h5 className="fw-bold text-dark mb-2" style={{ fontSize: "1.15rem" }}>
                Payload Field Specifications
              </h5>
              <div className="table-responsive mb-4">
                <table className="table table-bordered mb-0" style={{ fontSize: "0.95rem" }}>
                  <thead className="table-light text-secondary text-uppercase fw-bold" style={{ fontSize: "0.88rem", letterSpacing: "0.04em" }}>
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
                      <td>Unique weighbridge slip or ticket number (must be unique)</td>
                    </tr>
                    <tr>
                      <td className="font-monospace fw-bold text-primary">plant_code</td>
                      <td>String</td>
                      <td><span className="text-danger fw-bold">Required</span></td>
                      <td><code>"HES-1"</code></td>
                      <td>Manufacturing facility identifier validated against Plant Master (e.g. HES-1)</td>
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

              {/* cURL Examples */}
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h5 className="fw-bold text-dark mb-0" style={{ fontSize: "1.1rem" }}>
                    Windows Command Prompt (CMD) - Single Line
                  </h5>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm py-1 px-3 fw-semibold"
                    style={{ fontSize: "0.9rem" }}
                    onClick={() => copyToClipboard(curlFirstCmd, "curlFirstCmd")}
                  >
                    {copiedKey === "curlFirstCmd" ? "Copied CMD Command!" : "Copy Single-Line CMD"}
                  </button>
                </div>
                <div className="p-3 rounded-2 bg-dark text-light font-monospace overflow-auto text-break" style={{ fontSize: "0.95rem", lineHeight: "1.55" }}>
                  <code>{curlFirstCmd}</code>
                </div>
              </div>

              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h5 className="fw-bold text-dark mb-0" style={{ fontSize: "1.1rem" }}>
                    Bash / Linux / macOS cURL
                  </h5>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm py-1 px-3"
                    style={{ fontSize: "0.9rem" }}
                    onClick={() => copyToClipboard(curlFirst, "curlFirst")}
                  >
                    {copiedKey === "curlFirst" ? "Copied!" : "Copy Bash cURL"}
                  </button>
                </div>
                <pre className="p-3 rounded-2 bg-light border font-monospace overflow-auto mb-0 text-dark" style={{ fontSize: "0.95rem", lineHeight: "1.55" }}>
                  {curlFirst}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: SECOND_WEIGHT */}
          {activeTab === "second_weight" && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold text-dark mb-1" style={{ fontSize: "1.2rem" }}>
                    Instance 2: SECOND_WEIGHT Request Payload
                  </h5>
                  <p className="text-secondary mb-0" style={{ fontSize: "1rem" }}>
                    Transmitted when vehicle returns after discharge/loading to capture the 2nd tare/gross reading.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary px-3 py-2 fw-semibold"
                  style={{ fontSize: "0.95rem" }}
                  onClick={() => copyToClipboard(JSON.stringify(secondWeightPayload, null, 2), "second")}
                >
                  {copiedKey === "second" ? "Copied!" : "Copy JSON Payload"}
                </button>
              </div>

              {/* JSON Pre */}
              <pre className="p-3 rounded-3 bg-dark text-light font-monospace overflow-auto mb-4" style={{ fontSize: "0.95rem", lineHeight: "1.55", maxHeight: 360 }}>
                {JSON.stringify(secondWeightPayload, null, 2)}
              </pre>

              {/* Field Schema Table */}
              <h5 className="fw-bold text-dark mb-2" style={{ fontSize: "1.15rem" }}>
                Second Weight Additional Field Specifications
              </h5>
              <div className="table-responsive mb-4">
                <table className="table table-bordered mb-0" style={{ fontSize: "0.95rem" }}>
                  <thead className="table-light text-secondary text-uppercase fw-bold" style={{ fontSize: "0.88rem", letterSpacing: "0.04em" }}>
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

              {/* cURL Examples */}
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h5 className="fw-bold text-dark mb-0" style={{ fontSize: "1.1rem" }}>
                    Windows Command Prompt (CMD) - Single Line
                  </h5>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm py-1 px-3 fw-semibold"
                    style={{ fontSize: "0.9rem" }}
                    onClick={() => copyToClipboard(curlSecondCmd, "curlSecondCmd")}
                  >
                    {copiedKey === "curlSecondCmd" ? "Copied CMD Command!" : "Copy Single-Line CMD"}
                  </button>
                </div>
                <div className="p-3 rounded-2 bg-dark text-light font-monospace overflow-auto text-break" style={{ fontSize: "0.95rem", lineHeight: "1.55" }}>
                  <code>{curlSecondCmd}</code>
                </div>
              </div>

              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h5 className="fw-bold text-dark mb-0" style={{ fontSize: "1.1rem" }}>
                    Bash / Linux / macOS cURL
                  </h5>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm py-1 px-3"
                    style={{ fontSize: "0.9rem" }}
                    onClick={() => copyToClipboard(curlSecond, "curlSecond")}
                  >
                    {copiedKey === "curlSecond" ? "Copied!" : "Copy Bash cURL"}
                  </button>
                </div>
                <pre className="p-3 rounded-2 bg-light border font-monospace overflow-auto mb-0 text-dark" style={{ fontSize: "0.95rem", lineHeight: "1.55" }}>
                  {curlSecond}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: LIFECYCLE */}
          {activeTab === "lifecycle" && (
            <div>
              <h5 className="fw-bold text-dark mb-2" style={{ fontSize: "1.2rem" }}>
                Instance 3: Transaction Lifecycle Flow
              </h5>
              <p className="text-secondary mb-4" style={{ fontSize: "1rem" }}>
                The weighbridge process follows a strict 3-stage validation lifecycle:
              </p>

              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="p-3 border rounded-3 bg-light h-100">
                    <span className="badge bg-warning text-dark mb-2" style={{ fontSize: "0.85rem" }}>Stage 1</span>
                    <h6 className="fw-bold text-dark" style={{ fontSize: "1.05rem" }}>First Reading (FIRST_WEIGHT)</h6>
                    <p className="text-secondary mb-0" style={{ fontSize: "0.95rem" }}>
                      Captured when the truck first enters. Validated against Plant Master. Status is set to <code>PENDING_SECOND_WEIGHT</code>. Displays with soft amber background in the Data Grid.
                    </p>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="p-3 border rounded-3 bg-light h-100">
                    <span className="badge bg-info text-dark mb-2" style={{ fontSize: "0.85rem" }}>Stage 2</span>
                    <h6 className="fw-bold text-dark" style={{ fontSize: "1.05rem" }}>Second Reading (SECOND_WEIGHT)</h6>
                    <p className="text-secondary mb-0" style={{ fontSize: "0.95rem" }}>
                      Captured when the truck returns. Requires an existing <code>FIRST_WEIGHT</code> transaction. Calculates net weight and final net weight.
                    </p>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="p-3 border rounded-3 bg-light h-100">
                    <span className="badge bg-success text-white mb-2" style={{ fontSize: "0.85rem" }}>Stage 3</span>
                    <h6 className="fw-bold text-dark" style={{ fontSize: "1.05rem" }}>Completion (COMPLETED)</h6>
                    <p className="text-secondary mb-0" style={{ fontSize: "0.95rem" }}>
                      Automatically updated upon capturing the second weight. Status becomes <code>COMPLETED</code> and displays with soft green background in the Data Grid. Further modifications are locked.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-light border rounded-3">
                <h5 className="fw-bold text-dark mb-2" style={{ fontSize: "1.1rem" }}>Response Codes & Validations:</h5>
                <ul className="text-secondary mb-0 ps-3" style={{ fontSize: "0.95rem", lineHeight: "1.8" }}>
                  <li><strong>201 Created</strong>: Returned upon successful creation of a new first weight record.</li>
                  <li><strong>200 OK</strong>: Returned upon successful update of second weight and transition to COMPLETED.</li>
                  <li><strong>400 Bad Request</strong>: Returned if required fields are missing, invalid plant_code, duplicate FIRST_WEIGHT, or transaction already COMPLETED.</li>
                  <li><strong>401 Unauthorized</strong>: Returned if authentication credentials are missing or invalid (Failure Response: <code>&#123;"success": false, "error": "invalid response"&#125;</code>).</li>
                  <li><strong>404 Not Found</strong>: Returned if SECOND_WEIGHT is submitted for a non-existent transaction.</li>
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
