import {
  games,
  cartItems,
  orders,
  cryptoTransactions,
  type CartItem,
  type Order,
  type CryptoTransaction,
  type InsertCartItem,
  type InsertOrder,
  type InsertCryptoTransaction,
} from "./shared/schema.js";

// Define local interfaces to avoid conflict with imported types
interface LocalGame {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: number; // Price in cents
  category: string;
  image: string;
  images: string[];
  isOnline: number;
  howToPlay: string; // Instructions for playing the game
  createdAt: Date | null;
}

// Define the type for game insertion (used in sample data)
type LocalInsertGame = Omit<LocalGame, "id" | "createdAt">;

export interface IStorage {
  // Games
  getGames(): Promise<LocalGame[]>;
  getGameBySlug(slug: string): Promise<LocalGame | undefined>;
  getGameById(id: number): Promise<LocalGame | undefined>;
  createGame(game: LocalInsertGame): Promise<LocalGame>;

  // Cart
  getCartItems(sessionId: string): Promise<(CartItem & { game: LocalGame })[]>;
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

export class MemStorage implements IStorage {
  private games: Map<number, LocalGame>;
  private cartItems: Map<string, CartItem[]>;
  private orders: Map<number, Order>;
  private cryptoTransactions: Map<number, CryptoTransaction>;
  private currentGameId: number;
  private currentCartItemId: number;
  private currentOrderId: number;
  private currentCryptoTxId: number;

  constructor() {
    this.games = new Map();
    this.cartItems = new Map();
    this.orders = new Map();
    this.cryptoTransactions = new Map();
    this.currentGameId = 1;
    this.currentCartItemId = 1;
    this.currentOrderId = 1;
    this.currentCryptoTxId = 1;

    // Initialize with sample games
    this.initializeGames();
  }

  private initializeGames() {
    const sampleGames: LocalInsertGame[] = [
      {
        title: "Crypto Charades",
        slug: "crypto-charades",
        description:
          "How well do you REALLY know crypto lingo? Act out Bitcoin, DeFi, NFTs and more in this hilarious party game that'll have everyone guessing and laughing!",
        price: 100, // $1 in cents
        category: "card",
        image: "/images/crypto-charade-main.png",
        images: [
          "/images/crypto-charade-2.jpg",
          "/images/crypto-charade-3.png",
        ],
        isOnline: 0,
        howToPlay: `Crypto Charade like any other game is freestyle. Players can come up with the rules on their own and implement things as they go.

There are two teams, A & B.

Each team has an actor who tries to act the card name without speaking and the other team members try to guess what the actor is saying.

Each team actor picks from a shuffled deck of cards and tries to act the card name in a period of time.

Both teams take turns and keep playing until the game is over`,
      },
      {
        title: "Blocks and Hashes",
        slug: "blocks-and-hashes",
        description:
          "Master the fundamentals of blockchain technology with this strategic card game that teaches you about cryptographic hashing, mining, and consensus mechanisms.",
        price: 100, // $1 in cents
        category: "card",
        image: "/images/card3.png",
        images: ["/images/card3.png"],
        isOnline: 0,
        howToPlay: `There are different ways to play this game, but you must race against time to guess the words using hints like missing letters (dashes) and images (blocks) on the front card. Choose a game type and have fun with your friends.

Game 1: The Guessing Game
Shuffle the cards and place them face down.
Each player takes turns picking a card and has 10 seconds to guess the word using the hints (image and missing letters).
A correct guess wins the card point; if incorrect, the card goes back into the pile.
The player with the most points at the end wins.

Game 2: The Challenger's Game
Shuffle the cards and distribute an equal number to each player.
Players must place their cards front-side up.
Your opponent picks a card from your pile.
You must guess the word correctly.
A correct answer earns you the card's points; a wrong answer gives the point to your opponent.
The game continues until all cards are used, and the highest scorer wins.`,
      },
      {
        title: "Into the Cryptoverse",
        slug: "into-the-cryptoverse",
        description:
          "Journey through the multiverse of cryptocurrency in this immersive card game experience that spans Bitcoin, Ethereum, and beyond.",
        price: 100, // $1 in cents
        category: "card",
        image: " /images/card4.png",
        images: ["/images/card4.png"],
        isOnline: 0,
        howToPlay:
          "Embark on a journey through the cryptocurrency multiverse. Collect cards representing different cryptocurrencies and blockchain technologies. Strategize to build the most powerful crypto portfolio by trading and investing based on market events drawn from event cards. The player with the highest portfolio value at the end of the game wins.",
      },
      {
        title: "Web3 Trivia Online",
        slug: "web3-trivia-online",
        description:
          "Play the ultimate Web3 trivia game online with friends from around the world. Test your knowledge and climb the leaderboards!",
        price: 100, // $1 in cents
        category: "online",
        image: "/images/card5.png",
        images: ["/images/card5.png"],
        isOnline: 1,
        howToPlay:
          "Join an online trivia match focused on Web3 topics like blockchain, NFTs, and DeFi. Answer multiple-choice questions within the time limit to score points. Compete against global players, earn ranks, and unlock special trivia packs with correct answers.",
      },
    ];

    sampleGames.forEach((game) => {
      this.createGame(game);
    });
  }

  async getGames(): Promise<LocalGame[]> {
    return Array.from(this.games.values());
  }

  async getGameBySlug(slug: string): Promise<LocalGame | undefined> {
    return Array.from(this.games.values()).find((game) => game.slug === slug);
  }

  async getGameById(id: number): Promise<LocalGame | undefined> {
    return this.games.get(id);
  }

  async createGame(insertGame: LocalInsertGame): Promise<LocalGame> {
    const id = this.currentGameId++;
    const game: LocalGame = {
      ...insertGame,
      id,
      images: insertGame.images || [],
      isOnline: insertGame.isOnline || 0,
      createdAt: new Date(),
    };
    this.games.set(id, game);
    return game;
  }

  async getCartItems(
    sessionId: string
  ): Promise<(CartItem & { game: LocalGame })[]> {
    const items = this.cartItems.get(sessionId) || [];
    const result: (CartItem & { game: LocalGame })[] = [];

    for (const item of items) {
      const game = this.games.get(item.gameId);
      if (game) {
        result.push({ ...item, game });
      }
    }

    return result;
  }

  async addToCart(insertItem: InsertCartItem): Promise<CartItem> {
    const sessionItems = this.cartItems.get(insertItem.sessionId) || [];
    const existingItem = sessionItems.find(
      (item) => item.gameId === insertItem.gameId
    );

    if (existingItem) {
      existingItem.quantity += insertItem.quantity || 1;
      return existingItem;
    } else {
      const newItem: CartItem = {
        ...insertItem,
        gameId: 0,
        sessionId: "",
        id: this.currentCartItemId++,
        quantity: insertItem.quantity || 1,
        createdAt: new Date(),
      };
      sessionItems.push(newItem);
      this.cartItems.set(insertItem.sessionId, sessionItems);
      return newItem;
    }
  }

  async updateCartItemQuantity(
    sessionId: string,
    gameId: number,
    quantity: number
  ): Promise<void> {
    const sessionItems = this.cartItems.get(sessionId) || [];
    const item = sessionItems.find((item) => item.gameId === gameId);

    if (item) {
      if (quantity <= 0) {
        await this.removeFromCart(sessionId, gameId);
      } else {
        item.quantity = quantity;
      }
    }
  }

  async removeFromCart(sessionId: string, gameId: number): Promise<void> {
    const sessionItems = this.cartItems.get(sessionId) || [];
    const filteredItems = sessionItems.filter((item) => item.gameId !== gameId);
    this.cartItems.set(sessionId, filteredItems);
  }

  async clearCart(sessionId: string): Promise<void> {
    this.cartItems.delete(sessionId);
  }

  async createOrder(insertOrder: any): Promise<Order> {
    const id = this.currentOrderId++;
    const order: Order = {
      ...insertOrder,
      id,
      items: insertOrder.items,
      status: insertOrder.status || "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.orders.set(id, order);
    return order;
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersBySession(sessionId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.sessionId === sessionId
    );
  }

  async updateOrderStatus(id: number, status: string): Promise<void> {
    const order = this.orders.get(id);
    if (order) {
      order.status = status;
      order.updatedAt = new Date();
    }
  }

  async createCryptoTransaction(
    insertTransaction: any
  ): Promise<CryptoTransaction> {
    const id = this.currentCryptoTxId++;
    const transaction: CryptoTransaction = {
      ...insertTransaction,
      id,
      confirmations: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.cryptoTransactions.set(id, transaction);
    return transaction;
  }

  async updateCryptoTransaction(
    id: number,
    updates: Partial<CryptoTransaction>
  ): Promise<void> {
    const transaction = this.cryptoTransactions.get(id);
    if (transaction) {
      Object.assign(transaction, updates);
      transaction.updatedAt = new Date();
    }
  }

  async getCryptoTransactionByHash(
    txHash: string
  ): Promise<CryptoTransaction | undefined> {
    return Array.from(this.cryptoTransactions.values()).find(
      (tx) => tx.txHash === txHash
    );
  }
}

// export const storage = new MemStorage();
