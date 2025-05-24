import path from "path";
import { readConfig } from "./configLogger";
import { promises as fs } from 'fs';
import { FrontendComponentType } from '../types/enums';


/**
 * Scans existing components in the frontend project
 */
export async function scanExistingComponents(componentType: string): Promise<Array<{name: string, data: string}>> {
    try {
        const config = await readConfig();
        
        if (!config.frontend) {
            console.error('No frontend project configured in config.json');
            return [];
        }

        const componentsPath = path.join(process.cwd(), config.frontend ? config.frontend : "", 'src', `${FrontendComponentType.COMPONENT}s`);
        
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