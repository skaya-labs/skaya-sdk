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
}): Promise<string[]> {
    const { componentType, projectType, fileName, targetFolder } = params;
    const pascalCaseName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
    const createdFiles: string[] = [];

    // Get template files for the component type
    const templateFiles = getTemplateFilesForType(componentType);
    const templateDir = path.join(__dirname, '..', 'templates', projectType.toLowerCase(), componentType);

    // Verify template directory exists
    if (!await fs.pathExists(templateDir)) {
        throw new Error(`Template directory not found for ${projectType}/${componentType}. Please ensure template files are installed. Initialize using skaya init`);
    }

    // Create each template file
    for (const templateFile of templateFiles) {
        const sourcePath = path.join(templateDir, templateFile);
        const targetFileName = templateFile.replace(new RegExp(componentType, 'g'), fileName.toLowerCase());
        const targetPath = path.join(process.cwd(), targetFolder,fileName, targetFileName);

        if (!await fs.pathExists(sourcePath)) {
            throw new Error(`Template file ${templateFile} not found in ${templateDir}`);
        }

        // Read and process template file
        let content = await fs.readFile(sourcePath, 'utf-8');
        
        // Replace placeholders in the template
        content = content.replace(/{{name}}/g, fileName)
                        .replace(/{{Name}}/g, pascalCaseName)
                        .replace(/{{NAME}}/g, fileName.toUpperCase());

        await fs.outputFile(targetPath, content);
        createdFiles.push(targetPath);
    }

    return createdFiles;
}

/**
 * Gets template files for a specific component type
 * @param {ComponentType} componentType - The type of component
 * @returns {string[]} Array of template file names
 */
export function getTemplateFilesForType(componentType: ComponentType): string[] {
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
            const exhaustiveCheck: any = componentType;
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