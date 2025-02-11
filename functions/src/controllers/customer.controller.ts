import { Request, Response } from 'express';
import { stripeService } from '../services/stripe.service';

export const customerController = {
  createCustomer: async (req: Request, res: Response) => {
    try {
      const { email, name, phone, address, metadata } = req.body;

      if (!email || !name) {
        res.status(400).json({ error: "Email and name are required" });
        return;
      }

      const customerData: any = {
        email,
        name,
      };

      if (phone) {
        customerData.phone = phone;
      }

      if (address) {
        customerData.address = address;
      }

      if (metadata) {
        customerData.metadata = metadata;
      }

      const customer = await stripeService.customers.create(customerData);
      res.json(customer);
    } catch (error: any) {
      console.error("Error creating customer:", error);
      res.status(error.statusCode || 500).json({ 
        error: "Error creating customer",
      });
    }
  },

  getCustomer: async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const customer = await stripeService.customers.retrieve(customerId);
      
      if ((customer as any).deleted) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Error fetching customer" });
    }
  }
}; 