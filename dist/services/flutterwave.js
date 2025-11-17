"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlutterwaveService = void 0;
const flutterwave_node_v3_1 = __importDefault(require("flutterwave-node-v3"));
const crypto_1 = __importDefault(require("crypto"));
if (!process.env.FLUTTERWAVE_PUBLIC_KEY || !process.env.FLUTTERWAVE_SECRET_KEY) {
    throw new Error('Flutterwave API keys are required');
}
const flw = new flutterwave_node_v3_1.default(process.env.FLUTTERWAVE_PUBLIC_KEY, process.env.FLUTTERWAVE_SECRET_KEY);
class FlutterwaveService {
    static async initializePayment(paymentData) {
        try {
            const payload = {
                ...paymentData,
                payment_options: 'card,mobilemoney,ussd,banktransfer',
            };
            console.log('Flutterwave payload:', payload);
            const response = await flw.Payment.initialize(payload);
            console.log('Flutterwave response:', response);
            if (response.status === 'success') {
                return response;
            }
            else {
                throw new Error(response.message || 'Payment initialization failed');
            }
        }
        catch (error) {
            console.error('Flutterwave initialization error:', error);
            throw error;
        }
    }
    static async verifyPayment(transactionId) {
        try {
            const response = await flw.Transaction.verify({ id: transactionId });
            return response;
        }
        catch (error) {
            console.error('Flutterwave verification error:', error);
            throw new Error('Failed to verify payment');
        }
    }
    static verifyWebhookSignature(payload, signature) {
        const hash = crypto_1.default
            .createHmac('sha256', process.env.FLUTTERWAVE_SECRET_HASH)
            .update(payload, 'utf8')
            .digest('hex');
        return hash === signature;
    }
    static async handleWebhook(payload) {
        const { event, data } = payload;
        switch (event) {
            case 'charge.completed':
                return this.handleSuccessfulPayment(data);
            case 'charge.failed':
                return this.handleFailedPayment(data);
            default:
                console.log('Unhandled webhook event:', event);
                return null;
        }
    }
    static async handleSuccessfulPayment(data) {
        return {
            status: 'successful',
            transactionId: data.id,
            reference: data.tx_ref,
            amount: data.amount,
            currency: data.currency,
        };
    }
    static async handleFailedPayment(data) {
        return {
            status: 'failed',
            transactionId: data.id,
            reference: data.tx_ref,
            reason: data.processor_response,
        };
    }
}
exports.FlutterwaveService = FlutterwaveService;
exports.default = FlutterwaveService;
