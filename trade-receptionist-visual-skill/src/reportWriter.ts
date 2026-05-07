import path from 'node:path';

import type { AssetManifest, AuditFinding, RepoInspection, VisualSkillContext } from './types.js';
import { ensureDir, writeJson, writeText } from './utils.js';

export async function writeAuditReports(
  context: VisualSkillContext,
  inspection: RepoInspection,
  findings: AuditFinding[],
): Promise<void> {
  await ensureDir(context.paths.reportsDir);

  const jsonPath = path.join(context.paths.reportsDir, 'design-audit.json');
  const mdPath = path.join(context.paths.reportsDir, 'design-audit.md');

  await writeJson(jsonPath, {
    generatedAt: new Date().toISOString(),
    inspection,
    findings,
  });

  const markdown = [
    '# Trade Receptionist Visual Design Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Repository detection',
    '',
    `- Framework: ${inspection.framework}`,
    `- Routing: ${inspection.routing.type}`,
    `- Route count: ${inspection.routing.routes.length}`,
    `- Public asset root: ${inspection.imageConventions.publicAssetRoot}`,
    `- Preferred generated asset dir: ${inspection.imageConventions.preferredGeneratedDir}`,
    `- Image formats seen: ${inspection.imageConventions.detectedFormats.join(', ') || 'none detected'}`,
    '',
    '## Routes',
    '',
    ...inspection.routing.routes.map(route => `- \`${route.path}\` via \`${route.sourceFile}\``),
    '',
    '## Landing visuals inspected',
    '',
    ...inspection.landingVisualAreas.map(area =>
      `- ${area.areaName} — page \`${area.pagePath}\` — component \`${area.componentPath}\` — ${area.notes}`,
    ),
    '',
    '## Findings',
    '',
    '| Area | Page | Component | Category | Severity | Conversion impact | Integration risk | Replacement |',
    '| --- | --- | --- | --- | ---: | --- | --- | --- |',
    ...findings.map(finding =>
      `| ${finding.areaName} | \`${finding.pagePath}\` | \`${finding.componentPath}\` | ${finding.problemCategory} | ${finding.severity} | ${finding.conversionImpact} | ${finding.integrationRisk} | ${finding.replacementType} |`,
    ),
    '',
    ...findings.flatMap(finding => [
      `### ${finding.areaName}`,
      '',
      `- Page path: \`${finding.pagePath}\``,
      `- File/component: \`${finding.componentPath}\``,
      `- Current visual source: ${finding.currentVisualSource}`,
      `- Why it weakens conversion: ${finding.whyItWeakensConversion}`,
      `- Category: ${finding.problemCategory}`,
      `- Severity: ${finding.severity}`,
      `- Conversion impact: ${finding.conversionImpact}`,
      `- Integration risk: ${finding.integrationRisk}`,
      `- Recommended replacement direction: ${finding.recommendedReplacementDirection}`,
      `- Suggested alt text: ${finding.suggestedAltText}`,
      `- Replacement type: ${finding.replacementType}`,
      '',
    ]),
  ].join('\n');

  await writeText(mdPath, `${markdown}\n`);
}

export async function writeReplacementPlan(
  context: VisualSkillContext,
  findings: AuditFinding[],
  manifest: AssetManifest,
): Promise<void> {
  await ensureDir(context.paths.reportsDir);

  const planJsonPath = path.join(context.paths.reportsDir, 'replacement-plan.json');
  const planMdPath = path.join(context.paths.reportsDir, 'replacement-plan.md');

  await writeJson(planJsonPath, {
    generatedAt: new Date().toISOString(),
    findings: findings.map(finding => ({
      assetId: finding.assetId,
      section: finding.section,
      areaName: finding.areaName,
      replacementType: finding.replacementType,
      integrationTarget: finding.integrationTarget,
      recommendedReplacementDirection: finding.recommendedReplacementDirection,
    })),
    manifest,
  });

  const selectedIds = new Set(findings.map(finding => finding.assetId));
  const selectedAssets = manifest.assets.filter(asset => selectedIds.has(asset.assetId));

  const markdown = [
    '# Trade Receptionist Visual Replacement Plan',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Planned replacements',
    '',
    '| Asset ID | Section | Replacement type | Apply strategy | Target file | Status |',
    '| --- | --- | --- | --- | --- | --- |',
    ...selectedAssets.map(asset =>
      `| \`${asset.assetId}\` | \`${asset.section}\` | ${findings.find(f => f.assetId === asset.assetId)?.replacementType ?? 'image'} | ${asset.applyStrategy} | \`${asset.applyTargetFile}\` | ${asset.status} |`,
    ),
    '',
  ].join('\n');

  await writeText(planMdPath, `${markdown}\n`);
}
