# Call-Flow Layout Reference

This folder is reserved for screenshot-to-code reference output for the “What happens when a customer calls?” and “Practical tools, not bloated features.” band.

Expected inputs and outputs:

- Required screenshot input: `assets/reference/call-flow-section.png`
- Reference React output: `call-flow-section.reference.react.tsx`
- Reference HTML output: `call-flow-section.reference.html`
- Slot sizing notes: `asset-slots.md`

Current status:

- The required screenshot is now present at `assets/reference/call-flow-section.png`.
- The production component has already been refreshed and can now be checked against the real section image instead of only the live JSX structure.
- External `screenshot-to-code` output is still pending because that tool is intentionally documented, not vendored into this repo.

Observed layout cues from the screenshot:

- Top section intro uses a wide left headline block and a narrower right support paragraph.
- The five timeline cards are visually compact and sit on a single horizontal row on desktop.
- The CTA strip is low-height and stretches full width under the timeline cards.
- The proof area is a compact horizontal band rather than a tall showcase block.
- The feature section repeats the same left-headline and right-support-copy split before a `3 x 2` card grid.

Run `npm run reference:call-flow-layout` to print the external `abi/screenshot-to-code` workflow and the expected output paths for this folder.
