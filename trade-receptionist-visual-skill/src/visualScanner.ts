import type { AuditFinding, RepoInspection, VisualSkillContext } from './types.js';
import { scoreFinding } from './auditScorer.js';

export async function scanVisuals(
  _context: VisualSkillContext,
  inspection: RepoInspection,
): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  findings.push(scoreFinding({
    assetId: 'hero-call-answering-stage',
    section: 'hero',
    areaName: 'Homepage hero visual',
    pagePath: '/',
    componentPath: 'App.tsx',
    currentVisualSource: 'Hero scene image in App.tsx using /assets/generated/landing-hero-generated.png with fallback /assets/hero-phone-upscaled-transparent.png',
    oldAssetPath: '/assets/generated/landing-hero-generated.png',
    whyItWeakensConversion:
      'The hero currently leans on a single floating product-device composite. It signals polish, but it underplays the real-world trade context and customer-to-job handoff that first-time visitors need to trust within seconds.',
    problemCategory: 'Low trust dashboard',
    recommendedReplacementDirection:
      'Replace the hero art with a clearer 16:9 trade-call composition that keeps strong negative space on the left, shows one crisp phone UI, and adds believable customer-summary / routing cues for a real trade business.',
    suggestedAltText:
      'Trade Receptionist phone interface showing answered customer calls, captured job details, and routed summaries for a trade business.',
    replacementType: 'image',
    promptTemplate: 'hero',
    integrationTarget: {
      filePath: 'App.tsx',
      strategy: 'replace-string-literal',
      searchValue: '/assets/generated/landing-hero-generated.png',
    },
  }));

  findings.push(scoreFinding({
    assetId: 'workflow-proof-panel',
    section: 'workflow',
    areaName: 'What happens when a customer calls?',
    pagePath: '/',
    componentPath: 'components/FeaturesGrid.tsx',
    currentVisualSource: 'Icon-only timeline cards and compact feature cards in components/FeaturesGrid.tsx',
    whyItWeakensConversion:
      'The workflow section explains the product well in copy, but the visual proof is mostly icons and dark cards. It lacks one credible trade-call sequence that shows how a missed call becomes a qualified job, WhatsApp summary, and diary-ready handoff.',
    problemCategory: 'Placeholder-looking visual',
    recommendedReplacementDirection:
      'Introduce a premium supporting 16:9 workflow visual or reusable panel that shows caller, captured details, message summary, and booked outcome in one scannable sequence.',
    suggestedAltText:
      'Workflow showing a customer call becoming a qualified job summary and booked diary slot for a trade business.',
    replacementType: 'image',
    promptTemplate: 'workflow',
    integrationTarget: {
      filePath: 'components/FeaturesGrid.tsx',
      strategy: 'manual-component-redesign',
    },
  }));

  findings.push(scoreFinding({
    assetId: 'sample-call-summary-proof',
    section: 'call-answering',
    areaName: 'Hear how it answers a customer',
    pagePath: '/',
    componentPath: 'App.tsx',
    currentVisualSource: 'Audio player card and glow treatment in DemoSection within App.tsx',
    whyItWeakensConversion:
      'The sample call proves the voice, but the section has no companion visual that shows what the trade business actually gets back. Without that summary proof, the block can feel like an isolated media widget rather than a product proof point.',
    problemCategory: 'Low trust dashboard',
    recommendedReplacementDirection:
      'Add a supporting 16:9 proof visual showing the captured enquiry, urgency, and WhatsApp-style handoff back to the business while keeping the audio player intact.',
    suggestedAltText:
      'Call summary panel showing captured job details and routed follow-up message for Trade Receptionist.',
    replacementType: 'image',
    promptTemplate: 'call-answering',
    integrationTarget: {
      filePath: 'App.tsx',
      strategy: 'manual-component-redesign',
    },
  }));

  findings.push(scoreFinding({
    assetId: 'pricing-trust-support',
    section: 'trust-security',
    areaName: 'Pricing reassurance visuals',
    pagePath: '/',
    componentPath: 'App.tsx',
    currentVisualSource: 'Plan cards and glow-only background in Pricing section within App.tsx',
    whyItWeakensConversion:
      'The pricing section is clear, but it relies almost entirely on generic SaaS plan-card patterns. There is no visual reassurance about call handling, summaries, or practical trade-business outcomes beside the pricing decision.',
    problemCategory: 'Overused gradient/glassmorphism',
    recommendedReplacementDirection:
      'Support pricing with one compact trust visual or micro-panel showing answered calls, clean summaries, and simple setup cues rather than more decorative glow.',
    suggestedAltText:
      'Compact product proof showing answered calls and simple setup reassurance beside Trade Receptionist pricing.',
    replacementType: 'component',
    promptTemplate: 'trust-security',
    integrationTarget: {
      filePath: 'App.tsx',
      strategy: 'manual-component-redesign',
    },
  }));

  findings.push(scoreFinding({
    assetId: 'final-cta-proof-cue',
    section: 'cta',
    areaName: 'Final CTA support visual',
    pagePath: '/',
    componentPath: 'App.tsx',
    currentVisualSource: 'Glow-only final CTA block in App.tsx with no supporting product cue',
    whyItWeakensConversion:
      'The last CTA is strong in copy but visually generic. Adding a grounded support cue can reinforce that missed calls become logged jobs, which matters at the final decision point.',
    problemCategory: 'Placeholder-looking visual',
    recommendedReplacementDirection:
      'Add one subtle but credible support visual showing the end-state: answered call, captured lead, and booked follow-up, without turning the CTA into a busy feature section.',
    suggestedAltText:
      'Support visual showing a captured trade enquiry and booked follow-up beside the final Trade Receptionist call to action.',
    replacementType: 'image',
    promptTemplate: 'cta',
    integrationTarget: {
      filePath: 'App.tsx',
      strategy: 'manual-component-redesign',
    },
  }));

  const sectionFilter = _context.options.section?.toLowerCase();
  const filtered = findings
    .filter(finding => finding.severity >= _context.options.severityMin)
    .filter(finding => (sectionFilter ? finding.section === sectionFilter || finding.areaName.toLowerCase().includes(sectionFilter) : true))
    .slice(0, _context.options.limit ?? findings.length);

  return filtered.map(finding => ({
    ...finding,
    currentVisualSource:
      `${finding.currentVisualSource} | Framework: ${inspection.framework} | Component: ${finding.componentPath}`,
  }));
}
