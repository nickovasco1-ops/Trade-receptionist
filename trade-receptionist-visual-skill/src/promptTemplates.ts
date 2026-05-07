import type { AuditFinding, BrandConfig, PromptTemplateType } from './types.js';

function basePrompt(
  finding: AuditFinding,
  brand: BrandConfig,
  composition: string,
  uiElements: string,
  businessContext: string,
): string {
  return [
    `Create a premium 16:9 SaaS website visual for ${brand.productName}.`,
    `Purpose: ${finding.areaName}.`,
    `Business context: ${businessContext}.`,
    `Target user: ${brand.targetUsers.join(', ')}.`,
    `Composition: ${composition}.`,
    `UI to include: ${uiElements}.`,
    `Colour direction: ${brand.visualStyle.base}; ${brand.visualStyle.primaryAccent}; ${brand.visualStyle.secondaryAccent}; ${brand.visualStyle.supportAccent}.`,
    `Keep any UI clean, readable, and credible at homepage scale.`,
    `No tiny unreadable text. No random decorative blobs. No fake brand logos. No distorted logos. ${brand.messagingCue}`,
    `Avoid: ${brand.avoid.slice(0, 8).join(', ')}.`,
    `Resolution target: 2K. Aspect ratio: 16:9.`,
  ].join(' ');
}

export function renderPromptTemplate(
  template: PromptTemplateType,
  finding: AuditFinding,
  brand: BrandConfig,
): string {
  switch (template) {
    case 'hero':
      return basePrompt(
        finding,
        brand,
        'Leave the left 40 percent dark and clear for headline and CTAs; place the main visual on the right with one premium phone interface, one customer call cue, and one message-summary cue.',
        'Answered-call screen, captured job details, summary card, subtle message-routing indicators, credible trade-business context.',
        'An AI receptionist for UK tradespeople that answers missed calls, qualifies the lead, and routes a clean summary back to the business.',
      );
    case 'workflow':
      return basePrompt(
        finding,
        brand,
        'Build a horizontal workflow scene that reads left to right: incoming customer call, captured details, qualified summary, and booked diary outcome.',
        'Call intake card, job details card, message summary card, diary or slot confirmation, subtle process connectors.',
        'A busy trade business needs to understand the handoff from customer call to qualified job without reading a wall of text.',
      );
    case 'dashboard':
      return basePrompt(
        finding,
        brand,
        'Use a calm product-led composition with one strong dashboard plane and supportive peripheral cards.',
        'Readable metrics, message queue, summaries, job statuses, and routing logic.',
        'Trade Receptionist is a premium operational layer for call handling and job capture.',
      );
    case 'messaging':
      return basePrompt(
        finding,
        brand,
        'Show an incoming call becoming a green messaging-style handoff with layered chat cards and subtle routing motion.',
        'Customer message thread, business summary card, urgency badge, reply-ready follow-up.',
        'The product helps tradespeople receive customer details in a messaging-first workflow without using official third-party logos.',
      );
    case 'job-capture':
      return basePrompt(
        finding,
        brand,
        'Frame the visual around one captured enquiry card with rich, readable detail and a premium product atmosphere.',
        'Caller name, postcode, job type, urgency, preferred time, next action.',
        'The product captures the real details a trade business needs before deciding how to book or quote.',
      );
    case 'call-answering':
      return basePrompt(
        finding,
        brand,
        'Balance an audio-proof or call-proof card with one supporting enquiry summary visual that demonstrates the outcome of the conversation.',
        'Incoming call cue, transcript snippet, captured fields, routed summary, urgency marker.',
        'The product answers callers naturally, qualifies the lead, and hands the details back in a way the business can act on immediately.',
      );
    case 'integration':
      return basePrompt(
        finding,
        brand,
        'Create a composed, minimal scene that links the product to calendar and business workflow systems without showing fake logos.',
        'Calendar booking cues, summary cards, routing arrows, confirmation states.',
        'The product fits into the trade business workflow and helps qualified calls become booked work.',
      );
    case 'trust-security':
      return basePrompt(
        finding,
        brand,
        'Keep the composition compact and reassuring, focused on stability and professionalism rather than spectacle.',
        'Answer-rate indicator, message summary, setup cue, privacy or reliability badge, one clean product panel.',
        'The section must reassure buyers that the service is reliable, simple to adopt, and grounded in practical outcomes.',
      );
    case 'cta':
      return basePrompt(
        finding,
        brand,
        'Create a quiet support visual that reinforces the CTA without overpowering it; favour one right-weighted proof panel and lots of clean space.',
        'Booked-job confirmation, answered-call indicator, clean enquiry summary, subtle success state.',
        'At the final CTA, the visitor needs a last visual nudge that the product really turns missed calls into booked work.',
      );
    default:
      return basePrompt(
        finding,
        brand,
        'Use a premium right-weighted SaaS composition with clear negative space.',
        'Clean, readable product UI and credible trade-business communication cues.',
        'Trade Receptionist helps UK trades businesses answer calls, capture work, and route clean summaries.',
      );
  }
}
