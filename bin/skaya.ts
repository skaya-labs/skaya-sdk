#!/usr/bin/env ts-node

/**
 * @file CLI interface for full-stack web3 project scaffolding tool
 * @module cli
 * @license MIT
 */

import { Command } from "commander";
import { createProject, createFile } from "../src/action";
import { ProjectType, ComponentType, FrontendComponentType, BackendComponentType } from "./types/enums";
import { ICommandOptions, ICreateComponentParams } from "./types/interfaces";
import { isValidProjectType, isValidFrontendComponent, isValidBackendComponent } from "./utils/validator";
import { promptComponentType } from "./utils/prompt";
import { handleCliError } from "./utils/errorHandler";
import inquirer from "inquirer";
import { readFileSync } from "fs";
import { join } from "path";
import { logComponentCreation } from "./utils/configLogger";

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
              { name: 'Smart Contract', value: ProjectType.SMART_CONTRACT }
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
  .option(`-p, --project <type>", "Project type (${ProjectType.FRONTEND} or ${ProjectType.BACKEND})`)
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
              return answers.projectType === ProjectType.FRONTEND
                ? Object.values(FrontendComponentType)
                : Object.values(BackendComponentType);
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
        
        // Validate required fields in non-interactive mode
        if (!fileName) {
          throw new Error('Filename is required in non-interactive mode. Use -f or --filename option.');
        }
      }
      if (!fileName) {
        throw new Error('Filename is required to save the AI_generated component')
      }
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
      console.log(`✅ Successfully created ${projectType} ${componentType} (${fileName})`);
    } catch (error) {
      handleCliError(error as Error, "component creation");
    }
  });

// Parse CLI arguments
program.parseAsync(process.argv).catch((error) => {
  handleCliError(error, "argument parsing");
});

