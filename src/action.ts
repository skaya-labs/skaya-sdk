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
import {generateCodeWithAI } from "./ai/codeGenerator";
import { readConfig, saveProjectConfig } from "../bin/utils/configLogger";
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

    // Create basic project structure based on type //todo use same template service
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
    const defaultFolder = await getDefaultFolder(projectType, componentType);

    const answers = await inquirer.prompt([
        {
            type: "input",
            name: "folder",
            message: `Enter the folder where you want to create the ${componentType}:`,
            default: defaultFolder,
        }
    ]);

    const finalFileName = fileName ;
    const targetFolder = answers.folder;
    const filePath = path.join(process.cwd(), targetFolder, `${finalFileName}.${getFileExtension(componentType)}`);

    if (await fs.pathExists(filePath)) {
        throw new Error(`${componentType} file "${finalFileName}" already exists in ${targetFolder}.`);
    }

    const template = generateTemplate(componentType, finalFileName);
    await fs.outputFile(filePath, template);
    console.log(`✅ ${componentType} created at ${filePath}`);
}

/**
 * Creates an AI-generated component
 */
async function createAIComponent(params: ICreateComponentParams): Promise<void> {
    const { componentType, projectType, fileName, description } = params;
    
    // Detect the appropriate folder structure
    const componentsPath = await detectComponentsFolder(process.cwd(), projectType, componentType);
    
    // Generate the component with AI
    const { code, dependencies } = await generateCodeWithAI(
        fileName,
        projectType,
        componentType as ComponentType,
        description,
        {
            style: "css",
            typescript: true            
        }
    );

    const filePath = path.join(componentsPath, `${fileName}.${getFileExtension(componentType)}`);
    await fs.outputFile(filePath, code);
    
    // Notify about recommended dependencies
    if (dependencies.length > 0) {
        console.log('ℹ️ Additional dependencies recommended:', dependencies.join(', '));
    }
    
    console.log(`✨ AI-generated ${componentType} created at ${filePath}`);
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

/**
 * Gets the default folder for a component type
 */
async function getDefaultFolder(
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
            ? `${baseSrcPath}/pages`
            : `${baseSrcPath}/components`;
    }

    switch (componentType) {
        case BackendComponentType.MIDDLEWARE:
            return `${baseSrcPath}/middlewares`;
        case BackendComponentType.ROUTE:
            return `${baseSrcPath}/routes`;
        case BackendComponentType.CONTROLLER:
            return `${baseSrcPath}/controllers`;
        default:
            return baseSrcPath;
    }
}


/**
 * Gets the appropriate file extension for a component type
 */
function getFileExtension(componentType: FrontendComponentType | BackendComponentType): string {
    return componentType === FrontendComponentType.COMPONENT
        ? "tsx"
        : "ts";
}

/**
 * Generates template content based on component type
 */
function generateTemplate(componentType: FrontendComponentType | BackendComponentType, fileName: string): string {
    const pascalCaseName = fileName.charAt(0).toUpperCase() + fileName.slice(1);

    switch (componentType) {
        case FrontendComponentType.COMPONENT:
            return `import React from 'react';\n\ninterface ${pascalCaseName}Props {}\n\nexport const ${pascalCaseName}: React.FC<${pascalCaseName}Props> = () => {\n  return (\n    <div>\n      {/* Your component JSX */}\n    </div>\n  );\n};\n`;

        case FrontendComponentType.PAGE:
            return `import React from 'react';\n\nconst ${pascalCaseName}Page = () => {\n  return (\n    <main>\n      {/* Your page content */}\n    </main>\n  );\n};\n\nexport default ${pascalCaseName}Page;\n`;

        case BackendComponentType.MIDDLEWARE:
            return `import { Request, Response, NextFunction } from 'express';\n\nexport const ${fileName} = (req: Request, res: Response, next: NextFunction) => {\n  // Your middleware logic\n  next();\n};\n`;

        case BackendComponentType.ROUTE:
            return `import express from 'express';\nimport { ${fileName}Controller } from '../controllers/${fileName}.controller';\n\nconst router = express.Router();\n\nrouter.get('/', ${fileName}Controller);\n\nexport default router;\n`;

        case BackendComponentType.CONTROLLER:
            return `import { Request, Response } from 'express';\n\nexport const ${fileName}Controller = (req: Request, res: Response) => {\n  // Your controller logic\n  res.send('${pascalCaseName} response');\n};\n`;
     
        default:
            return `// ${pascalCaseName} ${componentType} file\n`;
    }
}



