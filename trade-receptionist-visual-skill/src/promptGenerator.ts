import path from 'node:path';

import type { AuditFinding, BrandConfig, PromptDefinition, VisualSkillContext } from './types.js';
import { renderPromptTemplate } from './promptTemplates.js';
import { ensureDir, slugify, writeJson, writeText } from './utils.js';

export async function generatePrompts(
  context: VisualSkillContext,
  brand: BrandConfig,
  findings: AuditFinding[],
): Promise<PromptDefinition[]> {
  await ensureDir(context.paths.promptsDir);

  const prompts: PromptDefinition[] = [];
  for (const finding of findings) {
    const fileName = `${slugify(finding.assetId)}.prompt.md`;
    const promptPath = path.join(context.paths.promptsDir, fileName);
    const prompt = renderPromptTemplate(finding.promptTemplate, finding, brand);

    const markdown = [
      `# ${finding.areaName}`,
      '',
      `- Asset ID: \`${finding.assetId}\``,
      `- Section: \`${finding.section}\``,
      `- Page path: \`${finding.pagePath}\``,
      `- Component: \`${finding.componentPath}\``,
      '',
      '## Prompt',
      '',
      prompt,
      '',
    ].join('\n');

    await writeText(promptPath, markdown);
    prompts.push({
      assetId: finding.assetId,
      section: finding.section,
      fileName,
      promptPath,
      prompt,
      template: finding.promptTemplate,
    });
  }

  await writeJson(
    path.join(context.paths.promptsDir, 'generated-prompts.json'),
    prompts.map(prompt => ({
      assetId: prompt.assetId,
      section: prompt.section,
      template: prompt.template,
      promptPath: path.relative(context.paths.rootDir, prompt.promptPath).split(path.sep).join('/'),
      prompt: prompt.prompt,
    })),
  );

  return prompts;
}
