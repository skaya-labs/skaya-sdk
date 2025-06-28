/**
 * Project type enumeration
 */
export enum ProjectType {
  FRONTEND = "frontend",
  BACKEND = "backend",
  BLOCKCHAIN= "blockchain",
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
  MIDDLEWARE = "middleware",
  SCRIPT = "script"
}


/**
 * Smart Contract component type enumeration
 */
export enum BlokchainComponentType {
  CONTRACT = "contract",
  LIBRARY = "library",
  INTERFACE = "interface",
  SCRIPT = "script",
  SMART_CONTRACT = "smart-contract"

}

/**
 * All possible component types
 */
export type ComponentType = FrontendComponentType | BackendComponentType | BlokchainComponentType;


