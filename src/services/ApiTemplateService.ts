// scripts/questions/askApiEndpointConfig.ts

import inquirer from 'inquirer';
import { ApiEndpointConfig } from '../../bin/types/interfaces';
import { ApiType } from '../../bin/types/enums';
import path from 'path';
import fs from "fs-extra";

export async function askApiEndpointConfig(): Promise<ApiEndpointConfig> {
    const answers = await inquirer.prompt([
        {
            type: 'number',
            name: 'apiId',
            message: 'Enter API ID:',
            validate: (input) => Number.isInteger(input) ? true : 'Please enter a valid number',
        },
        {
            type: 'confirm',
            name: 'withAuth',
            message: 'Does this endpoint require auth?',
            default: true,
        },
        {
            type: 'input',
            name: 'url',
            message: 'Enter the API URL:',
            validate: (input) => input ? true : 'URL cannot be empty',
        },
        {
            type: 'list',
            name: 'method',
            message: 'Select the HTTP method:',
            choices: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        },
    ]);

    return {
        apiId: answers.apiId,
        withAuth: answers.withAuth,
        url: answers.url,
        method: answers.method,
    };
}

/**
 * Handles API component type by updating the base API endpoints file
 * @param {ApiEndpointConfig} apiConfig - The API endpoint configuration
 * @param {string} targetFolder - The target folder path
 * @param {string} fileName - The API endpoint name
 * @returns {Promise<string[]>} Array of created/updated file paths
 */
export async function handleApiComponentType(
    apiConfig: ApiEndpointConfig,
    apiType: ApiType,
    projectType:string,
    targetFolder: string,
    fileName: string
): Promise<string[]> {
    const createdFiles: string[] = [];
    const apiFilePath = path.join(process.cwd(), targetFolder, 'apiEndpoints.ts');
    const templateDir = path.join(__dirname, '..', 'templates', projectType.toLowerCase(), apiType);
    
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
    const newEndpointString = `  ${endpointKey}: ${JSON.stringify(newEndpoint, null, 2).replace(/"([^"]+)":/g, '$1:')},`;
    
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
