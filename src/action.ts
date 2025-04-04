/**
 * @file Project scaffolding actions
 * @module action
 * @version 2.0.0
 * @license MIT
 */

import fs from "fs-extra";
import path from "path";
import { BackendComponentType, ComponentType, FrontendComponentType, ProjectType } from "../bin/types/enums";
import { ICreateComponentParams } from "../bin/types/interfaces";
import inquirer from "inquirer";
import FrontendTemplateService from "./services/frontend/TemplateService";
import BackendTemplateService from "./services/backend/TemplateService";
import { detectComponentType } from "./services/projectScanner";
import { generateCodeWithAI } from "./ai/codeGenerator";
import { saveProjectConfig } from "../bin/utils/configLogger";
import { generateFromTemplate, getDefaultFolder as getTemplateDefaultFolder } from "./scripts/template";

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
    
    if (ai) {
        // Handle AI-generated components
        return await createAIComponent({
            componentType,
            projectType,
            fileName,
            ai,
            description
        });
    }

    // Handle regular component creation
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
        targetFolder
    });

    for (const filePath of filePaths) {
        console.log(`✅ ${componentType} file created at ${filePath}`);
    }
}

/**
 * Creates an AI-generated component
 */
async function createAIComponent(params: ICreateComponentParams): Promise<void> {
    const { componentType, projectType, fileName, description } = params;
    
    // Detect the appropriate folder structure
    const componentsPath = await detectComponentsFolder(process.cwd(), projectType, componentType);
    
    // Generate all files for the component
    const { files, dependencies } = await generateCodeWithAI(
        fileName,
        projectType,
        componentType,
        description,
        {
            style: "css",
            typescript: true            
        }
    );
  
    // Write all generated files
    for (const file of files) {
        const filePath = path.join(componentsPath,fileName, file.fileName);
        await fs.outputFile(filePath, file.content);
        console.log(`✓ Created ${file.fileName} at ${filePath}`);
    }
    
    // Notify about recommended dependencies
    if (dependencies.length > 0) {
        console.log('ℹ️ Additional dependencies recommended:', dependencies.join(', '));
    }
    
    console.log(`✨ AI-generated ${componentType} created successfully`);
}

// Helper function to detect components folder with project type awareness
async function detectComponentsFolder(
    basePath: string,
    projectType: ProjectType,
    componentType: string
): Promise<string> {
    const { path: detectedPath } = await detectComponentType(
        projectType,
        componentType,
        basePath
    );
    
    // Verify the folder exists or create it
    const fullPath = path.join(basePath, detectedPath);
    await fs.ensureDir(fullPath);
    
    return detectedPath;
}