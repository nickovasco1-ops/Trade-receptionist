// Structured data for the homepage. The homepage body is client-rendered
// (App.tsx), so only its head is prerendered; this module supplies the JSON-LD.

import { HOME_FAQS } from '../content/home-faqs';
import type { MarketingRoute } from '../routes';
import {
  faqPageNode, organizationNode, softwareApplicationNode, websiteNode,
  type JsonLdNode,
} from '../structured-data';

export function structuredData(route: MarketingRoute): JsonLdNode[] {
  return [organizationNode(), websiteNode(), softwareApplicationNode(), faqPageNode(route.path, HOME_FAQS)];
}
