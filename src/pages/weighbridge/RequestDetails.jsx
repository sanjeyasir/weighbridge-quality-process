import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { 
  getWeighbridgeRequestById, 
  submitQualityData, 
  submitFinanceData 
} from "../../services/firebase/weighbridgeService";
import { downloadReceiptPDF } from "../../utils/pdfGenerator";
import { toast } from "../../utils/toast";
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Form, 
  Table, 
  Badge, 
  Spinner, 
  Alert, 
  ButtonGroup 
} from "react-bootstrap";

function formatDate(timestamp) {
  if (!timestamp) return "-";
  try {
    if (timestamp && typeof timestamp.toDate === "function") {
      return timestamp.toDate().toLocaleDateString();
    }
    if (timestamp && timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
  } catch (e) {
    return "-";
  }
}

// Convert numbers to capitalized English words for the receipt voucher
function numberToWords(num) {
  if (!num || isNaN(num)) return "Zero Rupees Only";
  const wholePart = Math.floor(num);
  const cents = Math.round((num - wholePart) * 100);
  
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
                "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertChunk(n) {
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + " ";
    }
    return str.trim();
  }

  let words = "";
  if (wholePart >= 10000000) {
    words += convertChunk(Math.floor(wholePart / 10000000)) + " Crore ";
    num %= 10000000;
  }
  if (wholePart >= 100000) {
    words += convertChunk(Math.floor(wholePart / 100000)) + " Lakh ";
    num %= 100000;
  }
  if (wholePart >= 1000) {
    words += convertChunk(Math.floor(wholePart / 1000)) + " Thousand ";
    num %= 1000;
  }
  if (wholePart > 0) {
    words += convertChunk(wholePart);
  }

  let result = words.trim() + " Rupees";
  if (cents > 0) {
    result += " and " + convertChunk(cents) + " Cents";
  }
  return result + " Only";
}

export default function RequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewTab, setViewTab] = useState("workspace"); // "workspace" or "voucher"

  // Quality Fields
  const [qualityNo, setQualityNo] = useState("");
  const [mill, setMill] = useState("");
  const [qualityDate, setQualityDate] = useState("");
  const [consecNo, setConsecNo] = useState("");
  const [supplierRep, setSupplierRep] = useState("");
  const [h2oPercent, setH2oPercent] = useState("");
  const [avBagWt, setAvBagWt] = useState("");

  // Samples
  const [samples, setSamples] = useState([
    { sampleLotNo: "24", sand: "", sieve1438: "", fm: "", moRig: "", avgMoistProbe: "", ec: "", ph: "", bsbd: "", box: "", bd: "" },
    { sampleLotNo: "56", sand: "", sieve1438: "", fm: "", moRig: "", avgMoistProbe: "", ec: "", ph: "", bsbd: "", box: "", bd: "" },
    { sampleLotNo: "90", sand: "", sieve1438: "", fm: "", moRig: "", avgMoistProbe: "", ec: "", ph: "", bsbd: "", box: "", bd: "" }
  ]);

  // Finance Fields
  const [rateApproval, setRateApproval] = useState(88.00);
  const [wastage, setWastage] = useState(10);
  const [moistureCut, setMoistureCut] = useState(7);
  const [deduction, setDeduction] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Cheque");
  const [chequeNo, setChequeNo] = useState("");
  const [receivedByName, setReceivedByName] = useState("");
  const [nicNo, setNicNo] = useState("");

  // Calculations
  const netWeightVal = Number(request?.netWeight) || 560;
  const liveNetWeightQty = Math.max(0, netWeightVal - (Number(wastage) || 0) - (Number(moistureCut) || 0));
  const liveGrossPayment = liveNetWeightQty * (Number(rateApproval) || 0);
  const liveNetPayment = Math.max(0, liveGrossPayment - (Number(deduction) || 0));

  const loadRequest = async () => {
    try {
      setLoading(true);
      const data = await getWeighbridgeRequestById(id);
      if (!data) {
        toast.error("Requisition record not found.");
        navigate("/requests");
        return;
      }
      setRequest(data);
      
      if (data.samples && data.samples.length > 0) {
        setSamples(data.samples);
      }

      setQualityNo(data.qualityNo || `CR-${data.requestNo || "52062"}`);
      setMill(data.mill || "CPH-Galle");
      setQualityDate(data.qualityDate || data.date || "17/07/2026");
      setConsecNo(data.consecNo || "01");
      setSupplierRep(data.supplierRep || "");
      setH2oPercent(data.h2oPercent || "9.5%");
      setAvBagWt(data.avBagWt || "0.1 kg");

      setRateApproval(data.rateApproval !== undefined ? data.rateApproval : 88.00);
      setWastage(data.wastage !== undefined ? data.wastage : 10);
      setMoistureCut(data.moistureCut !== undefined ? data.moistureCut : 7);
      setDeduction(data.deduction !== undefined ? data.deduction : 0);
      setPaymentMode(data.paymentMode || "Cheque");
      setChequeNo(data.chequeNo || "");
      setReceivedByName(data.receivedByName || data.supplier || "");
      setNicNo(data.nicNo || "");

    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch ticket.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
  }, [id]);

  const handleSampleCellChange = (index, field, value) => {
    setSamples(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const submitQuality = async () => {
    try {
      setSaving(true);
      const mappedSamples = samples.map(s => ({
        sampleLotNo: s.sampleLotNo || "",
        sand: s.sand !== "" && s.sand !== undefined ? String(s.sand) : "",
        sieve1438: s.sieve1438 !== "" && s.sieve1438 !== undefined ? String(s.sieve1438) : "",
        fm: s.fm !== "" && s.fm !== undefined ? String(s.fm) : "",
        moRig: s.moRig !== "" && s.moRig !== undefined ? String(s.moRig) : "",
        avgMoistProbe: s.avgMoistProbe !== "" && s.avgMoistProbe !== undefined ? String(s.avgMoistProbe) : "",
        ec: s.ec !== "" && s.ec !== undefined ? String(s.ec) : "",
        ph: s.ph !== "" && s.ph !== undefined ? String(s.ph) : "",
        bsbd: s.bsbd !== "" && s.bsbd !== undefined ? String(s.bsbd) : "",
        box: s.box !== "" && s.box !== undefined ? String(s.box) : "",
        bd: s.bd !== "" && s.bd !== undefined ? String(s.bd) : ""
      }));

      await submitQualityData(request.id, {
        qualityNo,
        mill,
        qualityDate,
        consecNo,
        h2oPercent,
        avBagWt,
        supplierRep,
        samples: mappedSamples
      }, currentUser);

      toast.success("Quality parameters saved successfully!");
      loadRequest();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save quality details.");
    } finally {
      setSaving(false);
    }
  };

  const submitFinance = async (markCompleted = false) => {
    try {
      setSaving(true);
      const financePayload = {
        rateApproval: Number(rateApproval),
        wastage: Number(wastage),
        moistureCut: Number(moistureCut),
        deduction: Number(deduction),
        netWeightQty: liveNetWeightQty,
        grossPayment: liveGrossPayment,
        netPayment: liveNetPayment,
        paymentMode,
        chequeNo,
        receivedByName,
        nicNo
      };

      await submitFinanceData(request.id, financePayload, currentUser, markCompleted);
      
      if (markCompleted) {
        toast.success("Requisition successfully Completed & Finalized!");
      } else {
        toast.success("Finance draft calculations saved!");
      }
      loadRequest();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save finance details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-50 py-5 text-muted">
        <Spinner animation="border" variant="success" className="mb-2" />
        <span className="small fw-semibold">Loading ticket details...</span>
      </div>
    );
  }

  const isQualityRole = currentUser?.role === "quality" || currentUser?.role === "admin";
  const isFinanceRole = currentUser?.role === "finance" || currentUser?.role === "admin";
  const isCompleted = request?.status === "Completed";
  
  const canEditQuality = isQualityRole && !isCompleted;
  const canEditFinance = isFinanceRole && !isCompleted;

  const amountInWords = numberToWords(request?.netPayment || liveNetPayment);

  return (
    <div className="d-flex flex-column gap-4">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <div>
          <Link to="/requests" className="text-secondary small fw-bold text-decoration-none d-inline-flex align-items-center gap-1 mb-1">
            <i className="bi bi-arrow-left"></i> Back to Records
          </Link>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h3 className="fw-bold text-dark mb-0">Requisition #{request?.requestNo}</h3>
            <span className={`badge px-2 py-1 ${
              isCompleted 
                ? "bg-success bg-opacity-10 text-success border border-success border-opacity-25" 
                : request?.status === "Pending Quality"
                ? "bg-purple text-purple border"
                : "bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25"
            }`}>
              {request?.status}
            </span>
          </div>
        </div>

        {/* View Switcher & Print Action */}
        <div className="d-flex align-items-center gap-2 w-100 w-md-auto justify-content-between justify-content-md-end">
          <ButtonGroup size="sm" className="bg-light p-1 rounded-3 border">
            <Button 
              variant={viewTab === "workspace" ? "white" : "light"}
              className={`small fw-semibold ${viewTab === "workspace" ? "bg-white shadow-sm" : ""}`}
              onClick={() => setViewTab("workspace")}
            >
              <i className="bi bi-grid-fill me-1 text-primary"></i> Workspace
            </Button>
            <Button 
              variant={viewTab === "voucher" ? "white" : "light"}
              className={`small fw-semibold ${viewTab === "voucher" ? "bg-white shadow-sm" : ""}`}
              onClick={() => setViewTab("voucher")}
            >
              <i className="bi bi-receipt me-1 text-success"></i> Receipt Voucher
            </Button>
          </ButtonGroup>

          <Button 
            variant="primary" 
            size="sm"
            className="d-flex align-items-center gap-2 fw-bold px-3 py-2 shadow-sm"
            style={{ backgroundColor: "#0d6efd", borderColor: "#0d6efd" }}
            onClick={() => downloadReceiptPDF(request)}
          >
            <i className="bi bi-printer"></i>
            <span>Download PDF</span>
          </Button>
        </div>
      </div>

      {/* Mode 1: Interactive Workspace View */}
      {viewTab === "workspace" && (
        <div className="d-flex flex-column gap-4">
          {/* Card 1: Ticket & Vehicle Profile */}
          <Card className="border-0 shadow-sm rounded-4 bg-white">
            <Card.Header className="bg-white border-bottom py-3">
              <span className="fw-bold text-dark d-flex align-items-center gap-2">
                <i className="bi bi-truck text-primary fs-5"></i> Weighbridge Ticket & Vehicle Metrics
              </span>
            </Card.Header>
            <Card.Body className="p-3 p-md-4">
              <Row className="g-3 mb-3">
                <Col xs={6} md={3}>
                  <div className="text-muted fs-8 fw-semibold">Vehicle Registration</div>
                  <div className="fw-bold fs-6 text-dark font-monospace">{request?.vehicleNo}</div>
                </Col>
                <Col xs={6} md={3}>
                  <div className="text-muted fs-8 fw-semibold">Supplier / Mill Owner</div>
                  <div className="fw-bold fs-6 text-dark">{request?.supplier}</div>
                </Col>
                <Col xs={6} md={3}>
                  <div className="text-muted fs-8 fw-semibold">Commodity (Contract)</div>
                  <span className="badge bg-light text-primary border fw-bold">{request?.commodity}</span>
                </Col>
                <Col xs={6} md={3}>
                  <div className="text-muted fs-8 fw-semibold">Weighing Date & Time</div>
                  <div className="small fw-semibold text-secondary">
                    {request?.date} {request?.time1 && `(${request.time1} / ${request.time2 || ""})`}
                  </div>
                </Col>
              </Row>

              <hr className="my-3 text-muted" />

              <Row className="g-3">
                <Col xs={12} sm={4}>
                  <div className="p-3 bg-light rounded-3 border">
                    <div className="text-muted fs-8 fw-semibold">1st Weight (Gross)</div>
                    <h4 className="fw-bold text-dark font-monospace mb-0">
                      {request?.firstWeight ? `${request.firstWeight.toLocaleString()} kg` : "-"}
                    </h4>
                  </div>
                </Col>
                <Col xs={12} sm={4}>
                  <div className="p-3 bg-light rounded-3 border">
                    <div className="text-muted fs-8 fw-semibold">2nd Weight (Tare)</div>
                    <h4 className="fw-bold text-dark font-monospace mb-0">
                      {request?.secondWeight ? `${request.secondWeight.toLocaleString()} kg` : "-"}
                    </h4>
                  </div>
                </Col>
                <Col xs={12} sm={4}>
                  <div className="p-3 bg-success bg-opacity-10 rounded-3 border border-success border-opacity-25">
                    <div className="text-success fs-8 fw-bold">Ticket Net Weight</div>
                    <h4 className="fw-bold text-success font-monospace mb-0">
                      {request?.netWeight ? `${request.netWeight.toLocaleString()} kg` : "-"}
                    </h4>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Card 2: Quality Assurance Lab Evaluation */}
          <Card className="border-0 shadow-sm rounded-4 bg-white">
            <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <span className="fw-bold text-dark d-flex align-items-center gap-2">
                <i className="bi bi-flask text-purple fs-5"></i> Quality Assurance & Lab Sample Evaluation
              </span>
              {canEditQuality && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  disabled={saving}
                  onClick={submitQuality}
                  className="fw-bold px-3"
                  style={{ backgroundColor: "#8b5cf6", borderColor: "#8b5cf6" }}
                >
                  <i className="bi bi-save me-1"></i> Save QC Data
                </Button>
              )}
            </Card.Header>

            <Card.Body className="p-3 p-md-4">
              <Row className="g-3 mb-3">
                <Col xs={12} sm={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">CR Quality Receipt No</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={qualityNo} 
                      onChange={(e) => setQualityNo(e.target.value)} 
                      disabled={!canEditQuality} 
                      className="fs-7"
                    />
                  </Form.Group>
                </Col>
                <Col xs={6} sm={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">Mill Origin</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={mill} 
                      onChange={(e) => setMill(e.target.value)} 
                      disabled={!canEditQuality} 
                      className="fs-7"
                    />
                  </Form.Group>
                </Col>
                <Col xs={6} sm={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">Supplier Representative</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={supplierRep} 
                      onChange={(e) => setSupplierRep(e.target.value)} 
                      disabled={!canEditQuality} 
                      className="fs-7"
                    />
                  </Form.Group>
                </Col>
                <Col xs={6} sm={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">H2O Moisture %</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={h2oPercent} 
                      onChange={(e) => setH2oPercent(e.target.value)} 
                      disabled={!canEditQuality} 
                      className="fs-7"
                    />
                  </Form.Group>
                </Col>
                <Col xs={6} sm={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">Average Bag Weight</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={avBagWt} 
                      onChange={(e) => setAvBagWt(e.target.value)} 
                      disabled={!canEditQuality} 
                      className="fs-7"
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">Consecutive No</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={consecNo} 
                      onChange={(e) => setConsecNo(e.target.value)} 
                      disabled={!canEditQuality} 
                      className="fs-7"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className="fw-bold text-dark small mb-2">Sample Lots Evaluation Parameters</div>
              
              <div className="table-responsive border rounded-3 mb-3">
                <Table bordered hover size="sm" className="mb-0 text-center align-middle text-nowrap" style={{ fontSize: "0.82rem" }}>
                  <thead className="table-light text-muted fs-8">
                    <tr>
                      <th>Sample Lot</th>
                      <th>Sand%</th>
                      <th>+1/4"+3/8"%</th>
                      <th>FM%</th>
                      <th>Mo%Rig</th>
                      <th>Probe%</th>
                      <th>EC</th>
                      <th>pH</th>
                      <th>BSBD</th>
                      <th>Box</th>
                      <th>BD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samples.map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-1">
                          <input 
                            type="text" 
                            className="form-control form-control-sm text-center fw-bold" 
                            style={{ width: 65, margin: "0 auto" }}
                            value={row.sampleLotNo} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "sampleLotNo", e.target.value)} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            type="text" 
                            className="form-control form-control-sm text-center" 
                            style={{ width: 55, margin: "0 auto" }}
                            value={row.sand} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "sand", e.target.value)} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            type="text" 
                            className="form-control form-control-sm text-center" 
                            style={{ width: 55, margin: "0 auto" }}
                            value={row.sieve1438} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "sieve1438", e.target.value)} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            type="text" 
                            className="form-control form-control-sm text-center" 
                            style={{ width: 55, margin: "0 auto" }}
                            value={row.fm} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "fm", e.target.value)} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            type="text" 
                            className="form-control form-control-sm text-center" 
                            style={{ width: 55, margin: "0 auto" }}
                            value={row.moRig} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "moRig", e.target.value)} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            type="text" 
                            className="form-control form-control-sm text-center" 
                            style={{ width: 55, margin: "0 auto" }}
                            value={row.avgMoistProbe} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "avgMoistProbe", e.target.value)} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            type="text" 
                            className="form-control form-control-sm text-center" 
                            style={{ width: 55, margin: "0 auto" }}
                            value={row.ec} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "ec", e.target.value)} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            type="text" 
                            className="form-control form-control-sm text-center" 
                            style={{ width: 55, margin: "0 auto" }}
                            value={row.ph} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "ph", e.target.value)} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            type="text" 
                            className="form-control form-control-sm text-center" 
                            style={{ width: 55, margin: "0 auto" }}
                            value={row.bsbd} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "bsbd", e.target.value)} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            type="text" 
                            className="form-control form-control-sm text-center" 
                            style={{ width: 55, margin: "0 auto" }}
                            value={row.box} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "box", e.target.value)} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            type="text" 
                            className="form-control form-control-sm text-center" 
                            style={{ width: 65, margin: "0 auto" }}
                            value={row.bd} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "bd", e.target.value)} 
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {request?.qcBy && (
                <div className="text-muted fs-8 d-flex align-items-center gap-1">
                  <i className="bi bi-check-circle-fill text-success"></i>
                  <span>QC Verified by <strong>{request.qcBy.name}</strong> on {formatDate(request.qcBy.timestamp)}</span>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Card 3: Commercial Billing & Finance Settlement */}
          <Card className="border-0 shadow-sm rounded-4 bg-white">
            <Card.Header className="bg-white border-bottom py-3">
              <span className="fw-bold text-dark d-flex align-items-center gap-2">
                <i className="bi bi-cash-coin text-warning fs-5"></i> Commercial Billing, Deductions & Payout Settlement
              </span>
            </Card.Header>

            <Card.Body className="p-3 p-md-4">
              {/* Calculation Summary Banner */}
              <div 
                className="p-3 p-md-4 rounded-3 text-white mb-4 shadow-sm"
                style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}
              >
                <Row className="g-3 align-items-center">
                  <Col xs={12} sm={4}>
                    <div className="text-secondary small">Settlement Net Weight Qty</div>
                    <h4 className="fw-bold text-white mb-0 font-monospace">
                      {liveNetWeightQty.toLocaleString()} kg
                    </h4>
                    <div className="text-muted fs-8 mt-1">(Net - Wastage - Moisture Cut)</div>
                  </Col>

                  <Col xs={12} sm={4}>
                    <div className="text-secondary small">Gross Payable Amount</div>
                    <h4 className="fw-bold text-white mb-0 font-monospace">
                      Rs. {liveGrossPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h4>
                    <div className="text-muted fs-8 mt-1">(Net Qty × Approved Rate PMT)</div>
                  </Col>

                  <Col xs={12} sm={4}>
                    <div className="text-success small fw-bold">FINAL NET PAYOUT</div>
                    <h3 className="fw-bold text-success mb-0 font-monospace">
                      Rs. {liveNetPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <div className="text-secondary fs-8 mt-1">(Gross - Advance Deductions)</div>
                  </Col>
                </Row>
              </div>

              <Row className="g-3 mb-3">
                <Col xs={6} sm={3}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">Wastage Cut (Kg)</Form.Label>
                    <Form.Control 
                      type="number" 
                      value={wastage} 
                      onChange={(e) => setWastage(e.target.value)} 
                      disabled={!canEditFinance}
                      min="0"
                      className="fs-7"
                    />
                  </Form.Group>
                </Col>

                <Col xs={6} sm={3}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">Moisture Cut (Kg)</Form.Label>
                    <Form.Control 
                      type="number" 
                      value={moistureCut} 
                      onChange={(e) => setMoistureCut(e.target.value)} 
                      disabled={!canEditFinance}
                      min="0"
                      className="fs-7"
                    />
                  </Form.Group>
                </Col>

                <Col xs={6} sm={3}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">Approved Rate (PMT)</Form.Label>
                    <Form.Control 
                      type="number" 
                      step="0.5" 
                      value={rateApproval} 
                      onChange={(e) => setRateApproval(e.target.value)} 
                      disabled={!canEditFinance}
                      min="0"
                      className="fs-7"
                    />
                  </Form.Group>
                </Col>

                <Col xs={6} sm={3}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">Advance Deduction (Rs)</Form.Label>
                    <Form.Control 
                      type="number" 
                      value={deduction} 
                      onChange={(e) => setDeduction(e.target.value)} 
                      disabled={!canEditFinance}
                      min="0"
                      className="fs-7"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <hr className="my-3 text-muted" />

              <Row className="g-3 mb-3">
                <Col xs={12} sm={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">Payment Mode</Form.Label>
                    <Form.Select 
                      value={paymentMode} 
                      onChange={(e) => setPaymentMode(e.target.value)} 
                      disabled={!canEditFinance}
                      className="fs-7"
                    >
                      <option value="Cheque">Cheque (CHQ)</option>
                      <option value="Cash">Cash</option>
                      <option value="DPS">DPS</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col xs={12} sm={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">Cheque / Reference No</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={chequeNo} 
                      onChange={(e) => setChequeNo(e.target.value)} 
                      disabled={!canEditFinance}
                      placeholder="e.g. CHQ-882910"
                      className="fs-7"
                    />
                  </Form.Group>
                </Col>

                <Col xs={6} sm={2}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">Payee Name</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={receivedByName} 
                      onChange={(e) => setReceivedByName(e.target.value)} 
                      disabled={!canEditFinance}
                      className="fs-7"
                    />
                  </Form.Group>
                </Col>

                <Col xs={6} sm={2}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-secondary">NIC No.</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={nicNo} 
                      onChange={(e) => setNicNo(e.target.value)} 
                      disabled={!canEditFinance}
                      className="fs-7"
                    />
                  </Form.Group>
                </Col>
              </Row>

              {request?.financeBy && (
                <div className="text-muted fs-8 d-flex align-items-center gap-1">
                  <i className="bi bi-check-circle-fill text-success"></i>
                  <span>Finance Authorized by <strong>{request.financeBy.name}</strong> on {formatDate(request.financeBy.timestamp)}</span>
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      )}

      {/* Mode 2: Official Corporate Voucher View */}
      {viewTab === "voucher" && (
        <Card className="border-0 shadow-sm rounded-4 bg-white p-3 p-md-4">
          <div 
            className="p-3 p-md-4 border border-dark rounded-2 bg-white" 
            style={{ 
              fontFamily: "'Times New Roman', Times, serif", 
              color: "#000",
              maxWidth: 960,
              margin: "0 auto",
              width: "100%"
            }}
          >
            {/* Header */}
            <div className="d-flex justify-content-between align-items-start mb-3 border-bottom border-dark pb-2">
              <div>
                <div className="fw-bold fs-6">HAYLEYS AVENTURA (PVT) LTD</div>
                <div className="small text-muted">Quality Assurance & Raw Material Receiving</div>
              </div>
              <h4 className="fw-bold mb-0 text-center flex-grow-1">Coir Fiber Pith Receipt</h4>
              <div className="border border-dark p-2 text-end small">
                <div><strong>CR No:</strong> {request?.qualityNo || `CR-${request?.requestNo}`}</div>
                <div><strong>REF NO:</strong> FM 10 SOP 03/D1</div>
              </div>
            </div>

            {/* Weighing Parameters */}
            <div className="table-responsive mb-3">
              <table className="table table-bordered border-dark table-sm text-center mb-0" style={{ fontSize: "0.85rem" }}>
                <thead className="table-light">
                  <tr>
                    <th>No. (Vehicle)</th>
                    <th>CONSEC No</th>
                    <th>DATE</th>
                    <th>TIME</th>
                    <th>1st Weight</th>
                    <th>2nd Weight</th>
                    <th>Gross Weight</th>
                  </tr>
                </thead>
                <tbody className="fw-bold">
                  <tr>
                    <td>{request?.vehicleNo || "-"}</td>
                    <td>{request?.consecNo || "01"}</td>
                    <td>{request?.date || "-"}</td>
                    <td>{request?.time1 || "-"}</td>
                    <td>{request?.firstWeight ? `${request.firstWeight} kg` : "-"}</td>
                    <td>{request?.secondWeight ? `${request.secondWeight} kg` : "-"}</td>
                    <td className="text-success">{request?.netWeight ? `${request.netWeight} kg` : "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Contract & Deductions */}
            <div className="row g-0 border border-dark mb-3" style={{ fontSize: "0.85rem" }}>
              <div className="col-6 border-end border-dark p-2">
                <div><strong>MILL:</strong> {request?.mill || "CPH-Galle"}</div>
                <div><strong>CONTRACT No:</strong> {request?.commodity || "-"}</div>
                <div><strong>MILL OWNER:</strong> {request?.supplier || "-"}</div>
                <div><strong>Received By:</strong> {request?.requestedBy?.name || "Office"}</div>
              </div>
              <div className="col-6 p-2">
                <div><strong>H2O %:</strong> {request?.h2oPercent || "9.5%"} | <strong>AV BAG WT:</strong> {request?.avBagWt || "0.1 kg"}</div>
                <div><strong>Dedn/MT:</strong> Wastage: {request?.wastage ?? 10} kg | Moisture: {request?.moistureCut ?? 7} kg</div>
                <div><strong>RATE (PMT):</strong> Rs. {Number(request?.rateApproval ?? 88).toFixed(2)}</div>
                <div className="text-success fw-bold">NET VALUE: Rs. {Number(request?.netPayment ?? liveNetPayment).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            {/* Amount in Words */}
            <div className="border border-dark p-2 mb-3 small">
              <strong>Amount (in words):</strong> <em>{amountInWords}</em>
            </div>

            {/* Signatures */}
            <div className="row g-0 border border-dark text-center py-2" style={{ fontSize: "0.82rem" }}>
              <div className="col-4 border-end border-dark">
                <strong>QC By (Sign)</strong>
                <div className="text-primary font-monospace py-1">{request?.qcBy?.name || "...................."}</div>
                <div className="fs-8 text-muted">Date: {formatDate(request?.qcBy?.timestamp)}</div>
              </div>
              <div className="col-4 border-end border-dark">
                <strong>Payee Identified By</strong>
                <div className="text-primary font-monospace py-1">{request?.financeBy?.name || "...................."}</div>
                <div className="fs-8 text-muted">Date: {formatDate(request?.financeBy?.timestamp)}</div>
              </div>
              <div className="col-4">
                <strong>Authorized Signatory</strong>
                <div className="text-primary font-monospace py-1">{request?.financeBy?.name || "...................."}</div>
                <div className="fs-8 text-muted">Date: {formatDate(request?.financeBy?.timestamp)}</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Bottom Sticky Action Bar */}
      <div 
        className="d-flex justify-content-end align-items-center gap-2 p-3 bg-white border-top rounded-4 shadow-sm"
      >
        {canEditQuality && (
          <Button 
            variant="primary"
            disabled={saving}
            onClick={submitQuality}
            className="fw-bold px-3 shadow-sm"
            style={{ backgroundColor: "#8b5cf6", borderColor: "#8b5cf6" }}
          >
            <i className="bi bi-save me-1"></i> Save Quality Data
          </Button>
        )}

        {canEditFinance && (
          <>
            <Button 
              variant="outline-success" 
              disabled={saving}
              onClick={() => submitFinance(false)}
              className="fw-bold px-3 shadow-sm"
            >
              <i className="bi bi-save me-1"></i> Save Finance Draft
            </Button>
            <Button 
              variant="primary" 
              disabled={saving}
              onClick={() => submitFinance(true)}
              className="fw-bold px-3 shadow-sm"
              style={{ backgroundColor: "#0d6efd", borderColor: "#0d6efd" }}
            >
              <i className="bi bi-check-circle me-1"></i> Complete & Finalize
            </Button>
          </>
        )}

        {isCompleted && (
          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 fw-bold">
            <i className="bi bi-check-circle-fill me-1"></i> Finalized & Locked
          </span>
        )}
      </div>
    </div>
  );
}
