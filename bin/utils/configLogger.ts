// src/utils/configLogger.ts
import { promises as fs } from 'fs';
import path from 'path';
import { ProjectType } from '../types/enums';

const CONFIG_FILE = 'skaya.config.json';
const LOG_FILE = 'Skayalogs.log';

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
 * Saves project type (frontend/backend) to config.json in both process.cwd() and config file
 * @param projectType - Project type (frontend or backend)
 * @param name - Name of the project
 * @param template - Template to use (optional)
 */
export async function saveProjectConfig(projectType: ProjectType, name: string, template?: string): Promise<void> {
  try {
    let config: Config = {};
    const configPath = path.join(process.cwd(),"../", CONFIG_FILE);
    console.log("saving to",configPath);
    
    // Try to read existing config if it exists
    try {
      const data = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, we'll create a new one
    }
    
    // Update the config
    config[projectType] = {
      name,
      template: template || "custom",
      createdAt: new Date().toISOString()
    };
    
    // Write the updated config to main Config file
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    console.log(`✅ Configuration saved to ${CONFIG_FILE} and ${configPath}`);
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
    const configPath = path.join(process.cwd(), CONFIG_FILE);
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}