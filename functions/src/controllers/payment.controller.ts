import { Request, Response } from 'express';
import { stripeService } from '../services/stripe.service';
import Stripe from 'stripe';
import { stripe } from '../config/stripe';

type CountryCode = 'AT' | 'DE' | 'CH' | 'GB' | 'US' | 'CA' | 'default';

interface PriceData {
  currency: string;
  unit_amount: number;
  type: 'one_time' | 'recurring';
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count: number;
    usage_type: 'licensed' | 'metered';
  };
}

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

  createCheckoutSession: async (req: Request, res: Response) => {
    try {
      const { priceId, successUrl, cancelUrl, customerData } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: 'Price ID is required' });
      }

      console.log('Creating checkout session with:', { priceId, customerData });

      // Get the price to determine if it's a one-time or recurring payment
      let price;
      try {
        price = await stripe.prices.retrieve(priceId);
        console.log('Retrieved price:', { id: price.id, type: price.type });
      } catch (error) {
        console.error('Error retrieving price:', error);
        return res.status(400).json({ 
          error: 'Invalid price ID',
          details: error instanceof Error ? error.message : String(error)
        });
      }

      // Create customer first
      let customer;
      try {
        customer = await stripe.customers.create({
          email: customerData?.email,
          name: customerData ? `${customerData.firstName} ${customerData.lastName}` : undefined,
          phone: customerData?.mobile,
          address: customerData ? {
            line1: `${customerData.street} ${customerData.streetNumber}`,
            postal_code: customerData.zipCode,
            city: customerData.city,
            country: customerData.country,
          } : undefined,
          metadata: {
            firstName: customerData?.firstName,
            lastName: customerData?.lastName
          }
        });
        console.log('Created customer:', { id: customer.id });
      } catch (error) {
        console.error('Error creating customer:', error);
        return res.status(400).json({ 
          error: 'Failed to create customer',
          details: error instanceof Error ? error.message : String(error)
        });
      }

      const mode = price.type === 'recurring' ? 'subscription' : 'payment';
      console.log('Session mode:', mode);

      // Ensure paymentPlan is a string
      const paymentPlan = (customerData?.paymentPlan || '0').toString();
      console.log('Payment plan:', paymentPlan);

      // Calculate tax based on country
      const country = customerData?.country || 'AT';
      const vatRate = VAT_RATES[country as CountryCode] ?? VAT_RATES.default;
      const unitAmount = price.unit_amount || 0;
      const taxAmount = Math.round(unitAmount * vatRate);

      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
            tax_rates: [], // We'll handle tax manually
          },
        ],
        mode: mode as Stripe.Checkout.SessionCreateParams.Mode,
        success_url: successUrl || `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${req.headers.origin}/cancel`,
        customer: customer.id,
        ...(mode === 'subscription' ? {
          payment_method_collection: 'always',
          subscription_data: {
            metadata: {
              paymentPlan
            },
            trial_end: Math.floor(Date.now() / 1000)
          }
        } : {}),
        billing_address_collection: 'required',
        phone_number_collection: { enabled: true },
        metadata: {
          firstName: customerData?.firstName,
          lastName: customerData?.lastName,
          vatRate: vatRate.toString(),
          taxAmount: taxAmount.toString(),
          paymentPlan,
          paymentMode: mode,
          paymentType: mode
        },
        custom_text: {
          submit: {
            message: 'Mit der Zahlung fortfahren'
          }
        },
        locale: 'de',
        allow_promotion_codes: true,
        customer_update: {
          address: 'auto',
          name: 'auto'
        }
      };

      console.log('Creating session with config:', sessionConfig);

      const session = await stripe.checkout.sessions.create(sessionConfig);

      console.log('Session created:', { id: session.id, url: session.url });

      return res.json({
        sessionId: session.id,
        url: session.url
      });
    } catch (error) {
      console.error('Stripe checkout session error:', error);
      return res.status(500).json({
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  },

  createProduct: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description, price, metadata, prices } = req.body;

      if (!name || !price) {
        res.status(400).json({ error: "Name and price are required" });
        return;
      }

      // Create the product in Stripe
      const product = await stripe.products.create({
        name,
        description,
        metadata,
        active: true
      });

      // Create all the price points
      const priceIds: Record<string, string> = {};
      
      for (const [key, priceData] of Object.entries(prices as Record<string, PriceData>)) {
        const price = await stripe.prices.create({
          product: product.id,
          currency: priceData.currency,
          unit_amount: priceData.unit_amount,
          recurring: priceData.recurring,
          active: true,
          metadata: {
            type: priceData.type,
            plan: key,
            status: 'active',
            createdAt: new Date().toISOString()
          }
        });
        priceIds[key] = price.id;
      }

      // Set the default price to the full payment option if it exists
      if (priceIds.fullPayment) {
        await stripe.products.update(product.id, {
          default_price: priceIds.fullPayment
        });
      }

      res.json({
        productId: product.id,
        priceIds
      });
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({
        error: "Error creating product",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  },

  updateProductPrices: async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const { prices, existingPriceIds } = req.body;

      // Deactivate existing prices if provided
      if (existingPriceIds) {
        for (const priceId of Object.values(existingPriceIds)) {
          if (typeof priceId === 'string') {
            try {
              await stripe.prices.update(priceId, { 
                active: false,
                metadata: {
                  status: 'archived',
                  archivedAt: new Date().toISOString()
                }
              });
              console.log('Successfully archived price:', priceId);
            } catch (error) {
              console.error('Error archiving price:', priceId, error);
            }
          }
        }
      }

      // Create new prices
      const priceIds: Record<string, string> = {};

      // Create one-time payment price
      if (prices.fullPayment) {
        const fullPaymentPrice = await stripe.prices.create({
          product: productId,
          currency: prices.fullPayment.currency,
          unit_amount: prices.fullPayment.unit_amount,
          active: true,
          metadata: {
            type: 'one_time',
            plan: 'fullPayment',
            status: 'active',
            createdAt: new Date().toISOString()
          }
        });
        priceIds.fullPayment = fullPaymentPrice.id;
      }

      // Create recurring payment prices
      const recurringPrices = ['sixMonths', 'twelveMonths', 'eighteenMonths'];
      for (const key of recurringPrices) {
        if (prices[key]) {
          const recurringPrice = await stripe.prices.create({
            product: productId,
            currency: prices[key].currency,
            unit_amount: prices[key].unit_amount,
            recurring: prices[key].recurring,
            active: true,
            metadata: {
              type: 'recurring',
              plan: key,
              status: 'active',
              createdAt: new Date().toISOString()
            }
          });
          priceIds[key] = recurringPrice.id;
        }
      }

      // Set the default price to the full payment option if it exists
      if (priceIds.fullPayment) {
        await stripe.products.update(productId, {
          default_price: priceIds.fullPayment,
          metadata: {
            lastUpdated: new Date().toISOString(),
            currentPriceVersion: new Date().toISOString()
          }
        });
      }

      res.json({ priceIds });
    } catch (error) {
      console.error('Error updating Stripe prices:', error);
      res.status(500).json({
        error: 'Failed to update Stripe prices',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  },

  deactivatePrices: async (req: Request, res: Response) => {
    try {
      const { priceIds } = req.body;

      if (!Array.isArray(priceIds)) {
        return res.status(400).json({ error: 'Price IDs must be an array' });
      }

      for (const priceId of priceIds) {
        if (typeof priceId === 'string') {
          await stripe.prices.update(priceId, { active: false });
        }
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Error deactivating prices:', error);
      return res.status(500).json({
        error: 'Failed to deactivate prices',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  },

  activatePrices: async (req: Request, res: Response) => {
    try {
      const { priceIds } = req.body;

      if (!Array.isArray(priceIds)) {
        return res.status(400).json({ error: 'Price IDs must be an array' });
      }

      for (const priceId of priceIds) {
        if (typeof priceId === 'string') {
          await stripe.prices.update(priceId, { active: true });
        }
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Error activating prices:', error);
      return res.status(500).json({
        error: 'Failed to activate prices',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}; 