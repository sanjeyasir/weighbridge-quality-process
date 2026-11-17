import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "./config";

/**
 * Real-time Weighbridge API Scale Transactions (100% Live Firestore - No Mock Data)
 * Collection: "weighbridge_api_transactions"
 */
export function subscribeToApiTransactions(onData, onError) {
  try {
    const q = query(collection(db, "weighbridge_api_transactions"), orderBy("updated_at", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            plant_code: data.plant_code || data.plant || "HES-1",
            ...data,
            created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at,
            updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : data.updated_at,
            first_weight_at: data.first_weight_at?.toDate ? data.first_weight_at.toDate().toISOString() : data.first_weight_at,
            second_weight_at: data.second_weight_at?.toDate ? data.second_weight_at.toDate().toISOString() : data.second_weight_at
          };
        });
        onData(list);
      },
      (err) => {
        console.error("Firestore weighbridge_api_transactions error:", err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.error("Failed to initialize Firestore listener:", err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Fetch all weighbridge transactions once
 */
export async function getApiTransactions() {
  try {
    const q = query(collection(db, "weighbridge_api_transactions"), orderBy("updated_at", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        plant_code: data.plant_code || data.plant || "HES-1",
        ...data
      };
    });
  } catch (err) {
    console.error("getApiTransactions error:", err);
    return [];
  }
}

/**
 * Post an incoming Weighbridge payload directly to live Firestore
 */
export async function postWeighbridgeApiPayload(payload) {
  const isSecondWeight = payload.event_type === "SECOND_WEIGHT";
  const docId = payload.transaction_no.replace(/[/#?]/g, "_");
  const plantCode = (payload.plant_code || "").trim().toUpperCase();
  if (!plantCode) {
    throw new Error("Plant Code is required and cannot be empty.");
  }

  const docRef = doc(db, "weighbridge_api_transactions", docId);
  const nowIso = new Date().toISOString();

  const dataToWrite = {
    transaction_no: payload.transaction_no,
    plant_code: plantCode,
    event_type: payload.event_type,
    vehicle_no: payload.vehicle_no || "",
    supplier_name: payload.supplier_name || "",
    material_name: payload.material_name || "",
    direction: payload.direction || "IN",
    sub_type: payload.sub_type || "Purchase",
    driver_name: payload.driver_name || "",
    first_weight_kg: Number(payload.first_weight_kg || 0),
    first_weight_at: payload.first_weight_at || nowIso,
    status: isSecondWeight ? "SECOND_WEIGHT" : "PENDING_SECOND_WEIGHT",
    updated_at: serverTimestamp(),
    raw_payload: payload
  };

  if (isSecondWeight) {
    dataToWrite.second_weight_kg = Number(payload.second_weight_kg || 0);
    dataToWrite.net_weight_kg = Number(payload.net_weight_kg || 0);
    dataToWrite.final_net_weight_kg = Number(payload.final_net_weight_kg || payload.net_weight_kg || 0);
    dataToWrite.second_weight_at = payload.second_weight_at || nowIso;
    dataToWrite.status = "COMPLETED";
  }

  if (payload.remarks) {
    dataToWrite.remarks = payload.remarks;
  }

  await setDoc(docRef, dataToWrite, { merge: true });
  return { success: true, message: `Successfully recorded ${payload.transaction_no} to live Firestore.` };
}

/**
 * Update transaction status
 */
export async function updateApiTransactionStatus(transactionNo, newStatus) {
  const docId = transactionNo.replace(/[/#?]/g, "_");
  const docRef = doc(db, "weighbridge_api_transactions", docId);
  await updateDoc(docRef, {
    status: newStatus,
    updated_at: serverTimestamp()
  });
}
