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
import TemplateService from "./TemplateService";

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
        const { templateType, customRepo } = await TemplateService.promptTemplateSelection();
        await TemplateService.cloneTemplate(templateType, customRepo, targetPath);
    } else {
        await createBackendStructure(targetPath);
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

/**
 * Creates basic frontend project structure
 */
async function createFrontendStructure(projectPath: string): Promise<void> {
    const structure = {
        'src': {
            'components': {},
            'pages': {},
            'App.tsx': '// Your main app component',
            'index.tsx': '// Your entry file',
        },
        'public': {
            'index.html': '<!-- Your HTML template -->',
        },
        'package.json': JSON.stringify({
            name: path.basename(projectPath),
            version: "1.0.0",
            scripts: {
                start: "react-scripts start",
                build: "react-scripts build",
            },
            dependencies: {
                react: "^18.0.0",
                "react-dom": "^18.0.0",
            },
        }, null, 2),
    };

    await createStructure(projectPath, structure);
}

/**
 * Creates basic backend project structure
 */
/**
 * Creates basic backend project structure 
 */
async function createBackendStructure(projectPath: string): Promise<void> {
    const structure = {
        'src': {
            'controllers': {},
            'routes': {},
            'middlewares': {},
            'app.ts': `import express from 'express';\n\nconst app = express();\n\napp.use(express.json());\n\n// Your routes here\n\napp.listen(3000, () => {\n  console.log('Server running on port 3000');\n});\n`,
        },
        'package.json': JSON.stringify({
            name: path.basename(projectPath),
            version: "1.0.0",
            scripts: {
                start: "ts-node src/app.ts",
                dev: "nodemon src/app.ts",
            },
            dependencies: {
                express: "^4.18.0",
                "ts-node": "^10.9.1",
            },
            devDependencies: {
                nodemon: "^2.0.20",
            },
        }, null, 2),
        'tsconfig.json': JSON.stringify({
            compilerOptions: {
                target: "ES6",
                module: "CommonJS",
                outDir: "./dist",
                rootDir: "./src",
                strict: true,
                esModuleInterop: true,
            },
        }, null, 2),
        '.env': `DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"`
    };

    await createStructure(projectPath, structure);
}

/**
 * Recursively creates folder structure
 */
async function createStructure(basePath: string, structure: Record<string, any>): Promise<void> {
    for (const [name, content] of Object.entries(structure)) {
        const itemPath = path.join(basePath, name);

        if (typeof content === 'object') {
            await fs.ensureDir(itemPath);
            await createStructure(itemPath, content);
        } else {
            await fs.outputFile(itemPath, content);
        }
    }
}