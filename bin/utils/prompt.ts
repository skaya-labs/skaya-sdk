import inquirer from "inquirer";
import { FrontendComponentType, BackendComponentType, ProjectType, ComponentType } from "../types/enums";
import { ApiEndpointConfig } from "../types/interfaces";

/**
 * Prompts user to select component type based on project type
 */
export async function promptComponentType(projectType: ProjectType): Promise<ComponentType> {
  const { componentType } = await inquirer.prompt([{
    type: "list",
    name: "componentType",
    message: `Select ${projectType} component type:`,
    choices: projectType === ProjectType.FRONTEND
      ? Object.values(FrontendComponentType)
      : Object.values(BackendComponentType)
  }]);
  return componentType;
}


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