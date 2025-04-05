/**
 * @file Template generation utilities
 * @module scripts/template
 * @version 1.0.0
 * @license MIT
 */

import fs from "fs-extra";
import path from "path";
import { BackendComponentType, ComponentType, FrontendComponentType, ProjectType } from "../../bin/types/enums";
import { readConfig } from "../../bin/utils/configLogger";
import { generateCodeWithAI } from "../ai/codeGenerator";

export interface ComponentGenerationOptions {
    style: 'css' | 'scss' | 'styled-components' | 'none';
    typescript: boolean;
    withProps?: boolean;
    withState?: boolean;
    withEffects?: boolean;
    withTests?: boolean;
    withStories?: boolean;
}

/**
 * Generates component files from templates
 * @param {Object} params - Generation parameters
 * @param {ComponentType} params.componentType - The type of component to generate
 * @param {ProjectType} params.projectType - The project type (frontend/backend)
 * @param {string} params.fileName - The base name for the component
 * @param {string} params.targetFolder - The target folder path
 * @returns {Promise<string[]>} Array of created file paths
 */

export async function generateFromTemplate(params: {
    componentType: ComponentType;
    projectType: ProjectType;
    fileName: string;
    targetFolder: string;
    ai: boolean;
    description?: string;
}): Promise<string[]> {
    const { componentType, projectType, fileName, targetFolder, ai, description } = params;
    const pascalCaseName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
    const createdFiles: string[] = [];

    const templateDir = path.join(__dirname, '..', 'templates', projectType.toLowerCase(), componentType);

    if (!await fs.pathExists(templateDir)) {
        throw new Error(`Template directory not found for ${projectType}/${componentType}. Initialize using skaya init.`);
    }

    let templateFiles = await getTemplateFilesForType(componentType, fileName, templateDir);

    if (ai) {
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
            fileName,
            projectType,
            componentType,
            description,
            options,
            templateFiles
        );

        templateFiles = aiResult;
    }

    for (const templateFile of templateFiles) {
        let content = templateFile.content;

        // If AI is not used, read from disk
        if (!content) {
            const sourcePath = path.join(templateDir, templateFile.originalFileName);
            if (!await fs.pathExists(sourcePath)) {
                throw new Error(`Template file ${templateFile.originalFileName} not found in ${templateDir}`);
            }
            content = await fs.readFile(sourcePath, 'utf-8');
        }

        content = content.replace(/{{name}}/g, fileName)
            .replace(/{{Name}}/g, pascalCaseName)
            .replace(/{{NAME}}/g, fileName.toUpperCase())
            .replace(new RegExp(`${componentType}`, 'g'), `${pascalCaseName}`)

        const targetPath = path.join(process.cwd(), targetFolder, pascalCaseName, templateFile.targetFileName);
        await fs.outputFile(targetPath, content);
        createdFiles.push(targetPath);
    }

    return createdFiles;
}

export interface TemplateFileInfo {
    originalFileName: string;
    targetFileName: string;
    content?: string;
}

/**
 * Gets template files for a specific component type with their contents
 * @param {ComponentType} componentType - The type of component
 * @param {string} fileName - The name of the file to use for replacements
 * @param {string} templateDir - The directory where templates are located
 * @returns {Promise<TemplateFileInfo[]>} Array of template file information
 */
export async function getTemplateFilesForType(
    componentType: ComponentType,
    fileName: string,
    templateDir: string
): Promise<TemplateFileInfo[]> {
    const baseFiles = getBaseTemplateFiles(componentType);
    const result: TemplateFileInfo[] = [];

    // Capitalize first letter, lowercase the rest
    const formattedFileName = fileName.charAt(0).toUpperCase() + fileName.slice(1).toLowerCase();

    for (const file of baseFiles) {
        const targetFileName = file.replace(new RegExp(componentType, 'gi'), formattedFileName);
        result.push({
            originalFileName: file,
            targetFileName
        });
    }

    return result;
}


function getBaseTemplateFiles(componentType: ComponentType): string[] {
    switch (componentType) {
        case FrontendComponentType.COMPONENT:
            return [`${FrontendComponentType.COMPONENT}.tsx`, 
                   `${FrontendComponentType.COMPONENT}.stories.tsx`, 
                   `${FrontendComponentType.COMPONENT}.test.tsx`, 
                   `${FrontendComponentType.COMPONENT}.css`];
        case FrontendComponentType.PAGE:
            return [`${FrontendComponentType.PAGE}.tsx`, 
                   `${FrontendComponentType.PAGE}.test.tsx`, 
                   `${FrontendComponentType.PAGE}.css`];
        case BackendComponentType.ROUTE:
            return [`${BackendComponentType.ROUTE}.ts`, 
                   `${BackendComponentType.ROUTE}.test.ts`];
        case BackendComponentType.CONTROLLER:
            return [`${BackendComponentType.CONTROLLER}.ts`, 
                   `${BackendComponentType.CONTROLLER}.test.ts`];
        default:
            const exhaustiveCheck: never = componentType;
            throw new Error(`Unhandled component type for getTemplateFilesForType: ${exhaustiveCheck}`);
    }
}

/**
 * Gets the default folder for a component type
 * @param {ProjectType} projectType - The project type (frontend/backend)
 * @param {ComponentType} componentType - The component type
 * @returns {Promise<string>} The default folder path
 */
export async function getDefaultFolder(
    projectType: ProjectType,
    componentType: FrontendComponentType | BackendComponentType
): Promise<string> {
    const config = await readConfig();

    // Check if config exists for the provided projectType
    if (!config) {
        throw new Error("Configuration not found.");
    }

    if (projectType === ProjectType.FRONTEND && !config.frontend) {
        throw new Error("Frontend project type specified, but no 'frontend' config found. Initialize a frontend project with skaya init.");
    }

    if (projectType === ProjectType.BACKEND && !config.backend) {
        throw new Error("Backend project type specified, but no 'backend' config found. Initialize a frontend project with skaya init.");
    }

    // Set baseSrcPath based on projectType
    const baseSrcPath = projectType === ProjectType.FRONTEND
        ? `${config.frontend}/src`
        : `${config.backend}/src`;

    // Resolve folder path based on projectType and componentType
    if (projectType === ProjectType.FRONTEND) {
        return componentType === FrontendComponentType.PAGE
            ? `${baseSrcPath}/${FrontendComponentType.PAGE}s`
            : `${baseSrcPath}/${FrontendComponentType.COMPONENT}s`;
    }

    switch (componentType) {
        case BackendComponentType.ROUTE:
            return `${baseSrcPath}/routes`;
        case BackendComponentType.CONTROLLER:
            return `${baseSrcPath}/${BackendComponentType.CONTROLLER}s`;
        default:
            return baseSrcPath;
    }
}