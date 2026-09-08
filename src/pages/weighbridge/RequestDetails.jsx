import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { 
  getWeighbridgeRequestById, 
  submitQualityData, 
  submitFinanceData 
} from "../../services/firebase/weighbridgeService";
import { downloadReceiptPDF } from "../../utils/pdfGenerator";
import { 
  Button, 
  Form, 
  Input, 
  InputNumber, 
  Radio, 
  Space, 
  Typography, 
  Spin, 
  message, 
  Card, 
  Row, 
  Col, 
  Tag, 
  Steps, 
  Segmented, 
  Divider, 
  Alert 
} from "antd";
import { 
  ArrowLeftOutlined, 
  PrinterOutlined, 
  SaveOutlined, 
  CheckCircleOutlined, 
  ExperimentOutlined, 
  DollarCircleOutlined, 
  FileTextOutlined, 
  CarOutlined, 
  SafetyCertificateOutlined, 
  AppstoreOutlined,
  ThunderboltOutlined
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

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
  const [isMobile, setIsMobile] = useState(false);
  const [form] = Form.useForm();

  // Local state for samples table inputs
  const [samples, setSamples] = useState([
    { sampleLotNo: "24", sand: "", sieve1438: "", fm: "", moRig: "", avgMoistProbe: "", ec: "", ph: "", bsbd: "", box: "", bd: "" },
    { sampleLotNo: "56", sand: "", sieve1438: "", fm: "", moRig: "", avgMoistProbe: "", ec: "", ph: "", bsbd: "", box: "", bd: "" },
    { sampleLotNo: "90", sand: "", sieve1438: "", fm: "", moRig: "", avgMoistProbe: "", ec: "", ph: "", bsbd: "", box: "", bd: "" }
  ]);

  // Live state for net value display
  const [liveNetWeightQty, setLiveNetWeightQty] = useState(0);
  const [liveGrossPayment, setLiveGrossPayment] = useState(0);
  const [liveNetPayment, setLiveNetPayment] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const data = await getWeighbridgeRequestById(id);
      if (!data) {
        message.error("Requisition record not found.");
        navigate("/requests");
        return;
      }
      setRequest(data);
      
      if (data.samples && data.samples.length > 0) {
        setSamples(data.samples);
      }

      const initialRate = data.rateApproval !== undefined ? data.rateApproval : 88.00;
      const initialWastage = data.wastage !== undefined ? data.wastage : 10;
      const initialMoistureCut = data.moistureCut !== undefined ? data.moistureCut : 7;
      const initialDeduction = data.deduction !== undefined ? data.deduction : 0;
      
      const netWeight = data.netWeight || 560;
      const computedNetQty = data.netWeightQty !== undefined ? data.netWeightQty : (netWeight - initialWastage - initialMoistureCut);
      const computedGross = data.grossPayment !== undefined ? data.grossPayment : (computedNetQty * initialRate);
      const computedNetVal = data.netPayment !== undefined ? data.netPayment : (computedGross - initialDeduction);

      setLiveNetWeightQty(computedNetQty);
      setLiveGrossPayment(computedGross);
      setLiveNetPayment(computedNetVal);

      form.setFieldsValue({
        qualityNo: data.qualityNo || `CR-${data.requestNo || "52062"}`,
        mill: data.mill || "CPH-Galle",
        qualityDate: data.qualityDate || data.date || "17/07/2026",
        consecNo: data.consecNo || "01",
        time1: data.time1 || "",
        time2: data.time2 || "",
        supplierRep: data.supplierRep || "",
        
        // Quality fields
        h2oPercent: data.h2oPercent || "9.5%",
        avBagWt: data.avBagWt || "0.1 kg",
        dnNo: data.dnNo || "",

        // Finance fields
        rateApproval: initialRate,
        wastage: initialWastage,
        moistureCut: initialMoistureCut,
        netWeightQty: computedNetQty,
        grossPayment: computedGross,
        deduction: initialDeduction,
        netPayment: computedNetVal,
        paymentMode: data.paymentMode || "Cheque",
        chequeNo: data.chequeNo || "",
        receivedByName: data.receivedByName || data.supplier || "",
        nicNo: data.nicNo || ""
      });

    } catch (err) {
      console.error(err);
      message.error("Failed to load request details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
  }, [id]);

  const handleSampleCellChange = (idx, field, value) => {
    const next = [...samples];
    next[idx] = { ...next[idx], [field]: value };
    setSamples(next);
  };

  const handleFinanceCalc = () => {
    const rate = Number(form.getFieldValue("rateApproval")) || 0;
    const wastage = Number(form.getFieldValue("wastage")) || 0;
    const moistureCut = Number(form.getFieldValue("moistureCut")) || 0;
    const deduction = Number(form.getFieldValue("deduction")) || 0;

    const netWeight = Number(request?.netWeight) || 0;
    const netQty = Math.max(0, netWeight - wastage - moistureCut);
    const grossVal = netQty * rate;
    const netVal = Math.max(0, grossVal - deduction);

    setLiveNetWeightQty(netQty);
    setLiveGrossPayment(grossVal);
    setLiveNetPayment(netVal);

    form.setFieldsValue({
      netWeightQty: netQty,
      grossPayment: grossVal,
      netPayment: netVal
    });
  };

  const submitQuality = async () => {
    try {
      setSaving(true);
      const values = form.getFieldsValue();
      
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
        qualityNo: values.qualityNo || "",
        mill: values.mill || "",
        qualityDate: values.qualityDate || "",
        consecNo: values.consecNo || "",
        h2oPercent: values.h2oPercent || "",
        avBagWt: values.avBagWt || "",
        supplierRep: values.supplierRep || "",
        samples: mappedSamples
      }, currentUser);

      message.success("Quality parameters saved successfully!");
      loadRequest();
    } catch (err) {
      console.error(err);
      message.error("Failed to save quality details.");
    } finally {
      setSaving(false);
    }
  };

  const submitFinance = async (markCompleted = false) => {
    try {
      setSaving(true);
      const values = form.getFieldsValue();
      await submitFinanceData(request.id, values, currentUser, markCompleted);
      
      if (markCompleted) {
        message.success("Requisition successfully Completed & Finalized!");
      } else {
        message.success("Finance draft calculations saved!");
      }
      loadRequest();
    } catch (err) {
      console.error(err);
      message.error("Failed to save finance details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Spin size="large" tip="Loading ticket details..." />
      </div>
    );
  }

  const isQualityRole = currentUser?.role === "quality" || currentUser?.role === "admin";
  const isFinanceRole = currentUser?.role === "finance" || currentUser?.role === "admin";
  const isCompleted = request?.status === "Completed";
  
  const canEditQuality = isQualityRole && !isCompleted;
  const canEditFinance = isFinanceRole && !isCompleted;

  let currentStep = 0;
  if (request?.status === "Pending Quality") currentStep = 1;
  else if (request?.status === "Pending Finance") currentStep = 2;
  else if (request?.status === "Completed") currentStep = 3;

  const amountInWords = numberToWords(request?.netPayment || liveNetPayment);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 12 }}>
        <div>
          <Button 
            type="link" 
            onClick={() => navigate("/requests")} 
            style={{ padding: 0, fontWeight: 700, color: "#64748b", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <ArrowLeftOutlined /> Back to Records
          </Button>
          
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontWeight: 800, fontSize: isMobile ? "1.35rem" : "1.7rem", color: "#0f172a", letterSpacing: "-0.02em" }}>
              Requisition #{request?.requestNo}
            </h1>
            <Tag 
              color={isCompleted ? "success" : request?.status === "Pending Quality" ? "purple" : "warning"} 
              style={{ fontWeight: 700, padding: "2px 10px", borderRadius: 6, fontSize: "0.8rem" }}
            >
              {request?.status}
            </Tag>
          </div>
        </div>

        {/* View Switcher & Print Action */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, width: isMobile ? "100%" : "auto", justifyContent: "space-between" }}>
          <Segmented
            value={viewTab}
            onChange={(val) => setViewTab(val)}
            options={[
              { label: "Interactive Workspace", value: "workspace", icon: <AppstoreOutlined /> },
              { label: "Official Receipt Voucher", value: "voucher", icon: <FileTextOutlined /> }
            ]}
            style={{ fontWeight: 600, background: "#e2e8f0" }}
          />

          <Button 
            type="primary" 
            icon={<PrinterOutlined />} 
            onClick={() => downloadReceiptPDF(request)}
            style={{ 
              fontWeight: 700, 
              borderRadius: 8, 
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              border: "none",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)"
            }}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* Progress Timeline Tracker */}
      <Card 
        bordered={true} 
        style={{ borderRadius: 16, background: "#ffffff" }}
        styles={{ body: { padding: isMobile ? "14px 10px" : "18px 24px" } }}
      >
        <Steps
          size="small"
          current={currentStep}
          responsive={true}
          items={[
            { title: 'Weighbridge Requisition', description: `Ticket #${request?.ticketNo || request?.requestNo}` },
            { title: 'Quality Lab Test', description: request?.qcBy ? `By ${request.qcBy.name}` : 'Pending Quality' },
            { title: 'Commercial Billing', description: request?.financeBy ? `By ${request.financeBy.name}` : 'Pending Finance' },
            { title: 'Completed & Printed', description: isCompleted ? 'Fully Settled' : 'Awaiting Finalize' }
          ]}
        />
      </Card>

      {/* Mode 1: Interactive Workspace View */}
      {viewTab === "workspace" && (
        <Form form={form} layout="vertical" component={false}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Card 1: Ticket & Vehicle Profile */}
            <Card 
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CarOutlined style={{ color: "#3b82f6" }} />
                  <span style={{ fontWeight: 800, color: "#0f172a" }}>Weighbridge Ticket & Vehicle Metrics</span>
                </div>
              }
              bordered={true}
              style={{ borderRadius: 16, background: "#ffffff" }}
              styles={{ body: { padding: isMobile ? 14 : 22 } }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Vehicle Registration</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", marginTop: 2 }}>{request?.vehicleNo}</div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Supplier / Mill Owner</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", marginTop: 2 }}>{request?.supplier}</div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Commodity (Contract)</div>
                  <div style={{ marginTop: 2 }}><Tag color="blue" style={{ fontWeight: 700 }}>{request?.commodity}</Tag></div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Weighing Date & Time</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginTop: 2 }}>
                    {request?.date} {request?.time1 && `(${request.time1} / ${request.time2 || ""})`}
                  </div>
                </Col>
              </Row>

              <Divider style={{ margin: "16px 0" }} />

              <Row gutter={[12, 12]}>
                <Col xs={24} sm={8}>
                  <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>1st Weight (Gross)</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                      {request?.firstWeight ? `${request.firstWeight.toLocaleString()} kg` : "-"}
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>2nd Weight (Tare)</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                      {request?.secondWeight ? `${request.secondWeight.toLocaleString()} kg` : "-"}
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ background: "rgba(16, 185, 129, 0.08)", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                    <div style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700 }}>Ticket Net Weight</div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#10b981", marginTop: 2 }}>
                      {request?.netWeight ? `${request.netWeight.toLocaleString()} kg` : "-"}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Card 2: Quality Assurance Lab Evaluation */}
            <Card 
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ExperimentOutlined style={{ color: "#8b5cf6" }} />
                  <span style={{ fontWeight: 800, color: "#0f172a" }}>Quality Assurance & Lab Sample Evaluation</span>
                </div>
              }
              bordered={true}
              style={{ borderRadius: 16, background: "#ffffff" }}
              styles={{ body: { padding: isMobile ? 14 : 22 } }}
            >
              <Row gutter={16} style={{ marginBottom: 12 }}>
                <Col xs={24} sm={8}>
                  <Form.Item label={<span style={{ fontWeight: 700 }}>CR Quality Receipt No</span>} name="qualityNo">
                    <Input disabled={!canEditQuality} placeholder="52062" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={8}>
                  <Form.Item label={<span style={{ fontWeight: 700 }}>Mill Origin</span>} name="mill">
                    <Input disabled={!canEditQuality} placeholder="CPH-Galle" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={8}>
                  <Form.Item label={<span style={{ fontWeight: 700 }}>Supplier Representative</span>} name="supplierRep">
                    <Input disabled={!canEditQuality} placeholder="Rep Name" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={8}>
                  <Form.Item label={<span style={{ fontWeight: 700 }}>H2O Moisture %</span>} name="h2oPercent">
                    <Input disabled={!canEditQuality} placeholder="9.5%" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={8}>
                  <Form.Item label={<span style={{ fontWeight: 700 }}>Average Bag Weight</span>} name="avBagWt">
                    <Input disabled={!canEditQuality} placeholder="0.1 kg" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label={<span style={{ fontWeight: 700 }}>Consecutive No</span>} name="consecNo">
                    <Input disabled={!canEditQuality} placeholder="01" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ marginBottom: 8, fontWeight: 700, color: "#0f172a", fontSize: "0.88rem" }}>
                Sample Lots Evaluation Parameters
              </div>

              {/* Lab Samples Matrix */}
              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fafbfc" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "10px 8px", fontSize: "0.75rem", textAlign: "center", color: "#475569" }}>Sample Lot</th>
                      <th style={{ padding: "10px 8px", fontSize: "0.75rem", textAlign: "center", color: "#475569" }}>Sand%</th>
                      <th style={{ padding: "10px 8px", fontSize: "0.75rem", textAlign: "center", color: "#475569" }}>+1/4"+3/8"%</th>
                      <th style={{ padding: "10px 8px", fontSize: "0.75rem", textAlign: "center", color: "#475569" }}>FM%</th>
                      <th style={{ padding: "10px 8px", fontSize: "0.75rem", textAlign: "center", color: "#475569" }}>Mo%Rig</th>
                      <th style={{ padding: "10px 8px", fontSize: "0.75rem", textAlign: "center", color: "#475569" }}>Probe%</th>
                      <th style={{ padding: "10px 8px", fontSize: "0.75rem", textAlign: "center", color: "#475569" }}>EC</th>
                      <th style={{ padding: "10px 8px", fontSize: "0.75rem", textAlign: "center", color: "#475569" }}>pH</th>
                      <th style={{ padding: "10px 8px", fontSize: "0.75rem", textAlign: "center", color: "#475569" }}>BSBD</th>
                      <th style={{ padding: "10px 8px", fontSize: "0.75rem", textAlign: "center", color: "#475569" }}>Box</th>
                      <th style={{ padding: "10px 8px", fontSize: "0.75rem", textAlign: "center", color: "#475569" }}>BD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samples.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 6px", textAlign: "center" }}>
                          <Input 
                            value={row.sampleLotNo} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "sampleLotNo", e.target.value)} 
                            style={{ width: 65, textAlign: "center", fontWeight: 700 }} 
                          />
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "center" }}>
                          <Input 
                            value={row.sand} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "sand", e.target.value)} 
                            style={{ width: 55, textAlign: "center" }} 
                          />
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "center" }}>
                          <Input 
                            value={row.sieve1438} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "sieve1438", e.target.value)} 
                            style={{ width: 55, textAlign: "center" }} 
                          />
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "center" }}>
                          <Input 
                            value={row.fm} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "fm", e.target.value)} 
                            style={{ width: 55, textAlign: "center" }} 
                          />
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "center" }}>
                          <Input 
                            value={row.moRig} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "moRig", e.target.value)} 
                            style={{ width: 55, textAlign: "center" }} 
                          />
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "center" }}>
                          <Input 
                            value={row.avgMoistProbe} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "avgMoistProbe", e.target.value)} 
                            style={{ width: 55, textAlign: "center" }} 
                          />
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "center" }}>
                          <Input 
                            value={row.ec} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "ec", e.target.value)} 
                            style={{ width: 55, textAlign: "center" }} 
                          />
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "center" }}>
                          <Input 
                            value={row.ph} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "ph", e.target.value)} 
                            style={{ width: 55, textAlign: "center" }} 
                          />
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "center" }}>
                          <Input 
                            value={row.bsbd} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "bsbd", e.target.value)} 
                            style={{ width: 55, textAlign: "center" }} 
                          />
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "center" }}>
                          <Input 
                            value={row.box} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "box", e.target.value)} 
                            style={{ width: 55, textAlign: "center" }} 
                          />
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "center" }}>
                          <Input 
                            value={row.bd} 
                            disabled={!canEditQuality}
                            onChange={(e) => handleSampleCellChange(idx, "bd", e.target.value)} 
                            style={{ width: 75, textAlign: "center" }} 
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {request?.qcBy && (
                <div style={{ marginTop: 14, fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircleOutlined style={{ color: "#10b981" }} />
                  <span>QC Verified by <strong>{request.qcBy.name}</strong> on {formatDate(request.qcBy.timestamp)}</span>
                </div>
              )}
            </Card>

            {/* Card 3: Commercial Billing & Finance Settlement */}
            <Card 
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <DollarCircleOutlined style={{ color: "#f59e0b" }} />
                  <span style={{ fontWeight: 800, color: "#0f172a" }}>Commercial Billing, Deductions & Payout Settlement</span>
                </div>
              }
              bordered={true}
              style={{ borderRadius: 16, background: "#ffffff" }}
              styles={{ body: { padding: isMobile ? 14 : 22 } }}
            >
              {/* Live Calculation Banner */}
              <div style={{ 
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", 
                borderRadius: 14, 
                padding: isMobile ? "16px 14px" : "20px 24px", 
                color: "#ffffff",
                marginBottom: 20
              }}>
                <Row gutter={[16, 16]} align="middle">
                  <Col xs={24} sm={12} md={8}>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Settlement Net Weight Qty</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#ffffff", marginTop: 2 }}>
                      {liveNetWeightQty.toLocaleString()} kg
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 2 }}>
                      (Ticket Net - Wastage - Moisture Cut)
                    </div>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Gross Payable Amount</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#e2e8f0", marginTop: 2 }}>
                      Rs. {liveGrossPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 2 }}>
                      (Net Qty × Approved Rate PMT)
                    </div>
                  </Col>

                  <Col xs={24} sm={24} md={8}>
                    <div style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: 700 }}>FINAL NET PAYOUT</div>
                    <div style={{ fontSize: isMobile ? "1.6rem" : "1.85rem", fontWeight: 900, color: "#10b981", marginTop: 2 }}>
                      Rs. {liveNetPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2 }}>
                      (Gross - Advance Deductions)
                    </div>
                  </Col>
                </Row>
              </div>

              <Row gutter={16}>
                <Col xs={12} sm={6}>
                  <Form.Item label={<span style={{ fontWeight: 700 }}>Wastage Cut (Kg)</span>} name="wastage">
                    <InputNumber 
                      disabled={!canEditFinance}
                      onChange={handleFinanceCalc}
                      addonAfter="kg"
                      style={{ width: "100%" }}
                      size="large"
                      min={0}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={6}>
                  <Form.Item label={<span style={{ fontWeight: 700 }}>Moisture Cut (Kg)</span>} name="moistureCut">
                    <InputNumber 
                      disabled={!canEditFinance}
                      onChange={handleFinanceCalc}
                      addonAfter="kg"
                      style={{ width: "100%" }}
                      size="large"
                      min={0}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={6}>
                  <Form.Item label={<span style={{ fontWeight: 700 }}>Approved Rate (PMT)</span>} name="rateApproval">
                    <InputNumber 
                      disabled={!canEditFinance}
                      onChange={handleFinanceCalc}
                      addonBefore="Rs."
                      style={{ width: "100%" }}
                      size="large"
                      min={0}
                      step={0.5}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={6}>
                  <Form.Item label={<span style={{ fontWeight: 700 }}>Advance Deduction</span>} name="deduction">
                    <InputNumber 
                      disabled={!canEditFinance}
                      onChange={handleFinanceCalc}
                      addonBefore="Rs."
                      style={{ width: "100%" }}
                      size="large"
                      min={0}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: "10px 0 16px 0" }} />

              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item label={<span style={{ fontWeight: 700 }}>Payment Disbursement Mode</span>} name="paymentMode">
                    <Radio.Group disabled={!canEditFinance} size="middle" buttonStyle="solid">
                      <Radio.Button value="Cheque">Cheque (CHQ)</Radio.Button>
                      <Radio.Button value="Cash">Cash</Radio.Button>
                      <Radio.Button value="DPS">DPS</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label={<span style={{ fontWeight: 700 }}>Cheque / Reference Number</span>} name="chequeNo">
                    <Input disabled={!canEditFinance} placeholder="e.g. CHQ-882910" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={4}>
                  <Form.Item label={<span style={{ fontWeight: 700 }}>Payee Name</span>} name="receivedByName">
                    <Input disabled={!canEditFinance} placeholder="Payee Name" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={4}>
                  <Form.Item label={<span style={{ fontWeight: 700 }}>Payee NIC No</span>} name="nicNo">
                    <Input disabled={!canEditFinance} placeholder="NIC / Identity" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              {request?.financeBy && (
                <div style={{ marginTop: 8, fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircleOutlined style={{ color: "#10b981" }} />
                  <span>Finance Authorized by <strong>{request.financeBy.name}</strong> on {formatDate(request.financeBy.timestamp)}</span>
                </div>
              )}
            </Card>

            {/* Card 4: Signatures & Authorizations */}
            <Card 
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <SafetyCertificateOutlined style={{ color: "#10b981" }} />
                  <span style={{ fontWeight: 800, color: "#0f172a" }}>Department Signatures & Authorizations</span>
                </div>
              }
              bordered={true}
              style={{ borderRadius: 16, background: "#ffffff" }}
              styles={{ body: { padding: isMobile ? 14 : 22 } }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px", background: "#f8fafc" }}>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Requisition Issued By</div>
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem", marginTop: 4 }}>
                      {request?.requestedBy?.name || "Weighbridge Office"}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{request?.requestedBy?.email}</div>
                  </div>
                </Col>

                <Col xs={24} sm={8}>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px", background: "#f8fafc" }}>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Quality Lab Verification</div>
                    <div style={{ fontWeight: 800, color: request?.qcBy ? "#8b5cf6" : "#94a3b8", fontSize: "0.95rem", marginTop: 4 }}>
                      {request?.qcBy?.name || "Pending Quality Review"}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      {request?.qcBy ? `Approved on ${formatDate(request.qcBy.timestamp)}` : "Awaiting Lab Parameters"}
                    </div>
                  </div>
                </Col>

                <Col xs={24} sm={8}>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px", background: "#f8fafc" }}>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Finance Settlement</div>
                    <div style={{ fontWeight: 800, color: request?.financeBy ? "#10b981" : "#94a3b8", fontSize: "0.95rem", marginTop: 4 }}>
                      {request?.financeBy?.name || "Pending Finance Settlement"}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      {request?.financeBy ? `Authorized on ${formatDate(request.financeBy.timestamp)}` : "Awaiting Final Signoff"}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          </div>
        </Form>
      )}

      {/* Mode 2: Official Corporate Structured Voucher Format */}
      {viewTab === "voucher" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            background: "#ffffff",
            border: "1.5px solid #0f172a",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
            maxWidth: 1060,
            width: "100%",
            margin: "0 auto",
            padding: isMobile ? "16px 12px" : "32px 36px",
            borderRadius: 8,
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000",
            overflowX: "auto"
          }}>
            {/* Voucher Top Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ width: 230 }}>
                <div style={{ fontWeight: 800, fontSize: "14px", letterSpacing: "0.02em" }}>HAYLEYS AVENTURA (PVT) LTD</div>
                <div style={{ fontSize: "10.5px", color: "#475569", marginTop: 2 }}>Quality Assurance & Raw Material Receiving</div>
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, textAlign: "center", flex: 1, letterSpacing: "-0.01em" }}>
                Coir Fiber Pith Receipt
              </div>
              <div style={{ border: "1.5px solid #000000", padding: "8px 14px", minWidth: 220, fontSize: "11px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <strong style={{ fontSize: "11.5px" }}>CR No:</strong>
                  <span style={{ fontWeight: 700, fontSize: "11.5px" }}>{request?.qualityNo || `CR-${request?.requestNo}`}</span>
                </div>
                <div><strong>REF NO:</strong> FM 10 SOP 03/D1</div>
              </div>
            </div>

            {/* Row 1: Vehicle, Consec, Date, Time, 1st, 2nd, Gross weight */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, border: "1.5px solid #000000" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "center", fontSize: "12px", borderBottom: "1.5px solid #000000" }}>
                  <th style={{ border: "1.5px solid #000000", padding: "6px 8px", width: "15%" }}>No. (Vehicle)</th>
                  <th style={{ border: "1.5px solid #000000", padding: "6px 8px", width: "13%" }}>CONSEC No</th>
                  <th style={{ border: "1.5px solid #000000", padding: "6px 8px", width: "14%" }}>DATE</th>
                  <th style={{ border: "1.5px solid #000000", padding: "6px 8px", width: "12%" }}>TIME</th>
                  <th style={{ border: "1.5px solid #000000", padding: "6px 8px", width: "15%" }}>1st Weight</th>
                  <th style={{ border: "1.5px solid #000000", padding: "6px 8px", width: "15%" }}>2nd Weight</th>
                  <th style={{ border: "1.5px solid #000000", padding: "6px 8px", width: "16%" }}>Gross Weight</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ textAlign: "center", fontWeight: "bold", fontSize: "12.5px" }}>
                  <td style={{ border: "1.5px solid #000000", padding: "6px 8px" }}>{request?.vehicleNo || "-"}</td>
                  <td style={{ border: "1.5px solid #000000", padding: "6px 8px" }}>{request?.consecNo || "01"}</td>
                  <td style={{ border: "1.5px solid #000000", padding: "6px 8px" }}>{request?.date || "-"}</td>
                  <td style={{ border: "1.5px solid #000000", padding: "6px 8px" }}>{request?.time1 || "-"}</td>
                  <td style={{ border: "1.5px solid #000000", padding: "6px 8px" }}>{request?.firstWeight ? `${request.firstWeight} kg` : "-"}</td>
                  <td style={{ border: "1.5px solid #000000", padding: "6px 8px" }}>{request?.secondWeight ? `${request.secondWeight} kg` : "-"}</td>
                  <td style={{ border: "1.5px solid #000000", padding: "6px 8px", color: "#10b981", fontSize: "13.5px" }}>
                    {request?.netWeight ? `${request.netWeight} kg` : "-"}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Row 2: Contractor Details (Left) & Deductions/Rates (Right) */}
            <div style={{ display: "flex", border: "1.5px solid #000000", marginBottom: 14 }}>
              {/* Left Column */}
              <div style={{ flex: 1, borderRight: "1.5px solid #000000", padding: "10px 14px" }}>
                <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "5px 0", width: "38%" }}>MILL</td>
                      <td style={{ fontWeight: 600 }}>{request?.mill || "CPH-Galle"}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "5px 0" }}>CONTRACT No</td>
                      <td style={{ fontWeight: 600 }}>{request?.commodity || "-"}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "5px 0" }}>CODE No.</td>
                      <td style={{ fontWeight: 600 }}>-</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "5px 0" }}>MILL OWNER</td>
                      <td style={{ fontWeight: 600 }}>{request?.supplier || "-"}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "5px 0" }}>Weight By</td>
                      <td>Weighbridge Automation</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "5px 0" }}>Received By</td>
                      <td>{request?.requestedBy?.name || "System Office"}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "5px 0" }}>Supplier rep</td>
                      <td>{request?.supplierRep || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Right Column */}
              <div style={{ flex: 1.25, padding: "10px 14px" }}>
                <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "5px 0", width: "36%" }}>H2O %</td>
                      <td>
                        <strong>{request?.h2oPercent || "9.5%"}</strong>
                        <span style={{ marginLeft: 20, color: "#64748b", fontWeight: 700 }}>AV BAG WT:</span>
                        <strong style={{ marginLeft: 6 }}>{request?.avBagWt || "0.1 kg"}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "5px 0" }}>Dedn/MT</td>
                      <td>
                        Wastage: <strong>{request?.wastage !== undefined ? request.wastage : 10} kg</strong> | Moisture: <strong>{request?.moistureCut !== undefined ? request.moistureCut : 7} kg</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "5px 0" }}>RATE (PMT)</td>
                      <td style={{ fontWeight: 700 }}>
                        Rs. {request?.rateApproval !== undefined ? request.rateApproval.toFixed(2) : "88.00"}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "5px 0" }}>PREMIUM</td>
                      <td>-</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "5px 0" }}>OIL DEDUCTION (Rs)</td>
                      <td>-</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "5px 0" }}>DEDUCTION (Adv)</td>
                      <td style={{ fontWeight: 700 }}>
                        Rs. {request?.deduction !== undefined ? request.deduction.toFixed(2) : "0.00"}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "6px 0", color: "#10b981", fontSize: "13.5px" }}>NET VALUE (Rs)</td>
                      <td style={{ fontWeight: 900, color: "#10b981", fontSize: "15px" }}>
                        Rs. {request?.netPayment ? request.netPayment.toLocaleString(undefined, {minimumFractionDigits: 2}) : liveNetPayment.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 3: Amount in Words */}
            <div style={{ border: "1.5px solid #000000", padding: "10px 14px", marginBottom: 14, fontSize: "12px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>Amount (in words):</span>
              <span style={{ fontStyle: "italic", fontWeight: 700, color: "#1e293b" }}>{amountInWords}</span>
            </div>

            {/* Row 4: Quality Sample Parameters (Left) & Payment Outcomes (Right) */}
            <div style={{ display: "flex", border: "1.5px solid #000000", marginBottom: 14 }}>
              {/* Quality Sample Parameters */}
              <div style={{ flex: 1.6, borderRight: "1.5px solid #000000", padding: "10px 12px" }}>
                <div style={{ fontWeight: 800, fontSize: "11px", marginBottom: 8, textTransform: "uppercase" }}>
                  SAMPLE EVALUATION PARAMETERS
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "center" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #000000" }}>
                      <th style={{ padding: "4px 3px" }}>Sample Lot</th>
                      <th style={{ padding: "4px 3px" }}>Sand%</th>
                      <th style={{ padding: "4px 3px" }}>+1/4"+3/8"%</th>
                      <th style={{ padding: "4px 3px" }}>FM%</th>
                      <th style={{ padding: "4px 3px" }}>Mo%Rig</th>
                      <th style={{ padding: "4px 3px" }}>Probe%</th>
                      <th style={{ padding: "4px 3px" }}>EC</th>
                      <th style={{ padding: "4px 3px" }}>pH</th>
                      <th style={{ padding: "4px 3px" }}>BSBD</th>
                      <th style={{ padding: "4px 3px" }}>Box</th>
                      <th style={{ padding: "4px 3px" }}>BD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samples.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #cbd5e1" }}>
                        <td style={{ padding: "4px 2px", fontWeight: 700 }}>{row.sampleLotNo}</td>
                        <td style={{ padding: "4px 2px" }}>{row.sand ? `${row.sand}%` : "-"}</td>
                        <td style={{ padding: "4px 2px" }}>{row.sieve1438 ? `${row.sieve1438}%` : "-"}</td>
                        <td style={{ padding: "4px 2px" }}>{row.fm ? `${row.fm}%` : "-"}</td>
                        <td style={{ padding: "4px 2px" }}>{row.moRig ? `${row.moRig}%` : "-"}</td>
                        <td style={{ padding: "4px 2px" }}>{row.avgMoistProbe ? `${row.avgMoistProbe}%` : "-"}</td>
                        <td style={{ padding: "4px 2px" }}>{row.ec || "-"}</td>
                        <td style={{ padding: "4px 2px" }}>{row.ph || "-"}</td>
                        <td style={{ padding: "4px 2px" }}>{row.bsbd || "-"}</td>
                        <td style={{ padding: "4px 2px" }}>{row.box || "-"}</td>
                        <td style={{ padding: "4px 2px" }}>{row.bd || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment Settled Outcomes */}
              <div style={{ flex: 1, padding: "10px 14px" }}>
                <div style={{ fontWeight: 800, fontSize: "11px", marginBottom: 8, textTransform: "uppercase" }}>
                  PAYMENT SETTLED OUTCOMES
                </div>
                <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "4px 0", width: "42%" }}>PAYMENT MODE</td>
                      <td style={{ fontWeight: 700 }}>{request?.paymentMode || "Cheque"}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "4px 0" }}>Cheque No</td>
                      <td style={{ fontWeight: 600 }}>{request?.chequeNo || "-"}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "4px 0" }}>Received Name</td>
                      <td style={{ fontWeight: 600 }}>{request?.receivedByName || request?.supplier || "-"}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: "4px 0" }}>NIC No.</td>
                      <td style={{ fontWeight: 600 }}>{request?.nicNo || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 5: Signatures Block */}
            <div style={{ display: "flex", border: "1.5px solid #000000", minHeight: "85px" }}>
              <div style={{ flex: 1, borderRight: "1.5px solid #000000", padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 800, fontSize: "11px" }}>QC By (Sign)</div>
                <div style={{ fontStyle: "italic", fontSize: "14px", color: "#1e40af", fontWeight: 700 }}>
                  {request?.qcBy?.name || "...................."}
                </div>
                <div style={{ fontSize: "9.5px", color: "#64748b" }}>Date: {formatDate(request?.qcBy?.timestamp)}</div>
              </div>
              
              <div style={{ flex: 1, borderRight: "1.5px solid #000000", padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 800, fontSize: "11px" }}>Payee Identified by</div>
                <div style={{ fontStyle: "italic", fontSize: "14px", color: "#1e40af", fontWeight: 700 }}>
                  {request?.financeBy?.name || "...................."}
                </div>
                <div style={{ fontSize: "9.5px", color: "#64748b" }}>Date: {formatDate(request?.financeBy?.timestamp)}</div>
              </div>
              
              <div style={{ flex: 1.2, padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 800, fontSize: "11px" }}>Payee / Authorised by</div>
                <div style={{ fontStyle: "italic", fontSize: "14px", color: "#1e40af", fontWeight: 700 }}>
                  {request?.financeBy?.name || "...................."}
                </div>
                <div style={{ fontSize: "9.5px", color: "#64748b" }}>Date: {formatDate(request?.financeBy?.timestamp)}</div>
              </div>
            </div>

            {/* Copy distribution footer */}
            <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 10, fontSize: "9.5px", color: "#64748b", fontStyle: "italic" }}>
              <span>White: Original to Supplier</span> • 
              <span>Blue: Payment Copy</span> • 
              <span>Pink: Accounts Copy</span> • 
              <span>Yellow: Premium Copy</span> • 
              <span>Green: Book Copy</span>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Action Bar */}
      <div className="sticky-action-bar">
        <Space wrap size="middle">
          {canEditQuality && (
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={submitQuality}
              loading={saving}
              style={{ background: "#8b5cf6", border: "none", fontWeight: 700, borderRadius: 8 }}
            >
              Save Quality Lab Data
            </Button>
          )}

          {canEditFinance && (
            <>
              <Button 
                type="default" 
                icon={<SaveOutlined />} 
                onClick={() => submitFinance(false)}
                loading={saving}
                style={{ fontWeight: 700, borderColor: "#10b981", color: "#10b981", borderRadius: 8 }}
              >
                Save Finance Draft
              </Button>
              <Button 
                type="primary" 
                icon={<CheckCircleOutlined />} 
                onClick={() => submitFinance(true)}
                loading={saving}
                style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "none", fontWeight: 700, borderRadius: 8 }}
              >
                Complete & Finalize
              </Button>
            </>
          )}

          {isCompleted && (
            <Tag color="success" style={{ fontWeight: 800, padding: "6px 12px", fontSize: "0.82rem" }}>
              ✓ Finalized & Locked
            </Tag>
          )}
        </Space>
      </div>
    </div>
  );
}
