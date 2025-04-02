import { ProjectType, FrontendComponentType, BackendComponentType } from "../types/enums";

/**
 * Validates project type
 */
export function isValidProjectType(type: string): type is ProjectType {
  return Object.values(ProjectType).includes(type as ProjectType);
}

/**
 * Validates frontend component type
 */
export function isValidFrontendComponent(type: string): type is FrontendComponentType {
  return Object.values(FrontendComponentType).includes(type as FrontendComponentType);
}

/**
 * Validates backend component type
 */
export function isValidBackendComponent(type: string): type is BackendComponentType {
  return Object.values(BackendComponentType).includes(type as BackendComponentType);
}