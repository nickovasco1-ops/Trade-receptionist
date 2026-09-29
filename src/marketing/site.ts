// Site-wide constants for the public marketing pages.
//
// Every URL a crawler sees is built from SITE_URL. The apex domain is the one
// Vercel serves; www 308-redirects to it (CLAUDE.md §10), so canonicals must
// never use www.

export const SITE_URL = 'https://tradereceptionist.com';
export const SITE_NAME = 'Trade Receptionist';
export const LEGAL_NAME = 'Trade Receptionist Ltd';

// TODO(human): the site shows hello@tradereceptionist.co.uk, while the backend
// (Resend default, ImprovMX inbound) uses hello@tradereceptionist.com. Confirm
// which inbox is monitored and use one address everywhere.
export const CONTACT_EMAIL = 'hello@tradereceptionist.co.uk';

// A 1200x630 crop, matching the declared og:image dimensions.
// TODO(human): the artwork contains AI-garbled text ("Plumbing qutle"); replace
// with a designed share image before promoting any page on social.
export const DEFAULT_OG_IMAGE = {
  url: `${SITE_URL}/assets/generated/og/og-image-cropped.png`,
  width: 1200,
  height: 630,
  alt: 'Trade Receptionist answering a customer call on a phone, with the job summary alongside',
};

export const LOGO_URL = `${SITE_URL}/assets/logo.png`;

export const SOCIAL_PROFILES = [
  'https://www.instagram.com/tradereceptionist',
  'https://www.facebook.com/share/16QddwsMk8/',
  'https://tiktok.com/@tradereceptionist',
];

/** Absolute URL for a site path. The homepage canonical keeps its trailing slash. */
export function absoluteUrl(path: string): string {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}
