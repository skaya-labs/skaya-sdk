import path, { join } from "path";
import { readConfig } from "./configLogger";
import { promises as fs, readFileSync } from "fs";
import {
  ApiType,
  BackendComponentType,
  ComponentType,
  FrontendComponentType,
  ProjectType,
  BlokchainComponentType,
} from "../types/enums";
import TemplateService from "../../src/services/TemplateService";

export interface DependencyConfig {
  question: string;
  message: string;
}
export interface ComponentImportConfig {
  [key: string]: {
    importQuestion: string;
    selectMessage: string;
    scanType: ProjectType;
    dependencies?: Record<string, DependencyConfig>;
    requiredImports?: string[];
  };
}

/**
 * Scans existing components in the frontend project
 */
export async function scanExistingComponents(
  projectType: ProjectType,
  componentType: ComponentType | ApiType
): Promise<Array<{ name: string; data: string }>> {
  try {
    const componentsPath = `${process.cwd()}/${await getDefaultFolderForComponentType(
      projectType,
      componentType
    )}`;

    try {
      // Verify the directory exists first
      await fs.access(componentsPath);

      const files = await fs.readdir(componentsPath, { withFileTypes: true });

      // Get all component directories (ignore files)
      const componentDirs = files
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      // Array to hold components with their data
      const componentsWithData: Array<{ name: string; data: string }> = [];

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
        const possibleMainFiles = TemplateService.getBaseTemplateFiles(
          componentType
        )
          .map((file: string) =>
            file.replace(new RegExp(componentType, "gi"), dir)
          )
          .concat([
            // Add common fallbacks
            `${dir}.tsx`,
            `${dir}.jsx`,
            `${dir.charAt(0).toUpperCase() + dir.slice(1)}.tsx`,
            "index.tsx",
          ]);

        const mainFile = possibleMainFiles.find(
          (file: string) =>
            componentFiles.includes(file) ||
            componentFiles.includes(path.basename(file))
        );

        if (mainFile) {
          try {
            const filePath = path.join(componentDirPath, mainFile);
            const fileContent = await fs.readFile(filePath, "utf-8");
            componentsWithData.push({
              name: dir,
              data: fileContent,
            });
          } catch (error) {
            console.error(
              `❌ Failed to read component file in ${dir}: ${error}`
            );
          }
        } else {
          console.warn(
            `⚠️ No main file found for component ${dir} in ${componentDirPath}`
          );
          console.warn(`ℹ️ Looked for:`, possibleMainFiles);
          console.warn(`ℹ️ Found files:`, componentFiles);
        }
      }

      return componentsWithData;
    } catch (error) {
      console.error(
        `❌ Failed to read components directory: ${componentsPath}. Unable to send extra components to ai.`
      );
      return [];
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return [];
  }
}

export function createDefaultFolder(projectType: ProjectType): string {
  switch (projectType) {
    case ProjectType.FRONTEND:
      return "skaya-frontend-app";
    case ProjectType.BACKEND:
      return "skaya-backend-app";
    case ProjectType.BLOCKCHAIN:
      return "skaya-smart-contract";
    default:
      return "skaya-project";
  }
}

/**
 * Gets the default folder for a component type
 * @param {ProjectType} projectType - The project type (frontend/backend)
 * @param {ComponentType} componentType - The component type
 * @returns {Promise<string>} The default folder path
 */
export async function getDefaultFolderForComponentType(
  projectType: ProjectType,
  componentType?: ComponentType | ApiType
): Promise<string> {
  try {
    const config = await readConfig();

    if (!config) {
      throw new Error("Configuration not found.");
    }

    // Validate project type
    if (!Object.values(ProjectType).includes(projectType)) {
      throw new Error(`Invalid project type: ${projectType}`);
    }

    // Initialize missing configurations with defaults
    const configMap = {
      [ProjectType.FRONTEND]: config.frontend,
      [ProjectType.BACKEND]: config.backend,
      [ProjectType.BLOCKCHAIN]: config.smartContract,
    };

    if (!configMap[projectType]) {
      const defaultName = createDefaultFolder(projectType);
      console.warn(`${projectType} config not found. Setting default.`);

      // Update both the config map and the original config
      configMap[projectType] = { name: defaultName, template: "" };

      // Persist the updated config back to the original object
      switch (projectType) {
        case ProjectType.FRONTEND:
          config.frontend = configMap[projectType];
          break;
        case ProjectType.BACKEND:
          config.backend = configMap[projectType];
          break;
        case ProjectType.BLOCKCHAIN:
          config.smartContract = configMap[projectType];
          break;
      }
    }

    // Get base source path
    const projectConfig = configMap[projectType];
    const baseSrcPath = `${
      projectConfig?.name || createDefaultFolder(projectType)
    }/src`;

    // Handle component-specific paths
    if (!componentType) {
      return baseSrcPath;
    }

    const componentTypeMap: Record<string, string> = {
      [FrontendComponentType.PAGE]: `${FrontendComponentType.PAGE}s`,
      [FrontendComponentType.COMPONENT]: `${FrontendComponentType.COMPONENT}s`,
      [FrontendComponentType.API]: `${FrontendComponentType.API}s`,
      [BackendComponentType.ROUTE]: `${BackendComponentType.ROUTE}s`,
      [BackendComponentType.CONTROLLER]: `${BackendComponentType.CONTROLLER}s`,
      [BlokchainComponentType.CONTRACT]: `${BlokchainComponentType.CONTRACT}s`,
    };

    const componentPath = componentTypeMap[componentType];
    if (!componentPath) {
      console.warn(
        `Unknown component type: ${componentType}. Returning base path.`
      );
      return baseSrcPath;
    }

    return `${baseSrcPath}/${componentPath}`;
  } catch (error) {
    console.error(
      `Error in getDefaultFolder: ${
        error instanceof Error ? error.message : error
      }`
    );
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Gets the template directory path for a given project and component type
 * @param projectType The project type (frontend/backend)
 * @param componentType The component type
 * @returns The full path to the template directory
 */
export function getDefaultTemplateDirectory(
  projectType: ProjectType,
  componentType: ComponentType | ApiType
): string {
  return path.join(
    __dirname,
    "..",
    "templates",
    projectType.toLowerCase(),
    componentType
  );
}

// Add this to componentUtils.ts
export const loadComponentConfig = (): ComponentImportConfig => {
  try {
    const configPath = join(
      __dirname,
      "../templates/",
      "componentImportConfig.json"
    );
    const configFile = readFileSync(configPath, "utf-8");
    return JSON.parse(configFile);
  } catch (error) {
    console.error("Error loading component import configuration:", error);
    return {};
  }
};
