#!/usr/bin/env ts-node

/**
 * @file CLI interface for full-stack web3 project scaffolding tool
 * @module cli
 * @license MIT
 */

import { Command } from "commander";
import { createProject, createFile, updateFile } from "../src/action";
import { ProjectType, ComponentType, FrontendComponentType, BackendComponentType, BlokchainComponentType } from "./types/enums";
import { ICommandOptions, ICreateComponentParams } from "./types/interfaces";
import { isValidProjectType, isValidFrontendComponent, isValidBackendComponent } from "./utils/validator";
import { promptComponentType } from "./utils/prompt";
import { handleCliError } from "./utils/errorHandler";
import inquirer from "inquirer";
import { readFileSync } from "fs";
import { join } from "path";
import { logComponentCreation } from "./utils/configLogger";
import { scanExistingComponents } from "./utils/ProjectScanner";

// Read package.json to get version
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const program = new Command();

program
  .name(packageJson.name)
  .version(packageJson.version)
  .description(packageJson.description);

// Project initialization command
program
  .command("init [type]")
  .description("Initialize a new project")
  .action(async (type?: string) => {
    try {
      // If type wasn't provided, prompt the user to select one
      if (!type) {
        const answer = await inquirer.prompt([
          {
            type: 'list',
            name: 'projectType',
            message: 'Please select a project type first:',
            choices: [
              { name: 'Frontend', value: ProjectType.FRONTEND },
              { name: 'Backend', value: ProjectType.BACKEND },
              { name: 'Smart Contract', value: ProjectType.BLOCKCHAIN }
            ],
          }
        ]);
        type = answer.projectType;
      }

      if (type && !isValidProjectType(type)) {
        throw new Error(
          `Invalid project type "${type}". Use '${ProjectType.FRONTEND}' or '${ProjectType.BACKEND}'.`
        );
      }

      await createProject(type as ProjectType);
      console.log(`✅ Successfully created ${type} project`);
    } catch (error) {
      handleCliError(error as Error, "project initialization");
    }
  });

// Component creation command
program
  .command("create [type]")
  .allowUnknownOption()
  .description("Create a new component (interactive mode if no type specified)")
  .option(`-p, --project <type>", "Project type (${ProjectType.FRONTEND} or ${ProjectType.BACKEND}) or ${ProjectType.BLOCKCHAIN}`)
  .option("-f, --filename <name>", "Filename for the component")
  .option("-a, --ai <boolean>", "Use AI to generate the component", false)
  .option("-d, --description <text>", "Description of the component")
  .action(async (type: string | undefined, options: ICommandOptions & { filename?: string; ai?: boolean; description?: string }) => {
    try {
      let projectType: ProjectType;
      let componentType: ComponentType;
      let fileName = options.filename;
      // Interactive mode
      if (!type && !options.project) {
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'projectType',
            message: 'Select project type:',
            choices: Object.values(ProjectType)
          },
          {
            type: 'list',
            name: 'componentType',
            message: 'Select component type:',
            choices: (answers) => {
              if (answers.projectType === ProjectType.FRONTEND) {
                return Object.values(FrontendComponentType);
              } else if (answers.projectType === ProjectType.BACKEND) {
                return Object.values(BackendComponentType);
              } else if (answers.projectType === ProjectType.BLOCKCHAIN) {
                return Object.values(BlokchainComponentType);
              }
              return [];
            }
          },
          {
            type: 'input',
            name: 'fileName',
            message: 'Enter filename (without extension):',
            when: () => !fileName,
            validate: (input) => !!input || 'Filename is required'
          }
        ]);

        projectType = answers.projectType;
        componentType = answers.componentType;
        fileName = fileName || answers.fileName;
      }
      // Partial interactive (project type specified)
      else if (!type && options.project) {
        projectType = options.project.toLowerCase() as ProjectType;
        if (!isValidProjectType(projectType)) {
          throw new Error(`Invalid project type. Use '${ProjectType.FRONTEND}' or '${ProjectType.BACKEND}'.`);
        }

        componentType = await promptComponentType(projectType);

        // Prompt for additional info if not provided
        const additionalAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'fileName',
            message: 'Enter filename (without extension):',
            when: () => !fileName,
            validate: (input) => !!input || 'Filename is required'
          },
        ]);

        fileName = fileName || additionalAnswers.fileName;
      }
      // Non-interactive mode
      else {
        projectType = options.project?.toLowerCase() as ProjectType || ProjectType.FRONTEND;

        if (!isValidProjectType(projectType)) {
          throw new Error(`Invalid project type. Use '${ProjectType.FRONTEND}' or '${ProjectType.BACKEND}'.`);
        }

        if (projectType === ProjectType.FRONTEND && type && !isValidFrontendComponent(type)) {
          throw new Error(`Invalid frontend componene. Ust type. Use '${Object.values(FrontendComponentType).join("' or '")}'.`);
        }
        if (projectType === ProjectType.BACKEND && type && !isValidBackendComponent(type)) {
          throw new Error(`Invalid backend component type '${Object.values(BackendComponentType).join("' or '")}'.`);
        }
        componentType = type as ComponentType;

      }
      if (!fileName) {
        throw new Error('Filename is required to save the AI_generated component')
      }
      fileName = fileName.charAt(0).toUpperCase() + fileName.slice(1).toLowerCase();

      const params: ICreateComponentParams = {
        componentType,
        projectType,
        fileName,
      };

      await createFile(params);
      // Log the component creation
      await logComponentCreation({
        componentType,
        projectType,
        fileName,
      });
    } catch (error) {
      handleCliError(error as Error, "component creation");
    }
  });

  // Update command in your CLI file
program
  .command("update [type]")
  .allowUnknownOption()
  .description("Update an existing component (interactive mode)")
  .option(`-p, --project <type>", "Project type (${ProjectType.FRONTEND} or ${ProjectType.BACKEND}) or ${ProjectType.BLOCKCHAIN}`)
  .option("-a, --ai <boolean>", "Use AI to update the component", false)
  .option("-d, --description <text>", "New description of the component")
  .action(async (type: string | undefined, options: ICommandOptions & { ai?: boolean; description?: string }) => {
    try {
      let projectType: ProjectType;
      let componentType: ComponentType;
      
      // Interactive mode for project type if not specified
      if (!options.project) {
        const projectAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'projectType',
            message: 'Select project type:',
            choices: Object.values(ProjectType)
          }
        ]);
        projectType = projectAnswer.projectType;
      } else {
        projectType = options.project.toLowerCase() as ProjectType;
        if (!isValidProjectType(projectType)) {
          throw new Error(`Invalid project type. Use '${ProjectType.FRONTEND}' or '${ProjectType.BACKEND}'.`);
        }
      }

      // Interactive mode for component type if not specified
      if (!type) {
        componentType = await promptComponentType(projectType);
      } else {
        if (projectType === ProjectType.FRONTEND && !isValidFrontendComponent(type)) {
          throw new Error(`Invalid frontend component type. Use '${Object.values(FrontendComponentType).join("' or '")}'.`);
        }
        if (projectType === ProjectType.BACKEND && !isValidBackendComponent(type)) {
          throw new Error(`Invalid backend component type '${Object.values(BackendComponentType).join("' or '")}'.`);
        }
        componentType = type as ComponentType;
      }

      // Scan for existing components
      const existingComponents = await scanExistingComponents(projectType, componentType);
      
      if (existingComponents.length === 0) {
        throw new Error(`No existing ${componentType} components found to update.`);
      }

      // Let user select which component to update
      const { selectedComponent } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedComponent',
          message: `Select ${componentType} to update:`,
          choices: existingComponents.map(comp => ({
            name: comp.name,
            value: comp.name
          }))
        }
      ]);

      const params: ICreateComponentParams = {
        componentType,
        projectType,
        fileName: selectedComponent,
      };

      await updateFile(params);
      console.log(`✅ Successfully updated ${componentType} component: ${selectedComponent}`);
    } catch (error) {
      handleCliError(error as Error, "component update");
    }
  });

// Parse CLI arguments
program.parseAsync(process.argv).catch((error) => {
  handleCliError(error, "argument parsing");
});

