/**
 * Project type enumeration
 */
export enum ProjectType {
  FRONTEND = "frontend",
  // BACKEND = "backend",
  // SMART_CONTRACT = "smart-contract"
}

/**
 * Frontend component type enumeration
 */
export enum FrontendComponentType {
  COMPONENT = "component",
  PAGE = "page",
  API= "api"
}

/**
 * API type enumeration
 */
export enum ApiType {
  REDUX = "redux",
  WITHOUT_REDUX = "without-redux"
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


