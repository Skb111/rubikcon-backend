import { pgTable, text, serial, integer, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // Price in kobo (Nigerian currency)
  category: text("category").notNull(), // 'card' or 'online'
  image: text("image").notNull(),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  isOnline: integer("is_online").notNull().default(0), // 0 for card games, 1 for online games
  createdAt: timestamp("created_at").defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  gameId: integer("game_id").notNull().references(() => games.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  customerInfo: jsonb("customer_info").$type<{
    fullName: string;
    email: string;
    phone: string;
    address: string;
    country: string;
    state: string;
  }>().notNull(),
  items: jsonb("items").$type<Array<{
    gameId: number;
    title: string;
    price: number;
    quantity: number;
  }>>().notNull(),
  total: integer("total").notNull(),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method"), // 'flutterwave' | 'crypto'
  paymentReference: text("payment_reference"),
  transactionId: text("transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// New table for payment transactions
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  paymentMethod: text("payment_method").notNull(), // 'flutterwave' | 'crypto'
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("NGN"),
  status: text("status").notNull().default("pending"), // 'pending' | 'successful' | 'failed' | 'cancelled'
  reference: text("reference").notNull(),
  transactionId: text("transaction_id"),
  gatewayResponse: jsonb("gateway_response"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// New table for crypto transactions
export const cryptoTransactions = pgTable("crypto_transactions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  walletAddress: text("wallet_address").notNull(),
  txHash: text("tx_hash"),
  amount: text("amount").notNull(), // Store as string to handle precision
  currency: text("currency").notNull(), // 'ETH' | 'USDT' | 'BTC'
  network: text("network").notNull(), // 'ethereum' | 'polygon' | 'bsc'
  status: text("status").notNull().default("pending"),
  confirmations: integer("confirmations").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

type GameTable = typeof games;
export const insertGameSchema = createInsertSchema(games)
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
    images: z.array(z.string().url()).optional(), // add images manually
  });


export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

const orderItemSchema = z.object({
  gameId: z.number(),
  title: z.string(),
  price: z.number(),
  quantity: z.number(),
});

export const insertOrderSchema = createInsertSchema(orders)
  .omit({ id: true, createdAt: true })
  .extend({
    items: z.lazy(() => z.array(orderItemSchema)), // <- wrap in lazy
  });

export const insertPaymentSchema = createInsertSchema(payments)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    gatewayResponse: z.any().optional(), // override or relax type
  });


export const insertCryptoTransactionSchema = createInsertSchema(cryptoTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Game = typeof games.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type CryptoTransaction = typeof cryptoTransactions.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertCryptoTransaction = z.infer<typeof insertCryptoTransactionSchema>;
