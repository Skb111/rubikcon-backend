"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertCryptoTransactionSchema = exports.insertPaymentSchema = exports.insertOrderSchema = exports.insertCartItemSchema = exports.insertGameSchema = exports.cryptoTransactions = exports.payments = exports.orders = exports.cartItems = exports.games = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
exports.games = (0, pg_core_1.pgTable)("games", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    title: (0, pg_core_1.text)("title").notNull(),
    slug: (0, pg_core_1.text)("slug").notNull().unique(),
    description: (0, pg_core_1.text)("description").notNull(),
    price: (0, pg_core_1.integer)("price").notNull(), // Price in kobo (Nigerian currency)
    category: (0, pg_core_1.text)("category").notNull(), // 'card' or 'online'
    image: (0, pg_core_1.text)("image").notNull(),
    images: (0, pg_core_1.jsonb)("images").$type().notNull().default([]),
    isOnline: (0, pg_core_1.integer)("is_online").notNull().default(0), // 0 for card games, 1 for online games
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.cartItems = (0, pg_core_1.pgTable)("cart_items", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    sessionId: (0, pg_core_1.text)("session_id").notNull(),
    gameId: (0, pg_core_1.integer)("game_id").notNull().references(() => exports.games.id),
    quantity: (0, pg_core_1.integer)("quantity").notNull().default(1),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.orders = (0, pg_core_1.pgTable)("orders", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    sessionId: (0, pg_core_1.text)("session_id").notNull(),
    customerInfo: (0, pg_core_1.jsonb)("customer_info").$type().notNull(),
    items: (0, pg_core_1.jsonb)("items").$type().notNull(),
    total: (0, pg_core_1.integer)("total").notNull(),
    status: (0, pg_core_1.text)("status").notNull().default("pending"),
    paymentMethod: (0, pg_core_1.text)("payment_method"), // 'flutterwave' | 'crypto'
    paymentReference: (0, pg_core_1.text)("payment_reference"),
    transactionId: (0, pg_core_1.text)("transaction_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// New table for payment transactions
exports.payments = (0, pg_core_1.pgTable)("payments", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    orderId: (0, pg_core_1.integer)("order_id").notNull().references(() => exports.orders.id),
    paymentMethod: (0, pg_core_1.text)("payment_method").notNull(), // 'flutterwave' | 'crypto'
    amount: (0, pg_core_1.integer)("amount").notNull(),
    currency: (0, pg_core_1.text)("currency").notNull().default("NGN"),
    status: (0, pg_core_1.text)("status").notNull().default("pending"), // 'pending' | 'successful' | 'failed' | 'cancelled'
    reference: (0, pg_core_1.text)("reference").notNull(),
    transactionId: (0, pg_core_1.text)("transaction_id"),
    gatewayResponse: (0, pg_core_1.jsonb)("gateway_response"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// New table for crypto transactions
exports.cryptoTransactions = (0, pg_core_1.pgTable)("crypto_transactions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    orderId: (0, pg_core_1.integer)("order_id").notNull().references(() => exports.orders.id),
    walletAddress: (0, pg_core_1.text)("wallet_address").notNull(),
    txHash: (0, pg_core_1.text)("tx_hash"),
    amount: (0, pg_core_1.text)("amount").notNull(), // Store as string to handle precision
    currency: (0, pg_core_1.text)("currency").notNull(), // 'ETH' | 'USDT' | 'BTC'
    network: (0, pg_core_1.text)("network").notNull(), // 'ethereum' | 'polygon' | 'bsc'
    status: (0, pg_core_1.text)("status").notNull().default("pending"),
    confirmations: (0, pg_core_1.integer)("confirmations").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.insertGameSchema = (0, drizzle_zod_1.createInsertSchema)(exports.games)
    .pick({
    title: true,
    slug: true,
    description: true,
    price: true,
    category: true,
    image: true,
    isOnline: true,
})
    .extend({
    images: zod_1.z.array(zod_1.z.string().url()).optional(), // add images manually
});
exports.insertCartItemSchema = (0, drizzle_zod_1.createInsertSchema)(exports.cartItems).omit({
    id: true,
    createdAt: true,
});
const orderItemSchema = zod_1.z.object({
    gameId: zod_1.z.number(),
    title: zod_1.z.string(),
    price: zod_1.z.number(),
    quantity: zod_1.z.number(),
});
exports.insertOrderSchema = (0, drizzle_zod_1.createInsertSchema)(exports.orders)
    .omit({ id: true, createdAt: true })
    .extend({
    items: zod_1.z.lazy(() => zod_1.z.array(orderItemSchema)), // <- wrap in lazy
});
exports.insertPaymentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.payments)
    .omit({ id: true, createdAt: true, updatedAt: true })
    .extend({
    gatewayResponse: zod_1.z.any().optional(), // override or relax type
});
exports.insertCryptoTransactionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.cryptoTransactions).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
