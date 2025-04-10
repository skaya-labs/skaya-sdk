/**
 * @file Project scaffolding actions
 * @module action
 * @version 2.0.0
 * @license MIT
 */

import fs from "fs-extra";
import path from "path";
import { ApiType, FrontendComponentType, ProjectType } from "../bin/types/enums";
import { ApiEndpointConfig, ICreateComponentParams } from "../bin/types/interfaces";
import inquirer from "inquirer";
import { saveProjectConfig } from "../bin/utils/configLogger";
import { generateFromTemplate, getDefaultFolder as getTemplateDefaultFolder } from "./scripts/templateGenerator";
import TemplateService from "./services/TemplateService";
import { scanExistingComponents } from "../bin/utils/ProjectScanner";
import { askApiEndpointConfig } from "./services/ApiTemplateService";

/**
 * Creates a new project scaffold
 * @param {ProjectType} projectType - The type of project to create
 */
export async function createProject(projectType: ProjectType): Promise<void> {
    const defaultFolder = projectType === ProjectType.FRONTEND
        ? "frontend-app"
        : "backend-app";

    const { folder } = await inquirer.prompt([
        {
            type: "input",
            name: "folder",
            message: `Enter ${projectType} project folder name:`,
            default: defaultFolder,
        },
    ]);

    await saveProjectConfig(projectType.toLowerCase() as 'frontend' | 'backend', folder);

    const targetPath = path.join(process.cwd(), folder);

    if (await fs.pathExists(targetPath)) {
        throw new Error(`Folder ${folder} already exists.`);
    }

    await fs.ensureDir(targetPath);

    // Create basic project structure based on type
    const { templateType, customRepo } = await TemplateService.promptTemplateSelection(projectType);
    await TemplateService.cloneTemplate(templateType, customRepo, targetPath,projectType);
    console.log(`✅ ${projectType} project initialized in ${folder}`);
}


/**
 * Creates a new component file with optional AI generation
 * @param {ICreateComponentParams} params - Component creation parameters
 */
export async function createFile(params: ICreateComponentParams): Promise<void> {
    const { componentType, projectType, fileName } = params;
    
        // Add API type selection for frontend API components
        let apiType: ApiType;
        let apiConfig: ApiEndpointConfig;
        let componentTypeConfig;
        if (projectType === ProjectType.FRONTEND && componentType === FrontendComponentType.API) {
            const { selectedApiType } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selectedApiType',
                    message: 'Select API type:',
                    choices: [
                        { name: 'API with Redux', value: ApiType.REDUX },
                        { name: 'API without Redux', value: ApiType.WITHOUT_REDUX }
                    ],
                }
            ]);
            apiType = selectedApiType;
            apiConfig = await askApiEndpointConfig();
            componentTypeConfig={
                apiType,
                apiConfig
            }
        }

    const defaultFolder = await getTemplateDefaultFolder(projectType, componentType);

    // Scan for existing components
    const existingComponents = await scanExistingComponents(componentType);
    let importExisting = false;
    let componentsToImport: string[] = [];

    if (existingComponents && existingComponents.length > 0 && projectType === ProjectType.FRONTEND && componentType !== FrontendComponentType.API) {
        const { shouldImport } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'shouldImport',
                message: `Would you like to import existing ${componentType} components?`,
                default: false
            }
        ]);

        if (shouldImport) {
            const { selectedComponents } = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'selectedComponents',
                    message: `Use spacebar to select one or more ${componentType} components:`,
                    choices: existingComponents.map((name: any) => ({ name, value: name })),
                    pageSize: 10 // Optional: shows more at once in terminal
                }
            ]);

            componentsToImport = selectedComponents;
            importExisting = componentsToImport.length > 0;

            console.log(`\n🧩 Selected components: ${componentsToImport.join(', ')}`);
        }
    }

    const answers = await inquirer.prompt([
        {
            type: "input",
            name: "folder",
            message: `Enter the folder where you want to create the ${componentType}:`,
            default: defaultFolder,
        }
    ]);

    const finalFileName = fileName;
    const targetFolder = answers.folder;
    const filePaths = await generateFromTemplate({
        componentType,
        projectType,
        fileName: finalFileName,
        targetFolder,
        importExisting,
        componentsToImport,
        componentTypeConfig: componentTypeConfig || { apiType: ApiType.WITHOUT_REDUX, apiConfig: {} as ApiEndpointConfig }
    });

    for (const filePath of filePaths) {
        console.log(`✅ ${componentType} file created at ${filePath}`);
    }

    if (importExisting) {
        console.log(`♻️  Imported existing ${componentType} components: ${componentsToImport.join(', ')}`);
    }
}