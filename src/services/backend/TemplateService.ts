import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';

class BackendTemplateService {
  private templatesConfig: any;

  constructor() {
    this.loadTemplatesConfig();
  }

  private loadTemplatesConfig() {
    const configPath = path.join(__dirname, '../../templates/githubTemplates.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('Backend template configuration not found');
    }
    this.templatesConfig = require(configPath);
  }

  public async promptTemplateSelection(): Promise<{
    templateType: string;
    customRepo?: string;
  }> {
    const { category } = await inquirer.prompt([
      {
        type: 'list',
        name: 'category',
        message: 'Select backend template category:',
        choices: Object.keys(this.templatesConfig.backendCategories).map(cat => ({
          name: this.formatCategoryName(cat),
          value: cat
        }))
      }
    ]);

    const templatesInCategory = this.templatesConfig.backendCategories[category];
    const templateChoices = templatesInCategory.map((t: string) => ({
      name: this.formatTemplateName(t),
      value: t
    }));

    if (category === 'community') {
      templateChoices.push({
        name: 'Other GitHub Repository',
        value: 'custom'
      });
    }

    const { templateType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'templateType',
        message: 'Select a backend template:',
        choices: templateChoices
      }
    ]);

    if (templateType === 'custom') {
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

  public async cloneTemplate(templateType: string, customRepo: string | undefined, targetPath: string): Promise<void> {
    const repoUrl = templateType === 'custom' 
      ? customRepo 
      : this.templatesConfig.backend[templateType];

    try {
      console.log(`🚀 Cloning ${this.formatTemplateName(templateType)} backend template...`);
      execSync(`git clone ${repoUrl} ${targetPath}`, { stdio: 'inherit' });
      
      // Cleanup
      await fs.remove(path.join(targetPath, '.git'));
      console.log(`✅ Successfully initialized project with ${this.formatTemplateName(templateType)} backend template`);
    } catch (error) {
      throw new Error(`Failed to clone backend template: ${error}`);
    }
  }

  private formatCategoryName(category: string): string {
    return category.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatTemplateName(template: string): string {
    return template.replace('skaya-', '')
      .split('-')
      .map(word => word.toUpperCase())
      .join(' ');
  }
}

export default new BackendTemplateService();
