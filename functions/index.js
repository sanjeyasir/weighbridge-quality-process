/**
 * Firebase Cloud Function: Weighbridge REST API POST Endpoint
 * Handles incoming JSON payloads for FIRST_WEIGHT and SECOND_WEIGHT events
 * and persists them into Firebase Firestore.
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Validates payload against Weighbridge REST API Schema
 * @param {Object} body 
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateWeighbridgePayload(body) {
  const errors = [];
  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Request body must be a valid JSON object"] };
  }

  const { event_type, transaction_no, vehicle_no, supplier_name, material_name, direction } = body;

  // Validate event_type
  if (!event_type || (event_type !== "FIRST_WEIGHT" && event_type !== "SECOND_WEIGHT")) {
    errors.push("Field 'event_type' must be either 'FIRST_WEIGHT' or 'SECOND_WEIGHT'");
  }

  // Common required fields
  if (!transaction_no || typeof transaction_no !== "string" || !transaction_no.trim()) {
    errors.push("Field 'transaction_no' is required and must be a non-empty string");
  }
  if (!vehicle_no || typeof vehicle_no !== "string" || !vehicle_no.trim()) {
    errors.push("Field 'vehicle_no' is required and must be a non-empty string");
  }
  if (!supplier_name || typeof supplier_name !== "string" || !supplier_name.trim()) {
    errors.push("Field 'supplier_name' is required and must be a non-empty string");
  }
  if (!material_name || typeof material_name !== "string" || !material_name.trim()) {
    errors.push("Field 'material_name' is required and must be a non-empty string");
  }
  if (!direction || !["IN", "OUT"].includes(direction)) {
    errors.push("Field 'direction' is required and must be either 'IN' or 'OUT'");
  }

  // First weight validation
  if (body.first_weight_kg === undefined || body.first_weight_kg === null || typeof body.first_weight_kg !== "number" || isNaN(body.first_weight_kg) || body.first_weight_kg < 0) {
    errors.push("Field 'first_weight_kg' is required and must be a non-negative number");
  }
  if (!body.first_weight_at || isNaN(Date.parse(body.first_weight_at))) {
    errors.push("Field 'first_weight_at' is required and must be a valid ISO 8601 date-time string");
  }

  // Second weight specific validation
  if (event_type === "SECOND_WEIGHT") {
    if (body.second_weight_kg === undefined || body.second_weight_kg === null || typeof body.second_weight_kg !== "number" || isNaN(body.second_weight_kg) || body.second_weight_kg < 0) {
      errors.push("Field 'second_weight_kg' is required for SECOND_WEIGHT and must be a non-negative number");
    }
    if (body.net_weight_kg === undefined || body.net_weight_kg === null || typeof body.net_weight_kg !== "number" || isNaN(body.net_weight_kg)) {
      errors.push("Field 'net_weight_kg' is required for SECOND_WEIGHT and must be a number");
    }
    if (body.final_net_weight_kg === undefined || body.final_net_weight_kg === null || typeof body.final_net_weight_kg !== "number" || isNaN(body.final_net_weight_kg)) {
      errors.push("Field 'final_net_weight_kg' is required for SECOND_WEIGHT and must be a number");
    }
    if (!body.second_weight_at || isNaN(Date.parse(body.second_weight_at))) {
      errors.push("Field 'second_weight_at' is required for SECOND_WEIGHT and must be a valid ISO 8601 date-time string");
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Cloud Function HTTP handler: weighbridgeApi
 * Endpoint: POST /weighbridgeApi (or /weighbridge-post)
 */
exports.weighbridgeApi = onRequest({ cors: true, maxInstances: 10 }, async (req, res) => {
  return cors(req, res, async () => {
    // 1. Check HTTP Method
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      logger.warn(`Rejected method ${req.method} from ${req.ip}`);
      return res.status(405).json({
        success: false,
        error: "Method Not Allowed. This endpoint only accepts POST requests."
      });
    }

    try {
      const payload = req.body;
      logger.info("Received weighbridge payload:", {
        event_type: payload?.event_type,
        transaction_no: payload?.transaction_no,
        vehicle_no: payload?.vehicle_no
      });

      // 2. Validate Payload Schema
      const validation = validateWeighbridgePayload(payload);
      if (!validation.valid) {
        logger.warn("Validation failed:", validation.errors);
        return res.status(400).json({
          success: false,
          error: "Schema Validation Error",
          details: validation.errors
        });
      }

      const {
        event_type,
        transaction_no,
        vehicle_no,
        supplier_name,
        material_name,
        direction,
        first_weight_kg,
        first_weight_at,
        second_weight_kg,
        net_weight_kg,
        final_net_weight_kg,
        second_weight_at,
        remarks,
        sub_type,
        driver_name
      } = payload;

      const docId = transaction_no.replace(/[/#?]/g, "_");
      const transactionRef = db.collection("weighbridge_api_transactions").doc(docId);
      const existingDoc = await transactionRef.get();

      const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

      const plant_code = (payload.plant_code || payload.plant || (isUpdate && existingDoc.data().plant_code ? existingDoc.data().plant_code : "HES-1")).trim().toUpperCase();
      const plant_name = payload.plant_name || (plant_code === "HES-2" ? "Hayleys Eco Solutions Plant 2" : "Hayleys Eco Solutions Plant 1");

      let transactionData = {};
      let isUpdate = existingDoc.exists;

      if (event_type === "FIRST_WEIGHT") {
        transactionData = {
          transaction_no,
          plant_code,
          plant_name,
          vehicle_no,
          supplier_name,
          material_name,
          direction,
          sub_type: sub_type || null,
          driver_name: driver_name || null,
          first_weight_kg: Number(first_weight_kg),
          first_weight_at: new Date(first_weight_at).toISOString(),
          status: "PENDING_SECOND_WEIGHT",
          latest_event: "FIRST_WEIGHT",
          updated_at: serverTimestamp,
          raw_first_weight_payload: payload
        };

        if (!isUpdate) {
          transactionData.created_at = serverTimestamp;
          transactionData.second_weight_kg = null;
          transactionData.net_weight_kg = null;
          transactionData.final_net_weight_kg = null;
          transactionData.second_weight_at = null;
          transactionData.remarks = remarks || "";
        }

        await transactionRef.set(transactionData, { merge: true });
        logger.info(`First weight recorded successfully for transaction ${transaction_no}`);

        return res.status(201).json({
          success: true,
          message: `First weight saved for transaction ${transaction_no}`,
          transaction_no,
          status: "PENDING_SECOND_WEIGHT",
          first_weight_kg: Number(first_weight_kg),
          vehicle_no,
          direction
        });

      } else if (event_type === "SECOND_WEIGHT") {
        transactionData = {
          transaction_no,
          plant_code,
          plant_name,
          vehicle_no,
          supplier_name,
          material_name,
          direction,
          sub_type: sub_type || null,
          driver_name: driver_name || null,
          first_weight_kg: Number(first_weight_kg),
          first_weight_at: new Date(first_weight_at).toISOString(),
          second_weight_kg: Number(second_weight_kg),
          net_weight_kg: Number(net_weight_kg),
          final_net_weight_kg: Number(final_net_weight_kg),
          second_weight_at: new Date(second_weight_at).toISOString(),
          remarks: remarks || "",
          status: "COMPLETED",
          latest_event: "SECOND_WEIGHT",
          updated_at: serverTimestamp,
          completed_at: serverTimestamp,
          raw_second_weight_payload: payload
        };

        if (!isUpdate) {
          transactionData.created_at = serverTimestamp;
        }

        await transactionRef.set(transactionData, { merge: true });
        logger.info(`Second weight recorded and transaction completed for ${transaction_no}`);

        return res.status(200).json({
          success: true,
          message: `Second weight recorded and transaction ${transaction_no} completed`,
          transaction_no,
          status: "COMPLETED",
          net_weight_kg: Number(net_weight_kg),
          final_net_weight_kg: Number(final_net_weight_kg),
          vehicle_no
        });
      }

    } catch (error) {
      logger.error("Internal error processing weighbridge POST:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: error.message
      });
    }
  });
});
