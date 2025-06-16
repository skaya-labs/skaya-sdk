// src/utils/configLogger.ts
import { promises as fs } from 'fs';

const CONFIG_FILE = 'config.json';
const LOG_FILE = 'component_creation.log';

interface ProjectConfig {
  name: string;
  template: string;
  [key: string]: any;
}

interface Config {
  frontend?: ProjectConfig;
  backend?: ProjectConfig;
  smartContract?: ProjectConfig;
  [key: string]: any;
}

/**
 * Saves project type (frontend/backend) to config.json
 * @param type - Project type (frontend or backend)
 * @param name - Name of the project
 */
export async function saveProjectConfig(type: 'frontend' | 'backend', name: string, template?: string): Promise<void> {
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
    config[type] = {
      name,
      template: template || 'custom',
      createdAt: new Date().toISOString()
    };
    
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
