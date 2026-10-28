import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { db, isMockMode } from "./config";

// Default seed data matching the user's PDF documentation + Plant Codes (HES-1, HES-2, etc.)
export const DEFAULT_MOCK_API_TRANSACTIONS = [
  {
    id: "26-00007",
    transaction_no: "26-00007",
    plant_code: "HES-1",
    plant_name: "Hayleys Eco Solutions Plant 1",
    event_type: "SECOND_WEIGHT",
    vehicle_no: "WP-1615",
    supplier_name: "Hayleys DPL",
    material_name: "Coir",
    direction: "IN",
    sub_type: "Purchase",
    driver_name: "K. Wickramasinghe",
    first_weight_kg: 9000,
    second_weight_kg: 5600,
    net_weight_kg: 3400,
    final_net_weight_kg: 3390,
    first_weight_at: "2026-10-27T09:15:00+05:30",
    second_weight_at: "2026-10-27T10:20:00+05:30",
    remarks: "Received at main weighbridge. Quality verified.",
    status: "COMPLETED",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "26-00008",
    transaction_no: "26-00008",
    plant_code: "HES-2",
    plant_name: "Hayleys Eco Solutions Plant 2",
    event_type: "FIRST_WEIGHT",
    vehicle_no: "WP-9812",
    supplier_name: "Kelani Valley Plantations",
    material_name: "Rubber Latex",
    direction: "IN",
    sub_type: "Purchase",
    driver_name: "M. Fernando",
    first_weight_kg: 14200,
    second_weight_kg: null,
    net_weight_kg: null,
    final_net_weight_kg: null,
    first_weight_at: "2026-10-27T11:45:00+05:30",
    second_weight_at: null,
    remarks: "Pending second tare weight inspection",
    status: "PENDING_SECOND_WEIGHT",
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: "26-00006",
    transaction_no: "26-00006",
    plant_code: "HES-1",
    plant_name: "Hayleys Eco Solutions Plant 1",
    event_type: "SECOND_WEIGHT",
    vehicle_no: "SP-4521",
    supplier_name: "Southern Agrico Ltd",
    material_name: "Charcoal Briquettes",
    direction: "OUT",
    sub_type: "Direct Sale",
    driver_name: "S. Kumara",
    first_weight_kg: 8200,
    second_weight_kg: 18450,
    net_weight_kg: 10250,
    final_net_weight_kg: 10230,
    first_weight_at: "2026-10-27T07:30:00+05:30",
    second_weight_at: "2026-10-27T08:50:00+05:30",
    remarks: "Export batch loaded & weighed out",
    status: "COMPLETED",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 3).toISOString()
  }
];

// Initialize localStorage seed if empty in mock mode
if (isMockMode) {
  const existing = localStorage.getItem("mock_api_transactions");
  if (!existing) {
    localStorage.setItem("mock_api_transactions", JSON.stringify(DEFAULT_MOCK_API_TRANSACTIONS));
  } else {
    // Ensure existing mock items have plant_code
    try {
      const parsed = JSON.parse(existing);
      let updated = false;
      parsed.forEach((item, i) => {
        if (!item.plant_code) {
          item.plant_code = i % 2 === 0 ? "HES-1" : "HES-2";
          item.plant_name = item.plant_code === "HES-1" ? "Hayleys Eco Solutions Plant 1" : "Hayleys Eco Solutions Plant 2";
          updated = true;
        }
      });
      if (updated) {
        localStorage.setItem("mock_api_transactions", JSON.stringify(parsed));
      }
    } catch {
      localStorage.setItem("mock_api_transactions", JSON.stringify(DEFAULT_MOCK_API_TRANSACTIONS));
    }
  }
}

/**
 * Subscribe to real-time Weighbridge API transactions
 * Works seamlessly with Firebase Firestore or local mock storage
 */
export function subscribeToApiTransactions(onData, onError) {
  if (isMockMode) {
    const fetchLocal = () => {
      const stored = localStorage.getItem("mock_api_transactions");
      const list = stored ? JSON.parse(stored) : DEFAULT_MOCK_API_TRANSACTIONS;
      // sort latest updated first
      list.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
      onData(list);
    };

    fetchLocal();
    const handleStorage = (e) => {
      if (!e.key || e.key === "mock_api_transactions") {
        fetchLocal();
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("mock_api_update", fetchLocal);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("mock_api_update", fetchLocal);
    };
  }

  // Live Firestore subscription
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
            plant_name: data.plant_name || "Hayleys Eco Solutions Plant 1",
            ...data,
            // Format timestamps if Firestore Timestamp objects
            created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at,
            updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : data.updated_at
          };
        });
        onData(list);
      },
      (err) => {
        console.error("Firestore onSnapshot error:", err);
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
 * Directly post / simulate an incoming Weighbridge payload from UI
 * Accepts plant_code and plant_name
 */
export async function postWeighbridgeApiPayload(payload) {
  const isSecondWeight = payload.event_type === "SECOND_WEIGHT";
  const docId = payload.transaction_no.replace(/[/#?]/g, "_");
  const nowIso = new Date().toISOString();
  const plantCode = (payload.plant_code || payload.plant || "HES-1").trim().toUpperCase();
  const plantName = payload.plant_name || (plantCode === "HES-2" ? "Hayleys Eco Solutions Plant 2" : "Hayleys Eco Solutions Plant 1");

  if (isMockMode) {
    const stored = localStorage.getItem("mock_api_transactions");
    let list = stored ? JSON.parse(stored) : [...DEFAULT_MOCK_API_TRANSACTIONS];

    const existingIndex = list.findIndex(item => item.transaction_no === payload.transaction_no);

    const formattedRecord = {
      id: docId,
      transaction_no: payload.transaction_no,
      plant_code: plantCode,
      plant_name: plantName,
      event_type: payload.event_type,
      vehicle_no: payload.vehicle_no,
      supplier_name: payload.supplier_name,
      material_name: payload.material_name,
      direction: payload.direction,
      sub_type: payload.sub_type || null,
      driver_name: payload.driver_name || null,
      first_weight_kg: Number(payload.first_weight_kg),
      first_weight_at: payload.first_weight_at,
      second_weight_kg: isSecondWeight ? Number(payload.second_weight_kg) : (existingIndex >= 0 ? list[existingIndex].second_weight_kg : null),
      net_weight_kg: isSecondWeight ? Number(payload.net_weight_kg) : (existingIndex >= 0 ? list[existingIndex].net_weight_kg : null),
      final_net_weight_kg: isSecondWeight ? Number(payload.final_net_weight_kg) : (existingIndex >= 0 ? list[existingIndex].final_net_weight_kg : null),
      second_weight_at: isSecondWeight ? payload.second_weight_at : (existingIndex >= 0 ? list[existingIndex].second_weight_at : null),
      remarks: payload.remarks || (existingIndex >= 0 ? list[existingIndex].remarks : ""),
      status: isSecondWeight ? "SECOND_WEIGHT" : "PENDING_SECOND_WEIGHT",
      created_at: existingIndex >= 0 ? list[existingIndex].created_at : nowIso,
      updated_at: nowIso,
      raw_payload: payload
    };

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...formattedRecord };
    } else {
      list.unshift(formattedRecord);
    }

    localStorage.setItem("mock_api_transactions", JSON.stringify(list));
    window.dispatchEvent(new Event("mock_api_update"));
    return { success: true, message: `Mock: Successfully recorded ${payload.transaction_no}`, record: formattedRecord };
  }

  // Live Firestore Direct Write
  const docRef = doc(db, "weighbridge_api_transactions", docId);
  const dataToWrite = {
    transaction_no: payload.transaction_no,
    plant_code: plantCode,
    plant_name: plantName,
    event_type: payload.event_type,
    vehicle_no: payload.vehicle_no,
    supplier_name: payload.supplier_name,
    material_name: payload.material_name,
    direction: payload.direction,
    sub_type: payload.sub_type || null,
    driver_name: payload.driver_name || null,
    first_weight_kg: Number(payload.first_weight_kg),
    first_weight_at: payload.first_weight_at,
    status: isSecondWeight ? "SECOND_WEIGHT" : "PENDING_SECOND_WEIGHT",
    updated_at: serverTimestamp(),
    raw_payload: payload
  };

  if (isSecondWeight) {
    dataToWrite.second_weight_kg = Number(payload.second_weight_kg);
    dataToWrite.net_weight_kg = Number(payload.net_weight_kg);
    dataToWrite.final_net_weight_kg = Number(payload.final_net_weight_kg);
    dataToWrite.second_weight_at = payload.second_weight_at;
    dataToWrite.remarks = payload.remarks || "";
  }

  await setDoc(docRef, dataToWrite, { merge: true });
  return { success: true, message: `Live Firestore: Saved transaction ${payload.transaction_no}` };
}

/**
 * Update transaction status (e.g. to COMPLETED)
 */
export async function updateTransactionStatus(id, newStatus, extraData = {}) {
  const nowIso = new Date().toISOString();

  if (isMockMode) {
    const stored = localStorage.getItem("mock_api_transactions");
    let list = stored ? JSON.parse(stored) : [...DEFAULT_MOCK_API_TRANSACTIONS];
    const idx = list.findIndex(item => item.id === id || item.transaction_no === id);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        status: newStatus,
        updated_at: nowIso,
        completed_at: newStatus === "COMPLETED" ? nowIso : list[idx].completed_at,
        ...extraData
      };
      localStorage.setItem("mock_api_transactions", JSON.stringify(list));
      window.dispatchEvent(new Event("mock_api_update"));
      return { success: true, record: list[idx] };
    }
  }

  const docRef = doc(db, "weighbridge_api_transactions", id);
  const updateData = {
    status: newStatus,
    updated_at: serverTimestamp(),
    ...extraData
  };
  if (newStatus === "COMPLETED") {
    updateData.completed_at = serverTimestamp();
  }
  await setDoc(docRef, updateData, { merge: true });
  return { success: true };
}

/**
 * Delete a transaction record from the API stream
 */
export async function deleteApiTransaction(id) {
  if (isMockMode) {
    const stored = localStorage.getItem("mock_api_transactions");
    let list = stored ? JSON.parse(stored) : [];
    list = list.filter(item => item.id !== id && item.transaction_no !== id);
    localStorage.setItem("mock_api_transactions", JSON.stringify(list));
    window.dispatchEvent(new Event("mock_api_update"));
    return;
  }

  const docRef = doc(db, "weighbridge_api_transactions", id);
  await deleteDoc(docRef);
}

/**
 * Reset mock data back to sample values
 */
export function resetMockApiData() {
  localStorage.setItem("mock_api_transactions", JSON.stringify(DEFAULT_MOCK_API_TRANSACTIONS));
  window.dispatchEvent(new Event("mock_api_update"));
}
