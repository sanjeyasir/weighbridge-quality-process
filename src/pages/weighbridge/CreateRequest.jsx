import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { createWeighbridgeRequest } from "../../services/firebase/weighbridgeService";
import { toast } from "../../utils/toast";
import { Card, Form, Row, Col, Button, Alert, Spinner } from "react-bootstrap";

export default function CreateRequest() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [scanning, setScanning] = useState(false);

  // Form State
  const [ticketNo, setTicketNo] = useState("");
  const [commodity, setCommodity] = useState("");
  const [supplier, setSupplier] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-GB").replace(/\//g, "-"));
  const [time1, setTime1] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [time2, setTime2] = useState("");
  const [firstWeight, setFirstWeight] = useState("");
  const [secondWeight, setSecondWeight] = useState("");
  const [error, setError] = useState("");

  const calculatedNet = Math.max(0, (Number(firstWeight) || 0) - (Number(secondWeight) || 0));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a JPG, PNG, or WEBP image file!");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file must be under 5MB!");
      return;
    }

    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));

    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      toast.info("Ticket photo attached. Please verify or complete the form details.");
    }, 1000);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImageUrl(null);
    setScanning(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticketNo || !commodity || !supplier || !vehicleNo || !firstWeight || !secondWeight) {
      setError("Please complete all required fields including ticket number, supplier, vehicle reg, and weights.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const requestData = {
        ticketNo,
        commodity,
        supplier,
        vehicleNo,
        date,
        time1,
        time2,
        firstWeight: Number(firstWeight),
        secondWeight: Number(secondWeight),
        netWeight: calculatedNet
      };

      await createWeighbridgeRequest(requestData, imageFile, currentUser);
      toast.success("Weighbridge requisition submitted successfully!");
      navigate("/requests");
    } catch (err) {
      setError(err.message || "Failed to create requisition.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      {/* Top Header */}
      <div>
        <Link to="/requests" className="text-secondary small fw-bold text-decoration-none d-inline-flex align-items-center gap-1 mb-2">
          <i className="bi bi-arrow-left"></i> Back to Records
        </Link>
        <h3 className="fw-bold text-dark mb-1">New Weighbridge Requisition</h3>
        <p className="text-muted small mb-0">
          Attach the weighbridge ticket photograph and enter the tare, gross weight, and vehicle parameters.
        </p>
      </div>

      {error && (
        <Alert variant="danger" className="py-2 px-3 small rounded-3 mb-0">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Row className="g-4">
          {/* Left Column: Ticket Photo Upload */}
          <Col xs={12} lg={5}>
            <Card className="border-0 shadow-sm rounded-4 h-100 bg-white">
              <Card.Header className="bg-white border-bottom py-3">
                <span className="fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-camera text-success fs-5"></i> Ticket Photograph
                </span>
              </Card.Header>

              <Card.Body className="p-3 p-md-4 d-flex flex-column gap-3">
                {!imageUrl ? (
                  <div 
                    className="border border-2 border-dashed rounded-3 p-4 text-center bg-light cursor-pointer"
                    style={{ cursor: "pointer" }}
                    onClick={() => document.getElementById("ticketFileInput")?.click()}
                  >
                    <i className="bi bi-cloud-arrow-up text-success fs-1 d-block mb-2"></i>
                    <div className="fw-bold text-dark small mb-1">Click to Upload or Snap Ticket Photo</div>
                    <div className="text-muted fs-8">Supports JPG, PNG, WEBP. Max size 5MB.</div>
                    <input 
                      id="ticketFileInput" 
                      type="file" 
                      accept="image/*" 
                      className="d-none" 
                      onChange={handleFileChange}
                    />
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    <div className="position-relative overflow-hidden rounded-3 border bg-dark text-center" style={{ minHeight: 220 }}>
                      <img 
                        src={imageUrl} 
                        alt="Ticket Photograph" 
                        className="img-fluid" 
                        style={{ maxHeight: 320, objectFit: "contain", opacity: scanning ? 0.7 : 1 }}
                      />
                      {scanning && (
                        <div className="position-absolute top-0 bottom-0 start-0 end-0 d-flex flex-column align-items-center justify-content-center bg-dark bg-opacity-50 text-white">
                          <Spinner animation="border" variant="success" className="mb-2" />
                          <span className="small fw-bold">Inspecting Document...</span>
                        </div>
                      )}
                    </div>

                    <div className="d-flex justify-content-between align-items-center pt-2">
                      <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1">
                        <i className="bi bi-check-circle me-1"></i> Photo Attached
                      </span>
                      <Button 
                        variant="link" 
                        className="text-danger p-0 small text-decoration-none fw-semibold"
                        onClick={handleRemoveImage}
                      >
                        <i className="bi bi-trash me-1"></i> Remove
                      </Button>
                    </div>
                  </div>
                )}

                <div className="alert alert-info py-2 px-3 small rounded-3 mb-0" role="alert">
                  <i className="bi bi-info-circle me-2"></i>
                  Please verify that the ticket number, vehicle registration, and weights match the physical scale readout.
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column: Parameters Form */}
          <Col xs={12} lg={7}>
            <Card className="border-0 shadow-sm rounded-4 bg-white">
              <Card.Header className="bg-white border-bottom py-3">
                <span className="fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-clipboard2-check text-primary fs-5"></i> Ticket Parameters & Verification
                </span>
              </Card.Header>

              <Card.Body className="p-3 p-md-4">
                <Row className="g-3 mb-3">
                  <Col xs={12} sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Ticket Number *</Form.Label>
                      <Form.Control 
                        type="text" 
                        placeholder="e.g. 32079" 
                        value={ticketNo} 
                        onChange={(e) => setTicketNo(e.target.value)} 
                        required 
                        className="py-2 fs-7"
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12} sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Commodity (Item Type) *</Form.Label>
                      <Form.Control 
                        type="text" 
                        placeholder="e.g. 10C-HC" 
                        value={commodity} 
                        onChange={(e) => setCommodity(e.target.value)} 
                        required 
                        className="py-2 fs-7"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3 mb-3">
                  <Col xs={12} sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Supplier / Mill Owner *</Form.Label>
                      <Form.Control 
                        type="text" 
                        placeholder="e.g. H K MANAKA" 
                        value={supplier} 
                        onChange={(e) => setSupplier(e.target.value)} 
                        required 
                        className="py-2 fs-7"
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12} sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Vehicle Registration No *</Form.Label>
                      <Form.Control 
                        type="text" 
                        placeholder="e.g. 40-7036" 
                        value={vehicleNo} 
                        onChange={(e) => setVehicleNo(e.target.value)} 
                        required 
                        className="py-2 fs-7"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3 mb-4">
                  <Col xs={12} sm={4}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Weighing Date *</Form.Label>
                      <Form.Control 
                        type="text" 
                        placeholder="DD-MM-YYYY" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                        required 
                        className="py-2 fs-7"
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={6} sm={4}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">1st Weigh Time</Form.Label>
                      <Form.Control 
                        type="text" 
                        placeholder="10:24:26" 
                        value={time1} 
                        onChange={(e) => setTime1(e.target.value)} 
                        className="py-2 fs-7"
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={6} sm={4}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">2nd Weigh Time</Form.Label>
                      <Form.Control 
                        type="text" 
                        placeholder="11:13:50" 
                        value={time2} 
                        onChange={(e) => setTime2(e.target.value)} 
                        className="py-2 fs-7"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Weight Calculation Card */}
                <div className="p-3 bg-light rounded-3 border mb-4">
                  <div className="d-flex align-items-center gap-2 fw-bold text-dark small mb-3">
                    <i className="bi bi-calculator text-success"></i> Weight Measurements & Auto-Calculation
                  </div>

                  <Row className="g-3">
                    <Col xs={12} sm={4}>
                      <Form.Group>
                        <Form.Label className="fs-8 fw-bold text-secondary">1st Weight (Gross) *</Form.Label>
                        <div className="input-group">
                          <Form.Control 
                            type="number" 
                            placeholder="e.g. 2840" 
                            value={firstWeight} 
                            onChange={(e) => setFirstWeight(e.target.value)} 
                            required 
                            min="0"
                            className="fs-7"
                          />
                          <span className="input-group-text bg-white small text-muted">kg</span>
                        </div>
                      </Form.Group>
                    </Col>

                    <Col xs={12} sm={4}>
                      <Form.Group>
                        <Form.Label className="fs-8 fw-bold text-secondary">2nd Weight (Tare) *</Form.Label>
                        <div className="input-group">
                          <Form.Control 
                            type="number" 
                            placeholder="e.g. 2280" 
                            value={secondWeight} 
                            onChange={(e) => setSecondWeight(e.target.value)} 
                            required 
                            min="0"
                            className="fs-7"
                          />
                          <span className="input-group-text bg-white small text-muted">kg</span>
                        </div>
                      </Form.Group>
                    </Col>

                    <Col xs={12} sm={4}>
                      <Form.Group>
                        <Form.Label className="fs-8 fw-bold text-success">Net Weight (Auto)</Form.Label>
                        <div className="input-group">
                          <Form.Control 
                            type="text" 
                            readOnly 
                            value={firstWeight && secondWeight ? calculatedNet.toLocaleString() : "-"} 
                            className="fw-bold text-success bg-white fs-7"
                          />
                          <span className="input-group-text bg-white small text-muted">kg</span>
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <Button variant="light" onClick={() => navigate("/requests")}>
                    Cancel
                  </Button>

                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={loading || scanning}
                    className="px-4 fw-bold shadow-sm"
                    style={{ backgroundColor: "#0d6efd", borderColor: "#0d6efd" }}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Requisition"
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
