import inquirer from "inquirer";
import { FrontendComponentType, BackendComponentType, ProjectType, ComponentType } from "../types/enums";

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