/**
 * @file Template generation utilities
 * @module scripts/template
 * @version 1.0.0
 * @license MIT
 */

import fs from "fs-extra";
import path from "path";
import {
  ApiType,
  BackendComponentType,
  ComponentType,
  FrontendComponentType,
  ProjectType,
  SmartContractComponentType,
} from "../../bin/types/enums";
import { generateCodeWithAI } from "../ai/geminiCodeGenerator";
import inquirer from "inquirer";
import { promisify } from "util";
import { getDefaultFolder } from "../../bin/utils/ProjectScanner";
import { handleApiComponentType } from "./FolderCreator/FrontendFileCreator/Api";
import { handleFrontendComponentImport } from "./FolderCreator/FrontendFileCreator";
import { handleBackendComponentImport } from "./FolderCreator/BackendFileCreator";
import { handleSmartContractComponentImport } from "./FolderCreator/ContractFileCreator";
import TemplateService from "../services/TemplateService";

export interface ComponentGenerationOptions {
  style: "css" | "scss" | "styled-components" | "none";
  typescript: boolean;
  withProps?: boolean;
  withState?: boolean;
  withEffects?: boolean;
  withTests?: boolean;
  withStories?: boolean;
}

export interface TemplateFileInfo {
  originalFileName: string;
  targetFileName: string;
  content?: string;
}

/**
 * Generates component files from templates or AI
 * @param {Object} params - Generation parameters
 * @param {ComponentType} params.componentType - The type of component to generate
 * @param {ProjectType} params.projectType - The project type (frontend/backend)
 * @param {string} params.fileName - The base name for the component
 * @param {string} params.targetFolder - The target folder path
 * @returns {Promise<string[]>} Array of created file paths
 */
export async function generateFromTemplate(params: {
  componentType: ComponentType | ApiType;
  projectType: ProjectType;
  fileName: string;
  targetFolder?: string;
}): Promise<string[]> {
  let { componentType, projectType, fileName } = params;
  let targetFolder =
    params.targetFolder || (await getDefaultFolder(projectType, componentType));

  // !important = Handle API component type separately

  if (componentType === FrontendComponentType.API) {
    return handleApiComponentType(projectType, targetFolder, fileName);
  }

  const templateDir = path.join(
    __dirname,
    "..",
    "templates",
    projectType.toLowerCase(),
    componentType
  );
  if (!(await fs.pathExists(templateDir))) {
    throw new Error(
      `Template directory not found for ${projectType}/${componentType}. ✅ Initialize using skaya init.`
    );
  }

  // todo: add existing import to getTemplateFilesFor Type

  let templateFiles = await TemplateService.getTemplateFilesForType(
    componentType,
    fileName,
    templateDir
  );
  const answers = await inquirer.prompt([
    {
      type: "confirm",
      name: "useAI",
      message: "Use AI to generate the component?",
      default: true,
    },
  ]);
  if (answers.useAI) {
    const importResult = await handleComponentImport(
      projectType,
      componentType
    );
    const importExisting = importResult.importExisting;
    const componentsToImport = importResult.componentsToImport;

    templateFiles = await generateWithAI({
      fileName,
      projectType,
      componentType,
      templateFiles,
      importExisting: importExisting,
      componentsToImport: componentsToImport,
    });
  }

  return TemplateService.saveTemplateFiles({
    templateFiles,
    fileName,
    targetFolder,
    componentType,
  });
}

/**
 * Handles importing existing components based on project type
 * @param {ProjectType} projectType - The project type
 * @param {ComponentType} componentType - The component type
 * @returns {Promise<{importExisting: boolean, componentsToImport: {name: string, data: string}[]}>} Import results
 */
async function handleComponentImport(
  projectType: ProjectType,
  componentType: ComponentType | ApiType
): Promise<{
  importExisting: boolean;
  componentsToImport: { name: string; data: string }[];
}> {
  switch (projectType) {
    case ProjectType.FRONTEND:
      return await handleFrontendComponentImport(
        componentType as FrontendComponentType
      );
    case ProjectType.BACKEND:
      return await handleBackendComponentImport(
        componentType as BackendComponentType
      );
    case ProjectType.SMART_CONTRACT:
      return await handleSmartContractComponentImport(
        componentType as SmartContractComponentType
      );
    default:
      return { importExisting: false, componentsToImport: [] };
  }
}

/**
 * Generates component files using AI
 * @param {Object} params - Generation parameters
 * @param {string} params.fileName - The base name for the component
 * @param {ProjectType} params.projectType - The project type (frontend/backend)
 * @param {ComponentType} params.componentType - The type of component to generate
 * @param {TemplateFileInfo[]} params.templateFiles - Template files information
 * @param {boolean} params.importExisting - Whether to import existing components
 * @param {Array} params.componentsToImport - Components to import
 * @returns {Promise<TemplateFileInfo[]>} Array of template file information with AI-generated content
 */
async function generateWithAI(params: {
  fileName: string;
  projectType: ProjectType;
  componentType: ComponentType | ApiType;
  templateFiles: TemplateFileInfo[];
  importExisting?: boolean;
  componentsToImport?: { name: string; data: string }[];
}): Promise<TemplateFileInfo[]> {
  const { fileName, projectType, componentType, templateFiles } = params;

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "description",
      message: "Enter AI Prompt on how the files and code should work:",
      default: "",
    },
  ]);

  const aiDescription = answers.description || "";
  const options: ComponentGenerationOptions = {
    style: "css",
    typescript: true,
    withProps: true,
    withState: false,
    withEffects: false,
    withTests: true,
    withStories: projectType === ProjectType.FRONTEND,
  };

  const aiResult = await generateCodeWithAI(
    fileName,
    projectType,
    componentType,
    aiDescription,
    options,
    templateFiles,
    {
      importExisting: params.importExisting,
      componentsToImport: params.componentsToImport || [],
    }
  );
  return aiResult.map((file) => ({
    ...file,
  }));
}
