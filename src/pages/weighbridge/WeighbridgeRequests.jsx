import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getWeighbridgeRequests, deleteRequest } from "../../services/firebase/weighbridgeService";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "../../utils/toast";
import { Card, Table, Nav, Badge, Button, Row, Col, Modal } from "react-bootstrap";

export default function WeighbridgeRequests() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState("auto"); // "auto", "card", "table"
  const [deleteModalId, setDeleteModalId] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const list = await getWeighbridgeRequests();
      setRequests(list);
    } catch (err) {
      toast.error("Failed to load requests.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const confirmDelete = async () => {
    if (!deleteModalId) return;
    try {
      await deleteRequest(deleteModalId);
      toast.success("Requisition record deleted.");
      setDeleteModalId(null);
      loadRequests();
    } catch (err) {
      toast.error("Failed to delete request.");
    }
  };

  const getFilteredRequests = () => {
    let filtered = [...requests];

    if (activeTab !== "all") {
      filtered = filtered.filter(r => r.status === activeTab);
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.vehicleNo?.toLowerCase().includes(q) ||
        r.supplier?.toLowerCase().includes(q) ||
        r.commodity?.toLowerCase().includes(q) ||
        String(r.requestNo).includes(q) ||
        r.ticketNo?.toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  const countAll = requests.length;
  const countQuality = requests.filter(r => r.status === "Pending Quality").length;
  const countFinance = requests.filter(r => r.status === "Pending Finance").length;
  const countCompleted = requests.filter(r => r.status === "Completed").length;

  const getStatusBadge = (status) => {
    if (status === "Pending Quality") {
      return (
        <span className="badge px-2 py-1 fs-8 fw-bold" style={{ backgroundColor: "rgba(139, 92, 246, 0.12)", color: "#8b5cf6" }}>
          Pending Quality
        </span>
      );
    }
    let variant = "primary";
    if (status === "Pending Finance") variant = "warning";
    else if (status === "Completed") variant = "success";

    return (
      <span className={`badge bg-${variant} bg-opacity-10 text-${variant} border border-${variant} border-opacity-25 px-2 py-1 fs-8 fw-bold`}>
        {status}
      </span>
    );
  };

  const canCreate = currentUser?.role === "requester" || currentUser?.role === "admin";
  const filteredData = getFilteredRequests();
  const showCards = viewMode === "card" || (viewMode === "auto" && isMobile);

  return (
    <div className="d-flex flex-column gap-4">
      {/* Header Bar */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
        <div>
          <h3 className="fw-bold text-dark mb-1">Weighbridge Quality Records</h3>
          <p className="text-muted small mb-0">
            Track raw material weighing tickets, sample parameters, and payout invoices.
          </p>
        </div>

        {canCreate && (
          <Button 
            variant="primary" 
            className="d-flex align-items-center gap-2 fw-bold px-3 py-2 rounded-3 shadow-sm"
            style={{ backgroundColor: "#0d6efd", borderColor: "#0d6efd" }}
            onClick={() => navigate("/requests/create")}
          >
            <i className="bi bi-plus-lg fs-6"></i>
            <span>New Ticket</span>
          </Button>
        )}
      </div>

      {/* Main Card */}
      <Card className="border-0 shadow-sm rounded-4 bg-white overflow-hidden">
        <Card.Body className="p-3 p-md-4">
          {/* Search & View Mode row */}
          <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
            <div className="input-group" style={{ maxWidth: 440 }}>
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="bi bi-search"></i>
              </span>
              <input 
                type="text" 
                className="form-control bg-light border-start-0 py-2 fs-7" 
                placeholder="Search vehicle reg, supplier, commodity, or ticket #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="btn btn-light border" type="button" onClick={() => setSearchQuery("")}>
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                className={`btn btn-sm ${viewMode === "table" || (viewMode === "auto" && !isMobile) ? "btn-primary" : "btn-light border"}`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <i className="bi bi-list-ul me-1"></i> Table
              </button>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === "card" || (viewMode === "auto" && isMobile) ? "btn-primary" : "btn-light border"}`}
                onClick={() => setViewMode("card")}
                title="Card View"
              >
                <i className="bi bi-grid-3x3-gap me-1"></i> Cards
              </button>
            </div>
          </div>

          {/* Filter Nav Tabs */}
          <Nav variant="pills" className="gap-2 mb-3 border-bottom pb-3">
            <Nav.Item>
              <Nav.Link 
                active={activeTab === "all"} 
                onClick={() => setActiveTab("all")}
                className="py-1 px-3 small fw-semibold cursor-pointer rounded-pill"
              >
                All Records <span className="badge bg-light text-dark ms-1">{countAll}</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                active={activeTab === "Pending Quality"} 
                onClick={() => setActiveTab("Pending Quality")}
                className="py-1 px-3 small fw-semibold cursor-pointer rounded-pill"
              >
                Pending QC <span className="badge bg-light text-dark ms-1">{countQuality}</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                active={activeTab === "Pending Finance"} 
                onClick={() => setActiveTab("Pending Finance")}
                className="py-1 px-3 small fw-semibold cursor-pointer rounded-pill"
              >
                Pending Finance <span className="badge bg-light text-dark ms-1">{countFinance}</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                active={activeTab === "Completed"} 
                onClick={() => setActiveTab("Completed")}
                className="py-1 px-3 small fw-semibold cursor-pointer rounded-pill"
              >
                Completed <span className="badge bg-light text-dark ms-1">{countCompleted}</span>
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {/* Content: Cards vs Table */}
          {showCards ? (
            <Row className="g-3">
              {loading ? (
                <Col xs={12} className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                  Loading weighbridge records...
                </Col>
              ) : filteredData.length === 0 ? (
                <Col xs={12} className="text-center py-5 text-muted">
                  <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                  No matching weighbridge records found.
                </Col>
              ) : (
                filteredData.map(req => (
                  <Col xs={12} sm={6} lg={4} key={req.id}>
                    <div 
                      className="card border h-100 rounded-3 shadow-none hover-shadow"
                      style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                      onClick={() => navigate(`/requests/${req.id}`)}
                    >
                      <div className="card-body p-3 d-flex flex-column justify-content-between">
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-bold text-primary font-monospace">#{req.requestNo}</span>
                            {getStatusBadge(req.status)}
                          </div>

                          <div className="fw-bold text-dark fs-6 d-flex align-items-center gap-2 mb-1">
                            <i className="bi bi-truck text-secondary"></i>
                            <span className="font-monospace">{req.vehicleNo}</span>
                          </div>

                          <div className="text-secondary small fw-semibold mb-1 text-truncate">
                            {req.supplier}
                          </div>

                          <div className="d-flex align-items-center gap-2 mb-3">
                            <span className="badge bg-light text-dark border">{req.commodity}</span>
                            {req.mill && <span className="text-muted fs-8">{req.mill}</span>}
                          </div>
                        </div>

                        <div className="pt-2 border-top d-flex justify-content-between align-items-center">
                          <div>
                            <span className="text-muted fs-8 d-block">Net Weight</span>
                            <span className="fw-bold text-success font-monospace">
                              {req.netWeight ? `${Number(req.netWeight).toLocaleString()} kg` : "-"}
                            </span>
                          </div>

                          <Button 
                            variant="light" 
                            size="sm" 
                            className="text-primary px-2 py-1 shadow-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/requests/${req.id}`);
                            }}
                          >
                            Details <i className="bi bi-chevron-right fs-8"></i>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Col>
                ))
              )}
            </Row>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0 text-nowrap" style={{ fontSize: "0.875rem" }}>
                <thead className="table-light text-muted text-uppercase fs-8 fw-bold">
                  <tr>
                    <th className="ps-3">Request No</th>
                    <th>Vehicle Reg</th>
                    <th>Supplier & Mill</th>
                    <th>Commodity</th>
                    <th>Net Weight</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-end pe-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted">
                        <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                        Loading weighbridge records...
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted">
                        <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                        No matching weighbridge records found.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map(req => (
                      <tr key={req.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/requests/${req.id}`)}>
                        <td className="ps-3">
                          <Link to={`/requests/${req.id}`} className="fw-bold text-primary font-monospace text-decoration-none" onClick={(e) => e.stopPropagation()}>
                            #{req.requestNo}
                          </Link>
                        </td>
                        <td>
                          <span className="fw-bold text-dark font-monospace d-flex align-items-center gap-1">
                            <i className="bi bi-truck text-muted"></i>
                            {req.vehicleNo}
                          </span>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: 180 }}>
                            {req.supplier}
                          </div>
                          {req.mill && <div className="text-muted fs-8">{req.mill}</div>}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">{req.commodity}</span>
                        </td>
                        <td>
                          <span className="fw-bold text-success font-monospace">
                            {req.netWeight ? `${Number(req.netWeight).toLocaleString()} kg` : "-"}
                          </span>
                        </td>
                        <td>{getStatusBadge(req.status)}</td>
                        <td className="text-muted small">
                          {req.date || (req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "-")}
                        </td>
                        <td className="text-end pe-3">
                          <div className="d-flex align-items-center justify-content-end gap-1">
                            <Button 
                              variant="light" 
                              size="sm" 
                              className="text-primary px-2 py-1 shadow-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/requests/${req.id}`);
                              }}
                              title="View Requisition"
                            >
                              <i className="bi bi-eye"></i>
                            </Button>
                            {currentUser?.role === "admin" && (
                              <Button 
                                variant="light" 
                                size="sm" 
                                className="text-danger px-2 py-1 shadow-none"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteModalId(req.id);
                                }}
                                title="Delete Requisition"
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal show={Boolean(deleteModalId)} onHide={() => setDeleteModalId(null)} centered size="sm">
        <Modal.Header closeButton className="border-bottom py-2">
          <Modal.Title className="fw-bold fs-6">Delete Requisition</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-3">
          <p className="text-muted small mb-0">
            Are you sure you want to permanently delete this requisition record? This action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer className="border-top py-2">
          <Button variant="light" size="sm" onClick={() => setDeleteModalId(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={confirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
