import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { db } from "./config";

/**
 * Plant Master Service - 100% Live Firebase Firestore (No Mock Data)
 * Collection: "plant_master"
 */

/**
 * Subscribe to real-time Plant Master records directly from live Firestore
 */
export function subscribeToPlants(onData, onError) {
  try {
    const q = query(collection(db, "plant_master"), orderBy("plant_code", "asc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at,
            updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : data.updated_at
          };
        });
        // Strictly return the live database records. If empty, returns []
        onData(list);
      },
      (err) => {
        console.error("Live Firestore plant_master onSnapshot error:", err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.error("Failed to initialize live plant_master listener:", err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Create a new plant record directly in live Firestore
 */
export async function createPlant(plantData) {
  const code = (plantData.plant_code || "").trim().toUpperCase();
  const name = (plantData.plant_name || "").trim();
  const location = (plantData.location || "").trim();

  if (!code) throw new Error("Plant Code is required (e.g. HES-1)");
  if (!name) throw new Error("Plant Name is required");

  const docId = `plant-${code.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}`;
  const docRef = doc(db, "plant_master", docId);

  await setDoc(docRef, {
    plant_code: code,
    plant_name: name,
    location: location || "—",
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });

  return { id: docId, plant_code: code, plant_name: name, location };
}

/**
 * Update an existing plant record in live Firestore
 */
export async function updatePlant(id, plantData) {
  const code = (plantData.plant_code || "").trim().toUpperCase();
  const name = (plantData.plant_name || "").trim();
  const location = (plantData.location || "").trim();

  if (!code) throw new Error("Plant Code is required (e.g. HES-1)");
  if (!name) throw new Error("Plant Name is required");

  const docRef = doc(db, "plant_master", id);
  await setDoc(
    docRef,
    {
      plant_code: code,
      plant_name: name,
      location: location || "—",
      updated_at: serverTimestamp()
    },
    { merge: true }
  );

  return { id, plant_code: code, plant_name: name, location };
}

/**
 * Delete a plant record directly from live Firestore
 */
export async function deletePlant(id) {
  if (!id) throw new Error("Plant ID is required to delete");
  const docRef = doc(db, "plant_master", id);
  await deleteDoc(docRef);
}

/**
 * Helper to seed initial starter plants into live Firestore if the user requests it
 */
export async function seedLivePlants() {
  const starterPlants = [
    { code: "HES-1", name: "Hayleys Eco Solutions Plant 1", location: "Badalgama" },
    { code: "HES-2", name: "Hayleys Eco Solutions Plant 2", location: "Madampe" },
    { code: "KVP-1", name: "Kelani Valley Plantations Hub", location: "Avissawella" }
  ];

  for (const plant of starterPlants) {
    const docId = `plant-${plant.code.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}`;
    const docRef = doc(db, "plant_master", docId);
    await setDoc(docRef, {
      plant_code: plant.code,
      plant_name: plant.name,
      location: plant.location,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }, { merge: true });
  }
}
