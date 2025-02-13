import { Request, Response } from 'express';
import { StripeProduct } from '../types/stripe.types';
import { stripeService } from '../services/stripe.service';

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
        product = await stripeService.products.retrieve(productId);
        console.log('Found product:', product.id);

        // Update product data if provided
        if (name || description) {
          const updateData: { name?: string; description?: string } = {};
          if (name) updateData.name = name;
          if (description) updateData.description = description;
          
          await stripeService.products.update(productId, updateData);
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
              const price = await stripeService.prices.retrieve(priceId);
              if (price.active) {
                await stripeService.prices.update(priceId, { 
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
      const pricePromises = [
        // One-time payment
        stripeService.prices.create({
          product: productId,
          currency: 'eur',
          unit_amount: Math.round(price * 100),
          nickname: 'Einmalzahlung',
          lookup_key: `${productId}_full_payment`,
          active: true,
          metadata: {
            type: 'one_time',
            plan: 'fullPayment',
            displayName: 'Einmalzahlung',
            status: 'active',
            createdAt: new Date().toISOString()
          }
        }),

        // 6-month installment
        stripeService.prices.create({
          product: productId,
          currency: 'eur',
          unit_amount: Math.round(price * 100 / 6),
          nickname: '6 Monatsraten',
          lookup_key: `${productId}_6_months`,
          active: true,
          recurring: {
            interval: 'month',
            interval_count: 1
          },
          metadata: {
            type: 'recurring',
            plan: 'sixMonths',
            installments: '6',
            displayName: '6 Monatsraten',
            status: 'active',
            createdAt: new Date().toISOString(),
            totalAmount: (price * 100).toString()
          }
        }),

        // 12-month installment
        stripeService.prices.create({
          product: productId,
          currency: 'eur',
          unit_amount: Math.round(price * 100 / 12),
          nickname: '12 Monatsraten',
          lookup_key: `${productId}_12_months`,
          active: true,
          recurring: {
            interval: 'month',
            interval_count: 1
          },
          metadata: {
            type: 'recurring',
            plan: 'twelveMonths',
            installments: '12',
            displayName: '12 Monatsraten',
            status: 'active',
            createdAt: new Date().toISOString(),
            totalAmount: (price * 100).toString()
          }
        }),

        // 18-month installment
        stripeService.prices.create({
          product: productId,
          currency: 'eur',
          unit_amount: Math.round(price * 100 / 18),
          nickname: '18 Monatsraten',
          lookup_key: `${productId}_18_months`,
          active: true,
          recurring: {
            interval: 'month',
            interval_count: 1
          },
          metadata: {
            type: 'recurring',
            plan: 'eighteenMonths',
            installments: '18',
            displayName: '18 Monatsraten',
            status: 'active',
            createdAt: new Date().toISOString(),
            totalAmount: (price * 100).toString()
          }
        }),

        // 30-month installment
        stripeService.prices.create({
          product: productId,
          currency: 'eur',
          unit_amount: Math.round(price * 100 / 30),
          nickname: '30 Monatsraten',
          lookup_key: `${productId}_30_months`,
          active: true,
          recurring: {
            interval: 'month',
            interval_count: 1
          },
          metadata: {
            type: 'recurring',
            plan: 'thirtyMonths',
            installments: '30',
            displayName: '30 Monatsraten',
            status: 'active',
            createdAt: new Date().toISOString(),
            totalAmount: (price * 100).toString()
          }
        })
      ];

      const [fullPayment, sixMonths, twelveMonths, eighteenMonths, thirtyMonths] = await Promise.all(pricePromises);
      console.log('Created new prices:', {
        fullPayment: { id: fullPayment.id, nickname: fullPayment.nickname },
        sixMonths: { id: sixMonths.id, nickname: sixMonths.nickname },
        twelveMonths: { id: twelveMonths.id, nickname: twelveMonths.nickname },
        eighteenMonths: { id: eighteenMonths.id, nickname: eighteenMonths.nickname },
        thirtyMonths: { id: thirtyMonths.id, nickname: thirtyMonths.nickname }
      });

      // Update old prices with references to new ones
      if (existingPriceIds) {
        const updateOldPricesPromises = Object.entries(existingPriceIds as Record<string, string>)
          .map(async ([type, priceId]) => {
            let newPriceId;
            switch (type) {
              case 'fullPayment': newPriceId = fullPayment.id; break;
              case 'sixMonths': newPriceId = sixMonths.id; break;
              case 'twelveMonths': newPriceId = twelveMonths.id; break;
              case 'eighteenMonths': newPriceId = eighteenMonths.id; break;
              case 'thirtyMonths': newPriceId = thirtyMonths.id; break;
            }
            if (newPriceId) {
              try {
                await stripeService.prices.update(priceId, {
                  metadata: {
                    replacedBy: newPriceId,
                    status: 'archived'
                  }
                });
                console.log(`Updated old price ${priceId} with reference to new price ${newPriceId}`);
              } catch (error) {
                console.error(`Error updating old price ${priceId}:`, error);
              }
            }
          });
        await Promise.all(updateOldPricesPromises);
      }

      // Set one-time payment price as default and update product metadata
      await stripeService.products.update(productId, {
        default_price: fullPayment.id,
        metadata: {
          lastUpdated: new Date().toISOString(),
          fullPaymentPriceId: fullPayment.id,
          sixMonthsPriceId: sixMonths.id,
          twelveMonthsPriceId: twelveMonths.id,
          eighteenMonthsPriceId: eighteenMonths.id,
          thirtyMonthsPriceId: thirtyMonths.id,
          currentPriceVersion: new Date().toISOString()
        }
      });
      console.log('Updated product with new default price and metadata');

      // Check price statuses
      const priceStatuses = await Promise.all([fullPayment, sixMonths, twelveMonths, eighteenMonths, thirtyMonths].map(async (price) => {
        const updatedPrice = await stripeService.prices.retrieve(price.id);
        return {
          id: price.id,
          nickname: price.nickname,
          active: updatedPrice.active,
          metadata: updatedPrice.metadata,
          lookup_key: updatedPrice.lookup_key
        };
      }));
      console.log('Final price status check:', priceStatuses);

      const response = {
        productId: product.id,
        priceIds: {
          fullPayment: fullPayment.id,
          sixMonths: sixMonths.id,
          twelveMonths: twelveMonths.id,
          eighteenMonths: eighteenMonths.id,
          thirtyMonths: thirtyMonths.id
        },
        priceDetails: {
          fullPayment: { 
            nickname: fullPayment.nickname, 
            metadata: fullPayment.metadata,
            lookup_key: fullPayment.lookup_key
          },
          sixMonths: { 
            nickname: sixMonths.nickname, 
            metadata: sixMonths.metadata,
            lookup_key: sixMonths.lookup_key
          },
          twelveMonths: { 
            nickname: twelveMonths.nickname, 
            metadata: twelveMonths.metadata,
            lookup_key: twelveMonths.lookup_key
          },
          eighteenMonths: { 
            nickname: eighteenMonths.nickname, 
            metadata: eighteenMonths.metadata,
            lookup_key: eighteenMonths.lookup_key
          },
          thirtyMonths: { 
            nickname: thirtyMonths.nickname, 
            metadata: thirtyMonths.metadata,
            lookup_key: thirtyMonths.lookup_key
          }
        }
      };

      console.log('Successfully updated product prices:', response);
      res.json(response);
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
          await stripeService.prices.update(priceId, {
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
          await stripeService.prices.update(priceId, {
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
  }
}; 