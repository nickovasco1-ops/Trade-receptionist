import { builders } from './builders';
import { carpentersAndJoiners } from './carpenters-and-joiners';
import { electricians } from './electricians';
import { heatingEngineers } from './heating-engineers';
import { landscapers } from './landscapers';
import { locksmiths } from './locksmiths';
import { plumbers } from './plumbers';
import { roofers } from './roofers';
import type { TradeContent, TradeSlug } from './types';

export const TRADE_CONTENT: Readonly<Record<TradeSlug, TradeContent>> = {
  plumbers,
  electricians,
  builders,
  'heating-engineers': heatingEngineers,
  roofers,
  locksmiths,
  landscapers,
  'carpenters-and-joiners': carpentersAndJoiners,
};

export function tradeContent(slug: string | undefined): TradeContent {
  const content = slug ? TRADE_CONTENT[slug as TradeSlug] : undefined;
  if (!content) throw new Error(`No trade content for slug "${slug}"`);
  return content;
}
