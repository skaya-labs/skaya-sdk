/**
 * @file Template generation utilities
 * @module scripts/template
 * @version 1.0.0
 * @license MIT
 */

import fs from "fs-extra";
import path from "path";
import { ApiType, BackendComponentType, ComponentType, FrontendComponentType, ProjectType } from "../../bin/types/enums";
import { generateCodeWithAI } from "../ai/geminiCodeGenerator";
import inquirer from "inquirer";
import { promisify } from "util";
import { getDefaultFolder } from "../../bin/utils/ProjectScanner";
import { handleApiComponentType } from "./FolderCreator/FrontendFileCreator/Api";

export interface ComponentGenerationOptions {
    style: 'css' | 'scss' | 'styled-components' | 'none';
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
    importExisting?: boolean;
    componentsToImport?: { name: string, data: string }[]
}): Promise<string[]> {
    let { componentType, projectType, fileName } = params;
    let targetFolder = params.targetFolder || await getDefaultFolder(projectType, componentType);
    
    // !important = Handle API component type separately

    if (componentType === FrontendComponentType.API) {
        return handleApiComponentType(projectType, targetFolder, fileName);
    }

    const templateDir = path.join(__dirname, '..', 'templates', projectType.toLowerCase(), componentType);
    if (!await fs.pathExists(templateDir)) {
        throw new Error(`Template directory not found for ${projectType}/${componentType}. ✅ Initialize using skaya init.`);
    }

    // todo: and existing import to getTemplateFilesFor Type
    
    let templateFiles = await getTemplateFilesForType(componentType, fileName, templateDir);
       const answers = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'useAI',
            message: 'Use AI to generate the component?',
            default: true
        }
    ]);
    if(answers.useAI) {
        templateFiles = await generateWithAI({
            fileName,
            projectType,
            componentType,
            templateFiles,
            importExisting: params.importExisting,
            componentsToImport: params.componentsToImport
        });
    }

    return saveTemplateFiles({
        templateFiles,
        fileName,
        targetFolder,
        componentType
    });
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
    componentsToImport?: { name: string, data: string }[];
}): Promise<TemplateFileInfo[]> {
    const { fileName, projectType, componentType, templateFiles } = params;
    const pascalCaseName = fileName.charAt(0).toUpperCase() + fileName.slice(1).toLowerCase();
    
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'description',
            message: 'Enter AI Prompt on how the files and code should work:',
            default: ''
        },
    ]);
    
    const aiDescription = answers.description || '';
    const options: ComponentGenerationOptions = {
        style: 'css',
        typescript: true,
        withProps: true,
        withState: false,
        withEffects: false,
        withTests: true,
        withStories: projectType === ProjectType.FRONTEND
    };

    const aiResult = await generateCodeWithAI(
        pascalCaseName,
        projectType,
        componentType,
        aiDescription,
        options,
        templateFiles,
        {
            importExisting: params.importExisting,
            componentsToImport: params.componentsToImport || []
        }
    );

    return aiResult.map(file => ({
        ...file,
    }));
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
async function saveTemplateFiles(params: {
    templateFiles: TemplateFileInfo[];
    fileName: string;
    targetFolder: string;
    componentType: ComponentType | ApiType;
}): Promise<string[]> {
    const { templateFiles, fileName, targetFolder, componentType } = params;
    const createdFiles: string[] = [];

    for (const templateFile of templateFiles) {
        let content = templateFile.content;
        if (!content) continue; // Skip if no content provided

        // Handle the special Storybook 'component: Component' case
        content = content.replace(/component: Component/g, `component: ${fileName}`);

        // Do general replacements
        content = content
            .replace(/{{component}}/g, fileName.toLowerCase())
            .replace(/{{Component}}/g, fileName)
            .replace(/{{COMPONENT}}/g, fileName.toUpperCase())
            .replace(
                new RegExp(`(?<!React\\.)(\\b|_)${componentType}(?![:])(\\b|_)`, 'gi'),
                (match) => fileName
            );

        // Determine target file name based on component type
        let targetFileName = fileName;
        if (componentType === FrontendComponentType.PAGE) {
            targetFileName = `${targetFileName}Page`;
        }
        
        const targetPath = path.join(process.cwd(), targetFolder, targetFileName, templateFile.targetFileName);
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
export async function getTemplateFilesForType(
    componentType: ComponentType | ApiType,
    fileName: string,
    templateDir: string
): Promise<TemplateFileInfo[]> {
    const baseFiles = getBaseTemplateFiles(componentType);
    const result: TemplateFileInfo[] = [];
    const formattedFileName = fileName.charAt(0).toUpperCase() + fileName.slice(1).toLowerCase();

    for (const file of baseFiles) {
        const targetFileName = file.replace(new RegExp(componentType, 'gi'), formattedFileName);
        const filePath = path.join(templateDir, file);

        try {
            const content = await promisify(fs.readFile)(filePath, 'utf-8');
            result.push({
                originalFileName: file,
                targetFileName,
                content
            });
        } catch (error) {
            console.error(`Error reading template file ${filePath}:`, error);
            result.push({
                originalFileName: file,
                targetFileName,
                content: '' // Fallback empty content if file can't be read
            });
        }
    }

    return result;
}

export function getBaseTemplateFiles(componentType: ComponentType | ApiType): string[] {
    switch (componentType) {
        case FrontendComponentType.COMPONENT:
            return [
                `${FrontendComponentType.COMPONENT}.tsx`,
                `${FrontendComponentType.COMPONENT}.stories.tsx`,
                `${FrontendComponentType.COMPONENT}.test.tsx`,
                `${FrontendComponentType.COMPONENT}.css`
            ];
        case FrontendComponentType.PAGE:
            return [
                `${FrontendComponentType.PAGE}.tsx`,
                `${FrontendComponentType.PAGE}.test.tsx`,
                `${FrontendComponentType.PAGE}.css`
            ];
        case FrontendComponentType.API:
            return [`${FrontendComponentType.API}Slice.tsx`];
        case ApiType.REDUX:
            return [`${ApiType.REDUX}.tsx`, 'store.tsx', 'storeProvider.tsx'];
        case BackendComponentType.ROUTE:
            return [
                `${BackendComponentType.ROUTE}.ts`,
                `${BackendComponentType.ROUTE}.test.ts`
            ];
        case BackendComponentType.CONTROLLER:
            return [
                `${BackendComponentType.CONTROLLER}.ts`,
                `${BackendComponentType.CONTROLLER}.test.ts`
            ];
        default:
            const exhaustiveCheck: any = componentType;
            throw new Error(`Unhandled component type for getTemplateFilesForType: ${exhaustiveCheck}`);
    }
}