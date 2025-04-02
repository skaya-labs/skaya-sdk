#!/usr/bin/env ts-node

/**
 * @file CLI interface for project scaffolding tool
 * @module cli
 * @version 2.1.0
 * @license MIT
 */

import { Command } from "commander";
import { createProject, createFile } from "../src/action";
import { ProjectType, ComponentType, FrontendComponentType, BackendComponentType } from "./types/enums";
import { ICommandOptions } from "./types/interfaces";
import { isValidProjectType, isValidFrontendComponent, isValidBackendComponent } from "./utils/validator";
import { promptComponentType } from "./utils/prompt";
import { handleCliError } from "./utils/errorHandler";

const program = new Command();

program
  .name("scaffold-tool")
  .version("2.1.0")
  .description("A CLI tool for scaffolding projects and components");

// Project initialization command
program
  .command("init <type>")
  .description("Initialize a new project (frontend or backend)")
  .action(async (type: string) => {
    try {
      if (!isValidProjectType(type)) {
        throw new Error(`Invalid project type. Use '${ProjectType.FRONTEND}' or '${ProjectType.BACKEND}'.`);
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
  .description("Create a new component (interactive if type not specified)")
  .option(`-p, --project <type>", "Project type (${ProjectType.FRONTEND} or ${ProjectType.BACKEND})`, ProjectType.FRONTEND)
  .action(async (type: string | undefined, options: ICommandOptions) => {
    try {
      const projectType = options.project?.toLowerCase() as ProjectType;
      
      if (!isValidProjectType(projectType)) {
        throw new Error(`Invalid project type. Use '${ProjectType.FRONTEND}' or '${ProjectType.BACKEND}'.`);
      }

      let componentType: ComponentType;
      
      if (type) {
        if (projectType === ProjectType.FRONTEND && !isValidFrontendComponent(type)) {
          throw new Error(`Invalid frontend component type. Use '${Object.values(FrontendComponentType).join("' or '")}'.`);
        }
        if (projectType === ProjectType.BACKEND && !isValidBackendComponent(type)) {
          throw new Error(`Invalid backend component type. Use '${Object.values(BackendComponentType).join("' or '")}'.`);
        }
        componentType = type as ComponentType;
      } else {
        componentType = await promptComponentType(projectType);
      }
      await createFile({ componentType, projectType });
      console.log(`✅ Successfully created ${projectType} ${componentType}`);
    } catch (error) {
      handleCliError(error as Error, "component creation");
    }
  });

// Parse CLI arguments
program.parseAsync(process.argv).catch((error) => {
  handleCliError(error, "argument parsing");
});