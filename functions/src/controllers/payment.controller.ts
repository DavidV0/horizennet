import { Request, Response } from 'express';
import { stripeService } from '../services/stripe.service';

type CountryCode = 'AT' | 'DE' | 'CH' | 'GB' | 'US' | 'CA' | 'default';

// VAT rates by country code
const VAT_RATES: Record<CountryCode, number> = {
  AT: 0.20, // Austria 20%
  DE: 0.19, // Germany 19%
  CH: 0.077, // Switzerland 7.7%
  GB: 0.20, // UK 20%
  US: 0, // USA no VAT
  CA: 0.05, // Canada 5% GST
  default: 0.20 // Default to Austrian VAT
};

// Supported currencies by country
const COUNTRY_CURRENCIES: Record<CountryCode, string> = {
  AT: 'eur',
  DE: 'eur',
  CH: 'chf',
  GB: 'gbp',
  US: 'usd',
  CA: 'cad',
  default: 'eur'
};

export const paymentController = {
  createPaymentIntent: async (req: Request, res: Response): Promise<void> => {
    try {
      const { amount, country = "AT", customer, payment_method } = req.body;
      
      // Get country-specific settings
      const vatRate = VAT_RATES[country as CountryCode] ?? VAT_RATES.default;
      const currency = COUNTRY_CURRENCIES[country as CountryCode] ?? COUNTRY_CURRENCIES.default;
      
      // Calculate amount with VAT
      const amountWithVat = Math.round(amount * (1 + vatRate));
      
      console.log('Received payment intent request:', { 
        amount, 
        amountWithVat,
        currency, 
        country,
        vatRate,
        customer, 
        payment_method 
      });

      if (!amount || !customer || !payment_method) {
        console.error('Missing required fields:', { amount, customer, payment_method });
        res.status(400).json({ error: "Amount, customer and payment_method are required" });
        return;
      }

      try {
        // Create payment intent with manual capture
        console.log('Creating payment intent');
        const paymentIntentData = {
          amount: amountWithVat,
          currency,
          customer,
          payment_method,
          confirmation_method: 'manual' as const,
          capture_method: 'manual' as const,
          setup_future_usage: 'off_session' as const,
          metadata: {
            requires_3ds: 'true',
            original_amount: amount.toString(),
            vat_rate: vatRate.toString(),
            vat_amount: (amountWithVat - amount).toString(),
            country
          }
        };

        console.log('Payment intent data:', paymentIntentData);
        const paymentIntent = await stripeService.paymentIntents.create(paymentIntentData);
        console.log('Created payment intent:', paymentIntent.id);

        // Create an invoice but don't finalize until payment is captured
        console.log('Creating invoice for customer:', customer);
        const invoice = await stripeService.invoices.create({
          customer,
          auto_advance: false,
          collection_method: 'charge_automatically',
          pending_invoice_items_behavior: 'include',
          currency,
          metadata: {
            vat_rate: vatRate.toString(),
            country
          }
        });

        console.log('Created invoice:', invoice.id);

        // Add invoice item with VAT details
        console.log('Adding invoice item:', { amount: amountWithVat, currency });
        await stripeService.invoiceItems.create({
          customer,
          amount: amountWithVat,
          currency,
          description: `HorizonNet Produkt (inkl. ${(vatRate * 100).toFixed(1)}% ${country === 'CH' ? 'MwSt' : 'USt'})`,
          invoice: invoice.id,
          metadata: {
            original_amount: amount.toString(),
            vat_rate: vatRate.toString(),
            vat_amount: (amountWithVat - amount).toString()
          }
        });

        // Update payment intent with invoice metadata
        await stripeService.paymentIntents.update(paymentIntent.id, {
          metadata: {
            invoice_id: invoice.id
          }
        });

        res.json({
          clientSecret: paymentIntent.client_secret,
          id: paymentIntent.id,
          status: paymentIntent.status,
          invoice_id: invoice.id,
          amount: amountWithVat,
          currency,
          vat_rate: vatRate,
          country
        });
      } catch (stripeError) {
        console.error('Stripe API Error:', stripeError);
        res.status(400).json({
          error: 'Stripe API Error',
          details: stripeError instanceof Error ? stripeError.message : String(stripeError)
        });
      }
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ 
        error: "Error creating payment intent",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  },

  capturePayment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentIntentId } = req.params;
      
      // Get the payment intent
      const paymentIntent = await stripeService.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'requires_capture') {
        res.status(400).json({ error: "Payment intent cannot be captured" });
        return;
      }

      // Capture the payment
      const capturedPayment = await stripeService.paymentIntents.capture(paymentIntentId);

      // If capture successful, finalize and pay invoice
      if (capturedPayment.status === 'succeeded' && capturedPayment.metadata?.invoice_id) {
        const invoice = await stripeService.invoices.retrieve(capturedPayment.metadata.invoice_id);
        if (invoice.status === 'draft') {
          await stripeService.invoices.finalizeInvoice(invoice.id);
        }
        if (invoice.status === 'open') {
          await stripeService.invoices.pay(invoice.id);
        }
      }

      res.json({
        id: capturedPayment.id,
        status: capturedPayment.status,
        amount_received: capturedPayment.amount_received
      });
    } catch (error) {
      console.error('Error capturing payment:', error);
      res.status(500).json({ error: 'Failed to capture payment' });
    }
  },

  getPaymentIntent: async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentIntentId } = req.params;
      const paymentIntent = await stripeService.paymentIntents.retrieve(paymentIntentId);
      
      res.json({
        id: paymentIntent.id,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret
      });
    } catch (error) {
      console.error('Error getting payment intent:', error);
      res.status(500).json({ error: 'Failed to get payment intent' });
    }
  },

  retryPayment: async (req: Request, res: Response) => {
    try {
      const { paymentIntentId } = req.params;
      const { paymentMethodId } = req.body;

      const paymentIntent = await stripeService.paymentIntents.retrieve(paymentIntentId);

      if (!paymentIntent || paymentIntent.status === 'succeeded') {
        res.status(400).json({ error: "Payment intent cannot be retried" });
        return;
      }

      if (paymentMethodId) {
        await stripeService.paymentIntents.update(paymentIntentId, {
          payment_method: paymentMethodId
        });
      }

      const confirmedIntent = await stripeService.paymentIntents.confirm(paymentIntentId);

      res.json({
        id: confirmedIntent.id,
        status: confirmedIntent.status,
        clientSecret: confirmedIntent.client_secret,
      });
    } catch (error) {
      console.error("Error retrying payment:", error);
      res.status(500).json({ error: "Error retrying payment" });
    }
  },

  createSetupIntent: async (req: Request, res: Response): Promise<void> => {
    try {
      const { customer, payment_method } = req.body;
      
      if (!customer || !payment_method) {
        res.status(400).json({ error: "Customer and payment_method are required" });
        return;
      }

      const setupIntent = await stripeService.setupIntents.create({
        customer,
        payment_method,
        payment_method_types: ['card'],
        usage: 'off_session'
      });

      res.json({
        client_secret: setupIntent.client_secret,
        id: setupIntent.id,
        status: setupIntent.status
      });
    } catch (error) {
      console.error('Error creating setup intent:', error);
      res.status(500).json({ error: 'Failed to create setup intent' });
    }
  },

  createCheckoutSession: async (req: Request, res: Response): Promise<void> => {
    try {
      const { priceId, successUrl, cancelUrl, customerEmail } = req.body;
      
      if (!priceId || !successUrl || !cancelUrl) {
        res.status(400).json({ error: "Price ID, success URL and cancel URL are required" });
        return;
      }

      const session = await stripeService.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        payment_method_collection: 'always',
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        metadata: {
          source: 'horizennet_web'
        }
      });

      res.json({
        sessionId: session.id,
        url: session.url
      });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}; 