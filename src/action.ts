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
  ComponentConfig 
} from "../bin/utils/configLogger";
import { generateFromTemplate } from "./scripts/templateGenerator";
import TemplateService from "./services/TemplateService";
import { getDefaultFolderForComponentType } from "../bin/utils/ProjectScanner";

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

  // todo: Add for backend and smart contract components

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

  // todo: Add for backend and smart contract components
  if (
    projectType === ProjectType.BACKEND ||
    projectType === ProjectType.BLOCKCHAIN
  ) {
    console.log(`⚠️  ${projectType} component creation is coming soon!`);
    return;
  }

  const targetFolder = answers.folder;

  const { createdFiles, aiDescription, imports } = await generateFromTemplate({
    componentType,
    projectType,
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

  const { createdFiles, aiDescription, imports } = await generateFromTemplate({
    componentType,
    projectType,
    fileName,
    targetFolder,
    updateExisting: true
  });

  console.log("imports done",imports);
  

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