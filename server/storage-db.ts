import { eq, and } from "drizzle-orm";
import { db } from "./database";
import {
  games,
  cartItems,
  orders,
  payments,
  cryptoTransactions,
  type Game,
  type CartItem,
  type Order,
  type Payment,
  type CryptoTransaction,
  type InsertCartItem,
  type InsertOrder,
  type InsertPayment,
  type InsertCryptoTransaction,
} from "./shared/schema";
import { MemStorage } from "./storage";

export interface IStorage {
  // Games
  getGames(): Promise<Game[]>;
  getGameBySlug(slug: string): Promise<Game | undefined>;
  getGameById(id: number): Promise<Game | undefined>;

  // Cart
  getCartItems(sessionId: string): Promise<(CartItem & { game: Game })[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(
    sessionId: string,
    gameId: number,
    quantity: number
  ): Promise<void>;
  removeFromCart(sessionId: string, gameId: number): Promise<void>;
  clearCart(sessionId: string): Promise<void>;

  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrdersBySession(sessionId: string): Promise<Order[]>;
  updateOrderStatus(id: number, status: string): Promise<void>;

  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(
    id: number,
    status: string,
    gatewayResponse?: any
  ): Promise<void>;
  getPaymentByReference(reference: string): Promise<Payment | undefined>;

  // Crypto Transactions
  createCryptoTransaction(
    transaction: InsertCryptoTransaction
  ): Promise<CryptoTransaction>;
  updateCryptoTransaction(
    id: number,
    updates: Partial<CryptoTransaction>
  ): Promise<void>;
  getCryptoTransactionByHash(
    txHash: string
  ): Promise<CryptoTransaction | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getGames(): Promise<Game[]> {
    return await db.select().from(games);
  }

  async getGameBySlug(slug: string): Promise<Game | undefined> {
    const result = await db.select().from(games).where(eq(games.slug, slug));
    return result[0];
  }

  async getGameById(id: number): Promise<Game | undefined> {
    const result = await db.select().from(games).where(eq(games.id, id));
    return result[0];
  }

  async getCartItems(
    sessionId: string
  ): Promise<(CartItem & { game: Game })[]> {
    const result = await db
      .select({
        id: cartItems.id,
        sessionId: cartItems.sessionId,
        gameId: cartItems.gameId,
        quantity: cartItems.quantity,
        createdAt: cartItems.createdAt,
        game: games,
      })
      .from(cartItems)
      .innerJoin(games, eq(cartItems.gameId, games.id))
      .where(eq(cartItems.sessionId, sessionId));

    return result;
  }

  async addToCart(item: any): Promise<CartItem> {
    // Check if item already exists in cart
    const existing = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.sessionId, item.sessionId),
          eq(cartItems.gameId, item.gameId)
        )
      );

    if (existing.length > 0) {
      // Update quantity
      const newQuantity = existing[0].quantity + (item.quantity || 1);
      await db
        .update(cartItems)
        .set({ quantity: newQuantity })
        .where(eq(cartItems.id, existing[0].id));

      return { ...existing[0], quantity: newQuantity };
    } else {
      // Insert new item
      const result = await db.insert(cartItems).values(item).returning();
      return result[0];
    }
  }

  async updateCartItemQuantity(
    sessionId: string,
    gameId: number,
    quantity: number
  ): Promise<void> {
    if (quantity <= 0) {
      await this.removeFromCart(sessionId, gameId);
    } else {
      await db
        .update(cartItems)
        .set({ quantity })
        .where(
          and(eq(cartItems.sessionId, sessionId), eq(cartItems.gameId, gameId))
        );
    }
  }

  async removeFromCart(sessionId: string, gameId: number): Promise<void> {
    await db
      .delete(cartItems)
      .where(
        and(eq(cartItems.sessionId, sessionId), eq(cartItems.gameId, gameId))
      );
  }

  async clearCart(sessionId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
  }

  async createOrder(order: any): Promise<Order> {
    const result = await db.insert(orders).values(order).returning();
    return result[0];
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id));
    return result[0];
  }

  async getOrdersBySession(sessionId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.sessionId, sessionId));
  }

  async updateOrderStatus(id: number, status: string): Promise<void> {
    await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id));
  }

  async createPayment(payment: any): Promise<Payment> {
    const result = await db.insert(payments).values(payment).returning();
    return result[0];
  }

  async updatePaymentStatus(
    id: number,
    status: string,
    gatewayResponse?: any
  ): Promise<void> {
    await db
      .update(payments)
      .set({
        status,
        gatewayResponse,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, id));
  }

  async getPaymentByReference(reference: string): Promise<Payment | undefined> {
    const result = await db
      .select()
      .from(payments)
      .where(eq(payments.reference, reference));
    return result[0];
  }

  async createCryptoTransaction(transaction: any): Promise<CryptoTransaction> {
    const result = await db
      .insert(cryptoTransactions)
      .values(transaction)
      .returning();
    return result[0];
  }

  async updateCryptoTransaction(
    id: number,
    updates: Partial<CryptoTransaction>
  ): Promise<void> {
    await db
      .update(cryptoTransactions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cryptoTransactions.id, id));
  }

  async getCryptoTransactionByHash(
    txHash: string
  ): Promise<CryptoTransaction | undefined> {
    const result = await db
      .select()
      .from(cryptoTransactions)
      .where(eq(cryptoTransactions.txHash, txHash));
    return result[0];
  }
}

// Use database storage in production, memory storage for development
export const storage =
  process.env.NODE_ENV === "production"
    ? new DatabaseStorage()
    : new MemStorage();
