// src/utils/configLogger.ts
import { promises as fs } from 'fs';
import path from 'path';
import { ComponentType, ProjectType } from '../types/enums'; // Assuming ComponentType and ProjectType are defined here
import { ComponentImportConfig } from './ProjectScanner'; // This import seems unused in the original code for ComponentImportConfig interface. Keep if used elsewhere.

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
  components?: Record<string, ComponentConfig>; // Explicitly type components as Record<string, ComponentConfig>
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

export interface ComponentConfig {
  source: 'ai' | 'template';
  files: string[];
  componentType: ComponentType;
  savedAt: string;
  updatedAt?: string; // Added for update timestamp
  aiPrompt?: string;
  imports?: Array<{
    name: string;
    data: string;
    componentType?: ComponentType; // componentType can be determined by the system
  }>;
  usedBy?: string[]; // Components that import this component
  // Add other possible config properties here
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
    const configPath = path.join(process.cwd(), CONFIG_FILE); // Corrected path to be in current working directory
    console.log("Saving project config to:", configPath);

    let config: Config = {};
    try {
      const fileContent = await fs.readFile(configPath, 'utf-8');
      if (fileContent.trim().length > 0) {
        config = JSON.parse(fileContent);
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Error reading config file: ${error.message}`);
      }
      console.log(`Config file ${CONFIG_FILE} not found, creating a new one.`);
    }

    if (config[projectType]) {
      console.log(`Project type ${projectType} already exists in config. Updating.`);
    }

    config[projectType] = {
      name,
      template: template || "custom",
      createdAt: new Date().toISOString(),
      components: config[projectType]?.components || {} // Preserve existing components if updating
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

  } catch (error) {
    throw error;
  }
}

/**
 * Saves component-specific configuration for a given project type.
 * This allows storing details about components within a project (e.g., 'auth', 'database').
 * The configuration now supports tracking component relationships through imports.
 * @param projectType - The ProjectType (e.g., ProjectType.Frontend)
 * @param componentType - The ComponentType (e.g., ComponentType.UI_COMPONENT, ComponentType.API_COMPONENT)
 * @param componentName - The name of the component (e.g., "auth", "paymentGateway")
 * @param componentDetails - The configuration object for the specific component
 */
export async function saveProjectComponentConfig(
  projectType: ProjectType,
  componentType: ComponentType,
  componentName: string,
  componentDetails: Partial<Omit<ComponentConfig, 'componentType' | 'savedAt' | 'updatedAt'>> // Partial to allow for updates
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
        name: `${projectType}${DEFAULT_PROJECT_NAME}`,
        template: "custom",
        createdAt: new Date().toISOString(),
        components: {}
      };
      console.log(`Initialized new entry for project type: ${projectType}`);
    }

    // Ensure the 'components' property exists within the project type
    if (!config[projectType]!.components) {
      config[projectType]!.components = {};
      console.log(`Initialized 'components' property for project type: ${projectType}`);
    }

    // Get existing component config to merge
    const existingComponentConfig: ComponentConfig = config[projectType]!.components![componentName] || {
      source: 'template', // Default source if new
      files: [],
      componentType: componentType, // Set initial componentType
      savedAt: new Date().toISOString(),
      imports: [],
      usedBy: []
    };

    // Process imports to add componentType if missing (though it should ideally be provided or inferred during generation)
    // For now, we'll assume `imports` within `componentDetails` already has `componentType` if needed,
    // or it will be determined by the system later.
    const processedImports = componentDetails.imports?.map(imp => ({
      ...imp,
      componentType: imp.componentType || undefined // Assuming it might be set or not
    }));


    // Assign the component configuration, merging with existing data
    config[projectType]!.components![componentName] = {
      ...existingComponentConfig, // Start with existing configuration
      ...componentDetails, // Override with new details
      componentType: componentType, // Ensure componentType is explicitly set or updated
      ...(processedImports && { imports: processedImports }),
      savedAt: existingComponentConfig.savedAt || new Date().toISOString(), // Keep original savedAt, update only if not present
      updatedAt: new Date().toISOString() // Always update updatedAt
    };

    // Write the updated config back to file
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Update reverse references if imports changed or component is new
    if (processedImports?.length || existingComponentConfig.imports?.length) {
      await updateComponentReferences(
        projectType,
        componentName,
        processedImports || [], // New imports
        existingComponentConfig.imports || [] // Old imports
      );
    }

  } catch (error) {
    console.error(`❌ Failed to save component '${componentName}' configuration for '${projectType}':`, error);
    throw error;
  }
}

/**
 * Retrieves the configuration for a specific component.
 * @param projectType - The ProjectType (e.g., ProjectType.Frontend)
 * @param componentName - The name of the component (e.g., "auth")
 * @returns The ComponentConfig object or undefined if not found.
 */
export async function getProjectComponentConfig(
  projectType: ProjectType,
  componentName: string
): Promise<ComponentConfig | undefined> {
  try {
    const config = await readConfig();
    return config[projectType]?.components?.[componentName];
  } catch (error) {
    console.error(`❌ Failed to get configuration for component '${componentName}' in '${projectType}':`, error);
    return undefined;
  }
}


// Helper function to update references in imported components
export async function updateComponentReferences(
  projectType: ProjectType,
  sourceComponent: string,
  newImports: Array<{ name: string, data: string, componentType?: ComponentType }>,
  oldImports: Array<{ name: string, data: string, componentType?: ComponentType }> = []
) {
  const config = await readConfig();
  const projectComponents = config[projectType]?.components;

  if (!projectComponents) {
    console.warn(`No components found for project type ${projectType}.`);
    return;
  }

  // Remove old references
  for (const oldImp of oldImports) {
    if (projectComponents[oldImp.name]) {
      const importedComp = projectComponents[oldImp.name];
      if (importedComp.usedBy) {
        importedComp.usedBy = importedComp.usedBy.filter((comp: string) => comp !== sourceComponent);
      }
    }
  }

  // Add new references
  for (const newImp of newImports) {
    if (projectComponents[newImp.name]) {
      const importedComp = projectComponents[newImp.name];
      if (!importedComp.usedBy) {
        importedComp.usedBy = [];
      }
      if (!importedComp.usedBy.includes(sourceComponent)) {
        importedComp.usedBy.push(sourceComponent);
      }
    }
  }

  // Save the updated config
  const configPath = path.join(process.cwd(), CONFIG_FILE);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
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
      // console.log(`Config file ${CONFIG_FILE} not found. Returning empty config.`);
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
      // console.log(`Component import config file ${CONFIG_FILE} not found. Returning empty config.`);
    } else {
      console.error('❌ Failed to read component import configuration:', error);
    }
    return {}; // Return empty object if file not found or parsing fails
  }
}