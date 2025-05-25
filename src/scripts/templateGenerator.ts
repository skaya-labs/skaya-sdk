/**
 * @file Template generation utilities
 * @module scripts/template
 * @version 1.0.0
 * @license MIT
 */

import fs from "fs-extra";
import path from "path";
import { ApiType, BackendComponentType, ComponentType, FrontendComponentType, ProjectType } from "../../bin/types/enums";
import { readConfig } from "../../bin/utils/configLogger";
import { generateCodeWithAI } from "../ai/geminiCodeGenerator";
import inquirer from "inquirer";
import { ApiEndpointConfig } from "../../bin/types/interfaces";
import { handleApiComponentType } from "../services/ApiTemplateService";
import { promisify } from "util";

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
    componentType: ComponentType | ApiType;
    projectType: ProjectType;
    fileName: string;
    targetFolder: string;
    importExisting?: boolean;
    componentsToImport?: {name: string, data: string}[]
    componentTypeConfig: {
        apiType: ApiType
        apiConfig: ApiEndpointConfig
    }

}): Promise<string[]> {
    let { componentType, projectType, fileName, targetFolder, componentTypeConfig } = params;
    // Handle API component type separately
    const pascalCaseName = fileName.charAt(0).toUpperCase() + fileName.slice(1).toLowerCase();
    const createdFiles: string[] = [];
    let templateDir = path.join(__dirname, '..', 'templates', projectType.toLowerCase(), componentType);

    if (componentType === FrontendComponentType.API && componentTypeConfig.apiType == ApiType.REDUX) {
        // Check if Redux store files already exist
        const config = await readConfig();
        if (config?.frontend) {
            const reduxStorePath = path.join(process.cwd(), config.frontend, 'src', `APIs`, componentTypeConfig.apiType);
            const storeFilePath = path.join(reduxStorePath, 'store.tsx');
            const storeProviderPath = path.join(reduxStorePath, 'storeProvider.tsx');

            try {
                // Check if store files exist
                const storeExists = await fs.pathExists(storeFilePath);
                const providerExists = await fs.pathExists(storeProviderPath);
                const templateDirReduc = path.join(__dirname, '..', 'templates', projectType.toLowerCase(), componentType, componentTypeConfig.apiType);

                if (!storeExists || !providerExists) {
                    console.log("store doesn't exist creating one");

                    // Create the store directory if it doesn't exist
                    await fs.ensureDir(reduxStorePath);

                    // Get base template files for Redux store initialization
                    const baseFiles = getBaseTemplateFiles(ApiType.REDUX);

                    for (const file of baseFiles) {
                        const sourcePath = path.join(templateDirReduc, file);
                        const targetPath = path.join(targetFolder, file);  // Create target path with filename

                        if (await fs.pathExists(sourcePath)) {
                            let content = await fs.readFile(sourcePath, 'utf-8');
                            await fs.outputFile(targetPath, content);  // Use targetPath instead of targetFolder
                            createdFiles.push(targetPath);
                        }
                    }
                }
            } catch (error) {
                console.error("❌ Error checking/initializing Redux store:", error);
            }
        }
        await handleApiComponentType(componentTypeConfig.apiConfig, componentTypeConfig.apiType, projectType, targetFolder, fileName);
        targetFolder = `${targetFolder}/reduxSlices`
    }
    else if (componentType === FrontendComponentType.API) {
        return handleApiComponentType(componentTypeConfig.apiConfig, componentTypeConfig.apiType, projectType, targetFolder, fileName);
    }

    if (!await fs.pathExists(templateDir)) {
        throw new Error(`Template directory not found for ${projectType}/${componentType}. ✅ Initialize using skaya init.`);
    }

    let templateFiles = await getTemplateFilesForType(componentType, fileName, templateDir);
    let aiDescription = ""
    const answers = await inquirer.prompt([

        {
            type: 'confirm',
            name: 'useAI',
            message: 'Use AI to generate the component?',
            default: true
        }
    ]);
    if (answers.useAI) {

        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'description',
                message: 'Enter Ai Prompt on how the files and code should work:',
                when: () => !aiDescription,
                default: ''
            },
        ]);
        aiDescription = aiDescription || answers.description || '';

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
            aiDescription,
            options,
            templateFiles,
            {
                importExisting: params.importExisting,
                componentsToImport: params.componentsToImport || []
            }
        );

        templateFiles = aiResult.map(file => ({
            ...file,
            targetFileName: file.targetFileName.replace(
                new RegExp(fileName, 'gi'),
                (match) => match.charAt(0).toUpperCase() + match.slice(1).toLowerCase()
            )
        }));
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

        // Handle the special Storybook 'component: Component' case
        content = content.replace(/component: Component/g, `component: ${pascalCaseName}`);

        // Do general replacements
        content = content
            .replace(/{{component}}/g, fileName.toLowerCase()) // 'newpage2'
            .replace(/{{Component}}/g, pascalCaseName) // 'NewPage2'
            .replace(/{{COMPONENT}}/g, fileName.toUpperCase()) // 'NEWPAGE2'

            // Replace component type references (page -> NewPage2)
            .replace(
                new RegExp(`(?<!React\\.)(\\b|_)${componentType}(?![:])(\\b|_)`, 'gi'),
                (match) => {
                    return pascalCaseName;
                }
            )

        // Inject additional imports if needed
        if (params.componentsToImport?.length) {
            // const importStatements = params.componentsToImport.map(comp =>
            //     `import ${comp} from "@/components/${comp.name}";`
            // ).join('\n');

            // Prepend imports only if file is .tsx or .ts
            if (templateFile.targetFileName.endsWith('.tsx') || templateFile.targetFileName.endsWith('.ts')) {
                content = `${content}`;
                // content = `${importStatements}\n\n${content}`;
            }
        }
        // Determine target file name based on component type
        let targetFileName = pascalCaseName
        if (componentType === FrontendComponentType.PAGE) {
            targetFileName = `${targetFileName}Page`
        }
        const targetPath = path.join(process.cwd(), targetFolder, targetFileName, templateFile.targetFileName);
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


const readFile = promisify(fs.readFile);

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

    // Capitalize first letter, lowercase the rest
    const formattedFileName = fileName.charAt(0).toUpperCase() + fileName.slice(1).toLowerCase();

    for (const file of baseFiles) {
        const targetFileName = file.replace(new RegExp(componentType, 'gi'), formattedFileName);
        const filePath = path.join(templateDir, file);

        try {
            const content = await readFile(filePath, 'utf-8');
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



function getBaseTemplateFiles(componentType: ComponentType | ApiType): string[] {
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
        case FrontendComponentType.API:
            return [`${FrontendComponentType.API}Slice.tsx`,]
        case ApiType.REDUX:
            return [`${ApiType.REDUX}.tsx`, 'store.tsx', 'storeProvider.tsx']
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
        console.error("Frontend project type specified, but no 'frontend' config found. ✅ Initialize a frontend project with skaya init.");
    }

    if (projectType === ProjectType.BACKEND && !config.backend) {
        console.error("Backend project type specified, but no 'backend' config found. ✅ Initialize a frontend project with skaya init.");
    }

    // Set baseSrcPath based on projectType
    const baseSrcPath = projectType === ProjectType.FRONTEND
        ? `${config.frontend}/src`
        : `${config.backend}/src`;

    // Resolve folder path based on projectType and componentType

    switch (componentType) {
        case FrontendComponentType.PAGE:
            return `${baseSrcPath}/pages`;
        case FrontendComponentType.COMPONENT:
            return `${baseSrcPath}/components`;
        case FrontendComponentType.API:
            return `${baseSrcPath}/APIs`;
        case BackendComponentType.ROUTE:
            return `${baseSrcPath}/routes`;
        case BackendComponentType.CONTROLLER:
            return `${baseSrcPath}/${BackendComponentType.CONTROLLER}s`;
        default:
            return baseSrcPath;
    }
}