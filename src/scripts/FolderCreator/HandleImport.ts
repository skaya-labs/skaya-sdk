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
  // Updated the type definition for componentsToImport to include fileLocation and componentType.
  // Note: As per the existing logic, this array is intended to remain empty.
  // The actual selected components with their details are stored in the 'dependencies' object.
  componentsToImport: { name: string; data: string; fileLocation: string; componentType: ComponentType }[];
  dependencies: Record<string, { name: string; data: string; fileLocation: string; componentType: ComponentType }[]>;
  requiredImports: string[];
}> {
  const configKey = `${projectType}.${componentType}`;
  const config = componentConfig[configKey] || {
    importQuestion: `Would you like to import existing ${componentType} components?`,
    selectMessage: `Select ${componentType} components to import:`,
    scanType: projectType,
    requiredImports: [],
  };

  // Updated the type definition for the values in the dependencies record.
  const dependencies: Record<string, { name: string; data: string; fileLocation: string; componentType: ComponentType }[]> = {};
  let importExisting = false;
  // This array will remain empty as per the new logic, but its type is updated for consistency.
  const componentsToImport: { name: string; data: string; fileLocation: string; componentType: ComponentType }[] = [];
  const requiredImports = config.requiredImports || [];

  if (requiredImports.length > 0) {
    const { selectedRequiredImports } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedRequiredImports",
        message: `Select which required components you would like to import:`,
        choices: requiredImports.map((comp) => ({ name: comp, value: comp })),
      },
    ]);

    for (const depType of selectedRequiredImports) {
      // It's assumed that `scanExistingComponents` returns objects that include
      // `name`, `data`, `fileLocation`, and `componentType`.
      // The `component: any` type assertion is used here, but ideally,
      // `scanExistingComponents` should return a well-defined type.
      const existingComponentsForType = await scanExistingComponents(
        config.scanType,
        depType as ComponentType
      ) as { name: string; data: string; fileLocation: string; componentType: ComponentType }[]; // Explicitly cast for clarity

      if (existingComponentsForType?.length > 0) {
        const { selectedDependencies } = await inquirer.prompt([
          {
            type: "checkbox",
            name: "selectedDependencies",
            message: `Select ${depType} components to import:`,
            choices: existingComponentsForType.map((component) => ({
              name: component.name,
              value: component, // The entire component object (including fileLocation and componentType) is passed here
            })),
            pageSize: 10,
          },
        ]);
        // Assign the selected dependencies, which now include fileLocation and componentType
        dependencies[depType] = selectedDependencies;
        if (selectedDependencies.length > 0) {
          importExisting = true;
        }
      }
    }
  }

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
    componentsToImport, // This will still be an empty array as per the existing logic.
    dependencies, // This object now contains the selected components with fileLocation and componentType.
    requiredImports,
  };
}