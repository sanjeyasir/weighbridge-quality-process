import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { createWeighbridgeRequest } from "../../services/firebase/weighbridgeService";
import { 
  Card, 
  Form, 
  Input, 
  InputNumber, 
  Button, 
  Row, 
  Col, 
  Upload, 
  message, 
  Spin, 
  Typography, 
  Space, 
  Tag, 
  Alert, 
  Divider 
} from "antd";
import { 
  InboxOutlined, 
  ArrowLeftOutlined, 
  FileDoneOutlined, 
  ScanOutlined, 
  CameraOutlined, 
  CheckCircleOutlined, 
  CalculatorOutlined,
  DeleteOutlined,
  InfoCircleOutlined
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

export default function CreateRequest() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Live calculation watch
  const [calcFirstWeight, setCalcFirstWeight] = useState(0);
  const [calcSecondWeight, setCalcSecondWeight] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp';
    if (!isJpgOrPng) {
      message.error('Please select a JPG, PNG, or WEBP ticket photograph!');
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!');
      return false;
    }
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    
    // Attempt optical inspection scan (without putting fake/default dummy data if text cannot be read)
    performImageScan();
    return false; // Prevent auto-upload
  };

  const performImageScan = () => {
    setScanning(true);
    
    // Simulate optical document scanning check
    setTimeout(() => {
      setScanning(false);
      message.info("Ticket photo attached. Please enter or verify the ticket details in the form.");
    }, 1200);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImageUrl(null);
    setScanning(false);
  };

  // Auto calculate net weight
  const handleWeightChange = () => {
    const first = Number(form.getFieldValue("firstWeight")) || 0;
    const second = Number(form.getFieldValue("secondWeight")) || 0;
    setCalcFirstWeight(first);
    setCalcSecondWeight(second);
    if (first > 0 && second > 0) {
      const net = Math.max(0, first - second);
      form.setFieldValue("netWeight", net);
    } else {
      form.setFieldValue("netWeight", undefined);
    }
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      await createWeighbridgeRequest(values, imageFile, currentUser);
      message.success("Weighbridge requisition submitted successfully!");
      navigate("/requests");
    } catch (err) {
      message.error(err.message || "Failed to create requisition.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <Button 
          type="link" 
          onClick={() => navigate("/requests")} 
          style={{ padding: 0, fontWeight: 700, color: "#64748b", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <ArrowLeftOutlined /> Back to Records
        </Button>
        <h1 style={{ margin: "10px 0 0 0", fontWeight: 800, fontSize: isMobile ? "1.4rem" : "1.75rem", color: "#0f172a", letterSpacing: "-0.02em" }}>
          New Weighbridge Requisition
        </h1>
        <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: isMobile ? "0.82rem" : "0.9rem" }}>
          Attach the weighbridge ticket photograph and enter the tare, gross weight, and vehicle parameters.
        </p>
      </div>

      <Row gutter={[20, 20]}>
        {/* Left Side: Ticket Photo Upload */}
        <Col xs={24} lg={10}>
          <Card 
            title={
              <span style={{ fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <CameraOutlined style={{ color: "#10b981" }} /> Ticket Photograph
              </span>
            } 
            bordered={true}
            style={{ borderRadius: 16, height: "100%", background: "#ffffff" }}
            styles={{ body: { padding: isMobile ? 14 : 20 } }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {!imageUrl ? (
                <Upload.Dragger
                  accept="image/*"
                  beforeUpload={beforeUpload}
                  showUploadList={false}
                  disabled={scanning}
                  style={{ borderRadius: 12, padding: "28px 12px", background: "#f8fafc" }}
                >
                  <p className="ant-upload-drag-icon" style={{ marginBottom: 12 }}>
                    <CameraOutlined style={{ color: "#10b981", fontSize: 36 }} />
                  </p>
                  <p className="ant-upload-text" style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a", margin: "0 0 4px 0" }}>
                    {isMobile ? "Take Photo or Choose Ticket Image" : "Click or Drag Ticket Image Here"}
                  </p>
                  <p className="ant-upload-hint" style={{ fontSize: "0.78rem", color: "#94a3b8", margin: 0 }}>
                    Supports JPG, PNG, WEBP. Max size 5MB.
                  </p>
                </Upload.Dragger>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ 
                    position: "relative", 
                    overflow: "hidden", 
                    borderRadius: 12, 
                    border: scanning ? "2px solid #10b981" : "1px solid #e2e8f0", 
                    backgroundColor: "#0f172a",
                    minHeight: 220,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <img 
                      src={imageUrl} 
                      alt="Ticket Photograph" 
                      style={{ 
                        width: "100%", 
                        maxHeight: 340, 
                        objectFit: "contain", 
                        display: "block",
                        opacity: scanning ? 0.75 : 1,
                        transition: "opacity 0.3s"
                      }} 
                    />
                    
                    {scanning && <div className="laser-scanner-line" />}

                    {scanning && (
                      <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(15, 23, 42, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        fontWeight: 700,
                        backdropFilter: "blur(2px)"
                      }}>
                        <Space direction="vertical" align="center">
                          <Spin size="large" />
                          <span style={{ fontSize: "0.85rem" }}>Inspecting Document...</span>
                        </Space>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontWeight: 600 }}>
                      Photo Attached
                    </Tag>
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />} 
                      onClick={handleRemoveImage}
                      size="small"
                      style={{ fontWeight: 600 }}
                    >
                      Remove Photo
                    </Button>
                  </div>
                </div>
              )}

              <Alert
                message="Manual Entry Verification"
                description="Please fill in the official ticket number, supplier, vehicle registration, and weights from the physical ticket."
                type="info"
                showIcon
                style={{ borderRadius: 10, fontSize: "0.8rem" }}
              />
            </div>
          </Card>
        </Col>

        {/* Right Side: Requisition Form */}
        <Col xs={24} lg={14}>
          <Card 
            title={
              <span style={{ fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <FileDoneOutlined style={{ color: "#6366f1" }} /> Ticket Parameters & Verification
              </span>
            } 
            bordered={true}
            style={{ borderRadius: 16, background: "#ffffff" }}
            styles={{ body: { padding: isMobile ? 16 : 24 } }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              requiredMark={true}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="ticketNo"
                    label={<span style={{ fontWeight: 700, color: "#334155" }}>Ticket Number</span>}
                    rules={[{ required: true, message: "Ticket Number is required" }]}
                  >
                    <Input placeholder="e.g. 32079" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="commodity"
                    label={<span style={{ fontWeight: 700, color: "#334155" }}>Commodity (Item Type)</span>}
                    rules={[{ required: true, message: "Commodity type is required" }]}
                  >
                    <Input placeholder="e.g. 10C-HC" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="supplier"
                    label={<span style={{ fontWeight: 700, color: "#334155" }}>Supplier / Mill Owner</span>}
                    rules={[{ required: true, message: "Supplier name is required" }]}
                  >
                    <Input placeholder="e.g. H K MANAKA" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="vehicleNo"
                    label={<span style={{ fontWeight: 700, color: "#334155" }}>Vehicle Registration No</span>}
                    rules={[{ required: true, message: "Vehicle Number is required" }]}
                  >
                    <Input placeholder="e.g. 40-7036" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="date"
                    label={<span style={{ fontWeight: 700, color: "#334155" }}>Weighing Date</span>}
                    rules={[{ required: true, message: "Date is required" }]}
                  >
                    <Input placeholder="DD-MM-YYYY" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={8}>
                  <Form.Item
                    name="time1"
                    label={<span style={{ fontWeight: 700, color: "#334155" }}>1st Weigh Time</span>}
                  >
                    <Input placeholder="10:24:26" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={8}>
                  <Form.Item
                    name="time2"
                    label={<span style={{ fontWeight: 700, color: "#334155" }}>2nd Weigh Time</span>}
                  >
                    <Input placeholder="11:13:50" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              {/* Weight Breakdown Section */}
              <div style={{ 
                background: "#f8fafc", 
                borderRadius: 12, 
                padding: "16px 14px", 
                border: "1px solid #e2e8f0", 
                marginBottom: 20 
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#0f172a", fontSize: "0.85rem", marginBottom: 12 }}>
                  <CalculatorOutlined style={{ color: "#10b981" }} />
                  Weight Measurements & Auto-Calculation
                </div>

                <Row gutter={12}>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="firstWeight"
                      label={<span style={{ fontWeight: 600, fontSize: "0.8rem" }}>1st Weight (Gross)</span>}
                      rules={[{ required: true, message: "Gross weight is required" }]}
                      style={{ marginBottom: isMobile ? 12 : 0 }}
                    >
                      <InputNumber 
                        addonAfter="kg" 
                        style={{ width: "100%" }} 
                        size="large" 
                        onChange={handleWeightChange}
                        min={0}
                        placeholder="e.g. 2840"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="secondWeight"
                      label={<span style={{ fontWeight: 600, fontSize: "0.8rem" }}>2nd Weight (Tare)</span>}
                      rules={[{ required: true, message: "Tare weight is required" }]}
                      style={{ marginBottom: isMobile ? 12 : 0 }}
                    >
                      <InputNumber 
                        addonAfter="kg" 
                        style={{ width: "100%" }} 
                        size="large" 
                        onChange={handleWeightChange}
                        min={0}
                        placeholder="e.g. 2280"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="netWeight"
                      label={<span style={{ fontWeight: 600, fontSize: "0.8rem", color: "#10b981" }}>Net Weight (Auto)</span>}
                      rules={[{ required: true, message: "Net Weight is required" }]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber 
                        addonAfter="kg" 
                        style={{ width: "100%", fontWeight: 800, color: "#10b981" }} 
                        size="large" 
                        readOnly 
                        placeholder="Auto calculated"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
                <Space style={{ width: isMobile ? "100%" : "auto", justifyContent: "flex-end" }}>
                  <Button 
                    onClick={() => navigate("/requests")}
                    style={{ borderRadius: 8 }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading}
                    disabled={scanning}
                    size="large"
                    style={{ 
                      borderRadius: 10, 
                      fontWeight: 700, 
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      border: "none",
                      padding: "0 28px",
                      boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)"
                    }}
                  >
                    Submit Requisition
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
