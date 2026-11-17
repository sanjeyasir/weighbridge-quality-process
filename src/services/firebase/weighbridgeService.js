import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  setDoc,
  updateDoc, 
  deleteDoc,
  query, 
  orderBy, 
  where,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./config";
import { createNotification } from "./notificationService";

/**
 * 100% Live Firestore Weighbridge Requests Service (No Mock Data)
 * Collection: "weighbridge_requests"
 */

/**
 * Subscribe to all live weighbridge process requests
 */
export function subscribeToWeighbridgeRequests(onData, onError) {
  try {
    const q = query(collection(db, "weighbridge_requests"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            plantCode: (data.plantCode || data.plant_code || "HES-1").trim().toUpperCase(),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
          };
        });
        onData(list);
      },
      (err) => {
        console.error("Firestore weighbridge_requests error:", err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.error("Failed to initialize weighbridge_requests listener:", err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Get all requests once
 */
export async function getWeighbridgeRequests() {
  try {
    const q = query(collection(db, "weighbridge_requests"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        plantCode: (data.plantCode || data.plant_code || "HES-1").trim().toUpperCase()
      };
    });
  } catch (err) {
    console.error("getWeighbridgeRequests error:", err);
    return [];
  }
}

/**
 * Get single request by ID
 */
export async function getRequestById(id) {
  const docRef = doc(db, "weighbridge_requests", id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    plantCode: (data.plantCode || data.plant_code || "HES-1").trim().toUpperCase()
  };
}

/**
 * Step 1: Create a new process request by Requester
 * Initial Status: "PENDING_QUALITY"
 */
export async function createWeighbridgeRequest(requestData, imageFile, currentUser) {
  const snap = await getDocs(collection(db, "weighbridge_requests"));
  const requestNo = snap.size + 1001;
  const nowIso = new Date().toISOString();
  const plantCode = (requestData.plantCode || requestData.plant_code || "HES-1").trim().toUpperCase();

  let ticketPhotoUrl = "";
  if (imageFile) {
    try {
      const storageRef = ref(storage, `tickets/${Date.now()}_${imageFile.name}`);
      const uploadRes = await uploadBytes(storageRef, imageFile);
      ticketPhotoUrl = await getDownloadURL(uploadRes.ref);
    } catch (e) {
      console.warn("Storage upload failed, continuing without photo:", e);
    }
  }

  const wbtWeight = Number(requestData.wbtWeight || requestData.netWeight || 0);

  const newDoc = {
    requestNo,
    plantCode,
    ticketNo: String(requestData.ticketNo || "").trim(),
    company: requestData.company || "RILEYS",
    status: "PENDING_QUALITY",
    date: requestData.date || nowIso.slice(0, 10),
    supplier: requestData.supplier || "",
    vehicleNo: requestData.vehicleNo || "",
    driverName: requestData.driverName || "",
    material: requestData.material || requestData.commodity || "",
    grade: requestData.grade || "YJ042",
    tickMethod: requestData.tickMethod || "MMR",
    firstWeight: Number(requestData.firstWeight || 0),
    secondWeight: Number(requestData.secondWeight || 0),
    wbtWeight: wbtWeight,
    ticketPhotoUrl,
    remarks: requestData.remarks || "",
    requestedBy: {
      uid: currentUser?.uid || "anon",
      name: currentUser?.displayName || currentUser?.email?.split("@")[0] || "Requester",
      email: currentUser?.email || ""
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, "weighbridge_requests"), newDoc);

  // Notify quality team
  await createNotification({
    role: "quality",
    message: `New Request #${requestNo} submitted for Plant ${plantCode} (Ticket #${newDoc.ticketNo}). Awaiting Quality parameters.`,
    requestNo,
    requestId: docRef.id
  });

  return { id: docRef.id, ...newDoc };
}

/**
 * Step 2: Update Quality & Costing Parameters by Quality Team
 * If isDraft is true: updates quality payload as draft while preserving "PENDING_QUALITY" status
 * If isDraft is false: advances Status to "PENDING_FINANCE_OFFICER" and notifies Finance
 */
export async function updateQualityParameters(requestId, qualityData, currentUser, isDraft = false) {
  const docRef = doc(db, "weighbridge_requests", requestId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Request not found in live database.");
  const existing = snap.data();

  const wbtWeight = Number(existing.wbtWeight || existing.netWeight || 0);
  const moistureCutPct = Number(qualityData.moistureCutPercent || 0);
  const tradeCutPct = Number(qualityData.tradeCutPercent || 0);
  const moistureCutKg = Number((wbtWeight * (moistureCutPct / 100)).toFixed(2));
  const tradeCutKg = Number((wbtWeight * (tradeCutPct / 100)).toFixed(2));
  const otherDeductionKg = Number(qualityData.otherDeductionKg || 0);
  const weightForPayment = Math.max(0, Number((wbtWeight - moistureCutKg - tradeCutKg - otherDeductionKg).toFixed(2)));

  const qualityPayload = {
    samples: qualityData.samples || [],
    avgMoisturePercent: Number(qualityData.avgMoisturePercent || 0),
    passFail: qualityData.passFail || "Pass",
    dryTest: qualityData.dryTest || {},
    hacklingTest: qualityData.hacklingTest || {},
    nonConformities: qualityData.nonConformities || {},
    actionTaken: qualityData.actionTaken || "",
    moistureCutPercent: moistureCutPct,
    moistureCutKg: moistureCutKg,
    tradeCutPercent: tradeCutPct,
    tradeCutKg: tradeCutKg,
    otherDeductionKg: otherDeductionKg,
    weightForPayment: weightForPayment,
    isDraft: Boolean(isDraft),
    inspector: {
      uid: currentUser?.uid || "",
      name: currentUser?.displayName || currentUser?.email || "Quality Inspector",
      email: currentUser?.email || "",
      updatedAt: new Date().toISOString()
    }
  };

  const updateFields = {
    quality: qualityPayload,
    updatedAt: serverTimestamp()
  };

  if (!isDraft) {
    updateFields.status = "PENDING_FINANCE_OFFICER";
  } else {
    updateFields.status = "PENDING_QUALITY";
  }

  await updateDoc(docRef, updateFields);

  if (!isDraft) {
    await createNotification({
      role: "finance",
      message: `Quality parameters completed for Request #${existing.requestNo} (Plant ${existing.plantCode}). Awaiting Finance costing.`,
      requestNo: existing.requestNo,
      requestId
    });
  }

  return { success: true, isDraft: Boolean(isDraft) };
}

/**
 * Convenience helper to save quality parameters as draft
 */
export async function saveQualityDraft(requestId, qualityData, currentUser) {
  return updateQualityParameters(requestId, qualityData, currentUser, true);
}

/**
 * Step 3: Update Finance Costing & Rates by Finance Officer
 * Advances Status to: "PENDING_FINANCE_MANAGER"
 */
export async function updateFinanceCosting(requestId, costingData, currentUser) {
  const docRef = doc(db, "weighbridge_requests", requestId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Request not found in live database.");
  const existing = snap.data();

  const weightForPayment = Number(costingData.weightForPayment ?? existing.quality?.weightForPayment ?? existing.wbtWeight ?? 0);
  const ratePerKg = Number(costingData.ratePerKg || 0);
  const totalPayment = Number((weightForPayment * ratePerKg).toFixed(2));
  const weightForGrn = Number(costingData.weightForGrn || weightForPayment);
  const effectivePrice = weightForGrn > 0 ? Number((totalPayment / weightForGrn).toFixed(2)) : ratePerKg;

  const costingPayload = {
    weightForPayment,
    ratePerKg,
    totalPayment,
    weightForGrn,
    effectivePrice,
    costingNotes: costingData.costingNotes || "",
    officer: {
      uid: currentUser?.uid || "",
      name: currentUser?.displayName || currentUser?.email || "Finance Officer",
      email: currentUser?.email || "",
      updatedAt: new Date().toISOString()
    }
  };

  await updateDoc(docRef, {
    costing: costingPayload,
    status: "PENDING_FINANCE_MANAGER",
    updatedAt: serverTimestamp()
  });

  await createNotification({
    role: "finance",
    message: `Costing completed for Request #${existing.requestNo} (Rs ${totalPayment.toLocaleString()}). Pending Finance Manager approval.`,
    requestNo: existing.requestNo,
    requestId
  });

  return { success: true };
}

/**
 * Step 4: Finance Manager Approval or Rejection
 * If approved -> "COMPLETED" (or with payment execution)
 * If rejected -> "REJECTED"
 */
export async function approveOrRejectByFinanceManager(requestId, decision, payload, currentUser) {
  const docRef = doc(db, "weighbridge_requests", requestId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Request not found in live database.");
  const existing = snap.data();

  const isApproved = decision === "APPROVE";
  const nowIso = new Date().toISOString();

  const approvalPayload = {
    approved: isApproved,
    managerName: payload.name || currentUser?.displayName || currentUser?.email || "Finance Manager",
    managerEmail: currentUser?.email || "",
    updatedAt: nowIso,
    remarks: payload.remarks || "",
    rejectedReason: isApproved ? "" : (payload.reason || payload.remarks || "Rejected by Finance Manager")
  };

  const updateFields = {
    approval: approvalPayload,
    status: isApproved ? "COMPLETED" : "REJECTED",
    updatedAt: serverTimestamp()
  };

  if (isApproved && payload.payment) {
    updateFields.payment = {
      completed: true,
      paymentMode: payload.payment.mode || "Cheque",
      refNo: payload.payment.refNo || "CHQ-" + Math.floor(100000 + Math.random() * 900000),
      paidAmount: Number(payload.payment.amount || existing.costing?.totalPayment || 0),
      paidTo: existing.supplier,
      paidDate: nowIso.slice(0, 10),
      recordedBy: currentUser?.displayName || "Finance"
    };
  }

  await updateDoc(docRef, updateFields);

  await createNotification({
    role: "requester",
    message: isApproved 
      ? `Request #${existing.requestNo} has been APPROVED and completed by Finance Manager!`
      : `Request #${existing.requestNo} was REJECTED: ${approvalPayload.rejectedReason}`,
    requestNo: existing.requestNo,
    requestId
  });

  return { success: true, status: updateFields.status };
}

/**
 * Delete a request record
 */
export async function deleteRequest(id) {
  const docRef = doc(db, "weighbridge_requests", id);
  await deleteDoc(docRef);
  return { success: true };
}
