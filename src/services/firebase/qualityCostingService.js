import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";
import { db, isMockMode } from "./config";

// Default Configs for RILEYS and TOYO
export const DEFAULT_QC_CONFIGS = {
  RILEYS: {
    moistureCutPercent: 9.60,
    tradeCutPercent: 0.00,
    standardRatePerKg: 170.00,
    lastUpdated: new Date().toISOString(),
    updatedBy: "System Default"
  },
  TOYO: {
    moistureCutPercent: 8.50,
    tradeCutPercent: 0.00,
    standardRatePerKg: 165.00,
    lastUpdated: new Date().toISOString(),
    updatedBy: "System Default"
  }
};

// Initial Cut Percentage Audit Logs
const INITIAL_CUT_LOGS = [
  {
    id: "cut-log-1",
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    company: "RILEYS",
    cutType: "moisture", // "moisture" or "trade"
    oldValue: 10.00,
    newValue: 9.60,
    updatedBy: "Quality Head (S. Fernando)",
    reason: "Moisture calibration review per standard RM spec"
  },
  {
    id: "cut-log-2",
    timestamp: new Date(Date.now() - 86400000 * 12).toISOString(),
    company: "TOYO",
    cutType: "moisture",
    oldValue: 9.00,
    newValue: 8.50,
    updatedBy: "QC Manager (M. Silva)",
    reason: "Updated baseline for Toyo dry season intake"
  },
  {
    id: "cut-log-3",
    timestamp: new Date(Date.now() - 86400000 * 20).toISOString(),
    company: "RILEYS",
    cutType: "trade",
    oldValue: 1.00,
    newValue: 0.00,
    updatedBy: "Commercial Head",
    reason: "Waived trade cut for Grade YJ042 direct deliveries"
  }
];

// Initial Per KG Cost / Rate Logs
const INITIAL_RATE_LOGS = [
  {
    id: "rate-log-1",
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    ticketNo: "KF8079",
    company: "RILEYS",
    supplier: "U.G.FERNANDO",
    grade: "YJ042",
    ratePerKg: 170.00,
    weightForPaymentKg: 470.08,
    totalPaymentRs: 79913.60,
    recordedBy: "Finance Officer (D. Perera)",
    notes: "Approved purchase contract rate"
  },
  {
    id: "rate-log-2",
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    ticketNo: "32079",
    company: "TOYO",
    supplier: "H K MANAKA",
    grade: "10C-HC",
    ratePerKg: 165.00,
    weightForPaymentKg: 512.40,
    totalPaymentRs: 84546.00,
    recordedBy: "Costing Accountant (K. Bandara)",
    notes: "Agreed grade tariff"
  },
  {
    id: "rate-log-3",
    timestamp: new Date(Date.now() - 86400000 * 8).toISOString(),
    ticketNo: "32064",
    company: "RILEYS",
    supplier: "Hayleys DPL",
    grade: "Brown Fibre",
    ratePerKg: 172.50,
    weightForPaymentKg: 3073.60,
    totalPaymentRs: 530196.00,
    recordedBy: "Finance Officer (D. Perera)",
    notes: "Monthly supplier contract pricing"
  }
];

// Initial Sample Requests based on the Riley template format
const INITIAL_QC_REQUESTS = [
  {
    id: "qc-req-1001",
    requestNo: "QC-2026-1001",
    ticketNo: "KF8079",
    company: "RILEYS",
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    status: "COMPLETED", // DRAFT, PENDING_LOCATION_HEAD, PENDING_ACCOUNTANT, PENDING_FINANCE_MANAGER, PENDING_PAYMENT, COMPLETED
    supplier: "U.G.FERNANDO",
    lorryNo: "PX-7046",
    grade: "YJ042",
    tickMethod: "MMR", // "Box", "MMR", "Dry Test"
    wbtWeight: 520, // Net weight kg from weighbridge
    moistureCutPercent: 9.60,
    moistureCutKg: 49.92,
    moistureUnCutPercent: 0,
    moistureUnCutKg: 0,
    tradeCutPercent: 0.00,
    tradeCutKg: 0.00,
    otherDeductionKg: 0,
    weightForPayment: 470.08, // 520 - 49.92
    ratePerKg: 170.00,
    totalPayment: 79913.60, // 470.08 * 170
    weightForGrn: 470.08,
    effectivePrice: 170.00,
    remarks: "Moisture within acceptable tolerance. Fibre quality approved.",
    samples: [
      { sampleNo: "S1", moisture: 29.6, weight: 100, length: 15, noOfStrings: 4, brkStrength: 45, runnage: 120, warp: 10, weft: 12, ropeDiameter: 8, noOfTwist: 15 },
      { sampleNo: "S2", moisture: 29.4, weight: 102, length: 15, noOfStrings: 4, brkStrength: 46, runnage: 122, warp: 10, weft: 11, ropeDiameter: 8, noOfTwist: 15 },
      { sampleNo: "S3", moisture: 29.8, weight: 99, length: 16, noOfStrings: 4, brkStrength: 44, runnage: 119, warp: 11, weft: 12, ropeDiameter: 8, noOfTwist: 16 },
      { sampleNo: "S4", moisture: 29.5, weight: 101, length: 15, noOfStrings: 4, brkStrength: 45, runnage: 121, warp: 10, weft: 12, ropeDiameter: 8, noOfTwist: 15 },
      { sampleNo: "S5", moisture: 29.7, weight: 100, length: 16, noOfStrings: 4, brkStrength: 47, runnage: 120, warp: 10, weft: 11, ropeDiameter: 8, noOfTwist: 15 }
    ],
    avgMoisturePercent: 29.60,
    passFail: "Pass",
    dryTest: {
      weight: 100,
      weightAfterDry: 70.4,
      actualLossMoisture: 29.6
    },
    hacklingTest: {
      boPercent: 5.0,
      sfPercent: 3.5,
      pithPercent: 1.0,
      dustPercent: 0.5,
      qualityComment: "Good"
    },
    nonConformities: {
      highMoisture: false,
      offColour: false,
      veryPithy: false,
      foreignMatters: false,
      other: false,
      details: ""
    },
    actionTaken: "Accepted as standard grade fibre with agreed moisture deduction.",
    intakeQc: {
      signed: true,
      name: "S. Fernando (QC Officer)",
      timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(),
      notes: "Sample testing completed per standard protocol."
    },
    locationHead: {
      approved: true,
      name: "R. Jayasinghe (Location Head)",
      timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
      remarks: "Purchase authorized."
    },
    accountant: {
      checked: true,
      name: "K. Bandara (Costing Accountant)",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      remarks: "Deduction calculations and GRN weight verified."
    },
    financeManager: {
      approved: true,
      name: "M. De Silva (Finance Manager)",
      timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      remarks: "Payment voucher authorized."
    },
    payment: {
      completed: true,
      paymentMode: "Cheque",
      refNo: "CHQ-890214",
      paidAmount: 79913.60,
      paidTo: "U.G.FERNANDO",
      paidDate: new Date().toISOString().slice(0, 10),
      recordedBy: "Cashier (W. Senanayake)"
    }
  },
  {
    id: "qc-req-1002",
    requestNo: "QC-2026-1002",
    ticketNo: "32079",
    company: "TOYO",
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    status: "PENDING_FINANCE_MANAGER",
    supplier: "H K MANAKA",
    lorryNo: "40-7036",
    grade: "10C-HC",
    tickMethod: "Box",
    wbtWeight: 560,
    moistureCutPercent: 8.50,
    moistureCutKg: 47.60,
    moistureUnCutPercent: 0,
    moistureUnCutKg: 0,
    tradeCutPercent: 0.00,
    tradeCutKg: 0.00,
    otherDeductionKg: 0,
    weightForPayment: 512.40,
    ratePerKg: 165.00,
    totalPayment: 84546.00,
    weightForGrn: 512.40,
    effectivePrice: 165.00,
    remarks: "Toyo delivery inspected at scale.",
    samples: [
      { sampleNo: "S1", moisture: 21.0, weight: 100, length: 14, noOfStrings: 4, brkStrength: 42, runnage: 115, warp: 9, weft: 10, ropeDiameter: 7, noOfTwist: 14 },
      { sampleNo: "S2", moisture: 20.0, weight: 100, length: 14, noOfStrings: 4, brkStrength: 43, runnage: 116, warp: 9, weft: 10, ropeDiameter: 7, noOfTwist: 14 },
      { sampleNo: "S3", moisture: 22.0, weight: 101, length: 14, noOfStrings: 4, brkStrength: 41, runnage: 114, warp: 10, weft: 11, ropeDiameter: 7, noOfTwist: 14 }
    ],
    avgMoisturePercent: 21.00,
    passFail: "Pass",
    dryTest: {
      weight: 100,
      weightAfterDry: 79.0,
      actualLossMoisture: 21.0
    },
    hacklingTest: {
      boPercent: 4.0,
      sfPercent: 3.0,
      pithPercent: 0.8,
      dustPercent: 0.4,
      qualityComment: "Good"
    },
    nonConformities: {
      highMoisture: false,
      offColour: false,
      veryPithy: false,
      foreignMatters: false,
      other: false,
      details: ""
    },
    actionTaken: "Approved for processing.",
    intakeQc: {
      signed: true,
      name: "T. Jayakody (Intake QC)",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      notes: "Toyo quality requirements met."
    },
    locationHead: {
      approved: true,
      name: "R. Jayasinghe (Location Head)",
      timestamp: new Date(Date.now() - 3600000 * 1.2).toISOString(),
      remarks: "Approved for finance verification."
    },
    accountant: {
      checked: true,
      name: "K. Bandara (Costing Accountant)",
      timestamp: new Date(Date.now() - 3600000 * 0.5).toISOString(),
      remarks: "Checked and rate confirmed against schedule."
    },
    financeManager: {
      approved: false,
      name: "",
      timestamp: null,
      remarks: ""
    },
    payment: {
      completed: false,
      paymentMode: "",
      refNo: "",
      paidAmount: 0,
      paidTo: "",
      paidDate: "",
      recordedBy: ""
    }
  },
  {
    id: "qc-req-1003",
    requestNo: "QC-2026-1003",
    ticketNo: "32085",
    company: "RILEYS",
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    status: "PENDING_LOCATION_HEAD",
    supplier: "M N PERERA",
    lorryNo: "WP-KH-9021",
    grade: "Coco Peat Blocks",
    tickMethod: "Box",
    wbtWeight: 650,
    moistureCutPercent: 9.60,
    moistureCutKg: 62.40,
    moistureUnCutPercent: 0,
    moistureUnCutKg: 0,
    tradeCutPercent: 0.00,
    tradeCutKg: 0.00,
    otherDeductionKg: 0,
    weightForPayment: 587.60,
    ratePerKg: 155.00,
    totalPayment: 91078.00,
    weightForGrn: 587.60,
    effectivePrice: 155.00,
    remarks: "Initial QC and Costing entry completed.",
    samples: [
      { sampleNo: "S1", moisture: 19.5, weight: 100, length: 12, noOfStrings: 4, brkStrength: 40, runnage: 110, warp: 8, weft: 9, ropeDiameter: 7, noOfTwist: 13 },
      { sampleNo: "S2", moisture: 20.1, weight: 100, length: 12, noOfStrings: 4, brkStrength: 41, runnage: 112, warp: 8, weft: 9, ropeDiameter: 7, noOfTwist: 13 }
    ],
    avgMoisturePercent: 19.80,
    passFail: "Pass",
    dryTest: {
      weight: 100,
      weightAfterDry: 80.2,
      actualLossMoisture: 19.8
    },
    hacklingTest: {
      boPercent: 4.5,
      sfPercent: 3.2,
      pithPercent: 1.2,
      dustPercent: 0.6,
      qualityComment: "Average"
    },
    nonConformities: {
      highMoisture: false,
      offColour: false,
      veryPithy: false,
      foreignMatters: false,
      other: false,
      details: ""
    },
    actionTaken: "Awaiting Location Head review.",
    intakeQc: {
      signed: true,
      name: "S. Fernando (QC Officer)",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      notes: "Samples inspected."
    },
    locationHead: {
      approved: false,
      name: "",
      timestamp: null,
      remarks: ""
    },
    accountant: {
      checked: false,
      name: "",
      timestamp: null,
      remarks: ""
    },
    financeManager: {
      approved: false,
      name: "",
      timestamp: null,
      remarks: ""
    },
    payment: {
      completed: false,
      paymentMode: "",
      refNo: "",
      paidAmount: 0,
      paidTo: "",
      paidDate: "",
      recordedBy: ""
    }
  }
];

// Helper to initialize local storage
function initLocalStorage() {
  if (!localStorage.getItem("mock_qc_configs")) {
    localStorage.setItem("mock_qc_configs", JSON.stringify(DEFAULT_QC_CONFIGS));
  }
  if (!localStorage.getItem("mock_qc_cut_logs")) {
    localStorage.setItem("mock_qc_cut_logs", JSON.stringify(INITIAL_CUT_LOGS));
  }
  if (!localStorage.getItem("mock_qc_rate_logs")) {
    localStorage.setItem("mock_qc_rate_logs", JSON.stringify(INITIAL_RATE_LOGS));
  }
  if (!localStorage.getItem("mock_qc_requests")) {
    localStorage.setItem("mock_qc_requests", JSON.stringify(INITIAL_QC_REQUESTS));
  }
}

if (typeof window !== "undefined") {
  initLocalStorage();
}

/**
 * Get current configurable cut percentages for Rileys & Toyo
 */
export async function getCompanyConfigs() {
  if (isMockMode) {
    const raw = localStorage.getItem("mock_qc_configs");
    return raw ? JSON.parse(raw) : DEFAULT_QC_CONFIGS;
  }
  try {
    const snap = await getDoc(doc(db, "quality_costing_configs", "master"));
    if (snap.exists()) return snap.data();
    return DEFAULT_QC_CONFIGS;
  } catch (err) {
    console.error("Error reading QC configs:", err);
    return DEFAULT_QC_CONFIGS;
  }
}

/**
 * Update moisture or trade cut percentage and record an audit log
 */
export async function updateCutPercentageConfig(company, cutType, newValue, user, reason = "") {
  const compKey = company.toUpperCase();
  const numVal = Number(newValue);
  const nowIso = new Date().toISOString();
  const userName = user?.displayName || user?.email || "Authorized Operator";

  if (isMockMode) {
    const rawConfigs = localStorage.getItem("mock_qc_configs");
    const configs = rawConfigs ? JSON.parse(rawConfigs) : { ...DEFAULT_QC_CONFIGS };

    if (!configs[compKey]) configs[compKey] = {};
    const oldValue = cutType === "moisture" 
      ? configs[compKey].moistureCutPercent 
      : configs[compKey].tradeCutPercent;

    if (cutType === "moisture") {
      configs[compKey].moistureCutPercent = numVal;
    } else {
      configs[compKey].tradeCutPercent = numVal;
    }
    configs[compKey].lastUpdated = nowIso;
    configs[compKey].updatedBy = userName;

    localStorage.setItem("mock_qc_configs", JSON.stringify(configs));

    // Append to audit logs
    const rawLogs = localStorage.getItem("mock_qc_cut_logs");
    const logs = rawLogs ? JSON.parse(rawLogs) : [];
    const newLog = {
      id: `cut-log-${Date.now()}`,
      timestamp: nowIso,
      company: compKey,
      cutType,
      oldValue: oldValue ?? 0,
      newValue: numVal,
      updatedBy: userName,
      reason: reason || "Manual configuration update"
    };
    logs.unshift(newLog);
    localStorage.setItem("mock_qc_cut_logs", JSON.stringify(logs));
    window.dispatchEvent(new Event("mock_qc_update"));
    return { success: true, configs, newLog };
  }

  // Firestore path
  try {
    const configRef = doc(db, "quality_costing_configs", "master");
    const configSnap = await getDoc(configRef);
    const existing = configSnap.exists() ? configSnap.data() : { ...DEFAULT_QC_CONFIGS };
    const oldValue = cutType === "moisture" 
      ? existing[compKey]?.moistureCutPercent 
      : existing[compKey]?.tradeCutPercent;

    const updated = {
      ...existing,
      [compKey]: {
        ...(existing[compKey] || {}),
        [cutType === "moisture" ? "moistureCutPercent" : "tradeCutPercent"]: numVal,
        lastUpdated: nowIso,
        updatedBy: userName
      }
    };
    await setDoc(configRef, updated);

    // Save audit log to subcollection or collection
    const logRef = doc(collection(db, "quality_costing_cut_logs"));
    const newLog = {
      id: logRef.id,
      timestamp: nowIso,
      company: compKey,
      cutType,
      oldValue: oldValue ?? 0,
      newValue: numVal,
      updatedBy: userName,
      reason: reason || "Manual configuration update"
    };
    await setDoc(logRef, newLog);
    return { success: true, configs: updated, newLog };
  } catch (err) {
    console.error("Firestore update cut % error:", err);
    throw err;
  }
}

/**
 * Get Cut Percentage Audit Logs
 */
export async function getCutPercentageLogs() {
  if (isMockMode) {
    const raw = localStorage.getItem("mock_qc_cut_logs");
    const list = raw ? JSON.parse(raw) : INITIAL_CUT_LOGS;
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  try {
    const q = query(collection(db, "quality_costing_cut_logs"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Error reading cut logs:", err);
    return [];
  }
}

/**
 * Get Per KG Cost / Rate Logs
 */
export async function getRateLogs() {
  if (isMockMode) {
    const raw = localStorage.getItem("mock_qc_rate_logs");
    const list = raw ? JSON.parse(raw) : INITIAL_RATE_LOGS;
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  try {
    const q = query(collection(db, "quality_costing_rate_logs"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Error reading rate logs:", err);
    return [];
  }
}

/**
 * Add a record to Per KG Cost / Rate log
 */
export async function recordRateLog(entry) {
  const record = {
    id: `rate-log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...entry
  };

  if (isMockMode) {
    const raw = localStorage.getItem("mock_qc_rate_logs");
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    localStorage.setItem("mock_qc_rate_logs", JSON.stringify(list));
    window.dispatchEvent(new Event("mock_qc_update"));
    return record;
  }

  const ref = doc(collection(db, "quality_costing_rate_logs"));
  await setDoc(ref, { ...record, id: ref.id });
  return { ...record, id: ref.id };
}

/**
 * Subscribe to Quality & Costing daily requests
 */
export function subscribeToQualityCostingRequests(onData, onError) {
  if (isMockMode) {
    const fetchLocal = () => {
      const raw = localStorage.getItem("mock_qc_requests");
      const list = raw ? JSON.parse(raw) : INITIAL_QC_REQUESTS;
      list.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
      onData(list);
    };

    fetchLocal();
    const handleStorage = (e) => {
      if (!e.key || e.key === "mock_qc_requests" || e.key === "mock_qc_configs") {
        fetchLocal();
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("mock_qc_update", fetchLocal);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("mock_qc_update", fetchLocal);
    };
  }

  try {
    const q = query(collection(db, "quality_costing_requests"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        onData(list);
      },
      (err) => {
        console.error("Quality & Costing requests subscription error:", err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.error("Failed to subscribe to QC requests:", err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Create a new Quality & Costing Request using Ticket No and Riley/Toyo template
 */
export async function createQualityCostingRequest(payload, user) {
  const nowIso = new Date().toISOString();
  const userName = user?.displayName || user?.email || "Requester / QC";

  const nextReqNo = `QC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newDoc = {
    id: `qc-${Date.now()}-${payload.ticketNo || "ticket"}`,
    requestNo: payload.requestNo || nextReqNo,
    ticketNo: payload.ticketNo,
    company: (payload.company || "RILEYS").toUpperCase(),
    date: payload.date || nowIso.slice(0, 10),
    createdAt: nowIso,
    updatedAt: nowIso,
    status: payload.submitImmediately ? "PENDING_LOCATION_HEAD" : "DRAFT",
    
    // Particulars
    supplier: payload.supplier || "",
    lorryNo: payload.lorryNo || payload.vehicleNo || "",
    grade: payload.grade || payload.material || "Fibre Standard",
    tickMethod: payload.tickMethod || "MMR",

    // Weights & Deductions
    wbtWeight: Number(payload.wbtWeight || 0),
    moistureCutPercent: Number(payload.moistureCutPercent || 0),
    moistureCutKg: Number(payload.moistureCutKg || 0),
    moistureUnCutPercent: Number(payload.moistureUnCutPercent || 0),
    moistureUnCutKg: Number(payload.moistureUnCutKg || 0),
    tradeCutPercent: Number(payload.tradeCutPercent || 0),
    tradeCutKg: Number(payload.tradeCutKg || 0),
    otherDeductionKg: Number(payload.otherDeductionKg || 0),
    weightForPayment: Number(payload.weightForPayment || 0),
    ratePerKg: Number(payload.ratePerKg || 0),
    totalPayment: Number(payload.totalPayment || 0),
    weightForGrn: Number(payload.weightForGrn || payload.weightForPayment || 0),
    effectivePrice: Number(payload.effectivePrice || payload.ratePerKg || 0),
    remarks: payload.remarks || "",

    // Quality Samples & Tests
    samples: payload.samples || [],
    avgMoisturePercent: Number(payload.avgMoisturePercent || 0),
    passFail: payload.passFail || "Pass",
    dryTest: payload.dryTest || { weight: 0, weightAfterDry: 0, actualLossMoisture: 0 },
    hacklingTest: payload.hacklingTest || { boPercent: 0, sfPercent: 0, pithPercent: 0, dustPercent: 0, qualityComment: "Good" },
    nonConformities: payload.nonConformities || {
      highMoisture: false,
      offColour: false,
      veryPithy: false,
      foreignMatters: false,
      other: false,
      details: ""
    },
    actionTaken: payload.actionTaken || "",

    // Signatures & Workflow Tracking
    intakeQc: {
      signed: true,
      name: userName,
      timestamp: nowIso,
      notes: payload.qcNotes || "Initial QC inspection and moisture calculations recorded."
    },
    locationHead: {
      approved: false,
      name: "",
      timestamp: null,
      remarks: ""
    },
    accountant: {
      checked: false,
      name: "",
      timestamp: null,
      remarks: ""
    },
    financeManager: {
      approved: false,
      name: "",
      timestamp: null,
      remarks: ""
    },
    payment: {
      completed: false,
      paymentMode: "",
      refNo: "",
      paidAmount: 0,
      paidTo: "",
      paidDate: "",
      recordedBy: ""
    }
  };

  // Also log the rate in Per KG Cost rate log if ratePerKg is set
  if (newDoc.ratePerKg > 0) {
    await recordRateLog({
      ticketNo: newDoc.ticketNo,
      company: newDoc.company,
      supplier: newDoc.supplier,
      grade: newDoc.grade,
      ratePerKg: newDoc.ratePerKg,
      weightForPaymentKg: newDoc.weightForPayment,
      totalPaymentRs: newDoc.totalPayment,
      recordedBy: userName,
      notes: `Initiated request ${newDoc.requestNo}`
    });
  }

  if (isMockMode) {
    const raw = localStorage.getItem("mock_qc_requests");
    const list = raw ? JSON.parse(raw) : [...INITIAL_QC_REQUESTS];
    list.unshift(newDoc);
    localStorage.setItem("mock_qc_requests", JSON.stringify(list));
    window.dispatchEvent(new Event("mock_qc_update"));
    return newDoc;
  }

  const docRef = doc(collection(db, "quality_costing_requests"));
  newDoc.id = docRef.id;
  await setDoc(docRef, newDoc);
  return newDoc;
}

/**
 * Advance or Update the Approval Lifecycle Stage:
 * 1. Submit for Location Head -> PENDING_LOCATION_HEAD
 * 2. Location Head Approve -> PENDING_ACCOUNTANT
 * 3. Accountant Check -> PENDING_FINANCE_MANAGER
 * 4. Finance Manager Approve -> PENDING_PAYMENT
 * 5. Complete Payment -> COMPLETED
 */
export async function updateRequestApprovalStage(requestId, actionType, payload, user) {
  const nowIso = new Date().toISOString();
  const userName = user?.displayName || user?.email || "Authorized Signatory";

  const applyUpdate = (existing) => {
    const updated = { ...existing, updatedAt: nowIso };

    switch (actionType) {
      case "SUBMIT_FOR_APPROVAL":
        updated.status = "PENDING_LOCATION_HEAD";
        break;

      case "LOCATION_HEAD_APPROVE":
        updated.status = "PENDING_ACCOUNTANT";
        updated.locationHead = {
          approved: true,
          name: payload.name || userName,
          timestamp: nowIso,
          remarks: payload.remarks || "Purchase authorized by Location Head."
        };
        break;

      case "ACCOUNTANT_CHECK":
        updated.status = "PENDING_FINANCE_MANAGER";
        updated.accountant = {
          checked: true,
          name: payload.name || userName,
          timestamp: nowIso,
          remarks: payload.remarks || "Deductions, weights, and costing checked by Accountant."
        };
        if (payload.weightForGrn) {
          updated.weightForGrn = Number(payload.weightForGrn);
        }
        break;

      case "FINANCE_MANAGER_APPROVE":
        updated.status = "PENDING_PAYMENT";
        updated.financeManager = {
          approved: true,
          name: payload.name || userName,
          timestamp: nowIso,
          remarks: payload.remarks || "Payment approved by Finance Manager."
        };
        break;

      case "COMPLETE_PAYMENT":
        updated.status = "COMPLETED";
        updated.payment = {
          completed: true,
          paymentMode: payload.paymentMode || "Cheque",
          refNo: payload.refNo || payload.chequeNo || "CHQ-" + Math.floor(100000 + Math.random() * 900000),
          paidAmount: Number(payload.paidAmount || updated.totalPayment || 0),
          paidTo: payload.paidTo || updated.supplier,
          paidDate: payload.paidDate || nowIso.slice(0, 10),
          recordedBy: payload.recordedBy || userName
        };
        break;

      case "REJECT":
        updated.status = "REJECTED";
        updated.rejectionReason = payload.reason || "Rejected during review";
        updated.rejectedBy = userName;
        updated.rejectedAt = nowIso;
        break;

      default:
        break;
    }

    return updated;
  };

  if (isMockMode) {
    const raw = localStorage.getItem("mock_qc_requests");
    let list = raw ? JSON.parse(raw) : [...INITIAL_QC_REQUESTS];
    const idx = list.findIndex(r => r.id === requestId);
    if (idx === -1) throw new Error("Request record not found");

    const updated = applyUpdate(list[idx]);
    list[idx] = updated;
    localStorage.setItem("mock_qc_requests", JSON.stringify(list));
    window.dispatchEvent(new Event("mock_qc_update"));
    return updated;
  }

  const docRef = doc(db, "quality_costing_requests", requestId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Request record not found in database");
  const updated = applyUpdate({ id: snap.id, ...snap.data() });
  await updateDoc(docRef, updated);
  return updated;
}

/**
 * Delete a Quality & Costing Request record
 */
export async function deleteQualityCostingRequest(requestId) {
  if (isMockMode) {
    const raw = localStorage.getItem("mock_qc_requests");
    let list = raw ? JSON.parse(raw) : [];
    list = list.filter(r => r.id !== requestId);
    localStorage.setItem("mock_qc_requests", JSON.stringify(list));
    window.dispatchEvent(new Event("mock_qc_update"));
    return true;
  }

  await deleteDoc(doc(db, "quality_costing_requests", requestId));
  return true;
}

