export interface Product {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  image: string;
  features?: string[];
  longDescription?: string;
  benefits?: string[];
  ctaText: string;
  ctaLink: string;
} 