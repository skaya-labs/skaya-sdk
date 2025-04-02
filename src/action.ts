/**
 * @file Project scaffolding actions
 * @module action
 * @version 2.0.0
 * @license MIT
 */

import fs from "fs-extra";
import path from "path";
import { BackendComponentType, FrontendComponentType, ProjectType } from "../bin/types/enums";
import { ICreateComponentParams } from "../bin/types/interfaces";
import inquirer from "inquirer";
import FrontendTemplateService from "./services/frontend/TemplateService";
import BackendTemplateService from "./services/backend/TemplateService";

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
 * Creates a new component file
 * @param {ICreateComponentParams} params - Component creation parameters
 */
export async function createFile(params: ICreateComponentParams): Promise<void> {
    const { componentType, projectType } = params;
    const defaultFolder = getDefaultFolder(projectType, componentType);

    const { folder, fileName } = await inquirer.prompt([
        {
            type: "input",
            name: "folder",
            message: `Enter the folder where you want to create the ${componentType}:`,
            default: defaultFolder,
        },
        {
            type: "input",
            name: "fileName",
            message: `Enter the ${componentType} name (without extension):`,
            validate: (input: string) => !!input.trim() || "Name cannot be empty",
        },
    ]);

    const filePath = path.join(process.cwd(), folder, `${fileName}.${getFileExtension(componentType)}`);

    if (await fs.pathExists(filePath)) {
        throw new Error(`${componentType} file already exists.`);
    }

    const template = generateTemplate(componentType, fileName);
    await fs.outputFile(filePath, template);
    console.log(`✅ ${componentType} created at ${filePath}`);
}

/**
 * Gets the default folder for a component type
 */
function getDefaultFolder(projectType: ProjectType, componentType: FrontendComponentType | BackendComponentType): string {
    if (projectType === ProjectType.FRONTEND) {
        return componentType === FrontendComponentType.PAGE
            ? "src/pages"
            : "src/components";
    }

    switch (componentType) {
        case BackendComponentType.MIDDLEWARE:
            return "src/middlewares";
        case BackendComponentType.ROUTE:
            return "src/routes";
        case BackendComponentType.CONTROLLER:
            return "src/controllers";
        default:
            return "src";
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