/**
 * @file Project scaffolding actions
 * @module action
 * @version 2.0.0
 * @license MIT
 */

import fs from "fs-extra";
import path from "path";
import { ProjectType } from "../bin/types/enums";
import { ICreateComponentParams } from "../bin/types/interfaces";
import inquirer from "inquirer";
import FrontendTemplateService from "./services/frontend/TemplateService";
import BackendTemplateService from "./services/backend/TemplateService";
import { saveProjectConfig } from "../bin/utils/configLogger";
import { generateFromTemplate, getDefaultFolder as getTemplateDefaultFolder } from "./scripts/templateGenerator";

/**
 * Creates a new project scaffold
 * @param {ProjectType} type - The type of project to create
 */
export async function createProject(type: ProjectType): Promise<void> {
    const defaultFolder = type === ProjectType.FRONTEND
        ? "frontend-app"
        : "backend-app";

    const { folder } = await inquirer.prompt([
        {
            type: "input",
            name: "folder",
            message: `Enter ${type} project folder name:`,
            default: defaultFolder,
        },
    ]);

    await saveProjectConfig(type.toLowerCase() as 'frontend' | 'backend', folder);

    const targetPath = path.join(process.cwd(), folder);

    if (await fs.pathExists(targetPath)) {
        throw new Error(`Folder ${folder} already exists.`);
    }

    await fs.ensureDir(targetPath);

    // Create basic project structure based on type
    if (type === ProjectType.FRONTEND) {
        const { templateType, customRepo } = await FrontendTemplateService.promptTemplateSelection();
        await FrontendTemplateService.cloneTemplate(templateType, customRepo, targetPath);
    } else {
        const { templateType, customRepo } = await BackendTemplateService.promptTemplateSelection();
        await BackendTemplateService.cloneTemplate(templateType, customRepo, targetPath);
    }

    console.log(`✅ ${type} project initialized in ${folder}`);
}


/**
 * Creates a new component file with optional AI generation
 * @param {ICreateComponentParams} params - Component creation parameters
 */
export async function createFile(params: ICreateComponentParams): Promise<void> {
    const { componentType, projectType, fileName, ai, description } = params;
    
    const defaultFolder = await getTemplateDefaultFolder(projectType, componentType);

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
        ai,
        description
    });

    for (const filePath of filePaths) {
        console.log(`✅ ${componentType} file created at ${filePath}`);
    }
}