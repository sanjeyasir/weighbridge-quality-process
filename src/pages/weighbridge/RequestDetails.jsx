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
  Card
} from "antd";
import { 
  ArrowLeftOutlined, 
  PrinterOutlined, 
  SaveOutlined, 
  CheckCircleOutlined,
  EditOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;

function formatDate(timestamp) {
  if (!timestamp) return "";
  try {
    if (timestamp && typeof timestamp.toDate === "function") {
      return timestamp.toDate().toLocaleDateString();
    }
    if (timestamp && timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
  } catch (e) {
    return "";
  }
}

export default function RequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Local state for samples table inputs
  const [samples, setSamples] = useState([
    { sampleLotNo: "24", sand: "", sieve1438: "", fm: "", moRig: "", avgMoistProbe: "", ec: "", ph: "", bsbd: "", box: "", bd: "" },
    { sampleLotNo: "56", sand: "", sieve1438: "", fm: "", moRig: "", avgMoistProbe: "", ec: "", ph: "", bsbd: "", box: "", bd: "" },
    { sampleLotNo: "90", sand: "", sieve1438: "", fm: "", moRig: "", avgMoistProbe: "", ec: "", ph: "", bsbd: "", box: "", bd: "" }
  ]);

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
      
      // Initialize state
      if (data.samples && data.samples.length > 0) {
        setSamples(data.samples);
      }

      form.setFieldsValue({
        qualityNo: data.qualityNo || "52062",
        mill: data.mill || "CPH-Galle",
        qualityDate: data.qualityDate || data.date || "20/02/17",
        consecNo: data.consecNo || "",
        time1: data.time1 || "",
        time2: data.time2 || "",
        
        // Quality fields
        h2oPercent: data.h2oPercent || "9.5%",
        avBagWt: data.avBagWt || "0.1 kg",
        bagsOwingBf: data.bagsOwingBf || "",
        issued: data.issued || "",
        receivedBags: data.receivedBags || "",
        balance: data.balance || "",
        bagsOwingCf: data.bagsOwingCf || "",
        dnNo: data.dnNo || "",

        // Finance fields
        rateApproval: data.rateApproval !== undefined ? data.rateApproval : 88.00,
        wastage: data.wastage !== undefined ? data.wastage : 10,
        moistureCut: data.moistureCut !== undefined ? data.moistureCut : 7,
        netWeightQty: data.netWeightQty || 543,
        grossPayment: data.grossPayment || 47784.50,
        deduction: data.deduction !== undefined ? data.deduction : 0,
        netPayment: data.netPayment || 47784.50,
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

  const fillDemoSamples = () => {
    setSamples([
      { sampleLotNo: "24", sand: "1.0", sieve1438: "7.8", fm: "8.6", moRig: "9.0", avgMoistProbe: "21.0", ec: "1.0", ph: "7.8", bsbd: "5.8", box: "2.1", bd: "0.09612" },
      { sampleLotNo: "56", sand: "1.0", sieve1438: "8.0", fm: "8.5", moRig: "9.2", avgMoistProbe: "20.0", ec: "0.9", ph: "7.6", bsbd: "5.7", box: "2.0", bd: "0.09520" },
      { sampleLotNo: "90", sand: "1.0", sieve1438: "7.5", fm: "8.7", moRig: "8.8", avgMoistProbe: "22.0", ec: "1.1", ph: "7.9", bsbd: "5.9", box: "2.2", bd: "0.09705" }
    ]);
    form.setFieldsValue({
      h2oPercent: "9.5%",
      avBagWt: "0.1 kg",
      bagsOwingBf: "95 Bags",
      issued: "0",
      receivedBags: "95",
      balance: "0",
      bagsOwingCf: "0",
      dnNo: "DN-44021"
    });
    message.success("Populated reference quality details from paper copy!");
  };

  const handleSampleCellChange = (idx, field, value) => {
    const next = [...samples];
    next[idx] = { ...next[idx], [field]: value };
    setSamples(next);
  };

  // Trigger calculations dynamically
  const handleFinanceCalc = () => {
    const rate = form.getFieldValue("rateApproval") || 0;
    const wastage = form.getFieldValue("wastage") || 0;
    const moistureCut = form.getFieldValue("moistureCut") || 0;
    const deduction = form.getFieldValue("deduction") || 0;

    const netWeight = request.netWeight || 0;
    const netQty = netWeight - wastage - moistureCut;
    const grossVal = netQty * rate;
    const netVal = grossVal - deduction;

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
        message.success("Requisition successfully Completed & locked!");
      } else {
        message.success("Finance draft details saved!");
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
        <Spin size="large" tip="Loading pith receipt details..." />
      </div>
    );
  }

  const isQualityRole = currentUser?.role === "quality" || currentUser?.role === "admin";
  const isFinanceRole = currentUser?.role === "finance" || currentUser?.role === "admin";

  const isCompleted = request.status === "Completed";
  
  // Quality fields are editable if the user has Quality privileges AND request is not finalized.
  const canEditQuality = isQualityRole && !isCompleted;
  
  // Finance fields are editable if the user has Finance privileges AND request is not finalized.
  const canEditFinance = isFinanceRole && !isCompleted;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Import script font for handwritten signatures */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');
        
        .receipt-view {
          background-color: #f8fafc;
          padding: 24px;
          min-height: 100vh;
        }
        
        .receipt-paper {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
          max-width: 1100px;
          margin: 0 auto;
          padding: 30px;
          border-radius: 12px;
          position: relative;
          color: #000000;
          font-family: 'Times New Roman', Times, serif;
        }

        .receipt-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .receipt-title {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.02em;
          text-align: center;
          flex-grow: 1;
        }

        .receipt-meta-box {
          border: 1.5px solid #000000;
          padding: 8px 16px;
          text-align: left;
          min-width: 250px;
          font-size: 11px;
        }

        .pith-receipt-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }

        .pith-receipt-table th,
        .pith-receipt-table td {
          border: 1.5px solid #000000;
          padding: 6px 10px;
          font-size: 13px;
          vertical-align: middle;
        }

        .pith-receipt-table th {
          background-color: #f1f5f9;
          font-weight: 800;
          text-align: center;
        }

        .nested-grid-table {
          width: 100%;
          border-collapse: collapse;
        }

        .nested-grid-table td {
          border: none;
          border-bottom: 1px solid #e2e8f0;
          padding: 8px 4px;
        }

        .nested-grid-table tr:last-child td {
          border-bottom: none;
        }

        .input-line {
          border: none !important;
          border-bottom: 1px dashed #94a3b8 !important;
          background: transparent !important;
          border-radius: 0px !important;
          width: 100%;
          padding: 0 4px !important;
          font-weight: 600;
          color: #1e293b;
        }
        
        .input-line:focus {
          border-bottom: 1px solid #10b981 !important;
          box-shadow: none !important;
        }

        .read-only-val {
          font-weight: 700;
          color: #1e293b;
        }

        .signature-font {
          font-family: 'Caveat', cursive;
          font-size: 24px;
          color: #1e40af;
          line-height: 1;
        }

        @media print {
          body {
            background: #ffffff;
            color: #000000;
          }
          .no-print {
            display: none !important;
          }
          .receipt-paper {
            border: none;
            box-shadow: none;
            padding: 0;
            margin: 0;
            max-width: 100%;
          }
        }
      `}</style>

      {/* Top action header (no-print) */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Button type="link" onClick={() => navigate("/requests")} style={{ padding: 0, fontWeight: 600, color: "#64748b" }}>
          <ArrowLeftOutlined /> Back to Records
        </Button>
        <Space>
          {canEditQuality && (
            <Button type="dashed" onClick={fillDemoSamples} icon={<EditOutlined />}>
              Auto-Fill Sample Reference
            </Button>
          )}
          
          <Button 
            type="default" 
            icon={<PrinterOutlined />} 
            onClick={() => downloadReceiptPDF(request)}
            style={{ fontWeight: 600 }}
          >
            Print Receipt
          </Button>
          
          {canEditQuality && (
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={submitQuality}
              loading={saving}
              style={{ background: "#a855f7", border: "none", fontWeight: 700 }}
            >
              Save Quality
            </Button>
          )}

          {canEditFinance && (
            <>
              <Button 
                type="default" 
                icon={<SaveOutlined />} 
                onClick={() => submitFinance(false)}
                loading={saving}
                style={{ fontWeight: 700, borderColor: "#10b981", color: "#10b981" }}
              >
                Save Finance Draft
              </Button>
              <Button 
                type="primary" 
                icon={<CheckCircleOutlined />} 
                onClick={() => submitFinance(true)}
                loading={saving}
                style={{ background: "#10b981", border: "none", fontWeight: 700 }}
              >
                Complete Requisition
              </Button>
            </>
          )}

          {isCompleted && (
            <span style={{ fontWeight: 800, padding: "4px 12px", border: "1.5px solid #059669", color: "#059669", borderRadius: 4, textTransform: "uppercase", fontSize: "11px" }}>
              ✓ Request Fully Finalized
            </span>
          )}
        </Space>
      </div>

      {/* Main unified paper layout */}
      <div className="receipt-paper">
        <Form form={form} component={false}>
          {/* Header Row */}
          <div className="receipt-header-row">
            <div style={{ width: 250 }}>
              <div style={{ fontWeight: 800, fontSize: "14px" }}>HAYLEYS AVENTURA (PVT) LTD</div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Quality Assurance & raw Material Receiving</div>
            </div>
            <div className="receipt-title">Coir Fiber Pith Receipt</div>
            <div className="receipt-meta-box">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 800 }}>CR No:</span>
                {canEditQuality ? (
                  <Form.Item name="qualityNo" noStyle>
                    <Input className="input-line" style={{ width: 100, height: 18 }} />
                  </Form.Item>
                ) : (
                  <span className="read-only-val">{request.qualityNo || `CR-${request.requestNo}`}</span>
                )}
              </div>
              <div><span style={{ fontWeight: 800 }}>REF NO:</span> FM 10 SOP 03/D1</div>
            </div>
          </div>

          {/* Table Row 1: Vehicle No, Consec, Date, Time, 1st, 2nd, Gross weight */}
          <table className="pith-receipt-table">
            <thead>
              <tr>
                <th style={{ width: "15%" }}>No.</th>
                <th style={{ width: "12%" }}>CONSEC No</th>
                <th style={{ width: "13%" }}>DATE</th>
                <th style={{ width: "12%" }}>TIME</th>
                <th style={{ width: "16%" }}>1st Weight</th>
                <th style={{ width: "16%" }}>2nd Weight</th>
                <th style={{ width: "16%" }}>Gross Weight</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ textAlign: "center", fontWeight: "bold" }}>
                <td><span className="read-only-val">{request.vehicleNo}</span></td>
                <td>
                  {canEditQuality ? (
                    <Form.Item name="consecNo" noStyle><Input className="input-line" style={{ textAlign: "center" }} /></Form.Item>
                  ) : (
                    <span className="read-only-val">{request.consecNo || "-"}</span>
                  )}
                </td>
                <td><span className="read-only-val">{request.date}</span></td>
                <td>
                  {canEditQuality ? (
                    <Form.Item name="time1" noStyle><Input className="input-line" style={{ textAlign: "center" }} /></Form.Item>
                  ) : (
                    <span className="read-only-val">{request.time1 || "-"}</span>
                  )}
                </td>
                <td><span className="read-only-val">{request.firstWeight} kg</span></td>
                <td><span className="read-only-val">{request.secondWeight} kg</span></td>
                <td><span className="read-only-val" style={{ color: "#10b981", fontSize: "14px" }}>{request.netWeight} kg</span></td>
              </tr>
            </tbody>
          </table>

          {/* Table Row 2: Main Body Split into Contractor (Left) and Billing calculations (Right) */}
          <div style={{ display: "flex", gap: 0, border: "1.5px solid #000000", borderTop: "none", marginBottom: 12 }}>
            {/* Left section: Contractor Details */}
            <div style={{ flex: 1, borderRight: "1.5px solid #000000", padding: "10px" }}>
              <table className="nested-grid-table">
                <tbody>
                  <tr>
                    <td style={{ width: "40%", fontWeight: 800 }}>MILL</td>
                    <td>
                      {canEditQuality ? (
                        <Form.Item name="mill" noStyle><Input className="input-line" /></Form.Item>
                      ) : (
                        <span className="read-only-val">{request.mill || "CPH-Galle"}</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 800 }}>CONTRACT No</td>
                    <td><span className="read-only-val">{request.commodity}</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 800 }}>CODE No.</td>
                    <td><span className="read-only-val">-</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 800 }}>MILL OWNER</td>
                    <td><span className="read-only-val">{request.supplier}</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 800 }}>Weight By</td>
                    <td><span className="read-only-val">Weighbridge Automation</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 800 }}>Received By</td>
                    <td><span className="read-only-val">{request.requestedBy?.name || "System Office"}</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 800 }}>Supplier rep</td>
                    <td>
                      {canEditQuality ? (
                        <Form.Item name="supplierRep" noStyle><Input className="input-line" /></Form.Item>
                      ) : (
                        <span className="read-only-val">{request.supplierRep || "-"}</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right section: Deductions, calculations, and Payout Rates */}
            <div style={{ flex: 1.2, padding: "10px" }}>
              <table className="nested-grid-table">
                <tbody>
                  <tr>
                    <td style={{ width: "40%", fontWeight: 800 }}>H2O %</td>
                    <td colspan="2">
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {canEditQuality ? (
                          <Form.Item name="h2oPercent" noStyle><Input className="input-line" style={{ width: 80 }} placeholder="9.5%" /></Form.Item>
                        ) : (
                          <span className="read-only-val">{request.h2oPercent || "9.5%"}</span>
                        )}
                        <span style={{ fontSize: "11px", color: "#64748b" }}>AV BAG WT:</span>
                        {canEditQuality ? (
                          <Form.Item name="avBagWt" noStyle><Input className="input-line" style={{ width: 80 }} placeholder="0.1 kg" /></Form.Item>
                        ) : (
                          <span className="read-only-val">{request.avBagWt || "0.1 kg"}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 800 }}>Dedn/MT</td>
                    <td colspan="2">
                      <div style={{ display: "flex", gap: 12, width: "100%" }}>
                        <div>
                          <span style={{ fontSize: "11px", display: "block", color: "#64748b" }}>Wastage cut</span>
                          {canEditFinance ? (
                            <Form.Item name="wastage" noStyle><InputNumber className="input-line" onChange={handleFinanceCalc} /></Form.Item>
                          ) : (
                            <span className="read-only-val">{request.wastage !== undefined ? `${request.wastage} kg` : "-"}</span>
                          )}
                        </div>
                        <div>
                          <span style={{ fontSize: "11px", display: "block", color: "#64748b" }}>Moisture cut</span>
                          {canEditFinance ? (
                            <Form.Item name="moistureCut" noStyle><InputNumber className="input-line" onChange={handleFinanceCalc} /></Form.Item>
                          ) : (
                            <span className="read-only-val">{request.moistureCut !== undefined ? `${request.moistureCut} kg` : "-"}</span>
                          )}
                        </div>
                        <div>
                          <span style={{ fontSize: "11px", display: "block", color: "#64748b" }}>Net Weight</span>
                          <span className="read-only-val" style={{ color: "#10b981" }}>{request.netWeightQty || "-"} kg</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 800 }}>RATE (PMT)</td>
                    <td>
                      {canEditFinance ? (
                        <Form.Item name="rateApproval" noStyle><InputNumber className="input-line" onChange={handleFinanceCalc} /></Form.Item>
                      ) : (
                        <span className="read-only-val">{request.rateApproval !== undefined ? `Rs. ${request.rateApproval.toFixed(2)}` : "-"}</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 800 }}>PREMIUM</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 800 }}>OIL DEDUCTION (Rs)</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 800 }}>DEDUCTION (Adv)</td>
                    <td>
                      {canEditFinance ? (
                        <Form.Item name="deduction" noStyle><InputNumber className="input-line" onChange={handleFinanceCalc} /></Form.Item>
                      ) : (
                        <span className="read-only-val">{request.deduction !== undefined ? `Rs. ${request.deduction.toFixed(2)}` : "-"}</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 800, fontSize: "14px", color: "#10b981" }}>NET VALUE (Rs)</td>
                    <td>
                      <span className="read-only-val" style={{ fontSize: "16px", color: "#10b981" }}>
                        {request.netPayment ? `Rs. ${request.netPayment.toLocaleString(undefined, {minimumFractionDigits: 2})}` : "-"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Row 3: Amount in words (full span border box) */}
          <div style={{ border: "1.5px solid #000000", padding: "10px", marginBottom: 12 }}>
            <span style={{ fontWeight: 800, marginRight: 10 }}>Amount (in words):</span>
            <span className="read-only-val" style={{ textTransform: "capitalize" }}>
              {request.netPayment 
                ? "Forty seven thousand seven hundred eighty four rupees and fifty cents only" 
                : "...................................................................................................................................................."}
            </span>
          </div>

          {/* Table Row 4: Split bottom block (Samples on Left, Payment outcomes on Right) */}
          <div style={{ display: "flex", gap: 0, border: "1.5px solid #000000", borderTop: "none", marginBottom: 20 }}>
            {/* Left Box: Quality Sample parameter grid */}
            <div style={{ flex: 1.5, borderRight: "1.5px solid #000000", padding: "10px" }}>
              <div style={{ fontWeight: 800, marginBottom: 8, fontSize: "12px", textTransform: "uppercase" }}>Sample evaluation parameters</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid #000000" }}>
                    <th style={{ background: "#f8fafc", fontSize: "10px", padding: "4px" }}>Sample lot</th>
                    <th style={{ background: "#f8fafc", fontSize: "10px", padding: "4px" }}>Sand%</th>
                    <th style={{ background: "#f8fafc", fontSize: "10px", padding: "4px" }}>+1/4"+3/8"%</th>
                    <th style={{ background: "#f8fafc", fontSize: "10px", padding: "4px" }}>FM%</th>
                    <th style={{ background: "#f8fafc", fontSize: "10px", padding: "4px" }}>Mo%Rig</th>
                    <th style={{ background: "#f8fafc", fontSize: "10px", padding: "4px" }}>Probe%</th>
                    <th style={{ background: "#f8fafc", fontSize: "10px", padding: "4px" }}>EC</th>
                    <th style={{ background: "#f8fafc", fontSize: "10px", padding: "4px" }}>pH</th>
                    <th style={{ background: "#f8fafc", fontSize: "10px", padding: "4px" }}>BSBD</th>
                    <th style={{ background: "#f8fafc", fontSize: "10px", padding: "4px" }}>Box</th>
                    <th style={{ background: "#f8fafc", fontSize: "10px", padding: "4px" }}>BD</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #cbd5e1" }}>
                      <td style={{ padding: "4px", textAlign: "center" }}>
                        {canEditQuality ? (
                          <Input value={row.sampleLotNo} onChange={(e) => handleSampleCellChange(idx, "sampleLotNo", e.target.value)} className="input-line" style={{ textAlign: "center" }} />
                        ) : (
                          <span className="read-only-val">{row.sampleLotNo}</span>
                        )}
                      </td>
                      <td style={{ padding: "4px", textAlign: "center" }}>
                        {canEditQuality ? (
                          <Input value={row.sand} onChange={(e) => handleSampleCellChange(idx, "sand", e.target.value)} className="input-line" style={{ textAlign: "center" }} />
                        ) : (
                          <span className="read-only-val">{row.sand ? `${row.sand}%` : "-"}</span>
                        )}
                      </td>
                      <td style={{ padding: "4px", textAlign: "center" }}>
                        {canEditQuality ? (
                          <Input value={row.sieve1438} onChange={(e) => handleSampleCellChange(idx, "sieve1438", e.target.value)} className="input-line" style={{ textAlign: "center" }} />
                        ) : (
                          <span className="read-only-val">{row.sieve1438 ? `${row.sieve1438}%` : "-"}</span>
                        )}
                      </td>
                      <td style={{ padding: "4px", textAlign: "center" }}>
                        {canEditQuality ? (
                          <Input value={row.fm} onChange={(e) => handleSampleCellChange(idx, "fm", e.target.value)} className="input-line" style={{ textAlign: "center" }} />
                        ) : (
                          <span className="read-only-val">{row.fm ? `${row.fm}%` : "-"}</span>
                        )}
                      </td>
                      <td style={{ padding: "4px", textAlign: "center" }}>
                        {canEditQuality ? (
                          <Input value={row.moRig} onChange={(e) => handleSampleCellChange(idx, "moRig", e.target.value)} className="input-line" style={{ textAlign: "center" }} />
                        ) : (
                          <span className="read-only-val">{row.moRig ? `${row.moRig}%` : "-"}</span>
                        )}
                      </td>
                      <td style={{ padding: "4px", textAlign: "center" }}>
                        {canEditQuality ? (
                          <Input value={row.avgMoistProbe} onChange={(e) => handleSampleCellChange(idx, "avgMoistProbe", e.target.value)} className="input-line" style={{ textAlign: "center" }} />
                        ) : (
                          <span className="read-only-val">{row.avgMoistProbe ? `${row.avgMoistProbe}%` : "-"}</span>
                        )}
                      </td>
                      <td style={{ padding: "4px", textAlign: "center" }}>
                        {canEditQuality ? (
                          <Input value={row.ec} onChange={(e) => handleSampleCellChange(idx, "ec", e.target.value)} className="input-line" style={{ textAlign: "center" }} />
                        ) : (
                          <span className="read-only-val">{row.ec || "-"}</span>
                        )}
                      </td>
                      <td style={{ padding: "4px", textAlign: "center" }}>
                        {canEditQuality ? (
                          <Input value={row.ph} onChange={(e) => handleSampleCellChange(idx, "ph", e.target.value)} className="input-line" style={{ textAlign: "center" }} />
                        ) : (
                          <span className="read-only-val">{row.ph || "-"}</span>
                        )}
                      </td>
                      <td style={{ padding: "4px", textAlign: "center" }}>
                        {canEditQuality ? (
                          <Input value={row.bsbd} onChange={(e) => handleSampleCellChange(idx, "bsbd", e.target.value)} className="input-line" style={{ textAlign: "center" }} />
                        ) : (
                          <span className="read-only-val">{row.bsbd || "-"}</span>
                        )}
                      </td>
                      <td style={{ padding: "4px", textAlign: "center" }}>
                        {canEditQuality ? (
                          <Input value={row.box} onChange={(e) => handleSampleCellChange(idx, "box", e.target.value)} className="input-line" style={{ textAlign: "center" }} />
                        ) : (
                          <span className="read-only-val">{row.box || "-"}</span>
                        )}
                      </td>
                      <td style={{ padding: "4px", textAlign: "center" }}>
                        {canEditQuality ? (
                          <Input value={row.bd} onChange={(e) => handleSampleCellChange(idx, "bd", e.target.value)} className="input-line" style={{ textAlign: "center" }} />
                        ) : (
                          <span className="read-only-val">{row.bd || "-"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right Box: Finance & Payment settlements */}
            <div style={{ flex: 1, padding: "10px" }}>
              <div style={{ fontWeight: 800, marginBottom: 8, fontSize: "12px", textTransform: "uppercase" }}>Payment Settled outcomes</div>
              
              <table className="nested-grid-table">
                <tbody>
                  <tr>
                    <td style={{ width: "40%", fontWeight: 800 }}>PAYMENT MODE</td>
                    <td>
                      {canEditFinance ? (
                        <Form.Item name="paymentMode" noStyle>
                          <Radio.Group size="small">
                            <Radio value="Cheque">CHQ</Radio>
                            <Radio value="Cash">CASH</Radio>
                            <Radio value="DPS">DPS</Radio>
                          </Radio.Group>
                        </Form.Item>
                      ) : (
                        <span className="read-only-val">{request.paymentMode || "-"}</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 800 }}>Cheque No</td>
                    <td>
                      {canEditFinance ? (
                        <Form.Item name="chequeNo" noStyle><Input className="input-line" /></Form.Item>
                      ) : (
                        <span className="read-only-val">{request.chequeNo || "-"}</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 800 }}>Received Name</td>
                    <td>
                      {canEditFinance ? (
                        <Form.Item name="receivedByName" noStyle><Input className="input-line" /></Form.Item>
                      ) : (
                        <span className="read-only-val">{request.receivedByName || "-"}</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 800 }}>NIC No.</td>
                    <td>
                      {canEditFinance ? (
                        <Form.Item name="nicNo" noStyle><Input className="input-line" /></Form.Item>
                      ) : (
                        <span className="read-only-val">{request.nicNo || "-"}</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Row 5: Signatures Block (QC By, Payee Identified, Authorised) */}
          <div style={{ display: "flex", border: "1.5px solid #000000", minHeight: "100px" }}>
            <div style={{ flex: 1, borderRight: "1.5px solid #000000", padding: "10px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800, fontSize: "11px" }}>QC By (Sign)</div>
              <div className="signature-font">....................</div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Date: {formatDate(request.qcBy?.timestamp)}</div>
            </div>
            
            <div style={{ flex: 1, borderRight: "1.5px solid #000000", padding: "10px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800, fontSize: "11px" }}>Payee Identified by</div>
              <div className="signature-font">....................</div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Date: {formatDate(request.financeBy?.timestamp)}</div>
            </div>
            
            <div style={{ flex: 1.2, padding: "10px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800, fontSize: "11px" }}>Payee / Authorised by</div>
              <div className="signature-font">....................</div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Date: {formatDate(request.financeBy?.timestamp)}</div>
            </div>
          </div>

          {/* Copies subtitle */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, fontSize: "10px", color: "#64748b", fontStyle: "italic" }}>
            <span>Original to Supplier (White)</span> • 
            <span>Payment Copy (Blue)</span> • 
            <span>Accounts Copy (Pink)</span> • 
            <span>Premium Copy (Yellow)</span> • 
            <span>Book Copy (Green)</span>
          </div>

        </Form>
      </div>
    </div>
  );
}
