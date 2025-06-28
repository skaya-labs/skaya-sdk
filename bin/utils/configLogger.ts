// src/utils/configLogger.ts
import { promises as fs } from 'fs';
import path from 'path';
import { ComponentType, ProjectType } from '../types/enums'; // Assuming ComponentType and ProjectType are defined here
import { ComponentImportConfig } from './ProjectScanner';

const CONFIG_FILE = 'skaya.config.json';
const LOG_FILE = 'Skayalogs.log';
const DEFAULT_PROJECT_NAME = 'SkayaProject'; // Moved to a constant

/**
 * Interface for a single project's configuration (e.g., frontend, backend).
 */
interface ProjectConfig {
  name: string;
  template: string;
  createdAt?: string; // Added for consistency with saveProjectConfig
  components?: Record<string, any>; // Added to store component-specific configurations
  [key: string]: any; // Allow for additional properties
}

/**
 * Interface for the overall configuration structure.
 */
interface Config {
  frontend?: ProjectConfig;
  backend?: ProjectConfig;
  smartContract?: ProjectConfig;
  [key: string]: any; // Allow for additional project types
}




/**
 * Saves project type (frontend/backend/smartContract) to skaya.config.json.
 * This function creates or updates the top-level project configuration.
 * @param projectType - Project type (e.g., ProjectType.Frontend, ProjectType.Backend)
 * @param name - Name of the project
 * @param template - Template to use (optional, defaults to "custom")
 */
export async function saveProjectConfig(projectType: ProjectType, name: string, template?: string): Promise<void> {
  try {
    const configPath = path.join(process.cwd(), "..", CONFIG_FILE);
    console.log("Saving project config to:", configPath);

    let fileContent = '';

    try {
      fileContent = await fs.readFile(configPath, 'utf-8');
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Error reading config file: ${error.message}`);
      }
      console.log(`Config file ${CONFIG_FILE} not found, creating a new one.`);
    }

    if (fileContent.trim().length > 0) {
      throw new Error(`❌ A configuration already exists in ${CONFIG_FILE}. Cannot overwrite.`);
    }

    const config: Config = {
      [projectType]: {
        name,
        template: template || "custom",
        createdAt: new Date().toISOString()
      }
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

  } catch (error) {
    throw error;
  }
}

/**
 * Saves component-specific configuration for a given project type.
 * This allows storing details about components within a project (e.g., 'auth', 'database').
 * The `componentType` is now explicitly saved within the component's configuration.
 * @param projectType - The ProjectType (e.g., ProjectType.Frontend)
 * @param componentType - The ComponentType (e.g., ComponentType.UI_COMPONENT, ComponentType.API_COMPONENT)
 * @param componentName - The name of the component (e.g., "auth", "paymentGateway")
 * @param componentDetails - The configuration object for the specific component, derived from ComponentImportConfig values.
 */
export async function saveProjectComponentConfig(
  projectType: ProjectType,
  componentType: ComponentType,
  componentName: string,
  componentDetails: any// Type for the specific component's details
): Promise<void> {
  try {
    let config: Config = {};
    const configPath = path.join(process.cwd(), CONFIG_FILE);

    // Try to read existing config
    try {
      const data = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log(`Config file ${CONFIG_FILE} not found for component config, creating a new one.`);
      } else {
        console.warn(`Warning: Could not parse existing config file for component config, creating new one. Error: ${error.message}`);
      }
    }

    // Ensure the project type entry exists
    if (!config[projectType]) {
      config[projectType] = {
        name: `${projectType}${DEFAULT_PROJECT_NAME}`, // Use the constant
        template: "custom"
      };
      console.log(`Initialized new entry for project type: ${projectType}`);
    }

    // Ensure the 'components' property exists within the project type
    if (!config[projectType]!.components) {
      config[projectType]!.components = {};
      console.log(`Initialized 'components' property for project type: ${projectType}`);
    }

    // Assign the component configuration, including the componentType
    config[projectType]!.components![componentName] = {
      ...config[projectType]!.components![componentName], // Merge with existing component config if it exists
      componentType: componentType, // Explicitly save the componentType
      ...componentDetails, // Apply new component details
      savedAt: new Date().toISOString() // Add a timestamp for when this component config was saved
    };

    // Write the updated config back to the main Config file
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

  } catch (error) {
    console.error(`❌ Failed to save component '${componentName}' configuration for '${projectType}':`, error);
    throw error;
  }
}

/**
 * Logs component creation details to the log file.
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
      timestamp: params.timestamp || new Date().toISOString(), // Use ISO string for consistency
      ...params
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    // Append to log file (creates it if doesn't exist)
    await fs.appendFile(LOG_FILE, logLine);
  } catch (error) {
    console.error('❌ Failed to log component creation:', error);
    throw error;
  }
}

/**
 * Reads the configuration file.
 * @returns A Promise that resolves to the Config object. Returns an empty object if the file doesn't exist or is invalid.
 */
export async function readConfig(): Promise<Config> {
  try {
    const configPath = path.join(process.cwd(), CONFIG_FILE); // Consistent path with save functions
    const data = await fs.readFile(configPath, 'utf-8');
    
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
    } else {
      console.error('❌ Failed to read configuration file:', error);
    }
    return {}; // Return empty object if file not found or parsing fails
  }
}

/**
 * Reads the component import configuration from the config file.
 * Note: This function assumes that the `ComponentImportConfig` might be stored directly
 * as a top-level property (e.g., `config.componentImports`). If component import configs
 * are expected to be nested within project types, this function would need adjustment.
 * @returns A Promise that resolves to the ComponentImportConfig object.
 */
export async function readComponentImportConfig(): Promise<ComponentImportConfig> {
  try {
    const configPath = path.join(process.cwd(), CONFIG_FILE); // Consistent path with save functions
    
    const data = await fs.readFile(configPath, 'utf-8');
    const config: Config = JSON.parse(data);

    // This line assumes a top-level 'componentImports' key in your config.
    // If component import configurations are stored differently (e.g., within a project type's 'components'),
    // this logic would need to be updated.
    return config.componentImports || {};
  } catch (error: any) {
    if (error.code === 'ENOENT') {
    } else {
      console.error('❌ Failed to read component import configuration:', error);
    }
    return {}; // Return empty object if file not found or parsing fails
  }
}