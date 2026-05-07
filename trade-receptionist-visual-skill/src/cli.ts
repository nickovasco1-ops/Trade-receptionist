#!/usr/bin/env node
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';

import { defaultAssetOutputDir, loadBrandConfig } from './brandConfig.js';
import { generateAssets } from './imageAdapter.js';
import { loadManifest, mergePlanIntoManifest, saveManifest } from './manifestManager.js';
import { generatePrompts } from './promptGenerator.js';
import { inspectRepository } from './repoInspector.js';
import { writeAuditReports, writeReplacementPlan } from './reportWriter.js';
import { applyGeneratedAssets } from './safeApply.js';
import type { CliOptions, CommandName, VisualSkillContext, VisualSkillPaths } from './types.js';
import { ensureDir, parseInteger, slugify, timestampStamp, writeText } from './utils.js';
import { scanVisuals } from './visualScanner.js';

async function main(): Promise<void> {
  loadEnvironment(process.cwd());
  const options = parseArgs(process.argv.slice(2));
  const context = createContext(process.cwd(), options);

  await ensureDir(context.paths.toolDir);
  await ensureDir(context.paths.reportsDir);
  await ensureDir(context.paths.promptsDir);
  await ensureDir(context.paths.manifestDir);
  await ensureDir(context.paths.backupsDir);
  await ensureDir(context.paths.patchesDir);
  await ensureDir(context.paths.assetOutputDir);

  const inspection = await inspectRepository(context);
  const brand = await loadBrandConfig(context.paths);
  const findings = await scanVisuals(context, inspection);
  const prompts = await generatePrompts(context, brand, findings);
  const selectedAssetIds = findings.map(finding => finding.assetId);
  let manifest = mergePlanIntoManifest(await loadManifest(context), findings, prompts, context.paths.rootDir);

  if (options.command === 'audit') {
    await writeAuditReports(context, inspection, findings);
    await saveManifest(context, manifest);
    await logSummary(context, inspection, findings, manifest, 'audit');
    return;
  }

  await writeAuditReports(context, inspection, findings);
  await writeReplacementPlan(context, findings, manifest);
  await saveManifest(context, manifest);

  if (options.command === 'plan' || options.command === 'dry-run') {
    await writeDryRunExample(context, inspection, findings, manifest);
    await logSummary(context, inspection, findings, manifest, options.command);
    return;
  }

  if ((options.command === 'generate' || options.command === 'full') && !options.dryRun) {
    manifest = await generateAssets(context, manifest, prompts, selectedAssetIds);
    await saveManifest(context, manifest);
  }

  if (options.command === 'apply' || options.command === 'full') {
    manifest = await applyGeneratedAssets(context, manifest, selectedAssetIds);
    await saveManifest(context, manifest);
  }

  await logSummary(context, inspection, findings, manifest, options.command);
}

function loadEnvironment(rootDir: string): void {
  loadDotenv({ path: path.join(rootDir, '.env') });
  loadDotenv({ path: path.join(rootDir, '.env.local'), override: true });
}

function parseArgs(argv: string[]): CliOptions {
  const command = (argv[0] as CommandName | undefined) ?? 'dry-run';
  const validCommands: CommandName[] = ['audit', 'plan', 'generate', 'apply', 'full', 'dry-run'];
  if (!validCommands.includes(command)) {
    throw new Error(`Unknown command "${command}". Expected one of: ${validCommands.join(', ')}`);
  }

  const options: CliOptions = {
    command,
    severityMin: 1,
    dryRun: command === 'dry-run',
    yes: false,
    verbose: false,
  };

  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    const nextValue = argv[index + 1];
    switch (flag) {
      case '--limit':
        options.limit = parseInteger(nextValue);
        index += 1;
        break;
      case '--severity-min':
        options.severityMin = parseInteger(nextValue) ?? 1;
        index += 1;
        break;
      case '--section':
        options.section = nextValue;
        index += 1;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--yes':
        options.yes = true;
        break;
      case '--output-dir':
        options.outputDir = nextValue;
        index += 1;
        break;
      case '--asset-dir':
        options.assetDir = nextValue;
        index += 1;
        break;
      case '--model':
        options.model = nextValue;
        index += 1;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      default:
        throw new Error(`Unknown flag "${flag}"`);
    }
  }

  return options;
}

function createContext(rootDir: string, options: CliOptions): VisualSkillContext {
  const toolDir = path.join(rootDir, options.outputDir ?? 'trade-receptionist-visual-skill');
  const publicDir = path.join(rootDir, 'public');
  const resolvedAssetDir = options.assetDir
    ? path.resolve(rootDir, options.assetDir)
    : defaultAssetOutputDir({
        rootDir,
        toolDir,
        reportsDir: '',
        promptsDir: '',
        manifestDir: '',
        backupsDir: '',
        patchesDir: '',
        brandConfigPath: '',
        manifestPath: '',
        assetOutputDir: '',
      });

  const relativeToPublic = path.relative(publicDir, resolvedAssetDir);
  const isInsidePublic = !relativeToPublic.startsWith('..') && !path.isAbsolute(relativeToPublic);
  if (!isInsidePublic) {
    throw new Error(`--asset-dir must resolve inside the repo public directory. Received: ${resolvedAssetDir}`);
  }

  const paths: VisualSkillPaths = {
    rootDir,
    toolDir,
    reportsDir: path.join(toolDir, 'reports'),
    promptsDir: path.join(toolDir, 'prompts'),
    manifestDir: path.join(toolDir, 'manifest'),
    backupsDir: path.join(toolDir, 'backups'),
    patchesDir: path.join(toolDir, 'patches'),
    brandConfigPath: path.join(toolDir, 'brand.config.json'),
    manifestPath: path.join(toolDir, 'manifest', 'assets.manifest.json'),
    assetOutputDir: resolvedAssetDir,
  };

  return { options, paths };
}

async function writeDryRunExample(
  context: VisualSkillContext,
  inspection: Awaited<ReturnType<typeof inspectRepository>>,
  findings: Awaited<ReturnType<typeof scanVisuals>>,
  manifest: Awaited<ReturnType<typeof loadManifest>>,
): Promise<void> {
  const content = [
    `trade-receptionist-visual-skill dry-run`,
    `timestamp=${timestampStamp()}`,
    `framework=${inspection.framework}`,
    `routes=${inspection.routing.routes.map(route => route.path).join(', ')}`,
    `findings=${findings.length}`,
    ...findings.map(finding =>
      `- ${finding.assetId} | severity=${finding.severity} | section=${finding.section} | apply=${finding.integrationTarget.strategy}`,
    ),
    `manifest=${manifest.assets.length} assets planned`,
  ].join('\n');

  await writeText(path.join(context.paths.reportsDir, 'dry-run-example.txt'), `${content}\n`);
}

async function logSummary(
  context: VisualSkillContext,
  inspection: Awaited<ReturnType<typeof inspectRepository>>,
  findings: Awaited<ReturnType<typeof scanVisuals>>,
  manifest: Awaited<ReturnType<typeof loadManifest>>,
  command: CommandName,
): Promise<void> {
  const appliedCount = manifest.assets.filter(asset => asset.status === 'applied').length;
  const generatedCount = manifest.assets.filter(asset => asset.status === 'generated').length;
  const failedCount = manifest.assets.filter(asset => asset.status === 'failed').length;

  console.log('');
  console.log(`Trade Receptionist visual skill: ${command}`);
  console.log(`Framework: ${inspection.framework}`);
  console.log(`Findings: ${findings.length}`);
  console.log(`Reports: ${path.relative(context.paths.rootDir, context.paths.reportsDir).split(path.sep).join('/')}`);
  console.log(`Prompts: ${path.relative(context.paths.rootDir, context.paths.promptsDir).split(path.sep).join('/')}`);
  console.log(`Manifest: ${path.relative(context.paths.rootDir, context.paths.manifestPath).split(path.sep).join('/')}`);
  console.log(`Generated assets dir: ${path.relative(context.paths.rootDir, context.paths.assetOutputDir).split(path.sep).join('/')}`);
  console.log(`Generated assets: ${generatedCount}`);
  console.log(`Applied assets: ${appliedCount}`);
  if (failedCount > 0) {
    console.log(`Failed assets: ${failedCount}`);
  }
  if (context.options.verbose) {
    for (const finding of findings) {
      console.log(` - ${finding.assetId}: ${finding.areaName} [${finding.problemCategory}]`);
    }
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
