import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { ProjectType } from '../../bin/types/enums';


class TemplateService {
  private templatesConfig: any;

  constructor() {
    this.loadTemplatesConfig();
  }

  private loadTemplatesConfig() {
    const configPath = path.join(__dirname, '../../templates/githubTemplates.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('Template configuration file not found');
    }
    this.templatesConfig = require(configPath);
  }

  public async promptTemplateSelection(kind: ProjectType): Promise<{
    templateType: string;
    customRepo?: string;
  }> {
    const categories = this.templatesConfig[`${kind}Categories`];

    const { category } = await inquirer.prompt([
      {
        type: 'list',
        name: 'category',
        message: `Select ${kind} template category:`,
        choices: Object.keys(categories).map(cat => ({
          name: this.formatCategoryName(cat),
          value: cat
        }))
      }
    ]);

    const templateChoices = categories[category].map((t: string) => ({
      name: this.formatTemplateName(t),
      value: t
    }));

    const { templateType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'templateType',
        message: `Select a ${kind} template:`,
        choices: templateChoices
      }
    ]);

    if (templateType === 'custom-repo') {
      const { customRepo } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customRepo',
          message: 'Enter GitHub repository URL:',
          validate: (input: string) => !!input.trim() || 'URL cannot be empty'
        }
      ]);
      return { templateType, customRepo };
    }

    return { templateType };
  }

  public async cloneTemplate(
    templateType: string,
    customRepo: string | undefined,
    targetPath: string,
    kind: ProjectType
  ): Promise<void> {
    const repoUrl = templateType === 'custom-repo'
      ? customRepo
      : this.templatesConfig[kind][templateType];

    if (!repoUrl) {
      throw new Error(`Repository URL not found for template: ${templateType}`);
    }

    try {
      console.log(`🚀 Cloning ${this.formatTemplateName(templateType)} ${kind} template...`);
      execSync(`git clone ${repoUrl} ${targetPath}`, { stdio: 'inherit' });

      // Remove .git to detach history
      await fs.remove(path.join(targetPath, '.git'));
      console.log(`✅ Successfully initialized project with ${this.formatTemplateName(templateType)} ${kind} template`);
    } catch (error) {
      throw new Error(`❌ Failed to clone ${kind} template: ${error instanceof Error ? error.message : error}`);
    }
  }

  private formatCategoryName(category: string): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatTemplateName(template: string): string {
    return template
      .replace('skaya-', '')
      .split('-')
      .map(word => word.toUpperCase())
      .join(' ');
  }
}

export default new TemplateService();
