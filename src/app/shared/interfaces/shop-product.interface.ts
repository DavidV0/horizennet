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
  };
  courseIds: string[];      // IDs of courses included in this product
} 