/**
 * @file Project scaffolding actions
 * @module action
 * @version 1.0.0
 * @license MIT
 */

import fs from "fs-extra";
import path from "path";
import { ProjectType } from "../bin/types/enums"; // Ensure ComponentType is imported
import { ICreateComponentParams } from "../bin/types/interfaces";
import inquirer from "inquirer";
import {
  saveProjectComponentConfig,
  saveProjectConfig,
  updateComponentReferences,
  getProjectComponentConfig, 
  ComponentConfig, 
  readConfig,
  Config,
  ProjectConfig
} from "../bin/utils/configLogger";
import { generateFromTemplate } from "./scripts/templateGenerator";
import TemplateService from "./services/TemplateService";
import { getDefaultFolderForComponentType } from "../bin/utils/ProjectScanner";
import { execa } from 'execa';

/**
 * Creates a new project scaffold
 * @param {ProjectType} projectType - The type of project to create
 */
export async function createProject(projectType: ProjectType): Promise<void> {
  // Prompt for project folder name
  const { folder } = await inquirer.prompt([
    {
      type: "input",
      name: "folder",
      message: `Enter ${projectType} project folder name:`,
      default: `${projectType}SkayaProject`, // default folder name
    },
  ]);

  // todo: Add for backend and blockchain components

  if (
    projectType === ProjectType.BACKEND ||
    projectType === ProjectType.BLOCKCHAIN
  ) {
    console.log(`⚠️  ${projectType} component creation is coming soon!`);
    return;
  }
  const targetPath = path.join(process.cwd(), folder); // !important: Using process.cwd() to ensure correct path resolution only while creating project

  if (await fs.pathExists(targetPath)) {
    throw new Error(`Folder ${folder} already exists.`);
  }

  await fs.ensureDir(targetPath);

  // Create basic project structure based on type
  const { templateType, customRepo } =
    await TemplateService.promptTemplateSelection(projectType);
  await TemplateService.cloneTemplate(
    templateType,
    customRepo,
    targetPath,
    projectType
  );
  await saveProjectConfig(projectType, folder, templateType);

  console.log(`✅ ${projectType} project initialized in ${folder}`);
}

/**
 * Creates a new component file with optional AI generation
 * @param {ICreateComponentParams} params - Component creation parameters
 */
export async function createFile(
  params: ICreateComponentParams
): Promise<void> {
  const { componentType, projectType, fileName } = params;
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "folder",
      message: `Enter the folder where you want to create the ${componentType} for ${fileName}:`,
      default: await getDefaultFolderForComponentType(
        projectType,
        componentType
      ),
    },
  ]);

  // todo: Add for backend and blockchain components
  if (
    projectType === ProjectType.BACKEND ||
    projectType === ProjectType.BLOCKCHAIN
  ) {
    console.log(`⚠️  ${projectType} component creation is coming soon!`);
    return;
  }

  const targetFolder = answers.folder;

  const { createdFiles, aiDescription, imports } = await generateFromTemplate({
    projectType,
    componentType,
    fileName,
    targetFolder,
  });

  await saveProjectComponentConfig(projectType, componentType, fileName, {
    source: aiDescription ? 'ai' : 'template',
    files: createdFiles,
    ...(aiDescription && { aiPrompt: aiDescription }),
    ...(imports && { imports }) // Save imports if they exist
  });

  for (const filePath of createdFiles) {
    console.log(`✅ ${componentType} file created at ${filePath}`);
  }
}

/**
 * Updates an existing component file
 * @param {ICreateComponentParams} params - Component update parameters
 */
export async function updateFile(params: ICreateComponentParams): Promise<void> {
  const { componentType, projectType, fileName } = params;

  // Get the default folder for this component type
  const targetFolder = await getDefaultFolderForComponentType(
    projectType,
    componentType
  );
  const componentPath = path.join(process.cwd(), targetFolder, fileName);

  // Verify the component exists
  if (!(await fs.pathExists(componentPath))) {
    throw new Error(`Component ${fileName} not found at ${componentPath}`);
  }

  if (projectType === ProjectType.BACKEND || projectType === ProjectType.BLOCKCHAIN) {
    console.log(`⚠️  ${projectType} component update is coming soon!`);
    return;
  }

  // Load existing config first
  const existingConfig = await getProjectComponentConfig(projectType, fileName);
  if (!existingConfig) {
    throw new Error(`Configuration not found for component ${fileName}. Cannot update.`);
  }

  // !dev Use updateExistingTemplateFiles: true or not
  const { createdFiles, aiDescription, imports } = await generateFromTemplate({
    projectType,
    componentType,
    fileName,
    targetFolder,
    updateExistingTemplateFiles: true
  });

  // Prepare the update data by merging with existing config
  const updateData: Partial<ComponentConfig> = {
    ...existingConfig, // Keep all existing config properties
    files: createdFiles, // Update files list
    ...(aiDescription && { aiPrompt: aiDescription }), // Update AI prompt if exists
    imports: imports || existingConfig.imports, // Use new imports or keep existing
    updatedAt: new Date().toISOString() // Add update timestamp
  };

  // This will update the existing config rather than create new
  await saveProjectComponentConfig(projectType, componentType, fileName, updateData);

  // Update reverse references if imports changed
  if (imports && !areImportsEqual(imports, existingConfig.imports)) {
    await updateComponentReferences(projectType, fileName, imports, existingConfig.imports);
  }

  for (const filePath of createdFiles) {
    console.log(`✅ ${componentType} file updated at ${filePath}`);
  }
}

// Helper to compare imports
function areImportsEqual(
  importsA: Array<{ name: string, data: string }> = [],
  importsB: Array<{ name: string, data: string }> = []
): boolean {
  if (importsA.length !== importsB.length) return false;

  const aNames = importsA.map(i => i.name).sort();
  const bNames = importsB.map(i => i.name).sort();

  return JSON.stringify(aNames) === JSON.stringify(bNames);
}


/**
 * Starts development environments for multiple project types
 * @param {ProjectType[]} projectTypes - Array of project types to start
 */
export async function startProjects(projectTypes: ProjectType[]): Promise<void> {
  try {
    console.log(`🚀 Starting ${projectTypes.length > 1 ? 'multiple' : ''} development environment(s)...`);

    // Read global config
    const config = await readConfig();

    // Prepare all processes
    const processes = await Promise.all(projectTypes.map(async (projectType) => {
      // Determine project directory
      let projectDir = process.cwd();
      const projectConfig = getProjectConfig(config, projectType);
      
      if (projectConfig?.name) {
        projectDir = path.join(process.cwd(), projectConfig?.name);
      } else {
        console.warn(`⚠️ No project name configured for ${projectType}. `);
        return null;
      }

      // Check if directory exists
      if (!fs.existsSync(projectDir)) {
        console.warn(`⚠️  ${projectType} project directory not found at: ${projectDir}`);
        return null;
      }

      // Read package.json
      const packageJsonPath = path.join(projectDir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        console.warn(`⚠️  No package.json found in ${projectType} project at: ${projectDir}`);
        return null;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const scripts = packageJson.scripts || {};

      // Determine available commands
      const defaultCommands: Record<ProjectType, string[]> = {
        [ProjectType.FRONTEND]: ['dev', 'start', 'serve'],
        [ProjectType.BACKEND]: ['start:dev', 'dev', 'start'],
        [ProjectType.BLOCKCHAIN]: ['node', 'start', 'dev']
      };

      // Find available scripts
      const availableCommands = defaultCommands[projectType].filter(cmd => scripts[cmd]);

      if (availableCommands.length === 0) {
        console.warn(`⚠️  No recognized scripts found in ${projectType} project package.json`);
        return null;
      }

      // Let user select which command to run if multiple available
      let selectedCommand = availableCommands[0];
      if (availableCommands.length > 1) {
        const { command } = await inquirer.prompt([
          {
            type: 'list',
            name: 'command',
            message: `Select command to run for ${projectType}:`,
            choices: availableCommands.map(cmd => ({
              name: `${cmd} (${scripts[cmd]})`,
              value: cmd
            }))
          }
        ]);
        selectedCommand = command;
      }

      console.log(`🏃 Starting ${projectType} with: npm run ${selectedCommand}`);
      return execa('npm', ['run', selectedCommand], {
        cwd: projectDir,
        stdio: 'inherit',
        shell: true
      });
    }));

    // Filter out null values (failed projects)
    const validProcesses = processes.filter(p => p !== null) as unknown[];

    if (validProcesses.length === 0) {
      console.error('❌ No valid projects to start');
      return;
    }

    // Wait for all processes
    await Promise.all(validProcesses);
    
  } catch (error) {
    console.error(`❌ Failed to start projects:`);
    throw error;
  }
}

/**
 * Helper function to get project config based on project type
 */
function getProjectConfig(config: Config, projectType: ProjectType): ProjectConfig | undefined {
  switch (projectType) {
    case ProjectType.FRONTEND:
      return config.frontend;
    case ProjectType.BACKEND:
      return config.backend;
    case ProjectType.BLOCKCHAIN:
      return config.blockchain;
    default:
      return undefined;
  }
}

/**
 * Installs components for specified project types
 * @param {ProjectType[]} projectTypes - Array of project types to install components for
 */
export async function installComponents(projectTypes: ProjectType[]): Promise<void> {
  try {
    console.log(`📦 Installing dependencies for: ${projectTypes.join(', ')}`);
    
    // Read global config first
    const config = await readConfig();
    const results: Record<string, boolean> = {};
    
    for (const projectType of projectTypes) {
      try {
        console.log(`\n🔧 Starting ${projectType} installation...`);
        
        // Get project directory from config
        let projectDir = process.cwd();
        const projectConfig = getProjectConfig(config, projectType);
        
        if (projectConfig?.name) {
          projectDir = path.join(process.cwd(), projectConfig.name);
        } else if (projectType !== ProjectType.FRONTEND) {
          console.warn(`⚠️ No project name configured for ${projectType}. Using current directory.`);
        }

        // Verify project directory exists
        if (!fs.existsSync(projectDir)) {
          throw new Error(`Project directory not found: ${projectDir}`);
        }

        // Check for package.json
        const packageJsonPath = path.join(projectDir, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
          throw new Error(`No package.json found in ${projectDir}`);
        }

        console.log(`Running npm install in directory: ${projectDir}`);

        // Execute installation
        await execa('npm', ['install'], {
          stdio: 'inherit',
          cwd: projectDir,
          shell: true
        });
        
        results[projectType] = true;
        console.log(`✅ ${projectType} dependencies installed successfully`);
      } catch (error) {
        results[projectType] = false;
        console.error(`❌ Failed to install ${projectType} dependencies:`, error);
      }
    }
    
    // Print summary
    console.log('\n📊 Installation Summary:');
    for (const [type, success] of Object.entries(results)) {
      console.log(`  ${type}: ${success ? '✅ Success' : '❌ Failed'}`);
    }
    
    // Throw error if any installations failed
    if (Object.values(results).some(success => !success)) {
      throw new Error('Some installations failed');
    }
  } catch (error) {
    console.error('❌ Installation failed:');
    throw error;
  }
}