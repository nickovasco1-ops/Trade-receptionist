# Trade Receptionist Visual Skill

A local TypeScript CLI for auditing weak landing-page visuals, generating premium replacement prompts, optionally generating new assets with OpenAI image generation, and safely applying low-risk asset swaps to the Trade Receptionist website.

## What it does

- Inspects the repo to detect framework, routes, pages, components, assets, image references, and design tokens
- Audits high-conversion website areas for weak or generic visuals
- Writes structured JSON and Markdown audit reports
- Generates concise premium image prompts based on the Trade Receptionist brand
- Optionally generates 2K-ish 16:9 replacement assets with OpenAI
- Maintains a manifest for planned, generated, applied, skipped, and failed assets
- Safely applies direct low-risk asset replacements with backups and patch output

## Required environment variables

- `OPENAI_API_KEY`
- Optional: `IMAGE_MODEL`
  Default: `gpt-image-2`

The tool never hardcodes secrets and only reads credentials from `process.env`.

## Setup

1. Install project dependencies if they are not already present:
   `npm install`
2. Build the CLI:
   `npm run visual-skill:build`

## Commands

- `npm run visual-skill -- audit`
- `npm run visual-skill -- plan`
- `npm run visual-skill -- generate`
- `npm run visual-skill -- apply`
- `npm run visual-skill -- full`
- `npm run visual-skill -- dry-run`

Helpful flags:

- `--limit 3`
- `--severity-min 3`
- `--section hero`
- `--dry-run`
- `--yes`
- `--output-dir trade-receptionist-visual-skill`
- `--asset-dir public/assets/generated/trade-receptionist`
- `--model gpt-image-2`
- `--verbose`

## Safe workflow

Recommended order:

1. Run a dry run first:
   `npm run visual-skill -- dry-run --severity-min 2 --verbose`
2. Review the audit reports and prompts
3. Generate assets without touching source files:
   `OPENAI_API_KEY=... IMAGE_MODEL=gpt-image-2 npm run visual-skill -- generate --severity-min 3`
4. Review the generated assets and metadata
5. Preview the apply patch first:
   `npm run visual-skill -- apply --dry-run`
6. Apply only after reviewing the manifest and patch preview:
   `npm run visual-skill -- apply --yes`

## Generate without applying

`OPENAI_API_KEY=... IMAGE_MODEL=gpt-image-2 npm run visual-skill -- generate --limit 2`

This updates the manifest and writes assets plus metadata, but does not modify website source files.

## Apply safely

`npm run visual-skill -- apply --yes`

Current safe-apply behavior is intentionally conservative:

- `apply --dry-run` previews patch output without mutating source files
- `apply` and `full` require `--yes` before source files are rewritten
- Direct string-literal asset swaps are applied automatically
- Component-level redesign findings are marked as `skipped` for manual integration
- Existing assets are never deleted
- Backups are created before source changes
- A patch file is written for every apply run

## Output locations

- Audit reports:
  `trade-receptionist-visual-skill/reports/design-audit.json`
  `trade-receptionist-visual-skill/reports/design-audit.md`
- Replacement plan:
  `trade-receptionist-visual-skill/reports/replacement-plan.json`
  `trade-receptionist-visual-skill/reports/replacement-plan.md`
- Dry-run example:
  `trade-receptionist-visual-skill/reports/dry-run-example.txt`
- Prompt files:
  `trade-receptionist-visual-skill/prompts/*.prompt.md`
  `trade-receptionist-visual-skill/prompts/generated-prompts.json`
- Manifest:
  `trade-receptionist-visual-skill/manifest/assets.manifest.json`
- Generated assets:
  `public/assets/generated/trade-receptionist/`
- Apply backups:
  `trade-receptionist-visual-skill/backups/[timestamp]/`
- Patches:
  `trade-receptionist-visual-skill/patches/[timestamp].patch`

## Example usage

Dry run:

```bash
npm run visual-skill -- dry-run --severity-min 2 --verbose
```

Plan only:

```bash
npm run visual-skill -- plan --limit 5
```

Generate with OpenAI:

```bash
OPENAI_API_KEY=... IMAGE_MODEL=gpt-image-2 npm run visual-skill -- generate --section hero
```

Full pipeline:

```bash
OPENAI_API_KEY=... IMAGE_MODEL=gpt-image-2 npm run visual-skill -- full --limit 1 --yes
```

## Troubleshooting

- If `generate` marks assets as `failed`, confirm `OPENAI_API_KEY` is exported in the shell running the command.
- If the OpenAI image endpoint rejects a request, the tool preserves reports, prompts, and manifest data instead of deleting output.
- If `apply` marks an item as `skipped`, it means the integration requires component-level design work rather than a direct asset-path replacement.
- If TypeScript build fails, run `npm run visual-skill:build` directly to see compile errors from the CLI implementation.
