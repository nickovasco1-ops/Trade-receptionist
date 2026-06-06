/**
 * CrispChat — Loads the Crisp live chat widget.
 *
 * FREE SETUP (takes ~2 minutes):
 *   1. Go to https://crisp.chat and create a free account
 *   2. Add a website — enter "Trade Receptionist" and tradereceptionist.com
 *   3. Copy the Website ID (looks like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
 *   4. Paste it in VITE_CRISP_WEBSITE_ID in your .env file:
 *        VITE_CRISP_WEBSITE_ID=your-id-here
 *   5. In Crisp → Settings → Chatbox → Colors, set the main color to #FF6B2B
 *   6. In Crisp → Settings → Chatbox → Welcome message:
 *        "Hi 👋 Need help with Trade Receptionist? Ask us anything —
 *         we're real people and we reply fast."
 *
 * Then set up canned responses in Crisp for common questions:
 *   - "How do I divert my calls?" → send divert instructions
 *   - "I'm not receiving call summaries" → send troubleshooting steps
 *   - "How do I connect my calendar?" → send calendar setup steps
 *   - "Pricing / can I cancel?" → send pricing FAQ
 *
 * The widget only loads in production or when VITE_CRISP_WEBSITE_ID is set.
 */

import { useEffect } from 'react';

// Crisp types
declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

export default function CrispChat() {
  const websiteId = import.meta.env.VITE_CRISP_WEBSITE_ID as string | undefined;

  useEffect(() => {
    if (!websiteId) return;

    // Avoid double-loading if the component remounts
    if (window.CRISP_WEBSITE_ID) return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = websiteId;

    // Configure Crisp before load
    window.$crisp.push(['safe', true]);

    // Load the Crisp script asynchronously
    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Don't remove the script on unmount — Crisp persists across navigation
    };
  }, [websiteId]);

  // No rendered DOM — the widget is injected by Crisp's own script
  return null;
}
