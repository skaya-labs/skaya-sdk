import path from "path";
import { readConfig } from "./configLogger";
import { promises as fs } from 'fs';
import { ApiType, BackendComponentType, ComponentType, FrontendComponentType, ProjectType, SmartContractComponentType } from '../types/enums';
import { getBaseTemplateFiles } from "../../src/scripts/templateGenerator";


/**
 * Scans existing components in the frontend project
 */
export async function scanExistingComponents(
    projectType: ProjectType,
    componentType: FrontendComponentType | BackendComponentType | SmartContractComponentType
): Promise<Array<{ name: string, data: string }>> {
    try {
        const componentsPath = `${process.cwd()}/${await getDefaultFolder(projectType, componentType)}`;

        try {
            // Verify the directory exists first
            await fs.access(componentsPath);
            
            const files = await fs.readdir(componentsPath, { withFileTypes: true });
            
            // Get all component directories (ignore files)
            const componentDirs = files
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            // Array to hold components with their data
            const componentsWithData: Array<{ name: string, data: string }> = [];

            for (const dir of componentDirs) {
                const componentDirPath = path.join(componentsPath, dir);
                let componentFiles;

                try {
                    componentFiles = await fs.readdir(componentDirPath);
                } catch (error) {
                    console.error(`❌ Failed to read directory ${dir}:`, error);
                    continue;
                }

                // More flexible main file detection
                   const possibleMainFiles = getBaseTemplateFiles(componentType)
                    .map(file => file.replace(new RegExp(componentType, 'gi'), dir))
                    .concat([ // Add common fallbacks
                        `${dir}.tsx`, 
                        `${dir}.jsx`,
                        `${dir.charAt(0).toUpperCase() + dir.slice(1)}.tsx`,
                        'index.tsx'
                    ]);


                const mainFile = possibleMainFiles.find(file =>
                    componentFiles.includes(file) ||
                    componentFiles.includes(path.basename(file))
                );

                if (mainFile) {
                    try {
                        const filePath = path.join(componentDirPath, mainFile);
                        const fileContent = await fs.readFile(filePath, 'utf-8');
                        componentsWithData.push({
                            name: dir,
                            data: fileContent
                        });
                    } catch (error) {
                        console.error(`❌ Failed to read component file in ${dir}: ${error}`);
                    }
                } else {
                    console.warn(`⚠️ No main file found for component ${dir} in ${componentDirPath}`);
                    console.warn(`ℹ️ Looked for:`, possibleMainFiles);
                    console.warn(`ℹ️ Found files:`, componentFiles);
                }
            }
            
            return componentsWithData;
        } catch (error) {
            console.error(`❌ Failed to read components directory: ${componentsPath}. Unable to send extra components to ai.`);
            return [];
        }
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        return [];
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
    componentType?: ComponentType | ApiType
): Promise<string> {
    const config = await readConfig();

    // Check if config exists for the provided projectType
    if (!config) {
        throw new Error("Configuration not found.");
    }

    if (projectType === ProjectType.FRONTEND && !config.frontend) {
        console.warn("Frontend config not found. Setting default.");
        config.frontend = { name: createDefaultFolder(ProjectType.FRONTEND), template: "" };
    }

    if (projectType === ProjectType.BACKEND && !config.backend) {
        console.warn("Backend config not found. Setting default.");
        config.backend = { name: createDefaultFolder(ProjectType.BACKEND), template: "" };
    }

    if (projectType === ProjectType.SMART_CONTRACT && !config.smartContract) {
        console.warn("Smart Contract config not found. Setting default.");
        config.smartContract = { name: createDefaultFolder(ProjectType.SMART_CONTRACT), template: "" };
    }
    let baseSrcPath: string;
    if (config.frontend) {
        // Set baseSrcPath based on projectType
        baseSrcPath = `${config.frontend.name}/src`
    }
    else if (config.backend) {
        // Set baseSrcPath based on projectType
        baseSrcPath = `${config.backend.name}/src`
    }
    else if (config.smartContract) {
        // Set baseSrcPath based on projectType
        baseSrcPath = `${config.smartContract.name}/src`
    }
    else {
        baseSrcPath = `${createDefaultFolder(projectType)}/src`
    }
    // Resolve folder path based on projectType and componentType
    switch (componentType) {
        case FrontendComponentType.PAGE:
            return `${baseSrcPath}/${FrontendComponentType.PAGE}s`;
        case FrontendComponentType.COMPONENT:
            return `${baseSrcPath}/${FrontendComponentType.COMPONENT}s`;
        case FrontendComponentType.API:
            return `${baseSrcPath}/${FrontendComponentType.API}s`;
        case BackendComponentType.ROUTE:
            return `${baseSrcPath}/${BackendComponentType.ROUTE}s`;
        case BackendComponentType.CONTROLLER:
            return `${baseSrcPath}/${BackendComponentType.CONTROLLER}s`;
        default:
            return baseSrcPath;
    }

}


export function createDefaultFolder(projectType: ProjectType): string {
    switch (projectType) {
        case ProjectType.FRONTEND: return "skaya-frontend-app";
        case ProjectType.BACKEND: return "skaya-backend-app";
        case ProjectType.SMART_CONTRACT: return "skaya-smart-contract";
        default: return "skaya-project";
    }
}