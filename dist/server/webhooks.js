"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTransactionWebhook = handleTransactionWebhook;
exports.monitorTransaction = monitorTransaction;
const crypto_1 = __importDefault(require("crypto"));
const vite_1 = require("./vite");
// Secret for verifying webhook signatures
const WEBHOOK_SECRET = process.env.QUICKNODE_WEBHOOK_SECRET || "";
/**
 * Verifies the signature of a QuickNode webhook request using HMAC-SHA256.
 */
function verifyWebhookSignature(req) {
    if (!WEBHOOK_SECRET) {
        (0, vite_1.log)("Webhook secret not set. Skipping signature verification for development.");
        // In a production environment, you should throw an error or return false here.
        return true;
    }
    const signature = req.headers["x-qn-signature"];
    if (!signature) {
        (0, vite_1.log)("Webhook signature missing from request headers.");
        return false;
    }
    if (!req.rawBody) {
        (0, vite_1.log)("Raw request body not available for signature verification.");
        return false;
    }
    const hmac = crypto_1.default.createHmac("sha256", WEBHOOK_SECRET);
    const computedSignature = hmac.update(req.rawBody).digest("hex");
    try {
        return crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature));
    }
    catch (error) {
        (0, vite_1.log)(`Error during timingSafeEqual: ${error}`);
        return false;
    }
}
/**
 * Handles incoming QuickNode webhook for transaction confirmation
 */
function handleTransactionWebhook(req, res) {
    // Verify the webhook signature
    if (!verifyWebhookSignature(req)) {
        res.status(401).json({ message: "Invalid webhook signature" });
        return;
    }
    const payload = req.body;
    (0, vite_1.log)(`Received webhook for event: ${payload.event?.name}`);
    // Check for the specific QuickNode event name, e.g., 'qn_transactionConfirmed'
    // and process each transaction in the payload
    if (payload.event?.name && payload.txs && payload.txs.length > 0) {
        payload.txs.forEach((tx) => {
            if (tx.status === "confirmed") {
                (0, vite_1.log)(`Transaction ${tx.hash} confirmed with ${tx.confirmations} confirmations`);
                // TODO: Implement your business logic here
                // For example, update a database record for this transaction
                // - Find the order associated with this txHash
                // - Mark the order as paid
                // - Notify the user (e.g., via email or WebSocket)
            }
        });
        res.status(200).json({ message: "Webhook processed successfully" });
    }
    else {
        (0, vite_1.log)(`Unhandled or empty webhook payload: ${JSON.stringify(payload)}`);
        res.status(200).json({ message: "Payload not handled" });
    }
}
/**
 * Handles request from frontend to monitor a transaction
 */
function monitorTransaction(req, res) {
    const { txHash } = req.body;
    if (!txHash) {
        res.status(400).json({ message: "Transaction hash is required" });
        return;
    }
    (0, vite_1.log)(`Monitoring transaction: ${txHash}`);
    // In this simple setup, we rely on a persistent QuickNode webhook
    // configured in the QuickNode dashboard to monitor all relevant transactions.
    // Therefore, this endpoint doesn't need to do much beyond logging
    // and perhaps storing the txHash in a database if you need to track
    // which transactions are pending.
    // TODO: Optionally store txHash in your database as a pending transaction
    res.status(200).json({ message: `Monitoring transaction ${txHash}` });
}
