import type { AuditFinding, ImpactLevel, VisualProblemCategory } from './types.js';
import { pickImpactLevel } from './utils.js';

const CATEGORY_WEIGHT: Record<VisualProblemCategory, number> = {
  'Generic AI blob': 4.5,
  'Cheap SaaS illustration': 4,
  'Inconsistent style': 3.2,
  'Low trust dashboard': 4.2,
  'Unreadable UI': 4.4,
  'Weak relevance to tradespeople': 4,
  'Poor responsiveness': 3.5,
  'Overused gradient/glassmorphism': 2.8,
  'Placeholder-looking visual': 3.8,
};

export function scoreFinding(finding: Omit<AuditFinding, 'severity' | 'conversionImpact' | 'integrationRisk'> & {
  severity?: number;
  conversionImpact?: ImpactLevel;
  integrationRisk?: ImpactLevel;
}): AuditFinding {
  const weightedSeverity = finding.severity ?? Math.min(
    5,
    Math.max(1, Math.round(CATEGORY_WEIGHT[finding.problemCategory])),
  );

  const conversionImpact = finding.conversionImpact ?? pickImpactLevel(
    weightedSeverity + (finding.section === 'hero' || finding.section === 'workflow' ? 0.7 : 0),
  );

  const integrationRisk = finding.integrationRisk ?? pickImpactLevel(
    finding.integrationTarget.strategy === 'replace-string-literal'
      ? 1.4
      : finding.integrationTarget.strategy === 'manual-component-redesign'
        ? 3.6
        : 2.8,
  );

  return {
    ...finding,
    severity: weightedSeverity as AuditFinding['severity'],
    conversionImpact,
    integrationRisk,
  };
}
