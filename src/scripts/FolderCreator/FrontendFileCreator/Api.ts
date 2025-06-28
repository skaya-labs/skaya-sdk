// scripts/questions/Api.ts

import inquirer from "inquirer";
import {
  ApiType,
  ComponentType,
  FrontendComponentType,
  ProjectType,
} from "../../../../bin/types/enums";
import path from "path";
import fs from "fs-extra";
import { readConfig } from "../../../../bin/utils/configLogger";
import { askApiEndpointConfig } from "../../../../bin/utils/prompt";
import { ApiEndpointConfig } from "../../../../bin/types/interfaces";
import TemplateService from "../../../services/TemplateService";
import {
  getDefaultFolderForComponentType,
  getDefaultTemplateDirectory,
} from "../../../../bin/utils/ProjectScanner";

/**
 * Handles API component type by updating the base API endpoints file
 * @param {ApiEndpointConfig} apiConfig - The API endpoint configuration
 * @param {string} targetFolder - The target folder path
 * @param {string} fileName - The API endpoint name
 * @returns {Promise<string[]>} Array of created/updated file paths
 */
export async function handleApiComponentType(
  projectType: ProjectType,
  componentType: ComponentType,
  targetFolder: string,
  fileName: string
): Promise<string[]> {
  const createdFiles: string[] = [];
  const apiFilePath = path.join(process.cwd(), targetFolder, "apiEndpoints.ts");

  let apiType: ApiType;
  let apiConfig: ApiEndpointConfig;

  const { selectedApiType } = await inquirer.prompt([
    {
      type: "list",
      name: "selectedApiType",
      message: "Select API type:",
      choices: [
        { name: "API with Redux", value: ApiType.REDUX },
        { name: "API without Redux", value: ApiType.WITHOUT_REDUX },
      ],
    },
  ]);
  apiType = selectedApiType;
  apiConfig = await askApiEndpointConfig();

  // Check if Redux store files already exist
  const config = await readConfig();
  if (config?.frontend) {
    const defaultReducerFolder = await getDefaultFolderForComponentType(
      projectType,
      componentType
    );
    const reduxStorePath = path.join(process.cwd(), defaultReducerFolder);

    console.log(reduxStorePath);

    const targetFolder = `${path.join(process.cwd(), reduxStorePath)}`;
    console.log("Target folder for Redux store:", targetFolder);
    const storeFilePath = `${path.join(reduxStorePath, "store.tsx")}`;
    const storeProviderPath = path.join(reduxStorePath, "storeProvider.tsx");

    try {
      // Check if store files exist
      const storeExists = await fs.pathExists(storeFilePath);
      const providerExists = await fs.pathExists(storeProviderPath);
      const templateDirReduc = getDefaultTemplateDirectory(
        projectType,
        componentType
      );
      console.log(templateDirReduc);

      if (!storeExists || !providerExists) {
        console.log("store doesn't exist creating one");

        // Create the store directory if it doesn't exist
        await fs.ensureDir(reduxStorePath);

        // Get base template files for Redux store initialization
        const baseFiles = TemplateService.getBaseTemplateFiles(ApiType.REDUX);

        for (const file of baseFiles) {
          const sourcePath = path.join(templateDirReduc, file);
          const targetPath = path.join(reduxStorePath, file); // Create target path with filename

          if (await fs.pathExists(sourcePath)) {
            let content = await fs.readFile(sourcePath, "utf-8");
            await fs.outputFile(targetPath, content); // Use targetPath instead of targetFolder
            createdFiles.push(targetPath);
          }
        }
      }
    } catch (error) {
      console.error("❌ Error checking/initializing Redux store:", error);
    }
  }

  // Convert fileName to uppercase for the endpoint key
  const endpointKey = fileName.toUpperCase();

  // Create the new API endpoint object
  const newEndpoint = {
    apiId: apiConfig.apiId,
    withAuth: apiConfig.withAuth,
    url: apiConfig.url,
    method: apiConfig.method,
  };

  // Format the new endpoint as a string to be added to the file
  const newEndpointString = `${endpointKey}: ${JSON.stringify(
    newEndpoint,
    null,
    2
  ).replace(/"([^"]+)":/g, "$1:")},`;

  try {
    let fileContent = "";

    const baseFiles = TemplateService.getBaseTemplateFiles(
      FrontendComponentType.API
    );
    console.log(baseFiles, "baseFiles");

    // --- Start of new logic to handle base files ---
    const targetDir = path.join(process.cwd(), targetFolder);
    await fs.ensureDir(targetDir);

    const newBaseFiles = ["apiSlice.tsx", "backendRequest.ts"];
    const newFileNameSlice = `${fileName}Slice.tsx`;
    const backendRequestPath = path.join(targetDir, "backendRequest.ts");
    const apiSliceTemplatePath = path.join(
      getDefaultTemplateDirectory(projectType, componentType),
      "apiSlice.tsx"
    );

    for (const file of newBaseFiles) {
      let content = "";

      if (file === "apiSlice.tsx") {
        const targetSlicePath = path.join(targetDir, newFileNameSlice);
        if (await fs.pathExists(apiSliceTemplatePath)) {
          content = await fs.readFile(apiSliceTemplatePath, "utf-8");

          // Use a single regex with a callback to handle all cases
          content = content.replace(
            /(fetch|create|reset|set|select)?(Api|api|API)(Data|State|Loading|Error)?/g,
            (match, prefix, caseMatch, suffix) => {
              let replacement = "";

              // Handle the casing of the core "Api" part
              if (caseMatch === "api") {
                replacement = fileName.toLowerCase(); // 'api' -> 'filename'
              } else if (caseMatch === "Api") {
                // Capitalize the first letter for PascalCase
                replacement =
                  fileName.charAt(0).toUpperCase() + fileName.slice(1); // 'Api' -> 'Filename'
              } else if (caseMatch === "API") {
                replacement = fileName.toUpperCase(); // 'API' -> 'FILENAME'
              } else {
                // This case shouldn't be reached, but as a fallback, return the original
                return match;
              }

              // Reassemble the replaced string with its prefix and suffix
              return (prefix || "") + replacement + (suffix || "");
            }
          );

          await fs.outputFile(targetSlicePath, content);
          createdFiles.push(targetSlicePath);
          console.log(`Created and updated: ${targetSlicePath}`);
        } else {
          console.warn(`Template file not found: ${apiSliceTemplatePath}`);
        }
      } else if (file === "backendRequest.ts") {
        const targetBackendRequestPath = path.join(targetDir, file);
        const sourceBackendRequestPath = path.join(
          getDefaultTemplateDirectory(projectType, componentType),
          file
        );
        // Only copy if it doesn't already exist
        if (!(await fs.pathExists(targetBackendRequestPath))) {
          if (await fs.pathExists(sourceBackendRequestPath)) {
            content = await fs.readFile(sourceBackendRequestPath, "utf-8");
            await fs.outputFile(targetBackendRequestPath, content);
            createdFiles.push(targetBackendRequestPath);
            console.log(`Pasted: ${targetBackendRequestPath}`);
          } else {
            console.warn(
              `Template file not found: ${sourceBackendRequestPath}`
            );
          }
        } else {
          console.log(
            `File already exists, skipping: ${targetBackendRequestPath}`
          );
        }
      }
    }
    // --- End of new logic ---

    // Check if file exists
    if (await fs.pathExists(apiFilePath)) {
      fileContent = await fs.readFile(apiFilePath, "utf-8");

      // Check if endpoint already exists
      const endpointRegex = new RegExp(
        `^\\s*${endpointKey}:\\s*{[^}]*},?\\s*$`,
        "m"
      );
      if (endpointRegex.test(fileContent)) {
        // Update existing endpoint
        fileContent = fileContent.replace(endpointRegex, newEndpointString);
      } else {
        // Add new endpoint before the closing brace
        const lastBraceIndex = fileContent.lastIndexOf("}");
        if (lastBraceIndex !== -1) {
          fileContent =
            fileContent.slice(0, lastBraceIndex) +
            (fileContent.trimEnd().endsWith("}") ? "\n" : "") +
            newEndpointString +
            "\n" +
            fileContent.slice(lastBraceIndex);
        } else {
          // If no closing brace found, create a new file
          fileContent = `export const ApiEndpoint: Record<string, any> = {\n${newEndpointString}\n};`;
        }
      }
    } else {
      // Create new file with the endpoint
      fileContent = `export const ApiEndpoint: Record<string, any> = {\n${newEndpointString}\n};`;
    }

    // Write the updated content back to the file
    await fs.outputFile(apiFilePath, fileContent);
    createdFiles.push(apiFilePath);

    console.log(createdFiles);
    return createdFiles;
  } catch (error) {
    throw new Error(`Failed to update API endpoints file: ${error}`);
  }
}
