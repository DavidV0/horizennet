import { Request, Response } from 'express';
import { StripeProduct } from '../types/stripe.types';
import { stripe } from '../config/stripe';
import Stripe from 'stripe';



export const productController = {
  updateProductPrices: async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      const { price, name, description, existingPriceIds } = req.body;
      console.log('Updating product:', productId, 'with data:', { price, name, description });

      if (!productId || typeof price !== 'number') {
        console.error('Invalid input:', { productId, price });
        res.status(400).json({ error: 'Product ID and price are required' });
        return;
      }

      // Check if product exists
      let product: StripeProduct;
      try {
        product = await stripe.products.retrieve(productId);
        console.log('Found product:', product.id);

        // Update product data if provided
        if (name || description) {
          const updateData: { name?: string; description?: string } = {};
          if (name) updateData.name = name;
          if (description) updateData.description = description;
          
          await stripe.products.update(productId, updateData);
          console.log('Updated product details:', { name, description });
        }
      } catch (error) {
        console.error('Product not found:', productId);
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // Archive old prices
      if (existingPriceIds) {
        console.log('Archiving existing prices:', existingPriceIds);
        const deactivatePromises = Object.values(existingPriceIds as Record<string, string>)
          .filter(priceId => priceId && priceId !== product.default_price)
          .map(async (priceId) => {
            try {
              const price = await stripe.prices.retrieve(priceId);
              if (price.active) {
                await stripe.prices.update(priceId, { 
                  active: false,
                  metadata: { 
                    status: 'archived',
                    archivedAt: new Date().toISOString(),
                    replacedBy: 'pending'
                  }
                });
                console.log('Successfully archived price:', priceId);
              }
            } catch (error) {
              console.error('Error archiving price:', priceId, error);
            }
          });
        await Promise.all(deactivatePromises);
      }

      // Create new prices
      console.log('Creating new prices...');
      
      try {
        // Create prices one by one to better track any issues
        console.log('Creating prices with data:', JSON.stringify({
          price,
          name,
          description,
          existingPriceIds
        }, null, 2));

        // Create full payment price
        console.log('Creating full payment price...');
        const fullPayment = await stripe.prices.create({
          product: productId,
          currency: 'eur',
          unit_amount: Math.round(price * 100),
          nickname: 'Einmalzahlung',
          lookup_key: `${productId}_full_payment`,
          active: true,
          tax_behavior: 'exclusive' as Stripe.Price.TaxBehavior,
          metadata: {
            type: 'one_time',
            plan: 'fullPayment',
            displayName: 'Einmalzahlung',
            status: 'active',
            createdAt: new Date().toISOString()
          }
        });
        console.log('Created full payment price:', fullPayment.id);

        // Create installment prices
        const installmentPlans = [
          { months: 6, key: 'sixMonths', name: '6 Monatsraten' },
          { months: 12, key: 'twelveMonths', name: '12 Monatsraten' },
          { months: 18, key: 'eighteenMonths', name: '18 Monatsraten' },
          { months: 30, key: 'thirtyMonths', name: '30 Monatsraten' }
        ];

        const priceIds: Record<string, string> = {
          fullPayment: fullPayment.id
        };

        // Create each installment price
        for (const plan of installmentPlans) {
          console.log(`Creating ${plan.key} price...`);
          try {
            const installmentPrice = await stripe.prices.create({
              product: productId,
              currency: 'eur',
              unit_amount: Math.round((price * 100) / plan.months),
              nickname: plan.name,
              lookup_key: `${productId}_${plan.months}_months`,
              active: true,
              tax_behavior: 'exclusive' as Stripe.Price.TaxBehavior,
              recurring: {
                interval: 'month' as Stripe.Price.Recurring.Interval,
                interval_count: 1
              },
              metadata: {
                type: 'recurring',
                plan: plan.key,
                installments: plan.months.toString(),
                displayName: plan.name,
                status: 'active',
                createdAt: new Date().toISOString(),
                totalAmount: (price * 100).toString()
              }
            });
            console.log(`Created ${plan.key} price:`, installmentPrice.id);
            priceIds[plan.key] = installmentPrice.id;
          } catch (error) {
            console.error(`Error creating ${plan.key} price:`, error);
            throw new Error(`Failed to create ${plan.key} price: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        // Verify all prices were created
        const requiredPrices = ['fullPayment', 'sixMonths', 'twelveMonths', 'eighteenMonths', 'thirtyMonths'];
        const missingPrices = requiredPrices.filter(key => !priceIds[key]);
        
        if (missingPrices.length > 0) {
          console.error('Missing required price IDs:', {
            required: requiredPrices,
            created: priceIds,
            missing: missingPrices
          });
          throw new Error(`Failed to create all required price IDs: ${missingPrices.join(', ')}`);
        }

        // Set one-time payment price as default and update product metadata
        await stripe.products.update(productId, {
          default_price: fullPayment.id,
          metadata: {
            lastUpdated: new Date().toISOString(),
            fullPaymentPriceId: priceIds.fullPayment,
            sixMonthsPriceId: priceIds.sixMonths,
            twelveMonthsPriceId: priceIds.twelveMonths,
            eighteenMonthsPriceId: priceIds.eighteenMonths,
            thirtyMonthsPriceId: priceIds.thirtyMonths,
            currentPriceVersion: new Date().toISOString()
          }
        });

        const response = {
          productId: product.id,
          priceIds
        };

        console.log('Successfully updated product prices:', response);
        res.json(response);
      } catch (error) {
        console.error('Error creating prices:', error);
        res.status(500).json({
          error: 'Failed to create prices',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error('Error updating product prices:', error);
      res.status(500).json({ 
        error: 'Failed to update product prices',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  },

  deactivatePrices: async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      const { priceIds } = req.body;

      if (!productId || !priceIds || !Array.isArray(priceIds)) {
        res.status(400).json({ error: 'Product ID and price IDs array are required' });
        return;
      }

      const deactivatePromises = priceIds.map(async (priceId) => {
        try {
          await stripe.prices.update(priceId, {
            active: false,
            metadata: { status: 'archived' }
          });
          console.log('Successfully deactivated price:', priceId);
        } catch (error) {
          console.error('Error deactivating price:', priceId, error);
        }
      });

      await Promise.all(deactivatePromises);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deactivating prices:', error);
      res.status(500).json({ error: 'Failed to deactivate prices' });
    }
  },

  activatePrices: async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      const { priceIds } = req.body;

      if (!productId || !priceIds || !Array.isArray(priceIds)) {
        res.status(400).json({ error: 'Product ID and price IDs array are required' });
        return;
      }

      const activatePromises = priceIds.map(async (priceId) => {
        try {
          await stripe.prices.update(priceId, {
            active: true,
            metadata: { status: 'active' }
          });
          console.log('Successfully activated price:', priceId);
        } catch (error) {
          console.error('Error activating price:', priceId, error);
        }
      });

      await Promise.all(activatePromises);
      res.json({ success: true });
    } catch (error) {
      console.error('Error activating prices:', error);
      res.status(500).json({ error: 'Failed to activate prices' });
    }
  },

  createProduct: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description, price, metadata } = req.body;

      console.log('Received product creation request:', {
        name,
        description,
        price,
        metadata
      });

      if (!name || !price) {
        console.error('Missing required fields:', { name, price });
        res.status(400).json({ error: "Name and price are required" });
        return;
      }

      // First create the product with tax configuration
      console.log('Creating product with tax configuration...');
      const productData = {
        name,
        description,
        tax_code: 'txcd_10201000',
        metadata: {
          ...(metadata || {}),
          tax_behavior: 'exclusive',
          tax_code: 'txcd_10201000',
          product_type: 'digital_goods',
          eu_vat: 'true',
          created_at: new Date().toISOString()
        },
        active: true
      };

      console.log('Product creation data:', JSON.stringify(productData, null, 2));
      const product = await stripe.products.create(productData);

      console.log('Product created successfully:', {
        id: product.id,
        name: product.name,
        tax_code: product.tax_code,
        metadata: product.metadata
      });

      // Create the full payment price
      console.log('Creating full payment price...');
      const fullPaymentPrice = await stripe.prices.create({
        product: product.id,
        currency: 'eur',
        unit_amount: Math.round(price * 100),
        tax_behavior: 'exclusive' as Stripe.Price.TaxBehavior,
        active: true,
        metadata: {
          type: 'one_time',
          plan: 'fullPayment',
          status: 'active',
          tax_type: 'vat',
          product_type: 'digital_goods',
          eu_vat: 'true',
          created_at: new Date().toISOString()
        }
      });

      console.log('Full payment price created:', {
        id: fullPaymentPrice.id,
        tax_behavior: fullPaymentPrice.tax_behavior,
        metadata: fullPaymentPrice.metadata
      });

      // Create installment prices
      const installmentPlans = [
        { months: 6, key: 'sixMonths' },
        { months: 12, key: 'twelveMonths' },
        { months: 18, key: 'eighteenMonths' },
        { months: 30, key: 'thirtyMonths' }
      ];

      const priceIds: Record<string, string> = {
        fullPayment: fullPaymentPrice.id
      };

      for (const plan of installmentPlans) {
        console.log(`Creating ${plan.months}-month installment price...`);
        const installmentPrice = await stripe.prices.create({
          product: product.id,
          currency: 'eur',
          unit_amount: Math.round((price * 100) / plan.months),
          tax_behavior: 'exclusive' as Stripe.Price.TaxBehavior,
          recurring: {
            interval: 'month' as Stripe.Price.Recurring.Interval,
            interval_count: 1
          },
          active: true,
          metadata: {
            type: 'recurring',
            plan: plan.key,
            installments: plan.months.toString(),
            status: 'active',
            tax_type: 'vat',
            product_type: 'digital_goods',
            eu_vat: 'true',
            created_at: new Date().toISOString(),
            totalAmount: (price * 100).toString()
          }
        });
        priceIds[plan.key] = installmentPrice.id;

        console.log(`${plan.months}-month price created:`, {
          id: installmentPrice.id,
          tax_behavior: installmentPrice.tax_behavior,
          metadata: installmentPrice.metadata
        });
      }

      // Update product with default price and metadata
      console.log('Updating product with final configuration...');
      await stripe.products.update(product.id, {
        default_price: fullPaymentPrice.id,
        metadata: {
          lastUpdated: new Date().toISOString(),
          currentPriceVersion: new Date().toISOString(),
          ...productData.metadata
        }
      });

      // Verify final configuration
      const finalProduct = await stripe.products.retrieve(product.id);
      console.log('Final product configuration:', {
        id: finalProduct.id,
        tax_code: finalProduct.tax_code,
        metadata: finalProduct.metadata,
        default_price: finalProduct.default_price
      });

      const response = {
        productId: product.id,
        priceIds,
        tax_configuration: {
          tax_behavior: 'exclusive',
          tax_code: finalProduct.tax_code,
          metadata: finalProduct.metadata
        }
      };

      console.log('Sending response:', JSON.stringify(response, null, 2));
      res.json(response);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof Error) {
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({
        error: "Error creating product",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}; 