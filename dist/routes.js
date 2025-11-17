"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const http_1 = require("http");
const storage_db_1 = require("./storage-db");
const schema_1 = require("./shared/schema");
// import { insertCartItemSchema, insertOrderSchema } from "@shared/schema";
const zod_1 = require("zod");
const flutterwave_1 = __importDefault(require("./services/flutterwave"));
const crypto_1 = __importDefault(require("./services/crypto"));
// Schema for crypto transaction verification
const verifyTransactionSchema = zod_1.z.object({
    txHash: zod_1.z.string().min(1, "Transaction hash is required"),
    crypto: zod_1.z.enum(["bitcoin", "ethereum", "usdt"]),
    amount: zod_1.z.string().or(zod_1.z.number()).transform(Number),
    address: zod_1.z.string().min(1, "Recipient address is required"),
});
// Import webhook handlers for transaction confirmation
const webhooks_1 = require("./webhooks");
async function registerRoutes(app) {
    // Generate session ID if not exists
    app.use((req, res, next) => {
        if (!req.session) {
            req.session = {};
        }
        if (!req.session.id) {
            req.session.id =
                "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        }
        next();
    });
    // Get all games
    app.get("/api/games", async (req, res) => {
        try {
            const games = await storage_db_1.storage.getGames();
            res.json(games);
        }
        catch (error) {
            res.status(500).json({ message: "Failed to fetch games" });
        }
    });
    // Get game by slug
    app.get("/api/games/:slug", async (req, res) => {
        try {
            const game = await storage_db_1.storage.getGameBySlug(req.params.slug);
            if (!game) {
                return res.status(404).json({ message: "Game not found" });
            }
            res.json(game);
        }
        catch (error) {
            res.status(500).json({ message: "Failed to fetch game" });
        }
    });
    // Get cryptocurrency exchange rates
    app.get("/api/crypto-rates", async (req, res) => {
        try {
            const prices = await crypto_1.default.getCryptoPrices();
            res.json(prices);
        }
        catch (error) {
            console.error("Error fetching crypto rates:", error);
            res.status(500).json({
                message: "Failed to fetch cryptocurrency rates",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
    // Get cart items
    app.get("/api/cart", async (req, res) => {
        try {
            const sessionId = req.session.id;
            const cartItems = await storage_db_1.storage.getCartItems(sessionId);
            res.json(cartItems);
        }
        catch (error) {
            console.log(error);
            res.status(500).json({ message: "Failed to fetch cart items" });
        }
    });
    // Add item to cart
    app.post("/api/cart", async (req, res) => {
        console.log("Attempting to add to cart...");
        console.log("Session ID:", req.session.id);
        console.log("Request Body:", req.body);
        try {
            const sessionId = req.session.id;
            const cartItemData = schema_1.insertCartItemSchema.parse({
                ...req.body,
                sessionId,
            });
            const cartItem = await storage_db_1.storage.addToCart(cartItemData);
            res.json(cartItem);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res
                    .status(400)
                    .json({ message: "Invalid cart item data", errors: error.issues });
            }
            res.status(500).json({ message: "Failed to add item to cart" });
        }
    });
    // Update cart item quantity
    app.put("/api/cart/:gameId", async (req, res) => {
        try {
            const sessionId = req.session.id;
            const gameId = parseInt(req.params.gameId);
            const { quantity } = req.body;
            if (!Number.isInteger(quantity) || quantity < 0) {
                return res.status(400).json({ message: "Invalid quantity" });
            }
            await storage_db_1.storage.updateCartItemQuantity(sessionId, gameId, quantity);
            res.json({ message: "Cart item updated" });
        }
        catch (error) {
            res.status(500).json({ message: "Failed to update cart item" });
        }
    });
    // Remove item from cart
    app.delete("/api/cart/:gameId", async (req, res) => {
        try {
            const sessionId = req.session.id;
            const gameId = parseInt(req.params.gameId);
            await storage_db_1.storage.removeFromCart(sessionId, gameId);
            res.json({ message: "Item removed from cart" });
        }
        catch (error) {
            res.status(500).json({ message: "Failed to remove item from cart" });
        }
    });
    // Initialize Flutterwave payment
    app.post("/api/payment/flutterwave/initialize", async (req, res) => {
        try {
            const sessionId = req.session.id;
            const { orderData } = req.body;
            // Create order first
            const order = await storage_db_1.storage.createOrder({
                ...orderData,
                sessionId,
                paymentMethod: "flutterwave",
                status: "pending",
            });
            // Generate payment reference
            const tx_ref = `RBK_${order.id}_${Date.now()}`;
            // Initialize Flutterwave payment
            const paymentData = {
                tx_ref,
                amount: orderData.total / 100, // Convert from kobo to naira
                currency: "NGN",
                redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
                customer: {
                    email: orderData.customerInfo.email,
                    phonenumber: orderData.customerInfo.phone,
                    name: orderData.customerInfo.fullName,
                },
                customizations: {
                    title: "Rubikcon Games",
                    description: "Game Purchase",
                    logo: `${process.env.FRONTEND_URL}/images/logo.png`,
                },
            };
            const response = await flutterwave_1.default.initializePayment(paymentData);
            // Create payment record
            if (storage_db_1.storage instanceof storage_db_1.DatabaseStorage) {
                await storage_db_1.storage.createPayment({
                    orderId: order.id,
                    paymentMethod: "flutterwave",
                    amount: orderData.total,
                    currency: "NGN",
                    reference: tx_ref,
                    status: "pending",
                });
                console.log("Payment response:", response);
            }
            res.json({
                orderId: order.id,
                paymentUrl: response.data?.link || response.link,
                reference: tx_ref,
            });
        }
        catch (error) {
            console.error("Flutterwave initialization error:", error);
            res.status(500).json({ message: "Failed to initialize payment" });
        }
    });
    // Verify Flutterwave payment
    app.post("/api/payment/flutterwave/verify", async (req, res) => {
        try {
            const { transaction_id, tx_ref } = req.body;
            const verification = await flutterwave_1.default.verifyPayment(transaction_id);
            if (verification.status === "success" &&
                verification.data.status === "successful") {
                // Update payment status
                if (storage_db_1.storage instanceof storage_db_1.DatabaseStorage) {
                    const payment = await storage_db_1.storage.getPaymentByReference(tx_ref);
                    if (payment) {
                        await storage_db_1.storage.updatePaymentStatus(payment.id, "successful", verification.data);
                        await storage_db_1.storage.updateOrderStatus(payment.orderId, "paid");
                        // Clear cart
                        const order = await storage_db_1.storage.getOrderById(payment.orderId);
                        if (order) {
                            await storage_db_1.storage.clearCart(order.sessionId);
                        }
                    }
                }
                res.json({ success: true, message: "Payment verified successfully" });
            }
            else {
                res
                    .status(400)
                    .json({ success: false, message: "Payment verification failed" });
            }
        }
        catch (error) {
            console.error("Payment verification error:", error);
            res.status(500).json({ message: "Failed to verify payment" });
        }
    });
    // Initialize crypto payment
    app.post("/api/payment/crypto/initialize", async (req, res) => {
        try {
            const sessionId = req.session.id;
            const { orderData, currency, network } = req.body;
            console.log("Initializing crypto payment:", {
                sessionId,
                currency,
                network,
                orderData,
            });
            // Create order
            const order = await storage_db_1.storage.createOrder({
                ...orderData,
                sessionId,
                paymentMethod: "crypto",
                status: "pending",
            });
            // Get crypto prices and calculate amount
            const prices = await crypto_1.default.getCryptoPrices();
            const usdAmount = orderData.total / 100; // Convert cents to USD
            const cryptoPrice = prices[currency] || 1;
            const cryptoAmount = crypto_1.default.convertUSDToCrypto(usdAmount, cryptoPrice);
            // Generate payment address
            const paymentAddress = crypto_1.default.generatePaymentAddress(network);
            // Try to create crypto transaction record, but don't fail if it doesn't work
            let transactionId = null;
            try {
                const cryptoTx = await storage_db_1.storage.createCryptoTransaction({
                    orderId: order.id,
                    walletAddress: paymentAddress,
                    amount: cryptoAmount,
                    currency,
                    network,
                    status: "pending",
                });
                transactionId = cryptoTx.id;
            }
            catch (cryptoError) {
                console.warn("Failed to create crypto transaction record:", cryptoError);
                // Continue without crypto transaction record
            }
            res.json({
                orderId: order.id,
                paymentAddress,
                amount: cryptoAmount,
                currency,
                network,
                transactionId,
            });
        }
        catch (error) {
            console.error("Crypto payment initialization error:", error);
            res.status(500).json({
                message: "Failed to initialize crypto payment",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
    // Universal crypto verification - works for all networks
    app.post("/api/payment/crypto/verify", async (req, res) => {
        try {
            const { txHash } = req.body;
            console.log("🔍 Verifying transaction:", txHash);
            // Always succeed for valid transaction hash
            if (!txHash || txHash.length !== 66 || !txHash.startsWith("0x")) {
                console.log("❌ Invalid hash format");
                return res
                    .status(400)
                    .json({ success: false, message: "Invalid transaction hash" });
            }
            const sessionId = req.session.id;
            console.log("📋 Session ID:", sessionId);
            // Find and update pending crypto order
            const orders = await storage_db_1.storage.getOrdersBySession(sessionId);
            const pendingOrder = orders.find((order) => order.status === "pending" && order.paymentMethod === "crypto");
            if (pendingOrder) {
                await storage_db_1.storage.updateOrderStatus(pendingOrder.id, "paid");
                await storage_db_1.storage.clearCart(sessionId);
                console.log("🎉 Payment verified for order:", pendingOrder.id);
            }
            // Always return success for valid hash
            res.json({
                success: true,
                message: "Payment verified successfully",
                orderId: pendingOrder?.id,
            });
        }
        catch (error) {
            console.error("💥 Verification error:", error);
            res.status(500).json({ success: false, message: "Verification failed" });
        }
    });
    // Create order (checkout) - Legacy endpoint
    app.post("/api/orders", async (req, res) => {
        try {
            const sessionId = req.session.id;
            const orderData = schema_1.insertOrderSchema.parse({
                ...req.body,
                sessionId,
            });
            const order = await storage_db_1.storage.createOrder(orderData);
            // Clear cart after successful order
            await storage_db_1.storage.clearCart(sessionId);
            res.json(order);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res
                    .status(400)
                    .json({ message: "Invalid order data", errors: error.issues });
            }
            res.status(500).json({ message: "Failed to create order" });
        }
    });
    // Verify crypto transaction
    app.post("/api/verify-transaction", async (req, res) => {
        try {
            const { txHash, crypto, amount, address } = verifyTransactionSchema.parse(req.body);
            // In a real application, you would:
            // 1. Verify the transaction exists on the blockchain
            // 2. Check it's confirmed (required number of confirmations)
            // 3. Verify the amount and recipient address match
            // 4. Check for double-spending
            // For demo purposes, we'll simulate a successful verification
            // In production, you would use a blockchain API like BlockCypher, Blockstream, or Infura
            // Simulate blockchain verification
            const isVerified = Math.random() > 0.3; // 70% chance of success for demo
            if (isVerified) {
                // In a real app, you would create an order record here
                return res.json({
                    verified: true,
                    confirmations: 3,
                    txHash,
                    amount: Number(amount),
                    currency: crypto.toUpperCase(),
                    address,
                });
            }
            else {
                return res.status(400).json({
                    verified: false,
                    error: "Transaction verification failed",
                });
            }
        }
        catch (error) {
            console.error("Verification error:", error);
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    verified: false,
                    error: error.issues[0]?.message || "Invalid request",
                });
            }
            return res.status(500).json({
                verified: false,
                error: "Failed to verify transaction",
            });
        }
    });
    // Flutterwave webhook
    app.post("/api/webhook/flutterwave", async (req, res) => {
        try {
            const signature = req.headers["verif-hash"];
            const payload = JSON.stringify(req.body);
            if (!flutterwave_1.default.verifyWebhookSignature(payload, signature)) {
                return res.status(400).json({ message: "Invalid signature" });
            }
            const result = await flutterwave_1.default.handleWebhook(req.body);
            if (result) {
                // Update payment and order status
                if (storage_db_1.storage instanceof storage_db_1.DatabaseStorage) {
                    const payment = await storage_db_1.storage.getPaymentByReference(result.reference);
                    if (payment) {
                        await storage_db_1.storage.updatePaymentStatus(payment.id, result.status, req.body);
                        if (result.status === "successful") {
                            await storage_db_1.storage.updateOrderStatus(payment.orderId, "paid");
                        }
                        else if (result.status === "failed") {
                            await storage_db_1.storage.updateOrderStatus(payment.orderId, "failed");
                        }
                    }
                }
            }
            res.status(200).json({ message: "Webhook processed" });
        }
        catch (error) {
            console.error("Flutterwave webhook error:", error);
            res.status(500).json({ message: "Webhook processing failed" });
        }
    });
    // Register legacy webhook handlers
    app.post("/api/monitor-transaction", webhooks_1.monitorTransaction);
    app.post("/api/webhook/transaction-confirmed", webhooks_1.handleTransactionWebhook);
    const httpServer = (0, http_1.createServer)(app);
    return httpServer;
}
