import path from "path";
import { readConfig } from "./configLogger";
import { promises as fs } from 'fs';
import { BackendComponentType, FrontendComponentType, ProjectType } from '../types/enums';


/**
 * Scans existing components in the frontend project
 */
export async function scanExistingComponents(projectType: ProjectType,
    componentType: FrontendComponentType | BackendComponentType): Promise<Array<{name: string, data: string}>> {
    try {
        const componentsPath =await getDefaultFolder(projectType, componentType);
        
        try {
            // Verify the directory exists first
            await fs.access(componentsPath);
            
            const files = await fs.readdir(componentsPath, { withFileTypes: true });
            
            // Get all component directories (ignore files)
            const componentDirs = files
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            // Array to hold components with their data
            const componentsWithData: Array<{name: string, data: string}> = [];
            
            for (const dir of componentDirs) {
                const componentDirPath = path.join(componentsPath, dir);
                const componentFiles = await fs.readdir(componentDirPath);
                
                // Determine the main component file
                const mainFile = componentFiles.find(file => 
                    file === `${componentType}.tsx` || 
                    file === `${dir}.tsx` || 
                    file === 'index.tsx'
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
    componentType?: FrontendComponentType | BackendComponentType
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
        console.error("Backend project type specified, but no 'backend' config found. ✅ Initialize a Backend project with skaya init.");
    }
    if (projectType === ProjectType.SMART_CONTRACT && !config.smartContract) {
        console.error("Smart Contract type specified, but no 'smart Contract' config found. ✅ Initialize a Smart Contract with skaya init.");
    }

    // Set baseSrcPath based on projectType
    const baseSrcPath = projectType === ProjectType.FRONTEND
        ? `${config.frontend}/src`
        : `${config.backend}/src`;

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