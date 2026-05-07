export type VisualProblemCategory =
  | 'Generic AI blob'
  | 'Cheap SaaS illustration'
  | 'Inconsistent style'
  | 'Low trust dashboard'
  | 'Unreadable UI'
  | 'Weak relevance to tradespeople'
  | 'Poor responsiveness'
  | 'Overused gradient/glassmorphism'
  | 'Placeholder-looking visual';

export type ImpactLevel = 'low' | 'medium' | 'high';
export type ReplacementType = 'image' | 'svg' | 'css' | 'component';
export type AssetStatus = 'planned' | 'generated' | 'applied' | 'skipped' | 'failed';
export type CommandName = 'audit' | 'plan' | 'generate' | 'apply' | 'full' | 'dry-run';
export type PromptTemplateType =
  | 'hero'
  | 'workflow'
  | 'dashboard'
  | 'messaging'
  | 'job-capture'
  | 'call-answering'
  | 'integration'
  | 'trust-security'
  | 'cta';

export interface RouteInfo {
  path: string;
  sourceFile: string;
}

export interface ImageReference {
  filePath: string;
  lineNumber: number;
  assetPath: string;
  sourceType: 'img-tag' | 'asset-string' | 'css-background';
}

export interface TokenMap {
  colors: Record<string, string>;
  fonts: Record<string, string>;
  radii: Record<string, string>;
}

export interface VisualArea {
  areaName: string;
  pagePath: string;
  componentPath: string;
  rendered: boolean;
  notes: string;
}

export interface RepoInspection {
  rootDir: string;
  framework: string;
  routing: {
    type: string;
    routes: RouteInfo[];
  };
  pageFiles: string[];
  componentFiles: string[];
  assetFolders: string[];
  imageReferences: ImageReference[];
  imageConventions: {
    publicAssetRoot: string;
    preferredGeneratedDir: string;
    detectedFormats: string[];
  };
  tokens: TokenMap;
  brandColors: string[];
  imageComponents: string[];
  landingVisualAreas: VisualArea[];
}

export interface IntegrationTarget {
  filePath: string;
  strategy: 'replace-string-literal' | 'manual-component-redesign' | 'manual-css-treatment';
  searchValue?: string;
}

export interface AuditFinding {
  assetId: string;
  section: string;
  areaName: string;
  pagePath: string;
  componentPath: string;
  currentVisualSource: string;
  oldAssetPath?: string;
  whyItWeakensConversion: string;
  problemCategory: VisualProblemCategory;
  severity: 1 | 2 | 3 | 4 | 5;
  conversionImpact: ImpactLevel;
  integrationRisk: ImpactLevel;
  recommendedReplacementDirection: string;
  suggestedAltText: string;
  replacementType: ReplacementType;
  promptTemplate: PromptTemplateType;
  integrationTarget: IntegrationTarget;
}

export interface PromptDefinition {
  assetId: string;
  section: string;
  fileName: string;
  promptPath: string;
  prompt: string;
  template: PromptTemplateType;
}

export interface ManifestEntry {
  assetId: string;
  section: string;
  pagePath: string;
  componentPath: string;
  oldAssetPath?: string;
  newAssetPath?: string;
  promptPath: string;
  metadataPath?: string;
  altText: string;
  severity: number;
  integrationRisk: ImpactLevel;
  status: AssetStatus;
  createdAt: string;
  updatedAt: string;
  currentVisualSource: string;
  applyStrategy: IntegrationTarget['strategy'];
  applyTargetFile: string;
  applySearchValue?: string;
  notes?: string;
}

export interface AssetManifest {
  repo: string;
  generatedAt: string;
  assets: ManifestEntry[];
}

export interface GeneratedAssetMetadata {
  assetId: string;
  originalComponentLocation: string;
  promptUsed: string;
  modelUsed: string;
  dateGenerated: string;
  assetPath: string;
  altText: string;
  auditSeverity: number;
  integrationTarget: IntegrationTarget;
  generationSettings: {
    requestedSize: string;
    requestedAspectRatio: string;
    requestedQuality: string;
    format: string;
  };
  safeApplyStatus: AssetStatus;
}

export interface CliOptions {
  command: CommandName;
  limit?: number;
  severityMin: number;
  section?: string;
  dryRun: boolean;
  yes: boolean;
  outputDir?: string;
  assetDir?: string;
  model?: string;
  verbose: boolean;
}

export interface VisualSkillPaths {
  rootDir: string;
  toolDir: string;
  reportsDir: string;
  promptsDir: string;
  manifestDir: string;
  backupsDir: string;
  patchesDir: string;
  brandConfigPath: string;
  manifestPath: string;
  assetOutputDir: string;
}

export interface VisualSkillContext {
  options: CliOptions;
  paths: VisualSkillPaths;
}

export interface BrandConfig {
  productName: string;
  tagline: string;
  personality: string[];
  targetUsers: string[];
  visualStyle: {
    base: string;
    surface: string;
    primaryAccent: string;
    secondaryAccent: string;
    supportAccent: string;
    mood: string[];
  };
  avoid: string[];
  messagingCue: string;
}
