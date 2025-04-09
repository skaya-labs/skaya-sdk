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
  fileName:string
  ai:boolean
  aiDesscription?:string
}

export interface ApiEndpointConfig {
  apiId: number;
  withAuth: boolean;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}