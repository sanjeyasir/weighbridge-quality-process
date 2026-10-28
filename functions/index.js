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
  if (!body.plant_code || typeof body.plant_code !== "string" || !body.plant_code.trim()) {
    if (event_type === "FIRST_WEIGHT") {
      errors.push("Field 'plant_code' is required and must be a non-empty string");
    }
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

const DEFAULT_API_USER = "hayleyseco";
const DEFAULT_API_PASS = "hayleyseco123";

/**
 * Authenticates incoming HTTP request using HTTP Basic Authentication ONLY.
 * Expected Header: `Authorization: Basic <base64(hayleyseco:hayleyseco123)>`
 * @param {import("express").Request} req 
 * @returns {boolean}
 */
function authenticateWeighbridgeRequest(req) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.trim().split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "basic") {
      try {
        const decoded = Buffer.from(parts[1], "base64").toString("utf-8");
        const colonIdx = decoded.indexOf(":");
        if (colonIdx !== -1) {
          const u = decoded.substring(0, colonIdx);
          const p = decoded.substring(colonIdx + 1);
          if (u === DEFAULT_API_USER && p === DEFAULT_API_PASS) {
            return true;
          }
        }
      } catch (err) {
        logger.warn("Failed to decode Basic Auth header:", err);
      }
    }
  }

  return false;
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
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      logger.warn(`Rejected method ${req.method} from ${req.ip}`);
      return res.status(405).json({
        success: false,
        error: "Method Not Allowed. This endpoint only accepts POST requests."
      });
    }

    // 2. Authenticate Request strictly with Basic Auth
    if (!authenticateWeighbridgeRequest(req)) {
      logger.warn(`Unauthorized request rejected from ${req.ip}`);
      res.set("WWW-Authenticate", 'Basic realm="Weighbridge Ingestion API"');
      return res.status(401).json({
        success: false,
        error: "invalid response"
      });
    }

    try {
      const payload = { ...req.body };
      delete payload.username;
      delete payload.password;
      delete payload.auth;

      logger.info("Received authenticated weighbridge payload:", {
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

      // Look up existing transaction strictly by the 'transaction_no' field
      const querySnap = await db.collection("weighbridge_api_transactions")
        .where("transaction_no", "==", transaction_no)
        .limit(1)
        .get();

      const exists = !querySnap.empty;
      const existingDoc = exists ? querySnap.docs[0] : null;
      const existingData = exists ? (existingDoc.data() || {}) : {};
      const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
      
      // Strict Plant Code Resolution & Validation against plant_master
      const plant_code = (payload.plant_code || (existingData && existingData.plant_code) || "").toString().trim().toUpperCase();

      if (!plant_code) {
        logger.warn(`Rejected transaction ${transaction_no}: 'plant_code' is missing`);
        return res.status(400).json({
          success: false,
          error: "Missing Plant Code",
          message: "Field 'plant_code' is required."
        });
      }

      // Check if plant_code exists in the 'plant_master' collection strictly by 'plant_code' field
      const plantQuerySnap = await db.collection("plant_master")
        .where("plant_code", "==", plant_code)
        .limit(1)
        .get();

      const plantExists = !plantQuerySnap.empty;

      if (!plantExists) {
        logger.warn(`Rejected transaction ${transaction_no}: plant_code '${plant_code}' does not exist in plant_master`);
        return res.status(400).json({
          success: false,
          error: "Plant Not Found",
          message: `Plant code '${plant_code}' does not exist in the Plant Master. Please register this plant in Plant Master before submitting transactions.`
        });
      }

      // 4. Completed Transaction Protection:
      // If transaction already exists and is already COMPLETED, reject ANY modifications
      if (exists && existingData.status === "COMPLETED") {
        logger.warn(`Rejected POST for transaction ${transaction_no}: Transaction is already COMPLETED.`);
        return res.status(400).json({
          success: false,
          error: "Transaction Already Completed",
          message: `Transaction '${transaction_no}' is already COMPLETED. Modifications are not allowed.`
        });
      }

      // 5. Process FIRST_WEIGHT
      if (event_type === "FIRST_WEIGHT") {
        // If transaction already exists, reject duplicate FIRST_WEIGHT
        if (exists) {
          logger.warn(`Rejected duplicate FIRST_WEIGHT: Transaction '${transaction_no}' already exists.`);
          return res.status(400).json({
            success: false,
            error: "Duplicate Transaction",
            message: `Transaction '${transaction_no}' already exists. Cannot create a duplicate FIRST_WEIGHT record.`
          });
        }

        // New transaction: create new document with Firebase auto-generated unique ID
        const transactionData = {
          transaction_no,
          plant_code,
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
          created_at: serverTimestamp,
          updated_at: serverTimestamp,
          second_weight_kg: null,
          net_weight_kg: null,
          final_net_weight_kg: null,
          second_weight_at: null,
          remarks: remarks || "",
          raw_first_weight_payload: payload
        };

        await db.collection("weighbridge_api_transactions").add(transactionData);

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
        // Strict Validation: A document with this transaction_no MUST exist
        if (!exists) {
          logger.warn(`Rejected SECOND_WEIGHT: Transaction with transaction_no '${transaction_no}' does not exist`);
          return res.status(404).json({
            success: false,
            error: "Transaction Not Found",
            message: `Transaction with transaction_no '${transaction_no}' does not exist. A FIRST_WEIGHT entry must be registered before recording SECOND_WEIGHT.`
          });
        }

        // Update the found document
        const updateData = {
          second_weight_kg: Number(second_weight_kg),
          net_weight_kg: Number(net_weight_kg),
          final_net_weight_kg: Number(final_net_weight_kg),
          second_weight_at: new Date(second_weight_at).toISOString(),
          status: "COMPLETED",
          latest_event: "SECOND_WEIGHT",
          updated_at: serverTimestamp,
          completed_at: serverTimestamp,
          raw_second_weight_payload: payload
        };

        if (remarks) updateData.remarks = remarks;
        if (plant_code) updateData.plant_code = plant_code;
        if (driver_name) updateData.driver_name = driver_name;

        await existingDoc.ref.set(updateData, { merge: true });
        logger.info(`Second weight recorded and transaction completed for ${transaction_no}`);

        return res.status(200).json({
          success: true,
          message: `Second weight recorded and transaction ${transaction_no} completed`,
          transaction_no,
          status: "COMPLETED",
          first_weight_kg: existingData.first_weight_kg || Number(first_weight_kg),
          second_weight_kg: Number(second_weight_kg),
          net_weight_kg: Number(net_weight_kg),
          final_net_weight_kg: Number(final_net_weight_kg),
          vehicle_no: existingData.vehicle_no || vehicle_no
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
