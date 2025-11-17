"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.DatabaseStorage = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_1 = require("./database");
const schema_1 = require("./shared/schema");
const storage_1 = require("./storage");
class DatabaseStorage {
    async getGames() {
        return await database_1.db.select().from(schema_1.games);
    }
    async getGameBySlug(slug) {
        const result = await database_1.db.select().from(schema_1.games).where((0, drizzle_orm_1.eq)(schema_1.games.slug, slug));
        return result[0];
    }
    async getGameById(id) {
        const result = await database_1.db.select().from(schema_1.games).where((0, drizzle_orm_1.eq)(schema_1.games.id, id));
        return result[0];
    }
    async getCartItems(sessionId) {
        const result = await database_1.db
            .select({
            id: schema_1.cartItems.id,
            sessionId: schema_1.cartItems.sessionId,
            gameId: schema_1.cartItems.gameId,
            quantity: schema_1.cartItems.quantity,
            createdAt: schema_1.cartItems.createdAt,
            game: schema_1.games,
        })
            .from(schema_1.cartItems)
            .innerJoin(schema_1.games, (0, drizzle_orm_1.eq)(schema_1.cartItems.gameId, schema_1.games.id))
            .where((0, drizzle_orm_1.eq)(schema_1.cartItems.sessionId, sessionId));
        return result;
    }
    async addToCart(item) {
        // Check if item already exists in cart
        const existing = await database_1.db
            .select()
            .from(schema_1.cartItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.sessionId, item.sessionId), (0, drizzle_orm_1.eq)(schema_1.cartItems.gameId, item.gameId)));
        if (existing.length > 0) {
            // Update quantity
            const newQuantity = existing[0].quantity + (item.quantity || 1);
            await database_1.db
                .update(schema_1.cartItems)
                .set({ quantity: newQuantity })
                .where((0, drizzle_orm_1.eq)(schema_1.cartItems.id, existing[0].id));
            return { ...existing[0], quantity: newQuantity };
        }
        else {
            // Insert new item
            const result = await database_1.db.insert(schema_1.cartItems).values(item).returning();
            return result[0];
        }
    }
    async updateCartItemQuantity(sessionId, gameId, quantity) {
        if (quantity <= 0) {
            await this.removeFromCart(sessionId, gameId);
        }
        else {
            await database_1.db
                .update(schema_1.cartItems)
                .set({ quantity })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.sessionId, sessionId), (0, drizzle_orm_1.eq)(schema_1.cartItems.gameId, gameId)));
        }
    }
    async removeFromCart(sessionId, gameId) {
        await database_1.db
            .delete(schema_1.cartItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.sessionId, sessionId), (0, drizzle_orm_1.eq)(schema_1.cartItems.gameId, gameId)));
    }
    async clearCart(sessionId) {
        await database_1.db.delete(schema_1.cartItems).where((0, drizzle_orm_1.eq)(schema_1.cartItems.sessionId, sessionId));
    }
    async createOrder(order) {
        const result = await database_1.db.insert(schema_1.orders).values(order).returning();
        return result[0];
    }
    async getOrderById(id) {
        const result = await database_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, id));
        return result[0];
    }
    async getOrdersBySession(sessionId) {
        return await database_1.db
            .select()
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.eq)(schema_1.orders.sessionId, sessionId));
    }
    async updateOrderStatus(id, status) {
        await database_1.db
            .update(schema_1.orders)
            .set({ status, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.orders.id, id));
    }
    async createPayment(payment) {
        const result = await database_1.db.insert(schema_1.payments).values(payment).returning();
        return result[0];
    }
    async updatePaymentStatus(id, status, gatewayResponse) {
        await database_1.db
            .update(schema_1.payments)
            .set({
            status,
            gatewayResponse,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.payments.id, id));
    }
    async getPaymentByReference(reference) {
        const result = await database_1.db
            .select()
            .from(schema_1.payments)
            .where((0, drizzle_orm_1.eq)(schema_1.payments.reference, reference));
        return result[0];
    }
    async createCryptoTransaction(transaction) {
        const result = await database_1.db
            .insert(schema_1.cryptoTransactions)
            .values(transaction)
            .returning();
        return result[0];
    }
    async updateCryptoTransaction(id, updates) {
        await database_1.db
            .update(schema_1.cryptoTransactions)
            .set({ ...updates, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.cryptoTransactions.id, id));
    }
    async getCryptoTransactionByHash(txHash) {
        const result = await database_1.db
            .select()
            .from(schema_1.cryptoTransactions)
            .where((0, drizzle_orm_1.eq)(schema_1.cryptoTransactions.txHash, txHash));
        return result[0];
    }
}
exports.DatabaseStorage = DatabaseStorage;
// Use database storage in production, memory storage for development
exports.storage = process.env.NODE_ENV === "production"
    ? new DatabaseStorage()
    : new storage_1.MemStorage();
