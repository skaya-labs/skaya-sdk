/**
 * @file Template generation utilities
 * @module scripts/template
 * @version 1.0.0
 * @license MIT
 */

import fs from "fs-extra";
import {
  ApiType,
  ComponentType,
  FrontendComponentType,
  ProjectType,
} from "../../bin/types/enums";
import { generateCodeWithAI } from "../ai/geminiCodeGenerator";
import inquirer from "inquirer";
import { getDefaultFolderForComponentType, getDefaultTemplateDirectory } from "../../bin/utils/ProjectScanner";
import { handleApiComponentType } from "./FolderCreator/FrontendFileCreator/Api";
import TemplateService from "../services/TemplateService";
import { handleComponentImport } from "./FolderCreator/HandleImport";
import { logComponentCreation, saveProjectComponentConfig } from "../../bin/utils/configLogger";

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
 * @param {ProjectType} params.projectType - The project type (frontend/backend/blockchain)
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
    params.targetFolder || (await getDefaultFolderForComponentType(projectType, componentType));

  // !important = Handle API component type separately
  if (componentType === FrontendComponentType.API) {
    // API component generation is handled in a separate function, so we'll log and save config after it completes
    const createdFiles = await handleApiComponentType(projectType,componentType, targetFolder, fileName);
    // Log component creation
    for (const file of createdFiles) {
        await logComponentCreation({
            componentType:componentType,
            projectType: projectType,
            fileName: file,
            description: `Generated API component using template.`
        });
    }
    // Save component configuration
    await saveProjectComponentConfig(projectType, componentType, fileName, {
        source: 'template',
        files: createdFiles,
    });
    return createdFiles;
  }

  const templateDir = getDefaultTemplateDirectory(projectType, componentType);
  
  if (!(await fs.pathExists(templateDir))) {
    throw new Error(
      `Template directory not found for ${projectType}/${componentType}. ✅ Initialize using skaya init.`
    );
  }

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

  let createdFiles: string[] = [];
  let aiDescription = ''; // Declare aiDescription here

  if (answers.useAI) {
    const importResult = await handleComponentImport(
      projectType,
      componentType
    );
    const importExisting = importResult.importExisting;
    const componentsToImport = importResult.componentsToImport;

    // Call generateWithAI, which will now return the user's prompt as well
    const aiGenerationResult = await generateWithAI({
      fileName,
      projectType,
      componentType,
      templateFiles,
      importExisting: importExisting,
      componentsToImport: componentsToImport,
    });
    
    // Unpack the prompt and the files from the result
    templateFiles = aiGenerationResult.files;
    aiDescription = aiGenerationResult.description;

    createdFiles = await TemplateService.saveTemplateFiles({
        templateFiles, // Use AI-generated files (or original templates on error)
        fileName,
        targetFolder,
        componentType,
    });
    
    // Log and save config for AI-generated components
    for (const file of createdFiles) {
        await logComponentCreation({
            componentType: componentType as ComponentType,
            projectType: projectType,
            fileName: file,
            description: `Generated component using AI.`
        });
    }
    await saveProjectComponentConfig(projectType, componentType as ComponentType, fileName, {
        source: 'ai-generated',
        files: createdFiles,
        aiPrompt: aiDescription, // Save the AI prompt here!
    });

  } else {
      // If AI is not used, save the template files directly
      createdFiles = await TemplateService.saveTemplateFiles({
          templateFiles,
          fileName,
          targetFolder,
          componentType,
      });

      // Log and save config for template-generated components
      for (const file of createdFiles) {
          await logComponentCreation({
              componentType: componentType as ComponentType,
              projectType: projectType,
              fileName: file,
              description: `Generated component from template.`
          });
      }
      await saveProjectComponentConfig(projectType, componentType as ComponentType, fileName, {
          source: 'template',
          files: createdFiles,
      });
  }

  return createdFiles;
}

/**
 * Generates component files using AI and returns the files and the user's prompt.
 * @param {Object} params - Generation parameters
 * @param {string} params.fileName - The base name for the component
 * @param {ProjectType} params.projectType - The project type (frontend/backend)
 * @param {ComponentType} params.componentType - The type of component to generate
 * @param {TemplateFileInfo[]} params.templateFiles - Template files information
 * @param {boolean} params.importExisting - Whether to import existing components
 * @param {Array} params.componentsToImport - Components to import
 * @returns {Promise<{ files: TemplateFileInfo[], description: string }>} A promise that resolves to an object containing the generated files and the user's prompt.
 */
async function generateWithAI(params: {
  fileName: string;
  projectType: ProjectType;
  componentType: ComponentType | ApiType;
  templateFiles: TemplateFileInfo[];
  importExisting?: boolean;
  componentsToImport?: { name: string; data: string }[];
}): Promise<{ files: TemplateFileInfo[], description: string }> {
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

  try {
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
    
    // Check if any file has empty content (which would indicate generation failed)
    const hasEmptyContent = aiResult.some(file => !file.content || file.content.trim() === '');
    if (hasEmptyContent) {
      console.error('AI generation failed for some files, returning template files');
      return { files: templateFiles, description: aiDescription }; // Return original templates and the prompt
    }
    
    return {
      files: aiResult.map((file) => ({ ...file })),
      description: aiDescription, // Return the prompt
    };
  } catch (error) {
    console.error('Error generating with AI:', error);
    return { files: templateFiles, description: aiDescription }; // Return original template files and the prompt on error
  }
}