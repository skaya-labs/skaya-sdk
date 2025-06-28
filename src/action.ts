/**
 * @file Project scaffolding actions
 * @module action
 * @version 1.0.0
 * @license MIT
 */

import fs from "fs-extra";
import path from "path";
import { ProjectType } from "../bin/types/enums";
import { ICreateComponentParams } from "../bin/types/interfaces";
import inquirer from "inquirer";
import { saveProjectConfig } from "../bin/utils/configLogger";
import { generateFromTemplate } from "./scripts/templateGenerator";
import TemplateService from "./services/TemplateService";
import { createDefaultFolder, getDefaultFolderForComponentType } from "../bin/utils/ProjectScanner";

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
            default: await createDefaultFolder(projectType), // default folder name
        },
    ]);

    // todo: Add for backend and smart contract components

    if (projectType === ProjectType.BACKEND || projectType === ProjectType.BLOCKCHAIN) {
        console.log(`⚠️  ${projectType} component creation is coming soon!`);
        return;
    }
    const targetPath = path.join(process.cwd(), folder); // !important: Using process.cwd() to ensure correct path resolution only while creating project

    if (await fs.pathExists(targetPath)) {
        throw new Error(`Folder ${folder} already exists.`);
    }

    await fs.ensureDir(targetPath);

    // Create basic project structure based on type
    const { templateType, customRepo } = await TemplateService.promptTemplateSelection(projectType);
    await TemplateService.cloneTemplate(templateType, customRepo, targetPath, projectType);
    await saveProjectConfig(projectType, folder, templateType);

    console.log(`✅ ${projectType} project initialized in ${folder}`);
}


/**
 * Creates a new component file with optional AI generation
 * @param {ICreateComponentParams} params - Component creation parameters
 */
export async function createFile(params: ICreateComponentParams): Promise<void> {

    const { componentType, projectType, fileName } = params;
    const answers = await inquirer.prompt([
        {
            type: "input",
            name: "folder",
            message: `Enter the folder where you want to create the ${componentType} for ${fileName}:`,
            default: await getDefaultFolderForComponentType(projectType, componentType),
        }
    ]);

    // todo: Add for backend and smart contract components
    if (projectType === ProjectType.BACKEND || projectType === ProjectType.BLOCKCHAIN) {
        console.log(`⚠️  ${projectType} component creation is coming soon!`);
        return;
    }
 
    const targetFolder = answers.folder;

    const filePaths = await generateFromTemplate({
        componentType,
        projectType,
        fileName,
        targetFolder,
    });

    for (const filePath of filePaths) {
        console.log(`✅ ${componentType} file created at ${filePath}`);
    }
 
}