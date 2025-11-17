"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoService = void 0;
const ethers_1 = require("ethers");
class CryptoService {
    static async verifyTransaction(data) {
        try {
            const network = this.NETWORKS[data.network];
            if (!network) {
                throw new Error(`Unsupported network: ${data.network}`);
            }
            const provider = new ethers_1.ethers.JsonRpcProvider(network.rpcUrl);
            const tx = await provider.getTransaction(data.txHash);
            if (!tx) {
                return false;
            }
            const receipt = await provider.getTransactionReceipt(data.txHash);
            if (!receipt) {
                return false;
            }
            // Verify transaction success
            if (receipt.status !== 1) {
                return false;
            }
            // Get current block number for confirmation count
            const currentBlock = await provider.getBlockNumber();
            const confirmations = currentBlock - receipt.blockNumber;
            // For testnet, require fewer confirmations
            const minConfirmations = data.network === 'sepolia' ? 1 : (data.network === 'ethereum' ? 12 : 6);
            return confirmations >= minConfirmations;
        }
        catch {
            return false;
        }
    }
    static async getTransactionDetails(txHash, network) {
        try {
            const networkConfig = this.NETWORKS[network];
            if (!networkConfig) {
                throw new Error(`Unsupported network: ${network}`);
            }
            const provider = new ethers_1.ethers.JsonRpcProvider(networkConfig.rpcUrl);
            const tx = await provider.getTransaction(txHash);
            const receipt = await provider.getTransactionReceipt(txHash);
            if (!tx || !receipt) {
                return null;
            }
            const currentBlock = await provider.getBlockNumber();
            const confirmations = currentBlock - receipt.blockNumber;
            return {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: ethers_1.ethers.formatEther(tx.value),
                gasUsed: receipt.gasUsed.toString(),
                status: receipt.status === 1 ? 'success' : 'failed',
                confirmations,
                blockNumber: receipt.blockNumber,
            };
        }
        catch {
            return null;
        }
    }
    static generatePaymentAddress(network) {
        // Use the payment wallet address from environment or default
        const paymentAddress = process.env.PAYMENT_WALLET_ADDRESS || '0x742d35Cc6634C0532925A3B8D4C9dB96C4B4d8B6';
        // Validate address format
        if (!paymentAddress || !paymentAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            throw new Error('Invalid payment wallet address format');
        }
        // Convert to checksum address using ethers
        return ethers_1.ethers.getAddress(paymentAddress);
    }
    static convertUSDToCrypto(usdAmount, cryptoPrice) {
        const cryptoAmount = usdAmount / cryptoPrice;
        return cryptoAmount.toFixed(8);
    }
    static async getCryptoPrices() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,tether,avalanche-2&vs_currencies=usd');
            if (!response.ok) {
                throw new Error('Failed to fetch crypto prices');
            }
            const data = await response.json();
            const prices = {
                ETH: { usd: data.ethereum?.usd || 3000 },
                AVAX: { usd: data['avalanche-2']?.usd || 30 },
                USDT: { usd: data.tether?.usd || 1 }
            };
            return prices;
        }
        catch {
            // Return fallback prices in correct format
            return {
                ETH: { usd: 3000 },
                AVAX: { usd: 30 },
                USDT: { usd: 1 }
            };
        }
    }
}
exports.CryptoService = CryptoService;
CryptoService.NETWORKS = {
    ethereum: {
        rpcUrl: 'https://eth.llamarpc.com',
        chainId: 1,
        name: 'Ethereum Mainnet'
    },
    sepolia: {
        rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
        chainId: 11155111,
        name: 'Sepolia Testnet'
    },
    polygon: {
        rpcUrl: 'https://polygon-rpc.com',
        chainId: 137,
        name: 'Polygon Mainnet'
    },
    bsc: {
        rpcUrl: 'https://bsc-dataseed1.binance.org/',
        chainId: 56,
        name: 'BSC Mainnet'
    },
    avalanche: {
        rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
        chainId: 43114,
        name: 'Avalanche C-Chain'
    }
};
CryptoService.TOKEN_CONTRACTS = {
    ethereum: {
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        USDC: '0xA0b86a33E6441b8435b662303c0f479c7c2f4c0e'
    },
    polygon: {
        USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
    },
    bsc: {
        USDT: '0x55d398326f99059fF775485246999027B3197955',
        USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
    }
};
exports.default = CryptoService;
