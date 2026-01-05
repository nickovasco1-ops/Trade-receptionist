import { LucideIcon } from 'lucide-react';

export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  buttonText?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface SampleCallStep {
  role: 'ai' | 'customer';
  text: string;
  time: string;
}

export interface Testimonial {
  name: string;
  company: string;
  role: string;
  quote: string;
  tag: string;
  avatarUrl: string;
}