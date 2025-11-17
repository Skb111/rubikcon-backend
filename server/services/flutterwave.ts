import Flutterwave from 'flutterwave-node-v3';
import crypto from 'crypto';

if (!process.env.FLUTTERWAVE_PUBLIC_KEY || !process.env.FLUTTERWAVE_SECRET_KEY) {
  throw new Error('Flutterwave API keys are required');
}

const flw = new Flutterwave(
  process.env.FLUTTERWAVE_PUBLIC_KEY,
  process.env.FLUTTERWAVE_SECRET_KEY
);

export interface FlutterwavePaymentData {
  tx_ref: string;
  amount: number;
  currency: string;
  redirect_url: string;
  customer: {
    email: string;
    phonenumber: string;
    name: string;
  };
  customizations: {
    title: string;
    description: string;
    logo: string;
  };
}

export class FlutterwaveService {
  static async initializePayment(paymentData: FlutterwavePaymentData) {
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
      } else {
        throw new Error(response.message || 'Payment initialization failed');
      }
    } catch (error) {
      console.error('Flutterwave initialization error:', error);
      throw error;
    }
  }

  static async verifyPayment(transactionId: string) {
    try {
      const response = await flw.Transaction.verify({ id: transactionId });
      return response;
    } catch (error) {
      console.error('Flutterwave verification error:', error);
      throw new Error('Failed to verify payment');
    }
  }

  static verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha256', process.env.FLUTTERWAVE_SECRET_HASH!)
      .update(payload, 'utf8')
      .digest('hex');
    
    return hash === signature;
  }

  static async handleWebhook(payload: any) {
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

  private static async handleSuccessfulPayment(data: any) {
    return {
      status: 'successful',
      transactionId: data.id,
      reference: data.tx_ref,
      amount: data.amount,
      currency: data.currency,
    };
  }

  private static async handleFailedPayment(data: any) {
    return {
      status: 'failed',
      transactionId: data.id,
      reference: data.tx_ref,
      reason: data.processor_response,
    };
  }
}

export default FlutterwaveService;