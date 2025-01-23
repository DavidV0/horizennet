export interface Product {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  longDescription: string;
  image: string;
  features: string[];
  benefits: string[];
  ctaText: string;
  order: number;  // Lower number = higher priority
  isActive: boolean;  // Whether to show the product
  metaTitle?: string;  // For SEO
  metaDescription?: string;  // For SEO
  slug?: string;  // URL-friendly version of title
} 