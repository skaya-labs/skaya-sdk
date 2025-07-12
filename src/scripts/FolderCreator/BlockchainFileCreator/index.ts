// scripts/FolderCreator/BlockchainFileCreator/index.ts
import { ProjectType, BlokchainComponentType } from "../../../../bin/types/enums";
import inquirer from "inquirer";
import { scanExistingComponents } from "../../../../bin/utils/ProjectScanner";

export async function handleBlockchainomponentImport(componentType: BlokchainComponentType) {
    const existingComponents = await scanExistingComponents(ProjectType.BLOCKCHAIN, componentType);
    let importExisting = false;
    let componentsToImport: { name: string, data: string }[] = [];

    if (existingComponents && existingComponents.length > 0) {
        const { shouldImport } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'shouldImport',
                message: `Would you like to import existing ${componentType} components?`,
                default: false
            }
        ]);

        if (shouldImport) {
            const { selectedComponents } = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'selectedComponents',
                    message: `Use spacebar to select one or more ${componentType} components:`,
                    choices: existingComponents.map((component: any) => ({
                        name: component.name,
                        value: component
                    })),
                    pageSize: 10
                }
            ]);

            componentsToImport = selectedComponents;
            importExisting = componentsToImport.length > 0;
        }
    }

    return { importExisting, componentsToImport };
}