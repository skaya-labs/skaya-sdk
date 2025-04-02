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
    MIDDLEWARE = "middleware",
    ROUTE = "route",
    CONTROLLER = "controller",
    MODEL = "model"
  }
  
  /**
   * All possible component types
   */
  export type ComponentType = FrontendComponentType | BackendComponentType;

    /**
   * All frontend repo types
   */
    export enum FrontendTemplateType {
      SKAYA_REACT_TS = "skaya-react-ts",
      SKAYA_VITE_TS = "skaya-vite-ts",
      SKAYA_NEXTJS = "skaya-nextjs",
      SKAYA_ECOMMERCE = "skaya-ecommerce",
      CUSTOM = "custom"
    }