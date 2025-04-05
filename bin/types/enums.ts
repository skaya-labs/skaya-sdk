/**
 * Project type enumeration
 */
export enum ProjectType {
  FRONTEND = "frontend",
  BACKEND = "backend"
}

/**
 * Frontend component type enumeration
 */
export enum FrontendComponentType {
  COMPONENT = "component",
  PAGE = "page"
}

/**
 * Backend component type enumeration
 */
export enum BackendComponentType {
  ROUTE = "route",
  CONTROLLER = "controller",
}

/**
 * All possible component types
 */
export type ComponentType = FrontendComponentType | BackendComponentType;


