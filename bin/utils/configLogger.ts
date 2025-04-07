// src/utils/configLogger.ts
import { promises as fs } from 'fs';
import path from 'path';
import { FrontendComponentType } from '../types/enums';

const CONFIG_FILE = 'config.json';
const LOG_FILE = 'component_creation.log';

interface Config {
  frontend?: string;
  backend?: string;
  [key: string]: any;
}

/**
 * Saves project type (frontend/backend) to config.json
 * @param type - Project type (frontend or backend)
 * @param name - Name of the project
 */
export async function saveProjectConfig(type: 'frontend' | 'backend', name: string): Promise<void> {
  try {
    let config: Config = {};
    
    // Try to read existing config if it exists
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf-8');
      config = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, we'll create a new one
    }
    
    // Update the config
    config[type] = name;
    
    // Write the updated config
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`✅ Configuration saved to ${CONFIG_FILE}`);
  } catch (error) {
    console.error('❌ Failed to save configuration:', error);
    throw error;
  }
}

/**
 * Logs component creation details to the log file
 * @param params - Component creation parameters
 */
export async function logComponentCreation(params: {
  componentType: string;
  projectType: string;
  fileName: string;
  description?: string;
  timestamp?: Date;
}): Promise<void> {
  try {
    const logEntry = {
      timestamp: params.timestamp || new Date(),
      ...params
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    
    // Append to log file (creates it if doesn't exist)
    await fs.appendFile(LOG_FILE, logLine);
    console.log(`📝 Logged component creation to ${LOG_FILE}`);
  } catch (error) {
    console.error('❌ Failed to log component creation:', error);
    throw error;
  }
}

/**
 * Reads the configuration file
 */
export async function readConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

/**
 * Scans existing components in the frontend project
 */
export async function scanExistingComponents(componentType: string): Promise<string[]> {
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
        throw new Error(`Failed to read components directory: ${componentsPath}`);
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));

  }
}