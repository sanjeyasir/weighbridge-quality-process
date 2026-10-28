import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { subscribeToApiTransactions } from "../../services/firebase/weighbridgeApiService";
import { Card, Row, Col, Table } from "react-bootstrap";

export default function Dashboard() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToApiTransactions(
      (data) => {
        setTransactions(data);
        setLoading(false);
      },
      (err) => {
        console.error("Dashboard weighbridge subscription error:", err);
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Summary Metrics from Weighbridge Transactions
  const metrics = useMemo(() => {
    const total = transactions.length;
    const pendingSecond = transactions.filter(t => t.status === "PENDING_SECOND_WEIGHT").length;
    const completed = transactions.filter(t => t.status === "COMPLETED").length;
    const inbound = transactions.filter(t => t.direction === "IN").length;
    const outbound = transactions.filter(t => t.direction === "OUT").length;

    const totalKg = transactions.reduce((acc, t) => acc + (Number(t.final_net_weight_kg || t.net_weight_kg) || 0), 0);
    const totalTonnage = (totalKg / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    // Material summary
    const materialCounts = {};
    transactions.forEach(t => {
      if (t.material_name) {
        materialCounts[t.material_name] = (materialCounts[t.material_name] || 0) + 1;
      }
    });

    const topMaterials = Object.entries(materialCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return { total, pendingSecond, completed, inbound, outbound, totalKg, totalTonnage, topMaterials };
  }, [transactions]);

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="d-flex flex-column gap-3">
      {/* Top Header & Navigation Action */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pb-2 border-bottom">
        <div>
          <h4 className="fw-bold mb-0 text-dark">Dashboard Overview</h4>
          <p className="text-secondary small mb-0">
            Operational summary and net tonnage metrics from weighbridge transactions
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm px-3 fw-semibold d-flex align-items-center gap-2"
          onClick={() => navigate("/api-stream")}
        >
          <i className="bi bi-journal-text"></i>
          <span>View All Transactions</span>
        </button>
      </div>

      {/* KPI Summary Cards from Weighbridge Transactions */}
      <Row className="g-3">
        {/* Total Transactions */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border shadow-sm rounded-3 h-100 bg-white">
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary small fw-bold text-uppercase">Total Transactions</span>
                <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-2">
                  <i className="bi bi-journal-text fs-5"></i>
                </div>
              </div>
              <h3 className="fw-bold mb-1 text-dark">
                {loading ? "..." : metrics.total}
              </h3>
              <div className="text-secondary small">
                Scale transactions logged
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Pending 2nd Weight */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border shadow-sm rounded-3 h-100 bg-white">
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary small fw-bold text-uppercase">Pending 2nd Weight</span>
                <div className="bg-warning bg-opacity-10 text-warning p-2 rounded-2">
                  <i className="bi bi-hourglass-split fs-5"></i>
                </div>
              </div>
              <h3 className="fw-bold mb-1 text-warning">
                {loading ? "..." : metrics.pendingSecond}
              </h3>
              <div className="text-secondary small">
                Waiting 2nd tare/gross scale
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Completed */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border shadow-sm rounded-3 h-100 bg-white">
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary small fw-bold text-uppercase">Completed Weighings</span>
                <div className="bg-success bg-opacity-10 text-success p-2 rounded-2">
                  <i className="bi bi-check2-circle fs-5"></i>
                </div>
              </div>
              <h3 className="fw-bold mb-1 text-success">
                {loading ? "..." : metrics.completed}
              </h3>
              <div className="text-secondary small">
                Dual weights verified
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Total Net Weight */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border shadow-sm rounded-3 h-100 bg-white">
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary small fw-bold text-uppercase">Cumulative Net Cargo</span>
                <div className="bg-info bg-opacity-10 text-info p-2 rounded-2">
                  <i className="bi bi-speedometer2 fs-5"></i>
                </div>
              </div>
              <h3 className="fw-bold mb-1 text-dark">
                {loading ? "..." : `${metrics.totalTonnage}`} <span className="fs-6 fw-normal text-secondary">MT</span>
              </h3>
              <div className="text-secondary small">
                {metrics.totalKg.toLocaleString()} KG Verified
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Operational Direction & Material Insights */}
      <Row className="g-3">
        {/* Direction Breakdown */}
        <Col xs={12} md={6}>
          <Card className="border shadow-sm rounded-3 bg-white h-100">
            <Card.Body className="p-3">
              <h6 className="fw-bold text-dark mb-3">Traffic Direction Breakdown</h6>
              <div className="row g-2 text-center">
                <div className="col-6">
                  <div className="p-3 border rounded-2 bg-light">
                    <span className="badge bg-primary px-2 py-1 mb-2">INBOUND (IN)</span>
                    <h4 className="fw-bold mb-0 text-dark">{metrics.inbound}</h4>
                    <div className="text-secondary small mt-1">Raw Materials Inward</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 border rounded-2 bg-light">
                    <span className="badge bg-secondary px-2 py-1 mb-2">OUTBOUND (OUT)</span>
                    <h4 className="fw-bold mb-0 text-dark">{metrics.outbound}</h4>
                    <div className="text-secondary small mt-1">Dispatches & Outward</div>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Top Commodities Weighed */}
        <Col xs={12} md={6}>
          <Card className="border shadow-sm rounded-3 bg-white h-100">
            <Card.Body className="p-3">
              <h6 className="fw-bold text-dark mb-3">Commodity Volume Summary</h6>
              {metrics.topMaterials.length === 0 ? (
                <div className="text-secondary small py-3 text-center">No commodity data logged.</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {metrics.topMaterials.map(([mat, count]) => (
                    <div key={mat} className="d-flex justify-content-between align-items-center p-2 rounded border bg-light">
                      <span className="fw-semibold text-dark small">{mat}</span>
                      <span className="badge bg-secondary">{count} {count === 1 ? "ticket" : "tickets"}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Weighbridge Transactions Summary Table */}
      <Card className="border shadow-sm rounded-3 bg-white overflow-hidden">
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
          <div className="d-flex align-items-center gap-2">
            <h6 className="fw-bold text-dark mb-0">Latest Weighbridge Scale Records</h6>
            <span className="badge bg-secondary">{transactions.length}</span>
          </div>

          <Link to="/api-stream" className="text-primary small fw-semibold text-decoration-none">
            Open Full Data Grid &rarr;
          </Link>
        </div>

        <div className="table-responsive">
          <Table hover className="align-middle mb-0 text-nowrap" style={{ fontSize: "0.875rem" }}>
            <thead className="table-light text-secondary text-uppercase fs-8 fw-semibold border-bottom">
              <tr>
                <th className="ps-3">Ticket #</th>
                <th>Plant</th>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Supplier / Party</th>
                <th>Material</th>
                <th>Direction</th>
                <th className="text-end">Net Weight</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-secondary">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Loading weighbridge transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-secondary">
                    No weighbridge transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 6).map((tx) => {
                  const netWeight = tx.final_net_weight_kg ?? tx.net_weight_kg;
                  const isCompleted = tx.status === "COMPLETED";
                  return (
                    <tr 
                      key={tx.id || tx.transaction_no} 
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate("/api-stream")}
                    >
                      <td className="ps-3">
                        <span className="font-monospace fw-bold text-primary">
                          {tx.transaction_no}
                        </span>
                      </td>
                      <td>
                        <span className="font-monospace fw-semibold text-dark">
                          {tx.plant_code || "HES-1"}
                        </span>
                      </td>
                      <td>
                        <span className="text-dark small">
                          {formatDate(tx.second_weight_at || tx.first_weight_at || tx.updated_at)}
                        </span>
                      </td>
                      <td>
                        <span className="font-monospace text-dark fw-medium">
                          {tx.vehicle_no || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="fw-medium text-dark text-truncate d-inline-block" style={{ maxWidth: 180 }} title={tx.supplier_name}>
                          {tx.supplier_name || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="text-dark">
                          {tx.material_name || "—"}
                        </span>
                      </td>
                      <td>
                        <span className={tx.direction === "IN" ? "text-primary fw-semibold" : "text-secondary fw-semibold"}>
                          {tx.direction || "—"}
                        </span>
                      </td>
                      <td className="text-end">
                        {netWeight != null ? (
                          <span className="font-monospace fw-bold text-success">
                            {Number(netWeight).toLocaleString()} kg
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td 
                        className="text-center fw-semibold small"
                        style={{
                          backgroundColor: isCompleted ? "#d1e7dd" : "#fff3cd",
                          color: isCompleted ? "#0f5132" : "#664d03"
                        }}
                      >
                        {isCompleted ? "Completed" : "Pending 2nd"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
