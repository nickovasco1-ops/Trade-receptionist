export type CallFlowAssetKind = 'icon' | 'panel';
export type CallFlowAssetAspect = 'square' | 'landscape';

export interface CallFlowAsset {
  src: string;
  alt: string;
  kind: CallFlowAssetKind;
  aspect: CallFlowAssetAspect;
  width: number;
  height: number;
}

export interface TimelineStepItem {
  title: string;
  description: string;
  asset: CallFlowAsset;
}

export interface FeatureCardItem {
  title: string;
  description: string;
  asset: CallFlowAsset;
}

export interface ProofStripItem {
  step: string;
  label: string;
  sub: string;
  asset: CallFlowAsset;
}

export interface ProofPanelMedia {
  videoSrc: string;
  posterSrc: string;
  alt: string;
  width: number;
  height: number;
}

const ASSET_REGISTRY = {
  ringingSmartphone: {
    src: '/assets/marketing/call-flow/icons/ringing-smartphone.png',
    alt: 'Soft-shaded 3D icon of a ringing smartphone representing a customer call while the trade is busy on-site.',
    kind: 'icon',
    aspect: 'square',
    width: 1024,
    height: 1024,
  },
  aiReceptionistHeadset: {
    src: '/assets/marketing/call-flow/icons/ai-receptionist-headset.png',
    alt: 'Soft-shaded 3D icon of a receptionist headset showing Trade Receptionist answering in the business name.',
    kind: 'icon',
    aspect: 'square',
    width: 1024,
    height: 1024,
  },
  jobSheetClipboard: {
    src: '/assets/marketing/call-flow/icons/job-sheet-clipboard.png',
    alt: 'Soft-shaded 3D icon of a clipboard job sheet showing captured customer details for a trade enquiry.',
    kind: 'icon',
    aspect: 'square',
    width: 1024,
    height: 1024,
  },
  whatsappSummaryBubble: {
    src: '/assets/marketing/call-flow/icons/whatsapp-summary-bubble.png',
    alt: 'Soft-shaded 3D icon of a green message bubble and summary card showing a WhatsApp-style job handoff.',
    kind: 'icon',
    aspect: 'square',
    width: 1024,
    height: 1024,
  },
  bookedDiaryCalendar: {
    src: '/assets/marketing/call-flow/icons/booked-diary-calendar.png',
    alt: 'Soft-shaded 3D icon of a diary calendar with a confirmed check mark showing a booked trade job.',
    kind: 'icon',
    aspect: 'square',
    width: 1024,
    height: 1024,
  },
  phoneClock247: {
    src: '/assets/marketing/call-flow/icons/phone-clock-247.png',
    alt: 'Soft-shaded 3D icon of a phone and clock showing around-the-clock call answering for a trade business.',
    kind: 'icon',
    aspect: 'square',
    width: 1024,
    height: 1024,
  },
  spamShieldFilter: {
    src: '/assets/marketing/call-flow/icons/spam-shield-filter.png',
    alt: 'Soft-shaded 3D icon of a shield filtering out nuisance callers and spam calls.',
    kind: 'icon',
    aspect: 'square',
    width: 1024,
    height: 1024,
  },
  urgentCallSiren: {
    src: '/assets/marketing/call-flow/icons/urgent-call-siren.png',
    alt: 'Soft-shaded 3D icon of an urgent call siren showing emergency trade enquiries being prioritised.',
    kind: 'icon',
    aspect: 'square',
    width: 1024,
    height: 1024,
  },
  callRecordsNotes: {
    src: '/assets/marketing/call-flow/icons/call-records-notes.png',
    alt: 'Soft-shaded 3D icon of call notes and transcript records for checking what was said after a call.',
    kind: 'icon',
    aspect: 'square',
    width: 1024,
    height: 1024,
  },
  customerCallWorkflow: {
    src: '/assets/marketing/call-flow/panels/customer-call-workflow.png',
    alt: 'Wide workflow illustration showing a customer call turning into captured details, a WhatsApp-style summary, and a booked diary slot for a UK trade business.',
    kind: 'panel',
    aspect: 'landscape',
    width: 1536,
    height: 1024,
  },
} as const satisfies Record<string, CallFlowAsset>;

export const CALL_FLOW_TIMELINE_STEPS: TimelineStepItem[] = [
  {
    title: 'They call while you’re busy',
    description: 'You’re on the tools, driving, quoting, or with another customer.',
    asset: ASSET_REGISTRY.ringingSmartphone,
  },
  {
    title: 'Trade Receptionist answers',
    description: 'A customisable voice answers professionally in your business name and tone.',
    asset: ASSET_REGISTRY.aiReceptionistHeadset,
  },
  {
    title: 'It captures the job',
    description: 'Name, number, postcode, job type, urgency, and preferred time.',
    asset: ASSET_REGISTRY.jobSheetClipboard,
  },
  {
    title: 'You get the summary',
    description: 'The full enquiry lands in WhatsApp so you can scan it in seconds.',
    asset: ASSET_REGISTRY.whatsappSummaryBubble,
  },
  {
    title: 'Real jobs get booked',
    description: 'Qualified enquiries go into your diary. Spam and time-wasters stay out of your day.',
    asset: ASSET_REGISTRY.bookedDiaryCalendar,
  },
];

export const CALL_FLOW_FEATURE_CARDS: FeatureCardItem[] = [
  {
    title: 'Answers calls 24/7',
    description: 'Customers hear a professional answer even when you’re driving or on-site.',
    asset: ASSET_REGISTRY.phoneClock247,
  },
  {
    title: 'Sends WhatsApp job summaries',
    description: 'Every real enquiry lands back in WhatsApp with the details you need.',
    asset: ASSET_REGISTRY.whatsappSummaryBubble,
  },
  {
    title: 'Filters spam and sales calls',
    description: 'Cold callers and time-wasters stay away from your working day.',
    asset: ASSET_REGISTRY.spamShieldFilter,
  },
  {
    title: 'Books into your diary',
    description: 'The right enquiries can be pushed straight into your calendar.',
    asset: ASSET_REGISTRY.bookedDiaryCalendar,
  },
  {
    title: 'Handles urgent enquiries',
    description: 'Emergency jobs can be prioritised so the right calls reach you fast.',
    asset: ASSET_REGISTRY.urgentCallSiren,
  },
  {
    title: 'Keeps call records and transcripts',
    description: 'You can check what was said without listening back to voicemails.',
    asset: ASSET_REGISTRY.callRecordsNotes,
  },
];

export const CALL_FLOW_PROOF_STRIP: ProofStripItem[] = [
  {
    step: '01',
    label: 'Call comes in',
    sub: "You're busy or on the tools",
    asset: ASSET_REGISTRY.ringingSmartphone,
  },
  {
    step: '02',
    label: 'AI answers',
    sub: 'Custom voice, your business name',
    asset: ASSET_REGISTRY.aiReceptionistHeadset,
  },
  {
    step: '03',
    label: 'Job captured',
    sub: 'Name, number, job type, urgency',
    asset: ASSET_REGISTRY.jobSheetClipboard,
  },
  {
    step: '04',
    label: 'Summary sent',
    sub: 'Full details straight to your WhatsApp',
    asset: ASSET_REGISTRY.whatsappSummaryBubble,
  },
];

export const CALL_FLOW_PROOF_PANEL = {
  eyebrow: 'Call flow proof panel',
  title: 'One clean handover from incoming call to diary-ready job.',
  description:
    'A customer rings while you’re busy. The receptionist answers, qualifies the work, and sends back a fast summary you can actually act on between jobs.',
  badge: '8 second workflow preview',
  supportingPoints: [
    'Customer call captured with urgency and contact details',
    'WhatsApp-style summary ready for a ten-second scan',
    'Booked-job outcome that feels credible for a UK trade business',
  ],
  media: {
    videoSrc: '/assets/marketing/call-flow/panels/customer-call-workflow.web.mp4',
    posterSrc: ASSET_REGISTRY.customerCallWorkflow.src,
    alt: 'Short workflow video showing a customer call turning into captured details, a WhatsApp-style summary, and a booked diary-ready job handoff.',
    width: 1600,
    height: 900,
  } satisfies ProofPanelMedia,
} as const;
