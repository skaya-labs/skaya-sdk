import path from "path";
import { readConfig } from "./configLogger";
import { promises as fs } from 'fs';
import { FrontendComponentType } from '../types/enums';


/**
 * Scans existing components in the frontend project
 */
export async function scanExistingComponents(componentType: string): Promise<any> {
    try {
      const config = await readConfig();
      
      if (!config.frontend) {
        throw new Error('No frontend project configured in config.json');
      }
  
      const componentsPath = path.join(process.cwd(), config.frontend, 'src', `${FrontendComponentType.COMPONENT}s`);
      
      try {
        // Verify the directory exists first
        await fs.access(componentsPath);
        
        const files = await fs.readdir(componentsPath, { withFileTypes: true });
        
        // Get all component directories (ignore files)
        const componentDirs = files
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
  
        
        // Now check each directory for the main component file
        const validComponents: string[] = [];
        
        for (const dir of componentDirs) {
          const componentFiles = await fs.readdir(path.join(componentsPath, dir));
          
          // Check if the directory contains the expected component files
          const hasMainFile = componentFiles.some(file => 
            file === `${componentType}.tsx` || 
            file === `${dir}.tsx` || 
            file === 'index.tsx'
          );
          
          if (hasMainFile) {
            validComponents.push(dir);
          }
        }
        
        return validComponents;
      } catch (error) {
         console.error(`❌ Failed to read components directory: ${componentsPath}. Unable to send extra components to ai.`);
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
  
    }
  }