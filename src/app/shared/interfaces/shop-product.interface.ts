export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  priceWithVat?: number; // Optional property for price including VAT
  oldPrice?: number;
  image: string;
  courseIds: string[];
  tag?: string;
  stripeProductId: string;
  stripePriceIds: {
    fullPayment: string;    // Price ID for full payment
    sixMonths: string;      // Price ID for 6-month plan
    twelveMonths: string;   // Price ID for 12-month plan
    eighteenMonths: string; // Price ID for 18-month plan
    thirtyMonths: string;   // Price ID for 30-month plan
  };
  metadata?: {
    tax_behavior?: string;
    tax_code?: string;
    product_type?: string;
    eu_vat?: string;
    created_at?: string;
  };
} 