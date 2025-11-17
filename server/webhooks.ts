import express, { type Request, type Response,  } from "express";
import crypto from "crypto";
import { log } from "./vite";

// Secret for verifying webhook signatures
const WEBHOOK_SECRET = process.env.QUICKNODE_WEBHOOK_SECRET || "";

// A more accurate representation of the QuickNode webhook payload
interface QuickNodeWebhookPayload {
  chain: string;
  network: string;
  event: {
    type: string;
    name: string;
  };
  txs: {
    hash: string;
    status: string;
    confirmations: number;
    // ... other transaction fields
  }[];
}

/**
 * Verifies the signature of a QuickNode webhook request using HMAC-SHA256.
 */
function verifyWebhookSignature(req: Request): boolean {
  if (!WEBHOOK_SECRET) {
    log(
      "Webhook secret not set. Skipping signature verification for development."
    );
    // In a production environment, you should throw an error or return false here.
    return true;
  }

  const signature = req.headers["x-qn-signature"] as string;
  if (!signature) {
    log("Webhook signature missing from request headers.");
    return false;
  }

  if (!req.rawBody) {
    log("Raw request body not available for signature verification.");
    return false;
  }

  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  const computedSignature = hmac.update(req.rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  } catch (error) {
    log(`Error during timingSafeEqual: ${error}`);
    return false;
  }
}

/**
 * Handles incoming QuickNode webhook for transaction confirmation
 */
export function handleTransactionWebhook(req: Request, res: Response): void {
  // Verify the webhook signature
  if (!verifyWebhookSignature(req)) {
    res.status(401).json({ message: "Invalid webhook signature" });
    return;
  }

  const payload = req.body as QuickNodeWebhookPayload;
  log(`Received webhook for event: ${payload.event?.name}`);

  // Check for the specific QuickNode event name, e.g., 'qn_transactionConfirmed'
  // and process each transaction in the payload
  if (payload.event?.name && payload.txs && payload.txs.length > 0) {
    payload.txs.forEach((tx) => {
      if (tx.status === "confirmed") {
        log(
          `Transaction ${tx.hash} confirmed with ${tx.confirmations} confirmations`
        );

        // TODO: Implement your business logic here
        // For example, update a database record for this transaction
        // - Find the order associated with this txHash
        // - Mark the order as paid
        // - Notify the user (e.g., via email or WebSocket)
      }
    });

    res.status(200).json({ message: "Webhook processed successfully" });
  } else {
    log(`Unhandled or empty webhook payload: ${JSON.stringify(payload)}`);
    res.status(200).json({ message: "Payload not handled" });
  }
}

/**
 * Handles request from frontend to monitor a transaction
 */
export function monitorTransaction(req: Request, res: Response): void {
  const { txHash } = req.body;

  if (!txHash) {
    res.status(400).json({ message: "Transaction hash is required" });
    return;
  }

  log(`Monitoring transaction: ${txHash}`);

  // In this simple setup, we rely on a persistent QuickNode webhook
  // configured in the QuickNode dashboard to monitor all relevant transactions.
  // Therefore, this endpoint doesn't need to do much beyond logging
  // and perhaps storing the txHash in a database if you need to track
  // which transactions are pending.

  // TODO: Optionally store txHash in your database as a pending transaction

  res.status(200).json({ message: `Monitoring transaction ${txHash}` });
}
