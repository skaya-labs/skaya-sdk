import { ProjectType, ComponentType } from "./enums";

/**
 * CLI command options interface
 */
export interface ICommandOptions {
  project?: ProjectType;
}

/**
 * Component creation parameters
 */
export interface ICreateComponentParams {
  componentType: ComponentType;
  projectType: ProjectType;
}