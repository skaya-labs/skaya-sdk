import inquirer from "inquirer";
import {
  loadComponentConfig,
  scanExistingComponents,
} from "../../../bin/utils/ProjectScanner";
import { ApiType, ComponentType, ProjectType } from "../../../bin/types/enums";

const componentConfig = loadComponentConfig();

export async function handleComponentImport(
  projectType: ProjectType,
  componentType: ComponentType | ApiType
): Promise<{
  importExisting: boolean;
  componentsToImport: { name: string; data: string }[];
  dependencies: Record<string, { name: string; data: string }[]>;
  requiredImports: string[];
}> {
  const configKey = `${projectType}.${componentType}`;
  const config = componentConfig[configKey] || {
    importQuestion: `Would you like to import existing ${componentType} components?`,
    selectMessage: `Select ${componentType} components to import:`,
    scanType: projectType,
    requiredImports: [],
  };

  const dependencies: Record<string, { name: string; data: string }[]> = {};
  let importExisting = false;
  const componentsToImport: { name: string; data: string }[] = []; // This will remain empty as per new logic
  const requiredImports = config.requiredImports || []; // Step 1: Prompt user to select which required imports they want to import

  if (requiredImports.length > 0) {
    const { selectedRequiredImports } = await inquirer.prompt([
      {
        type: "checkbox", // Changed from "confirm" to "checkbox"
        name: "selectedRequiredImports", // Changed name for clarity
        message: `Select which required components you would like to import:`, // Updated message
        choices: requiredImports.map((comp) => ({ name: comp, value: comp })), // Create choices from the array
      },
    ]); // Step 2: For each selected required import type, scan for existing components and let the user choose

    for (const depType of selectedRequiredImports) {
      const existingComponentsForType = await scanExistingComponents(
        config.scanType,
        depType as ComponentType
      );

      if (existingComponentsForType?.length > 0) {
        const { selectedDependencies } = await inquirer.prompt([
          {
            type: "checkbox",
            name: "selectedDependencies",
            message: `Select ${depType} components to import:`,
            choices: existingComponentsForType.map((component: any) => ({
              name: component.name,
              value: component,
            })),
            pageSize: 10,
          },
        ]);
        dependencies[depType] = selectedDependencies;
        if (selectedDependencies.length > 0) {
          importExisting = true;
        }
      }
    }
  } // Final confirmation and summary

  if (Object.keys(dependencies).some((key) => dependencies[key].length > 0)) {
    console.log("\n--- Dependencies to be imported ---");
    for (const [depType, selectedDeps] of Object.entries(dependencies)) {
      if (selectedDeps.length > 0) {
        console.log(`\nDependencies (${depType}):`);
        selectedDeps.forEach((dep) => console.log(`- ${dep.name}`));
      }
    }
    console.log("-------------------------------------------------");
  } else {
    console.log("\nNo components were selected for import.");
  }

  return {
    importExisting,
    componentsToImport,
    dependencies,
    requiredImports,
  };
}
