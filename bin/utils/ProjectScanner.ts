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
import { TemplateFileInfo } from "../../src/scripts/templateGenerator";

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
 * Scans existing components in the  project
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
        // --- IMPROVED CONDITION HERE ---
        // If componentType is ApiType, skip the 'redux' folder completely
        if (dir === "redux") {
          continue; // Skip to the next directory in the loop
        }

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
            `${dir}.ts`,
            `${dir}.jsx`,
            `${dir.charAt(0).toUpperCase() + dir.slice(1)}.tsx`,
            // Handle case where dir ends with "Page" (e.g., "asffsPage" -> "asffs.tsx")
            ...(dir.toLowerCase().endsWith("page")
              ? [`${dir.slice(0, -4)}.tsx`]
              : []),
            "index.tsx",
            "index.ts",
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
        `❌ Failed to read components directory for ${componentType}. Unable to send extra components to ai.`
      );
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
export async function getDefaultFolderForComponentType(
  projectType: ProjectType,
  componentType?: ComponentType | ApiType,
  fileName?:string
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
      [ProjectType.FRONTEND]: config?.frontend,
      [ProjectType.BACKEND]: config?.backend,
      [ProjectType.BLOCKCHAIN]: config?.blockchain,
    };

    if (!configMap[projectType]) {
      console.warn(`${projectType} config not found. Setting default or add your folder.`);

      // Update both the config map and the original config
      configMap[projectType] = { name: `${projectType}SkayaProject`, template: "" };
    }

    // Get base source path
    const projectConfig = configMap[projectType];
    const baseSrcPath = `${
      projectConfig?.name || `${projectType}SkayaProject`
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
    if(fileName){
      return `${baseSrcPath}/${componentPath}/${fileName}`;
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


/**
 * Gets all files inside a specified folder with their content
 * @param folderName The name of the folder to scan
 * @param componentType The type of component (page, component, route, etc.)
 * @param projectType The type of project (frontend, backend, blockchain)
 * @returns Promise<TemplateFileInfo[]> Array of file info objects
 * @throws Error when folder cannot be accessed or read
 */
export async function getFilesInFolder(
  folderName: string,
  componentType: ComponentType | ApiType,
  projectType: ProjectType
): Promise<TemplateFileInfo[]> {
  // Get the base path for the component type
  const basePath = await getDefaultFolderForComponentType(projectType, componentType);
  const fullPath = path.join(process.cwd(), basePath, folderName);

  try {
    // Verify the directory exists
    await fs.access(fullPath);
  } catch (error) {
    throw new Error(`Folder "${fullPath}" does not exist or cannot be accessed`);
  }

  try {
    // Read all files in the directory
    const files = await fs.readdir(fullPath);

    // Process each file
    const fileInfos: Promise<TemplateFileInfo>[] = files.map(async (file) => {
      const filePath = path.join(fullPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        const content = await fs.readFile(filePath, 'utf-8');
        return {
          originalFileName: file,
          targetFileName: file, // Keeping same name unless you want to modify
          content: content
        };
      }
      // For directories, we could return null and filter them out
      return {
        originalFileName: file,
        targetFileName: file,
        content: undefined // or you might want to skip directories entirely
      };
    });

    // Wait for all files to be processed and filter out directories if needed
    const results = await Promise.all(fileInfos);
    return results.filter(file => file.content !== undefined);

  } catch (error) {
    throw new Error(`Failed to read files in folder "${fullPath}": ${error instanceof Error ? error.message : String(error)}`);
  }
}