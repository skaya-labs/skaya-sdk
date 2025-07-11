// src/services/TemplateService.ts
import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";
import {
  ApiType,
  BackendComponentType,
  ComponentType,
  FrontendComponentType,
  ProjectType,
} from "../../bin/types/enums";
import { TemplateFileInfo } from "../scripts/templateGenerator";
import { promisify } from "util";
import { getDefaultTemplateDirectory } from "../../bin/utils/ProjectScanner";

class TemplateService {
  private templatesConfig: any;

  constructor() {
    this.loadTemplatesConfig();
  }

  private loadTemplatesConfig() {
    const configPath = path.join(
      __dirname,
      "../../bin/templates/githubTemplates.json"
    );
    if (!fs.existsSync(configPath)) {
      throw new Error("Template configuration file not found at ");
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
          type: "list",
          name: "creationMethod",
          message: "How would you like to create your frontend project?",
          choices: [
            {
              name: "Use a framework (React, Next.js, Vite)",
              value: "framework",
            },
            { name: "Use a template", value: "template" },
          ],
        },
      ]);

      if (creationMethod === "framework") {
        const { framework } = await inquirer.prompt([
          {
            type: "list",
            name: "framework",
            message: "Select frontend framework:",
            choices: [
              { name: "React (via create-react-app)", value: "react" },
              { name: "Next.js", value: "next" },
              { name: "Vite", value: "vite" },
            ],
          },
        ]);
        return { templateType: framework };
      }
    }

    // For backend or template-based frontend projects
    const categories = this.templatesConfig[`${projectType}Categories`];

    if (!categories) {
      throw new Error(
        `No templates available for project type: ${projectType}`
      );
    }

    const { category } = await inquirer.prompt([
      {
        type: "list",
        name: "category",
        message: `Select ${projectType} template category:`,
        choices: Object.keys(categories).map((cat) => ({
          name: this.formatCategoryName(cat),
          value: cat,
        })),
      },
    ]);

    const templateChoices = categories[category].map((t: string) => ({
      name: this.formatTemplateName(t),
      value: t,
    }));

    const { templateType } = await inquirer.prompt([
      {
        type: "list",
        name: "templateType",
        message: `Select a ${projectType} template:`,
        choices: templateChoices,
      },
    ]);

    if (templateType === "custom-repo") {
      const { customRepo } = await inquirer.prompt([
        {
          type: "input",
          name: "customRepo",
          message: "Enter GitHub repository URL:",
          validate: (input: string) => !!input.trim() || "URL cannot be empty",
        },
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
      if (
        projectType === ProjectType.FRONTEND &&
        ["react", "next", "vite"].includes(templateType)
      ) {
        await this.initializeFramework(templateType, targetPath);
        return;
      }

      // Handle template cloning
      const repoUrl =
        templateType === "custom-repo"
          ? customRepo
          : this.templatesConfig[projectType][templateType];

      if (!repoUrl) {
        throw new Error(
          `Repository URL not found for template: ${templateType}`
        );
      }

      console.log(
        `🚀 Cloning ${this.formatTemplateName(templateType)} template...`
      );
      execSync(`git clone ${repoUrl} ${targetPath}`, { stdio: "inherit" });

      // Post-clone setup
      await this.postCloneSetup(targetPath, templateType);
    } catch (error) {
      throw new Error(
        `❌ Failed to initialize project: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  private async initializeFramework(
    framework: string,
    targetPath: string
  ): Promise<void> {
    console.log(`🚀 Initializing ${framework} project...`);

    switch (framework) {
      case "react":
        execSync(`npx create-react-app ${targetPath}`, { stdio: "inherit" });
        break;
      case "next":
        // Construct the npx create-next-app command with recommended settings
        const nextAppCommand =
          `npx create-next-app ${targetPath} ` +
          `--ts ` + // Enable TypeScript
          `--eslint ` + // Enable ESLint
          `--src-dir ` + // Enable src/ directory
          `--app ` + // Enable App Router
          `--import-alias "@/*" ` + // Set import alias to @/*
          `--no-turbo`; // Disable Turbopack for better Web3 compatibility

        console.log(`Executing: ${nextAppCommand}`);
        execSync(nextAppCommand, { stdio: "inherit" });
        break;
      case "vite":
        const { viteTemplate } = await inquirer.prompt([
          {
            type: "list",
            name: "viteTemplate",
            message: "Select Vite template:",
            choices: ["react-ts", "react", "vanilla-ts", "vanilla"],
          },
        ]);
        execSync(
          `npm create vite@latest ${targetPath} -- --template ${viteTemplate}`,
          { stdio: "inherit" }
        );
        break;
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }

    console.log(`✅ Successfully initialized ${framework} project`);
  }

  private async postCloneSetup(
    targetPath: string,
    templateType: string
  ): Promise<void> {
    // Remove .git to detach history
    await fs.remove(path.join(targetPath, ".git"));

    // Initialize new git repo
    process.chdir(targetPath);
    execSync("git init", { stdio: "inherit" });

    // Add all files and make initial commit
    // execSync('git add .', { stdio: 'inherit' });
    // execSync('git commit -m "skaya init"', { stdio: 'inherit' });
    process.chdir("..");

    console.log(
      `✅ Successfully initialized project with ${this.formatTemplateName(
        templateType
      )} template`
    );
  }

  private formatCategoryName(category: string): string {
    return category
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  private formatTemplateName(template: string): string {
    return template
      .replace("skaya-", "")
      .split("-")
      .map((word) => word.toUpperCase())
      .join(" ");
  }

  /**
   * Saves template files to disk
   * @param {Object} params - Saving parameters
   * @param {TemplateFileInfo[]} params.templateFiles - Template files to save
   * @param {string} params.fileName - The base name for the component
   * @param {string} params.targetFolder - The target folder path
   * @param {ComponentType} params.componentType - The type of component
   * @returns {Promise<string[]>} Array of created file paths
   */
  public async saveTemplateFiles(params: {
    templateFiles: TemplateFileInfo[];
    fileName: string;
    targetFolder: string;
    componentType: ComponentType | ApiType;
  }): Promise<string[]> {
    const { templateFiles, fileName, targetFolder, componentType } = params;
    const createdFiles: string[] = [];

    for (const templateFile of templateFiles) {
      let content = templateFile.content;
      if (!content) {
        throw new Error(
          `Template file ${templateFile.originalFileName} is empty.`
        );
      }
      // Handle the special Storybook 'component: Component' case
      content = content.replace(
        /component: Component/g,
        `component: ${fileName}`
      );

      // Do general replacements
      content = content
        .replace(/{{component}}/g, fileName.toLowerCase())
        .replace(/{{Component}}/g, fileName)
        .replace(/{{COMPONENT}}/g, fileName.toUpperCase())
        .replace(
          new RegExp(
            `(?<!React\\.)(\\b|_)${componentType}(?![:])(\\b|_)`,
            "gi"
          ),
          (match) => fileName
        );

      // Determine target file name based on component type
      let targetFileName = fileName;
      if (componentType === FrontendComponentType.PAGE) {
        targetFileName = `${targetFileName}Page`;
      }

      const targetPath = path.join(
        process.cwd(),
        targetFolder,
        targetFileName,
        templateFile.targetFileName
      );
      await fs.outputFile(targetPath, content);
      createdFiles.push(targetPath);
    }

    return createdFiles;
  }

  /**
   * Gets template files for a specific component type with their contents
   * @param {ComponentType} componentType - The type of component
   * @param {string} fileName - The name of the file to use for replacements
   * @param {string} templateDir - The directory where templates are located
   * @returns {Promise<TemplateFileInfo[]>} Array of template file information with contents
   */
  public async getTemplateFilesForType(
    fileName: string,
    componentType: ComponentType | ApiType,
    projectType: ProjectType
  ): Promise<TemplateFileInfo[]> {
    const templateDir = await getDefaultTemplateDirectory(
      projectType,
      componentType
    );
    const baseFiles = this.getBaseTemplateFiles(componentType);
    const result: TemplateFileInfo[] = [];
    const formattedFileName =
      fileName.charAt(0).toUpperCase() + fileName.slice(1).toLowerCase();

    for (const file of baseFiles) {
      const targetFileName = file.replace(
        new RegExp(componentType, "gi"),
        formattedFileName
      );
      const filePath = path.join(templateDir, file);

      try {
        const content = await promisify(fs.readFile)(filePath, "utf-8");
        result.push({
          originalFileName: file,
          targetFileName,
          content,
        });
      } catch (error) {
        console.error(`Error reading template file ${filePath}:`, error);
        result.push({
          originalFileName: file,
          targetFileName,
          content: "", // Fallback empty content if file can't be read
        });
      }
    }

    return result;
  }

  public getBaseTemplateFiles(
    componentType: ComponentType | ApiType
  ): string[] {
    switch (componentType) {
      case FrontendComponentType.COMPONENT:
        return [
          `${FrontendComponentType.COMPONENT}.tsx`,
          `${FrontendComponentType.COMPONENT}.stories.tsx`,
          `${FrontendComponentType.COMPONENT}.test.tsx`,
          `${FrontendComponentType.COMPONENT}.css`,
        ];
      case FrontendComponentType.PAGE:
        return [
          `${FrontendComponentType.PAGE}.tsx`,
          `${FrontendComponentType.PAGE}.test.tsx`,
          `${FrontendComponentType.PAGE}.css`,
        ];
      case FrontendComponentType.API:
        return [`${FrontendComponentType.API}Slice.tsx`, "backendRequest.ts"];
      case ApiType.REDUX:
        return ["redux/store.tsx", "redux/storeProvider.tsx"];
      case BackendComponentType.ROUTE:
        return [
          `${BackendComponentType.ROUTE}.ts`,
          `${BackendComponentType.ROUTE}.test.ts`,
        ];
      case BackendComponentType.CONTROLLER:
        return [
          `${BackendComponentType.CONTROLLER}.ts`,
          `${BackendComponentType.CONTROLLER}.test.ts`,
        ];
      default:
        const exhaustiveCheck: any = componentType;
        throw new Error(
          `Unhandled component type for getTemplateFilesForType: ${exhaustiveCheck}`
        );
    }
  }
}

export default new TemplateService();
