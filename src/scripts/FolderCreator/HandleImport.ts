import inquirer from "inquirer";
import { loadComponentConfig, scanExistingComponents } from "../../../bin/utils/ProjectScanner";
import { ApiType, ComponentType, ProjectType } from "../../../bin/types/enums";


const componentConfig = loadComponentConfig();

export async function handleComponentImport(
  projectType: ProjectType,
  componentType: ComponentType | ApiType,
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

  // Main component import
  const existingComponents = await scanExistingComponents(
    config.scanType,
    componentType
  );
  let importExisting = false;
  let componentsToImport: { name: string; data: string }[] = [];
  const dependencies: Record<string, { name: string; data: string }[]> = {};
  const requiredImports = config.requiredImports || [];

  if (existingComponents?.length > 0) {
    const { shouldImport } = await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldImport",
        message: config.importQuestion,
        default: false,
      },
    ]);

    if (shouldImport) {
      const { selectedComponents } = await inquirer.prompt([
        {
          type: "checkbox",
          name: "selectedComponents",
          message: config.selectMessage,
          choices: existingComponents.map((component: any) => ({
            name: component.name,
            value: component,
          })),
          pageSize: 10,
        },
      ]);
      componentsToImport = selectedComponents;
      importExisting = componentsToImport.length > 0;
    }
  }

  // Handle dependencies
  if (importExisting && config.dependencies) {
    for (const [depType, depConfig] of Object.entries(config.dependencies)) {
      const existingDeps = await scanExistingComponents(
        config.scanType,
        depType as ComponentType
      );

      if (existingDeps?.length > 0) {
        const { shouldImportDep } = await inquirer.prompt([
          {
            type: "confirm",
            name: "shouldImportDep",
            message: depConfig.question,
            default: false,
          },
        ]);

        if (shouldImportDep) {
          const { selectedDependencies } = await inquirer.prompt([
            {
              type: "checkbox",
              name: "selectedDependencies",
              message: depConfig.message,
              choices: existingDeps.map((dep: any) => ({
                name: dep.name,
                value: dep,
              })),
              pageSize: 10,
            },
          ]);
          dependencies[depType] = selectedDependencies;
        }
      }
    }
  }

  return {
    importExisting,
    componentsToImport,
    dependencies,
    requiredImports,
  };
}