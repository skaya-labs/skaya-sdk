// scripts/questions/askApiEndpointConfig.ts

import inquirer from 'inquirer';
import { ApiType } from '../../../../bin/types/enums';
import path from 'path';
import fs from "fs-extra";
import { readConfig } from '../../../../bin/utils/configLogger';
import { askApiEndpointConfig } from '../../../../bin/utils/prompt';
import { ApiEndpointConfig } from '../../../../bin/types/interfaces';
import TemplateService from '../../../services/TemplateService';

/**
 * Handles API component type by updating the base API endpoints file
 * @param {ApiEndpointConfig} apiConfig - The API endpoint configuration
 * @param {string} targetFolder - The target folder path
 * @param {string} fileName - The API endpoint name
 * @returns {Promise<string[]>} Array of created/updated file paths
 */
export async function handleApiComponentType(
    projectType: string,
    targetFolder: string,
    fileName: string
): Promise<string[]> {
    const createdFiles: string[] = [];
    const apiFilePath = path.join(process.cwd(), targetFolder, 'apiEndpoints.ts');

    let apiType: ApiType;
    let apiConfig: ApiEndpointConfig;
    let componentTypeConfig: {
        apiType: ApiType
        apiConfig: ApiEndpointConfig
    };
    const { selectedApiType } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedApiType',
            message: 'Select API type:',
            choices: [
                { name: 'API with Redux', value: ApiType.REDUX },
                { name: 'API without Redux', value: ApiType.WITHOUT_REDUX }
            ],
        }
    ]);
    apiType = selectedApiType;
    apiConfig = await askApiEndpointConfig();
    componentTypeConfig = {
        apiType,
        apiConfig
    }

    // Check if Redux store files already exist
    const config = await readConfig();
    if (config?.frontend) {
        const reduxStorePath = path.join(process.cwd(), config.frontend.name, 'src', `APIs`, apiType);
        const storeFilePath = path.join(reduxStorePath, 'store.tsx');
        const storeProviderPath = path.join(reduxStorePath, 'storeProvider.tsx');

        try {
            // Check if store files exist
            const storeExists = await fs.pathExists(storeFilePath);
            const providerExists = await fs.pathExists(storeProviderPath);
            const templateDirReduc = path.join(__dirname, '..', 'templates', projectType.toLowerCase(), "redux", apiType);

            if (!storeExists || !providerExists) {
                console.log("store doesn't exist creating one");

                // Create the store directory if it doesn't exist
                await fs.ensureDir(reduxStorePath);

                // Get base template files for Redux store initialization
                const baseFiles = TemplateService.getBaseTemplateFiles(ApiType.REDUX);

                for (const file of baseFiles) {
                    const sourcePath = path.join(templateDirReduc, file);
                    const targetPath = path.join(targetFolder, file);  // Create target path with filename

                    if (await fs.pathExists(sourcePath)) {
                        let content = await fs.readFile(sourcePath, 'utf-8');
                        await fs.outputFile(targetPath, content);  // Use targetPath instead of targetFolder
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
    const newEndpointString = `${endpointKey}: ${JSON.stringify(newEndpoint, null, 2).replace(/"([^"]+)":/g, '$1:')},`;

    try {
        let fileContent = '';

        // Check if file exists
        if (await fs.pathExists(apiFilePath)) {
            fileContent = await fs.readFile(apiFilePath, 'utf-8');

            // Check if endpoint already exists
            const endpointRegex = new RegExp(`^\\s*${endpointKey}:\\s*{[^}]*},?\\s*$`, 'm');
            if (endpointRegex.test(fileContent)) {
                // Update existing endpoint
                fileContent = fileContent.replace(endpointRegex, newEndpointString);
            } else {
                // Add new endpoint before the closing brace
                const lastBraceIndex = fileContent.lastIndexOf('}');
                if (lastBraceIndex !== -1) {
                    fileContent = fileContent.slice(0, lastBraceIndex) +
                        (fileContent.trimEnd().endsWith('}') ? '\n' : '') +
                        newEndpointString + '\n' +
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

        return createdFiles;
    } catch (error) {
        throw new Error(`Failed to update API endpoints file: ${error}`);
    }
}
