import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc,
  query, 
  orderBy,
  Timestamp 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, isMockMode } from "./config";
import { createNotification } from "./notificationService";

// Seed default requests for Mock Mode
const DEFAULT_MOCK_REQUESTS = [
  {
    id: "wb-req-1",
    requestNo: 1001,
    status: "Completed",
    ticketNo: "32079",
    commodity: "10C-HC",
    supplier: "H K MANAKA",
    vehicleNo: "40-7036",
    date: "17-07-2026",
    time1: "10:24:26",
    time2: "11:13:50",
    firstWeight: 2840,
    secondWeight: 2280,
    netWeight: 560,
    requestedBy: {
      uid: "mock-requester",
      name: "John Requester",
      email: "requester@gmail.com"
    },
    createdAt: new Date(2026, 7, 17, 10, 30).toISOString(),
    // Quality Section (Weigh1)
    qualityNo: "52062",
    mill: "CPH-Galle",
    qualityDate: "20/02/17",
    samples: [
      { sampleLotNo: "24", sand: 1.0, sieve1438: 7.8, fm: 8.6, moRig: 9.0, avgMoistProbe: 21.0, ec: 1.0, ph: 7.8, bsbd: 5.8, box: 2.1, bd: 0.09612 },
      { sampleLotNo: "56", sand: 1.0, sieve1438: 8.0, fm: 8.5, moRig: 9.2, avgMoistProbe: 20.0, ec: 0.9, ph: 7.6, bsbd: 5.7, box: 2.0, bd: 0.09520 },
      { sampleLotNo: "90", sand: 1.0, sieve1438: 7.5, fm: 8.7, moRig: 8.8, avgMoistProbe: 22.0, ec: 1.1, ph: 7.9, bsbd: 5.9, box: 2.2, bd: 0.09705 }
    ],
    qcBy: {
      name: "Sarah Quality",
      timestamp: new Date(2026, 7, 17, 12, 15).toISOString()
    },
    // Finance Section (Weigh2 latter part)
    rateApproval: 88.00,
    wastage: 10,
    moistureCut: 7,
    netWeightQty: 543,
    grossPayment: 47784.50,
    deduction: 0,
    netPayment: 47784.50,
    paymentMode: "Cheque",
    chequeNo: "CHQ-89021",
    receivedByName: "H K MANAKA",
    nicNo: "882710291V",
    financeBy: {
      name: "David Finance",
      timestamp: new Date(2026, 7, 17, 14, 0).toISOString()
    }
  },
  {
    id: "wb-req-2",
    requestNo: 1002,
    status: "Pending Quality",
    ticketNo: "32085",
    commodity: "10C",
    supplier: "M N PERERA",
    vehicleNo: "WP-KH-9021",
    date: "25-08-2026",
    time1: "08:15:00",
    time2: "09:40:00",
    firstWeight: 3100,
    secondWeight: 2450,
    netWeight: 650,
    requestedBy: {
      uid: "mock-requester",
      name: "John Requester",
      email: "requester@gmail.com"
    },
    createdAt: new Date().toISOString()
  }
];

if (isMockMode && !localStorage.getItem("mock_weighbridge_requests")) {
  localStorage.setItem("mock_weighbridge_requests", JSON.stringify(DEFAULT_MOCK_REQUESTS));
  localStorage.setItem("weighbridge_counter", "1003");
  localStorage.removeItem("mock_notifications");
}

/**
 * Creates a request for a weighbridge ticket
 */
export async function createWeighbridgeRequest(requestData, imageFile, currentUser) {
  const now = new Date();
  
  if (isMockMode) {
    const requests = JSON.parse(localStorage.getItem("mock_weighbridge_requests") || "[]");
    const counter = parseInt(localStorage.getItem("weighbridge_counter") || "1001", 10);
    
    // Simulate image uploading
    let ticketPhotoUrl = "";
    if (imageFile) {
      ticketPhotoUrl = URL.createObjectURL(imageFile); // temporary URL for local UI preview
    }

    const newRequest = {
      id: `wb-${Date.now()}`,
      requestNo: counter,
      status: "Pending Quality",
      ...requestData,
      ticketPhotoUrl,
      requestedBy: {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email.split("@")[0],
        email: currentUser.email
      },
      createdAt: now.toISOString()
    };

    requests.push(newRequest);
    localStorage.setItem("mock_weighbridge_requests", JSON.stringify(requests));
    localStorage.setItem("weighbridge_counter", String(counter + 1));
    window.dispatchEvent(new Event("storage"));

    // Add in-app notification for Quality
    await createNotification({
      role: "quality",
      message: `New request #${counter} is submitted by ${newRequest.requestedBy.name} and is pending Quality parameters.`,
      requestNo: counter,
      requestId: newRequest.id
    });

    return newRequest;
  } else {
    // Real Firebase flow
    const snap = await getDocs(collection(db, "weighbridgeRequests"));
    const requestNo = snap.size + 1001;
    
    let ticketPhotoUrl = "";
    
    if (imageFile) {
      try {
        const fileRef = ref(storage, `tickets/ticket_${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(fileRef, imageFile);
        ticketPhotoUrl = await getDownloadURL(snapshot.ref);
      } catch (err) {
        console.error("Storage upload failed, attempting Base64 fallback:", err);
        ticketPhotoUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(imageFile);
        });
      }
    }

    const newRequest = {
      requestNo,
      status: "Pending Quality",
      ...requestData,
      ticketPhotoUrl,
      requestedBy: {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email.split("@")[0],
        email: currentUser.email
      },
      createdAt: Timestamp.fromDate(now)
    };

    const docRef = await addDoc(collection(db, "weighbridgeRequests"), newRequest);
    
    await createNotification({
      role: "quality",
      message: `New request #${requestNo} is submitted by ${newRequest.requestedBy.name} and is pending Quality parameters.`,
      requestNo,
      requestId: docRef.id
    });

    return { id: docRef.id, ...newRequest };
  }
}

/**
 * Fetch all requests
 */
export async function getWeighbridgeRequests() {
  if (isMockMode) {
    const list = JSON.parse(localStorage.getItem("mock_weighbridge_requests") || "[]");
    return list.sort((a, b) => b.requestNo - a.requestNo);
  } else {
    const q = query(collection(db, "weighbridgeRequests"), orderBy("requestNo", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
      };
    });
  }
}

/**
 * Fetch single request by Firestore document ID
 */
export async function getWeighbridgeRequestById(id) {
  if (isMockMode) {
    const list = JSON.parse(localStorage.getItem("mock_weighbridge_requests") || "[]");
    return list.find(r => r.id === id) || null;
  } else {
    const docRef = doc(db, "weighbridgeRequests", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
    };
  }
}

/**
 * Save Quality Parameter Data (Weigh1 section)
 */
export async function submitQualityData(id, qualityData, currentUser) {
  const now = new Date();
  
  if (isMockMode) {
    const list = JSON.parse(localStorage.getItem("mock_weighbridge_requests") || "[]");
    const index = list.findIndex(r => r.id === id);
    if (index === -1) throw new Error("Request not found.");
    
    const currentStatus = list[index].status;
    const nextStatus = currentStatus === "Pending Quality" ? "Pending Finance" : currentStatus;

    const updateData = {
      status: nextStatus,
      qualityNo: qualityData.qualityNo,
      mill: qualityData.mill,
      qualityDate: qualityData.qualityDate,
      samples: qualityData.samples,
      qcBy: {
        name: currentUser.displayName || currentUser.email.split("@")[0],
        timestamp: now.toISOString()
      }
    };

    list[index] = { ...list[index], ...updateData };
    localStorage.setItem("mock_weighbridge_requests", JSON.stringify(list));
    window.dispatchEvent(new Event("storage"));

    if (currentStatus === "Pending Quality") {
      await createNotification({
        role: "finance",
        message: `Quality parameters added for request #${list[index].requestNo}. Ready for Finance outcomes.`,
        requestNo: list[index].requestNo,
        requestId: id
      });
    }

    return list[index];
  } else {
    const docRef = doc(db, "weighbridgeRequests", id);
    const docSnap = await getDoc(docRef);
    const currentData = docSnap.data();
    const currentStatus = currentData.status;
    const nextStatus = currentStatus === "Pending Quality" ? "Pending Finance" : currentStatus;

    const updateData = {
      status: nextStatus,
      qualityNo: qualityData.qualityNo,
      mill: qualityData.mill,
      qualityDate: qualityData.qualityDate,
      samples: qualityData.samples,
      qcBy: {
        name: currentUser.displayName || currentUser.email.split("@")[0],
        timestamp: Timestamp.fromDate(now)
      }
    };

    await updateDoc(docRef, updateData);
    
    if (currentStatus === "Pending Quality") {
      await createNotification({
        role: "finance",
        message: `Quality parameters added for request #${currentData.requestNo}. Ready for Finance outcomes.`,
        requestNo: currentData.requestNo,
        requestId: id
      });
    }

    return { id, ...currentData, ...updateData };
  }
}

/**
 * Save Finance Payment Data (Weigh2 latter section) and complete the workflow
 */
export async function submitFinanceData(id, financeData, currentUser, markCompleted = false) {
  const now = new Date();
  
  if (isMockMode) {
    const list = JSON.parse(localStorage.getItem("mock_weighbridge_requests") || "[]");
    const index = list.findIndex(r => r.id === id);
    if (index === -1) throw new Error("Request not found.");
    
    const currentStatus = list[index].status;
    const nextStatus = (markCompleted && currentStatus === "Pending Finance") ? "Completed" : currentStatus;

    const updateData = {
      status: nextStatus,
      rateApproval: parseFloat(financeData.rateApproval || 0),
      wastage: parseFloat(financeData.wastage || 0),
      moistureCut: parseFloat(financeData.moistureCut || 0),
      netWeightQty: parseFloat(financeData.netWeightQty || 0),
      grossPayment: parseFloat(financeData.grossPayment || 0),
      deduction: parseFloat(financeData.deduction || 0),
      netPayment: parseFloat(financeData.netPayment || 0),
      paymentMode: financeData.paymentMode,
      chequeNo: financeData.chequeNo || "",
      receivedByName: financeData.receivedByName || "",
      nicNo: financeData.nicNo || "",
      financeBy: {
        name: currentUser.displayName || currentUser.email.split("@")[0],
        timestamp: now.toISOString()
      }
    };

    list[index] = { ...list[index], ...updateData };
    localStorage.setItem("mock_weighbridge_requests", JSON.stringify(list));
    window.dispatchEvent(new Event("storage"));

    if (markCompleted && currentStatus === "Pending Finance") {
      await createNotification({
        userId: list[index].requestedBy.uid,
        message: `Weighbridge quality request #${list[index].requestNo} is fully Completed and paid.`,
        requestNo: list[index].requestNo,
        requestId: id
      });
    }

    return list[index];
  } else {
    const docRef = doc(db, "weighbridgeRequests", id);
    const docSnap = await getDoc(docRef);
    const currentData = docSnap.data();
    const currentStatus = currentData.status;
    const nextStatus = (markCompleted && currentStatus === "Pending Finance") ? "Completed" : currentStatus;

    const updateData = {
      status: nextStatus,
      rateApproval: parseFloat(financeData.rateApproval || 0),
      wastage: parseFloat(financeData.wastage || 0),
      moistureCut: parseFloat(financeData.moistureCut || 0),
      netWeightQty: parseFloat(financeData.netWeightQty || 0),
      grossPayment: parseFloat(financeData.grossPayment || 0),
      deduction: parseFloat(financeData.deduction || 0),
      netPayment: parseFloat(financeData.netPayment || 0),
      paymentMode: financeData.paymentMode,
      chequeNo: financeData.chequeNo || "",
      receivedByName: financeData.receivedByName || "",
      nicNo: financeData.nicNo || "",
      financeBy: {
        name: currentUser.displayName || currentUser.email.split("@")[0],
        timestamp: Timestamp.fromDate(now)
      }
    };

    await updateDoc(docRef, updateData);

    if (markCompleted && currentStatus === "Pending Finance") {
      await createNotification({
        userId: currentData.requestedBy.uid,
        message: `Weighbridge quality request #${currentData.requestNo} is fully Completed and paid.`,
        requestNo: currentData.requestNo,
        requestId: id
      });
    }

    return { id, ...currentData, ...updateData };
  }
}

/**
 * Delete a request (Admin only)
 */
export async function deleteRequest(id) {
  if (isMockMode) {
    const list = JSON.parse(localStorage.getItem("mock_weighbridge_requests") || "[]");
    const filtered = list.filter(r => r.id !== id);
    localStorage.setItem("mock_weighbridge_requests", JSON.stringify(filtered));
    window.dispatchEvent(new Event("storage"));
    return true;
  } else {
    await deleteDoc(doc(db, "weighbridgeRequests", id));
    return true;
  }
}
