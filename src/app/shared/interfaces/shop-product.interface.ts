export interface ShopProduct {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  tag?: string;
  stripeProductId: string;
  stripePriceIds: {
    fullPayment: string;    // Price ID for full payment
    sixMonths: string;      // Price ID for 6-month plan
    twelveMonths: string;   // Price ID for 12-month plan
    eighteenMonths: string; // Price ID for 18-month plan
    thirtyMonths: string;   // Price ID for 30-month plan
  };
  courseIds: string[];      // IDs of courses included in this product
  description?: string;     // Product description
  features?: string[];      // List of product features
  type?: 'academy' | 'crypto';
} 