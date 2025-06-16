// src/services/TemplateService.ts
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
    const configPath = path.join(__dirname, '../templates/githubTemplates.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('Template configuration file not found');
    }
    this.templatesConfig = require(configPath);
  }

  public async promptTemplateSelection(projectType: ProjectType): Promise<{
    templateType: string;
    customRepo?: string;
  }> {
    // For frontend projects, first ask if they want to use a framework or template
    if (projectType === ProjectType.FRONTEND) {
      const { creationMethod } = await inquirer.prompt([
        {
          type: 'list',
          name: 'creationMethod',
          message: 'How would you like to create your frontend project?',
          choices: [
            { name: 'Use a framework (React, Next.js, Vite)', value: 'framework' },
            { name: 'Use a template', value: 'template' }
          ]
        }
      ]);

      if (creationMethod === 'framework') {
        const { framework } = await inquirer.prompt([
          {
            type: 'list',
            name: 'framework',
            message: 'Select frontend framework:',
            choices: [
              { name: 'React (via create-react-app)', value: 'react' },
              { name: 'Next.js', value: 'next' },
              { name: 'Vite', value: 'vite' }
            ]
          }
        ]);
        return { templateType: framework };
      }
    }

    // For backend or template-based frontend projects
    const categories = this.templatesConfig[`${projectType}Categories`];
    
    if (!categories) {
      throw new Error(`No templates available for project type: ${projectType}`);
    }

    const { category } = await inquirer.prompt([
      {
        type: 'list',
        name: 'category',
        message: `Select ${projectType} template category:`,
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
        message: `Select a ${projectType} template:`,
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
    projectType: ProjectType
  ): Promise<void> {
    try {
      // Handle framework initialization
      if (projectType === ProjectType.FRONTEND && 
          ['react', 'next', 'vite'].includes(templateType)) {
        await this.initializeFramework(templateType, targetPath);
        return;
      }

      // Handle template cloning
      const repoUrl = templateType === 'custom-repo'
        ? customRepo
        : this.templatesConfig[projectType][templateType];

      if (!repoUrl) {
        throw new Error(`Repository URL not found for template: ${templateType}`);
      }

      console.log(`🚀 Cloning ${this.formatTemplateName(templateType)} template...`);
      execSync(`git clone ${repoUrl} ${targetPath}`, { stdio: 'inherit' });

      // Post-clone setup
      await this.postCloneSetup(targetPath, templateType);
      
    } catch (error) {
      throw new Error(`❌ Failed to initialize project: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async initializeFramework(framework: string, targetPath: string): Promise<void> {
    console.log(`🚀 Initializing ${framework} project...`);
    
    switch (framework) {
      case 'react':
        execSync(`npx create-react-app ${targetPath}`, { stdio: 'inherit' });
        break;
      case 'next':
        execSync(`npx create-next-app ${targetPath}`, { stdio: 'inherit' });
        break;
      case 'vite':
        const { viteTemplate } = await inquirer.prompt([
          {
            type: 'list',
            name: 'viteTemplate',
            message: 'Select Vite template:',
            choices: [
              'react-ts',
              'react',
              'vanilla-ts',
              'vanilla'
            ]
          }
        ]);
        execSync(`npm create vite@latest ${targetPath} -- --template ${viteTemplate}`, { stdio: 'inherit' });
        break;
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }

    console.log(`✅ Successfully initialized ${framework} project`);
  }

  private async postCloneSetup(targetPath: string, templateType: string): Promise<void> {
    // Remove .git to detach history
    await fs.remove(path.join(targetPath, '.git'));
    
    // Initialize new git repo
    process.chdir(targetPath);
    execSync('git init', { stdio: 'inherit' });
    
    // Add all files and make initial commit
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "skaya init"', { stdio: 'inherit' });
    
    console.log(`✅ Successfully initialized project with ${this.formatTemplateName(templateType)} template`);
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