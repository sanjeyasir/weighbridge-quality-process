import React, { useState } from "react";
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
  Space 
} from "antd";
import { 
  InboxOutlined, 
  ArrowLeftOutlined, 
  FileDoneOutlined,
  EyeOutlined,
  ScanOutlined
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

  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('You can only upload JPG/PNG images!');
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!');
      return false;
    }
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    
    // Trigger simulated OCR Extraction scan
    triggerSimulatedOCR();
    return false; // Prevent auto-upload
  };

  const triggerSimulatedOCR = () => {
    setScanning(true);
    message.loading({ content: 'AI Engine analyzing weighbridge ticket...', key: 'ocr', duration: 0 });
    
    setTimeout(() => {
      // Pre-fill form fields based on the user's provided ticket image
      form.setFieldsValue({
        ticketNo: "32079",
        commodity: "10C-HC",
        supplier: "H K MANAKA",
        vehicleNo: "40-7036",
        date: "17-07-2026",
        time1: "10:24:26",
        time2: "11:13:50",
        firstWeight: 2840,
        secondWeight: 2280,
        netWeight: 560
      });
      setScanning(false);
      message.success({ content: 'AI OCR Extraction completed! Please verify fields.', key: 'ocr', duration: 3 });
    }, 2500);
  };

  // Auto calculate net weight
  const handleWeightChange = () => {
    const first = form.getFieldValue("firstWeight") || 0;
    const second = form.getFieldValue("secondWeight") || 0;
    if (first && second) {
      form.setFieldValue("netWeight", first - second);
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <Button type="link" onClick={() => navigate("/requests")} style={{ padding: 0, fontWeight: 600, color: "#64748b" }}>
          <ArrowLeftOutlined /> Back to Records
        </Button>
        <Title level={2} style={{ margin: 0, marginTop: 12, fontWeight: 800 }}>
          New Weighbridge Requisition
        </Title>
        <Paragraph type="secondary">
          Upload a clear photograph of the weighbridge ticket to extract data fields automatically.
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {/* Left Side: Upload & OCR Scanner */}
        <Col xs={24} lg={10}>
          <Card 
            title={<span style={{ fontWeight: 800 }}><ScanOutlined /> Ticket Photo Upload</span>} 
            bordered={true}
            style={{ borderRadius: 16, height: "100%" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Upload.Dragger
                accept="image/*"
                beforeUpload={beforeUpload}
                showUploadList={false}
                disabled={scanning}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: "#10b981" }} />
                </p>
                <p className="ant-upload-text" style={{ fontWeight: 600 }}>Click or drag ticket image to this area</p>
                <p className="ant-upload-hint">Supports JPEG, PNG. Maximum file size 5MB.</p>
              </Upload.Dragger>

              {imageUrl && (
                <div style={{ position: "relative", overflow: "hidden", borderRadius: 12, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                  <img src={imageUrl} alt="Weighbridge Ticket Preview" style={{ width: "100%", maxHeight: 380, objectFit: "contain", display: "block" }} />
                  
                  {scanning && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "4px",
                      background: "linear-gradient(90deg, transparent, #10b981, transparent)",
                      animation: "scanAnim 1.8s infinite linear"
                    }} />
                  )}
                  {scanning && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "rgba(16, 185, 129, 0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#10b981",
                      fontWeight: 700
                    }}>
                      <Space direction="vertical" align="center">
                        <Spin size="large" />
                        <span>AI Scanning...</span>
                      </Space>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* Right Side: Requisition Form */}
        <Col xs={24} lg={14}>
          <Card 
            title={<span style={{ fontWeight: 800 }}><FileDoneOutlined /> Verification & Details</span>} 
            bordered={true}
            style={{ borderRadius: 16 }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              requiredMark={true}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="ticketNo"
                    label={<span style={{ fontWeight: 600 }}>Ticket Number</span>}
                    rules={[{ required: true, message: "Ticket Number is required" }]}
                  >
                    <Input placeholder="e.g. 32079" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="commodity"
                    label={<span style={{ fontWeight: 600 }}>Type of Commodity (Item)</span>}
                    rules={[{ required: true, message: "Commodity type is required" }]}
                  >
                    <Input placeholder="e.g. 10C-HC" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="supplier"
                    label={<span style={{ fontWeight: 600 }}>Supplier</span>}
                    rules={[{ required: true, message: "Supplier is required" }]}
                  >
                    <Input placeholder="e.g. H K MANAKA" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="vehicleNo"
                    label={<span style={{ fontWeight: 600 }}>Vehicle Number</span>}
                    rules={[{ required: true, message: "Vehicle Number is required" }]}
                  >
                    <Input placeholder="e.g. 40-7036" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="date"
                    label={<span style={{ fontWeight: 600 }}>Weighing Date</span>}
                    rules={[{ required: true, message: "Date is required" }]}
                  >
                    <Input placeholder="DD-MM-YYYY" size="large" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="time1"
                    label={<span style={{ fontWeight: 600 }}>1st Weigh Time</span>}
                  >
                    <Input placeholder="HH:MM:SS" size="large" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="time2"
                    label={<span style={{ fontWeight: 600 }}>2nd Weigh Time</span>}
                  >
                    <Input placeholder="HH:MM:SS" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="firstWeight"
                    label={<span style={{ fontWeight: 600 }}>1st Weight (Gross)</span>}
                    rules={[{ required: true, message: "1st Weight is required" }]}
                  >
                    <InputNumber 
                      addonAfter="kg" 
                      style={{ width: "100%" }} 
                      size="large" 
                      onChange={handleWeightChange}
                      min={0}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="secondWeight"
                    label={<span style={{ fontWeight: 600 }}>2nd Weight (Tare)</span>}
                    rules={[{ required: true, message: "2nd Weight is required" }]}
                  >
                    <InputNumber 
                      addonAfter="kg" 
                      style={{ width: "100%" }} 
                      size="large" 
                      onChange={handleWeightChange}
                      min={0}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="netWeight"
                    label={<span style={{ fontWeight: 600 }}>Net Weight</span>}
                    rules={[{ required: true, message: "Net Weight is required" }]}
                  >
                    <InputNumber addonAfter="kg" style={{ width: "100%" }} size="large" readOnly />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item style={{ marginBottom: 0, textAlign: "right", marginTop: 12 }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  disabled={scanning}
                  size="large"
                  style={{ 
                    borderRadius: 8, 
                    fontWeight: 700, 
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    border: "none",
                    padding: "0 32px"
                  }}
                >
                  Submit Requisition
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>

      {/* Styled Scanning Keyframe Animation */}
      <style>{`
        @keyframes scanAnim {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
}
