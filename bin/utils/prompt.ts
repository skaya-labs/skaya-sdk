import inquirer from "inquirer";
import { FrontendComponentType, BackendComponentType, ProjectType } from "../types/enums";

/**
 * Prompts user to select component type based on project type
 */
export async function promptComponentType(projectType: ProjectType): Promise<FrontendComponentType | BackendComponentType> {
  if (projectType === ProjectType.FRONTEND) {
    const { componentType } = await inquirer.prompt([{
      type: "list",
      name: "componentType",
      message: "What type of frontend component to create?",
      choices: Object.values(FrontendComponentType),
    }]);
    return componentType as FrontendComponentType;
  } else {
    const { componentType } = await inquirer.prompt([{
      type: "list",
      name: "componentType",
      message: "What type of backend component to create?",
      choices: Object.values(BackendComponentType),
    }]);
    return componentType as BackendComponentType;
  }
}